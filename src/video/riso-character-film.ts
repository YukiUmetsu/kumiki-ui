import type { FilmDocument } from "../../registry/video/film-document";
/** Fully original FilmStage character proof, one existing timeline and two ink plates. */
export const RISO_CHARACTER_FILM: FilmDocument = {
  "schemaVersion": 1,
  "id": "riso-character-performances",
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
      "id": "arrival",
      "recipeId": "slot",
      "durationFrames": 90,
      "content": {
        "slot": "riso-character-performance",
        "label": "Courier approaches the street",
        "props": {
          "offsetFrame": 0
        }
      }
    },
    {
      "id": "encounter",
      "recipeId": "slot",
      "durationFrames": 85,
      "transition": {
        "kind": "cut"
      },
      "content": {
        "slot": "riso-character-performance",
        "label": "Bird flutters overhead as courier turns and speaks",
        "props": {
          "offsetFrame": 90
        }
      }
    },
    {
      "id": "exit",
      "recipeId": "slot",
      "durationFrames": 65,
      "transition": {
        "kind": "cut"
      },
      "content": {
        "slot": "riso-character-performance",
        "label": "Smile and held-paper sign off",
        "props": {
          "offsetFrame": 175
        }
      }
    }
  ]
};
