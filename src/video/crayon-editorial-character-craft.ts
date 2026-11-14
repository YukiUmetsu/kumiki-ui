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
