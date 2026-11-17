import {useMemo,useState} from "react";
import {createRisoBrushGeometry,risoBrushClosedPath} from
  "../../registry/video/riso-dry-brush";
import {createGuardedRisoContactTrap,auditRisoTrapTopology}
  from "../../registry/video/riso-stencil-topology";
import type {RisoBrushGeometry} from "../../registry/video/riso-dry-brush";
import {Riso66Panel,riso66Source} from "./riso-contact-trap-studio";
import type {RisoAspect} from "./riso-print-demo";

/** A deliberate test-only crossing stays in the inspector: the renderer
 * NEVER receives or prints this corrupted candidate geometry. */
export function riso67DamagedCandidate(base:RisoBrushGeometry):RisoBrushGeometry{
  const edge=[...base.edgePositive],i=Math.floor(edge.length*.45);
  [edge[i-2],edge[i+2]]=[edge[i+2],edge[i-2]];
  return {...base,edgePositive:edge,outerPath:risoBrushClosedPath([
    ...edge,...base.edgeNegative.slice().reverse(),
  ])};
}
const label={display:"grid",gap:5,minWidth:178,font:"600 13px system-ui"} as const;

/** Native 2-spot RISO66 rich source artwork, now with conditional *actual
 * quadratic-contour* safety before the blue stencil may be rendered. */
export function RisoTopologyGuardStudio(){
  const [aspect,setAspect]=useState<RisoAspect>("landscape");
  const [frame,setFrame]=useState(160);
  const [seed,setSeed]=useState(66);
  const [gap,setGap]=useState(12);
  const [extension,setExtension]=useState(6);
  const [overlap,setOverlap]=useState(.8);
  const [flatness,setFlatness]=useState(.35);
  const [zoom,setZoom]=useState(3);
  const [master,setMaster]=useState<"both"|"blue"|"red">("both");
  const [grain,setGrain]=useState(.61);
  const [stress,setStress]=useState(false);
  const [enabled,setEnabled]=useState(true);
  const result=useMemo(()=>{
    const art=riso66Source(aspect,frame,seed);
    const base=createRisoBrushGeometry(art.blue),
      second=createRisoBrushGeometry(art.red);
    const guarded=createGuardedRisoContactTrap(base,second,{
      side:"positive",maximumGap:gap,
      maximumExtension:enabled?extension:0,overlap,
    },flatness);
    const specimen=stress?riso67DamagedCandidate(base):guarded.proposed.geometry;
    const inspection=stress?auditRisoTrapTopology(base,specimen,flatness):guarded.topology;
    return {guarded,inspection};
  },[aspect,frame,seed,gap,extension,overlap,flatness,stress,enabled]);
  const audit=result.inspection;
  const review=stress?"REJECT / TEST-ONLY CORRUPTED CURVE":
    result.guarded.accepted?"PASS / NO NEW TOPOLOGY DAMAGE":"BLOCK / ORIGINAL RETAINED";
  const shared={aspect,frame,seed,registered:[2,1.5] as const,
    maximumGap:gap,extension,overlap,grain,master,zoom};
  return <main data-km-riso67-studio="" data-km-riso67-aspect={aspect}
    data-km-riso67-frame={frame} data-km-riso67-zoom={zoom}
    data-km-riso67-stress={String(stress)}
    data-km-riso67-audit={audit.noNewDefects?"pass":"blocked"}
    style={{display:"grid",alignContent:"start",gap:15,
      minHeight:"100vh",boxSizing:"border-box",padding:22,
      background:"#EBE2D2",color:"#243E54",font:"14px/1.5 system-ui"}}>
    <header style={{maxWidth:1070}}>
      <div style={{fontWeight:800,fontSize:12,letterSpacing:1.8}}>
        RISOGRAPH / RISO67 / REAL QUADRATIC CONTOURS / NO HAND STUDIES
      </div>
      <h1 style={{font:"700 28px Georgia,serif",margin:"5px 0"}}>
        Trap safety · original dry-paper detail, guarded press contours
      </h1>
      <p style={{margin:0,maxWidth:1020}}>
        Inspect actual adaptive-sampled SVG quadratic boundaries before
        applying a new local ink trap. Detect added contour crossings,
        paper-fibre border cuts and moved-out paper holes. If introduced,
        retain the entire original stencil unchanged, including its pressure
        taper, uneven perimeter and every native paper opening.
      </p>
    </header>
    <section aria-label="RISO67 complete native original vs guarded spot-ink A/B"
      style={{display:"grid",gridTemplateColumns:
        "repeat(auto-fit,minmax(min(100%,350px),490px))",gap:17,maxWidth:1100}}>
      <Riso66Panel {...shared} id="before" enabled={false}/>
      <Riso66Panel {...shared} id="after" enabled={enabled} topologyGuard/>
    </section>
    <section aria-label="RISO67 inspect original ink, physical material and source frame"
      style={{display:"flex",flexWrap:"wrap",alignItems:"end",gap:15,maxWidth:1100}}>
      <label style={label}>Sheet ratio
        <select aria-label="RISO67 sheet ratio" value={aspect}
          onChange={e=>setAspect(e.target.value as RisoAspect)}>
          <option value="landscape">16:9 / 960 × 540</option>
          <option value="portrait">9:16 / 540 × 960</option>
        </select>
      </label>
      <label style={label}>Ink master
        <select aria-label="RISO67 visible ink master" value={master}
          onChange={e=>setMaster(e.target.value as "both"|"blue"|"red")}>
          <option value="both">Two-stencil overprint</option>
          <option value="blue">Cobalt master only</option>
          <option value="red">Vermilion master only</option>
        </select>
      </label>
      <label style={label}>Absolute source frame {frame}/239
        <input aria-label="RISO67 absolute source frame" type="range"
          min={0} max={239} value={frame}
          onChange={e=>setFrame(Number(e.target.value))}/>
      </label>
      <label style={label}>Max facing edge gap {gap.toFixed(1)}px
        <input aria-label="RISO67 contact gap" type="range"
          min={1} max={12} step={.5} value={gap}
          onChange={e=>setGap(Number(e.target.value))}/>
      </label>
      <label style={label}>Local extension {extension.toFixed(1)}px
        <input aria-label="RISO67 extension" type="range"
          min={0} max={12} step={.5} value={extension}
          onChange={e=>setExtension(Number(e.target.value))}/>
      </label>
      <label style={label}>Overprint budget {overlap.toFixed(1)}px
        <input aria-label="RISO67 overlap budget" type="range"
          min={0} max={3} step={.1} value={overlap}
          onChange={e=>setOverlap(Number(e.target.value))}/>
      </label>
      <label style={label}>Curve scan chord error {flatness.toFixed(2)}px
        <input aria-label="RISO67 contour tolerance" type="range"
          min={.1} max={1.5} step={.05} value={flatness}
          onChange={e=>setFlatness(Number(e.target.value))}/>
      </label>
      <label style={label}>Paper grain {grain.toFixed(2)}
        <input aria-label="RISO67 paper grain" type="range"
          min={0} max={1} step={.05} value={grain}
          onChange={e=>setGrain(Number(e.target.value))}/>
      </label>
      <label style={label}>Original source seed
        <input aria-label="RISO67 original source seed" type="number"
          min={0} max={200000} value={seed}
          onChange={e=>setSeed(Math.max(0,Math.min(200000,
            Math.trunc(Number(e.target.value)||0))))}/>
      </label>
      <label style={{display:"flex",gap:8,alignItems:"center",minHeight:32}}>
        <input aria-label="RISO67 3x source macro" type="checkbox"
          checked={zoom===3} onChange={e=>setZoom(e.target.checked?3:1)}/>
        3× source macro / 1× full sheet
      </label>
      <label style={{display:"flex",gap:8,alignItems:"center",minHeight:32}}>
        <input aria-label="RISO67 trap enabled" type="checkbox"
          checked={enabled} onChange={e=>setEnabled(e.target.checked)}/>
        Apply only a topology-checked trap
      </label>
      <label style={{display:"flex",gap:8,alignItems:"center",minHeight:32}}>
        <input aria-label="RISO67 deliberate defect challenge" type="checkbox"
          checked={stress} onChange={e=>setStress(e.target.checked)}/>
        Inject test-only curve crossing into inspector
      </label>
    </section>
    <section aria-label="RISO67 native-contour safety report"
      data-km-riso67-new-self={audit.newSelfContacts}
      data-km-riso67-new-hole={audit.newBorderHoleContacts.length}
      data-km-riso67-no-new-defects={String(audit.noNewDefects)}
      style={{borderTop:"1px solid #958B7E",maxWidth:1100,paddingTop:12}}>
      <strong>{review}</strong>
      <p style={{margin:"5px 0"}}>
        New outer-contour intersections: {audit.newSelfContacts}.
        New paper-hole boundary contacts: {audit.newBorderHoleContacts.length}.
        Newly excluded paper holes: {audit.newExcludedHoles.length}.
        Source dry-fibre subpaths byte-preserved: {String(audit.sourceHolesUnchanged)}.
      </p>
      <p style={{margin:"5px 0"}}>
        Existing baseline warnings: {String(audit.inheritedDefects)}.
        Proposed guard result: {result.guarded.reason}.
        Actual applied extension: {result.guarded.maxAppliedExtension.toFixed(2)}px.
        Missing contours in proposed geometry: {audit.candidate.missingContours}.
      </p>
      <p style={{margin:0,fontSize:12}}>
        The optional challenge intentionally disturbs only an inspector
        candidate. The experimental defective path never enters an ink master.
        This adaptive chord-precision audit detects modeled defects; it is
        not a formal proof of every Bézier collision or press calibration.
        Existing baseline defects remain explicitly reported.
      </p>
    </section>
  </main>;
}
