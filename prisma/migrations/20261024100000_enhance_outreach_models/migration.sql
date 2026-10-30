-- AlterEnum: add 'csv' to RecipientSource
ALTER TYPE "RecipientSource" ADD VALUE IF NOT EXISTS 'csv';

-- CreateEnum: TrackingEventType
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TrackingEventType') THEN
        CREATE TYPE "TrackingEventType" AS ENUM ('open', 'click');
    END IF;
END $$;

-- AlterTable email_accounts
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "gap_seconds" INTEGER NOT NULL DEFAULT 120;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "warmup_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "warmup_day" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "warmup_start_limit" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "warmup_daily_increment" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "warmup_max_limit" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "dns_spf_status" TEXT;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "dns_dkim_status" TEXT;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "dns_dmarc_status" TEXT;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "dns_checked_at" TIMESTAMPTZ;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "oauth_access_token_enc" TEXT;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "oauth_refresh_token_enc" TEXT;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "oauth_expires_at" TIMESTAMPTZ;
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "oauth_scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable outreach_campaigns
ALTER TABLE "outreach_campaigns" ADD COLUMN IF NOT EXISTS "tracking_open" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "outreach_campaigns" ADD COLUMN IF NOT EXISTS "tracking_click" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "outreach_campaigns" ADD COLUMN IF NOT EXISTS "preset_mode" TEXT;
ALTER TABLE "outreach_campaigns" ADD COLUMN IF NOT EXISTS "allocation_mode" TEXT NOT NULL DEFAULT 'round_robin';
ALTER TABLE "outreach_campaigns" ADD COLUMN IF NOT EXISTS "days_of_week" INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[];
ALTER TABLE "outreach_campaigns" ADD COLUMN IF NOT EXISTS "daily_lead_limit" INTEGER;

-- AlterTable campaign_recipients
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "preview_approved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "open_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "click_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "first_opened_at" TIMESTAMPTZ;
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "first_clicked_at" TIMESTAMPTZ;
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "last_opened_at" TIMESTAMPTZ;
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "last_clicked_at" TIMESTAMPTZ;
ALTER TABLE "campaign_recipients" ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMPTZ;

-- AlterTable email_messages
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "body_text" TEXT;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "headers" JSONB;

-- AlterTable plans
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "daily_outreach_emails" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "monthly_ai_outreach_emails" INTEGER NOT NULL DEFAULT 50;

-- AlterTable user_limit_overrides
ALTER TABLE "user_limit_overrides" ADD COLUMN IF NOT EXISTS "daily_outreach_emails" INTEGER;
ALTER TABLE "user_limit_overrides" ADD COLUMN IF NOT EXISTS "monthly_ai_outreach_emails" INTEGER;

-- CreateTable campaign_steps
CREATE TABLE IF NOT EXISTS "campaign_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "step_no" INTEGER NOT NULL,
    "delay_days" INTEGER NOT NULL DEFAULT 3,
    "mode" "OutreachMode" NOT NULL DEFAULT 'custom',
    "subject_template" TEXT,
    "body_template" TEXT,
    "ai_instruction" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable tracking_events
CREATE TABLE IF NOT EXISTS "tracking_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "event_type" "TrackingEventType" NOT NULL,
    "link_url" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- Constraints and Indexes for campaign_steps
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_steps_campaign_id_step_no_key" ON "campaign_steps"("campaign_id", "step_no");
CREATE INDEX IF NOT EXISTS "campaign_steps_campaign_id_idx" ON "campaign_steps"("campaign_id");

-- Indexes for tracking_events
CREATE INDEX IF NOT EXISTS "tracking_events_campaign_id_event_type_idx" ON "tracking_events"("campaign_id", "event_type");
CREATE INDEX IF NOT EXISTS "tracking_events_recipient_id_idx" ON "tracking_events"("recipient_id");
CREATE INDEX IF NOT EXISTS "tracking_events_created_at_idx" ON "tracking_events"("created_at" DESC);

-- Foreign Keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_steps_campaign_id_fkey') THEN
        ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracking_events_campaign_id_fkey') THEN
        ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracking_events_recipient_id_fkey') THEN
        ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "campaign_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
