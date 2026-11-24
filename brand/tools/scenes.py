"""
Alpine line panoramas for the public website (src/assets/scenes/*.webp).

Each image is a fractal height field seen in perspective and drawn as ridge lines in the
logo blues: dark fills with luminous lines ("night") for heroes and banners, white fills
with Corporate Blue lines ("day") for light sections. Everything is generated, no photo or
third-party asset is used.

    python3 brand/tools/scenes.py        # needs numpy, scipy and Pillow

Seeds and camera settings are fixed, so the output is reproducible.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, map_coordinates

OUT = Path(__file__).resolve().parents[2] / "src" / "assets" / "scenes"


def hex_rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255.0


def rgba(c: np.ndarray, a: float = 1.0) -> tuple[int, int, int, int]:
    r, g, b = (int(round(v * 255)) for v in np.clip(c, 0, 1))
    return (r, g, b, int(round(a * 255)))


def fbm(n: int, beta: float, rng: np.random.Generator) -> np.ndarray:
    """Periodic 1/f^beta noise in [0, 1] (spectral synthesis)."""
    kx = np.fft.fftfreq(n)[:, None]
    ky = np.fft.fftfreq(n)[None, :]
    k = np.sqrt(kx**2 + ky**2)
    k[0, 0] = 1
    amp = k ** (-beta / 2)
    amp[0, 0] = 0
    field = np.real(np.fft.ifft2(amp * np.exp(1j * rng.uniform(0, 2 * np.pi, (n, n)))))
    return (field - field.min()) / (field.max() - field.min())


def height_field(n: int, seed: int, expo: float = 1.25) -> np.ndarray:
    """Massifs (smooth noise) carrying warped ridged crests."""
    rng = np.random.default_rng(seed)
    base = fbm(n, 3.8, rng)
    crest = fbm(n, 2.6, rng)
    wx = fbm(n, 3.5, rng) - 0.5
    wy = fbm(n, 3.5, rng) - 0.5
    yy, xx = np.mgrid[0:n, 0:n].astype(float)
    crest = map_coordinates(crest, [(yy + wy * n * 0.08) % n, (xx + wx * n * 0.08) % n], order=1, mode="wrap")
    ridged = (1 - np.abs(2 * crest - 1)) ** 2
    h = base**2 * (0.55 + 0.45 * ridged)
    h = gaussian_filter(h, 0.7, mode="wrap")
    fine = fbm(n, 2.1, rng)
    h = h + 0.012 * (fine - 0.5) * np.clip(h * 2, 0, 1)
    h = (h - h.min()) / (h.max() - h.min())
    return h**expo


PALETTES = {
    # Heroes, banners and the closing band: night sky, glow behind the peaks.
    "night": dict(
        sky=("#02050c", "#071430", "#1c4f98"),
        fill_far="#173a6e",
        fill_near="#030817",
        line_far="#4f8ad6",
        line_near="#a9d6ff",
        glow="#2a7be6",
        glow_a=0.5,
        alpha=(0.18, 0.78),
        width=1.0,
    ),
    # Light sections: white paper, Corporate Blue lines.
    "day": dict(
        sky=("#ffffff", "#eef4fb", "#cfe0f5"),
        fill_far="#dbe7f5",
        fill_near="#f7f9fc",
        line_far="#7fa3d6",
        line_near="#145bce",
        glow="#ffffff",
        glow_a=0.0,
        alpha=(0.5, 0.95),
        width=1.6,
    ),
}


def render(
    width: int,
    height: int,
    hf: np.ndarray,
    cam: np.ndarray,
    yaw: float,
    cam_h: float,
    palette: str = "night",
    vscale: float = 0.10,
    fov: float = 1.0,
    horizon: float = 0.42,
    znear: float = 0.025,
    zfar: float = 0.95,
    lines: int = 64,
    supersample: int = 2,
    line_width: tuple[float, float] = (0.7, 1.5),
    glow_x: float = 0.64,
) -> Image.Image:
    p = PALETTES[palette]
    n = hf.shape[0]
    s = supersample
    w, h = width * s, height * s
    xs = np.linspace(0, width, w // 2 + 1)
    ang = yaw + fov * (xs / width - 0.5)
    focal = width / (2 * np.tan(fov / 2))
    hrow = horizon * height

    rows = np.arange(h) / s
    t = np.clip(rows / (hrow * 1.1), 0, 1)[:, None]
    c0, c1, c2 = (hex_rgb(c) for c in p["sky"])
    sky = np.where(t < 0.55, c0 * (1 - t / 0.55) + c1 * (t / 0.55), c1 * (1 - (t - 0.55) / 0.45) + c2 * ((t - 0.55) / 0.45))
    img = np.repeat(sky[:, None, :], w, axis=1)
    glow = np.exp(-(((np.arange(w)[None, :] / w - glow_x) / 0.28) ** 2) - ((rows[:, None] - hrow) / (0.16 * height)) ** 2)
    img += glow[..., None] * hex_rgb(p["glow"])[None, None, :] * p["glow_a"]
    canvas = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
    draw = ImageDraw.Draw(canvas, "RGBA")

    a0, a1 = p["alpha"]
    for k, z in enumerate(np.geomspace(zfar, znear, lines)):  # far to near: painter's order
        d = k / (lines - 1)
        px = (cam[0] + z * np.sin(ang)) * n
        py = (cam[1] + z * np.cos(ang)) * n
        hg = map_coordinates(hf, [px % n, py % n], order=3, mode="wrap")
        y = (hrow - (hg * vscale - cam_h) / z * focal) * s
        x = xs * s
        fill = hex_rgb(p["fill_far"]) * (1 - d**0.6) + hex_rgb(p["fill_near"]) * d**0.6
        draw.polygon([(x[0], h + 5), *zip(x, y), (x[-1], h + 5)], fill=rgba(fill))
        line = hex_rgb(p["line_far"]) * (1 - d) + hex_rgb(p["line_near"]) * d
        lw = s * p["width"] * (line_width[0] + (line_width[1] - line_width[0]) * d)
        draw.line(list(zip(x, y)), fill=rgba(line, a0 + (a1 - a0) * d**0.9), width=max(1, round(lw)), joint="curve")
    return canvas.resize((width, height), Image.LANCZOS)


def view(seed: int, dist: float, want_x: float = 0.66, phi: float = 200, lift: float = 0.045):
    """Camera `dist` away from the highest massif, which appears at `want_x` of the width."""
    hf = height_field(1024, seed)
    n = hf.shape[0]
    i, j = np.unravel_index(np.argmax(gaussian_filter(hf, 6, mode="wrap")), hf.shape)
    peak = np.array([i / n, j / n])
    ph = np.deg2rad(phi)
    cam = (peak - dist * np.array([np.sin(ph), np.cos(ph)])) % 1
    d = peak - cam
    yaw = float(np.arctan2(d[0], d[1]) - (want_x - 0.5))
    ci, cj = int(cam[0] * n) % n, int(cam[1] * n) % n
    ground = gaussian_filter(hf, 8, mode="wrap")[ci, cj] * 0.10
    return hf, cam, yaw, ground + lift


# name: (width, height, palette, seed, dist, want_x, phi, horizon, glow_x)
SCENES = {
    "hero": (2560, 1440, "night", 14, 0.40, 0.66, 200, 0.42, 0.64),
    "intro": (1200, 1500, "day", 14, 0.40, 0.62, 200, 0.36, 0.6),
    "cta": (2560, 960, "night", 3, 0.42, 0.62, 200, 0.46, 0.55),
    "banner-leistungen": (2560, 800, "night", 9, 0.45, 0.70, 200, 0.50, 0.65),
    "banner-unternehmen": (2560, 800, "night", 21, 0.42, 0.40, 160, 0.50, 0.40),
    "banner-insights": (2560, 800, "night", 27, 0.45, 0.30, 230, 0.50, 0.30),
    "banner-kontakt": (2560, 800, "night", 33, 0.42, 0.62, 190, 0.50, 0.60),
    "banner-rechtliches": (2560, 800, "night", 41, 0.45, 0.50, 210, 0.50, 0.50),
    "team": (1200, 1500, "day", 21, 0.42, 0.55, 160, 0.34, 0.5),
    "arbeitsweise": (1200, 1500, "night", 9, 0.40, 0.55, 200, 0.40, 0.55),
    "insight-1": (1600, 1000, "day", 52, 0.42, 0.60, 200, 0.40, 0.6),
    "insight-2": (1600, 1000, "night", 63, 0.42, 0.45, 180, 0.42, 0.45),
    "insight-3": (1600, 1000, "day", 77, 0.42, 0.40, 220, 0.40, 0.4),
}


def main(only: list[str] | None = None) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    cache: dict[tuple, tuple] = {}
    for name, (w, h, pal, seed, dist, want_x, phi, horizon, glow_x) in SCENES.items():
        if only and name not in only:
            continue
        key = (seed, dist, want_x, phi)
        if key not in cache:
            cache[key] = view(seed, dist, want_x, phi)
        hf, cam, yaw, cam_h = cache[key]
        img = render(w, h, hf, cam, yaw, cam_h, pal, horizon=horizon, glow_x=glow_x)
        path = OUT / f"{name}.webp"
        img.save(path, "WEBP", quality=82, method=6)
        print(f"{path.relative_to(OUT.parents[2])}  {w}x{h}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    import sys

    main(sys.argv[1:] or None)
