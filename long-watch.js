/* PROJECT SIGNAL — THE LONG WATCH (Project Signal Chronology)
   A journey from the first carved sky-watchers to this month's declassified files.
   · Native scroll is the time machine: one passive listener stores scrollTop; one rAF loop reads cached geometry.
   · Era backdrops: only the current era ±1 is mounted. Card images attach inside a ±2.5-screen window and are
     released beyond it, so memory stays flat across the whole journey and back.
   · Everything animated is transform/opacity, plus two small canvases (ambient particles, corner globe) at capped DPR.
   · Reduced motion: no descent, no particles, no parallax; content and integrity are identical.
   · Sound only when site audio is already live. Never autoplays from silence. */
(() => {
  'use strict';
  if (window.LongWatch) return;
  const D = window.LW_DATA; if (!D) return;
  const ERAS = D.eras, EV = D.events, MOT = D.motifs, BAD = D.badges;
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => RM.matches;
  const SA = () => window.SignalAudio;
  const audible = () => { const s = SA(); return !!(s && s.live && s.live()); };
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch {} } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fmtYear = y => { y = Math.round(y); if (y < 0) return { n: -y, s: 'BCE' }; if (y === 0) y = 1; return { n: y, s: y < 1000 ? 'CE' : '' }; }; // data uses historical years: -218 = 218 BCE
  const yearLabel = y => { const f = fmtYear(y); return f.n + (f.s ? ' ' + f.s : ''); };
  const eraIx = Object.fromEntries(ERAS.map((e, i) => [e.id, i]));
  const ERA_ACC = { deep: '#e88a3c', ancient: '#e3b65a', medieval: '#d8a64a', woodblock: '#ff6a4d', press: '#efd9a8', bluebook: '#e0c98a', broadcast: '#8fb8ff', sensor: '#3dffb0' };
  const GLYPH = { deep: '✶', ancient: '☉', medieval: '✠', woodblock: '◉', press: '¶', bluebook: '§', broadcast: '▶', sensor: '◎' };

  /* resolve Atlas images (single source of truth for US dossiers) */
  function imageOf(e) {
    if (e.image) return e.image;
    if (e.img === 'atlas' && e.atlas && window.__atlas) {
      const a = (window.__atlas.archive || []).find(r => r.id === e.atlas);
      if (a && a.image) return (e.image = { src: a.image.thumb || a.image.full, full: a.image.full, page: a.image.page, credit: a.image.credit, kind: a.image.kind, caption: a.image.caption });
    }
    return null;
  }

  /* ================================================================ DOM */
  let shell, scroller, track, bgs, amb, fx, hud, odo, odoEra, globeEl, globeCv, globeLbl, rail, motifsEl, threadBar, sheet, scrim, threadsSvg, finale;
  const items = []; // { e, el, card, img, top, h, cy, side }
  const eraSecs = []; // { el, top, ghost }
  let built = false;
  function svgIcon(d) { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
  function build() {
    if (built) return; built = true;
    shell = document.createElement('div'); shell.id = 'lw-shell'; shell.hidden = true;
    shell.setAttribute('role', 'dialog'); shell.setAttribute('aria-modal', 'true'); shell.setAttribute('aria-label', 'The Long Watch: a chronology of reported sky phenomena');
    const eraHTML = ERAS.map(era => {
      const list = EV.filter(e => e.era === era.id);
      return `<section class="lw-era" data-era="${era.id}" aria-labelledby="lw-era-${era.id}">
        <header class="lw-era-card"><div class="ghost" aria-hidden="true">${esc(era.name.split(' ').pop())}</div>
          <div class="span">${esc(yearLabel(era.from))} — ${era.to >= 2026 ? 'TODAY' : esc(yearLabel(era.to))}</div>
          <h2 id="lw-era-${era.id}">${esc(era.title)}</h2><div class="name">${esc(era.name)}</div><p>${esc(era.line)}</p></header>
        <div class="lw-list">${list.map(e => cardHTML(e)).join('')}</div></section>`;
    }).join('');
    shell.innerHTML = `
      <div class="lw-bgs" aria-hidden="true"></div>
      <canvas class="lw-amb" aria-hidden="true"></canvas>
      <div class="lw-scroll" tabindex="-1"><div class="lw-track">
        <svg class="lw-threads" aria-hidden="true"></svg>
        <section class="lw-prologue"><div>
          <div class="k">Project Signal Chronology</div>
          <h1>THE LONG WATCH<span>Ten thousand years of looking up</span></h1>
          <p>What people said they saw in the sky, from carved rock to declassified files. Scroll to travel forward through time. Tap any entry to open its record.</p>
          <p class="lw-integrity">Reports are presented as reported. Every entry carries its sources, a status badge, and what skeptics say. Whether anyone was watching back is a question, not a claim.</p>
          <div class="hint"><i></i>Scroll to travel</div></div></section>
        ${eraHTML}
        <section class="lw-finale" aria-labelledby="lw-fin-h">
          <div class="k" id="lw-fin-h">The constellation</div>
          <div class="lw-const"><canvas aria-hidden="true"></canvas></div>
          <div class="lw-tl" aria-hidden="true"></div>
          <p class="lw-stat"></p>
          <p class="lw-close-lines"><span>Every generation has looked up.</span><span>They saw shields, ships, pearls, airships, saucers and lights in formation, and they wrote it down.</span><span>Whether anyone was looking back is still an open question. The watch goes on.</span></p>
          <button class="lw-return" type="button">${svgIcon('M15 6l-6 6 6 6')}Return to the Observation Deck</button>
          <p class="lw-sources-note">Every entry links to its sources. Images: Wikimedia Commons, public domain or free licence, credited in each record.</p>
        </section>
      </div></div>
      <div class="lw-fx" aria-hidden="true"><i class="vig"></i><i class="grain"></i><i class="scan"></i><i class="track"></i><i class="hud"></i><i class="osd">PLAY ▶ <span></span></i></div>
      <header class="lw-hud">
        <button class="lw-iconbtn lw-x" type="button" aria-label="Leave the Long Watch">${svgIcon('M6 6l12 12M18 6L6 18')}</button>
        <div class="lw-odo" role="button" tabindex="0" aria-label="Jump to an era"><div class="lw-odo-row" aria-hidden="true"><span class="lw-digits"></span><span class="lw-sfx"></span></div><div class="lw-odo-era" aria-live="polite"></div></div>
        <button class="lw-iconbtn lw-thr" type="button" aria-pressed="false" aria-label="Pattern threads" aria-expanded="false">${svgIcon('M4 18c4-10 8 4 12-6s4-6 4-6M4 18h0M20 6h0')}</button>
      </header>
      <div class="lw-motifs" hidden role="dialog" aria-label="Pattern threads"><h3>Pattern threads</h3><p>Follow one motif through every era. Matching records light up and a thread joins them.</p><div class="chips"></div></div>
      <div class="lw-threadbar" role="status"><span></span><button type="button">Clear</button></div>
      <nav class="lw-rail" aria-label="Eras">${ERAS.map((e, i) => `<button type="button" data-i="${i}" style="color:${ERA_ACC[e.id]}"><span>${esc(e.name)}</span><i></i></button>`).join('')}</nav>
      <div class="lw-globe" aria-hidden="true"><canvas width="208" height="208"></canvas><span></span></div>
      <div class="lw-scrim"></div>
      <aside class="lw-sheet" role="dialog" aria-modal="true" aria-labelledby="lw-sheet-title"><div class="lw-sheet-head"><i class="grab"></i><span class="crumb"></span><button class="lw-iconbtn lw-sheet-x" type="button" aria-label="Close record">${svgIcon('M6 6l12 12M18 6L6 18')}</button></div><div class="lw-sheet-body"></div></aside>`;
    document.body.appendChild(shell);
    scroller = shell.querySelector('.lw-scroll'); track = shell.querySelector('.lw-track'); bgs = shell.querySelector('.lw-bgs'); amb = shell.querySelector('.lw-amb'); fx = shell.querySelector('.lw-fx');
    hud = shell.querySelector('.lw-hud'); odo = shell.querySelector('.lw-digits'); odoEra = shell.querySelector('.lw-odo-era');
    globeEl = shell.querySelector('.lw-globe'); globeCv = globeEl.querySelector('canvas'); globeLbl = globeEl.querySelector('span');
    rail = shell.querySelector('.lw-rail'); motifsEl = shell.querySelector('.lw-motifs'); threadBar = shell.querySelector('.lw-threadbar');
    sheet = shell.querySelector('.lw-sheet'); scrim = shell.querySelector('.lw-scrim'); threadsSvg = shell.querySelector('.lw-threads'); finale = shell.querySelector('.lw-finale');
    shell.querySelectorAll('.lw-era').forEach(el => eraSecs.push({ el, top: 0, ghost: el.querySelector('.ghost') }));
    shell.querySelectorAll('.lw-item').forEach(el => { const i = +el.dataset.i; items.push({ e: EV[i], el, card: el.querySelector('.lw-card'), img: el.querySelector('img'), top: 0, h: 0, cy: 0 }); });
    // motif chips with counts
    shell.querySelector('.lw-motifs .chips').innerHTML = Object.entries(MOT).map(([k, v]) => `<button class="lw-chip" type="button" data-m="${k}" aria-pressed="false">${esc(v)}<b>${EV.filter(e => e.motifs.includes(k)).length}</b></button>`).join('');
    buildOdo(); buildTimeline(); wire();
  }
  function cardHTML(e) {
    const i = EV.indexOf(e), img = imageOf(e), b = BAD[e.badge];
    return `<div class="lw-item" data-i="${i}"><button class="lw-card" type="button" data-i="${i}" aria-label="${esc(e.title)}, ${esc(e.date)}. ${esc(b.label)}. Open record">
      <span class="lw-card-media">${img ? `<img alt="" decoding="async" referrerpolicy="no-referrer" data-src="${esc(img.src)}">` : ''}<span class="plate" aria-hidden="true"${img ? ' hidden' : ''}>${GLYPH[e.era]}</span>${img ? `<span class="kind">${esc(img.kind)}</span>` : ''}</span>
      <span class="lw-card-body"><span class="lw-card-date">${esc(e.date)}</span><span class="lw-card-title">${esc(e.title)}</span><span class="lw-card-hook">${esc(e.hook)}</span>
      <span class="lw-card-meta"><b class="lw-badge lw-badge--${e.badge}">${esc(b.label)}</b><span>${esc(e.place)}${e.region && !e.place.includes(e.region) ? ' · ' + esc(e.region) : ''}</span><span class="lw-card-more" aria-hidden="true">Open ↗</span></span></span></button></div>`;
  }

  /* ================================================================ ODOMETER */
  let digitEls = [], sfxEl, lastYearShown = null, digitCount = 0;
  function buildOdo() {
    // 0–9 plus a trailing 0, so a strip can roll from 9 back to 0 without jumping
    odo.innerHTML = Array.from({ length: 4 }, () => `<span class="lw-digit"><span>${'01234567890'.split('').map(d => `<b>${d}</b>`).join('')}</span></span>`).join('');
    digitEls = [...odo.querySelectorAll('.lw-digit')].map(el => ({ el, strip: el.firstChild, pos: -1 })); sfxEl = shell.querySelector('.lw-sfx');
  }
  /* A true odometer: scroll drives a fractional year; each wheel's position is continuous (the lower wheel's last
     unit carries the next one over), written straight to transform. No CSS transitions are restarted per frame. */
  function setOdo(y) {
    let n = y < 0 ? -y : Math.max(1, y); n = Math.min(9999, n);
    const f = fmtYear(y), key = f.n + f.s; lastYearShown = key;
    const cnt = String(Math.round(n)).length;
    if (cnt !== digitCount) { digitCount = cnt; digitEls.forEach((d, i) => d.el.classList.toggle('off', i < 4 - cnt)); }
    for (let i = 0; i < 4; i++) {
      const k = 3 - i, p10 = 10 ** k, d = digitEls[i];
      let v = Math.floor(n / p10) % 10;
      const rem = n % p10, carry = rem - (p10 - 1); if (k > 0 && carry > 0) v += carry; else if (k === 0) v = n % 10;
      const pos = Math.round(v * 100) / 100; if (pos === d.pos) continue; d.pos = pos;
      d.strip.style.transform = `translate3d(0,${(-pos * 100 / 11).toFixed(3)}%,0)`;
    }
    if (sfxEl.textContent !== f.s) sfxEl.textContent = f.s;
  }

  /* ================================================================ GEOMETRY (measured on open/resize only) */
  let vh = 800, vw = 400, contentH = 0, finaleTop = 0;
  function measure() {
    vh = scroller.clientHeight; vw = scroller.clientWidth;
    // offset chains ignore the reveal transforms, so geometry is exact before cards animate in
    const off = el => { let y = 0, x = 0; while (el && el !== track) { y += el.offsetTop; x += el.offsetLeft; el = el.offsetParent; } return [x, y]; };
    for (const s of eraSecs) s.top = off(s.el)[1];
    for (const it of items) { const [x, y] = off(it.card); it.top = y; it.h = it.card.offsetHeight; it.cy = y + it.h * 0.5; it.left = x; it.right = x + it.card.offsetWidth; }
    finaleTop = off(finale)[1]; contentH = track.scrollHeight;
    sizeAmb(); if (thread.motif) drawThreads(thread.motif, false);
  }

  /* ================================================================ ERA BACKDROPS (mount window: current ±1) */
  const bgLayers = new Map();
  function bgLayer(i) {
    let el = bgLayers.get(i); if (el) return el;
    el = document.createElement('div'); el.className = 'lw-bg lw-bg--' + ERAS[i].id; el.style.zIndex = String(i); el.innerHTML = '<i class="f1"></i><i class="f2"></i>';
    bgs.appendChild(el); bgLayers.set(i, el); return el;
  }
  const setOp = (el, v) => { const s = v <= 0 ? '0' : v >= 1 ? '1' : v.toFixed(2); if (el._op === s) return; el._op = s; el.style.opacity = s; el.classList.toggle('off', s === '0'); };
  function setBackdrops(cur, blend) {
    for (const [i, el] of bgLayers) if (i < cur - 1 || i > cur + 1) { el.remove(); bgLayers.delete(i); }
    setOp(bgLayer(cur), 1);
    if (cur > 0) setOp(bgLayer(cur - 1), 0);
    if (cur < ERAS.length - 1) setOp(bgLayer(cur + 1), blend);
  }

  /* ================================================================ AMBIENT PARTICLES (one canvas, era-specific motion) */
  let actx = null, aw = 0, ah = 0, adpr = 1, pools = new Map(), budget = 1;
  function sizeAmb() {
    if (reduced()) { amb.width = amb.height = 1; actx = null; return; }
    adpr = 1; aw = vw; ah = vh; // particles are a few px: 1x backing store keeps the per-frame upload small
    amb.width = Math.round(aw * adpr); amb.height = Math.round(ah * adpr); actx = amb.getContext('2d', { alpha: true }); actx.setTransform(adpr, 0, 0, adpr, 0, 0);
  }
  const R = Math.random;
  const STYLE = {
    deep: { n: 46, add: true, spawn: p => { p.x = R() * aw; p.y = ah + R() * ah * 0.6; p.vx = (R() - .5) * 12; p.vy = -(18 + R() * 40); p.r = .8 + R() * 1.8; p.c = R() < .7 ? '255,150,60' : '255,210,120'; p.life = 3 + R() * 4; }, step: (p, dt, t) => { p.x += (p.vx + Math.sin(t * 1.7 + p.r * 9) * 10) * dt; p.y += p.vy * dt; p.a = clamp(p.age / .6, 0, 1) * clamp((p.life - p.age) / 1.2, 0, 1) * (.55 + .45 * Math.sin(t * 9 + p.r * 30)); } },
    ancient: { n: 40, add: true, spawn: p => { p.x = R() * aw; p.y = R() * ah; p.vx = 4 + R() * 6; p.vy = 6 + R() * 8; p.r = .6 + R() * 1.4; p.c = '255,214,130'; p.life = 6 + R() * 6; }, step: (p, dt, t) => { p.x += p.vx * dt; p.y += p.vy * dt; p.a = .7 * Math.sin(Math.PI * p.age / p.life) * (.5 + .5 * Math.sin(t * 4 + p.r * 17)); } },
    medieval: { n: 34, add: false, spawn: p => { p.x = R() * aw; p.y = R() * ah; p.vx = (R() - .5) * 6; p.vy = 3 + R() * 6; p.r = .7 + R() * 1.6; p.c = '240,220,180'; p.life = 7 + R() * 6; }, step: (p, dt) => { p.x += p.vx * dt; p.y += p.vy * dt; p.a = .35 * Math.sin(Math.PI * p.age / p.life); } },
    woodblock: { n: 44, add: false, spawn: p => { p.x = -10 + R() * aw * .4; p.y = ah * (.45 + R() * .55); p.vx = 30 + R() * 50; p.vy = -(4 + R() * 10); p.r = .8 + R() * 1.7; p.c = '241,233,216'; p.life = 4 + R() * 5; }, step: (p, dt, t) => { p.x += p.vx * dt; p.y += (p.vy + Math.sin(t * 2 + p.r * 5) * 8) * dt; p.a = .6 * Math.sin(Math.PI * p.age / p.life); } },
    press: { n: 30, add: false, spawn: p => { p.x = R() * aw; p.y = R() * ah; p.vx = (R() - .5) * 5; p.vy = 4 + R() * 5; p.r = .6 + R() * 1.2; p.c = '235,220,190'; p.life = 6 + R() * 6; }, step: (p, dt) => { p.x += p.vx * dt; p.y += p.vy * dt; p.a = .4 * Math.sin(Math.PI * p.age / p.life); } },
    bluebook: { n: 38, add: true, spawn: p => { p.x = aw * (.3 + R() * .4); p.y = R() * ah; p.vx = (R() - .5) * 8; p.vy = (R() - .5) * 8; p.r = .5 + R() * 1.3; p.c = '240,228,190'; p.life = 3 + R() * 5; }, step: (p, dt, t) => { p.x += (p.vx + Math.sin(t + p.r * 40) * 6) * dt; p.y += (p.vy + Math.cos(t * .8 + p.r * 30) * 6) * dt; p.a = .55 * Math.sin(Math.PI * p.age / p.life); } },
    broadcast: { n: 50, add: true, spawn: p => { p.x = R() * aw; p.y = R() * ah; p.vx = 0; p.vy = 0; p.r = .6 + R(); p.c = '220,230,255'; p.life = .05 + R() * .12; }, step: p => { p.a = .5; } },
    sensor: { n: 70, add: true, star: true, spawn: p => { p.x = R() * aw; p.y = R() * ah * 3; p.r = .4 + R() * 1.3; p.d = .05 + R() * .25; p.c = R() < .2 ? '61,255,176' : '230,255,245'; p.life = 1e9; p.tw = R() * 6; }, step: (p, dt, t) => { p.a = .35 + .45 * (0.5 + 0.5 * Math.sin(t * (1 + p.d * 6) + p.tw)); } }
  };
  function pool(i) {
    let p = pools.get(i); if (p) return p;
    const st = STYLE[ERAS[i].id]; p = []; for (let k = 0; k < st.n; k++) { const q = { age: 0 }; st.spawn(q); q.age = R() * Math.min(q.life, 6); p.push(q); }
    pools.set(i, p); return p;
  }
  function drawAmb(cur, blend, dt, t, sTop) {
    if (!actx) return;
    for (const k of pools.keys()) if (k < cur || k > cur + 1) pools.delete(k);
    actx.clearRect(0, 0, aw, ah);
    const pass = (i, w) => {
      if (w < .02) return; const st = STYLE[ERAS[i].id], P = pool(i), n = Math.ceil(P.length * budget);
      actx.globalCompositeOperation = st.add ? 'lighter' : 'source-over';
      for (let k = 0; k < n; k++) {
        const p = P[k]; p.age += dt; if (p.age > p.life) { p.age = 0; st.spawn(p); }
        st.step(p, dt, t);
        let x = p.x, y = p.y; if (st.star) { y = ((p.y - sTop * p.d) % (ah * 3) + ah * 3) % (ah * 3); if (y > ah) continue; }
        else if (x < -20 || x > aw + 20 || y < -20 || y > ah + 20) { p.age = p.life + 1; continue; }
        const a = clamp(p.a * w, 0, 1); if (a < .02) continue;
        actx.fillStyle = `rgba(${p.c},${a.toFixed(3)})`;
        if (p.r < 1.1) actx.fillRect(x, y, p.r * 1.6, p.r * 1.6); else { actx.beginPath(); actx.arc(x, y, p.r, 0, 6.283); actx.fill(); }
      }
    };
    pass(cur, 1 - blend); if (cur + 1 < ERAS.length) pass(cur + 1, blend);
    actx.globalCompositeOperation = 'source-over';
  }

  /* ================================================================ GLOBE (shared projection with the Atlas: PSGeo) */
  let landCoarse = null, landFine = null, landMed = null;
  function decimate(step) {
    const G = window.PSGeo; if (!G) return [];
    return G.land().map(r => { const out = []; let lx = 1e9, ly = 1e9; for (let i = 0; i < r.length; i += 2) { const x = r[i], y = r[i + 1]; if (Math.abs(x - lx) + Math.abs(y - ly) >= step || i >= r.length - 2) { out.push(x, y); lx = x; ly = y; } } return out.length >= 6 ? out : null; }).filter(Boolean);
  }
  function drawGlobe(ctx, S, lon0, lat0, land, opt) {
    const G = window.PSGeo, R0 = S / 2 - 3, cx = S / 2, cy = S / 2;
    ctx.clearRect(0, 0, S, S);
    const g = ctx.createRadialGradient(cx - R0 * .35, cy - R0 * .4, R0 * .1, cx, cy, R0);
    g.addColorStop(0, opt.sea0); g.addColorStop(1, opt.sea1);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, 6.283); ctx.fill();
    if (!G) return;
    const P = G.orthographic(lon0, lat0, R0, cx, cy);
    ctx.strokeStyle = opt.land; ctx.lineWidth = opt.lw; ctx.beginPath();
    for (const r of land) { let pen = false; for (let i = 0; i < r.length; i += 2) { const p = P(r[i], r[i + 1]); if (p[2] > 0) { if (pen) ctx.lineTo(p[0], p[1]); else { ctx.moveTo(p[0], p[1]); pen = true; } } else pen = false; } }
    ctx.stroke();
    ctx.strokeStyle = opt.rim; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, 6.283); ctx.stroke();
    return P;
  }
  const gState = { lon: 10, lat: 30, tlon: 10, tlat: 30, dirty: true, ctx: null, visited: new Set(), cur: -1 };
  function globeTarget(i) {
    if (i === gState.cur || i < 0) return; gState.cur = i; const e = EV[i];
    gState.tlon = e.lon; gState.tlat = clamp(e.lat, -60, 70); gState.dirty = true; gState.visited.add(i);
    globeLbl.textContent = e.region === 'Antarctica' ? 'Antarctica' : (e.region || e.continent);
  }
  let gAcc = 0;
  function stepGlobe(dt) {
    if (!gState.ctx) { gState.ctx = globeCv.getContext('2d'); landCoarse = landCoarse || decimate(3.2); landFine = landFine || decimate(1.4); }
    let dl = ((gState.tlon - gState.lon + 540) % 360) - 180, da = gState.tlat - gState.lat;
    const settled = Math.abs(dl) < .05 && Math.abs(da) < .05;
    if (settled && !gState.dirty) return;
    // while turning: half-rate redraws (third-rate when frames run long) on a coarse coastline; one fine pass when it settles
    gAcc += dt; if (!settled && !reduced() && (frames % (slow > 12 ? 3 : 2))) return;
    const k = reduced() ? 1 : 1 - Math.exp(-gAcc * 3.2); gAcc = 0;
    gState.lon += dl * k; gState.lat += da * k;
    const done = reduced() || (Math.abs(dl * (1 - k)) < .05 && Math.abs(da * (1 - k)) < .05); if (done) { gState.lon = gState.tlon; gState.lat = gState.tlat; gState.dirty = false; }
    const ctx = gState.ctx, S = globeCv.width, acc = ERA_ACC[ERAS[curEra].id];
    const P = drawGlobe(ctx, S, gState.lon, gState.lat, done ? landFine : landCoarse, { sea0: 'rgba(40,46,60,.95)', sea1: 'rgba(6,8,14,.96)', land: 'rgba(255,240,220,.55)', lw: 1.4, rim: 'rgba(255,255,255,.22)' });
    if (!P) return;
    for (const i of gState.visited) { const e = EV[i], p = P(e.lon, e.lat); if (p[2] <= 0) continue; ctx.fillStyle = i === gState.cur ? acc : 'rgba(255,230,200,.55)'; ctx.beginPath(); ctx.arc(p[0], p[1], i === gState.cur ? 6 : 2.6, 0, 6.283); ctx.fill(); }
    const e = EV[gState.cur]; if (e) { const p = P(e.lon, e.lat); if (p[2] > 0) { ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], 13, 0, 6.283); ctx.stroke(); } }
  }

  /* ================================================================ MAIN LOOP */
  let raf = 0, running = false, lastT = 0, sTop = 0, curEra = 0, curItem = -1, dirtyScroll = true, slow = 0, frames = 0;
  function onScroll() { dirtyScroll = true; } // no reads here: scrollTop is read once at the top of the next frame, before any writes
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, lastT ? (now - lastT) / 1000 : .016); lastT = now; const t = now / 1000;
    // adaptive particle budget: drop when frames run long (>24ms) for a while, recover slowly
    if (dt > .024) slow = Math.min(60, slow + 1); else slow = Math.max(0, slow - .25);
    budget = slow > 30 ? .45 : slow > 12 ? .7 : 1;
    if (dirtyScroll) sTop = scroller.scrollTop;
    const c = sTop + vh * 0.55;
    if (dirtyScroll) {
      dirtyScroll = false;
      // era + blend toward the next era as its section approaches mid-screen
      let e = 0; for (let i = 0; i < eraSecs.length; i++) if (eraSecs[i].top <= c) e = i;
      const nextTop = e + 1 < eraSecs.length ? eraSecs[e + 1].top : Infinity;
      const blend = sstep(nextTop - vh * .95, nextTop, c);
      if (e !== curEra) { curEra = e; eraChanged(); }
      setBackdrops(curEra, blend);
      const shown = blend > .5 && e + 1 < ERAS.length ? e + 1 : e; if (shell.dataset.era !== ERAS[shown].id) { shell.dataset.era = ERAS[shown].id; odoEra.textContent = ERAS[shown].name + ' · ' + ERAS[shown].title; railOn(shown); }
      backdropBlend = blend;
      // year: interpolate between card centres, with a plateau on each card
      let y;
      if (c <= items[0].cy) y = items[0].e.year;
      else if (c >= items[items.length - 1].cy) { y = c > finaleTop - vh * .3 ? 2026 : items[items.length - 1].e.year; if (curItem !== items.length - 1) { curItem = items.length - 1; globeTarget(curItem); } }
      else { let lo = 0, hi = items.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (items[m].cy <= c) lo = m; else hi = m; }
        const a = items[lo], b = items[hi], k = sstep(.2, .8, (c - a.cy) / (b.cy - a.cy)); y = lerp(a.e.year, b.e.year, k);
        const near = (c - a.cy) / (b.cy - a.cy) < .5 ? lo : hi; if (near !== curItem) { curItem = near; globeTarget(near); } }
      if (c <= items[0].cy && curItem !== 0) { curItem = 0; globeTarget(0); }
      setOdo(y);
      shell.classList.toggle('lw-at-start', c < items[0].top - vh * .2);
      const atEnd = sTop + vh > finaleTop + vh * .35; shell.classList.toggle('lw-at-end', atEnd);
      if (atEnd && !finaleLit) lightFinale();
      // ghost era titles drift with gentle parallax (only the visible ones)
      if (!reduced()) for (const s of eraSecs) { const d = s.top - sTop; if (d > -vh * 1.5 && d < vh * 1.5) { const v = Math.round(d * -0.18); if (v !== s.gy) { s.gy = v; s.ghost.style.transform = `translate3d(-50%,${v}px,0)`; } } }
    }
    // particles: full rate normally; half/third rate only if frames run long (the motion stays dt-correct)
    ambAcc += dt; if ((!sheetOpen || vw >= 900) && frames % (slow > 30 ? 3 : slow > 12 ? 2 : 1) === 0) { drawAmb(curEra, backdropBlend, ambAcc, t, sTop); ambAcc = 0; }
    stepGlobe(dt);
    if (finaleLit && finaleVisible) drawFinale(t);
    if (frames++ % 30 === 0) { const osd = fx.querySelector('.osd span'); if (shell.dataset.era === 'broadcast') { const d = new Date(); osd.textContent = 'SP ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0'); } }
  }
  let backdropBlend = 0, ambAcc = 0;
  function startLoop() { if (running) return; running = true; lastT = 0; raf = requestAnimationFrame(frame); }
  function stopLoop() { running = false; cancelAnimationFrame(raf); }
  function railOn(i) { rail.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === i)); }

  /* ================================================================ ERA SOUND (only if site audio is live) */
  let lastEraSound = -1, sfxGroup = null;
  function eraChanged() {
    if (!audible() || curEra === lastEraSound || !opened) return; lastEraSound = curEra;
    const S = SA(); try { if (sfxGroup) sfxGroup.kill(.3); sfxGroup = S.group(); const g = sfxGroup;
      ({
        deep() { S.noise({ f: 900, to: 300, ft: 'lowpass', dur: 1.4, gain: .05, a: .2, rev: .3 }, g); S.clicks && S.clicks(10, 1.2, { gain: .02 }, g); S.tone({ f: 82, dur: 1.8, gain: .05, type: 'triangle', a: .3, rev: .4 }, g); },
        ancient() { S.tone({ f: 659, dur: 2.6, gain: .035, type: 'sine', a: .004, rev: .8 }, g); S.tone({ f: 988, dur: 2, gain: .02, a: .004, rev: .8, at: .02 }, g); },
        medieval() { S.noise({ f: 2600, q: 1.2, dur: .5, gain: .03, a: .05, rev: .3 }, g); S.tone({ f: 220, dur: 2.2, gain: .03, type: 'sawtooth', lp: 700, a: .4, rev: .6 }, g); S.tone({ f: 330, dur: 2.2, gain: .02, type: 'sawtooth', lp: 700, a: .5, rev: .6 }, g); },
        woodblock() { S.tone({ f: 523, dur: .7, gain: .045, type: 'triangle', a: .002, rev: .5, dly: .2 }, g); S.tone({ f: 784, dur: .7, gain: .035, type: 'triangle', a: .002, rev: .5, at: .14 }, g); S.tone({ f: 659, dur: .9, gain: .03, type: 'triangle', a: .002, rev: .6, at: .3 }, g); },
        press() { [0, .09, .2, .27].forEach(at => S.noise({ at, f: 3000, q: 2, dur: .03, gain: .05, a: .001 }, g)); S.tone({ at: .4, f: 1760, dur: .25, gain: .02, a: .002, rev: .3 }, g); },
        bluebook() { S.tone({ f: 60, dur: 1.8, gain: .03, type: 'sawtooth', lp: 260, a: .3, rev: .2 }, g); S.clicks && S.clicks(14, 1.4, { gain: .015 }, g); },
        broadcast() { S.noise({ f: 6000, to: 9000, ft: 'highpass', dur: .9, gain: .025, a: .05 }, g); S.tone({ at: .5, f: 880, dur: .12, gain: .03, type: 'square', lp: 2400, a: .002 }, g); },
        sensor() { S.tone({ f: 1320, to: 1280, dur: 1.6, gain: .035, a: .003, rev: .8, dly: .35 }, g); }
      })[ERAS[curEra].id]();
    } catch {}
  }

  /* ================================================================ CARD REVEAL + IMAGE WINDOW */
  let revealIO = null, imgIO = null;
  function observe() {
    revealIO = new IntersectionObserver(es => { for (const en of es) if (en.isIntersecting) { const el = en.target; el.classList.add('in'); revealIO.unobserve(el); setTimeout(() => el.classList.add('done'), 1000); } }, { root: scroller, rootMargin: '0px 0px -8% 0px', threshold: .08 });
    imgIO = new IntersectionObserver(es => { for (const en of es) { const img = en.target.querySelector('img'); if (!img) continue;
      if (en.isIntersecting) { if (!img.getAttribute('src')) { img.onload = () => img.classList.add('ok'); img.onerror = () => { img.removeAttribute('src'); img.remove(); en.target.querySelector('.plate').hidden = false; }; img.src = img.dataset.src; } }
      else if (img.getAttribute('src')) { img.classList.remove('ok'); img.removeAttribute('src'); } } }, { root: scroller, rootMargin: '250% 0px 250% 0px' });
    for (const it of items) { if (reduced()) it.el.classList.add('in'); else revealIO.observe(it.el); imgIO.observe(it.card); }
  }
  function unobserve() { revealIO && revealIO.disconnect(); imgIO && imgIO.disconnect(); for (const it of items) if (it.img && it.img.getAttribute('src')) { it.img.classList.remove('ok'); it.img.removeAttribute('src'); } }

  /* ================================================================ ENTRY SHEET */
  let sheetOpen = false, sheetIx = -1, lastFocus = null;
  function openSheet(i, from) {
    const e = EV[i], b = BAD[e.badge], img = imageOf(e), era = ERAS[eraIx[e.era]];
    sheetIx = i; if (!sheetOpen) lastFocus = from || document.activeElement;
    sheet.querySelector('.crumb').textContent = era.name + ' · ' + yearLabel(e.year);
    const prev = EV[i - 1], next = EV[i + 1];
    sheet.querySelector('.lw-sheet-body').innerHTML = `
      <h3 id="lw-sheet-title">${esc(e.title)}</h3>
      <div class="when"><span>◷ ${esc(e.date)}</span><span>⌖ ${esc(e.place)}${e.region && !e.place.includes(e.region) ? ', ' + esc(e.region) : ''}</span><span>${esc(e.continent)}</span></div>
      <div class="badgebox"><b class="lw-badge lw-badge--${e.badge}">${esc(b.label)}</b><span>${esc(b.note)}</span></div>
      ${img ? `<figure><a href="${esc(img.page)}" target="_blank" rel="noopener noreferrer" aria-label="Open image source on Wikimedia Commons"><img src="${esc(img.full || img.src)}" alt="${esc(img.caption)}" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('figure').remove()"></a><figcaption><span class="kind">${esc(img.kind)}</span>${esc(img.caption)}<small>${esc(img.credit)} · <a href="${esc(img.page)}" target="_blank" rel="noopener noreferrer" style="color:inherit">Wikimedia Commons ↗</a></small></figcaption></figure>` : ''}
      <h4>What was reported</h4><p>${esc(e.reported)}</p>
      ${e.text ? `<blockquote><q>${esc(e.text.quote)}</q><cite>${esc(e.text.translation)}</cite></blockquote>` : ''}
      ${e.reading ? `<div class="reading"><b>Modern reinterpretation · ${esc(e.reading.year)}</b>${esc(e.reading.by)}: ${esc(e.reading.summary)}</div>` : ''}
      <h4>What skeptics say</h4><p>${esc(e.skeptics)}</p>
      <h4>Why it endures</h4><p>${esc(e.endures)}</p>
      <h4>Sources</h4><ul class="src">${e.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a></li>`).join('')}</ul>
      ${e.atlas ? `<button class="lw-atlas" type="button" data-atlas="${esc(e.atlas)}">◈ View in Encounter Atlas</button>` : ''}
      <div class="lw-sheet-nav"><button type="button" data-go="${i - 1}" ${prev ? '' : 'disabled'}><small>← Earlier</small>${prev ? esc(prev.title) : ''}</button><button type="button" data-go="${i + 1}" ${next ? '' : 'disabled'}><small>Later →</small>${next ? esc(next.title) : ''}</button></div>`;
    sheet.querySelector('.lw-sheet-body').scrollTop = 0;
    if (!sheetOpen) { sheetOpen = true; sheet.classList.add('on'); scrim.classList.add('on'); scroller.setAttribute('aria-hidden', 'true'); setTimeout(() => sheet.querySelector('.lw-sheet-x').focus({ preventScroll: true }), 60);
      if (audible()) try { SA().tone({ f: 880, to: 1320, dur: .25, gain: .025, a: .004, rev: .4 }); } catch {} }
  }
  function closeSheet() {
    if (!sheetOpen) return; sheetOpen = false; sheet.classList.remove('on'); scrim.classList.remove('on'); scroller.removeAttribute('aria-hidden');
    const it = items[sheetIx]; const target = it ? it.card : lastFocus; if (target && target.focus) target.focus({ preventScroll: true });
  }
  function gotoSheet(i) {
    if (i < 0 || i >= EV.length) return; openSheet(i);
    const it = items[i]; const y = clamp(it.top - vh * .3, 0, contentH);
    scroller.scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' });
  }

  /* ================================================================ PATTERN THREADS */
  const thread = { motif: null };
  function setMotif(m) {
    thread.motif = m === thread.motif ? null : m;
    shell.querySelectorAll('.lw-chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.m === thread.motif)));
    shell.querySelector('.lw-thr').setAttribute('aria-pressed', String(!!thread.motif));
    shell.classList.toggle('lw-threading', !!thread.motif);
    for (const it of items) it.el.classList.toggle('th', !!thread.motif && it.e.motifs.includes(thread.motif));
    if (thread.motif) { const n = items.filter(it => it.e.motifs.includes(thread.motif)); threadBar.querySelector('span').textContent = `${MOT[thread.motif]} · ${n.length} records across ${new Set(n.map(it => it.e.era)).size} eras`; threadBar.classList.add('on'); drawThreads(thread.motif, true); }
    else { threadBar.classList.remove('on'); threadsSvg.innerHTML = ''; }
  }
  function drawThreads(m, animate) {
    const pts = items.filter(it => it.e.motifs.includes(m)).map(it => { const wide = vw >= 860; const x = wide ? vw / 2 : (it.left + it.right) / 2; return [x, it.cy]; });
    threadsSvg.setAttribute('width', vw); threadsSvg.setAttribute('height', contentH); threadsSvg.setAttribute('viewBox', `0 0 ${vw} ${contentH}`); threadsSvg.style.height = contentH + 'px';
    if (pts.length < 2) { threadsSvg.innerHTML = ''; return; }
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const sw = (i % 2 ? 1 : -1) * Math.min(vw * .34, 40 + (y1 - y0) * .04); d += ` C${(x0 + sw).toFixed(1)} ${(y0 + (y1 - y0) * .35).toFixed(1)} ${(x1 + sw).toFixed(1)} ${(y1 - (y1 - y0) * .35).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`; }
    threadsSvg.innerHTML = `<path class="glow" d="${d}"/><path class="core draw" d="${d}"/>${pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="6"/>`).join('')}`;
    const core = threadsSvg.querySelector('.core'); const L = core.getTotalLength ? core.getTotalLength() : 1e5;
    core.style.strokeDasharray = L; core.style.strokeDashoffset = animate && !reduced() ? L : 0;
    if (animate && !reduced()) requestAnimationFrame(() => requestAnimationFrame(() => { core.style.strokeDashoffset = 0; }));
    if (audible() && animate) try { SA().tone({ f: 392, to: 784, dur: .8, gain: .03, a: .1, rev: .6, dly: .3 }); } catch {}
  }

  /* ================================================================ FINALE: the constellation */
  let finaleLit = false, finaleVisible = false, finaleT0 = 0, fctx = null, fS = 0;
  function buildTimeline() {
    const tl = shell.querySelector('.lw-tl'), n = ERAS.length;
    const xOf = y => { const ei = ERAS.findIndex(e => y < e.to || e === ERAS[n - 1]); const e = ERAS[ei]; return (ei + clamp((y - e.from) / (e.to - e.from), 0, 1)) / n * 100; };
    tl.innerHTML = EV.map((e, i) => `<i style="left:${xOf(e.year).toFixed(2)}%;--c:${ERA_ACC[e.era]};transition-delay:${(i * 70)}ms"></i>`).join('') +
      [[-8000, '8000 BCE'], [-1500, '1500 BCE'], [400, '400'], [1940, '1940'], [2026, '2026']].map(([y, l], k) => `<b style="left:${xOf(y).toFixed(2)}%${k === 1 || k === 2 ? ';display:var(--mid,block)' : ''}">${l}</b>`).join('');
    const span = 2026 - ERAS[0].from - 1; // 8000 BCE → 2026 CE: there is no year 0
    const conts = new Set(EV.map(e => e.continent)).size;
    shell.querySelector('.lw-stat').innerHTML = `You traveled <b>${span.toLocaleString('en-US')}</b> years. <b>${EV.length}</b> encounters.${new Set(EV.map(e => e.era)).size === ERAS.length ? ' Every era.' : ''}${conts >= 7 ? ' Every continent.' : ` ${conts} continents.`}`;
    if (matchMedia('(max-width:520px)').matches) tl.style.setProperty('--mid', 'none');
  }
  function lightFinale() {
    finaleLit = true; finaleT0 = performance.now() / 1000; finale.classList.add('lit'); shell.querySelector('.lw-tl').classList.add('lit');
    const cv = finale.querySelector('canvas'); const r = cv.getBoundingClientRect(); const d = Math.min(2, devicePixelRatio || 1);
    fS = Math.round(r.width * d); cv.width = cv.height = fS; fctx = cv.getContext('2d'); landMed = landMed || decimate(.7);
    new IntersectionObserver(es => { finaleVisible = es[0].isIntersecting; }, { root: scroller }).observe(cv); finaleVisible = true;
    if (reduced()) drawFinale(finaleT0 + 30);
    if (audible()) try { const S = SA(); [523, 659, 784, 1047].forEach((f, k) => S.tone({ at: k * .35, f, dur: 2.4, gain: .025, a: .02, rev: .9, dly: .3 })); } catch {}
  }
  function drawFinale(t) {
    if (!fctx) return; const el = t - finaleT0, lon0 = reduced() ? -20 : -20 + el * 9, lat0 = 18;
    const P = drawGlobe(fctx, fS, lon0, lat0, landMed, { sea0: 'rgba(30,34,52,.9)', sea1: 'rgba(4,5,10,.95)', land: 'rgba(200,255,230,.28)', lw: fS / 340, rim: 'rgba(160,255,220,.35)' });
    if (!P) return; const ctx = fctx, step = .07;
    // arcs between consecutive encounters, drawn progressively (great-circle interpolation)
    ctx.lineWidth = fS / 420;
    for (let i = 1; i < EV.length; i++) {
      const k = clamp((el - i * step) / .6, 0, 1); if (k <= 0) break;
      const a = EV[i - 1], b = EV[i]; ctx.strokeStyle = ERA_ACC[b.era] + '88'; ctx.beginPath(); let pen = false;
      const A = toV(a), B = toV(b), N = 24;
      for (let s = 0; s <= N * k; s++) { const v = slerp(A, B, s / N), ll = toLL(v), p = P(ll[0], ll[1]); if (p[2] > 0) { if (pen) ctx.lineTo(p[0], p[1]); else { ctx.moveTo(p[0], p[1]); pen = true; } } else pen = false; }
      ctx.stroke();
    }
    for (let i = 0; i < EV.length; i++) {
      const k = clamp((el - i * step) / .35, 0, 1); if (k <= 0) break; const e = EV[i], p = P(e.lon, e.lat); if (p[2] <= 0) continue;
      const r = fS / 150 * (1 + (1 - k) * 2.5), c = ERA_ACC[e.era];
      ctx.globalAlpha = .25 * k; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p[0], p[1], r * 3, 0, 6.283); ctx.fill();
      ctx.globalAlpha = k; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], r * .7, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  const D2R = Math.PI / 180;
  const toV = e => { const la = e.lat * D2R, lo = e.lon * D2R; return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]; };
  const toLL = v => [Math.atan2(v[1], v[0]) / D2R, Math.asin(clamp(v[2], -1, 1)) / D2R];
  function slerp(a, b, t) { const d = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1), w = Math.acos(d); if (w < 1e-4) return a; const s = Math.sin(w), p = Math.sin((1 - t) * w) / s, q = Math.sin(t * w) / s; return [a[0] * p + b[0] * q, a[1] * p + b[1] * q, a[2] * p + b[2] * q]; }

  /* ================================================================ ENTRANCE: temporal descent */
  const STOPS = [[2026, ''], [1947, 'Roswell'], [1561, 'Nuremberg'], [-218, 'Ships in the sky'], [-8000, 'The first watchers']];
  function descent(mode) {
    // mode: 'full' (~6s, first time this session) · 'short' (~1.3s) · 'reduced' (crossfade)
    return new Promise(done => {
      const ov = document.createElement('div'); ov.className = 'lw-entrance';
      ov.innerHTML = `<div class="veil"></div><canvas></canvas><div class="lens"></div><div class="lw-ring"><svg viewBox="-360 -360 720 720" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><path id="lw-rp" d="M0,-300a300,300 0 1,1 0,600a300,300 0 1,1 0,-600"/></defs><circle r="318" fill="none" stroke="rgba(255,210,170,.25)" stroke-dasharray="2 10"/><circle r="282" fill="none" stroke="rgba(190,140,255,.22)"/><text><textPath href="#lw-rp" xlink:href="#lw-rp">${'2026 · 1997 · 1976 · 1947 · 1897 · 1803 · 1639 · 1561 · 1235 · 776 · 100 BCE · 218 BCE · 593 BCE · 1600 BCE · 8000 BCE · '.repeat(1)}</textPath></text></svg></div><div class="lw-year"><b>2026</b><small></small></div><button class="lw-skip" type="button">Skip ›</button>`;
      document.body.appendChild(ov);
      const yb = ov.querySelector('.lw-year b'), ys = ov.querySelector('.lw-year small'), ring = ov.querySelector('.lw-ring'), veil = ov.querySelector('.veil'), cv = ov.querySelector('canvas');
      let finished = false, rafE = 0, g = null;
      const finish = () => { if (finished) return; finished = true; cancelAnimationFrame(rafE); document.removeEventListener('keydown', onKey, true); try { g && g.kill(.25); } catch {}
        ov.classList.add('out'); setTimeout(() => ov.remove(), 950); done(); };
      const onKey = ev => { if (ev.key === 'Escape') { ev.preventDefault(); finish(); } };
      document.addEventListener('keydown', onKey, true);
      ov.querySelector('.lw-skip').addEventListener('click', finish);
      if (mode === 'reduced') { veil.style.opacity = '1'; yb.textContent = '8000'; ys.textContent = 'BCE · The first watchers'; setTimeout(finish, 650); return; }
      const DUR = mode === 'full' ? 6.0 : 1.3;
      requestAnimationFrame(() => { veil.style.opacity = '.92'; ov.classList.add('go'); });
      document.body.classList.add('lw-departing');
      if (audible()) try { const S = SA(); g = S.group(); S.noise({ f: 200, to: 4200, ft: 'bandpass', q: .8, dur: DUR * .8, gain: .06, swell: true, rev: .6 }, g); S.tone({ f: 110, to: 41, dur: DUR, gain: .06, type: 'triangle', a: DUR * .3, rev: .5 }, g); } catch {}
      // star rewind: spiralling inward, bent around a lens at the centre
      const d = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight; cv.width = W * d; cv.height = H * d; const ctx = cv.getContext('2d'); ctx.scale(d, d);
      const N = Math.round(Math.min(700, W * H / 1400)), st = Array.from({ length: N }, () => ({ r: 20 + Math.random() * Math.hypot(W, H) * .6, a: Math.random() * 6.283, s: .4 + Math.random(), c: Math.random() < .15 ? '190,150,255' : Math.random() < .3 ? '255,200,150' : '255,255,255' }));
      const t0 = performance.now(); let lastStop = -1;
      const step = now => {
        const tt = (now - t0) / 1000, p = clamp(tt / DUR, 0, 1);
        // speed profile: accelerate, cruise, brake
        const v = Math.sin(Math.PI * clamp(p * 1.05, 0, 1)) ** 1.4;
        ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(0,0,0,${.28 + (1 - v) * .4})`; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter'; const cx = W / 2, cy = H / 2, E = Math.min(W, H) * .12 * sstep(0, .4, p);
        for (const s of st) {
          const r0 = s.r, a0 = s.a; s.a -= (0.4 + 3.2 * v) * s.s * 0.016 * (180 / (r0 + 40)); s.r -= (40 + 900 * v) * s.s * 0.016 * (r0 / 600);
          if (s.r < 8) { s.r = Math.hypot(W, H) * (.45 + Math.random() * .2); s.a = Math.random() * 6.283; continue; }
          const bend = r => r + (E * E) / Math.max(r, 1); // weak-lens approximation: light bends around the centre
          const R1 = bend(s.r), R0 = bend(r0);
          ctx.strokeStyle = `rgba(${s.c},${(.35 + .65 * v).toFixed(2)})`; ctx.lineWidth = s.s * 1.3;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a0) * R0, cy + Math.sin(a0) * R0); ctx.lineTo(cx + Math.cos(s.a) * R1, cy + Math.sin(s.a) * R1); ctx.stroke();
        }
        // ring of years spins backward and slows
        ring.style.transform = `rotate(${(-p * (mode === 'full' ? 540 : 260) * (1 - .35 * p)).toFixed(2)}deg) scale(${(1.15 - .25 * p).toFixed(3)})`;
        // the year counter falls through milestones
        // 2026 holds briefly, then each leg travels for 65% of its time and holds on the milestone (label shown) for 35%
        const q = clamp((p - .06) / .8, 0, 1), segs = STOPS.length - 1, sp = q * segs, si = Math.min(segs - 1, Math.floor(sp)), local = sp - si, sk = sstep(0, .65, local);
        const a = STOPS[si][0], b = STOPS[si + 1][0];
        const yv = Math.round(lerp(a, b, sk)); const f = fmtYear(yv); yb.textContent = String(f.n);
        const stopNow = p < .06 ? 0 : (local >= .65 || q >= 1 ? si + 1 : -1);
        if (stopNow !== lastStop) { lastStop = stopNow; if (stopNow < 0) ys.textContent = f.s || '\u00a0'; else { const S0 = STOPS[stopNow]; const fs = fmtYear(S0[0]); ys.textContent = (fs.s ? fs.s + (S0[1] ? ' · ' : '') : '') + (S0[1] || 'Today'); }
          if (audible() && stopNow > 0) try { SA().tone({ f: 1400 - stopNow * 180, dur: .18, gain: .03, a: .002, rev: .5, dly: .2 }, g); } catch {} }
        if (p > .86 && !ov.classList.contains('land')) { ov.classList.add('land'); if (audible()) try { SA().tone({ f: 196, dur: 2.2, gain: .05, a: .4, rev: .8, type: 'triangle' }, g); } catch {} }
        if (p >= 1) { finish(); return; }
        rafE = requestAnimationFrame(step);
      };
      rafE = requestAnimationFrame(step);
    });
  }
  function ascent() {
    // the way home: time spins forward to 2026 and the Observation Deck rises back
    return new Promise(done => {
      if (reduced()) { done(); return; }
      const ov = document.createElement('div'); ov.className = 'lw-entrance go';
      ov.innerHTML = `<div class="veil" style="opacity:.0"></div><div class="lw-year"><b>8000</b><small>BCE</small></div>`; document.body.appendChild(ov);
      const v = ov.querySelector('.veil'), yb = ov.querySelector('b'), ys = ov.querySelector('small'); requestAnimationFrame(() => { v.style.opacity = '.96'; });
      const t0 = performance.now(), DUR = 1.1;
      const step = now => { const p = clamp((now - t0) / 1000 / DUR, 0, 1), y = Math.round(lerp(-8000, 2026, sstep(0, 1, p))), f = fmtYear(y); yb.textContent = f.n; ys.textContent = f.s || 'Observation Deck';
        if (p < 1) requestAnimationFrame(step); else { ov.classList.add('out'); setTimeout(() => ov.remove(), 950); done(); } };
      requestAnimationFrame(step);
      if (audible()) try { SA().tone({ f: 41, to: 220, dur: 1.2, gain: .05, type: 'triangle', a: .3, rev: .5 }); } catch {}
    });
  }

  /* ================================================================ OPEN / CLOSE */
  let opened = false, pushed = false, resizeT = 0, busy = false;
  async function open(opts = {}) {
    if (opened || busy) return; busy = true; build();
    try { window.SignalAudio && window.SignalAudio.unlock && audible() && window.SignalAudio.unlock(); } catch {}
    const mode = reduced() ? 'reduced' : (opts.instant ? 'none' : (ss.get('ps-lw-intro') ? 'short' : 'full'));
    ss.set('ps-lw-intro', '1');
    const showShell = () => {
      shell.hidden = false; document.body.classList.add('lw-open'); opened = true;
      scroller.scrollTop = 0; sTop = 0; curEra = -1; curItem = -1; dirtyScroll = true; lastEraSound = -1; lastYearShown = null; digitCount = 0; digitEls.forEach(d => d.pos = -1);
      measure(); observe(); curEra = 0; startLoop();
    };
    if (mode === 'none') showShell();
    else { const p = descent(mode); setTimeout(showShell, mode === 'full' ? 4600 : mode === 'short' ? 700 : 300); await p; if (!opened) showShell(); }
    document.body.classList.remove('lw-departing');
    if (!pushed) { try { history.pushState({ lw: 1 }, '', location.pathname + location.search + '#long-watch'); pushed = true; } catch {} }
    setTimeout(() => scroller.focus({ preventScroll: true }), 50);
    busy = false;
  }
  async function close(opts = {}) {
    if (!opened || busy) return; busy = true;
    closeSheet(); closeMotifs(); if (thread.motif) setMotif(thread.motif);
    const fast = !!opts.fast || reduced();
    if (!fast) { await new Promise(r => { ascent().then(r); setTimeout(() => { hideShell(); }, 520); }); }
    else hideShell();
    if (pushed && !opts.fromPop) { pushed = false; try { history.back(); } catch {} } else pushed = false;
    busy = false;
    const b = document.getElementById('lw-launch'); if (b && !opts.toAtlas) b.focus({ preventScroll: true });
  }
  function hideShell() {
    if (!opened) return; opened = false; stopLoop(); unobserve();
    // release everything heavy: backdrops, particle pools, canvas backing stores
    for (const el of bgLayers.values()) el.remove(); bgLayers.clear(); pools.clear();
    amb.width = amb.height = 1; actx = null; gState.ctx = null; gState.visited.clear(); gState.cur = -1;
    if (fctx) { const cv = finale.querySelector('canvas'); cv.width = cv.height = 1; fctx = null; } finaleLit = false; finale.classList.remove('lit'); shell.querySelector('.lw-tl').classList.remove('lit');
    for (const it of items) it.el.classList.remove('in', 'done');
    shell.hidden = true; document.body.classList.remove('lw-open', 'lw-departing');
    document.body.classList.add('lw-arriving'); requestAnimationFrame(() => requestAnimationFrame(() => { document.body.classList.remove('lw-arriving'); document.body.classList.add('lw-arrived'); setTimeout(() => document.body.classList.remove('lw-arrived'), 1100); }));
  }
  async function toAtlas(id) {
    await close({ fast: true, toAtlas: true });
    const launch = document.getElementById('atlas-launch'), atlasShell = document.getElementById('atlas-shell'); if (!launch || !atlasShell) return;
    launch.click();
    const t0 = performance.now();
    const wait = () => { if (!atlasShell.hidden || performance.now() - t0 > 3000) {
      setTimeout(() => { try { window.__atlasAscension && window.__atlasAscension.skipBoot && window.__atlasAscension.skipBoot(); } catch {}
        setTimeout(() => { try { window.__atlasAscension && window.__atlasAscension.openDossier(id); } catch {} }, 420); }, 120);
    } else requestAnimationFrame(wait); };
    wait();
  }

  /* ================================================================ MOTIF MENU */
  function openMotifs() { motifsEl.hidden = false; shell.querySelector('.lw-thr').setAttribute('aria-expanded', 'true'); const f = motifsEl.querySelector('.lw-chip'); f && f.focus({ preventScroll: true }); }
  function closeMotifs() { if (motifsEl.hidden) return; motifsEl.hidden = true; shell.querySelector('.lw-thr').setAttribute('aria-expanded', 'false'); }

  /* ================================================================ WIRING */
  function wire() {
    scroller.addEventListener('scroll', onScroll, { passive: true });
    shell.addEventListener('click', ev => {
      const t = ev.target;
      const card = t.closest('.lw-card'); if (card) { openSheet(+card.dataset.i, card); return; }
      if (t.closest('.lw-x')) { close(); return; }
      if (t.closest('.lw-return')) { close(); return; }
      if (t.closest('.lw-sheet-x') || t === scrim) { closeSheet(); return; }
      const go = t.closest('[data-go]'); if (go) { gotoSheet(+go.dataset.go); return; }
      const at = t.closest('[data-atlas]'); if (at) { toAtlas(at.dataset.atlas); return; }
      if (t.closest('.lw-thr')) { motifsEl.hidden ? openMotifs() : closeMotifs(); return; }
      const chip = t.closest('.lw-chip'); if (chip) { setMotif(chip.dataset.m); closeMotifs(); return; }
      if (t.closest('.lw-threadbar button')) { if (thread.motif) setMotif(thread.motif); return; }
      const rb = t.closest('.lw-rail button'); if (rb) { jumpEra(+rb.dataset.i); return; }
      if (t.closest('.lw-odo')) { jumpEra((curEra + 1) % ERAS.length); return; }
      if (!t.closest('.lw-motifs')) closeMotifs();
    });
    document.addEventListener('keydown', ev => {
      if (!opened) return;
      if (ev.key === 'Escape') { ev.preventDefault(); if (sheetOpen) closeSheet(); else if (!motifsEl.hidden) closeMotifs(); else close(); return; }
      if (sheetOpen && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) { gotoSheet(sheetIx + (ev.key === 'ArrowRight' ? 1 : -1)); return; }
      if (sheetOpen && ev.key === 'Tab') { const f = [...sheet.querySelectorAll('button:not([disabled]),a[href]')]; if (!f.length) return; const a = f[0], z = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === a) { ev.preventDefault(); z.focus(); } else if (!ev.shiftKey && document.activeElement === z) { ev.preventDefault(); a.focus(); } }
      if ((ev.key === 'Enter' || ev.key === ' ') && document.activeElement && document.activeElement.classList.contains('lw-odo')) { ev.preventDefault(); jumpEra((curEra + 1) % ERAS.length); }
    });
    addEventListener('resize', () => { if (!opened) return; clearTimeout(resizeT); resizeT = setTimeout(() => { measure(); dirtyScroll = true; }, 140); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!opened) return; if (document.hidden) stopLoop(); else startLoop(); });
    addEventListener('popstate', () => { if (opened && pushed) { pushed = false; close({ fromPop: true }); } });
    RM.addEventListener && RM.addEventListener('change', () => { if (opened) { sizeAmb(); for (const it of items) it.el.classList.add('in'); } });
  }
  function jumpEra(i) { const s = eraSecs[i]; if (!s) return; scroller.scrollTo({ top: Math.max(0, s.top - vh * .1), behavior: reduced() ? 'auto' : 'smooth' }); }

  window.LongWatch = { open, close, get isOpen() { return opened; }, _debug: () => ({ era: ERAS[curEra] && ERAS[curEra].id, item: curItem, year: lastYearShown, bgLayers: bgLayers.size, pools: pools.size, imgsAttached: shell.querySelectorAll('.lw-card img[src]').length, imgsLoaded: shell.querySelectorAll('.lw-card img.ok').length, budget }) };
})();
