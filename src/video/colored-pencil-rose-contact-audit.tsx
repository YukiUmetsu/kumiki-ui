/**
 * CP-F1 × FLORA1 | Native Rosa contact atlas.
 *
 * Source-space diagnostic only: samples the ACTUAL CP-F1 SVG paths of the
 * original floral cup, front laminae, five sepals and pedicel. It never
 * overpaints the flower, alters a material seed or asserts photo fidelity.
 * The opt-in marks are editorial guides, not pixels in exported drawings.
 */
import {useLayoutEffect,useRef,useState} from "react";
import type {PencilDrawingSpec} from "../../registry/video/colored-pencil";
import {ROSE_CALYX_SEPAL_IDS} from "./colored-pencil-rose-calyx";

const CONTACT_PARTS=[
  "calyx-receptacle","stem","petal-front-left","petal-front-right",
  ...ROSE_CALYX_SEPAL_IDS,
] as const;

/**
 * Schematic source coordinates from the authored rose. These are NOT
 * photographs' measured anatomical landmarks. New source-registration
 * evidence must be obtained before an artist can classify side windows.
 */
export const ROSE_CONTACT_PROBES=[
  {id:"cup-left",x:230,y:276,subject:"left corolla / cup shoulder"},
  {id:"cup-middle",x:248,y:282,subject:"receding central cup"},
  {id:"cup-right",x:263,y:276,subject:"right corolla / cup shoulder"},
  {id:"lateral-left",x:198,y:278,subject:"left corolla–sepal air window"},
  {id:"lateral-right",x:298,y:278,subject:"right corolla–sepal air window"},
  {id:"stem-root",x:245,y:316,subject:"pedicel / hypanthium root"},
] as const;

export interface RoseContactMeasurement {
  readonly id:string;
  readonly x:number;
  readonly y:number;
  readonly occupiedBy:readonly string[];
  /** Merely source-path fill occupancy; NOT a photograph or true visible z-buffer. */
  readonly state:"multiple-materials"|"one-material"|"no-surveyed-material";
}
function sourcePosition(id:string,path:string):readonly [number,number] {
  const m=/^M(-?[\d.]+)\s+(-?[\d.]+)/.exec(path);
  if(!m)throw new RangeError("Rose contact source root is missing: "+id);
  return [Number(m[1]),Number(m[2])];
}
export function inspectRoseContactSources(drawing:PencilDrawingSpec):string[]{
  const issues:string[]=[];
  const parts=new Map(drawing.regions.map(r=>[r.id,r]));
  const cup=parts.get("calyx-receptacle");
  if(!cup||!cup.opaqueSupport)issues.push("No opaque physical rose hypanthium");
  const transform=cup?.transform;
  for(const id of CONTACT_PARTS){
    const part=parts.get(id);
    if(!part)issues.push("Missing original source part "+id);
    else if(!part.opaqueSupport||part.transform!==transform||
      !part.path.startsWith("M")||!part.path.trimEnd().endsWith("Z"))
      issues.push("Rose survey requires aligned opaque continuous source "+id);
  }
  if(new Set(drawing.regions.map(r=>r.id)).size!==drawing.regions.length)
    issues.push("Duplicate native rose region identity");
  if(ROSE_CONTACT_PROBES.length!==6||
    new Set(ROSE_CONTACT_PROBES.map(p=>p.id)).size!==6)
    issues.push("Incomplete independent cup/air-window probes");
  for(const p of ROSE_CONTACT_PROBES){
    if(![p.x,p.y].every(Number.isFinite)||p.x<150||p.x>325||
      p.y<240||p.y>330)issues.push("Source probe outside junction "+p.id);
  }
  for(const id of ROSE_CALYX_SEPAL_IDS){
    const part=parts.get(id);
    if(part){
      const [x,y]=sourcePosition(id,part.path);
      if(x<210||x>275||y<280||y>330)
        issues.push("Invalid rooted Rosa sepal start "+id);
    }
  }
  return issues;
}

const query=(id:string)=>
  '[data-km-pencil-region="'+id+'"] [data-km-pencil-support]';

/** Native DOM SVG fill-test: observes actual geometries rather than their bounds. */
export function measureRoseContactSvg(svg:SVGSVGElement):RoseContactMeasurement[]{
  const parts=CONTACT_PARTS.map(id=>{
    const element=svg.querySelector(query(id));
    if(!(element instanceof SVGPathElement))
      throw new RangeError("Missing native original rose path: "+id);
    return {id,path:element};
  });
  return ROSE_CONTACT_PROBES.map(p=>{
    const point=new DOMPoint(p.x,p.y);
    const occupiedBy=parts.filter(({path})=>path.isPointInFill(point))
      .map(({id})=>id);
    return {id:p.id,x:p.x,y:p.y,occupiedBy,
      state:occupiedBy.length>1?"multiple-materials":
        occupiedBy.length===1?"one-material":"no-surveyed-material"} as const;
  });
}

/**
 * An overlay in the SAME native source SVG, registered to the exact rose
 * material transform. It lives only in Storybook when explicitly requested.
 * Crosses are observational cursors, never fake outlines or pigment.
 */
export function RoseContactNativeAtlas({drawing,frame}:{
  drawing:PencilDrawingSpec;frame:number;
}){
  const ref=useRef<SVGGElement>(null);
  const [measurements,setMeasurements]=useState<readonly RoseContactMeasurement[]>([]);
  const errors=inspectRoseContactSources(drawing);
  if(errors.length)throw new RangeError("Rose contact atlas: "+errors.join("; "));
  const transform=drawing.regions.find(r=>r.id==="calyx-receptacle")?.transform;
  useLayoutEffect(()=>{
    const svg=ref.current?.ownerSVGElement;
    if(!svg||frame<52){setMeasurements([]);return;}
    setMeasurements(measureRoseContactSvg(svg));
  },[drawing,frame]);
  return <g ref={ref} transform={transform}
    data-km-rose-contact-atlas="" data-km-photo-registration="missing"
    data-km-contact-count={measurements.length} aria-label="Original Rosa material-contact survey">
    {ROSE_CONTACT_PROBES.map((p,index)=>{
      const m=measurements.find(row=>row.id===p.id);
      const label=String(index+1);
      const color=m?.state==="multiple-materials"?"#1C6E7C":
        m?.state==="one-material"?"#87602C":"#A73551";
      return <g key={p.id} data-km-contact-probe={p.id}
        data-km-contact-occupancy={m?.state??"not-measured"}
        data-km-contact-parts={m?.occupiedBy.join(",")??""}>
        <title>{label}. {p.subject}. {m?m.occupiedBy.join(", ")||"no surveyed material":"not yet rendered"}.
          Native source only; no photographic registration.</title>
        <circle cx={p.x} cy={p.y} r="4" fill="#FFFDF4" stroke={color}
          strokeWidth=".75"/>
        <path d={'M'+(p.x-6)+' '+p.y+' h12 M'+p.x+' '+(p.y-6)+' v12'}
          fill="none" stroke={color} strokeWidth=".44"/>
        <text x={p.x+5} y={p.y-5} fontSize="5.5"
          fontWeight="700" fill="#24373E" stroke="#FFFDF4"
          strokeWidth="1.2" paintOrder="stroke">{label}</text>
      </g>;
    })}
  </g>;
}