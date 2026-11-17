/**
 * CP-F1 × FLORA1 — original outer-rose colour and sculptural value envelopes.
 *
 * Botanically plausible outer petals are NOT solid dark graphic cut-outs.
 * Their raised lamina carries middle rose tones, turns cooler under nearby
 * petal contact, and returns light along distinct reflexed rims. All deposits
 * here are deterministic clipped dry-pencil contacts on *existing* source
 * shapes (no SVG gradients, new opaque stickers or reference-image pixels).
 *
 * Art observations: Karen Elaine Evans' original Pink Rose, Gary Greene's
 * coloured-pencil rose layers, and Ann Swan's botanical pencil work.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilTrace} from "../../registry/video/colored-pencil";

export type RoseOuterPetal="outer-left"|"outer-right";
type Point=readonly [number,number];
type Axis=readonly [Point,Point,Point,Point];
type Pigments=readonly [string,string,string];
type Triplet=readonly [number,number,number];

export interface RoseOuterValueEnvelope {
  readonly id:string;
  readonly petal:RoseOuterPetal;
  readonly role:"fold-occlusion"|"convex-velvet"|"edge-return";
  /** Real, independently authored *cubic* source-space lamina tangent. */
  readonly axis:Axis;
  readonly halfWidth:number;
  readonly contacts:number;
  readonly colors:Pigments;
  readonly nib:Triplet;
  readonly opacity:Triplet;
}
/** Three softly interleaved optical passes per form field; deliberately not
 * a generic bilateral mirror, radial pencil stamp or CSS linear gradient.
 */
export const ROSE_OUTER_FORM_ENVELOPES:readonly RoseOuterValueEnvelope[]=[
  {
    id:"left-infold",petal:"outer-left",role:"fold-occlusion",
    axis:[[194,146],[184,170],[201,212],[234,249]],
    halfWidth:17,contacts:146,
    colors:["#55223F","#782C4D","#AE5170"],
    nib:[.84,.72,.56],opacity:[.62,.53,.40],
  },
  {
    id:"left-round",petal:"outer-left",role:"convex-velvet",
    axis:[[162,150],[143,184],[171,225],[217,255]],
    halfWidth:28,contacts:171,
    colors:["#A84264","#CB7890","#EC9FAA"],
    nib:[1.12,.92,.69],opacity:[.57,.53,.45],
  },
  {
    id:"left-edge",petal:"outer-left",role:"edge-return",
    axis:[[139,174],[133,209],[174,246],[215,261]],
    halfWidth:17,contacts:136,
    colors:["#BE6B87","#E1A3B3","#F5C0C2"],
    nib:[.99,.78,.58],opacity:[.48,.47,.40],
  },
  {
    id:"right-infold",petal:"outer-right",role:"fold-occlusion",
    axis:[[305,154],[317,184],[298,220],[261,248]],
    halfWidth:17,contacts:151,
    colors:["#672640","#914361","#B9607B"],
    nib:[.88,.72,.54],opacity:[.57,.54,.43],
  },
  {
    id:"right-round",petal:"outer-right",role:"convex-velvet",
    axis:[[327,171],[354,199],[334,232],[285,254]],
    halfWidth:27,contacts:171,
    colors:["#AB4D69","#D78191","#EDA3AC"],
    nib:[1.09,.91,.71],opacity:[.54,.51,.43],
  },
  {
    id:"right-edge",petal:"outer-right",role:"edge-return",
    axis:[[357,189],[356,221],[317,251],[265,265]],
    halfWidth:17,contacts:137,
    colors:["#BF7588","#E7A8AE","#F8C9BE"],
    nib:[.94,.76,.57],opacity:[.49,.46,.39],
  },
] as const;

/** Author-controlled tonal atlas for *facing* outer petals only.
 * Both opaque reverses and all other rose organs retain their original
 * three colours and exact material-seed slots. No hue sampled from artwork.
 */
export const ROSE_OUTER_FORM_FACE_PALETTES:ReadOnly<Record<RoseOuterPetal,Pigments>>={
  "outer-left":["#BB5D76","#6C2A49","#F0A5AD"],
  "outer-right":["#C96B7D","#793251","#F1A6B2"],
};

const f=(v:number)=>v.toFixed(2);
function tangent(axis:Axis,t:number){
  const [a,b,c,d]=axis,u=1-t;
  const x=u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0];
  const y=u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1];
  const dx=3*u*u*(b[0]-a[0])+6*u*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]);
  const dy=3*u*u*(b[1]-a[1])+6*u*t*(c[1]-b[1])+3*t*t*(d[1]-c[1]);
  const magnitude=Math.hypot(dx,dy);
  if(magnitude<1e-6)throw new RangeError("Degenerate outer rose lamina tangent");
  return {x,y,dx:dx/magnitude,dy:dy/magnitude};
}
const pass=[
  {id:"cool",startFrame:177,durationFrames:55},
  {id:"middle",startFrame:218,durationFrames:58},
  {id:"dry-light",startFrame:264,durationFrames:48},
] as const;

/** 9 separately rendered, paper-masked pencil families per outer petal.
 * Each individual deposit is short, doubly stochastic in length/angle and
 * follows the *local* cubic tangent, not a whole-petal rotation. A tapered
 * envelope preserves paper/edge breathing space instead of sharp bands.
 */
export function roseOuterFormDeposits(petal:RoseOuterPetal,seed:number):PencilTrace[]{
  if(petal!=="outer-left"&&petal!=="outer-right")
    throw new RangeError("Unknown rose outer petal");
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483000)
    throw new RangeError("Invalid outer rose pencil seed");
  const result:PencilTrace[]=[];
  for(const [bandIndex,band] of ROSE_OUTER_FORM_ENVELOPES.entries()){
    if(band.petal!==petal)continue;
    for(const [layer,step] of pass.entries()){
      const marks:string[]=[];
      for(let i=0;i<band.contacts;i++){
        const key=bandIndex*13111+layer*433+i;
        const t=Math.max(.023,Math.min(.977,
          (i+.13+.72*pencilHash(seed,key,31))/band.contacts));
        const a=tangent(band.axis,t);
        const spread=(.21+.79*Math.pow(Math.sin(Math.PI*t),.71))*
          band.halfWidth;
        // Distribution is pencil-tooth sparse at the outer boundary and
        // heavier in the warm convex belly, yet varies smoothly with depth.
        const offset=(pencilHash(seed,key,37)*2-1)*spread;
        const nx=-a.dy,ny=a.dx;
        const x=a.x+nx*offset,y=a.y+ny*offset;
        const turn=(pencilHash(seed,key,41)-.5)*.46;
        const cs=Math.cos(turn),sn=Math.sin(turn);
        const dx=a.dx*cs-a.dy*sn,dy=a.dx*sn+a.dy*cs;
        const length=(2.8+4.6*pencilHash(seed,key,47))*
          (layer===2?.75:layer===0?.87:1);
        const bow=(pencilHash(seed,key,53)-.5)*1.8;
        marks.push("M"+f(x-dx*length*.49)+" "+f(y-dy*length*.49)+
          " Q"+f(x+nx*bow)+" "+f(y+ny*bow)+
          " "+f(x+dx*length*.51+nx*bow*.21)+" "+
          f(y+dy*length*.51+ny*bow*.21));
      }
      const path=marks.join(" ");
      if(path.length>12000)
        throw new RangeError("Outer rose dry-pencil path exceeds CP-F1 budget");
      result.push({
        id:"ro-"+band.id+"-"+step.id,path,
        color:band.colors[layer],width:band.nib[layer],
        opacity:band.opacity[layer],
        startFrame:step.startFrame,durationFrames:step.durationFrames,
      });
    }
  }
  return result;
}

/** Source-envelope audit: six distinct lamina flows, all in rose-local
 * coordinates with three optically separate non-raster deposits apiece. */
export function inspectRoseOuterForm():string[]{
  const errors:string[]=[];
  const ids=new Set<string>();
  if(ROSE_OUTER_FORM_ENVELOPES.length!==6)
    errors.push("Expected six source-native outer rose form fields");
  for(const b of ROSE_OUTER_FORM_ENVELOPES){
    if(ids.has(b.id))errors.push("Duplicate outer form field "+b.id);
    ids.add(b.id);
    const left=b.petal==="outer-left";
    if(!["outer-left","outer-right"].includes(b.petal)||
      !["fold-occlusion","convex-velvet","edge-return"].includes(b.role))
      errors.push("Unknown rose form field role "+b.id);
    const xmin=left?123:230,xmax=left?265:377;
    if(b.axis.length!==4||b.axis.some(p=>p.length!==2||
      !Number.isFinite(p[0])||!Number.isFinite(p[1])||
      p[0]<xmin||p[0]>xmax||p[1]<120||p[1]>282))
      errors.push("Outer lamina field outside source "+b.id);
    if(!Number.isFinite(b.halfWidth)||b.halfWidth<6||b.halfWidth>33||
      !Number.isSafeInteger(b.contacts)||b.contacts<90||b.contacts>185)
      errors.push("Outer lamina unsafe density "+b.id);
    if(b.colors.some(col=>!/^#[0-9a-f]{6}$/i.test(col))||
      b.nib.some(n=>!Number.isFinite(n)||n<.25||n>1.5)||
      b.opacity.some(v=>!Number.isFinite(v)||v<.15||v>.75))
      errors.push("Unphysical outer lamina color or pressure "+b.id);
  }
  for(const petal of ["outer-left","outer-right"] as const){
    if(ROSE_OUTER_FORM_ENVELOPES.filter(b=>b.petal===petal).length!==3)
      errors.push("Missing independent form fields for "+petal);
    if(ROSE_OUTER_FORM_FACE_PALETTES[petal].some(
      col=>!/^#[0-9a-f]{6}$/i.test(col)))
      errors.push("Invalid rose outer facing pigment palette "+petal);
  }
  return errors;
}
