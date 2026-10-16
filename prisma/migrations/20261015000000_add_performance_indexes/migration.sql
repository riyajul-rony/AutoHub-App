-- Performance optimization indexes (Phase 2a)
-- All indexes created safely without data loss

-- users
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "users_role_status_idx" ON "users"("role", "status");

-- social_campaigns
CREATE INDEX IF NOT EXISTS "social_campaigns_status_idx" ON "social_campaigns"("status");

-- leads
CREATE INDEX IF NOT EXISTS "leads_user_id_collected_at_idx" ON "leads"("user_id", "collected_at" DESC);

-- outreach_campaigns
CREATE INDEX IF NOT EXISTS "outreach_campaigns_status_idx" ON "outreach_campaigns"("status");

-- campaign_recipients
CREATE INDEX IF NOT EXISTS "campaign_recipients_user_id_idx" ON "campaign_recipients"("user_id");

-- email_messages
CREATE INDEX IF NOT EXISTS "email_messages_user_id_direction_status_idx" ON "email_messages"("user_id", "direction", "status");
CREATE INDEX IF NOT EXISTS "email_messages_user_id_direction_sent_at_idx" ON "email_messages"("user_id", "direction", "sent_at");

-- followup_sequences
CREATE INDEX IF NOT EXISTS "followup_sequences_user_id_idx" ON "followup_sequences"("user_id");
CREATE INDEX IF NOT EXISTS "followup_sequences_campaign_id_status_idx" ON "followup_sequences"("campaign_id", "status");
