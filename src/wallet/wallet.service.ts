import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FundWalletDto } from './dto/fund-wallet.dto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

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
