import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { WATERCOLOUR_WET_PAPER_FILM } from "./watercolour-wet-paper-film";
import { inspectWetPaper } from "../../registry/video/watercolour-wet-paper";
import type { WetPaperSpec } from "../../registry/video/watercolour-wet-paper";
import { wetPaperDemo, WetStudyPage } from "./watercolour-wet-paper-demo";
import { WatercolourFilmViewport, WatercolourParameterEditor, WatercolourSlider, inspectJsonObject } from "./watercolour-film-parameters";

type Output = "landscape" | "portrait";
const TOTAL=420;
const control={font:"600 13px system-ui",padding:"9px 12px",border:"1px solid #B9ABA0",
  borderRadius:7,background:"#FFFBF5",color:"#354A4A",minHeight:40} as const;

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
  const compiled=useMemo(()=>compileFilm(WATERCOLOUR_WET_PAPER_FILM,{outputId:output}),[output]);
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
  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(x=>x.path+": "+x.message).join("\n")}</pre>;
  const film=compiled.film;
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
    <WatercolourFilmViewport width={film.width} height={film.height}>
      {scale=><FilmStage film={film} frame={frame} renderObject={()=>null}
        reducedMotion={reduced} renderSlot={(content,context)=>{
          if(content.slot!=="watercolour-wet-paper")throw new Error("Unknown wet paper film slot");
          return <WetStudyPage spec={spec} frame={context.frame}
            reducedMotion={context.reducedMotion}/>;
        }} style={{transform:"scale("+scale+")",transformOrigin:"top left"}}/>}
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
const meta={title:"Video Production/Film Looks/Watercolour & Brush/03 Wet Pigment Physics",
  id:"film-art-watercolour-wet-paper",component:WetPaperLab,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof WetPaperLab>;
export default meta;
type Story=StoryObj<typeof meta>;
export const WetPigmentStudio:Story={render:()=> <WetPaperLab/>};
