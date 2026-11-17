import {useMemo,useState} from "react";
import type {RisoProofMark,RisoScanMeasurements}
  from "../../registry/video/riso-scan-proof";
import {createRiso72PaperAffine,riso72ImagePixelToPaperMm,riso72SvgMatrix}
  from "../../registry/video/riso-paper-photo-affine";
import type {Riso72ScanAffine} from "../../registry/video/riso-paper-photo-affine";
import type {Riso71SourceImage} from "./riso71-scan-image-annotator";

type Mode="paired"|"overlaid"|"original"|"scan";
const control={display:"grid",gap:5,font:"600 13px system-ui"} as const;
const compact=(n:number)=>Number(n.toFixed(4));

/** Native RISO68 grayscale master and operator-uploaded photo are displayed
 * over the SAME paper-mm grid. Original paths are still live SVG vectors.
 * The uploaded photo is never auto segmented, recolored, persisted or graded.
 * No plate's registration marks participate in paper rectification. */
export function Riso72PaperPhotoComparator({photo,measurements,sheetMm,
  originalMasters,expectedMarksMm}:{
  photo:Riso71SourceImage;
  measurements:RisoScanMeasurements;
  sheetMm:readonly [number,number];
  originalMasters:Readonly<Record<string,string>>;
  expectedMarksMm:Readonly<Record<RisoProofMark,readonly [number,number]>>;
}){
  const plateIds=Object.keys(originalMasters);
  const [plateId,setPlateId]=useState(plateIds[0]??"");
  const [mode,setMode]=useState<Mode>("paired");
  const [zoom,setZoom]=useState(1);
  const [focusX,setFocusX]=useState(50);
  const [focusY,setFocusY]=useState(50);
  const [blend,setBlend]=useState(.5);
  const [markGuides,setMarkGuides]=useState(true);
  const result=useMemo(()=>{
    try{
      return {affine:createRiso72PaperAffine(measurements,sheetMm,
        [photo.width,photo.height]),error:""};
    }catch(e){
      return {affine:null,error:e instanceof Error?e.message:String(e)};
    }
  },[measurements,sheetMm,photo.width,photo.height]);
  const {affine,error}=result;
  const selected=originalMasters[plateId]?plateId:plateIds[0];
  const [sw,sh]=sheetMm;
  const renderedMark=(proof:Riso72ScanAffine)=>{
    const items=measurements.plates.flatMap((p,i)=>p.marks.map(m=>{
      const actual=riso72ImagePixelToPaperMm(proof,m.scanPx);
      const expected=expectedMarksMm[m.id];
      const delta:[number,number]=[
        actual[0]-expected[0],actual[1]-expected[1]];
      return {id:p.plateId+":"+m.id,expected,actual,delta,i};
    }));
    return items.map(m=><g key={m.id} data-km-riso72-offset={m.id}
      data-km-riso72-dx={compact(m.delta[0])}
      data-km-riso72-dy={compact(m.delta[1])}
      stroke={m.i===0?"#136B98":"#C63E2A"} fill="none">
      <title>{m.id}: measured offset {compact(m.delta[0])} / {compact(m.delta[1])} mm.
        This is an operator-entered observation, not automated ink recognition.</title>
      <line x1={m.expected[0]} y1={m.expected[1]}
        x2={m.actual[0]} y2={m.actual[1]}
        strokeWidth=".35" strokeDasharray="1.2 .8"/>
      <circle cx={m.actual[0]} cy={m.actual[1]} r="1.1"
        strokeWidth=".28"/>
      <path d={`M${m.expected[0]-.8} ${m.expected[1]}h1.6 M${m.expected[0]} ${m.expected[1]-.8}v1.6`}
        strokeWidth=".24"/>
    </g>);
  };
  const mmGrid=(variant:"source"|"scan"|"blend")=>{
    const source=variant!=="scan";
    const scan=variant!=="source";
    const original=originalMasters[selected]??"";
    const camera={width:"100%",height:"100%",
      transform:`scale(${zoom})`,
      transformOrigin:`${focusX}% ${focusY}%`} as const;
    return <article key={variant} data-km-riso72-panel={variant}
      style={{display:"grid",gap:6,minWidth:0}}>
      <strong style={{font:"700 13px system-ui"}}>
        {variant==="source"?"Original grayscale "+selected.toUpperCase()+" drum":
          variant==="scan"?"Image of printed sheet · paper-rectified":
          "Original K-only drum and rectified color scan · visual overlay"}
      </strong>
      <div style={{position:"relative",width:"100%",aspectRatio:sw+" / "+sh,
        overflow:"hidden",background:"#fff",
        border:"1px solid #978E81"}}>
        {source&&<div data-km-riso72-original-master={selected}
          style={{...camera,position:"absolute",inset:0}}
          dangerouslySetInnerHTML={{__html:original.replace("<svg ",
            '<svg style="display:block;width:100%;height:100%" ')}}/>}
        {scan&&affine&&<svg data-km-riso72-rectified-photo=""
          viewBox={`0 0 ${sw} ${sh}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{...camera,position:"absolute",inset:0,
            opacity:variant==="blend"?blend:1}}>
          <image href={photo.url} x={0} y={0}
            width={photo.width} height={photo.height}
            preserveAspectRatio="none"
            transform={riso72SvgMatrix(affine.pixelToSheet)}/>
        </svg>}
        {scan&&affine&&markGuides&&<svg
          data-km-riso72-registration-guides=""
          viewBox={`0 0 ${sw} ${sh}`}
          aria-label="Operator-supplied per-drum mark offsets on paper"
          style={{...camera,position:"absolute",inset:0,
            pointerEvents:"none"}}>
          {renderedMark(affine)}
        </svg>}
      </div>
    </article>;
  };
  return <section data-km-riso72-photo-comparison=""
    data-km-riso72-valid={String(Boolean(affine))}
    data-km-riso72-mode={mode} data-km-riso72-zoom={zoom}
    data-km-riso72-paper-residual={
      affine?compact(affine.worstPaperCornerResidualMm):"invalid"}
    aria-label="RISO72 native master to actual scanned image paper comparison"
    style={{display:"grid",gap:14,maxWidth:1130,
      padding:15,border:"1px solid #9E9585",background:"#F8F3E9"}}>
    <header>
      <h3 style={{font:"700 21px Georgia,serif",margin:"0 0 5px"}}>
        RISO72 · Original ink versus paper-registered scan
      </h3>
      <p style={{margin:0}}>Independent original grayscale spot drum on the
        left; original uploaded scanned image on the right. Both show the same
        **physical sheet** millimeter coordinate system, aligned using
        FOUR PAPER corners only. Stencil fibers, paper-open slots, and source
        gradients remain original native vectors. Overprinted RGB photo colors
        are not density-matched to a single K-only drum.
      </p>
    </header>
    {error?<p role="alert" data-km-riso72-error=""
      style={{fontWeight:700,color:"#983C2D"}}>{error}</p>:<>
      <p style={{margin:0}} data-km-riso72-scanner-residual="">
        Source photo {photo.width} × {photo.height} real pixels; sheet
        {" "}{sw} × {sh} mm. Paper-only fourth-corner disagreement:
        {" "}{compact(affine!.worstPaperCornerResidualMm)} mm.
        Black/blue and vermilion cross marks are independently measured,
        NOT used to hide registration drift.
      </p>
      <div style={{display:"flex",gap:13,flexWrap:"wrap",alignItems:"end"}}>
        <label style={control}>Which original physical master
          <select aria-label="RISO72 original spot ink"
            value={selected} onChange={e=>setPlateId(e.target.value)}>
            {plateIds.map(id=><option value={id} key={id}>{id} · native K-only</option>)}
          </select>
        </label>
        <label style={control}>Visual inspection mode
          <select aria-label="RISO72 inspection mode"
            value={mode} onChange={e=>setMode(e.target.value as Mode)}>
            <option value="paired">Paired original / scanned</option>
            <option value="overlaid">On-sheet overlay comparison</option>
            <option value="original">Source master only</option>
            <option value="scan">Rectified scanned paper only</option>
          </select>
        </label>
        <label style={control}>Synchronized magnification · {zoom}×
          <select aria-label="RISO72 synchronized zoom"
            value={zoom} onChange={e=>setZoom(Number(e.target.value))}>
            <option value={1}>1× whole sheet</option>
            <option value={2}>2× stencil pressure</option>
            <option value={3}>3× paper/fibre macro</option>
          </select>
        </label>
        <label style={control}>Camera X · {focusX}% of sheet
          <input type="range" min={0} max={100} step={1}
            aria-label="RISO72 camera X" value={focusX}
            onChange={e=>setFocusX(Number(e.target.value))}/>
        </label>
        <label style={control}>Camera Y · {focusY}% of sheet
          <input type="range" min={0} max={100} step={1}
            aria-label="RISO72 camera Y" value={focusY}
            onChange={e=>setFocusY(Number(e.target.value))}/>
        </label>
        {mode==="overlaid"&&<label style={control}>
          Scan over K-only source · {Math.round(blend*100)}%
          <input type="range" min={0} max={1} step={.05}
            aria-label="RISO72 scan overlay opacity"
            value={blend} onChange={e=>setBlend(Number(e.target.value))}/>
        </label>}
        <label style={{display:"flex",gap:7,alignItems:"center",minHeight:38}}>
          <input type="checkbox" checked={markGuides}
            aria-label="RISO72 observed ink registration guides"
            onChange={e=>setMarkGuides(e.target.checked)}/>
          Show paper-registered drum cross offsets
        </label>
      </div>
      <div data-km-riso72-panels=""
        style={{display:"grid",
          gridTemplateColumns:mode==="paired"?
            "repeat(auto-fit,minmax(min(100%,380px),1fr))":"minmax(0,660px)",
          gap:13,alignItems:"start"}}>
        {mode==="paired"?<>{mmGrid("source")}{mmGrid("scan")}</>:
          mode==="overlaid"?mmGrid("blend"):
          mode==="original"?mmGrid("source"):mmGrid("scan")}
      </div>
      <p style={{fontSize:12,margin:0,maxWidth:1010}}>
        Artist review, NOT calibrated press verification. Uncorrected
        perspective/rolled paper and source-photo lighting are rejected or
        remain visible. No automatic contour extraction or texture smoothing;
        compare real photographed ink edges, paper openings and any ghost
        registration at 1×/3× against original two plate masters. This view
        never changes the downloadable PDF/TIFF masters or FilmStage render.
      </p>
    </>}
  </section>;
}
