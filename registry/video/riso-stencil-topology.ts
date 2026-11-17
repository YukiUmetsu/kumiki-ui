import {createRisoContactTrap} from "./riso-contact-trap";
import type {RisoContactTrapOptions,RisoContactTrapResult} from "./riso-contact-trap";
import type {RisoBrushGeometry} from "./riso-dry-brush";
import {flattenRisoSvgPath,risoContourSignedArea,risoPointInContour}
  from "./riso-path-geometry";
import type {RisoContourPoint} from "./riso-path-geometry";

/** RISO67 — inspect the ACTUAL authored quadratic SVG contours, not only
 * the edge control polygon or final raster. All ink and paper-source paths
 * remain editable and untouched; changes that introduce defects fail closed.
 * A finite, adaptive sampling guard is not a formal arbitrary-curve proof. */
export interface RisoStencilTopology {
  /** Nonadjacent intersections/touches on the printed outer perimeter. */
  readonly selfContacts:number;
  /** Existing unprinted dry-fibre holes whose own contour contacts the ink border. */
  readonly borderHoleContacts:readonly number[];
  /** Original paper holes falling entirely outside the outer ink silhouette. */
  readonly excludedHoles:readonly number[];
  readonly missingContours:number;
  readonly signedArea:number;
}
export interface RisoTrapTopologyAudit {
  readonly original:RisoStencilTopology;
  readonly candidate:RisoStencilTopology;
  readonly newSelfContacts:number;
  readonly newBorderHoleContacts:readonly number[];
  readonly newExcludedHoles:readonly number[];
  readonly newMissingContours:number;
  readonly orientationChanged:boolean;
  readonly sourceHolesUnchanged:boolean;
  readonly noNewDefects:boolean;
  /** Original faults can remain: noNewDefects is NOT a global print-quality certification. */
  readonly inheritedDefects:boolean;
}
export interface RisoGuardedContactTrapResult extends RisoContactTrapResult {
  readonly accepted:boolean;
  readonly topology:RisoTrapTopologyAudit;
  /** Raw candidate is retained for research/debug, not passed to ink rendering. */
  readonly proposed:RisoContactTrapResult;
  readonly reason:"unchanged"|"passed"|"new-topology-defect";
}
type Box=readonly [number,number,number,number];
const EPS=1e-7;
const bounds=(points:readonly RisoContourPoint[]):Box=>[
  Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),
  Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1])),
];
const boxesMeet=(a:Box,b:Box):boolean=>
  a[0]<=b[2]+EPS&&b[0]<=a[2]+EPS&&
  a[1]<=b[3]+EPS&&b[1]<=a[3]+EPS;
const orient=(a:RisoContourPoint,b:RisoContourPoint,c:RisoContourPoint)=>
  (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const between=(x:number,a:number,b:number)=>
  x>=Math.min(a,b)-EPS&&x<=Math.max(a,b)+EPS;
const onSegment=(a:RisoContourPoint,b:RisoContourPoint,p:RisoContourPoint)=>
  between(p[0],a[0],b[0])&&between(p[1],a[1],b[1]);
const segmentsTouch=(a:RisoContourPoint,b:RisoContourPoint,
  c:RisoContourPoint,d:RisoContourPoint):boolean=>{
  if(!boxesMeet(bounds([a,b]),bounds([c,d])))return false;
  const abC=orient(a,b,c),abD=orient(a,b,d);
  const cdA=orient(c,d,a),cdB=orient(c,d,b);
  if(((abC>EPS&&abD<-EPS)||(abC<-EPS&&abD>EPS))&&
    ((cdA>EPS&&cdB<-EPS)||(cdA<-EPS&&cdB>EPS)))return true;
  return (Math.abs(abC)<=EPS&&onSegment(a,b,c))||
    (Math.abs(abD)<=EPS&&onSegment(a,b,d))||
    (Math.abs(cdA)<=EPS&&onSegment(c,d,a))||
    (Math.abs(cdB)<=EPS&&onSegment(c,d,b));
};
const edges=(poly:readonly RisoContourPoint[])=>
  poly.map((p,i)=>[p,poly[(i+1)%poly.length]] as const);
const countSelfContacts=(poly:readonly RisoContourPoint[]):number=>{
  const lines=edges(poly);
  let count=0;
  for(let i=0;i<lines.length;i++){
    for(let j=i+2;j<lines.length;j++){
      if(i===0&&j===lines.length-1)continue;
      if(segmentsTouch(...lines[i],...lines[j])&&++count>=64)return count;
    }
  }
  return count;
};
const touchesOuter=(outer:readonly RisoContourPoint[],hole:readonly RisoContourPoint[])=>{
  if(!boxesMeet(bounds(outer),bounds(hole)))return false;
  const a=edges(outer),b=edges(hole);
  for(const p of a)for(const q of b)if(segmentsTouch(...p,...q))return true;
  return false;
};
const contour=(path:string,flatness:number)=>
  flattenRisoSvgPath(path,flatness).filter(x=>x.closed);
const inspect=(geometry:RisoBrushGeometry,flatness:number,
  holes:readonly (readonly RisoContourPoint[]|null)[]):RisoStencilTopology=>{
  const outerPaths=contour(geometry.outerPath,flatness);
  if(outerPaths.length!==1) return {
    selfContacts:64,borderHoleContacts:[],
    excludedHoles:[],missingContours:1,signedArea:0,
  };
  const outer=outerPaths[0].points;
  const borderHoleContacts:number[]=[],excludedHoles:number[]=[];
  for(let i=0;i<holes.length;i++){
    const hole=holes[i];if(!hole)continue;
    if(touchesOuter(outer,hole))borderHoleContacts.push(i);
    else if(!risoPointInContour(hole[0],outer))excludedHoles.push(i);
  }
  return {selfContacts:countSelfContacts(outer),borderHoleContacts,
    excludedHoles,missingContours:0,signedArea:risoContourSignedArea(outer)};
};
const newIndices=(now:readonly number[],old:readonly number[])=>
  now.filter(i=>!old.includes(i));
/** Fail closed on new contacts at the full SVG quadratic geometry, plus
 * newly out-of-bounds holes and lost/changed source subpaths.
 * Baseline imperfections are reported explicitly, not silently certified. */
export function auditRisoTrapTopology(original:RisoBrushGeometry,
  candidate:RisoBrushGeometry,flatness=.35):RisoTrapTopologyAudit{
  if(!original||!candidate||!Array.isArray(original.dryPaths)||
    !Array.isArray(candidate.dryPaths)||!Number.isFinite(flatness)||
    flatness<.1||flatness>1.5||original.dryPaths.length>120||
    candidate.dryPaths.length>120)
    throw new RangeError("RISO67 expects finite source paths and bounded sampling tolerance");
  const unchanged=original.dryPaths.length===candidate.dryPaths.length &&
    original.dryPaths.every((p,i)=>candidate.dryPaths[i]===p) &&
    original.centerline===candidate.centerline &&
    original.widthProfile===candidate.widthProfile;
  const holes=original.dryPaths.map(d=>{
    const c=contour(d,flatness);return c.length===1?c[0].points:null;
  });
  const source=inspect(original,flatness,holes);
  const proposed=inspect(candidate,flatness,holes);
  const missed=holes.filter(x=>!x).length;
  const originalMissing=source.missingContours+missed;
  const candidateMissing=proposed.missingContours+missed;
  const newSelfContacts=Math.max(0,proposed.selfContacts-source.selfContacts);
  const newBorderHoleContacts=newIndices(proposed.borderHoleContacts,source.borderHoleContacts);
  const newExcludedHoles=newIndices(proposed.excludedHoles,source.excludedHoles);
  const orientationChanged=Math.sign(source.signedArea)!==Math.sign(proposed.signedArea);
  const newMissingContours=Math.max(0,candidateMissing-originalMissing);
  const noNewDefects=unchanged&&newSelfContacts===0&&newBorderHoleContacts.length===0&&
    newExcludedHoles.length===0&&newMissingContours===0&&!orientationChanged;
  return {
    original:{...source,missingContours:originalMissing},
    candidate:{...proposed,missingContours:candidateMissing},
    newSelfContacts,newBorderHoleContacts,newExcludedHoles,newMissingContours,
    orientationChanged,sourceHolesUnchanged:unchanged,noNewDefects,
    inheritedDefects:originalMissing>0||source.selfContacts>0||
      source.borderHoleContacts.length>0||source.excludedHoles.length>0,
  };
}
/** Author-facing opt-in. Only a safe differential candidate is applied;
 * never replace true dry-fibre openings with synthetic white ink. */
export function createGuardedRisoContactTrap(
  base:RisoBrushGeometry,neighbor:RisoBrushGeometry,
  options:RisoContactTrapOptions,flatness=.35):RisoGuardedContactTrapResult{
  const proposed=createRisoContactTrap(base,neighbor,options);
  const topology=auditRisoTrapTopology(base,proposed.geometry,flatness);
  if(proposed.geometry===base)return {
    ...proposed,accepted:true,topology,proposed,reason:"unchanged",
  };
  if(!topology.noNewDefects)return {
    ...proposed,geometry:base,accepted:false,topology,proposed,
    expandedStations:0,maxAppliedExtension:0,contactRuns:0,
    reason:"new-topology-defect",
  };
  return {...proposed,accepted:true,topology,proposed,reason:"passed"};
}
