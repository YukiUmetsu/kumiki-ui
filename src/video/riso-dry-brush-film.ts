import type { FilmDocument } from "../../registry/video/film-document";

/** RISO63 / FD1: one continuous ten-second two-spot ink animation.
 * The production capture page uses the exact original RISO62 Storybook art.
 * FilmStage supplies the only clock; no authored source is flattened.
 * Both outputs have independently laid out source curves and paper details.
 */
export const RISO_DRY_BRUSH_FILM: FilmDocument = {
  "schemaVersion": 1,
  "id": "riso-dry-brush-native-film",
  "fps": {
    "num": 24,
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
      "id": "physical-ink-current",
      "recipeId": "slot",
      "durationFrames": 240,
      "content": {
        "slot": "riso-dry-brush",
        "label": "Original two-spot dry-brush ink-current gesture",
        "props": {
          "seed": 62,
          "dryness": 0.73,
          "inkScale": 1,
          "registration": 0.25,
          "grain": 0.58,
          "plate": "both"
        }
      }
    }
  ]
};
