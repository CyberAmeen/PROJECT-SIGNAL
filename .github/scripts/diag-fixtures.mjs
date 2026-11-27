import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('sentinel/test/fixtures', { recursive: true });
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ProjectSignalSentinel/4.0)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' };
const q = s => encodeURIComponent(s);
const G = s => `https://news.google.com/rss/search?q=${q(s)}&hl=en-US&gl=US&ceid=US:en`;
const list = {
  'google-ufo-uap.xml': G('(UFO OR UAP) when:7d'),
  'google-disclosure.xml': G('("non-human intelligence" OR "UAP disclosure" OR "UAP hearing" OR "UAP whistleblower") when:7d'),
  'google-specialist.xml': G('(site:thedebrief.org OR site:theblackvault.com OR site:liberationtimes.com) when:14d'),
  'google-science.xml': G('(technosignature OR SETI OR "alien life" OR biosignature OR "interstellar object") when:7d'),
  'bing-uap.xml': `https://www.bing.com/news/search?q=${q('UAP unidentified anomalous phenomena sightings investigation')}&format=rss&setlang=en-US`,
  'liberationtimes.xml': 'https://www.liberationtimes.com/home?format=rss',
  'blackvault-archive.xml': 'https://www.theblackvault.com/documentarchive/feed/',
  'dod-news.xml': 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=40',
};
for (const [f, url] of Object.entries(list)) {
  try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(12000) }); const t = await r.text(); writeFileSync('sentinel/test/fixtures/' + f, t); console.log(f, r.status, t.length); } catch (e) { console.log(f, 'ERR', e.message); }
}
// The Debrief: find a working feed address
for (const u of ['https://thedebrief.org/feed', 'https://thedebrief.org/rss', 'https://thedebrief.org/?feed=rss2', 'https://thedebrief.org/category/space/feed/', 'https://www.thedebrief.org/feed/']) {
  try { const r = await fetch(u, { headers: { ...UA, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36' }, signal: AbortSignal.timeout(10000) }); const t = await r.text(); console.log('debrief', u, r.status, /<rss|<feed/i.test(t.slice(0, 500)) ? 'FEED' : 'no-feed', t.length); } catch (e) { console.log('debrief', u, 'ERR', e.message); }
}
// NUFORC: any machine-readable route?
for (const u of ['https://nuforc.org/feed/', 'https://nuforc.org/subndx/?id=lAll', 'https://nuforc.org/databank/']) {
  try { const r = await fetch(u, { headers: { ...UA, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Safari/537.36' }, signal: AbortSignal.timeout(10000) }); const t = await r.text(); console.log('nuforc', u, r.status, t.length, /cf-chl|challenge-platform|Just a moment/i.test(t) ? 'CLOUDFLARE-CHALLENGE' : ''); } catch (e) { console.log('nuforc', u, 'ERR', e.message); }
}
