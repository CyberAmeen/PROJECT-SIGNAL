/** PROJECT SIGNAL // SENTINEL NETWORK v5.0  ("WIDE SIGNAL")
 * Public read-only intelligence endpoints + authenticated manual scan.
 * - Sources rotate on their own cadence (cron every 10 min); each reports honest health:
 *   a source with no relevant items for 24h reports FAILING, never ok.
 * - Rolling 10-day window, server-side relevance filter with an audit log of what was dropped,
 *   story clustering ("covered by N outlets"), credibility tags, and a once-a-day
 *   community slide from Reddit (OAuth, labelled unverified).
 * Secrets (never in code): SERPER_API_KEY, SENTINEL_ADMIN_TOKEN, REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET.
 */

const VERSION = '5.0';
const ORIGIN = 'https://cyberameen.github.io';
const DAY_MS = 86400000;
const WINDOW_DAYS = 10;
const FAIL_AFTER_MS = DAY_MS;
const SNAPSHOT_FRESH_MS = 60 * 60 * 1000;
const MAX_STORIES = 220;
const MAX_DROPPED = 300;
const MAX_SOURCES_PER_RUN = 4;
const RULES_VERSION = 'r5.0.1'; // bump when relevance rules change → stored stories get re-checked
const SERPER_INTERVAL_MS = 4 * 60 * 60 * 1000;
const MANUAL_INTERVAL_MS = 5 * 60 * 1000;
const REDDIT_HOUR_UTC = 15; // 7am Pacific
const SERPER_RECENCY = 'qdr:w';
const SERPER_QUERIES = [
 'UFO OR UAP sighting OR pilot OR radar',
 'AARO OR UAP disclosure OR "nonhuman intelligence" testimony',
 'astrobiology OR biosignature OR SETI OR technosignature',
 '"alien encounter" OR "alien abduction" witness testimony',
 '"interstellar object" OR "unusual signal" extraterrestrial OR SETI'
];

const keysFor = env => {
 const p = env.KEY_PREFIX || '';
 return {
  snap: p + 'sentinel:snapshot:v2',
  serper: p + 'sentinel:serper:state:v1',
  lock: p + 'sentinel:scan:lock:v1',
  reddit: p + 'sentinel:reddit:v1'
 };
};

const G = q => 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=en-US&gl=US&ceid=US:en';
const B = q => 'https://www.bing.com/news/search?q=' + encodeURIComponent(q) + '&format=rss&setlang=en-US';
const DOD = type => 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=' + type + '&Site=945&max=40';

/* every = minutes between fetches. tier = default credibility when the outlet is unknown. */
const SOURCES = [
 {id:'gn-ufo-uap', name:'Google News · UFO/UAP', category:'news', every:20, aggregator:true, url:G('(UFO OR UAP) when:7d')},
 {id:'gn-aaro', name:'Google News · AARO & government', category:'government', every:30, aggregator:true, url:G('("All-domain Anomaly Resolution Office" OR AARO OR "unidentified anomalous phenomena") when:7d')},
 {id:'gn-disclosure', name:'Google News · Disclosure', category:'government', every:30, aggregator:true, url:G('("non-human intelligence" OR "UAP disclosure" OR "UAP hearing" OR "UFO hearing" OR "UAP whistleblower") when:7d')},
 {id:'gn-sightings', name:'Google News · Sightings', category:'news', every:30, aggregator:true, url:G('("UFO sighting" OR "UAP sighting" OR "unidentified object" OR "mysterious lights") when:7d')},
 {id:'gn-science', name:'Google News · Science & SETI', category:'research', every:60, aggregator:true, url:G('(technosignature OR SETI OR "alien life" OR biosignature OR "interstellar object") when:7d')},
 {id:'gn-specialist', name:'Google News · The Debrief / Black Vault / Liberation Times', category:'news', every:60, aggregator:true, url:G('(site:thedebrief.org OR site:theblackvault.com OR site:liberationtimes.com) when:14d')},
 {id:'bing-uap', name:'Bing News · UAP', category:'news', every:30, aggregator:true, url:B('UAP unidentified anomalous phenomena sightings investigation')},
 {id:'bing-ufo', name:'Bing News · UFO', category:'news', every:30, aggregator:true, url:B('UFO sighting pilot radar investigation')},
 {id:'bing-aaro', name:'Bing News · AARO', category:'government', every:60, aggregator:true, url:B('AARO Pentagon UAP report')},
 {id:'liberationtimes', name:'Liberation Times', category:'news', every:60, tier:'specialist', outlet:'Liberation Times', url:'https://www.liberationtimes.com/home?format=rss'},
 {id:'blackvault', name:'The Black Vault · Documents', category:'government', every:120, tier:'specialist', outlet:'The Black Vault', url:'https://www.theblackvault.com/documentarchive/feed/'},
 {id:'dod-news', name:'U.S. Department of Defense · News', category:'government', every:60, tier:'official', outlet:'U.S. Department of Defense', url:DOD(1)},
 {id:'dod-releases', name:'U.S. Department of Defense · Releases', category:'government', every:120, tier:'official', outlet:'U.S. Department of Defense', url:DOD(9)},
 {id:'nuforc', name:'NUFORC · newest witness reports', category:'witness', every:360, tier:'witness', outlet:'NUFORC', url:'https://nuforc.org/feed/'}
];

/* ---------------------------------------------------------------- credibility */
const TIER_LABEL = {
 official: 'Official / government source',
 press: 'Established news outlet',
 specialist: 'Specialist UAP outlet',
 tabloid: 'Tabloid outlet',
 web: 'Other web publisher',
 witness: 'Unverified witness report',
 community: 'Community post — unverified'
};
const PRESS = ['reuters','associated press','ap news','bloomberg','new york times','washington post','wall street journal','cnn','nbc news','cbs news','abc news','fox news','npr','bbc','the guardian','guardian','politico','the hill','axios','usa today','newsweek','time','the atlantic','defense one','breaking defense','military.com','stars and stripes','the war zone','twz','popular mechanics','scientific american','new scientist','space.com','live science','nature','science','the independent','independent','the telegraph','telegraph','sky news','al jazeera','cbc','abc australia','the times','financial times','los angeles times','chicago tribune','boston globe','pbs','c-span','economist','wired','ars technica','the verge','national geographic','smithsonian','vice','the economic times','times of india','hindustan times','the print','reuters.com','apnews','cnet','gizmodo','engadget','futurism','phys.org','universe today','the conversation'];
const TABLOID = ['daily mail','dailymail','the sun','daily star','express','daily express','mirror','daily mirror','new york post','ny post','daily record','metro','tmz','radar online','the us sun','unilad','ladbible'];
const SPECIALIST = ['the debrief','liberation times','the black vault','black vault'];
const OFFICIAL_HOST = /(^|\.)(gov|mil)$|(^|\.)(nasa\.gov|aaro\.mil|defense\.gov|congress\.gov|house\.gov|senate\.gov|archives\.gov|faa\.gov|af\.mil|navy\.mil|army\.mil)$/i;
const norm = s => String(s || '').toLowerCase().replace(/^www\./, '').replace(/\s+on msn$/, '').replace(/[^a-z0-9.\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
function credibility(source, outlet, url) {
 let host = '';
 try { host = new URL(url).hostname.replace(/^www\./, ''); } catch {}
 const o = norm(outlet);
 let tier = source.tier || 'web';
 if (OFFICIAL_HOST.test(host) && !/news\.google\.com|bing\.com/.test(host)) tier = 'official';
 else if (SPECIALIST.some(n => o === n || o.startsWith(n))) tier = 'specialist';
 else if (TABLOID.some(n => o === n || o.startsWith(n + ' '))) tier = 'tabloid';
 else if (PRESS.some(n => o === n || o.startsWith(n + ' ') || o === n.replace(/^the /, ''))) tier = 'press';
 else if (/\b(\.gov|department of|u\.s\. (?:navy|air force|army)|nasa)\b/i.test(o)) tier = 'official';
 return {tier, label: TIER_LABEL[tier] || TIER_LABEL.web};
}

/* ---------------------------------------------------------------- text helpers */
const decode = value => String(value || '')
 .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
 .replace(/&#(x[\da-f]+|\d+);/gi, (entity, number) => {
  const cp = number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number);
  return cp > 0 && cp <= 0x10FFFF ? String.fromCodePoint(cp) : entity;
 })
 .replace(/&(?:amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|ldquo|rdquo|mdash|ndash|hellip);/g, e => ({
  '&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' ','&rsquo;':'’','&lsquo;':'‘','&ldquo;':'“','&rdquo;':'”','&mdash;':'—','&ndash;':'–','&hellip;':'…'
 }[e]));
const plain = value => decode(decode(value)).replace(/<[^>]*>/g, ' ').replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim();
const TAG_RE = new Map();
const tag = (xml, name) => {
 let re = TAG_RE.get(name);
 if (!re) { re = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i'); TAG_RE.set(name, re); }
 const m = xml.match(re);
 return m ? plain(m[1]) : '';
};
const safeUrl = value => {
 try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; }
};
/* Bing wraps article links in http://www.bing.com/news/apiclick.aspx?…&url=<real https link> (this is why v4 got 0). */
const unwrapLink = value => {
 try {
  const u = new URL(String(value).trim());
  if (/(^|\.)bing\.com$/i.test(u.hostname) && u.searchParams.get('url')) return safeUrl(u.searchParams.get('url'));
  return safeUrl(u.href);
 } catch { return null; }
};
const day = date => new Date(date).toISOString().slice(0, 10);
const normalize = value => ' ' + String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

/* ---------------------------------------------------------------- relevance (v4.3 rules + gaming/hack/off-topic additions) */
const BAD = /\b(robot(?:s|ics)?|battle of robots|ufo combat|video ?games?|gaming|gameplay|playstation|ps[1-5]|xbox|nintendo|steam deck|gta|fortnite|minecraft|roblox|comic.?con|cosplay|movie|film|trailer|box office|netflix|anime|manga|album|song|concert|merchandise|toy|action figure|wrestling|stock ticker|electric vehicle|ev tech|horoscope|zodiac|recipe|ufo dish|ufo ride|ufo catcher|ufo tracker app)\b/i;
const FICTION = /\b(hoax|satire|fictional|fiction|parody|simulation|mockumentary|role.?play)\b/i;
const AERIAL = /\b(uaps?|ufos?|unidentified (?:anomalous phenomena|aerial phenomena|flying objects?|objects?)|(?:unexplained|anomalous) aerial|aaro|all-domain anomaly resolution office|flying saucers?|orbs? (?:over|in|seen|spotted|filmed)|skinwalker ranch|(?:mystery|mysterious|unidentified) drones?|drone (?:mystery|swarms?|incursions?|sightings?))\b/i;
const DISCLOSURE = /\b(non[- ]?human intelligence|crash retrieval|uap disclosure|ufo disclosure|aaro|disclosure act|grusch|elizondo|whistleblowers? .*(?:uap|ufo))\b|\bNHI\b.*\b(whistleblower|testimon\w*|retrieval|disclosure)\b/i;
const SCIENCE = /\b(astrobiology|biosignatures?|technosignatures?|seti|extraterrestrial (?:life|microbes?|microorganisms?|intelligence|signals?)|alien life|life (?:beyond|outside) earth|potentially habitable (?:exoplanet|world)s?)\b/i;
const ENCOUNTER = /\b(alien (?:encounters?|abductions?|contact|implants?)|extraterrestrial encounters?|close encounters? (?:with aliens|of the (?:third|fourth) kind)|abducted by aliens)\b/i;
const SPACE = /\b(interstellar objects?|interstellar comets?|3i\/atlas|oumuamua|astronomical signals?|radio signals?|astronomical anomal(?:y|ies))\b/i;
const ET_CONTEXT = /\b(extraterrestrial|alien (?:intelligence|technology|probe|craft)|non[- ]?human intelligence|seti|technosignatures?|biosignatures?)\b/i;
const SUBSTANCE = /\b(sightings?|witness(?:es)?|investigat\w*|report\w*|document\w*|files?|records?|evidence|hearings?|congress\w*|pentagon|military|airspace|pilots?|radar|footage|videos?|sensors?|research\w*|stud(?:y|ies)|disclos\w*|testimon\w*|whistleblowers?|aaro|nasa|government|abduction accounts?|observations?|detections?|scientists?|search(?:es|ing)?|measurements?|analysis|declassif\w*|released?|officials?|lawmakers?|unidentified (?:anomalous|aerial) phenomena|spotted|filmed|seen|lights?|objects?|craft|encounters?|describ\w*|accounts?|missing time|abduct\w*|experienc\w*|mystery|mysteries|counterintelligence|national security|polic(?:y|ies)|maneuvers?|disruptions?|perspectives?|persists?)\b/i;
const EDITORIAL_EVIDENCE = /\b(investigat\w*|document\w*|report\w*|evidence|radar|pilots?|witness(?:es)?|stud(?:y|ies)|testimon\w*|declassif\w*|files?|records?)\b/i;
const GOLD_INCIDENT = /\b(sightings?|witness(?:es)?|radar|pilots?|footage|investigat\w*|incidents?|hearings?|report\w*)\b/i;
const CLAIM = /\b(alien bodies|extraterrestrial bodies|retrieved craft|recovered spacecraft|biologics|whistleblower|claims? to|claims?|alleged|purported|says?)\b/i;

function topic(title, description) {
 const context = title + ' ' + (description || '');
 if (BAD.test(description) || FICTION.test(description)) return null;
 const lifeQuestion = /\b(microbial life|alien life|possible life|potential life|signs of life|search for life|habitability|life (?:on|beyond|beneath)|microbes?)\b/i;
 const offWorld = /\b(exoplanets?|extrasolar|extraterrestrial|beyond earth|other worlds|icy moons?|ocean worlds?|orbiting (?:a|another) star|solar system|(?:saturn|jupiter|neptune|uranus)['’]s moon|Europa|Enceladus|Mars|Titan)\b/i;
 if (lifeQuestion.test(context) && offWorld.test(context) && SUBSTANCE.test(context) && (lifeQuestion.test(title) || offWorld.test(title))) return 'science';
 if (/\b(signals?|star|research|scientists?|evidence|observations?|discover\w*|stud(?:y|ies))\b/i.test(title) && SCIENCE.test(description)) return 'science';
 if (/\b(hearings?|officials?|testimon\w*|whistleblowers?|congress\w*|lawmakers?)\b/i.test(title) && DISCLOSURE.test(context)) return 'disclosure';
 if (SPACE.test(title) && ET_CONTEXT.test(title + ' ' + description)) return 'space-anomaly';
 if (SCIENCE.test(title)) return 'science';
 if (DISCLOSURE.test(title)) return 'disclosure';
 if (ENCOUNTER.test(title)) return 'encounter';
 if (AERIAL.test(title)) return 'aerial';
 return null;
}
function evaluate(story) {
 const title = story.title || '', description = story.description || '';
 const badHit = title.match(BAD);
 if (badHit) return {accepted:false, reason:'Off-topic keyword in headline: "' + badHit[0] + '"'};
 if (/\b(review|reviewed|hands-on|walkthrough|guide)\b/i.test(title) && !/\b(pentagon|aaro|congress\w*|government|military|official|nasa|intelligence|records?|files?)\b/i.test(title)) return {accepted:false, reason:'Entertainment review / guide, not news'};
 const fic = title.match(FICTION);
 if (fic) return {accepted:false, reason:'Fiction / satire marker in headline: "' + fic[0] + '"'};
 if (!topic(title, description)) return {accepted:false, reason:'Headline is not about UFOs/UAP, disclosure, encounters or the search for alien life'};
 if (!SUBSTANCE.test(title + ' ' + description)) return {accepted:false, reason:'No substantive context (no sighting, report, document, investigation…)'};
 let points = 2;
 if (/\b(aaro|nasa|pentagon|congress|military|hearing|government|official|declassified|navy|air force)\b/i.test(title)) points += 2;
 if (EDITORIAL_EVIDENCE.test(title)) points += 2;
 if (/\b(sighting|footage|video|released)\b/i.test(title)) points += 1;
 if (story.credibility?.tier === 'official' || story.credibility?.tier === 'press') points += 1;
 if (story.credibility?.tier === 'tabloid') points -= 1;
 if (CLAIM.test(title)) points -= 1;
 return {accepted:true, score:points, confidence: points >= 6 ? 'editorial-high' : points >= 4 ? 'editorial-medium' : 'editorial-low'};
}

/* ---------------------------------------------------------------- regions (headline only) */
const HUBS = {
 seattle:['seattle','tacoma','bellevue','bothell','edmonds','everett','renton','redmond washington','puget sound'],
 phoenix:['phoenix','mesa arizona','tempe','scottsdale'], newyork:['new york city','new york ny','manhattan','brooklyn','queens','bronx'],
 losangeles:['los angeles','pasadena','long beach california','santa monica','burbank'], lasvegas:['las vegas','henderson nevada'],
 portland:['portland oregon','beaverton oregon','hillsboro oregon'], chicago:['chicago','evanston illinois','naperville'],
 denver:['denver','boulder colorado','aurora colorado'], boston:['boston','cambridge massachusetts'],
 dc:['washington dc','washington d c','district of columbia','arlington virginia'], miami:['miami','fort lauderdale'],
 dallas:['dallas','fort worth','plano texas'], houston:['houston','sugar land texas'], atlanta:['atlanta','marietta georgia'],
 detroit:['detroit','dearborn michigan'], albuquerque:['albuquerque','rio rancho'], boise:['boise','meridian idaho'],
 roswell:['roswell new mexico','roswell nm'], billings:['billings montana'], omaha:['omaha nebraska'], baltimore:['baltimore maryland'],
 saltlakecity:['salt lake city'], minneapolis:['minneapolis'], pittsburgh:['pittsburgh'], sanfrancisco:['san francisco','oakland california'],
 sanantonio:['san antonio'], orlando:['orlando florida'], tampa:['tampa florida'], nashville:['nashville'], charlotte:['charlotte north carolina'],
 kansascity:['kansas city missouri'], oklahomacity:['oklahoma city'], stlouis:['st louis missouri','saint louis missouri']
};
const HUB_ALIASES = Object.entries(HUBS).map(([id, aliases]) => [id, aliases.map(a => normalize(a))]);
function region(title) {
 const text = normalize(title), matches = [];
 for (const [id, aliases] of HUB_ALIASES) if (aliases.some(a => text.includes(a))) matches.push(id);
 return matches.length === 1 ? matches[0] : null;
}

/* ---------------------------------------------------------------- parsing */
/* Aggregator headlines end in " - Publisher"; split it off so relevance and clustering see the real headline. */
function splitOutlet(title, hinted) {
 if (hinted) {
  const sfx = ' - ' + hinted;
  if (title.toLowerCase().endsWith(sfx.toLowerCase())) return [title.slice(0, -sfx.length).trim(), hinted];
 }
 const m = title.match(/^(.{20,}?)\s+[-–—|]\s+([^-–—|]{2,60})$/);
 if (m && m[2].split(/\s+/).length <= 8) return [m[1].trim(), hinted || m[2].trim()];
 return [title, hinted || ''];
}
function parseFeed(xml, source, nowMs, drops) {
 const out = [];
 const entries = xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi);
 let raw = 0;
 for (const match of entries) {
  if (raw >= 80) break;
  raw++;
  const item = match[1];
  const rawTitle = tag(item, 'title').slice(0, 320);
  const atomLink = item.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1];
  const url = unwrapLink(decode(atomLink || tag(item, 'link')));
  const published = tag(item, 'pubDate') || tag(item, 'published') || tag(item, 'updated') || tag(item, 'dc:date');
  const date = new Date(published);
  if (!rawTitle || !url || !Number.isFinite(date.getTime())) continue;
  if (date.getTime() > nowMs + 10 * 60000 || date.getTime() < nowMs - WINDOW_DAYS * DAY_MS) continue;
  const hinted = tag(item, 'source') || tag(item, 'News:Source') || source.outlet || '';
  const [title, outletRaw] = source.aggregator ? splitOutlet(rawTitle, hinted) : [rawTitle, hinted];
  const outlet = String(outletRaw || source.name).replace(/\s+on MSN$/i, '').slice(0, 80);
  // aggregator descriptions are just the headline again (Google) — keep real snippets only
  // Google's description is only the headline again: skip it. Others: keep a real snippet (not full article bodies).
  let description = source.id.startsWith('gn-') ? '' : (tag(item, 'description') || tag(item, 'summary')).slice(0, 600);
  if (description && normalize(description).includes(normalize(title).trim().slice(0, 40))) description = '';
  const story = {
   id: url, title, url, date: new Date(Math.min(date.getTime(), nowMs)).toISOString(), description,
   source: source.name, outlet, category: source.category, sourceFeed: source.id,
   cityId: region(title)
  };
  story.credibility = credibility(source, outlet, url);
  const verdict = evaluate(story);
  if (!verdict.accepted) { drops.push({at: new Date(nowMs).toISOString(), source: source.id, outlet, title, url, reason: verdict.reason}); continue; }
  out.push({...story, score: verdict.score, confidence: verdict.confidence,
   verification: story.credibility.tier === 'official' ? 'Official publication; descriptions of claims are not independent verification' : 'Source-reported; underlying claims not independently verified'});
 }
 return {stories: out, raw};
}

async function fetchSource(source, nowMs, drops) {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 7000);
 try {
  const r = await fetch(source.url, {
   headers: {Accept:'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9', 'User-Agent':'Mozilla/5.0 (compatible; ProjectSignalSentinel/' + VERSION + '; +https://cyberameen.github.io/PROJECT-SIGNAL/)'},
   signal: controller.signal, redirect: 'follow'
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const body = await r.text();
  if (body.length > 2500000) throw new Error('Feed too large');
  if (!/<(?:rss|feed|rdf:RDF)\b/i.test(body.slice(0, 2500))) throw new Error(/challenge-platform|Just a moment/i.test(body) ? 'Blocked by bot protection' : 'Not an RSS/Atom feed');
  return parseFeed(body, source, nowMs, drops);
 } catch (e) {
  if (e?.name === 'AbortError') throw new Error('Timed out (7s)');
  throw e;
 } finally { clearTimeout(timer); }
}

/* ---------------------------------------------------------------- Serper (unchanged cadence; now logs the API's reason on errors) */
function serperDate(value, now = Date.now(), earliest = false) {
 const raw = typeof value === 'string' ? value.trim() : '', text = raw.toLowerCase();
 const rel = text.match(/^(\d+)\s+(minute|hour|day|week)s?\s+ago$/);
 if (rel) { const u = {minute:60000,hour:3600000,day:DAY_MS,week:7 * DAY_MS}; return new Date(now - (Number(rel[1]) + (earliest ? 1 : 0)) * u[rel[2]]).toISOString(); }
 if (text === 'yesterday') return day(now - DAY_MS) + 'T00:00:00.000Z';
 if (text === 'today') return day(now) + 'T00:00:00.000Z';
 if (text === 'just now') return new Date(now - (earliest ? 60000 : 0)).toISOString();
 const d = new Date(raw); return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
async function querySerper(env, query, nowMs, drops) {
 if (!env.SERPER_API_KEY) throw new Error('SERPER_API_KEY not configured');
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 10000);
 try {
  const r = await fetch('https://google.serper.dev/news', {
   method: 'POST', headers: {'X-API-KEY': env.SERPER_API_KEY, 'Content-Type': 'application/json'},
   body: JSON.stringify({q: query, gl:'us', hl:'en', num:20, tbs: SERPER_RECENCY}), signal: controller.signal
  });
  const body = await r.text();
  if (!r.ok) {
   let why = ''; try { why = String(JSON.parse(body).message || '').slice(0, 120); } catch {}
   throw new Error('Serper HTTP ' + r.status + (why ? ' — ' + why : ''));
  }
  const data = JSON.parse(body);
  if (!Array.isArray(data?.news)) throw new Error('Serper returned no news array');
  const src = {id:'serper-news', name:'Google News via Serper', category:'news', aggregator:true};
  const out = [];
  for (const item of data.news) {
   const title = plain(item?.title).slice(0, 300), url = safeUrl(item?.link), date = serperDate(item?.date, nowMs), earliest = serperDate(item?.date, nowMs, true);
   if (!title || !url || !date || Date.parse(earliest) < nowMs - WINDOW_DAYS * DAY_MS) continue;
   const outlet = String(item.source || 'Google News').slice(0, 80);
   const story = {id:url, title, url, date, description: plain(item.snippet || '').slice(0, 600), source: src.name, outlet, category:'news', sourceFeed:'serper-news', cityId: region(title), publicationLabel: String(item.date || '').trim(), publicationEarliestAt: earliest};
   story.credibility = credibility(src, outlet, url);
   const v = evaluate(story);
   if (!v.accepted) { drops.push({at:new Date(nowMs).toISOString(), source:'serper-news', outlet, title, url, reason:v.reason}); continue; }
   out.push({...story, score:v.score, confidence:v.confidence, verification:'Google-indexed publisher reporting; underlying claims not independently verified'});
  }
  return {stories: out, raw: data.news.length};
 } catch (e) {
  if (e?.name === 'AbortError') throw new Error('Serper timed out (10s)');
  throw e;
 } finally { clearTimeout(timer); }
}

/* ---------------------------------------------------------------- Reddit daily community slide (OAuth, application-only) */
const REDDIT_SUBS = [{sub:'UFOs', min:150}, {sub:'aliens', min:60}];
const LOW_EFFORT_FLAIR = /\b(meme|humou?r|shitpost|fluff|joke|art|satire|off.?topic)\b/i;
async function redditToken(env) {
 const auth = btoa(env.REDDIT_CLIENT_ID + ':' + env.REDDIT_CLIENT_SECRET);
 const r = await fetch('https://www.reddit.com/api/v1/access_token', {
  method: 'POST',
  headers: {Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': env.REDDIT_USER_AGENT || 'web:project-signal-sentinel:' + VERSION},
  body: 'grant_type=client_credentials'
 });
 if (!r.ok) throw new Error('Reddit auth HTTP ' + r.status);
 const j = await r.json();
 if (!j.access_token) throw new Error('Reddit auth returned no token');
 return j.access_token;
}
function pickRedditPosts(listings, nowMs) {
 const posts = [];
 for (const {sub, min, children} of listings) {
  for (const c of children || []) {
   const p = c?.data; if (!p) continue;
   const ageOk = (nowMs / 1000 - Number(p.created_utc)) <= 26 * 3600;
   if (!ageOk || p.over_18 || p.stickied || p.removed_by_category || p.author === '[deleted]' || p.selftext === '[removed]' || p.selftext === '[deleted]') continue;
   if (Number(p.score) < min) continue;
   const title = plain(p.title).slice(0, 300);
   if (title.length < 20 || LOW_EFFORT_FLAIR.test(p.link_flair_text || '')) continue;
   const thumb = typeof p.thumbnail === 'string' && /^https:\/\/[a-z0-9.-]*(redditmedia\.com|redd\.it)\//i.test(p.thumbnail) ? p.thumbnail : null;
   posts.push({
    id: p.id, subreddit: 'r/' + (p.subreddit || sub), title, upvotes: Number(p.score), comments: Number(p.num_comments) || 0,
    url: 'https://www.reddit.com' + p.permalink, created: new Date(Number(p.created_utc) * 1000).toISOString(),
    flair: p.link_flair_text ? plain(p.link_flair_text).slice(0, 40) : null, thumbnail: thumb
   });
  }
 }
 posts.sort((a, b) => b.upvotes - a.upvotes);
 const out = [], per = {};
 for (const p of posts) { if ((per[p.subreddit] || 0) >= 2) continue; per[p.subreddit] = (per[p.subreddit] || 0) + 1; out.push(p); if (out.length === 3) break; }
 return out;
}
async function community(env, kv, keys, nowMs) {
 const prev = await kv.get(keys.reddit, 'json');
 if (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET) return {state: prev, status: {status:'not-configured', ok:false, reason:'Reddit app credentials not set'}};
 const today = day(nowMs), hour = new Date(nowMs).getUTCHours();
 const freshToday = prev && prev.day === today && prev.ok;
 const recentlyTried = prev && prev.lastAttemptAt && nowMs - Date.parse(prev.lastAttemptAt) < 60 * 60000;
 const dueToday = !freshToday && (hour >= REDDIT_HOUR_UTC || !prev?.ok) && !recentlyTried;
 if (!dueToday) return {state: prev, status: {status: prev?.ok ? 'ok' : 'failing', ok: !!prev?.ok, reason: prev?.ok ? 'Daily pick for ' + prev.day : (prev?.error || 'waiting for daily window')}};
 try {
  const token = await redditToken(env);
  const listings = [];
  for (const s of REDDIT_SUBS) {
   const r = await fetch('https://oauth.reddit.com/r/' + s.sub + '/top?t=day&limit=25&raw_json=1', {headers: {Authorization: 'Bearer ' + token, 'User-Agent': env.REDDIT_USER_AGENT || 'web:project-signal-sentinel:' + VERSION}});
   if (!r.ok) throw new Error('Reddit r/' + s.sub + ' HTTP ' + r.status);
   const j = await r.json();
   listings.push({...s, children: j?.data?.children || []});
  }
  const posts = pickRedditPosts(listings, nowMs);
  const state = {day: today, ok: true, at: new Date(nowMs).toISOString(), lastAttemptAt: new Date(nowMs).toISOString(), label: 'COMMUNITY CHATTER — UNVERIFIED', posts};
  await kv.put(keys.reddit, JSON.stringify(state));
  return {state, status: {status:'ok', ok:true, reason: posts.length + ' posts picked for ' + today}};
 } catch (e) {
  const state = {...(prev || {}), lastAttemptAt: new Date(nowMs).toISOString(), error: String(e.message || e).slice(0, 160)};
  await kv.put(keys.reddit, JSON.stringify(state));
  return {state, status: {status:'failing', ok:false, reason: state.error}};
 }
}

/* ---------------------------------------------------------------- clustering ("covered by N outlets") */
const STOP = new Set('the a an of to for in on and with from at by as is are was were be been its it this that these those new news says say said after over about into than more most what whats how why who will can could may might has have had not but or our your their his her they them via amid just also near out up down off'.split(' '));
const WEAK = new Set(['ufo','uap','pentagon','alien','aliens','file','files','reveal','report','secret','military','government','release','releases','released','video','videos']);
const tokens = t => [...new Set(String(t).toLowerCase().replace(/[’']s\b/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).map(w => w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w).filter(w => w.length > 2 && !STOP.has(w)))];
function clusterStories(stories) {
 const n = stories.length, tk = stories.map(s => tokens(s.title)), df = new Map();
 tk.forEach(ts => ts.forEach(w => df.set(w, (df.get(w) || 0) + 1)));
 const wt = w => (WEAK.has(w) ? 0.25 : 1) * Math.log(1 + n / (df.get(w) || 1));
 const parent = stories.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
 const index = new Map();
 tk.forEach((ts, i) => ts.forEach(w => { if (!WEAK.has(w)) { if (!index.has(w)) index.set(w, []); index.get(w).push(i); } }));
 const tried = new Set();
 for (const [w, list] of index) {
  if (list.length < 2 || list.length > n * 0.5) continue;
  for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
   const i = list[a], j = list[b], key = i * 100003 + j; if (tried.has(key)) continue; tried.add(key);
   if (Math.abs(Date.parse(stories[i].date) - Date.parse(stories[j].date)) > 8 * DAY_MS) continue;
   const A = new Set(tk[i]), Bs = new Set(tk[j]);
   let inter = 0, wa = 0, wb = 0, strong = 0;
   A.forEach(x => { wa += wt(x); if (Bs.has(x)) { inter += wt(x); if (!WEAK.has(x) && (df.get(x) || 0) <= Math.max(2, n * 0.5)) strong++; } });
   Bs.forEach(x => { wb += wt(x); });
   const sim = Math.min(wa, wb) ? inter / Math.min(wa, wb) : 0;
   if ((sim >= 0.45 && strong >= 1) || strong >= 3) parent[find(i)] = find(j);
  }
 }
 const groups = new Map();
 stories.forEach((s, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(s); });
 const rank = {official:5, press:4, specialist:3, web:2, tabloid:1};
 const clusters = [];
 for (const members of groups.values()) {
  members.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const lead = members.slice().sort((a, b) => (rank[b.credibility?.tier] || 0) - (rank[a.credibility?.tier] || 0) || (b.description ? 1 : 0) - (a.description ? 1 : 0) || b.score - a.score)[0];
  const outlets = [], seen = new Set();
  for (const m of members) { const k = (m.outlet || m.source).toLowerCase(); if (seen.has(k)) continue; seen.add(k); outlets.push({name: m.outlet || m.source, url: m.url, date: m.date, tier: m.credibility?.tier || 'web'}); }
  const id = 'c' + hash(members.map(m => m.url).sort()[0]);
  members.forEach(m => { m.clusterId = id; });
  clusters.push({id, title: lead.title, url: lead.url, leadOutlet: lead.outlet, description: (members.find(m => m.description) || {}).description || '',
   count: outlets.length, reports: members.length, outlets, newest: members[0].date, earliest: members[members.length - 1].date,
   topTier: outlets.reduce((t, o) => (rank[o.tier] || 0) > (rank[t] || 0) ? o.tier : t, 'tabloid'), cityId: (members.find(m => m.cityId) || {}).cityId || null,
   coveredBy: outlets.length > 1 ? 'Covered by ' + outlets.length + ' outlets' : 'Single outlet'});
 }
 clusters.sort((a, b) => Date.parse(b.newest) - Date.parse(a.newest));
 return clusters;
}

/* ---------------------------------------------------------------- gold (unchanged rules) */
function goldIncident(story) {
 const domain = topic(story.title, story.description || '');
 if (story.publicationEarliestAt && day(story.publicationEarliestAt) !== day(story.date)) return false;
 return domain !== 'science' && domain !== 'space-anomaly' && AERIAL.test(story.title) && GOLD_INCIDENT.test(story.title) && region(story.title) === story.cityId;
}
function selectGold(stories, now) {
 const today = day(now);
 const c = stories.filter(s => s.cityId && day(Date.parse(s.date)) === today && goldIncident(s) && evaluate(s).accepted && evaluate(s).score >= 6);
 c.sort((a, b) => evaluate(b).score - evaluate(a).score || Date.parse(b.date) - Date.parse(a.date));
 if (!c.length) return null;
 const v = evaluate(c[0]);
 return {day: today, cityId: c[0].cityId, story: {...c[0], score: v.score, confidence: v.confidence}, confidence: v.confidence,
  method: 'Editorial selection from source-reported UAP coverage. City is identified in the headline; claims are not independently verified.'};
}
const isSnapshotStale = (s, now = Date.now()) => { const u = Date.parse(s?.updatedAt); return !Number.isFinite(u) || u > now || now - u >= SNAPSHOT_FRESH_MS; };
function validGold(snapshot) {
 const now = Date.now(); if (!snapshot?.gold || isSnapshotStale(snapshot, now)) return null;
 const g = snapshot.gold, s = g.story, today = day(now);
 if (g.day !== today || !s?.cityId || g.cityId !== s.cityId || day(Date.parse(s.date)) !== today) return null;
 const v = evaluate(s); if (!v.accepted || v.score < 6 || !goldIncident(s)) return null;
 return {...g, story: {...s, score: v.score, confidence: v.confidence}};
}

/* ---------------------------------------------------------------- source health */
function health(prev, nowMs, result) {
 const h = {...(prev || {})};
 h.firstSeenAt = h.firstSeenAt || new Date(nowMs).toISOString();
 if (result) {
  h.lastFetchAt = new Date(nowMs).toISOString();
  if (result.error) { h.lastError = result.error; h.consecutiveErrors = (h.consecutiveErrors || 0) + 1; h.lastCount = 0; }
  else { h.lastError = null; h.consecutiveErrors = 0; h.lastRaw = result.raw; h.lastCount = result.count; if (result.count > 0) h.lastRelevantAt = h.lastFetchAt; h.lastOkFetchAt = h.lastFetchAt; }
 }
 return h;
}
function statusOf(src, h, nowMs) {
 const lastRel = Date.parse(h?.lastRelevantAt), first = Date.parse(h?.firstSeenAt);
 const recentRelevant = Number.isFinite(lastRel) && nowMs - lastRel < FAIL_AFTER_MS;
 let status, reason = null;
 if (!h?.lastFetchAt) { status = 'pending'; reason = 'Not fetched yet'; }
 else if (h.lastError) { status = h.consecutiveErrors >= 2 ? 'failing' : 'retrying'; reason = h.lastError; }
 else if (recentRelevant) { status = 'ok'; }
 else if (Number.isFinite(first) && nowMs - first < FAIL_AFTER_MS) { status = 'warming'; reason = 'No relevant items yet — reports FAILING if still 0 after 24h'; }
 else { status = 'failing'; reason = h.lastError ? h.lastError : 'No relevant items in the last 24h'; }
 return {id: src.id, name: src.name, tier: src.tier || (src.aggregator ? 'aggregated' : 'web'), status, ok: status === 'ok', paused: false,
  count: h?.lastCount || 0, raw: h?.lastRaw ?? null, lastRelevantAt: h?.lastRelevantAt || null, lastFetchAt: h?.lastFetchAt || null,
  everyMinutes: src.every, error: status === 'failing' || status === 'retrying' ? reason : null, reason};
}

/* ---------------------------------------------------------------- collection */
async function collect(env, {force = false} = {}) {
 if (!env.SENTINEL_KV) throw new Error('Missing SENTINEL_KV binding');
 const kv = env.SENTINEL_KV, keys = keysFor(env);
 const previous = await kv.get(keys.snap, 'json');
 const nowMs = Date.now(), now = new Date(nowMs).toISOString();
 const srcState = {...(previous?.sourceState || {})};
 const drops = [];

 // pick the most overdue sources (bounded per run to stay inside CPU/subrequest limits)
 const due = SOURCES.map(s => ({s, last: Date.parse(srcState[s.id]?.lastFetchAt) || 0}))
  .filter(x => force || nowMs - x.last >= x.s.every * 60000 - 90000)
  .sort((a, b) => a.last - b.last).slice(0, force ? SOURCES.length : MAX_SOURCES_PER_RUN).map(x => x.s);
 const results = await Promise.allSettled(due.map(s => fetchSource(s, nowMs, drops)));
 const collected = [];
 results.forEach((r, i) => {
  const s = due[i];
  if (r.status === 'fulfilled') { collected.push(...r.value.stories); srcState[s.id] = health(srcState[s.id], nowMs, {raw: r.value.raw, count: r.value.stories.length}); }
  else srcState[s.id] = health(srcState[s.id], nowMs, {error: String(r.reason?.message || r.reason).slice(0, 160)});
 });

 // Serper: every 4h (or manual), with the API's own error reason
 const serper = await kv.get(keys.serper, 'json') || {};
 const serperDue = env.SERPER_API_KEY && (force || !Number.isFinite(Date.parse(serper.lastQueryAt)) || nowMs - Date.parse(serper.lastQueryAt) >= SERPER_INTERVAL_MS);
 let serperStatus = {id:'serper-news', name:'Google News via Serper', tier:'aggregated', status: env.SERPER_API_KEY ? (serper.lastError ? 'failing' : 'ok') : 'not-configured', ok: !!env.SERPER_API_KEY && !serper.lastError, paused: !serperDue, count: serper.lastCount || 0, lastFetchAt: serper.lastQueryAt || null, everyMinutes: 240, error: serper.lastError || null, reason: '4-hour API budget interval'};
 if (serperDue) {
  const qi = Number.isInteger(serper.nextQueryIndex) ? serper.nextQueryIndex % SERPER_QUERIES.length : 0;
  const st = {...serper, lastQueryAt: now};
  try {
   const r = await querySerper(env, SERPER_QUERIES[qi], nowMs, drops);
   collected.push(...r.stories);
   Object.assign(st, {lastSuccessAt: now, lastError: null, lastCount: r.stories.length, nextQueryIndex: (qi + 1) % SERPER_QUERIES.length});
  } catch (e) { Object.assign(st, {lastError: String(e.message || e).slice(0, 160), lastCount: 0}); }
  await kv.put(keys.serper, JSON.stringify(st));
  serperStatus = {...serperStatus, status: st.lastError ? 'failing' : 'ok', ok: !st.lastError, paused: false, count: st.lastCount, lastFetchAt: now, error: st.lastError, reason: st.lastError || null};
 }

 // Reddit daily
 const comm = await community(env, kv, keys, nowMs);

 // merge with the rolling window, de-duplicate, recompute relevance under current rules
 const prevStories = Array.isArray(previous?.stories) ? previous.stories : [];
 const known = new Set(prevStories.map(s => s.url));
 const seenUrl = new Set(), seenHead = new Set(), stories = [];
 let newStories = 0;
 const pool = [...collected, ...prevStories]
  .filter(s => safeUrl(s?.url) && Number.isFinite(Date.parse(s.date)) && Date.parse(s.date) >= nowMs - WINDOW_DAYS * DAY_MS && Date.parse(s.date) <= nowMs + 600000)
  .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
 for (const s of pool) {
  const u = s.url.replace(/[?#].*$/, ''), head = normalize(s.title).trim() + '|' + normalize(s.outlet || '').trim();
  if (seenUrl.has(u) || seenHead.has(head)) continue;
  const fromPrevious = !collected.includes(s);
  if (!s.credibility) s.credibility = credibility({tier: 'web'}, s.outlet || s.source, s.url);
  if ((!fromPrevious || previous?.rulesVersion !== RULES_VERSION) && !evaluate(s).accepted) continue;
  seenUrl.add(u); seenHead.add(head);
  if (!known.has(s.url)) newStories++;
  stories.push(s);
  if (stories.length >= MAX_STORIES) break;
 }
 const sameSet = previous?.clusters && previous.rulesVersion === RULES_VERSION && newStories === 0 && prevStories.length === stories.length && stories.every(s => s.clusterId);
 const clusters = sameSet ? previous.clusters : clusterStories(stories);

 // audit log of relevance drops (newest first, de-duplicated by URL)
 const prevDropped = Array.isArray(previous?.dropped) ? previous.dropped : [];
 const dSeen = new Set(), dropped = [];
 for (const d of [...drops, ...prevDropped]) { if (dSeen.has(d.url)) continue; dSeen.add(d.url); dropped.push(d); if (dropped.length >= MAX_DROPPED) break; }

 const feedStatus = [...SOURCES.map(s => statusOf(s, srcState[s.id], nowMs)), serperStatus, {id:'reddit-daily', name:'Reddit · r/UFOs + r/aliens (daily)', tier:'community', ...comm.status, count: comm.state?.posts?.length || 0}];
 const scanSucceeded = results.some(r => r.status === 'fulfilled') || !due.length;
 const updatedAt = scanSucceeded ? now : previous?.updatedAt || null;
 const snapshot = {
  version: VERSION, rulesVersion: RULES_VERSION, updatedAt, lastAttempt: now, stale: isSnapshotStale({updatedAt}, nowMs),
  lastDiscoveryAt: newStories ? now : previous?.lastDiscoveryAt || null, newStories,
  window: {days: WINDOW_DAYS, cronMinutes: 10},
  feedStatus, sourceState: srcState,
  stories, clusters,
  community: comm.state?.ok ? {day: comm.state.day, label: comm.state.label, posts: comm.state.posts} : null,
  dropped,
  gold: null,
  policy: 'Editorial confidence measures relevance, not evidence strength. Credibility tags describe the publisher, not the claim. Community posts are unverified.'
 };
 snapshot.gold = snapshot.stale ? null : selectGold(stories, now);
 await kv.put(keys.snap, JSON.stringify(snapshot));
 return snapshot;
}

/* ---------------------------------------------------------------- HTTP */
async function manualScan(request, env) {
 if (!env.SENTINEL_KV || !env.SENTINEL_ADMIN_TOKEN) return response({error:'Missing KV or admin token'}, 503, request);
 const token = request.headers.get('X-Sentinel-Admin-Token') || '';
 if (!token || token !== env.SENTINEL_ADMIN_TOKEN) return response({error:'Unauthorized'}, 401, request);
 const kv = env.SENTINEL_KV, keys = keysFor(env);
 const lock = await kv.get(keys.lock, 'json');
 const elapsed = Date.now() - Date.parse(lock?.at);
 if (elapsed < MANUAL_INTERVAL_MS) return response({error:'Scan cooldown', retryAfterSeconds: Math.ceil((MANUAL_INTERVAL_MS - elapsed) / 1000)}, 429, request);
 await kv.put(keys.lock, JSON.stringify({at: new Date().toISOString()}), {expirationTtl: 300});
 try {
  const s = await collect(env, {force: true});
  return response({status:'scan_complete', version: VERSION, updatedAt: s.updatedAt, feeds: s.feedStatus, stories: s.stories.length, clusters: s.clusters.length, gold: s.gold}, 200, request);
 } catch (e) { console.error('Manual scan failed:', e); return response({error:'Scan failed', detail: String(e?.message || e)}, 502, request); }
}
function response(body, status = 200, request) {
 const origin = request?.headers.get('Origin');
 const path = request ? new URL(request.url).pathname : '';
 const headers = new Headers({'Content-Type':'application/json; charset=utf-8', 'Cache-Control': path.startsWith('/admin/') ? 'no-store' : 'public, max-age=120', 'X-Content-Type-Options':'nosniff', Vary:'Origin'});
 if (origin === ORIGIN) headers.set('Access-Control-Allow-Origin', ORIGIN);
 return new Response(JSON.stringify(body), {status, headers});
}
const strip = s => { const {sourceState, ...rest} = s; return rest; };

export default {
 async scheduled(event, env, ctx) {
  ctx.waitUntil(collect(env).catch(e => console.error('Sentinel collection failed:', e?.message || e)));
 },
 async fetch(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, {status:204, headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400'}});
  if (url.pathname === '/admin/scan' && request.method === 'POST') return manualScan(request, env);
  if (request.method !== 'GET') return response({error:'Method not allowed'}, 405, request);
  if (url.pathname === '/' || url.pathname === '/health') return response({service:'SENTINEL NETWORK', status:'ONLINE', mode:'READ ONLY', version: VERSION}, 200, request);
  if (!['/intel','/v1/briefing','/v1/gold','/v1/regions','/v1/status','/v1/sources','/v1/dropped','/v1/community'].includes(url.pathname)) return response({error:'Not found'}, 404, request);
  if (!env.SENTINEL_KV) return response({error:'Missing SENTINEL_KV binding'}, 503, request);
  const snapshot = await env.SENTINEL_KV.get(keysFor(env).snap, 'json');
  if (!snapshot) return response({status:'warming', message:'Scheduled collection has not completed yet', stories:[], gold:null}, 503, request);
  const stale = isSnapshotStale(snapshot), stories = Array.isArray(snapshot.stories) ? snapshot.stories : [], feeds = Array.isArray(snapshot.feedStatus) ? snapshot.feedStatus : [];
  const active = feeds.filter(f => f.status !== 'not-configured' && !f.paused);
  if (url.pathname === '/v1/status' || url.pathname === '/v1/sources') {
   const newest = Date.parse(stories[0]?.date), age = Number.isFinite(newest) ? Math.max(0, Date.now() - newest) : null;
   const bySource = {}; for (const s of stories) bySource[s.sourceFeed] = (bySource[s.sourceFeed] || 0) + 1;
   return response({service:'SENTINEL NETWORK', version: VERSION, updatedAt: snapshot.updatedAt, lastAttempt: snapshot.lastAttempt, stale,
    lastSuccessfulCollectionAt: snapshot.updatedAt, lastDiscoveryAt: snapshot.lastDiscoveryAt || null, newestArticleAgeMs: age, newsRecent: age !== null && age <= DAY_MS,
    stories: stories.length, clusters: (snapshot.clusters || []).length, storiesBySource: bySource, newStories: snapshot.newStories ?? null,
    window: snapshot.window || null, goldAvailable: !!validGold(snapshot), droppedLogged: (snapshot.dropped || []).length,
    feeds, note: 'A source counts as FAILING when it yields no relevant items for 24 hours or keeps erroring.'}, 200, request);
  }
  if (url.pathname === '/v1/dropped') return response({updatedAt: snapshot.updatedAt, note:'Items removed by the relevance filter (newest first) — for auditing.', dropped: snapshot.dropped || []}, 200, request);
  if (url.pathname === '/v1/community') return response({updatedAt: snapshot.updatedAt, community: snapshot.community || null}, 200, request);
  if (url.pathname === '/intel') {
   return response({version: VERSION, updatedAt: snapshot.updatedAt, totalStories: stories.length,
    breakingCandidates: stories.filter(s => Date.parse(s.date) > Date.now() - 10800000).length,
    sourcesChecked: active.length, sourcesFailed: active.filter(f => f.status === 'failing').map(f => f.name),
    stories: stories.slice(0, 160), clusters: (snapshot.clusters || []).slice(0, 80), community: snapshot.community || null,
    gold: validGold(snapshot), stale, window: snapshot.window || null}, 200, request);
  }
  const base = {updatedAt: snapshot.updatedAt, lastAttempt: snapshot.lastAttempt, stale, feeds, policy: snapshot.policy};
  if (url.pathname === '/v1/gold') return response({...base, gold: validGold(snapshot)}, 200, request);
  if (url.pathname === '/v1/regions') {
   const id = url.searchParams.get('city');
   if (!id || !Object.hasOwn(HUBS, id)) return response({error:'Unknown region'}, 400, request);
   return response({...base, cityId: id, stories: stories.filter(s => s.cityId === id).slice(0, 25)}, 200, request);
  }
  return response({...base, stories: stories.slice(0, 100), gold: validGold(snapshot)}, 200, request);
 }
};

export const __test = {community, keysFor, parseFeed, evaluate, credibility, unwrapLink, splitOutlet, clusterStories, pickRedditPosts, statusOf, health, collect, SOURCES, topic, strip};
