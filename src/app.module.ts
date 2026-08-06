import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { PinStockModule } from './admin/pin-stock/pin-stock.module';
import { PinPurchaseModule } from './vendor/pin-purchase/pin-purchase.module';
import { AirtimeModule } from './vendor/airtime/airtime.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    WalletModule,
    PinStockModule,
    PinPurchaseModule,
    AirtimeModule,
    ReportsModule,
  ],
})
export class AppModule {}
