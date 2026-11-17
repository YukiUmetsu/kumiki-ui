import {useMemo,useState} from "react";
import {riso68OriginalMasters,riso68PaperProfile} from "./riso-master-separation-studio";
import {risoExampleSpec} from "./riso-print-demo";
import type {RisoAspect} from "./riso-print-demo";
import {serializeRisoSeparationMaster,risoSeparationFilename} from "../../registry/video/riso-separation-master";
import {serializeRisoSeparationPdf} from "../../registry/video/riso-press-pdf";
import {rasterizeRisoSeparationTiff} from "../../registry/video/riso-press-raster";
import {inspectRisoShopJob} from "../../registry/video/riso-shop-profile";
import type {RisoShopProfile,RisoPressFormat} from "../../registry/video/riso-shop-profile";
import {createRisoScanTemplate,inspectRisoScanProof,simulateRisoScanProof,risoPrintRegistrationTargets} from "../../registry/video/riso-scan-proof";
import type {RisoScanMeasurements} from "../../registry/video/riso-scan-proof";
import {RisoScanImageAnnotator} from "./riso71-scan-image-annotator";
import type {Riso71SourceImage} from "./riso71-scan-image-annotator";
import {Riso72PaperPhotoComparator} from "./riso72-paper-photo-comparator";
import {Riso73TwoCopyPrintStudy} from "./riso73-two-print-run-studio";

const control={display:"grid",gap:4,font:"600 13px system-ui",minWidth:155} as const;
const button={border:"1px solid #847867",background:"#FFFAED",padding:"9px 13px",
  font:"700 13px system-ui",minHeight:39,color:"#24394E",borderRadius:3} as const;
/** Illustrative only; NEVER a claim of a manufacturer's actual machine configuration. */
export function riso70IllustrativeProfile(margins:{
  top:number;right:number;bottom:number;left:number;
},marks:RisoShopProfile["marks"]="crop-and-register"):RisoShopProfile{
  return {version:1,id:"illustrative-custom-a4",label:"Operator-adjustable example, not a measured machine",
    provenance:"operator-entered",sheetSizesMm:[[297,210],[210,297]],
    unprintableMm:margins,feedEdge:"top",marks,fileFormat:"either",
    tiffPpi:[300,600],minBleedMm:3,maxBleedMm:5};
}
function saveFile(data:string|Uint8Array,name:string,mime:string){
  const content=typeof data==="string"?data:new Uint8Array(data);
  const url=URL.createObjectURL(new Blob([content],{type:mime}));
  const a=document.createElement("a");a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),500);
}
const rounded=(v:number)=>Number(v.toFixed(3));
export function RisoShopProofStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(160);
  const [seed,setSeed]=useState(66);
  const [margins,setMargins]=useState({top:10,right:8,bottom:8,left:8});
  const [marks,setMarks]=useState<"none"|"crop"|"crop-and-register">("crop-and-register");
  const [format,setFormat]=useState<RisoPressFormat>("pdf");
  const [dpi,setDpi]=useState<300|600>(300);
  const [tolerance,setTolerance]=useState(1.75);
  const [redDx,setRedDx]=useState(1.3);
  const [redDy,setRedDy]=useState(-.7);
  const [inputType,setInputType]=useState<"synthetic"|"physical">("synthetic");
  const [scanJson,setScanJson]=useState("");
  const [scanPhoto,setScanPhoto]=useState<Riso71SourceImage|null>(null);
  const [showSecondCopy,setShowSecondCopy]=useState(false);
  const [secondPhoto,setSecondPhoto]=useState<Riso71SourceImage|null>(null);
  const [secondScan,setSecondScan]=useState<RisoScanMeasurements|null>(null);
  const [macro,setMacro]=useState(false);
  const [busy,setBusy]=useState(false);
  const [downloadError,setDownloadError]=useState("");
  const [lastDownload,setLastDownload]=useState("");
  const spec=useMemo(()=>risoExampleSpec(aspect,seed),[aspect,seed]);
  const masters=useMemo(()=>riso68OriginalMasters(aspect,frame,seed),[aspect,frame,seed]);
  const layout=useMemo(()=>riso68PaperProfile(aspect,{marks,bleedMm:3}),
    [aspect,marks]);
  const profile=useMemo(()=>riso70IllustrativeProfile(margins,marks),
    [margins,marks]);
  const shop=useMemo(()=>inspectRisoShopJob(spec,masters,layout,profile,
    {format,dpi}),[spec,masters,layout,profile,format,dpi]);
  const previews=useMemo(()=>shop.compatible?
    Object.fromEntries(spec.plates.map(p=>[p.id,
      serializeRisoSeparationMaster(spec,masters,layout,p.id)])):
    {} as Record<string,string>,[shop.compatible,spec,masters,layout]);
  const measured=useMemo(()=>{
    try{
      const input: RisoScanMeasurements=inputType==="synthetic"?
        simulateRisoScanProof(spec,masters,layout,[redDx,redDy]):
        JSON.parse(scanJson) as RisoScanMeasurements;
      return {result:inspectRisoScanProof(spec,masters,layout,input,tolerance),
        problem:""};
    }catch(e){
      return {result:null,problem:e instanceof Error?e.message:String(e)};
    }
  },[spec,masters,layout,inputType,scanJson,redDx,redDy,tolerance]);
  const photoReadings=useMemo(()=>{
    if(inputType!=="physical"||!measured.result||!scanPhoto||
      measured.result.evidence!=="operator-measured")return null;
    try{return JSON.parse(scanJson) as RisoScanMeasurements;}
    catch{return null;}
  },[inputType,measured.result,scanJson,scanPhoto]);
  const exportPlate=async(id:string)=>{
    if(!shop.compatible||busy)return;
    setBusy(true);setDownloadError("");setLastDownload("");
    try{
      const base=risoSeparationFilename(spec,id).replace(/\.svg$/,"");
      const name=base+(format==="pdf"?".pdf":"-"+dpi+"ppi.tif");
      const bytes=format==="pdf"?
        serializeRisoSeparationPdf(spec,masters,layout,id):
        await rasterizeRisoSeparationTiff(spec,masters,layout,id,dpi);
      saveFile(bytes,name,format==="pdf"?"application/pdf":"image/tiff");
      setLastDownload(name);
    }catch(e){setDownloadError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  };
  const [w,h]=layout.sheetMm;
  return <main data-km-riso70-studio="" data-km-riso70-aspect={aspect}
    data-km-riso70-ready={String(shop.compatible)}
    data-km-riso70-proof={measured.result?.evidence??"unavailable"}
    data-km-riso70-within={String(measured.result?.withinDeclaredTolerance??false)}
    style={{display:"grid",gap:18,alignContent:"start",padding:24,minHeight:"100vh",
      background:"#EAE4D7",color:"#293E50",font:"14px/1.5 system-ui"}}>
    <header style={{maxWidth:1100}}>
      <div style={{font:"800 12px system-ui",letterSpacing:2}}>
        RISOGRAPH / RISO70 / PRINTER PROFILES / MEASURED DRUM REGISTRATION
      </div>
      <h1 style={{font:"700 32px Georgia,serif",margin:"6px 0"}}>
        Two ink masters · declared shop limits · observed paper geometry
      </h1>
      <p style={{margin:0}}>Preserve all RISO68–69 original vector pressure contours and
        unprinted fibres. Specify physical sheet feed margins independently on
        four sides; verify print-shop file and mark rules. Scan comparison uses
        paper edges rather than fitting the printed colors to themselves.
      </p>
    </header>
    <section aria-label="RISO70 original physically separated native stencil sources"
      style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,350px),510px))",
        gap:18,maxWidth:1120}}>
      {spec.plates.map((plate,i)=>{
        const svg=previews[plate.id];
        return <article key={plate.id} data-km-riso70-master={plate.id}
          style={{display:"grid",gap:9}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
            <strong>DRUM {i+1} · {plate.id.toUpperCase()} / K ONLY</strong>
            <span style={{display:"block",width:18,height:18,background:plate.color,
              border:"2px solid #fff",borderRadius:"50%"}}
              aria-label={"Reference spot ink "+plate.id}/>
          </div>
          <div style={{background:"#fff",aspectRatio:w+" / "+h,
            overflow:"hidden",position:"relative",
            border:"1px solid #938878",boxShadow:"0 9px 22px #4D3F3618"}}>
            {svg?<div data-km-riso70-native={plate.id}
              style={{width:"100%",height:"100%",
                transform:macro?"scale(2)":"none",transformOrigin:"50% 50%"}}
              dangerouslySetInnerHTML={{__html:svg.replace("<svg ",
                '<svg style="width:100%;height:auto;display:block" ')}}/>:
              <strong style={{display:"block",padding:24}}>Blocked by the actual
                physical printer margin or job policy.</strong>}
            <svg aria-label="Preview only printer unavailable margins"
              viewBox={"0 0 "+w+" "+h}
              style={{position:"absolute",inset:0,width:"100%",height:"100%",
                pointerEvents:"none",transform:macro?"scale(2)":"none",
                transformOrigin:"50% 50%"}}>
              <rect x={shop.printableMm.x} y={shop.printableMm.y}
                width={shop.printableMm.width} height={shop.printableMm.height}
                fill="none" stroke="#277E82" strokeWidth=".45"
                strokeDasharray="2 2"/>
            </svg>
          </div>
          <button type="button" style={button} disabled={!shop.compatible||busy}
            aria-label={"RISO70 export "+plate.id+" "+format.toUpperCase()}
            onClick={()=>{void exportPlate(plate.id);}}>
            {busy?"Building independent grayscale source…":
              "Export "+plate.id+" "+format.toUpperCase()}
          </button>
        </article>;
      })}
    </section>
    <section aria-label="RISO70 operator configured real printer policy"
      style={{display:"grid",gap:12,maxWidth:1120,
        paddingTop:13,borderTop:"1px solid #A79A8A"}}>
      <h2 style={{font:"700 21px Georgia,serif",margin:0}}>
        01 · Explicit machine and paper policy
      </h2>
      <div style={{display:"flex",flexWrap:"wrap",gap:13,alignItems:"end"}}>
        <label style={control}>Paper orientation
          <select aria-label="RISO70 output orientation" value={aspect}
            onChange={e=>setAspect(e.target.value as RisoAspect)}>
            <option value="landscape">A4 landscape / 16:9</option>
            <option value="portrait">A4 portrait / 9:16</option>
          </select>
        </label>
        <label style={control}>Master format
          <select aria-label="RISO70 master format" value={format}
            onChange={e=>setFormat(e.target.value as RisoPressFormat)}>
            <option value="pdf">Grayscale PDF vectors</option>
            <option value="tiff">8-bit TIFF grayscale</option>
          </select>
        </label>
        <label style={control}>Pixel density
          <select disabled={format!=="tiff"}
            aria-label="RISO70 raster PPI" value={dpi}
            onChange={e=>setDpi(Number(e.target.value) as 300|600)}>
            <option value={300}>300 PPI</option>
            <option value={600}>600 PPI</option>
          </select>
        </label>
        <label style={control}>Marks required by this shop
          <select aria-label="RISO70 mark policy" value={marks}
            onChange={e=>setMarks(e.target.value as typeof marks)}>
            <option value="crop-and-register">Crop + register (scan test)</option>
            <option value="crop">Crop only</option>
            <option value="none">None (vendor-supplied)</option>
          </select>
        </label>
        {(["top","right","bottom","left"] as const).map(edge=>
          <label key={edge} style={control}>
            {edge} unprintable / {margins[edge]} mm
            <input type="range" min={0} max={40} step={1} value={margins[edge]}
              aria-label={"RISO70 unavailable "+edge}
              onChange={e=>setMargins(m=>({...m,[edge]:Number(e.target.value)}))}/>
          </label>)}
        <label style={control}>Source frame / {frame}/239
          <input type="range" min={0} max={239} value={frame}
            aria-label="RISO70 absolute source frame"
            onChange={e=>setFrame(Number(e.target.value))}/>
        </label>
        <label style={control}>Original source seed
          <input type="number" min={0} max={200000} value={seed}
            aria-label="RISO70 original source seed"
            onChange={e=>setSeed(Math.max(0,Math.min(200000,
              Math.trunc(Number(e.target.value)||0))))}/>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:7,minHeight:40}}>
          <input type="checkbox" aria-label="RISO70 2x source macro"
            checked={macro} onChange={e=>setMacro(e.target.checked)}/>
          2× original ink-fibre macro
        </label>
      </div>
      <div data-km-riso70-issues={shop.issues.length}>
        <strong>{shop.compatible?"Profile-compatible only · NOT press approved":
          "Export blocked: "+shop.issues.length+" physical preflight issue(s)"}</strong>
        <div>Sheet {w} × {h} mm; operator-entered margins
          T/R/B/L {margins.top}/{margins.right}/{margins.bottom}/{margins.left} mm;
          actual printed marks {shop.inspectedMarks}.
        </div>
        {shop.issues.map((issue,i)=><p style={{margin:"3px 0",
          color:"#92382C",fontWeight:600}} key={i}>
          {issue.code}: {issue.message}
        </p>)}
        {downloadError&&<p role="alert">{downloadError}</p>}
        {lastDownload&&<p role="status">Downloaded: {lastDownload}</p>}
      </div>
    </section>
    <section aria-label="RISO70 physically measured versus synthetic scan proof"
      style={{display:"grid",gap:12,maxWidth:1120,
        paddingTop:13,borderTop:"1px solid #A79A8A"}}>
      <h2 style={{font:"700 21px Georgia,serif",margin:0}}>
        02 · Paper-edge scan calibration and per-color cross deviation
      </h2>
      <p style={{margin:0}}>Use four physical PAPER corners to deskew the scan,
        then locate four physical registration crosses in each drum. The
        synthetic values are just a numerical demonstration; there is no
        real-world printer proof until measured pixels are supplied.
      </p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
        <label style={control}>Scan reading provenance
          <select aria-label="RISO70 scan evidence source"
            value={inputType} onChange={e=>{setInputType(e.target.value as typeof inputType);
              setScanPhoto(null);setScanJson("");}}>
            <option value="synthetic">Simulated, NOT physical</option>
            <option value="physical">Operator-entered actual scanned pixels</option>
          </select>
        </label>
        <label style={control}>Declared allowance / {tolerance} mm
          <input type="range" min={.25} max={5} step={.25}
            aria-label="RISO70 declared tolerance" value={tolerance}
            onChange={e=>setTolerance(Number(e.target.value))}/>
        </label>
        {inputType==="synthetic"&&<>
          <label style={control}>Simulated red X / {redDx.toFixed(1)} mm
            <input type="range" min={-6} max={6} step={.1} value={redDx}
              aria-label="RISO70 synthetic red X"
              onChange={e=>setRedDx(Number(e.target.value))}/>
          </label>
          <label style={control}>Simulated red Y / {redDy.toFixed(1)} mm
            <input type="range" min={-6} max={6} step={.1} value={redDy}
              aria-label="RISO70 synthetic red Y"
              onChange={e=>setRedDy(Number(e.target.value))}/>
          </label>
        </>}
        <button type="button" style={button}
          aria-label="RISO70 download scan measurement template"
          disabled={marks!=="crop-and-register"}
          onClick={()=>{try{
            const template=createRisoScanTemplate(spec,masters,layout);
            saveFile(JSON.stringify(template,null,2),"riso70-scan-template.json",
              "application/json");
          }catch(e){setDownloadError(e instanceof Error?e.message:String(e));}}}>
          Export unfilled real-scan template
        </button>
      </div>
      {inputType==="physical"&&marks==="crop-and-register"&&
        <RisoScanImageAnnotator
          plateIds={spec.plates.map(p=>p.id)}
          resetKey={[aspect,frame,seed,marks].join(":")}
          onChange={reading=>setScanJson(reading?JSON.stringify(reading,null,2):"")}
          onImage={setScanPhoto}/>}
      {inputType==="physical"&&photoReadings&&scanPhoto&&
        shop.compatible&&marks==="crop-and-register"&&
        <Riso72PaperPhotoComparator
          photo={scanPhoto} measurements={photoReadings}
          sheetMm={layout.sheetMm}
          originalMasters={previews}
          expectedMarksMm={risoPrintRegistrationTargets(spec,masters,layout)}/>}
      {inputType==="physical"&&scanPhoto&&photoReadings&&
        marks==="crop-and-register"&&shop.compatible&&
        <section data-km-riso73-second-copy-controls=""
          aria-label="RISO73 optional real second printed sheet"
          style={{display:"grid",gap:10,padding:"10px 0",
            borderTop:"1px solid #9E927D"}}>
          <button type="button" style={{...button,justifySelf:"start"}}
            aria-label="RISO73 add or remove second physical print scan"
            aria-expanded={showSecondCopy}
            onClick={()=>{
              if(showSecondCopy){setSecondPhoto(null);setSecondScan(null);}
              setShowSecondCopy(!showSecondCopy);
            }}>
            {showSecondCopy?"Close second-copy inspection":
              "Inspect another physical print copy"}
          </button>
          {showSecondCopy&&<>
            <div style={{fontWeight:700}}>SECOND PHYSICAL PAPER COPY ·
              independent original photograph and 12 measured positions
            </div>
            <RisoScanImageAnnotator
              plateIds={spec.plates.map(p=>p.id)}
              resetKey={[aspect,frame,seed,marks,"copy2"].join(":")}
              onChange={setSecondScan}
              onImage={setSecondPhoto}/>
            {secondPhoto&&secondScan&&
              <Riso73TwoCopyPrintStudy
                firstPhoto={scanPhoto} secondPhoto={secondPhoto}
                firstScan={photoReadings} secondScan={secondScan}
                sheetMm={layout.sheetMm}
                plateIds={spec.plates.map(p=>p.id)}
                expectedMarksMm={
                  risoPrintRegistrationTargets(spec,masters,layout)}/>}
          </>}
        </section>}
      {inputType==="physical"&&<label style={{display:"grid",gap:6,
        font:"600 13px system-ui"}}>
        Actual observed scan pixels JSON (all 4 paper edges and 8 cross centers)
        <textarea aria-label="RISO70 physical scan measurement JSON"
          value={scanJson} onChange={e=>setScanJson(e.target.value)}
          rows={8} spellCheck={false}
          placeholder="Download template, replace null scanPx values with actual measured physical scan pixel coordinates, paste complete JSON here."
          style={{font:"12px/1.5 ui-monospace,monospace",
            padding:11,maxWidth:1000,resize:"vertical"}}/>
      </label>}
      {measured.problem&&<div data-km-riso70-scan-error=""
        style={{color:"#953B2D",fontWeight:700}}>{measured.problem}</div>}
      {measured.result&&<div data-km-riso70-scan-results=""
        style={{display:"grid",gap:9}}>
        <strong>{measured.result.evidence==="simulation-only"?
          "SYNTHETIC DATA ONLY · NO PHYSICAL PRESS VERIFICATION":
          "OPERATOR-ENTERED PIXELS · NOT INDEPENDENTLY AUTHENTICATED"}
          {" · "}{measured.result.withinDeclaredTolerance?
            "within declared mm tolerance":"outside declared mm tolerance"}
        </strong>
        <div>Scanner paper-corner residual: {rounded(measured.result.scannerCornerMaxErrorMm)}
          {" "}mm (maximum; separate from ink drift).
        </div>
        <div style={{display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:11}}>
          {measured.result.plates.map(p=><article key={p.id}
            data-km-riso70-scan-plate={p.id}
            style={{border:"1px solid #9C9080",padding:13,
              background:"#F8F4EC",display:"grid",gap:4}}>
            <strong>{p.id.toUpperCase()} ink pass</strong>
            <span>Average X/Y: ({rounded(p.meanDeltaMm[0])},
              {" "}{rounded(p.meanDeltaMm[1])}) mm</span>
            <span>Worst deviation: {rounded(p.worstMm)} mm</span>
            <span>RMS: {rounded(p.rmsMm)} mm</span>
            {p.marks.map(m=><span key={m.id} style={{fontSize:12}}>
              {m.id}: ({rounded(m.deltaMm[0])},
              {" "}{rounded(m.deltaMm[1])}) mm
            </span>)}
          </article>)}
        </div>
        {measured.result.relativePairMm.map(p=><div key={p.first+"-"+p.second}
          data-km-riso70-relative-pair="">
          {p.first} vs {p.second} relative X/Y:
          {" "}({rounded(p.meanDeltaMm[0])}, {rounded(p.meanDeltaMm[1])}) mm.
          Worst relative: {rounded(p.worstMm)} mm.
        </div>)}
      </div>}
      <p style={{fontSize:12,margin:0,maxWidth:1040}}>
        Scanner affine fit is derived ONLY from paper edges and cannot erase
        genuine ink misregistration. Perspective/corner fit errors over 0.5 mm
        block measurements. Shop examples and simulation are not manufacturer
        tolerances, vendor approval, scanner image analysis or physical proof.
      </p>
    </section>
  </main>;
}
