import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface PaystackResponse {
  status: boolean;
  message?: string;
  data?: {
    authorization_url?: string;
    access_code?: string;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    id?: number;
    paid_at?: string;
  };
}

@Injectable()
export class PaystackService {
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('PAYSTACK_BASE_URL') ?? 'https://api.paystack.co';
    this.secretKey = this.config.get<string>('PAYSTACK_SECRET_KEY') ?? '';
  }

  private assertConfigured() {
    if (!this.secretKey) {
      throw new ServiceUnavailableException('Paystack is not configured on the backend');
    }
  }

  private async request(path: string, method: 'GET' | 'POST', body?: Record<string, unknown>) {
    this.assertConfigured();

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(Number(this.config.get('PAYSTACK_TIMEOUT_MS') ?? 15000)),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach Paystack';
      throw new BadGatewayException(`Paystack request failed: ${message}`);
    }

    let payload: PaystackResponse | null = null;
    try {
      payload = (await response.json()) as PaystackResponse;
    } catch {
      throw new BadGatewayException('Paystack returned an invalid response');
    }

    if (!response.ok || !payload.status) {
      throw new BadGatewayException(payload.message ?? `Paystack request failed with status ${response.status}`);
    }

    return payload;
  }

  initialize(email: string, amountKobo: number, reference: string, callbackUrl: string) {
    return this.request('/transaction/initialize', 'POST', {
      email,
      amount: amountKobo,
      currency: 'NGN',
      reference,
      callback_url: callbackUrl,
    });
  }

  verify(reference: string) {
    return this.request(`/transaction/verify/${encodeURIComponent(reference)}`, 'GET');
  }
}