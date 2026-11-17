import type {ReactNode} from "react";
import {RisoBrushArt} from "./riso-brush-studio";

export interface RisoBrushFilmSlotContent {
  slot:string;
  label:string;
  props?:Readonly<Record<string,unknown>>;
}
export interface RisoBrushFilmSlotContext {
  frame:number;
  fps:{num:number;den:number};
  durationFrames:number;
  width:number;
  height:number;
  reducedMotion:boolean;
}
/** RISO63: one reusable source adapter for production FD1, FilmStage Storybook,
 * clean SS-rendered tests and the capture/MP4 pipeline. Absolutely no private
 * timeline or rasterized copy of the RISO62 original ink artwork. */
export function renderRisoBrushFilmSlot(
  content:RisoBrushFilmSlotContent,context:RisoBrushFilmSlotContext,
):ReactNode{
  if(content.slot!=="riso-dry-brush")
    throw new RangeError("RISO63 expected riso-dry-brush film slot.");
  const props=content.props??{};
  const offsetFrame=props.offsetFrame??0;
  const plate=props.plate??"both";
  const seed=props.seed??62;
  const dryness=props.dryness??.73;
  const inkScale=props.inkScale??1;
  const registration=props.registration??.25;
  const grain=props.grain??.58;
  if(typeof offsetFrame!=="number"||!Number.isSafeInteger(offsetFrame)||
    offsetFrame<0||!Number.isSafeInteger(context.frame)||
    context.frame<0||context.frame+offsetFrame>239||
    !Number.isSafeInteger(context.frame+offsetFrame)||
    (plate!=="both"&&plate!=="blue"&&plate!=="red")||
    typeof seed!=="number"||!Number.isSafeInteger(seed)||seed<0||seed>200000||
    typeof dryness!=="number"||!Number.isFinite(dryness)||
    dryness<0||dryness>1||
    typeof inkScale!=="number"||!Number.isFinite(inkScale)||
    inkScale<.5||inkScale>1.7||
    typeof registration!=="number"||!Number.isFinite(registration)||
    registration<0||registration>1||
    typeof grain!=="number"||!Number.isFinite(grain)||
    grain<0||grain>1||
    !Number.isSafeInteger(context.width)||!Number.isSafeInteger(context.height)||
    context.width<240||context.height<240||
    typeof context.reducedMotion!=="boolean")
    throw new RangeError("riso-dry-brush expects frame 0..239, physical spot plates and bounded source controls.");
  const aspect=context.width>context.height?"landscape":"portrait";
  return <RisoBrushArt aspect={aspect} frame={context.frame+offsetFrame}
    plate={plate} seed={seed} dryness={dryness} inkScale={inkScale}
    registration={registration} grain={grain}
    animate={!context.reducedMotion} layout="film"/>;
}
