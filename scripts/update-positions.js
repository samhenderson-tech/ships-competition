#!/usr/bin/env node
// Fetches latest ship positions from myshiptracking.com (primary)
// and VesselFinder (fallback for ships with stale myshiptracking data)

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "data.js");

// All ships: [imo, name, mmsi]
const SHIPS = [
  ["9785835", "Monte Urbasa", "255806023"],
  ["9779848", "Shaden", "403530000"],
  ["9307750", "Jag Vasant", "419001387"],
  ["9275983", "Rose 25", "511101620"],
  ["9385037", "Long Wind", "477372500"],
  ["9460136", "P.ALIKI", "538010229"],
  ["9608867", "Magic Victoria", "538004722"],
  ["9982536", "Nord Victor", "352003984"],
  ["9936549", "Eco Oracle", "538009925"],
  ["9833735", "Siena", "241836000"],
  ["9489027", "Abu Dhabi III", "636014923"],
  ["1137745", "Spade", "613701904"],
  ["9262912", "Auroura", "352001225"],
  ["9288095", "Lan Jing", "306254000"],
  ["9299563", "North Star", "314109000"],
  ["1120510", "Maria", "671536100"],
  ["9220940", "Sands", "629009382"],
  ["9284960", "Ocean Lily", "477178100"],
  ["9933547", "Advantage Victory", "538010019"],
  ["9976927", "Lebrethah", "636024681"],
  ["9903413", "Karachi", "463092101"],
  ["9088536", "Sea Bird", "511101458"],
  ["9750050", "Diligent Warrior", "241422000"],
  ["9251585", "Nature Heart", "650000171"],
  ["9254850", "Camilla", "477223400"],
  ["1028762", "Stoic Warrior", "636024896"],
  ["9315680", "Pine Gas", "419001655"],
  ["9174361", "Galaxy Gas", "336897910"],
  ["9832262", "Front Shanghai", "477539300"],
  ["9937103", "Front Beauly", "538010890"],
  ["9493779", "Smyrni", "636015015"],
  ["9308766", "Parimal", "511101460"],
  ["9410399", "Serifos", "636018827"],
  ["9626285", "GasLog Skagen", "310664000"],
  ["9718777", "Mahadah Silver", "538006501"],
  ["9593517", "Safeen Prestige", "249797000"],
  ["9325049", "Sonangol Namibe", "309072000"],
  ["9330563", "Sanmar Herald", "419002042"],
  ["9416422", "Ocean Thunder", "352003620"],
  ["9397327", "Al Kharaitiyat", "538003352"],
];

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.vesselfinder.com/",
      },
    });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

// Fetch position from VesselFinder's map location API (binary response)
async function fetchFromVesselFinder(mmsi, name) {
  try {
    const url = `https://www.vesselfinder.com/api/pub/ml/${mmsi}`;
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) return null;

    const arrayBuf = await resp.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    if (buf.length < 12 || buf.length > 100) return null;

    const CF = 600000;
    const lat = buf.readInt32BE(7) / CF;
    const lng = buf.readInt32BE(3) / CF;

    if (lat === 0 && lng === 0) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

// Fetch position from shipinfo.net (scrape coordinates from vessel page)
async function fetchFromShipInfo(imo, name) {
  try {
    const url = `https://shipinfo.net/vessels_map_imo_${imo}`;
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) return null;
    const html = await resp.text();

    // Look for coordinates in the page (various formats)
    const coordMatch = html.match(/LatLng\(([\d.-]+),\s*([\d.-]+)\)/) ||
                       html.match(/lat['":\s]+([\d.-]+)[^]*?lng['":\s]+([\d.-]+)/) ||
                       html.match(/position.*?([\d.-]+).*?([\d.-]+)/);
    if (!coordMatch) return null;

    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat === 0 && lng === 0) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

// Direct vessel page URLs for ships where IMO search doesn't find them
const DIRECT_URLS = {
};

// Fetch position from myshiptracking.com
async function fetchFromMyShipTracking(imo, name) {
  try {
    let vesselPath = DIRECT_URLS[imo];

    // Try search if no direct URL
    if (!vesselPath) {
      const searchName = name.replace(/ /g, "+");
      const searchUrl = `https://www.myshiptracking.com/vessels?name=${searchName}&imo=${imo}`;
      const searchResp = await fetchWithTimeout(searchUrl);
      if (!searchResp.ok) return null;
      const searchHtml = await searchResp.text();

      const linkMatch = searchHtml.match(
        new RegExp(`href="(/vessels/[^"]*imo-${imo}[^"]*)"`)
      );
      if (!linkMatch) return null;
      vesselPath = linkMatch[1];
    }

    const vesselUrl = `https://www.myshiptracking.com${vesselPath}`;
    const vesselResp = await fetchWithTimeout(vesselUrl);
    if (!vesselResp.ok) return null;
    const vesselHtml = await vesselResp.text();

    const coordMatch = vesselHtml.match(/lat=([\d.-]+)&lng=([\d.-]+)/);
    if (!coordMatch) return null;

    return {
      lat: parseFloat(coordMatch[1]),
      lng: parseFloat(coordMatch[2]),
    };
  } catch {
    return null;
  }
}

async function fetchShipPosition(imo, name, mmsi) {
  // Primary: VesselFinder (faster, more up-to-date)
  if (mmsi) {
    const pos = await fetchFromVesselFinder(mmsi, name);
    if (pos) return pos;
    console.log(`    VesselFinder failed for ${name}, trying fallbacks...`);
  }
  // Fallback 1: shipinfo.net
  const shipInfoPos = await fetchFromShipInfo(imo, name);
  if (shipInfoPos) return shipInfoPos;
  // Fallback 2: myshiptracking.com
  return fetchFromMyShipTracking(imo, name);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("Fetching ship positions...");

  const positions = {};
  let updated = 0;
  let failed = 0;

  // Fetch in batches of 5 with 2s delay between batches
  for (let i = 0; i < SHIPS.length; i += 5) {
    const batch = SHIPS.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async ([imo, name, mmsi]) => {
        const pos = await fetchShipPosition(imo, name, mmsi);
        if (pos) {
          positions[imo] = pos;
          updated++;
          console.log(`  OK: ${name} (${imo}) -> ${pos.lat}, ${pos.lng}`);
        } else {
          failed++;
          console.log(`  FAIL: ${name} (${imo})`);
        }
      })
    );
    if (i + 5 < SHIPS.length) {
      await sleep(2000);
    }
  }

  console.log(`\nResults: ${updated} updated, ${failed} failed`);

  if (updated === 0) {
    console.log("No positions fetched, skipping update.");
    process.exit(1);
  }

  // Read existing data.js
  const dataJs = fs.readFileSync(DATA_FILE, "utf-8");

  // Build new REAL_POSITIONS block
  const today = new Date().toISOString().slice(0, 10);
  const entries = SHIPS.map(([imo, name]) => {
    const pos = positions[imo];
    if (pos) {
      return `  "${imo}": { lat: ${pos.lat.toFixed(5)}, lng: ${pos.lng.toFixed(5)} },  // ${name}`;
    }
    // Keep existing position if fetch failed
    const existingMatch = dataJs.match(
      new RegExp(`"${imo}":\\s*\\{[^}]+\\}`)
    );
    if (existingMatch) {
      return `  ${existingMatch[0]},  // ${name} (stale)`;
    }
    return null;
  }).filter(Boolean);

  const newBlock = `// Real ship positions fetched from AIS data (myshiptracking.com)\n// Last updated: ${today}\nconst REAL_POSITIONS = {\n${entries.join("\n")}\n};`;

  // Replace the REAL_POSITIONS block in data.js
  const newDataJs = dataJs.replace(
    /\/\/ Real ship positions fetched from AIS data[^]*?\nconst REAL_POSITIONS = \{[^]*?\n\};/,
    newBlock
  );

  fs.writeFileSync(DATA_FILE, newDataJs, "utf-8");
  console.log(`\nUpdated ${DATA_FILE} (${today})`);
}

main();
