// THE LONG WATCH: VISIONS — art kit for original era-style renderings.
// Every rendering is an original SVG composition, rasterised in Chrome and labelled
// "ARTIST'S RENDERING — based on the recorded account". Nothing here imitates a real photograph.
export const W = 1600, H = 1000;
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let uid = 0; export const id = p => `${p}${++uid}`;
const f = n => +n.toFixed(1);

/* ── terrain & sky ─────────────────────────────────────────────── */
export function ridge(seed, y, amp, { rough = 1, step = 16, fill = '#000', x0 = -20, x1 = W + 20, bottom = H + 20, extra = '' } = {}) {
  const r = rng(seed), ph = [r() * 9, r() * 9, r() * 9, r() * 9];
  let d = `M${x0} ${bottom} L${x0} ${y}`;
  for (let x = x0; x <= x1; x += step) {
    const t = x / W;
    const v = Math.sin(t * 3.1 + ph[0]) * .5 + Math.sin(t * 7.3 + ph[1]) * .28 * rough + Math.sin(t * 17 + ph[2]) * .12 * rough + Math.sin(t * 41 + ph[3]) * .05 * rough + (r() - .5) * .04 * rough;
    d += ` L${f(x)} ${f(y - v * amp)}`;
  }
  return `<path d="${d} L${x1} ${bottom}Z" fill="${fill}" ${extra}/>`;
}
export function stars(seed, n, { maxY = H * .6, color = '#fff', min = .5, max = 1.8, op = [.3, 1] } = {}) {
  const r = rng(seed); let s = '';
  for (let i = 0; i < n; i++) { const rr = min + r() ** 3 * (max - min); s += `<circle cx="${f(r() * W)}" cy="${f(r() * maxY)}" r="${f(rr)}" fill="${color}" opacity="${f(op[0] + r() * (op[1] - op[0]))}"/>`; }
  return s;
}
export function radial(idv, stops, { cx = .5, cy = .5, r = .5 } = {}) {
  return `<radialGradient id="${idv}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
}
export function linear(idv, stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1 } = {}) {
  return `<linearGradient id="${idv}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
}
export function glow(defs, x, y, r, color, { core = '#fff', k = 1 } = {}) {
  const g = id('g'); defs.push(radial(g, [[0, core, 1 * k], [.18, color, .95 * k], [.45, color, .35 * k], [1, color, 0]]));
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${g})"/>`;
}

/* ── silhouettes (original, generic shapes) ────────────────────── */
export const sil = {
  lens(x, y, w, h, { fill = '#cfd6dc', rim = '#fff', dome = true, lights = null } = {}) {
    let s = `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${h / 2}" fill="${fill}"/>`;
    if (dome) s += `<ellipse cx="${x}" cy="${y - h * .32}" rx="${w * .2}" ry="${h * .5}" fill="${fill}" opacity=".9"/>`;
    s += `<ellipse cx="${x}" cy="${y - h * .08}" rx="${w / 2}" ry="${h * .12}" fill="${rim}" opacity=".45"/>`;
    if (lights) for (let i = 0; i < 7; i++) { const t = (i + .5) / 7; s += `<circle cx="${f(x - w / 2 + t * w)}" cy="${f(y + h * .12 + Math.sin(t * Math.PI) * h * .12)}" r="${f(h * .07)}" fill="${lights[i % lights.length]}"/>`; }
    return s;
  },
  egg(x, y, w, h, fill) { return `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${h / 2}" fill="${fill}"/>`; },
  galley(x, y, s, fill) {
    return `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><path d="M-120 0 Q-60 26 0 28 Q70 26 130 -6 L150 -26 L132 -4 Q60 6 0 6 Q-70 4 -126 -14Z"/><rect x="-6" y="-120" width="6" height="122"/><path d="M-60 -110 Q0 -128 60 -110 L56 -30 Q0 -40 -56 -30Z" opacity=".85"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${-96 + i * 22}" y="12" width="3" height="40" transform="rotate(${18} ${-96 + i * 22} 12)"/>`).join('')}</g>`;
  },
  shield(x, y, r, { body = '#c94a1c', boss = '#ffd27a', flame = '#ff8a2a' } = {}) {
    let s = '';
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, l = r * (1.35 + (i % 3) * .18); s += `<path d="M${f(x + Math.cos(a - .14) * r)} ${f(y + Math.sin(a - .14) * r)} Q${f(x + Math.cos(a) * l * 1.05)} ${f(y + Math.sin(a) * l * 1.05)} ${f(x + Math.cos(a + .14) * r)} ${f(y + Math.sin(a + .14) * r)}Z" fill="${flame}" opacity=".85"/>`; }
    return s + `<circle cx="${x}" cy="${y}" r="${r}" fill="${body}" stroke="#2a120a" stroke-width="${r * .08}"/><circle cx="${x}" cy="${y}" r="${r * .62}" fill="none" stroke="${boss}" stroke-width="${r * .06}"/><circle cx="${x}" cy="${y}" r="${r * .2}" fill="${boss}"/>`;
  },
  church(x, y, s, fill) { return `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><rect x="-60" y="-70" width="120" height="70"/><path d="M-66 -70 L0 -110 L66 -70Z"/><rect x="40" y="-150" width="34" height="150"/><path d="M36 -150 L57 -196 L78 -150Z"/><rect x="54" y="-214" width="4" height="22"/><rect x="47" y="-207" width="18" height="4"/></g>`; },
  fortress(x, y, s, fill) { let p = ''; for (let i = 0; i < 9; i++) p += `<rect x="${-200 + i * 46}" y="-112" width="24" height="20"/>`; return `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><rect x="-210" y="-96" width="420" height="96"/>${p}<rect x="-250" y="-160" width="70" height="160"/><rect x="180" y="-180" width="70" height="180"/>${[-250, 180].map(t => [0, 1, 2].map(k => `<rect x="${t + k * 26}" y="${t < 0 ? -176 : -196}" width="16" height="18"/>`).join('')).join('')}</g>`; },
  figure(x, y, s, fill, { spear = false, run = false } = {}) {
    const lean = run ? 'rotate(-12)' : '';
    return `<g transform="translate(${x} ${y}) scale(${s}) ${lean}" fill="${fill}"><circle cx="0" cy="-58" r="7"/><path d="M-6 -50 L6 -50 L8 -22 L-8 -22Z"/><path d="M-7 -22 L${run ? -16 : -6} 0 L${run ? -10 : -1} 0 L0 -14 L${run ? 12 : 1} 0 L${run ? 18 : 6} 0 L7 -22Z"/>${spear ? '<rect x="9" y="-86" width="2.4" height="86"/><path d="M8 -86 L10.2 -96 L12.4 -86Z"/>' : ''}</g>`;
  },
  rowboat(x, y, s, fill) { return `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><path d="M-70 -8 Q0 14 70 -8 L62 6 Q0 22 -62 6Z"/>${[-30, 0, 30].map(t => `<circle cx="${t}" cy="-26" r="5"/><path d="M${t - 6} -20 L${t + 6} -20 L${t + 5} -6 L${t - 5} -6Z"/>`).join('')}<path d="M-40 -6 L-92 10" stroke="${fill}" stroke-width="3"/><path d="M40 -6 L92 10" stroke="${fill}" stroke-width="3"/></g>`; },
  twinProp(x, y, s, fill, rot = 0) { return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${fill}"><path d="M-150 0 Q-140 -9 -60 -9 L90 -7 Q140 -4 150 0 Q140 5 90 7 L-60 9 Q-140 9 -150 0Z"/><path d="M-20 -6 L40 -6 L-30 -95 L-52 -95Z"/><path d="M-20 6 L40 6 L-30 95 L-52 95Z"/><ellipse cx="0" cy="-48" rx="40" ry="9"/><ellipse cx="0" cy="48" rx="40" ry="9"/><path d="M110 -4 L140 -42 L152 -42 L138 0 L152 42 L140 42 L110 4Z"/></g>`; },
  jet(x, y, s, fill, rot = 0) { return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${fill}"><path d="M-150 0 L-110 -10 L80 -12 L150 -4 L150 4 L80 12 L-110 10Z"/><path d="M-20 -10 L60 -10 L-40 -110 L-70 -110Z"/><path d="M-20 10 L60 10 L-40 110 L-70 110Z"/><path d="M100 -8 L140 -60 L156 -60 L146 -6Z"/><path d="M100 8 L140 60 L156 60 L146 6Z"/></g>`; },
  cessna(x, y, s, fill, rot = 0) { return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${fill}"><path d="M-90 2 Q-80 -14 -40 -16 L70 -8 L110 -26 L120 -26 L112 -4 L118 4 L60 8 L-40 12 Q-84 12 -90 2Z"/><rect x="-60" y="-22" width="120" height="7" rx="3"/><rect x="-94" y="-16" width="4" height="34"/><circle cx="-30" cy="22" r="6"/><circle cx="20" cy="20" r="5"/></g>`; },
  airliner(x, y, s, fill, rot = 0) { return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${fill}"><path d="M-220 0 Q-216 -16 -170 -18 L170 -14 Q200 -12 216 -40 L232 -40 L226 -8 Q226 8 200 10 L-170 18 Q-216 16 -220 0Z"/><path d="M-120 -20 Q-110 -40 -70 -44 L60 -40 L-10 -16Z" opacity=".9"/><path d="M-10 6 L70 6 L10 80 L-30 80Z"/><ellipse cx="0" cy="40" rx="26" ry="9"/></g>`; },
  car(x, y, s, fill) { return `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><path d="M-90 -10 Q-88 -26 -60 -28 L-30 -50 Q0 -56 40 -50 L70 -28 Q92 -26 94 -10 L94 4 L-90 4Z"/><circle cx="-52" cy="6" r="16"/><circle cx="56" cy="6" r="16"/></g>`; },
  pine(x, y, h, fill) { let p = `M${x} ${y - h}`; const n = 6; for (let i = 1; i <= n; i++) { const yy = y - h + h * i / n, w = h * .07 * i; p += ` L${f(x + w)} ${f(yy)} L${f(x + w * .4)} ${f(yy - h * .02)}`; } for (let i = n; i >= 1; i--) { const yy = y - h + h * i / n, w = h * .07 * i; p += ` L${f(x - w * .4)} ${f(yy - h * .02)} L${f(x - w)} ${f(yy)}`; } return `<path d="${p}Z" fill="${fill}"/><rect x="${x - h * .02}" y="${y - h * .02}" width="${h * .04}" height="${h * .1}" fill="${fill}"/>`; },
  triangle(x, y, s, { fill = '#121722', lights = ['#fff6d8', '#fff6d8', '#fff6d8'], red = '#ff3b3b' } = {}) {
    const p = [[x, y - 120 * s], [x - 160 * s, y + 90 * s], [x + 160 * s, y + 90 * s]];
    return `<path d="M${p.map(q => q.map(f).join(' ')).join(' L')}Z" fill="${fill}" stroke="#3a4560" stroke-width="${3 * s}"/>`;
  },
  creature(x, y, s, fill) { return `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}"><path d="M-40 0 Q-46 -30 -30 -52 Q-38 -70 -26 -92 Q-14 -112 4 -110 Q26 -112 32 -90 Q44 -70 34 -52 Q48 -28 44 0Z"/><path d="M-14 -108 Q-18 -128 -10 -136 Q-6 -122 -6 -108Z"/><path d="M2 -110 Q2 -134 10 -142 Q12 -126 10 -110Z"/><path d="M16 -106 Q22 -126 30 -130 Q28 -116 22 -104Z"/></g>`; },
  roofs(seed, y, n, fill, { style = 'gable', w = 70 } = {}) {
    const r = rng(seed); let s = '', x = -20;
    while (x < W + 40) { const ww = w * (.7 + r() * .7), hh = ww * (.35 + r() * .3); if (style === 'east') s += `<path d="M${f(x)} ${y} L${f(x + ww * .1)} ${f(y - hh * .55)} Q${f(x + ww * .5)} ${f(y - hh * 1.05)} ${f(x + ww * .9)} ${f(y - hh * .55)} L${f(x + ww)} ${y}Z" fill="${fill}"/><path d="M${f(x - ww * .06)} ${f(y - hh * .5)} Q${f(x + ww * .5)} ${f(y - hh * .72)} ${f(x + ww * 1.06)} ${f(y - hh * .5)}" stroke="${fill}" stroke-width="${f(ww * .06)}" fill="none"/>`; else s += `<path d="M${f(x)} ${y} L${f(x)} ${f(y - hh * .5)} L${f(x + ww / 2)} ${f(y - hh)} L${f(x + ww)} ${f(y - hh * .5)} L${f(x + ww)} ${y}Z" fill="${fill}"/>`; x += ww + r() * 10; }
    return s;
  }
};

/* ── era kits: defs + background + finishing ───────────────────── */
export function plaster(defs, { freq = .7, k = .35, color = [0.55, 0.45, 0.32] } = {}) {
  const i = id('pl'); defs.push(`<filter id="${i}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="4" seed="3"/><feColorMatrix values="0 0 0 0 ${color[0]} 0 0 0 0 ${color[1]} 0 0 0 0 ${color[2]} 0 0 0 ${k} 0"/></filter>`);
  return `<rect width="${W}" height="${H}" filter="url(#${i})"/>`;
}
export function brushFilter(defs, scale = 6) { const i = id('br'); defs.push(`<filter id="${i}"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`); return i; }
export function blurFilter(defs, sd) { const i = id('bl'); defs.push(`<filter id="${i}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`); return i; }
export function hatch(defs, { gap = 7, w = 1.4, color = '#1b130b', angle = -35, op = 1 } = {}) { const i = id('h'); defs.push(`<pattern id="${i}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><rect width="${gap}" height="${w}" fill="${color}" opacity="${op}"/></pattern>`); return i; }
export function halftone(defs, { gap = 9, r = 2.4, color = '#14253a', angle = 30 } = {}) { const i = id('ht'); defs.push(`<pattern id="${i}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><circle cx="${gap / 2}" cy="${gap / 2}" r="${r}" fill="${color}"/></pattern>`); return i; }
export function vignette(defs, op = .55, color = '#000') { const g = id('v'); defs.push(radial(g, [[.55, color, 0], [1, color, op]], { r: .75 })); return `<rect width="${W}" height="${H}" fill="url(#${g})"/>`; }
export function scanlines(defs, op = .12) { const i = id('sl'); defs.push(`<pattern id="${i}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.4" fill="#000" opacity="${op}"/></pattern>`); return `<rect width="${W}" height="${H}" fill="url(#${i})"/>`; }

/* ── the permanent label ───────────────────────────────────────── */
export function label({ text = "ARTIST'S RENDERING — based on the recorded account", ink = '#fff', band = 'rgba(0,0,0,.62)', font = "'Oxanium', 'Helvetica Neue', Arial, sans-serif" } = {}) {
  const w = Math.max(640, text.length * 13.2);
  return `<g><rect x="0" y="${H - 52}" width="${w}" height="52" fill="${band}"/><rect x="0" y="${H - 52}" width="6" height="52" fill="#ffb066"/><text x="22" y="${H - 19}" font-family="${font}" font-size="21" font-weight="700" letter-spacing="2.2" fill="${ink}">${text.replace(/&/g, '&amp;')}</text></g>`;
}
export function svgDoc(defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs.join('')}</defs>${body}</svg>`;
}
