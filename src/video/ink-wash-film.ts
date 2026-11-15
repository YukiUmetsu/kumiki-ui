import type { FilmDocument } from "../../registry/video/film-document";

/** Three FD1 slot scenes; the existing FilmStage supplies absolute local scene frames.
 * Intentional pauses allow the ink to settle before the next form appears.
 */
export const INK_WASH_FILM: FilmDocument = {
  schemaVersion: 1,
  id: "ink-wash-study",
  fps: { num: 30, den: 1 },
  drift: 0,
  outputs: [
    { id: "landscape", width: 960, height: 540 },
    { id: "portrait", width: 540, height: 960 },
  ],
  scenes: [
    { id: "first-wash", recipeId: "slot", durationFrames: 110,
      content: { slot: "ink-wash-study", label: "Light ink wash spreads on paper", props: { offsetFrame: 0 } } },
    { id: "gesture", recipeId: "slot", durationFrames: 120, transition: { kind: "cut" },
      content: { slot: "ink-wash-study", label: "Dark gestural strokes draw the subject", props: { offsetFrame: 110 } } },
    { id: "dry-hold", recipeId: "slot", durationFrames: 190, transition: { kind: "cut" },
      content: { slot: "ink-wash-study", label: "Wet edges settle and finished picture holds", props: { offsetFrame: 230 } } },
  ],
};
