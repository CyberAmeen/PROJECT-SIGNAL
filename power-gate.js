/* PROJECT SIGNAL — Power-On Gate.
   One deliberate tap boots the site: it gives iOS the gesture it needs for audio, plays the
   "Ignition" sound (with the Signal Motif as a startup chime), charges the core, fires a shockwave,
   opens an iris onto the hub and animates the hub in — then the hub theme takes over. */
(() => {
  'use strict';
  const gate = document.getElementById('power-gate'); if (!gate) return;
  window.__pgReady = true;
  const $ = s => gate.querySelector(s);
  const SA = window.SignalAudio;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const power = $('.pg-power'), silent = $('.pg-silent'), prog = $('.pg-prog'), pct = $('.pg-pct'), lines = $('.pg-lines');
  setTimeout(() => { try { power.focus({ preventScroll: true }); } catch {} }, 300);
  // returning after an unexpected reload mid-feed → say so on the button prompt
  try { const r = JSON.parse(sessionStorage.getItem('ps-intel-resume') || 'null'); if (r && r.open && Date.now() - r.t < 15 * 60e3) { gate.querySelectorAll('.pg-cta span').forEach(x => { x.textContent = x.classList.contains('pg-cta-fine') ? 'CLICK OR PRESS ENTER TO RESUME TRANSMISSION' : 'TAP TO RESUME TRANSMISSION'; }); } } catch {}

  /* ---- starfield (slow drift; streaks while charging) */
  const cv = $('.pg-stars'), cx2 = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  let W = 0, H = 0, speed = 0.0007, raf = 0, alive = true;
  const fit = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cx2 && cx2.setTransform(dpr, 0, 0, dpr, 0, 0); };
  fit(); addEventListener('resize', fit);
  const cols = ['255,236,210', '244,190,230', '190,230,255', '255,255,255'];
  const stars = Array.from({ length: 260 }, () => ({ x: (Math.random() - .5) * 2, y: (Math.random() - .5) * 2, z: Math.random(), c: cols[Math.floor(Math.random() * cols.length)], tw: Math.random() * 6 }));
  const draw = now => {
    if (!alive || !cx2) return;
    cx2.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, F = Math.min(W, H) * .8;
    stars.forEach(s => {
      const z0 = s.z; s.z -= speed; if (s.z <= .02) { s.z = 1; s.x = (Math.random() - .5) * 2; s.y = (Math.random() - .5) * 2; return; }
      const x = cx + s.x / s.z * F * .5, y = cy + s.y / s.z * F * .5, x0 = cx + s.x / z0 * F * .5, y0 = cy + s.y / z0 * F * .5;
      const a = Math.min(1, (1 - s.z) * 1.3) * (.65 + .35 * Math.sin(now / 600 + s.tw));
      cx2.strokeStyle = `rgba(${s.c},${a.toFixed(3)})`; cx2.lineWidth = Math.max(.6, (1 - s.z) * 2);
      cx2.beginPath(); cx2.moveTo(x0, y0); cx2.lineTo(x + (speed > .004 ? (x - x0) * 4 : .1), y + (speed > .004 ? (y - y0) * 4 : .1)); cx2.stroke();
    });
    raf = requestAnimationFrame(draw);
  };
  if (!reduced) raf = requestAnimationFrame(draw);

  /* ---- hub reveal choreography */
  function revealHub() {
    if (reduced) return;
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    const anim = (sel, frames, delay, dur = 900) => document.querySelectorAll(sel).forEach((el, i) => { try { el.animate(frames, { duration: dur, delay: delay + i * 80, easing: ease, fill: 'backwards' }); } catch {} });
    const rise = [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }];
    anim('body > .wrap > header, header', rise, 120, 800);
    anim('.mission-intro', rise, 200, 800);
    anim('.cosmic-bridge .bridge-scene', [{ opacity: 0, transform: 'scale(1.18)', filter: 'blur(10px) brightness(1.8)' }, { opacity: 1, transform: 'none', filter: 'none' }], 0, 1500);
    anim('.bridge-kicker', rise, 380, 800);
    anim('.bridge-content h2', [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], 480, 1000);
    anim('.bridge-description', rise, 760, 800);
    anim('.bridge-console', [{ opacity: 0, transform: 'translateY(26px) scale(.97)' }, { opacity: 1, transform: 'none' }], 900, 900);
    anim('.bridge-telemetry', rise, 1100, 800);
  }

  /* ---- the boot sequence */
  let busy = false;
  function boot(withSound) {
    if (busy) return; busy = true;
    if (SA) { SA.unlock(); SA.enabled = withSound; if (withSound) SA.ui('ignite'); }
    // centre of the power button = origin of shockwave and iris
    const r = power.getBoundingClientRect();
    gate.style.setProperty('--cx', `${r.left + r.width / 2}px`); gate.style.setProperty('--cy', `${r.top + r.height / 2}px`);
    if (reduced) { gate.classList.add('pg-opening'); if (SA && SA.zone) SA.zone(true); setTimeout(finish, 550); return; }
    gate.classList.add('pg-charging');
    const t0 = performance.now(), CHARGE = 1250, OPEN_AT = 1450, OPEN_DUR = 1050;
    const steps = [['STAR TRACKER', 'OK', 220], ['DEEP SPACE UPLINK', 'OK', 520], ['OBSERVATION DECK', 'ONLINE', 820]];
    let shown = 0, ignited = false, opening = false;
    const maxR = Math.hypot(Math.max(r.left, innerWidth - r.left), Math.max(r.top, innerHeight - r.top)) + 40;
    const tick = now => {
      const t = now - t0;
      const p = Math.min(1, t / CHARGE), e = 1 - Math.pow(1 - p, 2);
      prog.style.strokeDashoffset = String(616 * (1 - e));
      pct.textContent = String(Math.round(e * 100)).padStart(3, '0') + '%';
      speed = 0.0007 + e * e * 0.012;
      while (shown < steps.length && t >= steps[shown][2]) { const [a, b] = steps[shown]; const d = document.createElement('div'); d.innerHTML = `${a} ··· <b>${b}</b>`; lines.append(d); shown++; }
      if (!ignited && t >= CHARGE) { ignited = true; gate.classList.add('pg-ignite'); speed = 0.03; }
      if (!opening && t >= OPEN_AT) { opening = true; gate.classList.add('pg-opening'); document.documentElement.classList.remove('pg-lock'); if (SA && SA.zone) SA.zone(true); revealHub(); }
      if (opening) {
        const q = Math.min(1, (t - OPEN_AT) / OPEN_DUR), eq = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
        gate.style.setProperty('--r', `${(eq * maxR).toFixed(1)}px`);
        if (q >= 1) { finish(); return; }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function finish() {
    alive = false; cancelAnimationFrame(raf); removeEventListener('resize', fit);
    try { cv.width = cv.height = 0; } catch {}
    setTimeout(() => { try { window.dispatchEvent(new Event('pg:done')); } catch {} }, 60);
    document.documentElement.classList.remove('pg-lock');
    gate.classList.add('pg-done');
    setTimeout(() => { gate.remove(); if (SA && SA.zone) SA.zone(true); }, 320);
    try { document.getElementById('refresh')?.focus({ preventScroll: true }); } catch {}
  }
  power.addEventListener('click', () => boot(true));
  silent.addEventListener('click', () => boot(false));
  gate.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); boot(false); } });
})();
