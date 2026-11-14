import { RisoCharacterInk } from "../../registry/video/riso-character-react";
import { RisoPrint } from "../../registry/video/print-plates-react";
import type { RisoCharacterSpec, RisoJoint } from "../../registry/video/riso-character";
import type { RisoPrintSpec } from "../../registry/video/print-plates";
import type { RisoPaint, RisoArtwork } from "../../registry/video/print-plates-react";
import type { ReactNode } from "react";

export type RisoPerformanceAspect = "landscape" | "portrait";
const waveKeys = (end = 239): RisoJoint["keys"] => [
  { frame: 0, rotate: -10, easing: "ease" },
  { frame: 16, rotate: 12, easing: "ease" },
  { frame: 36, rotate: -10, easing: "ease" },
  { frame: 58, rotate: 12, easing: "ease" },
  { frame: 83, rotate: -10, easing: "ease" },
  { frame: 108, rotate: 11, easing: "ease" },
  { frame: 138, rotate: -9, easing: "ease" },
  { frame: 163, rotate: 12, easing: "ease" },
  { frame: 190, rotate: -10, easing: "ease" },
  { frame: end, rotate: -10 },
];
/** Original paper messenger — arbitrary joint tree, not a hard-coded humanoid renderer. */
export const COURIER: RisoCharacterSpec = {
  version: 1, id: "courier", durationFrames: 240, cadence: 2,
  joints: [
    { id: "root", x: 0, y: 0, keys: [
      { frame: 0, x: -225, y: 0, easing: "ease" },
      { frame: 105, x: -40, y: -7, easing: "ease" },
      { frame: 205, x: 106, y: 0, easing: "ease" },
      { frame: 239, x: 106, y: 0 },
    ] },
    { id: "body", parent: "root", x: 0, y: -72, keys: [
      { frame: 0, y: 0, easing: "ease" }, { frame: 11, y: -5, easing: "ease" },
      { frame: 24, y: 0, easing: "ease" }, { frame: 37, y: -5, easing: "ease" },
      { frame: 50, y: 0, easing: "ease" }, { frame: 63, y: -5, easing: "ease" },
      { frame: 76, y: 0, easing: "ease" }, { frame: 89, y: -5, easing: "ease" },
      { frame: 105, y: 0 }, { frame: 239, y: 0 },
    ] },
    { id: "head", parent: "body", x: 0, y: -68, keys: [
      { frame: 0, rotate: -3, easing: "ease" },
      { frame: 77, rotate: 3, easing: "ease" },
      { frame: 154, rotate: -8, easing: "ease" },
      { frame: 200, rotate: 0 },
    ] },
    { id: "left-arm", parent: "body", x: -24, y: -44, keys: waveKeys() },
    { id: "right-arm", parent: "body", x: 24, y: -44, keys: [
      { frame: 0, rotate: 14, easing: "ease" }, { frame: 65, rotate: -9, easing: "ease" },
      { frame: 137, rotate: 25, easing: "ease" }, { frame: 187, rotate: 42, easing: "ease" },
      { frame: 239, rotate: 42 },
    ] },
    { id: "left-leg", parent: "root", x: -15, y: -40, keys: waveKeys() },
    { id: "right-leg", parent: "root", x: 15, y: -40, keys: [
      { frame: 0, rotate: 13, easing: "ease" }, { frame: 16, rotate: -12, easing: "ease" },
      { frame: 36, rotate: 13, easing: "ease" }, { frame: 58, rotate: -12, easing: "ease" },
      { frame: 83, rotate: 13, easing: "ease" }, { frame: 108, rotate: -12, easing: "ease" },
      { frame: 138, rotate: 13, easing: "ease" }, { frame: 163, rotate: -12, easing: "ease" },
      { frame: 190, rotate: 13, easing: "ease" }, { frame: 239, rotate: 13 },
    ] },
    { id: "satchel", parent: "body", x: 29, y: 0, keys: [
      { frame: 0, rotate: -5, easing: "ease" }, { frame: 25, rotate: 6, easing: "ease" },
      { frame: 49, rotate: -5, easing: "ease" }, { frame: 90, rotate: 7, easing: "ease" },
      { frame: 130, rotate: -5, easing: "ease" }, { frame: 180, rotate: 5, easing: "ease" },
      { frame: 239, rotate: -5 },
    ] },
  ],
  expressions: [
    { frame: 0, name: "neutral" }, { frame: 76, name: "blink" },
    { frame: 81, name: "neutral" }, { frame: 156, name: "speak" },
    { frame: 180, name: "neutral" }, { frame: 198, name: "smile" },
  ],
  parts: [
    { id: "back-leg", joint: "right-leg", plate: "blue", paint: "solid",
      d: "M-9 0 C-14 22 -14 42 -5 45 L9 45 C11 28 12 12 9 0 Z" },
    { id: "front-leg", joint: "left-leg", plate: "blue", paint: "solid",
      d: "M-9 0 C-12 18 -16 37 -8 47 L12 47 C12 33 8 14 9 0 Z" },
    { id: "coat", joint: "body", plate: "blue", paint: "screen",
      d: "M-27 -58 Q0 -75 28 -58 L35 20 Q0 34 -34 20 Z" },
    { id: "coat-seam", joint: "body", plate: "blue", paint: "solid",
      d: "M-4 -61 L3 21 L8 19 L1 -61 Z" },
    { id: "neck", joint: "body", plate: "blue", paint: "solid",
      d: "M-10 -83 H9 V-56 H-10 Z" },
    { id: "face", joint: "head", plate: "blue", paint: "screen",
      d: "M-35 -15 Q-35 -49 -15 -54 Q22 -61 35 -30 Q38 5 20 24 Q-7 40 -29 15 Z" },
    { id: "hair", joint: "head", plate: "blue", paint: "solid",
      d: "M-40 -18 Q-44 -57 -16 -69 Q14 -78 38 -48 L43 -8 Q26 -25 11 -30 Q-7 -14 -35 -15 Z" },
    { id: "eye-line", joint: "head", plate: "blue", paint: "solid",
      d: "M-21 -5 Q-16 -10 -11 -5 Q-15 0 -21 -5 Z M10 -8 Q16 -12 21 -7 Q17 -1 10 -8 Z",
      expressions: {
        blink: "M-23 -5 Q-17 -2 -11 -5 L-11 -3 Q-17 -1 -23 -3 Z M9 -8 Q16 -4 22 -8 L22 -6 Q16 -3 9 -6 Z",
      },
    },
    { id: "mouth", joint: "head", plate: "red", paint: "solid",
      d: "M-7 15 Q0 18 7 14 L7 16 Q0 21 -7 17 Z",
      expressions: {
        speak: "M-6 11 Q0 8 7 11 Q10 20 1 24 Q-7 23 -6 11 Z",
        smile: "M-10 10 Q0 24 11 9 Q0 28 -10 10 Z",
      },
    },
    { id: "cap", joint: "head", plate: "red", paint: "screen",
      d: "M-40 -40 Q-24 -78 11 -77 Q45 -68 45 -35 L-40 -35 Z" },
    { id: "cap-brim", joint: "head", plate: "red", paint: "solid",
      d: "M-47 -37 Q-14 -44 38 -37 L55 -31 Q1 -26 -46 -31 Z" },
    { id: "left-arm-ink", joint: "left-arm", plate: "blue", paint: "solid",
      d: "M-6 0 Q-16 25 -10 51 L5 56 Q8 40 7 6 Z" },
    { id: "right-arm-ink", joint: "right-arm", plate: "blue", paint: "solid",
      d: "M-7 0 Q1 15 8 40 L-5 55 Q-18 34 -12 4 Z" },
    { id: "satchel-ink", joint: "satchel", plate: "red", paint: "screen",
      d: "M-6 0 Q25 -15 36 5 L35 56 Q9 70 -9 51 Z" },
    { id: "satchel-strap", joint: "body", plate: "red", paint: "solid",
      d: "M-26 -56 Q11 -36 34 11 L28 15 Q7 -29 -30 -48 Z" },
    { id: "satchel-flap", joint: "satchel", plate: "red", paint: "solid",
      d: "M-5 8 Q17 14 36 4 L36 18 Q14 29 -8 19 Z" },
    { id: "badge", joint: "body", plate: "red", paint: "solid",
      d: "M9 -42 L20 -38 L16 -26 L6 -30 Z" },
  ],
};
/** Tiny paper bird: demonstrates that parent rig is anatomy-agnostic. */
export const PAPER_BIRD: RisoCharacterSpec = {
  version: 1, id: "paper-bird", durationFrames: 240, cadence: 2,
  joints: [
    { id: "root", x: 0, y: 0, keys: [
      { frame: 0, x: 30, y: -25, easing: "ease" },
      { frame: 75, x: -35, y: 19, easing: "ease" },
      { frame: 145, x: 30, y: -6, easing: "ease" },
      { frame: 210, x: -7, y: -24, easing: "ease" },
      { frame: 239, x: 10, y: 0 },
    ] },
    { id: "left-wing", parent: "root", x: -16, y: -11, keys: [
      { frame: 0, rotate: -26, easing: "ease" }, { frame: 16, rotate: 25, easing: "ease" },
      { frame: 36, rotate: -20, easing: "ease" }, { frame: 58, rotate: 29, easing: "ease" },
      { frame: 84, rotate: -26, easing: "ease" }, { frame: 112, rotate: 25, easing: "ease" },
      { frame: 150, rotate: -20, easing: "ease" }, { frame: 180, rotate: 30, easing: "ease" },
      { frame: 214, rotate: -26, easing: "ease" }, { frame: 239, rotate: 20 },
    ] },
    { id: "right-wing", parent: "root", x: 17, y: -10, keys: [
      { frame: 0, rotate: 27, easing: "ease" }, { frame: 16, rotate: -25, easing: "ease" },
      { frame: 36, rotate: 23, easing: "ease" }, { frame: 58, rotate: -30, easing: "ease" },
      { frame: 84, rotate: 23, easing: "ease" }, { frame: 112, rotate: -25, easing: "ease" },
      { frame: 150, rotate: 22, easing: "ease" }, { frame: 180, rotate: -30, easing: "ease" },
      { frame: 214, rotate: 26, easing: "ease" }, { frame: 239, rotate: -20 },
    ] },
    { id: "tail", parent: "root", x: -28, y: 6, keys: waveKeys() },
  ],
  expressions: [
    { frame: 0, name: "neutral" }, { frame: 124, name: "blink" }, { frame: 132, name: "neutral" },
  ],
  parts: [
    { id: "tail-feathers", joint: "tail", plate: "blue", paint: "solid",
      d: "M0 0 L-32 -17 L-24 0 L-35 14 L0 9 Z" },
    { id: "body", joint: "root", plate: "blue", paint: "screen",
      d: "M-28 -8 Q-22 -29 0 -27 Q30 -27 35 -3 Q21 29 -9 25 Q-30 19 -28 -8 Z" },
    { id: "wing-left", joint: "left-wing", plate: "blue", paint: "solid",
      d: "M0 0 Q-36 -25 -53 -65 Q-35 -45 -18 -42 Q-33 -56 -31 -70 Q-1 -47 5 -5 Z" },
    { id: "wing-right", joint: "right-wing", plate: "blue", paint: "solid",
      d: "M0 0 Q29 -31 35 -59 Q22 -48 19 -44 Q35 -58 32 -67 Q5 -50 -7 -8 Z" },
    { id: "head", joint: "root", plate: "red", paint: "screen",
      d: "M10 -21 Q40 -39 50 -8 Q50 20 23 20 Q6 7 10 -21 Z" },
    { id: "beak", joint: "root", plate: "red", paint: "solid",
      d: "M47 -5 L64 2 L47 11 Z" },
    { id: "eye", joint: "root", plate: "blue", paint: "solid",
      d: "M32 -10 A4 4 0 1 1 31.9 -10 Z",
      expressions: { blink: "M26 -8 Q33 -3 41 -8 L41 -6 Q33 -1 26 -6 Z" },
    },
  ],
};
export function risoPerformanceSpec(aspect: RisoPerformanceAspect, seed = 89): RisoPrintSpec {
  return {
    version: 1, width: aspect === "portrait" ? 540 : 960,
    height: aspect === "portrait" ? 960 : 540,
    paper: "#F2E9D6", seed, startFrame: 0, passFrames: 1, gapFrames: 0,
    plates: [
      { id: "blue", color: "#2362A0", opacity: .97, dotCell: 9,
        dotAngle: 22, registration: [0, 0] },
      { id: "red", color: "#DD593D", opacity: .94, dotCell: 8,
        dotAngle: -19, registration: [1.3, -1.5] },
    ],
  };
}
export interface RisoPerformanceProps {
  aspect: RisoPerformanceAspect;
  frame: number;
  seed?: number;
  cadence?: 1 | 2 | 3 | 4;
  misregistration?: number;
  grain?: number;
  reducedMotion?: boolean;
  visiblePlateIds?: readonly string[];
}
function LayeredCity({ aspect, paint, ink }: {
  aspect: RisoPerformanceAspect; paint: RisoPaint; ink: "blue" | "red";
}): ReactNode {
  const portrait = aspect === "portrait";
  return <g data-km-riso-city={ink} fill={paint.solid}>
    {ink === "blue" ? <>
      <path d={portrait ? "M0 745 H540 V960 H0 Z" : "M0 382 H960 V540 H0 Z"}
        fill={paint.dots} opacity=".55"/>
      <path d={portrait ? "M0 725 H540" : "M0 378 H960"} fill="none"
        stroke={paint.solid} strokeWidth="4"/>
      {[0,1,2,3,4,5].map((i) => {
        const x = portrait ? i * 120 - 25 : i * 190 - 25;
        const h = 80 + (i * 41) % 80;
        const base = portrait ? 725 : 378;
        return <g key={i} opacity={.28 + i % 2 * .10}>
          <rect x={x} y={base - h} width={portrait ? 91 : 140} height={h}
            fill={paint.dots}/>
          <path d={\`M\${x} \${base-h}v\${h}h\${portrait?91:140}\`}
            stroke={paint.solid} strokeWidth="1.4" fill="none"/>
        </g>;
      })}
      <path d={portrait ? "M20 807 Q150 780 265 810 T520 806" :
        "M20 460 Q220 430 480 460 T940 450"} stroke={paint.solid} strokeWidth="2.5"
        strokeDasharray="21 17" opacity=".54" fill="none"/>
    </> : <>
      {[0,1,2,3,4].map(i=> <g key={i} transform={\`translate(\${portrait?i*119:110+i*188} \${portrait?635:284})\`}>
        <path d="M0 68 Q-18 31 0 10 Q20 -9 36 10 Q61 39 41 68 Z" fill={paint.dots} opacity=".68"/>
        <rect x={16} y={65} width={4} height={20}/>
      </g>)}
      <circle cx={portrait ? 395 : 810} cy={portrait ? 185 : 112} r={portrait?84:65}
        fill={paint.dots} opacity=".62"/>
      <circle cx={portrait ? 395 : 810} cy={portrait ? 185 : 112} r={portrait?70:52}
        stroke={paint.solid} strokeWidth="3" fill="none"/>
    </>}
  </g>;
}
export function RisoCharacterPerformance({
  aspect, frame, seed = 89, cadence = 2, misregistration = .3, grain = .55,
  reducedMotion = false, visiblePlateIds,
}: RisoPerformanceProps) {
  const portrait = aspect === "portrait";
  const spec = risoPerformanceSpec(aspect, seed);
  const courier = { ...COURIER, cadence }, bird = { ...PAPER_BIRD, cadence };
  const sample = reducedMotion ? 239 : Math.min(239, frame);
  const titleX = portrait ? 32 : 45, headlineY = portrait ? 160 : 93;
  const stage = portrait ? { x: 270, y: 744, scale: 1.42, birdX: 355, birdY: 514 } :
    { x: 465, y: 381, scale: 1.16, birdX: 660, birdY: 191 };
  const artwork = (plateId: "blue" | "red"): RisoArtwork => (paint: RisoPaint) =>
    <g data-km-riso-performance-plate={plateId}>
      <LayeredCity aspect={aspect} paint={paint} ink={plateId}/>
      <RisoCharacterInk spec={courier} frame={sample} plateId={plateId} paint={paint}
        x={stage.x} y={stage.y} scale={stage.scale} reducedMotion={reducedMotion}/>
      <RisoCharacterInk spec={bird} frame={sample} plateId={plateId} paint={paint}
        x={stage.birdX} y={stage.birdY} scale={portrait?1.1:1.0}
        reducedMotion={reducedMotion}/>
      {plateId === "blue" ? <g fill={paint.solid} fontFamily="Georgia,serif">
        <text x={titleX} y={headlineY} fontSize={portrait?59:66}
          fontWeight={700} letterSpacing="-1.8">PAPER</text>
        <text x={titleX} y={headlineY+(portrait?66:68)} fontSize={portrait?59:66}
          fontWeight={700} letterSpacing="-1.8">COURIER</text>
        <path d={portrait ? "M32 260 H508" : "M45 189 H915"} stroke={paint.solid} strokeWidth="2"/>
        <text x={titleX} y={portrait?290:217} fontSize={portrait?13:12}
          fontFamily="Arial,sans-serif" fontWeight={700} letterSpacing={2.2}>
          A STORY IN TWO INKS
        </text>
        <text x={titleX} y={portrait?908:504} fontFamily="Arial,sans-serif"
          fontSize={portrait?12:12} letterSpacing={1.5}>PRINT / PERFORMANCE / FRAME STUDY</text>
      </g> : <g fill={paint.solid}>
        <path d={portrait ? "M32 326 H238" : "M45 245 H230"} stroke={paint.solid}
          strokeWidth="3" strokeDasharray="11 8"/>
        <g transform={portrait?"translate(45 345) rotate(-5)":"translate(51 260) rotate(-5)"}>
          <rect width={portrait?190:183} height={36} fill="none"
            stroke={paint.solid} strokeWidth="2"/>
          <text x={13} y={25} fontFamily="Arial,sans-serif" fontSize="18"
            fontWeight={700}>TAKE THE LONG WAY</text>
        </g>
        <text x={portrait?400:815} y={portrait?906:503} fontFamily="Arial,sans-serif"
          fontSize="13" fontWeight={700}>RISO / 02</text>
      </g>}
    </g>;
  return <RisoPrint spec={spec} frame={3} artworks={{blue:artwork("blue"),red:artwork("red")}}
    misregistration={misregistration} paperGrain={grain}
    visiblePlateIds={visiblePlateIds} label="Animated Risograph print with independently rigged courier and bird"
    data-km-riso-performance="" data-km-riso-performance-frame={frame} />;
}
