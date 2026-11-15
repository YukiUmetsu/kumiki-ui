import type {CSSProperties} from "react";
import {WatercolourSurface} from "../../../registry/video/watercolour-brush-react";
import {WatercolourWetPaper} from "../../../registry/video/watercolour-wet-paper-react";
import {experimentalWatercolourEyeBrush} from "./watercolour-eye-brush-study";

/** A private, actual painted source-space eye proof: WM4 -> WM1, never
 * gradients/solid SVG paths posing as a watercolor portrait.
 */
export function ExperimentalWatercolourEyeBrushPage({
  frame=400,seed=83,reducedMotion=false,style,
}:{
  frame?:number;seed?:number;reducedMotion?:boolean;style?:CSSProperties;
}){
  const {brush,wet}=experimentalWatercolourEyeBrush(seed);
  return <div data-km-watercolour-eye-study="" data-km-watercolour-eye-status="unapproved"
    style={{position:"relative",width:brush.width,height:brush.height,
      background:brush.paper.color,overflow:"hidden",...style}}>
    <WatercolourWetPaper spec={wet} frame={frame}
      reducedMotion={reducedMotion} aria-hidden
      style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
    <WatercolourSurface spec={brush} frame={frame}
      reducedMotion={reducedMotion} transparentPaper
      label="Original watercolor-painted eye under construction"
      style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
  </div>;
}
