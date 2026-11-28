// THE LONG WATCH — image research helper. Queries the Wikimedia Commons API for candidate files and their
// license metadata. Read-only; writes lw-commons.json. Only freely licensed / public-domain files are kept.
import fs from 'node:fs';
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'ProjectSignal-LongWatch/1.0 (https://github.com/CyberAmeen/PROJECT-SIGNAL)';
const jobs = JSON.parse(fs.readFileSync(new URL('./lw-commons-jobs.json', import.meta.url)));
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
async function q(params) {
  const u = API + '?' + new URLSearchParams({ format: 'json', origin: '*', ...params });
  for (let i = 0; i < 3; i++) {
    const r = await fetch(u, { headers: { 'User-Agent': UA } });
    if (r.ok) return r.json();
    await new Promise(r => setTimeout(r, 1500));
  }
  return {};
}
async function info(titles) {
  if (!titles.length) return [];
  const j = await q({ action: 'query', titles: titles.join('|'), prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '960' });
  const out = [];
  for (const p of Object.values(j.query?.pages || {})) {
    if (p.missing !== undefined || !p.imageinfo) { out.push({ title: p.title, missing: true }); continue; }
    const ii = p.imageinfo[0], m = ii.extmetadata || {};
    out.push({ title: p.title, page: ii.descriptionurl, full: ii.url, thumb: ii.thumburl, w: ii.width, h: ii.height, mime: ii.mime,
      license: strip(m.LicenseShortName?.value), usage: strip(m.UsageTerms?.value), artist: strip(m.Artist?.value).slice(0, 140),
      credit: strip(m.Credit?.value).slice(0, 160), date: strip(m.DateTimeOriginal?.value).slice(0, 60), desc: strip(m.ImageDescription?.value).slice(0, 260),
      attrReq: m.AttributionRequired?.value, restrictions: strip(m.Restrictions?.value) });
  }
  return out;
}
const result = {};
for (const job of jobs) {
  const entry = { exact: [], search: [] };
  entry.exact = await info((job.files || []).map(f => 'File:' + f));
  for (const term of job.search || []) {
    const s = await q({ action: 'query', list: 'search', srsearch: term, srnamespace: '6', srlimit: '6' });
    const titles = (s.query?.search || []).map(x => x.title);
    entry.search.push({ term, results: await info(titles) });
  }
  result[job.key] = entry;
  console.log(job.key, entry.exact.filter(x => !x.missing).length, 'exact,', entry.search.reduce((a, b) => a + b.results.length, 0), 'search');
}
fs.writeFileSync('lw-commons.json', JSON.stringify(result, null, 1));
