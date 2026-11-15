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
  adultReferenceLegRatio:MODEL_TABLES.byAge.male.find(x=>x.age===25)!.legRatio,
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
  headCrownY:-77, // actual source hair crown (Courier cap / Artist bob)
  headScale:.52,
  neckY:-77,
  headNeckOffsetY:-17,
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
      ?"M-8 -13 Q-10 -4 -9 2 C-10 7 -13 9 -19 12 Q-23 14 -25 15 Q-18 14 -12 13 Q-5 12 0 13 Q5 12 12 13 Q18 14 25 15 Q23 14 19 12 C13 9 10 7 9 2 Q10 -4 8 -13 Z"
      :"M-7.5 -13 Q-9 -4 -8 3 C-10 8 -14 11 -19 14 Q-21 15 -22 16 Q-16 15 -10 13 Q-4 13 0 14 Q4 13 10 13 Q16 15 22 16 Q21 15 19 14 C14 11 10 8 8 3 Q9 -4 7.5 -13 Z",
  };
  const contour:RisoCharacterPart={
    id:"neck-contour",joint:"neck",plate:"blue",paint:"solid",
    d:actor==="courier"
      ?"M-7.9 -12 C-9 -5 -8 3 -12 7 Q-16 12 -23 14 L-22 15 Q-15 13 -10 9 C-7 5 -6 -4 -6 -12 Z M7.2 -12 C8 -5 8 3 12 7 Q16 12 23 14 L22 15 Q15 13 10 9 C7 5 6 -4 5.8 -12 Z"
      :"M-7.5 -12 Q-9 -3 -8 3 Q-11 9 -20 14 L-19 15 Q-11 12 -6 5 L-5 -12 Z M7 -12 Q8 -3 9 4 Q12 10 20 14 L19 15 Q11 12 6 5 L5 -12 Z",
  };
  const plane:RisoCharacterPart={
    id:"neck-sternomastoid",joint:"neck",plate:"red",paint:"screen",screenTone:"mid",
    d:actor==="courier"
      ?"M-4.5 -6 Q-4 2 -11 10 Q-7 7 -4 3 Q-3 -1 -4.5 -6 Z M4 -6 Q5 3 12 10 Q8 7 5 2 Z"
      :"M-4.5 -5 Q-4 4 -11 10 Q-7 8 -4 3 Z M4 -5 Q5 4 11 10 Q7 8 4 2 Z",
  };
  const clavicle:RisoCharacterPart={
    id:"neck-clavicle-insertion",joint:"neck",plate:"blue",paint:"solid",
    d:"M-21 13.8 Q-15 13 -8 11.7 Q-3 10.5 0 10.3 Q3 10.5 8 11.7 Q15 13 21 13.8 L20 14.8 Q12 14.1 7 13.1 Q2 12.5 0 12.6 Q-2 12.5 -7 13.1 Q-12 14.1 -20 14.8 Z",
  };
  const throat:RisoCharacterPart={
    id:"neck-throat-plane",joint:"neck",plate:"red",paint:"solid",
    d:actor==="courier"
      ?"M-.8 4 Q0 7 1 9 Q2 10 1 11 Q-.2 11 -.8 9 Z"
      :"M-.5 5 Q.8 9 .6 10 Q-.5 11 -1 9 Z",
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
  const hips=[find("left-leg"),find("right-leg")];
  const ankles=[find("left-ankle"),find("right-ankle")];
  const headScale=Math.hypot(head.matrix.a,head.matrix.b)/
    Math.max(1e-9,Math.hypot(body.matrix.a,body.matrix.b));
  const shoulderWidth=Math.hypot(left.x-right.x,left.y-right.y);
  const neckEnd={x:head.x,y:head.y};
  const neckStart={x:neck.x,y:neck.y};
  const headWidth=RISO29_ANAT1.oldHeadWidth*headScale;
  // Whole-figure proportions measured from the EXACT posed source joints,
  // not guessed based on a rectangle or falsely inferred human identity.
  const crownY=head.y+RISO29_ANAT1.headCrownY*headScale;
  const hipY=(hips[0].y+hips[1].y)/2;
  const ankleY=(ankles[0].y+ankles[1].y)/2;
  const projectedStature=ankleY-crownY;
  const legProjectionRatio=(ankleY-hipY)/projectedStature;
  return {headScale,headWidth,shoulderWidth,headToShoulder:headWidth/shoulderWidth,
    neckLength:Math.hypot(neckEnd.x-neckStart.x,neckEnd.y-neckStart.y),
    projectedStature,legProjectionRatio,
    neck:neckStart,skullBase:neckEnd,
    connected:head.parent==="neck"&&neck.parent==="body",
    printDetails:spec.parts.filter(p=>p.joint==="head").length,
    headHeight:RISO29_ANAT1.headSourceHeight*headScale,
    anatomySource:"registry/anatomy/anatomy-face.ts + anatomy-reference.ts" as const,
  };
}
