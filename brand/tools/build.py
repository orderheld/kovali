"""Build all KOVALI logo files for the three directions.

Usage (from the repository root, after `npm install`):
    python3 -m pip install fonttools
    python3 brand/tools/build.py

Writes brand/directions/<direction>/kovali-*.svg, copies the active direction
(site.ts: logoDirection) to public/brand/ and regenerates
src/components/brand/logo-data.ts for the inline header/footer logo.
"""
import json
import math
import os
import sys

from directions import DIRECTIONS, NAVY, CORP, ELEC, WHITE, Signature, Tech, Minimal
from geo import poly, rrect, n

O_MAX = 1.8  # max overshoot of the custom capitals


def _paths_svg(paths, grad_id=None):
    out = []
    for fill, d in paths:
        out.append(f'<path fill="{fill}" d="{d}"/>')
    return "".join(out)


def _svg(body, w, h, title, defs="", root_fill=None):
    title = title.replace("&", "&amp;")
    w, h = math.ceil(w - 0.01), math.ceil(h - 0.01)
    fill = f' fill="{root_fill}"' if root_fill else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n(w)} {n(h)}" '
            f'width="{n(w)}" height="{n(h)}" role="img" aria-label="{title}"{fill}>'
            f'<title>{title}</title>{defs}{body}</svg>\n')


def _mono(paths):
    return "".join(f'<path d="{d}"/>' for _f, d in paths)


def _with_grad(direction, paths, pal, prefix):
    """Tech direction: optional gradient on the central facet."""
    if not (isinstance(direction, Tech) and pal.get("grad")):
        return paths, ""
    gid = f"{prefix}-g"
    out = []
    for fill, d in paths:
        if fill == pal["f3"]:
            out.append((f"url(#{gid})", d))
        else:
            out.append((fill, d))
    return out, gid


def grad_defs(gid, bbox):
    x, y, w, h = bbox
    return (f'<defs><linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{n(x + w * 0.4)}" '
            f'y1="{n(y + h * 0.5)}" x2="{n(x + w)}" y2="{n(y)}"><stop offset="0" stop-color="{CORP}"/>'
            f'<stop offset="1" stop-color="{ELEC}"/></linearGradient></defs>')


def minimal_horizontal(D, pal, descriptor=True):
    from geo import Font
    comp, ww = D.wordmark()
    pad = O_MAX
    paths = D.wordmark_paths(0, pad, pal)
    if not descriptor:
        return paths, ww, 100 + 2 * pad, (0, 0, ww, 100)
    f = Font(D.font)
    cap = 15.0
    size = cap / f.cap * f.upm
    tr = size * 0.24
    rx = ww + 46
    paths.append((pal["desc"], poly([(rx, pad + 4), (rx + 1.6, pad + 4), (rx + 1.6, pad + 96), (rx, pad + 96)])))
    tx = rx + 1.6 + 46
    l1, l2 = "BUSINESS & TECHNOLOGY", "CONSULTING"
    lo1, hi1 = f.bounds(l1, size, tr)
    lo2, hi2 = f.bounds(l2, size, tr)
    # two lines, vertically centred on the cap height of the wordmark
    gap = 20.0
    top = pad + 50 - (2 * cap + gap) / 2
    paths.append((pal["desc"], f.path(l1, size, tr, tx - lo1, top + cap)))
    paths.append((pal["desc"], f.path(l2, size, tr, tx - lo2, top + 2 * cap + gap)))
    W = tx + max(hi1 - lo1, hi2 - lo2)
    return paths, W, 100 + 2 * pad, (0, 0, W, 100)


def lockup_horizontal(D, pal, descriptor=True):
    if isinstance(D, Minimal):
        return minimal_horizontal(D, pal, descriptor)
    comp, ww = D.wordmark()
    if descriptor:
        sym = 100 + D.desc_gap + D.desc_cap
    else:
        sym = 116
    gap = sym * (0.36 if descriptor else 0.40)
    pad = O_MAX
    sx, sy = 0, pad
    word_y = pad + (0 if descriptor else (sym - 100) / 2)
    wx = sym + gap
    paths = D.symbol(sx, sy, sym, pal)
    paths += D.wordmark_paths(wx, word_y, pal)
    if descriptor:
        paths += D.descriptor(wx, word_y + 100 + D.desc_gap, ww, pal)
    W = wx + ww
    Hh = sym + 2 * pad
    return paths, W, Hh, (sx, sy, sym, sym)


def lockup_stacked(D, pal, descriptor=True):
    comp, ww = D.wordmark()
    if isinstance(D, Minimal):
        pad = O_MAX
        paths = D.wordmark_paths(0, pad, pal)
        paths += D.descriptor(0, pad + 100 + D.desc_gap, ww, pal)
        return paths, ww, pad + 100 + D.desc_gap + D.desc_cap + pad, (0, 0, ww, 100)
    sym = 150
    gap = 54
    pad = O_MAX
    W = max(ww, sym)
    sx = (W - sym) / 2
    paths = D.symbol(sx, pad, sym, pal)
    word_y = pad + sym + gap
    wx = (W - ww) / 2
    paths += D.wordmark_paths(wx, word_y, pal)
    Hh = word_y + 100 + pad
    if descriptor:
        paths += D.descriptor(wx, word_y + 100 + D.desc_gap, ww, pal)
        Hh = word_y + 100 + D.desc_gap + D.desc_cap + pad
    return paths, W, Hh, (sx, pad, sym, sym)


def wordmark_only(D, pal):
    comp, ww = D.wordmark()
    paths = D.wordmark_paths(0, O_MAX, pal)
    return paths, ww, 100 + 2 * O_MAX


def favicon(D):
    """Simplified favicon on a 32 x 32 tile."""
    tile = rrect(0, 0, 32, 32, 7)
    if isinstance(D, Signature):
        # pixel-aligned at 16 px: stem 2 px, gaps 1 px
        stem, g, top, bot, left, right = 4, 2, 6, 26, 7, 25
        x0 = left + stem + g
        mid = (top + bot) / 2
        yb = mid - g / 2
        rise = yb - top
        a = 5.0
        for _ in range(50):
            a = 4.4 * math.hypot(rise, (right - a) - x0) / rise
        p = [
            (NAVY, tile),
            (WHITE, poly([(left, top), (left + stem, top), (left + stem, bot), (left, bot)])),
            (ELEC, poly([(x0, yb), (x0 + a, yb), (right, top), (right - a, top)])),
            ("#8FCBFF", poly([(x0, bot - (yb - top)), (right - a, bot), (right, bot), (x0 + a, bot - (yb - top))])),
        ]
        return p, ""
    if isinstance(D, Tech):
        pal = dict(f1=NAVY, f2=CORP, f3=ELEC, f4=CORP)
        return D.symbol(0, 0, 32, pal, c=9, r=22, xs=30), ""
    # Minimal
    pal = dict(stroke=WHITE, node=ELEC)
    inner = D._node_k(7, 7, 18, s=16, node=30, gap=10, right=100, pal=pal)
    return [(NAVY, tile)] + inner, ""


def write_direction(D, out):
    os.makedirs(out, exist_ok=True)
    files = {}
    title = "KOVALI – Business & Technology Consulting"

    def emit(name, paths, W, Hh, pal=None, bbox=None, mono=False, ttl=title):
        defs = ""
        if pal is not None and bbox is not None:
            paths, gid = _with_grad(D, paths, pal, f"kv-{D.key}-{name.split('.')[0]}")
            if gid:
                defs = grad_defs(gid, bbox)
        body = _mono(paths) if mono else _paths_svg(paths)
        svg = _svg(body, W, Hh, ttl, defs, root_fill=NAVY if mono else None)
        with open(os.path.join(out, name), "w") as fh:
            fh.write(svg)
        files[name] = dict(w=W, h=Hh)

    p, W, Hh, bb = lockup_stacked(D, D.light)
    emit("kovali-logo.svg", p, W, Hh, D.light, bb)
    p, W, Hh, bb = lockup_stacked(D, D.dark)
    emit("kovali-logo-dark.svg", p, W, Hh, D.dark, bb)
    p, W, Hh, bb = lockup_stacked(D, D.mono)
    emit("kovali-logo-monochrome.svg", p, W, Hh, mono=True)
    p, W, Hh, bb = lockup_horizontal(D, D.light)
    emit("kovali-logo-horizontal.svg", p, W, Hh, D.light, bb)
    p, W, Hh, bb = lockup_horizontal(D, D.dark)
    emit("kovali-logo-horizontal-dark.svg", p, W, Hh, D.dark, bb)
    p, W, Hh, bb = lockup_horizontal(D, D.mono)
    emit("kovali-logo-horizontal-monochrome.svg", p, W, Hh, mono=True)
    p, W, Hh, bb = lockup_horizontal(D, D.light, descriptor=False)
    emit("kovali-logo-compact.svg", p, W, Hh, D.light, bb, ttl="KOVALI")
    p, W, Hh, bb = lockup_horizontal(D, D.dark, descriptor=False)
    emit("kovali-logo-compact-dark.svg", p, W, Hh, D.dark, bb, ttl="KOVALI")
    p = D.symbol(0, 0, 100, D.light)
    emit("kovali-icon.svg", p, 100, 100, D.light, (0, 0, 100, 100), ttl="KOVALI")
    p = D.symbol(0, 0, 100, D.dark)
    emit("kovali-icon-dark.svg", p, 100, 100, D.dark, (0, 0, 100, 100), ttl="KOVALI")
    p, defs = favicon(D)
    emit("kovali-favicon.svg", p, 32, 32, ttl="KOVALI")
    p, W, Hh = wordmark_only(D, D.light)
    emit("kovali-wordmark.svg", p, W, Hh, ttl="KOVALI")
    return files


if __name__ == "__main__":
    import re
    import shutil
    import subprocess
    from directions import ROOT
    active = sys.argv[1] if len(sys.argv) > 1 else None
    if active is None:
        cfg = open(os.path.join(ROOT, "src", "config", "site.ts"), encoding="utf-8").read()
        m = re.search(r'logoDirection:\s*"(\w+)"', cfg)
        active = m.group(1) if m else "signature"
    for D in DIRECTIONS:
        write_direction(D, os.path.join(ROOT, "brand", "directions", D.key))
    pub = os.path.join(ROOT, "public", "brand")
    os.makedirs(pub, exist_ok=True)
    src = os.path.join(ROOT, "brand", "directions", active)
    for f in os.listdir(src):
        shutil.copy(os.path.join(src, f), os.path.join(pub, f))
    shutil.copy(os.path.join(src, "kovali-favicon.svg"), os.path.join(ROOT, "src", "app", "icon.svg"))
    subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "gen_ts.py"),
                    os.path.join(ROOT, "src", "components", "brand", "logo-data.ts")], check=True)
    print(f"Logo files written; active direction: {active}")
