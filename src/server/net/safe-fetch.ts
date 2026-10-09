import dns from "node:dns/promises";
import net from "node:net";

/**
 * Validates if an IP address is a private, loopback, link-local, or cloud metadata address.
 * Prevents Server-Side Request Forgery (SSRF) when crawling target websites.
 */
export function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;

  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;

  // Cloud metadata services (e.g. AWS/GCP 169.254.169.254)
  if (ip.startsWith("169.254.")) return true;

  // IPv4 private ranges
  const parts = ip.split(".").map(Number);
  if (parts.length === 4) {
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 0 || parts[0] === 127) return true;
  }

  return false;
}

/**
 * Safely fetches a URL with SSRF protection, strict timeouts, redirect limits, and response size limits.
 */
export async function safeFetch(
  targetUrl: string,
  options: { timeoutMs?: number; maxBytes?: number; maxRedirects?: number } = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024; // 2MB limit
  let currentUrl = targetUrl;
  let redirects = 0;
  const maxRedirects = options.maxRedirects ?? 3;

  while (redirects <= maxRedirects) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Unsupported protocol: ${parsed.protocol}`);
    }

    // Resolve hostname to IP to verify against SSRF blocklist
    try {
      const lookup = await dns.lookup(parsed.hostname);
      if (isPrivateIp(lookup.address)) {
        throw new Error(`SSRF blocked: Domain resolves to private or metadata IP (${lookup.address})`);
      }
    } catch (dnsErr: any) {
      if (dnsErr.message.includes("SSRF blocked")) throw dnsErr;
      throw new Error(`DNS resolution failed for ${parsed.hostname}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let res: Response;
      try {
        res = await fetch(currentUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
          redirect: "manual",
        });
      } catch (fetchErr: any) {
        if (currentUrl.startsWith("https://")) {
          const httpFallback = currentUrl.replace(/^https:\/\//i, "http://");
          res = await fetch(httpFallback, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
            },
            redirect: "manual",
          });
        } else {
          throw fetchErr;
        }
      }
      clearTimeout(timeout);

      // Handle Redirects
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        const nextLoc = new URL(res.headers.get("location")!, currentUrl).toString();
        currentUrl = nextLoc;
        redirects++;
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const text = await res.text();
      if (text.length > maxBytes) {
        return text.slice(0, maxBytes);
      }
      return text;
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  throw new Error("Too many redirects");
}
