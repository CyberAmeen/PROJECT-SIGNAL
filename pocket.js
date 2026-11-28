/* PROJECT SIGNAL — POCKET SIGNAL (installable app + alerts).
   • Service worker with versioned shell cache; "New transmission available — tap to update" when a release lands.
   • Launch hand-off, standalone polish, "signal lost" state when offline.
   • One-time iOS Safari install hint.
   • Opt-in alerts (Web Push from SENTINEL): offered inside the installed app only after some exploring,
     with an explainer before the system prompt; settings, test transmission and an off switch under ALERTS.
   • Alert taps open the app straight to the story. */
(() => {
  'use strict';
  const html = document.documentElement;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) html.classList.add('ps-standalone');
  const ua = navigator.userAgent;
  const iOS = /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const iOSSafari = iOS && /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
  const API = (typeof sentinel === 'string' && sentinel) || 'https://project-signal-sentinel.aminhersi10.workers.dev';
  const pushable = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, cls, inner) => { const e = document.createElement(tag); if (cls) e.className = cls; if (inner != null) e.innerHTML = inner; return e; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
  const ICON = 'app/icon-180.png', EMBLEM = 'app/emblem.svg';
  const SB = window.SignalAudio;
  const click = cue => { try { if (SB && SB.enabled) SB.ui(cue || 'tap'); } catch {} };

  /* ---------------------------------------------------------------- launch hand-off */
  const launch = document.getElementById('ps-launch');
  if (launch) {
    if (!standalone) launch.remove();
    else {
      const go = () => { launch.classList.add('out'); setTimeout(() => launch.remove(), 950); };
      const ready = () => setTimeout(go, reduced() ? 150 : 420);
      if (document.readyState === 'complete') ready(); else addEventListener('load', ready, { once: true });
      setTimeout(go, 3500); // never block the app
    }
  }
  // no pinch-zoom in the installed app (the UI is built for one fixed scale)
  if (standalone) ['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));

  /* ---------------------------------------------------------------- pills: update + signal lost */
  let pill = null, pillTimer = 0;
  function showPill(kind, htmlText, onTap, sticky, ms) {
    hidePill(true);
    pill = el('div', 'ps-pill ' + kind, htmlText); pill.setAttribute('role', 'status');
    if (onTap) { pill.classList.add('update'); pill.addEventListener('click', onTap); }
    document.body.append(pill); requestAnimationFrame(() => requestAnimationFrame(() => pill && pill.classList.add('show')));
    clearTimeout(pillTimer); if (!sticky) pillTimer = setTimeout(() => hidePill(), ms || 3200);
  }
  function hidePill(now) { const p = pill; pill = null; if (!p) return; if (now) { p.remove(); return; } p.classList.remove('show'); setTimeout(() => p.remove(), 500); }

  function offlineState() {
    if (navigator.onLine) return;
    showPill('lost', '<i class="dot"></i><span><b>SIGNAL LOST</b>&nbsp; Showing saved transmissions</span>', null, false, 5500);
  }
  addEventListener('offline', offlineState);
  addEventListener('online', () => { if (pill && pill.classList.contains('lost')) showPill('', '<i class="dot"></i><span><b>UPLINK RESTORED</b></span>'); });
  if (!navigator.onLine) setTimeout(offlineState, 1200);

  /* ---------------------------------------------------------------- service worker + updates */
  let reg = null, applying = false;
  const swOK = 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') && !/[?&]nosw\b/.test(location.search);
  function offerUpdate(worker) {
    if (!worker || !navigator.serviceWorker.controller) return;
    showPill('update', '<i class="dot"></i><span>New transmission available</span><button type="button">TAP TO UPDATE</button>', () => applyUpdate(worker), true);
    window.__psUpdate = worker;
  }
  function applyUpdate(worker) { if (applying) return; applying = true; click('confirm'); try { worker.postMessage({ type: 'SKIP_WAITING' }); } catch {} setTimeout(() => location.reload(), 2500); }
  if (swOK) {
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (applying) location.reload(); });
    addEventListener('load', async () => {
      try {
        reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
        if (reg.waiting) offerUpdate(reg.waiting);
        reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed') offerUpdate(w); }); });
        let last = Date.now();
        const check = () => { if (Date.now() - last > 60e3) { last = Date.now(); reg.update().catch(() => {}); } };
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
          // an update the person never tapped is applied quietly the moment the app goes to the background
          else if (reg.waiting && navigator.serviceWorker.controller && standalone) applyUpdate(reg.waiting);
        });
        setInterval(() => reg.update().catch(() => {}), 30 * 60e3);
      } catch (e) { console.warn('service worker unavailable', e && e.message); }
    });
    navigator.serviceWorker.addEventListener('message', e => {
      const d = e.data || {};
      if (d.type === 'OPEN_STORY') openFromUrl(d.url);
      if (d.type === 'PUSH_RECEIVED') window.dispatchEvent(new CustomEvent('ps:push', { detail: d.payload }));
    });
  }

  /* ---------------------------------------------------------------- engagement (local only) */
  const eng = store.get('ps-engage', { secs: 0, sessions: 0, explored: false });
  eng.sessions++; store.set('ps-engage', eng);
  setInterval(() => { if (document.visibilityState === 'visible') { eng.secs += 15; store.set('ps-engage', eng); maybeOffer(); } }, 15000);
  const explored = () => { if (!eng.explored) { eng.explored = true; store.set('ps-engage', eng); } };
  window.addEventListener('intel:slide', e => { if (e.detail && e.detail.index >= 2) explored(); });
  document.getElementById('atlas-launch')?.addEventListener('click', explored);
  const onHub = () => !document.getElementById('power-gate') && document.getElementById('stream-shell')?.hidden !== false && document.getElementById('atlas-shell')?.hidden !== false && !document.querySelector('.ps-sheet,.ps-hint,.ixl,.rc-shell:not([hidden])');
  const gateGone = () => new Promise(res => { if (!document.getElementById('power-gate')) res(); else window.addEventListener('pg:done', () => setTimeout(res, 400), { once: true }); });

  /* ---------------------------------------------------------------- iOS Safari install hint (once, ever) */
  const SHARE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/></svg>';
  const ADD_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  function installHint(force) {
    if (!force && (standalone || !iOSSafari || store.get('ps-install-hint', null))) return;
    store.set('ps-install-hint', { shown: Date.now() }); // shown once — never nags
    const h = el('div', 'ps-hint', `<button type="button" class="h-x" aria-label="Dismiss">✕</button>
      <div class="h-top"><img src="${ICON}" alt=""><div><h3>Install Project Signal</h3><p>Full-screen, opens instantly, works offline — and can alert you when a Gold Signal comes in.</p></div></div>
      <ol><li><em>1</em>Tap ${SHARE_SVG}<span><strong>Share</strong> in the Safari toolbar</span></li><li><em>2</em>${ADD_SVG}<span>Choose <strong>Add to Home Screen</strong></span></li></ol>
      <button type="button" class="h-ok">GOT IT</button><i class="h-arrow"></i>`);
    h.setAttribute('role', 'dialog'); h.setAttribute('aria-label', 'Install Project Signal');
    const close = () => { h.classList.remove('show'); setTimeout(() => h.remove(), 600); click('close'); };
    h.querySelector('.h-x').addEventListener('click', close); h.querySelector('.h-ok').addEventListener('click', close);
    document.body.append(h); requestAnimationFrame(() => requestAnimationFrame(() => h.classList.add('show')));
    return h;
  }
  if (iOSSafari && !standalone && !store.get('ps-install-hint', null)) gateGone().then(async () => {
    for (let i = 0; i < 40; i++) { await sleep(3000); if (onHub() && (eng.secs >= 20 || i >= 4)) { installHint(); return; } }
  });

  /* ---------------------------------------------------------------- alerts: API + subscription */
  const b2u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
  async function api(path, body) {
    const r = await fetch(API + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' } : { cache: 'no-store' });
    let j = {}; try { j = await r.json(); } catch {}
    if (!r.ok) { const e = new Error(j.error || ('HTTP ' + r.status)); e.status = r.status; e.body = j; throw e; }
    return j;
  }
  const state = () => store.get('ps-push', null); // {id, token, prefs, key}
  async function swReg() { if (!swOK) throw new Error('Service worker unavailable'); return reg || await navigator.serviceWorker.ready; }
  async function subscribe(prefs) {
    const r = await swReg();
    const { publicKey } = await api('/v1/push/key');
    let sub = await r.pushManager.getSubscription();
    if (sub) { const cur = sub.options && sub.options.applicationServerKey; if (cur && btoa(String.fromCharCode(...new Uint8Array(cur))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== publicKey) { await sub.unsubscribe(); sub = null; } }
    if (!sub) sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b2u(publicKey) });
    const res = await api('/v1/push/subscribe', { subscription: sub.toJSON(), prefs, tz });
    const s = { id: res.id, token: res.token, prefs: res.prefs, key: publicKey, at: Date.now() };
    store.set('ps-push', s);
    try { (r.active || navigator.serviceWorker.controller)?.postMessage({ type: 'PUSH_META', meta: { api: API, key: publicKey, prefs: res.prefs, tz } }); } catch {}
    paintChip(); return s;
  }
  async function unsubscribe() {
    const s = state();
    try { if (s) await api('/v1/push/unsubscribe', { id: s.id, token: s.token }); } catch {}
    try { const r = await swReg(); const sub = await r.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch {}
    store.del('ps-push'); paintChip();
  }
  async function savePrefs(prefs) {
    const s = state(); if (!s) return;
    try { const r = await api('/v1/push/prefs', { id: s.id, token: s.token, prefs, tz }); s.prefs = r.prefs; store.set('ps-push', s); }
    catch (e) { if (e.status === 404 || e.status === 401) await subscribe(prefs); else throw e; }
  }
  // keep the server's copy in step if the browser dropped or rotated the subscription
  async function reconcile() {
    const s = state(); if (!s || !pushable || Notification.permission !== 'granted') { if (s && pushable && Notification.permission === 'denied') { store.del('ps-push'); paintChip(); } return; }
    try { const r = await swReg(); const sub = await r.pushManager.getSubscription(); if (!sub) await subscribe(s.prefs); } catch {}
  }

  /* ---------------------------------------------------------------- alerts: UI */
  const ROWS = [
    ['gold', '◆', 'gold', 'Gold Signal', 'The day’s standout sighting — only when one comes in.'],
    ['major', '◉', '', 'Major breaking stories', 'When several outlets report the same story at once.']
  ];
  function rowsHTML(prefs) { return ROWS.map(([k, ic, cls, t, d]) => `<div class="ps-row" data-k="${k}"><span class="ic ${cls}">${ic}</span><span class="tx"><b>${t}</b><span>${d}</span></span><button type="button" class="ps-sw" role="switch" aria-checked="${prefs[k] !== false}" aria-label="${t}"></button></div>`).join(''); }
  function wireRows(root, prefs, onChange) {
    root.querySelectorAll('.ps-row').forEach(row => row.addEventListener('click', () => {
      const k = row.dataset.k, sw = row.querySelector('.ps-sw'); prefs[k] = sw.getAttribute('aria-checked') !== 'true';
      if (!prefs.gold && !prefs.major) prefs[k === 'gold' ? 'major' : 'gold'] = true; // at least one stays on
      root.querySelectorAll('.ps-row').forEach(r => r.querySelector('.ps-sw').setAttribute('aria-checked', String(prefs[r.dataset.k] !== false)));
      click('toggleOn'); onChange && onChange(prefs);
    }));
  }
  function openSheet(inner, label) {
    const veil = el('div', 'ps-veil'), sh = el('div', 'ps-sheet', '<div class="grab"></div>' + inner);
    sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-label', label);
    document.body.append(veil, sh);
    requestAnimationFrame(() => requestAnimationFrame(() => { veil.classList.add('show'); sh.classList.add('show'); }));
    const close = () => { veil.classList.remove('show'); sh.classList.remove('show'); setTimeout(() => { veil.remove(); sh.remove(); }, 560); };
    veil.addEventListener('click', close);
    let y0 = null; sh.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
    sh.addEventListener('touchend', e => { if (y0 != null && e.changedTouches[0].clientY - y0 > 90 && sh.scrollTop <= 0) close(); y0 = null; }, { passive: true });
    return { sh, close };
  }
  const blockedHelp = 'Notifications are blocked for this app. Open iPhone <b>Settings → Notifications → Project Signal</b> and allow them, then try again.';

  function offerAlerts(force) {
    const prefs = { gold: true, major: true };
    const { sh, close } = openSheet(`<div class="s-emb"><img src="${EMBLEM}" alt=""><i></i><i></i><i></i></div>
      <div class="s-kick">OBSERVATION NETWORK · ALERTS</div><h2>Stay on frequency, Commander</h2>
      <p class="s-lead">Get a ping when something big comes through — and nothing else.</p>
      ${rowsHTML(prefs)}
      <p class="ps-fine">At most 3 a day · silent 10 pm–8 am your time · turn off anytime under ALERTS.<br>No account, no personal data.</p>
      <button type="button" class="ps-btn primary" data-go>ENABLE ALERTS</button><button type="button" class="ps-btn ghost" data-later>NOT NOW</button><p class="ps-msg" aria-live="polite"></p>`, 'Turn on alerts');
    wireRows(sh, prefs);
    const msg = sh.querySelector('.ps-msg'), go = sh.querySelector('[data-go]');
    sh.querySelector('[data-later]').addEventListener('click', () => { const a = store.get('ps-push-ask', { n: 0 }); store.set('ps-push-ask', { n: a.n + 1, at: Date.now() }); close(); });
    go.addEventListener('click', async () => {
      go.disabled = true; msg.textContent = 'Requesting permission…';
      let perm = Notification.permission;
      try { if (perm === 'default') perm = await Notification.requestPermission(); } catch { perm = Notification.permission; }
      store.set('ps-push-ask', { n: 99, at: Date.now() }); // asked once: never offered again automatically
      if (perm !== 'granted') { msg.innerHTML = perm === 'denied' ? blockedHelp : 'No problem — you can turn alerts on later under ALERTS.'; go.disabled = false; go.textContent = 'CLOSE'; go.onclick = close; return; }
      msg.textContent = 'Linking this device to SENTINEL…';
      try { await subscribe(prefs); click('confirm'); armed(sh, close); }
      catch (e) { msg.textContent = 'Couldn’t reach SENTINEL (' + (e.message || 'error') + '). Try again from ALERTS.'; go.disabled = false; }
    });
    return sh;
  }
  function armed(sh, close) {
    sh.querySelector('h2').textContent = 'Alerts armed';
    sh.querySelector('.s-lead').textContent = 'You’ll hear from us when it matters. Want to check it works?';
    sh.querySelectorAll('.ps-row,.ps-fine,[data-later]').forEach(n => n.remove()); sh.querySelector('.ps-msg').textContent = '';
    const go = sh.querySelector('[data-go]'); go.disabled = false; go.textContent = 'SEND A TEST TRANSMISSION';
    go.onclick = () => sendTest(sh.querySelector('.ps-msg'), go);
    const done = el('button', 'ps-btn ghost', 'DONE'); done.type = 'button'; done.onclick = close; go.after(done);
  }
  async function sendTest(msg, btn) {
    const s = state(); if (!s) return;
    btn.disabled = true; msg.textContent = 'Transmitting…';
    try { await api('/v1/push/test', { id: s.id, token: s.token }); msg.textContent = 'Sent — it should arrive in a few seconds.'; }
    catch (e) { msg.textContent = e.status === 429 ? 'Test limit reached — try again within the hour.' : e.body && e.body.gone ? 'This device was unsubscribed — turn alerts on again.' : 'Couldn’t send (' + e.message + ').'; if (e.body && e.body.gone) { store.del('ps-push'); paintChip(); } }
    setTimeout(() => { btn.disabled = false; }, 4000);
  }

  function settings() {
    const s = state(), perm = pushable ? Notification.permission : 'unsupported';
    let status, body;
    if (!pushable || !swOK) {
      status = '<p class="ps-status off"><i></i>NOT AVAILABLE HERE</p>';
      body = iOS && !standalone ? '<p class="s-lead">On iPhone, alerts work in the installed app. Tap <b>Share → Add to Home Screen</b>, then open Project Signal from your Home Screen.</p>' : '<p class="s-lead">This browser can’t receive alerts.</p>';
    } else if (s && perm === 'granted') {
      status = '<p class="ps-status"><i></i>ALERTS ARMED</p>';
      body = rowsHTML({ ...s.prefs }) + '<p class="ps-fine">At most 3 a day · silent 10 pm–8 am your time.</p><button type="button" class="ps-btn primary" data-test>SEND A TEST TRANSMISSION</button><button type="button" class="ps-btn danger" data-off>TURN OFF ALERTS</button>';
    } else if (perm === 'denied') {
      status = '<p class="ps-status warn"><i></i>BLOCKED</p>'; body = `<p class="s-lead">${blockedHelp}</p>`;
    } else {
      status = '<p class="ps-status off"><i></i>ALERTS OFF</p>'; body = '<button type="button" class="ps-btn primary" data-on>TURN ON ALERTS</button>';
    }
    const { sh, close } = openSheet(`<div class="s-kick">OBSERVATION NETWORK</div><h2>Alerts</h2>${status}${body}<button type="button" class="ps-btn ghost" data-close>CLOSE</button><p class="ps-msg" aria-live="polite"></p>`, 'Alert settings');
    const msg = sh.querySelector('.ps-msg');
    sh.querySelector('[data-close]').onclick = close;
    if (s) wireRows(sh, { ...s.prefs }, async p => { msg.textContent = 'Saving…'; try { await savePrefs(p); msg.textContent = 'Saved.'; } catch { msg.textContent = 'Couldn’t save — check your connection.'; } });
    const t = sh.querySelector('[data-test]'); if (t) t.onclick = () => sendTest(msg, t);
    const off = sh.querySelector('[data-off]'); if (off) off.onclick = async () => { off.disabled = true; await unsubscribe(); msg.textContent = 'Alerts turned off. Nothing more will be sent to this device.'; setTimeout(close, 1200); };
    const on = sh.querySelector('[data-on]'); if (on) on.onclick = () => { close(); setTimeout(() => offerAlerts(true), 450); };
    return sh;
  }

  /* header chip: ALERTS (installed app, or any browser that already has alerts on) */
  let chip = null;
  function paintChip() {
    if (!chip) return; const on = !!state() && pushable && Notification.permission === 'granted';
    chip.classList.toggle('on', on); chip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18a8.5 8.5 0 0 1 0-12M18 6a8.5 8.5 0 0 1 0 12M9 15a4.2 4.2 0 0 1 0-6M15 9a4.2 4.2 0 0 1 0 6"/><circle cx="12" cy="12" r="1.8"/></svg><i></i><span class="t">ALERTS ${on ? 'ON' : 'OFF'}</span>`; chip.setAttribute('aria-label', on ? 'Alerts on — open alert settings' : 'Alerts off — open alert settings');
  }
  function mountChip() {
    if (chip || !(standalone || state() || /[?&]alerts\b/.test(location.search))) return;
    const head = document.querySelector('.sb-head') || document.querySelector('header .status')?.parentNode; if (!head) return;
    chip = el('button', 'ps-alert-chip'); chip.type = 'button'; chip.addEventListener('click', () => { click('open'); settings(); });
    head.insertBefore(chip, head.firstChild); paintChip();
  }
  setTimeout(mountChip, 0); addEventListener('load', mountChip);

  function maybeOffer() {
    if (!standalone || !pushable || !swOK || state() || Notification.permission !== 'default') return;
    const ask = store.get('ps-push-ask', { n: 0, at: 0 });
    if (ask.n >= 2 || (ask.n === 1 && Date.now() - ask.at < 3 * 86400e3)) return; // "Not now" → one more offer after 3 days, then never
    if (!eng.explored || (eng.secs < 60 && eng.sessions < 2)) return;
    if (!onHub() || document.querySelector('.ps-sheet')) return;
    offerAlerts();
  }
  gateGone().then(() => { setTimeout(maybeOffer, 2500); reconcile(); });
  window.addEventListener('intel:slide', () => {}); // (intel close is noticed by the 15 s tick)

  /* ---------------------------------------------------------------- deep links: ?story=<url>&sid=<id> */
  async function openStory(url, sid) {
    await gateGone();
    if (document.getElementById('atlas-shell')?.hidden === false) document.getElementById('atlas-exit')?.click();
    const I = window.__intel; if (!I) return;
    const find = () => (I.list || []).findIndex(c => c && (c.url === url || (sid && (c.memberIds || []).includes(sid)) || (c.memberIds || []).includes(url) || (c.outlets || []).some(o => o.url === url)));
    let i = document.getElementById('stream-shell')?.hidden === false ? find() : -1;
    if (i < 0) { try { if (typeof refresh === 'function') await refresh(); } catch {} I.openIntel(); await sleep(60); i = find(); }
    I.go(Math.max(0, i), true);
    if (i < 0) showPill('', '<i class="dot"></i><span>That transmission has left the window — here’s the latest</span>');
    window.dispatchEvent(new CustomEvent('ps:opened-story', { detail: { url, found: i >= 0, index: i } }));
  }
  function openFromUrl(href) {
    let u; try { u = new URL(href, location.href); } catch { return; }
    const story = u.searchParams.get('story'), sid = u.searchParams.get('sid');
    if (story) openStory(story, sid); else if (u.searchParams.get('via') === 'alert-test') showPill('', '<i class="dot"></i><span><b>TEST RECEIVED</b>&nbsp; Alerts are working</span>');
  }
  const q = new URLSearchParams(location.search);
  if (q.get('story') || q.get('via')) {
    const href = location.href;
    try { const clean = new URL(location.href); ['story', 'sid', 'via'].forEach(k => clean.searchParams.delete(k)); history.replaceState(null, '', clean.pathname + clean.search + clean.hash); } catch {}
    // opened from an alert: skip the power-on ceremony (silent boot) and go straight to the story
    if (q.get('story')) { const g = document.getElementById('power-gate'); if (g) setTimeout(() => window.dispatchEvent(new Event('ps:quickboot')), 60); }
    openFromUrl(href);
  }

  window.PocketSignal = { installHint: () => installHint(true), offerAlerts: () => offerAlerts(true), settings, subscribe, unsubscribe, openStory, get state() { return state(); }, get standalone() { return standalone; }, applyUpdate: () => window.__psUpdate && applyUpdate(window.__psUpdate) };
})();
