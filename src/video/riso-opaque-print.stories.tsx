import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RisoPrint } from "../../registry/video/print-plates-react";
import type { RisoArtwork } from "../../registry/video/print-plates-react";
import { RisoCharacterInk, RisoCharacterKnockout } from "../../registry/video/riso-character-react";
import type { RisoCharacterSpec } from "../../registry/video/riso-character";
import { COURIER, PAPER_BIRD, risoPerformanceSpec } from "./riso-character-demo";

type Ink = "blue" | "red";
const field = {display:"grid", gap:5, font:"600 13px system-ui"} as const;
function RisoOpaquePrintLab() {
  const [frame,setFrame]=useState(46);
  const [playing,setPlaying]=useState(false);
  const [spread,setSpread]=useState(1.8);
  const [registration,setRegistration]=useState(.5);
  const [grain,setGrain]=useState(.5);
  const [plates,setPlates]=useState("both");
  const [density,setDensity]=useState(.8);
  const spec=risoPerformanceSpec("landscape",51);
  useEffect(()=>{
    if(!playing)return;
    const startFrame=frame,begin=performance.now();
    let raf=0;
    const tick=(now:number)=>{
      const next=Math.min(239,startFrame+Math.floor((now-begin)*30/1000));
      setFrame(next);
      if(next<239) raf=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
    // Starting point is sampled when playback begins; the film has a single clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  const backdrop=(ink:Ink):RisoArtwork=>paint=><g data-km-riso-opaque-backdrop={ink}>
    {ink==="blue" ? <>
      <rect x={224} y={27} width={700} height={470} fill={paint.dots} opacity={density}/>
      {Array.from({length:19},(_,i)=><path key={i}
        d={`M${250+i*34} 34 l-216 456`}
        stroke={paint.solid} strokeWidth={3.6} opacity={density}/>)}
      <path d="M242 430 H927" stroke={paint.solid} strokeWidth={3.5}/>
      <text x={33} y={83} fontSize={19} fontWeight={800} fill={paint.solid}
        fontFamily="Arial, sans-serif" letterSpacing={2}>RISO / 05</text>
      <text x={33} y={135} fontSize={38} fontWeight={800} fill={paint.solid}
        fontFamily="Georgia, serif">INK IS</text>
      <text x={33} y={181} fontSize={38} fontWeight={800} fill={paint.solid}
        fontFamily="Georgia, serif">NOT GLASS.</text>
      <text x={34} y={220} fontFamily="Arial, sans-serif" fontSize={12}
        letterSpacing={1}>STENCIL / PAPER / FIGURE</text>
      <text x={34} y={512} fontFamily="Arial, sans-serif" fontSize={12}
        letterSpacing={1.4}>SUBJECT SILHOUETTE UNDER DENSE INKS</text>
    </> : <>
      <rect x={239} y={55} width={663} height={424} fill={paint.dots} opacity={density * .65}/>
      {Array.from({length:13},(_,i)=><path key={i}
        d={`M${238+i*52} 48 l228 433`}
        stroke={paint.solid} strokeWidth={2.8} opacity={density * .7}/>)}
      <circle cx={769} cy={201} r={94} fill={paint.dots} opacity={density}/>
      <path d="M34 245 H198" stroke={paint.solid} strokeWidth={3} strokeDasharray="11 9"/>
    </>}
  </g>;
  const ink=(actor:RisoCharacterSpec,plateId:Ink,x:number,y:number,scale:number):RisoArtwork=>paint=>
    <RisoCharacterInk spec={actor} frame={frame} plateId={plateId} paint={paint}
      x={x} y={y} scale={scale}/>;
  const layer=(actor:RisoCharacterSpec,id:string,x:number,y:number,scale:number)=>({
    id, knockout:<RisoCharacterKnockout spec={actor} frame={frame}
      x={x} y={y} scale={scale} spread={spread}/>,
    artworks:{blue:ink(actor,"blue",x,y,scale), red:ink(actor,"red",x,y,scale)},
  });
  return <div style={{padding:24,background:"#E8E2D5",minHeight:"100vh",
    fontFamily:"system-ui",color:"#233D56",display:"grid",gap:14,
    justifyItems:"start",alignContent:"start"}}>
    <header style={{maxWidth:960}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:2}}>VIDEO PRODUCTION / FILM LOOKS / RISO5</div>
      <h1 style={{font:"700 32px Georgia,serif",margin:"5px 0 8px"}}>Opaque Character &amp; Registration Proof</h1>
      <p style={{fontSize:14,lineHeight:1.55,margin:0}}>
        Dense crossing inks are deliberately placed behind the figures. The courier and bird
        are cleared back to paper first, then their blue/red stencil masters print over that
        clean surface. No transparent limbs, no scenery visible through their bodies.
      </p>
    </header>
    <div style={{width:"min(960px,100%)",boxShadow:"0 18px 30px #28333e26"}}>
      <RisoPrint spec={spec} frame={3}
        artworks={{blue:backdrop("blue"),red:backdrop("red")}}
        foregroundLayers={[
          layer(COURIER,"courier",224,475,1.65),
          layer(PAPER_BIRD,"paper-bird",725,237,1.5),
        ]}
        misregistration={registration} paperGrain={grain}
        visiblePlateIds={plates==="both"?undefined:[plates]}
        label="Opaque Risograph characters in front of dense crossing blue and red ink stencils"
        data-km-riso-opaque-lab="" data-km-riso-opaque-frame={frame}/>
    </div>
    <div style={{width:"min(960px,100%)",display:"grid",gap:13}}>
      <div style={{display:"flex",gap:12,alignItems:"center"}}>
        <button type="button" style={{border:"1px solid #898C87",borderRadius:5,
          padding:"9px 16px",font:"700 13px system-ui",color:"#234466",background:"#F6EFE0"}}
          onClick={()=>{if(frame===239)setFrame(0);setPlaying(v=>!v)}}>
          {playing?"Pause":frame===239?"Replay":"Play animation"}
        </button>
        <label style={{...field,flex:1}}>Frame {frame}/239
          <input type="range" aria-label="RISO5 opacity lab frame" min={0} max={239}
            value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value))}}/>
        </label>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"end",gap:18}}>
        <label style={field}>Paper trapping / {spread.toFixed(1)}
          <input type="range" aria-label="RISO5 paper trapping" min={0} max={6} step={.2}
            value={spread} onChange={e=>setSpread(Number(e.target.value))}/>
        </label>
        <label style={field}>Background ink density / {density.toFixed(2)}
          <input type="range" aria-label="RISO5 background density" min={.1} max={1} step={.05}
            value={density} onChange={e=>setDensity(Number(e.target.value))}/>
        </label>
        <label style={field}>Plate registration / {registration.toFixed(2)}
          <input type="range" aria-label="RISO5 registration" min={0} max={1} step={.05}
            value={registration} onChange={e=>setRegistration(Number(e.target.value))}/>
        </label>
        <label style={field}>Paper grain / {grain.toFixed(2)}
          <input type="range" aria-label="RISO5 grain" min={0} max={1} step={.05}
            value={grain} onChange={e=>setGrain(Number(e.target.value))}/>
        </label>
        <label style={field}>Ink separation
          <select aria-label="RISO5 ink plate" value={plates} onChange={e=>setPlates(e.target.value)}>
            <option value="both">Both spots</option><option value="blue">Cobalt</option><option value="red">Vermilion</option>
          </select>
        </label>
      </div>
    </div>
  </div>;
}
const meta={title:"Video production/Film Looks/Risograph Characters",
  id:"video-riso-opaque-lab",component:RisoOpaquePrintLab,
  parameters:{layout:"fullscreen"}} satisfies Meta<typeof RisoOpaquePrintLab>;
export default meta;
export const OpaquePrintProof:StoryObj<typeof meta>={
  name:"RISO5 · Opaque Print Proof",render:()=> <RisoOpaquePrintLab/>,
};
