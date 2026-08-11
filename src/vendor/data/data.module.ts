import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { VtuProvider } from '../airtime/providers/vtu.provider';
import { HttpVtuProvider } from '../airtime/providers/http-vtu.provider';

@Module({
  controllers: [DataController],
  providers: [
    DataService,
    // Provider factory: reuses the existing VTU provider from AirtimeModule
    {
      provide: 'VTU_PROVIDER',
      useFactory: () => {
        const name = process.env.VTU_PROVIDER_NAME ?? 'HTTP';
        return new HttpVtuProvider({
          baseUrl: process.env.VTU_BASE_URL ?? '',
          apiKey: process.env.VTU_API_KEY ?? '',
          timeoutMs: Number(process.env.VTU_TIMEOUT_MS ?? 10000),
          name,
        });
      },
    },
  ],
  exports: [DataService],
})
export class DataModule {}
