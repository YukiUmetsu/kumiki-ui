import type {RisoCharacterPart,RisoCharacterSpec} from "../../registry/video/riso-character";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";

/**
 * RISO46 / ArtCraft: a genuinely source-drawn radial thumb / index-web study.
 *
 * A CMC/thenar pad is a VOLUME connecting the metacarpal to the palm, not
 * three short parallel red tubes. These original asymmetric C/Q ribbons are
 * printed on the existing two spot masters, in their actual moving joints.
 * A ribbon inside the thumb follows thumb opposition; the recessed web stays
 * attached to the original palm. No canvas overlay, blur or third ink.
 *
 * These are editorial two-dimensional print projections, not measured
 * photographic 3/4 hand likeness. See docs/research/riso46-thenar-web-artcraft.md.
 */
export type Riso46Actor="courier"|"paper-artist";
export type Riso46Side="left"|"right";
export const RISO46_ANATOMICAL_GRAMMAR={
  mass:"curved thenar eminence supporting thumb CMC/opposition",
  void:"narrow curved thumb/index commissure with deliberate unprinted gap",
  motion:"thumb-borne source ribbons turn with CMC; palm web roots stay on the palm",
  material:"original AM-screened cobalt and vermilion masters, paper-grain preserved",
} as const;

export function riso46ThenarWebParts(actor:Riso46Actor,side:Riso46Side):readonly RisoCharacterPart[]{
  const courier=actor==="courier",right=side==="right";
  // The two actors and both handed silhouettes have independently authored
  // pressure rhythm. These local contours sit INSIDE the proximal red thumb
  // source: no separate floating impression appears after joint rotation.
  const body=right
    ? courier
      ? "M-2.25 -3.2 C-1.55 -4.0 -.53 -4.45 .78 -4.05 C1.72 -3.73 2.75 -2.82 3.14 -1.85 C2.35 -2.66 1.39 -3.22 .26 -3.27 C-.7 -3.46 -1.57 -2.75 -2.25 -3.2 Z"
      : "M-2.12 -3.05 C-1.62 -4.08 -.18 -4.35 1 -3.91 C2.18 -3.35 2.71 -2.61 3.1 -1.59 C2.3 -2.43 1.48 -3.04 .18 -3.08 C-.72 -3.23 -1.61 -2.67 -2.12 -3.05 Z"
    : courier
      ? "M2.14 -3.14 C1.28 -4.16 .31 -4.34 -.97 -3.93 C-2.19 -3.44 -2.96 -2.48 -3.21 -1.49 C-2.48 -2.33 -1.39 -3.05 -.28 -3.2 C.67 -3.35 1.55 -2.78 2.14 -3.14 Z"
      : "M2.2 -3.02 C1.43 -3.96 .33 -4.17 -.83 -3.84 C-2.09 -3.31 -2.86 -2.47 -3.05 -1.53 C-2.28 -2.26 -1.23 -2.96 -.17 -3.11 C.76 -3.24 1.58 -2.66 2.2 -3.02 Z";
  const flex=right
    ? courier
      ? "M-2.25 -2.7 C-.84 -3.77 1.0 -3.58 2.38 -2.24 L2.17 -1.91 C.81 -3.08 -.59 -3.27 -2.05 -2.42 Z M-1.52 -1.61 C-.37 -2.08 .73 -1.76 1.45 -.92 L1.22 -.65 C.45 -1.36 -.28 -1.57 -1.31 -1.34 Z"
      : "M-2.18 -2.67 C-.81 -3.6 .91 -3.53 2.23 -2.13 L2.07 -1.8 C.82 -3.04 -.64 -3.17 -1.93 -2.38 Z M-1.42 -1.52 C-.29 -1.94 .65 -1.7 1.41 -.84 L1.13 -.6 C.39 -1.28 -.25 -1.48 -1.23 -1.23 Z"
    : courier
      ? "M2.16 -2.69 C.75 -3.66 -1.0 -3.49 -2.4 -2.19 L-2.15 -1.87 C-.82 -3.05 .6 -3.2 1.94 -2.39 Z M1.51 -1.58 C.35 -2.01 -.64 -1.71 -1.52 -.84 L-1.27 -.6 C-.42 -1.35 .26 -1.52 1.3 -1.31 Z"
      : "M2.14 -2.64 C.77 -3.58 -.86 -3.5 -2.22 -2.13 L-2.03 -1.82 C-.75 -3.01 .65 -3.16 1.91 -2.36 Z M1.4 -1.52 C.31 -1.92 -.65 -1.66 -1.42 -.84 L-1.2 -.58 C-.36 -1.3 .29 -1.45 1.18 -1.24 Z";
  // The web cannot be a disconnected triangular crotch. A short load-bearing
  // S-curve turns back into the palm, while a separated lighter short reserve
  // describes the far thumb/index plane without covering the paper-white gap.
  const recess=right
    ? courier
      ? "M6.1 .25 C7.08 1.62 7.15 3.43 5.48 4.7 C4.92 5.04 4.15 5.34 3.42 5.27 L3.49 4.92 C5.09 4.71 6.23 3.03 5.82 .52 Z M5.07 1.35 C5.51 2.08 5.48 3.11 4.87 3.68 L4.6 3.57 C5.08 2.88 5.12 2.17 4.82 1.56 Z"
      : "M6.26 .31 C7.12 1.63 7.04 3.28 5.45 4.53 C4.75 4.95 4.03 5.12 3.47 5.23 L3.51 4.91 C5.21 4.61 6.2 3.02 5.96 .55 Z M5.1 1.32 C5.58 2.12 5.39 2.95 4.86 3.52 L4.62 3.47 C5.08 2.81 5.06 2.02 4.83 1.55 Z"
    : courier
      ? "M-6.16 .34 C-7.14 1.57 -7.08 3.45 -5.42 4.7 C-4.89 5.09 -4.01 5.29 -3.37 5.25 L-3.44 4.92 C-5.09 4.65 -6.28 3.02 -5.87 .57 Z M-5.14 1.34 C-5.58 2.12 -5.49 3.12 -4.85 3.65 L-4.59 3.48 C-5.08 2.81 -5.17 2.15 -4.86 1.57 Z"
      : "M-6.25 .32 C-7.02 1.61 -7.1 3.26 -5.39 4.52 C-4.74 4.99 -4.05 5.11 -3.4 5.22 L-3.51 4.92 C-5.22 4.6 -6.17 2.94 -5.94 .54 Z M-5.13 1.29 C-5.54 2.03 -5.44 3.02 -4.8 3.47 L-4.61 3.36 C-5.06 2.78 -5.12 2.07 -4.82 1.55 Z";
  return [
    {id:side+"-glove-thumb-radial-volume",joint:side+"-thumb",
      plate:"red",paint:"screen",screenTone:"mid",d:body},
    {id:side+"-glove-thumb-radial-incisions",joint:side+"-thumb",
      plate:"blue",paint:"screen",screenTone:"light",d:flex},
    {id:side+"-glove-web-palm-recess",joint:side+"-hand",
      plate:"blue",paint:"screen",screenTone:"mid",d:recess},
  ];
}

/** Inspect actual evaluated source parts, not decorations over a screenshot. */
export function inspectRiso46ThenarWeb(
  actor:RisoCharacterSpec,frame:number,side:Riso46Side,
){
  const pose=evaluateRisoCharacter(actor,frame);
  const expected=riso46ThenarWebParts(actor.id as Riso46Actor,side);
  const output=new Map(pose.parts.map(p=>[p.id,p]));
  const original=new Map(actor.parts.map(p=>[p.id,p]));
  const stamps=expected.map(part=>{
    const src=original.get(part.id),ink=output.get(part.id);
    if(!src||!ink||src.joint!==part.joint||src.d!==part.d||
      src.plate!==part.plate||src.paint!=="screen"||
      src.screenTone!==part.screenTone||ink.opacity!==1)
      throw new Error("RISO46 source shape or physical master changed: "+part.id);
    return ink;
  });
  return {
    actor:actor.id,frame,side,sourceCount:stamps.length,
    redStamps:stamps.filter(p=>p.plate==="red").length,
    blueStamps:stamps.filter(p=>p.plate==="blue").length,
    independentThumbAndPalmTransforms:stamps[0].transform!==stamps[2].transform,
    authoredCubicTurns:expected.reduce((n,p)=>n+(p.d.match(/C/g)?.length??0),0),
    physicalTwoInks:[...new Set(stamps.map(p=>p.plate))].sort(),
  };
}
