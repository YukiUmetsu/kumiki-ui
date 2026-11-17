import {useEffect,useMemo,useRef,useState} from "react";
import {compileFilm} from "../../registry/video/film-document";
import {FilmStage} from "../../registry/video/film-stage";
import {RisoAccordionPrintedZine}
  from "../../registry/video/riso-accordion-react";
import {risoAccordionOpenness} from "../../registry/video/riso-accordion-projection";
import type {RisoAccordionAxis}
  from "../../registry/video/riso-accordion-projection";
import type {RisoAspect} from "./riso-print-demo";
import {risoExampleSpec,risoExampleArtworks} from "./riso-print-demo";
import {RISO78_ACCORDION_FILM} from "./riso78-accordion-film";

const label={display:"grid",gap:4,font:"600 13px/1.35 system-ui",
  minWidth:170} as const;
const button={border:"1px solid #354C63",borderRadius:4,
  background:"#27435E",color:"#F7EEE2",padding:"8px 12px",
  minHeight:39,cursor:"pointer",font:"600 13px system-ui"} as const;
const beats=[["Folded edition",23],["First page",56],
  ["Alternating faces",112],["Almost open",174],
  ["Original print",205]] as const;

/** RISO78 editorial art demonstration. One entire original printed page is
 * NEVER fragmented into unrelated pieces or flattened screenshots; source
 * plate paths remain the same as its open full-size two-ink illustration. */
export function RisoAccordionPrintedFilmStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(112);
  const [panels,setPanels]=useState(4);
  const [axis,setAxis]=useState<RisoAccordionAxis>("vertical");
  const [relief,setRelief]=useState(.70);
  const [grain,setGrain]=useState(.55);
  const [dryness,setDryness]=useState(.30);
  const [seed,setSeed]=useState(78);
  const [zoom,setZoom]=useState(1);
  const [focusX,setFocusX]=useState(51);
  const [focusY,setFocusY]=useState(51);
  const [reduce,setReduce]=useState(false);
  const [playing,setPlaying]=useState(false);
  const startedAt=useRef(frame);
  const compiled=useMemo(()=>
    compileFilm(RISO78_ACCORDION_FILM,{outputId:aspect}),[aspect]);
  const sheet=useMemo(()=>({
    spec:risoExampleSpec(aspect,23),
    artworks:risoExampleArtworks(aspect),
  }),[aspect]);
  const total=248;
  useEffect(()=>{
    if(!playing)return;
    const start=performance.now();
    let raf=0;
    const tick=(now:number)=>{
      const next=Math.min(total-1,startedAt.current+
        Math.floor((now-start)*24/1000));
      setFrame(next);
      if(next===total-1)setPlaying(false);
      else raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[playing]);
  if(!compiled.ok)return <pre role="alert">{
    compiled.diagnostics.map(x=>x.path+": "+x.message).join("\n")
  }</pre>;
  const film=compiled.film;
  const paper={
    sheet,panels,axis,paperStockRelief:relief,
    paperGrain:grain,seed,
    drumContact:{dryness,feed:"top-to-bottom" as const},
  };
  const stage=<FilmStage
    film={film} frame={frame} reducedMotion={reduce}
    renderObject={()=>null} renderSlot={(content,ctx)=>{
      let openness:number;
      if(content.slot==="riso78-closed")openness=0;
      else if(content.slot==="riso78-open")openness=1;
      else if(content.slot==="riso78-unfold")
        openness=risoAccordionOpenness(ctx.frame,0,143,ctx.reducedMotion);
      else throw new RangeError("RISO78 unsupported original fold slot "+content.slot);
      if(ctx.reducedMotion)openness=1;
      return <RisoAccordionPrintedZine {...paper}
        openness={openness} label="One original two-ink print shown as connected folded paper"/>;
    }}/>;
  const scene=frame<40?"folded":frame<184?"unfolding":"open";
  return <main data-km-riso78-studio=""
    data-km-riso78-frame={frame}
    data-km-riso78-scene={scene}
    data-km-riso78-axis={axis}
    data-km-riso78-panels={panels}
    data-km-riso78-aspect={aspect}
    data-km-riso78-zoom={zoom}
    data-km-riso78-reduced={String(reduce)}
    style={{padding:20,minHeight:"100vh",display:"grid",gap:16,
      alignContent:"start",background:"#EAE2D2",color:"#273E52",
      font:"14px/1.5 system-ui"}}>
    <header style={{maxWidth:900}}>
      <div style={{font:"800 12px system-ui",letterSpacing:2}}>
        RISOGRAPH / RISO78 / ONE CONTINUOUS ORIGINAL PRINT
      </div>
      <h1 style={{font:"700 clamp(25px,3vw,36px)/1.15 Georgia,serif",
        margin:"7px 0"}}>
        The printed accordion · one unbroken picture
      </h1>
      <p style={{margin:0}}>
        Independent cobalt and vermilion stencil art folds into four
        physically connected paper panels. The optical rostrum projection
        preserves every source-drawn contour, screen dot, paper opening,
        hand-scored crease and original ink registration while the sheet
        unfolds to its EXACT full-size printed composition.
      </p>
    </header>
    <section aria-label="RISO78 single print paper fold and camera controls"
      style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end",
        maxWidth:1210}}>
      <button type="button" style={button}
        aria-label={playing?"RISO78 pause film":"RISO78 play film"}
        onClick={()=>{
          if(!playing){
            startedAt.current=frame>=total-1?0:frame;
            setFrame(startedAt.current);
          }
          setPlaying(!playing);
        }}>{playing?"Pause":"Play"} / 24fps</button>
      <label style={{...label,flex:"1 1 280px"}}>
        Original FilmStage sample {frame} / 247
        <input type="range" min={0} max={247} step={1}
          aria-label="RISO78 absolute source frame"
          value={frame} onChange={e=>{
            setPlaying(false);setFrame(Number(e.target.value));
          }}/>
      </label>
      <label style={label}>Paper composition
        <select aria-label="RISO78 film aspect" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 landscape</option>
          <option value="portrait">9:16 portrait</option>
        </select>
      </label>
      <label style={label}>Physical accordion score
        <select aria-label="RISO78 fold direction" value={axis}
          onChange={e=>setAxis(e.target.value as RisoAccordionAxis)}>
          <option value="vertical">Vertical mountain/valley creases</option>
          <option value="horizontal">Horizontal mountain/valley creases</option>
        </select>
      </label>
      <label style={label}>Connected paper panels · {panels}
        <input type="range" min={3} max={8} step={1}
          aria-label="RISO78 original sheet panel count" value={panels}
          onChange={e=>setPanels(Number(e.target.value))}/>
      </label>
      <label style={label}>Crease and paper relief · {Math.round(relief*100)}%
        <input type="range" min={0} max={1} step=".05"
          aria-label="RISO78 physical paper fold relief" value={relief}
          onChange={e=>setRelief(Number(e.target.value))}/>
      </label>
      <label style={label}>Paper fibres · {Math.round(grain*100)}%
        <input type="range" min={0} max={1} step=".05"
          aria-label="RISO78 original paper fibres" value={grain}
          onChange={e=>setGrain(Number(e.target.value))}/>
      </label>
      <label style={label}>Independent ink contact · {Math.round(dryness*100)}%
        <input type="range" min={0} max={1} step=".05"
          aria-label="RISO78 original drum dryness" value={dryness}
          onChange={e=>setDryness(Number(e.target.value))}/>
      </label>
      <label style={label}>Physical paper seed
        <input type="number" min={0} max={2147483647} step={1}
          aria-label="RISO78 scored paper seed" value={seed}
          onChange={e=>setSeed(Math.max(0,Math.min(2147483647,
            Math.floor(Number(e.target.value)||0))))}/>
      </label>
      <label style={label}>Camera microscope · {zoom}×
        <select aria-label="RISO78 camera microscope zoom" value={zoom}
          onChange={e=>setZoom(Number(e.target.value))}>
          <option value={1}>1× whole zine</option>
          <option value={2}>2× paper score</option>
          <option value={3}>3× original halftone and crease fibre</option>
        </select>
      </label>
      <label style={label}>Lens X · {focusX}%
        <input type="range" min={0} max={100} value={focusX}
          aria-label="RISO78 camera X" onChange={e=>setFocusX(Number(e.target.value))}/>
      </label>
      <label style={label}>Lens Y · {focusY}%
        <input type="range" min={0} max={100} value={focusY}
          aria-label="RISO78 camera Y" onChange={e=>setFocusY(Number(e.target.value))}/>
      </label>
      <label style={{display:"flex",gap:8,alignItems:"center",minHeight:42}}>
        <input type="checkbox" aria-label="RISO78 reduced motion"
          checked={reduce} onChange={e=>{
            setReduce(e.target.checked);setPlaying(false);
          }}/>
        Reduced motion · fully open original
      </label>
    </section>
    <nav aria-label="RISO78 original print film beats"
      style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {beats.map(([name,at])=><button type="button"
        key={name} style={{...button,padding:"7px 11px",
          background:Math.abs(at-frame)<6?"#A14739":"#27435E"}}
        onClick={()=>{setPlaying(false);setFrame(at);}}>{name}</button>)}
    </nav>
    <section data-km-riso78-film=""
      aria-label="RISO78 continuous original printed paper accordion"
      style={{width:film.width,height:film.height,maxWidth:"100%",
        overflow:"hidden",background:sheet.spec.paper,
        boxShadow:"0 17px 33px rgba(40,34,29,.18)"}}>
      <div data-km-riso78-camera="" style={{width:"100%",height:"100%",
        transform:`scale(${zoom})`,
        transformOrigin:`${focusX}% ${focusY}%`}}>
        {stage}
      </div>
    </section>
    <p style={{margin:0,maxWidth:970,fontSize:13}}>
      This is a single original continuous two-drum image physically divided
      into alternating scored paper panels, not a montage of separate
      rectangular photographs. Every 24fps frame reuses the same original
      stroke paths, cellulose fibre positions, and optical ink dots.
      The closed/open geometry is art-directed 2.5D paper projection,
      not a scientific fold-mechanism model or a certified print sample.
    </p>
  </main>;
}
