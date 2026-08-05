import { IsEnum, IsNumber, IsPositive, IsString } from 'class-validator';
import { Network } from '@prisma/client';

export class CreateBatchDto {
  @IsString()
  batchLabel: string;

  @IsEnum(Network)
  network: Network;

  @IsNumber()
  @IsPositive()
  denomination: number;

  @IsNumber()
  @IsPositive()
  costPrice: number;

  @IsNumber()
  @IsPositive()
  sellingPrice: number;
}
