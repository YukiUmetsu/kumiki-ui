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
function smoothClosed(points:readonly RisoBrushPoint[]):string{
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
  const edge=(side:number)=>nodes.map((p,i)=>{
    const grain=(printHash(o.seed,i,side>0?21:43)-.5)*o.dryness*.13;
    const w=widthProfile[i]*(1+grain)*.5*side;
    return {x:p.x+normals[i].x*w,y:p.y+normals[i].y*w};
  });
  const outside=[...edge(1),...edge(-1).reverse()];
  const outerPath=smoothClosed(outside);
  // Narrow, nonuniform paper-white channels follow actual tangent fields.
  // They never escape the positive ribbon; avoid broad opaque rectangles.
  const dryPaths:string[]=[];
  if(o.dryness>0){
    const strands=Math.max(1,Math.round(o.dryness*13));
    for(let j=0;j<strands;j++){
      const at=.11+printHash(o.seed,j,101)*.69;
      const span=(.055+printHash(o.seed,j,103)*.17)*(.35+o.dryness*.65);
      const from=Math.max(.045,at-span/2),to=Math.min(.955,at+span/2);
      const side=(printHash(o.seed,j,107)-.5)*.95;
      const radius=.022+printHash(o.seed,j,109)*.038;
      const slit: RisoBrushPoint[]=[];
      const other: RisoBrushPoint[]=[];
      for(let k=0;k<=12;k++){
        const t=lerp(from,to,k/12),index=Math.min(steps,Math.round(t*steps));
        const p=nodes[index],normal=normals[index],w=widthProfile[index];
        const tip=Math.sin(Math.PI*k/12)**.75;
        const half=Math.max(.004,w*radius*o.dryness*tip);
        const center=w*side*.34;
        slit.push({x:p.x+normal.x*(center+half),y:p.y+normal.y*(center+half)});
        other.push({x:p.x+normal.x*(center-half),y:p.y+normal.y*(center-half)});
      }
      // True cut-out holes, not fragile different-color drawn lines.
      if(Math.max(...widthProfile)>0.1)dryPaths.push(smoothClosed([...slit,...other.reverse()]));
    }
  }
  return {outerPath,dryPaths,centerline:nodes.map(p=>({x:n(p.x),y:n(p.y)})),
    widthProfile,count:dryPaths.length};
}
/** Source-native combined fill: SVG evenodd reveals true stock through
 * all nested dry splinters while retaining original edge controls. */
export function risoBrushInkPath(geometry:RisoBrushGeometry):string{
  return [geometry.outerPath,...geometry.dryPaths].join(" ");
}
