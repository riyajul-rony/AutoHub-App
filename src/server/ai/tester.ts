import OpenAI from "openai";

/**
 * Validates an OpenAI key by requesting the models endpoint with a short timeout.
 * Returns { ok: true } on success, or { ok: false, error: string } on failure.
 */
export async function testOpenAiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = new OpenAI({
      apiKey,
      timeout: 10000,
    });
    // Fast, lightweight ping to verify authentication
    await client.models.list();
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to connect to OpenAI API";
    return { ok: false, error: msg };
  }
}
