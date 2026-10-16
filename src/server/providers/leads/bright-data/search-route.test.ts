import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { encrypt } from "@/server/crypto";
import { computeLeadDedupeKey } from "../dedupe";

// Mock session and adapter
vi.mock("@/server/auth/session", () => ({
  getSessionUser: vi.fn(),
}));

import { getSessionUser } from "@/server/auth/session";
import { POST } from "@/app/api/v1/leads/search/route";

describe("POST /api/v1/leads/search (Phase 3 Route & Isolation)", () => {
  const USER_NO_KEY = "99999999-9999-9999-9999-999999999990";
  const USER_WITH_KEY = "99999999-9999-9999-9999-999999999991";

  beforeEach(async () => {
    vi.clearAllMocks();

    // Seed Bright Data key for USER_WITH_KEY
    await db.api_keys.create({
      data: {
        id: "key-bd-user-1",
        user_id: USER_WITH_KEY,
        provider: "bright_data",
        label: "My Personal Bright Data Key",
        key_enc: encrypt("valid_user_bright_data_key_123"),
        key_last4: "8899",
        status: "active",
      },
    });
  });

  it("returns 401 when request is not authenticated", async () => {
    (getSessionUser as any).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/leads/search", {
      method: "POST",
      body: JSON.stringify({ keyword: "Dentist", location: "Dhaka" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 400 with Bengali guidance when user has not added a Bright Data API key in Settings", async () => {
    (getSessionUser as any).mockResolvedValue({
      sessionId: "session-no-key",
      user: { id: USER_NO_KEY, email: "nokey@example.com", role: "user" },
    });

    const req = new NextRequest("http://localhost/api/v1/leads/search", {
      method: "POST",
      body: JSON.stringify({ keyword: "Dentist", location: "Dhaka" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("আগে Settings-এ Bright Data API key দাও");
  });

  it("returns 422 if keyword or location are missing", async () => {
    (getSessionUser as any).mockResolvedValue({
      sessionId: "session-with-key",
      user: { id: USER_WITH_KEY, email: "withkey@example.com", role: "user" },
    });

    const req = new NextRequest("http://localhost/api/v1/leads/search", {
      method: "POST",
      body: JSON.stringify({ keyword: "", location: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});
