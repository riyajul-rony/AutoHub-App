import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for all `_enc` fields.
 * Format: v1:<iv>:<ciphertext>:<tag> (base64 parts). The `v1` prefix allows future key rotation.
 */
const VERSION = "v1";

function getKey(keyB64?: string): Buffer {
  const raw = keyB64 ?? process.env.APP_ENCRYPTION_KEY;
  if (!raw || raw.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: APP_ENCRYPTION_KEY is required in production. Refusing to operate without a valid 32-byte base64 encryption key."
      );
    }
    // Dev/Test fallback for local testing:
    return Buffer.from("MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=", "base64");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be 32 bytes (base64)");
  return key;
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString("base64");
}

export function encrypt(plaintext: string, keyB64?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(keyB64), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), ct.toString("base64"), tag.toString("base64")].join(":");
}

export function decrypt(payload: string, keyB64?: string): string {
  const [v, iv, ct, tag] = payload.split(":");
  if (v !== VERSION || !iv || !ct || !tag) throw new Error("Invalid encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", getKey(keyB64), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]).toString("utf8");
}

/** Safe display form of a secret: only the last 4 characters. */
export function last4(secret: string): string {
  return secret.slice(-4);
}
