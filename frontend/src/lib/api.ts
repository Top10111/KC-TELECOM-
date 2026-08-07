@@
   fund: (amount: number, description?: string) =>
     request<WalletTransaction>('/wallet/fund', {
       method: 'POST',
       body: JSON.stringify({ amount, description }),
     }),
@@
 export const airtimeApi = {
   purchase: (payload: BuyAirtimePayload) =>
     request<import('../types').AirtimePurchase>('/vendor/airtime/purchase', {
       method: 'POST',
       body: JSON.stringify(payload),
     }),
   myPurchases: () =>
     request<import('../types').AirtimePurchase[]>('/vendor/airtime/purchases'),
 };
+
+// ---- vendor data subscription ------------------------------------
+export interface BuyDataPayload {
+  network: string;
+  phone: string;
+  plan: string;
+  amount: number;
+}
+
+export const dataApi = {
+  purchase: (payload: BuyDataPayload) =>
+    request<import('../types').DataSubscription>('/vendor/data/purchase', {
+      method: 'POST',
+      body: JSON.stringify(payload),
+    }),
+  history: () => request<import('../types').DataSubscription[]>('/vendor/data/history'),
+};
