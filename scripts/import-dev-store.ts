/**
 * One-time Data Migration Script: Import data from data/dev_store.json into PostgreSQL
 *
 * Usage:
 *   npx tsx scripts/import-dev-store.ts
 *
 * This script is idempotent (safe to run multiple times without duplicating data).
 * It will only run when explicitly executed by the operator.
 */

import fs from "fs";
import path from "path";
import { db } from "../src/server/db";

async function runImport() {
  const devStorePath = path.resolve(process.cwd(), "data", "dev_store.json");

  if (!fs.existsSync(devStorePath)) {
    console.error(`❌ dev_store.json not found at ${devStorePath}`);
    process.exit(1);
  }

  console.log("==================================================");
  console.log("  Lead Reach AI: One-Time dev_store.json Importer  ");
  console.log("==================================================");

  const raw = fs.readFileSync(devStorePath, "utf8");
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch (err: any) {
    console.error("❌ Failed to parse data/dev_store.json:", err.message);
    process.exit(1);
  }

  // 1. Verify PostgreSQL connection
  try {
    console.log("Checking PostgreSQL database connection...");
    await db.$queryRaw`SELECT 1`;
    console.log("✅ Database is connected.\n");
  } catch (err: any) {
    console.error("❌ Failed to connect to PostgreSQL:", err.message);
    console.error("   Ensure your PostgreSQL container is running and DATABASE_URL is set.");
    process.exit(1);
  }

  // 2. Import Plans
  if (Array.isArray(data.plans) && data.plans.length > 0) {
    console.log(`Importing ${data.plans.length} plans...`);
    for (const p of data.plans) {
      await (db as any).plans.upsert({
        where: { slug: p.slug },
        update: {
          name: p.name,
          description: p.description,
          monthly_price: p.monthly_price,
          annual_discount_pct: p.annual_discount_pct,
          features: p.features,
          limits: p.limits,
          is_active: p.is_active,
        },
        create: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          monthly_price: p.monthly_price,
          annual_discount_pct: p.annual_discount_pct,
          features: p.features,
          limits: p.limits,
          is_active: p.is_active,
        },
      });
    }
    console.log(`✅ ${data.plans.length} plans imported/updated.`);
  }

  // 3. Import System Settings
  if (Array.isArray(data.system_settings) && data.system_settings.length > 0) {
    console.log(`Importing ${data.system_settings.length} system settings...`);
    for (const s of data.system_settings) {
      await (db as any).system_settings.upsert({
        where: { key: s.key },
        update: {
          value: s.value,
          value_enc: s.value_enc,
          updated_at: new Date(s.updated_at || Date.now()),
        },
        create: {
          key: s.key,
          value: s.value,
          value_enc: s.value_enc,
          updated_at: new Date(s.updated_at || Date.now()),
        },
      });
    }
    console.log(`✅ ${data.system_settings.length} system settings imported.`);
  }

  // 4. Import Users
  if (Array.isArray(data.users) && data.users.length > 0) {
    console.log(`Importing ${data.users.length} users...`);
    for (const u of data.users) {
      await (db as any).users.upsert({
        where: { email: u.email.toLowerCase() },
        update: {
          name: u.name,
          password_hash: u.password_hash,
          role: u.role,
          status: u.status,
          plan: u.plan,
          timezone: u.timezone,
          email_verified_at: u.email_verified_at ? new Date(u.email_verified_at) : null,
          onboarded_at: u.onboarded_at ? new Date(u.onboarded_at) : null,
        },
        create: {
          id: u.id,
          email: u.email.toLowerCase(),
          name: u.name,
          password_hash: u.password_hash,
          role: u.role,
          status: u.status,
          plan: u.plan,
          timezone: u.timezone,
          email_verified_at: u.email_verified_at ? new Date(u.email_verified_at) : null,
          onboarded_at: u.onboarded_at ? new Date(u.onboarded_at) : null,
          created_at: u.created_at ? new Date(u.created_at) : new Date(),
        },
      });
    }
    console.log(`✅ ${data.users.length} users imported.`);
  }

  // 5. Import Email Accounts
  if (Array.isArray(data.email_accounts) && data.email_accounts.length > 0) {
    console.log(`Importing ${data.email_accounts.length} email accounts...`);
    for (const ea of data.email_accounts) {
      await (db as any).email_accounts.upsert({
        where: { id: ea.id },
        update: {
          status: ea.status,
          daily_quota: ea.daily_quota,
        },
        create: {
          ...ea,
          created_at: ea.created_at ? new Date(ea.created_at) : new Date(),
          updated_at: ea.updated_at ? new Date(ea.updated_at) : new Date(),
        },
      });
    }
    console.log(`✅ ${data.email_accounts.length} email accounts imported.`);
  }

  // 6. Import Lead Searches
  if (Array.isArray(data.lead_searches) && data.lead_searches.length > 0) {
    console.log(`Importing ${data.lead_searches.length} lead searches...`);
    let searchCount = 0;
    for (const ls of data.lead_searches) {
      await (db as any).lead_searches.upsert({
        where: { id: ls.id },
        update: {
          status: ls.status,
          results_count: ls.results_count,
        },
        create: {
          ...ls,
          created_at: ls.created_at ? new Date(ls.created_at) : new Date(),
          updated_at: ls.updated_at ? new Date(ls.updated_at) : new Date(),
        },
      });
      searchCount++;
    }
    console.log(`✅ ${searchCount} lead searches imported.`);
  }

  // 7. Import Leads
  if (Array.isArray(data.leads) && data.leads.length > 0) {
    console.log(`Importing ${data.leads.length} leads...`);
    let leadCount = 0;
    for (const l of data.leads) {
      await (db as any).leads.upsert({
        where: { id: l.id },
        update: {
          status: l.status,
          email: l.email,
          phone: l.phone,
        },
        create: {
          ...l,
          collected_at: l.collected_at ? new Date(l.collected_at) : new Date(),
          updated_at: l.updated_at ? new Date(l.updated_at) : new Date(),
        },
      });
      leadCount++;
    }
    console.log(`✅ ${leadCount} leads imported.`);
  }

  // 8. Import Outreach Campaigns
  if (Array.isArray(data.outreach_campaigns) && data.outreach_campaigns.length > 0) {
    console.log(`Importing ${data.outreach_campaigns.length} outreach campaigns...`);
    for (const oc of data.outreach_campaigns) {
      await (db as any).outreach_campaigns.upsert({
        where: { id: oc.id },
        update: {
          status: oc.status,
          name: oc.name,
        },
        create: {
          ...oc,
          created_at: oc.created_at ? new Date(oc.created_at) : new Date(),
          updated_at: oc.updated_at ? new Date(oc.updated_at) : new Date(),
        },
      });
    }
    console.log(`✅ ${data.outreach_campaigns.length} outreach campaigns imported.`);
  }

  // 9. Import Campaign Recipients
  if (Array.isArray(data.campaign_recipients) && data.campaign_recipients.length > 0) {
    console.log(`Importing ${data.campaign_recipients.length} campaign recipients...`);
    for (const cr of data.campaign_recipients) {
      await (db as any).campaign_recipients.upsert({
        where: { id: cr.id },
        update: {
          status: cr.status,
        },
        create: {
          ...cr,
          created_at: cr.created_at ? new Date(cr.created_at) : new Date(),
          updated_at: cr.updated_at ? new Date(cr.updated_at) : new Date(),
        },
      });
    }
    console.log(`✅ ${data.campaign_recipients.length} campaign recipients imported.`);
  }

  // 10. Import Apify Keys
  if (Array.isArray(data.apify_keys) && data.apify_keys.length > 0) {
    console.log(`Importing ${data.apify_keys.length} Apify keys...`);
    for (const ak of data.apify_keys) {
      await (db as any).apify_keys.upsert({
        where: { id: ak.id },
        update: {
          status: ak.status,
        },
        create: {
          ...ak,
          created_at: ak.created_at ? new Date(ak.created_at) : new Date(),
          updated_at: ak.updated_at ? new Date(ak.updated_at) : new Date(),
        },
      });
    }
    console.log(`✅ ${data.apify_keys.length} Apify keys imported.`);
  }

  console.log("\n🎉 All records from dev_store.json successfully imported into PostgreSQL!");
  process.exit(0);
}

runImport().catch((err) => {
  console.error("❌ Fatal error during import:", err);
  process.exit(1);
});

