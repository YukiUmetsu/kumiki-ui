import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileFilm } from "../../registry/video/film-document";
import { FilmStage } from "../../registry/video/film-stage";
import { RisoCharacterPerformance } from "./riso-character-demo";
import { RISO_CHARACTER_FILM } from "./riso-character-film";
import type { RisoPerformanceAspect } from "./riso-character-demo";

const button = {
  border:"1px solid #A7A39A", borderRadius:6, padding:"11px 16px",
  background:"#F9F1E4", font:"600 13px system-ui", cursor:"pointer", color:"#253C58",
} as const;
const label = { display:"grid",gap:5,font:"600 13px system-ui",minWidth:145 } as const;
function RisoCharacterStudio() {
  const [frame,setFrame] = useState(130), [playing,setPlaying] = useState(false);
  const [aspect,setAspect] = useState<RisoPerformanceAspect>("landscape");
  const [cadence,setCadence] = useState<1 | 2 | 3 | 4>(2);
  const [seed,setSeed] = useState(89);
  const [registration,setRegistration] = useState(.3);
  const [grain,setGrain] = useState(.55);
  const [reducedMotion,setReducedMotion] = useState(false);
  const [plate,setPlate] = useState("both");
  const compiled = useMemo(()=>compileFilm(RISO_CHARACTER_FILM,{outputId:aspect}),[aspect]);
  useEffect(()=>{
    if(!playing)return;
    let raf=0;
    const first=frame,started=performance.now();
    const step=(now:number)=>{
      const next=Math.min(239,first+Math.floor((now-started)*30/1000));
      setFrame(next);
      if(next<239)raf=requestAnimationFrame(step);
      else setPlaying(false);
    };
    raf=requestAnimationFrame(step);
    return ()=>cancelAnimationFrame(raf);
    // Start frame sampled at Play; passive changes cannot reset the film clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(d=>d.message).join("\n")}</pre>;
  const film=compiled.film;
  const scale=aspect==="portrait"?.62:1;
  const visiblePlateIds=plate==="both"?undefined:[plate];
  const stages = [[0,"Opening"],[74,"Walking"],[156,"Speaking"],[198,"Smile"],[239,"Final hold"]] as const;
  return <div style={{minHeight:"100vh",padding:25,background:"#EAE5D8",
    color:"#263C51",fontFamily:"system-ui",display:"grid",gap:18,justifyItems:"start",alignContent:"start"}}>
    <header style={{maxWidth:930}}>
      <div style={{fontWeight:800,letterSpacing:2.4,fontSize:11}}>RISO2 / ANIMATED PRINT PERFORMANCE</div>
      <h1 style={{font:"700 34px Georgia,serif",margin:"7px 0"}}>Paper Courier — Two-Character Stage</h1>
      <p style={{margin:0,lineHeight:1.5,fontSize:14,maxWidth:870}}>
        Two original actors with different hierarchies share one print: a walking courier blinks, speaks,
        smiles and carries a swinging satchel while a bird flies with independent wings and tail.
        Both subjects consist of separate cobalt/vermilion ink plate artwork with fixed paper grain.
      </p>
    </header>
    <div style={{width:film.width*scale,height:film.height*scale,maxWidth:"100%",
      overflow:"hidden",boxShadow:"0 14px 36px #263C5130"}}>
      <FilmStage film={film} frame={frame} reducedMotion={reducedMotion}
        renderObject={()=>null} renderSlot={(content,context)=>{
          if(content.slot!=="riso-character-performance")
            throw new Error("Unexpected slot: "+content.slot);
          const offset=content.props?.offsetFrame;
          if(typeof offset!=="number")throw new RangeError("Missing authored film offset");
          return <RisoCharacterPerformance
            aspect={aspect} frame={offset+context.frame} cadence={cadence}
            seed={seed} misregistration={registration} grain={grain}
            reducedMotion={context.reducedMotion} visiblePlateIds={visiblePlateIds}/>;
        }} style={{transform:"scale("+scale+")",transformOrigin:"top left"}}/>
    </div>
    <div style={{width:Math.min(film.width*scale,950),maxWidth:"100%",display:"grid",gap:11}}>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <button type="button" style={button} onClick={()=>{
          if(frame>=239)setFrame(0);
          setPlaying(v=>!v);
        }}>{playing?"Pause":frame>=239?"Replay":"Play"}</button>
        <label style={{...label,flex:1}}>Film frame · {frame} / 239
          <input type="range" aria-label="Risograph character film frame"
            min={0} max={239} value={frame} onChange={e=>{
              setPlaying(false);setFrame(Number(e.target.value));
            }}/>
        </label>
      </div>
      <nav aria-label="Performance beats" style={{display:"flex",flexWrap:"wrap",gap:7}}>
        {stages.map(([at,title])=><button type="button" key={at} style={button}
          onClick={()=>{setPlaying(false);setFrame(at)}}>{title}</button>)}
      </nav>
      <div style={{display:"flex",gap:15,flexWrap:"wrap"}}>
        <label style={label}>Output
          <select aria-label="Riso performance output" value={aspect} onChange={e=>{
            setPlaying(false);setAspect(e.target.value as RisoPerformanceAspect);
          }}>
            <option value="landscape">16:9 landscape</option>
            <option value="portrait">9:16 portrait</option>
          </select>
        </label>
        <label style={label}>Ink plates
          <select aria-label="Ink plate isolation" value={plate} onChange={e=>setPlate(e.target.value)}>
            <option value="both">Both inks</option>
            <option value="blue">Cobalt only</option>
            <option value="red">Vermilion only</option>
          </select>
        </label>
        <label style={label}>Printed pose cadence · {cadence} frames
          <input type="range" min={1} max={4} step={1} value={cadence}
            aria-label="Printed pose cadence" onChange={e=>setCadence(Number(e.target.value) as 1|2|3|4)}/>
        </label>
        <label style={label}>Plate misregistration · {registration.toFixed(2)}
          <input type="range" min={0} max={1} step={.05} value={registration}
            aria-label="Plate misregistration" onChange={e=>setRegistration(Number(e.target.value))}/>
        </label>
        <label style={label}>Paper grain · {grain.toFixed(2)}
          <input type="range" min={0} max={1} step={.05} value={grain}
            aria-label="Riso character paper grain" onChange={e=>setGrain(Number(e.target.value))}/>
        </label>
        <label style={label}>Print seed
          <input aria-label="Riso character print seed" type="number" min={0}
            max={2147483647} value={seed} onChange={e=>setSeed(Math.max(0,Math.min(2147483647,Math.floor(Number(e.target.value)||0))))}/>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}>
          <input type="checkbox" checked={reducedMotion}
            onChange={e=>{setPlaying(false);setReducedMotion(e.target.checked)}}/>Reduced motion
        </label>
      </div>
    </div>
    <p style={{fontSize:12,maxWidth:900,color:"#52636F",margin:0}}>
      All acting is frame-addressed. Printed dot patterns and plate misregistration remain registered to
      the paper; moving actors do not spawn independent screen-space grain or a second clock.
      The original courier and bird are demo data; any anatomy can use this general rig.
    </p>
  </div>;
}
const meta={title:"Video production/Film Looks/Risograph Characters",
  id:"video-riso-characters",component:RisoCharacterStudio,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof RisoCharacterStudio>;
export default meta;
export const PaperCourierPerformance: StoryObj<typeof meta> = {
  name:"RISO2 · Animated Character Film",render:()=> <RisoCharacterStudio/>,
};
