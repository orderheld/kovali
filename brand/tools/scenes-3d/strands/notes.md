# Luminous flow: article covers (key "flow")

The scene is a single parametrised file, `../scene.html`. Each strand is an additive emissive ribbon, expanded in screen space.
Depth of field is a thin-lens circle of confusion applied per strand with energy conservation, which is exact for additive emitters.
Shading uses an emissive gradient (deep blue > logo blue > electric) plus a Kajiya-Kay fibre highlight. A studio light pool sits on the bend of the S.
Post-processing: 13-tap/tent bloom, then ACES filmic blended with a hue-preserving ACES (keeps the blues saturated), then sRGB with dithering.
Rendering: 2x supersampled in headless Chromium/SwiftShader, downscaled with PIL LANCZOS, no grain (GRAIN=0).

Render: `cd brand/tools/scenes-3d/strands && GRAIN=0 NODE_PATH=$(npm root -g) node render.js <view> <w> <h> final/<file> 2 "<query>"`
(needs `python3 -m http.server 8810 --directory brand/tools/scenes-3d` running)

Shared look params (test_full_v13 look; strands slightly thicker/brighter for small cards):
`L = spec=3&specsky=0.6&poolmax=2.6&core=0.0007&gain=0.024`

| file | view | w x h | query |
|---|---|---|---|
| insight-1.png (sweeping S-curve, centred) | cover | 1600x1000 | `L&shift=-0.09&fov=27` |
| insight-2.png (tight twist close-up) | detail | 1600x1000 | `L&track=0.76&dist=6.5&yaw=20&pitch=-5&toff=0,0,0&ap=0.016&exposure=0.85&shift=-0.16` |
| insight-3.png (scattered strands converging into one bundle) | detail | 1600x1000 | `L&track=0.60&dist=9&yaw=40&pitch=0&toff=0,0,0&ap=0.018&lcs=0.62&lr=4.5&sca=2.6&shift=-0.10` |
| flow-banner.png (S in the right ~45%, left half dark: mean luminance 0.025) | banner | 2560x900 | `L&fov=28&shift=0.19` |

Key params:
- `shift`: horizontal lens shift; + moves the subject right.
- `fov`: vertical field of view.
- `track`/`dist`/`yaw`/`pitch`: camera aimed at a point on the flow (0 = far end, 1 = near end).
- `ap`: aperture (CoC radius at infinity as a fraction of image height).
- `focus`: optional; defaults to `dist`.
- `lcs`/`lr`: where the light pool sits along the flow, and its radius.
- `sca`: how scattered the far threads are before they converge.
- `gain`/`core`/`exposure`/`bloom`: brightness, strand width, exposure and bloom.
- `seed`: changes the random strand layout.
