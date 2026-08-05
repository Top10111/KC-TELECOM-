import { ArrayMinSize, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PinEntryDto {
  @IsString()
  serialNumber: string;

  @IsString()
  pinCode: string;
}

export class UploadPinsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PinEntryDto)
  pins: PinEntryDto[];
}
