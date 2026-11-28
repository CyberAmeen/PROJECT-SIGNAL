/** PROJECT SIGNAL // SENTINEL — POCKET SIGNAL push alerts.
 * Standard Web Push (RFC 8030) with VAPID (RFC 8292) and aes128gcm payload encryption (RFC 8291),
 * implemented on WebCrypto so it runs inside the Worker with no dependencies.
 * Subscriptions are anonymous: the push endpoint + its keys, two on/off preferences and a time zone.
 * Secret (never in code): VAPID_JWK — the P-256 private key as a JWK. Tokens are derived from it.
 */

const enc = new TextEncoder();
export const b64u = buf => { let s = ''; for (const c of new Uint8Array(buf)) s += String.fromCharCode(c); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export const ub64 = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const concat = (...a) => { const o = new Uint8Array(a.reduce((t, x) => t + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
async function hmac(key, data) { const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, data)); }
const sha256hex = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');

export const SITE = 'https://cyberameen.github.io/PROJECT-SIGNAL/';
const SUBJECT = 'https://cyberameen.github.io/PROJECT-SIGNAL/';
const PUSH_HOSTS = [/^web\.push\.apple\.com$/, /\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];
const MAX_PER_DAY = 3, QUIET_FROM = 22, QUIET_TO = 8, MIN_GAP_MS = 45 * 60000, TESTS_PER_HOUR = 3;
const GOLD_WINDOW_MS = 14 * 3600e3, MAJOR_WINDOW_MS = 6 * 3600e3;

const keys = env => { const p = env.KEY_PREFIX || ''; return { sub: p + 'push:sub:', events: p + 'push:events:v1' }; };

/* ---------------------------------------------------------------- crypto */
export async function encryptPayload(text, p256dh, auth, _test) {
  const uaPub = ub64(p256dh), authSecret = ub64(auth);
  if (uaPub.length !== 65 || authSecret.length < 16) throw new Error('bad subscription keys');
  const as = _test?.as || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const prkKey = await hmac(authSecret, ecdh);
  const ikm = await hmac(prkKey, concat(enc.encode('WebPush: info\0'), uaPub, asPub, new Uint8Array([1])));
  const salt = _test?.salt || crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc.encode(text), new Uint8Array([2]))));
  const head = new Uint8Array(86); head.set(salt, 0); new DataView(head.buffer).setUint32(16, 4096); head[20] = 65; head.set(asPub, 21);
  return concat(head, ct);
}
function jwkOf(env) { const j = JSON.parse(env.VAPID_JWK); if (!j.d || !j.x || !j.y) throw new Error('VAPID_JWK incomplete'); return j; }
export const publicKeyOf = env => { const j = jwkOf(env); return b64u(concat(new Uint8Array([4]), ub64(j.x), ub64(j.y))); };
export async function vapidHeader(env, endpoint) {
  const j = jwkOf(env);
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: j.x, y: j.y, d: j.d }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const h = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const c = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(h + '.' + c));
  return `vapid t=${h}.${c}.${b64u(sig)}, k=${publicKeyOf(env)}`;
}
async function tokenFor(env, id) { return b64u(await hmac(enc.encode('ps-push-token:' + jwkOf(env).d), enc.encode(id))).slice(0, 32); }

/** Send one message. Returns the push service's HTTP status (201 = accepted). */
export async function sendPush(env, sub, msg, { ttl = 6 * 3600, urgency = 'normal', topic } = {}) {
  const body = await encryptPayload(JSON.stringify(msg), sub.keys.p256dh, sub.keys.auth);
  const headers = { TTL: String(ttl), Urgency: urgency, 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', Authorization: await vapidHeader(env, sub.endpoint) };
  if (topic) headers.Topic = topic.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  const r = await fetch(sub.endpoint, { method: 'POST', headers, body });
  return r.status;
}

/* ---------------------------------------------------------------- helpers */
function validEndpoint(u) { try { const x = new URL(u); return x.protocol === 'https:' && PUSH_HOSTS.some(re => re.test(x.hostname)) && u.length < 1200; } catch { return false; } }
function validTz(tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; } }
export function localClock(tz, nowMs = Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(nowMs)).map(p => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}
const quiet = h => h >= QUIET_FROM || h < QUIET_TO;
const cleanPrefs = p => ({ gold: p?.gold !== false, major: p?.major !== false });
const trim = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const storyLink = (url, id) => SITE + '?story=' + encodeURIComponent(url) + (id ? '&sid=' + encodeURIComponent(id) : '') + '&via=alert';

export function messageFor(ev) {
  if (ev.kind === 'gold') return { title: '◆ Gold Signal', body: 'A Gold Signal just came in, Commander. ' + trim(ev.title, 140), url: storyLink(ev.url, ev.storyId), tag: ev.id, kind: 'gold', at: ev.at };
  if (ev.kind === 'test') return { title: 'Test transmission', body: 'Uplink confirmed, Commander. Alerts from the Observation Network will reach this device.', url: SITE + '?via=alert-test', tag: 'ps-test', kind: 'test', at: Date.now() };
  return { title: 'Major transmission', body: `A major story is breaking, Commander — reported by ${ev.count} outlets. ` + trim(ev.title, 120), url: storyLink(ev.url, ev.storyId), tag: ev.id, kind: 'major', at: ev.at };
}

/* ---------------------------------------------------------------- events from a fresh snapshot */
const RANK = { official: 5, press: 4, specialist: 3, web: 2, tabloid: 1 };
export function isMajor(c) { return c.count >= 4 || (c.count >= 3 && (RANK[c.topTier] || 0) >= 4) || (c.topTier === 'official' && c.count >= 2); }
export function detectEvents(snapshot, gold, prev, nowMs = Date.now()) {
  const list = (prev?.list || []).filter(e => nowMs - e.at < 48 * 3600e3);
  const fresh = [];
  const seen = (urls, title) => list.some(e => e.urls?.some(u => urls.includes(u)) || (title && norm(e.title) === norm(title)));
  if (gold?.story?.url) {
    const id = 'gold-' + gold.day;
    if (!list.some(e => e.id === id)) fresh.push({ id, kind: 'gold', title: gold.story.title, url: gold.story.url, storyId: gold.story.id || null, urls: [gold.story.url], at: nowMs });
  }
  const stories = Array.isArray(snapshot?.stories) ? snapshot.stories : [];
  for (const c of (snapshot?.clusters || [])) {
    if (!isMajor(c)) continue;
    const newest = Date.parse(c.newest), earliest = Date.parse(c.earliest);
    if (!(nowMs - newest < 3 * 3600e3 && nowMs - earliest < 24 * 3600e3)) continue;
    const urls = (c.outlets || []).map(o => o.url).filter(Boolean);
    if (seen(urls, c.title) || fresh.some(e => e.urls.some(u => urls.includes(u)))) continue;
    const lead = stories.find(s => s.url === c.url);
    fresh.push({ id: 'major-' + c.id, kind: 'major', title: c.title, url: c.url, storyId: lead?.id || null, urls, count: c.count, at: nowMs });
    if (fresh.length >= 4) break;
  }
  return { list: [...fresh, ...list].slice(0, 40), fresh };
}

/* ---------------------------------------------------------------- the scheduled check */
export async function pushCheck(env, snapshot, { gold = null, simulate = null, nowMs = Date.now() } = {}) {
  const report = { events: 0, fresh: 0, subs: 0, sent: 0, skipped: {}, removed: 0 };
  if (!env.VAPID_JWK || !env.SENTINEL_KV) { report.disabled = true; return report; }
  const kv = env.SENTINEL_KV, K = keys(env);
  const prev = await kv.get(K.events, 'json');
  let { list, fresh } = detectEvents(snapshot, gold, prev, nowMs);
  if (simulate) { const ev = { id: 'sim-' + nowMs.toString(36), kind: simulate.kind === 'gold' ? 'gold' : 'major', title: trim(simulate.title || 'Simulated transmission', 160), url: simulate.url || SITE, storyId: simulate.storyId || null, urls: [simulate.url || SITE], count: simulate.count || 4, at: nowMs }; list = [ev, ...list]; fresh = [ev, ...fresh]; }
  if (fresh.length) await kv.put(K.events, JSON.stringify({ list, updatedAt: new Date(nowMs).toISOString() }));
  report.fresh = fresh.length;
  const live = list.filter(e => nowMs - e.at < (e.kind === 'gold' ? GOLD_WINDOW_MS : MAJOR_WINDOW_MS));
  report.events = live.length;
  if (!live.length) return report;
  const skip = r => { report.skipped[r] = (report.skipped[r] || 0) + 1; };
  let cursor;
  do {
    const page = await kv.list({ prefix: K.sub, cursor });
    cursor = page.list_complete ? null : page.cursor;
    for (const k of page.keys) {
      const sub = await kv.get(k.name, 'json'); if (!sub) continue; report.subs++;
      const clock = localClock(sub.tz || 'UTC', nowMs);
      if (sub.day !== clock.day) { sub.day = clock.day; sub.count = 0; }
      const want = live.filter(e => (e.kind === 'gold' ? sub.prefs.gold : sub.prefs.major) && !(sub.sent || []).includes(e.id) && e.at >= (sub.created || 0) - 60000);
      if (!want.length) { skip('nothing-new'); continue; }
      if (quiet(clock.hour)) { skip('quiet-hours'); continue; }
      if ((sub.count || 0) >= MAX_PER_DAY) { skip('daily-cap'); continue; }
      if (sub.last && nowMs - sub.last < MIN_GAP_MS) { skip('spacing'); continue; }
      const ev = want.find(e => e.kind === 'gold') || want.sort((a, b) => b.at - a.at)[0];
      let status = 0;
      try { status = await sendPush(env, sub, messageFor(ev), { urgency: ev.kind === 'gold' ? 'high' : 'normal', topic: ev.id.slice(-30) }); } catch (e) { status = -1; console.error('push failed', e?.message || e); }
      if (status === 404 || status === 410) { await kv.delete(k.name); report.removed++; continue; }
      if (status >= 200 && status < 300) { sub.sent = [ev.id, ...(sub.sent || [])].slice(0, 60); sub.count = (sub.count || 0) + 1; sub.last = nowMs; sub.failures = 0; report.sent++; }
      else { sub.failures = (sub.failures || 0) + 1; skip('error-' + status); if (sub.failures >= 5) { await kv.delete(k.name); report.removed++; continue; } }
      await kv.put(k.name, JSON.stringify(sub));
    }
  } while (cursor);
  return report;
}

/* ---------------------------------------------------------------- HTTP: /v1/push/* */
export async function handlePush(request, env, url, respond) {
  const path = url.pathname;
  if (!env.VAPID_JWK) return respond({ error: 'Alerts are not configured yet' }, 503);
  if (path === '/v1/push/key' && request.method === 'GET') return respond({ publicKey: publicKeyOf(env) });
  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const raw = await request.text(); if (raw.length > 4096) return respond({ error: 'Too large' }, 413);
  let body; try { body = JSON.parse(raw); } catch { return respond({ error: 'Bad JSON' }, 400); }
  const kv = env.SENTINEL_KV, K = keys(env), nowMs = Date.now();
  if (path === '/v1/push/subscribe') {
    const s = body.subscription || {};
    if (!validEndpoint(s.endpoint) || !s.keys?.p256dh || !s.keys?.auth) return respond({ error: 'Not a recognised push subscription' }, 400);
    try { if (ub64(s.keys.p256dh).length !== 65 || ub64(s.keys.auth).length < 16) throw 0; } catch { return respond({ error: 'Bad subscription keys' }, 400); }
    const id = (await sha256hex(s.endpoint)).slice(0, 32);
    const old = await kv.get(K.sub + id, 'json');
    const sub = { ...(old || {}), endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth }, prefs: cleanPrefs(body.prefs), tz: validTz(body.tz) ? body.tz : 'UTC', created: old?.created || nowMs, sent: old?.sent || [], failures: 0 };
    await kv.put(K.sub + id, JSON.stringify(sub));
    return respond({ ok: true, id, token: await tokenFor(env, id), prefs: sub.prefs, rules: { maxPerDay: MAX_PER_DAY, quietHours: `${QUIET_FROM}:00–${String(QUIET_TO).padStart(2, '0')}:00 local` } });
  }
  const id = String(body.id || '').replace(/[^a-f0-9]/g, '').slice(0, 32);
  if (!id || body.token !== await tokenFor(env, id)) return respond({ error: 'Unauthorized' }, 401);
  const sub = await kv.get(K.sub + id, 'json');
  if (path === '/v1/push/unsubscribe') { await kv.delete(K.sub + id); return respond({ ok: true }); }
  if (!sub) return respond({ error: 'Subscription not found', gone: true }, 404);
  if (path === '/v1/push/prefs') {
    sub.prefs = cleanPrefs(body.prefs); if (validTz(body.tz)) sub.tz = body.tz;
    await kv.put(K.sub + id, JSON.stringify(sub)); return respond({ ok: true, prefs: sub.prefs });
  }
  if (path === '/v1/push/test') {
    sub.tests = (sub.tests || []).filter(t => nowMs - t < 3600e3);
    if (sub.tests.length >= TESTS_PER_HOUR) return respond({ error: 'Test limit reached — try again within the hour', retryAfterSeconds: Math.ceil((sub.tests[0] + 3600e3 - nowMs) / 1000) }, 429);
    let status = 0; try { status = await sendPush(env, sub, messageFor({ kind: 'test' }), { ttl: 600, urgency: 'high', topic: 'ps-test' }); } catch (e) { status = -1; }
    if (status === 404 || status === 410) { await kv.delete(K.sub + id); return respond({ error: 'This device is no longer subscribed', gone: true }, 410); }
    sub.tests.push(nowMs); await kv.put(K.sub + id, JSON.stringify(sub));
    return status >= 200 && status < 300 ? respond({ ok: true, status }) : respond({ error: 'Push service refused the message', status }, 502);
  }
  return respond({ error: 'Not found' }, 404);
}
