import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Document, Font, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { logoDirections } from "@/components/brand/logo-data";
import { site } from "@/config/site";
import type { Block, DocModel, Inline, Rich } from "./model";

/**
 * Renders a DocModel as an A4 PDF in the KOVALI layout: logo and document type in the header,
 * page numbers in the footer, Geist as typeface (falls back to Helvetica if the font files are
 * missing). next.config.ts traces the font files into the admin and portal functions.
 */

const COLORS = {
  navy: "#0B1733",
  ink: "#1D2740",
  blue: "#145BCE",
  electric: "#35A9FF",
  slate: "#4A5878",
  line: "#DCE4EF",
  mist: "#F4F8FC",
};

const FONT_DIR = path.join(process.cwd(), "node_modules/geist/dist/fonts");
let family = "Helvetica";
let registered = false;

function registerFonts() {
  if (registered) return;
  registered = true;
  // German words are not hyphenated by react-pdf's English rules.
  Font.registerHyphenationCallback((word) => [word]);
  try {
    const load = (file: string) => `data:font/ttf;base64,${readFileSync(path.join(FONT_DIR, file)).toString("base64")}`;
    Font.register({
      family: "Geist",
      fonts: [
        { src: load("geist-sans/Geist-Regular.ttf"), fontWeight: 400 },
        { src: load("geist-sans/Geist-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
        { src: load("geist-sans/Geist-Medium.ttf"), fontWeight: 500 },
        { src: load("geist-sans/Geist-SemiBold.ttf"), fontWeight: 600 },
      ],
    });
    Font.register({ family: "GeistMono", src: load("geist-mono/GeistMono-Regular.ttf") });
    family = "Geist";
  } catch (error) {
    console.warn(JSON.stringify({ event: "admin.pdf_font_fallback", error: String(error).slice(0, 200) }));
  }
}

function styles() {
  const mono = family === "Geist" ? "GeistMono" : "Courier";
  return StyleSheet.create({
    page: {
      fontFamily: family,
      fontSize: 9.5,
      lineHeight: 1.5,
      color: COLORS.ink,
      paddingTop: 92,
      paddingBottom: 64,
      paddingHorizontal: 62,
    },
    header: {
      position: "absolute",
      top: 30,
      left: 62,
      right: 62,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingBottom: 10,
      borderBottomWidth: 0.75,
      borderBottomColor: COLORS.line,
    },
    headerRight: { alignItems: "flex-end" },
    headerType: { fontSize: 7.5, color: COLORS.slate, letterSpacing: 0.6, textTransform: "uppercase" },
    headerRef: { fontFamily: mono, fontSize: 7.5, color: COLORS.slate, marginTop: 2 },
    confidential: { fontSize: 6.5, color: COLORS.blue, letterSpacing: 1, marginTop: 2 },
    footer: {
      position: "absolute",
      bottom: 28,
      left: 62,
      right: 62,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 7,
      color: COLORS.slate,
      borderTopWidth: 0.75,
      borderTopColor: COLORS.line,
      paddingTop: 8,
    },
    eyebrow: { fontFamily: mono, fontSize: 7.5, color: COLORS.blue, letterSpacing: 1.2, textTransform: "uppercase" },
    title: { fontSize: 20, fontWeight: 600, color: COLORS.navy, lineHeight: 1.2, marginTop: 6 },
    subtitle: { fontSize: 10.5, color: COLORS.slate, marginTop: 6 },
    h1: { fontSize: 11, fontWeight: 600, color: COLORS.navy, marginTop: 16, marginBottom: 5 },
    h2: { fontSize: 9.5, fontWeight: 600, color: COLORS.navy, marginTop: 10, marginBottom: 3 },
    p: { marginBottom: 5 },
    small: { fontSize: 8, color: COLORS.slate },
    muted: { color: COLORS.slate },
    clause: { flexDirection: "row", marginBottom: 5 },
    clauseNo: { width: 30, color: COLORS.slate, fontFamily: mono, fontSize: 8, paddingTop: 1 },
    clauseText: { flex: 1 },
    listItem: { flexDirection: "row", marginBottom: 3 },
    bullet: { width: 14, color: COLORS.blue },
    factRow: { flexDirection: "row", paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: COLORS.line },
    factLabel: { width: "34%", color: COLORS.slate, paddingRight: 8 },
    factValue: { flex: 1 },
    table: { borderWidth: 0.5, borderColor: COLORS.line, marginVertical: 6 },
    tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: COLORS.line },
    th: { backgroundColor: COLORS.mist, fontWeight: 600, color: COLORS.navy, padding: 5, fontSize: 8.5 },
    td: { padding: 5, fontSize: 8.5 },
    parties: { flexDirection: "row", gap: 18, marginVertical: 8 },
    party: { flex: 1, padding: 10, backgroundColor: COLORS.mist, borderRadius: 3 },
    partyRole: { fontFamily: mono, fontSize: 7, color: COLORS.blue, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
    between: { textAlign: "center", color: COLORS.slate, marginVertical: 4 },
    signatures: { flexDirection: "row", gap: 24, marginTop: 18 },
    sigCol: { flex: 1 },
    sigParty: { fontWeight: 600, color: COLORS.navy, marginBottom: 18 },
    sigLine: { borderBottomWidth: 0.75, borderBottomColor: COLORS.ink, height: 26, marginBottom: 3 },
    sigCaption: { fontSize: 7.5, color: COLORS.slate, marginBottom: 12 },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginVertical: 4 },
    tag: { borderWidth: 0.6, borderColor: COLORS.line, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1.5, fontSize: 8 },
    box: { backgroundColor: COLORS.mist, borderLeftWidth: 2, borderLeftColor: COLORS.blue, padding: 10, marginVertical: 8 },
    boxTitle: { fontWeight: 600, color: COLORS.navy, marginBottom: 3 },
    tl: { flexDirection: "row", marginBottom: 9 },
    tlPeriod: { width: 92, fontFamily: mono, fontSize: 7.5, color: COLORS.slate, paddingTop: 1.5 },
    tlBody: { flex: 1 },
    tlTitle: { fontWeight: 600, color: COLORS.navy },
    tlSub: { color: COLORS.slate, fontSize: 8.5 },
  });
}

function Logo() {
  const dir = logoDirections[site.logoDirection].compact;
  const palette: Record<string, string> = logoDirections[site.logoDirection].palettes.light;
  const height = 15;
  return (
    <Svg viewBox={`0 0 ${dir.width} ${dir.height}`} style={{ width: (dir.width / dir.height) * height, height }}>
      {dir.paths.map((p, i) => (
        <Path key={i} d={p.d} fill={palette[p.role] ?? palette.word} />
      ))}
    </Svg>
  );
}

function RichText({ value }: { value: Rich }) {
  if (typeof value === "string") return <>{value}</>;
  return (
    <>
      {value.map((part: Inline, i) =>
        typeof part === "string" ? (
          <Text key={i}>{part}</Text>
        ) : (
          <Text key={i} style={{ fontWeight: part.bold ? 600 : undefined, fontStyle: part.italic ? "italic" : undefined }}>
            {part.text}
          </Text>
        ),
      )}
    </>
  );
}

function BlockView({ block, s }: { block: Block; s: ReturnType<typeof styles> }) {
  switch (block.type) {
    case "title":
      return (
        <View style={{ marginBottom: 14 }}>
          <Text style={s.title}>{block.text}</Text>
          {block.subtitle ? <Text style={s.subtitle}>{block.subtitle}</Text> : null}
        </View>
      );
    case "heading":
      return (
        <Text style={block.level === 2 ? s.h2 : s.h1} minPresenceAhead={40}>
          {block.number ? `${block.number}  ` : ""}
          {block.text}
        </Text>
      );
    case "paragraph": {
      const extra = [block.muted ? s.muted : {}, block.small ? s.small : {}];
      if (block.number) {
        return (
          <View style={s.clause} wrap>
            <Text style={s.clauseNo}>{block.number}</Text>
            <Text style={[s.clauseText, ...extra]}>
              <RichText value={block.text} />
            </Text>
          </View>
        );
      }
      return (
        <Text style={[s.p, ...extra]}>
          <RichText value={block.text} />
        </Text>
      );
    }
    case "list":
      return (
        <View style={{ marginBottom: 5 }}>
          {block.items.map((item, i) => (
            <View key={i} style={s.listItem} wrap={false}>
              <Text style={s.bullet}>{block.ordered ? `${i + 1}.` : "–"}</Text>
              <Text style={{ flex: 1 }}>
                <RichText value={item} />
              </Text>
            </View>
          ))}
        </View>
      );
    case "facts":
      return (
        <View style={{ marginVertical: 6 }}>
          {block.rows.map((row, i) => (
            <View key={i} style={s.factRow} wrap={false}>
              <Text style={s.factLabel}>{row.label}</Text>
              <Text style={s.factValue}>
                <RichText value={row.value} />
              </Text>
            </View>
          ))}
        </View>
      );
    case "table": {
      const total = block.columns.reduce((sum, c) => sum + (c.width ?? 1), 0);
      return (
        <View style={s.table}>
          <View style={s.tr} fixed>
            {block.columns.map((c, i) => (
              <Text key={i} style={[s.th, { width: `${((c.width ?? 1) / total) * 100}%`, textAlign: c.align ?? "left" }]}>
                {c.label}
              </Text>
            ))}
          </View>
          {block.rows.map((row, r) => (
            <View key={r} style={s.tr} wrap={false}>
              {row.map((cell, i) => (
                <Text
                  key={i}
                  style={[s.td, { width: `${((block.columns[i]?.width ?? 1) / total) * 100}%`, textAlign: block.columns[i]?.align ?? "left" }]}
                >
                  <RichText value={cell} />
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    }
    case "parties":
      return (
        <View wrap={false}>
          <View style={s.parties}>
            {block.parties.map((p, i) => (
              <View key={i} style={s.party}>
                <Text style={s.partyRole}>{p.role}</Text>
                {p.lines.map((line, j) => (
                  <Text key={j} style={j === 0 ? { fontWeight: 600, color: COLORS.navy } : undefined}>
                    {line}
                  </Text>
                ))}
              </View>
            ))}
          </View>
          {block.between ? <Text style={s.between}>{block.between}</Text> : null}
        </View>
      );
    case "signatures":
      return (
        <View style={s.signatures} wrap={false}>
          {block.parties.map((p, i) => (
            <View key={i} style={s.sigCol}>
              <Text style={s.sigParty}>{p.party}</Text>
              <View style={s.sigLine} />
              <Text style={s.sigCaption}>Ort, Datum</Text>
              {(p.signers.length ? p.signers : [{}]).map((signer, j) => (
                <View key={j}>
                  <View style={s.sigLine} />
                  <Text style={s.sigCaption}>{[signer.name, signer.role].filter(Boolean).join(", ") || "Name, Funktion"}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case "tags":
      return (
        <View style={s.tags}>
          {block.items.map((t, i) => (
            <Text key={i} style={s.tag}>
              {t}
            </Text>
          ))}
        </View>
      );
    case "box":
      return (
        <View style={s.box} wrap={false}>
          {block.title ? <Text style={s.boxTitle}>{block.title}</Text> : null}
          <Text>
            <RichText value={block.text} />
          </Text>
        </View>
      );
    case "timeline":
      return (
        <View style={s.tl} wrap={false}>
          <Text style={s.tlPeriod}>{block.period}</Text>
          <View style={s.tlBody}>
            <Text style={s.tlTitle}>{block.title}</Text>
            {block.subtitle ? <Text style={s.tlSub}>{block.subtitle}</Text> : null}
            {block.text ? <Text style={{ marginTop: 2 }}>{block.text}</Text> : null}
            {block.tags?.length ? (
              <View style={[s.tags, { marginTop: 3 }]}>
                {block.tags.map((t, i) => (
                  <Text key={i} style={s.tag}>
                    {t}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      );
    case "spacer":
      return <View style={{ height: block.size === "lg" ? 24 : block.size === "sm" ? 6 : 12 }} />;
    case "pageBreak":
      return <View break />;
  }
}

export async function renderPdf(doc: DocModel): Promise<Buffer> {
  registerFonts();
  const s = styles();
  const pdf = (
    <Document title={doc.title} author={site.brand} creator={site.brand} producer={site.brand} subject={doc.docType} language="de-CH">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <Logo />
          <View style={s.headerRight}>
            <Text style={s.headerType}>{doc.docType}</Text>
            {doc.reference ? <Text style={s.headerRef}>{doc.reference}</Text> : null}
            {doc.confidential ? <Text style={s.confidential}>VERTRAULICH</Text> : null}
          </View>
        </View>
        {doc.blocks.map((block, i) => (
          <BlockView key={i} block={block} s={s} />
        ))}
        <View style={s.footer} fixed>
          <Text>{doc.footer}</Text>
          <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(pdf);
}
