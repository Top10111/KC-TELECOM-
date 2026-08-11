import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataService } from './data.service';
import { CreateDataSubscriptionDto } from './dto/create-data-subscription.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDOR')
@Controller('vendor/data')
export class DataController {
  constructor(private dataService: DataService) {}

  /**
   * POST /vendor/data/purchase
   * Vendor purchases a data subscription.
   */
  @Post('purchase')
  async purchase(@CurrentUser('id') vendorId: string, @Body() dto: CreateDataSubscriptionDto) {
    return this.dataService.purchase(vendorId, dto);
  }

  /**
   * GET /vendor/data/subscriptions
   * List all data subscriptions for the vendor.
   */
  @Get('subscriptions')
  async getSubscriptions(@CurrentUser('id') vendorId: string) {
    return this.dataService.getSubscriptions(vendorId);
  }

  /**
   * GET /vendor/data/subscriptions/:id
   * Get a specific subscription by ID.
   */
  @Get('subscriptions/:id')
  async getSubscription(@CurrentUser('id') vendorId: string, @Param('id') subscriptionId: string) {
    return this.dataService.getSubscriptionById(vendorId, subscriptionId);
  }
}
