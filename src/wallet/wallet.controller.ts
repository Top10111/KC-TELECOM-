import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WalletService } from './wallet.service';
import { FundWalletDto } from './dto/fund-wallet.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Roles('VENDOR')
  @Get()
  getMyWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Roles('VENDOR')
  @Get('transactions')
  getMyTransactions(@CurrentUser('id') userId: string) {
    return this.walletService.getTransactions(userId);
  }

  @Roles('VENDOR')
  @Post('fund')
  initiateFunding(@CurrentUser('id') userId: string, @Body() dto: FundWalletDto) {
    return this.walletService.initiateFunding(userId, dto);
  }

  @Roles('VENDOR')
  @Post('paystack/initialize')
  initializePaystackFunding(
    @CurrentUser('id') userId: string,
    @Body() dto: FundWalletDto,
    @Req() request: Request,
  ) {
    const configuredCallback = process.env.PAYSTACK_CALLBACK_URL;
    const forwardedProtocol = String(request.headers['x-forwarded-proto'] ?? request.protocol).split(',')[0];
    const forwardedHost = String(request.headers['x-forwarded-host'] ?? request.get('host')).split(',')[0];
    const callbackUrl = configuredCallback ?? `${forwardedProtocol}://${forwardedHost}/vendor/wallet`;
    return this.walletService.initializePaystackFunding(userId, dto.amount, callbackUrl);
  }

  @Roles('VENDOR')
  @Get('paystack/verify/:reference')
  verifyPaystackFunding(@Param('reference') reference: string) {
    return this.walletService.verifyPaystackFunding(reference);
  }

  /**
   * Confirms a pending funding transaction and credits the vendor's wallet.
   * Restricted to admins today (manual/bank-transfer confirmation). Wire a
   * payment gateway webhook here later to automate this step.
   */
  @Roles('ADMIN')
  @Post('fund/:reference/confirm')
  confirmFunding(@Param('reference') reference: string) {
    return this.walletService.confirmFunding(reference);
  }
}
