import {FACE_FEATURES,FACE_LANDMARKS} from "../../registry/anatomy/anatomy-face";
import {MODEL_TABLES,SURFACE_FORMS} from "../../registry/anatomy/anatomy-reference";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import type {RisoCharacterSpec,RisoCharacterPart} from "../../registry/video/riso-character";

/**
 * RISO29 / ArtCraft 9.1: the project ANAT1 human anatomy framework is the
 * anatomical UNDERSTRUCTURE, not a replacement press renderer. No photoreal
 * lattice vertices are pasted into an original 2-colour editorial portrait.
 *
 * Proportions of this authored adult-stylized body are intentionally NOT
 * claimed to match the 7.5-head ANAT1 adult mean. We first correct the
 * visibly disproportionate old giant head / zero visible neck, preserving
 * each character's distinct source facial landmarks and every ink layer.
 */
export const RISO29_ANAT1 = {
  evidence:"ANAT1 MakeHuman lattice: grade S, not a measured adult identity",
  headsTallAdultReference:MODEL_TABLES.byAge.male.find(x=>x.age===25)!.headsTall,
  canonicalEyeLandmarks:[FACE_LANDMARKS["exocanthion.R"],FACE_LANDMARKS["endocanthion.R"],
    FACE_LANDMARKS["endocanthion.L"],FACE_LANDMARKS["exocanthion.L"]],
  eyelidLoopLengths:[FACE_FEATURES["eye-upper.R"].loop.length,
    FACE_FEATURES["eye-lower.R"].loop.length,
    FACE_FEATURES["eye-upper.L"].loop.length,
    FACE_FEATURES["eye-lower.L"].loop.length],
  neckAnatomy:SURFACE_FORMS.filter(s=>s.region==="neck").map(s=>s.id),
  // Measured FROM EXISTING Riso printed characters, not population facts.
  oldHeadWidth:84, // hair/hat span, head-local source units
  shoulderSpan:78, // coat plus sleeve outline span, body-local units
  headSourceHeight:110, // scalp→chin source span, local units
  headScale:.48,
  neckY:-77,
  headNeckOffsetY:-23,
  coatNecklineY:-66,
} as const;

export type RisoHumanActor = "courier" | "paper-artist";

/** Ear/jaw/neck are connected volumes with open clavicle space. This is a
 * real paper knockout in the existing two-ink RisoPrint pipeline, not a
 * skin-coloured flat sticker covering the clothing after compositing.
 */
export function risoAnatomicalNeckParts(actor:RisoHumanActor):readonly RisoCharacterPart[]{
  const paper:RisoCharacterPart={
    id:"neck-skin-clearance",joint:"neck",plate:"blue",paint:"solid",
    knockoutOnly:true,
    d:actor==="courier"
      ?"M-7 -17 Q-9 -7 -9 -1 C-10 7 -15 11 -22 15 Q-17 22 -8 22 Q0 20 8 22 Q17 22 23 15 C15 11 11 6 9 -2 L7 -17 Z"
      :"M-7 -17 Q-8 -7 -7 0 C-9 8 -13 11 -19 16 Q-13 23 -6 21 Q0 20 6 21 Q14 23 21 16 C15 11 9 6 8 -1 L7 -17 Z",
  };
  const contour:RisoCharacterPart={
    id:"neck-contour",joint:"neck",plate:"blue",paint:"solid",
    d:actor==="courier"
      ?"M-8.2 -13 C-8 -3 -8 6 -13 11 Q-17 15 -21 16 L-19 18 C-12 14 -8 9 -6.5 2 Q-5 -7 -6 -13 Z M7 -13 Q8 -3 10 3 Q13 12 21 16 L20 18 C12 15 8 9 6 1 Q5 -6 5 -13 Z"
      :"M-8 -13 Q-9 -3 -8 3 Q-11 12 -18 16 L-16 18 Q-9 15 -6 5 L-5 -13 Z M6 -13 Q7 -2 9 4 Q12 12 19 16 L18 18 Q10 13 6 5 L4 -13 Z",
  };
  const plane:RisoCharacterPart={
    id:"neck-sternomastoid",joint:"neck",plate:"red",paint:"screen",screenTone:"mid",
    d:actor==="courier"
      ?"M-5 -6 Q-4 4 -11 13 Q-7 11 -4 7 Q-3 2 -5 -6 Z M5 -6 Q6 5 13 13 Q8 10 5 5 Z"
      :"M-5 -5 Q-5 7 -11 13 Q-7 11 -4 5 Z M4 -6 Q5 7 12 12 Q7 10 4 4 Z",
  };
  const clavicle:RisoCharacterPart={
    id:"neck-clavicle-insertion",joint:"neck",plate:"blue",paint:"solid",
    d:"M-21 16 Q-14 17 -6 20 Q-1 21 0 18 Q1 21 6 20 Q14 17 21 16 L20 18 Q13 19 6 22 Q0 21 -6 22 Q-13 19 -20 18 Z",
  };
  const throat:RisoCharacterPart={
    id:"neck-throat-plane",joint:"neck",plate:"red",paint:"solid",
    d:actor==="courier"
      ?"M-.8 4 Q-.1 9 1 11 Q2 13 1 15 Q0 16 -.4 14 Q-.8 12 -.8 4 Z"
      :"M-.5 5 Q.8 10 .6 13 Q-.5 15 -1 12 Z",
  };
  return [paper,contour,plane,clavicle,throat];
}

/** Structural non-identity QA from ANAT1 landmarks and original source joints.
 * This is geometry audit only: likeness still needs independently observed
 * paired portrait masks, camera-matched crops and human visual critique.
 */
export function inspectRisoAnatomy(spec:RisoCharacterSpec,frame:number){
  const pose=evaluateRisoCharacter(spec,frame);
  const find=(id:string)=>{
    const j=pose.joints.find(j=>j.id===id);
    if(!j)throw new Error("RISO29 missing anatomically connected joint: "+id);
    return j;
  };
  const head=find("head"),neck=find("neck"),body=find("body");
  const left=find("left-arm"),right=find("right-arm");
  const headScale=Math.hypot(head.matrix.a,head.matrix.b)/
    Math.max(1e-9,Math.hypot(body.matrix.a,body.matrix.b));
  const shoulderWidth=Math.hypot(left.x-right.x,left.y-right.y);
  const neckEnd={x:head.x,y:head.y};
  const neckStart={x:neck.x,y:neck.y};
  const headWidth=RISO29_ANAT1.oldHeadWidth*headScale;
  return {headScale,headWidth,shoulderWidth,headToShoulder:headWidth/shoulderWidth,
    neckLength:Math.hypot(neckEnd.x-neckStart.x,neckEnd.y-neckStart.y),
    neck:neckStart,skullBase:neckEnd,
    connected:head.parent==="neck"&&neck.parent==="body",
    printDetails:spec.parts.filter(p=>p.joint==="head").length,
    headHeight:RISO29_ANAT1.headSourceHeight*headScale,
    anatomySource:"registry/anatomy/anatomy-face.ts + anatomy-reference.ts" as const,
  };
}
