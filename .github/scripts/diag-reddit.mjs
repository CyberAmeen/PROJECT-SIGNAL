for (const u of ['https://www.reddit.com/r/UFOs/top/.rss?t=day','https://old.reddit.com/r/UFOs/top/.rss?t=day','https://www.reddit.com/r/aliens/top/.rss?t=day','https://www.reddit.com/r/UFOs/top.json?t=day&limit=5']) {
  for (const ua of ['Mozilla/5.0 (compatible; ProjectSignalSentinel/5.0)','web:project-signal-sentinel:5.0 (by /u/projectsignal)']) {
    try { const r = await fetch(u, { headers: { 'User-Agent': ua }, signal: AbortSignal.timeout(10000) }); const t = await r.text(); console.log('REDDIT', r.status, u.slice(8,40), ua.slice(0,12), (t.match(/<entry>/g)||[]).length, 'entries', t.length, 'bytes'); } catch (e) { console.log('REDDIT ERR', u, e.message); }
  }
}
