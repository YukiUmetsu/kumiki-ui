import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChartStoryView } from "../../registry/infographic/chart-story-react";
import { layoutChartStory, validateChartStory } from "../../registry/infographic/chart-story";
import type { ChartStoryDiagnostic, ChartStorySpec } from "../../registry/infographic/chart-story";
import { resolveStyle } from "../../registry/infographic/art-direction";
import type { ChartRecipe, ChartSpec } from "../../registry/infographic/types";

/* Fictional sample data, labelled as such on screen. Every chart mark comes from the existing
 * renderChart; ChartStory adds constant axes, data-addressed emphasis and a checked claim. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const chart = (recipe: ChartRecipe, grouped: number[], ungrouped: number[]): ChartSpec => ({
  recipe, categories: MONTHS, unit: "parcels/h", sourceNote: "Fictional sample data", scale: { kind: "linear", zero: true },
  series: [{ id: "ungrouped", label: "Ungrouped routes", values: ungrouped }, { id: "grouped", label: "Grouped routes", values: grouped }],
});
function story(recipe: ChartRecipe): ChartStorySpec {
  return {
    id: `parcels-${recipe}`, fps: { num: 30, den: 1 }, title: "Parcels per driver-hour", initialScenarioId: "actual",
    scenarios: [
      { id: "actual", label: "Actual, Jan–Jun", note: "fictional sample", spec: chart(recipe, [18, 19, 21, 22, 24, 26], [17, 17, 18, 17, 18, 18]) },
      { id: "what-if", label: "What if every route were grouped", note: "illustrative", spec: chart(recipe, [18, 19, 21, 22, 24, 26], [17, 18, 20, 21, 23, 25]) },
    ],
    beats: [
      { id: "axes", kind: "establish", durationFrames: 45 },
      { id: "ungrouped", kind: "reveal", seriesIds: ["ungrouped"], durationFrames: 60 },
      { id: "grouped", kind: "reveal", seriesIds: ["grouped"], durationFrames: 60 },
      { id: "june", kind: "focus", seriesId: "grouped", index: 5, durationFrames: 75, note: "best month" },
      { id: "growth", kind: "compare", seriesId: "grouped", from: 0, to: 5, measure: "percent-change", durationFrames: 90 },
      { id: "what-if", kind: "scenario", scenarioId: "what-if", durationFrames: 90 },
      { id: "back", kind: "scenario", scenarioId: "actual", durationFrames: 45 },
      { id: "claim", kind: "conclude", durationFrames: 120,
        claim: { text: "Grouped routes delivered 44% more parcels per driver-hour in June than in January.",
          support: { kind: "percent-change", seriesId: "grouped", from: 0, to: 5, value: 44 } } },
    ],
  };
}
const OUTPUTS = [{ id: "portrait", width: 1080, height: 1920, max: 300 }, { id: "landscape", width: 1920, height: 1080, max: 560 }];
const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const tone = (d: ChartStoryDiagnostic) => d.severity === "error" ? "var(--km-text-danger, #b91c1c)" : "var(--km-status-warning, #b45309)";

function Story({ recipe, startFrame }: { recipe: ChartRecipe; startFrame: number }) {
  const spec = useMemo(() => story(recipe), [recipe]);
  const total = spec.beats.reduce((n, b) => n + b.durationFrames, 0);
  const [frame, setFrame] = useState(startFrame);
  const [playing, setPlaying] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, ChartStoryDiagnostic[]>>({});
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
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setPlaying(p => !p)} style={{ padding: "8px 16px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)" }}>{playing ? "Pause" : "Play"}</button>
      <input aria-label="Seek" type="range" min={0} max={total - 1} value={frame} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {frame}</span>
    </div>
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      {OUTPUTS.map(o => <figure key={o.id} style={{ margin: 0, width: "100%", maxWidth: o.max, display: "grid", gap: 6 }}>
        <ChartStoryView spec={spec} frame={frame} width={o.width} height={o.height} style={{ borderRadius: 12, overflow: "hidden" }}
          onDiagnostics={d => setDiagnostics(prev => ({ ...prev, [o.id]: d }))} />
        <figcaption style={note}>{o.width}×{o.height}</figcaption>
      </figure>)}
    </div>
    {all.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{all.map((d, i) => <li key={i}><strong style={{ color: tone(d) }}>{d.code}</strong> — {d.message}</li>)}</ul>
      : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>Constant axes, zero baseline, data identities and the claim all check out in both outputs.</p>}
  </section>;
}

/* Stories ChartStory refuses, each with its reason. */
const BROKEN: ChartStorySpec[] = (() => {
  const base = story("bar");
  return [
    { ...base, id: "truncated", scenarios: base.scenarios.map(s => ({ ...s, spec: { ...s.spec, scale: { kind: "linear", zero: false } } })) },
    { ...base, id: "overclaim", beats: base.beats.map(b => b.kind === "conclude" ? { ...b, claim: { ...b.claim, text: "Up 60%.", support: { ...b.claim.support, value: 60 } } } as typeof b : b) },
    { ...base, id: "missing", scenarios: base.scenarios.map(s => ({ ...s, spec: { ...s.spec, series: s.spec.series.map(x => x.id === "grouped" ? { ...x, values: [0, 19, 21, 22, 24, null] } : x) } })) },
    { ...base, id: "mismatch", scenarios: [base.scenarios[0], { ...base.scenarios[1], spec: { ...base.scenarios[1].spec, unit: "parcels/day", series: base.scenarios[1].spec.series.slice(0, 1) } }] },
  ];
})();
function Refusals() {
  const style = resolveStyle("editorial");
  const results = useMemo(() => BROKEN.map(spec => ({ id: spec.id, diagnostics: validateChartStory(spec, layoutChartStory(spec, { x: 54, y: 230, width: 972, height: 1300 }, style)).filter(d => d.severity === "error") })), [style]);
  return <section style={{ padding: 20, display: "grid", gap: 12, font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #1f2937)" }}>
    {results.map(r => <div key={r.id}><strong>{r.id}</strong>
      <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{r.diagnostics.map((d, i) => <li key={i}><code>{d.code}</code> — {d.message}</li>)}</ul></div>)}
  </section>;
}

const meta = { title: "Infographic/Chart Story", component: Story, parameters: { layout: "fullscreen" },
  argTypes: { recipe: { control: "inline-radio", options: ["line", "bar"] }, startFrame: { control: { type: "number", min: 0, max: 584 } } },
  args: { recipe: "line", startFrame: 300 } } satisfies Meta<typeof Story>;
export default meta;
type StoryT = StoryObj<typeof meta>;
export const ChartStory: StoryT = { name: "Chart story" };
export const RefusalsStory: StoryT = { name: "Refusals", render: () => <Refusals /> };
