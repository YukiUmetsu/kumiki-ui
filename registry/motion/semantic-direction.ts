/** SD1: semantic motion direction, not an animation engine.
 * Pure JSON-compatible authoring data. Scene geometry is provided by callers
 * (SVG, DOM layout, WebGL projection or video scene); no screenshot analysis.
 */
import type { FrameRange, Rect, Vec2 } from "./types";
import type { Storyboard } from "./storyboard";

export type SemanticRole = "subject" | "label" | "decoration";
export interface SemanticElement {
  id: string;
  /** Stable identity across representation changes and scene transitions. */
  semanticId: string;
  role: SemanticRole;
  /** Bounds in authored design pixels; can be overridden by frame samples. */
  bounds: Rect;
  /** Object exists in [startFrame, endFrame). Defaults to the entire scene. */
  visible?: FrameRange;
  /** Content for optional duplicate-text diagnostics. */
  text?: string;
  /** Labels only; collisions are checked when both are visible. */
  priority?: number;
}
export type TransferIntent = "transport" | "transform" | "highlight";
export interface SemanticTransferSpec {
  id: string;
  /** Identify the *actual payload*, not a decorative particle. */
  semanticId: string;
  intent: TransferIntent;
  fromId: string;
  toId: string;
  /** One active transfer window. A connector is invisible outside it. */
  range: FrameRange;
  /** Optional entrance/exit attachment side; defaults to centers. */
  fromSide?: "left" | "right" | "top" | "bottom" | "center";
  toSide?: "left" | "right" | "top" | "bottom" | "center";
  /** Stroke disappears at arrival; does not persist as an idle wire. */
  fadeFrames?: number;
}
export interface CameraPurpose {
  id: string;
  kind: "focus" | "follow" | "reveal" | "hold";
  /** Semantic target; a camera operation must say what it makes clearer. */
  targetId: string;
  reason: string;
  /** Intended screen-space destination for focus moves, in design pixels. */
  screenTarget?: Vec2;
  range: FrameRange;
}
export interface SemanticBeat {
  id: string;
  range: FrameRange;
  /** One falsifiable learning objective, rather than a list of topics. */
  claim: string;
  visualChange: string;
  focusId: string;
  /** Explicitly mark exposition without motion; no fake particles needed. */
  mode?: "demonstrate" | "establish" | "compare" | "hold";
}
export interface SemanticDirectionScene {
  id: string;
  width: number;
  height: number;
  durationFrames: number;
  elements: readonly SemanticElement[];
  beats: readonly SemanticBeat[];
  transfers?: readonly SemanticTransferSpec[];
  camera?: readonly CameraPurpose[];
}
/** A single sampled geometry frame, optional for moving actors / camera. */
export interface SemanticFrameSample {
  frame: number;
  /** Measured text boxes or resolved 3D projections override base bounds. */
  bounds?: Readonly<Record<string, Rect>>;
  /** Camera's projected target anchor. Used only for declared focus moves. */
  cameraFocus?: Readonly<Record<string, Vec2>>;
  /** Camera pose proxy for explicit holds. Use actual projected/pose values. */
  cameraPose?: readonly number[];
}
const centre=(r: Rect): Vec2=>({x:r.x+r.width/2,y:r.y+r.height/2});
export function semanticAnchor(bounds:Rect, side:SemanticTransferSpec["fromSide"]):Vec2 {
  const c=centre(bounds);
  if(side==="left") return {x:bounds.x,y:c.y};
  if(side==="right") return {x:bounds.x+bounds.width,y:c.y};
  if(side==="top") return {x:c.x,y:bounds.y};
  if(side==="bottom") return {x:c.x,y:bounds.y+bounds.height};
  return c;
}
export interface SemanticTransferFrame {
  visible:boolean;
  progress:number;
  opacity:number;
  from:Vec2;
  to:Vec2;
  position:Vec2;
}
/** Deterministic geometry for renderers. The path is absent before departure,
 * extends only while the payload moves, and vanishes at arrival.
 * Call with actual per-frame actor bounds to keep ports attached.
 */
export function evaluateSemanticTransfer(
  transfer:SemanticTransferSpec,frame:number,
  fromBounds:Rect,toBounds:Rect,
):SemanticTransferFrame {
  const from=semanticAnchor(fromBounds,transfer.fromSide??"right");
  const to=semanticAnchor(toBounds,transfer.toSide??"left");
  const duration=transfer.range.endFrame-transfer.range.startFrame;
  const raw=duration>0 ? (frame-transfer.range.startFrame)/duration : 0;
  const t=Math.max(0,Math.min(1,raw));
  const progress=t*t*(3-2*t);
  const position={x:from.x+(to.x-from.x)*progress,y:from.y+(to.y-from.y)*progress};
  const fade=Math.max(0,transfer.fadeFrames??0);
  const opacity=fade>0 ? Math.min(1,(transfer.range.endFrame-frame)/fade) : 1;
  return {visible:frame>=transfer.range.startFrame&&frame<transfer.range.endFrame,
    progress,opacity:Math.max(0,opacity),from,to,position};
}
/** Sparse semantic samples: always include interval boundaries. Others may
 * be added at explicit keyframes; no frame-by-frame rendering is necessary.
 */
export function semanticSampleFrames(scene:SemanticDirectionScene):number[] {
  const frames=new Set([0,Math.max(0,scene.durationFrames-1)]);
  for(const b of scene.beats) for(const f of [b.range.startFrame,b.range.endFrame-1])
    if(f>=0&&f<scene.durationFrames) frames.add(f);
  for(const transfer of scene.transfers??[]) for(const f of [
    transfer.range.startFrame,Math.floor((transfer.range.startFrame+transfer.range.endFrame)/2),
    transfer.range.endFrame-1,
  ]) if(f>=0&&f<scene.durationFrames) frames.add(f);
  for(const cam of scene.camera??[]) for(const f of [
    cam.range.startFrame,Math.floor((cam.range.startFrame+cam.range.endFrame)/2),
    cam.range.endFrame-1,
  ]) if(f>=0&&f<scene.durationFrames) frames.add(f);
  return [...frames].sort((a,b)=>a-b);
}

/** Reuse scene-storyboard as the editorial source of truth. This adapter
 * avoids inventing a second storyboard and binds its declared focus/claims
 * to geometry, motion intent, and preflight in one small step.
 */
export function directionFromStoryboard(
  board:Storyboard,
  config:{
    width:number;height:number;
    elements:readonly SemanticElement[];
    transfers?:readonly SemanticTransferSpec[];
    camera?:readonly CameraPurpose[];
  },
):SemanticDirectionScene {
  return {
    id:board.id,width:config.width,height:config.height,
    durationFrames:board.durationFrames,elements:config.elements,
    beats:board.shots.map(shot=>({
      id:shot.id,
      range:{startFrame:shot.startFrame,
        endFrame:shot.startFrame+shot.durationFrames},
      claim:shot.claim,visualChange:shot.visualObjective,
      focusId:shot.focusTarget,
    })),
    transfers:config.transfers,camera:config.camera,
  };
}
