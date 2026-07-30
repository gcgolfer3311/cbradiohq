# CB Radio HQ — Launch Checklist

Everything in this repo is built and QA'd. This is the ordered list of what
turns it from "files on disk" into a live, indexed, revenue-capable site.

Do these in order. The ones marked **[ranking]** are what actually make it
the go-to site; the tools are what make people stay.

---

## 1. Domain (15 min)
- [ ] Check `cbradiohq.com` availability at your registrar. If taken, alternates: `cbradio-hq.com`, `thecbradiohq.com`, `cbradiohq.net`.
- [ ] Register it. Point it at Netlify in step 3.
- [ ] Once you pick the real domain, find/replace `cbradiohq.com` across `homepage.html`, `build.js`, `robots.txt` if it differs.

## 2. GitHub repo (10 min)
- [ ] Create a new repo (e.g. `cbradiohq`).
- [ ] Upload the whole `cbradiohq/` folder contents. **Use "Add file → Upload files" and drag the actual files** — do not paste `homepage.html` into the web editor (it silently truncates large files; this is the ENOENT/build-fail lesson from ShortwaveHQ).
- [ ] Confirm the tree includes exactly these 7 items: `homepage.html`, `build.js`, `netlify.toml`, `robots.txt`, `og-image.png`, and one folder — `functions/` — containing `skip-spots.js` and `skip-outlook.js`. That's the whole repo. No `.github/`, no `data/`, no nested `netlify/functions/` — those were simplified away.
- [ ] **If your GitHub uploader flattens the `functions/` folder** (drops files at the repo root instead of inside it), fix it the same way: "Add file → Create new file", type `functions/skip-spots.js` as the filename (GitHub creates the folder automatically), paste the content, repeat for `functions/skip-outlook.js`.

## 3. Netlify deploy (10 min)
- [ ] New site → import from your GitHub repo.
- [ ] Build settings are already in `netlify.toml` (`command = node build.js`, `publish = dist`, `functions = functions`). Confirm Netlify picks them up.
- [ ] Add your custom domain in Netlify → Domain settings. Let Netlify provision the SSL cert.
- [ ] **Enable Netlify Blobs** (Site → integrations/add-ons) — required for both Skip Spots and the live Skip Outlook, since both now store their data there instead of a committed file.
- [ ] Trigger a deploy. Verify the live site loads and the 40 `/channel/N/` + 3 tool pages resolve.

## 4. Make Skip Spots live (5 min)
- [ ] After deploy, open the site and post one test spot. It should appear in the feed.
- [ ] If it errors, confirm Netlify Functions + Blobs are enabled. The board fails gracefully ("no active spots") until then — it won't look broken.

## 5. Confirm the live Skip Outlook works (2 min)
- [ ] Load the homepage and check the Skip Outlook gauge shows real numbers.
- [ ] There's nothing to "turn on" — the first visitor after deploy triggers `functions/skip-outlook.js` to fetch fresh NOAA data automatically and cache it in Blobs for 6 hours. No GitHub Actions, no cron, no manual step.

## 6. Amazon Associates (before gear links earn anything) — **[revenue]**
- [ ] In your Amazon Associates account, add `cbradiohq.com` as an approved site (Associates requires each site URL to be registered).
- [ ] Create a tracking ID for this site, then replace `AMZ_TAG = "cbradiohq-20"` in `homepage.html` with your real tag.
- [ ] **Verify every gear ASIN is still a live product** — the ASINs in the gear grid and antenna picker are plausible current models but were not verified against live listings. Open each `amazon.com/dp/<ASIN>` and confirm it resolves to the right product; swap any that 404 or point to the wrong item.

## 7. Get it indexed — **[ranking]**
- [ ] Google Search Console: add the property, verify (DNS or the Netlify meta method).
- [ ] Submit `https://cbradiohq.com/sitemap.xml`.
- [ ] Request indexing on the homepage and 3–4 high-value channel pages (`/channel/19/`, `/channel/9/`, `/channel/6/`).
- [ ] Bing Webmaster Tools: same thing (Bing indexes small niche sites fast).

## 8. First backlinks — **[ranking]**
The tools are the hook. Lead with **SWR Doctor** — it solves the #1 daily
frustration and is the most linkable thing here.
- [ ] Post the SWR Doctor tool (not the homepage) in relevant threads on: cbradiotalk.com, worldwidedx.com, r/CBradio, r/preppers, off-road/overland forums.
- [ ] Frame it as "built a tool that reads your two SWR numbers and tells you exactly what to fix" — that's the shareable hook, not "check out my site."
- [ ] Do NOT lead with Skip Spots — an empty live board reads as dead. Let it fill in once traffic arrives.

---

## What's intentionally NOT here
- **Skip Spots is de-emphasized on purpose** (out of the main nav, honest empty-state). It's a network-effect feature that needs traffic first. Promote it only after the site has regulars.
- No paid ads planned — this is an SEO + word-of-mouth play, same as ShortwaveHQ.

## Post-launch, if it gains traction
- Add an og-image per channel page (currently they share the sitewide card).
- Expand the antenna picker with coax-length / dual-antenna options.
- Consider a state-by-state CB legal notes page (thin-content risk — only if written substantively).
