import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CrayonStorybook } from "../../registry/video/materials/crayon-react";
import type { CrayonAspect, CrayonStory } from "../../registry/video/materials/crayon-react";

interface PlayerProps {
  story: CrayonStory;
  aspect: CrayonAspect;
  seed: number;
  pressure: number;
  paperTooth: number;
  reducedMotion: boolean;
  startFrame: number;
}
/** Player clocks live only here. The library renderer always evaluates a pinned absolute frame. */
function CrayonPlayer({story,aspect,seed,pressure,paperTooth,reducedMotion,startFrame}:PlayerProps) {
  const [frame,setFrame] = useState(startFrame);
  const [playing,setPlaying] = useState(false);
  useEffect(()=>{setFrame(startFrame);setPlaying(false);},[startFrame]);
  useEffect(()=>{
    if(!playing) return;
    const timer = window.setInterval(()=>setFrame(old=>{
      if(old >= 419) {setPlaying(false);return 419;}
      return old+1;
    }),1000/30);
    return ()=>window.clearInterval(timer);
  },[playing]);
  const chapters = [
    {name:"1 · Paper & sky",frame:25},
    {name:"2 · Scene emerges",frame:156},
    {name:"3 · Wax drawing",frame:270},
    {name:"4 · Final page",frame:419},
  ];
  return <div style={{background:"#e8e1d4",padding:20,fontFamily:"system-ui, sans-serif",color:"#273550",maxWidth:1020}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:15,flexWrap:"wrap",marginBottom:15}}>
      <div>
        <div style={{fontSize:12,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:"#6c7484"}}>Film Art Styles / Crayon Storybook</div>
        <div style={{fontSize:23,fontFamily:"Georgia, serif",fontWeight:700}}>{story==="lantern" ? "The Lantern Trail" : "One Little Seed"}</div>
      </div>
      <div style={{fontSize:13,color:"#526479"}}>30 fps · 14 sec · SVG-native wax deposition · no external assets</div>
    </div>
    <div style={{maxWidth:aspect==="portrait"?440:960,width:"100%",aspectRatio:aspect==="portrait"?"540 / 960":"960 / 540",margin:"auto",background:"#faf1da",boxShadow:"0 10px 34px #28344d2b",border:"11px solid #faf1da",boxSizing:"border-box"}}>
      <CrayonStorybook story={story} aspect={aspect} seed={seed} frame={frame} pressure={pressure}
        paperTooth={paperTooth} reducedMotion={reducedMotion} />
    </div>
    <div style={{display:"flex",gap:10,alignItems:"center",marginTop:18,flexWrap:"wrap"}}>
      <button type="button" onClick={()=>{if(frame>=419)setFrame(0);setPlaying(p=>!p);}}
        aria-label={playing?"Pause animation":"Play animation"} style={{font:"600 15px system-ui",padding:"10px 20px",borderRadius:10,border:"none",background:"#33475e",color:"white",cursor:"pointer"}}>
        {playing?"Pause":"Play film"}
      </button>
      <button type="button" onClick={()=>{setPlaying(false);setFrame(0);}} style={{font:"600 14px system-ui",padding:"10px 15px",borderRadius:10,border:"1px solid #b2ac9d",background:"#fff9ed",cursor:"pointer"}}>
        Restart
      </button>
      <label style={{flex:"1 1 245px",display:"flex",alignItems:"center",gap:10,fontSize:14}}>
        Frame
        <input type="range" aria-label="Film frame" min="0" max="419" value={frame}
          onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}} style={{width:"100%",accentColor:"#ae6d61"}}/>
        <output style={{minWidth:36,fontVariantNumeric:"tabular-nums"}}>{frame}</output>
      </label>
    </div>
    <nav aria-label="Film chapters" style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
      {chapters.map(chapter=><button key={chapter.frame} type="button" onClick={()=>{setPlaying(false);setFrame(chapter.frame);}}
        style={{border:"1px solid #c8c0af",borderRadius:30,padding:"8px 12px",background:frame===chapter.frame?"#33475e":"#faf5e8",
          color:frame===chapter.frame?"white":"#33475e",font:"13px system-ui",cursor:"pointer"}}>{chapter.name}</button>)}
    </nav>
    <div style={{fontSize:12,lineHeight:1.5,color:"#6b706f",marginTop:15}}>
      Artist controls live in the Storybook Controls panel. Scrub backward and forward: each mark and paper pore is frame-stable. Full-motion acceptance still requires an encoded-film review.
    </div>
  </div>;
}
const meta = {
  title:"Video production/Film Art Styles/Crayon Storybook",
  id:"video-crayon-storybook",
  component:CrayonPlayer,
  args:{story:"lantern",aspect:"landscape",seed:23,pressure:.87,paperTooth:.58,reducedMotion:false,startFrame:320},
  argTypes:{
    story:{control:"inline-radio",options:["lantern","garden"]},
    aspect:{control:"inline-radio",options:["landscape","portrait"]},
    seed:{control:{type:"number",min:0,max:10000,step:1}},
    pressure:{control:{type:"range",min:0,max:1,step:.05}},
    paperTooth:{control:{type:"range",min:0,max:1,step:.05}},
    reducedMotion:{control:"boolean"},
    startFrame:{control:{type:"range",min:0,max:419,step:1}},
  },
} satisfies Meta<typeof CrayonPlayer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const LanternTrail:Story = {};
export const LanternPortrait:Story = {args:{aspect:"portrait",startFrame:419}};
export const OneLittleSeed:Story = {args:{story:"garden",startFrame:419}};
export const GardenPortrait:Story = {args:{story:"garden",aspect:"portrait",startFrame:419}};
