-- Delete any legacy bright_data api keys so enum transition succeeds
DELETE FROM "api_keys" WHERE "provider"::text = 'bright_data';

-- Temporarily convert provider column to text
ALTER TABLE "api_keys" ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "api_keys" ALTER COLUMN "provider" TYPE TEXT USING ("provider"::text);

-- Drop and recreate the ApiKeyProvider enum without bright_data
DROP TYPE IF EXISTS "ApiKeyProvider";
CREATE TYPE "ApiKeyProvider" AS ENUM ('openai', 'google_places');

-- Convert column back to new ApiKeyProvider enum with default
ALTER TABLE "api_keys" ALTER COLUMN "provider" TYPE "ApiKeyProvider" USING ("provider"::"ApiKeyProvider");
ALTER TABLE "api_keys" ALTER COLUMN "provider" SET DEFAULT 'openai';
