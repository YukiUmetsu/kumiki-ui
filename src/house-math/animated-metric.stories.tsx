import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { compileAnimatedMetric, evaluateAnimatedMetric } from "../../registry/visual/animated-metric";
import type { AnimatedMetricSpec } from "../../registry/visual/animated-metric";
import { AnimatedMetricView } from "../../registry/visual/animated-metric-react";
import { Button, Chip, Page, Panel, Row, Slider, ink, mono, useFramePlayer } from "./house-ui";

// Illustrative values for the story only.
const METRICS: { spec: AnimatedMetricSpec; good: "up" | "down" | "neutral"; size: "md" | "lg" | "hero"; note: string }[] = [
  { size: "hero", good: "up", note: "Count-up with exact rest values; the rebate step adds a labeled change.", spec: {
    id: "savings", label: "Lifetime energy savings", format: { kind: "currency", currency: "USD" }, delta: "both", countFrames: 50, source: "illustrative",
    keyframes: [{ frame: 10, value: 0 }, { frame: 70, value: 14200 }, { frame: 110, value: 15050.4, label: "with the utility rebate" }] } },
  { size: "lg", good: "down", note: "A unit, a falling value and a green change because lower is better here.", spec: {
    id: "energy", label: "Annual electricity use", format: { kind: "number", unit: "kWh" }, delta: "both", tickStep: 10,
    keyframes: [{ frame: 10, value: 12400, label: "before" }, { frame: 70, value: 7900, label: "after insulation + heat pump" }] } },
  { size: "lg", good: "up", note: "Percent from a fraction (0.961), one decimal throughout.", spec: {
    id: "afue", label: "Furnace efficiency (AFUE)", format: { kind: "percent", precision: 1 }, delta: "absolute",
    keyframes: [{ frame: 20, value: 0.78, label: "20-year-old unit" }, { frame: 80, value: 0.961, label: "condensing replacement" }] } },
  { size: "lg", good: "down", note: "A discrete fact: steps, never counts through 3.4 repairs.", spec: {
    id: "repairs", label: "Roof repair claims", format: { kind: "number" }, mode: "step", delta: "absolute",
    keyframes: [{ frame: 15, value: 1, label: "year 5" }, { frame: 55, value: 3, label: "year 12" }, { frame: 95, value: 5, label: "year 18" }] } },
  { size: "lg", good: "down", note: "The renewal quote is not in yet: unknown, never $0, never counted toward.", spec: {
    id: "quote", label: "Insurance premium", format: { kind: "currency", currency: "USD" }, delta: "absolute",
    keyframes: [{ frame: 10, value: 2140, label: "this year" }, { frame: 70, value: null, label: "renewal quote pending" }], unknownText: "Pending" } },
  { size: "lg", good: "down", note: "Locale formatting and CJK labels: yen without decimals, Japanese separators.", spec: {
    id: "jp", label: "年間の電気代", format: { kind: "currency", currency: "JPY" }, language: "ja-JP", delta: "percent",
    keyframes: [{ frame: 10, value: 184000, label: "断熱改修前" }, { frame: 70, value: 121500, label: "断熱改修後" }] } },
  { size: "md", good: "neutral", note: "Compact notation for a large headline number.", spec: {
    id: "tco", label: "30-year cost of ownership", format: { kind: "currency", currency: "USD", compact: true },
    keyframes: [{ frame: 10, value: 0 }, { frame: 90, value: 675370, label: "known items" }] } },
];

function AnimatedMetrics() {
  const plans = useMemo(() => METRICS.map(m => compileAnimatedMetric(m.spec)), []);
  const duration = 140;
  const player = useFramePlayer(duration, { loop: true, autoplay: true });
  const diagnostics = plans.flatMap(p => p.diagnostics.map(d => ({ ...d, id: p.spec.id })));
  return <Page kicker="House Math · Numbers" title="AnimatedMetric"
    intro={<>Numbers that change on screen without misleading. Values count only between known keyframes, and discrete facts step. Rest values are exact at the declared precision, in-between values are dimmed and flagged, unknown values never become zero, and a width reserve stops the layout from jumping while digits change.</>}>
    <Row label="Playback">
      <Button small active={player.playing} onClick={() => (player.playing ? player.pause() : player.resume())}>{player.playing ? "Pause" : "Play"}</Button>
      <Button small onClick={player.restart}>Restart</Button>
      <div style={{ minWidth: 360, flex: 1 }}><Slider label="Frame" value={player.frame} min={0} max={duration - 1} onChange={player.seek} /></div>
    </Row>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14 }}>
      {METRICS.map((m, i) => {
        const f = evaluateAnimatedMetric(plans[i], player.frame);
        return <Panel key={m.spec.id} style={{ gridColumn: m.size === "hero" ? "1 / -1" : undefined, background: "#f7f8fa", color: "#15181d" }}>
          <AnimatedMetricView plan={plans[i]} frame={player.frame} size={m.size} goodDirection={m.good} colors={{ ink: "#15181d", sub: "#5b6470" }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <Chip tone={f.transitioning ? "#b7791f" : f.status === "unknown" ? "#8a5cf6" : "#0b7a52"}>{f.transitioning ? `counting → ${f.target}` : f.status}</Chip>
            <span style={{ fontSize: 12, color: "#5b6470" }}>{m.note}</span>
          </div>
        </Panel>;
      })}
    </div>
    <Panel title="Narrow column (portrait / 9:16 cards)">
      <div style={{ width: 300, background: "#101418", padding: 16, borderRadius: 10, display: "grid", gap: 14 }}>
        {[0, 1, 5].map(i => <AnimatedMetricView key={i} plan={plans[i]} frame={player.frame} size="md" goodDirection={METRICS[i].good} colors={{ ink: "#eef2f6", sub: "#9aa8b6", positive: "#6fd3a6", negative: "#ff8b7a" }} />)}
      </div>
    </Panel>
    <Panel title="Diagnostics">
      {diagnostics.length ? diagnostics.map((d, i) => <div key={i} style={{ fontSize: 13, color: ink.sub }}><span style={{ fontFamily: mono, color: ink.dim }}>{`${d.id} · ${d.code}`}</span> {d.message}</div>) : <Chip tone={ink.accent}>none</Chip>}
    </Panel>
  </Page>;
}

const meta = { title: "House Math/Animated Metric", component: AnimatedMetrics, parameters: { layout: "fullscreen" } } satisfies Meta<typeof AnimatedMetrics>;
export default meta;
export const Metrics: StoryObj<typeof meta> = {};
