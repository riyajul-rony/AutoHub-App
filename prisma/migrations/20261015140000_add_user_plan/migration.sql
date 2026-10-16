-- AlterTable: Add plan column to users table with default 'free'
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'free';
