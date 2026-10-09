import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/server/db";
import { randomToken, sha256 } from "./token";

export const SESSION_COOKIE = "autohub_session";
const SESSION_DAYS = 30;
const DAY_MS = 86_400_000;

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function createSession(userId: string) {
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  const h = await headers();
  await db.sessions.create({
    data: {
      user_id: userId,
      token_hash: sha256(token),
      expires_at: expires,
      user_agent: h.get("user-agent")?.slice(0, 255),
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expires));
}

/** Resolve the logged-in user from the cookie. Rolling expiry: refreshed once per day. */
export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.sessions.findUnique({
    where: { token_hash: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expires_at < new Date()) return null;
  if (session.user.status !== "active") return null;

  if (session.expires_at.getTime() - Date.now() < (SESSION_DAYS - 1) * DAY_MS) {
    // Rolling: push expiry forward (cookie is refreshed on next write-capable request).
    await db.sessions.update({
      where: { id: session.id },
      data: { expires_at: new Date(Date.now() + SESSION_DAYS * DAY_MS) },
    });
  }
  return { sessionId: session.id, user: session.user };
});

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.sessions.deleteMany({ where: { token_hash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Log out of every device. */
export async function destroyAllSessions(userId: string) {
  await db.sessions.deleteMany({ where: { user_id: userId } });
  (await cookies()).delete(SESSION_COOKIE);
}
