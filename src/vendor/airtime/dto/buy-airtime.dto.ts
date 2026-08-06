import { IsEnum, IsNumber, IsPositive, Matches, Max, Min } from 'class-validator';
import { Network } from '@prisma/client';

export class BuyAirtimeDto {
  @IsEnum(Network)
  network: Network;

  /** Nigerian mobile number: 11 digits starting with 0, or 10 digits (no leading 0). */
  @Matches(/^(0[7-9][0-1]\d{8}|[7-9][0-1]\d{8})$/, {
    message: 'phone must be a valid Nigerian mobile number (e.g. 08012345678)',
  })
  phone: string;

  /** Amount in Naira — minimum ₦50, maximum ₦50,000 per transaction. */
  @IsNumber()
  @IsPositive()
  @Min(50)
  @Max(50000)
  amount: number;
}
