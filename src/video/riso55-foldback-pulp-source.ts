/**
 * RISO55 / ArtCraft — real folded-back *source silhouette*, not shorter rakes.
 *
 * RISO54 reduced 3D bone camera-projected PIP/DIP distance to ~.4 but the
 * printed distal red positive-ink pulp still pointed straight out of the
 * palm, like three dangling red claws. A pinching hand instead bends the
 * terminal pads *back into* the palm's depth. A photographic 3/4 side view
 * projects that fold predominantly laterally; the top of the distal pad
 * turns in toward the metacarpal hollow, without an extra anatomical hinge.
 *
 * This module authors that original 2D VIEW for each source SVG C/Q contour
 * at the EXISTING articulated DIP parent. It does not change RISO31/ANAT1
 * clinical bones or the paper-contact index and thumb; it redraws only the
 * original RED pulp and matching moving COBALT nail source on the same ink
 * masters, with exactly the same path topology (RISO2 pathKeys).
 *
 * All original endpoints and knuckle engraving remain supported by the
 * original character IK. Negative local y roots stay untouched so no
 * discontinuous sleeve / DIP caps get a fake second finger joint.
 */
export type Riso55Actor="courier"|"paper-artist";
export type Riso55Digit="middle"|"ring"|"pinky";
export type Riso55Side="left"|"right";
export type Riso55Plate="red"|"blue";

export const RISO55_FOLDBACK_SOURCE={
  source:"CMU real Hand Holding Papers photograph, index-thumb pinch with tucked ulnar pads",
  anatomy:"distal fingertip pulp returns into hollow of palm; fixed DIP joint local origin",
  preserved:"all 12 original red finger bones, live PIP/DIP anatomy, cobalt nails and 2-ink print",
  projectionDegrees:{
    courier:{middle:106,ring:116,pinky:122},
    "paper-artist":{middle:104,ring:112,pinky:120},
  },
  affectedOriginalPartsPerActor:6,
  sourceFrame:160,
  space:"pure authored 2D image of clinical 3D flex, not new clinical joint rotation",
} as const;

const TOKENS=/[MLCQZ]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g;
const ARITY:Readonly<Record<string,number>>={M:2,L:2,C:6,Q:4,Z:0};
const n=(v:number)=>String(Number(v.toFixed(5)));

/** View rotation of a pulp surface *around its DIP attachment plane*.
 * The distal positive-y sheet-facing relief turns toward the palm, while
 * the old overlapping negative-y joint root still joins the real moving
 * middle phalanx. Anatomical bone length does not change. The red/blue
 * engraving pair undergoes exactly the same differentiable projection.
 */
export function riso55FoldbackPoint(
  x:number,y:number,actor:Riso55Actor,digit:Riso55Digit,
):readonly [number,number]{
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>8192||Math.abs(y)>8192)
    throw new RangeError("RISO55 source point must be finite and bounded");
  const angle=RISO55_FOLDBACK_SOURCE.projectionDegrees[actor][digit]*Math.PI/180;
  const handed=actor==="courier"?1:-1;
  const positive=Math.max(0,y);
  // Local source relief from DIP bone turns sideways and BACK toward the
  // palm. The 0..1 transition has no hard displaced seam at y=0.
  const x2=x+handed*Math.sin(angle)*positive;
  const y2=y-positive*(1-Math.cos(angle));
  return [Number(n(x2)),Number(n(y2))];
}

/** Strict, finite, same-source-path command topology. Path keys still use the
 * original standard RISO51 continuous Bézier-control interpolation, not
 * DOM opacity, clip overlay or picture processing.
 */
export function riso55FoldbackContour(
  original:string,actor:Riso55Actor,digit:Riso55Digit,
):string{
  const tokens=original.match(TOKENS);
  if(!tokens||original.replace(TOKENS,"").replace(/[\s,]/g,"")!=="")
    throw new Error("RISO55 malformed original SVG source geometry");
  const out:string[]=[];
  for(let i=0;i<tokens.length;){
    const cmd=tokens[i++];
    const arity=ARITY[cmd];
    if(arity===undefined)throw new Error("RISO55 unsupported SVG source command");
    const vertices:string[]=[];
    for(let j=0;j<arity;j+=2){
      if(i+1>=tokens.length)throw new Error("RISO55 incomplete original contour");
      const x=Number(tokens[i++]),y=Number(tokens[i++]);
      const [xp,yp]=riso55FoldbackPoint(x,y,actor,digit);
      vertices.push(n(xp),n(yp));
    }
    out.push([cmd,...vertices].join(" "));
  }
  return out.join(" ");
}
