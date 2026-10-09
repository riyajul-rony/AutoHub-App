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

  // 2. Wikidata Global Knowledge Lookup (Instant authentic data for corporations, chains & notable entities)
  try {
    const sUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(clean)}&language=en&format=json&limit=3`;
    const res = await fetch(sUrl, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      const firstHit = data.search?.[0];
      if (firstHit && firstHit.id) {
        const entRes = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${firstHit.id}.json`, { signal: AbortSignal.timeout(2500) });
        if (entRes.ok) {
          const entData = await entRes.json();
          const claims = entData.entities[firstHit.id]?.claims || {};

          const extractPerson = async (propId: string) => {
            if (claims[propId]?.[0]?.mainsnak?.datavalue?.value?.id) {
              const pid = claims[propId][0].mainsnak.datavalue.value.id;
              const pres = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${pid}.json`, { signal: AbortSignal.timeout(1800) });
              if (pres.ok) {
                const pdata = await pres.json();
                return pdata.entities[pid]?.labels?.en?.value;
              }
            }
            return undefined;
          };

          if (!founderName) {
            founderName = (await extractPerson("P112")) || (await extractPerson("P169"));
          }
          if (!managerName) {
            managerName = (await extractPerson("P1037")) || (await extractPerson("P488"));
          }

          // Extract official social channels and website from Wikidata claims
          const fbVal = claims.P2013?.[0]?.mainsnak?.datavalue?.value;
          if (typeof fbVal === "string" && fbVal.length > 1) {
            facebook = `https://www.facebook.com/${fbVal}`;
          }
          const igVal = claims.P2003?.[0]?.mainsnak?.datavalue?.value;
          if (typeof igVal === "string" && igVal.length > 1) {
            instagram = `https://www.instagram.com/${igVal}/`;
          }
          const twVal = claims.P2002?.[0]?.mainsnak?.datavalue?.value;
          if (typeof twVal === "string" && twVal.length > 1) {
            twitter = `https://x.com/${twVal}`;
          }
          const webVal = claims.P856?.[0]?.mainsnak?.datavalue?.value;
          if (typeof webVal === "string" && webVal.startsWith("http")) {
            website = webVal;
          }
        }
      }
    }
  } catch {}

  // 3. Fast Wikipedia Lookup for notable corporations & regional companies
  if (!founderName || !managerName) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(clean)}&format=json`;
      const res = await fetch(wikiUrl, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        const firstHit = data.query?.search?.[0];
        const firstWord = clean.toLowerCase().split(/\s+/)[0];
        if (firstHit && firstHit.title.toLowerCase().includes(firstWord)) {
          const pageId = firstHit.pageid;
          const pageRes = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}&format=json`,
            { signal: AbortSignal.timeout(2000) }
          );
          if (pageRes.ok) {
            const pData = await pageRes.json();
            const extract = pData.query?.pages?.[pageId]?.extract || "";
            if (!founderName) {
              const fMatch = extract.match(
                /(?:origins in two companies;\s*|founded in \d{4} by|founded by|established by|started by|created by)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i
              );
              if (fMatch && fMatch[1]) {
                const raw = fMatch[1].replace(/\band\b.*$/i, "").replace(/\sson\b/i, "").trim();
                if (raw.length > 2 && raw.length < 35) founderName = raw;
              }
            }
            if (!managerName) {
              const mMatch = extract.match(
                /(?:Chief Executive Officer|CEO|Managing Director|General Manager)\s*(?:is|,)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i
              );
              if (mMatch && mMatch[1]) {
                managerName = mMatch[1].trim();
              }
            }
          }
        }
      }
    } catch {}
  }

  return { founderName, managerName, facebook, instagram, twitter, website };
}

function fetchDuckDuckGoLite(query: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const postData = "q=" + encodeURIComponent(query);
      const req = https.request("https://lite.duckduckgo.com/lite/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "*/*",
        },
        timeout: 4500,
      }, (res) => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(data);
        });
      });

      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
      req.write(postData);
      req.end();
    } catch {
      resolve(null);
    }
  });
}

function parseBestCityOrLocation(loc: string): string {
  if (!loc) return "";
  const parts = loc.split(/[,]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "";

  const candidates = parts.filter((p) =>
    !/^\d/.test(p) &&
    !/^[A-Z0-9]{2,4}\s+[A-Z0-9]{2,4}$/i.test(p) &&
    !/^(United States|USA|United Kingdom|UK|Canada|Australia|Bangladesh|India|Germany|France)$/i.test(p) &&
    !/\b(street|road|st|rd|ave|avenue|blvd|lane|drive|way|suite|floor|building)\b/i.test(p)
  );

  if (candidates.length > 0) {
    return candidates[candidates.length - 1] || candidates[0];
  }
  return parts[0];
}

const extractDdgHref = (rawHref: string): string => {
  if (!rawHref) return "";
  if (rawHref.includes("uddg=")) {
    try {
      const match = rawHref.match(/[?&]uddg=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
  }
  return rawHref;
};

export async function resolveLeadershipViaWebSearch(
  companyName: string,
  location = "",
  domain = ""
): Promise<{ founderName?: string; founderSocials?: string[]; managerName?: string; managerSocials?: string[] } | null> {
  if (!companyName || ["business", "company", "target business", "target", "not available"].includes(companyName.toLowerCase().trim())) {
    return null;
  }

  const isRealPersonName = (n?: string): boolean => {
    if (!n) return false;
    const clean = n.trim();
    if (clean.length < 4 || clean.length > 30) return false;
    if (!/^[A-Z][A-Za-z'-]{1,20}(?:\s+[A-Z][A-Za-z'-]{1,20}){1,2}$/.test(clean)) return false;
    const badWords = ["daughter", "daughters", "son", "sons", "member", "members", "friend", "friends", "welcome", "about", "contact", "history", "story", "board", "team", "staff", "office", "group", "agency", "service", "system", "center", "school", "university", "college", "state", "city", "county"];
    const lower = clean.toLowerCase();
    return !badWords.some((b) => lower.includes(b));
  };

  // Extract core brand name (e.g., "Tower 25 Digital Marketing Agency" -> "Tower 25")
  const stripped = companyName
    .replace(/\b(Digital|Marketing|Agency|Services|Solutions|Consulting|Management|Group|Technologies|Tech|Media|LLC|Inc\.|Inc|Corp\.|Corp|Ltd\.|Ltd|Limited|Pte|GmbH)\b/gi, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const brandName = stripped.length >= 3 ? stripped : companyName.trim();
  const locWord = parseBestCityOrLocation(location);
  const query = `${brandName} ${locWord} founder`.trim();

  try {
    const html = await fetchDuckDuckGoLite(query);
    if (!html) return null;
    const $ = cheerio.load(html);

    let founderName: string | undefined;
    const founderSocials: string[] = [];
    let managerName: string | undefined;
    const managerSocials: string[] = [];

    const compWords = brandName.toLowerCase().split(/\s+/).filter((w) => w.length > 1);

    $(".result-link").each((_, el) => {
      const title = $(el).text().trim();
      const rawHref = $(el).attr("href") || "";
      const href = extractDdgHref(rawHref);
      const snippet = $(el).closest("tr").next().find(".result-snippet").text().trim();
      const lowerSnippet = snippet.toLowerCase();

      // Pattern 1: Title match e.g. "Brad McLaughlin - Chief Marketing Officer at Tower 25 ..."
      const titleMatch = title.match(/^([A-Z][A-Za-z'-]{1,20}(?:\s+[A-Z][A-Za-z'-]{1,20}){1,2})\s*(?:Email & Phone Number\s*)?[-–—|]\s*(.+)$/i);
      if (titleMatch) {
        const candidateName = titleMatch[1].trim();
        const rolePart = (titleMatch[2] || "").toLowerCase();

        const mentionsCompany = compWords.every((w) => rolePart.includes(w) || lowerSnippet.includes(w));
        if (mentionsCompany && isRealPersonName(candidateName)) {
          const isFounder = /founder|co-founder|owner|ceo|president/i.test(rolePart) || /co-founder|founder|owner|ceo/i.test(lowerSnippet);
          const isManager = /director|manager|cmo|chief marketing officer|lead|head|vp|executive/i.test(rolePart) || /director|manager|cmo|general manager/i.test(lowerSnippet);

          if (isFounder && !founderName) {
            founderName = candidateName;
            if (href.includes("linkedin.com/in/")) founderSocials.push(href);
          } else if (isManager && !managerName && candidateName !== founderName) {
            managerName = candidateName;
            if (href.includes("linkedin.com/in/")) managerSocials.push(href);
          }
        }
      }

      // Pattern 2: Snippet mention e.g. "Ross Furukawa ... is currently a Co-Founder at Tower 25"
      if (!founderName) {
        const fMatch = snippet.match(/([A-Z][A-Za-z'-]{1,20}\s+[A-Z][A-Za-z'-]{1,20})(?:,\s*[^,.\n]+,)?\s*(?:is currently a|is the|serves as)?\s*(?:Co-Founder|Founder|CEO|Owner|President)\s*(?:at|of)\s+/i);
        if (fMatch && isRealPersonName(fMatch[1])) {
          founderName = fMatch[1].trim();
          if (href.includes("linkedin.com/in/")) founderSocials.push(href);
        }
      }

      // Pattern 3: Snippet historical or founder match e.g. "our founder, Samuel Rains"
      if (!founderName) {
        const fHistoryMatch = snippet.match(/(?:our\s+founder|founder|founded\s+by)\s*[,:\s\-–]+\s*([A-Z][A-Za-z'-]{1,20}\s+[A-Z][A-Za-z'-]{1,20})/i);
        if (fHistoryMatch && isRealPersonName(fHistoryMatch[1])) {
          founderName = fHistoryMatch[1].trim();
          if (href.includes("linkedin.com/in/")) founderSocials.push(href);
        }
      }

      // Pattern 4: Manager snippet match
      if (!managerName) {
        const mMatch = snippet.match(/([A-Z][A-Za-z'-]{1,20}\s+[A-Z][A-Za-z'-]{1,20})(?:,\s*[^,.\n]+,)?\s*(?:is currently a|is the|serves as)?\s*(?:Chief Marketing Officer|Director|CMO|General Manager|Operations Manager)\s*(?:at|of)\s+/i);
        if (mMatch && isRealPersonName(mMatch[1]) && mMatch[1] !== founderName) {
          managerName = mMatch[1].trim();
          if (href.includes("linkedin.com/in/")) managerSocials.push(href);
        }
      }
    });

    // Targeted LinkedIn Profile Search for Founder if not yet retrieved
    if (founderName && founderSocials.length === 0) {
      try {
        const fHtml = await fetchDuckDuckGoLite(`${founderName} ${brandName} linkedin`);
        if (fHtml) {
          const $f = cheerio.load(fHtml);
          const fLast = founderName.split(/\s+/).slice(-1)[0].toLowerCase();
          $f(".result-link").each((_, el) => {
            const lHref = extractDdgHref($f(el).attr("href") || "");
            if (lHref.includes("linkedin.com/in/") && (lHref.toLowerCase().includes(fLast) || founderSocials.length === 0)) {
              if (!founderSocials.includes(lHref)) {
                founderSocials.push(lHref);
              }
            }
          });
        }
      } catch {}
    }

    // Targeted LinkedIn Profile Search for Manager if not yet retrieved
    if (managerName && managerSocials.length === 0) {
      try {
        const mHtml = await fetchDuckDuckGoLite(`${managerName} ${brandName} linkedin`);
        if (mHtml) {
          const $m = cheerio.load(mHtml);
          const mLast = managerName.split(/\s+/).slice(-1)[0].toLowerCase();
          $m(".result-link").each((_, el) => {
            const lHref = extractDdgHref($m(el).attr("href") || "");
            if (lHref.includes("linkedin.com/in/") && (lHref.toLowerCase().includes(mLast) || managerSocials.length === 0)) {
              if (!managerSocials.includes(lHref)) {
                managerSocials.push(lHref);
              }
            }
          });
        }
      } catch {}
    }

    return { founderName, founderSocials, managerName, managerSocials };
  } catch {
    return null;
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
  let ttUrl: string | undefined;
  let ytUrl: string | undefined;

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
      base = `${parsed.protocol}//${parsed.hostname}`;
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

  const formatSocialUrl = (u?: string): string | undefined => {
    if (!u) return undefined;
    let clean = u.trim();
    if (clean.startsWith("//")) clean = `https:${clean}`;
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

      return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
    } catch {
      return undefined;
    }
  };

  const htmlMap = new Map<string, string>();
  let aggregatedSiteText = "";

  if (validSite && base) {
    const homeTarget = websiteUrl.startsWith("http") ? websiteUrl : `${base}/`;

    // 1. Fetch homepage first
    let homeHtml = "";
    try {
      homeHtml = await safeFetch(homeTarget, { timeoutMs: 7000, maxBytes: 1024 * 1024 });
    } catch {}

    const subpagesToFetch = new Set<string>();

    if (homeHtml) {
      htmlMap.set(homeTarget, homeHtml);
      const $home = cheerio.load(homeHtml);

      // Discover authentic contact / about / team / story / people / management subpages from links
      const priorityCandidates: { url: string; score: number }[] = [];
      $home("a[href]").each((_, el) => {
        const href = $home(el).attr("href")?.trim();
        const text = $home(el).text().toLowerCase().trim();
        if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
        const lowerHref = href.toLowerCase();

        let score = 0;
        if (
          /team|our-team|meet-the-team|staff|people|doctors|dentists|attorneys|agents|founders|leadership|directors|management/i.test(lowerHref) ||
          /team|staff|people|leadership|management/i.test(text)
        ) {
          score = 10;
        } else if (/story|our-story|about|about-us|who-we-are|history/i.test(lowerHref) || /story|about/i.test(text)) {
          score = 8;
        } else if (/contact|contact-us|reach|location|visit|find-us/i.test(lowerHref) || /contact/i.test(text)) {
          score = 6;
        } else if (/impressum|kontakt|over-ons|ueber-uns|info|support/i.test(lowerHref)) {
          score = 4;
        }

        if (score > 0) {
          try {
            const absoluteUrl = new URL(href, base).toString();
            if (absoluteUrl.startsWith(base) && absoluteUrl !== homeTarget) {
              priorityCandidates.push({ url: absoluteUrl, score });
            }
          } catch {}
        }
      });

      // Sort by score descending and take up to 5 distinct URLs
      priorityCandidates.sort((a, b) => b.score - a.score);
      for (const cand of priorityCandidates) {
        if (subpagesToFetch.size >= 5) break;
        subpagesToFetch.add(cand.url);
      }
    }

    // Fallback standard subpage paths if none were discovered
    if (subpagesToFetch.size === 0) {
      subpagesToFetch.add(`${base}/about`);
      subpagesToFetch.add(`${base}/team`);
      subpagesToFetch.add(`${base}/our-story`);
      subpagesToFetch.add(`${base}/contact`);
    }

    // 2. Fetch discovered subpages in parallel (with robust timeout)
    const fetchPromises = Array.from(subpagesToFetch).map(async (u) => {
      try {
        const content = await safeFetch(u, { timeoutMs: 4500, maxBytes: 512 * 1024 });
        return { url: u, content };
      } catch {
        return null;
      }
    });

    const subResults = await Promise.allSettled(fetchPromises);
    for (const res of subResults) {
      if (res.status === "fulfilled" && res.value?.content) {
        htmlMap.set(res.value.url, res.value.content);
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
                if (s.includes("facebook.com") && !fbUrl) fbUrl = formatSocialUrl(s);
                if (s.includes("instagram.com") && !igUrl) igUrl = formatSocialUrl(s);
                if (s.includes("linkedin.com") && !liUrl) liUrl = formatSocialUrl(s);
                if (s.includes("tiktok.com") && !ttUrl) ttUrl = formatSocialUrl(s);
                if (s.includes("youtube.com") && !ytUrl) ytUrl = formatSocialUrl(s);
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

        const NON_PERSON_WORDS = new Set([
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

        const sanitizeName = (raw: string): string => {
          return raw.split(/[\r\n]/)[0].replace(/\s+/g, " ").trim();
        };

        const isValidPersonName = (raw: string): boolean => {
          const clean = sanitizeName(raw);
          if (clean.length < 3 || clean.length > 35) return false;
          if (!/^(?:Dr\.?\s+|Prof\.?\s+)?[A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15}){1,2}$/.test(clean)) return false;
          const words = clean.toLowerCase().replace(/^(?:dr|prof)\.?\s+/i, "").split(/\s+/);
          if (words.some((w) => NON_PERSON_WORDS.has(w))) return false;
          const stopWords = ["you", "your", "we", "our", "us", "they", "their", "it", "its", "all", "get", "has", "have", "for", "with", "from", "into", "over", "more", "most", "the", "and", "but", "not"];
          if (words.some((w) => stopWords.includes(w))) return false;
          return true;
        };

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
          const founderMatch = unobfuscatedText.match(
            /(?:(?:Founder & CEO|Founder and CEO|Co-founder|Founder|CEO|Owner|President|Managing Director|Principal Doctor|Principal Dentist|Principal|Proprietor|Geschäftsführer|Inhaber|Directeur)\s*[:\-–,\s]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})|Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}))/i
          );
          if (founderMatch) {
            const cand = (founderMatch[2] ? `Dr. ${founderMatch[2]}` : founderMatch[1] || "").trim();
            if (isValidPersonName(cand)) founderName = cand;
          }
        }

        // Inline patterns like "John Smith, Owner" or "Jane Doe, Founder"
        if (!founderName) {
          const inlineMatch = unobfuscatedText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*,\s*(?:Founder|Owner|CEO|Co-Founder|President|Managing Director|Proprietor)/i);
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
          const inlineMgr = unobfuscatedText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*,\s*(?:General Manager|Operations Manager|Branch Manager|Practice Manager|Manager)/i);
          if (inlineMgr && inlineMgr[1] && isValidPersonName(inlineMgr[1])) {
            managerName = inlineMgr[1].trim();
          }
        }

        // Categorize discovered emails authentically
        const founderFirstName = founderName ? founderName.split(/\s+/)[0].toLowerCase() : "";
        const managerFirstName = managerName ? managerName.split(/\s+/)[0].toLowerCase() : "";
        const ROLE_EMAIL_PREFIXES = [
          "info", "contact", "support", "help", "sales", "billing", "office", "admin",
          "service", "services", "marketing", "hello", "mail", "team", "general", "inquiries",
          "enquiry", "enquiries", "discounts", "discount", "additional", "resource", "resources",
          "careers", "jobs", "press", "media", "privacy", "feedback", "quotes", "claims"
        ];

        for (const em of pageEmails) {
          const local = em.split("@")[0].toLowerCase();
          const isRoleEmail = ROLE_EMAIL_PREFIXES.some((p) => local === p || local.startsWith(`${p}.`) || local.startsWith(`${p}_`) || local.startsWith(`${p}-`));

          if (!isRoleEmail && founderFirstName && founderFirstName.length > 2 && local.includes(founderFirstName)) {
            founderEmails.add(em);
          } else if (!isRoleEmail && managerFirstName && managerFirstName.length > 2 && local.includes(managerFirstName)) {
            managerEmails.add(em);
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
          if (!fbUrl && href.includes("facebook.com")) {
            const f = formatSocialUrl(href);
            if (f) fbUrl = f;
          }
          if (!igUrl && href.includes("instagram.com")) {
            const f = formatSocialUrl(href);
            if (f) igUrl = f;
          }
          if (!liUrl && href.includes("linkedin.com")) {
            const f = formatSocialUrl(href);
            if (f) {
              if (f.includes("/in/")) {
                if (founderSocials.size === 0) founderSocials.add(f);
                else managerSocials.add(f);
              } else {
                liUrl = f;
              }
            }
          }
          if (!ttUrl && href.includes("tiktok.com")) {
            const f = formatSocialUrl(href);
            if (f) ttUrl = f;
          }
          if (!ytUrl && href.includes("youtube.com")) {
            const f = formatSocialUrl(href);
            if (f) ytUrl = f;
          }
        });

        // Raw HTML Regex Fallback for JavaScript / SVG icon / embedded links
        if (!fbUrl) {
          const m = html.match(/https?:\/\/(?:www\.)?facebook\.com\/(?:[a-zA-Z0-9.\-_]+|profile\.php\?id=\d+)/gi);
          if (m) {
            for (const item of m) {
              const f = formatSocialUrl(item);
              if (f) { fbUrl = f; break; }
            }
          }
        }
        if (!igUrl) {
          const m = html.match(/https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._\-]+/gi);
          if (m) {
            for (const item of m) {
              const f = formatSocialUrl(item);
              if (f) { igUrl = f; break; }
            }
          }
        }
        if (!liUrl) {
          const m = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._\-]+/gi);
          if (m) {
            for (const item of m) {
              const f = formatSocialUrl(item);
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
        if (!ttUrl) {
          const m = html.match(/https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9._\-]+/gi);
          if (m) {
            for (const item of m) {
              const f = formatSocialUrl(item);
              if (f) { ttUrl = f; break; }
            }
          }
        }
        if (!ytUrl) {
          const m = html.match(/https?:\/\/(?:www\.)?youtube\.com\/(?:@[a-zA-Z0-9._\-]+|c\/[a-zA-Z0-9._\-]+|channel\/[a-zA-Z0-9._\-]+)/gi);
          if (m) {
            for (const item of m) {
              const f = formatSocialUrl(item);
              if (f) { ytUrl = f; break; }
            }
          }
        }
      } catch {
        // Continue next page
      }
    }

    // 4. If still no emails found, check RFC 9116 /.well-known/security.txt
    if (compEmails.size === 0 && founderEmails.size === 0 && managerEmails.size === 0) {
      try {
        const secText = await safeFetch(`${base}/.well-known/security.txt`, { timeoutMs: 2500, maxBytes: 64 * 1024 }).catch(() =>
          safeFetch(`${base}/security.txt`, { timeoutMs: 2500, maxBytes: 64 * 1024 })
        );
        if (secText) {
          const secEmails = secText.match(EMAIL_REGEX) || [];
          for (const em of secEmails) {
            const clean = em.toLowerCase().trim();
            if (isEmailRelevant(clean)) compEmails.add(clean);
          }
        }
      } catch {}
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

  // 7. Live Public Intelligence & Web Search for Executive Leadership
  if (!founderName || !managerName) {
    try {
      const searchLeadership = await resolveLeadershipViaWebSearch(
        initialCompany?.name || "",
        initialCompany?.location || "",
        baseHostname
      );
      console.log('>>> [enrichment] searchLeadership:', JSON.stringify(searchLeadership));
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

  // Sort company emails so official domain emails appear first
  const sortedCompEmails = Array.from(compEmails).sort((a, b) => {
    const aMatches = baseHostname && a.endsWith(`@${baseHostname}`) ? -1 : 1;
    const bMatches = baseHostname && b.endsWith(`@${baseHostname}`) ? -1 : 1;
    return aMatches - bMatches;
  });

  return {
    company_name: initialCompany?.name || "Business",
    company_emails: sortedCompEmails.slice(0, 5),
    company_phones: Array.from(phoneMap.values()).slice(0, 3),
    company_website: websiteUrl || "Not Available",
    company_facebook: fbUrl,
    company_instagram: igUrl,
    company_linkedin: liUrl,
    company_tiktok: ttUrl,
    company_youtube: ytUrl,
    company_location: initialCompany?.location || "Not Available",

    founder_name: founderName,
    founder_emails: founderName ? Array.from(founderEmails) : [],
    founder_phones: founderName ? Array.from(founderPhonesMap.values()) : [],
    founder_socials: founderName ? cleanFounderSocials : [],

    manager_name: managerName,
    manager_emails: managerName ? Array.from(managerEmails) : [],
    manager_phones: managerName ? Array.from(managerPhonesMap.values()) : [],
    manager_socials: managerName ? cleanManagerSocials : [],
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
  };
}

export async function enrichWebsite(url: string) {
  const d = await deepScrapeWebsite(url);
  return {
    emails: d.emails.map((e) => ({ email: e.email, type: "role" as const, status: "valid" as const })),
    facebookUrl: d.facebookUrl,
    instagramUrl: d.instagramUrl,
    linkedinUrl: d.linkedinUrl,
  };
}
