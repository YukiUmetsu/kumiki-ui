import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FilmStage } from "../../registry/video/film-stage";
import { compileFilm } from "../../registry/video/film-document";
import { WatercolourIllustration,inspectWatercolourArtwork }
  from "../../registry/video/watercolour-illustration";
import type { WatercolourArtwork,WatercolourArtPart }
  from "../../registry/video/watercolour-illustration";
import { watercolorPortraitSpec } from "./watercolour-portrait-demo";
import type { PortraitOutput } from "./watercolour-portrait-demo";
import { WATERCOLOUR_PORTRAIT_FILM } from "./watercolour-portrait-film";
import { WatercolourFilmViewport, WatercolourParameterEditor,
  WatercolourSlider, inspectJsonObject } from "./watercolour-film-parameters";

const TOTAL=360;
const control={font:"600 13px system-ui",border:"1px solid #BAADA1",
  background:"#FEFAF3",color:"#494651",padding:"9px 12px",
  borderRadius:7,minHeight:41} as const;

/** WC11 replaces only the previously published miniature traveller STORY.
 * The old rig and portable character film stay available to API consumers.
 * All visual timing here comes from the source illustration and FilmStage.
 */
function PortraitAtelier(){
  const [output,setOutput]=useState<PortraitOutput>("portrait");
  const [frame,setFrame]=useState(255);
  const [playing,setPlaying]=useState(false);
  const [seed,setSeed]=useState(83);
  const [tooth,setTooth]=useState(.81);
  const [grain,setGrain]=useState(.77);
  const [showGlazing,setShowGlazing]=useState(true);
  const [showWetEdges,setShowWetEdges]=useState(true);
  const [showDetail,setShowDetail]=useState(true);
  const [reduced,setReduced]=useState(false);
  const [custom,setCustom]=useState<WatercolourArtwork|null>(null);
  const compiled=useMemo(()=>compileFilm(WATERCOLOUR_PORTRAIT_FILM,{outputId:output}),[output]);
  const authored=useMemo(()=>{
    const scene=watercolorPortraitSpec(output,seed);
    return {...scene,paper:{...scene.paper,tooth,granulation:grain},
      wetPaper:scene.wetPaper?{...scene.wetPaper,granulation:grain,
        paper:{...scene.wetPaper.paper,tooth}}:undefined};
  },[output,seed,tooth,grain]);
  const raw=custom??authored;
  const painting=useMemo<WatercolourArtwork>(()=>{
    if(showGlazing&&showDetail&&showWetEdges)return raw;
    const detail=/(-glint$|-pupil$|hair-separated|flyaway|philtrum|nose-alar|cloth-folds|mouth-corners|earring)/;
    const transform=(node:WatercolourArtPart):WatercolourArtPart|null=>{
      if(!showDetail&&detail.test(node.id))return null;
      if(node.kind==="path"){
        if(!node.wash)return node;
        if(!showGlazing){
          const {wash:_wash,...plain}=node;
          return plain;
        }
        if(!showWetEdges&&node.wash.edgeSoftness){
          return {...node,wash:{...node.wash,edgeSoftness:0}};
        }
        return node;
      }
      const children=node.children.map(transform).filter(
        (item):item is WatercolourArtPart=>item!==null);
      return {...node,children};
    };
    return {...raw,parts:raw.parts.map(transform).filter(
      (part):part is WatercolourArtPart=>part!==null)};
  },[raw,showGlazing,showDetail,showWetEdges]);

  useEffect(()=>{
    if(!playing)return;
    const started=performance.now(),initial=frame;
    let raf=0;
    const tick=(now:number)=>{
      const next=Math.min(TOTAL-1,initial+Math.floor((now-started)*30/1000));
      setFrame(next);
      if(next<TOTAL-1)raf=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);

  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(
    d=>d.path+": "+d.message).join("\n")}</pre>;
  const film=compiled.film;
  return <main style={{padding:24,minHeight:"100vh",background:"#EAE4DC",
    display:"grid",gap:16,alignContent:"start",color:"#484651",
    fontFamily:"system-ui,sans-serif"}}>
    <header style={{maxWidth:940}}>
      <div style={{fontSize:12,fontWeight:750,letterSpacing:2.2,color:"#966D67"}}>
        WC12 / PORTRAIT MATERIAL STUDIES
      </div>
      <h1 style={{font:"italic 500 39px/1.12 Georgia,serif",margin:"7px 0 9px"}}>
        Where the light touches the face
      </h1>
      <p style={{fontSize:14,lineHeight:1.65,maxWidth:840,margin:0}}>
        Study original portrait anatomy alongside wet-on-wet softness and light:
        facial values melt into translucent cheek and temple washes while the eyelids,
        iris, hair roots and mouth stay structurally precise. Toggle soft edges and
        optical glazing independently; inspect the same face in 16:9 and 9:16.
      </p>
    </header>
    <div style={{display:"flex",alignItems:"end",flexWrap:"wrap",gap:13}}>
      <label style={{display:"grid",gap:5,fontSize:13,fontWeight:700}}>
        Portrait format
        <select aria-label="Portrait output" style={control} value={output}
          onChange={e=>{setPlaying(false);setCustom(null);
            setOutput(e.target.value as PortraitOutput);}}>
          <option value="portrait">9:16 — vertical portrait</option>
          <option value="landscape">16:9 — editorial composition</option>
        </select>
      </label>
      <label style={{display:"grid",gap:5,fontSize:13,fontWeight:700}}>
        Pigment seed
        <input aria-label="Portrait pigment seed" style={{...control,width:115}}
          type="number" min={0} max={2147483647} value={seed}
          onChange={e=>{setPlaying(false);setCustom(null);
            setSeed(Math.max(0,Math.min(2147483647,Math.floor(Number(e.target.value)||0))));}}/>
      </label>
      <WatercolourSlider label="Portrait paper tooth" value={tooth} step={.05}
        onChange={v=>{setPlaying(false);setCustom(null);setTooth(v);}}/>
      <WatercolourSlider label="Local pigment granulation" value={grain} step={.05}
        onChange={v=>{setPlaying(false);setCustom(null);setGrain(v);}}/>
      {([
        {label:"Optical portrait glazing",checked:showGlazing,set:setShowGlazing},
        {label:"Soft wet-on-wet portrait edges",checked:showWetEdges,set:setShowWetEdges},
        {label:"Fine facial details",checked:showDetail,set:setShowDetail},
        {label:"Reduced motion",checked:reduced,set:setReduced},
      ] as const).map(t=><label key={t.label} style={{display:"flex",
        alignItems:"center",gap:6,fontSize:13,fontWeight:650,minHeight:42}}>
        <input type="checkbox" aria-label={t.label} checked={t.checked}
          onChange={e=>{setPlaying(false);t.set(e.target.checked);}}/>
        {t.label}
      </label>)}
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
      <button style={control} type="button" onClick={()=>{
        if(playing){setPlaying(false);return;}
        if(frame>=TOTAL-1)setFrame(0);
        setPlaying(true);
      }}>{playing?"Pause painting":"Play watercolor portrait"}</button>
      {([0,75,140,185,255,319,359] as const).map(f=>
        <button key={f} style={control} type="button"
          onClick={()=>{setPlaying(false);setFrame(f);}}>
          Frame {f}
        </button>)}
    </div>
    <label style={{display:"grid",gap:5,maxWidth:940,fontWeight:700,fontSize:13}}>
      Portrait animation — frame {frame} / {TOTAL-1}
      <input aria-label="Portrait animation frame" type="range" min={0}
        max={TOTAL-1} value={frame}
        onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
    </label>
    <WatercolourFilmViewport width={film.width} height={film.height} maxWidth={960}>
      {scale=><FilmStage film={film} frame={frame} reducedMotion={reduced}
        renderObject={()=>null} renderSlot={(content,context)=>{
          if(content.slot!=="watercolour-illustration")
            throw new RangeError("Unknown portrait scene slot.");
          return <WatercolourIllustration spec={painting} frame={context.frame}
            reducedMotion={context.reducedMotion}/>;
        }} style={{transform:"scale("+scale+")",transformOrigin:"top left"}}/>}
    </WatercolourFilmViewport>
    <WatercolourParameterEditor key={output} title="Portrait anatomy, paint and film rig"
      value={raw} validate={candidate=>{
        const errors=inspectJsonObject(candidate);
        if(errors.length)return errors;
        const spec=candidate as WatercolourArtwork;
        const issues=inspectWatercolourArtwork(spec);
        if(spec.width!==film.width||spec.height!==film.height)
          issues.push("The artwork dimensions must match FilmStage output.");
        return issues;
      }} onApply={value=>{setPlaying(false);setCustom(value);}}
      onReset={()=>{setPlaying(false);setCustom(null);}}
      notes="Edit every skin, hair, garment or facial SVG contour; move parent pivots,
        change blink, head and gaze keyframes; adjust glow, gradient,
        optical glaze and wet-paper deposition. All edits are validated."/>
    <p style={{margin:0,maxWidth:900,fontSize:13,color:"#736C6A",lineHeight:1.55}}>
      References establish watercolor practice, not a sitter identity. No artist
      painting, portrait photograph, licensed texture, or image tracing is bundled.
      Art acceptance still requires visual comparison to real watercolor paintings.
    </p>
  </main>;
}
const meta={title:"Video Production/Film Looks/Watercolour & Brush/02 Painted Characters",
  id:"film-art-watercolour-portrait",component:PortraitAtelier,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof PortraitAtelier>;
export default meta;
type Story=StoryObj<typeof meta>;
export const NaturalistPortrait:Story={render:()=><PortraitAtelier/>};
