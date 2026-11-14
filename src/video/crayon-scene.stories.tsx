import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CrayonScene } from "../../registry/video/materials/crayon-scene-react";
import { crayonDemoScene } from "./crayon-scene-fixtures";
import type { CrayonDemoAspect, CrayonDemoSubject } from "./crayon-scene-fixtures";

interface PlaygroundProps {
  subject:CrayonDemoSubject; aspect:CrayonDemoAspect; seed:number; paperTooth:number;
  reducedMotion:boolean; startFrame:number;
}
function CrayonPlayground({subject,aspect,seed,paperTooth,reducedMotion,startFrame}:PlaygroundProps){
  const [frame,setFrame]=useState(startFrame),[playing,setPlaying]=useState(false);
  const spec=useMemo(()=>({...crayonDemoScene(subject,aspect),seed,paperTooth}),[subject,aspect,seed,paperTooth]);
  useEffect(()=>{setPlaying(false);setFrame(startFrame)},[subject,aspect,startFrame]);
  useEffect(()=>{
    if(!playing)return;
    const timer=window.setInterval(()=>setFrame(previous=>Math.min(spec.durationFrames-1,previous+1)),1000/30);
    return ()=>window.clearInterval(timer);
  },[playing,spec.durationFrames]);
  useEffect(()=>{if(playing&&frame>=spec.durationFrames-1)setPlaying(false)},[playing,frame,spec.durationFrames]);
  return <div style={{maxWidth:1050,margin:"auto",padding:22,background:"#e9e3d5",color:"#344e60",fontFamily:"system-ui"}}>
    <div style={{display:"flex",gap:12,justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",marginBottom:12}}>
      <div><div style={{fontSize:12,letterSpacing:2.8,fontWeight:700,textTransform:"uppercase"}}>Crayon scene engine · JSON-native</div>
        <div style={{font:"700 28px Georgia,serif",marginTop:8}}>{subject==="water-cycle"?"Where Rain Begins":subject==="city"?"Our Little Town":"How Things Grow"}</div></div>
      <div style={{fontSize:13,color:"#586b72"}}>Story-independent drawing · 30 fps · 8 seconds</div>
    </div>
    <div style={{width:aspect==="portrait"?"min(100%,440px)":"100%",aspectRatio:aspect==="portrait"?"540/960":"960/540",
      margin:"0 auto",border:"10px solid #fff7e8",background:"#fff7e8",boxSizing:"border-box",boxShadow:"0 12px 28px #3e4d5c26"}}>
      <CrayonScene frame={frame} spec={spec} reducedMotion={reducedMotion}/>
    </div>
    <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:10,marginTop:20}}>
      <button type="button" aria-label={playing?"Pause animation":"Play animation"} onClick={()=>{if(frame>=239)setFrame(0);setPlaying(v=>!v)}}
        style={{cursor:"pointer",background:"#3c5872",border:0,color:"#fff",padding:"12px 21px",borderRadius:8,fontWeight:700}}>{playing?"Pause":"Play film"}</button>
      <button type="button" onClick={()=>{setPlaying(false);setFrame(0)}} style={{cursor:"pointer",
        background:"#fff9ef",padding:"12px 17px",border:"1px solid #bdb3a4",borderRadius:8}}>Restart</button>
      <label style={{display:"flex",flex:"1 1 200px",alignItems:"center",gap:10}}>
        Frame <input type="range" aria-label="Film frame" style={{width:"100%",accentColor:"#b86e59"}}
          min={0} max={239} value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value))}}/>
        <output style={{fontVariantNumeric:"tabular-nums",minWidth:35}}>{frame}</output>
      </label>
    </div>
    <nav aria-label="Drawing beats" style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:14}}>
      {[[0,"Blank paper"],[72,"First wax"],[145,"Illustration builds"],[239,"Finished page"]].map(([at,label])=>
        <button key={at} onClick={()=>{setPlaying(false);setFrame(Number(at))}} type="button"
          style={{cursor:"pointer",padding:"8px 13px",background:"#fff9ef",border:"1px solid #c1b9a9",borderRadius:24}}>
          {label}</button>)}
    </nav>
    <p style={{fontSize:13,color:"#5f6f75",lineHeight:1.5,marginBottom:0,marginTop:15}}>
      Three different subjects share one source-distributed renderer. Change subject, seed, paper tooth, aspect, and reduced motion in Controls.
      Original subjects, paths, captions, timing, and camera are supplied as data in <code>crayon-scene-fixtures.ts</code>.
    </p>
  </div>;
}
const meta={
  title:"Video production/Film Art Styles/Crayon Scene Engine",
  id:"video-crayon-scene-engine",
  component:CrayonPlayground,
  args:{subject:"water-cycle",aspect:"landscape",seed:54,paperTooth:.64,reducedMotion:false,startFrame:239},
  argTypes:{
    subject:{control:"inline-radio",options:["water-cycle","city","numbers"]},
    aspect:{control:"inline-radio",options:["landscape","portrait"]},
    seed:{control:{type:"number",min:0,max:10000,step:1}},
    paperTooth:{control:{type:"range",min:0,max:1,step:.05}},
    reducedMotion:{control:"boolean"},
    startFrame:{control:{type:"range",min:0,max:239,step:1}},
  }
} satisfies Meta<typeof CrayonPlayground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const WaterCycle:Story={};
export const WaterCyclePortrait:Story={args:{aspect:"portrait",startFrame:239}};
export const StorybookTown:Story={args:{subject:"city",startFrame:239}};
export const IllustratedData:Story={args:{subject:"numbers",startFrame:239}};
