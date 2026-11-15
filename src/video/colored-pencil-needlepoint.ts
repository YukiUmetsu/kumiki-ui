/**
 * ArtCraft v15 | pencil-on-paper optical skin, not a blur or raster wash.
 *
 * Alyona Nickelsen (Colored Pencil Magazine AMA, 2017) attributes
 * conspicuous portrait grain to prominent dark lines laid on pale layers:
 * tiny sharp-point strokes tightly spaced are optically blended instead.
 * Janie Gildow teaches overlapping light-pressure loops. Here every new
 * pigment contact inherits ONE source-photo-verified skin fibre, and its
 * pressure-neighbour positions are materially bounded within the paper.
 *
 * Only the existing optically verified "face-optical-weave" material may
 * invoke this; preserve individually crafted eyes, lips, nostrils, hair and
 * skin edge silhouettes. Rendering clips these microfibres to the source-
 * measured facial contour, while original marks remain exactly unchanged.
 */
import {pencilHash} from "../../registry/video/colored-pencil";
import type {PencilPhotoMark} from "./colored-pencil-photo";

const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const MAX_STROKES=9;

/** A new nib's lateral displacement never exceeds its source fiber width. */
export function buildPencilNeedlepointSkinContact(
  mark:PencilPhotoMark,strength:number,seed=271,
):readonly PencilPhotoMark[]{
  if(!Number.isFinite(strength)||strength<0||strength>1||
    !Number.isSafeInteger(seed)||seed<0||seed>2147483647||
    !mark||![mark.x,mark.y,mark.controlX,mark.controlY,
      mark.endX,mark.endY,mark.alpha,mark.width].every(Number.isFinite)||
    mark.alpha<=0||mark.alpha>1||mark.width<=0||
    !/^#[a-fA-F0-9]{6}$/.test(mark.color)||
    ![0,1,2].includes(mark.pass))
    throw new RangeError("Invalid source-registered pencil needlepoint");
  if(strength===0)return [mark];
  const dx=mark.endX-mark.x,dy=mark.endY-mark.y;
  const length=Math.hypot(dx,dy);
  if(length<.001)return [mark];
  const perpX=-dy/length,perpY=dx/length;
  const tangX=dx/length,tangY=dy/length;
  // Per-fiber seed: no dependence on the mark's sorted index, frame or
  // storyboard phase, so film seeks and stage reveals are bit-repeatable.
  const key=(Math.imul(Math.round(mark.x*8),73856093)^
    Math.imul(Math.round(mark.y*8),19349663)^
    Math.imul(Math.round(mark.controlX*8),83492791)^
    Math.imul(Math.round(mark.endY*8),2654435761))>>>0;
  const count=Math.min(MAX_STROKES-1,
    Math.floor(8*strength+.001));
  const extras:PencilPhotoMark[]=[];
  for(let i=0;i<count;i++){
    // Paired normals fill spaces *between* original strokes; a central
    // duplicate would darken existing scratches instead of closing
    // bright paper flecks. Keep each contact below the scale of 1.0x
    // original nib width so it never becomes a soft-focus paint smear.
    const rank=Math.floor(i/2);
    const sign=i%2===0?-1:1;
    const normal=sign*mark.width*
      (.32+rank*.18+.07*pencilHash(seed,key,i+400));
    const tangent=(pencilHash(seed,key,i+410)-.5)*
      Math.min(mark.width*.33,length*.3);
    const spreadX=perpX*normal+tangX*tangent;
    const spreadY=perpY*normal+tangY*tangent;
    const pressure=.32+.25*pencilHash(seed,key,i+420);
    const nibLength=.76+.37*pencilHash(seed,key,i+430);
    const x2=mark.x+(mark.endX-mark.x)*(nibLength-1)*-.5+spreadX;
    const y2=mark.y+(mark.endY-mark.y)*(nibLength-1)*-.5+spreadY;
    const ex=x2+dx*nibLength,ey=y2+dy*nibLength;
    const wiggle=(pencilHash(seed,key,i+440)-.5)*
      mark.width*.12;
    extras.push({
      ...mark,
      x:x2,y:y2,
      controlX:mark.controlX+spreadX+perpX*wiggle,
      controlY:mark.controlY+spreadY+perpY*wiggle,
      endX:ex,endY:ey,
      alpha:clamp(mark.alpha*pressure*strength,.002,.55),
      width:mark.width*(.34+.18*pencilHash(seed,key,i+450)),
    });
  }
  // The original full-density individual pencil stroke always remains,
  // is neither softened nor recoloured, and is painted OVER its fibres.
  return [...extras,mark];
}
export function isPencilNeedlepointZone(zone:string):boolean{
  return zone==="face-optical-weave";
}
