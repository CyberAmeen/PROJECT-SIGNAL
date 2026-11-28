/* PROJECT SIGNAL — shared motif taxonomy, Intel tagger and ECHOES matcher (core; build-motifs.mjs prepends the data).
   Echoes describe SIMILAR DESCRIPTIONS, never a proven link. A story gets an echo only when it shares a specific motif
   (or two motifs) with a historical record; otherwise it gets none. */
(() => {
  'use strict';
  const D = window.__PSMotifData; if (!D) return;
  const TAX = D.taxonomy, W = Object.fromEntries(TAX.map(t => [t.id, t.w])), BY = Object.fromEntries(TAX.map(t => [t.id, t]));
  /* Each rule must be met by the story's own words. Rules are deliberately narrow: a missed tag only costs an echo. */
  const R = {
    disc: /\b(flying saucers?|saucer[- ]shaped|dis[ck][- ]shaped|saucers?)\b|\b(a|the|silver|metallic|glowing|spinning|hovering|large|huge|white|black|bright) dis[ck]s?\b/,
    triangle: /\btriangular (object|craft|ufo|uap|shape|formation|lights?)\b|\b(black|large|huge|giant|silent|glowing|massive) triangles?\b|\btriangle[- ]shaped\b|\bboomerang[- ]shaped\b|\bv[- ]shaped (object|craft|formation|lights?)\b/,
    orb: /\borbs?\b|\b(glowing|bright|metallic|silver|red|orange|white|black|floating|mysterious|strange|luminous) spheres?\b|\bspherical (object|craft|ufo|uap)s?\b|\bballs? of (light|fire)\b/,
    cylinder: /\btic[- ]?tacs?\b|\bcylind(er|rical) (object|craft|ufo|uap)s?\b|\bcigar[- ]shaped\b|\bflying cylinder\b/,
    formation: /\b(lights?|objects?|orbs?|craft|uaps?|ufos?|drones?)( flying| moving| hovering)? in (a |tight |perfect |triangular |v[- ])?formation\b|\bformation of (\w+ )?(lights|objects|orbs|craft|ufos|uaps|drones)\b|\b(string|line|row|chain) of (\w+ )?lights\b/,
    military: [/\b(pilots?|aviators?|airmen|navy|naval aviators?|air force|military personnel|marines?|soldiers?|fighter (jets?|pilots?)|aircrews?|airline crew|flight crew)\b/, /\b(saw|seen|spotted|witness(ed|es)?|report(ed|s)?|encounter(ed|s)?|filmed|chased|intercept(ed|s)?|tracked|sightings?)\b/],
    radar: /\bradar (contact|track(s|ed|ing)?|returns?|data|confirm\w*|detect\w*|operators?|blips?|showed|picked up|targets?)\b|\b(tracked|detected|confirmed|picked up|caught) (\w+ ){0,3}(on|by) radar\b/,
    nuclear: /\bnuclear (weapons?|missiles?|bases?|sites?|silos?|plants?|facilit(y|ies)|power (plant|station)s?|submarines?|launch)\b|\bicbms?\b|\bmissile (silos?|sites?|launch facilit(y|ies)|fields?)\b/,
    // beings: an account of seeing or meeting them, not a prediction, theory or sermon
    beings: t => { const re = /\b(humanoids?|entit(y|ies)|non-human (beings?|biologics)|alien (beings?|bodies|creatures?)|creatures?|beings|greys?|occupants?)\b/g; let m;
      while ((m = re.exec(t))) { const w = t.slice(Math.max(0, m.index - 70), m.index + m[0].length + 30);
        if (/\b(saw|seen|sighted|encounter(ed)?|recalls?|recounts?|describes|described seeing|witness(ed|es)?|met|abduct(ed|ion)|spotted|approached|confronted|visited by)\b/.test(w) && !/\b(could|may|might|theor\w*|suggest\w*|warns?|predict\w*|will come|desensiti\w*|demonic|spiritual|sermon)\b/.test(w)) return true; }
      return false; },
    missing: /\bmissing time\b|\blost time\b|\btime loss\b/,
    mass: /\b(hundreds|thousands|dozens|scores) of (people|residents|witnesses|onlookers|callers|motorists|spectators)\b|\bmass sighting\b|\bmultiple witnesses\b|\bwitnessed by (hundreds|thousands|dozens|many)\b/,
    official: /\b(aaro|all-domain anomaly resolution|odni|uap (task force|disclosure act)|congressional|house (oversight|hearing|committee|subcommittee)|senate (hearing|committee|armed services)|subcommittee|project blue book|condon|investigat(ion|ing) into|declassif(ied|ies|y|ication)|foia (request|release|documents?)|pentagon (report|office|investigat\w*)|defense department (report|office))\b/,
    crash: /\b(crash[- ]retrieval|crashed (ufo|saucer|craft|disc|uap)s?|ufo crash|uap crash|recovered (craft|debris|wreckage|materials?)|(alien|ufo|uap) (debris|wreckage))\b/,
    vehicle: /\b(engines?|cars?|vehicles?|headlights|radios?|electronics|instruments?)\b.{0,40}\b(died|stalled|failed|cut out|went dead|shut (off|down)|malfunction(ed|s)?|stopped working)\b/,
  };
  const norm = s => (' ' + String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\bhuman beings\b/g, 'people').replace(/\b(no|not|without|never) (any |a |an )?(flying )?(saucers?|dis[ck]s?|orbs?|lights|craft|triangles?)\b/g, ' ').replace(/\bbermuda triangle\b/g, 'bermuda').replace(/\bdis[ck] (golf|jockeys?)\b|\b(compact|hard|herniated|slipped|blu-ray) dis[ck]s?\b/g, ' ').replace(/\bunder the radar\b|\boff the radar\b|\bon (my|our|the|their|your) radar\b/g, ' ').replace(/\s+/g, ' ') + ' ');
  function tag(text) {
    const t = norm(text), out = [];
    for (const k in R) { const r = R[k]; if (typeof r === 'function' ? r(t) : Array.isArray(r) ? r.every(x => x.test(t)) : r.test(t)) out.push(k); }
    return out;
  }
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  /* Best 1–3 echoes. Qualify: score ≥ 3 and (a shared specific motif, or two shared motifs). */
  function echoes(tags, seed, max = 3) {
    if (!tags || !tags.length) return [];
    const set = new Set(tags), h = hash(String(seed || ''));
    const scored = [];
    for (const t of D.targets) {
      const shared = t.tags.filter(x => set.has(x)); if (!shared.length) continue;
      const score = shared.reduce((a, x) => a + W[x], 0);
      if (score < 3 || !(shared.some(x => W[x] >= 3) || shared.length >= 2)) continue;
      // label: the most specific shared motif (rarest across targets)
      const lead = shared.slice().sort((a, b) => W[b] - W[a] || D.rarity[a] - D.rarity[b])[0];
      scored.push({ t, shared, score, lead, jit: (hash(t.k) ^ h) % 1000 });
    }
    scored.sort((a, b) => b.score - a.score || b.shared.length - a.shared.length || a.jit - b.jit);
    const pick = [], eras = new Set();
    const eraOf = y => y < 1900 ? 0 : y < 1970 ? 1 : 2;
    for (const s of scored) { if (pick.length >= max) break; if (s.score < (pick[0] ? pick[0].score - 3 : 0)) break; if (eras.has(eraOf(s.t.y)) && scored.some(o => !pick.includes(o) && o !== s && o.score === s.score && !eras.has(eraOf(o.t.y)))) continue; pick.push(s); eras.add(eraOf(s.t.y)); }
    for (const s of scored) { if (pick.length >= max) break; if (!pick.includes(s) && s.score >= (pick[0] ? pick[0].score - 3 : 3)) pick.push(s); }
    return pick.map(s => ({ ...s.t, shared: s.shared, lead: s.lead, why: 'Same pattern: ' + BY[s.lead].short }));
  }
  window.PSMotifs = { taxonomy: TAX, label: id => (BY[id] || {}).label || id, tag, echoes, get targets() { return D.targets; }, lw: D.lw, atlas: D.atlas, nuforc: D.nuforc };
})();
