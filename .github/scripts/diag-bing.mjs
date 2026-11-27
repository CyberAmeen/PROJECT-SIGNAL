const { __test: T } = await import(process.cwd() + '/sentinel/src/worker.js');
const B = q => 'https://www.bing.com/news/search?q=' + encodeURIComponent(q) + '&format=rss';
const qs = ['UFO','UAP','UFO news','UAP news','UFO sighting','UAP Pentagon','AARO','UFO Congress hearing','UAP disclosure','non-human intelligence','UFO whistleblower','alien life','technosignature','interstellar object','UFO files','mysterious lights sky','unidentified drones','UAP sighting','UFO video','UFO documentary','Luna UFO', 'Burchett UFO','Luna UAP hearing','Black Vault UFO','The Debrief UAP'];
const now = Date.now(), all = new Map();
for (const q of qs) {
  for (const extra of ['', '&qft=sortbydate%3d%221%22']) {
    try { const r = await fetch(B(q) + extra, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProjectSignalSentinel/5.0)' } }); const x = await r.text();
      const drops = []; const items = T.parseFeed(x, { id: 'bing-x', tier: 'web', aggregator: true, category: 'news' }, now, drops).stories;
      items.forEach(i => all.set(i.url, i.title));
      console.log('BING', r.status, (q + (extra ? ' [bydate]' : '')).padEnd(34), 'raw', (x.match(/<item>/g) || []).length, 'kept', items.length);
    } catch (e) { console.log('BING ERR', q, e.message); }
  }
}
console.log('BING DISTINCT KEPT', all.size);
