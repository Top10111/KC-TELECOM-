# KC TELECOM — Smoke Test

All routes are under the global prefix `/api/v1`. Run in order.

## Happy path

1. **Admin logs in**
   `POST /auth/login` `{ "email": "<ADMIN_EMAIL>", "password": "<ADMIN_PASSWORD>" }`
   → save JWT as `ADMIN_TOKEN`.

2. **Admin creates a PIN batch**
   `POST /admin/pin-stock/batches` (Bearer `ADMIN_TOKEN`)
   `{ "batchLabel": "SMOKE-TEST-1", "network": "MTN", "denomination": 100, "costPrice": 95, "sellingPrice": 98 }`
   → save `id` as `BATCH_ID`. `network` ∈ `MTN | GLO | AIRTEL | NINE_MOBILE`.

3. **Admin uploads test PINs**
   `POST /admin/pin-stock/batches/{BATCH_ID}/pins` (Bearer `ADMIN_TOKEN`)
   `{ "pins": [{ "serialNumber": "SMOKE-SN-001", "pinCode": "1111222233334444" }, { "serialNumber": "SMOKE-SN-002", "pinCode": "5555666677778888" }] }`

4. **Vendor registers**
   `POST /auth/register`
   `{ "email": "smokevendor@test.com", "phone": "08011122233", "fullName": "Smoke Vendor", "password": "SmokeTest123!" }`
   Then `POST /auth/login` with the same credentials → save JWT as `VENDOR_TOKEN`.

5. **Vendor requests wallet funding**
   `POST /wallet/fund` (Bearer `VENDOR_TOKEN`)
   `{ "amount": 500, "description": "Smoke test funding" }`
   → save `reference` (`FUND-<uuid>`) as `FUND_REF`. Wallet is not credited yet (status `PENDING`).

6. **Admin approves the funding**
   `POST /wallet/fund/{FUND_REF}/confirm` (Bearer `ADMIN_TOKEN`)
   → `GET /wallet` (Bearer `VENDOR_TOKEN`) should now show balance `500`.

7. **Vendor buys a PIN**
   `POST /vendor/pins/purchase` (Bearer `VENDOR_TOKEN`)
   `{ "batchId": "<BATCH_ID>", "quantity": 1 }`
   → save `purchase.id` as `PURCHASE_ID`. Wallet balance should drop by `98`.
   → **Expected:** available quantity on the batch reduces from 2 to 1.

8. **Vendor views the delivered PIN**
   `GET /vendor/pins/purchases/{PURCHASE_ID}/pins` (Bearer `VENDOR_TOKEN`)
   → returns one of the two uploaded PINs (serial + code).

9. **Admin confirms the sale appears in reports**
   `GET /reports/admin/sales` (Bearer `ADMIN_TOKEN`) → purchase should appear.
   `GET /reports/admin/profit-summary` (Bearer `ADMIN_TOKEN`) → reflects `sellingPrice - costPrice` margin.
   `GET /reports/vendor/summary` (Bearer `VENDOR_TOKEN`) → shows the one purchase.

Clean up `SMOKE-TEST-1` and `smokevendor@test.com` afterward, or clearly label them as test data.

## Security checks

As vendor (`VENDOR_TOKEN`), expect `403 Forbidden`:
- `GET /admin/pin-stock/batches`
- `GET /reports/admin/sales`

## Validation checks

As vendor, purchasing against the batch above (1 PIN left after step 7):
- `quantity = 0` → validation error (`@IsPositive()`), no DB write.
- `quantity = 100` → business error `"Only 1 pin(s) left in this batch"`, no wallet or PIN change.
- Purchase amount exceeding wallet balance → `"Insufficient wallet balance"`, no wallet or PIN change.

## Double-sale check

- Buy the final remaining PIN (`quantity: 1` when `availableQuantity` = 1).
- Immediately retry the same purchase.
- **Expected:** `"Only 0 pin(s) left in this batch"` (functionally out-of-stock), no duplicate PIN allocation.

## Transaction check

`GET /wallet/transactions` (Bearer `VENDOR_TOKEN`) should show both:
- A `FUNDING` row (status `SUCCESS` after admin confirmation).
- A `DEBIT` row for the purchase.
