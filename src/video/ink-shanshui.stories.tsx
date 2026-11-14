import {useEffect,useState} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {InkShanshuiFilm} from "./ink-shanshui-film";
import {DEFAULT_SHANSHUI,SHANSHUI_FRAMES,SHANSHUI_REFERENCE_NOTES} from "../../registry/video/ink-shanshui";
import type {ShanshuiControls,ShanshuiScene} from "../../registry/video/ink-shanshui";
import {VideoExportStage} from "../../registry/video/video-export-stage";
import type {VideoExportManifest} from "../../registry/video/video-export-stage";

/** Original code-drawn shanshui animated film study. The three reference images
 * are art-direction targets only; they are not uploaded or embedded in the code.
 */
const style={
  button:{font:"600 13px system-ui",border:"1px solid #ad9b7e",padding:"9px 14px",
    borderRadius:4,background:"#fbf3e3",color:"#332b23",cursor:"pointer"} as const,
  field:{display:"grid",gap:5,font:"600 12px/1.45 system-ui",color:"#514535"} as const,
};
function Gallery(){
  const [controls,setControls]=useState<ShanshuiControls>(DEFAULT_SHANSHUI);
  // Start inside the walking performance, after the first wash reveal.
  const [frame,setFrame]=useState(84);
  const [playing,setPlaying]=useState(false);
  const [playStart,setPlayStart]=useState(84);
  const [reduced,setReduced]=useState(false);
  const [scholar,setScholar]=useState(true);
  const [cloth,setCloth]=useState(.72);
  const change=<K extends keyof ShanshuiControls>(key:K,value:ShanshuiControls[K])=>
    setControls(prev=>({...prev,[key]:value}));
  useEffect(()=>{
    if(!playing||reduced)return;
    const start=performance.now(),initial=playStart;
    let id=0;
    const tick=(now:number)=>{
      const next=Math.min(SHANSHUI_FRAMES-1,initial+Math.floor((now-start)*.03));
      setFrame(next);
      if(next<SHANSHUI_FRAMES-1)id=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    id=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(id);
    // Gallery play is not a second film clock. Export samples the absolute frame.
  },[playing,reduced,playStart]);
  return <main style={{minHeight:"100vh",padding:22,background:"#e9e2d5",
    color:"#342d24",font:"14px/1.5 system-ui",display:"grid",gap:15,
    alignContent:"start",justifyItems:"start"}}>
    <header style={{maxWidth:990}}>
      <div style={{color:"#86664b",letterSpacing:2,font:"700 11px system-ui"}}>
        VIDEO PRODUCTION / FILM LOOKS / CHINESE INK LANDSCAPES
      </div>
      <h1 style={{font:"400 35px/1.1 Georgia,serif",margin:"9px 0"}}>
        Shanshui · A Living Ink Painting
      </h1>
      <p style={{margin:0,maxWidth:880,color:"#6f5c49"}}>
        Three original hand-painting-inspired landscapes built from reusable code:
        mist, layered mountain washes, cliffs, rock hatching, detailed pine and willow,
        bamboo, flowing water, pavilion, path, birds, and a separately articulated
        sepia scholar. No photographs or generated image backgrounds.
      </p>
    </header>
    <div style={{display:"flex",gap:13,flexWrap:"wrap",alignItems:"end"}}>
      <label style={style.field}>Composition
        <select aria-label="Shanshui composition" value={controls.scene}
          onChange={e=>{setPlaying(false);change("scene",e.target.value as ShanshuiScene);}}
          style={{height:38,background:"#fff8ed",color:"#31281e"}}>
          <option value="mountain-trail">Mountain trail · waterfall and pines</option>
          <option value="river-scholar">Riverside scholar · willow and bridge</option>
          <option value="misty-hermit">Misty hermit · old pine and bamboo</option>
        </select>
      </label>
      {(["detail","mist","ink","wind"] as const).map(key=>
        <label key={key} style={style.field}>
          {({detail:"Brush detail",mist:"Atmospheric mist",ink:"Ink density",
            wind:"Foliage breeze"} as const)[key]} · {Math.round(controls[key]*100)}%
          <input aria-label={"Shanshui "+key} type="range" min="0" max="1"
            step=".05" value={controls[key]} onChange={e=>change(key,Number(e.target.value))}/>
        </label>)}
      <label style={style.field}>Cloth movement · {Math.round(cloth*100)}%
        <input aria-label="Shanshui cloth" type="range" min="0" max="1" step=".05"
          value={cloth} onChange={e=>setCloth(Number(e.target.value))}/>
      </label>
      <label style={{...style.field,display:"flex",alignItems:"center",height:38}}>
        <input type="checkbox" checked={scholar} onChange={e=>setScholar(e.target.checked)}/>
        Show scholar
      </label>
      <label style={{...style.field,display:"flex",alignItems:"center",height:38}}>
        <input type="checkbox" checked={reduced}
          onChange={e=>{setPlaying(false);setReduced(e.target.checked)}}/>
        Reduced motion
      </label>
    </div>
    <div data-testid="shanshui-preview"
      style={{width:960,height:540,transformOrigin:"top left",
        background:"#f3e6cd",boxShadow:"0 16px 38px #51443223"}}>
      <InkShanshuiFilm frame={frame} controls={controls}
        reducedMotion={reduced} showScholar={scholar} clothAmount={cloth}/>
    </div>
    <div style={{display:"grid",gap:9,width:960,maxWidth:"100%"}}>
      <label style={{...style.field,width:"100%"}}>Frame {frame} / {SHANSHUI_FRAMES-1}
        <input aria-label="Shanshui frame" type="range" min="0" max={SHANSHUI_FRAMES-1} step="1"
          value={frame} onChange={e=>{setFrame(Number(e.target.value));setPlaying(false)}}
          style={{width:"100%"}}/>
      </label>
      <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        <button type="button" disabled={reduced}
          title={reduced?"Turn off Reduced motion to play the film":undefined}
          style={{...style.button,opacity:reduced?.55:1,
            cursor:reduced?"not-allowed":"pointer"}} onClick={()=>{
          if(!playing){
            const start=frame>=SHANSHUI_FRAMES-1?0:frame;
            setPlayStart(start);
            if(start!==frame)setFrame(start);
          }
          setPlaying(v=>!v);
        }}>{playing?"Pause film":"Play film"}</button>
        {([["Paint reveal",16],["First steps",65],["Landscape complete",112],
          ["Quiet contemplation",185],["Bowing",274]] as const).map(([label,f])=>
          <button key={label} type="button" style={style.button}
            onClick={()=>{setPlaying(false);setFrame(f)}}>{label}</button>)}
      </div>
      <p style={{margin:0,fontSize:12,color:"#726050"}}>
        {SHANSHUI_REFERENCE_NOTES[controls.scene]}
        {" "}Scene geometry is authored in a consistent 960×540 paper coordinate system;
        seeking backward regenerates the same exact ink film state.
      </p>
    </div>
  </main>;
}
function Export({scene}:{scene:ShanshuiScene}){
  const [frame,setFrame]=useState(0);
  const manifest:VideoExportManifest={
    schemaVersion:1,id:"shanshui-"+scene,
    width:960,height:540,fps:{num:30,den:1},durationFrames:SHANSHUI_FRAMES,
  };
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <InkShanshuiFilm frame={frame} controls={{...DEFAULT_SHANSHUI,scene}}/>
  </VideoExportStage>;
}
const meta={title:"Video production/Film Looks/Chinese Ink/Shanshui/Film Gallery",
  id:"video-ink-shanshui",component:Gallery,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof Gallery>;
export default meta;
export const GalleryStudio:StoryObj<typeof meta>={
  name:"Original landscape paintings · interactive gallery",
};
export const MountainTrailExport:StoryObj<typeof Export>={
  name:"Mountain trail · production MP4 (16:9)",
  render:()=> <Export scene="mountain-trail"/>,
};
export const RiverScholarExport:StoryObj<typeof Export>={
  name:"Riverside scholar · production MP4 (16:9)",
  render:()=> <Export scene="river-scholar"/>,
};
export const MistyHermitExport:StoryObj<typeof Export>={
  name:"Misty hermit · production MP4 (16:9)",
  render:()=> <Export scene="misty-hermit"/>,
};
