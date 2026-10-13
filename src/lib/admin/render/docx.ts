import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopPosition,
  TabStopType,
  TextRun,
  WidthType,
  type IRunOptions,
} from "docx";
import { site } from "@/config/site";
import type { Block, DocModel, Rich } from "./model";

/**
 * Renders a DocModel as a Word document (.docx) with the same structure as the PDF, so
 * documents can still be edited before sending. Uses Arial, which every recipient has.
 */

const C = { navy: "0B1733", ink: "1D2740", blue: "145BCE", slate: "4A5878", line: "DCE4EF", mist: "F4F8FC" };
const FONT = "Arial";
const SIZE = 19; // half-points: 9.5 pt

let logo: Buffer | null | undefined;
function logoPng(): Buffer | null {
  if (logo === undefined) {
    try {
      logo = readFileSync(path.join(process.cwd(), "src/lib/admin/render/assets/kovali-logo-compact.png"));
    } catch {
      logo = null;
    }
  }
  return logo;
}

function runs(value: Rich, base: IRunOptions = {}): TextRun[] {
  const parts = typeof value === "string" ? [value] : value;
  return parts.map((p) =>
    typeof p === "string"
      ? new TextRun({ ...base, text: p })
      : new TextRun({ ...base, text: p.text, bold: p.bold ?? base.bold, italics: p.italic ?? base.italics }),
  );
}

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

const lineBorder = { style: BorderStyle.SINGLE, size: 4, color: C.line };

function cell(children: Paragraph[], opts: { width?: number; shade?: boolean } = {}): TableCell {
  return new TableCell({
    children,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: C.mist, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
  });
}

function block(b: Block): (Paragraph | Table)[] {
  switch (b.type) {
    case "title":
      return [
        new Paragraph({ children: [new TextRun({ text: b.text, bold: true, size: 40, color: C.navy })], spacing: { after: 80 } }),
        ...(b.subtitle ? [new Paragraph({ children: [new TextRun({ text: b.subtitle, size: 21, color: C.slate })], spacing: { after: 240 } })] : []),
      ];
    case "heading":
      return [
        new Paragraph({
          keepNext: true,
          spacing: { before: b.level === 2 ? 160 : 280, after: 80 },
          children: [new TextRun({ text: `${b.number ? `${b.number}  ` : ""}${b.text}`, bold: true, size: b.level === 2 ? 19 : 22, color: C.navy })],
        }),
      ];
    case "paragraph": {
      const base: IRunOptions = { color: b.muted || b.small ? C.slate : C.ink, size: b.small ? 16 : SIZE };
      if (b.number) {
        return [
          new Paragraph({
            spacing: { after: 100 },
            indent: { left: 567, hanging: 567 },
            tabStops: [{ type: TabStopType.LEFT, position: 567 }],
            children: [new TextRun({ text: `${b.number}\t`, color: C.slate, size: 16 }), ...runs(b.text, base)],
          }),
        ];
      }
      return [new Paragraph({ spacing: { after: 100 }, children: runs(b.text, base) })];
    }
    case "list":
      return b.items.map(
        (item, i) =>
          new Paragraph({
            spacing: { after: 60 },
            indent: { left: 360, hanging: 280 },
            children: [new TextRun({ text: b.ordered ? `${i + 1}.\t` : "–\t", color: C.blue }), ...runs(item)],
            tabStops: [{ type: TabStopType.LEFT, position: 360 }],
          }),
      );
    case "facts":
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { ...noBorders, insideHorizontal: lineBorder, bottom: lineBorder },
          rows: b.rows.map(
            (r) =>
              new TableRow({
                cantSplit: true,
                children: [
                  cell([new Paragraph({ children: [new TextRun({ text: r.label, color: C.slate })] })], { width: 34 }),
                  cell([new Paragraph({ children: runs(r.value) })], { width: 66 }),
                ],
              }),
          ),
        }),
        new Paragraph({ spacing: { after: 80 }, children: [] }),
      ];
    case "table": {
      const total = b.columns.reduce((s, c) => s + (c.width ?? 1), 0);
      const align = (i: number) => (b.columns[i]?.align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT);
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: lineBorder, bottom: lineBorder, left: lineBorder, right: lineBorder, insideHorizontal: lineBorder, insideVertical: lineBorder },
          rows: [
            new TableRow({
              tableHeader: true,
              children: b.columns.map((c, i) =>
                cell([new Paragraph({ alignment: align(i), children: [new TextRun({ text: c.label, bold: true, color: C.navy, size: 17 })] })], {
                  width: ((c.width ?? 1) / total) * 100,
                  shade: true,
                }),
              ),
            }),
            ...b.rows.map(
              (row) =>
                new TableRow({
                  cantSplit: true,
                  children: row.map((value, i) =>
                    cell([new Paragraph({ alignment: align(i), children: runs(value, { size: 17 }) })], {
                      width: ((b.columns[i]?.width ?? 1) / total) * 100,
                    }),
                  ),
                }),
            ),
          ],
        }),
        new Paragraph({ spacing: { after: 80 }, children: [] }),
      ];
    }
    case "parties":
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { ...noBorders, insideVertical: { style: BorderStyle.SINGLE, size: 24, color: "FFFFFF" } },
          rows: [
            new TableRow({
              cantSplit: true,
              children: b.parties.map((p) =>
                cell(
                  [
                    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: p.role.toUpperCase(), color: C.blue, size: 14 })] }),
                    ...p.lines.map(
                      (line, j) => new Paragraph({ children: [new TextRun({ text: line, bold: j === 0, color: j === 0 ? C.navy : C.ink })] }),
                    ),
                  ],
                  { width: 100 / b.parties.length, shade: true },
                ),
              ),
            }),
          ],
        }),
        ...(b.between
          ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 }, children: [new TextRun({ text: b.between, color: C.slate })] })]
          : [new Paragraph({ spacing: { after: 120 }, children: [] })]),
      ];
    case "signatures": {
      const line = (caption: string) => [
        new Paragraph({ spacing: { before: 480 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.ink } }, children: [] }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: caption, size: 15, color: C.slate })] }),
      ];
      return [
        new Paragraph({ spacing: { before: 240 }, children: [] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [
            new TableRow({
              cantSplit: true,
              children: b.parties.map((p) =>
                cell(
                  [
                    new Paragraph({ children: [new TextRun({ text: p.party, bold: true, color: C.navy })] }),
                    ...line("Ort, Datum"),
                    ...(p.signers.length ? p.signers : [{}]).flatMap((s: { name?: string; role?: string }) =>
                      line([s.name, s.role].filter(Boolean).join(", ") || "Name, Funktion"),
                    ),
                  ],
                  { width: 100 / b.parties.length },
                ),
              ),
            }),
          ],
        }),
      ];
    }
    case "tags":
      return [new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: b.items.join("  ·  "), size: 17 })] })];
    case "box":
      return [
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: C.mist, color: "auto" },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: C.blue, space: 8 } },
          spacing: { before: 120, after: 120 },
          children: [
            ...(b.title ? [new TextRun({ text: b.title, bold: true, color: C.navy, break: 0 }), new TextRun({ text: "", break: 1 })] : []),
            ...runs(b.text),
          ],
        }),
      ];
    case "timeline":
      return [
        new Paragraph({
          keepNext: true,
          spacing: { before: 120 },
          tabStops: [{ type: TabStopType.LEFT, position: 1700 }],
          children: [
            new TextRun({ text: `${b.period}\t`, size: 16, color: C.slate }),
            new TextRun({ text: b.title, bold: true, color: C.navy }),
          ],
        }),
        ...(b.subtitle ? [new Paragraph({ indent: { left: 1700 }, children: [new TextRun({ text: b.subtitle, color: C.slate, size: 17 })] })] : []),
        ...(b.text ? [new Paragraph({ indent: { left: 1700 }, spacing: { before: 40 }, children: [new TextRun({ text: b.text })] })] : []),
        ...(b.tags?.length
          ? [new Paragraph({ indent: { left: 1700 }, spacing: { before: 40 }, children: [new TextRun({ text: b.tags.join("  ·  "), size: 16, color: C.slate })] })]
          : []),
      ];
    case "spacer":
      return [new Paragraph({ spacing: { after: b.size === "lg" ? 360 : b.size === "sm" ? 80 : 180 }, children: [] })];
    case "pageBreak":
      return [new Paragraph({ pageBreakBefore: true, children: [] })];
  }
}

export async function renderDocx(doc: DocModel): Promise<Buffer> {
  const png = logoPng();
  const header = new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 6 } },
        children: [
          ...(png ? [new ImageRun({ type: "png", data: png, transformation: { width: 96, height: 18 } })] : [new TextRun({ text: site.brand, bold: true, color: C.navy })]),
          new TextRun({ text: `\t${doc.docType.toUpperCase()}${doc.reference ? `  ·  ${doc.reference}` : ""}${doc.confidential ? "  ·  VERTRAULICH" : ""}`, size: 14, color: C.slate }),
        ],
      }),
    ],
  });
  const footer = new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 6 } },
        children: [
          new TextRun({ text: `${doc.footer}\t`, size: 14, color: C.slate }),
          new TextRun({ children: ["Seite ", PageNumber.CURRENT, " von ", PageNumber.TOTAL_PAGES], size: 14, color: C.slate }),
        ],
      }),
    ],
  });
  const document = new Document({
    creator: site.brand,
    title: doc.title,
    subject: doc.docType,
    styles: { default: { document: { run: { font: FONT, size: SIZE, color: C.ink }, paragraph: { spacing: { line: 300 } } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1700, bottom: 1300, left: 1250, right: 1250, header: 600, footer: 600 },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children: doc.blocks.flatMap(block),
      },
    ],
  });
  return Packer.toBuffer(document);
}
