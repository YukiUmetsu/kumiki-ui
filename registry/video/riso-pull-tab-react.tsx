import {Fragment,useId} from "react";
import type {CSSProperties} from "react";
import {RisoPrint} from "./print-plates-react";
import type {RisoPrintProps} from "./print-plates-react";
import type {RisoSheet} from "./riso-sheet-feed";
import {completedRisoFrame} from "./riso-sheet-feed";
import {inspectRisoPrint} from "./print-plates";
import {evaluateRisoPullTab} from "./riso-pull-tab";
import type {RisoPullDirection,RisoPullWindow} from "./riso-pull-tab";

function mixPaperColor(paper:string,tint:string,amount:number):string{
  if(!/^#[0-9a-f]{6}$/i.test(paper)||!/^#[0-9a-f]{6}$/i.test(tint))
    throw new RangeError("RISO79 paper edge color requires six-digit source stock colors.");
  const channels=[1,3,5].map(i=>Math.round(
    parseInt(paper.slice(i,i+2),16)*(1-amount)+
    parseInt(tint.slice(i,i+2),16)*amount));
  return "#"+channels.map(v=>v.toString(16).padStart(2,"0")).join("");
}

export interface RisoPullTabTheatreProps{
  /** Caliper of the top stock; converted from mm to source-space units. */
  readonly paperDepthMm?:number;
  /** Unit direction FROM the lamp toward the paper surface. */
  readonly lightDirection?:readonly [number,number];
  readonly cover:RisoSheet;
  readonly insert:RisoSheet;
  readonly windows:readonly RisoPullWindow[];
  readonly direction?:RisoPullDirection;
  readonly travel:number;
  readonly progress:number;
  readonly seed?:number;
  /** Cut-wall relief, lamp-directed cavity shadow and short cut-face microfibrils. */
  readonly paperRelief?:number;
  readonly paperGrain?:number;
  readonly misregistration?:number;
  readonly drumContact?:RisoPrintProps["drumContact"];
  readonly label?:string;
  readonly className?:string;
  readonly style?:CSSProperties;
}
/** One original printed cover with actual SVG openings; a DIFFERENT original
 * two-drum print slides underneath in a die-cut track. The complete vector
 * print is moved as a paper plane. Nothing morphs, rasterizes, repaints, or
 * disturbs ink registration as the paper moves. */
export function RisoPullTabTheatre({
  cover,insert,windows,direction="right",travel,progress,seed=79,
  paperRelief=.66,paperGrain=.55,misregistration=.22,
  paperDepthMm=.32,lightDirection=[-.55,-.84],drumContact,
  label="Printed Risograph paper theatre, original spot inks and moving pull-tab reveal",
  className,style,
}:RisoPullTabTheatreProps){
  for(const [name,sheet] of [["cover",cover],["insert",insert]] as const){
    const errors=inspectRisoPrint(sheet.spec);
    if(errors.length)throw new RangeError("RISO79 invalid "+name+" print: "+errors[0].message);
    if(sheet.spec.plates.some(p=>typeof sheet.artworks[p.id]!=="function"))
      throw new RangeError("RISO79 "+name+" requires original artwork on each declared spot ink.");
  }
  const {width,height}=cover.spec;
  if(width!==insert.spec.width||height!==insert.spec.height||
    cover.spec.paper.toLowerCase()!==insert.spec.paper.toLowerCase())
    throw new RangeError("RISO79 cover and sliding insert must be separately printed in the same dimensions and paper stock.");
  if(![paperRelief,paperGrain,misregistration].every(n=>
    Number.isFinite(n)&&n>=0&&n<=1))
    throw new RangeError("RISO79 paper relief, grain and ink registration must be 0..1.");
  const pose=evaluateRisoPullTab({
    width,height,windows,direction,travel,progress,seed,
    paperDepthMm,lightDirection,
  });
  const raw=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const id="riso79-"+raw;
  const [dx,dy]=pose.translation;
  const [shadowX,shadowY]=pose.shadowOffset;
  const lightLength=Math.hypot(lightDirection[0],lightDirection[1]);
  const lightStartX=.5+lightDirection[0]/lightLength*.5;
  const lightStartY=.5+lightDirection[1]/lightLength*.5;
  const lightEndX=.5-lightDirection[0]/lightLength*.5;
  const lightEndY=.5-lightDirection[1]/lightLength*.5;
  const paper=cover.spec.paper;
  const edgeWall=mixPaperColor(paper,"#6C5946",.31);
  const cavity=mixPaperColor(paper,"#30251F",.58);
  const bevel=mixPaperColor(paper,"#FFFDF4",.76);
  const common={
    frame:completedRisoFrame(cover.spec),
    paperGrain,misregistration,drumContact,reducedMotion:true,
    "aria-hidden":true as const,
  };
  const horizontal=direction==="right"||direction==="left";
  // The grip is cut from the same insert stock and moves in its paper plane.
  const tabX=horizontal?(direction==="right"?width-travel-75:travel+24):width*.86;
  const tabY=horizontal?height*.85:(direction==="down"?height-travel-64:travel+18);
  const tabWidth=horizontal?64:28,tabHeight=horizontal?29:64;
  const t=(n:number)=>Number(n.toFixed(3));
  return <svg xmlns="http://www.w3.org/2000/svg"
    role="img" aria-label={label} className={className}
    viewBox={"0 0 "+width+" "+height}
    data-km-riso79-theatre=""
    data-km-riso79-direction={direction}
    data-km-riso79-progress={progress}
    data-km-riso79-travel={travel}
    data-km-riso79-paper-depth-mm={pose.paperDepthMm}
    data-km-riso79-depth-units={pose.depthUnits}
    data-km-riso79-shadow-offset={shadowX+","+shadowY}
    data-km-riso79-light-direction={lightDirection.join(",")}
    data-km-riso79-windows={pose.windows.length}
    data-km-riso80-organic-window-count={pose.windows.filter(w=>w.shape==="organic-contour").length}
    data-km-riso79-insert-offset={dx+","+dy}
    style={{display:"block",width:"100%",height:"100%",overflow:"hidden",
      isolation:"isolate",background:cover.spec.paper,...style}}>
    <defs>
      <clipPath id={id+"-apertures"} clipPathUnits="userSpaceOnUse">
        {pose.windows.map(w=><path key={w.id} d={w.path}
          data-km-riso80-aperture-contour={w.id}/>) }
      </clipPath>
      <mask id={id+"-diecut"} maskUnits="userSpaceOnUse"
        maskContentUnits="userSpaceOnUse" x="0" y="0"
        width={width} height={height}>
        <rect width={width} height={height} fill="white"/>
        {pose.windows.map(w=><path key={w.id} d={w.path} fill="black"
          data-km-riso80-source-contour={w.id} data-km-riso80-source-winding={w.winding}/>)}
      </mask>
      {pose.windows.map(w=><linearGradient key={w.id}
        id={id+"-rim-"+w.id}
        x1={lightStartX} y1={lightStartY}
        x2={lightEndX} y2={lightEndY}
        gradientUnits="objectBoundingBox">
        <stop offset="0" stopColor={bevel} stopOpacity=".98"/>
        <stop offset=".19" stopColor={edgeWall} stopOpacity=".96"/>
        <stop offset=".47" stopColor={paper} stopOpacity=".98"/>
        <stop offset=".73" stopColor={edgeWall} stopOpacity=".86"/>
        <stop offset="1" stopColor={cavity} stopOpacity=".82"/>
      </linearGradient>)}
    </defs>
    <g data-km-riso79-printed-insert-window=""
      clipPath={"url(#"+id+"-apertures)"}>
      <g data-km-riso79-insert-plane=""
        data-km-riso79-fixed-ink-master=""
        transform={"translate("+dx+" "+dy+")"}>
        <RisoPrint {...common} spec={insert.spec}
          frame={completedRisoFrame(insert.spec)}
          artworks={insert.artworks}/>
      </g>
    </g>
    {/* The cavity shadow is cast by the cut wall onto the lower printed
        sheet. It is source-space, lamp-directed and clipped to the real
        aperture; no blurred screenshot or moving ink mask is involved. */}
    {paperRelief>0&&<g clipPath={"url(#"+id+"-apertures)"}
      data-km-riso79-cavity-shadow-field="">
      {pose.windows.map(w=><g key={w.id}>
        <path d={w.path} transform={"translate("+t(shadowX)+" "+t(shadowY)+")"}
          fill="none" stroke={cavity}
          strokeWidth={t(pose.depthUnits*3.25)}
          strokeLinecap="round" strokeLinejoin="round"
          opacity={t(pose.shadowOpacity*paperRelief)}
          data-km-riso79-inside-contact-shadow={w.id}/>
        <path d={w.path}
          transform={"translate("+t(shadowX*.42)+" "+t(shadowY*.42)+")"}
          fill="none" stroke={cavity}
          strokeWidth={t(pose.depthUnits*1.85)}
          strokeLinecap="round" strokeLinejoin="round"
          opacity={t(pose.shadowOpacity*.52*paperRelief)}
          data-km-riso79-cavity-occlusion={w.id}/>
      </g>)}
    </g>}
    <g mask={"url(#"+id+"-diecut)"}
      data-km-riso79-stationary-original-cover="">
      <RisoPrint {...common} spec={cover.spec} artworks={cover.artworks}/>
    </g>
    {pose.windows.map(w=><g key={w.id}
      pointerEvents="none" data-km-riso79-cut-rim={w.id}
      data-km-riso79-cut-contour-kind={w.shape}
      data-km-riso80-contour-kind={w.shape}
      data-km-riso80-contour-winding={w.winding}
      data-km-riso80-organic-contour={w.shape==="organic-contour"?w.id:undefined}>
      {paperRelief>0&&<Fragment>
        {/* The stock's cut cross-section occupies the inner half of the
            contour stroke. Its width follows measured paper caliper. */}
        <g clipPath={"url(#"+id+"-apertures)"}
          data-km-riso79-paper-cross-section={w.id}>
          <path d={w.path} fill="none" stroke={edgeWall}
            strokeWidth={t(pose.depthUnits*2.25)}
            strokeLinecap="round" strokeLinejoin="round"
            opacity={t(.78*paperRelief)}
            data-km-riso79-paper-wall={w.id}/>
          <path d={w.path}
            transform={"translate("+t(-shadowX*.18)+" "+t(-shadowY*.18)+")"}
            fill="none" stroke={bevel}
            strokeWidth={t(Math.max(.28,pose.depthUnits*.48))}
            strokeLinecap="round" strokeLinejoin="round"
            opacity={t(.88*paperRelief)}
            data-km-riso79-edge-bevel={w.id}/>
        </g>
        {/* A narrow top-face glint keeps the cut crisp at 1× without
            turning the die-cut into a white cartoon outline. */}
        <path d={w.path} fill="none" stroke={"url(#"+id+"-rim-"+w.id+")"}
          strokeWidth={t(.42+pose.depthUnits*.48)}
          strokeLinecap="round" strokeLinejoin="round"
          opacity={t(.76*paperRelief)}
          data-km-riso79-cut-face-highlight={w.id}/>
        <g data-km-riso79-cellulose-field={w.id}
          stroke={edgeWall} strokeWidth=".23" fill="none"
          strokeLinecap="round" opacity={t(.64*paperRelief)}>
          {w.fibres.map((d,i)=><path key={i}
            data-km-riso79-cut-fibre={w.id+"-"+i} d={d}/>)}
        </g>
      </Fragment>}
    </g>)}
    <g data-km-riso79-grip-plane=""
      data-km-riso79-grip-translation={dx+","+dy}
      transform={"translate("+dx+" "+dy+")"}
      pointerEvents="none">
      <path d={"M"+t(tabX+5)+" "+t(tabY)+
        " H"+t(tabX+tabWidth-5)+
        " Q"+t(tabX+tabWidth)+" "+t(tabY)+" "+t(tabX+tabWidth)+" "+t(tabY+5)+
        " V"+t(tabY+tabHeight-5)+
        " Q"+t(tabX+tabWidth)+" "+t(tabY+tabHeight)+" "+t(tabX+tabWidth-5)+" "+t(tabY+tabHeight)+
        " H"+t(tabX+5)+
        " Q"+t(tabX)+" "+t(tabY+tabHeight)+" "+t(tabX)+" "+t(tabY+tabHeight-5)+
        " V"+t(tabY+5)+" Q"+t(tabX)+" "+t(tabY)+" "+t(tabX+5)+" "+t(tabY)+" Z"}
        data-km-riso79-physical-grip=""
        fill={insert.spec.paper} stroke="#5E5144" strokeWidth="1.4"
        opacity=".98"/>
      {Array.from({length:horizontal?8:10},(_,i)=>
        <path key={i} d={horizontal?
          "M"+t(tabX+10+i*5.2)+" "+t(tabY+8)+
          " v"+t(12+(i%3)*.9):
          "M"+t(tabX+8)+" "+t(tabY+10+i*4.2)+
          " h"+t(12+(i%3)*.9)}
          stroke={insert.spec.plates[i%insert.spec.plates.length].color}
          strokeWidth={i%3===0?1.35:.65}
          fill="none" opacity={.64+(i%3)*.08}/>)}
      <path d={horizontal?
        "M"+t(tabX+3)+" "+t(tabY+tabHeight-2)+" H"+t(tabX+tabWidth-3):
        "M"+t(tabX+2)+" "+t(tabY+3)+" V"+t(tabY+tabHeight-3)}
        stroke="#FCFAF1" strokeWidth="1" fill="none"
        opacity={paperRelief*.7}/>
    </g>
  </svg>;
}
