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
  distalReach:5.8,
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
        ?"M2.3 -2.7 Q-.3 -3.8 -2.2 -2.2 C-4.3 -.9 -5.6 0 -5.8 1.6 Q-5.2 3.3 -3 3.1 Q-1 3 .5 1.6 Q2.3 .3 2.3 -2.7 Z"
        :"M-2.4 -2.9 Q.2 -3.6 2 -2.2 C4 -.9 5.6 -.2 5.8 1.3 Q5.4 3.1 3.2 3.3 Q1.1 3.2 -.6 1.7 Q-2.2 .6 -2.4 -2.9 Z"},
  ];
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
