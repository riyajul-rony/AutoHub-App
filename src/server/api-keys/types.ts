import { z } from "zod";

export const apiKeyProviderEnum = z.enum(["openai"]);
export type ApiKeyProviderType = z.infer<typeof apiKeyProviderEnum>;

export const apiKeyInputSchema = z.object({
  provider: apiKeyProviderEnum.default("openai"),
  label: z.string().trim().min(1, "Label is required").max(60),
  key: z.string().trim().min(8, "API Key must be at least 8 characters"),
});

export type ApiKeyInput = z.infer<typeof apiKeyInputSchema>;

export type SafeApiKey = {
  id: string;
  provider: string;
  label: string;
  key_last4: string;
  status: string;
  metadata?: Record<string, any> | null;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  created_at: string;
};
