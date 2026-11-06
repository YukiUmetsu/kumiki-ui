/** FD1: one JSON file that describes a whole film. It holds ordered scenes, the cuts between them, captions, audio
 * lanes and output sizes, and it compiles through the existing compilers: `compileSceneTemplate`,
 * `compileObjectStory`, `compileCutPlan`, `validateCaptionTrack` and `resolveAudioCues`.
 * It adds no clock, renderer or layout engine. A frame resolves from (compiled film, frame) only.
 * Types here are the source of `film-document.schema.json`. After a change, run `npm run film:schema`.
 */
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
  /** Place a whoosh on each transition, and a riser and a hit on each turn, from a kit folder next to the film file. */
  accents?: { kit: string; gainDb?: number };
  /** Rights reference that covers the whole mix. */
  licenseRef: string;
}
/** `kit.json` of an accent kit. `peakSeconds` is where the sound peaks, so the peak can land on its frame. */
export interface FilmAccentKit { sounds: Readonly<Record<"whoosh" | "riser" | "hit", { file: string; peakSeconds: number }>> }
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
/** A subject that travels across a transition: from its last box, through a meeting box at the midpoint, to its new box. */
export interface FilmMatch { subject: string; from: Rect; via: Rect; to: Rect }
/** Pixel box of a subject at the first and the last frame of its scene. */
export interface FilmSubjectBox { start: Rect; end: Rect }
export type CompiledFilmScene = { id: string; startFrame: number; endFrame: number; cues: readonly FilmCue[];
  subjects: Readonly<Record<string, FilmSubjectBox>>; story?: FilmStory; turnFrame?: number } & (
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
  /** Match transitions, by incoming scene ID. */
  matches: Readonly<Record<string, FilmMatch>>;
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
  /** The `kit.json` of `audio.accents.kit`. Without it, no accent is placed. */
  accentKit?: FilmAccentKit;
}

const SCHEMA = schema as unknown as JsonSchema;
/** Lets a compile run without a browser: every caption fits, so only a compile with real fonts can report one that does not. */
const unmeasured: MeasureText = () => 1;
const recipeHint = (recipeId: string) => `Compare with a valid scene: npm run film:example -- --recipe=${recipeId}`;

function outputSize(output: FilmOutput): { width: number; height: number; preset?: VideoPlatformPresetId } {
  if ("preset" in output) { const { width, height } = videoPlatformPreset(output.preset); return { width, height, preset: output.preset }; }
  return { width: output.width, height: output.height };
}

const MATCH_FRAMES = 16, FLAT_ARC_SECONDS = 20;
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
  const { recipeId, content, durationFrames, cueFrames, background, accent } = scene;
  // A full-bleed recipe turns insets into padding around its media, so it places its own copy instead.
  const safeInsets = scene.safeInsets ?? (size.preset && !SCENE_FULL_BLEED.has(recipeId) ? videoPlatformPreset(size.preset).safeInset : undefined);
  return { recipeId, content, durationFrames, cueFrames, background, accent, safeInsets, schemaVersion: 1, recipeVersion: 1, id: film.id + "-" + scene.id, fps: film.fps, width: size.width, height: size.height } as SceneTemplateSpec;
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

  const compiled: CompiledFilmScene[] = [], seen = new Set<string>();
  const placed = (scene: FilmScene, source: Parameters<typeof subjectBoxes>[1], path: string) => {
    const { boxes, problems } = subjectBoxes(scene, source, size);
    for (const message of problems) report("error", "film-subject", path + "/subjects", message);
    return { subjects: boxes, story: scene.story };
  };
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
      : { durationFrames: 0, ...transition, kind: (transition?.kind ?? "cut") as Exclude<FilmTransition["kind"], "match"> }),
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
  const accents = doc.audio?.accents && options.accentKit && cutResult?.ok ? deriveAccents(compiled, cutResult.plan, fps, options.accentKit, doc.audio.accents) : [];
  const audio: AudioCueSheet | undefined = doc.audio && { id: doc.id + "-audio", fps, durationFrames, links: doc.audio.links,
    lanes: accents.length ? [...doc.audio.lanes, { id: ACCENT_LANE, kind: "sfx", startFrame: 0 }] : doc.audio.lanes,
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
    assets: compiled.flatMap(scene => scene.kind !== "recipe" ? [] : compileSceneTemplate(scene.spec).assets.map(asset => ({
      id: scene.id + "/" + asset.id, kind: "image" as const, url: asset.src, licenseRef: asset.licenseRef }))),
  };
  return { ok: true, diagnostics, film: {
    id: doc.id, fps, outputId: output.id, appearance: doc.appearance ?? "dark", width: size.width, height: size.height, durationFrames, scenes: compiled, cut: plan, matches, captions, audio, manifest,
    reviewFrames: reviewFrames(compiled, plan), safeInset: size.preset ? videoPlatformPreset(size.preset).safeInset : undefined,
  } };
}

/** Loops must close, the opening must raise a question, and a film of some length needs a turn. Sets each scene's turn frame. */
function checkStory(doc: FilmDocument, compiled: CompiledFilmScene[], durationFrames: number, report: (severity: FilmDiagnostic["severity"], code: string, path: string, message: string, hint?: string) => void): void {
  if (!doc.scenes.some(scene => scene.story)) return;
  const opened = new Map<string, number>(), closed = new Set<string>();
  let turns = 0;
  doc.scenes.forEach((scene, index) => {
    const story = scene.story ?? {}, path = `/scenes/${index}/story`, target = compiled[index];
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
    const cueId = story.turnAt ?? (target.kind === "recipe" ? "reveal" : target.cues[target.cues.length - 1].id), cue = target.cues.find(item => item.id === cueId);
    if (cue) target.turnFrame = cue.frame;
    else report("error", "story-turn-cue", path + "/turnAt", `"${cueId}" is not a cue of this scene.`, `Cues: ${target.cues.map(item => item.id).join(", ")}.`);
  });
  for (const [loop, index] of opened) if (!closed.has(loop))
    report("warning", "story-loop-open", `/scenes/${index}/story/opens`, `Loop "${loop}" opens and never closes.`, 'Add it to "closes" in the scene that answers it.');
  if (!doc.scenes[0].story?.opens?.length) report("warning", "story-hook-no-loop", "/scenes/0/story", "The first scene raises no question.", 'Add "opens" with the question that the film answers.');
  if (!turns && durationFrames * doc.fps.den / doc.fps.num >= FLAT_ARC_SECONDS)
    report("warning", "story-flat-arc", "/scenes", "No scene changes what the viewer believes.", 'Give one scene "expects" and a different "actually".');
}

const ACCENT_LANE = "accents";
/** A whoosh that peaks at the middle of each transition, and a riser and a hit that peak on each turn. */
function deriveAccents(scenes: readonly CompiledFilmScene[], cut: CompiledCutPlan, fps: RationalFps, kit: FilmAccentKit, request: NonNullable<FilmAudio["accents"]>): SoundEvent[] {
  const place = (id: string, sound: keyof FilmAccentKit["sounds"], peakFrame: number): SoundEvent => ({ id, laneId: ACCENT_LANE,
    frame: Math.max(0, peakFrame - Math.round(kit.sounds[sound].peakSeconds * fps.num / fps.den)), assetRef: request.kit + "/" + kit.sounds[sound].file, gainDb: request.gainDb ?? -8 });
  return [
    ...cut.transitions.filter(item => item.endFrame > item.startFrame).map(item => place(`accent/${item.toShotId}/whoosh`, "whoosh", Math.floor((item.startFrame + item.endFrame) / 2))),
    ...scenes.flatMap(scene => scene.turnFrame === undefined ? [] : [place(`accent/${scene.id}/riser`, "riser", scene.turnFrame), place(`accent/${scene.id}/hit`, "hit", scene.turnFrame)]),
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
    if (scene.kind === "object-story") for (const beat of scene.plan.spec.beats) add(scene.id, scene.startFrame + beat.endFrame - 1, beat.id);
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
