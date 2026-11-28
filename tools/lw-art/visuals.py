# THE LONG WATCH: VISIONS — builds every entry's visuals (hero first): self-hosted AVIF + WebP at 640/1280 px,
# a 24 px blurred placeholder, licence and credit, and 1–3 hotspots. Writes lw/img/* and long-watch-visuals.js.
# Usage: python3 tools/lw-art/visuals.py <raw dir with meta.json> <renderings dir with hotspots.json> <site root>
import sys, os, json, io, base64
from PIL import Image
RAW, ART, SITE = sys.argv[1:4]
meta = json.load(open(f'{RAW}/meta.json')); art_hs = json.load(open(f'{ART}/hotspots.json'))
OUT = f'{SITE}/lw/img'; os.makedirs(OUT, exist_ok=True)
REND = "ARTIST'S RENDERING — based on the recorded account"

def R(k, x, y, t): return {'x': x, 'y': y, 'text': t}
# real-image entries: key -> (kind, caption, hotspots)
REAL = {
 'valcamonica': ('The rock art', 'Engraved figures on Rock 1 at Naquane, Capo di Ponte, Val Camonica.', [R(0, .46, .46, 'Figures pecked into the glacier-polished sandstone')]),
 'nebra': ('The artefact', 'The Nebra sky disc, c. 1800–1600 BCE (State Museum of Prehistory, Halle).', [R(0, .37, .42, 'A Sun or full Moon in gold'), R(0, .67, .37, 'A crescent Moon'), R(0, .53, .22, 'A tight cluster of stars, usually read as the Pleiades')]),
 'tulli': ('For contrast', 'A genuine ancient Egyptian letter in hieratic script (The Met). No original of the "Tulli Papyrus" has ever been produced.', [R(0, .5, .5, 'A real hieratic document. The "Tulli" text has no original at all')]),
 'ezekiel': ('Period illustration', "Ezekiel's vision of the chariot, engraved by Matthäus Merian for his Icones Biblicae (17th century).", [R(0, .9, .7, '"A wheel in the middle of a wheel" (Ezekiel 1:16)'), R(0, .78, .14, 'Above them, the throne and the glory of God'), R(0, .3, .58, 'The prophet by the river Chebar')]),
 'livy': ('Manuscript', "A 1453 manuscript of Livy's History of Rome (Vatican Library, Vat. lat. 3331; Books 38–39 shown).", [R(0, .5, .45, "Livy's history, copied by hand in 1453. The 218 BCE prodigies are in Book 21")]),
 'obsequens': ('Early printed edition', "Title page of the 1552 Basel edition of Obsequens' Book of Prodigies, with Lycosthenes' supplements.", [R(0, .5, .4, 'The 1552 edition that rescued Obsequens from a single lost manuscript')]),
 'sigiburg': ('Manuscript', 'A 9th-century copy of the Royal Frankish Annals (this page: the entry for 814). Vienna, Cod. 473.', [R(0, .5, .4, 'The Royal Frankish Annals, the court chronicle that records the 776 sign')]),
 'shenkuo': ('Location context', 'Yangzhou today. Shen Kuo placed the "pearl" over the lakes of the Yangzhou region.', [R(0, .5, .5, 'The lakes of the Yangzhou region today')]),
 'azuma': ('Manuscript', 'A page of the Azuma Kagami (Kikkawa manuscript), the chronicle of the Kamakura shogunate.', [R(0, .5, .45, 'The Azuma Kagami, the shogunate chronicle that records the 1235 lights')]),
 'nuremberg': ('Broadsheet', "Hans Glaser's 1561 broadsheet of the sky over Nuremberg (Zentralbibliothek Zürich).", [R(0, .44, .17, 'Spheres, crosses and tubes "fighting" around the Sun'), R(0, .36, .52, 'A great black spear-shaped object'), R(0, .5, .82, "Glaser's printed account, read as a warning from God")]),
 'basel': ('Broadsheet', "Coloured woodcut from Samuel Coccius' 1566 Basel broadsheet (fragment).", [R(0, .3, .1, 'Dark spheres in the dawn sky, some turning red and fiery'), R(0, .6, .75, 'Townspeople watching from the street')]),
 'joseon': ('The record', 'Covers of the Gwanghaegun ilgi, the court record that preserves the 1609 reports (Jeongjoksan copy).', [R(0, .5, .45, "The court record of King Gwanghaegun's reign")]),
 'utsurobune': ('Period illustration', 'An Edo-period illustration of the utsuro-bune and the woman said to have been aboard.', [R(0, .25, .62, 'The round "hollow ship" of wood, glass and iron'), R(0, .86, .55, 'The woman who would not let go of a box'), R(0, .4, .15, 'The account written around the picture')]),
 'airship': ('Newspaper', "The San Francisco Call's drawing of the \"airship\", 22 November 1896.", [R(0, .56, .2, 'The "airship" as the paper drew it'), R(0, .45, .42, 'Its searchlight, a detail in many 1896–97 reports')]),
 'aurora': ('The marker', 'The Texas historical marker at Aurora Cemetery, which mentions the 1897 airship story.', [R(0, .58, .45, 'The marker repeats the legend; historians regard the story as a hoax')]),
 'battlela': ('Press photograph', 'Searchlights converge over Los Angeles, Feb. 1942. The published print was heavily retouched.', [R(0, .34, .22, 'Searchlights converging on the "target" (the print was retouched)'), R(0, .5, .05, 'The Los Angeles Times page, 26 February 1942')]),
 'foo': ('Aircraft type', 'A USAAF night-fighter Beaufighter, 1944 — the kind of aircraft whose crews named the "foo fighters".', [R(0, .5, .45, 'A Beaufighter like those flown by U.S. night-fighter crews in 1944')]),
 'foo_doc': ('Official document', 'The 1953 Robertson Panel report, which reviewed the wartime "foo fighter" reports among others.', [R(0, .5, .3, 'The CIA-sponsored panel that reviewed UFO reports, including the foo fighters')]),
 'ghostrockets': ('Case photograph', 'Swedish Air Force officer Karl-Gösta Bartoll searching Lake Kölmjärv for a "ghost rocket", July 1946.', [R(0, .6, .55, 'Searching the lake where a "rocket" was seen to fall'), R(0, .3, .25, 'Lake Kölmjärv: nothing was ever found')]),
 'arnold': ('Official document', "A page from Kenneth Arnold's Army Air Forces report file.", [R(0, .28, .62, "Arnold's own sketch of one of the objects"), R(0, .45, .2, 'His typed account to the Army Air Forces')]),
 'roswell': ('Newspaper', 'The Roswell Daily Record, 8 July 1947: "RAAF Captures Flying Saucer".', [R(0, .56, .2, 'The headline, the day before the Army said it was a weather balloon')]),
 'dc1952': ('Location context', 'Washington National Airport, whose radar tracked the 1952 targets (1944 photo).', [R(0, .5, .5, 'Washington National Airport, home of the radar that tracked the targets')]),
 'levelland': ('Official document', 'Project Blue Book case file for Levelland, Texas, November 1957 (first page).', [R(0, .5, .32, 'The Blue Book record card for the Levelland reports'), R(0, .5, .42, 'Its conclusion: ball lightning, still disputed')]),
 'hill_doc': ('Official document', 'Project Blue Book case file for a sighting near Lincoln, New Hampshire, September 1961 (first page).', [R(0, .5, .35, 'A Blue Book record card from the White Mountains, September 1961')]),
 'socorro': ('Official document', 'First page of the Project Blue Book case file for Socorro, April 1964.', [R(0, .58, .46, 'Blue Book record card: the case was listed as unidentified')]),
 'deception': ('Location context', 'Whalers Bay, Deception Island, Antarctica.', [R(0, .5, .5, 'Deception Island, site of Argentine and Chilean bases in 1965')]),
 'exeter': ('Official document', 'First page of the Project Blue Book case file for Exeter, September 1965.', [R(0, .62, .42, 'Blue Book record card for the Exeter reports')]),
 'malmstrom': ('Equipment', 'A Minuteman missile launch control console of the kind at the center of the claims.', [R(0, .5, .45, 'A Minuteman launch control console, like those in the Echo Flight capsule')]),
 'shag': ('Official document', 'An RCMP "UFO" file from the same night, 4 October 1967 (a sighting near Sambro, Nova Scotia).', [R(0, .5, .3, 'An RCMP report from the same night along the Nova Scotia coast')]),
 'tehran': ('Official document', "The U.S. Air Force write-up of the 1976 Tehran intercept (page 1), by Capt. Henry S. Shields.", [R(0, .42, .04, 'The Air Force account of the night of 18–19 September 1976'), R(0, .5, .5, 'Two F-4 jets scrambled; instruments and radios reported failing')]),
 'tehran_f4': ('Aircraft type', 'An Imperial Iranian Air Force F-4 Phantom II, the type scrambled in 1976 (photo 1974).', [R(0, .5, .5, 'An Iranian F-4 Phantom II, the type flown that night')]),
 'colares': ('Location context', 'The shore at Colares on Marajó Bay, the spot of observation record 4 in the Air Force (I COMAR) UFO records.', [R(0, .5, .5, 'Marajó Bay, where Air Force observers logged sightings')]),
 'valentich': ('Official document', 'Australian Department of Transport accident investigation summary for the Valentich disappearance (page 1).', [R(0, .5, .05, 'The official aircraft accident investigation summary'), R(0, .45, .88, 'Its record of his last radio exchanges with Melbourne')]),
 'valentich_place': ('Location context', 'Cape Otway lighthouse, Victoria: Valentich passed here before crossing Bass Strait.', [R(0, .5, .45, 'Cape Otway, his last landmark before Bass Strait')]),
 'rendlesham': ('Location context', 'The eastern edge of Rendlesham Forest, Suffolk, near the reported landing site.', [R(0, .5, .6, 'The forest edge near the reported landing site')]),
 'hessdalen': ('Location context', 'The Hessdalen valley in winter, from the Norwegian National Archives.', [R(0, .5, .45, 'Hessdalen, a remote farming valley in central Norway')]),
 'jal1628': ('Official document', 'FAA records: the plotted flight path of JAL 1628 over Alaska, from the agency\'s investigation file (U.S. National Archives).', [R(0, .55, .55, 'The flight path the FAA plotted from radar and crew reports'), R(0, .73, .18, 'Annotations added during the FAA investigation')]),
 'jal_747': ('Aircraft type', 'A JAL Boeing 747 freighter of the type flown on Flight 1628.', [R(0, .5, .5, 'A Boeing 747 freighter like JAL 1628')]),
 'belgium': ('Location context', 'Eupen, Belgium, where the wave of reports began on 29 November 1989.', [R(0, .5, .5, 'Eupen, where the first reports came in')]),
 'ariel': ('Location context', 'Zimbabwe from the International Space Station (Expedition 6).', [R(0, .5, .5, 'Zimbabwe from orbit; Ruwa lies just east of Harare')]),
 'varginha': ('Location context', "Varginha's flying-saucer water tower, a monument to the 1996 story.", [R(0, .5, .3, "The town's saucer-shaped water tower, built after the story")]),
 'phoenix': ('Location context', 'Phoenix at night from South Mountain.', [R(0, .5, .6, 'The Phoenix valley, where thousands looked up on 13 March 1997')]),
 'nimitz': ('Official video still', 'A frame from the Navy\'s "FLIR1" video (2004), officially released by the Department of Defense in 2020.', [R(0, .46, .4, 'The object the targeting pod locked onto')]),
 'ohare': ('Location context', "Concourse C of Terminal 1 at O'Hare, the United Airlines concourse.", [R(0, .5, .5, 'Concourse C, where the disc was reported')]),
 'aatip': ('Official video still', 'A frame from the Navy\'s "GIMBAL" video (2015), first published with the 2017 reporting.', [R(0, .47, .48, 'The object in the "GIMBAL" infrared video')]),
 'odni': ('Official document', 'Cover of the ODNI Preliminary Assessment on Unidentified Aerial Phenomena, 25 June 2021.', [R(0, .5, .47, 'The nine-page assessment: 143 of 144 reports unexplained')]),
 'aaro': ('Official document', "Cover of AARO's Historical Record Report, Volume I (2024).", [R(0, .5, .62, 'The review of U.S. government UAP records since 1945')]),
 'pursue': ('Released file', 'A NASA record from the 2026 PURSUE releases: file NASA-UAP-D3, a Gemini 7 transcript (1965).', [R(0, .5, .35, 'A Gemini 7 air-to-ground transcript, one of the released files')]),
}
# per entry, hero first. 'r:' = original rendering, else a real key above.
PLAN = {
 'valcamonica': ['valcamonica'], 'nebra': ['nebra'], 'tulli': ['r:tulli', 'tulli'], 'ezekiel': ['ezekiel'], 'livy': ['r:livy', 'livy'],
 'obsequens': ['r:obsequens', 'obsequens'], 'sigiburg': ['r:sigiburg', 'sigiburg'], 'shenkuo': ['r:shenkuo', 'shenkuo'], 'azuma': ['r:azuma', 'azuma'],
 'nuremberg': ['nuremberg'], 'basel': ['basel'], 'joseon': ['r:joseon', 'joseon'], 'winthrop': ['r:winthrop'], 'utsurobune': ['utsurobune'],
 'airship': ['airship'], 'aurora': ['aurora'], 'battlela': ['battlela'], 'foo': ['r:foo', 'foo', 'foo_doc'], 'ghostrockets': ['ghostrockets'],
 'arnold': ['arnold'], 'roswell': ['roswell'], 'dc1952': ['r:dc1952', 'dc1952'], 'levelland': ['levelland', 'r:levelland'], 'hill': ['r:hill', 'hill_doc'],
 'socorro': ['socorro'], 'deception': ['r:deception', 'deception'], 'exeter': ['exeter'], 'westall': ['r:westall'], 'malmstrom': ['r:malmstrom', 'malmstrom'],
 'shag': ['r:shag', 'shag'], 'tehran': ['tehran', 'r:tehran', 'tehran_f4'], 'colares': ['r:colares', 'colares'], 'valentich': ['valentich', 'r:valentich', 'valentich_place'],
 'rendlesham': ['r:rendlesham', 'rendlesham'], 'hessdalen': ['r:hessdalen', 'hessdalen'], 'jal1628': ['jal1628', 'jal_747'], 'belgium': ['r:belgium', 'belgium'],
 'ariel': ['r:ariel', 'ariel'], 'varginha': ['r:varginha', 'varginha'], 'phoenix': ['r:phoenix', 'phoenix'], 'nimitz': ['nimitz'], 'ohare': ['r:ohare', 'ohare'],
 'aatip': ['aatip'], 'odni': ['odni'], 'hearing': ['r:hearing'], 'aaro': ['aaro'], 'pursue': ['pursue'],
}
RCAP = {k: v for k, v in {
 'tulli': 'Circles of fire over an army, as the 1953 "Tulli" text describes. The text is a hoax: no original exists.',
 'livy': 'Phantom ships shining in the sky over Rome, as listed among the prodigies of 218 BCE.',
 'obsequens': 'A shield-like orb crossing the sunset sky west to east, and a blazing torch falling at Tarquinii.',
 'sigiburg': 'Two shields red with flame over the church at Sigiburg, as the Royal Frankish Annals tell it.',
 'shenkuo': "The luminous 'pearl' over the lake near Yangzhou, opening and flooding the shore with light.",
 'azuma': 'Lights swinging and circling in the southwest sky over Kamakura, 1235.',
 'joseon': 'A bright object like a washbasin, with a trail and a thunder-like noise, over Gangwon province.',
 'winthrop': 'A great light over the Muddy River, darting toward Charlestown, and the boat of three witnesses.',
 'foo': 'Glowing balls of light pacing an Allied night fighter, as aircrews reported in 1944–45.',
 'dc1952': 'Radar targets and lights over Washington, July 1952.', 'levelland': 'A glowing egg-shaped object on a Texas highway, and a stalled car.',
 'hill': 'A light following a car through the White Mountains, September 1961.', 'deception': 'A lens-shaped, colour-changing object over the Antarctic bases.',
 'westall': 'A grey saucer-shaped object descending beyond the Westall school fields, with light aircraft nearby.',
 'malmstrom': "The red glowing object later described in Robert Salas's account, over a Minuteman launch facility.",
 'shag': 'A row of lights descending into the sea off Shag Harbour, and the foam rescuers found.',
 'tehran': 'An F-4 closing on a brilliant flashing object over Tehran, and the smaller light crews reported.',
 'colares': 'A light shining a beam down on a fishing village on Marajó Bay.', 'valentich': "A lit object orbiting above Valentich's Cessna over Bass Strait.",
 'rendlesham': 'Lights among the pines of Rendlesham Forest, with the Orford Ness lighthouse on the horizon.', 'hessdalen': 'A bright light hovering above the Hessdalen valley.',
 'belgium': 'A silent triangle with corner lights over a Belgian town, and F-16s scrambled.', 'ariel': 'A silvery craft beyond the Ariel School playground, as pupils described.',
 'varginha': 'The crouching figure described by three young women in Varginha.', 'phoenix': 'The V-shaped formation, and the later row of orbs over the mountains.',
 'ohare': "A grey disc over Gate C17 at O'Hare, beneath a hole in the overcast.", 'hearing': 'The House Oversight hearing room: the dais and the witness table.',
}.items()}
ERA_OF = {}
def enc(img, base, label):
    w0, h0 = img.size; out = {}
    for w in (640, 1280):
        if w > w0 and w != 640: continue
        ww = min(w, w0); im = img.resize((ww, round(h0 * ww / w0)), Image.LANCZOS) if ww != w0 else img
        im.save(f'{OUT}/{base}-{w}.avif', 'AVIF', quality=58, speed=6, subsampling='4:2:0', icc_profile=None); im.save(f'{OUT}/{base}-{w}.webp', 'WEBP', quality=80, method=5)
        out[w] = ww
    t = img.resize((24, max(1, round(h0 * 24 / w0))), Image.LANCZOS); b = io.BytesIO(); t.save(b, 'WEBP', quality=40)
    return {'w': w0, 'h': h0, 'sizes': sorted(out), 'lqip': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()}
def load(path):
    im = Image.open(path); im = im.convert('RGB'); im.info.pop('icc_profile', None)  # a grayscale ICC on RGB AVIF makes Chrome reject the file
    if im.width > 1600: im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    return im
raws = {os.path.splitext(f)[0]: f for f in os.listdir(RAW) if f != 'meta.json'}
V = {}; table = []
for ev, items in PLAN.items():
    out = []
    for it in items:
        if it.startswith('r:'):
            k = it[2:]; info = enc(load(f'{ART}/{k}.png'), 'r-' + k, k)
            out.append({'key': 'r-' + k, 'real': False, 'kind': "Artist's rendering", 'caption': RCAP[k], 'credit': 'Original artwork for Project Signal', 'license': 'Original artwork', 'page': None, 'label': REND if k != 'tulli' else "ARTIST'S RENDERING — of a text that is a hoax", 'hotspots': art_hs[k], **info})
        else:
            m = meta[it]; kind, cap, hs = REAL[it]; info = enc(load(f'{RAW}/{raws[it]}'), it, it)
            artist = m['artist'] or 'Unknown author'
            for junk in ['Unknown authorUnknown author', 'AnonymousUnknown author']: artist = artist.replace(junk, 'Unknown author')
            out.append({'key': it, 'real': True, 'kind': kind, 'caption': cap, 'credit': artist, 'license': m['license'] or 'Public domain', 'licenseUrl': m.get('licenseUrl') or None, 'page': m['page'], 'hotspots': hs, **info})
        table.append((ev, out[-1]['key'], 'hero' if len(out) == 1 else 'secondary', 'real' if out[-1]['real'] else 'rendering', out[-1]['credit'], out[-1]['license'], out[-1]['page'] or 'original'))
    V[ev] = out
js = "/* PROJECT SIGNAL — THE LONG WATCH: VISIONS. Every entry's visuals, hero first. Generated by tools/lw-art/visuals.py — do not hand-edit.\n   Real images: Wikimedia Commons, licence as stated, resized and re-encoded (AVIF/WebP) for this site.\n   Renderings: original artwork, permanently labelled as artist's renderings. */\nwindow.LW_VISUALS=" + json.dumps(V, ensure_ascii=False, separators=(',', ':')) + ";\n"
open(f'{SITE}/long-watch-visuals.js', 'w', encoding='utf-8').write(js)
json.dump(table, open(f'{ART}/table.json', 'w'), ensure_ascii=False, indent=0)
print(len(V), 'entries', sum(len(v) for v in V.values()), 'visuals', len(js) // 1024, 'KB js')
