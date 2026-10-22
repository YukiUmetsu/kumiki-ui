/**
 * Reusable visual treatments for short-form explainers.
 * Frame-addressable pure plans and evaluators. Existing CameraStage, CutDirector,
 * VT1, EvidenceStage and render adapters own the actual pixels.
 */
import type { FrameRate, RecipeDiagnostic, RecipePlan, Beat } from "./attention-editing-recipes";

export interface NormalizedRect { x: number; y: number; width: number; height: number }
export interface Point { x: number; y: number }
export interface CameraPose2D { scale: number; x: number; y: number }
type Base = { id: string; fps: FrameRate; durationFrames: number };
const error = (code: string, message: string): RecipeDiagnostic => ({ code, message, severity: "error" });
const warning = (code: string, message: string): RecipeDiagnostic => ({ code, message, severity: "warning" });
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (t: number) => { const u = clamp(t); return u * u * (3 - 2 * u); };
const finiteRect = (r: NormalizedRect) => [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width > 0 && r.height > 0;
function plan(spec: Base, kind: string, subjects: string[], moments: Array<[string, number, Beat["purpose"]]>, diagnostics: RecipeDiagnostic[], metadata: RecipePlan["metadata"] = {}): RecipePlan {
  if (!spec.id.trim()) diagnostics.push(error("treatment-id", "A stable ID is required."));
  if (!Number.isSafeInteger(spec.durationFrames) || spec.durationFrames < moments.length)
    diagnostics.push(error("treatment-duration", "Duration must contain at least one frame per beat."));
  if (![spec.fps.num, spec.fps.den].every(x => Number.isSafeInteger(x) && x > 0))
    diagnostics.push(error("treatment-fps", "A positive rational frame rate is required."));
  const duration = Math.max(0, spec.durationFrames);
  const beats: Beat[] = moments.map(([id, endRatio, purpose], index) => {
    const startFrame = index === 0 ? 0 : Math.max(index, Math.min(duration, Math.round(moments[index - 1][1] * duration)));
    const endFrame = index === moments.length - 1 ? duration : Math.max(startFrame + 1, Math.min(duration, Math.round(endRatio * duration)));
    return { id: spec.id + "/" + id, startFrame, endFrame, purpose, subjectIds: [...subjects] };
  });
  return { id: spec.id, fps: spec.fps, durationFrames: spec.durationFrames, beats, metadata: { kind, ...metadata }, diagnostics };
}

export interface DepthLayer { id: string; assetRef: string; depth: number; maskRef?: string; fillRef?: string }
export interface CameraDiveSpec extends Base {
  subjectId: string;
  stage: { width: number; height: number };
  contextBounds: NormalizedRect;
  targetBounds: NormalizedRect;
  mode?: "2d-pan-zoom" | "layered-2.5d" | "3d";
  arrivalHoldFrames?: number;
  padding?: number;
  layers?: DepthLayer[];
  maxZoom?: number;
}
export interface CompiledCameraDive { plan: RecipePlan; spec: CameraDiveSpec; from: CameraPose2D; to: CameraPose2D; travelFrames: number }
function poseFor(rect: NormalizedRect, width: number, height: number, padding: number): CameraPose2D {
  const scale = Math.min(width / rect.width, height / rect.height) * padding;
  return { scale, x: width / 2 - (rect.x + rect.width / 2) * scale, y: height / 2 - (rect.y + rect.height / 2) * scale };
}
export function compileCameraDive(spec: CameraDiveSpec): CompiledCameraDive {
  const diagnostics: RecipeDiagnostic[] = [];
  const { width, height } = spec.stage;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) diagnostics.push(error("camera-stage-invalid", "Stage dimensions must be positive."));
  if (!finiteRect(spec.contextBounds) || !finiteRect(spec.targetBounds)) diagnostics.push(error("camera-bounds-invalid", "Context and focus bounds must have positive finite dimensions."));
  if (!spec.subjectId) diagnostics.push(error("camera-subject-missing", "The camera needs a semantic target."));
  const padding = spec.padding ?? .82;
  if (!(padding > 0 && padding <= 1)) diagnostics.push(error("camera-padding-invalid", "Padding must be in (0,1]."));
  const mode = spec.mode ?? "2d-pan-zoom";
  if (mode === "layered-2.5d" && (!spec.layers?.length || spec.layers.some(l => !l.assetRef || !Number.isFinite(l.depth) || l.depth < 0 || l.depth > 1 || (l.depth > 0 && (!l.maskRef || !l.fillRef)))))
    diagnostics.push(error("camera-depth-unavailable", "Parallax requires licensed source assets and masks/fills for foreground layers."));
  if (mode === "3d") diagnostics.push(warning("camera-3d-adapter-required", "Supply a real 3D camera rig and occlusion checks to render this plan; 2D transforms are not a 3D substitute."));
  const safeW = width > 0 ? width : 1, safeH = height > 0 ? height : 1;
  const from = poseFor(finiteRect(spec.contextBounds) ? spec.contextBounds : { x: 0, y: 0, width: 1, height: 1 }, safeW, safeH, padding > 0 && padding <= 1 ? padding : .82);
  const to = poseFor(finiteRect(spec.targetBounds) ? spec.targetBounds : { x: 0, y: 0, width: 1, height: 1 }, safeW, safeH, padding > 0 && padding <= 1 ? padding : .82);
  if (to.scale / from.scale > (spec.maxZoom ?? 8)) diagnostics.push(error("camera-excessive-zoom", "Camera dive exceeds the specified maximum magnification."));
  const hold = spec.arrivalHoldFrames ?? Math.max(1, Math.round(spec.durationFrames * .25));
  if (!Number.isSafeInteger(hold) || hold < 1 || hold >= spec.durationFrames) diagnostics.push(error("camera-hold-invalid", "Arrival hold must fit inside the duration."));
  const travelFrames = Math.max(1, spec.durationFrames - Math.max(1, hold));
  const compiled = plan(spec, "camera-dive", [spec.subjectId], [["establish", .18, "explain"], ["travel", travelFrames / Math.max(1, spec.durationFrames), "reveal"], ["arrival", 1, "hold"]], diagnostics, { mode, subjectId: spec.subjectId });
  return { plan: compiled, spec: { ...spec, layers: spec.layers?.map(l => ({ ...l })) }, from, to, travelFrames };
}
export function evaluateCameraDive(compiled: CompiledCameraDive, frame: number, reducedMotion = false) {
  const t = reducedMotion ? (frame >= compiled.travelFrames ? 1 : 0) : smooth(frame / compiled.travelFrames);
  // Geometric interpolation avoids a hard acceleration in screen-space magnification.
  const scale = compiled.from.scale * Math.pow(compiled.to.scale / compiled.from.scale, t);
  const centerFrom = { x: (compiled.spec.stage.width / 2 - compiled.from.x) / compiled.from.scale, y: (compiled.spec.stage.height / 2 - compiled.from.y) / compiled.from.scale };
  const centerTo = { x: (compiled.spec.stage.width / 2 - compiled.to.x) / compiled.to.scale, y: (compiled.spec.stage.height / 2 - compiled.to.y) / compiled.to.scale };
  const center = { x: centerFrom.x + (centerTo.x - centerFrom.x) * t, y: centerFrom.y + (centerTo.y - centerFrom.y) * t };
  const pose = { scale, x: compiled.spec.stage.width / 2 - center.x * scale, y: compiled.spec.stage.height / 2 - center.y * scale };
  const layers = (compiled.spec.layers ?? []).map(layer => ({ id: layer.id, assetRef: layer.assetRef, maskRef: layer.maskRef, fillRef: layer.fillRef,
    parallax: { x: (centerTo.x - centerFrom.x) * layer.depth * t, y: (centerTo.y - centerFrom.y) * layer.depth * t } }));
  return { pose, progress: t, layers, holding: frame >= compiled.travelFrames };
}

export type MatchMode = "match-cut" | "morph" | "foreground-wipe" | "crossfade";
export interface MatchTransformationSpec extends Base {
  from: { sceneId: string; subjectId: string; rect: NormalizedRect };
  to: { sceneId: string; subjectId: string; rect: NormalizedRect };
  semanticId: string;
  mode: MatchMode;
  maxCenterDelta?: number;
  maxScaleRatio?: number;
  hasTopologyMapping?: boolean;
}
export function compileMatchTransformation(spec: MatchTransformationSpec) {
  const diagnostics: RecipeDiagnostic[] = [];
  if (!spec.semanticId || !spec.from.subjectId || !spec.to.subjectId || !spec.from.sceneId || !spec.to.sceneId)
    diagnostics.push(error("match-identity-missing", "Both subjects, scenes and their shared semantic ID are required."));
  if (!finiteRect(spec.from.rect) || !finiteRect(spec.to.rect))
    diagnostics.push(error("match-bounds-invalid", "Match anchor rectangles must be finite and nonempty."));
  const c1 = { x: spec.from.rect.x + spec.from.rect.width / 2, y: spec.from.rect.y + spec.from.rect.height / 2 };
  const c2 = { x: spec.to.rect.x + spec.to.rect.width / 2, y: spec.to.rect.y + spec.to.rect.height / 2 };
  const distance = Math.hypot(c1.x - c2.x, c1.y - c2.y);
  const scaleRatio = Math.max(spec.from.rect.width / spec.to.rect.width, spec.to.rect.width / spec.from.rect.width,
    spec.from.rect.height / spec.to.rect.height, spec.to.rect.height / spec.from.rect.height);
  if (spec.mode === "match-cut" && (distance > (spec.maxCenterDelta ?? .03) || scaleRatio > (spec.maxScaleRatio ?? 1.25)))
    diagnostics.push(error("match-misaligned", "Match-cut anchors jump in position or scale; reframe or choose an explicit crossfade."));
  if (spec.mode === "morph" && !spec.hasTopologyMapping)
    diagnostics.push(error("match-topology-unknown", "A geometry morph needs an explicit VT1 correspondence; use crossfade otherwise."));
  const p = plan(spec, "match-transformation", [spec.from.subjectId, spec.to.subjectId], [["establish", .3, "explain"], ["handoff", .75, "reveal"], ["arrival", 1, "hold"]], diagnostics, { mode: spec.mode, semanticId: spec.semanticId, fromSceneId: spec.from.sceneId, toSceneId: spec.to.sceneId });
  return { plan: p, correspondence: { from: spec.from.subjectId, to: spec.to.subjectId, semanticId: spec.semanticId }, anchorOffset: { x: c1.x - c2.x, y: c1.y - c2.y }, distance, scaleRatio, renderer: spec.mode === "morph" ? "visual-transformation" : "cut-director" as "visual-transformation" | "cut-director" };
}

export interface SearchEvidenceSpec extends Base {
  query: string;
  result: { id: string; title: string; summary: string; sourceRef?: string; capturedAssetRef?: string; capturedAt?: string; illustrative?: boolean };
  claimId: string;
  typingFrames?: number;
  locale?: string;
}
export function segmentGraphemes(input: string, locale = "en"): string[] {
  const ctor = (Intl as unknown as { Segmenter?: new (locale: string, options: { granularity: "grapheme" }) => { segment(text: string): Iterable<{ segment: string }> } }).Segmenter;
  if (ctor) return Array.from(new ctor(locale, { granularity: "grapheme" }).segment(input), part => part.segment);
  // Fallback combines Unicode marks/variation selectors and ZWJ sequences; Intl.Segmenter remains preferred.
  const result: string[] = [];
  for (const cp of Array.from(input)) {
    if (result.length && (/\p{Mark}/u.test(cp) || /[\uFE0E\uFE0F\u200D]/u.test(cp) || result[result.length - 1].endsWith("\u200D")))
      result[result.length - 1] += cp;
    else result.push(cp);
  }
  return result;
}
export function compileSearchEvidence(spec: SearchEvidenceSpec) {
  const diagnostics: RecipeDiagnostic[] = [];
  if (!spec.query.trim()) diagnostics.push(error("search-query-empty", "A non-empty authored query is required."));
  if (!spec.claimId || !spec.result.id || !spec.result.title.trim() || !spec.result.summary.trim())
    diagnostics.push(error("search-result-incomplete", "A claim ID and a complete authored result are required."));
  if (!spec.result.illustrative && !spec.result.sourceRef)
    diagnostics.push(error("search-evidence-unsourced", "Factual results require an original source reference."));
  if (spec.result.capturedAssetRef && !spec.result.capturedAt)
    diagnostics.push(error("search-capture-date-missing", "Captured external screenshots require a capture date."));
  const typingFrames = spec.typingFrames ?? Math.max(1, Math.floor(spec.durationFrames * .4));
  if (!Number.isSafeInteger(typingFrames) || typingFrames < 1 || typingFrames >= spec.durationFrames - 1)
    diagnostics.push(error("search-typing-duration", "Typing must leave frames for the answer and evidence."));
  const tokens = segmentGraphemes(spec.query, spec.locale);
  const p = plan(spec, "search-evidence", [spec.result.id], [["type-query", typingFrames / Math.max(1, spec.durationFrames), "question"], ["reveal-result", .7, "reveal"], ["source-proof", 1, "payoff"]], diagnostics, { claimId: spec.claimId, sourceRef: spec.result.sourceRef ?? "illustrative", resultId: spec.result.id });
  return { plan: p, spec: { ...spec, result: { ...spec.result } }, tokens, typingFrames };
}
export function evaluateSearchEvidence(compiled: ReturnType<typeof compileSearchEvidence>, frame: number, reducedMotion = false) {
  const { spec, tokens, typingFrames } = compiled;
  const count = reducedMotion ? tokens.length : Math.min(tokens.length, Math.floor(clamp(frame / typingFrames) * tokens.length));
  return { visibleQuery: tokens.slice(0, count).join(""), showResult: frame >= typingFrames,
    showEvidence: frame >= Math.round(spec.durationFrames * .7), result: spec.result,
    cursorVisible: !reducedMotion && frame < typingFrames && frame % 18 < 9 };
}

export type AccentKind = "hard-cut-hit" | "punch-scale" | "outline-pulse" | "brief-luma-flash" | "directional-shake" | "chromatic-offset" | "foreground-reveal" | "focus-rack";
export interface ImpactAccentSpec extends Base {
  subjectId: string; eventId: string; purpose: "reveal" | "compare" | "warning" | "evidence";
  kind: AccentKind; amplitude?: number; frequency?: number; intensity?: "restrained" | "standard" | "energetic";
  flashCount?: number; soundCueId?: string;
}
export function compileImpactAccent(spec: ImpactAccentSpec) {
  const diagnostics: RecipeDiagnostic[] = [];
  if (!spec.subjectId || !spec.eventId || !spec.purpose) diagnostics.push(error("accent-semantic-anchor", "An accent needs a subject, event, and purpose."));
  if (spec.amplitude !== undefined && (!Number.isFinite(spec.amplitude) || spec.amplitude < 0 || spec.amplitude > 1))
    diagnostics.push(error("accent-amplitude-invalid", "Amplitude is normalized to [0,1]."));
  if (spec.kind === "brief-luma-flash" && (spec.flashCount ?? 1) > 1)
    diagnostics.push(error("accent-flash-risk", "Only one restrained flash is permitted; no strobe loops."));
  if (spec.kind === "chromatic-offset") diagnostics.push(warning("accent-text-protection", "Apply channel separation only to decorative imagery, not legible source text."));
  const p = plan(spec, "impact-accent", [spec.subjectId], [["attack", .2, "interrupt"], ["peak", .45, "reveal"], ["settle", 1, "hold"]], diagnostics, { kind: spec.kind, eventId: spec.eventId, soundCueId: spec.soundCueId ?? "", purpose: spec.purpose });
  return { plan: p, spec: { ...spec } };
}
export function evaluateImpactAccent(compiled: ReturnType<typeof compileImpactAccent>, frame: number, reducedMotion = false) {
  const { spec } = compiled;
  const duration = Math.max(1, spec.durationFrames - 1);
  const u = clamp(frame / duration), intensity = spec.intensity === "restrained" ? .4 : spec.intensity === "energetic" ? 1 : .7;
  const envelope = reducedMotion ? 0 : Math.sin(Math.PI * u) ** 2;
  const amplitude = (spec.amplitude ?? .3) * intensity * envelope;
  const shake = spec.kind === "directional-shake" ? Math.sin(u * Math.PI * (spec.frequency ?? 5) * 2) * amplitude * 12 : 0;
  return { scale: spec.kind === "punch-scale" ? 1 + amplitude * .25 : 1,
    offset: { x: shake, y: shake * .3 }, strength: amplitude,
    outline: reducedMotion || spec.kind === "outline-pulse" ? (reducedMotion ? 1 : amplitude) : 0,
    flash: !reducedMotion && spec.kind === "brief-luma-flash" ? Math.min(.1, amplitude * .1) : 0,
    chromaticOffset: !reducedMotion && spec.kind === "chromatic-offset" ? amplitude * 2 : 0,
    foregroundReveal: spec.kind === "foreground-reveal" ? smooth(u) : 0 };
}
