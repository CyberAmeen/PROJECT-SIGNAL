/* PROJECT SIGNAL — OPERATION ATLAS ASCENSION (M2–M5)
 * Cinematic initialization + orbital descent + signal pulse, classified dossiers, marker polish,
 * targeting cursor, density / constellation layers, cartographic depth.
 * All figures shown are derived from the local archive in index.html (window.__atlas). Nothing here
 * contacts a backend or simulates live data.
 */
(() => {
  const A = window.__atlas;
  if (!A) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svgEl = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

  const shell = $('#atlas-shell'), svg = $('#atlas-map-svg'), frame = $('.atlas-map-frame');
  const contents = $('#atlas-map-contents'), pins = $('#atlas-map-pins'), detail = $('#atlas-detail');
  if (!shell || !svg || !frame || !contents || !pins) return;

  const cityById = Object.fromEntries(A.cities.map(c => [c.id, c]));
  const addById = Object.fromEntries(A.additions.map(r => [r.id, r]));
  const archById = Object.fromEntries(A.archive.map(r => [r.id, r]));
  const hubCount = c => c.cases.length + A.additions.filter(r => r.hub === c.id).length;
  const refreshHud = () => window.__atlasLabels && window.__atlasLabels();
  const years = [...A.archive, ...A.additions].map(r => parseInt(String(r.date).match(/\d{4}/)?.[0], 10)).filter(Boolean);
  const STATS = {
    hubs: A.cities.length,
    records: A.archive.length + A.additions.length,
    cases: A.archive.length,
    nuforc: A.additions.length,
    sources: A.archive.reduce((a, r) => a + r.sources.length, 0),
    first: Math.min(...years),
    last: Math.max(...years),
  };

  /* ------------------------------------------------------------------ *
   * 1. MARKERS — hub types, targeting rings, accessible labels
   * ------------------------------------------------------------------ */
  for (const g of $$('.atlas-city', pins)) {
    const c = cityById[g.dataset.id]; if (!c) continue;
    const [x, y] = A.positions[c.id];
    const sourced = c.cases.length > 0;
    g.classList.add(sourced ? 'ax-sourced' : 'ax-submissions');
    const t = svgEl('g', { class: 'ax-target', 'aria-hidden': 'true' });
    svgEl('circle', { class: 'ax-ring', cx: x, cy: y, r: 19 }, t);
    svgEl('path', { class: 'ax-ticks', d: `M${x - 27},${y}h7M${x + 20},${y}h7M${x},${y - 27}v7M${x},${y + 20}v7` }, t);
    g.insertBefore(t, g.firstChild);
    if (c.priority) g.insertBefore(svgEl('circle', { class: 'ax-ping', cx: x, cy: y, r: 12, 'aria-hidden': 'true' }), g.firstChild);
    const n = hubCount(c);
    g.setAttribute('aria-label', `${c.name}: ${n} archive record${n === 1 ? '' : 's'}${sourced ? `, including ${c.cases.length} sourced case${c.cases.length === 1 ? '' : 's'}` : ', witness submissions only'}. Press Enter to open the hub.`);
  }
  const legend = $('.atlas-legend');
  if (legend) legend.innerHTML = '<span style="color:#ff818d">●</span> TOP 10 REPORTING HUBS &nbsp; ◉ SOURCED CASES &nbsp; ◌ SUBMISSIONS ONLY';

  /* ------------------------------------------------------------------ *
   * 2. CARTOGRAPHIC DEPTH — graticule + coastline light
   * ------------------------------------------------------------------ */
  // Forward d3.geoAlbersUsa (lower 48): scale 1300, translate [487.5, 305]
  const albers = (() => {
    const r = Math.PI / 180, p0 = 29.5 * r, p1 = 45.5 * r, n = (Math.sin(p0) + Math.sin(p1)) / 2;
    const C = Math.cos(p0) ** 2 + 2 * n * Math.sin(p0), r0 = Math.sqrt(C) / n;
    const raw = (l, f) => { const rho = Math.sqrt(C - 2 * n * Math.sin(f)) / n; return [rho * Math.sin(l * n), r0 - rho * Math.cos(l * n)]; };
    const c = raw(-0.6 * r, 38.7 * r);
    return (lon, lat) => { const p = raw((lon + 96) * r, lat * r); return [487.5 + 1300 * (p[0] - c[0]), 305 - 1300 * (p[1] - c[1])]; };
  })();
  const firstState = $('path.state', contents);
  if (firstState) {
    const grat = svgEl('g', { class: 'ax-graticule', 'aria-hidden': 'true' });
    let d = '';
    for (let lat = 25; lat <= 50; lat += 5) { d += 'M'; for (let lon = -126; lon <= -64; lon += 1) d += albers(lon, lat).map(v => v.toFixed(1)).join(',') + (lon < -64 ? 'L' : ''); }
    for (let lon = -125; lon <= -65; lon += 5) { d += 'M'; for (let lat = 24; lat <= 50; lat += 0.5) d += albers(lon, lat).map(v => v.toFixed(1)).join(',') + (lat < 50 ? 'L' : ''); }
    svgEl('path', { d }, grat);
    contents.insertBefore(grat, firstState);
    if (!matchMedia('(max-width: 760px)').matches) {
      const defs = $('defs', svg) || svgEl('defs', {}, svg);
      const f = svgEl('filter', { id: 'axCoast', x: '-5%', y: '-5%', width: '110%', height: '110%' }, defs);
      svgEl('feGaussianBlur', { stdDeviation: '3.2' }, f);
      const coast = svgEl('g', { class: 'ax-coast', filter: 'url(#axCoast)', 'aria-hidden': 'true' });
      for (const p of $$('path.state', contents)) svgEl('path', { d: p.getAttribute('d') }, coast);
      contents.insertBefore(coast, firstState);
    }
  }

  /* ------------------------------------------------------------------ *
   * 3. LAYERS — encounter density + signal constellations
   * ------------------------------------------------------------------ */
  const layerGroup = svgEl('g', { id: 'ax-layers', 'aria-hidden': 'true' });
  contents.insertBefore(layerGroup, pins);
  const densG = svgEl('g', { class: 'ax-density' }, layerGroup);
  const constG = svgEl('g', { class: 'ax-constellations' }, layerGroup);
  {
    const defs = $('defs', svg);
    const rg = svgEl('radialGradient', { id: 'axDens' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': '#c8ff7a', 'stop-opacity': '.85' }, rg);
    svgEl('stop', { offset: '.45', 'stop-color': '#3dffa0', 'stop-opacity': '.35' }, rg);
    svgEl('stop', { offset: '1', 'stop-color': '#0aa36b', 'stop-opacity': '0' }, rg);
  }
  const maxCount = Math.max(...A.cities.map(hubCount));
  for (const c of A.cities) {
    const n = hubCount(c); if (!n) continue;
    const [x, y] = A.positions[c.id];
    svgEl('circle', { cx: x, cy: y, r: (14 + 34 * Math.sqrt(n / maxCount)).toFixed(1), fill: 'url(#axDens)' }, densG);
  }

  const CRITERIA = {
    case: { label: 'Same case, several hubs', note: 'Links hubs that list the same documented case.' },
    category: { label: 'Same classification', note: 'Links hubs holding sourced cases with the same classification (shortest-path tree per class).' },
    decade: { label: 'Same decade', note: 'Links hubs holding sourced cases from the same decade (shortest-path tree per decade).' },
  };
  const PALETTE = ['#7dffb8', '#9ee7ff', '#ffd27a', '#ff9ec4', '#c4b5ff', '#b9ff6a', '#7af0e0', '#ffb38a'];
  const dist = (a, b) => { const p = A.positions[a], q = A.positions[b]; return Math.hypot(p[0] - q[0], p[1] - q[1]); };
  function mst(ids) { // Prim's algorithm on map distance — keeps lines to n-1 per group
    const left = [...new Set(ids)]; if (left.length < 2) return [];
    const inTree = [left.shift()], edges = [];
    while (left.length) {
      let best = null;
      for (const a of inTree) for (const b of left) { const d = dist(a, b); if (!best || d < best[2]) best = [a, b, d]; }
      edges.push([best[0], best[1]]); inTree.push(best[1]); left.splice(left.indexOf(best[1]), 1);
    }
    return edges;
  }
  function buildEdges(kind) {
    const groups = new Map();
    const add = (key, e) => { if (!groups.has(key)) groups.set(key, []); groups.get(key).push(e); };
    if (kind === 'case') {
      for (const r of A.archive) if (r.hubs.length > 1) for (const h of r.hubs.slice(1)) add(r.title, [r.hubs[0], h]);
    } else {
      const buckets = new Map();
      for (const r of A.archive) {
        const key = kind === 'category' ? r.category : (() => { const y = parseInt(String(r.date).match(/\d{4}/)?.[0], 10); return y ? `${Math.floor(y / 10) * 10}s` : null; })();
        if (!key) continue;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(...r.hubs);
      }
      for (const [k, ids] of buckets) for (const e of mst(ids)) add(k, e);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }
  let layerState = { density: false, constellations: false, criterion: 'case' };
  function drawConstellations() {
    constG.textContent = '';
    if (!layerState.constellations) return [];
    const groups = buildEdges(layerState.criterion);
    groups.forEach(([key, edges], gi) => {
      const color = PALETTE[gi % PALETTE.length];
      for (const [a, b] of edges) {
        const [x1, y1] = A.positions[a], [x2, y2] = A.positions[b];
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
        const off = Math.min(60, len * 0.16), cx = mx - dy / len * off, cy = my + dx / len * off;
        const p = svgEl('path', { d: `M${x1},${y1}Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2},${y2}`, stroke: color, class: 'ax-link' }, constG);
        const t = svgEl('title', {}, p); t.textContent = `${cityById[a].name} ↔ ${cityById[b].name} — ${CRITERIA[layerState.criterion].label}: ${key}`;
      }
    });
    return groups;
  }
  const layerBar = document.createElement('div');
  layerBar.className = 'ax-layers';
  layerBar.setAttribute('role', 'toolbar'); layerBar.setAttribute('aria-label', 'Map views and layers');
  layerBar.innerHTML = `<button type="button" data-layer="density" aria-pressed="false">◉ Encounter density</button><button type="button" data-layer="constellations" aria-pressed="false">✦ Signal constellations</button><select aria-label="Constellation connection criterion" hidden>${Object.entries(CRITERIA).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}</select>`;
  svg.after(layerBar);
  const legendBox = document.createElement('div');
  legendBox.className = 'ax-legend'; legendBox.hidden = true; legendBox.setAttribute('role', 'note');
  frame.append(legendBox);
  function applyLayers() {
    densG.classList.toggle('on', layerState.density);
    const groups = drawConstellations();
    $$('button[data-layer]', layerBar).forEach(b => b.setAttribute('aria-pressed', String(!!layerState[b.dataset.layer])));
    const sel = $('select', layerBar); sel.hidden = !layerState.constellations; sel.value = layerState.criterion;
    let html = '';
    if (layerState.density) html += `<section><h4>Encounter density</h4><div class="ax-ramp"><span>fewer</span><i></i><span>more</span></div><p>Glow size reflects archive records filed per hub (sourced cases + NUFORC submissions). It shows where reports are collected, not evidence of extraterrestrial activity.</p></section>`;
    if (layerState.constellations) {
      const crit = CRITERIA[layerState.criterion], total = groups.reduce((a, g) => a + g[1].length, 0);
      html += `<section><h4>Signal constellations · ${esc(crit.label)}</h4><p>${esc(crit.note)} ${total} link${total === 1 ? '' : 's'}.</p><ul>${groups.slice(0, 7).map(([k], i) => `<li><i style="background:${PALETTE[i % PALETTE.length]}"></i>${esc(k)}</li>`).join('')}${groups.length > 7 ? `<li class="more">+${groups.length - 7} more groups</li>` : ''}</ul><p class="ax-caveat">Lines mark shared documented attributes only. They do not imply the events are connected or caused by one another.</p></section>`;
    }
    legendBox.innerHTML = html; legendBox.hidden = !html;
    const modes = [layerState.density && 'DENSITY', layerState.constellations && `CONSTELLATIONS · ${CRITERIA[layerState.criterion].label.toUpperCase()}`].filter(Boolean);
    window.__atlasMode = modes.length ? modes.join(' + ') : 'STANDARD';
    refreshHud();
  }
  layerBar.addEventListener('click', e => { const b = e.target.closest('button[data-layer]'); if (!b) return; layerState[b.dataset.layer] = !layerState[b.dataset.layer]; applyLayers(); });
  $('select', layerBar).addEventListener('change', e => { layerState.criterion = e.target.value; applyLayers(); });


  /* ------------------------------------------------------------------ *
   * 4. TARGETING CURSOR (desktop) + TAP TARGETING (touch)
   * ------------------------------------------------------------------ */
  const reticle = document.createElement('div');
  reticle.className = 'ax-reticle'; reticle.setAttribute('aria-hidden', 'true');
  reticle.innerHTML = '<i class="ax-r1"></i><i class="ax-r2"></i><b></b>';
  frame.append(reticle);
  const frameXY = e => { const r = frame.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  svg.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !finePointer.matches) return;
    const [x, y] = frameXY(e);
    reticle.style.transform = `translate(${x}px,${y}px)`;
    const g = e.target.closest && e.target.closest('.atlas-city');
    reticle.classList.add('on'); reticle.classList.toggle('lock', !!g);
    $('b', reticle).textContent = g ? `LOCK // ${cityById[g.dataset.id]?.name || ''}` : '';
  }, { passive: true });
  svg.addEventListener('pointerleave', () => reticle.classList.remove('on', 'lock'));
  svg.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') { reticle.classList.add('press'); return; }
    const [x, y] = frameXY(e), tap = document.createElement('span');
    tap.className = 'ax-tap'; tap.style.left = x + 'px'; tap.style.top = y + 'px';
    frame.append(tap); setTimeout(() => tap.remove(), 650);
  }, { passive: true });
  addEventListener('pointerup', () => reticle.classList.remove('press'), { passive: true });

  /* ------------------------------------------------------------------ *
   * 5. CLASSIFIED DOSSIERS
   * ------------------------------------------------------------------ */
  const dossier = document.createElement('aside');
  dossier.className = 'ax-dossier'; dossier.hidden = true;
  dossier.setAttribute('role', 'dialog'); dossier.setAttribute('aria-modal', 'false'); dossier.setAttribute('aria-labelledby', 'ax-dossier-title');
  const scrim = document.createElement('div'); scrim.className = 'ax-scrim'; scrim.hidden = true;
  shell.append(scrim, dossier);
  let lastFocus = null;
  const field = (label, value, raw = false) => value ? `<div class="ax-field"><dt>${esc(label)}</dt><dd>${raw ? value : esc(value)}</dd></div>` : '';
  function openDossier(id) {
    const a = archById[id], n = addById[id], r = a || n; if (!r) return;
    const hubs = a ? a.hubs : [n.hub];
    const hubNames = hubs.map(h => cityById[h]?.name || h).join(', ');
    const caseId = a ? a.id.toUpperCase() : `NUFORC-${String(n.id).replace(/^nuforc-/, '')}`;
    const sources = a ? a.sources : [{ label: `NUFORC report ${String(n.id).replace(/^nuforc-/, '')}`, url: n.url }];
    const evidence = a ? `${a.sources.length} cited source${a.sources.length === 1 ? '' : 's'} on file. Summary written from those sources — consult originals for detail.` : 'Single witness submission. No corroborating evidence is recorded in this archive.';
    const precision = a ? `Marker shows the regional hub, not the incident site. Reported location: ${a.place}.` : (n.precision || 'Reported locality; hub marker is regional.');
    dossier.innerHTML = `
      <div class="ax-dossier-head">
        <div class="ax-kicker">◈ CLASSIFIED ENCOUNTER DOSSIER</div>
        <button type="button" class="ax-close" aria-label="Close dossier">✕</button>
      </div>
      <div class="ax-stamp" aria-hidden="true">DECLASSIFIED · ARCHIVE COPY</div>
      <div class="ax-caseid">${esc(caseId)}</div>
      <h3 id="ax-dossier-title">${esc(r.title)}</h3>
      ${a && a.image ? `<figure class="ax-hero"><a href="${esc(a.image.page)}" target="_blank" rel="noopener noreferrer" aria-label="Open image on Wikimedia Commons"><img src="${esc(a.image.full)}" alt="${esc(a.image.caption)}" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('figure').remove()"></a><figcaption><span class="ax-hero-kind">${esc(a.image.kind)}</span>${esc(a.image.caption)}<small>${esc(a.image.credit)} · <a href="${esc(a.image.page)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons ↗</a></small></figcaption></figure>` : ''}
      <dl class="ax-fields">
        ${field('Date', r.date)}
        ${field('Location', r.place)}
        ${field('Classification', r.category)}
        ${field('Filed under', hubNames)}
        ${field('Verification status', r.status)}
        ${n ? field('Witness context', 'Civilian witness submission to the National UFO Reporting Center (NUFORC).') : ''}
        ${field('Evidence status', evidence)}
        ${field('Location uncertainty', precision)}
        ${field(a ? 'Report summary' : 'Report excerpt', a ? a.summary : `“${n.excerpt}”`)}
        ${a && a.legacyIds?.length ? field('Archive lineage', `Consolidates original index entries ${a.legacyIds.join(', ')}.`) : ''}
      </dl>
      <div class="ax-sources"><h4>Source references</h4>${sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>`).join('')}</div>
      <p class="ax-dossier-note">Archive dossiers describe reports, allegations and investigations. Inclusion does not establish extraterrestrial activity.</p>`;
    $$('.ax-field', dossier).forEach((f, i) => f.style.setProperty('--d', `${120 + i * 70}ms`));
    lastFocus = document.activeElement;
    dossier.hidden = false; scrim.hidden = false;
    dossier.classList.remove('ax-in'); void dossier.offsetWidth; dossier.classList.add('ax-in');
    dossier.scrollTop = 0;
    $('.ax-close', dossier).focus({ preventScroll: true });
  }
  function closeDossier() {
    if (dossier.hidden) return;
    dossier.hidden = true; scrim.hidden = true;
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  dossier.addEventListener('click', e => { if (e.target.closest('.ax-close')) closeDossier(); });
  scrim.addEventListener('click', closeDossier);
  if (detail) {
    detail.addEventListener('click', e => {
      if (e.target.closest('a,select,button,option')) return;
      const card = e.target.closest('.atlas-case[data-record]'); if (card) openDossier(card.dataset.record);
    });
    detail.addEventListener('keydown', e => {
      const card = e.target.closest && e.target.closest('.atlas-case[data-record]');
      if (card && e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDossier(card.dataset.record); }
    });
    const enhance = () => $$('.atlas-case[data-record]:not([tabindex])', detail).forEach(card => {
      card.tabIndex = 0; card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Open dossier: ${card.querySelector('h4')?.textContent || 'case'}`);
      const cue = document.createElement('span'); cue.className = 'ax-open-cue'; cue.textContent = 'OPEN DOSSIER ›'; cue.setAttribute('aria-hidden', 'true');
      card.querySelector('.atlas-case-top')?.append(cue);
    });
    new MutationObserver(enhance).observe(detail, { childList: true, subtree: true });
    enhance();
  }

  /* ------------------------------------------------------------------ *
   * 6. SIGNAL PULSE — a sweep that lights each archive marker it crosses
   * ------------------------------------------------------------------ */
  let pulseRaf = 0;
  function signalPulse() {
    cancelAnimationFrame(pulseRaf);
    $$('.ax-sweep', contents).forEach(n => n.remove());
    if (reduced()) return;
    const defs = $('defs', svg);
    if (!$('#axSweep', svg)) {
      const lg = svgEl('linearGradient', { id: 'axSweep' }, defs);
      svgEl('stop', { offset: '0', 'stop-color': '#6dffb0', 'stop-opacity': '0' }, lg);
      svgEl('stop', { offset: '.82', 'stop-color': '#6dffb0', 'stop-opacity': '.20' }, lg);
      svgEl('stop', { offset: '1', 'stop-color': '#e6ffd0', 'stop-opacity': '.85' }, lg);
    }
    const band = svgEl('rect', { class: 'ax-sweep', x: -120, y: -20, width: 120, height: 650, fill: 'url(#axSweep)' });
    contents.insertBefore(band, pins);
    const dur = 1900, t0 = performance.now(), hit = new Set(), groups = $$('.atlas-city', pins);
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), front = -20 + p * 1015;
      band.setAttribute('x', (front - 120).toFixed(1));
      for (const g of groups) {
        if (hit.has(g)) continue;
        if (A.positions[g.dataset.id][0] <= front) { hit.add(g); g.classList.remove('ax-hit'); g.getBoundingClientRect(); g.classList.add('ax-hit'); setTimeout(() => g.classList.remove('ax-hit'), 1300); }
      }
      if (p < 1) pulseRaf = requestAnimationFrame(step); else band.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350 }).onfinish = () => band.remove();
    };
    pulseRaf = requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------ *
   * 7. CINEMATIC INITIALIZATION + ORBITAL DESCENT
   * ------------------------------------------------------------------ */
  const OUTLINE = window.__atlasOutline || [];
  let boot = null;
  function buildBoot() {
    const el = document.createElement('div');
    el.className = 'ax-boot';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Encounter Atlas initialization');
    let circuit = '';
    const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
    for (let i = 0; i < 18; i++) {
      const left = i % 2 === 0, y = 40 + rnd() * 520, x0 = left ? 0 : 1000, dir = left ? 1 : -1;
      const x1 = x0 + dir * (90 + rnd() * 160), y1 = y + (rnd() - .5) * 120, x2 = x1 + dir * (40 + rnd() * 120);
      circuit += `<path d="M${x0},${y.toFixed(0)}H${x1.toFixed(0)}L${(x1 + dir * 30).toFixed(0)},${y1.toFixed(0)}H${x2.toFixed(0)}" style="--i:${i}"/><circle cx="${x2.toFixed(0)}" cy="${y1.toFixed(0)}" r="3" style="--i:${i}"/>`;
    }
    el.innerHTML = `
      <svg class="ax-circuit" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">${circuit}</svg>
      <canvas class="ax-globe" aria-hidden="true"></canvas>
      <div class="ax-hud ax-hud-l" aria-hidden="true">
        <div>ARCHIVE INDEX // LOCAL</div><div>HUBS <b>${STATS.hubs}</b></div><div>RECORDS <b>${STATS.records}</b></div>
        <div>SOURCED CASES <b>${STATS.cases}</b></div><div>CITED SOURCES <b>${STATS.sources}</b></div><div>NUFORC SUBMISSIONS <b>${STATS.nuforc}</b></div>
        <div>SPAN <b>${STATS.first}–${STATS.last}</b></div><div>PROJECTION <b>ALBERS USA</b></div>
      </div>
      <div class="ax-hud ax-hud-r" aria-hidden="true"></div>
      <div class="ax-boot-center">
        <div class="ax-boot-kicker">PROJECT SIGNAL // GEOSPATIAL ARCHIVE</div>
        <div class="ax-boot-title">ENCOUNTER ATLAS</div>
        <div class="ax-boot-phase" aria-live="polite">TERMINAL ACTIVATION</div>
        <div class="ax-boot-bar"><i></i></div>
        <div class="ax-boot-note">Historical archive · not live sightings</div>
      </div>
      <button type="button" class="ax-skip">Skip intro ›</button>`;
    return el;
  }
  const PHASES = [
    [0.0, 'TERMINAL ACTIVATION'],
    [0.9, `LOADING LOCAL ARCHIVE · ${STATS.hubs} HUBS · ${STATS.records} RECORDS`],
    [1.9, 'ASSEMBLING ORBITAL MODEL'],
    [2.9, 'SYNCHRONIZING TRACKING GEOMETRY'],
    [3.8, 'GEOSPATIAL ACQUISITION · NORTH AMERICA'],
    [4.6, 'INITIALIZING ENCOUNTER MARKERS'],
    [5.3, 'DESCENDING TO ATLAS'],
  ];
  const DURATION = 6.3;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const clamp01 = v => Math.max(0, Math.min(1, v));

  function drawGlobe(ctx, w, h, t) {
    ctx.clearRect(0, 0, w, h);
    const r = Math.PI / 180;
    const turn = ease(clamp01((t - 1.6) / 3.0));
    const lam0 = (-20 + (-98 + 20) * turn) * r, phi0 = (8 + 30 * turn) * r;
    const descent = ease(clamp01((t - 5.2) / 1.1));
    const base = Math.min(w, h) * (w < 600 ? .34 : .29);
    const R = base * (0.6 + 0.4 * ease(clamp01(t / 1.2))) * (1 + descent * 5.5);
    const cx = w / 2, cy = h / 2 + descent * R * 0.15;
    const sp = Math.sin(phi0), cp = Math.cos(phi0);
    const proj = (lon, lat) => {
      const l = lon * r - lam0, p = lat * r, cosc = sp * Math.sin(p) + cp * Math.cos(p) * Math.cos(l);
      return [cx + R * Math.cos(p) * Math.sin(l), cy - R * (cp * Math.sin(p) - sp * Math.cos(p) * Math.cos(l)), cosc];
    };
    const fadeOut = 1 - descent;
    // atmosphere
    const g = ctx.createRadialGradient(cx, cy, R * .2, cx, cy, R * 1.25);
    g.addColorStop(0, `rgba(20,90,70,${.35 * fadeOut})`); g.addColorStop(.8, `rgba(40,255,160,${.10 * fadeOut})`); g.addColorStop(1, 'rgba(40,255,160,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(150,255,200,${.55 * fadeOut})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    // graticule assembles line by line
    const asm = clamp01((t - 0.3) / 1.6);
    ctx.lineWidth = 0.8;
    const lines = [];
    for (let lat = -75; lat <= 75; lat += 15) lines.push(Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat]));
    for (let lon = -180; lon < 180; lon += 15) lines.push(Array.from({ length: 37 }, (_, i) => [lon, -90 + i * 5]));
    const shown = Math.floor(lines.length * asm);
    for (let li = 0; li < shown; li++) {
      ctx.strokeStyle = `rgba(110,255,180,${0.22 * fadeOut})`; ctx.beginPath(); let pen = false;
      for (const [lon, lat] of lines[li]) { const [x, y, c] = proj(lon, lat); if (c > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false; }
      ctx.stroke();
    }
    // scan band
    if (t > 0.8 && t < 3.2) {
      const sy = cy - R + 2 * R * ((t - 0.8) / 2.4);
      const sg = ctx.createLinearGradient(0, sy - 18, 0, sy + 2);
      sg.addColorStop(0, 'rgba(120,255,190,0)'); sg.addColorStop(1, 'rgba(190,255,220,.55)');
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip(); ctx.fillStyle = sg; ctx.fillRect(cx - R, sy - 18, 2 * R, 20); ctx.restore();
    }
    // US outlines (real state geometry, inverse-projected from the Atlas map)
    const oa = clamp01((t - 2.1) / 1.0) * fadeOut;
    if (oa > 0) {
      ctx.strokeStyle = `rgba(190,255,215,${0.8 * oa})`; ctx.fillStyle = `rgba(60,220,150,${0.10 * oa})`; ctx.lineWidth = 1;
      for (const ring of OUTLINE) {
        ctx.beginPath(); let pen = false, vis = 0;
        for (let i = 0; i < ring.length; i += 2) { const [x, y, c] = proj(ring[i], ring[i + 1]); if (c > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; vis++; } else pen = false; }
        if (vis > 2) { ctx.fill(); ctx.stroke(); }
      }
    }
    // satellite tracking orbits
    const sa = clamp01((t - 2.8) / 0.8) * fadeOut;
    if (sa > 0) {
      for (let k = 0; k < 3; k++) {
        const tilt = (25 + k * 38) * r, rot = (k * 60 + t * 22) * r, rr = R * (1.18 + k * .09);
        ctx.strokeStyle = `rgba(160,255,210,${0.35 * sa})`; ctx.setLineDash([4, 6]); ctx.beginPath();
        for (let i = 0; i <= 120; i++) {
          const a = i / 120 * Math.PI * 2, x = Math.cos(a) * rr, y = Math.sin(a) * rr * Math.cos(tilt);
          const X = cx + x * Math.cos(rot) - y * Math.sin(rot), Y = cy + x * Math.sin(rot) + y * Math.cos(rot);
          i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.stroke(); ctx.setLineDash([]);
        const a = t * (0.9 + k * .35) + k, x = Math.cos(a) * rr, y = Math.sin(a) * rr * Math.cos(tilt);
        ctx.fillStyle = `rgba(230,255,200,${sa})`; ctx.beginPath();
        ctx.arc(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot), 2.6, 0, 7); ctx.fill();
      }
    }
    // encounter markers: real hub coordinates, staggered west → east
    if (t > 4.5) {
      const sorted = [...A.cities].sort((a, b) => a.lon - b.lon);
      sorted.forEach((c, i) => {
        const appear = clamp01((t - 4.5 - i * 0.012) / 0.35) * fadeOut; if (appear <= 0) return;
        const [x, y, cc] = proj(c.lon, c.lat); if (cc <= 0) return;
        ctx.fillStyle = c.priority ? `rgba(255,110,125,${appear})` : `rgba(200,255,220,${appear})`;
        ctx.beginPath(); ctx.arc(x, y, 2.4 + (1 - appear) * 6, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(120,255,180,${appear * .5})`; ctx.beginPath(); ctx.arc(x, y, 6 + (1 - appear) * 10, 0, 7); ctx.stroke();
      });
    }
    return descent;
  }

  function finishBoot(skipped) {
    if (!boot) return;
    const b = boot; boot = null;
    cancelAnimationFrame(b.raf); clearTimeout(b.timer);
    b.el.classList.add('ax-leave');
    frame.classList.remove('ax-arrive'); void frame.offsetWidth;
    if (!skipped && !reduced()) frame.classList.add('ax-arrive');
    setTimeout(() => b.el.remove(), 420);
    setTimeout(signalPulse, skipped ? 80 : 420);
    setTimeout(() => frame.classList.remove('ax-arrive'), 1600);
  }
  function startBoot() {
    if (boot || shell.hidden) return;
    let skipPref = false; try { skipPref = sessionStorage.getItem('ps-atlas-intro') === 'skip'; } catch {}
    if (reduced() || skipPref) { signalPulse(); return; }
    let el, ctx;
    try {
      el = buildBoot(); shell.append(el);
      ctx = $('canvas', el).getContext('2d');
      if (!ctx) throw new Error('canvas unavailable');
    } catch { el && el.remove(); signalPulse(); return; }
    const canvas = $('canvas', el), dpr = Math.min(2, devicePixelRatio || 1);
    const fit = () => { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    fit();
    const hudR = $('.ax-hud-r', el), phaseEl = $('.ax-boot-phase', el), bar = $('.ax-boot-bar i', el);
    boot = { el, raf: 0, timer: 0 };
    $('.ax-skip', el).addEventListener('click', () => { try { sessionStorage.setItem('ps-atlas-intro', 'skip'); } catch {} finishBoot(true); });
    $('.ax-skip', el).focus({ preventScroll: true });
    const t0 = performance.now(); let phaseIdx = -1;
    const frameFn = now => {
      if (!boot) return;
      const t = (now - t0) / 1000;
      try { drawGlobe(ctx, innerWidth, innerHeight, t); } catch { finishBoot(true); return; }
      bar.style.transform = `scaleX(${clamp01(t / DURATION)})`;
      while (phaseIdx + 1 < PHASES.length && t >= PHASES[phaseIdx + 1][0]) {
        phaseIdx++; phaseEl.textContent = PHASES[phaseIdx][1];
        const line = document.createElement('div'); line.innerHTML = `<span>T+${PHASES[phaseIdx][0].toFixed(1)}s</span> ${esc(PHASES[phaseIdx][1])}`; hudR.append(line);
      }
      if (t > 5.2) el.classList.add('ax-descend');
      if (t >= DURATION) { finishBoot(false); return; }
      boot.raf = requestAnimationFrame(frameFn);
    };
    boot.raf = requestAnimationFrame(frameFn);
    boot.timer = setTimeout(() => finishBoot(true), (DURATION + 4) * 1000); // safety net if rAF is throttled
  }
  $('#atlas-launch')?.addEventListener('click', () => requestAnimationFrame(startBoot));
  // Close the Atlas mid-boot → tidy up
  $('#atlas-exit')?.addEventListener('click', () => { if (boot) { boot.el.remove(); cancelAnimationFrame(boot.raf); clearTimeout(boot.timer); boot = null; } closeDossier(); });

  /* Escape: skip boot → close dossier → (index.html) close Atlas */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || shell.hidden) return;
    if (boot) { e.stopImmediatePropagation(); e.preventDefault(); finishBoot(true); return; }
    if (!dossier.hidden) { e.stopImmediatePropagation(); e.preventDefault(); closeDossier(); }
  }, true);

  window.__atlasAscension = { openDossier, closeDossier, signalPulse, startBoot, setLayers: s => { Object.assign(layerState, s); applyLayers(); } };
})();
