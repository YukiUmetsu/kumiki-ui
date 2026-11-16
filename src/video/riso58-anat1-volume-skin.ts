import type {RisoCharacterSpec,RisoJointFrame,RisoMatrix}
  from "../../registry/video/riso-character";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import {RISO31_GEOMETRY} from "./riso31-finger-phalanges";
import {riso51SourceKeys} from "./riso51-view-conditioned-source";
import {
  riso57PalmLandmarks,riso57PalmContourFromKnots,
} from "./riso57-palm-contact-silhouette";
import type {
  Riso57Actor,Riso57Side,Riso57PalmKnot,Riso57SurfaceLandmark,
} from "./riso57-palm-contact-silhouette";

/**
 * RISO58 / ANAT1 — a constrained 3D INTERPRETATION of the actual printed
 * joint rig, not another independently sketched mitt or photo-traced hand.
 *
 * RISO49–57's original four two-dimensional MCP/PIP/DIP skeleton joints are
 * projections of true-length bone rays. Given a true ANAT1 bone length L and
 * its 2D root-to-tip distance d, its lost depth magnitude is
 * sqrt(max(0,L²-d²)). Recover this depth at f160; its sign is deliberately
 * authored from the reference camera (the three far support fingers curl
 * behind the radial paper pinch). The sign is NOT inferable from 2D alone.
 *
 * Place the actual four knuckles, index/thumb web, thenar mass and
 * hypothenar heel on a SINGLE continuous positive RED source silhouette.
 * Project spatial depth from the same real signed 3D view for every knot.
 * The 16 original C1 cubic joins and all separately printed blue creases,
 * nails, original articulated bone sources and real sheet pressure survive.
 *
 * This is a 2.5D volumetric source reconstruction using measured existing
 * ANAT1 segment LENGTHS, not a calibrated scan or physically simulated
 * deformable-flesh mesh. A separate artistic review is still mandatory.
 */
export type Riso58Actor=Riso57Actor;
export type Riso58Side=Riso57Side;
export type Riso58Digit="index"|"middle"|"ring"|"pinky";
export interface Riso58Vec3 {readonly x:number;readonly y:number;readonly z:number}
export interface Riso58Bone {
  readonly digit:Riso58Digit;
  readonly mcp:Riso58Vec3;
  readonly pip:Riso58Vec3;
  readonly dip:Riso58Vec3;
  readonly trueProximal:number;
  readonly trueIntermediate:number;
  readonly projectedProximal:number;
  readonly projectedIntermediate:number;
  readonly depthProximal:number;
  readonly depthIntermediate:number;
  readonly side:"radial"|"ulnar";
}
export const RISO58_ANAT1_SURFACE={
  reference:"ANAT1 four independent MCP/PIP/DIP true lengths and HAND_POSES.pinch; real side-pinch photography",
  reconstruction:"sqrt(L²-d²) recovers absolute 3D bone depth from original moving source joints",
  ambiguity:"depth sign authored; one 2D view cannot determine actual hidden 3D surfaces",
  realViewYawDegrees:65,
  realViewPitchDegrees:-13,
  depthToCameraWeight:.67,
  originalSourceKnots:16,
  sourcePartIds:["right-glove","left-glove"] as const,
  output:"one original moving 16-C1 RED palm, no additional ink part or pixel post-effect",
} as const;

const n=(v:number)=>Number(v.toFixed(4));
const vec=(x:number,y:number,z:number):Riso58Vec3=>({
  x:n(x),y:n(y),z:n(z),
});
const length2=(a:Riso58Vec3,b:Riso58Vec3)=>
  Math.hypot(a.x-b.x,a.y-b.y);
const boneDepth=(trueLength:number,projected:number)=>
  Math.sqrt(Math.max(0,trueLength*trueLength-
    Math.min(trueLength,projected)**2));

/** Convert already evaluated ANAT1 WORLD skeleton positions back into the
 * genuine named palm joint's local source plane. Crucial: the real Courier
 * wrist rotates and the Paper Artist's palm lies on its side in f160.
 * Read the exact inverted hand matrix, not a guessed linear pose or
 * hardcoded screen-coordinate joint.
 */
export function riso58InverseHandPoint(
  hand:RisoMatrix,joint:Pick<RisoJointFrame,"x"|"y">,
):readonly [number,number]{
  const det=hand.a*hand.d-hand.b*hand.c;
  if(!Number.isFinite(det)||Math.abs(det)<1e-8)
    throw new RangeError("RISO58 source joint requires invertible palm matrix");
  const x=joint.x-hand.e,y=joint.y-hand.f;
  return [n((hand.d*x-hand.c*y)/det),n((-hand.b*x+hand.a*y)/det)];
}
export function riso58ReconstructedBones(
  spec:RisoCharacterSpec,side:Riso58Side,frame=160,
):readonly Riso58Bone[]{
  if(frame<0||frame>=spec.durationFrames||!Number.isInteger(frame))
    throw new RangeError("RISO58 source frame out of bounds");
  const pose=evaluateRisoCharacter(spec,frame);
  const joints=new Map(pose.joints.map(j=>[j.id,j]));
  const hand=joints.get(side+"-hand");
  if(!hand)throw new Error("RISO58 missing ANAT1 source wrist "+side);
  const local=(id:string):Riso58Vec3=>{
    const joint=joints.get(side+"-"+id);
    if(!joint)throw new Error("RISO58 missing true ANAT1 bone "+id);
    const [x,y]=riso58InverseHandPoint(hand.matrix,joint);
    return vec(x,y,0);
  };
  return (["index","middle","ring","pinky"] as const).map(digit=>{
    const g=RISO31_GEOMETRY[digit];
    const root=local(digit),pip=local(digit+"-pip"),dip=local(digit+"-dip");
    const pd=length2(root,pip),dd=length2(pip,dip);
    if(pd>g.proximal+.08||dd>g.intermediate+.08)
      throw new RangeError("RISO58 moving source bone longer than true ANAT1 segment");
    const recoveredP=boneDepth(g.proximal,pd);
    const recoveredI=boneDepth(g.intermediate,dd);
    const sign=digit==="index"?1:-1;
    const mcp=vec(root.x,root.y,0);
    const p3=vec(pip.x,pip.y,recoveredP*sign);
    const d3=vec(dip.x,dip.y,(recoveredP+recoveredI)*sign);
    return {digit,mcp,pip:p3,dip:d3,
      trueProximal:g.proximal,trueIntermediate:g.intermediate,
      projectedProximal:n(pd),projectedIntermediate:n(dd),
      depthProximal:n(recoveredP),depthIntermediate:n(recoveredI),
      side:digit==="index"?"radial":"ulnar"};
  });
}

/** One genuine orthographic yaw/pitch 3D view for the authored skin mass.
 * XY are normalized to the original ANAT1 screen-space skeleton at Z=0.
 * That calibration leaves all actual source MCP stations unshifted before
 * a volumetric skin rises toward/away from the lens.
 */
export function riso58ProjectSkinPoint(
  p:Riso58Vec3,side:Riso58Side,
):readonly [number,number]{
  if(![p.x,p.y,p.z].every(Number.isFinite))
    throw new RangeError("RISO58 skin station must be finite");
  const yaw=RISO58_ANAT1_SURFACE.realViewYawDegrees*Math.PI/180;
  const pitch=RISO58_ANAT1_SURFACE.realViewPitchDegrees*Math.PI/180;
  const sign=side==="right"?1:-1;
  const z=p.z*RISO58_ANAT1_SURFACE.depthToCameraWeight;
  // The image-aligned X/Y calibration is equivalent to taking the actual
  // homogeneous projection of (x/cosYaw,y/cosPitch,z), anchored at Z=0.
  return [n(p.x+sign*z*Math.sin(yaw)),
    n(p.y+z*Math.cos(yaw)*Math.sin(pitch))];
}
export interface Riso58ContactSource {
  readonly path:string;
  readonly bones:readonly Riso58Bone[];
  readonly anchors:readonly (Riso57PalmKnot&{readonly z:number})[];
  readonly maxSurfaceDepth:number;
  readonly maxVolumeDisplacement:number;
  readonly frame:number;
  readonly actor:Riso58Actor;
  readonly side:Riso58Side;
}

/** Build the actual single positive palm envelope from the solved ANAT1
 * local skeleton at the contact cel. All named skin stations have their
 * 3D origins derived from living MCP/PIP/DIP and CMC thumb, and share a
 * deterministic 3D view; no silent 2D landmarks disconnected from joints.
 */
export function riso58ContactSkin(
  spec:RisoCharacterSpec,actor:Riso58Actor,side:Riso58Side,frame=160,
):Riso58ContactSource{
  if(spec.id!==actor)throw new RangeError("RISO58 actor identity mismatch");
  const bones=riso58ReconstructedBones(spec,side,frame);
  const root=new Map(bones.map(b=>[b.digit,b]));
  const b=(digit:Riso58Digit)=>root.get(digit)!;
  const pose=evaluateRisoCharacter(spec,frame);
  const hand=pose.joints.find(j=>j.id===side+"-hand")!;
  const thumb=pose.joints.find(j=>j.id===side+"-thumb");
  const thumbIP=pose.joints.find(j=>j.id===side+"-thumb-ip");
  if(!thumb||!thumbIP||!hand)
    throw new Error("RISO58 missing clinical thumb opposition surface");
  const toLocal=(joint:RisoJointFrame):Riso58Vec3=>{
    const [x,y]=riso58InverseHandPoint(hand.matrix,joint);
    return vec(x,y,0);
  };
  const t=toLocal(thumb);
  const ip=toLocal(thumbIP);
  const i=b("index").mcp,m=b("middle").mcp,
    r=b("ring").mcp,p=b("pinky").mcp;
  const sign=side==="right"?1:-1;
  // A true sheet pinch gives INDEX its own near-crest. Other digits
  // derive a signed lost 3D depth from actual PIP/DIP foreshortening.
  const middleDepth=b("middle").depthProximal,
    ringDepth=b("ring").depthProximal,
    littleDepth=b("pinky").depthProximal;
  const stations:Partial<Record<Riso57SurfaceLandmark,Riso58Vec3>>={
    "thenar-bulge":vec(t.x+sign*2.35,t.y+.65,2.8),
    "first-web-inset":vec(
      t.x*.53+i.x*.47-sign*.65,
      t.y*.53+i.y*.47,
      .35+Math.min(1.3,length2(t,ip)*.12)),
    "index-mcp":vec(i.x+sign*.5,i.y+.55,1.7),
    "index-middle-web":vec(i.x*.49+m.x*.51,
      i.y*.49+m.y*.51+.62,-.45),
    "middle-mcp":vec(m.x,m.y+.70,
      -Math.max(.9,middleDepth*.34)),
    "middle-ring-web":vec(m.x*.48+r.x*.52,
      m.y*.48+r.y*.52+.65,
      -Math.max(.8,(middleDepth+ringDepth)*.16)),
    "ring-mcp":vec(r.x+sign*.22,r.y+.92,
      -Math.max(1.1,ringDepth*.42)),
    "ring-little-web":vec(r.x*.49+p.x*.51,
      r.y*.49+p.y*.51+.55,
      -Math.max(.85,(ringDepth+littleDepth)*.20)),
    "fifth-mcp":vec(p.x+sign*.28,p.y+.63,
      -Math.max(1.1,littleDepth*.44)),
    "hypothenar-heel":vec(p.x*.81,p.y*.64,
      -Math.max(.9,littleDepth*.36)),
    "pisiform-wrist":vec(p.x*.65,p.y*.23,-.8),
    "flexor-radialis":vec(t.x*.73,t.y*.21,.55),
  };
  const authored=riso57PalmLandmarks(actor,side);
  const points=authored.map(k=>{
    const original=stations[k.landmark]??vec(k.x,k.y,0);
    const [x,y]=riso58ProjectSkinPoint(original,side);
    return {...k,x,y,z:original.z};
  });
  const path=riso57PalmContourFromKnots(points);
  const maxSurfaceDepth=Math.max(...points.map(x=>Math.abs(x.z)));
  const maxVolumeDisplacement=Math.max(...points.map((x,index)=>
    Math.hypot(x.x-authored[index].x,x.y-authored[index].y)));
  if(maxVolumeDisplacement>9||maxSurfaceDepth>12)
    throw new RangeError("RISO58 skin surface would detach from ANAT1 source joints");
  return {path,bones,anchors:points,
    maxSurfaceDepth:n(maxSurfaceDepth),
    maxVolumeDisplacement:n(maxVolumeDisplacement),frame,actor,side};
}

/** Not a second pasted fill: replace the exact SAME existing RED palm
 * source's contact-view Bézier keys with the 3D joint-conditioned single
 * skin envelope. All separately animated phalanges, original ink depth,
 * 2 source pigments, blue nail creases and paper knockout IDs are untouched.
 * Create once during spec assembly; never recompute in React render.
 */
export function riso58ApplyContactSkin(
  spec:RisoCharacterSpec,actor:Riso58Actor,
):RisoCharacterSpec{
  const side=actor==="courier"?"right":"left";
  const original=spec.parts.find(p=>p.id===side+"-glove");
  if(!original||original.plate!=="red"||
    original.paint!=="solid"||!original.pathKeys)
    throw new Error("RISO58 needs actual RISO51 living RED palm source");
  const skin=riso58ContactSkin(spec,actor,side,160);
  const updated=spec.parts.map(p=>p.id===original.id?
    {...p,pathKeys:riso51SourceKeys(p.d,skin.path,actor)}:p);
  return {...spec,parts:updated};
}
