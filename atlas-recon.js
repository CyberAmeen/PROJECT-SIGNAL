/* PROJECT SIGNAL — CASE RECONSTRUCTIONS (pilot)
 * Scroll-driven reconstructions inside the Atlas dossier for flagship cases.
 * INTEGRITY: every beat carries a source tag. Text paraphrases the cited source unless it is in quotation
 * marks; quotes are verbatim and short. Where accounts conflict the beat says so. Visuals are an artistic
 * interpretation of the described scene, not footage. Scrubbing is deterministic: the scene is a pure
 * function of scroll progress, so moving back and forth is smooth and exact. */
(() => {
  'use strict';
  const shell = document.getElementById('atlas-shell'); if (!shell) return;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (p, a, b) => clamp01((p - a) / (b - a));
  const rnd = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

  /* ================================================================ CASE FILES */
  const W_PHX = 'https://en.wikipedia.org/wiki/Phoenix_Lights';
  const W_DC = 'https://en.wikipedia.org/wiki/1952_Washington,_D.C._UFO_incident';
  const CASES = {
    'ps-001': {
      title: 'Phoenix Lights', date: 'March 13, 1997', place: 'Nevada line → Phoenix → Tucson, Arizona', status: 'DISPUTED',
      statusNote: 'Matches the Atlas record: “Reported event · explanation disputed.”', scene: 'phoenix',
      sources: {
        wp: { label: 'Wikipedia — Phoenix Lights', url: W_PHX },
        wpSI: { label: 'Wikipedia, citing Sheaffer, Skeptical Inquirer (2016)', url: W_PHX },
        wpPC: { label: 'Wikipedia, citing Prothero & Callahan (2017)', url: W_PHX },
        wpAR: { label: 'Wikipedia, citing Arizona Republic (2007) & Skeptical Inquirer (2015)', url: W_PHX },
        wpSym: { label: 'Wikipedia, citing Arizona Daily Star & CNN (2007)', url: W_PHX }
      },
      beats: [
        { at: 0, time: '7:30–10:30 P.M. MST', kind: 'event', src: 'wp', text: 'Lights of varying descriptions are reported across roughly 300 miles, from the Nevada line through Phoenix to the edge of Tucson.' },
        { at: .08, time: '7:55 P.M.', kind: 'witness', src: 'wp', text: 'A witness in Henderson, Nevada reports a large V-shaped object travelling southeast. (The source gives this time in MST, though Henderson keeps Pacific time.)' },
        { at: .17, time: '≈ 8:00 P.M.', kind: 'official', src: 'wpSI', text: 'Per skeptic Robert Sheaffer, five A-10s from Operation Snowbird begin a formation flight along an air corridor, showing steady formation lights.' },
        { at: .25, time: '8:15 P.M.', kind: 'witness', src: 'wp', text: 'A former police officer in Paulden reports a cluster of reddish-orange lights dropping below the southern horizon. Lights are then reported over Prescott Valley.' },
        { at: .34, time: 'EVENING', kind: 'witness', src: 'wpPC', text: 'The Ley family first sees five lights in an arc about 65 miles away. It becomes an upside-down V, then a 60° carpenter’s-square shape they estimate passed 100–150 ft overhead.' },
        { at: .45, time: '8:30–8:45 P.M.', kind: 'witness', src: 'wpPC', quote: true, who: 'Mitch Stanley, amateur astronomer, Scottsdale', text: 'Through his telescope the lights resolve into individual airplanes, “flying in formation.” Glendale witnesses see the formation pass behind thin cloud.' },
        { at: .53, time: 'CONFLICT', kind: 'conflict', src: 'wp', text: 'Witnesses disagree: the shape is described as a triangle, a V, a chevron and a carpenter’s square; Stanley saw high-altitude aircraft while the Leys described an object 100–150 ft overhead.' },
        { at: .61, time: '≈ 8:45 P.M.', kind: 'official', src: 'wpSI', text: 'According to Sheaffer, the A-10 formation lands at Davis-Monthan Air Force Base.' },
        { at: .69, time: '≈ 10:00 P.M.', kind: 'event', src: 'wpSI', text: 'A second, separate event: many Phoenix-area residents see a row of bright lights hovering or slowly falling. It is photographed and videotaped.' },
        { at: .80, time: 'OFFICIAL EXPLANATION', kind: 'official', src: 'wpAR', text: 'The Air Force says Maryland Air National Guard A-10s training over the Barry M. Goldwater Range dropped LUU-2B/B illumination flares. The lights appear to vanish behind the Sierra Estrella.' },
        { at: .90, time: '1997 → 2007', kind: 'conflict', src: 'wpSym', text: 'Accounts diverge: Governor Fife Symington mocked the sightings at a 1997 press conference, but in 2007 described the event as otherworldly and reportedly said he had witnessed it.' }
      ]
    },
    'ps-018': {
      title: 'USS Nimitz “Tic Tac”', date: 'November 14, 2004', place: 'Pacific Ocean, ~100 mi SW of San Diego', status: 'UNRESOLVED',
      statusNote: 'Matches the Atlas record: the object remains publicly unidentified.', scene: 'nimitz',
      sources: {
        fr: { label: 'Cmdr. David Fravor (Ret.), statement to House Oversight (2023)', url: 'https://oversight.house.gov/wp-content/uploads/2023/07/David-Fravor-Statement-for-House-Oversight-Committee.pdf' },
        cbs: { label: 'CBS News / 60 Minutes (May 2021)', url: 'https://www.cbsnews.com/news/navy-ufo-sighting-60-minutes-2021-05-16/' },
        ng: { label: 'National Geographic', url: 'https://www.nationalgeographic.com/science/article/what-the-pentagon-report-says-about-ufos' },
        dod: { label: 'DoD statement, April 27, 2020 (via The Black Vault)', url: 'https://www.theblackvault.com/documentarchive/navy-officially-releases-ufo-uap-videos-calls-them-historical/' }
      },
      beats: [
        { at: 0, time: 'NOV 2004 · PRIOR DAYS', kind: 'official', src: 'fr', text: 'Fravor says the cruiser USS Princeton’s Aegis radar had seen objects descend from above 80,000 ft to about 20,000 ft, linger, then climb back up.' },
        { at: .08, time: 'CONFLICT', kind: 'conflict', src: 'ng', text: 'Accounts differ on when it began: Fravor describes the prior two weeks; National Geographic reports Princeton’s detections starting November 10.' },
        { at: .16, time: 'NOV 14 · TRAINING', kind: 'event', src: 'cbs', text: 'Two F/A-18F Super Hornets — Fravor and wingman Lt. Alex Dietrich — are training with the Nimitz group about 100 miles southwest of San Diego.' },
        { at: .24, time: 'REAL-WORLD TASKING', kind: 'official', src: 'fr', text: 'Princeton suspends the exercise and vectors them west toward a contact. Fravor describes clear skies, light winds and calm seas with no whitecaps.' },
        { at: .33, time: 'THE MERGE', kind: 'witness', src: 'fr', who: 'Fravor', text: 'A patch of white water appears off their right side. Above it, a small white Tic Tac–shaped object moves abruptly, with no rotors, rotor wash or visible control surfaces.' },
        { at: .43, time: 'DESCENT', kind: 'witness', src: 'fr', text: 'Fravor descends to about 15,000 ft with the object near 12,000 ft; Dietrich holds high cover. The object turns to align with his jet and climbs in a clockwise turn.' },
        { at: .53, time: 'GONE', kind: 'witness', src: 'fr', quote: true, who: 'Cmdr. David Fravor', text: '“it rapidly accelerated and disappeared right in front of our aircraft”. Dietrich, about 8,000 ft above, also loses sight. The white water is gone too.' },
        { at: .63, time: 'UNDER A MINUTE', kind: 'official', src: 'fr', text: 'Princeton’s SPY-1 radar reports the object reappearing at their CAP point, about 60 miles away — less than a minute later, Fravor says.' },
        { at: .72, time: 'WINGMAN', kind: 'witness', src: 'cbs', quote: true, who: 'Lt. Cmdr. Alex Dietrich (Ret.)', text: '“No predictable movement, no predictable trajectory.”' },
        { at: .81, time: 'THE VIDEO', kind: 'event', src: 'fr', text: 'A crew from Fravor’s squadron, preparing to launch, records about 90 seconds of targeting-pod video. Fravor says it shows no normal infrared exhaust plume.' },
        { at: .91, time: 'APRIL 27, 2020', kind: 'official', src: 'dod', text: 'The Defense Department authorizes release of three unclassified Navy videos, including one from November 2004, after earlier unauthorized releases.' }
      ]
    },
    'ps-056': {
      title: 'Washington, D.C. 1952', date: 'July 19–29, 1952', place: 'Washington National Airport & Andrews AFB', status: 'DISPUTED',
      statusNote: 'Matches the Atlas record: “Reported event · explanation disputed.”', scene: 'dc',
      sources: {
        wp: { label: 'Wikipedia — 1952 Washington, D.C. UFO incident', url: W_DC },
        st: { label: 'Seattle Times (2002)', url: 'https://archive.seattletimes.com/archive/20020727/ufos27/something-in-the-air-50-years-ago-ufos-streaked-over-dc' }
      },
      beats: [
        { at: 0, time: 'SAT JULY 19 · 11:40 P.M.', kind: 'event', src: 'wp', text: 'Controller Edward Nugent at Washington National Airport sees seven objects on radar about 15 miles south-southwest of the city. No known aircraft are there.' },
        { at: .08, time: 'MINUTES LATER', kind: 'official', src: 'wp', text: 'Supervisor Harry Barnes finds the radar working normally. Tower controllers Howard Cocklin and Joe Zacko report their own blips and a hovering bright light.' },
        { at: .17, time: 'LATER THAT NIGHT', kind: 'witness', src: 'wp', text: 'Targets appear in every sector and pass over the White House and Capitol. At Andrews AFB the radar shows nothing unusual, but an airman sees an orange, fireball-like object.' },
        { at: .26, time: 'ON THE RUNWAY', kind: 'witness', src: 'wp', text: 'Capital Airlines pilot S.C. Pierman sees six white, tailless, fast-moving lights over about 14 minutes; Barnes says each matched a radar blip.' },
        { at: .35, time: 'JULY 20 · ≈ 3:00 A.M.', kind: 'official', src: 'wp', text: 'Two F-94 Starfire jets arrive from New Castle AFB. The targets vanish from National’s radar — and return after the jets leave, low on fuel. Last detection: 5:30 a.m.' },
        { at: .45, time: 'SAT JULY 26 · 8:15 P.M.', kind: 'witness', src: 'wp', text: 'A National Airlines crew sees lights above their plane. Within minutes, radar at National and Andrews tracks unknown targets again; some are calculated at up to 7,000 mph.' },
        { at: .55, time: '11:30 P.M. · INTERCEPT', kind: 'witness', src: 'wp', quote: true, who: 'Lt. William Patterson, F-94 pilot (as relayed by Albert Chop)', text: 'Flight lead Capt. John McHugo sees nothing. His wingman reports four white glows: “I see them now and they’re all around me. What should I do?”' },
        { at: .65, time: 'AFTER MIDNIGHT', kind: 'conflict', src: 'wp', text: 'Experts disagree on the spot: a Navy radar specialist finds a temperature inversion but thinks it too weak to explain the returns; controllers say they were ignoring weather targets.' },
        { at: .75, time: 'JULY 29 · 4:00 P.M.', kind: 'official', src: 'st', quote: true, who: 'Maj. Gen. John Samford, USAF intelligence', text: 'At the Pentagon’s largest press conference since WWII, Samford offers temperature inversion — calling it “about a 50-50 proposition.”' },
        { at: .86, time: 'THE DEBATE', kind: 'conflict', src: 'wp', text: 'The CAA and Project Blue Book attribute the radar returns to inversions and the lights to stars and meteors; Blue Book’s Edward Ruppelt wrote that radar and tower staff disputed it.' },
        { at: .94, time: 'RECORD NOTE', kind: 'conflict', src: 'wp', text: 'Even the dates vary in the record: the source’s summary says July 18–19 and July 26–27, while its detailed account uses the night of July 19–20.' }
      ]
    }
  };

  /* ================================================================ SCENES (pure functions of progress p) */
  const starsCache = new Map();
  function stars(ctx, w, h, seed, n, maxY, tw) {
    const key = seed + ':' + n; let s = starsCache.get(key);
    if (!s) { const r = rnd(seed); s = Array.from({ length: n }, () => [r(), r(), .3 + r() * .9, r() * 6]); starsCache.set(key, s); }
    for (const [x, y, sz, ph] of s) { const a = .35 + .5 * Math.abs(Math.sin(tw * .8 + ph)); ctx.fillStyle = `rgba(225,240,255,${a})`; ctx.fillRect(x * w, y * h * maxY, sz, sz); }
  }
  function glow(ctx, x, y, r, rgb, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  function ridge(ctx, w, h, y0, amp, seed, color) {
    const r = rnd(seed), pts = [], N = 26; for (let i = 0; i <= N; i++) pts.push([i / N * w, y0 - (Math.sin(i * .7 + seed) * .5 + .5) * amp * (.4 + r() * .6)]);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, h); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(w, h); ctx.closePath(); ctx.fill(); return pts;
  }
  const ridgeY = (pts, x) => { for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return lerp(y0, y1, (x - x0) / (x1 - x0)); } return pts[pts.length - 1][1]; };

  const SCENES = {
    phoenix(ctx, w, h, p, tw) {
      const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#02040d'); sky.addColorStop(.62, '#0d1030'); sky.addColorStop(.8, '#2a1a3a'); sky.addColorStop(1, '#3a2030');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h); stars(ctx, w, h, 7, 260, .78, tw);
      const hor = h * (h > w * 1.2 ? .6 : .78);
      const far = ridge(ctx, w, h, hor, h * .05, 3, '#120c1e');
      // city grid (Phoenix valley) — warm sodium lights in perspective
      const r = rnd(41);
      for (let i = 0; i < 520; i++) { const z = r(), x = r() * w, y = hor + 4 + Math.pow(z, 1.8) * (h - hor), s = .6 + z * 1.6; ctx.fillStyle = r() < .82 ? `rgba(255,${170 + r() * 60 | 0},${90 + r() * 40 | 0},${.45 + z * .4})` : `rgba(210,235,255,${.4 + z * .4})`; ctx.fillRect(x, y, s, s); }
      const est = ridge(ctx, w, h, hor + h * .01, h * .09, 9, '#07050c'); // Sierra Estrella silhouette (left-weighted)
      // SEGMENT A: the formation (≈ p 0.04 → 0.64)
      const a = seg(p, .04, .64);
      if (a > 0 && a < 1) {
        const k = ease(a), cx = lerp(-w * .1, w * 1.1, k), cy = lerp(h * .12, h * .46, k) - Math.sin(k * Math.PI) * h * .08;
        const scale = (.55 + Math.sin(k * Math.PI) * .9) * Math.min(w, h) * .12;
        // reported shape: arc → V → 60° "carpenter's square"
        const m1 = seg(p, .3, .38), m2 = seg(p, .38, .46);
        const shape = i => { const u = (i - 2) / 2;
          const arc = [u * 1.6, -Math.cos(u * 1.1) * .6 + .6], vee = [u * 1.4, Math.abs(u) * .9], sq = i <= 2 ? [-(2 - i) * .55, 0] : [0, (i - 2) * .55];
          const ab = [lerp(arc[0], vee[0], m1), lerp(arc[1], vee[1], m1)]; return [lerp(ab[0], sq[0] + .3, m2), lerp(ab[1], sq[1] - .2, m2)]; };
        const vis = Math.min(1, a * 8, (1 - a) * 8);
        for (let i = 0; i < 5; i++) { const [sx, sy] = shape(i), x = cx + sx * scale, y = cy + sy * scale; glow(ctx, x, y, 18, '255,170,80', .35 * vis); ctx.fillStyle = `rgba(255,220,170,${vis})`; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); }
        // telescope inset during Stanley's beat
        const ti = Math.min(seg(p, .44, .47), 1 - seg(p, .52, .55));
        if (ti > 0) {
          const R = Math.min(w, h) * .13, ix = w * (h > w ? .5 : .78), iy = h * (h > w ? .3 : .24);
          ctx.save(); ctx.globalAlpha = ti; ctx.beginPath(); ctx.arc(ix, iy, R, 0, 7); ctx.fillStyle = 'rgba(4,8,20,.92)'; ctx.fill(); ctx.clip();
          for (let i = 0; i < 5; i++) { const x = ix + (i - 2) * R * .32, y = iy + Math.abs(i - 2) * R * .18 - R * .1; ctx.fillStyle = 'rgba(190,200,220,.9)'; ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); ctx.lineTo(x, y - 3); ctx.closePath(); ctx.fill(); ctx.fillRect(x - 1, y - 6, 2, 10); glow(ctx, x - 9, y, 5, '255,190,110', .8); glow(ctx, x + 9, y, 5, '255,190,110', .8); }
          ctx.restore(); ctx.globalAlpha = ti; ctx.strokeStyle = 'rgba(160,255,200,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ix, iy, R, 0, 7); ctx.stroke();
          ctx.fillStyle = 'rgba(190,255,220,.9)'; ctx.font = '600 10px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText('TELESCOPE VIEW', ix, iy + R + 15); ctx.fillText('AS DESCRIBED BY STANLEY', ix, iy + R + 28); ctx.globalAlpha = 1;
        }
      }
      // SEGMENT B: ≈10 p.m. row of lights hovering, slowly falling, vanishing behind the ridge
      const b = seg(p, .68, .97);
      if (b > 0) {
        const n = 8, row = [];
        for (let i = 0; i < n; i++) { const x = w * (.14 + i * .095) + Math.sin(i * 1.7) * 6, on = clamp01((b - i * .03) * 6), fall = Math.max(0, b - .25 - i * .035) * h * .55, y = h * .5 + Math.sin(i * 2.1) * 8 + fall, ry = ridgeY(est, x) - 2; row.push([x, y, on, y < ry]); }
        for (const [x, y, on, above] of row) if (above && on > 0) { glow(ctx, x, y, 26, '255,215,140', .45 * on); ctx.fillStyle = `rgba(255,245,215,${on})`; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill(); }
        ridge(ctx, w, h, hor + h * .01, h * .09, 9, '#07050c'); // redraw ridge so lights set behind it
      }
    },
    nimitz(ctx, w, h, p, tw) {
      const hor = h * (h > w * 1.2 ? .4 : .52);
      const sky = ctx.createLinearGradient(0, 0, 0, hor); sky.addColorStop(0, '#3d7fc4'); sky.addColorStop(1, '#bfe0f5'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hor);
      const sea = ctx.createLinearGradient(0, hor, 0, h); sea.addColorStop(0, '#5f93b8'); sea.addColorStop(1, '#0d3556'); ctx.fillStyle = sea; ctx.fillRect(0, hor, w, h - hor);
      const r = rnd(5); ctx.fillStyle = 'rgba(255,255,255,.10)'; for (let i = 0; i < 140; i++) { const y = hor + Math.pow(r(), 1.6) * (h - hor), x = (r() * w + tw * 6 * (y - hor) / h) % w; ctx.fillRect(x, y, 2 + (y - hor) / 30, 1); }
      // white water patch (p .3 → .58)
      const ww = Math.min(seg(p, .3, .36), 1 - seg(p, .55, .6)), wx = w * .64, wy = hor + (h - hor) * .45;
      if (ww > 0) { ctx.save(); ctx.globalAlpha = ww; for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + tw * .3, rr = 30 + Math.sin(i * 3 + tw) * 8; ctx.fillStyle = 'rgba(240,250,255,.55)'; ctx.beginPath(); ctx.ellipse(wx + Math.cos(a) * rr * 1.6, wy + Math.sin(a) * rr * .35, 9, 3, 0, 0, 7); ctx.fill(); } glow(ctx, wx, wy, 60, '230,245,255', .35); ctx.restore(); }
      // jets
      const jet = (x, y, s, ang, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s); ctx.globalAlpha = a; ctx.fillStyle = '#2b3440'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -9); ctx.lineTo(-6, 0); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fill(); ctx.fillRect(-14, -3, 6, 6); ctx.restore(); ctx.globalAlpha = 1; };
      const jIn = seg(p, .14, .2);
      if (jIn > 0) {
        const d = seg(p, .38, .66), ang = d * Math.PI * 2.2 + Math.PI;
        const fx = lerp(w * .25, wx + Math.cos(ang) * w * .16, ease(seg(p, .2, .4))), fy = lerp(h * .16, wy - h * .2 + Math.sin(ang) * h * .06, ease(seg(p, .2, .4)));
        jet(fx, fy, 1.1, ang + Math.PI / 2, jIn); jet(lerp(w * .3, w * .55, seg(p, .2, .8)), h * .1, .8, .05, jIn * .9);
      }
      // the object: small white capsule; aligns, climbs clockwise, vanishes (p .33 → .58)
      const ob = Math.min(seg(p, .33, .36), 1 - seg(p, .565, .575));
      if (ob > 0) {
        const c = seg(p, .43, .56), ox = wx + Math.sin(tw * 3) * 4 * (1 - c) + Math.cos(c * 5) * w * .05 * c, oy = wy - h * .1 - c * h * .22 + Math.sin(tw * 2.3) * 2;
        ctx.save(); ctx.translate(ox, oy); ctx.rotate(lerp(Math.PI / 2 * .9, -.25, seg(p, .43, .48))); ctx.globalAlpha = ob;
        glow(ctx, 0, 0, 24, '255,255,255', .5); ctx.fillStyle = '#f7fbff'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 5.5, 0, 0, 7); ctx.fill(); ctx.restore();
        const gone = seg(p, .555, .575); if (gone > 0 && gone < 1) { ctx.strokeStyle = `rgba(255,255,255,${(1 - gone) * .9})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + gone * w * .8, oy - gone * h * .2); ctx.stroke(); }
      }
      // SPY-1 radar inset (prior detections / reacquisition at CAP point)
      const ri = Math.max(Math.min(seg(p, 0, .03), 1 - seg(p, .14, .17)), Math.min(seg(p, .62, .65), 1 - seg(p, .7, .73)));
      if (ri > 0) {
        const R = Math.min(w, h) * (h > w ? .2 : .17), ix = w * (h > w ? .5 : .8), iy = h * (h > w ? .27 : .24); ctx.save(); ctx.globalAlpha = ri;
        ctx.fillStyle = 'rgba(2,16,12,.92)'; ctx.beginPath(); ctx.arc(ix, iy, R, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(100,255,170,.5)'; ctx.lineWidth = 1;
        for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(ix, iy, R * k / 3, 0, 7); ctx.stroke(); }
        const sw = tw * 2; ctx.strokeStyle = 'rgba(140,255,190,.8)'; ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix + Math.cos(sw) * R, iy + Math.sin(sw) * R); ctx.stroke();
        if (p < .2) for (let k = 0; k < 5; k++) { const yy = iy - R * .6 + ((tw * .3 + k * .2) % 1) * R * 1.1; ctx.fillStyle = 'rgba(180,255,200,.95)'; ctx.fillRect(ix - R * .5 + k * R * .25, yy, 3, 3); }
        else { ctx.fillStyle = 'rgba(255,230,140,1)'; ctx.beginPath(); ctx.arc(ix + R * .62, iy - R * .1, 3.5, 0, 7); ctx.fill(); }
        ctx.fillStyle = 'rgba(190,255,220,.95)'; ctx.font = '600 10px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText(p < .2 ? 'SPY-1 · DESCENDING CONTACTS' : 'SPY-1 · REACQUIRED ~60 MI AWAY', ix, iy + R + 15); ctx.fillText('AS DESCRIBED — NOT RADAR DATA', ix, iy + R + 28); ctx.restore();
      }
      // FLIR impression (not the actual video)
      const fl = Math.min(seg(p, .8, .83), 1 - seg(p, .9, .93));
      if (fl > 0) {
        ctx.save(); ctx.globalAlpha = fl; ctx.fillStyle = 'rgba(30,30,30,.94)'; ctx.fillRect(0, 0, w, h);
        const n = rnd(3); for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(255,255,255,${n() * .06})`; ctx.fillRect(n() * w, n() * h, 2, 2); }
        const cx = w / 2 + Math.sin(tw * .7) * 6, cy = h * .45; ctx.fillStyle = '#e8e8e8'; ctx.beginPath(); ctx.ellipse(cx, cy, 16, 6, .1, 0, 7); ctx.fill(); glow(ctx, cx, cy, 30, '255,255,255', .25);
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 34, cy - 24, 68, 48);
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 11px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText('ARTIST’S IMPRESSION —', w / 2, h * .3); ctx.fillText('NOT THE ACTUAL TARGETING-POD VIDEO', w / 2, h * .3 + 16); ctx.restore();
      }
    },
    dc(ctx, w, h, p, tw) {
      const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#010309'); sky.addColorStop(.7, '#0b1420'); sky.addColorStop(1, '#1a1d22'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h); stars(ctx, w, h, 13, 200, .7, tw);
      const base = h * (h > w * 1.2 ? .62 : .8); ctx.fillStyle = '#05070b';
      // Washington Monument and Capitol dome silhouettes
      const mx = w * .3; ctx.beginPath(); ctx.moveTo(mx - 9, base); ctx.lineTo(mx - 6, base - h * .34); ctx.lineTo(mx, base - h * .37); ctx.lineTo(mx + 6, base - h * .34); ctx.lineTo(mx + 9, base); ctx.fill();
      glow(ctx, mx, base - h * .33, 5, '255,60,60', .9);
      const cx = w * .68; ctx.fillRect(cx - w * .16, base - h * .06, w * .32, h * .06); ctx.fillRect(cx - w * .05, base - h * .1, w * .1, h * .05);
      ctx.beginPath(); ctx.ellipse(cx, base - h * .1, w * .05, h * .07, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - 3, base - h * .2, 6, h * .04);
      ctx.fillRect(0, base, w, h - base); const r0 = rnd(9); for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(255,${200 + r0() * 50 | 0},150,${.3 + r0() * .4})`; ctx.fillRect(r0() * w, base + 3 + r0() * (h - base - 6), 1.5, 1.5); }
      // radar PPI (sweep driven by progress so scrubbing is exact)
      const port = h > w * 1.2, R = Math.min(w, h) * (port ? .3 : .22), px = w * (port ? .5 : .2), py = h * (port ? .3 : .3), sweep = p * Math.PI * 24 - Math.PI / 2;
      ctx.save(); ctx.fillStyle = 'rgba(2,18,10,.9)'; ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.fill(); ctx.clip();
      const g = ctx.createConicGradient ? ctx.createConicGradient(sweep - .6, px, py) : null;
      if (g) { g.addColorStop(0, 'rgba(80,255,140,0)'); g.addColorStop(.095, 'rgba(80,255,140,.28)'); g.addColorStop(.1, 'rgba(80,255,140,0)'); ctx.fillStyle = g; ctx.fillRect(px - R, py - R, 2 * R, 2 * R); }
      ctx.strokeStyle = 'rgba(80,255,140,.35)'; for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(px, py, R * k / 3, 0, 7); ctx.stroke(); }
      const blips = [];
      const s1 = seg(p, 0, .04), all = seg(p, .15, .2), jets = Math.min(seg(p, .34, .36), 1 - seg(p, .4, .42)), s2 = seg(p, .45, .5), endA = 1 - seg(p, .41, .43), off = 1 - seg(p, .7, .74);
      const rr = rnd(77);
      for (let i = 0; i < 14; i++) {
        const first = i < 7, ang = first ? Math.PI * .62 + (rr() - .5) * .3 : rr() * Math.PI * 2, dist = first ? .55 + rr() * .2 : .2 + rr() * .7;
        let a = first ? s1 : all; a *= (p < .45 ? endA * (1 - jets) : s2) ; if (p > .45) a = Math.max(a, s2) * off;
        if (a > 0) blips.push([px + Math.cos(ang + p * .4 * (i % 3 - 1)) * dist * R, py + Math.sin(ang + p * .4 * (i % 3 - 1)) * dist * R, a]);
      }
      for (const [x, y, a] of blips) { glow(ctx, x, y, 7, '160,255,190', .6 * a); ctx.fillStyle = `rgba(200,255,215,${a})`; ctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
      ctx.restore(); ctx.strokeStyle = 'rgba(120,255,170,.7)'; ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(190,255,220,.9)'; ctx.font = '600 10px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText('NATIONAL ARTC RADAR · AS DESCRIBED', px, py + R + 15);
      // lights in the sky: Pierman's six (p .24–.33), Patterson's four glows around the F-94 (p .53–.63)
      const l1 = Math.min(seg(p, .24, .27), 1 - seg(p, .31, .34));
      for (let i = 0; i < 6; i++) { if (l1 <= 0) break; const t = (p * 9 + i * .17) % 1, x = w * (.45 + t * .5), y = h * (.18 + i * .05) - t * 30; glow(ctx, x, y, 14, '255,255,255', .5 * l1); ctx.fillStyle = `rgba(255,255,255,${l1})`; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); }
      const l2 = Math.min(seg(p, .53, .56), 1 - seg(p, .62, .65));
      if (l2 > 0) {
        const jx = w * .6, jy = h * .3; ctx.save(); ctx.globalAlpha = l2; ctx.fillStyle = '#9aa6b5'; ctx.beginPath(); ctx.moveTo(jx + 16, jy); ctx.lineTo(jx - 12, jy - 10); ctx.lineTo(jx - 8, jy); ctx.lineTo(jx - 12, jy + 10); ctx.closePath(); ctx.fill(); ctx.restore();
        for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + p * 20, x = jx + Math.cos(a) * 60, y = jy + Math.sin(a) * 34; glow(ctx, x, y, 18, '255,255,255', .45 * l2); ctx.fillStyle = `rgba(255,255,255,${l2})`; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); }
      }
      // press conference plate
      const pc = seg(p, .74, .78);
      if (pc > 0) { ctx.fillStyle = `rgba(0,0,0,${.55 * pc})`; ctx.fillRect(0, 0, w, h); ctx.fillStyle = `rgba(235,240,230,${pc})`; ctx.font = '700 14px ui-monospace,monospace'; ctx.textAlign = 'center'; ctx.fillText('THE PENTAGON · JULY 29, 1952', w / 2, h * .32); ctx.font = '600 11px ui-monospace,monospace'; ctx.fillText('PRESS CONFERENCE ON THE WASHINGTON SIGHTINGS', w / 2, h * .32 + 20); }
    }
  };

  /* ================================================================ PLAYER */
  let ui = null;
  function open(id) {
    const C = CASES[id]; if (!C) return;
    close(true);
    const rm = reduced();
    const el = document.createElement('div'); el.className = 'rc' + (rm ? ' rc-still' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `${C.title} — reconstruction`);
    el.innerHTML = `
      <div class="rc-track" style="height:${rm ? 100 : C.beats.length * 70 + 100}vh">
        <div class="rc-stage">
          <canvas class="rc-canvas" aria-hidden="true"></canvas>
          <div class="rc-top">
            <div><div class="rc-kicker">◈ CASE RECONSTRUCTION · ${esc(C.date)}</div><h2 class="rc-title">${esc(C.title)}</h2><div class="rc-place">${esc(C.place)}</div></div>
            <div class="rc-actions"><span class="rc-status rc-${C.status.toLowerCase()}" title="${esc(C.statusNote)}">${esc(C.status)}</span>
              ${rm ? '' : '<button type="button" class="rc-btn rc-play" aria-label="Play">▶ Play</button>'}<button type="button" class="rc-btn rc-skip">Skip ›</button></div>
            <div class="rc-meta"><div class="rc-label" role="note">RECONSTRUCTION — based on cited accounts; artistic interpretation.</div><div class="rc-clock" aria-hidden="true"></div></div>
          </div>
          <div class="rc-cap" aria-live="polite"></div>
          <div class="rc-bar"><div class="rc-ticks">${C.beats.map((b, i) => `<button type="button" style="left:${(b.at * 100).toFixed(1)}%" class="rc-tick k-${b.kind}" aria-label="Beat ${i + 1}: ${esc(b.time)}"></button>`).join('')}</div><i class="rc-fill"></i></div>
          ${rm ? '<div class="rc-step"><button type="button" class="rc-btn rc-prev">‹ Prev</button><span class="rc-count"></span><button type="button" class="rc-btn rc-next">Next ›</button></div>' : '<div class="rc-hint">SCROLL TO SCRUB · OR PRESS PLAY</div>'}
        </div>
      </div>`;
    document.body.append(el); document.documentElement.classList.add('rc-lock');
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), cap = el.querySelector('.rc-cap'), clock = el.querySelector('.rc-clock'), fill = el.querySelector('.rc-fill');
    const st = { el, C, p: 0, beat: -1, raf: 0, play: null, still: rm, idx: 0, dpr: Math.min(2, devicePixelRatio || 1) };
    ui = st;
    const fit = () => { const r = cv.getBoundingClientRect(); cv.width = Math.round(r.width * st.dpr); cv.height = Math.round(r.height * st.dpr); ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); draw(); };
    if ('ResizeObserver' in window) { st.ro = new ResizeObserver(() => fit()); st.ro.observe(cv); }
    const beatAt = p => { let k = 0; C.beats.forEach((b, i) => { if (p + 1e-4 >= b.at) k = i; }); return k; };
    function showBeat(k) {
      if (k === st.beat) return; st.beat = k; const b = C.beats[k], s = C.sources[b.src];
      cap.className = `rc-cap k-${b.kind}`; cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
      cap.innerHTML = `<div class="rc-cap-top"><b>${esc(b.time)}</b>${b.kind === 'conflict' ? '<span class="rc-flag">ACCOUNTS CONFLICT</span>' : b.kind === 'official' ? '<span class="rc-flag rc-off">OFFICIAL / RECORD</span>' : b.kind === 'event' ? '<span class="rc-flag rc-off">REPORTED EVENT</span>' : '<span class="rc-flag rc-wit">WITNESS ACCOUNT</span>'}</div>
        <p>${esc(b.text)}</p>${b.who ? `<div class="rc-who">— ${esc(b.who)}</div>` : ''}
        <a class="rc-src" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">SOURCE · ${esc(s.label)} ↗</a>`;
      clock.textContent = b.time;
      el.querySelectorAll('.rc-tick').forEach((t, i) => t.classList.toggle('on', i <= k));
      const cnt = el.querySelector('.rc-count'); if (cnt) cnt.textContent = `${k + 1} / ${C.beats.length}`;
      try { const S = window.SignalAudio; if (S && S.live && S.live() && !st.still) S.tone({ f: b.kind === 'conflict' ? 330 : 880, dur: 0.06, gain: 0.01, type: 'triangle' }); } catch {}
    }
    function draw() {
      const w = cv.width / st.dpr, h = cv.height / st.dpr, tw = st.still ? 0 : performance.now() / 1000;
      ctx.clearRect(0, 0, w, h);
      try { SCENES[C.scene](ctx, w, h, st.p, tw); } catch (e) { console.error(e); }
      fill.style.transform = `scaleX(${st.p.toFixed(4)})`;
      showBeat(beatAt(st.p));
    }
    // idle loop only for twinkle; scrubbing itself is driven by scroll
    const loop = () => { st.raf = requestAnimationFrame(loop); draw(); };
    if (!rm) {
      el.addEventListener('scroll', () => { const max = el.scrollHeight - el.clientHeight; st.p = clamp01(max ? el.scrollTop / max : 0); }, { passive: true });
      st.raf = requestAnimationFrame(loop);
      const playBtn = el.querySelector('.rc-play');
      playBtn.addEventListener('click', () => {
        if (st.play) { cancelAnimationFrame(st.play.raf); st.play = null; playBtn.textContent = '▶ Play'; return; }
        const max = el.scrollHeight - el.clientHeight, startP = st.p >= .995 ? 0 : st.p, D = 26000 * (1 - startP), t0 = performance.now();
        playBtn.textContent = '❚❚ Pause';
        const step = now => { const q = Math.min(1, (now - t0) / D); el.scrollTop = (startP + (1 - startP) * q) * max; if (q < 1 && st.play) st.play.raf = requestAnimationFrame(step); else { st.play = null; playBtn.textContent = '↺ Replay'; } };
        st.play = { raf: requestAnimationFrame(step) };
      });
      ['wheel', 'touchstart'].forEach(ev => el.addEventListener(ev, () => { if (st.play) { cancelAnimationFrame(st.play.raf); st.play = null; playBtn.textContent = '▶ Play'; } }, { passive: true }));
      el.querySelectorAll('.rc-tick').forEach((t, i) => t.addEventListener('click', () => { const max = el.scrollHeight - el.clientHeight; el.scrollTo({ top: C.beats[i].at * max + 2, behavior: 'smooth' }); }));
    } else {
      const go = k => { st.idx = Math.max(0, Math.min(C.beats.length - 1, k)); st.p = C.beats[st.idx].at + .005; draw(); };
      el.querySelector('.rc-prev').addEventListener('click', () => go(st.idx - 1));
      el.querySelector('.rc-next').addEventListener('click', () => go(st.idx + 1));
      el.querySelectorAll('.rc-tick').forEach((t, i) => t.addEventListener('click', () => go(i)));
      go(0);
    }
    el.querySelector('.rc-skip').addEventListener('click', () => close());
    st.onKey = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); } };
    document.addEventListener('keydown', st.onKey, true);
    st.onResize = () => fit(); addEventListener('resize', st.onResize);
    requestAnimationFrame(fit);
    el.querySelector('.rc-skip').focus({ preventScroll: true });
  }
  function close(silent) {
    if (!ui) return; const st = ui; ui = null;
    cancelAnimationFrame(st.raf); if (st.play) cancelAnimationFrame(st.play.raf); if (st.ro) st.ro.disconnect();
    document.removeEventListener('keydown', st.onKey, true); removeEventListener('resize', st.onResize);
    document.documentElement.classList.remove('rc-lock');
    const cv = st.el.querySelector('canvas'); if (cv) cv.width = cv.height = 0;
    st.el.remove();
    if (!silent) { const b = document.querySelector('.rc-open'); if (b) b.focus({ preventScroll: true }); }
  }

  /* ================================================================ DOSSIER HOOK */
  const addButton = () => {
    const d = document.querySelector('.ax-dossier'); if (!d || d.hidden || d.querySelector('.rc-open')) return;
    const id = (d.querySelector('.ax-caseid')?.textContent || '').trim().toLowerCase(); const C = CASES[id]; if (!C) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rc-open';
    b.innerHTML = `<span class="rc-open-ic" aria-hidden="true">▶</span><span><b>Watch the reconstruction</b><small>${C.beats.length} sourced beats · ~25 s · scroll to scrub</small></span>`;
    b.addEventListener('click', () => open(id));
    const anchor = d.querySelector('.ax-fields'); anchor ? anchor.before(b) : d.append(b);
  };
  // SILK: watch only the Atlas (watching the whole page ran this on every Intel scene mount and title frame)
  new MutationObserver(addButton).observe(document.getElementById('atlas-shell') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  window.PSRecon = { open, close, cases: Object.keys(CASES), CASES };
})();
