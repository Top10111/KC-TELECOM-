import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class FundWalletDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
