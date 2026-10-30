/**
 * Universal export formatters and utilities for Lead Reach AI Leads
 * Supports RFC-4180 CSV with UTF-8 BOM, plain TSV, and rich HTML clipboard tables.
 */

export const STANDARD_EXPORT_HEADERS = [
  // 1-10 Company Info
  "Company Name",
  "Company Emails",
  "Company Phones",
  "Company Website",
  "Company Facebook",
  "Company Instagram",
  "Company LinkedIn",
  "Company TikTok",
  "Company YouTube",
  "Company Location",
  // 11-14 Founder Info
  "Founder Name",
  "Founder Emails",
  "Founder Phones",
  "Founder Socials",
  // 15-18 Manager Info
  "Manager Name",
  "Manager Emails",
  "Manager Phones",
  "Manager Socials",
  // 19-25 Source Intelligence
  "Source",
  "Rating",
  "Reviews Count",
  "Active Ads Count",
  "Ad Library URL",
  "Company Size",
  "Decision Makers",
];

export function cleanFieldValue(val: any): string {
  if (Array.isArray(val)) {
    if (val.length === 0) return "Not Available";
    const cleaned = val
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          // Format decision maker object
          if (item.name && item.title) {
            return `${item.name} (${item.title})${item.profileUrl ? ` - ${item.profileUrl}` : ""}`;
          }
          return JSON.stringify(item);
        }
        return String(item).replace(/^\+/, "").trim();
      })
      .filter((item) => item && item !== "Not Available" && item !== "—");
    return cleaned.length > 0 ? cleaned.join("; ") : "Not Available";
  }

  if (val === null || val === undefined || String(val).trim() === "" || String(val).trim() === "#ERROR!" || String(val).trim() === "—") {
    return "Not Available";
  }

  return String(val).replace(/^\+/, "").trim();
}

/**
 * Escapes a cell according to RFC-4180 standards
 */
export function escapeCsvField(val: any): string {
  const text = cleanFieldValue(val);
  if (text === "Not Available") return '""';

  // If text contains quotes, commas, or newlines, quote and escape quotes
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return `"${text}"`;
}

/**
 * Generates RFC-4180 compliant CSV string with UTF-8 BOM (\uFEFF)
 */
export function generateCsvContent(
  headers: string[],
  rows: (string | number | undefined | null)[][]
): string {
  const headerLine = headers.map((h) => escapeCsvField(h)).join(",");
  const rowLines = rows.map((row) => row.map((cell) => escapeCsvField(cell)).join(","));
  // \uFEFF ensures Excel automatically recognizes UTF-8 encoding across all locales
  return "\uFEFF" + [headerLine, ...rowLines].join("\r\n");
}

/**
 * Generates tab-separated text for clipboard copy
 */
export function generateTsvContent(
  headers: string[],
  rows: (string | number | undefined | null)[][]
): string {
  const cleanCell = (v: any) => cleanFieldValue(v).replace(/[\t\r\n]+/g, " ").trim();
  const headerLine = headers.map(cleanCell).join("\t");
  const rowLines = rows.map((row) => row.map(cleanCell).join("\t"));
  return [headerLine, ...rowLines].join("\r\n");
}

/**
 * Generates rich HTML table for direct copy-pasting into Google Sheets, Notion, or Airtable
 */
export function generateHtmlTableContent(
  headers: string[],
  rows: (string | number | undefined | null)[][]
): string {
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const thElements = headers
    .map(
      (h) =>
        `<th style="padding:8px 12px;background:#1e293b;color:#ffffff;font-weight:bold;border:1px solid #cbd5e1;font-size:12px;">${escapeHtml(
          h
        )}</th>`
    )
    .join("");

  const trElements = rows
    .map((row) => {
      const tdElements = row
        .map(
          (c) =>
            `<td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:11px;color:#1e293b;">${escapeHtml(
              cleanFieldValue(c)
            )}</td>`
        )
        .join("");
      return `<tr>${tdElements}</tr>`;
    })
    .join("");

  return `<table><thead><tr>${thElements}</tr></thead><tbody>${trElements}</tbody></table>`;
}

/**
 * Formats a single lead object into an array of values matching STANDARD_EXPORT_HEADERS
 */
export function formatLeadRowForExport(l: any): (string | number | undefined | null)[] {
  const dms = l.decision_makers?.length
    ? l.decision_makers
    : l.extra?.decision_makers?.length
    ? l.extra.decision_makers
    : [];

  const formattedDms = dms
    .map((dm: any) => `${dm.name} (${dm.title})${dm.profileUrl ? ` - ${dm.profileUrl}` : ""}`)
    .join("; ");

  return [
    // 1-10 Company Info
    l.company_name || l.companyName,
    l.company_emails || (l.email ? [l.email] : []),
    l.company_phones || (l.phone ? [l.phone] : []),
    l.company_website || l.website,
    l.company_facebook || l.facebook_url,
    l.company_instagram || l.instagram_url,
    l.company_linkedin || l.linkedin_url,
    l.company_tiktok,
    l.company_youtube,
    l.company_location || l.address || l.city,
    // 11-14 Founder Info
    l.founder_name || l.extra?.founder_name,
    l.founder_emails || (l.extra?.founder_email ? [l.extra.founder_email] : []),
    l.founder_phones || l.extra?.founder_phones || [],
    l.founder_socials || l.extra?.founder_socials || [],
    // 15-18 Manager Info
    l.manager_name || l.extra?.manager_name,
    l.manager_emails || (l.extra?.manager_email ? [l.extra.manager_email] : []),
    l.manager_phones || l.extra?.manager_phones || [],
    l.manager_socials || l.extra?.manager_socials || [],
    // 19-25 Source Intelligence
    l.source || l.extra?.source || "lead",
    l.rating || l.extra?.rating,
    l.reviews_count || l.extra?.reviews_count,
    l.ad_count || l.extra?.ad_count,
    l.ad_library_url || l.extra?.ad_library_url,
    l.company_size || l.extra?.company_size,
    formattedDms || undefined,
  ];
}
