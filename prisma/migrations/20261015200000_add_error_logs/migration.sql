-- Create error_logs table safely
CREATE TABLE IF NOT EXISTS "error_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" JSONB,
    "user_id" UUID,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "error_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "error_logs_created_at_idx" ON "error_logs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "error_logs_source_idx" ON "error_logs"("source");
CREATE INDEX IF NOT EXISTS "error_logs_user_id_idx" ON "error_logs"("user_id");
