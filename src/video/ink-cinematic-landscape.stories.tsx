import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import type { FilmDocument } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";
import { InkCinematicScene } from "../../registry/video/ink-cinematic-scene-react";
import { makeInkCinematicSpec, INK_CINEMATIC_ART } from "../../registry/video/ink-cinematic-scene";
import type { InkCinematicArtDirection, InkCinematicComposition, InkCinematicOutput } from "../../registry/video/ink-cinematic-scene";

const DURATION = 180, TOTAL=DURATION*2, FPS=30;
const document:FilmDocument={
  schemaVersion:1,id:"ink-cinematic-painting-two-scene-film",
  fps:{num:FPS,den:1},drift:0,
  outputs:[{id:"landscape",width:960,height:540},{id:"portrait",width:540,height:960}],
  scenes:[
    {id:"mountain-journey",recipeId:"slot",durationFrames:DURATION,
      content:{slot:"mountain-path",label:"The traveler moves among painted mountains and pines"}},
    {id:"reading-the-scroll",recipeId:"slot",durationFrames:DURATION,
      content:{slot:"riverside-scroll",label:"The traveler reads a scroll beside a river and bridge"}},
  ],
};
const title={font:"500 32px/1.13 Georgia, 'Times New Roman', serif",margin:0};
const label={font:"600 12px/1.4 system-ui,sans-serif",letterSpacing:.3};
const btn={padding:"8px 13px",background:"#fff8ec",border:"1px solid #a99a82",
  minHeight:38,borderRadius:5,cursor:"pointer",color:"#423e36"};
const scenes=[["mountain-path","Mountain journey"],["riverside-scroll","River and scroll"]] as const;
const shorten=(v:number)=>Math.round(v*100);
function Studio({first="mountain-path"}:{first?:InkCinematicComposition}){
  const [composition,setComposition]=useState<InkCinematicComposition>(first);
  const [output,setOutput]=useState<InkCinematicOutput>("landscape");
  const [frame,setFrame]=useState(62);
  const [playing,setPlaying]=useState(false);
  const [reduced,setReduced]=useState(false);
  const [art,setArt]=useState<InkCinematicArtDirection>({...INK_CINEMATIC_ART});
  const [seed,setSeed]=useState(113);
  const index=composition==="mountain-path"?0:1;
  const compiled=useMemo(()=>compileFilm(document,{outputId:output}),[output]);
  const scene=useMemo(()=>makeInkCinematicSpec(composition,{output,seed,art}),[composition,output,seed,art]);
  useEffect(()=>{
    if(!playing||reduced)return;
    const start=performance.now(),initial=frame;
    let raf=0;
    function tick(now:number){
      const next=Math.min(DURATION-1,initial+Math.floor((now-start)*FPS/1000));
      setFrame(next);
      if(next===DURATION-1)setPlaying(false);
      else raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
    // Timeline is intentionally local to the Storybook scrubber, not the exporter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,reduced]);
  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(x=>x.message).join("; ")}</pre>;
  const scale=output==="landscape"?.88:.54;
  const setValue=(key:keyof InkCinematicArtDirection,value:number)=>{
    setPlaying(false);setArt(prev=>({...prev,[key]:value}));
  };
  return <main style={{background:"#e9dfcd",minHeight:"100vh",padding:24,
    display:"grid",gap:16,alignContent:"start",color:"#494137",font:"15px/1.45 system-ui,sans-serif"}}>
    <header style={{maxWidth:900,display:"grid",gap:7}}>
      <div style={{fontSize:11,letterSpacing:2.2,fontWeight:700,color:"#887457"}}>
        VIDEO PRODUCTION / FILM LOOKS / CHINESE INK / INK7
      </div>
      <h1 style={title}>A walk through ink · code-painted cinema</h1>
      <p style={{maxWidth:800,margin:0,fontSize:13}}>
        Two original, frame-addressable animated shan-shui scenes. Mountains, scholar,
        ink-wash motifs, brush contours, paper, atmosphere, scroll and camera are editable code,
        not images shifted across a background. The production export uses these exact renderers.
      </p>
    </header>
    <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"end"}}>
      <label style={label}>Story
        <select aria-label="Ink cinematic story" value={composition}
          onChange={e=>{setComposition(e.target.value as InkCinematicComposition);setFrame(0);setPlaying(false)}}
          style={{display:"block",height:39,padding:8,minWidth:180}}>
          {scenes.map(([value,name])=><option value={value} key={value}>{name}</option>)}
        </select>
      </label>
      <label style={label}>Output
        <select aria-label="Ink cinematic output" value={output}
          onChange={e=>{setOutput(e.target.value as InkCinematicOutput);setPlaying(false)}}
          style={{display:"block",height:39,padding:8,minWidth:135}}>
          <option value="landscape">16:9 landscape</option>
          <option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={{...label,display:"flex",gap:7,alignItems:"center",paddingBottom:8}}>
        <input aria-label="Ink cinematic reduced motion" type="checkbox" checked={reduced}
          onChange={e=>{setReduced(e.target.checked);setPlaying(false)}}/>
        Reduced motion
      </label>
      <label style={label}>Paper seed
        <input aria-label="Ink cinematic paper seed" type="number" min={0} max={9999} value={seed}
          style={{display:"block",padding:7,width:90,height:23}}
          onChange={e=>setSeed(Math.max(0,Math.min(9999,Number(e.target.value)||0)))}/>
      </label>
    </div>
    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
      {([["detail","Brush detail"],["ink","Ink intensity"],["mist","Mist and air"],
        ["wind","Wind and cloth"],["camera","Camera drift"],["grain","Paper grain"]] as const)
        .map(([key,name])=><label key={key} style={{...label,display:"grid",gap:3}}>
          {name} · {shorten(art[key])}%
          <input aria-label={"Ink cinematic "+key} type="range" min="0" max="1" step=".05"
            value={art[key]} onChange={e=>setValue(key,Number(e.target.value))}
            style={{width:132}}/>
        </label>)}
      <button type="button" style={btn} onClick={()=>{setArt({...INK_CINEMATIC_ART});setSeed(113);setPlaying(false)}}>
        Reset painting
      </button>
    </div>
    <div data-testid="ink-cinematic-stage" style={{width:(output==="landscape"?960:540)*scale,
      height:(output==="landscape"?540:960)*scale,maxWidth:"100%",overflow:"hidden",
      background:"#f5ecdc",boxShadow:"0 18px 52px #4d402d38"}}>
      <div style={{width:output==="landscape"?960:540,
        height:output==="landscape"?540:960,transform:"scale("+scale+")",transformOrigin:"0 0"}}>
        <FilmStage film={compiled.film} frame={index*DURATION+frame}
          renderObject={()=>null} reducedMotion={reduced}
          renderSlot={(_slot,context)=><InkCinematicScene spec={scene}
            frame={reduced?DURATION-1:context.frame} reducedMotion={reduced}/>}/>
      </div>
    </div>
    <div style={{width:"100%",maxWidth:880,display:"grid",gap:9}}>
      <label style={{...label,display:"grid",gap:6}}>
        Painting and acting frame · {frame} / {DURATION-1}
        <input aria-label="Ink cinematic film frame" type="range" min={0} max={DURATION-1}
          value={frame} onChange={e=>{setFrame(Number(e.target.value));setPlaying(false)}}/>
      </label>
      <nav aria-label="Cinematic ink animation controls" style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        <button type="button" style={btn} disabled={reduced}
          onClick={()=>{if(frame===DURATION-1)setFrame(0);setPlaying(v=>!v)}}>
          {playing?"Pause":"Play animation"}
        </button>
        {([["Opening",0],["Walk",36],["Gesture",93],["Arrival",153],["Hold",179]] as const)
          .map(([name,at])=><button type="button" style={btn} key={at}
            onClick={()=>{setPlaying(false);setFrame(at)}}>{name}</button>)}
      </nav>
    </div>
    <p style={{fontSize:12,color:"#786950",margin:0,maxWidth:900}}>
      The original landscape grammar is authored SVG + reusable pressure-brush strokes.
      Live paper parameters affect real paint geometry and figure movement. For other stories,
      edit the typed motif array rather than replacing a full-frame screenshot.
    </p>
  </main>;
}
function Export({output}:{output:InkCinematicOutput}){
  const [frame,setFrame]=useState(0);
  const compiled=useMemo(()=>compileFilm(document,{outputId:output}),[output]);
  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(x=>x.message).join("; ")}</pre>;
  const manifest:VideoExportManifest={
    schemaVersion:1,id:"ink-cinematic-"+output,
    width:output==="landscape"?960:540,height:output==="landscape"?540:960,
    fps:{num:FPS,den:1},durationFrames:TOTAL,
  };
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <FilmStage film={compiled.film} frame={frame} renderObject={()=>null}
      renderSlot={(content,context)=>{
        if(content.slot!=="mountain-path"&&content.slot!=="riverside-scroll")
          throw new RangeError("Unknown INK7 cinematic recipe "+content.slot);
        const scene=makeInkCinematicSpec(content.slot,{output});
        return <InkCinematicScene spec={scene} frame={context.frame}
          reducedMotion={context.reducedMotion}/>;
      }}/>
  </VideoExportStage>;
}
const meta={title:"Video production/Film Looks/Chinese Ink/Cinematic Landscape Engine",
  id:"video-ink-cinematic-landscape",component:Studio,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof Studio>;
export default meta;
export const MountainJourney:StoryObj<typeof meta>={
  name:"Mountain journey · moving scholar, mist, pines",
  render:()=> <Studio first="mountain-path"/>,
};
export const RiversideScroll:StoryObj<typeof meta>={
  name:"Riverside scroll · bridge, river, willow, scholar",
  render:()=> <Studio first="riverside-scroll"/>,
};
export const ProductionExport:StoryObj<typeof Export>={
  name:"INK7 · two-scene 16:9 video",render:()=> <Export output="landscape"/>,
};
export const PortraitExport:StoryObj<typeof Export>={
  name:"INK7 · two-scene 9:16 video",render:()=> <Export output="portrait"/>,
};
