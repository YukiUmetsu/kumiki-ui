/** One absolute-frame prop handoff: unfold → shared hold → release → receiver. */
export interface RisoHandoffPoint {x:number;y:number}
export interface RisoHandoffSchedule {
  unfoldStart: number;
  contactFrame: number;
  releaseStart: number;
  releaseEnd: number;
  /** Final in-hand paper inclination; negative turns the free tip down. */
  settleDegrees: number;
}
export type RisoHandoffPhase="unfurl"|"shared"|"release"|"received";
export type RisoHandoffOwner="source"|"both"|"receiver";
export interface RisoHandoffFrame {
  phase:RisoHandoffPhase;
  owner:RisoHandoffOwner;
  progress:number;
  releaseProgress:number;
  sourceGrip:number;
  receiverGrip:number;
  sourceTouching:boolean;
  receiverTouching:boolean;
  paperStart:RisoHandoffPoint;
  paperEnd:RisoHandoffPoint;
}

export const RISO_HANDOFF_DEFAULTS:Readonly<RisoHandoffSchedule>={
  unfoldStart:126,contactFrame:160,releaseStart:178,releaseEnd:202,
  settleDegrees:-45,
};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=(v:number)=>{const x=clamp(v);return x*x*(3-2*x);};
const finite=(p:RisoHandoffPoint)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&
  Math.abs(p.x)<=20000&&Math.abs(p.y)<=20000;
const mix=(x:number,y:number,t:number)=>x+(y-x)*t;
const interpolate=(a:RisoHandoffPoint,b:RisoHandoffPoint,t:number):RisoHandoffPoint=>({
  x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),
});

/**
 * Source and receiver are evaluated at the current film frame, while
 * releaseAtSource/releaseAtReceiver are sampled once from the character rigs
 * at the *fixed absolute* releaseStart frame, not previous playback frames.
 *
 * After releaseEnd the source can move arbitrarily: the paper is entirely
 * receiver-relative and keeps its original release-chord length.
 */
export function evaluateRisoPropHandoff(
  frame:number,
  source:RisoHandoffPoint,
  receiver:RisoHandoffPoint,
  releaseAtSource:RisoHandoffPoint,
  releaseAtReceiver:RisoHandoffPoint,
  schedule:RisoHandoffSchedule=RISO_HANDOFF_DEFAULTS,
):RisoHandoffFrame {
  if(!Number.isInteger(frame)||frame<0||frame>36000||
    ![source,receiver,releaseAtSource,releaseAtReceiver].every(finite))
    throw new RangeError("RISO handoff requires a bounded frame and four finite stage anchors.");
  if(!schedule||typeof schedule!=="object"||
    ![schedule.unfoldStart,schedule.contactFrame,schedule.releaseStart,schedule.releaseEnd]
      .every(Number.isInteger)||
    schedule.unfoldStart<0||schedule.unfoldStart>=schedule.contactFrame||
    schedule.contactFrame>=schedule.releaseStart||schedule.releaseStart>=schedule.releaseEnd||
    schedule.releaseEnd>36000||!Number.isFinite(schedule.settleDegrees)||
    Math.abs(schedule.settleDegrees)>85)
    throw new RangeError("RISO handoff timing must increase and settleDegrees must be -85..85.");

  const progress=clamp((frame-schedule.unfoldStart)/
    (schedule.contactFrame-schedule.unfoldStart));
  const releaseProgress=ease((frame-schedule.releaseStart)/
    (schedule.releaseEnd-schedule.releaseStart));
  const phase:RisoHandoffPhase=
    frame<schedule.contactFrame?"unfurl":
    frame<schedule.releaseStart?"shared":
    frame<schedule.releaseEnd?"release":"received";
  const rad=schedule.settleDegrees*Math.PI/180;
  const dx=releaseAtSource.x-releaseAtReceiver.x;
  const dy=releaseAtSource.y-releaseAtReceiver.y;
  const receivedFreeEnd:RisoHandoffPoint={
    x:receiver.x+dx*Math.cos(rad)-dy*Math.sin(rad),
    y:receiver.y+dx*Math.sin(rad)+dy*Math.cos(rad),
  };
  const paperStart=phase==="unfurl"||phase==="shared" ? {...source}
    :interpolate(source,receivedFreeEnd,releaseProgress);
  const paperEnd=phase==="unfurl"?interpolate(source,receiver,progress):{...receiver};
  // The recipient begins closing a real finger grip as the sheet approaches.
  const receiverGrip=clamp((progress-.94)/.06);
  const sourceGrip=1-releaseProgress;
  const sourceTouching=progress>0&&sourceGrip>.025&&
    Math.hypot(paperStart.x-source.x,paperStart.y-source.y)<=12;
  const receiverTouching=progress>0&&receiverGrip>.05;
  return {
    phase,owner:phase==="unfurl"?"source":
      phase==="received"?"receiver":"both",
    progress,releaseProgress,sourceGrip,receiverGrip,
    sourceTouching,receiverTouching,paperStart,paperEnd,
  };
}
