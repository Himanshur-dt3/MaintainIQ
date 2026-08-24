-- CreateEnum
CREATE TYPE "MaintenancePlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceFrequency" AS ENUM ('ONCE', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'INSPECTION', 'SERVICING');

-- CreateTable
CREATE TABLE "MaintenancePlan" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "technicianId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MaintenanceType" NOT NULL DEFAULT 'PREVENTIVE',
    "frequency" "MaintenanceFrequency" NOT NULL DEFAULT 'ONCE',
    "status" "MaintenancePlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "lastCompletedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenancePlan_assetId_idx" ON "MaintenancePlan"("assetId");

-- CreateIndex
CREATE INDEX "MaintenancePlan_technicianId_idx" ON "MaintenancePlan"("technicianId");

-- CreateIndex
CREATE INDEX "MaintenancePlan_status_idx" ON "MaintenancePlan"("status");

-- CreateIndex
CREATE INDEX "MaintenancePlan_nextDueAt_idx" ON "MaintenancePlan"("nextDueAt");

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
