import { useEffect, useMemo, useState } from "react";
import { PencilDrawing } from "../../registry/video/colored-pencil-react";
import type { PencilAspect } from "../../registry/video/colored-pencil";
import { pencilLivingStudyDrawing, PENCIL_LIVING_STUDIES } from "./colored-pencil-living-studies";
import type { PencilLivingStudy } from "./colored-pencil-living-studies";

const descriptive:Record<PencilLivingStudy,{title:string; subtitle:string; material:string; anchor:readonly[number,number]}> = {
  portrait:{title:"A PORTRAIT IN PENCIL",subtitle:"Light across skin · fine hair · living eyes",
    material:"SKIN / HAIR / FABRIC",anchor:[262,208]},
  fox:{title:"RED FOX AT REST",subtitle:"Direction of fur · layered ruff · bright eyes",
    material:"FUR / EYE / EAR",anchor:[232,194]},
  valley:{title:"THE QUIET VALLEY",subtitle:"Air perspective · branching trees · moving water",
    material:"STONE / FOLIAGE / WATER",anchor:[359,300]},
};
const selectStyle={padding:"9px 11px",minHeight:40,border:"1px solid #ACAFA5",borderRadius:5,
  background:"#FFFCF3",color:"#36454B"} as const;
const labelStyle={display:"grid",gap:6,font:"600 13px system-ui",minWidth:130} as const;
const buttonStyle={...selectStyle,cursor:"pointer",font:"600 13px system-ui"} as const;

/**
 * The interactive atlas lives under the existing Colour-pencil story root.
 * The drawing contains NO timers: all shots are pure frame-addressed SVG.
 * Inspection zoom is Storybook-only, never part of exported composition.
 */
export function PencilLivingAtelier() {
  const [subject,setSubject]=useState<PencilLivingStudy>("portrait");
  const [aspect,setAspect]=useState<PencilAspect>("landscape");
  const [frame,setFrame]=useState(325);
  const [tooth,setTooth]=useState(.76);
  const [pressure,setPressure]=useState(1);
  const [seed,setSeed]=useState(271);
  const [speed,setSpeed]=useState(1);
  const [focus,setFocus]=useState(false);
  const [reduce,setReduce]=useState(false);
  const [playing,setPlaying]=useState(false);
  const drawing=useMemo(()=>pencilLivingStudyDrawing({
    subject,aspect,paperTooth:tooth,pressure,seed,
  }),[subject,aspect,tooth,pressure,seed]);
  useEffect(()=>{
    if (!playing||reduce) return;
    const started=performance.now(),offset=frame;
    let raf=0;
    const tick=(now:number)=>{
      const next=Math.min(350,offset+Math.floor((now-started)*.03*speed));
      setFrame(next);
      if(next<350)raf=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
    // Pause, speed and seeks re-anchor the Storybook-only transport.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,speed,reduce]);
  const landscape=aspect==="landscape",meta=descriptive[subject];
  const coord=landscape?{
    x:441+1.06*meta.anchor[0],y:35+1.06*meta.anchor[1],w:960,h:540,
  }:{x:35+1.06*meta.anchor[0],y:253+1.06*meta.anchor[1],w:540,h:960};
  const zoom=subject==="portrait"?3.1:subject==="fox"?2.8:2.25;
  const detailStyle=focus?{
    transform:"translate("+ (50-100*zoom*coord.x/coord.w).toFixed(3)+"%, "+
      (50-100*zoom*coord.y/coord.h).toFixed(3)+"%) scale("+zoom+")",
    transformOrigin:"top left",
  } : undefined;
  return <main style={{background:"#E9E7DE",minHeight:"100vh",padding:24,
    font:"15px/1.5 system-ui",color:"#3C4749",display:"grid",gap:17,alignContent:"start"}}>
    <header style={{maxWidth:950}}>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:1.8,color:"#68776E"}}>
        ARTCRAFT / ORIGINAL COLOURED-PENCIL STUDIES
      </div>
      <h1 style={{font:"600 33px Georgia,serif",margin:"6px 0"}}>
        Living subjects: Portrait · Wildlife · Landscape
      </h1>
      <p style={{maxWidth:880,margin:0}}>
        Separate anatomy, natural fibre flow, skin colour layers, needle-branch hierarchy,
        and river perspective. Inspired by studied pencil craftsmanship without tracing artist images.
      </p>
    </header>
    <section aria-label="Living pencil atelier controls"
      style={{display:"flex",flexWrap:"wrap",alignItems:"end",gap:13,maxWidth:1020}}>
      <label style={labelStyle}>Study
        <select aria-label="Living subject" style={selectStyle} value={subject}
          onChange={e=>{setPlaying(false);setSubject(e.target.value as PencilLivingStudy);}}>
          {PENCIL_LIVING_STUDIES.map(s=><option key={s} value={s}>{
            s==="portrait"?"Original human portrait":s==="fox"?"Red fox with layered fur":
            "Mountain, pines and river"
          }</option>)}
        </select>
      </label>
      <label style={labelStyle}>Aspect
        <select aria-label="Living aspect" style={selectStyle} value={aspect}
          onChange={e=>{setPlaying(false);setAspect(e.target.value as PencilAspect);}}>
          <option value="landscape">16:9</option><option value="portrait">9:16</option>
        </select>
      </label>
      <label style={labelStyle}>Pigment strength · {Math.round(pressure*100)}%
        <input aria-label="Living pressure" type="range" min=".2" max="1.2"
          step=".05" value={pressure} onChange={e=>setPressure(Number(e.target.value))}/>
      </label>
      <label style={labelStyle}>Paper grain · {Math.round(tooth*100)}%
        <input aria-label="Living tooth" type="range" min="0" max="1" step=".05"
          value={tooth} onChange={e=>setTooth(Number(e.target.value))}/>
      </label>
      <label style={labelStyle}>Art seed
        <input aria-label="Living seed" type="number" style={selectStyle}
          min="0" max="2147483000" value={seed} onChange={e=>{
            const value=Number(e.target.value);
            setSeed(Number.isFinite(value)?Math.max(0,Math.min(2147483000,Math.floor(value))):271);
          }}/>
      </label>
      <label style={labelStyle}>Playback
        <select aria-label="Living speed" style={selectStyle} value={speed}
          onChange={e=>setSpeed(Number(e.target.value))}>
          <option value=".5">0.5×</option><option value="1">1×</option>
          <option value="1.5">1.5×</option><option value="2">2×</option>
        </select>
      </label>
      <label style={{display:"flex",minHeight:40,alignItems:"center",gap:7}}>
        <input aria-label="Living inspect macro" type="checkbox" checked={focus}
          onChange={e=>setFocus(e.target.checked)}/> Inspect macro
      </label>
      <label style={{display:"flex",minHeight:40,alignItems:"center",gap:7}}>
        <input aria-label="Living reduced motion" type="checkbox" checked={reduce}
          onChange={e=>{setReduce(e.target.checked);setPlaying(false);}}/> Reduced motion
      </label>
    </section>
    <div data-km-living-subject={subject}
      style={{maxWidth:landscape?960:540,width:"100%",
        aspectRatio:landscape?"16 / 9":"9 / 16",
        overflow:"hidden",background:drawing.paper,
        boxShadow:"0 16px 50px #54534d32"}}>
      <PencilDrawing drawing={drawing} frame={frame} reducedMotion={reduce}
        style={detailStyle} label={meta.title+" in coloured pencil"}>
        <g fontFamily="Georgia, serif" fill="#3D4B50">
          <text x={landscape?54:45} y={landscape?80:77}
            fontSize={13} fontFamily="Arial, sans-serif" fontWeight={600}
            letterSpacing={1.8} fill="#85918A">{meta.material}</text>
          <text x={landscape?50:44} y={landscape?143:142}
            fontSize={landscape?38:35} fontWeight={600}>{meta.title}</text>
          <path d={landscape?"M53 166 H350":"M45 171 H488"}
            fill="none" stroke="#B5A993" strokeWidth={1.1}/>
          <text x={landscape?51:45} y={landscape?209:832}
            fontSize={landscape?15:14} fill="#687B79">{meta.subtitle}</text>
          <text x={landscape?53:45} y={landscape?507:909}
            fontFamily="Arial, sans-serif" fontSize={11} letterSpacing={1.1}
            fill="#78817B">ORIGINAL ART · CP1 · STUDY {subject.toUpperCase()}</text>
        </g>
      </PencilDrawing>
    </div>
    <div style={{display:"grid",maxWidth:960,gap:10}}>
      <label style={{...labelStyle,width:"100%"}}>Drawing frame {frame}/350
        <input aria-label="Living drawing frame" type="range" min="0" max="350"
          value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
      </label>
      <nav aria-label="Living drawing timeline" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button type="button" style={buttonStyle} onClick={()=>{
          if(frame>=350)setFrame(0);
          setPlaying(v=>!v);
        }}>{playing?"Pause":frame>=350?"Replay":"Play drawing"}</button>
        {([["Contours",45],["Masses",130],["Fine strokes",255],["Complete",335]] as const)
          .map(([label,n])=><button key={label} type="button" style={buttonStyle}
            onClick={()=>{setPlaying(false);setFrame(n);}}>{label}</button>)}
      </nav>
    </div>
    <p style={{margin:0,maxWidth:920,fontSize:13,color:"#697B78"}}>
      These are original construction and material studies. The macro lens is Storybook-only.
      They are not claimed to match any specific artist's composition or to demonstrate photorealism.
      Final browser pixel inspection and real-time animation acceptance are separate quality gates.
    </p>
  </main>;
}
