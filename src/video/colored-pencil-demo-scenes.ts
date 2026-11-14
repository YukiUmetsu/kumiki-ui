import { createPencilRegion } from "../../registry/video/colored-pencil";
import type { PencilAspect, PencilTrace } from "../../registry/video/colored-pencil";
import type { PencilSceneSpec, PencilAnnotation } from "../../registry/video/colored-pencil-scene";

export type PencilDemoSubject = "orbit" | "circuit" | "terrain";

/** Domain-neutral original storyplates: astronomy, engineering and landscape storytelling.
 * Coordinates are authored by us, all printed measurements intentionally omitted.
 */
const TOPICS = {
  orbit: { line1: "A WORLD", line2: "IN MOTION", eyebrow: "SPACE / OBSERVATION",
    note: "An illustrated orbital relationship.", callout: "ORBIT",
    description: "Two bodies. One drawn path.",
    regions: [
      { id: "primary-world", path: "M298 215 A112 112 0 1 1 74 215 A112 112 0 1 1 298 215 Z",
        bounds: [74, 103, 224, 224] as const, palette: ["#8EAFC0", "#648EA4", "#779B80"] as const,
        direction: -45, material: "dense" as const, seed: 51,
        details: [
          { path: "M112 174 Q153 128 182 156 Q201 166 190 198 Q156 207 155 236 Q119 246 115 220", color: "#526F77", width: 1.2, startFrame: 124, durationFrames: 72 },
          { path: "M212 256 Q245 219 275 240 M225 143 Q250 163 271 177 M101 268 Q119 295 147 299", color: "#526F77", width: 1.0, startFrame: 140, durationFrames: 62 },
        ],
      },
      { id: "secondary-world", path: "M409 98 A45 45 0 1 1 319 98 A45 45 0 1 1 409 98 Z",
        bounds: [319, 53, 90, 90] as const, palette: ["#C6B8AE", "#97959B", "#C1A18A"] as const,
        direction: -17, material: "layered" as const, seed: 52,
        details: [{ path: "M345 83 Q360 65 381 80 M334 112 Q365 134 390 109", color: "#827D7E", width: 1.0, startFrame: 151, durationFrames: 60 }],
      },
    ],
    accents: [{ path: "M58 235 C47 76 281 -9 404 135 C482 228 389 363 238 370",
      color: "#778B7E", width: 1.5 }],
  },
  circuit: { line1: "THE PATH", line2: "OF A SIGNAL", eyebrow: "ENGINEERING / DIAGRAM",
    note: "An illustrative electrical loop.", callout: "FLOW",
    description: "Source · component · output.",
    regions: [
      { id: "source", path: "M56 146 L128 146 L128 281 L56 281 Z",
        bounds: [56, 146, 72, 135] as const, palette: ["#B5A893", "#9E8E7E", "#C3B6A1"] as const,
        direction: -39, material: "layered" as const, seed: 61,
        details: [{ path: "M77 177 H107 M92 162 V191 M77 246 H107", color: "#6B6A62", width: 2, startFrame: 112, durationFrames: 53 }],
      },
      { id: "component", path: "M192 175 L319 175 L319 251 L192 251 Z",
        bounds: [192, 175, 127, 76] as const, palette: ["#A6B5B2", "#688C87", "#B9C2BA"] as const,
        direction: 18, material: "dense" as const, seed: 62,
        details: [{ path: "M204 215 L223 193 L243 232 L262 193 L283 232 L304 215", color: "#42665F", width: 1.4, startFrame: 122, durationFrames: 61 }],
      },
      { id: "output", path: "M400 152 A60 60 0 1 1 280 152 A60 60 0 1 1 400 152 Z",
        bounds: [280, 92, 120, 120] as const, palette: ["#DDC6A0", "#CC9B6C", "#E7D2A8"] as const,
        direction: -33, material: "soft" as const, seed: 63,
        details: [{ path: "M318 170 Q341 130 367 170 M320 188 H363", color: "#A37E5C", width: 1.5, startFrame: 134, durationFrames: 62 }],
      },
    ],
    accents: [{ path: "M128 212 H192 M319 212 H340 V211 M340 212 V212 M340 212 V212 M340 212 V269 H157 V212 H128",
      color: "#70877B", width: 2.6 }],
  },
  terrain: { line1: "LAYERS OF", line2: "LANDSCAPE", eyebrow: "EARTH / LANDSCAPE",
    note: "An imagined terrain, not survey data.", callout: "RIDGELINE",
    description: "Shape, depth and shaded slopes.",
    regions: [
      { id: "far-mountains", path: "M20 334 L137 116 L223 229 L291 158 L421 334 Z",
        bounds: [20, 116, 401, 218] as const, palette: ["#B4BBB1", "#839B98", "#B6AC9A"] as const,
        direction: -48, material: "layered" as const, seed: 71,
        details: [{ path: "M137 116 L167 192 L186 178 M291 158 L312 217 L342 205",
          color: "#6E807B", width: 1.8, startFrame: 142, durationFrames: 78 }],
      },
      { id: "near-hills", path: "M0 352 Q125 276 239 325 T421 310 L421 416 L0 416 Z",
        bounds: [0, 276, 421, 140] as const, palette: ["#9BAB7D", "#728869", "#C3B38E"] as const,
        direction: 22, material: "dense" as const, seed: 72, details: [
          { path: "M25 345 Q115 308 230 337 M230 370 Q290 346 413 349",
            color: "#687B5A", width: 1.15, startFrame: 164, durationFrames: 70 },
        ],
      },
      { id: "sun-disk", path: "M398 90 A38 38 0 1 1 322 90 A38 38 0 1 1 398 90 Z",
        bounds: [322, 52, 76, 76] as const, palette: ["#EDD4A4", "#E0BC88", "#F0D6AE"] as const,
        direction: -31, material: "soft" as const, seed: 73 },
    ],
    accents: [{ path: "M55 303 C118 249 172 261 239 292 S350 324 404 290",
      color: "#6D8474", width: 1.4 }],
  },
} as const;

const PAPER = "#F8F2E6";
const MAIN_TEXT = "#343C37";
const SECOND_TEXT = "#637568";

/** Scene asset authoring is separate from the material renderer, so a consumer can supply
 * any licensed SVG contour and its paper-local bounds. The material library stays topic-neutral.
 */
export function pencilDemoScene(subject: PencilDemoSubject, aspect: PencilAspect): PencilSceneSpec {
  if (!Object.hasOwn(TOPICS, subject)) throw new RangeError("Unknown pencil demo subject");
  if (aspect !== "landscape" && aspect !== "portrait") throw new RangeError("Unknown paper aspect");
  const model = TOPICS[subject], portrait = aspect === "portrait";
  const width = portrait ? 540 : 960, height = portrait ? 960 : 540;
  const shift = portrait ? "translate(42 345) scale(1.02)" : "translate(470 69) scale(1.02)";
  const regions = model.regions.map((item, i) => createPencilRegion({
    id: item.id, path: item.path, bounds: item.bounds, palette: item.palette, seed: item.seed,
    startFrame: 30 + i * 15, durationFrames: 202, direction: item.direction,
    material: item.material, transform: shift,
    details: ("details" in item ? item.details : undefined) as readonly PencilTrace[] | undefined,
  }));
  const top = portrait ? 168 : 163;
  const left = portrait ? 35 : 43;
  const title: PencilAnnotation = { type: "text", id: "title", text: [model.line1, model.line2],
    at: [left, top], color: MAIN_TEXT, size: portrait ? 43 : 52, font: "serif",
    startFrame: 0, durationFrames: 10 };
  const eyebrow: PencilAnnotation = { type: "text", id: "section", text: model.eyebrow,
    at: [left, portrait ? 93 : 89], color: SECOND_TEXT, size: 13,
    startFrame: 0, durationFrames: 10 };
  const summary: PencilAnnotation = { type: "text", id: "description",
    text: [model.note, model.description],
    at: [left, portrait ? 285 : 285], color: SECOND_TEXT, size: 15,
    startFrame: 218, durationFrames: 29 };
  const footer: PencilAnnotation = { type: "text", id: "footer", text: "STUDY / COLOURED PENCIL",
    at: [left, portrait ? 934 : 507], color: SECOND_TEXT, size: 12,
    startFrame: 0, durationFrames: 12 };
  const graphLines = model.accents.map((item, i): PencilAnnotation =>
    ({ type: "stroke", id: "guide-" + i, path: item.path, color: item.color, width: item.width,
      startFrame: 160 + i * 19, durationFrames: 86, space: "paper" }));
  const accents = [...graphLines];
  // A paper-coordinate group preserves author geometry with the same transform as the subjects.
  // Set the transform through SVG authoring for graphics; screen labels remain in their own safe zone.
  const graphic: PencilAnnotation = { type: "stroke", id: "caption-rule",
    path: portrait ? "M35 316 H500" : "M43 321 H418",
    color: "#849889", width: .95, startFrame: 212, durationFrames: 31, space: "screen" };
  return {
    version: 1,
    drawing: { version: 1, width, height, seed: 77, paper: PAPER, paperTooth: .68, regions },
    camera: { from: [0, 0, 1], to: portrait ? [-12, -22, 1.04] : [-13, -9, 1.045],
      startFrame: 128, durationFrames: 135 },
    annotations: [title, eyebrow, summary, footer, graphic, ...accents],
  };
}
