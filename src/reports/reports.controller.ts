import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Roles('ADMIN')
  @Get('admin/sales')
  salesLedger() {
    return this.reportsService.salesLedger();
  }

  @Roles('ADMIN')
  @Get('admin/profit-summary')
  profitSummary() {
    return this.reportsService.profitSummary();
  }

  @Roles('VENDOR')
  @Get('vendor/summary')
  vendorSummary(@CurrentUser('id') vendorId: string) {
    return this.reportsService.vendorSummary(vendorId);
  }
}
