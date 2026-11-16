/**
 * CP-F1 ArtCraft Stage 1: independent head CONTOUR diagnostics.
 *
 * Both sets of coordinates must be placed on actual original-photo and
 * native-render pixels by a reviewer. This is not a generator, facial
 * identity matcher, source license verifier, or artist approval mechanism.
 * Do not warp x/y separately or use an elastic fit to make a bad head pass.
 */
import {
  HEAD_FIDELITY_LANDMARK_IDS,
  type HeadFidelityLandmarkId,type HeadFidelityPoint,
} from "./colored-pencil-head-fidelity";
import type {
  HeadAnnotationSession,NativeDimensions,NativePoint,
} from "./colored-pencil-head-annotation";

export type PencilHeadContourDifference={
  id:HeadFidelityLandmarkId;
  /** Independently placed landmark on the native output. */
  output:NativePoint;
  /** Reference landmark after only UNIFORM scale and translation. */
  sourceProjected:NativePoint;
  dxPixels:number;
  dyPixels:number;
  distancePixels:number;
  /** Error divided by measured output cranial apex -> menton height. */
  distanceInHeadHeights:number;
};
export type PencilHeadContourDiagnostics={
  state:"incomplete"|"review-needed";
  reasons:string[];
  /** Never promotes a drawing to approved art, even with perfect landmarks. */
  artistApproved:false;
  alignment:"apex-anchored-isotropic"|"none";
  outputHeadHeight:number|null;
  sourceToOutputScale:number|null;
  /** Signed log of output/reference cheek-span / head-height ratio. */
  aspectLogChange:number|null;
  rmsInHeadHeights:number|null;
  maxInHeadHeights:number|null;
  differences:PencilHeadContourDifference[];
};
type Side="source"|"output";
const SIDES=["source","output"] as const;
const contourPairs=[
  ["parietal-near","parietal-far"],
  ["frontal-near","frontal-far"],
  ["upper-temple-near","upper-temple-far"],
  ["temple-near","temple-far"],
  ["malar-near","malar-far"],
  ["gonion-near","gonion-far"],
  ["mandible-near","mandible-far"],
] as const satisfies readonly(
  readonly[HeadFidelityLandmarkId,HeadFidelityLandmarkId]
)[];
const blocked=(reason:string):PencilHeadContourDiagnostics=>({
  state:"incomplete",reasons:[reason],artistApproved:false,
  alignment:"none",outputHeadHeight:null,sourceToOutputScale:null,
  aspectLogChange:null,rmsInHeadHeights:null,maxInHeadHeights:null,
  differences:[],
});
type RegisteredSide={
  points:Map<HeadFidelityLandmarkId,HeadFidelityPoint>;
  apex:NativePoint;chin:NativePoint;height:number;width:number;
  direction:number;
};
function validateSide(
  side:Side,points:HeadFidelityPoint[],dimensions:NativeDimensions,
):RegisteredSide{
  const error=(why:string):never=>{throw new RangeError(side+": "+why);};
  if(!dimensions||!Number.isSafeInteger(dimensions.width)||
    !Number.isSafeInteger(dimensions.height)||
    dimensions.width<64||dimensions.height<64||
    dimensions.width*dimensions.height>60_000_000)
    error("invalid native image dimensions");
  if(!Array.isArray(points)||points.length!==HEAD_FIDELITY_LANDMARK_IDS.length)
    error("all 18 independently placed cranial points are required");
  const map=new Map<HeadFidelityLandmarkId,HeadFidelityPoint>();
  for(const point of points){
    if(!point||!HEAD_FIDELITY_LANDMARK_IDS.includes(point.id))
      error("unknown head landmark");
    if(map.has(point.id))error("duplicate head landmark");
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||
      point.x<0||point.y<0||point.x>dimensions.width||
      point.y>dimensions.height)
      error("head landmark outside native image bounds");
    map.set(point.id,point);
  }
  const apex=map.get("cranial-apex")!,chin=map.get("menton")!;
  const near=map.get("zygion-near")!,far=map.get("zygion-far")!;
  const height=chin.y-apex.y,width=Math.abs(far.x-near.x);
  if(height<Math.max(20,dimensions.height*.055)||
    width<Math.max(15,dimensions.width*.045))
    error("invalid apex, chin or cheek-spanning anatomy");
  const direction=Math.sign(far.x-near.x);
  for(const [a,b] of contourPairs){
    if(direction*(map.get(b)!.x-map.get(a)!.x)<
      Math.max(2,width*.06))
      error("crossed near/far contour or disconnected head edge");
  }
  return {points:map,apex,chin,height,width,direction};
}

/**
 * Align just apex and head HEIGHT; never fit source and output independently
 * in x/y. The full per-landmark residual exposes missing cranial width,
 * misplaced temporal planes and skewed jaw instead of registering them away.
 * No third-party or image data is used: coordinates-only, deterministic.
 */
export function inspectPencilHeadContourDifference(
  session:HeadAnnotationSession,
  images:{source:NativeDimensions;output:NativeDimensions}|null,
):PencilHeadContourDiagnostics{
  if(!images)return blocked("Both real local images are required");
  let source:RegisteredSide,output:RegisteredSide;
  try{
    source=validateSide("source",session.source.landmarks,images.source);
    output=validateSide("output",session.output.landmarks,images.output);
  }catch(error){
    return blocked(error instanceof Error?error.message:String(error));
  }
  if(source.direction!==output.direction)
    return blocked("Source/render near/far contour orientation differs; inspect camera/mirroring");
  const scale=output.height/source.height;
  const aspectLogChange=Math.log(
    (output.width/output.height)/(source.width/source.height));
  const differences=HEAD_FIDELITY_LANDMARK_IDS.map(id=>{
    const a=source.points.get(id)!,b=output.points.get(id)!;
    const projected={
      x:output.apex.x+(a.x-source.apex.x)*scale,
      y:output.apex.y+(a.y-source.apex.y)*scale,
    };
    const dx=b.x-projected.x,dy=b.y-projected.y;
    const distance=Math.hypot(dx,dy);
    return {
      id,output:{x:b.x,y:b.y},sourceProjected:projected,
      dxPixels:dx,dyPixels:dy,distancePixels:distance,
      distanceInHeadHeights:distance/output.height,
    };
  });
  const squares=differences.reduce((sum,p)=>sum+p.distancePixels**2,0);
  const rms=Math.sqrt(squares/differences.length)/output.height;
  const max=Math.max(...differences.map(p=>p.distanceInHeadHeights));
  const reasons:string[]=[];
  if(Math.abs(aspectLogChange)>.105)
    reasons.push("Measured cheek-span/head-height aspect differs by more than the CP-F1 .105 log bound");
  if(rms>.045)
    reasons.push("Measured cranial contour RMS exceeds the CP-F1 .045 head-height bound");
  if(reasons.length===0)reasons.push(
    "Measurements only: still requires exact-byte native color verification and independent ArtCraft review");
  return {
    state:"review-needed",reasons,artistApproved:false,
    alignment:"apex-anchored-isotropic",outputHeadHeight:output.height,
    sourceToOutputScale:scale,aspectLogChange,
    rmsInHeadHeights:rms,maxInHeadHeights:max,differences,
  };
}
