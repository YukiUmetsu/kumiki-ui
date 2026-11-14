import { useEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PaperCraftStage } from "../../registry/video/paper-craft-react";
import type { PaperStyle } from "../../registry/video/paper-craft";
import { paperCraftExampleSpec } from "./paper-craft-demo";
import type { PaperAspect } from "./paper-craft-demo";

type Controls = {
  medium: PaperStyle;
  aspect: PaperAspect;
  frame: number;
  tooth: number;
  shadow: number;
  reducedMotion: boolean;
};
const labels: Record<PaperStyle, string> = {
  layered: "01 · Layered collage",
  kirigami: "02 · Kirigami fold",
  "pop-up": "03 · Pop-up stage",
  lightbox: "04 · Backlit lightbox",
  "shadow-puppet": "05 · Shadow puppetry",
};
function PaperCraftLab({ medium, aspect, frame, tooth, shadow, reducedMotion }: Controls) {
  const [liveFrame, setLiveFrame] = useState(frame), [playing, setPlaying] = useState(false);
  const anchor = useRef<{ time: number; frame: number } | null>(null);
  useEffect(() => { setLiveFrame(frame); anchor.current = null; }, [frame, medium, aspect]);
  useEffect(() => {
    if (!playing || reducedMotion) return;
    let raf = 0;
    const tick = (now: number) => {
      if (!anchor.current) anchor.current = { time: now, frame: liveFrame };
      const elapsed = Math.floor((now - anchor.current.time) * 30 / 1000);
      setLiveFrame((anchor.current.frame + elapsed) % 240);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, medium, aspect, reducedMotion]);
  const spec = paperCraftExampleSpec(medium, aspect);
  const current = reducedMotion ? spec.durationFrames : liveFrame;
  const text: React.CSSProperties = { fontFamily: "'Newsreader',Georgia,serif", color: "#f3eddf" };
  const small: React.CSSProperties = { font: "11px/1.5 Arial,sans-serif", letterSpacing: "2px", textTransform: "uppercase", color: "#bfb6a8" };
  const button: React.CSSProperties = { background: "#ead4ab", border: "1px solid #ead4ab", borderRadius: 3,
    color: "#2d292a", padding: "9px 20px", fontWeight: 700, cursor: "pointer" };
  return <main style={{ minHeight: "100vh", padding: "28px clamp(18px,4vw,70px) 40px",
    background: "radial-gradient(circle at 70% 5%,#2a3034,#17191e 65%)", color:"#f3eddf" }}>
    <div style={{ maxWidth: 1170, margin:"auto" }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <p style={small}>KUMIKI / MATERIAL NATIVE / STUDY 06</p>
        <p style={small}>CUT · FOLD · LIGHT · PERFORM</p>
      </div>
      <h1 style={{...text, fontSize:"clamp(32px,4.7vw,62px)", fontWeight:400, lineHeight:1.09, margin:"16px 0 7px"}}>
        The garden, made of paper.
      </h1>
      <p style={{font:"14px/1.65 Arial,sans-serif",maxWidth:650,color:"#bbb7ae",marginBottom:24}}>
        One illustrated world, five physical paper techniques. Separate cut cards, open apertures,
        anchored fibres, hinged motion and transmitted light. Scrub every frame.
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(245px,1fr))",gap:"clamp(20px,3vw,46px)",alignItems:"start"}}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div role="group" aria-label="Paper material" style={{display:"grid",gap:8}}>
            {(Object.keys(labels) as PaperStyle[]).map(s=><button key={s} onClick={()=>{ setPlaying(false); setLiveFrame(182); }}
              aria-pressed={medium === s} disabled={medium === s}
              style={{textAlign:"left",padding:"14px 16px",font:"14px Arial,sans-serif",
                border:"1px solid " + (medium===s?"#e8cfab":"#494443"),
                borderRadius:3,background:medium===s?"#39363a":"#24252a",color:"#f5e9d5",
                opacity:medium===s?1:.75,cursor:medium===s?"default":"pointer"}}
              data-paper-medium-link={s}>{labels[s]} {medium === s ? "•" : ""}</button>)}
          </div>
          <div style={{borderTop:"1px solid #534e4a",paddingTop:16,display:"grid",gap:13}}>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button type="button" style={button} onClick={()=>{ anchor.current=null; setPlaying(x=>!x); }} disabled={reducedMotion}>
                {playing ? "Pause motion" : "Play 8s film"}
              </button>
              <button type="button" style={{...button,background:"transparent",color:"#f0ddba"}}
                onClick={()=>{setPlaying(false);setLiveFrame(0); anchor.current=null;}}>Restart</button>
            </div>
            <label style={small}>Frame {current} / 240
              <input type="range" min={0} max={239} step={1} value={Math.min(current,239)}
                onChange={e=>{setPlaying(false);setLiveFrame(Number(e.currentTarget.value)); anchor.current=null;}}
                aria-label="Scrub film frame" style={{display:"block",width:"100%",marginTop:10,accentColor:"#edd2ab"}} />
            </label>
            <p style={{font:"12px/1.7 Arial,sans-serif",color:"#bcb5ac"}}>
              Paper aperture is real transparency; spot shadows grow with depth. Moving sheets
              retain their own tooth. Reduced motion resolves to the final assembled composition.
            </p>
          </div>
        </div>
        <div style={{minWidth:0,display:"grid",justifyItems:"center",gap:12}}>
          <div style={{width:"100%", maxWidth:aspect==="portrait"?400:950,aspectRatio:aspect==="portrait"?"9 / 16":"16 / 9",
            border:"10px solid #353137",boxShadow:"0 22px 68px #0009",background:spec.backing}}>
            <PaperCraftStage spec={spec} frame={current} reducedMotion={reducedMotion} tooth={tooth}
              shadowStrength={shadow} label={"Paper garden, "+labels[medium]}
              data-testid="paper-craft-stage"/>
          </div>
          <p style={small}>{labels[medium].toUpperCase()} / {aspect==="portrait"?"9:16":"16:9"} / 30 FPS / FRAME-EXACT</p>
        </div>
      </div>
    </div>
  </main>;
}
const meta = {
  title: "Film Art Styles/Paper Craft Theatre",
  component: PaperCraftLab,
  args: { medium:"layered", aspect:"landscape", frame:182, tooth:.55, shadow:.7, reducedMotion:false },
  argTypes: {
    medium:{control:"select",options:["layered","kirigami","pop-up","lightbox","shadow-puppet"]},
    aspect:{control:"radio",options:["landscape","portrait"]},
    frame:{control:{type:"range",min:0,max:239,step:1}},
    tooth:{control:{type:"range",min:0,max:1,step:.05}},
    shadow:{control:{type:"range",min:0,max:1,step:.05}},
    reducedMotion:{control:"boolean"},
  },
} satisfies Meta<typeof PaperCraftLab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Gallery: Story = {};
export const Kirigami: Story = { args:{medium:"kirigami"} };
export const PopUp: Story = { args:{medium:"pop-up"} };
export const Lightbox: Story = { args:{medium:"lightbox"} };
export const ShadowPuppet: Story = { args:{medium:"shadow-puppet"} };
export const Portrait: Story = { args:{aspect:"portrait"} };
