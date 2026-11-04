// In-memory test mock store. File-based dev_store.json has been removed in favor of real PostgreSQL.


const DEFAULT_ADMIN_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@example.com",
  name: "Admin User",
  password_hash: "$argon2id$v=19$m=19456,t=2,p=1$placeholder",
  email_verified_at: new Date("2026-01-01T00:00:00.000Z"),
  onboarded_at: new Date("2026-01-01T00:00:00.000Z"),
  role: "super_admin",
  status: "active",
  plan: "free",
  timezone: "Asia/Dhaka",
};

interface StoreSchema {
  users: any[];
  sessions: any[];
  api_keys: any[];
  social_accounts: any[];
  social_campaigns: any[];
  post_runs: any[];
  email_accounts: any[];
  outreach_campaigns: any[];
  campaign_recipients: any[];
  email_messages: any[];
  followup_sequences: any[];
  campaign_steps: any[];
  tracking_events: any[];
  suppressions: any[];
  lead_searches: any[];
  leads: any[];
  admin_audit_logs: any[];
  activity_logs: any[];
  plans: any[];
  user_limit_overrides: any[];
  usage_counters: any[];
  subscriptions: any[];
  payments: any[];
  processed_webhook_events: any[];
  error_logs: any[];
  system_settings: any[];
  verification_tokens: any[];
  apify_usage_logs: any[];
  apify_keys: any[];
}

function getInitialStore(): StoreSchema {
  return {
    users: [{ ...DEFAULT_ADMIN_USER }],
    sessions: [],
    verification_tokens: [],
    api_keys: [],
    social_accounts: [],
    social_campaigns: [],
    post_runs: [],
    email_accounts: [],
    outreach_campaigns: [],
    campaign_recipients: [],
    email_messages: [],
    followup_sequences: [],
    campaign_steps: [],
    tracking_events: [],
    suppressions: [],
    lead_searches: [],
    leads: [],
    admin_audit_logs: [],
    activity_logs: [],
    plans: [],
    user_limit_overrides: [],
    usage_counters: [],
    subscriptions: [],
    payments: [],
    processed_webhook_events: [],
    error_logs: [],
    system_settings: [],
    apify_usage_logs: [],
    apify_keys: [],
  };
}

let inMemoryStore: StoreSchema | null = null;

function loadStore(): StoreSchema {
  if (!inMemoryStore) {
    inMemoryStore = getInitialStore();
  }
  return inMemoryStore;
}

function saveStore(_storeToSave?: StoreSchema): void {
  // Pure in-memory mock for test isolation - zero disk persistence
}

export const localDevStore = {
  // --- Users ---
  getUsers: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.users) store.users = [{ ...DEFAULT_ADMIN_USER }];
    return filter ? store.users.filter(filter) : store.users;
  },
  findUser: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.users) store.users = [{ ...DEFAULT_ADMIN_USER }];
    return store.users.find(filter) || null;
  },
  saveUser: (item: any) => {
    const store = loadStore();
    if (!store.users) store.users = [{ ...DEFAULT_ADMIN_USER }];
    const idx = store.users.findIndex((u) => u.id === item.id || (u.email && u.email.toLowerCase() === item.email?.toLowerCase()));
    if (idx >= 0) {
      store.users[idx] = { ...store.users[idx], ...item };
      saveStore();
      return store.users[idx];
    }
    const user = {
      id: item.id || `user_${Date.now()}`,
      created_at: new Date().toISOString(),
      role: item.role || "user",
      status: "active",
      plan: "free",
      email_verified_at: item.email_verified_at !== undefined ? item.email_verified_at : null,
      onboarded_at: item.onboarded_at !== undefined ? item.onboarded_at : null,
      ...item,
    };
    store.users.unshift(user);
    saveStore();
    return user;
  },
  updateUser: (idOrEmail: string, data: any) => {
    const store = loadStore();
    if (!store.users) store.users = [{ ...DEFAULT_ADMIN_USER }];
    const idx = store.users.findIndex((u) => u.id === idOrEmail || (u.email && u.email.toLowerCase() === idOrEmail?.toLowerCase()));
    if (idx >= 0) {
      store.users[idx] = { ...store.users[idx], ...data };
      saveStore();
      return store.users[idx];
    }
    return null;
  },

  // --- Sessions ---
  getSessions: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.sessions) store.sessions = [];
    return filter ? store.sessions.filter(filter) : store.sessions;
  },
  findSession: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.sessions) store.sessions = [];
    const sess = store.sessions.find(filter);
    if (!sess) return null;
    return {
      ...sess,
      expires_at: sess.expires_at ? new Date(sess.expires_at) : new Date(Date.now() + 30 * 86400000),
    };
  },
  saveSession: (item: any) => {
    const store = loadStore();
    if (!store.sessions) store.sessions = [];
    const idx = store.sessions.findIndex((s) => s.id === item.id || s.token_hash === item.token_hash);
    if (idx >= 0) {
      store.sessions[idx] = { ...store.sessions[idx], ...item };
      saveStore();
      return store.sessions[idx];
    }
    const sess = {
      id: item.id || `sess_${Date.now()}`,
      created_at: new Date().toISOString(),
      ...item,
    };
    store.sessions.unshift(sess);
    saveStore();
    return sess;
  },
  updateSession: (id: string, data: any) => {
    const store = loadStore();
    if (!store.sessions) store.sessions = [];
    const idx = store.sessions.findIndex((s) => s.id === id);
    if (idx >= 0) {
      store.sessions[idx] = { ...store.sessions[idx], ...data };
      saveStore();
      return store.sessions[idx];
    }
    return null;
  },
  deleteSessions: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.sessions) store.sessions = [];
    store.sessions = store.sessions.filter((s) => !filter(s));
    saveStore();
  },

  // --- Verification Tokens ---
  getVerificationTokens: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.verification_tokens) store.verification_tokens = [];
    return filter ? store.verification_tokens.filter(filter) : store.verification_tokens;
  },
  findVerificationToken: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.verification_tokens) store.verification_tokens = [];
    return store.verification_tokens.find(filter) || null;
  },
  saveVerificationToken: (item: any) => {
    const store = loadStore();
    if (!store.verification_tokens) store.verification_tokens = [];
    const idx = store.verification_tokens.findIndex((t) => t.id === item.id || (t.token_hash && t.token_hash === item.token_hash));
    if (idx >= 0) {
      store.verification_tokens[idx] = { ...store.verification_tokens[idx], ...item };
      saveStore();
      return store.verification_tokens[idx];
    }
    const token = {
      id: item.id || `vt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date(),
      ...item,
    };
    store.verification_tokens.push(token);
    saveStore();
    return token;
  },
  updateVerificationToken: (idOrHash: string, data: any) => {
    const store = loadStore();
    if (!store.verification_tokens) store.verification_tokens = [];
    const idx = store.verification_tokens.findIndex((t) => t.id === idOrHash || t.token_hash === idOrHash);
    if (idx >= 0) {
      store.verification_tokens[idx] = { ...store.verification_tokens[idx], ...data };
      saveStore();
      return store.verification_tokens[idx];
    }
    return null;
  },
  updateManyVerificationTokens: (filter: (t: any) => boolean, data: any) => {
    const store = loadStore();
    if (!store.verification_tokens) store.verification_tokens = [];
    let count = 0;
    for (let i = 0; i < store.verification_tokens.length; i++) {
      if (filter(store.verification_tokens[i])) {
        store.verification_tokens[i] = { ...store.verification_tokens[i], ...data };
        count++;
      }
    }
    saveStore();
    return count;
  },

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
  deleteSocialAccount: (id: string, userId?: string) => {
    const store = loadStore();
    store.social_accounts = store.social_accounts.filter(
      (a) => !(a.id === id && (!userId || a.user_id === userId))
    );
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
  deleteCampaign: (id: string, userId?: string) => {
    const store = loadStore();
    store.social_campaigns = store.social_campaigns.filter(
      (c) => !(c.id === id && (!userId || c.user_id === userId))
    );
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
  deletePostRun: (id: string, userId?: string) => {
    const store = loadStore();
    store.post_runs = store.post_runs.filter(
      (p) => !(p.id === id && (!userId || p.user_id === userId))
    );
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

  // --- Email Accounts ---
  getEmailAccounts: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.email_accounts) store.email_accounts = [];
    return filter ? store.email_accounts.filter(filter) : store.email_accounts;
  },
  findEmailAccount: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.email_accounts) store.email_accounts = [];
    return store.email_accounts.find(filter) || null;
  },
  saveEmailAccount: (item: any) => {
    const store = loadStore();
    if (!store.email_accounts) store.email_accounts = [];
    const idx = store.email_accounts.findIndex((a) => a.id === item.id || (a.user_id === item.user_id && a.from_email === item.from_email));
    if (idx >= 0) {
      store.email_accounts[idx] = { ...store.email_accounts[idx], ...item, updated_at: new Date().toISOString() };
    } else {
      store.email_accounts.unshift({
        id: item.id || `ea-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        status: item.status || "active",
        hourly_limit: item.hourly_limit ?? 25,
        daily_limit: item.daily_limit ?? 150,
        ...item,
      });
    }
    saveStore();
    return idx >= 0 ? store.email_accounts[idx] : store.email_accounts[0];
  },
  deleteEmailAccount: (id: string) => {
    const store = loadStore();
    if (!store.email_accounts) store.email_accounts = [];
    store.email_accounts = store.email_accounts.filter((a) => a.id !== id);
    saveStore();
  },

  // --- Outreach Campaigns ---
  getOutreachCampaigns: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.outreach_campaigns) store.outreach_campaigns = [];
    return filter ? store.outreach_campaigns.filter(filter) : store.outreach_campaigns;
  },
  findOutreachCampaign: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.outreach_campaigns) store.outreach_campaigns = [];
    return store.outreach_campaigns.find(filter) || null;
  },
  saveOutreachCampaign: (item: any) => {
    const store = loadStore();
    if (!store.outreach_campaigns) store.outreach_campaigns = [];
    const idx = store.outreach_campaigns.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      store.outreach_campaigns[idx] = { ...store.outreach_campaigns[idx], ...item, updated_at: new Date().toISOString() };
    } else {
      store.outreach_campaigns.unshift({
        id: item.id || `oc-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: item.status || "draft",
        ...item,
      });
    }
    saveStore();
    return idx >= 0 ? store.outreach_campaigns[idx] : store.outreach_campaigns[0];
  },
  deleteOutreachCampaign: (id: string) => {
    const store = loadStore();
    if (!store.outreach_campaigns) store.outreach_campaigns = [];
    store.outreach_campaigns = store.outreach_campaigns.filter((c) => c.id !== id);
    saveStore();
  },

  // --- Campaign Recipients ---
  getRecipients: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.campaign_recipients) store.campaign_recipients = [];
    return filter ? store.campaign_recipients.filter(filter) : store.campaign_recipients;
  },
  findRecipient: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.campaign_recipients) store.campaign_recipients = [];
    return store.campaign_recipients.find(filter) || null;
  },
  saveRecipient: (item: any) => {
    const store = loadStore();
    if (!store.campaign_recipients) store.campaign_recipients = [];
    const idx = store.campaign_recipients.findIndex((r) => r.id === item.id);
    if (idx >= 0) {
      store.campaign_recipients[idx] = { ...store.campaign_recipients[idx], ...item };
    } else {
      store.campaign_recipients.push({
        id: item.id || `cr-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        status: item.status || "queued",
        current_step: 0,
        ...item,
      });
    }
    saveStore();
    return idx >= 0 ? store.campaign_recipients[idx] : store.campaign_recipients[store.campaign_recipients.length - 1];
  },

  // --- Suppressions ---
  getSuppressions: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.suppressions) store.suppressions = [];
    return filter ? store.suppressions.filter(filter) : store.suppressions;
  },
  saveSuppression: (item: any) => {
    const store = loadStore();
    if (!store.suppressions) store.suppressions = [];
    const idx = store.suppressions.findIndex((s) => s.user_id === item.user_id && s.email === item.email);
    if (idx < 0) {
      store.suppressions.push({
        id: item.id || `sup-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        ...item,
      });
    }
    saveStore();
    return item;
  },

  // --- Campaign Steps (Follow-up Steps) ---
  getCampaignSteps: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.campaign_steps) store.campaign_steps = [];
    return filter ? store.campaign_steps.filter(filter) : store.campaign_steps;
  },
  findCampaignStep: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.campaign_steps) store.campaign_steps = [];
    return store.campaign_steps.find(filter) || null;
  },
  saveCampaignStep: (item: any) => {
    const store = loadStore();
    if (!store.campaign_steps) store.campaign_steps = [];
    const idx = store.campaign_steps.findIndex(
      (s) => (item.id && s.id === item.id) || (s.campaign_id === item.campaign_id && s.step_no === item.step_no)
    );
    if (idx >= 0) {
      store.campaign_steps[idx] = { ...store.campaign_steps[idx], ...item };
    } else {
      store.campaign_steps.push({
        id: item.id || `cs-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        delay_days: 3,
        mode: "custom",
        ...item,
      });
    }
    saveStore();
    return idx >= 0 ? store.campaign_steps[idx] : store.campaign_steps[store.campaign_steps.length - 1];
  },
  deleteCampaignSteps: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.campaign_steps) store.campaign_steps = [];
    const beforeCount = store.campaign_steps.length;
    store.campaign_steps = filter ? store.campaign_steps.filter((s) => !filter(s)) : [];
    saveStore();
    return { count: beforeCount - store.campaign_steps.length };
  },

  // --- Tracking Events ---
  getTrackingEvents: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.tracking_events) store.tracking_events = [];
    return filter ? store.tracking_events.filter(filter) : store.tracking_events;
  },
  saveTrackingEvent: (item: any) => {
    const store = loadStore();
    if (!store.tracking_events) store.tracking_events = [];
    const newEvent = {
      id: item.id || `te-${Math.random().toString(36).slice(2, 10)}`,
      created_at: new Date().toISOString(),
      ...item,
    };
    store.tracking_events.push(newEvent);
    saveStore();
    return newEvent;
  },

  // --- Lead Searches ---
  getLeadSearches: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.lead_searches) store.lead_searches = [];
    return filter ? store.lead_searches.filter(filter) : store.lead_searches;
  },
  findLeadSearch: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.lead_searches) store.lead_searches = [];
    return store.lead_searches.find(filter) || null;
  },
  saveLeadSearch: (item: any) => {
    const store = loadStore();
    if (!store.lead_searches) store.lead_searches = [];
    const idx = store.lead_searches.findIndex((s) => s.id === item.id);
    if (idx >= 0) {
      store.lead_searches[idx] = { ...store.lead_searches[idx], ...item };
    } else {
      store.lead_searches.unshift({
        id: item.id || `ls-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        status: item.status || "queued",
        found_count: 0,
        enriched_count: 0,
        ...item,
      });
    }
    saveStore();
    return idx >= 0 ? store.lead_searches[idx] : store.lead_searches[0];
  },

  // --- Leads ---
  getLeads: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.leads) store.leads = [];
    return filter ? store.leads.filter(filter) : store.leads;
  },
  findLead: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.leads) store.leads = [];
    return store.leads.find(filter) || null;
  },
  saveLead: (item: any) => {
    const store = loadStore();
    if (!store.leads) store.leads = [];
    // Deduplicate by user_id and dedupe_key (when present)
    const idx = store.leads.findIndex(
      (l) => l.user_id === item.user_id && Boolean(item.dedupe_key) && l.dedupe_key === item.dedupe_key
    );
    if (idx >= 0) {
      store.leads[idx] = { ...store.leads[idx], ...item };
      saveStore();
      return store.leads[idx];
    }
    const newLead = {
      id: item.id || `lead-${Math.random().toString(36).slice(2, 10)}`,
      collected_at: new Date().toISOString(),
      status: item.status || "new",
      ...item,
    };
    store.leads.unshift(newLead);
    saveStore();
    return newLead;
  },
  updateLead: (id: string, data: any) => {
    const store = loadStore();
    if (!store.leads) store.leads = [];
    const idx = store.leads.findIndex((l) => l.id === id);
    if (idx >= 0) {
      store.leads[idx] = { ...store.leads[idx], ...data, updated_at: new Date().toISOString() };
      saveStore();
      return store.leads[idx];
    }
    return null;
  },

  // --- Email Messages ---
  getEmailMessages: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.email_messages) store.email_messages = [];
    return filter ? store.email_messages.filter(filter) : store.email_messages;
  },
  saveEmailMessage: (item: any) => {
    const store = loadStore();
    if (!store.email_messages) store.email_messages = [];
    const msg = {
      id: item.id || `msg-${Math.random().toString(36).slice(2, 10)}`,
      created_at: new Date().toISOString(),
      sent_at: item.sent_at || new Date().toISOString(),
      ...item,
    };
    store.email_messages.unshift(msg);
    saveStore();
    return msg;
  },

  // --- Followup Sequences ---
  getFollowupSequences: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.followup_sequences) store.followup_sequences = [];
    return filter ? store.followup_sequences.filter(filter) : store.followup_sequences;
  },
  findFollowupSequence: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.followup_sequences) store.followup_sequences = [];
    return store.followup_sequences.find(filter) || null;
  },
  saveFollowupSequence: (item: any) => {
    const store = loadStore();
    if (!store.followup_sequences) store.followup_sequences = [];
    const idx = store.followup_sequences.findIndex(
      (s) => s.id === item.id || (s.campaign_id && s.campaign_id === item.campaign_id)
    );
    if (idx >= 0) {
      store.followup_sequences[idx] = { ...store.followup_sequences[idx], ...item };
    } else {
      store.followup_sequences.unshift({
        id: item.id || `seq-${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
        status: item.status || "active",
        steps: [],
        ...item,
      });
    }
    saveStore();
    return idx >= 0 ? store.followup_sequences[idx] : store.followup_sequences[0];
  },
  getAuditLogs: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.admin_audit_logs) store.admin_audit_logs = [];
    return filter ? store.admin_audit_logs.filter(filter) : store.admin_audit_logs;
  },
  saveAuditLog: (log: any) => {
    const store = loadStore();
    if (!store.admin_audit_logs) store.admin_audit_logs = [];
    const item = {
      id: log.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date(),
      ...log,
    };
    store.admin_audit_logs.unshift(item);
    saveStore();
    return item;
  },
  deleteAuditLogs: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.admin_audit_logs) store.admin_audit_logs = [];
    if (!filter) {
      const count = store.admin_audit_logs.length;
      store.admin_audit_logs = [];
      saveStore();
      return { count };
    }
    const beforeCount = store.admin_audit_logs.length;
    store.admin_audit_logs = store.admin_audit_logs.filter((item) => !filter(item));
    saveStore();
    return { count: beforeCount - store.admin_audit_logs.length };
  },

  // --- Activity Logs ---
  getActivityLogs: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.activity_logs) store.activity_logs = [];
    return filter ? store.activity_logs.filter(filter) : [...store.activity_logs];
  },
  saveActivityLog: (log: any) => {
    const store = loadStore();
    if (!store.activity_logs) store.activity_logs = [];
    const item = {
      id: log.id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
      ...log,
    };
    store.activity_logs.unshift(item);
    saveStore();
    return item;
  },
  deleteActivityLogs: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.activity_logs) store.activity_logs = [];
    if (!filter) {
      const count = store.activity_logs.length;
      store.activity_logs = [];
      saveStore();
      return { count };
    }
    const beforeCount = store.activity_logs.length;
    store.activity_logs = store.activity_logs.filter((item) => !filter(item));
    saveStore();
    return { count: beforeCount - store.activity_logs.length };
  },

  // --- Plans & Limits ---
  getPlans: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.plans) store.plans = [];
    return filter ? store.plans.filter(filter) : store.plans;
  },
  findPlan: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.plans) store.plans = [];
    return store.plans.find(filter) || null;
  },
  savePlan: (item: any) => {
    const store = loadStore();
    if (!store.plans) store.plans = [];
    const idx = store.plans.findIndex((p) => p.id === item.id || (p.slug && p.slug === item.slug));
    if (idx >= 0) {
      store.plans[idx] = { ...store.plans[idx], ...item, updated_at: new Date().toISOString() };
      saveStore();
      return store.plans[idx];
    }
    const newPlan = {
      id: item.id || `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: item.is_active !== undefined ? item.is_active : true,
      features: item.features || [],
      monthly_leads: item.monthly_leads ?? 100,
      monthly_social_posts: item.monthly_social_posts ?? 30,
      monthly_outreach_emails: item.monthly_outreach_emails ?? 100,
      max_social_accounts: item.max_social_accounts ?? 2,
      max_email_accounts: item.max_email_accounts ?? 1,
      max_campaigns: item.max_campaigns ?? 2,
      ...item,
    };
    store.plans.push(newPlan);
    saveStore();
    return newPlan;
  },
  updatePlan: (id: string, data: any) => {
    const store = loadStore();
    if (!store.plans) store.plans = [];
    const idx = store.plans.findIndex((p) => p.id === id || p.slug === id);
    if (idx >= 0) {
      store.plans[idx] = { ...store.plans[idx], ...data, updated_at: new Date().toISOString() };
      saveStore();
      return store.plans[idx];
    }
    return null;
  },
  deletePlan: (id: string) => {
    const store = loadStore();
    if (!store.plans) store.plans = [];
    const idx = store.plans.findIndex((p) => p.id === id || p.slug === id);
    if (idx >= 0) {
      const removed = store.plans.splice(idx, 1)[0];
      saveStore();
      return removed;
    }
    return null;
  },

  // --- User Limit Overrides ---
  getUserLimitOverrides: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.user_limit_overrides) store.user_limit_overrides = [];
    return filter ? store.user_limit_overrides.filter(filter) : store.user_limit_overrides;
  },
  findUserLimitOverride: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.user_limit_overrides) store.user_limit_overrides = [];
    return store.user_limit_overrides.find(filter) || null;
  },
  saveUserLimitOverride: (item: any) => {
    const store = loadStore();
    if (!store.user_limit_overrides) store.user_limit_overrides = [];
    const idx = store.user_limit_overrides.findIndex((o) => o.user_id === item.user_id);
    if (idx >= 0) {
      store.user_limit_overrides[idx] = { ...store.user_limit_overrides[idx], ...item, updated_at: new Date().toISOString() };
      saveStore();
      return store.user_limit_overrides[idx];
    }
    const newOverride = {
      id: item.id || `ovr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...item,
    };
    store.user_limit_overrides.push(newOverride);
    saveStore();
    return newOverride;
  },
  deleteUserLimitOverride: (userId: string) => {
    const store = loadStore();
    if (!store.user_limit_overrides) store.user_limit_overrides = [];
    const idx = store.user_limit_overrides.findIndex((o) => o.user_id === userId);
    if (idx >= 0) {
      const removed = store.user_limit_overrides.splice(idx, 1)[0];
      saveStore();
      return removed;
    }
    return null;
  },

  // --- Usage Counters ---
  getUsageCounters: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.usage_counters) store.usage_counters = [];
    return filter ? store.usage_counters.filter(filter) : store.usage_counters;
  },
  findUsageCounter: (filter: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.usage_counters) store.usage_counters = [];
    return store.usage_counters.find(filter) || null;
  },
  saveUsageCounter: (item: any) => {
    const store = loadStore();
    if (!store.usage_counters) store.usage_counters = [];
    const idx = store.usage_counters.findIndex(
      (c) =>
        (item.id && c.id === item.id) ||
        (c.user_id === item.user_id && c.resource === item.resource && c.period === item.period)
    );
    if (idx >= 0) {
      store.usage_counters[idx] = {
        ...store.usage_counters[idx],
        ...item,
        updated_at: new Date().toISOString(),
      };
      saveStore();
      return store.usage_counters[idx];
    }
    const newCounter = {
      id: item.id || `uc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      quantity: item.quantity || 0,
      ...item,
    };
    store.usage_counters.push(newCounter);
    saveStore();
    return newCounter;
  },
  incrementUsageCounter: (userId: string, resource: string, period: string, amount: number) => {
    const store = loadStore();
    if (!store.usage_counters) store.usage_counters = [];
    const idx = store.usage_counters.findIndex(
      (c) => c.user_id === userId && c.resource === resource && c.period === period
    );
    if (idx >= 0) {
      store.usage_counters[idx].quantity = (store.usage_counters[idx].quantity || 0) + amount;
      store.usage_counters[idx].updated_at = new Date().toISOString();
      saveStore();
      return store.usage_counters[idx];
    }
    const newCounter = {
      id: `uc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId,
      resource,
      period,
      quantity: amount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.usage_counters.push(newCounter);
    saveStore();
    return newCounter;
  },
  deleteUsageCounters: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.usage_counters) store.usage_counters = [];
    if (!filter) {
      const count = store.usage_counters.length;
      store.usage_counters = [];
      saveStore();
      return { count };
    }
    const beforeCount = store.usage_counters.length;
    store.usage_counters = store.usage_counters.filter((item) => !filter(item));
    saveStore();
    return { count: beforeCount - store.usage_counters.length };
  },

  // Subscriptions
  getSubscriptions: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.subscriptions) store.subscriptions = [];
    return filter ? store.subscriptions.filter(filter) : [...store.subscriptions];
  },
  findSubscription: (predicate: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.subscriptions) store.subscriptions = [];
    return store.subscriptions.find(predicate) || null;
  },
  saveSubscription: (item: any) => {
    const store = loadStore();
    if (!store.subscriptions) store.subscriptions = [];
    const idx = store.subscriptions.findIndex((s) => s.id === item.id);
    if (idx >= 0) {
      store.subscriptions[idx] = {
        ...store.subscriptions[idx],
        ...item,
        updated_at: new Date().toISOString(),
      };
      saveStore();
      return store.subscriptions[idx];
    }
    const newSub = {
      id: item.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: item.status || "active",
      cancel_at_period_end: Boolean(item.cancel_at_period_end),
      provider: item.provider || "manual",
      ...item,
    };
    store.subscriptions.push(newSub);
    saveStore();
    return newSub;
  },
  deleteSubscription: (id: string) => {
    const store = loadStore();
    if (!store.subscriptions) store.subscriptions = [];
    store.subscriptions = store.subscriptions.filter((s) => s.id !== id);
    saveStore();
  },

  // Payments
  getPayments: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.payments) store.payments = [];
    return filter ? store.payments.filter(filter) : [...store.payments];
  },
  findPayment: (predicate: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.payments) store.payments = [];
    return store.payments.find(predicate) || null;
  },
  savePayment: (item: any) => {
    const store = loadStore();
    if (!store.payments) store.payments = [];
    const idx = store.payments.findIndex((p) => p.id === item.id || (item.invoice_number && p.invoice_number === item.invoice_number));
    if (idx >= 0) {
      store.payments[idx] = {
        ...store.payments[idx],
        ...item,
        updated_at: new Date().toISOString(),
      };
      saveStore();
      return store.payments[idx];
    }
    const newPayment = {
      id: item.id || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      invoice_number: item.invoice_number || `INV-${new Date().toISOString().slice(0, 7).replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`,
      currency: item.currency || "USD",
      status: item.status || "succeeded",
      provider: item.provider || "manual",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...item,
    };
    store.payments.push(newPayment);
    saveStore();
    return newPayment;
  },

  // Processed Webhooks
  findProcessedEvent: (predicate: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.processed_webhook_events) store.processed_webhook_events = [];
    return store.processed_webhook_events.find(predicate) || null;
  },
  saveProcessedEvent: (item: any) => {
    const store = loadStore();
    if (!store.processed_webhook_events) store.processed_webhook_events = [];
    const newEvent = {
      id: item.id || `pwe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      processed_at: new Date().toISOString(),
      ...item,
    };
    store.processed_webhook_events.push(newEvent);
    saveStore();
    return newEvent;
  },

  // Error Logs
  getErrorLogs: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.error_logs) store.error_logs = [];
    return filter ? store.error_logs.filter(filter) : [...store.error_logs];
  },
  findErrorLog: (predicate: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.error_logs) store.error_logs = [];
    return store.error_logs.find(predicate) || null;
  },
  saveErrorLog: (item: any) => {
    const store = loadStore();
    if (!store.error_logs) store.error_logs = [];
    const newLog = {
      id: item.id || `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      ...item,
    };
    store.error_logs.push(newLog);
    saveStore();
    return newLog;
  },
  updateErrorLog: (id: string, updates: any) => {
    const store = loadStore();
    if (!store.error_logs) store.error_logs = [];
    const idx = store.error_logs.findIndex((l) => l.id === id);
    if (idx < 0) return null;
    store.error_logs[idx] = { ...store.error_logs[idx], ...updates };
    saveStore();
    return store.error_logs[idx];
  },
  deleteErrorLogs: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.error_logs) store.error_logs = [];
    if (!filter) {
      const count = store.error_logs.length;
      store.error_logs = [];
      saveStore();
      return { count };
    }
    const beforeCount = store.error_logs.length;
    store.error_logs = store.error_logs.filter((item) => !filter(item));
    saveStore();
    return { count: beforeCount - store.error_logs.length };
  },

  // System Settings
  getSystemSettings: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.system_settings) store.system_settings = [];
    return filter ? store.system_settings.filter(filter) : [...store.system_settings];
  },
  findSystemSetting: (predicate: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.system_settings) store.system_settings = [];
    return store.system_settings.find(predicate) || null;
  },
  upsertSystemSetting: (key: string, data: { value_enc: string }) => {
    const store = loadStore();
    if (!store.system_settings) store.system_settings = [];
    const idx = store.system_settings.findIndex((s) => s.key === key);
    const item = {
      key,
      value_enc: data.value_enc,
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) {
      store.system_settings[idx] = item;
    } else {
      store.system_settings.push(item);
    }
    saveStore();
    return item;
  },
  deleteSystemSettings: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.system_settings) store.system_settings = [];
    if (!filter) {
      const count = store.system_settings.length;
      store.system_settings = [];
      saveStore();
      return { count };
    }
    const beforeCount = store.system_settings.length;
    store.system_settings = store.system_settings.filter((item) => !filter(item));
    saveStore();
    return { count: beforeCount - store.system_settings.length };
  },

  // Apify Usage Logs
  getApifyUsageLogs: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.apify_usage_logs) store.apify_usage_logs = [];
    return filter ? store.apify_usage_logs.filter(filter) : [...store.apify_usage_logs];
  },
  saveApifyUsageLog: (item: any) => {
    const store = loadStore();
    if (!store.apify_usage_logs) store.apify_usage_logs = [];
    const newLog = {
      id: item.id || `usage_log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      ...item,
    };
    store.apify_usage_logs.push(newLog);
    saveStore();
    return newLog;
  },

  // Apify Key Pool
  getApifyKeys: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.apify_keys) store.apify_keys = [];
    return filter ? store.apify_keys.filter(filter) : [...store.apify_keys];
  },
  findApifyKey: (predicate: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.apify_keys) store.apify_keys = [];
    return store.apify_keys.find(predicate) || null;
  },
  saveApifyKey: (item: any) => {
    const store = loadStore();
    if (!store.apify_keys) store.apify_keys = [];
    const newKey = {
      id: item.id || `apify_key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label: item.label || "Default Key",
      token_enc: item.token_enc,
      token_last4: item.token_last4,
      account_email: item.account_email || null,
      plan_name: item.plan_name || null,
      status: item.status || "active",
      max_concurrent_jobs: item.max_concurrent_jobs ?? 2,
      cooldown_until: item.cooldown_until || null,
      last_error_reason: item.last_error_reason || null,
      last_used_at: item.last_used_at || null,
      total_runs: item.total_runs ?? 0,
      total_cost_usd: item.total_cost_usd ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...item,
    };
    store.apify_keys.push(newKey);
    saveStore();
    return newKey;
  },
  updateApifyKey: (id: string, updates: any) => {
    const store = loadStore();
    if (!store.apify_keys) store.apify_keys = [];
    const idx = store.apify_keys.findIndex((k) => k.id === id);
    if (idx < 0) return null;
    const current = store.apify_keys[idx];
    const resolved: any = { ...current };
    for (const [key, val] of Object.entries(updates)) {
      if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
        if ("increment" in val && typeof (val as any).increment === "number") {
          const curNum = Number(resolved[key]) || 0;
          resolved[key] = curNum + (val as any).increment;
        } else if ("decrement" in val && typeof (val as any).decrement === "number") {
          const curNum = Number(resolved[key]) || 0;
          resolved[key] = curNum - (val as any).decrement;
        } else if ("set" in val) {
          resolved[key] = (val as any).set;
        } else {
          resolved[key] = val;
        }
      } else {
        resolved[key] = val;
      }
    }
    resolved.updated_at = new Date().toISOString();
    store.apify_keys[idx] = resolved;
    saveStore();
    return store.apify_keys[idx];
  },
  deleteApifyKey: (id: string) => {
    const store = loadStore();
    if (!store.apify_keys) store.apify_keys = [];
    const before = store.apify_keys.length;
    store.apify_keys = store.apify_keys.filter((k) => k.id !== id);
    saveStore();
    return store.apify_keys.length < before;
  },
  deleteApifyKeys: (filter?: (item: any) => boolean) => {
    const store = loadStore();
    if (!store.apify_keys) store.apify_keys = [];
    if (!filter) {
      const count = store.apify_keys.length;
      store.apify_keys = [];
      saveStore();
      return { count };
    }
    const beforeCount = store.apify_keys.length;
    store.apify_keys = store.apify_keys.filter((item) => !filter(item));
    saveStore();
    return { count: beforeCount - store.apify_keys.length };
  },
};
