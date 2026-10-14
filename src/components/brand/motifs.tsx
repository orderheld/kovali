import { cn } from "@/lib/utils";

/**
 * Decorative graphics of the public site, all aria-hidden and pointer-events-none:
 * the fine grid, the blue glow and the 48-degree arms of the logo as thin lines.
 * Colours come from the logo: Corporate Blue #145BCE, Azure #1F7BEA, Electric Blue #35A9FF.
 */

type BackdropVariant = "hero" | "band" | "panel";

const gridMask: Record<BackdropVariant, string> = {
  hero: "[mask-image:radial-gradient(ellipse_75%_80%_at_72%_35%,black,transparent_78%)]",
  band: "[mask-image:radial-gradient(ellipse_70%_90%_at_85%_50%,black,transparent_80%)]",
  panel: "[mask-image:radial-gradient(ellipse_80%_80%_at_80%_20%,black,transparent_80%)]",
};

/**
 * Grid and glow behind the content of a dark section. Put it first inside a `relative
 * overflow-hidden` section and give the content `relative`.
 */
export function DarkBackdrop({
  variant = "hero",
  arms = true,
  className,
}: {
  variant?: BackdropVariant;
  /** Draw the 48-degree arm lines on the right. */
  arms?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className={cn(
          "tech-grid absolute inset-0 [--grid-color:rgb(143_201_255/0.075)]",
          variant === "panel" && "[--grid-size:40px]",
          gridMask[variant],
        )}
      />
      {variant === "hero" ? (
        <>
          <div className="kv-glow absolute -right-[12%] -top-[45%] aspect-square w-[min(60rem,110vw)] rounded-full bg-[radial-gradient(circle,rgb(20_91_206/0.5)_0%,rgb(20_91_206/0.16)_40%,transparent_68%)]" />
          <div className="kv-glow absolute right-[8%] top-[18%] aspect-square w-[min(26rem,70vw)] rounded-full bg-[radial-gradient(circle,rgb(53_169_255/0.22)_0%,transparent_65%)] [--kv-delay:0.25s]" />
        </>
      ) : variant === "band" ? (
        <div className="absolute -right-[10%] top-1/2 aspect-square w-[min(48rem,100vw)] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(20_91_206/0.42)_0%,rgb(20_91_206/0.12)_42%,transparent_68%)]" />
      ) : (
        <div className="absolute -right-[20%] -top-[40%] aspect-square w-[42rem] max-w-[140%] rounded-full bg-[radial-gradient(circle,rgb(20_91_206/0.45)_0%,transparent_66%)]" />
      )}
      {/* A hairline of electric light along the top edge. */}
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(53_169_255/0.35)_55%,transparent)]" />
      {arms ? <ArmLines className="absolute -bottom-px right-0 hidden h-full w-[34rem] md:block" /> : null}
    </div>
  );
}

/**
 * The logo's arms at 48 degrees as three parallel hairlines rising to the right, with one
 * electric node. Drawn as rotated CSS lines so they stay crisp at any size.
 */
export function ArmLines({ className }: { className?: string }) {
  const base = "bg-linear-to-r from-transparent to-transparent";
  const strong = cn(base, "via-electric/55");
  const soft = cn(base, "via-azure/45");
  const faint = cn(base, "via-white/14");
  return (
    <div aria-hidden className={cn("pointer-events-none", className)}>
      <div className="relative size-full">
        <span className={cn("arm-line left-[6%]", faint)} />
        <span className={cn("arm-line left-[30%]", strong)}>
          <span className="absolute left-[58%] top-1/2 size-[7px] -translate-y-1/2 rotate-[48deg] bg-electric shadow-[0_0_12px_2px_rgb(53_169_255/0.55)]" />
        </span>
        <span className={cn("arm-line left-[48%]", soft)} />
      </div>
    </div>
  );
}

/** Four short corner marks, like the crop marks of a technical drawing. */
export function CornerMarks({ className }: { className?: string }) {
  const mark = "absolute size-3 border-electric/70";
  return (
    <div aria-hidden className={cn("pointer-events-none absolute", className)}>
      <span className={cn(mark, "left-0 top-0 border-l border-t")} />
      <span className={cn(mark, "right-0 top-0 border-r border-t")} />
      <span className={cn(mark, "bottom-0 left-0 border-b border-l")} />
      <span className={cn(mark, "bottom-0 right-0 border-b border-r")} />
    </div>
  );
}

/**
 * The logo's K as a technical drawing: outlines of stem and arms with construction lines,
 * vertex nodes and the 48-degree angle of the arms. Geometry from logo-data.ts (symbol,
 * 100 × 100), drawn at an offset of 50 in a 200 × 200 view box. Strokes draw in once.
 * The drawn outlines scale with the SVG (no non-scaling-stroke): with that effect Chromium
 * measures the pathLength-based dash in screen pixels and leaves the outline half drawn.
 */
export function SymbolBlueprint({ className }: { className?: string }) {
  const o = 50;
  const stem = "M50 50 L72 50 L72 150 L50 150 Z";
  const arm1 = "M120.51 50 L150 50 L108.49 96.5 L79 96.5 Z";
  const arm2 = "M108.49 103.5 L150 150 L120.51 150 L79 103.5 Z";
  const nodes: [number, number][] = [
    [o, o],
    [72, 150],
    [150, 50],
    [150, 150],
    [79, 96.5],
    [79, 103.5],
  ];
  const construction = "rgb(143 201 255 / 0.22)";
  return (
    <svg aria-hidden viewBox="0 0 200 200" fill="none" className={cn("pointer-events-none overflow-visible", className)}>
      <defs>
        <linearGradient id="kv-bp-arm1" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#145BCE" stopOpacity="0.35" />
          <stop offset="1" stopColor="#35A9FF" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="kv-bp-arm2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1F7BEA" stopOpacity="0.3" />
          <stop offset="1" stopColor="#35A9FF" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {/* Construction lines along the symbol's edges. */}
      <g stroke={construction} strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="2 5">
        <path d="M0 50 H200 M0 150 H200 M0 100 H200 M50 0 V200 M72 0 V200 M150 0 V200" vectorEffect="non-scaling-stroke" />
      </g>
      <path d="M108.49 96.5 H140" stroke="rgb(143 201 255 / 0.45)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {/* Fills, then outlines that draw in. */}
      <path d={stem} fill="rgb(255 255 255 / 0.05)" />
      <path d={arm1} fill="url(#kv-bp-arm1)" />
      <path d={arm2} fill="url(#kv-bp-arm2)" />
      {/* 0.65 user units: about 1.3 px at 25rem, 1 px at 20rem. */}
      <g stroke="#35A9FF" strokeWidth="0.65" strokeLinejoin="round">
        <path d={stem} pathLength={1} className="kv-draw" stroke="rgb(255 255 255 / 0.7)" />
        <path d={arm1} pathLength={1} className="kv-draw [--kv-delay:0.35s]" />
        <path d={arm2} pathLength={1} className="kv-draw [--kv-delay:0.5s]" stroke="#1F7BEA" />
      </g>
      {/* The 48-degree angle of the arms. */}
      <path
        d="M126.49 96.5 A18 18 0 0 0 120.53 83.12"
        stroke="#8FC9FF"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <text x="131" y="88" fill="#8FC9FF" fontSize="7" className="font-mono" letterSpacing="0.4">
        48°
      </text>
      {nodes.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x - 1.6}
          y={y - 1.6}
          width="3.2"
          height="3.2"
          fill="#060B18"
          stroke="#35A9FF"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <rect x="148.2" y="48.2" width="3.6" height="3.6" fill="#35A9FF" className="drop-shadow-[0_0_4px_rgb(53_169_255/0.9)]" />
    </svg>
  );
}
