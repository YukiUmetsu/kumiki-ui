/** ScaleComparisonStage core: items of one dimension on one shared, labelled scale, with exact unit conversions.
 * A compare beat shows an exact ratio with a stated rounding rule; a convert beat shows the arithmetic. Every
 * label is measured and wrapped, never truncated; overlaps and overflow are diagnostics. Units are exact
 * rationals (BigInt), so conversions print exactly. Layout takes an injected font measurer; evaluation is a
 * pure function of the frame, with no clock and no randomness.
 */
import type { MeasureText } from "../media/text-layout";
import { niceStep } from "../infographic/primitives";
import { evaluateEasing } from "../motion/easing";
import type { Diagnostic, RationalFps, Rect } from "../motion/types";

export type ScaleDimension = "length" | "time" | "count" | "quantity";

export interface ScaleUnit {
  /** Display symbol, unique across the catalog. */
  symbol: string;
  dimension: ScaleDimension;
  /** Exact size of one unit in the base unit of its dimension: an integer, a decimal, or "num/den". */
  factor: string;
}

const BASE_SYMBOL: Record<ScaleDimension, string> = { length: "m", time: "s", count: "item", quantity: "kg" };

export const SCALE_UNITS: readonly ScaleUnit[] = [
  { symbol: "mm", dimension: "length", factor: "0.001" },
  { symbol: "cm", dimension: "length", factor: "0.01" },
  { symbol: "m", dimension: "length", factor: "1" },
  { symbol: "km", dimension: "length", factor: "1000" },
  { symbol: "in", dimension: "length", factor: "0.0254" },
  { symbol: "ft", dimension: "length", factor: "0.3048" },
  { symbol: "mi", dimension: "length", factor: "1609.344" },
  { symbol: "au", dimension: "length", factor: "149597870700" },
  { symbol: "ly", dimension: "length", factor: "9460730472580800" },
  { symbol: "ms", dimension: "time", factor: "0.001" },
  { symbol: "s", dimension: "time", factor: "1" },
  { symbol: "min", dimension: "time", factor: "60" },
  { symbol: "h", dimension: "time", factor: "3600" },
  { symbol: "d", dimension: "time", factor: "86400" },
  { symbol: "yr", dimension: "time", factor: "31557600" },
  { symbol: "item", dimension: "count", factor: "1" },
  { symbol: "k items", dimension: "count", factor: "1000" },
  { symbol: "M items", dimension: "count", factor: "1000000" },
  { symbol: "g", dimension: "quantity", factor: "0.001" },
  { symbol: "kg", dimension: "quantity", factor: "1" },
  { symbol: "t", dimension: "quantity", factor: "1000" },
  { symbol: "kt", dimension: "quantity", factor: "1000000" },
  { symbol: "Mt", dimension: "quantity", factor: "1000000000" },
];

export interface ScaleRatio { n: bigint; d: bigint }

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a, y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

/** Parses an exact factor: "1000", "0.0254" or "1609344/1000". Returns undefined for anything else. */
export function parseExactFactor(text: string): ScaleRatio | undefined {
  const match = /^(\d+)(?:\/(\d+)|\.(\d+))?$/.exec(text.trim());
  if (!match) return undefined;
  const [, whole, den, decimals] = match;
  let n = BigInt(whole), d = den !== undefined ? BigInt(den) : 1n;
  if (decimals !== undefined) { n = BigInt(whole + decimals); d = 10n ** BigInt(decimals.length); }
  if (d === 0n || n === 0n) return undefined;
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

/** The exact value as text: a terminating decimal when it has one ("0.0254"), otherwise "num/den". */
export function exactFactorText(ratio: ScaleRatio): string {
  let d = ratio.d, twos = 0, fives = 0;
  while (d % 2n === 0n) { d /= 2n; twos++; }
  while (d % 5n === 0n) { d /= 5n; fives++; }
  if (d !== 1n) return `${groupDigits(ratio.n.toString())}/${ratio.d}`;
  const places = Math.max(twos, fives);
  const scaled = (ratio.n * 10n ** BigInt(places)) / ratio.d;
  const digits = scaled.toString().padStart(places + 1, "0");
  const whole = digits.slice(0, digits.length - places), fraction = digits.slice(digits.length - places).replace(/0+$/, "");
  return `${groupDigits(whole)}${fraction ? `.${fraction}` : ""}`;
}

const groupDigits = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Rounds to `digits` significant figures, half away from zero. */
export function roundSignificant(value: number, digits: number): number {
  if (!Number.isFinite(value) || value === 0) return value;
  const magnitude = Math.abs(value);
  let exponent = Math.floor(Math.log10(magnitude));
  if (magnitude / 10 ** exponent >= 10) exponent += 1;
  if (magnitude / 10 ** exponent < 1) exponent -= 1;
  const scale = 10 ** (digits - 1 - exponent);
  return (Math.sign(value) * Math.round(magnitude * scale)) / scale;
}

/** Grouped digits ("695,700"), optionally rounded to significant figures first. */
export function formatScaleNumber(value: number, digits?: number): string {
  const rounded = digits === undefined ? value : roundSignificant(value, digits);
  const text = String(Number(rounded.toPrecision(15)));
  const negative = text.startsWith("-");
  const [whole, fraction] = (negative ? text.slice(1) : text).split(".");
  return `${negative ? "-" : ""}${groupDigits(whole)}${fraction ? `.${fraction}` : ""}`;
}

export type ScaleScale = "linear" | "log";
export type ScaleMarks = "bar" | "dot" | "circle";
export type ScaleItemKind = "real" | "illustrative";
export type ScaleOrder = "declared" | "size-ascending" | "size-descending";

export interface ScaleItem {
  id: string;
  label: string;
  value: number;
  unit: string;
  kind: ScaleItemKind;
  /** Named public source. Required when `kind` is "real". */
  source?: string;
}

export type ScaleComparisonBeat =
  | { id: string; kind: "establish"; durationFrames: number; caption?: string }
  | { id: string; kind: "reveal"; order?: ScaleOrder; itemIds?: readonly string[]; durationFrames: number; caption?: string }
  | { id: string; kind: "compare"; a: string; b: string; sig?: number; durationFrames: number; caption?: string }
  | { id: string; kind: "convert"; itemId: string; unit: string; sig?: number; durationFrames: number; caption?: string };

export interface ScaleComparisonSpec {
  id: string;
  title?: string;
  fps: RationalFps;
  items: readonly ScaleItem[];
  /** Unit for the axis labels. Must measure the items' dimension. */
  axisUnit: string;
  scale: ScaleScale;
  /** "bar": a column from zero (linear only). "circle": a circle whose radius is the value, to one linear scale.
   * "dot": a position on the axis (linear or log). */
  marks: ScaleMarks;
  beats: readonly ScaleComparisonBeat[];
  /** Printed at the bottom of the stage, e.g. the approximation note. */
  footnote?: string;
  /** Extra unit definitions beyond the built-in catalog. */
  units?: readonly ScaleUnit[];
  /** Frames for the emphasis to fade in and out. Default 18. */
  moveFrames?: number;
}

export interface ScaleDiagnostic extends Diagnostic { itemId?: string; beatId?: string }

interface ResolvedItem { item: ScaleItem; dimension: ScaleDimension; ratio: ScaleRatio; factor: number; base: number }
type Catalog = Map<string, { unit: ScaleUnit; ratio: ScaleRatio; factor: number }>;

function buildCatalog(extra: readonly ScaleUnit[] = []): Catalog {
  const map: Catalog = new Map();
  for (const unit of [...SCALE_UNITS, ...extra]) {
    if (map.has(unit.symbol)) continue;
    const ratio = parseExactFactor(unit.factor);
    if (ratio) map.set(unit.symbol, { unit, ratio, factor: Number(ratio.n) / Number(ratio.d) });
  }
  return map;
}

interface Resolved {
  catalog: Catalog;
  /** Dimension of the first item with a known unit; the shared scale uses it. */
  dimension?: ScaleDimension;
  /** Every item with a known unit, in declared order. */
  known: ResolvedItem[];
  /** First occurrence per id, for beats. */
  byId: Map<string, ResolvedItem>;
  /** Items that are drawn: the shared dimension, finite, and valid for the scale. */
  included: ResolvedItem[];
}

function resolveScale(spec: ScaleComparisonSpec): Resolved {
  const catalog = buildCatalog(spec.units);
  const known: ResolvedItem[] = [];
  for (const item of spec.items) {
    const entry = catalog.get(item.unit);
    if (entry) known.push({ item, dimension: entry.unit.dimension, ratio: entry.ratio, factor: entry.factor, base: item.value * entry.factor });
  }
  const dimension = known[0]?.dimension;
  const byId = new Map<string, ResolvedItem>();
  for (const r of known) if (!byId.has(r.item.id)) byId.set(r.item.id, r);
  const valid = (r: ResolvedItem) => Number.isFinite(r.item.value) && Number.isFinite(r.base)
    && (spec.scale === "log" ? r.item.value > 0 : r.item.value >= 0);
  const included = known.filter(r => r.dimension === dimension && valid(r));
  return { catalog, dimension, known, byId, included };
}

interface AxisScale {
  min: number;
  max: number;
  ticks: number[];
  /** Position along the axis, 0 to 1, for a base-unit value. */
  fraction(base: number): number;
}

function axisScale(kind: ScaleScale, bases: readonly number[]): AxisScale {
  if (kind === "log") {
    const positive = bases.length ? bases : [1];
    const lo = Math.floor(Math.log10(Math.min(...positive)));
    const hi = Math.max(lo + 1, Math.ceil(Math.log10(Math.max(...positive))));
    const span = hi - lo;
    return {
      min: 10 ** lo, max: 10 ** hi,
      ticks: Array.from({ length: span + 1 }, (_, k) => 10 ** (lo + k)),
      fraction: v => (Math.log10(v) - lo) / span,
    };
  }
  const top = Math.max(0, ...bases);
  const step = niceStep((top || 1) / 4);
  const count = Math.max(1, Math.ceil(top / step - 1e-9));
  const max = count * step;
  return {
    min: 0, max,
    ticks: Array.from({ length: count + 1 }, (_, k) => Number((k * step).toPrecision(12))),
    fraction: v => v / max,
  };
}

/** The exact conversion of one value, with each step printed. */
export interface ScaleConvertReadout {
  fromLine: string;
  toLine: string;
  arithmetic: string;
  result: string;
  rule: string;
}

export function scaleRatioReadout(spec: ScaleComparisonSpec, aId: string, bId: string, sig = 3):
  { sentence: string; value: string; rule: string; ratio: number } | undefined {
  const res = resolveScale(spec);
  const a = res.byId.get(aId), b = res.byId.get(bId);
  if (!a || !b || a.dimension !== b.dimension) return undefined;
  const ratio = a.base / b.base;
  const rounded = formatScaleNumber(roundSignificant(ratio, sig));
  return {
    sentence: `${a.item.label} is ≈ ${rounded}× ${b.item.label}`,
    value: rounded,
    rule: `Unrounded ratio ${formatScaleNumber(ratio, 6)}; rounded to ${sig} significant figures, half away from zero.`,
    ratio,
  };
}

export function scaleConvertReadout(spec: ScaleComparisonSpec, itemId: string, toSymbol: string, sig = 4): ScaleConvertReadout | undefined {
  const res = resolveScale(spec);
  const it = res.byId.get(itemId), to = res.catalog.get(toSymbol);
  if (!it || !to || to.unit.dimension !== it.dimension) return undefined;
  const from = it.item.unit, base = BASE_SYMBOL[it.dimension];
  const fromIsBase = it.ratio.n === it.ratio.d, toIsBase = to.ratio.n === to.ratio.d;
  const ff = exactFactorText(it.ratio), ft = exactFactorText(to.ratio);
  const result = (it.item.value * it.factor) / to.factor;
  const illustrative = it.item.kind === "illustrative" ? " Illustrative value." : "";
  const steps = [`${formatScaleNumber(it.item.value)} ${from}`];
  if (!fromIsBase) steps.push(`× ${ff} ${base}/${from}`);
  if (!toIsBase) steps.push(`÷ ${ft} ${base}/${toSymbol}`);
  return {
    fromLine: fromIsBase ? "" : `1 ${from} = ${ff} ${base}`,
    toLine: toIsBase ? "" : `1 ${toSymbol} = ${ft} ${base}`,
    arithmetic: `${steps.join(" ")} = ${formatScaleNumber(result, sig)} ${toSymbol}`,
    result: `${formatScaleNumber(result, sig)} ${toSymbol}`,
    rule: `Rounded to ${sig} significant figures, half away from zero.${illustrative}`,
  };
}

export function validateScaleComparison(spec: ScaleComparisonSpec, layout?: ScaleComparisonLayout): ScaleDiagnostic[] {
  const out: ScaleDiagnostic[] = [...(layout?.diagnostics ?? [])];
  const err = (code: string, message: string, extra: Partial<ScaleDiagnostic> = {}) => out.push({ code, severity: "error", message, ...extra });
  const warn = (code: string, message: string, extra: Partial<ScaleDiagnostic> = {}) => out.push({ code, severity: "warning", message, ...extra });
  const res = resolveScale(spec);
  const moveFrames = spec.moveFrames ?? 18;

  for (const unit of spec.units ?? []) {
    if (SCALE_UNITS.some(u => u.symbol === unit.symbol)) err("scale-unit-duplicate", `Unit "${unit.symbol}" is already in the built-in catalog.`);
    else if (!parseExactFactor(unit.factor)) err("scale-unit-factor-invalid", `Unit "${unit.symbol}" needs an exact factor: an integer, a decimal or "num/den".`);
  }
  if (!spec.items.length) err("scale-items-missing", "The stage needs at least one item.");
  const itemIds = new Set<string>();
  for (const item of spec.items) {
    const ids = { itemId: item.id };
    if (itemIds.has(item.id)) err("scale-item-duplicate", `Two items share the id "${item.id}".`, ids);
    itemIds.add(item.id);
    if (!res.catalog.has(item.unit)) err("scale-unit-unknown", `Item "${item.id}" uses unit "${item.unit}", which is not in the unit catalog. Add it to \`units\` or use a catalog unit.`, ids);
    if (!Number.isFinite(item.value)) err("scale-value-invalid", `Item "${item.id}" has a value that is not a finite number.`, ids);
    else if (spec.scale === "log" && !(item.value > 0)) err("scale-log-nonpositive", `Item "${item.id}" is ${item.value}; a log scale needs values above zero.`, ids);
    else if (item.value < 0) err("scale-value-negative", `Item "${item.id}" is negative; a length, time or quantity shown on a shared scale cannot be.`, ids);
    if (item.kind === "real" && !item.source?.trim()) err("scale-real-unsourced", `Item "${item.id}" is marked real but names no public source. Name the source or mark it illustrative.`, ids);
  }
  const dimensions = [...new Set(res.known.map(r => r.dimension))];
  if (dimensions.length > 1) err("scale-mixed-dimension", `The items mix ${dimensions.join(" and ")}; one shared scale needs one dimension.`);
  const axis = res.catalog.get(spec.axisUnit);
  if (!axis) err("scale-unit-unknown", `The axis unit "${spec.axisUnit}" is not in the unit catalog.`);
  else if (res.dimension && axis.unit.dimension !== res.dimension) err("scale-unit-dimension", `The axis unit "${spec.axisUnit}" measures ${axis.unit.dimension}; the items measure ${res.dimension}.`);
  if (spec.marks === "bar" && spec.scale === "log") err("scale-log-bars", "Bars on a log scale misread length. Use marks \"dot\", or a linear scale for bars.");
  if (spec.marks === "circle" && spec.scale === "log") err("scale-log-circles", "Circles on a log scale misread size. Use marks \"dot\", or a linear scale for circles.");
  if (!spec.beats.length) err("scale-beats-missing", "The stage needs at least one beat.");

  const beatIds = new Set<string>(), revealed = new Set<string>();
  const sigOk = (beat: { id: string; sig?: number }) => {
    if (beat.sig !== undefined && !(Number.isInteger(beat.sig) && beat.sig >= 1 && beat.sig <= 9))
      err("scale-sig-invalid", `Beat "${beat.id}" asks for ${beat.sig} significant figures; use an integer from 1 to 9.`, { beatId: beat.id });
  };
  for (const beat of spec.beats) {
    const ids = { beatId: beat.id };
    if (beatIds.has(beat.id)) err("scale-beat-duplicate", `Two beats share the id "${beat.id}".`, ids);
    beatIds.add(beat.id);
    if (!Number.isSafeInteger(beat.durationFrames) || beat.durationFrames < 1)
      err("scale-beat-invalid", `Beat "${beat.id}" needs a positive integer duration.`, ids);
    if (beat.kind === "reveal") {
      for (const id of beat.itemIds ?? []) if (!itemIds.has(id)) err("scale-item-unknown", `Beat "${beat.id}" reveals unknown item "${id}".`, { ...ids, itemId: id });
      for (const id of beat.itemIds ?? spec.items.map(i => i.id)) if (itemIds.has(id)) revealed.add(id);
    } else if (beat.kind === "compare") {
      for (const id of [beat.a, beat.b]) if (!itemIds.has(id)) err("scale-item-unknown", `Beat "${beat.id}" compares unknown item "${id}".`, { ...ids, itemId: id });
      if (beat.a === beat.b) err("scale-compare-same", `Beat "${beat.id}" compares an item with itself.`, ids);
      const a = res.byId.get(beat.a), b = res.byId.get(beat.b);
      if (a && b && a.dimension !== b.dimension)
        err("scale-mixed-dimension", `Beat "${beat.id}" compares ${a.dimension} with ${b.dimension}; a ratio between them is meaningless.`, ids);
      for (const id of [beat.a, beat.b]) if (itemIds.has(id) && !revealed.has(id))
        err("scale-beat-item-unrevealed", `Beat "${beat.id}" compares "${id}" before any reveal beat shows it.`, { ...ids, itemId: id });
      sigOk(beat);
      if (beat.durationFrames < moveFrames * 2) warn("scale-beat-short", `Beat "${beat.id}" ends before the emphasis settles; hold it for at least ${moveFrames * 2} frames.`, ids);
    } else if (beat.kind === "convert") {
      if (!itemIds.has(beat.itemId)) err("scale-item-unknown", `Beat "${beat.id}" converts unknown item "${beat.itemId}".`, { ...ids, itemId: beat.itemId });
      else if (!revealed.has(beat.itemId)) err("scale-beat-item-unrevealed", `Beat "${beat.id}" converts "${beat.itemId}" before any reveal beat shows it.`, { ...ids, itemId: beat.itemId });
      const target = res.catalog.get(beat.unit), item = res.byId.get(beat.itemId);
      if (!target) err("scale-unit-unknown", `Beat "${beat.id}" converts to unit "${beat.unit}", which is not in the unit catalog.`, ids);
      else if (item && target.unit.dimension !== item.dimension)
        err("scale-unit-dimension", `Beat "${beat.id}" converts to "${beat.unit}", which measures ${target.unit.dimension}; item "${beat.itemId}" measures ${item.dimension}.`, ids);
      sigOk(beat);
      if (beat.durationFrames < moveFrames * 2) warn("scale-beat-short", `Beat "${beat.id}" ends before the emphasis settles; hold it for at least ${moveFrames * 2} frames.`, ids);
    }
  }
  return out;
}

export interface ScaleTextBlock {
  id: string;
  role: "eyebrow" | "title" | "badge" | "label" | "value" | "meta" | "tick" | "caption" | "ratio" | "relation" | "rule" | "arithmetic" | "result" | "footnote";
  /** The full text, as wrapped in `lines`; nothing is dropped. */
  text: string;
  lines: string[];
  fontPx: number;
  weight: number;
  /** Distance between baselines. */
  lineStep: number;
  /** Bounds of the text. `rect.x` is the left edge; `align` says how each line sits inside the rect. */
  rect: Rect;
  align: "start" | "middle" | "end";
  itemId?: string;
  beatId?: string;
}

/** A length from zero: a column rising from the shared baseline. */
export interface ScaleMarkBar { kind: "bar"; rect: Rect }
/** A size drawn to the shared linear scale: the circle's radius is the item's value. */
export interface ScaleMarkCircle { kind: "circle"; cx: number; cy: number; r: number }
/** A position on the axis, linear or log. */
export interface ScaleMarkDot { kind: "dot"; cx: number; cy: number; r: number }
export interface ScaleLayoutItem {
  id: string;
  illustrative: boolean;
  mark: ScaleMarkBar | ScaleMarkCircle | ScaleMarkDot;
  texts: ScaleTextBlock[];
}

export interface ScaleComparisonLayout {
  font: { size: number; family: string; lineStep: number };
  box: Rect;
  inner: Rect;
  /** Where the marks are drawn: everything between the header, the readout card and the footer. */
  stage: Rect;
  scale: {
    kind: ScaleScale; axisUnit: string; min: number; max: number;
    /** Columns: gridlines across the stage at `y`. Dots: ticks on the track at `x`. Circles: none (see `ruler`). */
    ticks: { value: number; x: number; y: number; label: ScaleTextBlock }[];
  };
  /** Pixels per base unit on the shared linear scale (undefined on a log scale). */
  pxPerBaseUnit?: number;
  /** The shared baseline (columns, circles) or the track (dots). */
  axis: { y: number; x0: number; x1: number };
  /** For circles: a labelled length drawn to the same scale. */
  ruler?: { x0: number; x1: number; y: number; label: ScaleTextBlock };
  items: ScaleLayoutItem[];
  /** The readout card: a right-hand column on wide outputs, a band above the footer on tall ones. */
  panel: { rect: Rect; padding: number; byBeat: Record<string, ScaleTextBlock[]> };
  /** One honesty badge for the whole stage ("Illustrative values"), when every item is the same kind. */
  badge?: ScaleTextBlock;
  footnote?: ScaleTextBlock;
  texts: ScaleTextBlock[];
  diagnostics: ScaleDiagnostic[];
}

export interface ScaleLayoutOptions {
  measure: MeasureText;
  /** Largest and smallest label font in px. The layout uses the largest size with no error. Secondary text never goes below `minFontPx`. */
  maxFontPx: number;
  minFontPx: number;
  /** Below this a warning is raised: legal, but small on a phone. */
  readablePx?: number;
  family?: string;
  /** Inner margin as fractions of the box width (x) and height (y). Default 0.07 and 0.05. */
  inset?: { x: number; y: number };
}

const SYSTEM_SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const LINE = 1.22;
const DIMENSION_WORD: Record<ScaleDimension, string> = { length: "length", time: "time", count: "count", quantity: "quantity" };

const NBSP = "\u00a0";
const valueText = (r: ResolvedItem) => `${formatScaleNumber(r.item.value)}${NBSP}${r.item.unit}`;

interface Measured {
  id: string;
  role: ScaleTextBlock["role"];
  text: string;
  size: number;
  weight: number;
  lines: string[];
  width: number;
  height: number;
  itemId?: string;
  beatId?: string;
}

function measureBlock(id: string, role: ScaleTextBlock["role"], text: string, maxWidth: number, size: number, weight: number,
  family: string, measure: MeasureText, diagnostics: ScaleDiagnostic[], ids: { itemId?: string; beatId?: string } = {}): Measured | undefined {
  // Break only at ordinary spaces: a non-breaking space keeps a number with its unit.
  const normalized = text.trim().split(/[ \t\r\n]+/).filter(Boolean).join(" ");
  if (!normalized) return undefined;
  const css = `${weight} ${size}px ${family}`;
  const lines: string[] = [];
  let current = "";
  for (const word of normalized.split(" ")) {
    if (measure(css, word) > maxWidth)
      diagnostics.push({ code: "scale-text-unbreakable", severity: "error", ...ids,
        message: `The word "${word}" is wider than the ${Math.round(maxWidth)} px line it must sit in; use a wider stage or shorter text.` });
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measure(css, candidate) <= maxWidth) current = candidate;
    else { lines.push(current); current = word; }
  }
  lines.push(current);
  const width = Math.max(...lines.map(line => measure(css, line)));
  return { id, role, text: normalized, size, weight, lines, width, height: lines.length * size * LINE, ...ids };
}

function insetOf(box: Rect, inset?: { x: number; y: number }): Rect {
  const padX = box.width * (inset?.x ?? 0.07), padY = box.height * (inset?.y ?? 0.05);
  return { x: box.x + padX, y: box.y + padY, width: box.width - 2 * padX, height: box.height - 2 * padY };
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5
  && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
const bottomOf = (block: { rect: Rect }) => block.rect.y + block.rect.height;

type PanelSize = "body" | "strong" | "big" | "minor";
/** What the readout card says during a beat: a caption, then a large exact readout with its rule. */
function panelParts(spec: ScaleComparisonSpec, beat: ScaleComparisonBeat): { role: ScaleTextBlock["role"]; text: string; size: PanelSize }[] {
  const parts: { role: ScaleTextBlock["role"]; text: string; size: PanelSize }[] = [];
  if (beat.caption) parts.push({ role: "caption", text: beat.caption, size: "body" });
  if (beat.kind === "compare") {
    const readout = scaleRatioReadout(spec, beat.a, beat.b, beat.sig ?? 3);
    const a = spec.items.find(i => i.id === beat.a), b = spec.items.find(i => i.id === beat.b);
    if (readout && a && b) parts.push(
      { role: "ratio", text: `≈${NBSP}${readout.value}×`, size: "big" },
      { role: "relation", text: `${a.label} ÷ ${b.label}`, size: "strong" },
      { role: "rule", text: readout.rule, size: "minor" },
    );
  }
  if (beat.kind === "convert") {
    const readout = scaleConvertReadout(spec, beat.itemId, beat.unit, beat.sig ?? 4);
    if (readout) parts.push(
      { role: "result", text: readout.result.replace(/ (?=[^ ]+$)/, NBSP), size: "big" },
      { role: "arithmetic", text: readout.arithmetic, size: "minor" },
      { role: "rule", text: readout.rule, size: "minor" },
    );
  }
  return parts;
}

function buildScaleLayout(spec: ScaleComparisonSpec, res: Resolved, box: Rect, measure: MeasureText, family: string,
  px: number, minor: number, readablePx: number, inset?: { x: number; y: number }): ScaleComparisonLayout {
  const diagnostics: ScaleDiagnostic[] = [];
  const texts: ScaleTextBlock[] = [];
  const gap = px * 0.5;
  const inner = insetOf(box, inset);
  const innerBottom = inner.y + inner.height;
  const axisFactor = res.catalog.get(spec.axisUnit);
  const axisSymbol = axisFactor?.unit.symbol ?? BASE_SYMBOL[res.dimension ?? "length"];
  const scale = axisScale(spec.scale, res.included.map(r => r.base));
  const tickLabel = (value: number) => `${formatScaleNumber(value / (axisFactor?.factor ?? 1), 6)} ${axisSymbol}`;
  const size = { title: Math.round(px * 1.4), value: px, label: Math.max(minor, Math.round(px * 0.8)), caption: Math.max(minor, Math.round(px * 0.85)), big: Math.round(px * 2.3) };
  const kinds = new Set(res.included.map(r => r.item.kind));
  const mixed = kinds.size > 1;

  const place = (m: Measured | undefined, x: number, y: number, align: ScaleTextBlock["align"] = "start"): ScaleTextBlock | undefined => {
    if (!m) return undefined;
    const block: ScaleTextBlock = { id: m.id, role: m.role, text: m.text, lines: m.lines, fontPx: m.size, weight: m.weight,
      lineStep: m.size * LINE, rect: { x, y, width: m.width, height: m.height }, align, itemId: m.itemId, beatId: m.beatId };
    texts.push(block);
    return block;
  };
  const measureText = (id: string, role: ScaleTextBlock["role"], text: string, maxWidth: number, sizePx: number, weight: number, ids = {}) =>
    measureBlock(id, role, text, maxWidth, sizePx, weight, family, measure, diagnostics, ids);
  const centred = (m: Measured | undefined, cx: number, y: number) => place(m, cx - (m?.width ?? 0) / 2, y, "middle");

  /* Header: eyebrow (what is measured), title, and one honesty badge for the whole stage. */
  let cursor = inner.y;
  // Never change case: unit symbols are case-sensitive (Mt is not MT).
  const eyebrowText = `${spec.scale === "log" ? "Log" : "Linear"} scale · ${DIMENSION_WORD[res.dimension ?? "length"]} in ${axisSymbol}`;
  const eyebrow = place(measureText("eyebrow", "eyebrow", eyebrowText, inner.width, minor, 650), inner.x, cursor);
  if (eyebrow) cursor = bottomOf(eyebrow) + gap * 0.5;
  const title = place(measureText("title", "title", spec.title ?? "", inner.width, size.title, 700), inner.x, cursor);
  if (title) cursor = bottomOf(title) + gap * 0.9;
  const badgeText = mixed ? "" : kinds.has("illustrative") ? "Illustrative values" : kinds.has("real") ? "Values from named sources" : "";
  const badgePad = { x: minor * 0.7, y: minor * 0.32 };
  const badgeM = measureText("badge", "badge", badgeText, inner.width - badgePad.x * 2, minor, 600);
  const badge = place(badgeM, inner.x + badgePad.x, cursor + badgePad.y);
  cursor = badge ? bottomOf(badge) + badgePad.y + gap * 1.6 : cursor + gap;

  /* Footer: sources of real values, then the footnote. One place for provenance. */
  const sources = [...new Set(res.included.filter(r => r.item.kind === "real" && r.item.source?.trim()).map(r => r.item.source!.trim()))];
  const footText = [sources.length ? `Sources: ${sources.join("; ")}.` : "", spec.footnote ?? ""].filter(Boolean).join(" ");
  const footM = measureText("footnote", "footnote", footText, inner.width, minor, 450);
  const footTop = footM ? innerBottom - footM.height : innerBottom;
  const footnote = place(footM, inner.x, footTop);
  const bodyBottom = footTop - (footM ? gap * 1.6 : 0);

  /* Readout card: right-hand column when wide, a band above the footer when tall. Sized for its longest beat. */
  const wide = inner.width >= inner.height * 1.2;
  const pad = Math.round(px * 0.8);
  const panelW = wide ? Math.round(inner.width * 0.34) : inner.width;
  const panelX = wide ? inner.x + inner.width - panelW : inner.x;
  const panelSize = (s: PanelSize) => s === "big" ? [size.big, 750] : s === "strong" ? [size.caption, 650] : s === "minor" ? [minor, 450] : [size.caption, 450];
  const measuredBeats = spec.beats.map(beat => ({
    beat,
    parts: panelParts(spec, beat).map((p, i) => {
      const [baseSize, weight] = panelSize(p.size);
      let sizePx = baseSize;
      if (p.size === "big") {
        // A large readout shrinks to fit its card on one line, never below the caption size.
        const natural = measure(`${weight} ${sizePx}px ${family}`, p.text), room = panelW - pad * 2;
        if (natural > room) sizePx = Math.max(size.caption, Math.floor(sizePx * room / natural));
      }
      return measureText(`panel:${beat.id}:${i}`, p.role, p.text, panelW - pad * 2, sizePx, weight, { beatId: beat.id });
    }).filter((m): m is Measured => m !== undefined),
  }));
  const partGap = gap * 0.7;
  const need = Math.max(0, ...measuredBeats.map(({ parts }) => parts.reduce((sum, m) => sum + m.height, 0) + partGap * Math.max(0, parts.length - 1)));
  const panelH = need > 0 ? need + pad * 2 : 0;
  const panelY = wide ? cursor : bodyBottom - panelH;
  const panelRect = { x: panelX, y: panelY, width: panelW, height: panelH };
  if (wide && panelY + panelH > bodyBottom + 0.5)
    diagnostics.push({ code: "scale-layout-overflow", severity: "error", message: "The readout card does not fit above the footnote; shorten the captions or use a taller stage." });
  const panelByBeat: Record<string, ScaleTextBlock[]> = {};
  for (const { beat, parts } of measuredBeats) {
    let y = panelY + pad;
    panelByBeat[beat.id] = parts.map(m => {
      const block = place(m, panelX + pad, y) as ScaleTextBlock;
      y += m.height + partGap;
      return block;
    });
  }

  const stage: Rect = wide
    ? { x: inner.x, y: cursor, width: inner.width - panelW - px * 1.6, height: bodyBottom - cursor }
    : { x: inner.x, y: cursor, width: inner.width, height: (panelH ? panelY - gap * 1.6 : bodyBottom) - cursor };
  if (stage.height < inner.height * 0.3 || stage.width < inner.width * 0.4)
    diagnostics.push({ code: "scale-plot-narrow", severity: "error",
      message: `The header, readout and footnote leave a ${Math.round(stage.width)}×${Math.round(stage.height)} px stage for the marks; shorten the text or use a larger output.` });
  const stageRight = stage.x + stage.width, stageBottom = stage.y + stage.height;

  const items: ScaleLayoutItem[] = [];
  let ticks: ScaleComparisonLayout["scale"]["ticks"] = [];
  let axis = { y: stageBottom, x0: stage.x, x1: stageRight };
  let pxPerBaseUnit: number | undefined;
  let ruler: ScaleComparisonLayout["ruler"];
  const metaText = (item: ScaleItem) => item.kind === "illustrative" ? "Illustrative" : `Source: ${item.source ?? "missing"}`;

  if (spec.marks === "bar") {
    /* Columns rise from one baseline; gridlines and their labels sit in a left gutter. */
    const tickM = scale.ticks.map(v => measureText(`tick:${v}`, "tick", tickLabel(v), stage.width * 0.3, minor, 500) as Measured);
    const gutter = Math.max(0, ...tickM.map(m => m.width)) + gap * 1.2;
    const plotX0 = stage.x + gutter, plotW = stageRight - plotX0;
    const n = Math.max(1, res.included.length), slot = plotW / n;
    const colW = Math.min(slot * 0.58, px * 4.6), nameW = slot - gap * 0.8;
    const groups = res.included.map(r => {
      const ids = { itemId: r.item.id };
      const value = measureText(`value:${r.item.id}`, "value", valueText(r), slot, size.value, 700, ids);
      const name = measureText(`label:${r.item.id}`, "label", r.item.label, nameW, size.label, 550, ids);
      const meta = mixed ? measureText(`meta:${r.item.id}`, "meta", metaText(r.item), nameW, minor, 450, ids) : undefined;
      if (value && value.width > slot - gap * 0.4)
        diagnostics.push({ code: "scale-plot-narrow", severity: "error", itemId: r.item.id,
          message: `The value "${value.text}" is wider than its ${Math.round(slot)} px column slot; use fewer items or a wider stage.` });
      return { r, value, name, meta };
    });
    const valueH = Math.max(0, ...groups.map(g => g.value?.height ?? 0));
    const footH = Math.max(0, ...groups.map(g => (g.name?.height ?? 0) + (g.meta ? g.meta.height + gap * 0.3 : 0)));
    const baseline = stageBottom - footH - gap * 0.9;
    const top = stage.y + valueH + gap * 0.7;
    const colMax = baseline - top;
    if (colMax < stage.height * 0.35)
      diagnostics.push({ code: "scale-plot-narrow", severity: "error", message: `The labels leave ${Math.round(colMax)} px for the columns; use shorter labels or a taller stage.` });
    pxPerBaseUnit = Math.max(0, colMax) / scale.max;
    groups.forEach((g, i) => {
      const cx = plotX0 + slot * (i + 0.5), h = g.r.base * pxPerBaseUnit!;
      const value = centred(g.value, cx, baseline - h - gap * 0.35 - (g.value?.height ?? 0));
      const name = centred(g.name, cx, baseline + gap * 0.9);
      const meta = centred(g.meta, cx, (name ? bottomOf(name) : baseline + gap * 0.9) + gap * 0.3);
      items.push({ id: g.r.item.id, illustrative: g.r.item.kind === "illustrative",
        mark: { kind: "bar", rect: { x: cx - colW / 2, y: baseline - h, width: colW, height: h } },
        texts: [value, name, meta].filter((b): b is ScaleTextBlock => b !== undefined) });
    });
    ticks = scale.ticks.map((value, i) => {
      const y = baseline - value * pxPerBaseUnit!, m = tickM[i];
      return { value, x: plotX0, y, label: place(m, plotX0 - gap * 0.8 - m.width, y - m.height / 2, "end") as ScaleTextBlock };
    });
    axis = { y: baseline, x0: plotX0, x1: stageRight };
  } else if (spec.marks === "circle") {
    /* Circles drawn to one linear scale, sitting on one baseline; a labelled ruler shows the scale. */
    const groups = res.included.map(r => {
      const ids = { itemId: r.item.id };
      const value = measureText(`value:${r.item.id}`, "value", valueText(r), stage.width, size.value, 700, ids);
      return { r, value, minSlot: Math.max(px * 4.6, (value?.width ?? 0) + gap) };
    });
    const named = groups.map(g => ({ ...g,
      name: measureText(`label:${g.r.item.id}`, "label", g.r.item.label, g.minSlot - gap * 0.4, size.label, 550, { itemId: g.r.item.id }),
      meta: mixed ? measureText(`meta:${g.r.item.id}`, "meta", metaText(g.r.item), g.minSlot - gap * 0.4, minor, 450, { itemId: g.r.item.id }) : undefined }));
    const valueH = Math.max(0, ...named.map(g => g.value?.height ?? 0));
    const namesH = Math.max(0, ...named.map(g => (g.name?.height ?? 0) + (g.meta ? g.meta.height + gap * 0.3 : 0)));
    const rulerH = minor * LINE + gap * 1.6;
    const bmax = Math.max(0, ...res.included.map(r => r.base));
    const spacing = gap * 1.4;
    const rowWidth = (k: number) => named.reduce((sum, g) => sum + Math.max(2 * k * g.r.base, g.minSlot), 0) + spacing * Math.max(0, named.length - 1);
    let k = bmax > 0 ? Math.max(0, stage.height - valueH - gap * 0.6 - namesH - gap * 0.9 - rulerH) / (2 * bmax) : 0;
    for (let i = 0; i < 400 && rowWidth(k) > stage.width; i++) k *= 0.98;
    if (rowWidth(k) > stage.width + 0.5)
      diagnostics.push({ code: "scale-plot-narrow", severity: "error", message: "The circles' labels do not fit side by side; use fewer items or a wider stage." });
    pxPerBaseUnit = k;
    const blockH = valueH + gap * 0.6 + 2 * k * bmax + gap * 0.9 + namesH + rulerH;
    const baseline = stage.y + Math.max(0, (stage.height - blockH) / 2) + valueH + gap * 0.6 + 2 * k * bmax;
    let x = stage.x + Math.max(0, (stage.width - rowWidth(k)) / 2);
    const x0 = x;
    for (const g of named) {
      const slotW = Math.max(2 * k * g.r.base, g.minSlot), cx = x + slotW / 2, r = k * g.r.base;
      const value = centred(g.value, cx, baseline - 2 * r - gap * 0.35 - (g.value?.height ?? 0));
      const name = centred(g.name, cx, baseline + gap * 0.9);
      const meta = centred(g.meta, cx, (name ? bottomOf(name) : baseline + gap * 0.9) + gap * 0.3);
      items.push({ id: g.r.item.id, illustrative: g.r.item.kind === "illustrative", mark: { kind: "circle", cx, cy: baseline - r, r },
        texts: [value, name, meta].filter((b): b is ScaleTextBlock => b !== undefined) });
      x += slotW + spacing;
    }
    axis = { y: baseline, x0, x1: x - spacing };
    /* A ruler about a third of the largest diameter, in the axis unit, rounded to a nice length. */
    const length = niceStep((2 * bmax) / 3);
    const rulerY = baseline + gap * 0.9 + namesH + gap * 1.2;
    const rulerLabel = measureText("ruler", "tick", tickLabel(length), stage.width, minor, 600);
    if (rulerLabel && k > 0) ruler = { x0, x1: x0 + length * k, y: rulerY, label: place(rulerLabel, x0 + length * k + gap * 0.6, rulerY - rulerLabel.height / 2) as ScaleTextBlock };
  } else {
    /* Dots on one track (linear or log), labels alternating above and below so neighbours never share a lane. */
    const labelW = stage.width * 0.36;
    pxPerBaseUnit = spec.scale === "linear" ? stage.width / scale.max : undefined;
    const ordered = [...res.included].sort((a, b) => scale.fraction(a.base) - scale.fraction(b.base) || res.included.indexOf(a) - res.included.indexOf(b));
    const lane = new Map(ordered.map((r, i) => [r.item.id, i % 2 === 0 ? "above" : "below"] as const));
    const groups = res.included.map(r => {
      const ids = { itemId: r.item.id };
      const parts = [
        measureText(`label:${r.item.id}`, "label", r.item.label, labelW, size.label, 550, ids),
        measureText(`value:${r.item.id}`, "value", valueText(r), labelW, size.value, 700, ids),
        mixed ? measureText(`meta:${r.item.id}`, "meta", metaText(r.item), labelW, minor, 450, ids) : undefined,
      ].filter((m): m is Measured => m !== undefined);
      const height = parts.reduce((sum, m) => sum + m.height, 0) + px * 0.25 * Math.max(0, parts.length - 1);
      return { r, parts, height, lane: lane.get(r.item.id) ?? "above" as const };
    });
    const aboveH = Math.max(0, ...groups.filter(g => g.lane === "above").map(g => g.height));
    const belowH = Math.max(0, ...groups.filter(g => g.lane === "below").map(g => g.height));
    const trackGap = px * 0.9, tickH = minor * LINE;
    const total = aboveH + trackGap * 2 + belowH + gap * 0.6 + tickH;
    const trackY = stage.y + Math.max(0, (stage.height - total) / 2) + aboveH + trackGap;
    const plotX = (base: number) => stage.x + scale.fraction(base) * stage.width;
    for (const g of groups) {
      const x = Math.min(Math.max(plotX(g.r.base) - labelW / 2, stage.x), stageRight - labelW);
      let y = g.lane === "above" ? trackY - trackGap - g.height : trackY + trackGap;
      const blocks: ScaleTextBlock[] = [];
      for (const m of g.parts) {
        const block = place(m, x + (labelW - m.width) / 2, y, "middle");
        if (block) blocks.push(block);
        y += m.height + px * 0.25;
      }
      items.push({ id: g.r.item.id, illustrative: g.r.item.kind === "illustrative",
        mark: { kind: "dot", cx: plotX(g.r.base), cy: trackY, r: Math.max(6, px * 0.36) }, texts: blocks });
    }
    axis = { y: trackY, x0: stage.x, x1: stageRight };
    const tickY = trackY + trackGap + belowH + gap * 0.6;
    ticks = scale.ticks.map(value => {
      const m = measureText(`tick:${value}`, "tick", tickLabel(value), stage.width, minor, 500) as Measured;
      const cx = plotX(value);
      return { value, x: cx, y: trackY, label: place(m, Math.min(Math.max(cx - m.width / 2, stage.x), stageRight - m.width), tickY, "middle") as ScaleTextBlock };
    });
  }

  for (const block of texts) {
    const r = block.rect;
    if (r.x < inner.x - 0.5 || r.x + r.width > inner.x + inner.width + 0.5 || r.y < inner.y - 0.5 || r.y + r.height > innerBottom + 0.5)
      diagnostics.push({ code: "scale-layout-overflow", severity: "error", message: `"${block.id}" falls outside the stage.`, itemId: block.itemId, beatId: block.beatId });
  }
  /* Blocks keep a quarter of the font size between them, so neighbouring text never touches. */
  const clearance = px * 0.25;
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    if (a.beatId !== undefined && b.beatId !== undefined && a.beatId !== b.beatId) continue;
    const grow = (r: Rect): Rect => ({ x: r.x - clearance, y: r.y - clearance, width: r.width + 2 * clearance, height: r.height + 2 * clearance });
    if (overlaps(grow(a.rect), b.rect))
      diagnostics.push({ code: "scale-label-collision", severity: "error", itemId: a.itemId ?? b.itemId,
        message: `"${a.text}" (${a.role}) and "${b.text}" (${b.role}) are closer than ${Math.round(clearance)} px at ${px} px; the labels cannot share this place.` });
  }
  if (px < readablePx) diagnostics.push({ code: "scale-text-small", severity: "warning",
    message: `The labels are ${px} px, under the ${readablePx} px comfortable size for this output; use shorter labels or fewer items.` });

  return {
    font: { size: px, family, lineStep: px * LINE },
    box, inner, stage,
    scale: { kind: spec.scale, axisUnit: axisSymbol, min: scale.min, max: scale.max, ticks },
    pxPerBaseUnit, axis, ruler, items,
    panel: { rect: panelRect, padding: pad, byBeat: panelByBeat },
    badge, footnote, texts, diagnostics,
  };
}

/** Lays the stage out in `box`: the largest label size, at most `maxFontPx`, with no overlap or overflow. */
export function layoutScaleComparison(spec: ScaleComparisonSpec, box: Rect, options: ScaleLayoutOptions): ScaleComparisonLayout {
  const family = options.family ?? SYSTEM_SANS;
  const short = Math.min(box.width, box.height);
  const readablePx = options.readablePx ?? Math.round(short * 0.032);
  const minPx = Math.max(1, Math.ceil(options.minFontPx));
  const res = resolveScale(spec);
  let px = Math.max(minPx, Math.floor(options.maxFontPx));
  let attempt = buildScaleLayout(spec, res, box, options.measure, family, px, minPx, readablePx, options.inset);
  while (px > minPx && attempt.diagnostics.some(d => d.severity === "error")) {
    px -= 1;
    attempt = buildScaleLayout(spec, res, box, options.measure, family, px, minPx, readablePx, options.inset);
  }
  return attempt;
}

export interface ScaleComparisonFrame {
  beatIndex: number;
  beat: ScaleComparisonBeat;
  /** Frames since the current beat started. */
  local: number;
  /** Reveal per item id, 0 hidden to 1 shown. Revealed items stay shown. */
  reveal: Readonly<Record<string, number>>;
  /** Items a compare or convert beat is about, with its strength. Undefined when nothing is emphasised. */
  emphasis?: { itemIds: readonly string[]; amount: number };
}

/** Item ids in the order a reveal beat shows them. Size ties keep declared order. */
function orderedRevealIds(spec: ScaleComparisonSpec, res: Resolved, beat: Extract<ScaleComparisonBeat, { kind: "reveal" }>): string[] {
  const declared = spec.items.map(i => i.id);
  const ids = (beat.itemIds ?? declared).filter(id => declared.includes(id));
  const order = beat.order ?? "declared";
  if (order === "declared") return ids;
  const base = (id: string) => res.byId.get(id)?.base ?? Number.NaN;
  const sign = order === "size-ascending" ? 1 : -1;
  return ids.map((id, i) => ({ id, i })).sort((a, b) => {
    const d = base(a.id) - base(b.id);
    return (Number.isNaN(d) || d === 0 ? 0 : d * sign) || a.i - b.i;
  }).map(e => e.id);
}

/** The frame's state: which items are revealed, and any emphasis. A function of the frame only. */
export function evaluateScaleComparison(spec: ScaleComparisonSpec, frame: number): ScaleComparisonFrame {
  const res = resolveScale(spec);
  const moveFrames = spec.moveFrames ?? 18;
  const t = Math.max(0, frame);
  const reveal: Record<string, number> = Object.fromEntries(spec.items.map(i => [i.id, 0]));
  const last = spec.beats.length - 1;
  let cursor = 0, beatIndex = last, local = spec.beats[last]?.durationFrames ?? 0;
  let focus: { ids: string[]; start: number; end: number } | undefined;
  spec.beats.forEach((beat, i) => {
    const start = cursor, end = start + beat.durationFrames;
    if (t >= start && t < end) { beatIndex = i; local = t - start; }
    if (beat.kind === "reveal" && t >= start) {
      const ids = orderedRevealIds(spec, res, beat);
      const slot = beat.durationFrames / Math.max(1, ids.length);
      ids.forEach((id, k) => {
        const progress = t >= end ? 1 : Math.max(0, Math.min(1, (t - start - k * slot) / (slot * 0.6)));
        reveal[id] = Math.max(reveal[id] ?? 0, evaluateEasing("ease-out", progress));
      });
    }
    if (beat.kind === "compare" && t >= start) focus = { ids: [beat.a, beat.b], start, end };
    if (beat.kind === "convert" && t >= start) focus = { ids: [beat.itemId], start, end };
    cursor = end;
  });
  let emphasis: ScaleComparisonFrame["emphasis"];
  if (focus) {
    const amount = t < focus.end
      ? evaluateEasing("ease-in-out", Math.min(1, (t - focus.start) / moveFrames))
      : 1 - evaluateEasing("ease-in-out", Math.min(1, (t - focus.end) / moveFrames));
    if (amount > 0) emphasis = { itemIds: focus.ids, amount };
  }
  return { beatIndex, beat: spec.beats[beatIndex], local, reveal, emphasis };
}

/** Frame at which the stage is finished, so the last beat is reached. */
export function scaleComparisonDuration(spec: ScaleComparisonSpec): number {
  return spec.beats.reduce((n, b) => n + b.durationFrames, 0);
}
