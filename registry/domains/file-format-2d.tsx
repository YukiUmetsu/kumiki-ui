/** File objects with a measured format badge, and a conversion view from one format to another.
 * Built from the shared 2D illustration toolkit. The format string is the only text in the drawing
 * besides the title, and it is validated: 1–5 letters or digits, uppercased (for example "MP4", "HEIC").
 */
import { forwardRef } from "react";
import { Arrow, DomainIllustration, FitText, Part, RADIUS, Shadow, Sheet, STROKE, TextRows, useIllustration } from "./illustration-2d";
import type { DomainIllustrationProps, IllustrationContextValue, IllustrationTone } from "./illustration-2d";

export const FILE_KINDS = ["video", "image", "audio", "document", "data"] as const;
export type FileKind = typeof FILE_KINDS[number];

export interface FileFormatSpec { format: string; kind: FileKind }

export interface FileFormat2DProps extends Omit<DomainIllustrationProps, "title"> {
  format: string;
  kind: FileKind;
  /** Accessible name and title band. Defaults to "FORMAT file". */
  title?: string;
}

export interface FormatConversion2DProps extends Omit<DomainIllustrationProps, "title" | "from" | "to"> {
  from: FileFormatSpec;
  to: FileFormatSpec;
  /** Defaults to "FROM → TO". */
  title?: string;
}

const KIND_TONE: Record<FileKind, IllustrationTone> = { video: "accent", image: "accent2", audio: "positive", document: "deep", data: "ink" };

/** Uppercases and checks a format name. Throws with the rule and an example, never silently cuts it short. */
export function normalizeFileFormat(format: string): string {
  const value = format.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,5}$/.test(value)) {
    throw new Error(`File format "${format}" must be 1–5 letters or digits (for example "MP4", "HEIC" or "WAV").`);
  }
  return value;
}

function assertKind(kind: string): asserts kind is FileKind {
  if (!(FILE_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`Unknown file kind "${kind}". Use one of: ${FILE_KINDS.join(", ")}.`);
  }
}

/** Kind glyph centred at (cx, cy); `k` scales the glyph to the sheet. */
function Glyph({ kind, cx, cy, k }: { kind: FileKind; cx: number; cy: number; k: number }) {
  const c = useIllustration();
  const tone = KIND_TONE[kind];
  const frame = (x: number, y: number, w: number, h: number) => <rect x={x} y={y} width={w} height={h} rx={RADIUS.sm * k}
    fill={c.color(tone, -.1)} stroke={c.tokens.ink} strokeWidth={STROKE.detail} />;
  switch (kind) {
    case "video": return <g>
      {frame(cx - 22 * k, cy - 15 * k, 44 * k, 30 * k)}
      <path d={`M ${cx - 6 * k} ${cy - 8 * k} L ${cx + 9 * k} ${cy} L ${cx - 6 * k} ${cy + 8 * k} Z`} fill={c.tokens.highlight} />
    </g>;
    case "image": return <g>
      {frame(cx - 22 * k, cy - 15 * k, 44 * k, 30 * k)}
      <circle cx={cx - 10 * k} cy={cy - 6 * k} r={4 * k} fill={c.tokens.highlight} />
      <path d={`M ${cx - 20 * k} ${cy + 13 * k} L ${cx - 6 * k} ${cy - 3 * k} L ${cx + 4 * k} ${cy + 7 * k} L ${cx + 10 * k} ${cy + 1 * k} L ${cx + 20 * k} ${cy + 13 * k} Z`} fill={c.tokens.highlight} opacity={.85} />
    </g>;
    case "audio": return <g>
      {[[-18, 10], [-11, 22], [-4, 34], [3, 18], [10, 28], [17, 12]].map(([dx, h], i) => <rect key={i}
        x={cx + (dx - 2) * k} y={cy - (h * k) / 2} width={4 * k} height={h * k} rx={2 * k} fill={c.color(tone, -.1)} />)}
    </g>;
    case "document": return <TextRows x={cx - 18 * k} y={cy - 12 * k} widths={[36 * k, 36 * k, 26 * k, 36 * k, 22 * k]} gap={8 * k} h={3.6 * k} tone="ink" opacity={.7} />;
    case "data": return <g>
      {[0, 1, 2].flatMap(row => [0, 1, 2].map(col => <rect key={`${row}-${col}`}
        x={cx + (-16 + col * 12) * k} y={cy + (-12 + row * 12) * k} width={9 * k} height={9 * k} rx={1.5 * k}
        fill={c.color(tone, -.1)} />))}
    </g>;
  }
}

/** WCAG relative luminance of a six-digit hex colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4));
  return .2126 * r + .7152 * g + .0722 * b;
}

/** Label colour with the higher contrast against the badge: the theme ink or white. */
function badgeInk(c: IllustrationContextValue, tone: IllustrationTone): string {
  const base = c.tokens[tone];
  const contrast = (other: string) => {
    const [a, b] = [luminance(base), luminance(other)].sort((p, q) => q - p);
    return (a + .05) / (b + .05);
  };
  return contrast(c.tokens.ink) >= contrast("#ffffff") ? c.tokens.ink : "#ffffff";
}

/** One sheet with a kind glyph and a format badge at its foot. */
function FileArt({ format, kind, x, y, w, h, k }: { format: string; kind: FileKind; x: number; y: number; w: number; h: number; k: number }) {
  const c = useIllustration();
  const tone = KIND_TONE[kind];
  const cx = x + w / 2, badgeY = y + h - 36 * k, badgeH = 22, badgeW = w - 28 * k;
  return <g>
    <Shadow cx={cx} cy={y + h + 3} rx={w * .5} />
    <Part name="sheet" pivot={[cx, y + h]}>
      <Sheet x={x} y={y} w={w} h={h} fold={Math.round(24 * k)} />
      <Glyph kind={kind} cx={cx} cy={y + h * .42} k={k} />
    </Part>
    <Part name="label" pivot={[cx, badgeY + badgeH / 2]}>
      <rect x={cx - badgeW / 2} y={badgeY} width={badgeW} height={badgeH} rx={RADIUS.sm} fill={c.paint(tone)} stroke={c.tokens.ink} strokeWidth={STROKE.detail} />
      <FitText text={format} x={cx} y={badgeY} bandHeight={badgeH} valign="center" maxWidth={badgeW - 8 * k}
        fill={badgeInk(c, tone)} fontWeight={700} data-km-file-badge={format} />
    </Part>
  </g>;
}

export const FileFormat2D = forwardRef<SVGSVGElement, FileFormat2DProps>(function FileFormat2D({ format, kind, title, ...props }, ref) {
  const value = normalizeFileFormat(format);
  assertKind(kind);
  return <DomainIllustration {...props} ref={ref} title={title ?? `${value} file`} semanticId={`file-${value.toLowerCase()}`}
    data={{ "data-km-file-format-2d": kind, "data-km-file-format": value }}>
    <FileArt format={value} kind={kind} x={64} y={20} w={112} h={126} k={1} />
  </DomainIllustration>;
});

export const FormatConversion2D = forwardRef<SVGSVGElement, FormatConversion2DProps>(function FormatConversion2D({ from, to, title, ...props }, ref) {
  const fromFormat = normalizeFileFormat(from.format), toFormat = normalizeFileFormat(to.format);
  assertKind(from.kind);
  assertKind(to.kind);
  return <DomainIllustration {...props} ref={ref} title={title ?? `${fromFormat} → ${toFormat}`} semanticId={`conversion-${fromFormat.toLowerCase()}-${toFormat.toLowerCase()}`}
    data={{ "data-km-format-conversion-2d": `${from.kind}-${to.kind}`, "data-km-file-format": `${fromFormat}-${toFormat}` }}>
    <FileArt format={fromFormat} kind={from.kind} x={8} y={24} w={86} h={118} k={.78} />
    <Arrow d="M 102 84 H 130" head="M 126 75 L 140 84 L 126 93 Z" tone="accent" w={5} />
    <FileArt format={toFormat} kind={to.kind} x={146} y={24} w={86} h={118} k={.78} />
  </DomainIllustration>;
});
