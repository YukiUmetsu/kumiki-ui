/** CutDirector: shots + transitions compiled into a frame-addressable 2D shot plan.
 * Cameras are ordinary MG1 tracks (`createCameraTimeline` / `evaluateCamera`); wipes are
 * `evaluateMask` samples. Every frame resolves purely from (plan, frame, options), so random
 * seeks equal forward play. Semantic identity is checked at every boundary: a continuous
 * transition may not change scene, and a match cut must land its subject where it left.
 */
import { createCameraTimeline, evaluateCamera } from "./camera";
import type { CameraPose } from "./camera";
import { evaluateEasing } from "./easing";
import { evaluateMask } from "./masks";
import type { MaskAxis, MaskSample, MaskSpecLocal } from "./masks";
import type { AffineMatrix, Diagnostic, EasingSpec, MotionTimeline, RationalFps, Rect } from "./types";

export type CutKind = "cut" | "match-cut" | "punch-in" | "whip" | "wipe" | "dissolve" | "hold";
export interface CutScene {
  id: string;
  /** World-space bounds of each semantic subject in this scene. */
  subjects: Readonly<Record<string, Rect>>;
}
export interface CutShotSpec {
  id: string;
  sceneId: string;
  durationFrames: number;
  /** Subjects that must be fully framed at the shot's first and last frame. */
  subjectIds: readonly string[];
  /** Camera at the shot's first frame and (optionally) last frame. */
  camera: { start: CameraPose; end?: CameraPose; easing?: EasingSpec };
}
export interface CutTransitionSpec {
  kind: CutKind;
  /** Frames the transition occupies. Cuts and match cuts take none. */
  durationFrames?: number;
  /** Match cut: the subject that must land at the same screen place and size. */
  matchSubjectId?: string;
  /** Wipe sweep direction. Default left-to-right. */
  axis?: MaskAxis;
  /** Foreground wipe: a subject-sized occluder whose centre leads the wipe edge (renderer draws it). */
  foreground?: { subjectId: string; widthFraction: number };
  /** Whip pan direction. Default left. */
  direction?: "left" | "right" | "up" | "down";
  /** What replaces a moving transition under reduced motion. Default `cut`. */
  reducedMotion?: "cut" | "dissolve";
}
export interface CutPlanSpec {
  id: string;
  fps: RationalFps;
  output: { width: number; height: number };
  scenes: readonly CutScene[];
  shots: readonly CutShotSpec[];
  /** One transition between each pair of consecutive shots. */
  transitions: readonly CutTransitionSpec[];
  /** Untouched frames a shot keeps after transitions take theirs. Default 12. */
  minShotFrames?: number;
  /** Match-cut tolerance as a fraction of the output diagonal. Default 0.03. */
  matchTolerance?: number;
}
export interface CompiledCutShot { id: string; sceneId: string; startFrame: number; endFrame: number; camera: MotionTimeline; subjectIds: readonly string[] }
export interface CompiledCutTransition {
  index: number;
  kind: CutKind;
  spec: CutTransitionSpec;
  fromShotId: string;
  toShotId: string;
  /** First frame of the incoming shot. */
  boundary: number;
  startFrame: number;
  endFrame: number;
}
export interface CompiledCutPlan { spec: CutPlanSpec; durationFrames: number; shots: CompiledCutShot[]; transitions: CompiledCutTransition[] }
export interface CutDiagnostic extends Diagnostic { shotId?: string; targetId?: string }

export interface CutLayer {
  shotId: string;
  sceneId: string;
  /** Frame inside the shot to render the scene's own content at (frozen during holds). */
  localFrame: number;
  pose: CameraPose;
  /** World → output matrix, same convention as CameraStage. */
  matrix: AffineMatrix;
  opacity: number;
  mask?: MaskSample;
  /** Directional motion blur in output px for whips. */
  blur?: { x: number; y: number };
}
export interface CutFrame {
  frame: number;
  /** Topmost (incoming or current) shot. */
  shotId: string;
  transition?: { index: number; kind: CutKind; authoredKind: CutKind; progress: number; fromShotId: string; toShotId: string };
  /** Bottom to top. */
  layers: CutLayer[];
  foreground?: { subjectId: string; rect: Rect };
}
export interface CutEvaluationOptions {
  /** `cuts` replaces every transition with a hard cut at its boundary; timing is unchanged. */
  transitions?: "authored" | "cuts";
  /** Moving transitions use their fallback and cameras hold each shot's final framing. */
  reducedMotion?: boolean;
}

const MOVING: ReadonlySet<CutKind> = new Set(["punch-in", "whip", "wipe"]);
const CONTINUOUS: ReadonlySet<CutKind> = new Set(["punch-in", "hold"]);

/** Frames each kind takes before and after its boundary. */
function span(kind: CutKind, duration: number): [before: number, after: number] {
  switch (kind) {
    case "cut": case "match-cut": return [0, 0];
    case "punch-in": case "hold": return [duration, 0];
    case "whip": return [Math.floor(duration / 2), Math.ceil(duration / 2)];
    case "wipe": case "dissolve": return [0, duration];
  }
}

function project(matrix: AffineMatrix, r: Rect): Rect {
  const xs: number[] = [], ys: number[] = [];
  for (const [x, y] of [[r.x, r.y], [r.x + r.width, r.y], [r.x, r.y + r.height], [r.x + r.width, r.y + r.height]]) {
    xs.push(matrix.a * x + matrix.c * y + matrix.e); ys.push(matrix.b * x + matrix.d * y + matrix.f);
  }
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
/** Output-px bounds of a scene subject under a layer's camera. */
export function projectCutSubject(plan: CompiledCutPlan, layer: Pick<CutLayer, "sceneId" | "matrix">, subjectId: string): Rect | undefined {
  const world = plan.spec.scenes.find(scene => scene.id === layer.sceneId)?.subjects[subjectId];
  return world ? project(layer.matrix, world) : undefined;
}

export function compileCutPlan(spec: CutPlanSpec): { ok: true; plan: CompiledCutPlan; diagnostics: CutDiagnostic[] } | { ok: false; diagnostics: CutDiagnostic[] } {
  const diagnostics: CutDiagnostic[] = [];
  const report = (severity: "error" | "warning", code: string, message: string, extra: Partial<CutDiagnostic> = {}) =>
    diagnostics.push({ code, severity, message, ...extra });
  const { output } = spec;
  if (!(output.width > 0 && output.height > 0) || !Number.isSafeInteger(spec.fps.num) || !Number.isSafeInteger(spec.fps.den) || spec.fps.num <= 0 || spec.fps.den <= 0)
    report("error", "cut-plan-invalid", "The plan needs a positive output size and a rational FPS of positive integers.");
  if (!spec.shots.length) report("error", "cut-plan-invalid", "The plan needs at least one shot.");
  if (spec.transitions.length !== Math.max(0, spec.shots.length - 1))
    report("error", "cut-plan-invalid", `${spec.shots.length} shots need ${Math.max(0, spec.shots.length - 1)} transitions; got ${spec.transitions.length}.`);
  const scenes = new Map(spec.scenes.map(scene => [scene.id, scene]));
  const ids = new Set<string>(), shots: CompiledCutShot[] = [];
  let cursor = 0;
  for (const shot of spec.shots) {
    const at = { shotId: shot.id, frame: cursor };
    if (!shot.id.trim() || ids.has(shot.id) || !Number.isSafeInteger(shot.durationFrames) || shot.durationFrames < 2)
      report("error", "cut-shot-invalid", `Shot "${shot.id}" needs a unique ID and at least 2 integer frames.`, at);
    ids.add(shot.id);
    const scene = scenes.get(shot.sceneId);
    if (!scene) report("error", "cut-scene-unknown", `Shot "${shot.id}" uses unknown scene "${shot.sceneId}".`, at);
    for (const id of shot.subjectIds) if (scene && !scene.subjects[id])
      report("error", "cut-subject-unknown", `Scene "${shot.sceneId}" has no bounds for subject "${id}".`, { ...at, targetId: id });
    const end = shot.camera.end ?? shot.camera.start, last = Math.max(1, shot.durationFrames - 1);
    let camera: MotionTimeline | undefined;
    try {
      camera = createCameraTimeline({ id: `${spec.id}/${shot.id}/camera`, fps: spec.fps, durationFrames: Math.max(2, shot.durationFrames),
        keyframes: [{ frame: 0, ...shot.camera.start }, { frame: last, ...end, easing: shot.camera.easing }] });
    } catch (cause) { report("error", "cut-camera-invalid", `Shot "${shot.id}": ${cause instanceof Error ? cause.message : String(cause)}`, at); }
    if (camera) shots.push({ id: shot.id, sceneId: shot.sceneId, startFrame: cursor, endFrame: cursor + shot.durationFrames, camera, subjectIds: shot.subjectIds });
    cursor += Math.max(0, shot.durationFrames);
  }
  if (diagnostics.some(d => d.severity === "error")) return { ok: false, diagnostics };

  const minShot = spec.minShotFrames ?? 12, transitions: CompiledCutTransition[] = [];
  const used = shots.map(() => ({ head: 0, tail: 0 }));
  for (const [index, t] of spec.transitions.entries()) {
    const from = shots[index], to = shots[index + 1], duration = t.durationFrames ?? 0;
    const at = { shotId: to.id, frame: to.startFrame };
    if ((t.kind === "cut" || t.kind === "match-cut") ? duration !== 0 : !Number.isSafeInteger(duration) || duration < 4)
      report("error", "cut-transition-invalid", `${t.kind} from "${from.id}" needs ${t.kind === "cut" || t.kind === "match-cut" ? "no duration" : "an integer duration of at least 4 frames"}.`, at);
    const [before, after] = span(t.kind, duration);
    used[index].tail = before; used[index + 1].head = after;
    if (CONTINUOUS.has(t.kind) && from.sceneId !== to.sceneId)
      report("error", "cut-identity-scene-change", `A ${t.kind} from "${from.id}" to "${to.id}" changes scene ("${from.sceneId}" → "${to.sceneId}"). Every subject would jump; use a cut, whip, wipe or dissolve.`, at);
    if (t.kind === "match-cut" || t.kind === "punch-in" && t.matchSubjectId) {
      const id = t.matchSubjectId;
      if (!id) report("error", "cut-match-missing", `Match cut into "${to.id}" must name the matched subject.`, at);
      else if (!scenes.get(from.sceneId)?.subjects[id] || !scenes.get(to.sceneId)?.subjects[id])
        report("error", "cut-match-missing", `Matched subject "${id}" must exist in both "${from.sceneId}" and "${to.sceneId}".`, { ...at, targetId: id });
    }
    if (t.foreground && !scenes.get(to.sceneId)?.subjects[t.foreground.subjectId] && !scenes.get(from.sceneId)?.subjects[t.foreground.subjectId])
      report("error", "cut-subject-unknown", `Foreground wipe subject "${t.foreground.subjectId}" is in neither scene.`, at);
    transitions.push({ index, kind: t.kind, spec: t, fromShotId: from.id, toShotId: to.id, boundary: to.startFrame, startFrame: to.startFrame - before, endFrame: to.startFrame + after });
  }
  for (const [i, shot] of shots.entries()) {
    const clean = shot.endFrame - shot.startFrame - used[i].head - used[i].tail;
    if (clean < 0) report("error", "cut-transition-too-long", `Transitions take ${used[i].head + used[i].tail} frames of "${shot.id}", which lasts ${shot.endFrame - shot.startFrame}.`, { shotId: shot.id });
    else if (clean < minShot) report("warning", "cut-shot-too-short", `"${shot.id}" keeps ${clean} untouched frames after transitions; it may not be readable.`, { shotId: shot.id });
  }
  const plan: CompiledCutPlan = { spec, durationFrames: cursor, shots, transitions };
  if (!diagnostics.some(d => d.severity === "error")) {
    // Framing and identity at the actual boundary frames, through the compiled cameras.
    for (const shot of shots) for (const frame of [shot.startFrame, shot.endFrame - 1]) {
      const layer = shotLayer(plan, shot, frame, {});
      for (const id of shot.subjectIds) {
        const r = projectCutSubject(plan, layer, id);
        if (r && (r.x < -0.5 || r.y < -0.5 || r.x + r.width > output.width + 0.5 || r.y + r.height > output.height + 0.5))
          report("error", "cut-subject-unframed", `"${id}" is not fully framed in "${shot.id}" at frame ${frame}.`, { shotId: shot.id, targetId: id, frame });
      }
    }
    const tolerance = (spec.matchTolerance ?? 0.03) * Math.hypot(output.width, output.height);
    for (const t of transitions) if (t.kind === "match-cut" && t.spec.matchSubjectId) {
      const from = shots[t.index], to = shots[t.index + 1], id = t.spec.matchSubjectId;
      const a = projectCutSubject(plan, shotLayer(plan, from, from.endFrame - 1, {}), id), b = projectCutSubject(plan, shotLayer(plan, to, to.startFrame, {}), id);
      if (!a || !b) continue;
      const shift = Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2);
      const scale = Math.max(a.width, a.height) / Math.max(b.width, b.height);
      if (shift > tolerance || scale > 1.25 || scale < 0.8)
        report("error", "cut-match-misaligned", `Match cut on "${id}" into "${to.id}" moves it ${shift.toFixed(1)} px and scales it ×${scale.toFixed(2)}; align the cameras (tolerance ${tolerance.toFixed(1)} px, ×0.8–1.25).`, { shotId: to.id, targetId: id, frame: t.boundary });
    }
  }
  return diagnostics.some(d => d.severity === "error") ? { ok: false, diagnostics } : { ok: true, plan, diagnostics };
}

function shotLayer(plan: CompiledCutPlan, shot: CompiledCutShot, frame: number, options: CutEvaluationOptions, freezeAt?: number): CutLayer {
  const duration = shot.endFrame - shot.startFrame;
  const local = Math.max(0, Math.min(duration - 1, freezeAt ?? frame - shot.startFrame));
  const { pose, matrix } = evaluateCamera(shot.camera, options.reducedMotion ? duration - 1 : local, plan.spec.output);
  return { shotId: shot.id, sceneId: shot.sceneId, localFrame: local, pose, matrix, opacity: 1 };
}
function poseMatrix(pose: CameraPose, output: { width: number; height: number }): AffineMatrix {
  const angle = -(pose.roll ?? 0) * Math.PI / 180, a = pose.zoom * Math.cos(angle), b = pose.zoom * Math.sin(angle), c = -b, d = a;
  return { a, b, c, d, e: output.width / 2 - a * pose.center.x - c * pose.center.y, f: output.height / 2 - b * pose.center.x - d * pose.center.y };
}
function withPose(layer: CutLayer, pose: CameraPose, output: { width: number; height: number }): CutLayer {
  return { ...layer, pose, matrix: poseMatrix(pose, output) };
}

/** Resolve one frame. Pure: no history, caches or clocks. */
export function evaluateCutPlan(plan: CompiledCutPlan, frame: number, options: CutEvaluationOptions = {}): CutFrame {
  if (!Number.isSafeInteger(frame)) throw new Error(`CutDirector needs an integer frame; received ${frame}.`);
  const f = Math.max(0, Math.min(plan.durationFrames - 1, frame)), output = plan.spec.output;
  const index = plan.shots.findIndex(shot => f >= shot.startFrame && f < shot.endFrame), shot = plan.shots[index];
  const t = plan.transitions.find(item => f >= item.startFrame && f < item.endFrame);
  const base = shotLayer(plan, shot, f, options);
  if (!t) return { frame: f, shotId: shot.id, layers: [base] };
  const authoredKind = t.kind;
  const kind: CutKind = options.transitions === "cuts" ? "cut"
    : options.reducedMotion && MOVING.has(t.kind) ? t.spec.reducedMotion ?? "cut" : t.kind;
  const from = plan.shots[t.index], to = plan.shots[t.index + 1];
  const progress = t.endFrame - t.startFrame <= 1 ? 1 : (f - t.startFrame) / (t.endFrame - t.startFrame - 1);
  const state = { index: t.index, kind, authoredKind, progress, fromShotId: from.id, toShotId: to.id };
  // Disabled or reduced transitions keep exact timing: whichever shot owns the frame is shown.
  if (kind === "cut" || kind === "match-cut") return { frame: f, shotId: shot.id, transition: state, layers: [base] };
  switch (kind) {
    case "hold":
      return { frame: f, shotId: from.id, transition: state, layers: [shotLayer(plan, from, f, options, t.startFrame - from.startFrame - 1)] };
    case "punch-in": {
      const a = shotLayer(plan, from, t.startFrame - 1, options).pose, b = shotLayer(plan, to, to.startFrame, options).pose;
      const e = evaluateEasing("ease-in-out-cubic", (f - t.startFrame + 1) / (t.endFrame - t.startFrame + 1));
      const zoom = Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * e);
      const pose = { center: { x: a.center.x + (b.center.x - a.center.x) * e, y: a.center.y + (b.center.y - a.center.y) * e }, zoom, roll: (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * e };
      return { frame: f, shotId: from.id, transition: state, layers: [withPose(base, pose, output)] };
    }
    case "whip": {
      const dir = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[t.spec.direction ?? "left"];
      const outgoing = f < t.boundary;
      const amount = outgoing ? evaluateEasing("ease-in-cubic", (f - t.startFrame + 1) / (t.boundary - t.startFrame + 1))
        : 1 - evaluateEasing("ease-out-cubic", (f - t.boundary + 1) / (t.endFrame - t.boundary));
      const sign = outgoing ? 1 : -1, pose = base.pose;
      const reach = { x: output.width / pose.zoom, y: output.height / pose.zoom };
      const moved = { ...pose, center: { x: pose.center.x + sign * dir[0] * reach.x * amount, y: pose.center.y + sign * dir[1] * reach.y * amount } };
      const blur = 0.05 * Math.max(output.width, output.height) * amount;
      return { frame: f, shotId: shot.id, transition: state, layers: [{ ...withPose(base, moved, output), blur: { x: Math.abs(dir[0]) * blur, y: Math.abs(dir[1]) * blur } }] };
    }
    case "wipe": case "dissolve": {
      const outgoing = shotLayer(plan, from, f, options, from.endFrame - from.startFrame - 1);
      const e = evaluateEasing("ease-in-out-cubic", progress);
      if (kind === "dissolve") return { frame: f, shotId: to.id, transition: state, layers: [outgoing, { ...base, opacity: e }] };
      const spec: MaskSpecLocal = { kind: "clip", rect: { x: 0, y: 0, width: output.width, height: output.height }, axis: t.spec.axis ?? "left-to-right" };
      const mask = evaluateMask(spec, e);
      let foreground: CutFrame["foreground"];
      if (t.spec.foreground) {
        const w = t.spec.foreground.widthFraction * output.width, r = mask.rect, axis = spec.axis;
        const edge = axis === "right-to-left" ? r.x : axis === "left-to-right" ? r.x + r.width : undefined;
        if (edge !== undefined) foreground = { subjectId: t.spec.foreground.subjectId, rect: { x: edge - w / 2, y: 0, width: w, height: output.height } };
      }
      return { frame: f, shotId: to.id, transition: state, layers: [outgoing, { ...base, mask }], foreground };
    }
  }
  return { frame: f, shotId: shot.id, transition: state, layers: [base] };
}
