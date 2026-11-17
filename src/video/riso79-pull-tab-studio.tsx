import {useEffect,useMemo,useRef,useState} from "react";
import {FilmStage} from "../../registry/video/film-stage";
import {compileFilm} from "../../registry/video/film-document";
import {RisoPullTabTheatre} from "../../registry/video/riso-pull-tab-react";
import {risoPullProgress} from "../../registry/video/riso-pull-tab";
import type {RisoPullDirection,RisoPullWindow} from "../../registry/video/riso-pull-tab";
import type {RisoAspect} from "./riso-print-demo";
import {risoExampleSpec,risoExampleArtworks} from "./riso-print-demo";
import {risoSecondSheetArtworks} from "./riso-print-demo-alt";
import {RISO79_PULL_TAB_FILM} from "./riso79-pull-tab-film";

const label={display:"grid",gap:5,font:"600 13px/1.35 system-ui",
  minWidth:170} as const;
const button={padding:"9px 12px",border:"1px solid #263F59",
  background:"#263F59",color:"#FAF1E2",borderRadius:5,minHeight:40,
  font:"600 13px system-ui",cursor:"pointer"} as const;
const beats=[["Intact cover",12],["First pull",58],
  ["Halfway reveal",110],["Paper end stop",187],["Printed hold",230]] as const;
/** Original interactive paper stage. This storyboard reuses the production
 * print masters and FilmStage slot rather than a Storybook-only animation. */
export function RisoPullTabFilmStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(110);
  const [direction,setDirection]=useState<RisoPullDirection>("right");
  const [windowCount,setWindowCount]=useState(3);
  const [windowShape,setWindowShape]=useState<"rounded"|"organic">("rounded");
  const [relief,setRelief]=useState(.72);
  const [depthMm,setDepthMm]=useState(.32);
  const [lampAngle,setLampAngle]=useState(225);
  const [grain,setGrain]=useState(.57);
  const [dryness,setDryness]=useState(.22);
  const [registration,setRegistration]=useState(.22);
  const [seed,setSeed]=useState(79);
  const [zoom,setZoom]=useState(1);
  const [focusX,setFocusX]=useState(64);
  const [focusY,setFocusY]=useState(50);
  const [reduce,setReduce]=useState(false);
  const [playing,setPlaying]=useState(false);
  const playbackHead=useRef(frame);
  const compiled=useMemo(()=>
    compileFilm(RISO79_PULL_TAB_FILM,{outputId:aspect}),[aspect]);
  const cover=useMemo(()=>({
    spec:risoExampleSpec(aspect,23),
    artworks:risoExampleArtworks(aspect),
  }),[aspect]);
  const insert=useMemo(()=>({
    spec:risoExampleSpec(aspect,38),
    artworks:risoSecondSheetArtworks(aspect),
  }),[aspect]);
  const windows=useMemo(():readonly RisoPullWindow[]=>{
    const landscapeRounded:readonly RisoPullWindow[]=[
      {id:"left-slit",x:472,y:164,width:110,height:218,radius:10},
      {id:"centre-slit",x:601,y:164,width:110,height:218,radius:10},
      {id:"right-slit",x:730,y:164,width:110,height:218,radius:10},
    ];
    const landscapeOrganic:readonly RisoPullWindow[]=[
      {id:"left-slit",x:472,y:164,width:110,height:218,contour:
        "M 526 164 C 547 164 571 180 574 204 C 578 227 559 245 567 267 C 576 292 559 324 543 358 C 532 381 512 378 502 360 C 489 336 505 310 495 286 C 485 264 496 242 485 219 C 476 197 499 171 526 164 Z"},
      {id:"centre-slit",x:601,y:164,width:110,height:218,contour:
        "M 656 164 C 676 168 698 187 699 211 C 700 234 681 249 688 271 C 696 294 680 326 664 358 C 652 380 633 378 624 359 C 612 336 628 310 617 286 C 606 263 617 242 607 219 C 604 197 626 170 656 164 Z"},
      {id:"right-slit",x:730,y:164,width:110,height:218,contour:
        "M 785 164 C 806 168 828 187 829 210 C 830 234 810 250 819 273 C 828 297 811 329 795 358 C 782 380 762 379 754 360 C 742 337 759 309 748 286 C 737 262 748 241 738 218 C 730 197 756 170 785 164 Z"},
    ];
    const portraitRounded:readonly RisoPullWindow[]=[
      {id:"left-slit",x:195,y:650,width:40,height:180,radius:8},
      {id:"centre-slit",x:244,y:650,width:40,height:180,radius:8},
      {id:"right-slit",x:293,y:650,width:40,height:180,radius:8},
    ];
    const portraitOrganic:readonly RisoPullWindow[]=[
      {id:"left-slit",x:195,y:650,width:40,height:180,contour:
        "M 215 650 C 226 652 234 668 232 688 C 230 707 221 720 225 740 C 229 761 223 784 221 803 C 219 818 216 830 210 830 C 204 830 199 818 200 803 C 202 783 197 762 200 741 C 203 721 198 706 200 688 C 198 670 205 654 215 650 Z"},
      {id:"centre-slit",x:244,y:650,width:40,height:180,contour:
        "M 264 650 C 275 652 283 668 281 688 C 279 707 269 720 274 740 C 278 761 272 784 270 803 C 268 818 265 830 259 830 C 253 830 248 818 249 803 C 251 783 246 762 249 741 C 252 721 247 706 249 688 C 247 670 254 654 264 650 Z"},
      {id:"right-slit",x:293,y:650,width:40,height:180,contour:
        "M 313 650 C 324 652 332 668 330 688 C 328 707 318 720 323 740 C 327 761 321 784 319 803 C 317 818 314 830 308 830 C 302 830 297 818 298 803 C 300 783 295 762 298 741 C 301 721 296 706 298 688 C 296 670 303 654 313 650 Z"},
    ];
    const candidates=aspect==="landscape"?
      (windowShape==="organic"?landscapeOrganic:landscapeRounded):
      (windowShape==="organic"?portraitOrganic:portraitRounded);
    return candidates.slice(0,windowCount);
  },[aspect,windowCount,windowShape]);
  const travel=(direction==="left"||direction==="right"?
    cover.spec.width:cover.spec.height)*.115;
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
  const lampRadians=lampAngle*Math.PI/180;
  const lightDirection:readonly [number,number]=[
    Math.cos(lampRadians),Math.sin(lampRadians),
  ];
  const props={cover,insert,windows,direction,travel,seed,
    paperRelief:relief,paperDepthMm:depthMm,lightDirection,
    paperGrain:grain,misregistration:registration,
    drumContact:{dryness,feed:"top-to-bottom" as const}};
  const film=compiled.film;
  const stage=<FilmStage film={film} frame={frame}
    reducedMotion={reduce} renderObject={()=>null}
    renderSlot={(content,context)=>{
      let progress=0;
      if(content.slot==="riso79-revealed")progress=1;
      else if(content.slot==="riso79-pull")
        progress=risoPullProgress(context.frame,0,143,context.reducedMotion);
      else if(content.slot!=="riso79-held")
        throw new RangeError("RISO79 unsupported paper source: "+content.slot);
      if(context.reducedMotion)progress=1;
      return <RisoPullTabTheatre {...props} progress={progress}
        label="Three physical cut-paper windows exposing one intact separately printed two-ink slider"/>;
    }}/>;
  const phase=frame<36?"held":frame<180?"moving":"revealed";
  return <main data-km-riso79-studio=""
    data-km-riso79-frame={frame}
    data-km-riso79-phase={phase}
    data-km-riso79-windows={windowCount}
    data-km-riso79-shape-preset={windowShape}
    data-km-riso79-direction={direction}
    data-km-riso79-aspect={aspect}
    data-km-riso79-zoom={zoom}
    data-km-riso79-reduced={String(reduce)}
    style={{background:"#EAE1D0",color:"#263F59",minHeight:"100vh",
      padding:20,display:"grid",gap:15,alignContent:"start",
      font:"14px/1.5 system-ui"}}>
    <header style={{maxWidth:970}}>
      <div style={{font:"800 12px system-ui",letterSpacing:2}}>
        RISOGRAPH / RISO79 / KINETIC ORIGINAL PAPER PRINTS
      </div>
      <h1 style={{font:"700 clamp(24px,3vw,37px)/1.14 Georgia,serif",
        margin:"7px 0"}}>Cut-paper windows · moving printed underlay</h1>
      <p style={{margin:0}}>
        One complete original cobalt and vermilion cover, physically
        pierced by hand-cut windows, stays still. A second independent
        complete printed sheet moves under the paper. Ink dot screens,
        pressure-formed contact fibres, registration, poster typography
        and each microscopic window rim remain native SVG artwork.
      </p>
    </header>
    <section aria-label="RISO79 original print and paper mechanism controls"
      style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"end",maxWidth:1210}}>
      <button type="button" style={button}
        aria-label={playing?"RISO79 pause film":"RISO79 play film"}
        onClick={()=>{
          if(!playing){
            playbackHead.current=frame===239?0:frame;
            setFrame(playbackHead.current);
          }
          setPlaying(!playing);
        }}>{playing?"Pause":"Play"} · 24fps</button>
      <label style={{...label,flex:"1 1 290px"}}>
        Absolute FilmStage frame {frame} / 239
        <input aria-label="RISO79 absolute film frame" type="range"
          min={0} max={239} step={1} value={frame}
          onChange={e=>{setPlaying(false);setFrame(Number(e.target.value));}}/>
      </label>
      <label style={label}>Paper format
        <select aria-label="RISO79 aspect" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 original press</option>
          <option value="portrait">9:16 separate original press</option>
        </select>
      </label>
      <label style={label}>Pull-tab paper direction
        <select aria-label="RISO79 pull direction" value={direction}
          onChange={e=>setDirection(e.target.value as RisoPullDirection)}>
          <option value="right">Pull right</option>
          <option value="left">Pull left</option>
          <option value="up">Pull up</option>
          <option value="down">Pull down</option>
        </select>
      </label>
      <label style={label}>Window contour
        <select aria-label="RISO79 window shape" value={windowShape}
          onChange={e=>setWindowShape(e.target.value as "rounded"|"organic")}>
          <option value="rounded">Rounded die-cut</option>
          <option value="organic">Organic contour</option>
        </select>
      </label>
      <label style={label}>Physical die-cut windows · {windowCount}
        <input aria-label="RISO79 diecut window count" type="range"
          min={1} max={3} step={1} value={windowCount}
          onChange={e=>setWindowCount(Number(e.target.value))}/>
      </label>
      <label style={label}>Cut edge &amp; fibre relief · {Math.round(relief*100)}%
        <input aria-label="RISO79 paper cut edge relief" type="range"
          min={0} max={1} step=".05" value={relief}
          onChange={e=>setRelief(Number(e.target.value))}/>
      </label>
      <label style={label}>Stock thickness · {depthMm.toFixed(2)} mm
        <input aria-label="RISO79 physical stock thickness" type="range"
          min=".08" max="1.2" step=".04" value={depthMm}
          onChange={e=>setDepthMm(Number(e.target.value))}/>
      </label>
      <label style={label}>Edge lamp angle · {lampAngle}°
        <input aria-label="RISO79 edge lamp angle" type="range"
          min="0" max="360" step="5" value={lampAngle}
          onChange={e=>setLampAngle(Number(e.target.value))}/>
      </label>
      <label style={label}>Original paper tooth · {Math.round(grain*100)}%
        <input aria-label="RISO79 paper fibre density" type="range"
          min={0} max={1} step=".05" value={grain}
          onChange={e=>setGrain(Number(e.target.value))}/>
      </label>
      <label style={label}>Original drum dryness · {Math.round(dryness*100)}%
        <input aria-label="RISO79 drum contact dryness" type="range"
          min={0} max={1} step=".05" value={dryness}
          onChange={e=>setDryness(Number(e.target.value))}/>
      </label>
      <label style={label}>Plate registration · {registration.toFixed(2)}
        <input aria-label="RISO79 plate misregistration" type="range"
          min={0} max={1} step=".05" value={registration}
          onChange={e=>setRegistration(Number(e.target.value))}/>
      </label>
      <label style={label}>Paper fibre seed
        <input aria-label="RISO79 diecut fibre seed" type="number"
          min={0} max={2147483647} step={1} value={seed}
          onChange={e=>setSeed(Math.max(0,Math.min(2147483647,
            Math.floor(Number(e.target.value)||0))))}/>
      </label>
      <label style={label}>Source microscope
        <select aria-label="RISO79 source microscope zoom"
          value={zoom} onChange={e=>setZoom(Number(e.target.value))}>
          <option value={1}>1× whole print</option>
          <option value={2}>2× paper window</option>
          <option value={3}>3× native cellulosic edge</option>
        </select>
      </label>
      <label style={label}>Lens X · {focusX}%
        <input aria-label="RISO79 lens X" type="range"
          min={0} max={100} value={focusX}
          onChange={e=>setFocusX(Number(e.target.value))}/>
      </label>
      <label style={label}>Lens Y · {focusY}%
        <input aria-label="RISO79 lens Y" type="range"
          min={0} max={100} value={focusY}
          onChange={e=>setFocusY(Number(e.target.value))}/>
      </label>
      <label style={{display:"flex",alignItems:"center",gap:7,minHeight:42}}>
        <input type="checkbox" aria-label="RISO79 reduced motion"
          checked={reduce} onChange={e=>{
            setReduce(e.target.checked);setPlaying(false);
          }}/> Reduced motion · completed pull-tab still
      </label>
    </section>
    <nav aria-label="RISO79 actual original 24fps print-film beats"
      style={{display:"flex",flexWrap:"wrap",gap:8}}>
      {beats.map(([name,at])=><button type="button" key={name}
        style={{...button,background:Math.abs(at-frame)<7?"#A74736":"#263F59"}}
        onClick={()=>{setPlaying(false);setFrame(at);}}>{name}</button>)}
    </nav>
    <section data-km-riso79-film=""
      aria-label="RISO79 native original two-ink printed paper reveal"
      style={{width:film.width,height:film.height,maxWidth:"100%",
        overflow:"hidden",background:cover.spec.paper,
        boxShadow:"0 20px 36px rgba(44,37,29,.18)"}}>
      <div data-km-riso79-camera="" style={{
        width:"100%",height:"100%",transform:"scale("+zoom+")",
        transformOrigin:focusX+"% "+focusY+"%"}}>{stage}</div>
    </section>
    <p style={{fontSize:13,maxWidth:960,margin:0}}>
      Separate original printed cover and insert. Four-sided vector die-cuts
      have 88 short, individually seeded cut-face microfibrils each. The
      wall and directional cavity shadow follow the stock caliper and lamp.
      Only
      the hidden paper insert and its grip move; native spot-ink paths never
      repaint or lose registration. This overhead artist's paper mechanism is
      not an empirical friction, cut-die or Risograph calibration model.
    </p>
  </main>;
}
