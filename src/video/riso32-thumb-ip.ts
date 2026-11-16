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
  ipX:3.3,ipY:-1.15,
  rootLength:Math.hypot(3.3,-1.15),
  distalReach:5.6,
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
 * with a narrower overlapping bridge at the actual moving joint. The cap is part
 * of the same two-color physical stencil as the other four fingers.
 * Source paths differ across hands; they are not a reflected photograph.
 */
export function riso32ThumbInkParts(side:Riso32Side):readonly RisoCharacterPart[]{
  const left=side==="left";
  return [
    {id:side+"-glove-thumb",joint:side+"-thumb",plate:"red",paint:"solid",
      d:left
        ?"M1.8 -3.3 C.4 -5.4 -1.7 -5.3 -3.3 -4.2 Q-5.3 -2.7 -5.2 -.8 C-4.4 1.6 -2.6 2.0 -.6 1.4 Q1.6 .5 1.8 -3.3 Z"
        :"M-1.8 -3.3 C-.3 -5.4 1.9 -5.4 3.4 -4.2 Q5.4 -2.7 5.1 -.8 C4.5 1.5 2.6 2.0 .6 1.4 Q-1.6 .4 -1.8 -3.3 Z"},
    {id:side+"-glove-thumb-distal-phalanx",joint:side+"-thumb-ip",plate:"red",paint:"solid",
      d:left
        ?"M-2.1 -1.5 C-2 -2.7 -.7 -3.2 .5 -2.4 C2.3 -1.1 2.8 .7 2.5 2.7 Q2.3 4.6 1.0 5.4 C.1 6.0 -.9 5.6 -1.6 4.8 Q-2.5 3.3 -2.4 1.1 Q-2.6 -.4 -2.1 -1.5 Z"
        :"M2.1 -1.5 C2.0 -2.8 .7 -3.1 -.6 -2.4 C-2.4 -1.1 -2.7 .8 -2.5 2.7 Q-2.2 4.7 -1.0 5.4 C-.1 5.9 .9 5.6 1.6 4.7 Q2.6 3.2 2.4 1.0 Q2.6 -.5 2.1 -1.5 Z"},
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
      :"M-8.8 -.8 Q-4.1 -.2 .4 -.48 Q4.6 -.65 8.5 -.2 C10 3.9 9.3 7.2 4.5 10.6 Q-1.2 10.6 -5.8 10.7 Q-9.1 7.0 -9.8 4.1 Q-10.2 1.1 -8.8 -.8 Z",
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
