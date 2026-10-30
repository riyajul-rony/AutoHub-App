import { db } from "@/server/db";

export interface ColumnMapping {
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  company?: string;
  website?: string;
  job_title?: string;
  phone?: string;
}

export interface NormalizedRecipient {
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  website?: string;
  job_title?: string;
  phone?: string;
  lead_id?: string;
  vars?: Record<string, any>;
}

export interface PreviewItem {
  email: string;
  name: string;
  company: string;
  website: string;
  status: "ready" | "duplicate" | "suppressed" | "invalid_syntax";
  reason?: string;
}

export interface ImportValidationResult {
  summary: {
    total: number;
    valid: number;
    duplicates: number;
    suppressed: number;
    invalidSyntax: number;
  };
  validRecipients: NormalizedRecipient[];
  preview: PreviewItem[];
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Normalizes email by trimming, converting to lower case, and removing surrounding quotes/brackets.
 */
export function normalizeEmail(raw: any): string {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim().toLowerCase();
  clean = clean.replace(/^[<"']+|[>"']+$/g, "");
  return clean;
}

/**
 * Helper to split a full name into first and last name.
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Validates, deduplicates, and filters a batch of imported records against the user's suppression list.
 */
export async function validateAndNormalizeRecipients(
  userId: string,
  rawRows: Array<Record<string, any>>,
  mapping: ColumnMapping
): Promise<ImportValidationResult> {
  const summary = {
    total: rawRows.length,
    valid: 0,
    duplicates: 0,
    suppressed: 0,
    invalidSyntax: 0,
  };

  const validRecipients: NormalizedRecipient[] = [];
  const preview: PreviewItem[] = [];

  // Pass 1: Parse fields and check syntax
  const candidates: Array<{
    cleanEmail: string;
    recipient: NormalizedRecipient;
    isValidSyntax: boolean;
    originalRow: Record<string, any>;
  }> = [];

  const rawCandidateEmails: string[] = [];

  for (const row of rawRows) {
    const rawEmail = row[mapping.email] ?? "";
    const cleanEmail = normalizeEmail(rawEmail);

    let firstName = mapping.first_name ? String(row[mapping.first_name] || "").trim() : "";
    let lastName = mapping.last_name ? String(row[mapping.last_name] || "").trim() : "";

    if (!firstName && mapping.full_name && row[mapping.full_name]) {
      const split = splitFullName(String(row[mapping.full_name]));
      firstName = split.firstName;
      lastName = split.lastName;
    }

    const displayName = [firstName, lastName].filter(Boolean).join(" ") || firstName || "";
    const company = mapping.company ? String(row[mapping.company] || "").trim() : "";
    const website = mapping.website ? String(row[mapping.website] || "").trim() : "";
    const jobTitle = mapping.job_title ? String(row[mapping.job_title] || "").trim() : "";
    const phone = mapping.phone ? String(row[mapping.phone] || "").trim() : "";
    const leadId = row.id || row.lead_id || undefined;

    // Collect custom variable attributes (any other fields)
    const vars: Record<string, any> = {};
    const mappedValues = new Set(Object.values(mapping).filter(Boolean));
    for (const [k, v] of Object.entries(row)) {
      if (!mappedValues.has(k) && typeof v === "string" && v.length < 200) {
        vars[k] = v;
      }
    }

    const isValidSyntax = cleanEmail.length > 5 && EMAIL_REGEX.test(cleanEmail);

    if (isValidSyntax) {
      rawCandidateEmails.push(cleanEmail);
    }

    candidates.push({
      cleanEmail,
      recipient: {
        email: cleanEmail,
        name: displayName,
        first_name: firstName,
        last_name: lastName,
        company,
        website,
        job_title: jobTitle,
        phone,
        lead_id: leadId,
        vars: Object.keys(vars).length > 0 ? vars : undefined,
      },
      isValidSyntax,
      originalRow: row,
    });
  }

  // Pass 2: Batch query suppression list for this user
  const uniqueCandidateEmails = Array.from(new Set(rawCandidateEmails));
  const suppressedSet = new Set<string>();

  if (uniqueCandidateEmails.length > 0) {
    try {
      const suppressedRows = await db.suppressions.findMany({
        where: {
          user_id: userId,
          email: { in: uniqueCandidateEmails },
        },
        select: { email: true },
      });
      for (const row of suppressedRows) {
        suppressedSet.add(row.email.toLowerCase().trim());
      }
    } catch {
      // Offline fallback safe
    }
  }

  // Pass 3: Deduplicate and build final lists
  const seenEmails = new Set<string>();

  for (const item of candidates) {
    const { cleanEmail, recipient, isValidSyntax } = item;

    if (!isValidSyntax) {
      summary.invalidSyntax++;
      if (preview.length < 20) {
        preview.push({
          email: cleanEmail || "(Empty Email)",
          name: recipient.name || "",
          company: recipient.company || "",
          website: recipient.website || "",
          status: "invalid_syntax",
          reason: cleanEmail ? "Invalid email syntax" : "Missing email address",
        });
      }
      continue;
    }

    if (suppressedSet.has(cleanEmail)) {
      summary.suppressed++;
      if (preview.length < 20) {
        preview.push({
          email: cleanEmail,
          name: recipient.name || "",
          company: recipient.company || "",
          website: recipient.website || "",
          status: "suppressed",
          reason: "Previously unsubscribed / suppressed",
        });
      }
      continue;
    }

    if (seenEmails.has(cleanEmail)) {
      summary.duplicates++;
      if (preview.length < 20) {
        preview.push({
          email: cleanEmail,
          name: recipient.name || "",
          company: recipient.company || "",
          website: recipient.website || "",
          status: "duplicate",
          reason: "Duplicate email in source",
        });
      }
      continue;
    }

    seenEmails.add(cleanEmail);
    summary.valid++;
    validRecipients.push(recipient);

    if (preview.length < 20) {
      preview.push({
        email: cleanEmail,
        name: recipient.name || "",
        company: recipient.company || "",
        website: recipient.website || "",
        status: "ready",
      });
    }
  }

  return {
    summary,
    validRecipients,
    preview,
  };
}
