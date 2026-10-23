/** DistributionStage core: one distribution drawn from explicit samples, explicit or fixed bins with exact counts,
 * pre-binned counts or densities, or a closed-form normal. Probability areas and stated uncertainty intervals sit on
 * the same checked axis. Sample probabilities come from counts and say so; normal probabilities come from the
 * documented CDF approximation. Refusals are real checks: samples outside the bins, an axis that does not match its
 * data, zero-width, unbounded or inverted areas, levels outside (0, 1), inverted intervals and intervals that do not
 * contain their estimate. Evaluation is a pure function of the frame; the sample reveal order comes from a seeded PRNG
 * written here, never from Math.random or a clock.
 */
import { chartTicks } from "../infographic/chart";
import type { MeasureText } from "../media/text-layout";
import { evaluateEasing } from "../motion/easing";
import type { Diagnostic, RationalFps, Rect } from "../motion/types";

export type DistributionBins = { edges: readonly number[] } | { count: number; min: number; max: number };

export type DistributionSource =
  | { kind: "samples"; values: readonly number[]; bins: DistributionBins }
  | { kind: "normal"; mean: number; sd: number }
  /** Whole counts per bin. Must be labelled `count`. */
  | { kind: "bin-counts"; edges: readonly number[]; counts: readonly number[] }
  /** Heights that integrate to 1 (sum of height × width). Must be labelled `density`. */
  | { kind: "bin-density"; edges: readonly number[]; heights: readonly number[] };

/** Shades the probability of `low <= x < high`. An omitted bound is unbounded on that side. */
export interface ProbabilityArea {
  id: string;
  low?: number;
  high?: number;
  label?: string;
  /** Plain-language meaning shown under the probability, e.g. "chance of a daily loss worse than 2.5%". */
  statement?: string;
}

/** A stated uncertainty interval. It is labelled as stated: the stage does not derive it. */
export interface StatedInterval { id: string; estimate: number; low: number; high: number; level: number; label?: string }

export type DistributionBeat =
  | { id: string; kind: "establish"; durationFrames: number }
  /** Samples stack into their bins in seeded order; bin sources grow to their exact heights; a normal curve draws left to right. */
  | { id: string; kind: "reveal"; durationFrames: number }
  | { id: string; kind: "area"; areaId: string; durationFrames: number }
  | { id: string; kind: "interval"; intervalId: string; durationFrames: number };

export interface DistributionStageSpec {
  id: string;
  fps: RationalFps;
  title: string;
  /** Shown on screen, e.g. "Fictional sample". Required so no dataset appears unlabelled. */
  provenance: string;
  /** X-axis title including its unit, e.g. "Confidence score (0 to 1)". */
  xLabel: string;
  /** Unit appended to values in pills and readouts, e.g. "%" or "units". Omit for unitless values. */
  unit?: string;
  /** One honesty badge in the header. */
  badge?: "synthetic" | "illustrative" | "fictional" | "sourced";
  /** The quantity on the y axis. Must match the source: see the axis rules in the spec doc. */
  yAxis: "count" | "density";
  source: DistributionSource;
  /** Seed for the sample reveal order. Default 1. */
  seed?: number;
  areas?: readonly ProbabilityArea[];
  intervals?: readonly StatedInterval[];
  /** Explicit x range. Refused if it clips a bin, an area or an interval. Default: the union of everything drawn. */
  xRange?: { min: number; max: number };
  beats: readonly DistributionBeat[];
  /** Frames for a shaded area or interval to fade in. Default 18. */
  moveFrames?: number;
}

export interface DistributionDiagnostic extends Diagnostic { areaId?: string; intervalId?: string; beatId?: string }

export interface DistributionBin {
  index: number;
  left: number;
  right: number;
  width: number;
  /** Final height in axis units: exact count, density, or stated height. */
  value: number;
  /** Samples and bin counts: exact count of samples in the bin. */
  count?: number;
  /** Samples only: axis height of one sample in this bin. */
  unit?: number;
}

export interface PreparedArea {
  id: string;
  low?: number;
  high?: number;
  /** Probability of low <= x < high. */
  probability: number;
  /** How the probability was obtained. */
  basis: "normal-cdf" | "samples" | "bins";
  /** Samples or counted samples in the range, when the probability comes from counts. */
  hits?: number;
  range: string;
  /** Plain-language meaning, from the spec or derived from the bounds. */
  statement: string;
  text: string;
}

export interface PreparedInterval extends StatedInterval { text: string }

export interface DistributionModel {
  kind: DistributionSource["kind"];
  /** Samples, or the stated total of bin counts; 0 for normal and bin densities. */
  n: number;
  domain: { min: number; max: number };
  yMax: number;
  xTicks: number[];
  yTicks: number[];
  yLabel: string;
  bins: DistributionBin[];
  /** Samples only: the bin index of each sample, in input order. */
  sampleBin: number[];
  /** Samples only: the reveal order, a seeded permutation of sample indices. */
  order: number[];
  /** Normal only: sampled points of the density, left to right across the domain. */
  curve: { x: number; y: number }[];
  areas: PreparedArea[];
  intervals: PreparedInterval[];
}

export interface PreparedDistribution {
  ok: boolean;
  model?: DistributionModel;
  diagnostics: DistributionDiagnostic[];
}

/** Maximum absolute error of {@link normalCdf}, as a probability. Abramowitz & Stegun 7.1.26 bounds erf by 1.5e-7, and Φ = (1 + erf) / 2 halves it. */
export const NORMAL_CDF_MAX_ABS_ERROR = 1e-7;
/** Frames a sample reveal must not be shorter than, so the stacking can be read. */
export const DISTRIBUTION_MIN_FEW_SAMPLES = 30;

const DEFAULT_MOVE_FRAMES = 18;
const NORMAL_RANGE_SD = 4;
const CURVE_POINTS = 241;

/** Standard normal CDF Φ(z) using the Abramowitz & Stegun 7.1.26 erf approximation. Error is at most {@link NORMAL_CDF_MAX_ABS_ERROR}. */
export function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** Normal density with the given mean and standard deviation (closed form). */
export function normalPdf(x: number, mean: number, sd: number): number {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/** Seeded PRNG (mulberry32). Returns values in [0, 1). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic normal samples (Box–Muller over {@link seededRandom}), optionally rounded. Synthetic data for demos only. */
export function seededNormalSamples(options: { seed: number; count: number; mean?: number; sd?: number; decimals?: number }): number[] {
  const rand = seededRandom(options.seed);
  const mean = options.mean ?? 0, sd = options.sd ?? 1, scale = options.decimals === undefined ? undefined : 10 ** options.decimals;
  const out: number[] = [];
  while (out.length < options.count) {
    const u1 = 1 - rand(), u2 = rand();
    const radius = Math.sqrt(-2 * Math.log(u1));
    for (const z of [radius * Math.cos(2 * Math.PI * u2), radius * Math.sin(2 * Math.PI * u2)]) {
      if (out.length >= options.count) break;
      const value = mean + sd * z;
      out.push(scale === undefined ? value : Math.round(value * scale) / scale);
    }
  }
  return out;
}

/** Seeded Fisher–Yates permutation of 0..n-1. */
function seededPermutation(n: number, seed: number): number[] {
  const rand = seededRandom(seed);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Shortest decimal form of a value, up to three places. Used in labels and ticks. */
export function formatDistributionNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/** A value for labels: typographic minus, and the unit ("%" attaches, other units follow a no-break space). */
export function formatDistributionValue(value: number, unit?: string): string {
  const digits = formatDistributionNumber(Math.abs(value));
  const sign = value < 0 && digits !== "0" ? "\u2212" : "";
  if (!unit) return `${sign}${digits}`;
  return unit === "%" ? `${sign}${digits}%` : `${sign}${digits}\u00a0${unit}`;
}

/** A probability as a percentage to 0.1 point (half up). Values that would round to 0 or 100 say so instead. */
export function formatProbabilityPercent(p: number): string {
  const pct = p * 100;
  if (pct > 0 && pct < 0.05) return "<\u00a00.1%";
  if (pct < 100 && pct >= 99.95) return ">\u00a099.9%";
  return `${(Math.round(pct * 10) / 10).toFixed(1)}%`;
}

function rangeWords(low: number | undefined, high: number | undefined, unit?: string): string {
  if (low !== undefined && high !== undefined) return `from ${formatDistributionValue(low, unit)} up to ${formatDistributionValue(high, unit)}`;
  if (low !== undefined) return `at or above ${formatDistributionValue(low, unit)}`;
  return `below ${formatDistributionValue(high!, unit)}`;
}

function validEdges(edges: readonly number[]): boolean {
  if (edges.length < 2) return false;
  for (let i = 0; i < edges.length; i += 1) {
    if (!Number.isFinite(edges[i])) return false;
    if (i > 0 && !(edges[i] > edges[i - 1])) return false;
  }
  return true;
}

function binIndexOf(edges: readonly number[], value: number): number {
  const last = edges.length - 2;
  if (!(value >= edges[0]) || value > edges[last + 1]) return -1;
  if (value === edges[last + 1]) return last;
  for (let k = 0; k <= last; k += 1) if (value >= edges[k] && value < edges[k + 1]) return k;
  return -1;
}

function rangeText(low: number | undefined, high: number | undefined): string {
  if (low !== undefined && high !== undefined) return `${formatDistributionNumber(low)} ≤ x < ${formatDistributionNumber(high)}`;
  if (low !== undefined) return `x ≥ ${formatDistributionNumber(low)}`;
  return `x < ${formatDistributionNumber(high!)}`;
}

/**
 * Validates and resolves a spec into a model. Every number in the model comes from the spec. When any error is
 * present, `ok` is false and no model is returned, so nothing misleading can be drawn.
 */
export function prepareDistributionStage(spec: DistributionStageSpec): PreparedDistribution {
  const diagnostics: DistributionDiagnostic[] = [];
  const error = (code: string, message: string, extra: Partial<DistributionDiagnostic> = {}) =>
    diagnostics.push({ code, severity: "error", message, ...extra });
  const warning = (code: string, message: string, extra: Partial<DistributionDiagnostic> = {}) =>
    diagnostics.push({ code, severity: "warning", message, ...extra });
  const src = spec.source;
  const moveFrames = spec.moveFrames ?? DEFAULT_MOVE_FRAMES;
  const areas = spec.areas ?? [], intervals = spec.intervals ?? [];

  if (spec.beats.length === 0) error("distribution-beat-invalid", "The story has no beats.");
  const seen = new Set<string>();
  for (const id of [...areas.map(a => a.id), ...intervals.map(i => i.id)]) {
    if (seen.has(id)) error("distribution-id-duplicate", `Two areas or intervals share the id "${id}".`);
    seen.add(id);
  }
  const areaIds = new Set(areas.map(a => a.id)), intervalIds = new Set(intervals.map(i => i.id));
  let reveals = 0;
  for (const beat of spec.beats) {
    if (!Number.isSafeInteger(beat.durationFrames) || beat.durationFrames < 1)
      error("distribution-beat-invalid", `Beat "${beat.id}" needs a positive integer duration.`, { beatId: beat.id });
    if (beat.kind === "reveal") reveals += 1;
    if (beat.kind === "area") {
      if (!areaIds.has(beat.areaId)) error("distribution-area-unknown", `Beat "${beat.id}" shades unknown area "${beat.areaId}".`, { beatId: beat.id, areaId: beat.areaId });
      else if (beat.durationFrames < moveFrames * 2) warning("distribution-beat-short", `Beat "${beat.id}" ends before its shading settles; hold it for at least ${moveFrames * 2} frames.`, { beatId: beat.id });
    }
    if (beat.kind === "interval") {
      if (!intervalIds.has(beat.intervalId)) error("distribution-interval-unknown", `Beat "${beat.id}" shows unknown interval "${beat.intervalId}".`, { beatId: beat.id, intervalId: beat.intervalId });
      else if (beat.durationFrames < moveFrames * 2) warning("distribution-beat-short", `Beat "${beat.id}" ends before its interval settles; hold it for at least ${moveFrames * 2} frames.`, { beatId: beat.id });
    }
  }
  if (reveals > 1) error("distribution-reveal-repeated", "Use one reveal beat per spec; the reveal covers the whole source.");

  let edges: number[] | undefined;
  let normalReady = false;
  if (src.kind === "normal") {
    if (spec.yAxis !== "density") error("distribution-axis-mismatch", "A normal distribution is a density curve. Label the y axis density, not count.");
    if (!Number.isFinite(src.mean) || !Number.isFinite(src.sd) || !(src.sd > 0))
      error("distribution-normal-invalid", "A normal distribution needs a finite mean and a standard deviation above 0.");
    else normalReady = true;
  } else if (src.kind === "bin-counts") {
    if (spec.yAxis !== "count") error("distribution-axis-mismatch", "These bins hold whole counts. Label the y axis count; a density label would misstate them.");
    if (!validEdges(src.edges)) error("distribution-bins-invalid", "Bin edges must be finite and strictly increasing, with at least two edges.");
    else edges = [...src.edges];
    if (edges && src.counts.length !== edges.length - 1) error("distribution-bins-invalid", `There are ${src.counts.length} counts for ${edges.length - 1} bins.`);
    if (src.counts.some(c => !Number.isSafeInteger(c) || c < 0)) error("distribution-count-not-integer", "Bin counts must be whole numbers of zero or more.");
  } else if (src.kind === "bin-density") {
    if (spec.yAxis !== "density") error("distribution-axis-mismatch", "These bins hold density heights. Label the y axis density; a count label would misstate them.");
    if (!validEdges(src.edges)) error("distribution-bins-invalid", "Bin edges must be finite and strictly increasing, with at least two edges.");
    else edges = [...src.edges];
    if (edges && src.heights.length !== edges.length - 1) error("distribution-bins-invalid", `There are ${src.heights.length} heights for ${edges.length - 1} bins.`);
    if (src.heights.some(h => !Number.isFinite(h) || h < 0)) error("distribution-density-invalid", "Density heights must be finite and zero or more.");
    else if (edges && src.heights.length === edges.length - 1) {
      const mass = src.heights.reduce((sum, h, k) => sum + h * (edges![k + 1] - edges![k]), 0);
      if (Math.abs(mass - 1) > 1e-6) error("distribution-density-not-normalized", `Density heights integrate to ${formatDistributionNumber(mass)}, not 1. Use counts, or correct the heights.`);
    }
  } else {
    const bins = src.bins;
    if ("edges" in bins) {
      if (!validEdges(bins.edges)) error("distribution-bins-invalid", "Bin edges must be finite and strictly increasing, with at least two edges.");
      else edges = [...bins.edges];
    } else if (!Number.isSafeInteger(bins.count) || bins.count < 1 || !Number.isFinite(bins.min) || !Number.isFinite(bins.max) || !(bins.min < bins.max)) {
      error("distribution-bins-invalid", "A fixed bin count needs a whole count of at least 1 and a finite min below max.");
    } else {
      edges = Array.from({ length: bins.count + 1 }, (_, i) => bins.min + ((bins.max - bins.min) * i) / bins.count);
      edges[bins.count] = bins.max;
    }
    const values = src.values;
    if (values.length === 0) error("distribution-no-samples", "The sample list is empty.");
    if (values.some(v => !Number.isFinite(v))) error("distribution-sample-invalid", "Every sample must be a finite number.");
    if (values.length > 0 && values.length < DISTRIBUTION_MIN_FEW_SAMPLES)
      warning("distribution-few-samples", `Only ${values.length} samples; the histogram shape is unreliable below ${DISTRIBUTION_MIN_FEW_SAMPLES}.`);
    if (edges) {
      const outside = values.filter(v => Number.isFinite(v) && binIndexOf(edges!, v) < 0);
      if (outside.length) error("distribution-sample-outside-bins", `${outside.length} sample(s) fall outside the bins, for example ${formatDistributionNumber(outside[0])}. Widen the bins or remove them.`);
    }
  }

  if (spec.xRange && !(Number.isFinite(spec.xRange.min) && Number.isFinite(spec.xRange.max) && spec.xRange.min < spec.xRange.max))
    error("distribution-range-invalid", "The x range needs finite min below max.");

  const mean = src.kind === "normal" ? src.mean : undefined, sd = src.kind === "normal" ? src.sd : undefined;
  const sampleValues = src.kind === "samples" ? src.values : undefined;

  // Probability areas
  const preparedAreas: PreparedArea[] = [];
  for (const area of areas) {
    const { low, high } = area;
    const bad = (low !== undefined && !Number.isFinite(low)) || (high !== undefined && !Number.isFinite(high));
    if (bad) { error("distribution-area-invalid", `Area "${area.id}" has a bound that is not finite.`, { areaId: area.id }); continue; }
    if (low === undefined && high === undefined) { error("distribution-area-unbounded", `Area "${area.id}" has no bound; it would shade everything.`, { areaId: area.id }); continue; }
    if (low !== undefined && high !== undefined && low === high) { error("distribution-area-zero-width", `Area "${area.id}" has zero width (${low} to ${high}); it has no probability to show.`, { areaId: area.id }); continue; }
    if (low !== undefined && high !== undefined && low > high) { error("distribution-area-inverted", `Area "${area.id}" starts at ${low} and ends at ${high}.`, { areaId: area.id }); continue; }
    const range = rangeText(low, high);
    const label = area.label ?? range;
    const statement = area.statement ?? `chance of a value ${rangeWords(low, high, spec.unit)}`;
    if (src.kind === "normal" && normalReady) {
      const p = normalCdf((high === undefined ? Infinity : (high - mean!) / sd!)) - (low === undefined ? 0 : normalCdf((low - mean!) / sd!));
      const probability = Math.min(1, Math.max(0, p));
      preparedAreas.push({ id: area.id, low, high, probability, basis: "normal-cdf", range, statement,
        text: `${label}: P = ${probability.toFixed(3)} under the normal model` });
    } else if (sampleValues && sampleValues.length) {
      const hits = sampleValues.filter(v => (low === undefined || v >= low) && (high === undefined || v < high)).length;
      const probability = hits / sampleValues.length;
      preparedAreas.push({ id: area.id, low, high, probability, basis: "samples", range, statement, hits,
        text: `${label}: P = ${probability.toFixed(3)} from ${sampleValues.length} samples` });
    } else if (edges && (src.kind === "bin-counts" || src.kind === "bin-density")) {
      const onEdge = (v: number | undefined) => v === undefined || edges!.includes(v);
      if (!onEdge(low) || !onEdge(high)) {
        error("distribution-area-off-bins", `Area "${area.id}" must start and end on bin edges, because the bins are stated, not sampled.`, { areaId: area.id });
        continue;
      }
      const counts = src.kind === "bin-counts" ? src.counts : undefined;
      const heights = src.kind === "bin-density" ? src.heights : undefined;
      const total = counts ? counts.reduce((s, c) => s + c, 0) : 0;
      let mass = 0, hits = 0;
      edges.slice(0, -1).forEach((left, k) => {
        const right = edges![k + 1];
        const inside = (low === undefined || left >= low) && (high === undefined || right <= high);
        if (!inside) return;
        if (counts) { mass += total > 0 ? counts[k] / total : 0; hits += counts[k]; }
        else if (heights) mass += heights[k] * (right - left);
      });
      const source = counts ? `from ${total} counted samples` : "from the stated bins";
      preparedAreas.push({ id: area.id, low, high, probability: Math.min(1, Math.max(0, mass)), basis: "bins", range, statement, hits: counts ? hits : undefined,
        text: `${label}: P = ${Math.min(1, Math.max(0, mass)).toFixed(3)} ${source}` });
    }
  }

  // Stated intervals
  const preparedIntervals: PreparedInterval[] = [];
  for (const interval of intervals) {
    const { id, estimate, low, high, level } = interval;
    if (![estimate, low, high].every(Number.isFinite)) { error("distribution-interval-invalid", `Interval "${id}" has a value that is not finite.`, { intervalId: id }); continue; }
    if (!(level > 0 && level < 1)) { error("distribution-level-invalid", `Interval "${id}" has level ${level}. A level must be above 0 and below 1, for example 0.95.`, { intervalId: id }); continue; }
    if (low > high) { error("distribution-interval-inverted", `Interval "${id}" is inverted: its low ${low} is above its high ${high}.`, { intervalId: id }); continue; }
    if (estimate < low || estimate > high) { error("distribution-interval-excludes-estimate", `Interval "${id}" does not contain its estimate ${estimate} (it runs from ${low} to ${high}).`, { intervalId: id }); continue; }
    const pct = Math.round(level * 1000) / 10;
    const name = interval.label ?? `${pct}% interval, stated`;
    preparedIntervals.push({ ...interval,
      text: `${name}: ${formatDistributionNumber(low)} to ${formatDistributionNumber(high)} (estimate ${formatDistributionNumber(estimate)})` });
  }

  // Domain: the x range covers every bin, shaded area and interval
  const candidates: { value: number; what: string }[] = [];
  if (edges) { candidates.push({ value: edges[0], what: "the first bin edge" }, { value: edges[edges.length - 1], what: "the last bin edge" }); }
  if (normalReady) candidates.push({ value: mean! - NORMAL_RANGE_SD * sd!, what: "the normal range" }, { value: mean! + NORMAL_RANGE_SD * sd!, what: "the normal range" });
  for (const a of preparedAreas) for (const v of [a.low, a.high]) if (v !== undefined) candidates.push({ value: v, what: `area "${a.id}"` });
  for (const i of preparedIntervals) for (const v of [i.low, i.high, i.estimate]) candidates.push({ value: v, what: `interval "${i.id}"` });
  let domain = { min: 0, max: 1 };
  if (candidates.length) {
    const finite = candidates.map(c => c.value);
    domain = { min: Math.min(...finite), max: Math.max(...finite) };
  }
  if (spec.xRange && spec.xRange.min < spec.xRange.max) {
    const outside = candidates.filter(c => c.value < spec.xRange!.min || c.value > spec.xRange!.max);
    if (outside.length) error("distribution-range-clips", `The x range ${spec.xRange.min} to ${spec.xRange.max} clips ${outside[0].what}. Widen it to cover every bin, shaded area and interval.`);
    domain = { ...spec.xRange };
  }
  if (!(domain.max > domain.min)) error("distribution-range-invalid", "The distribution has no width to draw on an x axis.");

  if (diagnostics.some(d => d.severity === "error")) return { ok: false, diagnostics };

  // Model
  const n = sampleValues ? sampleValues.length : src.kind === "bin-counts" ? src.counts.reduce((s, c) => s + c, 0) : 0;
  const bins: DistributionBin[] = [];
  const sampleBin: number[] = [];
  if (edges) {
    for (let k = 0; k < edges.length - 1; k += 1) {
      const left = edges[k], right = edges[k + 1], width = right - left;
      if (src.kind === "samples") {
        const count = sampleValues!.filter(v => binIndexOf(edges!, v) === k).length;
        bins.push({ index: k, left, right, width, count, value: spec.yAxis === "count" ? count : count / (n * width), unit: spec.yAxis === "count" ? 1 : 1 / (n * width) });
      } else if (src.kind === "bin-counts") {
        const count = src.counts[k];
        bins.push({ index: k, left, right, width, count, value: count });
      } else if (src.kind === "bin-density") {
        bins.push({ index: k, left, right, width, value: src.heights[k] });
      }
    }
  }
  if (sampleValues && edges) for (const v of sampleValues) sampleBin.push(binIndexOf(edges, v));
  const curve: { x: number; y: number }[] = [];
  if (normalReady) {
    for (let i = 0; i < CURVE_POINTS; i += 1) {
      const x = domain.min + ((domain.max - domain.min) * i) / (CURVE_POINTS - 1);
      curve.push({ x, y: normalPdf(x, mean!, sd!) });
    }
  }
  const peak = Math.max(0, ...bins.map(b => b.value), ...curve.map(p => p.y));
  const yMax = peak * 1.1;
  const yTicks = chartTicks({ min: 0, max: yMax, zero: true, kind: "linear" }, 4);
  const xTicks = chartTicks({ min: domain.min, max: domain.max, zero: false, kind: "linear" }, 6);
  const order = sampleValues ? seededPermutation(sampleValues.length, Math.trunc(spec.seed ?? 1)) : [];
  const model: DistributionModel = {
    kind: src.kind, n, domain, yMax, xTicks, yTicks,
    yLabel: (spec.yAxis === "count" ? "Count" : "Density, per unit of x") + (src.kind === "samples" ? " (each block is one sample)" : ""),
    bins, sampleBin, order, curve, areas: preparedAreas, intervals: preparedIntervals,
  };
  return { ok: true, model, diagnostics: [...diagnostics] };
}

export interface DistributionFrame {
  beatIndex: number;
  beatId: string;
  beatKind: DistributionBeat["kind"];
  /** Frames since the current beat started. */
  local: number;
  /** Progress of the single reveal beat: 0 before it, 1 on and after its last frame. Without a reveal beat it is 1. */
  reveal: number;
  /** Samples: how many of the reveal order are visible. */
  revealed: number;
  /** Per bin: samples revealed in it (samples), or the fraction 0–1 of its height shown (bin sources). */
  binFill: readonly number[];
  /** Opacity 0–1 of each shaded area. Shading holds once its beat has run. */
  areaAmount: Readonly<Record<string, number>>;
  /** Opacity 0–1 of each stated interval. */
  intervalAmount: Readonly<Record<string, number>>;
  /** The readout the card shows: "reveal", "area:<id>" or "interval:<id>" — the latest area or interval beat that has started. */
  readoutKey: string;
  /** Fade-in of the card's content after its readout changes, 0–1. */
  readoutAmount: number;
}

const READOUT_FADE_FRAMES = 10;

/** The frame's state: which beat it is in, how far the reveal has run, the shading and intervals showing, and the readout. */
export function evaluateDistributionStage(spec: DistributionStageSpec, frame: number): DistributionFrame {
  const moveFrames = spec.moveFrames ?? DEFAULT_MOVE_FRAMES;
  const prepared = prepareDistributionStage(spec);
  const model = prepared.model;
  const t = Math.max(0, frame);
  const last = spec.beats.length - 1;
  let cursor = 0, beatIndex = last, local = spec.beats[last]?.durationFrames ?? 0;
  const areaAmount: Record<string, number> = {}, intervalAmount: Record<string, number> = {};
  let revealStart: number | undefined, revealEnd: number | undefined;
  let readoutKey = "reveal", readoutStart: number | undefined;
  spec.beats.forEach((beat, i) => {
    const start = cursor, end = start + beat.durationFrames;
    if (t >= start && t < end) { beatIndex = i; local = t - start; }
    if (beat.kind === "reveal") { revealStart = start; revealEnd = end; }
    if (beat.kind === "area" && t >= start) {
      areaAmount[beat.areaId] = evaluateEasing("ease-out", Math.min(1, (t - start) / moveFrames));
      readoutKey = `area:${beat.areaId}`; readoutStart = start;
    }
    if (beat.kind === "interval" && t >= start) {
      intervalAmount[beat.intervalId] = evaluateEasing("ease-out", Math.min(1, (t - start) / moveFrames));
      readoutKey = `interval:${beat.intervalId}`; readoutStart = start;
    }
    cursor = end;
  });
  const reveal = revealStart === undefined || revealEnd === undefined ? 1
    : t < revealStart ? 0 : t >= revealEnd ? 1 : (t - revealStart + 1) / (revealEnd - revealStart);
  const beat = spec.beats[beatIndex];
  const binFill: number[] = [];
  let revealed = 0;
  if (model) {
    if (model.kind === "samples") {
      revealed = Math.floor(model.n * reveal);
      const counts = model.bins.map(() => 0);
      for (let i = 0; i < revealed; i += 1) counts[model.sampleBin[model.order[i]]] += 1;
      model.bins.forEach((_, k) => binFill.push(counts[k]));
    } else {
      model.bins.forEach(() => binFill.push(reveal));
    }
  }
  const readoutAmount = readoutStart === undefined ? 1 : evaluateEasing("ease-out", Math.min(1, (t - readoutStart) / READOUT_FADE_FRAMES));
  return { beatIndex, beatId: beat?.id ?? "", beatKind: beat?.kind ?? "establish", local, reveal, revealed, binFill, areaAmount, intervalAmount, readoutKey, readoutAmount };
}

export function distributionDuration(spec: DistributionStageSpec): number {
  return spec.beats.reduce((n, b) => n + b.durationFrames, 0);
}

/** One state of the readout card: a big exact number, what it means, where it comes from, and how it is rounded. */
export interface DistributionReadout {
  key: string;
  tone: "mark" | "accent" | "interval";
  big: string;
  statement: string;
  source: string;
  rule: string;
  /** The big number is the live revealed-sample count; `big` holds its widest value, the total. */
  live?: boolean;
}

/** Every readout the card can show for this model, in a stable order. */
export function distributionReadouts(spec: DistributionStageSpec, model: DistributionModel): DistributionReadout[] {
  const unit = spec.unit;
  const fv = (v: number) => formatDistributionValue(v, unit);
  const src = spec.source;
  const out: DistributionReadout[] = [];
  const span = model.bins.length ? `${model.bins.length} bins from ${fv(model.bins[0].left)} to ${fv(model.bins[model.bins.length - 1].right)}` : "";
  if (src.kind === "samples") out.push({ key: "reveal", tone: "mark", big: String(model.n), live: true,
    statement: `of ${model.n} samples placed`, source: `Sorted into ${span}.`, rule: "Counts are exact. The order is fixed by a seed, so every replay matches." });
  else if (src.kind === "normal") out.push({ key: "reveal", tone: "mark", big: `±${fv(src.sd)}`,
    statement: `one standard deviation around a mean of ${fv(src.mean)}`, source: "A normal model with a closed-form density curve.",
    rule: "Probabilities come from the normal CDF, accurate to 1e-7." });
  else if (src.kind === "bin-counts") out.push({ key: "reveal", tone: "mark", big: String(model.n),
    statement: `counted samples in ${model.bins.length} bins`, source: `Counts as stated, in ${span}.`, rule: "Counts are shown exactly as stated." });
  else out.push({ key: "reveal", tone: "mark", big: String(model.bins.length),
    statement: "stated bins of probability density", source: `Heights as stated, in ${span}.`, rule: "The heights integrate to 1." });
  for (const area of model.areas) {
    const exact = area.hits !== undefined && model.n > 0;
    const source = area.basis === "normal-cdf" && src.kind === "normal"
      ? `From the normal model (mean ${fv(src.mean)}, standard deviation ${fv(src.sd)}).`
      : area.basis === "samples" ? `From ${model.n} samples: ${area.hits} fall in the range.`
      : exact ? `From ${model.n} counted samples: ${area.hits} in the range.` : "From the stated bin densities.";
    const rule = exact
      ? `Exact share ${area.hits}/${model.n}, rounded to 0.1 point.`
      : `Unrounded ${area.probability.toPrecision(3)}, rounded to 0.1 point.`;
    out.push({ key: `area:${area.id}`, tone: "accent", big: formatProbabilityPercent(area.probability), statement: area.statement, source, rule });
  }
  for (const interval of model.intervals) {
    const pct = Math.round(interval.level * 1000) / 10;
    out.push({ key: `interval:${interval.id}`, tone: "interval",
      big: `${formatDistributionValue(interval.low)}–${formatDistributionValue(interval.high, unit)}`,
      statement: interval.label ?? `stated ${pct}% interval`,
      source: `Estimate ${fv(interval.estimate)}, as stated by the source.`,
      rule: "Shown as stated; not recomputed from the data." });
  }
  return out;
}

export interface DistributionCanvas {
  width: number;
  height: number;
  /** Safe-area insets as fractions of width and height. Default 7% horizontal, 5% vertical. */
  safe?: { x: number; y: number };
}

export interface DistributionLayoutOptions {
  measure: MeasureText;
  /** CSS font family. Pass the same family to every stage so widths match. */
  family?: string;
  /** Label size in px; every other size scales with it. Default 2.8% of the short side. */
  baseFontPx?: number;
  /** The smallest text may not be below this; the layout refuses with `distribution-font-small`. Default 2.3% of the short side. */
  minFontPx?: number;
  /** The smallest text below this is a warning, `distribution-text-small`. Default 2.3% of the short side. */
  readablePx?: number;
}

export interface DistributionTextBlock {
  id: string;
  role: "eyebrow" | "title" | "badge" | "tick" | "axis" | "pill" | "big" | "statement" | "source" | "rule" | "key" | "footnote";
  lines: string[];
  fontPx: number;
  weight: number;
  lineStep: number;
  /** Measured box the text occupies. `align` says which edge, or the centre, the text is anchored to. */
  rect: Rect;
  align: "start" | "middle" | "end";
}

export interface DistributionPill {
  id: string;
  kind: "threshold" | "interval";
  /** Area or interval id. */
  targetId: string;
  /** Threshold value, for threshold pills. */
  value?: number;
  rect: Rect;
  text: DistributionTextBlock;
}

export interface DistributionReadoutLayout extends DistributionReadout {
  blocks: DistributionTextBlock[];
}

export interface DistributionLayout {
  width: number;
  height: number;
  model: DistributionModel;
  /** The chart's region: everything between the header, the readout card and the footer. */
  stage: Rect;
  plot: Rect;
  x: (value: number) => number;
  y: (value: number) => number;
  domain: { x: { min: number; max: number }; y: { min: 0; max: number } };
  xTicks: readonly { value: number; px: number }[];
  yTicks: readonly { value: number; py: number }[];
  /** Header, ticks, axis title, key and footnote. Pill and card text live with their pill and card. */
  texts: DistributionTextBlock[];
  badge?: { rect: Rect; text: DistributionTextBlock };
  pills: DistributionPill[];
  /** Centre line of each interval's lane, by interval id. */
  intervalLanes: Readonly<Record<string, number>>;
  /** The readout card, sized for its largest readout, and each readout's text placed inside it. */
  card: { rect: Rect; padding: number; readouts: Readonly<Record<string, DistributionReadoutLayout>> };
  key?: { swatch: Rect; text: DistributionTextBlock };
  family: string;
  sizes: { title: number; eyebrow: number; tick: number; axis: number; label: number; statement: number; big: number; minor: number; footnote: number };
}

export interface DistributionLayoutResult {
  ok: boolean;
  diagnostics: DistributionDiagnostic[];
  layout?: DistributionLayout;
}

const DEFAULT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const LINE = 1.22;
const BADGE_TEXT: Record<NonNullable<DistributionStageSpec["badge"]>, string> = {
  synthetic: "Synthetic data", illustrative: "Illustrative parameters", fictional: "Fictional data", sourced: "Values from a named source",
};

/** Word-wraps with a measurer at ordinary spaces (a no-break space keeps a number with its unit). Words wider than the box break between characters (CJK, long identifiers). Undefined when one character cannot fit. */
export function wrapDistributionText(measure: MeasureText, css: string, text: string, maxWidth: number): string[] | undefined {
  const fits = (s: string) => measure(css, s) <= maxWidth;
  const words = text.split(/[ \t\r\n]+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(candidate)) { line = candidate; continue; }
    if (line) { lines.push(line); line = ""; }
    if (fits(word)) { line = word; continue; }
    let piece = "";
    for (const ch of word) {
      if (!fits(piece + ch)) {
        if (!piece) return undefined;
        lines.push(piece);
        piece = "";
      }
      piece += ch;
    }
    line = piece;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function eyebrowText(spec: DistributionStageSpec, model: DistributionModel): string {
  const per = !spec.unit ? "unit of x" : spec.unit === "%" ? "percentage point" : spec.unit;
  if (model.kind === "normal") return `Normal model · probability density per ${per}`;
  if (spec.yAxis === "density") return `Histogram · probability density per ${per}`;
  return model.kind === "samples" ? "Histogram · samples per bin" : "Histogram · count per bin";
}

/**
 * Lays the stage out: a header (eyebrow, title, one honesty badge), the chart, a readout card (a right-hand column on
 * wide outputs, a band above the footer on tall ones) and a footer (sample key and provenance). Text is measured with
 * the injected font and never truncated: it wraps, and anything that cannot fit is an error. Pills, cards and text are
 * checked for collisions.
 */
export function layoutDistributionStage(spec: DistributionStageSpec, canvas: DistributionCanvas, options: DistributionLayoutOptions): DistributionLayoutResult {
  const prepared = prepareDistributionStage(spec);
  const diagnostics = [...prepared.diagnostics];
  const model = prepared.model;
  if (!prepared.ok || !model) return { ok: false, diagnostics };
  const refuse = (code: string, message: string) => diagnostics.push({ code, severity: "error", message });
  const { width: W, height: H } = canvas;
  const S = Math.min(W, H);
  const L = W * (canvas.safe?.x ?? 0.07), T = H * (canvas.safe?.y ?? 0.05);
  const R = W - L, B = H - T, IW = R - L, IH = B - T;
  const k = options.baseFontPx ? options.baseFontPx / (S * 0.028) : 1;
  const sz = (f: number) => Math.round(S * f * k);
  const sizes = { title: sz(0.045), eyebrow: sz(0.024), tick: sz(0.025), axis: sz(0.026), label: sz(0.028), statement: sz(0.03), big: sz(0.1), minor: sz(0.024), footnote: sz(0.023) };
  const smallest = Math.min(...Object.values(sizes));
  const minFont = options.minFontPx ?? Math.round(S * 0.023);
  const readable = options.readablePx ?? Math.round(S * 0.023);
  if (smallest < minFont) refuse("distribution-font-small", `The smallest text would be ${smallest} px; the minimum is ${minFont} px. Use a larger output.`);
  else if (smallest < readable) diagnostics.push({ code: "distribution-text-small", severity: "warning", message: `The smallest text is ${smallest} px, under the ${readable} px comfortable size for this output.` });
  const family = options.family ?? DEFAULT_FAMILY;
  const css = (size: number, weight: number) => `${weight} ${size}px ${family}`;
  const measure = options.measure;
  const gap = sizes.label * 0.5;

  const make = (id: string, role: DistributionTextBlock["role"], text: string, maxWidth: number, size: number, weight: number, align: DistributionTextBlock["align"] = "start"): DistributionTextBlock => {
    const wrapped = wrapDistributionText(measure, css(size, weight), text, maxWidth);
    if (!wrapped) refuse("distribution-label-overflow", `"${text}" has a word wider than its ${Math.round(maxWidth)} px space; shorten it or use a larger output.`);
    const lines = wrapped ?? [text];
    const width = Math.max(0, ...lines.map(l => measure(css(size, weight), l)));
    return { id, role, lines, fontPx: size, weight, lineStep: size * LINE, rect: { x: 0, y: 0, width, height: lines.length * size * LINE }, align };
  };
  /** Places a block with its anchor (left edge, centre or right edge, per `align`) at x, and its top at y. */
  const at = (block: DistributionTextBlock, x: number, y: number) => {
    block.rect.x = block.align === "start" ? x : block.align === "middle" ? x - block.rect.width / 2 : x - block.rect.width;
    block.rect.y = y;
    return block;
  };
  const bottomOf = (r: Rect) => r.y + r.height;
  const texts: DistributionTextBlock[] = [];

  /* Header */
  let cursor = T;
  const eyebrow = at(make("eyebrow", "eyebrow", eyebrowText(spec, model), IW, sizes.eyebrow, 650), L, cursor);
  texts.push(eyebrow);
  cursor = bottomOf(eyebrow.rect) + gap * 0.5;
  const title = at(make("title", "title", spec.title, IW, sizes.title, 700), L, cursor);
  texts.push(title);
  cursor = bottomOf(title.rect) + gap * 0.9;
  let badge: DistributionLayout["badge"];
  if (spec.badge) {
    const padX = sizes.eyebrow * 0.7, padY = sizes.eyebrow * 0.32;
    const text = at(make("badge", "badge", BADGE_TEXT[spec.badge], IW - padX * 2, sizes.eyebrow, 600), L + padX, cursor + padY);
    badge = { rect: { x: L, y: cursor, width: text.rect.width + padX * 2, height: text.rect.height + padY * 2 }, text };
    cursor = bottomOf(badge.rect) + gap * 1.6;
  } else cursor += gap;

  /* Footer: the sample key, then provenance. */
  const foot = make("footnote", "footnote", spec.provenance, IW, sizes.footnote, 450);
  at(foot, L, B - foot.rect.height);
  texts.push(foot);
  let bodyBottom = foot.rect.y - gap * 1.4;
  let key: DistributionLayout["key"];
  if (model.kind === "samples") {
    const sw = sizes.minor * 0.85;
    const text = make("key", "key", "Each block is one sample", IW - sw - gap, sizes.minor, 500);
    at(text, L + sw + gap * 0.7, foot.rect.y - gap * 0.8 - text.rect.height);
    key = { swatch: { x: L, y: text.rect.y + (sizes.minor * LINE - sw) / 2, width: sw, height: sw }, text };
    texts.push(text);
    bodyBottom = text.rect.y - gap * 1.4;
  }

  /* Readout card: right-hand column when wide, a band above the footer when tall. Sized for its largest readout. */
  const wide = IW >= IH * 1.2;
  const pad = Math.round(sizes.label * 0.9);
  const panelW = wide ? Math.round(IW * 0.34) : IW;
  const panelX = wide ? R - panelW : L;
  const room = panelW - pad * 2;
  const partGap = gap * 0.55;
  const measured = distributionReadouts(spec, model).map(r => {
    let bigSize = sizes.big;
    const natural = measure(css(bigSize, 750), r.big);
    if (natural > room) bigSize = Math.max(sizes.statement, Math.floor(bigSize * room / natural));
    const blocks = [
      make(`readout:${r.key}:big`, "big", r.big, room, bigSize, 750),
      make(`readout:${r.key}:statement`, "statement", r.statement, room, sizes.statement, 600),
      make(`readout:${r.key}:source`, "source", r.source, room, sizes.minor, 450),
      make(`readout:${r.key}:rule`, "rule", r.rule, room, sizes.minor, 450),
    ];
    return { r, blocks, height: blocks.reduce((sum, b) => sum + b.rect.height, 0) + partGap * (blocks.length - 1) };
  });
  const panelH = Math.max(0, ...measured.map(m => m.height)) + pad * 2;
  const panelY = wide ? cursor : bodyBottom - panelH;
  if (wide && panelY + panelH > bodyBottom + 0.5) refuse("distribution-card-overflow", "The readout card does not fit above the footer; shorten its text or use a taller output.");
  const readouts: Record<string, DistributionReadoutLayout> = {};
  for (const m of measured) {
    let y = panelY + pad;
    for (const b of m.blocks) { at(b, panelX + pad, y); y += b.rect.height + partGap; }
    readouts[m.r.key] = { ...m.r, blocks: m.blocks };
  }
  const cardRect = { x: panelX, y: panelY, width: panelW, height: panelH };

  /* Chart stage */
  const stage: Rect = wide
    ? { x: L, y: cursor, width: IW - panelW - sizes.label * 1.6, height: bodyBottom - cursor }
    : { x: L, y: cursor, width: IW, height: panelY - gap * 1.8 - cursor };
  const stageRight = stage.x + stage.width;
  const { min: dmin, max: dmax } = model.domain;
  const pillPadX = sizes.label * 0.6, pillPadY = sizes.label * 0.26;
  const pillH = sizes.label * LINE + pillPadY * 2;
  const thresholds = model.areas.flatMap(a => [a.low, a.high].map((v, i) => ({ area: a, v, side: i === 0 ? "low" : "high" })))
    .filter((t): t is { area: PreparedArea; v: number; side: string } => t.v !== undefined && t.v >= dmin && t.v <= dmax);
  const plotTop = stage.y + (thresholds.length ? pillH + gap * 1.2 : sizes.tick * 0.7);
  const xTitle = make("axis:x", "axis", spec.xLabel, stage.width, sizes.axis, 550, "middle");
  const tickRow = sizes.tick * LINE + sizes.tick * 0.45;
  const laneH = pillH + gap * 0.6;
  const below = tickRow + gap * 0.3 + xTitle.rect.height + (model.intervals.length ? gap * 0.9 + model.intervals.length * laneH : 0);
  const plotBottom = stage.y + stage.height - below;
  const yLabels = model.yTicks.map(v => formatDistributionValue(v));
  const yTickW = Math.max(0, ...yLabels.map(t => measure(css(sizes.tick, 450), t)));
  const plotLeft = stage.x + yTickW + sizes.tick * 0.7;
  const lastHalf = Math.max(0, ...model.xTicks.map(v => measure(css(sizes.tick, 450), formatDistributionValue(v)) / 2));
  const plotRight = stageRight - lastHalf;
  const plotW = plotRight - plotLeft, plotH = plotBottom - plotTop;
  if (!(plotH >= IH * 0.25) || !(plotW >= IW * 0.3))
    refuse("distribution-plot-too-small", `The header, readout and footer leave a ${Math.round(plotW)}×${Math.round(plotH)} px plot; shorten the text or use a larger output.`);
  const x = (v: number) => plotLeft + ((v - dmin) / (dmax - dmin)) * plotW;
  const y = (v: number) => plotBottom - (v / model.yMax) * plotH;

  const yTicks = model.yTicks.map((v, i) => {
    texts.push(at(make(`tick:y:${v}`, "tick", yLabels[i], yTickW + 1, sizes.tick, 450, "end"), plotLeft - sizes.tick * 0.7, y(v) - sizes.tick * LINE / 2));
    return { value: v, py: y(v) };
  });
  const xTicks = model.xTicks.map(v => {
    texts.push(at(make(`tick:x:${v}`, "tick", formatDistributionValue(v), stage.width, sizes.tick, 450, "middle"), x(v), plotBottom + sizes.tick * 0.45));
    return { value: v, px: x(v) };
  });
  const xTitleCentre = Math.min(Math.max(plotLeft + plotW / 2, stage.x + xTitle.rect.width / 2), stageRight - xTitle.rect.width / 2);
  texts.push(at(xTitle, xTitleCentre, plotBottom + tickRow + gap * 0.3));

  /* Threshold pills sit in a lane above the plot, centred on their line and kept inside the stage. */
  const pills: DistributionPill[] = [];
  for (const t of thresholds) {
    const text = make(`pill:${t.area.id}:${t.side}`, "pill", formatDistributionValue(t.v, spec.unit), stage.width - pillPadX * 2, sizes.label, 650, "middle");
    const w = text.rect.width + pillPadX * 2;
    const cx = Math.min(Math.max(x(t.v), stage.x + w / 2), stageRight - w / 2);
    at(text, cx, stage.y + pillPadY);
    pills.push({ id: `${t.area.id}:${t.side}`, kind: "threshold", targetId: t.area.id, value: t.v, rect: { x: cx - w / 2, y: stage.y, width: w, height: pillH }, text });
  }
  /* Interval lanes under the x-axis title: the bar at its true x position, its pill beside it. */
  const intervalLanes: Record<string, number> = {};
  const bars: { id: string; rect: Rect }[] = [];
  let laneTop = bottomOf(xTitle.rect) + gap * 0.9;
  for (const interval of model.intervals) {
    const centre = laneTop + pillH / 2;
    intervalLanes[interval.id] = centre;
    const pct = Math.round(interval.level * 1000) / 10;
    const text = make(`pill:interval:${interval.id}`, "pill", `${pct}% stated interval`, stage.width - pillPadX * 2, sizes.label, 650);
    const w = text.rect.width + pillPadX * 2, cap = pillH * 0.32;
    let left = x(interval.high) + cap + gap;
    if (left + w > stageRight) left = x(interval.low) - cap - gap - w;
    left = Math.max(stage.x, left);
    at(text, left + pillPadX, laneTop + pillPadY);
    pills.push({ id: `interval:${interval.id}`, kind: "interval", targetId: interval.id, rect: { x: left, y: laneTop, width: w, height: pillH }, text });
    bars.push({ id: `bar:${interval.id}`, rect: { x: x(interval.low) - cap, y: centre - cap, width: x(interval.high) - x(interval.low) + cap * 2, height: cap * 2 } });
    laneTop += laneH;
  }

  /* Collision guard over everything that carries text or sits in a lane. */
  const boxes: { id: string; rect: Rect }[] = [
    ...texts.map(t => ({ id: t.id, rect: t.rect })),
    ...(badge ? [{ id: "badge", rect: badge.rect }] : []),
    ...pills.map(p => ({ id: `pill:${p.id}`, rect: p.rect })),
    ...bars,
    { id: "card", rect: cardRect },
    ...(key ? [{ id: "key:swatch", rect: key.swatch }] : []),
  ];
  const overlap = (a: Rect, b: Rect) => a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
  for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1)
    if (overlap(boxes[i].rect, boxes[j].rect))
      diagnostics.push({ code: "distribution-text-overlap", severity: "warning", message: `"${boxes[i].id}" overlaps "${boxes[j].id}".` });
  for (const b of boxes) if (b.rect.x < L - 0.5 || b.rect.x + b.rect.width > R + 0.5 || b.rect.y < T - 0.5 || b.rect.y + b.rect.height > B + 0.5)
    refuse("distribution-text-outside", `"${b.id}" extends beyond the safe area.`);
  for (const r of Object.values(readouts)) for (const b of r.blocks)
    if (b.rect.x + b.rect.width > cardRect.x + cardRect.width - pad + 0.5 || bottomOf(b.rect) > bottomOf(cardRect) + 0.5)
      refuse("distribution-text-outside", `"${b.id}" extends beyond the readout card.`);

  const layout: DistributionLayout = {
    width: W, height: H, model, stage, plot: { x: plotLeft, y: plotTop, width: plotW, height: plotH },
    x, y, domain: { x: { min: dmin, max: dmax }, y: { min: 0, max: model.yMax } },
    xTicks, yTicks, texts, badge, pills, intervalLanes, card: { rect: cardRect, padding: pad, readouts }, key, family, sizes,
  };
  return { ok: !diagnostics.some(d => d.severity === "error"), diagnostics, layout };
}
