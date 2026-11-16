import {useEffect,useMemo,useState} from "react";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import type {RisoCharacterPart,RisoCharacterSpec,RisoJoint} from "../../registry/video/riso-character";
import {RisoCharacterInk,RisoCharacterKnockout} from "../../registry/video/riso-character-react";
import {RisoPrint} from "../../registry/video/print-plates-react";
import {RisoTransferSheetPlate,evaluateRisoTransferSheet} from "../../registry/video/riso-transfer-sheet";
import type {RisoTransferSheetOptions} from "../../registry/video/riso-transfer-sheet";
import {evaluateRisoPropHandoff,RISO_HANDOFF_DEFAULTS} from "../../registry/video/riso-prop-handoff";
import type {RisoHandoffSchedule} from "../../registry/video/riso-prop-handoff";
import type {RisoForegroundLayer} from "../../registry/video/print-plates-react";
import type {RisoPrintSpec} from "../../registry/video/print-plates";
import type {RisoCharacterMeshSheet,RisoMeshCategory} from "../../registry/video/riso-proportion-mesh";
import {COURIER} from "./riso-character-demo";
import {risoAnatomicalNeckParts} from "./riso-human-anatomy";
import {risoHandArtcraftParts} from "./riso-hand-artcraft";
import {riso43FrontIndexIds} from "./riso43-physical-paper-depth";
import {evaluateRiso40PaperGrip} from "./riso40-paper-fingertip-contact";
import {inspectRiso41InkPressure} from "./riso41-contact-pressure";
import {refineRiso37SourceEngraving} from "./riso37-anatomical-engraving";
import {riso31SegmentIds} from "./riso31-finger-phalanges";
import {riso32ThumbDistalId} from "./riso32-thumb-ip";

/** RISO14: a second authored human, not a color-inverted Courier.
 * Reuse a mechanically compatible limb/digit rig, not the Courier face, hair,
 * jacket silhouette, color hierarchy, or headwear. No third-party art assets.
 */
const take=(id:string,ink?: "blue"|"red"):RisoCharacterPart=>{
  const p=COURIER.parts.find(part=>part.id===id);
  if(!p)throw new Error("RISO14: missing shared articulated contour "+id);
  return {...p,plate:ink??p.plate};
};
const staticLeg=(j:RisoJoint):RisoJoint=>{
  if(j.id==="root")return {...j,keys:[
    {frame:0,x:0,y:0,easing:"ease"},
    {frame:110,x:-8,y:0,easing:"ease"},
    {frame:160,x:-12,y:-3,easing:"ease"},
    {frame:198,x:-13,y:0,easing:"ease"},
    {frame:239,x:-13,y:0},
  ]};
  if(j.id==="body")return {...j,keys:[
    {frame:0,rotate:0,y:0,easing:"ease"},
    {frame:90,rotate:-2,y:-1,easing:"ease"},
    {frame:160,rotate:2,y:-3,easing:"ease"},
    {frame:198,rotate:0,y:0,easing:"ease"},
    {frame:239,rotate:0,y:0},
  ]};
  if(j.id==="head")return {...j,keys:[
    {frame:0,rotate:3,easing:"ease"},
    {frame:110,rotate:-4,easing:"ease"},
    {frame:160,rotate:-7,easing:"ease"},
    {frame:198,rotate:1,easing:"ease"},
    {frame:239,rotate:1},
  ]};
  if(j.id==="left-arm")return {...j,keys:[
    {frame:0,rotate:18,easing:"ease"},
    {frame:95,rotate:-10,easing:"ease"},
    {frame:150,rotate:-42,easing:"ease"},
    {frame:205,rotate:-22,easing:"ease"},
    {frame:239,rotate:-22},
  ]};
  if(j.id==="left-elbow")return {...j,keys:[
    {frame:0,rotate:-8,easing:"ease"},
    {frame:130,rotate:-38,easing:"ease"},
    {frame:170,rotate:-52,easing:"ease"},
    {frame:239,rotate:-35},
  ]};
  if(j.id==="right-arm")return {...j,keys:[
    {frame:0,rotate:-9,easing:"ease"},
    {frame:120,rotate:8,easing:"ease"},
    {frame:198,rotate:-15,easing:"ease"},
    {frame:239,rotate:-15},
  ]};
  if(j.id==="right-elbow")return {...j,keys:[
    {frame:0,rotate:9,easing:"ease"},
    {frame:120,rotate:24,easing:"ease"},
    {frame:198,rotate:6,easing:"ease"},
    {frame:239,rotate:6},
  ]};
  if(j.id==="left-leg"||j.id==="right-leg")return {...j,keys:[
    {frame:0,rotate:0},{frame:239,rotate:0},
  ]};
  return {...j};
};
const coatPieces:readonly RisoCharacterPart[]=[
  {id:"coat",joint:"body",plate:"red",paint:"solid",
    d:"M-24 -56 C-18 -66 -7 -70 6 -66 Q22 -64 26 -52 Q24 -34 23 -17 Q31 0 35 24 Q15 30 -1 25 Q-18 30 -35 23 Q-29 3 -27 -19 Q-29 -41 -24 -56 Z"},
  {id:"coat-lapel-left",joint:"body",plate:"blue",paint:"solid",
    d:"M-21 -58 Q-12 -66 -4 -64 L-8 -49 Q-14 -43 -17 -35 Q-23 -46 -21 -58 Z"},
  {id:"coat-lapel-right",joint:"body",plate:"blue",paint:"solid",
    d:"M7 -63 Q18 -65 24 -56 Q23 -46 17 -36 Q14 -46 8 -49 Z"},
  {id:"coat-waist-pleats",joint:"body",plate:"blue",paint:"screen",
    d:"M-24 -12 C-20 -4 -19 6 -14 17 Q-20 12 -23 -3 Z M18 -16 Q18 0 28 18 Q21 13 19 6 Z M-2 -9 Q4 4 6 21 L3 22 Q0 6 -2 -9 Z"},
  {id:"coat-bottom-binding",joint:"body",plate:"blue",paint:"screen",
    d:"M-31 18 Q-2 30 30 19 L34 24 Q0 35 -34 23 Z"},
  {id:"coat-breast-pocket",joint:"body",plate:"blue",paint:"solid",
    d:"M12 -28 Q20 -31 23 -27 L22 -25 Q16 -28 12 -26 Z"},
  // Paper Artist's own tapered clavicle/tendons. The original scarf is
  // intentionally the last overprint around the neck, so it *wraps*
  // the anatomy rather than being erased by a later knockout.
  ...risoAnatomicalNeckParts("paper-artist"),
  {id:"scarf",joint:"body",plate:"blue",paint:"solid",
    d:"M-13 -69 Q-11 -73 -8 -76 C-2 -74 3 -74 9 -75 Q15 -73 17 -65 Q15 -59 10 -57 Q0 -60 -12 -57 Q-17 -63 -13 -69 Z M6 -58 Q17 -49 10 -32 L6 -35 Q9 -48 3 -57 Z"},
  {id:"scarf-overfold",joint:"body",plate:"red",paint:"screen",screenTone:"mid",
    d:"M-11 -66 Q-7 -69 0 -69 Q8 -71 13 -65 L12 -62 Q5 -65 0 -64 Q-8 -64 -11 -62 Z"},
  {id:"scarf-knot-seam",joint:"body",plate:"red",paint:"solid",
    d:"M9 -61 Q12 -59 13 -56 Q10 -54 7 -57 L6 -59 Q9 -58 10 -56 Q12 -58 9 -61 Z"},
];
const facePieces:readonly RisoCharacterPart[]=[
  {id:"hair-back",joint:"head",plate:"blue",paint:"solid",
    d:"M-38 -29 C-45 -57 -30 -74 -8 -74 Q15 -81 33 -65 Q46 -53 40 -26 Q46 -4 36 21 Q27 26 24 13 Q34 -5 27 -29 Q22 -46 11 -52 Q-17 -57 -28 -35 Q-29 -8 -26 11 Q-31 23 -40 13 Q-46 2 -38 -29 Z"},
  {id:"face",joint:"head",plate:"blue",paint:"solid",knockoutOnly:true,
    d:"M-29 -38 C-26 -54 -12 -59 5 -56 Q26 -54 30 -35 Q34 -12 25 11 Q16 29 -2 31 Q-23 26 -30 8 Q-34 -10 -29 -38 Z"},
  // RISO25 Paper Artist: a smaller, tucked helix and concha; distinct source
  // ear geometry from Courier, with ear/lobule overprinted beneath her bob.
  {id:"ear-left",joint:"head",plate:"blue",paint:"solid",
    d:"M-28 -10.8 C-32 -14.4 -37.3 -11.6 -38.1 -6.3 C-39.3 -.7 -36.6 5 -32.6 6.9 Q-29.7 7.4 -28.3 4.8 L-29.4 2.8 Q-32 5 -34.6 .6 C-37.1 -4 -34.4 -9.2 -29.6 -8.3 Z"},
  {id:"ear-helix-fold",joint:"head",plate:"blue",paint:"solid",
    d:"M-34.2 -10 C-37.1 -8 -38 -4.5 -36.6 -1.8 Q-35.7 -4.5 -34 -8.5 Z"},
  {id:"ear-concha-pocket",joint:"head",plate:"red",paint:"solid",
    d:"M-33.0 -5.3 Q-32.1 -6.1 -31.2 -4.9 Q-31.4 -3.7 -32.4 -3.9 Q-33.3 -4.3 -33.0 -5.3 Z"},
  {id:"ear-tragus-root",joint:"head",plate:"blue",paint:"solid",
    d:"M-30.6 -2.2 Q-32 -.8 -31.6 .8 Q-30.2 .9 -29.9 -.7 Z"},
  {id:"ear-lobule-seam",joint:"head",plate:"red",paint:"solid",
    d:"M-35 3.5 Q-32.6 6.5 -30.7 5.6 Q-33 7 -35.4 5.2 Z"},
  {id:"face-outline",joint:"head",plate:"blue",paint:"solid",
    d:"M-29 -37 C-27 -51 -14 -58 2 -57 Q23 -56 29 -37 Q35 -13 26 11 C21 24 6 32 -5 30 Q-25 24 -30 8 L-27 7 Q-24 23 -4 27 C10 29 20 18 23 8 Q31 -12 26 -34 Q23 -51 2 -53 Q-17 -55 -25 -34 Z"},
  {id:"temple-tones",joint:"head",plate:"red",paint:"screen",screenTone:"mid",
    d:"M-24 -25 C-29 -12 -28 -2 -21 10 Q-29 3 -29 -9 Z M22 -26 Q30 -14 25 0 Q25 -10 22 -26 Z"},
  {id:"brow-left",joint:"head",plate:"blue",paint:"solid",
    d:"M-23 -18 Q-16 -24 -8 -20 L-9 -18 Q-17 -21 -22 -16 Z",
    expressions:{blink:"M-23 -16 Q-16 -21 -8 -18 L-9 -16 Q-17 -19 -23 -15 Z",
      smile:"M-23 -20 Q-16 -26 -8 -21 L-9 -19 Q-17 -24 -22 -18 Z"}},
  {id:"brow-right",joint:"head",plate:"blue",paint:"solid",
    d:"M7 -20 Q16 -26 24 -19 L23 -16 Q16 -22 8 -17 Z",
    expressions:{blink:"M8 -18 Q17 -23 24 -18 L23 -16 Q16 -20 9 -16 Z",
      smile:"M8 -23 Q18 -29 25 -20 L24 -17 Q16 -25 9 -20 Z"}},
  {id:"eye-left",joint:"head",plate:"blue",paint:"solid",
    d:"M-23 -8 C-18 -13 -13 -14 -8 -9 L-9 -7 Q-15 -11 -22 -5 Z",
    expressions:{blink:"M-23 -7 Q-16 -4 -8 -8 L-9 -6 Q-16 -2 -23 -5 Z"}},
  {id:"eye-right",joint:"head",plate:"blue",paint:"solid",
    d:"M8 -10 Q17 -17 24 -10 L23 -7 Q16 -13 9 -7 Z",
    expressions:{blink:"M8 -9 Q16 -5 24 -9 L23 -7 Q16 -3 9 -7 Z"}},
  {id:"iris-left",joint:"head",plate:"blue",paint:"solid",
    d:"M-17 -8 Q-13 -11 -12 -7 Q-12 -3 -15 -3 Q-19 -5 -17 -8 Z",
    expressions:{blink:"M-17 -5 L-12 -5 L-12 -4 L-17 -4 Z"}},
  {id:"iris-right",joint:"head",plate:"blue",paint:"solid",
    d:"M15 -10 Q19 -12 20 -8 Q20 -4 17 -4 Q14 -6 15 -10 Z",
    expressions:{blink:"M15 -6 L20 -6 L20 -5 L15 -5 Z"}},
  // RISO21: original Paper Artist eyes retain a narrower, slightly upturned
  // eyelid grammar than Courier. No pasted mirrored eye graphics.
  {id:"eye-canthus-shapes",joint:"head",plate:"blue",paint:"solid",
    d:"M-23.3 -8.1 Q-21.6 -9.5 -20.5 -9.0 Q-21.7 -7.9 -22.5 -6.7 Q-23.6 -7.0 -23.3 -8.1 Z M23.5 -10.2 Q24.5 -10.7 25.4 -9.7 Q24.3 -9.5 23.8 -8.4 Q22.8 -8.9 23.5 -10.2 Z",
    expressions:{blink:"M-23 -7.1 Q-21.6 -7.6 -20.5 -7 L-21 -6.4 Q-22.5 -6.5 -23 -7.1 Z M23.4 -9.1 Q24.4 -9.6 25.0 -8.8 L24.1 -8.2 Q23.5 -8.5 23.4 -9.1 Z"},
  },
  {id:"eye-lash-wedges",joint:"head",plate:"blue",paint:"solid",
    d:"M-22.7 -9.4 Q-24.6 -11.8 -25.6 -11.6 Q-24.5 -10.0 -21.8 -8.6 Z M-19.6 -11.0 Q-20.5 -12.8 -21.4 -13.0 Q-20.9 -11.3 -19.1 -10.4 Z M23.6 -11.9 Q25.3 -14.2 26.2 -14.0 Q25.5 -11.9 24.6 -10.1 Z M21.3 -13 Q22.9 -14.1 23.3 -14.4 Q22.9 -12.5 21.8 -11.7 Z",
    expressions:{blink:"M-22.8 -7.4 Q-24.3 -8.6 -25 -9 Q-23.4 -7.8 -21.8 -7 Z M-20.2 -7.8 Q-21.5 -8.6 -22 -8.8 Q-21.2 -7.9 -19.7 -7.5 Z M23.3 -9.1 Q24.9 -10.6 25.6 -10.8 Q24.6 -9.2 23.9 -8.6 Z M20.9 -9.4 Q22.4 -10.4 23 -10.6 Q22.6 -9.4 21.4 -9.0 Z"},
  },
  {id:"eye-iris-grain",joint:"head",plate:"red",paint:"solid",
    d:"M-16.7 -8.5 Q-15.3 -10.3 -13.5 -8.2 Q-15.0 -8.5 -15.2 -5.4 Q-17.5 -6.1 -16.7 -8.5 Z M16.2 -9.8 Q17.5 -12.3 19.5 -9.7 Q17.7 -9.5 17.7 -6.3 Q15.8 -7.2 16.2 -9.8 Z",
    expressions:{blink:"M-16.3 -5.3 Q-14.7 -5.8 -13.7 -5.4 L-13.8 -4.9 Q-15.3 -5.1 -16.3 -4.9 Z M16.4 -6.2 Q18 -6.7 19.2 -6.2 L19.1 -5.7 Q17.5 -5.9 16.4 -5.7 Z"},
  },
  {id:"eye-lower-orbit-engraving",joint:"head",plate:"red",paint:"solid",
    d:"M-22 -2.0 Q-19.5 -.6 -17 -.9 Q-19 -.1 -21.8 -.8 Z M-16 -.9 Q-13.0 -1.3 -10.5 -3.0 Q-13.2 -.4 -15.8 .0 Z M-20.8 1.4 Q-18 2.2 -16.2 1.2 Q-18.3 2.7 -20.5 2.0 Z M10.7 -2.2 Q13.8 -.8 16.2 -1.4 Q14.2 .1 11.3 -1.2 Z M17.2 -1.5 Q20.9 -1.1 22.6 -3.4 Q21.4 -0.3 17.4 -.6 Z M13.8 1.5 Q17.6 2.5 20.8 1.1 Q17.4 3.2 14.0 2.3 Z",
    expressions:{blink:"M-22 -3.1 Q-19.5 -2.5 -17.4 -2.8 Q-19 -2.0 -21.8 -2.4 Z M-16.7 -2.7 Q-13.1 -2.3 -10.3 -3.8 Q-13.4 -1.7 -16.2 -2.0 Z M-20.8 -1.3 Q-18 -.9 -16.5 -1.5 Q-18 -.4 -20.4 -.6 Z M10 -4.3 Q13 -2.8 15.9 -3.1 Q13.6 -2 10.8 -3.6 Z M16.8 -3.0 Q20.4 -2.9 23 -4.7 Q21 -2 17.3 -2.3 Z M14 -1.4 Q17 -1.0 20.4 -1.9 Q17.5 -.2 14.5 -.7 Z"},
  },

  // RISO23: Paper Artist's own facial topography, not a mirrored Courier
  // stencil. Wide tonal masses carry the physical Riso screen, narrow
  // under-lid/iris engravings remain printable on the solid red master.
  {id:"orbital-tone-planes",joint:"head",plate:"red",paint:"screen",screenTone:"light",
    d:"M-26 -26 C-20 -31 -12 -29 -6 -23 Q-13 -22 -19 -18 Q-25 -17 -26 -26 Z M6 -24 C13 -32 23 -29 29 -20 Q27 -14 23 -14 Q18 -22 11 -21 Z"},
  {id:"zygomatic-tone-planes",joint:"head",plate:"red",paint:"screen",screenTone:"light",
    d:"M-28 -8 C-28 3 -25 13 -18 19 Q-22 7 -19 -5 Q-24 -11 -28 -8 Z M20 -9 Q25 -12 29 -6 C29 4 25 14 18 20 Q24 5 22 -4 Z"},
  {id:"jaw-shadow-planing",joint:"head",plate:"red",paint:"screen",screenTone:"light",
    d:"M-28 7 Q-25 22 -7 30 Q-19 28 -26 16 Z M29 -7 Q34 13 12 29 Q24 18 27 -5 Z"},
  {id:"nose-bridge",joint:"head",plate:"blue",paint:"solid",
    d:"M1 -12 Q2.6 -8 2.2 -3 Q1 1 1.6 4 Q2 6.8 4.5 7 Q6.7 7.2 8.8 5.9 L8.9 7.2 Q6.5 9.1 3.5 8.8 Q-.5 8.3 0 4 Q1 -3 1 -12 Z"},
  {id:"cheek-tones",joint:"head",plate:"red",paint:"screen",screenTone:"light",
    d:"M-25 3 Q-20 0 -14 5 Q-20 3 -24 8 Z M17 4 Q24 3 27 10 Q23 7 18 8 Z"},
  // Two-lip profile derived from ANAT1 mouth loop and the Artist's narrower
  // original chin. Prevent a single oversized red blob at the speaking cel.
  {id:"mouth",joint:"head",plate:"red",paint:"solid",
    d:"M-7 15.1 Q-2 17.5 2 16.4 Q5 15.8 7 13.4 L8 15.2 Q3 19.7 -2 19.8 Q-5.3 19 -7 15.1 Z",
    expressions:{speak:"M-4.8 13.4 Q-1.2 11 2.2 12 Q5 12.8 5.8 16 Q5.3 20.1 1 21.7 Q-3.4 21.3 -4.8 17.2 Z",
      smile:"M-7.7 14 C-3.6 17.2 2.7 18.0 7.5 13.1 C6 16.4 4 18.4 .0 18.8 Q-4.4 18.4 -7.7 14 Z"}},
  {id:"lip-corners",joint:"head",plate:"blue",paint:"solid",
    d:"M-10 14 L-7 14 L-7 16 Z M8 12 L11 11 L9 15 Z",
    expressions:{speak:"M-8 12 L-5 10 L-6 14 Z M7 12 L10 13 L8 16 Z",
      smile:"M-9 14 Q-8.8 16 -7.5 17 L-8.5 16.8 Z M7.2 13.2 Q9.4 11.6 10 9.9 L10.1 13.1 Z"}},
  // RISO25 / expressed midface print masters. This actor's nose, mouth
  // and cheekbone directions differ from Courier; expressive contours are
  // redrawn at the two authored visemes, not stretched with a procedural rig.
  {id:"nasal-sidewall-line",joint:"head",plate:"red",paint:"solid",
    d:"M1.7 -9.7 Q3.4 -7 3.4 -4.4 Q2.8 -5.7 2.1 -8.1 Z"},
  {id:"nasal-ala-fold",joint:"head",plate:"red",paint:"solid",
    d:"M7.9 5.1 Q10.2 5.9 10.7 7.8 Q10.2 8.5 9.4 8.5 Q10.1 7 7.7 6.2 Z"},
  {id:"upper-lip-engraving",joint:"head",plate:"blue",paint:"solid",
    d:"M-7.3 13.6 Q-4 12.8 -1 14.4 Q1 14 4.8 12.9 L7.6 13.3 Q4.3 14.5 1 15.2 Q-2.5 14.1 -6.4 14.8 Z",
    expressions:{
      speak:"M-6.4 12.7 Q-2 10.3 1.5 10.6 Q4.2 11.2 6 13.2 Q1.4 11.5 -2 11.8 Q-4.5 12.1 -6.4 13.2 Z",
      smile:"M-7.8 13.8 Q-2.6 17.4 7.5 13.0 Q3.7 16.2 .2 16.3 Q-4.9 16.2 -7.8 14.6 Z",
    }},
  {id:"nasolabial-flow",joint:"head",plate:"red",paint:"solid",
    d:"M-15.6 5.4 Q-16.6 10.2 -13.6 13.2 Q-15.9 11.2 -16.1 7.4 Z M13.0 5.6 Q15.1 9.2 13.5 12.3 Q14.4 9.1 12.7 7.1 Z",
    expressions:{
      smile:"M-16.6 4.2 Q-18.1 9.8 -14.3 13.5 Q-17.3 11.1 -17.2 6.8 Z M14.0 4.8 Q16.9 9.7 14.5 13.4 Q15.7 9.4 13.6 6.1 Z",
      speak:"M-15.6 5.8 Q-17.1 9.1 -13.5 12.7 Q-16 10.8 -16.2 7.8 Z M13.1 6 Q15.8 9.3 13.2 12.1 Q14.1 9.7 12.8 7.2 Z",
    }},
  {id:"labiomental-crease",joint:"head",plate:"blue",paint:"solid",
    d:"M-4.5 24.5 Q1 26.3 6 23.7 Q2.8 26 -2.7 25.8 Z",
    expressions:{
      smile:"M-6.5 26.3 Q1 29.1 8 24.8 Q3.2 28.1 -3.1 28.2 Z",
      speak:"M-5.5 24.8 Q.5 28.2 6.5 24 Q2.5 27.5 -3.1 27.3 Z",
    }},
  {id:"chin-tone",joint:"head",plate:"red",paint:"screen",screenTone:"light",
    d:"M-8 25 Q2 29 14 23 Q11 29 1 30 Z"},
  {id:"hair-fringe",joint:"head",plate:"blue",paint:"solid",
    d:"M-29 -40 Q-24 -58 -9 -60 Q12 -67 27 -51 Q29 -45 26 -37 Q20 -44 15 -48 Q13 -39 6 -36 Q8 -46 3 -49 Q-2 -39 -9 -35 Q-8 -46 -14 -48 Q-18 -36 -26 -34 Z"},
  {id:"hair-linework",joint:"head",plate:"red",paint:"screen",
    d:"M-29 -49 Q-24 -60 -9 -62 Q-21 -57 -27 -45 Z M8 -61 Q21 -57 28 -46 Q21 -52 8 -59 Z"},
  // RISO24 / real two-person Chromium critique: the bob was one undifferentiated
  // blue helmet even after the eye and cheek work. The crown, part/fringe and
  // hanging side masses now have distinct flow grammar. Closed paper channels
  // are actual local master knockouts rather than translucent painted glints.
  // They remain attached to head in every film pose and preserve both actors'
  // original outer silhouette and facial identity.
  {id:"hair-paper-crown",joint:"head",plate:"blue",paint:"solid",knockoutOnly:true,
    d:"M-29 -58 C-25 -67 -17 -72 -8 -73 Q-17 -71 -23 -63 Q-26 -57 -29 -58 Z M-13 -70 C-2 -76 9 -74 17 -69 Q8 -72 -3 -69 Q-9 -67 -13 -70 Z M14 -71 C24 -68 32 -60 35 -51 Q29 -59 18 -65 Z"},
  {id:"hair-paper-side",joint:"head",plate:"blue",paint:"solid",knockoutOnly:true,
    d:"M-36 -41 C-39 -29 -40 -12 -38 4 Q-39 -13 -35 -38 Z M36 -43 C40 -29 40 -13 38 1 Q38 -18 34 -39 Z M-38 3 Q-38 11 -36 16 Q-37 11 -37 6 Z M36 4 Q37 12 35 17 Q35 12 35 8 Z"},
  {id:"hair-crown-engravings",joint:"head",plate:"red",paint:"solid",
    d:"M-31 -57 C-26 -66 -17 -71 -11 -72 Q-23 -67 -30 -56 Z M-22 -63 C-16 -69 -8 -70 -2 -70 Q-13 -67 -21 -62 Z M-10 -67 C-3 -71 6 -70 12 -67 Q3 -69 -8 -65 Z M3 -68 C14 -69 23 -64 29 -57 Q20 -64 7 -66 Z M17 -64 C25 -61 32 -54 35 -47 Q29 -56 20 -61 Z M-29 -53 C-24 -59 -17 -62 -11 -62 Q-22 -58 -28 -51 Z M12 -61 Q21 -57 26 -51 Q20 -55 14 -59 Z"},
  {id:"hair-side-engravings",joint:"head",plate:"red",paint:"solid",
    d:"M-37 -44 C-40 -31 -40 -11 -37 4 Q-39 -11 -38 -29 Z M-34 -35 C-37 -19 -37 -3 -35 10 Q-36 -4 -35 -23 Z M-37 -8 C-39 2 -37 12 -35 18 Q-37 14 -38 4 Z M36 -47 C40 -29 40 -8 37 8 Q38 -8 37 -28 Z M34 -35 C37 -17 37 0 34 15 Q36 -3 35 -25 Z M35 0 Q39 11 35 20 Q36 12 35 5 Z"},
  {id:"hair-fringe-root-ink",joint:"head",plate:"red",paint:"solid",
    d:"M-27 -49 C-23 -55 -17 -59 -10 -59 Q-20 -56 -26 -48 Z M-16 -54 C-10 -60 -4 -62 3 -61 Q-8 -59 -15 -52 Z M-2 -56 C4 -62 11 -61 16 -56 Q7 -59 0 -54 Z M10 -54 C18 -57 24 -52 27 -47 Q20 -52 12 -52 Z M-24 -44 Q-21 -48 -17 -49 Q-21 -46 -23 -43 Z"},
  {id:"hair-temple-shadow-masses",joint:"head",plate:"red",paint:"screen",
    d:"M-37 -43 C-40 -30 -40 -14 -38 2 Q-39 -18 -36 -37 Z M35 -47 C40 -32 40 -13 38 4 Q39 -25 35 -47 Z"},

];
const sharedLimbs=[
  "right-thigh","right-shin","right-boot","right-boot-detail",
  "left-thigh","left-shin","left-boot","left-boot-detail",
  "left-upper-sleeve","left-forearm","sleeve-left-fold","cuff-left","left-wrist-underprint-clearance",
  "left-glove","left-glove-index","left-glove-middle","left-glove-ring","left-glove-pinky","left-glove-thumb",
  "left-glove-detail","left-glove-thumb-fold","left-finger-joint-lines",
  // RISO31: copy both real bending red links of all four original fingers.
  ...riso31SegmentIds("left"),
  riso32ThumbDistalId("left"),
  "right-upper-sleeve","right-forearm","sleeve-right-fold","cuff-right","right-wrist-underprint-clearance",
  "right-glove","right-glove-index","right-glove-middle","right-glove-ring","right-glove-pinky","right-glove-thumb",
  "right-glove-detail","right-glove-thumb-fold","right-finger-joint-lines",
  // RISO31: copy both real bending red links of all four original fingers.
  ...riso31SegmentIds("right"),
  riso32ThumbDistalId("right"),
];
const legs=sharedLimbs.slice(0,8).map(id=>take(id));
const arms=sharedLimbs.slice(8).map(id=>{
  const original=take(id);
  const originalPalmInk=/^(left|right)-glove-(detail|thumb-fold)$/.exec(id);
  // Paper Artist preserves the exact inherited source wrist anchors and
  // structural body outline, but gets independently authored contour rhythm
  // for the cobalt glove landmarks instead of a duplicate Courier stamp.
  return originalPalmInk?
    refineRiso37SourceEngraving(original,"paper-artist",originalPalmInk[1] as "left"|"right"):
    original;
});
export const PAPER_ARTIST:RisoCharacterSpec={
  version:1,id:"paper-artist",durationFrames:240,cadence:2,
  joints:COURIER.joints.map(staticLeg),
  // Original full-body rest and gestures; no fake cross-person IK. Every hand
  // remains a child of a stable arm with independent articulated digits.
  ik:[],
  expressions:[{frame:0,name:"neutral"},{frame:76,name:"blink"},
    {frame:81,name:"neutral"},{frame:156,name:"speak"},
    {frame:180,name:"neutral"},{frame:198,name:"smile"}],
  parts:[...legs,...coatPieces,...arms,
    ...risoHandArtcraftParts("paper-artist","left"),
    ...risoHandArtcraftParts("paper-artist","right"),
    ...facePieces],
};
function category(part:RisoCharacterPart):RisoMeshCategory{
  if(part.id.startsWith("hair"))return "hair";
  if(part.joint==="head")return "face";
  if(part.id.includes("boot"))return "foot";
  if(part.id.includes("thigh")||part.id.includes("shin"))return "leg";
  if(part.joint.endsWith("hand")||part.joint.endsWith("-palm-surface")||
    ["thumb","index","middle","ring","pinky"].some(d=>part.joint.endsWith("-"+d))||
    /^(?:left|right)-(?:(?:index|middle|ring|pinky)-(?:pip|dip)|thumb-ip)$/.test(part.joint))
    return "hand";
  if(part.joint.includes("arm")||part.joint.includes("elbow"))return "arm";
  if(part.id==="scarf"||part.id.includes("pocket"))return "accessory";
  return "torso";
}
export const RISO_PAPER_ARTIST_SHEET:RisoCharacterMeshSheet={
  id:"paper-artist",label:"Paper Artist",view:"authored-2d",headRegion:"face",
  missingViews:["true-side","back","three-quarter","top"],
  poses:[{frame:46,label:"Studio waiting"},{frame:160,label:"Receiving printed sheet"},
    {frame:198,label:"Exchange finished"}],
  measurements:[
    {id:"interocular",label:"Left/right eye spacing",from:"eye-left",to:"eye-right"},
    {id:"nose-mouth",label:"Nasal bridge to mouth",from:"nose-bridge",to:"mouth"},
    {id:"thumb-index",label:"Grip opening",from:"left-glove-thumb",to:"left-glove-index"},
    {id:"shoulders",label:"Sleeve shoulder separation",from:"left-upper-sleeve",to:"right-upper-sleeve"},
  ],
  // Each region follows the actual named SVG contour and joint transform,
  // never a fabricated proportional rectangle or invented alternate view.
  regions:PAPER_ARTIST.parts.map(part=>({
    id:part.id,label:part.id.replace(/-/g," "),category:category(part),
    joint:part.joint,parts:[part.id],...(part.skin?{tipJoint:part.skin.tipJoint}:{}),
  })),
};
const paper="#FAEED9",blue="#255B8E",red="#D65641";
type EnsemblePlate="both"|"blue"|"red";
type EnsembleAspect="landscape"|"portrait";
const personPoint=(spec:RisoCharacterSpec,frame:number,joint:string,x:number,y:number,scale:number)=>{
  const pose=evaluateRisoCharacter(spec,frame).joints.find(j=>j.id===joint);
  if(!pose)throw new RangeError("Missing Riso ensemble contact point "+joint);
  return {x:x+pose.x*scale,y:y+pose.y*scale};
};
/**
 * RISO43 real paper sandwich: all source figures including thumb and the
 * supporting 3 fingers are deposited BEFORE opaque paper. ONLY the three
 * articulated original index RED phalanges and their own COBALT creases/nail
 * are reprinted above it. Not a detached sticker or blend/mask trick.
 * The native RisoPrint ordered foreground passes supply depth.
 */
/** Exact geometry for a prop between two authored hand contact anchors.
 * Stage space, including aspect and placements, must be computed once. */
export function evaluateRisoHumanEnsemble(frame:number,aspect:EnsembleAspect="landscape",
  paperOptions:RisoTransferSheetOptions={},
  handoffSchedule:RisoHandoffSchedule=RISO_HANDOFF_DEFAULTS){
  if(!Number.isInteger(frame)||frame<0||frame>239)
    throw new RangeError("Riso ensemble frame must be an integer 0..239");
  const portrait=aspect==="portrait";
  const width=portrait?540:960,height=portrait?960:540;
  // RISO27 / actual Chromium 9:16 contact-sheet rejection: the previous
  // portrait Courier began clipped at the left page edge (stage x=0) and
  // by f202 overlapped the Paper Artist (other stage x=335), hiding the
  // original body and fingertip acting. Give each head/body enough air in
  // the *real source-space stage*, not by drawing smaller/simpler actors.
  // Keep both at legible 1.1x, with a dedicated portrait editorial baseline.
  const first={x:portrait?30:120,y:portrait?705:445,scale:portrait?1.1:1.05};
  const second={x:portrait?405:520,y:portrait?705:445,scale:portrait?1.1:1.05};
  // RISO40 visual-failure repair. The page previously spanned the two
  // WRISTS while the actual source thumb/index prints lay several centimeters
  // outside its endpoints (see real 16:9 f160 Chromium). Attach both ends to
  // the moving opposed pads themselves; the only kinematic inputs remain
  // the original actors' ANAT1 thumb IP / index DIP source joint transforms.
  const donorGrip=evaluateRiso40PaperGrip(COURIER,frame,"right",first);
  const artistGrip=evaluateRiso40PaperGrip(PAPER_ARTIST,frame,"left",second);
  const donorInk=inspectRiso41InkPressure(COURIER,frame,"right");
  const receiverInk=inspectRiso41InkPressure(PAPER_ARTIST,frame,"left");
  const a=donorGrip.paperAnchor,b=artistGrip.paperAnchor;
  // Preserve the exact Riso-prop-handoff independently seeking release rule:
  // absolute releaseStart anchors come from the same 2 source rigs, not a
  // separately keyframed new letter or history-dependent screen offset.
  const releaseA=evaluateRiso40PaperGrip(COURIER,handoffSchedule.releaseStart,
    "right",first).paperAnchor;
  const releaseB=evaluateRiso40PaperGrip(PAPER_ARTIST,handoffSchedule.releaseStart,
    "left",second).paperAnchor;
  const handoff=evaluateRisoPropHandoff(frame,a,b,releaseA,releaseB,handoffSchedule);
  // Finger pressure is a *contact* property, not merely a held-gesture
  // parameter. As the sheet peels away its root, the ink folds must relax
  // continuously and disappear rather than hovering around an empty grip.
  const pressureAt=(grip:number,edge:{x:number;y:number},hand:{x:number;y:number})=>
    grip*Math.max(0,Math.min(1,1-Math.hypot(edge.x-hand.x,edge.y-hand.y)/12));
  // Only draw physically *pressed* cobalt creases when the real moving red
  // index and thumb pad approaches. Paper-at-wrist is not enough. Existing
  // smooth grip/release and exact sheet-end alignment remain independent.
  const sourceContactPressure=pressureAt(handoff.sourceGrip,handoff.paperStart,a)*
    donorInk.pressure;
  const receiverContactPressure=pressureAt(handoff.receiverGrip,handoff.paperEnd,b)*
    receiverInk.pressure;
  // RISO41 native f186 artifact exposed a REAL z-order defect: the
  // courier's red fingertips were still printed OVER the letter while the
  // measured true red pad gap had already opened (0% pressure). The generic
  // handoff's wrist-to-paper range cannot certify distal-print contact.
  // While the source is actively releasing, permit its foreground only
  // if the original opposed red pads are still actually near each other.
  // Before release, the palm can support the unfolding sheet unpinched.
  const sourceTouching=handoff.sourceTouching&&
    (frame<handoffSchedule.releaseStart||donorInk.pressure>.01);
  const receiverTouching=handoff.receiverTouching&&receiverInk.pressure>.01;
  // One material geometry drives the actual knockout and both spot masters.
  // It inherits the two real hand joints and release schedule, no local clock.
  const printDetails=evaluateRisoTransferSheet(
    handoff.paperStart,handoff.paperEnd,handoff.progress,
    {...paperOptions,sourceGrip:sourceContactPressure,
      receiverGrip:receiverContactPressure});
  return {...handoff,sourceTouching,receiverTouching,
    sourceContactPressure,receiverContactPressure,
    donorGrip,artistGrip,donorInk,receiverInk,
    frame,aspect,width,height,first,second,source:a,receiver:b,
    propEnd:handoff.paperEnd,progress:handoff.progress,
    sheet:printDetails.outline,printDetails};
}
/** Immutable motion beats for source-linked Riso film review. */
export const RISO_ENSEMBLE_MOTION_BEATS=[
  {frame:0,label:"Opening",intent:"Walking approach"},
  {frame:76,label:"Blink",intent:"Eye anticipation"},
  {frame:126,label:"Unfurl",intent:"Sheet emerges"},
  {frame:144,label:"Reach",intent:"Midair hand to hand"},
  {frame:160,label:"Contact",intent:"Recipient touches the sheet"},
  {frame:165,label:"Foot plant",intent:"Both printed boots anchor as weight travels into the exchange"},
  {frame:178,label:"Release",intent:"Donor opens hand"},
  {frame:190,label:"Peel",intent:"Paper and hand separate"},
  {frame:202,label:"Received",intent:"Sheet follows receiver only"},
  {frame:239,label:"Final hold",intent:"Last authored frame"},
] as const;
export const RISO_ENSEMBLE_FILM_FPS=24 as const;
export function clampRisoEnsembleFilmFrame(value:number){
  if(!Number.isInteger(value))throw new RangeError("RISO film frame must be integer");
  return Math.max(0,Math.min(239,value));
}
export function RisoHumanEnsembleStudio(){
  const [frame,setFrame]=useState(176);
  const [playing,setPlaying]=useState(false);
  const [playbackOrigin,setPlaybackOrigin]=useState(0);
  const [aspect,setAspect]=useState<EnsembleAspect>("landscape");
  const [plate,setPlate]=useState<EnsemblePlate>("both");
  const [anchors,setAnchors]=useState(false);
  const [grain,setGrain]=useState(.45);
  const [misregistration,setMisregistration]=useState(.25);
  const [dotCell,setDotCell]=useState(6);
  const [sheetDetail,setSheetDetail]=useState(true);
  const [fingertipOcclusion,setFingertipOcclusion]=useState(true);
  const [paperCurl,setPaperCurl]=useState(3);
  const [gripPinch,setGripPinch]=useState(.5);
  const [imprintDepth,setImprintDepth]=useState(.75);
  const [releaseStart,setReleaseStart]=useState(178);
  const [releaseDuration,setReleaseDuration]=useState(24);
  const [settleDegrees,setSettleDegrees]=useState(RISO_HANDOFF_DEFAULTS.settleDegrees);
  // Real-time playhead: use source frame based on elapsed wall-clock time,
  // not chained setInterval ticks (which drift under expensive SVG rendering).
  // End on a held final pose: the source is a story, not a seamless idle loop.
  useEffect(()=>{
    if(!playing)return;
    const began=performance.now();
    let id=0;
    const tick=(now:number)=>{
      const elapsed=Math.max(0,Math.floor((now-began)*RISO_ENSEMBLE_FILM_FPS/1000));
      const sample=clampRisoEnsembleFilmFrame(playbackOrigin+elapsed);
      setFrame(sample);
      if(sample>=239){setPlaying(false);return;}
      id=window.requestAnimationFrame(tick);
    };
    id=window.requestAnimationFrame(tick);
    return ()=>window.cancelAnimationFrame(id);
  },[playing,playbackOrigin]);
  const seek=(next:number)=>{
    setPlaying(false);
    setFrame(clampRisoEnsembleFilmFrame(next));
  };
  const toggleFilm=()=>{
    if(playing){setPlaying(false);return;}
    const origin=frame>=239?0:frame;
    setFrame(origin);setPlaybackOrigin(origin);setPlaying(true);
  };
  const handoffSchedule:RisoHandoffSchedule={
    ...RISO_HANDOFF_DEFAULTS,
    releaseStart,releaseEnd:releaseStart+releaseDuration,settleDegrees,
  };
  const state=useMemo(()=>evaluateRisoHumanEnsemble(frame,aspect,{
    curl:paperCurl,gripPinch,imprintDepth,
  },handoffSchedule),[frame,aspect,paperCurl,gripPinch,imprintDepth,
    releaseStart,releaseDuration,settleDegrees]);
  const printSpec:RisoPrintSpec={
    version:1,width:state.width,height:state.height,paper,seed:38,
    startFrame:0,passFrames:1,gapFrames:0,
    plates:[
      {id:"blue",color:blue,opacity:1,dotCell,dotAngle:-12,registration:[0,0]},
      {id:"red",color:red,opacity:1,dotCell,dotAngle:17,registration:[.5,-.4]},
    ],
  };
  const people=[{spec:COURIER,stage:state.first},{spec:PAPER_ARTIST,stage:state.second}] as const;
  const footContacts=people.flatMap(({spec,stage})=>["left-ankle","right-ankle"].map(joint=>
    personPoint(spec,frame,joint,stage.x,stage.y,stage.scale)));
  const gripLayer=(spec:RisoCharacterSpec,stage:{x:number;y:number;scale:number},
    side:"left"|"right",id:string):RisoForegroundLayer=>{
    const onlyPartIds=riso43FrontIndexIds(side);
    // Cut through paper only under real index PIP/DIP RED source stamps.
    // Thumb IP and ulnar support digits remain below the opaque sheet.
    const solidDigits=spec.parts.filter(p=>onlyPartIds.includes(p.id)&&
      p.plate==="red"&&p.paint==="solid"&&!p.knockoutOnly).map(p=>p.id);
    return {
      id,
      knockout:<g data-km-riso-grip-occlusion={id}>
        <RisoCharacterKnockout spec={spec} frame={frame} x={stage.x} y={stage.y}
          scale={stage.scale} spread={1.25} onlyPartIds={solidDigits}/></g>,
      artworks:{
        blue:paint=><RisoCharacterInk spec={spec} frame={frame} plateId="blue"
          paint={paint} x={stage.x} y={stage.y} scale={stage.scale}
          onlyPartIds={onlyPartIds}/>,
        red:paint=><RisoCharacterInk spec={spec} frame={frame} plateId="red"
          paint={paint} x={stage.x} y={stage.y} scale={stage.scale}
          onlyPartIds={onlyPartIds}/>,
      },
    };
  };
  const layers:RisoForegroundLayer[]=[
    // Stage the complete actors on the physical paper before presenting the
    // letter, then allow only actual joint-posed fingers to cover the letter.
    ...people.map(({spec,stage}):RisoForegroundLayer=>({
      id:spec.id,
      knockout:<g data-km-riso-human-actor={spec.id}>
        <RisoCharacterKnockout spec={spec} frame={frame} x={stage.x} y={stage.y}
          scale={stage.scale} spread={2}/></g>,
      artworks:{
        blue:paint=><RisoCharacterInk spec={spec} frame={frame} plateId="blue"
          paint={paint} x={stage.x} y={stage.y} scale={stage.scale}/>,
        red:paint=><RisoCharacterInk spec={spec} frame={frame} plateId="red"
          paint={paint} x={stage.x} y={stage.y} scale={stage.scale}/>,
      },
    })),
    {
      id:"shared-letter",
      knockout:state.sheet?<path d={state.sheet}
        data-km-riso-human-ensemble-sheet={state.progress.toFixed(3)}/>:undefined,
      artworks:{
        blue:paint=><RisoTransferSheetPlate outline={state.sheet}
          geometry={state.printDetails} paint={paint} plateId="blue" detail={sheetDetail}/>,
        red:paint=><RisoTransferSheetPlate outline={state.sheet}
          geometry={state.printDetails} paint={paint} plateId="red" detail={sheetDetail}/>,
      },
    },
    ...(fingertipOcclusion&&state.sheet
      ? [
        // Once the physical paper has moved away from the source finger root,
        // never leave that original rigged finger floating over its surface.
        ...(state.sourceTouching
          ? [gripLayer(COURIER,state.first,"right","courier-grip")]:[]),
        ...(state.receiverTouching
          ? [gripLayer(PAPER_ARTIST,state.second,"left","artist-grip")]:[]),
      ]
      : []),
  ];
  return <main style={{background:"#F0E4D1",padding:18,minHeight:"100vh",font:"14px system-ui,sans-serif"}}>
    <div style={{maxWidth:1320,margin:"0 auto"}} data-km-riso27-film-editor=""
        data-km-riso27-playing={playing?"yes":"no"} data-km-riso27-fps={RISO_ENSEMBLE_FILM_FPS}
        data-km-riso27-source-frame={frame}
        data-km-riso28-footfall={frame>=165?"grounded":"approaching"}>
      <div style={{fontWeight:800,letterSpacing:2,fontSize:12}}>RISO43 / 24 FPS HANDOFF FILM · TWO-LAYER PHYSICAL PAPER PINCH</div>
      <h2 style={{font:"700 29px Georgia,serif",margin:"8px 0"}}>Two original figures · a printed-sheet exchange</h2>
      <p style={{fontSize:13,maxWidth:900,lineHeight:1.5}}>
        Distinct coat, bob hair and facial geometry for the Paper Artist; the Courier retains
        its existing body and satchel grip. The curved printed sheet follows both evaluated hands through a shared physical contour,
        with controllable curl, grip compression, screened fold and original address engravings.
        Only the real index-finger ink prints in front of paper; the opposing red thumb and other three\n        digits stay below the opaque sheet. During contact, the Courier
        releases the sheet while the Paper Artist keeps holding it. Release timing, duration
        and tilt are authored; original material-local pressure folds and screened compression
        track the two hand grips. This is not a force-based collision solver.
        Real RisoPrint spot-ink screens, print registration, paper pores and fibres are used.
        The approach uses complementary grounded strides; both original boots stay planted
        from frame 165 while the pelvis advances into the handoff.
      </p>
      <div style={{display:"flex",flexWrap:"wrap",gap:9,alignItems:"center",padding:"8px 0"}}
        data-km-riso27-acting-beats="">
        {RISO_ENSEMBLE_MOTION_BEATS.map(beat=><button key={beat.frame} type="button"
          aria-label={"Seek film to "+beat.label+" at frame "+beat.frame}
          aria-pressed={frame===beat.frame} title={beat.intent}
          onClick={()=>seek(beat.frame)} style={{
            padding:"5px 9px",border:"1px solid #AA9682",borderRadius:4,
            cursor:"pointer",font:"12px system-ui,sans-serif",
            background:frame===beat.frame?"#255B8E":"#F8F0E2",
            color:frame===beat.frame?"#FFF":"#355061",
          }}>{beat.label} <small>f{beat.frame}</small></button>)}
        <small style={{color:"#63727A"}}>240 source frames · 24fps · 10 seconds · {frame>=165?"both boots planted":"alternating contacts"}</small>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:20,alignItems:"center",padding:"12px 0"}}>
        <button type="button" aria-label={playing?"Pause Risograph ensemble":"Play Risograph ensemble"}
          aria-pressed={playing} onClick={toggleFilm}
          style={{border:"1px solid #426079",borderRadius:4,color:"#FFF",background:"#244D6C",
            fontWeight:700,padding:"8px 12px",cursor:"pointer"}}>
          {playing?"Pause":"Play 24fps film"}
        </button>
        <button type="button" aria-label="RISO27 previous source frame"
          onClick={()=>seek(frame-1)}>−1 frame</button>
        <label>Frame · {frame} <input type="range" min={0} max={239} value={frame}
          aria-label="RISO ensemble film frame" onChange={e=>seek(Number(e.target.value))}/></label>
        <button type="button" aria-label="RISO27 next source frame"
          onClick={()=>seek(frame+1)}>+1 frame</button>
        <label>Output <select value={aspect} aria-label="RISO ensemble aspect"
          onChange={e=>setAspect(e.target.value as EnsembleAspect)}>
          <option value="landscape">16:9</option><option value="portrait">9:16</option>
        </select></label>
        <label>Ink <select value={plate} aria-label="RISO ensemble ink plate"
          onChange={e=>setPlate(e.target.value as EnsemblePlate)}>
          <option value="both">Both plates</option><option value="blue">Cobalt</option>
          <option value="red">Vermilion</option>
        </select></label>
        <label>Paper curl · {paperCurl.toFixed(1)}
          <input type="range" min={0} max={12} step={.5} value={paperCurl}
            aria-label="RISO ensemble paper curl"
            onChange={e=>setPaperCurl(Number(e.target.value))}/></label>
        <label>Hand grip pinch · {gripPinch.toFixed(2)}
          <input type="range" min={0} max={1} step={.05} value={gripPinch}
            aria-label="RISO ensemble paper grip pinch"
            onChange={e=>setGripPinch(Number(e.target.value))}/></label>
        <label>Pressed paper creases · {imprintDepth.toFixed(2)}
          <input type="range" min={0} max={1} step={.05} value={imprintDepth}
            aria-label="RISO ensemble pressure crease depth"
            onChange={e=>setImprintDepth(Number(e.target.value))}/></label>
        <label>Release starts · {releaseStart}
          <input type="range" min={170} max={190} step={1} value={releaseStart}
            aria-label="RISO ensemble donor release frame"
            onChange={e=>setReleaseStart(Number(e.target.value))}/></label>
        <label>Release duration · {releaseDuration} frames
          <input type="range" min={14} max={32} step={1} value={releaseDuration}
            aria-label="RISO ensemble transfer duration"
            onChange={e=>setReleaseDuration(Number(e.target.value))}/></label>
        <label>Receiver-held tilt · {settleDegrees}°
          <input type="range" min={-75} max={0} step={1} value={settleDegrees}
            aria-label="RISO ensemble receiver paper tilt"
            onChange={e=>setSettleDegrees(Number(e.target.value))}/></label>
        <label><input type="checkbox" checked={fingertipOcclusion}
          aria-label="RISO ensemble anatomical fingertip occlusion"
          onChange={e=>setFingertipOcclusion(e.target.checked)}/>
          Original finger-over-paper contacts</label>
        <label><input type="checkbox" checked={sheetDetail}
          aria-label="RISO ensemble fine printed-sheet detail"
          onChange={e=>setSheetDetail(e.target.checked)}/> Fine printed-sheet detail</label>
        <label><input type="checkbox" checked={anchors} aria-label="RISO ensemble contact anchors"
          onChange={e=>setAnchors(e.target.checked)}/> Show contact anchors</label>
        <label>Screen cell · {dotCell}px <input type="range" min={3} max={12} step={1}
          aria-label="RISO ensemble screen cell" value={dotCell}
          onChange={e=>setDotCell(Number(e.target.value))}/></label>
        <label>Ink registration · {misregistration.toFixed(2)}
          <input type="range" min={0} max={1} step={.05}
            aria-label="RISO ensemble registration" value={misregistration}
            onChange={e=>setMisregistration(Number(e.target.value))}/></label>
        <label>Paper fibres · {grain.toFixed(2)}
          <input type="range" min={0} max={1} step={.05}
            aria-label="RISO ensemble paper grain" value={grain}
            onChange={e=>setGrain(Number(e.target.value))}/></label>
      </div>
      <div role="status" aria-live="off" data-km-riso-handoff-cue-sheet=""
        style={{display:"flex",flexWrap:"wrap",gap:16,fontSize:12,
          borderTop:"1px solid #B99F87",padding:"8px 0",marginBottom:8}}>
        <span>Performance beat · <strong>{state.phase}</strong></span>
        <span>Print owner · <strong>{state.owner}</strong></span>
        <span>Courier paper pressure · {Math.round(state.sourceContactPressure*100)}%</span>
        <span>Artist paper pressure · {Math.round(state.receiverContactPressure*100)}%</span>
      </div>
      <div style={{width:aspect==="portrait"?450:960,
        maxWidth:"100%",aspectRatio:aspect==="portrait"?"540 / 960":"960 / 540",
        margin:"0 auto",
        border:"1px solid #B99F87",overflow:"visible"}}
        data-km-riso-ensemble-stage-container={aspect}>
        <RisoPrint
          spec={printSpec} frame={frame} reducedMotion={true}
          paperGrain={grain} misregistration={misregistration}
          style={{width:"100%",height:"100%",display:"block",overflow:"hidden"}}
          visiblePlateIds={plate==="both"?undefined:[plate]}
          artworks={{
            blue:paint=><g fill={paint.solid}>
              {/* Registration-locked floor contact: paper shadows follow real ankle roots. */}
              {footContacts.map((pos,i)=><ellipse key={i} cx={pos.x} cy={pos.y+14}
                rx={13} ry={3.8} fill={paint.dots} data-km-riso-foot-contact={i}/>)}
              <text x={state.width/2} y={aspect==="portrait"?178:76}
                textAnchor="middle" fontFamily="Georgia,serif"
                fontWeight={700} fontSize={35}>A PRINT TO SHARE</text>
              {anchors&&<g fill="none" stroke={paint.solid} strokeWidth={1.5}
                data-km-riso-ensemble-debug-anchors="">
                {([state.source,state.receiver] as const).map((pos,i)=>
                  <g key={i}><circle cx={pos.x} cy={pos.y} r={5}/>
                    <path d={`M${pos.x-10} ${pos.y}h20 M${pos.x} ${pos.y-10}v20`}/></g>)}
              </g>}
            </g>,
            red:paint=><text x={state.width/2} y={aspect==="portrait"?210:99}
              textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight={700}
              letterSpacing={3} fontSize={aspect==="portrait"?12:11}
              fill={paint.solid}>TWO MAKERS · TWO INKS</text>,
          }}
          foregroundLayers={layers}
          data-km-riso-human-ensemble-frame={frame}
          data-km-riso-human-ensemble-aspect={aspect}
          data-km-riso-human-ensemble-paper-curl={paperCurl}
          data-km-riso-human-ensemble-grip-pinch={gripPinch}
          data-km-riso-human-ensemble-imprint-depth={imprintDepth}
          data-km-riso41-donor-ink-gap={state.donorInk.inkGap.toFixed(3)}
          data-km-riso41-receiver-ink-gap={state.receiverInk.inkGap.toFixed(3)}
          data-km-riso41-donor-pad-pressure={state.donorInk.pressure.toFixed(3)}
          data-km-riso41-receiver-pad-pressure={state.receiverInk.pressure.toFixed(3)}
          data-km-riso40-donor-pad-distance={state.donorGrip.tipDistance.toFixed(3)}
          data-km-riso40-receiver-pad-distance={state.artistGrip.tipDistance.toFixed(3)}
          data-km-riso40-source-fingertip-anchor={state.donorGrip.anchorToRoot.toFixed(3)}
          data-km-riso40-receiver-fingertip-anchor={state.artistGrip.anchorToRoot.toFixed(3)}
          data-km-riso-paper-source-contact={state.sourceContactPressure.toFixed(3)}
          data-km-riso-paper-receiver-contact={state.receiverContactPressure.toFixed(3)}
          data-km-riso43-front-printed-index-parts={riso43FrontIndexIds("right").length}
          data-km-riso43-paper-layering="index-above-thumb-below"
          data-km-riso-human-ensemble-contact-overprint={fingertipOcclusion}
          data-km-riso-handoff-phase={state.phase}
          data-km-riso-handoff-owner={state.owner}
          data-km-riso-handoff-release={state.releaseProgress.toFixed(3)}
          label="Two human Risograph actors exchanging a printed sheet"
        />
      </div>

      <p style={{fontSize:12,color:"#63727A"}}>
        All frames are deterministic. The letter begins at the Courier's hand,
        reaches the Paper Artist by frame 160, then releases from the Courier at the
        configured moment. The print follows the recipient afterward. No alpha-transparent
        bodies, synthetic mitten shapes or playback-history-dependent transforms.
      </p>
    </div>
  </main>;
}
