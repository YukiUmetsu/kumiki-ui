import { evaluateRisoCharacter, inspectRisoCharacter } from "./riso-character";
import type { RisoCharacterSpec, RisoMatrix } from "./riso-character";
import { selectRisoSourceContour, triangulateRisoContour, refineRisoContourMesh } from "./riso-path-geometry";
import type { RisoContourPoint, RisoContourTriangle } from "./riso-path-geometry";

/**
 * RISO7 source-faithful, triangulated 2D contour study.
 * Geometry is sampled from the character's ACTUAL author-painted SVG part,
 * after the same FK/IK and expression keys that the ink renderer evaluates.
 * Hand-authored rectangles are retained as optional historical GUIDE data,
 * never used to substitute for a printable source silhouette.
 */
export type RisoMeshPoint = RisoContourPoint;
export type RisoMeshCategory =
  | "face" | "hair" | "headwear" | "torso" | "sleeve" | "arm"
  | "hand" | "leg" | "foot" | "wing" | "tail" | "accessory";
export interface RisoMeshRegion {
  id: string;
  label: string;
  category: RisoMeshCategory;
  joint: string;
  /** Existing independently authored vector parts. The first is the source contour. */
  parts: readonly string[];
  /** Historical artist-authored guide cage, optional and NOT the source measurement. */
  contour?: readonly RisoMeshPoint[];
  /** If source path has disjoint islands (e.g. paired eyes), choose the exact island. */
  sourceSubpathIndex?: number;
  /** Child joint that bends a source skin. Required for linked sleeves/legs. */
  tipJoint?: string;
  /** Optional original local landmarks; report always adds source-derived extrema. */
  landmarks?: readonly { id: string; at: RisoMeshPoint }[];
}
export interface RisoCharacterMeshSheet {
  id: string;
  label: string;
  view: "authored-2d";
  headRegion: string;
  regions: readonly RisoMeshRegion[];
  poses: readonly {frame: number; label: string}[];
  /** Authored feature-to-feature comparisons, measured from transformed source centers. */
  measurements?: readonly {id: string; label: string; from: string; to: string}[];
  missingViews: readonly string[];
}
export interface RisoMeshBounds { x: number; y: number; width: number; height: number }
export interface RisoMeshFrameRegion {
  id: string;
  label: string;
  category: RisoMeshCategory;
  parts: readonly string[];
  /** Actual sampled SVG contour for this part at this rig frame, in stage coordinates. */
  outline: readonly RisoMeshPoint[];
  /** Concave-aware earclipped triangles. No bounding-box corner fabrication. */
  triangles: readonly RisoContourTriangle[];
  landmarks: readonly {id: string; at: RisoMeshPoint}[];
  bounds: RisoMeshBounds;
}
export interface RisoMeshReport {
  frame: number;
  headUnit: number;
  overallBounds: RisoMeshBounds;
  regions: readonly (RisoMeshFrameRegion & {
    /** Measured from the original SVG feature in joint-local drawing coordinates. */
    referenceBounds: RisoMeshBounds;
    widthInHeads: number;
    heightInHeads: number;
    sourceContourPoints: number;
    /** SVG polygon area in the current pose; useful for contour conservation QA. */
    contourArea: number;
    /** Area of emitted triangles, used to detect escaped or incomplete ear clipping. */
    triangleArea: number;
    /** Measured longest edge after refinement, not a claimed target. */
    maxTriangleEdgeLength: number;
    /** False when the hard mesh budget prevents reaching the requested size. */
    refinementTargetMet: boolean;
  })[];
  measurements: readonly {id: string;label: string;distance: number;
    dx: number;dy: number;distanceInHeads: number}[];
}
export interface RisoMeshIssue {path: string; message: string}
/** Inspection-only control. Smaller edge targets produce smaller coherent triangles. */
export interface RisoMeshEvaluationOptions {
  maxEdgeLength?: number;
  maxTrianglesPerRegion?: number;
  /** Only subdivide this selected actor region at full resolution.
   * Other source outlines remain exactly measured with coarse, fast interior faces.
   * Omit to request fine triangles for the entire character.
   */
  focusRegionId?: string;
}
const slug = /^[a-z][a-z0-9-]{0,47}$/;
const finite = (p: RisoMeshPoint): boolean =>
  Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && Math.abs(n) <= 4096);
export function risoMeshBounds(points: readonly RisoMeshPoint[]): RisoMeshBounds {
  if(!points.length)throw new RangeError("Cannot measure an empty ink contour");
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const p of points){
    minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);
    minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);
  }
  return {x:minX,y:minY,width:maxX-minX,height:maxY-minY};
}
const mapPoint = (m: RisoMatrix, p: RisoMeshPoint): RisoMeshPoint =>
  [m.a*p[0]+m.c*p[1]+m.e,m.b*p[0]+m.d*p[1]+m.f];
/** Area-weighted source contour centroid, not the center of an invented box. */
export function risoMeshContourCentroid(points:readonly RisoMeshPoint[]):RisoMeshPoint {
  let twiceArea=0,x=0,y=0;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    const cross=a[0]*b[1]-b[0]*a[1];
    twiceArea+=cross;x+=(a[0]+b[0])*cross;y+=(a[1]+b[1])*cross;
  }
  if(Math.abs(twiceArea)<1e-8){
    return [points.reduce((a,p)=>a+p[0],0)/points.length,
      points.reduce((a,p)=>a+p[1],0)/points.length];
  }
  return [x/(3*twiceArea),y/(3*twiceArea)];
}
const area=(p:readonly RisoMeshPoint[])=>Math.abs(p.reduce((sum,a,i)=>{
  const b=p[(i+1)%p.length];
  return sum+a[0]*b[1]-b[0]*a[1];
},0)/2);
const triArea=(t:RisoContourTriangle)=>Math.abs(
 (t[1][0]-t[0][0])*(t[2][1]-t[0][1])-(t[1][1]-t[0][1])*(t[2][0]-t[0][0]))/2;
const parseFrameMatrix=(text:string):RisoMatrix=>{
  const match=/^matrix\(([^)]+)\)$/.exec(text);
  if(!match)throw new RangeError("Source part missing resolved SVG matrix");
  const numbers=match[1].trim().split(/[\s,]+/).map(Number);
  if(numbers.length!==6||!numbers.every(Number.isFinite))throw new RangeError("Invalid resolved SVG transform");
  const [a,b,c,d,e,f]=numbers;
  return {a,b,c,d,e,f};
};
export function inspectRisoCharacterMesh(spec: RisoCharacterSpec, sheet: RisoCharacterMeshSheet): RisoMeshIssue[] {
  const issues:RisoMeshIssue[]=[],error=(path:string,message:string)=>issues.push({path,message});
  if(inspectRisoCharacter(spec).length)error("/spec","source character rig is not valid");
  if(sheet.view!=="authored-2d"||sheet.id!==spec.id)error("/id","sheet must identify its 2D source character");
  const joints=new Map(spec.joints.map(j=>[j.id,j]));
  const parts=new Map(spec.parts.map(p=>[p.id,p]));
  const seen=new Set<string>();
  for(const [i,r] of sheet.regions.entries()){
    const path="/regions/"+i;
    if(!slug.test(r.id)||seen.has(r.id))error(path+"/id","region ID must be unique slug");
    seen.add(r.id);
    if(!joints.has(r.joint))error(path+"/joint","region must reference a real rig joint");
    if(!r.parts.length||r.parts.some(p=>!parts.has(p)))error(path+"/parts","region must reference authored ink parts");
    const primary=parts.get(r.parts[0]);
    if(primary&&primary.joint!==r.joint)error(path+"/parts","source contour belongs to a different joint");
    if(r.contour!==undefined&&(r.contour.length<3||r.contour.length>64||
      r.contour.some(p=>!finite(p))||r.contour.every(finite)&&area(r.contour)<.01))
      error(path+"/contour","historical guide must be a bounded nondegenerate polygon");
    if(r.tipJoint&&joints.get(r.tipJoint)?.parent!==r.joint)
      error(path+"/tipJoint","mesh link tip must be direct child");
    if(r.tipJoint&&primary?.skin?.tipJoint!==r.tipJoint)
      error(path+"/tipJoint","source ink part does not have matching deforming skin");
    if(r.sourceSubpathIndex!==undefined&&(!Number.isSafeInteger(r.sourceSubpathIndex)||
      r.sourceSubpathIndex<0||r.sourceSubpathIndex>32))
      error(path+"/sourceSubpathIndex","invalid source island index");
    if(primary) {
      try{selectRisoSourceContour(primary.d,r.sourceSubpathIndex);}
      catch{error(path+"/sourceSubpathIndex","no drawable source SVG contour at this index");}
    }
    if(r.landmarks?.some(p=>!slug.test(p.id)||!finite(p.at)))
      error(path+"/landmarks","landmarks need valid IDs and finite positions");
  }
  if(!seen.has(sheet.headRegion))error("/headRegion","head anchor must exist");
  if(!sheet.poses.length||sheet.poses.some(p=>!Number.isSafeInteger(p.frame)||
    p.frame<0||p.frame>=spec.durationFrames))error("/poses","pose frames must exist");
  const measureIds=new Set<string>();
  for(const [i,m] of (sheet.measurements??[]).entries()){
    if(!slug.test(m.id)||measureIds.has(m.id)||!seen.has(m.from)||!seen.has(m.to))
      error("/measurements/"+i,"measurements need unique IDs and real source regions");
    measureIds.add(m.id);
  }
  return issues;
}
/** Deterministic IK-aware source-path contour sampling, with real source-relative measurements. */
export function evaluateRisoCharacterMesh(spec:RisoCharacterSpec,sheet:RisoCharacterMeshSheet,
                                          frame:number,options:RisoMeshEvaluationOptions={}):RisoMeshReport {
  const errors=inspectRisoCharacterMesh(spec,sheet);
  if(errors.length)throw new RangeError(errors.map(x=>x.path+": "+x.message).join("; "));
  const pose=evaluateRisoCharacter(spec,frame);
  const frameParts=new Map(pose.parts.map(p=>[p.id,p]));
  const sourceParts=new Map(spec.parts.map(p=>[p.id,p]));
  const local=new Map<string,readonly RisoMeshPoint[]>();
  const getLocal=(r:RisoMeshRegion)=>{
    const source=sourceParts.get(r.parts[0])!;
    const key=source.id+":"+(r.sourceSubpathIndex??"largest");
    let points=local.get(key);
    if(!points){points=selectRisoSourceContour(source.d,r.sourceSubpathIndex);local.set(key,points);}
    return points;
  };
  const anchor=sheet.regions.find(r=>r.id===sheet.headRegion)!;
  const headUnit=risoMeshBounds(getLocal(anchor)).height;
  if(headUnit<=0)throw new RangeError("head-region source must have positive height");
  const maxEdgeLength=options.maxEdgeLength??Math.max(4,Math.min(9,headUnit/11));
  const maxTriangles=options.maxTrianglesPerRegion??950;
  if(options.focusRegionId && !sheet.regions.some(r=>r.id===options.focusRegionId))
    throw new RangeError("Focused Riso mesh region must be in the character sheet");
  const regions=sheet.regions.map(r=>{
    const ink=frameParts.get(r.parts[0])!;
    const localOutline=getLocal(r);
    const outline=selectRisoSourceContour(ink.d,r.sourceSubpathIndex).map(p=>
      mapPoint(parseFrameMatrix(ink.transform),p));
    const actualEdgeLength=options.focusRegionId && r.id!==options.focusRegionId
      ? 200 : maxEdgeLength;
    const triangles=refineRisoContourMesh(triangulateRisoContour(outline),{
      maxEdgeLength:actualEdgeLength,maxTriangles,
    });
    const bounds=risoMeshBounds(outline),referenceBounds=risoMeshBounds(localOutline);
    const m=parseFrameMatrix(ink.transform);
    // For skin paths, ink already lives in stage/world coordinates; source landmarks
    // should attach to the solved joint, not to the identity ink-path transform.
    const joint=pose.joints.find(j=>j.id===r.joint)!;
    const guideMatrix=sourceParts.get(r.parts[0])!.skin?joint.matrix:m;
    const center=risoMeshContourCentroid(outline);
    const byY=[...outline].sort((a,b)=>a[1]-b[1]);
    const byX=[...outline].sort((a,b)=>a[0]-b[0]);
    const landmarks=[
      {id:"source-center",at:center},
      {id:"source-top",at:byY[0]},
      {id:"source-bottom",at:byY[byY.length-1]},
      {id:"source-left",at:byX[0]},
      {id:"source-right",at:byX[byX.length-1]},
      ...(r.landmarks??[]).filter(p=>p.id!=="center").map(p=>({id:p.id,at:mapPoint(guideMatrix,p.at)})),
    ];
    const contourArea=area(outline),triangleArea=triangles.reduce((a,t)=>a+triArea(t),0);
    const maxTriangleEdgeLength=triangles.reduce((maximum,t)=>Math.max(maximum,
      Math.hypot(t[0][0]-t[1][0],t[0][1]-t[1][1]),
      Math.hypot(t[1][0]-t[2][0],t[1][1]-t[2][1]),
      Math.hypot(t[2][0]-t[0][0],t[2][1]-t[0][1])),0);
    return {
      id:r.id,label:r.label,category:r.category,parts:r.parts,
      outline,triangles,landmarks,bounds,referenceBounds,
      widthInHeads:referenceBounds.width/headUnit,
      heightInHeads:referenceBounds.height/headUnit,
      sourceContourPoints:outline.length,contourArea,triangleArea,
      maxTriangleEdgeLength,refinementTargetMet:maxTriangleEdgeLength<=actualEdgeLength+1e-6,
    };
  });
  const byId=new Map(regions.map(r=>[r.id,r]));
  const measurements=(sheet.measurements??[]).map(m=>{
    const from=risoMeshContourCentroid(byId.get(m.from)!.outline);
    const to=risoMeshContourCentroid(byId.get(m.to)!.outline);
    const dx=to[0]-from[0],dy=to[1]-from[1],distance=Math.hypot(dx,dy);
    return {id:m.id,label:m.label,distance,dx,dy,distanceInHeads:distance/headUnit};
  });
  const all=regions.flatMap(r=>r.outline);
  return {frame:pose.sampledFrame,headUnit,overallBounds:risoMeshBounds(all),regions,measurements};
}
