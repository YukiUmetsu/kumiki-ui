import { evaluateRisoCharacter, inspectRisoCharacter } from "./riso-character";
import type { RisoCharacterSpec, RisoMatrix } from "./riso-character";

/**
 * Hand-authored 2D construction topology, not an inferred 3D surface.
 * Points live in the source joint's local coordinates; links use the IK-solved
 * endpoints and are re-meshed at each sampled film frame.
 */
export type RisoMeshPoint = readonly [number, number];
export type RisoMeshCategory =
  | "face" | "hair" | "headwear" | "torso" | "sleeve" | "arm"
  | "hand" | "leg" | "foot" | "wing" | "tail" | "accessory";
export interface RisoMeshRegion {
  id: string;
  label: string;
  category: RisoMeshCategory;
  joint: string;
  /** Existing independently authored vector parts that this region documents. */
  parts: readonly string[];
  /** Convex polygon used for the canonical, artist-provided construction cage. */
  contour: readonly RisoMeshPoint[];
  /** Evaluated as a deforming mesh from joint to this direct-child joint. */
  tipJoint?: string;
  /** Label points in the region's local joint coordinates. */
  landmarks?: readonly { id: string; at: RisoMeshPoint }[];
}
export interface RisoCharacterMeshSheet {
  id: string;
  label: string;
  view: "authored-2d";
  /** Measured in the artist's actual 2D drawing units, never human-average ratios. */
  headRegion: string;
  regions: readonly RisoMeshRegion[];
  poses: readonly {frame: number; label: string}[];
  /** Other views must be drawn and approved, never mirrored from a single image. */
  missingViews: readonly string[];
}
export interface RisoMeshBounds { x: number; y: number; width: number; height: number }
export interface RisoMeshFrameRegion {
  id: string;
  label: string;
  category: RisoMeshCategory;
  parts: readonly string[];
  outline: readonly RisoMeshPoint[];
  triangles: readonly (readonly [RisoMeshPoint, RisoMeshPoint, RisoMeshPoint])[];
  landmarks: readonly { id: string; at: RisoMeshPoint }[];
  bounds: RisoMeshBounds;
}
export interface RisoMeshReport {
  frame: number;
  headUnit: number;
  overallBounds: RisoMeshBounds;
  regions: readonly (RisoMeshFrameRegion & {
    /** Canonical outline bounds in local drawing space, independent of action. */
    referenceBounds: RisoMeshBounds;
    widthInHeads: number;
    heightInHeads: number;
  })[];
}
export interface RisoMeshIssue {path: string; message: string}
const slug = /^[a-z][a-z0-9-]{0,47}$/;
const finite = (p: RisoMeshPoint): boolean =>
  Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && Math.abs(n) <= 4096);
const bounds = (points: readonly RisoMeshPoint[]): RisoMeshBounds => {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
};
const mapPoint = (m: RisoMatrix, p: RisoMeshPoint): RisoMeshPoint =>
  [m.a * p[0] + m.c * p[1] + m.e, m.b * p[0] + m.d * p[1] + m.f];
const distance = (a: RisoMeshPoint, b: RisoMeshPoint) => Math.hypot(a[0]-b[0], a[1]-b[1]);
const polygonArea = (p: readonly RisoMeshPoint[]) =>
  Math.abs(p.reduce((total, a, i) => {
    const b = p[(i + 1) % p.length];
    return total + a[0]*b[1] - b[0]*a[1];
  }, 0)) / 2;
function triangulate(points: readonly RisoMeshPoint[]): readonly (readonly [RisoMeshPoint, RisoMeshPoint, RisoMeshPoint])[] {
  // Convex cages can be triangulated without inventing a triangulation library.
  return Array.from({length: points.length-2}, (_,i) => [points[0],points[i+1],points[i+2]] as const);
}
function linkMesh(base: RisoMatrix, tip: RisoMatrix, baseWidth: number, tipWidth: number,
                  bow: number): {outline: RisoMeshPoint[]; triangles: (readonly [RisoMeshPoint,RisoMeshPoint,RisoMeshPoint])[]} {
  const a: RisoMeshPoint = [base.e,base.f], b: RisoMeshPoint = [tip.e,tip.f];
  const length = distance(a,b);
  const dx = length > 1e-7 ? (b[0]-a[0])/length : base.a / (Math.hypot(base.a,base.b)||1);
  const dy = length > 1e-7 ? (b[1]-a[1])/length : base.b / (Math.hypot(base.a,base.b)||1);
  const norm: RisoMeshPoint = [-dy,dx], left: RisoMeshPoint[] = [], right: RisoMeshPoint[] = [];
  const bs=Math.hypot(base.a,base.b), ts=Math.hypot(tip.a,tip.b);
  for(let i=0;i<=4;i++){
    const t=i/4, half=(baseWidth*bs*(1-t)+tipWidth*ts*t)/2;
    const curvature=Math.sin(Math.PI*t)*bow;
    const x=a[0]+(b[0]-a[0])*t+norm[0]*curvature;
    const y=a[1]+(b[1]-a[1])*t+norm[1]*curvature;
    left.push([x+norm[0]*half,y+norm[1]*half]);
    right.push([x-norm[0]*half,y-norm[1]*half]);
  }
  const triangles: (readonly [RisoMeshPoint,RisoMeshPoint,RisoMeshPoint])[] = [];
  for(let i=0;i<4;i++){
    triangles.push([left[i],left[i+1],right[i]]);
    triangles.push([right[i],left[i+1],right[i+1]]);
  }
  return {outline:[...left,...right.slice().reverse()],triangles};
}
export function inspectRisoCharacterMesh(spec: RisoCharacterSpec, sheet: RisoCharacterMeshSheet): RisoMeshIssue[] {
  const issues: RisoMeshIssue[] = [], error=(path:string,message:string)=>issues.push({path,message});
  if(inspectRisoCharacter(spec).length)error("/spec","source character rig is not valid");
  if(sheet.view!=="authored-2d" || sheet.id!==spec.id)error("/id","sheet must identify its 2D source character");
  const joints=new Map(spec.joints.map(j=>[j.id,j]));
  const parts=new Set(spec.parts.map(p=>p.id));
  const seen=new Set<string>();
  for(const [i,r] of sheet.regions.entries()){
    const path="/regions/"+i;
    if(!slug.test(r.id)||seen.has(r.id)) error(path+"/id","region ID must be a unique slug");
    seen.add(r.id);
    if(!joints.has(r.joint))error(path+"/joint","region must reference a real rig joint");
    if(!r.parts.length||r.parts.some(p=>!parts.has(p)))error(path+"/parts","region must reference authored ink parts");
    if(r.contour.length<3||r.contour.length>32||r.contour.some(p=>!finite(p))||
       (r.contour.every(finite) && polygonArea(r.contour)<.01))
      error(path+"/contour","provide a finite nondegenerate construction polygon");
    if(r.tipJoint && joints.get(r.tipJoint)?.parent!==r.joint)
      error(path+"/tipJoint","mesh link tip must be a direct child of the owning joint");
    if(r.landmarks?.some(p=>!slug.test(p.id)||!finite(p.at)))
      error(path+"/landmarks","landmarks need valid slug IDs and finite local positions");
  }
  if(!seen.has(sheet.headRegion))error("/headRegion","head measurement anchor must exist");
  if(!sheet.poses.length||sheet.poses.some(p=>!Number.isSafeInteger(p.frame)||p.frame<0||p.frame>=spec.durationFrames))
    error("/poses","pose frames must belong to the source timeline");
  return issues;
}
/** Fully deterministic, IK-aware construction report with analytic triangle mesh. */
export function evaluateRisoCharacterMesh(spec: RisoCharacterSpec, sheet: RisoCharacterMeshSheet,
                                          frame: number): RisoMeshReport {
  const errors=inspectRisoCharacterMesh(spec,sheet);
  if(errors.length)throw new RangeError(errors.map(x=>x.path+": "+x.message).join("; "));
  const evaluated=evaluateRisoCharacter(spec,frame);
  const joints=new Map(evaluated.joints.map(j=>[j.id,j]));
  const parts=new Map(spec.parts.map(p=>[p.id,p]));
  const anchor=sheet.regions.find(r=>r.id===sheet.headRegion)!;
  const headUnit=bounds(anchor.contour).height;
  if(headUnit<=0)throw new RangeError("head-region construction must have positive height");
  const regions=sheet.regions.map(r=>{
    const origin=joints.get(r.joint)!;
    const m=origin.matrix;
    const skinned=parts.get(r.parts[0])?.skin;
    const linked=r.tipJoint && skinned?.tipJoint===r.tipJoint
      ? linkMesh(m,joints.get(r.tipJoint)!.matrix,skinned.baseWidth,skinned.tipWidth,skinned.bow??0)
      : null;
    const outline=linked?.outline??r.contour.map(p=>mapPoint(m,p));
    const triangles=linked?.triangles??triangulate(outline);
    const landmarks=(r.landmarks??[]).map(p=>({id:p.id,at:mapPoint(m,p.at)}));
    const referenceBounds=bounds(r.contour);
    return {
      id:r.id,label:r.label,category:r.category,parts:r.parts,
      outline,triangles,landmarks,bounds:bounds(outline),referenceBounds,
      widthInHeads:referenceBounds.width/headUnit,
      heightInHeads:referenceBounds.height/headUnit,
    };
  });
  const all=regions.flatMap(r=>r.outline);
  return {frame:evaluated.sampledFrame,headUnit,overallBounds:bounds(all),regions};
}
