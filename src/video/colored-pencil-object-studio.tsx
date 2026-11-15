import { useEffect, useMemo, useState } from "react";
import { PencilDrawing } from "../../registry/video/colored-pencil-react";
import type { PencilAspect } from "../../registry/video/colored-pencil";
import {
  pencilObjectStudyDrawing, PENCIL_OBJECT_STUDIES,
} from "./colored-pencil-object-studies";
import type { PencilObjectStudy } from "./colored-pencil-object-studies";

const titles: Record<PencilObjectStudy, {heading:string; lines:readonly [string,string]; study:string; notes:string}> = {
  rose: {heading:"BOTANICAL / CRIMSON ROSE",lines:["VELVET","PETALS"],study:"BOTANICAL STUDY 05",
    notes:"Bent laminae, attached veins, waxy overlap"},
  glass: {heading:"OPTICS / STILL LIFE",lines:["GLASS &","CITRUS"],study:"MATERIAL STUDY 06",
    notes:"Transparent edges, reflections, mottled peel"},
  architecture: {heading:"ARCHITECTURE / FAÇADE",lines:["BRICK &","LIGHT"],study:"BUILT-FORM STUDY 07",
    notes:"Aligned mortar, arched openings, deep reveals"},
  fabric: {heading:"TEXTILE / METAL",lines:["FOLDS OF","BLUE"],study:"OBJECT STUDY 08",
    notes:"Directional fibres, shadow pockets, polished metal"},
};
const label = {display:"grid",gap:5,minWidth:145,font:"600 13px system-ui"} as const;
const control = {minHeight:42,padding:"8px 11px",borderRadius:6,border:"1px solid #A9B4AA",
  background:"#FAF8F0",color:"#364951"} as const;
const button = { ...control, cursor:"pointer",font:"600 13px system-ui"} as const;

/** Story-only transport. Every drawing is a stable function of requested absolute frame. */
export function PencilObjectAtelier() {
  const [subject,setSubject] = useState<PencilObjectStudy>("rose");
  const [aspect,setAspect] = useState<PencilAspect>("landscape");
  const [frame,setFrame] = useState(325);
  const [pressure,setPressure] = useState(1);
  const [paperTooth,setPaperTooth] = useState(.72);
  const [seed,setSeed] = useState(173);
  const [speed,setSpeed] = useState(1);
  const [reducedMotion,setReducedMotion] = useState(false);
  const [playing,setPlaying] = useState(false);
  const drawing = useMemo(() => pencilObjectStudyDrawing({
    subject,aspect,pressure,paperTooth,seed,
  }),[subject,aspect,pressure,paperTooth,seed]);
  useEffect(() => {
    if (!playing || reducedMotion) return;
    const from = performance.now(), offset = frame;
    let raf = 0;
    const tick = (now:number) => {
      const next = Math.min(340,offset + Math.floor((now-from)*.03*speed));
      setFrame(next);
      if (next<340) raf=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf=requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Deliberate playback transport: pause, seek and speed start a new anchor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,speed,reducedMotion]);
  const title = titles[subject];
  const landscape = aspect==="landscape";
  const baseline = landscape ? 505 : 914;
  return <main style={{minHeight:"100vh",display:"grid",gap:15,alignContent:"start",
    padding:24,font:"15px/1.5 system-ui",background:"#E8E7DD",color:"#344349"}}>
    <header style={{maxWidth:910}}>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:1.7,color:"#727867"}}>
        MATERIAL-NATIVE COLOUR PENCIL / OBJECT ATELIER
      </div>
      <h1 style={{margin:"6px 0 8px",font:"600 33px Georgia,serif"}}>
        Objects, Observed in Coloured Pencil
      </h1>
      <p style={{margin:0,maxWidth:840}}>
        Original rose, citrus-glass still life, brick façade and silk-brass studies.
        Each shape is authored; material recipes route directional graphite, stipple,
        fibre, saturation and support without copying a reference image.
      </p>
    </header>
    <section aria-label="Pencil object atelier controls"
      style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"end",maxWidth:990}}>
      <label style={label}>Object study
        <select aria-label="Object study" style={control} value={subject}
          onChange={e=>{setPlaying(false);setSubject(e.target.value as PencilObjectStudy);}}>
          {PENCIL_OBJECT_STUDIES.map(item=><option key={item} value={item}>{
            item==="rose"?"Botanical · rose":item==="glass"?"Still life · glass and citrus":
            item==="architecture"?"Architecture · brick and arched windows":
            "Textile · blue folds and brass"
          }</option>)}
        </select>
      </label>
      <label style={label}>Output aspect
        <select aria-label="Object output aspect" style={control} value={aspect}
          onChange={e=>{setPlaying(false);setAspect(e.target.value as PencilAspect);}}>
          <option value="landscape">16:9 landscape</option>
          <option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={label}>Pigment pressure · {Math.round(pressure*100)}%
        <input aria-label="Object pigment pressure" type="range" min=".2" max="1.2"
          step=".05" value={pressure} onChange={e=>setPressure(Number(e.target.value))}/>
      </label>
      <label style={label}>Paper tooth · {Math.round(paperTooth*100)}%
        <input aria-label="Object paper tooth" type="range" min="0" max="1"
          step=".05" value={paperTooth} onChange={e=>setPaperTooth(Number(e.target.value))}/>
      </label>
      <label style={label}>Paper / pigment seed
        <input aria-label="Object seed" type="number" min="0" max="2147483000"
          style={control} value={seed} onChange={e=>{
            const value=Number(e.target.value);
            setSeed(Number.isFinite(value)?Math.max(0,Math.min(2147483000,Math.floor(value))):173);
          }}/>
      </label>
      <label style={label}>Speed
        <select aria-label="Object playback speed" style={control} value={speed}
          onChange={e=>setSpeed(Number(e.target.value))}>
          <option value={.5}>0.5×</option><option value={1}>1×</option>
          <option value={1.5}>1.5×</option><option value={2}>2×</option>
        </select>
      </label>
      <label style={{display:"flex",gap:8,alignItems:"center",minHeight:42}}>
        <input aria-label="Object reduced motion" type="checkbox" checked={reducedMotion}
          onChange={e=>{setPlaying(false);setReducedMotion(e.target.checked);}}/>
        Reduced motion
      </label>
    </section>
    <div data-km-pencil-object-study={subject}
      style={{width:"100%",maxWidth:landscape?960:540,aspectRatio:landscape?"16 / 9":"9 / 16",
        boxShadow:"0 18px 50px #52463d30",overflow:"hidden",background:drawing.paper}}>
      <PencilDrawing drawing={drawing} frame={frame} reducedMotion={reducedMotion}
        label={title.heading+" · original pencil composition"}>
        <g fontFamily="Georgia, 'Noto Serif', serif" fill="#374A4B">
          <text x={landscape?52:45} y={landscape?64:75} fontFamily="Arial, sans-serif"
            fontSize={12} fontWeight={600} letterSpacing={2.2} fill="#71827B">{title.heading}</text>
          <text x={landscape?51:45} y={landscape?139:148} fontSize={landscape?46:51}
            fontWeight={600}>{title.lines[0]}</text>
          <text x={landscape?51:45} y={landscape?192:204} fontSize={landscape?46:51}
            fontWeight={600}>{title.lines[1]}</text>
          <path d={landscape?"M54 222 L326 222":"M45 229 L489 229"} stroke="#B88D78"
            strokeWidth={1.2} fill="none"/>
          <text x={landscape?53:45} y={landscape?259:853}
            fontFamily="Arial, sans-serif" fontSize={landscape?15:14}
            fill="#657875">{title.notes}</text>
          <text x={landscape?53:45} y={baseline}
            fontFamily="Arial, sans-serif" fontSize={11} letterSpacing={1.1}
            fill="#7B847C">{title.study}  /  ORIGINAL ART / CP1</text>
        </g>
      </PencilDrawing>
    </div>
    <section aria-label="Object drawing transport" style={{display:"grid",gap:9,maxWidth:960}}>
      <label style={{...label,minWidth:"100%"}}>Frame {frame} / 340 · {
        frame<55?"Graphite setup":frame<150?"Pigment layering":
        frame<250?"Material-specific drawing":"Finished material study"
      }
        <input aria-label="Object drawing frame" type="range" min={0} max={340}
          value={frame} onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
      </label>
      <nav aria-label="Object drawing checkpoints"
        style={{display:"flex",flexWrap:"wrap",gap:8}}>
        <button type="button" style={button} onClick={()=>{
          if(frame>=340)setFrame(0);
          setPlaying(v=>!v);
        }}>{playing?"Pause":frame>=340?"Replay":"Play drawing"}</button>
        {([["Contour",36],["First colour",105],["Fine texture",225],["Finished",325]] as const)
          .map(([name,at])=><button key={name} type="button" style={button}
            onClick={()=>{setPlaying(false);setFrame(at);}}>{name}</button>)}
      </nav>
    </section>
    <p style={{maxWidth:870,fontSize:13,margin:0,color:"#63716E"}}>
      Original procedural and hand-authored SVG. These are material demonstrations,
      not licensed copies or pixel-matched reproductions of the studied artists.
      Inspect actual exports before claiming professional art fidelity.
    </p>
  </main>;
}
