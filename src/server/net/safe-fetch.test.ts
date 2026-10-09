import { describe, it, expect } from "vitest";
import { isPrivateIp } from "./safe-fetch";

describe("SSRF safeFetch guard", () => {
  it("blocks local and loopback IPs", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("localhost")).toBe(true);
  });

  it("blocks AWS/GCP cloud metadata IP", () => {
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("169.254.1.1")).toBe(true);
  });

  it("blocks standard RFC1918 private subnets", () => {
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("172.16.0.5")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
  });

  it("permits public internet IPs", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("142.250.190.46")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
  });
});
