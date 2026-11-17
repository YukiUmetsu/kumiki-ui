import type {ReactNode} from "react";
import {RisoBrushArt} from "./riso-brush-studio";
import {cinematicDuration,evaluateRisoCinematic,risoCinematicCamera} from "./riso-cinematic-timeline";
import type {RisoCinematicBeat} from "./riso-cinematic-timeline";
import type {RisoBrushFilmSlotContext,RisoBrushFilmSlotContent} from "./riso-brush-film-slot";

/** Authorial 2D camera through EXISTING source-native printed plate artwork.
 * The cropping viewport is paper, not a bitmap: every ink contour, pore and
 * master receives exactly the same camera matrix from the film frame. */
export function renderRisoCinematicFilmSlot(
  content:RisoBrushFilmSlotContent,context:RisoBrushFilmSlotContext,
):ReactNode{
  if(content.slot!=="riso-dry-brush-cinematic"||!content.props||
    typeof content.props!=="object"||Array.isArray(content.props))
    throw new RangeError("RISO64 expected authored cinematic ink film slot");
  const p=content.props;
  const beat=p.beat as RisoCinematicBeat;
  if(!Number.isSafeInteger(context.width)||!Number.isSafeInteger(context.height)||
    context.width<240||context.height<240||
    context.width===context.height||
    typeof context.reducedMotion!=="boolean"||
    context.durationFrames!==cinematicDuration(beat))
    throw new RangeError("RISO64 requires an exact authored shot and native film output");
  const seed=p.seed??62;
  const dryness=p.dryness??.73;
  const registration=p.registration??.25;
  const grain=p.grain??.58;
  const inkScale=p.inkScale??1;
  if(typeof seed!=="number"||!Number.isSafeInteger(seed)||seed<0||seed>200000||
    typeof dryness!=="number"||!Number.isFinite(dryness)||dryness<0||dryness>1||
    typeof grain!=="number"||!Number.isFinite(grain)||grain<0||grain>1||
    typeof inkScale!=="number"||!Number.isFinite(inkScale)||inkScale<.5||inkScale>1.7||
    typeof registration!=="number"||!Number.isFinite(registration)||
    registration<0||registration>1)
    throw new RangeError("RISO64 expects bounded source pressure, stock and registration");
  const pose=evaluateRisoCinematic(beat,context.frame,context.reducedMotion);
  const camera=risoCinematicCamera(pose,context.width,context.height);
  return <div data-km-riso64-shot={beat}
    data-km-riso64-camera-zoom={camera.scale.toFixed(5)}
    data-km-riso64-master={pose.plate}
    data-km-riso64-press-frame={pose.printFrame}
    data-km-riso64-frame={context.frame}
    data-km-riso64-reduced={String(context.reducedMotion)}
    style={{width:context.width,height:context.height,position:"relative",
      overflow:"hidden",background:"#F2E9D6",isolation:"isolate"}}>
    <div data-km-riso64-camera=""
      style={{position:"absolute",left:0,top:0,width:context.width,height:context.height,
        transformOrigin:"0 0",
        transform:`translate(${camera.x.toFixed(4)}px,${camera.y.toFixed(4)}px) scale(${camera.scale.toFixed(5)})`,
        willChange:"transform"}}>
      <RisoBrushArt aspect={context.width>context.height?"landscape":"portrait"}
        frame={pose.sourceFrame} printFrame={pose.printFrame}
        plate={pose.plate} dryness={dryness} seed={seed} inkScale={inkScale}
        registration={registration} grain={grain}
        animate={pose.sourceMotion} layout="film"/>
    </div>
  </div>;
}
