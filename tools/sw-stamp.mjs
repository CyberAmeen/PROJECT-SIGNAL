// Stamps the service worker with a hash of every published file, so each deploy is a new app version
// (new cache, "New transmission available" prompt). Run on the assembled site folder: node tools/sw-stamp.mjs _site
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
const root = process.argv[2] || '_site';
const files = []; (function walk(d) { for (const f of readdirSync(d).sort()) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } })(root);
const h = createHash('sha256');
for (const f of files) if (!f.endsWith('sw.js')) { h.update(relative(root, f)); h.update(readFileSync(f)); }
const build = h.digest('hex').slice(0, 12);
const sw = join(root, 'sw.js'), src = readFileSync(sw, 'utf8');
if (!src.includes("'__BUILD__'")) { console.error('sw.js has no __BUILD__ placeholder'); process.exit(1); }
writeFileSync(sw, src.replace("'__BUILD__'", `'${build}'`));
console.log('service worker build', build, 'over', files.length, 'files');
