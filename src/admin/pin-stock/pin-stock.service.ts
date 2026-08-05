import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UploadPinsDto } from './dto/upload-pins.dto';

@Injectable()
export class PinStockService {
  constructor(private prisma: PrismaService) {}

  async createBatch(adminId: string, dto: CreateBatchDto) {
    if (dto.sellingPrice <= dto.costPrice) {
      throw new BadRequestException('sellingPrice must be greater than costPrice to yield a profit');
    }

    const existing = await this.prisma.pinBatch.findUnique({ where: { batchLabel: dto.batchLabel } });
    if (existing) throw new ConflictException('A batch with this label already exists');

    return this.prisma.pinBatch.create({
      data: {
        batchLabel: dto.batchLabel,
        network: dto.network,
        denomination: dto.denomination,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        totalQuantity: 0,
        availableQuantity: 0,
        createdById: adminId,
      },
    });
  }

  /**
   * Bulk-loads individual recharge PINs into an existing batch ("book").
   * totalQuantity/availableQuantity are derived from the actual pins
   * inserted so stock counts can never drift from real inventory.
   */
  async uploadPins(batchId: string, dto: UploadPinsDto) {
    const batch = await this.prisma.pinBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Pin batch not found');

    const serials = dto.pins.map((p) => p.serialNumber);
    const duplicateSerials = await this.prisma.rechargePin.findMany({
      where: { serialNumber: { in: serials } },
      select: { serialNumber: true },
    });
    if (duplicateSerials.length > 0) {
      throw new ConflictException(
        `Duplicate serial number(s) already in stock: ${duplicateSerials.map((d) => d.serialNumber).join(', ')}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.rechargePin.createMany({
        data: dto.pins.map((p) => ({
          batchId,
          serialNumber: p.serialNumber,
          pinCode: p.pinCode,
          status: 'AVAILABLE',
        })),
      });

      return tx.pinBatch.update({
        where: { id: batchId },
        data: {
          totalQuantity: { increment: dto.pins.length },
          availableQuantity: { increment: dto.pins.length },
        },
      });
    });
  }

  async listBatches() {
    return this.prisma.pinBatch.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        batchLabel: true,
        network: true,
        denomination: true,
        costPrice: true,
        sellingPrice: true,
        totalQuantity: true,
        availableQuantity: true,
        createdAt: true,
      },
    });
  }

  async getBatch(batchId: string) {
    const batch = await this.prisma.pinBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Pin batch not found');
    return batch;
  }

  /** Overall inventory snapshot across all networks/batches. */
  async getInventorySummary() {
    const batches = await this.prisma.pinBatch.findMany({
      select: {
        network: true,
        denomination: true,
        totalQuantity: true,
        availableQuantity: true,
        costPrice: true,
        sellingPrice: true,
      },
    });

    const soldCount = batches.reduce((sum, b) => sum + (b.totalQuantity - b.availableQuantity), 0);
    const availableCount = batches.reduce((sum, b) => sum + b.availableQuantity, 0);
    const potentialProfitRemaining = batches.reduce(
      (sum, b) => sum + b.availableQuantity * (Number(b.sellingPrice) - Number(b.costPrice)),
      0,
    );

    return { totalBatches: batches.length, availableCount, soldCount, potentialProfitRemaining, batches };
  }
}
