/* PROJECT SIGNAL — ATLAS TIME SCRUBBER (CONVERGENCE part 2)
 * Drag through time: hub markers ignite in the years their recorded encounters happened (a flare that settles into
 * the normal glow) and fade when you scrub back past them. Play runs about 80 years in 30 seconds. Wave captions are
 * drawn only from archive records that themselves describe a wave, each linked to that record's source.
 * At "TODAY" the map is exactly the normal Atlas. Flares and captions live in an HTML overlay (transform/opacity
 * only) so the map's SVG is touched only when the whole year changes. */
(() => {
  'use strict';
  const A = window.__atlas; if (!A) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const shell = $('#atlas-shell'), frame = $('.atlas-map-frame'), svg = $('#atlas-map-svg'), pins = $('#atlas-map-pins');
  if (!shell || !frame || !svg || !pins) return;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- records → years (a decade-only or missing year goes to the UNDATED tray, never onto the line) */
  const yearOf = d => { const s = String(d || '').trim(); if (/^\d{3}0s\b/.test(s)) return null; const m = s.match(/^(\d{4})/); return m ? +m[1] : null; };
  const recs = [], undated = [];
  for (const r of A.archive) { const y = yearOf(r.date); (y ? recs : undated).push({ id: r.id, y, hubs: r.hubs, title: r.title, date: r.date, sourced: true }); }
  for (const r of A.additions) { const y = yearOf(r.date); (y ? recs : undated).push({ id: r.id, y, hubs: [r.hub], title: r.title, date: r.date, sourced: false }); }
  recs.sort((a, b) => a.y - b.y);
  const NOW = new Date().getFullYear(), Y0 = Math.floor(Math.min(...recs.map(r => r.y)) / 10) * 10, SPAN = NOW - Y0;
  const hubYears = new Map(A.cities.map(c => [c.id, []]));
  for (const r of recs) for (const h of r.hubs) hubYears.has(h) && hubYears.get(h).push(r.y);
  const countTo = (arr, y) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] <= y) lo = m + 1; else hi = m; } return lo; };
  const recYears = recs.map(r => r.y);

  /* ---------- sourced wave annotations (each is an archive record that itself describes a wave or mass sighting) */
  const arch = Object.fromEntries(A.archive.map(r => [r.id, r]));
  const WAVES = [
    { y: 1896, id: 'ps-067', k: 'The airship wave', t: 'Sacramento crowds report a lighted craft overhead; “airship” reports spread across the country into 1897.' },
    { y: 1947, id: 'ps-013', k: 'The flying-disc summer', t: 'After Kenneth Arnold’s report, at least several hundred similar reports flood in within weeks.' },
    { y: 1952, id: 'ps-056', k: 'Washington, 1952', t: 'Radar operators and pilots report unidentified targets over the capital on two July weekends.' },
    { y: 1957, id: 'ps-039', k: 'The 1957 flap', t: 'Levelland drivers report a glowing object and dying engines; similar reports follow in New Mexico.' },
    { y: 1965, id: 'ps-070', k: 'The Midwest wave', t: 'Hundreds of reports reach police and Tinker AFB over several nights in late July and August.' },
    { y: 1966, id: 'ps-040', k: 'Michigan, 1966', t: 'Many witnesses report lights; Hynek’s “swamp gas” suggestion becomes a national controversy.' },
    { y: 1973, id: 'ps-031', k: 'The 1973 wave', t: 'A national surge of reports that autumn, including Pascagoula and the Coyne helicopter case.' },
    { y: 1982, id: 'ps-007', k: 'Hudson Valley', t: 'Boomerang and V-shaped light formations are reported again and again through 1986.' },
    { y: 1997, id: 'ps-001', k: 'The Phoenix Lights', t: 'Thousands report a V-shaped formation and, later, stationary lights over Arizona in one night.' },
  ].filter(w => arch[w.id]).map(w => ({ ...w, src: arch[w.id].sources[0] }));

  /* ---------- DOM */
  const bar = document.createElement('div'); bar.className = 'ax-time'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Time scrubber');
  const byYear = new Map(); for (const y of recYears) byYear.set(y, (byYear.get(y) || 0) + 1);
  const maxN = Math.max(...byYear.values());
  const X = y => ((y - Y0) / SPAN * 100).toFixed(3) + '%';
  const decades = []; for (let d = Y0; d <= NOW; d += 10) decades.push(d);
  bar.innerHTML = `
    <div class="ax-time-row">
      <button type="button" class="ax-play" aria-label="Play through time"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="pl" d="M8 5.5v13l10.5-6.5z"/><path class="pa" d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg></button>
      <div class="ax-track" role="slider" tabindex="0" aria-label="Year" aria-valuemin="${Y0}" aria-valuemax="${NOW}" aria-valuenow="${NOW}" aria-valuetext="Today: all records">
        <div class="ax-rail"><svg class="ax-hist" viewBox="0 0 ${SPAN} 10" preserveAspectRatio="none" aria-hidden="true">${[...byYear].map(([y, n]) => `<rect x="${y - Y0}" y="${(10 - 10 * Math.sqrt(n / maxN)).toFixed(2)}" width=".85" height="${(10 * Math.sqrt(n / maxN)).toFixed(2)}"/>`).join('')}</svg>
          <i class="ax-fill"></i>${WAVES.map(w => `<b class="ax-notch" style="left:${X(w.y)}" title="${esc(w.k)} · ${w.y}"></b>`).join('')}</div>
        <span class="ax-handle" aria-hidden="true"><b>TODAY</b><i></i></span>
      </div>
      <button type="button" class="ax-speed" aria-label="Playback speed">1×</button>
    </div>
    <div class="ax-decades">${decades.map(d => `<button type="button" data-dec="${d}" style="left:${X(d)}" aria-label="Jump to the ${d}s">${d === Y0 || d % 50 === 0 ? d : '’' + String(d).slice(2)}</button>`).join('')}<button type="button" class="ax-today" data-dec="${NOW}" aria-label="Back to today">NOW</button></div>
    ${undated.length ? `<div class="ax-undated"><button type="button" class="ax-tray-btn" aria-expanded="false">UNDATED · ${undated.length}</button><div class="ax-tray" hidden><p>Records without a single year sit here rather than on the timeline.</p><ul>${undated.map(r => `<li><button type="button" data-open="${esc(r.id)}" data-hub="${esc(r.hubs[0])}">${esc(r.title)}<small>${esc(r.date)}</small></button></li>`).join('')}</ul></div></div>` : ''}`;
  const lb = $('.ax-layers', frame); if (lb) lb.before(bar); else frame.after(bar); // docked right under the map
  const fx = document.createElement('div'); fx.className = 'ax-time-fx'; fx.setAttribute('aria-hidden', 'true');
  fx.innerHTML = `<div class="ax-yr"><b></b><small></small></div><div class="ax-flares">${'<i></i>'.repeat(14)}</div>`;
  frame.appendChild(fx);
  const cap = document.createElement('div'); cap.className = 'ax-wave'; cap.setAttribute('role', 'status'); cap.setAttribute('aria-live', 'polite'); frame.appendChild(cap);
  const track = $('.ax-track', bar), handle = $('.ax-handle', bar), hLbl = $('b', handle), fill = $('.ax-fill', bar), playBtn = $('.ax-play', bar), speedBtn = $('.ax-speed', bar);
  const yrB = $('.ax-yr b', fx), yrS = $('.ax-yr small', fx), flares = $$('.ax-flares i', fx); let flareI = 0;

  /* ---------- marker / layer state for a whole year */
  const hubG = new Map($$('.atlas-city', pins).map(g => [g.dataset.id, { g, off: false }]));
  const totals = new Map([...hubYears].map(([k, v]) => [k, v.length]));
  let dens = null, links = null; // cached layer shapes; rebuilt only when the layers redraw
  const cacheLayers = () => { dens = $$('.ax-density circle[data-id]', svg).map(c => ({ c, id: c.dataset.id, s: -1 })); links = $$('.ax-constellations path[data-a]', svg).map(p => ({ p, a: p.dataset.a, b: p.dataset.b, h: false })); };
  let year = NOW, shownY = NOW, timeMode = false;
  function applyYear(y, prevY) {
    const on = y < NOW;
    if (on !== timeMode) { timeMode = on; shell.classList.toggle('ax-timing', on); }
    if (!dens) cacheLayers();
    const n = id => on ? countTo(hubYears.get(id) || [], y) : (totals.get(id) || 0);
    for (const [id, h] of hubG) { const off = on && !n(id); if (off !== h.off) { h.off = off; h.g.classList.toggle('ax-t-off', off); } }  // write only what changes
    for (const d of dens) { const t = totals.get(d.id) || 1, k = n(d.id), sc = on ? (k ? Math.round((0.35 + 0.65 * Math.sqrt(k / t)) * 50) / 50 : 0) : 1; if (sc !== d.s) { d.s = sc; d.c.style.setProperty('--ts', sc); } }
    for (const l of links) { const hide = on && (!n(l.a) || !n(l.b)); if (hide !== l.h) { l.h = hide; l.p.classList.toggle('ax-t-hide', hide); } }
    const lit = on ? countTo(recYears, y) : recs.length;
    // flares only for records crossed while moving forward a short way (a big jump just snaps)
    if (on && prevY != null && y > prevY && y - prevY <= 4 && !reduced()) {
      let spawned = 0;
      for (const r of recs) { if (r.y <= prevY) continue; if (r.y > y) break; for (const h of r.hubs) if (spawned < 6) { flare(h, r.sourced); spawned++; } }
    }
    yrB.textContent = on ? y : ''; yrS.textContent = on ? `${lit} of ${recs.length} dated records` : '';
    track.setAttribute('aria-valuenow', String(y)); track.setAttribute('aria-valuetext', on ? `${y}: ${lit} records so far` : 'Today: all records');
  }
  /* hub positions on screen (only recomputed after a pan / zoom / resize) */
  let pos = null;
  const invalidate = () => { pos = null; };
  const prevZoom = window.__atlasZoomed; window.__atlasZoomed = (t, e) => { if (prevZoom) prevZoom(t, e); invalidate(); };
  addEventListener('resize', invalidate, { passive: true });
  function hubXY(id) {
    if (!pos) { pos = new Map(); const m = pins.getScreenCTM(), fr = frame.getBoundingClientRect(); if (!m) return null; const pt = svg.createSVGPoint();
      for (const c of A.cities) { const p = A.positions[c.id]; if (!p) continue; pt.x = p[0]; pt.y = p[1]; const q = pt.matrixTransform(m); pos.set(c.id, [q.x - fr.left, q.y - fr.top]); } }
    return pos.get(id);
  }
  function flare(id, sourced) {
    const p = hubXY(id); if (!p) return; const el = flares[flareI++ % flares.length];
    el.className = sourced ? 's' : 'n'; el.style.transform = `translate3d(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px,0)`;
    el.getAnimations().forEach(a => a.cancel());
    el.animate([{ opacity: 1, transform: `translate3d(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px,0) scale(.25)` }, { opacity: .95, offset: .25, transform: `translate3d(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px,0) scale(1.6)` }, { opacity: 0, transform: `translate3d(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px,0) scale(2.6)` }], { duration: 1100, easing: 'cubic-bezier(.2,.7,.3,1)' });
  }
  /* ---------- the handle (only transform per frame) */
  let trackW = 0;
  function place() {
    if (!trackW) trackW = track.clientWidth;
    const f = (year - Y0) / SPAN;
    handle.style.transform = `translate3d(${(f * trackW).toFixed(1)}px,0,0)`; fill.style.transform = `scaleX(${f.toFixed(4)})`;
    const yi = Math.round(year);
    if (yi !== shownY) { const prev = shownY; shownY = yi; hLbl.textContent = yi >= NOW ? 'TODAY' : yi; applyYear(yi, prev); if (playing) waveCheck(prev, yi); }
  }
  addEventListener('resize', () => { trackW = 0; place(); }, { passive: true });
  function setYear(y) { year = clamp(y, Y0, NOW); place(); }

  /* ---------- wave captions */
  let capT = 0;
  function showWave(w) {
    cap.innerHTML = `<div class="k">◈ WAVE · ${w.y}</div><b>${esc(w.k)}</b><p>${esc(w.t)}</p><a href="${esc(w.src.url)}" target="_blank" rel="noopener noreferrer">${esc(w.src.label)} ↗</a>`;
    cap.classList.remove('on'); void cap.offsetWidth; cap.classList.add('on');
    clearTimeout(capT); capT = setTimeout(() => cap.classList.remove('on'), 5200);
  }
  function waveCheck(a, b) { if (b <= a) return; const w = WAVES.find(w => w.y > a && w.y <= b); if (w) showWave(w); }
  bar.addEventListener('click', e => { const n = e.target.closest('.ax-notch'); if (n) { const w = WAVES[$$('.ax-notch', bar).indexOf(n)]; if (w) { tweenTo(w.y); showWave(w); } } });

  /* ---------- playback */
  const SPEEDS = [0.5, 1, 2, 4]; let si = 1, playing = false, raf = 0, last = 0;
  const RATE = 80 / 30; // years per second at 1×
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(64, now - (last || now)); last = now;
    if (playing) { setYear(year + RATE * SPEEDS[si] * dt / 1000); if (year >= NOW) stop(); }
    else if (Math.abs(vel) > 0.0008) { setYear(year + vel * dt); vel *= Math.pow(0.92, dt / 16.7); if (year <= Y0 || year >= NOW) vel = 0; }
    else if (tween) { const k = Math.min(1, (now - tween.t0) / tween.d), e = 1 - Math.pow(1 - k, 3); setYear(tween.a + (tween.b - tween.a) * e); if (k >= 1) tween = null; }
    else { cancelAnimationFrame(raf); raf = 0; last = 0; }
  }
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };
  function play() { if (year >= NOW - 0.5) setYear(Y0); playing = true; vel = 0; tween = null; bar.classList.add('playing'); playBtn.setAttribute('aria-label', 'Pause'); kick(); }
  function stop() { playing = false; bar.classList.remove('playing'); playBtn.setAttribute('aria-label', 'Play through time'); }
  playBtn.addEventListener('click', () => playing ? stop() : play());
  speedBtn.addEventListener('click', () => { si = (si + 1) % SPEEDS.length; speedBtn.textContent = SPEEDS[si] + '×'; speedBtn.setAttribute('aria-label', `Playback speed ${SPEEDS[si]} times`); });
  let tween = null;
  function tweenTo(y) { stop(); vel = 0; if (reduced()) { setYear(y); return; } tween = { a: year, b: clamp(y, Y0, NOW), t0: performance.now(), d: 520 }; kick(); }
  bar.addEventListener('click', e => { const d = e.target.closest('[data-dec]'); if (d) tweenTo(+d.dataset.dec); });

  /* ---------- drag with momentum (the track owns its gestures; the map never sees them) */
  let drag = null, vel = 0;
  let tr = null; // the track's box, measured once per gesture (reading it per move would force a style + layout pass)
  const yAt = x => { const r = tr || track.getBoundingClientRect(); return Y0 + clamp((x - r.left) / r.width, 0, 1) * SPAN; };
  track.addEventListener('pointerdown', e => { if (e.button) return; stop(); tween = null; vel = 0; track.setPointerCapture(e.pointerId); trackW = track.clientWidth; tr = track.getBoundingClientRect(); drag = { id: e.pointerId, s: [[performance.now(), yAt(e.clientX)]] }; bar.classList.add('dragging'); setYear(yAt(e.clientX)); e.preventDefault(); });
  track.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; const y = yAt(e.clientX); drag.s.push([performance.now(), y]); if (drag.s.length > 6) drag.s.shift(); setYear(y); });
  const end = e => { if (!drag || e.pointerId !== drag.id) return; const s = drag.s, a = s[0], b = s[s.length - 1]; drag = null; tr = null; bar.classList.remove('dragging');
    if (!reduced() && b[0] - a[0] > 0 && performance.now() - b[0] < 80) { vel = clamp((b[1] - a[1]) / (b[0] - a[0]), -0.4, 0.4); if (Math.abs(vel) > 0.01) kick(); else vel = 0; } };
  track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end);
  track.addEventListener('keydown', e => { const k = e.key, step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 }[k];
    if (step) { e.preventDefault(); stop(); setYear(Math.round(year) + step); } else if (k === 'Home') { e.preventDefault(); stop(); setYear(Y0); } else if (k === 'End') { e.preventDefault(); stop(); setYear(NOW); } });

  /* ---------- undated tray */
  const trayBtn = $('.ax-tray-btn', bar), tray = $('.ax-tray', bar);
  if (trayBtn) {
    trayBtn.addEventListener('click', () => { const open = tray.hidden; tray.hidden = !open; trayBtn.setAttribute('aria-expanded', String(open)); });
    tray.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (!b) return; tray.hidden = true; trayBtn.setAttribute('aria-expanded', 'false');
      const id = b.dataset.open; if (id.startsWith('ps-') && window.__atlasAscension) window.__atlasAscension.openDossier(id); else A.choose(b.dataset.hub, true); });
  }

  /* ---------- layers redraw → re-apply; every visit starts at TODAY */
  window.addEventListener('atlas:layers', () => requestAnimationFrame(() => { cacheLayers(); applyYear(shownY, null); }));
  new MutationObserver(() => { if (shell.hidden) { stop(); vel = 0; tween = null; cap.classList.remove('on'); } else { trackW = 0; invalidate(); setYear(NOW); } }).observe(shell, { attributes: true, attributeFilter: ['hidden'] });
  window.__atlasTime = { setYear, play, stop, get year() { return year; }, get playing() { return playing; }, waves: WAVES, undated, range: [Y0, NOW], records: recs.length };
})();
