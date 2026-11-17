/** RISO64 — deterministic non-human press editorial, driven exclusively by
 * FilmStage's local frame. Every phase is a separate physical press/camera beat;
 * the ink drawing remains the existing source-native RISO62 artwork. */
export type RisoCinematicBeat=
  "cobalt-macro"|"cobalt-pullback"|"vermilion-pass"|
  "overprint-macro"|"original-hold";
export const RISO_CINEMATIC_BEATS = [
  {id:"cobalt-macro",duration:48},
  {id:"cobalt-pullback",duration:52},
  {id:"vermilion-pass",duration:74},
  {id:"overprint-macro",duration:48},
  {id:"original-hold",duration:66},
] as const;
export interface RisoCinematicPose {
  beat:RisoCinematicBeat;
  printFrame:number;
  sourceFrame:number;
  sourceMotion:boolean;
  plate:"blue"|"both";
  zoom:number;
  focusX:number;
  focusY:number;
  sceneProgress:number;
}
const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(t:number)=>{const s=clamp01(t);return s*s*(3-2*s);};
const between=(a:number,b:number,t:number)=>a+(b-a)*ease(t);
export function cinematicDuration(beat:RisoCinematicBeat):number{
  const found=RISO_CINEMATIC_BEATS.find(item=>item.id===beat);
  if(!found)throw new RangeError("RISO64 requires a known editorial shot");
  return found.duration;
}
export function evaluateRisoCinematic(
  beat:RisoCinematicBeat,frame:number,reducedMotion=false,
):RisoCinematicPose{
  const duration=cinematicDuration(beat);
  if(!Number.isSafeInteger(frame)||frame<0||frame>=duration||
    typeof reducedMotion!=="boolean")
    throw new RangeError("RISO64 requires a valid absolute shot-local frame");
  const t=frame/(duration-1);
  if(reducedMotion)return {
    beat,printFrame:239,sourceFrame:124,sourceMotion:false,plate:"both",
    zoom:1,focusX:.5,focusY:.5,sceneProgress:t,
  };
  switch(beat){
    case "cobalt-macro":return {
      beat,printFrame:Math.round(between(90,100,t)),sourceFrame:124,
      sourceMotion:false,plate:"blue",zoom:between(3.8,2.4,t),
      focusX:between(.36,.52,t),focusY:between(.43,.46,t),sceneProgress:t,
    };
    case "cobalt-pullback":return {
      beat,printFrame:Math.round(between(100,104,t)),sourceFrame:124,
      sourceMotion:false,plate:"blue",zoom:between(2.4,1,t),
      focusX:between(.52,.5,t),focusY:between(.46,.5,t),sceneProgress:t,
    };
    case "vermilion-pass":return {
      beat,printFrame:Math.round(between(105,228,t)),sourceFrame:124,
      sourceMotion:false,plate:"both",
      zoom:1+.08*Math.sin(Math.PI*t)**2,
      focusX:.5,focusY:.5,sceneProgress:t,
    };
    case "overprint-macro":return {
      beat,printFrame:239,sourceFrame:124,sourceMotion:false,
      plate:"both",zoom:between(1,3.1,t),
      focusX:between(.5,.55,t),focusY:between(.5,.51,t),sceneProgress:t,
    };
    case "original-hold":return {
      beat,printFrame:239,sourceFrame:Math.round(between(124,132,
        clamp01((t-.50)/.5))),
      sourceMotion:true,plate:"both",zoom:between(3.1,1,clamp01(t/.62)),
      focusX:between(.55,.5,clamp01(t/.62)),
      focusY:between(.51,.5,clamp01(t/.62)),sceneProgress:t,
    };
  }
}
/** Keep the entire camera gate covered by actual paper. Both input axes
 * are original plate-space proportions, never viewport-relative CSS guesses. */
export function risoCinematicCamera(
  pose:RisoCinematicPose,width:number,height:number,
):{x:number;y:number;scale:number}{
  if(!Number.isFinite(width)||!Number.isFinite(height)||
    width<240||height<240||!Number.isFinite(pose.zoom)||
    pose.zoom<1||pose.zoom>4||
    !Number.isFinite(pose.focusX)||!Number.isFinite(pose.focusY)||
    pose.focusX<0||pose.focusX>1||pose.focusY<0||pose.focusY>1)
    throw new RangeError("RISO64 camera must fit a valid physical print sheet");
  const scale=pose.zoom;
  const x=Math.max(width*(1-scale),Math.min(0,width*(.5-scale*pose.focusX)));
  const y=Math.max(height*(1-scale),Math.min(0,height*(.5-scale*pose.focusY)));
  return {x,y,scale};
}
