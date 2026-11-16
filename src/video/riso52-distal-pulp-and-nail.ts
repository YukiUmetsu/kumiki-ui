import type {RisoCharacterPart} from "../../registry/video/riso-character";
import {RISO31_GEOMETRY,riso31PhalanxSourcePath} from "./riso31-finger-phalanges";

/**
 * RISO52 ArtCraft / actual side-view curled supporting fingertips.
 *
 * The previous RISO51 correctly moved proximal / intermediate red phalanx
 * *source paths* with the shortened 3/4 pivot station, but left every distal
 * phalanx as the original long front-on tube. At 6.2×, the long red finger
 * pulp and its blue nail became three dangling thin sausages below the palm.
 *
 * In a lateral paper pinch, the DIP-to-pulp segments POINT TOWARD the camera,
 * so their visible 2D length is smaller than their clinical bone length.
 * Draw three new, individually shaped original red positive silhouettes
 * and move their *original* cobalt nail matrix by precisely the same
 * projected distal-axis delta. No reduced bone length, removed part, fake
 * alpha transparency, raster, geometry-independent mark or new ink.
 *
 * The previous clinically bounded ANAT1 DIP source joint still moves
 * the entire detail; its camera-facing projection affects source paths only.
 */
export const RISO52_DISTAL_SIDE_CUP={
  actorSides:{courier:"right","paper-artist":"left"} as const,
  // Projected foreshortening is deliberately unequal. The ring has the
  // greatest flexion / finger overlap, the little finger a more open pulp.
  distalRatio:{middle:.48,ring:.52,pinky:.58} as const,
  redBonePaths:3,
  registeredBlueNails:3,
  contactFrame:160,
  source:"CDC six hand grip positions; Proko 3/4 fingers; Kumiki ANAT1 original distal bone",
  maxProjectionRatio:.58,
  minProjectionRatio:.48,
} as const;
export type Riso52Actor="courier"|"paper-artist";
export type Riso52Digit=keyof typeof RISO52_DISTAL_SIDE_CUP.distalRatio;
const n=(v:number)=>Number(v.toFixed(4));

/** Original source-displacement (not an extra independently translated SVG).
 * Nails are attached to the same moving DIP matrix as the red pulp.
 * Adjust every y-bearing Q/C/L/M control point by a shared delta, preserving
 * its original carved contour, lens and fine internal highlight.
 */
function moveNailWithPulp(d:string,delta:number):string{
  const tokens=d.match(/[MLCQZ]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g);
  if(!tokens)throw new Error("RISO52: missing registered cobalt nail source");
  const count:{[key:string]:number}={M:2,L:2,C:6,Q:4,Z:0};
  const out:string[]=[];
  for(let i=0;i<tokens.length;){
    const command=tokens[i++],arity=count[command];
    if(arity===undefined)throw new Error("RISO52: unsupported nail path topology");
    const pairs:string[]=[];
    for(let j=0;j<arity;j+=2){
      const x=Number(tokens[i++]),y=Number(tokens[i++]);
      if(!Number.isFinite(x)||!Number.isFinite(y))
        throw new Error("RISO52: malformed original nail Bézier");
      pairs.push(String(n(x)),String(n(y+delta)));
    }
    out.push([command,...pairs].join(" "));
  }
  return out.join(" ");
}

/** Return the new actual original RED/BLUE physical source, or null for
 * untouched fingers / original actor counterpart. Index and thumb are
 * *never* modified: RISO43's true precision pinch still holds the paper.
 */
export function riso52DistalContactSource(
  part:RisoCharacterPart,actor:Riso52Actor,
):string|null{
  const side=RISO52_DISTAL_SIDE_CUP.actorSides[actor];
  const m=new RegExp("^"+side+"-glove-(middle|ring|pinky)(-distal-phalanx|-nail)$").exec(part.id);
  if(!m)return null;
  const digit=m[1] as Riso52Digit,geometry=RISO31_GEOMETRY[digit];
  const visible=geometry.distal*RISO52_DISTAL_SIDE_CUP.distalRatio[digit];
  if(m[2]==="-distal-phalanx"){
    if(part.plate!=="red"||part.paint!=="solid"||part.joint!==side+"-"+digit+"-dip")
      throw new Error("RISO52: distal positive red bone must retain exact original moving DIP joint");
    return riso31PhalanxSourcePath(digit,"distal",visible,geometry.width*.85);
  }
  if(part.plate!=="blue"||part.joint!==side+"-"+digit+"-dip")
    throw new Error("RISO52: cobalt nail must stay on the same source DIP as the RED distal pad");
  return moveNailWithPulp(part.d,visible-geometry.distal);
}
