/**
 * INK5 — authored figure brushwork that follows the existing CharacterPresenter
 * part matrices. A garment fold is geometry in its approved part's design pixels,
 * not a screen-wide filter or an animation/rigging system.
 *
 * The original INK1 brush polygon, pressure taper and stable paper-space noise
 * are reused so costume detail shares the exact same material vocabulary.
 */
import type { CharacterPathShape, CharacterShapeAsset } from "../character/definition";
import { flyingWhite, inkOutline } from "./ink-wash";
import type { InkPoint, InkStroke } from "./ink-wash";

/** Classical figure-painting vocab: delicate outline, broad wash, dry bristle,
 * 蘭葉描 pressure-swell, and 折蘆描 interrupted turning contours. */
export type InkFigureStrokeKind = "silk-thread" | "fold" | "dry-brush" | "orchid-leaf" | "broken-reed";
export interface InkFigureStroke {
  id: string;
  kind: InkFigureStrokeKind;
  points: readonly InkPoint[];
  width: number;
  /** Relative ink density, 0..1. */
  tone: number;
  /** 0..1 water loading; dry-brush intentionally restricts it. */
  water: number;
  /** Palette key or validated hex literal. */
  pigment?: string;
  /** Optional separate pale pigment for the broad shadow/wash underneath the contour. */
  washPigment?: string;
  /** 0..1 detail level required to render this gesture. */
  detailMin?: number;
}
export interface InkFigureCraftControls {
  /** 0 suppresses all ornament; 1 enables every authored fold. */
  detail: number;
  /** Multiplier on the fold's authored tone. */
  contrast: number;
  /** Stable paper-space seed. No clock or random evaluation. */
  seed: number;
}
export const DEFAULT_INK_FIGURE_CRAFT: InkFigureCraftControls = { detail: 1, contrast: .85, seed: 83 };
const finite = (v:number,min:number,max:number)=>Number.isFinite(v)&&v>=min&&v<=max;
const PALETTE=/^\$[a-z][a-z0-9_-]{0,63}$/i;
const HEX=/^#[a-f0-9]{3}(?:[a-f0-9]{3})?(?:[a-f0-9]{2})?$/i;
const color=(v:string)=>PALETTE.test(v)||HEX.test(v);
const id=(v:string)=>typeof v==="string"&&/^[a-z][a-z0-9_-]{0,63}$/i.test(v);

export function assertInkFigureCraft(folds:readonly InkFigureStroke[],controls:InkFigureCraftControls):void {
  if(!controls||!finite(controls.detail,0,1)||!finite(controls.contrast,0,2)||
    !Number.isSafeInteger(controls.seed)||controls.seed<0||controls.seed>2147483647)
    throw new RangeError("INK5 craft detail, contrast and seed must be finite bounded values.");
  if(!Array.isArray(folds)||folds.length>80)throw new RangeError("INK5 allows up to 80 authored figure marks.");
  const seen=new Set<string>();
  for(const f of folds){
    if(!f||!id(f.id)||seen.has(f.id)||!["silk-thread","fold","dry-brush","orchid-leaf","broken-reed"].includes(f.kind)||
       !Array.isArray(f.points)||f.points.length<2||f.points.length>24||
       (f.kind==="broken-reed"&&f.points.length<4)||
       !finite(f.width,.4,48)||!finite(f.tone,0,1)||!finite(f.water,0,1)||
       (f.kind==="dry-brush"&&f.water>.45)||
       (f.detailMin!==undefined&&!finite(f.detailMin,0,1))||
       (f.pigment!==undefined&&!color(f.pigment))||
       (f.washPigment!==undefined&&!color(f.washPigment)))
      throw new RangeError("INK5 requires unique safe stroke IDs, bounded brush values and paint colors.");
    seen.add(f.id);
    for(const p of f.points){
      if(!p||!finite(p.x,-4096,4096)||!finite(p.y,-4096,4096)||!finite(p.pressure,0,1))
        throw new RangeError("INK5 points need finite paper coordinates and pressure in 0..1.");
    }
  }
}
/** A fold renders as independently pressure-shaped pale wash + ink core, or a
 * restrained thin iron-wire gesture. All pieces keep the same original part
 * pivot and therefore animate without sliding when the performer moves.
 */
export function inkFigureCraftShapes(
  folds:readonly InkFigureStroke[],controls:InkFigureCraftControls=DEFAULT_INK_FIGURE_CRAFT,
):CharacterPathShape[] {
  assertInkFigureCraft(folds,controls);
  const result:CharacterPathShape[]=[];
  for(let i=0;i<folds.length;i++){
    const f=folds[i];
    if(controls.detail===0||controls.detail<(f.detailMin??0))continue;
    const seed=(controls.seed+i*113)%(2147483647);
    // 折蘆描 uses two intentionally separated loaded touches, not a uniform
    // dashed SVG ribbon. The gap/turn is authored by the painter's point list.
    const segments:readonly (readonly InkPoint[])[]=f.kind==="broken-reed"
      ? [f.points.slice(0,Math.floor(f.points.length/2)),
        f.points.slice(Math.floor(f.points.length/2))]
      : [f.points];
    const ink=f.pigment??"$shadow";
    const strength=Math.min(1,f.tone*controls.contrast);
    for(let segment=0;segment<segments.length;segment++){
      const stroke:InkStroke={
        id:f.id+"-"+segment,points:segments[segment],width:f.width,
        tone:f.tone,water:f.water,load:1,
        startFrame:0,drawFrames:1,spreadFrames:0,dryFrames:1,
        brush:f.kind==="fold"||f.kind==="orchid-leaf"?"oblique":"upright",
        tipInk:f.kind==="fold"?.82:f.kind==="orchid-leaf"?.76:.45,
        drag:f.kind==="dry-brush"?.9:f.kind==="broken-reed"?.57:.15,
      };
      const inkSeed=seed+segment*37;
      // 蘭葉描 has a pressure-shaped broad belly and a very pale underpainting.
      // As with the other kinds, the actual width is determined by authored
      // per-point pressure and follows its rigged body part.
      if(f.kind==="fold"||f.kind==="orchid-leaf"){
        result.push({type:"path",d:inkOutline(stroke,inkSeed+17,1,
            f.width*(f.kind==="orchid-leaf"?.42:.28)),
          fill:f.washPigment??"$wash",stroke:"none",
          opacity:Math.min(.36,strength*(f.kind==="orchid-leaf"?.34:.28))});
      }
      result.push({type:"path",d:inkOutline(stroke,inkSeed,1),
        fill:ink,stroke:"none",opacity:strength});
      if(f.kind==="dry-brush"){
        const fibers=flyingWhite(stroke,inkSeed,1).slice(0,6);
        for(const d of fibers){
          result.push({type:"path",d,fill:"none",stroke:f.washPigment??"$linen",
            strokeWidth:Math.max(.4,f.width*.045),opacity:Math.min(.44,strength*.42)});
        }
      }
    }
  }
  return result;
}
/** Extend an approved vector part without changing its dimensions, provenance,
 * or any of the animation rig's existing pivots. Never mutate source assets.
 */
export function inkCraftAsset(asset:CharacterShapeAsset,folds:readonly InkFigureStroke[],
  controls:InkFigureCraftControls=DEFAULT_INK_FIGURE_CRAFT):CharacterShapeAsset {
  if(!asset||asset.kind!=="shapes")throw new RangeError("INK5 brushwork requires an approved vector part.");
  return {...asset,shapes:[...asset.shapes,...inkFigureCraftShapes(folds,controls)]};
}
