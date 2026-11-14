/** Source-faithful per-mark authoring for the interactive Film Looks gallery.
 * Keeps the original artwork immutable and all evaluation frame-addressable.
 */
import { assertInkWash } from "../../registry/video/ink-wash";
import type { InkWashSpec } from "../../registry/video/ink-wash";

export interface InkStrokeTuning {
  width: number;
  tone: number;
  water: number;
  load: number;
  drag: number;
  offsetX: number;
  offsetY: number;
  startOffset: number;
}
export type InkStrokeOverrides = Readonly<Record<string, InkStrokeTuning>>;
export const DEFAULT_INK_STROKE_TUNING: InkStrokeTuning = {
  width:1,tone:1,water:1,load:1,drag:.5,
  offsetX:0,offsetY:0,startOffset:0,
};
const bounded=(v:unknown,min:number,max:number)=>typeof v==="number" && Number.isFinite(v) && v>=min && v<=max;
const numericKeys = Object.keys(DEFAULT_INK_STROKE_TUNING) as (keyof InkStrokeTuning)[];
export function assertInkStrokeTuning(tuning:InkStrokeTuning):void {
  if (!tuning || typeof tuning!=="object" ||
      Object.keys(tuning).some(k=>!numericKeys.includes(k as keyof InkStrokeTuning)) ||
      !bounded(tuning.width,.2,3) || !bounded(tuning.tone,0,2) ||
      !bounded(tuning.water,0,2) || !bounded(tuning.load,0,2) ||
      !bounded(tuning.drag,0,1) ||
      !bounded(tuning.offsetX,-100,100) || !bounded(tuning.offsetY,-100,100) ||
      !Number.isSafeInteger(tuning.startOffset) || tuning.startOffset < -60 || tuning.startOffset > 60)
    throw new RangeError("Stroke tuning must contain finite, bounded material, offset and timing controls.");
}
export function assertInkStrokeOverrides(spec:InkWashSpec, overrides:InkStrokeOverrides):void {
  if (!overrides || typeof overrides!=="object" || Array.isArray(overrides))
    throw new RangeError("Stroke overrides must be an object.");
  const ids=new Set(spec.strokes.map(s=>s.id));
  if (Object.keys(overrides).length>spec.strokes.length)
    throw new RangeError("Stroke overrides exceed the number of available marks.");
  for(const [id,tuning] of Object.entries(overrides)){
    if(!ids.has(id))throw new RangeError("Unknown brushstroke: "+id);
    assertInkStrokeTuning(tuning);
  }
}
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function configureInkStrokes(spec:InkWashSpec,overrides:InkStrokeOverrides):InkWashSpec {
  assertInkStrokeOverrides(spec,overrides);
  const changed:InkWashSpec={...spec,strokes:spec.strokes.map(stroke=>{
    const t=overrides[stroke.id];
    if(!t)return stroke;
    return {...stroke,
      width:clamp(stroke.width*t.width,.5,240),
      tone:clamp(stroke.tone*t.tone,0,1),
      water:clamp(stroke.water*t.water,0,1),
      load:clamp(stroke.load*t.load,0,1),
      drag:t.drag,
      startFrame:clamp(stroke.startFrame+t.startOffset,0,36000),
      points:stroke.points.map(p=>({...p,x:p.x+t.offsetX,y:p.y+t.offsetY})),
    };
  })};
  assertInkWash(changed);
  return changed;
}
