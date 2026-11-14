import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CharacterInkPartFinish } from "../../registry/character/character-presenter-react";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";
import { InkWashScene } from "../../registry/video/ink-wash-story-react";
import type { InkShot } from "../../registry/video/ink-wash-story";
import { InkCharacter } from "../../registry/video/ink-wash-character-react";
import { inkActorAt } from "../../registry/video/ink-wash-character";
import type { InkActorTrack } from "../../registry/video/ink-wash-character";
import { inkExampleSpec } from "./ink-wash-demo";
import { INK_TRAVELLER, TRAVELLER_CUES, TRAVELLER_INSTANCE, TRAVELLER_TRACK } from "./ink-wash-performer";

/** Wet-on-paper cloth, dry hair and crisp face are independently art-directed. */
const PAPER_FINISH: Readonly<Record<string, CharacterInkPartFinish>> = {
  "body":{bleed:1}, "far-sleeve":{bleed:.94}, "near-sleeve":{bleed:.90},
  "collar":{bleed:.48}, "sash":{bleed:.35},
  "head":{bleed:.19,dryContour:true}, "hair":{bleed:.05,dryContour:true},
  "eyes":{bleed:0,dryContour:true}, "brows":{bleed:0,dryContour:true},
  "pupil-left":{bleed:0,dryContour:true}, "pupil-right":{bleed:0,dryContour:true},
  "mouth":{bleed:0,dryContour:true}, "beard":{bleed:.16,dryContour:true},
  "brush":{bleed:0,dryContour:true},
};
const TOTAL=330, FPS=30;
const SHOT:InkShot={
  id:"the-traveller",label:"A painted scholar walks through bamboo, observes and speaks",
  durationFrames:TOTAL,layers:[
    {id:"scholar",reveal:"bloom",origin:[.24,.72],startFrame:4,
      durationFrames:58,seed:37,parallax:.95,treatment:"original"},
  ],
  camera:{keyframes:[{frame:0,x:0,y:0,zoom:1},{frame:155,x:-8,y:-4,zoom:1.04},
    {frame:329,x:-5,y:0,zoom:1.02}]},
};
type Aspect="landscape"|"portrait";
const formats={landscape:{width:960,height:540},portrait:{width:540,height:960}} as const;
export function placeActor(aspect:Aspect):InkActorTrack {
  if(aspect==="landscape")return TRAVELLER_TRACK;
  return {...TRAVELLER_TRACK,keys:TRAVELLER_TRACK.keys.map(k=>({
    ...k,x:Math.max(160,k.x*540/960-20),y:k.y*960/540,scale:k.scale*.98,
  }))};
}
function Captions({frame,aspect}:{frame:number;aspect:Aspect}) {
  const portrait=aspect==="portrait";
  const title=frame<142?"A traveller in the bamboo":frame<255?"Small gestures, living ink":"The ink remembers";
  const subtitle=frame<142?"An arrival in four quiet steps.":frame<255?
    "A look, a greeting, and a voice.":"A single bow completes the scene.";
  return <div data-km-ink-actor-caption="" style={{position:"absolute",inset:0,pointerEvents:"none"}}>
    <div style={{position:"absolute",top:portrait?42:27,left:portrait?37:57,
      maxWidth:portrait?440:760}}>
      <div style={{font:"600 10px/1.4 system-ui",letterSpacing:3.8,
        color:"#A04D3C",marginBottom:12}}>KUMIKI  ·  INK PERFORMANCE  /  03</div>
      <div style={{font:"500 "+(portrait?38:42)+"px/1.1 Georgia,serif",
        letterSpacing:-1.3,color:"#262C28",maxWidth:700}}>{title}</div>
      <div style={{font:"15px/1.6 system-ui",color:"#566157",paddingTop:9}}>{subtitle}</div>
    </div>
    <div style={{position:"absolute",bottom:portrait?45:30,
      left:portrait?38:57,right:portrait?38:57,borderTop:"1px solid #ADAFA3",
      display:"flex",justifyContent:"space-between",paddingTop:8,
      font:"600 10px/1.4 system-ui",letterSpacing:1.7,color:"#757567"}}>
      <span>BRUSH · BREATH · BODY</span><span>INK / ACTOR 01</span>
    </div>
  </div>;
}
/** Same absolute frame, rig, audio cues and native per-part pigment for preview and production. */
export function InkPerformanceFilm({frame,aspect="landscape",mineral=false,reducedMotion=false}:{
  frame:number;aspect?:Aspect;mineral?:boolean;reducedMotion?:boolean;
}) {
  // Keep animated actors readable: bamboo stalks frame the performer rather than
  // crossing eyes, gestures or mouth. A separately composed portrait has more air.
  const spec=useMemo(()=>{
    const original=inkExampleSpec("bamboo",aspect,77);
    const culms=aspect==="portrait"?new Set([0,4]):new Set([0,1,4]);
    const sprays=aspect==="portrait"?new Set([0,7,8]):new Set([0,1,2,5,7,8]);
    return {...original,strokes:original.strokes.filter(stroke=>{
      const culm=stroke.id.match(/^(?:culm|node)-(\d+)(?:-|$)/);
      if(culm)return culms.has(Number(culm[1]));
      const spray=stroke.id.match(/^(?:twig|leaf)-(\d+)(?:-|$)/);
      if(spray)return sprays.has(Number(spray[1]));
      return true;
    })};
  },[aspect]);
  const actorTrack=useMemo(()=>placeActor(aspect),[aspect]);
  const placement=inkActorAt(actorTrack,frame,reducedMotion);
  const performer=useMemo(()=>({...TRAVELLER_INSTANCE,
    skin:mineral?"mineral":undefined,
  }),[mineral]);
  const width=formats[aspect].width,height=formats[aspect].height;
  return <InkWashScene spec={spec} shot={SHOT} frame={frame} label="Scholar performing amid an ink bamboo grove"
    reducedMotion={reducedMotion} paintOrder="under"
    renderLayer={layer=>layer.id==="scholar"?<div style={{width,height,position:"relative"}}>
      {/* Paper-space ground contact stays with the character as its stance changes. */}
      <svg width={width} height={height} aria-hidden="true" data-km-ink-ground-contact=""
        style={{position:"absolute",inset:0,pointerEvents:"none"}}>
        <ellipse cx={placement.x} cy={placement.y-1} rx={37*placement.scale} ry={3.2*placement.scale}
          fill="#303b34" opacity=".18" />
        <path d={`M${placement.x-46*placement.scale} ${placement.y+1}
          Q${placement.x} ${placement.y-3} ${placement.x+46*placement.scale} ${placement.y+1}`}
          stroke="#26362d" strokeWidth=".65" opacity=".3" fill="none"/>
      </svg>
      <InkCharacter definition={INK_TRAVELLER} instance={performer} cues={TRAVELLER_CUES}
        frame={frame} track={actorTrack} reducedMotion={reducedMotion}
        absorption={spec.absorption} grain={spec.grain} partFinish={PAPER_FINISH}
        label="A robed traveller holding a bamboo brush walks, greets and bows"/>
    </div>:null}>
    <Captions frame={frame} aspect={aspect}/>
    {/* A small cinnabar seal is original art, not a reused historic emblem. */}
    <svg width={width} height={height} aria-hidden="true"
      style={{position:"absolute",inset:0,pointerEvents:"none"}}>
      <g transform={"translate("+(aspect==="portrait"?454:856)+" "+(aspect==="portrait"?237:166)+")"}
        fill="none" stroke="#9C4637" strokeWidth="1.7" opacity=".65">
        <path d="M2 0 L24 1 L23 26 L1 26 Z M7 7 L7 20 M7 13 L18 13 M17 8 L17 19"/>
      </g>
    </svg>
  </InkWashScene>;
}
function Studio(){
  const [frame,setFrame]=useState(0),[playing,setPlaying]=useState(false);
  const [aspect,setAspect]=useState<Aspect>("landscape");
  const [mineral,setMineral]=useState(false),[reduce,setReduce]=useState(false);
  useEffect(()=>{
    if(!playing)return;
    const initial=frame,start=performance.now();
    let request=0;
    const tick=(now:number)=>{
      const next=Math.min(TOTAL-1,initial+Math.floor((now-start)*FPS/1000));
      setFrame(next);
      if(next<TOTAL-1)request=requestAnimationFrame(tick);else setPlaying(false);
    };
    request=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(request);
    // Playback captures its starting frame; scrubbing pauses playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  const dim=formats[aspect],factor=aspect==="portrait"?.57:.81;
  const button={border:"1px solid #999E92",borderRadius:5,padding:"10px 14px",
    minHeight:43,background:"#FCFAF3",color:"#323A35",font:"600 14px system-ui",
    cursor:"pointer"} as const;
  return <main style={{padding:23,background:"#E4E4DD",color:"#29312C",
    font:"15px/1.5 system-ui",minHeight:"100vh",display:"grid",gap:14,justifyItems:"start"}}>
    <h1 style={{font:"500 30px/1.1 Georgia,serif",margin:0}}>Ink-wash character studio</h1>
    <p style={{margin:0,maxWidth:780}}>An approved 19-part ink-painted puppet:
      walking, blink, gaze, speech visemes, facial expressions, breathing, robe/hand secondary motion,
      greeting and bowing. All poses are directly seekable.</p>
    <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
      <label>Output <select aria-label="Ink actor output" value={aspect}
        onChange={e=>setAspect(e.target.value as Aspect)}
        style={{display:"block",padding:8}}>
        <option value="landscape">16:9 film</option><option value="portrait">9:16 film</option></select></label>
      <label style={{alignSelf:"end"}}><input type="checkbox" checked={mineral}
        onChange={e=>setMineral(e.target.checked)}/> Mineral tint</label>
      <label style={{alignSelf:"end"}}><input type="checkbox" checked={reduce}
        onChange={e=>setReduce(e.target.checked)}/> Reduced motion</label>
    </div>
    <div data-testid="ink-actor-stage" style={{width:dim.width*factor,height:dim.height*factor,
      overflow:"hidden",background:"#F4F0E5",boxShadow:"0 15px 43px #19231D20"}}>
      <div style={{width:dim.width,height:dim.height,
        transform:"scale("+factor+")",transformOrigin:"0 0"}}>
        <InkPerformanceFilm frame={frame} aspect={aspect} mineral={mineral} reducedMotion={reduce}/>
      </div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",width:"100%",maxWidth:780}}>
      <button style={{...button,background:"#324037",color:"#fff"}}
        onClick={()=>{if(frame===TOTAL-1)setFrame(0);setPlaying(v=>!v);}}>
        {playing?"Pause":"Play performance"}</button>
      <label style={{flex:1,minWidth:250}}>Frame {frame} / {TOTAL-1}
        <input aria-label="Ink actor frame" style={{width:"100%"}} type="range"
          min={0} max={TOTAL-1} value={frame}
          onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
      </label>
    </div>
    <nav aria-label="Character performance beats" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {([["Walk",71],["Look",124],["Greet & speak",185],["Bow",289],["Final hold",325]] as const)
        .map(([name,at])=><button key={name} style={button} onClick={()=>{setPlaying(false);setFrame(at);}}>
          {name}</button>)}
    </nav>
  </main>;
}
function Export({aspect}:{aspect:Aspect}){
  const [frame,setFrame]=useState(0);
  const d=formats[aspect];
  const manifest:VideoExportManifest={schemaVersion:1,
    id:"chinese-ink-actor-"+aspect,width:d.width,height:d.height,
    durationFrames:TOTAL,fps:{num:FPS,den:1}};
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <InkPerformanceFilm aspect={aspect} frame={frame}/>
  </VideoExportStage>;
}
const meta={title:"Video production/Chinese Ink Character",
  id:"video-ink-character",component:Studio,parameters:{layout:"fullscreen"}} satisfies Meta<typeof Studio>;
export default meta;
export const Interactive:StoryObj<typeof meta>={
  name:"Scholar · walk, gaze, expression, speech, bow",
};
export const ProductionExport:StoryObj<typeof Export>={
  name:"Ink character · 16:9 MP4",render:()=> <Export aspect="landscape"/>,
};
export const PortraitExport:StoryObj<typeof Export>={
  name:"Ink character · 9:16 MP4",render:()=> <Export aspect="portrait"/>,
};
