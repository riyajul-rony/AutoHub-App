import dns from "node:dns/promises";
import { logger } from "@/server/logger";

export interface DnsHealthResult {
  domain: string;
  hasMx: boolean;
  spf: {
    status: "valid" | "missing" | "neutral";
    record?: string;
    message: string;
  };
  dmarc: {
    status: "valid" | "missing" | "neutral";
    record?: string;
    message: string;
  };
  overallHealthy: boolean;
  checkedAt: string;
}

/**
 * Checks DNS records (SPF & DMARC) for a business sending domain.
 * Provides plain-English recommendations to help non-technical users
 * ensure cold email deliverability.
 */
export async function checkDomainDnsHealth(domainInput: string): Promise<DnsHealthResult> {
  const cleanDomain = domainInput
    .toLowerCase()
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .trim();

  const nowIso = new Date().toISOString();

  if (!cleanDomain || !cleanDomain.includes(".")) {
    return {
      domain: cleanDomain,
      hasMx: false,
      spf: { status: "missing", message: "Invalid domain name provided." },
      dmarc: { status: "missing", message: "Invalid domain name provided." },
      overallHealthy: false,
      checkedAt: nowIso,
    };
  }

  // Common free consumer domains - skip strict checks because provider manages SPF/DKIM
  const isPublicProvider = [
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "icloud.com",
    "zoho.com",
    "mail.com",
  ].includes(cleanDomain);

  if (isPublicProvider) {
    return {
      domain: cleanDomain,
      hasMx: true,
      spf: {
        status: "valid",
        message: `${cleanDomain} is a hosted webmail provider. SPF/DKIM are managed directly by the provider.`,
      },
      dmarc: {
        status: "valid",
        message: `${cleanDomain} DMARC policy is managed by the provider.`,
      },
      overallHealthy: true,
      checkedAt: nowIso,
    };
  }

  let hasMx = false;
  let spfResult: { status: "valid" | "missing" | "neutral"; record?: string; message: string } = {
    status: "missing",
    message: "No SPF record found. Emails sent from this domain may land in spam folders.",
  };
  let dmarcResult: { status: "valid" | "missing" | "neutral"; record?: string; message: string } = {
    status: "missing",
    message: "No DMARC record found. Adding a DMARC policy greatly improves inbox deliverability.",
  };

  const withTimeout = async <T>(promise: Promise<T>, ms = 2000): Promise<T | null> => {
    return Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  };

  try {
    // 1. Check MX records
    try {
      const mx = await withTimeout(dns.resolveMx(cleanDomain), 2000);
      hasMx = Array.isArray(mx) && mx.length > 0;
    } catch {
      hasMx = false;
    }

    // 2. Check SPF (TXT records on root domain)
    try {
      const txtRecords = await withTimeout(dns.resolveTxt(cleanDomain), 2000);
      if (Array.isArray(txtRecords)) {
        const flattened = txtRecords.map((chunk) => chunk.join(""));
        const spfRecord = flattened.find((r) => r.toLowerCase().startsWith("v=spf1"));

        if (spfRecord) {
          spfResult = {
            status: "valid",
            record: spfRecord,
            message: "SPF record is configured correctly for this domain.",
          };
        }
      }
    } catch (err: any) {
      logger.debug({ domain: cleanDomain, err: err.message }, "SPF lookup encountered DNS error");
    }

    // 3. Check DMARC (TXT records on _dmarc.domain)
    try {
      const dmarcRecords = await withTimeout(dns.resolveTxt(`_dmarc.${cleanDomain}`), 2000);
      if (Array.isArray(dmarcRecords)) {
        const flattenedDmarc = dmarcRecords.map((chunk) => chunk.join(""));
        const dmarcRecord = flattenedDmarc.find((r) => r.toLowerCase().startsWith("v=dmarc1"));

        if (dmarcRecord) {
          dmarcResult = {
            status: "valid",
            record: dmarcRecord,
            message: "DMARC record is active, protecting your domain reputation.",
          };
        }
      }
    } catch (err: any) {
      logger.debug({ domain: cleanDomain, err: err.message }, "DMARC lookup encountered DNS error");
    }
  } catch (outerErr: any) {
    logger.warn({ domain: cleanDomain, err: outerErr.message }, "DNS health check encountered unexpected error");
  }

  const overallHealthy = spfResult.status === "valid" && dmarcResult.status === "valid";

  return {
    domain: cleanDomain,
    hasMx,
    spf: spfResult,
    dmarc: dmarcResult,
    overallHealthy,
    checkedAt: nowIso,
  };
}
