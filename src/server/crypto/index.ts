import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for all `_enc` fields.
 * Format: v1:<iv>:<ciphertext>:<tag> (base64 parts). The `v1` prefix allows future key rotation.
 */
const VERSION = "v1";

export function parseEncryptionKeyBuffer(rawKey?: string): Buffer {
  let clean = (rawKey ?? process.env.APP_ENCRYPTION_KEY ?? "").trim();
  // Strip quotes if user wrapped in "" or ''
  if (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim();
  }

  if (!clean) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: APP_ENCRYPTION_KEY is required in production. Refusing to operate without a valid 32-byte encryption key."
      );
    }
    // Dev/Test fallback for local testing:
    return Buffer.from("MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=", "base64");
  }

  // 1. 64-char Hex format (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    return Buffer.from(clean, "hex");
  }

  // 2. Base64 format (32 bytes)
  try {
    const b64Buf = Buffer.from(clean, "base64");
    if (b64Buf.length === 32) return b64Buf;
  } catch {}

  // 3. UTF-8 format (32 bytes)
  if (Buffer.byteLength(clean, "utf8") === 32) {
    return Buffer.from(clean, "utf8");
  }

  throw new Error(
    `APP_ENCRYPTION_KEY is invalid. It must decode to exactly 32 bytes (either 44 characters Base64 or 64 characters Hex). Current decoded Base64 length is ${
      Buffer.from(clean, "base64").length
    } bytes.`
  );
}

function getKey(keyB64?: string): Buffer {
  return parseEncryptionKeyBuffer(keyB64);
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
