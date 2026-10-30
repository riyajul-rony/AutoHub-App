-- AlterTable email_accounts to add reply_inbox_account_id
ALTER TABLE "email_accounts" ADD COLUMN IF NOT EXISTS "reply_inbox_account_id" UUID;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'email_accounts_reply_inbox_account_id_fkey'
    ) THEN
        ALTER TABLE "email_accounts"
        ADD CONSTRAINT "email_accounts_reply_inbox_account_id_fkey"
        FOREIGN KEY ("reply_inbox_account_id") REFERENCES "email_accounts"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "email_accounts_reply_inbox_account_id_idx" ON "email_accounts"("reply_inbox_account_id");
