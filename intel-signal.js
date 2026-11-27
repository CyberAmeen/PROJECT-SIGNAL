/* PROJECT SIGNAL — INTEL: "Signal Lock" loader, merged-coverage stream, animated scenes,
   hyperspace swipes, hologram headlines, optional sound, Signal of the Day and observer rank.
   Front-end only: reads the same public SENTINEL snapshot as before, sends nothing anywhere. */
(() => {
  'use strict';
  const C = window.IntelCore;
  const shell = document.getElementById('stream-shell'), view = document.getElementById('stream-view');
  if (!C || !shell || !view) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const rngFrom = seed => { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const ago = ms => { if (!ms) return 'time unknown'; const m = Math.max(0, (Date.now() - ms) / 60000); if (m < 60) return Math.max(1, Math.round(m)) + 'm ago'; const hr = m / 60; if (hr < 48) return Math.round(hr) + 'h ago'; return Math.round(hr / 24) + 'd ago'; };
  const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  /* ---------------------------------------------------------------- SOUND (off by default) */
  /* Sound now lives in the site-wide engine (signal-audio.js + sound-barrier.js). */
  const Sound = {
    get on() { return !!(window.SignalAudio && window.SignalAudio.enabled); },
    ensure() { if (window.SignalAudio) window.SignalAudio.unlock(); },
    play(name, o) { const S = window.SignalAudio; if (!S || !S.ui) return; const map = { tick: 'decode', whoosh: 'swipe', rank: 'rank' }; if (map[name]) S.ui(map[name], o); },
    toggle() { const S = window.SignalAudio; if (!S) return false; S.unlock(); S.enabled = !S.enabled; return S.enabled; }
  };

  /* ---------------------------------------------------------------- STATE */
  let lastSnap = null, model = { clusters: [], filtered: 0, total: 0 }, list = [], idx = -1, busy = false, settleTimer = 0, dwellTimer = 0, ticker = 0;
  const prevVisit = store.get('ps-intel-lastvisit', 0);
  let order = store.get('ps-intel-order', 'latest');
  if (typeof readSnapshot === 'function') { const orig = readSnapshot; readSnapshot = async p => { const r = await orig(p); lastSnap = r; return r; }; } // eslint-disable-line no-global-assign

  /* saved transmissions (full copies, so they survive after a story leaves the feed) */
  let saved = store.get('ps-intel-saved-v1', []); if (!Array.isArray(saved)) saved = [];
  const isSaved = id => saved.some(s => s.id === id);
  const persistSaved = () => store.set('ps-intel-saved-v1', saved.slice(0, 80));

  /* observer rank */
  const RANKS = [['CADET', 0], ['ANALYST', 8], ['FIELD AGENT', 25], ['COMMANDER', 60]];
  let rank = store.get('ps-intel-rank-v1', null);
  if (!rank || typeof rank !== 'object') rank = { n: 0, ids: [], day: dayKey(), today: [] };
  if (rank.day !== dayKey()) { rank.day = dayKey(); rank.today = []; }
  const rankOf = n => { let r = 0; RANKS.forEach((x, i) => { if (n >= x[1]) r = i; }); return r; };

  /* ---------------------------------------------------------------- ATLAS LINKS */
  const STATES = { alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY' };
  const PLACES = { 'skinwalker': 'UT', 'area 51': 'NV', 'roswell': 'NM' };
  function atlasTarget(c) {
    const cities = (window.__atlas && window.__atlas.cities) || []; if (!cities.length) return null;
    if (c.cityId) { const hit = cities.find(x => x.id === c.cityId); if (hit) return { id: hit.id, label: hit.name }; }
    const t = ' ' + c.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ') + ' ';
    const city = cities.find(x => x.name.length > 4 && !/washington|new york city/i.test(x.name) && t.includes(' ' + x.name.toLowerCase() + ' '));
    if (city) return { id: city.id, label: city.name };
    let code = null, name = '';
    for (const k of Object.keys(PLACES)) if (t.includes(' ' + k + ' ')) { code = PLACES[k]; name = k; break; }
    if (!code) for (const k of Object.keys(STATES).sort((a, b) => b.length - a.length)) if (t.includes(' ' + k + ' ')) { code = STATES[k]; name = k; break; }
    if (!code) return null;
    const inState = cities.filter(x => x.state === code); if (!inState.length) return null;
    const hub = inState.find(x => x.priority) || inState[0];
    const stateName = Object.keys(STATES).find(k => STATES[k] === code) || name;
    return { id: hub.id, label: stateName.replace(/\b\w/g, m => m.toUpperCase()) };
  }
  function openAtlasAt(id) {
    closeStream();
    const btn = document.getElementById('atlas-launch'); if (!btn) return;
    btn.click();
    setTimeout(() => { try { window.__atlasAscension && window.__atlasAscension.skipBoot && window.__atlasAscension.skipBoot(); } catch {} try { window.__atlas && window.__atlas.choose(id, true); } catch {} }, 140);
  }

  /* ---------------------------------------------------------------- SCENES (code-drawn, animated, no images) */
  function stars(rng, n, palette) {
    const out = []; for (let i = 0; i < n; i++) { const s = rng() < 0.12 ? 2 : 1; out.push(`${(rng() * 100).toFixed(2)}vw ${(rng() * 100).toFixed(2)}vh 0 ${s === 2 ? '.6px' : '0'} ${palette[Math.floor(rng() * palette.length)]}`); }
    return out.join(',');
  }
  function ridge(rng, base, amp, pts) {
    let d = `M0 100 L0 ${base}`; for (let i = 1; i <= pts; i++) { const x = (i / pts) * 400; const y = base - rng() * amp + (i % 2 ? amp * 0.25 : 0); d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; }
    return d + ' L400 100 Z';
  }
  const tick = (min, max, dec, suf = '') => `data-tick="${min}|${max}|${dec}|${h(suf)}"`;
  function centerpiece(c, rng) {
    const text = c.text.toLowerCase();
    switch (c.scene) {
      case 'facility': return `
        <div class="fx-stage"><div class="fx-rig">
          <div class="fx-grid"></div>
          ${[1, 2, 3, 4].map(k => `<div class="fx-level l${k}"><i></i><i></i><i></i></div>`).join('')}
          <div class="fx-scan"></div>
          <b class="fx-node n1"></b><b class="fx-node n2"></b><b class="fx-node n3"></b>
        </div></div>
        <div class="fx-beam"></div>
        <div class="fx-callout c1"><b>LEVEL −1</b>ACCESS</div><div class="fx-callout c2"><b>LEVEL −3</b>STORAGE</div><div class="fx-callout c3"><b>DEPTH</b><span ${tick(40, 120, 0, ' m')}>— m</span></div>`;
      case 'sensor': return `
        <div class="sx-screen"><div class="sx-noise"></div>
          <div class="sx-horizon"><i></i></div><div class="sx-ladder sx-l"></div><div class="sx-ladder sx-r"></div>
          <div class="sx-path"><div class="sx-target"><i class="sx-obj"></i><div class="sx-reticle"><s></s><s></s><s></s><s></s></div></div></div>
          <div class="sx-cross"></div>
          <div class="sx-data tl">TRK 01 · <em>LOCK</em></div><div class="sx-data tr">AZ <span ${tick(200, 230, 1, '°')}>—</span></div>
          <div class="sx-data bl">EL <span ${tick(8, 20, 1, '°')}>—</span> · RNG <span ${tick(18, 40, 1, ' NM')}>—</span></div><div class="sx-data br">IR · WHT · <span ${tick(1, 9, 0, 'x')}>—</span></div>
        </div>`;
      case 'bio': return `
        <div class="bx-capsule"><div class="bx-helix">${Array.from({ length: 20 }, (_, i) => `<div class="bx-rung" style="--i:${i}"><i></i><s></s><b></b></div>`).join('')}</div>
          ${Array.from({ length: 9 }, (_, i) => `<u class="bx-bubble" style="--x:${(rng() * 80 + 10).toFixed(0)}%;--d:${(rng() * 4 + 3).toFixed(1)}s;--w:${(rng() * 3).toFixed(1)}s"></u>`).join('')}</div>
        <div class="bx-read r1"><b>SAMPLE</b> <span ${tick(100, 999, 0)}>—</span>-<span ${tick(10, 99, 0)}>—</span></div><div class="bx-read r2"><b>SEQUENCE</b> UNRESOLVED</div>`;
      case 'files': { const stamp = /declassif/.test(text) ? 'DECLASSIFIED' : 'RELEASED';
        return `<div class="dx-stage"><div class="dx-stack">${[1, 2, 3].map(k => `<div class="dx-page p${k}"><em>${k === 1 ? 'MEMORANDUM' : k === 2 ? 'SECRET // NOFORN' : 'CASE FILE'}</em>${Array.from({ length: 9 }, (_, i) => `<i class="${rng() < 0.3 ? 'r' : ''}" style="--w:${(45 + rng() * 50).toFixed(0)}%;--i:${i}"></i>`).join('')}</div>`).join('')}<div class="dx-scan"></div></div>
          <div class="dx-stamp">${stamp}</div></div>`; }
      case 'sighting': return `
        <div class="gx-sky"></div><div class="gx-aurora"></div>
        <div class="gx-craft"><div class="gx-trail"></div><i></i></div>
        <svg class="gx-ridge far" viewBox="0 0 400 100" preserveAspectRatio="none"><path d="${ridge(rng, 62, 22, 14)}"/></svg>
        <div class="gx-glow"></div>
        <svg class="gx-ridge near" viewBox="0 0 400 100" preserveAspectRatio="none"><path d="${ridge(rng, 78, 18, 9)}"/></svg>
        <div class="gx-vf"><s></s><s></s><s></s><s></s><span class="gx-rec">● REC</span><span class="gx-tc" ${tick(0, 59, 0)}>00</span></div>`;
      case 'cosmos': return `
        <div class="cx-planet"><i></i></div>
        <div class="cx-ant"><div class="cx-beam"></div><div class="cx-pulses"><i></i><i></i><i></i></div>
          <svg class="cx-dish" viewBox="0 0 200 170"><defs><linearGradient id="cxg${c.seed % 997}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfeaff" stop-opacity=".9"/><stop offset="1" stop-color="#3d8bff" stop-opacity=".25"/></linearGradient></defs>
            <path class="bowl" d="M14 58 Q100 132 186 58 Q100 96 14 58Z" fill="url(#cxg${c.seed % 997})"/>
            <path d="M14 58 Q100 96 186 58" /><path d="M40 70 L100 22 L160 70 M100 22 L100 88" />
            <circle cx="100" cy="20" r="5"/>
            <path d="M100 96 L100 120 M70 160 L88 120 H112 L130 160 Z M56 160 H144" /></svg></div>
        <div class="cx-read">RX <span ${tick(1420, 1421, 3, ' MHz')}>—</span></div>`;
      case 'craft': return `
        <div class="kx-cone"></div>
        <div class="kx-stage"><div class="kx-holo"><i class="kx-r r1"></i><i class="kx-r r2"></i><i class="kx-r r3"></i><i class="kx-dome"></i></div></div>
        <div class="kx-scan"></div><div class="kx-tag">SCHEMATIC · ILLUSTRATIVE</div>`;
      case 'hearing': return `
        <svg class="hx-arc" viewBox="0 0 400 200">${Array.from({ length: 4 }, (_, r) => Array.from({ length: 11 + r * 3 }, (_, i) => { const cnt = 11 + r * 3; const ang = Math.PI * (0.1 + 0.8 * i / (cnt - 1)); const R = 80 + r * 26; return `<circle cx="${(200 - Math.cos(ang) * R).toFixed(1)}" cy="${(190 - Math.sin(ang) * R * 0.62).toFixed(1)}" r="3" style="--k:${((i * 7 + r * 3) % 11)}"/>`; }).join('')).join('')}</svg>
        <div class="hx-wave">${Array.from({ length: 24 }, (_, i) => `<i style="--k:${i};--a:${(0.3 + rng() * 0.7).toFixed(2)}"></i>`).join('')}</div>
        <div class="hx-lines"><i></i><i></i><i></i></div><div class="hx-tag">TESTIMONY · RECORDED</div>`;
      default: return `
        <div class="ox-planet"><i></i></div><div class="ox-sat"><i></i><b></b></div>
        <div class="ox-rings"><i></i><i></i><i></i></div>`;
    }
  }
  function sceneHTML(c, i) {
    try { return sceneInner(c, i); } catch (err) { console.error(err); return sceneInner(Object.assign({}, c, { scene: 'deep' }), i); }
  }
  function sceneInner(c, i) {
    const rng = rngFrom(c.seed + 17);
    const hue = Math.round((rng() * 46) - 18), tilt = (rng() * 10 - 5).toFixed(1);
    const neb = `--nx:${(20 + rng() * 60).toFixed(0)}%;--ny:${(15 + rng() * 40).toFixed(0)}%;--nx2:${(10 + rng() * 80).toFixed(0)}%;--ny2:${(40 + rng() * 40).toFixed(0)}%`;
    return `<div class="ix-scene sc-${c.scene}" aria-hidden="true" style="--hue:${hue}deg;--tilt:${tilt}deg;${neb};--spd:${(0.85 + rng() * 0.4).toFixed(2)}">
      <div class="ix-px" style="--d:.25"><div class="ix-stars s1" style="box-shadow:${stars(rng, 70, ['#9fd8ff', '#ffffff', '#7da7ff'])}"></div></div>
      <div class="ix-px" style="--d:.55"><div class="ix-nebula"></div><div class="ix-stars s2" style="box-shadow:${stars(rng, 36, ['#cfe9ff', '#8fb8ff', '#b9a8ff'])}"></div></div>
      <div class="ix-px ix-core" style="--d:1">${centerpiece(c, rng)}</div>
      <div class="ix-hud"><s></s><s></s><s></s><s></s>
        <span class="ix-hud-tl">SECTOR ${pad(i + 1)} · RX ${(1420.4 + rng() * 0.009).toFixed(3)} MHz</span>
        <span class="ix-hud-bl">ARTIST RENDER · NOT EVIDENCE</span></div>
      <div class="ix-scanlines"></div></div>`;
  }

  /* ---------------------------------------------------------------- CARDS */
  function isNew(c) { const since = prevVisit || (Date.now() - 24 * 3600e3); return c.newest > since; }
  function slideHTML(c, i, total, sotd) {
    const at = atlasTarget(c), reports = c.memberIds.length;
    const meter = Array.from({ length: 5 }, (_, k) => `<i class="${k < Math.min(5, c.count) ? 'on' : ''}"></i>`).join('');
    const brief = c.desc ? `<p class="ix-brief">${h(c.desc)}</p>` : `<p class="ix-brief ix-brief-thin">Headline only — the feed didn't include article details. Open a report below for the full story.</p>`;
    const chips = c.outlets.slice(0, 6).map(o => `<a class="ix-chip" href="${h(o.url)}" target="_blank" rel="noopener noreferrer">${h(o.name)} ↗</a>`).join('') + (c.outlets.length > 6 ? `<span class="ix-chip ix-more">+${c.outlets.length - 6} more</span>` : '');
    return `<article class="stream-slide ix-slide${sotd ? ' ix-sotd' : ''}" data-index="${i}" data-cluster="${h(c.id)}" aria-label="Transmission ${i + 1} of ${total}">
      ${sceneHTML(c, i)}
      <div class="ix-panel">
        ${sotd ? `<div class="ix-sotd-banner"><span>◆ SIGNAL OF THE DAY</span><small>${c.count > 1 ? 'Most-covered story in this scan' : 'Lead transmission'}</small></div>` : ''}
        <div class="ix-kicker"><span class="ix-label t-${c.label.tone}">◆ ${h(c.label.text)}</span>${isNew(c) ? '<span class="ix-new">NEW</span>' : ''}<span class="ix-num">TX ${pad(i + 1)}/${pad(total)}</span></div>
        <h2 class="ix-title" aria-label="${h(c.title)}"><span aria-hidden="true">${h(c.title)}</span></h2>
        <div class="ix-readout">
          <div class="ix-meter" title="Outlets covering this story"><span class="ix-bars">${meter}</span><b>${c.count}</b> ${c.count === 1 ? 'outlet' : 'outlets'}${reports > c.count ? ` · ${reports} reports` : ''}</div>
          <div class="ix-fresh"><i></i>${h(ago(c.newest))}</div>
        </div>
        ${brief}
        <div class="ix-chips" aria-label="Outlets reporting">${chips}</div>
        <div class="ix-actions">
          <a class="ix-btn ix-primary" href="${h(c.url)}" target="_blank" rel="noopener noreferrer">↗ Full report</a>
          <button class="ix-btn" type="button" data-ix-save="${h(c.id)}" aria-pressed="${isSaved(c.id)}">${isSaved(c.id) ? '★ Saved' : '☆ Save'}</button>
          <button class="ix-btn" type="button" data-ix-share="${h(c.id)}">⇪ Share</button>
          ${at ? `<button class="ix-btn ix-atlas" type="button" data-ix-atlas="${h(at.id)}">◈ ${h(at.label)} on Atlas</button>` : ''}
        </div>
        ${i < total - 1 ? '<div class="ix-swipe">SWIPE UP · NEXT TRANSMISSION</div>' : ''}
      </div></article>`;
  }
  function endHTML(total) {
    const r = rankOf(rank.n), next = RANKS[r + 1];
    const todayRead = list.filter(c => rank.today.includes(c.id)).length;
    const pct = next ? Math.round(((rank.n - RANKS[r][1]) / (next[1] - RANKS[r][1])) * 100) : 100;
    const merged = model.total - model.clusters.length;
    return `<article class="stream-slide ix-slide ix-end" data-index="${total}" aria-label="End of transmissions">
      <div class="ix-scene sc-deep" aria-hidden="true" style="--hue:0deg"><div class="ix-px" style="--d:.3"><div class="ix-stars s1" style="box-shadow:${stars(rngFrom(99), 80, ['#9fd8ff', '#fff'])}"></div></div><div class="ix-nebula"></div><div class="ix-px ix-core" style="--d:1"><div class="ox-rings big"><i></i><i></i><i></i></div></div><div class="ix-scanlines"></div></div>
      <div class="ix-end-card">
        <div class="ix-end-kicker">◆ END OF TRANSMISSIONS</div>
        <h2>Scan complete.</h2>
        <div class="ix-end-stats">
          <div><b class="ix-today">${todayRead}</b><small>of ${total} reviewed today</small></div>
          <div><b>${model.total}</b><small>reports received</small></div>
          <div><b>${Math.max(0, merged)}</b><small>repeats merged</small></div>
        </div>
        <div class="ix-rankcard"><div class="ix-rank-top"><span>OBSERVER RANK</span><b class="ix-rank-name">${RANKS[r][0]}</b></div>
          <div class="ix-rank-bar"><i style="width:${pct}%"></i></div>
          <small class="ix-rank-next">${next ? `${next[1] - rank.n} more transmissions to ${next[0]}` : 'Highest rank reached'}</small></div>
        ${model.filtered ? `<p class="ix-end-note">${model.filtered} off-topic ${model.filtered === 1 ? 'item was' : 'items were'} filtered out of this scan.</p>` : ''}
        <p class="ix-end-note">${h(document.getElementById('snapshot-state')?.textContent || '')}</p>
        <div class="ix-end-actions"><button class="ix-btn ix-primary" type="button" data-ix-top>↑ Back to first signal</button><button class="ix-btn" type="button" data-ix-saved>★ Saved (<span class="ix-saved-count">${saved.length}</span>)</button><button class="ix-btn" type="button" data-ix-atlas-open>◈ Open the Atlas</button></div>
      </div></article>`;
  }

  /* ---------------------------------------------------------------- STREAM CHROME */
  let rail, warp, toastEl, sheet, badge, chrome = false;
  function setupChrome() {
    if (chrome) return; chrome = true;
    shell.classList.add('ix');
    const top = $('.stream-top', shell), controls = $('.stream-controls', shell), brand = $('.stream-brand', shell);
    if (brand) brand.innerHTML = '<small>PS // INTEL UPLINK</small><span class="ix-brand">THE SIGNAL</span><span class="ix-live"><i></i>LIVE</span>';
    const btns = document.createElement('div'); btns.className = 'ix-tools';
    btns.innerHTML = `
      <button type="button" class="ix-tool ix-badge" data-ix-rank aria-label="Observer rank"><span class="ix-chev"></span><span class="ix-badge-name"></span><span class="ix-badge-txt"></span></button>
      <button type="button" class="ix-tool" data-ix-order aria-label="Change order"></button>
      <button type="button" class="ix-tool" data-ix-sound aria-label="Sound effects" aria-pressed="false"></button>
      <button type="button" class="ix-tool" data-ix-tilt aria-label="Tilt parallax" hidden>◎</button>
      <button type="button" class="ix-tool" data-ix-saved aria-label="Saved transmissions">★<span class="ix-saved-n"></span></button>`;
    controls.insertBefore(btns, $('#stream-close', controls));
    const close = $('#stream-close', controls); if (close) { close.innerHTML = '✕<span class="ix-hide-sm">&nbsp;HUB</span>'; close.setAttribute('aria-label', 'Close and return to hub'); }
    badge = $('.ix-badge', btns);
    rail = document.createElement('nav'); rail.className = 'ix-rail'; rail.setAttribute('aria-label', 'Transmissions'); shell.append(rail);
    warp = document.createElement('canvas'); warp.className = 'ix-warp'; warp.setAttribute('aria-hidden', 'true'); shell.append(warp);
    toastEl = document.createElement('div'); toastEl.className = 'ix-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); shell.append(toastEl);
    sheet = document.createElement('aside'); sheet.className = 'ix-sheet'; sheet.hidden = true; sheet.setAttribute('aria-label', 'Saved transmissions'); shell.append(sheet);
    refreshTools();
    setupTilt();
    shell.addEventListener('click', onClick);
  }
  function refreshTools() {
    const s = $('[data-ix-sound]', shell); if (s) { s.textContent = Sound.on ? '🔊' : '🔈'; s.setAttribute('aria-pressed', String(Sound.on)); s.title = Sound.on ? 'Sound on' : 'Sound off'; }
    const o = $('[data-ix-order]', shell); if (o) { o.textContent = order === 'latest' ? '⇣' : '⤨'; o.title = order === 'latest' ? 'Order: latest first' : 'Order: shuffled'; }
    $$('.ix-saved-n', shell).forEach(n => { n.textContent = saved.length ? String(saved.length) : ''; }); $$('.ix-saved-count', shell).forEach(n => { n.textContent = String(saved.length); });
    if (badge) { const r = rankOf(rank.n); const todayRead = list.filter(c => rank.today.includes(c.id)).length; $('.ix-chev', badge).textContent = '▲'.repeat(r + 1); $('.ix-badge-name', badge).textContent = RANKS[r][0]; $('.ix-badge-txt', badge).textContent = `${todayRead}/${list.length}`; badge.title = `Observer rank: ${RANKS[r][0]}`; }
  }
  let toastTimer = 0;
  function toast(msg, big) { if (!toastEl) return; toastEl.innerHTML = msg; toastEl.className = 'ix-toast show' + (big ? ' big' : ''); clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.className = 'ix-toast'; }, big ? 2600 : 1700); }
  function buildRail() {
    const n = list.length + 1;
    rail.innerHTML = `<span class="ix-rail-n"><b>01</b>/${pad(list.length)}</span><div class="ix-rail-track">${Array.from({ length: n }, (_, i) => `<button type="button" data-ix-go="${i}" aria-label="${i < list.length ? 'Transmission ' + (i + 1) : 'Scan summary'}"></button>`).join('')}</div>`;
  }
  function updateRail() {
    if (!rail) return; $$('[data-ix-go]', rail).forEach((b, i) => { b.classList.toggle('on', i === idx); b.classList.toggle('seen', i < list.length && rank.today.includes(list[i].id)); });
    const n = $('.ix-rail-n b', rail); if (n) n.textContent = pad(Math.min(idx + 1, list.length));
  }
  function renderSheet() {
    sheet.innerHTML = `<div class="ix-sheet-head"><b>★ SAVED TRANSMISSIONS</b><button type="button" data-ix-sheet-close aria-label="Close saved">✕</button></div>` +
      (saved.length ? `<ul>${saved.map(s => `<li><a href="${h(s.url)}" target="_blank" rel="noopener noreferrer"><small>${h(s.label || '')} · ${h(s.outlet || '')}</small>${h(s.title)}</a><button type="button" data-ix-unsave="${h(s.id)}" aria-label="Remove">✕</button></li>`).join('')}</ul>`
        : `<p class="ix-sheet-empty">Nothing saved yet. Tap <b>☆ Save</b> on any transmission and it'll be kept here on this device.</p>`);
  }
  function openSheet() { renderSheet(); sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('open')); $('[data-ix-sheet-close]', sheet)?.focus(); }
  function closeSheet() { sheet.classList.remove('open'); setTimeout(() => { sheet.hidden = true; }, 260); }

  function onClick(e) {
    const t = e.target.closest('button,a'); if (!t || !shell.contains(t)) return;
    if (t.matches('[data-ix-go]')) return go(Number(t.dataset.ixGo));
    if (t.matches('[data-ix-top]')) return go(0);
    if (t.matches('[data-ix-sound]')) { const on = Sound.toggle(); refreshTools(); toast(on ? '🔊 Audio on' : '🔈 Audio off'); return; }
    if (t.matches('[data-ix-order]')) { order = order === 'latest' ? 'shuffle' : 'latest'; store.set('ps-intel-order', order); renderStream(); go(0, true); refreshTools(); toast(order === 'latest' ? '⇣ Latest first' : '⤨ Shuffled'); return; }
    if (t.matches('[data-ix-rank]')) { const r = rankOf(rank.n), next = RANKS[r + 1]; toast(`<b>${RANKS[r][0]}</b> · ${rank.n} transmissions reviewed${next ? `<br>${next[1] - rank.n} more to ${next[0]}` : ''}`); return; }
    if (t.matches('[data-ix-saved]')) return openSheet();
    if (t.matches('[data-ix-sheet-close]')) return closeSheet();
    if (t.matches('[data-ix-unsave]')) { saved = saved.filter(s => s.id !== t.dataset.ixUnsave); persistSaved(); renderSheet(); syncSaveButtons(); refreshTools(); return; }
    if (t.matches('[data-ix-tilt]')) return enableTilt(true);
    if (t.matches('[data-ix-atlas-open]')) { closeStream(); document.getElementById('atlas-launch')?.click(); return; }
    if (t.matches('[data-ix-atlas]')) return openAtlasAt(t.dataset.ixAtlas);
    const c = list.find(x => x.id === (t.dataset.ixSave || t.dataset.ixShare));
    if (t.matches('[data-ix-save]') && c) {
      if (isSaved(c.id)) saved = saved.filter(s => s.id !== c.id);
      else { saved.unshift({ id: c.id, title: c.title, url: c.url, outlet: c.outlet, date: c.newest, label: c.label.text }); toast('★ Saved to this device'); }
      persistSaved(); syncSaveButtons(); refreshTools(); return;
    }
    if (t.matches('[data-ix-share]') && c) {
      const payload = { title: c.title, text: c.title + ' — via PROJECT SIGNAL', url: c.url };
      if (navigator.share) navigator.share(payload).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(c.url).then(() => toast('Link copied'), () => toast('Couldn’t copy link'));
      return;
    }
  }
  function syncSaveButtons() { $$('[data-ix-save]', view).forEach(b => { const on = isSaved(b.dataset.ixSave); b.textContent = on ? '★ Saved' : '☆ Save'; b.setAttribute('aria-pressed', String(on)); }); $$('.ix-saved-n', shell).forEach(n => { n.textContent = saved.length ? String(saved.length) : ''; }); $$('.ix-saved-count', shell).forEach(n => { n.textContent = String(saved.length); }); }

  /* ---------------------------------------------------------------- ORDER, RENDER, NAVIGATION */
  function arrange() {
    const cl = model.clusters.slice(); if (!cl.length) return [];
    const strength = c => c.count * 3 + c.memberIds.length + Math.max(0, 36 - (Date.now() - c.newest) / 3600e3) / 12;
    const sotd = cl.slice().sort((a, b) => strength(b) - strength(a) || b.newest - a.newest)[0];
    let rest = cl.filter(c => c !== sotd);
    if (order === 'shuffle') { for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; } }
    else rest.sort((a, b) => b.newest - a.newest);
    return [sotd, ...rest];
  }
  function renderStream() {
    model = C.build(Array.isArray(data.stories) ? data.stories : []);
    list = arrange();
    try { reading = list; } catch {}
    if (!list.length) {
      view.innerHTML = '<div class="stream-empty ix-empty"><div class="ix-empty-orb">◎</div><h2>No signals received.</h2><p>The public snapshot is unavailable and nothing is saved on this device yet. Try another scan in a few minutes.</p><button type="button" id="stream-go-scan">Return to scanner</button></div>';
      if (rail) rail.innerHTML = ''; idx = -1; return;
    }
    view.innerHTML = list.map((c, i) => slideHTML(c, i, list.length, i === 0)).join('') + endHTML(list.length);
    buildRail(); idx = -1;
  }
  function slides() { return $$('.stream-slide', view); }
  function go(i, instant) { const s = slides(); if (!s.length) return; i = Math.max(0, Math.min(i, s.length - 1)); view.scrollTo({ top: s[i].offsetTop - view.offsetTop * 0 - (s[0].offsetTop || 0), behavior: instant || reduced() ? 'auto' : 'smooth' }); shell.scrollTop = 0; if (instant || reduced() || Math.abs(view.scrollTop - (s[i].offsetTop - (s[0].offsetTop || 0))) < 2) setIndex(i, !!instant); }
  function indexFromScroll() { return Math.round(view.scrollTop / Math.max(1, view.clientHeight)); }
  function setIndex(i, initial) {
    const s = slides(); if (!s.length) return; i = Math.max(0, Math.min(i, s.length - 1)); if (i === idx) return;
    const prev = idx; idx = i; try { streamIndex = i; } catch {}
    s.forEach((el, k) => el.classList.toggle('is-visible', k === i));
    const el = s[i];
    if (!initial && !reduced()) { burst(i > prev ? 1 : -1); Sound.play('whoosh', { dir: i > prev ? 1 : -1 }); el.classList.remove('ix-arrive'); void el.offsetWidth; el.classList.add('ix-arrive'); }
    const title = $('.ix-title span', el); if (title) holo(title);
    updateRail();
    try { window.dispatchEvent(new CustomEvent('intel:slide', { detail: { index: i, initial: !!initial, sotd: i === 0 && list.length > 0, end: i === list.length } })); } catch {}
    clearTimeout(dwellTimer);
    if (i < list.length) dwellTimer = setTimeout(() => record(list[i]), 1200);
    if (i === list.length) { const t = $('.ix-today', el); if (t) t.textContent = list.filter(c => rank.today.includes(c.id)).length; }
  }
  function record(c) {
    if (!c || shell.hidden) return;
    let changed = false;
    if (!rank.today.includes(c.id)) { rank.today.push(c.id); changed = true; }
    const fresh = !c.memberIds.some(id => rank.ids.includes(id));
    if (fresh) {
      const before = rankOf(rank.n); rank.n++; rank.ids = [...new Set([...c.memberIds, ...rank.ids])].slice(0, 600); changed = true;
      const after = rankOf(rank.n);
      if (after > before) rankUp(RANKS[after][0]);
    }
    if (changed) { store.set('ps-intel-rank-v1', rank); refreshTools(); updateRail(); }
  }
  function rankUp(name) {
    Sound.play('rank');
    toast(`<span class="ix-rankup-k">◆ RANK UP</span><b>${h(name)}</b><small>Keep reviewing transmissions to climb.</small>`, true);
    if (badge) { badge.classList.remove('ix-pop'); void badge.offsetWidth; badge.classList.add('ix-pop'); }
  }

  /* hologram headline decode */
  const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+<>/\\=';
  function holo(span) {
    const full = span.dataset.full || span.textContent; span.dataset.full = full;
    if (reduced()) { span.textContent = full; return; }
    const start = performance.now(), dur = Math.min(1100, 320 + full.length * 7);
    span.parentElement.classList.remove('ix-flicker'); void span.offsetWidth; span.parentElement.classList.add('ix-flicker');
    let lastTick = 0;
    const step = now => {
      if (span.dataset.full !== full) return;
      const p = Math.min(1, (now - start) / dur), n = Math.floor(p * full.length);
      let out = full.slice(0, n);
      for (let k = n; k < Math.min(full.length, n + 7); k++) out += full[k] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      span.textContent = out;
      if (now - lastTick > 70 && p < 1) { Sound.play('tick'); lastTick = now; }
      if (p < 1) requestAnimationFrame(step); else span.textContent = full;
    };
    requestAnimationFrame(step);
  }

  /* telemetry digits in the visible scene */
  function startTicker() {
    clearInterval(ticker);
    ticker = setInterval(() => {
      if (shell.hidden) { clearInterval(ticker); return; }
      const el = slides()[idx]; if (!el || reduced()) return;
      $$('[data-tick]', el).forEach(t => {
        const [min, max, dec, suf] = t.dataset.tick.split('|'); const lo = +min, hi = +max;
        let v = parseFloat(t.dataset.v); if (!Number.isFinite(v)) v = lo + Math.random() * (hi - lo);
        v += (Math.random() - 0.5) * (hi - lo) * 0.06; v = Math.max(lo, Math.min(hi, v)); t.dataset.v = v;
        t.textContent = (+dec ? v.toFixed(+dec) : pad(Math.round(v))) + (suf || '');
      });
    }, 140);
  }

  /* hyperspace streak burst between transmissions */
  let burstRaf = 0;
  function burst(dir) {
    if (!warp) return;
    const dpr = Math.min(2, devicePixelRatio || 1), w = shell.clientWidth, hgt = shell.clientHeight;
    warp.width = w * dpr; warp.height = hgt * dpr; const ctx = warp.getContext('2d'); if (!ctx) return; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = w / 2, cy = hgt * (dir > 0 ? 0.42 : 0.58), N = 150, max = Math.hypot(w, hgt) * 0.6;
    const parts = Array.from({ length: N }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random() * max * 0.25, v: 0.6 + Math.random() * 1.6, c: Math.random() < 0.7 ? '159,216,255' : (Math.random() < 0.5 ? '255,255,255' : '160,140,255') }));
    const t0 = performance.now(), D = 520; cancelAnimationFrame(burstRaf); warp.classList.add('on');
    const frame = now => {
      const p = Math.min(1, (now - t0) / D), e = p * p;
      ctx.clearRect(0, 0, w, hgt);
      const alpha = p < 0.35 ? p / 0.35 : 1 - (p - 0.35) / 0.65;
      parts.forEach(s => {
        const r1 = s.r + e * max * s.v, r0 = Math.max(0, r1 - (20 + e * 260) * s.v);
        ctx.strokeStyle = `rgba(${s.c},${(alpha * 0.85).toFixed(3)})`; ctx.lineWidth = s.v > 1.6 ? 1.8 : 1;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0); ctx.lineTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1); ctx.stroke();
      });
      if (p < 1) burstRaf = requestAnimationFrame(frame); else { ctx.clearRect(0, 0, w, hgt); warp.classList.remove('on'); }
    };
    burstRaf = requestAnimationFrame(frame);
  }

  /* tilt / pointer parallax */
  let tiltOn = false, tx = 0, ty = 0, pend = false;
  const applyTilt = () => { pend = false; shell.style.setProperty('--tx', tx.toFixed(2)); shell.style.setProperty('--ty', ty.toFixed(2)); };
  const queue = () => { if (!pend) { pend = true; requestAnimationFrame(applyTilt); } };
  function onOrient(e) { if (shell.hidden) return; const g = e.gamma || 0, b = (e.beta || 0) - 45; tx = Math.max(-1, Math.min(1, g / 25)) * 14; ty = Math.max(-1, Math.min(1, b / 25)) * 14; queue(); }
  function enableTilt(fromTap) {
    const D = window.DeviceOrientationEvent;
    const start = () => { if (tiltOn) return; tiltOn = true; addEventListener('deviceorientation', onOrient); store.set('ps-intel-tilt', true); const b = $('[data-ix-tilt]', shell); if (b) { b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); } if (fromTap) toast('◎ Tilt parallax on'); };
    if (D && typeof D.requestPermission === 'function') { if (!fromTap) return; D.requestPermission().then(s => { if (s === 'granted') start(); else toast('Motion access was declined'); }).catch(() => toast('Motion access unavailable')); }
    else start();
  }
  function setupTilt() {
    const coarse = matchMedia('(pointer: coarse)').matches, D = window.DeviceOrientationEvent;
    if (coarse && D) {
      const b = $('[data-ix-tilt]', shell);
      if (typeof D.requestPermission === 'function') { if (b) b.hidden = false; }
      else enableTilt(false);
    }
    if (!coarse) shell.addEventListener('pointermove', e => { if (reduced()) return; tx = ((e.clientX / innerWidth) - 0.5) * 2 * 12; ty = ((e.clientY / innerHeight) - 0.5) * 2 * 10; queue(); }, { passive: true });
  }

  /* ---------------------------------------------------------------- OPEN / CLOSE */
  function openIntel() {
    setupChrome();
    const st = document.getElementById('snapshot-state'); if (st) st.textContent = streamMessage;
    renderStream();
    shell.hidden = false; document.body.classList.add('stream-active');
    view.scrollTop = 0; idx = -1; setIndex(0, true);
    const first = slides()[0]; if (first && !reduced()) { first.classList.remove('ix-arrive'); void first.offsetWidth; first.classList.add('ix-arrive'); }
    refreshTools(); startTicker();
    store.set('ps-intel-lastvisit', Date.now());
    $('#stream-close')?.focus({ preventScroll: true });
  }
  // neutralise the old stream renderer and route its navigation through this one
  try { goStreamIndex = (i) => go(i); } catch {}
  try { activateVisibleSlide = () => {}; } catch {}
  view.addEventListener('scroll', () => {
    if (!list.length) return;
    const i = indexFromScroll(); if (i !== idx) setIndex(i);
    clearTimeout(settleTimer); settleTimer = setTimeout(() => setIndex(indexFromScroll()), 90);
  }, { passive: true });
  document.addEventListener('keydown', e => {
    if (shell.hidden) return;
    if (e.key === 'Escape' && sheet && !sheet.hidden) { e.stopImmediatePropagation(); e.preventDefault(); closeSheet(); }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !e.defaultPrevented) { e.stopImmediatePropagation(); e.preventDefault(); go(idx + (e.key === 'ArrowDown' ? 1 : -1)); }
  }, true);
  $('#stream-close')?.addEventListener('click', () => { clearInterval(ticker); clearTimeout(dwellTimer); if (sheet) { sheet.hidden = true; sheet.classList.remove('open'); } });

  /* ---------------------------------------------------------------- SIGNAL LOCK LOADER */
  function loaderHTML() {
    const ticks = Array.from({ length: 60 }, (_, i) => { const a = (i / 60) * Math.PI * 2, r1 = 132, r2 = i % 5 ? 126 : 120; return `<line x1="${(150 + Math.cos(a) * r1).toFixed(1)}" y1="${(150 + Math.sin(a) * r1).toFixed(1)}" x2="${(150 + Math.cos(a) * r2).toFixed(1)}" y2="${(150 + Math.sin(a) * r2).toFixed(1)}"/>`; }).join('');
    const dial = Array.from({ length: 41 }, (_, i) => { const a = Math.PI * (1.15 + 0.7 * i / 40), r1 = 104, r2 = i % 10 ? 98 : 92; return `<line x1="${(150 + Math.cos(a) * r1).toFixed(1)}" y1="${(150 + Math.sin(a) * r1).toFixed(1)}" x2="${(150 + Math.cos(a) * r2).toFixed(1)}" y2="${(150 + Math.sin(a) * r2).toFixed(1)}"/>`; }).join('');
    return `<canvas class="ixl-bg"></canvas><div class="ixl-vignette"></div>
      <div class="ixl-power"><i></i></div>
      <div class="ixl-device">
        <div class="ixl-frame"><s></s><s></s><s></s><s></s></div>
        <div class="ixl-top"><span>PS-OS 7.0 // DEEP SPACE INTEL TERMINAL</span><span class="ixl-clock">--:--:--</span></div>
        <div class="ixl-core">
          <svg class="ixl-rings" viewBox="0 0 300 300" aria-hidden="true">
            <circle class="ixl-ring a" cx="150" cy="150" r="142"/><g class="ixl-ticks">${ticks}</g>
            <circle class="ixl-ring b" cx="150" cy="150" r="112"/><g class="ixl-dial">${dial}</g>
            <circle class="ixl-ring c" cx="150" cy="150" r="78"/><circle class="ixl-ring d" cx="150" cy="150" r="60"/>
            <g class="ixl-needle"><line x1="150" y1="150" x2="150" y2="44"/><circle cx="150" cy="150" r="4"/></g>
            <g class="ixl-orbit"><circle cx="150" cy="8" r="3.5"/></g>
          </svg>
          <canvas class="ixl-wave" aria-hidden="true"></canvas>
          <div class="ixl-freq"><b>0000.000</b><small>MHz · HYDROGEN LINE</small></div>
        </div>
        <div class="ixl-title" data-text="ACQUIRING SIGNAL">ACQUIRING SIGNAL</div>
        <div class="ixl-phase" aria-live="polite">POWER-ON SELF TEST</div>
        <div class="ixl-bar"><i></i></div>
        <div class="ixl-grid">
          <div class="ixl-checks">${[['QUANTUM RELAY', 'OK'], ['SUBSPACE ARRAY', 'OK'], ['DECRYPTION CORE', 'OK'], ['SENTINEL UPLINK', 'LINKING']].map(([a, b], i) => `<div class="ixl-check" data-k="${i}"><span>${a}</span><em></em><b>${b}</b></div>`).join('')}</div>
          <div class="ixl-term" aria-hidden="true"></div>
        </div>
        <div class="ixl-stats"><div><b data-stat="sources">00</b><small>SOURCES</small></div><div><b data-stat="reports">00</b><small>REPORTS</small></div><div><b data-stat="signals">00</b><small>SIGNALS</small></div></div>
        <button type="button" class="ixl-skip">SKIP ›</button>
      </div>
      <div class="ixl-stamp"><span>SIGNAL ACQUIRED</span></div>
      <div class="ixl-flash"></div>`;
  }
  function runLoader(dataReady) {
    return new Promise(resolve => {
      const el = document.createElement('div'); el.className = 'ixl'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Acquiring intelligence signal');
      el.innerHTML = loaderHTML(); document.body.append(el); document.body.style.overflow = 'hidden';
      let short = false; try { short = sessionStorage.getItem('short-scan') === 'yes'; } catch {}
      const calm = reduced(); if (calm) el.classList.add('ixl-calm');
      const S = short ? 0.42 : 1; // compressed timeline after a skip earlier this session
      const T = { boot: 0.45 * S, checks: [0.75, 1.05, 1.35, 1.65].map(x => x * S), tune: 1.45 * S, lock: 4.2 * S, jump: 5.0 * S, flash: 5.5 * S, end: 6.0 * S };
      const bg = $('.ixl-bg', el), wave = $('.ixl-wave', el), bctx = bg.getContext('2d'), wctx = wave.getContext('2d');
      const phaseEl = $('.ixl-phase', el), bar = $('.ixl-bar i', el), freq = $('.ixl-freq b', el), needle = $('.ixl-needle', el), term = $('.ixl-term', el), clock = $('.ixl-clock', el);
      const dpr = Math.min(2, devicePixelRatio || 1);
      let W = 0, H = 0, ww = 0, wh = 0;
      const fit = () => { W = innerWidth; H = innerHeight; bg.width = W * dpr; bg.height = H * dpr; bctx && bctx.setTransform(dpr, 0, 0, dpr, 0, 0); const r = wave.getBoundingClientRect(); ww = r.width; wh = r.height; wave.width = ww * dpr; wave.height = wh * dpr; wctx && wctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
      fit(); addEventListener('resize', fit);
      const field = Array.from({ length: 420 }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random(), c: Math.random() < 0.75 ? '170,215,255' : Math.random() < 0.5 ? '255,255,255' : '175,150,255' }));
      let ready = false, failed = false, model2 = null, lockedAt = 0, jumped = false, flashed = false, skipped = false, checksShown = 0, termIdx = 0, lastTerm = 0, done = false;
      const timer0 = performance.now();
      dataReady.then(m => { ready = true; model2 = m; failed = !!m.failed; }).catch(() => { ready = true; failed = true; model2 = { clusters: [], total: 0 }; });
      $('.ixl-skip', el).addEventListener('click', () => { try { sessionStorage.setItem('short-scan', 'yes'); } catch {} if (!skipped && AU) AU.skip(); skipped = true; });
      $('.ixl-skip', el).focus({ preventScroll: true });
      const SA = window.SignalAudio, AU = SA && SA.ctx ? SA.intel : null; if (AU) AU.start(); if (SA) el.append(SA.muteButton('ixl-mute'));
      let onSnd = false, needleSnd = false, orbitN = 0, riserOn = false;
      const setPhase = t => { if (phaseEl.textContent !== t) phaseEl.textContent = t; };
      const countUp = (key, to, ms) => { const b = $(`[data-stat="${key}"]`, el); const t0 = performance.now(); let last = 0; const f = now => { const p = Math.min(1, (now - t0) / ms), v = Math.round(to * (1 - Math.pow(1 - p, 3))); b.textContent = pad(v); if (v !== last) { last = v; if (AU) AU.count(v, to); } if (p < 1 && !done) requestAnimationFrame(f); }; requestAnimationFrame(f); };
      let counted = false;
      const decodeLine = (txt) => { if (AU) AU.line(); const line = document.createElement('div'); line.className = 'ixl-line'; term.append(line); while (term.children.length > 4) term.firstChild.remove(); const full = '› ' + txt.toUpperCase().slice(0, 64) + (txt.length > 64 ? '…' : ''); const t0 = performance.now(); const f = now => { const p = Math.min(1, (now - t0) / 420), n = Math.floor(p * full.length); let o = full.slice(0, n); for (let k = n; k < Math.min(full.length, n + 5); k++) o += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; line.textContent = o; if (p < 1 && !done) requestAnimationFrame(f); else line.textContent = full; }; requestAnimationFrame(f); };

      const frame = now => {
        if (done) return;
        let t = (now - timer0) / 1000;
        const c = new Date(); clock.textContent = `${pad(c.getHours())}:${pad(c.getMinutes())}:${pad(c.getSeconds())}`;
        if (t >= T.boot) { el.classList.add('ixl-on'); if (!onSnd) { onSnd = true; if (AU) { AU.deviceOn(); AU.rings(); } } }
        if (AU && !needleSnd && t >= T.boot + 0.7) { needleSnd = true; AU.needle(); }
        if (AU && !lockedAt && Math.floor(t / 2.6) > orbitN) { orbitN = Math.floor(t / 2.6); AU.orbit(0); }
        while (checksShown < 4 && t >= T.checks[checksShown]) { const row = $(`.ixl-check[data-k="${checksShown}"]`, el); row.classList.add('in'); if (checksShown < 3 && AU) AU.check(checksShown); checksShown++; }
        if (t >= T.tune && !lockedAt) setPhase(ready ? 'TUNING · DEEP SPACE BAND' : (t > T.lock ? 'SEARCHING FOR CARRIER…' : 'TUNING · DEEP SPACE BAND'));
        if (ready && !counted && t >= T.tune) {
          counted = true;
          const up = $('.ixl-check[data-k="3"] b', el); up.textContent = failed ? 'CACHED' : 'ONLINE'; up.parentElement.classList.toggle('warn', failed); up.parentElement.classList.add('ok');
          countUp('sources', (lastSnap && lastSnap.sourcesChecked) || new Set((data.stories || []).map(s => s.source)).size, 900);
          countUp('reports', model2.total || 0, 1000); countUp('signals', (model2.clusters || []).length, 1100);
          if (AU) AU.uplink(!failed);
        }
        if (ready && counted && model2.clusters && termIdx < Math.min(5, model2.clusters.length) && now - lastTerm > 380 * S) { decodeLine(model2.clusters[termIdx].title); termIdx++; lastTerm = now; }
        if (AU && ready && !lockedAt && !riserOn && !skipped && !calm && T.lock - t <= 0.9 && T.lock - t > 0.15) { riserOn = true; AU.riser(T.lock - t); }
        // lock: needs data, and either time or a skip
        if (!lockedAt && ready && (t >= T.lock || skipped || calm)) {
          lockedAt = now; el.classList.add('ixl-locked'); if (failed) el.classList.add('ixl-weak');
          $('.ixl-stamp span', el).textContent = failed ? 'SIGNAL WEAK · CACHE' : 'SIGNAL ACQUIRED';
          setPhase(failed ? 'PUBLIC SNAPSHOT UNAVAILABLE · USING SAVED' : 'CARRIER LOCKED · DECRYPTED'); if (AU) AU.lock(!failed);
          $('.ixl-title', el).textContent = 'SIGNAL LOCKED'; $('.ixl-title', el).dataset.text = 'SIGNAL LOCKED';
          if (skipped || calm) { T.jump = t + (calm ? 0.6 : 0.15); T.flash = T.jump + (calm ? 0.2 : 0.4); T.end = T.flash + 0.45; }
          else { T.jump = Math.max(T.jump, t + 0.8); T.flash = T.jump + 0.5; T.end = T.flash + 0.5; }
        }
        const lockP = lockedAt ? 1 : Math.max(0, Math.min(ready ? 0.88 : 0.55, (t - T.tune) / (T.lock - T.tune) * 0.88));
        bar.style.transform = `scaleX(${lockedAt ? 1 : Math.min(0.96, t / T.lock).toFixed(3)})`;
        const target = 1420.405;
        freq.textContent = (lockedAt ? target : target + (1 - lockP) * (Math.sin(t * 7.3) * 38 + (Math.random() - 0.5) * 9)).toFixed(3);
        needle.style.transform = `rotate(${lockedAt ? 0 : ((1 - lockP) * Math.sin(t * 2.6) * 58 + (Math.random() - 0.5) * 4 * (1 - lockP)).toFixed(2)}deg)`;
        if (AU && t >= T.tune && !lockedAt) AU.tune(parseFloat(needle.style.transform.slice(7)) || 0, parseFloat(freq.textContent) - target, lockP, ready);
        if (!jumped && lockedAt && t >= T.jump) { jumped = true; el.classList.add('ixl-jump'); if (AU) AU.jump(Math.max(0.2, T.flash - T.jump)); }
        if (!flashed && jumped && t >= T.flash) { flashed = true; el.classList.add('ixl-flashing'); if (AU) AU.flash(); try { openIntel(); } catch (err) { console.error(err); } }
        // background starfield → hyperspace
        if (bctx && !calm) {
          const jp = jumped ? Math.min(1, (t - T.jump) / Math.max(0.2, T.flash - T.jump)) : 0;
          const speed = 0.0016 + lockP * 0.002 + jp * jp * 0.06;
          bctx.fillStyle = jumped ? `rgba(2,6,18,${(0.35 - jp * 0.25).toFixed(3)})` : 'rgba(2,6,18,.9)'; bctx.fillRect(0, 0, W, H);
          const g = bctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, Math.max(W, H) * 0.7);
          g.addColorStop(0, `rgba(40,90,200,${(0.16 + lockP * 0.08 + jp * 0.3).toFixed(3)})`); g.addColorStop(0.5, 'rgba(60,40,140,.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          bctx.fillStyle = g; bctx.fillRect(0, 0, W, H);
          const cx = W / 2, cy = H * 0.42, F = Math.min(W, H) * 0.9;
          field.forEach(s => {
            const z0 = s.z; s.z -= speed; if (s.z <= 0.02) { s.z = 1; s.x = (Math.random() - 0.5) * 2; s.y = (Math.random() - 0.5) * 2; return; }
            const x1 = cx + s.x / s.z * F * 0.5, y1 = cy + s.y / s.z * F * 0.5, x0 = cx + s.x / z0 * F * 0.5, y0 = cy + s.y / z0 * F * 0.5;
            const a = Math.min(1, (1 - s.z) * 1.4);
            bctx.strokeStyle = `rgba(${s.c},${a.toFixed(3)})`; bctx.lineWidth = Math.max(0.6, (1 - s.z) * 2.2);
            bctx.beginPath(); bctx.moveTo(x0, y0); bctx.lineTo(jp > 0.05 ? x1 + (x1 - x0) * jp * 6 : x1 + 0.1, jp > 0.05 ? y1 + (y1 - y0) * jp * 6 : y1 + 0.1); bctx.stroke();
          });
        }
        // oscilloscope
        if (wctx && ww) {
          wctx.clearRect(0, 0, ww, wh);
          const L = lockedAt ? 1 : lockP, mid = wh / 2, amp = wh * 0.32;
          const draw = (lw, alpha) => {
            wctx.beginPath();
            for (let x = 0; x <= ww; x += 2) {
              const u = x / ww, env = Math.sin(u * Math.PI);
              const clean = Math.sin(u * Math.PI * 6 - t * 9) * amp * env;
              const noise = (Math.random() - 0.5) * amp * 1.6 * env + Math.sin(u * 47 + t * 31) * amp * 0.4 * env;
              const y = mid + clean * (0.25 + L * 0.75) + noise * (1 - L);
              x ? wctx.lineTo(x, y) : wctx.moveTo(x, y);
            }
            wctx.strokeStyle = `rgba(${lockedAt ? '190,235,255' : '120,190,255'},${alpha})`; wctx.lineWidth = lw; wctx.stroke();
          };
          draw(6, 0.12); draw(2.2, 0.35); draw(1, 0.95);
        }
        if (flashed && t >= T.end) { finish(); return; }
        requestAnimationFrame(frame);
      };
      const finish = () => {
        if (done) return; done = true; removeEventListener('resize', fit); clearTimeout(safety);
        el.classList.add('ixl-out'); document.body.style.overflow = '';
        if (!flashed) { if (AU) AU.stop(0.3); try { openIntel(); } catch (err) { console.error(err); } }
        setTimeout(() => el.remove(), 520); resolve();
      };
      const safety = setTimeout(() => { if (!done) { ready = true; finish(); } }, 26000);
      requestAnimationFrame(frame);
    });
  }

  async function launch(e) {
    if (e) { e.preventDefault(); e.stopImmediatePropagation(); }
    if (busy) return; busy = true;
    if (window.SignalAudio) window.SignalAudio.unlock();
    if (Sound.on) Sound.ensure();
    const ready = (async () => {
      let failed = false;
      try { await refresh(); } catch { failed = true; }
      if (/failed/i.test(streamMessage || '')) failed = true;
      const m = C.build(Array.isArray(data.stories) ? data.stories : []);
      m.failed = failed; return m;
    })();
    try { await runLoader(ready); } finally { busy = false; }
  }

  // Replace the old warp launcher on the scan button (and any other entry points into the stream).
  const oldBtn = document.getElementById('refresh');
  if (oldBtn) { const btn = oldBtn.cloneNode(true); oldBtn.replaceWith(btn); btn.addEventListener('click', launch); }
  ['open-stream', 'nav-stream'].forEach(id => { const b = document.getElementById(id); if (b) { const n = b.cloneNode(true); b.replaceWith(n); n.addEventListener('click', () => openIntel()); } });
  window.addEventListener('signal-audio-change', () => { if (chrome) refreshTools(); });
  window.__intel = { launch, openIntel, get model() { return model; }, get list() { return list; }, go, get index() { return idx; } };
})();
