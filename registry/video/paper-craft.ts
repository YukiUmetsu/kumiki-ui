/**
 * PAPER1 — deterministic, material-native paper-craft scene evaluation.
 * Native cut-out shapes, exposed holes, hinges and folds: not a video filter.
 * Pure absolute-frame evaluation; no timers, global RNG or second timeline.
 */
export type PaperStyle = "layered" | "kirigami" | "pop-up" | "lightbox" | "shadow-puppet";
export type PaperMotion = "rise" | "swing" | "unfold" | "still";
export interface PaperCutLayer {
  id: string;
  /** Authored paper contour, in output-sheet coordinates. */
  path: string;
  /** Holes are empty physical cut-outs. They never receive the layer's fill. */
  holes?: readonly string[];
  color: string;
  /** Z-order and shadow separation (0 = at the backing). */
  depth: number;
  /** Hinge/pivot in the same coordinate system as path. */
  pivot?: readonly [number, number];
  motion?: PaperMotion;
  /** Optional authored maximum swing, in degrees (bounded to 30). */
  swingDegrees?: number;
  /** Local entry cue, absolute frames within this scene. */
  enterFrame?: number;
  /** Duration of local assembly beat (frames). */
  durationFrames?: number;
}
export interface PaperCraftSpec {
  version: 1;
  id: string;
  style: PaperStyle;
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
  seed: number;
  backing: string;
  /** Foreground-to-background light tint for the chosen paper stock. */
  light: string;
  layers: readonly PaperCutLayer[];
}
export interface PaperLayerFrame {
  id: string;
  /** Static once the cut-out is assembled. */
  progress: number;
  opacity: number;
  translateX: number;
  translateY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  shadowX: number;
  shadowY: number;
  shadowBlur: number;
}
export interface PaperCraftFrame {
  frame: number;
  layers: readonly PaperLayerFrame[];
}
export interface PaperIssue { path: string; message: string }
export const PAPER_STYLES: readonly PaperStyle[] = ["layered", "kirigami", "pop-up", "lightbox", "shadow-puppet"];
const hex = /^#[0-9a-fA-F]{6}$/;
const finite = (n: number) => Number.isFinite(n);
export const paperClamp = (v: number) => Math.max(0, Math.min(1, v));
export const paperEase = (v: number) => { const t = paperClamp(v); return t * t * (3 - 2 * t); };
/** Paper-safe independent hash: texture offsets do not evolve with the video clock. */
export function paperHash(seed: number, index: number, channel: number): number {
  let n = (seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(channel + 17, 0x85ebca6b)) | 0;
  n ^= n >>> 16; n = Math.imul(n, 0x7feb352d); n ^= n >>> 15;
  n = Math.imul(n, 0x846ca68b); n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
export function inspectPaperCraft(spec: PaperCraftSpec): PaperIssue[] {
  const issues: PaperIssue[] = [], bad = (path: string, message: string) => issues.push({ path, message });
  if (spec.version !== 1) bad("version", "PAPER1 requires version 1");
  if (!spec.id || !/^[a-zA-Z0-9_-]+$/.test(spec.id)) bad("id", "use a nonempty stable ASCII identifier");
  if (!PAPER_STYLES.includes(spec.style)) bad("style", "unsupported paper medium");
  if (![spec.width, spec.height].every(n => Number.isInteger(n) && n >= 128 && n <= 4096)) bad("size", "width and height must be 128–4096");
  if (!Number.isInteger(spec.fps) || spec.fps < 1 || spec.fps > 120) bad("fps", "FPS must be 1–120");
  if (!Number.isInteger(spec.durationFrames) || spec.durationFrames < 1 || spec.durationFrames > 36000) bad("durationFrames", "duration must be 1–36000");
  if (!Number.isSafeInteger(spec.seed)) bad("seed", "seed must be a safe integer");
  if (!hex.test(spec.backing) || !hex.test(spec.light)) bad("paper", "paper colours must be opaque six-digit hex");
  if (!Array.isArray(spec.layers) || spec.layers.length < 1 || spec.layers.length > 80) bad("layers", "provide 1–80 separate cut-outs");
  const seen = new Set<string>();
  for (const [i, layer] of (Array.isArray(spec.layers) ? spec.layers : []).entries()) {
    const base = `layers[${i}]`;
    if (!layer.id || !/^[a-zA-Z0-9_-]+$/.test(layer.id) || seen.has(layer.id)) bad(base + ".id", "unique stable id required");
    seen.add(layer.id);
    if (!layer.path || layer.path.length > 50000 || !/^[Mm]/.test(layer.path.trim()))
      bad(base + ".path", "provide a bounded SVG cut contour");
    if (!hex.test(layer.color)) bad(base + ".color", "colour must be opaque hex");
    if (!Number.isInteger(layer.depth) || layer.depth < 0 || layer.depth > 32) bad(base + ".depth", "depth must be 0–32");
    if (layer.holes && (layer.holes.length > 32 || layer.holes.some(h => !/^[Mm]/.test(h.trim()) || h.length > 10000)))
      bad(base + ".holes", "each hole must be an SVG contour; maximum 32 holes");
    if (layer.pivot && (layer.pivot.length !== 2 || layer.pivot.some(n => !finite(n) || n < -4096 || n > 8192)))
      bad(base + ".pivot", "finite sheet-coordinate hinge required");
    if (layer.motion && !["rise", "swing", "unfold", "still"].includes(layer.motion)) bad(base + ".motion", "unknown material motion");
    if (layer.swingDegrees !== undefined && (!finite(layer.swingDegrees) || Math.abs(layer.swingDegrees) > 30))
      bad(base + ".swingDegrees", "swing must be within ±30 degrees");
    if (layer.enterFrame !== undefined && (!Number.isInteger(layer.enterFrame) || layer.enterFrame < 0 || layer.enterFrame >= spec.durationFrames))
      bad(base + ".enterFrame", "entry must be inside the scene");
    if (layer.durationFrames !== undefined && (!Number.isInteger(layer.durationFrames) || layer.durationFrames < 1 || layer.durationFrames > spec.durationFrames))
      bad(base + ".durationFrames", "entry duration must be 1–durationFrames");
  }
  return issues;
}
export function evaluatePaperCraft(spec: PaperCraftSpec, frame: number, reducedMotion = false): PaperCraftFrame {
  const issues = inspectPaperCraft(spec);
  if (issues.length) throw new Error("Invalid PAPER1 scene: " + issues.map(x => x.path + ": " + x.message).join("; "));
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("PAPER1 frame must be a nonnegative integer");
  const layers = spec.layers.map((layer, i): PaperLayerFrame => {
    const start = layer.enterFrame ?? (8 + i * 11);
    const duration = layer.durationFrames ?? 38;
    const progress = reducedMotion ? 1 : paperEase((frame - start) / duration);
    const pivot = layer.pivot ?? [spec.width / 2, spec.height / 2];
    const motion = layer.motion ?? (spec.style === "kirigami" ? "unfold" : spec.style === "pop-up" ? "rise" : "still");
    const age = Math.max(0, (frame - start) / spec.fps);
    const swing = reducedMotion || progress <= 0 ? 0 : (layer.swingDegrees ?? 8) *
      Math.exp(-age * .9) * Math.sin(age * 5.6 + paperHash(spec.seed, i, 11) * .6);
    const fold = motion === "unfold" || (spec.style === "kirigami" && motion === "still");
    const rise = motion === "rise" || (spec.style === "pop-up" && motion === "still");
    // Kirigami uses a hinged projection. Pop-up rises from a paper crease.
    const rotation = motion === "swing" ? swing :
      spec.style === "layered" ? (1 - progress) * (i % 2 ? -3.5 : 3.5) : 0;
    const depth = layer.depth;
    const parallax = spec.style === "lightbox" ? Math.sin(frame / spec.fps * .35) * depth * .55 : 0;
    return {
      id: layer.id, progress, opacity: progress <= 0 ? 0 : 1,
      translateX: parallax + (spec.style === "layered" ? (1 - progress) * (i % 2 ? -18 : 18) : 0),
      translateY: rise ? (1 - progress) * (24 + depth * 1.5) :
        spec.style === "layered" ? (1 - progress) * 24 : 0,
      rotation,
      scaleX: fold ? Math.max(.015, progress) : 1,
      scaleY: rise ? Math.max(.015, progress) : 1,
      shadowX: 1.8 + depth * (spec.style === "lightbox" ? 1.05 : .55),
      shadowY: 2 + depth * (spec.style === "lightbox" ? 1.65 : .8),
      shadowBlur: 2.2 + depth * (spec.style === "lightbox" ? 1.9 : .85),
    };
  });
  return { frame, layers };
}
