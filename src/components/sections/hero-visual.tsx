/**
 * "From Requirements to Value": inputs on the left converge into the three
 * KO·VA·LI steps, which rise along the 48° diagonal of the logo towards value.
 * Pure SVG with CSS animation; animations stop for prefers-reduced-motion.
 */
const inputs = [
  { label: "Stakeholder", y: 70 },
  { label: "Prozesse", y: 150 },
  { label: "Anforderungen", y: 230 },
  { label: "Schnittstellen", y: 310 },
];

const steps = [
  { code: "KO", name: "Konzeption", x: 200, y: 360, fill: "#13224A", stroke: "rgba(255,255,255,0.35)", text: "#FFFFFF", sub: "rgba(255,255,255,0.7)" },
  { code: "VA", name: "Value Analysis", x: 300, y: 250, fill: "#145BCE", stroke: "#145BCE", text: "#FFFFFF", sub: "rgba(255,255,255,0.82)" },
  { code: "LI", name: "Lösungsintegration", x: 400, y: 140, fill: "#35A9FF", stroke: "#35A9FF", text: "#0B1733", sub: "#0B1733" },
];

const connectors = [
  "M325 360 L370 310",
  "M425 250 L470 200",
  "M525 140 L567 93",
];

export function HeroVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 450"
      className={className}
      role="img"
      aria-labelledby="hero-visual-title"
      fill="none"
    >
      <title id="hero-visual-title">
        Von Stakeholdern, Prozessen, Anforderungen und Schnittstellen über Konzeption, Value Analysis und
        Lösungsintegration zum Wert
      </title>

      <text x="0" y="26" fill="rgba(255,255,255,0.5)" fontSize="11" letterSpacing="1.5" className="font-mono">
        AUSGANGSLAGE
      </text>

      {/* Converging input lines */}
      {inputs.map((input, i) => {
        const d = `M150 ${input.y} C 182 ${input.y}, 168 390, 200 390`;
        return (
          <g key={input.label}>
            <path d={d} stroke="rgba(255,255,255,0.16)" strokeWidth="1.25" />
            <path
              d={d}
              stroke="#35A9FF"
              strokeOpacity="0.8"
              strokeWidth="1.25"
              className="kv-flow"
              style={{ animationDelay: `${i * -0.4}s` }}
            />
          </g>
        );
      })}

      {/* Inputs */}
      {inputs.map((input, i) => (
        <g key={input.label} className="kv-rise" style={{ ["--kv-delay" as string]: `${0.1 + i * 0.08}s` }}>
          <rect x="0.5" y={input.y - 19.5} width="149" height="39" rx="7" fill="#13224A" stroke="rgba(255,255,255,0.14)" />
          <rect x="14" y={input.y - 3} width="6" height="6" fill="#35A9FF" transform={`rotate(45 17 ${input.y})`} />
          <text x="30" y={input.y + 4.5} fill="rgba(255,255,255,0.85)" fontSize="13" className="font-mono">
            {input.label}
          </text>
        </g>
      ))}

      {/* Diagonal connectors between steps */}
      {connectors.map((d, i) => (
        <g key={d}>
          <path
            d={d}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.5"
            className="kv-draw"
            style={{ ["--kv-len" as string]: "70", ["--kv-delay" as string]: `${0.6 + i * 0.2}s` }}
          />
        </g>
      ))}

      {/* KO · VA · LI */}
      {steps.map((s, i) => (
        <g key={s.code} className="kv-rise" style={{ ["--kv-delay" as string]: `${0.45 + i * 0.18}s` }}>
          <rect x={s.x + 0.5} y={s.y + 0.5} width="149" height="59" rx="10" fill={s.fill} stroke={s.stroke} />
          <text x={s.x + 18} y={s.y + 27} fill={s.text} fontSize="19" fontWeight="600" className="font-sans">
            {s.code}
          </text>
          <text x={s.x + 18} y={s.y + 45} fill={s.sub} fontSize="12" className="font-sans">
            {s.name}
          </text>
        </g>
      ))}

      {/* Value */}
      <g className="kv-rise" style={{ ["--kv-delay" as string]: "1.15s" }}>
        <circle cx="586" cy="72" r="40" stroke="#35A9FF" strokeOpacity="0.5" className="kv-pulse" />
        <circle cx="586" cy="72" r="28" fill="#FFFFFF" />
        <path d="M574 72 L583 81 L599 63" stroke="#0B1733" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="586" y="134" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11" letterSpacing="1.5" className="font-mono">
          WERT
        </text>
      </g>
    </svg>
  );
}
