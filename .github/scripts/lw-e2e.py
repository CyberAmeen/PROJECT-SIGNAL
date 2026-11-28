# THE LONG WATCH — end-to-end checks: frame timing (4x CPU throttle, iPhone size + desktop), heap/DOM before and
# after the full journey and back, reduced motion, image availability, console errors, and journey recordings.
import sys, os, time, json, threading, http.server, socketserver, statistics, subprocess
from playwright.sync_api import sync_playwright
ROOT = sys.argv[1]; OUT = sys.argv[2]; OFFLINE = len(sys.argv) > 3 and sys.argv[3] == 'offline'
os.makedirs(OUT, exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 8795), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:8795/index.html?hubq=1'
R = {'errors': [], 'perf': {}, 'memory': {}, 'images': {}, 'reduced': {}, 'checks': {}}
CHROME = '/usr/bin/google-chrome'
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc']

def new(b, W, H, rm=False, video=None):
    mob = W < 700
    kw = dict(viewport={'width': W, 'height': H}, device_scale_factor=3 if mob else 1, is_mobile=mob, has_touch=mob, reduced_motion='reduce' if rm else 'no-preference')
    if video: kw.update(record_video_dir=video, record_video_size={'width': W, 'height': H})
    ctx = b.new_context(**kw); pg = ctx.new_page()
    tag = f'{W}x{H}{" rm" if rm else ""}'
    pg.on('pageerror', lambda e: R['errors'].append(f'[{tag}] pageerror: {e}'))
    pg.on('console', lambda m: R['errors'].append(f'[{tag}] console.{m.type}: {m.text}') if m.type == 'error' and 'net::ERR' not in m.text and 'Failed to load resource' not in m.text else None)
    if OFFLINE: pg.route(lambda u: not u.startswith('http://127.0.0.1'), lambda r: r.abort())
    else: pg.route(lambda u: ('sentinel' in u and 'workers.dev' in u), lambda r: r.abort())  # no live data needed
    return ctx, pg

def boot(pg):
    pg.goto(BASE); time.sleep(1.2)
    pg.evaluate("document.querySelector('#power-gate .pg-silent')?.click()"); time.sleep(4.2)

def metrics(cdp):
    cdp.send('HeapProfiler.collectGarbage'); time.sleep(.3); cdp.send('HeapProfiler.collectGarbage'); time.sleep(.3)
    m = {x['name']: x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
    return {'jsHeapMB': round(m['JSHeapUsedSize'] / 1048576, 2), 'nodes': int(m['Nodes']), 'listeners': int(m.get('JSEventListeners', 0))}

FRAME_JS = """window.__fr=[];window.__loaf=[];(function f(t){window.__fr.push(t);window.__frid=requestAnimationFrame(f)})(performance.now());
try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__loaf.push(e.duration)}).observe({type:'long-animation-frame',buffered:false})}catch(e){}"""
# constant-speed driver; it tracks its own position so the harness never forces a layout by reading scrollTop
DRIVE_JS = """(v)=>new Promise(res=>{const s=document.querySelector('.lw-scroll');let last=0,y=s.scrollTop;const max=s.scrollHeight-s.clientHeight;
  (function step(t){if(!last)last=t;const dt=t-last;last=t;y=Math.min(max,y+v*dt/1000);s.scrollTop=y;if(y>=max-1)return res(y);requestAnimationFrame(step)})(performance.now())})"""

def frame_stats(pg):
    fr = pg.evaluate("cancelAnimationFrame(window.__frid),window.__fr"); loaf = pg.evaluate("window.__loaf")
    d = [b - a for a, b in zip(fr, fr[1:])][5:]
    if not d: return {}
    d.sort(); q = lambda p: round(d[min(len(d) - 1, int(p * len(d)))], 2)
    return {'frames': len(d), 'p50': q(.5), 'p95': q(.95), 'p99': q(.99), 'max': round(d[-1], 1), 'over16_7': round(100 * sum(x > 16.9 for x in d) / len(d), 1), 'over33': round(100 * sum(x > 33.4 for x in d) / len(d), 1), 'longAnimFrames>50ms': sum(x > 50 for x in loaf)}

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=ARGS)
    for name, W, H, thr in [('iphone15', 393, 852, 4), ('desktop', 1440, 900, 1)]:
        ctx, pg = new(b, W, H); cdp = ctx.new_cdp_session(pg); cdp.send('Performance.enable')
        boot(pg)
        R['memory'][name] = {'hubBeforeOpen': metrics(cdp)}
        # hub layout: all portals identical
        R['checks'][name + '_portals'] = pg.evaluate("[...document.querySelectorAll('.bridge-console .ps-portal')].map(b=>{const r=b.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})")
        R['checks'][name + '_notice'] = pg.evaluate("document.getElementById('notice').textContent+' | '+document.getElementById('last').textContent")
        if thr > 1: cdp.send('Emulation.setCPUThrottlingRate', {'rate': thr})
        # entrance (first time this session = full descent)
        pg.evaluate("document.getElementById('lw-launch').scrollIntoView({block:'center'})"); time.sleep(.4)
        pg.evaluate(FRAME_JS); pg.click('#lw-launch'); time.sleep(7.5)
        R['perf'][name + '_entrance'] = frame_stats(pg)
        time.sleep(.5); R['memory'][name]['afterOpen'] = metrics(cdp)
        # journey: constant-speed scroll through all eras to the finale
        pg.evaluate(FRAME_JS); pg.evaluate(DRIVE_JS, 1400 if W < 700 else 1800); time.sleep(1.5)
        R['perf'][name + '_journey'] = frame_stats(pg)
        R['checks'][name + '_endState'] = pg.evaluate("LongWatch._debug()")
        R['checks'][name + '_stat'] = pg.evaluate("document.querySelector('.lw-stat').textContent")
        # threads + sheet
        pg.evaluate("document.querySelector('.lw-scroll').scrollTo(0,0)"); time.sleep(1)
        pg.click('.lw-thr'); pg.click('.lw-chip[data-m="military"]'); time.sleep(.5)
        pg.evaluate(FRAME_JS); pg.evaluate(DRIVE_JS, 2400); R['perf'][name + '_threadsScroll'] = frame_stats(pg)
        pg.click('.lw-threadbar button'); time.sleep(.3)
        pg.evaluate("document.querySelector('.lw-card[data-i=\"20\"]').scrollIntoView({block:'center'})"); time.sleep(.8)
        pg.click('.lw-card[data-i="20"]'); time.sleep(1.2)
        R['checks'][name + '_sheet'] = pg.evaluate("[document.querySelector('#lw-sheet-title').textContent, document.querySelectorAll('.lw-sheet ul.src a').length, !!document.querySelector('.lw-atlas')]")
        pg.screenshot(path=f'{OUT}/{name}-sheet.png'); pg.keyboard.press('Escape'); time.sleep(.6)
        # back to the hub, then measure
        pg.keyboard.press('Escape'); time.sleep(2.2)
        R['memory'][name]['afterJourneyAndBack'] = metrics(cdp)
        # second round trip (should not grow)
        pg.click('#lw-launch'); time.sleep(2.5); pg.evaluate(DRIVE_JS, 3000); time.sleep(1); pg.keyboard.press('Escape'); time.sleep(2.2)
        R['memory'][name]['afterSecondRoundTrip'] = metrics(cdp)
        R['checks'][name + '_closed'] = pg.evaluate("[LongWatch.isOpen, document.body.className, location.hash]")
        # Atlas hand-off: Roswell (record 20) → dossier ps-020
        if thr > 1: cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
        pg.click('#lw-launch'); time.sleep(2.5)
        pg.evaluate("document.querySelector('.lw-card[data-i=\"20\"]').scrollIntoView({block:'center'})"); time.sleep(.6)
        pg.click('.lw-card[data-i="20"]'); time.sleep(1); pg.click('.lw-atlas'); time.sleep(3.5)
        R['checks'][name + '_atlasHandoff'] = pg.evaluate("[!document.getElementById('atlas-shell').hidden, !!document.querySelector('.ax-dossier:not([hidden])'), (document.querySelector('#ax-dossier-title')||{}).textContent]")
        pg.screenshot(path=f'{OUT}/{name}-atlas-handoff.png')
        ctx.close()
    # reduced motion
    ctx, pg = new(b, 393, 852, rm=True); boot(pg)
    pg.evaluate("document.getElementById('lw-launch').scrollIntoView({block:'center'})"); pg.click('#lw-launch'); time.sleep(1.4)
    R['reduced'] = pg.evaluate("({open:LongWatch.isOpen, entranceGone:!document.querySelector('.lw-entrance:not(.out)'), visibleCards:[...document.querySelectorAll('.lw-item')].filter(e=>getComputedStyle(e).opacity==='1').length, ambientCanvas:document.querySelector('.lw-amb').width})")
    pg.screenshot(path=f'{OUT}/reduced-open.png')
    pg.evaluate("document.querySelector('.lw-scroll').scrollTo(0,document.querySelector('.lw-era[data-era=bluebook]').offsetTop)"); time.sleep(.6); pg.screenshot(path=f'{OUT}/reduced-bluebook.png')
    ctx.close()
    # images: every Long Watch image (card thumb + full) must load
    if not OFFLINE:
        ctx, pg = new(b, 1280, 800); boot(pg)
        pg.click('#lw-launch'); time.sleep(7.5)
        R['images'] = pg.evaluate("""async()=>{const D=window.LW_DATA,urls=[];for(const e of D.events){let im=e.image;if(!im&&e.atlas&&window.__atlas){const a=window.__atlas.archive.find(r=>r.id===e.atlas);if(a&&a.image)im={src:a.image.thumb,full:a.image.full}}if(im){urls.push([e.id,'src',im.src]);urls.push([e.id,'full',im.full])}}
          const res=await Promise.all(urls.map(([id,k,u])=>new Promise(r=>{const i=new Image();i.referrerPolicy='no-referrer';const t=setTimeout(()=>r([id,k,u,'timeout']),25000);i.onload=()=>{clearTimeout(t);r([id,k,u,i.naturalWidth])};i.onerror=()=>{clearTimeout(t);r([id,k,u,'error'])};i.src=u})));
          return {total:res.length, ok:res.filter(x=>typeof x[3]==='number').length, failed:res.filter(x=>typeof x[3]!=='number'), withImage:D.events.filter(e=>e.image||e.img==='atlas').length}}""")
        ctx.close()
    # recordings: the whole journey, entrance → eras → ending → hub
    for name, W, H, v in [('iphone', 393, 852, 520), ('desktop', 1440, 900, 700)]:
        vd = f'{OUT}/vid-{name}'; ctx, pg = new(b, W, H, video=vd); boot(pg)
        pg.evaluate("document.getElementById('lw-launch').scrollIntoView({block:'center',behavior:'smooth'})"); time.sleep(1.2)
        pg.click('#lw-launch'); time.sleep(7.2)
        # cruise through time, pausing to open one record in an early and a modern era
        pg.evaluate(DRIVE_JS.replace('if(y>=max-1)', 'if(y>=Math.min(max,document.querySelector(".lw-card[data-i=\\"3\\"]").getBoundingClientRect().top+y-s.clientHeight*.3))'), v); time.sleep(.6)
        pg.click('.lw-card[data-i="3"]'); time.sleep(3.2); pg.evaluate("document.querySelector('.lw-sheet-body').scrollBy({top:420,behavior:'smooth'})"); time.sleep(2); pg.keyboard.press('Escape'); time.sleep(1)
        pg.click('.lw-thr'); time.sleep(.8); pg.click('.lw-chip[data-m="disc"]'); time.sleep(3.2); pg.click('.lw-threadbar button'); time.sleep(.6)
        pg.evaluate(DRIVE_JS, v); time.sleep(9)
        pg.click('.lw-return'); time.sleep(3.5)
        ctx.close()
        webm = [f for f in os.listdir(vd) if f.endswith('.webm')][0]
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{vd}/{webm}', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f'{OUT}/long-watch-{name}.mp4'])
    b.close()
srv.shutdown()
json.dump(R, open(f'{OUT}/lw-results.json', 'w'), indent=1)
print(json.dumps(R, indent=1)[:6000])
