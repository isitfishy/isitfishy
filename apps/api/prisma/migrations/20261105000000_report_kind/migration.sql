-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('SCAM', 'NOT_SCAM');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "kind" "ReportKind" NOT NULL DEFAULT 'SCAM';
