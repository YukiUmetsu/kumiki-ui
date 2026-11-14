import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { RisoCharacterStage } from "../../registry/video/riso-performance-react";
import { risoPerformanceSceneStable } from "./riso-performance-fixtures";
import type { RisoPerformanceAspect, RisoPerformanceSubject } from "./riso-performance-fixtures";
import { RISO_CHARACTER_FILM } from "./riso-performance-film";

const MAX_FRAME = 599;
const control = {display:"grid",gap:6,minWidth:155,font:"600 13px/1.35 system-ui"} as const;
const button = {border:"1px solid #b6aa9c",borderRadius:8,padding:"11px 15px",background:"#fffaf0",
  color:"#263b48",cursor:"pointer",font:"600 13px system-ui"} as const;
const page = {padding:"24px clamp(16px,3vw,38px)",background:"#e9e2d4",minHeight:"100vh",
  color:"#263b48",font:"14px/1.45 system-ui,sans-serif",display:"grid",gap:16,
  alignContent:"start"} as const;

function RisoPerformanceLab() {
  const [aspect,setAspect]=useState<RisoPerformanceAspect>("landscape");
  const [frame,setFrame]=useState(142);
  const [playing,setPlaying]=useState(false);
  const [registration,setRegistration]=useState(.3);
  const [grain,setGrain]=useState(.6);
  const [cadence,setCadence]=useState<1|2|3|4>(2);
  const [cameraEnabled,setCameraEnabled]=useState(true);
  const [reducedMotion,setReducedMotion]=useState(false);
  const compiled = useMemo(()=>compileFilm(RISO_CHARACTER_FILM,{outputId:aspect}),[aspect]);
  // UI playback is the only clock. The native FilmStage, pose evaluator and print are
  // frame-pure and use nothing from this timer's internal history.
  useEffect(()=>{
    if(!playing)return;
    const initial=frame, started=performance.now();
    let handle=0;
    const next=(now:number)=>{
      const at=Math.min(MAX_FRAME,initial+Math.floor((now-started)*30/1000));
      setFrame(at);
      if(at<MAX_FRAME)handle=requestAnimationFrame(next);
      else setPlaying(false);
    };
    handle=requestAnimationFrame(next);
    return()=>cancelAnimationFrame(handle);
    // Captures the starting frame when Play is pressed; edits pause first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(d=>d.path+": "+d.message).join("\n")}</pre>;
  const film=compiled.film;
  const currentSubject:RisoPerformanceSubject=frame<300?"postcard":"night-garden";
  const scale=aspect==="portrait"?.68:1;
  const width=film.width*scale,height=film.height*scale;
  const at=(n:number)=>{setPlaying(false);setFrame(n);};
  const actorLabel=currentSubject==="postcard"?"Courier + bird":"Fox + moon moth";
  return <div style={page}>
    <header style={{maxWidth:940}}>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:2.4,textTransform:"uppercase",color:"#8e5a44"}}>
        Printed Film / Original RISO1 Actor Rig
      </div>
      <h1 style={{font:"600 clamp(27px,3vw,42px)/1.1 Georgia,serif",margin:"7px 0 10px"}}>
        Risograph Character Animation Lab
      </h1>
      <p style={{margin:0,maxWidth:850}}>
        Two independent printed stories, four FilmStage shots and four original characters.
        Limb hierarchy, eyelid and mouth redraws, gesture keys, hand-drawn cel cadence, scene
        parallax and a continuously moving camera share the existing two real spot-ink plates.
        Change the material controls and scrub any frame; no second renderer or character clock.
      </p>
    </header>
    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
      {([["THE POSTCARD",145],["THE NIGHT GARDEN",455]] as const).map(([title,n])=>
        <button key={title} type="button" onClick={()=>at(n)}
          style={{...button,background:(n<300) === (frame<300)?"#27517c":"#fffaf0",
            color:(n<300) === (frame<300)?"#fffaf0":"#27517c"}}>{title}</button>)}
    </div>
    <div style={{width,maxWidth:"100%",height,boxShadow:"0 18px 54px #34435826",
      background:"#f3ead8",overflow:"hidden",border:"8px solid #f8f1e3",boxSizing:"content-box"}}>
      <FilmStage film={film} frame={frame} renderObject={()=>null} reducedMotion={reducedMotion}
        renderSlot={(content,context)=>{
          if(content.slot!=="riso-character-story")throw new RangeError("Unexpected character slot");
          const subject=content.props?.subject;
          const offset=content.props?.offsetFrame;
          if((subject!=="postcard" && subject!=="night-garden") ||
              typeof offset!=="number" || !Number.isSafeInteger(offset))
            throw new RangeError("RISO1 actor scene requires subject and authored offset.");
          const base=risoPerformanceSceneStable(subject,aspect);
          const spec=(!cameraEnabled||cadence!==2) ?
            {...base,camera:cameraEnabled?base.camera:undefined,
              actors:base.actors.map(actor=>({...actor,cadence}))} : base;
          return <RisoCharacterStage spec={spec} frame={offset+context.frame}
            reducedMotion={context.reducedMotion} misregistration={registration}
            paperGrain={grain}/>;
        }} style={{transform:"scale("+scale+")",transformOrigin:"top left"}}/>
    </div>
    <div style={{maxWidth:970,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
      <span>Now performing: <strong>{actorLabel}</strong></span>
      <span style={{fontVariantNumeric:"tabular-nums",fontWeight:700}}>Frame {frame} / {MAX_FRAME} · 30 FPS · {aspect==="portrait"?"9:16":"16:9"}</span>
    </div>
    <div style={{display:"flex",maxWidth:970,gap:12,alignItems:"end"}}>
      <button style={{...button,background:"#27517c",color:"white"}} type="button"
        aria-label={playing?"Pause Riso character film":"Play Riso character film"}
        onClick={()=>{if(playing){setPlaying(false);return;}if(frame===MAX_FRAME)setFrame(0);setPlaying(true)}}>
        {playing?"Pause":frame===MAX_FRAME?"Replay":"Play film"}
      </button>
      <label style={{...control,flex:1}}>Film frame
        <input type="range" aria-label="Riso character film frame" min={0} max={MAX_FRAME}
          value={frame} onChange={e=>at(Number(e.target.value))}/>
      </label>
    </div>
    <nav aria-label="Character acting beats" style={{display:"flex",flexWrap:"wrap",gap:8,maxWidth:970}}>
      {([["Enter",22],["Wave",126],["Speak + blink",161],["Postcard hold",284],
        ["Moth flight",356],["Fox gestures",420],["Quiet ending",580]] as const)
        .map(([label,atFrame])=><button type="button" key={label}
          style={{...button,padding:"8px 11px",borderRadius:22}} onClick={()=>at(atFrame)}>{label}</button>)}
    </nav>
    <div style={{display:"flex",gap:18,flexWrap:"wrap",maxWidth:970,alignItems:"end"}}>
      <label style={control}>Output format
        <select aria-label="Riso character output" value={aspect} style={{font:"inherit",minHeight:38}}
          onChange={e=>{setPlaying(false);setAspect(e.target.value as RisoPerformanceAspect)}}>
          <option value="landscape">16:9 film</option><option value="portrait">9:16 short</option>
        </select>
      </label>
      <label style={control}>Registration · {registration.toFixed(2)}
        <input type="range" aria-label="Riso character registration" min={0} max={1} step={.05}
          value={registration} onChange={e=>setRegistration(Number(e.target.value))}/>
      </label>
      <label style={control}>Paper grain · {Math.round(grain*100)}%
        <input type="range" aria-label="Riso character grain" min={0} max={1} step={.05}
          value={grain} onChange={e=>setGrain(Number(e.target.value))}/>
      </label>
      <label style={control}>Cel hold · {cadence} frame{cadence>1?"s":""}
        <select aria-label="Riso character cel hold" value={cadence} style={{font:"inherit",minHeight:38}}
          onChange={e=>setCadence(Number(e.target.value) as 1|2|3|4)}>
          <option value={1}>On ones (fluid)</option><option value={2}>On twos (print-film)</option>
          <option value={3}>On threes (expressive)</option><option value={4}>On fours (held)</option>
        </select>
      </label>
      <label style={{display:"flex",gap:8,alignItems:"center",fontWeight:600}}>
        <input type="checkbox" checked={cameraEnabled} onChange={e=>setCameraEnabled(e.target.checked)}/>
        Authored camera
      </label>
      <label style={{display:"flex",gap:8,alignItems:"center",fontWeight:600}}>
        <input type="checkbox" checked={reducedMotion}
          onChange={e=>{setPlaying(false);setReducedMotion(e.target.checked)}}/>
        Reduced motion
      </label>
    </div>
    <p style={{maxWidth:930,fontSize:12,color:"#566775",margin:0}}>
      Frames and pose variants are authored data. Character movement holds by cadence while the camera interpolates smoothly.
      This is the first reusable actor-system milestone, not a photorealistic print scan or a complete IK/viseme editor.
    </p>
  </div>;
}
const meta={
  title:"Video production/Film Looks/Risograph Characters",
  id:"video-riso-characters",component:RisoPerformanceLab,
  parameters:{layout:"fullscreen"},
} satisfies Meta<typeof RisoPerformanceLab>;
export default meta;
export const PerformanceLab:StoryObj<typeof RisoPerformanceLab>={
  name:"Risograph · Printed Character Film",render:()=> <RisoPerformanceLab/>,
};
