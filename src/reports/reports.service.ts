import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /** Full sales ledger — every completed PIN purchase, most recent first. */
  async salesLedger(limit = 100) {
    return this.prisma.pinPurchase.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        vendor: { select: { id: true, fullName: true, businessName: true, email: true } },
        batch: { select: { batchLabel: true } },
      },
    });
  }

  /** Revenue / cost / profit rollup, overall and broken down by network. */
  async profitSummary() {
    const sales = await this.prisma.pinPurchase.findMany({
      where: { status: 'COMPLETED' },
      select: { network: true, quantity: true, totalAmount: true, totalProfit: true },
    });

    const totals = sales.reduce(
      (acc, s) => {
        acc.totalPinsSold += s.quantity;
        acc.totalRevenue += Number(s.totalAmount);
        acc.totalProfit += Number(s.totalProfit);
        return acc;
      },
      { totalPinsSold: 0, totalRevenue: 0, totalProfit: 0 },
    );

    const byNetwork: Record<string, { pinsSold: number; revenue: number; profit: number }> = {};
    for (const s of sales) {
      const key = s.network;
      if (!byNetwork[key]) byNetwork[key] = { pinsSold: 0, revenue: 0, profit: 0 };
      byNetwork[key].pinsSold += s.quantity;
      byNetwork[key].revenue += Number(s.totalAmount);
      byNetwork[key].profit += Number(s.totalProfit);
    }

    return { ...totals, byNetwork };
  }

  /** A single vendor's purchase history summary. */
  async vendorSummary(vendorId: string) {
    const purchases = await this.prisma.pinPurchase.findMany({
      where: { vendorId, status: 'COMPLETED' },
      select: { quantity: true, totalAmount: true, network: true, createdAt: true },
    });

    const totals = purchases.reduce(
      (acc, p) => {
        acc.totalPinsBought += p.quantity;
        acc.totalSpent += Number(p.totalAmount);
        return acc;
      },
      { totalPinsBought: 0, totalSpent: 0 },
    );

    return { ...totals, purchaseCount: purchases.length };
  }
}
