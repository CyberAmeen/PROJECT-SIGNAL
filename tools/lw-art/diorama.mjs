// THE LONG WATCH: PRISM — living dioramas. Original 2.5D scenes, one per era, five depth layers each:
// 0 sky (opaque, covers the screen) · 1 distant land · 2 midground · 3 near · 4 foreground details.
// Layers 1–4 are transparent strips drawn bottom-anchored in a 2400×1000 frame. All art is original and generic.
// usage: node tools/lw-art/diorama.mjs <outdir>   → <outdir>/<era>-<n>.svg + lights.json
import fs from 'fs';
const DW = 2400, DH = 1000, out = process.argv[2] || '/tmp/dio';
fs.mkdirSync(out, { recursive: true });
const f = n => +(+n).toFixed(1);
let uid = 0; const id = p => `${p}${++uid}`;
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const lin = (i, stops, o = {}) => `<linearGradient id="${i}" x1="${o.x1 ?? 0}" y1="${o.y1 ?? 0}" x2="${o.x2 ?? 0}" y2="${o.y2 ?? 1}">${stops.map(([p, c, a = 1]) => `<stop offset="${p}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
const rad = (i, stops, o = {}) => `<radialGradient id="${i}" cx="${o.cx ?? .5}" cy="${o.cy ?? .5}" r="${o.r ?? .5}">${stops.map(([p, c, a = 1]) => `<stop offset="${p}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
function ridge(seed, y, amp, fill, { rough = 1, step = 18, bottom = DH + 4, extra = '' } = {}) {
  const r = rng(seed), ph = [r() * 9, r() * 9, r() * 9, r() * 9]; let d = `M-20 ${bottom} L-20 ${f(y)}`;
  for (let x = -20; x <= DW + 20; x += step) { const t = x / DW; const v = Math.sin(t * 4.1 + ph[0]) * .5 + Math.sin(t * 9.3 + ph[1]) * .28 * rough + Math.sin(t * 23 + ph[2]) * .12 * rough + Math.sin(t * 61 + ph[3]) * .05 * rough; d += ` L${f(x)} ${f(y - v * amp)}`; }
  return `<path d="${d} L${DW + 20} ${bottom}Z" fill="${fill}" ${extra}/>`;
}
function stars(seed, n, maxY, color = '#fff', [a, b] = [.25, 1], [r0, r1] = [.6, 2.2]) { const r = rng(seed); let s = ''; for (let i = 0; i < n; i++) s += `<circle cx="${f(r() * DW)}" cy="${f(r() * maxY)}" r="${f(r0 + r() ** 3 * (r1 - r0))}" fill="${color}" opacity="${f(a + r() * (b - a))}"/>`; return s; }
function glowDef(defs, color, core = '#fff') { const g = id('gl'); defs.push(rad(g, [[0, core, 1], [.2, color, .9], [.5, color, .3], [1, color, 0]])); return g; }
const doc = (defs, body, opaque) => `<svg xmlns="http://www.w3.org/2000/svg" width="${DW}" height="${DH}" viewBox="0 0 ${DW} ${DH}"><defs>${defs.join('')}</defs>${body}</svg>`;
const hatchDef = (defs, gap, w, color, angle, op = 1) => { const i = id('h'); defs.push(`<pattern id="${i}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><rect width="${gap}" height="${w}" fill="${color}" opacity="${op}"/></pattern>`); return i; };
const dotsDef = (defs, gap, r, color, op = 1) => { const i = id('d'); defs.push(`<pattern id="${i}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(20)"><circle cx="${gap / 2}" cy="${gap / 2}" r="${r}" fill="${color}" opacity="${op}"/></pattern>`); return i; };
const noiseDef = (defs, freq, k, rgb) => { const i = id('n'); defs.push(`<filter id="${i}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 ${rgb[0]} 0 0 0 0 ${rgb[1]} 0 0 0 0 ${rgb[2]} 0 0 0 ${k} 0"/></filter>`); return i; };
const blurDef = (defs, sd) => { const i = id('b'); defs.push(`<filter id="${i}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`); return i; };

/* ── shared silhouettes ── */
function pine(x, y, h, fill) { let p = `M${f(x)} ${f(y - h)}`; const n = 7; for (let i = 1; i <= n; i++) { const yy = y - h + h * i / n, w = h * .06 * i; p += ` L${f(x + w)} ${f(yy)} L${f(x + w * .35)} ${f(yy - h * .025)}`; } for (let i = n; i >= 1; i--) { const yy = y - h + h * i / n, w = h * .06 * i; p += ` L${f(x - w * .35)} ${f(yy - h * .025)} L${f(x - w)} ${f(yy)}`; } return `<path d="${p}Z" fill="${fill}"/><rect x="${f(x - h * .02)}" y="${f(y - 2)}" width="${f(h * .04)}" height="${f(h * .08)}" fill="${fill}"/>`; }
function cypress(x, y, h, fill) { return `<path d="M${f(x)} ${f(y - h)} Q${f(x + h * .13)} ${f(y - h * .55)} ${f(x + h * .07)} ${f(y)} L${f(x - h * .07)} ${f(y)} Q${f(x - h * .13)} ${f(y - h * .55)} ${f(x)} ${f(y - h)}Z" fill="${fill}"/>`; }
function grass(seed, y, n, h, fill, x0 = 0, x1 = DW) { const r = rng(seed); let d = ''; for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), hh = h * (.4 + r()), lean = (r() - .5) * hh * .5; d += `M${f(x - 3)} ${y} Q${f(x + lean * .4)} ${f(y - hh * .6)} ${f(x + lean)} ${f(y - hh)} Q${f(x + lean * .3 + 2)} ${f(y - hh * .5)} ${f(x + 4)} ${y}Z`; } return `<path d="${d}" fill="${fill}"/>`; }
function boulder(x, y, w, h, fill, extra = '') { return `<path d="M${f(x - w / 2)} ${f(y)} Q${f(x - w * .52)} ${f(y - h * .7)} ${f(x - w * .15)} ${f(y - h)} Q${f(x + w * .3)} ${f(y - h * 1.04)} ${f(x + w * .5)} ${f(y - h * .45)} L${f(x + w * .52)} ${f(y)}Z" fill="${fill}" ${extra}/>`; }

const L = {}; // light anchors per era: [{k:'torch'|'head'|'blink'|'street'|'fire', layer, x, y}] in frame fractions
const E = {};

/* 1 ── DEEP ANTIQUITY: Val Camonica — an alpine valley at night, a fire below glacier-polished rock ── */
E.deep = () => {
  const s0 = (() => { const d = [], g = id('s'), m = id('m'), bl = blurDef(d, 26); d.push(lin(g, [[0, '#04040c'], [.6, '#120d1c'], [1, '#2a1712']]));
    return doc(d, `<rect width="${DW}" height="${DH}" fill="url(#${g})"/><g filter="url(#${bl})" opacity=".55"><ellipse cx="1350" cy="330" rx="1150" ry="110" fill="#5a4a6e" transform="rotate(-16 1350 330)"/><ellipse cx="1300" cy="340" rx="700" ry="50" fill="#a08a9a" transform="rotate(-16 1300 340)" opacity=".5"/></g>${stars(11, 900, 760, '#fff3e0', [.15, .95])}${stars(12, 260, 520, '#ffd9b0', [.3, .8], [.4, 1])}`); })();
  const s1 = (() => { const d = [], g = id('g'); d.push(lin(g, [[0, '#4a3f5c'], [1, '#1d1726']]));
    return doc(d, ridge(21, 560, 300, `url(#${g})`, { rough: 2.4, step: 10 }) + ridge(24, 640, 200, '#2e2540', { rough: 2.2, step: 12 }) + ridge(23, 740, 110, '#18121f', { rough: 1.2 })); })();
  const s2 = (() => { const d = [], r = rng(31); let t = ''; for (let i = 0; i < 70; i++) { const x = r() * DW, y = 760 + r() * 40; t += pine(x, y, 90 + r() * 120, '#0f0b12'); }
    return doc(d, ridge(32, 800, 90, '#120d15', { rough: .8 }) + t); })();
  const s3 = (() => { const d = [], g = id('rk'), gl = glowDef(d, '#ff8a3a', '#ffd9a0'); d.push(lin(g, [[0, '#4a2d1a'], [1, '#1a0f08']])); const carve = '#c08452';
    const fig = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${carve}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".75"><circle cx="0" cy="-70" r="10"/><path d="M0 -60 V-20 M0 -20 L-16 10 M0 -20 L16 10 M-24 -48 L24 -48 M24 -48 V-80"/></g>`;
    const deer = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${carve}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"><path d="M-40 0 V-30 H30 V0 M30 -30 L46 -52 M46 -52 L40 -76 M46 -52 L62 -72 M-40 -30 L-50 -40"/></g>`;
    const sun = (x, y) => `<g stroke="${carve}" stroke-width="6" fill="none" opacity=".7"><circle cx="${x}" cy="${y}" r="26"/>${Array.from({ length: 8 }, (_, i) => { const a = i / 8 * 6.283; return `<path d="M${f(x + Math.cos(a) * 34)} ${f(y + Math.sin(a) * 34)} L${f(x + Math.cos(a) * 50)} ${f(y + Math.sin(a) * 50)}"/>`; }).join('')}</g>`;
    return doc(d, `<path d="M-20 1004 L-20 620 Q300 520 760 560 Q1100 590 1340 640 Q1500 680 1580 760 L1600 1004Z" fill="url(#${g})"/>${fig(300, 760, 1)}${fig(420, 740, .9)}${deer(620, 790, 1.1)}${sun(900, 690)}${fig(1060, 790, .8)}${deer(1240, 830, .8)}<circle cx="1900" cy="930" r="420" fill="url(#${gl})" opacity=".55"/>${boulder(2200, 1004, 600, 260, '#120a06')}`); })();
  const s4 = (() => { const d = []; return doc(d, boulder(140, 1004, 520, 210, '#0a0604') + boulder(1880, 1004, 300, 120, '#0c0705') + grass(41, 1004, 120, 70, '#0a0604', 0, 700) + grass(42, 1004, 80, 60, '#0a0604', 1500, 2400) + `<path d="M1830 1004 L1870 930 L1900 1004Z M1890 1004 L1930 900 L1960 1004Z" fill="#1a0c06"/>`); })();
  L.deep = [{ k: 'fire', layer: 3, x: 1900 / DW, y: 930 / DH }];
  return [s0, s1, s2, s3, s4];
};

/* 2 ── ANCIENT WORLD: a Roman hilltop forum by torchlight under a full moon ── */
E.ancient = () => {
  const s0 = (() => { const d = [], g = id('s'), mg = glowDef(d, '#f3d9a0', '#fff6dc'); d.push(lin(g, [[0, '#06081a'], [.65, '#1b1535'], [1, '#3a2a3a']]));
    return doc(d, `<rect width="${DW}" height="${DH}" fill="url(#${g})"/>${stars(51, 650, 700, '#fff4dc', [.2, .9])}<circle cx="1660" cy="230" r="300" fill="url(#${mg})" opacity=".55"/><circle cx="1660" cy="230" r="78" fill="#f6e6c0"/><circle cx="1636" cy="214" r="14" fill="#d9c69c" opacity=".6"/><circle cx="1682" cy="252" r="10" fill="#d9c69c" opacity=".5"/>`); })();
  const s1 = (() => { const d = [], r = rng(61); let c = ''; for (let i = 0; i < 46; i++) { const x = r() * DW; c += cypress(x, 760 - 40 * Math.sin(x / 300), 90 + r() * 90, '#1a1628'); }
    return doc(d, ridge(62, 700, 110, '#272138', { rough: .7 }) + c + ridge(63, 780, 60, '#1a1628', { rough: .5 })); })();
  const s2 = (() => { const d = [], g = id('t'), rim = '#7a6248'; d.push(lin(g, [[0, '#3a2c2c'], [1, '#1c1418']]));
    let cols = ''; for (let i = 0; i < 8; i++) { const x = 890 + i * 80; cols += `<rect x="${x}" y="520" width="34" height="210" fill="url(#${g})"/><rect x="${x - 6}" y="512" width="46" height="12" fill="#2a2024"/><rect x="${x + 22}" y="520" width="6" height="210" fill="${rim}" opacity=".35"/>`; }
    let arc = ''; for (let i = 0; i < 9; i++) arc += `<path d="M${120 + i * 70} 820 V700 A30 30 0 0 1 ${180 + i * 70} 700 V820Z" fill="#1d1620"/>`;
    return doc(d, `<path d="M-20 1004 L-20 860 Q600 740 1200 720 Q1800 740 2420 860 V1004Z" fill="#1a1318"/><path d="M850 512 L1215 400 L1580 512Z" fill="#2c2226"/><path d="M880 500 L1215 420 L1550 500Z" fill="none" stroke="${rim}" stroke-width="5" opacity=".5"/><rect x="850" y="730" width="730" height="30" fill="#251c20"/>${cols}<rect x="100" y="690" width="720" height="18" fill="#1d1620"/>${arc}<rect x="1700" y="610" width="300" height="140" fill="#1c1519"/><path d="M1680 612 L1850 560 L2020 612Z" fill="#221a1e"/>`); })();
  const s3 = (() => { const d = []; let steps = ''; for (let i = 0; i < 6; i++) steps += `<rect x="${500 - i * 60}" y="${880 + i * 22}" width="${1400 + i * 120}" height="24" fill="${i % 2 ? '#151013' : '#191216'}"/>`;
    const torch = x => `<rect x="${x - 7}" y="700" width="14" height="190" fill="#120c0e"/><path d="M${x - 26} 700 L${x + 26} 700 L${x + 14} 676 L${x - 14} 676Z" fill="#1a1114"/>`;
    return doc(d, steps + torch(560) + torch(1840) + `<rect x="1140" y="760" width="120" height="130" fill="#140e11"/>`); })();
  const s4 = (() => { const d = [], r = rng(71), ink = '#0c0a0c'; const olive = (x, y, a, l) => { let o = `<path d="M${x} ${y} Q${f(x + Math.cos(a) * l * .5 + 30)} ${f(y + Math.sin(a) * l * .5)} ${f(x + Math.cos(a) * l)} ${f(y + Math.sin(a) * l)}" stroke="${ink}" stroke-width="9" fill="none"/>`; for (let k = 1; k < 12; k++) { const t = k / 12, px = x + Math.cos(a) * l * t, py = y + Math.sin(a) * l * t, side = k % 2 ? 1 : -1; o += `<ellipse cx="${f(px + side * 18)}" cy="${f(py + side * 10)}" rx="30" ry="8" transform="rotate(${f(a * 57.3 + side * 35)} ${f(px + side * 18)} ${f(py + side * 10)})" fill="${ink}"/>`; } return o; };
    return doc(d, `<ellipse cx="300" cy="985" rx="230" ry="60" fill="#0d0a0c"/><rect x="120" y="900" width="360" height="90" rx="20" fill="#110c0e"/>` + olive(-20, 760, .25, 520) + olive(-20, 880, -.15, 420) + olive(2420, 740, 2.9, 520) + olive(2420, 860, 3.25, 400)); })();
  L.ancient = [{ k: 'torch', layer: 3, x: 560 / DW, y: 680 / DH }, { k: 'torch', layer: 3, x: 1840 / DW, y: 680 / DH }];
  return [s0, s1, s2, s3, s4];
};

/* 3 ── MEDIEVAL & RENAISSANCE: a walled hill city under a woodcut sky ── */
E.medieval = () => {
  const s0 = (() => { const d = [], g = id('s'), h = hatchDef(d, 9, 2.2, '#cbb58c', -12, .18), h2 = hatchDef(d, 7, 2, '#cbb58c', 30, .14); d.push(lin(g, [[0, '#120e0a'], [1, '#2a2116']]));
    let clouds = ''; const r = rng(81); for (let i = 0; i < 7; i++) { const x = r() * DW, y = 120 + r() * 420, w = 300 + r() * 400; clouds += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w)}" ry="${f(w * .16)}" fill="url(#${i % 2 ? h : h2})"/>`; }
    let rays = ''; for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; rays += `<path d="M${f(1780 + Math.cos(a) * 110)} ${f(200 + Math.sin(a) * 110)} L${f(1780 + Math.cos(a) * (190 + (i % 2) * 60))} ${f(200 + Math.sin(a) * (190 + (i % 2) * 60))}" stroke="#d8c49a" stroke-width="3" opacity=".35"/>`; }
    return doc(d, `<rect width="${DW}" height="${DH}" fill="url(#${g})"/>${clouds}${rays}<path d="M1780 120 A80 80 0 1 0 1780 280 A60 60 0 1 1 1780 120Z" fill="#e6d4aa" opacity=".85"/>${stars(82, 260, 600, '#e8d8b4', [.2, .7], [.6, 1.6])}`); })();
  const s1 = (() => { const d = [], h = hatchDef(d, 8, 2.4, '#0f0b07', -30, .55); return doc(d, ridge(91, 720, 110, '#3a2e20', { rough: .6 }) + ridge(91, 720, 110, `url(#${h})`, { rough: .6 }) + ridge(92, 800, 70, '#2a2016', { rough: .5 })); })();
  const s2 = (() => { const d = [], ink = '#15100b', win = '#e8b45a'; let h = ''; const r = rng(101);
    for (let x = -10; x < DW; x += 46 + r() * 40) { const w = 40 + r() * 46, hh = 70 + r() * 90, y = 830; h += `<path d="M${f(x)} ${y} V${f(y - hh)} L${f(x + w / 2)} ${f(y - hh - w * .7)} L${f(x + w)} ${f(y - hh)} V${y}Z" fill="${ink}"/>`; if (r() < .45) h += `<rect x="${f(x + w * .35)}" y="${f(y - hh * .6)}" width="9" height="12" fill="${win}" opacity=".8"/>`; }
    const spire = (x, hh, w) => `<rect x="${x - w / 2}" y="${830 - hh}" width="${w}" height="${hh}" fill="${ink}"/><path d="M${x - w / 2 - 6} ${830 - hh} L${x} ${830 - hh - w * 3.2} L${x + w / 2 + 6} ${830 - hh}Z" fill="${ink}"/>`;
    const castle = `<path d="M1500 830 Q1560 640 1700 600 Q1860 610 1940 830Z" fill="#1a130c"/><rect x="1580" y="470" width="300" height="160" fill="${ink}"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${1580 + i * 40}" y="450" width="22" height="22" fill="${ink}"/>`).join('')}<rect x="1600" y="360" width="70" height="140" fill="${ink}"/><path d="M1594 360 L1635 300 L1676 360Z" fill="${ink}"/><rect x="1790" y="390" width="80" height="110" fill="${ink}"/><rect x="1622" y="420" width="10" height="16" fill="${win}"/>`;
    return doc(d, h + spire(760, 200, 60) + spire(860, 220, 60) + `<rect x="740" y="660" width="140" height="170" fill="${ink}"/>` + spire(1180, 150, 46) + castle); })();
  const s3 = (() => { const d = [], ink = '#0c0805'; let cren = ''; for (let x = 0; x < DW; x += 44) cren += `<rect x="${x}" y="842" width="26" height="20" fill="${ink}"/>`;
    const tower = x => `<rect x="${x - 50}" y="780" width="100" height="230" fill="${ink}"/><path d="M${x - 62} 780 L${x} 700 L${x + 62} 780Z" fill="${ink}"/><rect x="${x - 7}" y="820" width="14" height="22" fill="#e8b45a" opacity=".7"/>`;
    return doc(d, `<rect x="-10" y="860" width="${DW + 20}" height="150" fill="${ink}"/>${cren}${tower(400)}${tower(1300)}${tower(2100)}<path d="M1240 1004 V930 A60 60 0 0 1 1360 930 V1004Z" fill="#1d150d"/>`); })();
  const s4 = (() => { const d = [], ink = '#070504'; const branch = (x, y, a, l, w, depth, r) => { if (depth <= 0 || l < 8) return ''; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; return `<path d="M${f(x)} ${f(y)} L${f(x2)} ${f(y2)}" stroke="${ink}" stroke-width="${f(w)}" stroke-linecap="round"/>` + branch(x2, y2, a - .35 - r() * .3, l * .74, w * .68, depth - 1, r) + branch(x2, y2, a + .3 + r() * .3, l * .7, w * .66, depth - 1, r); };
    const r = rng(111); return doc(d, `<path d="M-20 1004 L-20 950 Q700 900 1400 940 Q2000 960 2420 920 V1004Z" fill="#d9ccb0" opacity=".22"/>` + branch(120, 1004, -1.35, 230, 30, 7, r) + branch(2280, 1004, -1.85, 210, 26, 7, r)); })();
  return [s0, s1, s2, s3, s4];
};

/* 4 ── EDO: a pine coast with breaking waves, in flat woodblock colour ── */
E.woodblock = () => {
  const s0 = (() => { const d = [], g = id('s'); d.push(lin(g, [[0, '#0e2142'], [.45, '#1d3f7a'], [.8, '#7c8fa3'], [1, '#e7d9bd']]));
    let bands = ''; for (let i = 0; i < 4; i++) bands += `<rect x="-10" y="${180 + i * 120}" width="${DW + 20}" height="${30 + i * 6}" fill="#efe3c8" opacity="${.08 + i * .03}"/>`;
    return doc(d, `<rect width="${DW}" height="${DH}" fill="url(#${g})"/>${bands}<circle cx="1820" cy="300" r="118" fill="#d2452f"/>${stars(121, 140, 360, '#f1e9d8', [.2, .6], [.6, 1.4])}`); })();
  const s1 = (() => { const d = []; return doc(d, `<path d="M300 760 L840 360 Q900 330 960 360 L1500 760Z" fill="#3c5a86"/><path d="M790 400 L840 360 Q900 330 960 360 L1010 400 L960 420 L920 390 L880 430 L840 395Z" fill="#f4ecdc"/>` + ridge(131, 770, 50, '#2c4673', { rough: .4 })); })();
  const s2 = (() => { const d = [], ink = '#13263f', r = rng(141); let t = '';
    const bpine = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${ink}"><path d="M0 0 Q-8 -60 6 -120 Q14 -160 -4 -200" stroke="${ink}" stroke-width="10" fill="none"/><ellipse cx="-30" cy="-200" rx="70" ry="18"/><ellipse cx="30" cy="-160" rx="60" ry="15"/><ellipse cx="-20" cy="-120" rx="50" ry="13"/></g>`;
    for (let i = 0; i < 14; i++) t += bpine(80 + i * 170 + r() * 60, 820, .7 + r() * .5);
    return doc(d, `<path d="M-20 1004 L-20 830 Q500 800 1200 820 Q1900 840 2420 810 V1004Z" fill="#1a3050"/>` + t + `<path d="M1500 820 L1560 790 L1620 820Z M1640 820 L1710 780 L1780 820Z" fill="#0f1d33"/>`); })();
  const wave = (seed, y, amp, fill, foam, n) => { const r = rng(seed); let p = `M-40 1004 L-40 ${y}`, fm = ''; const step = DW / n;
    for (let i = 0; i <= n; i++) { const x = i * step, top = y - amp * (.6 + r() * .6); p += ` Q${f(x + step * .25)} ${f(top)} ${f(x + step * .5)} ${f(top + amp * .15)} Q${f(x + step * .75)} ${f(y + amp * .2)} ${f(x + step)} ${f(y)}`;
      for (let k = 0; k < 5; k++) fm += `<path d="M${f(x + step * (.38 + k * .03))} ${f(top + 6)} q${f(10 + k * 4)} -18 ${f(24 + k * 3)} -6" stroke="${foam}" stroke-width="5" fill="none" stroke-linecap="round"/>`; }
    return `<path d="${p} L${DW + 40} 1004Z" fill="${fill}"/>${fm}`; };
  const s3 = (() => doc([], wave(151, 880, 70, '#1d4f8f', '#f1e9d8', 9) + `<g fill="#0e1b2c"><path d="M1500 860 Q1600 880 1700 860 L1690 880 Q1600 896 1510 880Z"/><rect x="1598" y="780" width="5" height="84"/><path d="M1603 784 L1660 840 L1603 840Z" fill="#e8dcc0"/></g>`))();
  const s4 = (() => { const d = [], r = rng(161); let spray = ''; for (let i = 0; i < 46; i++) spray += `<circle cx="${f(r() * DW)}" cy="${f(860 + r() * 90)}" r="${f(1.5 + r() * 3.5)}" fill="#f4ecdc" opacity="${f(.4 + r() * .6)}"/>`;
    return doc(d, wave(171, 960, 110, '#16386a', '#f4ecdc', 5) + spray); })();
  return [s0, s1, s2, s3, s4];
};

/* 5 ── 1890s: a Texas main street in lithograph sepia ── */
E.press = () => {
  const s0 = (() => { const d = [], g = id('s'), dt = dotsDef(d, 11, 2.2, '#5a4128', .25); d.push(lin(g, [[0, '#3a2a1a'], [.7, '#8a6a44'], [1, '#c9a874']]));
    let cl = ''; const r = rng(181); for (let i = 0; i < 6; i++) { const x = r() * DW, y = 180 + r() * 360, w = 260 + r() * 360; cl += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w)}" ry="${f(w * .2)}" fill="#e2c99a" opacity=".22"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w)}" ry="${f(w * .2)}" fill="url(#${dt})"/>`; }
    return doc(d, `<rect width="${DW}" height="${DH}" fill="url(#${g})"/>${cl}`); })();
  const s1 = (() => { const ink = '#4a3622'; const mill = x => `<g fill="none" stroke="${ink}" stroke-width="5"><path d="M${x - 30} 820 L${x} 600 L${x + 30} 820 M${x - 20} 740 H${x + 20} M${x - 26} 790 H${x + 26}"/></g><g fill="${ink}">${Array.from({ length: 12 }, (_, i) => `<rect x="${x - 3}" y="${520}" width="6" height="80" transform="rotate(${i * 30} ${x} 600)"/>`).join('')}<circle cx="${x}" cy="600" r="12"/><path d="M${x} 600 L${x + 80} 590 L${x + 80} 612Z"/></g>`;
    let poles = ''; for (let i = 0; i < 10; i++) poles += `<rect x="${200 + i * 240}" y="${700}" width="5" height="120" fill="${ink}"/><rect x="${186 + i * 240}" y="706" width="34" height="4" fill="${ink}"/>`;
    return doc([], ridge(191, 800, 40, '#6a4e30', { rough: .3 }) + `<path d="M-20 820 L2420 820 V1004 H-20Z" fill="#5a4228"/>` + mill(380) + poles + `<path d="M140 820 Q260 560 480 820Z M1900 820 Q2000 640 2160 820Z" fill="#6a4e30" opacity=".7"/>`); })();
  const s2 = (() => { const ink = '#2e2014', light = '#e9c88c', r = rng(201); let b = '', x = 120;
    while (x < 2300) { const w = 160 + r() * 120, h = 150 + r() * 120; b += `<rect x="${f(x)}" y="${f(860 - h)}" width="${f(w)}" height="${f(h)}" fill="${ink}"/><rect x="${f(x - 6)}" y="${f(860 - h - 28)}" width="${f(w + 12)}" height="34" fill="${ink}"/>`;
      for (let k = 0; k < 2; k++) b += `<rect x="${f(x + 24 + k * (w - 70))}" y="${f(860 - h * .62)}" width="26" height="34" fill="${light}" opacity="${r() < .6 ? .55 : .15}"/>`; b += `<rect x="${f(x + w / 2 - 20)}" y="${f(800)}" width="40" height="60" fill="#1d140c"/>`; x += w + 20 + r() * 60; }
    const tank = `<g fill="${ink}"><rect x="1540" y="520" width="8" height="200"/><rect x="1640" y="520" width="8" height="200"/><path d="M1530 520 H1660 V440 Q1595 410 1530 440Z"/><path d="M1520 444 L1595 390 L1670 444Z"/></g>`;
    return doc([], tank + b + `<rect x="-10" y="860" width="${DW + 20}" height="150" fill="#3a2a1a"/>`); })();
  const s3 = (() => { const ink = '#1f150c'; let rail = ''; for (let x = 0; x < DW; x += 260) rail += `<rect x="${x}" y="880" width="10" height="70" fill="${ink}"/><rect x="${x}" y="886" width="250" height="8" fill="${ink}"/>`;
    const wheel = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${ink}" stroke-width="9"/>${Array.from({ length: 10 }, (_, i) => `<path d="M${x} ${y} L${f(x + Math.cos(i * .628) * r)} ${f(y + Math.sin(i * .628) * r)}" stroke="${ink}" stroke-width="5"/>`).join('')}`;
    return doc([], `<rect x="-10" y="940" width="${DW + 20}" height="70" fill="${ink}"/>${rail}<path d="M1500 900 H1900 L1880 960 H1520Z" fill="${ink}"/>${wheel(1560, 950, 50)}${wheel(1850, 950, 50)}`); })();
  const s4 = (() => doc([], grass(211, 1004, 220, 70, '#140d07') + `<g fill="#140d07">${[60, 200, 2220, 2350].map(x => `<rect x="${x}" y="820" width="16" height="190"/>`).join('')}<rect x="40" y="860" width="200" height="8"/><rect x="2200" y="860" width="200" height="8"/></g>`))();
  return [s0, s1, s2, s3, s4];
};

/* 6 ── 1940s–60s: a desert highway at dusk, one car, on film ── */
E.bluebook = () => {
  const s0 = (() => { const d = [], g = id('s'); d.push(lin(g, [[0, '#0b1420'], [.55, '#1d3040'], [.85, '#8a6a4a'], [1, '#d6a46a']]));
    return doc(d, `<rect width="${DW}" height="${DH}" fill="url(#${g})"/>${stars(221, 420, 520, '#f0e6cc', [.15, .8])}`); })();
  const s1 = (() => { const c = '#3a2c2a'; return doc([], `<path d="M-20 1004 V780 L220 780 L260 640 L560 640 L600 780 L1500 780 L1540 690 L1700 690 L1740 780 L2420 780 V1004Z" fill="${c}"/><path d="M1840 780 L1880 720 L1990 720 L2030 780Z" fill="${c}"/>` + ridge(231, 800, 18, '#2a201f', { rough: .3 })); })();
  const s2 = (() => { const ink = '#141015'; let poles = ''; for (let i = 0; i < 11; i++) { const t = i / 10, x = 1300 + t * 1050, h = 60 + t * 220, y = 820 + t * 40; poles += `<rect x="${f(x)}" y="${f(y - h)}" width="${f(3 + t * 6)}" height="${f(h)}" fill="${ink}"/><rect x="${f(x - 14 - t * 30)}" y="${f(y - h + 6)}" width="${f(31 + t * 66)}" height="${f(2 + t * 3)}" fill="${ink}"/>`; }
    const sign = `<rect x="560" y="610" width="10" height="220" fill="${ink}"/><rect x="470" y="560" width="190" height="70" rx="8" fill="${ink}"/><path d="M490 595 H640 L612 575 M640 595 L612 615" stroke="#ff5a7a" stroke-width="5" fill="none" opacity=".9"/><rect x="380" y="760" width="300" height="70" fill="${ink}"/><rect x="400" y="776" width="260" height="22" fill="#f2c46a" opacity=".55"/>`;
    return doc([], `<path d="M-20 1004 V830 H2420 V1004Z" fill="#1d1618"/>` + poles + sign); })();
  const s3 = (() => { const d = [], road = id('r'); d.push(lin(road, [[0, '#2a2226'], [1, '#141013']]));
    let dash = ''; for (let i = 0; i < 9; i++) { const t = i / 9, y = 840 + t * t * 170, w = 4 + t * 26, h = 6 + t * 30; dash += `<rect x="${f(1200 - w / 2)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="#e6d29a" opacity="${f(.5 + t * .4)}"/>`; }
    const car = `<g transform="translate(1520 905) scale(1.25)" fill="#0e0b0d"><path d="M-110 -6 Q-104 -36 -60 -40 L-30 -66 Q10 -74 52 -66 L84 -40 Q120 -36 124 -6 L124 12 L-110 12Z"/><circle cx="-62" cy="12" r="20"/><circle cx="76" cy="12" r="20"/></g>`;
    return doc(d, `<path d="M1180 830 L1220 830 L2000 1004 L400 1004Z" fill="url(#${road})"/>${dash}${car}`); })();
  const s4 = (() => { const ink = '#0b0809'; const josh = (x, s) => `<g transform="translate(${x} 1004) scale(${s})" stroke="${ink}" stroke-linecap="round" fill="none"><path d="M0 0 V-160 M0 -110 Q-40 -130 -60 -190 M0 -140 Q40 -150 50 -210 M-60 -190 l-14 -22 M50 -210 l12 -24" stroke-width="22"/></g><g transform="translate(${x} 1004) scale(${s})" fill="${ink}"><circle cx="-74" cy="-214" r="22"/><circle cx="62" cy="-236" r="22"/><circle cx="0" cy="-172" r="20"/></g>`;
    return doc([], josh(160, 1.4) + josh(2240, 1.2) + grass(241, 1004, 90, 40, ink, 0, 600) + grass(242, 1004, 90, 40, ink, 1900, 2400)); })();
  L.bluebook = [{ k: 'head', layer: 3, x: 1380 / DW, y: 895 / DH }];
  return [s0, s1, s2, s3, s4];
};

/* 7 ── 1970s–90s: a suburban street at dusk in warm VHS colour ── */
E.broadcast = () => {
  const s0 = (() => { const d = [], g = id('s'); d.push(lin(g, [[0, '#1a0f2e'], [.5, '#5a1f4a'], [.82, '#c4564a'], [1, '#f2a35a']]));
    let bands = ''; for (let i = 0; i < 9; i++) bands += `<rect x="-10" y="${560 + i * 34}" width="${DW + 20}" height="${4 + i}" fill="#ffd08a" opacity="${.04 + i * .012}"/>`;
    return doc(d, `<rect width="${DW}" height="${DH}" fill="url(#${g})"/><circle cx="700" cy="700" r="150" fill="#ffb26a" opacity=".55"/>${bands}${stars(251, 90, 300, '#ffe2f0', [.2, .6], [.5, 1.2])}`); })();
  const s1 = (() => { const ink = '#2a1430', r = rng(261); let trees = ''; for (let i = 0; i < 40; i++) { const x = r() * DW, w = 60 + r() * 90; trees += `<ellipse cx="${f(x)}" cy="${f(770 - r() * 40)}" rx="${f(w)}" ry="${f(w * .8)}" fill="${ink}"/>`; }
    let wires = ''; for (let i = 0; i < 3; i++) wires += `<path d="M-20 ${560 + i * 18} Q600 ${640 + i * 18} 1200 ${580 + i * 18} T2420 ${600 + i * 18}" stroke="#1a0c20" stroke-width="3" fill="none"/>`;
    return doc([], trees + `<rect x="-10" y="770" width="${DW + 20}" height="240" fill="${ink}"/>` + wires + `<rect x="1180" y="540" width="14" height="260" fill="#1a0c20"/><rect x="1140" y="556" width="94" height="8" fill="#1a0c20"/>`); })();
  const s2 = (() => { const ink = '#1d0f22', win = '#ffc27a', r = rng(271); let h = '', x = -40;
    while (x < DW) { const w = 280 + r() * 160, hh = 120 + r() * 60, y = 860; const two = r() < .4; const H2 = two ? hh * 1.6 : hh;
      h += `<rect x="${f(x)}" y="${f(y - H2)}" width="${f(w)}" height="${f(H2)}" fill="${ink}"/><path d="M${f(x - 20)} ${f(y - H2)} L${f(x + w / 2)} ${f(y - H2 - w * .22)} L${f(x + w + 20)} ${f(y - H2)}Z" fill="${ink}"/>`;
      for (let k = 0; k < (two ? 4 : 2); k++) h += `<rect x="${f(x + 30 + (k % 2) * (w - 110))}" y="${f(y - H2 + 30 + Math.floor(k / 2) * hh * .7)}" width="52" height="40" fill="${win}" opacity="${r() < .7 ? .75 : .2}"/>`;
      h += `<rect x="${f(x + w * .45)}" y="${f(y - 70)}" width="40" height="70" fill="#120816"/>`; x += w + 80 + r() * 80; }
    return doc([], h + `<rect x="-10" y="860" width="${DW + 20}" height="150" fill="#170b1c"/>`); })();
  const s3 = (() => { const ink = '#0f0712'; const lamp = x => `<rect x="${x - 6}" y="680" width="12" height="300" fill="${ink}"/><path d="M${x} 690 Q${x + 40} 660 ${x + 90} 676" stroke="${ink}" stroke-width="9" fill="none"/><rect x="${x + 76}" y="672" width="40" height="12" rx="5" fill="${ink}"/>`;
    const car = `<g transform="translate(1500 950) scale(1.4)" fill="${ink}"><path d="M-130 -4 L-120 -30 L-60 -36 L-36 -62 L50 -62 L80 -36 L128 -30 L134 -4 L134 12 L-130 12Z"/><circle cx="-80" cy="12" r="20"/><circle cx="86" cy="12" r="20"/></g>`;
    return doc([], `<rect x="-10" y="960" width="${DW + 20}" height="50" fill="${ink}"/><rect x="-10" y="950" width="${DW + 20}" height="12" fill="#2a1630"/>` + lamp(420) + lamp(1900) + car); })();
  const s4 = (() => { const ink = '#08040a'; return doc([], `<ellipse cx="180" cy="990" rx="320" ry="110" fill="${ink}"/><ellipse cx="2260" cy="995" rx="280" ry="100" fill="${ink}"/><rect x="2060" y="860" width="10" height="140" fill="${ink}"/><rect x="2030" y="830" width="70" height="40" rx="18" fill="${ink}"/>`); })();
  L.broadcast = [{ k: 'street', layer: 3, x: 516 / DW, y: 686 / DH }, { k: 'street', layer: 3, x: 1996 / DW, y: 686 / DH }, { k: 'head', layer: 3, x: 1320 / DW, y: 935 / DH }];
  return [s0, s1, s2, s3, s4];
};

/* 8 ── TODAY: a carrier deck at night, in infrared (white-hot) ── */
E.sensor = () => {
  const s0 = (() => { const d = [], g = id('s'), n = noiseDef(d, .9, .18, [.8, .85, .8]); d.push(lin(g, [[0, '#0b0f0d'], [.75, '#26302b'], [1, '#3a463f']]));
    return doc(d, `<rect width="${DW}" height="${DH}" fill="url(#${g})"/><rect width="${DW}" height="${DH}" filter="url(#${n})"/><rect x="-10" y="770" width="${DW + 20}" height="3" fill="#7d8d84" opacity=".5"/>`); })();
  const s1 = (() => { const hull = '#4a5a52', hot = '#e8fff4'; return doc([], `<rect x="-10" y="772" width="${DW + 20}" height="240" fill="#1a221e"/><g fill="${hull}"><path d="M300 772 L330 742 L620 742 L660 772Z"/><rect x="430" y="700" width="70" height="44"/><rect x="458" y="660" width="8" height="40"/></g><circle cx="610" cy="752" r="6" fill="${hot}" opacity=".9"/><path d="M1700 772 L1720 756 L1880 756 L1900 772Z" fill="${hull}"/>`); })();
  const s2 = (() => { const ink = '#2c3a33', edge = '#9fb5a9'; return doc([], `<path d="M1400 860 V560 H1560 V500 H1620 V430 H1660 V500 H1700 V560 H1760 V860Z" fill="${ink}"/><rect x="1420" y="600" width="320" height="6" fill="${edge}" opacity=".35"/><rect x="1460" y="640" width="60" height="44" fill="#0c120f"/><rect x="1560" y="640" width="60" height="44" fill="#0c120f"/><rect x="1636" y="380" width="6" height="60" fill="${ink}"/><path d="M1600 470 h90 v10 h-90Z" fill="${ink}"/><rect x="1580" y="520" width="140" height="20" fill="${ink}"/><path d="M-20 860 L2420 860 L2420 1004 L-20 1004Z" fill="#202a25"/><rect x="-10" y="858" width="${DW + 20}" height="4" fill="${edge}" opacity=".3"/>`); })();
  const s3 = (() => { const ink = '#0e1411', hot = '#f2fff8'; const jet = (x, y, s, flip = 1) => `<g transform="translate(${x} ${y}) scale(${s * flip} ${s})" fill="${ink}"><path d="M-150 0 L-110 -12 L80 -14 L150 -4 L150 4 L80 14 L-110 12Z"/><path d="M-20 -10 L60 -10 L-30 -70 L-60 -70Z"/><path d="M100 -8 L140 -50 L156 -50 L146 -6Z"/></g><ellipse cx="${x - 152 * s * flip}" cy="${y}" rx="${16 * s}" ry="${8 * s}" fill="${hot}" opacity=".85"/>`;
    let lines = ''; for (let i = 0; i < 6; i++) lines += `<path d="M${200 + i * 380} 1004 L${900 + i * 120} 880" stroke="#5f7568" stroke-width="4" opacity=".35"/>`;
    return doc([], `<path d="M-20 880 L2420 880 L2420 1004 L-20 1004Z" fill="#141c18"/>${lines}${jet(700, 900, 1.3)}${jet(1180, 930, 1.6, -1)}${jet(2000, 910, 1.2)}`); })();
  const s4 = (() => { const ink = '#060908'; return doc([], `<path d="M-20 1004 L-20 960 L700 940 L760 1004Z" fill="${ink}"/><rect x="2140" y="860" width="16" height="144" fill="${ink}"/><rect x="2100" y="850" width="96" height="16" fill="${ink}"/><path d="M1700 1004 L2420 950 V1004Z" fill="${ink}"/>`); })();
  L.sensor = [{ k: 'blink', layer: 2, x: 1639 / DW, y: 382 / DH }, { k: 'blink', layer: 1, x: 462 / DW, y: 662 / DH }, { k: 'blink', layer: 4, x: 2148 / DW, y: 856 / DH }];
  return [s0, s1, s2, s3, s4];
};

for (const era of Object.keys(E)) E[era]().forEach((svg, i) => fs.writeFileSync(`${out}/${era}-${i}.svg`, svg));
fs.writeFileSync(`${out}/lights.json`, JSON.stringify(L));
console.log('wrote', Object.keys(E).length * 5, 'layers to', out);
