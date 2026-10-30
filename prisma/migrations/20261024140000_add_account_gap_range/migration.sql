-- AlterTable email_accounts to add min_gap_seconds and max_gap_seconds
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "min_gap_seconds" INTEGER NOT NULL DEFAULT 180;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "max_gap_seconds" INTEGER NOT NULL DEFAULT 420;
