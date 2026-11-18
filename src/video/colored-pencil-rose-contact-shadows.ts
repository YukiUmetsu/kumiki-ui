/**
 * CP-F1 / FLORA1: original rose contact-shadow atlas (opt-in, ART HOLD).
 *
 * The center is not concentric ink loops: several physically stacked petal
 * laminae make separate, concave, *asymmetric* contact valleys. The paint is
 * translucent dry, source-local colored-pencil fiber on the LOWER, already
 * existing opaque material surface. The UPPER real source petal occludes it
 * in the renderer's genuine z-order. No detached shadow SVG or dark sticker.
 *
 * Morphology reference (technique, not extracted geometry):
 * - Wikimedia CC0 "Rose Blossom Closeup" by Leyth (pink, oblique bloom).
 * - Wikimedia CC0 "Silky red petals in close-up" by chuttersnap (macro).
 * - UPOV Rosa TG/11/8, independent petal reflexing.
 * The photograph species/cultivar and viewing angle are NOT registered to
 * this entirely original stylized rose. Do not advertise a photo match.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilTrace} from "../../registry/video/colored-pencil";
import {ROSE_CENTER_KNOT_SURFACES}
  from "./colored-pencil-rose-center-knot";
import type {RoseCenterKnotId}
  from "./colored-pencil-rose-center-knot";

type Point=readonly [number,number];
type Bezier=readonly [Point,Point,Point,Point];
type Triplet=readonly [string,string,string];

export interface RoseContactShadow {
  readonly id:string;
  /** The lower opaque source receives pencil below the true upper overlap. */
  readonly lower:RoseCenterKnotId;
  /** Real separate upper petal. No duplicating source region / opacity matte. */
  readonly upper:RoseCenterKnotId;
  /** Curve is authored just *outside* the upper cuticle, on lower lamina. */
  readonly axis:Bezier;
  readonly halfWidth:number;
  readonly contacts:number;
  /** Three genuine pigments, *not* a blur, multiply filter or shadow overlay. */
  readonly pigments:Triplet;
  readonly nibs:readonly [number,number,number];
  readonly opacity:readonly [number,number,number];
}

/** Five *different* physically related overlaps; each lower surface is already
 * a real region in #605, and upper regions are drawn above it in that source
 * painter-order. These are not clones, rotations or synthetic contour loops.
 */
export const ROSE_CONTACT_SHADOWS:readonly RoseContactShadow[]=[
  {
    id:"collar-under-cup",lower:"inner-fold",upper:"rose-whorl-recess",
    axis:[[220,167],[237,174],[255,177],[270,174]],
    halfWidth:4.2,contacts:78,
    pigments:["#52243A","#83435B","#BB7180"],
    nibs:[.38,.33,.26],opacity:[.27,.23,.18],
  },
  {
    id:"cup-under-left",lower:"rose-whorl-recess",upper:"rose-whorl-left",
    axis:[[255,166],[261,169],[264,174],[266,179]],
    halfWidth:3,contacts:58,
    pigments:["#56263F","#823D55","#B46A7D"],
    nibs:[.36,.31,.25],opacity:[.25,.22,.18],
  },
  {
    id:"cup-under-right",lower:"rose-whorl-recess",upper:"rose-whorl-right",
    axis:[[260,153],[265,158],[270,164],[276,170]],
    halfWidth:3.2,contacts:62,
    pigments:["#522339","#8B4560","#BC7284"],
    nibs:[.36,.31,.25],opacity:[.26,.22,.18],
  },
  {
    id:"right-under-scroll",lower:"rose-whorl-right",upper:"rose-whorl-scroll",
    axis:[[264,158],[270,160],[277,164],[284,164]],
    halfWidth:3,contacts:56,
    pigments:["#622842","#944B64","#BC7887"],
    nibs:[.34,.29,.24],opacity:[.24,.20,.17],
  },
  {
    id:"heart-under-scroll",lower:"heart",upper:"rose-whorl-scroll",
    axis:[[260,181],[266,181],[272,179],[278,177]],
    halfWidth:2.5,contacts:49,
    pigments:["#54233C","#8A405B","#BB7182"],
    nibs:[.33,.29,.23],opacity:[.25,.20,.16],
  },
] as const;
const PASS=[
  {id:"buried-crease",startFrame:176,durationFrames:58},
  {id:"warm-penumbra",startFrame:220,durationFrames:54},
  {id:"edge-return",startFrame:263,durationFrames:48},
] as const;
const fmt=(n:number)=>n.toFixed(2);
function onCurve(points:Bezier,t:number){
  const [a,b,c,d]=points,u=1-t;
  const x=u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0];
  const y=u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1];
  const dx=3*u*u*(b[0]-a[0])+6*u*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]);
  const dy=3*u*u*(b[1]-a[1])+6*u*t*(c[1]-b[1])+3*t*t*(d[1]-c[1]);
  const length=Math.hypot(dx,dy);
  if(length<1e-6)throw new RangeError("Degenerate rose occlusion tangent");
  return {x,y,dx:dx/length,dy:dy/length};
}
function contact(p:{x:number,y:number,dx:number,dy:number},
  spread:number,turn:number,length:number,bend:number){
  const nx=-p.dy,ny=p.dx;
  const x=p.x+nx*spread,y=p.y+ny*spread;
  const dx=p.dx*Math.cos(turn)-p.dy*Math.sin(turn);
  const dy=p.dx*Math.sin(turn)+p.dy*Math.cos(turn);
  return "M"+fmt(x-dx*.44*length)+" "+fmt(y-dy*.44*length)+
    " Q"+fmt(x+nx*bend)+" "+fmt(y+ny*bend)+
    " "+fmt(x+dx*.56*length+nx*bend*.16)+" "+
      fmt(y+dy*.56*length+ny*bend*.16);
}

/** Each under-surface receives 3 separately timed, dry, paper-contact passes
 * per actual shared shadow valley; the caller appends to existing interior
 * highlights. No path, palette, material id, hash, or old graphite is mutated.
 */
export function roseContactShadowDetails(lower:RoseCenterKnotId,seed:number):PencilTrace[]{
  if(!ROSE_CENTER_KNOT_SURFACES.some(x=>x.id===lower))
    throw new RangeError("Unknown physical rose lower contact surface");
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483000)
    throw new RangeError("Invalid paper-locked rose contact seed");
  const traces:PencilTrace[]=[];
  for(const [n,field] of ROSE_CONTACT_SHADOWS.entries()){
    if(field.lower!==lower)continue;
    for(const [pass,period] of PASS.entries()){
      const parts:string[]=[];
      for(let i=0;i<field.contacts;i++){
        const key=n*3007+pass*503+i;
        const t=Math.max(.025,Math.min(.975,
          (i+.18+.68*pencilHash(seed,key,7))/field.contacts));
        const point=onCurve(field.axis,t);
        const envelope=.23+.77*Math.pow(Math.sin(Math.PI*t),.75);
        const spread=(pencilHash(seed,key,17)*2-1)*
          field.halfWidth*envelope*(pass===2?.66:1);
        const turn=(pencilHash(seed,key,23)-.5)*.72;
        const length=(1.15+2.2*pencilHash(seed,key,31))*
          (pass===2?.68:pass===0?.86:1);
        const bend=(pencilHash(seed,key,47)-.5)*.62;
        parts.push(contact(point,spread,turn,length,bend));
      }
      const path=parts.join(" ");
      if(path.length>12000)
        throw new RangeError("Contact shadow exceeded per-pass source budget");
      traces.push({id:"rco-"+field.id+"-"+period.id,
        path,color:field.pigments[pass],width:field.nibs[pass],
        opacity:field.opacity[pass],startFrame:period.startFrame,
        durationFrames:period.durationFrames});
    }
  }
  return traces;
}

/** Cheap source-topology, chronological material and rights guards. The
 * Playwright proof independently checks real native SVG fill and exposure,
 * z-order, both aspect ratios and macro visibility.
 */
export function inspectRoseContactShadows():string[]{
  const issues:string[]=[];
  if(ROSE_CONTACT_SHADOWS.length!==5)
    issues.push("Five separate true contact valleys required");
  const names=new Set<string>();
  const sourceOrder=ROSE_CENTER_KNOT_SURFACES.map(x=>x.id);
  for(const field of ROSE_CONTACT_SHADOWS){
    if(names.has(field.id))issues.push("Duplicate contact valley "+field.id);
    names.add(field.id);
    const under=sourceOrder.indexOf(field.lower);
    const over=sourceOrder.indexOf(field.upper);
    if(under<0||over<=under)
      issues.push("Contact shadow violates physical occlusion order: "+field.id);
    if(field.axis.length!==4||
      field.axis.some(p=>p.length!==2||p.some(n=>
        !Number.isFinite(n)||n<125||n>325))||
      !Number.isFinite(field.halfWidth)||field.halfWidth<2||
      field.halfWidth>5||!Number.isSafeInteger(field.contacts)||
      field.contacts<40||field.contacts>90)
      issues.push("Invalid local contact curve "+field.id);
    if(field.pigments.length!==3||
      field.pigments.some(x=>!/^#[0-9A-Fa-f]{6}$/.test(x))||
      field.nibs.length!==3||field.nibs.some(x=>x<.2||x>.6||!Number.isFinite(x))||
      field.opacity.length!==3||field.opacity.some(x=>x<=0||x>.5||!Number.isFinite(x)))
      issues.push("Invalid chromatic penumbra material "+field.id);
  }
  const ids=ROSE_CONTACT_SHADOWS.map(x=>x.lower);
  if(!["inner-fold","rose-whorl-recess","rose-whorl-right","heart"].every(x=>ids.includes(x as RoseCenterKnotId)))
    issues.push("Missing physically illuminated lower central petal");
  return issues;
}
