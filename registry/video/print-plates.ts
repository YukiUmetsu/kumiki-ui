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
  /** Halftone cell width in design pixels, 3..36. */
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
    if (!p || !inRange(p.dotCell, 3, 36)) error("plate-cell", path + "/dotCell", "Dot cell size must be 3..36 design pixels.");
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
