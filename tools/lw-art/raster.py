# Rasterise each SVG scene in Chrome at 1600x1000 (fonts: the site's Oxanium if present, else a sans fallback).
import sys, os, glob
from playwright.sync_api import sync_playwright
d = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1600, 'height': 1000})
    for f in sorted(glob.glob(f'{d}/*.svg')):
        if len(sys.argv) > 2 and not any(os.path.basename(f).startswith(k + '.') for k in sys.argv[2].split(',')): continue
        pg.set_content(f"<html><body style='margin:0;background:#000'>{open(f).read()}</body></html>"); pg.wait_for_timeout(150)
        pg.screenshot(path=f[:-4] + '.png', clip={'x': 0, 'y': 0, 'width': 1600, 'height': 1000})
    b.close()
