-- CreateTable plans
CREATE TABLE IF NOT EXISTS "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "monthly_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "yearly_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "monthly_leads" INTEGER NOT NULL DEFAULT 100,
    "monthly_social_posts" INTEGER NOT NULL DEFAULT 30,
    "monthly_outreach_emails" INTEGER NOT NULL DEFAULT 100,
    "max_social_accounts" INTEGER NOT NULL DEFAULT 2,
    "max_email_accounts" INTEGER NOT NULL DEFAULT 1,
    "max_campaigns" INTEGER NOT NULL DEFAULT 2,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable user_limit_overrides
CREATE TABLE IF NOT EXISTS "user_limit_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "monthly_leads" INTEGER,
    "monthly_social_posts" INTEGER,
    "monthly_outreach_emails" INTEGER,
    "max_social_accounts" INTEGER,
    "max_email_accounts" INTEGER,
    "max_campaigns" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_limit_overrides_pkey" PRIMARY KEY ("id")
);

-- AlterTable users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan_id" UUID;

-- Indexes & Unique Constraints
CREATE UNIQUE INDEX IF NOT EXISTS "plans_slug_key" ON "plans"("slug");
CREATE INDEX IF NOT EXISTS "plans_slug_idx" ON "plans"("slug");
CREATE INDEX IF NOT EXISTS "plans_is_active_idx" ON "plans"("is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "user_limit_overrides_user_id_key" ON "user_limit_overrides"("user_id");

-- Foreign Keys
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_plan_id_fkey'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_limit_overrides_user_id_fkey'
    ) THEN
        ALTER TABLE "user_limit_overrides" ADD CONSTRAINT "user_limit_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Seed Default Plans
INSERT INTO "plans" ("name", "slug", "monthly_price", "yearly_price", "currency", "is_active", "features", "monthly_leads", "monthly_social_posts", "monthly_outreach_emails", "max_social_accounts", "max_email_accounts", "max_campaigns")
VALUES
(
    'Free Tier',
    'free',
    0,
    0,
    'USD',
    true,
    ARRAY['100 Leads / month', '30 Social Posts / month', '100 Outreach Emails / month', '1 Email Inbox', '2 Social Accounts', '2 Active Campaigns'],
    100,
    30,
    100,
    2,
    1,
    2
),
(
    'Starter Plan',
    'starter',
    19,
    190,
    'USD',
    true,
    ARRAY['500 Leads / month', '120 Social Posts / month', '500 Outreach Emails / month', '2 Email Inboxes', '5 Social Accounts', '5 Active Campaigns', 'Basic Lead Enrichment'],
    500,
    120,
    500,
    5,
    2,
    5
),
(
    'Professional Plan',
    'pro',
    49,
    470,
    'USD',
    true,
    ARRAY['2,500 Leads / month', '500 Social Posts / month', '2,500 Outreach Emails / month', '5 Email Inboxes', '10 Social Accounts', '20 Active Campaigns', 'Priority Cloud AI & Automated Sequences'],
    2500,
    500,
    2500,
    10,
    5,
    20
),
(
    'Enterprise Scale',
    'enterprise',
    199,
    1900,
    'USD',
    true,
    ARRAY['50,000 Leads / month', '10,000 Social Posts / month', '50,000 Outreach Emails / month', '25 Email Inboxes', '50 Social Accounts', '100 Active Campaigns', 'Dedicated Warmup & 24/7 SLA'],
    50000,
    10000,
    50000,
    50,
    25,
    100
)
ON CONFLICT ("slug") DO NOTHING;

-- Associate existing users with the 'free' plan if not assigned
UPDATE "users"
SET "plan_id" = (SELECT "id" FROM "plans" WHERE "slug" = 'free' LIMIT 1)
WHERE "plan_id" IS NULL;
