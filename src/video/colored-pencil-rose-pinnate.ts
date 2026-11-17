/**
 * Experimental CP-F1 / FLORA1 original rose foliage.
 *
 * A photographed rose leaf is odd-pinnate: five individually attached,
 * serrated leaflets on one rachis, a terminal leaflet, and a pair of small
 * stipules at the petiole/stem junction. This original five-leaflet study
 * deliberately does not claim any identified rose cultivar. Technique
 * references are morphology-only; no borrowed artist path or photo pixels.
 *
 * Both foliage sprays own real local root-to-tip curved axes. Serration tips
 * and small branch veins are grown from those axes, never from a flat radial
 * texture stamp. Nothing changes the original default scene when disabled.
 */
import type {PencilTrace} from "../../registry/video/colored-pencil";

type Point=readonly [number,number];
type Palette=readonly [string,string,string];
export interface RoseLeafletAxis {
  readonly id:string;
  readonly spray:"left"|"right";
  readonly root:Point;
  readonly belly:Point;
  readonly tip:Point;
  readonly halfWidth:number;
  readonly teeth:number;
  /** Small whole-blade asymmetry to avoid mirrored teardrop shapes. */
  readonly nearBias:number;
  readonly palette:Palette;
}
export interface RoseFoliageOrgan {
  readonly id:string;
  readonly surface:"leaf"|"wood";
  readonly path:string;
  readonly bounds:readonly [number,number,number,number];
  readonly palette:Palette;
  readonly details:readonly PencilTrace[];
  readonly direction:number;
  readonly flow:number;
  readonly startFrame:number;
}
const sage:Palette=["#82985B","#405F51","#C8C88C"];
const olive:Palette=["#728F59","#3A5A49","#C4D09A"];
const lush:Palette=["#63885B","#335549","#B3C58F"];
const sunlit:Palette=["#91A565","#48644B","#D4D9A2"];
/** Two separate oppositely projecting sprays, 2 paired nodes + 1 terminal.
 * Each blade carries its own orientation, curvature, width and tooth scale. */
export const ROSE_LEAFLET_AXES:readonly RoseLeafletAxis[]=[
  {id:"left-pair-near-up",spray:"left",root:[211,331],belly:[193,311],tip:[199,281],
    halfWidth:13.3,teeth:12,nearBias:.12,palette:olive},
  {id:"left-pair-near-down",spray:"left",root:[211,331],belly:[193,355],tip:[193,379],
    halfWidth:14.2,teeth:13,nearBias:-.09,palette:lush},
  {id:"left-pair-far-up",spray:"left",root:[163,318],belly:[146,303],tip:[133,283],
    halfWidth:11.8,teeth:11,nearBias:.15,palette:sunlit},
  {id:"left-pair-far-down",spray:"left",root:[163,318],belly:[143,337],tip:[140,361],
    halfWidth:12.3,teeth:12,nearBias:-.07,palette:olive},
  {id:"left-terminal",spray:"left",root:[129,307],belly:[102,296],tip:[72,306],
    halfWidth:14.5,teeth:14,nearBias:.08,palette:sage},
  {id:"right-pair-near-up",spray:"right",root:[289,345],belly:[281,319],tip:[293,285],
    halfWidth:13.4,teeth:12,nearBias:-.13,palette:sage},
  {id:"right-pair-near-down",spray:"right",root:[289,345],belly:[309,365],tip:[329,383],
    halfWidth:14.1,teeth:13,nearBias:.12,palette:lush},
  {id:"right-pair-far-up",spray:"right",root:[340,318],belly:[344,296],tip:[361,278],
    halfWidth:11.7,teeth:11,nearBias:.09,palette:sunlit},
  {id:"right-pair-far-down",spray:"right",root:[340,318],belly:[360,342],tip:[371,362],
    halfWidth:12.8,teeth:12,nearBias:-.13,palette:olive},
  {id:"right-terminal",spray:"right",root:[375,300],belly:[394,288],tip:[410,288],
    halfWidth:14.4,teeth:14,nearBias:-.06,palette:sage},
] as const;
function sample(axis:RoseLeafletAxis,t:number){
  const u=1-t;
  const x=u*u*axis.root[0]+2*u*t*axis.belly[0]+t*t*axis.tip[0];
  const y=u*u*axis.root[1]+2*u*t*axis.belly[1]+t*t*axis.tip[1];
  const dx=2*u*(axis.belly[0]-axis.root[0])+2*t*(axis.tip[0]-axis.belly[0]);
  const dy=2*u*(axis.belly[1]-axis.root[1])+2*t*(axis.tip[1]-axis.belly[1]);
  const n=Math.hypot(dx,dy);
  if(n<1e-5)throw new RangeError("Invalid rose leaflet axis: "+axis.id);
  return {x,y,tx:dx/n,ty:dy/n,nx:-dy/n,ny:dx/n};
}
const f=(n:number)=>n.toFixed(2);
const v=(x:number,y:number)=>f(x)+" "+f(y);
/** Asymmetrical, tapered ovate lamina. Numerous *small physical* serrations
 * follow BOTH curved margins, each with a root notch, oblique triangular tip
 * and soft shoulder. This is not a scale-free wavy SVG filter. */
function widthAt(axis:RoseLeafletAxis,t:number,side:number){
  if(t<=0||t>=1)return 0;
  const taper=Math.pow(Math.sin(Math.PI*t),.79);
  const shoulder=1+.105*Math.sin(2*Math.PI*t+axis.teeth*.53);
  return axis.halfWidth*taper*shoulder*(1+side*axis.nearBias);
}
function marginPoint(axis:RoseLeafletAxis,t:number,side:number,add:number){
  const p=sample(axis,t);
  const outer=Math.max(0,widthAt(axis,t,side)+add);
  return [p.x+p.nx*side*outer,p.y+p.ny*side*outer] as const;
}
function leafletContour(axis:RoseLeafletAxis){
  const points:Point[]=[];
  for(const side of [1,-1]){
    const edge:Point[]=[marginPoint(axis,0,side,0)];
    for(let tooth=0;tooth<axis.teeth;tooth++){
      const q=(offset:number)=>(tooth+offset)/axis.teeth;
      const t0=q(.23),tc=q(.54),tn=q(.78),t1=q(1);
      const soft=1+Math.sin((tooth+1)*2.17+axis.teeth*.47)*.13;
      const lift=(.82+axis.halfWidth*.067)*soft*
        Math.pow(Math.sin(Math.PI*tc),.72);
      edge.push(marginPoint(axis,t0,side,-.18),
        marginPoint(axis,tc,side,lift),
        marginPoint(axis,tn,side,-.55),marginPoint(axis,t1,side,0));
    }
    if(side===-1)edge.reverse();
    if(points.length)edge.shift(); // tip shared by both sides
    points.push(...edge);
  }
  let path="M"+v(points[0][0],points[0][1]);
  for(const p of points.slice(1))path+=" L"+v(p[0],p[1]);
  return {path:path+" Z",points};
}
function bounds(points:readonly Point[]):readonly [number,number,number,number]{
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const x=Math.min(...xs),y=Math.min(...ys),x1=Math.max(...xs),y1=Math.max(...ys);
  // A 2.5 art-unit margin leaves enough room for fine pencil contacts.
  return [Math.floor(x-2.5),Math.floor(y-2.5),
    Math.ceil(x1+2.5)-Math.floor(x-2.5),
    Math.ceil(y1+2.5)-Math.floor(y-2.5)];
}
function line(path:string,color:string,width:number,startFrame:number,opacity:number):PencilTrace{
  return {path,color,width,startFrame,durationFrames:50,opacity};
}
function veins(axis:RoseLeafletAxis):readonly PencilTrace[]{
  const a=axis.root,b=axis.belly,c=axis.tip;
  const center="M"+v(a[0],a[1])+" Q"+v(b[0],b[1])+" "+v(c[0],c[1]);
  const lateralPaths:string[]=[];
  for(let i=0;i<7;i++){
    const t=.17+i*.105;
    const p=sample(axis,t);
    for(const side of [-1,1]){
      const q=sample(axis,Math.min(.96,t+.115));
      const offset=widthAt(axis,Math.min(.96,t+.115),side)*(.76+.05*Math.sin(i*1.8));
      const endX=q.x+q.nx*side*offset,endY=q.y+q.ny*side*offset;
      const midX=(p.x+endX)/2+p.tx*.8,midY=(p.y+endY)/2+p.ty*.8;
      lateralPaths.push("M"+v(p.x,p.y)+" Q"+v(midX,midY)+" "+v(endX,endY));
    }
  }
  const fibrePaths:string[]=[];
  for(let i=0;i<34;i++){
    const t=.12+.77*(i/34);
    const p=sample(axis,t);
    const side=i%2?-1:1;
    const w=widthAt(axis,t,side);
    const offset=w*(.23+.4*((i*7)%11)/11);
    const px=p.x+p.nx*side*offset,py=p.y+p.ny*side*offset;
    const len=1.15+.5*(i%5);
    fibrePaths.push("M"+v(px-p.tx*len*.46,py-p.ty*len*.46)+
      " Q"+v(px+p.nx*side*.28,py+p.ny*side*.28)+
      " "+v(px+p.tx*len*.58,py+p.ty*len*.58));
  }
  return [
    line(center,"#DADEB0",.88,203,.76),
    line(lateralPaths.join(" "),"#B4C58D",.52,218,.67),
    line(fibrePaths.join(" "),"#D0D6A1",.3,235,.4),
  ];
}
function leaflet(axis:RoseLeafletAxis):RoseFoliageOrgan{
  const {path,points}=leafletContour(axis);
  const dx=axis.tip[0]-axis.root[0],dy=axis.tip[1]-axis.root[1];
  return {
    id:"rose-"+axis.id,surface:"leaf",path,bounds:bounds(points),
    palette:axis.palette,details:veins(axis),
    direction:Math.atan2(dy,dx)*180/Math.PI,flow:axis.nearBias*110,
    startFrame:52,
  };
}
const support:readonly RoseFoliageOrgan[]=[
  {
    id:"rose-left-rachis",surface:"wood",
    path:"M242 332 C210 321 169 305 125 303 L124 310 C166 314 211 333 245 341 Z",
    bounds:[121,299,128,47],palette:["#6B8260","#385044","#BBC899"],
    direction:14,flow:10,startFrame:49,
    details:[line("M242 337 Q182 310 128 306","#C0CC99",.95,203,.78),
      line("M222 332 Q184 318 157 312","#405D49",.55,229,.57)],
  },
  {
    id:"rose-left-stipule-upper",surface:"leaf",
    path:"M238 334 Q232 327 229 321 Q234 325 243 332 L243 339 Z",
    bounds:[226,318,21,25],palette:olive,direction:-35,flow:8,startFrame:54,
    details:[line("M241 336 Q233 327 230 323","#D4D9A8",.49,218,.65),
      line("M238 333 L233 330","#385746",.35,245,.6)],
  },
  {
    id:"rose-left-stipule-lower",surface:"leaf",
    path:"M242 338 Q232 345 226 350 Q239 347 247 342 Z",
    bounds:[223,335,27,18],palette:olive,direction:158,flow:-8,startFrame:54,
    details:[line("M246 341 Q233 346 228 349","#D4D9A8",.47,218,.62),
      line("M240 344 Q236 345 234 346","#375847",.34,245,.57)],
  },
  {
    id:"rose-right-rachis",surface:"wood",
    path:"M246 359 C287 328 331 308 378 294 L381 299 C340 316 295 344 250 368 Z",
    bounds:[242,290,144,82],palette:["#72845C","#385147","#C8CD98"],
    direction:-26,flow:-11,startFrame:49,
    details:[line("M250 362 Q325 314 380 296","#D4D7A0",.92,203,.77),
      line("M287 341 Q338 313 371 301","#425A49",.55,229,.59)],
  },
  {
    id:"rose-right-stipule-upper",surface:"leaf",
    path:"M250 363 Q259 353 269 350 Q264 359 256 368 Z",
    bounds:[246,347,26,25],palette:sunlit,direction:-45,flow:-8,startFrame:54,
    details:[line("M254 364 Q262 355 268 352","#D1DAA0",.47,219,.67),
      line("M256 361 L260 357","#4B6448",.33,245,.54)],
  },
  {
    id:"rose-right-stipule-lower",surface:"leaf",
    path:"M250 363 Q258 373 269 378 Q262 369 254 359 Z",
    bounds:[246,356,26,25],palette:olive,direction:48,flow:8,startFrame:54,
    details:[line("M253 364 Q263 373 267 377","#D4D9A8",.48,219,.66),
      line("M258 369 L262 373","#3B5947",.32,245,.55)],
  },
] as const;

export const ROSE_PINNATE_ORGANS:readonly RoseFoliageOrgan[]=[
  support[0],...ROSE_LEAFLET_AXES.filter(a=>a.spray==="left").map(leaflet),
  support[1],support[2],support[3],
  ...ROSE_LEAFLET_AXES.filter(a=>a.spray==="right").map(leaflet),
  support[4],support[5],
] as const;

/** A future species sheet may replace these original study coordinates,
 * without deleting their authored serrations or original material detail. */
export function inspectRosePinnateOrgans():string[]{
  const issues:string[]=[];
  const ids=new Set<string>();
  if(ROSE_LEAFLET_AXES.length!==10)issues.push("Expected two sprays of five leaflets");
  for(const spray of ["left","right"]){
    const leaves=ROSE_LEAFLET_AXES.filter(a=>a.spray===spray);
    if(leaves.length!==5||leaves.filter(a=>a.id.endsWith("terminal")).length!==1)
      issues.push("Five-leaflet odd-pinnate arrangement missing: "+spray);
  }
  for(const axis of ROSE_LEAFLET_AXES){
    if(axis.teeth<9||axis.teeth>18||axis.halfWidth<=0||
      Math.hypot(axis.tip[0]-axis.root[0],axis.tip[1]-axis.root[1])<16)
      issues.push("Invalid ovate leaflet structure: "+axis.id);
  }
  for(const o of ROSE_PINNATE_ORGANS){
    if(ids.has(o.id))issues.push("Repeated foliage organ "+o.id);
    ids.add(o.id);
    if(!/^M/.test(o.path)||!/Z$/.test(o.path)||o.path.length>12000||
      /NaN|Infinity/.test(o.path))issues.push("Invalid organ SVG "+o.id);
    if(o.bounds.length!==4||o.bounds[2]<=0||o.bounds[3]<=0||
      !o.bounds.every(Number.isFinite))issues.push("Invalid bounds "+o.id);
    if(o.details.length<2)issues.push("Missing rooted leaf veins "+o.id);
  }
  if(ROSE_PINNATE_ORGANS.length!==16)
    issues.push("Expected ten leaflets + two rachises + four stipules");
  return issues;
}
