import type {RisoCharacterSpec} from "../../registry/video/riso-character";
import {inspectRiso39OpposedPaperPinch} from "./riso39-opposed-paper-pinch";

/**
 * ArtCraft RISO41: pressure from the ORIGINAL moving opposed red ink,
 * not from a wrist-root proximity heuristic or cosmetic blue gradient.
 *
 * Paper thickness is not simulated. The 0.6–3.0 source-unit range below
 * is the observed editorial ink-contact *visual cue* for this two-colour
 * print at actual scale; it is not clinical tissue pressure in newtons.
 * Physical contact needs a separately viewed source render and paper
 * orientation proof before an artist may approve it.
 */
export const RISO41_INK_PRESSURE={
  pressGap:0.6,
  releaseGap:3.0,
  pressureMeaning:"illustrated pinch cue from closed red pads, NOT clinical force" as const,
} as const;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(t:number)=>{const v=clamp(t);return v*v*(3-2*v);};
export function inspectRiso41InkPressure(
  actor:RisoCharacterSpec,frame:number,side:"left"|"right",
){
  const contact=inspectRiso39OpposedPaperPinch(actor,frame,side);
  const separation=contact.sourceInkGap;
  const normalized=(RISO41_INK_PRESSURE.releaseGap-separation)/
    (RISO41_INK_PRESSURE.releaseGap-RISO41_INK_PRESSURE.pressGap);
  const pressure=smooth(normalized);
  return {
    actor:actor.id,side,frame,inkGap:separation,
    tipDistance:contact.tipDistance,
    pressure,
    pressureCategory:pressure===0?"open":pressure===1?"press":"approach" as
      "open"|"press"|"approach",
    meaning:RISO41_INK_PRESSURE.pressureMeaning,
  };
}
