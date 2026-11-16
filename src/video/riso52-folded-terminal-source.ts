import type {RisoCharacterPart} from "../../registry/video/riso-character";
import {RISO31_GEOMETRY,riso31PhalanxSourcePath} from "./riso31-finger-phalanges";
import {riso55FoldbackContour} from "./riso55-foldback-pulp-source";

/**
 * RISO52 / ArtCraft: foreshorten the PRINTED distal pulp and its cobalt nail
 * together, not only the parent PIP/DIP bone. Earlier RISO51 moved PIP/DIP
 * source stations and proximal+middle RED paths, but left six long distal
 * red tips and their blue nails in a frontal presentation. In the actual
 * two-figure f160 Chromium image they still read as three separate rakes.
 *
 * The original joint is the source coordinate frame; paper, both original
 * spot inks and all existing small anatomy details are retained. There is
 * no sprite, opacity trick, third plate or post-process image warp.
 * This is an authored 2D side projection, not source-calibrated 3D likeness.
 */
export type Riso52Actor="courier"|"paper-artist";
export type Riso52Digit="middle"|"ring"|"pinky";
export type Riso52Side="left"|"right";
const supportDigits=["middle","ring","pinky"] as const;
export const RISO52_FOLDED_TERMINALS={
  source:"CMU hand holding paper 3/4 photograph; Proko anatomical finger flexion; Kumiki ANAT1",
  contactFrame:160,
  // Different pulp foreshortening by role/digit. Ratio of two-dimensional
  // visible terminal reach to unchanged ANAT1 actual anatomical bone length.
  courier:{middle:.54,ring:.53,pinky:.58},
  "paper-artist":{middle:.49,ring:.51,pinky:.56},
  plates:["blue","red"] as const,
  preserved:"moving red distal pulp + independently moving real cobalt nail folds",
} as const;

const n=(x:number)=>Number(x.toFixed(4));
const command=/^[MLCQZ]$/;
const tokens=/[MLCQZ]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g;
const arity:Readonly<Record<string,number>>={M:2,L:2,C:6,Q:4,Z:0};

/** Coordinate-space drawing projection for physical cobalt nail ink.
 * Keep every existing tiny nail stroke and enclosed contour. The base of
 * the DIP stays fixed while distal detail follows the compressed pulp;
 * near-side widths are retained to read at real Riso screen pitch.
 *
 * Only strict explicit SVG C/Q/L/M/Z are accepted. No newly interpreted
 * external input, arbitrary path commands or direct DOM rendering.
 */
export function riso52ProjectNailContour(original:string,ratio:number):string{
  if(!Number.isFinite(ratio)||ratio<.4||ratio>1)
    throw new RangeError("RISO52 source nail projection must remain in .4..1");
  const t=original.match(tokens);
  if(!t||original.replace(tokens,"").replace(/[\s,]/g,"")!=="")
    throw new Error("RISO52 malformed original source engraving");
  const out:string[]=[];
  for(let i=0;i<t.length;){
    const cmd=t[i++];
    if(!command.test(cmd))throw new Error("RISO52 unsupported source curve topology");
    const a=arity[cmd],pts:string[]=[];
    for(let j=0;j<a;j+=2){
      const x=Number(t[i++]),y=Number(t[i++]);
      if(!Number.isFinite(x)||!Number.isFinite(y))
        throw new Error("RISO52 missing original stroke control point");
      // Do not compress negative/base crease anchors or x-axis width.
      // All nail value planes remain on the same original physical BLUE
      // plate while their far-side y stations track the RED pulp.
      pts.push(String(n(x)),String(n(y>0?y*ratio:y)));
    }
    out.push([cmd,...pts].join(" "));
  }
  return out.join(" ");
}

const sourceId=/^(left|right)-glove-(middle|ring|pinky)-(distal-phalanx|nail)$/;
/** Re-author only the original distal source geometry for the hand actually
 * holding the page; the other side, index/thumb and actor identity are exact.
 * Caller supplies existing 24fps path keys (same canonical RISO51 cadence).
 */
export function riso52FoldedTerminalContact(
  part:RisoCharacterPart,actor:Riso52Actor,
):string|null{
  const match=sourceId.exec(part.id);
  const activeSide=actor==="courier"?"right":"left";
  if(!match||match[1]!==activeSide)return null;
  const digit=match[2] as Riso52Digit,stage=match[3];
  const ratio=RISO52_FOLDED_TERMINALS[actor][digit];
  if(stage==="nail"){
    if(part.plate!=="blue"||part.joint!==activeSide+"-"+digit+"-dip")
      throw new Error("RISO52 requires original living cobalt nail "+part.id);
    // RISO55 genuine source turn of a 3/4 distal nail plane. Never simply
    // reduce the y reach and leave a forward-pointing cobalt claw.
    return riso55FoldbackContour(
      riso52ProjectNailContour(part.d,ratio),actor,digit);
  }
  if(part.plate!=="red"||part.paint!=="solid"||
    part.joint!==activeSide+"-"+digit+"-dip")
    throw new Error("RISO52 requires original living vermilion pulp "+part.id);
  const g=RISO31_GEOMETRY[digit];
  const reach=g.distal*ratio;
  // Make the red positive pulp turn with the same exact view as its
  // original independently printed moving BLUE nail.
  return riso55FoldbackContour(
    riso31PhalanxSourcePath(digit,"distal",reach,g.width*.85),actor,digit);
}

export function riso52ExpectedOriginalSourceIds(side:Riso52Side):readonly string[]{
  return supportDigits.flatMap(digit=>[
    side+"-glove-"+digit+"-distal-phalanx",
    side+"-glove-"+digit+"-nail",
  ]);
}

/** The tip-to-MCP spatial projection is controlled by original joint bones
 * (RISO48–51); this module only measures loaded physical source reach.
 */
export function riso52TerminalReach(actor:Riso52Actor,digit:Riso52Digit){
  const natural=RISO31_GEOMETRY[digit].distal;
  const ratio=RISO52_FOLDED_TERMINALS[actor][digit];
  return {digit,original:natural,projected:n(natural*ratio),ratio,
    reduction:n(natural*(1-ratio))};
}
