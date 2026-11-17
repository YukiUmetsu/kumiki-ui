import {useEffect,useMemo,useState} from "react";
import type {Riso72ScanAffine} from "../../registry/video/riso-paper-photo-affine";
import {riso72SvgMatrix} from "../../registry/video/riso-paper-photo-affine";
import {inspectRiso74NaturalPixelDensity,inspectRiso74RasterPatch,
  riso74PatchToNaturalPixelMatrix}
  from "../../registry/video/riso-scan-native-pixel-evidence";
import type {Riso74RasterPatchStatistics}
  from "../../registry/video/riso-scan-native-pixel-evidence";
import type {Riso71SourceImage} from "./riso71-scan-image-annotator";

const readable=(n:number)=>Number(n.toFixed(2));
type MeasurementState={
  first:Riso74RasterPatchStatistics;second:Riso74RasterPatchStatistics;
}|null;

/** This is LOCAL image analysis, not a reproduction or synthetic rendering of
 * the print. Canvas is a 16..128 sample buffer, never the source illustration.
 * The 1x/3x real photo and original grayscale masters are never modified. */
async function sampleUserPhoto(
  photo:Riso71SourceImage,affine:Riso72ScanAffine,
  mm:readonly [number,number],diameterMm:number,side:number,
):Promise<Riso74RasterPatchStatistics>{
  if(!photo.url.startsWith("blob:"))
    throw new RangeError("RISO74 accepts only user-selected local object-URL scans.");
  const image=new Image();
  image.src=photo.url;
  await image.decode();
  if(image.naturalWidth!==photo.width||image.naturalHeight!==photo.height)
    throw new RangeError("RISO74 original raster changed after marking the PAPER corners.");
  const canvas=document.createElement("canvas");
  canvas.width=side;canvas.height=side;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  if(!ctx)throw new Error("RISO74 cannot obtain a local RGBA sampling buffer.");
  const [a,b,c,d,e,f]=riso74PatchToNaturalPixelMatrix(
    affine,mm,diameterMm,side);
  ctx.imageSmoothingEnabled=false; // no invented subpixel dot texture
  ctx.setTransform(a,b,c,d,e,f);
  ctx.drawImage(image,0,0);
  ctx.setTransform(1,0,0,1,0,0);
  return inspectRiso74RasterPatch(ctx.getImageData(0,0,side,side));
}
const field={display:"grid",gap:5,font:"600 13px system-ui",minWidth:155} as const;

/** RISO74: opt-in macro evidence directly on the two independently annotated
 * RISO73 photos. Resolution and uncalibrated raw color/detail numbers are
 * evidence about the FILE, not proof of an actual Risograph run. */
export function Riso74NativePixelEvidencePanel({firstPhoto,secondPhoto,
  firstPaper,secondPaper,sheetMm}:{
  firstPhoto:Riso71SourceImage;
  secondPhoto:Riso71SourceImage;
  firstPaper:Riso72ScanAffine;
  secondPaper:Riso72ScanAffine;
  sheetMm:readonly [number,number];
}){
  const [xPercent,setXPercent]=useState(50);
  const [yPercent,setYPercent]=useState(50);
  const [diameter,setDiameter]=useState(4);
  const [data,setData]=useState<MeasurementState>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const evidence=useMemo(()=>[
    inspectRiso74NaturalPixelDensity(firstPaper),
    inspectRiso74NaturalPixelDensity(secondPaper),
  ] as const,[firstPaper,secondPaper]);
  const [sw,sh]=sheetMm;
  const center=[sw*xPercent/100,sh*yPercent/100] as const;
  useEffect(()=>{
    let cancelled=false;
    setData(null);setError("");setLoading(true);
    const sampleSide=(i:number)=>Math.min(128,Math.max(16,
      Math.floor(evidence[i].minimumPixelsPerMm*diameter)));
    Promise.all([
      sampleUserPhoto(firstPhoto,firstPaper,center,diameter,sampleSide(0)),
      sampleUserPhoto(secondPhoto,secondPaper,center,diameter,sampleSide(1)),
    ]).then(([first,second])=>{
      if(!cancelled)setData({first,second});
    }).catch(e=>{
      if(!cancelled)setError(e instanceof Error?e.message:String(e));
    }).finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
    // Only scan URL + full affine + selected physical patch determine observations.
  },[firstPhoto,secondPhoto,firstPaper,secondPaper,sw,sh,xPercent,
    yPercent,diameter,evidence]);
  const patch=(photo:Riso71SourceImage,paper:Riso72ScanAffine,
    index:1|2)=><article key={index} data-km-riso74-swatch={index}
      style={{display:"grid",gap:7}}>
      <strong style={{font:"700 13px system-ui"}}>
        Original sheet {index} · sampled physical 4-mm-class micro-area
      </strong>
      <svg viewBox={`${center[0]-diameter/2} ${center[1]-diameter/2} ${diameter} ${diameter}`}
        aria-label={`Sheet ${index} native-photo physical crop with original scanner pixels`}
        width={210} height={210}
        style={{display:"block",width:"min(100%,240px)",height:"auto",
          aspectRatio:"1 / 1",border:"1px solid #8F8579",
          background:"#fff"}}>
        <image href={photo.url} x={0} y={0}
          width={photo.width} height={photo.height}
          preserveAspectRatio="none"
          transform={riso72SvgMatrix(paper.pixelToSheet)}
          style={{imageRendering:"pixelated"}}/>
      </svg>
      <div data-km-riso74-ppi={index}>
        Worst-direction native input:
        {" "}<strong>{readable(evidence[index-1].minimumEffectivePpi)} effective PPI</strong>.
        {" "}Pixel-density classification:
        {" "}{evidence[index-1].microdetail}.
      </div>
    </article>;
  const enough=evidence.every(p=>p.minimumEffectivePpi>=600);
  const someLow=evidence.some(p=>p.minimumEffectivePpi<300);
  return <section data-km-riso74-natural-photo-evidence=""
    data-km-riso74-resolution={someLow?"insufficient":
      enough?"600ppi-plus":"limited"}
    data-km-riso74-loaded={String(Boolean(data))}
    aria-label="RISO74 source-photo native raster resolution and print microstructure sampling"
    style={{display:"grid",gap:12,border:"1px solid #958B7B",
      background:"#FBF8F0",padding:16}}>
    <header style={{display:"grid",gap:4}}>
      <h4 style={{margin:0,font:"700 21px Georgia,serif"}}>
        RISO74 · Native pixels: can the photograph actually resolve ink dots?
      </h4>
      <p style={{margin:0}}>
        Real Risograph reference photographs show mechanical halftone sites,
        paper fibre gaps and plate misregistration. A 3× browser zoom cannot
        recover missing native scan data. The lowest source-pixel density
        along any real paper direction is calculated from the original
        uploaded image, not CSS or any image enhancement.
      </p>
      <strong data-km-riso74-detail-gate="">
        {someLow?"Insufficient native pixels for 300-PPI print-dot inspection.":
          enough?"At least 600 effective input PPI in both images; still NOT printer-certified.":
          "Some input is below 600 effective PPI; smallest ink dots may not be reliable."}
      </strong>
    </header>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"end"}}>
      <label style={field}>Selected paper X · {xPercent}% / {readable(center[0])} mm
        <input aria-label="RISO74 paper sample X"
          type="range" min={10} max={90} step={1}
          value={xPercent} onChange={e=>setXPercent(Number(e.target.value))}/>
      </label>
      <label style={field}>Selected paper Y · {yPercent}% / {readable(center[1])} mm
        <input aria-label="RISO74 paper sample Y"
          type="range" min={10} max={90} step={1}
          value={yPercent} onChange={e=>setYPercent(Number(e.target.value))}/>
      </label>
      <label style={field}>Original paper patch
        <select aria-label="RISO74 original sheet patch diameter"
          value={diameter} onChange={e=>setDiameter(Number(e.target.value))}>
          <option value={2}>2 mm · fine halftone</option>
          <option value={4}>4 mm · contour edges</option>
          <option value={8}>8 mm · layered ink</option>
        </select>
      </label>
    </div>
    <div style={{display:"grid",gap:13,
      gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,260px),1fr))"}}>
      {patch(firstPhoto,firstPaper,1)}
      {patch(secondPhoto,secondPaper,2)}
    </div>
    {loading&&<p role="status" style={{margin:0}}>
      Reading only the selected local sample windows…
    </p>}
    {error&&<p role="alert" data-km-riso74-error=""
      style={{color:"#993C2F",fontWeight:700,margin:0}}>
      Sampling cannot be verified: {error}
    </p>}
    {data&&<div data-km-riso74-measured-stats=""
      style={{overflowX:"auto"}}>
      <table style={{borderCollapse:"collapse",minWidth:510,
        font:"13px/1.55 system-ui"}}>
        <thead><tr style={{textAlign:"left",
          borderBottom:"1px solid #9F9584"}}>
          <th scope="col">Uncalibrated, browser-decoded RGBA sample</th>
          <th scope="col">Sheet 1</th><th scope="col">Sheet 2</th>
        </tr></thead>
        <tbody>
          {([
            ["RGB mean",[...data.first.meanRgb].map(readable).join("/"),
              [...data.second.meanRgb].map(readable).join("/")],
            ["Luminance mean",readable(data.first.meanLuma),
              readable(data.second.meanLuma)],
            ["Luminance variation",readable(data.first.lumaStandardDeviation),
              readable(data.second.lumaStandardDeviation)],
            ["Horizontal adjacent detail",readable(data.first.horizontalContrast),
              readable(data.second.horizontalContrast)],
            ["Vertical adjacent detail",readable(data.first.verticalContrast),
              readable(data.second.verticalContrast)],
            ["Diagnostic grid points (may repeat)",data.first.sampleGridPoints,
              data.second.sampleGridPoints],
          ] as const).map(row=><tr key={row[0]}
            style={{borderBottom:"1px solid #D5C9BC"}}>
            <th scope="row" style={{textAlign:"left"}}>{row[0]}</th>
            <td>{row[1]}</td><td>{row[2]}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}
    <p style={{fontSize:12,margin:0,maxWidth:1030}}>
      Image information only: adjacent-pixel variation can also come from JPEG
      compression, noise, sensor moiré or camera focus. Effective PPI is a
      geometric **upper bound** on source sampling, not proof of sharp
      capture. RGB here is NOT spectrally calibrated RISO ink, coverage,
      printing pressure or ICC color. The browser samples a ≤128×128
      nearest-neighbor local pixel window (low-resolution native pixels may repeat); source images remain unchanged,
      local and unuploaded. Independent physical art sign-off is still required.
    </p>
  </section>;
}
