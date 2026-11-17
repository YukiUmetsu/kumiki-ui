import {useId} from "react";
import type {CSSProperties} from "react";
import {RisoPrint} from "./print-plates-react";
import type {RisoPrintProps} from "./print-plates-react";
import type {RisoSheet} from "./riso-sheet-feed";
import {completedRisoFrame} from "./riso-sheet-feed";
import {inspectRisoPrint} from "./print-plates";
import {assertRisoCutoutContour,evaluateRisoRostrumCutout}
  from "./riso-rostrum-paper";
import type {RisoRostrumCutoutPose} from "./riso-rostrum-paper";

/** Every cutout owns an actual ORIGINAL print composition with separate
 * press inks. It is cropped by its exact own physical paper silhouette. */
export interface RisoRostrumLayer extends RisoRostrumCutoutPose{
  readonly contour:string;
  readonly sheet:RisoSheet;
}
export interface RisoRostrumStageProps{
  readonly base:RisoSheet;
  readonly cutouts:readonly RisoRostrumLayer[];
  readonly frame:number;
  readonly startFrame:number;
  readonly durationFrames:number;
  readonly exposureFrames?:1|2|3|4;
  readonly camera?:readonly [number,number];
  readonly lamp?:readonly [number,number];
  /** Existing RISO75 pressure material is independently anchored to ink. */
  readonly drumContact?:RisoPrintProps["drumContact"];
  readonly paperGrain?:number;
  readonly misregistration?:number;
  readonly reducedMotion?:boolean;
  readonly label?:string;
  readonly className?:string;
  readonly style?:CSSProperties;
}
function colorMix(hex:string,t:number){
  if(!/^#[0-9a-f]{6}$/i.test(hex))
    throw new RangeError("RISO77 requires actual hex paper stock for lit paper edges.");
  return "#"+[1,3,5].map(i=>Math.min(255,Math.round(
    parseInt(hex.slice(i,i+2),16)*(1-t)+255*t
  )).toString(16).padStart(2,"0")).join("");
}
/** Native SVG rostrum with real cut paper planes; no animated material noise,
 * screenshot filter, new timebase or bitmap halftone. Multiple source sheet
 * SVGs sit inside physical masks that move INTACT through paper space. */
export function RisoRostrumStage({
  base,cutouts,frame,startFrame,durationFrames,
  exposureFrames=2,camera=[0,0],lamp=[.9,1.3],
  drumContact,paperGrain=.56,misregistration=.25,
  reducedMotion=false,
  label="Layered printed cut-paper Risograph animation",
  className,style,
}:RisoRostrumStageProps){
  const rawId=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const width=base.spec.width,height=base.spec.height;
  const baseErrors=inspectRisoPrint(base.spec);
  if(baseErrors.length)
    throw new RangeError("RISO77 invalid original base print: "+baseErrors[0].message);
  if(!Array.isArray(cutouts)||cutouts.length<1||cutouts.length>12||
    !Number.isFinite(paperGrain)||paperGrain<0||paperGrain>1||
    !Number.isFinite(misregistration)||misregistration<0||misregistration>1)
    throw new RangeError("RISO77 requires 1–12 physical paper cutouts and 0..1 ink/stock settings.");
  const ids=new Set<string>();
  const sorted=cutouts.map((layer,index)=>{
    assertRisoCutoutContour(layer.contour);
    if(ids.has(layer.id))throw new RangeError("RISO77 cutout IDs must be distinct.");
    ids.add(layer.id);
    const issues=inspectRisoPrint(layer.sheet.spec);
    if(issues.length)
      throw new RangeError("RISO77 invalid cutout plate geometry: "+issues[0].message);
    if(layer.sheet.spec.width!==width||layer.sheet.spec.height!==height)
      throw new RangeError("RISO77 paper cutout and base print must use the same original source-space dimensions.");
    const pose=evaluateRisoRostrumCutout(layer,frame,startFrame,durationFrames,index,{
      exposureFrames,camera,light:lamp,reducedMotion,
    });
    return {layer,index,pose};
  }).sort((a,b)=>a.layer.depthMm-b.layer.depthMm||a.index-b.index);
  const paper={paperGrain,misregistration,drumContact,reducedMotion:true,
    "aria-hidden":true as const};
  return <svg xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${width} ${height}`}
    role="img" aria-label={label} className={className}
    data-km-riso77-rostrum=""
    data-km-riso77-frame={frame}
    data-km-riso77-exposure={exposureFrames}
    data-km-riso77-paper-planes={cutouts.length}
    data-km-riso77-reduced={String(reducedMotion)}
    style={{display:"block",width:"100%",height:"100%",
      background:base.spec.paper,overflow:"hidden",isolation:"isolate",
      ...style}}>
    <g data-km-riso77-unchanged-base="">
      <RisoPrint spec={base.spec} artworks={base.artworks}
        frame={completedRisoFrame(base.spec)} {...paper}/>
    </g>
    {sorted.map(({layer,index,pose})=>{
      const clipId=`riso77-${rawId}-${index}`;
      const [x,y]=pose.translation;
      const [px,py]=layer.pivot;
      const [sx,sy]=pose.shadowOffset;
      const lip=colorMix(layer.sheet.spec.paper,.24);
      return <g key={layer.id}
        data-km-riso77-plane={layer.id}
        data-km-riso77-exposed-frame={pose.frameSample}
        data-km-riso77-layer-progress={pose.progress}
        data-km-riso77-height-mm={pose.liftMm}
        data-km-intentional-text-clip=""
        transform={`translate(${x} ${y}) rotate(${pose.angleDegrees} ${px} ${py})`}>
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <path d={layer.contour} data-km-riso77-original-paper-outline={layer.id}/>
          </clipPath>
        </defs>
        {/* Cast shadows are physical displaced contours, not blurred copies
            of the entire image. Their offset depends on paper thickness and
            the shared rostrum lamp. The spotlight does not shift original inks. */}
        <path d={layer.contour}
          data-km-riso77-cast-shadow={layer.id}
          transform={`translate(${sx} ${sy})`}
          fill="#2D2628" opacity={pose.shadowOpacity}/>
        <path d={layer.contour}
          data-km-riso77-close-shadow={layer.id}
          transform={`translate(${sx*.38} ${sy*.38})`}
          fill="#3A3431" opacity={pose.shadowOpacity*.4}/>
        <g clipPath={`url(#${clipId})`} data-km-riso77-printed-cutout={layer.id}>
          <RisoPrint spec={layer.sheet.spec} artworks={layer.sheet.artworks}
            frame={completedRisoFrame(layer.sheet.spec)} {...paper}/>
        </g>
        {/* A lit paper-pulp edge follows the EXACT original shape. With
            no extra SVG filters, closeup reveals fine C/S path geometry. */}
        <path d={layer.contour}
          data-km-riso77-paper-edge={layer.id}
          stroke={lip} strokeWidth={Math.max(.5,layer.depthMm*.43)}
          fill="none" strokeLinecap="round" strokeLinejoin="round"
          pointerEvents="none"/>
      </g>;
    })}
  </svg>;
}
