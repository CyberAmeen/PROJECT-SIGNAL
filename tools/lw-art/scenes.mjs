// THE LONG WATCH: VISIONS — original renderings, one per entry that has no legal real image of the thing itself.
// Each depicts only what its source records. Hotspots are fractions of the frame (x, y in 0..1).
import { W, H, rng, id, ridge, stars, radial, linear, glow, sil, plaster, brushFilter, blurFilter, hatch, halftone, vignette, scanlines, label, svgDoc } from './kit.mjs';
const hs = (x, y, text) => ({ x: +(x / W).toFixed(4), y: +(y / H).toFixed(4), text });

/* ═══ ANCIENT: papyrus & gold, Roman fresco ═══ */
function frescoFrame(defs) {
  const cr = rng(77); let c = '';
  for (let i = 0; i < 26; i++) { let x = cr() * W, y = cr() * H, d = `M${x | 0} ${y | 0}`; for (let k = 0; k < 6; k++) { x += (cr() - .5) * 90; y += (cr() - .5) * 90; d += ` L${x | 0} ${y | 0}`; } c += `<path d="${d}" stroke="#3a2412" stroke-width="${.6 + cr()}" fill="none" opacity=".22"/>`; }
  return c + `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#7d2418" stroke-width="64"/><rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="#d8b56a" stroke-width="5"/><rect x="52" y="52" width="${W - 104}" height="${H - 104}" fill="none" stroke="#3a1a10" stroke-width="2" opacity=".5"/>` + plaster(defs, { freq: .9, k: .28, color: [.45, .36, .24] }) + vignette(defs, .4, '#2a1608');
}
export function tulli() {
  const defs = []; const sky = id('s'); defs.push(linear(sky, [[0, '#0e2a4a'], [.65, '#2c5577'], [1, '#c89a52']]));
  const gold = id('gd'); defs.push(linear(gold, [[0, '#fff2b0'], [.45, '#e0b04a'], [1, '#8a5a12']], { x1: 0, y1: 0, x2: 1, y2: 1 }));
  const br = brushFilter(defs, 4); let b = `<rect width="${W}" height="${H}" fill="url(#${sky})"/>`;
  b += `<g opacity=".18">${Array.from({ length: 160 }, (_, i) => `<rect x="0" y="${i * 6.3}" width="${W}" height="1.2" fill="#f3e2b0"/>`).join('')}</g>`;
  b += stars(11, 90, { maxY: 520, color: '#f6e7b0', max: 2.2 });
  const circles = [[520, 250, 52], [760, 190, 66], [1010, 260, 48], [1220, 170, 40], [640, 360, 34], [1140, 360, 30]];
  for (const [x, y, r] of circles) b += glow(defs, x, y, r * 2.4, '#ffb347', { k: .7 }) + `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="url(#${gold})" stroke-width="${r * .28}"/><circle cx="${x}" cy="${y}" r="${r * .5}" fill="#fff3c2" opacity=".55"/>`;
  b += `<path d="M0 760 Q400 720 800 742 T1600 730 L1600 1000 L0 1000Z" fill="#3a2a14"/><path d="M0 800 Q500 790 900 812 T1600 800 L1600 860 L0 860Z" fill="#1d4d6a" opacity=".85"/>`;
  b += `<g>${Array.from({ length: 15 }, (_, i) => sil.figure(150 + i * 92, 960, 2.3, '#1a120a', { spear: true }) + `<ellipse cx="${150 + i * 92 - 12}" cy="${960 - 80}" rx="11" ry="20" fill="#7d2418" stroke="#1a120a" stroke-width="3"/>`).join('')}</g>`;
  b += `<g transform="translate(0 0)"><rect x="60" y="60" width="${W - 120}" height="26" fill="url(#${gold})"/>${Array.from({ length: 48 }, (_, i) => `<path d="M${70 + i * 30} 86 L${85 + i * 30} 64 L${100 + i * 30} 86" stroke="#1d4d6a" stroke-width="5" fill="none"/>`).join('')}</g>`;
  b += plaster(defs, { freq: .8, k: .22, color: [.6, .5, .3] }) + vignette(defs, .45, '#140c04');
  b += label({ text: "ARTIST'S RENDERING — of the 1953 \"Tulli\" text, which is a HOAX" });
  return { svg: svgDoc(defs, b), hotspots: [hs(760, 190, 'The "circles of fire" the 1953 text describes — no original papyrus exists'), hs(700, 900, "The king's army watching, as the text claims")] };
}
export function livy() {
  const defs = []; const sky = id('s'); defs.push(linear(sky, [[0, '#3f6a86'], [.55, '#89a9b4'], [1, '#e4c79a']]));
  const br = brushFilter(defs, 7); const soft = blurFilter(defs, 2.2);
  let b = `<rect width="${W}" height="${H}" fill="url(#${sky})"/>`;
  b += `<g filter="url(#${br})">`;
  for (const [x, y, s, o] of [[520, 300, 1.15, .8], [860, 230, 1.35, .9], [1180, 330, 1.0, .7], [720, 420, .8, .55]]) b += `<g filter="url(#${soft})" opacity="${o}">${glow(defs, x, y - 30, 220 * s, '#fff3d6', { k: .55 })}${sil.galley(x, y, s, '#fbf1da')}</g>`;
  b += ridge(5, 760, 70, { fill: '#7f8b5a', rough: .6 }) + ridge(6, 820, 40, { fill: '#9c6b39', rough: .5 });
  b += `<g fill="#e8d6b2" stroke="#6b4a2a" stroke-width="3"><rect x="640" y="700" width="320" height="22"/><path d="M620 700 L800 640 L980 700Z"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${652 + i * 40}" y="722" width="16" height="96"/>`).join('')}<rect x="630" y="818" width="340" height="18"/></g>`;
  b += sil.roofs(8, 880, 0, '#b4694a', { w: 90 });
  b += `</g>` + frescoFrame(defs) + label();
  return { svg: svgDoc(defs, b), hotspots: [hs(860, 200, '"The appearance of ships" shining in the sky (Livy 21.62)'), hs(800, 700, 'Rome, in the winter after Hannibal crossed the Alps')] };
}
export function obsequens() {
  const defs = []; const sky = id('s'); defs.push(linear(sky, [[0, '#2f4a6e'], [.5, '#c9785a'], [.8, '#f0b56a'], [1, '#f6d79a']]));
  const br = brushFilter(defs, 7); let b = `<rect width="${W}" height="${H}" fill="url(#${sky})"/>`;
  b += `<g filter="url(#${br})">` + glow(defs, 260, 720, 260, '#ffcf7a', { k: .9 });
  b += `<path d="M300 420 Q700 300 1080 290" stroke="#ffe7b0" stroke-width="10" fill="none" opacity=".35" stroke-linecap="round"/>`;
  b += glow(defs, 1110, 288, 150, '#ffd28a', { k: .8 }) + sil.shield(1110, 288, 52, { body: '#e8a24a', boss: '#fff1c4', flame: '#ffb860' });
  b += `<path d="M420 120 L520 380" stroke="#fff0c8" stroke-width="6" stroke-linecap="round" opacity=".9"/>` + glow(defs, 520, 380, 60, '#ffd090');
  b += ridge(31, 780, 90, { fill: '#5b4a3a', rough: .7 }) + ridge(32, 840, 50, { fill: '#7a5a3a', rough: .6 });
  b += sil.roofs(33, 830, 0, '#8e3f2a', { w: 60 }).replace(/<path/g, '<path transform="translate(0 0)"');
  b += `</g>` + frescoFrame(defs) + label();
  return { svg: svgDoc(defs, b), hotspots: [hs(1110, 288, '"An orb like a shield" crossing west to east at sunset'), hs(470, 250, 'The blazing torch seen falling at Tarquinii')] };
}

/* ═══ MEDIEVAL: woodcut with hand-tinting; ink wash on silk ═══ */
function paper(defs, base = '#efe3c6') { return `<rect width="${W}" height="${H}" fill="${base}"/>` + plaster(defs, { freq: 1.1, k: .18, color: [.45, .35, .2] }); }
function woodcutFrame() { return `<rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="none" stroke="#1b130b" stroke-width="10"/><rect x="48" y="48" width="${W - 96}" height="${H - 96}" fill="none" stroke="#1b130b" stroke-width="3"/>`; }
export function sigiburg() {
  const defs = []; const ink = '#1b130b'; const hz = hatch(defs, { gap: 9, w: 2, angle: -30 }), hz2 = hatch(defs, { gap: 6, w: 2.4, angle: 30 });
  const tint = blurFilter(defs, 14);
  let b = paper(defs) + `<rect x="60" y="60" width="${W - 120}" height="520" fill="url(#${hz})" opacity=".55"/>`;
  b += `<g filter="url(#${tint})" style="mix-blend-mode:multiply"><circle cx="560" cy="250" r="190" fill="#d9472a" opacity=".55"/><circle cx="1000" cy="230" r="200" fill="#e57a2a" opacity=".5"/><rect x="0" y="600" width="${W}" height="400" fill="#7a8a4a" opacity=".35"/></g>`;
  for (const [x, y] of [[560, 250], [1000, 230]]) { for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; b += `<path d="M${x + Math.cos(a) * 92} ${y + Math.sin(a) * 92} L${x + Math.cos(a) * (150 + (i % 2) * 40)} ${y + Math.sin(a) * (150 + (i % 2) * 40)}" stroke="${ink}" stroke-width="4"/>`; } b += sil.shield(x, y, 78, { body: '#c8321e', boss: '#f3d27a', flame: '#e8662a' }); }
  b += `<path d="M60 980 L60 700 Q400 560 820 600 Q1200 640 ${W - 60} 560 L${W - 60} 980Z" fill="#efe3c6" stroke="${ink}" stroke-width="5"/><path d="M60 980 L60 760 Q400 640 820 680 Q1200 720 ${W - 60} 650 L${W - 60} 980Z" fill="url(#${hz2})" opacity=".5"/>`;
  b += sil.fortress(800, 640, 1.05, '#efe3c6').replace('fill="#efe3c6"', `fill="#efe3c6" stroke="${ink}" stroke-width="5"`) + sil.church(820, 548, .75, '#efe3c6').replace('fill="#efe3c6"', `fill="#efe3c6" stroke="${ink}" stroke-width="7"`);
  b += Array.from({ length: 16 }, (_, i) => sil.figure(170 + i * 34 + (i % 3) * 6, 900 + (i % 2) * 18, 1.3, ink, { spear: i % 2 === 0, run: true })).join('') + Array.from({ length: 10 }, (_, i) => sil.figure(1120 + i * 40, 880 + (i % 2) * 20, 1.2, ink, { spear: true, run: true })).join('');
  b += woodcutFrame() + label({ band: 'rgba(27,19,11,.82)' });
  return { svg: svgDoc(defs, b), hotspots: [hs(560, 250, 'Two shields "red with flame" moving over the church'), hs(800, 560, 'The church inside the besieged fortress of Sigiburg'), hs(330, 880, 'The besieging army in flight, as the annals tell it')] };
}
function silk(defs, base = '#e8dcc0') { return `<rect width="${W}" height="${H}" fill="${base}"/>` + plaster(defs, { freq: .55, k: .14, color: [.5, .42, .28] }) + `<g opacity=".06">${Array.from({ length: 200 }, (_, i) => `<rect x="${i * 8}" y="0" width="1" height="${H}" fill="#6b5a3a"/>`).join('')}</g>`; }
function seal(x, y) { return `<g transform="translate(${x} ${y})"><rect x="-34" y="-34" width="68" height="68" rx="6" fill="#b8321e"/><rect x="-26" y="-26" width="52" height="52" fill="none" stroke="#f1dcc0" stroke-width="3"/><path d="M-14 -16 H14 M0 -16 V18 M-16 4 H16 M-10 18 H10" stroke="#f1dcc0" stroke-width="4"/></g>`; }
export function shenkuo() {
  const defs = []; const b1 = blurFilter(defs, 10), b2 = blurFilter(defs, 4);
  let b = silk(defs);
  b += `<g filter="url(#${b1})">${ridge(41, 430, 150, { fill: '#5b5a52', rough: 1.2 }).replace('/>', ' opacity=".25"/>')}${ridge(42, 520, 110, { fill: '#3b3a34', rough: 1.1 }).replace('/>', ' opacity=".35"/>')}</g>`;
  b += `<rect x="0" y="600" width="${W}" height="400" fill="#c9bfa4" opacity=".55"/>`;
  b += glow(defs, 860, 470, 460, '#ffd98a', { k: .95 }) + `<path d="M760 470 Q860 380 960 470" fill="#f3e6c8" stroke="#3b3a34" stroke-width="5"/><path d="M760 470 Q860 560 960 470" fill="#f7ecd2" stroke="#3b3a34" stroke-width="5"/><circle cx="860" cy="472" r="34" fill="#fffdf2"/>`;
  b += `<path d="M560 640 L860 520 L1160 640" fill="#fff1c8" opacity=".25"/><rect x="600" y="640" width="520" height="16" fill="#fff4d4" opacity=".45" filter="url(#${b2})"/>`;
  const r = rng(43); for (let i = 0; i < 70; i++) { const x = r() * W, y = 700 + r() * 260, h = 60 + r() * 120; b += `<path d="M${x | 0} ${y | 0} Q${(x + 10 * (r() - .5)) | 0} ${(y - h / 2) | 0} ${(x + 20 * (r() - .5)) | 0} ${(y - h) | 0}" stroke="#2a2a24" stroke-width="${1.5 + r() * 2}" fill="none" opacity=".75"/>`; }
  for (const x of [190, 300, 1380]) b += `<path d="M${x} 900 Q${x + 10} 700 ${x - 20} 520" stroke="#2a2a24" stroke-width="14" fill="none"/><path d="M${x + 40} 900 Q${x + 120} 700 ${x + 340} 640" stroke="#2a2a24" stroke-width="6" fill="none" opacity=".55"/>`;
  b += seal(1480, 120) + label({ band: 'rgba(42,42,36,.78)' });
  return { svg: svgDoc(defs, b), hotspots: [hs(860, 470, 'The great "pearl", its shell opening and pouring out light'), hs(860, 650, 'Light across the lake: trees for miles cast shadows, the account says')] };
}
export function azuma() {
  const defs = []; const night = id('n'); defs.push(linear(night, [[0, '#14181f'], [1, '#3a3a36']]));
  const b1 = blurFilter(defs, 3);
  let b = silk(defs, '#2a2b2a') + `<rect width="${W}" height="${H}" fill="url(#${night})" opacity=".8"/>` + stars(51, 140, { maxY: 700, color: '#efe6cf', max: 1.6, op: [.25, .8] });
  const r = rng(52);
  for (let k = 0; k < 4; k++) { const cx = 360 + k * 110 + r() * 60, cy = 260 + r() * 120, rr = 60 + r() * 50; b += `<path d="M${cx - rr} ${cy} C${cx - rr} ${cy - rr * 1.4} ${cx + rr} ${cy - rr * 1.4} ${cx + rr} ${cy} S${cx - rr * .6} ${cy + rr * 1.2} ${cx - rr * .2} ${cy + rr * .2}" stroke="#ffe3a0" stroke-width="3" fill="none" opacity=".75" filter="url(#${b1})"/>` + glow(defs, cx - rr * .2, cy + rr * .2, 34, '#ffdc8a'); }
  b += ridge(53, 760, 120, { fill: '#121313', rough: .9 }) + sil.roofs(54, 900, 0, '#0b0c0c', { style: 'east', w: 150 });
  b += `<rect x="0" y="900" width="${W}" height="100" fill="#0b0c0c"/>` + seal(1480, 120) + label();
  return { svg: svgDoc(defs, b), hotspots: [hs(500, 300, 'Lights "swinging and circling" in the southwest sky until morning'), hs(800, 860, "The shogun's court, where astrologers blamed the wind for swaying the stars")] };
}

/* ═══ WOODBLOCK & WAVE ═══ */
export function joseon() {
  const defs = []; const bok = id('bk'); defs.push(linear(bok, [[0, '#1d3f7a'], [.35, '#6f93c4'], [.7, '#f2e8d4'], [1, '#f2e8d4']]));
  let b = `<rect width="${W}" height="${H}" fill="url(#${bok})"/>` + plaster(defs, { freq: .9, k: .16, color: [.5, .4, .25] });
  b += `<path d="M880 330 Q1060 300 1320 120" stroke="#f6f1e4" stroke-width="44" fill="none" opacity=".55" stroke-linecap="round"/><path d="M880 330 Q1060 300 1320 120" stroke="#f6f1e4" stroke-width="16" fill="none" opacity=".9" stroke-linecap="round"/>`;
  b += glow(defs, 860, 340, 170, '#ffcf6a', { k: 1 }) + `<ellipse cx="860" cy="340" rx="78" ry="34" fill="#ffe8a8" stroke="#1b2440" stroke-width="5"/><ellipse cx="860" cy="330" rx="62" ry="16" fill="#fff7dc" stroke="#1b2440" stroke-width="3"/>`;
  for (const [y, c, s] of [[520, '#3f6c5a', 61], [600, '#2f5546', 62], [680, '#24443a', 63]]) b += ridge(s, y, 140, { fill: c, rough: 1.3, extra: 'stroke="#1b2440" stroke-width="5"' });
  b += `<g fill="#f6f1e4" stroke="#1b2440" stroke-width="5">${[[180, 430, 360], [1150, 470, 330]].map(([x, y, w]) => `<path d="M${x} ${y} q${w * .2} -40 ${w * .4} 0 q${w * .2} -50 ${w * .4} 0 q${w * .2} -30 ${w * .2} 0 Z"/>`).join('')}</g>`;
  b += `<path d="M0 820 Q200 780 400 820 T800 820 T1200 820 T1600 820 L1600 1000 L0 1000Z" fill="#1d3f7a" stroke="#1b2440" stroke-width="5"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${i * 190 - 20} 870 q40 -40 80 0 q-30 -10 -40 20" stroke="#f6f1e4" stroke-width="5" fill="none"/>`).join('');
  b += sil.roofs(65, 800, 0, '#1b2440', { style: 'east', w: 110 }).split('<path').slice(0, 8).join('<path');
  b += label({ band: 'rgba(27,36,64,.82)' });
  return { svg: svgDoc(defs, b), hotspots: [hs(860, 340, 'A bright object "like a washbasin", reported in a clear sky'), hs(1150, 210, 'Its trail and the thunder-like noise reported from several districts'), hs(800, 760, 'Gangwon province: Ganseong, Wonju, Gangneung, Chuncheon and Yangyang sent reports')] };
}
export function winthrop() {
  const defs = []; const ink = '#1b130b'; const hz = hatch(defs, { gap: 7, w: 2.2, angle: 0 }), hz2 = hatch(defs, { gap: 8, w: 1.8, angle: -40 });
  let b = paper(defs, '#ece0c2') + `<rect x="60" y="60" width="${W - 120}" height="600" fill="url(#${hz})" opacity=".7"/>`;
  b += `<rect x="560" y="220" width="200" height="190" fill="#ece0c2" stroke="${ink}" stroke-width="6"/>` + Array.from({ length: 22 }, (_, i) => { const a = i / 22 * Math.PI * 2; return `<path d="M${660 + Math.cos(a) * 140} ${315 + Math.sin(a) * 140} L${660 + Math.cos(a) * 210} ${315 + Math.sin(a) * 210}" stroke="${ink}" stroke-width="4"/>`; }).join('');
  b += `<path d="M770 330 Q980 280 1100 360 Q1220 430 1360 380" stroke="${ink}" stroke-width="4" stroke-dasharray="14 12" fill="none"/><path d="M1300 300 q30 -20 46 -6 l-18 30 z" fill="${ink}" transform="rotate(20 1330 300)"/>`;
  b += `<path d="M1240 640 l20 -60 l20 60 M1300 640 v-40 h40 v40 M1360 640 l24 -70 l24 70 M1420 640 v-36 h44 v36" stroke="${ink}" stroke-width="5" fill="#ece0c2"/>`;
  b += `<path d="M60 980 L60 640 Q500 600 900 660 Q1300 700 ${W - 60} 640 L${W - 60} 980Z" fill="#ece0c2" stroke="${ink}" stroke-width="5"/><path d="M60 760 Q600 700 1100 760 Q1400 790 ${W - 60} 760 L${W - 60} 880 Q900 840 60 880Z" fill="url(#${hz2})"/>`;
  const r = rng(71); for (let i = 0; i < 60; i++) { const x = 70 + r() * 1460, y = 660 + r() * 90; b += `<path d="M${x | 0} ${y | 0} l${(r() * 8 - 4) | 0} -${(20 + r() * 40) | 0}" stroke="${ink}" stroke-width="3"/>`; }
  b += sil.rowboat(560, 820, 1.4, ink);
  b += woodcutFrame() + label({ band: 'rgba(27,19,11,.82)' });
  return { svg: svgDoc(defs, b), hotspots: [hs(660, 315, 'The great light: "about three yards square" when it stood still'), hs(1080, 340, 'Darting back and forth toward Charlestown for two or three hours'), hs(560, 820, 'Three men in a boat, later found a mile upstream')] };
}

/* ═══ BLUE BOOK: mid-century duotone with halftone ═══ */
const NAVY = '#13233a', BLUE = '#2f5f86', CREAM = '#efe3c6', ORANGE = '#f08a3a';
function duoSky(defs, { top = NAVY, bot = BLUE } = {}) { const s = id('s'); defs.push(linear(s, [[0, top], [1, bot]])); const ht = halftone(defs, { gap: 10, r: 2.6, color: '#0a1424', angle: 30 }); return `<rect width="${W}" height="${H}" fill="url(#${s})"/><rect width="${W}" height="${H * .6}" fill="url(#${ht})" opacity=".55"/>`; }
function duoFinish(defs) { return plaster(defs, { freq: 1, k: .14, color: [.9, .85, .7] }) + vignette(defs, .5, '#05090f') + `<rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="${CREAM}" stroke-width="3" opacity=".5"/>` + label({ band: 'rgba(10,18,30,.85)' }); }
export function foo() {
  const defs = []; let b = duoSky(defs) + stars(81, 160, { maxY: 900, color: CREAM, max: 1.4, op: [.2, .7] });
  b += ridge(82, 960, 30, { fill: '#08111d', rough: .5 });
  b += sil.twinProp(760, 520, 1.6, '#08111d', -6) + `<path d="M520 552 L330 572" stroke="${CREAM}" stroke-width="2" opacity=".25"/>`;
  for (const [x, y, r] of [[1100, 420, 22], [1180, 470, 18], [1150, 560, 20]]) b += glow(defs, x, y, r * 5, ORANGE, { core: '#fff2d0' }) + `<circle cx="${x}" cy="${y}" r="${r * .6}" fill="#fff3d6"/>`;
  b += `<path d="M1100 420 q-60 6 -120 0 M1180 470 q-60 6 -120 0 M1150 560 q-60 6 -120 0" stroke="${ORANGE}" stroke-width="3" opacity=".35" fill="none"/>` + duoFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(1150, 480, 'Glowing balls of light pacing the aircraft, matching its moves'), hs(760, 520, 'An Allied night fighter over the Rhine, late 1944')] };
}
export function dc1952() {
  const defs = []; let b = duoSky(defs) + stars(91, 120, { maxY: 600, color: CREAM, max: 1.3, op: [.2, .6] });
  b += `<g fill="#08111d"><path d="M0 820 L1600 820 L1600 1000 L0 1000Z"/><rect x="1060" y="600" width="260" height="220"/><path d="M1090 600 Q1190 470 1290 600Z"/><rect x="1180" y="430" width="20" height="60"/><rect x="1150" y="560" width="80" height="40"/><path d="M380 820 L404 220 L428 820Z"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 130}" y="${760 - (i % 3) * 30}" width="${100}" height="80"/>`).join('')}</g>`;
  for (const [x, y] of [[620, 300], [760, 250], [900, 330], [1010, 270], [860, 180]]) b += glow(defs, x, y, 60, ORANGE, { core: '#fff1d0', k: .9 });
  const cx = 300, cy = 330, R = 200; b += `<circle cx="${cx}" cy="${cy}" r="${R + 14}" fill="#0a1424" stroke="${CREAM}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="#0f2a22"/>${[.33, .66, 1].map(k => `<circle cx="${cx}" cy="${cy}" r="${R * k}" fill="none" stroke="#5fe0a0" stroke-width="1.5" opacity=".5"/>`).join('')}<path d="M${cx} ${cy} L${cx + R * .7} ${cy - R * .7}" stroke="#7dffbf" stroke-width="3"/>${[[.4, -.5], [.55, -.2], [.2, -.65], [-.3, -.3], [.62, .1], [-.1, .4], [.45, -.45]].map(([a, c]) => `<circle cx="${cx + a * R}" cy="${cy + c * R}" r="6" fill="#bfffe0"/>`).join('')}`;
  b += duoFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(330, 260, 'Unidentified targets on Washington National Airport radar'), hs(820, 280, 'Lights reported by pilots and ground witnesses over the capital'), hs(1190, 560, 'The Capitol: targets were tracked over restricted airspace')] };
}
export function levelland() {
  const defs = []; let b = duoSky(defs, { top: '#0e1a2c', bot: '#26476a' }) + stars(101, 110, { maxY: 600, color: CREAM, op: [.2, .6] });
  b += `<path d="M0 700 L1600 700 L1600 1000 L0 1000Z" fill="#0a1320"/><path d="M700 700 L900 700 L1500 1000 L100 1000Z" fill="#1a2a3c"/><path d="M800 700 L800 1000" stroke="${CREAM}" stroke-width="5" stroke-dasharray="40 40" opacity=".5"/>`;
  b += glow(defs, 820, 600, 380, ORANGE, { core: '#fff6dc', k: 1 }) + sil.egg(820, 600, 420, 120, '#ffd6a0');
  b += sil.car(520, 900, 2.0, '#04080f');
  b += duoFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(820, 600, 'A glowing, egg-shaped object on or over the road'), hs(520, 880, "Drivers said engines and headlights died until it left")] };
}
export function hill() {
  const defs = []; let b = duoSky(defs, { top: '#0c1626', bot: '#2a4a6c' }) + stars(111, 200, { maxY: 700, color: CREAM, op: [.2, .7] });
  b += ridge(112, 520, 160, { fill: '#0f1d2f', rough: 1.2 }) + ridge(113, 640, 110, { fill: '#0a1524', rough: 1 });
  b += glow(defs, 1120, 300, 140, ORANGE, { core: '#fffbe8' }) + `<circle cx="1120" cy="300" r="12" fill="#fffbe8"/>`;
  b += `<path d="M-20 980 Q500 760 900 800 Q1250 830 1640 700" stroke="#1d2f45" stroke-width="90" fill="none"/>` + sil.car(860, 800, 1.25, '#03070d') + glow(defs, 980, 790, 70, '#fff6d6', { k: .6 });
  for (let i = 0; i < 30; i++) b += sil.pine(30 + i * 56, 1000 - (i % 4) * 14, 150 + (i % 5) * 26, '#050b14');
  b += duoFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(1120, 300, 'A light that seemed to follow the car through the mountains'), hs(860, 790, 'U.S. Route 3, White Mountains: the couple arrived home about two hours late')] };
}
export function deception() {
  const defs = []; let b = duoSky(defs, { top: '#0a1424', bot: '#3a5f80' }) + stars(121, 150, { maxY: 600, color: CREAM, op: [.2, .8] });
  b += ridge(122, 640, 170, { fill: '#d9e2e8', rough: 1.1, extra: 'opacity=".9"' }) + ridge(123, 700, 90, { fill: '#a9b8c4', rough: 1 });
  b += `<rect x="0" y="760" width="${W}" height="240" fill="#0d1a2a"/>` + `<g fill="#1a2a3c">${[[300, 740], [420, 750], [560, 735]].map(([x, y]) => `<rect x="${x}" y="${y - 50}" width="100" height="50"/><path d="M${x - 8} ${y - 50} L${x + 50} ${y - 80} L${x + 108} ${y - 50}Z"/>`).join('')}<rect x="700" y="640" width="6" height="110"/></g>`;
  const lg = id('lg'); defs.push(linear(lg, [[0, '#ffb36a'], [.5, '#9bffb8'], [1, '#ffd45a']], { x1: 0, y1: 0, x2: 1, y2: 0 }));
  b += glow(defs, 1060, 300, 230, '#ffd08a', { k: .8 }) + `<ellipse cx="1060" cy="300" rx="130" ry="40" fill="url(#${lg})"/><ellipse cx="1060" cy="292" rx="96" ry="14" fill="#fff6e0" opacity=".7"/>`;
  b += duoFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(1060, 300, 'A lens-shaped object changing from red to green and orange'), hs(430, 710, 'Argentine, Chilean and British bases watched it for about twenty minutes')] };
}
export function westall() {
  const defs = []; const sky = id('s'); defs.push(linear(sky, [[0, '#4f86b4'], [1, '#d9e6ea']]));
  const ht = halftone(defs, { gap: 10, r: 2.2, color: '#13233a', angle: 30 });
  let b = `<rect width="${W}" height="${H}" fill="url(#${sky})"/><rect width="${W}" height="${H * .5}" fill="url(#${ht})" opacity=".22"/>`;
  b += `<rect x="0" y="640" width="${W}" height="360" fill="#8a9a5a"/><rect x="0" y="640" width="${W}" height="360" fill="url(#${ht})" opacity=".2"/>`;
  for (let i = 0; i < 26; i++) b += sil.pine(1000 + i * 24, 660 + (i % 3) * 6, 160 + (i % 4) * 30, '#2f4a3a');
  b += sil.lens(1180, 540, 220, 64, { fill: '#9aa3ab', rim: '#e6ecef' }) + `<path d="M1180 575 L1180 640" stroke="#13233a" stroke-width="2" stroke-dasharray="6 6" opacity=".5"/>`;
  b += sil.cessna(780, 260, .8, '#13233a', -8) + sil.cessna(1460, 330, .7, '#13233a', 10);
  b += `<g fill="#c9b9a2" stroke="#13233a" stroke-width="4"><rect x="80" y="560" width="520" height="120"/><path d="M60 560 L340 500 L620 560Z" fill="#a86a4a"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${110 + i * 60}" y="590" width="34" height="40" fill="#f3efe3"/>`).join('')}</g>`;
  b += `<path d="M600 700 L1600 690" stroke="#efe3c6" stroke-width="3" opacity=".6"/>` + duoFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(1180, 540, 'A grey, saucer-shaped object descending beyond the playing fields'), hs(780, 260, 'Light aircraft that seemed to circle it'), hs(340, 600, "Westall's schools: hundreds of students and staff watched")] };
}
export function malmstrom() {
  const defs = []; let b = duoSky(defs, { top: '#0a1220', bot: '#2a3a52' }) + stars(131, 160, { maxY: 650, color: CREAM, op: [.2, .7] });
  b += `<rect x="0" y="700" width="${W}" height="300" fill="#0b1422"/><g stroke="${CREAM}" stroke-width="2" opacity=".5">${Array.from({ length: 30 }, (_, i) => `<path d="M${300 + i * 34} 700 V770"/>`).join('')}<path d="M300 712 H1320 M300 740 H1320"/></g>`;
  b += `<g fill="#060b14"><rect x="640" y="730" width="320" height="30"/><rect x="760" y="700" width="80" height="30"/></g>`;
  b += glow(defs, 800, 470, 200, '#ff4a2a', { core: '#ffd0b8', k: .95 }) + `<circle cx="800" cy="470" r="30" fill="#ff8a6a"/>`;
  b += duoFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(800, 470, 'The red glowing object described decades later in Robert Salas\'s account (unverified)'), hs(800, 740, 'A Minuteman launch facility: Echo Flight\'s shutdown itself is documented')] };
}
export function shag() {
  const defs = []; let b = duoSky(defs, { top: '#0a1424', bot: '#25425e' }) + stars(141, 150, { maxY: 600, color: CREAM, op: [.2, .7] });
  b += `<rect x="0" y="640" width="${W}" height="360" fill="#0c1a2a"/>` + Array.from({ length: 30 }, (_, i) => `<path d="M${(i * 97) % W} ${680 + (i * 37) % 300} h${40 + (i % 5) * 16}" stroke="${CREAM}" stroke-width="2" opacity=".18"/>`).join('');
  for (let i = 0; i < 5; i++) { const x = 760 + i * 70, y = 260 + i * 70; b += glow(defs, x, y, 60, ORANGE, { core: '#fff0d0' }); }
  b += `<path d="M1040 540 L1100 640" stroke="${ORANGE}" stroke-width="3" stroke-dasharray="10 10" opacity=".6"/>` + glow(defs, 1110, 652, 110, '#f6e6b0', { k: .6 }) + `<ellipse cx="1110" cy="656" rx="140" ry="14" fill="#f6edc8" opacity=".7"/>`;
  b += `<path d="M-20 1000 L-20 600 Q120 560 260 610 Q420 660 560 700 L640 760 L-20 760Z" fill="#050b14"/>`;
  b += `<g fill="#050b14"><path d="M300 740 L520 740 L490 770 L320 770Z"/><rect x="400" y="690" width="6" height="50"/><path d="M1300 800 L1460 800 L1440 824 L1316 824Z"/></g>`;
  b += duoFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(900, 400, 'A row of lights descending toward the water'), hs(1110, 655, 'Where it struck: rescuers found a patch of yellowish foam'), hs(410, 740, 'Fishermen and RCMP officers went out to search')] };
}

/* ═══ BROADCAST: 80s airbrush ═══ */
function airSky(defs, stops) { const s = id('s'); defs.push(linear(s, stops)); return `<rect width="${W}" height="${H}" fill="url(#${s})"/>`; }
function airFinish(defs) { return vignette(defs, .5, '#050210') + scanlines(defs, .1) + label({ band: 'rgba(8,6,20,.82)' }); }
function sparkle(x, y, s, c = '#fff') { return `<path d="M${x - s} ${y} L${x + s} ${y} M${x} ${y - s} L${x} ${y + s}" stroke="${c}" stroke-width="2" opacity=".9"/>`; }
export function tehran() {
  const defs = []; let b = airSky(defs, [[0, '#06061a'], [.6, '#1d1450'], [1, '#5a2a6a']]) + stars(151, 200, { maxY: 700, op: [.2, .9] });
  const r = rng(152); let lights = ''; for (let i = 0; i < 700; i++) lights += `<circle cx="${(r() * W) | 0}" cy="${(800 + r() * 200) | 0}" r="${(1 + r() * 2).toFixed(1)}" fill="${r() < .7 ? '#ffd08a' : '#bfe0ff'}" opacity="${(.4 + r() * .6).toFixed(2)}"/>`;
  b += ridge(153, 780, 90, { fill: '#0a0820', rough: 1 }) + lights;
  b += glow(defs, 980, 330, 220, '#ffffff', { core: '#fff', k: .9 }); for (const [dx, dy, c] of [[-60, 0, '#3aa0ff'], [60, 0, '#ff3a5a'], [0, -50, '#7dff8a'], [0, 50, '#ffd24a']]) b += glow(defs, 980 + dx, 330 + dy, 60, c);
  b += sil.jet(520, 420, .9, '#05040f', -10) + glow(defs, 690, 400, 30, '#ffb070', { k: .6 }) + glow(defs, 760, 380, 40, '#fff6dc');
  b += `<path d="M960 350 Q860 380 770 382" stroke="#fff6dc" stroke-width="3" stroke-dasharray="6 10" fill="none" opacity=".7"/>` + airFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(980, 330, 'A brilliant flashing object with coloured lights, over Tehran'), hs(520, 420, 'An F-4 Phantom closing in: crews reported failing instruments'), hs(760, 380, 'A smaller light that one crew said came toward them')] };
}
export function colares() {
  const defs = []; let b = airSky(defs, [[0, '#050914'], [.7, '#0f2440'], [1, '#1e3a52']]) + stars(161, 180, { maxY: 650, op: [.2, .8] });
  b += `<rect x="0" y="720" width="${W}" height="280" fill="#07131f"/>` + Array.from({ length: 40 }, (_, i) => `<path d="M${(i * 137) % W} ${740 + (i * 29) % 240} h${30 + (i % 4) * 20}" stroke="#7fb8ff" stroke-width="2" opacity=".18"/>`).join('');
  const beam = id('bm'); defs.push(linear(beam, [[0, '#fff6c8', .9], [1, '#fff6c8', 0]]));
  b += `<path d="M1010 260 L880 820 L1080 820Z" fill="url(#${beam})" opacity=".7"/>` + glow(defs, 1010, 250, 160, '#fff1b0', { k: 1 });
  for (const x of [160, 420]) b += `<path d="M${x} 760 l120 0 l-14 26 l-92 0z" fill="#03070c"/><rect x="${x + 56}" y="700" width="5" height="60" fill="#03070c"/>`;
  for (let i = 0; i < 14; i++) b += `<path d="M${1200 + i * 30} 720 Q${1210 + i * 30} 610 ${1180 + i * 30} 540" stroke="#03070c" stroke-width="6" fill="none"/><path d="M${1180 + i * 30} 540 q-40 -10 -70 10 M${1180 + i * 30} 540 q40 -12 70 8" stroke="#03070c" stroke-width="5" fill="none"/>`;
  b += sil.roofs(162, 730, 0, '#03070c', { w: 60 }).split('<path').slice(0, 7).join('<path') + airFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(1010, 250, 'A light that residents said shone beams down on people'), hs(980, 760, 'Some described burns and weakness after the beams'), hs(300, 760, 'Fishing communities on Marajó Bay, where the Air Force investigated')] };
}
export function valentich() {
  const defs = []; let b = airSky(defs, [[0, '#0b0c24'], [.55, '#2a1c4a'], [.85, '#c4567a'], [1, '#f2a35a']]) + stars(171, 160, { maxY: 500, op: [.2, .9] });
  b += `<rect x="0" y="780" width="${W}" height="220" fill="#140e2a"/><path d="M0 780 L1600 780" stroke="#f2a35a" stroke-width="2" opacity=".5"/>`;
  b += glow(defs, 980, 300, 240, '#9fe0ff', { k: .5 }) + `<ellipse cx="980" cy="300" rx="190" ry="50" fill="#1a1836" stroke="#9fe0ff" stroke-width="3"/>` + [[-150, 10, '#7dff8a'], [-60, 30, '#fff'], [40, 32, '#7dff8a'], [140, 14, '#fff']].map(([dx, dy, c]) => glow(defs, 980 + dx, 300 + dy, 24, c)).join('');
  b += `<path d="M980 300 m-280 0 a280 110 0 1 0 560 0 a280 110 0 1 0 -560 0" fill="none" stroke="#9fe0ff" stroke-width="2" stroke-dasharray="4 14" opacity=".5"/>` + sil.cessna(760, 520, 1.1, '#07061a', 4) + airFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(980, 300, 'A large object with lights that Valentich said was orbiting above him'), hs(760, 520, 'His Cessna 182 over Bass Strait; he and the aircraft were never found')] };
}
export function belgium() {
  const defs = []; let b = airSky(defs, [[0, '#04060f'], [1, '#1a2240']]) + stars(181, 140, { maxY: 600, op: [.2, .8] });
  b += ridge(182, 820, 40, { fill: '#070912', rough: .4 }) + sil.roofs(183, 860, 0, '#05060c', { w: 70 }) + sil.church(300, 840, 1, '#05060c');
  const r = rng(184); for (let i = 0; i < 80; i++) b += `<rect x="${(r() * W) | 0}" y="${(780 + r() * 70) | 0}" width="6" height="8" fill="#ffd38a" opacity=".7"/>`;
  b += sil.triangle(860, 330, 1.6);
  for (const [x, y] of [[860, 138], [604, 474], [1116, 474]]) b += glow(defs, x, y, 70, '#fff6d8');
  b += glow(defs, 860, 380, 60, '#ff3b3b');
  b += sil.jet(1350, 200, .45, '#0b0e1c', 160) + sil.jet(1440, 260, .45, '#0b0e1c', 160) + airFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(860, 330, 'A large, silent triangle with a light at each corner'), hs(860, 380, 'A red light reported at the centre'), hs(1390, 230, 'Belgian Air Force F-16s scrambled on 30–31 March 1990')] };
}
export function ariel() {
  const defs = []; let b = airSky(defs, [[0, '#5aa0d8'], [1, '#f3e6c8']]);
  b += `<rect x="0" y="600" width="${W}" height="400" fill="#c9a46a"/>` + ridge(191, 620, 30, { fill: '#b28b55', rough: .5 });
  for (const [x, s] of [[1250, 1], [1380, 1.3], [180, 1.2]]) b += `<g transform="translate(${x} 620) scale(${s})" fill="#3e5a2a"><rect x="-8" y="-90" width="16" height="96" fill="#5a3a22"/><ellipse cx="0" cy="-120" rx="90" ry="46"/><ellipse cx="-40" cy="-100" rx="60" ry="30"/></g>`;
  b += `<g fill="#8a7458">${[[900, 640, 60], [980, 650, 40], [1060, 640, 50]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .5}"/>`).join('')}</g>`;
  b += glow(defs, 980, 540, 300, '#ffffff', { k: .85 }) + sil.lens(980, 545, 380, 110, { fill: '#b9c2cc', rim: '#ffffff' }) + `<ellipse cx="980" cy="612" rx="170" ry="14" fill="#5a4a36" opacity=".5"/>`;
  b += `<g stroke="#5a4a3a" stroke-width="5">${Array.from({ length: 30 }, (_, i) => `<path d="M${i * 56} 960 V880"/>`).join('')}<path d="M0 895 H1600 M0 930 H1600"/></g>` + airFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(980, 545, 'A silvery craft the pupils said landed beyond the playground'), hs(800, 920, "The school's boundary at break time, 16 September 1994")] };
}
export function varginha() {
  const defs = []; let b = airSky(defs, [[0, '#4a5560'], [1, '#9aa39a']]);
  { const rr = rng(211); b += Array.from({ length: 220 }, () => `<path d="M${(rr() * W) | 0} ${(rr() * H) | 0} l-8 ${(24 + rr() * 20) | 0}" stroke="#d6dde2" stroke-width="1.4" opacity="${(.15 + rr() * .3).toFixed(2)}"/>`).join(''); }
  b += `<rect x="0" y="560" width="${W}" height="440" fill="#5a5a3e"/><g fill="#3a3a2a">${Array.from({ length: 40 }, (_, i) => `<path d="M${i * 41} 600 q10 -40 4 -70 q14 30 12 70z"/>`).join('')}</g>`;
  b += `<g fill="#6a6f74"><rect x="0" y="380" width="300" height="200"/><rect x="1260" y="400" width="360" height="180"/></g><rect x="300" y="520" width="960" height="12" fill="#4a4e52"/>`;
  b += `<g transform="translate(820 820) scale(.82)" fill="#33211a"><path d="M-46 0 Q-74 -50 -60 -110 Q-46 -150 -6 -156 Q40 -158 58 -116 Q74 -64 52 0Z"/><path d="M-50 -120 Q-86 -80 -80 -8 L-64 -6 Q-66 -66 -38 -102Z"/><path d="M44 -118 Q82 -84 78 -10 L62 -8 Q60 -66 32 -100Z"/><path d="M-60 -6 l-14 10 h30z M56 -8 l16 10 h-30z"/><ellipse cx="0" cy="-212" rx="70" ry="64"/><path d="M-52 -258 q14 -26 30 -4 z M-14 -272 q14 -26 30 -2 z M24 -262 q16 -22 30 4 z"/></g>` + glow(defs, 795, 646, 22, '#ff2a2a', { core: '#ffd0c0' }) + glow(defs, 845, 646, 22, '#ff2a2a', { core: '#ffd0c0' });
  b += airFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(820, 700, 'The crouching figure three young women described: brown, with large red eyes and protrusions on its head'), hs(300, 480, 'A vacant lot in Varginha, on a rainy afternoon')] };
}
export function phoenix() {
  const defs = []; let b = airSky(defs, [[0, '#05050f'], [.7, '#14123a'], [1, '#3a1a3a']]) + stars(201, 160, { maxY: 650, op: [.2, .8] });
  b += ridge(202, 780, 110, { fill: '#0a0818', rough: 1.1 });
  const r = rng(203); let g = ''; for (let i = 0; i < 1400; i++) { const x = r() * W, y = 820 + r() ** 1.5 * 180; g += `<circle cx="${x | 0}" cy="${y | 0}" r="${(.8 + r() * 1.6).toFixed(1)}" fill="${r() < .75 ? '#ffc070' : '#bfe0ff'}" opacity="${(.3 + r() * .7).toFixed(2)}"/>`; }
  b += `<rect x="0" y="800" width="${W}" height="200" fill="#0c0a1a"/>` + g;
  for (const [x, y] of [[560, 210], [680, 270], [800, 330], [920, 270], [1040, 210]]) b += glow(defs, x, y, 60, '#ffb24a', { core: '#fff2d0' });
  for (let i = 0; i < 7; i++) b += glow(defs, 260 + i * 70, 700 - Math.sin(i / 6 * Math.PI) * 10, 30, '#ffb24a', { core: '#fff2d0', k: .8 });
  b += airFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(800, 290, 'Early evening: a V-shaped formation of amber lights crossing Arizona'), hs(470, 690, 'About 10 p.m.: a row of glowing orbs low over the mountains, later attributed to flares')] };
}

export function rendlesham() {
  const defs = []; let b = airSky(defs, [[0, '#03040c'], [.7, '#0d1230'], [1, '#1d1a3a']]) + stars(221, 120, { maxY: 500, op: [.2, .7] });
  b += `<path d="M0 760 L1600 760 L1600 1000 L0 1000Z" fill="#05060e"/>`;
  b += `<path d="M1430 610 L1600 560 L1600 640Z" fill="#fff6d0" opacity=".18"/>` + glow(defs, 1430, 612, 40, '#fff6d0', { k: .9 });
  b += glow(defs, 760, 560, 150, '#ff4a4a', { k: .7 }) + glow(defs, 820, 600, 70, '#bfe0ff', { k: .9 }) + glow(defs, 700, 610, 50, '#ffe6a0', { k: .9 });
  { const rr = rng(225); for (let i = 0; i < 26; i++) { const x = rr() * 1640 - 20, w = 9 + rr() * 12, top = 80 + rr() * 200; b += `<path d="M${(x + w * .2) | 0} 1000 L${(x + w * .35) | 0} ${top | 0} L${(x + w * .65) | 0} ${top | 0} L${(x + w * .8) | 0} 1000Z" fill="#020308"/>`; for (let k = 0; k < 9; k++) { const cx = x + w / 2 + (rr() - .5) * 150, cy = top + (rr() - .3) * 60, rx = 24 + rr() * 46; b += `<path d="M${(cx - rx) | 0} ${cy | 0} q${(rx * .5) | 0} -${(rx * .7) | 0} ${rx | 0} -${(rx * .25) | 0} q${(rx * .6) | 0} -${(rx * .3) | 0} ${rx | 0} ${(rx * .3) | 0} q-${(rx * .4) | 0} ${(rx * .5) | 0} -${(rx * 2) | 0} 0z" fill="#020308"/>`; } } }
  b += Array.from({ length: 5 }, (_, i) => `<g transform="translate(${560 + i * 40} 900)">${sil.figure(0, 0, 1.6, '#000')}</g>`).join('');
  b += airFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(760, 580, 'Lights among the trees that USAF personnel followed into the forest'), hs(1430, 612, 'Orford Ness lighthouse on the horizon, which skeptics say matches some of the lights'), hs(640, 860, "Lt. Col. Halt's patrol, which recorded its observations on tape")] };
}
export function hessdalen() {
  const defs = []; let b = airSky(defs, [[0, '#04060e'], [.6, '#101a33'], [1, '#2a3550']]) + stars(231, 220, { maxY: 600, op: [.2, .9] });
  b += ridge(232, 560, 180, { fill: '#c9d3de', rough: 1.1 }) + ridge(233, 640, 140, { fill: '#8d9bb0', rough: 1 }) + `<rect x="0" y="760" width="${W}" height="240" fill="#dfe6ee"/>`;
  b += ridge(234, 770, 30, { fill: '#5a6a82', rough: .5 });
  for (let i = 0; i < 40; i++) b += sil.pine(20 + i * 42, 820 + (i % 3) * 6, 70 + (i % 4) * 22, '#1a2236');
  b += glow(defs, 900, 520, 200, '#fff2b8', { k: .95 }) + `<circle cx="900" cy="520" r="16" fill="#ffffff"/>` + glow(defs, 900, 830, 120, '#fff2b8', { k: .35 });
  b += `<g fill="#3a2a2a"><rect x="300" y="800" width="80" height="44"/><path d="M290 800 L340 770 L390 800Z"/></g>` + airFinish(defs);
  return { svg: svgDoc(defs, b), hotspots: [hs(900, 520, 'A bright light hovering or drifting above the valley floor, as residents described'), hs(900, 830, 'Hessdalen valley: since 1998 an automatic station has recorded the lights')] };
}

/* ═══ SENSOR AGE: emerald schematic (clearly a drawing, never a sensor frame) ═══ */
function hud(defs) { const g = id('gr'); defs.push(`<pattern id="${g}" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0 H0 V40" fill="none" stroke="#3dffb0" stroke-width=".6" opacity=".18"/></pattern>`); return `<rect width="${W}" height="${H}" fill="#04110c"/><rect width="${W}" height="${H}" fill="url(#${g})"/>`; }
const EM = '#3dffb0';
function hudFinish(defs, tag) { return `<g font-family="Oxanium, Arial, sans-serif" font-size="20" fill="${EM}" letter-spacing="3" opacity=".8"><text x="40" y="60">${tag}</text><text x="${W - 40}" y="60" text-anchor="end">SCHEMATIC · NOT SENSOR DATA</text></g>` + vignette(defs, .55, '#000') + label({ band: 'rgba(0,20,12,.86)' }); }
export function ohare() {
  const defs = []; let b = hud(defs);
  b += `<g fill="none" stroke="${EM}" stroke-width="2.5"><path d="M0 330 Q400 300 800 320 T1600 310"/><path d="M0 360 Q500 340 900 352 T1600 345" opacity=".5"/></g>`;
  b += `<ellipse cx="840" cy="250" rx="90" ry="40" fill="none" stroke="#bfffe0" stroke-width="3" stroke-dasharray="8 6"/><text x="840" y="200" font-family="Oxanium" font-size="18" fill="${EM}" text-anchor="middle" letter-spacing="2">CLEAR HOLE IN CLOUD DECK</text>`;
  b += `<path d="M770 470 Q840 430 910 470 Q840 500 770 470Z" fill="#0b2a1d" stroke="#bfffe0" stroke-width="3"/><path d="M840 430 L840 300" stroke="${EM}" stroke-width="2" stroke-dasharray="4 10"/>`;
  b += `<g fill="none" stroke="${EM}" stroke-width="3"><rect x="200" y="620" width="1200" height="140"/>${Array.from({ length: 10 }, (_, i) => `<rect x="${230 + i * 116}" y="650" width="80" height="40"/>`).join('')}<path d="M200 760 H1400 M760 620 V560 H900 V620"/></g><text x="830" y="600" font-family="Oxanium" font-size="22" fill="${EM}" text-anchor="middle" letter-spacing="3">GATE C17 · CONCOURSE C</text>`;
  b += sil.airliner(820, 860, .9, 'none').replace('fill="none"', `fill="#06150f" stroke="${EM}" stroke-width="3"`) + hudFinish(defs, "O'HARE · 7 NOV 2006 · ~16:15 CST");
  return { svg: svgDoc(defs, b), hotspots: [hs(840, 465, 'A dark grey, disc-shaped object hovering silently below the overcast'), hs(840, 250, 'Witnesses said it shot upward, leaving a clear hole in the clouds'), hs(830, 690, 'Gate C17, where United Flight 446 was pushing back')] };
}
export function hearing() {
  const defs = []; let b = hud(defs);
  b += `<g fill="none" stroke="${EM}" stroke-width="3"><path d="M100 300 Q800 200 1500 300 L1500 380 Q800 280 100 380Z"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${170 + i * 108}" y="${292 - Math.sin((i + .5) / 12 * Math.PI) * 70}" width="44" height="36"/>`).join('')}<rect x="420" y="640" width="760" height="70"/><path d="M420 710 L400 820 M1180 710 L1200 820"/>${[560, 800, 1040].map(x => `<path d="M${x} 640 V590 q0 -14 16 -18"/><rect x="${x - 40}" y="620" width="80" height="20"/>`).join('')}<path d="M100 900 H1500"/></g>`;
  b += `<g font-family="Oxanium" font-size="20" fill="${EM}" letter-spacing="3" text-anchor="middle"><text x="800" y="180">HOUSE OVERSIGHT SUBCOMMITTEE · DAIS</text><text x="800" y="760">WITNESS TABLE · 3 WITNESSES · SWORN</text></g>` + hudFinish(defs, '2154 RAYBURN · 26 JUL 2023');
  return { svg: svgDoc(defs, b), hotspots: [hs(800, 640, 'The witness table: two former Navy pilots and a former intelligence officer, under oath'), hs(800, 270, 'The subcommittee that heard the testimony')] };
}

export const SCENES = { rendlesham, hessdalen, tulli, livy, obsequens, sigiburg, shenkuo, azuma, joseon, winthrop, foo, dc1952, levelland, hill, deception, westall, malmstrom, shag, tehran, colares, valentich, belgium, ariel, varginha, phoenix, ohare, hearing };
