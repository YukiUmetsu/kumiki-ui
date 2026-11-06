/** FD1: one JSON file that describes a whole film. It holds ordered scenes, the cuts between them, captions, audio
 * lanes and output sizes, and it compiles through the existing compilers: `compileSceneTemplate`,
 * `compileObjectStory`, `compileCutPlan`, `validateCaptionTrack` and `resolveAudioCues`.
 * It adds no clock, renderer or layout engine. A frame resolves from (compiled film, frame) only.
 * Types here are the source of `film-document.schema.json`. After a change, run `npm run film:schema`.
 */
import { compileCutPlan, evaluateCutPlan } from "../motion/cut-director";
import type { CompiledCutPlan, CutEvaluationOptions, CutFrame, CutTransitionSpec } from "../motion/cut-director";
import type { RationalFps } from "../motion/types";
import type { MeasureText } from "../media/text-layout";
import { validateCaptionTrack } from "../visual/caption-track";
import type { CaptionCue, CaptionTrack } from "../visual/caption-track";
import { resolveAudioCues } from "./audio-visual-cue";
import type { AudioCueSheet, AudioLane, SoundEvent, VisualAudioLink } from "./audio-visual-cue";
import { checkJsonSchema } from "./film-schema-check";
import type { JsonSchema } from "./film-schema-check";
import schema from "./film-document.schema.json";
import { compileObjectStory } from "./object-story";
import type { ObjectStoryOptions, ObjectStoryPlan, ObjectStorySpec } from "./object-story";
import { inspectVideoPreset, videoPlatformPreset } from "./platform-presets";
import type { VideoPlatformPresetId } from "./platform-presets";
import { compileSceneTemplate, inspectSceneTemplate } from "./scene-templates";
import type { SceneBase, SceneRecipeId, SceneRecipePayloads, SceneTemplateSpec } from "./scene-templates";
import type { VideoExportManifest } from "./video-export-stage";

export type FilmOutput =
  | { id: string; preset: VideoPlatformPresetId }
  | { id: string; width: number; height: number };
/** Transitions that need no subject data. Duration comes out of the incoming scene, so a film lasts the sum of its scenes. */
export interface FilmTransition {
  kind: "cut" | "dissolve" | "wipe" | "whip";
  durationFrames?: number;
  axis?: CutTransitionSpec["axis"];
  direction?: CutTransitionSpec["direction"];
  reducedMotion?: CutTransitionSpec["reducedMotion"];
}
interface FilmSceneBase extends Pick<SceneBase, "cueFrames" | "background" | "accent" | "safeInsets"> {
  /** Stable name. Review reports and audio links use it. */
  id: string;
  durationFrames: number;
  /** How this scene arrives. The first scene has none. Default: a hard cut. */
  transition?: FilmTransition;
}
export type FilmRecipeScene = { [R in SceneRecipeId]: FilmSceneBase & { recipeId: R; content: SceneRecipePayloads[R] } }[SceneRecipeId];
export type FilmObjectStoryContent = Pick<ObjectStorySpec, "objects" | "beats" | "carried" | "language" | "maxStillSeconds">;
export interface FilmObjectStoryScene extends FilmSceneBase { recipeId: "object-story"; content: FilmObjectStoryContent }
export type FilmScene = FilmRecipeScene | FilmObjectStoryScene;
export interface FilmCaptions { timing: CaptionTrack["timing"]; cues: readonly CaptionCue[]; speakers?: CaptionTrack["speakers"] }
export interface FilmAudio {
  /** Each `assetRef` is relative to the film file. */
  lanes: readonly AudioLane[];
  sounds?: readonly SoundEvent[];
  /** Tie a sound or word to `<scene id>/focus`, `/reveal`, `/resolve`, or `<scene id>/<beat id>`. */
  links?: readonly VisualAudioLink[];
  /** Rights reference that covers the whole mix. */
  licenseRef: string;
}
export interface FilmDocument {
  schemaVersion: 1;
  id: string;
  fps: RationalFps;
  /** Scene recipes are drawn for dark. @default "dark" */
  appearance?: "light" | "dark";
  /** The first output is the default. Each one is authored at its own size, never cropped from another. */
  outputs: readonly FilmOutput[];
  scenes: readonly FilmScene[];
  /** Film-wide captions in film frames. An object-story scene already draws its own, so leave it uncovered. */
  captions?: FilmCaptions;
  audio?: FilmAudio;
}

export interface FilmDiagnostic {
  severity: "error" | "warning";
  code: string;
  /** JSON Pointer into the film document. */
  path: string;
  message: string;
  hint?: string;
}
export interface FilmCue { id: string; frame: number }
export type CompiledFilmScene = { id: string; startFrame: number; endFrame: number; cues: readonly FilmCue[] } & (
  | { kind: "recipe"; recipeId: SceneRecipeId; spec: SceneTemplateSpec }
  | { kind: "object-story"; recipeId: "object-story"; plan: ObjectStoryPlan });
export interface FilmReviewFrame {
  frame: number;
  sceneId: string;
  label: string;
  /** Two scenes share this frame, so text audits do not apply. */
  transition: boolean;
}
export interface CompiledFilm {
  id: string;
  fps: RationalFps;
  outputId: string;
  appearance: "light" | "dark";
  width: number;
  height: number;
  durationFrames: number;
  scenes: readonly CompiledFilmScene[];
  cut: CompiledCutPlan;
  captions?: CaptionTrack;
  audio?: AudioCueSheet;
  manifest: VideoExportManifest;
  reviewFrames: readonly FilmReviewFrame[];
  /** Normalized platform safe area of this output, if it has a preset. */
  safeInset?: { left: number; right: number; top: number; bottom: number };
}
export type FilmCompilation =
  | { ok: true; film: CompiledFilm; diagnostics: readonly FilmDiagnostic[] }
  | { ok: false; diagnostics: readonly FilmDiagnostic[] };
export interface FilmCompileOptions {
  /** Output ID. Default: the first output. */
  outputId?: string;
  /** Real loaded-font measurement. Without it, a caption that does not fit is found only by the browser compile. */
  objectStory?: Pick<ObjectStoryOptions, "measure" | "captionFont">;
}

const SCHEMA = schema as unknown as JsonSchema;
/** Lets a compile run without a browser: every caption fits, so only a compile with real fonts can report one that does not. */
const unmeasured: MeasureText = () => 1;
const recipeHint = (recipeId: string) => `Compare with a valid scene: npm run film:example -- --recipe=${recipeId}`;

function outputSize(output: FilmOutput): { width: number; height: number; preset?: VideoPlatformPresetId } {
  if ("preset" in output) { const { width, height } = videoPlatformPreset(output.preset); return { width, height, preset: output.preset }; }
  return { width: output.width, height: output.height };
}

/** Expand one film scene to the full spec that its recipe compiler takes. */
function recipeSpec(scene: FilmRecipeScene, film: FilmDocument, size: { width: number; height: number }): SceneTemplateSpec {
  const { recipeId, content, durationFrames, cueFrames, background, accent, safeInsets } = scene;
  return { recipeId, content, durationFrames, cueFrames, background, accent, safeInsets, schemaVersion: 1, recipeVersion: 1, id: film.id + "-" + scene.id, fps: film.fps, ...size } as SceneTemplateSpec;
}
function storySpec(scene: FilmObjectStoryScene, film: FilmDocument, size: { width: number; height: number }): ObjectStorySpec {
  return { ...scene.content, schemaVersion: 1, id: film.id + "-" + scene.id, fps: film.fps, durationFrames: scene.durationFrames, ...size };
}

/** Compile for one output. All problems are returned together, each with a JSON Pointer. */
export function compileFilm(input: unknown, options: FilmCompileOptions = {}): FilmCompilation {
  const diagnostics: FilmDiagnostic[] = checkJsonSchema(input, SCHEMA).map(({ code, ...problem }) => ({ severity: "error", code, ...problem }));
  const fail = (): FilmCompilation => ({ ok: false, diagnostics });
  const report = (severity: FilmDiagnostic["severity"], code: string, path: string, message: string, hint?: string) => diagnostics.push({ severity, code, path, message, hint });
  const doc = input as FilmDocument;
  if (!Array.isArray(doc?.scenes) || !Array.isArray(doc?.outputs) || !doc.fps) return fail();
  if (!doc.scenes.length) report("error", "film-needs-scene", "/scenes", "The film has no scenes.", "Add at least one scene.");
  if (!doc.outputs.length) report("error", "film-needs-output", "/outputs", "The film has no outputs.", 'Add an output, such as { "id": "landscape", "preset": "youtube" }.');
  if (!doc.scenes.length || !doc.outputs.length) return fail();
  const hasProblem = (path: string) => diagnostics.some(item => item.severity === "error" && (item.path === path || item.path.startsWith(path + "/")));

  const outputIndex = options.outputId === undefined ? 0 : doc.outputs.findIndex(item => item?.id === options.outputId);
  if (outputIndex < 0) { report("error", "film-unknown-output", "/outputs", `No output named "${options.outputId}".`, `Known outputs: ${doc.outputs.map(item => item.id).join(", ")}.`); return fail(); }
  if (hasProblem("/outputs") || hasProblem("/fps") || hasProblem("/id")) return fail();
  const output = doc.outputs[outputIndex], size = outputSize(output);
  const outputPath = "/outputs/" + outputIndex;
  if (size.width % 2 || size.height % 2 || size.width > 7680 || size.height > 4320)
    report("error", "film-output-size", outputPath, `${size.width}×${size.height} cannot be encoded.`, "Use even dimensions up to 7680×4320.");
  doc.outputs.forEach((item, index) => { if (doc.outputs.findIndex(other => other.id === item.id) !== index) report("error", "film-duplicate-output", `/outputs/${index}/id`, `Output ID "${item.id}" is used twice.`, "Give each output its own ID."); });

  const compiled: CompiledFilmScene[] = [], seen = new Set<string>();
  let startFrame = 0;
  doc.scenes.forEach((scene, index) => {
    const path = "/scenes/" + index;
    if (seen.has(scene?.id)) report("error", "film-duplicate-scene", path + "/id", `Scene ID "${scene.id}" is used twice.`, "Give each scene its own ID.");
    seen.add(scene?.id);
    if (index === 0 && scene?.transition) report("error", "film-first-transition", path + "/transition", "The first scene has no scene to transition from.", 'Remove "transition" from this scene.');
    if (hasProblem(path)) return;
    const endFrame = startFrame + scene.durationFrames;
    if (scene.recipeId === "object-story") {
      const story = compileObjectStory(storySpec(scene, doc, size), { measure: options.objectStory?.measure ?? unmeasured, captionFont: options.objectStory?.captionFont });
      for (const item of story.diagnostics) {
        const beatIndex = scene.content.beats.findIndex((beat: { id: string }) => beat.id === item.beatId);
        report(item.severity, item.code, path + "/content" + (beatIndex >= 0 ? "/beats/" + beatIndex : ""), item.message);
      }
      if (story.ok) compiled.push({ kind: "object-story", recipeId: "object-story", id: scene.id, startFrame, endFrame, plan: story.plan,
        cues: story.plan.spec.beats.map(beat => ({ id: beat.id, frame: startFrame + beat.startFrame })) });
    } else {
      const spec = recipeSpec(scene, doc, size);
      for (const item of inspectSceneTemplate(spec)) {
        // The exporter refuses an unlicensed asset, so report it as an error before any render.
        const blocking = item.severity === "error" || item.code === "unlicensed-asset";
        report(blocking ? "error" : "warning", item.code, path + "/content", item.message, item.code === "invalid-recipe" ? recipeHint(scene.recipeId) : undefined);
      }
      if (!hasProblem(path)) {
        const result = compileSceneTemplate(spec);
        compiled.push({ kind: "recipe", recipeId: scene.recipeId, id: scene.id, startFrame, endFrame, spec,
          cues: result.cueSchedule.map(cue => ({ id: cue.id, frame: startFrame + cue.frame })) });
      }
    }
    startFrame = endFrame;
  });
  const durationFrames = startFrame;
  const fps = doc.fps;
  const cutResult = diagnostics.some(item => item.severity === "error") ? undefined : compileCutPlan({
    id: doc.id, fps, output: size, scenes: doc.scenes.map(scene => ({ id: scene.id, subjects: {} })),
    shots: doc.scenes.map(scene => ({ id: scene.id, sceneId: scene.id, durationFrames: scene.durationFrames, subjectIds: [],
      camera: { start: { center: { x: size.width / 2, y: size.height / 2 }, zoom: 1 } } })),
    transitions: doc.scenes.slice(1).map(scene => ({ durationFrames: 0, ...scene.transition, kind: scene.transition?.kind ?? "cut" })),
  });
  for (const item of cutResult?.diagnostics ?? []) {
    const index = doc.scenes.findIndex(scene => scene.id === item.shotId);
    report(item.severity, item.code, index >= 0 ? `/scenes/${index}/transition` : "/scenes", item.message);
  }
  const captions: CaptionTrack | undefined = doc.captions && { ...doc.captions, id: doc.id + "-captions", fps };
  if (captions && !hasProblem("/captions")) for (const item of validateCaptionTrack(captions, { durationFrames })) {
    const index = doc.captions!.cues.findIndex(cue => cue.id === item.cueId);
    report(item.severity, item.code, "/captions" + (index >= 0 ? "/cues/" + index : ""), item.message);
  }
  const audio: AudioCueSheet | undefined = doc.audio && { id: doc.id + "-audio", fps, durationFrames, lanes: doc.audio.lanes, sounds: doc.audio.sounds, links: doc.audio.links };
  if (audio && !hasProblem("/audio")) {
    const visualEvents = compiled.flatMap(scene => scene.cues.map(cue => ({ id: scene.id + "/" + cue.id, frame: cue.frame })));
    for (const item of resolveAudioCues(audio, { visualEvents }).diagnostics) report(item.severity, item.code, "/audio", item.message);
  }
  if (size.preset) for (const item of inspectVideoPreset({ schemaVersion: 1, id: doc.id, width: size.width, height: size.height, durationFrames, fps }, size.preset, Boolean(doc.audio)))
    report(item.severity, item.code, outputPath, item.message);
  if (diagnostics.some(item => item.severity === "error") || !cutResult?.ok) return fail();

  const plan = cutResult.plan;
  const manifest: VideoExportManifest = {
    schemaVersion: 1, id: doc.id + "-" + output.id, durationFrames, width: size.width, height: size.height, fps, preset: size.preset,
    assets: compiled.flatMap(scene => scene.kind !== "recipe" ? [] : compileSceneTemplate(scene.spec).assets.map(asset => ({
      id: scene.id + "/" + asset.id, kind: "image" as const, url: asset.src, licenseRef: asset.licenseRef }))),
  };
  return { ok: true, diagnostics, film: {
    id: doc.id, fps, outputId: output.id, appearance: doc.appearance ?? "dark", width: size.width, height: size.height, durationFrames, scenes: compiled, cut: plan, captions, audio, manifest,
    reviewFrames: reviewFrames(compiled, plan), safeInset: size.preset ? videoPlatformPreset(size.preset).safeInset : undefined,
  } };
}

/** The stills a reviewer needs: each cue, each finished beat, each scene end and each transition midpoint. */
function reviewFrames(scenes: readonly CompiledFilmScene[], cut: CompiledCutPlan): FilmReviewFrame[] {
  const inTransition = (frame: number) => cut.transitions.some(item => item.kind !== "cut" && frame >= item.startFrame && frame < item.endFrame);
  const frames: FilmReviewFrame[] = [];
  const add = (sceneId: string, frame: number, label: string) => {
    if (!frames.some(item => item.frame === frame)) frames.push({ frame, sceneId, label, transition: inTransition(frame) });
  };
  for (const scene of scenes) {
    if (scene.kind === "object-story") for (const beat of scene.plan.spec.beats) add(scene.id, scene.startFrame + beat.endFrame - 1, beat.id);
    else { for (const cue of scene.cues) add(scene.id, cue.frame, cue.id); add(scene.id, scene.endFrame - 1, "end"); }
  }
  for (const item of cut.transitions) if (item.kind !== "cut" && item.endFrame > item.startFrame)
    add(item.toShotId, Math.floor((item.startFrame + item.endFrame) / 2), item.kind);
  return frames.sort((a, b) => a.frame - b.frame);
}

export function evaluateFilm(film: CompiledFilm, frame: number, options: CutEvaluationOptions = {}): CutFrame { return evaluateCutPlan(film.cut, frame, options); }
