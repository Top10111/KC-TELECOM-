import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^0\d{10}$/, { message: 'phone must be a valid Nigerian phone number e.g. 08012345678' })
  phone: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password: string;
}
