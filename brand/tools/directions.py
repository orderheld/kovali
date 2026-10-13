"""The three KOVALI logo directions, built from plain geometry (no fonts at runtime)."""
import math
from letters import (glyph_k, glyph_o, glyph_v, glyph_a, glyph_l, glyph_i, compose,
                     render_composed, H)
from geo import Font, poly, rrect, n

NAVY, CORP, ELEC, WHITE = "#0B1733", "#145BCE", "#35A9FF", "#FFFFFF"
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GEIST = os.path.join(ROOT, "node_modules", "geist", "dist", "fonts")
DESCRIPTOR = "BUSINESS & TECHNOLOGY CONSULTING"


def _arm_width(perp, rise, x0, right):
    a = perp
    for _ in range(50):
        a = perp * math.hypot(rise, (right - a) - x0) / rise
    return a


class Direction:
    key = ""
    name = ""
    font = GEIST + "/geist-sans/Geist-Medium.ttf"
    desc_cap = 15.0
    desc_gap = 24.0

    # palettes: role -> colour
    light = {}
    dark = {}

    def symbol(self, x, y, size, pal):
        """Return list of (fill, d)."""
        raise NotImplementedError

    def wordmark(self):
        """Return (composed, width). Cap height 100, top at y=0."""
        raise NotImplementedError

    def wordmark_paths(self, x, y, pal):
        comp, w = self.wordmark()
        return [(pal["word"], render_composed(comp, x, y))]

    def descriptor(self, x, y_top, width, pal):
        f = Font(self.font)
        size, tracking, lo = f.fit(DESCRIPTOR, width, self.desc_cap)
        baseline = y_top + self.desc_cap
        return [(pal["desc"], f.path(DESCRIPTOR, size, tracking, x - lo, baseline))]


class Signature(Direction):
    key = "signature"
    name = "KOVALI Signature"
    light = dict(stem=NAVY, arm1=CORP, arm2=ELEC, word=NAVY, desc=CORP)
    dark = dict(stem=WHITE, arm1=ELEC, arm2="#1F7BEA", word=WHITE, desc="#8FC9FF")
    mono = dict(stem=NAVY, arm1=NAVY, arm2=NAVY, word=NAVY, desc=NAVY)

    def symbol(self, x, y, size, pal, stem=22, gap=7):
        S = size / 100.0
        x0 = stem + gap
        yb = 50 - gap / 2
        a = _arm_width(stem, yb, x0, 100)

        def P(pts):
            return poly([(x + px * S, y + py * S) for px, py in pts])
        return [
            (pal["stem"], P([(0, 0), (stem, 0), (stem, 100), (0, 100)])),
            (pal["arm1"], P([(x0, yb), (x0 + a, yb), (100, 0), (100 - a, 0)])),
            (pal["arm2"], P([(x0, 100 - yb), (100 - a, 100), (100, 100), (x0 + a, 100 - yb)])),
        ]

    def wordmark(self, s=14.0):
        sd = s * 0.94
        K = glyph_k(68, s, sd, gap=0, attached=True)
        O = glyph_o(s * 1.07, o=1.6)
        V = glyph_v(86, sd, fb_ratio=0.42, o=1.2)
        A = glyph_a(86, sd, bar_y=63, bar_t=s * 0.86, fb_ratio=0.42, o=1.2)
        L = glyph_l(50, s, s * 0.92)
        I = glyph_i(s)
        vm = V[2]
        ang = math.atan2(86 / 2 - vm["fb"], 101.2)
        gaps = [16, 15, -(86 / 2 - vm["fb"]) + 26 / math.cos(ang), 24, 22]
        return compose([K, O, V, A, L, I], gaps)


class Tech(Direction):
    key = "tech"
    name = "KOVALI Tech"
    font = GEIST + "/geist-mono/GeistMono-Medium.ttf"
    desc_cap = 14.0
    desc_gap = 26.0
    light = dict(f1=NAVY, f2=CORP, f3=ELEC, f4=CORP, word=NAVY, desc=CORP, grad=True)
    dark = dict(f1="#FFFFFF", f2="#2C74E0", f3=ELEC, f4="#2C74E0", word=WHITE, desc="#8FC9FF", grad=True)
    mono = dict(f1=NAVY, f2=NAVY, f3=NAVY, f4=NAVY, word=NAVY, desc=NAVY, grad=False)

    def symbol(self, x, y, size, pal, c=7, r=18, xs=25):
        S = size / 100.0
        x1, x2 = xs, xs + c
        vx = x2 + c * 0.9
        dx, dy = 100 - vx, -50
        L = math.hypot(dx, dy)
        nx, ny = -dy / L, dx / L
        h = c / 2

        def lx_at_y(px, py, yy):
            return px + (yy - py) * dx / dy

        def ly_at_x(px, py, xx):
            return py + (xx - px) * dy / dx
        ux, uy = vx - h * nx, 50 - h * ny
        lx, ly = vx + h * nx, 50 + h * ny
        top = [(x2, 0), (lx_at_y(ux, uy, 0), 0), (x2, ly_at_x(ux, uy, x2))]
        tip_x = lx + (50 - ly) * dx / dy
        mid = [(tip_x, 50), (100, ly_at_x(lx, ly, 100)), (100, 100 - ly_at_x(lx, ly, 100))]
        bot = [(px, 100 - py) for (px, py) in top]
        rr = r
        # left facet keeps the tile's rounded corners on the left side
        left = (f"M{n(x + rr * S)} {n(y)} H{n(x + x1 * S)} V{n(y + 100 * S)} H{n(x + rr * S)} "
                f"A{n(rr * S)} {n(rr * S)} 0 0 1 {n(x)} {n(y + (100 - rr) * S)} V{n(y + rr * S)} "
                f"A{n(rr * S)} {n(rr * S)} 0 0 1 {n(x + rr * S)} {n(y)} Z")

        def P(pts):
            return poly([(x + px * S, y + py * S) for px, py in pts])
        return [(pal["f1"], left), (pal["f2"], P(top)), (pal["f3"], P(mid)), (pal["f4"], P(bot))]

    def wordmark(self, s=10.0):
        sd = s * 0.95
        K = glyph_k(74, s, sd, gap=0, attached=True)
        O = glyph_o(s * 1.05, o=0.6, squircle=True, w=96)
        V = glyph_v(92, sd, fb_ratio=0.0, o=0.0)
        A = glyph_a(92, sd, 0, 0, fb_ratio=0.0, o=0.0, bar=False)
        L = glyph_l(60, s, s)
        I = glyph_i(s)
        ang = math.atan2(46, 100)
        gaps = [24, 22, -46 + 26 / math.cos(ang), 30, 30]
        return compose([K, O, V, A, L, I], gaps)


class Minimal(Direction):
    key = "minimal"
    name = "KOVALI Minimal"
    font = GEIST + "/geist-sans/Geist-Regular.ttf"
    desc_cap = 13.0
    desc_gap = 30.0
    light = dict(stroke=NAVY, node=ELEC, word=NAVY, desc="#4A5878")
    dark = dict(stroke=WHITE, node=ELEC, word=WHITE, desc="#AFC0DA")
    mono = dict(stroke=NAVY, node=NAVY, word=NAVY, desc=NAVY)

    def _node_k(self, x, y, size, s, node, gap, right, pal):
        """Monoline K: stem + two arms meeting in a square node. Units: 100 = size."""
        S = size / 100.0

        def P(pts):
            return poly([(x + px * S, y + py * S) for px, py in pts])
        nx0 = s + gap
        ncx = nx0 + node / 2
        a = s * math.hypot(50, right - ncx) / 50
        stem = P([(0, 0), (s, 0), (s, 100), (0, 100)])
        up = P([(ncx - a / 2, 50), (ncx + a / 2, 50), (right, 0), (right - a, 0)])
        lo = P([(ncx - a / 2, 50), (right - a, 100), (right, 100), (ncx + a / 2, 50)])
        nd = P([(nx0, 50 - node / 2), (nx0 + node, 50 - node / 2), (nx0 + node, 50 + node / 2), (nx0, 50 + node / 2)])
        return [(pal["stroke"], f"{stem} {up} {lo}"), (pal["node"], nd)]

    def symbol(self, x, y, size, pal):
        return self._node_k(x, y, size, s=11, node=23, gap=8, right=100, pal=pal)

    def wordmark(self, s=7.5):
        sd = s * 0.95
        O = glyph_o(s * 1.06, o=1.4)
        V = glyph_v(84, sd, fb_ratio=0.3, o=1.0)
        A = glyph_a(84, sd, bar_y=64, bar_t=s * 0.9, fb_ratio=0.3, o=1.0)
        L = glyph_l(50, s, s * 0.95)
        I = glyph_i(s)
        kw = 66
        K = ([], kw, {})  # drawn separately (node K)
        vm = V[2]
        ang = math.atan2(42 - vm["fb"], 101)
        gaps = [30, 28, -(42 - vm["fb"]) + 34 / math.cos(ang), 36, 34]
        return compose([K, O, V, A, L, I], gaps)

    def wordmark_paths(self, x, y, pal):
        comp, w = self.wordmark()
        rest = render_composed(comp, x, y)
        k = self._node_k(x, y, 100, s=7.5, node=13, gap=5.5, right=66, pal=pal)
        return [(pal["word"], k[0][1] + " " + rest), (pal["node"], k[1][1])]


DIRECTIONS = [Signature(), Tech(), Minimal()]
