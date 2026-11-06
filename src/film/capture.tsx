/** The one capture page for every film file. `npm run film:render` and `film:review` open it through the film server. */
import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles/global.css";
import "../styles/showcase-font.css";
import { collectRenderedText, findTextProblems } from "../../registry/visual/rendered-text-audit";
import { FilmStage } from "../../registry/video/film-stage";
import { compileFilm } from "../../registry/video/film-document";
import type { CompiledFilm, FilmDiagnostic } from "../../registry/video/film-document";
import { createStoryTextMeasure } from "../../registry/video/object-story-react";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import { renderFilmObject } from "./film-art";

declare global {
  interface Window {
    __kmFilm?: {
      failed: boolean;
      diagnostics: readonly FilmDiagnostic[];
      reviewFrames: CompiledFilm["reviewFrames"];
      audit: () => ReturnType<typeof findTextProblems>;
    };
  }
}
const params = new URLSearchParams(location.search);

function Film({ film }: { film: CompiledFilm }) {
  const [frame, setFrame] = useState(0);
  const manifest = useMemo(() => film.manifest, [film]);
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <FilmStage film={film} frame={frame} renderObject={renderFilmObject} reducedMotion={params.get("reduced") === "1"} />
  </VideoExportStage>;
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
    window.__kmFilm = { failed: true, diagnostics: result.diagnostics, reviewFrames: [], audit: () => [] };
    root.render(<pre data-km-film-failed="">{result.diagnostics.map(item => `${item.path}: ${item.message}`).join("\n")}</pre>);
    return;
  }
  const { film } = result;
  window.__kmFilm = { failed: false, diagnostics: result.diagnostics, reviewFrames: film.reviewFrames, audit() {
    const surface = document.querySelector("[data-km-video-capture]")!;
    return findTextProblems(collectRenderedText(surface), { frame: film, safeInset: film.safeInset });
  } };
  root.render(<Film film={film} />);
}
void start();
