import { z } from "zod";

export const apiKeyInputSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(60),
  key: z.string().trim().startsWith("sk-", "OpenAI key must start with 'sk-'"),
});

export type ApiKeyInput = z.infer<typeof apiKeyInputSchema>;

export type SafeApiKey = {
  id: string;
  provider: string;
  label: string;
  key_last4: string;
  status: string;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  created_at: string;
};
