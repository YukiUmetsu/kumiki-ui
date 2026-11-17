import type {RisoCharacterPart} from "../../registry/video/riso-character";

/**
 * RISO53 — physical two-spot painter's ordering for a true *cupped* hand.
 *
 * Prior RISO31–52 put the filled palm source first and then overprinted
 * ALL three support phalanges on top. At actual 6.2× native print,
 * flexed middle/ring/little roots read as three RED detachable sausages
 * stuck to the flat palm, even after RISO51/52 foreshortening.
 *
 * The physically correct 3/4 construction is depth layered:
 *   back of finger / flexed PIP+DIP / pulp -> metacarpal palm cup ->
 *   opposed radial thumb + index pressure -> opaque physical paper.
 * The digits remain THREE moving source-red bones, their cobalt nails
 * still print on their original registered DIP joint, and no geometry
 * or contour is deleted. The palm simply occludes the proximal web
 * region where an actual anatomical hand would wrap over its fingers.
 *
 * This is reordering authored source parts inside the existing true
 * RED drum. It is not masking an unsolved joint with a fake opaque SVG
 * sticker, adding a separate material, or changing the RISO43
 * index-over / thumb-under real-paper staging.
 */
export type Riso53Actor="courier"|"paper-artist";
export type Riso53Side="left"|"right";
const digits=["middle","ring","pinky"] as const;
const segments=["","-middle-phalanx","-distal-phalanx"] as const;
export const RISO53_PALMAR_OVERLAP={
  anatomy:"palmar metacarpal volume encloses the proximal support-finger flexor roots",
  printOrder:"3 articulated far finger bones -> solid red original palm -> radial thumb/index" as const,
  redSupportSourceCount:9,
  originalPaperLayer:"original RISO43 index above actual sheet; thumb, palm and support behind",
  sources:"Proko lateral paper pinch; CDC NIOSH LPinch; original RISO31–52 2D ANAT1",
} as const;

/** Returns the 9 original far/ulnar positive RED printed source IDs.
 * All red bones and their independent blue engraved nails still render.
 */
export function riso53OccludedFingerSourceIds(side:Riso53Side):readonly string[]{
  return digits.flatMap(d=>segments.map(stage=>side+"-glove-"+d+stage));
}

/**
 * Stable physical print order. Source identity and all 2-ink stencil
 * content are preserved; only the actual red drawing order of the
 * *active gripping hand* is changed. Index/thumb and opposite-hand
 * source layer positions are intentionally untouched.
 */
export function riso53ReorderPalmarInk(
  parts:readonly RisoCharacterPart[],actor:Riso53Actor,
):readonly RisoCharacterPart[]{
  const side=actor==="courier"?"right":"left";
  const palmId=side+"-glove";
  const palm=parts.find(p=>p.id===palmId);
  if(!palm||palm.plate!=="red"||palm.paint!=="solid")
    throw new Error("RISO53 requires original positive-ink carpal palm");
  const toOcclude=new Set(riso53OccludedFingerSourceIds(side));
  const support=parts.filter(p=>toOcclude.has(p.id));
  if(support.length!==RISO53_PALMAR_OVERLAP.redSupportSourceCount ||
    new Set(support.map(p=>p.id)).size!==support.length ||
    support.some(p=>p.plate!=="red"||p.paint!=="solid"))
    throw new Error("RISO53 cannot reorder incomplete original three-bone hand");
  const notSupport=parts.filter(p=>!toOcclude.has(p.id));
  const palmAt=notSupport.findIndex(p=>p.id===palmId);
  if(palmAt<0)throw new Error("RISO53 source carpal cup was deleted");
  return [...notSupport.slice(0,palmAt),...support,
    ...notSupport.slice(palmAt)];
}

/** Plain source-readback. Does not claim visual realism: tests must check
 * the actual RED stencil at 1× and 6.2× after Storybook printing.
 */
export function riso53InspectSourceDepth(
  parts:readonly RisoCharacterPart[],actor:Riso53Actor,
){
  const side=actor==="courier"?"right":"left";
  const palmAt=parts.findIndex(p=>p.id===side+"-glove");
  const far=riso53OccludedFingerSourceIds(side);
  const redBehind=far.filter(id=>{
    const at=parts.findIndex(p=>p.id===id);
    return at>=0&&at<palmAt&&parts[at].plate==="red";
  });
  const index=parts.findIndex(p=>p.id===side+"-glove-index");
  const thumb=parts.findIndex(p=>p.id===side+"-glove-thumb");
  return {
    actor,side,palmAt,farRedBehind: redBehind.length,
    originalSupportIds:far,
    indexSourceAbovePalm:index>palmAt,
    thumbSourceAbovePalm:thumb>palmAt,
    complete:redBehind.length===RISO53_PALMAR_OVERLAP.redSupportSourceCount&&
      index>palmAt&&thumb>palmAt,
  };
}
