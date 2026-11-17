import type {RisoCharacterSpec} from "../../registry/video/riso-character";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import {flattenRisoSvgPath,risoContourSignedArea}
  from "../../registry/video/riso-path-geometry";

/**
 * RISO60: inspect the ACTUAL print-master source boundary, never an
 * antialiased screenshot. A correct interdigital white reserve must
 * interrupt the positive RED silhouette from the exterior, not become
 * a detached white hole inside a three-finger mitt or miss it entirely.
 *
 * This is an art diagnostic, NOT a human-anatomy likeness certificate.
 * The ink masters, source paths and clinical joint rig are never modified.
 */
export const RISO60_ARTCRAFT={
  mode:"read-only-physical-stencil-boundary-audit",
  reference:"Illinois Riso Print Guide (registration and trapping); RISO54/58/59",
  source:"one true moving RED positive path, two original paper-negative paths",
  expectedCubicCounts:{palm:16,web:4},
  noRasterSampling:true,
  doesNotApproveAnatomy:true,
} as const;

export type Riso60Actor="courier"|"paper-artist";
export type Riso60WebState=
  "unprinted-rest"|"exterior-notch"|"interior-hole"|"outside-miss"|"boundary-uncertain";
type Point=readonly [number,number];

export interface Riso60WebEvidence {
  readonly id:string;
  readonly cubicCount:number;
  readonly cutterArea:number;
  readonly boundaryCrossings:number;
  readonly sampleInside:number;
  readonly sampleOutside:number;
  readonly state:Riso60WebState;
}
export interface Riso60HandEvidence {
  readonly actor:Riso60Actor;
  readonly side:"left"|"right";
  readonly frame:number;
  readonly positiveCubicCount:number;
  readonly positiveArea:number;
  readonly positiveClosed:boolean;
  readonly webs:readonly Riso60WebEvidence[];
  readonly requiresArtistReview:true;
}

const round=(v:number)=>Number(v.toFixed(4));
const cross=(a:Point,b:Point,c:Point)=>
  (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);

/** Proper crossings only. A tangent contact or coincident endpoint
 * is NOT proof that an open paper-notch intersects the ink boundary. */
function properCrossing(a:Point,b:Point,c:Point,d:Point):boolean{
  const ab=cross(a,b,c),ac=cross(a,b,d);
  const cd=cross(c,d,a),ca=cross(c,d,b);
  const eps=1e-7;
  return ((ab>eps&&ac<-eps)||(ab<-eps&&ac>eps))&&
    ((cd>eps&&ca<-eps)||(cd<-eps&&ca>eps));
}

/** Count source-vector boundary crossings, without DOM/raster/canvas.
 * A truly open notch ordinarily makes an entry and an exit crossing.
 * Source-polygons are closed; the function deliberately does not
 * guess an intersection when cutter just touches the edge. */
export function riso60CountBoundaryCrossings(
  positive:readonly Point[],cutter:readonly Point[],
):number{
  if(positive.length<3||cutter.length<3)return 0;
  let count=0;
  for(let i=0;i<positive.length;i++){
    const a=positive[i],b=positive[(i+1)%positive.length];
    for(let j=0;j<cutter.length;j++){
      const c=cutter[j],d=cutter[(j+1)%cutter.length];
      if(properCrossing(a,b,c,d))count++;
    }
  }
  return count;
}

function pointInside(p:Point,polygon:readonly Point[]):boolean{
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if((a[1]>p[1])!==(b[1]>p[1])&&
      p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])
      inside=!inside;
  }
  return inside;
}

const contour=(d:string)=>
  flattenRisoSvgPath(d,.2).filter(c=>c.closed);

function soleClosed(d:string,label:string){
  const contours=contour(d);
  if(contours.length!==1)throw new RangeError("RISO60 expected one closed source "+label);
  return contours[0];
}

/**
 * Evidence from the same per-frame vector paths sent to RisoPrint,
 * including the zero-area f0 web knockouts and the view-conditioned
 * articulated f160 geometry. Diagnostics are descriptive until photo
 * landmark comparison and native two-master screenshots are reviewed.
 */
export function inspectRiso60NegativeSpace(
  spec:RisoCharacterSpec,actor:Riso60Actor,frame:number,
):Riso60HandEvidence{
  if(spec.id!==actor)throw new RangeError("RISO60 wrong actor");
  if(!Number.isInteger(frame)||frame<0||frame>=spec.durationFrames)
    throw new RangeError("RISO60 frame must be a real source cel");
  const side=actor==="courier"?"right":"left";
  const parts=evaluateRisoCharacter(spec,frame).parts;
  const base=side+"-glove";
  const palm=parts.find(p=>p.id===base);
  if(!palm||palm.plate!=="red"||palm.paint!=="solid"||palm.knockoutOnly)
    throw new Error("RISO60 missing original RED positive hand");
  const positive=soleClosed(palm.d,base);
  const positiveArea=Math.abs(risoContourSignedArea(positive.points));
  const cubicCount=(palm.d.match(/C/g)??[]).length;
  if(cubicCount!==RISO60_ARTCRAFT.expectedCubicCounts.palm||positiveArea<=1)
    throw new RangeError("RISO60 original sixteen-cubic palm corrupted");
  const webs=["middle-ring","ring-pinky"].map(slot=>{
    const id=base+"-web-reserve-"+slot;
    const web=parts.find(p=>p.id===id);
    if(!web||!web.knockoutOnly||web.plate!=="red"||web.paint!=="solid")
      throw new Error("RISO60 missing physical paper-negative source "+id);
    const cubicCount=(web.d.match(/C/g)??[]).length;
    if(cubicCount!==RISO60_ARTCRAFT.expectedCubicCounts.web)
      throw new RangeError("RISO60 original four-cubic web corrupted");
    const negatives=contour(web.d);
    // The original rest stencil is a deliberately zero-area path.
    if(negatives.length===0)return {
      id,cubicCount,cutterArea:0,boundaryCrossings:0,
      sampleInside:0,sampleOutside:0,
      state:"unprinted-rest" as const,
    };
    if(negatives.length!==1)
      throw new RangeError("RISO60 web must be a single physical cutter");
    const polygon=negatives[0].points;
    const cutterArea=Math.abs(risoContourSignedArea(polygon));
    let sampleInside=0;
    for(const p of polygon)if(pointInside(p,positive.points))sampleInside++;
    const sampleOutside=polygon.length-sampleInside;
    const boundaryCrossings=riso60CountBoundaryCrossings(positive.points,polygon);
    const state:Riso60WebState=boundaryCrossings>=2&&sampleInside>0&&sampleOutside>0
      ?"exterior-notch"
      :boundaryCrossings===0&&sampleInside===polygon.length
        ?"interior-hole"
        :boundaryCrossings===0&&sampleInside===0
          ?"outside-miss":"boundary-uncertain";
    return {id,cubicCount,cutterArea:round(cutterArea),
      boundaryCrossings,sampleInside,sampleOutside,state};
  });
  return {actor,side,frame,positiveCubicCount:cubicCount,
    positiveArea:round(positiveArea),positiveClosed:true,webs,
    requiresArtistReview:true};
}
