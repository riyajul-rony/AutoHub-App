import { describe, it, expect } from "vitest";
import { sanitize, scrubString } from "./logger";

describe("log sanitizer", () => {
  it("redacts sensitive keys", () => {
    const out = sanitize({ user: "a", password: "x", smtp_password_enc: "v1:..", nested: { access_token: "t", ok: 1 } }) as any;
    expect(out.user).toBe("a");
    expect(out.password).toBe("[REDACTED]");
    expect(out.smtp_password_enc).toBe("[REDACTED]");
    expect(out.nested.access_token).toBe("[REDACTED]");
    expect(out.nested.ok).toBe(1);
  });

  it("never keeps email bodies", () => {
    expect((sanitize({ body: "hello secret mail" }) as any).body).toBe("[REDACTED]");
  });

  it("scrubs OpenAI keys and bearer tokens inside strings", () => {
    const s = scrubString("failed with sk-abcdefghijklmnop and Bearer abc.def.ghi");
    expect(s).not.toContain("abcdefghijklmnop");
    expect(s).not.toContain("abc.def.ghi");
  });
});
