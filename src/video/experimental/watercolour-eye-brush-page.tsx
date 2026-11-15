import {useId,useMemo} from "react";
import type {CSSProperties} from "react";
import {WatercolourSurface} from "../../../registry/video/watercolour-brush-react";
import type {PaintSurfaceSpec} from "../../../registry/video/watercolour-brush";
import {WatercolourWetPaper} from "../../../registry/video/watercolour-wet-paper-react";
import {
  WC19_EYE_GESTURES,experimentalWatercolourEyeBrush,
} from "./watercolour-eye-brush-study";

/** Source-observed asymmetry. The iris and tinted sclera are deposited
 * BEHIND the independently authored upper and lower lid brush gestures.
 * This path is *only* an occlusion/painting reserve, never a filled ellipse.
 */
export const WC19_EYE_APERTURE =
  "M260 264 C298 251 349 224 406 218 C459 216 489 237 508 249 " +
  "C488 285 442 301 380 300 C322 300 279 283 260 264 Z";

const irisIds=new Set(WC19_EYE_GESTURES.filter(g=>g.layer==="iris").map(g=>g.id));
const scleraIds=new Set(WC19_EYE_GESTURES.filter(g=>g.layer==="sclera").map(g=>g.id));
const lidsIds=new Set(WC19_EYE_GESTURES.filter(g=>
  g.layer==="lid"||g.layer==="lashes"||g.layer==="micro").map(g=>g.id));

const stack=(spec:PaintSurfaceSpec,part:"foundation"|"sclera"|"iris"|"lids"):PaintSurfaceSpec=>({
  ...spec,
  strokes:spec.strokes.filter(s=>
    part==="iris"?irisIds.has(s.id):
    part==="sclera"?scleraIds.has(s.id):
    part==="lids"?lidsIds.has(s.id):
      !irisIds.has(s.id)&&!scleraIds.has(s.id)&&!lidsIds.has(s.id)),
  // Watercolor skin and orbit may not simply flood the eyeball. True
  // paper reserves exclude the aperture BEFORE any foundation stroke.
  reservePaths:part==="foundation"
    ? [...(spec.reservePaths??[]),WC19_EYE_APERTURE]
    : spec.reservePaths,
});

/** Experimental, NOT approved art or a public Storybook character.
 * Every pigment is physically brushed (WM1) or transported/dried (WM4).
 * The only vector geometry added here defines unpainted paper/occlusion.
 */
export function ExperimentalWatercolourEyeBrushPage({
  frame=420,seed=83,reducedMotion=false,style,
}:{
  frame?:number;seed?:number;reducedMotion?:boolean;style?:CSSProperties;
}){
  const uid=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const clip="wc20-painted-eye-lid-aperture-"+uid;
  const {brush,wet}=useMemo(()=>experimentalWatercolourEyeBrush(seed),[seed]);
  const {foundation,sclera,iris,lids}=useMemo(()=>({
    foundation:stack(brush,"foundation"),
    sclera:stack(brush,"sclera"),
    iris:stack(brush,"iris"),
    lids:stack(brush,"lids"),
  }),[brush]);
  const layerStyle:CSSProperties={position:"absolute",inset:0,
    width:"100%",height:"100%"};
  return <div data-km-watercolour-eye-study=""
    data-km-watercolour-eye-status="unapproved"
    data-km-eyelid-iris-occlusion="source-derived"
    data-km-sclera-paper-reserve="native-wm1"
    style={{position:"relative",width:brush.width,height:brush.height,
      background:brush.paper.color,overflow:"hidden",...style}}>
    <WatercolourWetPaper spec={wet} frame={frame}
      reducedMotion={reducedMotion} aria-hidden style={layerStyle}/>
    <WatercolourSurface spec={foundation} frame={frame}
      reducedMotion={reducedMotion} transparentPaper aria-hidden
      label="Unpainted sclera and observed facial watercolor foundation"
      style={layerStyle}/>
    <svg data-km-eye-anatomical-occlusion="" viewBox="0 0 640 480"
      aria-hidden="true" style={layerStyle}>
      <defs><clipPath id={clip} clipPathUnits="userSpaceOnUse">
        <path d={WC19_EYE_APERTURE}/></clipPath></defs>
      <g data-km-brush-painted-sclera-and-iris-occluded=""
        data-km-brush-painted-iris-occluded=""
        clipPath={`url(#${clip})`}>
        <WatercolourSurface spec={sclera} frame={frame}
          reducedMotion={reducedMotion} transparentPaper aria-hidden
          style={{width:"100%",height:"100%"}}/>
        <WatercolourSurface spec={iris} frame={frame}
          reducedMotion={reducedMotion} transparentPaper aria-hidden
          style={{width:"100%",height:"100%",position:"absolute",inset:0}}/>
      </g>
    </svg>
    <WatercolourSurface spec={lids} frame={frame}
      reducedMotion={reducedMotion} transparentPaper
      aria-hidden style={layerStyle}/>
  </div>;
}
