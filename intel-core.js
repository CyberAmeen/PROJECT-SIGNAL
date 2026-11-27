/* PROJECT SIGNAL — Intel core: cleans, de-duplicates and groups the public SENTINEL snapshot.
   Pure functions only (no DOM), so the same code is testable outside the browser.
   Nothing here invents content: titles, outlets, links and dates all come from the snapshot. */
(function (root) {
  'use strict';

  const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', hellip: '…' };
  function decode(s) {
    return String(s == null ? '' : s)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, k) => {
        const l = k.toLowerCase();
        if (l[0] === '#') { const n = l[1] === 'x' ? parseInt(l.slice(2), 16) : parseInt(l.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ' '; }
        return Object.prototype.hasOwnProperty.call(ENT, l) ? ENT[l] : m;
      })
      .replace(/[   ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const cleanOutlet = o => decode(o).split(/\s+[-|–—]\s+/)[0].replace(/^www\./i, '').trim();

  const STOP = new Set('the a an of to for in on and with from at by as is are was were be been its it this that these those new news says say said after over about into than more most what whats how why who will can could may might has have had not but or our your their his her they them via amid just also near out up down off'.split(' '));
  const WEAK = new Set(['ufo', 'uap', 'pentagon', 'alien', 'aliens', 'file', 'files', 'reveal', 'report', 'secret', 'military', 'government', 'release', 'releases', 'released']);
  function tokens(t) {
    return [...new Set(String(t).toLowerCase().replace(/[’']s\b/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .map(w => w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
      .filter(w => w.length > 2 && !STOP.has(w)))];
  }

  const RELEVANT = /\b(ufos?|uaps?|ufo|alien|aliens|extraterrestrial|anomalous|flying saucers?|aaro|unidentified|skinwalker|roswell|area 51|disclosure|non-human|orbs?|drones? sighting)\b/i;
  const OFFTOPIC = /\b(playstation|ps[1-5]|nintendo|xbox|video ?games?|steam deck|game (?:mod|hack|patch)|trailer|box office|netflix|hulu|album|concert|lyrics|horoscope|recipe|nfl|nba|mlb|nhl|fantasy football)\b/i;

  function cleanStory(s) {
    if (!s || !s.title || !/^https:\/\//i.test(s.url || '')) return null;
    const rawDesc = String(s.description || '');
    let title = decode(s.title), desc = '', outlet = '';
    const parts = rawDesc.split(/(?:&nbsp;| )(?:\s|&nbsp;| )*/i).filter(p => p.trim());
    if (parts.length >= 2) { outlet = decode(parts[parts.length - 1]); desc = decode(parts.slice(0, -1).join(' ')); }
    else desc = decode(rawDesc);
    if (s.outlet) { outlet = decode(s.outlet); desc = decode(rawDesc); }
    if (!outlet && s.source && !/^google news/i.test(s.source)) outlet = decode(s.source);
    if (outlet && title.toLowerCase().endsWith((' - ' + outlet).toLowerCase())) title = title.slice(0, -(outlet.length + 3)).trim();
    else {
      const m = title.match(/^(.{25,}?)\s+[-–—|]\s+([^-–—|]{2,48})$/);
      if (m && m[2].split(/\s+/).length <= 6) { if (!outlet) outlet = m[2].trim(); title = m[1].trim(); }
    }
    outlet = cleanOutlet(outlet || s.source || 'Unknown outlet');
    const tt = tokens(title), dt = tokens(desc);
    const overlap = dt.length ? dt.filter(w => tt.includes(w)).length / dt.length : 1;
    const headlineOnly = desc.length < 60 || overlap > 0.7;
    const date = Date.parse(s.date) || 0;
    return {
      id: String(s.id || s.url), url: s.url, title, outlet, date,
      desc: headlineOnly ? '' : desc,
      category: s.category || 'news', cityId: s.cityId || null,
      official: s.sourceFeed === 'official' || s.category === 'government',
      confidence: String(s.confidence || ''), tokens: tt,
      tier: TIERS[s.credibility && s.credibility.tier] ? s.credibility.tier : 'web',
      clusterId: s.clusterId ? String(s.clusterId) : null
    };
  }

  /* Publisher credibility, as tagged by SENTINEL. It describes who published, never whether a claim is true. */
  const TIERS = {
    official: { rank: 6, text: 'Official source' },
    press: { rank: 5, text: 'Major press' },
    specialist: { rank: 4, text: 'UAP specialist' },
    web: { rank: 3, text: 'Web outlet' },
    tabloid: { rank: 2, text: 'Tabloid' },
    witness: { rank: 1, text: 'Witness report · unverified' },
    community: { rank: 0, text: 'Community · unverified' }
  };

  /* Weighted overlap of headline words; rare words (bunker, implants) count far more than common ones (ufo, pentagon). */
  function cluster(stories, threshold) {
    const n = stories.length, df = new Map();
    stories.forEach(s => s.tokens.forEach(w => df.set(w, (df.get(w) || 0) + 1)));
    const wt = w => (WEAK.has(w) ? 0.25 : 1) * Math.log(1 + n / (df.get(w) || 1));
    const parent = stories.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = new Set(stories[i].tokens), b = new Set(stories[j].tokens);
      let inter = 0, wa = 0, wb = 0, strong = 0;
      a.forEach(w => { wa += wt(w); if (b.has(w)) { inter += wt(w); if (!WEAK.has(w) && (df.get(w) || 0) <= Math.max(2, n * 0.5)) strong++; } });
      b.forEach(w => { wb += wt(w); });
      const sim = Math.min(wa, wb) ? inter / Math.min(wa, wb) : 0;
      if (stories[i].title.toLowerCase() === stories[j].title.toLowerCase() || (sim >= threshold && strong >= 1) || strong >= 3) parent[find(i)] = find(j);
    }
    const groups = new Map();
    stories.forEach((s, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(s); });
    return [...groups.values()];
  }

  const LABELS = {
    explained: { key: 'explained', text: 'Explanation offered', tone: 'calm' },
    claim: { key: 'claim', text: 'Claim · unverified', tone: 'warn' },
    official: { key: 'official', text: 'Official records reported', tone: 'official' },
    witness: { key: 'witness', text: 'Witness report', tone: 'witness' },
    news: { key: 'news', text: 'News report', tone: 'news' }
  };
  function labelFor(text) {
    const t = text.toLowerCase();
    if (/\b(clarif\w*|debunk\w*|explained|explanation|balloons?|starlink|misidentif\w*|hoax|not a ufo|was a (?:drone|plane|satellite))\b/.test(t)) return LABELS.explained;
    if (/\b(says?|said|claims?|claimed|alleg\w*|insists?|believes?|suggests?|testif\w*|warns?)\b/.test(t)) return LABELS.claim;
    if (/\b(declassif\w*|file release|files|docs|documents?|records|blueprints|hearing|report)\b/.test(t) && /\b(pentagon|aaro|nasa|congress|senate|government|federal|dod|defense|military|faa|cia|fbi|agenc\w*)\b/.test(t)) return LABELS.official;
    if (/\b(witness\w*|sighting|spotted|seen|filmed|records|captured|lights? over)\b/.test(t)) return LABELS.witness;
    return LABELS.news;
  }

  const SCENES = [
    ['facility', /\b(bunker|base|facility|vault|underground|hangar|area 51|skinwalker|ranch|site)\b/],
    ['sensor', /\b(video|videos|footage|sensor|radar|track|infrared|flir|mach|gimbal|tic.?tac)\b/],
    ['bio', /\b(tissue|biolog\w*|implants?|dna|bodies|body|metabolism|specimens?|samples?|non-human)\b/],
    ['craft', /\b(crash\w*|craft|saucer|retriev\w*|recovered|hardware|wreckage|propulsion)\b/],
    ['cosmos', /\b(observator\w*|telescope|astronom\w*|nasa|space|comet|interstellar|meteor|asteroid|seti|galax\w*|planet)\b/],
    ['sighting', /\b(witness\w*|sighting|spotted|seen|filmed|lights?|encounter|schoolchildren|over (?:the )?sky)\b/],
    ['hearing', /\b(hearing|congress|senate|testif\w*|lawmakers?|whistleblower|investigator|contractor|official says|briefing)\b/],
    ['files', /\b(files?|declassif\w*|documents?|docs|records|release|dump|report|foia)\b/]
  ];
  const sceneFor = text => { const t = text.toLowerCase(); const hit = SCENES.find(([, re]) => re.test(t)); return hit ? hit[0] : 'deep'; };

  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* Returns { clusters, filtered, total } — clusters newest-first, each with honest labels. */
  function build(rawStories, opts) {
    const threshold = (opts && opts.threshold) || 0.45;
    const seen = new Set(), clean = [];
    let filtered = 0;
    (rawStories || []).forEach(r => {
      const s = cleanStory(r); if (!s) return;
      const key = s.url.replace(/[?#].*$/, '');
      if (seen.has(key)) return; seen.add(key);
      if (OFFTOPIC.test(s.title) || !RELEVANT.test(s.title + ' ' + s.desc)) { filtered++; return; }
      clean.push(s);
    });
    // Use SENTINEL's server-side story clusters when every story carries one; otherwise group here.
    let groups;
    if (clean.length && clean.every(s => s.clusterId)) {
      const by = new Map(); clean.forEach(s => { if (!by.has(s.clusterId)) by.set(s.clusterId, []); by.get(s.clusterId).push(s); });
      groups = [...by.values()];
    } else groups = cluster(clean, threshold);
    const clusters = groups.map(members => {
      members.sort((a, b) => b.date - a.date);
      const score = m => (m.desc ? 4 : 0) + (m.official ? 3 : 0) + TIERS[m.tier].rank * 0.6 + (/high/.test(m.confidence) ? 1 : 0) - Math.abs(m.title.length - 85) / 40;
      const lead = members.slice().sort((a, b) => score(b) - score(a))[0];
      const outlets = []; const names = new Set();
      members.forEach(m => { const k = m.outlet.toLowerCase(); if (!names.has(k)) { names.add(k); outlets.push({ name: m.outlet, url: m.url, date: m.date, tier: m.tier }); } });
      outlets.sort((a, b) => TIERS[b.tier].rank - TIERS[a.tier].rank || b.date - a.date);
      const topTier = outlets.reduce((t, o) => TIERS[o.tier].rank > TIERS[t].rank ? o.tier : t, 'community');
      const allText = members.map(m => m.title).join(' · ');
      const desc = (members.find(m => m.desc) || {}).desc || '';
      return {
        id: 'ix-' + hash(members.map(m => m.id).sort()[0]).toString(36),
        memberIds: members.map(m => m.id),
        title: lead.title, url: lead.url, outlet: lead.outlet, desc,
        newest: members[0].date, earliest: members[members.length - 1].date,
        outlets, count: outlets.length, tier: lead.tier, topTier,
        label: labelFor(lead.title + ' ' + (members.length > 1 ? '' : desc)),
        scene: sceneFor(lead.title + ' ' + allText + ' ' + desc),
        cityId: (members.find(m => m.cityId) || {}).cityId || null,
        text: allText + ' ' + desc,
        seed: hash(lead.id)
      };
    });
    clusters.sort((a, b) => b.newest - a.newest);
    return { clusters, filtered, total: clean.length };
  }

  const api = { decode, cleanStory, build, labelFor, sceneFor, hash, tokens, TIERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.IntelCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
