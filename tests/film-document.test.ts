import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findFrameProblems, frameContent, frameTone, textContrast } from "../registry/visual/rendered-frame-measures";
import { findMovingText, findTextProblems } from "../registry/visual/rendered-text-audit";
import { bakedContactsToSoundEvents } from "../registry/video/audio-visual-cue";
import { inspectSoundCatalog, isSafeSoundPath, readWavFormat, redistributableSounds } from "../registry/video/sound-catalog";
import type { SoundAssetRecord, SoundCatalog } from "../registry/video/sound-catalog";
import committed from "../assets/sound/catalog.json";
import { inspectShaderFx, resolveShaderFxParams, shaderFxEnvelope, shaderFxTimeMs, shaderFxKeyedValues } from "../registry/video/shader-fx";
import type { ShaderFxSpec } from "../registry/video/shader-fx";
import { inspectShaderFxUse, SHADER_FX_GUIDE, SHADER_FX_MOMENTS } from "../registry/video/shader-fx-guide";
import { causticReveal, findLightSource, lightWithASource, livingStill, markSting, rayOrigin, resolveIntoMark, resolveIntoPicture, signatureGradient } from "../registry/video/shader-fx-moments";
import { compileFilm, evaluateFilm } from "../registry/video/film-document";
import { dipFrame, fadeVeil, inkFor, veilOpacity } from "../registry/video/film-dip";
import { burstInsert, flashChanges, flashFrame, flippedGround, peakFlashesPerSecond } from "../registry/video/film-flash";
import { coverSize, shapeWipeFrame } from "../registry/video/film-shape-wipe";
import { panelBoxes, panelClip, panelFrame, panelOpen } from "../registry/video/film-panels";
import { cardCues, flashWords, wordFlashTiming } from "../registry/video/film-cards";
import { ditherTile, matteAlpha, matteField } from "../registry/video/film-matte";
import { rebuildPairs, scrambleFrame, scrambleLocks, swellDone, swellWeight } from "../registry/video/film-card-reveals";
import { annotateFrame, compileAnnotate, markView } from "../registry/video/annotate";
import { compileDrawOn, drawOnFrame, inspectDrawOnOutput, pointAlong, strokeGeometry } from "../registry/video/draw-on";
import type { DrawOnContent } from "../registry/video/draw-on";
import { compileTitleSequence, cutEdge, inspectTitleOutput, titleFrame } from "../registry/video/title-sequence";
import type { TitleSequenceContent } from "../registry/video/title-sequence";
import type { AnnotateContent } from "../registry/video/annotate";
import { SHOT_3D_CHAIN_SETTLE, SHOT_3D_PHYSICS } from "../registry/video/film-3d";
import { LOOK_MIN_DISTANCE, cadenceFrame, gradeCurve, gradeMatrix, lookDistances, lookFrame, mergeLookSpecs, resolveLook, stillLook } from "../registry/video/film-look";
import type { FilmDocument, FilmScene, FilmTransition } from "../registry/video/film-document";
import { DEMO_SCENES, OBJECT_STORY_EXAMPLE, SCENE_IDS } from "../registry/video/scene-template-examples";
import { listSceneTemplateProblems } from "../registry/video/scene-templates";
import type { SceneTemplateSpec } from "../registry/video/scene-templates";

const measure = (font: string, text: string) => text.length * Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16) * .5;
const sceneFrom = (id: keyof typeof DEMO_SCENES, sceneId: string = id): FilmScene => {
  const { recipeId, content, durationFrames, cueFrames, accent } = DEMO_SCENES[id];
  return structuredClone({ id: sceneId, recipeId, content, durationFrames, cueFrames, accent }) as FilmScene;
};
const film = (scenes: readonly FilmScene[], extra: Partial<FilmDocument> = {}): FilmDocument =>
  ({ schemaVersion: 1, id: "demo", fps: { num: 30, den: 1 }, outputs: [{ id: "landscape", preset: "youtube" }, { id: "portrait", width: 1080, height: 1920 }], scenes, ...extra });
const storyScene = (): FilmScene => ({ id: "story", recipeId: "object-story", durationFrames: 300,
  content: { objects: OBJECT_STORY_EXAMPLE.objects, beats: OBJECT_STORY_EXAMPLE.beats } });
const errors = (input: unknown) => compileFilm(input, { objectStory: { measure } }).diagnostics.filter(item => item.severity === "error");

describe("FilmDocument", () => {
  it("accepts every portable example through the generated schema", () => {
    for (const id of SCENE_IDS) expect(errors(film([sceneFrom(id)]))).toEqual([]);
    expect(errors(film([storyScene()]))).toEqual([]);
  });
  it("places scenes end to end and resolves a dissolve from the cut plan", () => {
    const [first, second] = [sceneFrom("question-reveal", "open"), { ...sceneFrom("cause-effect", "close"), transition: { kind: "dissolve", durationFrames: 12 } } as FilmScene];
    const result = compileFilm(film([first, second]));
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    const { film: compiled } = result;
    expect(compiled.durationFrames).toBe(240);
    expect(compiled.manifest).toMatchObject({ width: 1920, height: 1080, preset: "youtube", durationFrames: 240 });
    expect(compiled.scenes.map(scene => [scene.startFrame, scene.endFrame])).toEqual([[0, 120], [120, 240]]);
    const layers = evaluateFilm(compiled, 124).layers;
    expect(layers.map(layer => [layer.sceneId, layer.localFrame])).toEqual([["open", 119], ["close", 4]]);
    expect(evaluateFilm(compiled, 200).layers).toHaveLength(1);
    expect(compiled.reviewFrames.find(item => item.label === "dissolve")).toMatchObject({ transition: true, sceneId: "close" });
    const portrait = compileFilm(film([first, second]), { outputId: "portrait" });
    expect(portrait.ok && [portrait.film.width, portrait.film.height]).toEqual([1080, 1920]);
  });
  it("applies a preset safe area to card recipes, but not to full-bleed recipes or an authored inset", () => {
    const spec = (scene: FilmScene) => { const result = compileFilm(film([scene])); if (!result.ok || result.film.scenes[0].kind !== "recipe") throw new Error("no recipe"); return result.film.scenes[0].spec; };
    expect(spec(sceneFrom("cause-effect")).safeInsets).toMatchObject({ top: .09, right: .12 });
    expect(spec(sceneFrom("question-reveal")).safeInsets).toBeUndefined();
    const safeInsets = { top: .05, right: .05, bottom: .05, left: .05 };
    expect(spec({ ...sceneFrom("cause-effect"), safeInsets }).safeInsets).toEqual(safeInsets);
  });
  it("reports every problem in one pass, with a path and a usable hint", () => {
    const broken = sceneFrom("question-reveal", "open") as unknown as { content: Record<string, unknown>; durationFrames: unknown; colour?: string };
    delete broken.content.question;
    broken.durationFrames = "120";
    broken.colour = "red";
    const wrongRecipe = { ...sceneFrom("cause-effect", "next"), recipeId: "cause-efect" };
    const found = errors(film([broken as unknown as FilmScene, wrongRecipe as unknown as FilmScene]));
    const at = (path: string) => found.find(item => item.path === path);
    expect(at("/scenes/0/content/question")).toMatchObject({ code: "schema-required" });
    expect(at("/scenes/0/durationFrames")).toMatchObject({ code: "schema-type" });
    expect(at("/scenes/0/colour")?.code).toBe("schema-unknown-key");
    expect(at("/scenes/1/recipeId")?.hint).toContain('Did you mean "cause-effect"?');
  });
  it("reports semantic problems that a schema cannot see, and refuses an asset with no rights reference", () => {
    const scene = sceneFrom("question-reveal", "open") as FilmScene & { recipeId: "question-reveal" };
    const noRights = { ...scene, content: { ...scene.content, subject: { ...scene.content.subject, licenseRef: undefined } } };
    expect(errors(film([noRights as FilmScene]))).toContainEqual(expect.objectContaining({ code: "unlicensed-asset", path: "/scenes/0/content" }));
    expect(errors(film([{ ...scene, content: { ...scene.content, question: " ", answer: " " }, cueFrames: [90, 50, 10] }]))
      .map(item => item.message).join(" ")).toMatch(/cueFrames.*question and answer/);
  });
  it("checks film rules across scenes", () => {
    const open = sceneFrom("question-reveal", "open");
    const codes = errors(film([{ ...open, transition: { kind: "cut" } }, sceneFrom("cause-effect", "open")])).map(item => item.code);
    expect(codes).toEqual(expect.arrayContaining(["film-first-transition", "film-duplicate-scene"]));
    expect(errors(film([open], { captions: { timing: { source: "manual" }, cues: [{ id: "late", startFrame: 500, endFrame: 520, text: "After the end" }] } }))[0].path).toBe("/captions/cues/0");
    expect(compileFilm(film([open]), { outputId: "square" }).diagnostics[0].code).toBe("film-unknown-output");
  });
  it("keeps a story with an unmeasurable caption in the plan, and leaves the fit to the browser compile", () => {
    const scene = storyScene() as FilmScene & { recipeId: "object-story" };
    const long = "Averylongunbrokencaptionword ".repeat(40).trim();
    const beats = scene.content.beats.map((beat, index) => index ? beat : { ...beat, caption: { text: long } });
    const input = film([{ ...scene, content: { ...scene.content, beats } }]);
    const unmeasured = compileFilm(input);
    expect(unmeasured.ok && unmeasured.film.scenes).toHaveLength(1);
    expect(errors(input).map(item => item.code)).toContain("caption-no-room");
  });
  it("lists every recipe problem, where validateSceneTemplate stops at the first", () => {
    const spec = { ...DEMO_SCENES["question-reveal"], cueFrames: [90, 50, 10], content: { ...DEMO_SCENES["question-reveal"].content, question: " " } } as SceneTemplateSpec;
    expect(listSceneTemplateProblems(spec).length).toBeGreaterThan(1);
    expect(listSceneTemplateProblems(DEMO_SCENES["question-reveal"] as SceneTemplateSpec)).toEqual([]);
  });
  it("compiles a 3D shot, names its moments, and checks its parts and craft before any renderer loads", async () => {
    const journey = (await import("../examples/film/device-journey-3d.film.json")).default as unknown as FilmDocument;
    const result = compileFilm(journey);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    const gather = result.film.scenes[0];
    expect(gather.kind === "shot-3d" && gather.turnCue).toBe("form");
    expect(gather.cues.map(cue => cue.id)).toEqual(["start", "gather", "form", "title"]);
    expect(result.film.scenes[2].cues.find(cue => cue.id === "cross")?.frame).toBe(369 + 96);
    expect(result.film.reviewFrames.filter(item => item.sceneId === "inside").map(item => item.label)).toEqual(expect.arrayContaining(["open", "cross", "end"]));
    const shot = (content: Record<string, unknown>, durationFrames = 150): FilmScene => ({ id: "shot", recipeId: "shot-3d", durationFrames, content: { label: "A phone.", ...content } } as FilmScene);
    const found = errors(film([
      shot({ shot: "part-spotlight", subject: "phone", spec: { part: "phone-lens", pushStart: 10, pushEnd: 60, wide: { yaw: 140, pitch: 10, fill: .8 }, close: { yaw: 190, pitch: 6, fill: .4 } } }),
    ]));
    expect(found).toContainEqual(expect.objectContaining({ code: "shot-3d-part", path: "/scenes/0/content/spec/part", hint: expect.stringContaining("phone-lens-stack") }));
    const craft = errors(film([shot({ shot: "physics-point", bake: "stack-compare", spec: { view: { yaw: 0, pitch: 14, fill: .8 }, title: { text: "Almost twice as many", enter: 40 }, labels: [{ group: "middle", text: "6", enter: 100 }] } })]));
    expect(craft.map(item => item.code)).toEqual(expect.arrayContaining(["physics-text-early", "shot-3d-group"]));
    for (const [id, bake] of Object.entries(SHOT_3D_PHYSICS)) {
      const baked = (await import(`../assets/physics/${id}.json`)).default as { scene: { bodies: { group: string }[] }; action: { contacts: { frame: number }[] } };
      expect(Math.ceil(baked.action.contacts[baked.action.contacts.length - 1].frame)).toBe(bake.lastContactFrame);
      expect([...new Set(baked.scene.bodies.map(body => body.group))]).toEqual(bake.groups);
    }
    expect(errors(film([shot({ shot: "hero-turn", subject: "toaster", spec: { yawFrom: 0, yawTo: 30, settleFrame: 40 } })]))[0].path).toBe("/scenes/0/content/subject");
  });
  it("compiles the story scenes in 3D, names their moments, and refuses what cannot be shown", async () => {
    for (const name of ["savings-3d", "payment-3d"]) {
      const result = compileFilm((await import(`../examples/film/${name}.film.json`)).default as unknown as FilmDocument);
      if (!result.ok) throw new Error(JSON.stringify(result.diagnostics.filter(item => item.severity === "error")));
    }
    const savings = compileFilm((await import("../examples/film/savings-3d.film.json")).default as unknown as FilmDocument);
    if (!savings.ok) throw new Error("savings");
    const [home, stacks, chain] = savings.film.scenes;
    expect(home.kind === "shot-3d" && home.turnCue).toBe("aligned");
    expect(stacks.cues.map(cue => cue.id)).toEqual(["start", "drop", "stacked", "title"]);
    expect(chain.cues.filter(cue => cue.id.startsWith("link-"))).toHaveLength(4);
    // The settle frames the checker uses must be the bakes' own.
    for (const [links, settle] of Object.entries(SHOT_3D_CHAIN_SETTLE)) {
      const bake = (await import(`../assets/physics/domino-amplifier-${links}.json`)).default as { action: { tracks: { keys: { frame: number; position: number[]; rotation: number[] }[] }[] } };
      const rest = Math.max(...bake.action.tracks.map(track => { const a = track.keys[track.keys.length - 2], b = track.keys[track.keys.length - 1];
        return a.position.every((v, i) => Math.abs(v - b.position[i]) < 1e-4) && a.rotation.every((v, i) => Math.abs(v - b.rotation[i]) < 1e-4) ? a.frame : b.frame; }));
      expect(rest).toBe(settle);
    }
    const shot = (content: Record<string, unknown>, durationFrames = 300): FilmScene => ({ id: "shot", recipeId: "shot-3d", durationFrames, content: { label: "A scene.", ...content } } as FilmScene);
    const codes = (content: Record<string, unknown>, durationFrames?: number) => errors(film([shot(content, durationFrames)])).map(item => item.code);
    expect(codes({ shot: "inside-out", subject: "laptop", spec: { cutStart: 20, cutEnd: 80 } })).toContain("shot-3d-no-cutaway");
    expect(codes({ shot: "inside-out", subject: "phone", spec: { cutStart: 20, cutEnd: 80, labels: [{ part: "phone-display", text: "Display" }] } })).toContain("shot-3d-inside-part");
    expect(codes({ shot: "scale-journey", spec: { stops: [{ id: "a", kind: "bank" }, { id: "b", kind: "coin" }] } })).toContain("scale-order");
    expect(codes({ shot: "tabletop-story", spec: { objects: [{ id: "a", kind: "invoice" }], beats: [{ id: "b", startFrame: 0, layout: "row", objects: ["a", "ghost"] }] } })).toContain("tabletop-unknown-object");
    expect(codes({ shot: "tabletop-story", spec: { objects: [{ id: "a", kind: "invoice" }], beats: [{ id: "b", startFrame: 0, layout: "pair", objects: ["a"] }] } })).toContain("tabletop-pair");
    expect(codes({ shot: "chain-reaction", spec: { links: ["One", "Two", "Three"], pushFrame: 40 } })).toContain("chain-read-short");
    expect(codes({ shot: "shadow-reveal", spec: { silhouette: "house", revealStart: 70, revealEnd: 165, answer: { text: "Too soon", enter: 90 } } }, 240)).toContain("shadow-answer-early");
  }, 60000);
  it("resolves film looks into explicit numbers, moves them by mood, and checks them", () => {
    const base = resolveLook({ preset: "warm-35mm" }), sad = resolveLook({ preset: "warm-35mm", mood: ["melancholic"] });
    // Brightness carries pleasure and saturation arousal: a melancholic mood lowers both, and cools.
    expect(sad.grade.exposure).toBeLessThan(base.grade.exposure);
    expect(sad.grade.saturation).toBeLessThan(base.grade.saturation);
    expect(sad.grade.temperature).toBeLessThan(base.grade.temperature);
    expect(resolveLook({ preset: "noir", overrides: { texture: { grain: 2 } } }).texture.grain).toBe(1);
    // A neutral grade is the identity: the matrix is the unit matrix and every curve is a straight line.
    const clean = resolveLook();
    expect(gradeMatrix(clean.grade).map(v => Math.round(v * 1000) / 1000)).toEqual([1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]);
    expect(gradeCurve(clean.grade, 0, 5)).toEqual([0, .25, .5, .75, 1]);
    // Held frames hold; everything that changes per frame is a function of the frame alone.
    const step = resolveLook({ preset: "neon-longing" });
    expect([0, 1, 2, 3, 4, 5, 6].map(f => cadenceFrame(step, f))).toEqual([0, 0, 0, 3, 3, 3, 6]);
    expect(lookFrame(step, 47, 30, 3, 20)).toEqual(lookFrame(step, 47, 30, 3, 20));
    expect(stillLook(step).motion).toMatchObject({ cadence: "smooth", shake: 0, pushAtTurn: 0 });
    // No two presets may sit so close in the feature space that they read as the same look.
    const nearest = lookDistances()[0];
    expect(nearest.distance, `${nearest.a} and ${nearest.b} are too alike`).toBeGreaterThanOrEqual(LOOK_MIN_DISTANCE);
    expect(mergeLookSpecs({ preset: "warm-35mm", mood: ["nostalgic"] }, { mood: ["tense"], overrides: { grade: { exposure: -.4 } } }))
      .toMatchObject({ preset: "warm-35mm", mood: ["nostalgic", "tense"], overrides: { grade: { exposure: -.4 } } });
    const codes = (look: object) => errors(film([sceneFrom("question-reveal")], { look } as Partial<FilmDocument>)).map(item => item.code);
    expect(codes({ preset: "sepia-dreams" })).toContain("look-unknown");
    const warnings = compileFilm(film([sceneFrom("question-reveal")], { look: { preset: "noir", mood: ["joyful"], overrides: { texture: { matte: "2.39" } } } })).diagnostics.map(item => item.code);
    expect(warnings).toEqual(expect.arrayContaining(["look-mood-conflict", "look-matte-text"]));
  });
  it("gives each scene its look and lets a period look muffle the beds", () => {
    const result = compileFilm(film([sceneFrom("question-reveal", "a"), { ...sceneFrom("cause-effect", "b"), look: { preset: "noir" } } as FilmScene],
      { look: { preset: "home-8mm" }, audio: { lanes: [], beds: [{ id: "room", sound: "bed-cave-air" }], licenseRef: "test" } }));
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics.filter(item => item.severity === "error")));
    expect(result.film.scenes.map(scene => scene.look?.id)).toEqual(["home-8mm", "noir"]);
    expect(result.film.look?.id).toBe("home-8mm");
    expect(result.film.audio?.lanes.find(lane => lane.id === "bed-room")?.assetRef).toContain(":6000:");
  });
  it("warns about lists, unprimed reveals, no protagonist, flat arcs and metronome pacing", () => {
    const warnings = (input: FilmDocument) => compileFilm(input, { objectStory: { measure } }).diagnostics.filter(item => item.severity === "warning").map(item => item.code);
    const scene = (id: string, durationFrames: number, story?: FilmScene["story"], recipe: keyof typeof DEMO_SCENES = "cause-effect") => ({ ...sceneFrom(recipe, id), durationFrames, story } as FilmScene);
    // "And then, and then": a list, not a story.
    expect(warnings(film([scene("a", 300, { opens: ["q"] }), scene("b", 240, { link: "and" }), scene("c", 330, { link: "and", closes: ["q"] })]))).toContain("story-and-then");
    expect(warnings(film([scene("a", 300, { opens: ["q"] }), scene("b", 240, { link: "but" }), scene("c", 330, { link: "therefore", closes: ["q"] })]))).not.toContain("story-and-then");
    // A turn with no question before it lands as information.
    const turn = { expects: "Equal", actually: "Short", turnAt: "reveal" };
    expect(warnings(film([scene("a", 300, { ...turn })]))).toContain("story-unprimed-reveal");
    expect(warnings(film([scene("a", 300, { opens: ["q"] }), scene("b", 300, { ...turn, closes: ["q"] })]))).not.toContain("story-unprimed-reveal");
    // Nothing carried across scenes in a story of 20 s or more.
    expect(warnings(film([scene("a", 330, { opens: ["q"] }), scene("b", 330, { closes: ["q"] })]))).toContain("story-no-protagonist");
    const carried = film([{ ...scene("a", 330, { opens: ["q"] }), subjects: { bill: { region: { x: .3, y: .2, width: .3, height: .5 } } } } as FilmScene,
      { ...scene("b", 330, { closes: ["q"] }), subjects: { bill: { region: { x: .3, y: .2, width: .3, height: .5 } } } } as FilmScene]);
    expect(warnings(carried)).not.toContain("story-no-protagonist");
    // Feelings that never fall below the start have nothing to climb from.
    const arc = (f: number[]) => warnings(film(f.map((feeling, i) => scene("s" + i, 330, { feeling, ...i === 0 ? { opens: ["q"] } : i === f.length - 1 ? { closes: ["q"] } : {} }))));
    expect(arc([0, .3, .6, .9])).toContain("story-arc-flat");
    expect(arc([0, -.6, .2, .9])).not.toContain("story-arc-flat");
    // Four scenes of the same length tick like a metronome.
    expect(warnings(film([scene("a", 300), scene("b", 300), scene("c", 306), scene("d", 300)]))).toContain("pacing-monotone");
    expect(warnings(film([scene("a", 300), scene("b", 150), scene("c", 420), scene("d", 240)]))).not.toContain("pacing-monotone");
  });
  it("finds text that keeps moving while it is read, but not a camera move or a tracking label", () => {
    const box = (text: string, x: number, y: number, extra: object = {}) => ({ text, rect: { x, y, width: 200, height: 40 }, fontPx: 33, owner: 0, opacity: 1, ...extra });
    // Everything moved together (a camera push): no problem.
    expect(findMovingText([box("A", 0, 0), box("B", 300, 0), box("C", 0, 300)], [box("A", 6, 4), box("B", 306, 4), box("C", 6, 304)])).toEqual([]);
    // One line slides against the rest.
    expect(findMovingText([box("A", 0, 0), box("B", 300, 0), box("C", 0, 300)], [box("A", 0, 0), box("B", 330, 0), box("C", 0, 300)]).map(p => p.text)).toEqual(["B"]);
    // A label that follows its object is left alone.
    expect(findMovingText([box("L", 0, 0, { tracks: true })], [box("L", 40, 0, { tracks: true })])).toEqual([]);
    // A two-line block reports both lines with its whole text; each line pairs with itself, not with the first line.
    expect(findMovingText([box("Two lines", 0, 0), box("Two lines", 0, 60)], [box("Two lines", 0, 0), box("Two lines", 0, 60)])).toEqual([]);
  });
  it("keeps the committed schema in step with the types", () => {
    expect(() => execFileSync(process.execPath, ["scripts/film-schema.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  }, 60000);
});

describe("rendered text audit", () => {
  const frame = { width: 1000, height: 1000 };
  const box = (owner: number, text: string, x: number, y: number, width = 200, height = 40, opacity = 1) =>
    ({ text, owner, rect: { x, y, width, height }, fontPx: height * .83, opacity });
  const codes = (boxes: Parameters<typeof findTextProblems>[0], options = {}) => findTextProblems(boxes, { frame, ...options }).map(item => item.code);
  it("finds a collision between two blocks, but not between the lines of one block", () => {
    expect(codes([box(1, "first", 100, 100), box(2, "second", 150, 110)])).toEqual(["text-collision"]);
    expect(codes([box(1, "same", 100, 100), box(1, "same", 150, 110)])).toEqual([]);
    expect(codes([box(1, "above", 100, 100, 200, 40), box(2, "below", 100, 136, 200, 40)])).toEqual([]);
  });
  it("ignores text that is still fading in", () => {
    expect(codes([box(1, "first", 100, 100), box(2, "second", 150, 110, 200, 40, .2)])).toEqual([]);
  });
  it("treats text wholly outside its clip as not visible", () => {
    const clippedBy = { x: 0, y: 0, width: 400, height: 100 };
    expect(codes([{ ...box(1, "waiting digit", 100, 160), clippedBy }, box(2, "copy", 100, 160)])).toEqual([]);
  });
  it("reports each kind of problem once for a block, however many lines have it", () => {
    expect(codes([box(1, "over", 950, 100), box(1, "over", 960, 150)])).toEqual(["text-outside-frame"]);
  });
  it("separates the frame edge, the platform safe area, clipping and small type", () => {
    const safeInset = { left: .1, right: .1, top: .1, bottom: .1 };
    expect(codes([box(1, "edge", 50, 300)], { safeInset })).toEqual(["text-outside-safe-area"]);
    expect(codes([{ ...box(1, "cut", 300, 300), clippedBy: { x: 300, y: 300, width: 100, height: 100 } }])).toEqual(["text-clipped"]);
    expect(codes([box(1, "tiny", 300, 300, 100, 12)])).toEqual(["text-too-small"]);
  });
});

describe("film story, match and accents", () => {
  const hook = () => ({ ...sceneFrom("question-reveal", "hook"), subjects: { thing: { region: { x: .1, y: .1, width: .2, height: .5 } } } }) as FilmScene;
  const next = (transition: object, subjects: object = { thing: { region: { x: .6, y: .2, width: .2, height: .4 } } }) => ({ ...sceneFrom("cause-effect", "next"), transition, subjects }) as FilmScene;
  const diagnosticsOf = (scenes: readonly FilmScene[], extra: Partial<FilmDocument> = {}) => compileFilm(film(scenes, extra)).diagnostics;
  it("carries a shared subject across a match, through a meeting box where both scenes cover the frame", () => {
    const result = compileFilm(film([hook(), next({ kind: "match", subject: "thing" })]));
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    const { from, via, to } = result.film.matches.next;
    expect([from.x, to.x]).toEqual([192, 1152]);
    expect(via.height).toBeGreaterThanOrEqual(Math.max(from.height, to.height));
    // Each scene maps its own box to the meeting box. Neither one may show an edge inside the frame.
    for (const own of [from, to]) {
      const scale = via.height / own.height, left = via.x + via.width / 2 - scale * (own.x + own.width / 2);
      expect(left).toBeLessThanOrEqual(.5);
      expect(left + scale * 1920).toBeGreaterThanOrEqual(1919.5);
    }
    expect(evaluateFilm(result.film, 125).layers).toHaveLength(2);
  });
  it("refuses a match with no shared subject, and proposes a match when one is available", () => {
    expect(diagnosticsOf([hook(), next({ kind: "match", subject: "other" })])).toContainEqual(expect.objectContaining({ code: "film-match-subject", severity: "error" }));
    expect(diagnosticsOf([hook(), next({ kind: "dissolve", durationFrames: 10 })])).toContainEqual(expect.objectContaining({ code: "film-match-available", severity: "warning" }));
  });
  it("checks that loops close, that the opening raises a question and that a long film has a turn", () => {
    // Both scenes carry the same subject, so the film has something to follow.
    const bill = { bill: { region: { x: .3, y: .2, width: .3, height: .5 } } };
    const withStory = (first: object, second: object) => diagnosticsOf([{ ...sceneFrom("question-reveal", "a"), durationFrames: 400, cueFrames: [100, 200, 300], story: first, subjects: bill } as FilmScene,
      { ...sceneFrom("cause-effect", "b"), durationFrames: 400, cueFrames: [100, 200, 300], story: second, subjects: bill } as FilmScene]).map(item => item.code);
    expect(withStory({ opens: ["why"] }, { closes: ["why"], expects: "It is equal", actually: "It differs" }).filter(code => code.startsWith("story-"))).toEqual([]);
    expect(withStory({ opens: ["why"] }, {})).toEqual(expect.arrayContaining(["story-loop-open", "story-flat-arc"]));
    expect(withStory({}, { closes: ["why"] })).toEqual(expect.arrayContaining(["story-loop-unknown", "story-hook-no-loop"]));
    expect(withStory({ opens: ["why"], hero: "nobody" }, { closes: ["why"] })).toContain("story-hero-unknown");
  });
  it("places a whoosh at the middle of a transition, and a riser and a hit that peak on the turn", () => {
    const accentKit = { sounds: { whoosh: { file: "w.wav", peakSeconds: .2 }, riser: { file: "r.wav", peakSeconds: 1 }, hit: { file: "h.wav", peakSeconds: 0 }, ping: { file: "p.wav", peakSeconds: 0 } } };
    const scenes = (turnAccent?: "impact") => [sceneFrom("question-reveal", "a"), { ...sceneFrom("cause-effect", "b"), transition: { kind: "dissolve", durationFrames: 12 }, story: { expects: "x", actually: "y", turnAccent } } as FilmScene];
    const audio = { lanes: [], accents: { kit: "sfx" }, licenseRef: "test" };
    const sounds = (turnAccent?: "impact", kit = accentKit) => {
      const result = compileFilm(film(scenes(turnAccent), { audio }), { accentKit: kit });
      if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
      return Object.fromEntries(result.film.audio!.sounds!.map(sound => [sound.id, [sound.frame, sound.assetRef]]));
    };
    // Scene b starts at 120, its dissolve covers 120 to 132, and its reveal cue is at 120 + 55.
    expect(sounds("impact")).toEqual({ "accent/b/whoosh": [120, "sfx/w.wav"], "accent/b/riser": [145, "sfx/r.wav"], "accent/b/hit": [175, "sfx/h.wav"] });
    expect(sounds()).toEqual({ "accent/b/whoosh": [120, "sfx/w.wav"], "accent/b/ping": [175, "sfx/p.wav"] });
    const older = { whoosh: accentKit.sounds.whoosh, riser: accentKit.sounds.riser, hit: accentKit.sounds.hit };
    expect(compileFilm(film(scenes(), { audio }), { accentKit: { sounds: older } }).diagnostics).toContainEqual(expect.objectContaining({ code: "accent-kit-missing-sound" }));
  });
});

describe("rendered frame measures", () => {
  const image = (width: number, height: number, paint: (x: number, y: number) => readonly [number, number, number]) => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) data.set([...paint(x, y), 255], (y * width + x) * 4);
    return { width, height, data };
  };
  const stripes = (ink: number, ground: number) => image(80, 40, (x, y) => (x % 8 < 2 && y > 10 && y < 30 ? [ink, ink, ink] : [ground, ground, ground]));
  it("measures the contrast of text against what is drawn behind it", () => {
    const box = { x: 0, y: 0, width: 80, height: 40 };
    expect(textContrast(stripes(255, 0), box, [255, 255, 255])).toBeCloseTo(21, 0);
    expect(textContrast(stripes(60, 40), box, [60, 60, 60])).toBeLessThan(1.5);
    // Half of the background is as light as the text: the hardest part decides.
    const split = image(80, 40, (x, y) => (x % 8 < 2 && y > 10 && y < 30 ? [255, 255, 255] : x < 40 ? [0, 0, 0] : [235, 235, 235]));
    expect(textContrast(split, box, [255, 255, 255])).toBeLessThan(1.5);
  });
  it("finds an empty frame, and where a squinting eye lands", () => {
    const frame = image(320, 180, (x, y) => (x > 200 && x < 260 && y > 40 && y < 100 ? [240, 240, 240] : [12, 16, 24]));
    const content = frameContent(frame);
    expect(content.coverage).toBeLessThan(.2);
    expect(content.focus.x).toBeGreaterThan(.6);
    expect(content.focus.y).toBeLessThan(.6);
    const codes = findFrameProblems(frame, { hero: { name: "left", rect: { x: 10, y: 60, width: 40, height: 40 } } }).problems.map(item => item.code);
    expect(codes).toEqual(["frame-mostly-empty", "focus-off-hero"]);
  });
});

describe("shader effects", () => {
  const mesh = (extra: object = {}) => ({ id: "m", effect: "mesh-gradient", layer: "background", ...extra }) as ShaderFxSpec;
  const fps = { num: 30000, den: 1001 };
  it("derives time from the frame alone, in the milliseconds that Paper Shaders expects", () => {
    expect(shaderFxTimeMs(mesh({ rate: 1 }), 30, { num: 30, den: 1 })).toBeCloseTo(1000);
    expect(shaderFxTimeMs(mesh({ rate: 1 }), 30000, fps)).toBeCloseTo(1001000);
    expect(shaderFxTimeMs(mesh({ rate: 1, startFrame: 10 }), 40, { num: 30, den: 1 })).toBeCloseTo(1000);
    expect(shaderFxTimeMs(mesh({ rate: 1, seed: 2 }), 0, fps)).not.toBe(shaderFxTimeMs(mesh({ rate: 1, seed: 3 }), 0, fps));
    expect(shaderFxTimeMs(mesh({ rate: 1 }), 500, fps, true)).toBe(0);
  });
  it("holds its treatment under the author's values", () => {
    expect(resolveShaderFxParams(mesh()).distortion).toBe(.5);
    expect(resolveShaderFxParams(mesh({ treatment: "hero", params: { distortion: .2 } }))).toMatchObject({ distortion: .2, swirl: .5 });
  });
  it("fades an overlay in, keeps it to the end of its host, and fades it out only if it ends early", () => {
    const overlay = { id: "o", effect: "god-rays", layer: "overlay", fadeFrames: 10 } as ShaderFxSpec;
    expect(shaderFxEnvelope(overlay, 4, 100).opacity).toBeCloseTo(.5);
    expect(shaderFxEnvelope(overlay, 99, 100).opacity).toBe(1);
    expect(shaderFxEnvelope({ ...overlay, durationFrames: 50 }, 45, 100).opacity).toBeCloseTo(.5);
    expect(shaderFxEnvelope({ ...overlay, startFrame: 20 }, 10, 100).active).toBe(false);
    expect(shaderFxEnvelope(overlay, 4, 100, true).opacity).toBe(1);
  });
  it("refuses a job the effect is not for, and warns about the misuses studio work avoids", () => {
    const photo = { id: "p", src: "p.jpg", alt: "A picture", licenseRef: "cc0" };
    expect(inspectShaderFx({ id: "m", effect: "liquid-metal", layer: "overlay", job: "evidence" } as ShaderFxSpec, 100).map(item => item.code)).toEqual(["shader-fx-job"]);
    expect(inspectShaderFx({ id: "m", effect: "liquid-metal", layer: "overlay", job: "identity" } as ShaderFxSpec, 100)).toEqual([]);
    const codes = (fx: readonly object[], more: readonly object[][] = []) => inspectShaderFxUse([fx, ...more].map((list, i) => ({ path: `/scenes/${i}/fx`, fx: list as ShaderFxSpec[] }))).map(item => item.code);
    expect(codes([{ id: "a", effect: "mesh-gradient", layer: "background", job: "mood" }])).toEqual([]);
    expect(codes([{ id: "a", effect: "mesh-gradient", layer: "background" }])).toEqual(["fx-job-missing"]);
    expect(codes([{ id: "a", effect: "mesh-gradient", layer: "background", job: "mood", treatment: "standard" }, { id: "b", effect: "god-rays", layer: "overlay", job: "reveal", treatment: "hero", params: { originX: 0, originY: 0 } }])).toEqual(["fx-competing"]);
    expect(codes([{ id: "r", effect: "god-rays", layer: "overlay", job: "reveal" }])).toEqual(["fx-unmotivated-light"]);
    expect(codes([{ id: "w", effect: "water", layer: "background", job: "living-still", image: photo }])).toEqual(["fx-unmasked-water"]);
    expect(codes([{ id: "w", effect: "water", layer: "background", job: "living-still", image: photo, params: { waterline: .5 } }])).toEqual([]);
    // Whole-frame water is fine on its way to calm, and only then.
    expect(codes([{ id: "w", effect: "water", layer: "background", job: "reveal", image: photo, keys: [{ param: "waves", from: .3, to: .03, startFrame: 0, endFrame: 90 }, { param: "caustic", from: .2, to: .04, startFrame: 0, endFrame: 90 }] }])).toEqual([]);
    expect(codes([{ id: "w", effect: "water", layer: "background", job: "reveal", image: photo, keys: [{ param: "waves", from: .3, to: .2, startFrame: 0, endFrame: 90 }] }])).toEqual(["fx-unmasked-water"]);
    expect(codes([{ id: "h", effect: "halftone-dots", layer: "background", job: "archive", image: photo, params: { contrast: .1 } }])).toEqual(["fx-subject-lost"]);
    expect(codes([{ id: "h", effect: "halftone-dots", layer: "background", job: "reveal", image: photo, params: { contrast: .1 }, keys: [{ param: "contrast", from: 0, to: .6, startFrame: 0, endFrame: 50 }] }])).toEqual([]);
    expect(codes([{ id: "g", effect: "grain-gradient", layer: "background", job: "evidence", treatment: "hero" }])).toEqual(["fx-competes-with-text"]);
    const metal = { id: "m", effect: "liquid-metal", layer: "overlay", job: "identity" };
    expect(codes([metal], [[metal]])).toEqual(["fx-identity-repeated"]);
    expect(codes([{ ...metal, layer: "background" }])).toEqual(["fx-identity-repeated"]);
  });
  it("builds every moment as a valid effect that follows the guide", () => {
    const photo = { id: "p", src: "p.jpg", alt: "A picture", licenseRef: "cc0" };
    const built = [resolveIntoPicture({ image: photo }), resolveIntoMark({}), markSting({ mark: photo }), livingStill({ image: photo, waterline: .5 }), signatureGradient({ colors: ["#000000", "#111111"], seed: 1 }),
      lightWithASource({ light: { x: .4, y: .3, strength: 2 }, aspect: 16 / 9 }), causticReveal({ image: photo })];
    for (const { fx } of built) {
      expect(inspectShaderFx(fx, 150)).toEqual([]);
      expect(SHADER_FX_GUIDE[fx.effect].jobs).toContain(fx.job);
    }
    expect(inspectShaderFxUse(built.map(({ fx }, i) => ({ path: `/scenes/${i}/fx`, fx: [fx] })))).toEqual([]);
    expect(SHADER_FX_MOMENTS.map(moment => moment.effect).sort()).toEqual(built.map(({ fx }) => fx.effect).sort());
    for (const guide of Object.values(SHADER_FX_GUIDE)) expect(guide.practice.length).toBeGreaterThan(40);
    // Every beat in the chooser has at least one moment to play.
    for (const job of ["mood", "bridge", "identity", "reveal", "evidence", "archive", "living-still"] as const) expect(SHADER_FX_MOMENTS.some(moment => moment.job === job || SHADER_FX_GUIDE[moment.effect].jobs.includes(job))).toBe(true);
    // Every cue names a sound the catalog has.
    const ids = new Set((committed as SoundCatalog).sounds.map(sound => sound.id));
    for (const moment of built) for (const cue of moment.cues) expect(ids.has(cue.sound)).toBe(true);
    for (const guide of Object.values(SHADER_FX_GUIDE)) if (guide.sound.id) expect(ids.has(guide.sound.id)).toBe(true);
    // The chrome mark rushes, then settles: shader time slows after the rush.
    const { settle } = markSting({ mark: photo });
    expect(settle(20) - settle(19)).toBeGreaterThan(settle(100) - settle(99));
  });
  it("finds the light in a picture and turns it into the measured ray origin", () => {
    const w = 64, h = 36, pixels = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4, near = Math.hypot(x - w * .75, y - h * .25) < 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = near ? 250 : 60; pixels[i + 3] = 255;
    }
    const light = findLightSource(pixels, w, h, 16 / 9);
    expect(light.x).toBeCloseTo(.75, 1);
    expect(light.y).toBeCloseTo(.25, 1);
    expect(light.strength).toBeGreaterThan(1.4);
    expect(findLightSource(new Uint8ClampedArray(w * h * 4).fill(90), w, h, 16 / 9).strength).toBeLessThan(1.4);
    // Measured in a browser: the core sits at the centre plus origin times the shorter side, with y down.
    expect(rayOrigin(.78, .5, 16 / 9).originX).toBeCloseTo(.5, 1);
    expect(rayOrigin(.5, .781, 9 / 16).originY).toBeCloseTo(.5, 1);
  });
  it("moves keyed controls on a frame clock, in sequence, and refuses a control that cannot move", () => {
    const rays = { id: "r", effect: "god-rays", layer: "overlay", keys: [{ param: "intensity", from: 0, to: .8, startFrame: 0, endFrame: 10, ease: "linear" }, { param: "intensity", from: .8, to: .2, startFrame: 20, endFrame: 30, ease: "linear" }] } as ShaderFxSpec;
    expect(shaderFxKeyedValues(rays, 5).intensity).toBeCloseTo(.4);
    expect(shaderFxKeyedValues(rays, 15).intensity).toBeCloseTo(.8);
    expect(shaderFxKeyedValues(rays, 25).intensity).toBeCloseTo(.5);
    expect(shaderFxKeyedValues(rays, 99).intensity).toBeCloseTo(.2);
    expect(shaderFxKeyedValues(rays, 25)).toEqual(shaderFxKeyedValues(rays, 25));
    const codes = (spec: object) => inspectShaderFx(spec as ShaderFxSpec, 100).map(item => item.code);
    expect(codes(rays)).toEqual([]);
    expect(codes({ ...rays, keys: [{ param: "colors", from: 0, to: 1, startFrame: 0, endFrame: 10 }] })).toEqual(["shader-fx-range"]);
    expect(codes({ ...rays, keys: [{ param: "intensity", from: 0, to: 3, startFrame: 0, endFrame: 10 }] })).toEqual(["shader-fx-range"]);
    expect(codes({ ...rays, keys: [{ param: "intensity", from: 0, to: 1, startFrame: 50, endFrame: 200 }] })).toEqual(["shader-fx-timing"]);
  });
  it("refuses values outside their limits, bad colours and an overlay region off the frame", () => {
    const codes = (spec: object) => inspectShaderFx(spec as ShaderFxSpec, 100).map(item => item.code);
    expect(codes(mesh({ params: { distortion: 3 } }))).toEqual(["shader-fx-range"]);
    expect(codes(mesh({ params: { colors: ["red", "#000000"] } }))).toEqual(["shader-fx-color"]);
    expect(codes(mesh({ params: { colors: ["#000000", "--km-accent"] } }))).toEqual([]);
    expect(codes(mesh({ startFrame: 90, durationFrames: 20 }))).toEqual(["shader-fx-timing"]);
    expect(codes(mesh({ region: { x: 0, y: 0, width: 1, height: 1 } }))).toEqual(["shader-fx-region"]);
    expect(codes({ id: "o", effect: "god-rays", layer: "overlay", region: { x: .8, y: 0, width: .5, height: .5 } })).toEqual(["shader-fx-region"]);
    expect(codes({ id: "o", effect: "god-rays", layer: "overlay", params: { originX: -.1, originY: -.2 } })).toEqual([]);
    expect(codes({ id: "o", effect: "god-rays", layer: "overlay", params: { originX: 1.5 } })).toEqual([]);
    expect(codes({ id: "o", effect: "god-rays", layer: "overlay", params: { originX: 2.5 } })).toEqual(["shader-fx-range"]);
    expect(codes({ id: "p", effect: "halftone-dots", layer: "background", image: { id: "i", src: "i.jpg", alt: "A picture", licenseRef: "cc0" }, params: { grain: .9 } })).toEqual(["shader-fx-range"]);
  });
  it("joins a film: the scene drops its canvas, an image needs rights, and a scene takes two effects", () => {
    const scene = (fx: readonly object[]) => ({ ...sceneFrom("cause-effect", "a"), fx }) as FilmScene;
    const compiled = compileFilm(film([scene([mesh()])]));
    if (!compiled.ok || compiled.film.scenes[0].kind !== "recipe") throw new Error(JSON.stringify(compiled.diagnostics));
    expect(compiled.film.scenes[0].spec.background).toBe("transparent");
    const water = { id: "w", effect: "water", layer: "background", image: { id: "p", src: "p.jpg", alt: "A picture" } };
    expect(errors(film([scene([water])])).map(item => item.code)).toContain("unlicensed-asset");
    const licensed = compileFilm(film([scene([{ ...water, image: { ...water.image, licenseRef: "cc0" } }])]));
    expect(licensed.ok && licensed.film.manifest.assets?.map(asset => asset.url)).toContain("p.jpg");
    expect(errors(film([scene([mesh({ id: "1" }), mesh({ id: "2" }), mesh({ id: "3" })])])).map(item => item.code)).toContain("shader-fx-budget");
    expect(errors(film([scene([{ ...mesh(), effect: "smoke" }])]))[0]).toMatchObject({ path: "/scenes/0/fx/0/effect", code: "schema-value" });
  });
});

describe("shader transitions", () => {
  const cross = (extra: Partial<ShaderFxSpec> = {}, transition: Partial<FilmTransition> = {}) => film([sceneFrom("cause-effect", "a"), { ...sceneFrom("cause-effect", "b"),
    transition: { kind: "dissolve", durationFrames: 24, fx: { id: "t", effect: "mesh-gradient", layer: "transition", ...extra } as ShaderFxSpec, ...transition } }]);
  it("covers the middle of a transition and leaves its edges clear", () => {
    const spec = { id: "t", effect: "mesh-gradient", layer: "transition" } as ShaderFxSpec;
    expect(shaderFxEnvelope(spec, 0, 24).opacity).toBeLessThan(.2);
    expect(shaderFxEnvelope(spec, 12, 24).opacity).toBe(1);
    expect(shaderFxEnvelope(spec, 23, 24).opacity).toBeLessThan(.2);
    expect(shaderFxEnvelope(spec, 24, 24).active).toBe(false);
    expect(shaderFxEnvelope(spec, 12, 24, true).active).toBe(false);
  });
  it("compiles to the incoming scene and refuses a layer or a length that cannot work", () => {
    const compiled = compileFilm(cross(), { objectStory: { measure } });
    expect(compiled.ok && compiled.film.transitionFx.b.id).toBe("t");
    expect(errors(cross({ layer: "background" })).map(item => item.code)).toContain("shader-fx-layer");
    expect(errors(cross({}, { durationFrames: 4 })).map(item => item.code)).toContain("shader-fx-timing");
    expect(errors(cross({}, { kind: "cut" })).map(item => item.code)).toContain("shader-fx-timing");
    expect(errors(film([{ ...sceneFrom("cause-effect", "a"), fx: [{ id: "t", effect: "mesh-gradient", layer: "transition" }] }])).map(item => item.code)).toContain("shader-fx-layer");
  });
});

describe("sound catalog", () => {
  const record = (extra: object = {}) => ({ id: "s", path: "wyzowl/impacts/s.wav", sha256: "a".repeat(64), durationSamples: 4800, sampleRate: 48000, channels: 2, bitDepth: 24, peakSeconds: .01, loudnessLufs: -24, tags: [], description: "A tap", origin: "synthesized",
    sourceUrl: "https://example.org/s", author: "Example", licenseId: "CC0-1.0", redistributable: true, allowedUses: ["commercial-video", "library-distribution"], verifiedAt: "2026-11-06", ...extra }) as SoundAssetRecord;
  const catalog = (...sounds: SoundAssetRecord[]) => ({ schemaVersion: 1, sounds }) as SoundCatalog;
  const codes = (...sounds: SoundAssetRecord[]) => inspectSoundCatalog(catalog(...sounds)).map(item => item.code);
  it("accepts a complete record, and the committed catalog", () => {
    expect(codes(record())).toEqual([]);
    expect(inspectSoundCatalog(committed as SoundCatalog)).toEqual([]);
  });
  it("fails closed on rights", () => {
    expect(codes(record({ licenseId: "CC-BY-NC-4.0" }))).toEqual(["sound-rights"]);
    expect(codes(record({ licenseId: "unknown" }))).toEqual(["sound-rights"]);
    expect(codes(record({ licenseId: "CC-BY-4.0" }))).toEqual(["sound-attribution"]);
    expect(codes(record({ allowedUses: ["library-distribution"] }))).toEqual(["sound-rights"]);
    expect(codes(record({ redistributable: false }))).toEqual(["sound-rights"]);
    expect(codes(record({ sourceUrl: "" }))).toEqual(["sound-provenance"]);
  });
  it("refuses a path that leaves the catalog, a bad hash, an impossible peak and a repeated ID", () => {
    for (const path of ["../secret.wav", "/etc/passwd", "a/../../b.wav", "C:/x.wav", "a\\b.wav", "a//b.wav"]) expect(isSafeSoundPath(path), path).toBe(false);
    expect(codes(record({ path: "../x.wav" }))).toEqual(["sound-path"]);
    expect(codes(record({ sha256: "abc" }))).toEqual(["sound-hash"]);
    expect(codes(record({ peakSeconds: 9 }))).toEqual(["sound-timing"]);
    expect(codes(record(), record())).toEqual(["sound-duplicate"]);
  });
  it("keeps film-only and refused sounds out of a pack", () => {
    const filmOnly = record({ id: "film-only", licenseId: "CC-BY-4.0", attribution: "Credit", redistributable: false, allowedUses: ["commercial-video"] });
    expect(inspectSoundCatalog(catalog(filmOnly))).toEqual([]);
    expect(redistributableSounds(catalog(record(), filmOnly, record({ id: "nc", licenseId: "CC-BY-NC-4.0" }))).map(item => item.id)).toEqual(["s"]);
  });
  it("reads a real WAV header and refuses a malformed one", () => {
    const wav = Buffer.alloc(44 + 48);
    wav.write("RIFF", 0, "latin1"); wav.writeUInt32LE(36 + 48, 4); wav.write("WAVEfmt ", 8, "latin1"); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
    wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(192000, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36, "latin1"); wav.writeUInt32LE(48, 40);
    expect(readWavFormat(wav)).toEqual({ channels: 2, sampleRate: 48000, bitDepth: 16, durationSamples: 12 });
    expect(() => readWavFormat(Buffer.from("not audio at all, and long enough to be read as a header.."))).toThrow(/RIFF/);
    expect(() => readWavFormat(wav.subarray(0, 36))).toThrow();
  });
  it("rotates licensed takes across contacts, so repeats do not use one file", () => {
    const sounds = bakedContactsToSoundEvents([1, 2, 3, 4].map(frame => ({ frame: frame * 10, target: "t", speedMps: 2, material: "wood" })), { profiles: { wood: { assetRef: "a.wav", variants: ["b.wav", "c.wav"] } }, fps: { num: 30, den: 1 }, durationFrames: 100 });
    expect(sounds.map(sound => sound.assetRef)).toEqual(["a.wav", "b.wav", "c.wav", "a.wav"]);
  });
  it("ties a named sound to a moment, and lands its peak on that frame", () => {
    const accentKit = { sounds: { whoosh: { file: "w.wav", peakSeconds: .2 }, tap: { file: "t.wav", peakSeconds: .1, gainDb: -2 } } };
    const scene = { id: "story", recipeId: "object-story", durationFrames: 300, content: { objects: OBJECT_STORY_EXAMPLE.objects, beats: OBJECT_STORY_EXAMPLE.beats } } as FilmScene;
    const audio = (at: string) => ({ lanes: [], accents: { kit: "sfx" }, licenseRef: "test", cues: [{ id: "c", sound: "tap", at, offsetFrames: 10 }] });
    const result = compileFilm(film([scene], { audio: audio("story/slip") }), { accentKit });
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    // The slip beat starts at 80, plus 10 frames, minus the 3 frames between the file's start and its peak.
    expect(result.film.audio!.sounds![0]).toMatchObject({ id: "cue/c/tap", frame: 87, assetRef: "sfx/t.wav", gainDb: -10 });
    expect(compileFilm(film([scene], { audio: audio("story/nothing") }), { accentKit }).diagnostics).toContainEqual(expect.objectContaining({ code: "sound-cue-moment" }));
  });
});

describe("split edits", () => {
  const sound = (id: string) => ({ sound: id });
  const scene = (id: string, frames: number, extra: Record<string, unknown> = {}) => ({ id, recipeId: "card", durationFrames: frames, content: { card: "headline", text: id }, ...extra });
  const film = (scenes: object[], audio = true): FilmDocument => ({ schemaVersion: 1, id: "split", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 640, height: 360 }],
    scenes: scenes as FilmScene[], ...audio ? { audio: { lanes: [], licenseRef: "kumiki-sound-catalog" } } : {} });
  const spans = (doc: FilmDocument) => { const result = compileFilm(doc); if (!result.ok) throw new Error(result.diagnostics.map(d => d.code).join()); return Object.fromEntries(result.film.sceneSounds.map(item => [item.sceneId, item])); };

  it("gives each scene its own sound, crossfading a few frames at a cut and across a dissolve", () => {
    const cut = spans(film([scene("a", 60, { sound: sound("bed-river-fast") }), scene("b", 60, { sound: sound("bed-cave-air") })]));
    expect(cut.a).toMatchObject({ startFrame: 0, endFrame: 62, fadeOutFrames: 4 });
    expect(cut.b).toMatchObject({ startFrame: 58, endFrame: 120, fadeInFrames: 4 });
    const dissolve = spans(film([scene("a", 60, { sound: sound("bed-river-fast") }), scene("b", 60, { sound: sound("bed-cave-air"), transition: { kind: "dissolve", durationFrames: 16 } })]));
    // The dissolve runs from frame 60 to 76: the two sounds crossfade across exactly those frames.
    expect(dissolve.a).toMatchObject({ endFrame: 76, fadeOutFrames: 16 });
    expect(dissolve.b).toMatchObject({ startFrame: 60, fadeInFrames: 16 });
  });
  it("starts the next scene's sound early for a J-cut, and carries the last one's over for an L-cut", () => {
    const j = spans(film([scene("a", 90, { sound: sound("bed-river-fast") }), scene("b", 90, { sound: sound("bed-waterfall-near"), transition: { kind: "cut", audioLead: 24 } })]));
    expect(j.b).toMatchObject({ startFrame: 66, fadeInFrames: 12, lead: 24 });
    expect(j.a).toMatchObject({ endFrame: 92 });
    const l = spans(film([scene("a", 90, { sound: sound("bed-river-fast") }), scene("b", 90, { sound: sound("bed-cave-air"), transition: { kind: "cut", audioTail: 30 } })]));
    expect(l.a).toMatchObject({ endFrame: 120, fadeOutFrames: 15, tail: 30 });
    expect(l.b).toMatchObject({ startFrame: 88 });
    // The mixer gets each scene's sound as an ambience lane, its fades in seconds.
    const result = compileFilm(film([scene("a", 90, { sound: sound("bed-river-fast") }), scene("b", 90, { sound: sound("bed-waterfall-near"), transition: { kind: "cut", audioLead: 24 } })]));
    expect(result.ok && result.film.audio!.lanes.find(lane => lane.id === "scene-b")).toMatchObject({ kind: "ambience", startFrame: 66, assetRef: "catalog:bed-waterfall-near:114:0.4:0:0:1" });
  });
  it("refuses splits that cannot play and warns about ones that will not read", () => {
    const codes = (doc: FilmDocument) => compileFilm(doc).diagnostics.map(d => d.code);
    expect(codes(film([scene("a", 90), scene("b", 90, { transition: { kind: "cut", audioLead: 12 } })]))).toContain("split-no-sound");
    expect(codes(film([scene("a", 90), scene("b", 90, { sound: sound("bed-cave-air"), transition: { kind: "cut", audioTail: 12 } })]))).toContain("split-no-sound");
    expect(codes(film([scene("a", 30, { sound: sound("bed-river-fast") }), scene("b", 90, { sound: sound("bed-cave-air"), transition: { kind: "cut", audioLead: 40 } })]))).toContain("split-overrun");
    expect(codes(film([scene("a", 90, { sound: sound("bed-river-fast") }), scene("b", 90, { sound: sound("bed-cave-air"), transition: { kind: "cut", audioLead: 2 } })]))).toContain("split-short");
    expect(codes(film([scene("a", 200, { sound: sound("bed-river-fast") }), scene("b", 200, { sound: sound("bed-cave-air"), transition: { kind: "cut", audioLead: 120 } })]))).toContain("split-long");
    expect(codes(film([scene("a", 90, { sound: sound("bed-river-fast") })], false))).toContain("scene-sound-no-audio");
  });
});

describe("guided motion chart", () => {
  const chart = (events: object[], extra: Record<string, unknown> = {}) => ({ title: "T", label: "L", source: "S", x: { label: "x", scale: "log" }, y: { label: "y" }, size: { label: "s" },
    groups: [{ id: "g", label: "G" }], times: [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010],
    entities: ["a", "b", "c"].map((id, k) => ({ id, label: id.toUpperCase(), group: "g", values: Array.from({ length: 11 }, (_, i) => [100 * (k + 1) * (1 + i / 10), 40 + i + k, 1e6 * (k + 1)]) })),
    events, ...extra });
  const film = (content: object, frames = 600): FilmDocument => ({ schemaVersion: 1, id: "c", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }],
    scenes: [{ id: "chart", recipeId: "motion-chart", durationFrames: frames, content } as unknown as FilmScene] });
  const codes = (doc: FilmDocument) => compileFilm(doc).diagnostics.map(item => item.code);
  const watch = { id: "e", entity: "b", from: 2003, to: 2006, cue: "Watch B.", note: "B doubles." };

  it("holds before each event to cue it, plays the change slowly, then holds for the note", async () => {
    const { compileMotionChart, motionChartState } = await import("../registry/video/motion-chart");
    const { plan } = compileMotionChart(chart([watch]) as never, 600, 30);
    expect(plan!.segments.map(item => item.kind)).toEqual(["intro", "play", "cue", "event", "note", "play", "outro"]);
    const cue = plan!.segments[2], event = plan!.segments[3], play = plan!.segments[1];
    // The cue holds still long enough to read, and the change plays slower than the rest.
    expect((cue.end - cue.start) / 30).toBeGreaterThanOrEqual(1.4);
    expect((event.end - event.start) / (event.t1 - event.t0)).toBeGreaterThan(2.5 * (play.end - play.start) / (play.t1 - play.t0));
    const during = motionChartState(plan!, (cue.start + cue.end) / 2);
    expect(during.time).toBe(2003);
    expect(during.caption).toMatchObject({ kind: "cue", text: "Watch B." });
    expect(during.focus?.event.entity).toBe("b");
    expect(motionChartState(plan!, plan!.segments[4].start + 20).caption).toMatchObject({ kind: "note", text: "B doubles." });
    expect(motionChartState(plan!, 599).time).toBe(2010);
    // The same frame gives the same state in any order; under reduced motion time steps instead of gliding.
    expect(motionChartState(plan!, 333)).toEqual(motionChartState(plan!, 333));
    expect([2000, 2003].includes(motionChartState(plan!, (play.start + play.end) / 2 - 1, true).time)).toBe(true);
  });
  it("refuses an event without a cue, as viewers follow a moving bubble only when told which to watch", () => {
    expect(codes(film(chart([{ ...watch, cue: "" }])))).toContain("motion-chart-uncued");
    expect(codes(film(chart([watch, { ...watch, id: "f", from: 2005, to: 2008 }])))).toContain("motion-chart-event-overlap");
    expect(codes(film(chart([{ ...watch, entity: "z" }])))).toContain("motion-chart-event-entity");
    expect(codes(film(chart([watch]), 90))).toContain("motion-chart-short");
    expect(codes(film(chart([{ ...watch, cue: "Please now watch the bubble for B as it moves up" }])))).toContain("motion-chart-cue-long");
    const zero = chart([watch]) as { entities: Array<{ values: number[][] }> };
    zero.entities[0].values[0][0] = 0;
    expect(codes(film(zero))).toContain("motion-chart-log");
  });
  it("compiles the example: three cued events, each a moment in the film", () => {
    const example = JSON.parse(readFileSync("examples/film/motion-chart.film.json", "utf8")) as FilmDocument, result = compileFilm(example);
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (!result.ok) return;
    const ids = result.film.scenes[0].cues.map(cue => cue.id);
    for (const id of ["famine", "rise", "hiv"]) expect(ids).toEqual(expect.arrayContaining([id + "-cue", id, id + "-note"]));
  });
});

describe("chart morph", () => {
  const cats = ["a", "b", "c"].map(id => ({ id, label: id.toUpperCase() }));
  const morph = (states: object[], extra: Record<string, unknown> = {}) => ({ title: "T", label: "L", source: "S", categories: cats, highlight: "c", states, ...extra });
  const s0 = { id: "s0", form: "bar", values: { a: 5, b: 3, c: 1 }, sort: "desc", caption: "Start." };
  const s1 = { id: "s1", form: "bar", values: { a: 6, b: 4, c: 20 }, sort: "desc", caption: "C overtakes." };
  const film = (content: object, frames = 600): FilmDocument => ({ schemaVersion: 1, id: "m", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }],
    scenes: [{ id: "morph", recipeId: "chart-morph", durationFrames: frames, content } as unknown as FilmScene] });
  const codes = (doc: FilmDocument) => compileFilm(doc).diagnostics.map(item => item.code);

  it("stages one kind of change at a time: an axis that must grow first, then values, then the order, then the form", async () => {
    const { changesBetween, compileChartMorph, chartMorphFrame } = await import("../registry/video/chart-morph");
    const content = morph([s0, s1, { ...s1, id: "s2", form: "dumbbell", compare: s0.values, caption: "From start to end." }]) as never;
    expect(changesBetween(content, s0 as never, s1 as never)).toEqual(["rescale", "values", "order"]);
    // Shrinking values move first and the axis tightens after, so nothing runs off it while it changes.
    expect(changesBetween(content, s1 as never, s0 as never)).toEqual(["values", "rescale", "order"]);
    const { plan } = compileChartMorph(content, 600, 30);
    expect(plan!.stages.map(item => item.change)).toEqual(["enter", "hold", "rescale", "values", "order", "hold", "form", "hold"]);
    const order = plan!.stages[4], mid = chartMorphFrame(plan!, (order.start + order.end) / 2), done = chartMorphFrame(plan!, order.end + 1);
    // Mid-sort, rows that swap are in motion; once sorted, C sits in the first slot, and the caption already names the new state.
    expect(mid.items.find(item => item.id === "c")!.moving).toBeGreaterThan(.9);
    expect(done.items.find(item => item.id === "c")!.slot).toBe(0);
    expect(done.caption.text).toBe("C overtakes.");
    expect(chartMorphFrame(plan!, 599).form.to).toBe("dumbbell");
    expect(chartMorphFrame(plan!, 333)).toEqual(chartMorphFrame(plan!, 333));
  });
  it("warns when a state changes several things at once, and refuses what cannot be drawn", () => {
    expect(codes(film(morph([s0, { ...s1, together: true }])))).toContain("motion-unstaged");
    expect(codes(film(morph([s0, s1])))).not.toContain("motion-unstaged");
    expect(codes(film(morph([s0, { ...s1, form: "dumbbell" }])))).toContain("chart-morph-compare");
    expect(codes(film(morph([s0, { ...s1, form: "line" }])))).toContain("chart-morph-line");
    expect(codes(film(morph([s0, { ...s1, caption: "" }])))).toContain("chart-morph-caption");
    expect(codes(film(morph([s0, s1]), 60))).toContain("chart-morph-short");
  });
  it("compiles the example: each state a moment in the film", () => {
    const example = JSON.parse(readFileSync("examples/film/chart-morph.film.json", "utf8")) as FilmDocument, result = compileFilm(example);
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (result.ok) expect(result.film.scenes[0].cues.map(cue => cue.id)).toEqual(["start", "2024", "change"]);
  });
});

describe("becomes", () => {
  it("lists exactly the hero catalog's single assets, so a film is checked without loading three.js", async () => {
    const { SHOT_3D_BECOMES } = await import("../registry/video/film-3d");
    const { heroCatalog } = await import("../registry/domains/hero-catalog");
    expect([...SHOT_3D_BECOMES].sort()).toEqual(heroCatalog().filter(entry => entry.domain !== "scene").map(entry => entry.kind).sort());
  });
  it("sweeps the dissolve down the first object, then builds the second where the particles land, then turns it", async () => {
    const { becomesState } = await import("../registry/visual/becomes-shot");
    const spec = { durationFrames: 210, view: { yaw: -20, pitch: 10 }, dissolveFrame: 40, formFrame: 120, orbitAfter: 14 };
    expect(becomesState(spec, 39)).toMatchObject({ dissolve: 0, build: 0 });
    // The dissolve has finished before the last particles land; the build starts as the first land.
    expect(becomesState(spec, 40 + 80 * .45).dissolve).toBe(1);
    expect(becomesState(spec, 40 + 80 * .55).build).toBe(0);
    expect(becomesState(spec, 120).build).toBe(1);
    expect(becomesState(spec, 120).turn).toBe(-20);
    expect(becomesState(spec, 210).turn).toBeCloseTo(-6);
  });
  it("refuses an object becoming itself or an unknown one, and warns about a change too fast to follow", () => {
    const film = (content: object): FilmDocument => ({ schemaVersion: 1, id: "b", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }],
      scenes: [{ id: "b", recipeId: "shot-3d", durationFrames: 210, content: { shot: "becomes", label: "L", from: "bear-market", to: "bull-market", spec: { view: { yaw: 0, pitch: 10 }, dissolveFrame: 40, formFrame: 118 }, ...content } } as unknown as FilmScene] });
    const codes = (content: object) => compileFilm(film(content)).diagnostics.map(item => item.code);
    expect(codes({})).toEqual([]);
    expect(codes({ to: "bear-market" })).toContain("becomes-same");
    // The schema refuses an unknown kind first; the shot check names the assets for a document that skips it.
    expect(codes({ to: "unicorn" }).some(code => code === "schema-value" || code === "shot-3d-becomes-kind")).toBe(true);
    expect(codes({ spec: { view: { yaw: 0, pitch: 10 }, dissolveFrame: 40, formFrame: 55 } })).toContain("becomes-rushed");
    expect(codes({ spec: { view: { yaw: 0, pitch: 10 }, dissolveFrame: 10, formFrame: 90 } })).toContain("becomes-no-first");
    expect(codes({ spec: { view: { yaw: 0, pitch: 10 }, dissolveFrame: 40, formFrame: 118, title: { text: "Too soon", enter: 60 } } })).toContain("becomes-title-early");
  });
});

describe("cold open", () => {
  const card = (id: string, frames = 120, extra: Record<string, unknown> = {}) => ({ id, recipeId: "card", durationFrames: frames, content: { card: "headline", text: id + " happens here" }, ...extra });
  const film = (extra: Record<string, unknown> = {}, scenes: object[] = [card("one", 120, { story: { opens: ["q"] } }), card("two"), card("three", 150, { story: { closes: ["q"] } })]): FilmDocument =>
    ({ schemaVersion: 1, id: "c", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }], scenes: scenes as FilmScene[], ...extra });

  it("plays a stretch of a scene's content: a time map from the stretch's start, and only the moments inside it", () => {
    const result = compileFilm(film({}, [card("one"), { ...card("two", 300), play: { from: 100, frames: 90 } }]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const two = result.film.scenes[1];
    expect(two.endFrame - two.startFrame).toBe(90);
    expect(two.speed!.map[0]).toBe(100);
    expect(two.speed!.map[90]).toBe(190);
    expect(two.contentFrames).toBe(300);
    expect(two.cues.every(cue => cue.frame >= two.startFrame && cue.frame <= two.endFrame)).toBe(true);
    expect(compileFilm(film({}, [card("one"), { ...card("two"), play: { from: 100, frames: 90 } }])).diagnostics.map(item => item.code)).toContain("film-play-range");
  });
  it("opens on the climax, ending on its moment, then a title, then the film; the replay raises a question the climax closes", () => {
    const result = compileFilm(film({ coldOpen: { scene: "three", at: 100, frames: 60, title: "Earlier that day" } }));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (!result.ok) return;
    const [replay, title, ...rest] = result.film.scenes;
    expect([replay.id, title.id, ...rest.map(scene => scene.id)]).toEqual(["three-cold-open", "cold-open-title", "one", "two", "three"]);
    expect(replay.speed!.map[0]).toBe(40);
    expect(replay.speed!.map[60]).toBe(100);
    expect(title.kind).toBe("card");
    expect(replay.story?.opens).toEqual(["cold-open"]);
    expect(rest[2].story?.closes).toContain("cold-open");
    expect(result.film.durationFrames).toBe(60 + (title.endFrame - title.startFrame) + 390);
  });
  it("warns when the flash-forward is not a climax, runs long or short, or shows the turn; refuses an unknown moment", () => {
    const codes = (coldOpen: object, scenes?: object[]) => compileFilm(film({ coldOpen: { title: "Before", ...coldOpen } }, scenes)).diagnostics.map(item => item.code);
    expect(codes({ scene: "one", at: 100 })).toContain("cold-open-first");
    const long = [card("one", 120, { story: { opens: ["q"] } }), card("two"), card("three", 300, { story: { closes: ["q"] } })];
    expect(codes({ scene: "three", at: 250, frames: 200 }, long)).toContain("cold-open-long");
    expect(codes({ scene: "three", at: 100, frames: 20 })).toContain("cold-open-short");
    expect(codes({ scene: "three", at: "nowhere" })).toContain("cold-open-moment");
    expect(codes({ scene: "nope", at: 10 })).toContain("cold-open-scene");
    const turning = [card("one", 120, { story: { opens: ["q"] } }), card("two"), card("three", 150, { story: { closes: ["q"], expects: "A", actually: "B", turnAt: "landed" } })];
    expect(codes({ scene: "three", at: 100, frames: 95 }, turning)).toContain("cold-open-spoils");
  });
  it("compiles the example: the dominoes falling, a question, then the story from its start", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/cold-open.film.json", "utf8")) as FilmDocument);
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (result.ok) expect(result.film.scenes.slice(0, 3).map(scene => scene.id)).toEqual(["chain-cold-open", "cold-open-title", "home"]);
  });
});

describe("container transform", () => {
  const list = { id: "contents", recipeId: "card", durationFrames: 170, content: { card: "list", title: "Two charts", items: ["One question", "Another question"] } };
  const headline = (transition: object) => ({ id: "detail", recipeId: "card", durationFrames: 120, content: { card: "headline", text: "The detail opens here" }, transition });
  const film = (scenes: object[]): FilmDocument => ({ schemaVersion: 1, id: "ct", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }], scenes: scenes as FilmScene[] });
  const codes = (scenes: object[]) => compileFilm(film(scenes)).diagnostics.map(item => item.code);

  it("grows a list card's row into the next scene: measured on screen, drawn as a dissolve of its length", () => {
    const result = compileFilm(film([list, headline({ kind: "container", subject: "item-2" })]));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (!result.ok) return;
    expect(result.film.containers.detail).toEqual({ subject: "item-2", from: undefined, color: undefined, radius: .016 });
    const window = result.film.cut.transitions[0];
    expect(window.kind).toBe("dissolve");
    expect(window.endFrame - window.startFrame).toBe(22);
    expect(evaluateFilm(result.film, window.startFrame + 11).layers.map(layer => layer.sceneId)).toEqual(["contents", "detail"]);
  });
  it("starts from a declared subject's box when the scene does not tag its tiles", () => {
    const tile = { ...list, content: { card: "headline", text: "A tile to open" }, subjects: { tile: { region: { x: .1, y: .2, width: .3, height: .25 } } } };
    const result = compileFilm(film([tile, headline({ kind: "container", subject: "tile", radius: .03 })]));
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    expect(result.film.containers.detail.from).toEqual({ x: 128, y: 144, width: 384, height: 180 });
    expect(result.film.containers.detail.radius).toBe(.03);
  });
  it("refuses a tile the scene before does not have, and warns on a jump, a slow zoom or a tile with little to grow", () => {
    expect(codes([list, headline({ kind: "container", subject: "item-3" })])).toContain("film-container-subject");
    expect(codes([list, headline({ kind: "container" })])).toContain("film-container-subject");
    expect(codes([list, headline({ kind: "container", subject: "item-1", durationFrames: 6 })])).toContain("film-container-timing");
    expect(codes([list, headline({ kind: "container", subject: "item-1", durationFrames: 60 })])).toContain("film-container-timing");
    expect(codes([list, headline({ kind: "container", subject: "item-1", radius: .5 })])).toContain("film-container-radius");
    const big = { ...list, content: { card: "headline", text: "A big tile" }, subjects: { tile: { region: { x: 0, y: 0, width: .9, height: .9 } } } };
    expect(codes([big, headline({ kind: "container", subject: "tile" })])).toContain("film-container-large");
  });
  it("compiles the example", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/container-transform.film.json", "utf8")));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (result.ok) expect(Object.keys(result.film.containers)).toEqual(["solar"]);
  });
});

describe("pass-by", () => {
  const card = (id: string, transition?: object) => ({ id, recipeId: "card", durationFrames: 120, content: { card: "headline", text: id + " happens here" }, ...transition ? { transition } : {} });
  const film = (transition: object): FilmDocument => ({ schemaVersion: 1, id: "pb", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }], scenes: [card("one"), card("two", transition)] as FilmScene[] });
  const codes = (transition: object) => compileFilm(film(transition)).diagnostics.map(item => item.code);

  it("hides the cut behind a foreground that crosses the lens: a dissolve in the plan, drawn by the stage", () => {
    const result = compileFilm(film({ kind: "pass-by" }));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (!result.ok) return;
    expect(result.film.passBys.two).toEqual({ direction: "left", width: .42, color: undefined });
    const window = result.film.cut.transitions[0];
    expect([window.kind, window.endFrame - window.startFrame]).toEqual(["dissolve", 14]);
    expect(evaluateFilm(result.film, window.startFrame + 7).layers.map(layer => layer.sceneId)).toEqual(["one", "two"]);
  });
  it("refuses a vertical pass or a foreground too thin or too wide, and warns on a flash or a slow pass", () => {
    expect(codes({ kind: "pass-by", direction: "up" })).toContain("film-pass-by-direction");
    expect(codes({ kind: "pass-by", width: .1 })).toContain("film-pass-by-width");
    expect(codes({ kind: "pass-by", width: .95 })).toContain("film-pass-by-width");
    expect(codes({ kind: "pass-by", durationFrames: 4 })).toContain("film-pass-by-timing");
    expect(codes({ kind: "pass-by", durationFrames: 40 })).toContain("film-pass-by-timing");
    expect(codes({ kind: "pass-by", direction: "right", width: .5, durationFrames: 12 }).filter(code => code.startsWith("film-pass-by"))).toEqual([]);
  });
  it("compiles the example", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/pass-by.film.json", "utf8")));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (result.ok) expect(Object.keys(result.film.passBys)).toEqual(["fall"]);
  });
});

describe("annotated picture", () => {
  const image = { id: "p", src: "p.jpg", alt: "A picture", width: 3200, height: 2000, licenseRef: "x" };
  const mark = (id: string, at: number, extra: object = {}) => ({ id, kind: "circle" as const, region: { x: .6, y: .4, width: .02, height: .04 }, note: "One person, for scale", at, ...extra });
  const content = (marks: object[], extra: object = {}): AnnotateContent => ({ image, label: "A picture with marks.", marks, ...extra } as AnnotateContent);
  const codes = (c: AnnotateContent, frames = 400) => compileAnnotate(c, frames, 30).problems.map(item => item.code);

  it("drifts while the picture registers, then holds the camera still while each mark is drawn and read", () => {
    const { plan } = compileAnnotate(content([mark("a", 60), mark("b", 200, { kind: "span", region: { x: .5, y: .1, width: .3, height: .4 } })]), 360, 30);
    if (!plan) throw new Error("no plan");
    const [a, b] = plan.marks;
    expect([a.view, b.view]).toEqual(["push", "wide"]);
    expect(annotateFrame(plan, 10, 1920, 1080).view.zoom).toBeLessThan(annotateFrame(plan, 30, 1920, 1080).view.zoom);
    expect(annotateFrame(plan, a.at, 1920, 1080).view).toEqual(annotateFrame(plan, b.moveStart - 1, 1920, 1080).view);
    const during = annotateFrame(plan, a.at + 4, 1920, 1080).marks[0];
    expect(during.draw).toBeGreaterThan(0); expect(during.draw).toBeLessThan(1); expect(during.note).toBe(0);
    expect(annotateFrame(plan, a.at + 4, 1920, 1080, true).marks[0].draw).toBe(1);
    expect(annotateFrame(plan, b.at + 30, 1920, 1080).marks.map(item => item.mark.id)).toEqual(["b"]);
  });
  it("pushes in on a detail without showing the picture's edge, and aims a narrow frame at it", () => {
    const view = markView(content([]), { region: { x: .97, y: .02, width: .02, height: .03 }, view: "push" }, 1920, 1080), cover = 1920 / 3200;
    expect(view.cx + 1920 / (2 * cover * view.zoom)).toBeLessThanOrEqual(3200 + 1e-6);
    expect(view.cy - 1080 / (2 * cover * view.zoom)).toBeGreaterThanOrEqual(-1e-6);
    expect(markView(content([]), { region: { x: .8, y: .2, width: .1, height: .2 }, view: "wide" }, 1080, 1920).cx).toBeGreaterThan(1600);
  });
  it("checks the picture, the marks, their notes and the time to read them", () => {
    expect(codes(content([mark("a", 60)]))).toEqual([]);
    expect(codes(content([]))).toContain("annotate-marks");
    expect(codes(content([mark("a", 40), mark("b", 140), mark("c", 240), mark("d", 300), mark("e", 340)]), 600)).toContain("annotate-crowded");
    expect(codes(content([mark("a", 60, { region: { x: .9, y: .1, width: .2, height: .1 } })]))).toContain("annotate-region");
    expect(codes(content([mark("a", 100), mark("b", 90)]))).toContain("annotate-order");
    expect(codes(content([mark("a", 60, { note: "one two three four five six seven eight nine ten" })]))).toContain("annotate-note-long");
    expect(codes(content([mark("a", 60), mark("b", 110)]))).toContain("annotate-rushed");
    expect(codes(content([mark("a", 60)]), 120)).toContain("annotate-short");
    expect(codes(content([mark("a", 20)]))).toContain("annotate-first-early");
    expect(codes(content([mark("a", 40)], { title: "A thesis of several words to read" }))).toContain("annotate-title-short");
    expect(codes({ ...content([mark("a", 60)]), image: { ...image, licenseRef: undefined } })).toContain("annotate-licence");
  });
  it("clears a mark at its until frame, warns when that is before its note is read, and holds the thesis for titleAt", () => {
    const { plan } = compileAnnotate(content([mark("a", 60, { until: 170 })]), 200, 30);
    if (!plan) throw new Error("no plan");
    expect(annotateFrame(plan, 175, 1920, 1080).marks[0].opacity).toBeLessThan(1);
    expect(annotateFrame(plan, 185, 1920, 1080).marks).toEqual([]);
    expect(codes(content([mark("a", 60, { until: 90 })]))).toContain("annotate-rushed");
    expect(codes(content([mark("a", 60, { until: 50 })]))).toContain("annotate-order");
    const titled = compileAnnotate(content([mark("a", 160)], { title: "Short thesis", titleAt: 40 }), 400, 30).plan!;
    expect(annotateFrame(titled, 30, 1920, 1080).title).toBe(0);
    expect(annotateFrame(titled, 60, 1920, 1080).title).toBe(1);
  });
  it("compiles the example, with a moment for each mark", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/annotate.film.json", "utf8")));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (result.ok) expect(result.film.scenes[0].cues.map(cue => cue.id)).toEqual(["start", "person", "height", "foot"]);
  });
});

describe("loop ending", () => {
  const card = (id: string, content: object = { card: "headline", text: id + " happens here" }) => ({ id, recipeId: "card", durationFrames: 120, content });
  const film = (loop: object, scenes: object[] = [card("one"), card("two")], frames = 30): FilmDocument => ({ schemaVersion: 1, id: "lp", fps: { num: frames, den: 1 }, outputs: [{ id: "o", width: 720, height: 1280 }], scenes: scenes as FilmScene[], loop });
  it("dissolves the last frames into the first, so a replay has no seam", () => {
    const result = compileFilm(film({}));
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    expect(result.film.loop).toEqual({ startFrame: 228, frames: 12 });
    expect(compileFilm(film({ frames: 20 })).ok && (compileFilm(film({ frames: 20 })) as { film: { loop: unknown } }).film.loop).toEqual({ startFrame: 220, frames: 20 });
  });
  it("refuses a flash or a long dissolve, and warns on a long film or an end card's call to action", () => {
    const codes = (doc: FilmDocument) => compileFilm(doc).diagnostics.map(item => item.code);
    expect(codes(film({ frames: 3 }))).toContain("film-loop-frames");
    expect(codes(film({ frames: 60 }))).toContain("film-loop-frames");
    expect(codes(film({}, Array.from({ length: 16 }, (_, i) => card("s" + i))))).toContain("film-loop-long");
    expect(codes({ ...film({}, [card("one"), card("end", { card: "end" })]), brand: { name: "Brand A", color: "#2f6bff", cta: { text: "Try it" } } })).toContain("film-loop-end-card");
  });
  it("compiles the example", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/loop.film.json", "utf8")));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (result.ok) expect(result.film.loop).toEqual({ startFrame: 462, frames: 18 });
  });
});

describe("zoom through", () => {
  const list = { id: "contents", recipeId: "card", durationFrames: 170, content: { card: "list", title: "Two charts", items: ["One question", "Another question"] } };
  const next = (transition: object) => ({ id: "inside", recipeId: "card", durationFrames: 120, content: { card: "headline", text: "Inside it now" }, transition });
  const film = (scenes: object[]): FilmDocument => ({ schemaVersion: 1, id: "zt", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }], scenes: scenes as FilmScene[] });
  const codes = (scenes: object[]) => compileFilm(film(scenes)).diagnostics.map(item => item.code);
  it("pushes into a measured or declared region, drawn as a dissolve of its length", () => {
    const result = compileFilm(film([list, next({ kind: "zoom", subject: "item-1", edge: "soft" })]));
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    expect(result.film.zooms.inside).toEqual({ subject: "item-1", from: undefined, edge: "soft" });
    expect(result.film.cut.transitions[0].endFrame - result.film.cut.transitions[0].startFrame).toBe(36);
    const screen = { ...list, content: { card: "headline", text: "A screen to enter" }, subjects: { screen: { region: { x: .3, y: .3, width: .4, height: .4 } } } };
    const declared = compileFilm(film([screen, next({ kind: "zoom", subject: "screen" })]));
    if (declared.ok) expect(declared.film.zooms.inside).toEqual({ subject: "screen", from: { x: 384, y: 216, width: 512, height: 288 }, edge: "hard" });
  });
  it("refuses an unknown region or edge, and warns on a jump, a crawl or a region magnified past 8×", () => {
    expect(codes([list, next({ kind: "zoom", subject: "nothing" })])).toContain("film-zoom-subject");
    expect(codes([list, next({ kind: "zoom", subject: "item-1", edge: "round" })])).toContain("schema-value");
    expect(codes([list, next({ kind: "zoom", subject: "item-1", durationFrames: 10 })])).toContain("film-zoom-timing");
    expect(codes([list, next({ kind: "zoom", subject: "item-1", durationFrames: 90 })])).toContain("film-zoom-timing");
    const tiny = { ...list, content: { card: "headline", text: "A tiny window" }, subjects: { dot: { region: { x: .5, y: .5, width: .05, height: .05 } } } };
    expect(codes([tiny, next({ kind: "zoom", subject: "dot" })])).toContain("film-zoom-deep");
  });
  it("lets an annotated picture's marks be zoomed into, and compiles the example", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/zoom-through.film.json", "utf8")));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (result.ok) expect(result.film.zooms.dynjandi).toMatchObject({ subject: "glow", edge: "soft" });
  });
});

describe("colour script", () => {
  // Three quarters deep teal, one quarter warm sand.
  const image = (() => { const width = 40, height = 20, data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(x < 30 ? [20, 70, 80, 255] : [220, 190, 140, 255], (y * width + x) * 4);
    return { width, height, data }; })();
  it("finds a frame's main colours and their shares, where a mean would be a grey", () => {
    const tone = frameTone(image, 1);
    expect(tone.palette.slice(0, 2).map(item => [item.rgb, +item.share.toFixed(2)])).toEqual([[[20, 70, 80], .75], [[220, 190, 140], .25]]);
    expect(tone.palette.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(1);
    expect(tone.warmth).toBeLessThan(.1);
    expect(tone.luminance).toBeGreaterThan(0);
  });
  it("gives the same palette every time", () => expect(frameTone(image, 2)).toEqual(frameTone(image, 2)));
});

describe("draw-on", () => {
  const stroke = (id: string, at: number, extra: object = {}) => ({ id, points: [[10, 10], [60, 10], [60, 40]], at, frames: 30, ...extra });
  const content = (strokes: object[], extra: object = {}): DrawOnContent => ({ label: "A drawing.", canvas: { width: 160, height: 90 }, strokes, ...extra } as DrawOnContent);
  const codes = (c: DrawOnContent, frames = 300) => compileDrawOn(c, frames, 30).problems.map(item => item.code);
  it("puts the pen on the end of the line, lifts it between strokes, and blooms a wash once an outline closes", () => {
    const { plan } = compileDrawOn(content([stroke("a", 10, { closed: true, fill: "#d8b98a" }), stroke("b", 80)]), 300, 30);
    if (!plan) throw new Error("no plan");
    const a = plan.strokes[0], mid = drawOnFrame(plan, 25);
    expect(mid.pen?.down).toBe(true);
    expect(mid.pen?.at).toEqual(pointAlong(a, 15 / 30));
    expect(mid.strokes[0].wash).toBe(0);
    expect(drawOnFrame(plan, 60).pen?.down).toBe(false);
    expect(drawOnFrame(plan, 70).strokes[0].wash).toBeGreaterThan(0);
    expect(drawOnFrame(plan, 25, true).strokes[0].drawn).toBe(1);
    expect(drawOnFrame(plan, 25, true).pen).toBeUndefined();
  });
  it("measures a smooth stroke along its length", () => {
    const g = strokeGeometry({ points: [[0, 0], [10, 0]] });
    expect(g.length).toBeCloseTo(10);
    expect(pointAlong({ ...g }, .5)[0]).toBeCloseTo(5);
    expect(strokeGeometry({ points: [[0, 0], [10, 0], [10, 10]], corners: true }).length).toBeCloseTo(20);
  });
  it("checks strokes, their pace and order, labels' reading time and labels in each output's shape", () => {
    expect(codes(content([stroke("a", 10)]))).toEqual([]);
    expect(codes(content([]))).toContain("draw-strokes");
    expect(codes(content([stroke("a", 10, { points: [[10, 10], [200, 10]] })]))).toContain("draw-points");
    expect(codes(content([stroke("a", 10, { frames: 3, points: [[0, 0], [160, 90]] })]))).toContain("draw-fast");
    expect(codes(content([stroke("a", 10), stroke("b", 20)]))).toContain("draw-overlap");
    expect(codes(content([stroke("a", 10, { fill: "#fff" })]))).toContain("draw-fill-open");
    expect(codes(content([stroke("a", 10, { label: { text: "A label to read", at: [20, 20] } }), stroke("b", 45, { label: { text: "Next", at: [80, 60] } })]))).toContain("draw-rushed");
    expect(codes(content([stroke("a", 280)]))).toContain("draw-short");
    const crowded = content([stroke("a", 10, { label: { text: "The first long label", at: [40, 20] } }), stroke("b", 120, { label: { text: "A second long label", at: [44, 21] } })]);
    expect(inspectDrawOnOutput(crowded, 1080, 1920).map(item => item.code)).toContain("draw-label-collision");
    expect(inspectDrawOnOutput(content([stroke("a", 10, { label: { text: "Off the edge of the frame", at: [150, 50] } })]), 1080, 1920).map(item => item.code)).toContain("draw-label-outside");
  });
  it("compiles the example, with a moment for each stroke", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/draw-on.film.json", "utf8")));
    expect(result.diagnostics).toEqual([]);
    if (result.ok) expect(result.film.scenes[0].cues.length).toBe(10);
  });
});

describe("title sequence", () => {
  const piece = (id: string, at: number, extra: object = {}) => ({ id, points: [[20, 20], [60, 20], [60, 60], [20, 60]], color: "#1b1a17", at, ...extra });
  const content = (extra: object = {}): TitleSequenceContent => ({ label: "A title.", canvas: { width: 160, height: 90 }, shapes: [piece("a", 0), piece("b", 14, { from: "left" })],
    title: { text: "A short title", at: 40, box: { x: 80, y: 30, width: 70, height: 9 } }, ...extra } as unknown as TitleSequenceContent);
  const codes = (c: TitleSequenceContent, frames = 160) => compileTitleSequence(c, frames, 30).problems.map(item => item.code);
  it("brings the pieces in on twos, settles them, then lays the title in word by word", () => {
    const { plan } = compileTitleSequence(content(), 160, 30);
    if (!plan) throw new Error("no plan");
    expect(titleFrame(plan, 17).pieces[1]).toEqual(titleFrame(plan, 16).pieces[1]);
    expect(titleFrame(plan, 16).pieces[1].dx).toBeLessThan(0);
    expect(titleFrame(plan, 40).pieces[1].dx).toBeCloseTo(0);
    expect([titleFrame(plan, 39).title, titleFrame(plan, 40).title, titleFrame(plan, 46).title]).toEqual([0, 1, 3]);
    expect(titleFrame(plan, 16, true).pieces[1].dx).toBeCloseTo(0);
  });
  it("cuts each piece's edge the same way every time", () => {
    const a = cutEdge({ id: "x", points: [[0, 0], [100, 0], [100, 50]] }, { width: 160, height: 90 });
    expect(a).toEqual(cutEdge({ id: "x", points: [[0, 0], [100, 0], [100, 50]] }, { width: 160, height: 90 }));
    expect(a.length).toBeGreaterThan(3);
  });
  it("keeps to one symbol built before the title, and gives each line its reading time and room", () => {
    expect(codes(content())).toEqual([]);
    expect(codes(content({ shapes: [] }))).toContain("title-symbol");
    expect(codes(content({ shapes: Array.from({ length: 13 }, (_, i) => piece("p" + i, i)) }))).toContain("title-many-pieces");
    expect(codes(content({ title: { text: "A short title", at: 10, box: { x: 80, y: 30, width: 70, height: 9 } } }))).toContain("title-before-symbol");
    expect(codes(content(), 70)).toContain("title-short");
    expect(codes(content({ credits: [{ text: "A credit line", at: 50, box: { x: 80, y: 45, width: 70, height: 4 } }] }))).toContain("title-rushed");
    expect(codes(content({ shapes: [piece("a", 0, { points: [[0, 0], [200, 0], [0, 50]] })] }))).toContain("title-shape");
    expect(inspectTitleOutput(content({ title: { text: "A title far too long for its box", at: 40, box: { x: 80, y: 30, width: 30, height: 9 } } }), 1920, 1080).map(item => item.code)).toContain("title-overflow");
  });
  it("compiles the example", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/title-sequence.film.json", "utf8")));
    expect(result.diagnostics).toEqual([]);
    if (result.ok) expect(result.film.scenes[0].cues.map(cue => cue.id)).toEqual(["start", "symbol", "title", "credit-1"]);
  });
});

describe("dip and fade", () => {
  const card = (id: string, transition?: object) => ({ id, recipeId: "card", durationFrames: 120, content: { card: "headline", text: id + " happens here" }, ...transition ? { transition } : {} });
  const film = (transition: object, extra: Partial<FilmDocument> = {}): FilmDocument => ({ schemaVersion: 1, id: "dip", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }], scenes: [card("one"), card("two", transition)] as FilmScene[], ...extra });
  const codes = (transition: object, extra: Partial<FilmDocument> = {}) => compileFilm(film(transition, extra)).diagnostics.map(item => item.code);

  it("goes down to a colour, holds and comes up: a dissolve in the plan, its length from its hold, and quiet in the accents", () => {
    const result = compileFilm(film({ kind: "dip" }));
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    expect(result.film.dips.two).toEqual({ color: "#000000", hold: 6, text: undefined, ink: "#f6f4ef" });
    const window = result.film.cut.transitions[0];
    expect([window.kind, window.endFrame - window.startFrame]).toEqual(["dissolve", 22]);
    const frames = window.endFrame - window.startFrame, at = (i: number) => dipFrame(result.film.dips.two, i / (frames - 1), frames);
    expect([at(0).incoming, at(7).veil, at(10).veil, at(21).incoming]).toEqual([false, 1, 1, true]);
    expect(at(0).veil).toBeGreaterThan(0);
    expect(at(21).veil).toBeGreaterThan(0);
    expect(at(21).veil).toBeLessThan(at(16).veil);
    const kit = { sounds: { whoosh: { file: "whoosh.wav", peakSeconds: .2 }, ping: { file: "ping.wav", peakSeconds: 0 } } };
    const audio = compileFilm(film({ kind: "dip" }, { audio: { lanes: [], accents: { kit: "kit" }, licenseRef: "x" } }), { accentKit: kit });
    if (audio.ok) expect(audio.film.audio?.sounds?.filter(item => item.id.includes("whoosh"))).toEqual([]);
  });
  it("holds a line for its reading time, and warns when the line is cut short, the colour sits empty or a light colour lingers", () => {
    const result = compileFilm(film({ kind: "dip", text: "Two hours west" }));
    if (!result.ok) throw new Error("did not compile");
    expect(result.film.dips.two.hold).toBe(54);
    expect(codes({ kind: "dip", text: "Two hours west", holdFrames: 20 })).toContain("dip-text-time");
    expect(codes({ kind: "dip", holdFrames: 60 })).toContain("dip-hold-long");
    expect(codes({ kind: "dip", color: "#ffffff", holdFrames: 30 })).toContain("dip-white-long");
    expect(codes({ kind: "dip", durationFrames: 8 })).toContain("dip-frames");
    expect(codes({ kind: "dip", color: "black" })).toContain("dip-color");
    expect(codes({ kind: "dip", durationFrames: 60 })).toContain("dip-timing");
    expect(codes({ kind: "dip", color: "#1d3b6e" }).filter(code => code.startsWith("dip-"))).toEqual([]);
  });
  it("lets light fall off evenly: the veil is stronger than a plain fade at the same point", () => {
    expect(veilOpacity(0)).toBe(0);
    expect(veilOpacity(1)).toBe(1);
    expect(veilOpacity(.5)).toBeCloseTo(1 - .5 ** (1 / 2.2), 6);
    expect(inkFor("#ffffff")).toBe("#101418");
  });
  it("fades the film in from a colour and out to it, and warns on a fade out in a loop", () => {
    const result = compileFilm(film({ kind: "cut" }, { fade: { in: 12, out: 18 } }));
    if (!result.ok) throw new Error("did not compile");
    const fade = result.film.fade!, last = result.film.durationFrames - 1;
    expect([fadeVeil(fade, 0, last + 1), fadeVeil(fade, 12, last + 1), fadeVeil(fade, 100, last + 1), fadeVeil(fade, last, last + 1)]).toEqual([1, 0, 0, 1]);
    expect(codes({ kind: "cut" }, { fade: { out: 18 }, loop: {} })).toContain("fade-loop");
    expect(codes({ kind: "cut" }, { fade: { in: 500 } })).toContain("fade-frames");
    expect(codes({ kind: "cut" }, { fade: { in: 3 } })).toContain("fade-short");
  });
  it("warns when the dip hides the incoming scene's opening, and compiles the example", () => {
    const example = JSON.parse(readFileSync("examples/film/dip.film.json", "utf8")) as FilmDocument;
    const result = compileFilm(example);
    expect(result.diagnostics.filter(item => item.severity === "error" || item.code.startsWith("dip-"))).toEqual([]);
    const early = { ...example, scenes: example.scenes.map((scene, i) => i === 1 ? { ...scene, content: { ...scene.content, titleAt: 6 } } : scene) } as FilmDocument;
    expect(compileFilm(early).diagnostics.map(item => item.code)).toContain("dip-hides-start");
  });
});

describe("flash cut, burst and polarity flip", () => {
  const card = (id: string, extra: object = {}) => ({ id, recipeId: "card", durationFrames: 120, content: { card: "headline", text: id + " happens here" }, ...extra });
  const film = (scenes: object[]): FilmDocument => ({ schemaVersion: 1, id: "fl", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }], scenes: scenes as FilmScene[] });
  const codes = (scenes: object[]) => compileFilm(film(scenes)).diagnostics.map(item => item.code);

  it("lands a cut on frames of colour that the next scene burns back through, quiet in the accents", () => {
    const result = compileFilm(film([card("one"), card("two", { transition: { kind: "flash" } })]));
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    expect(result.film.flashes.two).toEqual({ color: "#ffffff", frames: 2, fade: 4 });
    const window = result.film.cut.transitions[0];
    expect(window.endFrame - window.startFrame).toBe(6);
    expect([flashFrame(result.film.flashes.two, 0).veil, flashFrame(result.film.flashes.two, 1).veil]).toEqual([1, 1]);
    expect(flashFrame(result.film.flashes.two, 5).veil).toBeLessThan(flashFrame(result.film.flashes.two, 3).veil);
    expect(codes([card("one"), card("two", { transition: { kind: "flash", frames: 9 } })])).toContain("flash-frames");
    expect(codes([card("one"), card("two", { transition: { kind: "flash", durationFrames: 10 } })])).toContain("flash-duration");
  });
  it("shows each insert of a burst in turn, from scenes at their moments or pictures, and holds the first under reduced motion", () => {
    const picture = { id: "p", src: "p.jpg", alt: "A picture", licenseRef: "x", width: 100, height: 60 };
    const result = compileFilm(film([card("one"), card("two", { transition: { kind: "burst", framesEach: 3, inserts: [{ scene: "one", at: 30 }, { image: picture }, { scene: "two" }] } })]));
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    const burst = result.film.bursts.two;
    expect(burst.inserts).toEqual([{ sceneId: "one", localFrame: 30 }, { src: "p.jpg", alt: "A picture" }, { sceneId: "two", localFrame: 60 }]);
    expect(result.film.cut.transitions[0].endFrame - result.film.cut.transitions[0].startFrame).toBe(9);
    expect([burstInsert(burst, 0), burstInsert(burst, 4), burstInsert(burst, 8), burstInsert(burst, 8, true)]).toEqual([burst.inserts[0], burst.inserts[1], burst.inserts[2], burst.inserts[0]]);
    expect(result.film.manifest.assets?.map(asset => asset.id)).toContain("two/burst/p");
    expect(codes([card("one"), card("two", { transition: { kind: "burst", framesEach: 1, inserts: [{ scene: "one" }, { scene: "one" }] } })])).toContain("burst-frames");
    expect(codes([card("one"), card("two", { transition: { kind: "burst", inserts: [{ scene: "nope" }, { scene: "one" }] } })])).toContain("burst-insert");
    expect(codes([card("one"), card("two", { transition: { kind: "burst", inserts: [{ image: { ...picture, licenseRef: undefined } }, { scene: "one" }] } })])).toContain("burst-licence");
  });
  it("counts changes in light as WCAG does, and refuses a film that flashes more than three times a second", () => {
    expect(flashChanges([.1, .1, 1, 1, .3, .2, .1])).toEqual([2, 6]);
    expect(flashChanges([.9, .95, .85, .9])).toEqual([]);
    expect(peakFlashesPerSecond(flashChanges([.2, .2, .6, .6, .15, .15, .7, .7, .2, .2, .65, .65, .2]), 30)).toBe(3);
    expect(flippedGround("dark", [10, 20], 15)).toBe("light");
    expect(flippedGround("dark", [10, 20], 25)).toBe("dark");
    expect(codes([card("one", { content: { card: "headline", text: "Flip", flips: [20, 26, 32, 38] } })]).filter(code => code === "flash-rate")).toEqual([]);
    expect(codes([card("one", { content: { card: "headline", text: "Flip", flips: [20, 24, 28, 32, 36, 40, 44] } })])).toContain("flash-rate");
    expect(codes([card("one", { content: { card: "headline", text: "Flip", flips: [20, 22] } })])).toContain("card-flip-close");
  });
  it("compiles the example", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/flash.film.json", "utf8")));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (result.ok) expect([Object.keys(result.film.flashes), Object.keys(result.film.bursts)]).toEqual([["cave", "lagoon"], ["dynjandi"]]);
  });
});

describe("shape wipe", () => {
  const card = (id: string, extra: object = {}) => ({ id, recipeId: "card", durationFrames: 120, content: { card: "headline", text: id + " happens here" }, ...extra });
  const film = (scenes: object[], extra: Partial<FilmDocument> = {}): FilmDocument => ({ schemaVersion: 1, id: "sw", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }], scenes: scenes as FilmScene[], ...extra });
  const codes = (scenes: object[], extra: Partial<FilmDocument> = {}) => compileFilm(film(scenes, extra)).diagnostics.map(item => item.code);
  const glow = { subjects: { glow: { region: { x: .7, y: .4, width: .1, height: .2 } } } };

  it("opens the next scene through a circle grown from a subject's centre, covering the far corner on its last frame", () => {
    const result = compileFilm(film([card("one", glow), card("two", { transition: { kind: "shape", subject: "glow", color: "#ffffff" } })]));
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    const wipe = result.film.shapes.two;
    expect(wipe).toEqual({ shape: "circle", origin: { x: 960, y: 360 }, edge: "#ffffff", mark: undefined });
    expect(result.film.cut.transitions[0].endFrame - result.film.cut.transitions[0].startFrame).toBe(16);
    expect(coverSize("circle", wipe.origin, 1280, 720)).toBeCloseTo(Math.hypot(960, 360), 6);
    expect(shapeWipeFrame(wipe, 1, 1280, 720).clipPath).toBe(`circle(${Math.hypot(960, 360)}px at 960px 360px)`);
    expect(shapeWipeFrame(wipe, 0, 1280, 720).clipPath).toBe("circle(0px at 960px 360px)");
    expect(coverSize("diamond", { x: 640, y: 360 }, 1280, 720)).toBe(1000);
  });
  it("grows the brand mark and fades the rest of the scene in around it, and refuses a mark wipe without a mark", () => {
    const brand = { name: "B", color: "#2f6bff", mark: { id: "m", src: "m.svg", alt: "Mark", licenseRef: "x" } };
    const result = compileFilm(film([card("one"), card("two", { transition: { kind: "shape", shape: "mark" } })], { brand }));
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    expect(result.film.shapes.two.mark).toBe("m.svg");
    expect([shapeWipeFrame(result.film.shapes.two, .5, 1280, 720).around, shapeWipeFrame(result.film.shapes.two, 1, 1280, 720).around]).toEqual([0, 1]);
    expect(codes([card("one"), card("two", { transition: { kind: "shape", shape: "mark" } })])).toContain("shape-mark");
    expect(codes([card("one"), card("two", { transition: { kind: "shape", subject: "nope" } })])).toContain("shape-subject");
    expect(codes([card("one"), card("two", { transition: { kind: "shape", durationFrames: 4 } })])).toContain("shape-timing");
  });
  it("compiles the example", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/shape-wipe.film.json", "utf8")));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (result.ok) expect(Object.values(result.film.shapes).map(item => item.shape)).toEqual(["circle", "diamond", "mark"]);
  });
});

describe("panels", () => {
  const card = (text: string, durationFrames = 160) => ({ recipeId: "card", durationFrames, content: { card: "headline", text } });
  const list = { recipeId: "card", durationFrames: 220, content: { card: "list", title: "Ice", items: ["Holds still", "Lets light through", "Melts"] } };
  const panels = (content: object, durationFrames = 150) => ({ id: "split", recipeId: "panels", durationFrames, content: { label: "Two panels.", ...content } });
  const film = (scene: object, output = { id: "o", width: 1280, height: 720 }): FilmDocument => ({ schemaVersion: 1, id: "pn", fps: { num: 30, den: 1 }, outputs: [output], scenes: [scene] as FilmScene[] });
  const codes = (scene: object) => compileFilm(film(scene)).diagnostics.map(item => item.code);

  it("compiles each panel at its own size, side by side, stacked in a vertical output", () => {
    const result = compileFilm(film(panels({ panels: [card("Left"), card("Right")] })));
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.path + " " + item.message).join("\n"));
    const scene = result.film.scenes[0];
    if (scene.kind !== "panels") throw new Error("not panels");
    expect(scene.plan.boxes.map(box => Math.round(box.width))).toEqual([638, 638]);
    expect(scene.plan.films.map(inner => [inner.width, inner.height])).toEqual([[638, 720], [638, 720]]);
    const tall = compileFilm(film(panels({ panels: [card("Top"), card("Bottom")] }), { id: "v", width: 1080, height: 1920 }));
    if (tall.ok && tall.film.scenes[0].kind === "panels") expect(tall.film.scenes[0].plan.boxes.map(box => Math.round(box.y))).toEqual([0, 963]);
    expect(panelBoxes("grid", 4, 1000, 600, 0).map(box => [box.x, box.y])).toEqual([[0, 0], [500, 0], [0, 300], [500, 300]]);
  });
  it("lines panels up in time: one plays ahead, one waits on its first frame", () => {
    const result = compileFilm(film(panels({ align: { frame: 80, moments: ["item-3", "landed"] }, panels: [list, card("Then it runs", 200)] }, 180)));
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.path + " " + item.message).join("\n"));
    const scene = result.film.scenes[0];
    if (scene.kind !== "panels") throw new Error("not panels");
    expect(scene.plan.leads).toEqual([18, -62]);
    expect([panelFrame(80, 18, 220), panelFrame(10, -62, 200), panelFrame(80, -62, 200)]).toEqual([98, 0, 18]);
    expect(codes(panels({ align: { frame: 80, moments: ["nope", null] }, panels: [list, card("x", 200)] }, 180))).toContain("panels-align");
    expect(codes(panels({ align: { frame: 10, moments: ["item-3", null] }, panels: [list, card("x", 200)] }, 180))).toContain("panels-length");
  });
  it("opens from the centre line outward, and refuses too many panels, a nested panels scene or an unknown layout", () => {
    const left = { x: 0, y: 0, width: 638, height: 720 }, right = { x: 642, y: 0, width: 638, height: 720 };
    expect(panelClip(left, .5, 1280, 720)).toBe("inset(0.0px 0.0px 0.0px 319.0px)");
    expect(panelClip(right, .5, 1280, 720)).toBe("inset(0.0px 319.0px 0.0px 0.0px)");
    expect(panelClip(left, 1, 1280, 720)).toBe("none");
    expect(panelOpen(0, 12, 0)).toBe(0);
    expect(panelOpen(5, 12, 0, true)).toBe(1);
    expect(codes(panels({ panels: [card("a"), card("b"), card("c"), card("d"), card("e")] }))).toContain("panels-count");
    // The schema already refuses a panels scene inside a panel; the compiler's own check backs it up.
    expect(codes(panels({ panels: [card("a"), panels({ panels: [card("b"), card("c")] })] })).some(code => code === "schema-value" || code === "panels-nested")).toBe(true);
    expect(codes(panels({ layout: "ring", panels: [card("a"), card("b")] }))).toContain("schema-value");
  });
  it("compiles the example", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/panels.film.json", "utf8")));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
  });
});

describe("stutter", () => {
  const card = (extra: object) => ({ id: "one", recipeId: "card", durationFrames: 140, content: { card: "headline", text: "A word lands" }, ...extra });
  const film = (scene: object): FilmDocument => ({ schemaVersion: 1, id: "st", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }], scenes: [scene] as FilmScene[] });
  const codes = (scene: object) => compileFilm(film(scene)).diagnostics.map(item => item.code);

  it("plays a few content frames again and again, then carries on later by the repeats, moving later moments with it", () => {
    const result = compileFilm(film(card({ stutter: { at: 20, frames: 4, repeats: 2 } })));
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    const map = result.film.scenes[0].speed!.map;
    expect(map.slice(18, 36)).toEqual([18, 19, 20, 21, 22, 23, 20, 21, 22, 23, 20, 21, 22, 23, 24, 25, 26, 27]);
    expect(map[map.length - 1]).toBe(132);
    const plain = compileFilm(film(card({ durationFrames: 132 })));
    if (!plain.ok) throw new Error("did not compile");
    const landed = (f: typeof plain.film) => f.scenes[0].cues.find(cue => cue.id === "landed")!.frame;
    // "landed" (content frame 18) comes before this stutter, so it stays; one placed earlier moves it on by the repeats.
    expect(landed(result.film)).toBe(landed(plain.film));
    const early = compileFilm(film(card({ stutter: { at: 10, frames: 4, repeats: 2 } })));
    if (!early.ok) throw new Error("did not compile");
    expect(landed(early.film)).toBe(landed(plain.film) + 8);
  });
  it("resolves a moment, and refuses a stutter that does not fit, too long or combined with another time map", () => {
    const at = compileFilm(film(card({ stutter: { at: "landed" } })));
    expect(at.ok).toBe(true);
    expect(codes(card({ stutter: { at: 130, frames: 8 } }))).toContain("stutter-range");
    expect(codes(card({ stutter: { at: 10, frames: 12 } }))).toContain("stutter-frames");
    expect(codes(card({ stutter: { at: "nope" } }))).toContain("stutter-moment");
    expect(codes(card({ stutter: { at: 10 }, play: { from: 0, frames: 60 } }))).toContain("stutter-time-map");
  });
  it("compiles the example", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/stutter.film.json", "utf8")));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
  });
});

describe("word flash and type wall", () => {
  const card = (content: object, durationFrames = 120) => ({ id: "one", recipeId: "card", durationFrames, content });
  const film = (scene: object): FilmDocument => ({ schemaVersion: 1, id: "tw", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }], scenes: [scene] as FilmScene[] });
  const codes = (scene: object) => compileFilm(film(scene)).diagnostics.map(item => item.code);

  it("shows one word at a time, about a fifth of a second each, holding the stressed word, with a moment per word", () => {
    const timing = wordFlashTiming({ text: "Your budget leaks a little every single week", hold: ["leaks"] }, 30);
    expect(timing.map(item => item.frames)).toEqual([6, 6, 30, 5, 6, 6, 6, 6]);
    expect(timing.map(item => item.start).slice(0, 4)).toEqual([3, 9, 15, 45]);
    expect(cardCues({ card: "words", text: "One two", hold: [] }, 30).map(cue => cue.id)).toEqual(["word-1", "word-2", "landed"]);
    expect(flashWords("予算は毎週、少しずつ漏れている。")).toEqual(["予算は", "毎週、", "少しずつ", "漏れている。"]);
    expect(flashWords("Wait, what? It works.")).toEqual(["Wait,", "what?", "It", "works."]);
  });
  it("refuses words too fast to read or a held word that is not there, and warns on one flat pace or too short a card", () => {
    expect(codes(card({ card: "words", text: "One two three", framesPerWord: 2 }))).toContain("card-words-fast");
    expect(codes(card({ card: "words", text: "One two three", hold: ["four"] }))).toContain("card-words-hold");
    expect(codes(card({ card: "words", text: "one two three four five six" }))).toContain("card-words-monotone");
    expect(codes(card({ card: "words", text: "Your budget leaks a little every single week", hold: ["leaks"] }, 40))).toContain("card-short");
    expect(codes(card({ card: "words", text: "Your budget leaks a little every single week", hold: ["leaks"] })).filter(code => code.startsWith("card-"))).toEqual([]);
  });
  it("checks a wall's word, rows, speed and accent row", () => {
    expect(codes(card({ card: "wall", word: "two words" }))).toContain("card-wall-word");
    expect(codes(card({ card: "wall", word: "never", rows: 2 }))).toContain("card-wall-rows");
    expect(codes(card({ card: "wall", word: "never", speed: 2 }))).toContain("card-wall-speed");
    expect(codes(card({ card: "wall", word: "never", accentRow: 9 }))).toContain("card-wall-accent");
    expect(codes(card({ card: "wall", word: "never" })).filter(code => code.startsWith("card-"))).toEqual([]);
  });
  it("compiles the example", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/type-moves.film.json", "utf8")));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
  });
});

describe("organic matte and dither", () => {
  const card = (id: string, extra: object = {}) => ({ id, recipeId: "card", durationFrames: 120, content: { card: "headline", text: id + " happens here" }, ...extra });
  const film = (scenes: object[]): FilmDocument => ({ schemaVersion: 1, id: "mt", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }], scenes: scenes as FilmScene[] });
  const codes = (scenes: object[]) => compileFilm(film(scenes)).diagnostics.map(item => item.code);
  const glow = { subjects: { glow: { region: { x: .7, y: .4, width: .1, height: .2 } } } };

  it("grows ink from a subject, the same for the same seed, showing only the old scene first and only the new one last", () => {
    const result = compileFilm(film([card("one", glow), card("two", { transition: { kind: "matte", subject: "glow", color: "#08131f" } })]));
    if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
    const matte = result.film.mattes.two;
    expect(matte).toEqual({ texture: "ink", seed: 1, origins: [{ x: .75, y: .5 }], edge: "#08131f" });
    expect(result.film.cut.transitions[0].endFrame - result.film.cut.transitions[0].startFrame).toBe(26);
    const field = matteField(matte, 48, 27, 16 / 9), again = matteField(matte, 48, 27, 16 / 9);
    expect(Array.from(field.field)).toEqual(Array.from(again.field));
    expect(Math.max(...matteAlpha("ink", field, 0).reveal)).toBe(0);
    expect(Math.min(...matteAlpha("ink", field, 1).reveal)).toBe(255);
    // Ink starts where it is told: halfway through, the cell at the subject is revealed and the far corner is not.
    const half = matteAlpha("ink", field, .35).reveal;
    expect(half[Math.floor(.5 * 27) * 48 + Math.floor(.75 * 48)]).toBe(255);
    expect(half[0]).toBe(0);
    expect(Array.from(matteField({ ...matte, seed: 2 }, 48, 27, 16 / 9).field)).not.toEqual(Array.from(field.field));
  });
  it("sweeps a brush from left to right, and dithers cell by cell in an ordered pattern", () => {
    const brush = matteField({ texture: "brush", seed: 1, origins: [] }, 48, 27, 16 / 9), half = matteAlpha("brush", brush, .5).reveal;
    expect(half[13 * 48 + 2]).toBe(255);
    expect(half[13 * 48 + 45]).toBe(0);
    const count = (t: number) => ditherTile(t).flat().filter(Boolean).length;
    expect([count(0), count(.5), count(1)]).toEqual([0, 32, 64]);
    const result = compileFilm(film([card("one"), card("two", { transition: { kind: "dither" } })]));
    if (result.ok) expect(result.film.dithers.two).toEqual({ cell: .008 });
  });
  it("refuses an unknown texture, subject or cell size, and warns on a matte too quick or too slow", () => {
    expect(codes([card("one"), card("two", { transition: { kind: "matte", subject: "nope" } })])).toContain("matte-subject");
    expect(codes([card("one"), card("two", { transition: { kind: "matte", durationFrames: 6 } })])).toContain("matte-timing");
    expect(codes([card("one"), card("two", { transition: { kind: "matte", texture: "smoke", subject: "x" } })]).some(code => code === "matte-subject" || code === "matte-subject-unused")).toBe(true);
    expect(codes([card("one"), card("two", { transition: { kind: "dither", cell: .2 } })])).toContain("dither-cell");
  });
  it("compiles the example", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/matte.film.json", "utf8")));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
    if (result.ok) expect([Object.values(result.film.mattes).map(item => item.texture), Object.keys(result.film.dithers)]).toEqual([["ink", "brush", "smoke"], ["close"]]);
  });
});

describe("headline reveals", () => {
  const card = (content: object, durationFrames = 140) => ({ id: "one", recipeId: "card", durationFrames, content: { card: "headline", ...content } });
  const film = (scene: object): FilmDocument => ({ schemaVersion: 1, id: "rv", fps: { num: 30, den: 1 }, outputs: [{ id: "o", width: 1280, height: 720 }], scenes: [scene] as FilmScene[] });
  const codes = (scene: object) => compileFilm(film(scene)).diagnostics.map(item => item.code);

  it("scrambles letters among glyphs of their own kind, the same at any frame, and locks them left to right", () => {
    const a = scrambleFrame("Every receipt, matched", 8, 3, 1), b = scrambleFrame("Every receipt, matched", 8, 3, 1);
    expect(a).toEqual(b);
    expect(a.filter(item => item.final === " " || item.final === ",").every(item => item.shown === item.final)).toBe(true);
    expect(a.every(item => item.locked || /[a-zA-Z]/.test(item.shown))).toBe(true);
    const locks = scrambleLocks("Every receipt, matched", 3);
    expect(locks).toEqual([...locks].sort((x, y) => x - y));
    expect(scrambleFrame("Every receipt, matched", locks[locks.length - 1], 3).every(item => item.locked)).toBe(true);
  });
  it("swells each word from thin to heavy, a word after the one before", () => {
    expect(swellWeight(3, 3, 0)).toBe(160);
    expect(swellWeight(15, 3, 0)).toBe(820);
    expect(swellWeight(15, 3, 1)).toBeLessThan(820);
    expect(swellDone("Built to carry weight", 3)).toBe(24);
  });
  it("rebuilds a line by carrying matching letters in order, and times the rebuild after the first line is read", () => {
    const pairs = rebuildPairs("the design has been", "re-engineered");
    expect(pairs.moves.length).toBe(9);
    expect(pairs.arriving).toEqual([0, 2, 10, 11]);
    expect(new Set(pairs.moves.map(move => move.from)).size).toBe(pairs.moves.length);
    expect(cardCues({ card: "headline", text: "re-engineered", from: "the design has been", reveal: "rebuild" }, 30).map(cue => cue.id)).toEqual(["from", "rebuild", "landed"]);
  });
  it("refuses an unknown reveal or a rebuild without its first line, and warns on scrambled CJK or a rebuild that shares few letters", () => {
    expect(codes(card({ text: "Hi", reveal: "spin" }))).toContain("schema-value");
    expect(codes(card({ text: "re-engineered", reveal: "rebuild" }))).toContain("card-reveal-from");
    expect(codes(card({ text: "予算は毎週", reveal: "scramble" }))).toContain("card-scramble-cjk");
    expect(codes(card({ text: "Quiz", from: "boat", reveal: "rebuild" }))).toContain("card-rebuild-few");
    expect(codes(card({ text: "Every receipt, matched", reveal: "scramble" })).filter(code => code.startsWith("card-"))).toEqual([]);
  });
  it("compiles the example", () => {
    const result = compileFilm(JSON.parse(readFileSync("examples/film/reveals.film.json", "utf8")));
    expect(result.diagnostics.filter(item => item.severity === "error")).toEqual([]);
  });
});
