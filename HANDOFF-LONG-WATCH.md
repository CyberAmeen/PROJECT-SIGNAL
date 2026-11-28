# HANDOFF — THE LONG WATCH (Project Signal Chronology)

Third main section of Project Signal. A scroll journey through reported sky phenomena, from carved rock (c. 8000 BCE) to the PURSUE file releases (Nov 2026). The design doc is `LONG-WATCH-DESIGN.md`; the full event list with badges and sources is `LONG-WATCH-EVENTS.md`.

## Files
| File | Loads | What it does |
|---|---|---|
| `long-watch-boot.js` | eager (~1 KB) | Wires the hub button, prefetches on hover/touch, lazy-loads the three files below, opens `#long-watch` deep links after the power gate. Holds the version stamp `V`. |
| `long-watch.css` | lazy | Eight era art directions (CSS gradients + inline SVG, no image downloads), cards, record sheet, HUD, entrance, finale, reduced motion. |
| `long-watch-data.js` | lazy | `window.LW_DATA`: eras, motifs, badges, 47 events, licence-checked image metadata. |
| `long-watch.js` | lazy | Engine: entrance, scroll loop, odometer, backdrops, particles, globe (on `PSGeo`), cards, record sheet, pattern threads, finale, Atlas hand-off. `window.LongWatch.{open, close, isOpen, _debug}`. |
| `index.html` | — | Third portal button `#lw-launch`, boot script tag, scan-status fix. |
| `hub-spectacle.css` | — | `.ps-portal--watch` colourway + hourglass glyph animation; portal grid (stack on phones; 3 across on wide consoles, which span the card; 2×2 at 4); console clears the telemetry band. |
| `hub-spectacle.js` | — | Hub WebGL scene and its audio treat `body.lw-open` as "covered" (GPU released). |
| `sw.js` | — | Precaches the three lazy files under the boot stamp. |
| `.github/workflows/lw-e2e.yml` + `.github/scripts/lw-e2e.py` | CI only | Perf / memory / images / reduced motion / Atlas hand-off / recordings. Runs on pushes to `long-watch`; results go to branch `lw-results`. Never deploys. |
| `.github/workflows/lw-research.yml` + `lw-commons*.{mjs,json}` | CI only | Read-only Wikimedia Commons licence lookup used to pick images. Runs only on branch `lw-research`. |

## Editing content
- Add or modify an event in `long-watch-data.js` (`EVENTS`, in chronological order; `year` uses historical years, so `-218` means 218 BCE). Required fields: `id, era, year, date, place, region, continent, lat, lon, title, hook, reported, badge, skeptics, endures, motifs, sources`. Optional: `text` (quote + named translation), `reading` (modern reinterpretation), `atlas` (Atlas dossier id; this adds "View in Encounter Atlas"), `img` (key into `IMG`, `'atlas'` to reuse the dossier image, or `null` for the era plate).
- Integrity rules: report as reported; a badge on every entry; ancient texts show the text, with any UFO reading labelled *Modern reinterpretation*; hoaxes only with the Hoax badge; only public-domain or free-licence images, credited; no "aliens built monuments".
- Regenerate the register after edits:
  `node -e 'global.window={};require("./long-watch-data.js");…'` (script in the commit history), or edit `LONG-WATCH-EVENTS.md` by hand.
- Images: prefer Commons files; run the `lw-research` workflow with a new jobs list to check licences.

## Releasing a change
1. Bump `V` in `long-watch-boot.js` **and** the `long-watch-boot.js?v=` tag in `index.html` (both must match; the service worker reads the stamp from the tag).
2. Push to a work branch: `lw-e2e` runs; read `lw-results.json` on branch `lw-results`.
3. Merge to `main`; `static.yml` deploys and stamps `sw.js`.

## Performance notes (keep these true)
- While open, `body.lw-open > *:not(#lw-shell)` gets `content-visibility:hidden`. That stops the hub's looping box-shadow animations from invalidating style every frame. It was the biggest single cost (desktop journey p50 66.7 → 16.7 ms).
- No CSS transitions are restarted per frame. The odometer writes wheel transforms directly from the fractional year.
- Only the active era's overlay layers exist (`display:none` otherwise); backdrops mount current ±1; `will-change` comes off a card one second after it reveals.
- Particles and the corner globe degrade to half or third rate when frames run long (`slow` counter); the globe draws a coarse coastline while turning and a fine one when settled.
- Card images attach within ±2.5 screens and are released beyond that. Closing frees canvases, pools and backdrops.

## Revert
- Whole feature: `git revert -m 1 <merge-commit>` on `main`, then push (Pages redeploys). The service worker cache rolls over on the next build hash.
- Hub button only (keep the code): delete the `#lw-launch` button and the `long-watch-boot.js` script tag from `index.html`. The grid falls back to two portals automatically.
- Scan-status fix only: in `index.html`, `render()` and `refresh()` set `#notice` (search `dataset.live`).
