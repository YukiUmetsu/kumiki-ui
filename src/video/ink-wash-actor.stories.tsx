import { useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InkWashScene } from "../../registry/video/ink-wash-story-react";
import type { InkShot } from "../../registry/video/ink-wash-story";
import type { InkStroke, InkWashSpec } from "../../registry/video/ink-wash";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";
import { InkTraveler, INK_TRAVELER_CUES } from "./ink-wash-actor-demo";

type Aspect = "landscape" | "portrait";
const FRAMES = 240;
const SHOT: InkShot = {
  id:"ink-character-study",label:"Original ink-painted character performance",
  durationFrames:FRAMES,
  camera:{keyframes:[{frame:0,x:0,y:0,zoom:1},{frame:239,x:-7,y:2,zoom:1.025}]},
  layers:[{id:"ink-actor",reveal:"instant",startFrame:0,durationFrames:1,parallax:1}],
};
const point=(x:number,y:number,pressure:number)=>({x,y,pressure});
function backgroundSpec(aspect:Aspect):InkWashSpec {
  const portrait=aspect==="portrait",w=portrait?540:960,h=portrait?960:540;
  const st=(id:string,coords:readonly (readonly [number,number,number])[],width:number,
    tone:number,water:number,start:number,brush:"upright"|"oblique"="oblique"):InkStroke=>({
    id,points:coords.map(([x,y,p])=>point(x*w,y*h,p)),width,
    tone,water,load:.72,brush,tipInk:brush==="oblique"?.75:.35,
    startFrame:start,drawFrames:41,spreadFrames:28,dryFrames:50,
  });
  const foot=portrait?.81:.87;
  return {version:1,width:w,height:h,paper:"#F1EDE1",ink:"#26332f",seed:73,
    absorption:.76,grain:.62,
    strokes:[
      st("distant-hill",[[.02,.48,.02],[.19,.39,.34],[.31,.41,.28],[.45,.36,.5],[.58,.43,.03]],62,.26,.9,5),
      st("far-ridge",[[.25,.51,.02],[.46,.44,.3],[.64,.48,.46],[.78,.41,.29],[.98,.46,.01]],49,.20,.95,18),
      st("lower-horizon",[[.02,foot,.04],[.26,foot-.02,.22],[.49,foot-.01,.26],[.74,foot-.04,.38],[.98,foot-.035,.01]],39,.29,.84,33),
      st("branch-lean",[[.03,.1,.05],[.13,.18,.3],[.21,.24,.32],[.28,.27,.10]],8,.73,.26,48,"upright"),
      st("branch-spur",[[.15,.20,.20],[.24,.16,.27],[.35,.18,.02]],4,.76,.24,65,"upright"),
      st("bamboo-leaf-left",[[.15,.20,.01],[.19,.24,.48],[.23,.32,.01]],12,.64,.48,69),
      st("bamboo-leaf-up",[[.21,.25,.01],[.26,.22,.56],[.31,.18,.01]],13,.51,.58,73),
      st("bamboo-leaf-tip",[[.27,.27,.02],[.31,.34,.52],[.32,.39,.01]],13,.65,.38,79),
      st("foreground-bank",[[.03,.96,.01],[.23,.945,.32],[.44,.955,.42],[.68,.935,.39],[.97,.945,.01]],22,.41,.65,85),
    ]};
}
function InkActorFilm({frame,aspect="landscape",reducedMotion=false}:{
  frame:number;aspect?:Aspect;reducedMotion?:boolean;
}) {
  const portrait=aspect==="portrait",spec=useMemo(()=>backgroundSpec(aspect),[aspect]);
  const titleStyle={
    position:"absolute" as const,
    top:portrait?80:140,left:portrait?42:558,right:portrait?34:55,
    color:"#303b34",fontFamily:"Georgia,'Times New Roman',serif",
  };
  return <InkWashScene spec={spec} shot={SHOT} frame={frame}
    reducedMotion={reducedMotion} paintOrder="under"
    label="Ink brush landscape and an independently articulated original character"
    renderLayer={layer=>{
      if(layer.id!=="ink-actor")return null;
      return <div style={{position:"absolute",
        left:portrait?62:88,top:portrait?340:32,
        width:360,height:440,filter:"drop-shadow(1px 3px 2px rgba(41,51,42,.11))"}}>
        <InkTraveler frame={frame} cues={INK_TRAVELER_CUES} reducedMotion={reducedMotion}/>
      </div>;
    }}>
    <div style={titleStyle}>
      <div style={{font:"700 11px system-ui,sans-serif",letterSpacing:2.8,color:"#9d5b48"}}>
        PAINTED PERFORMANCE / 01
      </div>
      <h2 style={{fontSize:portrait?43:49,fontWeight:400,lineHeight:1.07,margin:"16px 0 12px"}}>
        A figure, alive in ink.
      </h2>
      <p style={{font:"15px/1.65 system-ui,sans-serif",maxWidth:300,margin:0,color:"#555c51"}}>
        Walk. Look. Speak. Gesture. Every mark stays connected to the same character.
      </p>
    </div>
    <div style={{position:"absolute",left:portrait?42:562,right:portrait?34:55,
      bottom:portrait?64:62,borderTop:"1px solid #afa898",paddingTop:12,
      font:"700 10px/1.5 system-ui,sans-serif",letterSpacing:2,color:"#5e635b"}}>
      ONE ACTOR · INDEPENDENT PARTS · SHARED FILM FRAME
    </div>
  </InkWashScene>;
}
function Studio() {
  const [frame,setFrame]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [aspect,setAspect]=useState<Aspect>("landscape");
  const [reduced,setReduced]=useState(false);
  const anchor=useRef<{frame:number;time:number}|null>(null);
  useEffect(()=>{
    if(!playing || reduced)return;
    let raf=0;
    const tick=(now:number)=>{
      if(!anchor.current)anchor.current={frame,time:now};
      const next=Math.min(FRAMES-1,anchor.current.frame + Math.floor((now-anchor.current.time)*.03));
      setFrame(next);
      if(next<FRAMES-1)raf=requestAnimationFrame(tick);else setPlaying(false);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[playing,reduced]);
  const portrait=aspect==="portrait",w=portrait?540:960,h=portrait?960:540;
  const scale=portrait?.56:.83;
  const control={background:"#f6f1e5",color:"#303a32",border:"1px solid #bcb4a7",
    borderRadius:5,font:"600 14px system-ui",padding:"10px 15px",cursor:"pointer"} as const;
  return <main style={{minHeight:"100vh",background:"#e8e5dd",padding:"24px",color:"#2c342d",
    fontFamily:"system-ui,sans-serif"}}>
    <div style={{maxWidth:1060,margin:"auto",display:"grid",gap:16}}>
      <header><div style={{fontSize:11,letterSpacing:2.5,fontWeight:700}}>KUMIKI / INK CHARACTER LAB</div>
        <h1 style={{font:"normal 40px/1.2 Georgia,serif",margin:"7px 0 4px"}}>Living brushwork</h1>
        <p style={{maxWidth:800,margin:0,color:"#5d655c",lineHeight:1.55}}>
          The original actor keeps its silhouette and rig revision as walking, gaze,
          gesture, aligned mouth shapes and independent blinking are evaluated on twos.
          The camera remains smooth, and the paper texture remains fixed.
        </p></header>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <button type="button" onClick={()=>{anchor.current=null;setPlaying(v=>!v);}}
          disabled={reduced} style={control}>{playing?"Pause":"Play character film"}</button>
        <button type="button" style={control} onClick={()=>{setPlaying(false);setFrame(0);anchor.current=null;}}>Restart</button>
        <label>Format <select aria-label="Format" value={aspect} onChange={e=>{setAspect(e.target.value as Aspect);setPlaying(false);}}
          style={{...control,padding:8}}><option value="landscape">16:9</option><option value="portrait">9:16</option></select></label>
        <label style={{display:"flex",alignItems:"center",gap:7}}>
          <input type="checkbox" checked={reduced} onChange={e=>{setReduced(e.target.checked);setPlaying(false);}}/>
          Reduced motion
        </label>
      </div>
      <div style={{width:w*scale,height:h*scale,boxShadow:"0 17px 48px #3e3c342c",overflow:"hidden",
        border:"1px solid #b4a995"}}>
        <div style={{width:w,height:h,transform:`scale(${scale})`,transformOrigin:"0 0"}}>
          <InkActorFilm aspect={aspect} frame={frame} reducedMotion={reduced}/>
        </div>
      </div>
      <label style={{width:"100%",maxWidth:w*scale}}>Film frame {frame} / {FRAMES-1}
        <input style={{display:"block",width:"100%",accentColor:"#855e4e"}}
          type="range" aria-label="Ink character frame" min={0} max={FRAMES-1} value={frame}
          onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));anchor.current=null;}}/>
      </label>
      <nav aria-label="Character beats" style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        {([["Walk",56],["Look",106],["Speak + gesture",144],["React",203]] as const).map(([n,f])=>
          <button type="button" key={n} style={control} onClick={()=>{setPlaying(false);setFrame(f);anchor.current=null;}}>{n}</button>)}
      </nav>
    </div>
  </main>;
}
const manifest:VideoExportManifest={schemaVersion:1,id:"ink-character-performance-study",
  width:960,height:540,durationFrames:FRAMES,fps:{num:30,den:1}};
function Export() {
  const [frame,setFrame]=useState(0);
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <InkActorFilm frame={frame}/>
  </VideoExportStage>;
}
const meta={title:"Video production/Chinese Ink Character",id:"video-ink-character",
  component:Studio,parameters:{layout:"fullscreen"}} satisfies Meta<typeof Studio>;
export default meta;
export const Interactive:StoryObj<typeof meta>={name:"Original character · Walk, speak, look and gesture"};
export const ProductionExport:StoryObj<typeof Export>={name:"Character performance · MP4 export",render:()=> <Export/>};
