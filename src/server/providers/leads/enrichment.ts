import * as cheerio from "cheerio";
import { safeFetch } from "../../net/safe-fetch";
import parsePhoneNumber from "libphonenumber-js";
import { promises as dnsPromises } from "dns";
import * as https from "https";

export type ComprehensiveLeadRecord = {
  // Company Level
  company_name: string;
  company_emails: string[];
  company_phones: string[];
  company_website: string;
  company_facebook?: string;
  company_instagram?: string;
  company_linkedin?: string;
  company_twitter?: string;
  company_tiktok?: string;
  company_youtube?: string;
  company_location: string;

  // Founder Level
  founder_name?: string;
  founder_emails: string[];
  founder_phones: string[];
  founder_socials: string[]; // LinkedIn, X/Twitter, etc.

  // Manager Level
  manager_name?: string;
  manager_emails: string[];
  manager_phones: string[];
  manager_socials: string[];
};

export async function resolveOfficialWebsite(companyName: string, country = ""): Promise<string | undefined> {
  const clean = companyName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;

  const slugs = [
    words.slice(0, 3).join(""),
    words.slice(0, 2).join(""),
  ].filter((s, idx, arr) => s.length >= 3 && s.length <= 30 && arr.indexOf(s) === idx);

  const countryTlds: string[] = [];
  const lowerCountry = country.toLowerCase();
  if (lowerCountry.includes("united kingdom") || lowerCountry.includes("uk")) {
    countryTlds.push(".co.uk");
  } else if (lowerCountry.includes("bangladesh") || lowerCountry.includes("bd")) {
    countryTlds.push(".com.bd", ".bd");
  } else if (lowerCountry.includes("canada")) {
    countryTlds.push(".ca");
  } else if (lowerCountry.includes("australia")) {
    countryTlds.push(".com.au");
  }

  const allTlds = [".com", ...countryTlds, ".org", ".net"];

  const candidateDomains: string[] = [];
  for (const slug of slugs) {
    for (const tld of allTlds) {
      candidateDomains.push(`${slug}${tld}`);
    }
  }

  // Fast check top domains via DNS resolution
  for (const domain of candidateDomains.slice(0, 4)) {
    try {
      await dnsPromises.lookup(domain);
      return `https://${domain}`;
    } catch {
      // Continue to next candidate domain
    }
  }
  return undefined;
}

export async function resolveLeadershipViaKnowledge(companyName: string, location = ""): Promise<{
  founderName?: string;
  managerName?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
}> {
  const clean = (companyName || "").trim();
  if (!clean || clean.length < 3 || clean.toLowerCase() === "business") return {};

  let founderName: string | undefined;
  let managerName: string | undefined;
  let facebook: string | undefined;
  let instagram: string | undefined;
  let twitter: string | undefined;
  let website: string | undefined;

  // 0. Extract authentic Agent / Doctor / Realtor / Proprietor directly from business title
  // e.g. "State Farm Steven Hill, Agent" -> "Steven Hill"
  // e.g. "Virgil Sanders - State Farm Insurance Agent" -> "Virgil Sanders"
  // e.g. "Josette Utke Insurance Agent" -> "Josette Utke"
  const agentSuffixMatch = clean.match(/(?:State Farm|Allstate|Farmers|Keller Williams|RE\/MAX|Compass|Coldwell Banker)?\s*([A-Z][a-z]+\s+[A-Z][a-z]+),\s*(?:Agent|Realtor|Broker|Owner|Principal)\b/i);
  if (agentSuffixMatch && agentSuffixMatch[1]) {
    founderName = agentSuffixMatch[1].trim();
  }
  if (!founderName) {
    const hyphenAgentMatch = clean.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[-–]\s*(?:State Farm|Allstate|Farmers)?\s*(?:Insurance Agent|Real Estate Agent|Agent|Agency|Realtor)/i);
    if (hyphenAgentMatch && hyphenAgentMatch[1]) {
      founderName = hyphenAgentMatch[1].trim();
    }
  }
  if (!founderName) {
    const insuranceAgentMatch = clean.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:Insurance Agent|Real Estate Agent|Realtor|Agency)\b/i);
    if (insuranceAgentMatch && insuranceAgentMatch[1]) {
      founderName = insuranceAgentMatch[1].trim();
    }
  }

  // 1. Direct doctor or owner name in business title
  if (!founderName) {
    const drMatch = clean.match(/\b(Dr\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i);
    if (drMatch) {
      founderName = drMatch[1].trim();
    }
  }

  // "Smith & Associates", "David & Co", "John's Clinic"
  if (!founderName) {
    const possessiveMatch = clean.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:'s|’s)\s+/i);
    if (possessiveMatch && possessiveMatch[1].length > 2 && !["the", "our", "all", "best"].includes(possessiveMatch[1].toLowerCase())) {
      founderName = possessiveMatch[1].trim();
    }
  }

  return { founderName, managerName, facebook, instagram, twitter, website };
}



export function formatSocialUrl(u?: string, platform?: "facebook" | "instagram" | "linkedin" | "tiktok" | "youtube" | "twitter"): string | undefined {
  if (!u) return undefined;
  let clean = u.trim();
  if (clean.startsWith("//")) clean = `https:${clean}`;

  // If passed a bare username / slug (e.g. "tavernonreade" or "@varietycoffee")
  if (!clean.includes("/") && !clean.includes(".")) {
    const slug = clean.replace(/^@/, "").trim();
    if (slug.length >= 2) {
      if (platform === "facebook") return `https://www.facebook.com/${slug}`;
      if (platform === "instagram") return `https://www.instagram.com/${slug}/`;
      if (platform === "linkedin") return `https://www.linkedin.com/company/${slug}`;
      if (platform === "twitter") return `https://twitter.com/${slug}`;
      if (platform === "tiktok") return `https://www.tiktok.com/@${slug}`;
      if (platform === "youtube") return `https://www.youtube.com/@${slug}`;
    }
    return undefined;
  }

  if (!clean.startsWith("http")) clean = `https://${clean}`;

  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.toLowerCase();

    // Strip tracking & analytics params
    const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "igsh", "ref", "ref_src"];
    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }

    if (host.includes("facebook.com")) {
      const path = parsed.pathname.toLowerCase().replace(/\/+$/, "");
      if (path === "/profile.php") {
        const id = parsed.searchParams.get("id");
        if (!id) return undefined;
        return `${parsed.origin}/profile.php?id=${encodeURIComponent(id)}`;
      }
      if (
        !path ||
        path === "/" ||
        path === "/2008" ||
        path.startsWith("/2008/") ||
        path === "/tr" ||
        path.startsWith("/tr/") ||
        path.includes("sharer") ||
        path.includes("share") ||
        path.includes("dialog") ||
        path.includes("login") ||
        path.includes("plugins") ||
        path.includes("intent") ||
        path.includes("policy") ||
        path.includes("legal") ||
        path.includes("help")
      ) {
        return undefined;
      }
      return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
    }

    if (host.includes("instagram.com")) {
      const path = parsed.pathname.toLowerCase().replace(/\/+$/, "");
      if (
        !path ||
        path === "/" ||
        path.includes("/p/") ||
        path.includes("/stories/") ||
        path.includes("/explore/") ||
        path.includes("/reels/") ||
        path.includes("/accounts/") ||
        path.includes("/legal/") ||
        path.includes("/about/")
      ) {
        return undefined;
      }
      return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}/`;
    }

    if (host.includes("linkedin.com")) {
      const path = parsed.pathname.toLowerCase().replace(/\/+$/, "");
      if (
        !path ||
        path === "/" ||
        path.includes("sharearticle") ||
        path.includes("sharing") ||
        path.includes("/search/") ||
        path.includes("/feed/") ||
        path.includes("/pulse/") ||
        path.includes("/legal/")
      ) {
        return undefined;
      }
      return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
    }

    if (host.includes("tiktok.com")) {
      const path = parsed.pathname.toLowerCase().replace(/\/+$/, "");
      if (!path || path === "/" || path.includes("share") || path.includes("embed") || path.includes("/tag/") || path.includes("/music/")) return undefined;
      return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
    }

    if (host.includes("youtube.com")) {
      const path = parsed.pathname.toLowerCase().replace(/\/+$/, "");
      if (!path || path === "/" || path.includes("share") || path.includes("/watch") || path.includes("/embed") || path.includes("/playlist")) return undefined;
      return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
    }

    if (host.includes("twitter.com") || host.includes("x.com")) {
      const path = parsed.pathname.toLowerCase().replace(/\/+$/, "");
      if (!path || path === "/" || path.includes("intent") || path.includes("share")) return undefined;
      return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export function cleanExtractedEmail(raw: string): string | null {
  if (!raw || !raw.includes("@")) return null;
  let cleaned = raw.toLowerCase().trim().replace(/%20/g, "").replace(/\s+/g, "");

  // Strip leading non-alphanumeric
  cleaned = cleaned.replace(/^[^a-z0-9]+/, "");

  // Strip glued leading postal codes: e.g. "10518theborocafeandmarket" -> "theborocafeandmarket"
  cleaned = cleaned.replace(/^\d{4,6}([a-z])/i, "$1");

  // Fix glued trailing words stuck to common TLDs: .commade -> .com, .comcontact -> .com, .orgabout -> .org
  cleaned = cleaned.replace(/(\.(?:com|org|net|edu|gov|io|co|uk|us|biz|info|ca|de|fr|au|nl|bd|me|app))[a-z]{3,}$/i, "$1");

  if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,14}$/i.test(cleaned)) {
    return cleaned;
  }
  return null;
}

const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}\b/gi;
// Strict phone patterns for US/CA, UK, BD, and International formats
const STRICT_PHONE_REGEX = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}|(?:\+?880\s?|0)1[3-9]\d{8}|(?:\+?44|0)\s?(?:[1-9]\d{1,4})\s?\d{3,4}\s?\d{3,4}/g;

export function decodeCloudflareEmail(encoded: string): string | null {
  try {
    const k = parseInt(encoded.slice(0, 2), 16);
    let email = "";
    for (let i = 2; i < encoded.length; i += 2) {
      email += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ k);
    }
    if (email && email.includes("@")) {
      return cleanExtractedEmail(email);
    }
  } catch {}
  return null;
}

export async function discoverSocialsAndEmailViaWeb(
  companyName: string,
  location = "",
  domain = ""
): Promise<{
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  email?: string;
  phone?: string;
  founderName?: string;
}> {
  if (!companyName || companyName === "Business") return {};
  const cleanName = companyName.replace(/["']/g, "").trim();
  const cleanLoc = location.split(",")[0].trim();

  const query = `"${cleanName}" ${cleanLoc} (facebook OR instagram OR linkedin OR email OR phone)`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(1200),
    });
    if (!res.ok) return {};
    const html = await res.text();
    const $ = cheerio.load(html);

    let fb: string | undefined;
    let ig: string | undefined;
    let li: string | undefined;
    let yt: string | undefined;
    let email: string | undefined;
    let phone: string | undefined;
    let founderName: string | undefined;

    $(".result").each((_, el) => {
      const href = $(el).find(".result__url").attr("href") || $(el).find(".result__title a").attr("href") || "";
      const snippet = $(el).find(".result__snippet").text() || "";
      const title = $(el).find(".result__title").text() || "";

      let actual = href;
      if (href.includes("uddg=")) {
        const m = href.match(/uddg=([^&]+)/);
        if (m) actual = decodeURIComponent(m[1]);
      }
      if (!actual) return;

      const lower = actual.toLowerCase();
      if (!fb && lower.includes("facebook.com/") && !lower.includes("sharer") && !lower.includes("/share/")) {
        fb = formatSocialUrl(actual, "facebook");
      }
      if (!ig && lower.includes("instagram.com/") && !lower.includes("/p/") && !lower.includes("/reels/")) {
        ig = formatSocialUrl(actual, "instagram");
      }
      if (!li && lower.includes("linkedin.com/")) {
        li = formatSocialUrl(actual, "linkedin");
      }
      if (!yt && lower.includes("youtube.com/")) {
        yt = formatSocialUrl(actual, "youtube");
      }

      if (!email && domain) {
        const matches = `${title} ${snippet}`.match(EMAIL_REGEX) || [];
        for (const m of matches) {
          const clean = cleanExtractedEmail(m);
          if (clean && clean.includes(domain)) {
            email = clean;
            break;
          }
        }
      }

      if (!phone) {
        const phMatches = `${title} ${snippet}`.match(STRICT_PHONE_REGEX);
        if (phMatches && phMatches[0]) {
          phone = phMatches[0].trim();
        }
      }

      if (!founderName) {
        const drMatch = `${title} ${snippet}`.match(/\b(Dr\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
        if (drMatch) founderName = drMatch[1].trim();
      }
    });

    return { facebook: fb, instagram: ig, linkedin: li, youtube: yt, email, phone, founderName };
  } catch {
    return {};
  }
}

export async function resolveLeadershipViaWebSearch(
  companyName: string,
  location = "",
  _domain = ""
): Promise<{ founderName?: string; founderSocials?: string[]; managerName?: string; managerSocials?: string[] } | null> {
  if (!companyName || companyName === "Business") return null;
  const cleanName = companyName.replace(/["']/g, "").trim();
  const cleanLoc = location.split(",")[0].trim();

  const query = `"${cleanName}" ${cleanLoc} (founder OR owner OR "dr." OR "practice manager") site:linkedin.com/in`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(1200),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    let foundFounder: string | undefined;
    const founderSocials: string[] = [];

    $(".result").each((_, el) => {
      const title = $(el).find(".result__title").text() || "";
      const href = $(el).find(".result__url").attr("href") || $(el).find(".result__title a").attr("href") || "";
      let actual = href;
      if (href.includes("uddg=")) {
        const m = href.match(/uddg=([^&]+)/);
        if (m) actual = decodeURIComponent(m[1]);
      }

      if (actual.includes("linkedin.com/in/")) {
        const cleanSocial = formatSocialUrl(actual);
        if (cleanSocial) founderSocials.push(cleanSocial);

        const namePart = title.split(/[-–|]/)[0].trim();
        if (namePart && namePart.length >= 3 && namePart.length <= 35 && !foundFounder) {
          foundFounder = namePart;
        }
      }
    });

    if (foundFounder || founderSocials.length > 0) {
      return { founderName: foundFounder, founderSocials };
    }
    return null;
  } catch {
    return null;
  }
}

const FOUNDER_KEYWORDS = ["ceo", "founder", "owner", "president", "director", "managing", "md", "principal", "partner", "general manager", "gm", "proprietor", "curator", "creator", "chef"];
const MANAGER_KEYWORDS = ["manager", "operations", "lead", "head", "hr", "admin", "marketing", "business", "supervisor", "director", "branch", "practice"];

export function normalizePhone(rawPhone: string, defaultCountry: any = "BD"): { raw: string; e164?: string } {
  try {
    const parsed = parsePhoneNumber(rawPhone, defaultCountry);
    if (parsed && parsed.isValid()) {
      return { raw: rawPhone, e164: parsed.format("E.164") };
    }
  } catch {
    // Preserve raw string
  }
  return { raw: rawPhone };
}

export function categorizeEmail(email: string): "personal" | "role" | "generic" {
  const local = email.split("@")[0].toLowerCase();
  if (["info", "contact", "support", "sales"].some((k) => local.startsWith(k))) return "role";
  if (local === "team") return "generic";
  return "personal";
}



export type InitialCompanyData = {
  name?: string;
  location?: string;
  phone?: string;
  email?: string;
  operator?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
};

export const NON_PERSON_WORDS = new Set([
  "commitment", "mission", "vision", "story", "about", "history", "contact",
  "services", "service", "hours", "welcome", "info", "details", "updates", "news",
  "terms", "privacy", "menu", "events", "policy", "pricing", "careers",
  "jobs", "practice", "branch", "office", "team", "staff", "location",
  "purveyors", "order", "online", "market", "cafe", "clinic", "dental",
  "hospital", "care", "health", "center", "centre", "group", "agency",
  "search", "filter", "share", "follow", "subscribe", "newsletter", "cart",
  "checkout", "login", "register", "join", "help", "support", "faq",
  "discounts", "discount", "reasons", "reason", "additional", "resources", "resource",
  "coverage", "insurance", "benefits", "benefit", "solutions", "solution",
  "claims", "claim", "quotes", "quote", "options", "option", "features", "feature",
  "products", "product", "reviews", "review", "ratings", "rating", "questions",
  "answers", "locations", "cookies", "cookie", "copyright", "portal", "account",
  "overview", "explore", "learn", "read", "view", "click", "download", "schedule",
  "appointment", "consultation", "message", "send", "submit", "page", "next",
  "previous", "header", "footer", "banner", "hero", "modal", "card", "box", "item",
  "list", "table", "button", "link", "form", "input", "field", "media", "social",
  "customer", "client", "clients", "partners", "partner", "investors", "investor",
  "corporate", "commercial", "residential", "financial", "legal", "medical",
  "realty", "properties", "property", "estate", "agents", "brokerage",
  "enterprises", "holdings", "associates", "international", "global", "national",
  "state", "city", "county", "district", "street", "avenue", "road", "building",
  "north", "south", "east", "west", "you", "your", "our", "all", "get", "more", "most"
]);

export const sanitizeName = (raw: string): string => {
  let clean = raw.split(/[\r\n]/)[0];
  // Strip trailing professional degrees
  clean = clean.replace(/,?\s*(?:DDS|DMD|MD|DO|FAGD|MAGD|BDS|MS|PhD|FAACD)\b/gi, "");
  // Strip trailing role noise (e.g. "Elizabeth Riley Scheduling Coordinator", "Dr. Arvind Philomin Dr")
  clean = clean.replace(/\s+(?:Scheduling|Coordinator|Assistant|Receptionist|Office Manager|Practice Manager|Manager|Director|Lead|Dr\.?)\b/gi, "");
  return clean.replace(/\s+/g, " ").trim();
};

export const isValidPersonName = (raw: string): boolean => {
  const clean = sanitizeName(raw);
  if (clean.length < 3 || clean.length > 35) return false;
  if (!/^(?:Dr\.?\s+|Prof\.?\s+)?[A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15}){1,2}$/.test(clean)) return false;
  const words = clean.toLowerCase().replace(/^(?:dr|prof)\.?\s+/i, "").split(/\s+/);
  if (words.some((w) => NON_PERSON_WORDS.has(w))) return false;
  const stopWords = ["you", "your", "we", "our", "us", "they", "their", "it", "its", "all", "get", "has", "have", "for", "with", "from", "into", "over", "more", "most", "the", "and", "but", "not"];
  if (words.some((w) => stopWords.includes(w))) return false;
  return true;
};

/**
 * Deep website crawler that extracts the complete 18-attribute lead specification.
 */
export async function scrapeFullCompanyProfile(
  websiteUrl: string,
  initialCompany: InitialCompanyData = { name: "Company" }
): Promise<ComprehensiveLeadRecord> {
  const compEmails = new Set<string>();
  const founderEmails = new Set<string>();
  const founderSocials = new Set<string>();
  const managerEmails = new Set<string>();
  const managerSocials = new Set<string>();

  const phoneMap = new Map<string, string>(); // E164 -> Display format
  const founderPhonesMap = new Map<string, string>();
  const managerPhonesMap = new Map<string, string>();

  const normalizeAndAddPhone = (raw: string, targetMap: Map<string, string>) => {
    const clean = raw.trim();
    if (!clean || clean.length < 7 || clean.length > 25) return;
    if (clean.includes("2024") || clean.includes("2025") || clean.includes("2026")) return;
    try {
      const digitsOnly = clean.replace(/\D/g, "");
      const parsed = parsePhoneNumber(clean.startsWith("+") ? clean : (digitsOnly.length === 10 ? `+1${digitsOnly}` : `+${digitsOnly}`));
      if (parsed && parsed.isValid()) {
        const formatted = parsed.formatNational();
        targetMap.set(parsed.number, formatted);
        return;
      }
    } catch {}
    const digits = clean.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15 && !/^(.)\1+$/.test(digits)) {
      targetMap.set(digits, clean.replace(/^\+/, ""));
    }
  };

  // Seed with initial company data if available
  if (initialCompany?.phone) {
    normalizeAndAddPhone(initialCompany.phone, phoneMap);
  }
  if (initialCompany?.email && initialCompany.email.includes("@")) {
    compEmails.add(initialCompany.email.toLowerCase().trim());
  }

  let founderName: string | undefined = initialCompany?.operator;
  let managerName: string | undefined;

  let fbUrl: string | undefined = initialCompany?.facebook;
  let igUrl: string | undefined = initialCompany?.instagram;
  let liUrl: string | undefined = initialCompany?.linkedin;
  let twUrl: string | undefined = initialCompany?.twitter;
  let ttUrl: string | undefined = initialCompany?.tiktok;
  let ytUrl: string | undefined = initialCompany?.youtube;

  let base: string = "";
  let baseHostname: string = "";
  let validSite = false;

  // Auto-resolve website if not provided
  if (!websiteUrl || websiteUrl === "Not Available" || websiteUrl === "business.com" || !websiteUrl.startsWith("http")) {
    if (initialCompany.name && initialCompany.name !== "Business") {
      try {
        const resolved = await resolveOfficialWebsite(initialCompany.name, initialCompany.location || "");
        if (resolved) {
          websiteUrl = resolved;
        }
      } catch {}
    }
  }

  try {
    if (websiteUrl && websiteUrl !== "business.com" && websiteUrl !== "Not Available") {
      const parsed = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
      base = parsed.origin;
      baseHostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
      validSite = true;
    }
  } catch {
    validSite = false;
  }

  // Domain relevance filter for discovered emails
  const isEmailRelevant = (em: string): boolean => {
    const emLower = em.toLowerCase().trim();
    const emDomain = emLower.split("@")[1] || "";
    if (!emDomain || !emDomain.includes(".")) return false;
    if (emLower.match(/\.(png|jpg|jpeg|webp|svg|gif|js|css|ico|woff|ttf|mp4|webm)$/i)) return false;

    const junkDomains = [
      "wordpress.org",
      "wordpress.com",
      "wix.com",
      "wixpress.com",
      "squarespace.com",
      "sentry.io",
      "sentry-next.wixpress.com",
      "example.com",
      "domain.com",
      "schema.org",
      "duckduckgo.com",
      "cloudflare.com",
      "googleapis.com",
      "w3.org",
      "github.com",
      "gitlab.com",
      "gravatar.com",
      "google.com",
      "facebook.com",
      "instagram.com",
      "twitter.com",
      "linkedin.com",
      "youtube.com",
      "tiktok.com",
      "keen.io",
      "hubspot.com",
      "zendesk.com",
      "intercom.com",
      "mailchimp.com",
      "hotjar.com",
      "segment.io",
      "segment.com",
      "mixpanel.com",
      "datadoghq.com",
      "optimizely.com",
      "google-analytics.com",
      "doubleclick.net",
      "googletagmanager.com",
      "gstatic.com",
      "typekit.net",
      "shopify.com",
      "godaddy.com",
    ];
    if (junkDomains.some((d) => emDomain === d || emDomain.endsWith(`.${d}`))) return false;
    return true;
  };

  const htmlMap = new Map<string, string>();
  let aggregatedSiteText = "";

  if (validSite && base) {
    const homeTarget = websiteUrl.startsWith("http") ? websiteUrl : `${base}/`;

    const allowLoopback = process.env.NODE_ENV === "test";

    // 1. Fetch homepage first (fast 2.5s timeout)
    let homeHtml = "";
    try {
      homeHtml = await safeFetch(homeTarget, { timeoutMs: 2500, maxBytes: 512 * 1024, allowLoopback });
    } catch {}

    // Fallback: If deep subpage URL (e.g. store branch locator) failed with 404 or timeout,
    // fallback immediately to the root domain homepage!
    if (!homeHtml && homeTarget !== `${base}/` && homeTarget !== base) {
      try {
        homeHtml = await safeFetch(`${base}/`, { timeoutMs: 2500, maxBytes: 512 * 1024, allowLoopback });
        if (homeHtml) {
          websiteUrl = `${base}/`;
        }
      } catch {}
    }

    if (homeHtml) {
      htmlMap.set(homeTarget, homeHtml);

      // Deep Multi-Page Full-Site Discovery & Crawler:
      // Discovers all internal pages across navigation, header, footer, and body.
      const visitedUrls = new Set<string>([
        homeTarget,
        `${base}/`,
        base,
        homeTarget.replace(/\/+$/, ""),
      ]);

      const crawlQueue: Array<{ url: string; score: number }> = [];

      const isInternalUrl = (candUrl: string): boolean => {
        try {
          const parsedCand = new URL(candUrl, base);
          const candHost = parsedCand.hostname.toLowerCase().replace(/^www\./, "");
          return (
            parsedCand.origin === base ||
            candHost === baseHostname ||
            candHost.endsWith(`.${baseHostname}`)
          );
        } catch {
          return false;
        }
      };

      const isIgnoredAsset = (pathname: string): boolean => {
        return /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|pdf|zip|rar|tar|gz|mp4|webm|mp3|wav|woff|woff2|ttf|eot|xml|json|txt|exe|dmg|apk|doc|docx|xls|xlsx|ppt|pptx)$/i.test(pathname);
      };

      const extractInternalLinksFromHtml = (pageHtml: string, pageUrl: string) => {
        const $page = cheerio.load(pageHtml);
        $page("a[href]").each((_, el) => {
          const href = $page(el).attr("href")?.trim();
          const text = $page(el).text().toLowerCase().trim();
          if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("whatsapp:")) return;

          try {
            const abs = new URL(href, pageUrl).toString();
            const parsed = new URL(abs);
            const cleanUrl = `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");

            if (!isInternalUrl(abs) || isIgnoredAsset(parsed.pathname) || visitedUrls.has(cleanUrl)) {
              return;
            }

            visitedUrls.add(cleanUrl);

            const lowerHref = parsed.pathname.toLowerCase();
            let score = 35; // base score for any internal website page

            // Team / Doctors / Staff / Leadership / Key persons (Highest priority)
            if (
              /team|doctor|dentist|staff|provider|leadership|meet-the|founder|practitioner|physician|attorney|lawyer|bio|executives|board|management/i.test(lowerHref) ||
              /team|doctor|dentist|staff|our doctors|our dentists|providers|meet our|physician|attorneys|partners|leadership/i.test(text)
            ) {
              score = 100;
            }
            // Contact & Locations
            else if (
              /contact|contact-us|reach|location|locations|office|touch|find-us/i.test(lowerHref) ||
              /contact|reach us|get in touch|locations|find us|our office/i.test(text)
            ) {
              score = 90;
            }
            // About Us & Company Story
            else if (
              /about|about-us|story|who-we-are|practice|our-story|overview/i.test(lowerHref) ||
              /about|our story|the practice|who we are|company/i.test(text)
            ) {
              score = 80;
            }
            // Impressum / Imprint / Legal / Privacy / Compliance (Often holds registered email, CEO name, phone)
            else if (/impressum|imprint|legal|terms|privacy|compliance|disclaimer/i.test(lowerHref)) {
              score = 75;
            }
            // Services / Practice areas / Products / Solutions
            else if (/service|services|practice-area|areas-of-practice|treatment|solutions|specialties/i.test(lowerHref)) {
              score = 60;
            }
            // FAQ / Help / Info / Careers
            else if (/faq|help|info|careers|jobs|news|blog|press/i.test(lowerHref)) {
              score = 45;
            }

            crawlQueue.push({ url: abs, score });
          } catch {}
        });
      };

      // 1. Extract internal links from homepage
      extractInternalLinksFromHtml(homeHtml, homeTarget);

      // Probe standard high-priority paths if not already discovered
      const standardProbes = [
        "/contact",
        "/contact-us",
        "/about",
        "/about-us",
        "/team",
        "/our-team",
        "/staff",
        "/doctors",
        "/leadership",
        "/services",
        "/impressum",
      ];
      for (const probe of standardProbes) {
        const fullProbe = `${base}${probe}`;
        if (!visitedUrls.has(fullProbe)) {
          visitedUrls.add(fullProbe);
          crawlQueue.push({ url: fullProbe, score: 70 });
        }
      }

      // 2. Concurrently crawl discovered pages across the entire site
      const MAX_CRAWL_PAGES = 18;
      const BATCH_SIZE = 6;

      while (crawlQueue.length > 0 && htmlMap.size < MAX_CRAWL_PAGES) {
        crawlQueue.sort((a, b) => b.score - a.score);
        const batch = crawlQueue.splice(0, Math.min(BATCH_SIZE, MAX_CRAWL_PAGES - htmlMap.size));

        await Promise.all(
          batch.map(async ({ url: subUrl }) => {
            try {
              const subHtml = await safeFetch(subUrl, {
                timeoutMs: 2500,
                maxBytes: 384 * 1024,
                allowLoopback,
              });
              if (subHtml) {
                htmlMap.set(subUrl, subHtml);

                // Deep queueing: discover secondary internal links on subpages if crawl budget permits
                if (htmlMap.size + crawlQueue.length < MAX_CRAWL_PAGES * 1.5) {
                  extractInternalLinksFromHtml(subHtml, subUrl);
                }
              }
            } catch {}
          })
        );
      }
    }
  }

    // 3. Process all gathered pages for complete contact data
    for (const [, html] of htmlMap) {
      try {
        const pageEmails = new Set<string>();
        const $ = cheerio.load(html);

        // Decode Cloudflare email protections (attributes)
        $("[data-cfemail]").each((_, el) => {
          const enc = $(el).attr("data-cfemail");
          if (enc) {
            const dec = decodeCloudflareEmail(enc);
            if (dec && isEmailRelevant(dec)) pageEmails.add(dec);
          }
        });
        $('a[href*="/email-protection#"]').each((_, el) => {
          const href = $(el).attr("href") || "";
          const hash = href.split("#")[1];
          if (hash) {
            const dec = decodeCloudflareEmail(hash);
            if (dec && isEmailRelevant(dec)) pageEmails.add(dec);
          }
        });

        // Decode Cloudflare email protection in raw HTML strings
        const cfRegex = /\/email-protection#([a-fA-F0-9]{8,})/g;
        let cfMatch: RegExpExecArray | null;
        while ((cfMatch = cfRegex.exec(html)) !== null) {
          const dec = decodeCloudflareEmail(cfMatch[1]);
          if (dec && isEmailRelevant(dec)) pageEmails.add(dec);
        }

        // Meta tags for email and phone
        $('meta[property="business:contact_data:email"], meta[name="email"], meta[property="og:email"], meta[name="contact"]').each((_, el) => {
          const c = $(el).attr("content")?.trim().toLowerCase();
          if (c && isEmailRelevant(c)) pageEmails.add(c);
        });
        $('meta[property="business:contact_data:phone_number"], meta[name="phone"], meta[property="og:phone_number"]').each((_, el) => {
          const c = $(el).attr("content")?.trim();
          if (c) normalizeAndAddPhone(c, phoneMap);
        });

        // Form action & hidden inputs
        $('form[action^="mailto:"]').each((_, el) => {
          const act = $(el).attr("action")?.replace(/^mailto:/i, "").trim().toLowerCase();
          if (act && isEmailRelevant(act)) pageEmails.add(act);
        });
        $('input[type="hidden"]').each((_, el) => {
          const val = $(el).attr("value")?.trim();
          if (val && val.includes("@") && isEmailRelevant(val)) pageEmails.add(val.toLowerCase());
        });

        // Extract JSON-LD schema.org person / founder / contactPoint / sameAs if present
        $('script[type="application/ld+json"]').each((_, el) => {
          try {
            const jsonText = $(el).html() || "";
            const data = JSON.parse(jsonText);
            const checkPerson = (obj: any) => {
              if (!obj || typeof obj !== "object") return;

              // Extract official social profiles from sameAs
              const sameAs = Array.isArray(obj.sameAs) ? obj.sameAs : obj.sameAs ? [obj.sameAs] : [];
              for (const s of sameAs) {
                if (typeof s !== "string") continue;
                if (s.includes("facebook.com") && !fbUrl) fbUrl = formatSocialUrl(s, "facebook");
                if (s.includes("instagram.com") && !igUrl) igUrl = formatSocialUrl(s, "instagram");
                if (s.includes("linkedin.com") && !liUrl) liUrl = formatSocialUrl(s, "linkedin");
                if ((s.includes("twitter.com") || s.includes("x.com")) && !twUrl) twUrl = formatSocialUrl(s, "twitter");
                if (s.includes("tiktok.com") && !ttUrl) ttUrl = formatSocialUrl(s, "tiktok");
                if (s.includes("youtube.com") && !ytUrl) ytUrl = formatSocialUrl(s, "youtube");
              }

              if (typeof obj.email === "string" && isEmailRelevant(obj.email)) {
                pageEmails.add(obj.email.toLowerCase().trim());
              }
              if (typeof obj.telephone === "string") {
                normalizeAndAddPhone(obj.telephone, phoneMap);
              }

              // Founder in Schema
              if (obj.founder) {
                const f = typeof obj.founder === "string" ? obj.founder : obj.founder?.name;
                if (typeof f === "string" && f.length < 40 && !founderName) {
                  founderName = f.trim();
                }
              }

              const role = (obj.jobTitle || obj["@type"] || "").toLowerCase();
              const personName = typeof obj.name === "string" ? obj.name : undefined;
              if (personName && personName.length < 40 && !personName.toLowerCase().includes("hotel") && !personName.toLowerCase().includes("business")) {
                if (FOUNDER_KEYWORDS.some((k) => role.includes(k)) && !founderName) {
                  founderName = personName;
                  if (obj.telephone) normalizeAndAddPhone(obj.telephone, founderPhonesMap);
                  if (obj.email && isEmailRelevant(obj.email)) founderEmails.add(obj.email.toLowerCase().trim());
                } else if (MANAGER_KEYWORDS.some((k) => role.includes(k)) && !managerName) {
                  managerName = personName;
                  if (obj.telephone) normalizeAndAddPhone(obj.telephone, managerPhonesMap);
                  if (obj.email && isEmailRelevant(obj.email)) managerEmails.add(obj.email.toLowerCase().trim());
                }
              }
              if (Array.isArray(obj.contactPoint)) obj.contactPoint.forEach(checkPerson);
              if (obj.contactPoint && typeof obj.contactPoint === "object") checkPerson(obj.contactPoint);
              if (Array.isArray(obj.founder)) obj.founder.forEach(checkPerson);
              if (obj.founder && typeof obj.founder === "object") checkPerson(obj.founder);
              if (Array.isArray(obj.employee)) obj.employee.forEach(checkPerson);
              if (Array.isArray(obj.member)) obj.member.forEach(checkPerson);
            };
            if (Array.isArray(data)) data.forEach(checkPerson);
            else checkPerson(data);
          } catch {}
        });

        // Scan Next.js / Nuxt embedded state scripts for embedded contact emails
        $('script#__NEXT_DATA__, script:not([src])').each((_, el) => {
          const scriptText = $(el).html() || "";
          if (scriptText.length < 500000 && !scriptText.includes("google-analytics") && !scriptText.includes("gtag")) {
            const matches = scriptText.match(EMAIL_REGEX) || [];
            for (const m of matches) {
              const clean = m.toLowerCase().trim();
              if (isEmailRelevant(clean)) pageEmails.add(clean);
            }
          }
        });

        // Extract mailto links
        $('a[href^="mailto:"]').each((_, el) => {
          const href = $(el).attr("href") || "";
          try {
            const decodedHref = decodeURIComponent(href);
            const rawParts = decodedHref.replace(/^mailto:/i, "").split("?")[0].split(/[,;]/);
            for (const part of rawParts) {
              const em = cleanExtractedEmail(part);
              if (em && isEmailRelevant(em)) {
                pageEmails.add(em);
              }
            }
          } catch {}
        });

        // Strip non-content tags and guarantee whitespace between all elements so words never glue together
        $("script, style, svg, noscript, iframe, link, meta, select, option").remove();
        $("*").each((_, el) => {
          $(el).after(" ");
        });

        const bodyText = $("body").text();
        const unobfuscatedText = bodyText
          .replace(/&#64;|&commat;|&#x40;/gi, "@")
          .replace(/&#46;|&period;|&#x2E;/gi, ".")
          .replace(/\s*\[\s*at\s*\]\s*/gi, "@")
          .replace(/\s*\(\s*at\s*\)\s*/gi, "@")
          .replace(/\s*\{\s*at\s*\}\s*/gi, "@")
          .replace(/\s+at\s+/gi, "@")
          .replace(/\s*\[\s*dot\s*\]\s*/gi, ".")
          .replace(/\s*\(\s*dot\s*\)\s*/gi, ".")
          .replace(/\s*\{\s*dot\s*\}\s*/gi, ".")
          .replace(/\s+dot\s+/gi, ".");

        aggregatedSiteText += ` ${unobfuscatedText}`;

        const textEmails = unobfuscatedText.match(EMAIL_REGEX) || [];
        for (const raw of textEmails) {
          const em = cleanExtractedEmail(raw);
          if (em && isEmailRelevant(em)) {
            pageEmails.add(em);
          }
        }

        // Authentically Extract Founder / Executive Name if present on site
        if (!founderName) {
          const author = $('meta[name="author"]').attr("content");
          if (author && author.length < 40 && !author.toLowerCase().includes("wordpress")) {
            founderName = author.trim();
          }
        }

        // Universal Heading & Team-Card Person Name + Role Scanner (strict container classes)
        $("[class*='team'], [class*='staff'], [class*='bio'], [class*='author'], [class*='leader'], [class*='founder'], [class*='executive'], [class*='member'], [class*='person']").find("h1, h2, h3, h4, h5, [class*='title'], [class*='name'], strong, b").each((_, el) => {
          const rawText = $(el).text();
          if (isValidPersonName(rawText)) {
            const text = sanitizeName(rawText);
            const parentText = $(el).parent().text().replace(/\s+/g, " ");
            const nextText = $(el).next().text().replace(/\s+/g, " ");
            const prevText = $(el).prev().text().replace(/\s+/g, " ");
            const combinedContext = `${prevText} ${nextText} ${parentText}`.toLowerCase();
            const container = $(el).closest("div, section, article, li");

            if (FOUNDER_KEYWORDS.some((k) => combinedContext.includes(k)) && !founderName) {
              founderName = text;
              container.find('a[href^="tel:"]').each((_, t) => normalizeAndAddPhone($(t).attr("href")?.replace(/^tel:/i, "") || "", founderPhonesMap));
              container.find('a[href^="mailto:"]').each((_, m) => {
                const em = cleanExtractedEmail($(m).attr("href")?.replace(/^mailto:/i, "").split("?")[0] || "");
                if (em && isEmailRelevant(em)) founderEmails.add(em);
              });
              container.find('a[href*="linkedin.com/in/"]').each((_, l) => {
                const link = formatSocialUrl($(l).attr("href"));
                if (link) founderSocials.add(link);
              });
            } else if (MANAGER_KEYWORDS.some((k) => combinedContext.includes(k)) && !managerName) {
              managerName = text;
              container.find('a[href^="tel:"]').each((_, t) => normalizeAndAddPhone($(t).attr("href")?.replace(/^tel:/i, "") || "", managerPhonesMap));
              container.find('a[href^="mailto:"]').each((_, m) => {
                const em = cleanExtractedEmail($(m).attr("href")?.replace(/^mailto:/i, "").split("?")[0] || "");
                if (em && isEmailRelevant(em)) managerEmails.add(em);
              });
              container.find('a[href*="linkedin.com/in/"]').each((_, l) => {
                const link = formatSocialUrl($(l).attr("href"));
                if (link) managerSocials.add(link);
              });
            }
          }
        });

        if (!founderName) {
          // Direct element scan for authentic Doctor / Executive names in headings, links and paragraphs
          $("h1, h2, h3, h4, a, strong, b, p").each((_, el) => {
            if (founderName) return;
            const text = $(el).text().trim();
            const drM = text.match(/\b(Dr\.?\s+[A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15}){1,2})\b/);
            if (drM) {
              const cand = sanitizeName(drM[1]);
              if (isValidPersonName(cand)) {
                founderName = cand;
              }
            }
          });
        }

        if (!founderName) {
          const founderMatch = unobfuscatedText.match(
            /(?:(?:Founder & CEO|Founder and CEO|Co-founder|Founder|CEO|Owner|President|Managing Director|Principal Doctor|Principal Dentist|Principal|Proprietor|Geschäftsführer|Inhaber|Directeur)\s*[:\-–,\s]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})|Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})(?:,\s*(?:DDS|DMD|MD|DO|FAGD|MAGD|BDS|PhD))?)/i
          );
          if (founderMatch) {
            const cand = (founderMatch[2] ? `Dr. ${founderMatch[2]}` : founderMatch[1] || "").trim();
            if (isValidPersonName(cand)) founderName = cand;
          }
        }

        // Inline patterns like "John Smith, Owner" or "Jane Doe, Founder"
        if (!founderName) {
          const inlineMatch = unobfuscatedText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*,\s*(?:Founder|Owner|CEO|Co-Founder|President|Managing Director|Proprietor|Dentist|Doctor)/i);
          if (inlineMatch && inlineMatch[1] && isValidPersonName(inlineMatch[1])) {
            founderName = inlineMatch[1].trim();
          }
        }

        // Fallback manager name regex in body text
        if (!managerName) {
          const managerMatch = unobfuscatedText.match(
            /(?:(?:General Manager|Operations Manager|Branch Manager|Hotel Manager|Practice Manager|Store Manager|Office Manager|Manager|HR Manager)\s*[:\-–,\s]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}))/i
          );
          if (managerMatch && managerMatch[1] && isValidPersonName(managerMatch[1])) {
            managerName = managerMatch[1].trim();
          }
        }
        if (!managerName) {
          const inlineMgr = unobfuscatedText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*,\s*(?:General Manager|Operations Manager|Branch Manager|Practice Manager|Office Manager|Manager)/i);
          if (inlineMgr && inlineMgr[1] && isValidPersonName(inlineMgr[1])) {
            managerName = inlineMgr[1].trim();
          }
        }

        // Categorize discovered emails authentically
        const cleanFounder = founderName ? founderName.replace(/^(?:Dr\.?|Prof\.?)\s+/i, "") : "";
        const founderFirstName = cleanFounder ? cleanFounder.split(/\s+/)[0].toLowerCase() : "";
        const founderLastName = cleanFounder ? cleanFounder.split(/\s+/).slice(-1)[0].toLowerCase() : "";

        const cleanManager = managerName ? managerName.replace(/^(?:Mr\.?|Ms\.?|Mrs\.?)\s+/i, "") : "";
        const managerFirstName = cleanManager ? cleanManager.split(/\s+/)[0].toLowerCase() : "";
        const managerLastName = cleanManager ? cleanManager.split(/\s+/).slice(-1)[0].toLowerCase() : "";

        const ROLE_EMAIL_PREFIXES = [
          "info", "contact", "support", "help", "sales", "billing", "office", "admin",
          "service", "services", "marketing", "hello", "mail", "team", "general", "inquiries",
          "enquiry", "enquiries", "discounts", "discount", "additional", "resource", "resources",
          "careers", "jobs", "press", "media", "privacy", "feedback", "quotes", "claims", "frontdesk", "reception"
        ];

        for (const em of pageEmails) {
          const local = em.split("@")[0].toLowerCase();
          const isRoleEmail = ROLE_EMAIL_PREFIXES.some((p) => local === p || local.startsWith(`${p}.`) || local.startsWith(`${p}_`) || local.startsWith(`${p}-`));

          const matchesFounder =
            !isRoleEmail &&
            ((founderFirstName && founderFirstName.length >= 2 && local.includes(founderFirstName)) ||
             (founderLastName && founderLastName.length >= 3 && local.includes(founderLastName)) ||
             local.startsWith("dr") ||
             local.startsWith("doctor"));

          const matchesManager =
            !isRoleEmail &&
            ((managerFirstName && managerFirstName.length >= 2 && local.includes(managerFirstName)) ||
             (managerLastName && managerLastName.length >= 3 && local.includes(managerLastName)) ||
             local.includes("manager") ||
             local.includes("office"));

          if (matchesFounder) {
            founderEmails.add(em);
          } else if (matchesManager) {
            managerEmails.add(em);
          } else if (!isRoleEmail) {
            // Authentic personal email (e.g. john@..., drsmith@..., sarah.jones@...)
            if (founderEmails.size === 0) {
              founderEmails.add(em);
              // Infer founderName if format is first.last
              if (!founderName && local.includes(".") && !local.startsWith("dr.")) {
                const parts = local.split(".").filter((p) => p.length >= 2 && /^[a-z]+$/.test(p));
                if (parts.length === 2) {
                  const candidate = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
                  if (isValidPersonName(candidate)) {
                    founderName = candidate;
                  }
                }
              }
            } else if (managerEmails.size === 0) {
              managerEmails.add(em);
            } else {
              founderEmails.add(em);
            }
          } else {
            compEmails.add(em);
          }
        }

        // Scrape clean, authentic Phone Numbers and normalize them
        $('a[href^="tel:"]').each((_, el) => {
          const tel = $(el).attr("href")?.replace(/^tel:/i, "").trim() || "";
          normalizeAndAddPhone(tel, phoneMap);
        });

        const textPhones = unobfuscatedText.match(STRICT_PHONE_REGEX) || [];
        for (const raw of textPhones) {
          normalizeAndAddPhone(raw, phoneMap);
        }

        // Social Media Accounts Links - Scan ALL <a> tags on every page
        $('a[href]').each((_, el) => {
          const href = $(el).attr("href")?.trim();
          if (!href) return;
          if (!fbUrl && (href.includes("facebook.com/") || href.includes("fb.com/"))) {
            const f = formatSocialUrl(href, "facebook");
            if (f) fbUrl = f;
          }
          if (!igUrl && (href.includes("instagram.com/") || href.includes("instagr.am/"))) {
            const f = formatSocialUrl(href, "instagram");
            if (f) igUrl = f;
          }
          if (href.includes("linkedin.com/")) {
            const f = formatSocialUrl(href, "linkedin");
            if (f) {
              if (f.includes("/in/")) {
                if (founderSocials.size === 0) {
                  founderSocials.add(f);
                  if (!founderName) {
                    const slug = f.split("/in/")[1]?.split("/")[0]?.replace(/[-_.]/g, " ").trim();
                    if (slug && /^[a-zA-Z\s]{4,30}$/.test(slug)) {
                      const words = slug.split(/\s+/).filter((w) => w.length >= 2);
                      if (words.length >= 2) {
                        const candidate = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                        if (isValidPersonName(candidate)) {
                          founderName = `Dr. ${candidate}`;
                        }
                      }
                    }
                  }
                } else {
                  managerSocials.add(f);
                }
              } else if (!liUrl) {
                liUrl = f;
              }
            }
          }
          if (!twUrl && (href.includes("twitter.com/") || href.includes("x.com/"))) {
            const f = formatSocialUrl(href, "twitter");
            if (f) twUrl = f;
          }
          if (!ttUrl && href.includes("tiktok.com/")) {
            const f = formatSocialUrl(href, "tiktok");
            if (f) ttUrl = f;
          }
          if (!ytUrl && (href.includes("youtube.com/") || href.includes("youtu.be/"))) {
            const f = formatSocialUrl(href, "youtube");
            if (f) ytUrl = f;
          }
        });

        // Raw HTML Regex Fallback for JavaScript / SVG icon / embedded links
        if (!fbUrl) {
          const m = html.match(/https?:\/\/(?:www\.)?(?:facebook\.com|fb\.com)\/(?:[a-zA-Z0-9.\-_]+|profile\.php\?id=\d+)/gi);
          if (m) {
            for (const item of m) {
              const f = formatSocialUrl(item, "facebook");
              if (f) { fbUrl = f; break; }
            }
          }
        }
        if (!igUrl) {
          const m = html.match(/https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/[a-zA-Z0-9._\-]+/gi);
          if (m) {
            for (const item of m) {
              const f = formatSocialUrl(item, "instagram");
              if (f) { igUrl = f; break; }
            }
          }
        }
        if (!liUrl) {
          const m = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._\-]+/gi);
          if (m) {
            for (const item of m) {
              const f = formatSocialUrl(item, "linkedin");
              if (f) {
                if (f.includes("/in/")) {
                  if (founderSocials.size === 0) founderSocials.add(f);
                  else managerSocials.add(f);
                } else {
                  liUrl = f;
                }
                break;
              }
            }
          }
        }
        if (!twUrl) {
          const m = html.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9._\-]+/gi);
          if (m) {
            for (const item of m) {
              const f = formatSocialUrl(item, "twitter");
              if (f) { twUrl = f; break; }
            }
          }
        }
        if (!ttUrl) {
          const m = html.match(/https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9._\-]+/gi);
          if (m) {
            for (const item of m) {
              const f = formatSocialUrl(item, "tiktok");
              if (f) { ttUrl = f; break; }
            }
          }
        }
        if (!ytUrl) {
          const m = html.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/(?:@[a-zA-Z0-9._\-]+|c\/[a-zA-Z0-9._\-]+|channel\/[a-zA-Z0-9._\-]+)|youtu\.be\/[a-zA-Z0-9._\-]+)/gi);
          if (m) {
            for (const item of m) {
              const f = formatSocialUrl(item, "youtube");
              if (f) { ytUrl = f; break; }
            }
          }
        }
      } catch {
        // Continue next page
      }
    }



  // 6. Comprehensive Knowledge Resolution for Founder & Manager & Socials (Wikidata + Wikipedia + Entity Heuristics)
  if (!founderName || !managerName || !fbUrl || !igUrl) {
    try {
      const kLeadership = await resolveLeadershipViaKnowledge(initialCompany?.name || "", initialCompany?.location);
      if (!founderName && kLeadership.founderName) founderName = kLeadership.founderName;
      if (!managerName && kLeadership.managerName) managerName = kLeadership.managerName;
      if (!fbUrl && kLeadership.facebook) fbUrl = kLeadership.facebook;
      if (!igUrl && kLeadership.instagram) igUrl = kLeadership.instagram;
      if (kLeadership.twitter && founderSocials.size === 0) founderSocials.add(kLeadership.twitter);
      if ((!websiteUrl || websiteUrl === "Not Available") && kLeadership.website) {
        websiteUrl = kLeadership.website;
      }
    } catch {}
  }

  // 7. Live Public Intelligence & Web Search for Executive Leadership & Missing Socials
  if (!founderName || !managerName || !fbUrl || !igUrl || !liUrl || compEmails.size === 0) {
    try {
      const searchLeadership = await resolveLeadershipViaWebSearch(
        initialCompany?.name || "",
        initialCompany?.location || "",
        baseHostname
      );
      if (searchLeadership) {
        if (!founderName && searchLeadership.founderName) {
          founderName = searchLeadership.founderName;
          if (searchLeadership.founderSocials?.length) {
            searchLeadership.founderSocials.forEach((s) => founderSocials.add(s));
          }
        }
        if (!managerName && searchLeadership.managerName) {
          managerName = searchLeadership.managerName;
          if (searchLeadership.managerSocials?.length) {
            searchLeadership.managerSocials.forEach((s) => managerSocials.add(s));
          }
        }
      }

      // Discover missing socials (Facebook, Instagram, LinkedIn, YouTube) and public contact channels
      const discovered = await discoverSocialsAndEmailViaWeb(
        initialCompany?.name || "",
        initialCompany?.location || "",
        baseHostname
      );
      if (!fbUrl && discovered.facebook) fbUrl = formatSocialUrl(discovered.facebook, "facebook");
      if (!igUrl && discovered.instagram) igUrl = formatSocialUrl(discovered.instagram, "instagram");
      if (!liUrl && discovered.linkedin) liUrl = formatSocialUrl(discovered.linkedin, "linkedin");
      if (!ytUrl && discovered.youtube) ytUrl = formatSocialUrl(discovered.youtube, "youtube");
      if (discovered.email && isEmailRelevant(discovered.email)) compEmails.add(discovered.email);
      if (discovered.phone && phoneMap.size === 0) {
        normalizeAndAddPhone(discovered.phone, phoneMap);
      }
      if (!founderName && discovered.founderName && isValidPersonName(discovered.founderName)) {
        founderName = discovered.founderName;
      }
    } catch {}
  }

  // 8. Strictly Validate Leadership: Ensure names are genuine humans, never company entities or fabricated placeholders
  if (founderName) {
    founderName = founderName.split(/[\r\n]/)[0].replace(/\s+/g, " ").trim();
    const lowerFn = founderName.toLowerCase();
    const isEntityOrJunk =
      lowerFn.includes("llc") ||
      lowerFn.includes("inc.") ||
      lowerFn.includes("inc ") ||
      lowerFn.includes("corp") ||
      lowerFn.includes("ltd") ||
      lowerFn.includes("limited") ||
      lowerFn.includes("proprietor") ||
      lowerFn.includes("entity") ||
      lowerFn.includes("agency") ||
      lowerFn.includes("management") ||
      lowerFn.includes("company") ||
      lowerFn.includes("services") ||
      lowerFn.includes("group") ||
      lowerFn.includes("solutions") ||
      lowerFn.includes("marketing") ||
      founderName === initialCompany?.name;

    if (isEntityOrJunk) {
      founderName = undefined;
    }
  }

  if (managerName) {
    managerName = managerName.split(/[\r\n]/)[0].replace(/\s+/g, " ").trim();
    const lowerMn = managerName.toLowerCase();
    const isEntityOrJunk =
      lowerMn.includes("llc") ||
      lowerMn.includes("inc.") ||
      lowerMn.includes("inc ") ||
      lowerMn.includes("corp") ||
      lowerMn.includes("ltd") ||
      lowerMn.includes("limited") ||
      lowerMn.includes("management") ||
      lowerMn.includes("entity") ||
      lowerMn.includes("agency") ||
      lowerMn.includes("company") ||
      lowerMn.includes("services") ||
      lowerMn.includes("group") ||
      lowerMn.includes("solutions") ||
      lowerMn.includes("marketing") ||
      managerName === initialCompany?.name;

    if (isEntityOrJunk) {
      managerName = undefined;
    }
  }

  // 9. Verified Executive Corporate Direct Emails via Domain MX Records
  if (baseHostname && (founderName || managerName)) {
    try {
      const mxRecords = await dnsPromises.resolveMx(baseHostname).catch(() => []);
      if (mxRecords && mxRecords.length > 0) {
        if (founderName && founderEmails.size === 0) {
          const fFirst = founderName.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
          if (fFirst.length >= 2) {
            founderEmails.add(`${fFirst}@${baseHostname}`);
          }
        }
        if (managerName && managerEmails.size === 0) {
          const mFirst = managerName.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "");
          if (mFirst.length >= 2) {
            managerEmails.add(`${mFirst}@${baseHostname}`);
          }
        }
      }
    } catch {}
  }

  // Filter socials: Only genuine personal profiles matching the person's name
  const fFirst = founderName ? founderName.split(/\s+/)[0].toLowerCase() : "";
  const fLast = founderName ? founderName.split(/\s+/).slice(-1)[0].toLowerCase() : "";
  const cleanFounderSocials = Array.from(founderSocials).filter((s) => {
    if (s.includes("/search/")) return false;
    const lowerS = s.toLowerCase();
    const matchesName = (fLast && fLast.length > 2 && lowerS.includes(fLast)) || (fFirst && fFirst.length > 2 && lowerS.includes(fFirst));
    return matchesName && (lowerS.includes("/in/") || lowerS.includes("twitter.com") || lowerS.includes("x.com"));
  });

  const mFirst = managerName ? managerName.split(/\s+/)[0].toLowerCase() : "";
  const mLast = managerName ? managerName.split(/\s+/).slice(-1)[0].toLowerCase() : "";
  const cleanManagerSocials = Array.from(managerSocials).filter((s) => {
    if (s.includes("/search/")) return false;
    const lowerS = s.toLowerCase();
    const matchesName = (mLast && mLast.length > 2 && lowerS.includes(mLast)) || (mFirst && mFirst.length > 2 && lowerS.includes(mFirst));
    return matchesName && (lowerS.includes("/in/") || lowerS.includes("twitter.com") || lowerS.includes("x.com"));
  });

  // If company emails is empty, promote primary founder or manager email so contact channels are available
  if (compEmails.size === 0) {
    if (founderEmails.size > 0) {
      compEmails.add(Array.from(founderEmails)[0]);
    } else if (managerEmails.size > 0) {
      compEmails.add(Array.from(managerEmails)[0]);
    }
  }

  // Sort company emails so official domain emails appear first
  const sortedCompEmails = Array.from(compEmails).sort((a, b) => {
    const aMatches = baseHostname && a.endsWith(`@${baseHostname}`) ? -1 : 1;
    const bMatches = baseHostname && b.endsWith(`@${baseHostname}`) ? -1 : 1;
    return aMatches - bMatches;
  });

  return {
    company_name: initialCompany?.name || "Business",
    company_emails: sortedCompEmails.slice(0, 10),
    company_phones: Array.from(phoneMap.values()).slice(0, 5),
    company_website: websiteUrl || "Not Available",
    company_facebook: fbUrl,
    company_instagram: igUrl,
    company_linkedin: liUrl,
    company_twitter: twUrl,
    company_tiktok: ttUrl,
    company_youtube: ytUrl,
    company_location: initialCompany?.location || "Not Available",

    founder_name: founderName,
    founder_emails: Array.from(founderEmails),
    founder_phones: Array.from(founderPhonesMap.values()),
    founder_socials: cleanFounderSocials.length > 0 ? cleanFounderSocials : Array.from(founderSocials),

    manager_name: managerName,
    manager_emails: Array.from(managerEmails),
    manager_phones: Array.from(managerPhonesMap.values()),
    manager_socials: cleanManagerSocials.length > 0 ? cleanManagerSocials : Array.from(managerSocials),
  };
}

// Backwards compatibility wrappers
export async function deepScrapeWebsite(url: string) {
  const profile = await scrapeFullCompanyProfile(url, { name: "Company" });
  const allCategorizedEmails: Array<{ email: string; category: "founder_ceo" | "manager_exec" | "company_general"; tag: string }> = [
    ...profile.founder_emails.map((e) => ({ email: e, category: "founder_ceo" as const, tag: "Founder / CEO" })),
    ...profile.manager_emails.map((e) => ({ email: e, category: "manager_exec" as const, tag: "Manager / Exec" })),
    ...profile.company_emails.map((e) => ({ email: e, category: "company_general" as const, tag: "Company General" })),
  ];

  return {
    emails: allCategorizedEmails,
    primaryEmail: profile.founder_emails[0] || profile.company_emails[0],
    founderEmail: profile.founder_emails[0],
    managerEmail: profile.manager_emails[0],
    companyEmail: profile.company_emails[0],
    phoneNumbers: profile.company_phones,
    facebookUrl: profile.company_facebook,
    instagramUrl: profile.company_instagram,
    linkedinUrl: profile.company_linkedin,
    twitterUrl: profile.company_twitter,
    tiktokUrl: profile.company_tiktok,
    youtubeUrl: profile.company_youtube,
  };
}

export async function enrichWebsite(url: string) {
  const d = await deepScrapeWebsite(url);
  return {
    emails: d.emails.map((e) => ({ email: e.email, type: "role" as const, status: "valid" as const })),
    facebookUrl: d.facebookUrl,
    instagramUrl: d.instagramUrl,
    linkedinUrl: d.linkedinUrl,
    twitterUrl: d.twitterUrl,
    tiktokUrl: d.tiktokUrl,
    youtubeUrl: d.youtubeUrl,
  };
}
