// Read-only source investigation for SENTINEL (runs on a GitHub runner).
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ProjectSignalSentinel/4.0)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, application/json;q=0.8, */*;q=0.5' };
const REL = /\b(uaps?|ufos?|unidentified (?:anomalous|aerial|flying)|aaro|non[- ]?human intelligence|extraterrestrial|alien|disclosure|grusch|elizondo|skinwalker|roswell|sighting)\b/i;
const items = xml => [...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)].map(m => {
  const t = (m[1].match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const d = (m[1].match(/<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\//i) || [])[1] || '';
  return { title: t.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim(), date: Date.parse(d) };
});
const probe = async (id, url, opts = {}) => {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(12000), ...opts });
    const body = await r.text();
    let list = [];
    if (/json/.test(r.headers.get('content-type') || '') || body.trim().startsWith('{')) {
      try { const j = JSON.parse(body); list = (j.articles || j.items || j.data?.children || []).map(a => ({ title: a.title || a.data?.title || '', date: Date.parse(a.seendate ? a.seendate.replace(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/, '$1-$2-$3T$4:$5:$6Z') : a.date_published || a.data?.created_utc * 1000) })); } catch {}
    } else list = items(body);
    const now = Date.now(), d4 = list.filter(i => i.date > now - 4 * 864e5), d14 = list.filter(i => i.date > now - 14 * 864e5);
    const rel4 = d4.filter(i => REL.test(i.title));
    const isFeed = /<(?:rss|feed|rdf:RDF)\b/i.test(body.slice(0, 2000)) || body.trim().startsWith('{');
    console.log(`${id.padEnd(22)} HTTP ${r.status} ${String(Date.now() - t0).padStart(5)}ms feed=${isFeed ? 'yes' : 'NO '} items=${String(list.length).padStart(3)} last4d=${String(d4.length).padStart(3)} relevant4d=${String(rel4.length).padStart(3)} last14d=${String(d14.length).padStart(3)} | ${rel4.slice(0, 2).map(i => i.title.slice(0, 60)).join(' || ')}`);
  } catch (e) { console.log(`${id.padEnd(22)} ERROR ${String(e.message).slice(0, 90)}`); }
};
const st = await (await fetch('https://project-signal-sentinel.aminhersi10.workers.dev/v1/status')).json().catch(() => null);
console.log('=== LIVE SENTINEL STATUS');
if (st) { console.log('updatedAt', st.updatedAt, 'stories', st.stories, 'stale', st.stale); for (const f of st.feeds || []) console.log(' feed', (f.id || '').padEnd(14), 'ok', f.ok, 'paused', f.paused, 'count', f.count, f.error || '', f.reason || ''); console.log(' serper lastSuccess', st.serperHealth?.lastSuccessAt, 'lastError', st.serperHealth?.lastError); }
const intel = await (await fetch('https://project-signal-sentinel.aminhersi10.workers.dev/intel')).json().catch(() => null);
if (intel) { const by = {}; for (const s of intel.stories || []) by[s.sourceFeed] = (by[s.sourceFeed] || 0) + 1; console.log('=== LIVE /intel stories by sourceFeed', JSON.stringify(by), 'total', (intel.stories || []).length); }
const q = s => encodeURIComponent(s);
console.log('=== CURRENT SOURCES (from a GitHub runner, not Cloudflare)');
await probe('bing-uap', `https://www.bing.com/news/search?q=${q('UAP unidentified anomalous phenomena sightings investigation')}&format=rss&setlang=en-US`);
await probe('bing-ufo', `https://www.bing.com/news/search?q=${q('UFO sighting pilot radar investigation')}&format=rss&setlang=en-US`);
await probe('bing-aaro', `https://www.bing.com/news/search?q=${q('AARO Pentagon UAP report')}&format=rss&setlang=en-US`);
await probe('blackvault-archive', 'https://www.theblackvault.com/documentarchive/feed/');
await probe('nasa', 'https://www.nasa.gov/feed/');
await probe('space.com', 'https://www.space.com/feeds/all');
await probe('google-uap', `https://news.google.com/rss/search?q=${q('("UAP" OR "unidentified anomalous phenomena") when:3d')}&hl=en-US&gl=US&ceid=US:en`);
await probe('google-ufo', `https://news.google.com/rss/search?q=${q('"UFO sighting" when:3d')}&hl=en-US&gl=US&ceid=US:en`);
await probe('gdelt-uap', `https://api.gdeltproject.org/api/v2/doc/doc?query=${q('"unidentified anomalous phenomena"')}&mode=artlist&maxrecords=75&timespan=3d&format=json&sort=datedesc`);
console.log('=== CANDIDATE SOURCES');
await probe('thedebrief', 'https://thedebrief.org/feed/');
await probe('thedebrief-uap-cat', 'https://thedebrief.org/category/uap/feed/');
await probe('liberationtimes', 'https://www.liberationtimes.com/home?format=rss');
await probe('liberationtimes-feed', 'https://www.liberationtimes.com/feed');
await probe('liberationtimes-sub', 'https://liberationtimes.substack.com/feed');
await probe('blackvault-main', 'https://www.theblackvault.com/casefiles/feed/');
await probe('blackvault-root', 'https://www.theblackvault.com/feed/');
await probe('dod-releases', 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=9&Site=945&max=40');
await probe('dod-news', 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=40');
await probe('aaro-site', 'https://www.aaro.mil/');
await probe('google-aaro', `https://news.google.com/rss/search?q=${q('AARO OR "All-domain Anomaly Resolution Office" when:7d')}&hl=en-US&gl=US&ceid=US:en`);
await probe('google-disclosure', `https://news.google.com/rss/search?q=${q('("non-human intelligence" OR "UAP disclosure" OR "UAP hearing") when:7d')}&hl=en-US&gl=US&ceid=US:en`);
await probe('google-ufo-7d', `https://news.google.com/rss/search?q=${q('(UFO OR UAP) when:7d')}&hl=en-US&gl=US&ceid=US:en`);
await probe('nuforc-home', 'https://nuforc.org/');
await probe('nuforc-recent', 'https://nuforc.org/subndx/?id=e2026');
await probe('mysteriousuniverse', 'https://mysteriousuniverse.org/feed/');
await probe('popmech-ufo', 'https://www.popularmechanics.com/rss/space.xml/');
await probe('reddit-ufos-anon', 'https://www.reddit.com/r/UFOs/top.json?t=day&limit=10');
