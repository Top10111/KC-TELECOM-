import { Module } from '@nestjs/common';
import { AirtimeController } from './airtime.controller';
import { AirtimeService } from './airtime.service';
import { VtuProvider } from './providers/vtu.provider';
import { HttpVtuProvider } from './providers/http-vtu.provider';

@Module({
  controllers: [AirtimeController],
  providers: [
    AirtimeService,
    // Provider factory: selects the VTU provider implementation based on env var.
    {
      provide: 'VTU_PROVIDER',
      useFactory: () => {
        const name = process.env.VTU_PROVIDER_NAME ?? 'HTTP';
        // For now we only ship a generic HTTP-based provider. More providers can be
        // added and selected here by matching V TU_PROVIDER_NAME.
        return new HttpVtuProvider({
          baseUrl: process.env.VTU_BASE_URL ?? '',
          apiKey: process.env.VTU_API_KEY ?? '',
          timeoutMs: Number(process.env.VTU_TIMEOUT_MS ?? 10000),
          name,
        });
      },
    },
  ],
  exports: [AirtimeService],
})
export class AirtimeModule {}
