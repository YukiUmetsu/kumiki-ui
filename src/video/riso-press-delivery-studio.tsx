import {useMemo,useState} from "react";
import {inspectRisoSeparation,serializeRisoSeparationMaster,risoSeparationFilename} from "../../registry/video/riso-separation-master";
import type {RisoSeparationLayout} from "../../registry/video/riso-separation-master";
import {serializeRisoSeparationPdf} from "../../registry/video/riso-press-pdf";
import {measureRisoTiffRaster} from "../../registry/video/riso-press-tiff";
import type {RisoMasterPpi} from "../../registry/video/riso-press-tiff";
import {rasterizeRisoSeparationTiff} from "../../registry/video/riso-press-raster";
import {riso68OriginalMasters,riso68PaperProfile} from "./riso-master-separation-studio";
import {risoExampleSpec} from "./riso-print-demo";
import type {RisoAspect} from "./riso-print-demo";

export type RisoPressDeliveryFormat="pdf"|"tiff";
export function riso69Filename(filename:string,format:RisoPressDeliveryFormat,dpi:RisoMasterPpi):string{
  if(!/^[a-z0-9-]+-K\.svg$/.test(filename)||!["pdf","tiff"].includes(format))
    throw new RangeError("RISO69 needs a valid spot-master source filename and file format.");
  return format==="pdf"?filename.replace(/\.svg$/,".pdf"):
    filename.replace(/\.svg$/,"-"+dpi+"ppi.tif");
}
function download(bytes:Uint8Array,filename:string,mime:string){
  const copy=new Uint8Array(bytes.byteLength);copy.set(bytes);
  const url=URL.createObjectURL(new Blob([copy],{type:mime}));
  const a=document.createElement("a");a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),500);
}
const label={display:"grid",gap:5,minWidth:165,font:"600 13px system-ui"} as const;
export function RisoPressDeliveryStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(160),[seed,setSeed]=useState(66);
  const [format,setFormat]=useState<RisoPressDeliveryFormat>("pdf");
  const [dpi,setDpi]=useState<RisoMasterPpi>(300);
  const [marks,setMarks]=useState<RisoSeparationLayout["marks"]>("none");
  const [bleed,setBleed]=useState(3),[safe,setSafe]=useState(8);
  const [printable,setPrintable]=useState(6),[accent,setAccent]=useState(.78);
  const [macro,setMacro]=useState(false),[busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState(""),[lastFile,setLastFile]=useState("");
  const spec=useMemo(()=>risoExampleSpec(aspect,seed),[aspect,seed]);
  const masters=useMemo(()=>riso68OriginalMasters(aspect,frame,seed,accent),
    [aspect,frame,seed,accent]);
  const layout=useMemo(()=>riso68PaperProfile(aspect,{marks,bleedMm:bleed,
    safeMm:safe,printableInsetMm:printable}),[aspect,marks,bleed,safe,printable]);
  const report=useMemo(()=>inspectRisoSeparation(spec,masters,layout),
    [spec,masters,layout]);
  const dimensions=useMemo(()=>measureRisoTiffRaster(layout,dpi),[layout,dpi]);
  const svgs=useMemo(()=>report.ready?Object.fromEntries(
    spec.plates.map(p=>[p.id,serializeRisoSeparationMaster(spec,masters,layout,p.id)])):
    {} as Record<string,string>,[spec,masters,layout,report.ready]);
  const save=async(id:string)=>{
    if(!report.ready||busy)return;
    setBusy(id);setError("");setLastFile("");
    try{
      const filename=riso69Filename(risoSeparationFilename(spec,id),format,dpi);
      const bytes=format==="pdf"
        ?serializeRisoSeparationPdf(spec,masters,layout,id)
        :await rasterizeRisoSeparationTiff(spec,masters,layout,id,dpi);
      download(bytes,filename,format==="pdf"?"application/pdf":"image/tiff");
      setLastFile(filename);
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(null);}
  };
  const [sw,sh]=layout.sheetMm,t=layout.trimMm;
  return <main data-km-riso69-studio="" data-km-riso69-aspect={aspect}
    data-km-riso69-format={format} data-km-riso69-dpi={dpi}
    data-km-riso69-frame={frame} data-km-riso69-zoom={macro?"2":"1"}
    data-km-riso69-ready={String(report.ready)}
    style={{display:"grid",alignContent:"start",gap:18,padding:24,
      background:"#EAE4D9",color:"#24394B",minHeight:"100vh",
      boxSizing:"border-box",font:"14px/1.5 system-ui"}}>
    <header style={{maxWidth:1080}}>
      <div style={{font:"800 12px system-ui",letterSpacing:2}}>
        RISOGRAPH / RISO69 / TWO PHYSICAL SPOT-INK DRUMS / NO HAND STUDIES
      </div>
      <h1 style={{font:"700 30px Georgia,serif",margin:"5px 0"}}>
        Two ink drums · two files · one measured paper grid
      </h1>
      <p style={{margin:0}}>Native Bézier contours, delicate bristle openings and
        all pressure stops are preserved in one grayscale master per spot ink.
        Vector PDFs retain original curves and evenodd holes. Uncompressed
        8-bit grayscale TIFFs convert those exact sources to requested physical PPI.
      </p>
    </header>
    <section aria-label="RISO69 individually printed grayscale stencil previews"
      style={{display:"grid",gridTemplateColumns:
        "repeat(auto-fit,minmax(min(100%,350px),510px))",gap:20,maxWidth:1130}}>
      {spec.plates.map((plate,i)=>{
        const svg=svgs[plate.id];
        const name=riso69Filename(risoSeparationFilename(spec,plate.id),format,dpi);
        return <article key={plate.id} data-km-riso69-panel={plate.id}
          style={{display:"grid",gap:10,minWidth:0}}>
          <header style={{display:"flex",justifyContent:"space-between",gap:10}}>
            <strong>INK {String(i+1).padStart(2,"0")} · {plate.id.toUpperCase()} / K</strong>
            <span aria-label={"Spot ink reference "+plate.id}
              style={{width:17,height:17,borderRadius:"50%",
                background:plate.color,border:"2px solid white",
                outline:"1px solid #786F62"}}/>
          </header>
          <div data-km-riso69-paper="" style={{aspectRatio:sw+" / "+sh,
            overflow:"hidden",background:"white",
            border:"1px solid #978C7D",boxShadow:"0 9px 23px #4D3F3618"}}>
            {svg?<div data-km-riso69-preview={plate.id}
              style={{width:"100%",height:"100%",
                transform:macro?"scale(2)":"none",
                transformOrigin:"50% 50%"}}
              dangerouslySetInnerHTML={{__html:svg.replace("<svg ",
                '<svg style="width:100%;height:auto;display:block" ')}}/>:
              <div style={{padding:20}}>Preflight blocked unsafe print geometry.</div>}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",
            alignItems:"center",gap:9,flexWrap:"wrap"}}>
            <span style={{font:"12px system-ui",wordBreak:"break-all"}}>{name}</span>
            <button type="button" disabled={!report.ready||!!busy}
              aria-label={"RISO69 export "+plate.id+" "+format.toUpperCase()}
              onClick={()=>{void save(plate.id);}}
              style={{minHeight:40,padding:"8px 12px",font:"700 13px system-ui",
                color:"#25394C",background:"#FFFCF7",
                border:"1px solid #7D776E",cursor:"pointer"}}>
              {busy===plate.id?"Preparing original master...":"Export "+format.toUpperCase()}
            </button>
          </div>
        </article>;
      })}
    </section>
    <section aria-label="RISO69 actual printer file settings"
      style={{display:"flex",flexWrap:"wrap",alignItems:"end",gap:14,maxWidth:1130}}>
      <label style={label}>Sheet / orientation
        <select aria-label="RISO69 output orientation" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">A4 landscape / 16:9</option>
          <option value="portrait">A4 portrait / 9:16</option>
        </select>
      </label>
      <label style={label}>Separate master file format
        <select aria-label="RISO69 output format" value={format}
          onChange={e=>setFormat(e.target.value as RisoPressDeliveryFormat)}>
          <option value="pdf">Native vector PDF</option>
          <option value="tiff">Grayscale 8-bit TIFF</option>
        </select>
      </label>
      <label style={label}>TIFF raster pixel density
        <select aria-label="RISO69 raster DPI" value={dpi} disabled={format!=="tiff"}
          onChange={e=>setDpi(Number(e.target.value) as RisoMasterPpi)}>
          <option value={300}>300 PPI</option><option value={600}>600 PPI</option>
        </select>
      </label>
      <label style={label}>Printer crop mark policy
        <select aria-label="RISO69 mark policy" value={marks}
          onChange={e=>setMarks(e.target.value as RisoSeparationLayout["marks"])}>
          <option value="none">No marks (default)</option>
          <option value="crop">Crop only</option>
          <option value="crop-and-register">Crop and registration</option>
        </select>
      </label>
      <label style={label}>Bleed / {bleed.toFixed(1)} mm
        <input aria-label="RISO69 bleed" type="range" min={0} max={10}
          step={.5} value={bleed} onChange={e=>setBleed(Number(e.target.value))}/>
      </label>
      <label style={label}>Protected details / {safe} mm
        <input aria-label="RISO69 critical safe inset" type="range" min={0}
          max={40} step={1} value={safe} onChange={e=>setSafe(Number(e.target.value))}/>
      </label>
      <label style={label}>Printable inset / {printable} mm
        <input aria-label="RISO69 printable inset" type="range" min={4}
          max={16} step={1} value={printable}
          onChange={e=>setPrintable(Number(e.target.value))}/>
      </label>
      <label style={label}>Light-bristle grayscale K / {Math.round(accent*100)}%
        <input aria-label="RISO69 accent K density" type="range" min={.1}
          max={1} step={.05} value={accent}
          onChange={e=>setAccent(Number(e.target.value))}/>
      </label>
      <label style={label}>Original source frame {frame}/239
        <input aria-label="RISO69 absolute source frame" type="range"
          min={0} max={239} value={frame}
          onChange={e=>setFrame(Number(e.target.value))}/>
      </label>
      <label style={label}>Original source seed
        <input aria-label="RISO69 source seed" type="number" min={0}
          max={200000} value={seed}
          onChange={e=>setSeed(Math.max(0,Math.min(200000,
            Math.trunc(Number(e.target.value)||0))))}/>
      </label>
      <label style={{display:"flex",alignItems:"center",gap:9,minHeight:38}}>
        <input aria-label="RISO69 2x source macro" type="checkbox"
          checked={macro} onChange={e=>setMacro(e.target.checked)}/>
        2× original contours
      </label>
    </section>
    <section aria-label="RISO69 native prepress file verification"
      style={{maxWidth:1120,borderTop:"1px solid #A39A8F",
        paddingTop:13,display:"grid",gap:6}}>
      <strong>{report.ready?"Ready for print-shop proof (NOT press-approved)":
        "Export blocked by "+report.issues.length+" safety checks"}</strong>
      <div>Sheet {sw}×{sh} mm · trim {t.width}×{t.height} mm ·
        bleed {bleed} mm · print inset {printable} mm ·
        {report.pathCount} original contours · {report.paperOpeningCount} paper openings.
      </div>
      <div>{format==="pdf"?
        "True vector PDF: Q→C geometry is exact, fill-rule evenodd, DeviceGray.":
        "Baseline TIFF: "+dimensions.width+"×"+dimensions.height+
        " pixel grayscale 8-bit, "+dpi+" PPI, uncompressed single-channel."}</div>
      {report.issues.map((e,i)=><div key={i} style={{color:"#933B2C"}}>
        {e.code}: {e.message}</div>)}
      {error&&<p role="alert" style={{color:"#933B2C"}}>{error}</p>}
      {lastFile&&<p role="status">Downloaded: {lastFile}</p>}
      <p style={{fontSize:12,margin:0}}>
        Files contain no colored proof artwork or synthetic misregistration.
        Shop requirements differ: many require grayscale PDFs, others crop marks.
        Printed feed/ink/bleed and paper stock require independent operator proof.
        The declared A4 profile is a worked example, not a universal Riso machine.
        TIFF necessarily quantizes extremely fine source fibres at the selected PPI.
      </p>
    </section>
  </main>;
}
