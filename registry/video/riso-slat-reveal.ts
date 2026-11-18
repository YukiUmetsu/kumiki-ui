import {clamp01,printHash} from "./print-plates";

export type RisoSlatAxis="horizontal"|"vertical";
export type RisoSlatDirection="up"|"down"|"left"|"right";

export interface RisoSlatSpec{
  readonly width:number;
  readonly height:number;
  /** Horizontal slats are rows; vertical slats are columns. */
  readonly axis:RisoSlatAxis;
  /** Horizontal rows travel up/down; vertical columns travel left/right. */
  readonly direction:RisoSlatDirection;
  readonly count:number;
  readonly progress:number;
  readonly seed:number;
  /** Initial retraction distance in source-sheet units. Defaults to one span plus the edge lap. */
  readonly travel?:number;
  readonly overlapMm?:number;
  readonly paperThicknessMm?:number;
  readonly slotClearanceMm?:number;
  /** Z separation between alternating interleave lanes. */
  readonly interleaveDepthMm?:number;
  /** Direction FROM the lamp toward the paper surface. */
  readonly lightDirection?:readonly [number,number];
}
export interface RisoSlatRect{
  readonly x:number;
  readonly y:number;
  readonly width:number;
  readonly height:number;
}
export interface RisoSlatPose extends RisoSlatRect{
  readonly id:string;
  readonly index:number;
  readonly slotOrder:number;
  readonly lane:0|1;
  readonly depthMm:number;
  readonly depthUnits:number;
  readonly translation:readonly [number,number];
  readonly exposure:number;
  readonly fibres:readonly string[];
}
export interface RisoSlatSlot{
  readonly index:number;
  readonly center:number;
  readonly path:string;
  readonly axis:RisoSlatAxis;
  readonly widthUnits:number;
}
export interface RisoSlatEvaluation{
  readonly easedProgress:number;
  readonly travel:number;
  readonly translation:readonly [number,number];
  readonly overlapMm:number;
  readonly overlapUnits:number;
  readonly paperThicknessMm:number;
  readonly slotClearanceMm:number;
  readonly slotWidthUnits:number;
  readonly interleaveDepthMm:number;
  readonly collisionClearanceMm:number;
  readonly shadowOffset:readonly [number,number];
  readonly shadowOpacity:number;
  readonly slats:readonly RisoSlatPose[];
  readonly slots:readonly RisoSlatSlot[];
  readonly orderPreserved:true;
  readonly collisionFree:true;
  readonly sourceRegistrationFixed:true;
}
const PX_PER_MM=96/25.4;
const round=(n:number)=>Number(n.toFixed(4));
const finite=(n:number)=>Number.isFinite(n);
const fibrePaths=(rect:RisoSlatRect,axis:RisoSlatAxis,seed:number,index:number):readonly string[]=>{
  const paths:string[]=[];
  for(let edge=0;edge<2;edge++)for(let i=0;i<12;i++){
    const along=(i+.12+.76*printHash(seed,index*37+i+1,edge+11))/12;
    const bend=(printHash(seed+19,index*53+i+7,edge+23)-.5)*.9;
    const length=.22+1.28*printHash(seed+41,index*71+i+3,edge+31);
    if(axis==="horizontal"){
      const x=rect.x+rect.width*along;
      const y=edge===0?rect.y:rect.y+rect.height;
      const normal=edge===0?-1:1;
      paths.push("M"+round(x)+" "+round(y)+" Q"+
        round(x+bend*.4)+" "+round(y+normal*length*.46)+" "+
        round(x+bend)+" "+round(y+normal*length));
    }else{
      const x=edge===0?rect.x:rect.x+rect.width;
      const y=rect.y+rect.height*along;
      const normal=edge===0?-1:1;
      paths.push("M"+round(x)+" "+round(y)+" Q"+
        round(x+normal*length*.46)+" "+round(y+bend*.4)+" "+
        round(x+normal*length)+" "+round(y+bend));
    }
  }
  return paths;
};

/** Pure source-space geometry for a pull-tab comb of independently printed paper slats.
 * Alternating depth lanes allow a bounded edge lap without coplanar collisions.
 * Every slat shares one rigid translation, so slot order cannot invert during a seek. */
export function evaluateRisoSlatReveal(spec:RisoSlatSpec):RisoSlatEvaluation{
  if(!spec||![spec.width,spec.height].every(finite)||
    spec.width<240||spec.height<240||spec.width>8192||spec.height>8192||
    !["horizontal","vertical"].includes(spec.axis)||
    !["up","down","left","right"].includes(spec.direction)||
    !Number.isSafeInteger(spec.count)||spec.count<4||spec.count>24||
    !finite(spec.progress)||spec.progress<0||spec.progress>1||
    !Number.isSafeInteger(spec.seed)||spec.seed<0||spec.seed>2147483647)
    throw new RangeError("RISO81 requires bounded paper, 4–24 slats, a compatible axis, progress 0..1 and a 31-bit seed.");
  const horizontal=spec.axis==="horizontal";
  if((horizontal&&!["up","down"].includes(spec.direction))||
    (!horizontal&&!["left","right"].includes(spec.direction)))
    throw new RangeError("RISO81 slat travel must be perpendicular to the slat's long axis.");
  const span=horizontal?spec.height:spec.width;
  const pitch=span/spec.count;
  const paperThicknessMm=spec.paperThicknessMm??.24;
  const slotClearanceMm=spec.slotClearanceMm??.08;
  const overlapMm=spec.overlapMm??.32;
  const interleaveDepthMm=spec.interleaveDepthMm??.42;
  const overlapUnits=overlapMm*PX_PER_MM;
  const slotWidthUnits=(paperThicknessMm+slotClearanceMm)*PX_PER_MM;
  const travel=spec.travel??span+overlapUnits+.5;
  if(!finite(paperThicknessMm)||paperThicknessMm<.08||paperThicknessMm>1.2||
    !finite(slotClearanceMm)||slotClearanceMm<.02||slotClearanceMm>.6||
    !finite(overlapMm)||overlapMm<0||overlapMm>.7||
    overlapUnits>pitch*.12||
    !finite(interleaveDepthMm)||interleaveDepthMm<paperThicknessMm+slotClearanceMm||
    interleaveDepthMm>3||
    !finite(travel)||travel<span+overlapUnits||travel>span*1.12||
    pitch-overlapUnits<slotWidthUnits+.25)
    throw new RangeError("RISO81 slat lap, slot clearance, interleave depth and retraction must preserve positive collision clearance.");
  const light=spec.lightDirection??[-.55,-.84];
  if(!Array.isArray(light)||light.length!==2||!light.every(finite)){
    throw new RangeError("RISO81 requires a finite two-component lamp direction.");
  }
  const lightLength=Math.hypot(light[0],light[1]);
  if(!finite(lightLength)||lightLength<.25||lightLength>1.5)
    throw new RangeError("RISO81 lamp direction length must be .25–1.5.");
  const eased=spec.progress*spec.progress*(3-2*spec.progress);
  const distance=travel*(1-eased);
  const translation:readonly [number,number]=horizontal?
    [0,spec.direction==="down"?-distance:distance]:
    [spec.direction==="right"?-distance:distance,0];
  const collisionClearanceMm=round(interleaveDepthMm-paperThicknessMm-slotClearanceMm);
  const depthUnits=interleaveDepthMm*PX_PER_MM;
  const shadowMagnitude=(paperThicknessMm+interleaveDepthMm)*PX_PER_MM*.82;
  const shadowOffset:readonly [number,number]=[
    round(-light[0]/lightLength*shadowMagnitude),
    round(-light[1]/lightLength*shadowMagnitude),
  ];
  const slats:RisoSlatPose[]=[];
  for(let index=0;index<spec.count;index++){
    const start=index*pitch-(index===0?0:overlapUnits/2);
    const end=(index+1)*pitch+(index===spec.count-1?0:overlapUnits/2);
    const rect:RisoSlatRect=horizontal?
      {x:0,y:round(start),width:spec.width,height:round(end-start)}:
      {x:round(start),y:0,width:round(end-start),height:spec.height};
    const lane=(index%2) as 0|1;
    const shiftedStart=horizontal?rect.y+translation[1]:rect.x+translation[0];
    const shiftedEnd=shiftedStart+(horizontal?rect.height:rect.width);
    const visible=Math.max(0,Math.min(span,shiftedEnd)-Math.max(0,shiftedStart));
    slats.push({
      ...rect,id:"slat-"+String(index+1).padStart(2,"0"),
      index,slotOrder:index,lane,depthMm:lane?interleaveDepthMm:0,
      depthUnits:lane?depthUnits:0,translation,
      exposure:clamp01(visible/(horizontal?rect.height:rect.width)),
      fibres:fibrePaths(rect,spec.axis,spec.seed,index),
    });
  }
  const slots:RisoSlatSlot[]=Array.from({length:spec.count-1},(_,i)=>{
    const center=(i+1)*pitch;
    return {index:i,center:round(center),axis:spec.axis,widthUnits:round(slotWidthUnits),
      path:horizontal?"M0 "+round(center)+" H"+spec.width:
        "M"+round(center)+" 0 V"+spec.height};
  });
  return {
    easedProgress:round(eased),travel:round(travel),translation,
    overlapMm,overlapUnits:round(overlapUnits),paperThicknessMm,
    slotClearanceMm,slotWidthUnits:round(slotWidthUnits),
    interleaveDepthMm,collisionClearanceMm,shadowOffset,
    shadowOpacity:round(Math.min(.34,.11+paperThicknessMm*.16)),
    slats,slots,orderPreserved:true,collisionFree:true,sourceRegistrationFixed:true,
  };
}

/** Absolute FilmStage frame evaluator; safe for reverse seek and reduced motion. */
export function risoSlatProgress(
  frame:number,startFrame:number,durationFrames:number,reducedMotion=false,
):number{
  if(!Number.isSafeInteger(frame)||frame<0||
    !Number.isSafeInteger(startFrame)||startFrame<0||
    !Number.isSafeInteger(durationFrames)||durationFrames<1||durationFrames>2400)
    throw new RangeError("RISO81 requires nonnegative integer frames and a 1–2400 frame reveal.");
  if(reducedMotion)return 1;
  return clamp01((frame-startFrame)/durationFrames);
}
