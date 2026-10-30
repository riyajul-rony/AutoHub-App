export interface SpamCheckResult {
  score: number; // 0 (best) to 10 (worst)
  level: "low" | "medium" | "high";
  flags: Array<{
    type: "trigger_word" | "formatting" | "subject_length" | "caps";
    message: string;
    word?: string;
  }>;
  suggestions: string[];
}

const SPAM_TRIGGER_WORDS = [
  "100% free",
  "100% satisfied",
  "act now",
  "all natural",
  "apply now",
  "as seen on",
  "bad credit",
  "bargain",
  "best price",
  "big bucks",
  "billion dollars",
  "bonus",
  "buy direct",
  "buy now",
  "cancel at any time",
  "cash bonus",
  "cash prize",
  "casino",
  "certified",
  "cheap",
  "claims",
  "clearance",
  "click below",
  "click here",
  "click now",
  "congratulations",
  "credit card",
  "cures",
  "dear friend",
  "direct email",
  "direct marketing",
  "discount",
  "double your",
  "earn extra cash",
  "earn money",
  "eliminate debt",
  "exclusive deal",
  "expect to earn",
  "extra income",
  "fast cash",
  "financial freedom",
  "free access",
  "free consultation",
  "free gift",
  "free info",
  "free membership",
  "free money",
  "free preview",
  "free quote",
  "free trial",
  "full refund",
  "get out of debt",
  "get paid",
  "giveaway",
  "guaranteed",
  "hidden assets",
  "income from home",
  "increase sales",
  "increase traffic",
  "instant",
  "investment",
  "join millions",
  "limited time",
  "lowest price",
  "make money",
  "million dollars",
  "miracle",
  "money back",
  "mortgage",
  "no catch",
  "no cost",
  "no credit check",
  "no experience",
  "no fees",
  "no gimmick",
  "no hidden costs",
  "no obligation",
  "no purchase necessary",
  "no risk",
  "no strings attached",
  "not spam",
  "once in a lifetime",
  "one time",
  "online marketing",
  "open immediately",
  "order now",
  "passwords",
  "pennies a day",
  "potential earnings",
  "prize",
  "promise",
  "pure profit",
  "refund",
  "risk-free",
  "save big",
  "save money",
  "satisfaction guaranteed",
  "score",
  "special promotion",
  "stainless",
  "stop snoring",
  "terms and conditions",
  "unlimited",
  "urgent",
  "valuable",
  "viagra",
  "vicodin",
  "warranty",
  "weight loss",
  "while supplies last",
  "win",
  "winner",
  "winning",
  "work from home",
  "you have been selected",
];

export function analyzeSpamRisk(subject: string, body: string): SpamCheckResult {
  const flags: SpamCheckResult["flags"] = [];
  const suggestions: string[] = [];
  let score = 0;

  const cleanSubject = (subject || "").trim();
  const cleanBody = (body || "").trim();
  const combinedText = `${cleanSubject} ${cleanBody}`.toLowerCase();

  // 1. Check Subject Length
  if (cleanSubject.length > 60) {
    flags.push({
      type: "subject_length",
      message: `Subject line is long (${cleanSubject.length} chars). Keep subjects under 50 characters for better mobile deliverability.`,
    });
    score += 1;
    suggestions.push("Shorten the subject line to 3-6 words (under 50 characters).");
  } else if (cleanSubject.length > 0 && cleanSubject.length < 5) {
    flags.push({
      type: "subject_length",
      message: "Subject line is extremely short. It may look suspicious to spam filters.",
    });
    score += 1;
  }

  // 2. Check for All-Caps Subject or Excessive Uppercase
  const subjectLetters = cleanSubject.replace(/[^a-zA-Z]/g, "");
  if (subjectLetters.length >= 6) {
    const uppercaseLetters = subjectLetters.replace(/[^A-Z]/g, "").length;
    const uppercaseRatio = uppercaseLetters / subjectLetters.length;
    if (uppercaseRatio > 0.4) {
      flags.push({
        type: "caps",
        message: "Subject line has excessive CAPITAL letters, which severely triggers spam filters.",
      });
      score += 2;
      suggestions.push("Avoid using ALL CAPS in the subject line or body text.");
    }
  }

  // 3. Check for Multiple Exclamation Marks or Question Marks
  if (/!{2,}|\?{2,}/.test(cleanSubject) || /!{3,}/.test(cleanBody)) {
    flags.push({
      type: "formatting",
      message: "Multiple exclamation marks (!!) or question marks (??) detected.",
    });
    score += 1.5;
    suggestions.push("Use single punctuation marks instead of repeated '!!' or '??'.");
  }

  // 4. Check for Dollar / Currency signs
  if (/\${2,}|\$\d+[\d,]*(\.\d{2})?/.test(cleanSubject)) {
    flags.push({
      type: "formatting",
      message: "Dollar amounts in the subject line are a high-risk spam signal.",
    });
    score += 2;
    suggestions.push("Remove specific dollar amounts from the subject line.");
  }

  // 5. Trigger Words Check
  const foundWords = new Set<string>();
  for (const trigger of SPAM_TRIGGER_WORDS) {
    const regex = new RegExp(`\\b${trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(combinedText)) {
      foundWords.add(trigger);
    }
  }

  for (const word of foundWords) {
    flags.push({
      type: "trigger_word",
      message: `Spam-risk trigger phrase found: "${word}"`,
      word,
    });
    score += 1;
  }

  if (foundWords.size > 0) {
    suggestions.push(`Rephrase promotional wording like: ${Array.from(foundWords).slice(0, 3).map((w) => `"${w}"`).join(", ")}.`);
  }

  // 6. Check excessive links in body
  const linkMatches = cleanBody.match(/https?:\/\/[^\s]+/g);
  if (linkMatches && linkMatches.length > 2) {
    flags.push({
      type: "formatting",
      message: `Email body contains ${linkMatches.length} links. In initial cold emails, limit links to 0 or 1.`,
    });
    score += 1.5;
    suggestions.push("Limit links to maximum 1 link in initial cold outreach for highest inbox placement.");
  }

  // Clamp score
  const finalScore = Math.min(Math.round(score * 10) / 10, 10);
  const level: "low" | "medium" | "high" =
    finalScore < 3 ? "low" : finalScore < 6 ? "medium" : "high";

  return {
    score: finalScore,
    level,
    flags,
    suggestions: suggestions.slice(0, 3),
  };
}
