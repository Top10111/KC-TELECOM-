import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PinPurchaseService } from './pin-purchase.service';
import { PurchaseBatchDto } from './dto/purchase-batch.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendor/pins')
export class PinPurchaseController {
  constructor(private pinPurchaseService: PinPurchaseService) {}

  @Roles('VENDOR')
  @Get('stock')
  listAvailableStock() {
    return this.pinPurchaseService.listAvailableStock();
  }

  @Roles('VENDOR')
  @Post('purchase')
  purchase(@CurrentUser('id') vendorId: string, @Body() dto: PurchaseBatchDto) {
    return this.pinPurchaseService.purchase(vendorId, dto);
  }

  @Roles('VENDOR')
  @Get('purchases')
  myPurchases(@CurrentUser('id') vendorId: string) {
    return this.pinPurchaseService.myPurchases(vendorId);
  }

  @Roles('VENDOR')
  @Get('purchases/:purchaseId/pins')
  myPurchasedPins(@CurrentUser('id') vendorId: string, @Param('purchaseId') purchaseId: string) {
    return this.pinPurchaseService.myPurchasedPins(vendorId, purchaseId);
  }
}
