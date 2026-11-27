const r = await fetch('https://old.reddit.com/r/UFOs/top/.rss?t=day', { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProjectSignalSentinel/5.0)' } });
const t = await r.text(); console.log('REDDIT ctype', r.headers.get('content-type'));
console.log('REDDIT title', (t.match(/<title>([^<]{0,120})/)||[])[1]); console.log('REDDIT has-feed', /<feed|<rss/.test(t), 'shreddit', /shreddit/.test(t), 'blocked', /blocked|whoa there|verify/i.test(t));
