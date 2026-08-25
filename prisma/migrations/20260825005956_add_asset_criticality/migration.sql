-- CreateEnum
CREATE TYPE "AssetCriticality" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "criticality" "AssetCriticality" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "firstResponseAt" TIMESTAMP(3),
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "slaDeadline" TIMESTAMP(3);
