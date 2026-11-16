import type {CrayonElement} from "../../registry/video/materials/crayon-scene";
import {createFace,FACE_LANDMARKS,type FaceLandmark} from "../../registry/anatomy/anatomy-face";
import {cameraBasis,renderMeshFrame} from "../../registry/anatomy/anatomy-view";
import {CRAYON_PORTRAIT_AUDIT} from "./crayon-artcraft-portrait-audit";

/**
 * ArtCraft F1 V31: ANAT1 camera/landmark-constrained crayon study.
 *
 * ANAT1 gives us *3D anatomy* (canonical MediaPipe face mesh, camera-facing
 * normals, light and named landmarks). The photograph, not a population
 * average, gives the person's *identity and visible source coordinates*.
 * We fit only yaw/pitch/2D similarity against the **frozen source**. We
 * deliberately do not treat the face mask as a full head or hairline,
 * infer ethnicity, or pretend a 3D fit proves likeness.
 *
 * Reference: Christopher Campbell CC0, 608×1082 source-browser crop
 * sha256 f8d28cbede8c8c14f9902a328b6e979e353fd9ebe6efb454bda3152586b929c2.
 * F1 V30 independent native source SSIM ~0.362: ARTISTIC REJECT.
 * This is one reversible ANAT1-derived wax paint region. No overlays,
 * model triangles, reference pixels or raster textures are shipped.
 */
type SourceKey=keyof typeof CRAYON_PORTRAIT_AUDIT.sourcePoints;
type XY=readonly [number,number];
type Projection={x:number;y:number};
type Pair={face:FaceLandmark;source:SourceKey;weight:number};
const pairs:readonly Pair[]=[
  {face:"exocanthion.R",source:"eye_near_outer",weight:1.6},
  {face:"endocanthion.R",source:"eye_near_inner",weight:1.6},
  {face:"endocanthion.L",source:"eye_far_inner",weight:1.4},
  {face:"exocanthion.L",source:"eye_far_outer",weight:1.4},
  {face:"sellion",source:"nose_root",weight:1},
  {face:"pronasale",source:"nose_tip",weight:1.4},
  {face:"menton",source:"chin",weight:1.1},
  {face:"cheilion.R",source:"mouth_left",weight:.7},
  {face:"cheilion.L",source:"mouth_right",weight:.4},
  {face:"labiale-superius",source:"upper_lip",weight:.7},
  {face:"labiale-inferius",source:"lower_lip",weight:.7},
  {face:"cheekbone.R",source:"cheek_near",weight:.8},
  {face:"brow-mid.R",source:"brow_near_peak",weight:.3},
] as const;

/** Exclude source face_top/hairline_center: the ANAT1 face mask ends
 * at the upper forehead, and has no actual trichion/hairstyle. */
export const CRAYON_F1_ANAT1_SOURCE_ANCHORS=Object.freeze(
  pairs.map(p=>p.source),
);
const dot=(p:readonly number[],q:readonly number[])=>
  p[0]*q[0]+p[1]*q[1]+p[2]*q[2];
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const round=(v:number)=>Math.round(v*100)/100;
const vector2=(p:readonly number[],yaw:number,pitch:number):Projection=>{
  const basis=cameraBasis({yaw,pitch},[0,0,0]);
  return {x:dot(p,basis.right),y:-dot(p,basis.up)};
};
type Fit={
  yaw:number;pitch:number;roll:number;scale:number;rmse:number;
  a:number;b:number;tx:number;ty:number;
  sourceError:Readonly<Record<SourceKey,number>>;
};
const src=CRAYON_PORTRAIT_AUDIT.sourcePoints;

/** Weighted Procrustes: one **uniform** scale, rotation and translation.
 * Never use unconstrained per-feature warps to manufacture a good fit. */
function fit(
  face:ReturnType<typeof createFace>,yaw:number,pitch:number,
):Fit|null{
  const points=pairs.map(p=>({
    p:vector2(face.vertices[FACE_LANDMARKS[p.face]],yaw,pitch),
    target:src[p.source] as XY,w:p.weight,name:p.source,
  }));
  let sw=0,px=0,py,qx=0,qy=0;
  for(const v of points){sw+=v.w;px+=v.w*v.p.x;py+=v.w*v.p.y;
    qx+=v.w*v.target[0];qy+=v.w*v.target[1];}
  px/=sw;py/=sw;qx/=sw;qy/=sw;
  let sumA=0,sumB=0,den=0;
  for(const v of points){
    const x=v.p.x-px,y=v.p.y-py,xx=v.target[0]-qx,yy=v.target[1]-qy;
    sumA+=v.w*(x*xx+y*yy);
    sumB+=v.w*(x*yy-y*xx);
    den+=v.w*(x*x+y*y);
  }
  if(!Number.isFinite(den)||den<=0)return null;
  const a=sumA/den,b=sumB/den;
  const scale=Math.hypot(a,b),roll=Math.atan2(b,a)*180/Math.PI;
  if(!Number.isFinite(scale)||scale<1||scale>6||Math.abs(roll)>18)return null;
  const tx=qx-a*px+b*py,ty=qy-b*px-a*py;
  const sourceError={} as Record<SourceKey,number>;
  let squared=0;
  for(const v of points){
    const xx=a*v.p.x-b*v.p.y+tx,yy=b*v.p.x+a*v.p.y+ty;
    const error=Math.hypot(xx-v.target[0],yy-v.target[1]);
    sourceError[v.name]=round(error);squared+=v.w*error*error;
  }
  return {yaw,pitch,roll:round(roll),scale:round(scale),
    rmse:round(Math.sqrt(squared/sw)),a,b,tx,ty,sourceError};
}

export interface CrayonF1Anat1Registration {
  readonly yaw:number;readonly pitch:number;readonly roll:number;
  readonly scale:number;readonly rmse:number;
  readonly sourceError:Readonly<Record<SourceKey,number>>;
  /** Source-space predictions from 3D geometry (NOT observed pixels). */
  readonly projected:Readonly<Record<FaceLandmark,XY>>;
  /** Surface lighting from ANAT1 mesh normals; not photographic luminance. */
  readonly nearCheekNormalLight:number;
  readonly farCheekNormalLight:number;
  readonly model:"ANAT1/MediaPipe-468-unmodified";
  readonly source:"Campbell-CC0-608x1082";
  readonly artisticApproval:false;
}

let cached:CrayonF1Anat1Registration|undefined;
/** 23×18 ANAT1 camera hypotheses. No arbitrary ethnicity or identity
 * fitting; the only inputs are the frozen source coordinates and the
 * published standalone 468-vertex canonical face. O(468+13×414).
 */
export function crayonF1RegisterAnat1Face():CrayonF1Anat1Registration{
  if(cached)return cached;
  const face=createFace({calibrate:false});
  let best:Fit|null=null;
  for(let yaw=-50;yaw<=-6;yaw+=2){
    for(let pitch=-12;pitch<=22;pitch+=2){
      const candidate=fit(face,yaw,pitch);
      if(candidate&&(!best||candidate.rmse<best.rmse))
        best=candidate;
    }
  }
  if(!best||best.rmse>40)
    throw new RangeError("ANAT1 3D face cannot be registered to the photographed identity");
  const frame=renderMeshFrame(face.mesh,{yaw:best.yaw,pitch:best.pitch},
    {width:608,height:1082});
  const projected={} as Record<FaceLandmark,XY>;
  for(const [name,index] of Object.entries(FACE_LANDMARKS) as
      [FaceLandmark,number][]){
    const p=vector2(face.vertices[index],best.yaw,best.pitch);
    projected[name]=[round(best.a*p.x-best.b*p.y+best.tx),
      round(best.b*p.x+best.a*p.y+best.ty)];
  }
  cached=Object.freeze({
    yaw:best.yaw,pitch:best.pitch,roll:best.roll,scale:best.scale,
    rmse:best.rmse,sourceError:Object.freeze(best.sourceError),
    projected:Object.freeze(projected),
    nearCheekNormalLight:round(frame.vertexLight[FACE_LANDMARKS["cheekbone.R"]]),
    farCheekNormalLight:round(frame.vertexLight[FACE_LANDMARKS["cheekbone.L"]]),
    model:"ANAT1/MediaPipe-468-unmodified",
    source:"Campbell-CC0-608x1082",
    artisticApproval:false,
  } as const);
  return cached;
}

/** Source-observed malar crest is the authority, even though the 3D
 * generic mesh misses it by ~30 px. The model gives tangent direction;
 * the blend keeps observed identity and avoids overfitting pixel noise.
 */
function malarWaxPath(reg:CrayonF1Anat1Registration){
  const anatomical=reg.projected["cheekbone.R"];
  const source=src.cheek_near;
  const highX=source[0]*.65+anatomical[0]*.35;
  const highY=source[1]*.65+anatomical[1]*.35;
  const zyg=reg.projected["zygion.R"];
  const eye=reg.projected["palpebrale-inferius.R"];
  const startX=clamp(zyg[0]+47,125,162);
  const startY=clamp(eye[1]+23,568,605);
  const crestX=clamp(highX,194,232);
  const crestY=clamp(highY,632,679);
  const endX=clamp(crestX-65,128,166);
  const endY=clamp(crestY-16,608,650);
  const point=(...a:number[])=>a.map(round).join(" ");
  // One continuous convex source-lit cheek from the orbital margin to
  // the zygomatic turn. 3D anchors determine the actual geometry; not a
  // flattened oval, triangle or painted ellipse pasted onto the skin.
  const d="M"+point(startX,startY)+
    " C"+point(startX+20,startY-13,startX+48,startY-12,crestX-15,crestY-62)+
    " C"+point(crestX+11,crestY-55,crestX+26,crestY-21,crestX+20,crestY+8)+
    " C"+point(crestX+3,crestY+36,crestX-30,crestY+52,endX+20,endY+35)+
    " C"+point(endX+2,endY+26,startX-12,startY+62,startX,startY)+"Z";
  const minX=Math.floor(Math.min(startX,crestX-31,endX)-19);
  const minY=Math.floor(Math.min(startY-14,crestY-65)-18);
  const maxX=Math.ceil(Math.max(crestX+29,startX+51)+19);
  const maxY=Math.ceil(Math.max(crestY+54,endY+40)+19);
  const angle=clamp(Math.atan2(crestY-startY,crestX-startX)*180/Math.PI,-70,70);
  return {d,bounds:{x:minX,y:minY,width:maxX-minX,height:maxY-minY},
    angle:round(angle)};
}
export const CRAYON_F1_V31_CHANGED_IDS=["cheek-malar-bounce"] as const;

/** Opt-in ANAT1-informed *native wax* geometry. Reuses every source node,
 * pressure-built nib, full gradient, physical paper tooth, timing and
 * film camera; only the photographed left malar light plane's Bézier
 * topology, bounds and 3D tangent angle change.
 */
export function crayonF1PaintAnat1Malar(
  elements:readonly CrayonElement[],
):CrayonElement[]{
  const reg=crayonF1RegisterAnat1Face(),surface=malarWaxPath(reg);
  const found=new Set<string>();
  const result=elements.map(el=>{
    if(el.id!=="cheek-malar-bounce")return el;
    if(el.kind!=="wax"||found.has(el.id)||
       el.parentId!=="face-outline"||el.clipToParent!==true)
      throw new RangeError("ANAT1 malar plane is not a unique attached skin wax");
    if(el.d===surface.d)
      throw new RangeError("ANAT1 F1 malar construction already applied");
    found.add(el.id);
    return {...el,...surface};
  });
  if(found.size!==1)throw new RangeError("Missing F1 native cheek value plane");
  return result;
}
