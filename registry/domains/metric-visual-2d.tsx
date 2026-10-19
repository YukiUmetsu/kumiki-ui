import type { SVGProps } from "react";
import { metricRevealProgress, resolveMetricVisual } from "./metric-model";
import type { MetricReveal, MetricVisualSpec, ResolvedMetric } from "./metric-model";

export interface MetricPalette {
  background: string; panel: string; ink: string; muted: string; grid: string;
  positive: string; negative: string; primary: string; neutral: string;
}
export const METRIC_PALETTES: Readonly<Record<"midnight"|"paper",MetricPalette>>={
  midnight:{background:"#081824",panel:"#102635",ink:"#F2FAFF",muted:"#A8C3D0",grid:"#36505E",
    positive:"#74E1C5",negative:"#FF8C9C",primary:"#A59AFF",neutral:"#5AB3CF"},
  paper:{background:"#F6F8F9",panel:"#FFFFFF",ink:"#15242F",muted:"#516A77",grid:"#C8D4DB",
    positive:"#0C8168",negative:"#B83F57",primary:"#4C55A8",neutral:"#34849A"},
};
export interface MetricVisual2DProps extends Omit<SVGProps<SVGSVGElement>,"children"> {
  spec: MetricVisualSpec;
  frame?: number;
  reveal?: MetricReveal;
  palette?: "midnight"|"paper"|MetricPalette;
  width?: number;
  height?: number;
}
const nice=(v:number)=>Number(v.toFixed(2));
const color=(m:ResolvedMetric,p:MetricPalette)=>p[m.tone];
function splitLabel(label:string):string[] {
  const words=label.split(/\s+/);
  if(label.length<=14)return [label];
  const line1:string[]=[],line2:string[]=[];
  for(const word of words) {
    if((line1.join(" ").length+word.length+1)<=14 || line1.length===0)line1.push(word);
    else line2.push(word);
  }
  return [line1.join(" "),line2.join(" ")].filter(Boolean);
}
/** Static-SVG-compatible visual story. Layout is purely resolved from semantic
 * values; all motion uses the caller's absolute frame and deterministic easing.
 */
export function MetricVisual2D({spec,frame=Number.MAX_SAFE_INTEGER,reveal,
  palette="midnight",width=1280,height=720,...props}:MetricVisual2DProps) {
  if (![width,height].every(n=>Number.isFinite(n)&&n>0) || width<600||height<420)
    throw new Error("MetricVisual2D requires a canvas of at least 600×420 design pixels.");
  const model=resolveMetricVisual(spec);
  const p=typeof palette==="string"?METRIC_PALETTES[palette]:palette;
  if(!p)throw new Error("Unknown metric visual palette.");
  const [min,max]=model.domain;
  const plot={x:width*.10,y:height*.335,w:width*.81,h:height*.41};
  const py=(v:number)=>plot.y+plot.h*(1-(v-min)/(max-min));
  const positions=model.marks.map((m,i)=>plot.x+plot.w*(i+.5)/model.marks.length);
  const progress=(i:number)=>metricRevealProgress(i,frame,reveal);
  const bottom=plot.y+plot.h;
  const zero=py(0);
  const gridValues=Array.from({length:5},(_,i)=>min+(max-min)*i/4);
  const bars=model.kind!=="trend";
  const barW=Math.min(130,plot.w/model.marks.length*.63);
  const titleY=height*.15;
  const subtitleY=height*.225;
  const clipId="km-metric-clip-"+model.id.replace(/[^a-zA-Z0-9_-]/g,"");
  const source=model.sourceNote || model.scaleDisclosure;
  return <svg {...props} viewBox={`0 0 ${width} ${height}`} width={width} height={height}
    role="img" aria-label={model.summary} data-km-metric-visual-2d={model.kind}
    data-semantic-id={model.id} style={{display:"block",maxWidth:"100%",...props.style}}>
    <defs>
      <linearGradient id={clipId+"-bg"} x2="1" y2="1"><stop stopColor={p.background}/><stop offset="1" stopColor={p.panel}/></linearGradient>
      <clipPath id={clipId}><rect x={plot.x} y={plot.y-10} width={plot.w} height={plot.h+20}/></clipPath>
    </defs>
    <rect width={width} height={height} rx={27} fill={`url(#${clipId}-bg)`}/>
    <rect x={width*.036} y={height*.055} width={6} height={height*.09} rx={3} fill={p.primary}/>
    <text x={width*.067} y={titleY} fill={p.ink} fontFamily="Geist, Inter, system-ui, sans-serif"
      fontSize={Math.min(50,width*.042)} fontWeight={700}>{model.title}</text>
    <text x={width*.067} y={subtitleY} fill={p.muted}
      fontFamily="Geist, Inter, system-ui, sans-serif" fontSize={21}>{model.subtitle}</text>
    <text x={plot.x} y={plot.y-30} fontSize={14} letterSpacing={2.3}
      fill={p.muted} fontFamily="system-ui, sans-serif">
      {model.kind==="waterfall"?"NET MOVEMENTS":model.kind==="funnel"?"STAGE COUNTS":"TIME SERIES"}
    </text>
    {gridValues.map((v,i)=><g key={i}>
      <line x1={plot.x} y1={py(v)} x2={plot.x+plot.w} y2={py(v)}
        stroke={p.grid} strokeWidth={1} opacity={.45}/>
      <text x={plot.x-17} y={py(v)+5} textAnchor="end" fill={p.muted}
        fontFamily="system-ui, sans-serif" fontSize={13}>{model.formatValue(v)}</text>
    </g>)}
    {min<=0&&max>=0?<line x1={plot.x} x2={plot.x+plot.w} y1={zero} y2={zero}
      stroke={p.grid} strokeWidth={1.7}/>:null}
    <g clipPath={`url(#${clipId})`}>
      {bars?model.marks.map((m,i)=>{
        const t=progress(i),baseline=model.kind==="waterfall"?m.from:0;
        const to=baseline+(m.to-baseline)*t;
        const y=Math.min(py(baseline),py(to));
        const h=Math.max(0,Math.abs(py(to)-py(baseline)));
        return <g key={m.id} data-km-metric-mark={m.id} data-value={m.value??"missing"}>
          <rect x={nice(positions[i]-barW/2)} y={nice(y)} width={nice(barW)}
            height={nice(h)} fill={color(m,p)} rx={Math.min(8,h/2)} opacity={.92}/>
          {t===1&&m.value!==null?<text x={positions[i]} y={Math.max(plot.y+14,y-10)}
            textAnchor="middle" fontSize={Math.min(17,barW*.2)} fontWeight={700}
            fontFamily="system-ui, sans-serif" fill={p.ink}>{model.formatValue(m.value)}</text>:null}
          {model.kind==="waterfall"&&i>0&&i<model.marks.length-1&&t>0
            ?<line x1={positions[i]-barW/2-7} x2={positions[i]+barW/2+7}
              y1={py(m.from)} y2={py(m.from)} stroke={p.ink} strokeWidth={1} opacity={.4}/>:null}
        </g>;
      }):model.marks.map((m,i)=>{
        if(m.value===null)return null;
        const t=progress(i);
        const x=positions[i],y=py(m.value);
        const previous=model.marks[i-1],from=positions[i-1];
        const hasSegment=i>0&&previous.value!==null;
        const yPrev=hasSegment?py(previous.value!):y;
        return <g key={m.id} data-km-metric-mark={m.id} data-value={m.value}>
          {hasSegment&&t>0?<line x1={from} y1={yPrev}
            x2={from+(x-from)*t} y2={yPrev+(y-yPrev)*t}
            stroke={p.primary} strokeWidth={6} strokeLinecap="round"/>:null}
          {t>0?<circle cx={x} cy={y} r={7*t} fill={p.primary}
            stroke={p.background} strokeWidth={2}/>:null}
          {t===1?<text x={x} y={Math.max(plot.y+15,y-21)} textAnchor="middle"
            fontFamily="system-ui, sans-serif" fontSize={16} fontWeight={700}
            fill={p.ink}>{model.formatValue(m.value)}</text>:null}
        </g>;
      })}
    </g>
    {model.marks.map((m,i)=> <text key={m.id} x={positions[i]} y={bottom+29} textAnchor="middle"
      fontFamily="system-ui, sans-serif" fill={p.muted} fontSize={15}>
      {splitLabel(m.label).map((line,j)=><tspan key={j} x={positions[i]} dy={j===0?0:18}>{line}</tspan>)}
    </text>)}
    {model.kind==="funnel"?model.marks.slice(1).map((m,i)=>{
      const prior=model.marks[i].value!,rate=prior===0?0:(m.value!/prior)*100;
      return <text key={m.id+"-rate"} x={(positions[i]+positions[i+1])/2}
        y={bottom+91} textAnchor="middle" fill={p.muted}
        fontFamily="system-ui, sans-serif" fontSize={13}>{rate.toFixed(1)}% retained</text>;
    }):null}
    <line x1={plot.x} x2={plot.x+plot.w} y1={height*.895} y2={height*.895}
      stroke={p.grid} strokeWidth={1}/>
    {model.scaleDisclosure?<text x={plot.x} y={height*.93} fill={p.negative}
      fontFamily="system-ui, sans-serif" fontSize={15}>{model.scaleDisclosure}</text>:null}
    {source?<text x={plot.x+plot.w} y={height*.93} textAnchor="end"
      fill={p.muted} fontFamily="system-ui, sans-serif" fontSize={15}>{source}</text>:null}
  </svg>;
}
