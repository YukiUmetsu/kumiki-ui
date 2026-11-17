import type {CrayonColor,CrayonElement} from "../../registry/video/materials/crayon-scene";
import {createFace,FACE_LANDMARKS,type FaceLandmark}
  from "../../registry/anatomy/anatomy-face";
import {renderMeshFrame} from "../../registry/anatomy/anatomy-view";
import {crayonF1RegisterAnat1Face} from "./crayon-artcraft-f1-anat1-malar";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";

/**
 * ArtCraft F1 V47 (!dev) — photographed, ANAT1 normal-weighted wax flow
 * across CONNECTED facial surfaces rather than disconnected solid patches.
 *
 * Genuine CC0 source 608x1082 f299, Christopher Campbell, CC0 1.0.
 * The tonal contrasts here were independently sampled on the original
 * photo versus same-head native V46 using 7x7 pixel RGB medians. Only
 * those small measured values and source-observed continuous anatomical
 * trajectories are shipped — no source image, raster texture or photos.
 *
 * The 3D model is ANAT1/MediaPipe-468-unmodified; mesh light at its
 * cheekbone/eye/nose/jaw vertices modulates the pressure of fine wax
 * rubs. Photo coordinates retain authority: the canonical 3D face
 * MUST NOT distort the person's source-specific identity.
 *
 * The entire prior V46 film, portrait, hair, cornea, brow, foliage and
 * all original source IDs remain an EXACT PREFIX. Five fine continuous
 * soft scumble groups are appended; no removal, node index shifts,
 * simplified geometry, flattened gradient, or generative bitmap shader.
 * Artistic hold: actual photo resemblance is unverified until Chromium
 * source/negative-control pixel review.
 */
type Point=readonly [number,number];
type Line=readonly [number,number,number,number,number,number,number,number];
type Contour=Extract<CrayonElement,{kind:"contour"}>;
type Region="malar-light"|"orbito-malar"|"lateral-cast"|"nasal-root"|"jaw-roll";
type Contact={
  id:Region;guide:Line;source:Point;parentId:string;color:CrayonColor;
  width:number;opacity:number;waxPressure:number;band:number;
  count:number;vertex:FaceLandmark;photo:readonly [number,number,number];
  nativeV46:readonly [number,number,number];
};
export const CRAYON_F1_V47_SOURCE_SHA=CRAYON_PORTRAIT_AUDIT.source.sha256;
/** Color witnesses on the exact original CC0 608x1082 photo and original
 * V46 native 1x PNG. The four-point trajectories follow observed
 * surface curvature, NOT invented oval cheek blush regions.
 */
const regions:readonly Contact[]=[
  {
    id:"malar-light",
    guide:[161,596,174,602,202,619,222,659],
    source:[193,622],parentId:"face-outline",
    color:"#f1d1b9",width:.71,opacity:.32,waxPressure:.31,
    band:23,count:82,vertex:"cheekbone.R",
    photo:[240,207,191],nativeV46:[224,187,168],
  },
  {
    id:"orbito-malar",
    guide:[191,581,227,582,252,602,298,633],
    source:[201,582],parentId:"face-outline",
    color:"#8d6660",width:.59,opacity:.19,waxPressure:.28,
    band:14,count:70,vertex:"palpebrale-inferius.R",
    photo:[189,150,136],nativeV46:[209,175,158],
  },
  {
    id:"lateral-cast",
    guide:[125,636,117,708,145,778,214,823],
    source:[133,702],parentId:"face-outline",
    color:"#6c4641",width:.97,opacity:.32,waxPressure:.47,
    band:24,count:115,vertex:"zygion.R",
    photo:[123,85,67],nativeV46:[203,166,149],
  },
  {
    id:"nasal-root",
    guide:[331,520,337,546,358,572,387,629],
    source:[333,533],parentId:"face-outline",
    color:"#77524e",width:.59,opacity:.27,waxPressure:.34,
    band:14,count:65,vertex:"sellion",
    photo:[124,95,90],nativeV46:[199,167,153],
  },
  {
    id:"jaw-roll",
    guide:[210,790,237,824,299,847,374,837],
    source:[261,830],parentId:"face-outline",
    color:"#825a50",width:.73,opacity:.23,waxPressure:.31,
    band:19,count:82,vertex:"menton",
    photo:[177,133,108],nativeV46:[197,163,148],
  },
] as const;
export const CRAYON_F1_V47_REGIONS=Object.freeze(regions.map(x=>x.id));
export const CRAYON_F1_V47_SOURCE_SAMPLES=Object.freeze(
  regions.map(x=>Object.freeze({
    id:x.id,at:x.source,photo:x.photo,nativeV46:x.nativeV46,
    originalCubic:x.guide,vertex:x.vertex,
  })),
);
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const round=(n:number)=>Number(n.toFixed(2));
const hash=(i:number,j:number)=>{const n=Math.sin(i*127.1+j*311.7)*43758.5453;return n-Math.floor(n)};
function point(c:Line,t:number):Point{
  const s=1-t;
  return [
    s*s*s*c[0]+3*s*s*t*c[2]+3*s*t*t*c[4]+t*t*t*c[6],
    s*s*s*c[1]+3*s*s*t*c[3]+3*s*t*t*c[5]+t*t*t*c[7],
  ];
}
function tangent(c:Line,t:number):Point{
  const s=1-t;
  return [
    3*s*s*(c[2]-c[0])+6*s*t*(c[4]-c[2])+3*t*t*(c[6]-c[4]),
    3*s*s*(c[3]-c[1])+6*s*t*(c[5]-c[3])+3*t*t*(c[7]-c[5]),
  ];
}
/** Detached, repetitive sketch marks fail realism. Every short wax
 * contact follows one continuous photographed cubic under its parent
 * face. Offset is along the source-surface normal to preserve topology.
 */
function formScumble(rail:Contact,meshLight:number):string{
  const count=rail.count;
  const strokes:string[]=[];
  const normalFactor=clamp(1.07-.21*meshLight,.84,1.07);
  for(let i=0;i<count;i++){
    const salt=CRAYON_F1_V47_REGIONS.indexOf(rail.id)+3;
    const t=clamp((i+.22+.55*hash(i,salt))/count,.02,.977);
    const dt=(.018+.061*hash(i,salt+7))*(.65+.32*hash(i,salt+11));
    const u=clamp(t+dt,0,.997);
    const a=point(rail.guide,t),b=point(rail.guide,u);
    const va=tangent(rail.guide,t),vb=tangent(rail.guide,u);
    const la=Math.hypot(...va)||1,lb=Math.hypot(...vb)||1;
    // Decreasing material pressure at the precise photographed field
    // edges creates fine broken pigment instead of an opaque sticker.
    const fade=.35+.65*Math.sin(Math.PI*t);
    const off=(hash(i,salt+23)-.5)*2*rail.band*fade*normalFactor;
    const da:[number,number]=[-va[1]/la*off,va[0]/la*off];
    const db:[number,number]=[-vb[1]/lb*off,vb[0]/lb*off];
    const x0=a[0]+da[0],y0=a[1]+da[1];
    const x1=b[0]+db[0],y1=b[1]+db[1];
    const g=clamp(.68+.2*hash(i,salt+31),.65,.89);
    const c1x=x0+va[0]*dt*g/3,c1y=y0+va[1]*dt*g/3;
    const c2x=x1-vb[0]*dt*g/3,c2y=y1-vb[1]*dt*g/3;
    const coords=[x0,y0,c1x,c1y,c2x,c2y,x1,y1];
    if(coords.some((v,j)=>!Number.isFinite(v)||
      (j%2===0&&(v<100||v>418))||
      (j%2===1&&(v<505||v>875))))
      throw new RangeError("Source-visible ANAT1 facial wax escaped the photo: "+rail.id);
    strokes.push("M"+round(x0)+" "+round(y0)+" C"+
      round(c1x)+" "+round(c1y)+" "+round(c2x)+" "+round(c2y)+" "+
      round(x1)+" "+round(y1));
  }
  return strokes.join(" ");
}
export const CRAYON_F1_V47_NEW_IDS=Object.freeze(
  regions.map(region=>"cc0-anat1-form-"+region.id),
);

/** Five physically connected, photographed and vertex-normal weighted
 * CRAYON1 mark families. Original V46 elements are byte-identical.
 * Colors and per-rail intensity are driven by actually observed CC0
 * source vs native differences — source brightness wins over mesh.
 */
export function crayonF1AddContinuousFaceWaxV47(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const seen=new Set<string>();
  for(const el of elements){
    if(seen.has(el.id)||new Set<string>(CRAYON_F1_V47_NEW_IDS).has(el.id))
      throw new RangeError("Duplicated/repeated original ANAT1 skin source");
    seen.add(el.id);
  }
  for(const id of ["face-outline","cheek-malar-bounce","malar-cheek-near",
    "cheek-malar-cast","nose-root","chin-plane",
    "iris-near","iris-far","hair-crown-surface",
    "cc0-hedge-dark-underpaint"]){
    const el=elements.find(x=>x.id===id);
    if(!el||el.kind!=="wax")
      throw new RangeError("Missing original ANAT1 source surface: "+id);
  }
  const brow=elements.find(x=>x.id==="source-brow-follicles-near");
  if(!brow||brow.kind!=="contour"||brow.parentId!=="face-outline")
    throw new RangeError("Missing original source-registered eyebrow follicles");
  if(CRAYON_F1_V47_SOURCE_SHA!==
     "f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2")
    throw new RangeError("Original photographed CC0 benchmark changed");
  const fit=crayonF1RegisterAnat1Face();
  const mesh=createFace({calibrate:false});
  const frame=renderMeshFrame(mesh.mesh,{yaw:fit.yaw,pitch:fit.pitch},
    {width:608,height:1082});
  const appended:Contour[]=regions.map(region=>{
    const light=frame.vertexLight[FACE_LANDMARKS[region.vertex]];
    if(!Number.isFinite(light)||light<0||light>1)
      throw new RangeError("Invalid ANAT1 vertex normal for "+region.id);
    const d=formScumble(region,light);
    if(d.length>=25000||(d.match(/M/g)??[]).length!==region.count)
      throw new RangeError("Non-continuous source wax flow for "+region.id);
    const photoL=region.photo.reduce((a,b)=>a+b,0)/3;
    const nativeL=region.nativeV46.reduce((a,b)=>a+b,0)/3;
    const sourceCorrection=clamp(Math.abs(photoL-nativeL)/80,.20,1);
    const sourceLight=photoL>nativeL;
    const gain=(.68+.27*(1-light))*(.75+.25*sourceCorrection);
    const baseOpacity=region.opacity*gain;
    const intensity=sourceLight?.77:1;
    return {
      kind:"contour",id:"cc0-anat1-form-"+region.id,
      d,color:region.color,width:region.width,
      opacity:round(clamp(baseOpacity*intensity,.08,.42)),
      waxContact:"dry-wax",waxPressure:round(clamp(region.waxPressure*gain,.2,1)),
      parentId:region.parentId,clipToParent:true,
      timing:{start:245,end:299},
    };
  });
  return [...elements,...appended];
}
