# POCKET SIGNAL — handoff notes (installable app + alerts)

## What it is
Project Signal installs to the iPhone Home Screen as a full-screen app with its own icon and launch screen.
It opens instantly, the hub works offline, and it can send alerts from SENTINEL when a Gold Signal or a major
story comes in.

## Files
| Area | Files |
|---|---|
| Manifest + icons | `manifest.webmanifest`, `app/icon-*.png` (1024/512/192/180/167/152/120), `app/icon-maskable-*.png`, `app/favicon-*.png`, `app/badge-96.png`, `app/emblem.svg` |
| Launch screens | `app/splash/launch-<w>x<h>.jpg` (11 iPhone sizes, SE → 17 Pro Max), wired with `apple-touch-startup-image` media queries in `index.html` |
| App behaviour | `pocket.js` / `pocket.css` (launch hand-off, update prompt, offline pill, iOS install hint, alert opt-in + settings, deep links) |
| Service worker | `sw.js` (versioned shell cache, push display, notification tap → story) |
| Release stamp | `tools/sw-stamp.mjs`, run by `.github/workflows/static.yml` on every Pages deploy |
| Alerts backend | `sentinel/src/push.js` (Web Push: VAPID + aes128gcm on WebCrypto), wired in `sentinel/src/worker.js` (v5.2) |
| Tests | `sentinel/test/push.mjs` (offline), `.github/workflows/pocket-e2e.yml` + `.github/scripts/pocket-e2e.mjs` (staging, real Chrome push) |

## Updates never get stuck
- On every Pages deploy, `static.yml` replaces `__BUILD__` in `sw.js` with a hash of every published file. Any change → new service worker → new cache `ps-shell-<hash>`; old caches are deleted on activation.
- The new worker installs in the background (fetching with `cache: 'reload'`, index via `?build=<hash>` so no CDN copy is reused) and waits. The app shows **"New transmission available — TAP TO UPDATE"**. Tap → the new version takes over and the app reloads.
- If nobody taps, the update is applied the moment the installed app goes to the background, and on the next cold launch.
- The app checks for updates whenever it comes to the foreground (at most once a minute) and every 30 minutes.
- Live data (SENTINEL) is never cached by the service worker.

## Alerts (Web Push)
- **Endpoints** (SENTINEL): `GET /v1/push/key`, `POST /v1/push/subscribe`, `/v1/push/prefs`, `/v1/push/unsubscribe`, `/v1/push/test`; admin `POST /admin/push/check` (admin token; simulated events only on staging).
- **Storage**: Cloudflare KV `push:sub:<sha256(endpoint)[:32]>` → endpoint + keys, `{gold, major}`, time zone, sent-event ids, daily count. No accounts, no names, no IPs. Device tokens are HMACs derived from the VAPID secret.
- **Secret**: `VAPID_JWK` (P-256 private key, JWK) on the Worker. Created once by `sentinel-deploy.yml` if missing; never printed or committed. Rotating it invalidates every subscription.
- **Triggers** (every 10-minute cron, after collection):
  - Gold Signal: when `validGold` returns a story (one event per day).
  - Major story: cluster with ≥4 outlets, or ≥3 with a press/official outlet, or ≥2 incl. an official source; newest report < 3 h old and first report < 24 h old.
- **Guardrails**: max 3 per device per local day; quiet 22:00–08:00 in the device's own time zone; at least 45 min between alerts; an event is sent to a device at most once (re-clustered stories are recognised by shared URLs or titles); Gold expires after 14 h, major after 6 h; 404/410 from the push service deletes the subscription; 5 consecutive failures delete it.
- **Copy**: "A Gold Signal just came in, Commander. <headline>" / "A major story is breaking, Commander — reported by N outlets. <headline>". Taps open `?story=<url>&sid=<id>`, which skips the power-on ceremony and opens the Intel stream on that story.
- **Opt-in UX**: never on first load; only in the installed app, after exploring (Intel slide 3+ or the Atlas) and 60 s of use or a second session. Explainer sheet → system prompt. "Not now" → one more offer after 3 days, then never. Settings + test + off switch: the ALERTS button in the hub header.
- **Protected test**: the in-app "SEND A TEST TRANSMISSION" button calls `/v1/push/test` with that device's token. Only that device can receive it; 3 per hour.

## iOS install hint
Safari on iPhone/iPad only, never in the installed app, shown once ever (about 15 s after reaching the hub), dismissible.

## How to revert
- **Whole feature**: `git revert -m 1 bc54252` on main and push. Pages redeploys; SENTINEL redeploys v5.1 (the `VAPID_JWK` secret and `push:*` KV keys remain harmless; delete them in Cloudflare if wanted).
- **Service worker only** (if an installed app ever misbehaves): replace `sw.js` with a self-removing worker and deploy:
  ```js
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', e => e.waitUntil((async () => { for (const k of await caches.keys()) await caches.delete(k); await self.registration.unregister(); for (const c of await self.clients.matchAll()) c.navigate(c.url); })()));
  ```
- **Alerts only**: remove the `pushCheck` call in `scheduled()` (worker) — subscriptions stop receiving anything.

## Release record (Nov 27, 2026)
- PR #22, merge `bc54252`. Pages build `d2600be484b0`; SENTINEL v5.2 live; `VAPID_JWK` created by the deploy workflow.
- Staging e2e (real Chrome, FCM): 13/13 — subscribe via the opt-in UI, KV save, scheduled check sends, encrypted push shown, deep link opens the story, no duplicate on the next check, test endpoint works and refuses a bad token, off switch deletes the subscription, no console errors. An earlier run with a UTC subscriber at 00:20 UTC correctly held the alert for quiet hours.
