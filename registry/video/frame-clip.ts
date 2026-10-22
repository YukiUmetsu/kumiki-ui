/** FrameAccurateClip core: which source frame belongs on each output frame, and how to draw it.
 * Pure and renderer-free. Decoding is delegated to a capability-advertising adapter
 * (see frame-clip-adapters.ts), so image sequences, procedural renderers, browser video or a
 * consumer's own WebCodecs/server decoder all plug into the same contract. Audio is a
 * separate lane: a clip may reference a track but never plays it.
 */
import { evaluateEasing } from "../motion/easing";
import type { Diagnostic, EasingSpec, RationalFps, Rect } from "../motion/types";

export interface ClipSource {
  id: string;
  width: number;
  height: number;
  frameCount: number;
  /** Constant frame rate. Either `fps` or `timestamps` is required. */
  fps?: RationalFps;
  /** Variable frame rate: presentation time (seconds) of every frame, ascending. Takes precedence over `fps`. */
  timestamps?: readonly number[];
  alpha?: "none" | "straight" | "premultiplied";
  sha256?: string;
  licenseRef?: string;
  /** Separate audio lane reference; never played by the clip. */
  audio?: { trackRef: string };
}
export interface ClipFreeze {
  /** Clip-local output frame where playback pauses. */
  atFrame: number;
  durationFrames: number;
  /** Show this source frame instead of the paused one (e.g. the exact frame to examine). */
  sourceFrame?: number;
}
export interface ClipRemapKey { frame: number; sourceFrame: number; easing?: EasingSpec }
export interface ClipTiming {
  /** First source frame played (default 0). */
  trimIn?: number;
  /** Exclusive last source frame (default frameCount). */
  trimOut?: number;
  /** Playback speed; negative plays backwards from trimOut - 1. Default 1. */
  rate?: number | RationalFps;
  /** Pauses that hold a frame and then resume where playback stopped. */
  freezes?: readonly ClipFreeze[];
  /** Full time remap (clip-local output frame → source frame); overrides rate and freezes. */
  remap?: readonly ClipRemapKey[];
  /** How a time between two source frames resolves. Default `floor` (the frame on screen at that time). */
  sampling?: "floor" | "nearest";
  /** After the trimmed source runs out: hold the last frame or hide the clip. Default `hold`. */
  end?: "hold" | "hide";
}
export interface ClipPlacement {
  id: string;
  source: ClipSource;
  /** Output frame where the clip starts. */
  startFrame: number;
  durationFrames: number;
  timing?: ClipTiming;
}
export type ClipPhase = "before" | "playing" | "frozen" | "held" | "after" | "exhausted";
export interface ResolvedClipFrame {
  visible: boolean;
  phase: ClipPhase;
  /** Clip-local output frame. */
  localFrame: number;
  /** Integer source frame to display (undefined when hidden). */
  sourceFrame?: number;
  /** Source presentation time of that frame, in seconds. */
  sourceTime?: number;
}
export interface ClipDiagnostic extends Diagnostic { clipId?: string }

const ratio = (r: number | RationalFps | undefined) => r === undefined ? 1 : typeof r === "number" ? r : r.num / r.den;
const fpsValue = (fps: RationalFps) => fps.num / fps.den;
const EPS = 1e-6;

/** Presentation time of a source frame. */
export function clipFrameTime(source: ClipSource, index: number): number {
  if (source.timestamps) return source.timestamps[Math.max(0, Math.min(source.timestamps.length - 1, index))];
  return index / fpsValue(source.fps!);
}
/** Source frame shown at a source time. */
export function clipFrameAt(source: ClipSource, seconds: number, sampling: ClipTiming["sampling"] = "floor"): number {
  if (source.timestamps) {
    const ts = source.timestamps;
    let lo = 0, hi = ts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ts[mid] <= seconds + EPS) lo = mid; else hi = mid - 1; }
    if (sampling === "nearest" && lo + 1 < ts.length && ts[lo + 1] - seconds < seconds - ts[lo]) return lo + 1;
    return lo;
  }
  const exact = seconds * fpsValue(source.fps!);
  return sampling === "nearest" ? Math.round(exact) : Math.floor(exact + EPS);
}

export function validateClip(placement: ClipPlacement, outputFps: RationalFps): ClipDiagnostic[] {
  const out: ClipDiagnostic[] = [];
  const error = (code: string, message: string, frame?: number) => out.push({ code, severity: "error", message, clipId: placement.id, frame });
  const warn = (code: string, message: string, frame?: number) => out.push({ code, severity: "warning", message, clipId: placement.id, frame });
  const { source } = placement, timing = placement.timing ?? {};
  if (!placement.id.trim() || !Number.isSafeInteger(placement.startFrame) || !Number.isSafeInteger(placement.durationFrames) || placement.durationFrames < 1)
    error("clip-invalid", `Clip "${placement.id}" needs an ID and integer start and duration frames.`);
  if (!(outputFps.num > 0 && outputFps.den > 0)) error("clip-invalid", "Output FPS must be positive.");
  if (!(source.width > 0 && source.height > 0) || !Number.isSafeInteger(source.frameCount) || source.frameCount < 1)
    error("clip-source-invalid", `Source "${source.id}" needs positive dimensions and frame count.`);
  if (source.timestamps) {
    if (source.timestamps.length !== source.frameCount || source.timestamps.some((t, i) => !Number.isFinite(t) || (i > 0 && t <= source.timestamps![i - 1])))
      error("clip-timestamps-invalid", `Source "${source.id}" needs one strictly ascending timestamp per frame.`);
  } else if (!source.fps || !(source.fps.num > 0 && source.fps.den > 0))
    error("clip-source-invalid", `Source "${source.id}" needs a rational fps or per-frame timestamps.`);
  const trimIn = timing.trimIn ?? 0, trimOut = timing.trimOut ?? source.frameCount;
  if (!Number.isSafeInteger(trimIn) || !Number.isSafeInteger(trimOut) || trimIn < 0 || trimOut > source.frameCount || trimOut <= trimIn)
    error("clip-trim-invalid", `Trim ${trimIn}–${trimOut} must be integers inside 0–${source.frameCount} with out after in.`);
  if (!Number.isFinite(ratio(timing.rate)) || ratio(timing.rate) === 0) error("clip-rate-invalid", "Playback rate must be a finite non-zero number.");
  let previous = -1;
  for (const freeze of [...(timing.freezes ?? [])].sort((a, b) => a.atFrame - b.atFrame)) {
    if (!Number.isSafeInteger(freeze.atFrame) || !Number.isSafeInteger(freeze.durationFrames) || freeze.durationFrames < 1 || freeze.atFrame < previous)
      error("clip-freeze-invalid", `Freeze at ${freeze.atFrame} needs integer frames, a positive duration and no overlap.`, freeze.atFrame);
    if (freeze.sourceFrame !== undefined && (!Number.isSafeInteger(freeze.sourceFrame) || freeze.sourceFrame < trimIn || freeze.sourceFrame >= trimOut))
      error("clip-freeze-invalid", `Freeze source frame ${freeze.sourceFrame} is outside the trim.`, freeze.atFrame);
    previous = freeze.atFrame + freeze.durationFrames;
  }
  if (timing.remap) {
    if (!timing.remap.length || timing.remap[0].frame !== 0 || timing.remap.some((k, i) => !Number.isSafeInteger(k.frame) || (i > 0 && k.frame <= timing.remap![i - 1].frame) ||
      !(k.sourceFrame >= trimIn && k.sourceFrame <= trimOut - 1)))
      error("clip-remap-invalid", "Remap keys start at frame 0, ascend, and map inside the trim.");
    if (timing.freezes?.length || timing.rate !== undefined) warn("clip-remap-overrides", "Remap overrides rate and freezes; remove them to avoid confusion.");
  }
  if (!out.some(d => d.severity === "error")) {
    const last = resolveClipFrame(placement, placement.startFrame + placement.durationFrames - 1, outputFps);
    if (last.phase === "exhausted" || last.phase === "held" && (timing.end ?? "hold") === "hold")
      warn("clip-source-exhausted", `Clip "${placement.id}" runs past its trimmed source and ${(timing.end ?? "hold") === "hold" ? "holds the last frame" : "disappears"}.`, placement.startFrame + placement.durationFrames - 1);
  }
  return out;
}

/** The source frame for an output frame. Pure: depends only on (placement, frame, fps). */
export function resolveClipFrame(placement: ClipPlacement, outputFrame: number, outputFps: RationalFps): ResolvedClipFrame {
  const local = outputFrame - placement.startFrame, timing = placement.timing ?? {}, { source } = placement;
  if (local < 0) return { visible: false, phase: "before", localFrame: local };
  if (local >= placement.durationFrames) return { visible: false, phase: "after", localFrame: local };
  const trimIn = timing.trimIn ?? 0, trimOut = timing.trimOut ?? source.frameCount, sampling = timing.sampling ?? "floor";
  const shown = (frame: number, phase: ClipPhase): ResolvedClipFrame =>
    ({ visible: true, phase, localFrame: local, sourceFrame: frame, sourceTime: clipFrameTime(source, frame) });
  if (timing.remap?.length) {
    const keys = timing.remap;
    let i = 0; while (i + 1 < keys.length && keys[i + 1].frame <= local) i += 1;
    const a = keys[i], b = keys[i + 1];
    const value = !b ? a.sourceFrame : a.sourceFrame + (b.sourceFrame - a.sourceFrame) * evaluateEasing(b.easing ?? "linear", (local - a.frame) / (b.frame - a.frame));
    const frame = sampling === "nearest" ? Math.round(value) : Math.floor(value + EPS);
    return shown(Math.max(trimIn, Math.min(trimOut - 1, frame)), !b && local > a.frame ? "held" : "playing");
  }
  // Freezes pause the playhead; playback resumes where it stopped.
  let paused = 0;
  for (const freeze of [...(timing.freezes ?? [])].sort((x, y) => x.atFrame - y.atFrame)) {
    if (local >= freeze.atFrame + freeze.durationFrames) { paused += freeze.durationFrames; continue; }
    if (local >= freeze.atFrame) {
      const at = freeze.sourceFrame ?? sourceAt(freeze.atFrame - paused);
      return at === undefined ? { visible: false, phase: "exhausted", localFrame: local } : shown(at, "frozen");
    }
  }
  const frame = sourceAt(local - paused);
  if (frame !== undefined) return shown(frame, "playing");
  if ((timing.end ?? "hold") === "hide") return { visible: false, phase: "exhausted", localFrame: local };
  return shown(ratio(timing.rate) < 0 ? trimIn : trimOut - 1, "held");

  function sourceAt(playhead: number): number | undefined {
    const rate = ratio(timing.rate), elapsed = playhead * rate / fpsValue(outputFps);
    const origin = clipFrameTime(source, rate < 0 ? trimOut - 1 : trimIn);
    const index = clipFrameAt(source, origin + elapsed, sampling);
    return index < trimIn || index >= trimOut ? undefined : index;
  }
}

export interface ClipFraming {
  /** Source-pixel crop; default the full frame. */
  crop?: Rect;
  /** `cover` fills the box (cropping), `contain` letterboxes. Default `cover`. */
  fit?: "cover" | "contain";
  /** Normalized focal point kept in view when `cover` crops. Default centre. */
  focus?: { x: number; y: number };
}
export interface ClipDraw { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number; scale: number }
/** Source → box mapping for one output box; each output can reframe independently. */
export function resolveClipDraw(source: Pick<ClipSource, "width" | "height">, box: { width: number; height: number }, framing: ClipFraming = {}): ClipDraw {
  const crop = framing.crop ?? { x: 0, y: 0, width: source.width, height: source.height };
  const fx = Math.min(1, Math.max(0, framing.focus?.x ?? 0.5)), fy = Math.min(1, Math.max(0, framing.focus?.y ?? 0.5));
  if ((framing.fit ?? "cover") === "contain") {
    const scale = Math.min(box.width / crop.width, box.height / crop.height), dw = crop.width * scale, dh = crop.height * scale;
    return { sx: crop.x, sy: crop.y, sw: crop.width, sh: crop.height, dx: (box.width - dw) / 2, dy: (box.height - dh) / 2, dw, dh, scale };
  }
  const scale = Math.max(box.width / crop.width, box.height / crop.height), sw = box.width / scale, sh = box.height / scale;
  return { sx: crop.x + (crop.width - sw) * fx, sy: crop.y + (crop.height - sh) * fy, sw, sh, dx: 0, dy: 0, dw: box.width, dh: box.height, scale };
}
/** Framing diagnostics for one output box. */
export function inspectClipFraming(placement: ClipPlacement, box: { width: number; height: number }, framing: ClipFraming = {}, maxUpscale = 1.5): ClipDiagnostic[] {
  const { source } = placement, out: ClipDiagnostic[] = [], crop = framing.crop;
  if (crop && (crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0 || crop.x + crop.width > source.width || crop.y + crop.height > source.height))
    out.push({ code: "clip-crop-invalid", severity: "error", clipId: placement.id, message: `Crop must lie inside the ${source.width}×${source.height} source.` });
  else {
    const draw = resolveClipDraw(source, box, framing);
    if (draw.scale > maxUpscale)
      out.push({ code: "clip-upscaled", severity: "warning", clipId: placement.id, message: `Source pixels are enlarged ×${draw.scale.toFixed(2)} in a ${box.width}×${box.height} box; supply a higher-resolution source or a wider crop.` });
  }
  return out;
}

export interface ClipAdapterCapabilities {
  /** `true`: every load is exactly the requested frame. `"verified"`: each load reports whether it was
   * confirmed (unconfirmed frames fail under requireExact). `false`: frames may be approximate. */
  exactFrames: boolean | "verified";
  alpha: boolean;
  vfr: boolean;
  maxDimension?: number;
}
/** Capability check before rendering or export: missing capabilities fail visibly. */
export function checkClipCapabilities(placement: ClipPlacement, adapter: { id: string; capabilities: ClipAdapterCapabilities }, options: { requireExact?: boolean } = {}): ClipDiagnostic[] {
  const { source } = placement, caps = adapter.capabilities, out: ClipDiagnostic[] = [];
  const add = (severity: "error" | "warning", code: string, message: string) => out.push({ code, severity, clipId: placement.id, capability: code, message });
  if (options.requireExact && caps.exactFrames === false)
    add("error", "clip-decoder-inexact", `Adapter "${adapter.id}" cannot guarantee or verify exact frames; use an image sequence, an exact decoder or a verifying adapter for export.`);
  if (source.alpha && source.alpha !== "none" && !caps.alpha) add("error", "clip-alpha-unsupported", `Adapter "${adapter.id}" drops the source's ${source.alpha} alpha.`);
  if (source.timestamps && !caps.vfr) add("error", "clip-vfr-unsupported", `Adapter "${adapter.id}" cannot seek variable-frame-rate source "${source.id}".`);
  if (caps.maxDimension && Math.max(source.width, source.height) > caps.maxDimension)
    add("error", "clip-dimension-unsupported", `Adapter "${adapter.id}" supports at most ${caps.maxDimension}px; source is ${source.width}×${source.height}.`);
  if (!source.licenseRef?.trim()) add("warning", "clip-license-missing", `Source "${source.id}" has no licence reference.`);
  return out;
}
