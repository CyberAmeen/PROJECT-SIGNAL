// POCKET SIGNAL end-to-end test against the STAGING SENTINEL Worker with a real browser push subscription.
// Real Chrome (headed, under xvfb) subscribes through the app's own opt-in UI → subscription saved in KV →
// the scheduled-check code path runs (admin trigger, staging-only simulated Gold Signal) → the push service
// delivers an encrypted message → the service worker shows the notification → "tapping" it (same code path
// as notificationclick) opens the app on that story. Then: test endpoint, no duplicates, off switch.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const S = process.env.STAGING, ADMIN = process.env.ADMIN, PAGE = 'http://localhost:8080/index.html?sentinel=staging';
const log = (...a) => console.log(...a), results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok: !!ok, extra }); log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' — ' + extra : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const admin = async body => (await fetch(S + '/admin/push/check', { method: 'POST', headers: { 'X-Sentinel-Admin-Token': ADMIN, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })).json();

// a persistent profile: Chrome disables the Push API in incognito-style contexts
// the browser's time zone is the subscriber's: pick one where it is daytime now, so quiet hours don't hold the alert
const DAYTIME = ['Pacific/Honolulu', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney']
  .find(z => { const h = +new Intl.DateTimeFormat('en-US', { timeZone: z, hour: 'numeric', hourCycle: 'h23' }).format(new Date()); return h >= 10 && h <= 18; }) || 'UTC';
log('subscriber time zone for this run:', DAYTIME);
const ctx = await chromium.launchPersistentContext('/tmp/e2e/profile', { channel: 'chrome', headless: false, timezoneId: DAYTIME, viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, args: ['--no-first-run', '--autoplay-policy=no-user-gesture-required'] });
const browser = { close: () => ctx.close() };
await ctx.grantPermissions(['notifications'], { origin: 'http://localhost:8080' });
await ctx.addInitScript("Object.defineProperty(navigator,'standalone',{get:()=>true});");
const page = ctx.pages()[0] || await ctx.newPage(); const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() !== 'log' || /push|sw|subscri/i.test(m.text())) log('  [console.' + m.type() + '] ' + m.text().slice(0, 300)); if (m.type() === 'error' && !/Failed to load resource|net::|fonts\.g/.test(m.text())) errors.push(m.text()); });

try {
  const key = await (await fetch(S + '/v1/push/key')).json();
  check('staging serves a VAPID public key', /^B[A-Za-z0-9_-]{86}$/.test(key.publicKey || ''), (key.publicKey || JSON.stringify(key)).slice(0, 16) + '…');

  await page.goto(PAGE); await sleep(1500);
  await page.click('#power-gate .pg-silent'); await sleep(4500);
  check('service worker controls the page', await page.evaluate(async () => { await navigator.serviceWorker.ready; return !!navigator.serviceWorker.controller || !!(await navigator.serviceWorker.getRegistration()); }));

  // the opt-in explainer → Enable (permission already granted for the test origin)
  await page.evaluate(() => PocketSignal.offerAlerts()); await sleep(900);
  await page.screenshot({ path: 'e2e-optin.png' });
  await page.click('.ps-sheet [data-go]');
  const ok = await page.waitForFunction(() => PocketSignal.state && PocketSignal.state.id, null, { timeout: 40000 }).then(() => true).catch(() => false);
  if (!ok) {
    log('  opt-in message:', await page.evaluate(() => document.querySelector('.ps-sheet .ps-msg')?.textContent));
    log('  direct subscribe attempt:', await page.evaluate(async () => { try { const r = await navigator.serviceWorker.ready; const k = (await (await fetch(sentinel + '/v1/push/key')).json()).publicKey; const b = Uint8Array.from(atob(k.replace(/-/g, '+').replace(/_/g, '/') + '='), c => c.charCodeAt(0)); const s = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b }); return 'ok ' + s.endpoint.slice(0, 60); } catch (e) { return 'ERR ' + e.name + ': ' + e.message; } }));
    await page.screenshot({ path: 'e2e-optin-fail.png' });
    throw new Error('subscription did not complete');
  }
  const st = await page.evaluate(() => PocketSignal.state);
  const endpoint = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).pushManager.getSubscription()).endpoint);
  check('real push subscription created through the opt-in UI', /^https:\/\/(fcm\.googleapis\.com|.*push)/.test(endpoint), new URL(endpoint).host);
  check('subscription saved anonymously in SENTINEL KV', st.id && st.id.length === 32 && st.token, 'id ' + st.id.slice(0, 8) + '…');
  await page.screenshot({ path: 'e2e-armed.png' });

  // pick a real story the app shows, then fire the scheduled check with a simulated Gold Signal for it
  const target = await page.evaluate(async () => { await refresh(); const C = window.IntelCore.build(data.stories); const c = C.clusters[3] || C.clusters[0]; return { url: c.url, title: c.title }; });
  const rep = await admin({ simulate: { kind: 'gold', title: target.title, url: target.url } });
  check('scheduled check found the subscriber and sent', rep.report && rep.report.sent >= 1, JSON.stringify(rep.report));
  const note = await page.waitForFunction(async () => { const n = await (await navigator.serviceWorker.ready).getNotifications(); const g = n.find(x => /Gold Signal/.test(x.title)); return g ? { title: g.title, body: g.body, url: g.data && g.data.url, tag: g.tag } : null; }, null, { timeout: 45000, polling: 1000 }).then(h => h.jsonValue()).catch(() => null);
  check('encrypted push delivered and shown by the service worker', note, note ? note.title + ' | ' + note.body.slice(0, 70) : 'no notification within 45 s');
  check('notification carries the story deep link', note && note.url.includes(encodeURIComponent(target.url)));
  if (note) {
    await page.evaluate(() => document.querySelectorAll('.ps-veil').forEach(v => v.click())); await sleep(700);
    await page.evaluate(u => navigator.serviceWorker.controller.postMessage({ type: 'SIMULATE_CLICK', url: u }), note.url.replace('https://cyberameen.github.io/PROJECT-SIGNAL/', 'http://localhost:8080/'));
    await page.waitForFunction(() => !document.getElementById('stream-shell').hidden, null, { timeout: 15000 }).catch(() => {});
    await sleep(1500);
    const shown = await page.evaluate(() => document.querySelector('.stream-slide.is-visible .ix-title')?.textContent || '');
    check('tapping the alert opens the app on that story', shown.trim() === target.title.trim(), shown.slice(0, 70));
    await page.screenshot({ path: 'e2e-opened-story.png' });
  }

  const again = await admin();
  check('next scheduled check sends no duplicate', again.report && again.report.sent === 0, JSON.stringify(again.report));

  // in-app test transmission (protected by the per-device token)
  await page.evaluate(() => { document.getElementById('stream-close')?.click(); }); await sleep(800);
  const t = await page.evaluate(async s => (await fetch(sentinel + '/v1/push/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, token: s.token }) })).status, st);
  const tn = await page.waitForFunction(async () => (await (await navigator.serviceWorker.ready).getNotifications()).some(x => x.tag === 'ps-test'), null, { timeout: 45000, polling: 1000 }).then(() => true).catch(() => false);
  check('test endpoint delivers "Test transmission"', t === 200 && tn, 'HTTP ' + t);
  const bad = (await fetch(S + '/v1/push/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: st.id, token: 'wrong' }) })).status;
  check('test endpoint refuses a wrong token', bad === 401, 'HTTP ' + bad);

  // off switch
  await page.evaluate(() => PocketSignal.settings()); await sleep(900);
  await page.screenshot({ path: 'e2e-settings.png' });
  await page.click('.ps-sheet [data-off]'); await sleep(2500);
  const gone = (await fetch(S + '/v1/push/prefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: st.id, token: st.token, prefs: {} }) })).status;
  check('turning alerts off deletes the subscription', gone === 404 && !(await page.evaluate(() => PocketSignal.state)), 'prefs → HTTP ' + gone);
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) { check('e2e run', false, String(e && e.stack || e).slice(0, 400)); }
finally { writeFileSync('e2e-results.json', JSON.stringify(results, null, 1)); await browser.close(); }
const failed = results.filter(r => !r.ok);
log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
