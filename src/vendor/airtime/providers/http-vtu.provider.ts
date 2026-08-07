import { VtuPurchaseParams, VtuPurchaseResult, VtuProvider } from './vtu.provider';
import * as https from 'https';
import { URL } from 'url';

export interface HttpVtuProviderOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  name?: string;
}

export class HttpVtuProvider implements VtuProvider {
  name: string;
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(opts: HttpVtuProviderOptions) {
    this.baseUrl = opts.baseUrl;
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? 10000;
    this.name = opts.name ?? 'HTTP';
  }

  async purchaseAirtime(params: VtuPurchaseParams): Promise<VtuPurchaseResult> {
    return this._post('/purchase', params);
  }

+  async purchaseData(params: VtuPurchaseParams & { plan?: string }): Promise<VtuPurchaseResult> {
+    return this._post('/purchase/data', params);
+  }
+
   private async _post(path: string, params: any): Promise<VtuPurchaseResult> {
     if (!this.baseUrl) {
       return { success: false, message: 'VTU_BASE_URL not configured' };
     }

     try {
       const url = new URL(path, this.baseUrl).toString();
       const body = JSON.stringify(params);

       const parsedUrl = new URL(url);

       const requestOptions: https.RequestOptions = {
         method: 'POST',
         hostname: parsedUrl.hostname,
         port: parsedUrl.port ? Number(parsedUrl.port) : undefined,
         path: parsedUrl.pathname + parsedUrl.search,
         headers: {
           'Content-Type': 'application/json',
           'Content-Length': Buffer.byteLength(body),
           Authorization: this.apiKey ? `Bearer ${this.apiKey}` : undefined,
         },
         timeout: this.timeoutMs,
       };

       const raw = await new Promise<string>((resolve, reject) => {
         const req = https.request(requestOptions, (res) => {
           let data = '';
           res.on('data', (chunk) => (data += chunk));
           res.on('end', () => resolve(data));
         });
         req.on('error', (err) => reject(err));
         req.on('timeout', () => {
           req.destroy(new Error('VTU request timed out'));
         });
         req.write(body);
         req.end();
       });

       let parsed: any = null;
       try {
         parsed = JSON.parse(raw);
       } catch (e) {
         parsed = raw;
       }

       const success = (parsed && (parsed.success === true || parsed.status === 'SUCCESS')) ?? true;
       const providerRef = parsed?.reference ?? parsed?.data?.reference ?? undefined;

       return { success, providerReference: providerRef, rawResponse: parsed };
     } catch (err) {
       return { success: false, message: err instanceof Error ? err.message : String(err) };
     }
   }
 }
