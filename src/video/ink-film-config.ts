/**
 * Shared authoring controls for Video Production / Film Looks.
 * These transform authored, frame-addressable ink data. They do NOT apply
 * a scene-wide SVG filter or create an independent playback clock.
 */
import type { InkWashSpec } from "../../registry/video/ink-wash";
import { assertInkWash } from "../../registry/video/ink-wash";
import type { InkCameraPlan, InkLayerPlan } from "../../registry/video/ink-wash-story";

export interface InkMaterialControls {
  /** Exact authored paper colors; six-digit hex to avoid unsafe SVG paints. */
  paper: string;
  ink: string;
  accent: string;
  seed: number;
  absorption: number;
  grain: number;
  /** Relative dimensions/mark intensity, 1 means unmodified original art. */
  strokeWidth: number;
  pressure: number;
  tone: number;
  water: number;
  pigmentLoad: number;
  /** Relative draw duration. 1 is original stroke timing. */
  drawTime: number;
  /** Preserve authored orientation or override the brush nib direction. */
  orientation: "authored" | "upright" | "oblique";
  /** Art-directed directional dry bristle drag, 0..1. */
  drag: number;
}
export const DEFAULT_INK_MATERIAL: InkMaterialControls = {
  paper:"#F4F0E5",ink:"#222621",accent:"#AA453D",seed:47,
  absorption:.69,grain:.6,strokeWidth:1,pressure:1,tone:1,
  water:1,pigmentLoad:1,drawTime:1,orientation:"authored",drag:.5,
};
export interface InkCameraControls {
  zoom: number;
  panX: number;
  panY: number;
}
export const DEFAULT_INK_CAMERA: InkCameraControls = {zoom:1,panX:0,panY:0};
const bounded=(n:number,a:number,b:number)=>Number.isFinite(n)&&n>=a&&n<=b;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const hex=(s:string)=>/^#[0-9a-f]{6}$/i.test(s);
export function assertInkMaterialControls(c:InkMaterialControls):void {
  if (!c || !hex(c.paper) || !hex(c.ink) || !hex(c.accent) ||
      !Number.isSafeInteger(c.seed) || c.seed < 0 || c.seed > 2147483647 ||
      !bounded(c.absorption,0,1) || !bounded(c.grain,0,1) ||
      !bounded(c.strokeWidth,.1,3) || !bounded(c.pressure,.1,3) ||
      !bounded(c.tone,.1,3) || !bounded(c.water,0,3) ||
      !bounded(c.pigmentLoad,.1,3) || !bounded(c.drawTime,.2,4) ||
      !["authored","upright","oblique"].includes(c.orientation) ||
      !bounded(c.drag,0,1))
    throw new RangeError("Ink material settings must have safe colors, seed, and bounded numeric controls.");
}
export function assertInkCameraControls(c:InkCameraControls):void {
  if (!c || !bounded(c.zoom,.5,2.5) || !bounded(c.panX,-250,250) || !bounded(c.panY,-250,250))
    throw new RangeError("Ink camera zoom must be 0.5–2.5 and pan must be within ±250 pixels.");
}
/** Every derived paint stroke preserves IDs, source points and absolute-frame semantics. */
export function configureInkSpec(base:InkWashSpec, material:InkMaterialControls):InkWashSpec {
  assertInkMaterialControls(material);
  const tuned: InkWashSpec = {
    ...base,
    paper:material.paper,ink:material.ink,accent:material.accent,
    seed:material.seed,absorption:material.absorption,grain:material.grain,
    strokes:base.strokes.map(s=>({
      ...s,
      width:clamp(s.width*material.strokeWidth,.5,240),
      tone:clamp(s.tone*material.tone,0,1),
      water:clamp(s.water*material.water,0,1),
      load:clamp(s.load*material.pigmentLoad,0,1),
      brush:material.orientation==="authored"?s.brush:material.orientation,
      drag:material.drag,
      drawFrames:Math.max(1,Math.min(36000,Math.round(s.drawFrames*material.drawTime))),
      points:s.points.map(p=>({...p,pressure:clamp(p.pressure*material.pressure,0,1)})),
    })),
  };
  assertInkWash(tuned);
  return tuned;
}
/** Keep authored camera keyframes and smooth interpolation; only adjust their transforms. */
export function configureInkCamera(base:InkCameraPlan|undefined,c:InkCameraControls):InkCameraPlan {
  assertInkCameraControls(c);
  return {keyframes:(base?.keyframes?.length?base.keyframes:[{frame:0,x:0,y:0,zoom:1}])
    .map(k=>({...k,x:k.x+c.panX,y:k.y+c.panY,zoom:clamp(k.zoom*c.zoom,.2,6)}))};
}

export interface InkRevealControls {
  /** Relative reveal length; all footage and art remain on the existing shot clock. */
  duration: number;
  parallax: number;
  kind: "authored" | "brush" | "bloom" | "instant";
}
export const DEFAULT_INK_REVEAL: InkRevealControls = {
  duration:1,parallax:1,kind:"authored",
};
export function configureInkLayer(base:InkLayerPlan,c:InkRevealControls,shotFrames:number):InkLayerPlan {
  if (!c || !bounded(c.duration,.25,3) || !bounded(c.parallax,0,2) ||
      !["authored","brush","bloom","instant"].includes(c.kind))
    throw new RangeError("Ink reveal controls must specify a valid duration, parallax and reveal.");
  const max=Math.max(1,shotFrames-base.startFrame);
  return {...base,
    durationFrames:Math.min(max,Math.max(1,Math.round(base.durationFrames*c.duration))),
    parallax:clamp((base.parallax??1)*c.parallax,0,2),
    reveal:c.kind==="authored"?base.reveal:c.kind,
  };
}
