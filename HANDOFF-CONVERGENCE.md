# HANDOFF — CONVERGENCE (Echoes · Atlas time scrubber · Mirror Moments)

Release stamp `20261128c1` (all files below, the Long Watch boot `V`, and the `long-watch-boot.js?v=` tag in `index.html`). Full report with tag counts, wave sources and pairings: `CONVERGENCE.md`.

## Files
| File | Loads | What it does |
|---|---|---|
| `signal-motifs.js` | eager (~32 KB, ~9 KB gz) | **Generated.** Taxonomy (14 motifs), hand tags for Long Watch + sourced Atlas cases, rule tags for NUFORC, the 81 echo targets, and `window.PSMotifs.{tag, echoes, …}`. |
| `tools/convergence/tags.py` | build only | The taxonomy and every hand tag. Edit here. |
| `tools/convergence/motifs-core.js` | build only | Tagging rules (`R`) and the echo matcher. Edit here. |
| `tools/convergence/build-motifs.py` | build only | `python3 tools/convergence/build-motifs.py` from the repo root → rewrites `signal-motifs.js` and the 192×120 echo thumbnails in `lw/thumb/`. Asserts every Long Watch entry and Atlas case has a tag list. |
| `intel-signal.js/.css` | eager | ECHOES strip (`computeEchoes`, `echoHTML`, `openEcho`), thumbnails mounted with the scene window (±1 slide), light threads, `.ps-return` chip styles. |
| `convergence.js` | eager (~2 KB) | Opens an echo's target (`openLongWatchEntry`, `openAtlasDossier`), keeps the return token (`sessionStorage['ps-echo-return']`, 45 min) and brings the reader back to the same slide when Atlas or Long Watch closes. |
| `atlas-time.js/.css` | eager | Time scrubber, flares overlay, wave captions, UNDATED tray. `window.__atlasTime.{setYear, play, stop, year, waves, undated}`. |
| `atlas-ascension.js` | eager | Small hooks only: `data-id` on density circles, `data-a/b` on constellation links, `atlas:layers` event. |
| `long-watch.js/.css/-data.js` | lazy | `LongWatch.openEntry(id)`, `lw:closed` event, Mirror Moments (`mirrorHTML`, `mm*`), `LW_DATA.mirrors`. |
| `long-watch-boot.js` | eager | `window.__lwLoad()` so an echo can load the Long Watch without pressing its button. |

## Honesty rules (keep these true)
- Echoes and Mirror Moments show **similar descriptions**, never a link. Both say so on screen.
- Echo threshold: score ≥ 3 and (a shared specific motif, or two shared motifs). Weights: specific 3, context 2 (`orb`, `military`, `mass`, `official`). Do not lower it to make strips appear; no echo is better than a weak one.
- Never offer hoaxes or modern reinterpretations as echoes (filtered in `build-motifs.py`).
- Intel tags come from the story's own title and description only. Negations ("no saucers"), hedges ("could involve", "theory", "warn") and idioms ("under the radar", "human beings", "disc golf") are stripped first. `beings` needs a witness verb within ~70 characters.
- Wave captions only for archive records that themselves describe a wave or mass sighting, linked to that record's first source.
- Mirror pairs only where both records describe the matching detail. Each half keeps its tag (real image kind or "ARTIST'S RENDERING — based on the recorded account"); each card keeps badge and source.

## Adding things
- **A motif tag**: edit `tags.py`, rebuild. **A rule**: edit `R` in `motifs-core.js`, rebuild, then run the tagger over a live snapshot and read every story that gains an echo.
- **A wave caption**: add to `WAVES` in `atlas-time.js` with the archive id whose record describes the wave.
- **A Mirror Moment**: add to `MIRRORS` in `long-watch-data.js` (`a`, `b`, `line`, `match`, `fa/fb` = `[x, y, zoom]` of the matching detail in each hero image, `ca/cb` paraphrases, `sa/sb` citations). Check alignment at phone and desktop size; the matched detail should sit on the seam.

## Performance notes
- Echoes: computed once per scan; strip animation is transform/opacity; thumbnails only for the visible slide ±1.
- Scrubber: the handle moves by transform each frame; the map SVG is touched only when the whole year changes, and only elements whose state changes are written (cached hubs, density circles, links). The track's box is measured once per drag. Flares and captions are HTML on the compositor (WAAPI).
- Mirrors: one WebGL canvas, moved to the moment on screen; two textures at most, deleted when it leaves; the context is lost on Long Watch close. The dissolve renders only during the fold (~4.2 s) and while dragging.
- Long Watch hides other body children while open; `.ps-return` is exempt.

## Revert
- Everything: `git revert -m 1 <CONVERGENCE merge commit>` on `main`, push. Pages redeploys; returning visitors get the update prompt.
- One part only:
  - Echoes: remove the `signal-motifs.js` script tag (the strip disappears; `computeEchoes` no-ops without `PSMotifs`).
  - Scrubber: remove the `atlas-time.js` script tag and its stylesheet.
  - Mirror Moments: set `MIRRORS = []` in `long-watch-data.js` (bump the boot stamp).
