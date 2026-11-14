import type { FilmDocument } from "../../registry/video/film-document";
import { PAINTED_GENRES } from "./painted-composition-demo";

/** Four unrelated semantics demonstrating one WM2 material renderer; FD1 owns cuts/timing/output. */
export const PAINTED_WORLDS_FILM: FilmDocument = {
  schemaVersion: 1,
  id: "painted-worlds-watercolour-study",
  fps: { num: 30, den: 1 },
  drift: 0,
  outputs: [
    { id: "landscape", width: 960, height: 540 },
    { id: "portrait", width: 540, height: 960 },
  ],
  scenes: PAINTED_GENRES.map((genre, i) => ({
    id: genre + "-painting", recipeId: "slot" as const, durationFrames: 320,
    ...(i > 0 ? { transition: { kind: "cut" as const } } : {}),
    content: { slot: "painted-composition", label: "Original material study: " + genre,
      props: { genre } },
  })),
};
