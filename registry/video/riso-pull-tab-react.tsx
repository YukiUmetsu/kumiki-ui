import {Fragment,useId} from "react";
import type {CSSProperties} from "react";
import {RisoPrint} from "./print-plates-react";
import type {RisoPrintProps} from "./print-plates-react";
import type {RisoSheet} from "./riso-sheet-feed";
import {completedRisoFrame} from "./riso-sheet-feed";
import {inspectRisoPrint} from "./print-plates";
import {evaluateRisoPullTab} from "./riso-pull-tab";
import type {RisoPullDirection,RisoPullWindow} from "./riso-pull-tab";

export interface RisoPullTabTheatreProps{
  readonly cover:RisoSheet;
  readonly insert:RisoSheet;
  readonly windows:readonly RisoPullWindow[];
  readonly direction?:RisoPullDirection;
  readonly travel:number;
  readonly progress:number;
  readonly seed?:number;
  /** Edge lamination, incision shadow, and retained cellulose whiskers. */
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
  paperRelief=.66,paperGrain=.55,misregistration=.22,drumContact,
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
  });
  const raw=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const id="riso79-"+raw;
  const [dx,dy]=pose.translation;
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
    data-km-riso79-windows={pose.windows.length}
    data-km-riso79-insert-offset={dx+","+dy}
    style={{display:"block",width:"100%",height:"100%",overflow:"hidden",
      isolation:"isolate",background:cover.spec.paper,...style}}>
    <defs>
      <clipPath id={id+"-apertures"} clipPathUnits="userSpaceOnUse">
        {pose.windows.map(w=><path key={w.id} d={w.path}/>)}
      </clipPath>
      <mask id={id+"-diecut"} maskUnits="userSpaceOnUse"
        maskContentUnits="userSpaceOnUse" x="0" y="0"
        width={width} height={height}>
        <rect width={width} height={height} fill="white"/>
        {pose.windows.map(w=><path key={w.id} d={w.path} fill="black"/>)}
      </mask>
      {pose.windows.map(w=><linearGradient key={w.id}
        id={id+"-rim-"+w.id} x1="0" y1="0" x2="1" y2="1"
        gradientUnits="objectBoundingBox">
        <stop offset="0" stopColor="#29231C" stopOpacity=".39"/>
        <stop offset=".24" stopColor="#FDF7E9" stopOpacity=".88"/>
        <stop offset=".63" stopColor="#29231C" stopOpacity=".22"/>
        <stop offset="1" stopColor="#FFFEF3" stopOpacity=".72"/>
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
    {/* A narrow pressed paper rim is under the stationary cover, giving
        the window a physical inside wall rather than a flat screenshot. */}
    {paperRelief>0&&pose.windows.map(w=><path key={w.id}
      d={w.path} fill="none" stroke="#3F3026"
      strokeWidth={t(5*paperRelief)}
      opacity={t(.12*paperRelief)}
      data-km-riso79-inside-contact-shadow={w.id}/>)}
    <g mask={"url(#"+id+"-diecut)"}
      data-km-riso79-stationary-original-cover="">
      <RisoPrint {...common} spec={cover.spec} artworks={cover.artworks}/>
    </g>
    {pose.windows.map(w=><g key={w.id}
      pointerEvents="none" data-km-riso79-cut-rim={w.id}>
      {paperRelief>0&&<Fragment>
        <path d={w.path} fill="none" stroke="#36291F"
          strokeWidth={t(.65+1.7*paperRelief)}
          opacity={t(.18*paperRelief)}/>
        <path d={w.path} fill="none" stroke={"url(#"+id+"-rim-"+w.id+")"}
          strokeWidth={t(.5+2.1*paperRelief)}
          opacity={t(.63*paperRelief)}/>
        <g data-km-riso79-cellulose-field={w.id}
          stroke="#796C59" strokeWidth=".39" fill="none"
          strokeLinecap="round" opacity={t(.41*paperRelief)}>
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
