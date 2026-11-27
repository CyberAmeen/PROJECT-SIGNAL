import assert from 'node:assert/strict';
const { __test: T } = await import('../src/worker.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
// links
ok(T.unwrapLink('http://www.bing.com/news/apiclick.aspx?ref=FexRss&url=https%3a%2f%2fwww.msn.com%2fen-in%2fnews%2fx&c=1') === 'https://www.msn.com/en-in/news/x', 'bing unwrap');
ok(T.unwrapLink('http://example.com/a') === null, 'reject http');
// relevance
const ev = t => T.evaluate({ title: t, description: '', credibility: { tier: 'web' } });
ok(!ev('NASA UFO videos unlocked from obscure 1996 PS1 game').accepted, 'drop PS1');
ok(!ev('Where to find GTA 6\'s UFO and alien').accepted, 'drop GTA');
ok(!ev('Arturia MicroBrute UFO: the raw-sounding analog mono synth').accepted, 'drop synth');
ok(!ev('Imagine 2026 Review: OUT THERE Is A Mild-Mannered UFO Mystery').accepted, 'drop review');
ok(ev('Pentagon releases declassified UFO files from various federal agencies').accepted, 'keep files');
ok(ev('Former Air Force member describes missing time and a UFO encounter').accepted, 'keep encounter');
ok(ev('Inside the Wright-Patterson Drone Mystery: Radio Disruptions, Synchronized Maneuvers').accepted, 'keep drone mystery');
ok(ev('Senate hearing: whistleblower testifies on UAP crash retrieval program').accepted, 'keep hearing');
ok(!ev('Aaro Laakso — 2026 Stats').accepted, 'drop sports name Aaro');
ok(ev('AARO director briefs lawmakers on new UAP cases').accepted, 'keep AARO acronym');
ok(!ev('Unidentified drone enters Latvian airspace: military launches interceptor UAV').accepted, 'drop war drone');
ok(ev('Is The Truth Out There? Trump-Backed UFO Panel Just Revealed What It Knows').accepted, 'keep UFO panel');
ok(ev('A $22 Million Pentagon UFO Program Had a Bunker Plan Straight Out of a Spy Movie').accepted, 'keep pentagon program despite movie');
ok(!ev('Disclosure Day is Spielberg\'s most eerily plausible sci-fi movie yet').accepted, 'drop movie');
ok(!ev('Latvia sent drones into the sky due to an unidentified drone').accepted, 'drop baltic drone');
// credibility
const cr = (o, u = 'https://news.example/x') => T.credibility({ tier: 'web' }, o, u).tier;
ok(cr('Reuters') === 'press' && cr('BBC') === 'press' && cr('The Print on MSN') === 'press', 'press');
ok(cr('Daily Mail') === 'tabloid' && cr('New York Post') === 'tabloid', 'tabloid');
ok(cr('Liberation Times') === 'specialist' && cr('The Debrief') === 'specialist', 'specialist');
ok(cr('Some Blog', 'https://www.defense.gov/News/x') === 'official', 'official host');
ok(cr('Howl.Link') === 'web', 'unknown → web');
// reddit picking
const now = Date.parse('2026-11-27T16:00:00Z'), h = s => (now / 1000) - s * 3600;
const post = (o) => ({ data: { id: Math.random().toString(36).slice(2), subreddit: 'UFOs', title: 'Strange triangle of lights filmed over Phoenix tonight', score: 500, num_comments: 40, created_utc: h(3), permalink: '/r/UFOs/comments/abc/x/', thumbnail: 'https://b.thumbs.redditmedia.com/abc.jpg', ...o } });
const picks = T.pickRedditPosts([
  { sub: 'UFOs', min: 150, children: [post({ score: 900 }), post({ score: 800, over_18: true }), post({ score: 700, removed_by_category: 'moderator' }), post({ score: 650, link_flair_text: 'Meme' }), post({ score: 600, created_utc: h(40) }), post({ score: 120 }), post({ score: 550, thumbnail: 'https://i.imgur.com/x.jpg' }), post({ score: 540 })] },
  { sub: 'aliens', min: 60, children: [post({ subreddit: 'aliens', score: 300, author: '[deleted]' }), post({ subreddit: 'aliens', score: 200, title: 'lol' }), post({ subreddit: 'aliens', score: 90 })] }
], now);
ok(picks.length === 3, 'three picks'); ok(picks.filter(p => p.subreddit === 'r/UFOs').length === 2, 'max 2 per sub');
ok(picks[0].upvotes === 900 && picks.every(p => p.upvotes !== 800 && p.upvotes !== 700 && p.upvotes !== 650 && p.upvotes !== 600 && p.upvotes !== 120), 'filters nsfw/removed/meme/old/low');
ok(picks.find(p => p.upvotes === 550).thumbnail === null, 'non-reddit thumbnail dropped (never rehost/hotlink others)');
ok(picks.some(p => p.subreddit === 'r/aliens' && p.upvotes === 90), 'aliens pick respects its own threshold');
// health: ok → warming → failing over 24h
const src = T.SOURCES.find(s => s.id === 'dod-news'); const t0 = Date.parse('2026-11-27T00:00:00Z');
let hs = T.health(null, t0, { raw: 40, count: 0 });
ok(T.statusOf(src, hs, t0 + 3600e3).status === 'warming', 'warming first day');
ok(T.statusOf(src, hs, t0 + 25 * 3600e3).status === 'failing', 'failing after 24h of zero');
hs = T.health(hs, t0 + 26 * 3600e3, { raw: 40, count: 2 });
ok(T.statusOf(src, hs, t0 + 26 * 3600e3).status === 'ok', 'ok once relevant');
ok(T.statusOf(src, hs, t0 + 51 * 3600e3).status === 'failing', 'failing again after 24h with nothing new');
let he = T.health(null, t0, { error: 'HTTP 403' });
ok(T.statusOf(src, he, t0).status === 'retrying', 'first error → retrying'); he = T.health(he, t0 + 1, { error: 'HTTP 403' });
ok(T.statusOf(src, he, t0).status === 'failing' && T.statusOf(src, he, t0).error === 'HTTP 403', 'repeated error → failing with reason');
// reddit community(): OAuth flow, stored once per day, no refetch
const store = new Map(), kv = { get: async (k, t) => store.has(k) ? JSON.parse(store.get(k)) : null, put: async (k, v) => store.set(k, v) };
let fetches = [];
globalThis.fetch = async (u, o = {}) => { fetches.push(String(u));
  if (/access_token/.test(u)) { ok(/^Basic /.test(o.headers.Authorization) && o.body === 'grant_type=client_credentials', 'client-credentials grant'); return Response.json({ access_token: 'tkn' }); }
  if (/oauth\.reddit\.com\/r\/(UFOs|aliens)\/top/.test(u)) { ok(o.headers.Authorization === 'Bearer tkn', 'bearer token used'); return Response.json({ data: { children: [post({ score: 400 })] } }); }
  return new Response('no', { status: 404 }); };
const env = { REDDIT_CLIENT_ID: 'id', REDDIT_CLIENT_SECRET: 'sec' }, keys = T.keysFor({});
const r1 = await T.community(env, kv, keys, now); ok(r1.status.ok && r1.state.posts.length >= 1, 'reddit daily ok');
fetches = []; const r2 = await T.community(env, kv, keys, now + 3600e3); ok(fetches.length === 0 && r2.status.ok, 'no refetch same day');
const r0 = await T.community({}, kv, keys, now); ok(r0.status.status === 'not-configured', 'not configured without secrets');
console.log('unit tests passed:', n);
