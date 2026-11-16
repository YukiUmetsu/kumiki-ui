import type {RisoCharacterPart,RisoCharacterSpec,RisoJointFrame,RisoCharacterFrame} from "../../registry/video/riso-character";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import {HAND_POSES} from "../../registry/anatomy/anatomy-pose";
import {SURFACE_FORMS,ANSUR} from "../../registry/anatomy/anatomy-reference";
import {RISO31_GEOMETRY} from "./riso31-finger-phalanges";

/**
 * RISO30 | ArtCraft + ANAT1.
 *
 * Two original red-plate glove/hand illustrations, not real skin or copied
 * photographs. ANAT1 supplies the metacarpal fan and digital-length topology;
 * actual source SVGs and real cobalt/vermilion print geometry remain editable.
 *
 * Drawing grammar:
 * - raised middle knuckle; index/ring progressively shorter and asymmetric
 * - thumb thenar muscle originates at the wrist (not a fifth parallel finger)
 * - nail-bed short curves follow the digit itself, in joint-local coordinates
 * - skin folds and tendons track their printed finger joint, no loose dots
 * - blue ink engraves tiny contact planes over RED printed glove mass
 *
 * No geometry is painted on an overlay canvas or as an after-the-fact RGB
 * postprocessing filter. RISO30 maintains the exact existing 24fps stage,
 * wrist anchors, IK, physical handoff timing and original finger names.
 */
export const RISO30_ANAT1_HAND = {
  source:"Kumiki ANAT1 hand poses and knuckle-arc surface anatomy",
  anatomicalKnuckleIds:SURFACE_FORMS.filter(x=>x.region==="hand").map(x=>x.id),
  handLengthMedianMm:ANSUR.male.measurements.handlength.p50,
  gripPose:HAND_POSES.grip(".R"),
  pinchPose:HAND_POSES.pinch(".R"),
  relaxedPose:HAND_POSES.relaxed(".R"),
  // Source 2D print units; measured against the original wrist-local
  // geometric hand contours, NOT asserted as population anthropometry.
  authoredFingerTipUnits:{index:19,middle:21,ring:18,pinky:14,thumb:10},
  engravingWidthUnits:1.15,
} as const;

export type RisoHandActor="courier"|"paper-artist";
export type RisoHandSide="left"|"right";

/** Per-actor original vector paths. The two identities do not share a
 * mirrored decorative stamp: Courier's ink is the brisk, harder pressure
 * of a messenger, while Artist has a softer hand-sketch/readability rhythm.
 */
const groove=(actor:RisoHandActor, side:RisoHandSide)=>{
  const hand=side+"-palm-surface";
  const i=side+"-index",m=side+"-middle",r=side+"-ring",p=side+"-pinky",t=side+"-thumb";
  const courier=actor==="courier";
  const red=(id:string,joint:string,d:string):RisoCharacterPart=>({
    id:side+"-glove-"+id,joint,plate:"red",paint:"screen",screenTone:"light",d,
  });
  const blue=(id:string,joint:string,d:string):RisoCharacterPart=>({
    id:side+"-glove-"+id,joint,plate:"blue",paint:"solid",d,
  });
  const original:RisoCharacterPart[]=[
    // Dorsal metacarpal arch: ascending second and third knuckles with a
    // smaller ulna-side contour. Irregular hand-drawn contour, not straight
    // parallel metacarpal stripes.
    blue("knuckle-arc",hand,courier
      ?"M-8.1 4.6 Q-5.7 2.3 -3.7 3.8 Q-.4 1.9 1.6 3.5 Q4.2 3 7.5 5.8 L7.2 6.5 Q4.0 4.5 1.8 4.6 Q-.7 3 -3.7 4.9 Q-5.4 3.5 -7.9 5.6 Z"
      :"M-8.0 4.6 Q-5.5 2.8 -3.4 4.1 Q-.5 2.3 1.8 3.7 Q4.7 3.5 7.7 5.9 L7.3 6.4 Q4.4 4.7 1.5 4.7 Q-.5 3.3 -3.5 5.2 Q-5.6 3.9 -7.6 5.5 Z"),
    // Thumb origin is the fleshy, directional thenar triangular pad, not
    // an extra stick attached to a circular palm.
    red("thenar-plane",hand,side==="right"
      ?(courier?"M7.6 -6.6 C8.4 -2.5 5.1 1 2.4 3.7 Q1.7 4.8 -.3 5 Q3.2 5.6 5.3 3.7 C8.5 1.8 9 -2.7 7.6 -6.6 Z"
        :"M7.3 -6 Q7.7 -2.2 4.6 1.7 C2.6 4.1 1 4.4 -.4 5 Q4.2 5 6.5 1.6 Q8.8 -1.9 7.3 -6 Z")
      :(courier?"M-7.6 -6.6 C-8.4 -2.5 -5.1 1 -2.4 3.7 Q-1.7 4.8 .3 5 Q-3.2 5.6 -5.3 3.7 C-8.5 1.8 -9 -2.7 -7.6 -6.6 Z"
        :"M-7.3 -6 Q-7.7 -2.2 -4.6 1.7 C-2.6 4.1 -1 4.4 .4 5 Q-4.2 5 -6.5 1.6 Q-8.8 -1.9 -7.3 -6 Z")),
    blue("thenar-fold",hand,side==="right"
      ?(courier?"M6.9 -5.6 C5.8 -2.5 4 0 2 1.8 Q3.7 1.1 5.5 -.5 Q7 -2.6 6.9 -5.6 Z"
        :"M6.8 -5.2 Q5.8 -2 3.7 .1 Q3 1 1.7 1.8 Q4.2 .7 5.6 -1 Q7 -2.8 6.8 -5.2 Z")
      :(courier?"M-6.9 -5.6 C-5.8 -2.5 -4 0 -2 1.8 Q-3.7 1.1 -5.5 -.5 Q-7 -2.6 -6.9 -5.6 Z"
        :"M-6.8 -5.2 Q-5.8 -2.0 -3.7 .1 Q-3 1 -1.7 1.8 Q-4.2 .7 -5.6 -1 Q-7 -2.8 -6.8 -5.2 Z")),
    blue("wrist-crease",hand,courier
      ?"M-7.8 -8.2 Q-2.9 -6.8 2.4 -8.1 Q4.1 -8.5 6.7 -7.3 L6.3 -6.6 Q4.1 -7.7 2.3 -7.2 Q-3.3 -5.9 -7.5 -7.3 Z"
      :"M-7.9 -7.8 Q-3.2 -7.2 .1 -7.7 Q3.9 -8.7 6.7 -7.2 L6.5 -6.5 Q3.6 -7.7 .2 -7 Q-3.6 -6.3 -7.5 -6.9 Z"),
    // Each nail is a separate, anchored, JOINT-LOCAL curved surface. These
    // source blue contours retain eccentric highlights at 4× crop without
    // becoming giant circles at native 1.1× film.
    blue("index-nail",i,courier
      ?"M-.3 14.8 Q1.2 13.7 2.7 14.2 L2.8 14.8 Q1.1 14.4 -.3 15.5 Z"
      :"M-.3 14.9 Q1.1 13.8 2.6 14.4 L2.7 15 Q1.3 14.5 -.2 15.6 Z"),
    blue("middle-nail",m,courier
      ?"M-1 15.3 Q.6 14.1 2.4 15.2 L2.4 15.8 Q.6 14.8 -.8 16.1 Z"
      :"M-1 15.4 Q.5 14.2 2.3 15.3 L2.4 15.8 Q.5 14.9 -.9 16.2 Z"),
    blue("ring-nail",r,courier
      ?"M-.7 13.3 Q.4 12.5 2.1 13.2 L2 13.8 Q.4 13.2 -.6 14 Z"
      :"M-.7 13.3 Q.4 12.6 2 13.2 L2 13.7 Q.3 13.2 -.5 14 Z"),
    blue("thumb-nail",t,side==="right"
      ?(courier?"M3.0 -4.4 Q5.9 -4.9 7.9 -3.4 L7.4 -2.8 Q5.7 -4.2 3.0 -3.6 Z"
        :"M3.0 -4.5 Q5.8 -5.0 7.6 -3.5 L7.1 -2.9 Q5.4 -4.2 3.0 -3.7 Z")
      :(courier?"M-3.0 -4.4 Q-5.9 -4.9 -7.9 -3.4 L-7.4 -2.8 Q-5.7 -4.2 -3.0 -3.6 Z"
        :"M-3.0 -4.5 Q-5.8 -5.0 -7.6 -3.5 L-7.1 -2.9 Q-5.4 -4.2 -3.0 -3.7 Z")),
    // PIP/DIP bending architecture is encoded in independent source finger
    // paths today; these asymmetric joint folds follow the original digit
    // pivots. Full independent phalange bones are the next rig milestone.
    blue("index-joint-crease",i,courier
      ?"M-.6 5.5 Q1.4 4.8 3.4 5.5 L3.2 6.2 Q1.2 5.8 -.4 6.3 Z M-.3 10.5 Q1.7 9.8 3.5 10.4 L3.3 11 Q1.2 10.6 -.3 11.2 Z"
      :"M-.4 5.4 Q1.8 4.8 3.2 5.7 L3.1 6.2 Q1.2 5.7 -.2 6.3 Z M0 10.5 Q1.6 9.9 3.2 10.5 L3.2 11.1 Q1.6 10.5 0 11.1 Z"),
    blue("middle-joint-crease",m,courier
      ?"M-1.7 5.1 Q.5 4.4 3 5.3 L2.9 6 Q.4 5.2 -1.5 5.9 Z M-1.5 11.1 Q.5 10.3 3.1 11.3 L2.9 12 Q.5 11.2 -1.4 11.8 Z"
      :"M-1.6 5.4 Q.6 4.5 3 5.5 L2.9 6.1 Q.3 5.5 -1.5 6 Z M-1.5 11.4 Q.7 10.4 3 11.4 L2.8 12 Q.5 11.3 -1.4 12 Z"),
    blue("pinky-nail",p,courier
      ?"M-.4 9.4 Q.5 8.7 1.7 9.4 L1.7 10 Q.4 9.3 -.3 10.1 Z"
      :"M-.4 9.4 Q.5 8.8 1.6 9.4 L1.6 10 Q.4 9.3 -.3 10.2 Z"),
    blue("ring-joint-crease",r,courier
      ?"M-1.7 5.6 Q.5 4.9 2.5 5.7 L2.4 6.3 Q.2 5.7 -1.5 6.2 Z M-1.4 10.8 Q.4 10.1 2.5 10.9 L2.3 11.5 Q.3 10.9 -1.3 11.5 Z"
      :"M-1.7 5.6 Q.4 4.9 2.5 5.9 L2.4 6.4 Q.3 5.8 -1.5 6.4 Z M-1.4 10.8 Q.4 10.2 2.5 10.9 L2.3 11.5 Q.1 10.9 -1.3 11.5 Z"),
    blue("pinky-joint-crease",p,courier
      ?"M-1.4 4.4 Q.3 3.8 2.1 4.5 L2 5 Q.4 4.6 -1.3 5.1 Z M-1.2 7.7 Q.4 7.2 2.1 7.8 L2.0 8.3 Q.3 7.8 -1.1 8.4 Z"
      :"M-1.3 4.5 Q.3 3.9 2 4.5 L1.9 5.1 Q.3 4.5 -1.2 5.2 Z M-1.2 7.7 Q.4 7.2 2 7.8 L1.9 8.4 Q.3 7.8 -1.1 8.4 Z"),
    red("dorsal-tendon",hand,courier
      ?"M-2 -3 C-1 0 .7 3.5 1.2 6 Q1.8 6.9 2.1 7.6 Q1.2 5 -1 2 Q-2.7 -.9 -2 -3 Z"
      :"M-2.7 -2.9 Q-2 1.5 .5 5.5 Q1.4 7 1.8 7.7 Q-.4 5.6 -2.3 1.7 Q-3.5 -1.1 -2.7 -2.9 Z"),
  ];
  // RISO31: the ink marks cannot keep their old rigid MCP transform after
  // the actual red finger shape bends. Apply the ORIGINAL independently
  // observed detail grammar to the respective real PIP/DIP joint. The
  // trimmed nail rim is at the actual moving fingertip, not an old
  // coordinate that floats on the paper when the new bone rotates.
  const adjusted=original.map(part=>{
    const prefix=side+"-glove-";
    if(!part.id.startsWith(prefix))return part;
    const id=part.id.slice(prefix.length);
    if(id==="thumb-nail"){
      // This nail is now genuinely carried by the moving IP pad, not
      // a static blue sticker on the root during paper pinch.
      return {...part,joint:side+"-thumb-ip",
        d:side==="right"
          ?"M-.85 4.35 Q.1 4.1 1.0 4.36 L.96 4.88 Q.08 4.65 -.82 4.96 Z"
          :"M-1.0 4.3 Q-.1 4.0 .86 4.36 L.8 4.9 Q-.03 4.66 -.94 4.93 Z"};
    }
    const nail=/^(index|middle|ring|pinky)-nail$/.exec(id);
    if(nail){
      const digit=nail[1] as keyof typeof RISO31_GEOMETRY;
      const distal=RISO31_GEOMETRY[digit].distal;
      const near=Number((distal-1.5).toFixed(2));
      const tip=Number((distal-.7).toFixed(2));
      const halfWidth=Number((RISO31_GEOMETRY[digit].width*.54).toFixed(2));
      const variation=courier?.15:.28;
      return {...part,joint:side+"-"+digit+"-dip",
        d:`M${-halfWidth} ${near} Q-.05 ${Number((near-variation).toFixed(2))} ${halfWidth} ${near}
L${halfWidth} ${tip} Q0 ${Number((near+.35).toFixed(2))} ${-halfWidth} ${tip} Z`};
    }
    const crease=/^(index|middle|ring|pinky)-joint-crease$/.exec(id);
    if(crease){
      const digit=crease[1];
      const width=Number((RISO31_GEOMETRY[digit as keyof typeof RISO31_GEOMETRY].width*.9).toFixed(2));
      return {...part,joint:side+"-"+digit+"-pip",
        d:`M${-width} -1.22 Q0 -1.75 ${width} -1.22 L${width} -.94 Q0 -1.40 ${-width} -.92 Z
M${Number((-width*.76).toFixed(2))} .75 Q0 .40 ${Number((width*.76).toFixed(2))} .79 L${Number((width*.74).toFixed(2))} 1.09 Q0 .75 ${Number((-width*.75).toFixed(2))} 1.08 Z`};
    }
    return part;
  });
  const distalInk=(["index","middle","ring","pinky"] as const).map(digit=>{
    const width=Number((RISO31_GEOMETRY[digit].width*.8).toFixed(2));
    // Two microengraved pressure folds remain independent and source-drawn,
    // but the DIP uses a physically screened LIGHT cobalt master. The old
    // fully solid pair formed thick tiger stripes at original 6.2× review.
    return {...blue(digit+"-dip-crease",side+"-"+digit+"-dip",
      `M${-width} -1.22 Q0 -1.62 ${width} -1.17 L${width} -.87 Q0 -1.27 ${-width} -.88 Z
M${Number((-width*.78).toFixed(2))} .65 Q.05 .38 ${Number((width*.70).toFixed(2))} .76 L${Number((width*.70).toFixed(2))} 1.06 Q0 .74 ${Number((-width*.78).toFixed(2))} 1.05 Z`),
      paint:"screen" as const,screenTone:"light" as const};
  });
  const thumbIpInk={...blue("thumb-ip-crease",side+"-thumb-ip",
    side==="right"
      ?"M-1.3 -1.2 Q-.6 -1.55 .4 -.9 L.2 -.62 Q-.45 -1.18 -1.27 -.78 Z"
      :"M1.3 -1.18 Q.45 -1.56 -.45 -.94 L-.3 -.62 Q.5 -1.1 1.3 -.77 Z"),
    paint:"screen" as const,screenTone:"light" as const};
  return [...adjusted,...distalInk,thumbIpInk];
};

/** Source-only new art; never mutates or rewrites original expression keys. */
export function risoHandArtcraftParts(actor:RisoHandActor,side:RisoHandSide):readonly RisoCharacterPart[]{
  return groove(actor,side);
}
export const RISO30_GRIP_FOREGROUND_IDS=(side:RisoHandSide):readonly string[]=>[
  side+"-glove-index-nail",side+"-glove-middle-nail",side+"-glove-ring-nail",
  side+"-glove-thumb-ip-crease",
  side+"-glove-thumb-nail",side+"-glove-pinky-nail",
  side+"-glove-index-joint-crease",side+"-glove-middle-joint-crease",
  side+"-glove-ring-joint-crease",side+"-glove-pinky-joint-crease",
  // RISO31 independent distal phalanx creases print in the over-the-letter
  // blue hand pass instead of being buried under the moving paper.
  side+"-glove-index-dip-crease",side+"-glove-middle-dip-crease",
  side+"-glove-ring-dip-crease",side+"-glove-pinky-dip-crease",
];

/** Production inspection: hand region topology, data-backed referent and
 * source joint continuity. A true photo likeness needs independent checks.
 */
export function inspectRisoHandArtcraft(spec:RisoCharacterSpec,frame:number,side:RisoHandSide){
  const pose=evaluateRisoCharacter(spec,frame);
  const joint=(id:string):RisoJointFrame=>{
    const j=pose.joints.find(j=>j.id===id);
    if(!j)throw new Error("RISO30 source finger joint missing: "+id);
    return j;
  };
  const palm=joint(side+"-hand");
  const digits=(["thumb","index","middle","ring","pinky"] as const).map(id=>joint(side+"-"+id));
  const len=(a:RisoJointFrame,b:RisoJointFrame)=>Math.hypot(a.x-b.x,a.y-b.y);
  const source=spec.parts.filter(p=>p.id.startsWith(side+"-glove"));
  const layers=new Set(source.map(p=>p.plate));
  const newParts=groove(spec.id as RisoHandActor,side);
  return {
    frame,side,palm:{x:palm.x,y:palm.y},palmToFingerRoots:digits.map(d=>len(palm,d)),
    fingers:digits.map(d=>d.id),sourceCount:source.length,
    actuallyEngraved:newParts.every(n=>source.some(p=>p.id===n.id&&p.joint===n.joint&&p.d===n.d)),
    plateNames:[...layers].sort(),independentDigitTransforms:digits.every((j,k)=>digits.findIndex(d=>d.x===j.x&&d.y===j.y)===k),
    referenceKnuckleCount:RISO30_ANAT1_HAND.anatomicalKnuckleIds.length,
  };
}

/** Layout for the REAL original two-spot printed hand and skinned forearm.
 *
 * A hand can swing ~90 degrees between the 46f waiting and 160f paper
 * contact cels. Centering the static wrist caused a hand with all five
 * extended fingers to clip against the right edge of the Artist's preview,
 * even though the film source itself was valid. Frame the posed anatomical
 * silhouette, including the distinct elbow, thumb and fifth fingertip.
 *
 * This is a VIEWPORT crop only. It never changes the original character
 * pose, stage, paper-handoff anchors, ink deposits or source path topology.
 */
export function layoutRisoHandArtcraft(
  pose:RisoCharacterFrame,side:RisoHandSide,
  requestedZoom:number,width:number,height:number,
){
  if(!(requestedZoom>0&&width>80&&height>80))throw new RangeError("RISO30 hand layout requires positive crop dimensions");
  const j=(id:string)=>{
    const out=pose.joints.find(v=>v.id===side+"-"+id);
    if(!out)throw new Error("RISO30 crop missing source joint "+side+"-"+id);
    return out;
  };
  const project=(joint:RisoJointFrame,x:number,y:number):readonly [number,number]=>{
    const m=joint.matrix;
    return [m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f] as const;
  };
  const points:(readonly [number,number])[]=[];
  const box=(joint:RisoJointFrame,l:number,t:number,r:number,b:number)=>{
    points.push(project(joint,l,t),project(joint,r,t),project(joint,l,b),project(joint,r,b));
  };
  // Explicit connected named anatomy, not a fake head-size rectangle or
  // invented reference figure. Source contours are wholly inside these
  // conservative digit/forearm extents at every authored gesture.
  box(j("elbow"),-12,-5,12,7); // skinned forearm root
  box(j("hand"),-12,-6,12,22); // widest metacarpal/palm wedge
  for(const [name,endY] of Object.entries({index:21,middle:23,ring:21,pinky:17})){
    box(j(name),-4,-4,5,endY);
    // A real bend may project beyond the formerly straight MCP finger
    // proxy. Use the actual moving PIP and DIP bones for the studio crop.
    const source=RISO31_GEOMETRY[name as keyof typeof RISO31_GEOMETRY];
    box(j(name+"-pip"),-4,-3,5,source.intermediate+3);
    box(j(name+"-dip"),-4,-3,5,source.distal+2.5);
  }
  box(j("thumb"),-12,-8,12,6); // radial opposition, both handednesses
  box(j("thumb-ip"),-6,-4,6,5); // independently printed distal thumb
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
  const centerX=(left+right)/2,centerY=(top+bottom)/2;
  const scale=Math.min(requestedZoom,(width-72)/Math.max(1,right-left),(height-70)/Math.max(1,bottom-top));
  const x=width/2-centerX*scale,y=height/2-centerY*scale;
  const paperBounds={left:left*scale+x,right:right*scale+x,
    top:top*scale+y,bottom:bottom*scale+y};
  return {x,y,scale,sourceBounds:{left,right,top,bottom},paperBounds,
    marginX:Math.min(paperBounds.left,width-paperBounds.right),
    marginY:Math.min(paperBounds.top,height-paperBounds.bottom),
  };
}
