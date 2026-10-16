export type RawLead = {
  sourceRef: string; // place_id or ad_id
  companyName: string;
  website?: string;
  phoneRaw?: string;
  phoneE164?: string;
  email?: string;
  operator?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  address?: string;
  city?: string;
  country?: string;
  businessType?: string;
  rating?: number;
  reviewsCount?: number;
  latitude?: number;
  longitude?: number;
};

export type LeadSearchParams = {
  keyword: string;
  location: string;
  maxResults?: number;
  findEmails?: boolean;
  skipDuplicates?: boolean;
  userApiKey?: string;
  onlyWithWebsite?: boolean;
};

export interface LeadSourceProvider {
  id: "google_maps" | "meta_ads" | "linkedin";
  search(params: LeadSearchParams): Promise<RawLead[]>;
}
