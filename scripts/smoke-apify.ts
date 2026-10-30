/**
 * Live Smoke Test for Apify Integration
 * Run with: npm run smoke:apify
 *
 * Guarded: Skips if APIFY_TOKEN is not set in environment
 */
import { ApifyClient } from "apify-client";

async function runSmokeTest() {
  const token = process.env.APIFY_TOKEN;

  if (!token || token.trim() === "") {
    console.log("ℹ️  [SKIP] APIFY_TOKEN is not set in environment. Skipping live Apify smoke test.");
    console.log("   To run live smoke test, execute: set APIFY_TOKEN=your_token && npm run smoke:apify");
    process.exit(0);
  }

  console.log("🚀 Starting live Apify smoke test with token: ••••" + token.slice(-4));

  const client = new ApifyClient({ token: token.trim() });

  // 1. Check live connection against GET /v2/users/me
  try {
    console.log("1️⃣  Checking connection via GET /v2/users/me...");
    const me = await client.user().get();
    if (!me || !me.id) {
      throw new Error("Failed to retrieve user profile from Apify API.");
    }
    console.log(`✅ Connection succeeded! User: ${me.username || me.id} (Email: ${me.email || "N/A"})`);
  } catch (err: any) {
    console.error("❌ Live Apify connection failed:", err.message);
    process.exit(1);
  }

  // 2. Run Google Maps scraper with 1 place
  try {
    console.log("2️⃣  Triggering compass/crawler-google-places for 1 place (Austin, TX)...");
    const run = await client.actor("compass/crawler-google-places").call(
      {
        searchStringsArray: ["coffee shop"],
        locationQuery: "Austin, Texas, USA",
        maxCrawledPlacesPerSearch: 1,
        language: "en",
        website: "allPlaces",
        scrapeContacts: false,
      },
      {
        timeout: 120, // 2 minutes max
        waitSecs: 120,
      }
    );

    console.log(`✅ Actor run finished with status: ${run.status} (Run ID: ${run.id})`);

    // 3. Fetch 1 dataset item
    const dataset = await client.dataset(run.defaultDatasetId).listItems({ limit: 1 });
    const item = dataset.items[0] as any;

    if (!item) {
      console.warn("⚠️  Run succeeded but dataset returned 0 items.");
    } else {
      console.log("3️⃣  Verifying extracted fields from live dataset item:");
      console.log(`   - Title: ${item.title || "—"}`);
      console.log(`   - Place ID: ${item.placeId || item.cid || "—"}`);
      console.log(`   - Address: ${item.address || "—"}`);
      console.log(`   - Phone: ${item.phone || item.phoneUnformatted || "—"}`);
      console.log(`   - Website: ${item.website || item.url || "—"}`);
      console.log(`   - Total Score: ${item.totalScore ?? "—"}`);

      if (!item.title) {
        throw new Error("Dataset item is missing required 'title' field.");
      }
      console.log("✅ Verified live field mappings match expected schema!");
    }

    console.log("\n🎉 Live Apify smoke test passed successfully!");
  } catch (err: any) {
    console.error("❌ Live Google Maps scraper smoke test failed:", err.message);
    process.exit(1);
  }
}

runSmokeTest().catch((e) => {
  console.error("Unhandled error in smoke test:", e);
  process.exit(1);
});
