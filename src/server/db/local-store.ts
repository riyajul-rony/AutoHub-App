import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const STORE_PATH = path.resolve(DATA_DIR, "dev_store.json");

interface StoreSchema {
  api_keys: any[];
  social_accounts: any[];
  social_campaigns: any[];
  post_runs: any[];
}

function getInitialStore(): StoreSchema {
  return {
    api_keys: [],
    social_accounts: [],
    social_campaigns: [],
    post_runs: [],
  };
}

let inMemoryStore: StoreSchema | null = null;

function loadStore(): StoreSchema {
  if (inMemoryStore) return inMemoryStore;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      inMemoryStore = { ...getInitialStore(), ...JSON.parse(raw) };
      return inMemoryStore!;
    }
  } catch (err) {
    console.warn("[LocalDevStore] Error loading local store, using default", err);
  }
  inMemoryStore = getInitialStore();
  saveStore();
  return inMemoryStore;
}

function saveStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(inMemoryStore, null, 2), "utf8");
  } catch (err) {
    console.warn("[LocalDevStore] Failed to persist dev store to disk", err);
  }
}

export const localDevStore = {
  // --- Social Accounts ---
  getSocialAccounts: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    return filter ? store.social_accounts.filter(filter) : store.social_accounts;
  },
  findSocialAccount: (filter: (item: any) => boolean) => {
    const store = loadStore();
    return store.social_accounts.find(filter) || null;
  },
  saveSocialAccount: (item: any) => {
    const store = loadStore();
    const idx = store.social_accounts.findIndex((a) => a.id === item.id || (a.provider === item.provider && a.external_id === item.external_id));
    if (idx >= 0) {
      store.social_accounts[idx] = { ...store.social_accounts[idx], ...item, updated_at: new Date().toISOString() };
    } else {
      store.social_accounts.push({
        id: item.id || `acc-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...item,
      });
    }
    saveStore();
    return idx >= 0 ? store.social_accounts[idx] : store.social_accounts[store.social_accounts.length - 1];
  },
  deleteSocialAccount: (id: string) => {
    const store = loadStore();
    store.social_accounts = store.social_accounts.filter((a) => a.id !== id);
    saveStore();
  },

  // --- Social Campaigns ---
  getCampaigns: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    return filter ? store.social_campaigns.filter(filter) : store.social_campaigns;
  },
  findCampaign: (filter: (item: any) => boolean) => {
    const store = loadStore();
    return store.social_campaigns.find(filter) || null;
  },
  saveCampaign: (item: any) => {
    const store = loadStore();
    const idx = store.social_campaigns.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      store.social_campaigns[idx] = { ...store.social_campaigns[idx], ...item, updated_at: new Date().toISOString() };
    } else {
      store.social_campaigns.unshift({
        id: item.id || `camp-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "active",
        ...item,
      });
    }
    saveStore();
    return idx >= 0 ? store.social_campaigns[idx] : store.social_campaigns[0];
  },
  deleteCampaign: (id: string) => {
    const store = loadStore();
    store.social_campaigns = store.social_campaigns.filter((c) => c.id !== id);
    store.post_runs = store.post_runs.filter((p) => p.campaign_id !== id);
    saveStore();
  },

  // --- Post Runs ---
  getPostRuns: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    return filter ? store.post_runs.filter(filter) : store.post_runs;
  },
  findPostRun: (filter: (item: any) => boolean) => {
    const store = loadStore();
    return store.post_runs.find(filter) || null;
  },
  savePostRun: (item: any) => {
    const store = loadStore();
    const idx = store.post_runs.findIndex((p) => p.id === item.id);
    if (idx >= 0) {
      store.post_runs[idx] = { ...store.post_runs[idx], ...item, updated_at: new Date().toISOString() };
    } else {
      store.post_runs.unshift({
        id: item.id || `post-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...item,
      });
    }
    saveStore();
    return idx >= 0 ? store.post_runs[idx] : store.post_runs[0];
  },
  deletePostRun: (id: string) => {
    const store = loadStore();
    store.post_runs = store.post_runs.filter((p) => p.id !== id);
    saveStore();
  },

  // --- API Keys ---
  getApiKeys: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    return filter ? store.api_keys.filter(filter) : store.api_keys;
  },
  findApiKey: (filter: (item: any) => boolean) => {
    const store = loadStore();
    return store.api_keys.find(filter) || null;
  },
  saveApiKey: (item: any) => {
    const store = loadStore();
    const idx = store.api_keys.findIndex((k) => k.id === item.id);
    if (idx >= 0) {
      store.api_keys[idx] = { ...store.api_keys[idx], ...item };
    } else {
      store.api_keys.unshift({
        id: item.id || `key-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        status: "active",
        ...item,
      });
    }
    saveStore();
    return idx >= 0 ? store.api_keys[idx] : store.api_keys[0];
  },
  deleteApiKey: (id: string) => {
    const store = loadStore();
    store.api_keys = store.api_keys.filter((k) => k.id !== id);
    saveStore();
  },
};
