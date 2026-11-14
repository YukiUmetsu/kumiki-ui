import type { FilmDocument } from "../../registry/video/film-document";

/** A native CP1 drawing sequence in the EXISTING FD1 film timeline. */
export const COLOR_PENCIL_FILM: FilmDocument = {
  schemaVersion: 1,
  id: "colored-pencil-science",
  fps: { num: 30, den: 1 },
  drift: 0,
  outputs: [
    { id: "landscape", width: 960, height: 540 },
    { id: "portrait", width: 540, height: 960 },
  ],
  scenes: [
    {
      id: "graphite-foundation", recipeId: "slot", durationFrames: 88,
      content: { slot: "colored-pencil-science", label: "Graphite contour draws", props: { subject: "leaf", offsetFrame: 0 } },
    },
    {
      id: "pigment-layering", recipeId: "slot", durationFrames: 115,
      transition: { kind: "cut" },
      content: { slot: "colored-pencil-science", label: "Directional pigment builds", props: { subject: "leaf", offsetFrame: 88 } },
    },
    {
      id: "observation-hold", recipeId: "slot", durationFrames: 150,
      transition: { kind: "cut" },
      content: { slot: "colored-pencil-science", label: "Graphite veins and annotations resolve", props: { subject: "leaf", offsetFrame: 203 } },
    },
  ],
};
