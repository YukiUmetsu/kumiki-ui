import {useId,useMemo,useState} from "react";
import type {Meta,StoryObj} from "@storybook/react";
import {evaluateRisoCharacter} from "../../registry/video/riso-character";
import {evaluateRisoCharacterMesh,risoMeshBounds} from "../../registry/video/riso-proportion-mesh";
import {risoSheetViewBox} from "../../registry/video/riso-character-sheet-react";
import type {RisoCharacterSpec} from "../../registry/video/riso-character";
import type {RisoCharacterMeshSheet,RisoMeshFrameRegion,RisoMeshPoint} from "../../registry/video/riso-proportion-mesh";
import {COURIER,PAPER_BIRD} from "./riso-character-demo";
import {RISO_COURIER_SHEET,RISO_PAPER_BIRD_SHEET} from "./riso-character-mesh-sheets";

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
  render:()=> <CourierAnatomyComparison/>,
};
