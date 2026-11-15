import type {RisoCharacterPart,RisoCharacterSpec,RisoJoint,RisoJointFrame} from "../../registry/video/riso-character";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import {HAND_POSES,JOINTS} from "../../registry/anatomy/anatomy-pose";

/**
 * RISO32 — ArtCraft original THUMB opposition, NOT a fifth identical finger.
 *
 * ANAT1 thumb: independent CMC → MCP → one IP, no PIP/DIP. The current Riso
 * thumb root is the authored CMC-adjacent metacarpal pivot. Add two separate
 * real bone rotations, and three overlapped source ink bodies that continue
 * through grasp and release. Unlike a photo-conditioned drawing, this is
 * intentionally *frontal 2D editorial projection*, not anatomical 3D proof.
 */
export type Riso32Hand="left"|"right";
const pinch=HAND_POSES.pinch(".R");
const fist=HAND_POSES.fist(".R");
const mcpDef=JOINTS.find(j=>j.id==="thumb-mcp");
const ipDef=JOINTS.find(j=>j.id==="thumb-ip");
if(!mcpDef||!ipDef)throw new Error("RISO32 requires installed ANAT1 thumb joints");
const thumbMcp=pinch["thumb-mcp.R"]?.flex;
const thumbIp=fist["thumb-ip.R"]?.flex;
if(thumbMcp===undefined||thumbIp===undefined)throw new Error("RISO32 missing clinical hand pose data");
export const RISO32_ANAT1={
  source:"registry/anatomy/anatomy-pose.ts HAND_POSES / JOINTS",
  mcpClinicalMax:mcpDef.dofs.flex!.max,
  ipClinicalMax:ipDef.dofs.flex!.max,
  referencePinchMcp:thumbMcp,
  referenceFistIp:thumbIp,
  projectionGainMcp:.68,
  projectionGainIp:.30,
  // These are authored source-vector units for existing red glove, NOT
  // human population finger lengths or a scanned subject.
  originalProximalLength:4.8,originalIntermediateLength:4.5,
  originalDistalLength:5.0,
  sourceView:"front-authored-2d" as const,
};
/** Negative x left thumb; positive x right thumb. This lateral thumb axis
 * is anatomically different from the down-facing PIP/DIP four fingers. */
const handed=(side:Riso32Hand)=>side==="right"?1:-1;
export function riso32ThumbJoints(side:Riso32Hand):readonly RisoJoint[]{
  const k=handed(side);
  // CMC is already the original thumb joint; don't invent a second hinge
  // instead of the true short MCP/IP chain.
  const mcpAngle=k*RISO32_ANAT1.referencePinchMcp*RISO32_ANAT1.projectionGainMcp;
  const ipAngle=k*RISO32_ANAT1.referenceFistIp*RISO32_ANAT1.projectionGainIp;
  const contact=side==="right"?160:166,release=side==="right"?180:186;
  return [
    {id:side+"-thumb-mcp",parent:side+"-thumb",x:k*RISO32_ANAT1.originalProximalLength,y:0,
      keys:[
        {frame:0,rotate:0,easing:"ease"},
        {frame:96,rotate:mcpAngle*.08,easing:"ease"},
        {frame:126,rotate:mcpAngle*.17,easing:"ease"},
        {frame:contact,rotate:mcpAngle,easing:"ease"},
        {frame:release,rotate:mcpAngle*.53,easing:"ease"},
        {frame:205,rotate:mcpAngle*.15,easing:"ease"},
        {frame:239,rotate:mcpAngle*.15},
      ]},
    {id:side+"-thumb-ip",parent:side+"-thumb-mcp",x:k*RISO32_ANAT1.originalIntermediateLength,y:0,
      keys:[
        {frame:0,rotate:0,easing:"ease"},
        {frame:96,rotate:0,easing:"ease"},
        {frame:126,rotate:ipAngle*.08,easing:"ease"},
        {frame:contact,rotate:ipAngle,easing:"ease"},
        {frame:release,rotate:ipAngle*.54,easing:"ease"},
        {frame:205,rotate:ipAngle*.11,easing:"ease"},
        {frame:239,rotate:ipAngle*.11},
      ]},
  ];
}
const rounded=(x:number)=>Number(x.toFixed(2));
/** Real original ink outlines, each convex mass with a staggered anatomical
 * leading/trailing contour (small left-right creator-specific asymmetry).
 * Rounded cap overlaps 1.25 mm-sized SOURCE units, so screen registration
 * does not detach the red tip into an isolated oval.
 */
function thumbPath(side:Riso32Hand,section:"proximal"|"middle"|"distal",actor:"courier"|"paper-artist"){
  const d=handed(side);
  const length=section==="proximal"?RISO32_ANAT1.originalProximalLength:
    section==="middle"?RISO32_ANAT1.originalIntermediateLength:RISO32_ANAT1.originalDistalLength;
  const w=section==="proximal"?3.65:section==="middle"?3.12:2.72;
  const curve=actor==="courier"?.34:.57;
  const c=(x:number)=>rounded(x*d);
  const end=length+(section==="distal"?.3:1.25);
  // Source C/Q bezier outlines, not generated triangles, and not sampled
  // photograph or the auto-skinned 3D capsule.
  return `M${c(-1.1)} -${rounded(w*.79)}
C${c(1.1)} -${rounded(w+curve)} ${c(length*.36)} -${rounded(w+1)} ${c(length*.73)} -${rounded(w-.28)}
Q${c(end+.35)} -${rounded(w*.92)} ${c(end)} -${rounded(w*.32)}
Q${c(end+.45)} ${rounded(w*.58)} ${c(end-1.15)} ${rounded(w*.74)}
C${c(length*.52)} ${rounded(w+.6)} ${c(1.5)} ${rounded(w+.05)} ${c(-1.1)} ${rounded(w*.72)}
Q${c(-2.0)} 0 ${c(-1.1)} -${rounded(w*.79)} Z`;
}
export function riso32ThumbParts(side:Riso32Hand,actor:"courier"|"paper-artist"):readonly RisoCharacterPart[]{
  const prefix=side+"-glove-thumb";
  const names=[side+"-thumb",side+"-thumb-mcp",side+"-thumb-ip"];
  const solid=(name:string,joint:string,d:string):RisoCharacterPart=>({
    id:name,joint,plate:"red",paint:"solid",d,
  });
  const blue=(name:string,joint:string,d:string):RisoCharacterPart=>({
    id:name,joint,plate:"blue",paint:"screen",screenTone:"light",d,
  });
  const dir=handed(side);
  const edge=(w:number,y:number)=>rounded(w*dir);
  return [
    solid(prefix,names[0],thumbPath(side,"proximal",actor)),
    solid(prefix+"-mcp-phalanx",names[1],thumbPath(side,"middle",actor)),
    solid(prefix+"-ip-phalanx",names[2],thumbPath(side,"distal",actor)),
    // Both are real independently moving anatomical crease paths, refined
    // as light-coverage cobalt ink to avoid a heavy black ring on red hands.
    blue(prefix+"-mcp-crease",names[1],
      `M${edge(-.95,0)} -2.7 Q0 -3.15 ${edge(1.05,0)} -2.65 L${edge(1.1,0)} -2.22 Q0 -2.65 ${edge(-.92,0)} -2.25 Z
M${edge(-.72,0)} 2.02 Q0 1.78 ${edge(.72,0)} 2.05 L${edge(.73,0)} 2.36 Q0 2.12 ${edge(-.73,0)} 2.34 Z`),
    blue(prefix+"-ip-crease",names[2],
      `M${edge(-.9,0)} -2.45 Q0 -2.88 ${edge(.9,0)} -2.38 L${edge(.85,0)} -2.0 Q0 -2.46 ${edge(-.87,0)} -2.05 Z`),
  ];
}
export const riso32ThumbForegroundIds=(side:Riso32Hand):readonly string[]=>[
  side+"-glove-thumb-mcp-phalanx",side+"-glove-thumb-ip-phalanx",
  side+"-glove-thumb-mcp-crease",side+"-glove-thumb-ip-crease",
];

/** Explicitly validate actual two-bone ORIGINAL source and 2-ink part
 * registration at a sampled frame. No invented source portrait gates. */
export function inspectRiso32Thumb(spec:RisoCharacterSpec,frame:number,side:Riso32Hand){
  const pose=evaluateRisoCharacter(spec,frame);
  const j=(name:string):RisoJointFrame=>{
    const val=pose.joints.find(x=>x.id===name);
    if(!val)throw new Error("RISO32 missing actual source thumb joint "+name);
    return val;
  };
  const root=j(side+"-thumb"),mcp=j(side+"-thumb-mcp"),ip=j(side+"-thumb-ip");
  const dist=(a:RisoJointFrame,b:RisoJointFrame)=>Math.hypot(a.x-b.x,a.y-b.y);
  const own=pose.parts.filter(p=>p.id.startsWith(side+"-glove-thumb"));
  return {
    frame,root,mcp,ip,
    baseToMcp:dist(root,mcp),
    mcpToIp:dist(mcp,ip),
    mcpLocalAngle:((mcp.angle-root.angle+540)%360)-180,
    ipLocalAngle:((ip.angle-mcp.angle+540)%360)-180,
    plates:[...new Set(own.map(x=>x.plate))].sort(),
    redPieces:own.filter(p=>p.plate==="red"&&!p.knockoutOnly).length,
    movableTip:own.find(p=>p.id===side+"-glove-thumb-ip-phalanx")?.transform===
      "matrix("+[ip.matrix.a,ip.matrix.b,ip.matrix.c,ip.matrix.d,ip.matrix.e,ip.matrix.f]
        .map(x=>Number(x.toFixed(5))).join(" ")+")",
    details:own.map(x=>x.id),
  };
}
