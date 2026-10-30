-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';
