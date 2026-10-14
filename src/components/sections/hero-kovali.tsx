import { logoDirections } from "@/components/brand/logo-data";
import { CornerMarks } from "@/components/brand/motifs";
import { site } from "@/config/site";
import { home } from "@/content/home";
import { workSamples } from "@/content/work-samples";
import { cn } from "@/lib/utils";

/*
 * Geometry of the drawing (view box W × H). The symbol of the Signature logo (100 × 100,
 * logo-data.ts) sits at X0/Y0, scaled by S. Each callout leaves its part along the part's own
 * axis: straight up out of the stem, and along the centre line of each arm (about 48 degrees)
 * out of the arm. The leaders of VA and LI are mirror images about the slit between the arms
 * (v = 50). KO and VA share the shelf above, LI has the shelf below, and the claim leaves the
 * open side of the K on the slit's axis without touching a part.
 * Text sizes are in view box units: the column is 460 px wide at 1024 px and 556 px from
 * 1280 px, so 14 units are 12.4 to 15 px.
 */
const W = 520;
const S = 2.6;
const X0 = 18;
const SHELF_TOP = 60;
const Y0 = SHELF_TOP + 34;
const MID = Y0 + 50 * S;
const SHELF_BOTTOM = 2 * MID - SHELF_TOP;
const H = SHELF_BOTTOM + 58;
const RIGHT = W - 8;

/** Symbol units (u, v) to view box units. */
const at = (u: number, v: number): [number, number] => [X0 + u * S, Y0 + v * S];

/** Centre line of the upper arm: from the middle of its foot (43.75, 46.5) to the middle of its tip (85.26, 0). */
const ARM = { u: 43.75, v: 46.5, du: 41.51, dv: -46.5 };
/** Point on the upper arm's centre line, 0 = foot, 1 = tip. */
const onArm = (t: number): [number, number] => at(ARM.u + ARM.du * t, ARM.v + ARM.dv * t);
/** Leaving the arm along its centre line up to the height `toY`. */
const alongArm = ([x, y]: [number, number], toY: number): [number, number] => [
  x + ((y - toY) * ARM.du) / -ARM.dv,
  toY,
];
/** Mirror about the slit between the arms. */
const mirror = ([x, y]: [number, number]): [number, number] => [x, 2 * MID - y];

const vaAnchor = onArm(0.72);
const vaElbow = alongArm(vaAnchor, SHELF_TOP);
const koAnchor = at(11, 16);
const koElbow: [number, number] = [koAnchor[0], SHELF_TOP];
/** The KO shelf stops short of the VA leader. */
const koShelfEnd = vaElbow[0] - 44;

const f = (n: number) => Math.round(n * 10) / 10;

/** Code tag in front of each name. */
const TAG = { w: 32, h: 20 };

type Part = {
  role: "stem" | "arm1" | "arm2";
  code: string;
  name: string;
  /** "en" for Value Analysis, so screen readers pronounce it in English. */
  lang?: "en";
  text: string;
};

type Callout = Part & {
  anchor: [number, number];
  elbow: [number, number];
  shelfEnd: number;
  /** Text above the shelf (top callouts) or below it (bottom callout). */
  side: "above" | "below";
  delay: string;
};

/**
 * Home hero visual: the K of the Signature logo, filled in the dark logo palette, as a finished
 * technical drawing (counterpart of the outline-only SymbolBlueprint of the subpages). Each part
 * carries a callout with its share of the name: KO Konzeption (stem), VA Value Analysis (upper
 * arm), LI Lösungsintegration (lower arm). The claim sits on a rule that leaves the open side of
 * the K without touching it and runs from Corporate Blue to Electric Blue, the logo's way from
 * the requirement to the value.
 *
 * From lg: the drawing, a server-rendered SVG whose leaders draw in once (kv-draw); it is
 * complete without the animation. The SVG is aria-hidden; a visually hidden list carries the
 * same content. Below lg the hero stacks and the drawing would sit far below the fold with
 * text too small to read, so a compact key takes its place: a small K beside the three parts
 * as real text.
 */
export function HeroKovali({ className }: { className?: string }) {
  const { symbol, palettes } = logoDirections.signature;
  const palette: Record<string, string> = palettes.dark;
  const lines = home.hero.signature;
  const [ko, va, li] = workSamples.steps;
  const parts: Part[] = [
    { role: "stem", code: ko.code, name: ko.name, text: lines.ko },
    { role: "arm1", code: va.code, name: va.name, lang: "en", text: lines.va },
    { role: "arm2", code: li.code, name: li.name, text: lines.li },
  ];

  return (
    <div className={cn("relative", className)}>
      <div className="hidden lg:block">
        <Drawing parts={parts} palette={palette} symbolPaths={symbol.paths} />
        <div className="sr-only">
          <p>{lines.intro}</p>
          <ul>
            {parts.map((p) => (
              <li key={p.code}>
                {p.code} <span lang={p.lang}>{p.name}</span>: {p.text}
              </li>
            ))}
          </ul>
          <p lang="en">{site.claim}</p>
        </div>
      </div>
      <CompactKey
        className="lg:hidden"
        parts={parts}
        palette={palette}
        symbolPaths={symbol.paths}
        intro={lines.intro}
      />
    </div>
  );
}

type SymbolPaths = ReadonlyArray<{ role: string; d: string }>;

function Drawing({
  parts,
  palette,
  symbolPaths,
}: {
  parts: Part[];
  palette: Record<string, string>;
  symbolPaths: SymbolPaths;
}) {
  const [ko, va, li] = parts;
  const callouts: Callout[] = [
    { ...ko, anchor: koAnchor, elbow: koElbow, shelfEnd: koShelfEnd, side: "above", delay: "0.45s" },
    { ...va, anchor: vaAnchor, elbow: vaElbow, shelfEnd: RIGHT, side: "above", delay: "0.6s" },
    { ...li, anchor: mirror(vaAnchor), elbow: mirror(vaElbow), shelfEnd: RIGHT, side: "below", delay: "0.75s" },
  ];

  const [kLeft, kTop] = at(0, 0);
  const [kRight, kBottom] = at(100, 100);
  const tick = 10;
  const gap = 14;
  const corners = [
    `M${kLeft - gap} ${kTop - gap + tick} V${kTop - gap} H${kLeft - gap + tick}`,
    `M${kRight + gap - tick} ${kTop - gap} H${kRight + gap} V${kTop - gap + tick}`,
    `M${kLeft - gap} ${kBottom + gap - tick} V${kBottom + gap} H${kLeft - gap + tick}`,
    `M${kRight + gap - tick} ${kBottom + gap} H${kRight + gap} V${kBottom + gap - tick}`,
  ].join(" ");

  /** The claim's rule starts in the open side of the K, clear of both arms. */
  const claimStart = at(62, 50)[0];

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      className="pointer-events-none block h-auto w-full overflow-visible"
    >
      <defs>
        <radialGradient id="kv-sig-glow">
          <stop offset="0" stopColor="#35A9FF" stopOpacity="0.3" />
          <stop offset="0.45" stopColor="#145BCE" stopOpacity="0.15" />
          <stop offset="1" stopColor="#145BCE" stopOpacity="0" />
        </radialGradient>
        {/* User space: a horizontal line has no height, so a bounding-box gradient would not render. */}
        <linearGradient
          id="kv-sig-claim"
          gradientUnits="userSpaceOnUse"
          x1={f(claimStart)}
          y1="0"
          x2={RIGHT}
          y2="0"
        >
          <stop offset="0" stopColor="#145BCE" stopOpacity="0.6" />
          <stop offset="1" stopColor="#35A9FF" />
        </linearGradient>
      </defs>

      {/* Blue light behind the symbol. */}
      <circle
        cx={f(at(50, 50)[0])}
        cy={f(MID)}
        r="230"
        fill="url(#kv-sig-glow)"
        className="kv-glow origin-center [transform-box:fill-box] [--kv-delay:0.2s]"
      />

      {/* Crop marks around the symbol. */}
      <path d={corners} stroke="rgb(143 201 255 / 0.4)" strokeWidth="1" />

      {/* The symbol, filled in the dark logo palette. */}
      <g transform={`translate(${X0} ${Y0}) scale(${S})`}>
        {symbolPaths.map((p) => (
          <path key={p.role} d={p.d} fill={palette[p.role]} />
        ))}
      </g>

      {callouts.map((c) => {
        const [ax, ay] = c.anchor;
        const [ex, ey] = c.elbow;
        const nameY = c.side === "above" ? ey - 31 : ey + 26;
        const textY = c.side === "above" ? ey - 11 : ey + 46;
        return (
          <g key={c.code}>
            <path
              d={`M${f(ax)} ${f(ay)} L${f(ex)} ${f(ey)} H${f(c.shelfEnd)}`}
              pathLength={1}
              stroke="rgb(143 201 255 / 0.7)"
              strokeWidth="1"
              strokeLinejoin="round"
              className="kv-draw"
              style={{ "--kv-delay": c.delay } as React.CSSProperties}
            />
            {/* The leader ends on the part with a dot, as in a technical drawing. */}
            <circle cx={f(ax)} cy={f(ay)} r="3.5" fill="#060B18" stroke="rgb(143 201 255 / 0.9)" strokeWidth="1" />
            {/* Node in the part's colour where the leader meets its shelf. */}
            <rect x={f(ex) - 3} y={f(ey) - 3} width="6" height="6" fill={palette[c.role]} />
            {/* The code on a tag in the part's colour, like the item number of a drawing. */}
            <rect x={f(ex)} y={f(nameY - 16)} width={TAG.w} height={TAG.h} fill={palette[c.role]} />
            <text
              x={f(ex + TAG.w / 2)}
              y={f(nameY - 1.5)}
              textAnchor="middle"
              fontSize="13"
              fontWeight="600"
              letterSpacing="0.6"
              fill="#060B18"
              className="font-mono"
            >
              {c.code}
            </text>
            <text
              x={f(ex + TAG.w + 9)}
              y={f(nameY)}
              fontSize="17"
              fontWeight="600"
              letterSpacing="-0.25"
              fill="#FFFFFF"
              className="font-sans"
            >
              {c.name}
            </text>
            <text x={f(ex)} y={f(textY)} fontSize="14" fill="rgb(255 255 255 / 0.72)" className="font-sans">
              {c.text}
            </text>
          </g>
        );
      })}

      {/* The claim on a rule out of the open side of the K, from Corporate Blue to Electric Blue. */}
      <path
        d={`M${f(claimStart)} ${f(MID)} H${RIGHT}`}
        pathLength={1}
        stroke="url(#kv-sig-claim)"
        strokeWidth="1.25"
        className="kv-draw [--kv-delay:0.9s]"
      />
      <rect
        x={f(claimStart) - 3}
        y={f(MID) - 3}
        width="6"
        height="6"
        fill="#060B18"
        stroke="#8FC9FF"
        strokeWidth="1"
      />
      <rect
        x={RIGHT - 3.5}
        y={f(MID) - 3.5}
        width="7"
        height="7"
        fill="#35A9FF"
        className="drop-shadow-[0_0_6px_rgb(53_169_255/0.9)]"
      />
      {/* Geist Medium, like the descriptor under the logo's wordmark. */}
      <text
        x={RIGHT}
        y={f(MID) - 13}
        textAnchor="end"
        lang="en"
        fontSize="15"
        fontWeight="500"
        letterSpacing="-0.1"
        fill="#8FC9FF"
        className="font-sans"
      >
        {site.claim}
      </text>
    </svg>
  );
}

/** Code tag in the part's colour; night text on each is at least 4.7:1. */
const tag: Record<Part["role"], string> = {
  stem: "bg-white",
  arm1: "bg-electric",
  arm2: "bg-azure",
};

function CompactKey({
  parts,
  palette,
  symbolPaths,
  intro,
  className,
}: {
  parts: Part[];
  palette: Record<string, string>;
  symbolPaths: SymbolPaths;
  intro: string;
  className?: string;
}) {
  return (
    <div className={cn("relative p-4 sm:p-0", className)}>
      {/* Below sm the marks sit inside the page gutter, so the key is padded instead. */}
      <CornerMarks className="inset-0 sm:-inset-4" />
      <p className="sr-only">{intro}</p>
      <div className="flex items-start gap-5 sm:gap-8">
        <svg aria-hidden viewBox="0 0 100 100" className="mt-0.5 w-14 shrink-0 sm:w-20">
          {symbolPaths.map((p) => (
            <path key={p.role} d={p.d} fill={palette[p.role]} />
          ))}
        </svg>
        <ul className="grid min-w-0 flex-1 gap-4 md:grid-cols-3 md:gap-6">
          {parts.map((p) => (
            <li key={p.code} className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 md:flex-col md:items-start md:gap-y-2">
                <span
                  className={cn(
                    "inline-flex h-[1.125rem] items-center px-1.5 font-mono text-[0.6875rem] font-semibold tracking-[0.05em] text-night",
                    tag[p.role],
                  )}
                >
                  {p.code}
                </span>
                <span lang={p.lang} className="font-semibold leading-6 text-white">
                  {p.name}
                </span>
              </p>
              <p className="mt-1 text-sm leading-snug text-white/70">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
      <p lang="en" className="mt-6 flex items-center gap-3 text-sm font-medium text-sky">
        <span aria-hidden className="h-px w-6 shrink-0 bg-linear-to-r from-blue to-electric sm:w-10" />
        {site.claim}
      </p>
    </div>
  );
}
