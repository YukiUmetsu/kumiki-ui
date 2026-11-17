/**
 * CP-F1 × FLORA1 — local diffuse DRY-pigment value across six source-authored
 * central rose petals (#605). Deliberately separate from contour geometry:
 * contiguous surfaces must bend into changing rose/magenta value rather than
 * looking like hard, flat colored-cardstock cutouts.
 *
 * All twelve individually authored axes use the original flower's coordinate
 * system; pigment is deposited as discontinuous, curved short fibre contacts,
 * not digital gradients/blur, cloned petals or a full-frame overlay.
 * The renderer clips the contacts to their exact owning opaque petal path.
 *
 * Source technique: CPSA's gold-leaf rose walkthrough (soft inner-petal
 * midtone transitions), Evans' original coloured-pencil Pink Rose, botanical
 * rose anatomy. No third-party reference pixels, paths, scans or sampled
 * photograph values appear here. ART HOLD; the imagined rose is unmeasured.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilTrace} from "../../registry/video/colored-pencil";
import type {RoseCenterKnotId} from "./colored-pencil-rose-center-knot";

type Point=readonly [number,number];
type Curve=readonly [Point,Point,Point,Point];
type Pigments=readonly [string,string,string];
type Triplet=readonly [number,number,number];
export type CenterValueRole="occlusion"|"diffuse-return";

export interface RoseCenterValueField {
  readonly id:string;
  readonly petal:RoseCenterKnotId;
  readonly role:CenterValueRole;
  readonly axis:Curve;
  /** The band is a volume *within* the real petal, not a standalone blob. */
  readonly halfWidth:number;
  readonly contacts:number;
  readonly pigment:Pigments;
  readonly nibs:Triplet;
  readonly opacity:Triplet;
}

/** 12 separately studied axes: the return light in every pair bends
 * differently from the hinge shadow, and neither is a transformed copy of
 * another petal. Chromatic shade/paper-tooth remain independent.
 */
export const ROSE_CENTER_VALUE_FIELDS:readonly RoseCenterValueField[]=[
  {
    id:"collar-recess",petal:"inner-fold",role:"occlusion",
    axis:[[214,158],[233,145],[267,146],[293,160]],
    halfWidth:6.4,contacts:76,
    pigment:["#59233D","#82415C","#AD627A"],
    nibs:[.46,.41,.30],opacity:[.30,.29,.24],
  },
  {
    id:"collar-bounce",petal:"inner-fold",role:"diffuse-return",
    axis:[[223,166],[241,177],[266,178],[287,167]],
    halfWidth:6,contacts:72,
    pigment:["#A65F79","#CE8192","#EBA2A8"],
    nibs:[.48,.37,.28],opacity:[.31,.28,.25],
  },
  {
    id:"pocket-contact",petal:"rose-whorl-recess",role:"occlusion",
    axis:[[225,158],[237,145],[258,145],[285,155]],
    halfWidth:5,contacts:66,
    pigment:["#431C36","#72364F","#A85E70"],
    nibs:[.42,.35,.27],opacity:[.35,.30,.22],
  },
  {
    id:"pocket-return",petal:"rose-whorl-recess",role:"diffuse-return",
    axis:[[229,163],[241,172],[258,171],[279,163]],
    halfWidth:5.8,contacts:58,
    pigment:["#8F4A65","#C27B89","#DA99A0"],
    nibs:[.48,.39,.28],opacity:[.32,.29,.23],
  },
  {
    id:"left-root",petal:"rose-whorl-left",role:"occlusion",
    axis:[[226,150],[222,158],[230,174],[240,179]],
    halfWidth:3.9,contacts:53,
    pigment:["#5B2945","#8A435D","#BC6E82"],
    nibs:[.41,.35,.27],opacity:[.31,.29,.23],
  },
  {
    id:"left-face",petal:"rose-whorl-left",role:"diffuse-return",
    axis:[[231,147],[235,146],[237,150],[236,162]],
    halfWidth:3.7,contacts:45,
    pigment:["#AE5C77","#D5899B","#EDB0B4"],
    nibs:[.38,.32,.25],opacity:[.30,.28,.22],
  },
  {
    id:"right-root",petal:"rose-whorl-right",role:"occlusion",
    axis:[[254,147],[266,139],[280,145],[289,158]],
    halfWidth:4.3,contacts:57,
    pigment:["#59233D","#8F455F","#BD7082"],
    nibs:[.42,.35,.27],opacity:[.32,.29,.23],
  },
  {
    id:"right-face",petal:"rose-whorl-right",role:"diffuse-return",
    axis:[[257,154],[267,166],[280,169],[285,161]],
    halfWidth:4.7,contacts:54,
    pigment:["#AB5471","#D18B99","#EBADB0"],
    nibs:[.45,.35,.27],opacity:[.31,.29,.24],
  },
  {
    id:"heart-seam",petal:"heart",role:"occlusion",
    axis:[[242,156],[248,152],[258,155],[260,166]],
    halfWidth:3,contacts:43,
    pigment:["#55223D","#883B59","#B9667B"],
    nibs:[.37,.32,.25],opacity:[.33,.28,.23],
  },
  {
    id:"heart-round",petal:"heart",role:"diffuse-return",
    axis:[[241,163],[246,166],[252,174],[259,172]],
    halfWidth:3.2,contacts:42,
    pigment:["#A85273","#CE8597","#E5A4AC"],
    nibs:[.37,.33,.24],opacity:[.30,.27,.23],
  },
  {
    id:"scroll-recess",petal:"rose-whorl-scroll",role:"occlusion",
    axis:[[236,169],[239,157],[249,153],[262,160]],
    halfWidth:4.1,contacts:52,
    pigment:["#572540","#914361","#BF7389"],
    nibs:[.42,.34,.27],opacity:[.32,.29,.24],
  },
  {
    id:"scroll-bounce",petal:"rose-whorl-scroll",role:"diffuse-return",
    axis:[[242,176],[253,182],[264,179],[268,170]],
    halfWidth:4.5,contacts:56,
    pigment:["#AC5674","#DA8B9A","#EDADB3"],
    nibs:[.43,.34,.27],opacity:[.31,.29,.22],
  },
] as const;

const PASS=[
  {name:"shade",startFrame:173,durationFrames:60},
  {name:"soft-mid",startFrame:216,durationFrames:63},
  {name:"warm-light",startFrame:257,durationFrames:50},
] as const;

function onBezier(axis:Curve,t:number){
  const [p0,p1,p2,p3]=axis,u=1-t;
  const x=u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0];
  const y=u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1];
  const dx=3*u*u*(p1[0]-p0[0])+6*u*t*(p2[0]-p1[0])+3*t*t*(p3[0]-p2[0]);
  const dy=3*u*u*(p1[1]-p0[1])+6*u*t*(p2[1]-p1[1])+3*t*t*(p3[1]-p2[1]);
  const len=Math.hypot(dx,dy);
  if(len<=1e-6)throw new RangeError("Degenerate source-local center petal tangent");
  return {x,y,dx:dx/len,dy:dy/len};
}
const fmt=(n:number)=>n.toFixed(2);
function pencilContact(x:number,y:number,dx:number,dy:number,len:number,bend:number){
  const nx=-dy,ny=dx;
  return "M"+fmt(x-dx*len*.4)+" "+fmt(y-dy*len*.4)+
    " Q"+fmt(x+nx*bend)+" "+fmt(y+ny*bend)+
    " "+fmt(x+dx*len*.6+nx*bend*.2)+" "+fmt(y+dy*len*.6+ny*bend*.2);
}

/** Render 6 short, independent CP-F1 native dry-pencil trace groups, opt-in.
 * The existing silhouette, previously authored details, pigment and paper
 * persist underneath; all generated contacts are source silhouette clipped.
 */
export function roseCenterValueDetails(petal:RoseCenterKnotId,seed:number):PencilTrace[]{
  if(!ROSE_CENTER_VALUE_FIELDS.some(f=>f.petal===petal))
    throw new RangeError("Unknown center rose value surface");
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483000)
    throw new RangeError("Invalid rose center value seed");
  const result:PencilTrace[]=[];
  for(const [index,field] of ROSE_CENTER_VALUE_FIELDS.entries()){
    if(field.petal!==petal)continue;
    for(const [pass,p] of PASS.entries()){
      const lines:string[]=[];
      for(let i=0;i<field.contacts;i++){
        const key=index*1049+pass*179+i;
        // Scatter only along the individual authored petal's changing value
        // trajectory. Avoid repeated straight radial scratches and barcodes.
        const t=Math.max(.035,Math.min(.965,
          (i+.18+.64*pencilHash(seed,key,21))/field.contacts));
        const tangent=onBezier(field.axis,t);
        const envelope=.25+.75*Math.pow(Math.sin(Math.PI*t),.72);
        const radial=(2*pencilHash(seed,key,29)-1)*field.halfWidth*envelope;
        const nx=-tangent.dy,ny=tangent.dx;
        const px=tangent.x+radial*nx,py=tangent.y+radial*ny;
        const turn=(pencilHash(seed,key,31)-.5)*.86;
        const dx=tangent.dx*Math.cos(turn)-tangent.dy*Math.sin(turn);
        const dy=tangent.dx*Math.sin(turn)+tangent.dy*Math.cos(turn);
        const length=(1.1+2.35*pencilHash(seed,key,37))*
          (pass===2?.65:pass===0?.82:1);
        const bend=(pencilHash(seed,key,41)-.5)*.55;
        lines.push(pencilContact(px,py,dx,dy,length,bend));
      }
      const path=lines.join(" ");
      if(path.length>12000)
        throw new RangeError("Rose center pencil source path budget exceeded");
      result.push({id:"rcv-"+field.id+"-"+p.name,
        path,color:field.pigment[pass],width:field.nibs[pass],
        opacity:field.opacity[pass],
        startFrame:p.startFrame,durationFrames:p.durationFrames});
    }
  }
  return result;
}

export function inspectRoseCenterValueFields():string[]{
  const problems:string[]=[];
  const seen=new Set<string>();
  if(ROSE_CENTER_VALUE_FIELDS.length!==12)
    problems.push("Need 12 unique source center value fields");
  const petalIds:readonly RoseCenterKnotId[]=[
    "inner-fold","rose-whorl-recess","rose-whorl-left",
    "rose-whorl-right","heart","rose-whorl-scroll"];
  for(const field of ROSE_CENTER_VALUE_FIELDS){
    if(seen.has(field.id))problems.push("Duplicate source center band "+field.id);
    seen.add(field.id);
    if(!petalIds.includes(field.petal)||
      !["occlusion","diffuse-return"].includes(field.role))
      problems.push("Unknown center petal material "+field.id);
    if(field.axis.length!==4||field.axis.some(p=>p.length!==2||
      p.some(v=>!Number.isFinite(v)||v<125||v>325)))
      problems.push("Invalid source-coordinate value path "+field.id);
    if(!Number.isFinite(field.halfWidth)||field.halfWidth<2.5||
      field.halfWidth>8||!Number.isSafeInteger(field.contacts)||
      field.contacts<40||field.contacts>90)
      problems.push("Unsafe dry deposit amount "+field.id);
    if(field.pigment.length!==3||
      field.pigment.some(p=>!/^#[\da-f]{6}$/i.test(p))||
      field.nibs.length!==3||
      field.nibs.some(n=>!Number.isFinite(n)||n<.2||n>.6)||
      field.opacity.length!==3||
      field.opacity.some(n=>!Number.isFinite(n)||n<=0||n>.4))
      problems.push("Invalid optical pencil pigment "+field.id);
  }
  for(const petal of petalIds){
    const fields=ROSE_CENTER_VALUE_FIELDS.filter(f=>f.petal===petal);
    if(fields.length!==2||fields[0]?.role!=="occlusion"||
      fields[1]?.role!=="diffuse-return")
      problems.push("Expected separate shadow/return on "+petal);
  }
  return problems;
}
