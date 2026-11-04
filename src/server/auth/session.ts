import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/server/db";
import { randomToken, sha256 } from "./token";

import { cacheGet, cacheSet, cacheDel, cacheDelPattern, cacheFindKeys } from "@/server/cache";

export const SESSION_COOKIE = "leadreach_session";
const SESSION_DAYS = 30;
const DAY_MS = 86_400_000;
const SESSION_CACHE_TTL = 60; // 60 seconds Redis session lookup cache

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function createSession(userId: string): Promise<{ sessionId: string; token: string }> {
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_DAYS * DAY_MS);

  let userAgent: string | undefined;
  let ip: string | undefined;
  try {
    const h = await headers();
    userAgent = h.get("user-agent")?.slice(0, 255) ?? undefined;
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  } catch {
    // headers() might not be available in standalone test or script contexts
  }

  const session = await db.sessions.create({
    data: {
      user_id: userId,
      token_hash: sha256(token),
      expires_at: expires,
      user_agent: userAgent,
      ip: ip,
    },
  });

  try {
    (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expires));
  } catch {
    // cookies() might not be writable in some contexts
  }

  return { sessionId: session.id, token };
}

/** Resolve the logged-in user from either cookie or Bearer header. Cached in Redis for 60s. */
export const getSessionUser = cache(async () => {
  let token: string | undefined;

  try {
    const jar = await cookies();
    token = jar.get(SESSION_COOKIE)?.value;
  } catch {
    // cookies() unavailable in non-request contexts
  }

  if (!token) {
    try {
      const h = await headers();
      const auth = h.get("authorization");
      if (auth?.startsWith("Bearer ")) {
        token = auth.slice(7).trim();
      }
    } catch {
      // headers() unavailable
    }
  }

  if (!token) return null;

  const tokenHash = sha256(token);
  const cacheKey = `session:${tokenHash}`;

  // 1. Try Redis cache (60s TTL)
  const cached = await cacheGet<{
    id: string;
    user_id: string;
    expires_at: string | Date;
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      status: string;
      email_verified_at: string | Date | null;
      onboarded_at: string | Date | null;
      business_name: string | null;
      avatar_url?: string | null;
    };
  }>(cacheKey);

  if (cached && cached.user) {
    if (cached.user.status !== "active") {
      await cacheDel(cacheKey);
      return null;
    }
    const expiresAt = new Date(cached.expires_at);
    if (isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      await cacheDel(cacheKey);
      return null;
    }
    return { sessionId: cached.id, user: cached.user };
  }

  // 2. Cache miss: Fetch from Database
  const session = await db.sessions.findUnique({
    where: { token_hash: tokenHash },
    select: {
      id: true,
      user_id: true,
      expires_at: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          email_verified_at: true,
          onboarded_at: true,
          business_name: true,
          avatar_url: true,
        },
      },
    },
  });

  if (!session) return null;
  const expiresAt = session.expires_at instanceof Date ? session.expires_at : new Date(session.expires_at);
  if (isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) return null;
  if (session.user.status !== "active") return null;

  // Store in Redis cache for 60 seconds
  await cacheSet(cacheKey, session, SESSION_CACHE_TTL);
  await cacheSet(`user_session:${session.user.id}:${tokenHash}`, "1", SESSION_CACHE_TTL);

  if (expiresAt.getTime() - Date.now() < (SESSION_DAYS - 1) * DAY_MS) {
    // Rolling: push expiry forward (cookie is refreshed on next write-capable request).
    await db.sessions.update({
      where: { id: session.id },
      data: { expires_at: new Date(Date.now() + SESSION_DAYS * DAY_MS) },
    });
  }

  return { sessionId: session.id, user: session.user };
});

/** Invalidate all sessions for a user immediately (on suspend, delete, role change, password reset) */
export async function invalidateUserSessions(userId: string) {
  try {
    await db.sessions.deleteMany({ where: { user_id: userId } });
  } catch {
    // ignore DB error
  }
  // Clear all cached sessions for this user from Redis immediately
  const userSessionKeys = await cacheFindKeys(`user_session:${userId}:*`);
  const sessionKeysToDelete: string[] = [];
  for (const k of userSessionKeys) {
    const tokenHash = k.substring(k.lastIndexOf(":") + 1);
    if (tokenHash) sessionKeysToDelete.push(`session:${tokenHash}`);
  }
  if (sessionKeysToDelete.length > 0) {
    await cacheDel(...sessionKeysToDelete);
  }
  if (userSessionKeys.length > 0) {
    await cacheDel(...userSessionKeys);
  }
}

/**
 * Invalidate Redis session cache for a user or current session so DB updates (e.g. onboarded_at, role, profile)
 * take effect immediately on next request without deleting active DB sessions or logging the user out.
 */
export async function refreshSessionCache(userId?: string): Promise<void> {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token) {
      const tokenHash = sha256(token);
      await cacheDel(`session:${tokenHash}`);
    }
  } catch {
    // cookies() unavailable in non-request contexts
  }

  if (userId) {
    try {
      const userSessionKeys = await cacheFindKeys(`user_session:${userId}:*`);
      const sessionKeysToDelete: string[] = [];
      for (const k of userSessionKeys) {
        const tokenHash = k.substring(k.lastIndexOf(":") + 1);
        if (tokenHash) {
          sessionKeysToDelete.push(`session:${tokenHash}`);
        }
      }
      if (sessionKeysToDelete.length > 0) {
        await cacheDel(...sessionKeysToDelete);
      }
      if (userSessionKeys.length > 0) {
        await cacheDel(...userSessionKeys);
      }
    } catch {
      // cache errors non-fatal
    }
  }
}

export async function destroySession() {
  try {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token) {
      const tokenHash = sha256(token);
      await cacheDel(`session:${tokenHash}`);
      await cacheDelPattern(`user_session:*:${tokenHash}`);
      await db.sessions.deleteMany({ where: { token_hash: tokenHash } });
    }
    jar.delete(SESSION_COOKIE);
  } catch {
    // Ignore context error
  }
}

/** Log out of every device. */
export async function destroyAllSessions(userId: string) {
  await invalidateUserSessions(userId);
  try {
    (await cookies()).delete(SESSION_COOKIE);
  } catch {
    // Ignore context error
  }
}
