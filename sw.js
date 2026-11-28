/* PROJECT SIGNAL — service worker (POCKET SIGNAL).
 * App shell: cached per release so the app opens instantly and the hub works offline.
 * BUILD is replaced at deploy time with a hash of every published file (tools/sw-stamp.mjs), so every
 * release installs a fresh cache; the page then offers "New transmission available — tap to update".
 * Live data (SENTINEL) is never cached here: it always goes to the network.
 * Also receives Web Push alerts and opens the right story when one is tapped. */
'use strict';
const BUILD = '__BUILD__';
const SHELL = 'ps-shell-' + BUILD;
const FONTS = 'ps-fonts-v1';
const META = 'ps-meta-v1';
const HTML = new URL('index.html', self.registration.scope).href;
const EXTRA = ['manifest.webmanifest', 'app/icon-192.png', 'app/icon-512.png', 'app/badge-96.png', 'app/emblem.svg', 'app/favicon-32.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // the query string skips any CDN copy of an older index.html; stored under the plain URL
    const res = await fetch('index.html?build=' + BUILD, { cache: 'reload' });
    if (!res.ok) throw new Error('index.html ' + res.status);
    const html = await res.clone().text();
    await cache.put(HTML, res);
    const urls = new Set(EXTRA);
    for (const m of html.matchAll(/\b(?:src|href)="([^"#]+)"/g)) { const u = m[1]; if (!/^(?:[a-z]+:|\/\/)/i.test(u) && !/apple-touch-startup|splash\//.test(u)) urls.add(u.replace(/&amp;/g, '&')); }
    const stamp = (html.match(/intel-signal\.js\?v=([^"&]+)/) || [])[1]; // the scene pack loads lazily with this stamp
    if (stamp) { urls.add('intel-scenes-x.js?v=' + stamp); urls.add('intel-scenes-x.css?v=' + stamp); }
    const lw = (html.match(/long-watch-boot\.js\?v=([^"&]+)/) || [])[1]; // THE LONG WATCH loads lazily with the boot stamp
    if (lw) for (const f of ['long-watch.css', 'long-watch.js', 'long-watch-data.js', 'long-watch-visuals.js']) urls.add(f + '?v=' + lw);
    await Promise.all([...urls].map(async u => {
      try { const r = await fetch(u, { cache: 'reload' }); if (r.ok) await cache.put(u, r); } catch {}
    }));
    // first install: take over straight away. Updates wait for the page's "tap to update".
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('ps-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const d = event.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  if (d.type === 'BUILD') event.source && event.source.postMessage({ type: 'BUILD', build: BUILD });
  if (d.type === 'PUSH_META') event.waitUntil(caches.open(META).then(c => c.put('push-meta', new Response(JSON.stringify(d.meta || null)))));
  if (d.type === 'SIMULATE_CLICK') event.waitUntil(openStory(d.url)); // test hook: same path as tapping a notification
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    if (req.mode === 'navigate') { event.respondWith(shellFirst(req)); return; }
    event.respondWith(cacheFirst(req));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') event.respondWith(fonts(req));
  // everything else (SENTINEL live data, outlets) goes straight to the network
});

async function shellFirst(req) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(HTML);
  if (hit) return hit;
  try { return await fetch(req); } catch { return new Response('<h1 style="font-family:sans-serif;color:#9fffd6;background:#02090b">Signal lost</h1>', { headers: { 'Content-Type': 'text/html' } }); }
}
async function cacheFirst(req) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    const loose = await cache.match(req, { ignoreSearch: true });
    if (loose) return loose;
    throw e;
  }
}
async function fonts(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req);
  const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') cache.put(req, r.clone()).catch(() => {}); return r; }).catch(() => hit);
  return hit || net;
}

/* ---------------------------------------------------------------- push alerts */
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { body: event.data && event.data.text() }; }
  const title = d.title || 'Project Signal';
  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body: d.body || 'New transmission from the Observation Network.',
      icon: 'app/icon-192.png', badge: 'app/badge-96.png', tag: d.tag || 'ps-alert',
      data: { url: d.url || self.registration.scope, kind: d.kind || 'alert' }, timestamp: d.at || Date.now()
    });
    for (const c of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) c.postMessage({ type: 'PUSH_RECEIVED', payload: d });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(openStory((event.notification.data || {}).url));
});

async function openStory(raw) {
  const url = new URL(raw || self.registration.scope, self.registration.scope);
  if (url.origin !== self.location.origin) url.href = self.registration.scope;
  const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const win = wins.find(w => w.url.startsWith(self.registration.scope)) || wins[0];
  if (win) {
    try { await win.focus(); } catch {}
    win.postMessage({ type: 'OPEN_STORY', url: url.href });
    return;
  }
  await self.clients.openWindow(url.href);
}

// Push services occasionally rotate a subscription: re-register it so alerts keep arriving.
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    const res = await (await caches.open(META)).match('push-meta'); const meta = res ? await res.json() : null;
    if (!meta || !meta.api || !meta.key) return;
    const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: meta.key });
    await fetch(meta.api + '/v1/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON(), prefs: meta.prefs, tz: meta.tz }) });
  })());
});
