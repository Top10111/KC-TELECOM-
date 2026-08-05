import { IsInt, IsPositive, IsString } from 'class-validator';

export class PurchaseBatchDto {
  @IsString()
  batchId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}
