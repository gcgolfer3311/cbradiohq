#!/usr/bin/env node
/**
 * build.js — generates one static, indexable page per CB channel
 * (dist/channel/{n}/index.html) plus a real sitemap.xml.
 *
 * This is the same play that gave ShortwaveHQ its SEO base: instead of one
 * page hoping to rank for 40 different long-tail searches ("CB channel 19
 * frequency", "what channel do truckers use", "CB channel 9 emergency"),
 * each channel gets its own indexable URL with a unique title/description
 * targeting that exact query.
 *
 * Run: node build.js   (outputs to dist/)
 * Netlify build command should be: node build.js  →  publish dist/
 */
const fs = require("fs");
const path = require("path");

const SITE = "https://cbradiohq.com";
const OUT_DIR = path.join(__dirname, "dist");

// Keep this in sync with the CHANNELS array in index.html.
const CHANNELS = [
  {ch:1,freq:"26.965",use:"General chat / travelers",tag:null},
  {ch:2,freq:"26.975",use:"General chat",tag:null},
  {ch:3,freq:"26.985",use:"General chat, some regional off-road use",tag:null},
  {ch:4,freq:"27.005",use:"Off-road / 4x4 club convoy channel (unofficial, widespread)",tag:"4x4"},
  {ch:5,freq:"27.015",use:"General chat",tag:null},
  {ch:6,freq:"27.025",use:'"Superbowl channel" — skip/DX hangout, heaviest during solar skip',tag:"SKIP"},
  {ch:7,freq:"27.035",use:"General chat",tag:null},
  {ch:8,freq:"27.055",use:"General chat",tag:null},
  {ch:9,freq:"27.065",use:"Emergency / REACT monitoring channel — keep clear for real emergencies",tag:"EMERGENCY"},
  {ch:10,freq:"27.075",use:"Regional travelers info in some states; general elsewhere",tag:null},
  {ch:11,freq:"27.085",use:"Historically the pre-1970s calling channel; general chat today",tag:null},
  {ch:12,freq:"27.105",use:"General chat",tag:null},
  {ch:13,freq:"27.115",use:"Marina / RV park channel in coastal & lake regions",tag:null},
  {ch:14,freq:"27.125",use:"Default handheld/walkie-talkie channel — often crowded",tag:null},
  {ch:15,freq:"27.135",use:"General chat",tag:null},
  {ch:16,freq:"27.155",use:"General chat, some regional skip activity",tag:null},
  {ch:17,freq:"27.165",use:"North–south interstate trucker channel (regional convention)",tag:"TRUCKER"},
  {ch:18,freq:"27.175",use:"General chat",tag:null},
  {ch:19,freq:"27.185",use:"THE trucker channel — east–west long-haul, road conditions",tag:"TRUCKER"},
  {ch:20,freq:"27.205",use:"General chat",tag:null},
  {ch:21,freq:"27.215",use:"General chat",tag:null},
  {ch:22,freq:"27.225",use:"General chat",tag:null},
  {ch:23,freq:"27.235",use:"General chat (historically shared w/ RC before 1970s reallocation)",tag:null},
  {ch:24,freq:"27.245",use:"General chat",tag:null},
  {ch:25,freq:"27.255",use:"General chat",tag:null},
  {ch:26,freq:"27.265",use:"General chat",tag:null},
  {ch:27,freq:"27.275",use:"General chat",tag:null},
  {ch:28,freq:"27.285",use:"General chat, some DX/skip use",tag:null},
  {ch:29,freq:"27.295",use:"General chat",tag:null},
  {ch:30,freq:"27.305",use:"General chat",tag:null},
  {ch:31,freq:"27.315",use:"General chat",tag:null},
  {ch:32,freq:"27.325",use:"General chat",tag:null},
  {ch:33,freq:"27.335",use:"General chat",tag:null},
  {ch:34,freq:"27.345",use:"General chat",tag:null},
  {ch:35,freq:"27.355",use:"General chat",tag:null},
  {ch:36,freq:"27.365",use:"SSB — 12W PEP legal here and up",tag:"SSB"},
  {ch:37,freq:"27.375",use:"SSB DX / long-distance chasing",tag:"SSB"},
  {ch:38,freq:"27.385",use:"SSB — most active SSB DX channel on the band",tag:"SSB"},
  {ch:39,freq:"27.395",use:"SSB general",tag:"SSB"},
  {ch:40,freq:"27.405",use:"SSB — trucker SSB overflow from Ch.19",tag:"SSB"}
];

// Per-channel editorial context so each page is substantive, not a thin
// doorway page. Keyed by channel number; channels without a custom entry
// fall back to a generated-but-still-useful paragraph set.
const CH_CONTEXT = {
  4:  "Channel 4 has become an unofficial gathering spot for off-road and 4x4 clubs in many regions. If you run trails with a group, agree on a channel before you head out — 4 is a common default but far from universal.",
  6:  "Channel 6 is known as the \"Superbowl channel\" — during Sporadic-E skip openings it fills with high-power stations chasing long-distance contacts. It's one of the most active DX channels on the band and can get crowded and competitive when conditions are up.",
  9:  "Channel 9 is the traditional emergency and REACT monitoring channel. By long-standing convention it's kept clear for genuine emergencies and travel assistance — don't use it for ragchewing. Some areas still have volunteers monitoring it.",
  11: "Channel 11 was the original CB calling channel before the band expanded from 23 to 40 channels in 1977. You'd call out on 11, then move to a free channel to talk. Today it's general chat like most of the band.",
  14: "Channel 14 is the default channel on many low-cost handheld/walkie-talkie CB radios, so it can be busy with short-range local traffic, especially around retail and family two-way sets.",
  17: "Channel 17 is used by many truckers running north–south interstates, a regional counterpart to Channel 19's east–west convention. It varies by area — listen before assuming.",
  19: "Channel 19 is THE trucker channel — the single busiest channel on the band. Long-haul drivers use it for road conditions, traffic, weather, speed traps, and general chatter along east–west routes. If you only monitor one channel on the highway, this is it.",
  36: "Channel 36 begins the SSB (single-sideband) segment of the band. SSB is legal up to 12W PEP here (versus 4W AM) and gets noticeably more range per watt, but you need an SSB-capable radio and the other station needs one too.",
  38: "Channel 38 (specifically 38 Lower Sideband, \"38 LSB\") is the most active SSB DX channel on the band. Skip-chasers and long-distance operators congregate here when conditions allow."
};

function channelPage(c) {
  const title = c.tag
    ? `CB Channel ${c.ch} (${c.freq} MHz) — ${c.tag} Channel | CB Radio HQ`
    : `CB Channel ${c.ch} Frequency: ${c.freq} MHz | CB Radio HQ`;
  const description = `Channel ${c.ch}: ${c.freq} MHz. ${c.use}.`.slice(0, 150);
  const canonical = `${SITE}/channel/${c.ch}/`;

  const context = CH_CONTEXT[c.ch] ||
    `Channel ${c.ch} sits at ${c.freq} MHz and is used mainly for ${c.use.toLowerCase()}. Like most of the 40-channel band, exact usage varies by region and time of day — the best way to know what a channel is used for near you is to listen before you transmit.`;

  // neighbor links keep users (and crawlers) moving between pages
  const prev = c.ch > 1 ? c.ch - 1 : null;
  const next = c.ch < 40 ? c.ch + 1 : null;

  const isSSB = c.ch >= 36;
  const powerLine = isSSB
    ? "This channel is in the SSB segment: up to 12 watts PEP on single-sideband is legal, versus 4 watts on AM. No license is required either way."
    : "Like all AM CB channels, the legal power limit here is 4 watts, and no license is required to transmit.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "CB Channel ${c.ch} — ${c.freq} MHz",
  "description": "${description.replace(/"/g, '\\"')}",
  "url": "${canonical}",
  "publisher": { "@type": "Organization", "name": "CB Radio HQ", "url": "${SITE}/" }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type":"ListItem","position":1,"name":"CB Radio HQ","item":"${SITE}/"},
    {"@type":"ListItem","position":2,"name":"Channel Guide","item":"${SITE}/#channels"},
    {"@type":"ListItem","position":3,"name":"Channel ${c.ch}","item":"${canonical}"}
  ]
}
</script>
<style>
  :root{--orange:#ff6a1f;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#14171a;color:#e9ebee;font-family:Inter,-apple-system,sans-serif;line-height:1.65;}
  .wrap{max-width:660px;margin:0 auto;padding:36px 24px 60px;}
  a{color:var(--orange);}
  .home-link{font-family:'IBM Plex Mono',monospace;font-size:12px;text-decoration:none;color:#9aa0a8;}
  h1{font-family:Oswald,sans-serif;text-transform:uppercase;font-size:30px;margin:22px 0 4px;}
  .freq{font-family:'IBM Plex Mono',monospace;color:var(--orange);font-size:22px;font-weight:600;}
  .tag{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.04em;padding:3px 9px;border:1px solid var(--orange);color:var(--orange);border-radius:2px;text-transform:uppercase;margin-left:10px;vertical-align:middle;}
  p{color:#c3c7cd;margin:16px 0;}
  .fact{background:#1b1f23;border:1px solid #2c3238;border-radius:6px;padding:16px 20px;margin:24px 0;}
  .fact div{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#9aa0a8;margin:4px 0;}
  .fact b{color:#e9ebee;}
  .neighbors{display:flex;justify-content:space-between;gap:12px;margin:32px 0 8px;font-family:'IBM Plex Mono',monospace;font-size:13px;}
  .cta{display:block;margin-top:28px;padding:16px 20px;background:#1b1f23;border:1px solid var(--orange);border-radius:6px;text-decoration:none;}
  .cta b{color:var(--orange);}
  .cta span{display:block;color:#9aa0a8;font-size:13px;margin-top:4px;}
</style>
</head>
<body>
  <div class="wrap">
    <a class="home-link" href="${SITE}/">← CB Radio HQ</a>
    <h1>CB Channel ${c.ch}${c.tag ? `<span class="tag">${c.tag}</span>` : ""}</h1>
    <p class="freq">${c.freq} MHz</p>

    <div class="fact">
      <div>FREQUENCY: <b>${c.freq} MHz</b></div>
      <div>MODE: <b>${isSSB ? "AM / SSB" : "AM"}</b></div>
      <div>LEGAL POWER: <b>${isSSB ? "4W AM / 12W SSB" : "4W AM"}</b></div>
      <div>LICENSE: <b>None required</b></div>
    </div>

    <p>${context}</p>
    <p>${powerLine}</p>
    <p>All 40 CB channels are fixed nationwide by the FCC between 26.965 and 27.405 MHz. Channel <em>uses</em> like the ones described here are widely-observed operator conventions, not law — the frequency is fixed, but who's talking on it depends on your region and the time of day.</p>

    <div class="neighbors">
      ${prev ? `<a href="${SITE}/channel/${prev}/">← Channel ${prev}</a>` : "<span></span>"}
      ${next ? `<a href="${SITE}/channel/${next}/">Channel ${next} →</a>` : "<span></span>"}
    </div>

    <a class="cta" href="${SITE}/#skip">
      <b>Is skip running right now?</b>
      <span>Check the live NOAA-driven Skip Outlook, browse the full channel guide, or run the SWR Doctor on CB Radio HQ →</span>
    </a>
  </div>
</body>
</html>`;
}

function buildSitemap(channelUrls, toolUrls = []) {
  const staticUrls = [
    { loc: `${SITE}/`, freq: "daily", pri: "1.0" },
  ];
  const all = [
    ...staticUrls,
    ...toolUrls.map((u) => ({ loc: u, freq: "weekly", pri: "0.9" })),
    ...channelUrls.map((u) => ({ loc: u, freq: "monthly", pri: "0.6" })),
  ];
  const body = all
    .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// =====================================================
// STANDALONE TOOL PAGES — each interactive tool gets its own
// indexable URL (dist/{slug}/index.html) targeting the exact
// search intent it solves ("cb swr calculator", "is my cb
// radio legal") instead of competing with the homepage for
// every query at once. Content is extracted directly from
// homepage.html via marker comments, so there's exactly one
// source of truth for each tool's HTML/JS — no copy-paste drift.
// =====================================================
const TOOL_PAGES = [
  {
    slug: "swr-calculator",
    sectionId: "swr",
    jsMarker: "swr",
    title: "CB Antenna SWR Calculator & Diagnosis Tool | CB Radio HQ",
    description: "Enter your Channel 1 and Channel 40 SWR readings and get an instant diagnosis: too long, too short, or a grounding fault — plus the exact fix.",
    schemaName: "CB Antenna SWR Doctor",
    extraJs: "",
  },
  {
    slug: "antenna-picker",
    sectionId: "antenna",
    jsMarker: "antenna",
    title: "CB Antenna & Mount Picker for Your Vehicle | CB Radio HQ",
    description: "Pick your vehicle and priority — get the exact CB antenna and mount recommended, including the ground-plane warning most beginners miss.",
    schemaName: "CB Antenna & Mount Picker",
    extraJs: 'const AMZ_TAG = "shortwave1877-20"; // live Amazon Associates tag\n',
  },
  {
    slug: "is-my-radio-legal",
    sectionId: "legalcheck",
    jsMarker: "legality",
    title: "Is My CB Radio Legal? Export Radio Checker | CB Radio HQ",
    description: "Search your radio's brand/model against a list of known export/10-meter radios not certified for CB use, sourced from FCC enforcement records.",
    schemaName: "CB Radio Legality Checker",
    extraJs: "",
  },
];

function extractBetween(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1) {
    throw new Error(`Extraction markers not found: ${startMarker} / ${endMarker}`);
  }
  return html.slice(start + startMarker.length, end);
}

function extractSection(html, sectionId) {
  const re = new RegExp(`<section id="${sectionId}"[^>]*>([\\s\\S]*?)</section>`);
  const m = html.match(re);
  if (!m) throw new Error(`Section #${sectionId} not found in homepage.html`);
  return m[0]; // full <section>...</section> including the tag itself
}

function toolPage(tool, styleBlock, sectionHtml, toolJs) {
  const canonical = `${SITE}/${tool.slug}/`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tool.title}</title>
<meta name="description" content="${tool.description}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="website">
<meta property="og:title" content="${tool.title}">
<meta property="og:description" content="${tool.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og-image.png">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "${tool.schemaName}",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Any (web browser)",
  "url": "${canonical}",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "publisher": { "@type": "Organization", "name": "CB Radio HQ", "url": "${SITE}/" }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type":"ListItem","position":1,"name":"CB Radio HQ","item":"${SITE}/"},
    {"@type":"ListItem","position":2,"name":"${tool.schemaName}","item":"${canonical}"}
  ]
}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
${styleBlock}
</head>
<body style="padding:0;">
<a href="${SITE}/" class="home-link" style="display:block;max-width:1120px;margin:0 auto;padding:20px 24px 0;font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--text-dim);text-decoration:none;">← CB Radio HQ — full site, live skip outlook, channel guide &amp; more</a>

${sectionHtml}

<footer style="padding:40px 24px 60px;">
  <div style="max-width:1120px;margin:0 auto;font-size:12.5px;color:var(--text-faint);border-top:1px solid var(--line);padding-top:20px;">
    Free tool from <a href="${SITE}/" style="color:var(--orange);">CB Radio HQ</a> — also see the
    <a href="${SITE}/swr-calculator/" style="color:var(--orange);">SWR Calculator</a>,
    <a href="${SITE}/antenna-picker/" style="color:var(--orange);">Antenna Picker</a>, and
    <a href="${SITE}/is-my-radio-legal/" style="color:var(--orange);">Radio Legality Checker</a>.
  </div>
</footer>

<script>
${tool.extraJs}${toolJs}
</script>
</body>
</html>`;
}


function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // copy the main site files into dist/.
  // The homepage source is kept as homepage.html (so it doesn't get mixed
  // up with the per-channel index.html files) and is written out as the
  // real index.html the web server needs — done automatically here.
  const homepageSrc = path.join(__dirname, "homepage.html");
  if (fs.existsSync(homepageSrc)) {
    fs.copyFileSync(homepageSrc, path.join(OUT_DIR, "index.html"));
  } else if (fs.existsSync(path.join(__dirname, "index.html"))) {
    // fallback: if only index.html exists, use it
    fs.copyFileSync(path.join(__dirname, "index.html"), path.join(OUT_DIR, "index.html"));
  }
  for (const f of ["robots.txt", "netlify.toml", "og-image.png"]) {
    const src = path.join(__dirname, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT_DIR, f));
  }
  // copy data/ and netlify/ directories if present
  for (const dir of ["data", "netlify"]) {
    const src = path.join(__dirname, dir);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(OUT_DIR, dir), { recursive: true });
  }

  const channelUrls = [];
  for (const c of CHANNELS) {
    const dir = path.join(OUT_DIR, "channel", String(c.ch));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), channelPage(c));
    channelUrls.push(`${SITE}/channel/${c.ch}/`);
  }

  // Generate standalone tool pages by extracting from homepage.html —
  // one source of truth, no copy-paste drift between homepage and tool page.
  const toolUrls = [];
  if (fs.existsSync(homepageSrc)) {
    const homepageHtml = fs.readFileSync(homepageSrc, "utf8");
    const styleMatch = homepageHtml.match(/<style>[\s\S]*?<\/style>/);
    if (!styleMatch) throw new Error("Could not find <style> block in homepage.html");
    const styleBlock = styleMatch[0];

    for (const tool of TOOL_PAGES) {
      const sectionHtml = extractSection(homepageHtml, tool.sectionId);
      const toolJs = extractBetween(
        homepageHtml,
        `/* ===TOOLJS:${tool.jsMarker}:START=== */`,
        `/* ===TOOLJS:${tool.jsMarker}:END=== */`
      );
      const dir = path.join(OUT_DIR, tool.slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), toolPage(tool, styleBlock, sectionHtml, toolJs));
      toolUrls.push(`${SITE}/${tool.slug}/`);
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, "sitemap.xml"), buildSitemap(channelUrls, toolUrls));

  console.log(`Built ${CHANNELS.length} channel pages + ${toolUrls.length} tool pages + sitemap.xml into dist/`);
}

main();
