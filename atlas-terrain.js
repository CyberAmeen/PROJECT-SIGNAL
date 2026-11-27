/* PROJECT SIGNAL — 3D TERRAIN VIEW
 * WebGL heightfield built from real elevation data (atlas-height.png, generated from USGS 2.5' CONUS DEM
 * and NOAA ETOPO 20' for Alaska/Hawaii, projected into the Atlas's Albers USA coordinates).
 * Hub beacons stand at their real map positions. Loaded on demand from atlas-ascension.js.
 */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mat4() { return new Float32Array(16); }
  function perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out.fill(0); out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf; return out;
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  function lookAt(out, eye, target, up) {
    const z = norm(sub(eye, target)), x = norm(cross(up, z)), y = cross(z, x);
    out.set([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]); return out;
  }
  function mul(out, a, b) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      out[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
    }
    return out;
  }
  function compile(gl, type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function program(gl, vs, fs) { const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
  const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

  const TERRAIN_VS = `
    attribute vec3 aPos; attribute vec3 aNormal; uniform mat4 uMVP; varying vec3 vN; varying vec2 vUV; varying float vH;
    void main(){ vN=aNormal; vUV=vec2(aPos.x/975.0+0.5, 0.5-aPos.y/610.0); vH=aPos.z; gl_Position=uMVP*vec4(aPos,1.0); }`;
  const TERRAIN_FS = `
    precision mediump float; varying vec3 vN; varying vec2 vUV; varying float vH; uniform sampler2D uTex; uniform vec3 uLight;
    void main(){ vec3 base=texture2D(uTex,vUV).rgb; float l=max(dot(normalize(vN),uLight),0.0);
      float lit=0.30+1.0*l; vec3 c=base*lit + vec3(0.25,0.95,0.6)*smoothstep(10.0,26.0,vH)*0.18;
      gl_FragColor=vec4(c,1.0); }`;
  const LINE_VS = `attribute vec3 aPos; attribute vec4 aCol; uniform mat4 uMVP; uniform float uSize; varying vec4 vCol;
    void main(){ vCol=aCol; gl_Position=uMVP*vec4(aPos,1.0); gl_PointSize=uSize; }`;
  const LINE_FS = `precision mediump float; varying vec4 vCol; uniform float uRound;
    void main(){ float a=1.0; if(uRound>0.5){ vec2 d=gl_PointCoord-0.5; float r=length(d); a=smoothstep(0.5,0.0,r); }
      gl_FragColor=vec4(vCol.rgb, vCol.a*a); }`;

  window.createAtlasTerrain = async function createAtlasTerrain({ frame, svg, A, onPick }) {
    const canvas = document.createElement('canvas');
    canvas.className = 'ax-terrain';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D terrain view of the archive hubs built from real elevation data. Drag to orbit, scroll or pinch to zoom, arrow keys to rotate. Use the hub list below the map to open cases.');
    const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL unavailable');
    const labels = document.createElement('div'); labels.className = 'ax-terrain-labels'; labels.setAttribute('aria-hidden', 'true');
    const hint = document.createElement('div'); hint.className = 'ax-terrain-hint'; hint.textContent = 'DRAG TO ORBIT · PINCH / SCROLL TO ZOOM · TAP A BEACON';
    const credit = document.createElement('div'); credit.className = 'ax-terrain-credit'; credit.textContent = 'Relief: USGS 2.5′ DEM (CONUS) · NOAA ETOPO (AK/HI) · vertical exaggeration';

    /* ---- heightfield ---- */
    const himg = await loadImage('atlas-height.png');
    const hc = document.createElement('canvas'); hc.width = himg.width; hc.height = himg.height;
    const hctx = hc.getContext('2d'); hctx.drawImage(himg, 0, 0);
    // keep only US land: mask heights with the Atlas's own state geometry (drops Canada/Mexico/inset slabs)
    hctx.globalCompositeOperation = 'destination-in'; hctx.save(); hctx.scale(hc.width / 975, hc.height / 610);
    hctx.fillStyle = '#fff'; svg.querySelectorAll('path.state').forEach(e => hctx.fill(new Path2D(e.getAttribute('d')))); hctx.restore();
    const hd = hctx.getImageData(0, 0, hc.width, hc.height).data, HW = hc.width, HH = hc.height;
    const ZS = 48; // vertical units at the highest point
    const heightAt = (x, y) => { // map coords → z (bilinear)
      const fx = Math.max(0, Math.min(HW - 1.001, x / 975 * HW - 0.5)), fy = Math.max(0, Math.min(HH - 1.001, y / 610 * HH - 0.5));
      const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0, g = (xx, yy) => { const o = (yy * HW + xx) * 4; return hd[o + 3] < 128 ? 0 : hd[o]; };
      const v = g(x0, y0) * (1 - ax) * (1 - ay) + g(x0 + 1, y0) * ax * (1 - ay) + g(x0, y0 + 1) * (1 - ax) * ay + g(x0 + 1, y0 + 1) * ax * ay;
      return v <= 1 ? -1.5 : (v - 1) / 254 * ZS;
    };
    const NX = 260, NY = 163;
    const pos = new Float32Array(NX * NY * 3), nrm = new Float32Array(NX * NY * 3);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const x = i / (NX - 1) * 975, y = j / (NY - 1) * 610, k = (j * NX + i) * 3;
      pos[k] = x - 487.5; pos[k + 1] = 305 - y; pos[k + 2] = heightAt(x, y);
    }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const k = (j * NX + i) * 3, l = (j * NX + Math.max(0, i - 1)) * 3, r = (j * NX + Math.min(NX - 1, i + 1)) * 3;
      const u = (Math.max(0, j - 1) * NX + i) * 3, d = (Math.min(NY - 1, j + 1) * NX + i) * 3;
      const n = norm([(pos[l + 2] - pos[r + 2]) * 1.0, (pos[d + 2] - pos[u + 2]) * 1.0, (pos[r] - pos[l])]);
      nrm[k] = n[0]; nrm[k + 1] = n[1]; nrm[k + 2] = n[2];
    }
    const idx = new Uint32Array((NX - 1) * (NY - 1) * 6); let p = 0;
    for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
      const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; idx.set([a, c, b, b, c, d], p); p += 6;
    }
    const ext = gl.getExtension('OES_element_index_uint');
    const indices = ext ? idx : Uint16Array.from(idx); // (NX*NY < 65536 is not guaranteed; ext is near-universal)

    /* ---- surface texture: real state outlines, graticule, land/water ---- */
    const TS = 2, tex = document.createElement('canvas'); tex.width = 975 * TS; tex.height = 610 * TS;
    const t = tex.getContext('2d'); t.scale(TS, TS);
    const water = t.createLinearGradient(0, 0, 0, 610); water.addColorStop(0, '#04211c'); water.addColorStop(1, '#021310');
    t.fillStyle = water; t.fillRect(0, 0, 975, 610);
    const paths = [...svg.querySelectorAll('path.state')].map(e => new Path2D(e.getAttribute('d')));
    t.fillStyle = '#1b5a4a'; paths.forEach(pp => t.fill(pp));
    t.strokeStyle = 'rgba(160,255,205,.55)'; t.lineWidth = 0.7; paths.forEach(pp => t.stroke(pp));
    try {
      const relief = await loadImage('atlas-relief.webp');
      t.save(); const land = new Path2D(); paths.forEach(pp => land.addPath(pp)); t.clip(land);
      t.globalCompositeOperation = 'overlay'; t.globalAlpha = 0.95; t.drawImage(relief, 0, 0, 975, 610); t.restore();
      t.strokeStyle = 'rgba(160,255,205,.5)'; t.lineWidth = 0.7; paths.forEach(pp => t.stroke(pp));
    } catch {}
    const grat = svg.querySelector('.ax-graticule path');
    if (grat) { t.strokeStyle = 'rgba(125,255,184,.10)'; t.lineWidth = 0.6; t.stroke(new Path2D(grat.getAttribute('d'))); }

    /* ---- GL setup ---- */
    const tp = program(gl, TERRAIN_VS, TERRAIN_FS), lp = program(gl, LINE_VS, LINE_FS);
    const buf = (data, target = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };
    const posB = buf(pos), nrmB = buf(nrm), idxB = buf(indices, gl.ELEMENT_ARRAY_BUFFER);
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // beacons
    const hubs = A.cities.map(c => { const [x, y] = A.positions[c.id]; return { c, x: x - 487.5, y: 305 - y, z: Math.max(0, heightAt(x, y)) + 0.5 }; });
    const BEAM = 46;
    const lineData = [], pointData = [];
    for (const h of hubs) {
      const col = h.c.priority ? [1, .45, .52] : (h.c.cases.length ? [.72, 1, .82] : [.55, .9, .75]);
      lineData.push(h.x, h.y, h.z, ...col, .0, h.x, h.y, h.z + BEAM, ...col, .9);
      pointData.push(h.x, h.y, h.z + BEAM, ...col, 1);
    }
    const lineB = buf(new Float32Array(lineData)), pointB = buf(new Float32Array(pointData));
    let selected = null; const selB = gl.createBuffer();

    /* ---- camera ---- */
    const cam = { yaw: 0, pitch: 89.5, dist: 760, tx: 0, ty: 0 };
    const goal = { yaw: -8, pitch: 52, dist: 1040 };
    let mvp = mat4(), proj = mat4(), view = mat4(), dirty = true, raf = 0, anim = null;
    function eyeOf() {
      const r = Math.PI / 180, cp = Math.cos(cam.pitch * r), sp = Math.sin(cam.pitch * r), s = Math.sin(cam.yaw * r), c = Math.cos(cam.yaw * r);
      return { eye: [cam.tx + cam.dist * cp * s, cam.ty - cam.dist * cp * c, cam.dist * sp], right: [c, s, 0] };
    }
    function resize() {
      const r = svg.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      const fr = frame.getBoundingClientRect(), top = (r.top - fr.top - frame.clientTop) + 'px';
      canvas.style.top = top; canvas.style.height = r.height + 'px';
      labels.style.top = top; labels.style.height = r.height + 'px';
      canvas.width = Math.max(2, Math.round(r.width * dpr)); canvas.height = Math.max(2, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height); dirty = true; kick();
    }
    function project(x, y, z) {
      const v = [x, y, z, 1], o = [0, 0, 0, 0];
      for (let i = 0; i < 4; i++) o[i] = mvp[i] * v[0] + mvp[4 + i] * v[1] + mvp[8 + i] * v[2] + mvp[12 + i];
      if (o[3] <= 0) return null;
      return [(o[0] / o[3] * .5 + .5) * canvas.clientWidth, (.5 - o[1] / o[3] * .5) * canvas.clientHeight, o[3]];
    }
    function draw() {
      dirty = false;
      const { eye, right } = eyeOf(), target = [cam.tx, cam.ty, 0], fwd = norm(sub(target, eye)), up = cross(right, fwd);
      perspective(proj, 38 * Math.PI / 180, canvas.width / canvas.height, 4, 5000); lookAt(view, eye, target, up); mul(mvp, proj, view);
      gl.clearColor(0.008, 0.06, 0.05, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(tp);
      gl.uniformMatrix4fv(gl.getUniformLocation(tp, 'uMVP'), false, mvp);
      gl.uniform3fv(gl.getUniformLocation(tp, 'uLight'), norm([-0.55, 0.6, 0.75]));
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture); gl.uniform1i(gl.getUniformLocation(tp, 'uTex'), 0);
      let loc = gl.getAttribLocation(tp, 'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER, posB); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
      const nloc = gl.getAttribLocation(tp, 'aNormal'); gl.bindBuffer(gl.ARRAY_BUFFER, nrmB); gl.enableVertexAttribArray(nloc); gl.vertexAttribPointer(nloc, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxB);
      gl.drawElements(gl.TRIANGLES, indices.length, ext ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
      gl.disableVertexAttribArray(nloc);
      // beacons
      gl.useProgram(lp); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false);
      gl.uniformMatrix4fv(gl.getUniformLocation(lp, 'uMVP'), false, mvp);
      const pl = gl.getAttribLocation(lp, 'aPos'), cl = gl.getAttribLocation(lp, 'aCol');
      const bind = b => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 3, gl.FLOAT, false, 28, 0); gl.enableVertexAttribArray(cl); gl.vertexAttribPointer(cl, 4, gl.FLOAT, false, 28, 12); };
      gl.uniform1f(gl.getUniformLocation(lp, 'uRound'), 0); bind(lineB); gl.drawArrays(gl.LINES, 0, hubs.length * 2);
      const ps = Math.max(6, 14 * Math.min(2, devicePixelRatio || 1) * (900 / cam.dist));
      gl.uniform1f(gl.getUniformLocation(lp, 'uRound'), 1); gl.uniform1f(gl.getUniformLocation(lp, 'uSize'), ps); bind(pointB); gl.drawArrays(gl.POINTS, 0, hubs.length);
      if (selected) {
        gl.bindBuffer(gl.ARRAY_BUFFER, selB); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([selected.x, selected.y, selected.z + BEAM, .85, 1, .5, 1]), gl.DYNAMIC_DRAW);
        bind(selB); gl.uniform1f(gl.getUniformLocation(lp, 'uSize'), ps * 2.6); gl.drawArrays(gl.POINTS, 0, 1);
      }
      gl.disableVertexAttribArray(cl); gl.depthMask(true); gl.disable(gl.BLEND);
      // labels: selected hub + priority hubs
      const show = hubs.filter(h => h.c.priority || h === selected).sort((a, b) => (b === selected) - (a === selected));
      const placed = [], cw = canvas.clientWidth, fsz = cw < 520 ? 10 : 11;
      labels.innerHTML = show.map(h => {
        const s = project(h.x, h.y, h.z + BEAM); if (!s) return '';
        const w = h.c.name.length * fsz * 0.66, box = [s[0] + 8, s[1] - 26, s[0] + 8 + w, s[1] - 26 + fsz + 4];
        if (box[2] > cw - 4 || box[0] < 2 || box[1] < 2) return '';
        if (placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) return '';
        placed.push(box);
        return `<span class="${h === selected ? 'sel' : ''}" style="transform:translate(${s[0].toFixed(1)}px,${s[1].toFixed(1)}px)">${h.c.name}</span>`;
      }).join('');
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    function loop(now) {
      raf = 0;
      if (anim) {
        const p = Math.min(1, (now - anim.t0) / anim.dur), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        for (const k of ['yaw', 'pitch', 'dist']) cam[k] = anim.from[k] + (anim.to[k] - anim.from[k]) * e;
        dirty = true; if (p >= 1) anim = null;
      }
      if (dirty) draw();
      if (anim) kick();
    }
    function animateTo(to, dur = 1300) { if (reduced()) { Object.assign(cam, to); dirty = true; kick(); return; } anim = { from: { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist }, to, dur, t0: performance.now() }; kick(); }

    /* ---- interaction ---- */
    const ptrs = new Map(); let dragged = false, pinch0 = 0, dist0 = 0;
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); dragged = false; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = cam.dist; } anim = null; });
    canvas.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId), dx = e.clientX - prev[0], dy = e.clientY - prev[1];
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) cam.dist = Math.max(220, Math.min(1600, dist0 * pinch0 / d)); }
      else { cam.yaw -= dx * 0.3; cam.pitch = Math.max(18, Math.min(89.5, cam.pitch + dy * 0.25)); }
      if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
      dirty = true; kick();
    });
    const up = e => {
      const wasTap = !dragged && ptrs.size === 1; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0;
      if (wasTap && e.type === 'pointerup') {
        const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        let best = null, bd = 30;
        for (const h of hubs) { const s = project(h.x, h.y, h.z + BEAM); if (!s) continue; const d = Math.hypot(s[0] - mx, s[1] - my); if (d < bd) { bd = d; best = h; } }
        if (best) { selected = best; dirty = true; kick(); onPick(best.c.id); }
      }
    };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.max(220, Math.min(1600, cam.dist * Math.exp(e.deltaY * 0.0012))); anim = null; dirty = true; kick(); }, { passive: false });
    canvas.addEventListener('keydown', e => {
      const k = { ArrowLeft: [6, 0], ArrowRight: [-6, 0], ArrowUp: [0, 4], ArrowDown: [0, -4] }[e.key];
      if (k) { e.preventDefault(); cam.yaw += k[0]; cam.pitch = Math.max(18, Math.min(89.5, cam.pitch + k[1])); dirty = true; kick(); }
      if (e.key === '+' || e.key === '=') { cam.dist = Math.max(220, cam.dist * .88); dirty = true; kick(); }
      if (e.key === '-') { cam.dist = Math.min(1600, cam.dist / .88); dirty = true; kick(); }
    });
    const ro = new ResizeObserver(resize);

    return {
      mount() {
        frame.append(canvas, labels, hint, credit); ro.observe(svg); resize();
        Object.assign(cam, { yaw: 0, pitch: 89.5, dist: 1180 }); dirty = true;
        const a = A.active && hubs.find(h => h.c.id === A.active); selected = a || null;
        const asp = canvas.clientWidth / Math.max(1, canvas.clientHeight); animateTo({ ...goal, dist: goal.dist * Math.max(1, 1.5 / asp) });
        canvas.focus({ preventScroll: true });
      },
      unmount() { ro.disconnect(); cancelAnimationFrame(raf); raf = 0; canvas.remove(); labels.remove(); hint.remove(); credit.remove(); },
      select(id) { selected = hubs.find(h => h.c.id === id) || null; dirty = true; kick(); },
      reset() { const asp = canvas.clientWidth / Math.max(1, canvas.clientHeight); animateTo({ ...goal, dist: goal.dist * Math.max(1, 1.5 / asp) }, 900); },
    };
  };
})();
