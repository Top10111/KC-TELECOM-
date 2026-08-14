import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BuyAirtimeDto } from './dto/buy-airtime.dto';
import { VtuProvider } from './providers/vtu.provider';

@Injectable()
export class AirtimeService {
  constructor(private prisma: PrismaService, @Inject('VTU_PROVIDER') private vtu: VtuProvider) {}

  /**
   * Purchases airtime for a phone number, debiting the vendor's wallet.
   * Flow:
   * 1. Create a PENDING AirtimePurchase, debit wallet and create a PENDING DEBIT ledger entry (single db tx).
   * 2. Call external VTU provider.
   * 3a. On success: mark purchase COMPLETED and ledger entry SUCCESS, attach provider info.
   * 3b. On failure: mark purchase FAILED, mark initial ledger FAILED and create a SUCCESS CREDIT ledger to refund the vendor.
   */
  async purchase(vendorId: string, dto: BuyAirtimeDto) {
    // Step 0: basic checks and wallet lookup
    const wallet = await this.prisma.wallet.findUnique({ where: { userId: vendorId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    if (Number(wallet.balance) < dto.amount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ₦${Number(wallet.balance).toFixed(2)}`,
      );
    }

    const reference = `AIR-${randomUUID()}`;
    const balanceBefore = wallet.balance;
    const newBalance = Number(wallet.balance) - dto.amount;

    // Step 1: create purchase (PENDING), debit wallet and create a PENDING ledger entry
    const txResult = await this.prisma.$transaction(
      async (tx) => {
        const airtimePurchase = await tx.airtimePurchase.create({
          data: {
            vendorId,
            network: dto.network,
            phone: dto.phone,
            amount: dto.amount,
            reference,
            status: 'COMPLETED',
          },
        });

        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });

        const txEntry = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEBIT',
            amount: dto.amount,
            balanceBefore,
            balanceAfter: newBalance,
            reference,
            status: 'SUCCESS',
            description: `Airtime purchase — ${dto.network} ₦${dto.amount} → ${dto.phone}`,
          },
        });

        return { airtimePurchase, txEntry };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Step 2: call external provider
    let providerResult: { success: boolean; providerReference?: string; rawResponse?: any; message?: string };
    try {
      providerResult = await this.vtu.purchaseAirtime({
        network: dto.network,
        phone: dto.phone,
        amount: dto.amount,
        reference,
      });
    } catch (err) {
      providerResult = { success: false, message: err instanceof Error ? err.message : String(err) };
    }

    // Step 3: reconcile based on provider response
    if (providerResult.success) {
      // mark purchase COMPLETED and tx SUCCESS
      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedPurchase = await tx.airtimePurchase.update({
          where: { id: txResult.airtimePurchase.id },
          data: { status: 'COMPLETED' },
        });

        await tx.walletTransaction.update({
          where: { id: txResult.txEntry.id },
          data: {
            status: 'SUCCESS',
            provider: this.vtu.name ?? null,
            providerReference: providerResult.providerReference ?? null,
            providerResponse: providerResult.rawResponse ?? null,
            paidAt: new Date(),
          },
        });

        return updatedPurchase;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return updated;
    }

    // Provider failed — refund the vendor
    const refundResult = await this.prisma.$transaction(async (tx) => {
      // mark purchase FAILED
      const failedPurchase = await tx.airtimePurchase.update({
        where: { id: txResult.airtimePurchase.id },
        data: { status: 'FAILED' },
      });

      // mark initial tx FAILED
      await tx.walletTransaction.update({
        where: { id: txResult.txEntry.id },
        data: {
          status: 'FAILED',
          provider: this.vtu.name ?? null,
          providerResponse: providerResult.rawResponse ?? { message: providerResult.message ?? 'Provider error' },
        },
      });

      // refund: credit wallet back
      const currentWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      const before = currentWallet?.balance ?? 0;
      const after = Number(before) + Number(dto.amount);

      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: after } });

      const refundTx = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'REFUND',
          amount: dto.amount,
          balanceBefore: before,
          balanceAfter: after,
          reference: `${reference}-REFUND`,
          status: 'SUCCESS',
          description: `Refund for failed airtime purchase — ${dto.network} ₦${dto.amount} → ${dto.phone}`,
        },
      });

      return failedPurchase;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return refundResult;
  }

  /** Returns all airtime purchases for the requesting vendor, newest first. */
  myPurchases(vendorId: string) {
    return this.prisma.airtimePurchase.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
