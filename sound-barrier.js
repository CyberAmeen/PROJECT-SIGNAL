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


  /* ---------------------------------------------------------------- "OBSERVATION DECK" — the hub theme
     Original composition, D Lydian (the raised 4th, G#, is the "wonder" note), 84 BPM.
     Intro (pad + rising arpeggio) → Theme (signature 'Signal Motif' on an FM bell, bass, heartbeat kick)
     → Drift (motif echoes, starlight) → back to Theme. Scheduled sample-accurately with a look-ahead clock. */
  function hubTheme(g) {
    const c = SA.ctx, mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const BPM = 84, S16 = 60 / BPM / 4;
    const CHORDS = [ // pad voicing, arp notes, bass root
      { pad: [50, 57, 61, 64, 66], arp: [62, 66, 69, 73, 76], bass: 38 },   // Dmaj9
      { pad: [47, 54, 57, 61, 62], arp: [59, 62, 66, 69, 73], bass: 35 },   // Bm9
      { pad: [43, 50, 54, 59, 61], arp: [62, 66, 68, 71, 74], bass: 31 },   // Gmaj7#11 (G# = Lydian sparkle)
      { pad: [45, 52, 54, 59, 62], arp: [64, 66, 69, 71, 76], bass: 33 }    // A6sus
    ];
    const ARP = [0, 2, 4, 2, 1, 3, 4, 3, 0, 2, 4, 2, 1, 4, 3, 2];
    // Signal Motif: [midi, start16, len16] over two bars
    const MOTIF = {
      A: [[69, 0, 3], [76, 3, 3], [74, 6, 2], [80, 8, 8], [78, 16, 4], [76, 20, 4], [73, 24, 8]],
      B: [[71, 0, 3], [78, 3, 3], [76, 6, 2], [73, 8, 8], [74, 16, 2], [76, 18, 2], [81, 20, 12]],
      C: [[69, 0, 3], [76, 3, 3], [74, 6, 2], [80, 8, 6], [81, 14, 2], [85, 16, 8], [81, 24, 8]],
      D: [[83, 0, 3], [81, 3, 3], [78, 6, 2], [80, 8, 8], [76, 16, 4], [78, 20, 2], [74, 22, 10]]
    };
    const mix = { dry: g.dry.gain, rev: g.rev.gain, dly: g.dly.gain };
    const now0 = c.currentTime;
    Object.values(mix).forEach(p => { p.setValueAtTime(0.0001, now0); p.linearRampToValueAtTime(1, now0 + 2.5); });
    const arpCut = c.createBiquadFilter(); arpCut.type = 'lowpass'; arpCut.Q.value = 3; arpCut.frequency.value = 600;
    const arpBus = c.createGain(); arpBus.gain.value = 1; arpCut.connect(arpBus); SA.route(arpBus, { rev: 0.3, dly: 0.38 }, g);
    const voice = (t, end) => ({ t, end });
    const env = (gain, t, a, peak, d, sus, rel) => { gain.setValueAtTime(0.0001, t); gain.exponentialRampToValueAtTime(peak, t + a); gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + d); gain.exponentialRampToValueAtTime(0.0001, t + a + d + rel); return t + a + d + rel; };
    function pluck(t, m, gain, pan) {
      const f = mtof(m), v = c.createGain(), fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 6;
      fl.frequency.setValueAtTime(4200, t); fl.frequency.exponentialRampToValueAtTime(700, t + 0.22);
      [['sawtooth', -7], ['square', 6]].forEach(([type, dt]) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = dt; o.connect(fl); o.start(t); o.stop(t + 0.6); });
      fl.connect(v); const end = env(v.gain, t, 0.003, gain, 0.12, 0.25, 0.3);
      if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; v.connect(p); p.connect(arpCut); } else v.connect(arpCut);
      return end;
    }
    function lead(t, m, len, gain, pan) {
      const f = mtof(m), car = c.createOscillator(), mod = c.createOscillator(), mi = c.createGain(), v = c.createGain(), oct = c.createOscillator(), ov = c.createGain();
      car.frequency.value = f; mod.frequency.value = f * 3.5; mi.gain.setValueAtTime(f * 2.4, t); mi.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.9);
      mod.connect(mi); mi.connect(car.frequency); car.connect(v);
      oct.type = 'triangle'; oct.frequency.value = f; ov.gain.value = 0.35; oct.connect(ov); ov.connect(v);
      const hold = Math.max(0.2, len * S16);
      v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(gain, t + 0.008); v.gain.exponentialRampToValueAtTime(gain * 0.5, t + 0.3); v.gain.setValueAtTime(gain * 0.5, t + hold); v.gain.exponentialRampToValueAtTime(0.0001, t + hold + 1.4);
      SA.route(v, { pan, rev: 0.55, dly: 0.28 }, g);
      [car, mod, oct].forEach(o => { o.start(t); o.stop(t + hold + 1.5); });
    }
    function pad(t, notes, dur) {
      const v = c.createGain(), fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(700, t); fl.frequency.linearRampToValueAtTime(1500, t + dur * 0.6); fl.Q.value = 0.8;
      notes.forEach((m, i) => [-11, 11].forEach(dt => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = dt + (i - 2) * 1.5; o.connect(fl); o.start(t); o.stop(t + dur + 1.8); }));
      fl.connect(v); v.gain.setValueAtTime(0.0001, t); v.gain.linearRampToValueAtTime(0.0105, t + 0.9); v.gain.setValueAtTime(0.0105, t + dur); v.gain.linearRampToValueAtTime(0.0001, t + dur + 1.7);
      SA.route(v, { rev: 0.6 }, g);
    }
    function bass(t, m, len, gain) {
      const f = mtof(m), o = c.createOscillator(), o2 = c.createOscillator(), fl = c.createBiquadFilter(), v = c.createGain();
      o.type = 'sine'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 2; fl.type = 'lowpass'; fl.frequency.value = 420;
      const v2 = c.createGain(); v2.gain.value = 0.35; o2.connect(v2); v2.connect(fl); o.connect(fl); fl.connect(v);
      const d = len * S16; v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(gain, t + 0.02); v.gain.exponentialRampToValueAtTime(gain * 0.55, t + 0.18); v.gain.setValueAtTime(gain * 0.55, t + d); v.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25);
      SA.route(v, { rev: 0.08 }, g); [o, o2].forEach(x => { x.start(t); x.stop(t + d + 0.3); });
    }
    function kick(t, gain) {
      const o = c.createOscillator(), v = c.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.16);
      v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(gain, t + 0.004); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(v); SA.route(v, { rev: 0.05 }, g); o.start(t); o.stop(t + 0.45);
      // gentle "pump": duck the pad bus slightly
    }
    function tick(t, gain, pan) {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain(); s.buffer = SA.noiseBuf; f.type = 'highpass'; f.frequency.value = 7500;
      v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(gain, t + 0.002); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      s.connect(f); f.connect(v); SA.route(v, { pan, rev: 0.15 }, g); s.start(t, Math.random()); s.stop(t + 0.06);
    }
    function star(t) { const m = [81, 83, 85, 86, 88, 90, 93][Math.floor(Math.random() * 7)]; lead(t, m, 2, 0.014, rnd(-0.8, 0.8)); }
    function riser(t, d) {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain(); s.buffer = SA.noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(7000, t + d);
      v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.045, t + d * 0.96); v.gain.linearRampToValueAtTime(0.0001, t + d);
      s.connect(f); f.connect(v); SA.route(v, { rev: 0.5 }, g); s.start(t); s.stop(t + d + 0.05);
    }
    let step = 0, next = c.currentTime + 0.12, timer = 0, stopped = false;
    const PHRASES = ['A', 'B', 'C', 'D'];
    function play(st, t) {
      const bar = Math.floor(st / 16), s = st % 16, ch = CHORDS[bar % 4];
      const intro = bar < 4, cyc = intro ? -1 : (bar - 4) % 12, theme = cyc >= 0 && cyc < 8, drift = cyc >= 8;
      if (s === 0) {
        pad(t, ch.pad, 16 * S16);
        if (intro) arpCut.frequency.setTargetAtTime(700 + bar * 700, t, 1.2);
        if (cyc === 0) arpCut.frequency.setTargetAtTime(3600, t, 0.6);
        if (drift && cyc === 8) arpCut.frequency.setTargetAtTime(1500, t, 1.5);
        if (theme && cyc % 2 === 0) { const ph = MOTIF[PHRASES[(cyc / 2) % 4]]; ph.forEach(([m, at, len], k) => lead(t + at * S16, m, len, 0.05, (k % 2 ? 0.18 : -0.18))); }
        if (drift && cyc % 2 === 0) MOTIF.A.slice(0, 4).forEach(([m, at, len]) => lead(t + at * S16 * 1.5, m + 12, len, 0.016, rnd(-0.6, 0.6)));
        if (cyc === 11) riser(t, 16 * S16);
      }
      // arpeggio
      const arpGain = intro ? 0.02 + bar * 0.004 : drift ? 0.02 : 0.03;
      pluck(t, ch.arp[ARP[s]] + (s >= 8 && !intro && bar % 2 ? 12 : 0), arpGain, Math.sin(st * 0.9) * 0.5);
      // bass + heartbeat kick + ticks (theme and drift)
      if (!intro) {
        if (s === 0) bass(t, ch.bass, 5, theme ? 0.11 : 0.08);
        if (s === 6) bass(t, ch.bass, 2, theme ? 0.08 : 0.06);
        if (s === 8) bass(t, ch.bass + 12, 3, theme ? 0.07 : 0.05);
        if (s === 14) bass(t, ch.bass + 7, 2, theme ? 0.06 : 0.04);
        if (theme && (s === 0 || s === 8)) kick(t, 0.16);
        if (theme && s % 4 === 2) tick(t, 0.011, s === 2 ? -0.4 : 0.4);
        if (theme && s % 2 === 1) tick(t, 0.004, rnd(-0.6, 0.6));
      } else if (bar === 3 && s === 0) riser(t, 16 * S16);
      if (drift && s === 0 && Math.random() < 0.8) star(t + rnd(0.2, 2));
    }
    function pump() {
      if (stopped) return;
      const now = c.currentTime;
      if (document.hidden) { next = now + 0.1; return; }
      if (next < now - 0.05) next = now + 0.06;
      while (next < now + 0.3) { try { play(step, next); } catch (e) { console.warn(e); } step++; next += S16; }
    }
    timer = setInterval(pump, 40); pump();
    return {
      stop(fade = 1.4) { stopped = true; clearInterval(timer); const t = c.currentTime; Object.values(mix).forEach(p => { p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(0, t + fade); }); },
      get step() { return step; }
    };
  }

  const ZONES = {
    hub(g) { return hubTheme(g); },
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
    if (document.querySelector('.pg-gate:not(.pg-opening)') || document.querySelector('.ixl:not(.ixl-out)') || document.querySelector('.ax-boot:not(.ax-leave)')) return 'loader';
    if (streamShell && !streamShell.hidden) return 'stream';
    if (atlasShell && !atlasShell.hidden) return 'atlas';
    return 'hub';
  }
  function setZone(force) {
    const z = zoneNow(); if (z === Z.name && !force && (Z.bed || !ZONES[z] || !live())) return;
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
  /* iOS only lets audio start on touchend/click (not touchstart/pointerdown), and can leave the context
     'suspended' or 'interrupted' after a Home Screen launch or app switch. Retry on every gesture until it runs. */
  const kick = () => {
    if (SA.ctx && SA.ctx.state === 'running') { if (SA.enabled && !Z.bed && ZONES[zoneNow()]) setZone(true); return; }
    const fresh = !SA.ctx; SA.unlock();
    const c = SA.ctx; if (!c) return;
    const go = () => setZone(true);
    if (c.state === 'running') { if (fresh || !Z.bed) go(); }
    else { const p = c.resume && c.resume(); if (p && p.then) p.then(go, () => {}); }
  };
  ['pointerup', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, kick, { capture: true, passive: true }));
  document.addEventListener('pointerdown', () => { if (!SA.ctx) SA.unlock(); }, { capture: true, passive: true });
  setInterval(() => { const c = SA.ctx; if (c && !c._sbWatch) { c._sbWatch = true; c.addEventListener('statechange', () => { if (c.state === 'running' && SA.enabled && !Z.bed && ZONES[zoneNow()]) setZone(true); }); } }, 500);
  document.addEventListener('visibilitychange', () => { if (!SA.ctx) return; if (document.hidden) SA.ctx.suspend(); else { const p = SA.ctx.resume(); if (p && p.then) p.then(() => { if (!Z.bed) setZone(true); }, () => {}); } });
  window.addEventListener('signal-audio-change', e => { if (e.detail.on) { SA.unlock(); setZone(true); if (streamShell && !streamShell.hidden) Scene.restart(); } else { Scene.stop(); if (Z.bed) { Z.bed.stop(0.3); Z.bed = null; } Z.name = null; } });


  /* FM bell — the voice of the Signal Motif (shared by the Ignition logo and the hub theme) */
  function fmBell(at, m, holdS, gain, pan, g, rev = 0.6) {
    const c = SA.ctx; if (!c || (g && g.dead)) return; const t = c.currentTime + at, f = 440 * Math.pow(2, (m - 69) / 12);
    const car = c.createOscillator(), mod = c.createOscillator(), mi = c.createGain(), v = c.createGain(), oct = c.createOscillator(), ov = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * 3.5; mi.gain.setValueAtTime(f * 2.4, t); mi.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.9);
    mod.connect(mi); mi.connect(car.frequency); car.connect(v); oct.type = 'triangle'; oct.frequency.value = f; ov.gain.value = 0.35; oct.connect(ov); ov.connect(v);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(gain, t + 0.008); v.gain.exponentialRampToValueAtTime(gain * 0.5, t + 0.3); v.gain.setValueAtTime(gain * 0.5, t + holdS); v.gain.exponentialRampToValueAtTime(0.0001, t + holdS + 1.6);
    SA.route(v, { pan, rev, dly: 0.28 }, g); [car, mod, oct].forEach(o => { o.start(t); o.stop(t + holdS + 1.7); });
  }
  /* ---------------------------------------------------------------- UI cue library */
  let uiG = null;
  SA.ui = function (name, o = {}) {
    if (!live()) return;
    const pan = o.pan || 0;
    switch (name) {
      // hub
      case 'ignite': { // Power-On Gate: click → charge → ignition → Signal Motif startup chime
        const g = SA.ui.g(), mt = m => 440 * Math.pow(2, (m - 69) / 12);
        T({ f: 2600, dur: 0.012, gain: 0.07, type: 'square', a: 0.001 }); T({ f: 150, to: 60, dur: 0.26, gain: 0.14, a: 0.002 }); N({ f: 1200, ft: 'lowpass', dur: 0.12, gain: 0.08, a: 0.002 });
        T({ at: 0.02, f: 55, to: 220, glide: 1.2, dur: 1.26, gain: 0.07, type: 'sawtooth', lp: 260, lpTo: 3200, a: 1.05, rev: 0.3 });
        T({ at: 0.02, f: 440, to: 1760, glide: 1.2, dur: 1.24, gain: 0.012, a: 1.0, rev: 0.3 });
        N({ at: 0.02, f: 300, to: 6500, q: 1.1, dur: 1.23, gain: 0.07, swell: true, rev: 0.5 });
        [62, 64, 66, 68, 69, 71, 73, 74, 76, 78, 80, 81, 83, 85].forEach((m, k, arr) => { const at = 0.05 + 1.15 * (1 - Math.pow(1 - k / arr.length, 1.7)); T({ at, f: mt(m), dur: 0.16, gain: 0.016 + k * 0.0012, type: 'triangle', a: 0.003, pan: k % 2 ? 0.35 : -0.35, rev: 0.4, dly: 0.15 }); });
        SA.impact({ at: 1.25, gain: 0.5 }, g);
        N({ at: 1.25, f: 9000, to: 220, ft: 'lowpass', dur: 2.4, gain: 0.14, a: 0.004, rev: 0.85 });
        [62, 69, 73, 76, 78].forEach((m, i) => SA.bell(mt(m), { at: 1.26 + i * 0.02, dur: 3.4, gain: 0.02, pan: (i - 2) * 0.3, rev: 0.9 }, g));
        [[69, 0], [76, 1], [74, 2], [80, 3]].forEach(([m, k]) => { fmBell(1.34 + k * 0.178, m, k === 3 ? 1.6 : 0.16, 0.075, (k - 1.5) * 0.2, g, 0.65); fmBell(1.34 + k * 0.178, m + 12, k === 3 ? 1.2 : 0.1, 0.018, (k - 1.5) * -0.2, g, 0.8); });
        break; }
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
      const def = SCENES[key] || (window.PSSceneSounds || {})[key] || SCENES.deep; this.slide = slide; this.def = def; this.g = SA.group(); this.fired = new Set();
      this.b = bed(this.g, 0.55); this.b.g = this.g; try { def.bed(this.b); } catch (e) { console.warn(e); }
      this.timer = setInterval(() => this.tick(), 110); this.tick();
    },
    restart() { const s = this.slide || $('.ix-slide.is-visible', streamShell); this.slide = null; this.start(s); },
    stop() { clearInterval(this.timer); this.timer = 0; if (this.b) this.b.stop(0.8); const g = this.g; if (g) setTimeout(() => g.kill(0.4), 1500); this.b = null; this.g = null; this.slide = null; },
    tick() {
      if (!this.slide || !live() || window.__psGliding || !this.slide.classList.contains('is-visible')) return; // SILK: never query animations mid-swipe
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

  SA.zone = setZone; SA.scene = Scene; SA._z = Z;
})();
