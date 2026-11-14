import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { inspectWetPaper } from "../../registry/video/watercolour-wet-paper";
import type { WetPaperSpec } from "../../registry/video/watercolour-wet-paper";
import { WATERCOLOUR_MASTER_STUDIES_FILM } from "./watercolour-master-studies-film";
import { WATERCOLOUR_STUDIES, WatercolourMasterStudyPage, watercolourStudySpec } from "./watercolour-master-studies";
import type { WatercolourStudy, WatercolourOutput } from "./watercolour-master-studies";
import { WatercolourFilmViewport, WatercolourParameterEditor, WatercolourSlider, inspectJsonObject } from "./watercolour-film-parameters";

const LENGTH=1260;
const cards={
  botanical:"Botanical observation",
  estuary:"Light on water",
  courtyard:"Architectural shadows",
} as const;
const control={border:"1px solid #C7B9AA",borderRadius:7,
  padding:"8px 12px",font:"600 13px system-ui",minHeight:40,
  background:"#FFFDF7",color:"#405352"} as const;

function MasterStudies() {
  const [frame,setFrame]=useState(340);
  const [playing,setPlaying]=useState(false);
  const [output,setOutput]=useState<WatercolourOutput>("landscape");
  const [flow,setFlow]=useState(.72);
  const [tooth,setTooth]=useState(.82);
  const [grain,setGrain]=useState(.8);
  const [seed,setSeed]=useState(83);
  const [reduced,setReduced]=useState(false);
  const [artOnly,setArtOnly]=useState(false);
  const [craftDetail,setCraftDetail]=useState(1);
  const [custom,setCustom]=useState<Partial<Record<WatercolourStudy,WetPaperSpec>>>({});
  const compiled=useMemo(()=>compileFilm(WATERCOLOUR_MASTER_STUDIES_FILM,{outputId:output}),[output]);
  const specs=useMemo(()=>Object.fromEntries(WATERCOLOUR_STUDIES.map(study=>{
    const original=watercolourStudySpec(study,output,seed);
    return [study,custom[study]??{...original,flow,granulation:grain,
      paper:{...original.paper,tooth}}];
  })) as Record<WatercolourStudy,WetPaperSpec>,[output,seed,flow,grain,tooth,custom]);
  const current=WATERCOLOUR_STUDIES[Math.min(2,Math.floor(frame/420))];
  const clear=()=>setCustom(prev=>({...prev,[current]:undefined}));

  useEffect(()=>{
    if(!playing)return;
    const started=performance.now(),start=frame;
    let request=0;
    const tick=(now:number)=>{
      const next=Math.min(LENGTH-1,start+Math.floor((now-started)*30/1000));
      setFrame(next);
      if(next<LENGTH-1)request=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    request=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(request);
    // Only Storybook's transport owns wall time; FilmStage art is frame-pure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);

  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(x=>x.path+": "+x.message).join("\n")}</pre>;
  const film=compiled.film;
  return <main style={{padding:24,minHeight:"100vh",background:"#EBE6DC",color:"#40514E",
    display:"grid",alignContent:"start",gap:15,fontFamily:"system-ui,sans-serif"}}>
    <header style={{maxWidth:935}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:2,color:"#92725C"}}>
        WM4 / REFERENCE-LED WATERCOLOR CRAFT</div>
      <h1 style={{font:"italic 500 40px/1.13 Georgia,serif",margin:"6px 0"}}>
        Three studies in light, water and detail</h1>
      <p style={{margin:0,fontSize:14,lineHeight:1.55,maxWidth:850}}>
        Three original scenes, directed by museum-observed material lessons:
        accurate botanical structures, luminous coastal paper reserves,
        and deliberate architectural light/shadow. One common material
        renderer, one frame clock, two native output ratios.
      </p>
    </header>
    <nav aria-label="Watercolour art chapters" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {WATERCOLOUR_STUDIES.map((study,i)=><button key={study} type="button"
        style={{...control,background:study===current?"#455D55":"#FFFDF7",
          color:study===current?"#FFF":"#455D55"}}
        aria-pressed={study===current}
        onClick={()=>{setPlaying(false);setFrame(i*420+355);}}>{cards[study]}</button>)}
    </nav>
    <div style={{display:"flex",gap:13,flexWrap:"wrap",alignItems:"end"}}>
      <label style={{display:"grid",gap:4,fontSize:13,fontWeight:700}}>Output
        <select style={control} aria-label="Master studies output" value={output}
          onChange={e=>{setPlaying(false);setCustom({});setOutput(e.target.value as WatercolourOutput);}}>
          <option value="landscape">16:9 landscape</option>
          <option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <WatercolourSlider label="Pigment mobility" value={flow}
        onChange={v=>{clear();setFlow(v);}}/>
      <WatercolourSlider label="Paper tooth" value={tooth}
        onChange={v=>{clear();setTooth(v);}}/>
      <WatercolourSlider label="Granulation" value={grain}
        onChange={v=>{clear();setGrain(v);}}/>
      <WatercolourSlider label="Fine brush craftsmanship" value={craftDetail}
        step={.1} onChange={v=>{setPlaying(false);setCraftDetail(v);}}/>
      <label style={{display:"grid",gap:5,fontSize:13,fontWeight:700}}>Paper seed
        <input style={{...control,width:100}} aria-label="Master studies seed"
          min={0} max={2147483647} type="number" value={seed}
          onChange={e=>{clear();setSeed(Math.max(0,Math.min(2147483647,Math.floor(Number(e.target.value)||0))));}}/>
      </label>
      <label style={{display:"flex",gap:7,alignItems:"center",fontSize:13,fontWeight:650,minHeight:40}}>
        <input aria-label="Full-canvas watercolor artwork" type="checkbox"
          checked={artOnly} onChange={e=>{setPlaying(false);setArtOnly(e.target.checked);}}/>
        Full-canvas painting (no editorial type)
      </label>
      <label style={{display:"flex",gap:7,alignItems:"center",fontSize:13,fontWeight:650,minHeight:40}}>
        <input aria-label="Master studies reduced motion" type="checkbox" checked={reduced}
          onChange={e=>{setPlaying(false);setReduced(e.target.checked);}}/>
        Reduced motion
      </label>
    </div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <button style={control} type="button" onClick={()=>{
        if(playing){setPlaying(false);return;}
        if(frame===LENGTH-1)setFrame(0);
        setPlaying(true);
      }}>{playing?"Pause":"Play full 42-second film"}</button>
      {([0,80,210,355,520,760,950,1250] as const).map(f=>
        <button style={control} key={f} type="button"
          onClick={()=>{setPlaying(false);setFrame(f);}}>Frame {f}</button>)}
    </div>
    <label style={{display:"grid",gap:5,fontSize:13,fontWeight:700,maxWidth:1000}}>
      Absolute film frame: {frame} / {LENGTH-1}
      <input type="range" min={0} max={LENGTH-1} value={frame}
        aria-label="Master studies film frame"
        onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
    </label>
    <WatercolourFilmViewport width={film.width} height={film.height}>
      {scale=><FilmStage film={film} frame={frame} reducedMotion={reduced}
        renderObject={()=>null}
        renderSlot={(content,context)=>{
          if(content.slot!=="watercolour-master-study")throw new Error("Unknown art study slot");
          const study=content.props?.study as WatercolourStudy;
          if(!WATERCOLOUR_STUDIES.includes(study))throw new RangeError("Invalid study");
          return <WatercolourMasterStudyPage study={study} spec={specs[study]}
            frame={context.frame} reducedMotion={context.reducedMotion}
            artOnly={artOnly} craftDetail={craftDetail}/>;
        }} style={{transform:"scale("+scale+")",transformOrigin:"top left"}}/>}
    </WatercolourFilmViewport>
    <WatercolourParameterEditor title={cards[current]} value={specs[current]}
      validate={candidate=>{
        const basics=inspectJsonObject(candidate);if(basics.length)return basics;
        const s=candidate as WetPaperSpec;
        const errors=inspectWetPaper(s).map(x=>x.path+": "+x.message);
        if(s.width!==film.width||s.height!==film.height)
          errors.push("Artboard must match selected output.");
        return errors;
      }}
      onApply={v=>{setPlaying(false);setCustom(prev=>({...prev,[current]:v}));}}
      onReset={()=>{setPlaying(false);setCustom(prev=>({...prev,[current]:undefined}));}}
      notes="Edit pigment deposits, reserve highlights, timing, transport, and sediment. Each chapter retains independent changes."/>
    <p style={{fontSize:13,color:"#677671",maxWidth:920,margin:0,lineHeight:1.5}}>
      Original code-drawn art; no reference image pixels or third-party media bundled.
      These scenes demonstrate layering, not museum-quality facsimiles.
      Inspect encoded 16:9 and 9:16 films at full size for artistic approval.
    </p>
  </main>;
}
const meta={title:"Video Production/Film Looks/Watercolour & Brush",
  id:"film-art-watercolour-master-studies",component:MasterStudies,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof MasterStudies>;
export default meta;
type Story=StoryObj<typeof meta>;
export const MasterCraftStudy:Story={render:()=> <MasterStudies/>};
