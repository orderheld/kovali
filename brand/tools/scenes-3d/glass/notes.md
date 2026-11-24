# layers: frosted glass panes and a traceability beam

These are thin, rounded glass sheets standing in a row in deep perspective. A single beam of electric-blue light comes from a glowing source behind the stack and passes through every pane. Where the beam hits a pane, the frosted glass lights up. The edges carry light like edge-lit acrylic. Depth of field keeps the front pane sharp and lets the far panes dissolve into the glow. The metaphor is requirements in layers, structured and traceable.

## Files
- `scene.html`: the whole scene in one parametrised file. The URL takes `w`, `h`, `view` (hero | banner | cover | detail) and any numeric parameter as an override (see below).
- `render.js`: renders in headless Chromium (SwiftShader) at `w*ss x h*ss`, then calls `post.py`.
  Usage: `NODE_PATH=$(npm root -g) node render.js <view|x> <w> <h> <ss> <out.png> "<query>"`.
  With `x` as the view, the view comes from the query.
- `post.py`: Lanczos downsample in float, then a sub-LSB triangular dither only. There is no grain.
- `jobs.txt` + `run_jobs.sh <scale> <ss> <outdir> [filter]`: the list of finals. `./run_jobs.sh 1 2 final` re-renders everything at 2x.

## How it renders (all linear HDR, half float)
1. Background: an ink void plus closed-form single scattering from a vertical line light in thin haze.
2. Panes, back to front. For each pane: a blur pyramid of everything behind it, then the pane drawn with MSAA. The pane shader uses frosted transmission with a polished clear margin, a refracting bevel with slight dispersion and dark-field env pickup, Fresnel reflection of an analytic studio environment (diagonal strip glint plus soft overhead sheen), back-scatter from the light, the beam hotspot, and edge-lit rims. Each pane then gets its own thin-lens depth of field, using a CoC taken from the pane's plane and a 128-tap gather. It is composited premultiplied over the accumulation buffer.
3. The beam is an analytic line with depth-of-field widening. It is drawn between the panes, so each pane frosts the part behind it.
4. Finally: wide subtle bloom, ACES filmic, an ink floor (#05070D), and dither.

## Default look (P in scene.html)
lightI 8, light 0.9,0.5,-5.6, lightH 0.6, beamA = light, beamB -0.5,-0.35,1.2, tailK 400 (the beam ends at the front pane), np 7, gap 0.62, border 0.09, strip 5, stripY -0.12, sheen 0.8, cocK 0.06, frost 0.016, focusPane 0.

## Finals (final/, all rendered at 2x and downscaled)
| file | size | query |
|---|---|---|
| hero.png | 2560x1440 | `view=hero` (cx 0.665, fov 32, az 42, el 3, dist 7.6, tz -1.9) |
| cta.png | 2560x960 | `view=hero&cx=0.69&dist=8.6&fov=30` |
| banner-leistungen.png | 2560x900 | `view=banner` (cx 0.70, fov 30, az 42, dist 9.6) |
| banner-unternehmen.png | 2560x900 | `view=banner&az=14&el=2&dist=9&fov=28&np=6&xs=0.32&rise=0.10&tx=0.8&ty=0.25&tz=-1.5&cx=0.72&light=2.2,0.9,-4.6&beamA=2.2,0.9,-4.6&beamB=-0.3,-0.4,1.2` (frontal cascading stack) |
| banner-insights.png | 2560x900 | `view=banner&az=38&el=30&dist=10.5&fov=28&cx=0.70&tz=-1.9` (high angle) |
| banner-kontakt.png | 2560x900 | `view=banner&np=4&dist=8&cx=0.64&tz=-1.0&light=0.9,0.5,-3.6&beamA=0.9,0.5,-3.6&beamB=-1.6,-1.0,4.0&tailK=0` (beam emerging) |
| banner-rechtliches.png | 2560x900 | `view=banner&np=1&az=55&el=4&dist=6.2&fov=30&tz=0&cx=0.72&light=0.6,0.3,-2.4&beamA=0.6,0.3,-2.4&beamB=-0.4,-0.3,1.0` (single pane) |
| intro.png | 1200x1500 | `view=detail` (close-up on the front panes) |
| team.png | 1200x1500 | `view=detail&lightI=5.5&sheen=0.15&key=0.3&strip=0&az=76&el=4&np=3&gap=0.5&dist=5.4&tz=-0.5&light=0.6,0.4,-2.6&beamA=0.6,0.4,-2.6&beamB=-0.3,-0.3,1.0` (three panes, nearly edge-on) |
| arbeitsweise.png | 1200x1500 | `view=detail&az=22&el=8&np=5&dist=7.4&fov=32&tz=-1.2&light=0.9,0.5,-4.2&beamA=0.9,0.5,-4.2&beamB=-0.4,-0.35,1.2` (frontal) |
| og.png | 1200x630 | `view=cover` (cx 0.62) |

Other sizes: use the same query with different `w`/`h`. For example, an article cover is `view=cover`, 1600x1000. `cx` moves the subject horizontally with a lens shift, so perspective is kept.
