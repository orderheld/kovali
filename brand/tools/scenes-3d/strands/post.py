"""Downsample the supersampled render (LANCZOS) and add a very fine, luminance-weighted film grain
to break up gradient banding. Usage: post.py raw.png out.png W H"""
import sys
import numpy as np
from PIL import Image

src, dst, W, H = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
GRAIN = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0  # 0 = no grain (dither only)
im = Image.open(src).convert('RGB')
if im.size != (W, H):
    im = im.resize((W, H), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255.0
rng = np.random.default_rng(1234)
# monochrome grain, slightly softened, strongest in the dark/mid tones
g = rng.normal(0.0, 1.0, (H, W)).astype(np.float32)
g = (g + np.roll(g, 1, 0) * 0.35 + np.roll(g, 1, 1) * 0.35) / 1.25
lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
amp = (1.6 / 255.0) * (0.55 + 0.9 * np.clip(lum * 3.0, 0, 1) * (1.0 - lum))
a = a + (g * amp * GRAIN)[..., None]
a = np.clip(a * 255.0 + rng.uniform(-0.5, 0.5, a.shape), 0, 255).astype(np.uint8)
Image.fromarray(a).save(dst, optimize=True)
print('wrote', dst, W, H)
