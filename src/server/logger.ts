import pino from "pino";

/** Keys whose values must never reach logs (secrets, tokens, email bodies). */
const SENSITIVE_KEY = /pass(word)?|secret|token|api[_-]?key|authorization|cookie|key_enc|_enc$|body|html|credential/i;
const REDACTED = "[REDACTED]";

/** Redact sensitive values inside free-form strings (OpenAI keys, bearer tokens, long hex/base64 blobs). */
export function scrubString(input: string): string {
  return input
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…" + REDACTED)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer " + REDACTED)
    .replace(/(access_token|refresh_token|client_secret|password)=([^&\s]+)/gi, `$1=${REDACTED}`);
}

export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[Truncated]";
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (value instanceof Error) return { name: value.name, message: scrubString(value.message) };
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? REDACTED : sanitize(v, depth + 1);
    }
    return out;
  }
  return value;
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  formatters: {
    log: (obj) => sanitize(obj) as Record<string, unknown>,
  },
  hooks: {
    logMethod(args, method) {
      if (typeof args[0] === "string") args[0] = scrubString(args[0]);
      return method.apply(this, args as Parameters<typeof method>);
    },
  },
});
