import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import type {RisoCharacterSpec} from "../../registry/video/riso-character";
import {riso31SegmentIds} from "./riso31-finger-phalanges";
import {riso32ThumbDistalId} from "./riso32-thumb-ip";
import {RISO30_GRIP_FOREGROUND_IDS} from "./riso-hand-artcraft";

/**
 * RISO43 source-ink depth grammar: physical sheet is BETWEEN the index
 * finger (overpaper) and opposed thumb (underpaper), NOT beneath both.
 *
 * The two-color print stack already draws complete ORIGINAL characters,
 * including thumb and other three fingers, before the physically opaque
 * letter. Reprinting every original digit as foreground made two opposed
 * red tips merge into a near-black red claw/diamond at the paper corner.
 * Only the real three-bone index and its attached cobalt nail/folds print
 * again in front. The thumb and support fingers remain living source ink
 * behind the opaque paper, never removed from the rig or overdrawn with RGB.
 */
export const RISO43_DEPTH_REFERENCE={
  grip:"thumb-to-index pad-to-pad paper-edge precision pinch",
  near:"articulated index PIP/DIP red parts and source cobalt nail/folds",
  far:"articulated opposed thumb IP, middle/ring/pinky and palm stay behind paper",
  medium:"original opaque paper + two RisoPrint spot masters; no new plate",
} as const;
export function riso43FrontIndexIds(side:"left"|"right"):readonly string[]{
  return [
    side+"-glove-index",
    ...riso31SegmentIds(side).filter(id=>id.startsWith(side+"-glove-index-")),
    ...RISO30_GRIP_FOREGROUND_IDS(side)
      .filter(id=>id.startsWith(side+"-glove-index-")),
  ];
}
export function inspectRiso43PrintDepth(
  spec:RisoCharacterSpec,frame:number,side:"left"|"right",
){
  const original=evaluateRisoCharacter(spec,frame);
  const source=new Map(original.parts.map(p=>[p.id,p]));
  const above=riso43FrontIndexIds(side);
  const indexFront=above.map(id=>{
    const part=source.get(id);
    if(!part||part.knockoutOnly||!part.transform.startsWith("matrix("))
      throw new Error("RISO43 real index-source front stamp absent "+id);
    return part;
  });
  const under=original.parts.filter(p=>
    (p.id.startsWith(side+"-glove-")||p.id===side+"-glove")&&
    !above.includes(p.id)&&!p.knockoutOnly);
  const required=[
    side+"-glove-thumb",riso32ThumbDistalId(side),
    ...(["middle","ring","pinky"] as const).flatMap(d=>[
      side+"-glove-"+d,side+"-glove-"+d+"-middle-phalanx",
      side+"-glove-"+d+"-distal-phalanx"]),
  ];
  for(const id of required)if(!under.some(p=>p.id===id))
    throw new Error("RISO43 physically under-paper source missing "+id);
  return {
    actor:spec.id,frame,side,
    aboveIds:above,aboveRedIds:indexFront.filter(p=>p.plate==="red").map(p=>p.id),
    aboveBlueIds:indexFront.filter(p=>p.plate==="blue").map(p=>p.id),
    underRedIds:under.filter(p=>p.plate==="red").map(p=>p.id),
    originalThumbIPBehindPaper:under.some(p=>p.id===riso32ThumbDistalId(side)),
    aboveHasNoThumbOrSupport:above.every(id=>
      id.includes("-index")&&!id.includes("-thumb")),
    physicallyPrintedOriginalParts:original.parts.length,
    source:"real two-ink source parts; original actor-before-paper / index-only above-paper" as const,
  };
}
