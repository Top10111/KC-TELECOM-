import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { PaystackService } from './paystack.service';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
  ) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getTransactions(userId: string) {
    const wallet = await this.getWallet(userId);
    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Vendor-initiated funding request. Creates a PENDING transaction with a
   * unique reference. In production this reference is handed to a payment
   * gateway (Paystack/Flutterwave); the gateway's webhook then calls
   * confirmFunding() with the same reference. Admins can also confirm
   * manual bank-transfer funding through the same endpoint.
   */
  async initiateFunding(userId: string, dto: FundWalletDto) {
    const wallet = await this.getWallet(userId);
    const reference = `FUND-${randomUUID()}`;

    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'FUNDING',
        amount: dto.amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance, // unchanged until confirmed
        reference,
        status: 'PENDING',
        description: dto.description ?? 'Wallet funding request',
      },
    });

    return transaction;
  }

  async initializePaystackFunding(userId: string, amount: number, callbackUrl: string) {
    if (!Number.isFinite(amount) || amount < 100) {
      throw new BadRequestException('Minimum wallet funding amount is ₦100');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const wallet = await this.getWallet(userId);
    const reference = `PAYSTACK-${randomUUID()}`;
    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'FUNDING',
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance,
        reference,
        status: 'PENDING',
        description: 'Paystack wallet funding',
        provider: 'PAYSTACK',
      },
    });

    try {
      const response = await this.paystack.initialize(
        user.email,
        Math.round(amount * 100),
        reference,
        callbackUrl,
      );

      if (!response.data?.authorization_url) {
        throw new BadRequestException('Paystack could not initialize this payment');
      }

      return {
        reference: transaction.reference,
        authorizationUrl: response.data.authorization_url,
        accessCode: response.data.access_code,
        amount,
        currency: 'NGN',
      };
    } catch (error) {
      await this.prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          description: error instanceof Error ? error.message : 'Paystack initialization failed',
        },
      });
      throw error;
    }
  }

  async verifyPaystackFunding(reference: string) {
    const transaction = await this.prisma.walletTransaction.findUnique({ where: { reference } });
    if (!transaction) throw new NotFoundException('Funding transaction not found');
    if (transaction.provider !== 'PAYSTACK') {
      throw new BadRequestException('Not a Paystack funding transaction');
    }

    if (transaction.status === 'SUCCESS') {
      const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { id: transaction.walletId } });
      return { wallet, transaction, alreadyCredited: true };
    }

    const response = await this.paystack.verify(reference);
    const data = response.data;
    const expectedAmount = Math.round(Number(transaction.amount) * 100);
    const verified =
      response.status === true &&
      data?.status === 'success' &&
      data.reference === reference &&
      data.currency === 'NGN' &&
      Number(data.amount) === expectedAmount;

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.walletTransaction.findUniqueOrThrow({ where: { reference } });

      if (current.status === 'SUCCESS') {
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: current.walletId } });
        return { wallet, transaction: current, alreadyCredited: true };
      }

      if (!verified) {
        const failed = await tx.walletTransaction.update({
          where: { id: current.id },
          data: {
            status: 'FAILED',
            providerReference: data?.id ? String(data.id) : data?.reference,
            providerResponse: response as object,
            description: 'Paystack verification did not match the initialized payment',
          },
        });
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: current.walletId } });
        return { wallet, transaction: failed, alreadyCredited: false };
      }

      const claimed = await tx.walletTransaction.updateMany({
        where: { id: current.id, status: 'PENDING' },
        data: {
          status: 'SUCCESS',
          providerReference: data?.id ? String(data.id) : data?.reference,
          providerResponse: response as object,
          paidAt: data?.paid_at ? new Date(data.paid_at) : new Date(),
          creditedAt: new Date(),
          description: 'Paystack wallet funding verified',
        },
      });

      if (claimed.count === 0) {
        const alreadyProcessed = await tx.walletTransaction.findUniqueOrThrow({
          where: { id: current.id },
        });
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: current.walletId } });
        return { wallet, transaction: alreadyProcessed, alreadyCredited: true };
      }

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: current.walletId } });
      const newBalance = Number(wallet.balance) + Number(current.amount);
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });
      const updatedTransaction = await tx.walletTransaction.update({
        where: { id: current.id },
        data: {
          balanceAfter: newBalance,
        },
      });

      return { wallet: updatedWallet, transaction: updatedTransaction, alreadyCredited: false };
    });
  }

  /**
   * Confirms a pending funding transaction and atomically credits the wallet.
   * Called by an admin (manual/bank-transfer funding) or by a payment
   * gateway webhook handler once payment is verified.
   */
  async confirmFunding(reference: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.walletTransaction.findUnique({ where: { reference } });

      if (!transaction) throw new NotFoundException('Funding transaction not found');
      if (transaction.type !== 'FUNDING') throw new BadRequestException('Not a funding transaction');
      if (transaction.status !== 'PENDING') {
        throw new BadRequestException(`Transaction already ${transaction.status.toLowerCase()}`);
      }

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: transaction.walletId } });
      const newBalance = Number(wallet.balance) + Number(transaction.amount);

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      const updatedTransaction = await tx.walletTransaction.update({
        where: { id: transaction.id },
        data: { status: 'SUCCESS', balanceAfter: newBalance },
      });

      return { wallet: updatedWallet, transaction: updatedTransaction };
    });
  }
}
