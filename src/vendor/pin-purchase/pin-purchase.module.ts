import { Module } from '@nestjs/common';
import { PinPurchaseController } from './pin-purchase.controller';
import { PinPurchaseService } from './pin-purchase.service';

@Module({
  controllers: [PinPurchaseController],
  providers: [PinPurchaseService],
})
export class PinPurchaseModule {}
