/**
 * SHO1 glyphs: a character is an ordered list of strokes. A stroke is a centreline in a
 * 1000×1000 em box (y down) plus the technique the hand uses to start, turn and end it.
 *
 * The geometry says WHERE the mark lies; `start`, `turns` and `end` say HOW the brush
 * makes it. The hand model in `shodo-hand.ts` turns both into brush motion.
 *
 * Bundled glyphs are original centrelines authored for this library (see the SHO1
 * reference study). KanjiVG data is never bundled: `parseKanjiVgSvg` reads a file the
 * host supplies, and that output carries KanjiVG's CC BY-SA 3.0 terms.
 */

/** 点画 families. They choose the default start and end technique. */
export type ShodoStrokeKind =
  | "dot"          // 点 ten
  | "horizontal"   // 横画 yokoga
  | "vertical"     // 縦画 tatega
  | "left-sweep"   // 左払い hidaribarai
  | "right-sweep"  // 右払い migibarai
  | "rise"         // 提 / 右上はらい: a short up-right stroke
  | "turn"         // 転折 tensetsu: one or more corners
  | "curve";       // 曲がり magari / 反り sori

/** 始筆 / 起筆 — how the brush is put to the paper (筆をつける). */
export type ShodoStart =
  | "uchikomi"   // 打ち込み: 45° press toward the lower right, hold, ease back (方筆)
  | "zoho"       // 蔵鋒 (逆入): enter against the direction, turn, hide the tip (円筆)
  | "roho";      // 露鋒: land while moving, tip left visible

/** 終筆 / 収筆 — how the stroke stops or leaves the paper. */
export type ShodoEnd =
  | "tome"       // 止め (and 垂露 on a vertical): lift a little, re-press, gather the tip, lift
  | "hane"       // 撥ね: pause, short 45° line, flick toward `hook`
  | "harai"      // 払い: lift while moving (right sweeps make a pressed foot first)
  | "nuki";      // 懸針 / 抜き: lift while moving to a needle point, no foot

export type ShodoPoint = readonly [number, number];

export interface ShodoStrokeSpec {
  kind: ShodoStrokeKind;
  /** Ordered centreline of the visible mark, em units (0..1000, y down). 2..24 points. */
  points: readonly ShodoPoint[];
  /** Indices of 転折 corners in `points` (stop, re-press, change direction). */
  turns?: readonly number[];
  start?: ShodoStart;
  end?: ShodoEnd;
  /** Direction of a 撥ね flick, as a vector; default is up-left. */
  hook?: ShodoPoint;
  /** Thickness multiplier for this stroke, 0.4..1.8. */
  weight?: number;
  /**
   * The stroke starts or ends on another stroke (接筆), as the inner lines of 口 and 目 do.
   * The hand then writes a small head or a quiet stop that disappears into the other line
   * instead of a full 打ち込み or 止め knob. Set by `shodoJoinStrokes`.
   */
  joinStart?: boolean;
  joinEnd?: boolean;
}

export interface ShodoGlyph {
  char: string;
  strokes: readonly ShodoStrokeSpec[];
  /** Data provenance; `kanjivg` output must be credited to KanjiVG (CC BY-SA 3.0). */
  source: "original" | "kanjivg";
}

export const SHODO_DEFAULT_START: Record<ShodoStrokeKind, ShodoStart> = {
  dot: "uchikomi", horizontal: "uchikomi", vertical: "uchikomi", "left-sweep": "uchikomi",
  "right-sweep": "roho", rise: "uchikomi", turn: "uchikomi", curve: "uchikomi",
};
export const SHODO_DEFAULT_END: Record<ShodoStrokeKind, ShodoEnd> = {
  dot: "tome", horizontal: "tome", vertical: "tome", "left-sweep": "harai",
  "right-sweep": "harai", rise: "harai", turn: "tome", curve: "tome",
};

export const resolveStart = (s: ShodoStrokeSpec): ShodoStart => s.start ?? SHODO_DEFAULT_START[s.kind];
export const resolveEnd = (s: ShodoStrokeSpec): ShodoEnd => s.end ?? SHODO_DEFAULT_END[s.kind];

/**
 * Original kaisho centrelines. Proportions follow the studied teaching models by eye;
 * nothing was traced. Coordinates leave a margin so wide strokes stay inside the em box.
 */
export const SHODO_GLYPHS: Readonly<Record<string, ShodoGlyph>> = {
  "一": {
    char: "一", source: "original", strokes: [
      { kind: "horizontal", points: [[150, 512], [500, 492], [850, 478]], weight: 1.12 },
    ],
  },
  "二": {
    char: "二", source: "original", strokes: [
      { kind: "horizontal", points: [[285, 335], [520, 322], [715, 314]], weight: .95 },
      { kind: "horizontal", points: [[150, 682], [500, 664], [855, 652]], weight: 1.1 },
    ],
  },
  "三": {
    char: "三", source: "original", strokes: [
      { kind: "horizontal", points: [[250, 225], [500, 212], [730, 204]], weight: .92 },
      { kind: "horizontal", points: [[300, 470], [500, 461], [690, 455]], weight: .85 },
      { kind: "horizontal", points: [[150, 760], [500, 742], [858, 730]], weight: 1.12 },
    ],
  },
  "永": {
    char: "永", source: "original", strokes: [
      // 1 側 — the dot
      { kind: "dot", points: [[474, 58], [528, 150]], weight: 1.12 },
      // 2 勒 + 努 + 趯 — short horizontal, 転折, the pillar, 撥ね
      { kind: "turn", points: [[318, 300], [540, 268], [532, 520], [528, 850]], turns: [1], end: "hane",
        hook: [-.86, -.5], weight: 1.05 },
      // 3 策 + 掠 — horizontal, 転折, long left sweep
      { kind: "turn", points: [[205, 498], [420, 462], [352, 600], [250, 720], [118, 812]], turns: [1],
        end: "harai", weight: .98 },
      // 4 啄 — short left sweep from the upper right
      { kind: "left-sweep", points: [[790, 372], [700, 452], [592, 520]], weight: .95 },
      // 5 磔 — right sweep with its foot
      { kind: "right-sweep", points: [[585, 540], [680, 650], [780, 762], [935, 830]], weight: 1.08 },
    ],
  },
  "道": {
    char: "道", source: "original", strokes: [
      // 首
      { kind: "dot", points: [[440, 75], [492, 148]], weight: .95 },
      { kind: "left-sweep", points: [[690, 55], [648, 110], [592, 165]], weight: 1 },
      { kind: "horizontal", points: [[338, 228], [580, 212], [800, 198]], weight: 1 },
      { kind: "left-sweep", points: [[565, 238], [530, 280], [492, 312]], weight: .85 },
      { kind: "vertical", points: [[448, 322], [450, 520], [452, 720]], weight: 1 },
      { kind: "turn", points: [[452, 318], [728, 300], [720, 520], [714, 720]], turns: [1], weight: 1 },
      { kind: "horizontal", points: [[472, 435], [588, 431], [700, 427]], weight: .8 },
      { kind: "horizontal", points: [[472, 550], [588, 546], [700, 542]], weight: .8 },
      { kind: "horizontal", points: [[464, 712], [590, 708], [706, 704]], weight: .85 },
      // 辶: a short heavy dot, the zigzag, then the long sweep with its flat chisel end
      { kind: "dot", points: [[195, 222], [258, 300]], weight: 1.05 },
      { kind: "turn", points: [[45, 470], [150, 452], [252, 430], [165, 548], [290, 665], [205, 790]], turns: [2, 3],
        end: "tome", weight: .95 },
      { kind: "right-sweep", points: [[85, 815], [200, 850], [440, 880], [660, 898], [830, 912], [990, 884]],
        start: "uchikomi", weight: 1.02 },
    ],
  },
  "山": {
    char: "山", source: "original", strokes: [
      { kind: "vertical", points: [[500, 120], [502, 450], [500, 770]], weight: 1.05 },
      { kind: "turn", points: [[195, 365], [198, 780], [810, 772]], turns: [1], weight: 1 },
      { kind: "vertical", points: [[808, 330], [808, 560], [806, 800]], weight: 1 },
    ],
  },
  "心": {
    char: "心", source: "original", strokes: [
      { kind: "dot", points: [[150, 520], [212, 640]], weight: 1.05 },
      { kind: "curve", points: [[320, 300], [340, 620], [430, 805], [640, 820], [740, 760]], end: "hane",
        hook: [.15, -1], weight: 1.05 },
      { kind: "dot", points: [[468, 185], [548, 300]], weight: 1.05 },
      { kind: "dot", points: [[732, 368], [842, 520]], weight: 1.12 },
    ],
  },
};

export interface ShodoGlyphIssue { path: string; message: string }

export function inspectShodoGlyph(glyph: ShodoGlyph): ShodoGlyphIssue[] {
  const issues: ShodoGlyphIssue[] = [];
  if (!glyph || typeof glyph.char !== "string" || [...glyph.char].length !== 1)
    issues.push({ path: "/char", message: "A glyph needs exactly one character." });
  if (!glyph || !glyph.strokes || glyph.strokes.length < 1 || glyph.strokes.length > 40)
    return [...issues, { path: "/strokes", message: "A glyph needs 1..40 strokes." }];
  glyph.strokes.forEach((s, i) => {
    const at = "/strokes/" + i;
    const points: readonly ShodoPoint[] = s.points;
    if (!points || points.length < 2 || points.length > 24) {
      issues.push({ path: at + "/points", message: "A stroke needs 2..24 points." });
      return;
    }
    if (points.some((p: ShodoPoint) => p.length !== 2 || p.some((v: number) => !Number.isFinite(v) || v < -100 || v > 1100)))
      issues.push({ path: at + "/points", message: "Points are [x, y] within -100..1100 em units." });
    if (s.turns?.some((t: number) => !Number.isInteger(t) || t < 1 || t > points.length - 2))
      issues.push({ path: at + "/turns", message: "Turn indices must be interior points." });
    if (s.weight !== undefined && (!Number.isFinite(s.weight) || s.weight < .4 || s.weight > 1.8))
      issues.push({ path: at + "/weight", message: "Weight must be 0.4..1.8." });
    if (s.hook && (s.hook.length !== 2 || Math.hypot(s.hook[0], s.hook[1]) < 1e-3))
      issues.push({ path: at + "/hook", message: "Hook must be a nonzero [dx, dy]." });
  });
  return issues;
}

// ── KanjiVG adapter ────────────────────────────────────────────────────────────────

/** KanjiVG stroke classes (kvg:type, first alternative) → kind and end technique. */
const KVG_TYPES: Record<string, { kind: ShodoStrokeKind; end?: ShodoEnd }> = {
  "㇐": { kind: "horizontal" }, "㇑": { kind: "vertical" }, "㇒": { kind: "left-sweep" },
  "㇏": { kind: "right-sweep" }, "㇔": { kind: "dot" }, "㇀": { kind: "rise" },
  "㇕": { kind: "turn" }, "㇄": { kind: "turn" }, "㇗": { kind: "turn" },
  "㇆": { kind: "turn", end: "hane" }, "㇚": { kind: "vertical", end: "hane" },
  "㇙": { kind: "vertical", end: "hane" }, "㇟": { kind: "turn", end: "hane" },
  "㇃": { kind: "curve", end: "hane" }, "㇂": { kind: "curve", end: "hane" },
  "㇁": { kind: "curve", end: "hane" }, "㇖": { kind: "horizontal", end: "hane" },
  "㇈": { kind: "turn", end: "hane" }, "㇉": { kind: "turn", end: "hane" },
  "㇇": { kind: "turn", end: "harai" }, "㇋": { kind: "turn", end: "harai" },
  "㇓": { kind: "left-sweep" }, "㇌": { kind: "turn", end: "harai" },
  "㇅": { kind: "turn", end: "tome" }, "㇛": { kind: "turn", end: "tome" },
  "㇜": { kind: "turn", end: "tome" }, "㇞": { kind: "turn", end: "tome" },
  "㇊": { kind: "turn", end: "hane" }, "㇍": { kind: "turn", end: "tome" },
  "㇎": { kind: "turn", end: "harai" }, "㇝": { kind: "curve", end: "harai" },
  "㇠": { kind: "turn", end: "hane" }, "㇡": { kind: "turn", end: "hane" },
  "㇢": { kind: "curve", end: "hane" }, "㇣": { kind: "curve", end: "tome" },
};

type Vec = [number, number];

/** Parse SVG path data (M/L/C/S/Q/H/V/Z, absolute and relative) into a sampled polyline. */
export function samplePathData(d: string, samplesPerCurve = 10): Vec[] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const out: Vec[] = [];
  let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0, lcx = 0, lcy = 0, prev = "";
  const num = () => Number(tokens[i++]);
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    for (let k = 1; k <= samplesPerCurve; k++) {
      const t = k / samplesPerCurve, u = 1 - t;
      out.push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]);
    }
    lcx = x2; lcy = y2; x = x3; y = y3;
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase(), c = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (c === "M") {
      x = ox + num(); y = oy + num(); sx = x; sy = y; out.push([x, y]);
      cmd = rel ? "l" : "L";
    } else if (c === "L") { x = ox + num(); y = oy + num(); out.push([x, y]); }
    else if (c === "H") { x = ox + num(); out.push([x, y]); }
    else if (c === "V") { y = oy + num(); out.push([x, y]); }
    else if (c === "C") {
      const a = [num(), num(), num(), num(), num(), num()];
      cubic(ox + a[0], oy + a[1], ox + a[2], oy + a[3], ox + a[4], oy + a[5]);
    } else if (c === "S") {
      const r1x = /[CS]/i.test(prev) ? 2 * x - lcx : x, r1y = /[CS]/i.test(prev) ? 2 * y - lcy : y;
      const a = [num(), num(), num(), num()];
      cubic(r1x, r1y, ox + a[0], oy + a[1], ox + a[2], oy + a[3]);
    } else if (c === "Q") {
      const qx = ox + num(), qy = oy + num(), ex = ox + num(), ey = oy + num();
      cubic(x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), ex + 2 / 3 * (qx - ex), ey + 2 / 3 * (qy - ey), ex, ey);
    } else if (c === "Z") { x = sx; y = sy; out.push([x, y]); }
    else throw new RangeError("Unsupported SVG path command: " + cmd);
    prev = c;
    if (Number.isNaN(x) || Number.isNaN(y)) throw new RangeError("Malformed SVG path data.");
  }
  return out;
}

/** Ramer–Douglas–Peucker simplification that always keeps the end points. */
function simplify(points: Vec[], tolerance: number): Vec[] {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  let worst = 0, index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const dist = Math.abs((points[i][0] - a[0]) * dy - (points[i][1] - a[1]) * dx) / len;
    if (dist > worst) { worst = dist; index = i; }
  }
  if (worst <= tolerance) return [a, b];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

/** Hiragana and katakana (including small and voiced forms). */
export function isKanaChar(char: string): boolean {
  const c = char.codePointAt(0) ?? 0;
  return c >= 0x3041 && c <= 0x30FF;
}

/**
 * Drop a drawn entry or exit flourish: KanjiVG starts and ends many strokes with a tiny
 * curl that stands for the brush entry or stop. The hand makes its own 起筆 and 終筆,
 * so a curl that turns more than ~35° from the stroke's course is removed.
 */
function trimFlourish(raw: Vec[]): Vec[] {
  const arc = [0];
  for (let i = 1; i < raw.length; i++) arc.push(arc[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const total = arc[arc.length - 1];
  if (total < 120 || raw.length < 6) return raw;
  const at = (s: number) => raw[Math.max(0, arc.findIndex(a => a >= s))] ?? raw[raw.length - 1];
  const dir = (a: Vec, b: Vec) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  const turn = (x: number, y: number) => Math.abs(Math.atan2(Math.sin(x - y), Math.cos(x - y)));
  // KanjiVG's pen-style entry and exit curls span up to ~5 of its 109 units (≈ 50 em).
  const lead = Math.min(55, total * .12);
  let from = 0, to = raw.length - 1;
  if (turn(dir(raw[0], at(lead)), dir(at(lead), at(lead * 2.5))) > .26) from = Math.max(0, arc.findIndex(a => a >= lead));
  if (turn(dir(at(total - lead), raw[raw.length - 1]), dir(at(total - lead * 2.5), at(total - lead))) > .26)
    to = Math.max(from + 1, arc.findIndex(a => a >= total - lead));
  return raw.slice(from, to + 1);
}

/** Convert one sampled centreline (em units) and its stroke class into a SHO1 stroke. */
export function strokeFromCentreline(raw: Vec[], kvgType = "", kana = false): ShodoStrokeSpec {
  const typed = KVG_TYPES[[...kvgType.split("/")[0]][0] ?? ""];
  const hooked = typed?.end === "hane";
  if (!hooked) raw = trimFlourish(raw);
  let points = simplify(raw, 9);
  if (points.length > 24) points = points.filter((_, i) => i % Math.ceil(points.length / 24) === 0 || i === points.length - 1);
  // Corners sharper than ~55° become 転折; gentle bends stay curves.
  const turns: number[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const ax = points[i][0] - points[i - 1][0], ay = points[i][1] - points[i - 1][1];
    const bx = points[i + 1][0] - points[i][0], by = points[i + 1][1] - points[i][1];
    const cos = (ax * bx + ay * by) / ((Math.hypot(ax, ay) * Math.hypot(bx, by)) || 1);
    if (cos < .57) turns.push(i);
  }
  let kind: ShodoStrokeKind = typed?.kind ?? "curve";
  let end: ShodoEnd | undefined = typed?.end;
  let hook: ShodoPoint | undefined;
  if (end === "hane" && points.length >= 3) {
    // KanjiVG draws the hook as the last short segment: the brush flicks along it.
    const a = points[points.length - 2], b = points[points.length - 1];
    hook = [b[0] - a[0], b[1] - a[1]];
    points = points.slice(0, -1);
    while (turns.length && turns[turns.length - 1] >= points.length - 1) turns.pop();
  }
  if (!typed) {
    const a = points[0], b = points[points.length - 1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    if (turns.length) kind = "turn";
    else if (length < 140) kind = "dot";
    else if (Math.abs(dy) < Math.abs(dx) * .35) kind = "horizontal";
    else if (Math.abs(dx) < Math.abs(dy) * .25) kind = "vertical";
    else kind = dx < 0 ? "left-sweep" : "right-sweep";
    end = undefined;
  }
  if (turns.length && kind !== "turn" && kind !== "curve") kind = "turn";
  const rounded = points.map(p => [Math.round(p[0]), Math.round(p[1])] as const);
  // ㇏a is 平捺, the flat sweep of 辶 and 廴: in kaisho it starts with a pressed head.
  const flatSweep = kvgType.split("/")[0].startsWith("㇏a");
  if (kana) {
    // かな are written with flowing curves: an exposed-tip entry, no kaisho corner
    // presses, and an end that lifts while moving unless the stroke is a dot or a hook.
    const dot = kind === "dot";
    return { kind: dot ? "dot" : turns.length || points.length > 3 ? "curve" : kind, points: rounded,
      start: dot ? "uchikomi" : "roho", ...(dot ? {} : { end: hook ? "hane" : "nuki" }), ...(hook ? { hook } : {}), weight: .86 };
  }
  return { kind, points: rounded, ...(flatSweep ? { start: "uchikomi" as const } : {}),
    ...(turns.length ? { turns } : {}), ...(end ? { end } : {}), ...(hook ? { hook } : {}) };
}

/**
 * Read a KanjiVG SVG document (text). Strokes are taken in document order, which is
 * KanjiVG's stroke order. The result is marked `source: "kanjivg"` so hosts can credit
 * KanjiVG (CC BY-SA 3.0, http://kanjivg.tagaini.net).
 */
export function parseKanjiVgSvg(svg: string, char?: string): ShodoGlyph {
  if (typeof svg !== "string" || !svg.includes("<path")) throw new RangeError("Expected a KanjiVG SVG document.");
  const viewBox = /viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*"/.exec(svg);
  const [vx, vy, vw, vh] = viewBox ? viewBox.slice(1).map(Number) : [0, 0, 109, 109];
  const scale = 1000 / Math.max(vw, vh);
  const strokes: ShodoStrokeSpec[] = [];
  const named = char ?? /kvg:element="([^"]+)"/.exec(svg)?.[1] ?? "";
  const kana = isKanaChar(named);
  const pathTag = /<path\b([^>]*)>/g;
  for (let m = pathTag.exec(svg); m; m = pathTag.exec(svg)) {
    const attrs = m[1];
    const d = /\sd="([^"]+)"/.exec(attrs)?.[1];
    if (!d) continue;
    const type = /kvg:type="([^"]*)"/.exec(attrs)?.[1] ?? "";
    const raw = samplePathData(d).map(([x, y]) => [(x - vx) * scale, (y - vy) * scale] as Vec);
    strokes.push(strokeFromCentreline(raw, type, kana));
  }
  if (!strokes.length) throw new RangeError("The KanjiVG document has no stroke paths.");
  const element = /kvg:element="([^"]+)"/.exec(svg)?.[1];
  return { char: char ?? element ?? "?", source: "kanjivg", strokes };
}

const polyDistance = (points: readonly ShodoPoint[], q: ShodoPoint): { d: number; at: ShodoPoint } => {
  let best = { d: Infinity, at: points[0] as ShodoPoint };
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i], points[i + 1]], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2));
    const at: ShodoPoint = [a[0] + dx * t, a[1] + dy * t];
    const d = Math.hypot(at[0] - q[0], at[1] - q[1]);
    if (d < best.d) best = { d, at };
  }
  return best;
};

/**
 * Find stroke ends that meet an earlier stroke (closer than `reach` em) and mark them as joins.
 * With `snap`, a horizontal, vertical or turn end is also moved along its own line onto the
 * other stroke's centreline, so the inner lines of boxes close cleanly.
 */
export function shodoJoinStrokes(glyph: ShodoGlyph, reach = 70, snap = true): ShodoGlyph {
  const strokes: ShodoStrokeSpec[] = glyph.strokes.map(st => ({ ...st, points: st.points.map(p => [p[0], p[1]] as ShodoPoint) }));
  strokes.forEach((st, i) => {
    if (st.kind === "dot") return;
    const points = st.points as ShodoPoint[];
    for (const [index, key] of [[0, "joinStart"], [points.length - 1, "joinEnd"]] as const) {
      const e = points[index];
      let best: { d: number; at: ShodoPoint } | null = null;
      // Only a line already on the paper can take the join (earlier in stroke order).
      glyph.strokes.forEach((other, j) => {
        if (j >= i || other.kind === "dot") return;
        const hit = polyDistance(other.points, e);
        if (hit.d < reach && (!best || hit.d < best.d)) best = hit;
      });
      if (!best) continue;
      const hit: { d: number; at: ShodoPoint } = best;
      st[key] = true;
      if (!snap || (st.kind !== "horizontal" && st.kind !== "vertical" && st.kind !== "turn")) continue;
      // Move the end along the stroke's own direction to meet the other line; an end stops
      // a little short of that line's centre so its stop hides inside it.
      const nb = points[index === 0 ? 1 : index - 1];
      const dx = e[0] - nb[0], dy = e[1] - nb[1], dl = Math.hypot(dx, dy) || 1;
      const along = ((hit.at[0] - e[0]) * dx + (hit.at[1] - e[1]) * dy) / dl - (index === 0 ? 0 : 26);
      if (Math.abs(along) < reach) points[index] = [Math.round(e[0] + dx / dl * along), Math.round(e[1] + dy / dl * along)];
    }
  });
  return { ...glyph, strokes };
}

export interface ShodoFormOptions {
  /** 右上がり: horizontals rise to the right by this angle, in degrees. 0..8. */
  rise?: number;
  /** Length factor for 払い strokes, measured from their start (brush kaisho extends sweeps). 1..1.4. */
  sweep?: number;
  /** Length factor for the main horizontal (主画), about its centre. 1..1.3. */
  main?: number;
}

/**
 * Give a typeface-like skeleton (for example KanjiVG) the habits of brush kaisho:
 * - 右上がり as a gentle shear, so verticals stay vertical and joints stay closed;
 * - weight from length, so main strokes carry the character and short ones stay light;
 * - 懸針 for a final vertical that hangs below the rest of the character;
 * - a pressed foot on every 右払い.
 * Kana keep their curves and get only half the rise.
 */
export function shodoKaishoForm(glyph: ShodoGlyph, options: ShodoFormOptions = {}): ShodoGlyph {
  const kana = isKanaChar(glyph.char);
  const length = (st: ShodoStrokeSpec) => st.points.reduce((a, p, i) => i ? a + Math.hypot(p[0] - st.points[i - 1][0], p[1] - st.points[i - 1][1]) : 0, 0);
  const rise = Math.tan((options.rise ?? 3.5) * (kana ? .5 : 1) * Math.PI / 180);
  const sweep = kana ? 1 : options.sweep ?? 1.16;
  // 主画: one horizontal carries the character; it is written longer than the rest.
  const mainFactor = kana ? 1 : options.main ?? 1.1;
  const horizontals = glyph.strokes.map((st, i) => ({ i, st })).filter(({ st }) => st.kind === "horizontal");
  const mainIndex = horizontals.length >= 1 ? horizontals.reduce((a, b) => length(b.st) > length(a.st) ? b : a).i : -1;
  const all = glyph.strokes.flatMap(st => st.points);
  const cx = (Math.min(...all.map(p => p[0])) + Math.max(...all.map(p => p[0]))) / 2;
  const bottom = Math.max(...all.map(p => p[1]));
  const longest = Math.max(...glyph.strokes.map(length));
  const strokes = glyph.strokes.map((st, i): ShodoStrokeSpec => {
    let points: ShodoPoint[] = st.points.map(([x, y]) => [x, Math.round(y - (x - cx) * rise)] as const);
    const out: ShodoStrokeSpec = { ...st, points };
    if (st.weight === undefined) out.weight = Math.round(Math.min(1.1, Math.max(.84, .86 + .26 * length(st) / longest)) * 100) / 100;
    const last = i === glyph.strokes.length - 1, end = st.points[st.points.length - 1];
    if (!kana && last && st.kind === "vertical" && !st.end && end[1] >= bottom - 2 && length(st) > 450) out.end = "nuki";
    // Teachers' kaisho carries its sweeps further than a typeface skeleton: extend 払い
    // strokes from their start so the free end reaches out (大, 人, 永, 水, 有).
    const sweeping = st.kind === "left-sweep" || st.kind === "right-sweep" || (st.end ?? "") === "harai";
    if (i === mainIndex && mainFactor !== 1) {
      const cxs = (points[0][0] + points[points.length - 1][0]) / 2, cys = (points[0][1] + points[points.length - 1][1]) / 2;
      points = points.map(([x, y]) => [Math.round(cxs + (x - cxs) * mainFactor), Math.round(cys + (y - cys) * mainFactor)] as const);
      out.points = points;
    }
    if (sweeping && sweep !== 1 && !st.turns?.length) {
      const [x0, y0] = points[0];
      points = points.map(([x, y], k) => k === 0 ? [x, y] as const : [Math.round(x0 + (x - x0) * sweep), Math.round(y0 + (y - y0) * sweep)] as const);
      out.points = points;
    }
    if (st.kind === "right-sweep" && points.length < 3) {
      const [a, b] = [points[0], points[points.length - 1]];
      points = [a, [Math.round(a[0] + (b[0] - a[0]) * .72), Math.round(a[1] + (b[1] - a[1]) * .74)], b];
      out.points = points;
    }
    return out;
  });
  return shodoJoinStrokes({ ...glyph, strokes });
}

/** KanjiVG file name for a character, for example 道 → "09053.svg". */
export function kanjiVgFileName(char: string): string {
  const code = char.codePointAt(0);
  if (code === undefined) throw new RangeError("A character is required.");
  return code.toString(16).padStart(5, "0") + ".svg";
}
