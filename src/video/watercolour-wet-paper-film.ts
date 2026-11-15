import type { FilmDocument } from "../../registry/video/film-document";

/** WM4: the same absolute-frame wet-paper surface runs in Storybook and MP4 export. */
export const WATERCOLOUR_WET_PAPER_FILM: FilmDocument = {
  "schemaVersion": 1,
  "id": "watercolour-wet-paper-study",
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
      "id": "watercolour-wet-on-wet",
      "recipeId": "slot",
      "durationFrames": 420,
      "content": {
        "slot": "watercolour-wet-paper",
        "label": "Shared pigment field diffuses and dries into paper"
      }
    }
  ]
};
