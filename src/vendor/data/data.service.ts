import { BadRequestException, Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BuyDataDto } from './dto/buy-data.dto';
import { VtuProvider } from '../airtime/providers/vtu.provider';

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);
  constructor(private prisma: PrismaService, @Inject('VTU_PROVIDER') private vtu: VtuProvider) {}

  async purchase(vendorId: string, dto: BuyDataDto) {
    // basic validations and wallet lookup
    const wallet = await this.prisma.wallet.findUnique({ where: { userId: vendorId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    if (Number(wallet.balance) < dto.amount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ₦${Number(wallet.balance).toFixed(2)}`,
      );
    }

    const reference = `DATA-${randomUUID()}`;
    const balanceBefore = wallet.balance;
    const newBalance = Number(wallet.balance) - dto.amount;

    // Step 1: create pending subscription and pending ledger entry within a transaction
    const txResult = await this.prisma.$transaction(
      async (tx) => {
        const sub = await tx.dataSubscription.create({
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

        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });

        const txEntry = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEBIT',
            amount: dto.amount,
            balanceBefore,
            balanceAfter: newBalance,
            reference,
            status: 'PENDING',
            description: `Data subscription — ${dto.network} ${dto.plan} ₦${dto.amount} → ${dto.phone}`,
          },
        });

        return { sub, txEntry };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Step 2: call provider outside db tx
    let providerResult: { success: boolean; providerReference?: string; rawResponse?: any; message?: string };
    try {
      providerResult = await this.vtu.purchaseData({
        network: dto.network,
        phone: dto.phone,
        plan: dto.plan,
        amount: dto.amount,
        reference,
      });
    } catch (err) {
      providerResult = { success: false, message: err instanceof Error ? err.message : String(err) };
    }

    // Step 3: reconcile
    if (providerResult.success) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedSub = await tx.dataSubscription.update({
          where: { id: txResult.sub.id },
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
            paidAt: new Date(),
          },
        });

        return updatedSub;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return updated;
    }

    // Provider failed — refund
    this.logger.warn(`Provider failure for data purchase ${reference}: ${providerResult.message}`);

    const refund = await this.prisma.$transaction(async (tx) => {
      const failed = await tx.dataSubscription.update({
        where: { id: txResult.sub.id },
        data: {
          status: 'FAILED',
          provider: this.vtu.name ?? null,
          providerResponse: providerResult.rawResponse ?? { message: providerResult.message ?? 'Provider error' },
        },
      });

      await tx.walletTransaction.update({
        where: { id: txResult.txEntry.id },
        data: {
          status: 'FAILED',
          provider: this.vtu.name ?? null,
          providerResponse: providerResult.rawResponse ?? { message: providerResult.message ?? 'Provider error' },
        },
      });

      const currentWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      const before = currentWallet?.balance ?? 0;
      const after = Number(before) + Number(dto.amount);

      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: after } });

      const refundTx = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount: dto.amount,
          balanceBefore: before,
          balanceAfter: after,
          reference: `${reference}-REFUND`,
          status: 'SUCCESS',
          description: `Refund for failed data subscription — ${dto.network} ${dto.plan} ₦${dto.amount} → ${dto.phone}`,
        },
      });

      return failed;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return refund;
  }

  async history(vendorId: string) {
    return this.prisma.dataSubscription.findMany({ where: { vendorId }, orderBy: { createdAt: 'desc' } });
  }

  /** Webhook handling for provider callbacks */
  async handleWebhook(payload: any, signature?: string) {
    // verify signature if configured
    const secret = process.env.VTU_WEBHOOK_SECRET;
    if (secret) {
      // compute simple HMAC-SHA256 over JSON string
      const crypto = await import('crypto');
      const computed = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
      const headerSig = (signature ?? '').split(',')[0];
      if (!headerSig || computed !== headerSig) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Expect payload to contain providerReference or reference and status
    const providerReference = payload.providerReference ?? payload.reference ?? payload.txnRef ?? null;
    const status = (payload.status ?? payload.result ?? '').toString().toUpperCase();

    if (!providerReference) {
      throw new BadRequestException('Missing provider reference');
    }

    // Idempotency: find subscription by providerReference
    const existing = await this.prisma.dataSubscription.findUnique({ where: { providerReference } });
    if (!existing) {
      // Try to find by reference and update providerReference if present
      const byRef = await this.prisma.dataSubscription.findUnique({ where: { reference: payload.reference ?? payload.ref ?? null } });
      if (!byRef) {
        // Nothing to do; return
        return { ok: true };
      }
      // attach providerReference
      await this.prisma.dataSubscription.update({ where: { id: byRef.id }, data: { providerReference } });
    }

    // Re-fetch
    const sub = await this.prisma.dataSubscription.findUnique({ where: { providerReference } });
    if (!sub) return { ok: true };

    // If already final, ignore
    if (sub.status === 'COMPLETED' || sub.status === 'FAILED') return { ok: true };

    // Map status
    if (status.includes('SUCCESS') || status === 'COMPLETED') {
      // mark completed and wallet tx success
      await this.prisma.$transaction(async (tx) => {
        await tx.dataSubscription.update({ where: { id: sub.id }, data: { status: 'COMPLETED', paidAt: new Date(), providerResponse: payload } });
        await tx.walletTransaction.updateMany({ where: { reference: sub.reference }, data: { status: 'SUCCESS', providerReference, providerResponse: payload, paidAt: new Date() } });
      });
    } else if (status.includes('FAILED') || status === 'FAILED') {
      // refund
      await this.prisma.$transaction(async (tx) => {
        await tx.dataSubscription.update({ where: { id: sub.id }, data: { status: 'FAILED', providerResponse: payload } });
        // mark initial as failed
        await tx.walletTransaction.updateMany({ where: { reference: sub.reference }, data: { status: 'FAILED', providerReference, providerResponse: payload } });

        // check if refund already exists
        const refundRef = `${sub.reference}-REFUND`;
        const existingRefund = await tx.walletTransaction.findUnique({ where: { reference: refundRef } });
        if (!existingRefund) {
          const wallet = await tx.wallet.findUnique({ where: { id: sub.vendor.wallet?.id ?? undefined } });
          // safe lookup: get wallet by userId
          const walletByUser = await tx.wallet.findFirst({ where: { userId: sub.vendorId } });
          const before = walletByUser?.balance ?? 0;
          const after = Number(before) + Number(sub.amount);
          await tx.wallet.update({ where: { id: walletByUser!.id }, data: { balance: after } });
          await tx.walletTransaction.create({
            data: {
              walletId: walletByUser!.id,
              type: 'CREDIT',
              amount: sub.amount,
              balanceBefore: before,
              balanceAfter: after,
              reference: refundRef,
              status: 'SUCCESS',
              description: `Refund for failed data subscription ${sub.reference}`,
              providerReference,
            },
          });
        }
      });
    }

    return { ok: true };
  }
}
