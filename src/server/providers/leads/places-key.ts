/**
 * Per-user Google Maps (Places API) key management.
 *
 * Google does not hand out API keys through "Sign in with Google" (OAuth tokens and API keys are
 * different things), so each user creates a key in their OWN Google Cloud project and pastes it here.
 * Searches then run against the user's own quota/billing and return Google's real data.
 *
 * Storage: encrypted in `api_keys` (provider = google_places). An encrypted httpOnly cookie is kept
 * as a fallback so the feature also works when the database is unreachable (local development).
 */
import { cookies } from "next/headers";
import { db, scoped } from "@/server/db";
import { encrypt, decrypt, last4 } from "@/server/crypto";

const COOKIE_NAME = "leadreach_places_key";
const PROVIDER = "google_places";
// Dev-only fallback so local development works without APP_ENCRYPTION_KEY configured.
const DEV_KEY_B64 = Buffer.alloc(32, "leadreach-dev-places-key").toString("base64");

function encKey(): string | undefined {
  if (process.env.APP_ENCRYPTION_KEY) return undefined; // use the configured key
  return process.env.NODE_ENV !== "production" ? DEV_KEY_B64 : undefined;
}

export function looksLikeGoogleKey(key: string): boolean {
  return /^AIza[0-9A-Za-z_\-]{30,45}$/.test(key.trim());
}

export type PlacesKeyTest = { ok: boolean; error?: string };

/** Makes one tiny real Places API (New) call to prove the key works and the API is enabled. */
export async function testPlacesKey(key: string): Promise<PlacesKeyTest> {
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({ textQuery: "coffee in London", pageSize: 1 }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    const msg: string = data?.error?.message || `HTTP ${res.status}`;
    if (/API key not valid|API_KEY_INVALID/i.test(msg)) return { ok: false, error: "Google says this API key is not valid." };
    if (/has not been used|is disabled|SERVICE_DISABLED/i.test(msg))
      return { ok: false, error: "Enable “Places API (New)” in your Google Cloud project, then try again." };
    if (/billing/i.test(msg)) return { ok: false, error: "Billing is not enabled on this Google Cloud project." };
    return { ok: false, error: msg };
  } catch (err: any) {
    return { ok: false, error: `Could not reach Google: ${err?.message ?? "network error"}` };
  }
}

export type PlacesKeyStatus = { connected: boolean; last4?: string; verifiedAt?: string };

export async function savePlacesKey(userId: string, key: string): Promise<PlacesKeyStatus> {
  const clean = key.trim();
  const enc = encrypt(clean, encKey());

  // 1. Database (replace any previous Google key for this user)
  try {
    const existing = await db.api_keys.findMany({ where: scoped(userId, { provider: PROVIDER }) });
    for (const row of existing || []) await db.api_keys.delete({ where: { id: row.id } });
    await db.api_keys.create({
      data: {
        user_id: userId,
        provider: PROVIDER,
        label: "Google Maps (Places)",
        key_enc: enc,
        key_last4: last4(clean),
        last_tested_at: new Date(),
        last_test_ok: true,
        status: "active",
      },
    });
  } catch {
    // Database unavailable — cookie fallback below still stores it.
  }

  // 2. Encrypted httpOnly cookie fallback
  const jar = await cookies();
  jar.set(COOKIE_NAME, `${userId}|${enc}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });

  return { connected: true, last4: last4(clean), verifiedAt: new Date().toISOString() };
}

export async function deletePlacesKey(userId: string): Promise<void> {
  try {
    const existing = await db.api_keys.findMany({ where: scoped(userId, { provider: PROVIDER }) });
    for (const row of existing || []) await db.api_keys.delete({ where: { id: row.id } });
  } catch {
    // ignore
  }
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** Returns the user's decrypted Google key, or undefined when not connected. */
export async function getUserPlacesKey(userId: string): Promise<string | undefined> {
  try {
    const row = await db.api_keys.findFirst({ where: scoped(userId, { provider: PROVIDER, status: "active" }) });
    if (row?.key_enc) return decrypt(row.key_enc, encKey());
  } catch {
    // fall through to cookie
  }
  try {
    const jar = await cookies();
    const raw = jar.get(COOKIE_NAME)?.value;
    if (!raw) return undefined;
    const [owner, enc] = raw.split("|");
    if (owner !== userId || !enc) return undefined;
    return decrypt(enc, encKey());
  } catch {
    return undefined;
  }
}

export async function getPlacesKeyStatus(userId: string): Promise<PlacesKeyStatus> {
  const key = await getUserPlacesKey(userId);
  if (!key) return { connected: false };
  return { connected: true, last4: last4(key) };
}
