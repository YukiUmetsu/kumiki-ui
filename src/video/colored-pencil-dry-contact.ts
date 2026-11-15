/**
 * CP-F1 ArtCraft: paper-native colored-pencil dry contact.
 *
 * A polished pencil mark is not a perfectly smooth vector stroke. A thin
 * continuous pigment pass establishes a low-pressure substrate; separately
 * deposited, direction-following nib contacts ride on exposed paper tooth,
 * varying pressure and leaving tiny interstitial reserves. There is NO raster
 * underpaint, procedural blur or copied artist image.
 *
 * All geometry is pure, source-frame independent and bounded so Storybook's
 * four incremental shots and video seeks reproduce exactly the same pigment.
 *
 * Process references (technique only):
 * Ann Kullberg, FAQ "scumbling / brillo pad" (light overlapping ellipses);
 * Janie Gildow, How to Color with Colored Pencils (point/pressure/tooth).
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilPhotoMark} from "./colored-pencil-photo";

const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
type XY=readonly[number,number];
const point=(m:PencilPhotoMark,t:number):XY=>{
  const u=1-t;
  return [
    u*u*m.x+2*u*t*m.controlX+t*t*m.endX,
    u*u*m.y+2*u*t*m.controlY+t*t*m.endY,
  ];
};
const subcurve=(m:PencilPhotoMark,t0:number,t1:number)=>{
  const a=point(m,t0),b=point(m,(t0+t1)*.5),c=point(m,t1);
  // Exact sub-interval of the original quadratic Bézier, preserving
  // its tangent and curvature instead of making disjoint straight scratches.
  return {x:a[0],y:a[1],
    controlX:2*b[0]-.5*(a[0]+c[0]),
    controlY:2*b[1]-.5*(a[1]+c[1]),
    endX:c[0],endY:c[1]};
};
export const isPencilSkinContactZone=(zone:string):boolean=>
  zone==="face-value"||zone==="face-chroma"||
  zone==="face-form"||zone==="face-scumble";

/**
 * Returns one softened full-length pressure pass plus 2–4 irregular,
 * anatomically tangent nib contacts. Legacy tooth=0 is byte-identical
 * to its original vector mark. Does not change authored colour or pass.
 *
 * The input stroke (including eyelids, hair, etc.) is NEVER mutated.
 * Apply this selectively to broad skin-value/chroma/form zones; fine
 * source-measured lashes, eyes, vermilion and individual hairs retain
 * their original dedicated pencil marks.
 */
export function buildColoredPencilDryContact(
  mark:PencilPhotoMark,tooth:number,seed=271,
):readonly PencilPhotoMark[]{
  if(!Number.isFinite(tooth)||tooth<0||tooth>1||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    ![mark.x,mark.y,mark.controlX,mark.controlY,
      mark.endX,mark.endY,mark.width,mark.alpha].every(Number.isFinite)||
    mark.width<=0||mark.alpha<=0||mark.alpha>1)
    throw new RangeError("Invalid colored-pencil dry contact mark or tooth");
  if(tooth===0)return [mark];
  const dx=mark.endX-mark.x,dy=mark.endY-mark.y;
  const distance=Math.hypot(dx,dy);
  const count=clamp(Math.ceil(distance/1.8),2,4);
  // Deterministic per-mark identity survives sorting and storyboard slicing.
  // All 3 passes share the same paper coordinates but different nib offsets.
  const key=(Math.imul(Math.round(mark.x*16),73856093)^
    Math.imul(Math.round(mark.y*16),19349663)^
    Math.imul(Math.round(mark.endX*16),83492791)^mark.pass)>>>0;
  const contacts:PencilPhotoMark[]=[{
    ...mark,alpha:mark.alpha*(1-.34*tooth),
    width:mark.width*(1-.08*tooth),
  }];
  for(let i=0;i<count;i++){
    const center=(i+.40+.42*(pencilHash(seed,key,i+501)-.5))/count;
    const span=(.26+.35*pencilHash(seed,key,i+511))/count;
    const t0=clamp(center-span*.5,0,1);
    const t1=clamp(center+span*.5,0,1);
    const short=subcurve(mark,t0,t1);
    // Some contacts are more transparent. No opaque fill/burnishing, and
    // each pressure break is source-stable rather than time-dependent.
    const pressure=.53+.54*pencilHash(seed,key,i+521);
    contacts.push({
      ...mark,...short,
      alpha:clamp(mark.alpha*tooth*pressure,.003,1),
      width:mark.width*(.72+.48*pencilHash(seed,key,i+531)),
    });
  }
  return contacts;
}
