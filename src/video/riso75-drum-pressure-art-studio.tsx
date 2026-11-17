import {useEffect,useRef,useState} from "react";
import {RisoBrushArt} from "./riso-brush-studio";
import type {RisoAspect,RisoLayer} from "./riso-print-demo";

const ink="#293C51",paper="#F2E9D6";
const ui={display:"grid",gap:6,font:"600 13px system-ui"} as const;
const button={padding:"9px 14px",background:ink,color:paper,
  border:"1px solid #293C51",borderRadius:4,font:"600 13px system-ui",
  minHeight:40,cursor:"pointer"} as const;

/** RISO75 source-native print material. Two copies of the SAME authored
 * nineteen-gesture-plus-pressure original animation compare exact geometry:
 * the only change is independent per-drum paper-locked ink-contact scars.
 * Frame scrubbing never regenerates a grain field and original PDF plates
 * are unaffected. The film render uses the existing RisoBrushArt source. */
export function RisoDrumPressureArtStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(160);
  const [plate,setPlate]=useState<RisoLayer>("both");
  const [dryness,setDryness]=useState(.8);
  const [feed,setFeed]=useState<"top-to-bottom"|"left-to-right">("top-to-bottom");
  const [grain,setGrain]=useState(.57);
  const [zoom,setZoom]=useState(1);
  const [focusX,setFocusX]=useState(58);
  const [focusY,setFocusY]=useState(43);
  const [reduced,setReduced]=useState(false);
  const [playing,setPlaying]=useState(false);
  const initial=useRef(frame);
  useEffect(()=>{
    if(!playing)return;
    const start=performance.now();
    let raf=0;
    const tick=(now:number)=>{
      const at=Math.min(239,initial.current+
        Math.floor((now-start)*24/1000));
      setFrame(at);
      if(at===239)setPlaying(false);
      else raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[playing]);
  const displayFrame=reduced?239:frame;
  const portrait=aspect==="portrait";
  const base={aspect,frame:displayFrame,printFrame:239,
    plate,dryness:.74,seed:62,inkScale:1,registration:.25,
    grain,animate:!reduced,layout:"film" as const};
  const camera={position:"relative" as const,
    width:"100%",aspectRatio:portrait?"540/960":"960/540",
    overflow:"hidden",background:paper};
  const closeup={width:"100%",height:"100%",transform:`scale(${zoom})`,
    transformOrigin:`${focusX}% ${focusY}%`};
  const render=(withContact:boolean)=><article
    data-km-riso75-pressure-panel={withContact?"contact":"source"}
    style={{display:"grid",gap:8,minWidth:0}}>
    <strong style={{font:"700 15px Georgia,serif"}}>
      {withContact?"Independent cobalt/vermilion drum contact":
        "Untouched original vector ink pressure"}
    </strong>
    <div style={camera}>
      <div data-km-riso75-material-camera="" style={closeup}>
        <RisoBrushArt {...base} drumContact={withContact?{dryness,feed}:undefined}/>
      </div>
    </div>
    <small style={{lineHeight:1.5}}>
      {withContact?"Added anchored longitudinal stencil-starvation fissures and separate drum pinpricks. Original pressure ribbons, taper, paper-open fibre gaps and source geometry remain exact.":
        "Identical source paths and scene time, before extra print-contact material."}
    </small>
  </article>;
  return <main data-km-riso75-atelier="" data-km-riso75-frame={displayFrame}
    data-km-riso75-material={dryness}
    data-km-riso75-feed={feed}
    data-km-riso75-zoom={zoom}
    data-km-riso75-aspect={aspect}
    style={{display:"grid",alignContent:"start",gap:16,minHeight:"100vh",
      padding:20,background:"#E9DDC9",color:ink,font:"14px/1.5 system-ui"}}>
    <header style={{maxWidth:960}}>
      <div style={{font:"800 12px system-ui",letterSpacing:1.8}}>
        RISOGRAPH / RISO75 / ORIGINAL PAPER-LOCKED SPOT MATERIAL
      </div>
      <h1 style={{font:"700 clamp(24px,3vw,36px)/1.2 Georgia,serif",
        margin:"8px 0"}}>
        Drum pressure · dry-contact ink engraving
      </h1>
      <p style={{margin:0,maxWidth:870}}>
        Two independent spot-ink impressions, each with unique original
        feed-direction pressure fissures. The overprint is still physical-style
        multiplied color. Compare both material states from exactly the same
        original authored vector drawing, not a postprocessed image.
      </p>
    </header>
    <section aria-label="RISO75 original and contact print controls"
      style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
      <button style={button} type="button"
        aria-label={playing?"RISO75 pause":"RISO75 play"}
        onClick={()=>{
          if(!playing){initial.current=frame>=239?0:frame;
            setFrame(initial.current);}
          setPlaying(!playing);
        }}>{playing?"Pause":frame>=239?"Replay":"Play"} · 24 fps</button>
      <label style={{...ui,minWidth:200,flex:"1 1 260px"}}>
        Original animated source · frame {displayFrame} / 239
        <input type="range" min={0} max={239} step={1} value={frame}
          aria-label="RISO75 original source film frame"
          onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
      </label>
      <label style={{...ui,minWidth:190}}>
        Drum contact dryness · {Math.round(dryness*100)}%
        <input aria-label="RISO75 drum contact dryness"
          type="range" min={0} max={1} step=".05" value={dryness}
          onChange={e=>setDryness(Number(e.target.value))}/>
      </label>
      <label style={ui}>Feed direction
        <select aria-label="RISO75 paper feed direction" value={feed}
          onChange={e=>setFeed(e.target.value as typeof feed)}>
          <option value="top-to-bottom">Top → bottom: longitudinal</option>
          <option value="left-to-right">Left → right: transverse</option>
        </select>
      </label>
      <label style={ui}>Source separation
        <select aria-label="RISO75 original ink selection" value={plate}
          onChange={e=>setPlate(e.target.value as RisoLayer)}>
          <option value="both">Original overprint · both inks</option>
          <option value="blue">Cobalt spot drum only</option>
          <option value="red">Vermilion spot drum only</option>
        </select>
      </label>
      <label style={ui}>Output
        <select aria-label="RISO75 film aspect" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 widescreen</option>
          <option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={ui}>Source paper texture · {Math.round(grain*100)}%
        <input aria-label="RISO75 paper texture" type="range"
          min={0} max={1} step=".05" value={grain}
          onChange={e=>setGrain(Number(e.target.value))}/>
      </label>
      <label style={ui}>Source microscope · {zoom}×
        <select aria-label="RISO75 microscope zoom" value={zoom}
          onChange={e=>setZoom(Number(e.target.value))}>
          <option value={1}>1× whole composition</option>
          <option value={2}>2× dry-contact fiber</option>
          <option value={3}>3× individual ink contacts</option>
        </select>
      </label>
      <label style={{...ui,minWidth:140}}>X center · {focusX}%
        <input aria-label="RISO75 source crop X" type="range"
          value={focusX} min={0} max={100}
          onChange={e=>setFocusX(Number(e.target.value))}/>
      </label>
      <label style={{...ui,minWidth:140}}>Y center · {focusY}%
        <input aria-label="RISO75 source crop Y" type="range"
          value={focusY} min={0} max={100}
          onChange={e=>setFocusY(Number(e.target.value))}/>
      </label>
      <label style={{display:"flex",gap:9,alignItems:"center",minHeight:39}}>
        <input aria-label="RISO75 reduced motion" type="checkbox"
          checked={reduced} onChange={e=>{setReduced(e.target.checked);
            setPlaying(false);}}/>
        Reduced motion · completed source
      </label>
    </section>
    <section data-km-riso75-a-b="" aria-label="RISO75 paper-locked material A/B"
      style={{display:"grid",
        gridTemplateColumns:portrait?
          "repeat(auto-fit,minmax(min(100%,280px),1fr))":
          "repeat(auto-fit,minmax(min(100%,430px),1fr))",
        gap:17,maxWidth:1190,alignItems:"start"}}>
      {render(false)}
      {render(true)}
    </section>
    <p style={{margin:0,maxWidth:1100,fontSize:13}}>
      The two panels share exactly the same source frame, 19 pressure-based
      witness marks per plate, paper seed, original dry-brush contours and
      original color registration. Extra contact follows each plate's
      longitudinal machine feed, fixed across all 240 frame samples.
      Zero dryness is exactly the original drawing. The press-contact
      material is optional artistic direction, not measured real ink density
      or a replacement for the independent grayscale PDF/TIFF master.
    </p>
  </main>;
}
