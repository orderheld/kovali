"""Geometry helpers for the KOVALI logo construction (all shapes are plain paths)."""
import math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen


def n(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def area(pts):
    a = 0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        a += x1 * y2 - x2 * y1
    return a / 2


def poly(pts, cw=True):
    """Polygon path. Screen coords (y down): positive shoelace area == clockwise."""
    pts = list(pts)
    if (area(pts) > 0) != cw:
        pts.reverse()
    return "M" + " L".join(f"{n(x)} {n(y)}" for x, y in pts) + " Z"


def translate_pts(pts, dx, dy):
    return [(x + dx, y + dy) for x, y in pts]


def ring(cx, cy, R, r):
    """Annulus: outer clockwise, inner counter-clockwise (nonzero fill)."""
    outer = (f"M{n(cx)} {n(cy - R)} A{n(R)} {n(R)} 0 1 1 {n(cx)} {n(cy + R)} "
             f"A{n(R)} {n(R)} 0 1 1 {n(cx)} {n(cy - R)} Z")
    inner = (f"M{n(cx)} {n(cy - r)} A{n(r)} {n(r)} 0 1 0 {n(cx)} {n(cy + r)} "
             f"A{n(r)} {n(r)} 0 1 0 {n(cx)} {n(cy - r)} Z")
    return outer + " " + inner


def rrect(x, y, w, h, r, cw=True):
    """Rounded rectangle path."""
    if r <= 0:
        return poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], cw)
    if cw:
        return (f"M{n(x + r)} {n(y)} H{n(x + w - r)} A{n(r)} {n(r)} 0 0 1 {n(x + w)} {n(y + r)} "
                f"V{n(y + h - r)} A{n(r)} {n(r)} 0 0 1 {n(x + w - r)} {n(y + h)} H{n(x + r)} "
                f"A{n(r)} {n(r)} 0 0 1 {n(x)} {n(y + h - r)} V{n(y + r)} A{n(r)} {n(r)} 0 0 1 {n(x + r)} {n(y)} Z")
    return (f"M{n(x + r)} {n(y)} A{n(r)} {n(r)} 0 0 0 {n(x)} {n(y + r)} V{n(y + h - r)} "
            f"A{n(r)} {n(r)} 0 0 0 {n(x + r)} {n(y + h)} H{n(x + w - r)} A{n(r)} {n(r)} 0 0 0 {n(x + w)} {n(y + h - r)} "
            f"V{n(y + r)} A{n(r)} {n(r)} 0 0 0 {n(x + w - r)} {n(y)} Z")


def squircle_ring(cx, cy, w, h, t, k=0.62):
    """Rounded-square 'O' for the technical wordmark: outer cw, inner ccw."""
    ro = min(w, h) / 2 * k
    ri = max(ro - t, 0.5)
    return rrect(cx - w / 2, cy - h / 2, w, h, ro, True) + " " + rrect(cx - w / 2 + t, cy - h / 2 + t, w - 2 * t, h - 2 * t, ri, False)


class Font:
    def __init__(self, path):
        self.f = TTFont(path)
        self.gs = self.f.getGlyphSet()
        self.cmap = self.f.getBestCmap()
        self.upm = self.f["head"].unitsPerEm
        self.cap = self.f["OS/2"].sCapHeight
        self.hmtx = self.f["hmtx"]

    def advance(self, ch):
        return self.hmtx[self.cmap[ord(ch)]][0]

    def text_width(self, text, size, tracking):
        sc = size / self.upm
        w = sum(self.advance(c) for c in text) * sc + tracking * (len(text) - 1)
        # remove right side bearing of last glyph and left side bearing of first glyph
        return w

    def bounds(self, text, size, tracking):
        """Return (ink_left, ink_right) of the rendered text starting at x=0."""
        sc = size / self.upm
        glyf = self.f["glyf"]
        x = 0
        lo, hi = None, None
        for c in text:
            g = self.cmap[ord(c)]
            gl = glyf[g]
            if hasattr(gl, "xMin") and gl.numberOfContours != 0:
                a, b = x + gl.xMin * sc, x + gl.xMax * sc
                lo = a if lo is None else min(lo, a)
                hi = b if hi is None else max(hi, b)
            x += self.advance(c) * sc + tracking
        return lo, hi

    def path(self, text, size, tracking, x0, baseline):
        sc = size / self.upm
        pen = SVGPathPen(self.gs, ntos=n)
        x = x0
        for c in text:
            g = self.cmap[ord(c)]
            tp = TransformPen(pen, (sc, 0, 0, -sc, x, baseline))
            self.gs[g].draw(tp)
            x += self.advance(c) * sc + tracking
        return pen.getCommands()

    def fit(self, text, width, cap_height):
        """Size from cap height, tracking chosen so the ink spans exactly `width`."""
        size = cap_height / self.cap * self.upm
        lo, hi = self.bounds(text, size, 0)
        natural = hi - lo
        tracking = (width - natural) / (len(text) - 1)
        return size, tracking, lo
