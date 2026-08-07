import { Body, Controller, Get, Header, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataService } from './data.service';
import { BuyDataDto } from './dto/buy-data.dto';
import { Request } from 'express';

@Controller('vendor/data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDOR')
export class DataController {
  constructor(private dataService: DataService) {}

  @Post('purchase')
  purchase(@CurrentUser('id') vendorId: string, @Body() dto: BuyDataDto) {
    return this.dataService.purchase(vendorId, dto);
  }

  @Get('history')
  history(@CurrentUser('id') vendorId: string) {
    return this.dataService.history(vendorId);
  }

  // Public webhook — VTU provider posts here. We protect it using a shared secret signature.
  @Post('webhook')
  @Header('Content-Type', 'application/json')
  async webhook(@Body() body: any, @Req() req: Request) {
    const signature = String(req.headers['x-vtu-signature'] ?? req.headers['x-signature'] ?? '');
    return this.dataService.handleWebhook(body, signature);
  }
}
