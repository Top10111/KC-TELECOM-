export interface VtuPurchaseParams {
  network: string;
  phone: string;
  amount: number;
  reference: string;
}

export interface VtuPurchaseResult {
  success: boolean;
  providerReference?: string;
  rawResponse?: any;
  message?: string;
}

export interface VtuProvider {
  name?: string;
  purchaseAirtime(params: VtuPurchaseParams): Promise<VtuPurchaseResult>;
}
