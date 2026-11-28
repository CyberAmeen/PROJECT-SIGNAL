# THE LONG WATCH — Project Signal Chronology
Design doc · v1 · 2026-11-27

> Every generation has looked up. This section is the record of what they said they saw, and how honestly we can tell it.

## 1. Promise
A journey from the first carved sky-watchers to the files the Pentagon released last week. It should feel like awe, not a lecture. Every entry says what was reported, who reported it, where to read the original, what skeptics say, and why it endures. "Someone was watching" is always a question, never a claim.

## 2. Shape of the experience
| Beat | What happens | Length |
|---|---|---|
| Entrance: temporal descent | The hub recedes. A ring of years spins backward (2026 → 1947 → 1561 → 218 BCE → antiquity), the stars rewind into a spiral, and a gravitational lens bends the light. It lands on ochre firelight. | ~6 s the first time in a session (skippable); 1.2 s after that; a crossfade with reduced motion |
| Journey | Native vertical scroll *is* time travel: the year odometer rolls with the scroll, the era art changes, and a corner globe turns to each event. | as long as they like |
| Ending: constellation | We pull back. Every event lights up, in order, on a globe and on a single timeline. Then the stat line, the closing lines, and a return to the hub. | ~8 s, then rests |
| Return | Time spins forward to 2026 and the Observation Deck rises back into place. | 1.2 s |

## 3. Eras and visual language
Eight eras, each with its own art direction built from CSS gradients, inline SVG textures and one shared particle canvas. No era backdrop is a big image, so they load instantly and cost almost nothing.

| Era | Span | Palette & material | Ambient particles | Typography |
|---|---|---|---|---|
| Deep antiquity — *The First Watchers* | before 1500 BCE | ochre, umber, firelight on a rock wall (noise texture + warm flicker) | embers rising | Cinzel-style caps (system serif), hand-cut feel |
| Ancient — *Gods, Shields and Omens* | 1500 BCE – 400 CE | papyrus, lapis, gold leaf | gold dust | serif caps with gold gradient |
| Medieval & Renaissance — *Signs in the Heavens* | 400 – 1600 | parchment, iron-gall ink, illuminated borders, woodcut hatching | slow ink motes | blackletter-flavoured serif |
| The Floating World | 1600 – 1860 | ukiyo-e indigo, vermilion seal, Great-Wave-style line waves (original SVG) | drifting petals/spray | serif with a red seal stamp |
| The Press Age | 1860 – 1939 | sepia newsprint, lithograph halftone, column rules | paper dust | condensed newspaper headline |
| Blue Book | 1940 – 1969 | film grain, typewriter, manila folders, CLASSIFIED stamps | grain flicker | monospace typewriter |
| Broadcast | 1970 – 1999 | VHS scanlines, chroma bleed, tracking noise, timestamp OSD | static snow | VCR OSD block caps |
| The Sensor Age | 2000 – today | FLIR greyscale, HUD reticles, emerald signal green (the site's own colour) | star field + scan sweep | Oxanium (site font) |

**Transitions** between eras are a "time seam": as an era boundary crosses mid-screen, the next era's backdrop wipes in through an animated mask (ink bleed, film burn, VHS tracking roll and so on), driven only by `opacity` and `transform` on composited layers. A large ghost era title passes with parallax.

## 4. Interactions
- **Odometer**: a fixed HUD at the top shows the year (BCE/CE) on rolling digit strips. The year is interpolated between event years from the scroll position, so it moves smoothly through gaps and then snaps to each event's year.
- **Corner globe**: a 104 px orthographic globe (land from `PSGeo`, the Atlas geography) slerps to the current event's location and pulses a marker there. It redraws only while it is rotating.
- **Cards**: each event is a card in its era's style: date, place, title, badge and a one-line hook. Tapping a card opens a full **entry sheet** (a bottom sheet on phones, a side panel on desktop) with: date · place · what was reported · the original text (ancient sources: public-domain translation, named) · sources (links) · image with credit · status badge · *What skeptics say* · *Why it endures* · *View in Encounter Atlas* (US cases).
- **Pattern threads**: a toggle in the HUD offers five motifs (glowing discs & shields · lights in formation · beings · missing time · military encounters). Choosing one dims the other cards and draws a glowing thread through every card that shares the motif, across eras. The thread is one SVG path, computed once per toggle or resize.
- **Era rail**: tappable era ticks on the right edge (desktop) or a long-press on the odometer (mobile) jump between eras with a smooth scroll.
- **Sound**: only when site audio is already on (`SignalAudio.live()`). Each era gets a short, quiet tonal bed (fire crackle via filtered noise, a bronze bell, a parchment rustle, a koto-like pluck, a press clack, a projector hum, a VHS hiss, a sonar ping). It never autoplays from silence.
- **Keyboard & accessibility**: every card is a button; the sheet is a dialog with focus trap and Esc; the odometer is `aria-hidden` with a polite live region announcing the era; all text meets 4.5:1 contrast.

## 5. Integrity rules (enforced in data and UI)
1. A badge on every entry: **Primary account · Later retelling · Modern reinterpretation · Explained · Disputed · Unresolved · Hoax**.
2. Ancient and religious texts: show what the text actually says (a public-domain translation, named, or our literal rendering of the original Latin, labelled as such). Any UFO reading is shown separately and labelled *Modern reinterpretation*, with its author and date.
3. No "aliens built monuments" claims. No entry links a structure to visitors.
4. Hoaxes appear only with the Hoax badge and an explanation (Tulli Papyrus, Aurora 1897).
5. Every entry has at least one real, checked source link. Quotes are short: public-domain translations or one brief excerpt per source.
6. Images are public domain or freely licensed (Commons) and always credited. Where no case image exists, a *period* or *location context* image is labelled as such. Images of real people are not used.
7. The ending copy says "every generation looked up", not "visitors came".

## 6. Data model (`long-watch-data.js`)
```js
window.LW_DATA = {
  eras: [{ id, name, title, span: [fromYear, toYear], tint, sound }],
  motifs: { disc: 'Glowing discs & shields', formation: 'Lights in formation', beings: 'Beings', missing: 'Missing time', military: 'Military encounters' },
  events: [{
    id, era, year /* number, negative = BCE */, date /* display */, place, region, continent,
    lat, lon, title, hook /* one line for the card */,
    reported /* what was reported, our words */,
    text: { quote, translation /* named */, ref } | null,     // for ancient/religious texts
    reading: { by, year, summary } | null,                    // modern reinterpretation, labelled
    badge, skeptics, endures, motifs: [], atlas: 'ps-0xx' | null,
    sources: [{ label, url }], image: { src, full, page, credit, caption, kind } | null
  }]
};
```

## 7. Performance plan (iPhone, 60/120 Hz)
- **Lazy everything**: none of the Long Watch code, CSS or data loads until the hub button is pressed. `long-watch.css` + `long-watch-data.js` + `long-watch.js` are about 120 KB uncompressed in total.
- **Native scroll**: no scroll-jacking or custom scroll physics, and the Intel swipe mechanics are untouched. The one passive scroll listener only stores `scrollTop`; all work happens in a single rAF loop that reads cached geometry (measured on resize, never during scroll).
- **Composited animation only**: `transform` and `opacity`. No animated `filter`, `backdrop-filter`, `box-shadow` or layout properties on scrolling content.
- **One ambient canvas** at a capped device-pixel ratio (≤1.5) with an adaptive particle budget that drops when frames run long. It pauses when the tab is hidden or the sheet covers it.
- **Mount window**: only the current era backdrop ±1 is in the DOM; card images attach inside a ±2-screen window and are released (`src` removed) beyond it, so memory stays flat across the full journey and back.
- **Hub**: the hub WebGL scene already releases its GPU when covered; the Long Watch shell joins that "covered" check.
- **Budgets**: no long task over 50 ms after the entrance; p95 frame under 16.7 ms on 4× CPU throttle at iPhone size; JS heap after the full journey and back within 10% of the heap after the first open.

## 8. Hub integration
- A third portal button, **ENTER THE LONG WATCH**, in molten copper flowing into deep violet. Its signature animation is an hourglass-orbit glyph whose sand is a falling star, and the copper sheen flows like liquid metal.
- Layout: the console grid lays portals out from their count. 1–3 portals stack full-width on phones; at wide sizes 3 sit side by side; 4 become a 2 × 2 grid. Every portal has identical width and height.
- Fix: the console said "Awaiting first intelligence scan." next to "LAST SCAN: …". The status line now always agrees with the last-scan stamp.

## 9. Files
`long-watch.js`, `long-watch.css`, `long-watch-data.js` (all new, lazy); small edits to `index.html` (the button and a status fix) and `hub-spectacle.css` (colourway and grid); `sw.js` precache list; asset stamps bumped.
