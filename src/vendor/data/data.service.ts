import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDataSubscriptionDto } from './dto/create-data-subscription.dto';
import { VtuProvider } from '../airtime/providers/vtu.provider';

@Injectable()
export class DataService {
  constructor(
    private prisma: PrismaService,
    @Inject('VTU_PROVIDER') private vtu: VtuProvider,
  ) {}

  /**
   * Vendor purchases a data subscription.
   * Flow:
   * 1. Create a PENDING DataSubscription, debit wallet and create a PENDING DEBIT ledger entry (atomic).
   * 2. Call external VTU provider.
   * 3a. On success: mark subscription COMPLETED, mark debit SUCCESS, store provider info.
   * 3b. On failure: mark subscription FAILED, mark initial debit FAILED, create a SUCCESS CREDIT to refund.
   */
  async purchase(vendorId: string, dto: CreateDataSubscriptionDto) {
    // Step 0: basic checks and wallet lookup
    const wallet = await this.prisma.wallet.findUnique({ where: { userId: vendorId } });
    if (!wallet) throw new NotFoundException('Vendor wallet not found');

    if (Number(wallet.balance) < dto.amount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ₦${Number(wallet.balance).toFixed(2)}`,
      );
    }

    const reference = `DATA-${randomUUID()}`;
    const balanceBefore = wallet.balance;
    const newBalance = Number(wallet.balance) - dto.amount;

    // Step 1: create subscription (PENDING), debit wallet and create a PENDING ledger entry
    const txResult = await this.prisma.$transaction(
      async (tx) => {
        const dataSubscription = await tx.dataSubscription.create({
          data: {
            vendorId,
            network: dto.network,
            phone: dto.phone,
            plan: dto.plan,
            amount: dto.amount,
            reference,
            status: 'PENDING',
          },
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: newBalance },
        });

        const txEntry = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEBIT',
            amount: dto.amount,
            balanceBefore,
            balanceAfter: newBalance,
            reference,
            status: 'PENDING',
            description: `Data subscription: ${dto.network} ${dto.plan} to ${dto.phone}`,
          },
        });

        return { dataSubscription, txEntry };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Step 2: call external provider
    let providerResult: { success: boolean; providerReference?: string; rawResponse?: any; message?: string };
    try {
      providerResult = await this.vtu.purchaseData?.(
        {
          network: dto.network,
          phone: dto.phone,
          amount: dto.amount,
          reference,
          plan: dto.plan,
        },
      ) ?? { success: false, message: 'Provider does not support data purchases' };
    } catch (err) {
      providerResult = { success: false, message: err instanceof Error ? err.message : String(err) };
    }

    // Step 3: reconcile based on provider response
    if (providerResult.success) {
      // Provider succeeded: mark subscription COMPLETED and tx SUCCESS
      const updated = await this.prisma.$transaction(
        async (tx) => {
          const subscription = await tx.dataSubscription.update({
            where: { id: txResult.dataSubscription.id },
            data: {
              status: 'COMPLETED',
              provider: this.vtu.name ?? null,
              providerReference: providerResult.providerReference ?? null,
              providerResponse: providerResult.rawResponse ?? null,
              paidAt: new Date(),
            },
          });

          await tx.walletTransaction.update({
            where: { id: txResult.txEntry.id },
            data: {
              status: 'SUCCESS',
              provider: this.vtu.name ?? null,
              providerReference: providerResult.providerReference ?? null,
              providerResponse: providerResult.rawResponse ?? null,
            },
          });

          return subscription;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return updated;
    }

    // Provider failed: mark subscription FAILED, initial debit FAILED, and refund via CREDIT
    const refunded = await this.prisma.$transaction(
      async (tx) => {
        const failedSubscription = await tx.dataSubscription.update({
          where: { id: txResult.dataSubscription.id },
          data: {
            status: 'FAILED',
            provider: this.vtu.name ?? null,
            providerResponse: providerResult.rawResponse ?? { message: providerResult.message },
          },
        });

        await tx.walletTransaction.update({
          where: { id: txResult.txEntry.id },
          data: {
            status: 'FAILED',
            provider: this.vtu.name ?? null,
            providerResponse: providerResult.rawResponse ?? { message: providerResult.message },
          },
        });

        // Refund: credit back to wallet
        const currentWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
        const refundBalance = Number(currentWallet.balance) + dto.amount;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: refundBalance },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'REFUND',
            amount: dto.amount,
            balanceBefore: currentWallet.balance,
            balanceAfter: refundBalance,
            reference: `REFUND-${reference}`,
            status: 'SUCCESS',
            description: `Refund for failed data subscription: ${reference}`,
          },
        });

        return failedSubscription;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return refunded;
  }

  /**
   * Get all data subscriptions for a vendor.
   */
  async getSubscriptions(vendorId: string) {
    const vendor = await this.prisma.user.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    return this.prisma.dataSubscription.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific subscription by ID (owner-only).
   */
  async getSubscriptionById(vendorId: string, subscriptionId: string) {
    const subscription = await this.prisma.dataSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) throw new NotFoundException('Data subscription not found');
    if (subscription.vendorId !== vendorId) {
      throw new BadRequestException('You do not have access to this subscription');
    }

    return subscription;
  }
}
