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

/** RISO39 / observed paper-edge pinch. A real opposed index bends its
 * PIP/DIP much more than an open hand's background three digits. Source
 * flexion stays strictly inside Kumiki ANAT1's independently recorded
 * clinical joint range, but is projected as an EDITORIAL two-dimensional
 * pose, not claimed observed three-dimensional individual anatomy.
 *
 * At contact the index tip curls back near the already moving thumb IP;
 * ring/little fingers keep the formerly passing noncrossing fan. */
const indexPipClinical=JOINTS.find(j=>j.id==="finger2-pip")?.dofs.flex;
const indexDipClinical=JOINTS.find(j=>j.id==="finger2-dip")?.dofs.flex;
if(!indexPipClinical||!indexDipClinical)throw new Error("RISO39 requires anatomical index PIP/DIP ranges");
export const RISO39_INDEX_OPPOSITION={
  reference:"ANAT1 finger2 PIP/DIP clinical maxima, Proko opposing paper-edge pinch",
  fullProjectedPipFlex:Math.min(104,indexPipClinical.max*.94),
  fullProjectedDipFlex:Math.min(70,indexDipClinical.max*.875),
  pipClinicalMax:indexPipClinical.max,
  dipClinicalMax:indexDipClinical.max,
  role:"index pinch against moving opposed thumb, not four identical curl fingers",
} as const;

/**
 * RISO42 / ArtCraft: the other 3 digits are not rigid parallel tines while
 * the index/thumb pinch a thin paper edge. True human side pinches keep the
 * support fingers softly curled into the palmar plane. Draw that gesture
 * using ORIGINAL source PIP/DIP bones, not moving their rendered SVGs as a
 * single pasted silhouette. Individually moderated ANAT1 `HAND_POSES.grip`
 * avoids a cartoon fist; the middle, ring and little fingers retain their
 * different lengths and source red anatomical contours.
 *
 * Sign is the original finger-fan curl direction; magnitude is scaled from
 * ANAT1's actual grip flexion, bounded below its joint clinical max.
 */
export const RISO42_SUPPORT_CURL={
  middle:{pipProjection:.56,dipProjection:.49,lateReceiveFactor:.72},
  ring:  {pipProjection:.56,dipProjection:.47,lateReceiveFactor:.74},
  pinky: {pipProjection:.57,dipProjection:.48,lateReceiveFactor:.77},
} as const;
const riso42Grip=HAND_POSES.grip(".R");
function riso42SupportFlex(digit:"middle"|"ring"|"pinky",joint:"pip"|"dip"){
  const cfg=RISO42_SUPPORT_CURL[digit],f=RISO31_GEOMETRY[digit];
  const clinical=riso42Grip[`finger${f.fingerIndex}-${joint}.R`]?.flex;
  const limit=JOINTS.find(j=>j.id===`finger${f.fingerIndex}-${joint}`)?.dofs.flex;
  if(clinical===undefined||!limit||clinical<0||clinical>limit.max)
    throw new Error("RISO42 needs original ANAT1 support "+digit+" "+joint);
  const factor=joint==="pip"?cfg.pipProjection:cfg.dipProjection;
  // PIP/DIP FLEXION is palmar in the same handed direction for all digits.
  // MCP fan abduction already sets ring/pinky lateral splay independently.
  const flex=clinical*factor;
  if(Math.abs(flex)>limit.max*.7)throw new RangeError("RISO42 support curl exceeds editorial ROM");
  return flex;
}

/** Explicit source 2D curvature per joint and frame. No detached nail dot.
 * The index and little finger curl toward the middle of the palm rather than
 * four parallel copies all rotating by an identical amount. */
export function riso31PhalanxJoints(side:Riso31Side):readonly RisoJoint[]{
  const result:RisoJoint[]=[];
  for(const digit of FINGERS){
    const spec=RISO31_GEOMETRY[digit],prefix=side+"-"+digit;
    const handed=side==="right"?1:-1;
    const pip=digit==="index"?
      RISO39_INDEX_OPPOSITION.fullProjectedPipFlex*handed:
      riso42SupportFlex(digit,"pip")*handed;
    const dip=digit==="index"?
      RISO39_INDEX_OPPOSITION.fullProjectedDipFlex*handed:
      riso42SupportFlex(digit,"dip")*handed;
    // RISO45: the receiving three support digits close BEFORE the thumb/\n    // index precision pinch. Their former extra six-frame delay left an\n    // open red rake outside the original paper at f160 (native print QA).\n    // Preserve the index's deliberately delayed f166 final opposition.\n    const delay=side==="left"&&digit==="index"?6:0;
    const heldReceive=side==="left"&&digit==="index";
    const supportHold=side==="left"&&digit!=="index"?
      RISO42_SUPPORT_CURL[digit].lateReceiveFactor:0;
    const atRelease=heldReceive?1:supportHold?Math.max(supportHold,.85):.58;
    const atFinal=heldReceive?1:supportHold||.14;
    result.push({
      id:prefix+"-pip",parent:prefix,x:0,y:spec.proximal,keys:[
        {frame:0,rotate:0,easing:"ease"},
        {frame:96,rotate:1*handed*(digit==="index"?spec.curlDirection:1),easing:"ease"},
        {frame:126,rotate:2*handed*(digit==="index"?spec.curlDirection:1),easing:"ease"},
        // Support digits begin their inward tuck only when the page comes
        // into fingertip range. Earlier f126–140 global curl made the
        // ring/little source-bone axes graze the neighboring fingers.
        ...(digit==="index"?[]:[{frame:146+delay,
          rotate:3*handed,easing:"ease" as const}]),
        {frame:160+delay,rotate:pip,easing:"ease"},
        ...(side==="right"&&digit==="index"?[{frame:178,rotate:pip,easing:"ease" as const}]:[]),
        {frame:180+delay+(side==="right"&&digit==="index"?6:0),rotate:pip*atRelease,easing:"ease"},
        {frame:205,rotate:pip*atFinal,easing:"ease"},
        {frame:239,rotate:pip*atFinal},
      ],
    },{
      id:prefix+"-dip",parent:prefix+"-pip",x:0,y:spec.intermediate,keys:[
        {frame:0,rotate:0,easing:"ease"},
        {frame:96,rotate:0,easing:"ease"},
        {frame:126,rotate:0,easing:"ease"},
        ...(digit==="index"?[]:[{frame:146+delay,rotate:0,easing:"ease" as const}]),
        {frame:160+delay,rotate:dip,easing:"ease"},
        ...(side==="right"&&digit==="index"?[{frame:178,rotate:dip,easing:"ease" as const}]:[]),
        {frame:180+delay+(side==="right"&&digit==="index"?6:0),rotate:dip*atRelease,easing:"ease"},
        {frame:205,rotate:dip*atFinal,easing:"ease"},
        {frame:239,rotate:dip*atFinal},
      ],
    });
  }
  return result;
}
export function riso31SegmentIds(side:Riso31Side):readonly string[]{
  return FINGERS.flatMap(d=>[`${side}-glove-${d}-middle-phalanx`,
    `${side}-glove-${d}-distal-phalanx`]);
}

/** RISO38 ArtCraft red source silhouettes — not capsules or tapering
 * rectangles. Study: Proko "Details for Realistic Hands" anatomical image:
 * proximal is fuller and cushioned, middle is comparatively flat/straight,
 * distal is an asymmetrical upswept wedge. The hidden cap extension is
 * retained for actual PIP/DIP joint continuity in the native Riso print.
 * Per-digit asymmetry keeps little/index from being mirror-stamped sausages.
 *
 * Do not infer a photorealistic profile; this remains authored 2D projection
 * tied to the exact original ANAT1 source bone pivots and moving nail marks.
 */
export const RISO38_SOURCE_SHAPE = {
  curveStage:["proximal-fleshy","intermediate-flat","distal-pulp-wedge"] as const,
  pipOverlap:2.3,
  dipOverlap:2.3,
  midsectionTaper:.89,
  finalTipTaper:.86,
  reference:"Proko How to Draw HANDS — Details for Realistic Hands!",
} as const;
function pathFor(kind:"proximal"|"middle"|"distal",length:number,width:number,digit:Riso31Finger){
  const w=width,L=length;
  // Ink coverage slightly off-axis to avoid the same flat tube profile
  // on all four distinct phalanges. Controls alter the DRAWN paths only,
  // not the clinical source anchors or their time-dependent transforms.
  const drift=digit==="index"?.14:digit==="middle"?-.12:digit==="ring"?.18:-.22;
  const n=(v:number)=>Number(v.toFixed(3));
  const c=(x:number,y:number)=>`${n(x)} ${n(y)}`;
  if(kind==="proximal"){
    const left=-w*.84,right=w*.86,bulge=w*1.09;
    return `M${c(left,-2.3)}
C${c(-w*.99,-3.03)} ${c(-w*1.19,-.54)} ${c(-bulge,1.37)}
C${c(-w*1.24,L*.27)} ${c(-w*1.18+drift*.2,L*.49)} ${c(-w*.98+drift*.3,L*.70)}
Q${c(-w*.89+drift*.27,L*.89)} ${c(-w*.79+drift*.3,L+1.9)}
C${c(-w*.41+drift*.4,L+2.9)} ${c(w*.21+drift*.4,L+2.95)} ${c(w*.62+drift*.3,L+2.12)}
Q${c(w*.9+drift*.2,L+1.07)} ${c(w*.89+drift*.1,L-.38)}
C${c(w*.94,L*.64)} ${c(w*1.01,L*.25)} ${c(right,1.04)}
C${c(w*.79,-1.29)} ${c(w*.71,-2.8)} ${c(w*.19,-2.93)}
Q${c(-w*.4,-3.37)} ${c(left,-2.3)} Z`;
  }
  if(kind==="middle"){
    // Middle phalanx: smaller, firmer side planes; not another inflated
    // proximal pot belly. Preserve thin real flexor pads at the PIP capsule.
    return `M${c(-w*.78,-2.3)}
C${c(-w*1.03,-3.15)} ${c(-w*1.13,-.8)} ${c(-w*1.01,1.12)}
Q${c(-w*.97,L*.42)} ${c(-w*.87+drift*.2,L-.61)}
C${c(-w*.92+drift*.1,L+.25)} ${c(-w*.65+drift*.3,L+1.84)} ${c(-w*.35+drift*.3,L+2.23)}
Q${c(w*.03+drift*.3,L+2.69)} ${c(w*.41+drift*.3,L+2.07)}
C${c(w*.86+drift*.2,L+1.45)} ${c(w*.88,L+.08)} ${c(w*.82,L-.63)}
Q${c(w*.92,L*.38)} ${c(w*.83,1.12)}
C${c(w*.76,-.79)} ${c(w*.52,-3.02)} ${c(-w*.04,-2.87)}
C${c(-w*.37,-3.16)} ${c(-w*.59,-2.91)} ${c(-w*.78,-2.3)} Z`;
  }
  // Distal phalanx: a tiny, unambiguously *nonsymmetric* palmar pad and
  // tipped nail wedge. The fat pad squashes toward the bend while the
  // dorsal upper plane turns flatter. The blue nail is in the same real
  // moving DIP joint, not positioned by a screenshot.
  const offset=drift*.6;
  return `M${c(-w*.77,-2.3)}
C${c(-w*1.04,-3.03)} ${c(-w*1.14,-.53)} ${c(-w*1.03,1.09)}
C${c(-w*.99,L*.35)} ${c(-w*.96+offset*.3,L*.61)} ${c(-w*.84+offset*.5,L-.84)}
C${c(-w*.9+offset*.4,L-.06)} ${c(-w*.52+offset*.6,L+.78)} ${c(-w*.02+offset,L+1.03)}
C${c(w*.39+offset,L+1.15)} ${c(w*.85+offset*.7,L+.62)} ${c(w*.95+offset*.4,L-.21)}
Q${c(w*1.13+offset*.3,L-1.19)} ${c(w*.95+offset*.2,L*.48)}
C${c(w*.81,L*.14)} ${c(w*.89,-.68)} ${c(w*.55,-2.43)}
C${c(w*.29,-3.03)} ${c(-w*.18,-3.16)} ${c(-w*.49,-2.81)}
Q${c(-w*.63,-2.59)} ${c(-w*.77,-2.3)} Z`;
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
