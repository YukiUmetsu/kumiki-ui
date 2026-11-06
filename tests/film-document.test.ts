import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { findTextProblems } from "../registry/visual/rendered-text-audit";
import { compileFilm, evaluateFilm } from "../registry/video/film-document";
import type { FilmDocument, FilmScene } from "../registry/video/film-document";
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
