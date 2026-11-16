import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import type {RisoCharacterSpec,RisoJointFrame} from "../../registry/video/riso-character";
import {RISO31_GEOMETRY} from "./riso31-finger-phalanges";
import {RISO32_THUMB_GEOMETRY} from "./riso32-thumb-ip";

/**
 * RISO40 / ArtCraft: paper handoff target must be the actual opposed *print
 * pad* geometry, not a hand's wrist joint. In original RISO39 print the paper
 * stopped at both wrists while its finger pads were stranded underneath the
 * sheet or to its far right.
 *
 * This source-only evaluator projects two existing, moving ANAT1-driven
 * joints (thumb IP and index DIP) to the original film stage. Its midpoint
 * gives the paper's short-end center, not a fabricated sheet keyframe.
 * Material and foreground masks still use RisoPrint's two real ink masters.
 */
export interface Riso40GripPoint {readonly x:number;readonly y:number}
export interface Riso40GripStage {
  readonly x:number;readonly y:number;readonly scale:number;
}
export interface Riso40PaperGrip {
  readonly actor:string;
  readonly side:"left"|"right";
  readonly frame:number;
  readonly sampledFrame:number;
  /** Stage-space true moving papercorner, between actual red finger pads. */
  readonly paperAnchor:Riso40GripPoint;
  readonly thumbTip:Riso40GripPoint;
  readonly indexTip:Riso40GripPoint;
  readonly tipDistance:number;
  readonly handRoot:Riso40GripPoint;
  readonly anchorToRoot:number;
  readonly source:"moving thumb IP + index DIP source bones" ;
}
const project=(j:RisoJointFrame,x:number,y:number):Riso40GripPoint=>{
  const m=j.matrix;
  return {x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};
};
const dist=(a:Riso40GripPoint,b:Riso40GripPoint)=>
  Math.hypot(a.x-b.x,a.y-b.y);
const stagePoint=(p:Riso40GripPoint,stage:Riso40GripStage):Riso40GripPoint=>({
  x:stage.x+p.x*stage.scale,y:stage.y+p.y*stage.scale,
});
export function evaluateRiso40PaperGrip(
  spec:RisoCharacterSpec,frame:number,side:"left"|"right",stage:Riso40GripStage,
):Riso40PaperGrip{
  if(!stage||![stage.x,stage.y,stage.scale].every(Number.isFinite)||stage.scale<=0)
    throw new RangeError("RISO40 needs finite stage scale and placement");
  const pose=evaluateRisoCharacter(spec,frame);
  const byId=new Map(pose.joints.map(j=>[j.id,j]));
  const get=(name:string)=>{
    const found=byId.get(side+"-"+name);
    if(!found)throw new Error("RISO40 missing original source joint "+side+"-"+name);
    return found;
  };
  const thumbTip=stagePoint(project(get("thumb-ip"),0,RISO32_THUMB_GEOMETRY.distalReach),stage);
  const indexTip=stagePoint(project(get("index-dip"),0,RISO31_GEOMETRY.index.distal),stage);
  const handRoot=stagePoint(project(get("hand"),0,0),stage);
  const paperAnchor={x:(thumbTip.x+indexTip.x)/2,y:(thumbTip.y+indexTip.y)/2};
  return {
    actor:spec.id,side,frame,sampledFrame:pose.sampledFrame,
    paperAnchor,thumbTip,indexTip,tipDistance:dist(thumbTip,indexTip),
    handRoot,anchorToRoot:dist(paperAnchor,handRoot),
    source:"moving thumb IP + index DIP source bones",
  };
}
