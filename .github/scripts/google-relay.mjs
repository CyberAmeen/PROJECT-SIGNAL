// Google News relay for SENTINEL.
// Google News refuses requests from Cloudflare Workers, but answers GitHub's runners. This job fetches the
// same Google News RSS searches SENTINEL used to run and stores the raw feed XML in SENTINEL's KV store,
// where the Worker picks it up. Nothing is rewritten or invented: the Worker parses and filters the XML itself.
// A failed fetch never overwrites the last good delivery; the Worker reports the source FAILING when data goes stale.
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID, TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const NAMESPACE = '583fb75aa30c45a4990a205e87b37e93'; // SENTINEL_KV
const DRY = process.argv.includes('--dry');
const G = q => 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=en-US&gl=US&ceid=US:en';
const FEEDS = {
  'gn-ufo-uap': '(UFO OR UAP) when:7d',
  'gn-aaro': '("All-domain Anomaly Resolution Office" OR AARO OR "unidentified anomalous phenomena") when:7d',
  'gn-disclosure': '("non-human intelligence" OR "UAP disclosure" OR "UAP hearing" OR "UFO hearing" OR "UAP whistleblower") when:7d',
  'gn-sightings': '("UFO sighting" OR "UAP sighting" OR "unidentified object" OR "mysterious lights") when:7d',
  'gn-science': '(technosignature OR SETI OR "alien life" OR biosignature OR "interstellar object") when:7d',
  'gn-specialist': '(site:thedebrief.org OR site:theblackvault.com OR site:liberationtimes.com) when:14d'
};
if (!DRY && (!ACCOUNT || !TOKEN)) { console.error('Missing Cloudflare credentials'); process.exit(1); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, failed = 0;
for (const [id, q] of Object.entries(FEEDS)) {
  try {
    const r = await fetch(G(q), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProjectSignalRelay/1.0; +https://cyberameen.github.io/PROJECT-SIGNAL/)', Accept: 'application/rss+xml, application/xml;q=0.9' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const xml = await r.text();
    if (!/<rss\b/i.test(xml.slice(0, 2000))) throw new Error('Not an RSS feed');
    if (xml.length > 2_000_000) throw new Error('Feed too large');
    const items = (xml.match(/<item>/g) || []).length;
    if (!DRY) {
      const put = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/storage/kv/namespaces/${NAMESPACE}/values/${encodeURIComponent('relay:google:' + id)}?expiration_ttl=172800`, {
        method: 'PUT', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'text/plain' },
        body: JSON.stringify({ fetchedAt: new Date().toISOString(), source: id, items, xml })
      });
      const j = await put.json().catch(() => ({}));
      if (!put.ok || !j.success) throw new Error('KV write failed: HTTP ' + put.status);
    }
    console.log(`${id.padEnd(14)} ${String(items).padStart(3)} items ${(xml.length / 1024).toFixed(0)} KB ${DRY ? '(dry run)' : '→ stored'}`);
    ok++;
  } catch (e) { console.log(`${id.padEnd(14)} FAILED ${e.message} (previous delivery kept)`); failed++; }
  await sleep(2500); // be gentle with Google
}
console.log(`relay: ${ok} ok, ${failed} failed`);
if (!ok) process.exit(1);
