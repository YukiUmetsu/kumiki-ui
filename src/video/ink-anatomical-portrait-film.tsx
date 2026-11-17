/** Optional 960×540 experimental film plate; does not replace the production river-scholar actor.
 * The existing Shanshui painter layers the candidate figure between atmospheric
 * geology and foreground; every point on the actor follows the same frame cue.
 */
import {InkShanshuiStage} from "../../registry/video/ink-shanshui-react";
import {DEFAULT_SHANSHUI} from "../../registry/video/ink-shanshui";
import {InkAnatomicalPortrait} from "./ink-anatomical-portrait";
import {InkAnatomicalStandingFigure} from "./ink-anatomical-standing-figure";
import type {InkPortraitCharacter,InkPortraitEmotion} from "./ink-anatomical-portrait";

export const INK_ANAT2_PROOF_FRAMES=96;
export interface InkAnatomicalPortraitFilmProps {
  frame:number;
  character?:InkPortraitCharacter;
  emotion?:Exclude<InkPortraitEmotion,"neutral">;
  reducedMotion?:boolean;
  detail?:number;
  /** Standing scholar is the native candidate; old bust remains for comparison. */
  figureMode?:"standing"|"bust";
}
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const smooth=(t:number)=>t*t*(3-2*t);
/** Frame-addressed facial movement. Absolute sampling supports reverse seeks. */
export function inkAnat2FilmCue(frame:number,reducedMotion=false):number{
  if(!Number.isSafeInteger(frame)||frame<0||frame>=INK_ANAT2_PROOF_FRAMES)
    throw new RangeError("ANAT2 film frame must be 0..95");
  if(reducedMotion)return 0;
  if(frame<=12)return smooth(frame/12);
  if(frame<=54)return 1;
  if(frame<=84)return 1-smooth((frame-54)/30);
  return 0;
}
/** Experimental close-figure study, intentionally separate from any exported film cast.
 * Cropped bust compositing is a candidate foreground actor view, not an
 * historical sitter reproduction or a painted watercolor sticker.
 */
export function InkAnatomicalPortraitFilm({
  frame,character="scholar",emotion="smile",reducedMotion=false,detail=1,
  figureMode="standing",
}:InkAnatomicalPortraitFilmProps){
  const f=reducedMotion?INK_ANAT2_PROOF_FRAMES-1:frame;
  const amount=inkAnat2FilmCue(f,reducedMotion);
  const sway=reducedMotion?0:Math.sin(f*Math.PI/48)*2.6;
  const breathing=reducedMotion?0:Math.sin(f*Math.PI/24)*1.5;
  const drift=figureMode==="bust"&&!reducedMotion?
    3.8*smooth(clamp(f/95,0,1)):0;
  return <div data-testid="ink-anat2-960-film"
    data-ink-proof-frame={frame} data-ink-proof-character={character}
    style={{width:960,height:540,position:"relative",overflow:"hidden"}}>
    <InkShanshuiStage frame={96+f} reducedMotion={reducedMotion}
      controls={{...DEFAULT_SHANSHUI,scene:"misty-hermit",detail:.96,
        mist:.66,wind:.3,ink:.67}}>
      <div data-testid="ink-anat2-film-actor"
        data-ink-cue={amount.toFixed(4)} data-ink-actor-mode={figureMode}
        style={{position:"absolute",left:figureMode==="standing"?623:611+drift,
          top:figureMode==="standing"?143:253+breathing,
          width:figureMode==="standing"?183:259,
          transform:figureMode==="standing"?"none":
            "rotate("+(.38*sway).toFixed(3)+"deg)",
          transformOrigin:"50% 93%",pointerEvents:"none",
          mixBlendMode:"multiply"}}>
        {figureMode==="standing"?
          <InkAnatomicalStandingFigure transparentPaper={true}
            character={character} emotion={emotion}
            intensity={amount} detail={detail} frame={f}
            reducedMotion={reducedMotion}
            aria-label={character+" original standing Chinese-ink film actor"}/>:
          <InkAnatomicalPortrait transparentPaper={true}
            character={character} emotion={emotion}
            intensity={amount} detail={detail} view="bust"
            aria-label={character+" original Chinese-ink bust film study"}/>}
      </div>
    </InkShanshuiStage>
  </div>;
}
