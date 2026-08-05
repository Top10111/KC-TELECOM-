import { Module } from '@nestjs/common';
import { PinStockController } from './pin-stock.controller';
import { PinStockService } from './pin-stock.service';

@Module({
  controllers: [PinStockController],
  providers: [PinStockService],
  exports: [PinStockService],
})
export class PinStockModule {}
