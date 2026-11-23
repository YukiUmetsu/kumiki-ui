/**
 * RISO1: two- or three-spot-ink printing, independent of the DOM and of a playback clock.
 * A single print is a fixed paper, a set of density/shape plates, and one ordered pass for each plate.
 * View/render adapters supply the artwork; this module owns material validation and absolute-frame timing.
 *
 * Not a photographic "halftone" look: each ink is authored on its own plate and overprints earlier ink.
 */
export interface PrintPlate {
  /** Stable source-artwork key. */
  id: string;
  color: string;
  /** Spot-ink optical strength, 0..1. */
  opacity: number;
  /** Halftone cell width in design pixels, 2..36. Fine pitches preserve facial midtones at output resolution. */
  dotCell: number;
  /** Halftone screen angle in degrees, -180..180. */
  dotAngle: number;
  /** Authored registration offset in design pixels, -12..12. */
  registration: readonly [number, number];
}
export interface RisoPrintSpec {
  version: 1;
  width: number;
  height: number;
  paper: string;
  /** No duplicate IDs. Two or three plates are supported; order determines both printing and compositing. */
  plates: readonly PrintPlate[];
  seed: number;
  /** Absolute frame at which the first plate begins to arrive. */
  startFrame: number;
  /** How long a plate takes to arrive, in frames. */
  passFrames: number;
  /** Wait between passes, in frames. */
  gapFrames: number;
}
export interface PrintIssue { code: string; path: string; message: string }
export interface PlateFrame {
  id: string;
  progress: number;
  /** Fixed for the whole film; registration never jumps at each frame. */
  offset: readonly [number, number];
}
export interface RisoFrame {
  plates: readonly PlateFrame[];
  phase: "paper" | "first-pass" | "second-pass" | "third-pass" | "hold";
}
export const RISO_PALETTE = {
  paper: "#F2E9D6", // demo values only; all public specs accept other palettes
  blue: "#2362A0",
  vermilion: "#DD593D",
} as const;
/**
 * Stock Risograph drum inks as sRGB screen approximations of the printers' published colour swatches (solid ink on
 * white uncoated stock). Real ink is translucent and varies with paper, coverage and drum wear: treat these as a
 * starting palette, not a proof.
 */
export const RISO_INKS = {
  black: "#000000",
  "federal-blue": "#3D5588",
  "medium-blue": "#3255A4",
  blue: "#0078BF",
  cornflower: "#62A8E5",
  aqua: "#5EC8E5",
  teal: "#00838A",
  "hunter-green": "#407060",
  green: "#00A95C",
  mint: "#82D8D5",
  yellow: "#FFE800",
  sunflower: "#FFB511",
  orange: "#FF6C2F",
  "fluorescent-orange": "#FF7477",
  red: "#FF665E",
  "bright-red": "#F15060",
  "fluorescent-pink": "#FF48B0",
  burgundy: "#914E72",
  purple: "#765BA7",
  brown: "#925F52",
  "flat-gold": "#BB8B41",
  "light-gray": "#88898A",
} as const;
export type RisoInkId = keyof typeof RISO_INKS;
/** A drum loaded with one ink: its AM screen angle (degrees) and its fixed registration error (design px). */
export interface RisoDrum { ink: RisoInkId; angle: number; registration: readonly [number, number] }
/**
 * Two- and three-drum sets in print order (lightest, most open ink usually last so it overprints). Screen angles are
 * 30°+ apart so AM rosettes do not beat; registration errors are small and fixed, as on one press run.
 */
export const RISO_DRUM_SETS = {
  // Stock-ink twin of the house cobalt and vermilion: the pair that reproduces skin, fur, wood and sky best
  // (mean ΔE*ab 11 over the RIG1 palettes, against 36 for blue and fluorescent pink).
  "medium-blue-orange": [
    { ink: "medium-blue", angle: 15, registration: [-.8, .6] },
    { ink: "orange", angle: 75, registration: [1.5, -1] },
  ],
  "blue-fluorescent-pink": [
    { ink: "blue", angle: 15, registration: [-.8, .6] },
    { ink: "fluorescent-pink", angle: 75, registration: [1.6, -1.1] },
  ],
  "federal-blue-sunflower": [
    { ink: "federal-blue", angle: 15, registration: [-.6, .9] },
    { ink: "sunflower", angle: 75, registration: [1.4, -.8] },
  ],
  "teal-orange": [
    { ink: "teal", angle: 15, registration: [-1, .5] },
    { ink: "orange", angle: 75, registration: [1.2, -1] },
  ],
  "green-bright-red": [
    { ink: "hunter-green", angle: 15, registration: [-.7, .8] },
    { ink: "bright-red", angle: 75, registration: [1.3, -.9] },
  ],
  "blue-pink-yellow": [
    { ink: "blue", angle: 15, registration: [-.8, .6] },
    { ink: "fluorescent-pink", angle: 75, registration: [1.6, -1.1] },
    { ink: "yellow", angle: 45, registration: [.5, 1.3] },
  ],
  "federal-blue-red-sunflower": [
    { ink: "federal-blue", angle: 15, registration: [-.6, .9] },
    { ink: "red", angle: 75, registration: [1.3, -1] },
    { ink: "sunflower", angle: 45, registration: [.4, 1.2] },
  ],
} as const satisfies Record<string, readonly RisoDrum[]>;
export type RisoDrumSetId = keyof typeof RISO_DRUM_SETS;
/** Print plates for a drum set: plate id is the ink id, so separations stay readable. */
export function risoDrumPlates(drums: readonly RisoDrum[], options: { dotCell: number; opacity?: number }): PrintPlate[] {
  return drums.map(d => ({ id: d.ink, color: RISO_INKS[d.ink], opacity: options.opacity ?? .94, dotCell: options.dotCell, dotAngle: d.angle, registration: d.registration }));
}
const HEX = /^#[a-f0-9]{6}$/i;
const finite = (n: number) => Number.isFinite(n);
const inRange = (n: number, a: number, b: number) => finite(n) && n >= a && n <= b;
export const clamp01 = (v: number) => Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;

/** Diagnostics stay actionable and path-specific; no defaults are silently invented for malformed inputs. */
export function inspectRisoPrint(spec: RisoPrintSpec): PrintIssue[] {
  const issues: PrintIssue[] = [];
  const error = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (spec.version !== 1) error("version", "/version", "Expected RISO1 version 1.");
  if (!Number.isSafeInteger(spec.width) || spec.width < 240 || spec.width > 8192) error("width", "/width", "Width must be 240..8192 pixels.");
  if (!Number.isSafeInteger(spec.height) || spec.height < 240 || spec.height > 8192) error("height", "/height", "Height must be 240..8192 pixels.");
  if (!HEX.test(spec.paper)) error("paper", "/paper", "Paper must be a six-digit hex color.");
  if (!Number.isSafeInteger(spec.seed) || spec.seed < 0 || spec.seed > 2147483647) error("seed", "/seed", "Seed must be an integer from 0 to 2147483647.");
  if (!Number.isSafeInteger(spec.startFrame) || spec.startFrame < 0) error("start-frame", "/startFrame", "Start frame must be a nonnegative integer.");
  if (!Number.isSafeInteger(spec.passFrames) || spec.passFrames < 1 || spec.passFrames > 3600) error("pass-frames", "/passFrames", "Pass duration must be 1..3600 frames.");
  if (!Number.isSafeInteger(spec.gapFrames) || spec.gapFrames < 0 || spec.gapFrames > 3600) error("gap-frames", "/gapFrames", "Gap must be 0..3600 frames.");
  if (!Array.isArray(spec.plates) || spec.plates.length < 2 || spec.plates.length > 3) {
    error("plate-count", "/plates", "A Risograph composition requires two or three separate spot-ink plates.");
    return issues;
  }
  const seen = new Set<string>();
  for (let i = 0; i < spec.plates.length; i++) {
    const p = spec.plates[i], path = "/plates/" + i;
    if (!p || typeof p.id !== "string" || !/^[a-z][a-z0-9-]{0,39}$/.test(p.id) || seen.has(p.id))
      error("plate-id", path + "/id", "Plate ID must be unique, nonempty, and use lowercase letters, numbers or hyphens.");
    else seen.add(p.id);
    if (!p || !HEX.test(p.color)) error("plate-color", path + "/color", "Ink color must be a six-digit hex color.");
    if (!p || !inRange(p.opacity, 0, 1)) error("plate-opacity", path + "/opacity", "Ink opacity must be between 0 and 1.");
    if (!p || !inRange(p.dotCell, 2, 36)) error("plate-cell", path + "/dotCell", "Dot cell size must be 2..36 design pixels.");
    if (!p || !inRange(p.dotAngle, -180, 180)) error("plate-angle", path + "/dotAngle", "Screen angle must be between -180 and 180 degrees.");
    if (!p || !Array.isArray(p.registration) || p.registration.length !== 2 || !p.registration.every((v: number) => inRange(v, -12, 12)))
      error("registration", path + "/registration", "Registration needs a finite [x, y] pair in the range -12..12.");
  }
  return issues;
}
const smoothstep = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };

/** A deterministic hash for paper pores, print blemishes, and registration. Never depends on frame. */
export function printHash(seed: number, x: number, y: number): number {
  let n = (Math.imul((x | 0) + 101, 374761393) + Math.imul((y | 0) + 211, 668265263) + Math.imul((seed | 0) + 37, 1013904223)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Resolve each plate from the absolute frame, never from elapsed time or previous state. */
export function evaluateRisoPrint(spec: RisoPrintSpec, frame: number, reducedMotion = false): RisoFrame {
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("Riso frame must be a nonnegative integer.");
  const plates = spec.plates.map((p, i): PlateFrame => {
    const start = spec.startFrame + i * (spec.passFrames + spec.gapFrames);
    return { id: p.id, progress: reducedMotion ? 1 : smoothstep((frame - start) / spec.passFrames), offset: p.registration };
  });
  const active = plates.filter(p => p.progress > 0).length, done = plates.every(p => p.progress === 1);
  return { plates, phase: done ? "hold" : active === 0 ? "paper" : active === 1 ? "first-pass" : active === 2 ? "second-pass" : "third-pass" };
}
export function plateRegistration(spec: RisoPrintSpec, plateIndex: number, variance: number): readonly [number, number] {
  const base = spec.plates[plateIndex].registration, v = clamp01(variance);
  return [base[0] + (printHash(spec.seed, plateIndex, 7) - .5) * v * 2, base[1] + (printHash(spec.seed, plateIndex, 19) - .5) * v * 2];
}
/** A real spot-ink density sample over paper. Coverage is 0..1; overprints multiply light per channel. */
export function overprintColor(paper: string, passes: ReadonlyArray<{ color: string; coverage: number; opacity: number }>): string {
  const parse = (hex: string): number[] => {
    if (!HEX.test(hex)) throw new RangeError("Print colors must be six-digit hex.");
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  };
  const channels = parse(paper);
  for (const pass of passes) {
    const ink = parse(pass.color), amount = clamp01(pass.coverage) * clamp01(pass.opacity);
    for (let c = 0; c < 3; c++) channels[c] *= 1 - amount * (1 - ink[c] / 255);
  }
  return "#" + channels.map(c => Math.round(c).toString(16).padStart(2, "0")).join("").toUpperCase();
}
/** Binary screened dot. Pure and anchored to paper coordinates, even if the camera moves. */
export function printDot(x: number, y: number, cell: number, angle: number, density: number): boolean {
  if (!inRange(cell, 3, 36) || !inRange(angle, -180, 180) || !finite(x) || !finite(y)) return false;
  const theta = angle * Math.PI / 180, rx = x * Math.cos(theta) - y * Math.sin(theta), ry = x * Math.sin(theta) + y * Math.cos(theta);
  const fx = ((rx / cell % 1) + 1) % 1 - .5, fy = ((ry / cell % 1) + 1) % 1 - .5;
  return fx * fx + fy * fy < clamp01(density) / Math.PI;
}

// ---- Colour separation -------------------------------------------------------------------------------------------

const srgbLinear = (c: number) => { const v = c / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
const labF = (t: number) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
/** CIELAB (D65) of 8-bit sRGB channels. */
function lab(r: number, g: number, b: number): [number, number, number] {
  const R = srgbLinear(r), G = srgbLinear(g), B = srgbLinear(b);
  const x = labF((.4124564 * R + .3575761 * G + .1804375 * B) / .95047), y = labF(.2126729 * R + .7151522 * G + .072175 * B),
    z = labF((.0193339 * R + .119192 * G + .9503041 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const separations = new Map<string, readonly number[]>();
/**
 * The inverse of `overprintColor`: how much of each ink (coverage 0..1, in print order) reproduces a target colour
 * on this paper under the multiply overprint model, nearest in CIELAB. Colours outside the inks' gamut come out as the
 * closest overprint the drums can make (a brown on blue and pink drums becomes a dusky violet), which is how a
 * two-colour separation behaves. Deterministic and cached per colour, paper and ink list.
 */
export function separateRisoColor(target: string, paper: string, inks: readonly string[]): readonly number[] {
  if (inks.length < 1 || inks.length > 3) throw new RangeError("Separate into one to three inks.");
  const key = target + paper + inks.join("");
  const hit = separations.get(key);
  if (hit) return hit;
  const parse = (hex: string) => {
    if (!HEX.test(hex)) throw new RangeError("Separation colours must be six-digit hex.");
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  };
  const want = lab(...(parse(target) as [number, number, number])), base = parse(paper), ink = inks.map(parse);
  const cost = (c: readonly number[]) => {
    const rgb = base.map((v, ch) => c.reduce((acc, k, i) => acc * (1 - k * (1 - ink[i][ch] / 255)), v));
    const [l, a, b] = lab(rgb[0], rgb[1], rgb[2]);
    return (l - want[0]) ** 2 + (a - want[1]) ** 2 + (b - want[2]) ** 2;
  };
  // Coarse grid over the coverage cube, then two finer passes around the best point.
  let best = inks.map(() => 0), bestCost = cost(best);
  for (const [step, span] of [[.1, 1], [.02, .1], [.005, .02]] as const) {
    const centre = best.slice(), axes = centre.map(c => {
      const values: number[] = [];
      for (let v = Math.max(0, c - span); v <= Math.min(1, c + span) + 1e-9; v += step) values.push(Math.min(1, v));
      return values;
    });
    const visit = (i: number, c: number[]) => {
      if (i === axes.length) { const k = cost(c); if (k < bestCost) { bestCost = k; best = c.slice(); } return; }
      for (const v of axes[i]) { c[i] = v; visit(i + 1, c); }
    };
    visit(0, centre.slice());
  }
  const result = best.map(v => Math.round(v * 1000) / 1000);
  separations.set(key, result);
  return result;
}

// ---- Paper -------------------------------------------------------------------------------------------------------

/** Seeded paper fibres for a sheet: short darker strokes fixed to the paper, never to the frame. */
export function risoPaperFibres(seed: number, width: number, height: number, count = 450) {
  return Array.from({ length: count }, (_, i) => ({
    x: printHash(seed, i, 31) * width,
    y: printHash(seed, i, 37) * height,
    length: 2 + printHash(seed, i, 41) * 18,
    opacity: .09 + printHash(seed, i, 43) * .18,
    vertical: printHash(seed, i, 47) > .4,
  }));
}
/** Seeded paper pores (tooth): pits the ink does not reach, so every pass shows the same paper specks. */
export function risoPaperPores(seed: number, width: number, height: number, count = 330) {
  return Array.from({ length: count }, (_, i) => ({
    x: printHash(seed + 41, i, 1) * width,
    y: printHash(seed + 41, i, 3) * height,
    r: .35 + printHash(seed + 41, i, 9) * 1.7,
  }));
}
/**
 * Ink mottle for one drum: soft specks where the ink film is thinner, as in any riso solid (uneven stencil flow and
 * paper absorbency). Each drum gets its own field; all of it is fixed to the paper. Use as dark marks in a white
 * mask over that drum's ink: opacity is how much ink the speck loses.
 */
export function risoInkMottle(seed: number, plateIndex: number, width: number, height: number, count = 1200) {
  const s = seed + 977 * (plateIndex + 1);
  return Array.from({ length: count }, (_, i) => {
    const r = .4 + printHash(s, i, 5) ** 2 * 1.4;
    return {
      x: printHash(s, i, 1) * width,
      y: printHash(s, i, 3) * height,
      // Drawn out along the paper feed (vertical), as thin ink flow streaks in the direction the drum turns.
      rx: r,
      ry: r * (1.4 + printHash(s, i, 7) * 2.2),
      angle: (printHash(s, i, 11) - .5) * 24,
      opacity: .1 + printHash(s, i, 13) * .3,
    };
  });
}
