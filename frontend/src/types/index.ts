// Mirrors backend enums 1:1 — see prisma/schema.prisma. Do not add values
// here that don't exist on the backend; the API will reject them.

export type Role = 'ADMIN' | 'VENDOR';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type Network = 'MTN' | 'GLO' | 'AIRTEL' | 'NINE_MOBILE';
export type WalletTxType = 'FUNDING' | 'DEBIT' | 'REFUND';
export type WalletTxStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type PinStatus = 'AVAILABLE' | 'SOLD';
export type PurchaseStatus = 'COMPLETED' | 'FAILED';

export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: string; // Prisma Decimal is serialized as a string over JSON
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTxType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  reference: string;
  status: WalletTxStatus;
  description: string | null;
  createdAt: string;
}

export interface PinBatch {
  id: string;
  batchLabel: string;
  network: Network;
  denomination: string;
  costPrice: string;
  sellingPrice: string;
  totalQuantity: number;
  availableQuantity: number;
  createdAt: string;
}

/** Shape returned by GET /vendor/pins/stock — no cost price exposed to vendors. */
export interface VendorStockItem {
  id: string;
  batchLabel: string;
  network: Network;
  denomination: string;
  sellingPrice: string;
  availableQuantity: number;
}

export interface PinPurchase {
  id: string;
  vendorId: string;
  batchId: string;
  network: Network;
  denomination: string;
  quantity: number;
  unitPrice: string;
  unitCost: string;
  totalAmount: string;
  totalProfit: string;
  reference: string;
  status: PurchaseStatus;
  createdAt: string;
}

export interface PurchasedPin {
  serialNumber: string;
  pinCode: string;
  denomination: string;
  soldAt?: string;
}

export interface PurchaseResult {
  purchase: PinPurchase;
  pins: PurchasedPin[];
}

export interface InventorySummary {
  totalBatches: number;
  availableCount: number;
  soldCount: number;
  potentialProfitRemaining: number;
  batches: Array<{
    network: Network;
    denomination: string;
    totalQuantity: number;
    availableQuantity: number;
    costPrice: string;
    sellingPrice: string;
  }>;
}

export interface SalesLedgerEntry extends PinPurchase {
  vendor: { id: string; fullName: string; businessName: string | null; email: string };
  batch: { batchLabel: string };
}

export interface ProfitSummary {
  totalPinsSold: number;
  totalRevenue: number;
  totalProfit: number;
  byNetwork: Record<Network, { pinsSold: number; revenue: number; profit: number }>;
}

export interface VendorSummary {
  totalPinsBought: number;
  totalSpent: number;
  purchaseCount: number;
}

export type AirtimePurchaseStatus = 'COMPLETED' | 'FAILED';

export interface AirtimePurchase {
  id: string;
  vendorId: string;
  network: Network;
  phone: string;
  amount: string; // Prisma Decimal serialized as string
  reference: string;
  status: AirtimePurchaseStatus;
  createdAt: string;
}

// Matches src/common/filters/all-exceptions.filter.ts exactly.
export interface ApiErrorBody {
  success: false;
  statusCode: number;
  path: string;
  timestamp: string;
  message: string | string[];
}
