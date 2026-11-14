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


/**
 * The next editorial proof does not invent another cut engine. The fourth FD1 scene is a
 * transition bridge, driven by FilmStage's existing local frame; the fifth holds the new sheet.
 */
export const RISO_SHEET_FEED_FILM: FilmDocument = {
  ...RISO_PRINT_FILM,
  id: "riso-paper-feed-study",
  scenes: [
    ...RISO_PRINT_FILM.scenes,
    {
      id: "paper-feed", recipeId: "slot", durationFrames: 180,
      transition: { kind: "cut" },
      content: { slot: "riso-sheet-feed", label: "Physical paper feed and two ink passes" },
    },
    {
      id: "second-poster", recipeId: "slot", durationFrames: 120,
      transition: { kind: "cut" },
      content: { slot: "riso-next-print", label: "Second print resolves and holds" },
    },
  ],
};

/** Original stamped-ink contour for the overprint bridge; authored around a local 0,0 origin. */
export const RISO_OVERPRINT_MOTIF =
  "M -110 -25 C -134 -75 -63 -118 -9 -93 C 56 -110 132 -65 119 -4 C 133 51 48 112 -6 91 C -83 119 -137 47 -110 -25 Z";

/** Same subject-origin location in two separately composed aspects. */
export const risoOverprintOrigin = (aspect: "landscape" | "portrait"): readonly [number, number] =>
  aspect === "portrait" ? [265, 635] : [690, 270];

/** Existing five-scene FilmStage timeline: first print -> physical overprint bridge -> next print. */
export const RISO_OVERPRINT_FILM: FilmDocument = {
  ...RISO_PRINT_FILM,
  id: "riso-native-overprint-study",
  scenes: [
    ...RISO_PRINT_FILM.scenes,
    {
      id: "ink-overprint-bridge", recipeId: "slot", durationFrames: 180,
      transition: { kind: "cut" },
      content: { slot: "riso-overprint", label: "Incoming spot ink stamps over the first print" },
    },
    {
      id: "new-paper-hold", recipeId: "slot", durationFrames: 120,
      transition: { kind: "cut" },
      content: { slot: "riso-next-print", label: "New print fully resolved" },
    },
  ],
};
