-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VENDOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Network" AS ENUM ('MTN', 'GLO', 'AIRTEL', 'NINE_MOBILE');

-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('FUNDING', 'DEBIT', 'REFUND');

-- CreateEnum
CREATE TYPE "WalletTxStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PinStatus" AS ENUM ('AVAILABLE', 'SOLD');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "businessName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VENDOR',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTxType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balanceBefore" DECIMAL(14,2) NOT NULL,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "WalletTxStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pin_batches" (
    "id" TEXT NOT NULL,
    "batchLabel" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "denomination" DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "availableQuantity" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pin_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recharge_pins" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "status" "PinStatus" NOT NULL DEFAULT 'AVAILABLE',
    "purchaseId" TEXT,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recharge_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pin_purchases" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "network" "Network" NOT NULL,
    "denomination" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "totalProfit" DECIMAL(14,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pin_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_reference_key" ON "wallet_transactions"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "pin_batches_batchLabel_key" ON "pin_batches"("batchLabel");

-- CreateIndex
CREATE UNIQUE INDEX "recharge_pins_serialNumber_key" ON "recharge_pins"("serialNumber");

-- CreateIndex
CREATE INDEX "recharge_pins_batchId_status_idx" ON "recharge_pins"("batchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pin_purchases_reference_key" ON "pin_purchases"("reference");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin_batches" ADD CONSTRAINT "pin_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recharge_pins" ADD CONSTRAINT "recharge_pins_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "pin_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recharge_pins" ADD CONSTRAINT "recharge_pins_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "pin_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin_purchases" ADD CONSTRAINT "pin_purchases_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin_purchases" ADD CONSTRAINT "pin_purchases_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "pin_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
