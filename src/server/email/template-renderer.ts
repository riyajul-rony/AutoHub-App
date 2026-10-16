/**
 * High-performance, zero-dependency email variable template renderer.
 * Optimized for lightweight VPS (1 vCPU, 4GB RAM).
 */

export interface RenderVariables {
  [key: string]: string | number | undefined | null;
}

export function renderEmailTemplate(
  template: string,
  vars: RenderVariables,
  unsubscribeUrl?: string
): string {
  if (!template) return "";

  // Replace {{unsubscribe_url}} if present
  let result = template.replace(/\{\{\s*unsubscribe_url\s*\}\}/gi, unsubscribeUrl || "#");

  // Replace {{key|fallback}} or {{key}}
  result = result.replace(/\{\{\s*([a-zA-Z0-9_-]+)(?:\|([^}]+))?\s*\}\}/g, (_, key, fallback) => {
    const trimmedKey = key.trim();
    const val = vars[trimmedKey];

    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val);
    }

    return fallback !== undefined ? fallback : "";
  });

  return result;
}

/**
 * Extracts all unique variable placeholders found in a template string.
 */
export function extractTemplateVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{\s*([a-zA-Z0-9_-]+)(?:\|[^}]+)?\s*\}\}/g);
  const keys = new Set<string>();
  for (const match of matches) {
    if (match[1] && match[1] !== "unsubscribe_url") {
      keys.add(match[1]);
    }
  }
  return Array.from(keys);
}
