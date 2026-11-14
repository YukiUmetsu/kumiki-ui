import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { evaluateRisoCharacter } from "../../registry/video/riso-character";
import { RisoCharacterInk } from "../../registry/video/riso-character-react";
import { RisoPrint } from "../../registry/video/print-plates-react";
import type { RisoArtwork, RisoPaint } from "../../registry/video/print-plates-react";
import { COURIER, risoPerformanceSpec } from "./riso-character-demo";

const button = {
  border: "1px solid #9EA19A", background: "#F5EDD9", padding: "9px 15px",
  borderRadius: 6, color: "#263C55", font: "600 13px system-ui", cursor: "pointer",
} as const;
const field = {display:"grid",gap:7,font:"600 13px system-ui"} as const;
function RisoRiggingLab() {
  const [frame,setFrame] = useState(38), [playing,setPlaying] = useState(false);
  const [enabled,setEnabled] = useState(true), [showRig,setShowRig] = useState(true);
  const [cadence,setCadence] = useState<1|2|3|4>(2);
  const [footRoll,setFootRoll] = useState(12);
  const [plate,setPlate] = useState("both"), [grain,setGrain] = useState(.45);
  const [misregistration,setMisregistration] = useState(.3);
  useEffect(()=>{
    if (!playing) return;
    const initial=frame,start=performance.now();
    let raf=0;
    const tick=(now:number)=>{
      const next=Math.min(239,initial+Math.floor((now-start)*30/1000));
      setFrame(next);
      if(next<239)raf=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
    // The UI playhead is sampled only on a Play event; FilmStage has one absolute clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  const actor={...COURIER,cadence,ik:COURIER.ik?.map(constraint =>
    constraint.target.kind === "walk"
      ? {...constraint,target:{...constraint.target,footRoll}} : constraint)};
  const pose=evaluateRisoCharacter(actor,frame,{disableIK:!enabled});
  const spec=risoPerformanceSpec("landscape",97);
  const artwork=(ink:"blue"|"red"):RisoArtwork=>(paint:RisoPaint)=>
    <g data-km-riso-rig-lab-plate={ink}>
      <RisoCharacterInk spec={actor} frame={frame} plateId={ink} paint={paint}
        x={260} y={470} scale={2.05} disableIK={!enabled} showRig={showRig}/>
      {ink==="blue" && <g fill={paint.solid}>
        <text x={42} y={52} fontFamily="Arial,sans-serif" fontSize={13}
          letterSpacing={2.4} fontWeight={700}>RISO 03 / ARTICULATION LAB</text>
        <text x={42} y={111} fontFamily="Georgia,serif" fontSize={48}
          fontWeight={700}>FEET</text>
        <text x={42} y={157} fontFamily="Georgia,serif" fontSize={48}
          fontWeight={700}>&amp; BONES</text>
        <path d="M42 179 H212" fill="none" stroke={paint.solid} strokeWidth={2}/>
        <text x={42} y={211} fontSize={12} letterSpacing={1.2}
          fontFamily="Arial,sans-serif">STANCE / SWING</text>
        <text x={42} y={233} fontSize={12} letterSpacing={1.2}
          fontFamily="Arial,sans-serif">HIP / KNEE / ANKLE</text>
        <text x={42} y={255} fontSize={12} letterSpacing={1.2}
          fontFamily="Arial,sans-serif">ELBOW / WRIST</text>
        <path d="M42 440 H914" stroke={paint.solid} strokeWidth={1.6}/>
        <text x={42} y={507} fontSize={11} letterSpacing={1.5}
          fontFamily="Arial,sans-serif">AUTHORABLE BODY RIG / TWO INDEPENDENT PRINT PLATES</text>
        <text x={824} y={507} fontSize={13} fontWeight={700}>03 / RISO</text>
      </g>}
      {ink==="red" && <g fill={paint.solid} opacity={.9}>
        <path d="M44 285 l40 0" stroke={paint.solid} strokeWidth={3} strokeDasharray="8 7"/>
        <text x={42} y={330} fontSize={17} fontFamily="Arial,sans-serif"
          fontWeight={700}>INK + MOTION</text>
      </g>}
    </g>;
  return <div style={{minHeight:"100vh",padding:24,background:"#E9E5DC",color:"#273C52",
    fontFamily:"system-ui",display:"grid",gap:16,alignContent:"start",justifyItems:"start"}}>
    <div style={{maxWidth:960}}>
      <div style={{fontSize:11,fontWeight:800,letterSpacing:2.4}}>VIDEO PRODUCTION / FILM LOOKS / RISO3</div>
      <h1 style={{font:"700 31px Georgia,serif",margin:"5px 0 9px"}}>Character Rigging Microscope</h1>
      <p style={{fontSize:14,maxWidth:920,margin:0,lineHeight:1.6}}>
        Compare the old rotating-stick gait with two-bone IK. Each foot holds its paper-space
        position through stance, then lifts during swing; knees bend and the shoes stay level.
        Toggle the skeleton to inspect the actual solved joints and targets.
      </p>
    </div>
    <div style={{width:"min(960px,100%)",boxShadow:"0 16px 34px #293C4B29"}}>
      <RisoPrint spec={spec} frame={3} artworks={{blue:artwork("blue"),red:artwork("red")}}
        paperGrain={grain} misregistration={misregistration}
        visiblePlateIds={plate==="both"?undefined:[plate]}
        label="Magnified Risograph courier showing two-bone knee and foot constraints"
        data-km-riso-rig-lab="" data-km-riso-rig-frame={frame}/>
    </div>
    <div style={{width:"min(960px,100%)",display:"grid",gap:14}}>
      <div style={{display:"flex",gap:12,alignItems:"center"}}>
        <button type="button" style={button} onClick={()=>{
          if(frame===239)setFrame(0);setPlaying(v=>!v);
        }}>{playing?"Pause":frame===239?"Replay":"Play animation"}</button>
        <label style={{...field,flex:1}}>Frame {frame} / 239
          <input type="range" min={0} max={239} value={frame}
            aria-label="Rigging microscope frame" onChange={e=>{
              setPlaying(false);setFrame(Number(e.target.value));
            }}/>
        </label>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[[10,"Planted stance"],[46,"Foot swing"],[77,"Second stride"],[141,"Reach"],[198,"Both feet down"]] .map(([at,title])=>
          <button key={at} type="button" style={button} onClick={()=>{
            setPlaying(false);setFrame(at as number);
          }}>{title}</button>)}
      </div>
      <div style={{display:"flex",gap:22,flexWrap:"wrap",alignItems:"center"}}>
        <label style={{display:"flex",alignItems:"center",gap:7,fontWeight:700,fontSize:13}}>
          <input type="checkbox" checked={enabled} aria-label="Enable IK in microscope"
            onChange={e=>setEnabled(e.target.checked)}/>Enable two-bone IK
        </label>
        <label style={{display:"flex",alignItems:"center",gap:7,fontWeight:700,fontSize:13}}>
          <input type="checkbox" checked={showRig} aria-label="Show joints and IK foot targets"
            onChange={e=>setShowRig(e.target.checked)}/>Show bones and targets
        </label>
        <label style={field}>Swing toe-roll · {footRoll}°
          <input type="range" min={0} max={35} step={1} value={footRoll}
            aria-label="Rig microscope toe roll" onChange={e=>setFootRoll(Number(e.target.value))}/>
        </label>
        <label style={field}>Printed cadence · {cadence}
          <input type="range" min={1} max={4} value={cadence} step={1}
            aria-label="Microscope print cadence" onChange={e=>setCadence(Number(e.target.value) as 1|2|3|4)}/>
        </label>
        <label style={field}>Plate separation
          <select aria-label="Microscope spot ink plate" value={plate} onChange={e=>setPlate(e.target.value)}>
            <option value="both">Both inks</option><option value="blue">Cobalt</option><option value="red">Vermilion</option>
          </select>
        </label>
        <label style={field}>Misregistration · {misregistration.toFixed(2)}
          <input type="range" min={0} max={1} step={.05} value={misregistration}
            aria-label="Rig microscope registration" onChange={e=>setMisregistration(Number(e.target.value))}/>
        </label>
        <label style={field}>Paper grain · {grain.toFixed(2)}
          <input type="range" min={0} max={1} step={.05} value={grain}
            aria-label="Rig microscope paper grain" onChange={e=>setGrain(Number(e.target.value))}/>
        </label>
      </div>
      <div aria-label="IK solving errors" data-km-riso-rig-errors=""
        style={{font:"12px ui-monospace,monospace",padding:"10px 13px",background:"#F3EFE3",
          border:"1px solid #B4AD9F"}}>
        {enabled ? pose.ik.map(leg=><span key={leg.id} style={{display:"inline-block",marginRight:22}}>
          {leg.id}: error {leg.error.toFixed(3)}px · {leg.reachable?"reachable":"CLAMPED"}
        </span>) : "FK only — no planted-foot constraints"}
      </div>
      <p style={{margin:0,fontSize:12,color:"#526577"}}>
        Magenta outlines are diagnostic joints, not finished print artwork. Green crosshairs are the
        authored ground target coordinates; their positions stay fixed through contact even when the
        torso advances. No springs, wall-clock simulation, or external rig library.
      </p>
    </div>
  </div>;
}
const meta={
  title:"Video production/Film Looks/Risograph Characters",
  id:"video-riso-rig-lab",
  component:RisoRiggingLab,
  parameters:{layout:"fullscreen"},
} satisfies Meta<typeof RisoRiggingLab>;
export default meta;
export const RiggingMicroscope:StoryObj<typeof meta>={
  name:"RISO3 · Rigging Microscope",render:()=><RisoRiggingLab/>,
};
