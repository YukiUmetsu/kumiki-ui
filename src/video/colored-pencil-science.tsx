import { PencilDrawing } from "../../registry/video/colored-pencil-react";
import type { PencilAspect, PencilDrawingSpec, PencilRegion, PencilTrace } from "../../registry/video/colored-pencil";

export type PencilSubject = "leaf" | "crystal";
const GRAPHITE = "#4C5148";
const MOSS = "#5C7560";
const OCHRE = "#AA9160";
const BLUE = "#718AA0";
const VIOLET = "#9C899B";
const draw = (path: string, color: string, width: number, startFrame: number,
  durationFrames = 64, opacity = .8): PencilTrace =>
  ({ path, color, width, opacity, startFrame, durationFrames });

const leaf: readonly PencilRegion[] = [
  {
    id: "primary-leaf",
    path: "M204 351 C161 296 99 229 110 155 C119 89 198 43 287 23 C342 71 377 138 353 204 C330 267 265 321 204 351 Z",
    bounds: [103, 18, 276, 336],
    underpaint: "#99A67E",
    contour: draw("M204 351 C161 296 99 229 110 155 C119 89 198 43 287 23 C342 71 377 138 353 204 C330 267 265 321 204 351 Z", GRAPHITE, 2.05, 10, 72),
    layers: [
      { color: "#94A985", angle: -32, spacing: 3.6, pressure: .83, tipWidth: 1.7, seed: 3, startFrame: 52, durationFrames: 126 },
      { color: MOSS, angle: 39, spacing: 4.6, pressure: .65, tipWidth: 1.35, seed: 17, startFrame: 78, durationFrames: 143 },
      { color: OCHRE, angle: -74, spacing: 7, pressure: .49, tipWidth: 1.25, seed: 41, startFrame: 121, durationFrames: 113 },
      { color: "#405E4F", angle: 81, spacing: 9.4, pressure: .51, tipWidth: .78, seed: 53, startFrame: 151, durationFrames: 96 },
    ],
    details: [
      draw("M204 351 C235 288 246 237 267 178 S289 67 287 23", "#525F4B", 3.6, 31, 91),
      draw("M214 323 Q177 285 130 259 M229 279 Q175 251 119 220 M241 246 Q188 208 114 175", "#59715B", 1.65, 127, 61),
      draw("M253 211 Q196 178 125 136 M266 172 Q216 132 161 87 M276 118 Q239 79 221 50", "#59715B", 1.45, 130, 68),
      draw("M220 322 Q289 292 324 243 M236 276 Q315 254 349 204 M249 235 Q324 198 359 160", "#59715B", 1.6, 140, 63),
      draw("M265 182 Q321 145 349 115 M277 124 Q313 97 320 69", "#59715B", 1.35, 144, 54),
      draw("M194 333 Q175 365 161 395", "#675F48", 3.4, 31, 77),
      draw("M187 349 Q173 371 163 396", "#A68B5D", 1.25, 80, 80),
      draw("M135 257 Q158 255 188 272 M118 219 Q142 203 178 223 M124 173 Q155 152 197 181", "#AAB497", .8, 163, 47, .68),
    ],
  },
  {
    id: "young-leaf",
    path: "M175 286 C125 271 70 243 47 181 C99 163 155 191 178 241 Z",
    bounds: [42, 157, 142, 134],
    underpaint: "#A7B693",
    contour: draw("M175 286 C125 271 70 243 47 181 C99 163 155 191 178 241 Z", GRAPHITE, 1.55, 28, 72),
    layers: [
      { color: "#90A47E", angle: 26, spacing: 4.1, pressure: .7, tipWidth: 1.1, seed: 92, startFrame: 88, durationFrames: 126 },
      { color: "#6B8667", angle: -57, spacing: 6.2, pressure: .58, tipWidth: 1, seed: 93, startFrame: 132, durationFrames: 100 },
    ],
    details: [
      draw("M175 286 Q120 220 47 181", MOSS, 1.7, 146, 70),
      draw("M138 244 Q123 208 94 182 M115 225 Q100 215 68 204", "#6B806A", .85, 165, 54),
    ],
  },
];

const crystal: readonly PencilRegion[] = [
  {
    id: "left-facet",
    path: "M112 334 L71 212 L153 128 L191 34 L225 144 L194 355 Z",
    bounds: [68, 28, 159, 334],
    underpaint: "#BCC7CA",
    contour: draw("M112 334 L71 212 L153 128 L191 34 L225 144 L194 355 Z", GRAPHITE, 1.85, 10, 71),
    layers: [
      { color: "#849EAE", angle: -51, spacing: 3.6, pressure: .8, tipWidth: 1.4, seed: 102, startFrame: 55, durationFrames: 125 },
      { color: BLUE, angle: 39, spacing: 6.4, pressure: .52, tipWidth: 1.1, seed: 103, startFrame: 102, durationFrames: 111 },
    ],
    details: [draw("M71 212 L194 355 M153 128 L194 355", "#6B8291", 1.15, 134, 67)],
  },
  {
    id: "central-facet",
    path: "M194 355 L191 34 L267 12 L309 133 L280 358 Z",
    bounds: [188, 8, 125, 353],
    underpaint: "#C2B7CB",
    contour: draw("M194 355 L191 34 L267 12 L309 133 L280 358 Z", GRAPHITE, 2.05, 16, 70),
    layers: [
      { color: "#ABB1C4", angle: 24, spacing: 3.6, pressure: .8, tipWidth: 1.3, seed: 111, startFrame: 63, durationFrames: 136 },
      { color: VIOLET, angle: -58, spacing: 5, pressure: .65, tipWidth: 1.1, seed: 112, startFrame: 101, durationFrames: 129 },
      { color: "#6B738E", angle: 83, spacing: 8.5, pressure: .56, tipWidth: .85, seed: 113, startFrame: 155, durationFrames: 85 },
    ],
    details: [
      draw("M267 12 L245 157 L280 358 M191 34 L245 157 L309 133", "#66768F", 1.3, 154, 76),
      draw("M249 70 L279 118 M246 181 L272 238", "#F0E6E4", 1.15, 192, 42, .7),
    ],
  },
  {
    id: "right-facet",
    path: "M280 358 L309 133 L358 154 L390 255 L346 340 Z",
    bounds: [275, 129, 118, 233],
    underpaint: "#D3C0AB",
    contour: draw("M280 358 L309 133 L358 154 L390 255 L346 340 Z", GRAPHITE, 1.85, 25, 66),
    layers: [
      { color: "#B69A87", angle: -36, spacing: 3.7, pressure: .75, tipWidth: 1.5, seed: 122, startFrame: 91, durationFrames: 132 },
      { color: "#897F91", angle: 49, spacing: 6, pressure: .57, tipWidth: 1.15, seed: 123, startFrame: 119, durationFrames: 115 },
    ],
    details: [draw("M309 133 L346 340 M358 154 L346 340", "#897D80", 1.15, 152, 74)],
  },
  {
    id: "base-facet",
    path: "M112 334 L194 355 L280 358 L346 340 L302 391 L172 393 Z",
    bounds: [108, 330, 241, 67],
    underpaint: "#9D8990",
    contour: draw("M112 334 L194 355 L280 358 L346 340 L302 391 L172 393 Z", GRAPHITE, 1.7, 42, 71),
    layers: [
      { color: "#817F97", angle: 8, spacing: 3.9, pressure: .78, tipWidth: 1.6, seed: 131, startFrame: 134, durationFrames: 112 },
      { color: "#6C7D8F", angle: -65, spacing: 6.7, pressure: .57, tipWidth: .95, seed: 132, startFrame: 164, durationFrames: 91 },
    ],
    details: [draw("M172 393 L194 355 M302 391 L280 358", "#595D65", 1.3, 178, 59)],
  },
];

export const PENCIL_TEXT_ZONES = {
  landscape: { title: { x: 44, y: 90, width: 399, height: 169 }, body: { x: 44, y: 273, width: 398, height: 174 }, footer: { x: 44, y: 489, width: 868, height: 43 } },
  portrait: { title: { x: 38, y: 98, width: 471, height: 191 }, body: { x: 38, y: 792, width: 462, height: 112 }, footer: { x: 38, y: 916, width: 464, height: 36 } },
} as const;

/** Original neutral teaching specimens. No invented measurement, species or mineral identification. */
export function coloredPencilExample(subject: PencilSubject, aspect: PencilAspect, seed = 47): PencilDrawingSpec {
  if (subject !== "leaf" && subject !== "crystal") throw new RangeError("Unknown pencil specimen.");
  if (aspect !== "landscape" && aspect !== "portrait") throw new RangeError("Unknown pencil page aspect.");
  const transform = aspect === "landscape" ? "translate(503 70)" : "translate(48 377)";
  return {
    version: 1, width: aspect === "landscape" ? 960 : 540,
    height: aspect === "landscape" ? 540 : 960,
    paper: "#F8F2E6", paperTooth: .82, seed,
    regions: (subject === "leaf" ? leaf : crystal).map(region => ({ ...region, transform })),
  };
}

const titles = {
  leaf: { top: "VEINS OF", bottom: "A LEAF", eyebrow: "BOTANICAL OBSERVATION",
    subtitle: "The delicate structure within",
    note1: "The midrib forms the central axis.",
    note2: "Smaller veins branch across the blade.",
    note3: "A younger blade appears at left.",
    terms: ["MIDRIB", "BRANCHING VEINS", "LEAF MARGIN"] },
  crystal: { top: "FACETS OF", bottom: "A CRYSTAL", eyebrow: "MATERIAL OBSERVATION",
    subtitle: "Geometry held in the light",
    note1: "Planes meet at clearly defined edges.",
    note2: "Each face changes its shading angle.",
    note3: "This is an illustrative study, not a scan.",
    terms: ["FACET", "EDGE", "BASE"] },
} as const;

export interface ColoredPencilSciencePlateProps {
  aspect: PencilAspect;
  subject?: PencilSubject;
  frame: number;
  reducedMotion?: boolean;
  seed?: number;
  paperTooth?: number;
}

/** Finite preflight for layout regions. Annotations never enter the drawing's title safe zone. */
const fade = (frame: number, start: number, duration: number, reduced = false) =>
  reduced ? 1 : Math.max(0, Math.min(1, (frame - start) / duration));
export function ColoredPencilSciencePlate({ aspect, subject = "leaf", frame, reducedMotion = false,
  seed = 47, paperTooth = .82 }: ColoredPencilSciencePlateProps) {
  if (!Number.isFinite(paperTooth) || paperTooth < 0 || paperTooth > 1)
    throw new RangeError("paperTooth must be within 0..1.");
  const spec = { ...coloredPencilExample(subject, aspect, seed), paperTooth };
  const landscape = aspect === "landscape";
  const copy = titles[subject];
  const top = landscape ? 163 : 184;
  const notesY = landscape ? 374 : 812;
  const ink = "#343C37", muted = "#677065", accent = subject === "leaf" ? MOSS : BLUE;
  const reveal = fade(frame, 197, 33, reducedMotion);
  const special = fade(frame, 213, 26, reducedMotion);
  return <PencilDrawing drawing={spec} frame={frame} reducedMotion={reducedMotion}
    label={subject === "leaf" ? "Original coloured-pencil anatomical leaf study with individually hatched veins and graphite contours" :
      "Original coloured-pencil crystal facet study with differently angled hatch marks and graphite contours"}>
    <g fontFamily="Arial, Helvetica, sans-serif" fill={ink}>
      {/* Page furniture stays anchored to the sheet, not to the animated specimen. */}
      <text x={landscape ? 44 : 38} y={landscape ? 45 : 49} fontSize="12" fontWeight="700" letterSpacing="2.5">FIELD NOTES</text>
      <text x={landscape ? 790 : 390} y={landscape ? 45 : 49} fontSize="10.5" letterSpacing="1.2" fill={muted}>
        STUDY / 0{subject === "leaf" ? "1" : "2"}
      </text>
      <path d={landscape ? "M44 62 H916" : "M38 65 H502"} stroke={GRAPHITE} strokeWidth=".85" opacity=".43" fill="none"/>
      <rect x={landscape ? 44 : 38} y={landscape ? 88 : 101} width="33" height="3.5" fill={accent}/>
      <text x={landscape ? 44 : 38} y={landscape ? 119 : 131} fontSize="11.5"
        letterSpacing="2" fontWeight="700" fill={accent}>{copy.eyebrow}</text>
      <g fontFamily="Georgia, 'Times New Roman', serif" fontWeight={600} letterSpacing="-1.8">
        <text x={landscape ? 40 : 35} y={top} fontSize={landscape ? 56 : 60}>{copy.top}</text>
        <text x={landscape ? 40 : 35} y={top + (landscape ? 66 : 70)} fontSize={landscape ? 56 : 60}>{copy.bottom}</text>
      </g>
      <path d={landscape ? "M44 251 H391" : "M38 274 H484"} stroke={accent} strokeWidth="1.6" opacity=".64" fill="none"/>
      <text x={landscape ? 44 : 38} y={landscape ? 284 : 304} fontSize={landscape ? 17 : 16}
        fontFamily="Georgia, serif" fontStyle="italic" fill={ink}>{copy.subtitle}</text>
      {landscape && <g opacity={.83}>
        <text x="44" y="320" fontSize="13" fill={muted}>A study in pigment, pressure and paper.</text>
        <text x="44" y="338" fontSize="13" fill={muted}>First the graphite, then the colour.</text>
      </g>}
      {landscape && <g opacity={reveal}>
        <text x="44" y="378" fontSize="10.5" fontWeight="700" letterSpacing="1.5" fill={accent}>OBSERVATIONS</text>
        {[copy.note1, copy.note2, copy.note3].map((label, i) => <g key={i}>
          <text x="44" y={406 + i * 23} fontSize="11" fontWeight="700" fill={accent}>0{i + 1}</text>
          <text x="72" y={406 + i * 23} fontSize="12" fill={ink}>{label}</text>
        </g>)}
      </g>}
      {!landscape && <g opacity={reveal}>
        <text x="38" y={notesY} fontSize="11" letterSpacing="1.8" fontWeight="700" fill={accent}>OBSERVATIONS</text>
        {[copy.note1, copy.note2, copy.note3].map((label, i) => <g key={i}>
          <text x="38" y={notesY + 26 + i * 23} fontSize="12" fontWeight="700" fill={accent}>0{i + 1}</text>
          <text x="66" y={notesY + 26 + i * 23} fontSize="12.5" fill={ink}>{label}</text>
        </g>)}
      </g>}
      {/* Small specimen keys are original diagrams, not measured scientific readings. */}
      <g opacity={special} transform={landscape ? "translate(503 70)" : "translate(48 377)"}
        stroke={GRAPHITE} strokeWidth="1.05" fill="none">
        <circle cx={subject === "leaf" ? 260 : 242} cy={subject === "leaf" ? 182 : 155} r="4.3" fill={spec.paper}/>
        <path d={subject === "leaf" ? "M264 182 L316 169 L382 169" : "M246 155 L331 101 L389 101"}/>
        <circle cx={subject === "leaf" ? 260 : 242} cy={subject === "leaf" ? 182 : 155} r="1.45" fill={accent} stroke="none"/>
      </g>
      <path d={landscape ? "M44 486 H916" : "M38 911 H502"} stroke={GRAPHITE} strokeWidth=".85" opacity=".42" fill="none"/>
      <text x={landscape ? 44 : 38} y={landscape ? 511 : 935} fontSize="10.5" letterSpacing="1.5" fontWeight="700" fill={muted}>
        MATERIAL STUDY / COLOURED PENCIL
      </text>
      <text x={landscape ? 766 : 403} y={landscape ? 511 : 935} fontSize="10" letterSpacing="1.2" fill={muted}>PLATE {subject === "leaf" ? "01" : "02"} / 02</text>
    </g>
  </PencilDrawing>;
}
