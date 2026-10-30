import { formatSocialUrl } from "./enrichment";

/**
 * Standardizes raw database lead records into the 18-attribute comprehensive structure
 * for table rendering, TSV/CSV export, and modal inspections.
 */
export function formatLeadRecord(r: any, locationHint = "") {
  const name = r.company_name || r.companyName || "Business";
  const loc = r.address || r.city || locationHint || "Not Available";
  const phone = (r.phone || r.phone_raw || r.phoneRaw || r.phoneE164 || "").replace(/^\+/, "").trim();
  const prof = r.extra?.profile;

  const companyEmails: string[] = prof?.company_emails?.length
    ? prof.company_emails
    : r.extra?.company_email
    ? [r.extra.company_email]
    : r.email
    ? [r.email]
    : [];

  const companyPhones: string[] = prof?.company_phones?.length
    ? prof.company_phones
    : phone
    ? [phone]
    : [];

  const founderName = prof?.founder_name || r.extra?.founder_name || undefined;
  const managerName = prof?.manager_name || r.extra?.manager_name || undefined;

  const founderEmailsList = founderName && prof?.founder_emails?.length
    ? prof.founder_emails
    : founderName && r.extra?.founder_email
    ? [r.extra.founder_email]
    : [];

  const founderPhonesList = founderName && prof?.founder_phones?.length
    ? prof.founder_phones
    : founderName && r.extra?.founder_phones?.length
    ? r.extra.founder_phones
    : [];

  const founderSocialsList = founderName && prof?.founder_socials?.length
    ? prof.founder_socials
    : founderName && r.extra?.founder_socials?.length
    ? r.extra.founder_socials
    : [];

  const managerEmailsList = managerName && prof?.manager_emails?.length
    ? prof.manager_emails
    : managerName && r.extra?.manager_email
    ? [r.extra.manager_email]
    : [];

  const managerPhonesList = managerName && prof?.manager_phones?.length
    ? prof.manager_phones
    : managerName && r.extra?.manager_phones?.length
    ? r.extra.manager_phones
    : [];

  const managerSocialsList = managerName && prof?.manager_socials?.length
    ? prof.manager_socials
    : managerName && r.extra?.manager_socials?.length
    ? r.extra.manager_socials
    : [];

  return {
    // 1-10 Company details
    company_name: name,
    company_emails: companyEmails,
    company_phones: companyPhones,
    company_website: r.website || prof?.company_website || undefined,
    company_facebook: formatSocialUrl(prof?.company_facebook || r.facebook_url, "facebook"),
    company_instagram: formatSocialUrl(prof?.company_instagram || r.instagram_url, "instagram"),
    company_linkedin: formatSocialUrl(prof?.company_linkedin || r.linkedin_url, "linkedin"),
    company_tiktok: formatSocialUrl(prof?.company_tiktok, "tiktok"),
    company_youtube: formatSocialUrl(prof?.company_youtube, "youtube"),
    company_location: loc,
    address: r.address || loc,
    city: r.city || locationHint,

    // 11-14 Founder details
    founder_name: founderName,
    founder_phones: founderPhonesList,
    founder_emails: founderEmailsList,
    founder_socials: founderSocialsList,

    // 15-18 Manager details
    manager_name: managerName,
    manager_emails: managerEmailsList,
    manager_phones: managerPhonesList,
    manager_socials: managerSocialsList,

    // Aliases
    phone: phone || undefined,
    website: r.website || undefined,
    rating: r.rating ? Number(r.rating) : undefined,
    facebook_url: formatSocialUrl(prof?.company_facebook || r.facebook_url, "facebook"),
    instagram_url: formatSocialUrl(prof?.company_instagram || r.instagram_url, "instagram"),
    linkedin_url: formatSocialUrl(prof?.company_linkedin || r.linkedin_url, "linkedin"),

    // Meta Ads / LinkedIn / Source specific attributes
    ad_count: r.extra?.ad_count || undefined,
    ad_snippet: r.extra?.ad_snippet || undefined,
    ad_library_url: r.extra?.ad_library_url || undefined,
    platforms: r.extra?.platforms || undefined,
    start_date: r.extra?.start_date || undefined,
    decision_makers: r.extra?.decision_makers || [],
    company_size: r.extra?.company_size || undefined,
    industry: r.extra?.industry || r.business_type || undefined,
    extra: r.extra || undefined,
  };
}
