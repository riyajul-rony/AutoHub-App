import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

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
    findMany: async () => [],
    findFirst: async () => null,
    create: async ({ data }: any) => ({
      id: "mock-key",
      created_at: new Date(),
      ...data,
    }),
    delete: async () => ({}),
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
    findMany: async () => [],
    count: async () => 0,
  };

  post_runs = {
    findMany: async () => [],
    count: async () => 0,
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
