// Offline test: real feed samples + in-memory KV, several collection cycles.
import { readFileSync } from 'node:fs';
const mod = await import('../src/worker.js');
const { __test: T } = mod;
const fx = f => readFileSync(new URL('./fixtures/' + f, import.meta.url), 'utf8');
const map = [
  [/news\.google\.com.*UFO%20OR%20UAP/, 'google-ufo-uap.xml'],
  [/news\.google\.com.*non-human/, 'google-disclosure.xml'],
  [/news\.google\.com.*site%3A/, 'google-specialist.xml'],
  [/news\.google\.com.*technosignature/, 'google-science.xml'],
  [/bing\.com/, 'bing-uap.xml'],
  [/liberationtimes/, 'liberationtimes.xml'],
  [/theblackvault/, 'blackvault-archive.xml'],
  [/defense\.gov/, 'dod-news.xml'],
];
let calls = [];
globalThis.fetch = async (url, opts = {}) => {
  url = String(url); calls.push(url);
  if (/nuforc/.test(url)) return new Response('<html>Just a moment… challenge-platform</html>', { status: 403 });
  if (/news\.google\.com.*(AARO|sighting)/.test(url)) return new Response(fx('google-ufo-uap.xml'), { status: 200 }); // reuse sample
  for (const [re, f] of map) if (re.test(url)) return new Response(fx(f), { status: 200 });
  return new Response('not found', { status: 404 });
};
const store = new Map();
const kv = { get: async (k, t) => { const v = store.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { store.set(k, v); } };
const env = { SENTINEL_KV: kv };
// Fixtures were captured 2026-11-27 ~18:54Z: pin the clock there so the 10-day window matches.
const realNow = Date.now; let clock = Date.parse('2026-11-27T19:00:00Z'); Date.now = () => clock;
const t0 = performance.now();
for (let cycle = 1; cycle <= 4; cycle++) {
  calls = [];
  const s0 = performance.now();
  const snap = await T.collect(env);
  const ms = performance.now() - s0;
  console.log(`cycle ${cycle}: fetched ${calls.length} sources | stories ${snap.stories.length} | clusters ${snap.clusters.length} | dropped log ${snap.dropped.length} | new ${snap.newStories} | ${ms.toFixed(0)}ms`);
  clock += 10 * 60000;
}
const snap = JSON.parse(store.get('sentinel:snapshot:v2'));
console.log('\nSOURCE HEALTH');
for (const f of snap.feedStatus) console.log(' ', f.id.padEnd(16), f.status.padEnd(14), 'raw', String(f.raw ?? '-').padStart(3), 'relevant', String(f.count).padStart(3), f.error || f.reason || '');
const by = {}; for (const s of snap.stories) by[s.sourceFeed] = (by[s.sourceFeed] || 0) + 1;
console.log('\nSTORIES BY SOURCE', JSON.stringify(by));
const tiers = {}; for (const s of snap.stories) tiers[s.credibility.tier] = (tiers[s.credibility.tier] || 0) + 1;
console.log('CREDIBILITY', JSON.stringify(tiers));
console.log('\nTOP CLUSTERS');
for (const c of snap.clusters.slice(0, 14)) console.log(`  [${String(c.count).padStart(2)} outlets/${String(c.reports).padStart(2)} rpts] ${c.topTier.padEnd(10)} ${c.title.slice(0, 78)}`);
const multi = snap.clusters.filter(c => c.count > 1).length;
console.log(`clusters with 2+ outlets: ${multi} / ${snap.clusters.length}`);
console.log('\nDROPPED (sample of', snap.dropped.length, ')');
for (const d of snap.dropped.slice(0, 12)) console.log('  -', d.title.slice(0, 70), '→', d.reason.slice(0, 60));
console.log('\nBing link unwrapped sample:', snap.stories.find(s => s.sourceFeed.startsWith('bing'))?.url);
console.log('PS1 story present?', snap.stories.some(s => /PlayStation/i.test(s.title)), '| in dropped?', snap.dropped.some(d => /PlayStation/i.test(d.title)));
Date.now = realNow;
