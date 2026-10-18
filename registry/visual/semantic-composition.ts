/** Reuse CC1 projected subjects and MD1 events for declarative composition.
 * No frame clock, DOM traversal, GPU context or second animation runtime.
 * A frame's 2D rectangles originate from the exact 3D target registry CC1 uses.
 */
import { evaluateCameraPose3D } from "../motion/camera-pose-3d";
import { createCameraProjector, projectCameraBounds } from "../motion/camera-spatial";
import type { CameraTargetRegistry, CompiledCinematicCamera } from "../motion/cinematic-camera-types";
import type { CompiledMotionDirector, ResolvedDirectorCue } from "../motion/director-types";
import type { Rect } from "../motion/types";
import type { ProtectedSubjectRegion } from "./explainer-layout";

export interface CompositionSubject {
  /** Semantic ID seen by captions and consumers. */
  id: string;
  /** CC1 target ID. Defaults to id. */
  targetId?: string;
  /** Critical subjects must remain inside the image during the given interval. */
  critical?: boolean;
  /** Reserve its projected screen region from essential text. */
  protectText?: boolean;
  startFrame?: number;
  endFrame?: number;
  /** Optional actual ray visibility from the target adapter, not pixel recognition. */
  minimumVisible?: number;
  /** Screen-safe inset required for critical subjects and timed actions; default 5%. */
  safeMargin?: number;
}

export interface CompositionAction {
  id: string;
  /** MD1 event cue ID OR an event cue's payload.name. */
  event: string;
  /** Semantic subject that must be visible when the action happens. */
  subjectId: string;
  /** Number of frames surrounding the action that must retain visibility. */
  leadFrames?: number;
  tailFrames?: number;
}

export interface SemanticCompositionOptions {
  id: string;
  camera: CompiledCinematicCamera;
  targets: CameraTargetRegistry;
  director?: CompiledMotionDirector;
  subjects: readonly CompositionSubject[];
  actions?: readonly CompositionAction[];
}

export interface CompositionIssue {
  code: "invalid-composition" | "unknown-subject" | "missing-target" | "missing-event" |
    "ambiguous-event" | "event-outside-film" | "offscreen-subject" | "clipped-subject" |
    "occluded-subject" | "geometry-unavailable";
  message: string;
  subjectId?: string;
  actionId?: string;
  frame?: number;
}

export interface CompositionFrame {
  frame: number;
  /** Projected, clipped-to-output rectangles for actual visible portions only. */
  regions: ProtectedSubjectRegion[];
  issues: CompositionIssue[];
  /** Frame-specific region IDs reserved for text. */
  protect: string[];
}

const issue = (code: CompositionIssue["code"], message: string,
  extra: Partial<CompositionIssue> = {}): CompositionIssue => ({ code, message, ...extra });
const finiteInterval = (from: number, until: number, length: number) =>
  Number.isSafeInteger(from) && Number.isSafeInteger(until) && from >= 0 && until <= length && until > from;
const clip = (r: Rect): Rect | undefined => {
  const x = Math.max(0, r.x), y = Math.max(0, r.y);
  const right = Math.min(1, r.x + r.width), bottom = Math.min(1, r.y + r.height);
  return right > x && bottom > y && [x, y, right, bottom].every(Number.isFinite)
    ? { x, y, width: right - x, height: bottom - y } : undefined;
};

export function createSemanticComposition(options: SemanticCompositionOptions) {
  const { camera, targets, director } = options;
  const totalFrames = camera.timeline.durationFrames;
  if (!options.id.trim() || !totalFrames || targets.revision !== camera.targetRevision)
    throw new Error("Semantic composition needs an ID and a CC1 camera compiled against the current target revision.");
  const sameRate = (a: {num: number; den: number}, b: {num: number; den: number}) =>
    a.num * b.den === b.num * a.den;
  if (camera.spec.durationFrames !== totalFrames || !sameRate(camera.spec.fps, camera.timeline.fps))
    throw new Error("CC1 compiled camera specification and MG1 timeline disagree on duration or FPS.");
  if (director && (director.timeline.durationFrames !== totalFrames ||
      !sameRate(director.timeline.fps, camera.timeline.fps)))
    throw new Error("MD1 and CC1 compiled timelines must share duration and rational FPS. Recompile camera and director after pacing.");
  // Lock authoring inputs in per-composition snapshots; registry geometry remains live.
  const subjects = options.subjects.map(item => Object.freeze({ ...item }));
  const actions = (options.actions ?? []).map(item => Object.freeze({ ...item }));
  const byId = new Map<string, Readonly<CompositionSubject>>();
  const diagnostics: CompositionIssue[] = [];
  if (!subjects.length) diagnostics.push(issue("invalid-composition", "Register at least one named scene subject."));
  for (const subject of subjects) {
    if (!subject.id.trim() || byId.has(subject.id) || !finiteInterval(subject.startFrame ?? 0, subject.endFrame ?? totalFrames, totalFrames) ||
      (subject.minimumVisible !== undefined && (!Number.isFinite(subject.minimumVisible) || subject.minimumVisible < 0 || subject.minimumVisible > 1)) ||
      (subject.safeMargin !== undefined && (!Number.isFinite(subject.safeMargin) || subject.safeMargin < 0 || subject.safeMargin >= .35))) {
      diagnostics.push(issue("invalid-composition", "Invalid/duplicate subject ID, interval, safe margin or visibility threshold: " + subject.id, { subjectId: subject.id }));
      continue;
    }
    byId.set(subject.id, subject);
    if (!targets.ids.includes(subject.targetId ?? subject.id))
      diagnostics.push(issue("missing-target", "Register CC1 camera target for " + subject.id, { subjectId: subject.id }));
  }
  const actionFrames = new Map<string, number>();
  const seenActions = new Set<string>();
  for (const action of actions) {
    if (!action.id.trim() || seenActions.has(action.id) ||
        ![action.leadFrames ?? 0, action.tailFrames ?? 0].every(value => Number.isSafeInteger(value) && value >= 0)) {
      diagnostics.push(issue("invalid-composition", "Action needs unique ID and nonnegative lead/tail: " + action.id, { actionId: action.id }));
      continue;
    }
    seenActions.add(action.id);
    if (!byId.has(action.subjectId)) {
      diagnostics.push(issue("unknown-subject", "Unknown action subject: " + action.subjectId, { actionId: action.id }));
      continue;
    }
    const cues: ResolvedDirectorCue[] = director?.cues.filter(cue =>
      cue.payload.kind === "event" && (cue.id === action.event || cue.payload.name === action.event)) ?? [];
    if (!cues.length) {
      diagnostics.push(issue("missing-event", "No compiled MD1 event cue for action: " + action.event, { actionId: action.id }));
      continue;
    }
    if (cues.length > 1) {
      diagnostics.push(issue("ambiguous-event", "Multiple MD1 event cues match: " + action.event, { actionId: action.id }));
      continue;
    }
    const cue = cues[0];
    if (cue.targetId && cue.targetId !== (byId.get(action.subjectId)?.targetId ?? action.subjectId)) {
      diagnostics.push(issue("invalid-composition", "MD1 event " + action.event + " targets a different subject.", { actionId: action.id }));
      continue;
    }
    const start = cue.frame - (action.leadFrames ?? 0), end = cue.frame + (action.tailFrames ?? 0) + 1;
    if (!finiteInterval(start, end, totalFrames)) {
      diagnostics.push(issue("event-outside-film", "Action visibility interval is outside the film: " + action.id, { actionId: action.id }));
      continue;
    }
    const subject = byId.get(action.subjectId)!;
    if (start < (subject.startFrame ?? 0) || end > (subject.endFrame ?? totalFrames)) {
      diagnostics.push(issue("invalid-composition",
        "Action " + action.id + " visibility window falls outside subject " + subject.id + " active interval.",
        { actionId: action.id, subjectId: subject.id, frame: cue.frame }));
      continue;
    }
    actionFrames.set(action.id, cue.frame);
  }
  // Projection scratch space belongs to this composition, never a shared global.
  const projector = createCameraProjector();
  const aspect = camera.spec.output.width / camera.spec.output.height;
  const active = (subject: CompositionSubject, frame: number) =>
    frame >= (subject.startFrame ?? 0) && frame < (subject.endFrame ?? totalFrames);

  function sample(frame: number): CompositionFrame {
    if (!Number.isSafeInteger(frame) || frame < 0 || frame >= totalFrames)
      throw new Error("Semantic composition requires an integer frame within CC1 duration.");
    const regions: ProtectedSubjectRegion[] = [], issues: CompositionIssue[] = [];
    const protect: string[] = [];
    try {
      targets.prepareFrame?.(frame);
      const pose = evaluateCameraPose3D(camera.timeline, frame, camera.spec.cameraId ?? "camera3d");
      for (const subject of byId.values()) {
        if (!active(subject, frame)) continue;
        const targetId = subject.targetId ?? subject.id;
        if (!targets.ids.includes(targetId)) continue;
        try {
          const target = targets.sample(targetId, frame);
          const projected = projectCameraBounds(pose, target.bounds, aspect, projector);
          const rectangle = clip(projected.rect);
          const intersectsDepth = projected.depth[1] > pose.near && projected.depth[0] < pose.far;
          if (rectangle && intersectsDepth) {
            regions.push({ id: subject.id, region: rectangle });
            if (subject.protectText) protect.push(subject.id);
          }
          const actionCritical = actions.some(action => {
            const at = actionFrames.get(action.id);
            return action.subjectId === subject.id && at !== undefined &&
              frame >= at - (action.leadFrames ?? 0) && frame <= at + (action.tailFrames ?? 0);
          });
          const safe = subject.safeMargin ?? .05;
          if ((subject.critical || actionCritical) && (projected.clipped || !rectangle || !intersectsDepth ||
            projected.rect.x < safe - .002 || projected.rect.y < safe - .002 ||
            projected.rect.x + projected.rect.width > 1 - safe + .002 ||
            projected.rect.y + projected.rect.height > 1 - safe + .002))
            issues.push(issue(projected.clipped ? "clipped-subject" : "offscreen-subject",
              "Critical subject leaves the camera output: " + subject.id, { subjectId: subject.id, frame }));
          if (subject.minimumVisible !== undefined && !targets.visibility)
            issues.push(issue("geometry-unavailable", "Subject requires a ray-visibility adapter: " + subject.id,
              { subjectId: subject.id, frame }));
          if (subject.minimumVisible !== undefined && targets.visibility) {
            const fraction = targets.visibility(pose, target, frame);
            if (!Number.isFinite(fraction) || fraction < subject.minimumVisible)
              issues.push(issue("occluded-subject", "Insufficient geometric visibility: " + subject.id,
                { subjectId: subject.id, frame }));
          }
        } catch (cause) {
          issues.push(issue("geometry-unavailable", "Cannot project " + subject.id + ": " + String(cause),
            { subjectId: subject.id, frame }));
        }
      }
    } catch (cause) {
      issues.push(issue("geometry-unavailable", "Camera pose could not be sampled: " + String(cause), { frame }));
    }
    return { frame, regions, protect, issues };
  }

  /** Author-time guard. Full-frame inspection is opt-in and uses no image recognition. */
  function inspect(options: { strideFrames?: number; maxIssues?: number } = {}) {
    const stride = options.strideFrames ?? 1, limit = options.maxIssues ?? 100;
    if (!Number.isSafeInteger(stride) || stride < 1 || !Number.isSafeInteger(limit) || limit < 1)
      throw new Error("Composition inspector needs positive integer strideFrames and maxIssues.");
    const found = [...diagnostics], examined = new Set<number>();
    const cached = new Map<number, CompositionFrame>();
    const check = (frame: number): CompositionFrame => {
      let result = cached.get(frame);
      if (!result) {
        result = sample(frame);
        cached.set(frame, result);
        examined.add(frame);
        for (const problem of result.issues) if (found.length < limit) found.push(problem);
      }
      return result;
    };
    for (const subject of byId.values()) if (subject.critical || subject.minimumVisible !== undefined) {
      const start = subject.startFrame ?? 0, end = subject.endFrame ?? totalFrames;
      for (let f = start; f < end && found.length < limit; f += stride) check(f);
      check(end - 1);
    }
    for (const action of actions) {
      const frame = actionFrames.get(action.id);
      if (frame === undefined) continue;
      const start = frame - (action.leadFrames ?? 0), end = frame + (action.tailFrames ?? 0);
      for (let f = start; f <= end && found.length < limit; f++) {
        const result = check(f);
        const subject = result.regions.find(region => region.id === action.subjectId);
        if (!subject || result.issues.some(problem => problem.subjectId === action.subjectId))
          found.push(issue("offscreen-subject", "Action " + action.id + " must keep " + action.subjectId + " visible.",
            { actionId: action.id, subjectId: action.subjectId, frame: f }));
      }
    }
    return { ok: found.length === 0, issues: found.slice(0, limit), sampledFrames: examined.size };
  }
  return { id: options.id, camera, director,
    subjects: Object.freeze([...byId.values()]),
    actionFrames: new Map(actionFrames),
    diagnostics: Object.freeze([...diagnostics]), sample, inspect };
}

export type SemanticComposition = ReturnType<typeof createSemanticComposition>;
