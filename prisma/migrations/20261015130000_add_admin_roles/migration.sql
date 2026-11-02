-- Phase 3: Admin Foundation Migration (Part 1 - Enum Values)
-- Alter UserRole enum to add super_admin, support, finance
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'finance';

