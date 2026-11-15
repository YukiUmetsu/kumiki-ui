import {useId,useMemo} from "react";
import type {CSSProperties} from "react";
import {WatercolourSurface} from "../../../registry/video/watercolour-brush-react";
import type {PaintSurfaceSpec} from "../../../registry/video/watercolour-brush";
import {WatercolourWetPaper} from "../../../registry/video/watercolour-wet-paper-react";
import {
  WC19_EYE_GESTURES,experimentalWatercolourEyeBrush,
} from "./watercolour-eye-brush-study";

/** Original hand-authored source-space anatomy; unlike a circular iris
 * sticker, the inferior and superior lids occlude painted iris pigment.
 * The upper/lower lid edges curve independently and meet at the canthi.
 */
export const WC19_EYE_APERTURE =
  "M175 260 C240 254 310 231 409 233 C471 231 512 240 535 247 " +
  "C484 277 421 286 345 283 C273 282 219 276 175 260 Z";

const IRIS_IDS = new Set(WC19_EYE_GESTURES
  .filter(g=>g.layer==="iris").map(g=>g.id));
const LID_IDS = new Set(WC19_EYE_GESTURES
  .filter(g=>g.layer==="lid"||g.layer==="lashes"||g.layer==="micro")
  .map(g=>g.id));
const stack=(spec:PaintSurfaceSpec,
  part:"structure"|"iris"|"lids"):PaintSurfaceSpec=>({
  ...spec,strokes:spec.strokes.filter(s=>
    part==="iris" ? IRIS_IDS.has(s.id) :
    part==="lids" ? LID_IDS.has(s.id) :
    !IRIS_IDS.has(s.id)&&!LID_IDS.has(s.id)),
});

/** Unpublished visual proof. Painted pigment is still WM1 and WM4; the
 * anatomical clip is a transparent occlusion boundary, not a filled shape.
 * No SVG gradient, opaque ellipse, bitmap texture, or postfilter painting.
 */
export function ExperimentalWatercolourEyeBrushPage({
  frame=420,seed=83,reducedMotion=false,style,
}:{
  frame?:number;seed?:number;reducedMotion?:boolean;style?:CSSProperties;
}){
  const uid=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const clip="wc19-anatomical-eye-aperture-"+uid;
  const {brush,wet}=useMemo(()=>experimentalWatercolourEyeBrush(seed),[seed]);
  const {structure,iris,lids}=useMemo(()=>({
    structure:stack(brush,"structure"),
    iris:stack(brush,"iris"),
    lids:stack(brush,"lids"),
  }),[brush]);
  const inkStyle:CSSProperties={position:"absolute",inset:0,
    width:"100%",height:"100%"};
  return <div data-km-watercolour-eye-study=""
    data-km-watercolour-eye-status="unapproved"
    data-km-eyelid-iris-occlusion="source-derived"
    style={{position:"relative",width:brush.width,height:brush.height,
      background:brush.paper.color,overflow:"hidden",...style}}>
    <WatercolourWetPaper spec={wet} frame={frame}
      reducedMotion={reducedMotion} aria-hidden style={inkStyle}/>
    <WatercolourSurface spec={structure} frame={frame}
      reducedMotion={reducedMotion} transparentPaper aria-hidden
      label="Anatomical watercolor eye foundation" style={inkStyle}/>
    {/* The iris is *genuine brush pigment*, but is hidden behind the
        observed upper and lower eyelid folds. This avoids a pasted circle
        even when the WM4 underpainting softly bleeds beyond the iris. */}
    <svg data-km-eye-anatomical-occlusion="" viewBox="0 0 640 480"
      aria-hidden="true" style={inkStyle}>
      <defs><clipPath id={clip} clipPathUnits="userSpaceOnUse">
        <path d={WC19_EYE_APERTURE}/></clipPath></defs>
      <g data-km-brush-painted-iris-occluded="" clipPath={`url(#${clip})`}>
        <WatercolourSurface spec={iris} frame={frame}
          reducedMotion={reducedMotion} transparentPaper
          aria-hidden style={{width:"100%",height:"100%"}}/>
      </g>
    </svg>
    <WatercolourSurface spec={lids} frame={frame}
      reducedMotion={reducedMotion} transparentPaper
      aria-hidden style={inkStyle}/>
  </div>;
}
