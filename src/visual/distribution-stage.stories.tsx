import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DistributionStageView } from "../../registry/visual/distribution-stage-react";
import {
  distributionDuration, layoutDistributionStage, prepareDistributionStage, seededNormalSamples,
} from "../../registry/visual/distribution-stage";
import type { DistributionDiagnostic, DistributionStageSpec } from "../../registry/visual/distribution-stage";
import { createCanvasMeasurer } from "../../registry/media/text-layout";

/* Three unrelated, fictional domains, one component. Every dataset is generated here with a fixed seed and is labelled
 * as fictional or illustrative on screen. No data comes from a real person, product, market or patient. */
const FPS = { num: 30, den: 1 };
const round3 = (v: number) => Math.round(v * 1000) / 1000;

const ML_SCORES = seededNormalSamples({ seed: 7, count: 240, mean: 1.5, sd: 0.9 }).map(z => round3(1 / (1 + Math.exp(-z))));
const ML: DistributionStageSpec = {
  id: "ml-confidence", fps: FPS, title: "How confident is the model in its answers?", badge: "synthetic",
  provenance: "Fictional model FM-A on synthetic prompts. Scores are generated for this demo, not measured.",
  xLabel: "Confidence score (0 to 1)", yAxis: "count", seed: 5,
  source: { kind: "samples", values: ML_SCORES, bins: { count: 10, min: 0, max: 1 } },
  areas: [{ id: "confident", low: 0.9, label: "Score of 0.9 or higher", statement: "of answers score 0.9 or higher" }],
  beats: [
    { id: "axes", kind: "establish", durationFrames: 45 },
    { id: "scores", kind: "reveal", durationFrames: 150 },
    { id: "threshold", kind: "area", areaId: "confident", durationFrames: 120 },
    { id: "hold", kind: "establish", durationFrames: 75 },
  ],
};

const HEALTH_VALUES = seededNormalSamples({ seed: 21, count: 400, mean: 5.4, sd: 0.45, decimals: 2 });
const HEALTH: DistributionStageSpec = {
  id: "education-measurement", fps: FPS, title: "How widely does one measurement vary across a group?", badge: "synthetic",
  provenance: "Synthetic values generated for a lesson on reading distributions. Not patient data; units are illustrative.",
  xLabel: "Measurement (units)", yAxis: "count", seed: 9, unit: "units",
  source: { kind: "samples", values: HEALTH_VALUES, bins: { count: 16, min: 3.6, max: 7.2 } },
  areas: [{ id: "above", low: 6, label: "6 units or more", statement: "of values are 6 units or more" }],
  intervals: [{ id: "mean", estimate: 5.4, low: 5.36, high: 5.44, level: 0.95, label: "stated 95% interval for the group mean" }],
  beats: [
    { id: "axes", kind: "establish", durationFrames: 45 },
    { id: "values", kind: "reveal", durationFrames: 150 },
    { id: "cut", kind: "area", areaId: "above", durationFrames: 90 },
    { id: "stated", kind: "interval", intervalId: "mean", durationFrames: 90 },
    { id: "hold", kind: "establish", durationFrames: 45 },
  ],
};

const FINANCE: DistributionStageSpec = {
  id: "daily-return", fps: FPS, title: "How often does a daily loss exceed 2.5%?", badge: "illustrative",
  provenance: "Fictional asset with illustrative parameters: mean 0%, standard deviation 1.4% a day. Not market data or advice.",
  xLabel: "Daily return (%)", yAxis: "density", unit: "%",
  source: { kind: "normal", mean: 0, sd: 1.4 },
  areas: [{ id: "loss", high: -2.5, label: "Loss worse than 2.5%", statement: "chance of a daily loss worse than 2.5%" }],
  beats: [
    { id: "axes", kind: "establish", durationFrames: 45 },
    { id: "curve", kind: "reveal", durationFrames: 120 },
    { id: "loss", kind: "area", areaId: "loss", durationFrames: 150 },
    { id: "hold", kind: "establish", durationFrames: 75 },
  ],
};

const DOMAINS: Array<{ id: string; label: string; spec: DistributionStageSpec }> = [
  { id: "ml", label: "ML: model confidence", spec: ML },
  { id: "health", label: "Healthcare education: synthetic measurement", spec: HEALTH },
  { id: "finance", label: "Finance: daily return", spec: FINANCE },
];
const OUTPUTS = [{ id: "portrait", width: 1080, height: 1920, max: 300 }, { id: "landscape", width: 1920, height: 1080, max: 560 }];

const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const tone = (d: DistributionDiagnostic) => d.severity === "error" ? "var(--km-text-danger, #b91c1c)" : "var(--km-status-warning, #b45309)";
const button = (active: boolean): CSSProperties => ({ padding: "8px 14px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)",
  border: "1px solid var(--km-rule, #cfd5dd)", background: active ? "var(--km-accent, #2f5f8a)" : "var(--km-surface, #ffffff)", color: active ? "#ffffff" : "inherit" });

function Walkthrough({ startFrame }: { startFrame: number }) {
  const [domain, setDomain] = useState(0);
  const spec = DOMAINS[domain].spec;
  const total = distributionDuration(spec);
  const [frame, setFrame] = useState(startFrame);
  const [playing, setPlaying] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, DistributionDiagnostic[]>>({});
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined; const from = frame >= total - 1 ? 0 : frame;
    const tick = (t: number) => { origin ??= t; const next = from + Math.floor((t - origin) * 30 / 1000);
      if (next >= total) { setFrame(total - 1); setPlaying(false); return; } setFrame(next); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on play/pause
  const all = [...new Map(Object.entries(diagnostics).flatMap(([id, list]) => list.map(d => [`${d.code}|${d.message}`, { ...d, message: `${d.message} (${id})` }] as const))).values()];
  const shown = Math.min(frame, total - 1);
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {DOMAINS.map((d, i) => <button key={d.id} type="button" aria-pressed={i === domain} style={button(i === domain)}
        onClick={() => { setDomain(i); setFrame(0); setPlaying(false); setDiagnostics({}); }}>{d.label}</button>)}
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setPlaying(p => !p)} style={button(false)}>{playing ? "Pause" : "Play"}</button>
      <input aria-label="Seek" type="range" min={0} max={total - 1} value={shown} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {shown}</span>
    </div>
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      {OUTPUTS.map(o => <figure key={o.id} style={{ margin: 0, width: "100%", maxWidth: o.max, display: "grid", gap: 6 }}>
        <DistributionStageView spec={spec} frame={frame} width={o.width} height={o.height} style={{ borderRadius: 12, overflow: "hidden" }}
          onDiagnostics={d => setDiagnostics(prev => ({ ...prev, [o.id]: d }))} />
        <figcaption style={note}>{o.width}×{o.height}</figcaption>
      </figure>)}
    </div>
    {all.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{all.map((d, i) => <li key={i}><strong style={{ color: tone(d) }}>{d.code}</strong> — {d.message}</li>)}</ul>
      : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>No diagnostics: every bin count, probability and interval checks out in both outputs.</p>}
    <p style={note}>Fictional and illustrative data in three domains. Probabilities are labelled by source: counts from samples, or the normal model. DistributionStage checks; it does not decide whether a model or a measurement is valid.</p>
  </section>;
}

/* Specs the stage must refuse, each with the reason it is wrong. */
const BROKEN: Array<{ label: string; spec: DistributionStageSpec }> = [
  { label: "Samples outside the bins: 1.4 is past the last edge", spec: { ...ML, id: "refuse-outside", areas: undefined, beats: [{ id: "a", kind: "establish", durationFrames: 60 }], source: { kind: "samples", values: [0.2, 0.7, 1.4], bins: { edges: [0, 0.5, 1] } } } },
  { label: "Density axis on whole counts", spec: { ...ML, id: "refuse-density-on-counts", areas: undefined, beats: [{ id: "a", kind: "establish", durationFrames: 60 }], yAxis: "density", source: { kind: "bin-counts", edges: [0, 0.5, 1], counts: [3, 5] } } },
  { label: "Count axis on density heights", spec: { ...ML, id: "refuse-count-on-density", areas: undefined, beats: [{ id: "a", kind: "establish", durationFrames: 60 }], yAxis: "count", source: { kind: "bin-density", edges: [0, 0.5, 1], heights: [0.5, 0.5] } } },
  { label: "Density heights that do not integrate to 1", spec: { ...ML, id: "refuse-unnormalized", areas: undefined, beats: [{ id: "a", kind: "establish", durationFrames: 60 }], yAxis: "density", source: { kind: "bin-density", edges: [0, 0.5, 1], heights: [0.5, 0.2] } } },
  { label: "Count axis on a normal curve", spec: { ...FINANCE, id: "refuse-count-on-normal", areas: undefined, beats: [{ id: "a", kind: "establish", durationFrames: 60 }], yAxis: "count" } },
  { label: "Zero-width probability area", spec: { ...ML, id: "refuse-zero-width", areas: [{ id: "none", low: 0.5, high: 0.5 }], beats: [{ id: "a", kind: "area", areaId: "none", durationFrames: 60 }] } },
  { label: "Interval level of 1.2 (must be between 0 and 1)", spec: { ...HEALTH, id: "refuse-level", intervals: [{ id: "mean", estimate: 5.4, low: 5.36, high: 5.44, level: 1.2 }], beats: [{ id: "i", kind: "interval", intervalId: "mean", durationFrames: 60 }] } },
  { label: "Inverted interval: low 5.6, high 5.2", spec: { ...HEALTH, id: "refuse-inverted", intervals: [{ id: "mean", estimate: 5.4, low: 5.6, high: 5.2, level: 0.95 }], beats: [{ id: "i", kind: "interval", intervalId: "mean", durationFrames: 60 }] } },
  { label: "Interval that does not contain its estimate", spec: { ...HEALTH, id: "refuse-estimate", intervals: [{ id: "mean", estimate: 6.1, low: 5.36, high: 5.44, level: 0.95 }], beats: [{ id: "i", kind: "interval", intervalId: "mean", durationFrames: 60 }] } },
];
function Refusals() {
  const rows = useMemo(() => BROKEN.map(item => {
    const prepared = prepareDistributionStage(item.spec);
    return { label: item.label, diagnostics: prepared.diagnostics.filter(d => d.severity === "error") };
  }), []);
  const measure = useMemo(() => createCanvasMeasurer({}), []);
  const validErrors = useMemo(() => [ML, HEALTH, FINANCE].map(s => layoutDistributionStage(s, { width: 1080, height: 1920 }, { measure }).diagnostics.filter(d => d.severity === "error").length), [measure]);
  return <section style={{ padding: 20, display: "grid", gap: 12, font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #1f2937)" }}>
    <p style={note}>Each row is a deliberately wrong spec. The stage refuses it and reports the codes below. The three valid domains report {validErrors.every(n => n === 0) ? "no errors" : "errors"} at 1080×1920.</p>
    {rows.map((r, i) => <div key={i}><strong>{r.label}</strong>
      <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{r.diagnostics.length
        ? r.diagnostics.map((d, j) => <li key={j}><code>{d.code}</code> — {d.message}</li>)
        : <li style={{ color: "var(--km-text-danger, #b91c1c)" }}>Not refused. This is a bug.</li>}</ul></div>)}
  </section>;
}

const meta = { title: "Visual/Distribution Stage", component: Walkthrough, parameters: { layout: "fullscreen" },
  argTypes: { startFrame: { control: { type: "number", min: 0, max: 419 } } }, args: { startFrame: 150 } } satisfies Meta<typeof Walkthrough>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WalkthroughStory: Story = { name: "Walkthrough" };
export const RefusalsStory: Story = { name: "Refusals", render: () => <Refusals /> };
