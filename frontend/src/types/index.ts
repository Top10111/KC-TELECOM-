@@
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
+
+export type DataSubscriptionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
+
+export interface DataSubscription {
+  id: string;
+  vendorId: string;
+  network: Network;
+  phone: string;
+  plan: string;
+  amount: string;
+  reference: string;
+  status: DataSubscriptionStatus;
+  provider?: string | null;
+  providerReference?: string | null;
+  providerResponse?: any | null;
+  paidAt?: string | null;
+  createdAt: string;
+  updatedAt?: string;
+}
