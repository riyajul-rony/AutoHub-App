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
  extra?: Record<string, any>;
};

export interface LinkedInDecisionMaker {
  name: string;
  title: string;
  profileUrl: string;
  linkedinId?: string;
  isVerifiedRole?: boolean;
  email?: string;
  phone?: string;
}

export type LeadSearchParams = {
  keyword: string;
  location: string;
  maxResults?: number;
  findEmails?: boolean;
  skipDuplicates?: boolean;
  userApiKey?: string;
  onlyWithWebsite?: boolean;
  country?: string;
  city?: string;
  adStatus?: "active" | "all";
  titles?: string[];
  findDecisionMakers?: boolean;
  maxDecisionMakers?: number;
};

export interface LeadSourceProvider {
  id: "google_maps" | "meta_ads" | "linkedin";
  search(params: LeadSearchParams): Promise<RawLead[]>;
}

