/**
 * ArtCraft Chinese-ink reader eye targeting.
 *
 * The original 3/4 pupil paintings are independent ink-and-paper cels;
 * gaze repositions entire painter-authored pupil parts, never redrawing
 * irises as flat circles or changing their pigment, pressure or highlight.
 * Horizontal and vertical limits derive from this source's ANAT1 measured
 * near/far palpebral apertures and respect camera foreshortening.
 */
import type {CharacterShapeAsset} from "../../registry/character/definition";
import {READER_FACE_ANAT1_POINTS as P} from "./ink-shanshui-reader-anatomy";
import type {ReaderInkLids} from "./ink-shanshui-reader-expression";

export interface ReaderInkGazeOffset {
  readonly x:number;
  readonly y:number;
}
export interface ReaderInkGaze {
  readonly near:ReaderInkGazeOffset;
  readonly far:ReaderInkGazeOffset;
}
const rounded=(n:number)=>Number(n.toFixed(3));
const requireNormalized=(n:number,label:string)=>{
  if(!Number.isFinite(n)||n< -1||n>1)
    throw new RangeError(label+" must be finite and within -1..1");
};

export const READER_INK_GAZE_LIMITS={
  // Normalized to source eye widths/heights, rather than a symmetrical
  // front-face mask pasted on the two differently projected sockets.
  near:{
    x:rounded((P["endocanthion.R"][0]-P["exocanthion.R"][0])*.14),
    y:rounded((P["palpebrale-inferius.R"][1]-P["palpebrale-superius.R"][1])*.145),
  },
  far:{
    x:rounded((P["exocanthion.L"][0]-P["endocanthion.L"][0])*.115),
    y:rounded((P["palpebrale-inferius.L"][1]-P["palpebrale-superius.L"][1])*.145),
  },
} as const;

/** Relative gaze target, zero/zero exactly preserving the source painting.
 * Down is positive in the original 260x340 SVG head-space camera.
 * A single shared target yields separately foreshortened near/far motion.
 */
export function readerInkGaze(x:number,y:number):ReaderInkGaze{
  requireNormalized(x,"Chinese-ink gaze x");
  requireNormalized(y,"Chinese-ink gaze y");
  return {
    near:{x:rounded(x*READER_INK_GAZE_LIMITS.near.x),
      y:rounded(y*READER_INK_GAZE_LIMITS.near.y)},
    far:{x:rounded(x*READER_INK_GAZE_LIMITS.far.x),
      y:rounded(y*READER_INK_GAZE_LIMITS.far.y)},
  };
}

export interface ReaderInkEyeApertures{
  /** Genuine editable source lid shapes, used to constrain the ink pupils. */
  near:string;
  far:string;
}

/** Source-native iris window: the first two original painted closed paths
 * form the near and far eye's paper opening in BOTH open and soft lid cels.
 * The pupil is never shown over a closed blink.
 */
export function readerInkEyeApertures(
  assets:Readonly<Record<string,CharacterShapeAsset>>,lids:ReaderInkLids,
):ReaderInkEyeApertures|null{
  if(lids==="closed")return null;
  const asset=assets["eyes-"+lids];
  if(!asset||asset.kind!=="shapes")
    throw new Error("Chinese-ink eyes must use the source shape asset");
  const [near,far]=asset.shapes;
  if(near?.type!=="path"||far?.type!=="path"||
      near.fill!=="$paper"||far.fill!=="$paper"||
      !near.d.endsWith("Z")||!far.d.endsWith("Z"))
    throw new Error("Chinese-ink eye aperture source contract changed");
  return {near:near.d,far:far.d};
}
