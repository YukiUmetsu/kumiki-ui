/** The one capture page for every film file. `npm run film:render` and `film:review` open it through the film server. */
import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles/global.css";
import "../styles/showcase-font.css";
import { findFrameProblems } from "../../registry/visual/rendered-frame-measures";
import type { FrameContent, FrameProblem } from "../../registry/visual/rendered-frame-measures";
import { collectRenderedText, findMovingText, findTextProblems } from "../../registry/visual/rendered-text-audit";
import type { RenderedTextBox, TextProblem } from "../../registry/visual/rendered-text-audit";
import { FilmStage } from "../../registry/video/film-stage";
import { ShaderFxLayer } from "../../registry/video/shader-fx-react";
import { PageTurnRendererContext } from "../../registry/video/stages/page-turn-story-stage";
import { PageTurnBookCanvas } from "../../registry/video/stages/page-turn-book-canvas";
import { RayWorldStage } from "../../registry/video/ray-world-react";
import { waterDropWorld } from "../../registry/video/ray-world-water-drop";
import { terracedReliefWorld } from "../../registry/video/ray-world-terraced-relief";
import { riverFlightWorld } from "../../registry/video/ray-world-river-flight";
import { compileFilm } from "../../registry/video/film-document";
import type { CompiledFilm, FilmDiagnostic } from "../../registry/video/film-document";
import type { FilmStageProps } from "../../registry/video/film-stage";
import { createStoryTextMeasure } from "../../registry/video/object-story-react";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import { renderFilmObject } from "./film-art";
import { renderFilmScreen } from "./film-screens";

declare global {
  interface Window {
    __kmFilm?: {
      failed: boolean;
      diagnostics: readonly FilmDiagnostic[];
      reviewFrames: CompiledFilm["reviewFrames"];
      /** Audit the frame on screen. `png` is its screenshot, base64. Returns a sheet thumbnail too. */
      inspect: (png: string, sceneId: string, audit: boolean, opening: boolean) => Promise<{ thumbnail: string; problems: (TextProblem | FrameProblem)[]; content?: FrameContent }>;
      /** The text on screen now, and a comparison of two such readings for text still moving while it is read. */
      textBoxes?: () => RenderedTextBox[];
      movingText?: (before: RenderedTextBox[], after: RenderedTextBox[]) => TextProblem[];
      /** Each scene's frames, and whether its look moves the camera (shake moves all text, so the moving-text check skips it). */
      scenes?: Array<{ id: string; startFrame: number; endFrame: number; cameraMoves: boolean }>;
    };
  }
}
const params = new URLSearchParams(location.search);
const WORLDS = { "water-drop": waterDropWorld, "terraced-relief": terracedReliefWorld, "river-flight": riverFlightWorld };

/** The 3D renderer and the files its shots use, loaded only for a film that has a 3D shot; Spark only for a captured place. */
async function loadShot3d(film: CompiledFilm): Promise<FilmStageProps["renderShot3d"]> {
  const shots = film.scenes.flatMap(scene => scene.kind === "shot-3d" ? [scene.content] : []);
  if (!shots.length) return undefined;
  const uses = (shot: string) => shots.some(content => content.shot === shot);
  const chainCounts = [...new Set(shots.flatMap(content => content.shot === "chain-reaction" ? [content.spec.links.length] : []))];
  const [{ createShot3dRenderer }, meadow, canyon, physics, capture, chainBakes, tabletop, race] = await Promise.all([
    import("../../registry/video/film-3d-react"),
    uses("step-inside") ? import("./film-3d-assets").then(m => m.meadowTextures()) : undefined,
    uses("baked-flythrough") ? import("./film-3d-assets").then(m => m.slotCanyon()) : undefined,
    uses("physics-point") ? import("./film-3d-assets").then(m => m.physicsBakes()) : undefined,
    uses("captured-place") ? import("./film-3d-assets").then(m => m.clockTower()) : undefined,
    chainCounts.length ? import("./film-3d-assets").then(m => m.chainBakes(chainCounts)) : undefined,
    uses("tabletop-story") ? import("./film-3d-assets").then(m => m.walnutTable()) : undefined,
    uses("race") ? import("./film-3d-assets").then(m => m.raceTrack()) : undefined,
  ]);
  return createShot3dRenderer({ meadow, bakedSets: canyon && { "slot-canyon": canyon }, physics: physics?.bakes, woods: physics?.woods,
    captures: capture && { "clock-tower": { src: capture.src } }, capturedPlace: capture?.CapturedPlace, chainBakes, tabletop, race });
}

function Film({ film, renderShot3d }: { film: CompiledFilm; renderShot3d: FilmStageProps["renderShot3d"] }) {
  const [frame, setFrame] = useState(0);
  const manifest = useMemo(() => film.manifest, [film]);
  // Without this provider a page turn falls back to flat CSS strips.
  return <PageTurnRendererContext.Provider value={PageTurnBookCanvas}><VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <FilmStage film={film} frame={frame} renderObject={renderFilmObject} reducedMotion={params.get("reduced") === "1"} renderShot3d={renderShot3d} renderScreen={renderFilmScreen}
      renderFx={(spec, context) => <ShaderFxLayer spec={spec} {...context} />}
      renderWorld={(content, context) => <RayWorldStage world={WORLDS[content.world]} images={content.images} samples={content.samples} label={content.label} style={{ width: "100%", height: "100%" }} {...context} />} />
  </VideoExportStage></PageTurnRendererContext.Provider>;
}

async function start() {
  const input = await (await fetch("__document.json")).json();
  // Load the caption face first, so measurement matches what the story draws.
  const family = getComputedStyle(document.documentElement).getPropertyValue("--km-font-body").trim() || "system-ui, sans-serif";
  await document.fonts.load(`700 40px ${family}`);
  const result = compileFilm(input, {
    outputId: params.get("output") ?? undefined,
    objectStory: { measure: createStoryTextMeasure(), captionFont: `700 {size}px ${family}` },
  });
  const root = createRoot(document.getElementById("film")!);
  if (!result.ok) {
    window.__kmFilm = { failed: true, diagnostics: result.diagnostics, reviewFrames: [], inspect: async () => ({ thumbnail: "", problems: [] }) };
    root.render(<pre data-km-film-failed="">{result.diagnostics.map(item => `${item.path}: ${item.message}`).join("\n")}</pre>);
    return;
  }
  const { film } = result;
  window.__kmFilm = { failed: false, diagnostics: result.diagnostics, reviewFrames: film.reviewFrames,
    textBoxes: () => collectRenderedText(document.querySelector("[data-km-video-capture]")!).filter(box => box.opacity >= .5),
    movingText: (before, after) => findMovingText(before, after),
    scenes: film.scenes.map(scene => ({ id: scene.id, startFrame: scene.startFrame, endFrame: scene.endFrame, cameraMoves: Boolean(scene.look && (scene.look.motion.camera === "handheld" || scene.look.motion.camera === "float")) })),
    async inspect(png, sceneId, audit, opening) {
    const image = new Image();
    image.src = "data:image/png;base64," + png;
    await image.decode();
    const canvas = document.createElement("canvas"), context = canvas.getContext("2d", { willReadFrequently: true })!;
    const draw = (width: number, height: number) => { canvas.width = width; canvas.height = height; context.imageSmoothingQuality = "high"; context.drawImage(image, 0, 0, width, height); };
    let problems: (TextProblem | FrameProblem)[] = [], content: FrameContent | undefined;
    if (audit) {
      const boxes = collectRenderedText(document.querySelector("[data-km-video-capture]")!).filter(box => box.opacity >= .5);
      draw(image.width, image.height);
      // The hero is what the viewer must see first, so it is checked on the opening frame of its scene.
      const scene = film.scenes.find(item => item.id === sceneId), name = opening ? scene?.story?.hero : undefined;
      // The hero is a subject box, or every line of the largest text.
      const largest = boxes.reduce<typeof boxes[number] | undefined>((best, box) => !best || box.fontPx > best.fontPx ? box : best, undefined);
      const lines = boxes.filter(box => box.owner === largest?.owner).map(box => box.rect), subject = name && scene?.subjects[name];
      const union = (rects: readonly { x: number; y: number; width: number; height: number }[]) => {
        const x = Math.min(...rects.map(r => r.x)), y = Math.min(...rects.map(r => r.y));
        return { x, y, width: Math.max(...rects.map(r => r.x + r.width)) - x, height: Math.max(...rects.map(r => r.y + r.height)) - y };
      };
      const hero = name === "text" && lines.length ? { name: "the largest text", rect: union(lines) } : subject ? { name: name!, rect: subject.start } : undefined;
      const measured = findFrameProblems({ width: image.width, height: image.height, data: context.getImageData(0, 0, image.width, image.height).data },
        { texts: boxes.flatMap(box => box.color ? [{ text: box.text, rect: box.rect, color: box.color }] : []), hero });
      content = measured.content;
      problems = [...findTextProblems(boxes, { frame: film, safeInset: film.safeInset }), ...measured.problems];
    }
    draw(1280, Math.round(1280 * image.height / image.width));
    return { thumbnail: canvas.toDataURL("image/jpeg", .93).split(",")[1], problems, content };
  } };
  root.render(<Film film={film} renderShot3d={await loadShot3d(film)} />);
}
void start();
