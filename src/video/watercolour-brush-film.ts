import type { FilmDocument } from "../../registry/video/film-document";

/**
 * WM1 neutral production proof: two original, unrelated subjects through the SAME FD1 timeline.
 * FilmStage owns all cuts, output formats and absolute frames. WM1 only paints the slot surface.
 */
export const WATERCOLOUR_BRUSH_FILM: FilmDocument = {
  schemaVersion: 1,
  id: "watercolour-brush-material-study",
  fps: { num: 30, den: 1 },
  drift: 0,
  outputs: [
    { id: "landscape", width: 960, height: 540 },
    { id: "portrait", width: 540, height: 960 },
  ],
  scenes: [
    {
      id: "iris-painting",
      recipeId: "slot",
      durationFrames: 410,
      content: { slot: "watercolour-brush", label: "Watercolor iris painted by successive brush strokes",
        props: { subject: "wild-iris" } },
    },
    {
      id: "coastal-painting",
      recipeId: "slot",
      durationFrames: 410,
      transition: { kind: "cut" },
      content: { slot: "watercolour-brush", label: "Watercolor coastal scene painted by successive brush strokes",
        props: { subject: "coastal-dawn" } },
    },
  ],
};
