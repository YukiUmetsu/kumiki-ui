import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InkWashScene } from "../../registry/video/ink-wash-story-react";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import type { VideoExportManifest } from "../../registry/video/video-export-stage";
import type { InkShot } from "../../registry/video/ink-wash-story";
import { InkEnsemble } from "../../registry/video/ink-wash-ensemble-react";
import { inkEnsembleAt, auditInkEnsembleHands } from "../../registry/video/ink-wash-ensemble";
import { inkEnsembleBackdrop } from "./ink-wash-ensemble-backdrop";
import { inkDuet } from "./ink-wash-ensemble-demo";
import type { InkDuetAspect } from "./ink-wash-ensemble-demo";

const LENGTH = 330;
const button = { border:"1px solid #B6B4A8",borderRadius:4,minHeight:40,
  padding:"9px 13px",font:"600 13px system-ui",background:"#FEFCF5",color:"#303830",cursor:"pointer" } as const;
const shot: InkShot = { id:"a-shared-scroll",label:"A teacher and apprentice meet across a painted landscape",
  durationFrames:LENGTH,layers:[
    { id:"duet",reveal:"bloom",origin:[.5,.68],startFrame:3,durationFrames:55,
      seed:33,treatment:"original",parallax:1 },
  ],camera:{keyframes:[
    {frame:0,x:0,y:0,zoom:1},
    {frame:155,x:0,y:-3,zoom:1.025},
    {frame:329,x:0,y:0,zoom:1},
  ]},
};
/** One original piece of acting, built from existing INK2/INK3 rigging and painting.
 * It is an artistic staging example, not a claim of physically correct hand-to-hand contact.
 */
export function InkEnsembleFilm({frame,aspect="landscape",reducedMotion=false,
  absorption=.72,grain=.65,showGrounding=false}:{
  frame:number;aspect?:InkDuetAspect;reducedMotion?:boolean;absorption?:number;
  grain?:number;showGrounding?:boolean;
}) {
  const duet=useMemo(()=>inkDuet(aspect),[aspect]);
  const spec=useMemo(()=>inkEnsembleBackdrop(aspect,absorption,grain),[aspect,absorption,grain]);
  const state=inkEnsembleAt(duet.plan,frame,reducedMotion);
  const handAudit=showGrounding ? auditInkEnsembleHands(
    duet.plan,duet.cast,frame,reducedMotion) : [];
  const handReview=handAudit[0];
  const portrait=aspect==="portrait";
  const headline=frame<95?"An unexpected encounter":frame<260?
    "A quiet exchange":"The parting bow";
  const subtitle=frame<95?"A path through bamboo":frame<260?
    "Two figures, one shared world":"Silence is part of the performance";
  return <InkWashScene spec={spec} frame={frame} shot={shot}
    reducedMotion={reducedMotion}
    label="An original ink-wash story with two articulated performers, bamboo, musicless dialogue and bow"
    renderLayer={layer=>layer.id==="duet"?<InkEnsemble {...duet} frame={frame}
      reducedMotion={reducedMotion} absorption={absorption} grain={grain}
      showGrounding={showGrounding}/>:null}>
    <div style={{ position:"absolute",left:portrait?38:58,top:portrait?53:30,
      maxWidth:portrait?460:700,display:"grid",gap:9,color:"#27302B" }}>
      <span style={{letterSpacing:2.5,font:"700 10px system-ui",color:"#9A4C39"}}>
        PAINTED ENCOUNTERS / 04
      </span>
      <span style={{font:"500 "+(portrait?36:42)+"px/1.09 Georgia,serif",
        letterSpacing:-1.2}}>{headline}</span>
      <span style={{font:"14px/1.5 system-ui",color:"#606B5C"}}>{subtitle}</span>
    </div>
    <div style={{position:"absolute",bottom:portrait?54:30,left:portrait?36:58,
      font:"600 11px system-ui",letterSpacing:1.3,color:"#677265"}}>
      TWO PERFORMERS · ONE ABSOLUTE FRAME
    </div>
    {showGrounding && <div style={{position:"absolute",bottom:portrait?82:52,left:portrait?36:58,
      background:"#fffdf4",padding:"6px 9px",font:"12px system-ui",color:"#2B4936"}}>
      {state.contacts.length ? (
        !state.contacts.every(c=>c.withinReach && !c.intersectingFeet)
          ? "Actor spacing failed; fix blocking before handoff"
          : handReview?.missingAnchor
            ? "Hand anchor missing; contact cannot be verified"
            : handReview?.handContact
              ? "Posed hands meet within "+handReview.maxHandGap+" px (review silhouette)"
              : "Root reach is approximate; hand gap "+
                (handReview?.handGap?.toFixed(1) ?? "?")+" px"
      ) : "No handoff audit active"}
    </div>}
  </InkWashScene>;
}
function Studio(){
  const [frame,setFrame]=useState(0),[playing,setPlaying]=useState(false);
  const [aspect,setAspect]=useState<InkDuetAspect>("landscape");
  const [reduced,setReduced]=useState(false);
  const [absorption,setAbsorption]=useState(.72);
  const [grain,setGrain]=useState(.65);
  const [ground,setGround]=useState(false);
  useEffect(()=>{
    if(!playing)return;
    const origin=frame,start=performance.now();
    let raf=0;
    const tick=(now:number)=>{
      const next=Math.min(LENGTH-1,origin+Math.floor((now-start)*.03));
      setFrame(next);
      if(next<LENGTH-1)raf=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
    // Playback samples the absolute film timeline without per-actor clocks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  const dims=aspect==="portrait"?{w:540,h:960,f:.58}:{w:960,h:540,f:.85};
  return <main style={{padding:24,display:"grid",gap:15,justifyItems:"start",
    background:"#E6E5DD",minHeight:"100vh",color:"#28352F",font:"15px/1.5 system-ui"}}>
    <header style={{maxWidth:820}}>
      <div style={{font:"700 11px system-ui",letterSpacing:2.5,color:"#9A4B39"}}>
        VIDEO PRODUCTION / INK-WASH CHARACTER ACTING
      </div>
      <h1 style={{font:"500 32px Georgia,serif",margin:"7px 0"}}>
        Chinese Ink · Two-Character Performance
      </h1>
      <p style={{margin:0}}>Two independent approved 2.5D character instances share a painted
        bamboo scene. Their separate walking, attention, facial expression, voice shapes,
        gesture and bows respond to one absolute frame; footage and paints remain independent.
        Reach auditing is explicit rather than claiming automatically perfect contacts.</p>
    </header>
    <div style={{display:"flex",gap:15,flexWrap:"wrap",alignItems:"end"}}>
      <label>Format <select aria-label="Ink ensemble output" value={aspect}
        onChange={e=>{setPlaying(false);setAspect(e.target.value as InkDuetAspect);}}
        style={{display:"block",minHeight:39}}>
        <option value="landscape">16:9</option><option value="portrait">9:16</option>
      </select></label>
      <label>Paper absorption · {Math.round(absorption*100)}%
        <input aria-label="Ink ensemble absorption" type="range" min="0" max="1" step=".05" value={absorption}
          onChange={e=>setAbsorption(Number(e.target.value))} style={{display:"block"}}/>
      </label>
      <label>Paper grain · {Math.round(grain*100)}%
        <input aria-label="Ink ensemble grain" type="range" min="0" max="1" step=".05" value={grain}
          onChange={e=>setGrain(Number(e.target.value))} style={{display:"block"}}/>
      </label>
      <label><input type="checkbox" checked={ground}
        onChange={e=>setGround(e.target.checked)}/> Show reach audit</label>
      <label><input type="checkbox" checked={reduced}
        onChange={e=>setReduced(e.target.checked)}/> Reduced motion</label>
    </div>
    <div data-testid="ink-ensemble-stage" style={{width:dims.w*dims.f,height:dims.h*dims.f,
      background:"#F3EEE2",overflow:"hidden",boxShadow:"0 13px 37px #323D302A"}}>
      <div style={{width:dims.w,height:dims.h,transform:"scale("+dims.f+")",transformOrigin:"0 0"}}>
        <InkEnsembleFilm frame={frame} aspect={aspect} absorption={absorption}
          grain={grain} reducedMotion={reduced} showGrounding={ground}/>
      </div>
    </div>
    <div style={{display:"flex",gap:12,width:"100%",maxWidth:820,alignItems:"center"}}>
      <button type="button" style={button} onClick={()=>{
        if(frame>=LENGTH-1)setFrame(0);
        setPlaying(v=>!v);
      }}>{playing?"Pause":"Play duet"}</button>
      <label style={{flex:1}}>Film frame {frame} / {LENGTH-1}
        <input aria-label="Ink ensemble frame" type="range" min="0" max={LENGTH-1}
          value={frame} style={{display:"block",width:"100%"}}
          onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
      </label>
    </div>
    <nav aria-label="Ink performance beats" style={{display:"flex",gap:9,flexWrap:"wrap"}}>
      {([["Arrival",37],["First look",117],["Exchange",188],
        ["Reply",238],["Bow",298]] as const).map(([title,at])=>
        <button key={title} style={button} onClick={()=>{setPlaying(false);setFrame(at);}}>
          {title}</button>)}
    </nav>
  </main>;
}
const meta={title:"Video production/Film Looks",id:"video-ink-ensemble",
  component:Studio,parameters:{layout:"fullscreen"}} satisfies Meta<typeof Studio>;
export default meta;
export const InkEnsembleStory:StoryObj<typeof meta>={
  name:"Chinese Ink · Ensemble Character Acting",
};


/** Same source scene and timing as the interactive preview: no substitute render pipeline. */
function Export({aspect}:{aspect:InkDuetAspect}){
  const [frame,setFrame]=useState(0);
  const width=aspect==="portrait"?540:960,height=aspect==="portrait"?960:540;
  const manifest:VideoExportManifest={
    schemaVersion:1,id:"ink-ensemble-"+aspect,width,height,
    fps:{num:30,den:1},durationFrames:LENGTH,
  };
  return <VideoExportStage manifest={manifest} frame={frame} onSeek={setFrame}>
    <InkEnsembleFilm aspect={aspect} frame={frame}/>
  </VideoExportStage>;
}
export const EnsembleExport:StoryObj<typeof Export>={
  name:"Chinese Ink Ensemble · 16:9 MP4",
  render:()=> <Export aspect="landscape"/>,
};
export const EnsemblePortraitExport:StoryObj<typeof Export>={
  name:"Chinese Ink Ensemble · 9:16 MP4",
  render:()=> <Export aspect="portrait"/>,
};
