import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PinStockService } from './pin-stock.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UploadPinsDto } from './dto/upload-pins.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/pin-stock')
export class PinStockController {
  constructor(private pinStockService: PinStockService) {}

  @Post('batches')
  createBatch(@CurrentUser('id') adminId: string, @Body() dto: CreateBatchDto) {
    return this.pinStockService.createBatch(adminId, dto);
  }

  @Post('batches/:batchId/pins')
  uploadPins(@Param('batchId') batchId: string, @Body() dto: UploadPinsDto) {
    return this.pinStockService.uploadPins(batchId, dto);
  }

  @Get('batches')
  listBatches() {
    return this.pinStockService.listBatches();
  }

  @Get('batches/:batchId')
  getBatch(@Param('batchId') batchId: string) {
    return this.pinStockService.getBatch(batchId);
  }

  @Get('inventory')
  getInventory() {
    return this.pinStockService.getInventorySummary();
  }
}
