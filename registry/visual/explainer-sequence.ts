/** ES1: authored explainer shots -> existing CC1 camera, MD1 cues and semantic protection.
 * Portable data is the source of truth; no new timing engine or GPU dependency.
 */
import { compileCinematicCamera } from "../motion/cinematic-camera-director";
import { evaluateCameraPose3D } from "../motion/camera-pose-3d";
import { motionTimelineGroup } from "../motion/director-authoring";
import { semanticSampleFrames } from "../motion/semantic-direction";
import type {
  CameraPurpose, SemanticBeat, SemanticElement, SemanticFrameSample,
  SemanticTransferSpec, SemanticDirectionScene,
} from "../motion/semantic-direction";
import { compileMotionDirector, evaluateMotionDirector } from "../motion/motion-director";
import { createSemanticComposition } from "./semantic-composition";
import { validateExplainerComposition } from "./explainer-preflight";
import type { PreflightOptions, PreflightResult } from "./explainer-preflight";
import type { CameraSequenceSpec, CameraShotSpec, CameraTargetRegistry, CinematicCameraPose, CompiledCinematicCamera } from "../motion/cinematic-camera-types";
import type { CompiledMotionDirector, DirectorCue, DirectorFrame, MotionDirection, ResolvedDirectorCue } from "../motion/director-types";
import type { Diagnostic, RationalFps } from "../motion/types";
import type { CompositionAction, CompositionSubject, SemanticComposition } from "./semantic-composition";

export interface ExplainerActionSpec {
  id: string;
  subjectId: string;
  /** Local frame within this shot. Lead and tail must also fit the shot. */
  atFrame: number;
  leadFrames?: number;
  tailFrames?: number;
}
export interface ExplainerShotSpec {
  id: string;
  durationFrames: number;
  /** The existing CC1 shot vocabulary, without independent timing. */
  camera: Omit<CameraShotSpec, "id" | "durationFrames" | "at" | "after">;
  /** Essential screen explanation; distinct from spoken narration. */
  explanation: string;
  role?: "explanation" | "summary";
  maxLines?: number;
  narration?: { text: string; language: string; assetRef?: string };
  actions?: readonly ExplainerActionSpec[];
  /** Required for every shot when semantic preflight is enabled.
   * The shot itself owns timing and its explanation is the learning claim.
   */
  intent?: Pick<SemanticBeat, "visualChange" | "focusId" | "mode">;
}
/** Opt-in authoring geometry; no independent scene duration or viewport.
 * For moving targets, provide measured/projected bounds at sparse frames.
 */
export interface ExplainerSequencePreflightSpec {
  elements: readonly SemanticElement[];
  transfers?: readonly SemanticTransferSpec[];
  camera?: readonly CameraPurpose[];
  samples?: readonly SemanticFrameSample[];
  options?: Omit<PreflightOptions, "samples">;
}
export interface ExplainerSequenceSpec {
  schemaVersion: 1;
  id: string;
  title: string;
  fps: RationalFps;
  output: { width: number; height: number; variant?: string };
  cameraId?: string;
  cameraProfile?: CameraSequenceSpec["profile"];
  /** CC1 targets and their active/protected intervals; geometry lives in the registry. */
  subjects: readonly CompositionSubject[];
  /** Sequential end-exclusive shots. The final shot must be an explicit summary. */
  shots: readonly ExplainerShotSpec[];
  /** Enable automatic screenshot-free XP1 validation on every compile. */
  preflight?: ExplainerSequencePreflightSpec;
}
export interface PlannedExplainerShot {
  id: string;
  startFrame: number;
  endFrame: number;
  role: "explanation" | "summary";
  explanation: string;
  maxLines: number;
  narrationCueId?: string;
}
export interface CompiledExplainerSequence {
  spec: ExplainerSequenceSpec;
  durationFrames: number;
  fps: RationalFps;
  camera: CompiledCinematicCamera;
  director: CompiledMotionDirector;
  composition: SemanticComposition;
  shots: readonly PlannedExplainerShot[];
  /** Populated only when the author opted into the XP1 preflight contract. */
  preflight?: PreflightResult;
  diagnostics: readonly Diagnostic[];
}
export type ExplainerSequenceCompilation =
  | { ok: true; sequence: CompiledExplainerSequence; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };

const nonempty = (value: string) => typeof value === "string" && value.trim().length > 0;
const integer = (value: number, min: number) => Number.isSafeInteger(value) && value >= min;
const invalid = (path: string, message: string): Diagnostic =>
  ({ severity: "error", code: "explainer-sequence-invalid", path, message });

/** Compile one immutable frame domain for camera, choreography and text regions.
 * Fail early rather than silently cutting off an action, narration or summary.
 */
export function compileExplainerSequence(input: ExplainerSequenceSpec, targets: CameraTargetRegistry): ExplainerSequenceCompilation {
  const diagnostics: Diagnostic[] = [];
  // Clone the JSON authoring fragment; no Three objects, callbacks or refs are embedded.
  let spec: ExplainerSequenceSpec;
  try { spec = structuredClone(input); }
  catch (cause) { return { ok: false, diagnostics: [invalid("sequence", "Use portable authoring data: " + String(cause))] }; }
  if (!spec || spec.schemaVersion !== 1 || !nonempty(spec.id) || !nonempty(spec.title) ||
      !spec.fps || !integer(spec.fps.num, 1) || !integer(spec.fps.den, 1) ||
      !spec.output || ![spec.output.width, spec.output.height].every(n => Number.isFinite(n) && n > 0))
    return { ok: false, diagnostics: [invalid("sequence", "Specify schemaVersion 1, ID, title, rational FPS and positive output dimensions.")] };
  if (!Array.isArray(spec.subjects) || !spec.subjects.length || !Array.isArray(spec.shots) || spec.shots.length < 2)
    return { ok: false, diagnostics: [invalid("shots", "Declare named subjects and at least an explanation shot followed by a summary shot.")] };
  const shotIds = new Set<string>(), subjectIds = new Set<string>();
  for (const [index, subject] of spec.subjects.entries()) {
    if (!nonempty(subject.id) || subjectIds.has(subject.id))
      diagnostics.push(invalid("subjects[" + index + "]", "Subject IDs must be unique and nonempty."));
    subjectIds.add(subject.id);
  }
  const planned: PlannedExplainerShot[] = [], events: DirectorCue[] = [];
  const actions: CompositionAction[] = [], cameraShots: CameraShotSpec[] = [];
  let cursor = 0;
  for (const [index, shot] of spec.shots.entries()) {
    const path = "shots[" + index + "]";
    if (!shot || !nonempty(shot.id) || shotIds.has(shot.id) || !integer(shot.durationFrames, 1) ||
        !nonempty(shot.explanation) || !shot.camera || (shot.role !== undefined && !["summary", "explanation"].includes(shot.role)) ||
        (shot.maxLines !== undefined && !integer(shot.maxLines, 1))) {
      diagnostics.push(invalid(path, "Shot needs a unique ID, duration, valid camera, explanation and maxLines."));
      continue;
    }
    shotIds.add(shot.id);
    const role = shot.role ?? "explanation";
    if (role === "summary" && index !== spec.shots.length - 1)
      diagnostics.push(invalid(path + ".role", "A closing summary must be the final shot."));
    if (index === spec.shots.length - 1 && role !== "summary")
      diagnostics.push(invalid(path + ".role", "Finish the production with an explicit summary shot."));
    const startFrame = cursor, endFrame = cursor + shot.durationFrames;
    cursor = endFrame;
    if (cursor > 36_000) diagnostics.push(invalid(path, "A CC1 sequence supports at most 36,000 frames."));
    cameraShots.push({ ...shot.camera, id: shot.id, durationFrames: shot.durationFrames });
    const plan: PlannedExplainerShot = {
      id: shot.id, startFrame, endFrame, role, explanation: shot.explanation,
      maxLines: shot.maxLines ?? 5,
    };
    if (shot.narration) {
      if (!nonempty(shot.narration.text) || !nonempty(shot.narration.language))
        diagnostics.push(invalid(path + ".narration", "Narration needs language and spoken text."));
      else {
        const cueId = shot.id + "/narration";
        plan.narrationCueId = cueId;
        events.push({ kind: "cue", id: cueId, at: startFrame,
          durationFrames: shot.durationFrames,
          payload: { kind: "narration", ...shot.narration } });
      }
    }
    const actionIds = new Set<string>();
    for (const [actionIndex, action] of (shot.actions ?? []).entries()) {
      const actionPath = path + ".actions[" + actionIndex + "]";
      if (!nonempty(action.id) || actionIds.has(action.id) || !subjectIds.has(action.subjectId) ||
          !integer(action.atFrame, 0) || !integer(action.leadFrames ?? 0, 0) ||
          !integer(action.tailFrames ?? 0, 0) || action.atFrame - (action.leadFrames ?? 0) < 0 ||
          action.atFrame + (action.tailFrames ?? 0) >= shot.durationFrames) {
        diagnostics.push(invalid(actionPath, "Action needs a unique ID, registered subject and a visibility window wholly within the shot."));
        continue;
      }
      actionIds.add(action.id);
      const id = shot.id + "/action/" + action.id;
      events.push({ kind: "cue", id, at: startFrame + action.atFrame,
        targetId: spec.subjects.find(s => s.id === action.subjectId)?.targetId ?? action.subjectId,
        payload: { kind: "event", name: id } });
      actions.push({ id, event: id, subjectId: action.subjectId, leadFrames: action.leadFrames, tailFrames: action.tailFrames });
    }
    planned.push(plan);
  }
  if (cursor < 2 || diagnostics.length) return { ok: false, diagnostics };
  let preflightResult: PreflightResult | undefined;
  if (spec.preflight !== undefined) {
    const authored = spec.preflight;
    if (!authored || !Array.isArray(authored.elements) ||
        (authored.transfers !== undefined && !Array.isArray(authored.transfers)) ||
        (authored.camera !== undefined && !Array.isArray(authored.camera)) ||
        (authored.samples !== undefined && !Array.isArray(authored.samples))) {
      diagnostics.push(invalid("preflight", "Semantic preflight requires element geometry and optional transfer, camera and sample arrays."));
      return { ok: false, diagnostics };
    }
    const beats: SemanticBeat[] = [];
    for (const [index, shot] of spec.shots.entries()) {
      const intent = shot.intent;
      if (!intent || !nonempty(intent.visualChange) || !nonempty(intent.focusId) ||
          (intent.mode !== undefined && !["demonstrate", "establish", "compare", "hold"].includes(intent.mode))) {
        diagnostics.push(invalid("shots[" + index + "].intent",
          "Every preflight shot must declare an observable visual change and a registered semantic focus."));
        continue;
      }
      const span = planned[index];
      beats.push({ id: span.id,
        range: { startFrame: span.startFrame, endFrame: span.endFrame },
        claim: span.explanation, visualChange: intent.visualChange,
        focusId: intent.focusId, mode: intent.mode });
    }
    if (diagnostics.length) return { ok: false, diagnostics };
    const semanticScene: SemanticDirectionScene = {
      id: spec.id, width: spec.output.width, height: spec.output.height,
      durationFrames: cursor, elements: authored.elements,
      beats, transfers: authored.transfers, camera: authored.camera,
    };
    // Always inspect structural boundaries even if custom geometry was provided.
    // User-supplied duplicate frames remain visible to XP1's input validator.
    const supplied = authored.samples ?? [];
    const suppliedFrames = new Set(supplied.map(sample => sample?.frame));
    const samples = [...supplied, ...semanticSampleFrames(semanticScene)
      .filter(frame => !suppliedFrames.has(frame)).map(frame => ({ frame }))];
    preflightResult = validateExplainerComposition(semanticScene, {
      ...authored.options, samples,
    });
    diagnostics.push(...preflightResult.diagnostics.map(issue => ({
      code: issue.code, severity: issue.severity, message: issue.message,
      sceneId: issue.sceneId, frame: issue.frame,
      path: issue.elements?.length ? "preflight.elements:" + issue.elements.join(",") : "preflight",
    })));
    if (!preflightResult.ok) return { ok: false, diagnostics };
  }
  const cameraSpec: CameraSequenceSpec = {
    schemaVersion: 1, id: spec.id + "/camera", title: spec.title, fps: spec.fps,
    durationFrames: cursor, cameraId: spec.cameraId, output: spec.output,
    profile: spec.cameraProfile, shots: cameraShots,
  };
  const cameraResult = compileCinematicCamera(cameraSpec, targets);
  diagnostics.push(...cameraResult.diagnostics);
  if (!cameraResult.ok) return { ok: false, diagnostics };
  // Import the actual CC1 camera MG1 channels into MD1, not a dummy track.
  // One MD1 evaluation then contains the same pose used by the viewport,
  // narration and event cues. No extra playhead or pacing multiplication.
  const cameraGroup = motionTimelineGroup(cameraResult.plan.timeline,
    { id: spec.id + "/camera-tracks" });
  const cameraId = spec.cameraId ?? "camera3d";
  const direction: MotionDirection = {
    schemaVersion: 1, id: spec.id + "/direction", title: spec.title, fps: spec.fps,
    durationFrames: cursor, targets: [...new Set([...spec.subjects.map(s => s.targetId ?? s.id), cameraId])],
    children: [cameraGroup, ...events],
  };
  const directorResult = compileMotionDirector(direction);
  diagnostics.push(...directorResult.diagnostics);
  if (!directorResult.ok) return { ok: false, diagnostics };
  const composition = createSemanticComposition({
    id: spec.id, camera: cameraResult.plan, targets, director: directorResult.director,
    subjects: spec.subjects, actions,
  });
  diagnostics.push(...composition.diagnostics.map(issue => ({
    code: issue.code, severity: "error" as const, message: issue.message,
    path: issue.subjectId ?? issue.actionId,
    frame: issue.frame,
  })));
  if (diagnostics.some(d => d.severity === "error")) return { ok: false, diagnostics };
  const sequence: CompiledExplainerSequence = {
    spec, durationFrames: cursor, fps: { ...spec.fps }, camera: cameraResult.plan,
    director: directorResult.director, composition, shots: planned, preflight: preflightResult, diagnostics,
  };
  return { ok: true, sequence, diagnostics };
}

export interface ExplainerFrame {
  frame: number;
  localFrame: number;
  shot: PlannedExplainerShot;
  explanation: string;
  cameraPose: CinematicCameraPose;
  motion: DirectorFrame;
  /** Cues at this exact frame, not effects that the renderer plays automatically. */
  cues: readonly ResolvedDirectorCue[];
}

/** Stateless random seek. A film frame is independent of the previous frame. */
export function evaluateExplainerFrame(sequence: CompiledExplainerSequence, frame: number): ExplainerFrame {
  if (!Number.isSafeInteger(frame) || frame < 0 || frame >= sequence.durationFrames)
    throw new Error("Explainer frame must be an integer inside the compiled sequence.");
  const shot = sequence.shots.find(s => frame >= s.startFrame && frame < s.endFrame);
  if (!shot) throw new Error("No explainer shot owns frame " + frame + ".");
  const motion = evaluateMotionDirector(sequence.director, frame);
  return {
    frame, localFrame: frame - shot.startFrame, shot, explanation: shot.explanation,
    cameraPose: evaluateCameraPose3D(sequence.director.timeline, frame,
      sequence.camera.spec.cameraId ?? "camera3d", motion.evaluation),
    motion,
    cues: sequence.director.cues.filter(cue => cue.frame === frame),
  };
}
