import { Module } from '@nestjs/common';
import { AirtimeController } from './airtime.controller';
import { AirtimeService } from './airtime.service';

@Module({
  controllers: [AirtimeController],
  providers: [AirtimeService],
})
export class AirtimeModule {}
