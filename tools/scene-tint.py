#!/usr/bin/env python3
"""SILK — bake the galactic-region colour shift of the original Intel scenes into CSS variables.

The original scenes were recoloured per region with `filter: hue-rotate() saturate() brightness()` on the
whole animated scene. A filter on an ancestor of running animations has to be re-applied to the entire
scene every frame (and on iOS it can push the scene off the GPU fast path). This tool instead:
  1. replaces every colour literal inside the scene CSS of intel-signal.css with var(--tN, <original>);
  2. writes intel-tint.css: for each region, --tN = the original colour run through exactly the same
     hue-rotate → saturate → brightness matrices Chrome applies (sRGB, verified pixel-exact).
Idempotent: run again after editing scene colours (it first restores the literals from the fallbacks).
Usage: python3 tools/scene-tint.py   (from the repo root)
"""
import math, re, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = ROOT / 'intel-signal.css'
OUT = ROOT / 'intel-tint.css'
JS = ROOT / 'intel-signal.js'

# region table (name, hue, sat, bri) — read from intel-signal.js so the two never drift apart
regions = [(m[0], float(m[1]), float(m[2]), float(m[3])) for m in re.findall(r"\{ name: '([^']+)', code: '[A-Z]+', hue: (-?[\d.]+), sat: ([\d.]+), bri: ([\d.]+)", JS.read_text())]
assert len(regions) == 9, regions

SCENE_TOKENS = ('.ix-scene', '.ix-px', '.ix-stars', '.ix-nebula', '.ix-scanlines', '.ix-hud', '.ix-sotd .ix-core:after')
SCENE_PREFIX = re.compile(r'\.(fx|sx|bx|dx|gx|cx|kx|hx|ox)-')
EXCLUDE = ('.ix-scene-slot', '.ix-panel', '.ix-slide[data-region]')
COLOR = re.compile(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\([^()]*\)')
VAR = re.compile(r'var\(--t(\d+),([^()]*(?:\([^()]*\))?)\)')

def is_scene_selector(sel):
    parts = [p.strip() for p in sel.split(',') if p.strip()]
    return parts and all((any(t in p for t in SCENE_TOKENS) or SCENE_PREFIX.search(p)) and not any(e in p for e in EXCLUDE) for p in parts)

def statements(text):
    """Split CSS into top-level statements: (kind, header, body, start, end)."""
    out, i, n = [], 0, len(text)
    while i < n:
        j = text.find('{', i)
        if j < 0: break
        header = text[i:j]
        depth, k = 1, j + 1
        while depth and k < n:
            if text[k] == '{': depth += 1
            elif text[k] == '}': depth -= 1
            k += 1
        out.append((header.strip(), j + 1, k - 1, i, k))
        i = k
    return out

def parse(col):
    col = col.strip().lower()
    if col.startswith('#'):
        h = col[1:]
        if len(h) in (3, 4): h = ''.join(c * 2 for c in h)
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4)); a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
        return r, g, b, a
    nums = [x.strip() for x in col[col.index('(') + 1:-1].replace('/', ',').split(',')]
    r, g, b = (float(x) for x in nums[:3]); a = float(nums[3]) if len(nums) > 3 else 1
    return r, g, b, a

def matrices(deg, sat):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    H = [[0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928],
         [0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283],
         [0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072]]
    S = [[0.213 + 0.787 * sat, 0.715 - 0.715 * sat, 0.072 - 0.072 * sat],
         [0.213 - 0.213 * sat, 0.715 + 0.285 * sat, 0.072 - 0.072 * sat],
         [0.213 - 0.213 * sat, 0.715 - 0.715 * sat, 0.072 + 0.928 * sat]]
    return H, S

def tint(col, deg, sat, bri):
    r, g, b, a = parse(col)
    v = [r / 255, g / 255, b / 255]
    H, S = matrices(deg, sat)
    cl = lambda x: max(0.0, min(1.0, x))
    v = [cl(sum(H[i][j] * v[j] for j in range(3))) for i in range(3)]
    v = [cl(sum(S[i][j] * v[j] for j in range(3))) for i in range(3)]
    v = [round(cl(x * bri) * 255) for x in v]
    return f'#{v[0]:02x}{v[1]:02x}{v[2]:02x}' if a >= 0.999 else f'rgba({v[0]},{v[1]},{v[2]},{round(a, 3)})'

text = CSS.read_text()
text = VAR.sub(lambda m: m.group(2), text)  # idempotent: restore literals first

stmts = statements(text)
scene_rules = [st for st in stmts if not st[0].startswith('@') and is_scene_selector(st[0])]
anim_names = set()
for h, b0, b1, s0, s1 in scene_rules:
    for m in re.finditer(r'animation(?:-name)?\s*:([^;}]*)', text[b0:b1]):
        anim_names.update(re.findall(r'[A-Za-z_][\w-]*', m.group(1)))
targets = []
for h, b0, b1, s0, s1 in stmts:
    if h.startswith('@keyframes') and h.split()[1] in anim_names: targets.append((b0, b1))
    elif h.startswith('@media'):
        for ih, ib0, ib1, _, _ in statements(text[b0:b1]):
            if is_scene_selector(ih): targets.append((b0 + ib0, b0 + ib1))
    elif not h.startswith('@') and is_scene_selector(h): targets.append((b0, b1))

palette = {}
def swap(body):
    out, last = [], 0
    # leave data: URLs alone
    for m in re.finditer(r'url\((?:"[^"]*"|\'[^\']*\'|[^)]*)\)|' + COLOR.pattern, body):
        tok = m.group(0)
        out.append(body[last:m.start()]); last = m.end()
        if tok.startswith('url('): out.append(tok); continue
        key = tok.replace(' ', '').lower()
        if key not in palette: palette[key] = len(palette)
        out.append(f'var(--t{palette[key]},{tok})')
    out.append(body[last:]); return ''.join(out)

for b0, b1 in sorted(targets, reverse=True):
    text = text[:b0] + swap(text[b0:b1]) + text[b1:]
CSS.write_text(text)

lines = ['/* SILK — generated by tools/scene-tint.py. Each galactic region\'s colour shift for the original Intel',
         '   scenes, baked into variables (replaces a live hue-rotate/saturate/brightness filter on every scene). */']
for k, (name, deg, sat, bri) in enumerate(regions):
    decl = ';'.join(f'--t{i}:{tint(col, deg, sat, bri)}' for col, i in sorted(palette.items(), key=lambda x: x[1]))
    lines.append(f'.ix-slide[data-rk="{k}"] .ix-scene:not(.nx){{{decl}}} /* {name} */')
OUT.write_text('\n'.join(lines) + '\n')
print(f'{len(palette)} scene colours · {len(targets)} rules/keyframes rewritten · {len(regions)} regions → {OUT.name}')
json.dump({'regions': regions}, open('/dev/null', 'w'))
