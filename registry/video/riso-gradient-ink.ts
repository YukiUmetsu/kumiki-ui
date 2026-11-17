import {printHash} from "./print-plates";

/** RISO61: separately deposited, paper-registered source-space AM dots.
 * This is a variable-density physical spot-ink stencil, NOT an opacity
 * gradient or an RGB/postprocess texture. */
export type RisoGradientDirection="horizontal"|"vertical"|"radial";
export interface RisoGradientStop {
  readonly at:number;
  readonly coverage:number;
}
export interface RisoGradientOptions {
  readonly x:number;
  readonly y:number;
  readonly width:number;
  readonly height:number;
  readonly cell:number;
  readonly angle:number;
  readonly seed:number;
  readonly plateIndex:number;
  readonly direction:RisoGradientDirection;
  readonly stops:readonly RisoGradientStop[];
  readonly dotGain?:number;
  readonly irregularity?:number;
  readonly dropout?:number;
}
export interface RisoGradientDot {
  readonly x:number;
  readonly y:number;
  readonly r:number;
  readonly tone:number;
}
export interface RisoGradientGeometry {
  readonly dots:readonly RisoGradientDot[];
  readonly siteCount:number;
  readonly size:readonly [number,number];
  readonly angle:number;
  /** Sum of ink-disc areas before neighboring overlaps. */
  readonly nominalInkArea:number;
}
const unit=(v:number)=>Number.isFinite(v)&&v>=0&&v<=1;
const f=(n:number)=>Number(n.toFixed(4));
const MAX_SITES=40000;
const MAX_AXIS=4096;

function validated(o:RisoGradientOptions):void{
  if(!o||![o.x,o.y,o.width,o.height,o.cell,o.angle].every(Number.isFinite)||
    o.width<12||o.height<12||o.width>MAX_AXIS||o.height>MAX_AXIS||
    Math.abs(o.x)>8192||Math.abs(o.y)>8192||o.cell<2||o.cell>36||
    o.angle < -180||o.angle>180||
    !Number.isSafeInteger(o.seed)||o.seed<0||o.seed>2147483647||
    !Number.isSafeInteger(o.plateIndex)||o.plateIndex<0||o.plateIndex>24||
    !["horizontal","vertical","radial"].includes(o.direction)||
    !unit(o.dotGain??0)||!unit(o.irregularity??0)||
    !unit(o.dropout??0)||(o.dropout??0)>.20)
    throw new RangeError("RISO61 requires finite bounded print size, screen, ink gain and paper seed.");
  const stops=o.stops;
  if(!Array.isArray(stops)||stops.length<2||stops.length>12||
    stops[0]?.at!==0||stops[stops.length-1]?.at!==1||
    stops.some((s,i)=>!s||!unit(s.at)||!unit(s.coverage)||
      (i>0&&s.at<=stops[i-1].at)))
    throw new RangeError("RISO61 requires 2..12 strictly ascending 0..1 coverage stops, with both endpoints.");
}

function density(stops:readonly RisoGradientStop[],t:number):number{
  const v=Math.max(0,Math.min(1,t));
  for(let i=1;i<stops.length;i++){
    const a=stops[i-1],b=stops[i];
    if(v<=b.at){
      const h=(v-a.at)/(b.at-a.at);
      return a.coverage+(b.coverage-a.coverage)*h;
    }
  }
  return stops[stops.length-1].coverage;
}
export function risoGradientCoverage(
  stops:readonly RisoGradientStop[],position:number,
):number{
  if(!Array.isArray(stops)||stops.length<2||!Number.isFinite(position)||
    stops[0].at!==0||stops[stops.length-1].at!==1||
    stops.some((s,i)=>!unit(s.at)||!unit(s.coverage)||(i>0&&s.at<=stops[i-1].at)))
    throw new RangeError("RISO61 invalid tonal interpolation stops");
  return density(stops,position);
}
function tonalPosition(x:number,y:number,o:RisoGradientOptions):number{
  const u=(x-o.x)/o.width,v=(y-o.y)/o.height;
  if(o.direction==="horizontal")return u;
  if(o.direction==="vertical")return v;
  return Math.hypot((u-.5)*2,(v-.5)*2);
}

/** There is no frame argument: the source master never re-rolls its screen
 * during film seeking, overprint or cropping. Density edits only alter the
 * disc radii at stable paper sites. */
export function createRisoGradientGeometry(o:RisoGradientOptions):RisoGradientGeometry{
  validated(o);
  const radians=o.angle*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
  const corners=[
    [o.x,o.y],[o.x+o.width,o.y],[o.x,o.y+o.height],
    [o.x+o.width,o.y+o.height],
  ].map(([x,y])=>[x*c+y*s,-x*s+y*c]);
  const minX=Math.min(...corners.map(p=>p[0])),maxX=Math.max(...corners.map(p=>p[0]));
  const minY=Math.min(...corners.map(p=>p[1])),maxY=Math.max(...corners.map(p=>p[1]));
  const colStart=Math.floor(minX/o.cell)-2,colEnd=Math.ceil(maxX/o.cell)+2;
  const rowStart=Math.floor(minY/o.cell)-2,rowEnd=Math.ceil(maxY/o.cell)+2;
  const count=(colEnd-colStart+1)*(rowEnd-rowStart+1);
  if(count>MAX_SITES)throw new RangeError(
    "RISO61 exceeds 40000 source sites; split oversized artwork into independent bounded regions.");
  const dots:RisoGradientDot[]=[];
  let inkArea=0,siteCount=0;
  const jitter=o.irregularity??0,gain=o.dotGain??0,dropout=o.dropout??0;
  const paperSeed=(o.seed+o.plateIndex*7193)|0;
  for(let row=rowStart;row<=rowEnd;row++){
    for(let col=colStart;col<=colEnd;col++){
      const px=(col+.5)*o.cell*c-(row+.5)*o.cell*s;
      const py=(col+.5)*o.cell*s+(row+.5)*o.cell*c;
      if(px<o.x-o.cell*.65||px>o.x+o.width+o.cell*.65||
        py<o.y-o.cell*.65||py>o.y+o.height+o.cell*.65)continue;
      siteCount++;
      const coverage=density(o.stops,tonalPosition(px,py,o));
      if(coverage<=dropout||coverage<=0)continue;
      const pickup=printHash(paperSeed,col,row)-.5;
      const deviation=1+pickup*jitter*.19;
      const radius=o.cell*Math.min(.6,Math.sqrt(coverage/Math.PI)+.065*gain)*deviation;
      if(radius<.018)continue;
      const dx=(printHash(paperSeed+29,col,row)-.5)*o.cell*.055*jitter;
      const dy=(printHash(paperSeed+71,col,row)-.5)*o.cell*.055*jitter;
      dots.push({x:f(px+dx),y:f(py+dy),r:f(radius),tone:f(coverage)});
      inkArea+=Math.PI*radius*radius;
    }
  }
  return {dots,siteCount,size:[o.width,o.height],angle:o.angle,nominalInkArea:f(inkArea)};
}

/** One editable native SVG source path made of distinct closed ink discs.
 * Each disc keeps two elliptical arcs and its physical screen radius. */
export function risoGradientDotPath(dots:readonly RisoGradientDot[]):string{
  if(!Array.isArray(dots)||dots.length>MAX_SITES||
    dots.some(d=>![d.x,d.y,d.r].every(Number.isFinite)||d.r<=0||d.r>36))
    throw new RangeError("RISO61 dot path requires finite ink discs");
  const n=(v:number)=>Number(v.toFixed(3)).toString();
  return dots.map(d=>{
    const r=n(d.r),diameter=n(d.r*2);
    return "M"+n(d.x+d.r)+" "+n(d.y)+" a"+r+" "+r+
      " 0 1 0 -"+diameter+" 0 a"+r+" "+r+" 0 1 0 "+diameter+" 0 Z";
  }).join(" ");
}
