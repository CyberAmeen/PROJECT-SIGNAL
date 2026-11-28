# HANDOFF — PRISM (foil cards · real-sun Atlas · living dioramas)

Release stamp `20261128p1` (intel-signal.js/.css, hub-spectacle.js, signal-motion.js, atlas-sky.js/.css, Long Watch boot `V`).

## Intel: holographic foil (`intel-signal.js` FOIL + `foil*`, `intel-signal.css` "PRISM · HOLOGRAPHIC FOIL")
- Three layers behind each card's text: `.fs` sheen (region colours, `mix-blend-mode: color` → hue shifts, brightness and therefore text contrast unchanged), `.fp` glare along the top edge (padding zone, no text), `.fe` bevelled ring (desktop) with a rotating light inside.
- Input: tilt via the shared `PSMotion` grant (hub TILT or Intel's button — never asks twice), else cursor / finger, else a slow idle shimmer. One rAF loop writes transforms to the visible card only.
- Reduced motion: still foil.

## Atlas: the real sun (`atlas-sky.js/.css`)
- NOAA low-precision sun; per-pixel lighting through the map's own Albers projections (lower 48, Alaska, Hawaiʻi insets) at 200 px, scaled up for a soft twilight band; 534 Natural Earth (public domain) cities as emerald glows on the night side. One `<image>` in the map, rebuilt once a minute with `toBlob` (off the main thread).
- Night-side markers get `.ax-night` (brighter). Aurora: HTML overlay along the northern border, on two nights in five when it is dark there; compositor-only.
- HUD: `LOCAL SKY: NIGHT · 11:04 PM PT` from your time zone. The time scrubber does not move the sun.
- Test any time: `?sky=2026-11-29T08:00:00Z` or `__atlasSky.setTime(date|null)`.

## Long Watch: living dioramas (`long-watch.js` DIO*, `long-watch.css` "PRISM · LIVING DIORAMAS")
- Eight original scenes, five layers each, in `lw/dio/{era}-{0..4}-{1200|2400}.webp` (1.4 MB total). Source: `tools/lw-art/diorama.mjs` → `raster-dio.py`.
- Layers are bottom-anchored in a 2.4:1 frame (centre-cropped on phones); parallax = scroll progress through the era × depth; era change: arriving far→near, leaving near→far. Only the current and next era hold images (next loads at 40% of the current era).
- Lights (fire, torches, headlights, streetlights, deck beacons) and atmospheres (fog, heat shimmer, rain) are small compositor-only elements. Reduced motion: still dioramas, no lights moving.

## Revert
`git revert -m 1 <PRISM merge>` on main, push. Parts: remove the `atlas-sky.*` tags (sun off); set `DIO = {}` in long-watch.js (dioramas off, old backdrops return); delete the `${FOIL}` in slideHTML (foil off).
