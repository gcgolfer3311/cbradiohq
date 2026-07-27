// functions/skip-outlook.js
//
// Replaces the old GitHub Actions cron + skip_update.py + data/space-weather.json
// approach entirely. Instead of a scheduled job writing a file to the repo,
// this fetches fresh NOAA data on-demand and caches it in the SAME Netlify
// Blobs store already used by skip-spots.js — no GitHub Actions, no Python,
// no committed data file, no .github/ or data/ folders needed at all.
//
// GET /api/skip-outlook -> returns the current skip outlook, refreshing
// from NOAA automatically if the cached copy is older than 6 hours.

import { getStore } from "@netlify/blobs";

const FLUX_URL = "https://services.swpc.noaa.gov/products/10cm-flux-30-day.json";
const KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // refresh at most every 6 hours

function esSeasonNote(month) {
  if (month === 6 || month === 7) {
    return { active: true, strength: "peak", note: "Peak Sporadic-E season — the single best window of the year for CB skip." };
  }
  if (month === 5 || month === 8) {
    return { active: true, strength: "elevated", note: "Elevated Sporadic-E season — good odds of afternoon/evening skip openings." };
  }
  if (month === 4 || month === 9) {
    return { active: true, strength: "shoulder", note: "Shoulder season — Sporadic-E openings possible but less frequent than summer." };
  }
  return { active: false, strength: "low", note: "Outside typical Sporadic-E season — most skip now would be solar-flux-driven F2, which is rarer on 11m." };
}

function scoreConditions(sfi, kp, es) {
  let score = 0;
  if (es.strength === "peak") score += 55;
  else if (es.strength === "elevated") score += 40;
  else if (es.strength === "shoulder") score += 20;
  else score += 5;

  if (sfi >= 150) score += 25;
  else if (sfi >= 120) score += 15;
  else if (sfi >= 90) score += 5;

  if (kp !== null) {
    if (kp >= 5) score -= 20;
    else if (kp >= 4) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}

function labelFor(score) {
  if (score >= 70) return "Excellent";
  if (score >= 45) return "Good";
  if (score >= 25) return "Fair";
  return "Low";
}

async function fetchFreshOutlook() {
  const now = new Date();
  const fluxRes = await fetch(FLUX_URL);
  const fluxData = await fluxRes.json();
  const latestSfi = fluxData[fluxData.length - 1].flux;
  const sfiTrend = fluxData.length >= 8 ? latestSfi - fluxData[fluxData.length - 8].flux : 0;

  let latestKp = null;
  try {
    const kpRes = await fetch(KP_URL);
    const kpData = await kpRes.json();
    latestKp = Math.round(kpData[kpData.length - 1].Kp * 10) / 10;
  } catch {
    // Kp is a nice-to-have; continue without it if NOAA's feed hiccups
  }

  const es = esSeasonNote(now.getMonth() + 1); // JS months are 0-indexed
  const score = scoreConditions(latestSfi, latestKp !== null ? latestKp : 2, es);

  return {
    updated: now.toISOString(),
    sfi: latestSfi,
    sfi_trend: sfiTrend,
    kp: latestKp,
    es_season: es,
    skip_score: score,
    skip_label: labelFor(score),
    source: "NOAA SWPC (services.swpc.noaa.gov)",
  };
}

export default async (req) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const store = getStore("skip-outlook");

  try {
    const cached = await store.get("latest", { type: "json" });
    const isStale = !cached || Date.now() - new Date(cached.updated).getTime() > MAX_AGE_MS;

    if (!isStale) {
      return new Response(JSON.stringify(cached), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=1800" },
      });
    }

    const fresh = await fetchFreshOutlook();
    await store.setJSON("latest", fresh);
    return new Response(JSON.stringify(fresh), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=1800" },
    });
  } catch (e) {
    // NOAA fetch failed and we have nothing cached — return a safe static
    // fallback rather than a broken response, same graceful-degrade
    // philosophy as the rest of the site.
    const fallback = {
      updated: null,
      sfi: 110,
      sfi_trend: 0,
      kp: null,
      es_season: { active: true, strength: "shoulder", note: "Live data temporarily unavailable — showing a general seasonal estimate." },
      skip_score: 40,
      skip_label: "Fair",
      source: "fallback — live NOAA fetch failed",
    };
    return new Response(JSON.stringify(fallback), {
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/skip-outlook" };
