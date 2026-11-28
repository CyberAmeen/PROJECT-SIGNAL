/* PROJECT SIGNAL — NEW HORIZONS: 15 additional Intel story scenes + 4 ships.
 * Loaded lazily (only when an Intel scan starts). Every scene is lit by the slide's galactic region through
 * --rg-a (shadow), --rg-b (key light) and --rg-c (highlight), so each can appear in every mood.
 * Pure HTML/SVG + CSS animation (transform / opacity), built only for the visible slide and its neighbours. */
(() => {
  'use strict';
  const f = n => n.toFixed(1);
  const arr = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');

  /* ---------------- ships: four designs × four behaviours (hover · pass · far · none) */
  const SHIPS = {
    dart: '<svg viewBox="0 0 120 40"><path d="M4 20 L70 11 L116 20 L70 29 Z" class="h"/><path d="M40 16 L70 11 L74 20 Z" class="l"/><path d="M28 20 L6 6 L14 20 L6 34 Z" class="h2"/><circle cx="8" cy="20" r="4" class="e"/></svg>',
    disc: '<svg viewBox="0 0 120 50"><ellipse cx="60" cy="30" rx="56" ry="11" class="h"/><path d="M36 27 Q60 2 84 27 Z" class="l"/><ellipse cx="60" cy="30" rx="56" ry="3" class="h2"/>' + arr(5, i => `<circle cx="${20 + i * 20}" cy="35" r="2.4" class="e" style="--k:${i}"/>`) + '</svg>',
    trident: '<svg viewBox="0 0 120 50"><path d="M10 25 L84 18 L114 25 L84 32 Z" class="h"/><path d="M20 12 L70 16 L76 20 L22 18 Z M20 38 L70 34 L76 30 L22 32 Z" class="h2"/><path d="M60 21 L84 18 L88 25 Z" class="l"/><circle cx="14" cy="25" r="4" class="e"/><circle cx="22" cy="15" r="2.5" class="e"/><circle cx="22" cy="35" r="2.5" class="e"/></svg>',
    orb: '<svg viewBox="0 0 80 80"><ellipse cx="40" cy="40" rx="36" ry="9" class="h2"/><circle cx="40" cy="40" r="17" class="h"/><path d="M28 34 Q40 22 52 34" class="l" fill="none"/><circle cx="40" cy="40" r="5" class="e"/><path d="M4 40 A36 9 0 0 0 76 40" class="ring" fill="none"/></svg>'
  };
  const ship = (kind, mode, x, y, s = 1) => kind && mode !== 'none'
    ? `<div class="nx-ship nx-ship--${mode} nx-ship-${kind}" style="--sx:${x}%;--sy:${y}%;--ss:${s}">${SHIPS[kind]}<i class="nx-ship-glow"></i></div>` : '';

  /* ---------------- the 15 scenes */
  const SCENES = {
    pulsar: {
      name: 'LIGHTHOUSE', desc: 'A pulsar spins at the heart of a gas cloud; twin beams sweep through it, lighting the wisps as they pass.',
      family: 'star', tone: 'bright', ship: 'none', best: 'Pulsar Ice, Violet Deep, Cobalt Drift',
      html: r => `<div class="nx-pulsar"><div class="nx-wisps">${arr(7, i => `<i style="--x:${f(10 + r() * 80)}%;--y:${f(15 + r() * 70)}%;--s:${f(30 + r() * 40)}%;--d:${f(i * 0.43)}s"></i>`)}</div>
        <div class="nx-pl-rot"><i class="nx-beam a"></i><i class="nx-beam b"></i></div><div class="nx-pl-core"><i></i></div></div>`
    },
    binary: {
      name: 'DUET', desc: 'Two stars locked in a slow orbital dance, a stream of plasma pouring from the larger to the smaller.',
      family: 'star', tone: 'bright', ship: 'trident · distant silhouette', best: 'Rose Nebula, Solar Wind, Andromeda Dusk',
      html: r => `<div class="nx-binary"><div class="nx-bi-orbit"><div class="nx-bi-a"><i></i></div><div class="nx-bi-b"><i></i></div>
        <svg class="nx-bi-stream" viewBox="0 0 200 100"><path d="M48 50 C 80 20, 120 20, 150 46"/><path class="s2" d="M48 50 C 82 30, 118 28, 150 46"/></svg>${arr(6, i => `<i class="nx-bi-p" style="--d:-${(i * 0.3).toFixed(1)}s"></i>`)}</div>
        <div class="nx-bi-halo"></div></div>${ship('trident', 'far', 78, 22, .5)}`
    },
    supernova: {
      name: 'SHOCKFRONT', desc: 'A supernova remnant: shockwaves ripple outward through a glowing debris shell around a flickering core.',
      family: 'star', tone: 'bright', ship: 'none', best: 'Red Giant, Solar Wind, Emerald Core',
      html: r => `<div class="nx-nova"><div class="nx-nv-shell"></div>${arr(3, i => `<i class="nx-nv-ring" style="--d:${i * 2}s"></i>`)}
        <div class="nx-nv-debris">${arr(28, i => `<b style="--a:${f(i / 28 * 360 + r() * 8)}deg;--r:${f(30 + r() * 70)}%;--d:${f(r() * 6)}s"></b>`)}</div><div class="nx-nv-core"></div></div>`
    },
    quasar: {
      name: 'BLAZAR', desc: 'A distant galactic core feeding a quasar: a hot spinning disk and two relativistic jets firing out of it.',
      family: 'galaxy', tone: 'bright', ship: 'dart · passing', best: 'Violet Deep, Cobalt Drift, Aurora Drift',
      html: r => `<div class="nx-quasar"><div class="nx-qs-haze"></div><div class="nx-qs-jet up">${arr(4, i => `<i style="--d:${i * .7}s"></i>`)}</div><div class="nx-qs-jet dn">${arr(4, i => `<i style="--d:${i * .7 + .35}s"></i>`)}</div>
        <div class="nx-qs-disk"><i></i></div><div class="nx-qs-core"></div></div>${ship('dart', 'pass', 10, 70, .7)}`
    },
    geyser: {
      name: 'CRYOVOLCANO', desc: 'An ice moon erupts with geysers, backlit by the banded giant planet it orbits.',
      family: 'planet', tone: 'cool', ship: 'orb · hovering', best: 'Pulsar Ice, Aurora Drift, Cobalt Drift',
      html: r => `<div class="nx-geyser"><div class="nx-gy-parent"><i></i></div><div class="nx-gy-moon"><svg viewBox="0 0 100 100"><path d="M20 40 L38 46 L52 38 L70 50 M30 66 L48 60 L62 70 M54 22 L60 34"/></svg></div>
        <div class="nx-gy-plumes">${arr(3, k => `<div class="nx-gy-plume" style="--x:${[38, 52, 64][k]}%">${arr(9, i => `<i style="--d:${f(i * .33 + k * .2)}s;--w:${f((r() - .5) * 24)}px"></i>`)}</div>`)}</div></div>${ship('orb', 'hover', 74, 52, .55)}`
    },
    lava: {
      name: 'TERMINATOR', desc: 'A tidally locked world: a molten day side cracked with glowing lava, a frozen night side, a sharp line between.',
      family: 'planet', tone: 'warm', ship: 'dart · passing', best: 'Red Giant, Solar Wind, Rose Nebula',
      html: r => `<div class="nx-lava"><div class="nx-lv-planet"><i class="nx-lv-day"></i><svg class="nx-lv-cracks" viewBox="0 0 100 100">${arr(7, () => { let x = 8 + r() * 36, y = 10 + r() * 80, d = `M${f(x)} ${f(y)}`; for (let s = 0; s < 4; s++) { x += 4 + r() * 8; y += (r() - .5) * 14; d += ` L${f(x)} ${f(y)}`; } return `<path d="${d}" style="--d:${f(r() * 3)}s"/>`; })}</svg><i class="nx-lv-night"></i><i class="nx-lv-rim"></i></div></div>${ship('dart', 'pass', 0, 22, .55)}`
    },
    storm: {
      name: 'THUNDERHEAD', desc: 'A gas giant with lightning storms flickering deep beneath its drifting cloud bands.',
      family: 'giant', tone: 'dark', ship: 'disc · distant silhouette', best: 'Violet Deep, Andromeda Dusk, Cobalt Drift',
      html: r => `<div class="nx-storm"><div class="nx-st-planet"><i class="nx-st-bands"></i>${arr(6, i => `<b style="--x:${f(20 + r() * 60)}%;--y:${f(20 + r() * 60)}%;--d:${f(r() * 5)}s;--t:${f(3.5 + r() * 3)}s"></b>`)}<i class="nx-st-shade"></i></div></div>${ship('disc', 'far', 16, 30, .45)}`
    },
    eclipse: {
      name: 'CORONA', desc: 'A total eclipse: a black disk ringed by a streaming stellar corona, with a diamond-ring flash at its edge.',
      family: 'dark', tone: 'dark', ship: 'none', best: 'Emerald Core, Pulsar Ice, Andromeda Dusk',
      html: () => `<div class="nx-eclipse"><i class="nx-ec-rays"></i><i class="nx-ec-glow"></i><i class="nx-ec-disk"></i><i class="nx-ec-prom"></i><i class="nx-ec-diamond"></i></div>`
    },
    wormhole: {
      name: 'THROAT', desc: 'A wormhole folding space: starlight bends into arcs around a tunnel that pulls the eye inward.',
      family: 'dark', tone: 'dark', ship: 'dart · flying in', best: 'Violet Deep, Aurora Drift, Emerald Core',
      html: r => `<div class="nx-worm"><div class="nx-wm-arcs">${arr(5, i => `<i style="--r:${36 + i * 13}%;--d:${f(r() * 8)}s;--t:${f(14 + i * 6)}s"></i>`)}</div>
        <div class="nx-wm-tunnel">${arr(7, i => `<i style="--d:${f(i * .6)}s"></i>`)}</div><i class="nx-wm-throat"></i></div>${ship('dart', 'dive', 12, 78, .6)}`
    },
    megastructure: {
      name: 'ARCWORK', desc: 'An ancient megastructure: a half-built ring and a swarm of collectors catching the light of its star.',
      family: 'structure', tone: 'bright', ship: 'disc · hovering', best: 'Solar Wind, Emerald Core, Andromeda Dusk',
      html: r => `<div class="nx-mega"><i class="nx-mg-star"></i><svg class="nx-mg-ring" viewBox="0 0 300 120"><path class="back" d="M20 60 A130 40 0 0 1 280 60"/><path class="front" d="M30 66 A130 40 0 0 0 250 92"/></svg>
        ${arr(3, k => `<div class="nx-mg-orbit" style="--t:${18 + k * 9}s;--sy:${.28 + k * .08};--w:${62 + k * 16}%">${arr(5 + k * 2, i => `<b style="--a:${f(i / (5 + k * 2) * 360)}deg"></b>`)}</div>`)}</div>${ship('disc', 'hover', 70, 18, .6)}`
    },
    crystal: {
      name: 'PRISM WORLD', desc: 'A crystalline exoplanet of faceted mineral, splitting starlight into prismatic rays.',
      family: 'planet', tone: 'bright', ship: 'orb · distant silhouette', best: 'Pulsar Ice, Rose Nebula, Violet Deep',
      html: r => { const cx = 50, cy = 50, R = 46, pts = Array.from({ length: 9 }, (_, i) => { const a = i / 9 * Math.PI * 2 + r() * .3; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; }), inner = Array.from({ length: 5 }, (_, i) => { const a = i / 5 * Math.PI * 2 + .4; return [cx + Math.cos(a) * R * .45, cy + Math.sin(a) * R * .45]; });
        let tri = ''; pts.forEach((p, i) => { const q = pts[(i + 1) % 9], m = inner[i % 5]; tri += `<path d="M${f(p[0])} ${f(p[1])} L${f(q[0])} ${f(q[1])} L${f(m[0])} ${f(m[1])}Z" class="k${i % 4}"/>`; });
        inner.forEach((p, i) => { const q = inner[(i + 1) % 5]; tri += `<path d="M${f(p[0])} ${f(p[1])} L${f(q[0])} ${f(q[1])} L50 50Z" class="k${(i + 2) % 4}"/>`; });
        return `<div class="nx-crystal"><div class="nx-cr-rays">${arr(4, i => `<i style="--a:${-30 + i * 22}deg;--d:${i * 1.1}s"></i>`)}</div><svg class="nx-cr-planet" viewBox="0 0 100 100">${tri}</svg><i class="nx-cr-glint"></i></div>${ship('orb', 'far', 18, 22, .35)}`; }
    },
    asteroids: {
      name: 'DRIFTFIELD', desc: 'Drifting through an asteroid belt: tumbling rocks at three depths, dust catching the light.',
      family: 'debris', tone: 'dark', ship: 'trident · passing', best: 'Solar Wind, Red Giant, Cobalt Drift',
      html: r => `<div class="nx-belt">${arr(9, i => { const z = i % 3, n = 7 + Math.floor(r() * 3); let d = ''; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, rr = 34 + r() * 14; d += (k ? 'L' : 'M') + f(50 + Math.cos(a) * rr) + ' ' + f(50 + Math.sin(a) * rr); }
          return `<div class="nx-rock z${z}" style="--y:${f(8 + r() * 80)}%;--s:${f([22, 40, 72][z] * (.7 + r() * .6))}px;--t:${f([46, 30, 18][z] * (.8 + r() * .4))}s;--d:-${f(r() * 40)}s;--sp:${f(8 + r() * 14)}s;--rx:${f(r() * 88)}%"><svg viewBox="0 0 100 100"><path d="${d}Z"/><path class="lit" d="${d}Z"/></svg></div>`; })}
        <i class="nx-dust"></i></div>${ship('trident', 'pass', 0, 46, .6)}`
    },
    spiral: {
      name: 'GRAND DESIGN', desc: 'A spiral galaxy seen from above, its arms of young stars turning slowly around a bright core.',
      family: 'galaxy', tone: 'bright', ship: 'none', best: 'Cobalt Drift, Violet Deep, Rose Nebula',
      html: r => `<div class="nx-spiral"><div class="nx-sp-rot"><i class="nx-sp-arms"></i>${arr(90, i => { const arm = i % 2, t = (i >> 1) / 45, a = arm * Math.PI + t * 4.6 + (r() - .5) * .35, rr = 6 + t * 42 + (r() - .5) * 4; return `<b style="left:${f(50 + Math.cos(a) * rr)}%;top:${f(50 + Math.sin(a) * rr * .62)}%;--s:${f(1 + r() * 2.2)}px;--o:${f(.4 + r() * .6)}"></b>`; })}</div><i class="nx-sp-core"></i></div>`
    },
    array: {
      name: 'THE LISTENING FIELD', desc: 'Earth-side: a row of radio dishes listening under the Milky Way, faint signal rings rising into the night.',
      family: 'earth', tone: 'dark', ship: 'orb · distant light', best: 'Emerald Core, Aurora Drift, Pulsar Ice',
      html: r => `<div class="nx-array"><i class="nx-ar-milky"></i><i class="nx-ar-milky2"></i><div class="nx-ar-ground"></div>
        <div class="nx-ar-dishes">${arr(4, i => `<div class="nx-ar-dish" style="--x:${12 + i * 22}%;--s:${f(.7 + (i % 2) * .25)}"><svg viewBox="0 0 100 100"><path class="bowl" d="M14 40 Q50 72 86 40 Q50 54 14 40Z"/><path d="M50 52 L50 30 M40 42 L50 30 L60 42 M50 60 L50 76 M34 96 L44 76 H56 L66 96 Z"/></svg><i class="sig" style="--d:${f(i * .9)}s"></i></div>`)}</div></div>${ship('orb', 'far', 64, 14, .25)}`
    },
    meteors: {
      name: 'MESA NIGHT', desc: 'Earth-side: a meteor shower streaking over a desert mesa, the sky glowing faintly at the horizon.',
      family: 'earth', tone: 'dark', ship: 'none', best: 'Andromeda Dusk, Red Giant, Solar Wind',
      html: r => `<div class="nx-mesa"><i class="nx-ms-sky"></i><i class="nx-ms-radiant"></i><div class="nx-ms-falls">${arr(13, i => `<i style="--x:${f(20 + r() * 80)}%;--y:${f(r() * 42)}%;--d:${f(i < 3 ? i * .6 : r() * 7)}s;--t:${f(4 + r() * 3)}s;--l:${f(60 + r() * 70)}px"></i>`)}</div>
        <svg class="nx-ms-land" viewBox="0 0 400 120" preserveAspectRatio="none"><path class="far" d="M0 82 L60 78 L80 62 L170 60 L186 74 L260 76 L300 58 L360 56 L372 70 L400 72 V120 H0Z"/><path class="rim" d="M80 62 L170 60 M300 58 L360 56"/><path class="near" d="M0 96 L140 92 L156 84 L230 86 L250 98 L400 100 V120 H0Z"/></svg></div>`
    }
  };

  /* ---------------- sound layers (same engine as the original scenes; silent unless audio is on) */
  const ev = (sel, anim, at, play) => ({ sel, anim, at, play });
  const SA = () => window.SignalAudio;
  const T = (o, g) => SA().tone(o, g), N = (o, g) => SA().noise(o, g);
  const SOUNDS = {
    pulsar: { bed(b) { b.osc(55, 'sine', 0.03); b.noise('bandpass', 2400, 2, 0.01); }, events: [ev('.nx-pl-rot', 'nxSpin', [0, .5], (g, p, at) => T({ at, f: 1320, to: 1250, dur: 0.12, gain: 0.012, type: 'triangle', pan: p, rev: 0.5 }, g))] },
    binary: { bed(b) { b.osc(65.4, 'sine', 0.03); b.osc(98, 'sine', 0.015); }, events: [ev('.nx-bi-p', 'nxFlow', [0], (g, p, at) => N({ at, f: 600, to: 1800, q: 2, dur: 1.6, gain: 0.012, a: 0.5, pan: p, rev: 0.5 }, g))] },
    supernova: { bed(b) { b.noise('lowpass', 160, 0.7, 0.25); b.osc(41.2, 'sine', 0.04); }, events: [ev('.nx-nv-ring', 'nxShock', [0.02], (g, p, at) => { T({ at, f: 70, to: 38, dur: 1.2, gain: 0.05, a: 0.01, pan: p, rev: 0.5 }, g); N({ at, f: 900, to: 200, q: 1, dur: 1, gain: 0.02, a: 0.01, pan: p }, g); })] },
    quasar: { bed(b) { b.osc(46.2, 'sawtooth', 0.01, b.filter('lowpass', 220)); b.noise('highpass', 5000, 0.7, 0.012); }, events: [ev('.nx-qs-jet.up i', 'nxJet', [0.05], (g, p, at) => T({ at, f: 2600, to: 3600, dur: 0.25, gain: 0.006, pan: p, rev: 0.6 }, g))] },
    geyser: { bed(b) { b.noise('bandpass', 700, 0.5, 0.02); b.osc(73.4, 'sine', 0.02); }, events: [ev('.nx-gy-plume i', 'nxPlume', [0.02], (g, p, at, idx) => { if (idx % 9) return; N({ at, f: 3000, to: 900, q: 1.5, dur: 0.9, gain: 0.02, a: 0.02, pan: p, rev: 0.4 }, g); })] },
    lava: { bed(b) { b.noise('lowpass', 240, 0.8, 0.25); b.osc(36.7, 'sine', 0.04); }, events: [ev('.nx-lv-cracks', 'nxGlow', [0.1], (g, p, at, idx) => { N({ at, f: 300, to: 120, q: 2, dur: 0.6, gain: 0.03, a: 0.05, pan: p }, g); })] },
    storm: { bed(b) { b.noise('lowpass', 300, 0.7, 0.3); b.osc(49, 'sine', 0.025); }, events: [ev('.nx-st-planet b', 'nxBolt', [0.08], (g, p, at) => { N({ at: at + 0.4, f: 180, to: 60, q: 1, dur: 1.4, gain: 0.05, a: 0.02, pan: p, rev: 0.6 }, g); })] },
    eclipse: { bed(b) { b.osc(110, 'sine', 0.012); b.osc(164.8, 'sine', 0.008); b.osc(220, 'sine', 0.004); }, events: [ev('.nx-ec-diamond', 'nxDiamond', [0.42], (g, p, at) => SA().bell(1975.5, { at, gain: 0.02, dur: 2.4, rev: 0.9, pan: p }, g))] },
    wormhole: { bed(b) { const o = b.osc(55, 'sawtooth', 0.012, b.filter('lowpass', 300)); b.lfo(o.o.frequency, 0.12, 6); b.noise('bandpass', 400, 1, 0.02); }, events: [ev('.nx-wm-tunnel i', 'nxTunnel', [0.0], (g, p, at, idx) => { if (idx % 3) return; T({ at, f: 300, to: 80, dur: 0.8, gain: 0.012, a: 0.1, pan: p, rev: 0.5 }, g); })] },
    megastructure: { bed(b) { b.osc(82.4, 'triangle', 0.015, b.filter('lowpass', 500)); b.osc(123.5, 'sine', 0.01); }, events: [ev('.nx-mg-star', 'nxStar', [0.5], (g, p, at) => T({ at, f: 659.3, dur: 1.6, gain: 0.01, a: 0.3, pan: p, rev: 0.8 }, g))] },
    crystal: { bed(b) { b.osc(523.3, 'sine', 0.004); b.osc(784, 'sine', 0.003); b.noise('highpass', 7000, 0.7, 0.008); }, events: [ev('.nx-cr-glint', 'nxGlint', [0.5], (g, p, at) => [0, .12, .24].forEach((d, k) => T({ at: at + d, f: [2093, 2637, 3136][k], dur: 0.6, gain: 0.008, pan: p, rev: 0.8 }, g)))] },
    asteroids: { bed(b) { b.noise('lowpass', 200, 0.6, 0.15); b.osc(43.7, 'sine', 0.02); }, events: [ev('.nx-rock.z2', 'nxDrift', [0.5], (g, p, at, idx) => { if (idx > 1) return; N({ at, f: 900, to: 300, q: 1, dur: 0.9, gain: 0.02, a: 0.2, pan: p }, g); })] },
    spiral: { bed(b) { b.osc(61.7, 'sine', 0.03); b.osc(92.5, 'sine', 0.015); b.noise('bandpass', 1500, 0.4, 0.01); }, events: [ev('.nx-sp-core', 'nxPulse', [0.5], (g, p, at) => T({ at, f: 987.8, dur: 1.2, gain: 0.008, pan: p, rev: 0.8, dly: 0.3 }, g))] },
    array: { bed(b) { b.noise('highpass', 5000, 0.7, 0.02); b.noise('bandpass', 1420, 6, 0.006); }, events: [ev('.nx-ar-dish .sig', 'nxSig', [0.02], (g, p, at) => T({ at, f: 1420, to: 1440, dur: 0.4, gain: 0.008, type: 'sine', pan: p, rev: 0.6 }, g))] },
    meteors: { bed(b) { b.noise('lowpass', 500, 0.5, 0.03); b.osc(55, 'sine', 0.012); }, events: [ev('.nx-ms-falls i', 'nxFall', [0.05], (g, p, at) => N({ at, f: 4000, to: 1200, q: 2, dur: 0.5, gain: 0.008, a: 0.02, pan: p, rev: 0.4 }, g))] }
  };

  window.PSScenesX = { SCENES, SOUNDS, ids: Object.keys(SCENES), html: (id, rng) => SCENES[id] ? SCENES[id].html(rng) : '' };
  window.PSSceneSounds = SOUNDS;
  window.dispatchEvent(new Event('ps:scenesx'));
})();
