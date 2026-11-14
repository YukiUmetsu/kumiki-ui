import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { PaintedTravellerPage } from "./watercolour-actor-demo";
import { WATERCOLOUR_ACTOR_FILM } from "./watercolour-actor-film";
import type { PaintedOutput } from "./painted-composition-demo";

function WatercolourCharacterLab(){
  const [frame,setFrame]=useState(320);
  const [playing,setPlaying]=useState(false);
  const [output,setOutput]=useState<PaintedOutput>("landscape");
  const [reduced,setReduced]=useState(false);
  const compiled=useMemo(()=>compileFilm(WATERCOLOUR_ACTOR_FILM,{outputId:output}),[output]);
  useEffect(()=>{
    if(!playing)return;
    const start=performance.now(),initial=frame;
    let id=0;
    const tick=(now:number)=>{
      const next=Math.min(429,initial+Math.floor((now-start)*30/1000));
      setFrame(next);
      if(next<429)id=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    id=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(id);
    // Playback transport only; exported performer uses absolute frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(x=>x.message).join("\n")}</pre>;
  const film=compiled.film,scale=output==="landscape"?.85:.62;
  const control={font:"600 14px system-ui",border:"1px solid #C2B7A8",background:"#FFFCF5",
    color:"#3C4B4B",padding:"8px 12px",minHeight:42,borderRadius:9} as const;
  return <main style={{minHeight:"100vh",background:"#ECE5DA",color:"#344448",
    fontFamily:"system-ui,sans-serif",padding:23,display:"grid",gap:15,alignContent:"start"}}>
    <header style={{maxWidth:950}}>
      <small style={{letterSpacing:2.3,color:"#896E60",fontWeight:800}}>
        WM3 / WATERCOLOUR CHARACTER PERFORMANCE
      </small>
      <h1 style={{font:"italic 500 38px/1.1 Georgia,serif",margin:"9px 0"}}>
        A character made of paint
      </h1>
      <p style={{maxWidth:800,lineHeight:1.55}}>
        A fully articulated original character shares the same watercolor paper as the illustrated world.
        Watch real leg actions, grounded footsteps, gesture, face expression, blink, gaze and speech.
        Each part retains its own painted edge as the rig moves.
      </p>
    </header>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
      <label style={{display:"grid",gap:4,fontWeight:650}}>
        Film aspect
        <select aria-label="Film aspect" style={control} value={output}
          onChange={e=>{setPlaying(false);setOutput(e.target.value as PaintedOutput);}}>
          <option value="landscape">16:9 landscape</option>
          <option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={{display:"flex",alignItems:"center",gap:6,fontWeight:650}}>
        <input aria-label="Reduce character motion" type="checkbox" checked={reduced}
          onChange={e=>{setPlaying(false);setReduced(e.target.checked);}}/>
        Reduced motion
      </label>
      <button type="button" style={control} onClick={()=>{
        if(playing){setPlaying(false);return;}
        if(frame>=429)setFrame(0);
        setPlaying(true);
      }}>{playing?"Pause":"Play scene"}</button>
      {([0,155,204,272,304,336,403] as const).map(f=>
        <button type="button" key={f} style={control}
          onClick={()=>{setPlaying(false);setFrame(f);}}>
          {({0:"Blank",155:"First step",204:"Stride",272:"Turn",304:"Wave",336:"Speak",403:"Hold"} as Record<number,string>)[f]}
        </button>)}
    </div>
    <label style={{display:"grid",gap:6,maxWidth:950,fontWeight:700}}>
      Absolute frame: {frame} / 429
      <input aria-label="Character film frame" type="range" min={0} max={429}
        value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
    </label>
    <div style={{width:film.width*scale,height:film.height*scale,maxWidth:"100%",
      overflow:"hidden",boxShadow:"0 15px 56px #283a3d24"}}>
      <FilmStage film={film} frame={frame} renderObject={()=>null} reducedMotion={reduced}
        renderSlot={(content,ctx)=>{
          if(content.slot!=="watercolour-actor")throw new Error("Unknown watercolor actor film slot");
          return <PaintedTravellerPage output={output} frame={ctx.frame} reducedMotion={ctx.reducedMotion}/>;
        }}
        style={{transform:"scale("+scale+")",transformOrigin:"top left"}}/>
    </div>
    <p style={{maxWidth:890,margin:0,fontSize:13,lineHeight:1.5,color:"#667470"}}>
      Character gestures and speech come from the existing rig evaluator; WM3 owns only grounded
      artboard placement, on-twos redraw cadence and a watercolor part material. Original artwork.
      This is a visual QA fixture, not an artist-approved feature-film character.
    </p>
  </main>;
}
const meta={title:"Film Art Styles/Watercolour & Brush",id:"film-art-watercolour-character",
  component:WatercolourCharacterLab,parameters:{layout:"fullscreen"}} satisfies Meta<typeof WatercolourCharacterLab>;
export default meta;
type Story=StoryObj<typeof meta>;
export const PaintedCharacterPerformance:Story={render:()=> <WatercolourCharacterLab/>};
