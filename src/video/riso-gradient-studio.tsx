import {useMemo,useState} from "react";
import {RisoPrint} from "../../registry/video/print-plates-react";
import {RisoGradientInk} from "../../registry/video/riso-gradient-ink-react";
import type {RisoGradientDirection,RisoGradientStop} from "../../registry/video/riso-gradient-ink";
import {risoExampleSpec} from "./riso-print-demo";
import type {RisoAspect} from "./riso-print-demo";

/**
 * RISO61 — original non-character Riso film: an atlas of tidal interference.
 * This is not an image-filter mockup. Both pigment masters draw independently
 * and use continuous coverage measured as physical ink dots, clipped to
 * real source contours. Wave lines advance from the absolute film frame
 * while all screen lattices and paper fibres stay physically fixed.
 */
type PlateView="both"|"blue"|"red";
const color={paper:"#F2E9D6",cobalt:"#2362A0",vermillion:"#DD593D"};
const inkStops:readonly RisoGradientStop[]=[
  {at:0,coverage:.12},{at:.21,coverage:.23},{at:.48,coverage:.37},
  {at:.73,coverage:.56},{at:.91,coverage:.79},{at:1,coverage:.88},
];
const waveStops:readonly RisoGradientStop[]=[
  {at:0,coverage:.06},{at:.24,coverage:.19},{at:.46,coverage:.48},
  {at:.66,coverage:.31},{at:.83,coverage:.63},{at:1,coverage:.86},
];
const redStops:readonly RisoGradientStop[]=[
  {at:0,coverage:.91},{at:.18,coverage:.82},{at:.41,coverage:.61},
  {at:.64,coverage:.41},{at:.82,coverage:.20},{at:1,coverage:.08},
];
const p=(v:number)=>Number(v.toFixed(2)).toString();

function orb(cx:number,cy:number,rx:number,ry:number):string{
  // Independent asymmetric hand-authored cubic axes, not a simplified SVG circle.
  return ["M"+p(cx)+" "+p(cy-ry),
    "C"+p(cx+rx*.61)+" "+p(cy-ry*1.03)+" "+p(cx+rx*1.09)+" "+p(cy-ry*.55)+" "+p(cx+rx)+" "+p(cy),
    "C"+p(cx+rx*.94)+" "+p(cy+ry*.68)+" "+p(cx+rx*.42)+" "+p(cy+ry*1.03)+" "+p(cx)+" "+p(cy+ry),
    "C"+p(cx-rx*.69)+" "+p(cy+ry*.91)+" "+p(cx-rx*1.05)+" "+p(cy+ry*.43)+" "+p(cx-rx)+" "+p(cy),
    "C"+p(cx-rx*.95)+" "+p(cy-ry*.58)+" "+p(cx-rx*.50)+" "+p(cy-ry*.95)+" "+p(cx)+" "+p(cy-ry)+" Z"].join(" ");
}
function stream(x:number,y:number,w:number,swell:number,layer:number):string{
  const lift=swell*Math.sin(layer*.7);
  return ["M"+p(x)+" "+p(y+lift),
    "C"+p(x+w*.16)+" "+p(y-30+lift)+" "+p(x+w*.30)+" "+p(y+28+lift)+" "+p(x+w*.48)+" "+p(y+10-lift*.5),
    "C"+p(x+w*.68)+" "+p(y-24-lift)+" "+p(x+w*.78)+" "+p(y+33+lift)+" "+p(x+w)+" "+p(y-9+lift)].join(" ");
}
function breaker(x:number,y:number,w:number,h:number,swell:number):string{
  return ["M"+p(x)+" "+p(y+32),
    "C"+p(x+w*.24)+" "+p(y-12+swell)+" "+p(x+w*.35)+" "+p(y+76-swell)+" "+p(x+w*.52)+" "+p(y+21),
    "C"+p(x+w*.74)+" "+p(y-31-swell)+" "+p(x+w*.82)+" "+p(y+31+swell)+" "+p(x+w)+" "+p(y+4),
    "L"+p(x+w)+" "+p(y+h),"L"+p(x)+" "+p(y+h)+" Z"].join(" ");
}
function registrationCross(x:number,y:number,solid:string){
  return <g fill="none" stroke={solid} strokeWidth={1.1} strokeLinecap="round">
    <path d={"M"+p(x-11)+" "+p(y)+" H"+p(x+11)+" M"+p(x)+" "+p(y-11)+" V"+p(y+11)}/>
    <circle cx={x} cy={y} r={5.6}/>
  </g>;
}
const fields={
  landscape:{x:396,y:81,w:516,h:386,cx:659,cy:260,rx:179,ry:170,
    titleX:41,titleY:161,ruleY:77,footerY:507},
  portrait:{x:34,y:384,w:472,h:442,cx:270,cy:608,rx:180,ry:184,
    titleX:34,titleY:175,ruleY:88,footerY:914},
} as const;

export function RisoGradientStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(239);
  const [plate,setPlate]=useState<PlateView>("both");
  const [direction,setDirection]=useState<RisoGradientDirection>("radial");
  const [seed,setSeed]=useState(53);
  const [gain,setGain]=useState(.10);
  const [irregularity,setIrregularity]=useState(.48);
  const [dropout,setDropout]=useState(.04);
  const [grain,setGrain]=useState(.55);
  const [registration,setRegistration]=useState(.26);
  const [motion,setMotion]=useState(true);
  const spec=useMemo(()=>risoExampleSpec(aspect,seed),[aspect,seed]);
  const s=fields[aspect];
  const swell=motion?Math.sin(frame/22)*7:0;
  const blueShape=orb(s.cx,s.cy,s.rx,s.ry);
  const redShape=orb(s.cx+24,s.cy-13,s.rx*.77,s.ry*.86);
  const band=breaker(s.x,s.cy+36,s.w,s.h*.50,swell);
  const zoom=Math.round((s.rx*2)/(spec.width)*100);
  const inkOpts={angle:spec.plates[0].dotAngle,seed,plateIndex:0,cell:7,
    dotGain:gain,irregularity,dropout} as const;
  const redOpts={...inkOpts,angle:spec.plates[1].dotAngle,plateIndex:1,cell:7.5};
  const artworks={
    blue:(paint:{solid:string;dots:string})=><g data-km-riso61-artwork="blue">
      <RisoGradientInk x={s.cx-s.rx} y={s.cy-s.ry} width={s.rx*2}
        height={s.ry*2} {...inkOpts} direction={direction}
        stops={inkStops} shape={blueShape} color={paint.solid}/>
      <RisoGradientInk x={s.x} y={s.cy+28} width={s.w} height={s.h*.54}
        {...inkOpts} direction="vertical" stops={waveStops}
        shape={band} color={paint.solid}/>
      {/* Thin topographic vectors sit on the original cobalt master:
          every source stroke has its own movement and variable width. */}
      {Array.from({length:16},(_,i)=><path key={i} fill="none"
        d={stream(s.x+4,s.cy-109+i*16,s.w-15,swell,i)}
        stroke={paint.solid} strokeWidth={i%4===0?2.4:i%3===0?1.1:.65}
        strokeLinecap="round" data-km-riso61-contour={i}/>)}
      {Array.from({length:5},(_,i)=><path key={i} fill="none"
        d={orb(s.cx,s.cy,s.rx+9+i*8,s.ry+9+i*8)}
        stroke={paint.solid} strokeWidth={i%2?1.2:.85} strokeDasharray={i%2?"":"2 8"}/>)}
      {registrationCross(s.x+15,s.y+11,paint.solid)}
      {registrationCross(s.x+s.w-13,s.y+s.h-8,paint.solid)}
      <g fill={paint.solid} fontFamily="Arial,Helvetica,sans-serif">
        <text x={s.titleX} y={s.ruleY-20} fontSize={13} fontWeight={800} letterSpacing={2.6}>
          ATLAS  /  STUDY  08
        </text>
        <path d={"M"+s.titleX+" "+s.ruleY+" H"+(aspect==="portrait"?505:923)}
          fill="none" stroke={paint.solid} strokeWidth={1.3}/>
        <g fontFamily="Georgia,'Times New Roman',serif"
          fontSize={aspect==="portrait"?80:74} fontWeight={700} letterSpacing={-2.5}>
          <text x={s.titleX-2} y={s.titleY}>TIDAL</text>
          <text x={s.titleX-2} y={s.titleY+84}>ATLAS</text>
        </g>
        <path d={"M"+s.titleX+" "+(s.titleY+106)+" h"+(aspect==="portrait"?461:275)}
          fill="none" stroke={paint.solid} strokeWidth={3}/>
        <text x={s.titleX} y={s.titleY+142}
          fontSize={aspect==="portrait"?15:13} letterSpacing={1.2} fontWeight={700}>
          SPOT INK  /  WAVEFIELD
        </text>
        <text x={s.titleX} y={s.titleY+165} fontSize={aspect==="portrait"?13:12}>
          A living map on printed paper
        </text>
        <path d={"M"+s.titleX+" "+(s.footerY-22)+" H"+(aspect==="portrait"?505:923)}
          fill="none" stroke={paint.solid} strokeWidth={1.3}/>
        <text x={s.titleX} y={s.footerY} fontSize={11} letterSpacing={1.8}>
          EDITION  /  07         SCREENED CURRENT
        </text>
      </g>
    </g>,
    red:(paint:{solid:string;dots:string})=><g data-km-riso61-artwork="red">
      <RisoGradientInk x={s.cx-s.rx*.77+24} y={s.cy-s.ry*.86-13}
        width={s.rx*1.54} height={s.ry*1.72} {...redOpts}
        direction="radial" stops={redStops}
        shape={redShape} color={paint.solid}/>
      {/* The red tidal crest is printed on its own spot master; overlapping
          real dots turn violet by the existing press compositor. */}
      {Array.from({length:11},(_,i)=><path key={i}
        d={stream(s.x+22,s.cy-74+i*18,s.w-45,-swell*.72,i)}
        fill="none" stroke={paint.solid} strokeWidth={i%3===0?3.5:1.25}
        strokeLinecap="round" strokeDasharray={i%4===0?"2 13":undefined}/>)}
      {Array.from({length:23},(_,i)=>{
        const angle=i*Math.PI*2/23;
        const r=.72+(i%5)*.06;
        const x=s.cx+Math.cos(angle)*s.rx*r;
        const y=s.cy+Math.sin(angle)*s.ry*r;
        return <circle key={i} cx={x} cy={y} r={i%4===0?3:1.15}
          fill={paint.solid}/>;
      })}
      <path d={"M"+p(s.cx-18)+" "+p(s.cy)+" h36 M"+p(s.cx)+" "+p(s.cy-18)+" v36"}
        fill="none" stroke={paint.solid} strokeWidth={1.5}/>
      <text x={aspect==="portrait"?s.x+s.w-190:s.x+23}
        y={aspect==="portrait"?s.ruleY-20:s.y+28} fontFamily="Arial,sans-serif"
        fill={paint.solid} fontSize={12} fontWeight={800} letterSpacing={1.8}>
        PLATE 02 / VERMILION
      </text>
      <text x={aspect==="portrait"?s.titleX:s.titleX+5}
        y={aspect==="portrait"?s.titleY+190:s.titleY+218}
        fontFamily="Arial,sans-serif" fontSize={aspect==="portrait"?13:12}
        fontWeight={700} letterSpacing={1.2} fill={paint.solid}>
        PAPER-LOCKED / 24 FPS
      </text>
    </g>,
  };
  return <main data-km-riso61-studio="" data-km-riso61-aspect={aspect}
    data-km-riso61-frame={frame}
    data-km-riso61-plate={plate}
    data-km-riso61-motion={String(motion)}
    style={{minHeight:"100vh",padding:22,display:"grid",gap:15,
      alignContent:"start",background:"#E9E0D0",
      color:"#274764",font:"14px/1.5 system-ui,sans-serif"}}>
    <header style={{maxWidth:970}}>
      <div style={{letterSpacing:2.3,fontWeight:800,fontSize:12}}>
        RISOGRAPH / ARTCRAFT · RISO61 · NON-CHARACTER FILM
      </div>
      <h1 style={{font:"700 29px Georgia,serif",margin:"5px 0"}}>
        Continuous spot-ink tones · original wavefield
      </h1>
      <p style={{margin:0,maxWidth:830}}>
        Every dot is independently authored on its physical plate at paper-fixed
        coordinates. Density changes its radius, not SVG opacity. Move the water
        contours, isolate inks, and examine two separately registered masters.
        No image-filter gradient, no imported artwork.
      </p>
    </header>
    <div style={{width:aspect==="portrait"?"min(495px,100%)":"min(960px,100%)",
      boxShadow:"0 12px 35px #23304227",background:color.paper}}>
      <RisoPrint spec={spec} frame={frame} artworks={artworks}
        visiblePlateIds={plate==="both"?undefined:[plate]}
        paperGrain={grain} misregistration={registration}
        data-km-riso61-print="" data-km-riso61-zoom={zoom}
        label="Tidal atlas original two-spot Risograph plate artwork with continuous screening"
        style={{height:"auto",width:"100%"}}/>
    </div>
    <section aria-label="RISO61 ink, film and material controls"
      style={{maxWidth:1040,display:"flex",gap:14,flexWrap:"wrap",alignItems:"end"}}>
      <label style={{display:"grid",gap:5}}>Output
        <select aria-label="RISO61 output aspect" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 landscape</option>
          <option value="portrait">9:16 portrait</option>
        </select></label>
      <label style={{display:"grid",gap:5}}>Spot-ink master
        <select aria-label="RISO61 ink separation" value={plate}
          onChange={e=>setPlate(e.target.value as PlateView)}>
          <option value="both">Both physical inks</option>
          <option value="blue">Cobalt only</option><option value="red">Vermilion only</option>
        </select></label>
      <label style={{display:"grid",gap:5}}>Tonal axis
        <select aria-label="RISO61 gradient direction" value={direction}
          onChange={e=>setDirection(e.target.value as RisoGradientDirection)}>
          <option value="radial">Radial ink pickup</option>
          <option value="vertical">Vertical gradient</option>
          <option value="horizontal">Horizontal gradient</option>
        </select></label>
      <label style={{display:"grid",gap:5}}>Film frame {frame}
        <input aria-label="RISO61 absolute film frame" type="range" min={0} max={239}
          value={frame} onChange={e=>setFrame(Number(e.target.value))}/></label>
      <label style={{display:"grid",gap:5}}>Dot gain {Math.round(gain*100)}%
        <input aria-label="RISO61 dot gain" type="range" min={0} max={.9} step={.05}
          value={gain} onChange={e=>setGain(Number(e.target.value))}/></label>
      <label style={{display:"grid",gap:5}}>Ink irregularity {Math.round(irregularity*100)}%
        <input aria-label="RISO61 ink irregularity" type="range" min={0} max={1} step={.05}
          value={irregularity} onChange={e=>setIrregularity(Number(e.target.value))}/></label>
      <label style={{display:"grid",gap:5}}>Dropout {Math.round(dropout*100)}%
        <input aria-label="RISO61 low-tone dropout" type="range" min={0} max={.15} step={.01}
          value={dropout} onChange={e=>setDropout(Number(e.target.value))}/></label>
      <label style={{display:"grid",gap:5}}>Paper fibres {Math.round(grain*100)}%
        <input aria-label="RISO61 paper grain" type="range" min={0} max={1} step={.05}
          value={grain} onChange={e=>setGrain(Number(e.target.value))}/></label>
      <label style={{display:"grid",gap:5}}>Register {registration.toFixed(2)}
        <input aria-label="RISO61 registration" type="range" min={0} max={1} step={.05}
          value={registration} onChange={e=>setRegistration(Number(e.target.value))}/></label>
      <label style={{display:"grid",gap:5}}>Seed
        <input aria-label="RISO61 paper seed" type="number" min={0} max={200000}
          value={seed} onChange={e=>setSeed(Math.max(0,Math.min(200000,Math.floor(Number(e.target.value)||0))))}/></label>
      <label style={{display:"flex",gap:7,alignItems:"center",paddingBottom:6}}>
        <input aria-label="RISO61 animate original wave contours"
          type="checkbox" checked={motion} onChange={e=>setMotion(e.target.checked)}/>
        Animate source water geometry</label>
    </section>
    <p style={{maxWidth:900,margin:0,fontSize:13}}>
      The two spot-ink masters share the original RisoPrint paper, tooth,
      registration, screen plate and frame reveal. Print tolerance is an authored
      study, not a press-calibrated proof. Small coverage below 10% can disappear
      on a real Riso press; confirm final colors and gradients on physical stock.
    </p>
  </main>;
}
