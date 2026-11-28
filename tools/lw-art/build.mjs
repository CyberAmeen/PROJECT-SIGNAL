// Writes every scene as SVG + a hotspots manifest. Rasterise with tools/lw-art/raster.py.
import fs from 'node:fs'; import { SCENES } from './scenes.mjs';
const out = process.argv[2] || 'lw-art-out'; fs.mkdirSync(out, { recursive: true });
const man = {};
for (const [k, fn] of Object.entries(SCENES)) { const { svg, hotspots } = fn(); fs.writeFileSync(`${out}/${k}.svg`, svg); man[k] = hotspots; }
fs.writeFileSync(`${out}/hotspots.json`, JSON.stringify(man, null, 1)); console.log(Object.keys(man).length, 'scenes');
