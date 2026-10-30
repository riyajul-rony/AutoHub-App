-- CreateEnum
CREATE TYPE "ApifyKeyStatus" AS ENUM ('active', 'disabled', 'cooldown');

-- AlterTable
ALTER TABLE "lead_searches" ADD COLUMN "apify_key_id" UUID;

-- CreateTable
CREATE TABLE "apify_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" TEXT NOT NULL,
    "token_enc" TEXT NOT NULL,
    "masked_token" TEXT NOT NULL,
    "status" "ApifyKeyStatus" NOT NULL DEFAULT 'active',
    "max_concurrent_jobs" INTEGER NOT NULL DEFAULT 2,
    "cooldown_until" TIMESTAMPTZ,
    "last_used_at" TIMESTAMPTZ,
    "last_tested_at" TIMESTAMPTZ,
    "last_test_result" JSONB,
    "last_error" TEXT,
    "total_runs_today" INTEGER NOT NULL DEFAULT 0,
    "total_runs_all_time" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apify_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apify_keys_status_idx" ON "apify_keys"("status");

-- CreateIndex
CREATE INDEX "apify_keys_created_at_idx" ON "apify_keys"("created_at");

-- CreateIndex
CREATE INDEX "lead_searches_apify_key_id_idx" ON "lead_searches"("apify_key_id");

-- AddForeignKey
ALTER TABLE "lead_searches" ADD CONSTRAINT "lead_searches_apify_key_id_fkey" FOREIGN KEY ("apify_key_id") REFERENCES "apify_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
