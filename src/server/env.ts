import { z } from "zod";
import { logger } from "@/server/logger";

/**
 * Server startup environment validation.
 * Ensures all mission-critical variables are present and well-formed.
 * NEVER logs values to console/logs; only variable names.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000"),
  APP_URL: z.string().url("APP_URL must be a valid URL (e.g. https://leadreachai.cerkitlabs.tech)"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_ENCRYPTION_KEY: z.string().refine((val) => {
    try {
      const buf = Buffer.from(val, "base64");
      return buf.length === 32;
    } catch {
      return false;
    }
  }, "APP_ENCRYPTION_KEY must be a valid 32-byte Base64-encoded key"),
  ADMIN_EMAIL: z.string().email().optional().or(z.literal("")),
  REGISTRATION_MODE: z.enum(["open", "invite", "closed"]).default("invite"),
  SYSTEM_SMTP_HOST: z.string().optional(),
  SYSTEM_SMTP_PORT: z.string().optional(),
  SYSTEM_SMTP_USER: z.string().optional(),
  SYSTEM_SMTP_PASS: z.string().optional(),
  SYSTEM_SMTP_FROM: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APIFY_TOKEN: z.string().optional(),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

let validated = false;

export function validateEnv(): boolean {
  if (validated) return true;

  // In test or non-production environment, allow graceful defaults if not set
  if (process.env.NODE_ENV === "test") {
    validated = true;
    return true;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missingOrInvalidNames = result.error.issues.map((issue) => {
      const varName = issue.path.join(".");
      return `${varName}: ${issue.message}`;
    });

    logger.error(
      { missingVariables: missingOrInvalidNames },
      "❌ FATAL: Server startup environment validation failed. Missing or invalid required environment variable names:"
    );

    if (process.env.NODE_ENV === "production") {
      console.error("\n========================================================");
      console.error("❌ CRITICAL PRODUCTION CONFIGURATION ERROR:");
      console.error("Missing or invalid required environment variables:");
      for (const err of missingOrInvalidNames) {
        console.error(`  - ${err}`);
      }
      console.error("========================================================\n");
    }
    return false;
  }

  validated = true;
  return true;
}

