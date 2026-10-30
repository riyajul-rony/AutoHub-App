export interface ParsedSearchLine {
  original: string;
  niche: string;
  location: string;
  normalizedLocation: string;
  isValid: boolean;
  error?: string;
}

export interface ParseResult {
  lines: ParsedSearchLine[];
  validCount: number;
  totalCount: number;
  hasErrors: boolean;
  error?: string;
}

export const US_STATE_MAP: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

/**
 * Normalizes a location string:
 * - Bare US state code e.g. "TX" -> "Texas, USA"
 * - Trailing state abbreviation e.g. "Austin, TX" -> "Austin, Texas, USA"
 * - Otherwise passes the location as typed
 */
export function normalizeLocation(loc: string): string {
  const trimmed = loc.trim();
  const upper = trimmed.toUpperCase();

  // 1. Bare US state code
  if (US_STATE_MAP[upper]) {
    return `${US_STATE_MAP[upper]}, USA`;
  }

  // 2. City, State format e.g. "Austin, TX" or "Dallas, TX"
  const commaStateMatch = trimmed.match(/^(.+?)[,\s]+([A-Za-z]{2})$/);
  if (commaStateMatch) {
    const city = commaStateMatch[1].trim();
    const st = commaStateMatch[2].toUpperCase();
    if (US_STATE_MAP[st]) {
      return `${city}, ${US_STATE_MAP[st]}, USA`;
    }
  }

  return trimmed;
}

/**
 * Parses multi-line textarea input (up to 5 lines).
 * Format: niche, location (also accepts niche | location)
 * Trims whitespace, drops blank lines, deduplicates case-insensitively.
 */
export function parseMultiLineSearch(text: string, maxLines = 5): ParseResult {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    return {
      lines: [],
      validCount: 0,
      totalCount: 0,
      hasErrors: false,
    };
  }

  const seen = new Set<string>();
  const parsedLines: ParsedSearchLine[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const lowerKey = raw.toLowerCase();

    // Deduplicate case-insensitively
    if (seen.has(lowerKey)) {
      continue;
    }
    seen.add(lowerKey);

    // Split on first comma or pipe
    let niche = "";
    let location = "";

    const commaIdx = raw.indexOf(",");
    const pipeIdx = raw.indexOf("|");

    if (commaIdx !== -1 && (pipeIdx === -1 || commaIdx < pipeIdx)) {
      niche = raw.slice(0, commaIdx).trim();
      location = raw.slice(commaIdx + 1).trim();
    } else if (pipeIdx !== -1) {
      niche = raw.slice(0, pipeIdx).trim();
      location = raw.slice(pipeIdx + 1).trim();
    } else {
      parsedLines.push({
        original: raw,
        niche: raw,
        location: "",
        normalizedLocation: "",
        isValid: false,
        error: "Missing location (format: niche, location)",
      });
      continue;
    }

    if (!niche) {
      parsedLines.push({
        original: raw,
        niche: "",
        location,
        normalizedLocation: normalizeLocation(location),
        isValid: false,
        error: "Niche / keyword is required",
      });
      continue;
    }

    if (!location) {
      parsedLines.push({
        original: raw,
        niche,
        location: "",
        normalizedLocation: "",
        isValid: false,
        error: "Location is required",
      });
      continue;
    }

    const normalizedLocation = normalizeLocation(location);

    parsedLines.push({
      original: raw,
      niche,
      location,
      normalizedLocation,
      isValid: true,
    });
  }

  // Check if exceeds maximum allowed lines
  let exceedsMax = false;
  let generalError: string | undefined;

  if (parsedLines.length > maxLines) {
    exceedsMax = true;
    generalError = `Maximum ${maxLines} lines allowed. You provided ${parsedLines.length} lines.`;
  }

  const hasLineErrors = parsedLines.some((l) => !l.isValid);
  const validCount = parsedLines.filter((l) => l.isValid).length;

  return {
    lines: parsedLines,
    validCount,
    totalCount: parsedLines.length,
    hasErrors: hasLineErrors || exceedsMax,
    error: generalError,
  };
}

/**
 * Convenience helper that parses multi-line Google Maps searches
 */
export function parseGoogleMapsLines(text: string, maxLines = 5): {
  validLines: Array<{ niche: string; location: string }>;
  errors: Array<{ line: string; error: string }>;
  totalLines: number;
} {
  const result = parseMultiLineSearch(text, maxLines);
  const validLines = result.lines
    .filter((l) => l.isValid)
    .map((l) => ({ niche: l.niche, location: l.normalizedLocation }));
  const errors = result.lines
    .filter((l) => !l.isValid)
    .map((l) => ({ line: l.original, error: l.error || "Invalid format" }));
  if (result.error) {
    errors.push({ line: "", error: result.error });
  }
  return { validLines, errors, totalLines: result.totalCount };
}

