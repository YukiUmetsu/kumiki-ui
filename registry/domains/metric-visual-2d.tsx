import type { SVGProps } from "react";
import { metricRevealProgress, resolveMetricVisual } from "./metric-model";
import type { MetricReveal, MetricVisualSpec, ResolvedMetric } from "./metric-model";
import { FitText, TEXT_FONT_STACK, useFitTextGroup } from "./illustration-2d";
import type { FitTextStep } from "./illustration-2d";

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
/** Round axis ticks (1, 2, 2.5, 5 × 10ⁿ) inside the resolved domain; never
 * changes the domain itself, so data geometry stays exact. */
export function niceTicks(min:number,max:number,maxTicks=6):number[] {
  const span=max-min;
  if(!(span>0))return [min];
  const magnitude=10**Math.floor(Math.log10(span/(maxTicks-1)));
  const step=[1,2,2.5,5,10,20].map(m=>m*magnitude)
    .find(s=>Math.floor(span/s+1e-9)+1<=maxTicks)??span;
  const ticks:number[]=[];
  for(let v=Math.ceil(min/step-1e-9)*step;v<=max+step*1e-9;v+=step)
    ticks.push(Number(v.toPrecision(12)));
  return ticks;
}
/** Preferred label ladder: keep the larger size as long as possible, then
 * add lines, then shrink (never below 11 design px). */
const LABEL_LADDER:readonly FitTextStep[]=[
  {lines:1,size:15},{lines:2,size:15},{lines:2,size:13},{lines:3,size:13},
  {lines:2,size:12},{lines:3,size:12},{lines:3,size:11}];
/** Ladder steps whose stacked height fits `budget`. */
function labelSteps(budget:number):readonly FitTextStep[] {
  const fits=LABEL_LADDER.filter(s=>s.lines*(s.size+2)<=budget);
  return fits.length?fits:[{lines:1,size:11}];
}
/** Static-SVG-compatible visual story. Layout is purely resolved from semantic
 * values; all motion uses the caller's absolute frame and deterministic easing.
 * Category, value and rate labels are measured (`FitText`) against their slot
 * width, so long and CJK labels wrap or step down instead of colliding.
 */
export function MetricVisual2D({spec,frame=Number.MAX_SAFE_INTEGER,reveal,
  palette="midnight",width=1280,height=720,...props}:MetricVisual2DProps) {
  if (![width,height].every(n=>Number.isFinite(n)&&n>0) || width<600||height<420)
    throw new Error("MetricVisual2D requires a canvas of at least 600×420 design pixels.");
  const model=resolveMetricVisual(spec);
  const p=typeof palette==="string"?METRIC_PALETTES[palette]:palette;
  if(!p)throw new Error("Unknown metric visual palette.");
  const [min,max]=model.domain;
  // Keep a minimum gutter for tick labels such as "$100,000" at narrow widths.
  const plotX=Math.max(width*.10,96);
  const plot={x:plotX,y:height*.335,w:width*.91-plotX,h:height*.41};
  const groupKey=`${model.id}|${width}x${height}|${model.marks.map(m=>m.label+":"+m.value).join("|")}`;
  const labelGroup=useFitTextGroup("label|"+groupKey);
  const valueGroup=useFitTextGroup("value|"+groupKey);
  const rateGroup=useFitTextGroup("rate|"+groupKey);
  const py=(v:number)=>plot.y+plot.h*(1-(v-min)/(max-min));
  const slot=plot.w/model.marks.length;
  const positions=model.marks.map((_,i)=>plot.x+slot*(i+.5));
  const progress=(i:number)=>metricRevealProgress(i,frame,reveal);
  const bottom=plot.y+plot.h;
  const zero=py(0);
  const ticks=niceTicks(min,max);
  const bars=model.kind!=="trend";
  const barW=Math.min(130,slot*.63);
  const titleY=height*.15;
  const subtitleY=height*.225;
  const ruleY=height*.895;
  // Reserved bands below the plot: category labels, then (funnels) a rate
  // row pinned above the footer rule. The label line budget is the measured
  // height between them, so wrapping can never run into the rate row.
  const labelTop=bottom+12;
  const labelBudget=(model.kind==="funnel"?ruleY-26:ruleY-6)-labelTop;
  const labelLadder=labelSteps(labelBudget);
  const usedLabel=labelLadder[Math.min(labelGroup.minStep,labelLadder.length-1)];
  const rateTop=Math.min(ruleY-22,labelTop+usedLabel.lines*(usedLabel.size+2)+12);
  const clipId="km-metric-clip-"+model.id.replace(/[^a-zA-Z0-9_-]/g,"");
  // The scale disclosure has its own left-aligned slot; never print it twice.
  const source=model.sourceNote;
  const valueSteps:readonly FitTextStep[]=[16,14,12,11].map(size=>({lines:1 as const,size:bars?Math.min(size+1,Math.max(11,barW*.2)):size}));
  /** Top edge for a value label: above the mark, or below it when the plot
   * top leaves no room (prevents labels from sitting on the series line). */
  const valueTop=(markTop:number,offset:number)=>
    markTop-offset-16>=plot.y-6?markTop-offset-16:markTop+offset-2;
  return <svg {...props} viewBox={`0 0 ${width} ${height}`} width={width} height={height}
    role="img" aria-label={model.summary} data-km-metric-visual-2d={model.kind}
    data-semantic-id={model.id} style={{display:"block",maxWidth:"100%",...props.style}}>
    <defs>
      <linearGradient id={clipId+"-bg"} x2="1" y2="1"><stop stopColor={p.background}/><stop offset="1" stopColor={p.panel}/></linearGradient>
      <clipPath id={clipId}><rect x={plot.x} y={plot.y-10} width={plot.w} height={plot.h+20}/></clipPath>
    </defs>
    <rect width={width} height={height} rx={27} fill={`url(#${clipId}-bg)`}/>
    <rect x={width*.036} y={height*.055} width={6} height={height*.09} rx={3} fill={p.primary}/>
    <text x={width*.067} y={titleY} fill={p.ink} fontFamily={TEXT_FONT_STACK}
      fontSize={Math.min(50,width*.042)} fontWeight={700}>{model.title}</text>
    <text x={width*.067} y={subtitleY} fill={p.muted}
      fontFamily={TEXT_FONT_STACK} fontSize={Math.min(21,height*.042)}>{model.subtitle}</text>
    <text x={plot.x} y={plot.y-Math.min(30,height*.045)} fontSize={14} letterSpacing={2.3}
      fill={p.muted} fontFamily={TEXT_FONT_STACK}>
      {model.kind==="waterfall"?"NET MOVEMENTS":model.kind==="funnel"?"STAGE COUNTS":"TIME SERIES"}
    </text>
    {ticks.map(v=><g key={v}>
      <line x1={plot.x} y1={py(v)} x2={plot.x+plot.w} y2={py(v)}
        stroke={p.grid} strokeWidth={1} opacity={.45}/>
      <text x={plot.x-17} y={py(v)+5} textAnchor="end" fill={p.muted}
        fontFamily={TEXT_FONT_STACK} fontSize={13}>{model.formatValue(v)}</text>
    </g>)}
    {min<=0&&max>=0?<line x1={plot.x} x2={plot.x+plot.w} y1={zero} y2={zero}
      stroke={p.grid} strokeWidth={1.7}/>:null}
    <g clipPath={`url(#${clipId})`}>
      {model.kind==="funnel"?model.marks.slice(1).map((m,i)=>{
        const prev=model.marks[i],t=progress(i+1);
        const x1=positions[i]+barW/2,x2=positions[i+1]-barW/2;
        return <path key={m.id+"-flow"} data-km-metric-flow={m.id} opacity={.18*t} fill={p.neutral}
          d={`M ${nice(x1)} ${nice(py(prev.value!))} L ${nice(x2)} ${nice(py(m.value!))} `+
            `L ${nice(x2)} ${nice(zero)} L ${nice(x1)} ${nice(zero)} Z`}/>;
      }):null}
      {bars?model.marks.map((m,i)=>{
        const t=progress(i),baseline=model.kind==="waterfall"?m.from:0;
        const to=baseline+(m.to-baseline)*t;
        const y=Math.min(py(baseline),py(to));
        const h=Math.max(0,Math.abs(py(to)-py(baseline)));
        return <g key={m.id} data-km-metric-mark={m.id} data-value={m.value??"missing"}>
          <rect x={nice(positions[i]-barW/2)} y={nice(y)} width={nice(barW)}
            height={nice(h)} fill={color(m,p)} rx={Math.min(8,h/2)} opacity={.92}/>
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
        </g>;
      })}
    </g>
    {model.marks.map((m,i)=>{
      if(progress(i)<1||m.value===null)return null;
      const top=bars?Math.min(py(m.from),py(m.to)):py(m.value);
      return <FitText key={m.id+"-value"} data-km-metric-value={m.id} text={model.formatValue(m.value)}
        x={positions[i]} y={bars?Math.max(plot.y-8,top-28):valueTop(top,18)} maxWidth={slot*.94}
        steps={valueSteps} fontWeight={700} fill={p.ink} {...valueGroup}/>;
    })}
    {model.marks.map((m,i)=><FitText key={m.id} data-km-metric-label={m.id} text={m.label}
      x={positions[i]} y={labelTop} maxWidth={slot-12} steps={labelLadder}
      fill={p.muted} {...labelGroup}/>)}
    {model.kind==="funnel"?model.marks.slice(1).map((m,i)=>{
      const prior=model.marks[i].value!,rate=prior===0?0:(m.value!/prior)*100;
      return <FitText key={m.id+"-rate"} data-km-metric-rate={m.id} text={`${rate.toFixed(1)}% retained`}
        x={(positions[i]+positions[i+1])/2} y={rateTop} maxWidth={slot*.92}
        steps={[{lines:1,size:14},{lines:1,size:13},{lines:1,size:12},{lines:1,size:11}]} fill={p.muted}
        opacity={progress(i+1)} {...rateGroup}/>;
    }):null}
    <line x1={plot.x} x2={plot.x+plot.w} y1={ruleY} y2={ruleY}
      stroke={p.grid} strokeWidth={1}/>
    {model.scaleDisclosure?<text x={plot.x} y={height*.93} fill={p.negative}
      fontFamily={TEXT_FONT_STACK} fontSize={15}>{model.scaleDisclosure}</text>:null}
    {source?<text x={plot.x+plot.w} y={height*.93} textAnchor="end"
      fill={p.muted} fontFamily={TEXT_FONT_STACK} fontSize={15}>{source}</text>:null}
  </svg>;
}
