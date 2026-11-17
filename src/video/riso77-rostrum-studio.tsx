import {useEffect,useMemo,useRef,useState} from "react";
import {compileFilm} from "../../registry/video/film-document";
import {FilmStage} from "../../registry/video/film-stage";
import {RisoPrint} from "../../registry/video/print-plates-react";
import {RisoRostrumStage} from "../../registry/video/riso-rostrum-react";
import type {RisoRostrumLayer} from "../../registry/video/riso-rostrum-react";
import {completedRisoFrame} from "../../registry/video/riso-sheet-feed";
import type {RisoAspect} from "./riso-print-demo";
import {risoExampleArtworks,risoExampleSpec} from "./riso-print-demo";
import {risoSecondSheetArtworks} from "./riso-print-demo-alt";
import {RISO77_ROSTRUM_FILM} from "./riso77-rostrum-film";

/** Entirely original (NOT a screenshot/flattened image) cutting plan:
 * every fragment has a named continuous closed pulp silhouette matched
 * to an existing independently authored spot-ink printed page. */
export function riso77OriginalCutoutLayers(aspect:RisoAspect):readonly RisoRostrumLayer[]{
  const sheet={
    spec:risoExampleSpec(aspect,37),
    artworks:risoSecondSheetArtworks(aspect),
  };
  return aspect==="landscape"?[
    {
      id:"typographic-arch",sheet,
      contour:"M36 69 C78 61 131 73 180 65 C252 74 326 61 414 70 L451 87 C459 117 443 161 452 200 L444 350 Q442 379 414 381 C345 376 290 384 212 379 C147 383 95 375 43 383 Q27 361 35 319 C32 259 40 214 32 172 Q35 111 36 69 Z",
      pivot:[229,225],entryOffset:[-570,-146],entryAngleDegrees:-19,
      depthMm:2.5,
    },
    {
      id:"river-ring-window",sheet,
      contour:"M691 72 C748 63 807 84 859 107 Q918 143 922 206 C940 267 922 340 890 404 C851 460 788 492 706 497 C643 502 570 476 521 435 C488 392 460 340 461 271 C457 209 489 157 536 121 Q599 75 691 72 Z",
      pivot:[691,273],entryOffset:[525,-240],entryAngleDegrees:23,
      depthMm:5.2,
    },
    {
      id:"letterpress-footer",sheet,
      contour:"M42 394 C126 386 196 394 281 387 C359 390 420 386 457 398 L465 499 C455 520 436 530 405 522 C325 529 259 523 191 529 C127 523 65 532 39 517 Q26 482 35 443 Z",
      pivot:[249,454],entryOffset:[-45,310],entryAngleDegrees:12,
      depthMm:7.6,
    },
  ]:[
    {
      id:"typographic-arch",sheet,
      contour:"M30 62 Q81 49 140 61 C232 54 294 63 361 56 Q450 48 503 63 C509 107 498 146 506 198 C503 245 512 293 498 338 C439 350 361 337 295 346 Q189 351 127 343 C72 350 33 349 26 330 C31 252 23 197 29 144 Z",
      pivot:[264,202],entryOffset:[-510,-215],entryAngleDegrees:-15,
      depthMm:2.5,
    },
    {
      id:"river-ring-window",sheet,
      contour:"M265 456 C325 450 393 470 441 514 C482 557 509 614 509 677 C503 742 480 806 431 852 Q365 923 272 927 C194 927 131 897 83 857 C42 816 20 747 21 681 C22 604 48 547 98 509 C138 471 197 451 265 456 Z",
      pivot:[267,694],entryOffset:[510,-130],entryAngleDegrees:21,
      depthMm:5.2,
    },
    {
      id:"letterpress-footer",sheet,
      contour:"M30 354 C116 346 188 362 271 352 C348 362 422 348 506 360 L510 462 C465 472 412 463 355 472 C261 470 173 475 88 470 Q30 475 25 460 Z",
      pivot:[267,414],entryOffset:[-65,580],entryAngleDegrees:16,
      depthMm:7.6,
    },
  ];
}
const label={display:"grid",gap:5,font:"600 13px/1.4 system-ui",minWidth:140} as const;
const btn={border:"1px solid #50555B",borderRadius:4,
  background:"#304A57",color:"#F5EBDD",padding:"9px 12px",
  minHeight:40,cursor:"pointer",font:"600 13px system-ui"} as const;
const beats=[["Original edition",12],["First fragments",56],
  ["Rostrum midpoint",113],["Paper settles",170],
  ["Finished collage",204]] as const;

/** Operator art-direction UI: the real RISO77 FilmStage component is reused
 * as a slot in any FD1 export. Controls keep local original paper/ink vectors;
 * the browser 1x/3x lens never manufactures fake scan details. */
export function RisoRostrumCollageStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(113);
  const [exposure,setExposure]=useState<1|2|3|4>(2);
  const [grain,setGrain]=useState(.53);
  const [inkContact,setInkContact]=useState(.35);
  const [cameraX,setCameraX]=useState(0);
  const [cameraY,setCameraY]=useState(0);
  const [lightX,setLightX]=useState(.9);
  const [lightY,setLightY]=useState(1.3);
  const [zoom,setZoom]=useState(1);
  const [focalX,setFocalX]=useState(24);
  const [focalY,setFocalY]=useState(40);
  const [reduce,setReduce]=useState(false);
  const [playing,setPlaying]=useState(false);
  const frameAtStart=useRef(frame);
  const filmResult=useMemo(()=>compileFilm(RISO77_ROSTRUM_FILM,{
    outputId:aspect,
  }),[aspect]);
  const base=useMemo(()=>({
    spec:risoExampleSpec(aspect,23),
    artworks:risoExampleArtworks(aspect),
  }),[aspect]);
  const cutouts=useMemo(()=>riso77OriginalCutoutLayers(aspect),[aspect]);
  const total=252;
  useEffect(()=>{
    if(!playing)return;
    const start=performance.now();
    let raf=0;
    const tick=(now:number)=>{
      const next=Math.min(total-1,frameAtStart.current+
        Math.floor((now-start)*24/1000));
      setFrame(next);
      if(next>=total-1)setPlaying(false);
      else raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[playing]);
  if(!filmResult.ok)return <pre role="alert">{
    filmResult.diagnostics.map(x=>x.path+": "+x.message).join("\n")
  }</pre>;
  const film=filmResult.film;
  const paper={paperGrain:grain,misregistration:.2,
    drumContact:{dryness:inkContact,feed:"top-to-bottom" as const},
    reducedMotion:true};
  const stage=<FilmStage film={film} frame={frame}
    renderObject={()=>null} reducedMotion={reduce}
    renderSlot={(content,ctx)=>{
      if(content.slot==="riso77-original")return <RisoPrint
        spec={base.spec} artworks={base.artworks}
        frame={completedRisoFrame(base.spec)} {...paper}
        label="Original uncut ocean print"/>;
      if(content.slot==="riso77-rostrum"||content.slot==="riso77-hold")
        return <RisoRostrumStage base={base} cutouts={cutouts}
          frame={content.slot==="riso77-hold"?144:ctx.frame}
          startFrame={0} durationFrames={143}
          exposureFrames={exposure}
          camera={[cameraX,cameraY]}
          lamp={[lightX,lightY]}
          paperGrain={grain}
          drumContact={paper.drumContact}
          misregistration={.2}
          reducedMotion={content.slot==="riso77-hold"||ctx.reducedMotion}
          label="Source-native Risograph rostrum-mounted three printed cutouts"/>;
      throw new RangeError("RISO77 unknown original paper slot "+content.slot);
    }}/>;
  const scene=frame<36?"original":frame<180?"mounting":"completed";
  return <main data-km-riso77-studio=""
    data-km-riso77-frame={frame}
    data-km-riso77-aspect={aspect}
    data-km-riso77-scene={scene}
    data-km-riso77-exposure={exposure}
    data-km-riso77-zoom={zoom}
    data-km-riso77-reduced={String(reduce)}
    style={{display:"grid",gap:16,alignContent:"start",
      padding:20,minHeight:"100vh",background:"#ECE1CF",
      color:"#2B4351",font:"14px/1.5 system-ui"}}>
    <header style={{maxWidth:940}}>
      <div style={{font:"800 12px system-ui",letterSpacing:1.8}}>
        RISOGRAPH / RISO77 / ORIGINAL STOP-MOTION PAPER ROSTRUM
      </div>
      <h1 style={{margin:"6px 0",
        font:"700 clamp(25px,3vw,36px)/1.17 Georgia,serif"}}>
        An edition made of moving printed paper
      </h1>
      <p style={{margin:0,maxWidth:880}}>
        Independently authored spot-ink drawings are scissor-cut into
        continuous paper silhouettes, then photographed as individual
        paper planes with real contact shadows, visible paper cores and
        a staggered stop-motion rhythm. The cobalt/vermilion ink details
        remain attached to each piece. No artificial halftone filter,
        monolithic screenshot or independently moving paper grain.
      </p>
    </header>
    <section aria-label="RISO77 stop-motion rostrum print controls"
      style={{display:"flex",alignItems:"end",flexWrap:"wrap",gap:12,
        maxWidth:1170}}>
      <button type="button" style={btn}
        aria-label={playing?"RISO77 pause film":"RISO77 play film"}
        onClick={()=>{
          if(!playing){
            frameAtStart.current=frame===total-1?0:frame;
            setFrame(frameAtStart.current);
          }
          setPlaying(!playing);
        }}>{playing?"Pause":"Play"} · 24 fps</button>
      <label style={{...label,flex:"1 1 320px"}}>
        FilmStage source frame {frame} / {total-1}
        <input aria-label="RISO77 source frame" type="range"
          min={0} max={total-1} value={frame}
          onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
      </label>
      <label style={label}>Output
        <select aria-label="RISO77 film aspect"
          value={aspect} onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 editorial landscape</option>
          <option value="portrait">9:16 vertical zine</option>
        </select>
      </label>
      <label style={label}>Exposure cadence
        <select aria-label="RISO77 stop motion exposure" value={exposure}
          onChange={e=>setExposure(Number(e.target.value) as 1|2|3|4)}>
          <option value={1}>On ones · 24 distinct poses/s</option>
          <option value={2}>On twos · 12 physical poses/s</option>
          <option value={3}>On threes · 8 poses/s</option>
          <option value={4}>On fours · 6 poses/s</option>
        </select>
      </label>
      <label style={label}>Paper &amp; stencil grain · {Math.round(grain*100)}%
        <input type="range" min={0} max={1} step=".05" value={grain}
          aria-label="RISO77 original paper grain"
          onChange={e=>setGrain(Number(e.target.value))}/>
      </label>
      <label style={label}>Independent drum-contact grain · {Math.round(inkContact*100)}%
        <input type="range" min={0} max={1} step=".05" value={inkContact}
          aria-label="RISO77 original ink contact"
          onChange={e=>setInkContact(Number(e.target.value))}/>
      </label>
      <label style={label}>Rostrum camera X · {cameraX}
        <input type="range" min={-80} max={80} value={cameraX}
          aria-label="RISO77 camera track X"
          onChange={e=>setCameraX(Number(e.target.value))}/>
      </label>
      <label style={label}>Rostrum camera Y · {cameraY}
        <input type="range" min={-80} max={80} value={cameraY}
          aria-label="RISO77 camera track Y"
          onChange={e=>setCameraY(Number(e.target.value))}/>
      </label>
      <label style={label}>Paper lamp X · {lightX}
        <input type="range" min={-3} max={3} step=".1" value={lightX}
          aria-label="RISO77 lamp X"
          onChange={e=>setLightX(Number(e.target.value))}/>
      </label>
      <label style={label}>Paper lamp Y · {lightY}
        <input type="range" min={-3} max={3} step=".1" value={lightY}
          aria-label="RISO77 lamp Y"
          onChange={e=>setLightY(Number(e.target.value))}/>
      </label>
      <label style={label}>Microscope · {zoom}×
        <select aria-label="RISO77 paper microscope zoom" value={zoom}
          onChange={e=>setZoom(Number(e.target.value))}>
          <option value={1}>1× whole printed composition</option>
          <option value={2}>2× paper seam and shadow</option>
          <option value={3}>3× source ink dot and paper lip</option>
        </select>
      </label>
      <label style={label}>X focal point · {focalX}%
        <input type="range" min={0} max={100} value={focalX}
          aria-label="RISO77 lens X" onChange={e=>setFocalX(Number(e.target.value))}/>
      </label>
      <label style={label}>Y focal point · {focalY}%
        <input type="range" min={0} max={100} value={focalY}
          aria-label="RISO77 lens Y" onChange={e=>setFocalY(Number(e.target.value))}/>
      </label>
      <label style={{display:"flex",alignItems:"center",gap:9,minHeight:42}}>
        <input aria-label="RISO77 reduced motion" type="checkbox"
          checked={reduce} onChange={e=>{setReduce(e.target.checked);
            setPlaying(false);}}/>
        Reduced motion / completed mounting
      </label>
    </section>
    <nav aria-label="RISO77 source paper film beats"
      style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {beats.map(([name,at])=><button key={name}
        type="button" onClick={()=>{setPlaying(false);setFrame(at);}}
        style={{...btn,padding:"7px 10px",
          background:Math.abs(frame-at)<6?"#A44338":"#304A57"}}>{name}</button>)}
    </nav>
    <section aria-label="RISO77 original layered printed-paper FilmStage"
      data-km-riso77-film="" style={{
        width:film.width,height:film.height,maxWidth:"100%",
        overflow:"hidden",background:base.spec.paper,
        boxShadow:"0 15px 31px rgba(21,28,31,.18)"}}>
      <div data-km-riso77-camera="" style={{
        width:"100%",height:"100%",transform:`scale(${zoom})`,
        transformOrigin:`${focalX}% ${focalY}%`}}>
        {stage}
      </div>
    </section>
    <p style={{margin:0,maxWidth:950,fontSize:13}}>
      Three separately mounted original print cutouts, each with its
      own closed paper silhouette, stencil halftone and ink-pressure
      topology. Motion occurs on {exposure===1?"ones":exposure===2?"twos":
        exposure===3?"threes":"fours"} within the single 24fps FilmStage.
      Lamp shadows follow actual layer lift; the paper's source inks
      remain registration-locked at every camera angle. This is
      tactile print animation, not a measurement of an actual press.
    </p>
  </main>;
}
