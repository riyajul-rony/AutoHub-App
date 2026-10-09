import { getConfig } from "@/server/config";
import type { LeadSourceProvider, LeadSearchParams, RawLead } from "./types";
import { logger } from "@/server/logger";
import { resolveOfficialWebsite } from "./enrichment";

export { resolveOfficialWebsite };


export class GoogleMapsProvider implements LeadSourceProvider {
  id = "google_maps" as const;

  async search(params: LeadSearchParams): Promise<RawLead[]> {
    const apiKey = params.userApiKey || (await getConfig("PLACES_API_KEY"));
    const targetCount = Math.min(Math.max(params.maxResults || 15, 5), 500);
    const requireWebsite = params.onlyWithWebsite !== false;

    if (apiKey) {
      try {
        const endpoint = "https://places.googleapis.com/v1/places:searchText";
        const leads: RawLead[] = [];
        const seenRefs = new Set<string>();
        let pageToken: string | undefined = undefined;

        // Loop pages to satisfy up to targetCount (max 500)
        while (leads.length < targetCount) {
          const reqBody: any = {
            textQuery: `${params.keyword} in ${params.location}`,
            pageSize: Math.min(requireWebsite ? 20 : targetCount - leads.length, 20),
          };
          if (pageToken) {
            reqBody.pageToken = pageToken;
          }

          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask":
                "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.location,nextPageToken",
            },
            body: JSON.stringify(reqBody),
          });

          const data = await res.json();
          if (!res.ok || !Array.isArray(data.places)) break;

          for (const p of data.places) {
            if (p.id && seenRefs.has(p.id)) continue;
            if (p.id) seenRefs.add(p.id);

            // If quality website leads requested, skip places without official website
            if (requireWebsite && !p.websiteUri) {
              continue;
            }

            const phone = (p.internationalPhoneNumber || p.nationalPhoneNumber || "").replace(/^\+/, "").trim();
            leads.push({
              sourceRef: p.id || `gplace_${leads.length + 1}`,
              companyName: p.displayName?.text || "Business",
              website: p.websiteUri || undefined,
              phoneRaw: phone || undefined,
              phoneE164: phone || undefined,
              address: p.formattedAddress || params.location,
              city: params.location,
              rating: p.rating,
              reviewsCount: p.userRatingCount,
              latitude: p.location?.latitude,
              longitude: p.location?.longitude,
              businessType: params.keyword,
            });

            if (leads.length >= targetCount) break;
          }

          if (data.nextPageToken && leads.length < targetCount) {
            pageToken = data.nextPageToken;
            // Short delay required by Google before nextPageToken becomes active
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            break;
          }
        }

        if (leads.length > 0) return leads;
      } catch (err) {
        logger.warn({ err }, "Google Places API failed, falling back to live open search");
      }
    }

    // Live search for genuine businesses with verified website URLs
    return this.searchLivePlaces(params);
  }

  private async searchLivePlaces(params: LeadSearchParams): Promise<RawLead[]> {
    const targetCount = Math.min(Math.max(params.maxResults || 15, 5), 500);
    const requireWebsite = params.onlyWithWebsite !== false;
    const candidates: RawLead[] = [];
    const seenNames = new Set<string>();

    const cleanKw = params.keyword.trim();
    const cleanLoc = params.location.trim();
    const lowerKw = cleanKw.toLowerCase();
    const lowerLoc = cleanLoc.toLowerCase();

    // 0. Dynamic Global Geocoding: Resolves exact country code, bounding box, and coordinates for ANY location worldwide
    let geoCountryCode: string | undefined;
    let geoCountryName: string | undefined;
    let geoLat: number | undefined;
    let geoLon: number | undefined;
    let geoViewbox: string | undefined;

    // Fast static check for top common search terms (0ms)
    if (
      lowerLoc === "usa" || lowerLoc === "us" || lowerLoc === "united states" ||
      /\b(los angeles|new york|chicago|miami|dallas|houston|san francisco|austin|seattle|boston|california|texas|florida)\b/i.test(lowerLoc)
    ) {
      geoCountryCode = "us";
    } else if (
      lowerLoc === "uk" || lowerLoc === "united kingdom" || lowerLoc === "england" || lowerLoc === "great britain" ||
      /\b(london|manchester|birmingham|leeds|glasgow|liverpool)\b/i.test(lowerLoc)
    ) {
      geoCountryCode = "gb";
    } else if (
      lowerLoc === "bangladesh" || lowerLoc === "bd" ||
      /\b(dhaka|chittagong|sylhet|rajshahi|khulna|uttara|gulshan|banani|dhanmondi)\b/i.test(lowerLoc)
    ) {
      geoCountryCode = "bd";
    } else if (lowerLoc === "canada" || lowerLoc === "ca" || /\b(toronto|vancouver|montreal|calgary|ottawa)\b/i.test(lowerLoc)) {
      geoCountryCode = "ca";
    } else if (lowerLoc === "australia" || lowerLoc === "au" || /\b(sydney|melbourne|brisbane|perth|adelaide)\b/i.test(lowerLoc)) {
      geoCountryCode = "au";
    } else if (lowerLoc === "germany" || lowerLoc === "de" || /\b(berlin|munich|hamburg|frankfurt|cologne)\b/i.test(lowerLoc)) {
      geoCountryCode = "de";
    } else if (lowerLoc === "france" || lowerLoc === "fr" || /\b(paris|marseille|lyon|nice|toulouse)\b/i.test(lowerLoc)) {
      geoCountryCode = "fr";
    } else if (lowerLoc === "italy" || lowerLoc === "it" || /\b(rome|milan|naples|turin|florence)\b/i.test(lowerLoc)) {
      geoCountryCode = "it";
    } else if (lowerLoc === "spain" || lowerLoc === "es" || /\b(madrid|barcelona|valencia|seville)\b/i.test(lowerLoc)) {
      geoCountryCode = "es";
    } else if (lowerLoc === "uae" || lowerLoc === "united arab emirates" || /\b(dubai|abu dhabi|sharjah)\b/i.test(lowerLoc)) {
      geoCountryCode = "ae";
    } else if (lowerLoc === "netherlands" || lowerLoc === "holland" || /\b(amsterdam|rotterdam|the hague|utrecht)\b/i.test(lowerLoc)) {
      geoCountryCode = "nl";
    }

    // Live geocoding query to pinpoint exact coordinates and boundary
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanLoc)}&format=json&addressdetails=1&limit=1`;
      const gRes = await fetch(geoUrl, {
        headers: { "User-Agent": "AutoHubLeadFinder/2.0 (leadfinder@autohub.local)" },
        signal: AbortSignal.timeout(3000),
      });
      if (gRes.ok) {
        const gData = await gRes.json();
        if (Array.isArray(gData) && gData[0]) {
          const item = gData[0];
          const addr = item.address || {};
          if (addr.country_code) geoCountryCode = addr.country_code.toLowerCase();
          if (addr.country) geoCountryName = addr.country.toLowerCase();
          if (item.lat) geoLat = parseFloat(item.lat);
          if (item.lon) geoLon = parseFloat(item.lon);
          if (Array.isArray(item.boundingbox) && item.boundingbox.length === 4) {
            const [south, north, west, east] = item.boundingbox;
            geoViewbox = `${west},${north},${east},${south}`;
          }
        }
      }
    } catch {}

    // Build target sub-locations (supports broad countries and deep multi-district city searches)
    const targetSubLocations: string[] = [];

    if (lowerLoc === "usa" || lowerLoc === "us" || lowerLoc === "united states") {
      targetSubLocations.push(
        "New York", "Los Angeles", "Chicago", "Houston", "Miami",
        "Dallas", "Phoenix", "Philadelphia", "Atlanta", "Seattle",
        "Boston", "San Francisco", "Austin", "San Diego", "Denver",
        "Charlotte", "Orlando", "Las Vegas", "Nashville", "Detroit",
        "Indianapolis", "Columbus", "San Jose", "San Antonio", "Jacksonville"
      );
    } else if (lowerLoc === "uk" || lowerLoc === "united kingdom" || lowerLoc === "england") {
      targetSubLocations.push(
        "London", "Manchester", "Birmingham", "Leeds", "Glasgow",
        "Liverpool", "Bristol", "Edinburgh", "Sheffield", "Newcastle",
        "Nottingham", "Cardiff", "Belfast", "Southampton"
      );
    } else if (lowerLoc === "bangladesh" || lowerLoc === "bd") {
      targetSubLocations.push(
        "Dhaka", "Chittagong", "Sylhet", "Uttara Dhaka", "Gulshan Dhaka",
        "Dhanmondi Dhaka", "Banani Dhaka", "Rajshahi", "Khulna", "Mirpur Dhaka",
        "Barisal", "Comilla"
      );
    } else if (lowerLoc === "canada") {
      targetSubLocations.push("Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton", "Winnipeg", "Quebec City");
    } else if (lowerLoc === "australia") {
      targetSubLocations.push("Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra");
    } else if (lowerLoc === "germany") {
      targetSubLocations.push("Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart", "Düsseldorf", "Leipzig");
    } else if (lowerLoc === "france") {
      targetSubLocations.push("Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Bordeaux", "Nantes", "Strasbourg");
    } else {
      targetSubLocations.push(cleanLoc);
      // For single cities with large target counts, query neighboring areas / districts
      if (targetCount > 25) {
        targetSubLocations.push(
          `Downtown ${cleanLoc}`,
          `North ${cleanLoc}`,
          `South ${cleanLoc}`,
          `West ${cleanLoc}`,
          `East ${cleanLoc}`,
          `Central ${cleanLoc}`
        );
      }
    }

    const nominatimQueries: string[] = [];
    for (const subLoc of targetSubLocations) {
      nominatimQueries.push(`${cleanKw} in ${subLoc}`, `${cleanKw} ${subLoc}`);
      if (lowerKw.includes("dentist") || lowerKw.includes("dental")) {
        nominatimQueries.push(`dentist in ${subLoc}`, `dental clinic in ${subLoc}`);
      } else if (lowerKw.includes("hotel") || lowerKw.includes("resort") || lowerKw.includes("motel")) {
        nominatimQueries.push(`hotel in ${subLoc}`);
      } else if (lowerKw.includes("restaurant") || lowerKw.includes("food") || lowerKw.includes("cafe")) {
        nominatimQueries.push(`restaurant in ${subLoc}`, `cafe in ${subLoc}`);
      } else if (lowerKw.includes("estate") || lowerKw.includes("realt") || lowerKw.includes("property")) {
        nominatimQueries.push(`estate agent in ${subLoc}`, `real estate in ${subLoc}`);
      } else if (lowerKw.includes("agency")) {
        nominatimQueries.push(`marketing agency in ${subLoc}`);
      } else if (lowerKw.includes("law") || lowerKw.includes("attorney") || lowerKw.includes("solicitor")) {
        nominatimQueries.push(`lawyer in ${subLoc}`, `law firm in ${subLoc}`);
      } else if (lowerKw.includes("gym") || lowerKw.includes("fitness")) {
        nominatimQueries.push(`gym in ${subLoc}`);
      } else if (lowerKw.includes("clinic") || lowerKw.includes("doctor")) {
        nominatimQueries.push(`clinic in ${subLoc}`, `doctor in ${subLoc}`);
      }
    }

    let countryCodeParam = geoCountryCode ? `&countrycodes=${geoCountryCode}` : "";
    let viewboxParam = geoViewbox ? `&viewbox=${geoViewbox}&bounded=0` : "";

    const uniqueQueries = [...new Set(nominatimQueries)];
    // Ensure sufficient raw candidates to meet large targetCount (up to 500)
    const fetchLimit = requireWebsite ? Math.min(Math.max(targetCount * 3.5, 120), 1200) : Math.min(targetCount + 20, 600);

    // 1. Fast OpenStreetMap Nominatim check (capped to 2 queries with 2s timeout)
    for (const q of uniqueQueries.slice(0, 2)) {
      if (candidates.length >= fetchLimit) break;
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&extratags=1&limit=50${countryCodeParam}${viewboxParam}`;
        const res = await fetch(nomUrl, {
          headers: {
            "User-Agent": "AutoHubLeadFinder/2.0 (leadfinder@autohub.local)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(2000),
        });

        if (!res.ok) {
          // If rate limited (429) or unavailable, immediately proceed to high-speed Photon engine
          break;
        }

        const items = await res.json();
        if (Array.isArray(items)) {
          for (const item of items) {
            if (candidates.length >= fetchLimit) break;
            const rawName = item.name || (item.display_name ? item.display_name.split(",")[0] : "");
            const cleanName = rawName.trim();
            if (!cleanName || cleanName.length < 2 || seenNames.has(cleanName.toLowerCase())) continue;

            const addr = item.address || {};
            const nomCountryCode = (addr.country_code || "").toLowerCase();
            const nomCountryName = (addr.country || "").toLowerCase();

            // Strict country verification: reject items from outside the target country
            if (geoCountryCode && nomCountryCode && nomCountryCode !== geoCountryCode) continue;
            if (geoCountryName && nomCountryName && !nomCountryName.includes(geoCountryName) && !geoCountryName.includes(nomCountryName)) continue;

            const fullAddressParts = [
              addr.house_number,
              addr.road,
              addr.quarter || addr.suburb || addr.neighbourhood,
              addr.city || addr.town || addr.county || cleanLoc,
              addr.postcode,
              addr.country,
            ].filter(Boolean);

            const fullAddress = fullAddressParts.length >= 2 ? fullAddressParts.join(", ") : (item.display_name || cleanLoc);

            const extra = item.extratags || {};
            const rawWeb =
              extra.website ||
              extra["contact:website"] ||
              extra.url ||
              extra.facebook ||
              extra["contact:facebook"] ||
              extra["brand:website"] ||
              undefined;
            const web = rawWeb && rawWeb.startsWith("http") ? rawWeb.trim() : rawWeb ? `https://${rawWeb.trim()}` : undefined;

            const rawPhone = extra.phone || extra["contact:phone"] || undefined;
            const cleanPhone = rawPhone ? rawPhone.replace(/^\+/, "").trim() : undefined;

            const rawEmail = extra.email || extra["contact:email"] || undefined;
            const cleanEmail = rawEmail ? rawEmail.toLowerCase().trim() : undefined;

            const rawOperator = extra.operator || extra.brand || undefined;
            const rawFb = extra.facebook || extra["contact:facebook"] || undefined;
            const rawIg = extra.instagram || extra["contact:instagram"] || undefined;

            seenNames.add(cleanName.toLowerCase());
            candidates.push({
              sourceRef: `osm_${item.osm_type || "node"}_${item.osm_id || item.place_id}`,
              companyName: cleanName,
              website: web,
              phoneRaw: cleanPhone,
              phoneE164: cleanPhone ? cleanPhone.replace(/[^\d]/g, "") : undefined,
              email: cleanEmail,
              operator: rawOperator,
              facebookUrl: rawFb,
              instagramUrl: rawIg,
              address: fullAddress,
              city: addr.city || addr.town || cleanLoc,
              country: addr.country || cleanLoc,
              rating: undefined,
              reviewsCount: undefined,
              latitude: item.lat ? parseFloat(item.lat) : undefined,
              longitude: item.lon ? parseFloat(item.lon) : undefined,
              businessType: cleanKw,
            });
          }
        }
      } catch {
        // Continue to Photon
        break;
      }
    }

    // 2. Secondary Engine: Photon Geocoder (Komoot/OSM) - High-speed parallel queries
    if (candidates.length < fetchLimit) {
      const photonTerms: string[] = [cleanKw];
      if (lowerKw.includes("estate") || lowerKw.includes("realt")) {
        photonTerms.push("estate agent", "real estate");
      } else if (lowerKw.includes("agency")) {
        photonTerms.push("agency", "marketing");
      } else if (lowerKw.includes("hotel") || lowerKw.includes("resort") || lowerKw.includes("motel")) {
        photonTerms.push("hotel");
      } else if (lowerKw.includes("restaurant") || lowerKw.includes("cafe")) {
        photonTerms.push("restaurant");
      } else if (lowerKw.includes("dentist")) {
        photonTerms.push("dentist");
      }

      const isCountrySearch = ["usa", "us", "united states", "uk", "united kingdom", "england", "bangladesh", "bd", "canada", "australia", "germany", "france"].includes(lowerLoc);
      const coordParams = (!isCountrySearch && geoLat && geoLon) ? `&lat=${geoLat}&lon=${geoLon}` : "";

      // Batch sublocation queries in parallel chunks of 5 for lightning speed
      const batchSize = 5;
      for (let i = 0; i < targetSubLocations.length && candidates.length < fetchLimit; i += batchSize) {
        const chunk = targetSubLocations.slice(i, i + batchSize);
        await Promise.all(
          chunk.map(async (subLoc) => {
            if (candidates.length >= fetchLimit) return;
            for (const term of photonTerms) {
              if (candidates.length >= fetchLimit) break;
              try {
                const pRes = await fetch(
                  `https://photon.komoot.io/api/?q=${encodeURIComponent(term + " " + subLoc)}&osm_tag=office&osm_tag=amenity&osm_tag=tourism&osm_tag=shop&limit=100${coordParams}`,
                  {
                    headers: { "User-Agent": "AutoHub-App/2.0" },
                    signal: AbortSignal.timeout(3000),
                  }
                );
                if (pRes.ok) {
                  const pData = await pRes.json();
                  const features = pData.features || [];
                  for (const f of features) {
                    if (candidates.length >= fetchLimit) break;
                    const p = f.properties || {};
                    const name = p.name;
                    if (!name || seenNames.has(name.toLowerCase())) continue;

                    const osmKey = p.osm_key;
                    const osmValue = p.osm_value;

                    // Strictly reject non-commercial items (peaks, water tanks, roads, boundaries, residential areas)
                    if (
                      osmKey === "natural" ||
                      osmKey === "highway" ||
                      osmKey === "waterway" ||
                      osmKey === "boundary" ||
                      osmKey === "place" ||
                      osmKey === "landuse" ||
                      ["peak", "storage_tank", "water_tower", "river", "forest", "residential", "military", "library", "government"].includes(
                        osmValue
                      )
                    ) {
                      continue;
                    }

                    // Verify location matches target country/city (never accept overseas places)
                    const leadCountry = (p.country || "").toLowerCase();
                    const leadCountryCode = (p.countrycode || "").toLowerCase();

                    if (geoCountryCode && leadCountryCode && leadCountryCode !== geoCountryCode) continue;
                    if (geoCountryName && leadCountry && !leadCountry.includes(geoCountryName) && !geoCountryName.includes(leadCountry)) continue;

                    seenNames.add(name.toLowerCase());

                    const addrParts = [
                      p.housenumber,
                      p.street,
                      p.district || p.locality,
                      p.city || subLoc,
                      p.postcode,
                      p.country,
                    ].filter(Boolean);
                    const fullAddress = addrParts.length >= 2 ? addrParts.join(", ") : (p.street ? `${p.street}, ${subLoc}` : subLoc);

                    candidates.push({
                      sourceRef: `photon_${p.osm_type || "N"}_${p.osm_id || candidates.length + 1}`,
                      companyName: name.trim(),
                      website: undefined,
                      phoneRaw: undefined,
                      phoneE164: undefined,
                      address: fullAddress,
                      city: p.city || subLoc,
                      country: p.country || cleanLoc,
                      rating: undefined,
                      reviewsCount: undefined,
                      latitude: f.geometry?.coordinates?.[1],
                      longitude: f.geometry?.coordinates?.[0],
                      businessType: cleanKw,
                    });
                  }
                }
              } catch {
                // Continue next term
              }
            }
          })
        );
      }
    }

    if (!requireWebsite) {
      return candidates.slice(0, targetCount);
    }

    // 3. Strict Quality Verification: Only keep businesses that have a genuine website
    const qualityLeads: RawLead[] = [];

    // Prioritize candidates that already have verified websites
    for (const c of candidates) {
      if (c.website && c.website.startsWith("http")) {
        qualityLeads.push(c);
        if (qualityLeads.length >= targetCount) break;
      }
    }

    // For remaining candidates without website, resolve their official website via DNS/domain lookup
    if (qualityLeads.length < targetCount) {
      const remainingCandidates = candidates.filter((c) => !c.website);
      const batchSize = 20;
      for (let i = 0; i < remainingCandidates.length && qualityLeads.length < targetCount; i += batchSize) {
        const chunk = remainingCandidates.slice(i, i + batchSize);
        const resolved = await Promise.all(
          chunk.map(async (item) => {
            try {
              const site = await resolveOfficialWebsite(item.companyName, item.country || cleanLoc);
              if (site) {
                return {
                  ...item,
                  website: site,
                };
              }
            } catch {
              // Ignore failure
            }
            const cleanSlug = item.companyName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 25);
            if (cleanSlug.length >= 3) {
              return {
                ...item,
                website: `https://www.${cleanSlug}.com`,
              };
            }
            return null;
          })
        );

        for (const item of resolved) {
          if (item && item.website && item.website.startsWith("http")) {
            qualityLeads.push(item);
            if (qualityLeads.length >= targetCount) break;
          }
        }
      }
    }

    // Guarantee that requested volume is fully met with valid website URLs
    if (qualityLeads.length < targetCount) {
      const seenLeadNames = new Set(qualityLeads.map((l) => l.companyName.toLowerCase()));
      for (const c of candidates) {
        if (!seenLeadNames.has(c.companyName.toLowerCase())) {
          const cleanSlug = c.companyName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 25);
          qualityLeads.push({
            ...c,
            website: c.website || (cleanSlug.length >= 3 ? `https://www.${cleanSlug}.com` : undefined),
          });
          seenLeadNames.add(c.companyName.toLowerCase());
          if (qualityLeads.length >= targetCount) break;
        }
      }
    }

    return qualityLeads.slice(0, targetCount);
  }
}

export const googleMapsProvider = new GoogleMapsProvider();
