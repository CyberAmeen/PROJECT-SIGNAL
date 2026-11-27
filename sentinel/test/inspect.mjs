import { readFileSync } from 'node:fs';
const { __test: T } = await import('../src/worker.js');
const fx = f => readFileSync(new URL('./fixtures/' + f, import.meta.url), 'utf8');
const now = Date.parse('2026-11-27T19:00:00Z');
const all = [];
for (const [f, id] of [['google-ufo-uap.xml','gn-ufo-uap'],['google-disclosure.xml','gn-disclosure'],['google-specialist.xml','gn-specialist'],['google-science.xml','gn-science'],['bing-uap.xml','bing-uap'],['liberationtimes.xml','liberationtimes'],['blackvault-archive.xml','blackvault'],['dod-news.xml','dod-news']]) {
  const src = T.SOURCES.find(s => s.id === id); const drops = [];
  const t0 = performance.now(); let r; for (let k = 0; k < 5; k++) { drops.length = 0; r = T.parseFeed(fx(f), src, now, drops); } const ms = (performance.now() - t0) / 5;
  console.log(id.padEnd(16), 'parse', ms.toFixed(1) + 'ms', 'size', (fx(f).length / 1024).toFixed(0) + 'KB', 'kept', r.stories.length, 'dropped', drops.length);
  if (id === 'gn-specialist' || id === 'liberationtimes' || id === 'blackvault') drops.slice(0, 6).forEach(d => console.log('     drop:', d.title.slice(0, 80), '→', d.reason.slice(0, 50)));
  all.push(...r.stories);
}
const seen = new Set(); const uniq = all.filter(s => !seen.has(s.url) && seen.add(s.url));
const t1 = performance.now(); const cl = T.clusterStories(uniq); console.log('cluster', uniq.length, 'stories →', cl.length, 'in', (performance.now() - t1).toFixed(1) + 'ms');
for (const c of cl.filter(c => c.reports > 1)) { console.log(`\n[${c.count} outlets] ${c.title}`); uniq.filter(s => s.clusterId === c.id).forEach(s => console.log('     ·', s.outlet.padEnd(22).slice(0, 22), s.title.slice(0, 90))); }
