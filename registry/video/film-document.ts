/** FD1: one JSON file that describes a whole film. It holds ordered scenes, the cuts between them, captions, audio
 * lanes and output sizes, and it compiles through the existing compilers: `compileSceneTemplate`,
 * `compileObjectStory`, `compileCutPlan`, `validateCaptionTrack` and `resolveAudioCues`.
 * It adds no clock, renderer or layout engine. A frame resolves from (compiled film, frame) only.
 * Types here are the source of `film-document.schema.json`. After a change, run `npm run film:schema`.
 */
import { inspectShaderFxUse } from "./shader-fx-guide";
import { RAY_WORLD_IDS } from "./ray-world";
import { inspectShot3d, shot3dCues, shot3dTurnCue } from "./film-3d";
import { inspectLookSpec, mergeLookSpecs, resolveLook } from "./film-look";
import { cardCues, inspectCard } from "./film-cards";
import { compileScreenDemo, inspectScreenDemoOutput } from "./screen-demo";
import type { ScreenDemoContent, ScreenDemoPlan } from "./screen-demo";
import type { FilmBrand, FilmCardContent } from "./film-cards";
import type { FilmLookSpec, ResolvedLook } from "./film-look";
import type { FilmShot3dContent } from "./film-3d";
import type { RayWorldId } from "./ray-world";
import type { ImageAsset } from "./scene-templates";
import { MIX_PROFILES } from "./sound-mastering";
import type { MixProfileId } from "./sound-mastering";
import { SOUND_ROOMS } from "./sound-design";
import type { SoundRoomId } from "./sound-design";
import { compileCutPlan, evaluateCutPlan } from "../motion/cut-director";
import type { CompiledCutPlan, CutEvaluationOptions, CutFrame, CutTransitionSpec } from "../motion/cut-director";
import type { RationalFps, Rect } from "../motion/types";
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
import { SCENE_FULL_BLEED, compileSceneTemplate, inspectSceneTemplate } from "./scene-templates";
import type { FocusRegion, SceneBase, SceneRecipeId, SceneRecipePayloads, SceneTemplateSpec } from "./scene-templates";
import { inspectShaderFx, shaderFxAssets } from "./shader-fx";
import type { ShaderFxSpec } from "./shader-fx";
import type { VideoExportManifest } from "./video-export-stage";

export type FilmOutput =
  | { id: string; preset: VideoPlatformPresetId }
  | { id: string; width: number; height: number };
/** Duration comes out of the incoming scene, so a film lasts the sum of its scenes. */
export interface FilmTransition {
  kind: "cut" | "dissolve" | "wipe" | "whip" | "match";
  durationFrames?: number;
  /** `match`: a subject that both scenes hold. It travels from its old place to its new place while the scenes dissolve. */
  subject?: string;
  /** A shader with `layer: "transition"`. It covers the frame at the midpoint of this transition. Reduced motion drops it. */
  fx?: ShaderFxSpec;
  axis?: CutTransitionSpec["axis"];
  direction?: CutTransitionSpec["direction"];
  reducedMotion?: CutTransitionSpec["reducedMotion"];
}
/** What a scene does to the viewer's belief. A scene where `actually` differs from `expects` is a turn. */
export interface FilmStory {
  /** What the viewer believes when the scene starts. */
  expects?: string;
  /** What the scene shows to be true. */
  actually?: string;
  /** Questions that this scene raises. Each one must close in this scene or a later one. */
  opens?: readonly string[];
  /** Questions that this scene answers. */
  closes?: readonly string[];
  /** The cue or beat where the turn lands. Default: `reveal`, or the last beat of an object story. */
  turnAt?: string;
  /** Where the eye must land: a subject ID, or `text` for the largest text. Checked at review. */
  hero?: string;
  /** The sound of the turn. `soft` is one quiet tone, for a dry twist. `impact` is a riser and a hit, for a big reveal. @default "soft" */
  turnAccent?: "soft" | "impact" | "none";
  /** How this scene follows the one before: `but` turns against it, `therefore` follows from it, `and` only adds to it. Scenes joined
   * by "and then" make a list, not a story. */
  link?: "but" | "therefore" | "and";
  /** How the scene leaves the viewer, from -1 (at their lowest) to 1 (at their highest), for the arc check. */
  feeling?: number;
}
/** Where a subject is on screen. `image`: fractions of the scene's first image, fitted to cover the frame.
 * `object`: fractions of the object with the same ID in an object story. */
export interface FilmSubject { region: FocusRegion; of?: "frame" | "image" | "object" }
interface FilmSceneBase extends Pick<SceneBase, "cueFrames" | "background" | "accent" | "safeInsets"> {
  /** Stable name. Review reports and audio links use it. */
  id: string;
  durationFrames: number;
  /** How this scene arrives. The first scene has none. Default: a hard cut. */
  transition?: FilmTransition;
  story?: FilmStory;
  /** Named subjects. Use the same ID in two scenes for the same thing. An object story adds its objects itself. */
  subjects?: Readonly<Record<string, FilmSubject>>;
  /** This scene's look, merged over the film's: its preset wins, its moods add, its overrides merge. For a grade that changes
   * with the story (a colour script). */
  look?: FilmLookSpec;
  /** Up to two shader effects. Frames are relative to the scene. A `background` effect replaces the scene's canvas. */
  fx?: readonly ShaderFxSpec[];
}
export type FilmRecipeScene = { [R in SceneRecipeId]: FilmSceneBase & { recipeId: R; content: SceneRecipePayloads[R] } }[SceneRecipeId];
export type FilmObjectStoryContent = Pick<ObjectStorySpec, "objects" | "beats" | "carried" | "language" | "maxStillSeconds">;
export interface FilmObjectStoryScene extends FilmSceneBase { recipeId: "object-story"; content: FilmObjectStoryContent }
/** Words on a ray world. They land, hold still and leave. */
export interface FilmWorldTitle { id: string; text: string; startFrame: number; endFrame: number; align?: "start" | "end" }
export interface FilmRayWorldContent {
  world: RayWorldId;
  /** What the viewer sees, for a reader who cannot see it. */
  label: string;
  /** Where in the world this scene begins. */
  fromSeconds?: number;
  images?: readonly ImageAsset[];
  samples?: number;
  titles?: readonly FilmWorldTitle[];
  /** Named frames in the scene, so `audio.cues` can land a sound on an event. */
  moments?: readonly FilmCue[];
}
export interface FilmRayWorldScene extends FilmSceneBase { recipeId: "ray-world"; content: FilmRayWorldContent }
/** A React Three Fiber recipe: a studio shot of a hero asset, light through water, a baked or captured place, or baked physics.
 * See `film-3d.ts` for the shots, subjects and sets. */
export interface FilmShot3dScene extends FilmSceneBase { recipeId: "shot-3d"; content: FilmShot3dContent }
/** A typographic card: a hook line, a numbered list, a versus, a quote, or the end card with the brand and its call to action. */
export interface FilmCardScene extends FilmSceneBase { recipeId: "card"; content: FilmCardContent }
/** A screen demo: screenshots or live React UI, with a choreographed cursor, a camera that follows the work, and callouts. */
export interface FilmScreenDemoScene extends FilmSceneBase { recipeId: "screen-demo"; content: ScreenDemoContent }
export type FilmScene = FilmRecipeScene | FilmObjectStoryScene | FilmRayWorldScene | FilmShot3dScene | FilmCardScene | FilmScreenDemoScene;
export interface FilmCaptions { timing: CaptionTrack["timing"]; cues: readonly CaptionCue[]; speakers?: CaptionTrack["speakers"] }
export interface FilmAudio {
  /** Each `assetRef` is relative to the film file. */
  lanes: readonly AudioLane[];
  sounds?: readonly SoundEvent[];
  /** Tie a sound or word to `<scene id>/focus`, `/reveal`, `/resolve`, or `<scene id>/<beat id>`. */
  links?: readonly VisualAudioLink[];
  /** Place a whoosh on each transition, and a riser and a hit on each turn, from a kit folder next to the film file. */
  accents?: { kit: string; gainDb?: number };
  /** Named sounds from the kit, tied to a moment by name, so a re-timed film keeps its sound in step. */
  cues?: readonly FilmSoundCue[];
  /** Recorded ambience from the sound catalog, baked to length at render. */
  beds?: readonly FilmAudioBed[];
  /** Finish the mix for a platform. A film that misses its target stops at render. */
  master?: FilmAudioMaster;
  /** Rights reference that covers the whole mix. */
  licenseRef: string;
}
export interface FilmAudioBed {
  id: string;
  /** A catalog sound with the `loop` tag. */
  sound: string;
  gainDb?: number;
  fadeSeconds?: number;
  /** Muffles the bed, as if heard through water or a wall. */
  lowpassHz?: number;
  /** Plays the bed backwards. */
  reverse?: boolean;
  startFrame?: number;
  /** Defaults to the rest of the film. */
  durationFrames?: number;
}
export interface FilmAudioMaster {
  profile: MixProfileId;
  /** How far narration pushes everything else down, in dB. Defaults to 12 when a film has narration. */
  duckDb?: number;
  /** Add a limiter, for a mix of real recordings. Without it the master is one gain, which stops at the true peak ceiling. */
  limit?: boolean;
}
export interface FilmSoundCue {
  id: string;
  /** A sound name in `kit.json`, such as `paper-touch`. */
  sound: string;
  /** `<scene id>/<cue or beat id>`. */
  at: string;
  /** Frames after the moment. Negative leads it. @default 0 */
  offsetFrames?: number;
  gainDb?: number;
  /** The space around this sound. It needs a kit from the sound catalog. */
  room?: SoundRoomId;
  /** Where the sound sits: -1 is left, 1 is right. */
  pan?: number;
  /** Metres from the camera. Farther is quieter, duller and wetter. */
  distance?: number;
}
/** `kit.json` of an accent kit. `peakSeconds` is where the sound peaks, so the peak can land on its frame. */
export interface FilmAccentKit { sounds: Readonly<Record<string, { file: string; peakSeconds: number; gainDb?: number; catalogId?: string }>> }
export interface FilmDocument {
  schemaVersion: 1;
  id: string;
  fps: RationalFps;
  /** Scene recipes are drawn for dark. @default "dark" */
  appearance?: "light" | "dark";
  /** A slow push-in across each scene, as a share of its size (0.04 is 4%), so that no moment is fully still. @default 0 */
  drift?: number;
  /** How the film feels: a preset look (grade, film or video texture, cadence, camera, lens, 3D lighting, type, sound) and mood words.
   * See `film-look.ts` and docs/33. */
  look?: FilmLookSpec;
  /** The brand an ad carries: name, colours, mark, call to action and corner bug. With a brand, `film:check` applies the ad checks
   * (a hook within 3 s, the brand within 5 s, a closing call to action, captions for narration, vertical length). */
  brand?: FilmBrand;
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
/** A subject that travels across a transition: from its last box, through a meeting box at the midpoint, to its new box. */
export interface FilmMatch { subject: string; from: Rect; via: Rect; to: Rect }
/** Pixel box of a subject at the first and the last frame of its scene. */
export interface FilmSubjectBox { start: Rect; end: Rect }
export type CompiledFilmScene = { id: string; startFrame: number; endFrame: number; cues: readonly FilmCue[];
  subjects: Readonly<Record<string, FilmSubjectBox>>; story?: FilmStory; turnFrame?: number; fx: readonly ShaderFxSpec[];
  /** The scene's resolved look, when the film or the scene sets one. */ look?: ResolvedLook } & (
  | { kind: "recipe"; recipeId: SceneRecipeId; spec: SceneTemplateSpec }
  | { kind: "object-story"; recipeId: "object-story"; plan: ObjectStoryPlan }
  | { kind: "ray-world"; recipeId: "ray-world"; content: FilmRayWorldContent }
  | { kind: "shot-3d"; recipeId: "shot-3d"; content: FilmShot3dContent; /** The moment a story's turn lands on by default. */ turnCue: string }
  | { kind: "card"; recipeId: "card"; content: FilmCardContent }
  | { kind: "screen-demo"; recipeId: "screen-demo"; plan: ScreenDemoPlan });
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
  drift: number;
  width: number;
  height: number;
  durationFrames: number;
  scenes: readonly CompiledFilmScene[];
  cut: CompiledCutPlan;
  /** Match transitions, by incoming scene ID. */
  matches: Readonly<Record<string, FilmMatch>>;
  /** Shader transitions, by incoming scene ID. */
  transitionFx: Readonly<Record<string, ShaderFxSpec>>;
  captions?: CaptionTrack;
  audio?: AudioCueSheet;
  manifest: VideoExportManifest;
  reviewFrames: readonly FilmReviewFrame[];
  /** Normalized platform safe area of this output, if it has a preset. */
  safeInset?: { left: number; right: number; top: number; bottom: number };
  /** The film's own look, for what spans scenes: captions and type. */
  look?: ResolvedLook;
  brand?: FilmBrand;
}
export type FilmCompilation =
  | { ok: true; film: CompiledFilm; diagnostics: readonly FilmDiagnostic[] }
  | { ok: false; diagnostics: readonly FilmDiagnostic[] };
export interface FilmCompileOptions {
  /** Output ID. Default: the first output. */
  outputId?: string;
  /** Real loaded-font measurement. Without it, a caption that does not fit is found only by the browser compile. */
  objectStory?: Pick<ObjectStoryOptions, "measure" | "captionFont">;
  /** The `kit.json` of `audio.accents.kit`. Without it, no accent is placed. */
  accentKit?: FilmAccentKit;
}

const SCHEMA = schema as unknown as JsonSchema;
/** Lets a compile run without a browser: every caption fits, so only a compile with real fonts can report one that does not. */
const unmeasured: MeasureText = () => 1;
const hasKey = (table: object, key: string) => Object.prototype.hasOwnProperty.call(table, key);
/** The default recipe accent is pale, so it cannot carry text on a light canvas. */
const LIGHT_ACCENT = "#0f6e66";
const recipeHint = (recipeId: string) => `Compare with a valid scene: npm run film:example -- --recipe=${recipeId}`;

function outputSize(output: FilmOutput): { width: number; height: number; preset?: VideoPlatformPresetId } {
  if ("preset" in output) { const { width, height } = videoPlatformPreset(output.preset); return { width, height, preset: output.preset }; }
  return { width: output.width, height: output.height };
}

const MATCH_FRAMES = 16, FLAT_ARC_SECONDS = 20, MAX_SCENE_FX = 2;
const within = (box: Rect, region: FocusRegion): Rect => ({ x: box.x + region.x * box.width, y: box.y + region.y * box.height, width: region.width * box.width, height: region.height * box.height });

/** The smallest box that both scenes can bring their subject to while each scene still covers the whole frame.
 * A scene that only moved its subject to the other box would show its own edge. Both scenes push in to this box. */
function meetingBox(from: Rect, to: Rect, size: { width: number; height: number }): Rect {
  const STEPS = 48, centre = (box: Rect) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 }), boxes = [from, to];
  let best = { height: Infinity, x: size.width / 2, y: size.height / 2 };
  for (let row = 1; row < STEPS; row += 1) for (let col = 1; col < STEPS; col += 1) {
    const x = size.width * col / STEPS, y = size.height * row / STEPS;
    // The zoom that each scene needs so that no edge of it enters the frame.
    const height = Math.max(...boxes.map(box => { const c = centre(box); return box.height * Math.max(1, x / Math.max(1, c.x), (size.width - x) / Math.max(1, size.width - c.x), y / Math.max(1, c.y), (size.height - y) / Math.max(1, size.height - c.y)); }));
    if (height < best.height) best = { height, x, y };
  }
  const width = best.height * from.width / from.height;
  return { x: best.x - width / 2, y: best.y - best.height / 2, width, height: best.height };
}

/** Pixel boxes of a scene's subjects. Returns a message for a subject that cannot be placed. */
function subjectBoxes(scene: FilmScene, compiled: { spec?: SceneTemplateSpec; plan?: ObjectStoryPlan }, size: { width: number; height: number }): { boxes: Record<string, FilmSubjectBox>; problems: string[] } {
  const boxes: Record<string, FilmSubjectBox> = {}, problems: string[] = [], frame = { x: 0, y: 0, ...size };
  const beats = compiled.plan?.beats;
  if (beats?.length) for (const object of compiled.plan!.objects.keys()) {
    const start = beats.find(beat => beat.rects.has(object))?.rects.get(object), end = [...beats].reverse().find(beat => beat.rects.has(object))?.rects.get(object);
    if (start && end) boxes[object] = { start, end };
  }
  for (const [id, subject] of Object.entries(scene.subjects ?? {})) {
    const of = subject.of ?? "frame";
    if (of === "frame") { const box = within(frame, subject.region); boxes[id] = { start: box, end: box }; continue; }
    if (of === "object") {
      const base = boxes[id];
      if (base) boxes[id] = { start: within(base.start, subject.region), end: within(base.end, subject.region) };
      else problems.push(`Subject "${id}" is "of": "object", but the scene has no object with that ID.`);
      continue;
    }
    const image = compiled.spec && compileSceneTemplate(compiled.spec).assets.find(asset => asset.width && asset.height);
    if (!image) { problems.push(`Subject "${id}" is "of": "image", but the scene has no image with a width and a height.`); continue; }
    const scale = Math.max(size.width / image.width!, size.height / image.height!), width = image.width! * scale, height = image.height! * scale;
    const box = within({ x: (size.width - width) / 2, y: (size.height - height) / 2, width, height }, subject.region);
    boxes[id] = { start: box, end: box };
  }
  return { boxes, problems };
}

/** Expand one film scene to the full spec that its recipe compiler takes. */
function recipeSpec(scene: FilmRecipeScene, film: FilmDocument, size: { width: number; height: number; preset?: VideoPlatformPresetId }): SceneTemplateSpec {
  const { recipeId, content, durationFrames, cueFrames, accent } = scene;
  const background = scene.fx?.some(fx => fx.layer === "background") ? "transparent" : scene.background;
  // A full-bleed recipe turns insets into padding around its media, so it places its own copy instead.
  const preset = size.preset && !SCENE_FULL_BLEED.has(recipeId) ? videoPlatformPreset(size.preset).safeInset : undefined;
  // Drift scales the scene from its centre, so the copy must start inside the safe area by half of that growth.
  const margin = (film.drift ?? 0) / 2;
  const safeInsets = scene.safeInsets ?? (preset && { top: preset.top + margin, right: preset.right + margin, bottom: preset.bottom + margin, left: preset.left + margin });
  return { recipeId, content, durationFrames, cueFrames, background, accent: accent ?? (film.appearance === "light" ? LIGHT_ACCENT : undefined), safeInsets, schemaVersion: 1, recipeVersion: 1, id: film.id + "-" + scene.id, fps: film.fps, width: size.width, height: size.height } as SceneTemplateSpec;
}
function storySpec(scene: FilmObjectStoryScene, film: FilmDocument, size: { width: number; height: number }): ObjectStorySpec {
  return { ...scene.content, schemaVersion: 1, id: film.id + "-" + scene.id, fps: film.fps, durationFrames: scene.durationFrames, width: size.width, height: size.height };
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

  // How the film uses its effects, from studio practice. Warnings: a film may break a rule on purpose.
  for (const { path, code, message, hint } of inspectShaderFxUse(doc.scenes.map((scene, index) => ({ path: `/scenes/${index}/fx`, fx: [...scene.fx ?? [], ...scene.transition?.fx ? [scene.transition.fx] : []] }))))
    report("warning", code, path, message, hint);
  const compiled: CompiledFilmScene[] = [], seen = new Set<string>();
  // Looks: the film's, checked once; each scene's merged over it and checked where the scene sets one.
  if (doc.look) for (const item of inspectLookSpec(doc.look)) report(item.severity, item.code, "/look" + item.path, item.message, item.hint);
  const sceneLook = (scene: FilmScene, path: string): ResolvedLook | undefined => {
    const spec = mergeLookSpecs(doc.look, scene.look);
    if (!spec) return undefined;
    const showsInterface = (scene.recipeId === "shot-3d" && (scene.content as { shot?: string })?.shot === "screen-alive") || scene.recipeId === "screen-demo";
    if (scene.look || showsInterface) for (const item of inspectLookSpec(spec, { showsInterface })) {
      if (!scene.look && item.code !== "look-cadence-on-ui") continue;
      report(item.severity, item.code, path + "/look" + item.path, item.message, item.hint);
    }
    return resolveLook(spec);
  };
  const placed = (scene: FilmScene, source: Parameters<typeof subjectBoxes>[1], path: string) => {
    const { boxes, problems } = subjectBoxes(scene, source, size);
    for (const message of problems) report("error", "film-subject", path + "/subjects", message);
    return { subjects: boxes, story: scene.story, fx: scene.fx ?? [], look: sceneLook(scene, path) };
  };
  let startFrame = 0;
  doc.scenes.forEach((scene, index) => {
    const path = "/scenes/" + index;
    if (seen.has(scene?.id)) report("error", "film-duplicate-scene", path + "/id", `Scene ID "${scene.id}" is used twice.`, "Give each scene its own ID.");
    seen.add(scene?.id);
    if (index === 0 && scene?.transition) report("error", "film-first-transition", path + "/transition", "The first scene has no scene to transition from.", 'Remove "transition" from this scene.');
    if (hasProblem(path)) return;
    const endFrame = startFrame + scene.durationFrames;
    // Two effects in each scene means at most four WebGL contexts during a transition.
    if ((scene.fx?.length ?? 0) > MAX_SCENE_FX) report("error", "shader-fx-budget", path + "/fx", `A scene takes at most ${MAX_SCENE_FX} effects.`, "Pick the effect that teaches something. An effect should not fill an empty shot.");
    for (const [fxIndex, fx] of (scene.fx ?? []).entries()) {
      for (const { path: at, code, message, hint } of inspectShaderFx(fx, scene.durationFrames)) report("error", code, `${path}/fx/${fxIndex}${at}`, message, hint);
      if (fx.layer === "transition") report("error", "shader-fx-layer", `${path}/fx/${fxIndex}/layer`, "A scene effect cannot be a transition.", 'Put it in the "fx" of the transition into the next scene.');
      if (scene.fx!.findIndex((other: ShaderFxSpec) => other.id === fx.id) !== fxIndex) report("error", "shader-fx-id", `${path}/fx/${fxIndex}/id`, `Effect ID "${fx.id}" is used twice in this scene.`);
      for (const asset of shaderFxAssets(fx)) if (!asset.licenseRef?.trim()) report("error", "unlicensed-asset", `${path}/fx/${fxIndex}/image`, `Asset "${asset.id}" has no source-rights reference.`);
    }
    const moving = scene.transition?.fx;
    if (moving) {
      const frames = scene.transition!.durationFrames ?? 0;
      if (moving.layer !== "transition") report("error", "shader-fx-layer", path + "/transition/fx/layer", 'A transition effect needs `"layer": "transition"`.');
      if (!["dissolve", "wipe", "whip"].includes(scene.transition!.kind) || frames < 8) report("error", "shader-fx-timing", path + "/transition/fx", "A shader transition needs a dissolve, wipe or whip of at least 8 frames.", "Set `durationFrames`. Frames under 8 flash.");
      for (const { path: at, code, message, hint } of inspectShaderFx(moving, Math.max(1, frames))) report("error", code, `${path}/transition/fx${at}`, message, hint);
      for (const asset of shaderFxAssets(moving)) if (!asset.licenseRef?.trim()) report("error", "unlicensed-asset", path + "/transition/fx/image", `Asset "${asset.id}" has no source-rights reference.`);
    }
    if (scene.recipeId === "ray-world") {
      const content = scene.content as FilmRayWorldContent, world = RAY_WORLD_IDS[content?.world], at = path + "/content";
      if (!world) report("error", "ray-world-unknown", at + "/world", `"${content?.world}" is not a world.`, `Worlds: ${Object.keys(RAY_WORLD_IDS).join(", ")}.`);
      else {
        if ((content.images?.length ?? 0) !== world.images) report("error", "ray-world-image", at + "/images", `World "${content.world}" needs ${world.images} picture(s).`);
        for (const image of content.images ?? []) if (!image.licenseRef?.trim()) report("error", "unlicensed-asset", at + "/images", `Asset "${image.id}" has no source-rights reference.`);
        if ((content.fromSeconds ?? 0) + scene.durationFrames * doc.fps.den / doc.fps.num > world.durationSeconds + 1e-6) report("error", "ray-world-length", at + "/fromSeconds", `This scene runs past the end of "${content.world}", which is ${world.durationSeconds} seconds.`, "Shorten the scene, or start it earlier.");
      }
      if (!content?.label?.trim()) report("error", "ray-world-label", at + "/label", "A world needs a text alternative.", "Say what the viewer sees.");
      const named = [...content?.titles ?? [], ...content?.moments?.map(moment => ({ id: moment.id, startFrame: moment.frame, endFrame: moment.frame + 1 })) ?? []];
      named.forEach((item, itemIndex) => {
        if (named.findIndex(other => other.id === item.id) !== itemIndex) report("error", "ray-world-cue", at, `"${item.id}" is used twice in this scene.`);
        if (!(item.startFrame >= 0 && item.endFrame > item.startFrame && item.endFrame <= scene.durationFrames)) report("error", "ray-world-cue", at, `"${item.id}" must sit inside the scene.`);
      });
      if (!hasProblem(path)) compiled.push({ kind: "ray-world", recipeId: "ray-world", id: scene.id, startFrame, endFrame, content,
        cues: [{ id: "start", frame: startFrame }, ...named.map(item => ({ id: item.id, frame: startFrame + item.startFrame }))].sort((a, b) => a.frame - b.frame), ...placed(scene, {}, path) });
    } else if (scene.recipeId === "card") {
      const content = scene.content as FilmCardContent, at = path + "/content";
      for (const item of inspectCard(content, scene.durationFrames, doc.fps.num / doc.fps.den, doc.brand)) report(item.severity, item.code, at + item.path, item.message, item.hint);
      if (!hasProblem(path)) compiled.push({ kind: "card", recipeId: "card", id: scene.id, startFrame, endFrame, content,
        cues: [{ id: "start", frame: startFrame }, ...cardCues(content, doc.fps.num / doc.fps.den).filter(cue => cue.frame < scene.durationFrames).map(cue => ({ id: cue.id, frame: startFrame + cue.frame }))], ...placed(scene, {}, path) });
    } else if (scene.recipeId === "screen-demo") {
      const content = scene.content as ScreenDemoContent, at = path + "/content", fps = doc.fps.num / doc.fps.den;
      const safe = size.preset ? videoPlatformPreset(size.preset).safeInset : undefined;
      const { plan, problems } = compileScreenDemo(content, scene.durationFrames, fps, { width: size.width, height: size.height, safe });
      for (const item of [...problems, ...inspectScreenDemoOutput(plan, size, safe)]) report(item.severity, item.code, at + item.path, item.message, item.hint);
      if (!hasProblem(path)) compiled.push({ kind: "screen-demo", recipeId: "screen-demo", id: scene.id, startFrame, endFrame, plan,
        cues: [{ id: "start", frame: startFrame }, ...plan.cues.filter(cue => cue.frame < scene.durationFrames).map(cue => ({ id: cue.id, frame: startFrame + cue.frame }))], ...placed(scene, {}, path) });
    } else if (scene.recipeId === "shot-3d") {
      const content = scene.content as FilmShot3dContent, at = path + "/content";
      for (const item of inspectShot3d(content, scene.durationFrames, doc.fps.num / doc.fps.den)) report(item.severity, item.code, at + item.path, item.message, item.hint);
      if (!hasProblem(path)) compiled.push({ kind: "shot-3d", recipeId: "shot-3d", id: scene.id, startFrame, endFrame, content, turnCue: shot3dTurnCue(content),
        cues: [{ id: "start", frame: startFrame }, ...shot3dCues(content, scene.durationFrames, doc.fps.num / doc.fps.den).map(cue => ({ id: cue.id, frame: startFrame + cue.frame }))], ...placed(scene, {}, path) });
    } else if (scene.recipeId === "object-story") {
      const story = compileObjectStory(storySpec(scene, doc, size), { measure: options.objectStory?.measure ?? unmeasured, captionFont: options.objectStory?.captionFont });
      for (const item of story.diagnostics) {
        const beatIndex = scene.content.beats.findIndex((beat: { id: string }) => beat.id === item.beatId);
        report(item.severity, item.code, path + "/content" + (beatIndex >= 0 ? "/beats/" + beatIndex : ""), item.message);
      }
      if (story.ok) compiled.push({ kind: "object-story", recipeId: "object-story", id: scene.id, startFrame, endFrame, plan: story.plan,
        cues: story.plan.spec.beats.map(beat => ({ id: beat.id, frame: startFrame + beat.startFrame })), ...placed(scene, { plan: story.plan }, path) });
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
          cues: result.cueSchedule.map(cue => ({ id: cue.id, frame: startFrame + cue.frame })), ...placed(scene, { spec }, path) });
      }
    }
    startFrame = endFrame;
  });
  const durationFrames = startFrame;
  const fps = doc.fps;
  const matches: Record<string, FilmMatch> = {};
  if (compiled.length === doc.scenes.length) {
    checkStory(doc, compiled, durationFrames, report);
    checkPacing(doc, report);
    if (doc.brand) checkAd(doc, compiled, durationFrames, size, report);
    doc.scenes.forEach((scene, index) => {
      if (index === 0) return;
      const from = compiled[index - 1].subjects, to = compiled[index].subjects, path = `/scenes/${index}/transition`;
      const shared = Object.keys(from).filter(id => id in to);
      if (scene.transition?.kind !== "match") {
        if (shared.length) report("warning", "film-match-available", path, `This scene and the scene before it both hold "${shared[0]}".`, `Carry it across the cut: { "kind": "match", "subject": "${shared[0]}" }.`);
        return;
      }
      const subject = scene.transition.subject;
      if (subject && from[subject] && to[subject]) matches[scene.id] = { subject, from: from[subject].end, via: meetingBox(from[subject].end, to[subject].start, size), to: to[subject].start };
      else report("error", "film-match-subject", path, subject ? `"${subject}" is not a subject of both scenes.` : "A match transition needs a subject.",
        shared.length ? `Subjects in both scenes: ${shared.join(", ")}.` : "Give both scenes a subject with the same ID.");
    });
  }
  const cutResult = diagnostics.some(item => item.severity === "error") ? undefined : compileCutPlan({
    id: doc.id, fps, output: size, scenes: doc.scenes.map(scene => ({ id: scene.id, subjects: {} })),
    shots: doc.scenes.map(scene => ({ id: scene.id, sceneId: scene.id, durationFrames: scene.durationFrames, subjectIds: [],
      camera: { start: { center: { x: size.width / 2, y: size.height / 2 }, zoom: 1 } } })),
    // A match is drawn as a dissolve. FilmStage moves both scenes so that the subject stays in one place.
    transitions: doc.scenes.slice(1).map(({ transition }) => transition?.kind === "match"
      ? { kind: "dissolve" as const, durationFrames: transition.durationFrames ?? MATCH_FRAMES }
      : { durationFrames: transition?.durationFrames ?? 0, axis: transition?.axis, direction: transition?.direction, reducedMotion: transition?.reducedMotion, kind: (transition?.kind ?? "cut") as Exclude<FilmTransition["kind"], "match"> }),
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
  const accents = doc.audio?.accents && options.accentKit && cutResult?.ok ? deriveAccents(compiled, cutResult.plan, fps, options.accentKit, doc.audio) : [];
  const master = doc.audio?.master;
  (doc.audio?.beds ?? []).forEach((bed, index) => {
    const at = `/audio/beds/${index}`;
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,60}$/.test(bed.id ?? "") || !/^[a-z0-9-]{1,80}$/.test(bed.sound ?? "")) report("error", "sound-bed", at, "A bed needs a plain ID and a catalog sound ID.");
    if (!(bed.lowpassHz === undefined || (bed.lowpassHz >= 200 && bed.lowpassHz <= 20000))) report("error", "sound-bed", at + "/lowpassHz", "A low-pass runs from 200 to 20000 Hz.");
    if (!(bed.fadeSeconds === undefined || (bed.fadeSeconds >= 0 && bed.fadeSeconds <= 30))) report("error", "sound-bed", at + "/fadeSeconds", "A fade runs from 0 to 30 seconds.");
    if (!(bed.startFrame === undefined || (Number.isSafeInteger(bed.startFrame) && bed.startFrame >= 0 && bed.startFrame < durationFrames))) report("error", "sound-bed", at + "/startFrame", "A bed starts inside the film.");
    if (!(bed.durationFrames === undefined || (Number.isSafeInteger(bed.durationFrames) && bed.durationFrames > 0 && (bed.startFrame ?? 0) + bed.durationFrames <= durationFrames))) report("error", "sound-bed", at + "/durationFrames", "A bed ends inside the film.");
  });
  if (master && !hasKey(MIX_PROFILES, master.profile)) report("error", "sound-master", "/audio/master/profile", `"${master.profile}" is not a profile.`, `Profiles: ${Object.keys(MIX_PROFILES).join(", ")}.`);
  if (master?.duckDb !== undefined && !(master.duckDb >= 0 && master.duckDb <= 40)) report("error", "sound-master", "/audio/master/duckDb", "Ducking runs from 0 to 40 dB.");
  (doc.audio?.cues ?? []).forEach((cue, index) => {
    const [sceneId, cueId] = cue.at.split("/"), scene = compiled.find(item => item.id === sceneId);
    if (!doc.audio?.accents) report("error", "sound-cue-no-kit", `/audio/cues/${index}`, "A sound cue needs `audio.accents.kit`.");
    if (cue.room !== undefined && !hasKey(SOUND_ROOMS, cue.room)) report("error", "sound-cue-room", `/audio/cues/${index}/room`, `"${cue.room}" is not a room.`, `Rooms: ${Object.keys(SOUND_ROOMS).join(", ")}.`);
    if (cue.pan !== undefined && !(cue.pan >= -1 && cue.pan <= 1)) report("error", "sound-cue-room", `/audio/cues/${index}/pan`, "Pan runs from -1 to 1.");
    if (cue.distance !== undefined && !(cue.distance >= 1 && cue.distance <= 200)) report("error", "sound-cue-room", `/audio/cues/${index}/distance`, "Distance runs from 1 to 200 metres.");
    if ((cue.room ?? cue.pan ?? cue.distance) !== undefined && options.accentKit && !options.accentKit.sounds[cue.sound]?.catalogId) report("error", "sound-cue-room", `/audio/cues/${index}`, `A room or position needs a catalog sound, and "${cue.sound}" has none.`, "Make the kit with `npm run film:sound-kit -- <folder> --preset=neutral`.");
    if (!scene?.cues.some(item => item.id === cueId) && compiled.length === doc.scenes.length) report("error", "sound-cue-moment", `/audio/cues/${index}/at`, `"${cue.at}" is not a moment in this film.`, "Use <scene id>/<cue or beat id>.");
  });
  for (const sound of new Set(accents.flatMap(item => item.assetRef ? [] : [item.id.split("/").pop()!])))
    report("error", "accent-kit-missing-sound", "/audio/accents", `The accent kit has no "${sound}" sound.`, "Make a current kit: npm run film:sound-kit -- <folder>, or replace the file and name it in kit.json.");
  // A period or lo-fi look muffles beds that set no filter of their own.
  const filmLowpass = doc.look ? resolveLook(doc.look).sound.lowpassHz : undefined;
  const audio: AudioCueSheet | undefined = doc.audio && { id: doc.id + "-audio", fps, durationFrames, links: doc.audio.links,
    lanes: [...doc.audio.lanes, ...(doc.audio.beds ?? []).map(bed => ({ id: "bed-" + bed.id, kind: "ambience" as const, startFrame: bed.startFrame ?? 0, assetRef: `catalog:${bed.sound}:${bed.durationFrames ?? durationFrames - (bed.startFrame ?? 0)}:${bed.fadeSeconds ?? 1.5}:${bed.lowpassHz ?? filmLowpass ?? 0}:${bed.reverse ? 1 : 0}`, gainDb: bed.gainDb })),
      ...accents.length ? [{ id: ACCENT_LANE, kind: "sfx" as const, startFrame: 0 }] : []],
    sounds: [...(doc.audio.sounds ?? []), ...accents] };
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
    assets: [...doc.brand?.mark ? [{ id: "brand/" + doc.brand.mark.id, kind: "image" as const, url: doc.brand.mark.src, licenseRef: doc.brand.mark.licenseRef }] : [], ...compiled.flatMap((scene, index) => [...scene.kind === "recipe" ? compileSceneTemplate(scene.spec).assets : scene.kind === "ray-world" ? scene.content.images ?? [] : scene.kind === "screen-demo" && scene.plan.content.source.kind === "images" ? scene.plan.content.source.states.map(state => state.image) : [], ...[...scene.fx, ...doc.scenes[index].transition?.fx ? [doc.scenes[index].transition!.fx!] : []].flatMap(shaderFxAssets)].map(asset => ({
      id: scene.id + "/" + asset.id, kind: "image" as const, url: asset.src, licenseRef: asset.licenseRef })))],
  };
  return { ok: true, diagnostics, film: {
    id: doc.id, fps, outputId: output.id, appearance: doc.appearance ?? "dark", drift: Math.min(.1, Math.max(0, doc.drift ?? 0)), width: size.width, height: size.height, durationFrames, scenes: compiled, cut: plan, matches, captions, audio, manifest,
    transitionFx: Object.fromEntries(doc.scenes.flatMap(scene => scene.transition?.fx ? [[scene.id, scene.transition.fx]] : [])),
    reviewFrames: reviewFrames(compiled, plan), safeInset: size.preset ? videoPlatformPreset(size.preset).safeInset : undefined, look: doc.look ? resolveLook(doc.look) : undefined, brand: doc.brand,
  } };
}

/** The ad checks, from Google's ABCD review of ads that sold (Google/Kantar 2021, reported by Google) and platform guidance: hook early,
 * brand early, a clear next step, captions for viewers with the sound off, and short vertical ads. Warnings: an ad may break them. */
function checkAd(doc: FilmDocument, compiled: CompiledFilmScene[], durationFrames: number, size: { width: number; height: number }, report: (severity: FilmDiagnostic["severity"], code: string, path: string, message: string, hint?: string) => void): void {
  const fps = doc.fps.num / doc.fps.den, brand = doc.brand!;
  if (!brand.name?.trim()) report("error", "ad-brand-name", "/brand/name", "A brand needs a name.");
  if (brand.mark && !brand.mark.licenseRef?.trim()) report("error", "unlicensed-asset", "/brand/mark", `The brand mark "${brand.mark.id}" has no rights reference.`);
  const first = compiled[0], hook = first?.cues.find(cue => cue.id !== "start");
  if (first && hook && hook.frame > fps * 3) report("warning", "ad-hook-late", "/scenes/0", `The opening lands its first beat at ${(hook.frame / fps).toFixed(1)} s. Ads that sell hook in the first seconds.`, "Open on the hook: a headline card, or move the first scene's beat before 3 s.");
  const brandSeen = brand.bug || compiled.some(scene => scene.startFrame < fps * 5 && scene.kind === "card" && (scene.content.card === "end" || (scene.content.card === "headline" && scene.content.text.toLowerCase().includes(brand.name.toLowerCase()))));
  if (!brandSeen) report("warning", "ad-brand-late", "/brand", "The brand is not seen in the first 5 seconds.", 'Set "bug": true on the brand, or name it in the opening headline.');
  const last = compiled[compiled.length - 1];
  if (!last || last.kind !== "card" || last.content.card !== "end") report("warning", "ad-cta-missing", `/scenes/${doc.scenes.length - 1}`, "The ad does not end on its call to action.", 'End with a card scene: { "card": "end" }.');
  if (doc.audio?.lanes.some(lane => lane.kind === "narration") && !doc.captions) report("warning", "ad-captions-missing", "/captions", "The ad has narration but no captions, and most feed video plays with the sound off.", 'Add "captions" from the narration.');
  if (size.height > size.width && durationFrames / fps > 60) report("warning", "ad-vertical-long", "/scenes", `A vertical ad of ${(durationFrames / fps).toFixed(0)} s runs past the 60 s that short-form placements show.`);
}

/** Scene lengths that are all nearly the same make a metronome; films vary long against short (Cutting et al. 2010, a correlation with
 * attention, not a rule of quality). */
function checkPacing(doc: FilmDocument, report: (severity: FilmDiagnostic["severity"], code: string, path: string, message: string, hint?: string) => void): void {
  const lengths = doc.scenes.map(scene => scene.durationFrames);
  if (lengths.length < 4) return;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length, spread = Math.sqrt(lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length) / mean;
  if (spread < .12) report("warning", "pacing-monotone", "/scenes", `All ${lengths.length} scenes run within ${Math.round(spread * 100)}% of the same length, so the film ticks like a metronome.`, "Hold a key scene longer, and cut a passing one shorter.");
}

/** A screen demo turns where the screen last changes: the result the demo exists to show. */
function screenTurnCue(plan: ScreenDemoPlan): string {
  const changed = plan.steps.filter(step => plan.changes.some(change => change.frame >= step.action && change.frame <= step.end + 2));
  return (changed[changed.length - 1] ?? plan.steps[plan.steps.length - 1])?.id ?? "start";
}
/** A card that puts the brand on screen as a subject, not only as the corner bug: the end card, or a headline that names it. */
function namesBrand(content: FilmCardContent, name: string): boolean {
  const named = (text?: string) => !!text && text.toLowerCase().includes(name.toLowerCase());
  return content.card === "end" || (content.card === "headline" && (named(content.text) || named(content.kicker))) || (content.card === "list" && named(content.title));
}
/** Loops must close, the opening must raise a question, and a film of some length needs a turn. Sets each scene's turn frame. */
function checkStory(doc: FilmDocument, compiled: CompiledFilmScene[], durationFrames: number, report: (severity: FilmDiagnostic["severity"], code: string, path: string, message: string, hint?: string) => void): void {
  if (!doc.scenes.some(scene => scene.story)) return;
  const opened = new Map<string, number>(), closed = new Set<string>(), fps = doc.fps.num / doc.fps.den;
  let turns = 0;
  doc.scenes.forEach((scene, index) => {
    const story = scene.story ?? {}, path = `/scenes/${index}/story`, target = compiled[index];
    // Questions still open when this scene starts: what a turn here can answer for a viewer who is already curious.
    const openBefore = [...opened.keys()].filter(loop => !closed.has(loop));
    if (story.link === "and" && doc.scenes[index - 1]?.story?.link === "and")
      report("warning", "story-and-then", path + "/link", "Two scenes in a row only add (\"and then\"). A run of additions reads as a list.", 'Join them with "but" (a turn against the last scene) or "therefore" (a consequence of it).');
    if (story.feeling !== undefined && !(story.feeling >= -1 && story.feeling <= 1)) report("error", "story-feeling-range", path + "/feeling", "A feeling runs from -1 to 1.");
    for (const loop of story.opens ?? []) opened.set(loop, index);
    for (const loop of story.closes ?? []) {
      if (opened.has(loop)) closed.add(loop);
      else report("error", "story-loop-unknown", path + "/closes", `Loop "${loop}" closes, but no scene opens it first.`, opened.size ? `Open loops: ${[...opened.keys()].join(", ")}.` : 'Add it to "opens" in an earlier scene.');
    }
    if (story.hero !== undefined && story.hero !== "text" && !(story.hero in target.subjects))
      report("error", "story-hero-unknown", path + "/hero", `"${story.hero}" is not a subject of this scene.`, `Use "text", or one of: ${Object.keys(target.subjects).join(", ") || "none"}.`);
    if (Boolean(story.expects) !== Boolean(story.actually))
      report("warning", "story-turn-incomplete", path, 'A turn needs both "expects" and "actually".');
    if (!story.expects || !story.actually || story.expects === story.actually) return;
    turns += 1;
    const cueId = story.turnAt ?? (target.kind === "recipe" ? "reveal" : target.kind === "shot-3d" ? target.turnCue : target.kind === "screen-demo" ? screenTurnCue(target.plan) : target.cues[target.cues.length - 1].id), cue = target.cues.find(item => item.id === cueId);
    if (cue) target.turnFrame = cue.frame;
    else report("error", "story-turn-cue", path + "/turnAt", `"${cueId}" is not a cue of this scene.`, `Cues: ${target.cues.map(item => item.id).join(", ")}.`);
    // Curiosity before an answer improves memory of the answer (Gruber et al. 2014): the turn should land on a question already open,
    // raised in an earlier scene or at least a second earlier in this one.
    const primedHere = (story.opens?.length ?? 0) > 0 && cue !== undefined && cue.frame - target.startFrame >= fps;
    if (cue && !openBefore.length && !primedHere)
      report("warning", "story-unprimed-reveal", path, "This turn answers a question the viewer was never asked, so it lands as information, not a reveal.", 'Open a question before it: "opens" in an earlier scene, or in this one at least a second before the turn.');
  });
  // Transportation into a story needs a character to follow (van Laer et al. 2014): something carried across the scenes.
  const seconds = durationFrames / fps;
  if (doc.scenes.length >= 2 && seconds >= FLAT_ARC_SECONDS) {
    const counts = new Map<string, number>();
    doc.scenes.forEach((scene, index) => {
      const ids = new Set([...Object.keys(compiled[index].subjects), ...scene.story?.hero && scene.story.hero !== "text" ? [scene.story.hero] : [],
        ...scene.recipeId === "shot-3d" && "subject" in scene.content ? [String((scene.content as { subject: string }).subject)] : [],
        ...doc.brand && scene.recipeId === "card" && namesBrand(scene.content, doc.brand.name) ? ["brand"] : [],
        ...scene.recipeId === "screen-demo" ? [`screen:${(scene.content as ScreenDemoContent).source.kind === "ui" ? ((scene.content as ScreenDemoContent).source as { ui: string }).ui : "screenshots"}`] : []]);
      ids.forEach(id => counts.set(id, (counts.get(id) ?? 0) + 1));
    });
    if (![...counts.values()].some(n => n >= 2))
      report("warning", "story-no-protagonist", "/scenes", "Nothing is carried from scene to scene, so there is no one or nothing to follow.", "Give two or more scenes the same subject (a product, a character, a document) or the same story hero.");
  }
  // An arc needs a low before its high: the most-told shapes fall before they rise (Reagan et al. 2016).
  const feelings = doc.scenes.map(scene => scene.story?.feeling).flatMap((f, index) => f === undefined ? [] : [{ f, index }]);
  if (feelings.length >= 3 && seconds >= 30) {
    const low = feelings.reduce((a, b) => b.f < a.f ? b : a), dip = feelings[0].f - low.f, rise = Math.max(...feelings.filter(x => x.index > low.index).map(x => x.f), low.f) - low.f;
    if (dip < .2 || rise < .2) report("warning", "story-arc-flat", "/scenes", dip < .2 ? "The feelings never fall below where the film starts, so the rise has nothing to climb from." : "The feelings fall and never recover.", "Let a scene take the viewer lower (a problem, a cost) before the scenes that lift them.");
  }
  for (const [loop, index] of opened) if (!closed.has(loop))
    report("warning", "story-loop-open", `/scenes/${index}/story/opens`, `Loop "${loop}" opens and never closes.`, 'Add it to "closes" in the scene that answers it.');
  if (!doc.scenes[0].story?.opens?.length) report("warning", "story-hook-no-loop", "/scenes/0/story", "The first scene raises no question.", 'Add "opens" with the question that the film answers.');
  if (!turns && durationFrames * doc.fps.den / doc.fps.num >= FLAT_ARC_SECONDS)
    report("warning", "story-flat-arc", "/scenes", "No scene changes what the viewer believes.", 'Give one scene "expects" and a different "actually".');
}

const ACCENT_LANE = "accents";
/** A whoosh that peaks at the middle of each transition, and on each turn the sound that its story asks for. A sound
 * that the kit does not have gets no `assetRef`, and the compiler reports it. */
function deriveAccents(scenes: readonly CompiledFilmScene[], cut: CompiledCutPlan, fps: RationalFps, kit: FilmAccentKit, request: FilmAudio): SoundEvent[] {
  const place = (id: string, sound: string, peakFrame: number, extraDb = 0): SoundEvent => {
    const found = kit.sounds[sound], lead = (found?.peakSeconds ?? 0) * fps.num / fps.den, start = peakFrame - lead, frame = Math.max(0, Math.floor(start));
    return { id: `${id}/${sound}`, laneId: ACCENT_LANE, frame, subframeOffset: start > 0 ? start - frame : 0,
      assetRef: found && request.accents!.kit + "/" + found.file, gainDb: (request.accents!.gainDb ?? -8) + (found?.gainDb ?? 0) + extraDb };
  };
  const TURN: Record<NonNullable<FilmStory["turnAccent"]>, readonly string[]> = { soft: ["ping"], impact: ["riser", "hit"], none: [] };
  const moment = (at: string) => { const [sceneId, cueId] = at.split("/"); return scenes.find(scene => scene.id === sceneId)?.cues.find(cue => cue.id === cueId)?.frame; };
  return [
    ...cut.transitions.filter(item => item.endFrame > item.startFrame).map(item => place(`accent/${item.toShotId}`, "whoosh", Math.floor((item.startFrame + item.endFrame) / 2))),
    ...scenes.flatMap(scene => scene.turnFrame === undefined ? [] : TURN[scene.story?.turnAccent ?? "soft"].map(sound => place(`accent/${scene.id}`, sound, scene.turnFrame!))),
    ...(request.cues ?? []).flatMap(cue => { const frame = moment(cue.at); return frame === undefined ? [] : [place(`cue/${cue.id}`, cue.sound, frame + (cue.offsetFrames ?? 0), cue.gainDb ?? 0)]; }),
  ];
}

/** Frames for an entrance that starts on a cue to settle, so a review frame shows the state it names. */
const CUE_SETTLE_FRAMES = 18;
/** The stills a reviewer needs: each settled cue, each finished beat, each scene end and each transition midpoint. */
function reviewFrames(scenes: readonly CompiledFilmScene[], cut: CompiledCutPlan): FilmReviewFrame[] {
  const inTransition = (frame: number) => cut.transitions.some(item => item.kind !== "cut" && frame >= item.startFrame && frame < item.endFrame);
  const frames: FilmReviewFrame[] = [];
  const add = (sceneId: string, frame: number, label: string) => {
    if (!frames.some(item => item.frame === frame)) frames.push({ frame, sceneId, label, transition: inTransition(frame) });
  };
  for (const scene of scenes) {
    if (scene.kind === "ray-world") {
      add(scene.id, scene.startFrame + Math.min(12, scene.endFrame - scene.startFrame - 1), "open");
      for (const title of scene.content.titles ?? []) add(scene.id, scene.startFrame + Math.min(title.startFrame + CUE_SETTLE_FRAMES, title.endFrame - 1), title.id);
      add(scene.id, scene.endFrame - 1, "end");
    } else if (scene.kind === "shot-3d" || scene.kind === "card" || scene.kind === "screen-demo") {
      add(scene.id, scene.startFrame + Math.min(12, scene.endFrame - scene.startFrame - 1), "open");
      scene.cues.filter(cue => cue.id !== "start").forEach(cue => add(scene.id, Math.min(cue.frame + CUE_SETTLE_FRAMES, scene.endFrame - 1), cue.id));
      add(scene.id, scene.endFrame - 1, "end");
    } else if (scene.kind === "object-story") for (const beat of scene.plan.spec.beats) add(scene.id, scene.startFrame + beat.endFrame - 1, beat.id);
    else {
      // The opening state is complete on the last frame before the first cue.
      add(scene.id, scene.cues[0].frame - 1, "open");
      scene.cues.forEach((cue, index) => add(scene.id, Math.min(cue.frame + CUE_SETTLE_FRAMES, (scene.cues[index + 1]?.frame ?? scene.endFrame) - 1), cue.id));
      add(scene.id, scene.endFrame - 1, "end");
    }
  }
  for (const item of cut.transitions) if (item.kind !== "cut" && item.endFrame > item.startFrame)
    add(item.toShotId, Math.floor((item.startFrame + item.endFrame) / 2), item.kind);
  return frames.sort((a, b) => a.frame - b.frame);
}

export function evaluateFilm(film: CompiledFilm, frame: number, options: CutEvaluationOptions = {}): CutFrame { return evaluateCutPlan(film.cut, frame, options); }
