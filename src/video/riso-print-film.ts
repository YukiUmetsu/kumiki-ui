import type { FilmDocument } from "../../registry/video/film-document";

/**
 * RISO1 production proof. All 3 shots are real FD1 slot scenes: the existing FilmStage owns
 * timeline, cuts, output shape and scene timing. The slot owns only independent ink plates.
 * Every picture is original code-drawn art, with no remote media or sound dependencies.
 */
export const RISO_PRINT_FILM: FilmDocument = {
  schemaVersion: 1,
  id: "riso-print-study",
  fps: { num: 30, den: 1 },
  drift: 0,
  outputs: [
    { id: "landscape", width: 960, height: 540 },
    { id: "portrait", width: 540, height: 960 },
  ],
  scenes: [
    {
      id: "first-blue-plate", recipeId: "slot", durationFrames: 110,
      content: { slot: "riso-print-study", label: "First pass: cobalt", props: { offsetFrame: 0 } },
    },
    {
      id: "second-red-plate", recipeId: "slot", durationFrames: 110,
      transition: { kind: "cut" },
      content: { slot: "riso-print-study", label: "Second pass: vermilion", props: { offsetFrame: 110 } },
    },
    {
      id: "finished-overprint", recipeId: "slot", durationFrames: 170,
      transition: { kind: "cut" },
      content: { slot: "riso-print-study", label: "Finished print and overprint", props: { offsetFrame: 220 } },
    },
  ],
};
