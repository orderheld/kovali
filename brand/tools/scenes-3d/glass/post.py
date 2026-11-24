"""Downsample a 2x supersampled render with Lanczos; add only a very subtle triangular dither (no grain)."""
import sys
import numpy as np
from PIL import Image

src, dst, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src).convert('RGB')
if im.size != (w, h):
    # resize in float to keep the sub-LSB gradient information, then dither once
    a = np.asarray(im).astype(np.float32)
    ch = [Image.fromarray(a[..., c], 'F').resize((w, h), Image.LANCZOS) for c in range(3)]
    a = np.stack([np.asarray(c) for c in ch], -1)
else:
    a = np.asarray(im).astype(np.float32)
rng = np.random.default_rng(7)
d = (rng.random((h, w, 1), dtype=np.float32) + rng.random((h, w, 1), dtype=np.float32) - 1.0) * 0.5
out = np.clip(np.round(a + d), 0, 255).astype(np.uint8)
Image.fromarray(out, 'RGB').save(dst, optimize=True)
print('wrote', dst, w, 'x', h)
