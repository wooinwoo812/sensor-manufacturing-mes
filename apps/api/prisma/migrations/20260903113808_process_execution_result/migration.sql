-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PROCESS_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'PROCESS_COMPLETED';

-- AlterTable
ALTER TABLE "ProcessStepExecution" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "defectQuantity" INTEGER,
ADD COLUMN     "executionMemo" VARCHAR(300),
ADD COLUMN     "goodQuantity" INTEGER,
ADD COLUMN     "startedAt" TIMESTAMP(3);
