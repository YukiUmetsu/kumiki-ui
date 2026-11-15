import type {RisoCharacterPart,RisoJoint,RisoCharacterSpec,RisoJointFrame} from "../../registry/video/riso-character";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import {HAND_POSES,JOINTS} from "../../registry/anatomy/anatomy-pose";

/**
 * RISO31 / ArtCraft: a physical source-drawn 2D articulated hand, not a
 * post-effect, photo transfer or multiplied SVG transform applied to a single
 * unbendable finger. Four separately authored fingers per hand have actual
 * MCP -> PIP -> DIP bones and three OVERLAPPING red physical-print silhouettes.
 *
 * ANAT1 clinical flexion constrains the design. We deliberately use only a
 * modest 2D projection of clinical pinch angles: this is a front-facing
 * original editorial drawing, NOT an unobserved 3D pose / portrait likeness.
 */
export type Riso31Finger="index"|"middle"|"ring"|"pinky";
export type Riso31Side="left"|"right";
const FINGERS:readonly Riso31Finger[]=["index","middle","ring","pinky"] as const;

export const RISO31_GEOMETRY:Record<Riso31Finger,Readonly<{
  proximal:number;intermediate:number;distal:number;width:number;
  /** Curvature direction in the original LEFT-facing plate before mirroring. */
  curlDirection:number;fingerIndex:number;
}>>={
  index:{proximal:7.8,intermediate:6.1,distal:4.9,width:2.28,curlDirection:1,fingerIndex:2},
  middle:{proximal:8.6,intermediate:6.7,distal:5.5,width:2.45,curlDirection:.4,fingerIndex:3},
  ring:{proximal:7.3,intermediate:5.9,distal:4.7,width:2.15,curlDirection:-.7,fingerIndex:4},
  pinky:{proximal:5.6,intermediate:4.4,distal:4.2,width:1.76,curlDirection:-1,fingerIndex:5},
};

const pinch=HAND_POSES.pinch(".R");
const anatomical=(index:number,which:"pip"|"dip"):number=>{
  const v=pinch[`finger${index}-${which}.R`]?.flex;
  if(v===undefined||v<0||v>115)throw new Error("Missing clinical ANAT1 "+which+" range for digit "+index);
  return v;
};
export const RISO31_ANAT1_REFERENCE={
  model:"Kumiki ANAT1 / anatomy-pose.ts HAND_POSES.pinch",
  pipMaximum:JOINTS.find(j=>j.id==="finger2-pip")?.dofs.flex?.max??110,
  dipMaximum:JOINTS.find(j=>j.id==="finger2-dip")?.dofs.flex?.max??80,
  referenceIndexPip:anatomical(2,"pip"),
  referenceIndexDip:anatomical(2,"dip"),
  /** Camera projection gain below anatomical flexion, not clinical ROM. */
  projectedPinchFactor:.36,
  projection:"stylized source frontal 2D — no inferred 3D hand" as const,
};

/** Explicit source 2D curvature per joint and frame. No detached nail dot.
 * The index and little finger curl toward the middle of the palm rather than
 * four parallel copies all rotating by an identical amount. */
export function riso31PhalanxJoints(side:Riso31Side):readonly RisoJoint[]{
  const result:RisoJoint[]=[];
  for(const digit of FINGERS){
    const spec=RISO31_GEOMETRY[digit],prefix=side+"-"+digit;
    const handed=side==="right"?1:-1;
    const pip=anatomical(spec.fingerIndex,"pip")*
      RISO31_ANAT1_REFERENCE.projectedPinchFactor*handed*spec.curlDirection;
    const dip=anatomical(spec.fingerIndex,"dip")*
      RISO31_ANAT1_REFERENCE.projectedPinchFactor*.66*handed*spec.curlDirection;
    const delay=side==="left"?6:0;
    result.push({
      id:prefix+"-pip",parent:prefix,x:0,y:spec.proximal,keys:[
        {frame:0,rotate:0,easing:"ease"},
        {frame:96,rotate:1*handed*spec.curlDirection,easing:"ease"},
        {frame:126,rotate:2*handed*spec.curlDirection,easing:"ease"},
        {frame:160+delay,rotate:pip,easing:"ease"},
        {frame:180+delay,rotate:pip*.58,easing:"ease"},
        {frame:205,rotate:pip*.14,easing:"ease"},
        {frame:239,rotate:pip*.14},
      ],
    },{
      id:prefix+"-dip",parent:prefix+"-pip",x:0,y:spec.intermediate,keys:[
        {frame:0,rotate:0,easing:"ease"},
        {frame:96,rotate:0,easing:"ease"},
        {frame:126,rotate:0,easing:"ease"},
        {frame:160+delay,rotate:dip,easing:"ease"},
        {frame:180+delay,rotate:dip*.62,easing:"ease"},
        {frame:205,rotate:dip*.14,easing:"ease"},
        {frame:239,rotate:dip*.14},
      ],
    });
  }
  return result;
}
export function riso31SegmentIds(side:Riso31Side):readonly string[]{
  return FINGERS.flatMap(d=>[`${side}-glove-${d}-middle-phalanx`,
    `${side}-glove-${d}-distal-phalanx`]);
}

/** Original hand-drawn C/Q topology, irregular cortical edge and overlapping
 * segment caps. No generic rectangular "bones". PIP & DIP plates overlap
 * 2.4 local units to keep continuous red prints even when flexion projects
 * about 20 degrees at contact. Full original palm and wrist sources remain.
 */
function pathFor(kind:"proximal"|"middle"|"distal",length:number,width:number,digit:Riso31Finger){
  const w=width, sway=digit==="middle"?.35:digit==="pinky"?-.33:digit==="index"?.21:-.12;
  const n=(x:number)=>Number(x.toFixed(2));
  const capStart=-2.3,capEnd=kind==="distal"?length:length+2.4;
  const offset=kind==="proximal"?-.2:0;
  const l=n(-w+offset),r=n(w+offset),wide=n(w+.38),tight=n(w-.36);
  const lx=n(-w+sway),rx=n(w+sway),bl=n(-w*.9),br=n(w*.75);
  return kind==="distal"
    ? `M${l} ${capStart} C${n(-w-.35)} -3.1 ${n(-.9)} -3.5 .12 -2.6
C${n(w+.3)} -3.2 ${wide} -.6 ${r} 1.3
Q${n(w+.55)} ${n(length*.56)} ${rx} ${n(length-1.8)}
C${br} ${n(length+.1)} ${n(.65)} ${n(length+.8)} -.65 ${n(length+.55)}
Q${bl} ${n(length+.2)} ${lx} ${n(length-1.4)}
Q${n(-w-.35)} ${n(length*.45)} ${l} ${capStart} Z`
    :`M${l} ${capStart} C${n(-w-.35)} -3.4 -1.25 -3.6 .1 -2.9
C1.2 -3.4 ${n(w+.4)} -2.3 ${r} .2
Q${wide} ${n(length*.47)} ${rx} ${n(length-1.5)}
Q${n(w+.55)} ${n(length+1.3)} ${tight} ${capEnd}
C${n(w*.35)} ${n(length+2.8)} ${n(-w*.5)} ${n(length+2.45)} ${lx} ${capEnd}
Q${n(-w-.35)} ${n(length*.6)} ${l} ${capStart} Z`;
}
export function riso31FingerParts(side:Riso31Side,digit:Riso31Finger):readonly RisoCharacterPart[]{
  const g=RISO31_GEOMETRY[digit],name=side+"-glove-"+digit;
  return [
    {id:name,joint:side+"-"+digit,plate:"red",paint:"solid",
      d:pathFor("proximal",g.proximal,g.width,digit)},
    {id:name+"-middle-phalanx",joint:side+"-"+digit+"-pip",plate:"red",paint:"solid",
      d:pathFor("middle",g.intermediate,g.width*.95,digit)},
    {id:name+"-distal-phalanx",joint:side+"-"+digit+"-dip",plate:"red",paint:"solid",
      d:pathFor("distal",g.distal,g.width*.85,digit)},
  ];
}
export function riso31Inspect(spec:RisoCharacterSpec,frame:number,side:Riso31Side){
  const pose=evaluateRisoCharacter(spec,frame);
  const joints=new Map(pose.joints.map(j=>[j.id,j]));
  const parts=new Map(pose.parts.map(p=>[p.id,p]));
  const len=(a:RisoJointFrame,b:RisoJointFrame)=>Math.hypot(a.x-b.x,a.y-b.y);
  return FINGERS.map(digit=>{
    const prefix=side+"-"+digit,geometry=RISO31_GEOMETRY[digit];
    const root=joints.get(prefix),pip=joints.get(prefix+"-pip"),dip=joints.get(prefix+"-dip");
    const distal=parts.get(side+"-glove-"+digit+"-distal-phalanx");
    if(!root||!pip||!dip||!distal)throw new Error("RISO31 source phalanx absent "+prefix);
    return {digit,side,frame,root:root.id,pip:pip.id,dip:dip.id,
      rootLength:len(root,pip),intermediateLength:len(pip,dip),
      exactRedSource:distal.plate==="red"&&distal.paint==="solid"&&distal.transform.startsWith("matrix("),
      distalPartId:distal.id,
      phalanxPathCount:3,
      expectedProximal:geometry.proximal,expectedIntermediate:geometry.intermediate,
    };
  });
}
