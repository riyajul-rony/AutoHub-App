-- CreateTable
CREATE TABLE IF NOT EXISTS "usage_counters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "resource" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "usage_counters_user_id_resource_period_key" ON "usage_counters"("user_id", "resource", "period");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "usage_counters_user_id_period_idx" ON "usage_counters"("user_id", "period");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "usage_counters_resource_period_idx" ON "usage_counters"("resource", "period");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usage_counters_user_id_fkey'
    ) THEN
        ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
