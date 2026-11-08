import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { findFrameProblems, frameContent, textContrast } from "../registry/visual/rendered-frame-measures";
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
