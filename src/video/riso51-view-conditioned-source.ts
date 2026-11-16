import type {RisoCharacterPart} from "../../registry/video/riso-character";
import type {RisoPathMorphKey} from "../../registry/video/riso-path-morph";
import {RISO31_GEOMETRY,riso31PhalanxSourcePath} from "./riso31-finger-phalanges";
import {RISO48_RECEIVER_PROJECTION} from "./riso48-projected-support";
import {RISO49_DONOR_PROJECTION} from "./riso49-donor-projection";

/**
 * RISO51 — build real view-conditioned, moving RED / BLUE source contours.
 *
 * RISO50 print showed a circle-palm and floating rakes because it changed
 * the drawing only once. This constructs two **continuous drawn source
 * drawings** for the same five-bone living rig: open three-quarter metacarpal
 * volume, and a flexed side-cup at actual sheet contact. Source outlines,
 * secondary cobalt faceted knuckles, and the six original RED support bone
 * caps are all rebuilt on the SAME real print plates, at every cel.
 *
 * These are authored perspective-control decisions, not claims of a 3D
 * calibrated photo reconstruction. Opposed index & thumb never morph.
 */
export type Riso51Actor="courier"|"paper-artist";
export type Riso51Side="left"|"right";
export const RISO51_VIEW_CONTRACT={
  source:"CMU Hand Holding Papers thumb-over four folded fingers; Andrew Loomis Plate 81 palm hollow; ANAT1 HAND_POSES.grip",
  anatomy:"pinky-ward MCP arc recedes before middle; carpal cup does not detach from original fingers",
  inking:"original RED palm/finger bones with matching BLUE MCP support, no alpha blend",
  genuineSourceViewFrames:[0,146,160,180,205,239] as const,
  contactDepth:{courier:1,"paper-artist":1} as const,
  affectedOriginalPartsPerActor:9,
} as const;

const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const round=(v:number)=>Number(v.toFixed(4));

/** Original 3/4 palmar projection. Coordinates are in the original radial
 * x axis and local 2D stage plane. At contact the ulnar (little-finger) MCP
 * *lowers* in the frame and *fans outward*, not just uniformly scaling an
 * inflated mitten. The wrist station stays fixed and all exact hand joints
 * continue carrying the silhouette.
 *
 * The same stereographic decision is applied to primary red palm AND its
 * matching blue MCP facets so the dark ink stays on skin rather than
 * floating outside its cutout.
 */
export function riso51ProjectPalmarPoint(
  x:number,y:number,side:Riso51Side,actor:Riso51Actor,depth:number,
):readonly [number,number]{
  const handed=side==="right"?1:-1,radial=x*handed;
  const height=clamp((y+1.0)/20.5);
  const far=clamp(-radial/10.5);
  const near=clamp(radial/10.5);
  // Courier grips harder and abducts the hypothenar farther; the receiver's
  // index/thenar is more padded and the far MCP recession slightly smaller.
  const ulnarFan=actor==="courier"?2.7:2.25;
  const ulnarRecession=actor==="courier"?5.1:4.55;
  const indexCrest=(actor==="courier"?.76:1.08)*near*height;
  const projectedX=radial-depth*ulnarFan*far*height+depth*indexCrest;
  const projectedY=y-depth*ulnarRecession*far*height+
    depth*.63*near*height;
  return [round(projectedX*handed),round(projectedY)];
}

/** Exact original SVG M/L/C/Q/Z numeric grammar. The existing physical
 * source curves retain the exact same command/control-point count. Do not
 * infer or scan photo pixels. We deliberately reject other topology rather
 * than producing an erroneous path at video time.
 */
export function riso51ProjectPalmarPath(
  d:string,side:Riso51Side,actor:Riso51Actor,depth:number,
):string{
  const tokens=d.match(/[MLCQZ]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g);
  if(!tokens)throw new Error("RISO51: empty original palm path");
  const arity:{[key:string]:number}={M:2,L:2,C:6,Q:4,Z:0};
  const parts:string[]=[];
  for(let i=0;i<tokens.length;){
    const command=tokens[i++];
    if(!Object.prototype.hasOwnProperty.call(arity,command))
      throw new Error("RISO51: only explicit original M/L/C/Q/Z contours supported");
    const count=arity[command],points:string[]=[];
    for(let j=0;j<count;j+=2){
      const x=Number(tokens[i++]),y=Number(tokens[i++]);
      if(!Number.isFinite(x)||!Number.isFinite(y))
        throw new Error("RISO51: incomplete anatomical Bézier control point");
      const [px,py]=riso51ProjectPalmarPoint(x,y,side,actor,depth);
      points.push(String(px),String(py));
    }
    parts.push([command,...points].join(" "));
  }
  return parts.join(" ");
}

/** Full first-drawing -> side-cup -> release. The normalized view is
 * deliberately actor-dependent and matches the actual original PIP/DIP
 * view-key timing. Every RED/BLUE part is interpolated from source vectors.
 */
export function riso51SourceKeys(
  base:string,contact:string,actor:Riso51Actor,
):readonly RisoPathMorphKey[]{
  const isDonor=actor==="courier";
  const partial180=isDonor?blendMorph(base,contact,.72):contact;
  const at205=isDonor?base:blendMorph(base,contact,.74);
  return [
    {frame:0,d:base,easing:"ease"},
    {frame:146,d:base,easing:"ease"},
    {frame:160,d:contact,easing:"ease"},
    {frame:180,d:partial180,easing:"ease"},
    {frame:205,d:at205,easing:"ease"},
    {frame:239,d:at205},
  ];
}
/** Small authored source deformation between exact equal-topology samples.
 * Used to calculate the post-handoff perspective release source at two
 * named print keys. In-between cels use the tested registry Bézier morph.
 */
import {evaluateRisoPathMorph} from "../../registry/video/riso-path-morph";
function blendMorph(a:string,b:string,t:number):string{
  return evaluateRisoPathMorph([{frame:0,d:a},{frame:100,d:b}],Math.round(t*100));
}

const fingerPart=/^(left|right)-glove-(middle|ring|pinky)(-middle-phalanx)?$/;
const palmPart=/^(left|right)-glove(-knuckle-arc)?$/;
export function riso51MorphSourcePart(
  part:RisoCharacterPart,actor:Riso51Actor,
):RisoCharacterPart{
  const activeSide=actor==="courier"?"right":"left";
  const palm=palmPart.exec(part.id);
  if(palm&&palm[1]===activeSide){
    const side=palm[1] as Riso51Side;
    const contact=riso51ProjectPalmarPath(part.d,side,actor,1);
    return {...part,pathKeys:riso51SourceKeys(part.d,contact,actor)};
  }
  const match=fingerPart.exec(part.id);
  if(!match||match[1]!==activeSide)return part;
  const digit=match[2] as "middle"|"ring"|"pinky";
  const stage=match[3]?"middle":"proximal";
  const geometry=RISO31_GEOMETRY[digit];
  const data=actor==="courier"?RISO49_DONOR_PROJECTION:RISO48_RECEIVER_PROJECTION;
  const shortened=stage==="middle"?
    geometry.intermediate+data[digit].dip:geometry.proximal+data[digit].pip;
  const width=geometry.width*(stage==="middle"?.95:1);
  const contact=riso31PhalanxSourcePath(digit,stage,shortened,width);
  return {...part,pathKeys:riso51SourceKeys(part.d,contact,actor)};
}
