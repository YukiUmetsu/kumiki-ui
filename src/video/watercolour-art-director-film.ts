import type { FilmDocument } from "../../registry/video/film-document";

/** A reusable watercolor illustration slot: source art and all motion are code-addressable. */
export const WATERCOLOUR_ART_DIRECTOR_FILM: FilmDocument = {
  schemaVersion: 1,
  id: "watercolour-art-director",
  fps: { num: 30, den: 1 },
  drift: 0,
  outputs: [
    { id: "landscape", width: 960, height: 540 },
    { id: "portrait", width: 540, height: 960 },
  ],
  scenes: [
    { id: "watercolour-wetland", recipeId: "slot", durationFrames: 360,
      content: { slot: "watercolour-illustration", label: "Heron wetland illustration", props: { seed: 83 } } },
  ],
};
