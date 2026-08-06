-- CreateTable
CREATE TABLE "airtime_purchases" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "phone" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "airtime_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "airtime_purchases_reference_key" ON "airtime_purchases"("reference");

-- AddForeignKey
ALTER TABLE "airtime_purchases" ADD CONSTRAINT "airtime_purchases_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
