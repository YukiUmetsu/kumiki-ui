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
import { CARD_ENTER, cardCues, inspectCard, readingSeconds, readingWords } from "./film-cards";
import { compileScreenDemo, inspectScreenDemoOutput } from "./screen-demo";
import { compileSpeed, speedOutput } from "./film-speed";
import type { CompiledSpeed, FilmSpeed } from "./film-speed";
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
import { compileSceneSounds, inspectSplitEdits } from "./film-split-edits";
import { compileMotionChart } from "./motion-chart";
import { compileAnnotate } from "./annotate";
import { compileDrawOn, inspectDrawOnOutput } from "./draw-on";
import { compileTitleSequence, inspectTitleOutput, titleCues } from "./title-sequence";
import type { TitlePlan, TitleSequenceContent } from "./title-sequence";
import type { DrawOnContent, DrawOnPlan } from "./draw-on";
import type { AnnotateContent, AnnotatePlan } from "./annotate";
import { compileChartMorph } from "./chart-morph";
import type { ChartMorphContent, ChartMorphPlan } from "./chart-morph";
import type { MotionChartContent, MotionChartPlan } from "./motion-chart";
import type { CompiledSceneSound, FilmSceneSound, FilmSplit } from "./film-split-edits";
import { dipFrames, DIP_FRAMES, dipHiddenFrames, inspectDip, inspectFade } from "./film-dip";
import { burstFrames, flashFrames, inspectBurst, inspectFlash, MAX_FLASHES_PER_SECOND, peakFlashesPerSecond } from "./film-flash";
import type { FilmBurst, FilmBurstInsert, FilmBurstSpec, FilmFlash, FilmFlashSpec } from "./film-flash";
import { inspectShapeWipe, SHAPE_WIPE_FRAMES } from "./film-shape-wipe";
import type { FilmShapeWipe, FilmShapeWipeSpec } from "./film-shape-wipe";
import type { CompiledFade, FilmDip, FilmDipSpec, FilmFade } from "./film-dip";

export type FilmOutput =
  | { id: string; preset: VideoPlatformPresetId }
  | { id: string; width: number; height: number };
/** Duration comes out of the incoming scene, so a film lasts the sum of its scenes. */
/** How a scene arrives. `audioLead` and `audioTail` split the edit: the incoming scene's sound starts early (a J-cut), or the outgoing
 * scene's carries over the cut (an L-cut). See `film-split-edits.ts`. */
export interface FilmTransition extends FilmSplit, Pick<FilmDipSpec, "holdFrames" | "text">, Pick<FilmFlashSpec, "frames" | "fadeFrames">, Partial<FilmBurstSpec>, Pick<FilmShapeWipeSpec, "shape"> {
  kind: "cut" | "dissolve" | "wipe" | "whip" | "match" | "container" | "pass-by" | "zoom" | "dip" | "flash" | "burst" | "shape";
  durationFrames?: number;
  /** `match`: a subject that both scenes hold. It travels from its old place to its new place while the scenes dissolve.
   * `shape`: a subject of the outgoing scene the shape grows from (its centre).
   * `container`: a subject of the outgoing scene (a tile, a row, a card) that grows into the incoming scene.
   * `zoom`: a subject of the outgoing scene (a screen, a window, a detail) that the camera pushes into; the incoming scene is inside it. */
  subject?: string;
  /** `container`: the surface's colour while it grows. `pass-by`: the foreground's colour. `dip`: the colour the picture dips through.
   * @default a raised surface of the film's appearance (container), a near-black (pass-by), black (dip) */
  color?: string;
  /** `pass-by`: how wide the foreground is, as a fraction of the frame's width. @default 0.42 */
  width?: number;
  /** `zoom`: `hard` keeps the incoming scene inside the region's box (a screen, a window, a frame); `soft` lets it bloom out of the
   * region through a feathered edge (light, water, a glow). @default "hard" */
  edge?: "hard" | "soft";
  /** `container`: the tile's corner radius, as a fraction of the frame's short side. It squares off as the surface fills the frame.
   * @default 0.016 */
  radius?: number;
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
export interface FilmColdOpen {
  /** The scene to flash forward to: usually the climax, in the last third of the film. */
  scene: string;
  /** The moment the flash-forward cuts away on: one of the scene's cues, or a content frame. */
  at: string | number;
  /** How long the flash-forward runs, ending on `at`. @default 3 s */
  frames?: number;
  /** The title that takes the viewer back: "Two days earlier." */
  title: string;
  /** @default its reading time, at least 1.6 s */
  titleFrames?: number;
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
  /** Characters performing over the scene, drawn by the host's `renderCast`. */
  cast?: readonly FilmCastMember[];
  /** Named subjects. Use the same ID in two scenes for the same thing. An object story adds its objects itself. */
  subjects?: Readonly<Record<string, FilmSubject>>;
  /** This scene's look, merged over the film's: its preset wins, its moods add, its overrides merge. For a grade that changes
   * with the story (a colour script). */
  look?: FilmLookSpec;
  /** Up to two shader effects. Frames are relative to the scene. A `background` effect replaces the scene's canvas. */
  fx?: readonly ShaderFxSpec[];
  /** A speed ramp: the scene plays `source` frames of content in its `durationFrames`, fast, slowing to near-stillness on its `holds`,
   * and ramping into or out of cuts. The content, its moments and its checks are timed in `source` frames; moments land where the
   * ramp puts them. See `film-speed.ts`. */
  speed?: FilmSpeed;
  /** Play only a stretch of the scene's content: `frames` frames from content frame `from`. The content is still compiled, timed and
   * checked at its full `durationFrames`; the scene is `frames` long in the film. A cold open replays a scene's climax this way. */
  play?: { from: number; frames: number };
  /** This scene's own sound: a recorded ambience from the catalog that plays under it and follows it when the film is re-timed. Its
   * edges crossfade at the cut, unless the transitions split the edit. Needs `audio` on the film. */
  sound?: FilmSceneSound;
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
/** A guided motion chart: bubbles over time, and before each event a cue that says what to watch. See `motion-chart.ts`. */
export interface FilmMotionChartScene extends FilmSceneBase { recipeId: "motion-chart"; content: MotionChartContent }
/** A picture argued over: the camera stops on details and a pen marks them, each with a few words. See `annotate.ts`. */
export interface FilmAnnotateScene extends FilmSceneBase { recipeId: "annotate"; content: AnnotateContent }
/** Line art that draws itself, the pen on the end of the line. See `draw-on.ts`. */
export interface FilmDrawOnScene extends FilmSceneBase { recipeId: "draw-on"; content: DrawOnContent }
/** Real footage: a prepared clip, cover-fitted, under a slow push, with words over it if it needs them. Prepare the clip for the capture
 * browser as VP9 WebM with a keyframe on every frame (`ffmpeg -c:v libvpx-vp9 -g 1`), so each frame seeks exactly. */
export interface FilmFootageContent {
  video: { id: string; src: string; width: number; height: number; fps: number; frameCount: number; licenseRef?: string };
  /** What the footage shows, for a screen reader. */
  label: string;
  /** First source frame played. @default 0 */
  from?: number;
  /** Playback speed. @default 1 */
  rate?: number;
  /** The camera's slow push: the scale at the scene's start and end. @default [1, 1.06] */
  push?: readonly [number, number];
  /** The point kept in view when the frame crops the clip, as fractions. @default the centre */
  focus?: { x: number; y: number };
  /** Words over the footage, landing word by word at `at` and leaving at `until` (or the scene's end). */
  title?: { text: string; at: number; until?: number; place?: "top" | "middle" | "bottom"; size?: "large" | "huge"; emphasis?: string };
}
export interface FilmFootageScene extends FilmSceneBase { recipeId: "footage"; content: FilmFootageContent }
/** A scene the host draws by name, for work no recipe covers (a bespoke 3D set, a branded animation). The film times, cuts, casts and
 * mixes it like any other scene; FilmStage hands `slot` and `props` to its `renderSlot`. */
export interface FilmSlotContent { slot: string; label: string; props?: Readonly<Record<string, unknown>> }
export interface FilmSlotScene extends FilmSceneBase { recipeId: "slot"; content: FilmSlotContent }
/** A character that performs over a scene: drawn by the host's `renderCast`, which knows the character by name. */
export interface FilmCastMember {
  character: string;
  /** Where its feet stand, as fractions of the frame. */
  at: readonly [number, number];
  /** Its height, as a fraction of the frame's height. */
  height: number;
  /** Face the other way. */
  flip?: boolean;
  /** How it arrives: popped up where it stands, or slid in from a side or below. @default "pop" */
  enter?: "pop" | "left" | "right" | "bottom";
  /** The scene frames it arrives and leaves. @default 0, and it stays */
  enterAt?: number;
  leaveAt?: number;
  /** What it does, in scene frames: an action by name (wave, point, cheer…), an expression, or speech for `speak` frames. */
  cues?: ReadonlyArray<{ at: number; action?: string; expression?: string; speak?: number }>;
  /** Walking toward the camera from `from` to `to` (scene frames): the host plays its walk cycle, and FilmStage grows it from its
   * height to `grow` times it and moves its feet to `toAt`, so it comes out of the picture at the viewer. */
  walk?: { from: number; to: number; grow?: number; toAt?: readonly [number, number] };
  /** The scene's light on the character, so drawn art sits in a photograph or a 3D set: `color` (#rrggbb) multiplies it, as coloured
   * light does, and `edge` (#rrggbb) draws a thin rim of light on the `side` the scene's sun is on. @default side "left" */
  light?: { color?: string; edge?: string; side?: "left" | "right" };
  /** A soft contact shadow under its feet, 0 (none) to 1. Use it where the feet are in the picture. @default 0 */
  shadow?: number;
}
/** A film's opening built on one symbol in cut paper, with its title set into it. See `title-sequence.ts`. */
export interface FilmTitleSequenceScene extends FilmSceneBase { recipeId: "title-sequence"; content: TitleSequenceContent }
/** A chart morph: a chart that changes state in stages, one kind of change at a time. See `chart-morph.ts`. */
export interface FilmChartMorphScene extends FilmSceneBase { recipeId: "chart-morph"; content: ChartMorphContent }
export type FilmScene = FilmRecipeScene | FilmObjectStoryScene | FilmRayWorldScene | FilmShot3dScene | FilmCardScene | FilmScreenDemoScene | FilmMotionChartScene | FilmChartMorphScene | FilmAnnotateScene | FilmDrawOnScene | FilmTitleSequenceScene | FilmFootageScene | FilmSlotScene;
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
  /** Open on a few seconds of the film's own climax, then a title ("Two days earlier"), then the story from the start. Curiosity opened
   * before an answer improves memory of the answer (doc 32, §12): the flash-forward should raise a question, not answer it, so it ends
   * on its moment, and `cold-open-spoils` warns when it shows the scene's turn. */
  coldOpen?: FilmColdOpen;
  /** A film that loops, as Shorts and Reels replay on their own: its last `frames` (default 12) dissolve into its first frame, so the
   * replay starts on the picture it ends on, with no visible seam. */
  loop?: { frames?: number };
  /** The film opens up from a colour over `in` frames and goes down to it over its last `out` frames. See `film-dip.ts`. */
  fade?: FilmFade;
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
/** `transient`: the moment passes in a few frames, so the review samples the moment itself. */
export interface FilmCue { id: string; frame: number; transient?: boolean }
/** A subject that travels across a transition: from its last box, through a meeting box at the midpoint, to its new box. */
export interface FilmMatch { subject: string; from: Rect; via: Rect; to: Rect }
/** A tile of the outgoing scene that grows into the incoming one. `from` is its declared box; a scene that tags the element
 * (`data-km-film-subject`) has it measured on screen instead, so the surface starts exactly on the tile. */
export interface FilmContainer { subject: string; from?: Rect; color?: string; radius: number }
/** A region of the outgoing scene the camera pushes through, with the incoming scene inside it. Measured on screen like a container. */
export interface FilmZoom { subject: string; from?: Rect; edge: "hard" | "soft" }
/** A foreground that crosses the lens and hides the cut: the incoming scene is revealed along its centre. */
export interface FilmPassBy { direction: "left" | "right"; width: number; color?: string }
/** Pixel box of a subject at the first and the last frame of its scene. */
export interface FilmSubjectBox { start: Rect; end: Rect }
export type CompiledFilmScene = { id: string; startFrame: number; endFrame: number; cues: readonly FilmCue[];
  subjects: Readonly<Record<string, FilmSubjectBox>>; story?: FilmStory; turnFrame?: number; fx: readonly ShaderFxSpec[];
  /** The scene's resolved look, when the film or the scene sets one. */ look?: ResolvedLook;
  /** The scene's time map, when it has a speed ramp or plays a stretch: content frame for each output frame. */ speed?: CompiledSpeed;
  /** The length the content is timed in, when it differs from the map's last frame (a scene that plays a stretch). */ contentFrames?: number;
  /** Characters performing over the scene. */ cast?: readonly FilmCastMember[] } & (
  | { kind: "recipe"; recipeId: SceneRecipeId; spec: SceneTemplateSpec }
  | { kind: "object-story"; recipeId: "object-story"; plan: ObjectStoryPlan }
  | { kind: "ray-world"; recipeId: "ray-world"; content: FilmRayWorldContent }
  | { kind: "shot-3d"; recipeId: "shot-3d"; content: FilmShot3dContent; /** The moment a story's turn lands on by default. */ turnCue: string }
  | { kind: "card"; recipeId: "card"; content: FilmCardContent }
  | { kind: "screen-demo"; recipeId: "screen-demo"; plan: ScreenDemoPlan }
  | { kind: "motion-chart"; recipeId: "motion-chart"; plan: MotionChartPlan }
  | { kind: "chart-morph"; recipeId: "chart-morph"; plan: ChartMorphPlan }
  | { kind: "annotate"; recipeId: "annotate"; plan: AnnotatePlan }
  | { kind: "draw-on"; recipeId: "draw-on"; plan: DrawOnPlan }
  | { kind: "title-sequence"; recipeId: "title-sequence"; plan: TitlePlan }
  | { kind: "footage"; recipeId: "footage"; content: FilmFootageContent }
  | { kind: "slot"; recipeId: "slot"; content: FilmSlotContent });
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
  /** Container transforms, by incoming scene ID. */
  containers: Readonly<Record<string, FilmContainer>>;
  /** A loop: from `startFrame`, the first scene's opening frame dissolves in over the film's last `frames`. */
  loop?: { startFrame: number; frames: number };
  /** Zooms through a region into the next scene, by incoming scene ID. */
  zooms: Readonly<Record<string, FilmZoom>>;
  /** Whip pans, by incoming scene ID: the way the camera swings. */
  whips: Readonly<Record<string, { direction: "left" | "right" | "up" | "down" }>>;
  /** Pass-bys, by incoming scene ID. */
  passBys: Readonly<Record<string, FilmPassBy>>;
  /** Dips through a colour, by incoming scene ID. */
  dips: Readonly<Record<string, FilmDip>>;
  /** Flash cuts, by incoming scene ID. */
  flashes: Readonly<Record<string, FilmFlash>>;
  /** Flash bursts of inserts, by incoming scene ID. */
  bursts: Readonly<Record<string, FilmBurst>>;
  /** Shape wipes (an iris, a diamond, a star, the brand's mark), by incoming scene ID. */
  shapes: Readonly<Record<string, FilmShapeWipe>>;
  /** The film's fade up from a colour and down to one. */
  fade?: CompiledFade;
  /** Shader transitions, by incoming scene ID. */
  transitionFx: Readonly<Record<string, ShaderFxSpec>>;
  captions?: CaptionTrack;
  audio?: AudioCueSheet;
  /** Each scene's own sound, where it plays: its edges, fades, and any J- or L-cut. */
  sceneSounds: readonly CompiledSceneSound[];
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

const MATCH_FRAMES = 16, CONTAINER_FRAMES = 22, PASS_BY_FRAMES = 14, ZOOM_FRAMES = 36, WHIP_FRAMES = 10,
  /** Transitions the plan holds as dissolves and FilmStage draws, with their default lengths. */
  DRAWN_FRAMES = { match: MATCH_FRAMES, container: CONTAINER_FRAMES, "pass-by": PASS_BY_FRAMES, zoom: ZOOM_FRAMES, whip: WHIP_FRAMES, dip: DIP_FRAMES, flash: 6, burst: 8, shape: SHAPE_WIPE_FRAMES }, FLAT_ARC_SECONDS = 20, MAX_SCENE_FX = 2;
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

/** Subjects a scene tags where it draws them (`data-km-film-subject`), so a container or a zoom can measure them on screen: a list card's
 * rows, an annotated picture's marks and a drawing's strokes. */
function taggedSubjects(scene: FilmScene): string[] {
  if (scene.recipeId === "card" && scene.content.card === "list") return scene.content.items.map((_, i) => `item-${i + 1}`);
  if (scene.recipeId === "card" && scene.content.product) return ["product", ...scene.content.product.screen?.image ? ["screen"] : []];
  if (scene.recipeId === "annotate") return (scene.content as AnnotateContent).marks.map(mark => mark.id);
  if (scene.recipeId === "draw-on") return (scene.content as DrawOnContent).strokes.map(stroke => stroke.id);
  return [];
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
  if (doc.coldOpen && !diagnostics.length) return compileColdOpen(doc, options);
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
    (scene.cast ?? []).forEach((member, i) => {
      const at = `${path}/cast/${i}`, inside = (frame: number | undefined) => frame === undefined || (Number.isSafeInteger(frame) && frame >= 0 && frame < scene.durationFrames);
      if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,40}$/.test(member.character ?? "")) report("error", "film-cast", at + "/character", "A cast member names its character by a plain ID.");
      if (!(member.at?.length === 2 && member.at.every(v => v >= -.2 && v <= 1.2) && member.height > .05 && member.height <= 1.5)) report("error", "film-cast", at, "A cast member stands at a point near the frame, with a height of 0.05 to 1.5 of the frame.");
      if (!inside(member.enterAt) || !inside(member.leaveAt) || !(member.cues ?? []).every(cue => inside(cue.at))) report("error", "film-cast", at, "A cast member's arrival, exit and cues are frames of the scene.");
      const hexColor = (value: string | undefined) => value === undefined || /^#[0-9a-f]{6}$/i.test(value);
      if (!hexColor(member.light?.color) || !hexColor(member.light?.edge) || (member.shadow !== undefined && !(member.shadow >= 0 && member.shadow <= 1))) report("error", "film-cast", at, "A cast member's light colours are #rrggbb, and its shadow is 0 to 1.");
    });
    return { subjects: boxes, story: scene.story, fx: scene.fx ?? [], look: sceneLook(scene, path), ...scene.cast?.length ? { cast: scene.cast } : {} };
  };
  let startFrame = 0;
  doc.scenes.forEach((authored, index) => {
    const path = "/scenes/" + index;
    // A speed ramp plays `source` frames of content in the scene's own length: the content is compiled and checked at its own length.
    const scene = (authored?.speed ? { ...authored, durationFrames: authored.speed.source } : authored) as FilmScene;
    if (seen.has(scene?.id)) report("error", "film-duplicate-scene", path + "/id", `Scene ID "${scene.id}" is used twice.`, "Give each scene its own ID.");
    seen.add(scene?.id);
    if (index === 0 && scene?.transition) report("error", "film-first-transition", path + "/transition", "The first scene has no scene to transition from.", 'Remove "transition" from this scene.');
    if (authored.play) {
      const { from, frames } = authored.play;
      if (!(Number.isSafeInteger(from) && Number.isSafeInteger(frames) && from >= 0 && frames > 0 && from + frames <= authored.durationFrames))
        report("error", "film-play-range", path + "/play", `The stretch ${from}–${from + frames} is not inside the scene's ${authored.durationFrames} frames.`);
      if (authored.speed) report("error", "film-play-speed", path + "/play", "A scene plays a stretch or ramps its speed, not both.");
    }
    if (hasProblem(path)) return;
    const endFrame = startFrame + (authored.play?.frames ?? authored.durationFrames);
    // Two effects in each scene means at most four WebGL contexts during a transition.
    if ((scene.fx?.length ?? 0) > MAX_SCENE_FX) report("error", "shader-fx-budget", path + "/fx", `A scene takes at most ${MAX_SCENE_FX} effects.`, "Pick the effect that teaches something. An effect should not fill an empty shot.");
    for (const [fxIndex, fx] of (scene.fx ?? []).entries()) {
      for (const { path: at, code, message, hint } of inspectShaderFx(fx, authored.durationFrames)) report("error", code, `${path}/fx/${fxIndex}${at}`, message, hint);
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
    } else if (scene.recipeId === "motion-chart") {
      const content = scene.content as MotionChartContent, at = path + "/content";
      const { plan, problems } = compileMotionChart(content, scene.durationFrames, doc.fps.num / doc.fps.den);
      for (const item of problems) report(item.severity, item.code, at + item.path, item.message, item.hint);
      // Moments: each event's cue, the change itself, and its note, so sound and review land on them.
      if (plan && !hasProblem(path)) compiled.push({ kind: "motion-chart", recipeId: "motion-chart", id: scene.id, startFrame, endFrame, plan,
        cues: [{ id: "start", frame: startFrame }, ...plan.segments.filter(item => item.event && item.kind !== "play").map(item => ({ id: item.kind === "cue" ? item.event + "-cue" : item.kind === "event" ? item.event! : item.event + "-note", frame: startFrame + Math.round(item.start) }))], ...placed(scene, {}, path) });
    } else if (scene.recipeId === "annotate") {
      const content = scene.content as AnnotateContent, at = path + "/content";
      const { plan, problems } = compileAnnotate(content, scene.durationFrames, doc.fps.num / doc.fps.den);
      for (const item of problems) report(item.severity, item.code, at + item.path, item.message, item.hint);
      // Moments: each mark, as the pen starts.
      if (plan && !hasProblem(path)) compiled.push({ kind: "annotate", recipeId: "annotate", id: scene.id, startFrame, endFrame, plan,
        cues: [{ id: "start", frame: startFrame }, ...plan.marks.map(mark => ({ id: mark.id, frame: startFrame + mark.at }))], ...placed(scene, {}, path) });
    } else if (scene.recipeId === "slot") {
      const content = scene.content as FilmSlotContent, at = path + "/content";
      if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,60}$/.test(content?.slot ?? "")) report("error", "slot-name", at + "/slot", "A slot scene names what the host draws, by a plain ID.");
      if (!content?.label?.trim()) report("error", "slot-label", at + "/label", "A slot scene needs a label: what it shows, for a screen reader.");
      if (!hasProblem(path)) compiled.push({ kind: "slot", recipeId: "slot", id: scene.id, startFrame, endFrame, content, cues: [{ id: "start", frame: startFrame }], ...placed(scene, {}, path) });
    } else if (scene.recipeId === "footage") {
      const content = scene.content as FilmFootageContent, at = path + "/content", v = content.video, fps = doc.fps.num / doc.fps.den;
      if (!(v?.src && v.width > 0 && v.height > 0 && v.fps > 0 && Number.isSafeInteger(v.frameCount) && v.frameCount > 0) || !/^[A-Za-z0-9][A-Za-z0-9-]{0,60}$/.test(v?.id ?? ""))
        report("error", "footage-video", at + "/video", "Footage needs its clip: an ID, a source, its width, height, frame rate and frame count.");
      else {
        if (!v.licenseRef) report("warning", "footage-licence", at + "/video/licenseRef", "The footage names no rights record.", "Set `licenseRef` to its entry in the asset manifest.");
        const rate = content.rate ?? 1, needs = (content.from ?? 0) + rate * scene.durationFrames * v.fps / fps;
        if (!(rate > 0 && rate <= 8)) report("error", "footage-rate", at + "/rate", "Footage plays forwards, at up to eight times its speed.");
        else if (needs > v.frameCount + 1) report("warning", "footage-runs-out", at, `The clip runs out ${((needs - v.frameCount) / v.fps).toFixed(1)} s before the scene ends; its last frame holds.`, "Shorten the scene, start earlier, or slow it.");
        const push = content.push ?? [1, 1.06];
        if (!(push[0] >= 1 && push[1] >= 1 && push[0] <= 2 && push[1] <= 2)) report("error", "footage-push", at + "/push", "The push scales the footage from 1 to 2; below 1 the frame would show its edges.");
        const title = content.title;
        if (title) {
          if (!(Number.isSafeInteger(title.at) && title.at >= 0 && title.at < scene.durationFrames)) report("error", "footage-title", at + "/title/at", "The words arrive inside the scene.");
          else if (((title.until ?? scene.durationFrames) - title.at) / fps < readingSeconds(title.text)) report("warning", "footage-title-short", at + "/title", `"${title.text}" is on screen for less than its reading time.`, `Give it ${readingSeconds(title.text).toFixed(1)} s.`);
          if (readingWords(title.text) > 7) report("warning", "footage-title-long", at + "/title/text", "Over seven words: footage carries a line, not a paragraph.");
        }
      }
      if (!hasProblem(path)) compiled.push({ kind: "footage", recipeId: "footage", id: scene.id, startFrame, endFrame, content,
        cues: [{ id: "start", frame: startFrame }, ...content.title ? [{ id: "title", frame: startFrame + content.title.at }] : []], ...placed(scene, {}, path) });
    } else if (scene.recipeId === "title-sequence") {
      const content = scene.content as TitleSequenceContent, at = path + "/content";
      const { plan, problems } = compileTitleSequence(content, scene.durationFrames, doc.fps.num / doc.fps.den);
      const safe = size.preset ? videoPlatformPreset(size.preset).safeInset : undefined;
      for (const item of [...problems, ...plan ? inspectTitleOutput(content, size.width, size.height, safe) : []]) report(item.severity, item.code, at + item.path, item.message, item.hint);
      // Moments: the symbol whole, the title, and each credit.
      if (plan && !hasProblem(path)) compiled.push({ kind: "title-sequence", recipeId: "title-sequence", id: scene.id, startFrame, endFrame, plan,
        cues: [{ id: "start", frame: startFrame }, ...titleCues(plan).map(cue => ({ id: cue.id, frame: startFrame + cue.frame }))], ...placed(scene, {}, path) });
    } else if (scene.recipeId === "draw-on") {
      const content = scene.content as DrawOnContent, at = path + "/content";
      const { plan, problems } = compileDrawOn(content, scene.durationFrames, doc.fps.num / doc.fps.den);
      const safe = size.preset ? videoPlatformPreset(size.preset).safeInset : undefined;
      for (const item of [...problems, ...plan ? inspectDrawOnOutput(content, size.width, size.height, safe) : []]) report(item.severity, item.code, at + item.path, item.message, item.hint);
      // Moments: each stroke, as the pen touches down, so a pen sound or a beat can land on it.
      if (plan && !hasProblem(path)) compiled.push({ kind: "draw-on", recipeId: "draw-on", id: scene.id, startFrame, endFrame, plan,
        cues: [{ id: "start", frame: startFrame }, ...plan.strokes.map(stroke => ({ id: stroke.id, frame: startFrame + stroke.at }))], ...placed(scene, {}, path) });
    } else if (scene.recipeId === "chart-morph") {
      const content = scene.content as ChartMorphContent, at = path + "/content";
      const { plan, problems } = compileChartMorph(content, scene.durationFrames, doc.fps.num / doc.fps.den);
      for (const item of problems) report(item.severity, item.code, at + item.path, item.message, item.hint);
      // Moments: each state, as its first change begins.
      if (plan && !hasProblem(path)) compiled.push({ kind: "chart-morph", recipeId: "chart-morph", id: scene.id, startFrame, endFrame, plan,
        cues: [{ id: "start", frame: startFrame }, ...content.states.slice(1).flatMap((state, k) => { const first = plan.stages.find(item => item.to === k + 1 && item.change !== "hold"); return first ? [{ id: state.id, frame: startFrame + Math.round(first.start) }] : []; })], ...placed(scene, {}, path) });
    } else if (scene.recipeId === "shot-3d") {
      const content = scene.content as FilmShot3dContent, at = path + "/content";
      for (const item of inspectShot3d(content, scene.durationFrames, doc.fps.num / doc.fps.den)) report(item.severity, item.code, at + item.path, item.message, item.hint);
      if (!hasProblem(path)) compiled.push({ kind: "shot-3d", recipeId: "shot-3d", id: scene.id, startFrame, endFrame, content, turnCue: shot3dTurnCue(content),
        cues: [{ id: "start", frame: startFrame }, ...shot3dCues(content, scene.durationFrames, doc.fps.num / doc.fps.den).map(cue => ({ id: cue.id, frame: startFrame + cue.frame, ...cue.transient ? { transient: true } : {} }))], ...placed(scene, {}, path) });
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
    const done = compiled[compiled.length - 1];
    if (authored.speed && done?.id === authored.id) {
      const local = (frame: number) => frame - startFrame;
      const { speed, problems } = compileSpeed(authored.speed, authored.durationFrames, doc.fps.num / doc.fps.den, id => { const cue = done.cues.find(item => item.id === id); return cue && local(cue.frame); });
      for (const item of problems) report(item.severity, item.code, path + "/speed" + item.path, item.message, item.hint);
      if (speed) {
        done.speed = speed;
        done.cues = done.cues.map(cue => ({ ...cue, frame: startFrame + speedOutput(speed, local(cue.frame)) }));
        // Text in a ramped shot is read in film time: after the ramp, it must still be on screen long enough.
        if (done.kind === "shot-3d") for (const cue of done.cues) {
          const beat = (done.content.spec as Record<string, unknown>)[cue.id] as { text?: string; sub?: string; exit?: number } | undefined;
          if (!beat?.text) continue;
          const words = `${beat.text} ${beat.sub ?? ""}`.split(/\s+/).filter(Boolean).length, need = words / 3 + .8;
          const until = beat.exit !== undefined ? startFrame + speedOutput(speed, beat.exit) : endFrame, seen = (until - cue.frame) / (doc.fps.num / doc.fps.den);
          if (seen < need) report("warning", "speed-text-short", path + "/speed", `After the ramp, "${beat.text}" is on screen for ${seen.toFixed(1)} s; it needs about ${need.toFixed(1)} s.`, "Hold on it, give the scene more frames, or move the text to a slower scene.");
        }
        if ((done.kind === "card" || done.kind === "screen-demo" || done.kind === "motion-chart" || done.kind === "chart-morph" || done.kind === "annotate" || done.kind === "draw-on" || done.kind === "title-sequence") && speed.rate > 1.3)
          report("warning", "speed-on-text", path + "/speed", `Words and interfaces play at ${speed.rate.toFixed(1)}× here, faster than they can be read.`, "Ramp a 3D shot or a scene of motion instead, or hold the text.");
      }
    }
    // A stretch is a time map too: content frame `from + n` at the scene's frame n. Cues outside the stretch are not in the film.
    if (authored.play && done?.id === authored.id) {
      const { from, frames } = authored.play;
      done.speed = { map: Array.from({ length: frames + 1 }, (_, n) => from + n), rate: 1, holds: [] };
      done.contentFrames = authored.durationFrames;
      done.cues = done.cues.flatMap(cue => { const local = cue.frame - startFrame; return cue.id === "start" ? [cue] : local >= from && local < from + frames ? [{ ...cue, frame: startFrame + local - from }] : []; });
    }
    startFrame = endFrame;
  });
  const durationFrames = startFrame;
  const fps = doc.fps;
  // A loop: the end dissolves into the opening, so an automatic replay has no seam. It suits short films that replay, and fights an
  // ending that asks the viewer to do something.
  let loop: CompiledFilm["loop"];
  if (doc.loop && compiled.length === doc.scenes.length) {
    const frames = doc.loop.frames ?? 12, last = compiled[compiled.length - 1], rate = doc.fps.num / doc.fps.den, final = doc.scenes[doc.scenes.length - 1];
    if (!(Number.isSafeInteger(frames) && frames >= 6 && frames <= 45)) report("error", "film-loop-frames", "/loop/frames", "A loop dissolves over 6 to 45 frames.", "Under 6 it is a flash; over 45 the ending is lost in the opening.");
    else if (frames >= last.endFrame - last.startFrame) report("error", "film-loop-frames", "/loop/frames", "The loop is longer than the last scene.");
    else loop = { startFrame: durationFrames - frames, frames };
    if (durationFrames / rate > 60) report("warning", "film-loop-long", "/loop", `A ${Math.round(durationFrames / rate)} s film rarely replays on its own; loops are for short films.`, "Give a long film its own ending.");
    if (final.recipeId === "card" && (final.content as FilmCardContent).card === "end") report("warning", "film-loop-end-card", "/loop", "The loop dissolves the end card, and its call to action, into the opening.", "Put the call to action earlier, or leave the loop out.");
  }
  const matches: Record<string, FilmMatch> = {}, containers: Record<string, FilmContainer> = {}, passBys: Record<string, FilmPassBy> = {}, zooms: Record<string, FilmZoom> = {};
  // A pass-by is a camera passing close behind something: a column, a wall, a passer-by. The foreground must be wide enough to hide
  // the seam and quick enough to read as passing; the scenes on either side should move the same way for the take to look continuous.
  doc.scenes.forEach((scene, index) => {
    if (index === 0 || scene.transition?.kind !== "pass-by") return;
    const { direction = "left", width = .42, durationFrames = PASS_BY_FRAMES, color } = scene.transition, path = `/scenes/${index}/transition`, rate = doc.fps.num / doc.fps.den;
    if (direction !== "left" && direction !== "right") report("error", "film-pass-by-direction", path + "/direction", "A pass-by crosses the frame sideways: \"left\" or \"right\".");
    if (!(width >= .2 && width <= .8)) report("error", "film-pass-by-width", path + "/width", "A pass-by's foreground covers 0.2 to 0.8 of the frame's width.", "Narrower, and the eye catches the seam beside it; wider, and it is a wipe to black.");
    if (durationFrames < rate * .25 || durationFrames > rate * .9) report("warning", "film-pass-by-timing", path + "/durationFrames", `A ${(durationFrames / rate).toFixed(2)} s pass-by ${durationFrames < rate * .25 ? "flashes past too fast to read as something in front of the lens" : "is too slow: the viewer studies the foreground and sees the trick"}.`, "Use 0.3 to 0.8 s (9 to 24 frames at 30 fps).");
    passBys[scene.id] = { direction: direction as FilmPassBy["direction"], width, color };
  });
  // A transition that covers the start of the incoming scene (a dip's colour, a burst's inserts) runs that scene's clock underneath it. A
  // moment there, or a thesis that lands there, is never seen.
  const hiddenStart = (index: number, hidden: number, code: string, what: string) => {
    const scene = doc.scenes[index], incoming = compiled[index];
    if (!incoming) return;
    const covered = incoming.cues.filter(cue => cue.id !== "start" && cue.frame < incoming.startFrame + hidden).map(cue => cue.id);
    const content = scene.recipeId === "annotate" ? scene.content as AnnotateContent : undefined;
    if (content?.title && (content.titleAt ?? 6) < hidden) covered.unshift("title");
    if (covered.length) report("warning", code, `/scenes/${index}/transition`, `The ${what} covers the first ${hidden} frames of "${scene.id}", where ${covered.map(id => `"${id}"`).join(", ")} ${covered.length > 1 ? "land" : "lands"}.`,
      content?.title ? `Set the scene's titleAt to ${hidden + 6} or later, and start its first mark after that.` : `Start that moment after the ${what}.`);
  };
  // A dip goes down to a colour, holds, and comes up on the next scene; its default length follows its hold and its line.
  const dips: Record<string, FilmDip> = {}, flashes: Record<string, FilmFlash> = {}, bursts: Record<string, FilmBurst> = {};
  const rate = doc.fps.num / doc.fps.den;
  doc.scenes.forEach((scene, index) => {
    const transition = scene.transition, path = `/scenes/${index}/transition`;
    if (index === 0 || !transition) return;
    if (transition.kind === "dip") {
      const frames = transition.durationFrames ?? dipFrames(transition, rate);
      const { dip, problems } = inspectDip(transition, frames, rate, path);
      for (const item of problems) report(item.severity, item.code, item.path, item.message, item.hint);
      if (dip) { dips[scene.id] = dip; hiddenStart(index, dipHiddenFrames(dip, frames), "dip-hides-start", "dip"); }
    }
    // A flash and a burst take their length from what they show, so a length of their own can only disagree with it.
    if ((transition.kind === "flash" || transition.kind === "burst") && transition.durationFrames !== undefined)
      report("error", "flash-duration", path + "/durationFrames", `A ${transition.kind} takes its length from its ${transition.kind === "flash" ? "frames and fadeFrames" : "inserts and framesEach"}.`, "Leave durationFrames out.");
    if (transition.kind === "flash") {
      const { flash, problems } = inspectFlash(transition, path);
      for (const item of problems) report(item.severity, item.code, item.path, item.message, item.hint);
      if (flash) flashes[scene.id] = flash;
    }
    if (transition.kind === "burst") {
      const resolve = (sceneId: string, at: number | string | undefined): number | string => {
        const target = compiled.find(item => item.id === sceneId);
        if (!target) return `"${sceneId}" is not a scene of this film.`;
        if (at === undefined) return Math.floor((target.endFrame - target.startFrame) / 2);
        if (typeof at === "number") return at >= 0 && at < target.endFrame - target.startFrame ? at : `Frame ${at} is not inside "${sceneId}".`;
        const cue = target.cues.find(item => item.id === at);
        return cue ? cue.frame - target.startFrame : `"${at}" is not a moment of "${sceneId}".`;
      };
      const { burst, problems } = inspectBurst({ inserts: transition.inserts ?? [], framesEach: transition.framesEach }, rate, path, resolve);
      for (const item of problems) report(item.severity, item.code, item.path, item.message, item.hint);
      if (burst) { bursts[scene.id] = burst; hiddenStart(index, burstFrames({ inserts: transition.inserts ?? [], framesEach: transition.framesEach }), "burst-hides-start", "burst"); }
    }
  });
  // A shape wipe opens the next scene through a growing shape, from the centre of a subject of the scene before.
  const shapes: Record<string, FilmShapeWipe> = {};
  doc.scenes.forEach((scene, index) => {
    const transition = scene.transition;
    if (index === 0 || transition?.kind !== "shape") return;
    const before = compiled[index - 1], box = transition.subject ? before?.subjects[transition.subject]?.end : undefined;
    const origin = transition.subject ? (box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : before ? "unknown" as const : undefined) : undefined;
    const { wipe, problems } = inspectShapeWipe(transition, transition.durationFrames ?? SHAPE_WIPE_FRAMES, rate, `/scenes/${index}/transition`, size, origin, doc.brand?.mark?.src);
    for (const item of problems) report(item.severity, item.code, item.path, item.message, item.hint);
    if (wipe) shapes[scene.id] = wipe;
  });
  // Flash cuts and card flips are changes in light the compiler can count: at most three flashes (six changes) in any second.
  const changes = [
    ...Object.entries(flashes).flatMap(([id, flash]) => { const start = compiled.find(item => item.id === id)?.startFrame ?? 0; return [start, start + flash.frames + Math.ceil(flash.fade / 2)]; }),
    ...doc.scenes.flatMap((scene, index) => scene.recipeId === "card" ? ((scene.content as FilmCardContent).flips ?? []).map(at => (compiled[index]?.startFrame ?? 0) + at) : []),
  ];
  const peak = peakFlashesPerSecond(changes, rate);
  if (peak > MAX_FLASHES_PER_SECOND) report("error", "flash-rate", "/scenes", `The film flashes ${peak} times within one second.`, `At most ${MAX_FLASHES_PER_SECOND} flashes a second, for viewers with photosensitive epilepsy (WCAG 2.3.1). Space the flash cuts and flips out.`);
  const fade = doc.fade ? inspectFade(doc.fade, durationFrames, doc.fps.num / doc.fps.den, Boolean(doc.loop)) : undefined;
  for (const item of fade?.problems ?? []) report(item.severity, item.code, item.path, item.message, item.hint);
  if (compiled.length === doc.scenes.length) {
    checkStory(doc, compiled, durationFrames, report);
    checkPacing(doc, report);
    if (doc.brand) checkAd(doc, compiled, durationFrames, size, report);
    doc.scenes.forEach((scene, index) => {
      if (index === 0) return;
      const from = compiled[index - 1].subjects, to = compiled[index].subjects, path = `/scenes/${index}/transition`;
      const shared = Object.keys(from).filter(id => id in to);
      if (scene.transition?.kind === "container") {
        const { subject, durationFrames = CONTAINER_FRAMES, radius = .016, color } = scene.transition, before = doc.scenes[index - 1];
        const rows = taggedSubjects(before);
        if (!subject || !(from[subject] || rows.includes(subject))) {
          const known = [...Object.keys(from), ...rows];
          report("error", "film-container-subject", path + "/subject", subject ? `"${subject}" is not a subject of the scene before.` : "A container transform needs the subject that grows: a tile, a row or a card of the scene before.",
            known.length ? `Subjects there: ${known.join(", ")}.` : "Declare the tile in that scene's `subjects`.");
          return;
        }
        const box = from[subject]?.end;
        if (box && box.width * box.height > size.width * size.height * .5) report("warning", "film-container-large", path + "/subject", `"${subject}" already covers half the frame, so there is little to grow.`, "Use a dissolve, or a smaller tile.");
        if (box && Math.min(box.width, box.height) < Math.min(size.width, size.height) * .03) report("warning", "film-container-small", path + "/subject", `"${subject}" is too small to see as the thing that opens.`);
        // Container transforms in interface motion run 300–500 ms; a film can afford a little more, not a slow zoom.
        const rate = doc.fps.num / doc.fps.den;
        if (durationFrames < rate * .4 || durationFrames > rate * 1.2) report("warning", "film-container-timing", path + "/durationFrames", `A ${(durationFrames / rate).toFixed(2)} s container transform ${durationFrames < rate * .4 ? "is a jump: the eye cannot follow the tile" : "drags: it reads as a slow zoom"}.`, "Use 0.5 to 1 s (15 to 30 frames at 30 fps).");
        if (!(radius >= 0 && radius <= .1)) report("error", "film-container-radius", path + "/radius", "A radius runs from 0 to 0.1 of the frame's short side.");
        containers[scene.id] = { subject, from: box, color, radius };
        return;
      }
      if (scene.transition?.kind === "zoom") {
        const { subject, durationFrames = ZOOM_FRAMES } = scene.transition, tagged = taggedSubjects(doc.scenes[index - 1]), rate = doc.fps.num / doc.fps.den;
        if (!subject || !(from[subject] || tagged.includes(subject))) {
          const known = [...Object.keys(from), ...tagged];
          report("error", "film-zoom-subject", path + "/subject", subject ? `"${subject}" is not a subject of the scene before.` : "A zoom needs the region the camera pushes into: a screen, a window or a detail of the scene before.",
            known.length ? `Subjects there: ${known.join(", ")}.` : "Declare the region in that scene's `subjects`.");
          return;
        }
        // Pushing through a region reads as one continuous move when it is quick enough to feel like travel and slow enough to follow.
        if (durationFrames < rate * .6 || durationFrames > rate * 2.5) report("warning", "film-zoom-timing", path + "/durationFrames", `A ${(durationFrames / rate).toFixed(2)} s zoom ${durationFrames < rate * .6 ? "is a jump cut with a blur" : "is a slow crawl; the viewer waits for the next scene"}.`, "Use 0.8 to 2 s.");
        const box = from[subject]?.end;
        if (box && Math.max(size.width / box.width, size.height / box.height) > 8) report("warning", "film-zoom-deep", path + "/subject", `"${subject}" is magnified ${Math.max(size.width / box.width, size.height / box.height).toFixed(0)}× on the way in; a picture softens long before it fills the frame.`, "Use a larger region, or a scene drawn in vectors.");
        zooms[scene.id] = { subject, from: box, edge: scene.transition.edge === "soft" ? "soft" : "hard" };
        return;
      }
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
    shots: doc.scenes.map(scene => ({ id: scene.id, sceneId: scene.id, durationFrames: scene.play?.frames ?? scene.durationFrames, subjectIds: [],
      camera: { start: { center: { x: size.width / 2, y: size.height / 2 }, zoom: 1 } } })),
    // A match is drawn as a dissolve. FilmStage moves both scenes so that the subject stays in one place.
    // A container transform is a dissolve too: FilmStage grows the incoming scene out of the tile. Reduced motion keeps the dissolve.
    // A pass-by is a dissolve in the plan too, and FilmStage draws it; reduced motion keeps the dissolve.
    transitions: doc.scenes.slice(1).map(({ transition }) => transition && hasKey(DRAWN_FRAMES, transition.kind)
      ? { kind: "dissolve" as const, durationFrames: transition.durationFrames ?? (transition.kind === "dip" ? dipFrames(transition, doc.fps.num / doc.fps.den) : transition.kind === "flash" ? flashFrames(transition) : transition.kind === "burst" ? burstFrames({ inserts: transition.inserts ?? [], framesEach: transition.framesEach }) : DRAWN_FRAMES[transition.kind as keyof typeof DRAWN_FRAMES]) }
      : { durationFrames: transition?.durationFrames ?? 0, axis: transition?.axis, direction: transition?.direction, reducedMotion: transition?.reducedMotion, kind: (transition?.kind ?? "cut") as Exclude<FilmTransition["kind"], keyof typeof DRAWN_FRAMES> }),
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
  const accents = doc.audio?.accents && options.accentKit && cutResult?.ok ? deriveAccents(compiled, cutResult.plan, fps, options.accentKit, doc.audio, new Set([...Object.keys(dips), ...Object.keys(flashes), ...Object.keys(bursts)])) : [];
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
  for (const item of inspectSplitEdits(doc.scenes, fps.num / fps.den, index => `/scenes/${index}`)) report(item.severity, item.code, item.path, item.message, item.hint);
  if (!doc.audio && doc.scenes.some(scene => scene.sound)) report("error", "scene-sound-no-audio", "/audio", "Scenes have sounds, and the film has no audio.", 'Add "audio": { "lanes": [], "licenseRef": "kumiki-sound-catalog" }.');
  const sceneSounds = cutResult?.ok ? compileSceneSounds(doc.scenes, cutResult.plan.transitions, fps.num / fps.den, durationFrames) : [];
  const seconds = (frames: number) => Number((frames * fps.den / fps.num).toFixed(3));
  // A period or lo-fi look muffles beds that set no filter of their own.
  const filmLowpass = doc.look ? resolveLook(doc.look).sound.lowpassHz : undefined;
  const audio: AudioCueSheet | undefined = doc.audio && { id: doc.id + "-audio", fps, durationFrames, links: doc.audio.links,
    lanes: [...doc.audio.lanes, ...(doc.audio.beds ?? []).map(bed => ({ id: "bed-" + bed.id, kind: "ambience" as const, startFrame: bed.startFrame ?? 0, assetRef: `catalog:${bed.sound}:${bed.durationFrames ?? durationFrames - (bed.startFrame ?? 0)}:${bed.fadeSeconds ?? 1.5}:${bed.lowpassHz ?? filmLowpass ?? 0}:${bed.reverse ? 1 : 0}`, gainDb: bed.gainDb })),
      ...sceneSounds.map(item => ({ id: "scene-" + item.sceneId, kind: "ambience" as const, startFrame: item.startFrame, gainDb: item.gainDb,
        assetRef: `catalog:${item.sound}:${item.endFrame - item.startFrame}:${seconds(item.fadeInFrames)}:${item.lowpassHz ?? filmLowpass ?? 0}:${item.reverse ? 1 : 0}:${seconds(item.fadeOutFrames)}` })),
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
    assets: [...doc.brand?.mark ? [{ id: "brand/" + doc.brand.mark.id, kind: "image" as const, url: doc.brand.mark.src, licenseRef: doc.brand.mark.licenseRef }] : [],
      ...doc.scenes.flatMap(scene => (scene.transition?.kind === "burst" ? scene.transition.inserts ?? [] : [] as readonly FilmBurstInsert[]).flatMap((insert: FilmBurstInsert) => "image" in insert ? [{ id: `${scene.id}/burst/${insert.image.id}`, kind: "image" as const, url: insert.image.src, licenseRef: insert.image.licenseRef }] : [])), ...compiled.flatMap((scene, index) => [...scene.kind === "recipe" ? compileSceneTemplate(scene.spec).assets : scene.kind === "ray-world" ? scene.content.images ?? [] : scene.kind === "screen-demo" && scene.plan.content.source.kind === "images" ? scene.plan.content.source.states.map(state => state.image) : [], ...[...scene.fx, ...doc.scenes[index].transition?.fx ? [doc.scenes[index].transition!.fx!] : []].flatMap(shaderFxAssets)].map(asset => ({
      id: scene.id + "/" + asset.id, kind: "image" as const, url: asset.src, licenseRef: asset.licenseRef })))],
  };
  return { ok: true, diagnostics, film: {
    id: doc.id, fps, outputId: output.id, appearance: doc.appearance ?? "dark", drift: Math.min(.1, Math.max(0, doc.drift ?? 0)), width: size.width, height: size.height, durationFrames, scenes: compiled, cut: plan, matches, containers, zooms, loop, dips, flashes, bursts, shapes, fade: fade?.fade, whips: Object.fromEntries(doc.scenes.flatMap(scene => scene.transition?.kind === "whip" ? [[scene.id, { direction: scene.transition.direction ?? "left" }]] : [])), passBys, captions, audio, sceneSounds, manifest,
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
/** A whoosh that peaks at the middle of each transition that moves (a dip through a colour is quiet), and on each turn the sound that its story asks for. A sound
 * that the kit does not have gets no `assetRef`, and the compiler reports it. */
function deriveAccents(scenes: readonly CompiledFilmScene[], cut: CompiledCutPlan, fps: RationalFps, kit: FilmAccentKit, request: FilmAudio, quiet: ReadonlySet<string>): SoundEvent[] {
  const place = (id: string, sound: string, peakFrame: number, extraDb = 0): SoundEvent => {
    const found = kit.sounds[sound], lead = (found?.peakSeconds ?? 0) * fps.num / fps.den, start = peakFrame - lead, frame = Math.max(0, Math.floor(start));
    return { id: `${id}/${sound}`, laneId: ACCENT_LANE, frame, subframeOffset: start > 0 ? start - frame : 0,
      assetRef: found && request.accents!.kit + "/" + found.file, gainDb: (request.accents!.gainDb ?? -8) + (found?.gainDb ?? 0) + extraDb };
  };
  const TURN: Record<NonNullable<FilmStory["turnAccent"]>, readonly string[]> = { soft: ["ping"], impact: ["riser", "hit"], none: [] };
  const moment = (at: string) => { const [sceneId, cueId] = at.split("/"); return scenes.find(scene => scene.id === sceneId)?.cues.find(cue => cue.id === cueId)?.frame; };
  return [
    ...cut.transitions.filter(item => item.endFrame > item.startFrame && !quiet.has(item.toShotId)).map(item => place(`accent/${item.toShotId}`, "whoosh", Math.floor((item.startFrame + item.endFrame) / 2))),
    ...scenes.flatMap(scene => scene.turnFrame === undefined ? [] : TURN[scene.story?.turnAccent ?? "soft"].map(sound => place(`accent/${scene.id}`, sound, scene.turnFrame!))),
    ...(request.cues ?? []).flatMap(cue => { const frame = moment(cue.at); return frame === undefined ? [] : [place(`cue/${cue.id}`, cue.sound, frame + (cue.offsetFrames ?? 0), cue.gainDb ?? 0)]; }),
  ];
}

/** Frames for an entrance that starts on a cue to settle, so a review frame shows the state it names. */
const CUE_SETTLE_FRAMES = 18;
/** The stills a reviewer needs: each settled cue, each finished beat, each scene end and each transition midpoint. */
function reviewFrames(scenes: readonly CompiledFilmScene[], cut: CompiledCutPlan): FilmReviewFrame[] {
  /** A content frame of a scene, in the film's output frames: through its speed ramp, when it has one. */
  const out = (scene: CompiledFilmScene, content: number) => scene.startFrame + (scene.speed ? speedOutput(scene.speed, content) : content);
  const inTransition = (frame: number) => cut.transitions.some(item => item.kind !== "cut" && frame >= item.startFrame && frame < item.endFrame);
  const frames: FilmReviewFrame[] = [];
  const add = (sceneId: string, frame: number, label: string) => {
    if (!frames.some(item => item.frame === frame)) frames.push({ frame, sceneId, label, transition: inTransition(frame) });
  };
  for (const scene of scenes) {
    if (scene.kind === "ray-world") {
      add(scene.id, scene.startFrame + Math.min(12, scene.endFrame - scene.startFrame - 1), "open");
      for (const title of scene.content.titles ?? []) add(scene.id, out(scene, Math.min(title.startFrame + CUE_SETTLE_FRAMES, title.endFrame - 1)), title.id);
      add(scene.id, scene.endFrame - 1, "end");
    } else if (scene.kind === "shot-3d" || scene.kind === "card" || scene.kind === "screen-demo" || scene.kind === "motion-chart" || scene.kind === "chart-morph" || scene.kind === "annotate" || scene.kind === "draw-on" || scene.kind === "title-sequence" || scene.kind === "footage" || scene.kind === "slot") {
      add(scene.id, scene.startFrame + Math.min(12, scene.endFrame - scene.startFrame - 1), "open");
      scene.cues.filter(cue => cue.id !== "start").forEach(cue => add(scene.id, Math.min(cue.frame + (cue.transient ? 0 : CUE_SETTLE_FRAMES), scene.endFrame - 1), cue.id));
      add(scene.id, scene.endFrame - 1, "end");
    } else if (scene.kind === "object-story") for (const beat of scene.plan.spec.beats) add(scene.id, Math.min(scene.endFrame - 1, out(scene, beat.endFrame - 1)), beat.id);
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

/** Expands a cold open: a replay of the climax scene's stretch ending on its moment, then a title card, then the film. The moment is
 * resolved by compiling the film without the cold open first. */
function compileColdOpen(doc: FilmDocument, options: FilmCompileOptions): FilmCompilation {
  const open = doc.coldOpen!, fps = doc.fps.num / doc.fps.den, base = compileFilm({ ...doc, coldOpen: undefined }, options);
  if (!base.ok) return base;
  const issues: FilmDiagnostic[] = [], say = (severity: FilmDiagnostic["severity"], code: string, path: string, message: string, hint?: string) => issues.push({ severity, code, path, message, hint });
  const index = doc.scenes.findIndex(scene => scene.id === open.scene), target = doc.scenes[index], compiledTarget = base.film.scenes[index];
  if (!target) { say("error", "cold-open-scene", "/coldOpen/scene", `"${open.scene}" is not a scene.`, `Scenes: ${doc.scenes.map(scene => scene.id).join(", ")}.`); return { ok: false, diagnostics: [...base.diagnostics, ...issues] }; }
  if (target.speed || target.play) { say("error", "cold-open-ramped", "/coldOpen/scene", "A cold open replays a scene's content as it is; this scene ramps its speed or plays a stretch already."); return { ok: false, diagnostics: [...base.diagnostics, ...issues] }; }
  const cue = typeof open.at === "string" ? compiledTarget.cues.find(item => item.id === open.at) : undefined;
  if (typeof open.at === "string" && !cue) { say("error", "cold-open-moment", "/coldOpen/at", `"${open.at}" is not a moment of scene "${open.scene}".`, `Moments: ${compiledTarget.cues.map(item => item.id).join(", ")}.`); return { ok: false, diagnostics: [...base.diagnostics, ...issues] }; }
  const at = Math.min(target.durationFrames, Math.max(1, cue ? cue.frame - compiledTarget.startFrame : Number(open.at)));
  const frames = Math.min(at, Math.max(1, Math.round(open.frames ?? fps * 3))), from = at - frames;
  // The title card's own rule: time for it to land, then its reading time.
  const titleFrames = open.titleFrames ?? Math.ceil(Math.max(1.6, CARD_ENTER / fps + readingSeconds(open.title) + .2) * fps);
  // Craft: a flash-forward to the climax, short, raising a question rather than answering it.
  if (index === 0) say("warning", "cold-open-first", "/coldOpen/scene", "The cold open replays the first scene, so it flashes forward to nothing: pick the climax.");
  else if (index < doc.scenes.length / 2) say("warning", "cold-open-early", "/coldOpen/scene", "The cold open replays a scene from the first half; a flash-forward works from the climax, late in the film.");
  if (frames > fps * 6) say("warning", "cold-open-long", "/coldOpen/frames", `A ${(frames / fps).toFixed(1)} s cold open retells the climax instead of teasing it.`, "Keep it to a few seconds.");
  if (frames < fps * 1.5) say("warning", "cold-open-short", "/coldOpen/frames", "Under 1.5 s, the flash-forward is a flicker; the viewer cannot read what they saw.");
  const turn = compiledTarget.turnFrame !== undefined ? compiledTarget.turnFrame - compiledTarget.startFrame : undefined;
  if (turn !== undefined && turn >= from && turn < at) say("warning", "cold-open-spoils", "/coldOpen/at", "The cold open shows the scene's turn, so it gives the answer away instead of raising the question.", "End it on a moment just before the turn.");
  // The replay's job is to raise a question ("how did it come to this?"), which the climax closes when it plays in order. It carries
  // no other story: the scene's own questions and turn belong to it in order.
  const question = "cold-open";
  const replay = { ...target, id: `${target.id}-cold-open`, transition: undefined, story: { opens: [question] }, play: { from, frames } } as FilmScene;
  const title = { id: "cold-open-title", recipeId: "card", durationFrames: titleFrames, content: { card: "headline", text: open.title } } as unknown as FilmScene;
  const scenes = [replay, title, ...doc.scenes.map((scene, i) => i === index ? { ...scene, story: { ...scene.story, closes: [...scene.story?.closes ?? [], question] } } : scene)] as FilmScene[];
  const result = compileFilm({ ...doc, coldOpen: undefined, scenes }, options);
  // Paths in the expanded film point into its scenes; the author's scenes sit two places later.
  const diagnostics = [...issues, ...result.diagnostics.map(item => {
    const match = /^\/scenes\/(\d+)(.*)$/.exec(item.path);
    if (!match) return item;
    const i = Number(match[1]);
    return { ...item, path: i < 2 ? "/coldOpen" + match[2] : `/scenes/${i - 2}${match[2]}` };
  })];
  return result.ok ? { ...result, diagnostics } : { ok: false, diagnostics };
}
