-- CreateTable
CREATE TABLE IF NOT EXISTS "apify_usage_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "module" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "actual_cost" DECIMAL(10,4),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apify_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "apify_usage_logs_user_id_created_at_idx" ON "apify_usage_logs"("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "apify_usage_logs_run_id_idx" ON "apify_usage_logs"("run_id");
CREATE INDEX IF NOT EXISTS "apify_usage_logs_module_idx" ON "apify_usage_logs"("module");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'apify_usage_logs_user_id_fkey'
  ) THEN
    ALTER TABLE "apify_usage_logs" ADD CONSTRAINT "apify_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
