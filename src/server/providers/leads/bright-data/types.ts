import type { RawLead, LeadSearchParams } from "../types";

export const DEFAULT_GMAPS_DATASET_ID = "gd_m8ebnr0q2qlklc02fz";
export const DEFAULT_META_DATASET_ID = "gd_l1vikf871t3fl47z5u";
export const DEFAULT_LINKEDIN_DATASET_ID = "gd_l1vikfnt1wgvvqz95w";

export type BrightDataLeadSource = "google_maps" | "meta_ads" | "linkedin";

export interface LeadScrapeSourceAdapter {
  source: BrightDataLeadSource;
  datasetId: string;
  search(params: LeadSearchParams, apiKey: string, baseUrl?: string): Promise<RawLead[]>;
}

export interface BrightDataProgressResponse {
  status: "running" | "ready" | "failed";
  message?: string;
  progress?: number;
}

export interface BrightDataTriggerResponse {
  snapshot_id: string;
}

/**
 * Raw record format returned by Bright Data Google Maps Dataset
 */
export interface BrightDataGmapsRawRecord {
  place_id?: string;
  cid?: string;
  data_id?: string;
  id?: string;
  name?: string;
  title?: string;
  company_name?: string;
  business_name?: string;
  website?: string;
  link?: string;
  url?: string;
  phone?: string;
  phone_number?: string;
  phone_raw?: string;
  formatted_phone_number?: string;
  address?: string;
  formatted_address?: string;
  street_address?: string;
  city?: string;
  state?: string;
  country?: string;
  country_code?: string;
  category?: string;
  category_name?: string;
  business_type?: string;
  type?: string;
  rating?: number | string;
  review_rating?: number | string;
  stars?: number | string;
  reviews_count?: number | string;
  review_count?: number | string;
  reviews?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  email?: string;
  emails?: string[];
  facebook?: string;
  facebook_url?: string;
  instagram?: string;
  instagram_url?: string;
  linkedin?: string;
  linkedin_url?: string;
  [key: string]: any;
}

/**
 * Raw record format returned by Bright Data Meta Ads Library Dataset
 */
export interface BrightDataMetaRawRecord {
  ad_id?: string;
  page_id?: string;
  id?: string;
  page_name?: string;
  advertiser_name?: string;
  company_name?: string;
  title?: string;
  link_url?: string;
  destination_url?: string;
  website?: string;
  landing_page?: string;
  phone?: string;
  phone_number?: string;
  address?: string;
  page_location?: string;
  location?: string;
  city?: string;
  country?: string;
  category?: string;
  page_category?: string;
  email?: string;
  emails?: string[];
  page_profile_uri?: string;
  facebook_page?: string;
  page_url?: string;
  url?: string;
  instagram_url?: string;
  instagram_handle?: string;
  linkedin_url?: string;
  [key: string]: any;
}

/**
 * Raw record format returned by Bright Data LinkedIn Dataset
 */
export interface BrightDataLinkedInRawRecord {
  linkedin_id?: string;
  company_id?: string;
  id?: string;
  company_name?: string;
  name?: string;
  title?: string;
  website?: string;
  company_url?: string;
  website_url?: string;
  phone?: string;
  phone_number?: string;
  headquarters?: string;
  address?: string;
  location?: string;
  city?: string;
  country?: string;
  industry?: string;
  company_type?: string;
  category?: string;
  email?: string;
  emails?: string[];
  url?: string;
  linkedin_url?: string;
  profile_url?: string;
  [key: string]: any;
}
