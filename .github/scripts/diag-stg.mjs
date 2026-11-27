const i = await (await fetch('https://project-signal-sentinel-staging.aminhersi10.workers.dev/intel')).json();
const o = {}; for (const s of i.stories) if (s.credibility?.tier === 'web') o[s.outlet] = (o[s.outlet] || 0) + 1;
console.log('STG WEB', JSON.stringify(Object.entries(o).sort((a, b) => b[1] - a[1])));
for (const s of i.stories) console.log('STG', (s.credibility?.tier || '').padEnd(10), (s.outlet || '').slice(0, 24).padEnd(24), (s.date||'').slice(5,10), s.title.slice(0, 100));
const d = await (await fetch('https://project-signal-sentinel-staging.aminhersi10.workers.dev/v1/dropped')).json();
for (const x of (d.dropped || d.items || []).slice(0, 63)) console.log('DROP', (x.reason || '').slice(0, 38).padEnd(38), (x.title || '').slice(0, 90));
