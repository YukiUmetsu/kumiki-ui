import type {RisoCharacterPart,RisoCharacterSpec,RisoJoint,RisoJointFrame} from "../../registry/video/riso-character";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import {HAND_POSES,JOINTS} from "../../registry/anatomy/anatomy-pose";

/**
 * RISO32 / ArtCraft: the opposable thumb is not a painted one-piece mitten.
 * Two original, closed vermilion stamp silhouettes share a moving IP pivot.
 * The MCP/CMC source root remains the actor's pre-existing thumb joint.
 *
 * A frontal 2D editorial projection cannot represent real 3D opposition;
 * ANAT1 constrains its bend, but never certifies a photographic hand.
 */
export type Riso32Side="left"|"right";
const clinicalIp=JOINTS.find(j=>j.id==="thumb-ip")?.dofs.flex;
const referenceIp=HAND_POSES.fist(".R")["thumb-ip.R"]?.flex;
if(!clinicalIp||referenceIp===undefined||referenceIp>clinicalIp.max||
  referenceIp<clinicalIp.min)throw new Error("RISO32 needs canonical ANAT1 thumb IP reference");
export const RISO32_THUMB_ANAT1={
  reference:"Kumiki ANAT1 / thumb-ip, HAND_POSES.fist(.R)",
  clinicalFlexMinimum:clinicalIp.min,
  clinicalFlexMaximum:clinicalIp.max,
  clinicalFistFlex:referenceIp,
  projectionFactor:.32,
  projection:"authored frontal 2D, not anatomically verified three-quarter" as const,
};
/** Source units at the anatomical DIP-equivalent thumb IP pivot. */
export const RISO32_THUMB_GEOMETRY={
  ipX:5.2,ipY:-1.3,
  rootLength:Math.hypot(5.2,-1.3),
  distalReach:7.2,
  overlap:2.4,
} as const;

/** Each opposing hand curls toward the printed palm, with a delayed
 * receiver pinch. All keys are absolute-source-frame deterministic. */
export function riso32ThumbIpJoint(side:Riso32Side):RisoJoint{
  const s=side==="right"?1:-1;
  const delay=side==="left"?6:0;
  const full=RISO32_THUMB_ANAT1.clinicalFistFlex*RISO32_THUMB_ANAT1.projectionFactor*s;
  return {
    id:side+"-thumb-ip",parent:side+"-thumb",
    x:s*RISO32_THUMB_GEOMETRY.ipX,y:RISO32_THUMB_GEOMETRY.ipY,
    keys:[
      {frame:0,rotate:0,easing:"ease"},
      {frame:96,rotate:s*1.3,easing:"ease"},
      {frame:126,rotate:s*2.5,easing:"ease"},
      {frame:160+delay,rotate:full,easing:"ease"},
      {frame:180+delay,rotate:full*.55,easing:"ease"},
      {frame:205,rotate:full*.13,easing:"ease"},
      {frame:239,rotate:full*.13},
    ],
  };
}

/**
 * Original cheek-like thenar-to-proximal knuckle and rounded distal pad,
 * with generous ink-to-ink overlap at the moving joint. The cap is part
 * of the same two-color physical stencil as the other four fingers.
 * Source paths differ across hands; they are not a reflected photograph.
 */
export function riso32ThumbInkParts(side:Riso32Side):readonly RisoCharacterPart[]{
  const left=side==="left";
  return [
    {id:side+"-glove-thumb",joint:side+"-thumb",plate:"red",paint:"solid",
      d:left
        ?"M2.1 -3.6 Q-.5 -6 -3.2 -5.2 Q-5.5 -4.8 -7.1 -3.2 Q-7.5 -1.3 -6.7 .3 Q-5 2.5 -3 1.6 Q-.5 .3 1.7 2.2 Z"
        :"M-2 -3.6 Q.8 -6.2 3.5 -5.5 Q5.5 -5.2 7.1 -3.2 Q7.5 -1.6 6.6 .3 Q5.1 2.8 3.1 1.6 Q.4 -.1 -1.7 2 Z"},
    {id:side+"-glove-thumb-distal-phalanx",joint:side+"-thumb-ip",plate:"red",paint:"solid",
      d:left
        ?"M-2.5 -1.4 C-2.3 -2.8 -.9 -3.1 .7 -2.2 C2.9 -.9 3.1 1.1 2.8 3.4 Q3.0 6.1 1.6 7.2 C.8 7.9 -.6 7.8 -1.5 7.0 Q-3.1 5.4 -3.0 3.2 Q-3.1 .3 -2.5 -1.4 Z"
        :"M2.5 -1.5 C2.1 -2.9 .9 -3.1 -.8 -2.3 C-2.8 -.8 -3.2 1.0 -2.8 3.3 Q-2.9 6.0 -1.5 7.1 C-.7 7.8 .7 7.8 1.5 6.9 Q3.0 5.3 3.0 3.1 Q3.1 .3 2.5 -1.5 Z"},
  ];
}

/** Paper-shaped underprint clearance at the cuff/hand junction.
 * It is an actual reserved-paper stencil BEFORE the glove ink prints, not
 * opacity reduction, a cosmetic canvas erase or a third color. Slight
 * irregularity intentionally traps only a narrow blue/red cuff seam while
 * avoiding the former broad near-black cylinder at 6x zoom. */
export function riso33WristUnderprintClearance(side:Riso32Side):RisoCharacterPart{
  return {
    id:side+"-wrist-underprint-clearance",joint:side+"-hand",
    plate:"blue",paint:"solid",knockoutOnly:true,
    d:side==="right"
      ?"M-8.5 -.2 Q-4.6 -.65 -.4 -.48 Q4 -.2 8.8 -.8 C9.7 1.1 10 4.1 9.1 7.0 Q5.8 10.7 1.2 10.6 Q-4.5 10.6 -9.3 7.2 Q-10 3.9 -8.5 -.2 Z"
      :"M-8.8 -.8 Q-4.1 -.2 .4 -.48 Q4.6 -.65 8.5 -.2 C10 3.9 9.3 7.2 4.5 10.6 Q-1.2 10.6 -5.8 10.7 Q-9.1 7.0 -9.8 4.1 -8.8 -.8 Z",
  };
}

export const riso32ThumbDistalId=(side:Riso32Side)=>side+"-glove-thumb-distal-phalanx";

/** Diagnostic is built from the ACTUAL evaluated film rig and stamped ink,
 * not an approximation from an unposed reference stencil. */
export function inspectRiso32ThumbIp(spec:RisoCharacterSpec,frame:number,side:Riso32Side){
  const pose=evaluateRisoCharacter(spec,frame);
  const find=(id:string):RisoJointFrame=>{
    const joint=pose.joints.find(j=>j.id===id);
    if(!joint)throw new Error("RISO32 missing posed joint "+id);
    return joint;
  };
  const base=find(side+"-thumb");
  const ip=find(side+"-thumb-ip");
  const proximal=pose.parts.find(p=>p.id===side+"-glove-thumb");
  const distal=pose.parts.find(p=>p.id===riso32ThumbDistalId(side));
  if(!proximal||!distal)throw new Error("RISO32 missing real printed thumb sections");
  const diff=((ip.angle-base.angle+540)%360)-180;
  return {
    side,frame,ipJoint:ip.id,rootJoint:base.id,
    ipLocalAngle:diff,rootToIp:Math.hypot(ip.x-base.x,ip.y-base.y),
    independentRedSegments:proximal.plate==="red"&&distal.plate==="red"&&
      proximal.paint==="solid"&&distal.paint==="solid"&&
      proximal.transform!==distal.transform&&
      distal.transform.startsWith("matrix("),
    distalId:distal.id,
  };
}
