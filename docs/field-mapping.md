# AutoHub Lead Schema: 18-Field Data Mapping

This document details the mapping between AutoHub's standardized 18-field lead schema (used across the results table, enrichment modes, CSV/TSV/HTML exports, and Google Sheets synchronization) and its data sources: Apify Actors, the custom Deep Web Scraper, and manual/enrichment fallbacks.

---

## The 18 Standard Lead Fields

| # | Field Name | Description | Google Maps (`compass/crawler-google-places`) | Meta Ads (`apify/facebook-ads-scraper`) | B2B Leads (`code_crafter/leads-finder`) | Deep Web Scraper (Custom In-House Scraper) |
|---|---|---|---|---|---|---|
| **1** | `company_name` | Name of the business / advertiser | `title` | `pageName` (grouped by advertiser) | `companyName` or `company` | Extracted from `<title>`, OpenGraph `og:site_name`, or JSON-LD `Organization.name` |
| **2** | `company_location` | Formatted street, city, state, country | `address` (or `city`, `state`, `countryCode`) | Location of ads target (`country`) | `city`, `state`, `country` / `location` | Extracted from footer address or JSON-LD `PostalAddress` |
| **3** | `company_website` | Primary official website URL | `website` | Domain extracted from `linkUrl` / CTA landing URL | `companyDomain` or `website` | Scraped target root URL |
| **4** | `company_emails` | General business contact emails | Scraped if contact add-on enabled; otherwise Deep Scraper | Not available in Ad Library (via Deep Scraper) | `workEmail` or `companyEmail` | Extracted from homepage & contact pages (`mailto:`, obfuscated regex, contact form) |
| **5** | `company_phones` | Official telephone / contact numbers | `phone` / `phoneUnformatted` | Not available in Ad Library (via Deep Scraper) | `companyPhone` or `phone` | Extracted from `tel:` links, header/footer patterns, formatted with libphonenumber |
| **6** | `company_facebook` | Official Facebook company page URL | `facebook` (if contact add-on enabled) or Deep Scraper | `pageUrl` / `https://facebook.com/${pageId}` | Not directly provided (via Deep Scraper) | Extracted from social links (`href*="facebook.com"`) |
| **7** | `company_instagram`| Official Instagram profile URL | `instagram` (if contact add-on) or Deep Scraper | Instagram handle / publisher URL if linked | Not directly provided (via Deep Scraper) | Extracted from social links (`href*="instagram.com"`) |
| **8** | `company_linkedin` | Official LinkedIn company profile URL | `linkedIn` (if contact add-on) or Deep Scraper | Not available (via Deep Scraper) | `companyLinkedinUrl` | Extracted from social links (`href*="linkedin.com/company"`) |
| **9** | `company_tiktok` | Official TikTok profile URL | `tikTok` (if contact add-on) or Deep Scraper | Not available (via Deep Scraper) | Not available (via Deep Scraper) | Extracted from social links (`href*="tiktok.com/@"`) |
| **10**| `company_youtube` | Official YouTube channel / page URL | `youtube` (if contact add-on) or Deep Scraper | Not available (via Deep Scraper) | Not available (via Deep Scraper) | Extracted from social links (`href*="youtube.com/"`) |
| **11**| `founder_name` | Name of Founder, Owner, or Principal | Deep Scraper / Knowledge resolution | Not available (via Deep Scraper) | `fullName` (if role is C-level / Founder / Owner) | Extracted from `/about`, `/team`, Impressum, or JSON-LD `Person` |
| **12**| `founder_emails` | Direct email addresses of the founder | Deep Scraper | Not available (via Deep Scraper) | `email` (if role is Founder / Owner) | Extracted from team bio mailto or verified domain patterns |
| **13**| `founder_phones` | Direct phone numbers of the founder | Deep Scraper | Not available (via Deep Scraper) | `mobilePhone` / direct phone (if Founder) | Extracted from team contact sections |
| **14**| `founder_socials`| Founder's personal LinkedIn / X URL | Deep Scraper | Not available (via Deep Scraper) | `linkedinUrl` / `profileUrl` (if Founder) | Extracted from executive bios / team cards |
| **15**| `manager_name` | Name of General Manager / Director | Deep Scraper / Knowledge resolution | Not available (via Deep Scraper) | `fullName` (if role is Director / Manager) | Extracted from `/about`, `/team`, Impressum, or JSON-LD `Person` |
| **16**| `manager_emails` | Direct email addresses of manager | Deep Scraper | Not available (via Deep Scraper) | `email` (if role is Director / Manager) | Extracted from team bio mailto or contact details |
| **17**| `manager_phones` | Direct phone numbers of manager | Deep Scraper | Not available (via Deep Scraper) | `mobilePhone` / direct phone (if Manager) | Extracted from team contact sections |
| **18**| `manager_socials`| Manager's personal LinkedIn / X URL | Deep Scraper | Not available (via Deep Scraper) | `linkedinUrl` / `profileUrl` (if Manager) | Extracted from executive bios / team cards |

---

## Extended Source Intelligence Fields (Stored in `extra` & Exported to Columns 19–25)

In addition to the core 18 attributes, the system records provider-specific intelligence in `extra` JSON and exports them to columns 19–25 of exports:

1. `source`: Identifies provider module (`google_maps`, `meta_ads`, `b2b_leads`).
2. `rating`: Google Maps rating (`totalScore`).
3. `reviews_count`: Total Google Maps reviews (`reviewsCount`).
4. `ad_count`: Total active ad creatives discovered in Meta Ad Library for this advertiser.
5. `ad_library_url`: Direct URL to Meta Ad Library advertiser page.
6. `company_size`: Employee headcount range (from B2B actor `employeeCounts` / `companySize`).
7. `decision_makers`: List of structured decision-maker profiles (`name`, `title`, `profileUrl`, `email`, `phone`).

---

## Data Truth & Fallback Guarantees

1. **No Data Fabrication**: If a field is not returned by the Apify actor or discovered by the deep scraper, `null` is saved to the database and rendered as `"Not Available"` or `"—"` in UI and exports.
2. **Honest Email Verification**: Emails extracted by the deep scraper are checked for RFC syntax and MX records. They are labelled `"found on website, domain has mail server"`, never fabricated or guessed via permutations.
3. **SSRF Guarded Web Scraping**: The deep scraper crawls only HTTP/HTTPS protocols, rejects private/loopback/link-local IPs (even following 3xx redirects), limits crawling to the homepage + up to 4 relevant same-domain pages, and times out strictly at 10s per page.
