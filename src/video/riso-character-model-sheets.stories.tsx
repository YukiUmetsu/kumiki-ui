import {useMemo,useRef,useState} from "react";
import type {Meta,StoryObj} from "@storybook/react-vite";
import {RisoCharacterModelSheet} from "../../registry/video/riso-character-sheet-react";
import {evaluateRisoCharacterMesh} from "../../registry/video/riso-proportion-mesh";
import {COURIER,PAPER_BIRD} from "./riso-character-demo";
import {RISO_COURIER_SHEET,RISO_PAPER_BIRD_SHEET} from "./riso-character-mesh-sheets";
import type {RisoCharacterSpec} from "../../registry/video/riso-character";
import type {RisoCharacterMeshSheet} from "../../registry/video/riso-proportion-mesh";

const fields={font:"700 12px system-ui",display:"grid",gap:6,color:"#2A465A"} as const;
const btn={border:"1px solid #BDB2A4",borderRadius:5,background:"#FFFBF2",
  color:"#284960",padding:"8px 12px",cursor:"pointer",font:"700 13px system-ui"} as const;
function CharacterSheetStudio({spec,sheet}:{
  spec:RisoCharacterSpec;sheet:RisoCharacterMeshSheet;
}) {
  const [frame,setFrame]=useState(sheet.poses[0].frame);
  const [focus,setFocus]=useState(sheet.headRegion);
  const [mesh,setMesh]=useState(true);
  const [edgeSize,setEdgeSize]=useState(5);
  // Spend additional triangles only when close-up craftsmanship needs them.
  // The preview and unrelated anatomy keep their inexpensive coarse geometry.
  const focusedBudget=edgeSize<=3?5000:edgeSize<=5?3600:1800;
  const [labels,setLabels]=useState(false);
  const [skeleton,setSkeleton]=useState(false);
  const [category,setCategory]=useState("all");
  const svgHost=useRef<HTMLDivElement>(null);
  const report=useMemo(()=>evaluateRisoCharacterMesh(spec,sheet,frame,{
    maxEdgeLength:edgeSize,focusRegionId:focus,maxTrianglesPerRegion:focusedBudget,
  }),[spec,sheet,frame,edgeSize,focus,focusedBudget]);
  const selected=report.regions.find(r=>r.id===focus)!;
  const categories=[...new Set(sheet.regions.map(r=>r.category))].sort();
  const visible=report.regions.filter(r=>category==="all"||r.category===category);
  const saveSvg=()=>{
    const svg=svgHost.current?.querySelector("svg[data-km-riso-model-sheet]");
    if(!svg)return;
    const serialized=new XMLSerializer().serializeToString(svg);
    const url=URL.createObjectURL(new Blob([serialized],{type:"image/svg+xml;charset=utf-8"}));
    const a=document.createElement("a");
    a.href=url;a.download=`${spec.id}-construction-sheet.svg`;
    a.click();URL.revokeObjectURL(url);
  };
  return <main style={{fontFamily:"system-ui",background:"#E9E4DC",minHeight:"100vh",
    padding:24,display:"grid",gap:18,color:"#243C51"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"end",
      gap:16,flexWrap:"wrap"}}>
      <div>
        <div style={{fontSize:11,letterSpacing:2.4,fontWeight:800}}>VIDEO PRODUCTION / FILM LOOKS / RISOGRAPH CHARACTERS</div>
        <h1 style={{font:"700 32px Georgia,serif",margin:"7px 0"}}>
          {sheet.label} · Construction sheet
        </h1>
        <p style={{maxWidth:850,margin:0,fontSize:14,lineHeight:1.5}}>
          Source-anchored 2D geometry: every selected part shows its head-normalized width,
          height and IK-aware triangulated construction mesh. The three views below are
          animation poses, not invented orthographic turnarounds.
        </p>
      </div>
      <button type="button" style={btn} onClick={saveSvg}>Export SVG sheet</button>
    </header>
    <div style={{display:"grid",gridTemplateColumns:"minmax(0,1220px) minmax(265px,315px)",
      gap:18,alignItems:"start"}}>
      <div ref={svgHost} style={{minWidth:0,boxShadow:"0 18px 38px #31455723"}}>
        <RisoCharacterModelSheet spec={spec} sheet={sheet} frame={frame}
          selectedRegion={focus} showMesh={mesh} meshEdgeLength={edgeSize}
          meshTriangleBudget={focusedBudget} showLabels={labels}
          showJoints={skeleton}/>
      </div>
      <aside style={{display:"grid",gap:17,maxHeight:800,overflowY:"auto",
        background:"#F7F1E7",padding:16,border:"1px solid #D2C7B7",borderRadius:8}}>
        <label style={fields}>Source frame · {frame}
          <input aria-label="Character sheet frame" type="range" min={0}
            max={spec.durationFrames-1} value={frame}
            onChange={e=>setFrame(Number(e.target.value))}/>
        </label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {sheet.poses.map(p=><button type="button" key={p.frame} style={btn}
            onClick={()=>setFrame(p.frame)}>{p.label}</button>)}
        </div>
        <label style={fields}>Mesh cell size · {edgeSize} drawing units (smaller = finer)
          <input aria-label="Character sheet mesh cell size" type="range" min={2}
            max={14} step={1} value={edgeSize} onChange={e=>setEdgeSize(Number(e.target.value))}/>
        </label>
        <div style={{display:"grid",gap:9}}>
          {([
            ["mesh",mesh,setMesh,"Mesh triangles"],
            ["labels",labels,setLabels,"Region labels"],
            ["skeleton",skeleton,setSkeleton,"Joint skeleton"],
          ] as const).map(([id,checked,setter,name])=>
            <label key={id} style={{fontSize:13,fontWeight:650,display:"flex",gap:8,alignItems:"center"}}>
              <input type="checkbox" aria-label={name} checked={checked}
                onChange={e=>setter(e.target.checked)}/>{name}
            </label>)}
        </div>
        <label style={fields}>Component family
          <select aria-label="Character sheet component category" value={category}
            onChange={e=>setCategory(e.target.value)} style={{padding:9}}>
            <option value="all">All regions ({report.regions.length})</option>
            {categories.map(p=><option value={p} key={p}>{p}</option>)}
          </select>
        </label>
        <label style={fields}>Inspect component
          <select aria-label="Character sheet selected region" value={focus}
            onChange={e=>setFocus(e.target.value)} style={{padding:9}}>
            {sheet.regions.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}
          </select>
        </label>
        <div aria-live="polite" data-km-riso-region-metrics={focus}
          style={{background:"#ECE4D7",borderRadius:5,padding:12,display:"grid",gap:6}}>
          <strong style={{fontSize:15}}>{selected.label}</strong>
          <span style={{font:"12px ui-monospace,monospace"}}>
            W {selected.referenceBounds.width.toFixed(1)} ·
            H {selected.referenceBounds.height.toFixed(1)} drawing units
          </span>
          <span style={{font:"12px ui-monospace,monospace"}}>
            {selected.widthInHeads.toFixed(3)} × {selected.heightInHeads.toFixed(3)} head units
          </span>
          <span style={{font:"12px ui-monospace,monospace"}}>
            {selected.sourceContourPoints} source contour points · {selected.triangles.length} fine mesh cells
          </span>
          <span style={{font:"12px ui-monospace,monospace"}}>
            Triangle area residual {Math.abs(selected.triangleArea-selected.contourArea).toFixed(2)} u²
          </span>
          <span data-km-riso-achieved-edge={selected.maxTriangleEdgeLength.toFixed(2)}
            style={{font:"12px ui-monospace,monospace",color:selected.refinementTargetMet?"#285C55":"#A45632"}}>
            Actual largest edge {selected.maxTriangleEdgeLength.toFixed(2)} u
            {selected.refinementTargetMet?" · target met":" · bounded at "+focusedBudget+" cells"}
          </span>
        </div>
        <div style={{borderTop:"1px solid #CBBFAD",paddingTop:12,display:"grid",gap:8}}
          data-km-riso-feature-measurements="">
          <div style={{fontWeight:800,fontSize:13}}>Authored feature distances · head-height H</div>
          {report.measurements.map(m=><div key={m.id}
            data-km-riso-measurement={m.id}
            style={{display:"flex",justifyContent:"space-between",gap:8,
              borderBottom:"1px solid #DED4C6",paddingBottom:5,fontSize:12}}>
            <span>{m.label}</span>
            <strong style={{font:"700 12px ui-monospace,monospace",whiteSpace:"nowrap"}}>
              {m.distanceInHeads.toFixed(3)} H
            </strong>
          </div>)}
        </div>
        <div style={{borderTop:"1px solid #CBBFAD",paddingTop:12,display:"grid",gap:5}}>
          <div style={{fontWeight:800,fontSize:13}}>Mapped parts ({visible.length})</div>
          {visible.map(r=><button key={r.id} type="button"
            aria-pressed={r.id===focus}
            onClick={()=>setFocus(r.id)}
            style={{textAlign:"left",padding:"8px 10px",borderRadius:4,cursor:"pointer",
              font:"600 12px system-ui",border:"1px solid #CFC4B5",
              background:r.id===focus?"#D5E6E6":"#FFFBF1",color:"#294B60"}}>
            {r.label} <span style={{opacity:.75,float:"right"}}>{r.widthInHeads.toFixed(2)} H</span>
          </button>)}
        </div>
      </aside>
    </div>
    <p style={{margin:0,maxWidth:1200,fontSize:12,color:"#5E6A73"}}>
      RISO8 maintains a conforming, small-edge triangle mesh for only the focused source
      region while the original SVG ink remains opaque and untouched. Dimensions stay in actual 2D
      drawing coordinates, not 3D depth. Side, back and three-quarter turnarounds remain unauthored.
    </p>
  </main>;
}
const meta={
  title:"Video production/Film Looks/Risograph Characters",
  id:"video-riso-character-model-sheets",
  component:CharacterSheetStudio,
  parameters:{layout:"fullscreen"},
} satisfies Meta<typeof CharacterSheetStudio>;
export default meta;
type Story=StoryObj<typeof meta>;
export const CourierConstructionSheet:Story={
  name:"Courier · Construction & Proportion Sheet",
  args:{spec:COURIER,sheet:RISO_COURIER_SHEET},
};
export const PaperBirdConstructionSheet:Story={
  name:"Paper Bird · Construction & Proportion Sheet",
  args:{spec:PAPER_BIRD,sheet:RISO_PAPER_BIRD_SHEET},
};
