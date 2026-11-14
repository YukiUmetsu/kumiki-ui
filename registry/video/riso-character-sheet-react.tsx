import { useId } from "react";
import { RisoCharacterKnockout, RisoCharacterInk } from "./riso-character-react";
import { evaluateRisoCharacter } from "./riso-character";
import { evaluateRisoCharacterMesh } from "./riso-proportion-mesh";
import type { RisoCharacterMeshSheet, RisoMeshBounds, RisoMeshFrameRegion, RisoMeshPoint } from "./riso-proportion-mesh";
import type { RisoCharacterSpec } from "./riso-character";

export interface RisoModelSheetProps {
  spec: RisoCharacterSpec;
  sheet: RisoCharacterMeshSheet;
  /** Exact source-film frame for the hero view and head close-up. */
  frame?: number;
  selectedRegion?: string;
  showMesh?: boolean;
  showLabels?: boolean;
  showJoints?: boolean;
  /** Mapping from actor spot-ink ID to its print color. */
  inks?: Readonly<Record<string, string>>;
  paper?: string;
}
/** Fit one same-scale snapshot without stretching the source construction mesh. */
export function risoSheetViewBox(bounds: RisoMeshBounds, width: number, height: number, padding=15): string {
  const bw=Math.max(bounds.width+padding*2,1), bh=Math.max(bounds.height+padding*2,1);
  let w=bw,h=bh;
  const target=width/height,aspect=bw/bh;
  if(aspect<target)w=bh*target;
  else h=bw/target;
  const x=bounds.x+bounds.width/2-w/2, y=bounds.y+bounds.height/2-h/2;
  return [x,y,w,h].map(n=>Number(n.toFixed(3))).join(" ");
}
const path = (p: readonly RisoMeshPoint[]) => p.map((v,i)=>
  (i?"L":"M")+v[0].toFixed(2)+" "+v[1].toFixed(2)).join(" ")+" Z";
const short=(n:number)=>n.toFixed(2);
function Wireframe({regions, selected, showMesh, showLabels}:{
  regions: readonly RisoMeshFrameRegion[]; selected?: string;
  showMesh: boolean; showLabels: boolean;
}) {
  return <g data-km-riso-mesh-overlay="" pointerEvents="none">
    {showMesh && regions.map(region=><g key={region.id}
      data-km-riso-mesh-region={region.id} fill="none"
      stroke={region.id===selected?"#EE5639":"#226B86"}
      strokeWidth={region.id===selected?1.1:.47} strokeLinejoin="round"
      opacity={region.id===selected?1:.72}>
      {region.triangles.map((triangle,i)=><path key={i}
        data-km-riso-mesh-triangle={region.id} d={path(triangle)} />)}
      <path d={path(region.outline)} strokeWidth={region.id===selected?1.8:.8}/>
      {region.landmarks.map(point=><circle key={point.id}
        cx={point.at[0]} cy={point.at[1]} r={1.1}
        fill={region.id===selected?"#EE5639":"#226B86"} stroke="none"/>)}
    </g>)}
    {selected && regions.filter(r=>r.id===selected).map(region=>
      <path key={region.id} data-km-riso-focused-region={region.id}
        d={path(region.outline)} stroke="#E74C35" strokeWidth={2.4}
        strokeDasharray="4 2" fill="none"/>)}
    {showLabels && regions.map(region=>{
      const x=region.bounds.x+region.bounds.width/2;
      const y=region.bounds.y+region.bounds.height/2;
      return <text key={region.id} x={x} y={y} fontSize={3.6}
        fill="#1C4966" stroke="#FCF6E8" strokeWidth={1.2}
        paintOrder="stroke" textAnchor="middle">{region.label}</text>;
    })}
  </g>;
}
function GuideGrid({x,y,w,h}: {x:number;y:number;w:number;h:number}) {
  return <g pointerEvents="none">
    {Array.from({length:Math.ceil(w/32)},(_,i)=><line key={"v"+i}
      x1={x+32*i} y1={y} x2={x+32*i} y2={y+h}
      stroke="#E1D9C9" strokeWidth={.6}/>)}
    {Array.from({length:Math.ceil(h/32)},(_,i)=><line key={"h"+i}
      x1={x} y1={y+32*i} x2={x+w} y2={y+32*i}
      stroke="#E1D9C9" strokeWidth={.6}/>)}
  </g>;
}
/** One source-faithful, printable SVG model sheet; not a fabricated multi-angle turnaround. */
export function RisoCharacterModelSheet({
  spec,sheet,frame=0,selectedRegion,showMesh=true,showLabels=false,showJoints=true,
  inks={blue:"#245F9A",red:"#DD593D"},paper="#FBF2DE",
}:RisoModelSheetProps) {
  const uid=useId().replace(/[^a-z0-9]/gi,"");
  const report=evaluateRisoCharacterMesh(spec,sheet,frame);
  const region=report.regions.find(r=>r.id===selectedRegion)??report.regions[0];
  const head=report.regions.find(r=>r.id===sheet.headRegion)!;
  const poseReports=sheet.poses.map(p=>({label:p.label,frame:p.frame,report:evaluateRisoCharacterMesh(spec,sheet,p.frame)}));
  const allPlates=[...new Set(spec.parts.filter(p=>!p.knockoutOnly).map(p=>p.plate))];
  const section=(x:number,y:number,w:number,h:number,title:string,index:string)=><g>
    <rect x={x} y={y} width={w} height={h} rx={5} fill="#FFFBF1" stroke="#D5CABC"/>
    <GuideGrid x={x+1} y={y+30} w={w-2} h={h-31}/>
    <text x={x+13} y={y+21} fontSize={13} fontWeight={800} fill="#25425B"
      fontFamily="system-ui,sans-serif">{index} / {title}</text>
    <path d={`M${x+12} ${y+29} H${x+w-12}`} stroke="#A8B0A8"/>
  </g>;
  const inkPattern=(_plate:string,i:number)=>`url(#${uid}-screen-${i})`;
  function Actor({sample,parts,view="full"}:{
    sample:number;parts:readonly RisoMeshFrameRegion[];view?:"full"|"close";
  }) {
    return <g data-km-riso-sheet-actor={view} data-km-riso-sheet-actor-frame={sample}>
      <g fill={paper} stroke={paper}>
        <RisoCharacterKnockout spec={spec} frame={sample} spread={1.6}/>
      </g>
      {allPlates.map((plate,i)=><g key={plate} style={{mixBlendMode:"multiply"}}>
        <RisoCharacterInk spec={spec} frame={sample} plateId={plate}
          paint={{solid:inks[plate]??"#315B86",dots:inkPattern(plate,i)}}/>
      </g>)}
      <Wireframe regions={parts} selected={view==="full"?selectedRegion:undefined}
        showMesh={showMesh} showLabels={showLabels&&view==="full"}/>
      {showJoints && view==="full" && <g data-km-riso-sheet-skeleton="" pointerEvents="none">
        {/** Skeleton points are returned by the exact same solver as ink and mesh. */}
        {(() => {
          const pose=reportFor(sample);
          return pose.joints.map(j=>{
            const parent=pose.joints.find(x=>x.id===j.parent);
            return <g key={j.id}>
              {parent&&<path d={`M${parent.x} ${parent.y}L${j.x} ${j.y}`}
                stroke="#DE5C42" strokeWidth={.8} strokeDasharray="2 2" fill="none"/>}
              <circle cx={j.x} cy={j.y} r={1.45} fill="#F9EBD2"
                stroke="#DE5C42" strokeWidth={.8}/>
            </g>;
          });
        })()}
      </g>}
    </g>;
  }
  function reportFor(sample:number) {
    // Reuse the authoritative evaluator, never derive a second skeleton.
    return evaluateRisoCharacter(spec,sample);
  }
  const headBounds: RisoMeshBounds = {
    x:head.bounds.x-10,y:head.bounds.y-12,
    width:head.bounds.width+20,height:head.bounds.height+24,
  };
  const detail=sheet.regions.find(r=>r.id===region.id)!;
  const poseFrames=poseReports.map(p=>p.report);
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1220 930"
    width="100%" role="img"
    aria-label={`${sheet.label} construction and proportion sheet with ${sheet.regions.length} measured regions`}
    data-km-riso-model-sheet={spec.id} data-km-riso-sheet-frame={frame}
    data-km-riso-sheet-feature={region.id}
    style={{display:"block",maxWidth:1220,background:paper}}>
    <defs>
      {allPlates.map((plate,i)=><pattern key={plate} id={`${uid}-screen-${i}`}
        width={4.6} height={4.6} patternUnits="userSpaceOnUse">
        <circle cx={2.3} cy={2.3} r={1.05} fill={inks[plate]??"#315B86"}/>
      </pattern>)}
    </defs>
    <rect width={1220} height={930} fill={paper}/>
    <path d="M20 92 H1200" stroke="#CFC4B6" strokeWidth={1.5}/>
    <text x={24} y={34} fontFamily="Georgia,serif" fontSize={31} fontWeight={800}
      fill="#223D55">{sheet.label.toUpperCase()}</text>
    <text x={25} y={56} fontFamily="system-ui,sans-serif" fontSize={12} letterSpacing={1.5}
      fill="#65707A">CHARACTER CONSTRUCTION / 2D SOURCE-BOUND PROPORTION MESH</text>
    <text x={1200} y={30} textAnchor="end" fontFamily="system-ui,sans-serif"
      fontSize={12} fontWeight={700} fill="#D4513D">RISO / MODEL SHEET 01</text>
    <text x={1200} y={53} textAnchor="end" fontFamily="system-ui,sans-serif"
      fontSize={12} fill="#4D6272">24 FPS not assumed · frame {report.frame} · source {spec.id}</text>
    {section(20,107,464,665,"Full silhouette + construction","A")}
    <svg x={25} y={140} width={454} height={625}
      viewBox={risoSheetViewBox(report.overallBounds,454,625,22)}
      data-km-riso-sheet-full-view="" overflow="hidden">
      <Actor sample={report.frame} parts={report.regions}/>
    </svg>
    {section(502,107,345,338,"Face / head enlargement","B")}
    <svg x={510} y={139} width={329} height={300}
      viewBox={risoSheetViewBox(headBounds,329,300,8)}
      data-km-riso-sheet-head-view="" overflow="hidden">
      <Actor sample={report.frame} parts={report.regions} view="close"/>
      {report.regions.filter(r=>["face","hair","headwear"].includes(r.category)).map(r=>
        <path key={r.id} data-km-riso-head-cage={r.id} d={path(r.outline)}
          stroke={r.id===region.id?"#D84D39":"#267C88"}
          strokeWidth={r.id===region.id?1.9:.5} fill="none"/>)}
    </svg>
    {section(502,459,345,313,"Selected component / proportions","C")}
    <g fill="#29445A" fontFamily="system-ui,sans-serif">
      <text x={517} y={511} fontSize={19} fontWeight={800}>{region.label}</text>
      <text x={517} y={535} fontSize={12} fill="#65717D">{region.category.toUpperCase()} · linked to {detail.joint}</text>
      <path d="M517 551 H827" stroke="#C7BFB4"/>
      <text x={517} y={575} fontSize={12}>Reference width</text>
      <text x={827} y={575} fontSize={16} fontWeight={700} textAnchor="end">
        {short(region.referenceBounds.width)} u
      </text>
      <text x={517} y={603} fontSize={12}>Reference height</text>
      <text x={827} y={603} fontSize={16} fontWeight={700} textAnchor="end">
        {short(region.referenceBounds.height)} u
      </text>
      <text x={517} y={631} fontSize={12}>Width / head-height</text>
      <text x={827} y={631} fontSize={16} fontWeight={700} textAnchor="end">
        {short(region.widthInHeads)} H
      </text>
      <text x={517} y={659} fontSize={12}>Height / head-height</text>
      <text x={827} y={659} fontSize={16} fontWeight={700} textAnchor="end">
        {short(region.heightInHeads)} H
      </text>
      <path d="M517 674 H827" stroke="#C7BFB4"/>
      <text x={517} y={696} fontSize={11}>Authored source parts:</text>
      {region.parts.slice(0,3).map((p,i)=><text key={p} x={517} y={715+i*16}
        fontSize={11} fontFamily="monospace" fill="#28657C">{p}</text>)}
    </g>
    {section(864,107,336,665,"Source-animation pose studies","D")}
    {poseReports.map((p,i)=>{
      const top=150+i*203,mb=poseFrames[i];
      return <g key={p.frame} data-km-riso-sheet-pose={p.frame}>
        <text x={876} y={top+4} fontFamily="system-ui,sans-serif"
          fill="#41586B" fontSize={12} fontWeight={700}>
          {String(i+1).padStart(2,"0")} · {p.label} / f{p.frame}
        </text>
        <svg x={876} y={top+13} width={307} height={170}
          viewBox={risoSheetViewBox(mb.overallBounds,307,170,15)} overflow="hidden">
          <Actor sample={p.frame} parts={mb.regions} view="close"/>
        </svg>
        <path d={`M876 ${top+195}H1186`} stroke="#D5CABC" strokeWidth={1}/>
      </g>;
    })}
    <rect x={20} y={788} width={1180} height={121} rx={5}
      fill="#EFE6D7" stroke="#D5CABC"/>
    <g fontFamily="system-ui,sans-serif" fill="#29445A">
      <text x={34} y={812} fontSize={13} fontWeight={800}>MEASUREMENT STANDARD</text>
      <text x={34} y={833} fontSize={12}>
        1 H = {short(report.headUnit)} local drawing units · {sheet.regions.length} independently mapped construction regions
      </text>
      <text x={34} y={851} fontSize={12}>
        Source: {spec.id} · current pose f{report.frame} · 2D artist-authored cages, NOT inferred 3D depth
      </text>
      <text x={34} y={872} fontSize={12} fontWeight={700} fill="#B74430">
        UNAUTHORED VIEWS: {sheet.missingViews.join(" · ").toUpperCase()}
      </text>
      <text x={34} y={892} fontSize={11}>
        Dimensions describe local guide polygons; moving limb wireframes follow IK. Do not treat pose silhouettes as true orthographic turns.
      </text>
    </g>
  </svg>;
}
