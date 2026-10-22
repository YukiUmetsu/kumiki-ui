/** Labelled dashed zones for an SVG diagram overlay: where data is allowed to stay, or where it
 * leaves. Zones are authored rectangles in the diagram's output coordinates. The label sits in the
 * top band of its zone; when the label is wider than the zone it is still drawn in full and
 * flagged with `data-km-zone-overflow`, never silently truncated.
 */
import type { SVGProps } from "react";

export interface ZoneRect { x: number; y: number; width: number; height: number }

export interface ZoneBoundaryZone {
  id: string;
  label: string;
  rect: ZoneRect;
  /** `inside` (default) marks a zone the data stays in; `outside` marks a third party's zone. */
  tone?: "inside" | "outside";
}

export interface ZoneBoundaryColors {
  inside: string;
  outside: string;
  labelFill: string;
  labelInk: string;
}

export interface ZoneBoundaryProps extends Omit<SVGProps<SVGGElement>, "children"> {
  zones: readonly ZoneBoundaryZone[];
  fontSize?: number;
  fontFamily?: string;
  colors?: Partial<ZoneBoundaryColors>;
}

const DEFAULT_COLORS: ZoneBoundaryColors = {
  inside: "var(--km-zone-inside, #2f8f5b)", outside: "var(--km-zone-outside, #b45b27)",
  labelFill: "var(--km-zone-label-fill, #ffffff)", labelInk: "var(--km-zone-label-ink, #202936)",
};

const WIDE = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}|\p{Extended_Pictographic}|[＀-￯]/u;

/** Label geometry for one zone, in the same coordinates as the zone. Text width is estimated in
 * `em` (wide glyphs one em, Latin about 0.56 em); `overflow` is true when the label box is wider than the zone. */
export function zoneLabelBox(zone: ZoneBoundaryZone, fontSize: number) {
  let textEm = 0;
  for (const char of zone.label) textEm += WIDE.test(char) ? 1 : 0.56;
  const pad = fontSize * 0.55, height = fontSize * 1.8;
  const width = textEm * fontSize + pad * 2;
  const x = zone.rect.x + fontSize * 0.7, y = zone.rect.y + fontSize * 0.6;
  return { x, y, width, height, textX: x + pad, textY: y + height / 2, overflow: width > zone.rect.width - fontSize * 1.4 };
}

export function ZoneBoundary({ zones, fontSize = 20, fontFamily = "inherit", colors, ...props }: ZoneBoundaryProps) {
  const c = { ...DEFAULT_COLORS, ...colors };
  return <g fontFamily={fontFamily} {...props}>
    {zones.map((zone) => {
      const stroke = zone.tone === "outside" ? c.outside : c.inside;
      const label = zoneLabelBox(zone, fontSize);
      return <g key={zone.id} data-km-zone={zone.id} data-km-zone-tone={zone.tone ?? "inside"} data-km-zone-overflow={label.overflow ? "" : undefined}>
        <rect x={zone.rect.x} y={zone.rect.y} width={zone.rect.width} height={zone.rect.height} rx={fontSize * 0.9} fill="none" stroke={stroke} strokeWidth={2} strokeDasharray="9 7" />
        <rect x={label.x} y={label.y} width={label.width} height={label.height} rx={label.height / 2} fill={c.labelFill} stroke={stroke} strokeWidth={1.5} />
        <text x={label.textX} y={label.textY} dominantBaseline="central" fontSize={fontSize} fontWeight={600} fill={c.labelInk}>{zone.label}</text>
      </g>;
    })}
  </g>;
}
