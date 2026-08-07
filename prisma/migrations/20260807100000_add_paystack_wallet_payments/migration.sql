-- Add provider metadata needed for verified wallet payments.
ALTER TABLE "wallet_transactions"
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "providerReference" TEXT,
  ADD COLUMN "providerResponse" JSONB,
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "creditedAt" TIMESTAMP(3);

CREATE INDEX "wallet_transactions_provider_providerReference_idx"
  ON "wallet_transactions"("provider", "providerReference");