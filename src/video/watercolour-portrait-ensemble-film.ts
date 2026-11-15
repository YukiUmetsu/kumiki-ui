import type { FilmDocument } from "../../registry/video/film-document";

/** Same authored multi-character renderer in Storybook and portable film export. */
export const WATERCOLOUR_PORTRAIT_ENSEMBLE_FILM:FilmDocument={
  "schemaVersion": 1,
  "id": "watercolour-two-sitter-ensemble",
  "fps": {
    "num": 30,
    "den": 1
  },
  "drift": 0,
  "outputs": [
    {
      "id": "landscape",
      "width": 960,
      "height": 540
    },
    {
      "id": "portrait",
      "width": 540,
      "height": 960
    }
  ],
  "scenes": [
    {
      "id": "portrait-ensemble-film",
      "recipeId": "slot",
      "durationFrames": 360,
      "content": {
        "slot": "watercolour-portrait-ensemble",
        "label": "Two independent original watercolor humans sharing watercolor paper",
        "props": {
          "seed": 83
        }
      }
    }
  ]
};
