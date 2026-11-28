// THE LONG WATCH: VISIONS — downloads the chosen Commons files (1600 px renditions; page 1 for PDFs, poster for
// video) plus their licence metadata, so the site can self-host AVIF/WebP. Read-only on Commons.
import fs from 'node:fs';
const UA = 'ProjectSignal-LongWatch/1.1 (https://github.com/CyberAmeen/PROJECT-SIGNAL)';
const list = JSON.parse(fs.readFileSync(new URL('./lw-fetch-list.json', import.meta.url)));
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
fs.mkdirSync('raw', { recursive: true }); const meta = {};
for (const [key, title] of Object.entries(list)) {
  const u = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ action: 'query', titles: 'File:' + title, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600', format: 'json' });
  const j = await (await fetch(u, { headers: { 'User-Agent': UA } })).json();
  const p = Object.values(j.query.pages)[0]; if (!p.imageinfo) { console.log('MISSING', key, title); continue; }
  const ii = p.imageinfo[0], m = ii.extmetadata || {};
  const src = ii.thumburl || ii.url;
  let r; for (let k = 0; k < 4; k++) { r = await fetch(src, { headers: { 'User-Agent': UA } }); if (r.ok) break; await new Promise(z => setTimeout(z, 2000)); }
  if (!r.ok) { console.log('FAIL', key, r.status); continue; }
  const ext = (src.split('?')[0].match(/\.(jpe?g|png|gif|webp)$/i) || [, 'jpg'])[1];
  fs.writeFileSync(`raw/${key}.${ext}`, Buffer.from(await r.arrayBuffer()));
  meta[key] = { title, page: ii.descriptionurl, license: strip(m.LicenseShortName?.value), licenseUrl: strip(m.LicenseUrl?.value), artist: strip(m.Artist?.value).slice(0, 160), credit: strip(m.Credit?.value).slice(0, 200), w: ii.width, h: ii.height, src };
  console.log('ok', key, ext, meta[key].license);
  await new Promise(z => setTimeout(z, 300));
}
fs.writeFileSync('raw/meta.json', JSON.stringify(meta, null, 1));
