-- AlterEnum
ALTER TYPE "SearchStatus" ADD VALUE IF NOT EXISTS 'enriching';
ALTER TYPE "SearchStatus" ADD VALUE IF NOT EXISTS 'partial';

-- AlterTable
ALTER TABLE "lead_searches" ADD COLUMN IF NOT EXISTS "progress_pct" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "lead_searches" ADD COLUMN IF NOT EXISTS "current_step" TEXT DEFAULT 'Queued';
