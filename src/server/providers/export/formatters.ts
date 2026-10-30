export type ExportLeadRow = {
  company_name: string;
  email?: string | null;
  email_type?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  rating?: string | number | null;
  reviews_count?: number | null;
  source?: string | null;
};

/**
 * Formats leads as TSV for direct clipboard copying that preserves column formatting in Excel & Google Sheets.
 */
export function formatTsv(rows: ExportLeadRow[]): string {
  const headers = ["Company", "Email", "Email Type", "Phone", "Website", "Rating", "Reviews", "Address", "City"];
  const lines: string[] = [headers.join("\t")];

  for (const r of rows) {
    const line = [
      r.company_name || "",
      r.email || "",
      r.email_type || "",
      r.phone || "",
      r.website || "",
      r.rating ? String(r.rating) : "",
      r.reviews_count ? String(r.reviews_count) : "",
      (r.address || "").replace(/[\t\n\r]/g, " "),
      r.city || "",
    ];
    lines.push(line.join("\t"));
  }

  return lines.join("\n");
}

/**
 * Generates RFC4180 compliant CSV string with UTF-8 BOM (\uFEFF) so Excel on Windows
 * displays international characters and symbols without corruption.
 */
export function formatCsvWithBom(rows: ExportLeadRow[]): string {
  const headers = ["Company", "Email", "Email Type", "Phone", "Website", "Rating", "Reviews", "Address", "City"];

  function escapeCsvCell(val: any): string {
    if (val === null || val === undefined) return '""';
    const s = String(val);
    if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return `"${s}"`;
  }

  const lines: string[] = [headers.map(escapeCsvCell).join(",")];

  for (const r of rows) {
    const line = [
      escapeCsvCell(r.company_name),
      escapeCsvCell(r.email),
      escapeCsvCell(r.email_type),
      escapeCsvCell(r.phone),
      escapeCsvCell(r.website),
      escapeCsvCell(r.rating),
      escapeCsvCell(r.reviews_count),
      escapeCsvCell(r.address),
      escapeCsvCell(r.city),
    ];
    lines.push(line.join(","));
  }

  // Prepend UTF-8 Byte Order Mark
  return "\uFEFF" + lines.join("\r\n");
}
