import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import type {RisoCharacterSpec,RisoJointFrame} from "../../registry/video/riso-character";
import {RISO31_GEOMETRY} from "./riso31-finger-phalanges";
import {RISO32_THUMB_GEOMETRY,riso32ThumbDistalId} from "./riso32-thumb-ip";
import {riso36ContourClearance,riso36WorldContour} from "./riso36-red-silhouette-gate";

/** RISO39 visual-production inspection: fingertip opposition from actual
 * evaluated SOURCE JOINT matrices and closed moving RED print stencils.
 * Never report this projected 2D distance as clinically observed 3D touch.
 */
const framePoint=(joint:RisoJointFrame,x:number,y:number)=>{
  const m=joint.matrix;
  return {x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};
};
const gap=(a:{x:number;y:number},b:{x:number;y:number})=>
  Math.hypot(a.x-b.x,a.y-b.y);
export function inspectRiso39OpposedPaperPinch(
  actor:RisoCharacterSpec,frame:number,side:"left"|"right",
){
  const pose=evaluateRisoCharacter(actor,frame);
  const joints=new Map(pose.joints.map(j=>[j.id,j]));
  const parts=new Map(pose.parts.map(p=>[p.id,p]));
  const required=(name:string)=>{
    const joint=joints.get(side+"-"+name);
    if(!joint)throw new Error("RISO39 missing living source joint "+side+"-"+name);
    return joint;
  };
  const thumb=required("thumb"),ip=required("thumb-ip"),
    index=required("index"),pip=required("index-pip"),dip=required("index-dip");
  const distalThumb=parts.get(riso32ThumbDistalId(side));
  const distalIndex=parts.get(side+"-glove-index-distal-phalanx");
  if(!distalThumb||!distalIndex||distalThumb.plate!=="red"||distalIndex.plate!=="red")
    throw new Error("RISO39 actual opposed source-red pads missing");
  const thumbTip=framePoint(ip,0,RISO32_THUMB_GEOMETRY.distalReach);
  const indexTip=framePoint(dip,0,RISO31_GEOMETRY.index.distal);
  const sourceInkGap=riso36ContourClearance(
    riso36WorldContour(distalThumb.d,distalThumb.transform,.22),
    riso36WorldContour(distalIndex.d,distalIndex.transform,.22),
  );
  return {
    actor:actor.id,side,frame,sampledFrame:pose.sampledFrame,
    thumbTip,indexTip,tipDistance:gap(thumbTip,indexTip),
    sourceInkGap,thumbIndexPipDistance:gap(thumbTip,{x:pip.x,y:pip.y}),
    indexLocalMcpCurl:((index.angle-required("hand").angle+540)%360)-180,
    indexLocalPipCurl:((pip.angle-index.angle+540)%360)-180,
    indexLocalDipCurl:((dip.angle-pip.angle+540)%360)-180,
    thumbRootToIp:gap({x:thumb.x,y:thumb.y},{x:ip.x,y:ip.y}),
    platePair:[distalThumb.plate,distalIndex.plate] as const,
    source:"real 2D IK/FK bones, original closed vermilion tip stencils, source units" as const,
  };
}
