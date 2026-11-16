import {useId,useMemo,useState} from "react";
import type {Meta,StoryObj} from "@storybook/react";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import {evaluateRisoCharacterMesh,risoMeshBounds} from "../../registry/video/riso-proportion-mesh";
import {risoSheetViewBox} from "../../registry/video/riso-character-sheet-react";
import type {RisoCharacterSpec} from "../../registry/video/riso-character";
import type {RisoCharacterMeshSheet,RisoMeshFrameRegion,RisoMeshPoint} from "../../registry/video/riso-proportion-mesh";
import {COURIER,PAPER_BIRD} from "./riso-character-demo";
import {PAPER_ARTIST,RISO_PAPER_ARTIST_SHEET,RisoHumanEnsembleStudio} from "./riso-human-ensemble";
import {RisoPrint} from "../../registry/video/print-plates-react";
import {RisoCharacterInk,RisoCharacterKnockout} from "../../registry/video/riso-character-react";
import type {RisoPrintSpec} from "../../registry/video/print-plates";
import {RISO_COURIER_SHEET,RISO_PAPER_BIRD_SHEET} from "./riso-character-mesh-sheets";
import {RISO29_ANAT1,inspectRisoAnatomy} from "./riso-human-anatomy";
import {Riso30HumanHandsWorkbench} from "./riso30-human-hands-studio";

type PlateMode="both"|"blue"|"red";
interface ArtcraftProps {actor:"courier"|"paper-bird"}
const paper="#F7EEDF",blue="#225D90",red="#DA5639";
const faceRefs=[
  {title:"Ciclos · kore.wave",url:"https://www.risopop.com/pop-shop/ciclos"},
  {title:"Garden Birds · Esther de Korte",url:"https://www.risopop.com/pop-shop/garden-birds"},
  {title:"Starling · Isaac LeFever",url:"https://dribbble.com/shots/25675934-Starling-Risograph"},
  {title:"Checkered coat · Elena Maria Knittelfelder",url:"https://www.behance.net/gallery/243846539/felt-Benito-might-delete-later"},
];
const panelDefinitions={
  courier:[
    {title:"01 / Face geometry, lids and shadow planes",regions:["head-shape","hair-mass","hair-forelock","hair-temple","cap-brim","eye-left","eye-right","eye-upper-lid-folds","nose-bridge-plane","chin-plane"],focus:"eye-left"},
    {title:"02 / Articulated fingers and coat tension",regions:["coat-shell","glove-left","glove-right","glove-right-index","glove-right-middle","glove-right-ring","glove-right-thumb","satchel","coat-lapel-left"],focus:"glove-right"},
    {title:"03 / Shoes, hems and stance",regions:["boot-left","boot-right","shin-left","shin-right"],focus:"boot-left"},
  ],
  "paper-bird":[
    {title:"01 / Wing silhouette and coverts",regions:["left-wing","right-wing","body","head"],focus:"left-wing"},
    {title:"02 / Beak, eye and cheek",regions:["head","beak","eye","eye-ring","beak-divider"],focus:"beak"},
    {title:"03 / Tail, breast and feather flow",regions:["tail","body","breast-plumage","body-feather-hatching","breast-contour-feathers","tail-feather-barbs"],focus:"tail"},
  ],
};
function sourceBounds(regions:readonly RisoMeshFrameRegion[],ids:readonly string[]){
  const pts=regions.filter(r=>ids.includes(r.id)).flatMap(r=>r.outline);
  if(!pts.length)throw new RangeError("ArtCraft panel requires source geometry");
  return risoMeshBounds(pts);
}
function path(points:readonly RisoMeshPoint[]){
  return points.map((p,i)=>(i?"L":"M")+p[0].toFixed(2)+" "+p[1].toFixed(2)).join(" ")+"Z";
}
function ArtcraftStudio({actor}:ArtcraftProps){
  const bird=actor==="paper-bird";
  const spec: RisoCharacterSpec=bird?PAPER_BIRD:COURIER;
  const sheet: RisoCharacterMeshSheet=bird?RISO_PAPER_BIRD_SHEET:RISO_COURIER_SHEET;
  const [frame,setFrame]=useState(bird?84:46);
  const poseStops=bird?[[0,"Wings high"],[84,"Mid flap"],[160,"Flight"],[239,"Finish"]] as const
    :[[46,"Walking"],[78,"Blink"],[160,"Speaking"],[198,"Smiling"]] as const;
  const [plates,setPlates]=useState<PlateMode>("both");
  const [mesh,setMesh]=useState(false);
  const [screenDensity,setScreenDensity]=useState(1);
  const [zoom,setZoom]=useState(1);
  const uid=useId().replace(/[^a-z0-9]/gi,"");
  const model=useMemo(()=>evaluateRisoCharacterMesh(spec,sheet,frame,{maxEdgeLength:8}),[spec,sheet,frame]);
  const drawn=useMemo(()=>evaluateRisoCharacter(spec,frame),[spec,frame]);
  const definitions=panelDefinitions[actor];
  const paint={
    blue:{solid:blue,dots:`url(#${uid}-screen-blue)`},
    red:{solid:red,dots:`url(#${uid}-screen-red)`},
  };
  // Diagnostic panels show ONLY their relevant structural part hierarchy.
  // Rendering the entire actor inside a facial crop made the courier's
  // black coat/collar occupy the nose/mouth and let the bird's wing cross its eye.
  const isolatedParts=(i:number):ReadonlySet<string>=>{
    if(bird){
      if(i===0)return new Set(spec.parts.map(p=>p.id));
      if(i===1)return new Set(["head","head-nape","eye","eye-ring","eye-brow",
        "beak","beak-divider","beak-nostril"]);
      return new Set(["body","breast-plumage","body-feather-hatching",
        "tail-feathers","tail-feather-shaft"]);
    }
    if(i===0)return new Set(spec.parts.filter(p=>p.joint==="head").map(p=>p.id));
    if(i===1)return new Set(spec.parts.filter(p=>[
      "body","left-arm","left-elbow","left-hand",
      "right-arm","right-elbow","right-hand",
      "left-thumb","left-index","left-middle","left-ring",
      "right-thumb","right-index","right-middle","right-ring","satchel",
    ].includes(p.joint)).map(p=>p.id));
    return new Set(spec.parts.filter(p=>[
      "left-leg","left-knee","left-ankle",
      "right-leg","right-knee","right-ankle",
    ].includes(p.joint)||["coat","coat-hem-welt"].includes(p.id)).map(p=>p.id));
  };
  function panel(i:number,x:number,y:number,w:number,h:number){
    const def=definitions[i],bounds=sourceBounds(model.regions,def.regions);
    const view=risoSheetViewBox(bounds,w,h,i===0?12:9).split(" ").map(Number);
    const [vx,vy,vw,vh]=view;
    const scaledW=vw/zoom,scaledH=vh/zoom;
    const box=[vx+vw/2-scaledW/2,vy+vh/2-scaledH/2,scaledW,scaledH].map(n=>n.toFixed(3)).join(" ");
    const primary=model.regions.find(r=>r.id===def.focus)!;
    const ids=isolatedParts(i);
    const inkParts=drawn.parts.filter(part=>ids.has(part.id));
    return <g key={i} data-km-riso-artcraft-panel={def.focus}>
      <rect x={x} y={y} width={w} height={h} rx={5} fill="#FFF8EC" stroke="#CEBFAD"/>
      <text x={x+14} y={y+22} fontFamily="system-ui,sans-serif" fontSize={13}
        fontWeight={800} fill="#244760">{def.title}</text>
      <svg x={x+9} y={y+32} width={w-18} height={h-40} viewBox={box} overflow="hidden"
        data-km-riso-artcraft-crop={def.focus}>
        <g fill={paper} stroke={paper} strokeWidth={1.5} data-km-riso-artcraft-isolated-paper="">
          {inkParts.map(part=><path key={part.id} d={part.d}
            transform={part.transform} data-km-riso-artcraft-paper-part={part.id}/>)}
        </g>
        {(["blue","red"] as const).filter(p=>plates==="both"||plates===p).map(p=>
          <g key={p} style={{mixBlendMode:"multiply"}}
            data-km-riso-character={spec.id} data-km-riso-study-plate={p}>
            {inkParts.filter(part=>part.plate===p&&!part.knockoutOnly).map(part=>
              <path key={part.id} data-km-riso-part={part.id} d={part.d}
                transform={part.transform}
                fill={part.paint==="screen"?paint[p].dots:paint[p].solid}
                opacity={part.opacity}/>)}
          </g>)}
        {mesh && <g fill="none" stroke="#24A6A8" strokeWidth={.47}
          data-km-riso-artcraft-mesh={def.focus} pointerEvents="none">
          {primary.triangles.map((t,j)=><path key={j} d={path([...t])}/>)}
          <path d={path(primary.outline)} stroke="#F07743" strokeWidth={1.15}/>
        </g>}
      </svg>
    </g>;
  }
  return <main style={{background:"#F3E8D4",padding:18,font:"14px system-ui,sans-serif",color:"#294A60",minHeight:"100vh"}}>
    <div style={{maxWidth:1290,margin:"0 auto"}}>
      <div style={{letterSpacing:3,fontSize:12,fontWeight:800}}>ARTCRAFT / REFERENCE-LED RISO13</div>
      <h2 style={{font:"700 28px Georgia,serif",margin:"6px 0"}}>
        {bird?"Paper Bird — Anatomical Feather & Face Studies":"Paper Courier — Facial & Costume Construction"}
      </h2>
      <p style={{fontSize:13,margin:"0 0 15px"}}>
        Original character art · live FK/IK source frame · zoomed close-ups · individually printable ink plates
      </p>
      <svg viewBox="0 0 1180 740" style={{display:"block",width:"100%",height:"auto",background:paper}}
        data-km-riso-artcraft-studio={actor} data-km-riso-artcraft-frame={frame}
        data-km-riso-artcraft-plate={plates} data-km-riso-artcraft-zoom={zoom}
        data-km-riso-artcraft-density={screenDensity}>
        <defs>
          <pattern id={uid+"-screen-blue"} width="4.2" height="4.2" patternUnits="userSpaceOnUse">
            <circle cx="1.3" cy="1.3" r={.83*screenDensity} fill={blue}/>
          </pattern>
          <pattern id={uid+"-screen-red"} width="4.7" height="4.7" patternUnits="userSpaceOnUse">
            <circle cx="1.7" cy="1.7" r={.92*screenDensity} fill={red}/>
          </pattern>
        </defs>
        {panel(0,20,20,750,695)}
        {panel(1,789,20,371,337)}
        {panel(2,789,378,371,337)}
        <text x={27} y={730} fontSize={11} fontFamily="ui-monospace,monospace" fill="#557080">
          SOURCE IMAGE CRAFT: expression / tailored cloth / tapered feather engraving
        </text>
      </svg>
      <div role="group" aria-label="ArtCraft pose checkpoints" style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
        {poseStops.map(([at,label])=><button key={at} type="button"
          aria-pressed={frame===at} onClick={()=>setFrame(at)}
          style={{padding:"7px 12px",border:"1px solid #A9A39B",borderRadius:5,
            background:frame===at?"#284F6E":"#FCF6EB",color:frame===at?"#FFF":"#294A60",
            font:"700 12px system-ui",cursor:"pointer"}}>{label} · {at}</button>)}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:14,padding:"16px 0 10px"}}>
        <label style={{display:"grid",gap:4,fontSize:12,fontWeight:700}}>Animation frame · {frame}
          <input aria-label="ArtCraft animation frame" type="range" min={0} max={239}
            value={frame} onChange={e=>setFrame(Number(e.target.value))} style={{width:260}}/>
        </label>
        <label style={{display:"grid",gap:4,fontSize:12,fontWeight:700}}>Ink plate
          <select aria-label="ArtCraft ink plate" value={plates}
            onChange={e=>setPlates(e.target.value as PlateMode)}>
            <option value="both">Both inks</option><option value="blue">Cobalt only</option>
            <option value="red">Vermilion only</option>
          </select>
        </label>
        <label style={{display:"grid",gap:4,fontSize:12,fontWeight:700}}>Study zoom · {zoom.toFixed(1)}×
          <input aria-label="ArtCraft study zoom" type="range" min={1} max={2.6} step={.2}
            value={zoom} onChange={e=>setZoom(Number(e.target.value))} style={{width:160}}/>
        </label>
        <label style={{display:"grid",gap:4,fontSize:12,fontWeight:700}}>Print dot density · {screenDensity.toFixed(2)}×
          <input aria-label="ArtCraft print dot density" type="range" min={.5} max={1.5} step={.05}
            value={screenDensity} onChange={e=>setScreenDensity(Number(e.target.value))} style={{width:165}}/>
        </label>
        <label style={{fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
          <input type="checkbox" checked={mesh} onChange={e=>setMesh(e.target.checked)}
            aria-label="ArtCraft show source mesh"/> Inspect source mesh
        </label>
      </div>
      <p style={{fontSize:12,lineHeight:1.5,margin:"5px 0"}}>
        Visual craftsmanship references (study only; no third-party artwork bundled):
        {" "}{faceRefs.map((r,i)=><span key={r.title}>
          {i?" · ":""}<a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
        </span>)}
      </p>
      <p style={{fontSize:12,lineHeight:1.45,color:"#62798A",margin:"4px 0"}}>
        Geometry is the original 2D source. These cropped poses are not approved back/side/three-quarter views.
        Fine print texture is intentionally separate from shape topology.
      </p>
    </div>
  </main>;
}
const meta={title:"Video production/Film Looks/Risograph",
  id:"video-riso-artcraft-studies",component:ArtcraftStudio,
  parameters:{layout:"fullscreen"},
} satisfies Meta<typeof ArtcraftStudio>;
export default meta;
type Story=StoryObj<typeof meta>;
export const CourierArtcraftDetail:Story={
  name:"RISO13 · Courier ArtCraft Detail",
  args:{actor:"courier"},
};
export const BirdArtcraftDetail:Story={
  name:"RISO13 · Bird ArtCraft Detail",
  args:{actor:"paper-bird"},
};

/** RISO13: compare actual authored FK/IK geometry at expression checkpoints,
 * including separated finger drawings, never a static hero mockup. */
const courierPoseStudies=[
  {frame:46,label:"NEUTRAL / WALK"},
  {frame:78,label:"BLINK / BREATH"},
  {frame:160,label:"SPEECH / GRIP"},
  {frame:198,label:"SMILE / SETTLE"},
] as const;
function CourierAnatomyComparison(){
  const uid=useId().replace(/[^a-z0-9]/gi,"");
  const [plate,setPlate]=useState<PlateMode>("both");
  const [density,setDensity]=useState(1);
  const [meshOn,setMeshOn]=useState(false);
  const printInk={blue:{solid:blue,dots:`url(#${uid}-anatomy-blue)`},
    red:{solid:red,dots:`url(#${uid}-anatomy-red)`}};
  return <main style={{minHeight:"100vh",background:"#F0E5D1",font:"14px system-ui,sans-serif",
    color:"#294A60",padding:24}}>
    <div style={{maxWidth:1440,margin:"0 auto"}}>
      <div style={{letterSpacing:2,fontSize:12,fontWeight:800}}>RISOGRAPH / HUMAN CHARACTER DESIGN LOCK · RISO13</div>
      <h2 style={{font:"700 29px Georgia,serif",margin:"6px 0 8px"}}>Courier — face and grip, four true film poses</h2>
      <p style={{fontSize:13,lineHeight:1.5,maxWidth:1000}}>
        Individually authored eye and nose planes; palm plus four knuckle-rooted digits on each hand.
        Same source IK/FK art used in the production film, no new trace or raster asset.
        Live separation density is a preview rather than a calibrated printer profile.
      </p>
      <div style={{display:"flex",gap:20,flexWrap:"wrap",padding:"12px 0 20px"}}>
        <label>Ink separation{" "}
          <select aria-label="RISO anatomy ink plate" value={plate}
            onChange={e=>setPlate(e.target.value as PlateMode)}>
            <option value="both">Both inks</option><option value="blue">Blue only</option>
            <option value="red">Red only</option>
          </select>
        </label>
        <label>Dot density · {density.toFixed(2)}×{" "}
          <input type="range" aria-label="RISO anatomy dot density" min={.5} max={1.5} step={.05}
            value={density} onChange={e=>setDensity(Number(e.target.value))}/>
        </label>
        <label><input type="checkbox" checked={meshOn}
          onChange={e=>setMeshOn(e.target.checked)}
          aria-label="RISO anatomy show region outlines"/> Source contours</label>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(265px,1fr))",gap:16}}>
        {courierPoseStudies.map(({frame,label})=>{
          const model=evaluateRisoCharacterMesh(COURIER,RISO_COURIER_SHEET,frame,{maxEdgeLength:8});
          const drawn=evaluateRisoCharacter(COURIER,frame);
          const crops=[
            {name:"01 · face",source:["head-shape","eye-left","eye-right","nose","mouth"],
              joints:["head"],w:260,h:250},
            {name:"02 · thumb and fingers",source:["glove-right","glove-right-thumb","glove-right-index",
              "glove-right-middle","glove-right-ring"],
              joints:["right-hand","right-thumb","right-index","right-middle","right-ring"],w:260,h:235},
          ];
          return <article key={frame} style={{background:"#FFF8EA",border:"1px solid #CDBCA8",
            borderRadius:8,padding:12}} data-km-riso-anatomy-pose={frame}>
            <div style={{fontSize:12,fontWeight:800,letterSpacing:1}}>{label} · F{frame}</div>
            {crops.map(crop=>{
              const inSource=model.regions.filter(region=>crop.source.includes(region.id));
              const bounds=risoMeshBounds(inSource.flatMap(region=>region.outline));
              const view=risoSheetViewBox(bounds,crop.w,crop.h,11);
              const partIds=new Set(COURIER.parts.filter(part=>crop.joints.includes(part.joint)).map(part=>part.id));
              const ink=drawn.parts.filter(part=>partIds.has(part.id));
              return <div key={crop.name} style={{marginTop:12}}>
                <div style={{fontSize:11,fontWeight:800,marginBottom:5}}>{crop.name}</div>
                <svg viewBox={view} width="100%" height={crop.h}
                  style={{background:paper,border:"1px solid #E5D7BF",borderRadius:4}}
                  data-km-riso-anatomy-crop={crop.name}>
                  <g fill={paper} stroke={paper} strokeWidth={1.3}>
                    {ink.map(part=><path key={part.id} d={part.d} transform={part.transform}/>)}
                  </g>
                  {(["blue","red"] as const).filter(p=>plate==="both"||plate===p).map(p=>
                    <g key={p} data-km-riso-anatomy-plate={p} style={{mixBlendMode:"multiply"}}>
                      {ink.filter(part=>part.plate===p&&!part.knockoutOnly).map(part=>
                        <path key={part.id} d={part.d} transform={part.transform}
                          data-km-riso-part={part.id}
                          fill={part.paint==="screen"?printInk[p].dots:printInk[p].solid}/>)}
                    </g>)}
                  {meshOn&&<g fill="none" stroke="#20A5A5" strokeWidth=".65">
                    {inSource.map(region=><path key={region.id}
                      d={path(region.outline)} data-km-riso-anatomy-outline={region.id}/>)}
                  </g>}
                </svg>
              </div>;
            })}
          </article>;
        })}
      </div>
      <svg width="0" height="0" aria-hidden="true" style={{position:"absolute"}}>
        <defs>
          <pattern id={uid+"-anatomy-blue"} width="4.2" height="4.2" patternUnits="userSpaceOnUse">
            <circle cx="1.3" cy="1.3" r={.83*density} fill={blue}/>
          </pattern>
          <pattern id={uid+"-anatomy-red"} width="4.7" height="4.7" patternUnits="userSpaceOnUse">
            <circle cx="1.7" cy="1.7" r={.92*density} fill={red}/>
          </pattern>
        </defs>
      </svg>
      <p style={{fontSize:12,marginTop:18}}>All four poses are generated from the same deterministic
        RISO character source. Side/back/three-quarter artwork is not yet authored or certified.</p>
    </div>
  </main>;
}
export const CourierHumanAnatomy:StoryObj<typeof meta>={
  name:"RISO13 · Human Face and Finger Construction",
  args:{actor:"courier"},
  render:()=> <CourierAnatomyComparison/>,
};

/** RISO19: press-bound hand pressure crescents, individual crease fans and transfer. */
export const HumanEnsembleActing:StoryObj<typeof meta>={
  name:"RISO27 · Full-Film Acting & Physical Contact",
  args:{actor:"courier"},
  render:()=> <RisoHumanEnsembleStudio/>,
};


/** RISO21: same production spot masters, face clearing and authored expression
 * paths as the complete film. Crops are derived from original evaluated shapes
 * instead of duplicating drawings, characters, clocks or material shaders.
 */
type EyeAspect="landscape"|"portrait";
type Riso24Focus="head"|"hair"|"eyes"|"ear"|"midface";
type Riso25FaceStudy="crafted"|"legacy";
type Riso26ToneStudy="graded"|"flat";
const RISO25_FACE_DETAILS=new Set(["ear-helix-fold","ear-concha-pocket","ear-tragus-root",
  "ear-lobule-seam","nasal-sidewall-line","nasal-ala-fold","upper-lip-engraving",
  "nasolabial-flow","labiomental-crease"]);
// The exact original RISO24 ear source is included solely as the falsifiable
// before-art baseline. The production character spec owns the new source path.
const RISO25_EAR_BASELINES:Readonly<Record<string,string>>={
  courier:"M-32 -10 Q-39 -12 -40 -2 Q-39 7 -32 7 L-32 5 Q-37 5 -38 -2 Q-38 -8 -32 -7 Z",
  "paper-artist":"M-28 -11 Q-36 -16 -37 -7 Q-38 3 -30 7 L-28 4 Q-35 0 -33 -6 Q-31 -9 -28 -7 Z",
};
type Riso24HairStudy="engraved"|"legacy";
// Source-authored ink paths, not a global filter or substituted raster effect.
// The comparison renders the exact old sources with new overlays omitted.
const RISO24_ENGRAVINGS:Readonly<Record<string,ReadonlySet<string>>>={
  courier:new Set(["cap-paper-ribbons","cap-brim-paper-welt","cap-crown-engraving","cap-brim-engraving"]),
  "paper-artist":new Set(["hair-paper-crown","hair-paper-side","hair-crown-engravings",
    "hair-side-engravings","hair-fringe-root-ink","hair-temple-shadow-masses"]),
};
function RisoEyeCrop({actor,sheet,frame,aspect,plate,focus,hairStudy,faceStudy,toneStudy,showGuides,screenMode,screenDensity,screenPitch,dotGain}:{
  actor:RisoCharacterSpec;sheet:RisoCharacterMeshSheet;frame:number;aspect:EyeAspect;
  plate:PlateMode;focus:Riso24Focus;hairStudy:Riso24HairStudy;faceStudy:Riso25FaceStudy;toneStudy:Riso26ToneStudy;showGuides:boolean;screenMode:"am"|"fm";screenDensity:number;screenPitch:number;dotGain:number;
}){
  const portrait=aspect==="portrait",width=portrait?360:640,height=portrait?640:360;
  const mesh=evaluateRisoCharacterMesh(actor,sheet,frame,{maxEdgeLength:8});
  const face=mesh.regions.filter(region=>region.category==="face"||region.category==="hair"||region.category==="headwear");
  const detailed=focus==="hair"
    ? mesh.regions.filter(region=>region.category==="hair"||region.category==="headwear")
    : focus==="eyes"
      ? face.filter(region=>/eye|iris|brow|orbit/.test(region.id))
      : focus==="ear"
        ? mesh.regions.filter(region=>/ear-/.test(region.id))
        : focus==="midface"
          ? mesh.regions.filter(region=>/nose|nasal|mouth|lip|philtrum|chin|cheek|nasolabial|labiomental/.test(region.id))
          : face;
  // Derive every camera region from the actual source contours. No invented
  // percentage crop or fixed pixel offset across different character heads.
  const envelope=risoMeshBounds(detailed.flatMap(region=>region.outline));
  const sourceParts=hairStudy==="legacy"||faceStudy==="legacy"||toneStudy==="flat"
    ? actor.parts.filter(part=>
        !(hairStudy==="legacy"&&RISO24_ENGRAVINGS[actor.id]?.has(part.id)) &&
        !(faceStudy==="legacy"&&RISO25_FACE_DETAILS.has(part.id)))
      .map(part=>{
        const sourceFace=faceStudy==="legacy"&&part.id==="ear-left"
          ? {...part,d:RISO25_EAR_BASELINES[actor.id]} : part;
        return toneStudy==="flat"&&sourceFace.screenTone
          ? {...sourceFace,screenTone:undefined} : sourceFace;
      })
    : actor.parts;
  const renderSpec:RisoCharacterSpec=sourceParts===actor.parts
    ? actor:{...actor,parts:sourceParts};
  // A close-up of the narrowly authored ear may mathematically request a
  // >30x scale in portrait output. The production RisoCharacterInk/
  // RisoCharacterKnockout placement contract explicitly caps scale at 30.
  // Do not let a crop control crash Storybook with a non-rendering story.
  const scale=Math.min(29,(width-52)/Math.max(1,envelope.width),
    (height-56)/Math.max(1,envelope.height));
  const x=width/2-(envelope.x+envelope.width/2)*scale;
  const y=height/2-(envelope.y+envelope.height/2)*scale;
  const partIds=renderSpec.parts.filter(part=>part.joint==="head").map(part=>part.id);
  const paperColor="#F6EDDD",blueColor="#255B8E",redColor="#D65641";
  const inkSpec:RisoPrintSpec={
    version:1,width,height,paper:paperColor,seed:38,startFrame:0,passFrames:1,gapFrames:0,
    plates:[
      {id:"blue",color:blueColor,opacity:1,dotCell:screenPitch,dotAngle:-12,registration:[0,0]},
      {id:"red",color:redColor,opacity:1,dotCell:screenPitch,dotAngle:17,registration:[.5,-.4]},
    ],
  };
  return <div data-km-riso21-actor={actor.id} data-km-riso21-frame={frame} data-km-riso21-aspect={aspect}
    data-km-riso24-focus={focus} data-km-riso24-study={hairStudy} data-km-riso25-face-study={faceStudy}
    data-km-riso25-crop-scale={scale.toFixed(3)} data-km-riso26-tone-study={toneStudy}>
    <div style={{font:"700 16px Georgia,serif",marginBottom:8}}>{actor.id==="courier"?"Paper Courier":"Paper Artist"} · source head</div>
    <RisoPrint spec={inkSpec} frame={239} artworks={{blue:()=>null,red:()=>null}}
      paperGrain={.45} misregistration={.25} screenMode={screenMode} screenDensity={screenDensity} dotGain={dotGain}
      visiblePlateIds={plate==="both"?undefined:[plate]}
      label={actor.id+" head print, anatomical eye engravings"}
      foregroundLayers={[{
        id:"ocular-actor",
        knockout:<RisoCharacterKnockout spec={renderSpec} frame={frame} x={x} y={y}
          scale={scale} spread={1.5} onlyPartIds={partIds}/>,
        artworks:{
          blue:paint=><RisoCharacterInk spec={renderSpec} frame={frame} plateId="blue"
            paint={paint} x={x} y={y} scale={scale} onlyPartIds={partIds}/>,
          red:paint=><RisoCharacterInk spec={renderSpec} frame={frame} plateId="red"
            paint={paint} x={x} y={y} scale={scale} onlyPartIds={partIds}/>,
        },
      }]}
      style={{width:"100%",height:"auto",maxHeight:600,background:paperColor}}/>
    {showGuides&&<div style={{fontSize:12,paddingTop:6,color:"#34576B"}}>
      {face.filter(region=>region.id.includes("eye")||region.id.includes("iris")||region.id.includes("orbit"))
        .map(region=>region.id).join(" · ")}
    </div>}
  </div>;
}
function RisoEyeCraftLab(){
  const [frame,setFrame]=useState(46);
  const [aspect,setAspect]=useState<EyeAspect>("landscape");
  const [plate,setPlate]=useState<PlateMode>("both");
  const [screenMode,setScreenMode]=useState<"am"|"fm">("am");
  const [dotGain,setDotGain]=useState(0);
  const [screenDensity,setScreenDensity]=useState(.33);
  const [screenPitch,setScreenPitch]=useState(2);
  const [showGuides,setShowGuides]=useState(false);
  const [focus,setFocus]=useState<Riso24Focus>("head");
  const [hairStudy,setHairStudy]=useState<Riso24HairStudy>("engraved");
  const [faceStudy,setFaceStudy]=useState<Riso25FaceStudy>("crafted");
  const [toneStudy,setToneStudy]=useState<Riso26ToneStudy>("graded");
  return <main style={{padding:20,minHeight:"100vh",background:"#EEE2CD",color:"#294A60",font:"14px system-ui,sans-serif"}}>
    <div style={{maxWidth:1120,margin:"0 auto",display:"grid",gap:14}}>
      <header>
        <div style={{fontSize:12,fontWeight:800,letterSpacing:2}}>RISOGRAPH / ARTCRAFT V9 · RISO26</div>
        <h2 style={{font:"700 29px Georgia,serif",margin:"6px 0"}}>Two identities · sculpted ink-value hierarchy</h2>
        <p style={{fontSize:13,lineHeight:1.5,maxWidth:920}}>Original eyes, ears, and lip anatomy remain untouched; two co-registered fine screens distinguish eye sockets, cheeks, and jaws.
          Compare RISO25 flat-density facial halftone against source-authored RISO26 tonal master dots, never alpha overlays.</p>
      </header>
      <div style={{display:"flex",flexWrap:"wrap",gap:18,alignItems:"end"}}>
        <label>Pose
          <select aria-label="RISO21 expression pose" value={frame}
            onChange={e=>setFrame(Number(e.target.value))} style={{display:"block",marginTop:5,minHeight:36}}>
            <option value={46}>Neutral / 46</option><option value={78}>Blink / 78</option>
            <option value={160}>Speak / 160</option><option value={198}>Smile / 198</option>
          </select></label>
        <label>Output
          <select aria-label="RISO21 crop aspect" value={aspect}
            onChange={e=>setAspect(e.target.value as EyeAspect)} style={{display:"block",marginTop:5,minHeight:36}}>
            <option value="landscape">16:9 film family</option><option value="portrait">9:16 film family</option>
          </select></label>
        <label>Crop
          <select aria-label="RISO24 feature focus" value={focus}
            onChange={e=>setFocus(e.target.value as Riso24Focus)} style={{display:"block",marginTop:5,minHeight:36}}>
            <option value="head">Whole head</option><option value="hair">Hair close-up</option>
            <option value="eyes">Eyes close-up</option><option value="ear">Ear / concha close-up</option>
            <option value="midface">Nose, cheek and mouth close-up</option>
          </select></label>
        <label>Hair drawing
          <select aria-label="RISO24 hair craft comparison" value={hairStudy}
            onChange={e=>setHairStudy(e.target.value as Riso24HairStudy)} style={{display:"block",marginTop:5,minHeight:36}}>
            <option value="engraved">RISO24 carved and engraved</option>
            <option value="legacy">Before · original smooth masses</option>
          </select></label>
        <label>Facial construction
          <select aria-label="RISO25 facial craft comparison" value={faceStudy}
            onChange={e=>setFaceStudy(e.target.value as Riso25FaceStudy)} style={{display:"block",marginTop:5,minHeight:36}}>
            <option value="crafted">RISO25 source-anatomy engraving</option>
            <option value="legacy">Before · RISO24 original face</option>
          </select></label>
        <label>Facial halftone values
          <select aria-label="RISO26 tonal master comparison" value={toneStudy}
            onChange={e=>setToneStudy(e.target.value as Riso26ToneStudy)} style={{display:"block",marginTop:5,minHeight:36}}>
            <option value="graded">RISO26 sculpted local stencil dots</option>
            <option value="flat">Before · same heavy dot radius across all face planes</option>
          </select></label>
        <label>Ink
          <select aria-label="RISO21 ink separation" value={plate}
            onChange={e=>setPlate(e.target.value as PlateMode)} style={{display:"block",marginTop:5,minHeight:36}}>
            <option value="both">Both inks</option><option value="blue">Blue only</option><option value="red">Red only</option>
          </select></label>
        <label>Screen
          <select aria-label="RISO21 screening method" value={screenMode}
            onChange={e=>setScreenMode(e.target.value as "am"|"fm")} style={{display:"block",marginTop:5,minHeight:36}}>
            <option value="am">AM halftone</option><option value="fm">FM droplets</option>
          </select></label>
        <label>Screen pitch · {screenPitch.toFixed(1)} units
          <input aria-label="RISO23 screen pitch" type="range" min={2} max={6} step={.2}
            value={screenPitch} onChange={e=>setScreenPitch(Number(e.target.value))}
            style={{display:"block",marginTop:9}}/></label>
        <label>Screen coverage · {Math.round(screenDensity*100)}%
          <input aria-label="RISO23 screen coverage" type="range" min={.15} max={.65} step={.025}
            value={screenDensity} onChange={e=>setScreenDensity(Number(e.target.value))}
            style={{display:"block",marginTop:9}}/></label>
        <label>Ink gain · {Math.round(dotGain*100)}%
          <input aria-label="RISO21 dot gain" type="range" min={0} max={1} step={.05}
            value={dotGain} onChange={e=>setDotGain(Number(e.target.value))}
            style={{display:"block",marginTop:9}}/></label>
        <label><input aria-label="RISO21 region IDs" type="checkbox"
          checked={showGuides} onChange={e=>setShowGuides(e.target.checked)}/> Inspect semantic regions</label>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(305px,1fr))",gap:18,alignItems:"start"}}>
        {[{actor:COURIER,sheet:RISO_COURIER_SHEET},{actor:PAPER_ARTIST,sheet:RISO_PAPER_ARTIST_SHEET}].map(({actor,sheet})=>
          <section key={actor.id} style={{padding:14,border:"1px solid #C9B8A1",borderRadius:8,background:"#FCF5E7"}}>
            <RisoEyeCrop actor={actor} sheet={sheet} frame={frame} aspect={aspect} plate={plate}
              focus={focus} hairStudy={hairStudy} faceStudy={faceStudy} toneStudy={toneStudy} showGuides={showGuides} screenMode={screenMode} screenDensity={screenDensity} screenPitch={screenPitch} dotGain={dotGain}/>
          </section>)}
      </div>
      <p style={{fontSize:12,lineHeight:1.5,maxWidth:940}}>ArtCraft source studies:
        {" "}<a href="https://fishgutspress.com/collections/frontpage">Fish Guts Press · printed halftone eye</a>
        {" · "}<a href="https://www.behance.net/gallery/96806545/TAROT-ZINE">Tarot Zine · brow and eye engraving</a>.
        Third-party prints are reference-only; anatomical likeness and 3/4 identity remain unapproved.
      </p>
    </div>
  </main>;
}
export const OcularPrintCraft:StoryObj<typeof meta>={
  name:"RISO26 · Original Portrait Tone Master Craft",
  args:{actor:"courier"},
  render:()=> <RisoEyeCraftLab/>,
};


/** RISO29 / ArtCraft 9.1. All previews below are from the *same* physical
 * two-ink RisoPrint and original 240-frame character rig. Both editorial
 * figures can be compared at actual full-body scale and in the true
 * cervical/face source crop, never an unrelated raster reference avatar.
 */
function Riso29PrintPose({actor,frame,mode,plate,showRig,screenDensity}:{
  actor:RisoCharacterSpec;frame:number;mode:"full"|"portrait";
  plate:PlateMode;showRig:boolean;screenDensity:number;
}){
  const width=510,height=455;
  const pose=evaluateRisoCharacter(actor,frame);
  const head=pose.joints.find(j=>j.id==="head")!;
  const root=pose.joints.find(j=>j.id==="root")!;
  // With the ANAT1 leg retiming the taller source must retain its entire cap
  // and both printed boot soles on the original studio paper.
  const scale=mode==="full"?1.45:4.05;
  const x=mode==="full"?width/2-root.x*scale:width/2-head.x*scale;
  const y=mode==="full"?height-38:160-head.y*scale;
  const printSpec:RisoPrintSpec={
    version:1,width,height,paper:"#F9EDDB",seed:38,startFrame:0,passFrames:1,gapFrames:0,
    plates:[{id:"blue",color:blue,opacity:1,dotCell:4,dotAngle:-12,registration:[0,0]},
      {id:"red",color:red,opacity:1,dotCell:4,dotAngle:17,registration:[.5,-.4]}],
  };
  return <div data-km-riso29-source-actor={actor.id} data-km-riso29-source-frame={frame}
    data-km-riso29-source-view={mode} style={{minWidth:0,border:"1px solid #D6C6AF"}}>
    <RisoPrint spec={printSpec} frame={239} paperGrain={.42} misregistration={.24}
      screenMode="am" screenDensity={screenDensity} dotGain={.05}
      label={actor.id+" ANAT1 editorial "+mode}
      visiblePlateIds={plate==="both"?undefined:[plate]}
      artworks={{blue:()=>null,red:()=>null}}
      foregroundLayers={[{
        id:actor.id+"-anatomy",
        knockout:<RisoCharacterKnockout spec={actor} frame={frame}
          x={x} y={y} scale={scale} spread={1.4}/>,
        artworks:{
          blue:paint=><RisoCharacterInk spec={actor} frame={frame}
            plateId="blue" paint={paint} x={x} y={y} scale={scale}
            showRig={showRig}/>,
          red:paint=><RisoCharacterInk spec={actor} frame={frame}
            plateId="red" paint={paint} x={x} y={y} scale={scale}/>,
        },
      }]}
      style={{width:"100%",height:"auto"}}/>
  </div>;
}
function Riso29AnatomyWorkbench(){
  const [actorId,setActorId]=useState<"courier"|"paper-artist">("courier");
  const [frame,setFrame]=useState(160);
  const [plate,setPlate]=useState<PlateMode>("both");
  const [showRig,setShowRig]=useState(false);
  const [screenDensity,setScreenDensity]=useState(.42);
  const actor=actorId==="courier"?COURIER:PAPER_ARTIST;
  const measure=inspectRisoAnatomy(actor,frame);
  return <main data-km-riso29-anatomy-workbench="" data-km-riso29-anatomy-actor={actorId}
    data-km-riso29-anatomy-frame={frame} data-km-riso29-anatomy-connected={String(measure.connected)}
    style={{background:"#EEE2CD",padding:20,minHeight:"100vh",color:"#234B63",font:"14px system-ui,sans-serif"}}>
    <div style={{maxWidth:1160,margin:"0 auto"}}>
      <h2 style={{font:"700 28px Georgia,serif",margin:"0 0 5px"}}>RISO29 · Human anatomy / head, neck, face</h2>
      <p style={{maxWidth:990,fontSize:13,lineHeight:1.5}}>
        ANAT1 source framework gives cervical/cranial joint anatomy and facial landmark grammar.
        RISO source SVG is still fully editable and printed as cobalt and vermilion spot inks.
        This is stylized 2D anatomy, not a measured portrait or 3/4 likeness certificate.
      </p>
      <div style={{display:"flex",gap:15,flexWrap:"wrap",alignItems:"end",margin:"14px 0"}}>
        <label>Character
          <select aria-label="RISO29 anatomy character" value={actorId}
            onChange={e=>setActorId(e.target.value as "courier"|"paper-artist")}
            style={{display:"block",minHeight:32}}>
            <option value="courier">Paper Courier</option><option value="paper-artist">Paper Artist</option>
          </select></label>
        <label>Expression
          <select aria-label="RISO29 anatomy pose" value={frame}
            onChange={e=>setFrame(Number(e.target.value))}
            style={{display:"block",minHeight:32}}>
            <option value={0}>First contact / 0</option><option value={46}>Neutral / 46</option>
            <option value={78}>Blink / 78</option><option value={160}>Speaking / 160</option>
            <option value={198}>Smile / 198</option><option value={239}>Held finish / 239</option>
          </select></label>
        <label>Ink separation
          <select aria-label="RISO29 anatomy ink" value={plate}
            onChange={e=>setPlate(e.target.value as PlateMode)}
            style={{display:"block",minHeight:32}}>
            <option value="both">Both spot inks</option><option value="blue">Cobalt only</option>
            <option value="red">Vermilion only</option>
          </select></label>
        <label>Physical coverage · {screenDensity.toFixed(2)}
          <input aria-label="RISO29 anatomy ink coverage" type="range" min={.25} max={.75} step={.05}
            value={screenDensity} onChange={e=>setScreenDensity(Number(e.target.value))}
            style={{display:"block",width:140}}/>
        </label>
        <label><input type="checkbox" checked={showRig}
          onChange={e=>setShowRig(e.target.checked)}
          aria-label="RISO29 anatomy show joints"/> 2D neck / limb rig</label>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:15}}>
        <section style={{background:"#FCF6EB",padding:10}}>
          <strong style={{display:"block",marginBottom:7}}>01 / Complete original character — silhouette and stance</strong>
          <Riso29PrintPose actor={actor} frame={frame} mode="full" plate={plate}
            screenDensity={screenDensity} showRig={showRig}/>
        </section>
        <section style={{background:"#FCF6EB",padding:10}}>
          <strong style={{display:"block",marginBottom:7}}>02 / Printed forehead → clavicle — true portrait crop</strong>
          <Riso29PrintPose actor={actor} frame={frame} mode="portrait" plate={plate}
            screenDensity={screenDensity} showRig={showRig}/>
        </section>
      </div>
      <dl style={{display:"flex",flexWrap:"wrap",gap:24,marginTop:15,fontSize:13}}>
        <div><dt>Head vs shoulder-joint span</dt><dd data-km-riso29-head-shoulder-ratio=""
          style={{margin:0,fontWeight:700}}>{measure.headToShoulder.toFixed(3)}×</dd></div>
        <div><dt>Actual connected cervical axis</dt><dd style={{margin:0,fontWeight:700}}>
          {measure.neckLength.toFixed(1)} source units</dd></div>
        <div><dt>Projected leg/stature (source vs ANAT1 adult model)</dt><dd
          data-km-riso29-leg-stature-ratio="" style={{margin:0,fontWeight:700}}>
          {measure.legProjectionRatio.toFixed(3)} / {RISO29_ANAT1.adultReferenceLegRatio.toFixed(3)}</dd></div>
        <div><dt>Source facial ink primitives</dt><dd style={{margin:0,fontWeight:700}}>
          {measure.printDetails} named parts</dd></div>
        <div><dt>ANAT1 adult reference (not target)</dt><dd style={{margin:0,fontWeight:700}}>
          {RISO29_ANAT1.headsTallAdultReference} heads tall</dd></div>
      </dl>
      <p style={{fontSize:12,color:"#5A7284",lineHeight:1.5}}>
        Separate observations: this authored figure is deliberately stylized rather than ANAT1 adult average.
        Face/neck geometry is explicit source-authored curved paths, while press dots remain individual real stencil masters.
        Check both 16:9/9:16 full film and all smile/blink/speak heads before accepting a release.
      </p>
    </div>
  </main>;
}
export const HumanAnatomyNeckPortrait:StoryObj<typeof meta>={
  name:"RISO29 · ANAT1 Human Body / Neck / Face",
  args:{actor:"courier"},
  render:()=> <Riso29AnatomyWorkbench/>,
};

/** RISO30: original physical-ink ANAT1 human hand craftsmanship. Same folder. */
export const HumanHandAnatomyPrint:StoryObj<typeof meta>={
  name:"RISO54 · ANAT1 Human Hand / 3/4 Ray Projection & Real 2-Ink Paper Grip",
  args:{actor:"courier"},
  render:()=> <Riso30HumanHandsWorkbench/>,
};
