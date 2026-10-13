"""Emit src/components/brand/logo-data.ts from the logo construction."""
import json, math, sys
from directions import DIRECTIONS
from build import lockup_horizontal

def role_pal(D):
    return {k: k for k in D.light.keys() if k != "grad"}

out = {}
for D in DIRECTIONS:
    rp = role_pal(D)
    p, W, H, _ = lockup_horizontal(D, rp, descriptor=False)
    sym = D.symbol(0, 0, 100, rp)
    def merge(paths):
        # merge paths that share a role to keep markup small
        acc = {}
        order = []
        for role, d in paths:
            if role not in acc:
                acc[role] = []
                order.append(role)
            acc[role].append(d)
        return [{"role": r, "d": " ".join(acc[r])} for r in order]
    light = {k: v for k, v in D.light.items() if k != "grad"}
    dark = {k: v for k, v in D.dark.items() if k != "grad"}
    out[D.key] = {
        "name": D.name,
        "compact": {"width": math.ceil(W - 0.01), "height": math.ceil(H - 0.01), "paths": merge(p)},
        "symbol": {"width": 100, "height": 100, "paths": merge(sym)},
        "palettes": {"light": light, "dark": dark},
    }

ts = '''// Generated from brand/tools (logo construction). Do not edit by hand:
// run `python3 brand/tools/build.py` to regenerate after changing the geometry.

export type LogoRole = string;

export interface LogoShape {
  width: number;
  height: number;
  paths: ReadonlyArray<{ role: LogoRole; d: string }>;
}

export interface LogoDirection {
  name: string;
  compact: LogoShape;
  symbol: LogoShape;
  palettes: { light: Record<LogoRole, string>; dark: Record<LogoRole, string> };
}

export const logoDirections = ''' + json.dumps(out, indent=2, ensure_ascii=False) + ''' as const satisfies Record<string, LogoDirection>;

export type LogoDirectionKey = keyof typeof logoDirections;
'''
open(sys.argv[1], "w").write(ts)

