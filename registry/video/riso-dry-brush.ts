import {printHash} from "./print-plates";

/** RISO62: authored cubic brush ribbons with variable pressure and genuine
 * unprinted dry-fibre channels on ONE physical ink master. No filters,
 * masks, alpha-gradient substitutes or reduction of source-curve detail.
 * This is an illustrative source drawing, not a scanned press profile. */
export interface RisoBrushPoint {readonly x:number;readonly y:number}
export interface RisoBrushPressure {readonly at:number;readonly width:number}
export interface RisoBrushOptions {
  readonly start:RisoBrushPoint;
  readonly control1:RisoBrushPoint;
  readonly control2:RisoBrushPoint;
  readonly end:RisoBrushPoint;
  readonly width:number;
  readonly pressure:readonly RisoBrushPressure[];
  readonly dryness:number;
  readonly seed:number;
  /** Curve resolution per original cubic. Distinct from a downsampling LOD. */
  readonly steps?:number;
}
export interface RisoBrushGeometry {
  /** One continuous ribbon, original source-space positive ink. */
  readonly outerPath:string;
  /** Nested internal closed slots become PAPER, not painted white marks. */
  readonly dryPaths:readonly string[];
  readonly centerline:readonly RisoBrushPoint[];
  readonly widthProfile:readonly number[];
  readonly count:number;
  /** Exact original source edge stations, before trap. No decimation. */
  readonly edgePositive:readonly RisoBrushPoint[];
  readonly edgeNegative:readonly RisoBrushPoint[];
}
const n=(v:number)=>Number(v.toFixed(3));
const coord=(p:RisoBrushPoint)=>n(p.x)+" "+n(p.y);
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const unit=(x:number)=>Number.isFinite(x)&&x>=0&&x<=1;
const sample=(o:RisoBrushOptions,t:number):RisoBrushPoint=>{
  const s=1-t,a=s*s*s,b=3*s*s*t,c=3*s*t*t,d=t*t*t;
  return {x:a*o.start.x+b*o.control1.x+c*o.control2.x+d*o.end.x,
    y:a*o.start.y+b*o.control1.y+c*o.control2.y+d*o.end.y};
};
/** Evaluate the EXACT original authored cubic at arbitrary t; hole
 * sampling must not quantize to the ribbon's outer station count. */
function normalAt(o:RisoBrushOptions,t:number):RisoBrushPoint{
  const s=1-t;
  const dx=3*s*s*(o.control1.x-o.start.x)+6*s*t*(o.control2.x-o.control1.x)+
    3*t*t*(o.end.x-o.control2.x);
  const dy=3*s*s*(o.control1.y-o.start.y)+6*s*t*(o.control2.y-o.control1.y)+
    3*t*t*(o.end.y-o.control2.y);
  const len=Math.hypot(dx,dy);
  if(len<1e-7)throw new RangeError("RISO62 cubic has a collapsed interior tangent");
  return {x:-dy/len,y:dx/len};
}
function validate(o:RisoBrushOptions):void{
  if(!o||![o.start,o.control1,o.control2,o.end].every(p=>
    p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&
    Math.abs(p.x)<=8192&&Math.abs(p.y)<=8192)||
    !Number.isFinite(o.width)||o.width<1||o.width>96||
    !unit(o.dryness)||!Number.isSafeInteger(o.seed)||o.seed<0||
    o.seed>2147483647||!Number.isInteger(o.steps??80)||
    (o.steps??80)<24||(o.steps??80)>256||
    !Array.isArray(o.pressure)||o.pressure.length<2||o.pressure.length>12||
    o.pressure[0]?.at!==0||o.pressure[o.pressure.length-1]?.at!==1||
    o.pressure.some((p,i)=>!p||!unit(p.at)||!unit(p.width)||
      (i>0&&p.at<=o.pressure[i-1].at)))
    throw new RangeError("RISO62 requires finite cubic ink, 2..12 ordered pressure knots and bounded brush stock.");
  const len=Math.hypot(o.end.x-o.start.x,o.end.y-o.start.y);
  if(len<3)throw new RangeError("RISO62 needs a real extended brush gesture");
}
export function risoBrushPressureAt(stops:readonly RisoBrushPressure[],t:number){
  if(!Array.isArray(stops)||stops.length<2||!Number.isFinite(t)||
    stops[0]?.at!==0||stops[stops.length-1]?.at!==1||
    stops.some((s,i)=>!s||!unit(s.at)||!unit(s.width)||
      (i>0&&s.at<=stops[i-1].at)))
    throw new RangeError("RISO62 invalid pressure samples");
  const position=Math.max(0,Math.min(1,t));
  for(let i=1;i<stops.length;i++){
    const a=stops[i-1],b=stops[i];
    if(position<=b.at){
      const h=(position-a.at)/(b.at-a.at);
      const ease=h*h*(3-2*h);
      return lerp(a.width,b.width,ease);
    }
  }
  return stops[stops.length-1].width;
}
/** Smooth each original edge by quadratic points, including a closed
 * tangent-aware cap. Holes remain independent editable subpaths. */
export function risoBrushClosedPath(points:readonly RisoBrushPoint[]):string{
  if(points.length<3)throw new RangeError("RISO62 closed ribbon needs 3+ points");
  const mid=(a:RisoBrushPoint,b:RisoBrushPoint):RisoBrushPoint=>({
    x:(a.x+b.x)/2,y:(a.y+b.y)/2,
  });
  let path="M"+coord(mid(points[points.length-1],points[0]));
  for(let i=0;i<points.length;i++)
    path+=" Q"+coord(points[i])+" "+coord(mid(points[i],points[(i+1)%points.length]));
  return path+" Z";
}
/** Pure geometry for arbitrary animation seek. Pattern position and
 * pressure come only from original centerline and seed. */
export function createRisoBrushGeometry(o:RisoBrushOptions):RisoBrushGeometry{
  validate(o);
  const steps=o.steps??80;
  const nodes=Array.from({length:steps+1},(_,i)=>sample(o,i/steps));
  const normals=nodes.map((_,i):RisoBrushPoint=>{
    const a=nodes[Math.max(0,i-1)],b=nodes[Math.min(steps,i+1)];
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    if(len<1e-7)throw new RangeError("RISO62 cubic has degenerate tangent");
    return {x:-dy/len,y:dx/len};
  });
  const widthProfile=nodes.map((_,i)=>n(o.width*risoBrushPressureAt(o.pressure,i/steps)));
  // Edge grain contains long fibre wobble, short wax/ink pickups and
  // occasional small void-edge bites. It is tied to the SOURCE station and
  // seed, never to animation time or rendered pixel position.
  const edge=(side:number)=>nodes.map((p,i)=>{
    const low=Math.sin(i*.21+o.seed*.017+side*2.6)*.075+
      Math.cos(i*.075+o.seed*.23-side*.7)*.045;
    const pickup=(printHash(o.seed,i,side>0?21:43)-.5)*.26;
    const nick=printHash(o.seed,Math.floor(i/3),side>0?83:89)>.91?-.14:0;
    const grain=(low+pickup+nick)*o.dryness;
    const w=widthProfile[i]*(1+grain)*.5*side;
    return {x:p.x+normals[i].x*w,y:p.y+normals[i].y*w};
  });
  const edgePositive=edge(1),edgeNegative=edge(-1);
  const outside=[...edgePositive,...edgeNegative.slice().reverse()];
  const outerPath=risoBrushClosedPath(outside);
  // Physically unprinted substrate: long tapered bristle streaks and
  // irregular paper-tooth pinholes are independent source-native cutouts.
  // Seven offset lanes stop parallel streaks from becoming one giant
  // polygon; their local width stays strictly INSIDE the positive ribbon.
  const dryPaths:string[]=[];
  if(o.dryness>0){
    const strands=Math.max(1,Math.round(o.dryness*39));
    for(let j=0;j<strands;j++){
      const at=.11+(j+.31*printHash(o.seed,j,101))/strands*.77;
      const span=(.038+printHash(o.seed,j,103)*.16)*(.43+o.dryness*.57);
      const from=Math.max(.042,at-span/2),to=Math.min(.96,at+span/2);
      const lane=((j*5)%7-3)*.13+(printHash(o.seed,j,107)-.5)*.016;
      const radius=.019+printHash(o.seed,j,109)*.042;
      const slit:RisoBrushPoint[]=[],other:RisoBrushPoint[]=[];
      for(let k=0;k<=16;k++){
        const t=lerp(from,to,k/16);
        const p=sample(o,t),normal=normalAt(o,t);
        const w=o.width*risoBrushPressureAt(o.pressure,t);
        const tip=Math.sin(Math.PI*k/16)**.7;
        const flicker=.78+.18*Math.sin(k*1.31+j*.77)+
          .13*(printHash(o.seed,j,k+171)-.5);
        const half=Math.max(.0001,w*radius*o.dryness*tip*flicker);
        const center=w*(lane+.012*Math.sin(k*.44+j*.9));
        slit.push({x:p.x+normal.x*(center+half),y:p.y+normal.y*(center+half)});
        other.push({x:p.x+normal.x*(center-half),y:p.y+normal.y*(center-half)});
      }
      dryPaths.push(risoBrushClosedPath([...slit,...other.reverse()]));
    }
    // Micro-pores are grain-sized distinct imperfect droplets where the
    // master has no pigment; shape and distribution remain editable SVG.
    const pores=Math.round(o.dryness*38);
    for(let j=0;j<pores;j++){
      const t=.12+printHash(o.seed,j,211)*.76;
      const p=sample(o,t),normal=normalAt(o,t);
      const w=o.width*risoBrushPressureAt(o.pressure,t);
      const across=(printHash(o.seed,j,223)-.5)*.73*w;
      const cx=p.x+normal.x*across,cy=p.y+normal.y*across;
      const rad=w*(.021+.032*printHash(o.seed,j,227))*o.dryness;
      const axial=rad*(1.2+1.3*printHash(o.seed,j,229));
      const tangent={x:-normal.y,y:normal.x};
      const points=Array.from({length:8},(_,k)=>{
        const theta=k*Math.PI/4,scatter=.86+.26*printHash(o.seed,j,k+233);
        return {x:cx+scatter*(Math.cos(theta)*axial*tangent.x+
          Math.sin(theta)*rad*normal.x),
          y:cy+scatter*(Math.cos(theta)*axial*tangent.y+
          Math.sin(theta)*rad*normal.y)};
      });
      dryPaths.push(risoBrushClosedPath(points));
    }
  }
  return {outerPath,dryPaths,centerline:nodes.map(p=>({x:n(p.x),y:n(p.y)})),
    widthProfile,count:dryPaths.length,edgePositive,edgeNegative};
}
/** Source-native combined fill: SVG evenodd reveals true stock through
 * all nested dry splinters while retaining original edge controls. */
export function risoBrushInkPath(geometry:RisoBrushGeometry):string{
  return [geometry.outerPath,...geometry.dryPaths].join(" ");
}
