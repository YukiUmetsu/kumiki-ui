import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { WatercolourWetPaper } from "../../registry/video/watercolour-wet-paper-react";
import { inspectWetPaper } from "../../registry/video/watercolour-wet-paper";
import type { WetPaperSpec } from "../../registry/video/watercolour-wet-paper";
import { WatercolourFilmViewport, WatercolourParameterEditor, WatercolourSlider, inspectJsonObject } from "./watercolour-film-parameters";

type Output = "landscape" | "portrait";
const TOTAL=420;
const control={font:"600 13px system-ui",padding:"9px 12px",border:"1px solid #B9ABA0",
  borderRadius:7,background:"#FFFBF5",color:"#354A4A",minHeight:40} as const;

/** A neutral, original pigment study, not imported reference art.
 * Coordinates are proportional to the paper, so both output ratios preserve
 * the gesture and the multi-pigment contact points.
 */
export function wetPaperDemo(output:Output,seed=34):WetPaperSpec {
  const portrait=output==="portrait";
  const width=portrait?540:960,height=portrait?960:540;
  const place=(x:number,y:number) => ({
    x:width*(portrait?.5+(x-.5)*.88:x),
    y:height*(portrait?.48+(y-.48)*.84:y),
  });
  const drops:WetPaperSpec["drops"]=[
    {id:"sky-cobalt",x:.61,y:.34,radius:.16,pigment:"#6D9BB6",load:.64,water:.91,startFrame:8},
    {id:"sky-dusk",x:.72,y:.40,radius:.13,pigment:"#B4A3C5",load:.44,water:.84,startFrame:25},
    {id:"petal-rose",x:.59,y:.51,radius:.11,pigment:"#CB7898",load:.78,water:.88,startFrame:48},
    {id:"petal-apricot",x:.72,y:.54,radius:.12,pigment:"#E2B18D",load:.64,water:.95,startFrame:68},
    {id:"leaf-sage",x:.59,y:.70,radius:.13,pigment:"#578E7F",load:.88,water:.79,startFrame:86},
    {id:"leaf-verdigris",x:.73,y:.73,radius:.14,pigment:"#3C8186",load:.71,water:.90,startFrame:108},
    {id:"gold-infusion",x:.67,y:.59,radius:.08,pigment:"#D3A15E",load:.48,water:.92,startFrame:135},
  ].map(d=>({id:d.id,...place(d.x,d.y),
    radius:Math.min(width,height)*d.radius,pigment:d.pigment,
    load:d.load,water:d.water,startFrame:d.startFrame}));
  return {version:1,width,height,seed,paper:{color:"#F8F2E8",tooth:.78},
    cellSize:24,flow:.77,granulation:.72,dryFrames:220,drops};
}

/** Frame-addressable painting plus independent fine-line drawing: neither
 * the artwork nor typography is filtered by the wet pigment material pass.
 */
function WetStudyPage({spec,frame,reducedMotion}:{spec:WetPaperSpec;frame:number;reducedMotion:boolean}) {
  const portrait=spec.height>spec.width;
  const w=spec.width,h=spec.height;
  return <div style={{position:"relative",width:w,height:h,overflow:"hidden",background:spec.paper.color}}>
    <WatercolourWetPaper spec={spec} frame={frame} reducedMotion={reducedMotion}/>
    <svg viewBox={`0 0 ${w} ${h}`} role="img"
      aria-label="Fine botanical ink contours over a wet-on-wet watercolor painting"
      style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
      {/* Delicate illustrative lines are intentionally drawn ABOVE the paint.
          They never disappear into the numerical pigment simulation. */}
      <g transform={portrait?`translate(${w*.01} ${h*.24}) scale(.57 .96)`:""}
         fill="none" stroke="#556E68" strokeLinecap="round" strokeLinejoin="round">
        <path d="M630 462 C620 392 661 334 654 266 M630 462 C684 422 729 368 752 308
          M629 462 C582 432 531 384 512 329" strokeWidth="2" opacity=".51"/>
        <path d="M637 426 C578 394 568 366 558 343 C593 347 628 374 637 426 Z
          M664 397 C695 345 745 328 769 336 C754 372 705 398 664 397 Z"
          stroke="#698578" strokeWidth="1.5" opacity=".67"/>
        <path d="M650 281 C609 246 600 215 627 205 C649 210 660 242 650 281 Z
          M652 283 C654 230 681 206 705 218 C718 239 692 269 652 283 Z
          M651 286 C596 289 570 269 581 249 C601 231 637 250 651 286 Z"
          stroke="#8B738D" strokeWidth="1.5" opacity=".60"/>
        <path d="M653 270 C655 248 658 234 668 223 M648 271 C633 256 616 245 606 231
          M640 287 C621 279 604 270 590 266" strokeWidth=".8" opacity=".55"/>
        <path d="M630 459 C592 443 575 430 560 418
          M628 459 C652 456 688 448 705 435" strokeWidth=".8" opacity=".48"/>
      </g>
      <g fill="#4E605E">
        <path d={portrait?"M34 61 H506":"M40 52 H920"} stroke="#8E9D92" strokeWidth="1" opacity=".6"/>
        <text x={portrait?34:44} y={portrait?94:82}
          fontFamily="system-ui,sans-serif" fontSize={portrait?13:12}
          letterSpacing="2.7" fontWeight="700">ATELIER  /  WET PIGMENT</text>
        <text x={portrait?34:44} y={portrait?186:143}
          fontFamily="Georgia,serif" fontSize={portrait?48:43} fontStyle="italic">
          Water carries colour
        </text>
        <text x={portrait?35:46} y={portrait?226:174}
          fontFamily="Georgia,serif" fontSize={portrait?19:16} fontStyle="italic">
          Seven translucent deposits · one shared paper field
        </text>
        <path d={portrait?"M34 904 H506":"M42 492 H918"}
          stroke="#8E9D92" strokeWidth="1" opacity=".6"/>
        <text x={portrait?35:44} y={portrait?931:513}
          fontFamily="system-ui,sans-serif" fontSize={12} letterSpacing="1.1">
          WATER  ·  PIGMENT  ·  ABSORPTION
        </text>
      </g>
    </svg>
  </div>;
}

function WetPaperLab() {
  const [output,setOutput]=useState<Output>("landscape");
  const [frame,setFrame]=useState(205);
  const [playing,setPlaying]=useState(false);
  const [flow,setFlow]=useState(.77);
  const [tooth,setTooth]=useState(.78);
  const [grain,setGrain]=useState(.72);
  const [seed,setSeed]=useState(34);
  const [custom,setCustom]=useState<WetPaperSpec|null>(null);
  const [reduced,setReduced]=useState(false);
  const spec=useMemo(()=>custom??({...wetPaperDemo(output,seed),flow,
    granulation:grain,paper:{color:"#F8F2E8",tooth}}),
    [output,seed,flow,grain,tooth,custom]);
  useEffect(()=>{
    if(!playing)return;
    const t0=performance.now(),f0=frame;
    let request=0;
    const tick=(now:number)=>{
      const f=Math.min(TOTAL-1,f0+Math.floor((now-t0)*30/1000));
      setFrame(f);
      if(f<TOTAL-1)request=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    request=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(request);
    // Only the preview transport owns wall time. Pigment is pure frame input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  return <main style={{fontFamily:"system-ui,sans-serif",background:"#E9E4DC",
    padding:22,minHeight:"100vh",color:"#344546",display:"grid",alignContent:"start",gap:14}}>
    <header style={{maxWidth:900}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:2,color:"#856D65"}}>
        WM4 / MATERIAL PROCESS</div>
      <h1 style={{font:"italic 500 38px/1.18 Georgia,serif",margin:"5px 0"}}>
        Wet-on-wet pigment atelier</h1>
      <p style={{margin:0,lineHeight:1.52,maxWidth:850}}>
        See different pigments enter one wet paper surface, diffuse into neighboring
        colors, settle into paper tooth and become permanently dry. This is a bounded,
        qualitative paper-pigment simulation, not a watercolor look filter.
      </p>
    </header>
    <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"end"}}>
      <label style={{fontSize:13,fontWeight:650,display:"grid",gap:5}}>Output
        <select value={output} aria-label="Wet paper output" style={control}
          onChange={e=>{setPlaying(false);setCustom(null);setOutput(e.target.value as Output);}}>
          <option value="landscape">16:9 landscape</option><option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <WatercolourSlider label="Pigment flow" value={flow}
        onChange={v=>{setCustom(null);setFlow(v);}}/>
      <WatercolourSlider label="Paper tooth" value={tooth}
        onChange={v=>{setCustom(null);setTooth(v);}}/>
      <WatercolourSlider label="Sediment granulation" value={grain}
        onChange={v=>{setCustom(null);setGrain(v);}}/>
      <label style={{fontSize:13,fontWeight:650,display:"grid",gap:5}}>Seed
        <input type="number" aria-label="Wet paper seed" style={{...control,width:110}}
          min={0} max={2147483647} value={seed}
          onChange={e=>{setCustom(null);setSeed(Math.max(0,Math.min(2147483647,Math.floor(Number(e.target.value)||0))));}}/>
      </label>
      <label style={{fontSize:13,fontWeight:650,display:"flex",gap:6,alignItems:"center",height:40}}>
        <input type="checkbox" checked={reduced} aria-label="Wet paper reduced motion"
          onChange={e=>{setPlaying(false);setReduced(e.target.checked);}}/> Reduced motion
      </label>
    </div>
    <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8}}>
      <button type="button" style={control} onClick={()=>{
        if(playing){setPlaying(false);return;}
        if(frame>=TOTAL-1)setFrame(0);
        setPlaying(true);
      }}>{playing?"Pause":"Play pigment bloom"}</button>
      {([0,48,108,185,285,410] as const).map(f=><button key={f}
        type="button" style={control} onClick={()=>{setPlaying(false);setFrame(f);}}>
        {f===0?"Blank paper":f===410?"Fully dry":"Frame "+f}</button>)}
    </div>
    <label style={{display:"grid",gap:5,maxWidth:1000,fontSize:13,fontWeight:700}}>
      Absolute frame: {frame} / {TOTAL-1}
      <input type="range" min={0} max={TOTAL-1} aria-label="Wet paper frame"
        value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
    </label>
    <WatercolourFilmViewport width={spec.width} height={spec.height}>
      {scale=><div style={{width:spec.width,height:spec.height,
        transform:`scale(${scale})`,transformOrigin:"top left"}}>
        <WetStudyPage spec={spec} frame={frame} reducedMotion={reduced}/>
      </div>}
    </WatercolourFilmViewport>
    <WatercolourParameterEditor title="Wet-pigment field" value={spec}
      validate={candidate=>{
        const errors=inspectJsonObject(candidate);
        if(errors.length)return errors;
        const s=candidate as WetPaperSpec;
        const invalid=inspectWetPaper(s).map(e=>e.path+": "+e.message);
        if(s.width!==(output==="landscape"?960:540)||s.height!==(output==="landscape"?540:960))
          invalid.push("Paper dimensions must match output format.");
        return invalid;
      }}
      onApply={v=>{setPlaying(false);setCustom(v);}}
      onReset={()=>{setPlaying(false);setCustom(null);}}
      notes="Edit every droplet's position, pigment, water load and frame, along with grid resolution and paper physics."/>
    <p style={{margin:0,fontSize:13,lineHeight:1.5,maxWidth:880,color:"#697672"}}>
      The wet field is a resolution-bounded CPU reference model. No source stills,
      third-party art, photography or animation footage are redistributed.
      Normal-speed visual acceptance and high-resolution material profiling remain open.
    </p>
  </main>;
}
const meta={title:"Video Production/Film Looks/Watercolour & Brush",
  id:"film-art-watercolour-wet-paper",component:WetPaperLab,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof WetPaperLab>;
export default meta;
type Story=StoryObj<typeof meta>;
export const WetPigmentStudio:Story={render:()=> <WetPaperLab/>};
