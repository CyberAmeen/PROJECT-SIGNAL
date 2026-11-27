/* PROJECT SIGNAL — loader soundtracks, synthesized live with Web Audio (no audio files).
   Every cue is fired by the animation it belongs to, so sound and picture stay locked together.
   Intel "Signal Lock": deep-space blue — pads, tuning static, hydrogen-line whistle, lock chord, hyperspace.
   Atlas boot: green radar ops room — circuit zaps, teletype, sonar, satellite telemetry, marker cascade.
   On by default for the two loaders (always started by a tap); a mute button on each loader remembers the choice. */
(() => {
  'use strict';
  const KEY = 'ps-sound', OLD = 'ps-loader-sound';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SA = {
    ctx: null, level: 0.85,
    get enabled() { try { let v = localStorage.getItem(KEY); if (v == null) v = localStorage.getItem(OLD); return v == null ? true : v === '1'; } catch { return true; } },
    set enabled(v) {
      try { localStorage.setItem(KEY, v ? '1' : '0'); } catch {}
      if (this.master) this.master.gain.setTargetAtTime(v ? this.level : 0, this.ctx.currentTime, 0.06);
      try { window.dispatchEvent(new CustomEvent('signal-audio-change', { detail: { on: !!v } })); } catch {}
    },
    /* Must run inside a tap/click so iOS lets audio start. */
    unlock() {
      try {
        if (!this.ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; this.ctx = new A({ latencyHint: 'interactive' }); this.build(); }
        if (this.ctx.state !== 'running') this.ctx.resume();
        const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0);
      } catch { return null; }
      return this.ctx;
    },
    live() { return !!(this.ctx && this.enabled); },
    build() {
      const c = this.ctx;
      this.master = c.createGain(); this.master.gain.value = this.enabled ? this.level : 0;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.28;
      this.bus = c.createGain(); this.bus.connect(comp); comp.connect(this.master); this.master.connect(c.destination);
      // hall reverb (generated impulse response)
      this.rev = c.createConvolver(); this.rev.buffer = this.impulse(4.2, 2.4);
      this.revIn = c.createGain(); this.revIn.connect(this.rev); const rg = c.createGain(); rg.gain.value = 0.6; this.rev.connect(rg); rg.connect(comp);
      // stereo ping-pong echo
      const dl = c.createDelay(1.5), dr = c.createDelay(1.5), fb = c.createGain(), lp = c.createBiquadFilter(), mg = c.createChannelMerger(2), dg = c.createGain();
      dl.delayTime.value = 0.28; dr.delayTime.value = 0.42; fb.gain.value = 0.36; lp.type = 'lowpass'; lp.frequency.value = 3400; dg.gain.value = 0.5;
      this.dlyIn = c.createGain(); this.dlyIn.connect(dl); dl.connect(lp); lp.connect(dr); dr.connect(fb); fb.connect(dl);
      dl.connect(mg, 0, 0); dr.connect(mg, 0, 1); mg.connect(dg); dg.connect(comp); dg.connect(this.revIn);
      // shared noise source material
      const len = c.sampleRate * 2; this.noiseBuf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = this.noiseBuf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
    },
    impulse(sec, decay) {
      const c = this.ctx, len = Math.floor(c.sampleRate * sec), buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch); let lp = 0;
        for (let i = 0; i < len; i++) { const x = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); lp += (x - lp) * (0.35 + 0.6 * (1 - i / len)); d[i] = lp; }
        for (let k = 0; k < 6; k++) { const at = Math.floor(c.sampleRate * (0.011 + k * 0.017 + ch * 0.004)); if (at < len) d[at] += 0.5 / (k + 1); }
      }
      return buf;
    },
    /* a group = a sub-mix that can be silenced at once (skip / close) */
    group() {
      const c = this.ctx, g = { dry: c.createGain(), rev: c.createGain(), dly: c.createGain(), dead: false };
      g.dry.connect(this.bus); g.rev.connect(this.revIn); g.dly.connect(this.dlyIn);
      g.kill = (fade = 0.12) => { if (g.dead) return; g.dead = true; const t = c.currentTime; [g.dry, g.rev, g.dly].forEach(n => { n.gain.cancelScheduledValues(t); n.gain.setValueAtTime(n.gain.value, t); n.gain.linearRampToValueAtTime(0, t + fade); }); setTimeout(() => { try { g.dry.disconnect(); g.rev.disconnect(); g.dly.disconnect(); } catch {} }, (fade + 6) * 1000); };
      return g;
    },
    route(node, o, g) {
      const c = this.ctx; let n = node;
      if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(o.pan || 0, -1, 1); n.connect(p); n = p; }
      n.connect(g ? g.dry : this.bus);
      if (o.rev) { const s = c.createGain(); s.gain.value = o.rev; n.connect(s); s.connect(g ? g.rev : this.revIn); }
      if (o.dly) { const s = c.createGain(); s.gain.value = o.dly; n.connect(s); s.connect(g ? g.dly : this.dlyIn); }
    },
    tone(o, g) {
      const c = this.ctx; if (!c || (g && g.dead)) return;
      const t = c.currentTime + (o.at || 0), dur = o.dur || 0.3;
      const osc = c.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || dur)); if (o.detune) osc.detune.value = o.detune;
      const env = c.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(o.gain || 0.1, t + (o.a || 0.005));
      if (o.hold) env.gain.setValueAtTime(o.gain || 0.1, t + o.hold); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let head = osc;
      if (o.lp) { const f = c.createBiquadFilter(); f.type = o.ft || 'lowpass'; f.frequency.setValueAtTime(o.lp, t); if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur); f.Q.value = o.q || 0.7; osc.connect(f); head = f; }
      head.connect(env); this.route(env, o, g); osc.start(t); osc.stop(t + dur + 0.05);
    },
    noise(o, g) {
      const c = this.ctx; if (!c || (g && g.dead)) return;
      const t = c.currentTime + (o.at || 0), dur = o.dur || 0.3;
      const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.Q.value = o.q || 1; f.frequency.setValueAtTime(o.f || 1000, t); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
      const env = c.createGain(); env.gain.setValueAtTime(0.0001, t);
      if (o.swell) { env.gain.exponentialRampToValueAtTime(o.gain || 0.1, t + dur * 0.97); env.gain.linearRampToValueAtTime(0.0001, t + dur); }
      else { env.gain.exponentialRampToValueAtTime(o.gain || 0.1, t + (o.a || 0.005)); env.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
      src.connect(f); f.connect(env); this.route(env, o, g); src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
    },
    impact(o, g) {
      const at = o.at || 0, k = o.gain || 0.5, pan = o.pan || 0;
      this.tone({ f: 150, to: 38, glide: 0.45, dur: 1.1, gain: k, a: 0.003, pan, rev: 0.25 }, g);
      this.tone({ f: 300, to: 80, glide: 0.25, dur: 0.5, gain: k * 0.45, type: 'triangle', a: 0.002, pan, rev: 0.3 }, g);
      this.noise({ f: 1400, to: 160, ft: 'lowpass', dur: 0.55, gain: k * 0.5, a: 0.002, pan, rev: 0.45, at }, g);
      this.tone({ f: 2400, dur: 0.02, gain: k * 0.25, type: 'square', a: 0.001, pan, at }, g);
    },
    bell(f, o, g) {
      const parts = [[1, 1, 1], [2.01, 0.45, 0.7], [2.76, 0.32, 0.5], [4.07, 0.2, 0.36], [5.4, 0.12, 0.26]];
      parts.forEach(([m, a, d]) => this.tone({ f: f * m, dur: (o.dur || 2.5) * d, gain: (o.gain || 0.05) * a, a: 0.003, at: o.at, pan: o.pan, rev: o.rev == null ? 0.6 : o.rev, dly: o.dly }, g));
    },
    clicks(n, span, o, g) {
      for (let i = 0; i < n; i++) this.noise({ at: (o.at || 0) + (i / n) * span + Math.random() * 0.012, f: 3200 + Math.random() * 3200, q: 6, dur: 0.018, gain: (o.gain || 0.035) * (0.6 + Math.random() * 0.5), a: 0.001, pan: (o.pan || 0) + (Math.random() - 0.5) * 0.15, rev: 0.08 }, g);
    },
    loopNoise(g, type, f, q, gain) {
      const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), v = c.createGain();
      s.buffer = this.noiseBuf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; v.gain.value = gain;
      s.connect(fl); fl.connect(v); s.start(); return { s, fl, v };
    },
    ramp(param, val, tc = 0.08) { if (this.ctx) param.setTargetAtTime(val, this.ctx.currentTime, tc); },
    muteButton(className) {
      const b = document.createElement('button'); b.type = 'button'; b.className = className;
      const paint = () => { const on = this.enabled; b.textContent = on ? '🔊 SOUND' : '🔈 MUTED'; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Mute loader sound' : 'Turn loader sound on'); };
      b.addEventListener('click', e => { e.stopPropagation(); this.unlock(); this.enabled = !this.enabled; paint(); }); paint();
      window.addEventListener('signal-audio-change', paint);
      return b;
    }
  };

  /* ============================================================ INTEL — SIGNAL LOCK */
  const D = 73.42; // tonal centre: D
  SA.intel = {
    g: null, bed: null, orbitN: 0,
    start() {
      if (!SA.ctx) return; const c = SA.ctx; this.g = SA.group(); this.orbitN = 0;
      // power-on: relay thunk + CRT whine + vertical "whoomp" as the light line opens
      SA.tone({ f: 9500, to: 13500, dur: 0.5, gain: 0.012, a: 0.02, rev: 0.2 }, this.g);
      SA.tone({ f: 3000, dur: 0.012, gain: 0.08, type: 'square', a: 0.001 }, this.g);
      SA.impact({ gain: 0.22 }, this.g);
      SA.noise({ at: 0.28, f: 200, to: 2200, ft: 'lowpass', dur: 0.42, gain: 0.12, swell: true, rev: 0.4 }, this.g);
      SA.tone({ at: 0.3, f: 55, to: 110, dur: 0.6, gain: 0.18, type: 'triangle', a: 0.1, rev: 0.3 }, this.g);
      // ambient bed: detuned pad, shimmer, space wind; tuning layers wait silent
      const bed = this.bed = { out: c.createGain(), osc: [], nodes: [] };
      bed.out.gain.value = 0.0001; SA.route(bed.out, { rev: 0.55, dly: 0.08 }, this.g);
      bed.cut = c.createBiquadFilter(); bed.cut.type = 'lowpass'; bed.cut.frequency.value = 380; bed.cut.Q.value = 2.2; bed.cut.connect(bed.out);
      const lfo = c.createOscillator(), lfoG = c.createGain(); lfo.frequency.value = 0.11; lfoG.gain.value = 140; lfo.connect(lfoG); lfoG.connect(bed.cut.frequency); lfo.start(); bed.osc.push(lfo);
      [D, D * 1.5, D * 2.245, D * 2.52, D * 3.775].forEach(f => [-8, 8].forEach(dt => { const o = c.createOscillator(), v = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; v.gain.value = 0.05; o.connect(v); v.connect(bed.cut); o.start(); bed.osc.push(o); bed.pad = bed.pad || []; bed.pad.push(o); }));
      const sh = c.createGain(); sh.gain.value = 0.5; sh.connect(bed.out);
      [D * 12, D * 18].forEach((f, i) => { const o = c.createOscillator(), v = c.createGain(), tl = c.createOscillator(), tg = c.createGain(); o.frequency.value = f; v.gain.value = 0.012; tl.frequency.value = 0.35 + i * 0.21; tg.gain.value = 0.01; tl.connect(tg); tg.connect(v.gain); o.connect(v); v.connect(sh); o.start(); tl.start(); bed.osc.push(o, tl); });
      const wind = SA.loopNoise(this.g, 'bandpass', 520, 0.6, 0.16); wind.v.connect(bed.out); bed.nodes.push(wind.s);
      const wl = c.createOscillator(), wg = c.createGain(); wl.frequency.value = 0.07; wg.gain.value = 260; wl.connect(wg); wg.connect(wind.fl.frequency); wl.start(); bed.osc.push(wl);
      // tuning layers (static + heterodyne whistle + carrier hum)
      bed.stat = SA.loopNoise(this.g, 'bandpass', 1600, 1.6, 0); bed.nodes.push(bed.stat.s); SA.route(bed.stat.v, { rev: 0.15 }, this.g);
      bed.whistle = c.createOscillator(); bed.whG = c.createGain(); bed.whG.gain.value = 0; bed.whistle.frequency.value = 900; bed.whistle.connect(bed.whG); SA.route(bed.whG, { rev: 0.3, dly: 0.12 }, this.g); bed.whistle.start(); bed.osc.push(bed.whistle);
      const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5.5; vg.gain.value = 9; vib.connect(vg); vg.connect(bed.whistle.frequency); vib.start(); bed.osc.push(vib);
      bed.carrier = c.createOscillator(); bed.carrier.type = 'square'; bed.carrier.frequency.value = D; const cf = c.createBiquadFilter(); cf.type = 'lowpass'; cf.frequency.value = 260; bed.caG = c.createGain(); bed.caG.gain.value = 0; bed.carrier.connect(cf); cf.connect(bed.caG); SA.route(bed.caG, { rev: 0.2 }, this.g); bed.carrier.start(); bed.osc.push(bed.carrier);
    },
    deviceOn() { if (!this.bed) return; SA.ramp(this.bed.out.gain, 0.3, 0.45); SA.ramp(this.bed.cut.frequency, 700, 0.8); SA.tone({ f: D * 4, to: D * 8, dur: 1.2, gain: 0.03, a: 0.4, rev: 0.7, type: 'triangle' }, this.g); },
    rings() {
      [[0, -0.5, 0.6], [0.15, 0.5, 0.75], [0.3, -0.2, 0.9], [0.6, 0.25, 1.05]].forEach(([at, pan, m]) => {
        SA.noise({ at, f: 700, to: 7000, q: 3, dur: 1.25, gain: 0.05, a: 0.05, pan, rev: 0.5 }, this.g);
        SA.tone({ at, f: 330 * m, to: 660 * m, dur: 1.1, gain: 0.025, a: 0.08, pan, rev: 0.6, type: 'triangle' }, this.g);
      });
      // servo whirr as tick ring & dial spin up, with ratchet clicks
      SA.tone({ at: 0.3, f: 90, to: 240, dur: 0.9, gain: 0.05, type: 'sawtooth', lp: 500, q: 4, a: 0.15, rev: 0.2 }, this.g);
      SA.clicks(22, 0.8, { at: 0.3, gain: 0.03, pan: 0 }, this.g);
    },
    needle() { SA.tone({ f: 1800, dur: 0.05, gain: 0.05, type: 'square', lp: 2500, a: 0.001, rev: 0.3 }, this.g); SA.tone({ f: 120, dur: 0.12, gain: 0.08, type: 'triangle', a: 0.002 }, this.g); },
    check(i) {
      const f = [D * 16, D * 16 * 1.26, D * 16 * 1.5][i] || D * 24, pan = -0.45;
      SA.tone({ f, dur: 0.14, gain: 0.05, a: 0.003, pan, rev: 0.35, dly: 0.12 }, this.g);
      SA.tone({ at: 0.06, f: f * 1.5, dur: 0.18, gain: 0.04, a: 0.003, pan, rev: 0.35, dly: 0.12 }, this.g);
      SA.clicks(4, 0.08, { gain: 0.02, pan }, this.g);
    },
    orbit(pan) { SA.tone({ f: D * 32, dur: 0.6, gain: 0.022, a: 0.002, pan, rev: 0.7, dly: 0.35 }, this.g); },
    tune(needleDeg, dev, lockP, ready) {
      const b = this.bed; if (!b) return;
      const unl = 1 - lockP;
      SA.ramp(b.stat.v.gain, 0.09 * unl * (ready ? 1 : 1.2), 0.05);
      SA.ramp(b.stat.fl.frequency, clamp(1500 + needleDeg * 28, 300, 5000), 0.04);
      SA.ramp(b.whG.gain, 0.018 * Math.min(1, unl * 1.6), 0.05);
      SA.ramp(b.whistle.frequency, clamp(1100 + dev * 30, 220, 3600), 0.03);
      SA.ramp(b.caG.gain, 0.05 * unl, 0.1);
      SA.ramp(b.cut.frequency, 700 + lockP * 1300, 0.2);
    },
    uplink(ok) {
      const pan = -0.45;
      if (ok) { [1, 1.26, 1.5, 2].forEach((m, i) => SA.tone({ at: i * 0.06, f: D * 16 * m, dur: 0.22, gain: 0.04, a: 0.003, pan, rev: 0.4, dly: 0.2 }, this.g)); }
      else { [0, 0.18].forEach(at => SA.tone({ at, f: 620, dur: 0.14, gain: 0.05, type: 'square', lp: 1800, a: 0.003, pan, rev: 0.3 }, this.g)); }
      for (let i = 0; i < 16; i++) SA.tone({ at: 0.25 + i * 0.028, f: 900 + Math.random() * 2400, dur: 0.022, gain: 0.018, type: 'square', lp: 4000, a: 0.001, pan: (Math.random() - 0.5) * 0.6, rev: 0.1 }, this.g);
    },
    count(k, of) { SA.tone({ f: D * 16 * (1 + 0.5 * (k / Math.max(1, of))), dur: 0.035, gain: 0.018, a: 0.001, type: 'triangle', rev: 0.15 }, this.g); },
    line() { SA.clicks(12, 0.42, { gain: 0.03, pan: 0.45 }, this.g); SA.tone({ at: 0.43, f: D * 24, dur: 0.1, gain: 0.025, pan: 0.45, rev: 0.3 }, this.g); },
    riser(dur) {
      SA.noise({ f: 300, to: 9000, q: 1.2, dur, gain: 0.12, swell: true, rev: 0.5 }, this.g);
      SA.tone({ f: D, to: D * 4, dur, gain: 0.06, type: 'sawtooth', lp: 600, lpTo: 5000, a: dur * 0.6, rev: 0.4 }, this.g);
    },
    lock(ok) {
      const b = this.bed;
      if (b) { const t = SA.ctx.currentTime; [b.stat.v.gain, b.whG.gain, b.caG.gain].forEach(p => { p.cancelScheduledValues(t); p.setTargetAtTime(0, t, 0.01); }); SA.ramp(b.cut.frequency, ok ? 3200 : 900, 0.25); SA.ramp(b.out.gain, 0.42, 0.3);
        const chord = ok ? [D * 2, D * 3, D * 4.49, D * 5.04, D * 6] : [D * 2, D * 2.38, D * 3, D * 3.17, D * 4];
        b.pad.forEach((o, i) => SA.ramp(o.frequency, chord[Math.floor(i / 2)], 0.06)); }
      SA.impact({ gain: 0.6 }, this.g);
      const notes = ok ? [D * 8, D * 12, D * 16 * 1.26, D * 16 * 1.5, D * 32 * 1.12] : [D * 8, D * 9.5, D * 12, D * 12.7];
      notes.forEach((f, i) => SA.bell(f, { at: 0.01 + i * 0.025, dur: 3.2, gain: 0.05, pan: (i / (notes.length - 1) - 0.5) * 1.2, rev: 0.75, dly: 0.2 }, this.g));
      SA.noise({ f: 6000, to: 12000, ft: 'highpass', dur: 2.4, gain: 0.04, a: 0.01, rev: 0.9 }, this.g); // shimmer air
      // title glitch stutters (3 × .5s steps)
      [0, 0.17, 0.25, 0.42, 0.5, 0.67, 0.75, 0.92].forEach((at, i) => SA.tone({ at, f: 300 + Math.random() * 2600, dur: 0.03, gain: 0.03, type: 'square', lp: 5000, a: 0.001, pan: i % 2 ? 0.5 : -0.5 }, this.g));
      // stamp slam lands ~.33s later
      SA.noise({ at: 0.32, f: 2600, q: 0.8, dur: 0.35, gain: 0.16, a: 0.002, rev: 0.5 }, this.g);
      SA.tone({ at: 0.32, f: 95, to: 45, dur: 0.5, gain: 0.3, a: 0.002, rev: 0.3 }, this.g);
      SA.bell(340, { at: 0.33, dur: 1.4, gain: 0.03, rev: 0.6 }, this.g);
      if (!ok) [0.6, 0.85].forEach(at => SA.tone({ at, f: 520, dur: 0.18, gain: 0.05, type: 'square', lp: 1500, a: 0.004, rev: 0.3 }, this.g));
    },
    jump(dur) {
      SA.noise({ f: 180, to: 9000, q: 0.9, dur, gain: 0.22, swell: true, rev: 0.4 }, this.g);
      SA.tone({ f: 60, to: 900, dur, gain: 0.08, type: 'sawtooth', lp: 400, lpTo: 6000, a: dur * 0.5, rev: 0.3 }, this.g);
      [-0.8, 0.8].forEach((pan, i) => SA.noise({ at: dur * 0.3 + i * 0.05, f: 3000, to: 400, q: 2, dur: dur * 0.8, gain: 0.07, a: 0.05, pan, rev: 0.3 }, this.g));
      if (this.bed) SA.ramp(this.bed.cut.frequency, 8000, dur * 0.4);
    },
    flash() {
      SA.impact({ gain: 0.75 }, this.g);
      SA.noise({ f: 8000, to: 300, ft: 'lowpass', dur: 2.6, gain: 0.2, a: 0.004, rev: 0.9 }, this.g);
      [D * 4, D * 6, D * 8, D * 12].forEach((f, i) => SA.bell(f, { at: 0.12 + i * 0.05, dur: 3.5, gain: 0.03, pan: (i - 1.5) * 0.35, rev: 0.85, dly: 0.25 }, this.g));
      this.stop(2.2);
    },
    skip() { SA.tone({ f: 200, to: 2400, dur: 0.25, gain: 0.05, type: 'sawtooth', lp: 3000, a: 0.01, rev: 0.2 }, this.g); SA.clicks(10, 0.2, { gain: 0.03 }, this.g); },
    stop(fade = 0.4) {
      const b = this.bed, g = this.g; this.bed = null;
      if (b) { SA.ramp(b.out.gain, 0.0001, fade / 4); [b.stat.v.gain, b.whG.gain, b.caG.gain].forEach(p => SA.ramp(p, 0, 0.05)); setTimeout(() => { b.osc.concat(b.nodes).forEach(n => { try { n.stop(); } catch {} }); }, fade * 1000 + 400); }
      if (g) setTimeout(() => g.kill(0.6), (fade + 3.5) * 1000);
    }
  };

  /* ============================================================ ATLAS — RADAR OPS BOOT */
  const A1 = 55;
  SA.atlas = {
    g: null, bed: null, armedUntil: 0, lastGrat: 0, satNext: [0, 0, 0],
    arm() { this.armedUntil = performance.now() + 15000; },
    start(stats) {
      if (!SA.ctx) return; const c = SA.ctx; this.g = SA.group(); this.lastGrat = 0; this.satNext = [2.95, 3.25, 3.55];
      // terminal activation: relay clunk, CRT tick, hum rises
      SA.tone({ f: 2400, dur: 0.015, gain: 0.08, type: 'square', a: 0.001 }, this.g);
      SA.impact({ gain: 0.25 }, this.g);
      SA.tone({ f: 12000, dur: 0.6, gain: 0.008, a: 0.05, rev: 0.2 }, this.g);
      const bed = this.bed = { out: c.createGain(), osc: [], nodes: [] };
      bed.out.gain.value = 0.0001; SA.route(bed.out, { rev: 0.45 }, this.g); SA.ramp(bed.out.gain, 0.22, 0.5);
      bed.cut = c.createBiquadFilter(); bed.cut.type = 'lowpass'; bed.cut.frequency.value = 520; bed.cut.Q.value = 1.4; bed.cut.connect(bed.out);
      [[A1, 'triangle', 0.16], [A1 * 1.5, 'sine', 0.1], [A1 * 2, 'triangle', 0.08], [A1 * 3, 'sine', 0.04], [A1 * 4.01, 'sine', 0.02]].forEach(([f, t, v]) => { const o = c.createOscillator(), gn = c.createGain(); o.type = t; o.frequency.value = f; gn.gain.value = v; o.connect(gn); gn.connect(bed.cut); o.start(); bed.osc.push(o); });
      const vent = SA.loopNoise(this.g, 'lowpass', 380, 0.5, 0.1); vent.v.connect(bed.out); bed.nodes.push(vent.s);
      // servo motor for the globe turn (controlled per frame)
      bed.servo = c.createOscillator(); bed.servo.type = 'sawtooth'; bed.servo.frequency.value = 60; const sf = c.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 420; sf.Q.value = 3; bed.svG = c.createGain(); bed.svG.gain.value = 0; bed.servo.connect(sf); sf.connect(bed.svG); SA.route(bed.svG, { rev: 0.25 }, this.g); bed.servo.start(); bed.osc.push(bed.servo);
      // circuit traces zap in (18, alternating sides, 60 ms apart) and their end-nodes light 1.2 s later
      for (let i = 0; i < 18; i++) {
        const pan = i % 2 === 0 ? -0.75 : 0.75, at = i * 0.06;
        SA.noise({ at, f: 1500 + (i % 5) * 600, to: 6500, q: 4, dur: 0.32, gain: 0.03, a: 0.004, pan, rev: 0.25 }, this.g);
        SA.tone({ at: at + 1.2, f: 1318.5 * (1 + (i % 6) * 0.125), dur: 0.12, gain: 0.018, a: 0.002, pan, rev: 0.4, dly: 0.15 }, this.g);
      }
      // globe grows (0–1.2 s): rising swell
      SA.tone({ f: A1 * 2, to: A1 * 4, dur: 1.3, gain: 0.07, type: 'triangle', a: 0.5, rev: 0.6 }, this.g);
      // scan band sweeps top → bottom (0.8–3.2 s)
      SA.noise({ at: 0.8, f: 6000, to: 500, q: 5, dur: 2.4, gain: 0.05, a: 0.4, rev: 0.4 }, this.g);
      SA.tone({ at: 0.8, f: 1760, to: 587, dur: 2.4, gain: 0.014, a: 0.3, rev: 0.5 }, this.g);
    },
    phase(i, chars) {
      const pan = 0.55;
      SA.clicks(Math.min(16, Math.max(6, Math.round(chars / 3))), 0.3, { gain: 0.03, pan }, this.g);
      SA.tone({ f: 1046.5, dur: 0.09, gain: 0.035, type: 'square', lp: 2200, a: 0.002, pan, rev: 0.3 }, this.g);
      if (i === 4) this.sonar();
      if (i === 6) this.descend();
    },
    grat(k, total) { SA.tone({ f: 440 * Math.pow(2, (k / total) * 1.5), dur: 0.05, gain: 0.012, type: 'triangle', a: 0.001, pan: (Math.random() - 0.5) * 0.8, rev: 0.25 }, this.g); },
    outlines() { [0, 3, 7, 12, 14].forEach((s, i) => SA.tone({ at: i * 0.11, f: 392 * Math.pow(2, s / 12), dur: 0.9, gain: 0.022, a: 0.02, pan: (i - 2) * 0.3, rev: 0.6, dly: 0.2, type: 'triangle' }, this.g)); },
    sat(k, pan) { SA.tone({ f: [2093, 2637, 3136][k], dur: 0.07, gain: 0.016, a: 0.001, pan, rev: 0.4, dly: 0.25 }, this.g); },
    servo(speed) { if (this.bed) { SA.ramp(this.bed.svG.gain, 0.05 * speed, 0.08); SA.ramp(this.bed.servo.frequency, 55 + speed * 90, 0.08); } },
    sonar() {
      SA.tone({ f: 1396.9, dur: 2.8, gain: 0.07, a: 0.004, rev: 0.85, dly: 0.35 }, this.g);
      SA.tone({ f: 1396.9 * 2, dur: 1.2, gain: 0.015, a: 0.004, rev: 0.8 }, this.g);
      SA.tone({ at: 0.9, f: 1396.9, dur: 1.6, gain: 0.02, a: 0.01, rev: 0.9, pan: 0.3 }, this.g);
    },
    markers(list) { // west → east cascade; priority hotspots get a deeper bloom
      const pent = [0, 2, 4, 7, 9]; list.forEach((m, i) => {
        const at = i * 0.012, step = pent[i % 5] + 12 * Math.floor(i / 5) / 3, f = 523.25 * Math.pow(2, Math.min(step, 26) / 12);
        SA.tone({ at, f, dur: 0.25, gain: 0.014, a: 0.002, pan: m.pan, rev: 0.45, dly: 0.12 }, this.g);
        if (m.pri) SA.tone({ at, f: 196, dur: 0.7, gain: 0.03, type: 'triangle', a: 0.004, pan: m.pan, rev: 0.6 }, this.g);
      });
    },
    descend() {
      SA.noise({ f: 300, to: 7000, q: 0.8, dur: 1.0, gain: 0.14, swell: true, rev: 0.4 }, this.g);
      SA.tone({ f: 880, to: 110, dur: 1.1, gain: 0.05, type: 'sawtooth', lp: 3000, lpTo: 400, a: 0.2, rev: 0.4 }, this.g);
      if (this.bed) SA.ramp(this.bed.cut.frequency, 2400, 0.4); SA.ramp(this.bed.out.gain, 0.4, 0.4);
    },
    finish(skipped) {
      if (!this.g) return;
      if (skipped) { SA.tone({ f: 300, to: 1800, dur: 0.2, gain: 0.04, type: 'sawtooth', lp: 2500, a: 0.01 }, this.g); this.g.kill(0.25); }
      else SA.impact({ gain: 0.45 }, this.g);
      const b = this.bed; this.bed = null; const g = this.g; this.g = null;
      if (b) { SA.ramp(b.out.gain, 0.0001, skipped ? 0.08 : 0.5); SA.ramp(b.svG.gain, 0, 0.05); setTimeout(() => b.osc.concat(b.nodes).forEach(n => { try { n.stop(); } catch {} }), 3000); }
      if (g && !skipped) setTimeout(() => g.kill(0.8), 5000);
    },
    /* the green radar sweep across the map after boot (or straight after a skip) */
    sweep() {
      if (!SA.ctx || performance.now() > this.armedUntil) return false;
      this.armedUntil = 0; this.sg = SA.group();
      const c = SA.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain(), t = c.currentTime;
      s.buffer = SA.noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 2.5; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(2600, t + 1.9);
      v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.05, t + 0.25); v.gain.setValueAtTime(0.05, t + 1.6); v.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
      s.connect(f); f.connect(v);
      if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.setValueAtTime(-0.9, t); p.pan.linearRampToValueAtTime(0.9, t + 1.9); v.connect(p); p.connect(this.sg.dry); const r = c.createGain(); r.gain.value = 0.4; p.connect(r); r.connect(this.sg.rev); } else v.connect(this.sg.dry);
      s.start(t); s.stop(t + 2.2);
      SA.tone({ f: 1396.9, dur: 1.8, gain: 0.03, a: 0.004, pan: -0.8, rev: 0.8, dly: 0.3 }, this.sg);
      setTimeout(() => this.sg && this.sg.kill(1), 6000);
      return true;
    },
    hit(pan, pri) { if (!this.sg || this.sg.dead) return; SA.tone({ f: pri ? 1174.7 : 1760 + Math.random() * 300, dur: 0.18, gain: pri ? 0.03 : 0.012, a: 0.002, pan, rev: 0.4 }, this.sg); },
    stop() { if (this.g) this.g.kill(0.2); this.g = null; const b = this.bed; this.bed = null; if (b) setTimeout(() => b.osc.concat(b.nodes).forEach(n => { try { n.stop(); } catch {} }), 400); }
  };

  // An audio hiccup must never stall an animation: every cue is fail-safe.
  [SA.intel, SA.atlas].forEach(obj => Object.keys(obj).forEach(k => {
    const fn = obj[k]; if (typeof fn !== 'function') return;
    obj[k] = function () { try { return fn.apply(obj, arguments); } catch (err) { if (window.console) console.warn('[signal-audio]', k, err); return false; } };
  }));
  window.SignalAudio = SA;
})();
