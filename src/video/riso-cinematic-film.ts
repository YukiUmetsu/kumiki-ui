import type {FilmDocument} from "../../registry/video/film-document";

/** RISO64 five-beat art-directed original press narrative; FilmStage is the
 * sole owner of the 12-second 24fps clock and of cinematic scene cuts. */
export const RISO_CINEMATIC_FILM:FilmDocument={
  "schemaVersion": 1,
  "id": "riso-cinematic-two-plate-journey",
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
      "id": "cobalt-macro",
      "recipeId": "slot",
      "durationFrames": 48,
      "content": {
        "slot": "riso-dry-brush-cinematic",
        "label": "Extreme source-fibre cobalt macro on absorbed paper",
        "props": {
          "beat": "cobalt-macro",
          "seed": 62,
          "dryness": 0.73,
          "grain": 0.58,
          "registration": 0.25,
          "inkScale": 1
        }
      }
    },
    {
      "id": "cobalt-pullback",
      "recipeId": "slot",
      "durationFrames": 52,
      "transition": {
        "kind": "cut"
      },
      "content": {
        "slot": "riso-dry-brush-cinematic",
        "label": "Reveal the first master across the full physical sheet",
        "props": {
          "beat": "cobalt-pullback",
          "seed": 62,
          "dryness": 0.73,
          "grain": 0.58,
          "registration": 0.25,
          "inkScale": 1
        }
      }
    },
    {
      "id": "vermilion-pass",
      "recipeId": "slot",
      "durationFrames": 74,
      "transition": {
        "kind": "cut"
      },
      "content": {
        "slot": "riso-dry-brush-cinematic",
        "label": "Second drum transfers red spot ink and overprints blue",
        "props": {
          "beat": "vermilion-pass",
          "seed": 62,
          "dryness": 0.73,
          "grain": 0.58,
          "registration": 0.25,
          "inkScale": 1
        }
      }
    },
    {
      "id": "overprint-macro",
      "recipeId": "slot",
      "durationFrames": 48,
      "transition": {
        "kind": "cut"
      },
      "content": {
        "slot": "riso-dry-brush-cinematic",
        "label": "Follow the complementary paper-open channels at the red/blue meeting",
        "props": {
          "beat": "overprint-macro",
          "seed": 62,
          "dryness": 0.73,
          "grain": 0.58,
          "registration": 0.25,
          "inkScale": 1
        }
      }
    },
    {
      "id": "original-hold",
      "recipeId": "slot",
      "durationFrames": 66,
      "transition": {
        "kind": "cut"
      },
      "content": {
        "slot": "riso-dry-brush-cinematic",
        "label": "Return to finished edition and hold the original print",
        "props": {
          "beat": "original-hold",
          "seed": 62,
          "dryness": 0.73,
          "grain": 0.58,
          "registration": 0.25,
          "inkScale": 1
        }
      }
    }
  ]
};
