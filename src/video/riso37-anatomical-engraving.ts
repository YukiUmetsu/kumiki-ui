import type {RisoCharacterPart} from "../../registry/video/riso-character";
import {RISO31_GEOMETRY} from "./riso31-finger-phalanges";

/**
 * RISO37 / ArtCraft v9 — native source-drawn cobalt incisions on vermilion
 * gloves. The prior hand had two thick, perfectly horizontal bands at every
 * PIP/DIP joint and a single wide palm arch. At contact these became black
 * accordion stripes and a palm "claw", masking the curved red anatomy.
 *
 * These are ORIGINAL editable C/Q Bézier contours, not photographic filters,
 * sketch-on-top stickers, disabled print ink, or source simplification.
 * RisoPrint still prints all marks on the real cobalt spot master.
 * Reference study: docs/research/riso37-hand-engraving-artcraft.md
 */
export type Riso37Actor="courier"|"paper-artist";
export type Riso37Side="left"|"right";
type Digit=keyof typeof RISO31_GEOMETRY;
const digits:readonly Digit[]=["index","middle","ring","pinky"];

/** The MCP arc is four *individual* soft crests following the staggered
 * metacarpal fan, leaving breathing space at actual valleys. Front vs back
 * curvature stays on the same existing palm-surface joint. */
function mcpContours(actor:Riso37Actor):string{
  const back=actor==="courier";
  const seeds=back
    ?[[-7.8,-4.35,4.76,3.98],[-3.85,-.15,4.49,3.77],
      [.3,3.9,4.36,3.83],[4.1,7.83,4.91,4.17]]
    :[[-7.7,-4.35,4.82,4.15],[-3.85,-.15,4.52,3.94],
      [.3,3.85,4.5,3.96],[4.05,7.77,4.97,4.34]];
  return seeds.map(([x0,x1,y,crest],i)=>{
    const n=(v:number)=>Number(v.toFixed(2));
    const mid=(x0+x1)/2,step=i%2===0?.36:.28;
    return `M${x0} ${y} C${n(x0+.9)} ${crest} ${n(mid-.9)} ${n(crest-.15)} ${n(mid)} ${n(crest+.15)}
C${n(mid+.85)} ${n(crest+.25)} ${n(x1-.8)} ${n(y-.48)} ${x1} ${n(y+.08)}
L${n(x1-.15)} ${n(y+.3)}
C${n(x1-.65)} ${n(y-.14)} ${n(mid+.68)} ${n(crest+step+.34)} ${n(mid)} ${n(crest+step+.29)}
C${n(mid-1.0)} ${n(crest+step+.07)} ${n(x0+.7)} ${n(y+.05)} ${n(x0+.05)} ${n(y+.27)} Z`;
  }).join("\n");
}
function wristContours(actor:Riso37Actor):string{
  return actor==="courier"
    ?"M-7.3 -7.9 C-5.1 -7.45 -3.2 -7.25 -.9 -7.7 L-.96 -7.36 C-3 -6.97 -5.5 -7.13 -7.39 -7.56 Z M1.1 -7.8 C3.45 -7.36 5.4 -7.33 7.05 -7.52 L7.17 -7.17 C5.45 -6.96 3.1 -7.03 1.02 -7.5 Z"
    :"M-7.4 -7.7 C-5.9 -7.18 -3.95 -7.19 -1.65 -7.66 L-1.8 -7.32 C-3.9 -6.9 -6.02 -6.98 -7.47 -7.38 Z M.55 -7.93 C3.2 -7.63 5.1 -7.19 7.1 -7.5 L7.16 -7.16 C5.04 -6.86 3.1 -7.37 .48 -7.61 Z";
}
function thenarContours(side:Riso37Side,actor:Riso37Actor):string{
  const src=actor==="courier"
    ?"M6.7 -5.3 C6.2 -2.45 4.75 -.6 2.6 1.22 L2.35 1.58 C4.73 -.22 6.7 -2.3 6.7 -5.3 Z M5.3 -2.9 C4.9 -1.65 4.3 -.5 3.6 .05 L3.52 .5 Q5.1 -1.08 5.3 -2.9 Z"
    :"M6.75 -5.1 C6.15 -2.6 4.45 -.2 2.55 1.18 L2.29 1.47 Q5.49 -.7 6.75 -5.1 Z M5.1 -2.1 C4.67 -.91 4.04 -.31 3.45 .35 L3.42 .61 Q5 -1.01 5.1 -2.1 Z";
  // The opposite original hand is not mirrored as a raster. Mirror the
  // authored two-spot control path through the SVG's local transform;
  // no handedness change to the actual source joint or red silhouettes.
  return side==="right"?src:
    // Source-drawn alternate contour retains its own Bézier inflection.
    (actor==="courier"
      ?"M-6.7 -5.3 C-6.2 -2.5 -4.75 -.55 -2.6 1.22 L-2.35 1.58 C-4.73 -.22 -6.7 -2.3 -6.7 -5.3 Z M-5.3 -2.9 C-4.9 -1.65 -4.3 -.5 -3.6 .05 L-3.52 .5 Q-5.1 -1.08 -5.3 -2.9 Z"
      :"M-6.75 -5.1 C-6.15 -2.6 -4.45 -.2 -2.55 1.18 L-2.29 1.47 Q-5.49 -.7 -6.75 -5.1 Z M-5.1 -2.1 C-4.67 -.91 -4.04 -.31 -3.45 .35 L-3.42 .61 Q-5 -1.01 -5.1 -2.1 Z");
}
const n=(v:number)=>Number(v.toFixed(2));
/** Stagger two dark fold strokes and a finer lighter side incision. Short
 * localized arcs carry the real PIP/DIP joint; never straight tiger bars. */
function crease(digit:Digit,actor:Riso37Actor,stage:"pip"|"dip"):string{
  const g=RISO31_GEOMETRY[digit],w=g.width*(stage==="pip"?.75:.64);
  const handdrawn=actor==="courier"?.1:.19,asym=
    digit==="index"?.13:digit==="middle"?-.12:digit==="ring"?.15:-.11;
  const start=-w*(stage==="pip"?.82:.7),end=w*(stage==="pip"?.78:.74);
  const peak=stage==="pip"?-1.32:-1.22;
  const top=stage==="pip"?-.72:-.7;
  const stroke=(x0:number,x1:number,y:number,depth:number,thick:number)=>`M${n(x0)} ${n(y)}
C${n(x0+(x1-x0)*.33)} ${n(y-depth)} ${n(x1-(x1-x0)*.28)} ${n(y-depth*(.65+handdrawn))} ${n(x1)} ${n(y+asym)}
L${n(x1-.08)} ${n(y+asym+thick)}
C${n(x1-(x1-x0)*.28)} ${n(y-depth*(.65+handdrawn)+thick)}
 ${n(x0+(x1-x0)*.33)} ${n(y-depth+thick)} ${n(x0+.04)} ${n(y+thick)} Z`;
  return [
    stroke(start,end,peak,.25,stage==="pip"?.23:.19),
    stroke(start*.46,end*.66,top,.19,stage==="pip"?.17:.14),
    stroke(start*.27,end*.22,.63,.11,.13),
  ].join("\n");
}
/** The original large black filled nail wedge covered nearly the entire tip.
 * Maintain two engraved original nail features per DIP with width/length
 * referenced to the real source distal width and reach, not arbitrary dots.
 */
function nail(digit:Digit,actor:Riso37Actor):string{
  const g=RISO31_GEOMETRY[digit],w=g.width*.4;
  const y=g.distal-(actor==="courier"?1.6:1.46);
  return `M${n(-w)} ${n(y)} C${n(-w*.65)} ${n(y-.47)} ${n(w*.46)} ${n(y-.53)} ${n(w)} ${n(y-.06)}
L${n(w*.89)} ${n(y+.18)} C${n(w*.21)} ${n(y-.17)} ${n(-w*.44)} ${n(y-.12)} ${n(-w*.91)} ${n(y+.2)} Z
M${n(-w*.39)} ${n(y+.54)} Q0 ${n(y+.35)} ${n(w*.34)} ${n(y+.5)}
L${n(w*.32)} ${n(y+.62)} Q0 ${n(y+.52)} ${n(-w*.35)} ${n(y+.67)} Z`;
}
/** Replace only ANATOMY blue print mark source, preserve every named part,
 * exact joint and authored red material. No deleted strokes or textures. */
export function refineRiso37SourceEngraving(
  part:RisoCharacterPart,actor:Riso37Actor,side:Riso37Side,
):RisoCharacterPart{
  const prefix=side+"-glove-";
  if(!part.id.startsWith(prefix))return part;
  const name=part.id.slice(prefix.length);
  if(name==="detail"){
    // Previous unedited original glove-detail source consisted of two
    // ~3-unit filled black triangular holes at the wrist. The hands looked
    // punched-through rather than supported by small soft-palmar tendons.
    // Preserve the same two original anatomical marks as *several* curved
    // incision outlines in actual joint-local cobalt, now with ink weight.
    const d=actor==="courier"
      ?"M-5.75 2.43 C-4.68 1.86 -3.61 1.71 -2.64 2.54 L-2.78 2.89 C-3.81 2.14 -4.65 2.38 -5.58 2.78 Z M-4.65 3.42 Q-4.02 3.05 -3.47 3.36 L-3.57 3.59 Q-4.04 3.39 -4.53 3.69 Z M.95 2.34 C2.3 1.55 3.63 1.84 4.24 2.64 L4.12 2.97 C3.4 2.17 2.43 2.3 1.04 2.71 Z M1.75 3.51 Q2.6 3.18 3.47 3.71 L3.33 3.95 Q2.53 3.56 1.81 3.85 Z"
      :"M-5.72 2.51 C-4.71 1.94 -3.59 1.97 -2.56 2.61 L-2.71 2.99 C-3.85 2.37 -4.64 2.48 -5.61 2.86 Z M-4.63 3.53 Q-4 3.24 -3.43 3.51 L-3.59 3.76 Q-4.1 3.54 -4.55 3.82 Z M.87 2.39 C2.05 1.83 3.59 1.88 4.32 2.73 L4.19 3.05 C3.45 2.31 2.21 2.38 .99 2.75 Z M1.68 3.59 Q2.65 3.27 3.59 3.68 L3.48 3.92 Q2.58 3.65 1.79 3.89 Z";
    return {...part,d,paint:"screen",screenTone:"mid"};
  }
  if(name==="thumb-fold"){
    // Thumb basal web creases should be narrow S-contours with a visible
    // red pad between them. Prior triangular slashes were more visually
    // prominent than the thumb's whole IP shadow.
    const d=side==="right"
      ?"M7.55 6.14 C8.6 6.61 10.05 7.2 10.7 8.35 L10.37 8.49 C9.41 7.47 8.2 6.98 7.46 6.43 Z M8.28 7.65 Q9.24 8.02 10.07 8.84 L9.91 9.07 Q9.05 8.35 8.31 8.02 Z"
      :"M-7.54 6.2 C-8.51 6.64 -10.11 7.3 -10.72 8.42 L-10.39 8.56 C-9.42 7.53 -8.18 7.05 -7.45 6.49 Z M-8.22 7.69 Q-9.22 8.09 -10.09 8.92 L-9.9 9.13 Q-9.03 8.4 -8.22 8.06 Z";
    return {...part,d,paint:"screen",screenTone:"mid"};
  }
  if(name==="knuckle-arc")return {...part,d:mcpContours(actor),paint:"solid"};
  if(name==="wrist-crease")return {...part,d:wristContours(actor),paint:"screen",screenTone:"mid"};
  if(name==="thenar-fold")return {...part,d:thenarContours(side,actor),paint:"screen",screenTone:"mid"};
  const folds=/^(index|middle|ring|pinky)-(joint-crease|dip-crease)$/.exec(name);
  if(folds){
    const digit=folds[1] as Digit;
    const stage=folds[2]==="joint-crease"?"pip":"dip";
    return {...part,d:crease(digit,actor,stage),paint:stage==="pip"?"solid":"screen",
      screenTone:stage==="pip"?undefined:"light"};
  }
  const tip=/^(index|middle|ring|pinky)-nail$/.exec(name);
  if(tip)return {...part,d:nail(tip[1] as Digit,actor),paint:"screen",screenTone:"mid"};
  if(name==="thumb-nail")return {...part,
    d:side==="right"
      ?"M-1.02 4.18 C-.51 3.84 .33 3.91 .86 4.27 L.77 4.57 Q.03 4.18 -.87 4.6 Z M-.38 4.85 Q.06 4.69 .41 4.83 L.33 5 Q.07 4.94 -.33 5.05 Z"
      :"M-1 4.27 C-.39 3.87 .47 3.85 .97 4.19 L.86 4.51 Q-.02 4.19 -.86 4.6 Z M-.32 4.87 Q.12 4.72 .44 4.86 L.37 5.02 Q.11 4.95 -.31 5.08 Z",
    paint:"screen",screenTone:"mid"};
  return part;
}
/** Source-born 3D-form hint: gentle lateral tendon trace between metacarpal
 * joint and first crease. It moves with the actual finger, not the viewport.
 * Two independent ribbons add tactile print detail without thick tiger bars.
 */
export function riso37ProximalPressureStrands(actor:Riso37Actor,side:Riso37Side):readonly RisoCharacterPart[]{
  return digits.map(digit=>{
    const {width,proximal}=RISO31_GEOMETRY[digit];
    const dir=digit==="pinky"?-1:digit==="ring"?.15:digit==="middle"?-.12:.22;
    const sx=width*(actor==="courier"?.46:.36)*dir;
    const endY=proximal-(digit==="pinky"?2.45:2.85);
    return {id:side+"-glove-"+digit+"-dorsal-plane",
      joint:side+"-"+digit,plate:"blue" as const,paint:"screen" as const,screenTone:"light" as const,
      d:`M${n(sx)} 1.05 C${n(sx+.1)} 2.15 ${n(sx-.35)} ${n(endY-1.25)} ${n(sx-.15)} ${n(endY)}
L${n(sx+.10)} ${n(endY-.04)}
C${n(sx-.08)} ${n(endY-1.45)} ${n(sx+.31)} 2.22 ${n(sx+.16)} 1.03 Z
M${n(sx-.65)} 2.2 C${n(sx-.78)} 2.85 ${n(sx-.83)} 3.25 ${n(sx-.98)} 3.53
L${n(sx-.81)} 3.7 Q${n(sx-.48)} 2.86 ${n(sx-.5)} 2.2 Z`};
  });
}
