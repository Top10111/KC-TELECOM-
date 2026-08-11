import { IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Network } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateDataSubscriptionDto {
  @IsEnum(['MTN', 'GLO', 'AIRTEL', 'NINE_MOBILE'])
  network: Network;

  @IsString()
  phone: string;

  @IsString()
  plan: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;
}
