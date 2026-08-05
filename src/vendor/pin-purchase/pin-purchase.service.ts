import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseBatchDto } from './dto/purchase-batch.dto';

@Injectable()
export class PinPurchaseService {
  constructor(private prisma: PrismaService) {}

  /** Public catalog: what's available to buy, without exposing raw PIN codes. */
  async listAvailableStock() {
    return this.prisma.pinBatch.findMany({
      where: { availableQuantity: { gt: 0 } },
      select: {
        id: true,
        batchLabel: true,
        network: true,
        denomination: true,
        sellingPrice: true,
        availableQuantity: true,
      },
      orderBy: [{ network: 'asc' }, { denomination: 'asc' }],
    });
  }

  /**
   * Buys `quantity` PINs from a batch: validates wallet balance and stock,
   * allocates specific PIN rows, debits the wallet, and records the sale —
   * all atomically so a vendor can never be charged without receiving PINs
   * or receive PINs without being charged.
   */
  async purchase(vendorId: string, dto: PurchaseBatchDto) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const wallet = await tx.wallet.findUnique({ where: { userId: vendorId } });
          if (!wallet) throw new NotFoundException('Wallet not found');

          const batch = await tx.pinBatch.findUnique({ where: { id: dto.batchId } });
          if (!batch) throw new NotFoundException('Pin batch not found');

          if (batch.availableQuantity < dto.quantity) {
            throw new BadRequestException(
              `Only ${batch.availableQuantity} pin(s) left in this batch`,
            );
          }

          const unitPrice = Number(batch.sellingPrice);
          const unitCost = Number(batch.costPrice);
          const totalAmount = unitPrice * dto.quantity;
          const totalCost = unitCost * dto.quantity;
          const totalProfit = totalAmount - totalCost;

          if (Number(wallet.balance) < totalAmount) {
            throw new BadRequestException('Insufficient wallet balance');
          }

          const pinsToAllocate = await tx.rechargePin.findMany({
            where: { batchId: batch.id, status: 'AVAILABLE' },
            take: dto.quantity,
            orderBy: { createdAt: 'asc' },
          });

          if (pinsToAllocate.length < dto.quantity) {
            throw new ConflictException('Stock changed while processing your order, please retry');
          }

          const reference = `PUR-${randomUUID()}`;

          const purchase = await tx.pinPurchase.create({
            data: {
              vendorId,
              batchId: batch.id,
              network: batch.network,
              denomination: batch.denomination,
              quantity: dto.quantity,
              unitPrice,
              unitCost,
              totalAmount,
              totalProfit,
              reference,
              status: 'COMPLETED',
            },
          });

          await tx.rechargePin.updateMany({
            where: { id: { in: pinsToAllocate.map((p) => p.id) } },
            data: { status: 'SOLD', purchaseId: purchase.id, soldAt: new Date() },
          });

          await tx.pinBatch.update({
            where: { id: batch.id },
            data: { availableQuantity: { decrement: dto.quantity } },
          });

          const newBalance = Number(wallet.balance) - totalAmount;

          await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'DEBIT',
              amount: totalAmount,
              balanceBefore: wallet.balance,
              balanceAfter: newBalance,
              reference,
              status: 'SUCCESS',
              description: `Purchase of ${dto.quantity} x ${batch.network} ₦${batch.denomination} recharge PIN(s)`,
            },
          });

          const pins = await tx.rechargePin.findMany({
            where: { purchaseId: purchase.id },
            select: { serialNumber: true, pinCode: true, soldAt: true },
          });

          const denomination = String(batch.denomination);
          return { purchase, pins: pins.map((p) => ({ ...p, denomination })) };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err: any) {
      // Serializable isolation can raise a write-conflict under concurrent
      // purchases of the same batch; surface it as a retryable conflict.
      if (err?.code === 'P2034') {
        throw new ConflictException('This batch is being purchased by another vendor, please retry');
      }
      throw err;
    }
  }

  async myPurchases(vendorId: string) {
    return this.prisma.pinPurchase.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async myPurchasedPins(vendorId: string, purchaseId: string) {
    const purchase = await this.prisma.pinPurchase.findFirst({
      where: { id: purchaseId, vendorId },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');

    const pins = await this.prisma.rechargePin.findMany({
      where: { purchaseId },
      select: { serialNumber: true, pinCode: true, soldAt: true },
    });
    const denomination = String(purchase.denomination);
    return pins.map((p) => ({ ...p, denomination }));
  }
}
