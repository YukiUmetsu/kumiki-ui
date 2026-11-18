/**
 * Selective colour (registry item `selective-color`): high-contrast black and white that keeps chosen colours, by
 * colour thresholds and timed windows. One configuration object sets every number; nothing below is fixed except the
 * documented defaults in `SELECTIVE_COLOR_DEFAULTS`, which any config overrides.
 *
 * The pipeline is four decoupled stages, each a pure function over typed arrays, so a frame can run on any thread and
 * the per-pixel maths (`selective-color-math.ts`) can move into a shader unchanged:
 *
 *   1. temporal gate: the effect's strength at a time, from windows with fades (`strengthAt`);
 *   2. mask: how much each pixel matches a target colour, with tolerance and soft edges (`colorMask`);
 *   3. refine: matte clean-up (clean black and white), spatial feathering (edge-aware with a guided filter, He, Sun &
 *      Tang 2013, so the mask follows the object's edges instead of haloing) and temporal smoothing against flicker
 *      (`refineMask`);
 *   4. composite: a styled monochrome base (luma weights, contrast, black and white levels) blended with the original
 *      through the mask and the strength (`composite`).
 *
 * `createSelectiveColorEngine` runs them frame by frame, keeps the temporal state, checks frames and times, and logs.
 * Decoding and encoding files is the file pipeline's job (VP1.3); a renderer passes RGBA frames in.
 */
import { deltaE2000, deltaE76, hueDistance, linearToLab, LUMA_WEIGHTS, parseHex, rgbToHsv, rgbToLab, rgbToYcbcr, softFloor, softWindow, srgbToLinear } from "./selective-color-math";
import type { LumaStandard } from "./selective-color-math";

export type SelectiveColorSpace = "hsv" | "lab" | "ycbcr";

/** One colour to keep. Units of `tolerance` and `softness` follow the colour space. */
export interface SelectiveColorTarget {
  /** The colour to keep, #rrggbb. In HSV its hue is the window's centre. */
  color: string;
  /** How far a pixel may be from the colour and still keep it all. hsv: degrees of hue either side. lab: ΔE. ycbcr:
   * distance in the CbCr plane (0..1; a fully saturated primary is about 0.5 from grey). */
  tolerance: number;
  /** How far past the tolerance the colour fades out, in the same units: the mask's soft edge. */
  softness: number;
  /** Greys carry no colour: below this saturation (hsv), chroma C* ÷ 100 (lab) or 2 × CbCr chroma (ycbcr) a pixel is not
   * the colour. 0..1. */
  saturationMin: number;
  saturationSoftness: number;
  /** Too dark to carry colour: below this value (hsv), L* ÷ 100 (lab) or Y (ycbcr). 0..1. */
  valueMin: number;
  valueSoftness: number;
  /** lab: the colour difference formula. */
  metric: "cie76" | "ciede2000";
  /** lab: how much lightness counts in the difference, 0 (hue and chroma only, steady under shading) to 1. */
  lightness: number;
}

export interface SelectiveColorMonochrome {
  /** Weights of R′, G′, B′ for grey: a standard, or your own (they should add up to 1). */
  luminanceWeights: LumaStandard | readonly [number, number, number];
  /** 1 leaves contrast; above 1 deepens it around `pivot`. */
  contrastBoost: number;
  /** The grey that contrast turns about, 0..1. */
  pivot: number;
  /** `linear` scales about the pivot; `sigmoid` rolls into the blacks and whites like a print. */
  curve: "linear" | "sigmoid";
  /** Everything at or below this grey becomes black: rich, inky shadows. 0..1. */
  blackLevel: number;
  /** Everything at or above this grey becomes white. 0..1, above `blackLevel`. */
  whiteLevel: number;
}

export interface SelectiveColorFeathering {
  /** Spatial feathering radius, thousandths of the frame height (so it scales with the output). 0 for none. */
  radius: number;
  /** Feather along the picture's own edges (a guided filter with the frame's luma as guide) rather than blurring. */
  edgeAware: boolean;
  /** Guided-filter regularisation, about 1e-4 to 1e-1: higher feathers across weaker edges. */
  epsilon: number;
}

export interface SelectiveColorWindow {
  /** When the effect starts and ends, in `unit`. */
  start: number;
  end: number;
  /** Fade in and out over this long, in `unit` (the brief's transition duration). `fadeIn` and `fadeOut` override it. */
  transition?: number;
  fadeIn?: number;
  fadeOut?: number;
  /** @default "seconds" */
  unit?: "seconds" | "frames";
  /** The fade's shape. @default "smooth" */
  curve?: "linear" | "smooth";
}

export interface SelectiveColorConfig {
  /** Where colour distance is measured. hsv is quick and editor-like; lab is perceptual; ycbcr separates chroma from
   * light (good for skin). */
  colorSpace: SelectiveColorSpace;
  /** Luma weights for the YCbCr conversion. */
  ycbcrStandard: LumaStandard;
  /** Colours to keep: a pixel keeps its colour as much as it matches the best of them. None: all monochrome. */
  targets: readonly SelectiveColorTarget[];
  /** How much colour leaves the rest of the picture: 1 is full grey. */
  amount: number;
  feathering: SelectiveColorFeathering;
  /** Matte clean-up, as in a grading qualifier: lift `cleanBlack` to clear speckles from what goes grey, `cleanWhite`
   * to fill holes in what keeps colour. 0..0.5 each. */
  matte: { cleanBlack: number; cleanWhite: number };
  /** Temporal smoothing of the mask, 0 (off) to 0.95: how much of the last frame's mask carries over, against flicker.
   * High values lag behind fast motion. */
  temporal: { smoothing: number };
  monochrome: SelectiveColorMonochrome;
  /** When the effect is on. None: always on. */
  windows: readonly SelectiveColorWindow[];
  /** Outside every window: `monochrome` (the windows fade selective colour in and out of black and white) or
   * `passthrough` (the original picture, fading into the effect). */
  outside: "monochrome" | "passthrough";
  /** A time before 0 or past the duration: clamp it with a warning, or refuse it. */
  outOfRange: "clamp" | "error";
  /** Keep colour only on one item, followed through the shot, rather than on every pixel of the target colour. */
  selection?: SelectiveColorSelection;
}

/**
 * One item to keep in colour: the patch of the target colour under `seed` at time `at`, followed frame by frame by its
 * overlap with where it was. Gaps narrower than `close` are bridged and holes inside its outline filled, so a bus keeps
 * its windows and lettering; the outline is then snapped to the picture's own edges with the guided filter.
 */
export interface SelectiveColorSelection {
  /** A point on the item at time `at`, as fractions of the frame (0..1). */
  seed: { x: number; y: number };
  /** When the seed point is on the item, seconds. Before it nothing keeps colour. */
  at: number;
  /** `whole`: everything inside the item's outline keeps its real colour (windows, white panels, wheels). `colour`: only
   * the item's own target colour does. */
  keep: "whole" | "colour";
  /** Gaps up to this wide join the item (stripes, lettering, thin frames), thousandths of the frame height. */
  close: number;
  /** Fill holes inside the item's outline (windows framed by its colour). */
  fillHoles: boolean;
  /** Frames the item may vanish for (passing behind something) before it counts as gone. */
  hold: number;
  /** How far the outline snaps to the picture's edges, thousandths of the frame height. */
  edge: number;
}

/** A config to resolve: any part may be left out and takes the default. */
export type SelectiveColorInput = Partial<Omit<SelectiveColorConfig, "targets" | "monochrome" | "feathering" | "matte" | "temporal" | "selection">> & {
  targets?: readonly (Partial<SelectiveColorTarget> & { color: string })[];
  monochrome?: Partial<SelectiveColorMonochrome>;
  feathering?: Partial<SelectiveColorFeathering>;
  matte?: Partial<SelectiveColorConfig["matte"]>;
  temporal?: Partial<SelectiveColorConfig["temporal"]>;
  selection?: Partial<SelectiveColorSelection> & { seed: { x: number; y: number } };
};

/** Selection defaults: keep the whole item, bridge gaps up to 1.2% of the frame height, fill its holes. */
export const SELECTION_DEFAULTS: Omit<SelectiveColorSelection, "seed"> = { at: 0, keep: "whole", close: 12, fillHoles: true, hold: 8, edge: 3 };

/** Defaults for a noir look that keeps strong reds. Every value is a starting point, not a constant of the engine. */
export const SELECTIVE_COLOR_DEFAULTS: SelectiveColorConfig = {
  colorSpace: "hsv",
  ycbcrStandard: "rec709",
  targets: [],
  amount: 1,
  feathering: { radius: 2, edgeAware: true, epsilon: 0.002 },
  matte: { cleanBlack: 0.05, cleanWhite: 0.05 },
  temporal: { smoothing: 0.3 },
  monochrome: { luminanceWeights: "rec709", contrastBoost: 1.5, pivot: 0.45, curve: "sigmoid", blackLevel: 0.06, whiteLevel: 0.96 },
  windows: [],
  outside: "monochrome",
  outOfRange: "clamp",
};

/** Target defaults per colour space, so tolerances start in sensible units. */
export const TARGET_DEFAULTS: Readonly<Record<SelectiveColorSpace, Omit<SelectiveColorTarget, "color">>> = {
  hsv: { tolerance: 18, softness: 14, saturationMin: 0.25, saturationSoftness: 0.15, valueMin: 0.12, valueSoftness: 0.1, metric: "ciede2000", lightness: 0 },
  lab: { tolerance: 18, softness: 14, saturationMin: 0.12, saturationSoftness: 0.1, valueMin: 0.08, valueSoftness: 0.08, metric: "ciede2000", lightness: 0.3 },
  ycbcr: { tolerance: 0.08, softness: 0.07, saturationMin: 0.12, saturationSoftness: 0.1, valueMin: 0.06, valueSoftness: 0.06, metric: "ciede2000", lightness: 0 },
};

export interface SelectiveColorProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

export class SelectiveColorError extends Error {
  constructor(readonly code: string, message: string, readonly path?: string, readonly problems: readonly SelectiveColorProblem[] = []) {
    super(message);
    this.name = "SelectiveColorError";
  }
}

export interface SelectiveColorLogger {
  debug?(message: string, details?: Record<string, unknown>): void;
  info?(message: string, details?: Record<string, unknown>): void;
  warn?(message: string, details?: Record<string, unknown>): void;
  error?(message: string, details?: Record<string, unknown>): void;
}

/** An RGBA frame, 8 bits a channel, row-major. */
export interface SelectiveColorFrame { width: number; height: number; data: Uint8ClampedArray }

/* ------------------------------------------------------------------ *
 * Configuration
 * ------------------------------------------------------------------ */

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** The full config from a partial one, and its problems. Errors mean the config cannot run. */
export function resolveSelectiveColorConfig(input: SelectiveColorInput): { config: SelectiveColorConfig; problems: SelectiveColorProblem[] } {
  const d = SELECTIVE_COLOR_DEFAULTS, space = input.colorSpace ?? d.colorSpace;
  const config: SelectiveColorConfig = {
    ...d,
    ...input,
    colorSpace: space,
    targets: (input.targets ?? []).map((t) => ({ ...TARGET_DEFAULTS[space] ?? TARGET_DEFAULTS.hsv, ...t })),
    monochrome: { ...d.monochrome, ...input.monochrome },
    feathering: { ...d.feathering, ...input.feathering },
    matte: { ...d.matte, ...input.matte },
    temporal: { ...d.temporal, ...input.temporal },
    windows: input.windows ?? d.windows,
    selection: input.selection ? { ...SELECTION_DEFAULTS, ...input.selection } : undefined,
  };
  return { config, problems: inspectSelectiveColorConfig(config) };
}

/** Problems with a resolved config, as JSON pointers with fixes. */
export function inspectSelectiveColorConfig(c: SelectiveColorConfig): SelectiveColorProblem[] {
  const out: SelectiveColorProblem[] = [];
  const say = (severity: SelectiveColorProblem["severity"], code: string, path: string, message: string, hint?: string) => out.push({ severity, code, path, message, hint });
  const range = (v: unknown, lo: number, hi: number) => finite(v) && v >= lo && v <= hi;
  if (!["hsv", "lab", "ycbcr"].includes(c.colorSpace)) say("error", "sc-color-space", "/colorSpace", `"${c.colorSpace}" is not a colour space.`, "Use hsv, lab or ycbcr.");
  if (!(c.ycbcrStandard in LUMA_WEIGHTS)) say("error", "sc-ycbcr-standard", "/ycbcrStandard", `"${c.ycbcrStandard}" is not a luma standard.`, "Use rec601 or rec709.");
  if (!c.targets.length) say("warning", "sc-no-targets", "/targets", "No colour is kept, so the whole picture goes black and white.");
  const toleranceMax = c.colorSpace === "hsv" ? 180 : c.colorSpace === "lab" ? 200 : 1;
  c.targets.forEach((t, i) => {
    const at = `/targets/${i}`;
    if (!parseHex(t.color)) say("error", "sc-target-color", at + "/color", `"${t.color}" is not a #rrggbb colour.`);
    if (!range(t.tolerance, 0, toleranceMax)) say("error", "sc-target-tolerance", at + "/tolerance", `The tolerance must be 0 to ${toleranceMax} in ${c.colorSpace}.`);
    if (!range(t.softness, 0, toleranceMax)) say("error", "sc-target-softness", at + "/softness", `The softness must be 0 to ${toleranceMax} in ${c.colorSpace}.`);
    else if (t.softness === 0) say("warning", "sc-target-hard", at + "/softness", "A softness of 0 cuts a hard, pixelated edge round the colour.", "Give it a little softness, or feather the mask.");
    for (const key of ["saturationMin", "saturationSoftness", "valueMin", "valueSoftness", "lightness"] as const) if (!range(t[key], 0, 1)) say("error", "sc-target-range", `${at}/${key}`, `${key} must be 0 to 1.`);
    if (t.metric !== "cie76" && t.metric !== "ciede2000") say("error", "sc-target-metric", at + "/metric", `"${t.metric}" is not a colour difference.`, "Use cie76 or ciede2000.");
    if (c.colorSpace === "hsv" && t.tolerance + t.softness >= 180) say("warning", "sc-target-every-hue", at + "/tolerance", "Tolerance and softness together cover every hue.");
  });
  if (!range(c.amount, 0, 1)) say("error", "sc-amount", "/amount", "The amount must be 0 to 1.");
  if (!range(c.feathering.radius, 0, 100)) say("error", "sc-feather-radius", "/feathering/radius", "The feathering radius must be 0 to 100 thousandths of the frame height.");
  if (!range(c.feathering.epsilon, 1e-6, 1)) say("error", "sc-feather-epsilon", "/feathering/epsilon", "The guided-filter epsilon must be 0.000001 to 1.");
  if (!range(c.matte.cleanBlack, 0, 0.5) || !range(c.matte.cleanWhite, 0, 0.5)) say("error", "sc-matte", "/matte", "Clean black and clean white must each be 0 to 0.5.");
  if (!range(c.temporal.smoothing, 0, 0.95)) say("error", "sc-temporal", "/temporal/smoothing", "Temporal smoothing must be 0 to 0.95.", "Above that, the mask lags whole seconds behind motion.");
  const m = c.monochrome, w = typeof m.luminanceWeights === "string" ? LUMA_WEIGHTS[m.luminanceWeights] : m.luminanceWeights;
  if (!w || w.length !== 3 || !w.every((v) => finite(v) && v >= 0)) say("error", "sc-weights", "/monochrome/luminanceWeights", "Luminance weights are rec601, rec709 or three numbers of 0 or more.");
  else if (Math.abs(w[0] + w[1] + w[2] - 1) > 0.02) say("warning", "sc-weights-sum", "/monochrome/luminanceWeights", `The weights add up to ${(w[0] + w[1] + w[2]).toFixed(3)}, so white is no longer white.`, "Make them add up to 1.");
  if (!range(m.contrastBoost, 0.2, 5)) say("error", "sc-contrast", "/monochrome/contrastBoost", "The contrast boost must be 0.2 to 5.");
  if (!range(m.pivot, 0.05, 0.95)) say("error", "sc-pivot", "/monochrome/pivot", "The pivot must be 0.05 to 0.95.");
  if (m.curve !== "linear" && m.curve !== "sigmoid") say("error", "sc-curve", "/monochrome/curve", `"${m.curve}" is not a curve.`, "Use linear or sigmoid.");
  if (!range(m.blackLevel, 0, 0.9) || !range(m.whiteLevel, 0.1, 1) || m.blackLevel >= m.whiteLevel - 0.05) say("error", "sc-levels", "/monochrome", "Levels need 0 ≤ black < white ≤ 1, at least 0.05 apart.");
  c.windows.forEach((win, i) => {
    const at = `/windows/${i}`;
    if (!finite(win.start) || !finite(win.end) || win.start < 0 || win.end <= win.start) { say("error", "sc-window", at, "A window needs 0 ≤ start < end."); return; }
    if (win.unit !== undefined && win.unit !== "seconds" && win.unit !== "frames") say("error", "sc-window-unit", at + "/unit", `"${win.unit}" is not a unit.`, "Use seconds or frames.");
    const fadeIn = win.fadeIn ?? win.transition ?? 0, fadeOut = win.fadeOut ?? win.transition ?? 0;
    if (!(fadeIn >= 0) || !(fadeOut >= 0)) say("error", "sc-window-fade", at, "Fades must be 0 or more.");
    else if (fadeIn + fadeOut > win.end - win.start) say("warning", "sc-window-fade-long", at, "The fades are longer than the window, so the effect never reaches full strength.");
  });
  if (c.outside !== "monochrome" && c.outside !== "passthrough") say("error", "sc-outside", "/outside", `"${c.outside}" is not an outside mode.`, "Use monochrome or passthrough.");
  if (c.outOfRange !== "clamp" && c.outOfRange !== "error") say("error", "sc-out-of-range", "/outOfRange", `"${c.outOfRange}" is not an out-of-range mode.`, "Use clamp or error.");
  const sel = c.selection;
  if (sel) {
    if (!range(sel.seed?.x, 0, 1) || !range(sel.seed?.y, 0, 1)) say("error", "sc-selection-seed", "/selection/seed", "The seed is a point on the item, x and y as fractions of the frame, 0 to 1.");
    if (!range(sel.at, 0, Infinity)) say("error", "sc-selection-at", "/selection/at", "The seed's time must be 0 or more seconds.");
    if (sel.keep !== "whole" && sel.keep !== "colour") say("error", "sc-selection-keep", "/selection/keep", `"${sel.keep}" is not a keep mode.`, "Use whole or colour.");
    if (!range(sel.close, 0, 100)) say("error", "sc-selection-close", "/selection/close", "close must be 0 to 100 thousandths of the frame height.");
    if (!range(sel.hold, 0, 120) || !Number.isInteger(sel.hold)) say("error", "sc-selection-hold", "/selection/hold", "hold must be a whole number of frames, 0 to 120.");
    if (!range(sel.edge, 0, 50)) say("error", "sc-selection-edge", "/selection/edge", "edge must be 0 to 50 thousandths of the frame height.");
    if (!c.targets.length) say("error", "sc-selection-target", "/selection", "An item is found by its colour, so a selection needs a target colour.");
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Stage 1: temporal gate
 * ------------------------------------------------------------------ */

/** The effect's strength at time `t` seconds, 0..1: the strongest window, each fading in and out. No windows: 1. */
export function strengthAt(windows: readonly SelectiveColorWindow[], t: number, fps: number): number {
  if (!windows.length) return 1;
  let best = 0;
  for (const w of windows) {
    const k = w.unit === "frames" ? 1 / fps : 1, start = w.start * k, end = w.end * k;
    const fadeIn = (w.fadeIn ?? w.transition ?? 0) * k, fadeOut = (w.fadeOut ?? w.transition ?? 0) * k;
    if (t < start || t > end) continue;
    const shape = (v: number) => { const x = Math.min(1, Math.max(0, v)); return w.curve === "linear" ? x : x * x * (3 - 2 * x); };
    const rise = fadeIn > 0 ? shape((t - start) / fadeIn) : 1, fall = fadeOut > 0 ? shape((end - t) / fadeOut) : 1;
    best = Math.max(best, Math.min(rise, fall));
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * Stage 2: colour mask
 * ------------------------------------------------------------------ */

/** A function giving how much an sRGB colour (0..1 per channel) matches the config's targets, 0..1 (the best wins). */
export function colorMatcher(config: SelectiveColorConfig): (r: number, g: number, b: number) => number {
  const space = config.colorSpace;
  const targets = config.targets.map((t) => {
    const [r, g, b] = parseHex(t.color)!;
    return { t, hsv: rgbToHsv(r, g, b), lab: rgbToLab(r, g, b), ycc: rgbToYcbcr(r, g, b, config.ycbcrStandard) };
  });
  if (space === "hsv") return (r, g, b) => {
    const [h, s, v] = rgbToHsv(r, g, b);
    let best = 0;
    for (const { t, hsv } of targets) best = Math.max(best, softWindow(hueDistance(h, hsv[0]), t.tolerance, t.softness) * softFloor(s, t.saturationMin, t.saturationSoftness) * softFloor(v, t.valueMin, t.valueSoftness));
    return best;
  };
  if (space === "lab") return (r, g, b) => {
    const [l, a, bb] = linearToLab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)), chroma = Math.hypot(a, bb) / 100;
    let best = 0;
    for (const { t, lab } of targets) {
      const dist = t.metric === "cie76" ? deltaE76(l, a, bb, lab[0], lab[1], lab[2], t.lightness) : deltaE2000(l, a, bb, lab[0], lab[1], lab[2], t.lightness);
      best = Math.max(best, softWindow(dist, t.tolerance, t.softness) * softFloor(chroma, t.saturationMin, t.saturationSoftness) * softFloor(l / 100, t.valueMin, t.valueSoftness));
    }
    return best;
  };
  return (r, g, b) => {
    const [y, cb, cr] = rgbToYcbcr(r, g, b, config.ycbcrStandard), chroma = 2 * Math.hypot(cb, cr);
    let best = 0;
    for (const { t, ycc } of targets) best = Math.max(best, softWindow(Math.hypot(cb - ycc[1], cr - ycc[2]), t.tolerance, t.softness) * softFloor(chroma, t.saturationMin, t.saturationSoftness) * softFloor(y, t.valueMin, t.valueSoftness));
    return best;
  };
}

/** Points per side of the colour lookup table: 65³ values, about one per four 8-bit levels. */
export const MASK_LUT_SIZE = 65;
const lutCache = new WeakMap<SelectiveColorConfig, Float32Array>();

/** The match for every colour on a `MASK_LUT_SIZE`³ RGB grid, as a grading tool's 3D LUT. Cached per config. */
export function maskLut(config: SelectiveColorConfig): Float32Array {
  let lut = lutCache.get(config);
  if (lut) return lut;
  const n = MASK_LUT_SIZE, match = colorMatcher(config);
  lut = new Float32Array(n * n * n);
  for (let b = 0; b < n; b++) for (let g = 0; g < n; g++) for (let r = 0; r < n; r++) lut[r + n * (g + n * b)] = match(r / (n - 1), g / (n - 1), b / (n - 1));
  lutCache.set(config, lut);
  return lut;
}

/**
 * How much each pixel matches the targets, 0..1 (the best target wins). The match depends only on a pixel's colour, so
 * large frames in CIELAB or YCbCr read it from a 3D lookup table (trilinear; within 0.05 of the exact match in CIELAB
 * and 0.025 in YCbCr). HSV is computed directly: its hue jumps across dark, washed-out colours faster than a table can
 * follow, and it is cheap anyway. `exact` forces the direct path.
 */
export function colorMask(frame: SelectiveColorFrame, config: SelectiveColorConfig, exact = false): Float32Array {
  const { width, height, data } = frame, count = width * height, mask = new Float32Array(count);
  if (!config.targets.length) return mask;
  const N = MASK_LUT_SIZE;
  if (exact || config.colorSpace === "hsv" || count < (N * N * N) / 4) {
    const match = colorMatcher(config);
    for (let p = 0; p < count; p++) mask[p] = match(data[4 * p] / 255, data[4 * p + 1] / 255, data[4 * p + 2] / 255);
    return mask;
  }
  const lut = maskLut(config), k = (N - 1) / 255;
  for (let p = 0; p < count; p++) {
    const fr = data[4 * p] * k, fg = data[4 * p + 1] * k, fb = data[4 * p + 2] * k;
    const r0 = Math.min(N - 2, fr | 0), g0 = Math.min(N - 2, fg | 0), b0 = Math.min(N - 2, fb | 0), u = fr - r0, v = fg - g0, w = fb - b0;
    const i = r0 + N * (g0 + N * b0), gs = N, bs = N * N;
    const c00 = lut[i] + (lut[i + 1] - lut[i]) * u, c10 = lut[i + gs] + (lut[i + gs + 1] - lut[i + gs]) * u;
    const c01 = lut[i + bs] + (lut[i + bs + 1] - lut[i + bs]) * u, c11 = lut[i + gs + bs] + (lut[i + gs + bs + 1] - lut[i + gs + bs]) * u;
    const c0 = c00 + (c10 - c00) * v, c1 = c01 + (c11 - c01) * v;
    mask[p] = c0 + (c1 - c0) * w;
  }
  return mask;
}

/* ------------------------------------------------------------------ *
 * Stage 3: refine
 * ------------------------------------------------------------------ */

/** A box mean of radius r (a (2r+1)² window, shrunk at the edges), in O(n) with running sums. */
export function boxMean(src: Float32Array, width: number, height: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  if (r <= 0) { out.set(src); return out; }
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    for (let x = 0; x <= Math.min(r, width - 1); x++) sum += src[row + x];
    for (let x = 0; x < width; x++) {
      const lo = Math.max(0, x - r), hi = Math.min(width - 1, x + r);
      tmp[row + x] = sum / (hi - lo + 1);
      if (x + r + 1 < width) sum += src[row + x + r + 1];
      if (x - r >= 0) sum -= src[row + x - r];
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = 0; y <= Math.min(r, height - 1); y++) sum += tmp[y * width + x];
    for (let y = 0; y < height; y++) {
      const lo = Math.max(0, y - r), hi = Math.min(height - 1, y + r);
      out[y * width + x] = sum / (hi - lo + 1);
      if (y + r + 1 < height) sum += tmp[(y + r + 1) * width + x];
      if (y - r >= 0) sum -= tmp[(y - r) * width + x];
    }
  }
  return out;
}

/** The guided filter (He, Sun & Tang 2013): smooths `input` while following the edges of `guide`. */
export function guidedFilter(guide: Float32Array, input: Float32Array, width: number, height: number, r: number, epsilon: number): Float32Array {
  const n = guide.length, ii = new Float32Array(n), ip = new Float32Array(n);
  for (let k = 0; k < n; k++) { ii[k] = guide[k] * guide[k]; ip[k] = guide[k] * input[k]; }
  const mI = boxMean(guide, width, height, r), mP = boxMean(input, width, height, r), mII = boxMean(ii, width, height, r), mIP = boxMean(ip, width, height, r);
  const a = new Float32Array(n), b = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const variance = mII[k] - mI[k] * mI[k], covariance = mIP[k] - mI[k] * mP[k];
    a[k] = covariance / (variance + epsilon);
    b[k] = mP[k] - a[k] * mI[k];
  }
  const mA = boxMean(a, width, height, r), mB = boxMean(b, width, height, r), out = new Float32Array(n);
  for (let k = 0; k < n; k++) out[k] = Math.min(1, Math.max(0, mA[k] * guide[k] + mB[k]));
  return out;
}

/** The frame's luma, 0..1, by the monochrome weights. */
export function luma(frame: SelectiveColorFrame, weights: LumaStandard | readonly [number, number, number]): Float32Array {
  const [wr, wg, wb] = typeof weights === "string" ? LUMA_WEIGHTS[weights] : weights, { data } = frame, out = new Float32Array(frame.width * frame.height);
  for (let p = 0; p < out.length; p++) out[p] = (wr * data[4 * p] + wg * data[4 * p + 1] + wb * data[4 * p + 2]) / 255;
  return out;
}

/** Temporal state carried between frames: the last refined mask. */
export interface SelectiveColorState { previous?: Float32Array }

/** Clean the matte, feather it, and smooth it against the last frame. Updates `state`. */
export function refineMask(mask: Float32Array, frame: SelectiveColorFrame, config: SelectiveColorConfig, state: SelectiveColorState = {}): Float32Array {
  return smoothMask(cleanAndFeather(mask, frame, config), config, state);
}

/** The spatial part of refining, frame by frame with no state: clean the matte, then feather it. Frames can run on
 * separate threads. */
export function cleanAndFeather(mask: Float32Array, frame: SelectiveColorFrame, config: SelectiveColorConfig): Float32Array {
  const { width, height } = frame, { cleanBlack, cleanWhite } = config.matte, span = Math.max(1e-6, 1 - cleanBlack - cleanWhite);
  let out: Float32Array = new Float32Array(mask.length);
  for (let k = 0; k < mask.length; k++) out[k] = Math.min(1, Math.max(0, (mask[k] - cleanBlack) / span));
  const r = Math.round((config.feathering.radius / 1000) * height);
  if (r > 0) {
    if (config.feathering.edgeAware) out = guidedFilter(luma(frame, config.monochrome.luminanceWeights), out, width, height, r, config.feathering.epsilon);
    // Three box passes approach a Gaussian, so the feather has no visible box corners.
    else { const step = Math.max(1, Math.round(r / Math.sqrt(3))); out = boxMean(boxMean(boxMean(out, width, height, step), width, height, step), width, height, step); }
  }
  return out;
}

/** The temporal part of refining, in frame order: carry part of the last frame's mask over, against flicker. Updates
 * `state`; `mask` is changed in place. */
export function smoothMask(mask: Float32Array, config: SelectiveColorConfig, state: SelectiveColorState): Float32Array {
  const s = config.temporal.smoothing;
  if (s > 0 && state.previous && state.previous.length === mask.length) for (let k = 0; k < mask.length; k++) mask[k] = (1 - s) * mask[k] + s * state.previous[k];
  state.previous = mask;
  return mask;
}

/* ------------------------------------------------------------------ *
 * Stage 4: composite
 * ------------------------------------------------------------------ */

/** A 1024-entry tone table for the monochrome base: contrast about the pivot, then black and white levels. */
export function monochromeCurve(m: SelectiveColorMonochrome): Float32Array {
  const table = new Float32Array(1024), k = m.contrastBoost;
  // A logistic of the same slope at the pivot as the linear curve, rescaled so 0 and 1 stay put.
  const logistic = (x: number) => 1 / (1 + Math.exp(-4 * k * (x - m.pivot))), lo = logistic(0), hi = logistic(1);
  for (let i = 0; i < 1024; i++) {
    const y = i / 1023, c = m.curve === "sigmoid" ? (logistic(y) - lo) / (hi - lo) : m.pivot + (y - m.pivot) * k;
    table[i] = Math.min(1, Math.max(0, (c - m.blackLevel) / (m.whiteLevel - m.blackLevel)));
  }
  return table;
}

/** Blend the styled monochrome base with the original through `mask` at `strength`. Writes `out` (may be the input). */
export function composite(frame: SelectiveColorFrame, mask: Float32Array, strength: number, config: SelectiveColorConfig, out: Uint8ClampedArray = new Uint8ClampedArray(frame.data.length)): Uint8ClampedArray {
  const { data } = frame, curve = monochromeCurve(config.monochrome), amount = config.amount, passthrough = config.outside === "passthrough";
  const [wr, wg, wb] = typeof config.monochrome.luminanceWeights === "string" ? LUMA_WEIGHTS[config.monochrome.luminanceWeights] : config.monochrome.luminanceWeights;
  for (let p = 0; p < mask.length; p++) {
    const r = data[4 * p], g = data[4 * p + 1], b = data[4 * p + 2];
    const grey = 255 * curve[Math.min(1023, Math.round(((wr * r + wg * g + wb * b) / 255) * 1023))];
    // The base: the rest of the picture with `amount` of its colour taken out. Kept colour comes through the mask.
    const br = r + (grey - r) * amount, bg = g + (grey - g) * amount, bb = b + (grey - b) * amount;
    const keep = passthrough ? mask[p] : mask[p] * strength, mix = passthrough ? strength : 1;
    const sr = br + (r - br) * keep, sg = bg + (g - bg) * keep, sb = bb + (b - bb) * keep;
    out[4 * p] = r + (sr - r) * mix;
    out[4 * p + 1] = g + (sg - g) * mix;
    out[4 * p + 2] = b + (sb - b) * mix;
    out[4 * p + 3] = data[4 * p + 3];
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Selected item
 * ------------------------------------------------------------------ */

/** What the selection carries from frame to frame: where the item was (on its working grid) and how long it has been lost. */
export interface SelectionState { region?: Uint8Array; cols?: number; rows?: number; lost: number }

/** Grow (`grow` true) or shrink a binary grid by a square of radius r, in two separable passes. */
function morph(src: Uint8Array, cols: number, rows: number, r: number, grow: boolean): Uint8Array {
  if (r <= 0) return src;
  const tmp = new Uint8Array(src.length), out = new Uint8Array(src.length), hit = grow ? 1 : 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    let v = 1 - hit;
    for (let d = -r; d <= r && v !== hit; d++) { const x = Math.min(cols - 1, Math.max(0, i + d)); if (src[x + j * cols] === hit) v = hit; }
    tmp[i + j * cols] = v;
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    let v = 1 - hit;
    for (let d = -r; d <= r && v !== hit; d++) { const y = Math.min(rows - 1, Math.max(0, j + d)); if (tmp[i + y * cols] === hit) v = hit; }
    out[i + j * cols] = v;
  }
  return out;
}

/**
 * The selected item's mask for this frame (0..1, full size), from the colour mask. Run frames in order: `state` follows
 * the item. Returns zeros before the seed's time, or once the item has been lost for longer than `hold` frames.
 */
export function selectItem(mask: Float32Array, frame: SelectiveColorFrame, config: SelectiveColorConfig, state: SelectionState, t: number): Float32Array {
  const sel = config.selection!, { width: W, height: H } = frame, out = new Float32Array(W * H);
  if (t < sel.at) return out;
  // Work on a grid about 240 rows tall: enough to find and follow an item, cheap at any output size.
  const step = Math.max(1, Math.round(H / 240)), cols = Math.ceil(W / step), rows = Math.ceil(H / step), n = cols * rows;
  if (state.cols !== cols || state.rows !== rows) { state.region = undefined; state.cols = cols; state.rows = rows; }
  const on = new Uint8Array(n);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) on[i + j * cols] = mask[Math.min(H - 1, j * step + (step >> 1)) * W + Math.min(W - 1, i * step + (step >> 1))] >= 0.5 ? 1 : 0;
  // Connected patches of the colour (4-connected, union–find).
  const parent = new Int32Array(n).map((_, k) => k), find = (k: number): number => { while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; } return k; };
  for (let k = 0; k < n; k++) {
    if (!on[k]) continue;
    const i = k % cols;
    if (i > 0 && on[k - 1]) parent[find(k)] = find(k - 1);
    if (k >= cols && on[k - cols]) parent[find(k)] = find(k - cols);
  }
  const area = new Int32Array(n), chosen = new Set<number>();
  for (let k = 0; k < n; k++) if (on[k]) area[find(k)]++;
  if (!state.region) {
    // The patch under the seed, or the nearest one within a tenth of the frame.
    const si = Math.min(cols - 1, Math.floor(sel.seed.x * cols)), sj = Math.min(rows - 1, Math.floor(sel.seed.y * rows)), reach = Math.round(rows / 10);
    let best = -1, gap = Infinity;
    for (let j = Math.max(0, sj - reach); j <= Math.min(rows - 1, sj + reach); j++) for (let i = Math.max(0, si - reach); i <= Math.min(cols - 1, si + reach); i++) {
      const k = i + j * cols, d = (i - si) ** 2 + (j - sj) ** 2;
      if (on[k] && d < gap) { gap = d; best = find(k); }
    }
    if (best >= 0) chosen.add(best);
  } else {
    // The patches that overlap where the item was: it may grow, move, or break into pieces behind a lamp post.
    const near = morph(state.region, cols, rows, 2, true), overlap = new Map<number, number>();
    for (let k = 0; k < n; k++) if (on[k] && near[k]) { const r = find(k); overlap.set(r, (overlap.get(r) ?? 0) + 1); }
    for (const [r, count] of overlap) if (count >= 3 && count >= 0.1 * area[r]) chosen.add(r);
  }
  let region: Uint8Array;
  if (chosen.size) {
    state.lost = 0;
    region = new Uint8Array(n);
    for (let k = 0; k < n; k++) if (on[k] && chosen.has(find(k))) region[k] = 1;
    const r = Math.round(((sel.close / 1000) * H) / step);
    region = morph(morph(region, cols, rows, r, true), cols, rows, r, false);
    if (sel.fillHoles) {
      // Flood the outside from the grid's border; whatever it cannot reach is a hole in the item.
      const outside = new Uint8Array(n), stack: number[] = [];
      for (let k = 0; k < n; k++) { const i = k % cols, j = (k - i) / cols; if ((i === 0 || j === 0 || i === cols - 1 || j === rows - 1) && !region[k]) { outside[k] = 1; stack.push(k); } }
      while (stack.length) {
        const k = stack.pop()!, i = k % cols;
        for (const m of [i > 0 ? k - 1 : -1, i < cols - 1 ? k + 1 : -1, k - cols, k + cols]) if (m >= 0 && m < n && !outside[m] && !region[m]) { outside[m] = 1; stack.push(m); }
      }
      for (let k = 0; k < n; k++) if (!outside[k]) region[k] = 1;
    }
    state.region = region;
  } else if (state.region && state.lost < sel.hold) {
    state.lost++;
    region = state.region;
  } else {
    state.region = undefined;
    return out;
  }
  // Up to full size, bilinear, then snapped to the picture's edges.
  for (let y = 0; y < H; y++) {
    const fy = Math.min(rows - 1, Math.max(0, (y + 0.5) / step - 0.5)), j0 = Math.min(rows - 2, Math.floor(fy)), v = rows > 1 ? fy - j0 : 0;
    for (let x = 0; x < W; x++) {
      const fx = Math.min(cols - 1, Math.max(0, (x + 0.5) / step - 0.5)), i0 = Math.min(cols - 2, Math.floor(fx)), u = cols > 1 ? fx - i0 : 0;
      const k = Math.max(0, i0) + Math.max(0, j0) * cols, a = region[k], b = region[Math.min(n - 1, k + 1)], c = region[Math.min(n - 1, k + cols)], d = region[Math.min(n - 1, k + cols + 1)];
      out[x + y * W] = (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    }
  }
  const edge = Math.round((sel.edge / 1000) * H);
  const snapped = edge > 0 ? guidedFilter(luma(frame, config.monochrome.luminanceWeights), out, W, H, edge, 1e-3) : out;
  if (sel.keep === "colour") for (let k = 0; k < snapped.length; k++) snapped[k] *= mask[k];
  return snapped;
}

/* ------------------------------------------------------------------ *
 * The engine
 * ------------------------------------------------------------------ */

export interface SelectiveColorFrameReport {
  /** The time used, seconds (after clamping). */
  time: number;
  strength: number;
  /** Share of the picture that keeps colour (mask ≥ 0.5). */
  kept: number;
  milliseconds: number;
}

export interface SelectiveColorEngine {
  readonly config: SelectiveColorConfig;
  readonly problems: readonly SelectiveColorProblem[];
  strengthAt(t: number): number;
  /** Process one frame at `t` seconds into `out` (a new buffer by default; it may be `frame.data`). */
  process(frame: SelectiveColorFrame, t: number, out?: Uint8ClampedArray): { data: Uint8ClampedArray; mask: Float32Array; report: SelectiveColorFrameReport };
  /** Forget the temporal state (after a cut or a seek). */
  reset(): void;
}

/**
 * An engine for one shot. Throws `SelectiveColorError` (code `sc-config`) when the config has errors; logs warnings.
 * `fps` turns frame windows into seconds; `duration` (seconds) bounds times.
 */
export function createSelectiveColorEngine(input: SelectiveColorInput, options: { fps?: number; duration?: number; logger?: SelectiveColorLogger } = {}): SelectiveColorEngine {
  const { config, problems } = resolveSelectiveColorConfig(input), log = options.logger ?? {}, fps = options.fps ?? 30;
  const errors = problems.filter((p) => p.severity === "error");
  if (errors.length) {
    log.error?.("selective colour: the config has errors", { problems: errors });
    throw new SelectiveColorError("sc-config", errors.map((p) => `${p.path}: ${p.message}`).join(" "), errors[0].path, errors);
  }
  for (const p of problems) log.warn?.(`selective colour: ${p.message}`, { code: p.code, path: p.path, hint: p.hint });
  if (!(fps > 0)) throw new SelectiveColorError("sc-fps", "fps must be above 0.");
  const state: SelectiveColorState = {}, selection: SelectionState = { lost: 0 };
  const time = (t: number) => {
    const limit = options.duration;
    if (!Number.isFinite(t)) throw new SelectiveColorError("sc-time", `The time ${t} is not a number.`);
    if (t >= 0 && (limit === undefined || t <= limit)) return t;
    const message = `The time ${t.toFixed(3)} s is outside 0 to ${limit === undefined ? "∞" : limit.toFixed(3)} s.`;
    if (config.outOfRange === "error") { log.error?.(`selective colour: ${message}`); throw new SelectiveColorError("sc-time-range", message); }
    log.warn?.(`selective colour: ${message} It is clamped.`, { time: t });
    return Math.min(limit ?? Infinity, Math.max(0, t));
  };
  return {
    config,
    problems,
    strengthAt: (t) => strengthAt(config.windows, time(t), fps),
    process(frame, t, out) {
      const started = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (!(frame.width > 0 && frame.height > 0) || frame.data.length !== frame.width * frame.height * 4) {
        const message = `A ${frame.width}×${frame.height} frame needs ${frame.width * frame.height * 4} bytes of RGBA, and has ${frame.data.length}.`;
        log.error?.(`selective colour: ${message}`);
        throw new SelectiveColorError("sc-frame", message);
      }
      if (state.previous && state.previous.length !== frame.width * frame.height) { log.info?.("selective colour: the frame size changed; temporal state reset"); state.previous = undefined; }
      const at = time(t), strength = strengthAt(config.windows, at, fps);
      const refined = refineMask(colorMask(frame, config), frame, config, state);
      const mask = config.selection ? selectItem(refined, frame, config, selection, at) : refined;
      const data = composite(frame, mask, strength, config, out);
      let kept = 0;
      for (const v of mask) if (v >= 0.5) kept++;
      const report = { time: at, strength, kept: kept / mask.length, milliseconds: (typeof performance !== "undefined" ? performance.now() : Date.now()) - started };
      log.debug?.("selective colour: frame", report);
      return { data, mask, report };
    },
    reset() { state.previous = undefined; selection.region = undefined; selection.lost = 0; },
  };
}
