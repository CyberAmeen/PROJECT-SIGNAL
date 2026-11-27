/** PROJECT SIGNAL // SENTINEL NETWORK v4.3
 * Public read-only news endpoints and an authenticated manual scan endpoint.
 * Cron refreshes every 15 minutes; KV retains the latest validated snapshot.
 */

const ORIGIN = 'https://cyberameen.github.io';
const KEY = 'sentinel:snapshot:v2';
const DAY_MS = 86400000;
const SNAPSHOT_FRESH_MS = 60 * 60 * 1000;
const SERPER_STATE_KEY = 'sentinel:serper:state:v1';
const SCAN_LOCK_KEY = 'sentinel:scan:lock:v1';
const SERPER_INTERVAL_MS = 4 * 60 * 60 * 1000;
const MANUAL_INTERVAL_MS = 5 * 60 * 1000;
const SERPER_RECENCY = 'qdr:w';
const SERPER_QUERIES = [
 'UFO OR UAP sighting OR pilot OR radar',
 'AARO OR UAP disclosure OR "nonhuman intelligence" testimony',
 'astrobiology OR biosignature OR SETI OR technosignature',
 '"alien encounter" OR "alien abduction" witness testimony',
 '"interstellar object" OR "unusual signal" extraterrestrial OR SETI'
];
const GOOGLE_TIMEOUT_MS = 3500;
const OTHER_TIMEOUT_MS = 6500;

const SOURCES = [
 {id:'bing-uap',name:'Bing News · UAP',category:'news',kind:'bing',q:'UAP unidentified anomalous phenomena sightings investigation'},
 {id:'bing-ufo',name:'Bing News · UFO',category:'news',kind:'bing',q:'UFO sighting pilot radar investigation'},
 {id:'bing-aaro',name:'Bing News · AARO',category:'government',kind:'bing',q:'AARO Pentagon UAP report'},
 {id:'google-uap',name:'Google News · UAP',category:'news',kind:'google',q:'("UAP" OR "unidentified anomalous phenomena") when:3d'},
 {id:'google-ufo',name:'Google News · UFO',category:'news',kind:'google',q:'"UFO sighting" when:3d'},
 {id:'gdelt-uap',name:'GDELT · UAP',category:'news',kind:'gdelt',q:'"unidentified anomalous phenomena"'},
 {id:'gdelt-ufo',name:'GDELT · UFO',category:'news',kind:'gdelt',q:'"UFO sighting"'},
 {id:'blackvault',name:'The Black Vault',category:'government',kind:'rss',url:'https://www.theblackvault.com/documentarchive/feed/'},
 {id:'nasa',name:'NASA News',category:'government',kind:'rss',url:'https://www.nasa.gov/feed/'},
 {id:'space',name:'Space.com',category:'research',kind:'rss',url:'https://www.space.com/feeds/all'}
];

const HUBS = {
 seattle:['seattle','tacoma','bellevue','bothell','edmonds','everett','renton','redmond washington','puget sound'],
 phoenix:['phoenix','mesa arizona','tempe','scottsdale'],
 newyork:['new york city','new york ny','manhattan','brooklyn','queens','bronx'],
 losangeles:['los angeles','pasadena','long beach california','santa monica','burbank'],
 lasvegas:['las vegas','henderson nevada'],
 portland:['portland oregon','beaverton oregon','hillsboro oregon'],
 chicago:['chicago','evanston illinois','naperville'],
 denver:['denver','boulder colorado','aurora colorado'],
 boston:['boston','cambridge massachusetts'],
 dc:['washington dc','washington d c','district of columbia','arlington virginia'],
 miami:['miami','fort lauderdale'],
 dallas:['dallas','fort worth','plano texas'],
 houston:['houston','sugar land texas'],
 atlanta:['atlanta','marietta georgia'],
 detroit:['detroit','dearborn michigan'],
 albuquerque:['albuquerque','rio rancho'],
 boise:['boise','meridian idaho'],
 roswell:['roswell new mexico','roswell nm'],
 billings:['billings montana'],
 omaha:['omaha nebraska'],
 baltimore:['baltimore maryland'],
 saltlakecity:['salt lake city'],
 minneapolis:['minneapolis'],
 pittsburgh:['pittsburgh'],
 sanfrancisco:['san francisco','oakland california'],
 sanantonio:['san antonio'],
 orlando:['orlando florida'],
 tampa:['tampa florida'],
 nashville:['nashville'],
 charlotte:['charlotte north carolina'],
 kansascity:['kansas city missouri'],
 oklahomacity:['oklahoma city'],
 stlouis:['st louis missouri','saint louis missouri']
};

const decode = value => String(value || '')
 .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
 .replace(/&#(x[\da-f]+|\d+);/gi, (entity, number) => {
  const codePoint = number[0].toLowerCase() === 'x'
   ? parseInt(number.slice(1), 16)
   : Number(number);
  return codePoint <= 0x10FFFF ? String.fromCodePoint(codePoint) : entity;
 })
 .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, entity => ({
  '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&quot;': '"', '&apos;': "'", '&nbsp;': ' '
 }[entity]));

const plain = value => decode(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const tag = (xml, name) => {
 const match = xml.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i'));
 return match ? plain(match[1]) : '';
};

const safeUrl = value => {
 try {
  const url = new URL(value);
  return url.protocol === 'https:' ? url.href : null;
 } catch {
  return null;
 }
};

const day = date => new Date(date).toISOString().slice(0, 10);
const normalize = value => ' ' + String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';

const BAD = /\b(robot(?:s|ics)?|battle of robots|ufo combat|video game|gaming|gameplay|gta|fortnite|minecraft|roblox|comic.?con|cosplay|movie|film|trailer|anime|manga|album|song|concert|merchandise|toy|action figure|wrestling|stock ticker|electric vehicle|ev tech)\b/i;
const AERIAL = /\b(uaps?|ufos?|unidentified (?:anomalous phenomena|aerial phenomena|flying objects?)|(?:unexplained|anomalous) aerial|aaro)\b/i;
const DISCLOSURE = /\b(non[- ]?human intelligence|alleged crash retrieval|uap disclosure|aaro)\b|\bNHI\b.*\b(whistleblower|testimon\w*|retrieval|disclosure)\b/i;
const SCIENCE = /\b(astrobiology|biosignatures?|technosignatures?|seti|extraterrestrial (?:life|microbes?|microorganisms?|intelligence)|alien life|life (?:beyond|outside) earth|potentially habitable (?:exoplanet|world)s?)\b/i;
const ENCOUNTER = /\b(alien (?:encounters?|abductions?|contact)|extraterrestrial encounters?|close encounters? (?:with aliens|of the (?:third|fourth) kind))\b/i;
const SPACE = /\b(interstellar objects?|interstellar comets?|astronomical signals?|radio signals?|astronomical anomal(?:y|ies))\b/i;
const ET_CONTEXT = /\b(extraterrestrial|alien intelligence|non[- ]?human intelligence|seti|technosignatures?|biosignatures?)\b/i;
const SUBSTANCE = /\b(sightings?|witness(?:es)?|investigat\w*|report\w*|document\w*|evidence|hearings?|congress|pentagon|military|airspace|pilots?|radar|footage|video|sensors?|research\w*|stud(?:y|ies)|disclos\w*|testimon\w*|whistleblowers?|aaro|nasa|government|abduction accounts?|observations?|detections?|scientists?|search(?:es|ing)?|measurements?|analysis|unidentified (?:anomalous|aerial) phenomena)\b/i;
const EDITORIAL_EVIDENCE = /\b(investigat\w*|document\w*|report\w*|evidence|radar|pilots?|witness(?:es)?|stud(?:y|ies)|testimon\w*)\b/i;
const GOLD_INCIDENT = /\b(sightings?|witness(?:es)?|radar|pilots?|footage|investigat\w*|incidents?|hearings?|report\w*)\b/i;

function topic(title, description) {
 const context = title + ' ' + (description || '');
 if (BAD.test(description) || FICTION.test(description)) return null;
 const lifeQuestion = /\b(microbial life|alien life|possible life|potential life|signs of life|search for life|habitability|life (?:on|beyond|beneath)|microbes?)\b/i;
 const offWorld = /\b(exoplanets?|extrasolar|extraterrestrial|beyond earth|other worlds|icy moons?|ocean worlds?|orbiting (?:a|another) star|solar system|(?:saturn|jupiter|neptune|uranus)['’]s moon|Europa|Enceladus|Mars|Titan)\b/i;
 if (lifeQuestion.test(context) && offWorld.test(context) && SUBSTANCE.test(context)
  && (lifeQuestion.test(title) || offWorld.test(title))) return 'science';
 if (/\b(signals?|star|research|scientists?|evidence|observations?|discover\w*|stud(?:y|ies))\b/i.test(title)
  && SCIENCE.test(description)) return 'science';
 if (/\b(hearings?|officials?|testimon\w*|whistleblowers?|congress)\b/i.test(title)
  && DISCLOSURE.test(context)) return 'disclosure';
 if (SPACE.test(title) && ET_CONTEXT.test(title + ' ' + description)) return 'space-anomaly';
 if (SCIENCE.test(title)) return 'science';
 if (DISCLOSURE.test(title)) return 'disclosure';
 if (ENCOUNTER.test(title)) return 'encounter';
 if (AERIAL.test(title)) return 'aerial';
 return null;
}
const FICTION = /\b(hoax|satire|fictional|fiction|parody|simulation|mockumentary|role.?play)\b/i;
const CLAIM = /\b(alien bodies|extraterrestrial bodies|retrieved craft|recovered spacecraft|biologics|whistleblower|claims? to|alleged|purported)\b/i;

function region(title, description) {
 // Geographical matches come only from the headline.
 const text = normalize(title);
 const matches = [];
 for (const [id, aliases] of Object.entries(HUBS)) {
  if (aliases.some(alias => text.includes(normalize(alias)))) matches.push(id);
 }
 return matches.length === 1 ? matches[0] : null;
}

function evaluate(story) {
 const title = story.title || '';
 const description = story.description || '';

 if (BAD.test(title) || FICTION.test(title) || !topic(title, description)) {
  return {accepted:false,reason:'Irrelevant title'};
 }
 if (!SUBSTANCE.test(title + ' ' + description)) {
  return {accepted:false,reason:'Insufficient substantive context'};
 }

 let points = 2;
 if (/\b(aaro|nasa|pentagon|congress|military|hearing|government|official|declassified)\b/i.test(title)) points += 2;
 if (EDITORIAL_EVIDENCE.test(title)) points += 2;
 if (/\b(sighting|footage|video|released)\b/i.test(title)) points += 1;
 if (story.sourceFeed === 'nasa' || story.sourceFeed === 'blackvault') points += 1;
 if (CLAIM.test(title)) points -= 1;

 return {
  accepted: true,
  score: points,
  confidence: points >= 6 ? 'editorial-high' : points >= 4 ? 'editorial-medium' : 'editorial-low'
 };
}

function parse(xml, source) {
 const stories = [];
 const entries = xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi);
 for (const match of entries) {
  const item = match[1];
  const title = tag(item, 'title').slice(0, 300);
  const atomLink = item.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1];
  const url = safeUrl(atomLink || tag(item, 'link'));
  const published = tag(item, 'pubDate') || tag(item, 'published') || tag(item, 'updated') || tag(item, 'dc:date');
  const date = new Date(published);
  const description = (tag(item, 'description') || tag(item, 'summary') || tag(item, 'content:encoded')).slice(0, 1000);

  if (!title || !url || !Number.isFinite(date.getTime())) continue;
  if (date.getTime() > Date.now() || date.getTime() < Date.now() - 4 * DAY_MS) continue;

  const story = {
   id: url, title, url, date: date.toISOString(), description,
   source: source.name, category: source.category,
   cityId: region(title, description), sourceFeed: source.id
  };
  const verdict = evaluate(story);
  if (!verdict.accepted) continue;
  stories.push({
   ...story, score: verdict.score, confidence: verdict.confidence,
   verification: 'Source-reported; underlying claims not independently verified'
  });
 }
 return stories;
}

function gdeltDate(value) {
 const match = String(value || '').match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
 return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z` : null;
}

function parseGdelt(data, source) {
 const stories = [];
 const articles = Array.isArray(data?.articles) ? data.articles : [];
 for (const article of articles.slice(0, 100)) {
  if (!article || typeof article !== 'object') continue;
  const title = plain(article.title).slice(0, 300);
  const url = safeUrl(article.url);
  const stamp = gdeltDate(article.seendate);
  if (!title || !url || !stamp) continue;

  const date = new Date(stamp);
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now() || date.getTime() < Date.now() - 4 * DAY_MS) continue;

  const story = {
   id: url, title, url, date: date.toISOString(), description: '',
   source: article.domain || source.name, category: source.category,
   cityId: region(title, ''), sourceFeed: source.id
  };
  const verdict = evaluate(story);
  if (!verdict.accepted) continue;
  stories.push({
   ...story, score: verdict.score, confidence: verdict.confidence,
   verification: 'Source-reported; underlying claims not independently verified'
  });
 }
 return stories;
}

async function fetchFeed(source) {
 const isGoogle = source.kind === 'google';
 const isGdelt = source.kind === 'gdelt';
 let url = source.url;

 if (source.kind === 'bing') {
  url = 'https://www.bing.com/news/search?q=' + encodeURIComponent(source.q) + '&format=rss&setlang=en-US';
 }
 if (isGoogle) {
  url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(source.q) + '&hl=en-US&gl=US&ceid=US:en';
 }
 if (isGdelt) {
  url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=' + encodeURIComponent(source.q) + '&mode=artlist&maxrecords=75&timespan=3d&format=json&sort=datedesc';
 }

 const controller = new AbortController();
 const timeout = isGoogle ? GOOGLE_TIMEOUT_MS : OTHER_TIMEOUT_MS;
 const timer = setTimeout(() => controller.abort(), timeout);

 try {
  const result = await fetch(url, {
   headers: {
    Accept: isGdelt ? 'application/json' : 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9',
    'User-Agent': 'Mozilla/5.0 (compatible; ProjectSignalSentinel/4.0)'
   },
   signal: controller.signal,
   redirect: 'follow'
  });

  if (!result.ok) throw new Error('HTTP ' + result.status);
  const length = Number(result.headers.get('content-length') || 0);
  if (length > 1600000) throw new Error('Feed too large');

  const body = await result.text();
  if (body.length > 1600000) throw new Error('Feed too large');

  if (isGdelt) {
   let json;
   try {
    json = JSON.parse(body);
   } catch {
    throw new Error('Invalid JSON response');
   }
   return parseGdelt(json, source);
  }

  if (!/<(?:rss|feed|rdf:RDF)\b/i.test(body.slice(0, 1500))) {
   throw new Error('Not RSS/Atom XML');
  }
  return parse(body, source);
 } catch (error) {
  if (error?.name === 'AbortError') throw new Error('Deadline exceeded (' + timeout + 'ms)');
  throw error;
 } finally {
  clearTimeout(timer);
 }
}

function goldIncident(story) {
 const domain = topic(story.title, story.description || '');
 if (story.publicationEarliestAt && day(story.publicationEarliestAt) !== day(story.date)) return false;
 return domain !== 'science' && domain !== 'space-anomaly'
  && AERIAL.test(story.title) && GOLD_INCIDENT.test(story.title)
  && region(story.title, '') === story.cityId;
}

function selectGold(stories, now) {
 const today = day(now);
 const candidates = stories.filter(story => {
  const timestamp = Date.parse(story.date);
  if (!story.cityId || !Number.isFinite(timestamp) || day(timestamp) !== today) return false;
  if (!goldIncident(story)) return false;
  const verdict = evaluate(story);
  return verdict.accepted && verdict.score >= 6;
 });

 candidates.sort((a, b) => evaluate(b).score - evaluate(a).score || Date.parse(b.date) - Date.parse(a.date));
 if (!candidates.length) return null;

 const verdict = evaluate(candidates[0]);
 const story = {...candidates[0], score:verdict.score, confidence:verdict.confidence};
 return {
  day: today,
  cityId: story.cityId,
  story,
  confidence: story.confidence,
  method: 'Editorial selection from source-reported UAP coverage. City is identified in the headline; claims are not independently verified.'
 };
}

function isSnapshotStale(snapshot, now = Date.now()) {
 const updatedAt = Date.parse(snapshot?.updatedAt);
 return !Number.isFinite(updatedAt) || updatedAt > now || now - updatedAt >= SNAPSHOT_FRESH_MS;
}

function validGold(snapshot) {
 const now = Date.now();
 if (!snapshot?.gold || isSnapshotStale(snapshot, now)) return null;

 const gold = snapshot.gold;
 const story = gold.story;
 const today = day(now);
 if (gold.day !== today || !story?.cityId || gold.cityId !== story.cityId) return null;

 const timestamp = Date.parse(story.date);
 if (!Number.isFinite(timestamp) || day(timestamp) !== today) return null;

 const verdict = evaluate(story);
 if (!verdict.accepted || verdict.score < 6) return null;
 if (!goldIncident(story)) return null;

 return {...gold, story:{...story, score:verdict.score, confidence:verdict.confidence}};
}

function serperDate(value, now = Date.now(), earliest = false) {
 const raw = typeof value === 'string' ? value.trim() : '';
 const text = raw.toLowerCase();
 const relative = text.match(/^(\d+)\s+(minute|hour|day|week)s?\s+ago$/);

 if (relative) {
  const units = {minute:60000,hour:3600000,day:DAY_MS,week:7 * DAY_MS};
  // Display the nominal age. Use the oldest plausible instant for admission.
  const date = new Date(now - (Number(relative[1]) + (earliest ? 1 : 0)) * units[relative[2]]);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
 }
 if (text === 'yesterday') return day(now - DAY_MS) + 'T00:00:00.000Z';
 if (text === 'today') return day(now) + 'T00:00:00.000Z';
 if (text === 'just now') return new Date(now - (earliest ? 60000 : 0)).toISOString();
 const iso = raw.match(/^(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/i);
 if (iso) {
  const calendar = new Date(iso[1]);
  const date = new Date(raw);
  if (Number.isFinite(calendar.getTime()) && day(calendar) === iso[1] && Number.isFinite(date.getTime())) {
   return date.toISOString();
  }
 }
 const calendar = text.match(/^([a-z]{3,9}) (\d{1,2}),? (\d{4})$/);
 if (calendar) {
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const month = months.findIndex(name => calendar[1] === name || calendar[1] === name.slice(0, 3));
  if (month >= 0) return serperDate(calendar[3] + '-' + String(month + 1).padStart(2, '0') + '-' + calendar[2].padStart(2, '0'), now);
 }
 return null;
}

function storyIdentity(story) {
 const url = new URL(story.url);
 url.hash = '';
 for (const key of [...url.searchParams.keys()]) {
  if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
 }
 url.searchParams.sort();
 // Compare substantive words in order. Keep names, numbers, negation and locations.
 // Normalize common active/passive reporting clauses without sorting entity roles.
 // Align a leading location clause with a trailing location clause for the same hub.
 const dateline = story.title.match(/^Over ([^,]{2,40}),\s+(.+)$/i);
 const headlineText = dateline && region(dateline[1], '') && !region(dateline[2], '')
  ? dateline[2] + ' over ' + dateline[1] : story.title;
 const clause = normalize(headlineText).trim()
  .replace(/^(.+?) (?:was |were )?reported by ((?:military |airline )?(?:pilots?|witnesses|officials|researchers))\b(.*)$/, '$2 report $1$3')
  .replace(/\b(pilots?|witnesses|officials|researchers) (?:reported|reports)\b/g, '$1 report');
 const words = clause.split(/\s+/);
 const core = words.filter(word => !['a','an','the'].includes(word));
 const headline = (core.length >= 6 ? core : words).join(' ');
 return [url.href, day(story.date) + '|' + headline];
}

function parseSerper(data, diagnostics = {
 returned: 0, accepted: 0, age: 0, future: 0, relevance: 0, invalidDate: 0, unsafeUrl: 0, duplicates: 0
}, now = Date.now()) {
 if (!Array.isArray(data?.news)) throw new Error('Serper returned no news array');

 const stories = [];
 diagnostics.returned = data.news.length;
 const seen = new Set();
 for (const item of data.news) {
  if (!item || typeof item !== 'object') { diagnostics.unsafeUrl++; continue; }
  const title = plain(item.title).slice(0, 300);
  const url = safeUrl(item.link);
  const date = serperDate(item.date, now);
  const earliest = serperDate(item.date, now, true);
  if (!url || new URL(url).username || new URL(url).password) { diagnostics.unsafeUrl++; continue; }
  if (!date || !earliest) { diagnostics.invalidDate++; continue; }

  const timestamp = Date.parse(date);
  if (Date.parse(earliest) < now - 4 * DAY_MS) { diagnostics.age++; continue; }
  if (timestamp > now) { diagnostics.future++; continue; }

  const description = typeof item.snippet === 'string' ? plain(item.snippet).slice(0, 1000) : '';
  const story = {
   id: url, title, url, date, description,
   publicationLabel: item.date.trim(),
   publicationEarliestAt: earliest,
   publicationPrecision: /T\d{2}:.*(?:Z|[+-]\d{2}:\d{2})$/i.test(item.date) ? 'timestamp' : /ago$|^just now$/i.test(item.date.trim()) ? 'relative' : 'calendar-day',
   source: String(item.source || 'Google News via Serper').slice(0, 100),
   category: 'news', cityId: region(title, description), sourceFeed: 'serper-news'
  };
  const verdict = evaluate(story);
  if (!verdict.accepted) { diagnostics.relevance++; continue; }
  const [canonical, headline] = storyIdentity(story);
  if (seen.has(canonical) || seen.has(headline)) { diagnostics.duplicates++; continue; }
  seen.add(canonical);
  seen.add(headline);
  diagnostics.accepted++;
  stories.push({
   ...story, score: verdict.score, confidence: verdict.confidence,
   verification: 'Google-indexed publisher reporting; underlying claims not independently verified'
  });
 }
 return stories;
}

async function querySerper(env, diagnostics, nowMs) {
 if (!env.SERPER_API_KEY) throw new Error('Missing SERPER_API_KEY secret');

 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 10000);
 try {
  const result = await fetch('https://google.serper.dev/news', {
   method: 'POST',
   headers: {'X-API-KEY':env.SERPER_API_KEY,'Content-Type':'application/json'},
   body: JSON.stringify({q:diagnostics.query,gl:'us',hl:'en',num:20,tbs:diagnostics.recency}),
   signal: controller.signal
  });
  if (!result.ok) throw new Error('Serper HTTP ' + result.status);
  const body = await result.text();
  if (body.length > 500000) throw new Error('Serper response too large');
  let data;
  try { data = JSON.parse(body); }
  catch { throw new Error('Invalid Serper JSON response'); }
  return parseSerper(data, diagnostics, nowMs);
 } catch (error) {
  if (error?.name === 'AbortError') throw new Error('Serper deadline exceeded (10000ms)');
  const message = error instanceof Error ? error.message : '';
  if (/^Serper HTTP \d{3}$/.test(message) || [
   'Serper response too large', 'Invalid Serper JSON response', 'Serper returned no news array'
  ].includes(message)) throw error;
  throw new Error('Serper request failed');
 } finally {
  clearTimeout(timer);
 }
}

async function collect(env, {force = false} = {}) {
 if (!env.SENTINEL_KV) throw new Error('Missing SENTINEL_KV binding');

 const kv = env.SENTINEL_KV;
 const previous = await kv.get(KEY, 'json');
 const state = await kv.get(SERPER_STATE_KEY, 'json') || {};
 const nowMs = Date.now();
 const now = new Date(nowMs).toISOString();

 // Cron runs every 15 minutes. Scheduled Serper calls are limited to every four hours.
 const lastQueryAt = Date.parse(state.lastQueryAt);
 const eligible = lastQueryAt + SERPER_INTERVAL_MS;
 const due = force || !Number.isFinite(eligible) || nowMs >= eligible;
 const queryIndex = Number.isInteger(state.nextQueryIndex) && state.nextQueryIndex >= 0
  && state.nextQueryIndex < SERPER_QUERIES.length ? state.nextQueryIndex : 0;
 const diagnostics = {
  mode: force ? 'manual-extra' : 'scheduled', query: SERPER_QUERIES[queryIndex], recency: SERPER_RECENCY, attemptedAt: now,
  ok: false, error: null, returned: 0, accepted: 0, age: 0, future: 0,
  relevance: 0, invalidDate: 0, unsafeUrl: 0, duplicates: 0
 };
 const sources = SOURCES.filter(source => source.kind !== 'google' && source.kind !== 'gdelt');
 const jobs = sources.map(source => fetchFeed(source));
 const results = await Promise.allSettled([...jobs, ...(due ? [querySerper(env, diagnostics, nowMs)] : [])]);

 /** @type {Array<{
  * id: string,
  * name: string,
  * ok: boolean,
  * paused: boolean,
  * count: number,
  * error: string | null,
  * reason?: string
  * }>} */
 const feeds = results.map((result, index) => ({
  id: index < sources.length ? sources[index].id : 'serper-news',
  name: index < sources.length ? sources[index].name : 'Google News via Serper',
  ok: result.status === 'fulfilled',
  paused: false,
  count: result.status === 'fulfilled' ? result.value.length : 0,
  error: result.status === 'rejected' ? String(result.reason?.message || result.reason).slice(0, 180) : null
 }));

 const serperResult = due ? results[results.length - 1] : null;
 diagnostics.ok = serperResult?.status === 'fulfilled';
 diagnostics.error = due ? feeds[feeds.length - 1].error : null;
 const scheduledAttempt = due && !force;
 // Every scheduled attempt consumes one slot. Only success advances the category.
 const manualKey = SERPER_STATE_KEY + ':manual';
 const priorManual = await kv.get(manualKey, 'json');
 const manual = force ? {...diagnostics, lastSuccessAt: diagnostics.ok ? now : priorManual?.lastSuccessAt || null} : priorManual;
 const serperState = {
  nextScheduledAt: scheduledAttempt ? new Date(nowMs + SERPER_INTERVAL_MS).toISOString() :
   Number.isFinite(eligible) ? new Date(eligible).toISOString() : null,
  retryPending: scheduledAttempt ? !diagnostics.ok : !!state.retryPending,
  nextQueryIndex: scheduledAttempt && diagnostics.ok ? (queryIndex + 1) % SERPER_QUERIES.length : queryIndex,
  lastRequest: scheduledAttempt ? diagnostics : state.lastRequest || null,
  lastQueryAt: scheduledAttempt ? now : state.lastQueryAt || null,
  lastSuccessAt: scheduledAttempt && diagnostics.ok ? now : state.lastSuccessAt || null,
  lastError: scheduledAttempt && !diagnostics.ok
   ? diagnostics.error
 : scheduledAttempt ? null : state.lastError || null,
  intervalMinutes: 240
 };

 if (!due) {
  feeds.push({
   id: 'serper-news', name: 'Google News via Serper', ok: !!state.lastSuccessAt,
   paused: true, count: 0, error: null, reason: '4-hour API budget interval'
  });
 }
 if (force) await kv.put(manualKey, JSON.stringify(manual));
 if (scheduledAttempt) await kv.put(SERPER_STATE_KEY, JSON.stringify(serperState));

 const collected = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
 const previousStories = Array.isArray(previous?.stories) ? previous.stories : [];
 const known = new Set();
 const seen = new Set();
 const stories = [];
 let newStories = 0;
 for (const story of previousStories) {
  if (safeUrl(story?.url) && Number.isFinite(Date.parse(story.date))) {
   for (const id of storyIdentity(story)) known.add(id);
  }
 }
 const candidates = [...collected, ...previousStories].filter(story => {
  const time = Date.parse(story?.publicationEarliestAt || story?.date);
  return safeUrl(story?.url) && time <= nowMs && time >= nowMs - 4 * DAY_MS && evaluate(story).accepted;
 }).sort((a,b) => Date.parse(b.date) - Date.parse(a.date));
 for (const story of candidates) {
  const ids = storyIdentity(story);
  if (ids.some(id => seen.has(id))) continue;
  for (const id of ids) seen.add(id);
  if (!ids.some(id => known.has(id))) newStories++;
  stories.push(story);
  if (stories.length === 120) break;
 }
 // A provider can respond successfully and yield zero relevant articles.
 const scanSucceeded = feeds.some(feed => feed.ok && !feed.paused);
 const updatedAt = scanSucceeded ? now : previous?.updatedAt || null;
 const stale = isSnapshotStale({updatedAt}, nowMs);

 const snapshot = {
  version: '4.3',
  serperHealth: {
   ...serperState, lastManualRequest: manual,
   lastScheduledSuccessAt: serperState.lastSuccessAt,
   lastAttemptAt: [serperState.lastQueryAt, manual?.attemptedAt].filter(Boolean).sort().pop() || null,
   lastSuccessAt: [serperState.lastSuccessAt, manual?.lastSuccessAt, force && diagnostics.ok ? now : null].filter(Boolean).sort().pop() || null
  },
  lastDiscoveryAt: newStories ? now : previous?.lastDiscoveryAt || null,
  newStories,
  googleHealth: {provider:'Serper News API',directRssDisabled:true},
  updatedAt,
  lastAttempt: now,
  stale,
  feedStatus: feeds,
  stories,
  gold: stale ? null : selectGold(stories, now),
  policy: 'Editorial confidence measures relevance. It does not measure evidence strength. Publisher-attributed reporting. Gold is editorial selection, not verification of extraordinary claims.'
 };
 await kv.put(KEY, JSON.stringify(snapshot));
 return snapshot;
}

async function manualScan(request, env) {
 if (!env.SENTINEL_KV || !env.SERPER_API_KEY || !env.SENTINEL_ADMIN_TOKEN) {
  return response({error:'Missing KV, Serper key, or admin token'}, 503, request);
 }
 const token = request.headers.get('X-Sentinel-Admin-Token') || '';
 if (!token || token !== env.SENTINEL_ADMIN_TOKEN) {
  return response({error:'Unauthorized'}, 401, request);
 }

 const kv = env.SENTINEL_KV;
 const lock = await kv.get(SCAN_LOCK_KEY, 'json');
 const elapsed = Date.now() - Date.parse(lock?.at);
 if (elapsed < MANUAL_INTERVAL_MS) {
  return response({
   error: 'Scan cooldown',
   retryAfterSeconds: Math.ceil((MANUAL_INTERVAL_MS - elapsed) / 1000)
  }, 429, request);
 }

 // KV is eventually consistent, so the cooldown is best effort.
 await kv.put(SCAN_LOCK_KEY, JSON.stringify({at:new Date().toISOString()}), {expirationTtl:300});
 try {
  const snapshot = await collect(env, {force:true});
  return response({
   status: 'scan_complete',
   version: '4.3',
   updatedAt: snapshot.updatedAt,
   lastAttempt: snapshot.lastAttempt,
   stale: snapshot.stale,
   feeds: snapshot.feedStatus,
   stories: snapshot.stories.length,
   gold: snapshot.gold
  }, 200, request);
 } catch (error) {
  console.error('Manual scan failed:', error);
  return response({error:'Scan failed',detail:String(error?.message || error)}, 502, request);
 }
}

function response(body, status = 200, request) {
 const origin = request?.headers.get('Origin');
 const headers = new Headers({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': request && new URL(request.url).pathname.startsWith('/admin/') ? 'no-store' : 'public, max-age=120',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Origin'
 });
 if (origin === ORIGIN) headers.set('Access-Control-Allow-Origin', ORIGIN);
 return new Response(JSON.stringify(body), {status, headers});
}

export default {
 async scheduled(event, env, ctx) {
  ctx.waitUntil(collect(env).catch(error => console.error('Sentinel collection failed:', error?.message || error)));
 },

 async fetch(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') {
   return new Response(null, {
    status: 204,
    headers: {
     'Access-Control-Allow-Origin': ORIGIN,
     'Access-Control-Allow-Methods': 'GET, OPTIONS',
     'Access-Control-Allow-Headers': 'Content-Type',
     'Access-Control-Max-Age': '86400'
    }
   });
  }
  if (url.pathname === '/admin/scan' && request.method === 'POST') return manualScan(request, env);
  if (request.method !== 'GET') return response({error:'Method not allowed'}, 405, request);
  if (url.pathname === '/' || url.pathname === '/health') {
   return response({service:'SENTINEL NETWORK',status:'ONLINE',mode:'READ ONLY',version:'4.3'}, 200, request);
  }
  if (!['/intel','/v1/briefing','/v1/gold','/v1/regions','/v1/status'].includes(url.pathname)) {
   return response({error:'Not found'}, 404, request);
  }
  if (!env.SENTINEL_KV) return response({error:'Missing SENTINEL_KV binding'}, 503, request);

  const snapshot = await env.SENTINEL_KV.get(KEY, 'json');
  if (!snapshot) {
   return response({status:'warming',message:'Scheduled collection has not completed yet',stories:[],gold:null}, 503, request);
  }

  const stale = isSnapshotStale(snapshot);
  const stories = Array.isArray(snapshot.stories) ? snapshot.stories : [];
  const feeds = Array.isArray(snapshot.feedStatus) ? snapshot.feedStatus : [];

  if (url.pathname === '/v1/status') {
   const newest = Date.parse(stories[0]?.date);
   const age = Number.isFinite(newest) ? Math.max(0, Date.now() - newest) : null;
   return response({
    lastSuccessfulCollectionAt: snapshot.updatedAt, lastDiscoveryAt: snapshot.lastDiscoveryAt || null,
    newestArticleAgeMs: age, newsRecent: age !== null && age <= DAY_MS,
    service: 'SENTINEL NETWORK',
    version: '4.3',
    updatedAt: snapshot.updatedAt,
    lastAttempt: snapshot.lastAttempt,
    stale,
    stories: stories.length,
    newStories: snapshot.newStories ?? null,
    goldAvailable: !!validGold(snapshot),
    feeds,
    googleHealth: snapshot.googleHealth || null,
    serperHealth: snapshot.serperHealth || null,
    note: 'A connected source with zero relevant articles is not evidence of new UAP reporting.'
   }, 200, request);
  }

  if (url.pathname === '/intel') {
   const attemptedFeeds = feeds.filter(feed => !feed.paused);

   return response({
    updatedAt: snapshot.updatedAt,
    totalStories: stories.length,
    breakingCandidates: stories.filter(story => Date.parse(story.date) > Date.now() - 10800000).length,
    sourcesChecked: attemptedFeeds.length,
    sourcesFailed: attemptedFeeds.filter(feed => !feed.ok).map(feed => feed.name),
    stories: stories.slice(0, 100),
    gold: validGold(snapshot),
    stale
   }, 200, request);
  }

  const base = {
   updatedAt: snapshot.updatedAt,
   lastAttempt: snapshot.lastAttempt,
   stale,
   feeds,
   googleHealth: snapshot.googleHealth || null,
   policy: snapshot.policy
  };

  if (url.pathname === '/v1/gold') {
   return response({...base, gold:validGold(snapshot)}, 200, request);
  }
  if (url.pathname === '/v1/regions') {
   const id = url.searchParams.get('city');
   if (!id || !Object.hasOwn(HUBS, id)) return response({error:'Unknown region'}, 400, request);
   return response({...base, cityId:id, stories:stories.filter(story => story.cityId === id).slice(0, 25)}, 200, request);
  }
  return response({...base, stories:stories.slice(0, 100), gold:validGold(snapshot)}, 200, request);
 }
};

export const __test = {
 parse, parseGdelt, parseSerper, serperDate, region, selectGold, day, evaluate, validGold, isSnapshotStale
};