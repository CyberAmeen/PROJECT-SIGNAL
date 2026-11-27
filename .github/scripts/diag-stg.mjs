const L = 'https://project-signal-sentinel.aminhersi10.workers.dev';
const s = await (await fetch(L + '/v1/status')).json();
console.log('LIVE', 'v' + s.version, 'stories', s.stories, 'clusters', s.clusters, 'updated', s.updatedAt, 'stale', s.stale, 'lastAttempt', JSON.stringify(s.lastAttempt), 'newest', s.newestArticleAgeMs);
for (const f of s.feeds || []) console.log('LIVE', (f.id || '').padEnd(18), (f.status || '').padEnd(14), 'relevant', f.count, f.error || '');
const i = await (await fetch(L + '/intel', { headers: { Origin: 'https://cyberameen.github.io' } }));
console.log('LIVE cors', i.headers.get('access-control-allow-origin')); const j = await i.json();
console.log('LIVE intel clusters', (j.clusters || []).length, 'multi', (j.clusters || []).filter(c => c.count > 1).length, 'community', JSON.stringify(j.community ? { ok: j.community.ok, posts: (j.community.posts || []).length } : null));
