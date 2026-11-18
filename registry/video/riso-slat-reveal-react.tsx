import {Fragment,useId} from "react";
import type {CSSProperties} from "react";
import {RisoPrint} from "./print-plates-react";
import type {RisoPrintProps} from "./print-plates-react";
import type {RisoSheet} from "./riso-sheet-feed";
import {completedRisoFrame} from "./riso-sheet-feed";
import {inspectRisoPrint} from "./print-plates";
import {evaluateRisoSlatReveal} from "./riso-slat-reveal";
import type {RisoSlatAxis,RisoSlatDirection} from "./riso-slat-reveal";

function mixPaperColor(paper:string,tint:string,amount:number):string{
  if(!/^#[0-9a-f]{6}$/i.test(paper)||!/^#[0-9a-f]{6}$/i.test(tint))
    throw new RangeError("RISO81 paper edge color requires six-digit stock colors.");
  const channels=[1,3,5].map(i=>Math.round(
    parseInt(paper.slice(i,i+2),16)*(1-amount)+
    parseInt(tint.slice(i,i+2),16)*amount));
  return "#"+channels.map(v=>v.toString(16).padStart(2,"0")).join("");
}

export interface RisoSlatTheatreProps{
  readonly cover:RisoSheet;
  readonly insert:RisoSheet;
  readonly axis:RisoSlatAxis;
  readonly direction:RisoSlatDirection;
  readonly count:number;
  readonly progress:number;
  readonly seed?:number;
  readonly travel?:number;
  readonly overlapMm?:number;
  readonly paperThicknessMm?:number;
  readonly slotClearanceMm?:number;
  readonly interleaveDepthMm?:number;
  readonly paperRelief?:number;
  readonly paperGrain?:number;
  readonly misregistration?:number;
  readonly lightDirection?:readonly [number,number];
  readonly drumContact?:RisoPrintProps["drumContact"];
  readonly label?:string;
  readonly className?:string;
  readonly style?:CSSProperties;
}

/** RISO81: complete original cover plus individually clipped, interleaved printed slats.
 * One rigid pull comb moves every strip through its own source-ordered slot.
 * No ink morph, raster mask, crossfade or independent animation clock is used. */
export function RisoSlatTheatre({
  cover,insert,axis,direction,count,progress,seed=81,travel,
  overlapMm=.32,paperThicknessMm=.24,slotClearanceMm=.08,
  interleaveDepthMm=.42,paperRelief=.72,paperGrain=.55,
  misregistration=.22,lightDirection=[-.55,-.84],drumContact,
  label="Interleaved original Risograph paper slats revealing a second complete print",
  className,style,
}:RisoSlatTheatreProps){
  for(const [name,sheet] of [["cover",cover],["insert",insert]] as const){
    const errors=inspectRisoPrint(sheet.spec);
    if(errors.length)throw new RangeError("RISO81 invalid "+name+" print: "+errors[0].message);
    if(sheet.spec.plates.some(plate=>typeof sheet.artworks[plate.id]!=="function"))
      throw new RangeError("RISO81 "+name+" requires original artwork on every declared spot plate.");
  }
  if(cover.spec.width!==insert.spec.width||cover.spec.height!==insert.spec.height||
    cover.spec.paper.toLowerCase()!==insert.spec.paper.toLowerCase())
    throw new RangeError("RISO81 requires matching dimensions and one shared physical paper stock.");
  if(![paperRelief,paperGrain,misregistration].every(n=>Number.isFinite(n)&&n>=0&&n<=1))
    throw new RangeError("RISO81 relief, paper grain and registration controls must be 0..1.");
  const {width,height}=cover.spec;
  const pose=evaluateRisoSlatReveal({
    width,height,axis,direction,count,progress,seed,travel,overlapMm,
    paperThicknessMm,slotClearanceMm,interleaveDepthMm,lightDirection,
  });
  const raw=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const id="riso81-"+raw;
  const [dx,dy]=pose.translation;
  const [shadowX,shadowY]=pose.shadowOffset;
  const paper=cover.spec.paper;
  const edgeWall=mixPaperColor(paper,"#6C5946",.34);
  const cavity=mixPaperColor(paper,"#30251F",.58);
  const bevel=mixPaperColor(paper,"#FFFDF4",.78);
  const common={
    frame:completedRisoFrame(insert.spec),
    paperGrain,misregistration,drumContact,reducedMotion:true,
    "aria-hidden":true as const,
  };
  const ordered=[...pose.slats].sort((a,b)=>a.lane-b.lane||a.index-b.index);
  const t=(n:number)=>Number(n.toFixed(3));
  return <svg xmlns="http://www.w3.org/2000/svg"
    role="img" aria-label={label} className={className}
    viewBox={"0 0 "+width+" "+height}
    data-km-riso81-theatre=""
    data-km-riso81-axis={axis}
    data-km-riso81-direction={direction}
    data-km-riso81-progress={progress}
    data-km-riso81-travel={pose.travel}
    data-km-riso81-slat-count={pose.slats.length}
    data-km-riso81-slot-count={pose.slots.length}
    data-km-riso81-overlap-mm={pose.overlapMm}
    data-km-riso81-slot-width-units={pose.slotWidthUnits}
    data-km-riso81-collision-clearance-mm={pose.collisionClearanceMm}
    data-km-riso81-source-registration-fixed="true"
    style={{display:"block",width:"100%",height:"100%",overflow:"hidden",
      isolation:"isolate",background:paper,...style}}>
    <defs>
      {pose.slats.map(slat=><clipPath key={slat.id}
        id={id+"-"+slat.id} clipPathUnits="userSpaceOnUse">
        <rect x={slat.x} y={slat.y} width={slat.width} height={slat.height}/>
      </clipPath>)}
      <linearGradient id={id+"-edge-light"}
        x1={.5+lightDirection[0]/Math.hypot(lightDirection[0],lightDirection[1])*.5}
        y1={.5+lightDirection[1]/Math.hypot(lightDirection[0],lightDirection[1])*.5}
        x2={.5-lightDirection[0]/Math.hypot(lightDirection[0],lightDirection[1])*.5}
        y2={.5-lightDirection[1]/Math.hypot(lightDirection[0],lightDirection[1])*.5}>
        <stop offset="0" stopColor={bevel}/>
        <stop offset=".32" stopColor={edgeWall}/>
        <stop offset=".68" stopColor={paper}/>
        <stop offset="1" stopColor={cavity}/>
      </linearGradient>
    </defs>
    <g data-km-riso81-stationary-original-cover="">
      <RisoPrint {...common} spec={cover.spec}
        frame={completedRisoFrame(cover.spec)} artworks={cover.artworks}/>
    </g>
    <g data-km-riso81-cut-slot-field="" pointerEvents="none">
      {pose.slots.map(slot=><g key={slot.index}
        data-km-riso81-slot={slot.index} data-km-riso81-slot-order={slot.index}>
        <path d={slot.path} fill="none" stroke={cavity}
          strokeWidth={t(slot.widthUnits*1.65)}
          opacity={t(.38*paperRelief)}/>
        <path d={slot.path}
          transform={"translate("+t(-shadowX*.12)+" "+t(-shadowY*.12)+")"}
          fill="none" stroke={bevel} strokeWidth={t(Math.max(.2,slot.widthUnits*.32))}
          opacity={t(.64*paperRelief)}/>
      </g>)}
    </g>
    <g data-km-riso81-moving-comb="" data-km-riso81-common-translation={dx+","+dy}>
      {ordered.map(slat=>{
        const horizontal=axis==="horizontal";
        const first=horizontal?
          "M"+t(slat.x)+" "+t(slat.y)+" H"+t(slat.x+slat.width):
          "M"+t(slat.x)+" "+t(slat.y)+" V"+t(slat.y+slat.height);
        const second=horizontal?
          "M"+t(slat.x)+" "+t(slat.y+slat.height)+" H"+t(slat.x+slat.width):
          "M"+t(slat.x+slat.width)+" "+t(slat.y)+" V"+t(slat.y+slat.height);
        const top=slat.lane===0?bevel:edgeWall;
        const bottom=slat.lane===0?edgeWall:bevel;
        return <g key={slat.id}
          transform={"translate("+dx+" "+dy+")"}
          data-km-riso81-slat={slat.id}
          data-km-riso81-index={slat.index}
          data-km-riso81-slot-order={slat.slotOrder}
          data-km-riso81-lane={slat.lane}
          data-km-riso81-depth-mm={slat.depthMm}
          data-km-riso81-exposure={slat.exposure}>
          <g clipPath={"url(#"+id+"-"+slat.id)}
            data-km-riso81-original-printed-strip={slat.id}>
            <RisoPrint {...common} spec={insert.spec}
              frame={completedRisoFrame(insert.spec)}
              artworks={insert.artworks}/>
          </g>
          {paperRelief>0&&<g pointerEvents="none"
            data-km-riso81-cut-edge-relief={slat.id}>
            <path d={first}
              transform={"translate("+t(shadowX*.55)+" "+t(shadowY*.55)+")"}
              fill="none" stroke={cavity}
              strokeWidth={t(Math.max(.35,slat.depthUnits*.72))}
              opacity={t(pose.shadowOpacity*paperRelief)}
              data-km-riso81-contact-shadow={slat.id}/>
            <path d={first} fill="none" stroke={top}
              strokeWidth={t(Math.max(.3,slat.depthUnits*.38))}
              opacity={t(.84*paperRelief)}
              data-km-riso81-leading-bevel={slat.id}/>
            <path d={second} fill="none" stroke={"url(#"+id+"-edge-light)"}
              strokeWidth={t(Math.max(.28,slat.depthUnits*.32))}
              opacity={t(.8*paperRelief)}
              data-km-riso81-trailing-bevel={slat.id}/>
            <g stroke={edgeWall} strokeWidth=".23" fill="none"
              strokeLinecap="round" opacity={t(.68*paperRelief)}
              data-km-riso81-cellulose-field={slat.id}>
              {slat.fibres.map((d,i)=><path key={i}
                data-km-riso81-fibre={slat.id+"-"+i} d={d}/>)}
            </g>
          </g>}
        </g>;
      })}
      {paperRelief>0&&<g transform={"translate("+dx+" "+dy+")"}
        pointerEvents="none" data-km-riso81-pull-rail="">
        {axis==="horizontal"?
          <path d={"M"+t(width-11)+" 0 V"+height}
            fill="none" stroke={edgeWall} strokeWidth="8" opacity=".92"/>:
          <path d={"M0 "+t(height-11)+" H"+width}
            fill="none" stroke={edgeWall} strokeWidth="8" opacity=".92"/>}
        {Array.from({length:9},(_,i)=><path key={i}
          d={axis==="horizontal"?
            "M"+t(width-14)+" "+t(18+i*(height-36)/8)+" h7":
            "M"+t(18+i*(width-36)/8)+" "+t(height-14)+" v7"}
          stroke={bevel} strokeWidth="1.1" opacity=".78"/>)}
        {axis==="horizontal"?
          <path d={"M"+t(width-24)+" "+t(height-5)+" h22 v16 h-22 Z"}
            fill={paper} stroke={cavity} strokeWidth="1.2"/>:
          <path d={"M"+t(width-5)+" "+t(height-24)+" h16 v22 h-16 Z"}
            fill={paper} stroke={cavity} strokeWidth="1.2"/>}
      </g>}
    </g>
  </svg>;
}
