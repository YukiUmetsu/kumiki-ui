import { useMemo, useState } from "react";
import { PencilDrawing } from "../../registry/video/colored-pencil-react";
import { inspectPencilFoundationDrawing, PENCIL_FOUNDATION_STAGES } from "../../registry/video/colored-pencil-foundation";
import type { PencilAspect, PencilDrawingSpec } from "../../registry/video/colored-pencil";
import { pencilLivingStudyDrawing } from "./colored-pencil-living-studies";
import {
  HEAD_FIDELITY_LANDMARK_IDS, HEAD_FIDELITY_TONES,
  evaluatePencilHeadFidelity,
} from "./colored-pencil-head-fidelity";
import { pencilObjectStudyDrawing } from "./colored-pencil-object-studies";

type Specimen="rose"|"fox"|"portrait"|"architecture"|"fabric"|"valley";
type AnatomyValueBand="all"|"highlight"|"light"|"halftone"|"core-shadow"|"reflected-light";
const specimenMeta:Record<Specimen,{title:string;detail:string;focus:[number,number]}> = {
  rose:{title:"Botanical / rose",detail:"Curved petal folds, layered reds, directional veins",focus:[.72,.43]},
  fox:{title:"Wildlife / red fox",detail:"Ear, eye socket, cheek and rooted ruff tracts",focus:[.73,.38]},
  portrait:{title:"New human #01 / HEAD ONLY",detail:"Fresh one-character construction; only facial contour and bony value guides exist. Eyes, nose, mouth, ears and hair are NOT drawn yet.",focus:[.70,.42]},
  architecture:{title:"Built form / brick",detail:"Masonry joints, hard edges and reflected planes",focus:[.72,.45]},
  fabric:{title:"Fabric / metal",detail:"Fold shadow, drape direction and cup reflections",focus:[.68,.49]},
  valley:{title:"Landscape / river",detail:"Atmosphere, distance, evergreen branches and water",focus:[.73,.45]},
};
const choice={padding:"8px 11px",minHeight:40,border:"1px solid #A9B4AA",
  borderRadius:6,background:"#FFFDF5",color:"#364951"} as const;
const caption={display:"grid",gap:5,font:"600 13px system-ui",minWidth:145} as const;
const press={...choice,cursor:"pointer",font:"600 13px system-ui"} as const;
type InspectionFocus="default"|"fox-tail"|"fox-eye"|"fox-ear"|"fox-cheek"|"fox-chest"|"fox-forepaw"|"fox-hock"|"portrait-head"|"rose-left-leaf"|"rose-right-leaf"|"rose-calyx"|"rose-fold-left"|"rose-fold-right"|"rose-fold-back"|"rose-front-left"|"rose-front-right"|"rose-whorl-center"|"rose-whorl-recess"|"rose-mid-left"|"rose-mid-right"|"rose-value-left"|"rose-value-right";

/** Select the actual drawn part's projected center, not a guessed camera-space
 * crop. Both aspect transforms are shared with the drawing output itself. */
function projectedInspectionCenter(
  drawing:PencilDrawingSpec,
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
  const [specimen,setSpecimen]=useState<Specimen>("portrait");
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
  const [valueBand,setValueBand]=useState<AnatomyValueBand>("all");
  const [headContourCraft,setHeadContourCraft]=useState(true);
  const [headVolumeWeave,setHeadVolumeWeave]=useState(true);
  const [headSilhouetteStudy,setHeadSilhouetteStudy]=useState(false);
  const [roseLaminaStudy,setRoseLaminaStudy]=useState(true);
  const [roseLipStudy,setRoseLipStudy]=useState(false);
  const [roseCalyxStudy,setRoseCalyxStudy]=useState(false);
  const [rosePinnateStudy,setRosePinnateStudy]=useState(false);
  const [rosePhysicalFolds,setRosePhysicalFolds]=useState(false);
  const [roseInnerWhorlStudy,setRoseInnerWhorlStudy]=useState(false);
  const [roseMiddleCupStudy,setRoseMiddleCupStudy]=useState(false);
  const [roseFrontValueStudy,setRoseFrontValueStudy]=useState(false);
  const drawing=useMemo(()=>{
    const base=specimen==="rose"||specimen==="architecture"||specimen==="fabric"?
      pencilObjectStudyDrawing({subject:specimen,aspect,pressure,paperTooth:tooth,
        seed,roseLaminaStudy:specimen==="rose"&&roseLaminaStudy,
        roseLipStudy:specimen==="rose"&&roseLipStudy,
        roseCalyxStudy:specimen==="rose"&&roseCalyxStudy,
        rosePinnateStudy:specimen==="rose"&&rosePinnateStudy,
        rosePhysicalFolds:specimen==="rose"&&rosePhysicalFolds,
        roseInnerWhorlStudy:specimen==="rose"&&roseInnerWhorlStudy,
        roseMiddleCupStudy:specimen==="rose"&&roseMiddleCupStudy,
        roseFrontValueStudy:specimen==="rose"&&rosePhysicalFolds&&roseFrontValueStudy}):
      pencilLivingStudyDrawing({subject:specimen==="portrait"?"portrait":
        specimen==="fox"?"fox":"valley",aspect,pressure,paperTooth:tooth,
        seed,headContourCraft,headVolumeWeave,headSilhouetteStudy});
    return {...base,regions:base.regions.map(r=>({
      ...r,craft:r.craft?{...r.craft,burnish}:undefined,
    }))};
  },[specimen,aspect,pressure,tooth,burnish,seed,
    headContourCraft,headVolumeWeave,headSilhouetteStudy,roseLaminaStudy,roseLipStudy,roseCalyxStudy,rosePinnateStudy,rosePhysicalFolds,roseInnerWhorlStudy,roseMiddleCupStudy,roseFrontValueStudy]);
  // Reference-grade debugging only. The normal studio/export uses the
  // complete original pencil drawing. Selecting a band isolates those
  // REAL native ANAT1-lit SVG paths, never swaps in a bitmap, generated
  // illustration or alternative approximation of the human head.
  const displayedDrawing=useMemo(()=>{
    if(specimen!=="portrait"||valueBand==="all")return drawing;
    return {...drawing,regions:drawing.regions.map(region=>({
      ...region,
      details:region.details?.filter(trace=>trace.id?.startsWith(
        "newhead-anat1-"+valueBand+"-")),
    }))};
  },[drawing,specimen,valueBand]);
  // No real photographer-authorized source or independently measured
  // native export exists yet. A mesh normal and its own projected guide
  // points are NOT a photo reference. The gate MUST fail closed.
  const sourceProof=evaluatePencilHeadFidelity();
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
    "rear-leg":inspectionFocus==="rose-left-leaf"&&specimen==="rose"&&rosePinnateStudy?
    "rose-left-pair-far-down":inspectionFocus==="rose-right-leaf"&&specimen==="rose"&&rosePinnateStudy?
    "rose-right-pair-near-down":inspectionFocus==="rose-calyx"&&specimen==="rose"&&roseCalyxStudy?
    "calyx-receptacle":inspectionFocus==="rose-fold-left"&&specimen==="rose"&&rosePhysicalFolds?
    "rose-turn-outer-left":inspectionFocus==="rose-fold-right"&&specimen==="rose"&&rosePhysicalFolds?
    "rose-turn-petal-front-right":inspectionFocus==="rose-fold-back"&&specimen==="rose"&&rosePhysicalFolds?
    "rose-turn-back-cup":inspectionFocus==="rose-front-left"&&specimen==="rose"&&rosePhysicalFolds?
    "petal-front-left":inspectionFocus==="rose-front-right"&&specimen==="rose"&&rosePhysicalFolds?
    "petal-front-right":inspectionFocus==="rose-whorl-center"&&specimen==="rose"&&roseInnerWhorlStudy?
    "rose-whorl-scroll":inspectionFocus==="rose-whorl-recess"&&specimen==="rose"&&roseInnerWhorlStudy?
    "rose-whorl-recess":inspectionFocus==="rose-mid-left"&&specimen==="rose"&&roseMiddleCupStudy?
    "rose-mid-left-shoulder":inspectionFocus==="rose-mid-right"&&specimen==="rose"&&roseMiddleCupStudy?
    "rose-mid-right-tuck":inspectionFocus==="rose-value-left"&&specimen==="rose"&&rosePhysicalFolds&&roseFrontValueStudy?
    "rose-front-left-cool-core":inspectionFocus==="rose-value-right"&&specimen==="rose"&&rosePhysicalFolds&&roseFrontValueStudy?
    "rose-front-right-cool-core":inspectionFocus==="portrait-head"&&specimen==="portrait"?
    "head-silhouette-01":null;
  const focus=(focusPart?projectedInspectionCenter(drawing,focusPart):null)??
    specimenMeta[specimen].focus;
  const zoomStyle=zoom?{
    transform:"scale(2.15)",
    transformOrigin:(focus[0]*100)+"% "+(focus[1]*100)+"%",
  }:undefined;
  return <main data-km-foundation-studio="" data-km-foundation-stage={PENCIL_FOUNDATION_STAGES[current].id}
    data-km-foundation-inspection-focus={focusPart??"default"}
    data-km-anat1-value-inspection={specimen==="portrait"?valueBand:"all"}
    data-km-contour-craft={specimen==="portrait"?(headContourCraft?"on":"off"):"not-applicable"}
    data-km-head-cranial-volume={specimen==="portrait"?(headVolumeWeave?"on":"off"):"not-applicable"}
    data-km-skull-silhouette-study={specimen==="portrait"?
      (headSilhouetteStudy?"oblique":"baseline"):"not-applicable"}
    data-km-rose-physical-folds={specimen==="rose"?(rosePhysicalFolds?"opt-in":"baseline"):"not-applicable"}
    data-km-rose-inner-whorl={specimen==="rose"?(roseInnerWhorlStudy?"opt-in":"baseline"):"not-applicable"}
    data-km-rose-middle-cup={specimen==="rose"?(roseMiddleCupStudy?"opt-in":"baseline"):"not-applicable"}
    data-km-rose-front-value={specimen==="rose"?(rosePhysicalFolds&&roseFrontValueStudy?"opt-in":"baseline"):"not-applicable"}
    data-km-rose-pinnate-study={specimen==="rose"?(rosePinnateStudy?"opt-in":"baseline"):"not-applicable"}
    data-km-rose-calyx-study={specimen==="rose"?(roseCalyxStudy?"opt-in":"baseline"):"not-applicable"}
    data-km-rose-rolled-lip={specimen==="rose"?(roseLipStudy?"opt-in":"baseline"):"not-applicable"}
    data-km-rose-lamina-study={specimen==="rose"?
      (roseLaminaStudy?"opt-in":"baseline"):"not-applicable"}
    style={{minHeight:"100vh",padding:24,display:"grid",alignContent:"start",
      gap:16,background:"#E8E7DE",font:"15px/1.5 system-ui",color:"#3B4747"}}>
    <header style={{maxWidth:1050,display:"grid",gap:4}}>
      <div style={{fontSize:12,fontWeight:700,letterSpacing:1.6,color:"#61756D"}}>
        CP-F1 / COLOURED-PENCIL DRAWING FOUNDATION
      </div>
      <h1 style={{font:"600 33px Georgia,serif",margin:0}}>
        From observation to a finished pencil drawing
      </h1>
      {specimen==="portrait"&&<p data-km-character-stage="head-outline"
        style={{margin:0,fontSize:13,fontWeight:700,color:"#715443"}}>
        NEW CHARACTER #01 · STAGE 1 OF ONE ACTIVE FEATURE · HEAD CONTOUR ONLY.
        Previous woman removed; eyes, nose, lips, ears, hair and clothing are intentionally not authored.
      </p>}
      <p style={{margin:"4px 0",maxWidth:950}}>
        This studio draws original author-defined SVG geometry with CP-F1
        pencil pigments, layered stroke paths and paper-tooth masks.
        There is no source photograph, photographic bitmap underpainting,
        Canvas image overlay or photo filter. Transparent vector tonal
        supports and material gradients remain part of this drawing system.
        CP-F1 validates structure and materials, not artistic realism.
      </p>
    </header>
    {specimen==="portrait"&&<section data-km-head-source-proof=""
      data-km-head-source-fidelity={sourceProof.status}
      data-km-head-source-photo="none"
      aria-label="ArtCraft independent head photo fidelity"
      style={{border:"1px solid #A48D81",borderRadius:6,
        maxWidth:960,padding:"13px 16px",background:"#FAF6EE",
        display:"grid",gap:7,fontSize:13}}>
      <strong>Artist reference proof · BLOCKED (head only)</strong>
      <div>{sourceProof.errors.join(", ")}. ANAT1's projected model
        landmarks and synthetic five-value lighting are NOT independent
        source-photo measurements. No artistic approval has been granted.</div>
      <details>
        <summary style={{cursor:"pointer",fontWeight:600}}>
          Review independent photo requirements · 18 landmarks / 5 tonal regions
        </summary>
        <p style={{maxWidth:825,margin:"8px 0"}}>
          Select a rights-verified full-head 3/4 photograph with complete
          skull, temples, jaw and clear directional light. Hash its exact
          bytes and the native SVG render separately (SHA-256). Independently
          annotate the same 18 points and sample five real pixel areas on
          BOTH images. Compare source and render before adding any eye.
        </p>
        <div style={{display:"grid",gridTemplateColumns:
          "repeat(auto-fit,minmax(215px,1fr))",gap:18}}>
          <section>
            <b>18 image-measured geometry anchors</b>
            <ol style={{paddingLeft:22,margin:"6px 0 0"}}>
              {HEAD_FIDELITY_LANDMARK_IDS.map(id=><li
                data-km-head-source-landmark-id={id} key={id}>{id}</li>)}
            </ol>
          </section>
          <section>
            <b>Five source/output luminance patches</b>
            <ol style={{paddingLeft:22,margin:"6px 0 0"}}>
              {HEAD_FIDELITY_TONES.map(id=><li
                data-km-head-source-tone-id={id} key={id}>{id}</li>)}
            </ol>
          </section>
        </div>
        <p style={{margin:"10px 0 0"}}>
          Measured numerical parity is a prerequisite for independent artist
          review, NOT a realism certification. The photographed person is
          only a licensed reference, never a copied character or image layer.
        </p>
      </details>
    </section>}
    <section aria-label="Pencil foundation controls" style={{
      display:"flex",gap:12,flexWrap:"wrap",alignItems:"end",maxWidth:1100,
    }}>
      <label style={caption}>Original subject
        <select aria-label="Foundation subject" style={choice} value={specimen}
          onChange={e=>{
            setSpecimen(e.target.value as Specimen);
            setInspectionFocus("default");
            setValueBand("all");
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
          <option value="portrait-head" disabled={specimen!=="portrait"}>
            New character #01 / head contour only
          </option>
          <option value="rose-left-leaf" disabled={specimen!=="rose"||!rosePinnateStudy}>
            Rose left compound leaflet / actual serration
          </option>
          <option value="rose-right-leaf" disabled={specimen!=="rose"||!rosePinnateStudy}>
            Rose right compound leaflet / actual vein contacts
          </option>
          <option value="rose-calyx" disabled={specimen!=="rose"||!roseCalyxStudy}>
            Rose five-sepal receptacle / negative-space junction
          </option>
          <option value="rose-fold-left" disabled={specimen!=="rose"||!rosePhysicalFolds}>
            Rose left outer underturn / actual abaxial surface
          </option>
          <option value="rose-fold-right" disabled={specimen!=="rose"||!rosePhysicalFolds}>
            Rose front-right underturn / physical fold seam
          </option>
          <option value="rose-fold-back" disabled={specimen!=="rose"||!rosePhysicalFolds}>
            Rose back-cup underturn / near-center curl
          </option>
          <option value="rose-front-left" disabled={specimen!=="rose"||!rosePhysicalFolds}>
            Rose front-left lamina / curved medial attachment
          </option>
          <option value="rose-front-right" disabled={specimen!=="rose"||!rosePhysicalFolds}>
            Rose front-right lamina / S-curve medial seam
          </option>
          <option value="rose-whorl-center" disabled={specimen!=="rose"||!roseInnerWhorlStudy}>
            Rose inner whorl / front spiral roll
          </option>
          <option value="rose-whorl-recess" disabled={specimen!=="rose"||!roseInnerWhorlStudy}>
            Rose inner whorl / deep shaded cup
          </option>
          <option value="rose-mid-left" disabled={specimen!=="rose"||!roseMiddleCupStudy}>
            Rose middle cup / left lifted shoulder
          </option>
          <option value="rose-mid-right" disabled={specimen!=="rose"||!roseMiddleCupStudy}>
            Rose middle cup / right tucked wall
          </option>
          <option value="rose-value-left" disabled={specimen!=="rose"||!rosePhysicalFolds||!roseFrontValueStudy}>
            Rose left frontal petal / cool core at 2.15×
          </option>
          <option value="rose-value-right" disabled={specimen!=="rose"||!rosePhysicalFolds||!roseFrontValueStudy}>
            Rose right frontal petal / cool core at 2.15×
          </option>
        </select>
      </label>
      {specimen==="portrait"&&<label style={caption}>ANAT1 surface value · inspected
        <select aria-label="Foundation ANAT1 value band" style={choice}
          value={valueBand}
          onChange={e=>setValueBand(e.target.value as AnatomyValueBand)}>
          <option value="all">All five values / full drawing</option>
          <option value="highlight">Highlight reserve</option>
          <option value="light">Lit plane</option>
          <option value="halftone">Halftone turn</option>
          <option value="core-shadow">Core shadow</option>
          <option value="reflected-light">Reflected-light return</option>
        </select>
      </label>}
      {specimen==="rose"&&<label
        style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation rose petal lamina fibres"
          type="checkbox" checked={roseLaminaStudy}
          onChange={e=>setRoseLaminaStudy(e.target.checked)}/>
        Four-pass petal fibres · original A/B (experimental)
      </label>}
      {specimen==="rose"&&<label
        style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation rose rolled lip study"
          type="checkbox" checked={roseLipStudy}
          onChange={e=>setRoseLipStudy(e.target.checked)}/>
        Source-native petal curl shadow / reflected edge / dry highlight · A/B (experimental)
      </label>}
      {specimen==="rose"&&<label
        style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation rose calyx anatomy" type="checkbox"
          checked={roseCalyxStudy} onChange={e=>setRoseCalyxStudy(e.target.checked)}/>
        FLORA1 calyx: five attached sepals / receptacle · anatomical A/B (unapproved)
      </label>}
      {specimen==="rose"&&<label
        style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation rose pinnate leaves" type="checkbox"
          checked={rosePinnateStudy}
          onChange={e=>setRosePinnateStudy(e.target.checked)}/>
        FLORA1 compound leaf · 5 serrated leaflets, rachis and stipules per spray · A/B (unapproved)
      </label>}
      {specimen==="rose"&&<label
        style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation rose physical folds" type="checkbox"
          checked={rosePhysicalFolds} onChange={e=>setRosePhysicalFolds(e.target.checked)}/>
        FLORA1 five independent full-surface rolled underturns · geometric corolla A/B (unapproved)
      </label>}
      {specimen==="rose"&&<label
        style={{display:"flex",gap:7,alignItems:"center",minHeight:40,
          opacity:rosePhysicalFolds?1:.65}}>
        <input aria-label="Foundation rose front value planes" type="checkbox"
          disabled={!rosePhysicalFolds} checked={roseFrontValueStudy}
          onChange={e=>setRoseFrontValueStudy(e.target.checked)}/>
        FLORA1 paired translucent cool-shadow / warm-light pencil planes · physical-fold A/B (unapproved)
      </label>}
      {specimen==="rose"&&<label
        style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation rose nested inner whorl" type="checkbox"
          checked={roseInnerWhorlStudy}
          onChange={e=>setRoseInnerWhorlStudy(e.target.checked)}/>
        FLORA1 inner rose / four separately shaded, overlapping curled petals · A/B (unapproved)
      </label>}
      {specimen==="rose"&&<label
        style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation rose middle cup" type="checkbox"
          checked={roseMiddleCupStudy}
          onChange={e=>setRoseMiddleCupStudy(e.target.checked)}/>
        FLORA1 three asymmetric intermediate cup laminae · anatomical A/B (unapproved)
      </label>}
      {specimen==="portrait"&&<label
        style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation head contour contacts" type="checkbox"
          checked={headContourCraft}
          onChange={e=>setHeadContourCraft(e.target.checked)}/>
        Anatomy-connected contour pigment · A/B
      </label>}
      {specimen==="portrait"&&<label
        style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation head cranial optical volume"
          type="checkbox" checked={headVolumeWeave}
          onChange={e=>setHeadVolumeWeave(e.target.checked)}/>
        Five-tone cranial dry weave · A/B (unapproved)
      </label>}
      {specimen==="portrait"&&<label
        style={{display:"flex",gap:7,alignItems:"center",minHeight:40}}>
        <input aria-label="Foundation three-quarter skull reconstruction"
          type="checkbox" checked={headSilhouetteStudy}
          onChange={e=>setHeadSilhouetteStudy(e.target.checked)}/>
        Reconstructed 3/4 skull contour · shape A/B (not photo-approved)
      </label>}
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
      <PencilDrawing drawing={displayedDrawing} frame={frame} reducedMotion={reduced}
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
        {specimen==="portrait"&&valueBand!=="all"?"ANAT1 VALUE ISOLATION: only one real value-band stroke family; reset to all for full art · ":""}
        technical contract passed, independent artistic fidelity review remains open
      </p>
    </section>
  </main>;
}
