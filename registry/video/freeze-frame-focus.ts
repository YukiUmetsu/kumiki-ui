/** FreezeFrameFocus: pause footage (or animation) on an exact frame, push in on an annotated
 * detail, explain it with callouts, then release and resume. A recipe over FrameAccurateClip
 * (freeze + animated crop) and SemanticCallouts (labels on an InspectableAsset built from
 * source-pixel annotations). Pure per frame; no clock, no new renderer.
 */
import { evaluateEasing } from "../motion/easing";
import type { Diagnostic, EasingSpec, RationalFps, Rect } from "../motion/types";
import { createInspectableAsset } from "../visual/inspectable-asset";
import type { InspectableAsset } from "../visual/inspectable-asset";
import type { CalloutSpec } from "../visual/semantic-callouts";
import { inspectClipFraming, interpolateCrop, regionCrop, resolveClipDraw, resolveClipFrame, validateClip } from "./frame-clip";
import type { ClipDraw, ClipFraming, ClipPlacement } from "./frame-clip";

export interface FootageAnnotation {
  id: string;
  label?: string;
  /** Region in source pixels at authored source frames (e.g. from a tracker). Linear between keys;
   * outside the keyed range the region is untracked and never guessed. */
  keys: readonly { sourceFrame: number; rect: Rect }[];
}
export interface FreezeFocusCallout extends Omit<CalloutSpec, "window" | "anchorId" | "partId"> {
  annotationId: string;
  /** Frames after the push-in finishes before this callout appears. Default 0. */
  delayFrames?: number;
}
export interface FreezeFrameFocusSpec {
  id: string;
  /** The clip to pause. Its own timing is kept; the freeze is added. */
  clip: ClipPlacement;
  /** Clip-local output frame where playback pauses, how long, and optionally the exact source frame to show. */
  freeze: { atFrame: number; durationFrames: number; sourceFrame?: number };
  annotations: readonly FootageAnnotation[];
  focus: {
    annotationId: string;
    /** Space around the detail as a fraction of its size. Default 0.35. */
    padding?: number;
    pushInFrames?: number;
    releaseFrames?: number;
    easing?: EasingSpec;
    /** Darkening outside the detail, 0..1. Default 0.55. */
    dim?: number;
  };
  callouts?: readonly FreezeFocusCallout[];
}
export type FreezePhase = "before" | "push-in" | "hold" | "release" | "after";
export interface FreezeFocusFrame {
  phase: FreezePhase;
  /** 0 (normal framing) → 1 (fully pushed in). */
  amount: number;
  /** Framing to pass to FrameAccurateClip for this box. */
  framing: ClipFraming;
  draw: ClipDraw;
  /** Detail region in box pixels (undefined when untracked). */
  focusRect?: Rect;
  dim: number;
}
export interface FreezeFocusDiagnostic extends Diagnostic { annotationId?: string }

/** The clip with the freeze added, ready for FrameAccurateClip. */
export function freezeFocusClip(spec: FreezeFrameFocusSpec): ClipPlacement {
  const timing = spec.clip.timing ?? {};
  return { ...spec.clip, timing: { ...timing, freezes: [...(timing.freezes ?? []), { ...spec.freeze }] } };
}
/** Source-pixel region of an annotation at a source frame, or undefined when untracked there. */
export function annotationRect(annotation: FootageAnnotation, sourceFrame: number): Rect | undefined {
  const keys = annotation.keys;
  if (!keys.length || sourceFrame < keys[0].sourceFrame || sourceFrame > keys[keys.length - 1].sourceFrame) return undefined;
  let i = 0; while (i + 1 < keys.length && keys[i + 1].sourceFrame <= sourceFrame) i += 1;
  const a = keys[i], b = keys[i + 1];
  if (!b || a.sourceFrame === sourceFrame) return a.rect;
  const t = (sourceFrame - a.sourceFrame) / (b.sourceFrame - a.sourceFrame);
  return { x: a.rect.x + (b.rect.x - a.rect.x) * t, y: a.rect.y + (b.rect.y - a.rect.y) * t,
    width: a.rect.width + (b.rect.width - a.rect.width) * t, height: a.rect.height + (b.rect.height - a.rect.height) * t };
}
const timings = (spec: FreezeFrameFocusSpec) => {
  const d = spec.freeze.durationFrames;
  const push = spec.focus.pushInFrames ?? Math.min(18, Math.floor(d / 4)), release = spec.focus.releaseFrames ?? Math.min(14, Math.floor(d / 5));
  return { push, release, holdEnd: d - release };
};
/** Source frame shown during the freeze. */
export function frozenSourceFrame(spec: FreezeFrameFocusSpec, fps: RationalFps): number | undefined {
  return resolveClipFrame(freezeFocusClip(spec), spec.clip.startFrame + spec.freeze.atFrame, fps).sourceFrame;
}

export function validateFreezeFocus(spec: FreezeFrameFocusSpec, fps: RationalFps, boxes: readonly { width: number; height: number; framing?: ClipFraming }[] = []): FreezeFocusDiagnostic[] {
  const out: FreezeFocusDiagnostic[] = [...validateClip(freezeFocusClip(spec), fps)];
  const error = (code: string, message: string, annotationId?: string) => out.push({ code, severity: "error", message, annotationId });
  const { freeze } = spec, { push, release } = timings(spec);
  if (!Number.isSafeInteger(freeze.atFrame) || freeze.atFrame < 0 || freeze.atFrame + freeze.durationFrames > spec.clip.durationFrames)
    error("freeze-outside-clip", `Freeze ${freeze.atFrame}–${freeze.atFrame + freeze.durationFrames} must fit inside the clip's ${spec.clip.durationFrames} frames.`);
  if (push + release >= freeze.durationFrames) error("freeze-too-short", `Push-in (${push}) and release (${release}) leave no hold inside a ${freeze.durationFrames}-frame freeze.`);
  const annotations = new Map(spec.annotations.map(a => [a.id, a]));
  for (const a of spec.annotations)
    if (a.keys.some((k, i) => !Number.isSafeInteger(k.sourceFrame) || (i > 0 && k.sourceFrame <= a.keys[i - 1].sourceFrame) || !(k.rect.width > 0 && k.rect.height > 0)))
      error("annotation-invalid", `Annotation "${a.id}" needs ascending integer source frames and positive regions.`, a.id);
  const held = out.some(d => d.severity === "error") ? undefined : frozenSourceFrame(spec, fps);
  const focus = annotations.get(spec.focus.annotationId);
  if (!focus) error("focus-unknown", `Focus annotation "${spec.focus.annotationId}" does not exist.`, spec.focus.annotationId);
  else if (held !== undefined && !annotationRect(focus, held))
    error("annotation-untracked", `"${focus.id}" has no region at frozen source frame ${held}; add a key there instead of guessing.`, focus.id);
  for (const c of spec.callouts ?? []) {
    const a = annotations.get(c.annotationId);
    if (!a) error("callout-annotation-unknown", `Callout "${c.id}" refers to unknown annotation "${c.annotationId}".`, c.annotationId);
    else if (held !== undefined && !annotationRect(a, held)) error("annotation-untracked", `Callout "${c.id}": "${a.id}" is untracked at source frame ${held}.`, a.id);
  }
  if (focus && held !== undefined) for (const box of boxes) {
    // Every subject the frame talks about (the focus and each callout) must stay inside the crop while the frame is held.
    // A crop that cuts one of them out is an impossible framing, not something to draw silently.
    const crop = resolveClipDraw(spec.clip.source, box, box.framing ?? {});
    const subjects = new Set([spec.focus.annotationId, ...(spec.callouts ?? []).map(c => c.annotationId)]);
    for (const id of subjects) {
      const a = annotations.get(id), r = a && annotationRect(a, held);
      if (r && (r.x < crop.sx - 0.5 || r.y < crop.sy - 0.5 || r.x + r.width > crop.sx + crop.sw + 0.5 || r.y + r.height > crop.sy + crop.sh + 0.5))
        error("subject-leaves-crop", `"${id}" is cut off by the ${box.width}×${box.height} framing at frozen source frame ${held}. Choose a framing that keeps it in view (for example a different focus point).`, id);
    }
    const pushed = evaluateFreezeFocus(spec, spec.clip.startFrame + freeze.atFrame + push, fps, box, box.framing);
    for (const d of inspectClipFraming(spec.clip, box, pushed.framing)) out.push({ ...d, message: `At full push-in: ${d.message}` });
    const r = pushed.focusRect;
    if (r && (r.x < -0.5 || r.y < -0.5 || r.x + r.width > box.width + 0.5 || r.y + r.height > box.height + 0.5))
      out.push({ code: "focus-region-cropped", severity: "warning", annotationId: focus.id,
        message: `"${focus.id}" does not fit a ${box.width}×${box.height} output at full push-in; part of the detail is cut off. Use a smaller detail, less padding or a different output framing.` });
  }
  return out;
}

/** Framing, spotlight and phase for one output box at one output frame. */
export function evaluateFreezeFocus(spec: FreezeFrameFocusSpec, frame: number, fps: RationalFps, box: { width: number; height: number }, framing: ClipFraming = {}): FreezeFocusFrame {
  const { source } = spec.clip, local = frame - spec.clip.startFrame - spec.freeze.atFrame;
  const { push, release, holdEnd } = timings(spec), easing = spec.focus.easing ?? "ease-in-out-cubic";
  const phase: FreezePhase = local < 0 ? "before" : local < push ? "push-in" : local < holdEnd ? "hold" : local < spec.freeze.durationFrames ? "release" : "after";
  const amount = phase === "push-in" ? evaluateEasing(easing, (local + 1) / push) : phase === "hold" ? 1
    : phase === "release" ? 1 - evaluateEasing(easing, (local - holdEnd + 1) / release) : 0;
  const base = resolveClipDraw(source, box, framing);
  const baseCrop = { x: base.sx, y: base.sy, width: base.sw, height: base.sh };
  const held = amount > 0 ? frozenSourceFrame(spec, fps) : undefined;
  const annotation = spec.annotations.find(a => a.id === spec.focus.annotationId);
  const region = held !== undefined && annotation ? annotationRect(annotation, held) : undefined;
  const crop = region && amount > 0
    ? interpolateCrop(baseCrop, regionCrop(source, box, region, spec.focus.padding ?? 0.35), amount, source) : baseCrop;
  const next: ClipFraming = amount > 0 ? { crop, fit: "cover" } : framing;
  const draw = resolveClipDraw(source, box, next);
  const focusRect = region ? { x: draw.dx + (region.x - draw.sx) * draw.scale, y: draw.dy + (region.y - draw.sy) * draw.scale, width: region.width * draw.scale, height: region.height * draw.scale } : undefined;
  return { phase, amount, framing: next, draw, focusRect, dim: (spec.focus.dim ?? 0.55) * amount };
}

/** Annotations as a 2D InspectableAsset in source pixels, sampled at the source frame each output frame shows. */
export function footageInspectable(spec: FreezeFrameFocusSpec, fps: RationalFps): InspectableAsset {
  const clip = freezeFocusClip(spec);
  const region = (id: string, frame: number) => {
    const source = resolveClipFrame(clip, frame, fps).sourceFrame, annotation = spec.annotations.find(a => a.id === id);
    const rect = source !== undefined && annotation ? annotationRect(annotation, source) : undefined;
    if (!rect) throw new Error(`Annotation "${id}" is untracked at output frame ${frame}.`);
    return rect;
  };
  return createInspectableAsset({
    id: spec.id, dimension: 2, revision: "1",
    parts: spec.annotations.map(a => ({ id: a.id, label: a.label })),
    anchors: spec.annotations.map(a => ({ id: `${a.id}.label`, partId: a.id, kind: "label" as const })),
    capabilities: { sectioning: "none", explodable: false, canGhost: false, flowPorts: false, stateful: false },
  }, {
    bounds(id, frame) { const r = region(id, frame); return { min: [r.x, r.y], max: [r.x + r.width, r.y + r.height] }; },
    anchor(anchorId, frame) { const r = region(anchorId.replace(/\.label$/, ""), frame); return { position: [r.x + r.width / 2, r.y + r.height / 2] }; },
  });
}
/** Callout specs windowed to the hold, anchored on annotation centres. */
export function freezeFocusCallouts(spec: FreezeFrameFocusSpec): CalloutSpec[] {
  const { push, holdEnd } = timings(spec), start = spec.clip.startFrame + spec.freeze.atFrame;
  return (spec.callouts ?? []).map(({ annotationId, delayFrames = 0, ...callout }) => ({ ...callout, anchorId: `${annotationId}.label`,
    window: { startFrame: start + push + delayFrames, endFrame: start + holdEnd } }));
}
