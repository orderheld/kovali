"""Custom geometric capitals K O V A L I, cap height H = 100, baseline y = 100."""
import math
from geo import poly, ring, squircle_ring, rrect

H = 100.0


def _solve_h(perp, rise, run_fn, guess):
    """Horizontal stroke width h so that the perpendicular thickness equals `perp`."""
    h = guess
    for _ in range(40):
        run = run_fn(h)
        h = perp * math.hypot(rise, run) / rise
    return h


def glyph_v(W, sd, fb_ratio=0.5, o=1.0, flip=False):
    """V (or Λ when flip=True). Returns (subpaths, width)."""
    def run_fn(h):
        return W / 2 - fb_ratio * h
    hv = _solve_h(sd, H + o, run_fn, sd)
    fb = fb_ratio * hv
    t = (W / 2 - hv) / (W / 2 - fb)
    yi = (H + o) * t
    pts = [(0, 0), (hv, 0), (W / 2, yi), (W - hv, 0), (W, 0), (W / 2 + fb, H + o), (W / 2 - fb, H + o)]
    if flip:
        pts = [(x, H - y) for x, y in pts]
    return [('poly', pts)], W, dict(hv=hv, fb=fb, yi=yi)


def glyph_a(W, sd, bar_y, bar_t, fb_ratio=0.5, o=1.0, bar=True):
    paths, w, m = glyph_v(W, sd, fb_ratio, o, flip=True)
    if bar:
        hv, fb, yi = m["hv"], m["fb"], m["yi"]

        def x_outer(y):
            return (W / 2 - fb) * (H - y) / (H + o)

        def x_inner(y):
            return hv + (W / 2 - hv) * (H - y) / yi

        def xl(y):
            return (x_outer(y) + x_inner(y)) / 2

        y1, y2 = bar_y, bar_y + bar_t
        paths.append(('poly', [(xl(y1), y1), (W - xl(y1), y1), (W - xl(y2), y2), (xl(y2), y2)]))
    return paths, w, m


def glyph_k(W, s, sd, gap, attached=False):
    """K with a vertical stem and a chevron (two parallelogram arms).

    attached=False: the arms are detached from the stem by `gap` and from each
    other by a horizontal slit of the same size (three-part construction).
    """
    paths = [('poly', [(0, 0), (s, 0), (s, H), (0, H)])]
    if attached:
        x0 = s - 0.01
        gv = 0.0
    else:
        x0 = s + gap
        gv = gap
    rise = H / 2 - gv / 2

    def run_fn(h):
        return (W - h) - x0
    a = _solve_h(sd, rise, run_fn, sd)
    yb = H / 2 - gv / 2
    up = [(x0, yb), (x0 + a, yb), (W, 0), (W - a, 0)]
    lo = [(x0, H - yb), (W - a, H), (W, H), (x0 + a, H - yb)]
    if attached:
        # merge both arms into one chevron that overlaps the stem slightly
        ch = [(W - a, 0), (W, 0), (x0 + a, H / 2), (W, H), (W - a, H), (x0, H / 2 + 0.001), (x0, H / 2 - 0.001)]
        paths.append(('poly', ch))
    else:
        paths.append(('poly', up))
        paths.append(('poly', lo))
    return paths, W, dict(a=a, x0=x0)


def glyph_o(s_round, o=1.5, squircle=False, w=None):
    R = H / 2 + o
    if squircle:
        ww = w or (H + 2 * o) * 0.98
        return [('sq', ww / 2, H / 2, ww, H + 2 * o, s_round)], ww, {}
    return [('ring', R, H / 2, R, R - s_round)], 2 * R, {}


def glyph_l(W, s, tf):
    return [('poly', [(0, 0), (s, 0), (s, H - tf), (W, H - tf), (W, H), (0, H)])], W, {}


def glyph_i(s):
    return [('poly', [(0, 0), (s, 0), (s, H), (0, H)])], s, {}


def compose(glyphs, gaps):
    """glyphs: list of (subpaths, width, meta); gaps: list of len-1 spacing values.

    Returns (list of (x_offset, subpaths)), total width.
    """
    x = 0.0
    out = []
    for i, (sp, w, _m) in enumerate(glyphs):
        out.append((x, sp))
        x += w
        if i < len(gaps):
            x += gaps[i]
    return out, x


def render(specs, dx=0.0, dy=0.0):
    out = []
    for sp in specs:
        k = sp[0]
        if k == 'poly':
            out.append(poly([(x + dx, y + dy) for x, y in sp[1]]))
        elif k == 'ring':
            _, cx, cy, R, r = sp
            out.append(ring(cx + dx, cy + dy, R, r))
        elif k == 'sq':
            _, cx, cy, w, h, t = sp
            out.append(squircle_ring(cx + dx, cy + dy, w, h, t))
        elif k == 'raw':
            out.append(sp[1])
    return " ".join(out)


def render_composed(composed, dx=0.0, dy=0.0):
    return " ".join(render(sp, dx + x, dy) for x, sp in composed)
