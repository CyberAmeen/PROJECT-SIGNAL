# Rasterise diorama layers (2400×1000, transparent except the sky) and encode WebP at 2400 and 1200 wide.
# usage: python3 tools/lw-art/raster-dio.py <svg dir> <out dir>
import sys, os, glob
from PIL import Image
from playwright.sync_api import sync_playwright
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 2400, 'height': 1000})
    for f in sorted(glob.glob(f'{src}/*.svg')):
        pg.set_content(f"<html><body style='margin:0;background:transparent'>{open(f).read()}</body></html>"); pg.wait_for_timeout(120)
        png = f[:-4] + '.png'; pg.screenshot(path=png, omit_background=True, clip={'x': 0, 'y': 0, 'width': 2400, 'height': 1000})
        im = Image.open(png).convert('RGBA'); name = os.path.basename(f)[:-4]
        sky = name.endswith('-0')
        if sky: im = im.convert('RGB')
        else:  # crop the empty top: layers are bottom-anchored strips; keep the crop height in the name-independent manifest
            bb = im.getbbox(); top = max(0, (bb[1] if bb else 0) - 8); im = im.crop((0, top, 2400, 1000))
        for w in (2400, 1200):
            r = im if w == 2400 else im.resize((w, round(im.height * w / 2400)), Image.LANCZOS)
            r.save(f'{dst}/{name}-{w}.webp', 'WEBP', quality=80 if sky else 82, method=6, **({} if sky else {'exact': False}))
        print(name, im.size, os.path.getsize(f'{dst}/{name}-2400.webp') // 1024, 'KB')
    b.close()
