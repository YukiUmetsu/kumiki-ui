import { PaintedComposition } from "../../registry/video/painted-composition-react";
import type { PaintedCompositionSpec } from "../../registry/video/painted-composition";
import type { PaintedGenre } from "./painted-composition-demo";

const LABELS = {
  nature: { title: ["Distant", "horizons"], subtitle: "Air, water and evening light.", number: "01" },
  architecture: { title: ["A quiet", "shelter"], subtitle: "A study in architectural light.", number: "02" },
  science: { title: ["Inside the", "living cell"], subtitle: "A painted scientific observation.", number: "03" },
  product: { title: ["Object", "& light"], subtitle: "A crafted material study.", number: "04" },
} as const;

/** Identical original composition in Storybook and production export. */
export function PaintedWorldPage({ spec, genre, frame, reducedMotion, camera }: {
  spec: PaintedCompositionSpec; genre: PaintedGenre; frame: number; reducedMotion: boolean;
  camera?: { x: number; y: number; zoom: number };
}) {
  const portrait = spec.height > spec.width;
  const meta = LABELS[genre];
  const left = portrait ? 36 : 44;
  return <PaintedComposition spec={spec} frame={frame} reducedMotion={reducedMotion} camera={camera}
    label={meta.title.join(" ") + " — layered original watercolor demonstration"}>
    <g fill="#32494D" pointerEvents="none">
      <path d={portrait ? "M37 48 H504" : "M43 49 H918"} stroke="#7E8B80" strokeWidth={1.1} opacity={.6}/>
      <text x={left} y={portrait ? 82 : 80} fontSize={11.8} letterSpacing={2.35}
        fontFamily="Arial, Helvetica, sans-serif" fontWeight={700}>KUMIKI  /  PAINTED WORLDS</text>
      <text x={left - 2} y={portrait ? 158 : 156} fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic" fontSize={portrait ? 67 : 59} letterSpacing={-1.6}>{meta.title[0]}</text>
      <text x={left - 2} y={portrait ? 229 : 224} fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic" fontSize={portrait ? 68 : 62} letterSpacing={-2}>{meta.title[1]}</text>
      <path d={portrait ? "M38 257 H317" : "M45 256 H373"} stroke="#978E82" strokeWidth={1}/>
      <text x={left} y={portrait ? 293 : 293} fontFamily="Georgia,serif" fontSize={portrait ? 19 : 16}
        fill="#67716C">{meta.subtitle}</text>
      <text x={left} y={portrait ? 328 : 331} fontFamily="Arial,Helvetica,sans-serif"
        fontSize={portrait ? 11 : 10} letterSpacing={1.5} fill="#8C8275">
        PIGMENT  ·  PAPER  ·  HAND-DRAWN FORM
      </text>
      <path d={portrait ? "M38 893 H501" : "M43 478 H919"} stroke="#7E8B80" strokeWidth={1.1} opacity={.6}/>
      <text x={left} y={portrait ? 920 : 504} fontFamily="Arial,Helvetica,sans-serif"
        fontSize={11.5} fontWeight={700} letterSpacing={1.8}>WATERCOLOUR STUDIES</text>
      <text x={portrait ? 429 : 859} y={portrait ? 920 : 504}
        fontFamily="Georgia,serif" fontSize={15} fontStyle="italic">{meta.number} / 04</text>
      {genre === "science" && <g fill="#355A64" fontSize={10} fontFamily="Arial,sans-serif" letterSpacing=".8">
        <text x={portrait ? 55 : 451} y={portrait ? 848 : 449}>MODEL: CELL SECTION</text>
        <text x={portrait ? 55 : 451} y={portrait ? 864 : 462}>ILLUSTRATIVE · NOT TO SCALE</text>
      </g>}
      {genre === "product" && <g fill="#536660" fontSize={12} fontFamily="Georgia,serif"
        fontStyle="italic"><text x={portrait ? 236 : 625} y={portrait ? 682 : 315}>An unbranded study</text></g>}
    </g>
  </PaintedComposition>;
}
