import {useEffect,useMemo,useRef,useState} from "react";
import {FilmStage} from "../../registry/video/film-stage";
import {compileFilm} from "../../registry/video/film-document";
import {RisoSlatTheatre} from "../../registry/video/riso-slat-reveal-react";
import {risoSlatProgress} from "../../registry/video/riso-slat-reveal";
import type {RisoSlatAxis,RisoSlatDirection} from "../../registry/video/riso-slat-reveal";
import type {RisoAspect} from "./riso-print-demo";
import {risoExampleSpec,risoExampleArtworks} from "./riso-print-demo";
import {risoSecondSheetArtworks} from "./riso-print-demo-alt";
import {RISO81_SLAT_FILM} from "./riso81-slat-film";

const label={display:"grid",gap:5,font:"600 13px/1.35 system-ui",minWidth:170} as const;
const button={padding:"9px 12px",border:"1px solid #263F59",background:"#263F59",
  color:"#FAF1E2",borderRadius:5,minHeight:40,font:"600 13px system-ui",cursor:"pointer"} as const;
const beats=[["Original cover",12],["Slats enter",55],["Interleave midpoint",108],
  ["Paper end stop",179],["Reconstructed print",210]] as const;

/** Interactive native FilmStage proof for the RISO81 slat comb. */
export function RisoSlatRevealStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(108);
  const [axis,setAxis]=useState<RisoSlatAxis>("horizontal");
  const [direction,setDirection]=useState<RisoSlatDirection>("right");
  const [count,setCount]=useState(12);
  const [overlapMm,setOverlapMm]=useState(.32);
  const [stagger,setStagger]=useState(.22);
  const [paperThicknessMm,setPaperThicknessMm]=useState(.24);
  const [slotClearanceMm,setSlotClearanceMm]=useState(.08);
  const [relief,setRelief]=useState(.72);
  const [grain,setGrain]=useState(.57);
  const [registration,setRegistration]=useState(.22);
  const [seed,setSeed]=useState(81);
  const [zoom,setZoom]=useState(1);
  const [reduce,setReduce]=useState(false);
  const [playing,setPlaying]=useState(false);
  const playbackHead=useRef(frame);
  const compiled=useMemo(()=>compileFilm(RISO81_SLAT_FILM,{outputId:aspect}),[aspect]);
  const cover=useMemo(()=>({
    spec:risoExampleSpec(aspect,23),
    artworks:risoExampleArtworks(aspect),
  }),[aspect]);
  const insert=useMemo(()=>({
    spec:risoExampleSpec(aspect,38),
    artworks:risoSecondSheetArtworks(aspect),
  }),[aspect]);
  const interleaveDepthMm=Math.max(.42,paperThicknessMm+slotClearanceMm+.1);
  useEffect(()=>{
    if(!playing)return;
    const initial=playbackHead.current;
    const start=performance.now();
    let raf=0;
    const tick=(now:number)=>{
      const next=Math.min(239,initial+Math.floor((now-start)*24/1000));
      setFrame(next);
      if(next===239)setPlaying(false);
      else raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[playing]);
  if(!compiled.ok)return <pre role="alert">{compiled.diagnostics.map(
    d=>d.path+": "+d.message).join("\n")}</pre>;
  const film=compiled.film;
  const stage=<FilmStage film={film} frame={frame}
    reducedMotion={reduce} renderObject={()=>null}
    renderSlot={(content,context)=>{
      let progress=0;
      if(content.slot==="riso81-pull")
        progress=risoSlatProgress(context.frame,0,143,context.reducedMotion);
      else if(content.slot==="riso81-revealed")progress=1;
      else if(content.slot!=="riso81-held")
        throw new RangeError("RISO81 unsupported paper source: "+content.slot);
      if(context.reducedMotion)progress=1;
      return <RisoSlatTheatre cover={cover} insert={insert}
        axis={axis} direction={direction} count={count} progress={progress}
        seed={seed} overlapMm={overlapMm} stagger={stagger} paperThicknessMm={paperThicknessMm}
        slotClearanceMm={slotClearanceMm} interleaveDepthMm={interleaveDepthMm}
        paperRelief={relief} paperGrain={grain} misregistration={registration}
        label="Two complete original Risograph masters joined by a collision-safe interleaved paper slat comb"/>;
    }}/>;
  const phase=frame<36?"held":frame<180?"moving":"revealed";
  return <main data-km-riso81-studio=""
    data-km-riso81-frame={frame}
    data-km-riso81-phase={phase}
    data-km-riso81-axis={axis}
    data-km-riso81-direction={direction}
    data-km-riso81-aspect={aspect}
    data-km-riso81-slat-count={count}
    data-km-riso81-reduced={String(reduce)}
    style={{background:"#EAE1D0",color:"#263F59",minHeight:"100vh",
      padding:20,display:"grid",gap:15,alignContent:"start",font:"14px/1.5 system-ui"}}>
    <header style={{maxWidth:1000}}>
      <div style={{font:"800 12px system-ui",letterSpacing:2}}>
        RISOGRAPH / RISO81 / INTERLEAVED ORIGINAL PAPER SLATS
      </div>
      <h1 style={{font:"700 clamp(24px,3vw,37px)/1.14 Georgia,serif",margin:"7px 0"}}>
        Dissolving views · printed slat theatre
      </h1>
      <p style={{margin:0}}>
        The stationary original cover is replaced by a second complete print,
        cut into individually moving strips. One pull tab drives the strips
        through ordered slots with bounded per-slot timing. Alternating depth
        lanes permit a measured paper lap without coplanar collisions; each
        spot-ink master stays source-locked.
      </p>
    </header>
    <section aria-label="RISO81 paper slat controls"
      style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"end",maxWidth:1240}}>
      <button type="button" style={button}
        aria-label={playing?"RISO81 pause film":"RISO81 play film"}
        onClick={()=>{
          if(!playing){
            playbackHead.current=frame===239?0:frame;
            setFrame(playbackHead.current);
          }
          setPlaying(!playing);
        }}>{playing?"Pause":"Play"} · 24fps</button>
      <label style={{...label,flex:"1 1 290px"}}>
        Absolute FilmStage frame {frame} / 239
        <input aria-label="RISO81 absolute film frame" type="range"
          min={0} max={239} step={1} value={frame}
          onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
      </label>
      <label style={label}>Paper format
        <select aria-label="RISO81 aspect" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 original press</option>
          <option value="portrait">9:16 separate original press</option>
        </select>
      </label>
      <label style={label}>Slat orientation
        <select aria-label="RISO81 slat axis" value={axis}
          onChange={e=>{
            const next=e.target.value as RisoSlatAxis;
            setAxis(next);setDirection(next==="horizontal"?"right":"down");
          }}>
          <option value="horizontal">Horizontal rows</option>
          <option value="vertical">Vertical columns</option>
        </select>
      </label>
      <label style={label}>Comb travel
        <select aria-label="RISO81 slat direction" value={direction}
          onChange={e=>setDirection(e.target.value as RisoSlatDirection)}>
          {axis==="horizontal"?<>
            <option value="right">Enter from left · right</option>
            <option value="left">Enter from right · left</option>
          </>:<>
            <option value="down">Enter from above · down</option>
            <option value="up">Enter from below · up</option>
          </>}
        </select>
      </label>
      <label style={label}>Interleaved slats · {count}
        <input aria-label="RISO81 slat count" type="range"
          min={4} max={24} step={2} value={count}
          onChange={e=>setCount(Number(e.target.value))}/>
      </label>
      <label style={label}>Paper lap · {overlapMm.toFixed(2)} mm
        <input aria-label="RISO81 slat overlap" type="range"
          min={0} max={.7} step={.02} value={overlapMm}
          onChange={e=>setOverlapMm(Number(e.target.value))}/>
      </label>
      <label style={label}>Slot timing stagger · {Math.round(stagger*100)}%
        <input aria-label="RISO81 slat stagger" type="range"
          min={0} max={.45} step=".01" value={stagger}
          onChange={e=>setStagger(Number(e.target.value))}/>
      </label>
      <label style={label}>Stock caliper · {paperThicknessMm.toFixed(2)} mm
        <input aria-label="RISO81 paper thickness" type="range"
          min={.08} max={1.2} step={.04} value={paperThicknessMm}
          onChange={e=>setPaperThicknessMm(Number(e.target.value))}/>
      </label>
      <label style={label}>Slot clearance · {slotClearanceMm.toFixed(2)} mm
        <input aria-label="RISO81 slot clearance" type="range"
          min={.02} max={.6} step={.02} value={slotClearanceMm}
          onChange={e=>setSlotClearanceMm(Number(e.target.value))}/>
      </label>
      <label style={label}>Interleave depth · {interleaveDepthMm.toFixed(2)} mm
        <output aria-label="RISO81 interleave depth">{interleaveDepthMm.toFixed(2)} mm</output>
      </label>
      <label style={label}>Cut-edge relief · {Math.round(relief*100)}%
        <input aria-label="RISO81 paper relief" type="range"
          min={0} max={1} step=".05" value={relief}
          onChange={e=>setRelief(Number(e.target.value))}/>
      </label>
      <label style={label}>Original paper tooth · {Math.round(grain*100)}%
        <input aria-label="RISO81 paper grain" type="range"
          min={0} max={1} step=".05" value={grain}
          onChange={e=>setGrain(Number(e.target.value))}/>
      </label>
      <label style={label}>Plate registration · {registration.toFixed(2)}
        <input aria-label="RISO81 plate registration" type="range"
          min={0} max={1} step=".05" value={registration}
          onChange={e=>setRegistration(Number(e.target.value))}/>
      </label>
      <label style={label}>Paper seed
        <input aria-label="RISO81 paper seed" type="number"
          min={0} max={2147483647} step={1} value={seed}
          onChange={e=>setSeed(Math.max(0,Math.min(2147483647,
            Math.floor(Number(e.target.value)||0))))}/>
      </label>
      <label style={label}>Source microscope
        <select aria-label="RISO81 source microscope zoom"
          value={zoom} onChange={e=>setZoom(Number(e.target.value))}>
          <option value={1}>1× whole print</option>
          <option value={2}>2× slat edge</option>
          <option value={3}>3× native paper fibres</option>
        </select>
      </label>
      <label style={{display:"flex",alignItems:"center",gap:7,minHeight:42}}>
        <input type="checkbox" aria-label="RISO81 reduced motion"
          checked={reduce} onChange={e=>{setReduce(e.target.checked);setPlaying(false);}}/>
        Reduced motion · completed printed slat state
      </label>
    </section>
    <nav aria-label="RISO81 actual 24fps film beats"
      style={{display:"flex",flexWrap:"wrap",gap:8}}>
      {beats.map(([name,at])=><button type="button" key={name}
        style={{...button,background:Math.abs(at-frame)<7?"#A74736":"#263F59"}}
        onClick={()=>{setPlaying(false);setFrame(at);}}>{name}</button>)}
    </nav>
    <section data-km-riso81-film=""
      aria-label="RISO81 native original interleaved printed paper slat reveal"
      style={{width:film.width,height:film.height,maxWidth:"100%",overflow:"hidden",
        background:cover.spec.paper,boxShadow:"0 20px 36px rgba(44,37,29,.18)"}}>
      <div data-km-riso81-camera="" style={{
        width:"100%",height:"100%",transform:"scale("+zoom+")",
        transformOrigin:"center center"}}>{stage}</div>
    </section>
    <p style={{fontSize:13,maxWidth:1000,margin:0}}>
      Each moving band is clipped from the complete second spot-ink master and
      follows its own along-axis slot trajectory from one shared pull state.
      Adjacent bands alternate between two calibrated depth lanes; overlap is
      bounded by slot pitch and lane clearance must exceed caliper plus slot clearance. This is a
      deterministic 2.5D paper-engineering model, not a friction, tear-force
      or physical die-cut simulation.
    </p>
  </main>;
}
