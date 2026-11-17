import {useEffect,useMemo,useRef,useState} from "react";
import {compileFilm} from "../../registry/video/film-document";
import {FilmStage} from "../../registry/video/film-stage";
import {RisoPrint} from "../../registry/video/print-plates-react";
import {RisoTornPaperTransition} from "../../registry/video/riso-torn-paper-react";
import type {RisoTearDirection} from "../../registry/video/riso-torn-paper";
import {completedRisoFrame} from "../../registry/video/riso-sheet-feed";
import {risoExampleArtworks,risoExampleSpec} from "./riso-print-demo";
import type {RisoAspect} from "./riso-print-demo";
import {risoSecondSheetArtworks} from "./riso-print-demo-alt";
import {RISO76_TORN_COLLAGE_FILM} from "./riso76-collage-film";

const panel={display:"grid",gap:5,font:"600 13px/1.35 system-ui"} as const;
const button={border:"1px solid #576878",borderRadius:4,
  background:"#293F58",color:"#F8F0E5",padding:"8px 12px",
  minHeight:39,cursor:"pointer",font:"600 13px system-ui"} as const;
const presets=[["Original print",30],["Tear begins",53],
  ["Opening",85],["Fibres / middle",111],["Edge exits",170],
  ["New print",184]] as const;

/** RISO76: real source plate art, real FilmStage, not a detached JS clock
 * or screenshot effect. Both source prints and all 144 paper fibres remain
 * full SVGs; the only intentional clip is the collage paper edge. */
export function RisoTornCollageStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(111);
  const [direction,setDirection]=useState<RisoTearDirection>("left-to-right");
  const [roughness,setRoughness]=useState(.77);
  const [thickness,setThickness]=useState(.56);
  const [seed,setSeed]=useState(76);
  const [paperGrain,setPaperGrain]=useState(.57);
  const [contact,setContact]=useState(.45);
  const [zoom,setZoom]=useState(1);
  const [focusX,setFocusX]=useState(50);
  const [focusY,setFocusY]=useState(48);
  const [reduce,setReduce]=useState(false);
  const [playing,setPlaying]=useState(false);
  const atStart=useRef(frame);
  const compiled=useMemo(()=>
    compileFilm(RISO76_TORN_COLLAGE_FILM,{outputId:aspect}),[aspect]);
  const outgoing=useMemo(()=>({spec:risoExampleSpec(aspect,23),
    artworks:risoExampleArtworks(aspect)}),[aspect]);
  const incoming=useMemo(()=>({spec:risoExampleSpec(aspect,37),
    artworks:risoSecondSheetArtworks(aspect)}),[aspect]);
  const total=232;
  useEffect(()=>{
    if(!playing)return;
    const start=performance.now();
    let raf=0;
    const tick=(now:number)=>{
      const next=Math.min(total-1,atStart.current+
        Math.floor((now-start)*24/1000));
      setFrame(next);
      if(next>=total-1)setPlaying(false);
      else raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[playing]);
  if(!compiled.ok)return <pre role="alert">{
    compiled.diagnostics.map(x=>x.path+": "+x.message).join("\n")
  }</pre>;
  const film=compiled.film;
  const drumContact={dryness:contact,feed:"top-to-bottom" as const};
  const common={paperGrain,misregistration:.25,drumContact,reducedMotion:true};
  const stage=<FilmStage film={film} frame={frame} renderObject={()=>null}
    reducedMotion={reduce} renderSlot={(content,ctx)=>{
      if(content.slot==="riso76-original")return <RisoPrint
        spec={outgoing.spec} artworks={outgoing.artworks}
        frame={completedRisoFrame(outgoing.spec)} {...common}
        label="First original two-drum ocean print"/>;
      if(content.slot==="riso76-next")return <RisoPrint
        spec={incoming.spec} artworks={incoming.artworks}
        frame={completedRisoFrame(incoming.spec)} {...common}
        label="Second original two-drum delta print"/>;
      if(content.slot==="riso76-collage")return <RisoTornPaperTransition
        outgoing={outgoing} incoming={incoming}
        frame={ctx.frame} startFrame={0} durationFrames={ctx.durationFrames-1}
        direction={direction} roughness={roughness}
        paperThickness={thickness} seed={seed}
        misregistration={.25} paperGrain={paperGrain}
        drumContact={drumContact} reducedMotion={ctx.reducedMotion}/>;
      throw new RangeError("RISO76 unknown physical paper scene: "+content.slot);
    }}/>;
  const scene=frame<52?"original":frame<172?"torn-collage":"new";
  const actual=reduce?232:frame;
  return <main data-km-riso76-studio=""
    data-km-riso76-frame={frame}
    data-km-riso76-scene={scene}
    data-km-riso76-direction={direction}
    data-km-riso76-aspect={aspect}
    data-km-riso76-zoom={zoom}
    data-km-riso76-paper-roughness={roughness}
    data-km-riso76-reduced={String(reduce)}
    style={{padding:20,display:"grid",gap:16,minHeight:"100vh",
      alignContent:"start",background:"#E9E1D5",color:"#273F57",
      font:"14px/1.5 system-ui"}}>
    <header style={{maxWidth:950}}>
      <div style={{fontWeight:800,letterSpacing:1.9,fontSize:12}}>
        RISOGRAPH / RISO76 / PRINTMAKING PAPER-COLLAGE FILM
      </div>
      <h1 style={{font:"700 clamp(25px,3vw,36px)/1.2 Georgia,serif",
        margin:"7px 0"}}>
        A torn edition · paper fibre meets independent ink
      </h1>
      <p style={{margin:0,maxWidth:800}}>
        From an original cobalt/vermilion print into a second different
        two-ink illustration. The cut has a continuous, seeded cellulose edge,
        with protruding tiny paper fibres, a thin exposed shoulder and
        sheet-thickness shadows. No generic image wipe or crossfade.
        All original ink contours, halftone dots, type and paper grain remain
        full-resolution vector artwork.
      </p>
    </header>
    <section aria-label="RISO76 original edition film controls"
      style={{display:"flex",gap:11,flexWrap:"wrap",alignItems:"end",
        maxWidth:1190}}>
      <button type="button" style={button}
        aria-label={playing?"RISO76 pause film":"RISO76 play film"}
        onClick={()=>{
          if(!playing){
            atStart.current=frame>=total-1?0:frame;
            setFrame(atStart.current);
          }
          setPlaying(!playing);
        }}>{playing?"Pause":"Play"} / 24fps</button>
      <label style={{...panel,flex:"1 1 310px",minWidth:230}}>
        Absolute FilmStage frame {frame} / {total-1}
        <input type="range" min={0} max={total-1} value={frame}
          aria-label="RISO76 absolute film frame"
          onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
      </label>
      <label style={panel}>Paper tear direction
        <select aria-label="RISO76 tear direction" value={direction}
          onChange={e=>setDirection(e.target.value as RisoTearDirection)}>
          <option value="left-to-right">From left to right</option>
          <option value="right-to-left">From right to left</option>
          <option value="top-to-bottom">From top to bottom</option>
          <option value="bottom-to-top">From bottom to top</option>
        </select>
      </label>
      <label style={panel}>Sheet output
        <select aria-label="RISO76 paper sheet aspect" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 composition</option>
          <option value="portrait">9:16 composition</option>
        </select>
      </label>
      <label style={panel}>Fibre-torn irregularity · {Math.round(roughness*100)}%
        <input type="range" min={0} max={1} step=".05" value={roughness}
          aria-label="RISO76 paper tear roughness"
          onChange={e=>setRoughness(Number(e.target.value))}/>
      </label>
      <label style={panel}>Paper shoulder · {Math.round(thickness*100)}%
        <input type="range" min={0} max={1} step=".05" value={thickness}
          aria-label="RISO76 paper thickness"
          onChange={e=>setThickness(Number(e.target.value))}/>
      </label>
      <label style={panel}>Two-drums dry contact · {Math.round(contact*100)}%
        <input type="range" min={0} max={1} step=".05" value={contact}
          aria-label="RISO76 ink drum contact"
          onChange={e=>setContact(Number(e.target.value))}/>
      </label>
      <label style={panel}>Paper grain · {Math.round(paperGrain*100)}%
        <input type="range" min={0} max={1} step=".05" value={paperGrain}
          aria-label="RISO76 original paper texture"
          onChange={e=>setPaperGrain(Number(e.target.value))}/>
      </label>
      <label style={panel}>Edition fibre seed
        <input type="number" min={0} max={2147483647} step={1}
          aria-label="RISO76 tear seed" value={seed}
          onChange={e=>setSeed(Math.max(0,Math.min(2147483647,
            Math.floor(Number(e.target.value)||0))))}/>
      </label>
      <label style={panel}>Source camera · {zoom}×
        <select aria-label="RISO76 paper edge microscope zoom" value={zoom}
          onChange={e=>setZoom(Number(e.target.value))}>
          <option value={1}>1× edition</option><option value={2}>2× paper lip</option>
          <option value={3}>3× cellulose splinters</option>
        </select>
      </label>
      <label style={panel}>X focal point · {focusX}%
        <input type="range" min={0} max={100} value={focusX}
          aria-label="RISO76 paper lens X" onChange={e=>setFocusX(Number(e.target.value))}/>
      </label>
      <label style={panel}>Y focal point · {focusY}%
        <input type="range" min={0} max={100} value={focusY}
          aria-label="RISO76 paper lens Y" onChange={e=>setFocusY(Number(e.target.value))}/>
      </label>
      <label style={{display:"flex",alignItems:"center",gap:8,minHeight:41}}>
        <input type="checkbox" checked={reduce} aria-label="RISO76 reduced motion"
          onChange={e=>{setReduce(e.target.checked);setPlaying(false);}}/>
        Reduced motion / fully revealed
      </label>
    </section>
    <nav aria-label="RISO76 original paper movie beat navigation"
      style={{display:"flex",gap:7,flexWrap:"wrap",maxWidth:1060}}>
      {presets.map(([label,at])=><button type="button" key={label}
        onClick={()=>{setPlaying(false);setFrame(at);}}
        style={{...button,padding:"7px 10px",
          background:Math.abs(at-frame)<6?"#A74134":"#293F58"}}>
        {label}
      </button>)}
    </nav>
    <section aria-label="RISO76 FilmStage original full paper image"
      data-km-riso76-film=""
      style={{maxWidth:"100%",width:film.width,height:film.height,
        overflow:"hidden",background:outgoing.spec.paper,
        boxShadow:"0 15px 28px rgba(31,35,42,.17)"}}>
      <div data-km-riso76-camera=""
        style={{height:"100%",width:"100%",
          transform:`scale(${zoom})`,
          transformOrigin:`${focusX}% ${focusY}%`}}>
        {stage}
      </div>
    </section>
    <p style={{margin:0,maxWidth:1050,fontSize:13}}>
      {scene==="original"?"Edition I / untouched original spot masters":
        scene==="torn-collage"?"Physical ragged edge across two separately printed artworks":
        "Edition II / new original spot masters"}.
      {" "}Film sample {actual} / 232. A sheet physically tears, exposing
      source-native ink printed on a different whole sheet. The two drum
      masters and original pressure-fibre paths are not edited or
      rasterized. This is an illustration of print-collage physics,
      not evidence of actual paper-tear or measured RISO print defects.
    </p>
  </main>;
}
