import { IsEnum, IsNumber, IsString, Matches, Min } from 'class-validator';
import type { Network } from '../../../prisma/schema';

export class BuyDataDto {
  @IsEnum(['MTN', 'AIRTEL', 'GLO', 'NINE_MOBILE'])
  network!: 'MTN' | 'AIRTEL' | 'GLO' | 'NINE_MOBILE';

  @IsString()
  @Matches(/^(0[7-9][0-1]\d{8}|[7-9][0-1]\d{8})$/)
  phone!: string;

  @IsString()
  plan!: string;

  @IsNumber()
  @Min(50)
  amount!: number;
}
