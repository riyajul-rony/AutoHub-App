import crypto from "crypto";
import type { RawLead } from "./types";

/**
 * Normalizes company name by converting to lowercase, removing non-alphanumeric chars,
 * and normalizing internal spaces.
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "") // preserves unicode letters & numbers
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes the best available secondary identifier (website, phone, or address).
 */
export function normalizeIdentifier(options: {
  website?: string;
  phone?: string;
  address?: string;
}): string {
  if (options.website && options.website.trim() && options.website !== "—" && options.website !== "Not Available") {
    return options.website
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
  }

  if (options.phone && options.phone.trim()) {
    const digits = options.phone.replace(/\D/g, "");
    if (digits.length >= 7) {
      // Use last 10 digits for standardized phone matching
      return digits.slice(-10);
    }
  }

  if (options.address && options.address.trim() && options.address !== "Not Available") {
    return options.address
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  return "unknown_identifier";
}

/**
 * Computes deterministic SHA-256 hash for multi-tenant lead deduplication:
 * hash(user_id + company_name + (website || phone || address))
 */
export function computeLeadDedupeKey(
  userId: string,
  companyName: string,
  identifier: { website?: string; phone?: string; address?: string }
): string {
  const normCompany = normalizeCompanyName(companyName);
  const normId = normalizeIdentifier(identifier);
  const rawString = `${userId.toLowerCase().trim()}:${normCompany}:${normId}`;
  return crypto.createHash("sha256").update(rawString).digest("hex");
}

/**
 * Filters a list of raw leads against existing database dedupe keys
 * and removes internal duplicates within the current batch.
 */
export function filterDuplicateLeads(
  userId: string,
  leads: RawLead[],
  existingKeys: Set<string>
): {
  uniqueLeads: Array<{ lead: RawLead; dedupeKey: string }>;
  duplicateCount: number;
} {
  const seenKeys = new Set<string>(existingKeys);
  const uniqueLeads: Array<{ lead: RawLead; dedupeKey: string }> = [];
  let duplicateCount = 0;

  for (const lead of leads) {
    const dedupeKey = computeLeadDedupeKey(userId, lead.companyName, {
      website: lead.website,
      phone: lead.phoneE164 || lead.phoneRaw,
      address: lead.address || lead.city,
    });

    if (seenKeys.has(dedupeKey)) {
      duplicateCount++;
    } else {
      seenKeys.add(dedupeKey);
      uniqueLeads.push({ lead, dedupeKey });
    }
  }

  return {
    uniqueLeads,
    duplicateCount,
  };
}
