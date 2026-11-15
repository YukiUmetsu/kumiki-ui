/**
 * SHO1 structure rules (結構法): how a teacher lays out a character, compared with KanjiVG.
 *
 * Measured, not guessed: 411 finished kaisho models by one teacher were compared with the same
 * characters drawn from KanjiVG (see the SHO1 research note, §2.8). The whole character and then
 * each component (KanjiVG's left/right, top/bottom, enclosure, hanging roof and bottom-left wrap)
 * were fitted to the teacher's ink. A rule is kept only when it improved the match on both halves
 * of the characters. Only these aggregate numbers are kept; no teacher shape is stored.
 *
 * What the study found:
 * - Teachers write 冠/脚 (top/bottom) and single-part characters clearly taller than KanjiVG
 *   (about 13%), and 偏/旁 (left/right) characters at about KanjiVG's proportion.
 * - In 冠/脚 characters both parts are a little narrower, and the bottom part is flatter, so
 *   the two parts have more air between them.
 * - KanjiVG's left/right split already matches the teacher; part rules there did not help.
 *
 * `shodoKaishoForm` applies these first, then rises the horizontals, weights the strokes and
 * re-closes the joins.
 */
import type { ShodoGlyph, ShodoPart, ShodoPartPosition, ShodoPoint, ShodoStrokeSpec } from "./shodo-glyphs";

export type ShodoLayout = "leftRight" | "topBottom" | "enclosure" | "tare" | "nyo" | "single" | "kana";

export interface ShodoStructureRules {
  /** Width of the whole character relative to KanjiVG, by top-level layout (1 = unchanged). */
  aspect: Readonly<Record<ShodoLayout, number>>;
  /** 冠/脚: width of the top part and of the bottom part, about their own centres. */
  topWidth: number;
  bottomWidth: number;
  /** 冠/脚: height of the bottom part, kept on its base line (less than 1 opens the gap above it). */
  bottomHeight: number;
}

/** Medians from the teacher study. */
export const SHODO_STRUCTURE_RULES: ShodoStructureRules = {
  aspect: { leftRight: 1, topBottom: .885, enclosure: .955, tare: .95, nyo: .93, single: .885, kana: .93 },
  topWidth: .97,
  bottomWidth: .94,
  bottomHeight: .95,
};

type Box = [number, number, number, number];

function boxOf(strokes: readonly ShodoStrokeSpec[], indices: readonly number[]): Box | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const i of indices) for (const [x, y] of strokes[i]?.points ?? []) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return x1 >= x0 ? [x0, y0, x1, y1] : null;
}

/** Map every point of the chosen strokes. Hooks are directions and stay as they are. */
function move(strokes: ShodoStrokeSpec[], indices: readonly number[], f: (p: ShodoPoint) => ShodoPoint): void {
  for (const i of indices) {
    const s = strokes[i];
    if (s) strokes[i] = { ...s, points: s.points.map(p => { const [x, y] = f(p); return [Math.round(x), Math.round(y)] as const; }) };
  }
}

const has = (kids: readonly ShodoPart[], ...positions: ShodoPartPosition[]) => positions.every(p => kids.some(k => k.position === p));
const part = (kids: readonly ShodoPart[], position: ShodoPartPosition) => kids.find(k => k.position === position);

/** The top-level layout of a glyph, from its component tree. */
export function shodoLayout(glyph: ShodoGlyph): ShodoLayout {
  const code = glyph.char.codePointAt(0) ?? 0;
  if (code >= 0x3041 && code <= 0x30FF) return "kana";
  const kids = glyph.parts?.children ?? [];
  if (has(kids, "top", "bottom")) return "topBottom";
  if (has(kids, "left", "right")) return "leftRight";
  if (kids.some(k => k.position === "kamae")) return "enclosure";
  if (has(kids, "tare", "tarec")) return "tare";
  if (has(kids, "nyo", "nyoc")) return "nyo";
  return "single";
}

/** Apply the teacher's layout habits to a glyph. Pure; returns a new glyph. */
export function shodoStructure(glyph: ShodoGlyph, overrides: Partial<ShodoStructureRules> = {}): ShodoGlyph {
  const r = { ...SHODO_STRUCTURE_RULES, ...overrides, aspect: { ...SHODO_STRUCTURE_RULES.aspect, ...overrides.aspect } };
  const layout = shodoLayout(glyph);
  const strokes = glyph.strokes.map(s => ({ ...s }));
  const all = strokes.map((_, i) => i);
  const whole = boxOf(strokes, all);
  if (!whole) return glyph;
  if (layout === "topBottom") {
    const kids = glyph.parts?.children ?? [];
    const top = part(kids, "top")!, bottom = part(kids, "bottom")!;
    const tb = boxOf(strokes, top.strokes), bb = boxOf(strokes, bottom.strokes);
    if (tb) { const c = (tb[0] + tb[2]) / 2; move(strokes, top.strokes, ([x, y]) => [c + (x - c) * r.topWidth, y]); }
    if (bb) {
      const c = (bb[0] + bb[2]) / 2;
      move(strokes, bottom.strokes, ([x, y]) => [c + (x - c) * r.bottomWidth, bb[3] - (bb[3] - y) * r.bottomHeight]);
    }
  }
  // The whole character's proportion, about its own centre line.
  const aspect = r.aspect[layout], cx = (whole[0] + whole[2]) / 2;
  if (aspect !== 1) move(strokes, all, ([x, y]) => [cx + (x - cx) * aspect, y]);
  return { ...glyph, strokes };
}
