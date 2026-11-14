import {useId,useMemo,useState} from "react";
import type {Meta,StoryObj} from "@storybook/react";
import {RisoCharacterInk,RisoCharacterKnockout} from "../../registry/video/riso-character-react";
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
    {title:"01 / Hair, lids and facial planes",regions:["head-shape","hair-mass","hair-forelock","hair-temple","cap-brim","eye-left","eye-right"],focus:"eye-left"},
    {title:"02 / Cloth, hand grip and lapels",regions:["coat-shell","glove-left","glove-right","satchel","coat-lapel-left"],focus:"glove-right"},
    {title:"03 / Shoes, hems and stance",regions:["boot-left","boot-right","shin-left","shin-right"],focus:"boot-left"},
  ],
  "paper-bird":[
    {title:"01 / Wing silhouette and coverts",regions:["left-wing","right-wing","body","head"],focus:"left-wing"},
    {title:"02 / Beak, eye and cheek",regions:["head","beak","eye","eye-ring","beak-divider"],focus:"beak"},
    {title:"03 / Tail, breast and feather flow",regions:["tail","body","breast-plumage","body-feather-hatching"],focus:"tail"},
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
  const [plates,setPlates]=useState<PlateMode>("both");
  const [mesh,setMesh]=useState(false);
  const [zoom,setZoom]=useState(1);
  const uid=useId().replace(/[^a-z0-9]/gi,"");
  const model=useMemo(()=>evaluateRisoCharacterMesh(spec,sheet,frame,{maxEdgeLength:8}),[spec,sheet,frame]);
  const definitions=panelDefinitions[actor];
  const paint={
    blue:{solid:blue,dots:`url(#${uid}-screen-blue)`},
    red:{solid:red,dots:`url(#${uid}-screen-red)`},
  };
  function panel(i:number,x:number,y:number,w:number,h:number){
    const def=definitions[i],bounds=sourceBounds(model.regions,def.regions);
    const view=risoSheetViewBox(bounds,w,h,i===0?12:9).split(" ").map(Number);
    const [vx,vy,vw,vh]=view;
    const scaledW=vw/zoom,scaledH=vh/zoom;
    const box=[vx+vw/2-scaledW/2,vy+vh/2-scaledH/2,scaledW,scaledH].map(n=>n.toFixed(3)).join(" ");
    const primary=model.regions.find(r=>r.id===def.focus)!;
    return <g key={i} data-km-riso-artcraft-panel={def.focus}>
      <rect x={x} y={y} width={w} height={h} rx={5} fill="#FFF8EC" stroke="#CEBFAD"/>
      <text x={x+14} y={y+22} fontFamily="system-ui,sans-serif" fontSize={13}
        fontWeight={800} fill="#244760">{def.title}</text>
      <svg x={x+9} y={y+32} width={w-18} height={h-40} viewBox={box} overflow="hidden"
        data-km-riso-artcraft-crop={def.focus}>
        <g fill={paper} stroke={paper} strokeWidth={1.5}>
          <RisoCharacterKnockout spec={spec} frame={frame} spread={1.5}/>
        </g>
        {(["blue","red"] as const).filter(p=>plates==="both"||plates===p).map(p=>
          <g key={p} style={{mixBlendMode:"multiply"}}>
            <RisoCharacterInk spec={spec} frame={frame} plateId={p} paint={paint[p]}/>
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
      <div style={{letterSpacing:3,fontSize:12,fontWeight:800}}>ARTCRAFT / REFERENCE-LED RISO9</div>
      <h2 style={{font:"700 28px Georgia,serif",margin:"6px 0"}}>
        {bird?"Paper Bird — Anatomical Feather & Face Studies":"Paper Courier — Facial & Costume Construction"}
      </h2>
      <p style={{fontSize:13,margin:"0 0 15px"}}>
        Original character art · live FK/IK source frame · zoomed close-ups · individually printable ink plates
      </p>
      <svg viewBox="0 0 1180 740" style={{display:"block",width:"100%",height:"auto",background:paper}}
        data-km-riso-artcraft-studio={actor} data-km-riso-artcraft-frame={frame}
        data-km-riso-artcraft-plate={plates} data-km-riso-artcraft-zoom={zoom}>
        <defs>
          <pattern id={uid+"-screen-blue"} width="4.2" height="4.2" patternUnits="userSpaceOnUse">
            <circle cx="1.3" cy="1.3" r=".83" fill={blue}/>
          </pattern>
          <pattern id={uid+"-screen-red"} width="4.7" height="4.7" patternUnits="userSpaceOnUse">
            <circle cx="1.7" cy="1.7" r=".92" fill={red}/>
          </pattern>
        </defs>
        {panel(0,20,20,750,695)}
        {panel(1,789,20,371,337)}
        {panel(2,789,378,371,337)}
        <text x={27} y={730} fontSize={11} fontFamily="ui-monospace,monospace" fill="#557080">
          SOURCE IMAGE CRAFT: face geometry / cloth articulation / feather root continuity
        </text>
      </svg>
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
const meta={title:"Video production/Film Looks/Risograph Characters",
  id:"video-riso-artcraft-studies",component:ArtcraftStudio,
  parameters:{layout:"fullscreen"},
} satisfies Meta<typeof ArtcraftStudio>;
export default meta;
type Story=StoryObj<typeof meta>;
export const CourierArtcraftDetail:Story={
  name:"RISO9 · Courier ArtCraft Detail",
  args:{actor:"courier"},
};
export const BirdArtcraftDetail:Story={
  name:"RISO9 · Bird ArtCraft Detail",
  args:{actor:"paper-bird"},
};
