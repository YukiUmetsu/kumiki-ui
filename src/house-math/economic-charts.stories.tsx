import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { renderBreakEvenComparison } from "../../registry/infographic/break-even-comparison";
import type { BreakEvenSpec } from "../../registry/infographic/break-even-comparison";
import { renderCostWaterfall } from "../../registry/infographic/cost-waterfall";
import type { CostWaterfallSpec } from "../../registry/infographic/cost-waterfall";
import type { EconomicChartOptions, EconomicChartResult } from "../../registry/infographic/economic";
import { EconomicChartView } from "../../registry/infographic/economic-react";
import { renderLifecycleCostTimeline } from "../../registry/infographic/lifecycle-cost-timeline";
import { renderScenarioBand } from "../../registry/infographic/scenario-band";
import type { ScenarioBandSpec } from "../../registry/infographic/scenario-band";
import type { LifecycleCostTimelineSpec } from "../../registry/infographic/lifecycle-cost-timeline";
import type { ArtDirectionId } from "../../registry/infographic/types";
import { Button, Chip, Page, Panel, Row, Slider, ink, mono, useFramePlayer } from "./house-ui";

// All figures below are illustrative fixtures for the stories, not prices or forecasts.
const ILLUSTRATIVE = { illustrative: true, source: "story fixture" } as const;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const cumulative = (upfront: number, perYear: number, n: number, jumps: Record<number, number> = {}) => {
  let s = upfront;
  return range(n).map(i => { if (i) s += perYear; s += jumps[i] ?? 0; return s; });
};

// ---------------------------------------------------------------- E01 fixtures
const WATERFALLS: Record<string, { label: string; spec: CostWaterfallSpec }> = {
  hvac: { label: "Installation quote", spec: {
    id: "install-quote", title: "What goes into an installation quote", subtitle: "Equipment, labor and permits, minus incentives", unit: { currency: "USD", basis: "nominal" },
    steps: [
      { id: "equipment", label: "Outdoor unit + air handler", amount: 7850.4 },
      { id: "labor", label: "Installation labor", amount: 4200 },
      { id: "electrical", label: "Electrical panel work", amount: 1150.35 },
      { id: "permit", label: "Permit and inspection", amount: null, note: "varies by jurisdiction; not in the quote" },
      { id: "before", label: "Before incentives", kind: "subtotal" },
      { id: "rebate", label: "Utility rebate", amount: -1500 },
      { id: "credit", label: "Tax credit", amount: -2000 },
      { id: "disposal", label: "Old unit disposal", amount: 0 },
    ], displayStep: 10, provenance: ILLUSTRATIVE, reveal: { stepFrames: 16, gapFrames: 6 } } },
  roof: { label: "Roof estimate", spec: {
    id: "roof-estimate", title: "Roof replacement estimate", subtitle: "Tear-off to final cleanup for a 2,000 ft² roof", unit: { currency: "USD", basis: "nominal" },
    steps: [
      { id: "tearoff", label: "Tear-off and disposal", amount: 2400 },
      { id: "decking", label: "Decking repairs", amount: 950 },
      { id: "underlayment", label: "Underlayment + ice shield", amount: 1600 },
      { id: "shingles", label: "Architectural shingles", amount: 6800 },
      { id: "flashing", label: "Flashing and vents", amount: 1150 },
      { id: "labor", label: "Installation labor", amount: 5900 },
      { id: "materials", label: "Contract total", kind: "subtotal", stated: 18800 },
      { id: "discount", label: "Off-season discount", amount: -900 },
    ], total: { label: "Due at completion" }, displayStep: 50, provenance: ILLUSTRATIVE } },
  premium: { label: "Premium change", spec: {
    id: "premium", title: "Why this year's premium changed", unit: { currency: "EUR", basis: "nominal" }, start: { label: "Last year", amount: 1840 },
    steps: [
      { id: "rebuild", label: "Rebuild cost index", amount: 210.5 },
      { id: "claims", label: "Regional claims trend", amount: 96 },
      { id: "alarm", label: "Monitored alarm discount", amount: -74.25 },
      { id: "bundle", label: "Bundle discount", amount: -120 },
    ], total: { label: "This year", stated: 1950 }, baseline: "fit", provenance: ILLUSTRATIVE } },
  credit: { label: "Net credit (negative)", spec: {
    id: "net-credit", title: "When incentives exceed the cost", subtitle: "A negative total is drawn below zero, not clipped", unit: { currency: "USD", basis: "nominal" },
    steps: [{ id: "audit", label: "Energy audit", amount: 450 }, { id: "sealing", label: "Air sealing", amount: 1200 }, { id: "rebate", label: "Program rebate", amount: -1400 }, { id: "credit", label: "Tax credit", amount: -600 }],
    total: { label: "Net to homeowner" }, provenance: ILLUSTRATIVE } },
};

// ---------------------------------------------------------------- E02 fixtures
const Y30 = range(30);
const LIFECYCLES: Record<string, { label: string; spec: LifecycleCostTimelineSpec }> = {
  ownership: { label: "30-year ownership", spec: {
    id: "ownership", title: "Thirty years of owning a home", subtitle: "Recurring costs, one-off replacements and the running total", unit: { currency: "USD", basis: "nominal" },
    axis: { unit: "year", start: 2026, count: 30, title: "Year" },
    categories: [
      { id: "interest", label: "Mortgage interest", cadence: "per-year", values: Y30.map(i => Math.round(19800 * (1 - i / 30) ** 1.15)) },
      { id: "tax", label: "Property tax", cadence: "per-year", values: Y30.map(i => Math.round(4200 * 1.025 ** i)) },
      { id: "insurance", label: "Insurance", cadence: "per-year", values: Y30.map(i => (i === 8 || i === 9 ? null : Math.round(1900 * 1.04 ** i))) },
      { id: "maintenance", label: "Maintenance", cadence: "per-year", values: Y30.map(i => 2600 + (i === 18 ? 9500 : 0)) },
      { id: "credit", label: "Energy credit", cadence: "per-year", values: Y30.map(i => (i === 1 ? -2400 : 0)) },
    ],
    events: [
      { id: "water-heater", label: "Water heater", at: 2037, amount: 1900 },
      { id: "hvac", label: "HVAC replacement", at: 2044, amount: 9500, includedIn: "maintenance" },
      { id: "roof", label: "Roof replacement", at: 2046, amount: 16500 },
    ], provenance: ILLUSTRATIVE, reveal: { framesPerPeriod: 5 } } },
  pool: { label: "Pool, 12 years", spec: {
    id: "pool", title: "What a pool costs to keep", subtitle: "Chemicals, energy and service, with equipment replacements", unit: { currency: "USD", basis: "real", basisReference: "2026 dollars" },
    axis: { unit: "year", start: 1, count: 12, labels: "relative", title: "Year of ownership" },
    categories: [
      { id: "energy", label: "Pump + heater energy", cadence: "per-year", values: range(12).map(() => 1150) },
      { id: "chemicals", label: "Chemicals", cadence: "per-year", values: range(12).map(() => 620) },
      { id: "service", label: "Opening, closing, service", cadence: "per-year", values: range(12).map(i => (i === 0 ? 0 : 900)) },
      { id: "insurance", label: "Added insurance", cadence: "per-year", values: range(12).map(() => 240) },
    ],
    events: [{ id: "pump", label: "Pump", at: 7, amount: 1300 }, { id: "liner", label: "Liner", at: 9, amount: 4800 }, { id: "heater", label: "Heater", at: 10, amount: 3200 }],
    focus: "energy", provenance: ILLUSTRATIVE, reveal: { framesPerPeriod: 10 } } },
  equipment: { label: "Equipment TCO (non-home)", spec: {
    id: "compressor-tco", title: "Industrial compressor: total cost of ownership", subtitle: "Same component, different subject: purchase, energy, service and overhauls", unit: { currency: "EUR", basis: "present-value", basisReference: "discounted by the supplier" },
    axis: { unit: "year", start: 0, count: 15, labels: "relative", title: "Years in service" },
    categories: [
      { id: "purchase", label: "Purchase + install", cadence: "per-year", values: range(15).map(i => (i === 0 ? 48000 : 0)) },
      { id: "energy", label: "Electricity", cadence: "per-year", values: range(15).map(i => Math.round(21000 / 1.04 ** i)) },
      { id: "service", label: "Service contract", cadence: "per-year", values: range(15).map(i => (i === 0 ? 0 : Math.round(3600 / 1.04 ** i))) },
      { id: "resale", label: "Resale value", cadence: "per-year", values: range(15).map(i => (i === 14 ? -6500 : 0)) },
    ],
    events: [{ id: "overhaul-1", label: "Overhaul", at: 5, amount: 9000 }, { id: "overhaul-2", label: "Overhaul", at: 10, amount: 9000 }],
    provenance: ILLUSTRATIVE, reveal: { framesPerPeriod: 8 } } },
  mixed: { label: "Mixed cadence (rejected)", spec: {
    id: "mixed", title: "Monthly and yearly values are never mixed", subtitle: "The HOA series is per-month on a yearly axis, so it is omitted with a diagnostic", unit: { currency: "USD", basis: "nominal" },
    axis: { unit: "year", start: 2026, count: 10 },
    categories: [
      { id: "tax", label: "Property tax", cadence: "per-year", values: range(10).map(i => Math.round(3800 * 1.03 ** i)) },
      { id: "hoa", label: "HOA dues", cadence: "per-month", values: range(10).map(() => 310) },
      { id: "repairs", label: "Repairs (real $)", cadence: "per-year", basis: "real", values: range(10).map(() => 1500) },
    ], provenance: ILLUSTRATIVE } },
};

// ---------------------------------------------------------------- E03 fixtures
const N21 = 21;
const YEARS0 = { unit: "year" as const, start: 0, count: N21, labels: "relative" as const, title: "Years after installation" };
const furnace = { id: "furnace", label: "Gas furnace + AC", values: cumulative(9500, 1900, N21, { 15: 6200 }), jumps: [{ at: 15, label: "AC replacement" }] };
const heatPump = { id: "heat-pump", label: "Heat pump", values: cumulative(16000, 1150, N21) };
const BREAKEVENS: Record<string, { label: string; spec: BreakEvenSpec }> = {
  heating: { label: "Heat pump vs furnace", spec: {
    id: "heating", title: "Heat pump vs furnace: cumulative cost", subtitle: "Upfront price plus yearly energy and service", unit: { currency: "USD", basis: "real", basisReference: "2026 dollars" },
    axis: YEARS0, semantics: "cumulative-cost", baseline: "furnace", options: [furnace, heatPump], payback: { label: "Payback", rule: "sustained" },
    assumptions: ["energy prices flat in real terms", "same comfort and capacity"], provenance: ILLUSTRATIVE, reveal: { framesPerPeriod: 9 } } },
  solar: { label: "Solar savings + range", spec: {
    id: "solar", title: "Rooftop solar: cumulative net savings", subtitle: "Net of the upfront price; the band is the supplied low–high production range", unit: { currency: "USD", basis: "nominal" },
    axis: { ...YEARS0, title: "Years since installation" }, semantics: "cumulative-savings", baseline: "none",
    options: [{ id: "none", label: "No panels", values: Array(N21).fill(0) },
      { id: "pv", label: "Solar", values: cumulative(-18500, 1650, N21, { 1: 5550 }), jumps: [{ at: 1, label: "tax credit" }], low: cumulative(-18500, 1200, N21, { 1: 5550 }), high: cumulative(-18500, 2100, N21, { 1: 5550 }) }],
    payback: { label: "Simple payback", rule: "sustained" }, assumptions: ["net metering unchanged over the horizon"], provenance: ILLUSTRATIVE, reveal: { framesPerPeriod: 9 } } },
  crossback: { label: "Crosses back (replacement)", spec: {
    id: "crossback", title: "A replacement can undo a crossover", subtitle: "The first crossover is labeled, and flagged as not permanent", unit: { currency: "USD", basis: "real", basisReference: "2026 dollars" },
    axis: YEARS0, semantics: "cumulative-cost", baseline: "furnace",
    options: [{ ...furnace, values: cumulative(9500, 1600, N21), jumps: [] }, { ...heatPump, values: cumulative(14000, 1050, N21, { 11: 7000 }), jumps: [{ at: 11, label: "compressor replacement" }] }],
    payback: { label: "Payback", rule: "first" }, provenance: ILLUSTRATIVE } },
  migration: { label: "Software migration (non-home)", spec: {
    id: "migration", title: "Platform migration: cumulative cost", subtitle: "Same component, different subject; missing quarters are bracketed, not guessed", unit: { currency: "USD", basis: "nominal" },
    axis: { unit: "month", start: 0, count: 25, labels: "relative", title: "Months from decision" }, semantics: "cumulative-cost", baseline: "stay",
    options: [{ id: "stay", label: "Stay on current stack", values: range(25).map(i => 42000 * i) },
      { id: "migrate", label: "Migrate", values: range(25).map(i => (i >= 9 && i <= 12 ? null : 260000 + 21000 * i)) }],
    tolerance: 5000, provenance: ILLUSTRATIVE, reveal: { framesPerPeriod: 6 } } },
  none: { label: "No crossover", spec: {
    id: "no-cross", title: "No crossover within the horizon", unit: { currency: "USD", basis: "real", basisReference: "2026 dollars" },
    axis: YEARS0, semantics: "cumulative-cost", baseline: "furnace", options: [furnace, { ...heatPump, values: cumulative(24000, 1700, N21) }],
    payback: { label: "Payback", rule: "sustained" }, provenance: ILLUSTRATIVE } },
  tie: { label: "Near-equal stretch", spec: {
    id: "tie", title: "Near-equal for several years", subtitle: "Differences within ±$300 count as equal; the crossing is located within that stretch", unit: { currency: "USD", basis: "real", basisReference: "2026 dollars" },
    axis: YEARS0, semantics: "cumulative-cost", baseline: "furnace", tolerance: 300,
    options: [{ ...furnace, values: cumulative(9500, 1500, N21), jumps: [] }, { ...heatPump, values: cumulative(9500, 1500, N21).map((v, i) => v + (i < 6 ? 2000 - i * 400 : i < 12 ? 150 * Math.sin(i) : -(i - 11) * 350)) }],
    provenance: ILLUSTRATIVE } },
};

// ---------------------------------------------------------------- E05 fixtures
const kwhActual = range(20).map(i => (i <= 9 ? +(0.12 + i * 0.004 + (i % 3) * 0.003).toFixed(3) : null));
const kwh = (g: number) => range(20).map(i => (i < 9 ? null : +(0.153 * (1 + g) ** (i - 9)).toFixed(4)));
const SCENARIOS: Record<string, { label: string; spec: ScenarioBandSpec }> = {
  electricity: { label: "Electricity price", spec: {
    id: "electricity", title: "Electricity price scenarios", subtitle: "Ten years of actual prices, then three supplied scenarios", unit: { currency: "USD", basis: "nominal", minorDigits: 3 },
    valueLabel: "Price per kWh", zero: false, axis: { unit: "year", start: 2016, count: 20 }, actual: { values: kwhActual }, band: { meaning: "range" },
    scenarios: [
      { id: "low", label: "Low growth", role: "low", values: kwh(0.005), assumption: "wholesale declines offset grid costs" },
      { id: "base", label: "Reference", role: "base", values: kwh(0.025), assumption: "utility rate-filing trend" },
      { id: "high", label: "High growth", role: "high", values: kwh(0.055), assumption: "a fuel price shock persists" },
    ], provenance: ILLUSTRATIVE, reveal: { framesPerPeriod: 8 } } },
  insurance: { label: "Insurance renewal (interval)", spec: {
    id: "insurance", title: "Home insurance renewal outlook", subtitle: "An 80% interval from the source's model, plus a what-if alternative", unit: { currency: "USD", basis: "nominal" }, valueLabel: "Annual premium",
    axis: { unit: "year", start: 2026, count: 8 }, band: { meaning: "interval", level: 0.8, method: "insurer's rate model, 80% of simulated renewals" },
    scenarios: [
      { id: "p10", label: "P10", role: "low", values: range(8).map(i => Math.round(2100 * 1.03 ** i)) },
      { id: "median", label: "Median", role: "base", values: range(8).map(i => Math.round(2100 * 1.07 ** i)) },
      { id: "p90", label: "P90", role: "high", values: range(8).map(i => Math.round(2100 * 1.13 ** i)) },
      { id: "roof", label: "If the roof is replaced", role: "alternative", values: range(8).map(i => (i < 2 ? null : Math.round(2100 * 1.07 ** i * 0.88))), assumption: "a supplied 12% roof-age credit from year 3" },
    ], provenance: ILLUSTRATIVE, reveal: { framesPerPeriod: 14 } } },
  maintenance: { label: "Maintenance exposure", spec: {
    id: "maintenance", title: "Yearly maintenance exposure", subtitle: "A bounded range for an older house; no projection where the source has none", unit: { currency: "EUR", basis: "real", basisReference: "2026 euros" },
    axis: { unit: "year", start: 1, count: 15, labels: "relative", title: "Year of ownership" }, band: { meaning: "range" },
    scenarios: [
      { id: "low", label: "Well maintained", role: "low", values: range(15).map(i => (i === 11 ? null : 1200 + i * 40)) },
      { id: "base", label: "Typical", role: "base", values: range(15).map(i => (i === 11 ? null : 2100 + i * 90)) },
      { id: "high", label: "Deferred repairs", role: "high", values: range(15).map(i => (i === 11 ? null : 3200 + i * 260)), assumption: "roof and HVAC work falls inside the horizon" },
    ], provenance: ILLUSTRATIVE, reveal: { framesPerPeriod: 8 } } },
  broken: { label: "Bad data (reported)", spec: {
    id: "broken", title: "Broken scenario data is reported, not repaired", unit: { currency: "USD", basis: "real" }, axis: { unit: "year", start: 1, count: 10, labels: "relative" },
    band: { meaning: "interval", level: 1.5, method: "" },
    scenarios: [
      { id: "low", label: "Low", role: "low", values: range(10).map(i => (i === 4 ? null : 1000 + i * 100)) },
      { id: "base", label: "Base", role: "base", values: range(10).map(i => 1100 + i * 120) },
      { id: "high", label: "High", role: "high", values: range(10).map(i => (i === 7 ? 900 : 1300 + i * 150)) },
    ] } },
};

// ---------------------------------------------------------------- shared stage
const STYLES: ArtDirectionId[] = ["minimal-technical", "editorial", "cinematic", "scientific"];
const ASPECTS = { "16:9": [1920, 1080], "9:16": [1080, 1920] } as const;

function ChartStage<S>({ title, intro, fixtures, initial, render }: {
  title: string; intro: ReactNode; fixtures: Record<string, { label: string; spec: S }>; initial: string;
  render: (spec: S, options: EconomicChartOptions) => EconomicChartResult;
}) {
  const [key, setKey] = useState(initial);
  const [aspect, setAspect] = useState<keyof typeof ASPECTS>("16:9");
  const [style, setStyle] = useState<ArtDirectionId>("minimal-technical");
  const spec = fixtures[key].spec;
  const [w, h] = ASPECTS[aspect];
  const duration = useMemo(() => render(spec, { width: w, height: h }).revealEnd + 30, [spec, w, h, render]);
  const player = useFramePlayer(Math.max(2, duration), { autoplay: false });
  const [scrub, setScrub] = useState(false);
  const frame = scrub || player.playing ? player.frame : undefined;
  const chart = useMemo(() => render(spec, { width: w, height: h, style, frame }), [spec, w, h, style, frame, render]);
  const errors = chart.diagnostics.filter(d => d.severity === "error"), layout = chart.diagnostics.filter(d => /^text-/.test(d.code));
  return <Page kicker="House Math · Economic charts" title={title} intro={intro}>
    <Row label="Example">{Object.entries(fixtures).map(([k, v]) => <Button key={k} active={key === k} onClick={() => { setKey(k); setScrub(false); player.pause(); }}>{v.label}</Button>)}</Row>
    <Row label="Output">
      {(Object.keys(ASPECTS) as (keyof typeof ASPECTS)[]).map(a => <Button key={a} small active={aspect === a} onClick={() => setAspect(a)}>{a}</Button>)}
      {STYLES.map(s => <Button key={s} small active={style === s} onClick={() => setStyle(s)}>{s}</Button>)}
    </Row>
    <Row label="Reveal">
      <Button small onClick={() => { setScrub(true); player.restart(); }}>Play reveal</Button>
      <Button small active={!scrub && !player.playing} onClick={() => { player.pause(); setScrub(false); }}>Final</Button>
      <div style={{ minWidth: 320, flex: 1 }}><Slider label="Frame" value={player.frame} min={0} max={Math.max(1, duration - 1)} onChange={f => { setScrub(true); player.seek(f); }} /></div>
    </Row>
    <div style={{ display: "grid", gridTemplateColumns: aspect === "16:9" ? "minmax(0, 1fr)" : "minmax(0, 460px) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
      <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${ink.line}` }} data-km-ready="">
        <EconomicChartView chart={chart} />
      </div>
      <Panel title="Derived output">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip tone={errors.length ? ink.warn : ink.accent}>{errors.length ? `${errors.length} error${errors.length > 1 ? "s" : ""}` : "no errors"}</Chip>
          <Chip tone={layout.length ? ink.warn : ink.accent}>{layout.length ? `${layout.length} layout issue(s)` : "text bounds clear"}</Chip>
          <Chip>{`${chart.primitives.length} primitives`}</Chip><Chip>{`reveal ends at frame ${chart.revealEnd}`}</Chip>
        </div>
        <p style={{ margin: 0, color: ink.sub, fontSize: 13, lineHeight: 1.5 }}><b style={{ color: ink.text }}>Accessible summary:</b> {chart.summary}</p>
        {chart.diagnostics.length ? <ul style={{ margin: 0, paddingLeft: 18, color: ink.sub, fontSize: 12.5, lineHeight: 1.5 }}>
          {chart.diagnostics.map((d, i) => <li key={i}><span style={{ fontFamily: mono, color: d.severity === "error" ? ink.warn : ink.dim }}>{d.code}</span> {d.message}</li>)}
        </ul> : null}
      </Panel>
    </div>
  </Page>;
}

const renderWaterfall = (s: CostWaterfallSpec, o: EconomicChartOptions) => renderCostWaterfall(s, o);
const renderLifecycle = (s: LifecycleCostTimelineSpec, o: EconomicChartOptions) => renderLifecycleCostTimeline(s, o);
const renderBreakEven = (s: BreakEvenSpec, o: EconomicChartOptions) => renderBreakEvenComparison(s, o);
const renderScenarios = (s: ScenarioBandSpec, o: EconomicChartOptions) => renderScenarioBand(s, o);

function EconomicCharts({ chart, example }: { chart: "waterfall" | "lifecycle" | "break-even" | "scenario-band"; example?: string }) {
  if (chart === "scenario-band") return <ChartStage title="ScenarioBand" fixtures={SCENARIOS} initial={example ?? "electricity"} render={renderScenarios}
    intro={<>Supplied low, base and high scenarios with the band's meaning printed. A range between scenarios is not a probability, and an interval must state its level and method. Actual values are drawn apart from projections, gaps stay gaps, and out-of-order scenarios are reported, not repaired.</>} />;
  if (chart === "waterfall") return <ChartStage title="CostWaterfall" fixtures={WATERFALLS} initial={example ?? "hvac"} render={renderWaterfall}
    intro={<>Signed contributions build subtotals and a total. Sums run in integer minor units, so totals reconcile exactly. Unknown items are never zero, stated totals are checked against the parts, rounding is disclosed, and portrait or long labels switch to rows.</>} />;
  if (chart === "lifecycle") return <ChartStage title="LifecycleCostTimeline" fixtures={LIFECYCLES} initial={example ?? "ownership"} render={renderLifecycle}
    intro={<>Precomputed per-period values by category, one-off events aligned to their dates, and the running total. Series with a different cadence or basis are rejected rather than converted. Missing, zero and negative values are drawn distinctly, and events already inside a category (◆) are not counted twice.</>} />;
  return <ChartStage title="BreakEvenComparison" fixtures={BREAKEVENS} initial={example ?? "heating"} render={renderBreakEven}
    intro={<>Cumulative series compared with a baseline. Each crossing is interpolated, placed at a declared jump, located within a near-equal stretch or bracketed inside missing data. Nothing is called payback without an authored definition, and a first crossover that is later undone is flagged.</>} />;
}

const meta = {
  title: "Infographics and charts/Economic Charts", id: "house-math-economic-charts", component: EconomicCharts, parameters: { layout: "fullscreen" },
  argTypes: { chart: { control: "inline-radio", options: ["waterfall", "lifecycle", "break-even", "scenario-band"] } },
} satisfies Meta<typeof EconomicCharts>;
export default meta;
export const CostWaterfall: StoryObj<typeof meta> = { args: { chart: "waterfall" } };
export const LifecycleCostTimeline: StoryObj<typeof meta> = { args: { chart: "lifecycle" } };
export const BreakEvenComparison: StoryObj<typeof meta> = { args: { chart: "break-even" } };
export const ScenarioBand: StoryObj<typeof meta> = { args: { chart: "scenario-band" } };
