/* PROJECT SIGNAL — ATLAS ASCENDANT: the living map.
 * Hub → Atlas handoff, a slow radar sweep that lights markers as it passes, breathing marker glows, drifting
 * motes and scanline shimmer, cinematic fly-to with a lock-on pulse, and staggered constellation draw-in.
 * Purely presentational: it reads marker positions from the DOM and never changes archive data.
 * Pauses whenever the Atlas is hidden; reduced motion keeps everything still. */
(() => {
  'use strict';
  const shell = document.getElementById('atlas-shell'), frame = document.querySelector('.atlas-map-frame'), svg = document.getElementById('atlas-map-svg');
  if (!shell || !frame || !svg) return;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SWEEP_MS = 9000;

  /* --- overlays: radar sweep, motes, scan shimmer (all compositor-only animations) */
  const fx = document.createElement('div'); fx.className = 'axl-fx'; fx.setAttribute('aria-hidden', 'true');
  fx.innerHTML = '<div class="axl-radar"><i class="axl-wedge"></i><i class="axl-rings"></i></div><i class="axl-motes m1"></i><i class="axl-motes m2"></i><i class="axl-scan"></i>';
  svg.after(fx);
  const radar = fx.querySelector('.axl-radar');

  /* --- marker angles relative to the radar centre (recomputed on zoom / resize / open) */
  let marks = [], dirty = true;
  function measure() {
    dirty = false; const fr = frame.getBoundingClientRect(), rr = radar.getBoundingClientRect(), cx = rr.left + rr.width / 2, cy = rr.top + rr.height / 2;
    marks = [...svg.querySelectorAll('.atlas-city')].map(g => {
      const core = g.querySelector('.atlas-city-core') || g, r = core.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const ang = (Math.atan2(x - cx, -(y - cy)) * 180 / Math.PI + 360) % 360; // 0° = up, clockwise (matches the conic sweep)
      const inView = x > fr.left && x < fr.right && y > fr.top && y < fr.bottom;
      return { g, ang, inView, last: -1 };
    });
  }
  const prevZoom = window.__atlasZoomed;
  window.__atlasZoomed = (t, e) => { if (prevZoom) prevZoom(t, e); dirty = true; };
  addEventListener('resize', () => { dirty = true; }, { passive: true });

  /* --- sweep loop: light a marker as the beam crosses it */
  let raf = 0, t0 = performance.now();
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (dirty) measure();
    const a = ((now - t0) % SWEEP_MS) / SWEEP_MS * 360, cycle = Math.floor((now - t0) / SWEEP_MS);
    for (const m of marks) {
      if (!m.inView || m.last === cycle) continue;
      if (a >= m.ang && a - m.ang < 12) { m.last = cycle; m.g.classList.remove('axl-swept'); void m.g.getBBox; m.g.classList.add('axl-swept'); setTimeout(() => m.g.classList.remove('axl-swept'), 1400); }
    }
  }
  function start() { if (raf || reduced() || shell.hidden) return; radar.style.animation = 'none'; void radar.offsetWidth; radar.style.animation = ''; t0 = performance.now(); fx.classList.add('on'); dirty = true; raf = requestAnimationFrame(loop); }
  function stop() { cancelAnimationFrame(raf); raf = 0; fx.classList.remove('on'); }
  new MutationObserver(() => (shell.hidden ? stop() : setTimeout(start, 400))).observe(shell, { attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  /* --- breathing glows: stagger each marker so the map breathes, not blinks */
  svg.querySelectorAll('.atlas-city').forEach((g, i) => g.style.setProperty('--axl-d', `${(i * 0.37) % 4}s`));

  /* --- cinematic fly-to: when a hub is selected, lock on after the camera arrives */
  const obs = new MutationObserver(list => {
    for (const r of list) {
      const g = r.target; if (!g.classList.contains('selected') || (r.oldValue || '').includes('selected')) continue;
      g.classList.remove('axl-lock'); setTimeout(() => { g.classList.add('axl-lock'); setTimeout(() => g.classList.remove('axl-lock'), 1600); }, reduced() ? 0 : 760);
      const S = window.SignalAudio; try { if (S && S.live && S.live() && !reduced()) setTimeout(() => { S.tone({ f: 1760, to: 2640, dur: 0.09, gain: 0.014, type: 'square', lp: 5000 }); S.bell(1318, { at: 0.08, gain: 0.012, dur: 1.2, rev: 0.6 }); }, 760); } catch {}
    }
  });
  svg.querySelectorAll('.atlas-city').forEach(g => obs.observe(g, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }));

  /* --- hub → Atlas handoff: the hub's camera dives toward the planet as the Atlas boot fades in from the same space */
  const launch = document.getElementById('atlas-launch'), card = document.querySelector('.hero.cosmic-bridge');
  if (launch && card) launch.addEventListener('click', () => {
    if (reduced()) return;
    card.classList.remove('axl-handoff'); void card.offsetWidth; card.classList.add('axl-handoff');
    setTimeout(() => card.classList.remove('axl-handoff'), 1400);
  }, true);

  if (!shell.hidden) start();
})();
