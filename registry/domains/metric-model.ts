/** Shared finance/business truth: one validated document for 2D and 3D.
 * Values are data, never randomized or distorted for visual effect.
 */
export type MetricFormat =
  | { kind: "number"; suffix?: string; maximumFractionDigits?: number }
  | { kind: "currency"; currency: string; maximumFractionDigits?: number }
  | { kind: "percent"; maximumFractionDigits?: number };

export interface MetricBase {
  id: string;
  title: string;
  subtitle?: string;
  format?: MetricFormat;
  /** Optional source, accounting basis or measurement caveat. */
  sourceNote?: string;
}
export interface TrendVisual extends MetricBase {
  kind: "trend";
  points: readonly { id: string; label: string; value: number | null }[];
  /** Explicit scale policy. A nonzero axis must be disclosed on screen. */
  scale: { zero: boolean; domain?: readonly [number, number] };
}
export interface WaterfallVisual extends MetricBase {
  kind: "waterfall";
  opening: number;
  openingLabel: string;
  changes: readonly { id: string; label: string; delta: number }[];
  closingLabel: string;
}
export interface FunnelVisual extends MetricBase {
  kind: "funnel";
  stages: readonly { id: string; label: string; value: number }[];
}
export type MetricVisualSpec = TrendVisual | WaterfallVisual | FunnelVisual;
export type MetricTone = "primary" | "positive" | "negative" | "neutral";
export interface ResolvedMetric {
  id: string;
  label: string;
  /** Absolute value at this mark. Null is intentionally missing, never zero. */
  value: number | null;
  /** Floating waterfall bar endpoints, or zero and the stage value. */
  from: number;
  to: number;
  tone: MetricTone;
}
export interface ResolvedMetricVisual {
  id: string;
  kind: MetricVisualSpec["kind"];
  title: string;
  subtitle: string;
  sourceNote: string;
  marks: readonly ResolvedMetric[];
  domain: readonly [number, number];
  scaleDisclosure: string;
  summary: string;
  formatValue: (value: number) => string;
}
const nonempty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const finite = (v: number) => Number.isFinite(v);
function fail(message: string): never { throw new Error("Metric visual: " + message); }
function validateMarks(marks: readonly {id:string;label:string}[]): void {
  if (marks.length < 2 || marks.length > 10) fail("use 2 to 10 labelled entries.");
  const ids = new Set<string>();
  for (const mark of marks) {
    if (!nonempty(mark.id) || ids.has(mark.id) || !nonempty(mark.label))
      fail("marks need unique IDs and nonempty labels.");
    if (mark.label.length > 28) fail("label is too long for a reusable cinematic chart; use a shorter display label.");
    ids.add(mark.id);
  }
}
const axis = (min: number, max: number, zero: boolean): readonly [number,number] => {
  const lo = zero ? Math.min(0, min) : min;
  const hi = zero ? Math.max(0, max) : max;
  const span = hi - lo || Math.max(1, Math.abs(lo) * 0.1);
  // Preserve exact zero when called for zero-based columns.
  return zero
    ? [lo < 0 ? lo - span * 0.06 : 0, hi > 0 ? hi + span * 0.06 : span]
    : [lo - span * 0.09, hi + span * 0.09];
};
export function formatMetric(value: number, format: MetricFormat = {kind:"number"}): string {
  if (!finite(value)) fail("cannot display nonfinite values.");
  const digits = format.maximumFractionDigits ?? (format.kind === "percent" ? 1 : 2);
  if (!Number.isSafeInteger(digits) || digits < 0 || digits > 8) fail("fraction digits must be 0–8.");
  if (format.kind === "currency") {
    if (!/^[A-Z]{3}$/.test(format.currency)) fail("currency must be an ISO 4217 code.");
    return new Intl.NumberFormat("en-US", {style:"currency",currency:format.currency,
      maximumFractionDigits:digits}).format(value);
  }
  const number = new Intl.NumberFormat("en-US", {maximumFractionDigits:digits}).format(value);
  return number + (format.kind === "percent" ? "%" : (format.suffix ?? ""));
}
export function resolveMetricVisual(spec: MetricVisualSpec): ResolvedMetricVisual {
  if (!spec || !nonempty(spec.id) || !nonempty(spec.title)) fail("require a stable ID and title.");
  if (spec.subtitle !== undefined && typeof spec.subtitle !== "string") fail("subtitle must be text.");
  if (spec.sourceNote !== undefined && typeof spec.sourceNote !== "string") fail("source note must be text.");
  const show = (v:number) => formatMetric(v,spec.format);
  let marks: ResolvedMetric[] = [], domain:readonly[number,number], disclosure = "";
  if (spec.kind === "trend") {
    validateMarks(spec.points);
    const values = spec.points.filter(p=>p.value !== null).map(p=>p.value as number);
    if (!values.length || values.some(v=>!finite(v))) fail("trend needs finite values or explicit null gaps.");
    if (!spec.scale || typeof spec.scale.zero !== "boolean") fail("trend needs an explicit zero-baseline policy.");
    const low=Math.min(...values), high=Math.max(...values);
    if (spec.scale.domain) {
      const [min,max] = spec.scale.domain;
      if (!finite(min)||!finite(max)||max<=min||min>low||max<high ||
          (spec.scale.zero && !(min<=0 && max>=0))) fail("scale domain must contain the data and declared zero baseline.");
      domain=[min,max];
    } else domain=axis(low,high,spec.scale.zero);
    if (!spec.scale.zero) disclosure="Value axis does not start at zero.";
    marks=spec.points.map((p,i)=>({id:p.id,label:p.label,value:p.value,
      from:0,to:p.value??0,tone:i===spec.points.length-1?"primary":"neutral"}));
  } else if (spec.kind === "waterfall") {
    if (!finite(spec.opening)||!nonempty(spec.openingLabel)||!nonempty(spec.closingLabel))
      fail("waterfall needs a finite opening and named totals.");
    validateMarks([{id:"opening",label:spec.openingLabel},
      ...spec.changes,{id:"closing",label:spec.closingLabel}]);
    if(spec.changes.length===0)fail("waterfall needs at least one change.");
    let running=spec.opening;
    marks=[{id:"opening",label:spec.openingLabel,value:running,from:0,to:running,tone:"neutral"}];
    for (const step of spec.changes) {
      if (!finite(step.delta)) fail("waterfall deltas must be finite.");
      const before=running; running+=step.delta;
      if (!finite(running)) fail("waterfall cumulative totals must remain finite.");
      marks.push({id:step.id,label:step.label,value:step.delta,from:before,to:running,
        tone:step.delta<0?"negative":step.delta>0?"positive":"neutral"});
    }
    marks.push({id:"closing",label:spec.closingLabel,value:running,from:0,to:running,tone:"primary"});
    const extrema=marks.flatMap(m=>[m.from,m.to]);
    domain=axis(Math.min(...extrema),Math.max(...extrema),true);
  } else if (spec.kind === "funnel") {
    validateMarks(spec.stages);
    if (spec.stages.some(s=>!finite(s.value)||s.value<0)) fail("funnel values must be finite and nonnegative.");
    for(let i=1;i<spec.stages.length;i++)
      if(spec.stages[i].value>spec.stages[i-1].value)
        fail("funnel must be nonincreasing; show an increase as a different chart.");
    marks=spec.stages.map((s,i)=>({id:s.id,label:s.label,value:s.value,from:0,to:s.value,
      tone:i===spec.stages.length-1?"primary":"neutral"}));
    domain=axis(0,spec.stages[0].value||1,true);
  } else return fail("unsupported chart kind.");
  // Catch accidental normalized-domain collapse and malformed source data.
  if (marks.some(m=>!finite(m.from)||!finite(m.to)||m.value!==null&&!finite(m.value)))
    fail("all numeric marks must be finite.");
  if (!(domain[1]>domain[0])) fail("value axis must have positive extent.");
  const first=marks[0],last=marks[marks.length-1];
  const result:ResolvedMetricVisual={
    id:spec.id,kind:spec.kind,title:spec.title,subtitle:spec.subtitle??"",
    sourceNote:spec.sourceNote??"",marks,domain,scaleDisclosure:disclosure,
    summary: spec.kind==="waterfall"
      ? `${spec.title}: opens at ${show(first.value!)}, closes at ${show(last.value!)} after ${marks.length-2} changes.`
      : spec.kind==="funnel"
        ? `${spec.title}: ${first.label} ${show(first.value!)}, ${last.label} ${show(last.value!)}; each stage is a subset of the preceding stage.`
        : `${spec.title}: ${marks.length} periods, with missing observations shown as gaps. ${disclosure}`,
    formatValue:show,
  };
  return result;
}
/** A single absolute-frame clock shared by SVG and Three renderers. */
export interface MetricReveal { startFrame:number; framesPerMark:number }
export function metricRevealProgress(index:number,frame:number,reveal?:MetricReveal):number {
  if(!reveal)return 1;
  if(!Number.isSafeInteger(index)||index<0||!Number.isSafeInteger(frame)||
     !Number.isSafeInteger(reveal.startFrame)||!Number.isSafeInteger(reveal.framesPerMark)||
     reveal.startFrame<0||reveal.framesPerMark<1)
    fail("reveal needs nonnegative integer frames and a positive framesPerMark.");
  const start=reveal.startFrame+index*reveal.framesPerMark;
  const t=Math.max(0,Math.min(1,(frame-start)/reveal.framesPerMark));
  return t*t*(3-2*t);
}

/** Ready-to-edit examples; all values are fabricated demonstration data. */
export const FINANCE_REVENUE_BRIDGE: WaterfallVisual={
  kind:"waterfall",id:"finance-revenue-bridge",title:"Revenue bridge",
  subtitle:"Illustrative quarterly revenue movements",opening:125000,openingLabel:"Opening",
  changes:[{id:"new",label:"New business",delta:34000},
    {id:"upsell",label:"Expansion",delta:18000},
    {id:"churn",label:"Churn",delta:-11000},
    {id:"fx",label:"FX impact",delta:-4000}],
  closingLabel:"Closing",format:{kind:"currency",currency:"USD",maximumFractionDigits:0},
  sourceNote:"Illustrative figures · USD",
};
export const FINANCE_PORTFOLIO_TREND: TrendVisual={
  kind:"trend",id:"finance-value-trend",title:"Portfolio value",
  subtitle:"Illustrative month-end values, not investment advice",scale:{zero:false},
  points:[{id:"jan",label:"Jan",value:101},{id:"feb",label:"Feb",value:104},
    {id:"mar",label:"Mar",value:98},{id:"apr",label:"Apr",value:108},
    {id:"may",label:"May",value:112},{id:"jun",label:"Jun",value:109}],
  format:{kind:"number",suffix:"k"},sourceNote:"Illustrative figures · thousands USD",
};
export const BUSINESS_CONVERSION_FUNNEL: FunnelVisual={
  kind:"funnel",id:"business-conversion-funnel",title:"Conversion funnel",
  subtitle:"Illustrative monthly pipeline",stages:[
    {id:"visits",label:"Visits",value:24000},
    {id:"signup",label:"Sign-ups",value:6200},
    {id:"qualified",label:"Qualified",value:1800},
    {id:"customers",label:"Customers",value:540}],
  format:{kind:"number"},sourceNote:"Illustrative event counts",
};
export const BUSINESS_REVENUE_TREND: TrendVisual={
  kind:"trend",id:"business-growth",title:"Recurring revenue",
  subtitle:"Illustrative six-quarter performance",scale:{zero:true},
  points:[{id:"q1",label:"Q1",value:42000},{id:"q2",label:"Q2",value:51000},
    {id:"q3",label:"Q3",value:66000},{id:"q4",label:"Q4",value:75000},
    {id:"q5",label:"Q5",value:89000},{id:"q6",label:"Q6",value:103000}],
  format:{kind:"currency",currency:"USD",maximumFractionDigits:0},
  sourceNote:"Illustrative values · USD",
};
