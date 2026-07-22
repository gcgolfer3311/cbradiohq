#!/usr/bin/env python3
"""
Pulls NOAA SWPC solar-terrestrial data and writes data/space-weather.json
for CB Radio HQ's live Skip Outlook widget on the homepage.

Run on a schedule via GitHub Actions (.github/workflows/skip-update.yml).
If either NOAA feed is unreachable, the site's JS falls back to its last
good copy of data/space-weather.json rather than breaking — same pattern
ShortwaveHQ uses for its schedule.json auto-updater.

Data sources (public, no key required):
  https://services.swpc.noaa.gov/products/10cm-flux-30-day.json
  https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
"""
import json
import os
import urllib.request
from datetime import datetime, timezone

FLUX_URL = "https://services.swpc.noaa.gov/products/10cm-flux-30-day.json"
KP_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
OUT_PATH = "data/space-weather.json"


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "CBRadioHQ/1.0 (+cbradiohq.com)"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())


def es_season_note(month):
    """
    Sporadic-E (Es) — not solar-cycle-driven F2 skip — is the dominant
    real-world CB/11m skip mechanism. It's seasonal, peaking in early
    summer. This is the part most CB sites get wrong or skip entirely.
    """
    if month in (6, 7):
        return {"active": True, "strength": "peak",
                "note": "Peak Sporadic-E season — the single best window of the year for CB skip."}
    if month in (5, 8):
        return {"active": True, "strength": "elevated",
                "note": "Elevated Sporadic-E season — good odds of afternoon/evening skip openings."}
    if month in (4, 9):
        return {"active": True, "strength": "shoulder",
                "note": "Shoulder season — Sporadic-E openings possible but less frequent than summer."}
    return {"active": False, "strength": "low",
            "note": "Outside typical Sporadic-E season — most skip now would be solar-flux-driven F2, which is rarer on 11m."}


def score_conditions(sfi, kp, es):
    """0-100 composite Skip Outlook score. Directional indicator, not a guarantee."""
    score = 0
    if es["strength"] == "peak":
        score += 55
    elif es["strength"] == "elevated":
        score += 40
    elif es["strength"] == "shoulder":
        score += 20
    else:
        score += 5

    if sfi >= 150:
        score += 25
    elif sfi >= 120:
        score += 15
    elif sfi >= 90:
        score += 5

    if kp is not None:
        if kp >= 5:
            score -= 20
        elif kp >= 4:
            score -= 10

    return max(0, min(100, score))


def label_for(score):
    if score >= 70:
        return "Excellent"
    if score >= 45:
        return "Good"
    if score >= 25:
        return "Fair"
    return "Low"


def main():
    now = datetime.now(timezone.utc)

    flux_data = fetch_json(FLUX_URL)
    latest_sfi = flux_data[-1]["flux"]
    sfi_trend = latest_sfi - flux_data[-8]["flux"] if len(flux_data) >= 8 else 0

    try:
        kp_data = fetch_json(KP_URL)
        latest_kp = round(kp_data[-1]["Kp"], 1)
    except Exception as e:
        print(f"WARNING: Kp fetch failed ({e}); continuing without it.")
        latest_kp = None

    es = es_season_note(now.month)
    score = score_conditions(latest_sfi, latest_kp if latest_kp is not None else 2, es)

    out = {
        "updated": now.isoformat(),
        "sfi": latest_sfi,
        "sfi_trend": sfi_trend,
        "kp": latest_kp,
        "es_season": es,
        "skip_score": score,
        "skip_label": label_for(score),
        "source": "NOAA SWPC (services.swpc.noaa.gov)",
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(out, f, indent=2)

    print(f"Wrote {OUT_PATH}:")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
