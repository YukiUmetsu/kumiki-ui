import {useMemo,useState} from "react";
import {evaluateRisoRegistration} from "../../registry/video/riso-registration-preflight";
import {RisoBrushArt} from "./riso-brush-studio";
import type {RisoBrushPlate} from "./riso-brush-studio";
import {risoExampleSpec} from "./riso-print-demo";
import type {RisoAspect} from "./riso-print-demo";

const paper="#F2E9D6",blue="#2362A0",red="#DD593D";
const nominal= [0.65,-0.45] as const;
const control={display:"grid",gap:5,font:"600 13px system-ui",minWidth:175} as const;

/** RISO65 compares the exact same original RISO62 pressure paths, each under
 * independent native RisoPrint masters. No raster layer, RGB filter or fake
 * overprint is involved in the proof. All frames are absolute source frames. */
export function RisoRegistrationPreflightStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [plate,setPlate]=useState<RisoBrushPlate>("both");
  const [x,setX]=useState(4);
  const [y,setY]=useState(-3);
  const [trap,setTrap]=useState(2);
  const [macro,setMacro]=useState(true);
  const [grain,setGrain]=useState(.58);
  const [frame,setFrame]=useState(160);
  const [animate,setAnimate]=useState(true);
  const [seed,setSeed]=useState(62);
  const spec=useMemo(()=>{
    const base=risoExampleSpec(aspect,seed);
    return {...base,plates:base.plates.map(p=>({
      ...p,color:p.id==="blue"?blue:red,
      registration:p.id==="blue"?[0,0] as const:[x,y] as const,
    }))};
  },[aspect,seed,x,y]);
  // Renderer and report use identical authored master offsets and no random drift.
  const report=evaluateRisoRegistration(spec,0,trap);
  const drift=report.worstPair;
  const zoom=macro?3:1;
  const renderProof=(id:"nominal"|"drift",registration:readonly [number,number])=>
    <figure data-km-riso65-panel={id} style={{margin:0,minWidth:0}}>
      <figcaption style={{font:"700 14px system-ui",marginBottom:8}}>
        {id==="nominal"?"Reference register · original two-plate composition":
          "Proof register · independent vermilion displacement"}
      </figcaption>
      <div data-km-riso65-viewport="" style={{
        width:"100%",aspectRatio:aspect==="landscape"?"16 / 9":"9 / 16",
        overflow:"hidden",position:"relative",background:paper,
        border:"1px solid #827663",boxSizing:"border-box",
      }}>
        <div data-km-riso65-magnification={zoom} style={{
          width:"100%",transform:"scale("+zoom+")",transformOrigin:"50% 50%",
        }}>
          <RisoBrushArt aspect={aspect} frame={frame} printFrame={239}
            animate={animate} plate={plate} dryness={.73} seed={seed}
            inkScale={1} grain={grain} registration={0}
            secondPlateRegistration={registration} layout="film"/>
        </div>
      </div>
    </figure>;
  return <main data-km-riso65-studio="" data-km-riso65-aspect={aspect}
    data-km-riso65-source-frame={frame} data-km-riso65-zoom={zoom}
    data-km-riso65-register-x={x} data-km-riso65-register-y={y}
    style={{minHeight:"100vh",padding:22,boxSizing:"border-box",
      background:"#EBE2D2",color:"#243E54",font:"14px/1.45 system-ui",
      display:"grid",alignContent:"start",gap:15}}>
    <header style={{maxWidth:1050}}>
      <div style={{fontWeight:800,letterSpacing:1.8,fontSize:12}}>
        RISOGRAPH / ARTCRAFT / RISO65 / NO HUMAN ANATOMY
      </div>
      <h1 style={{font:"700 28px Georgia,serif",margin:"5px 0"}}>
        Original press register · true two-master A/B proof
      </h1>
      <p style={{margin:0,maxWidth:980}}>
        Independent cobalt and vermilion printed stencil masters. The exact
        same source-native cubic gestures, edge splinters, paper-open fibres,
        paper pores and witness marks survive both proofs. Magnification is
        optical inspection of the live vector print, not a new image asset.
      </p>
    </header>
    <section aria-label="RISO65 original plate proof"
      style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,350px),480px))",
        gap:18,alignItems:"start"}}>
      {renderProof("nominal",nominal)}
      {renderProof("drift",[x,y])}
    </section>
    <section aria-label="RISO65 registration and source controls"
      style={{display:"flex",gap:15,alignItems:"end",flexWrap:"wrap",maxWidth:1080}}>
      <label style={control}>Aspect
        <select aria-label="RISO65 aspect" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 · 960×540</option>
          <option value="portrait">9:16 · 540×960</option>
        </select>
      </label>
      <label style={control}>Master
        <select aria-label="RISO65 master" value={plate}
          onChange={e=>setPlate(e.target.value as RisoBrushPlate)}>
          <option value="both">Overprinted two-ink sheet</option>
          <option value="blue">Cobalt only</option>
          <option value="red">Vermilion only</option>
        </select>
      </label>
      <label style={control}>Vermilion x · {x.toFixed(1)}px
        <input aria-label="RISO65 register x" type="range" min={-8} max={8}
          step={.5} value={x} onChange={e=>setX(Number(e.target.value))}/>
      </label>
      <label style={control}>Vermilion y · {y.toFixed(1)}px
        <input aria-label="RISO65 register y" type="range" min={-8} max={8}
          step={.5} value={y} onChange={e=>setY(Number(e.target.value))}/>
      </label>
      <label style={control}>Declared trap allowance · {trap.toFixed(1)}px
        <input aria-label="RISO65 trap allowance" type="range" min={0} max={12}
          step={.5} value={trap} onChange={e=>setTrap(Number(e.target.value))}/>
      </label>
      <label style={control}>Paper tooth · {Math.round(grain*100)}%
        <input aria-label="RISO65 paper grain" type="range" min={0} max={1}
          step={.05} value={grain} onChange={e=>setGrain(Number(e.target.value))}/>
      </label>
      <label style={control}>Absolute source frame · {frame}/239
        <input aria-label="RISO65 absolute source frame" type="range" min={0} max={239}
          value={frame} onChange={e=>setFrame(Number(e.target.value))}/>
      </label>
      <label style={control}>Source seed
        <input aria-label="RISO65 source seed" type="number" min={0} max={200000}
          value={seed} onChange={e=>setSeed(Math.max(0,Math.min(200000,
            Math.trunc(Number(e.target.value)||0))))}/>
      </label>
      <label style={{display:"flex",gap:7,alignItems:"center",minHeight:32}}>
        <input aria-label="RISO65 3x macro" type="checkbox" checked={macro}
          onChange={e=>setMacro(e.target.checked)}/>3× macro / 1× full sheet
      </label>
      <label style={{display:"flex",gap:7,alignItems:"center",minHeight:32}}>
        <input aria-label="RISO65 animate source" type="checkbox" checked={animate}
          onChange={e=>setAnimate(e.target.checked)}/>Source motion at absolute frame
      </label>
    </section>
    <section aria-label="RISO65 numeric register preflight"
      data-km-riso65-preflight={report.withinAllowance?"within":"review"}
      style={{borderTop:"1px solid #988C7D",maxWidth:1080,paddingTop:12}}>
      <strong>{report.withinAllowance?"Within declared displacement allowance":
        "Review trapping: registration exceeds declared allowance"}</strong>
      <p style={{margin:"5px 0"}}>
        Cobalt → vermilion: Δx {drift.delta[0].toFixed(2)}px,
        Δy {drift.delta[1].toFixed(2)}px; magnitude {drift.magnitude.toFixed(2)}px,
        nominal allowance {trap.toFixed(2)}px,
        excess {drift.excess.toFixed(2)}px.
      </p>
      <p style={{margin:0,maxWidth:1020,fontSize:12}}>
        A digital geometric displacement preflight only. This does not expand
        or knock out ink paths, certify trapping at every contour, measure real
        roller drift, or emulate spectral ink absorption. Calibration requires
        a physical printer and photographed press proofs.
      </p>
    </section>
  </main>;
}
