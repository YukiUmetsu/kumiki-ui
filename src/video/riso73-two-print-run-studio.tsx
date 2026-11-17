import {useMemo,useState} from "react";
import {inspectRiso73CopyRepeatability}
  from "../../registry/video/riso-two-print-run-audit";
import {riso72SvgMatrix}
  from "../../registry/video/riso-paper-photo-affine";
import type {RisoProofMark,RisoProofPoint,RisoScanMeasurements}
  from "../../registry/video/riso-scan-proof";
import type {Riso71SourceImage} from "./riso71-scan-image-annotator";
import {Riso74NativePixelEvidencePanel} from "./riso74-native-pixel-evidence-studio";

const field={display:"grid",gap:5,font:"600 13px system-ui",minWidth:153} as const;
const round=(n:number)=>Number(n.toFixed(4));
type CompareMode="paired"|"overlay"|"first"|"second";

/** TWO independent operator-owned photographs, never a screenshot reskin
 * pretending to be physical RISO. No browser imaging filters are applied.
 * The registration arrows depict measured cross centers, not inferred art. */
export function Riso73TwoCopyPrintStudy({
  firstPhoto,secondPhoto,firstScan,secondScan,sheetMm,plateIds,
  expectedMarksMm,
}:{
  firstPhoto:Riso71SourceImage;
  secondPhoto:Riso71SourceImage;
  firstScan:RisoScanMeasurements;
  secondScan:RisoScanMeasurements;
  sheetMm:readonly [number,number];
  plateIds:readonly string[];
  expectedMarksMm:Readonly<Record<RisoProofMark,RisoProofPoint>>;
}){
  const [budget,setBudget]=useState(1.75);
  const [zoom,setZoom]=useState(1);
  const [focusX,setFocusX]=useState(50);
  const [focusY,setFocusY]=useState(50);
  const [mode,setMode]=useState<CompareMode>("paired");
  const [secondOpacity,setSecondOpacity]=useState(.5);
  const [guides,setGuides]=useState(true);
  const {report,error}=useMemo(()=>{
    try{return {
      report:inspectRiso73CopyRepeatability(
        {measurements:firstScan,pixels:[firstPhoto.width,firstPhoto.height]},
        {measurements:secondScan,pixels:[secondPhoto.width,secondPhoto.height]},
        sheetMm,expectedMarksMm,plateIds,budget),
      error:"",
    };}catch(e){return {report:null,
      error:e instanceof Error?e.message:String(e)};
    }
  },[firstPhoto,secondPhoto,firstScan,secondScan,sheetMm,expectedMarksMm,
    plateIds,budget]);
  const [sw,sh]=sheetMm;
  const camera={position:"absolute" as const,inset:0,width:"100%",height:"100%",
    transform:`scale(${zoom})`,
    transformOrigin:`${focusX}% ${focusY}%`};
  const printImage=(which:"first"|"second",opacity=1)=>{
    if(!report)return null;
    const photo=which==="first"?firstPhoto:secondPhoto;
    const paper=which==="first"?report.firstPaper:report.secondPaper;
    return <svg data-km-riso73-paper-image={which}
      viewBox={`0 0 ${sw} ${sh}`}
      style={{...camera,opacity,pointerEvents:"none"}}>
      <image href={photo.url} x="0" y="0" width={photo.width}
        height={photo.height} preserveAspectRatio="none"
        transform={riso72SvgMatrix(paper.pixelToSheet)}/>
    </svg>;
  };
  const marks=(which:"first"|"second"|"difference")=>{
    if(!report||!guides)return null;
    const colors=["#14729E","#D54D2C"] as const;
    return <svg data-km-riso73-ink-arrows={which}
      aria-label="Physical registration vectors from manually observed ink crosses"
      viewBox={`0 0 ${sw} ${sh}`}
      style={{...camera,pointerEvents:"none"}}>
      {report.plates.flatMap((plate,i)=>
        plate.marks.map(mark=>{
          const a=mark.firstMm,b=mark.secondMm;
          const from=which==="second"?b:a;
          const color=colors[i]??"#333";
          return <g key={plate.plateId+":"+mark.id}
            data-km-riso73-mark={plate.plateId+":"+mark.id}
            data-km-riso73-shift={round(mark.distanceMm)}
            stroke={color} strokeWidth=".35" fill="none">
            <title>{plate.plateId} {mark.id}: sheet 1→2
              {" "}({round(mark.changeMm[0])},
              {" "}{round(mark.changeMm[1])}) mm</title>
            {which==="difference"&&<>
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                strokeWidth=".55"/>
              <circle cx={b[0]} cy={b[1]} r="1.4"
                strokeWidth=".28"/>
            </>}
            <circle cx={from[0]} cy={from[1]} r="1.2"
              strokeWidth=".28"/>
            <path d={`M${from[0]-1} ${from[1]}h2 M${from[0]} ${from[1]-1}v2`}
              strokeWidth=".28"/>
          </g>;
        }),
      )}
    </svg>;
  };
  const paperPanel=(which:"first"|"second"|"overlay")=>
    <article key={which} data-km-riso73-panel={which}
      style={{display:"grid",gap:7,minWidth:0}}>
      <strong style={{font:"700 13px system-ui"}}>
        {which==="first"?"Print copy 1 · physical paper coordinates":
          which==="second"?"Print copy 2 · independently paper-rectified":
          "Both paper-rectified copies · measured repeatability vectors"}
      </strong>
      <div style={{position:"relative",aspectRatio:sw+" / "+sh,
        background:"#fff",overflow:"hidden",
        border:"1px solid #908D84",width:"100%"}}>
        {which!=="second"&&printImage("first")}
        {which!=="first"&&printImage("second",
          which==="overlay"?secondOpacity:1)}
        {marks(which==="overlay"?"difference":which)}
      </div>
    </article>;
  return <section data-km-riso73-two-copy-audit=""
    data-km-riso73-mode={mode}
    data-km-riso73-zoom={zoom}
    data-km-riso73-valid={String(Boolean(report))}
    data-km-riso73-within={String(report?.withinDeclaredRepeatabilityBudget??false)}
    aria-label="RISO73 two physically printed sheet photograph comparison"
    style={{display:"grid",gap:13,maxWidth:1140,padding:17,
      border:"1px solid #948C7E",background:"#F7F2E9",color:"#2B3D4E"}}>
    <header style={{display:"grid",gap:5}}>
      <h3 style={{font:"700 22px Georgia,serif",margin:0}}>
        RISO73 · Two distinct print copies under the same paper microscope
      </h3>
      <p style={{margin:0}}>
        Keep the actual printed ink, colored halftone dots, edge feathering,
        paper grain and registration ghosting from each independently uploaded
        image. Alignment uses paper corners ONLY. All ink-center changes are
        rendered on the common physical sheet coordinates; no stencil,
        watercolor, halftone or paper pixels are digitally corrected.
      </p>
      <small>Unverified operator-entered image measurements only.
        Test screenshots or two copies of the same image do not establish
        authentic press repeatability.</small>
    </header>
    {error?<p role="alert" data-km-riso73-error=""
      style={{fontWeight:700,color:"#933B28",margin:0}}>{error}</p>:<>
      <p data-km-riso73-result="" style={{margin:0,fontWeight:700}}>
        {report!.withinDeclaredRepeatabilityBudget?
          "Within manually declared copy-repeatability budget":
          "Outside manually declared copy-repeatability budget"}:
        {" "}{budget.toFixed(2)} mm.
        {" "}Uncalibrated physical print quality is NOT certified.
      </p>
      <div style={{display:"flex",gap:13,flexWrap:"wrap",alignItems:"end"}}>
        <label style={field}>Copy registration tolerance · {budget} mm
          <input aria-label="RISO73 copy-to-copy mm budget"
            type="range" min=".25" max="5" step=".25"
            value={budget} onChange={e=>setBudget(Number(e.target.value))}/>
        </label>
        <label style={field}>Comparison view
          <select aria-label="RISO73 inspection mode" value={mode}
            onChange={e=>setMode(e.target.value as CompareMode)}>
            <option value="paired">Physical copies paired</option>
            <option value="overlay">Rectified print overprint overlay</option>
            <option value="first">Print copy 1 only</option>
            <option value="second">Print copy 2 only</option>
          </select>
        </label>
        <label style={field}>Native print detail · {zoom}×
          <select aria-label="RISO73 synchronized zoom"
            value={zoom} onChange={e=>setZoom(Number(e.target.value))}>
            <option value={1}>1× · full sheet</option>
            <option value={2}>2× · color overlaps</option>
            <option value={3}>3× · dot and paper details</option>
          </select>
        </label>
        <label style={field}>Paper x · {focusX}%
          <input aria-label="RISO73 paper focus x" type="range" min={0} max={100}
            value={focusX} onChange={e=>setFocusX(Number(e.target.value))}/>
        </label>
        <label style={field}>Paper y · {focusY}%
          <input aria-label="RISO73 paper focus y" type="range" min={0} max={100}
            value={focusY} onChange={e=>setFocusY(Number(e.target.value))}/>
        </label>
        {mode==="overlay"&&<label style={field}>
          Second photograph opacity · {Math.round(secondOpacity*100)}%
          <input aria-label="RISO73 second photograph opacity" type="range"
            min={0} max={1} step=".05" value={secondOpacity}
            onChange={e=>setSecondOpacity(Number(e.target.value))}/>
        </label>}
        <label style={{display:"flex",alignItems:"center",gap:7,minHeight:38}}>
          <input aria-label="RISO73 show independent print mark vectors"
            type="checkbox" checked={guides}
            onChange={e=>setGuides(e.target.checked)}/>
          Annotated ink displacement vectors
        </label>
      </div>
      <div data-km-riso73-panels="" style={{display:"grid",
        gridTemplateColumns:mode==="paired"?
          "repeat(auto-fit,minmax(min(100%,360px),1fr))":"minmax(0,675px)",
        gap:12,maxWidth:1120,alignItems:"start"}}>
        {mode==="paired"?<>{paperPanel("first")}{paperPanel("second")}</>:
          mode==="overlay"?paperPanel("overlay"):
          mode==="first"?paperPanel("first"):paperPanel("second")}
      </div>
      <div style={{display:"grid",gap:7}}>
        <strong>Measured variation across two printed sheets · mm</strong>
        <div style={{overflowX:"auto"}}>
          <table data-km-riso73-measured-deltas=""
            style={{borderCollapse:"collapse",minWidth:580,font:"13px/1.5 system-ui"}}>
            <thead><tr style={{textAlign:"left",borderBottom:"1px solid #9E9080"}}>
              <th scope="col">Ink drum</th><th scope="col">Mean ΔX</th>
              <th scope="col">Mean ΔY</th><th scope="col">RMS change</th>
              <th scope="col">Worst cross</th>
            </tr></thead>
            <tbody>
              {report!.plates.map(plate=><tr key={plate.plateId}
                data-km-riso73-row={plate.plateId}
                style={{borderBottom:"1px solid #D6CBBA"}}>
                <th scope="row" style={{textAlign:"left"}}>{plate.plateId}</th>
                <td>{round(plate.meanChangeMm[0])}</td>
                <td>{round(plate.meanChangeMm[1])}</td>
                <td>{round(plate.rmsChangeMm)}</td>
                <td>{round(plate.worstChangeMm)}</td>
              </tr>)}
              {report!.relativeInk&&<tr data-km-riso73-inter-ink=""
                style={{borderTop:"2px solid #8D8070"}}>
                <th scope="row" style={{textAlign:"left"}}>
                  Inter-ink difference changed</th>
                <td>{round(report!.relativeInk.meanChangeMm[0])}</td>
                <td>{round(report!.relativeInk.meanChangeMm[1])}</td>
                <td>—</td>
                <td>{round(report!.relativeInk.worstChangeMm)}</td>
              </tr>}
            </tbody>
          </table>
        </div>
        <p style={{margin:0,fontSize:12}}>Copy 1 paper corner residual:
          {" "}{round(report!.firstPaper.worstPaperCornerResidualMm)} mm.
          Copy 2: {round(report!.secondPaper.worstPaperCornerResidualMm)} mm.
          The shifts are per-ink actual cross positions relative to
          each image's PAPER coordinates, not RGB-image pixel distances.
        </p>
      </div>
      <Riso74NativePixelEvidencePanel
        firstPhoto={firstPhoto} secondPhoto={secondPhoto}
        firstPaper={report!.firstPaper} secondPaper={report!.secondPaper}
        sheetMm={sheetMm}/>
    </>}
  </section>;
}
