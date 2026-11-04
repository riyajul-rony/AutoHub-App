-- AlterTable users to add avatar_url
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

