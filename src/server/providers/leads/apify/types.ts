export type ApifyModule = "google_maps" | "meta_ads" | "b2b_leads";

export type GoogleMapsScraperProvider = "kaix";

export type ApifyKeyStatus = "active" | "disabled" | "cooldown";

export interface ApifyKeyRecord {
  id: string;
  label: string;
  token_enc: string;
  token_last4: string;
  account_email?: string | null;
  plan_name?: string | null;
  status: ApifyKeyStatus;
  max_concurrent_jobs: number;
  cooldown_until?: Date | string | null;
  last_error_reason?: string | null;
  last_used_at?: Date | string | null;
  total_runs: number;
  total_cost_usd: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ApifyActorConfig {
  google_maps: string; // "kaix/google-maps-places-scraper"
  meta_ads: string; // "igolaizola/facebook-ad-library-scraper"
  b2b_leads: string; // "disarming_screw-owner/1-2-000-leads-apollo-scraper-replacement-b2b-b2c-leads"
}

export interface ApifyGlobalLimits {
  maxLinesPerRun: number;
  maxLeadsPerRun: Record<ApifyModule, number>;
  maxSpendUsd: number;
  maxConcurrentPerUser: number;
  maxRunsPerHour: number;
  enablePaidContacts?: boolean;
}

export interface ApifyUnitPrices {
  google_maps: number; // cost per place estimate (~$0.00008)
  meta_ads: number; // cost per ad estimate (~$0.0008)
  b2b_leads: number; // cost per lead estimate (~$0.002)
}

export interface ApifySettings {
  google_maps_provider?: GoogleMapsScraperProvider;
  actors: ApifyActorConfig;
  limits: ApifyGlobalLimits;
  unitPrices: ApifyUnitPrices;
}

export type PartialApifySettings = Partial<Omit<ApifySettings, "actors" | "limits" | "unitPrices">> & {
  actors?: Partial<ApifyActorConfig>;
  limits?: Partial<Omit<ApifyGlobalLimits, "maxLeadsPerRun">> & {
    maxLeadsPerRun?: Partial<Record<ApifyModule, number>>;
  };
  unitPrices?: Partial<ApifyUnitPrices>;
};

export type ApifyRunStatus =
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "TIMED-OUT"
  | "ABORTED";

export interface ApifyRunDetails {
  id: string;
  actId: string;
  status: ApifyRunStatus;
  defaultDatasetId: string;
  startedAt?: string;
  finishedAt?: string;
  usageTotalUsd?: number;
  chargeUsd?: number;
  stats?: {
    itemCount?: number;
    durationMillis?: number;
  };
  statusMessage?: string;
}

export interface ApifyConnectionTestResult {
  ok: boolean;
  username?: string;
  plan?: string;
  error?: string;
}
