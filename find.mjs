const Q = ["Preliminary Assessment Unidentified Aerial Phenomena","Annual Report on Unidentified Aerial Phenomena","Unidentified Anomalous Phenomena annual report","All-domain Anomaly Resolution Office report","Report on the Historical Record of U.S. Government Involvement with Unidentified Anomalous Phenomena","Robertson panel report","Project Blue Book pdf","Project Blue Book report","Project Grudge report","Project Sign report","Hottel memo","Twining memo flying discs","flying saucers FBI","Unidentified flying objects Air Force report pdf","Blue Book Special Report","UAP Independent Study Team","Estimate of the Situation UFO","UFO CIA memorandum","flying saucer memorandum 1952","Unidentified aerial phenomena congressional hearing"];
const UA = { 'User-Agent': 'ProjectSignalResearch/1.0 (https://github.com/CyberAmeen/PROJECT-SIGNAL; research bot)' }, seen = new Map(); const nap = ms => new Promise(r => setTimeout(r, ms));
const J = async u => { for (let t = 0; t < 5; t++) { const r = await fetch(u, { headers: UA }); const x = await r.text(); try { return JSON.parse(x); } catch { await nap(4000 * (t + 1)); } } return {}; };
for (const q of Q) {
  const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6&srlimit=20&srsearch=' + encodeURIComponent(q + ' filetype:pdf');
  await nap(1500); const j = await J(u); for (const r of (j.query?.search || [])) if (!seen.has(r.title)) seen.set(r.title, q);
}
const titles = [...seen.keys()], out = [];
for (let i = 0; i < titles.length; i += 40) {
  const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata|mime&titles=' + encodeURIComponent(titles.slice(i, i + 40).join('|'));
  await nap(1500); const j = await J(u); if (!j.query) continue;
  for (const p of Object.values(j.query.pages)) { const ii = p.imageinfo?.[0]; if (!ii) continue; const m = ii.extmetadata || {};
    out.push({ title: p.title, url: ii.url, page: ii.descriptionurl, size: ii.size, mime: ii.mime, license: m.LicenseShortName?.value, artist: (m.Artist?.value || '').replace(/<[^>]+>/g, '').slice(0, 120), credit: (m.Credit?.value || '').replace(/<[^>]+>/g, '').slice(0, 160), date: (m.DateTimeOriginal?.value || '').replace(/<[^>]+>/g, '').slice(0, 40), q: seen.get(p.title) }); }
}
(await import('fs')).writeFileSync('docs/commons.json', JSON.stringify(out, null, 1)); console.log(out.length, 'files');
