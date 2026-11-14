import { useId, useMemo } from "react";
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
  /** Maximum edge of diagnostic triangles (stage units); smaller = finer mesh. */
  meshEdgeLength?: number;
  /** Bounded triangle count for the selected detail, default 1800 (all other regions stay coarse). */
  meshTriangleBudget?: number;
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
    {showMesh && regions.filter(region=>region.id===selected).map(region=><g key={region.id}
      data-km-riso-mesh-region={region.id} fill="none"
      stroke={region.id===selected?"#EE5639":"#226B86"}
      strokeWidth={.27} strokeLinejoin="round"
      opacity={.68}>
      {region.triangles.map((triangle,i)=><path key={i}
        data-km-riso-mesh-triangle={region.id} d={path(triangle)} />)}
      <path d={path(region.outline)} strokeWidth={.78}/>
      {region.landmarks.map(point=><circle key={point.id}
        cx={point.at[0]} cy={point.at[1]} r={.7}
        fill={region.id===selected?"#EE5639":"#226B86"} stroke="none"/>)}
    </g>)}
    {showMesh && selected && regions.filter(r=>r.id===selected).map(region=>
      <path key={region.id} data-km-riso-focused-region={region.id}
        d={path(region.outline)} stroke="#E74C35" strokeWidth={.85}
        strokeDasharray="2.4 1.5" opacity={.9} fill="none"/>)}
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
  spec,sheet,frame=0,selectedRegion,showMesh=true,meshEdgeLength=5,meshTriangleBudget=1800,showLabels=false,showJoints=true,
  inks={blue:"#245F9A",red:"#DD593D"},paper="#FBF2DE",
}:RisoModelSheetProps) {
  const uid=useId().replace(/[^a-z0-9]/gi,"");
  const report=useMemo(
    ()=>evaluateRisoCharacterMesh(spec,sheet,frame,{
      maxEdgeLength:meshEdgeLength,
      maxTrianglesPerRegion:meshTriangleBudget,
      focusRegionId:selectedRegion??sheet.headRegion,
    }),
    [spec,sheet,frame,meshEdgeLength,meshTriangleBudget,selectedRegion],
  );
  const avian=spec.id==="paper-bird";
  const region=report.regions.find(r=>r.id===selectedRegion)??report.regions[0];
  // Thumbnail actors never render their triangulation. Cache the coarse
  // source bounds once and avoid recomputing thousands of fine triangles
  // for all three printed poses on every character-sheet control change.
  const poseReports=useMemo(()=>sheet.poses.map(p=>({
    label:p.label,frame:p.frame,
    report:evaluateRisoCharacterMesh(spec,sheet,p.frame,{maxEdgeLength:200}),
  })),[spec,sheet]);
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
    sample:number;parts:readonly RisoMeshFrameRegion[];view?:"full"|"face"|"pose";
  }) {
    return <g data-km-riso-sheet-actor={view} data-km-riso-sheet-actor-frame={sample}>
      {view==="face" ? <>
        {/** Only true head/face/hair authored paths belong in an orthographic
             facial detail. Drawing the whole actor here let wings and sleeves
             obscure the beak and eye in the Bird sheet. */}
        {(() => {
          const headParts=new Set(sheet.regions.filter(r=>
            ["face","hair","headwear"].includes(r.category)).flatMap(r=>r.parts));
          const evaluated=reportFor(sample).parts.filter(p=>headParts.has(p.id));
          return <>
            <g fill={paper} stroke={paper} strokeWidth={1}>
              {evaluated.map(p=><path key={p.id} data-km-riso-face-knockout={p.id}
                d={p.d} transform={p.transform}/>)}
            </g>
            {allPlates.map((plate,i)=><g key={plate} style={{mixBlendMode:"multiply"}}>
              {evaluated.filter(p=>p.plate===plate&&!p.knockoutOnly).map(p=>
                <path key={p.id} data-km-riso-face-ink={p.id} d={p.d} transform={p.transform}
                  fill={p.paint==="screen"?inkPattern(plate,i):(inks[plate]??"#315B86")}
                  opacity={p.opacity}/>)}
            </g>)}
          </>;
        })()}
      </> : <>
        <g fill={paper} stroke={paper}>
          <RisoCharacterKnockout spec={spec} frame={sample} spread={1.6}/>
        </g>
        {allPlates.map((plate,i)=><g key={plate} style={{mixBlendMode:"multiply"}}>
          <RisoCharacterInk spec={spec} frame={sample} plateId={plate}
            paint={{solid:inks[plate]??"#315B86",dots:inkPattern(plate,i)}}/>
        </g>)}
        <Wireframe regions={parts} selected={view==="full"?selectedRegion:undefined}
          showMesh={showMesh&&view==="full"} showLabels={showLabels&&view==="full"}/>
      </>}
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
  // Include the cap and all hair outlines in the enlarged head crop.
  // A face-only crop would silently chop off the actor's distinctive fringe.
  const headRegions=report.regions.filter(r=>
    r.id===sheet.headRegion || ["face","hair","headwear"].includes(r.category));
  const headX=Math.min(...headRegions.map(r=>r.bounds.x));
  const headY=Math.min(...headRegions.map(r=>r.bounds.y));
  const headRight=Math.max(...headRegions.map(r=>r.bounds.x+r.bounds.width));
  const headBottom=Math.max(...headRegions.map(r=>r.bounds.y+r.bounds.height));
  const headBounds: RisoMeshBounds = {
    x:headX-11,y:headY-11,width:headRight-headX+22,height:headBottom-headY+22,
  };
  const detail=sheet.regions.find(r=>r.id===region.id)!;
  const poseFrames=poseReports.map(p=>p.report);
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1220 930"
    width="100%" role="img"
    aria-label={`${sheet.label} construction and proportion sheet with ${sheet.regions.length} measured regions`}
    data-km-riso-model-sheet={spec.id} data-km-riso-sheet-frame={frame}
    data-km-riso-sheet-feature={region.id} data-km-riso-mesh-edge-length={meshEdgeLength}
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
      fontSize={12} fontWeight={700} fill="#D4513D">RISO / FINE CONTOUR 08</text>
    <text x={1200} y={53} textAnchor="end" fontFamily="system-ui,sans-serif"
      fontSize={12} fill="#4D6272">24 FPS not assumed · frame {report.frame} · source {spec.id}</text>
    {section(20,107,464,665,avian?"Flight silhouette + wing construction":"Full silhouette + construction","A")}
    <svg x={25} y={140} width={454} height={avian?360:625}
      viewBox={risoSheetViewBox(report.overallBounds,454,avian?360:625,22)}
      data-km-riso-sheet-full-view="" overflow="hidden">
      <Actor sample={report.frame} parts={report.regions}/>
    </svg>
    {avian && <g data-km-riso-avian-wing-studies="">
      <path d="M32 511 H472" stroke="#BDB5A6" strokeWidth={1}/>
      <text x={33} y={531} fontFamily="system-ui,sans-serif" fontSize={12}
        fontWeight={800} fill="#29465E">WING ARTICULATION / FEATHER CAGES</text>
      {(["left-wing","right-wing"] as const).map((id,i)=>{
        const wing=report.regions.find(r=>r.id===id)!;
        const x=32+i*220;
        return <g key={id} data-km-riso-wing-detail={id}>
          <rect x={x} y={542} width={208} height={203} rx={4}
            fill="#FBF6EC" stroke="#D0C4B6"/>
          <text x={x+9} y={559} fontFamily="system-ui,sans-serif"
            fontWeight={700} fontSize={11} fill="#31546A">{wing.label}</text>
          <svg x={x+7} y={566} width={194} height={145}
            viewBox={risoSheetViewBox(wing.bounds,194,145,14)}
            overflow="hidden">
            {reportFor(report.frame).parts.filter(p=>
              wing.parts.includes(p.id) && !p.knockoutOnly).map(p=>
              <path key={p.id} data-km-riso-wing-isolated-ink={p.id}
                d={p.d} transform={p.transform} fill={inks[p.plate]??"#315B86"}
                opacity={p.opacity}/>)}
            {showMesh && <g stroke="#247A8F" strokeWidth={.44} opacity={.58} fill="none"
              data-km-riso-wing-cage={id}>
              {wing.triangles.map((triangle,n)=>
                <path key={n} d={path(triangle)}/>)}
              <path d={path(wing.outline)} strokeWidth={1.05}/>
            </g>}
          </svg>
          <text x={x+10} y={714} fontFamily="ui-monospace,monospace"
            fontSize={10.5} fill="#40586B">
            Wing width {short(wing.widthInHeads)} H
          </text>
          <text x={x+10} y={731} fontFamily="ui-monospace,monospace"
            fontSize={10.5} fill="#40586B">
            {wing.triangles.length} cells · {short(wing.maxTriangleEdgeLength)} u edge
          </text>
        </g>;
      })}
    </g>}
    {section(502,107,345,338,"Face / head enlargement","B")}
    <svg x={510} y={139} width={329} height={300}
      viewBox={risoSheetViewBox(headBounds,329,300,8)}
      data-km-riso-sheet-head-view="" overflow="hidden">
      <Actor sample={report.frame} parts={report.regions} view="face"/>
      {showMesh && report.regions.filter(r=>["face","hair","headwear"].includes(r.category)).map(r=>
        <path key={r.id} data-km-riso-head-cage={r.id} d={path(r.outline)}
          stroke={r.id===region.id?"#D84D39":"#267C88"}
          strokeWidth={r.id===region.id?1.9:.5} opacity={r.id===region.id?1:.38} fill="none"/>)}
    </svg>
    {section(502,459,345,313,"Source contour + proportions","C")}
    <g fill="#29445A" fontFamily="system-ui,sans-serif">
      <text x={517} y={501} fontSize={15} fontWeight={800}>{region.label}</text>
      <text x={517} y={522} fontSize={11} fill="#65717D">{region.category.toUpperCase()} · source joint {detail.joint}</text>
    </g>
    <rect x={517} y={537} width={145} height={141} rx={4} fill="#F6F1E7" stroke="#D8CFC1"/>
    <svg x={520} y={540} width={139} height={135}
      viewBox={risoSheetViewBox(region.bounds,139,135,5)}
      data-km-riso-selected-source-detail="" overflow="hidden">
      <path d={path(region.outline)} fill="#DDE9E6" stroke="#D95C42"
        strokeWidth={1.2} strokeLinejoin="round"/>
      {showMesh && region.triangles.map((t,i)=><path key={i} d={path(t)}
        data-km-riso-selected-source-triangle=""
        stroke="#2C7A86" opacity={.57} strokeWidth={.25} fill="none"/>)}
      {showMesh && region.landmarks.filter(p=>p.id==="source-center").map(p=>
        <circle key={p.id} cx={p.at[0]} cy={p.at[1]} r={1.25}
          fill="#DE5C42" stroke="#FAF2E4" strokeWidth={.65}/>)}
    </svg>
    <g fill="#29445A" fontFamily="system-ui,sans-serif">
      <text x={674} y={549} fontSize={10}>SOURCE WIDTH</text>
      <text x={674} y={570} fontSize={15} fontWeight={800}>{short(region.referenceBounds.width)} u</text>
      <text x={674} y={591} fontSize={10}>SOURCE HEIGHT</text>
      <text x={674} y={612} fontSize={15} fontWeight={800}>{short(region.referenceBounds.height)} u</text>
      <text x={674} y={634} fontSize={10}>HEAD RATIOS (W × H)</text>
      <text x={674} y={655} fontSize={15} fontWeight={800}>
        {short(region.widthInHeads)} × {short(region.heightInHeads)}
      </text>
    </g>
    <path d="M517 688 H827" stroke="#C7BFB4"/>
    <g fill="#486175" fontFamily="ui-monospace,monospace" fontSize={11}>
      <text x={517} y={705}>
        {region.sourceContourPoints} source vertices · {region.triangles.length} inside triangles
      </text>
      <text x={517} y={723}>
        Surface area error {short(Math.abs(region.contourArea-region.triangleArea))} u²
      </text>
      <text x={517} y={741}>
        SVG source: {region.parts.slice(0,2).join(" + ")}
      </text>
      <text x={517} y={760} fill="#9A614E">
        Actual source outline · no rectangular proxy
      </text>
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
          <Actor sample={p.frame} parts={mb.regions} view="pose"/>
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
        {report.measurements.slice(0,3).map(m=>m.label+": "+short(m.distanceInHeads)+" H").join("    /    ")}
      </text>
      <text x={34} y={872} fontSize={12} fontWeight={700} fill="#B74430">
        UNAUTHORED VIEWS: {sheet.missingViews.join(" · ").toUpperCase()}
      </text>
      <text x={34} y={892} fontSize={11}>
        Measured source SVG curves follow rig keys and IK. Animation poses are NOT approved orthographic turnarounds.
      </text>
    </g>
  </svg>;
}
