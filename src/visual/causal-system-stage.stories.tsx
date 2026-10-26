import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CausalSystemStageView } from "../../registry/visual/causal-system-stage-react";
import {
  causalSystemDuration, layoutCausalStage, validateCausalSystem,
} from "../../registry/visual/causal-system-stage";
import type { CausalDiagnostic, CausalSystemSpec } from "../../registry/visual/causal-system-stage";
import { createCanvasMeasurer } from "../../registry/media/text-layout";

/* Three unrelated, fictional and simplified models in one component. Every model is labelled as such on screen.
 * No numbers are shown: links carry signs and evidence kinds, and interventions carry directions only. The climate
 * mechanisms cite a public review (IPCC AR6 WG1 2021, ch. 7) for the direction of each feedback; the economic and
 * engineering relations are assumed or fictional and are labelled that way. */
const FPS = { num: 30, den: 1 };
const CLIMATE_SOURCE = "IPCC AR6 WG1 (2021), ch. 7, climate feedbacks";

const CLIMATE: CausalSystemSpec = {
  id: "climate-loop", title: "How ice loss feeds back on warming", eyebrow: "Feedback loop · warming, ice and albedo",
  modelNote: "Simplified model · no measured values", fps: FPS,
  notes: "Mechanism directions: IPCC AR6 WG1 (2021), ch. 7, climate feedbacks (qualitative). Storm counts: fictional sample FS-17, not measured data.",
  nodes: [
    { id: "warming", label: "Global warming" }, { id: "ice", label: "Sea-ice cover" }, { id: "albedo", label: "Surface albedo" },
    { id: "emitted", label: "Heat radiated" }, { id: "imbalance", label: "Energy imbalance" }, { id: "storms", label: "Storms" },
  ],
  links: [
    { id: "c1", from: "warming", to: "ice", sign: "-", evidence: "mechanism", source: CLIMATE_SOURCE },
    { id: "c2", from: "ice", to: "albedo", sign: "+", evidence: "mechanism", source: CLIMATE_SOURCE },
    { id: "c3", from: "albedo", to: "imbalance", sign: "-", evidence: "mechanism", source: CLIMATE_SOURCE },
    { id: "c4", from: "imbalance", to: "warming", sign: "+", evidence: "mechanism", source: CLIMATE_SOURCE },
    { id: "c5", from: "warming", to: "emitted", sign: "+", evidence: "mechanism", source: CLIMATE_SOURCE },
    { id: "c6", from: "emitted", to: "imbalance", sign: "-", evidence: "mechanism", source: CLIMATE_SOURCE },
    { id: "c7", from: "warming", to: "storms", sign: "+", evidence: "observational", source: "Fictional sample FS-17 (not measured data)" },
  ],
  beats: [
    { id: "establish", kind: "establish", headline: "Six variables, one sample",
      caption: "Links appear only when the model states them.", durationFrames: 60 },
    { id: "reveal-mechanisms", kind: "reveal", linkIds: ["c1", "c2", "c3", "c4", "c5", "c6"], headline: "Six mechanism links",
      caption: "Warming, ice, albedo, absorbed sunlight, radiated heat and the energy balance.", durationFrames: 90 },
    { id: "reveal-association", kind: "reveal", linkIds: ["c7"], headline: "Storms move with warming",
      caption: "Storms rise with warming here: association, so the line is dashed.", durationFrames: 60 },
    { id: "causal", kind: "causal", linkIds: ["c1", "c2"], headline: "Warmer air, less sea ice",
      caption: "Mechanism: warmer conditions reduce sea-ice cover, which exposes darker water.", durationFrames: 75 },
    { id: "loops", kind: "loops", headline: "Two loops, two types",
      caption: "Each loop is reinforcing or balancing, depending on how many of its links reduce.", durationFrames: 120 },
    { id: "held-ice", kind: "intervene", nodeId: "ice", change: "increase", state: "raised",
      headline: "Hold ice higher, warming falls",
      caption: "Under the model: warming falls. Only the direction is claimed.", durationFrames: 120 },
  ],
};

const MARKET: CausalSystemSpec = {
  id: "market-loop", title: "How a price cap raises excess demand", eyebrow: "Market adjustment loop · price and quantities",
  modelNote: "Fictional model · every link assumed", fps: FPS,
  notes: "Every direction is assumed by the stated model. No measured values are shown, and none is drawn as causation.",
  nodes: [
    { id: "price", label: "Price" }, { id: "demanded", label: "Quantity demanded" },
    { id: "supplied", label: "Quantity supplied" }, { id: "excess", label: "Excess demand" },
  ],
  links: [
    { id: "m1", from: "price", to: "supplied", sign: "+", evidence: "assumed" },
    { id: "m2", from: "price", to: "demanded", sign: "-", evidence: "assumed" },
    { id: "m3", from: "demanded", to: "excess", sign: "+", evidence: "assumed" },
    { id: "m4", from: "supplied", to: "excess", sign: "-", evidence: "assumed" },
    { id: "m5", from: "excess", to: "price", sign: "+", evidence: "assumed" },
  ],
  beats: [
    { id: "establish", kind: "establish", headline: "Price and the gap it closes",
      caption: "Price, the two quantities, and the gap between them.", durationFrames: 60 },
    { id: "reveal", kind: "reveal", linkIds: ["m1", "m2", "m3", "m4", "m5"], headline: "Every direction is assumed",
      caption: "The model assumes these directions. None is measured, so none is drawn as causation.", durationFrames: 120 },
    { id: "loops", kind: "loops", headline: "Both loops balance",
      caption: "Excess demand pushes price back toward the level where quantities match.", durationFrames: 150 },
    { id: "cap", kind: "intervene", nodeId: "price", change: "decrease", state: "capped",
      headline: "A cap raises excess demand",
      caption: "A price cap below the market level. Under the model, excess demand rises.", durationFrames: 180 },
  ],
};

/* Five nodes, one balancing loop. The experiment is labelled as a bench test, not as a field result. */
const COOLING: CausalSystemSpec = {
  id: "cooling-system", title: "How fan speed changes chip temperature", eyebrow: "Control loop · fan and chip",
  modelNote: "Fictional, simplified model", fps: FPS,
  notes: "Fictional spec FS-100, controller rule CR-2 and bench test BT-2. Not a measured system.",
  nodes: [
    { id: "fan", label: "Fan speed" }, { id: "noise", label: "Fan noise" }, { id: "chip", label: "Chip temp" },
  ],
  links: [
    { id: "g1", from: "fan", to: "chip", sign: "-", evidence: "mechanism", source: "Fictional spec FS-100" },
    { id: "g4", from: "fan", to: "noise", sign: "+", evidence: "experiment", source: "Fictional bench test BT-2" },
    { id: "g5", from: "chip", to: "fan", sign: "+", evidence: "mechanism", source: "Fictional controller rule CR-2" },
  ],
  beats: [
    { id: "establish", kind: "establish", headline: "Fan and chip",
      caption: "A fan cools the chip, and the controller speeds the fan as the chip warms.", durationFrames: 60 },
    { id: "reveal", kind: "reveal", linkIds: ["g1", "g5"], headline: "Mechanisms in place",
      caption: "Faster fan, cooler chip. A warmer chip makes the controller speed the fan.", durationFrames: 120 },
    { id: "reveal-noise", kind: "reveal", linkIds: ["g4"], headline: "A bench test adds noise",
      caption: "The bench test links fan speed to noise.", durationFrames: 45 },
    { id: "causal", kind: "causal", linkIds: ["g4"], headline: "Louder, in the bench test",
      caption: "Experiment: a faster fan was louder in the bench test. The claim rests on that test alone.", durationFrames: 75 },
    { id: "loops", kind: "loops", headline: "One balancing loop",
      caption: "The controller spins the fan up as the chip warms, which cools it again.", durationFrames: 120 },
    { id: "fan-high", kind: "intervene", nodeId: "fan", change: "increase", state: "high",
      headline: "Fan high cools the chip",
      caption: "Under the model: the chip cools.", durationFrames: 150 },
    { id: "counterfactual-low", kind: "counterfactual", nodeId: "fan", change: "decrease", state: "low",
      headline: "Fan low leaves the chip warm",
      caption: "Held low, the fan leaves the chip warmer.", durationFrames: 150 },
  ],
};

const DOMAINS: Array<{ id: string; label: string; spec: CausalSystemSpec }> = [
  { id: "climate", label: "Climate: warming loop", spec: CLIMATE },
  { id: "market", label: "Economics: price cap", spec: MARKET },
  { id: "cooling", label: "Engineering: fan speed", spec: COOLING },
];

const OUTPUTS = [{ id: "portrait", width: 1080, height: 1920, max: 300 }, { id: "landscape", width: 1920, height: 1080, max: 560 }];
const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const tone = (d: CausalDiagnostic) => d.severity === "error" ? "var(--km-text-danger, #b91c1c)" : "var(--km-status-warning, #b45309)";
const button = (active: boolean): CSSProperties => ({ padding: "8px 14px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)",
  border: "1px solid var(--km-rule, #cfd5dd)", background: active ? "var(--km-accent, #2f5f8a)" : "var(--km-surface, #ffffff)", color: active ? "#ffffff" : "inherit" });

function Walkthrough({ startDomain }: { startDomain: number }) {
  const [domain, setDomain] = useState(startDomain);
  const spec = DOMAINS[domain].spec;
  const total = causalSystemDuration(spec);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, CausalDiagnostic[]>>({});
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined; const from = frame >= total - 1 ? 0 : frame;
    const tick = (t: number) => { origin ??= t; const next = from + Math.floor((t - origin) * 30 / 1000);
      if (next >= total) { setFrame(total - 1); setPlaying(false); return; } setFrame(next); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on play/pause
  const all = [...new Map(Object.entries(diagnostics).flatMap(([id, list]) => list.map(d => [`${d.code}|${d.message}`, { ...d, message: `${d.message} (${id})` }] as const))).values()];
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {DOMAINS.map((d, i) => <button key={d.id} type="button" aria-pressed={i === domain} style={button(i === domain)}
        onClick={() => { setDomain(i); setFrame(0); setPlaying(false); }}>{d.label}</button>)}
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setPlaying(p => !p)} style={button(false)}>{playing ? "Pause" : "Play"}</button>
      <input aria-label="Seek" type="range" min={0} max={total - 1} value={Math.min(frame, total - 1)} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {Math.min(frame, total - 1)}</span>
    </div>
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      {OUTPUTS.map(o => <figure key={`${domain}-${o.id}`} style={{ margin: 0, width: "100%", maxWidth: o.max, display: "grid", gap: 6 }}>
        <CausalSystemStageView spec={spec} frame={frame} width={o.width} height={o.height} style={{ borderRadius: 12, overflow: "hidden" }}
          onDiagnostics={d => setDiagnostics(prev => ({ ...prev, [o.id]: d }))} />
        <figcaption style={note}>{o.width}×{o.height}</figcaption>
      </figure>)}
    </div>
    {all.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{all.map((d, i) => <li key={i}><strong style={{ color: tone(d) }}>{d.code}</strong> — {d.message}</li>)}</ul>
      : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>No diagnostics: every link, label and caption fits, and every intervention names a real node.</p>}
    <p style={note}>Fictional, simplified models in three domains. Dashed lines are association; solid arrows are mechanism or experiment; dotted arrows are assumed. Directions follow signs only. Nothing here is a forecast or a measured magnitude.</p>
  </section>;
}

/* Deliberately broken or risky models, each with the diagnostic it must raise. */
const CLIMATE_LOOP_BEATS = CLIMATE.beats.slice(0, 4);
const CHAIN: CausalSystemSpec = {
  id: "chain", title: "A chain of fourteen steps", eyebrow: "Refusal · layer limit", modelNote: "Fictional", fps: FPS,
  nodes: Array.from({ length: 14 }, (_, i) => ({ id: `s${i}`, label: `Step ${i + 1}` })),
  links: Array.from({ length: 13 }, (_, i) => ({ id: `k${i}`, from: `s${i}`, to: `s${i + 1}`, sign: "+" as const, evidence: "mechanism" as const, source: "Fictional" })),
  beats: [{ id: "all", kind: "establish", caption: "Fourteen steps in a row.", durationFrames: 30 }],
};
const SPLIT: CausalSystemSpec = {
  id: "split", title: "Two paths that disagree", eyebrow: "Refusal · conflicting paths", modelNote: "Fictional", fps: FPS,
  nodes: [{ id: "fan", label: "Fan speed" }, { id: "airflow", label: "Airflow" }, { id: "power", label: "Power draw" }, { id: "chip", label: "Chip temp" }],
  links: [
    { id: "p1", from: "fan", to: "airflow", sign: "+", evidence: "mechanism", source: "Fictional" },
    { id: "p2", from: "airflow", to: "chip", sign: "-", evidence: "mechanism", source: "Fictional" },
    { id: "p3", from: "fan", to: "power", sign: "+", evidence: "mechanism", source: "Fictional" },
    { id: "p4", from: "power", to: "chip", sign: "+", evidence: "mechanism", source: "Fictional" },
  ],
  beats: [{ id: "fan-up", kind: "intervene", nodeId: "fan", change: "increase", state: "fixed high", caption: "Fan fixed high; the chip direction is ambiguous.", durationFrames: 90 }],
};
const BROKEN: Array<{ label: string; expect: string; spec: CausalSystemSpec }> = [
  { label: "Observational link drawn as a causal arrow", expect: "link-observational-arrow",
    spec: { ...CLIMATE, links: CLIMATE.links.map(l => (l.id === "c7" ? { ...l, presentation: "arrow" as const } : l)) } },
  { label: "Causal claim over observational evidence", expect: "causal-claim-unsupported",
    spec: { ...CLIMATE, beats: [...CLIMATE_LOOP_BEATS, { id: "storms-cause", kind: "causal", linkIds: ["c7"],
      caption: "Warming causes more storms.", durationFrames: 60 }] } },
  { label: "Causal claim over assumed evidence", expect: "causal-claim-unsupported",
    spec: { ...MARKET, beats: [MARKET.beats[0], MARKET.beats[1], { id: "excess-cause", kind: "causal", linkIds: ["m5"],
      caption: "Excess demand causes higher prices.", durationFrames: 60 }] } },
  { label: "Intervention on an unknown node", expect: "intervention-node-unknown",
    spec: { ...MARKET, beats: [MARKET.beats[0], { id: "wages", kind: "intervene", nodeId: "wages", change: "increase", state: "fixed high",
      caption: "Fixing wages high.", durationFrames: 90 }] } },
  { label: "Feedback loop with an unsigned link", expect: "loop-unsigned-link",
    spec: { ...CLIMATE, links: CLIMATE.links.map(l => (l.id === "c3" ? { ...l, sign: undefined } : l)) } },
  { label: "Intervention on a node with no incoming links", expect: "intervention-no-incoming",
    spec: { ...CLIMATE, nodes: [...CLIMATE.nodes, { id: "sun", label: "Solar output" }],
      links: [...CLIMATE.links, { id: "c8", from: "sun", to: "imbalance", sign: "+", evidence: "mechanism", source: CLIMATE_SOURCE }],
      beats: [...CLIMATE.beats, { id: "sun-fixed", kind: "intervene", nodeId: "sun", change: "decrease", state: "fixed low",
        caption: "Fixing solar output low.", durationFrames: 90 }] } },
  { label: "Conflicting paths are flagged as ambiguous", expect: "propagation-ambiguous", spec: SPLIT },
  { label: "Fourteen layers that cannot fit the diagram", expect: "causal-crowded", spec: CHAIN },
];

function Refusals() {
  const rows = useMemo(() => {
    const measure = createCanvasMeasurer({});
    return BROKEN.map(item => {
      const found = [...validateCausalSystem(item.spec),
        ...layoutCausalStage(item.spec, { width: 1080, height: 1920 }, { measure }).diagnostics];
      return { label: item.label, expect: item.expect, diagnostics: found.filter(d => d.severity === "error" || d.severity === "warning") };
    });
  }, []);
  return <section style={{ padding: 20, display: "grid", gap: 12, font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #1f2937)" }}>
    {rows.map((r, i) => {
      const hit = r.diagnostics.find(d => d.code === r.expect);
      return <div key={i}>
        <strong>{r.label}</strong>{" "}
        <span style={{ color: hit ? "var(--km-status-success, #15803d)" : "var(--km-text-danger, #b91c1c)" }}>
          {hit ? `refused as ${hit.severity}` : `not refused (expected ${r.expect})`}
        </span>
        <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{r.diagnostics.map((d, j) => <li key={j}>
          <code>{d.code}</code> ({d.severity}) — {d.message}</li>)}</ul>
      </div>;
    })}
  </section>;
}

const meta = { title: "Explainer scenes/Causal System Stage", id: "visual-causal-system-stage", component: Walkthrough, parameters: { layout: "fullscreen" },
  argTypes: { startDomain: { control: { type: "number", min: 0, max: 2 } } }, args: { startDomain: 0 } } satisfies Meta<typeof Walkthrough>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WalkthroughStory: Story = { name: "Walkthrough" };
export const RefusalsStory: Story = { name: "Refusals", render: () => <Refusals /> };
