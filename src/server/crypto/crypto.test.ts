import { describe, it, expect } from "vitest";
import { encrypt, decrypt, generateEncryptionKey, last4 } from "./index";

describe("crypto", () => {
  const key = generateEncryptionKey();

  it("round-trips", () => {
    const enc = encrypt("sk-secret-abcd", key);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(enc).not.toContain("sk-secret");
    expect(decrypt(enc, key)).toBe("sk-secret-abcd");
  });

  it("uses a fresh IV each time", () => {
    expect(encrypt("x", key)).not.toBe(encrypt("x", key));
  });

  it("fails with the wrong key or tampered data", () => {
    const enc = encrypt("hello", key);
    expect(() => decrypt(enc, generateEncryptionKey())).toThrow();
    const parts = enc.split(":");
    parts[2] = Buffer.from("tampered").toString("base64");
    expect(() => decrypt(parts.join(":"), key)).toThrow();
  });

  it("last4 shows only the end", () => {
    expect(last4("sk-abcdefgh1234")).toBe("1234");
  });
});
