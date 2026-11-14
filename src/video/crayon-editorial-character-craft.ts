import {crayonHash} from "../../registry/video/materials/crayon";

/**
 * Form-directed, bounded wax scratches. Each stroke lies inside an authored
 * elliptical anatomical region rather than unrelated full-frame noise.
 * The same seed and anchors reproduce the same drawing on every film frame.
 */
export interface CrayonFormHatching {
  seed:number; cx:number; cy:number; rx:number; ry:number;
  angle?:number; count:number; length?:number; curvature?:number;
}
const fmt=(v:number)=>v.toFixed(2);
export function crayonFormHatching({
  seed,cx,cy,rx,ry,angle=-35,count,length=9,curvature=.2,
}:CrayonFormHatching):string {
  if(!Number.isSafeInteger(seed)||!Number.isSafeInteger(count)||count<0||count>160||
    ![cx,cy,rx,ry,angle,length,curvature].every(Number.isFinite)||
    rx<=0||ry<=0||rx>1000||ry>1000||
    length<=0||length>50||angle<-180||angle>180||
    curvature<-.9||curvature>.9)
    throw new RangeError("Invalid form-directed crayon hatching");
  const theta=angle*Math.PI/180, ux=Math.cos(theta),uy=Math.sin(theta);
  const out:string[]=[];
  for(let i=0;i<count;i++){
    const a=i*2.399963229728653+(crayonHash(seed,i,31)-.5)*.7;
    const r=Math.sqrt((i+.45)/Math.max(1,count))*.8;
    const x=cx+Math.cos(a)*r*rx,y=cy+Math.sin(a)*r*ry;
    const l=length*(.48+.52*crayonHash(seed,i,32))*Math.min(1,(1-r)*3.1);
    const slant=(crayonHash(seed,i,33)-.5)*.26;
    const vx=ux*Math.cos(slant)-uy*Math.sin(slant);
    const vy=uy*Math.cos(slant)+ux*Math.sin(slant);
    const nx=-vy,ny=vx, bend=curvature*l*(crayonHash(seed,i,34)-.35);
    const x0=x-vx*l*.5,y0=y-vy*l*.5;
    const x1=x+vx*l*.5,y1=y+vy*l*.5;
    out.push("M"+fmt(x0)+" "+fmt(y0)+" Q"+
      fmt(x+nx*bend)+" "+fmt(y+ny*bend)+" "+
      fmt(x1)+" "+fmt(y1));
  }
  return out.join(" ");
}

/**
 * An anatomically measured fur field. Rather than scattering independently
 * angled dashes across an ellipse, each hair follows the tangent of an authored
 * cubic guide with a stable normal offset. Different guides represent the
 * brow arch, cheek turn, neck ruff and the sweep of the ear. A few forked
 * pigment tips are included as connected branching marks, never loose dots.
 *
 * This returns an ordinary reusable SVG path for the existing crayon renderer.
 * Add `clipToParent:true` on its contour to trim every hair to the parent
 * wax silhouette, including hand-redrawn silhouettes.
 */
export interface CrayonFurPoint { x:number; y:number }
export interface CrayonFurFlow {
  seed:number;
  guide:readonly [CrayonFurPoint,CrayonFurPoint,CrayonFurPoint,CrayonFurPoint];
  count:number;
  spread:number;
  length:number;
  /** Rate of connected forked tips, 0..0.3. */
  forkRate?:number;
  /** Max sideways change along a hair, relative to its length. */
  curvature?:number;
}
function furBezier(g:CrayonFurFlow["guide"],t:number):CrayonFurPoint {
  const s=1-t;
  return {x:s*s*s*g[0].x+3*s*s*t*g[1].x+3*s*t*t*g[2].x+t*t*t*g[3].x,
    y:s*s*s*g[0].y+3*s*s*t*g[1].y+3*s*t*t*g[2].y+t*t*t*g[3].y};
}
function furTangent(g:CrayonFurFlow["guide"],t:number):CrayonFurPoint {
  const s=1-t;
  let x=3*s*s*(g[1].x-g[0].x)+6*s*t*(g[2].x-g[1].x)+3*t*t*(g[3].x-g[2].x);
  let y=3*s*s*(g[1].y-g[0].y)+6*s*t*(g[2].y-g[1].y)+3*t*t*(g[3].y-g[2].y);
  let len=Math.hypot(x,y);
  if(len<.000001){
    x=g[3].x-g[0].x;y=g[3].y-g[0].y;
    len=Math.hypot(x,y);
  }
  return {x:x/len,y:y/len};
}
export function crayonFurFlow({
  seed,guide,count,spread,length,forkRate=.07,curvature=.16,
}:CrayonFurFlow):string {
  if(!Number.isSafeInteger(seed)||!Number.isSafeInteger(count)||
    count<0||count>160||
    ![spread,length,forkRate,curvature].every(Number.isFinite)||
    spread<0||spread>600||length<=.2||length>100||
    forkRate<0||forkRate>.3||curvature<0||curvature>.8||
    !Array.isArray(guide)||guide.length!==4||
    !guide.every(p=>p&&[p.x,p.y].every(v=>Number.isFinite(v)&&Math.abs(v)<8192))||
    Math.hypot(guide[3].x-guide[0].x,guide[3].y-guide[0].y)<1)
    throw new RangeError("Invalid anatomical crayon fur flow");
  const out:string[]=[];
  for(let i=0;i<count;i++){
    // Stratified distance along the muscle/follicle trajectory with
    // independent crosswise placement. No grid of parallel ruler strokes.
    const u=Math.min(.99,Math.max(.01,
      (i+.2+.6*crayonHash(seed,i,51))/Math.max(1,count)));
    const drift=2*crayonHash(seed,i,52)-1;
    const side=spread*drift*(.73+.27*Math.sin(Math.PI*u));
    const tangent=furTangent(guide,u);
    const p=furBezier(guide,u);
    const speed=Math.max(1,Math.hypot(
      furBezier(guide,Math.min(1,u+.006)).x-furBezier(guide,Math.max(0,u-.006)).x,
      furBezier(guide,Math.min(1,u+.006)).y-furBezier(guide,Math.max(0,u-.006)).y)/.012);
    const extent=length*(.39+.61*crayonHash(seed,i,53));
    const dt=Math.min(.13,Math.max(.003,extent/(2*speed)));
    const t0=Math.max(.001,u-dt),t1=Math.min(.999,u+dt);
    const a=furBezier(guide,t0),b=furBezier(guide,t1);
    const va=furTangent(guide,t0),vb=furTangent(guide,t1);
    const start={x:a.x-va.y*side,y:a.y+va.x*side};
    const end={x:b.x-vb.y*side,y:b.y+vb.x*side};
    const bend=(crayonHash(seed,i,54)-.5)*2*curvature*extent;
    const mid={x:p.x-tangent.y*(side+bend),y:p.y+tangent.x*(side+bend)};
    out.push("M"+fmt(start.x)+" "+fmt(start.y)+" Q"+
      fmt(mid.x)+" "+fmt(mid.y)+" "+fmt(end.x)+" "+fmt(end.y));
    // Connected, asymmetric side filaments trace wax drag near the tips.
    // This is not random overlaid paper noise; the branch starts *on* a hair.
    if(crayonHash(seed,i,55)<forkRate){
      const fork={x:mid.x+tangent.x*extent*.16,
        y:mid.y+tangent.y*extent*.16};
      const turn=(crayonHash(seed,i,56)<.5?-1:1);
      const forkEnd={x:end.x-tangent.y*turn*extent*.2,
        y:end.y+tangent.x*turn*extent*.2};
      out.push("M"+fmt(fork.x)+" "+fmt(fork.y)+" Q"+
        fmt((fork.x+forkEnd.x)*.5)+" "+fmt((fork.y+forkEnd.y)*.5)+
        " "+fmt(forkEnd.x)+" "+fmt(forkEnd.y));
    }
  }
  return out.join(" ");
}

/** Minute radial pigment striations in a naturally elliptical iris, below the
 * pupil. The two rings have different seeds/colors and do not form a perfectly
 * uniform clock-face. Clip the contour to the painted iris to preserve edges. */
export interface CrayonIrisFlecks {
  seed:number;cx:number;cy:number;rx:number;ry:number;count:number;
  minRadius?:number;maxRadius?:number;
}
export function crayonIrisFlecks({
  seed,cx,cy,rx,ry,count,minRadius=.49,maxRadius=.91,
}:CrayonIrisFlecks):string {
  if(!Number.isSafeInteger(seed)||!Number.isSafeInteger(count)||count<0||count>80||
    ![cx,cy,rx,ry,minRadius,maxRadius].every(Number.isFinite)||
    Math.abs(cx)>8192||Math.abs(cy)>8192||rx<=0||ry<=0||rx>100||ry>100||
    minRadius<0||maxRadius>1||maxRadius<=minRadius)
    throw new RangeError("Invalid wax iris striation study");
  const out:string[]=[];
  for(let i=0;i<count;i++){
    const theta=(i+.19+crayonHash(seed,i,91)*.42)*Math.PI*2/Math.max(1,count);
    const r0=minRadius+(maxRadius-minRadius)*(.1+crayonHash(seed,i,92)*.24);
    const r1=minRadius+(maxRadius-minRadius)*(.58+crayonHash(seed,i,93)*.4);
    const shift=(crayonHash(seed,i,94)-.5)*.10;
    const point=(r:number,t:number)=>({x:cx+rx*r*Math.cos(t),
      y:cy+ry*r*Math.sin(t)});
    const a=point(r0,theta),mid=point((r0+r1)*.5,theta+shift*.4),
      b=point(r1,theta+shift);
    out.push("M"+fmt(a.x)+" "+fmt(a.y)+" Q"+
      fmt(mid.x)+" "+fmt(mid.y)+" "+fmt(b.x)+" "+fmt(b.y));
  }
  return out.join(" ");
}
