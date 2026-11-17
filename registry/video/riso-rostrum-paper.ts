import {clamp01} from "./print-plates";

/** RISO77's paper-mounted original cut-outs. Spot inks and paper-grain are
 * baked into the source sheet: their paths NEVER regenerate as they move. */
export interface RisoRostrumCutoutPose{
  readonly id:string;
  /** Original source-paper coordinates (and all stencil paths) remain fixed. */
  readonly pivot:readonly [number,number];
  readonly entryOffset:readonly [number,number];
  readonly entryAngleDegrees:number;
  readonly finalOffset?:readonly [number,number];
  readonly finalAngleDegrees?:number;
  /** Separates actual paper planes: height never alters source ink contours. */
  readonly depthMm:number;
}
export interface RisoRostrumPose{
  readonly id:string;
  readonly frameSample:number;
  readonly progress:number;
  readonly translation:readonly [number,number];
  readonly angleDegrees:number;
  readonly liftMm:number;
  readonly shadowOffset:readonly [number,number];
  readonly shadowOpacity:number;
  readonly fixedPaperRegistration:true;
}
const finite=(x:number)=>Number.isFinite(x)&&Math.abs(x)<100_000;
const round=(x:number)=>Number(x.toFixed(4));
const ease=(t:number)=>t*t*(3-2*t);
const isVec=(v:readonly number[]|undefined)=>
  Array.isArray(v)&&v.length===2&&v.every(finite);
function inspectPose(clip:RisoRostrumCutoutPose){
  if(!clip||typeof clip.id!=="string"||
    !/^[a-z][a-z0-9-]{0,39}$/.test(clip.id)||
    !isVec(clip.pivot)||!isVec(clip.entryOffset)||
    (clip.finalOffset!==undefined&&!isVec(clip.finalOffset))||
    !finite(clip.entryAngleDegrees)||Math.abs(clip.entryAngleDegrees)>100||
    (clip.finalAngleDegrees!==undefined&&(
      !finite(clip.finalAngleDegrees)||Math.abs(clip.finalAngleDegrees)>100))||
    !finite(clip.depthMm)||clip.depthMm<0||clip.depthMm>12)
    throw new RangeError("RISO77 cutout needs a unique slug, finite pivot/motion, ±100° angle and 0–12mm paper depth.");
}
/** Absolute FilmStage frame, rounded down to stop-motion exposures on twos.
 * Every cutout lands independently; their final source paper is exact.
 * The seed belongs to the source ink sheets, never to the paper animation. */
export function evaluateRisoRostrumCutout(
  clip:RisoRostrumCutoutPose,
  frame:number,startFrame:number,durationFrames:number,index:number,
  options?:{
    readonly exposureFrames?:1|2|3|4;
    readonly light?:readonly [number,number];
    readonly camera?:readonly [number,number];
    readonly reducedMotion?:boolean;
  },
):RisoRostrumPose{
  inspectPose(clip);
  if(!Number.isSafeInteger(frame)||frame<0||
    !Number.isSafeInteger(startFrame)||startFrame<0||
    !Number.isSafeInteger(durationFrames)||durationFrames<1||durationFrames>2400||
    !Number.isSafeInteger(index)||index<0||index>11)
    throw new RangeError("RISO77 requires nonnegative absolute FilmStage frames, 1–2400 duration and up to 12 paper planes.");
  const exposureFrames=options?.exposureFrames??2;
  if(![1,2,3,4].includes(exposureFrames))
    throw new RangeError("RISO77 exposure cadence must be 1, 2, 3 or 4 frames.");
  const light=options?.light??[.9,1.3];
  const camera=options?.camera??[0,0];
  if(!isVec(light)||!isVec(camera)||light.some(x=>Math.abs(x)>5)||
     camera.some(x=>Math.abs(x)>200))
    throw new RangeError("RISO77 requires bounded rostrum lamp and camera offsets.");
  const local=clamp01((frame-startFrame)/durationFrames);
  const sample=(options?.reducedMotion||local>=1)?durationFrames:
    Math.max(0,Math.floor(Math.max(0,frame-startFrame)/exposureFrames)*exposureFrames);
  const time=clamp01(sample/durationFrames);
  // Each paper element settles a few frames after the previous one.
  const stagger=Math.min(.45,index*.135);
  const u=clamp01((time-stagger)/(1-stagger));
  const landed=ease(u);
  const final=clip.finalOffset??[0,0],finalA=clip.finalAngleDegrees??0;
  const shiftX=clip.entryOffset[0]*(1-landed)+final[0]*landed;
  const shiftY=clip.entryOffset[1]*(1-landed)+final[1]*landed;
  // Cutouts can be lifted as the operator repositions them. At the end
  // only the physical paper thickness remains, no artificial floating.
  const extraLift=Math.sin(u*Math.PI)*Math.min(3.5,clip.depthMm*.62+1.2);
  const lift=clip.depthMm+Math.max(0,extraLift);
  // Physical rostrum optics: a raised clipping reacts more strongly to
  // camera pan than the underlying reference sheet. Never move ink alone.
  const shift=clip.depthMm*.038;
  return {
    id:clip.id,frameSample:sample,progress:round(landed),
    translation:[
      round(shiftX-camera[0]*shift),
      round(shiftY-camera[1]*shift),
    ],
    angleDegrees:round(clip.entryAngleDegrees*(1-landed)+finalA*landed),
    liftMm:round(lift),
    shadowOffset:[
      round(light[0]*lift*1.8),
      round(light[1]*lift*1.8),
    ],
    shadowOpacity:round(Math.min(.36,.055+.024*lift)),
    fixedPaperRegistration:true,
  };
}

/** Real cut-paper stage contract. Paths describe a continuous closed sheet
 * outline, never a screenshot, filter, auto-traced flat blob or generic tile. */
export function assertRisoCutoutContour(path:string){
  if(typeof path!=="string"||path.length<20||path.length>24_000||
    !/^\s*M\s*[-+\d.]/i.test(path)||
    !/[zZ]\s*$/.test(path)||
    !/^[\s\d.,+\-MmLlHhVvCcQqSsTtAaZzEe]+$/.test(path))
    throw new RangeError("RISO77 requires a bounded original closed SVG paper contour.");
  // The shape remains artist-authored. Do not auto-simplify or resample it.
}
