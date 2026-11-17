import {useMemo,useState} from "react";
import {createRisoBrushGeometry} from "../../registry/video/riso-dry-brush";
import {createGuardedRisoContactTrap} from "../../registry/video/riso-stencil-topology";
import {inspectRisoSeparation,serializeRisoSeparationMaster,risoSeparationFilename}
  from "../../registry/video/riso-separation-master";
import type {RisoSeparationLayout,RisoSeparationPlate,RisoSeparationShape}
  from "../../registry/video/riso-separation-master";
import {Riso66Panel,riso66Source} from "./riso-contact-trap-studio";
import {risoExampleSpec} from "./riso-print-demo";
import type {RisoAspect} from "./riso-print-demo";

const label={display:"grid",gap:5,font:"600 13px system-ui",minWidth:166} as const;
const paper="#F4F2EC";
const inkBlue="#2362A0",inkRed="#DD593D";

/** Original pressure source, original winding paper slots, and two independent
 * physical masters. The optional RISO67 safety guard chooses only unbroken ink.
 * The export does NOT bake preview RGB or nominal registration drift. */
export function riso68OriginalMasters(
  aspect:RisoAspect,frame:number,seed:number,accentDensity=.78,
):readonly RisoSeparationPlate[]{
  if(!Number.isFinite(accentDensity)||accentDensity<0||accentDensity>1)
    throw new RangeError("RISO68 accent density must be 0..1.");
  const art=riso66Source(aspect,frame,seed);
  const blue=createRisoBrushGeometry(art.blue);
  const red=createRisoBrushGeometry(art.red);
  const guard=createGuardedRisoContactTrap(blue,red,{
    side:"positive",maximumGap:12,maximumExtension:6,overlap:.8,
  });
  const source=(id:string,main:typeof blue,accents:readonly typeof art.blueAccents[number][]):RisoSeparationPlate=>{
    const shapes:RisoSeparationShape[]=[
      {id:"main-pressure-ribbon",outerPath:main.outerPath,
        dryPaths:main.dryPaths,density:1,role:"critical"},
      ...accents.map((s,index)=>{
        const g=createRisoBrushGeometry(s);
        return {id:"fibre-gesture-"+(index+1),
          outerPath:g.outerPath,dryPaths:g.dryPaths,
          density:accentDensity,role:"decorative" as const};
      }),
    ];
    return {id,shapes};
  };
  return [
    source("blue",guard.geometry,art.blueAccents),
    source("red",red,art.redAccents),
  ];
}
export function riso68PaperProfile(aspect:RisoAspect,
  options:Partial<Pick<RisoSeparationLayout,
  "marks"|"bleedMm"|"safeMm"|"printableInsetMm">>={}):RisoSeparationLayout{
  if(aspect!=="landscape"&&aspect!=="portrait")
    throw new RangeError("RISO68 paper profile needs a known artwork ratio.");
  const portrait=aspect==="portrait";
  const sheetMm=portrait?[210,297] as const:[297,210] as const;
  const width=portrait?135:240,height=portrait?240:135;
  return {
    sheetMm,trimMm:{
      x:(sheetMm[0]-width)/2,y:(sheetMm[1]-height)/2,
      width,height,
    },
    bleedMm:options.bleedMm??3,safeMm:options.safeMm??8,
    printableInsetMm:options.printableInsetMm??6,
    marks:options.marks??"none",
  };
}
function triggerSvgDownload(svg:string,filename:string){
  const blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;link.download=filename;
  document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),200);
}

/** The detailed source shapes are never flattened or converted to pixel
 * overlays. Only the two named, independent grayscale master documents
 * are offered for browser export; printer acceptance requires shop review. */
export function RisoMasterSeparationStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(160);
  const [seed,setSeed]=useState(66);
  const [marks,setMarks]=useState<RisoSeparationLayout["marks"]>("none");
  const [bleed,setBleed]=useState(3);
  const [safe,setSafe]=useState(8);
  const [printable,setPrintable]=useState(6);
  const [accentDensity,setAccentDensity]=useState(.78);
  const [guides,setGuides]=useState(true);
  const [proof,setProof]=useState(false);
  const [zoom,setZoom]=useState(false);
  const spec=useMemo(()=>risoExampleSpec(aspect,seed),[aspect,seed]);
  const plates=useMemo(()=>riso68OriginalMasters(aspect,frame,seed,accentDensity),
    [aspect,frame,seed,accentDensity]);
  const layout=useMemo(()=>riso68PaperProfile(aspect,{
    marks,bleedMm:bleed,safeMm:safe,printableInsetMm:printable,
  }),[aspect,marks,bleed,safe,printable]);
  const plan=useMemo(()=>inspectRisoSeparation(spec,plates,layout),
    [spec,plates,layout]);
  const svgByPlate=useMemo(()=>{
    if(!plan.ready)return {} as Record<string,string>;
    return Object.fromEntries(spec.plates.map(p=>[
      p.id,serializeRisoSeparationMaster(spec,plates,layout,p.id),
    ]));
  },[spec,plates,layout,plan.ready]);
  const {trimMm:t,sheetMm:[sw,sh]}=layout;
  return <main data-km-riso68-studio=""
    data-km-riso68-aspect={aspect}
    data-km-riso68-frame={frame}
    data-km-riso68-ready={String(plan.ready)}
    data-km-riso68-marks={marks}
    data-km-riso68-count={plates.length}
    style={{padding:24,background:"#E9E4D9",color:"#253B4C",
      minHeight:"100vh",boxSizing:"border-box",display:"grid",
      alignContent:"start",gap:18,font:"14px/1.5 system-ui"}}>
    <header style={{maxWidth:1120,display:"grid",gap:5}}>
      <div style={{font:"800 12px system-ui",letterSpacing:2}}>
        RISOGRAPH / ARTCRAFT / RISO68 / ORIGINAL VECTOR / NO HAND STUDIES
      </div>
      <h1 style={{font:"700 31px Georgia,serif",margin:0}}>
        Two physical ink masters · grayscale prepress atelier
      </h1>
      <p style={{margin:0,maxWidth:1010}}>
        Two original pressure-loaded drawings are isolated into independent
        grayscale stencil files: K100 is solid spot ink, lighter values reduce
        stencil density. Every original bristle slit, paper pore and torn
        pressure edge stays an evenodd native SVG path. Trim, bleed, printer
        margins and optional marks use one measured shared millimeter grid.
      </p>
    </header>
    <section aria-label="RISO68 separate physical grayscale spot masters"
      style={{display:"grid",
        gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,360px),520px))",
        gap:20,maxWidth:1140,alignItems:"start"}}>
      {spec.plates.map((p,index)=>{
        const svg=svgByPlate[p.id];
        return <article key={p.id} data-km-riso68-master={p.id}
          style={{display:"grid",gap:9,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",
            alignItems:"center",gap:12}}>
            <strong style={{font:"700 15px system-ui",letterSpacing:.7}}>
              {String(index+1).padStart(2,"0")} / {p.id.toUpperCase()} · grayscale K
            </strong>
            <span style={{width:17,height:17,background:p.color,
              borderRadius:"50%",border:"2px solid #FFFFFF",
              boxShadow:"0 0 0 1px #847B6F"}}
              aria-label={"Ink proof swatch "+p.id}/>
          </div>
          <div style={{background:"#FFFFFF",
            border:"1px solid #978D80",boxShadow:"0 8px 22px #63574D20",
            overflow:"hidden",position:"relative",
            aspectRatio:sw+" / "+sh}}>
            {svg?<div data-km-riso68-svg={p.id} style={{
              width:"100%",height:"100%",overflow:"hidden",position:"relative"}}>
              <div data-km-riso68-zoom={zoom?"2":"1"} style={{
                transform:zoom?"scale(2)":"none",
                transformOrigin:"50% 50%"}} 
                dangerouslySetInnerHTML={{__html:svg}}/>
              {guides&&<svg data-km-riso68-preview-guides=""
                aria-label="Preview only trim, bleed and safe-area guides"
                xmlns="http://www.w3.org/2000/svg"
                viewBox={"0 0 "+sw+" "+sh}
                style={{position:"absolute",inset:0,width:"100%",height:"100%",
                  pointerEvents:"none",overflow:"visible"}}
                fill="none" strokeWidth={.42}>
                <rect x={t.x} y={t.y} width={t.width} height={t.height}
                  stroke="#2A8B82" strokeDasharray="2.5 1.8"/>
                <rect x={t.x-bleed} y={t.y-bleed}
                  width={t.width+2*bleed} height={t.height+2*bleed}
                  stroke="#B97537" strokeDasharray="2 2.5"/>
                <rect x={t.x+safe} y={t.y+safe}
                  width={t.width-2*safe} height={t.height-2*safe}
                  stroke="#5167BD" strokeDasharray="1.5 2.5"/>
              </svg>}
            </div>:<div style={{padding:36,fontWeight:700}}>
              Unsafe preflight. No SVG created.
            </div>}
          </div>
          <div style={{display:"flex",alignItems:"center",
            flexWrap:"wrap",justifyContent:"space-between",gap:8}}>
            <span style={{font:"12px system-ui"}}>
              {risoSeparationFilename(spec,p.id)}
            </span>
            <button type="button"
              aria-label={"RISO68 export "+p.id+" grayscale SVG"}
              disabled={!plan.ready}
              onClick={()=>svg&&triggerSvgDownload(svg,
                risoSeparationFilename(spec,p.id))}
              style={{font:"700 13px system-ui",minHeight:38,
                padding:"7px 12px",cursor:plan.ready?"pointer":"not-allowed",
                border:"1px solid #7B746A",background:"#FFFDF7",color:"#293F51"}}>
              Export native SVG
            </button>
          </div>
        </article>;
      })}
    </section>
    <section aria-label="RISO68 print-shop setup and source controls"
      style={{display:"flex",flexWrap:"wrap",alignItems:"end",
        gap:14,maxWidth:1150}}>
      <label style={label}>Output orientation
        <select aria-label="RISO68 output orientation" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 / A4 landscape</option>
          <option value="portrait">9:16 / A4 portrait</option>
        </select>
      </label>
      <label style={label}>Print shop crop/registration policy
        <select aria-label="RISO68 print marks" value={marks}
          onChange={e=>setMarks(e.target.value as RisoSeparationLayout["marks"])}>
          <option value="none">No marks (printer may require)</option>
          <option value="crop">Crop marks only</option>
          <option value="crop-and-register">Crop + registration crosses</option>
        </select>
      </label>
      <label style={label}>Bleed / {bleed.toFixed(1)} mm
        <input aria-label="RISO68 bleed" type="range" min={0}
          max={10} step={.5} value={bleed}
          onChange={e=>setBleed(Number(e.target.value))}/>
      </label>
      <label style={label}>Safe detail inset / {safe.toFixed(1)} mm
        <input aria-label="RISO68 safe margin" type="range" min={0}
          max={24} step={1} value={safe}
          onChange={e=>setSafe(Number(e.target.value))}/>
      </label>
      <label style={label}>Printable inset / {printable.toFixed(1)} mm
        <input aria-label="RISO68 printer inset" type="range" min={4}
          max={16} step={1} value={printable}
          onChange={e=>setPrintable(Number(e.target.value))}/>
      </label>
      <label style={label}>Light-bristle K / {Math.round(accentDensity*100)}%
        <input aria-label="RISO68 accent grayscale" type="range" min={.1}
          max={1} step={.05} value={accentDensity}
          onChange={e=>setAccentDensity(Number(e.target.value))}/>
      </label>
      <label style={label}>Original frame / {frame}/239
        <input aria-label="RISO68 absolute source frame" type="range"
          min={0} max={239} value={frame}
          onChange={e=>setFrame(Number(e.target.value))}/>
      </label>
      <label style={label}>Original seed
        <input aria-label="RISO68 source seed" type="number"
          min={0} max={200000} value={seed}
          onChange={e=>setSeed(Math.max(0,Math.min(200000,
            Math.trunc(Number(e.target.value)||0))))}/>
      </label>
      <label style={{display:"flex",alignItems:"center",gap:8,minHeight:34}}>
        <input aria-label="RISO68 preview guides" type="checkbox"
          checked={guides} onChange={e=>setGuides(e.target.checked)}/>
        Preview-only trim / bleed / safe
      </label>
      <label style={{display:"flex",alignItems:"center",gap:8,minHeight:34}}>
        <input aria-label="RISO68 2x source macro" type="checkbox"
          checked={zoom} onChange={e=>setZoom(e.target.checked)}/>
        2× actual vector inspection
      </label>
      <label style={{display:"flex",alignItems:"center",gap:8,minHeight:34}}>
        <input aria-label="RISO68 color reference proof" type="checkbox"
          checked={proof} onChange={e=>setProof(e.target.checked)}/>
        Also show original two-ink composite
      </label>
    </section>
    <section aria-label="RISO68 grayscale prepress and physical margins report"
      data-km-riso68-issue-count={plan.issues.length}
      data-km-riso68-shapes={plan.pathCount}
      data-km-riso68-paper-openings={plan.paperOpeningCount}
      style={{borderTop:"1px solid #9F978B",paddingTop:14,maxWidth:1130,
        display:"grid",gap:7}}>
      <strong>{plan.ready?"Ready for SVG proof export (not print-shop approval)":
        "Preflight blocked export: "+plan.issues.length+" issue(s)"}</strong>
      <div>
        Sheet {sw} × {sh} mm; trim {t.width} × {t.height} mm;
        bleed {bleed} mm; safe inset {safe} mm; printable inset {printable} mm.
        {" "}Distinct native silhouettes: {plan.pathCount};
        original paper-open cutouts: {plan.paperOpeningCount};
        print marks: {plan.marks.length}.
      </div>
      {plan.issues.map((issue,i)=><div key={i} style={{
        fontWeight:600,color:"#8E342A"}}>
        {issue.code} / {issue.plateId??"layout"}:
        {" "}{issue.message}
      </div>)}
      <div style={{fontSize:12,maxWidth:1020}}>
        Downloaded SVG files are pure K-only vectors, with the spot ink ID/color
        in their filenames but no RGB proof pixels. Original material grain is
        encoded as paper-open source paths. SVG may require conversion to PDF or
        TIFF and physical print verification; different print shops explicitly
        disagree about whether crop marks belong in the supplied masters.
        Registration offsets for visual previews are intentionally NOT baked
        into grayscale files, which share one aligned source grid.
      </div>
    </section>
    {proof&&<section aria-label="RISO68 optional original two-spot reference"
      style={{maxWidth:540}}>
      <Riso66Panel aspect={aspect} frame={frame} seed={seed}
        registered={[2,1.5]} enabled maximumGap={12} extension={6}
        overlap={.8} grain={.61} master="both" zoom={1}
        id="after" topologyGuard/>
      <div style={{fontSize:12}}>
        RGB ink-reference preview only. NOT a color master or print-approved file.
      </div>
    </section>}
    <footer style={{fontSize:12,maxWidth:1070}}>
      These A4 study dimensions are an explicit editable shop profile,
      not a universal Risograph print area, manufacturer calibration or
      certification of print-ready PDFs. Confirm your actual equipment,
      tolerances, crop-mark policy, sheet feed and paper before sending files.
    </footer>
  </main>;
}
