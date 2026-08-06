import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AirtimeService } from './airtime.service';
import { BuyAirtimeDto } from './dto/buy-airtime.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDOR')
@Controller('vendor/airtime')
export class AirtimeController {
  constructor(private airtimeService: AirtimeService) {}

  @Post('purchase')
  purchase(@CurrentUser('id') vendorId: string, @Body() dto: BuyAirtimeDto) {
    return this.airtimeService.purchase(vendorId, dto);
  }

  @Get('purchases')
  myPurchases(@CurrentUser('id') vendorId: string) {
    return this.airtimeService.myPurchases(vendorId);
  }
}
