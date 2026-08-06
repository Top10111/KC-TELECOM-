import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BuyAirtimeDto } from './dto/buy-airtime.dto';

@Injectable()
export class AirtimeService {
  constructor(private prisma: PrismaService) {}

  /**
   * Purchases airtime for a phone number, debiting the vendor's wallet.
   * The entire operation — balance check, purchase record, wallet debit, and
   * ledger entry — runs in a single SERIALIZABLE transaction so no partial
   * state is ever persisted.
   */
  async purchase(vendorId: string, dto: BuyAirtimeDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId: vendorId } });
        if (!wallet) throw new NotFoundException('Wallet not found');

        if (Number(wallet.balance) < dto.amount) {
          throw new BadRequestException(
            `Insufficient wallet balance. Available: ₦${Number(wallet.balance).toFixed(2)}`,
          );
        }

        const reference = `AIR-${randomUUID()}`;
        const balanceBefore = wallet.balance;
        const newBalance = Number(wallet.balance) - dto.amount;

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

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: newBalance },
        });

        await tx.walletTransaction.create({
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

        return airtimePurchase;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /** Returns all airtime purchases for the requesting vendor, newest first. */
  myPurchases(vendorId: string) {
    return this.prisma.airtimePurchase.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
