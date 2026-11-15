import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PaperCraftStage } from "../../registry/video/paper-craft-react";
import type { PaperStyle } from "../../registry/video/paper-craft";
import { paperCraftExampleSpec } from "./paper-craft-demo";
import { paperBotanicalSpec } from "../../registry/video/paper-botanical-kit";
import { paperObjectSpec } from "../../registry/video/paper-object-kit";
import { paperScenerySpec } from "../../registry/video/paper-scenery-kit";
import type { PaperScenery, PaperSceneryPalette } from "../../registry/video/paper-scenery-kit";
import type { PaperObject, PaperObjectPalette } from "../../registry/video/paper-object-kit";
import type { PaperBotanicalPalette } from "../../registry/video/paper-botanical-kit";
import type { PaperAspect } from "./paper-craft-demo";

type Controls = {
  artwork: "garden" | "botanical" | "object" | "scenery";
  scenery: PaperScenery;
  sceneryPalette: PaperSceneryPalette;
  breeze: number;
  treeVariety: number;
  object: PaperObject;
  objectPalette: PaperObjectPalette;
  palette: PaperBotanicalPalette;
  detail: number;
  colorLayers: number;
  curl: number;
  motion: number;
  relief: number;
  medium: PaperStyle;
  aspect: PaperAspect;
  frame: number;
  tooth: number;
  shadow: number;
  edge: number;
  seed: number;
  reducedMotion: boolean;
};
const labels: Record<PaperStyle, string> = {
  layered: "01 · Layered collage",
  kirigami: "02 · Kirigami fold",
  "pop-up": "03 · Pop-up stage",
  lightbox: "04 · Backlit lightbox",
  "shadow-puppet": "05 · Shadow puppetry",
};
function PaperCraftLab({ artwork, scenery, sceneryPalette, breeze, treeVariety, object, objectPalette, palette, detail, colorLayers, curl, motion, relief, medium, aspect, frame, tooth, shadow, edge, seed, reducedMotion }: Controls) {
  const [liveFrame, setLiveFrame] = useState(frame), [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<PaperStyle>(medium);
  useEffect(() => setSelected(medium), [medium]);
  const anchor = useRef<{ time: number; frame: number } | null>(null);
  useEffect(() => { setLiveFrame(frame); anchor.current = null; }, [frame, selected, aspect, artwork, scenery, sceneryPalette, breeze, treeVariety, object, objectPalette, palette, detail, colorLayers, curl, motion, relief, seed]);
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
  }, [playing, selected, aspect, reducedMotion]);
  // A high-detail cut geometry should be constructed once per art direction,
  // not 30 times per second during Storybook playback.
  const spec = useMemo(() => artwork === "botanical"
    ? paperBotanicalSpec(selected, aspect, {palette, detail, colorLayers, seed})
    : artwork === "scenery"
      ? paperScenerySpec(selected, aspect, {scenery, palette: sceneryPalette, detail, breeze, treeVariety, relief, seed})
    : artwork === "object"
      ? paperObjectSpec(selected, aspect, {object, palette: objectPalette, detail, curl, motion, relief, seed})
      : paperCraftExampleSpec(selected, aspect, seed),
    [artwork, scenery, sceneryPalette, breeze, treeVariety, object, objectPalette, selected, aspect, palette, detail, colorLayers, curl, motion, relief, seed]);
  const current = reducedMotion ? spec.durationFrames : liveFrame;
  const text: CSSProperties = { fontFamily: "'Newsreader',Georgia,serif", color: "#f3eddf" };
  const small: CSSProperties = { font: "11px/1.5 Arial,sans-serif", letterSpacing: "2px", textTransform: "uppercase", color: "#bfb6a8" };
  const button: CSSProperties = { background: "#ead4ab", border: "1px solid #ead4ab", borderRadius: 3,
    color: "#2d292a", padding: "9px 20px", fontWeight: 700, cursor: "pointer" };
  return <main style={{ minHeight: "100vh", padding: "28px clamp(18px,4vw,70px) 40px",
    background: "radial-gradient(circle at 70% 5%,#2a3034,#17191e 65%)", color:"#f3eddf" }}>
    <div style={{ maxWidth: 1170, margin:"auto" }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <p style={small}>KUMIKI / MATERIAL NATIVE / STUDY 06</p>
        <p style={small}>CUT · FOLD · LIGHT · PERFORM</p>
      </div>
      <h1 style={{...text, fontSize:"clamp(32px,4.7vw,62px)", fontWeight:400, lineHeight:1.09, margin:"16px 0 7px"}}>
        {artwork === "botanical" ? "A butterfly in a paper garden."
          : artwork === "scenery" ? "A landscape carved in layers of light."
          : artwork === "object" ? "Objects made from layered paper." : "The garden, made of paper."}
      </h1>
      <p style={{font:"14px/1.65 Arial,sans-serif",maxWidth:650,color:"#bbb7ae",marginBottom:24}}>
        {artwork === "botanical"
          ? "Original sculptural paper garden: vibrant individually cut paper stocks, multi-level flowers, fern leaflets and luminous butterfly apertures. Change the real color-layer count and scrub every frame."
          : artwork === "scenery"
            ? "Hand-cut scenic paper theatre: botanical spruce/fir/larch, sculpted fern fronds, serrated broadleaf herbs, layered wildflowers, mountains and luminous water. Control species diversity, cut density and paper relief."
          : artwork === "object"
            ? "Five independently constructed studies — kingfisher, dragonfly, canal houses, camera and teacup. Each uses actual opaque cut shapes, layered assembly and paper apertures."
            : "One illustrated world, five physical paper techniques. Separate cut cards, open apertures, anchored fibres, hinged motion and transmitted light. Scrub every frame."}
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(245px,1fr))",gap:"clamp(20px,3vw,46px)",alignItems:"start"}}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div role="group" aria-label="Paper material" style={{display:"grid",gap:8}}>
            {(Object.keys(labels) as PaperStyle[]).map(s=><button key={s} onClick={()=>{ setSelected(s); setPlaying(false); setLiveFrame(182); }}
              aria-pressed={selected === s} disabled={selected === s}
              style={{textAlign:"left",padding:"14px 16px",font:"14px Arial,sans-serif",
                border:"1px solid " + (selected===s?"#e8cfab":"#494443"),
                borderRadius:3,background:selected===s?"#39363a":"#24252a",color:"#f5e9d5",
                opacity:selected===s?1:.75,cursor:selected===s?"default":"pointer"}}
              data-paper-medium-link={s}>{labels[s]} {selected === s ? "•" : ""}</button>)}
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
              curlStrength={1} liftStrength={1} shadowStrength={shadow} edgeStrength={edge} label={(artwork==="botanical"?"Butterfly botanical relief, ":artwork==="scenery"?"Paper scenery "+scenery+", ":artwork==="object"?"Paper sculpture "+object+", ":"Paper garden, ")+labels[selected]}
              data-testid="paper-craft-stage"/>
          </div>
          <p style={small}>{labels[selected].toUpperCase()} / {aspect==="portrait"?"9:16":"16:9"} / 30 FPS / FRAME-EXACT</p>
        </div>
      </div>
    </div>
  </main>;
}
const meta = {
  // All Paper Craft studies share one Storybook folder under Film Looks.
  title: "Video production/Film Looks/Paper Craft",
  component: PaperCraftLab,
  args: { artwork:"garden", scenery:"woodland", sceneryPalette:"sage", breeze:.5, treeVariety:.9, object:"kingfisher", objectPalette:"jewel", palette:"nocturne", detail:.82, colorLayers:1, curl:.85, motion:1, relief:1, medium:"layered", aspect:"landscape", frame:182, tooth:.55, shadow:.7, edge:.55, seed:27, reducedMotion:false },
  argTypes: {
    artwork:{control:"select",options:["garden","botanical","object","scenery"]},
    scenery:{control:"select",options:["woodland","alpine-lake"]},
    sceneryPalette:{control:"select",options:["sage","ember","moonlight"]},
    breeze:{control:{type:"range",min:0,max:1,step:.05}},
    treeVariety:{control:{type:"range",min:0,max:1,step:.05}},
    object:{control:"select",options:["kingfisher","dragonfly","canal-houses","camera","teacup"]},
    objectPalette:{control:"select",options:["jewel","pastel","heritage"]},
    palette:{control:"select",options:["nocturne","ivory","rainforest","wildflower"]},
    colorLayers:{control:{type:"range",min:0,max:1,step:.1}},
    curl:{control:{type:"range",min:0,max:1,step:.05}},
    motion:{control:{type:"range",min:0,max:1,step:.05}},
    relief:{control:{type:"range",min:0,max:1,step:.05}},
    detail:{control:{type:"range",min:0,max:1,step:.05}},
    medium:{control:"select",options:["layered","kirigami","pop-up","lightbox","shadow-puppet"]},
    aspect:{control:"radio",options:["landscape","portrait"]},
    frame:{control:{type:"range",min:0,max:239,step:1}},
    tooth:{control:{type:"range",min:0,max:1,step:.05}},
    shadow:{control:{type:"range",min:0,max:1,step:.05}},
    edge:{control:{type:"range",min:0,max:1,step:.05}},
    seed:{control:{type:"number",min:0,max:999999,step:1}},
    reducedMotion:{control:"boolean"},
  },
} satisfies Meta<typeof PaperCraftLab>;
export default meta;
type Story = StoryObj<typeof meta>;
// Each subject gets exactly one customizable page. Media, orientation,
// paper stock, detail, curl, motion, relief, frame and rendering controls
// remain available without multiplying variants in the Storybook sidebar.
const hideControl = {control:false,table:{disable:true}} as const;
const objectControls = {
  artwork:hideControl,object:hideControl,palette:hideControl,colorLayers:hideControl,
  scenery:hideControl,sceneryPalette:hideControl,breeze:hideControl,treeVariety:hideControl,
};
export const Gallery: Story = {
  name:"Garden",
  args:{artwork:"garden",medium:"layered",frame:182},
  argTypes:{artwork:hideControl,object:hideControl,objectPalette:hideControl,
    palette:hideControl,detail:hideControl,colorLayers:hideControl,
    scenery:hideControl,sceneryPalette:hideControl,breeze:hideControl,treeVariety:hideControl,
    curl:hideControl,motion:hideControl,relief:hideControl},
};
export const Botanical: Story = {
  name:"Botanical & Butterfly",
  args:{artwork:"botanical",palette:"rainforest",colorLayers:1,
    detail:1,medium:"layered",frame:198,seed:37,shadow:.92,edge:.65},
  argTypes:{artwork:hideControl,object:hideControl,objectPalette:hideControl,
    scenery:hideControl,sceneryPalette:hideControl,breeze:hideControl,treeVariety:hideControl,
    curl:hideControl,motion:hideControl,relief:hideControl},
};
export const Scenery: Story = {
  name:"Scenery",
  args:{artwork:"scenery",scenery:"woodland",sceneryPalette:"sage",breeze:.45,relief:1,treeVariety:.9,
    detail:1,medium:"layered",aspect:"landscape",frame:214,tooth:.72,
    shadow:1,edge:.36,seed:37},
  argTypes:{artwork:hideControl,object:hideControl,objectPalette:hideControl,
    palette:hideControl,colorLayers:hideControl,curl:hideControl,
    motion:hideControl},
};
export const Kingfisher: Story = {
  name:"Kingfisher",
  args:{artwork:"object",object:"kingfisher",objectPalette:"jewel",detail:1,
    curl:1,relief:1,motion:.5,medium:"layered",frame:215,shadow:.96,edge:.72,seed:37},
  argTypes:objectControls,
};
export const Dragonfly: Story = {
  name:"Dragonfly",
  args:{artwork:"object",object:"dragonfly",objectPalette:"jewel",detail:1,
    curl:1,relief:1,motion:1,medium:"layered",frame:195,shadow:.94,edge:.69,seed:37},
  argTypes:objectControls,
};
export const CanalHouses: Story = {
  name:"Canal Houses",
  args:{artwork:"object",object:"canal-houses",objectPalette:"pastel",detail:1,
    curl:1,relief:1,motion:1,medium:"layered",frame:195,shadow:.9,edge:.55,seed:37},
  argTypes:objectControls,
};
export const Camera: Story = {
  name:"Camera",
  args:{artwork:"object",object:"camera",objectPalette:"heritage",detail:1,
    curl:1,relief:1,motion:1,medium:"layered",frame:195,shadow:.88,edge:.55,seed:37},
  argTypes:objectControls,
};
export const Teacup: Story = {
  name:"Teacup & Citrus",
  args:{artwork:"object",object:"teacup",objectPalette:"pastel",detail:1,
    curl:1,relief:1,motion:1,medium:"layered",frame:195,shadow:.92,edge:.55,seed:37},
  argTypes:objectControls,
};
