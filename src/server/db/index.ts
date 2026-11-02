import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { localDevStore } from "./local-store";

const globalForPrisma = globalThis as unknown as { prisma?: any; pgPool?: pg.Pool };

// In-memory demo store for when PostgreSQL is not running locally
class LocalDevMockDb {
  users = {
    findMany: async ({ where, take, skip, orderBy }: any = {}) => {
      let items = localDevStore.getUsers((u) => {
        if (where?.role) {
          if (where.role.in && Array.isArray(where.role.in)) {
            if (!where.role.in.includes(u.role)) return false;
          } else if (u.role !== where.role) {
            return false;
          }
        }
        if (where?.status && u.status !== where.status) return false;
        if (where?.plan && u.plan !== where.plan) return false;
        if (where?.email && u.email?.toLowerCase() !== where.email?.toLowerCase()) return false;
        if (where?.OR && Array.isArray(where.OR)) {
          const matched = where.OR.some((cond: any) => {
            if (cond.name?.contains && cond.name.mode === "insensitive") {
              return u.name?.toLowerCase().includes(cond.name.contains.toLowerCase());
            }
            if (cond.email?.contains && cond.email.mode === "insensitive") {
              return u.email?.toLowerCase().includes(cond.email.contains.toLowerCase());
            }
            return false;
          });
          if (!matched) return false;
        }
        return true;
      });

      if (orderBy) {
        const orderKey = Object.keys(orderBy)[0];
        const dir = orderBy[orderKey] === "asc" ? 1 : -1;
        items = [...items].sort((a, b) => {
          const valA = a[orderKey] ?? "";
          const valB = b[orderKey] ?? "";
          if (valA < valB) return -1 * dir;
          if (valA > valB) return 1 * dir;
          return 0;
        });
      } else {
        items = [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      }

      if (skip && typeof skip === "number") items = items.slice(skip);
      if (take && typeof take === "number") items = items.slice(0, take);
      return items;
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findUser((u) => (where?.id && u.id === where.id) || (where?.email && u.email?.toLowerCase() === where.email?.toLowerCase()));
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findUser((u) => (where?.id && u.id === where.id) || (where?.email && u.email?.toLowerCase() === where.email?.toLowerCase()));
    },
    create: async ({ data }: any) => localDevStore.saveUser(data),
    update: async ({ where, data }: any) => localDevStore.updateUser(where.id, data),
    count: async ({ where }: any = {}) => {
      return localDevStore.getUsers((u) => {
        if (where?.role) {
          if (where.role.in && Array.isArray(where.role.in)) {
            if (!where.role.in.includes(u.role)) return false;
          } else if (u.role !== where.role) {
            return false;
          }
        }
        if (where?.status && u.status !== where.status) return false;
        if (where?.plan && u.plan !== where.plan) return false;
        if (where?.OR && Array.isArray(where.OR)) {
          const matched = where.OR.some((cond: any) => {
            if (cond.name?.contains && cond.name.mode === "insensitive") {
              return u.name?.toLowerCase().includes(cond.name.contains.toLowerCase());
            }
            if (cond.email?.contains && cond.email.mode === "insensitive") {
              return u.email?.toLowerCase().includes(cond.email.contains.toLowerCase());
            }
            return false;
          });
          if (!matched) return false;
        }
        return true;
      }).length;
    },
  };

  sessions = {
    findUnique: async ({ where, include, select }: any) => {
      const sess = localDevStore.findSession((s) => (where.token_hash && s.token_hash === where.token_hash) || (where.id && s.id === where.id));
      if (!sess) return null;
      if (include?.user || select?.user) {
        const user = localDevStore.findUser((u) => u.id === sess.user_id) || localDevStore.getUsers()[0];
        return { ...sess, user };
      }
      return sess;
    },
    create: async ({ data }: any) => {
      const sess = {
        id: data.id || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        created_at: new Date(),
        ...data,
      };
      return localDevStore.saveSession(sess);
    },
    update: async ({ where, data }: any) => {
      return localDevStore.updateSession(where.id, data) || { ...data };
    },
    deleteMany: async ({ where }: any = {}) => {
      localDevStore.deleteSessions((s) => (!where?.token_hash || s.token_hash === where.token_hash) && (!where?.user_id || s.user_id === where.user_id));
      return { count: 1 };
    },
  };

  verification_tokens = {
    findUnique: async () => null,
    create: async () => ({ id: "mock-token" }),
    update: async () => ({}),
  };

  system_settings = {
    findUnique: async ({ where }: any) => {
      return localDevStore.findSystemSetting((s) => s.key === where.key);
    },
    findMany: async ({ where }: any = {}) => {
      return localDevStore.getSystemSettings((s) => {
        if (where?.key?.in && Array.isArray(where.key.in)) {
          return where.key.in.includes(s.key);
        }
        return true;
      });
    },
    upsert: async ({ where, create, update }: any) => {
      const data = update || create;
      return localDevStore.upsertSystemSetting(where.key, data);
    },
    deleteMany: async ({ where }: any = {}) => {
      return localDevStore.deleteSystemSettings(where?.key ? (s: any) => s.key === where.key : undefined);
    },
    delete: async ({ where }: any) => {
      localDevStore.deleteSystemSettings((s: any) => s.key === where.key);
      return { key: where.key };
    },
  };

  api_keys = {
    findMany: async ({ where }: any = {}) => {
      return localDevStore.getApiKeys(
        (k) =>
          (!where?.user_id || k.user_id === where.user_id) &&
          (!where?.provider || k.provider === where.provider) &&
          (!where?.status || k.status === where.status)
      );
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findApiKey(
        (k) =>
          (!where?.user_id || k.user_id === where.user_id) &&
          (!where?.id || k.id === where.id) &&
          (!where?.provider || k.provider === where.provider) &&
          (!where?.status || k.status === where.status)
      );
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findApiKey((k) => k.id === where.id);
    },
    create: async ({ data }: any) => {
      return localDevStore.saveApiKey(data);
    },
    delete: async ({ where }: any) => {
      localDevStore.deleteApiKey(where.id);
      return { id: where.id };
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getApiKeys(
        (k) =>
          (!where?.user_id || k.user_id === where.user_id) &&
          (!where?.provider || k.provider === where.provider) &&
          (!where?.status || k.status === where.status)
      ).length;
    },
  };

  social_accounts = {
    findMany: async ({ where }: any = {}) => {
      return localDevStore.getSocialAccounts(
        (a) => (!where?.user_id || a.user_id === where.user_id) && (!where?.provider || a.provider === where.provider)
      );
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findSocialAccount(
        (a) =>
          (!where?.user_id || a.user_id === where.user_id) &&
          (!where?.provider || a.provider === where.provider) &&
          (!where?.id || a.id === where.id) &&
          (!where?.external_id || a.external_id === where.external_id)
      );
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findSocialAccount((a) => a.id === where.id);
    },
    create: async ({ data }: any) => {
      return localDevStore.saveSocialAccount(data);
    },
    update: async ({ where, data }: any) => {
      return localDevStore.saveSocialAccount({ ...where, ...data });
    },
    upsert: async ({ where, create, update }: any) => {
      const existing = localDevStore.findSocialAccount(
        (a) =>
          (where?.user_id_provider_external_id &&
            a.user_id === where.user_id_provider_external_id.user_id &&
            a.provider === where.user_id_provider_external_id.provider &&
            a.external_id === where.user_id_provider_external_id.external_id) ||
          (where?.id && a.id === where.id)
      );
      if (existing) {
        return localDevStore.saveSocialAccount({ ...existing, ...update });
      }
      return localDevStore.saveSocialAccount(create);
    },
    delete: async ({ where }: any) => {
      localDevStore.deleteSocialAccount(where.id, where.user_id);
      return { id: where.id };
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getSocialAccounts(where?.user_id ? (a) => a.user_id === where.user_id : undefined).length;
    },
  };

  email_accounts = {
    findMany: async ({ where }: any = {}) => {
      return localDevStore.getEmailAccounts((a) => {
        if (where?.user_id && a.user_id !== where.user_id) return false;
        if (where?.status && a.status !== where.status) return false;
        if (where?.OR && Array.isArray(where.OR)) {
          const orMatch = where.OR.some((cond: any) => {
            if (cond.reply_inbox_account_id && a.reply_inbox_account_id === cond.reply_inbox_account_id) return true;
            if (cond.reply_to && a.reply_to?.toLowerCase() === cond.reply_to?.toLowerCase()) return true;
            return false;
          });
          if (!orMatch) return false;
        }
        return true;
      });
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findEmailAccount(
        (a) => (!where?.user_id || a.user_id === where.user_id) && (!where?.id || a.id === where.id) && (!where?.from_email || a.from_email === where.from_email)
      );
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findEmailAccount((a) => a.id === where.id);
    },
    create: async ({ data }: any) => {
      return localDevStore.saveEmailAccount(data);
    },
    update: async ({ where, data }: any) => {
      const existing = localDevStore.findEmailAccount((a) => a.id === where.id);
      return localDevStore.saveEmailAccount({ ...existing, ...data });
    },
    delete: async ({ where }: any) => {
      localDevStore.deleteEmailAccount(where.id);
      return { id: where.id };
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getEmailAccounts(where?.user_id ? (a) => a.user_id === where.user_id : undefined).length;
    },
  };

  outreach_campaigns = {
    findMany: async ({ where }: any = {}) => {
      return localDevStore.getOutreachCampaigns(
        (c) => (!where?.user_id || c.user_id === where.user_id) && (!where?.status || c.status === where.status)
      );
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findOutreachCampaign(
        (c) => (!where?.user_id || c.user_id === where.user_id) && (!where?.id || c.id === where.id)
      );
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findOutreachCampaign((c) => c.id === where.id);
    },
    create: async ({ data }: any) => {
      return localDevStore.saveOutreachCampaign(data);
    },
    update: async ({ where, data }: any) => {
      const existing = localDevStore.findOutreachCampaign((c) => c.id === where.id);
      return localDevStore.saveOutreachCampaign({ ...existing, ...data });
    },
    delete: async ({ where }: any) => {
      localDevStore.deleteOutreachCampaign(where.id);
      return { id: where.id };
    },
    updateMany: async ({ where, data }: any = {}) => {
      const items = localDevStore.getOutreachCampaigns((c) => (!where?.user_id || c.user_id === where.user_id) && (!where?.status || c.status === where.status));
      for (const item of items) {
        localDevStore.saveOutreachCampaign({ ...item, ...data });
      }
      return { count: items.length };
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getOutreachCampaigns(where?.user_id ? (c) => c.user_id === where.user_id : undefined).length;
    },
  };

  campaign_recipients = {
    findMany: async ({ where, take, orderBy }: any = {}) => {
      let items = localDevStore.getRecipients(
        (r) =>
          (!where?.user_id || r.user_id === where.user_id) &&
          (!where?.campaign_id || r.campaign_id === where.campaign_id) &&
          (!where?.status || (where.status?.in ? where.status.in.includes(r.status) : r.status === where.status)) &&
          (!where?.assigned_account_id || r.assigned_account_id === where.assigned_account_id)
      );
      if (take && typeof take === "number") {
        items = items.slice(0, take);
      }
      return items;
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findRecipient(
        (r) =>
          (!where?.id || r.id === where.id) &&
          (!where?.user_id || r.user_id === where.user_id) &&
          (!where?.thread_message_id || r.thread_message_id === where.thread_message_id) &&
          (!where?.unsubscribe_token || r.unsubscribe_token === where.unsubscribe_token) &&
          (!where?.email || r.email.toLowerCase() === where.email.toLowerCase()) &&
          (!where?.campaign_id || r.campaign_id === where.campaign_id) &&
          (!where?.assigned_account_id || (where.assigned_account_id?.in ? where.assigned_account_id.in.includes(r.assigned_account_id) : r.assigned_account_id === where.assigned_account_id))
      );
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findRecipient((r) => (!where?.id || r.id === where.id) && (!where?.unsubscribe_token || r.unsubscribe_token === where.unsubscribe_token));
    },
    create: async ({ data }: any) => localDevStore.saveRecipient(data),
    createMany: async ({ data }: any) => {
      const list = Array.isArray(data) ? data : [data];
      for (const item of list) {
        localDevStore.saveRecipient(item);
      }
      return { count: list.length };
    },
    update: async ({ where, data }: any) => {
      const existing = localDevStore.findRecipient((r) => (!where?.id || r.id === where.id) && (!where?.unsubscribe_token || r.unsubscribe_token === where.unsubscribe_token));
      return localDevStore.saveRecipient({ ...existing, ...data });
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getRecipients(
        (r) =>
          (!where?.user_id || r.user_id === where.user_id) &&
          (!where?.campaign_id || r.campaign_id === where.campaign_id) &&
          (!where?.status || (where.status?.in ? where.status.in.includes(r.status) : r.status === where.status))
      ).length;
    },
  };

  outreach_campaign_accounts = {
    create: async ({ data }: any) => data,
    createMany: async ({ data }: any) => ({ count: Array.isArray(data) ? data.length : 1 }),
    findMany: async ({ where }: any = {}) => [],
    deleteMany: async () => ({ count: 1 }),
  };

  suppressions = {
    findMany: async ({ where }: any = {}) => {
      return localDevStore.getSuppressions((s) => {
        if (where?.user_id && s.user_id !== where.user_id) return false;
        if (where?.email?.in && Array.isArray(where.email.in)) {
          return where.email.in.some((e: string) => e.toLowerCase() === s.email.toLowerCase());
        }
        return true;
      });
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.getSuppressions((s) => (!where?.user_id || s.user_id === where.user_id) && (!where?.email || s.email.toLowerCase() === where.email.toLowerCase()))[0] || null;
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.getSuppressions((s) => (!where?.user_id || s.user_id === where.user_id) && (!where?.email || s.email.toLowerCase() === where.email.toLowerCase()))[0] || null;
    },
    create: async ({ data }: any) => localDevStore.saveSuppression({ ...data, email: data.email.toLowerCase() }),
    count: async ({ where }: any = {}) => {
      return localDevStore.getSuppressions((s) => !where?.user_id || s.user_id === where.user_id).length;
    },
  };

  email_messages = {
    findMany: async ({ where, take, skip, orderBy }: any = {}) => {
      let items = localDevStore.getEmailMessages((m) => {
        if (where?.user_id && m.user_id !== where.user_id) return false;
        if (where?.direction && m.direction !== where.direction) return false;
        if (where?.status && m.status !== where.status) return false;
        if (where?.email_account_id && m.email_account_id !== where.email_account_id) return false;
        if (where?.recipient_id && m.recipient_id !== where.recipient_id) return false;
        return true;
      });
      if (orderBy?.sent_at === "desc" || orderBy?.created_at === "desc") {
        items = [...items].sort((a, b) => new Date(b.sent_at || b.created_at || 0).getTime() - new Date(a.sent_at || a.created_at || 0).getTime());
      }
      if (skip && typeof skip === "number") items = items.slice(skip);
      if (take && typeof take === "number") items = items.slice(0, take);
      return items;
    },
    create: async ({ data }: any) => localDevStore.saveEmailMessage(data),
    count: async ({ where }: any = {}) => {
      return localDevStore.getEmailMessages((m) => {
        if (where?.user_id && m.user_id !== where.user_id) return false;
        if (where?.email_account_id && m.email_account_id !== where.email_account_id) return false;
        if (where?.status && m.status !== where.status) return false;
        if (where?.sent_at?.gte) {
          const since = new Date(where.sent_at.gte).getTime();
          const sent = new Date(m.sent_at).getTime();
          if (sent < since) return false;
        }
        return true;
      }).length;
    },
  };

  followup_sequences = {
    findMany: async ({ where, take, skip }: any = {}) => {
      let items = localDevStore.getFollowupSequences((s) => {
        if (where?.user_id && s.user_id !== where.user_id) return false;
        if (where?.campaign_id && s.campaign_id !== where.campaign_id) return false;
        return true;
      });
      if (skip && typeof skip === "number") items = items.slice(skip);
      if (take && typeof take === "number") items = items.slice(0, take);
      return items;
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findFollowupSequence((s) => (!where?.campaign_id || s.campaign_id === where.campaign_id) && (!where?.id || s.id === where.id));
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findFollowupSequence((s) => s.id === where.id);
    },
    create: async ({ data }: any) => localDevStore.saveFollowupSequence(data),
    update: async ({ where, data }: any) => {
      const existing = localDevStore.findFollowupSequence((s) => s.id === where.id || s.campaign_id === where.campaign_id);
      return localDevStore.saveFollowupSequence({ ...existing, ...data });
    },
    delete: async ({ where }: any) => {
      return { id: where.id };
    },
  };

  campaign_steps = {
    findMany: async ({ where, orderBy }: any = {}) => {
      let items = localDevStore.getCampaignSteps((s: any) => {
        if (where?.campaign_id && s.campaign_id !== where.campaign_id) return false;
        if (where?.step_no && s.step_no !== where.step_no) return false;
        return true;
      });
      if (orderBy?.step_no === "asc") items = [...items].sort((a, b) => a.step_no - b.step_no);
      return items;
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findCampaignStep((s: any) => {
        if (where?.campaign_id && s.campaign_id !== where.campaign_id) return false;
        if (where?.step_no && s.step_no !== where.step_no) return false;
        return true;
      });
    },
    create: async ({ data }: any) => localDevStore.saveCampaignStep(data),
    createMany: async ({ data }: any) => {
      if (Array.isArray(data)) {
        data.forEach((d) => localDevStore.saveCampaignStep(d));
      }
      return { count: Array.isArray(data) ? data.length : 0 };
    },
    deleteMany: async ({ where }: any = {}) => {
      return localDevStore.deleteCampaignSteps((s: any) => !where?.campaign_id || s.campaign_id === where.campaign_id);
    },
  };

  tracking_events = {
    findMany: async ({ where, take, orderBy }: any = {}) => {
      let items = localDevStore.getTrackingEvents((e: any) => {
        if (where?.campaign_id && e.campaign_id !== where.campaign_id) return false;
        if (where?.recipient_id && e.recipient_id !== where.recipient_id) return false;
        if (where?.event_type && e.event_type !== where.event_type) return false;
        return true;
      });
      if (take) items = items.slice(0, take);
      return items;
    },
    create: async ({ data }: any) => localDevStore.saveTrackingEvent(data),
    count: async ({ where }: any = {}) => {
      return localDevStore.getTrackingEvents((e: any) => {
        if (where?.campaign_id && e.campaign_id !== where.campaign_id) return false;
        if (where?.event_type && e.event_type !== where.event_type) return false;
        return true;
      }).length;
    },
  };

  lead_searches = {
    create: async ({ data }: any) => localDevStore.saveLeadSearch(data),
    update: async ({ where, data }: any) => {
      const existing = localDevStore.findLeadSearch((s) => s.id === where.id);
      return localDevStore.saveLeadSearch({ ...existing, ...data });
    },
    findMany: async ({ where, orderBy }: any = {}) => {
      const items = localDevStore.getLeadSearches((s) => !where?.user_id || s.user_id === where.user_id);
      return items;
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findLeadSearch((s) => (!where?.user_id || s.user_id === where.user_id) && (!where?.id || s.id === where.id));
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findLeadSearch((s) => s.id === where.id);
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getLeadSearches((s) => !where?.user_id || s.user_id === where.user_id).length;
    },
  };

  apify_usage_logs = {
    create: async ({ data }: any) => localDevStore.saveApifyUsageLog(data),
    findMany: async ({ where, take, orderBy }: any = {}) => {
      let items = localDevStore.getApifyUsageLogs((l) => !where?.user_id || l.user_id === where.user_id);
      if (orderBy?.created_at === "desc") {
        items = [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      }
      if (take) items = items.slice(0, take);
      return items;
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getApifyUsageLogs((l) => !where?.user_id || l.user_id === where.user_id).length;
    },
  };

  leads = {
    create: async ({ data }: any) => localDevStore.saveLead(data),
    update: async ({ where, data }: any) => {
      return localDevStore.updateLead(where.id, data);
    },
    findMany: async ({ where, take, skip, orderBy }: any = {}) => {
      let items = localDevStore.getLeads((l) => {
        if (where?.user_id && l.user_id !== where.user_id) return false;
        if (where?.search_id && l.search_id !== where.search_id) return false;
        if (where?.status && l.status !== where.status) return false;
        if (where?.id?.in && Array.isArray(where.id.in) && !where.id.in.includes(l.id)) return false;
        return true;
      });
      if (orderBy?.collected_at === "desc") {
        items = [...items].sort((a, b) => new Date(b.collected_at || 0).getTime() - new Date(a.collected_at || 0).getTime());
      }
      if (skip && typeof skip === "number") {
        items = items.slice(skip);
      }
      if (take && typeof take === "number") {
        items = items.slice(0, take);
      }
      return items;
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findLead((l) => (!where?.user_id || l.user_id === where.user_id) && (!where?.id || l.id === where.id));
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findLead((l) => l.id === where.id);
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getLeads((l) => {
        if (where?.user_id && l.user_id !== where.user_id) return false;
        if (where?.search_id && l.search_id !== where.search_id) return false;
        if (where?.id?.in && Array.isArray(where.id.in) && !where.id.in.includes(l.id)) return false;
        return true;
      }).length;
    },
  };

  social_campaigns = {
    findMany: async ({ where, include }: any = {}) => {
      const items = localDevStore.getCampaigns(
        (c) => (!where?.user_id || c.user_id === where.user_id) && (!where?.status || c.status === where.status)
      );
      if (include?.social_account) {
        return items.map((c) => ({
          ...c,
          social_account: localDevStore.findSocialAccount((a) => a.id === c.social_account_id),
        }));
      }
      return items;
    },
    findFirst: async ({ where, include }: any = {}) => {
      const c = localDevStore.findCampaign(
        (c) => (!where?.user_id || c.user_id === where.user_id) && (!where?.id || c.id === where.id)
      );
      if (c && include?.social_account) {
        return {
          ...c,
          social_account: localDevStore.findSocialAccount((a) => a.id === c.social_account_id),
        };
      }
      return c;
    },
    findUnique: async ({ where, include }: any = {}) => {
      const c = localDevStore.findCampaign((c) => c.id === where.id);
      if (c && include?.social_account) {
        return {
          ...c,
          social_account: localDevStore.findSocialAccount((a) => a.id === c.social_account_id),
        };
      }
      return c;
    },
    create: async ({ data }: any) => {
      return localDevStore.saveCampaign(data);
    },
    update: async ({ where, data }: any) => {
      const existing = localDevStore.findCampaign((c) => c.id === where.id);
      return localDevStore.saveCampaign({ ...existing, ...data });
    },
    delete: async ({ where }: any) => {
      localDevStore.deleteCampaign(where.id, where.user_id);
      return { id: where.id };
    },
    updateMany: async ({ where, data }: any = {}) => {
      const items = localDevStore.getCampaigns((c) => (!where?.user_id || c.user_id === where.user_id) && (!where?.status || c.status === where.status));
      for (const item of items) {
        localDevStore.saveCampaign({ ...item, ...data });
      }
      return { count: items.length };
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getCampaigns(where?.user_id ? (c) => c.user_id === where.user_id : undefined).length;
    },
  };

  post_runs = {
    findMany: async ({ where, include, take }: any = {}) => {
      let items = localDevStore.getPostRuns(
        (p) => (!where?.user_id || p.user_id === where.user_id) && (!where?.status || p.status === where.status)
      );
      if (take) items = items.slice(0, take);
      if (include?.campaign) {
        return items.map((p) => {
          const camp = localDevStore.findCampaign((c) => c.id === p.campaign_id);
          return {
            ...p,
            campaign: camp
              ? {
                  ...camp,
                  social_account: localDevStore.findSocialAccount((a) => a.id === camp.social_account_id),
                }
              : null,
          };
        });
      }
      return items;
    },
    findFirst: async ({ where, include }: any = {}) => {
      const p = localDevStore.findPostRun((item) => (!where?.id || item.id === where.id) && (!where?.user_id || item.user_id === where.user_id));
      if (p && include?.campaign) {
        const camp = localDevStore.findCampaign((c) => c.id === p.campaign_id);
        return {
          ...p,
          campaign: camp
            ? {
                ...camp,
                social_account: localDevStore.findSocialAccount((a) => a.id === camp.social_account_id),
              }
            : null,
        };
      }
      return p;
    },
    findUnique: async ({ where, include }: any = {}) => {
      const p = localDevStore.findPostRun((item) => item.id === where.id);
      if (p && include?.campaign) {
        const camp = localDevStore.findCampaign((c) => c.id === p.campaign_id);
        return {
          ...p,
          campaign: camp
            ? {
                ...camp,
                social_account: localDevStore.findSocialAccount((a) => a.id === camp.social_account_id),
              }
            : null,
        };
      }
      return p;
    },
    create: async ({ data }: any) => {
      return localDevStore.savePostRun(data);
    },
    update: async ({ where, data }: any) => {
      const existing = localDevStore.findPostRun((p) => p.id === where.id);
      return localDevStore.savePostRun({ ...existing, ...data });
    },
    upsert: async ({ where, create, update }: any) => {
      const existing = localDevStore.findPostRun(
        (p) => p.campaign_id === where.campaign_id_scheduled_for?.campaign_id
      );
      if (existing) {
        return localDevStore.savePostRun({ ...existing, ...update });
      }
      return localDevStore.savePostRun(create);
    },
    delete: async ({ where }: any) => {
      localDevStore.deletePostRun(where.id, where.user_id);
      return { id: where.id };
    },
    updateMany: async ({ where, data }: any = {}) => {
      const items = localDevStore.getPostRuns((p) => {
        if (where?.user_id && p.user_id !== where.user_id) return false;
        if (where?.status) {
          if (where.status.in && Array.isArray(where.status.in)) {
            if (!where.status.in.includes(p.status)) return false;
          } else if (p.status !== where.status) {
            return false;
          }
        }
        return true;
      });
      for (const item of items) {
        localDevStore.savePostRun({ ...item, ...data });
      }
      return { count: items.length };
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getPostRuns(where?.user_id ? (p) => p.user_id === where.user_id : undefined).length;
    },
  };

  admin_audit_logs = {
    findMany: async ({ where, take, skip, orderBy, include }: any = {}) => {
      let items = localDevStore.getAuditLogs((l) => {
        if (where?.admin_id && l.admin_id !== where.admin_id) return false;
        if (where?.action && l.action !== where.action) return false;
        if (where?.created_at?.gte && new Date(l.created_at) < new Date(where.created_at.gte)) return false;
        if (where?.created_at?.lt && new Date(l.created_at) >= new Date(where.created_at.lt)) return false;
        return true;
      });
      if (orderBy?.created_at === "desc") {
        items = [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      }
      if (skip && typeof skip === "number") items = items.slice(skip);
      if (take && typeof take === "number") items = items.slice(0, take);
      if (include?.admin) {
        items = items.map((l) => ({
          ...l,
          admin: localDevStore.findUser((u) => u.id === l.admin_id) || null,
        }));
      }
      return items;
    },
    create: async ({ data }: any) => localDevStore.saveAuditLog(data),
    count: async ({ where }: any = {}) => {
      return localDevStore.getAuditLogs((l) => {
        if (where?.admin_id && l.admin_id !== where.admin_id) return false;
        if (where?.action && l.action !== where.action) return false;
        if (where?.created_at?.gte && new Date(l.created_at) < new Date(where.created_at.gte)) return false;
        if (where?.created_at?.lt && new Date(l.created_at) >= new Date(where.created_at.lt)) return false;
        return true;
      }).length;
    },
    deleteMany: async ({ where }: any = {}) => {
      return localDevStore.deleteAuditLogs((l) => {
        if (where?.created_at?.lt && new Date(l.created_at) < new Date(where.created_at.lt)) return true;
        return false;
      });
    },
  };

  activity_logs = {
    findMany: async ({ where, take, skip, orderBy, include }: any = {}) => {
      let items = localDevStore.getActivityLogs((l) => {
        if (where?.user_id && l.user_id !== where.user_id) return false;
        if (where?.type && l.type !== where.type) return false;
        if (where?.created_at?.gte && new Date(l.created_at) < new Date(where.created_at.gte)) return false;
        if (where?.created_at?.lt && new Date(l.created_at) >= new Date(where.created_at.lt)) return false;
        return true;
      });
      if (orderBy?.created_at === "desc") {
        items = [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      }
      if (skip && typeof skip === "number") items = items.slice(skip);
      if (take && typeof take === "number") items = items.slice(0, take);
      if (include?.user) {
        items = items.map((l) => ({
          ...l,
          user: localDevStore.findUser((u) => u.id === l.user_id) || null,
        }));
      }
      return items;
    },
    create: async ({ data }: any) => localDevStore.saveActivityLog(data),
    count: async ({ where }: any = {}) => {
      return localDevStore.getActivityLogs((l) => {
        if (where?.user_id && l.user_id !== where.user_id) return false;
        if (where?.type && l.type !== where.type) return false;
        if (where?.created_at?.gte && new Date(l.created_at) < new Date(where.created_at.gte)) return false;
        if (where?.created_at?.lt && new Date(l.created_at) >= new Date(where.created_at.lt)) return false;
        return true;
      }).length;
    },
    deleteMany: async ({ where }: any = {}) => {
      return localDevStore.deleteActivityLogs((l) => {
        if (where?.created_at?.lt && new Date(l.created_at) < new Date(where.created_at.lt)) return true;
        return false;
      });
    },
  };

  plans = {
    findMany: async ({ where, orderBy, take, skip }: any = {}) => {
      let items = localDevStore.getPlans((p) => {
        if (where?.is_active !== undefined && p.is_active !== where.is_active) return false;
        if (where?.slug && p.slug !== where.slug) return false;
        return true;
      });
      if (orderBy?.created_at === "desc") {
        items = [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      } else if (orderBy?.monthly_price === "asc") {
        items = [...items].sort((a, b) => Number(a.monthly_price || 0) - Number(b.monthly_price || 0));
      }
      if (skip && typeof skip === "number") items = items.slice(skip);
      if (take && typeof take === "number") items = items.slice(0, take);
      return items;
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findPlan((p) => (where?.id && p.id === where.id) || (where?.slug && p.slug === where.slug));
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findPlan((p) => (where?.id && p.id === where.id) || (where?.slug && p.slug === where.slug));
    },
    create: async ({ data }: any) => localDevStore.savePlan(data),
    update: async ({ where, data }: any) => localDevStore.updatePlan(where.id || where.slug, data),
    delete: async ({ where }: any) => localDevStore.deletePlan(where.id || where.slug),
    count: async ({ where }: any = {}) => {
      return localDevStore.getPlans((p) => {
        if (where?.is_active !== undefined && p.is_active !== where.is_active) return false;
        if (where?.slug && p.slug !== where.slug) return false;
        return true;
      }).length;
    },
  };

  user_limit_overrides = {
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findUserLimitOverride((o) => (where?.id && o.id === where.id) || (where?.user_id && o.user_id === where.user_id));
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findUserLimitOverride((o) => (where?.id && o.id === where.id) || (where?.user_id && o.user_id === where.user_id));
    },
    upsert: async ({ where, create, update }: any = {}) => {
      const existing = localDevStore.findUserLimitOverride((o) => o.user_id === where.user_id);
      if (existing) {
        return localDevStore.saveUserLimitOverride({ ...existing, ...update });
      }
      return localDevStore.saveUserLimitOverride(create);
    },
    create: async ({ data }: any) => localDevStore.saveUserLimitOverride(data),
    update: async ({ where, data }: any) => localDevStore.saveUserLimitOverride({ ...where, ...data }),
    delete: async ({ where }: any) => localDevStore.deleteUserLimitOverride(where.user_id),
  };

  usage_counters = {
    findMany: async ({ where, orderBy, take, skip }: any = {}) => {
      let items = localDevStore.getUsageCounters((c) => {
        if (where?.user_id && c.user_id !== where.user_id) return false;
        if (where?.resource && c.resource !== where.resource) return false;
        if (where?.period && c.period !== where.period) return false;
        return true;
      });
      if (orderBy?.quantity === "desc") {
        items = [...items].sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
      } else if (orderBy?.updated_at === "desc") {
        items = [...items].sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
      }
      if (skip && typeof skip === "number") items = items.slice(skip);
      if (take && typeof take === "number") items = items.slice(0, take);
      return items;
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findUsageCounter((c) => {
        if (where?.id && c.id === where.id) return true;
        if (where?.user_id_resource_period) {
          return (
            c.user_id === where.user_id_resource_period.user_id &&
            c.resource === where.user_id_resource_period.resource &&
            c.period === where.user_id_resource_period.period
          );
        }
        return false;
      });
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findUsageCounter((c) => {
        if (where?.id && c.id === where.id) return true;
        if (where?.user_id && c.user_id !== where.user_id) return false;
        if (where?.resource && c.resource !== where.resource) return false;
        if (where?.period && c.period !== where.period) return false;
        return true;
      });
    },
    upsert: async ({ where, create, update }: any = {}) => {
      const match = where?.user_id_resource_period || where;
      const existing = localDevStore.findUsageCounter((c) => {
        return c.user_id === match.user_id && c.resource === match.resource && c.period === match.period;
      });
      if (existing) {
        const incrementVal = update?.quantity?.increment;
        const newQty = incrementVal !== undefined ? (existing.quantity || 0) + incrementVal : (update?.quantity ?? existing.quantity);
        return localDevStore.saveUsageCounter({ ...existing, ...update, quantity: newQty, updated_at: new Date().toISOString() });
      }
      return localDevStore.saveUsageCounter({
        user_id: match.user_id || create.user_id,
        resource: match.resource || create.resource,
        period: match.period || create.period,
        quantity: create.quantity || 0,
        ...create,
      });
    },
    create: async ({ data }: any) => localDevStore.saveUsageCounter(data),
    update: async ({ where, data }: any) => {
      const existing = localDevStore.findUsageCounter((c) => c.id === where.id);
      return localDevStore.saveUsageCounter({ ...existing, ...data });
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getUsageCounters((c) => {
        if (where?.user_id && c.user_id !== where.user_id) return false;
        if (where?.resource && c.resource !== where.resource) return false;
        if (where?.period && c.period !== where.period) return false;
        return true;
      }).length;
    },
    deleteMany: async ({ where }: any = {}) => {
      return localDevStore.deleteUsageCounters((c) => {
        if (where?.period && c.period !== where.period) return false;
        if (where?.user_id && c.user_id !== where.user_id) return false;
        return true;
      });
    },
  };

  subscriptions = {
    findMany: async ({ where, orderBy, take, skip }: any = {}) => {
      let items = localDevStore.getSubscriptions((s) => {
        if (where?.user_id && s.user_id !== where.user_id) return false;
        if (where?.status && s.status !== where.status) return false;
        if (where?.plan_id && s.plan_id !== where.plan_id) return false;
        return true;
      });
      if (orderBy?.created_at === "desc") {
        items = [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      }
      if (skip && typeof skip === "number") items = items.slice(skip);
      if (take && typeof take === "number") items = items.slice(0, take);
      return items;
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findSubscription((s) => {
        if (where?.id && s.id !== where.id) return false;
        if (where?.user_id && s.user_id !== where.user_id) return false;
        if (where?.status && s.status !== where.status) return false;
        if (where?.provider_subscription_id && s.provider_subscription_id !== where.provider_subscription_id) return false;
        return true;
      });
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findSubscription((s) => s.id === where.id);
    },
    create: async ({ data }: any) => localDevStore.saveSubscription(data),
    update: async ({ where, data }: any) => {
      const existing = localDevStore.findSubscription((s) => s.id === where.id);
      return localDevStore.saveSubscription({ ...existing, ...data });
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getSubscriptions((s) => {
        if (where?.user_id && s.user_id !== where.user_id) return false;
        if (where?.status && s.status !== where.status) return false;
        return true;
      }).length;
    },
  };

  payments = {
    findMany: async ({ where, orderBy, take, skip }: any = {}) => {
      let items = localDevStore.getPayments((p) => {
        if (where?.user_id && p.user_id !== where.user_id) return false;
        if (where?.status && p.status !== where.status) return false;
        if (where?.subscription_id && p.subscription_id !== where.subscription_id) return false;
        if (where?.provider && p.provider !== where.provider) return false;
        return true;
      });
      if (orderBy?.created_at === "desc") {
        items = [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      }
      if (skip && typeof skip === "number") items = items.slice(skip);
      if (take && typeof take === "number") items = items.slice(0, take);
      return items;
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findPayment((p) => {
        if (where?.id && p.id !== where.id) return false;
        if (where?.user_id && p.user_id !== where.user_id) return false;
        if (where?.invoice_number && p.invoice_number !== where.invoice_number) return false;
        if (where?.provider_payment_id && p.provider_payment_id !== where.provider_payment_id) return false;
        return true;
      });
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findPayment((p) => p.id === where.id || (where.invoice_number && p.invoice_number === where.invoice_number));
    },
    create: async ({ data }: any) => localDevStore.savePayment(data),
    update: async ({ where, data }: any) => {
      const existing = localDevStore.findPayment((p) => p.id === where.id);
      return localDevStore.savePayment({ ...existing, ...data });
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getPayments((p) => {
        if (where?.user_id && p.user_id !== where.user_id) return false;
        if (where?.status && p.status !== where.status) return false;
        return true;
      }).length;
    },
  };

  processed_webhook_events = {
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findProcessedEvent((e) => {
        if (where?.id && e.id === where.id) return true;
        if (where?.provider_event_id) {
          return e.provider === where.provider_event_id.provider && e.event_id === where.provider_event_id.event_id;
        }
        return false;
      });
    },
    create: async ({ data }: any) => localDevStore.saveProcessedEvent(data),
  };

  error_logs = {
    findMany: async ({ where, orderBy, take, skip, include }: any = {}) => {
      let items = localDevStore.getErrorLogs((err) => {
        if (where?.source && err.source !== where.source) return false;
        if (where?.user_id && err.user_id !== where.user_id) return false;
        if (where?.created_at?.gte && new Date(err.created_at) < new Date(where.created_at.gte)) return false;
        if (where?.created_at?.lt && new Date(err.created_at) >= new Date(where.created_at.lt)) return false;
        return true;
      });
      if (orderBy?.created_at === "desc") {
        items = [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      }
      if (skip && typeof skip === "number") items = items.slice(skip);
      if (take && typeof take === "number") items = items.slice(0, take);
      if (include?.user) {
        items = items.map((err) => ({
          ...err,
          user: err.user_id ? localDevStore.findUser((u) => u.id === err.user_id) : null,
        }));
      }
      return items;
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findErrorLog((err) => {
        if (where?.id && err.id !== where.id) return false;
        return true;
      });
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findErrorLog((err) => err.id === where.id);
    },
    create: async ({ data }: any) => localDevStore.saveErrorLog(data),
    update: async ({ where, data }: any) => localDevStore.updateErrorLog(where.id, data),
    count: async ({ where }: any = {}) => {
      return localDevStore.getErrorLogs((err) => {
        if (where?.source && err.source !== where.source) return false;
        if (where?.user_id && err.user_id !== where.user_id) return false;
        if (where?.created_at?.gte && new Date(err.created_at) < new Date(where.created_at.gte)) return false;
        return true;
      }).length;
    },
    deleteMany: async ({ where }: any = {}) => {
      return localDevStore.deleteErrorLogs((err) => {
        if (where?.created_at?.lt && new Date(err.created_at) < new Date(where.created_at.lt)) return true;
        return false;
      });
    },
  };

  apify_keys = {
    findMany: async ({ where, orderBy, take, skip }: any = {}) => {
      let items = localDevStore.getApifyKeys((k) => {
        if (where?.status && k.status !== where.status) return false;
        return true;
      });
      if (orderBy?.created_at === "desc") {
        items = [...items].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      }
      if (skip && typeof skip === "number") items = items.slice(skip);
      if (take && typeof take === "number") items = items.slice(0, take);
      return items;
    },
    findUnique: async ({ where }: any = {}) => {
      return localDevStore.findApifyKey((k) => k.id === where?.id);
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findApifyKey((k) => {
        if (where?.status && k.status !== where.status) return false;
        return true;
      });
    },
    create: async ({ data }: any) => localDevStore.saveApifyKey(data),
    update: async ({ where, data }: any) => localDevStore.updateApifyKey(where?.id, data),
    delete: async ({ where }: any) => localDevStore.deleteApifyKey(where?.id),
    count: async ({ where }: any = {}) => {
      return localDevStore.getApifyKeys((k) => {
        if (where?.status && k.status !== where.status) return false;
        return true;
      }).length;
    },
  };

  $queryRaw = async () => [{ 1: 1 }];
  $transaction = async (actions: any[]) => Promise.all(actions);
}

function createClient() {
  const connString = process.env.DATABASE_URL;
  // If we're in production or live DB is available, use standard client
  try {
    const pool =
      globalForPrisma.pgPool ??
      new pg.Pool({
        connectionString: connString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    if (process.env.NODE_ENV !== "production") globalForPrisma.pgPool = pool;
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } catch {
    return new LocalDevMockDb() as any;
  }
}

const liveDb = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = liveDb;

// Safe wrapper that falls back to LocalDevMockDb if database connection fails in local dev
export const db = new Proxy(liveDb, {
  get(target, prop, receiver) {
    const orig = Reflect.get(target, prop, receiver);
    if (orig === undefined && process.env.NODE_ENV !== "production") {
      const mock = new LocalDevMockDb() as any;
      if (mock[prop]) {
        return mock[prop];
      }
    }

    if (typeof orig === "object" && orig !== null) {
      return new Proxy(orig, {
        get(subTarget, subProp, subReceiver) {
          const fn = Reflect.get(subTarget, subProp, subReceiver);
          if (typeof fn === "function") {
            return async (...args: any[]) => {
              try {
                return await fn.apply(subTarget, args);
              } catch (err: any) {
                // If DB is unreachable (ECONNREFUSED or PrismaClientInitializationError) in development
                if (process.env.NODE_ENV !== "production") {
                  console.warn(`[Lead Reach AI DB Notice] Real database not reachable at ${process.env.DATABASE_URL}. Using Dev fallback for ${String(prop)}.${String(subProp)}.`);
                  const mock = new LocalDevMockDb() as any;
                  if (mock[prop] && typeof mock[prop][subProp] === "function") {
                    return await mock[prop][subProp](...args);
                  }
                  if (String(subProp).includes("findMany")) return [];
                  if (String(subProp).includes("count")) return 0;
                  return null;
                }
                throw err;
              }
            };
          }
          return fn;
        },
      });
    }

    if (typeof orig === "function") {
      return async (...args: any[]) => {
        try {
          return await orig.apply(target, args);
        } catch (err: any) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[Lead Reach AI DB Notice] Real database not reachable at ${process.env.DATABASE_URL}. Using Dev fallback for ${String(prop)}.`);
            const mock = new LocalDevMockDb() as any;
            if (mock[prop] && typeof mock[prop] === "function") {
              return await mock[prop](...args);
            }
            if (String(prop).includes("queryRaw")) return [{ 1: 1 }];
            return null;
          }
          throw err;
        }
      };
    }

    return orig;
  },
});

export function scoped<T extends object>(userId: string, where?: T): T & { user_id: string } {
  return { ...(where ?? ({} as T)), user_id: userId };
}
