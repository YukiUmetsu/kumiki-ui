import { useMemo, useState } from "react";
import { PencilDrawing } from "../../registry/video/colored-pencil-react";
import { inspectPencilFoundationDrawing, PENCIL_FOUNDATION_STAGES } from "../../registry/video/colored-pencil-foundation";
import type { PencilAspect } from "../../registry/video/colored-pencil";
import { pencilLivingStudyDrawing } from "./colored-pencil-living-studies";
import { pencilObjectStudyDrawing } from "./colored-pencil-object-studies";

type Specimen="rose"|"fox"|"portrait"|"architecture"|"fabric"|"valley";
const specimenMeta:Record<Specimen,{title:string;detail:string;focus:[number,number]}> = {
  rose:{title:"Botanical / rose",detail:"Curved petal folds, layered reds, directional veins",focus:[.72,.43]},
  fox:{title:"Wildlife / red fox",detail:"Ear, eye socket, cheek and rooted ruff tracts",focus:[.73,.38]},
  portrait:{title:"NEW human / drawing 01 · head mass",detail:"One anatomical head only: cranial silhouette, cheek and jaw volumes; no prior woman, eyes or hair",focus:[.71,.38]},
  architecture:{title:"Built form / brick",detail:"Masonry joints, hard edges and reflected planes",focus:[.72,.45]},
  fabric:{title:"Fabric / metal",detail:"Fold shadow, drape direction and cup reflections",focus:[.68,.49]},
  valley:{title:"Landscape / river",detail:"Atmosphere, distance, evergreen branches and water",focus:[.73,.45]},
};
const choice={padding:"8px 11px",minHeight:40,border:"1px solid #A9B4AA",
  borderRadius:6,background:"#FFFDF5",color:"#364951"} as const;
const caption={display:"grid",gap:5,font:"600 13px system-ui",minWidth:145} as const;
const press={...choice,cursor:"pointer",font:"600 13px system-ui"} as const;
type InspectionFocus="default"|"fox-tail"|"fox-eye"|"fox-ear"|"fox-cheek"|"fox-chest"|"fox-forepaw"|"fox-hock"|"human-head";

/** Select the actual drawn part's projected center, not a guessed camera-space
 * crop. Both aspect transforms are shared with the drawing output itself. */
function projectedInspectionCenter(
  drawing:ReturnType<typeof pencilLivingStudyDrawing>,
  partId:string,
):[number,number]|null{
  const part=drawing.regions.find(region=>region.id===partId);
  const transform=part?.transform?.match(
    /^translate\((-?[\d.]+) (-?[\d.]+)\) scale\(([\d.]+)\)$/);
  if(!part||!transform)return null;
  const [,offsetX,offsetY,scaleText]=transform;
  const [x,y,width,height]=part.bounds;
  const scale=Number(scaleText);
  const px=(Number(offsetX)+(x+width*.5)*scale)/drawing.width;
  const py=(Number(offsetY)+(y+height*.5)*scale)/drawing.height;
  if(!Number.isFinite(px)||!Number.isFinite(py))return null;
  return [Math.max(0,Math.min(1,px)),Math.max(0,Math.min(1,py))];
}

/** In the original Colour-pencil Storybook folder: all samples are CP-F1 qualified.
 * Artwork is 100% programmatic, frame-addressed and authored from original geometry.
 */
export function PencilFoundationStudio(){
  const [specimen,setSpecimen]=useState<Specimen>("rose");
  const [aspect,setAspect]=useState<PencilAspect>("landscape");
  const [frame,setFrame]=useState(335);
  const [pressure,setPressure]=useState(1);
  const [tooth,setTooth]=useState(.74);
  const [burnish,setBurnish]=useState(.78);
  const [seed,setSeed]=useState(291);
  const [zoom,setZoom]=useState(false);
  const [inspectionFocus,setInspectionFocus]=useState<InspectionFocus>("default");
  const [reduced,setReduced]=useState(false);
  const [showTonalSupport,setShowTonalSupport]=useState(true);
  const drawing=useMemo(()=>{
    const base=specimen==="rose"||specimen==="architecture"||specimen==="fabric"?
      pencilObjectStudyDrawing({subject:specimen,aspect,pressure,paperTooth:tooth,seed}):
      pencilLivingStudyDrawing({subject:specimen==="portrait"?"portrait":
        specimen==="fox"?"fox":"valley",aspect,pressure,paperTooth:tooth,seed});
    return {...base,regions:base.regions.map(r=>({
      ...r,craft:r.craft?{...r.craft,burnish}:undefined,
    }))};
  },[specimen,aspect,pressure,tooth,burnish,seed]);
  const errors=inspectPencilFoundationDrawing(drawing);
  if(errors.length)throw new Error("Pencil foundation studio: "+errors.join("; "));
  const current=PENCIL_FOUNDATION_STAGES.reduce((acc,s,i)=>frame>=s.frame?i:acc,0);
  const reference=drawing.foundation!.references[0];
  // ArtCraft macro/meso/micro proof must be able to inspect the ACTUAL
  // corrected anatomy: tail-tip in the wildlife actor and nape/collar
  // in the human actor, at either film aspect. No alternate artwork.
  const focusPart=inspectionFocus==="fox-tail"&&specimen==="fox"?
    "tail-back":inspectionFocus==="fox-eye"&&specimen==="fox"?
    "eye-near":inspectionFocus==="fox-ear"&&specimen==="fox"?
    "ear-near-inner":inspectionFocus==="fox-cheek"&&specimen==="fox"?
    "cheek-ruff":inspectionFocus==="fox-chest"&&specimen==="fox"?
    "chest":inspectionFocus==="fox-forepaw"&&specimen==="fox"?
    "foreleg-right":inspectionFocus==="fox-hock"&&specimen==="fox"?
    "rear-leg":inspectionFocus==="human-head"&&specimen==="portrait"?
    "head-construction":null;
  const focus=(focusPart?projectedInspectionCenter(
    drawing as ReturnType<typeof pencilLivingStudyDrawing>,focusPart):null)??
    specimenMeta[specimen].focus;
  const zoomStyle=zoom?{
    transform:"scale(2.15)",
    transformOrigin:(focus[0]*100)+"% "+(focus[1]*100)+"%",
  }:undefined;
  return <main data-km-foundation-studio="" data-km-foundation-stage={PENCIL_FOUNDATION_STAGES[current].id}
    data-km-foundation-inspection-focus={focusPart??"default"}
    style={{minHeight:"100vh",padding:24,display:"grid",alignContent:"start",
      gap:16,background:"#E8E7DE",font:"15px/1.5 system-ui",color:"#3B4747"}}>
    <header style={{maxWidth:1050,display:"grid",gap:4}}>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:1.6,color:"#61756D"}}>
        CP-F1 / COLOURED-PENCIL DRAWING FOUNDATION
      </div>
      <h1 style={{font:"600 33px Georgia,serif",margin:0}}>
        From observation to a finished pencil drawing
      </h1>
      <p style={{margin:"4px 0",maxWidth:950}}>
        This studio draws original author-defined SVG geometry with CP-F1
        pencil pigments, layered stroke paths and paper-tooth masks.
        There is no source photograph, photographic bitmap underpainting,
        Canvas image overlay or photo filter. Transparent vector tonal
        supports and material gradients remain part of this drawing system.
        CP-F1 validates structure and materials, not artistic realism.
      </p>
    </header>
    <section aria-label="Pencil foundation controls" style={{
      display:"flex",gap:12,flexWrap:"wrap",alignItems:"end",maxWidth:1100,
    }}>
      <label style={caption}>Original subject
        <select aria-label="Foundation subject" style={choice} value={specimen}
          onChange={e=>{
            setSpecimen(e.target.value as Specimen);
            setInspectionFocus("default");
          }}>
          {(Object.keys(specimenMeta) as Specimen[]).map(s=>
            <option key={s} value={s}>{specimenMeta[s].title}</option>)}
        </select>
      </label>
      <label style={caption}>Format
        <select aria-label="Foundation aspect" style={choice} value={aspect}
          onChange={e=>setAspect(e.target.value as PencilAspect)}>
          <option value="landscape">16:9</option><option value="portrait">9:16</option>
        </select>
      </label>
      <label style={caption}>Pencil pressure · {pressure.toFixed(2)}
        <input aria-label="Foundation pressure" type="range" min=".3" max="1.2"
          step=".05" value={pressure} onChange={e=>setPressure(Number(e.target.value))}/>
      </label>
      <label style={caption}>Paper tooth · {tooth.toFixed(2)}
        <input aria-label="Foundation paper tooth" type="range" min="0" max="1"
          step=".05" value={tooth} onChange={e=>setTooth(Number(e.target.value))}/>
      </label>
      <label style={caption}>Burnishing · {burnish.toFixed(2)}
        <input aria-label="Foundation burnish" type="range" min="0" max="1"
          step=".05" value={burnish} onChange={e=>setBurnish(Number(e.target.value))}/>
      </label>
      <label style={caption}>Drawing seed
        <input aria-label="Foundation seed" type="number" style={choice}
          min="0" max="2147483000" value={seed} onChange={e=>{
            const n=Number(e.target.value);
            setSeed(Number.isSafeInteger(n)?Math.min(2147483000,Math.max(0,n)):291);
          }}/>
      </label>
      <label style={caption}>Anatomical inspection focus
        <select aria-label="Foundation inspection focus" style={choice}
          value={inspectionFocus}
          onChange={e=>setInspectionFocus(e.target.value as InspectionFocus)}>
          <option value="default">Reference emphasis</option>
          <option value="fox-tail" disabled={specimen!=="fox"}>
            Fox brush / tail-tip
          </option>
          <option value="fox-eye" disabled={specimen!=="fox"}>
            Fox orbital rim / cheek
          </option>
          <option value="fox-ear" disabled={specimen!=="fox"}>
            Fox near pinna / conchal hollow
          </option>
          <option value="fox-cheek" disabled={specimen!=="fox"}>
            Fox malar-to-neck fur continuity
          </option>
          <option value="fox-chest" disabled={specimen!=="fox"}>
            Fox sternum / cervical ruff
          </option>
          <option value="fox-forepaw" disabled={specimen!=="fox"}>
            Fox carpus / weight-bearing paw
          </option>
          <option value="fox-hock" disabled={specimen!=="fox"}>
            Fox folded hind hock / grounded digits
          </option>
          <option value="human-head" disabled={specimen!=="portrait"}>
            NEW human / head mass only
          </option>
        </select>
      </label>
      <label style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation inspect macro" type="checkbox" checked={zoom}
          onChange={e=>setZoom(e.target.checked)}/> Inspect at 2.15×
      </label>
      <label style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation pigment-only audit" type="checkbox"
          checked={!showTonalSupport} onChange={e=>setShowTonalSupport(!e.target.checked)}/>
        Inspect pigment strokes without tonal support
      </label>
      <label style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation reduced motion" type="checkbox" checked={reduced}
          onChange={e=>setReduced(e.target.checked)}/> Reduced motion
      </label>
    </section>
    <nav aria-label="Foundation drawing stages" style={{
      display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",
      maxWidth:1020,gap:8,
    }}>
      {PENCIL_FOUNDATION_STAGES.map((stage,i)=><button key={stage.id}
        type="button" aria-pressed={i===current}
        onClick={()=>setFrame(stage.frame)}
        style={{...press,textAlign:"left",padding:"10px 12px",
          borderColor:i===current?"#385B51":"#B8BBB1",
          background:i===current?"#E0E7D9":"#FFFDF5"}}>
        <strong>{i+1}. {stage.name}</strong>
        <small style={{display:"block",marginTop:3,color:"#596B65"}}>Frame {stage.frame}</small>
      </button>)}
    </nav>
    <div style={{maxWidth:aspect==="landscape"?960:540,width:"100%",overflow:"hidden",
      background:drawing.paper,boxShadow:"0 16px 48px #4A50462B"}}>
      <PencilDrawing drawing={drawing} frame={frame} reducedMotion={reduced}
        showTonalSupport={showTonalSupport}
        style={zoomStyle} label={specimenMeta[specimen].title+" original coloured pencil study"}/>
    </div>
    <section aria-label="Pencil foundation timeline" style={{maxWidth:960,display:"grid",gap:7}}>
      <label style={caption}>Drawing timeline · frame {frame} / 350
        <input aria-label="Foundation drawing frame" type="range" min="0" max="350"
          value={frame} onChange={e=>setFrame(Number(e.target.value))}/>
      </label>
      <p style={{margin:0,fontSize:13}}><strong>{PENCIL_FOUNDATION_STAGES[current].name}.</strong>
        {" "}{PENCIL_FOUNDATION_STAGES[current].rule}</p>
      <p style={{margin:0,fontSize:13,color:"#596B65"}}>
        {specimenMeta[specimen].detail}. Reference study:
        {" "}<a href={reference.url} target="_blank" rel="noopener noreferrer"
          style={{color:"#355E5B"}}>{reference.title}</a>.
        {" "}{reference.observation} Technique-only, not traced or redistributed.
      </p>
      <p style={{margin:0,fontSize:12,color:"#67736D"}}>
        Photo-free authored vector artwork · CP-F1 technically qualified ·
        {drawing.regions.length} named material regions ·
        {drawing.regions.filter(r=>r.opaqueSupport).length} opaque supports ·
        {drawing.regions.filter(r=>!r.opaqueSupport).length} light/transparent passes ·
        {showTonalSupport?"authored tonal supports enabled":"PIGMENT-ONLY NEGATIVE CONTROL: no gradient tonal supports"} ·
        technical contract passed, independent artistic fidelity review remains open
      </p>
    </section>
  </main>;
}
