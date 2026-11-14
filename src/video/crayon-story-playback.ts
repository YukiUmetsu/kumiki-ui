import { useEffect, useRef, useState } from "react";

/** Pure playhead sampling: decoding/render cost must never determine story time. */
export function crayonFrameAtElapsed(
  fromFrame:number, elapsedMs:number, durationFrames:number,
  fps=30, rate=1, loop=false,
):number {
  if(!Number.isSafeInteger(durationFrames)||durationFrames<2||
    !Number.isFinite(fromFrame)||!Number.isFinite(elapsedMs)||elapsedMs<0||
    !Number.isFinite(fps)||fps<=0||fps>240||
    !Number.isFinite(rate)||rate<=0||rate>4)
    throw new RangeError("Invalid crayon film playback timing");
  const start=Math.max(0,Math.min(durationFrames-1,Math.floor(fromFrame)));
  const advanced=start+Math.floor(elapsedMs*fps*rate/1000);
  return loop ? advanced%durationFrames : Math.min(durationFrames-1,advanced);
}

/** Clamp author controls to a valid scene frame, including aspect/subject swaps. */
function clampFrame(value:number,durationFrames:number):number {
  return Math.max(0,Math.min(durationFrames-1,Number.isFinite(value)?Math.floor(value):0));
}

/**
 * Local Storybook controls only. FilmStage/CRAYON1 rendering stays frame-pure.
 * requestAnimationFrame supplies a presentation timestamp, not a tick counter;
 * skipped browser paints do not accumulate playback drift.
 */
export function useCrayonStoryPlayback(
  initialFrame:number,durationFrames:number,resetKey:string,rate=1,loop=false,
){
  const last=durationFrames-1;
  const [frame,setFrame]=useState(()=>clampFrame(initialFrame,durationFrames));
  const frameRef=useRef(frame);
  useEffect(()=>{frameRef.current=frame;},[frame]);
  const [playing,setPlaying]=useState(false);

  useEffect(()=>{
    setPlaying(false);
    setFrame(clampFrame(initialFrame,durationFrames));
  },[durationFrames,initialFrame,resetKey]);

  useEffect(()=>{
    if(!playing)return;
    let handle=0;
    const from=frameRef.current;
    const started=performance.now();
    const advance=(now:number)=>{
      const next=crayonFrameAtElapsed(from,Math.max(0,now-started),durationFrames,30,rate,loop);
      setFrame(next);
      if(!loop && next>=last){setPlaying(false);return;}
      handle=requestAnimationFrame(advance);
    };
    handle=requestAnimationFrame(advance);
    return ()=>cancelAnimationFrame(handle);
  },[playing,durationFrames,rate,loop,last]);

  const seek=(target:number)=>{setPlaying(false);setFrame(clampFrame(target,durationFrames));};
  const restart=()=>{setPlaying(false);setFrame(0);};
  const toggle=()=>{
    if(playing){setPlaying(false);return;}
    if(frame>=last)setFrame(0);
    setPlaying(true);
  };
  return {frame,playing,seek,restart,toggle};
}
