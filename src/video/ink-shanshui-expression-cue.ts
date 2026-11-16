/**
 * ArtCraft EXPR1: deterministic temporal envelope for a 24-fps portrait beat.
 * All dimensions are source frames. This is an opt-in acting adapter, not an
 * overwrite of the neutral Shanshui film's production facial animation.
 *
 * 0..12   emerge (AU muscles engage by smoothstep, no abrupt smile cel)
 * 12..60  hold a legible expression, permitting independent speech/blinks
 * 60..84  dissolve (AU muscles relax through the same original ink fibres)
 * 84..96  settle to the unchanged neutral source painting
 */
import {inkReaderExpressionStudy} from "./ink-shanshui-reader-expression";
import type {ReaderInkEmotion,ReaderInkExpressionStudy} from
  "./ink-shanshui-reader-expression";

export const READER_INK_CUE={
  fps:24,frames:96,attackEnd:12,releaseStart:60,releaseEnd:84,
} as const;

const ease=(x:number)=>x*x*(3-2*x);

/** Smooth in and out with C1-zero endpoint velocity and stable hold. */
export function readerInkCueWeight(frame:number):number {
  if(!Number.isInteger(frame)||frame<0||frame>READER_INK_CUE.frames)
    throw new RangeError("Chinese-ink expression frame must be an integer in 0..96");
  if(frame<=READER_INK_CUE.attackEnd)
    return ease(frame/READER_INK_CUE.attackEnd);
  if(frame<=READER_INK_CUE.releaseStart)return 1;
  if(frame<=READER_INK_CUE.releaseEnd)
    return 1-ease((frame-READER_INK_CUE.releaseStart)/
      (READER_INK_CUE.releaseEnd-READER_INK_CUE.releaseStart));
  return 0;
}

/** Generate one reproducible production-fidelity pose per beat frame.
 * The portrait retains all original five visemes, three eyelid states,
 * pupil parts, rig pivots and brush-pressure details at every sample.
 */
export function inkReaderCueFrame(
  emotion:ReaderInkEmotion,peakIntensity:number,frame:number,detail=1,
):ReaderInkExpressionStudy{
  if(!Number.isFinite(peakIntensity)||peakIntensity<0||peakIntensity>1)
    throw new RangeError("Chinese-ink peak expression intensity must be 0..1");
  return inkReaderExpressionStudy(emotion,
    peakIntensity*readerInkCueWeight(frame),detail);
}
