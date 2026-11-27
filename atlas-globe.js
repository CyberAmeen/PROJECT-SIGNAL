/* PROJECT SIGNAL — WHOLE-EARTH ORBITAL GLOBE (Atlas opening)
 * Every continent and major island from Natural Earth 1:50m (atlas-geo.js, bundled locally), drawn in a true
 * orthographic projection. Emerald coastlines, faint graticule, atmospheric rim light, a day/night terminator with
 * emerald city-light shimmer (real Natural Earth city positions), drifting data haze, and the US drawn with the
 * Atlas map's own state outlines so the descent lands exactly on the map.
 * Canvas 2D only; back-hemisphere rings are culled, shading is computed on a small texture and scaled up. */
(() => {
  'use strict';
  const G = window.PSGeo; if (!G) return;
  const D2R = Math.PI / 180;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const unit = (lon, lat) => { const l = lon * D2R, p = lat * D2R, c = Math.cos(p); return [c * Math.sin(l), Math.sin(p), c * Math.cos(l)]; };

  let land = null, lakes = null, places = null, us = null, meta = null, lakeMeta = null, usMeta = null, stars = null, haze = null, shade = null, shadeCtx = null, shadeImg = null;
  function ringMeta(rs) {
    return rs.map(r => {
      let x = 0, y = 0, z = 0; const n = r.length / 2;
      for (let i = 0; i < r.length; i += 2) { const v = unit(r[i], r[i + 1]); x += v[0]; y += v[1]; z += v[2]; }
      const m = Math.hypot(x, y, z) || 1, c = [x / m, y / m, z / m]; let minDot = 1;
      for (let i = 0; i < r.length; i += 2) { const v = unit(r[i], r[i + 1]); minDot = Math.min(minDot, v[0] * c[0] + v[1] * c[1] + v[2] * c[2]); }
      const u = new Float32Array(3 * n); for (let i = 0; i < n; i++) { const v = unit(r[2 * i], r[2 * i + 1]); u[3 * i] = v[0]; u[3 * i + 1] = v[1]; u[3 * i + 2] = v[2]; }
      return { c, sinR: Math.sin(Math.acos(Math.max(-1, Math.min(1, minDot)))), n, u };
    });
  }
  function prep() {
    if (land) return;
    land = G.land(); lakes = G.lakes(); places = G.places(); us = window.__atlasOutline || [];
    meta = ringMeta(land); lakeMeta = ringMeta(lakes); usMeta = ringMeta(us);
    const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(11);
    stars = Array.from({ length: 340 }, () => ({ x: rnd(), y: rnd(), z: .25 + rnd() * .75, s: rnd() < .08 ? 1.6 : .4 + rnd() * .8, tw: rnd() * 6.3, c: rnd() < .2 ? '255,214,240' : rnd() < .5 ? '190,240,255' : '235,255,245' }));
    // data haze: soft value-noise texture, generated once
    haze = document.createElement('canvas'); haze.width = haze.height = 256;
    const hc = haze.getContext('2d'), img = hc.createImageData(256, 256), N = 32, grid = new Float32Array((N + 1) * (N + 1)).map(() => rnd());
    const smp = (x, y, f) => { const gx = x * f % N, gy = y * f % N, i = Math.floor(gx), j = Math.floor(gy), u = gx - i, v = gy - j, a = grid[j * (N + 1) + i], b = grid[j * (N + 1) + i + 1], c = grid[(j + 1) * (N + 1) + i], d = grid[(j + 1) * (N + 1) + i + 1], su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v); return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv; };
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const n = smp(x / 256 * N, y / 256 * N, 1) * .55 + smp(x / 128 * N % N, y / 128 * N % N, 1) * .3 + smp(x / 64 * N % N, y / 64 * N % N, 1) * .15;
      const a = Math.max(0, n - .5) * 2.2, k = (y * 256 + x) * 4;
      img.data[k] = 170; img.data[k + 1] = 255; img.data[k + 2] = 225; img.data[k + 3] = Math.min(255, a * a * 255);
    }
    hc.putImageData(img, 0, 0);
    shade = document.createElement('canvas'); shade.width = shade.height = 112; shadeCtx = shade.getContext('2d'); shadeImg = shadeCtx.createImageData(112, 112);
  }

  // subsolar point: Americas in daylight, Europe / Africa / Asia crossing into night as the globe turns
  const SUN = unit(-62, -8);

  function view(lon0, lat0) {
    const l0 = lon0 * D2R, sp = Math.sin(lat0 * D2R), cp = Math.cos(lat0 * D2R), sl = Math.sin(l0), cl = Math.cos(l0);
    // geographic unit vector → view space (x right, y up, z toward viewer)
    const rot = v => { const x = v[0] * cl - v[2] * sl, z0 = v[0] * sl + v[2] * cl; return [x, v[1] * cp - z0 * sp, v[1] * sp + z0 * cp]; };
    return { rot, dir: unit(lon0, lat0), cl, sl, cp, sp };
  }

  function projectRing(m, V, R, cx, cy, out) {
    const n = m.n, u = m.u, cl = V.cl, sl = V.sl, cp = V.cp, sp = V.sp; let vis = 0;
    for (let i = 0; i < n; i++) {
      const vx = u[3 * i], vy = u[3 * i + 1], vz = u[3 * i + 2];
      let x = vx * cl - vz * sl; const z0 = vx * sl + vz * cl; let y = vy * cp - z0 * sp; const z = vy * sp + z0 * cp;
      if (z < 0) { const k = 1 / (Math.hypot(x, y) || 1); x *= k; y *= k; } else vis++;
      out[3 * i] = cx + R * x; out[3 * i + 1] = cy - R * y; out[3 * i + 2] = z;
    }
    return vis;
  }
  let buf = new Float32Array(3 * 4096);
  function traceRings(ctx, rings, metas, V, R, cx, cy, fillPath, strokePath) {
    for (let k = 0; k < rings.length; k++) {
      const m = metas[k], c = m.c, d = c[0] * V.dir[0] + c[1] * V.dir[1] + c[2] * V.dir[2];
      if (d < -m.sinR - 0.02) continue;
      const n = m.n; if (buf.length < 3 * n) buf = new Float32Array(3 * n * 2);
      const vis = projectRing(m, V, R, cx, cy, buf); if (!vis) continue;
      if (fillPath) { fillPath.moveTo(buf[0], buf[1]); for (let i = 1; i < n; i++) fillPath.lineTo(buf[3 * i], buf[3 * i + 1]); fillPath.closePath(); }
      if (strokePath) { let pen = false; for (let i = 0; i < n; i++) { if (buf[3 * i + 2] > 0) { pen ? strokePath.lineTo(buf[3 * i], buf[3 * i + 1]) : strokePath.moveTo(buf[3 * i], buf[3 * i + 1]); pen = true; } else pen = false; } }
    }
  }

  function shadeTexture(V, alpha) {
    const s = V.rot(SUN), W = 112, d = shadeImg.data;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const u = (i + .5) / W * 2 - 1, v = 1 - (j + .5) / W * 2, q = u * u + v * v, k = (j * W + i) * 4;
      if (q > 1) { d[k + 3] = 0; continue; }
      const z = Math.sqrt(1 - q), dot = u * s[0] + v * s[1] + z * s[2];
      const night = clamp01((0.1 - dot) / 0.26), twi = Math.exp(-((dot / 0.07) ** 2));
      d[k] = 2 + twi * 30; d[k + 1] = 8 + twi * 90; d[k + 2] = 14 + twi * 60; d[k + 3] = Math.min(255, (night * .74 + twi * .10) * 255 * alpha);
    }
    shadeCtx.putImageData(shadeImg, 0, 0); return s;
  }

  /* t: seconds since the boot started. Returns descent progress (0…1). */
  function draw(ctx, w, h, t, A) {
    prep();
    ctx.clearRect(0, 0, w, h);
    const turn = ease(clamp01((t - 0.9) / 3.9));
    const lon0 = 70 + (-98 - 70) * turn, lat0 = 6 + 32 * ease(clamp01((t - 2.4) / 2.4));
    const descent = ease(clamp01((t - 5.2) / 1.1)), fade = 1 - descent;
    const base = Math.min(w, h) * (w < 600 ? .36 : .3);
    const R = base * (0.55 + 0.45 * easeOut(clamp01(t / 1.4))) * (1 + descent * 5.5);
    const cx = w / 2, cy = h / 2 + descent * R * 0.15;
    const V = view(lon0, lat0);

    // deep space carried over from the hub: nebula wash + stars that streak as we drop
    const neb = ctx.createRadialGradient(w * .3, h * .25, 0, w * .3, h * .25, Math.max(w, h) * .9);
    neb.addColorStop(0, `rgba(122,90,214,${.16 * fade})`); neb.addColorStop(.5, `rgba(20,90,80,${.10})`); neb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neb; ctx.fillRect(0, 0, w, h);
    for (const st of stars) {
      const px = ((st.x * w + (lon0 - 70) * -0.6 * st.z) % w + w) % w, py = st.y * h, a = (.35 + .65 * Math.abs(Math.sin(t * 1.3 + st.tw))) * (.4 + .6 * st.z) * (1 - descent * .7);
      ctx.fillStyle = `rgba(${st.c},${a.toFixed(3)})`;
      if (descent > .02) { const dx = px - cx, dy = py - cy, k = descent * .35 * st.z; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = st.s; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dx * k, py + dy * k); ctx.stroke(); }
      else ctx.fillRect(px, py, st.s, st.s);
    }

    const sView = shadeTexture(V, 1);
    const sunX = sView[0], sunY = -sView[1];
    // atmosphere: outer glow, brighter toward the sun
    const glowR = R * (1.22 + descent * .4);
    const og = ctx.createRadialGradient(cx + sunX * R * .18, cy + sunY * R * .18, R * .92, cx, cy, glowR);
    og.addColorStop(0, `rgba(90,255,190,${.38 * (fade * .7 + .3)})`); og.addColorStop(.35, `rgba(60,200,170,${.14})`); og.addColorStop(1, 'rgba(40,160,150,0)');
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, 7); ctx.fill();

    // ocean
    const oc = ctx.createRadialGradient(cx + sunX * R * .35, cy + sunY * R * .35, R * .1, cx, cy, R);
    oc.addColorStop(0, '#0a3a35'); oc.addColorStop(.7, '#042420'); oc.addColorStop(1, '#021512');
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = oc; ctx.fill(); ctx.clip();

    // graticule assembles line by line
    const asm = clamp01((t - 0.2) / 1.5);
    const lines = []; for (let lat = -75; lat <= 75; lat += 15) lines.push(Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat]));
    for (let lon = -180; lon < 180; lon += 15) lines.push(Array.from({ length: 37 }, (_, i) => [lon, -90 + i * 5]));
    ctx.lineWidth = .7; ctx.strokeStyle = `rgba(120,255,190,${.13 * fade})`; ctx.beginPath();
    for (let li = 0, shown = Math.floor(lines.length * asm); li < shown; li++) { let pen = false; for (const [lo, la] of lines[li]) { const v = V.rot(unit(lo, la)); if (v[2] > 0) { const x = cx + R * v[0], y = cy - R * v[1]; pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false; } }
    ctx.stroke();

    // continents: fill + emerald coast glow + crisp coastline (fade in as the model assembles)
    const la = clamp01((t - 0.35) / 1.1);
    if (la > 0) {
      const fill = new Path2D(), coast = new Path2D(), lf = new Path2D(), ls = new Path2D();
      traceRings(ctx, land, meta, V, R, cx, cy, fill, coast);
      traceRings(ctx, lakes, lakeMeta, V, R, cx, cy, lf, ls);
      const lg = ctx.createRadialGradient(cx + sunX * R * .4, cy + sunY * R * .4, 0, cx, cy, R);
      lg.addColorStop(0, `rgba(70,210,150,${.30 * la})`); lg.addColorStop(1, `rgba(30,120,95,${.22 * la})`);
      ctx.fillStyle = lg; ctx.fill(fill, 'evenodd');
      ctx.fillStyle = `rgba(4,34,30,${.9 * la})`; ctx.fill(lf);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round'; ctx.strokeStyle = `rgba(60,255,170,${.16 * la})`; ctx.lineWidth = 3.2; ctx.stroke(coast);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = `rgba(170,255,215,${.85 * la})`; ctx.lineWidth = .85; ctx.stroke(coast); ctx.stroke(ls);
    }

    // drifting data haze (cloud layer), slides with the rotation
    const hz = .16 + descent * .5;
    ctx.globalAlpha = hz * clamp01(t / 1.5); ctx.globalCompositeOperation = 'screen';
    const off = ((lon0 * 2.2 + t * 6) % 256 + 256) % 256, sc = R * 2 / 220;
    for (let k = -1; k <= 2; k++) ctx.drawImage(haze, cx - R - off * sc + k * 256 * sc, cy - R * 1.1 - t * 2, 256 * sc, 256 * sc * 1.3);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    // the United States in the Atlas map's own state geometry → the descent lands exactly on the map
    const oa = clamp01((t - 2.6) / 1.0);
    if (oa > 0) {
      const sp = new Path2D(), sf = new Path2D(); traceRings(ctx, us, usMeta, V, R, cx, cy, sf, sp);
      ctx.fillStyle = `rgba(90,255,180,${.10 * oa})`; ctx.fill(sf);
      ctx.strokeStyle = `rgba(200,255,225,${(.55 + descent * .35) * oa})`; ctx.lineWidth = .9 + descent; ctx.stroke(sp);
    }

    // night side + twilight band
    ctx.drawImage(shade, cx - R, cy - R, 2 * R, 2 * R);

    // emerald city lights on the night side (Natural Earth populated places), gently shimmering
    if (la > 0) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < places.length; i++) {
        const [lo, lt, pw] = places[i], g = unit(lo, lt), v = V.rot(g); if (v[2] <= 0.05) continue;
        const dot = g[0] * SUN[0] + g[1] * SUN[1] + g[2] * SUN[2]; if (dot > 0.04) continue;
        const dark = clamp01((0.04 - dot) / 0.2), sh = .6 + .4 * Math.sin(t * 2.6 + i * 1.7), a = dark * sh * la * (.35 + pw * .07);
        const x = cx + R * v[0], y = cy - R * v[1], rr = (0.7 + pw * .22) * Math.max(.6, R / 260);
        ctx.fillStyle = `rgba(${pw > 6 ? '200,255,170' : '90,255,180'},${(a * .35).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, rr * 3.2, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(220,255,230,${a.toFixed(3)})`; ctx.fillRect(x - rr / 2, y - rr / 2, rr, rr);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // scan band
    if (t > 0.8 && t < 3.2) {
      const sy = cy - R + 2 * R * ((t - 0.8) / 2.4), sg = ctx.createLinearGradient(0, sy - 22, 0, sy + 2);
      sg.addColorStop(0, 'rgba(120,255,190,0)'); sg.addColorStop(1, 'rgba(190,255,220,.5)'); ctx.fillStyle = sg; ctx.fillRect(cx - R, sy - 22, 2 * R, 24);
    }
    ctx.restore();

    // rim light: thin bright limb, strongest on the sun side
    const rimA = Math.atan2(sunY, sunX);
    const rg = ctx.createLinearGradient(cx - Math.cos(rimA) * R, cy - Math.sin(rimA) * R, cx + Math.cos(rimA) * R, cy + Math.sin(rimA) * R);
    rg.addColorStop(0, `rgba(80,220,180,${.25 * fade + .1})`); rg.addColorStop(1, `rgba(200,255,230,${.95 * fade + .2})`);
    ctx.strokeStyle = rg; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    const ig = ctx.createRadialGradient(cx, cy, R * .82, cx, cy, R);
    ig.addColorStop(0, 'rgba(90,255,190,0)'); ig.addColorStop(1, `rgba(120,255,200,${.22 * fade + .08})`);
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();

    // satellite tracking orbits
    const sa = clamp01((t - 2.8) / 0.8) * fade;
    if (sa > 0) for (let k = 0; k < 3; k++) {
      const tilt = (25 + k * 38) * D2R, rot = (k * 60 + t * 22) * D2R, rr = R * (1.18 + k * .09);
      ctx.strokeStyle = `rgba(160,255,210,${.3 * sa})`; ctx.lineWidth = 1; ctx.setLineDash([4, 6]); ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, x = Math.cos(a) * rr, y = Math.sin(a) * rr * Math.cos(tilt), X = cx + x * Math.cos(rot) - y * Math.sin(rot), Y = cy + x * Math.sin(rot) + y * Math.cos(rot); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
      ctx.stroke(); ctx.setLineDash([]);
      const a = t * (0.9 + k * .35) + k, x = Math.cos(a) * rr, y = Math.sin(a) * rr * Math.cos(tilt);
      ctx.fillStyle = `rgba(230,255,200,${sa})`; ctx.beginPath(); ctx.arc(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot), 2.6, 0, 7); ctx.fill();
    }

    // encounter markers: real hub coordinates, staggered west → east
    if (t > 4.5 && A) {
      [...A.cities].sort((a, b) => a.lon - b.lon).forEach((c, i) => {
        const ap = clamp01((t - 4.5 - i * 0.012) / 0.35) * fade; if (ap <= 0) return;
        const v = V.rot(unit(c.lon, c.lat)); if (v[2] <= 0) return; const x = cx + R * v[0], y = cy - R * v[1];
        ctx.fillStyle = c.priority ? `rgba(255,110,125,${ap})` : `rgba(200,255,220,${ap})`; ctx.beginPath(); ctx.arc(x, y, 2.4 + (1 - ap) * 6, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(120,255,180,${ap * .5})`; ctx.beginPath(); ctx.arc(x, y, 6 + (1 - ap) * 10, 0, 7); ctx.stroke();
      });
    }

    // passing through the atmosphere: glow + haze veil peaks mid-descent, then the map resolves
    if (descent > 0) {
      const veil = Math.sin(Math.PI * descent);
      const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .8);
      vg.addColorStop(0, `rgba(150,255,215,${.18 * veil})`); vg.addColorStop(1, `rgba(40,180,140,${.30 * veil})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = .45 * veil; ctx.globalCompositeOperation = 'screen';
      const s2 = Math.max(w, h) / 256 * (1.3 + descent);
      ctx.drawImage(haze, cx - 128 * s2, cy - 128 * s2 - t * 30, 256 * s2, 256 * s2);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    return descent;
  }
  window.PSGlobe = { draw, prep };
})();
