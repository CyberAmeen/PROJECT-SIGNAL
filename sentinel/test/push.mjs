// Offline tests for POCKET SIGNAL push: RFC 8291 round-trip with an independent decryptor, VAPID JWT
// verification, event detection, and the scheduled check (quiet hours, daily cap, dedupe, dead subscriptions).
import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';
import * as P from '../src/push.js';

const { subtle } = globalThis.crypto;
const b64u = P.b64u, ub64 = P.ub64;

// ---- VAPID key + a fake browser subscription
const vk = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await subtle.exportKey('jwk', vk.privateKey);
const env0 = { VAPID_JWK: JSON.stringify({ x: jwk.x, y: jwk.y, d: jwk.d }) };
const ua = nodeCrypto.createECDH('prime256v1'); ua.generateKeys();
const auth = nodeCrypto.randomBytes(16);
const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: b64u(ua.getPublicKey()), auth: b64u(auth) } };

// ---- independent RFC 8291 decryptor (node:crypto)
function decrypt(buf) {
  buf = Buffer.from(buf);
  const salt = buf.subarray(0, 16), rs = buf.readUInt32BE(16), idlen = buf[20], asPub = buf.subarray(21, 21 + idlen), ct = buf.subarray(21 + idlen);
  assert.equal(rs, 4096); assert.equal(idlen, 65);
  const ecdh = ua.computeSecret(asPub);
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPub]);
  const ikm = Buffer.from(nodeCrypto.hkdfSync('sha256', ecdh, auth, info, 32));
  const cek = Buffer.from(nodeCrypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(nodeCrypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const d = nodeCrypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  assert.equal(pt[pt.length - 1], 2, 'last-record delimiter');
  return pt.subarray(0, pt.length - 1).toString('utf8');
}
const msg = JSON.stringify({ title: '◆ Gold Signal', body: 'A Gold Signal just came in, Commander.' });
assert.equal(decrypt(await P.encryptPayload(msg, sub.keys.p256dh, sub.keys.auth)), msg);
console.log('✓ aes128gcm payload decrypts with an independent RFC 8291 implementation');

// ---- VAPID header verifies
const hdr = await P.vapidHeader(env0, sub.endpoint);
const [, t, k] = hdr.match(/^vapid t=([^,]+), k=(.+)$/);
const [h, c, sig] = t.split('.');
const claims = JSON.parse(Buffer.from(ub64(c)).toString());
assert.equal(claims.aud, 'https://fcm.googleapis.com'); assert.ok(claims.exp > Date.now() / 1000 && claims.exp < Date.now() / 1000 + 86400); assert.match(claims.sub, /^https:\/\//);
const pub = await subtle.importKey('raw', ub64(k), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
assert.ok(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, ub64(sig), new TextEncoder().encode(h + '.' + c)));
assert.equal(k, P.publicKeyOf(env0));
console.log('✓ VAPID JWT (ES256) verifies against the advertised public key');

// ---- clock + events
assert.deepEqual(P.localClock('America/Los_Angeles', Date.parse('2026-11-28T07:30:00Z')), { day: '2026-11-27', hour: 23 });
assert.deepEqual(P.localClock('Europe/London', Date.parse('2026-11-28T07:30:00Z')), { day: '2026-11-28', hour: 7 });
const now = Date.parse('2026-11-27T20:00:00Z'), iso = ms => new Date(ms).toISOString();
const snap = { stories: [{ id: 's1', url: 'https://a.example/1' }], clusters: [
  { id: 'c1', title: 'Pentagon releases new UAP videos', url: 'https://a.example/1', count: 4, topTier: 'press', newest: iso(now - 3600e3), earliest: iso(now - 5 * 3600e3), outlets: [{ url: 'https://a.example/1' }, { url: 'https://b.example/1' }] },
  { id: 'c2', title: 'Small local story', url: 'https://c.example/1', count: 1, topTier: 'web', newest: iso(now - 600e3), earliest: iso(now - 600e3), outlets: [{ url: 'https://c.example/1' }] },
  { id: 'c3', title: 'Old big story', url: 'https://d.example/1', count: 6, topTier: 'press', newest: iso(now - 10 * 3600e3), earliest: iso(now - 30 * 3600e3), outlets: [{ url: 'https://d.example/1' }] }] };
let ev = P.detectEvents(snap, null, null, now);
assert.deepEqual(ev.fresh.map(e => e.id), ['major-c1']); assert.equal(ev.fresh[0].storyId, 's1');
// same story re-clustered under a new id is not a new event
const snap2 = { ...snap, clusters: [{ ...snap.clusters[0], id: 'c9', outlets: [{ url: 'https://b.example/1' }, { url: 'https://e.example/1' }] }] };
assert.equal(P.detectEvents(snap2, null, { list: ev.list }, now + 600e3).fresh.length, 0);
const gold = { day: '2026-11-27', story: { id: 's7', url: 'https://g.example/1', title: 'Orbs over Phoenix' } };
ev = P.detectEvents(snap, gold, { list: ev.list }, now);
assert.deepEqual(ev.fresh.map(e => e.id), ['gold-2026-11-27']);
assert.match(P.messageFor(ev.fresh[0]).body, /^A Gold Signal just came in, Commander\. Orbs over Phoenix$/);
assert.match(P.messageFor(ev.fresh[0]).url, /^https:\/\/cyberameen\.github\.io\/PROJECT-SIGNAL\/\?story=https%3A%2F%2Fg\.example%2F1&sid=s7/);
console.log('✓ events: major/gold detection, re-cluster dedupe, message tone and deep link');

// ---- scheduled check with a fake KV + fake push service
function fakeKV() { const m = new Map(); return { m, async get(k, t) { const v = m.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, async list({ prefix }) { return { keys: [...m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; } }; }
const kv = fakeKV(), env = { ...env0, SENTINEL_KV: kv };
const sent = []; let statusFor = () => 201;
globalThis.fetch = async (u, o) => { sent.push({ u, o, body: decrypt(new Uint8Array(o.body)) }); return { status: statusFor(u) }; };
const put = (id, extra) => kv.put('push:sub:' + id, JSON.stringify({ ...sub, endpoint: sub.endpoint + id, prefs: { gold: true, major: true }, tz: 'UTC', created: now - 86400e3, sent: [], ...extra }));
await put('day');                                     // 20:00 UTC → daytime
await put('night', { tz: 'Asia/Tokyo' });             // 05:00 → quiet hours
await put('goldonly', { prefs: { gold: true, major: false } });
await put('capped', { day: '2026-11-27', count: 3 });
await put('dead');
statusFor = u => u.endsWith('dead') ? 410 : 201;
let r = await P.pushCheck(env, snap, { gold, nowMs: now });
assert.equal(r.sent, 2); assert.equal(r.removed, 1); assert.equal(r.skipped['quiet-hours'], 1); assert.equal(r.skipped['daily-cap'], 1);
assert.ok(!kv.m.has('push:sub:dead'), 'dead subscription cleaned up');
const first = sent.filter(s => !s.u.endsWith('dead')).map(s => JSON.parse(s.body));
assert.ok(first.every(m => m.kind === 'gold'), 'gold goes first');
// next run 10 minutes later: spacing blocks the major story; an hour later it goes out once, then never again
sent.length = 0; r = await P.pushCheck(env, snap, { gold, nowMs: now + 600e3 });
assert.equal(r.sent, 0); assert.equal(r.skipped.spacing, 1);
r = await P.pushCheck(env, snap, { gold, nowMs: now + 3600e3 });
assert.equal(r.sent, 1); assert.equal(JSON.parse(sent[0].body).kind, 'major');
sent.length = 0; r = await P.pushCheck(env, snap, { gold, nowMs: now + 2 * 3600e3 });
assert.equal(r.sent, 0, 'never a duplicate');
const day = JSON.parse(kv.m.get('push:sub:day')); assert.equal(day.count, 2); assert.equal(day.sent.length, 2);
console.log('✓ scheduled check: quiet hours, daily cap, spacing, preferences, no duplicates, dead subscriptions removed');

// ---- HTTP routes
const respond = (b, st = 200) => ({ b, st });
const req = (path, body, method = 'POST') => [{ method, text: async () => JSON.stringify(body) }, env, new URL('https://x' + path), respond];
assert.equal((await P.handlePush(...req('/v1/push/subscribe', { subscription: { endpoint: 'https://evil.example/x', keys: sub.keys } }))).st, 400, 'unknown push host refused');
const s1 = await P.handlePush(...req('/v1/push/subscribe', { subscription: { endpoint: 'https://web.push.apple.com/QWERTY', keys: sub.keys }, prefs: { gold: true, major: false }, tz: 'America/Los_Angeles' }));
assert.equal(s1.st, 200); assert.equal(s1.b.prefs.major, false);
assert.equal((await P.handlePush(...req('/v1/push/test', { id: s1.b.id, token: 'nope' }))).st, 401);
for (let i = 0; i < 3; i++) assert.equal((await P.handlePush(...req('/v1/push/test', { id: s1.b.id, token: s1.b.token }))).st, 200);
assert.equal((await P.handlePush(...req('/v1/push/test', { id: s1.b.id, token: s1.b.token }))).st, 429, 'test endpoint is rate limited');
assert.equal((await P.handlePush(...req('/v1/push/prefs', { id: s1.b.id, token: s1.b.token, prefs: { gold: false, major: true } }))).b.prefs.gold, false);
assert.equal((await P.handlePush(...req('/v1/push/unsubscribe', { id: s1.b.id, token: s1.b.token }))).st, 200);
assert.equal((await P.handlePush(...req('/v1/push/prefs', { id: s1.b.id, token: s1.b.token, prefs: {} }))).st, 404);
assert.equal((await P.handlePush(...req('/v1/push/key', null, 'GET'))).b.publicKey, P.publicKeyOf(env0));
console.log('✓ routes: host allow-list, token auth, test rate limit, prefs, unsubscribe');
console.log('ALL PUSH TESTS PASSED');
