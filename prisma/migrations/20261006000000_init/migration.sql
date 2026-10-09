-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'pending_delete');

-- CreateEnum
CREATE TYPE "ApiKeyProvider" AS ENUM ('openai');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('active', 'invalid', 'disabled');

-- CreateEnum
CREATE TYPE "SocialProviderId" AS ENUM ('facebook', 'instagram', 'linkedin');

-- CreateEnum
CREATE TYPE "SocialAccountStatus" AS ENUM ('active', 'needs_reconnect', 'disabled');

-- CreateEnum
CREATE TYPE "GoogleConnStatus" AS ENUM ('active', 'needs_reconnect');

-- CreateEnum
CREATE TYPE "EmailKind" AS ENUM ('business', 'personal');

-- CreateEnum
CREATE TYPE "EmailProviderId" AS ENUM ('smtp', 'gmail_api');

-- CreateEnum
CREATE TYPE "EmailAccountStatus" AS ENUM ('active', 'paused', 'needs_attention', 'disabled');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('active', 'paused', 'error', 'ended');

-- CreateEnum
CREATE TYPE "ApprovalMode" AS ENUM ('auto', 'approve');

-- CreateEnum
CREATE TYPE "ApprovalTimeoutAction" AS ENUM ('skip', 'publish');

-- CreateEnum
CREATE TYPE "CaptionLength" AS ENUM ('short', 'medium', 'long');

-- CreateEnum
CREATE TYPE "PostRunStatus" AS ENUM ('scheduled', 'generating', 'pending_approval', 'publishing', 'published', 'failed', 'skipped', 'needs_review', 'rejected');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('reference', 'generated', 'other');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('google_maps', 'meta_ads', 'linkedin');

-- CreateEnum
CREATE TYPE "SearchStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('valid', 'risky', 'invalid', 'unknown');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('personal', 'role', 'generic');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'replied', 'bounced', 'unsubscribed', 'do_not_contact');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('csv', 'sheet');

-- CreateEnum
CREATE TYPE "ExportMode" AS ENUM ('append', 'replace');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('unsubscribed', 'bounced', 'complaint', 'manual');

-- CreateEnum
CREATE TYPE "OutreachMode" AS ENUM ('ai', 'custom');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "RecipientSource" AS ENUM ('leads', 'sheet');

-- CreateEnum
CREATE TYPE "RecipientStatus" AS ENUM ('queued', 'sending', 'sent', 'failed', 'failed_generation', 'bounced', 'replied', 'unsubscribed', 'needs_review', 'skipped');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('out', 'in');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('initial', 'followup', 'reply', 'bounce', 'auto_reply');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('sent', 'failed', 'received');

-- CreateEnum
CREATE TYPE "SequenceStatus" AS ENUM ('draft', 'active', 'paused');

-- CreateEnum
CREATE TYPE "SequenceSourceType" AS ENUM ('campaign', 'leads', 'sheet');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "email_verified_at" TIMESTAMPTZ,
    "password_hash" TEXT,
    "name" TEXT,
    "business_name" TEXT,
    "business_category" TEXT,
    "country" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "sender_legal_name" TEXT,
    "sender_address" TEXT,
    "goals" TEXT[],
    "onboarded_at" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "deletion_requested_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" UUID NOT NULL,
    "notification_prefs" JSONB NOT NULL DEFAULT '{}',
    "ui_prefs" JSONB NOT NULL DEFAULT '{}',
    "limits_override" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value_enc" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "ApiKeyProvider" NOT NULL DEFAULT 'openai',
    "label" TEXT NOT NULL,
    "key_enc" TEXT NOT NULL,
    "key_last4" VARCHAR(4) NOT NULL,
    "last_tested_at" TIMESTAMPTZ,
    "last_test_ok" BOOLEAN,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "SocialProviderId" NOT NULL,
    "external_id" TEXT NOT NULL,
    "parent_external_id" TEXT,
    "display_name" TEXT,
    "picture_url" TEXT,
    "access_token_enc" TEXT,
    "refresh_token_enc" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    "scopes" TEXT[],
    "status" "SocialAccountStatus" NOT NULL DEFAULT 'active',
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "google_email" TEXT NOT NULL,
    "access_token_enc" TEXT,
    "refresh_token_enc" TEXT,
    "expires_at" TIMESTAMPTZ,
    "scopes" TEXT[],
    "status" "GoogleConnStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" "EmailKind" NOT NULL DEFAULT 'business',
    "provider" "EmailProviderId" NOT NULL DEFAULT 'smtp',
    "label" TEXT NOT NULL,
    "from_name" TEXT,
    "from_email" TEXT NOT NULL,
    "reply_to" TEXT,
    "signature" TEXT,
    "smtp_host" TEXT,
    "smtp_port" INTEGER,
    "smtp_security" TEXT,
    "smtp_username" TEXT,
    "smtp_password_enc" TEXT,
    "imap_host" TEXT,
    "imap_port" INTEGER,
    "imap_security" TEXT,
    "imap_username" TEXT,
    "imap_password_enc" TEXT,
    "google_connection_id" UUID,
    "hourly_limit" INTEGER NOT NULL DEFAULT 25,
    "daily_limit" INTEGER NOT NULL DEFAULT 150,
    "status" "EmailAccountStatus" NOT NULL DEFAULT 'active',
    "last_error" TEXT,
    "last_polled_at" TIMESTAMPTZ,
    "last_imap_uid" INTEGER,
    "next_allowed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "workspace_id" UUID,
    "social_account_id" UUID NOT NULL,
    "openai_key_id" UUID,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'active',
    "business_category" TEXT,
    "business_name" TEXT,
    "business_description" TEXT,
    "target_audience" TEXT,
    "brand_voice" TEXT,
    "language" TEXT NOT NULL DEFAULT 'English',
    "prompt" TEXT,
    "image_style" TEXT,
    "caption_length" "CaptionLength" NOT NULL DEFAULT 'medium',
    "emojis" BOOLEAN NOT NULL DEFAULT true,
    "hashtags_count" INTEGER NOT NULL DEFAULT 5,
    "cta_text" TEXT,
    "text_model" TEXT,
    "image_model" TEXT,
    "post_times" TEXT[],
    "days_of_week" INTEGER[],
    "timezone" TEXT NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "approval_mode" "ApprovalMode" NOT NULL DEFAULT 'auto',
    "approval_timeout_hours" INTEGER NOT NULL DEFAULT 24,
    "approval_timeout_action" "ApprovalTimeoutAction" NOT NULL DEFAULT 'skip',
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "social_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "path" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "public_token" TEXT,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_reference_assets" (
    "campaign_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "campaign_reference_assets_pkey" PRIMARY KEY ("campaign_id","asset_id")
);

-- CreateTable
CREATE TABLE "post_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "scheduled_for" TIMESTAMPTZ NOT NULL,
    "status" "PostRunStatus" NOT NULL DEFAULT 'scheduled',
    "caption" TEXT,
    "hashtags" TEXT[],
    "image_prompt" TEXT,
    "image_asset_id" UUID,
    "external_post_id" TEXT,
    "external_url" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "error_message" TEXT,
    "model_info" JSONB,
    "approved_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "post_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_searches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "source" "LeadSource" NOT NULL,
    "provider_used" TEXT,
    "params" JSONB NOT NULL,
    "status" "SearchStatus" NOT NULL DEFAULT 'queued',
    "found_count" INTEGER NOT NULL DEFAULT 0,
    "enriched_count" INTEGER NOT NULL DEFAULT 0,
    "duplicates_skipped" INTEGER NOT NULL DEFAULT 0,
    "est_cost_cents" INTEGER,
    "error" TEXT,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "search_id" UUID,
    "dedupe_key" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "email" TEXT,
    "email_status" "EmailStatus",
    "email_type" "EmailType",
    "phone" TEXT,
    "phone_raw" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postal_code" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "business_type" TEXT,
    "rating" DECIMAL(2,1),
    "reviews_count" INTEGER,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "source_ref" TEXT,
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "linkedin_url" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "extra" JSONB,
    "collected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "search_id" UUID,
    "google_connection_id" UUID,
    "type" "ExportType" NOT NULL,
    "options" JSONB,
    "spreadsheet_id" TEXT,
    "sheet_title" TEXT,
    "mode" "ExportMode",
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "rows_total" INTEGER NOT NULL DEFAULT 0,
    "rows_done" INTEGER NOT NULL DEFAULT 0,
    "result_url" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppressions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "source_campaign_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "workspace_id" UUID,
    "name" TEXT NOT NULL,
    "mode" "OutreachMode" NOT NULL,
    "status" "OutreachStatus" NOT NULL DEFAULT 'draft',
    "recipient_source" "RecipientSource" NOT NULL DEFAULT 'leads',
    "source_ref" JSONB,
    "subject_template" TEXT,
    "body_template" TEXT,
    "ai_config" JSONB,
    "openai_key_id" UUID,
    "text_model" TEXT,
    "send_window" JSONB,
    "timezone" TEXT NOT NULL,
    "jitter_min_sec" INTEGER NOT NULL DEFAULT 60,
    "jitter_max_sec" INTEGER NOT NULL DEFAULT 180,
    "start_at" TIMESTAMPTZ,
    "launched_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "outreach_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_campaign_accounts" (
    "campaign_id" UUID NOT NULL,
    "email_account_id" UUID NOT NULL,

    CONSTRAINT "outreach_campaign_accounts_pkey" PRIMARY KEY ("campaign_id","email_account_id")
);

-- CreateTable
CREATE TABLE "campaign_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "lead_id" UUID,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "vars" JSONB,
    "assigned_account_id" UUID,
    "status" "RecipientStatus" NOT NULL DEFAULT 'queued',
    "generated_subject" TEXT,
    "generated_body" TEXT,
    "thread_message_id" TEXT,
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "next_followup_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "last_sent_at" TIMESTAMPTZ,
    "replied_at" TIMESTAMPTZ,
    "sending_started_at" TIMESTAMPTZ,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "unsubscribe_token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "recipient_id" UUID,
    "email_account_id" UUID NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "step_no" INTEGER NOT NULL DEFAULT 0,
    "message_id" TEXT NOT NULL,
    "in_reply_to" TEXT,
    "subject" TEXT,
    "snippet" VARCHAR(200),
    "status" "MessageStatus" NOT NULL,
    "sent_at" TIMESTAMPTZ,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followup_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SequenceStatus" NOT NULL DEFAULT 'draft',
    "campaign_id" UUID,
    "source_type" "SequenceSourceType" NOT NULL DEFAULT 'campaign',
    "source_ref" JSONB,
    "email_account_id" UUID,
    "openai_key_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followup_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followup_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sequence_id" UUID NOT NULL,
    "step_no" INTEGER NOT NULL,
    "delay_days" INTEGER NOT NULL,
    "mode" "OutreachMode" NOT NULL,
    "subject_template" TEXT,
    "body_template" TEXT,
    "ai_instruction" TEXT,

    CONSTRAINT "followup_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "read_at" TIMESTAMPTZ,
    "emailed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspaces_user_id_idx" ON "workspaces"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "verification_tokens_identifier_purpose_idx" ON "verification_tokens"("identifier", "purpose");

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_user_id_provider_external_id_key" ON "social_accounts"("user_id", "provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_connections_user_id_google_email_key" ON "google_connections"("user_id", "google_email");

-- CreateIndex
CREATE UNIQUE INDEX "email_accounts_user_id_from_email_key" ON "email_accounts"("user_id", "from_email");

-- CreateIndex
CREATE INDEX "social_campaigns_user_id_status_idx" ON "social_campaigns"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "assets_public_token_key" ON "assets"("public_token");

-- CreateIndex
CREATE INDEX "assets_user_id_idx" ON "assets"("user_id");

-- CreateIndex
CREATE INDEX "post_runs_status_scheduled_for_idx" ON "post_runs"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "post_runs_user_id_created_at_idx" ON "post_runs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "post_runs_campaign_id_scheduled_for_key" ON "post_runs"("campaign_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "lead_searches_user_id_created_at_idx" ON "lead_searches"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "leads_user_id_search_id_idx" ON "leads"("user_id", "search_id");

-- CreateIndex
CREATE INDEX "leads_user_id_email_idx" ON "leads"("user_id", "email");

-- CreateIndex
CREATE INDEX "leads_user_id_status_idx" ON "leads"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "leads_user_id_dedupe_key_key" ON "leads"("user_id", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "suppressions_user_id_email_key" ON "suppressions"("user_id", "email");

-- CreateIndex
CREATE INDEX "outreach_campaigns_user_id_status_idx" ON "outreach_campaigns"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_recipients_unsubscribe_token_key" ON "campaign_recipients"("unsubscribe_token");

-- CreateIndex
CREATE INDEX "campaign_recipients_campaign_id_status_idx" ON "campaign_recipients"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "campaign_recipients_assigned_account_id_status_idx" ON "campaign_recipients"("assigned_account_id", "status");

-- CreateIndex
CREATE INDEX "campaign_recipients_next_followup_at_idx" ON "campaign_recipients"("next_followup_at");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_recipients_campaign_id_email_key" ON "campaign_recipients"("campaign_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_recipients_campaign_id_lead_id_key" ON "campaign_recipients"("campaign_id", "lead_id");

-- CreateIndex
CREATE INDEX "email_messages_email_account_id_sent_at_idx" ON "email_messages"("email_account_id", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_messages_email_account_id_message_id_key" ON "email_messages"("email_account_id", "message_id");

-- CreateIndex
CREATE UNIQUE INDEX "followup_steps_sequence_id_step_no_key" ON "followup_steps"("sequence_id", "step_no");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_connections" ADD CONSTRAINT "google_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_google_connection_id_fkey" FOREIGN KEY ("google_connection_id") REFERENCES "google_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_campaigns" ADD CONSTRAINT "social_campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_campaigns" ADD CONSTRAINT "social_campaigns_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_campaigns" ADD CONSTRAINT "social_campaigns_openai_key_id_fkey" FOREIGN KEY ("openai_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_reference_assets" ADD CONSTRAINT "campaign_reference_assets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "social_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_reference_assets" ADD CONSTRAINT "campaign_reference_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_runs" ADD CONSTRAINT "post_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_runs" ADD CONSTRAINT "post_runs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "social_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_runs" ADD CONSTRAINT "post_runs_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_searches" ADD CONSTRAINT "lead_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "lead_searches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "lead_searches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_google_connection_id_fkey" FOREIGN KEY ("google_connection_id") REFERENCES "google_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppressions" ADD CONSTRAINT "suppressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_campaigns" ADD CONSTRAINT "outreach_campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_campaigns" ADD CONSTRAINT "outreach_campaigns_openai_key_id_fkey" FOREIGN KEY ("openai_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_campaign_accounts" ADD CONSTRAINT "outreach_campaign_accounts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_campaign_accounts" ADD CONSTRAINT "outreach_campaign_accounts_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "email_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_assigned_account_id_fkey" FOREIGN KEY ("assigned_account_id") REFERENCES "email_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "campaign_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "email_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_sequences" ADD CONSTRAINT "followup_sequences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_sequences" ADD CONSTRAINT "followup_sequences_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_sequences" ADD CONSTRAINT "followup_sequences_email_account_id_fkey" FOREIGN KEY ("email_account_id") REFERENCES "email_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_sequences" ADD CONSTRAINT "followup_sequences_openai_key_id_fkey" FOREIGN KEY ("openai_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_steps" ADD CONSTRAINT "followup_steps_sequence_id_fkey" FOREIGN KEY ("sequence_id") REFERENCES "followup_sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hard cap: max 25 emails/hour per account (spec 5.6)
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_hourly_limit_check" CHECK ("hourly_limit" BETWEEN 1 AND 25);
