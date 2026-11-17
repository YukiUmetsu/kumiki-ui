/**
 * ArtCraft CP-F1 botanical lamina study, opt-in only until independently
 * reviewed at native film size. The source is an original geometric rose,
 * NOT an extracted path from another artist's photograph or illustration.
 *
 * Anatomical form precedes pencil texture: each named petal owns its root,
 * bending belly, rolled distal rim, and independent lateral flare. Micro
 * contacts are tangent to that actual local flow; the existing petal's
 * physical SVG clip prevents pigment from crossing an overlapping lamina.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilTrace} from "../../registry/video/colored-pencil";

type Point = readonly [number,number];
export interface RoseLaminaAxis {
  readonly id:string;
  readonly root:Point;
  readonly belly:Point;
  readonly rim:Point;
  readonly halfWidth:number;
}
/** Explicit observation-led construction, not a generic radial flower fan. */
export const ROSE_LAMINA_AXES:readonly RoseLaminaAxis[]=[
  {id:"outer-left",root:[228,242],belly:[151,200],rim:[169,105],halfWidth:22},
  {id:"outer-right",root:[267,241],belly:[342,203],rim:[319,114],halfWidth:24},
  {id:"back-cup",root:[247,182],belly:[243,128],rim:[246,91],halfWidth:31},
  {id:"petal-front-left",root:[237,263],belly:[199,209],rim:[194,151],halfWidth:20},
  {id:"petal-front-right",root:[247,271],belly:[294,229],rim:[306,173],halfWidth:21},
  {id:"inner-fold",root:[257,176],belly:[251,151],rim:[260,144],halfWidth:17},
  {id:"heart",root:[238,170],belly:[248,155],rim:[245,145],halfWidth:7},
] as const;
const notes=[
  {id:"cool-shadow",color:"#552943",width:.38,opacity:.23,startFrame:169},
  {id:"carmine",color:"#A33360",width:.32,opacity:.30,startFrame:203},
  {id:"rose-veil",color:"#D87985",width:.23,opacity:.24,startFrame:234},
  {id:"cuticle-light",color:"#FFD1BA",width:.22,opacity:.25,startFrame:260},
] as const;
function sample(axis:RoseLaminaAxis,t:number){
  const u=1-t;
  const x=u*u*axis.root[0]+2*u*t*axis.belly[0]+t*t*axis.rim[0];
  const y=u*u*axis.root[1]+2*u*t*axis.belly[1]+t*t*axis.rim[1];
  const dx=2*u*(axis.belly[0]-axis.root[0])+2*t*(axis.rim[0]-axis.belly[0]);
  const dy=2*u*(axis.belly[1]-axis.root[1])+2*t*(axis.rim[1]-axis.belly[1]);
  const length=Math.hypot(dx,dy);
  if(length<1e-6)throw new RangeError("Degenerate botanical petal flow");
  return {x,y,dx:dx/length,dy:dy/length};
}
const f=(x:number)=>x.toFixed(2);
/** One curve = one real, short pencil contact. Never draw a straight spoke
 * across the rose or stamp screen-space grain over unattached petals. */
function contact(x:number,y:number,dx:number,dy:number,length:number,bend:number){
  const nx=-dy,ny=dx;
  return "M"+f(x-dx*length*.45)+" "+f(y-dy*length*.45)+
    " Q"+f(x+nx*bend)+" "+f(y+ny*bend)+
    " "+f(x+dx*length*.55+nx*bend*.22)+" "+
      f(y+dy*length*.55+ny*bend*.22);
}
/** Four separate pigment families, each ≤ ~6k SVG path characters.
 * Existing 3 CP-F1 deposition layers, outer geometry and named detail
 * strokes are never replaced. Output is frame-addressable and seed-stable. */
export function roseLaminaFibres(id:string,seed:number):PencilTrace[]{
  const axisIndex=ROSE_LAMINA_AXES.findIndex(a=>a.id===id);
  if(axisIndex<0)throw new RangeError("Unknown anatomical rose petal: "+id);
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483000)
    throw new RangeError("Invalid botanical pencil seed");
  const axis=ROSE_LAMINA_AXES[axisIndex];
  return notes.map((note,pass)=>{
    const commands:string[]=[];
    for(let i=0;i<64;i++){
      const key=axisIndex*4793+pass*311+i;
      const t=Math.min(.965,Math.max(.055,
        (i+.22+.56*pencilHash(seed,key,1))/64));
      const tangent=sample(axis,t);
      const lateral=(pencilHash(seed,key,2)*2-1)*axis.halfWidth*
        Math.pow(Math.sin(Math.PI*t),.84);
      const nx=-tangent.dy,ny=tangent.dx;
      const x=tangent.x+nx*lateral,y=tangent.y+ny*lateral;
      const length=(1.8+3.3*pencilHash(seed,key,3))*
        (pass===3?.67:pass===0?.83:1);
      const bend=(pencilHash(seed,key,4)-.5)*.85;
      commands.push(contact(x,y,tangent.dx,tangent.dy,length,bend));
      // Rare split capillary-vein contact, at a separate oblique angle.
      // The split never substitutes a continuous, mechanically repeated fan.
      if(i%9===pass%3){
        const branch=(pencilHash(seed,key,5)-.5)*.52;
        const a=branch*tangent.dx+.25*nx;
        const b=branch*tangent.dy+.25*ny;
        const norm=Math.hypot(a,b);
        if(norm>1e-6)commands.push(contact(x,y,a/norm,b/norm,
          length*.63,bend*.45));
      }
    }
    const path=commands.join(" ");
    if(path.length>12000)throw new RangeError("Botanical microfibre SVG budget exceeded");
    return {
      id:"rose-lam-"+id+"-"+note.id,path,color:note.color,
      width:note.width,opacity:note.opacity,
      startFrame:note.startFrame,durationFrames:49,
    };
  });
}
