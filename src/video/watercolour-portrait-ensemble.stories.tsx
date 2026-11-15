import {useEffect,useMemo,useState} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {FilmStage} from "../../registry/video/film-stage";
import {compileFilm} from "../../registry/video/film-document";
import {WatercolourIllustration} from "../../registry/video/watercolour-illustration";
import {WATERCOLOUR_PORTRAIT_ENSEMBLE_FILM} from "./watercolour-portrait-ensemble-film";
import {
  DEFAULT_PORTRAIT_CAST,inspectPortraitCast,watercolorPortraitEnsembleSpec,
} from "./watercolour-portrait-ensemble";
import type {WatercolourPortraitCastMember} from "./watercolour-portrait-ensemble";
import type {PortraitOutput,PortraitSubject} from "./watercolour-portrait-demo";
import {
  WatercolourFilmViewport,WatercolourSlider,WatercolourParameterEditor,
} from "./watercolour-film-parameters";

const duration=360;
const control={font:"600 13px system-ui",border:"1px solid #C8B9A8",background:"#FFFBF4",
  color:"#42484B",padding:"9px 12px",borderRadius:7,minHeight:41} as const;
const initial=(o:PortraitOutput):WatercolourPortraitCastMember[]=>
  DEFAULT_PORTRAIT_CAST[o].map(c=>({...c}));

/** One paper, multiple independently constructed figures. Not two CSS overlays. */
function EnsembleAtelier(){
  const [output,setOutput]=useState<PortraitOutput>("landscape");
  const [frame,setFrame]=useState(257);
  const [playing,setPlaying]=useState(false);
  const [reduced,setReduced]=useState(false);
  const [seed,setSeed]=useState(83);
  const [cast,setCast]=useState<WatercolourPortraitCastMember[]>(()=>initial("landscape"));
  const [tooth,setTooth]=useState(.8);
  const [granulation,setGranulation]=useState(.73);
  const compiled=useMemo(()=>compileFilm(WATERCOLOUR_PORTRAIT_ENSEMBLE_FILM,{outputId:output}),[output]);
  const authored=useMemo(()=>{
    const art=watercolorPortraitEnsembleSpec(output,seed,cast);
    return {...art,paper:{...art.paper,tooth,granulation},
      wetPaper:art.wetPaper?{...art.wetPaper,granulation,paper:{
        ...art.wetPaper.paper,tooth}}:undefined};
  },[output,seed,cast,tooth,granulation]);
  useEffect(()=>{
    if(!playing)return;
    const start=performance.now(),begin=frame;
    let request=0;
    const tick=(now:number)=>{
      const next=Math.min(duration-1,begin+Math.floor((now-start)*30/1000));
      setFrame(next);
      if(next<duration-1)request=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    request=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(request);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(
    e=>e.path+": "+e.message).join("\n")}</pre>;
  const film=compiled.film;
  const update=(index:number,patch:Partial<WatercolourPortraitCastMember>)=>{
    setPlaying(false);
    setCast(prev=>prev.map((c,i)=>i===index?{...c,...patch}:c));
  };
  return <main style={{padding:24,minHeight:"100vh",background:"#EEE8DF",
    display:"grid",alignContent:"start",gap:15,color:"#364B4D",fontFamily:"system-ui,sans-serif"}}>
    <header style={{maxWidth:960}}>
      <div style={{letterSpacing:"2px",fontWeight:750,fontSize:12,color:"#956D5B"}}>
        WC14 / MULTI-CHARACTER WATERCOLOUR FILM
      </div>
      <h1 style={{font:"italic 500 38px/1.14 Georgia,serif",margin:"7px 0"}}>
        Two lives on a single sheet
      </h1>
      <p style={{margin:0,maxWidth:940,fontSize:14,lineHeight:1.65}}>
        Independently authored head, eye, skin, hair and garment contours share
        one watercolor paper coordinate system. Each actor has its own pigment
        arrival, gaze, blink and head-gesture timeline; geometry remains editable
        without tracing a photograph. Switch between 16:9 film and 9:16 stacked portraits.
      </p>
    </header>
    <div style={{display:"flex",alignItems:"end",flexWrap:"wrap",gap:14}}>
      <label style={{display:"grid",gap:5,fontSize:13,fontWeight:700}}>Film output
        <select style={control} aria-label="Ensemble output" value={output}
          onChange={e=>{
            setPlaying(false);
            const o=e.target.value as PortraitOutput;
            setOutput(o);setCast(initial(o));
          }}>
          <option value="landscape">16:9 / Two sitters</option>
          <option value="portrait">9:16 / Stacked portraits</option>
        </select>
      </label>
      {cast.slice(0,2).map((actor,i)=><label key={actor.id} style={{display:"grid",
        gap:5,fontSize:13,fontWeight:700}}>
        {i===0?"First":"Second"} watercolor character
        <select style={control} value={actor.sitter}
          aria-label={i===0?"First sitter":"Second sitter"}
          onChange={e=>update(i,{sitter:e.target.value as PortraitSubject})}>
          <option value="sitter-a">Luminous adult</option>
          <option value="sitter-b">Mature adult</option>
        </select>
      </label>)}
      <label style={{display:"grid",gap:5,fontSize:13,fontWeight:700}}>Pigment seed
        <input type="number" min={0} max={2147483647} value={seed}
          aria-label="Ensemble pigment seed" style={{...control,width:100}}
          onChange={e=>{setPlaying(false);setSeed(
            Math.max(0,Math.min(2147483647,Math.floor(Number(e.target.value)||0))));}}/>
      </label>
      <WatercolourSlider label="Paper tooth" value={tooth}
        onChange={n=>{setPlaying(false);setTooth(n);}}/>
      <WatercolourSlider label="Pigment granulation" value={granulation}
        onChange={n=>{setPlaying(false);setGranulation(n);}}/>
      <label style={{display:"flex",gap:6,alignItems:"center",fontSize:13,minHeight:42}}>
        <input type="checkbox" checked={reduced}
          aria-label="Ensemble reduced motion"
          onChange={e=>{setPlaying(false);setReduced(e.target.checked);}}/>
        Reduced motion
      </label>
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
      {cast.slice(0,2).map((actor,i)=><WatercolourSlider key={actor.id}
        label={(i===0?"First":"Second")+" paint delay"}
        value={actor.delayFrames} min={0} max={120} step={1}
        format={v=>v+" frames"} onChange={n=>update(i,{delayFrames:n})}/>)}
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
      <button style={control} type="button" onClick={()=>{
        if(playing){setPlaying(false);return;}
        if(frame>=duration-1)setFrame(0);
        setPlaying(true);
      }}>{playing?"Pause":"Play two-character film"}</button>
      {([0,108,185,231,255,319,359] as const).map(f=>
        <button style={control} type="button" key={f} onClick={()=>{
          setPlaying(false);setFrame(f);
        }}>Frame {f}</button>)}
    </div>
    <label style={{maxWidth:1000,display:"grid",gap:5,fontSize:13,fontWeight:700}}>
      Exact film frame {frame} / {duration-1}
      <input type="range" min={0} max={duration-1} value={frame}
        aria-label="Two-character film frame"
        onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
    </label>
    <WatercolourFilmViewport width={film.width} height={film.height} maxWidth={960}>
      {scale=><FilmStage film={film} frame={frame} reducedMotion={reduced}
        renderObject={()=>null} renderSlot={(content,context)=>{
          if(content.slot!=="watercolour-portrait-ensemble")
            throw new RangeError("Unknown ensemble slot.");
          return <WatercolourIllustration spec={authored} frame={context.frame}
            reducedMotion={context.reducedMotion}/>;
        }} style={{transform:"scale("+scale+")",transformOrigin:"top left"}}/>}
    </WatercolourFilmViewport>
    <WatercolourParameterEditor key={output} title="Art-directed ensemble layout, cast and performance delays"
      value={cast} validate={inspectPortraitCast}
      onApply={value=>{setPlaying(false);setCast([...value]);}}
      onReset={()=>{setPlaying(false);setCast(initial(output));}}
      notes="Edit one to three figures, individual sitter identity, absolute paper placement, scale, and paint arrival frames. Inputs are bounded and checked before rendering."/>
    <p style={{maxWidth:960,margin:0,fontSize:13,lineHeight:1.5,color:"#637174"}}>
      Native watercolor shapes only; no raster portraits or third-party image
      pixels are embedded. Artistic acceptance still requires full-size still
      comparison and normal-speed playback inspection.
    </p>
  </main>;
}

const meta={title:"Video Production/Film Looks/Watercolour & Brush/02B Two-Character Film",
  id:"film-art-watercolour-two-character-film",component:EnsembleAtelier,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof EnsembleAtelier>;
export default meta;
type Story=StoryObj<typeof meta>;
export const PaintedEnsemble:Story={render:()=> <EnsembleAtelier/>};
