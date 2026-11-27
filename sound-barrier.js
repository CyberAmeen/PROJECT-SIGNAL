/* PROJECT SIGNAL — SOUND BARRIER
   Site-wide sound design on top of signal-audio.js. Three zone soundscapes that crossfade as you move:
     HUB    observation deck — warm Dmaj9 glass pad, starlight chimes, ship hum
     INTEL  deep space — blue drone + one living layer per Holo-Scene, timed to its animation loop
     ATLAS  radar ops room — hum, vents, distant sonar, teletype chatter
   plus interaction sounds for every control. All synthesized; on by default; one global switch. */
(() => {
  'use strict';
  const SA = window.SignalAudio; if (!SA) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const D = 73.42, A1 = 55;
  const panX = x => Math.max(-0.9, Math.min(0.9, (x / innerWidth) * 2 - 1));
  const panEl = el => { try { const r = el.getBoundingClientRect(); return panX(r.left + r.width / 2); } catch { return 0; } };
  const live = () => !!(SA.ctx && SA.enabled && SA.ctx.state !== 'closed' && !document.hidden);
  const T = (o, g) => SA.tone(o, g || SA.ui.g()), N = (o, g) => SA.noise(o, g || SA.ui.g());

  /* ---------------------------------------------------------------- beds (continuous layers) */
  function bed(g, level) {
    const c = SA.ctx, out = c.createGain(), nodes = [], timers = [];
    out.gain.value = 0.0001; SA.route(out, { rev: 0.5 }, g); SA.ramp(out.gain, level, 0.6);
    const add = (n, conn) => { nodes.push(n); if (conn) n.connect(conn); return n; };
    return {
      out, nodes, timers,
      osc(f, type = 'sine', gain = 0.05, dest = out, detune = 0) { const o = c.createOscillator(), v = c.createGain(); o.type = type; o.frequency.value = f; o.detune.value = detune; v.gain.value = gain; o.connect(v); v.connect(dest); o.start(); add(o); return { o, v }; },
      noise(type, f, q, gain, dest = out) { const n = SA.loopNoise(g, type, f, q, gain); n.v.connect(dest); add(n.s); return n; },
      lfo(param, rate, depth) { const l = c.createOscillator(), d = c.createGain(); l.frequency.value = rate; d.gain.value = depth; l.connect(d); d.connect(param); l.start(); add(l); return l; },
      filter(type, f, q = 0.7, dest = out) { const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; fl.connect(dest); return fl; },
      every(minS, maxS, fn) { const loop = () => { const id = setTimeout(() => { if (live()) fn(); loop(); }, rnd(minS, maxS) * 1000); timers.push(id); }; loop(); },
      stop(fade = 1.2) { SA.ramp(out.gain, 0.0001, fade / 4); timers.forEach(clearTimeout); setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch {} }), fade * 1000 + 300); }
    };
  }

  const ZONES = {
    hub(g) {
      const b = bed(g, 0.5);
      const glass = b.filter('lowpass', 1300, 0.9); b.lfo(glass.frequency, 0.045, 420);
      [D * 2, D * 3, D * 3.775, D * 4.49, D * 5.04].forEach((f, i) => { b.osc(f, 'triangle', 0.016, glass, -6 + i * 3); b.osc(f * 1.002, 'sine', 0.012, glass); });
      b.osc(A1, 'sine', 0.035); b.noise('lowpass', 220, 0.6, 0.05);
      const twinkle = [1174.7, 1318.5, 1480, 1760, 1975.5, 2349.3];
      b.every(2.2, 5.5, () => SA.bell(pick(twinkle), { dur: 2.6, gain: 0.011, pan: rnd(-0.8, 0.8), rev: 0.9, dly: 0.35 }, g));
      b.every(14, 24, () => T({ f: rnd(180, 240), to: rnd(120, 160), dur: 3.5, gain: 0.012, type: 'sawtooth', lp: 700, lpTo: 300, a: 1.2, pan: rnd(-0.9, 0.9), rev: 0.7 }, g)); // distant craft pass
      return b;
    },
    stream(g) {
      const b = bed(g, 0.45);
      const lp = b.filter('lowpass', 420, 1.6); b.lfo(lp.frequency, 0.06, 120);
      [D / 2, D * 0.75, D].forEach((f, i) => b.osc(f, i ? 'sawtooth' : 'sine', i ? 0.018 : 0.06, lp, i * 5));
      const w = b.noise('bandpass', 600, 0.5, 0.05); b.lfo(w.fl.frequency, 0.05, 300);
      return b;
    },
    atlas(g) {
      const b = bed(g, 0.42);
      const lp = b.filter('lowpass', 480, 1.2);
      [[A1, 'triangle', 0.09], [A1 * 1.5, 'sine', 0.04], [A1 * 2, 'triangle', 0.03]].forEach(([f, t, v]) => b.osc(f, t, v, lp));
      b.noise('lowpass', 320, 0.5, 0.06);
      b.every(8, 13, () => { const pan = rnd(-0.6, 0.6); T({ f: 1396.9, dur: 2.6, gain: 0.02, a: 0.004, pan, rev: 0.85, dly: 0.35 }, g); });
      b.every(11, 20, () => { const pan = rnd(-0.7, 0.7); SA.clicks(14, 0.5, { gain: 0.012, pan }, g); T({ at: 0.52, f: 1046.5, dur: 0.07, gain: 0.012, type: 'square', lp: 2000, pan, rev: 0.3 }, g); });
      return b;
    }
  };

  /* ---------------------------------------------------------------- zone manager */
  const Z = { name: null, g: null, bed: null };
  const streamShell = document.getElementById('stream-shell'), atlasShell = document.getElementById('atlas-shell');
  function zoneNow() {
    if (document.querySelector('.ixl:not(.ixl-out)') || document.querySelector('.ax-boot:not(.ax-leave)')) return 'loader';
    if (streamShell && !streamShell.hidden) return 'stream';
    if (atlasShell && !atlasShell.hidden) return 'atlas';
    return 'hub';
  }
  function setZone(force) {
    const z = zoneNow(); if (z === Z.name && !force) return;
    const prev = Z.name; Z.name = z;
    if (Z.bed) { Z.bed.stop(1.4); const g = Z.g; setTimeout(() => g.kill(0.5), 2500); Z.bed = null; Z.g = null; }
    if (!live()) return;
    if (z === 'hub' && (prev === 'stream' || prev === 'atlas')) SA.ui('home');
    if (ZONES[z]) { Z.g = SA.group(); Z.bed = ZONES[z](Z.g); }
    if (z !== 'stream') Scene.stop();
  }
  const zoneObs = new MutationObserver(() => setZone());
  [streamShell, atlasShell].forEach(el => el && zoneObs.observe(el, { attributes: true, attributeFilter: ['hidden'], childList: true }));
  zoneObs.observe(document.body, { childList: true });
  document.addEventListener('animationstart', e => { if (e.target.classList && (e.target.classList.contains('ax-leave'))) setZone(); }, true);
  setInterval(() => { if (SA.ctx) setZone(); }, 1500); // safety net for class-only changes (loader ending)

  /* first tap anywhere unlocks audio (browsers forbid sound before a gesture) */
  const unlockOnce = () => { SA.unlock(); setTimeout(() => setZone(true), 30); };
  document.addEventListener('pointerdown', unlockOnce, { capture: true, once: true });
  document.addEventListener('keydown', unlockOnce, { capture: true, once: true });
  document.addEventListener('visibilitychange', () => { if (!SA.ctx) return; if (document.hidden) SA.ctx.suspend(); else SA.ctx.resume(); });
  window.addEventListener('signal-audio-change', e => { if (e.detail.on) { SA.unlock(); setZone(true); if (streamShell && !streamShell.hidden) Scene.restart(); } else { Scene.stop(); if (Z.bed) { Z.bed.stop(0.3); Z.bed = null; } Z.name = null; } });

  /* ---------------------------------------------------------------- UI cue library */
  let uiG = null;
  SA.ui = function (name, o = {}) {
    if (!live()) return;
    const pan = o.pan || 0;
    switch (name) {
      // hub
      case 'hoverScan': T({ f: 1760, to: 2637, dur: 0.35, gain: 0.012, a: 0.02, pan, rev: 0.6 }); T({ f: 880, dur: 0.4, gain: 0.008, type: 'triangle', a: 0.03, pan, rev: 0.6 }); break;
      case 'hoverAtlas': T({ f: 1396.9, dur: 0.5, gain: 0.012, a: 0.005, pan, rev: 0.7, dly: 0.2 }); break;
      case 'home': [D * 4, D * 5.04, D * 6, D * 8].forEach((f, i) => SA.bell(f, { at: 0.25 + i * 0.07, dur: 2.2, gain: 0.014, pan: (i - 1.5) * 0.3, rev: 0.85 }, SA.ui.g())); N({ f: 4000, to: 300, q: 0.8, dur: 0.7, gain: 0.05, a: 0.01, rev: 0.4 }); break;
      // intel stream
      case 'swipe': { const up = (o.dir || 1) > 0; N({ f: up ? 300 : 5000, to: up ? 6000 : 400, q: 1.1, dur: 0.5, gain: 0.07, a: 0.03, rev: 0.35 }); T({ f: up ? 90 : 300, to: up ? 320 : 90, dur: 0.45, gain: 0.02, type: 'sawtooth', lp: 900, a: 0.05, rev: 0.3 }); T({ at: 0.45, f: 60, to: 40, dur: 0.35, gain: 0.1, a: 0.003 }); SA.bell(up ? D * 16 : D * 12, { at: 0.48, dur: 1.4, gain: 0.008, rev: 0.8 }, SA.ui.g()); break; }
      case 'decode': T({ f: rnd(2200, 3600), dur: 0.02, gain: 0.004, type: 'square', lp: 6000, a: 0.001, pan: rnd(-0.3, 0.3) }); break;
      case 'sotd': SA.bell(D * 8, { dur: 3, gain: 0.03, rev: 0.85, dly: 0.25 }, SA.ui.g()); [D * 12, D * 16 * 1.26, D * 16 * 1.5, D * 32].forEach((f, i) => SA.bell(f, { at: 0.12 + i * 0.08, dur: 2.6, gain: 0.016, pan: (i - 1.5) * 0.4, rev: 0.85, dly: 0.25 }, SA.ui.g())); N({ f: 7000, to: 12000, ft: 'highpass', dur: 1.6, gain: 0.03, a: 0.3, rev: 0.9 }); break;
      case 'end': [D * 4, D * 6, D * 7.55, D * 9].forEach((f, i) => T({ at: i * 0.05, f, dur: 3.2, gain: 0.014, type: 'triangle', a: 0.6, rev: 0.8, pan: (i - 1.5) * 0.3 })); break;
      case 'save': T({ f: 1318.5, dur: 0.16, gain: 0.04, pan, rev: 0.4 }); T({ at: 0.08, f: 1975.5, dur: 0.4, gain: 0.04, pan, rev: 0.5, dly: 0.2 }); T({ at: 0.08, f: 120, to: 70, dur: 0.15, gain: 0.08, a: 0.002, pan }); break;
      case 'unsave': T({ f: 1975.5, dur: 0.12, gain: 0.03, pan, rev: 0.3 }); T({ at: 0.07, f: 1174.7, dur: 0.3, gain: 0.03, pan, rev: 0.3 }); break;
      case 'share': N({ f: 600, to: 8000, q: 1.5, dur: 0.45, gain: 0.05, a: 0.02, pan, rev: 0.4 }); T({ at: 0.3, f: 2349.3, dur: 0.4, gain: 0.025, pan, rev: 0.6, dly: 0.3 }); break;
      case 'open': T({ f: 880, to: 1760, dur: 0.18, gain: 0.03, a: 0.005, pan, rev: 0.4 }); T({ at: 0.06, f: 2637, dur: 0.3, gain: 0.015, pan, rev: 0.5 }); break;
      case 'tap': T({ f: 1567.98, dur: 0.06, gain: 0.025, type: 'triangle', a: 0.002, pan, rev: 0.25 }); break;
      case 'shuffle': for (let i = 0; i < 14; i++) N({ at: i * 0.028, f: rnd(2500, 6000), q: 3, dur: 0.035, gain: 0.03, a: 0.001, pan: rnd(-0.6, 0.6) }); T({ at: 0.42, f: D * 12, dur: 0.5, gain: 0.025, rev: 0.6 }); break;
      case 'latest': [D * 24, D * 20, D * 16].forEach((f, i) => T({ at: i * 0.07, f, dur: 0.3, gain: 0.025, pan, rev: 0.5 })); break;
      case 'sheetOpen': N({ f: 400, to: 3500, q: 0.9, dur: 0.32, gain: 0.05, a: 0.02, pan: 0.6, rev: 0.3 }); T({ at: 0.25, f: 1318.5, dur: 0.25, gain: 0.02, pan: 0.6, rev: 0.5 }); break;
      case 'sheetClose': N({ f: 3500, to: 400, q: 0.9, dur: 0.28, gain: 0.045, a: 0.02, pan: 0.6, rev: 0.3 }); break;
      case 'toAtlas': N({ f: 5000, to: 300, q: 1, dur: 0.6, gain: 0.06, a: 0.02, rev: 0.4 }); T({ at: 0.35, f: 1396.9, dur: 2, gain: 0.04, a: 0.004, rev: 0.85, dly: 0.35 }); break;
      case 'rank': T({ f: 196, dur: 1.6, gain: 0.05, type: 'sawtooth', lp: 600, lpTo: 2600, a: 0.25, rev: 0.6 }); T({ f: 293.66, dur: 1.6, gain: 0.04, type: 'sawtooth', lp: 600, lpTo: 2600, a: 0.25, rev: 0.6 }); T({ f: 392, dur: 1.6, gain: 0.035, type: 'sawtooth', lp: 600, lpTo: 2600, a: 0.25, rev: 0.6 }); SA.impact({ at: 0.24, gain: 0.3 }, SA.ui.g()); [784, 987.8, 1174.7, 1568, 1975.5].forEach((f, i) => SA.bell(f, { at: 0.3 + i * 0.08, dur: 2, gain: 0.02, pan: (i - 2) * 0.35, rev: 0.8, dly: 0.25 }, SA.ui.g())); break;
      case 'info': T({ f: 1174.7, dur: 0.2, gain: 0.02, pan, rev: 0.5 }); T({ at: 0.09, f: 1567.98, dur: 0.3, gain: 0.02, pan, rev: 0.5 }); break;
      case 'close': N({ f: 3000, to: 150, ft: 'lowpass', dur: 0.6, gain: 0.08, a: 0.01, rev: 0.4 }); T({ f: 660, to: 110, dur: 0.55, gain: 0.03, type: 'triangle', a: 0.01, rev: 0.4 }); break;
      case 'toggleOn': T({ f: 1046.5, dur: 0.09, gain: 0.03, pan, rev: 0.3 }); T({ at: 0.07, f: 1567.98, dur: 0.2, gain: 0.03, pan, rev: 0.4 }); break;
      // atlas
      case 'atlasHover': T({ f: o.f || 1760, dur: 0.05, gain: 0.008, type: 'triangle', a: 0.002, pan, rev: 0.2 }); break;
      case 'atlasTap': T({ f: 1396.9, dur: 0.7, gain: 0.018, a: 0.003, pan, rev: 0.6, dly: 0.2 }); break;
      case 'atlasSelect': T({ f: 140, to: 260, dur: 0.32, gain: 0.04, type: 'sawtooth', lp: 500, q: 4, a: 0.03, pan, rev: 0.2 }); T({ at: 0.32, f: 1567.98, dur: 0.08, gain: 0.035, type: 'square', lp: 3000, a: 0.002, pan, rev: 0.3 }); T({ at: 0.42, f: 2093, dur: 0.25, gain: 0.03, type: 'square', lp: 3000, a: 0.002, pan, rev: 0.4, dly: 0.2 }); SA.clicks(10, 0.35, { at: 0.5, gain: 0.015, pan: 0.5 }, SA.ui.g()); break;
      case 'dossierOpen': N({ f: 300, to: 2400, q: 0.8, dur: 0.38, gain: 0.06, a: 0.02, rev: 0.3 }); T({ f: 90, to: 60, dur: 0.3, gain: 0.06, a: 0.004 }); (o.fields || []).forEach(ms => N({ at: ms / 1000 + 0.1, f: 1900, to: 1100, q: 3, dur: 0.3, gain: 0.018, a: 0.01, pan: 0.4 })); if (o.stamp) { SA.impact({ at: 0.7, gain: 0.16 }, SA.ui.g()); N({ at: 0.7, f: 2200, q: 0.8, dur: 0.25, gain: 0.06, a: 0.002, rev: 0.4 }); } break;
      case 'dossierClose': N({ f: 2400, to: 300, q: 0.8, dur: 0.3, gain: 0.05, a: 0.02, rev: 0.3 }); break;
      case 'layerOn': T({ f: 2400, dur: 0.012, gain: 0.05, type: 'square', a: 0.001, pan }); T({ at: 0.02, f: 659.25, dur: 0.12, gain: 0.025, pan, rev: 0.4 }); T({ at: 0.1, f: 987.77, dur: 0.6, gain: 0.025, pan, rev: 0.6, dly: 0.2 }); N({ at: 0.05, f: 300, to: 2000, q: 0.7, dur: 0.9, gain: 0.03, a: 0.3, rev: 0.6 }); break;
      case 'layerOff': T({ f: 2000, dur: 0.012, gain: 0.04, type: 'square', a: 0.001, pan }); T({ at: 0.02, f: 987.77, dur: 0.1, gain: 0.02, pan, rev: 0.3 }); T({ at: 0.09, f: 659.25, dur: 0.3, gain: 0.02, pan, rev: 0.3 }); break;
      case 'zoomIn': T({ f: 120, to: 300, dur: 0.32, gain: 0.04, type: 'sawtooth', lp: 700, q: 3, a: 0.02, pan }); N({ f: 500, to: 3000, q: 1, dur: 0.32, gain: 0.03, a: 0.02 }); break;
      case 'zoomOut': T({ f: 300, to: 120, dur: 0.32, gain: 0.04, type: 'sawtooth', lp: 700, q: 3, a: 0.02, pan }); N({ f: 3000, to: 500, q: 1, dur: 0.32, gain: 0.03, a: 0.02 }); break;
      case 'wide': N({ f: 4000, to: 250, q: 0.8, dur: 0.5, gain: 0.05, a: 0.02, rev: 0.4 }); T({ at: 0.3, f: 1396.9, dur: 1.4, gain: 0.02, rev: 0.8, dly: 0.3 }); break;
      case 'select': T({ f: 2200, dur: 0.015, gain: 0.04, type: 'square', a: 0.001, pan }); T({ at: 0.02, f: 880, dur: 0.1, gain: 0.02, pan, rev: 0.3 }); break;
    }
  };
  SA.ui.g = () => { if (!uiG || uiG.dead) uiG = SA.group(); return uiG; };

  /* ---------------------------------------------------------------- HOLO-SCENE LAYERS (synced to CSS animation loops) */
  const ev = (sel, anim, at, play) => ({ sel, anim, at, play });
  const SCENES = {
    facility: {
      bed(b) { b.noise('lowpass', 130, 0.7, 0.3); b.osc(A1, 'sine', 0.04); b.osc(110, 'sine', 0.012); },
      events: [
        ev('.fx-scan', 'fxScan', [0.1], (g, p, at) => { T({ at, f: 1200, to: 300, dur: 3, gain: 0.012, a: 0.2, pan: p, rev: 0.6 }, g); N({ at, f: 3000, to: 400, q: 6, dur: 3, gain: 0.02, a: 0.2, pan: p, rev: 0.4 }, g); }),
        ev('.fx-level.l4', 'fxVault', [0.5], (g, p, at) => T({ at, f: 82, to: 76, dur: 0.9, gain: 0.07, type: 'triangle', lp: 300, a: 0.15, pan: p, rev: 0.5 }, g)),
        ev('.fx-callout', 'fxCall', [0.04], (g, p, at) => { T({ at, f: 1760, dur: 0.06, gain: 0.02, type: 'square', lp: 3000, a: 0.002, pan: p, rev: 0.3 }, g); SA.clicks(6, 0.2, { at: at + 0.05, gain: 0.012, pan: p }, g); })
      ]
    },
    sensor: {
      bed(b) { b.noise('highpass', 6500, 0.7, 0.035); const w = b.osc(3150, 'sine', 0.003); b.lfo(w.o.frequency, 0.3, 30); b.osc(D, 'sawtooth', 0.01, b.filter('lowpass', 300)); },
      events: [
        ev('.sx-reticle', 'sxLock', [0.28], (g, p, at) => { [0, 0.09].forEach(d => T({ at: at + d, f: 1760, dur: 0.05, gain: 0.02, type: 'square', lp: 4000, a: 0.002, pan: p, rev: 0.2 }, g)); }),
        ev('.sx-path', 'sxPath', [0.62], (g, p, at) => { T({ at, f: 600, to: 2400, dur: 0.2, gain: 0.02, a: 0.01, pan: p, rev: 0.4 }, g); N({ at, f: 800, to: 5000, q: 2, dur: 0.22, gain: 0.03, a: 0.01, pan: p }, g); }),
        ev('.sx-path', 'sxPath', [0.22, 0.4, 0.82], (g, p, at) => T({ at, f: 140, to: 190, dur: 0.35, gain: 0.02, type: 'sawtooth', lp: 450, q: 3, a: 0.05, pan: p }, g))
      ]
    },
    bio: {
      bed(b) { b.osc(120, 'sine', 0.012); b.osc(180, 'sine', 0.006); const f = b.noise('lowpass', 420, 0.7, 0.08); b.lfo(f.fl.frequency, 0.2, 150); },
      events: [
        ev('.bx-bubble', 'bxRise', [0.02], (g, p, at) => { const f = rnd(320, 720); T({ at, f, to: f * 2.2, dur: 0.09, gain: 0.018, a: 0.004, pan: p, rev: 0.4 }, g); }),
        ev('.bx-capsule', 'ixBob', [0.5], (g, p, at) => { T({ at, f: 70, to: 48, dur: 0.16, gain: 0.08, a: 0.004 }, g); T({ at: at + 0.2, f: 64, to: 44, dur: 0.2, gain: 0.06, a: 0.004 }, g); })
      ]
    },
    craft: {
      bed(b) { const lp = b.filter('lowpass', 380, 2); b.osc(110, 'sawtooth', 0.02, lp); b.osc(110.7, 'sawtooth', 0.02, lp); b.lfo(lp.frequency, 4.5, 90); b.osc(1760, 'sine', 0.002); },
      events: [
        ev('.kx-scan', 'kxScan', [0.0, 0.5], (g, p, at) => { N({ at, f: 3000, q: 4, dur: 0.12, gain: 0.02, a: 0.003, pan: p }, g); T({ at, f: 2000, to: 1200, dur: 0.22, gain: 0.012, pan: p, rev: 0.5 }, g); }),
        ev('.kx-cone', 'fxBeam', [0.02], (g, p, at) => N({ at, f: 5000, q: 0.7, dur: 0.6, gain: 0.015, a: 0.2, rev: 0.5 }, g))
      ]
    },
    sighting: {
      bed(b) { const w = b.noise('bandpass', 380, 0.4, 0.12); b.lfo(w.fl.frequency, 0.08, 160); b.osc(45, 'sine', 0.03);
        b.every(0.8, 1.6, () => { const pan = rnd(-0.9, 0.9), f = rnd(4300, 4900); for (let i = 0; i < 3; i++) T({ at: i * 0.045, f, dur: 0.03, gain: 0.004, a: 0.002, pan, rev: 0.3 }, b.g); }); },
      events: [
        ev('.gx-craft', 'gxFly', [0.18, 0.4, 0.62, 0.84], (g, p, at) => { T({ at, f: 500, to: 1500, dur: 0.45, gain: 0.022, a: 0.02, pan: p, rev: 0.7, dly: 0.25 }, g); T({ at, f: 503, to: 1520, dur: 0.45, gain: 0.015, a: 0.02, pan: p, rev: 0.7 }, g); }),
        ev('.gx-trail', 'gxBeam', [0.26], (g, p, at) => { T({ at, f: 220, to: 330, dur: 1.1, gain: 0.03, type: 'triangle', a: 0.35, pan: p, rev: 0.8 }, g); N({ at, f: 6000, ft: 'highpass', dur: 1, gain: 0.02, a: 0.3, pan: p, rev: 0.8 }, g); })
      ]
    },
    cosmos: {
      bed(b) { b.noise('bandpass', 2500, 0.8, 0.03); b.osc(710, 'sine', 0.004); b.osc(712.5, 'sine', 0.004); b.osc(D / 2, 'sine', 0.04);
        b.every(0.4, 1.2, () => N({ f: rnd(2000, 7000), q: 5, dur: 0.02, gain: 0.01, a: 0.001, pan: rnd(-0.5, 0.5) }, b.g)); },
      events: [ev('.cx-pulses i', 'cxPulse', [0.0], (g, p, at, i) => T({ at, f: [1318.5, 1567.98, 1760][i % 3], dur: 0.8, gain: 0.018, a: 0.004, pan: p, rev: 0.7, dly: 0.3 }, g))]
    },
    hearing: {
      bed(b) { const m = b.noise('bandpass', 520, 0.8, 0.05); b.lfo(m.v.gain, 2.7, 0.025);
        const c = SA.ctx, f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), v = c.createGain(); f1.type = f2.type = 'bandpass'; f1.Q.value = 5; f2.Q.value = 6; v.gain.value = 0;
        const src = b.osc(112, 'sawtooth', 0.6, f1); src.v.connect(f2); f1.connect(v); f2.connect(v); v.connect(b.out);
        b.every(0.09, 0.2, () => { const t = c.currentTime; f1.frequency.setTargetAtTime(rnd(450, 900), t, 0.03); f2.frequency.setTargetAtTime(rnd(1100, 2300), t, 0.03); v.gain.setTargetAtTime(Math.random() < 0.18 ? 0 : rnd(0.004, 0.012), t, 0.04); }); },
      events: [ev('.hx-lines i', 'hxType', [0.0], (g, p, at) => { for (let k = 0; k < 18; k++) N({ at: at + k * (2.4 / 18), f: rnd(2800, 4200), q: 5, dur: 0.02, gain: 0.014, a: 0.001, pan: 0.2 }, g); })]
    },
    files: {
      bed(b) { b.noise('lowpass', 300, 0.6, 0.05); b.osc(D, 'sine', 0.015); },
      events: [
        ev('.dx-page.p1', 'dxFan', [0.3, 0.7], (g, p, at) => { N({ at, f: 2500, q: 0.6, dur: 0.35, gain: 0.04, a: 0.03, pan: p, rev: 0.3 }, g); N({ at: at + 0.05, f: 6500, q: 1, dur: 0.22, gain: 0.02, a: 0.02, pan: p }, g); }),
        ev('.dx-page i.r', 'dxRedact', [0.15], (g, p, at) => N({ at, f: 1800, to: 1100, q: 3, dur: 0.22, gain: 0.018, a: 0.01, pan: p }, g)),
        ev('.dx-stamp', 'dxStamp', [0.47], (g, p, at) => { SA.impact({ at, gain: 0.16, pan: p }, g); N({ at, f: 1200, ft: 'lowpass', dur: 0.15, gain: 0.06, a: 0.002, pan: p }, g); }),
        ev('.dx-scan', 'dxScan', [0.0], (g, p, at) => T({ at, f: 90, to: 120, dur: 1.4, gain: 0.015, type: 'sawtooth', lp: 600, a: 0.3, pan: p }, g))
      ]
    },
    deep: {
      bed(b) { b.osc(41.2, 'sine', 0.05); b.osc(61.7, 'sine', 0.03); b.noise('bandpass', 1800, 0.6, 0.015); },
      events: [ev('.ox-rings i', 'oxRing', [0.0], (g, p, at) => T({ at, f: 2093, dur: 0.3, gain: 0.014, a: 0.002, pan: p, rev: 0.6, dly: 0.3 }, g))]
    }
  };
  const Scene = {
    slide: null, def: null, g: null, b: null, timer: 0, fired: new Set(),
    start(slide) {
      this.stop(); if (!slide || !live()) return;
      const sc = slide.querySelector('.ix-scene'); const key = sc && (sc.className.match(/sc-(\w+)/) || [])[1];
      const def = SCENES[key] || SCENES.deep; this.slide = slide; this.def = def; this.g = SA.group(); this.fired = new Set();
      this.b = bed(this.g, 0.55); this.b.g = this.g; try { def.bed(this.b); } catch (e) { console.warn(e); }
      this.timer = setInterval(() => this.tick(), 110); this.tick();
    },
    restart() { const s = this.slide || $('.ix-slide.is-visible', streamShell); this.slide = null; this.start(s); },
    stop() { clearInterval(this.timer); this.timer = 0; if (this.b) this.b.stop(0.8); const g = this.g; if (g) setTimeout(() => g.kill(0.4), 1500); this.b = null; this.g = null; this.slide = null; },
    tick() {
      if (!this.slide || !live() || !this.slide.classList.contains('is-visible')) return;
      this.def.events.forEach((e, ei) => {
        $$(e.sel, this.slide).forEach((el, idx) => {
          const an = el.getAnimations && el.getAnimations().find(a => a.animationName === e.anim); if (!an || an.playState !== 'running') return;
          const ct = an.effect.getComputedTiming(); if (ct.progress == null || !ct.duration) return;
          e.at.forEach(at => {
            const until = ((at - ct.progress + 1) % 1) * ct.duration;
            if (until > 140) return;
            const iter = ct.currentIteration + (at < ct.progress ? 1 : 0), key = `${ei}|${idx}|${iter}|${at}`;
            if (this.fired.has(key)) return; this.fired.add(key); if (this.fired.size > 400) this.fired = new Set([...this.fired].slice(-120));
            try { e.play(this.g, panEl(el), until / 1000, idx); } catch (err) { console.warn(err); }
          });
        });
      });
    }
  };

  /* ---------------------------------------------------------------- INTEL STREAM wiring */
  window.addEventListener('intel:slide', e => {
    const d = e.detail || {}; if (!live()) return;
    const slide = $$('.stream-slide', streamShell)[d.index];
    if (d.sotd && !d.initial) setTimeout(() => SA.ui('sotd'), 380); else if (d.sotd) setTimeout(() => SA.ui('sotd'), 200);
    if (d.end) SA.ui('end');
    Scene.start(slide);
  });
  if (streamShell) streamShell.addEventListener('click', e => {
    const t = e.target.closest('button,a'); if (!t) return; const pan = panEl(t);
    if (t.matches('[data-ix-save]')) SA.ui(t.getAttribute('aria-pressed') === 'true' ? 'unsave' : 'save', { pan });
    else if (t.matches('[data-ix-share]')) SA.ui('share', { pan });
    else if (t.matches('[data-ix-order]')) SA.ui(t.title.includes('latest') ? 'shuffle' : 'latest', { pan });
    else if (t.matches('[data-ix-saved]')) SA.ui('sheetOpen');
    else if (t.matches('[data-ix-sheet-close]')) SA.ui('sheetClose');
    else if (t.matches('[data-ix-unsave]')) SA.ui('unsave', { pan });
    else if (t.matches('[data-ix-atlas],[data-ix-atlas-open]')) SA.ui('toAtlas');
    else if (t.matches('[data-ix-go],[data-ix-top]')) SA.ui('tap', { pan });
    else if (t.matches('[data-ix-rank]')) SA.ui('info', { pan });
    else if (t.matches('#stream-close')) SA.ui('close');
    else if (t.matches('[data-ix-sound]')) setTimeout(() => SA.ui('toggleOn', { pan }), 80);
    else if (t.matches('#stream-prev,#stream-next,[data-ix-tilt]')) SA.ui('tap', { pan });
    else if (t.matches('a[href]')) SA.ui('open', { pan });
  }, true);

  /* ---------------------------------------------------------------- HUB wiring */
  const fine = matchMedia('(pointer: fine)').matches;
  const hoverOnce = (el, cue) => { if (!el || !fine) return; let last = 0; el.addEventListener('pointerenter', () => { const n = performance.now(); if (n - last > 600) { last = n; SA.ui(cue, { pan: panEl(el) }); } }); };
  hoverOnce(document.getElementById('refresh'), 'hoverScan');
  hoverOnce(document.getElementById('atlas-launch'), 'hoverAtlas');
  // global sound switch in the hub header
  const header = $('header .status');
  if (header) {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sb-toggle';
    const paint = () => { const on = SA.enabled; btn.innerHTML = on ? '<i></i><i></i><i></i><i></i> AUDIO ON' : '<i></i><i></i><i></i><i></i> AUDIO OFF'; btn.classList.toggle('off', !on); btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? 'Turn site audio off' : 'Turn site audio on'); };
    btn.addEventListener('click', () => { SA.unlock(); SA.enabled = !SA.enabled; if (SA.enabled) setTimeout(() => SA.ui('toggleOn'), 60); });
    window.addEventListener('signal-audio-change', paint); paint();
    const wrap = document.createElement('div'); wrap.className = 'sb-head'; header.parentNode.insertBefore(wrap, header); wrap.append(btn, header);
  }

  /* ---------------------------------------------------------------- ATLAS wiring */
  if (atlasShell) {
    const A = window.__atlas, svg = document.getElementById('atlas-map-svg');
    const exit = document.getElementById('atlas-exit');
    if (exit) { const b = SA.muteButton('sb-atlas-toggle'), w = document.createElement('div'); w.className = 'sb-atlas-actions'; exit.parentNode.insertBefore(w, exit); w.append(exit, b); exit.addEventListener('click', () => SA.ui('close')); }
    let lastActive = A && A.active, hoverLast = '';
    const detail = document.getElementById('atlas-detail');
    if (detail) new MutationObserver(() => {
      const now = A && A.active; if (!now || now === lastActive) return; lastActive = now;
      const pos = A.positions && A.positions[now]; SA.ui('atlasSelect', { pan: pos ? pos[0] / 975 * 1.8 - 0.9 : 0 });
    }).observe(detail, { childList: true, subtree: true });
    if (svg) {
      svg.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const c = e.target.closest('.atlas-city'); if (!c || c.dataset.id === hoverLast) return; hoverLast = c.dataset.id; const y = A.positions[c.dataset.id]?.[1] || 300; SA.ui('atlasHover', { pan: panX(e.clientX), f: 2400 - y * 1.6 }); });
      svg.addEventListener('pointerout', e => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.atlas-city')) hoverLast = ''; });
      svg.addEventListener('pointerdown', e => { if (!e.target.closest('.atlas-city')) SA.ui('atlasTap', { pan: panX(e.clientX) }); });
    }
    const dossierObs = new MutationObserver(() => {
      const d = $('.ax-dossier', atlasShell); if (!d) return;
      const open = !d.hidden; if (d._sbOpen === undefined && !open) { d._sbOpen = false; return; } if (open === d._sbOpen) return; d._sbOpen = open;
      if (open) { const calm = matchMedia('(prefers-reduced-motion: reduce)').matches; SA.ui('dossierOpen', { fields: calm ? [] : $$('.ax-field', d).slice(0, 8).map(f => parseFloat(f.style.getPropertyValue('--d')) || 0), stamp: !calm && !!$('.ax-stamp', d) }); }
      else SA.ui('dossierClose');
    });
    dossierObs.observe(atlasShell, { attributes: true, attributeFilter: ['hidden'], subtree: true });
    atlasShell.addEventListener('click', e => {
      const t = e.target.closest('button,a'); if (!t) return; const pan = panEl(t);
      if (t.matches('.ax-layers button[data-layer]')) setTimeout(() => SA.ui(t.getAttribute('aria-pressed') === 'true' ? 'layerOn' : 'layerOff', { pan }), 0);
      else if (t.id === 'zoom-in') SA.ui('zoomIn', { pan });
      else if (t.id === 'zoom-out') SA.ui('zoomOut', { pan });
      else if (t.id === 'us-view') SA.ui('wide');
      else if (t.matches('a[href]')) SA.ui('open', { pan });
    }, true);
    atlasShell.addEventListener('change', e => { if (e.target.matches('select')) SA.ui('select', { pan: panEl(e.target) }); }, true);
  }

  SA.zone = setZone; SA.scene = Scene;
})();
