# NEW HORIZONS — handoff notes (Nov 27, 2026, PR #21)

## What shipped
- 15 new Intel story scenes in a lazy-loaded pack: `intel-scenes-x.js` + `intel-scenes-x.css` (17.5 KB + 27.8 KB raw, ~12 KB gzipped together). The pack loads only when an Intel scan starts (or the stream opens), so the hub's initial load is unchanged apart from ~1.2 KB gz of rotation/loader code in `intel-signal.js`.
- Library: 9 original scenes + 15 new = 24. (The brief said 15 existed; the real count was 9.)
- 4 ships (Dart, Disc, Trident, Orb drone) with behaviours: hovering, passing, distant silhouette, diving in, or absent.
- Region lighting: new scenes use `--rg-a/--rg-b/--rg-c` directly (no hue-rotate) and get class `nx`.
- Sound: each new scene has a bed + synced events in `window.PSSceneSounds`; `sound-barrier.js` falls back to it.
- Reduced motion: each scene has a composed still frame (rules at the end of `intel-scenes-x.css`).
- Asset stamps: `intel-signal.js/.css`, `sound-barrier.js` and the pack → `20261127n1` (the pack inherits the intel-signal stamp).

## Scene catalog (code key · name · ship · best regions)
| key | name | ship | best regions |
|---|---|---|---|
| pulsar | LIGHTHOUSE | none | Pulsar Ice, Violet Deep, Cobalt Drift |
| binary | DUET | Trident, distant | Rose Nebula, Solar Wind, Andromeda Dusk |
| supernova | SHOCKFRONT | none | Red Giant, Solar Wind, Emerald Core |
| quasar | BLAZAR | Dart, passing | Violet Deep, Cobalt Drift, Aurora Drift |
| geyser | CRYOVOLCANO | Orb, hovering | Pulsar Ice, Aurora Drift, Cobalt Drift |
| lava | TERMINATOR | Dart, passing | Red Giant, Solar Wind, Rose Nebula |
| storm | THUNDERHEAD | Disc, distant | Violet Deep, Andromeda Dusk, Cobalt Drift |
| eclipse | CORONA | none | Emerald Core, Pulsar Ice, Andromeda Dusk |
| wormhole | THROAT | Dart, diving in | Violet Deep, Aurora Drift, Emerald Core |
| megastructure | ARCWORK | Disc, hovering | Solar Wind, Emerald Core, Andromeda Dusk |
| crystal | PRISM WORLD | Orb, distant | Pulsar Ice, Rose Nebula, Violet Deep |
| asteroids | DRIFTFIELD | Trident, passing | Solar Wind, Red Giant, Cobalt Drift |
| spiral | GRAND DESIGN | none | Cobalt Drift, Violet Deep, Rose Nebula |
| array | THE LISTENING FIELD | Orb, distant light | Emerald Core, Aurora Drift, Pulsar Ice |
| meteors | MESA NIGHT | none | Andromeda Dusk, Red Giant, Solar Wind |

Full catalog: the "Holo-Scenes" tab of the pinned Sheet "Project Signal — Atlas Coverage Log".

## Rotation rules (`buildScenes` in intel-signal.js)
1. Topical scenes (facility, sensor, bio, files, hearing, craft, sighting) still answer matching stories unless used in the last 8 slides.
2. All other slides draw from a per-session seeded shuffle-bag of ambient scenes (deep, cosmos + the 15).
3. No repeat within 8 slides; no scene+region pair repeated in a session; neighbours prefer a different family and tone. Constraints relax in that order only if nothing fits.
4. If the pack arrives after the stream opened, off-screen slides are re-dealt (`ps:scenesx` event); the visible slide is kept.

## Tests (headless Chrome, 390×844 iPhone size)
- 50 swipes: live `.ix-scene` ≤ 3 + end card; JS heap 4.3 → 4.3 MB; scene DOM nodes bounded (105 → 160, i.e. 3 vs 4 mounted); 0 console errors.
- Rotation over 35 slides: 0 repeats within 8, 0 adjacent duplicates, 0 repeated scene+region pairs; all 24 scenes appeared.
- Reduced motion: all 24 scenes render still frames, 0 errors.
- Live site verified: stamps n1, pack not loaded before scan, loaded after; 0 console errors.

## Revert
`git revert -m 1 012cd78` on main and push (Pages redeploys). Deleting only the pack files also works: the stream falls back to the original 9 scenes.
