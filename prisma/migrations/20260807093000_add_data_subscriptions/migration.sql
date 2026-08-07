-- CreateTable
CREATE TABLE "data_subscriptions" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "phone" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerReference" TEXT,
    "providerResponse" JSON,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_subscriptions_reference_key" ON "data_subscriptions"("reference");
CREATE UNIQUE INDEX "data_subscriptions_provider_reference_key" ON "data_subscriptions"("providerReference");

-- AddForeignKey
ALTER TABLE "data_subscriptions" ADD CONSTRAINT "data_subscriptions_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
