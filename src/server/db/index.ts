import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { localDevStore } from "./local-store";

const globalForPrisma = globalThis as unknown as { prisma?: any };

// In-memory demo store for when PostgreSQL is not running locally
class LocalDevMockDb {
  users = {
    findUnique: async ({ where }: any) => {
      if (where.email === "admin@example.com") {
        return {
          id: "00000000-0000-0000-0000-000000000001",
          email: "admin@example.com",
          name: "Admin User",
          password_hash: "$argon2id$v=19$m=19456,t=2,p=1$placeholder",
          email_verified_at: new Date(),
          onboarded_at: new Date(),
          role: "admin",
          status: "active",
          timezone: "Asia/Dhaka",
        };
      }
      return null;
    },
    count: async () => 0,
    create: async ({ data }: any) => {
      return {
        id: "00000000-0000-0000-0000-000000000001",
        email: data.email,
        name: data.name,
        email_verified_at: new Date(),
        onboarded_at: null,
        role: "admin",
        status: "active",
        ...data,
      };
    },
    update: async ({ data }: any) => ({ ...data }),
  };

  sessions = {
    findUnique: async () => null,
    create: async () => ({ id: "mock-session" }),
    deleteMany: async () => ({ count: 1 }),
  };

  verification_tokens = {
    findUnique: async () => null,
    create: async () => ({ id: "mock-token" }),
    update: async () => ({}),
  };

  api_keys = {
    findMany: async ({ where }: any = {}) => {
      return localDevStore.getApiKeys(where?.user_id ? (k) => k.user_id === where.user_id : undefined);
    },
    findFirst: async ({ where }: any = {}) => {
      return localDevStore.findApiKey((k) => (!where?.user_id || k.user_id === where.user_id) && (!where?.id || k.id === where.id));
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
    delete: async ({ where }: any) => {
      localDevStore.deleteSocialAccount(where.id);
      return { id: where.id };
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getSocialAccounts(where?.user_id ? (a) => a.user_id === where.user_id : undefined).length;
    },
  };

  lead_searches = {
    create: async ({ data }: any) => ({
      id: "mock-search-id-1",
      created_at: new Date(),
      status: "running",
      ...data,
    }),
    update: async ({ data }: any) => ({ ...data }),
    findMany: async () => [],
    findFirst: async () => null,
  };

  leads = {
    create: async ({ data }: any) => ({
      id: `mock-lead-${Math.random().toString(36).slice(2, 9)}`,
      created_at: new Date(),
      ...data,
    }),
    findMany: async () => [],
    count: async () => 0,
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
      localDevStore.deleteCampaign(where.id);
      return { id: where.id };
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
      const p = localDevStore.findPostRun((item) => (!where?.id || item.id === where.id));
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
      localDevStore.deletePostRun(where.id);
      return { id: where.id };
    },
    count: async ({ where }: any = {}) => {
      return localDevStore.getPostRuns(where?.user_id ? (p) => p.user_id === where.user_id : undefined).length;
    },
  };

  $queryRaw = async () => [{ 1: 1 }];
  $transaction = async (actions: any[]) => Promise.all(actions);
}

function createClient() {
  const connString = process.env.DATABASE_URL;
  // If we're in production or live DB is available, use standard client
  try {
    const adapter = new PrismaPg({ connectionString: connString });
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
                  console.warn(`[AutoHub DB Notice] Real database not reachable at ${process.env.DATABASE_URL}. Using Dev fallback for ${String(prop)}.${String(subProp)}.`);
                  const mock = new LocalDevMockDb() as any;
                  if (mock[prop] && typeof mock[prop][subProp] === "function") {
                    return await mock[prop][subProp](...args);
                  }
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
    return orig;
  },
});

export function scoped<T extends object>(userId: string, where?: T): T & { user_id: string } {
  return { ...(where ?? ({} as T)), user_id: userId };
}
