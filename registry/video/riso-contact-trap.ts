import {risoBrushClosedPath} from "./riso-dry-brush";
import type {RisoBrushGeometry,RisoBrushPoint} from "./riso-dry-brush";

/** Author-controlled, source-space shared-edge trap on only one original
 * ribbon's outer material boundary. Existing true dry-paper holes survive.
 * Not a guarantee of registration on a physical press. */
export interface RisoContactTrapOptions {
  readonly side:"positive"|"negative";
  /** Maximum distance of two genuinely facing source boundaries: 0..12 px. */
  readonly maximumGap:number;
  /** Maximum exterior ink growth along an authored shared edge: 0..12 px. */
  readonly maximumExtension:number;
  /** Intentional overprint margin beyond the adjacent material: 0..3 px. */
  readonly overlap:number;
  /** Minimum sustained adjacent stations, 3..16, default 5. */
  readonly minimumRun?:number;
}
export interface RisoContactTrapResult {
  readonly geometry:RisoBrushGeometry;
  readonly matchedStations:number;
  readonly expandedStations:number;
  readonly maxAppliedExtension:number;
  readonly contactRuns:number;
}
const length=(p:RisoBrushPoint)=>Math.hypot(p.x,p.y);
const unit=(v:RisoBrushPoint):RisoBrushPoint=>{
  const d=length(v);return d>1e-8?{x:v.x/d,y:v.y/d}:{x:0,y:0};
};
const dot=(a:RisoBrushPoint,b:RisoBrushPoint)=>a.x*b.x+a.y*b.y;
const sub=(a:RisoBrushPoint,b:RisoBrushPoint)=>({x:a.x-b.x,y:a.y-b.y});
const tangent=(a:readonly RisoBrushPoint[],i:number)=>
  unit(sub(a[Math.min(a.length-1,i+1)],a[Math.max(0,i-1)]));
const displaced=(p:RisoBrushPoint,n:RisoBrushPoint,d:number)=>
  ({x:p.x+n.x*d,y:p.y+n.y*d});
const valid=(g:RisoBrushGeometry)=>g.centerline.length>=25&&
  g.edgePositive.length===g.centerline.length&&
  g.edgeNegative.length===g.centerline.length&&
  g.widthProfile.length===g.centerline.length&&
  [...g.centerline,...g.edgePositive,...g.edgeNegative]
    .every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));

/** Find sustained near-parallel opposing *positive-material* boundaries.
 * Crossing strokes, incidental point contacts, distant contours and
 * reversed normals never qualify. The original holes, source centreline,
 * pressure knots and all unselected edge stations remain byte-identical.
 * No raster dilation, SVG morphology, filters or RGB ghosting. */
export function createRisoContactTrap(base:RisoBrushGeometry,
  neighbor:RisoBrushGeometry,opts:RisoContactTrapOptions):RisoContactTrapResult{
  if(!base||!neighbor||!["positive","negative"].includes(opts?.side)||
    !Number.isFinite(opts.maximumGap)||opts.maximumGap<=0||opts.maximumGap>12||
    !Number.isFinite(opts.maximumExtension)||opts.maximumExtension<0||
    opts.maximumExtension>12||
    !Number.isFinite(opts.overlap)||opts.overlap<0||opts.overlap>3||
    !Number.isSafeInteger(opts.minimumRun??5)||(opts.minimumRun??5)<3||
    (opts.minimumRun??5)>16)
    throw new RangeError("RISO66 requires bounded, explicit shared-edge trapping settings");
  if(!valid(base)||!valid(neighbor))
    throw new RangeError("RISO66 needs complete authored native ribbon edges");
  const side=opts.side==="positive"?"edgePositive":"edgeNegative";
  const own=base[side],otherSides=[neighbor.edgePositive,neighbor.edgeNegative];
  const extensions=new Array<number>(own.length).fill(0);
  for(let i=2;i<own.length-2;i++){
    const outward=unit(sub(own[i],base.centerline[i]));
    const direction=tangent(base.centerline,i);
    if(length(outward)<.9||length(direction)<.9)continue;
    let nearest=Infinity;
    for(const neighborEdge of otherSides){
      for(let j=2;j<neighborEdge.length-2;j++){
        const point=neighborEdge[j],delta=sub(point,own[i]);
        const outwardGap=dot(delta,outward);
        if(outwardGap<.1||outwardGap>opts.maximumGap)continue;
        if(Math.abs(dot(delta,direction))>opts.maximumGap)continue;
        const otherNormal=unit(sub(point,neighbor.centerline[j]));
        if(dot(outward,otherNormal)>-.74)continue;
        if(Math.abs(dot(direction,tangent(neighbor.centerline,j)))<.88)continue;
        const gap=length(delta);
        if(gap>opts.maximumGap||gap>=nearest)continue;
        nearest=gap;
      }
    }
    if(Number.isFinite(nearest))
      // An ink trap must remain a narrow local lip, never become a new bulky
      // illustration region. Cap at 22% of authored local ribbon pressure.
      extensions[i]=Math.min(opts.maximumExtension,nearest+opts.overlap,
        base.widthProfile[i]*.22);
  }
  const matchedStations=extensions.filter(x=>x>0).length;
  const minRun=opts.minimumRun??5;
  let contactRuns=0;
  for(let i=0;i<extensions.length;){
    if(extensions[i]===0){i++;continue;}
    let end=i;
    while(end+1<extensions.length&&extensions[end+1]>0)end++;
    if(end-i+1<minRun){
      for(let k=i;k<=end;k++)extensions[k]=0;
    }else{
      contactRuns++;
      const ramp=Math.min(3,Math.floor((end-i)/2));
      for(let k=i;k<=end;k++){
        const t=Math.min(1,(k-i)/ramp,(end-k)/ramp);
        extensions[k]*=t*t*(3-2*t);
      }
    }
    i=end+1;
  }
  const expandedStations=extensions.filter(x=>x>1e-6).length;
  if(!expandedStations)
    return {geometry:base,matchedStations,expandedStations:0,
      maxAppliedExtension:0,contactRuns:0};
  const extended=own.map((p,i)=>
    displaced(p,unit(sub(p,base.centerline[i])),extensions[i]));
  const edgePositive=opts.side==="positive"?extended:base.edgePositive;
  const edgeNegative=opts.side==="negative"?extended:base.edgeNegative;
  const outerPath=risoBrushClosedPath([...edgePositive,...edgeNegative.slice().reverse()]);
  return {geometry:{...base,edgePositive,edgeNegative,outerPath},
    matchedStations,expandedStations,
    maxAppliedExtension:Math.max(...extensions),contactRuns};
}
