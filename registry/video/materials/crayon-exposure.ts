import { crayonHash } from "./crayon";
import type { CrayonBounds } from "./crayon";

/** Small, independently repainted wax deposits; never reposition the solid silhouette. */
export interface CrayonRedrawOptions {
  /** Film frames per hand-painted exposure. Typically 3 at 30 fps ~= 10 drawings/s. */
  holdFrames: 2 | 3 | 4 | 5 | 6;
  /** Optional actor-scene exposure onset; defaults to the end of fill.
   * Use when the body is already recognizable but detail layers keep drawing. */
  beginFrame?: number;
  /** Magnitude of pigment exchange, 0 is perfectly stable. Not full-frame jitter. */
  strength: number;
}
export interface CrayonExposureStroke {
  d:string;
  width:number;
  opacity:number;
}
const fix=(x:number)=>Number(x.toFixed(2));
export function assertCrayonRedrawOptions(o:CrayonRedrawOptions):void{
  if(!o || ![2,3,4,5,6].includes(o.holdFrames)||
    !Number.isSafeInteger(o.holdFrames)||!Number.isFinite(o.strength)||
    o.strength<0||o.strength>1||
    (o.beginFrame!==undefined && (!Number.isSafeInteger(o.beginFrame)||
      o.beginFrame<0||o.beginFrame>36000)))throw new RangeError("CRAYON1 redraw exposure settings out of bounds");
}
/** Absolute-frame sampling: seeks never accumulate previous-frame state. */
export function crayonExposureAt(frame:number,completedFrame:number,options:CrayonRedrawOptions,reduced=false):number{
  assertCrayonRedrawOptions(options);
  if(!Number.isSafeInteger(frame)||frame<0||
    !Number.isSafeInteger(completedFrame)||completedFrame<0)
    throw new RangeError("CRAYON1 redraw frame must be nonnegative safe integer");
  // Keep the physical artwork still until first completion; never add ghost
  // pigment to the middle of drawing-in. Reduced-motion has a fixed exposure.
  const onset=options.beginFrame??completedFrame;
  if(reduced||frame<=onset)return 0;
  return Math.floor((frame-onset)/options.holdFrames);
}
/**
 * 14 spatially distributed short daubs. Positions and colors are correlated
 * between exposures, but tip contact and wax direction differ.
 * Strokes are drawn above the opaque underpainting and clipped to the object.
 * This is deliberately NOT 14 animations of the whole silhouette.
 */
export function crayonExposureStrokes(
  bounds:CrayonBounds,seed:number,exposure:number,strength:number,
):readonly CrayonExposureStroke[]{
  if(![bounds?.x,bounds?.y,bounds?.width,bounds?.height,seed,exposure,strength]
      .every(Number.isFinite) ||
    bounds.width<=0||bounds.height<=0||bounds.width>4096||bounds.height>4096||
    !Number.isSafeInteger(seed)||!Number.isSafeInteger(exposure)||exposure<0||
    strength<0||strength>1)
    throw new RangeError("CRAYON1 redraw bounds/seed/exposure are invalid");
  if(strength===0)return [];
  const strokes:CrayonExposureStroke[]=[];
  for(let i=0;i<14;i++){
    const rx=crayonHash(seed,i,1003),ry=crayonHash(seed,i,1007);
    const phase=crayonHash(seed,exposure*19+i,1013);
    const drag=crayonHash(seed,exposure*19+i,1019);
    const width=Math.min(bounds.width*.17,5+crayonHash(seed,i,1021)*16);
    const sx=bounds.x+bounds.width*(.08+rx*.84)+(phase-.5)*strength*3;
    const sy=bounds.y+bounds.height*(.08+ry*.84)+(drag-.5)*strength*3;
    const dx=(crayonHash(seed,i,1027)-.3)*width;
    const dy=(crayonHash(seed,i,1031)-.5)*Math.min(bounds.height*.13,12);
    const curl=(crayonHash(seed,exposure*23+i,1039)-.5)*strength*4;
    strokes.push({
      d:"M"+fix(sx)+" "+fix(sy)+"q"+fix(dx*.5)+" "+fix(dy*.5+curl)+
        " "+fix(dx)+" "+fix(dy+curl),
      width:fix(1.05+crayonHash(seed,exposure*23+i,1049)*1.75*strength),
      opacity:fix((.10+crayonHash(seed,exposure*23+i,1051)*.20)*strength),
    });
  }
  return strokes;
}
/**
 * Split, deliberately irregular wax nib marks straddling the clean undercoat
 * edge. Purely additive: no holes are made in a silhouette's opaque backing.
 */
export function crayonWaxEdgeDashes(seed:number,strength:number):string{
  if(!Number.isSafeInteger(seed)||!Number.isFinite(strength)||strength<0||strength>1)
    throw new RangeError("CRAYON1 edge roughness out of bounds");
  return Array.from({length:12},(_,i)=>
    fix(1.4+crayonHash(seed,i,1063)*(3.5+strength*8))+" "+
    fix(1.1+crayonHash(seed,i,1069)*(2+strength*4))
  ).join(" ");
}
