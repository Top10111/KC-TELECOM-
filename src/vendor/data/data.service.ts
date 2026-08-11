import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDataSubscriptionDto } from './dto/create-data-subscription.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class DataService {
  constructor(private prisma: PrismaService) {}

  /**
   * Vendor initiates a data subscription purchase.
   * Creates a PENDING DataSubscription and deducts from wallet atomically.
   */
  async purchase(vendorId: string, dto: CreateDataSubscriptionDto) {
    const vendor = await this.prisma.user.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId: vendorId } });
    if (!wallet) throw new NotFoundException('Vendor wallet not found');

    if (wallet.balance < dto.amount) {
      throw new BadRequestException('Insufficient wallet balance for this data subscription');
    }

    const reference = `DATA-${randomUUID()}`;

    // Atomic transaction: create subscription and debit wallet
    return this.prisma.$transaction(async (tx) => {
      // Create the data subscription
      const subscription = await tx.dataSubscription.create({
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

      // Debit wallet and create transaction record
      const newBalance = Number(wallet.balance) - Number(dto.amount);
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: dto.amount,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          reference,
          status: 'SUCCESS',
          description: `Data subscription: ${dto.network} ${dto.plan} to ${dto.phone}`,
        },
      });

      return subscription;
    });
  }

  /**
   * Get all subscriptions for a vendor.
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

  /**
   * Update subscription status (called by provider/admin after processing).
   */
  async updateSubscriptionStatus(
    subscriptionId: string,
    status: 'PENDING' | 'COMPLETED' | 'FAILED',
    providerRef?: string,
  ) {
    const subscription = await this.prisma.dataSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!subscription) throw new NotFoundException('Data subscription not found');

    // If transitioning from PENDING to FAILED, refund the wallet
    if (subscription.status === 'PENDING' && status === 'FAILED') {
      return this.prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: { userId: subscription.vendorId },
        });
        if (!wallet) throw new NotFoundException('Wallet not found');

        const newBalance = Number(wallet.balance) + Number(subscription.amount);
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: newBalance },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'REFUND',
            amount: subscription.amount,
            balanceBefore: wallet.balance,
            balanceAfter: newBalance,
            reference: `REFUND-${subscription.reference}`,
            status: 'SUCCESS',
            description: `Refund for failed data subscription: ${subscription.reference}`,
          },
        });

        return tx.dataSubscription.update({
          where: { id: subscriptionId },
          data: {
            status,
            providerReference: providerRef,
          },
        });
      });
    }

    // Normal status update without refund
    return this.prisma.dataSubscription.update({
      where: { id: subscriptionId },
      data: {
        status,
        providerReference: providerRef,
        paidAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }
}
