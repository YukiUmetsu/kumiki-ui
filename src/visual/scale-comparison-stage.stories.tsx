import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScaleComparisonStageView } from "../../registry/visual/scale-comparison-stage-react";
import {
  layoutScaleComparison, scaleComparisonDuration, validateScaleComparison,
} from "../../registry/visual/scale-comparison-stage";
import type { ScaleComparisonSpec, ScaleDiagnostic } from "../../registry/visual/scale-comparison-stage";
import { createCanvasMeasurer } from "../../registry/media/text-layout";

/* Three unrelated domains, one component. Astronomy values are approximate public figures from the named sources;
 * they are not verified here and must be checked against those sources. Architecture and economics are fictional
 * and marked illustrative on screen. */
const ASTRONOMY: ScaleComparisonSpec = {
  id: "astronomy-radii", title: "How big is the Sun?", fps: { num: 30, den: 1 },
  axisUnit: "km", scale: "linear", marks: "circle",
  footnote: "Approximate values; check them against the named sources before use.",
  items: [
    { id: "earth", label: "Earth", value: 6371, unit: "km", kind: "real", source: "NASA Planetary Fact Sheet (mean radius)" },
    { id: "jupiter", label: "Jupiter", value: 69911, unit: "km", kind: "real", source: "NASA Planetary Fact Sheet (mean radius)" },
    { id: "sun", label: "Sun", value: 695700, unit: "km", kind: "real", source: "IAU 2015 Resolution B3 (nominal radius)" },
  ],
  beats: [
    { id: "scale", kind: "establish", durationFrames: 60, caption: "Three radii, drawn to one scale." },
    { id: "reveal", kind: "reveal", order: "size-ascending", durationFrames: 120, caption: "Earth, then Jupiter, then the Sun." },
    { id: "compare", kind: "compare", a: "sun", b: "earth", sig: 3, durationFrames: 150, caption: "Earths laid across the Sun." },
    { id: "convert", kind: "convert", itemId: "sun", unit: "mi", sig: 4, durationFrames: 150, caption: "The Sun's radius in miles." },
  ],
};

const ARCHITECTURE: ScaleComparisonSpec = {
  id: "fictional-heights", title: "How tall is Harbor Tower?", fps: { num: 30, den: 1 },
  axisUnit: "m", scale: "linear", marks: "bar",
  footnote: "Fictional buildings, for illustration only.",
  items: [
    { id: "mill", label: "Mill House", value: 18, unit: "m", kind: "illustrative" },
    { id: "cedar", label: "Cedar Block", value: 32, unit: "m", kind: "illustrative" },
    { id: "lantern", label: "Lantern Hall", value: 96, unit: "m", kind: "illustrative" },
    { id: "harbor", label: "Harbor Tower", value: 240, unit: "m", kind: "illustrative" },
  ],
  beats: [
    { id: "scale", kind: "establish", durationFrames: 60, caption: "Every column starts at zero." },
    { id: "reveal", kind: "reveal", order: "size-ascending", durationFrames: 120, caption: "Shortest first." },
    { id: "compare", kind: "compare", a: "harbor", b: "mill", sig: 3, durationFrames: 150, caption: "Mill House, stacked to the top." },
    { id: "convert", kind: "convert", itemId: "harbor", unit: "ft", sig: 4, durationFrames: 150, caption: "Harbor Tower in feet." },
  ],
};

const ECONOMICS: ScaleComparisonSpec = {
  id: "fictional-harvest", title: "Grain harvest by region", fps: { num: 30, den: 1 },
  axisUnit: "Mt", scale: "linear", marks: "bar",
  footnote: "Fictional quantities, for illustration only; not economic data.",
  items: [
    { id: "a", label: "Region A", value: 2.4, unit: "Mt", kind: "illustrative" },
    { id: "b", label: "Region B", value: 610, unit: "kt", kind: "illustrative" },
    { id: "c", label: "Region C", value: 180, unit: "kt", kind: "illustrative" },
    { id: "d", label: "Region D", value: 95, unit: "kt", kind: "illustrative" },
  ],
  beats: [
    { id: "scale", kind: "establish", durationFrames: 60, caption: "One tonnage scale for every region." },
    { id: "reveal", kind: "reveal", order: "size-descending", durationFrames: 120, caption: "Largest first." },
    { id: "compare", kind: "compare", a: "a", b: "b", sig: 3, durationFrames: 150, caption: "Region B's harvest, stacked inside Region A's." },
    { id: "convert", kind: "convert", itemId: "a", unit: "t", sig: 4, durationFrames: 150, caption: "Region A in tonnes." },
  ],
};

const DOMAINS: Array<{ id: string; label: string; spec: ScaleComparisonSpec }> = [
  { id: "astronomy", label: "Astronomy", spec: ASTRONOMY },
  { id: "architecture", label: "Architecture (fictional)", spec: ARCHITECTURE },
  { id: "economics", label: "Economics (fictional)", spec: ECONOMICS },
];

const OUTPUTS = [{ id: "portrait", width: 1080, height: 1920, max: 300 }, { id: "landscape", width: 1920, height: 1080, max: 560 }];
const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const tone = (d: ScaleDiagnostic) => d.severity === "error" ? "var(--km-text-danger, #b91c1c)" : "var(--km-status-warning, #b45309)";
const button = (active: boolean): CSSProperties => ({ padding: "8px 14px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)",
  border: "1px solid var(--km-rule, #cfd5dd)", background: active ? "var(--km-accent, #2f5f8a)" : "var(--km-surface, #ffffff)", color: active ? "#ffffff" : "inherit" });

function Walkthrough({ startFrame }: { startFrame: number }) {
  const [domain, setDomain] = useState(0);
  const spec = DOMAINS[domain].spec;
  const total = scaleComparisonDuration(spec);
  const [frame, setFrame] = useState(startFrame);
  const [playing, setPlaying] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, ScaleDiagnostic[]>>({});
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
      {OUTPUTS.map(o => <figure key={o.id} style={{ margin: 0, width: "100%", maxWidth: o.max, display: "grid", gap: 6 }}>
        <ScaleComparisonStageView spec={spec} frame={frame} width={o.width} height={o.height} style={{ borderRadius: 12, overflow: "hidden" }}
          onDiagnostics={d => setDiagnostics(prev => ({ ...prev, [o.id]: d }))} />
        <figcaption style={note}>{o.width}×{o.height}</figcaption>
      </figure>)}
    </div>
    {all.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{all.map((d, i) => <li key={i}><strong style={{ color: tone(d) }}>{d.code}</strong> — {d.message}</li>)}</ul>
      : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>Every label fits and no label overlaps another in both outputs.</p>}
    <p style={note}>Astronomy values are approximate public figures from the named sources; check them against those sources before use, they are not verified here. Architecture and economics are fictional and labelled illustrative on screen.</p>
  </section>;
}

/* Specs the stage must refuse, each with its reason. Each is checked against a real layout at 1080×1920. */
const CROWDED: ScaleComparisonSpec = { ...ASTRONOMY, title: undefined, scale: "log", marks: "dot", items: [
  { id: "a", label: "Alpha reference radius", value: 1_000_000, unit: "km", kind: "illustrative" },
  { id: "b", label: "Beta reference radius", value: 1_010_000, unit: "km", kind: "illustrative" },
  { id: "c", label: "Gamma reference radius", value: 1_020_000, unit: "km", kind: "illustrative" },
], beats: [{ id: "reveal", kind: "reveal", durationFrames: 90 }] };
const BROKEN: Array<{ label: string; spec: ScaleComparisonSpec }> = [
  { label: "A length compared with a time", spec: { ...ARCHITECTURE, items: [...ARCHITECTURE.items,
    { id: "orbit", label: "Orbit period (fictional)", value: 365.25, unit: "d", kind: "illustrative" }],
    beats: [{ id: "reveal", kind: "reveal", durationFrames: 90 }, { id: "compare", kind: "compare", a: "harbor", b: "orbit", durationFrames: 90 }] } },
  { label: "A real value with no source", spec: { ...ASTRONOMY, items: [{ ...ASTRONOMY.items[0], source: "" }, ASTRONOMY.items[1], ASTRONOMY.items[2]] } },
  { label: "Bars on a log scale", spec: { ...ASTRONOMY, scale: "log", marks: "bar" } },
  { label: "Circles on a log scale", spec: { ...ASTRONOMY, scale: "log" } },
  { label: "Two labels that cannot share a lane", spec: CROWDED },
  { label: "A unit not in the catalog", spec: { ...ARCHITECTURE, items: [{ ...ARCHITECTURE.items[0], unit: "furlong" }, ...ARCHITECTURE.items.slice(1)] } },
  { label: "A conversion into a unit of another dimension", spec: { ...ARCHITECTURE, beats: [...ARCHITECTURE.beats.slice(0, 3),
    { id: "convert", kind: "convert", itemId: "harbor", unit: "s", durationFrames: 150 }] } },
  { label: "A compare beat before any reveal", spec: { ...ARCHITECTURE, beats: [{ id: "compare", kind: "compare", a: "harbor", b: "mill", durationFrames: 150 }] } },
];

function Refusals() {
  const rows = useMemo(() => {
    const measure = createCanvasMeasurer({});
    return BROKEN.map(item => {
      const layout = layoutScaleComparison(item.spec, { x: 0, y: 0, width: 1080, height: 1920 }, { measure, maxFontPx: 44, minFontPx: 24 });
      return { label: item.label, diagnostics: validateScaleComparison(item.spec, layout).filter(d => d.severity === "error") };
    });
  }, []);
  return <section style={{ padding: 20, display: "grid", gap: 12, font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #1f2937)" }}>
    {rows.map((r, i) => <div key={i}><strong>{r.label}</strong>
      <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{r.diagnostics.map((d, j) => <li key={j}><code>{d.code}</code> — {d.message}</li>)}</ul></div>)}
  </section>;
}

const meta = { title: "Visual/Scale Comparison Stage", component: Walkthrough, parameters: { layout: "fullscreen" },
  argTypes: { startFrame: { control: { type: "number", min: 0, max: 479 } } }, args: { startFrame: 200 } } satisfies Meta<typeof Walkthrough>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WalkthroughStory: Story = { name: "Walkthrough" };
export const RefusalsStory: Story = { name: "Refusals", render: () => <Refusals /> };
