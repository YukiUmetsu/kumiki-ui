import { useCallback, useMemo, useState } from "react";
import { Box3 } from "three";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import type { HeroAsset } from "../../registry/craft/hero-asset";
import { createHouse3D } from "../../registry/domains/home-3d";
import { createHomeEquipment3D } from "../../registry/domains/home-equipment-3d";
import { HOUSE_PRESETS, resolveHouseLayout } from "../../registry/domains/home-model";
import { renderBreakEvenComparison } from "../../registry/infographic/break-even-comparison";
import { renderCostWaterfall } from "../../registry/infographic/cost-waterfall";
import type { EconomicChartResult } from "../../registry/infographic/economic";
import { EconomicChartView } from "../../registry/infographic/economic-react";
import { compileInspectThenQuantify, evaluateInspectThenQuantify, projectWithHeroView } from "../../registry/visual/inspect-then-quantify";
import type { InspectThenQuantifySpec } from "../../registry/visual/inspect-then-quantify";
import { Button, Chip, Page, Panel, Row, Slider, ink, mono, useFramePlayer } from "./house-ui";

// Illustrative chart data for the story only.
const ILL = { illustrative: true, source: "story fixture" } as const;
const cum = (up: number, yr: number, n: number, jumps: Record<number, number> = {}) => { let s = up; return Array.from({ length: n }, (_, i) => { if (i) s += yr; s += jumps[i] ?? 0; return s; }); };
const roofChart = (o: { width: number; height: number; frame?: number }) => renderCostWaterfall({ id: "roof-cost", title: "What the new roof costs", unit: { currency: "USD", basis: "nominal" }, provenance: ILL, reveal: { stepFrames: 12, gapFrames: 4 },
  steps: [{ id: "tear", label: "Tear-off", amount: 2400 }, { id: "deck", label: "Decking repairs", amount: 950 }, { id: "under", label: "Underlayment", amount: 1600 }, { id: "shingles", label: "Shingles", amount: 6800 }, { id: "labor", label: "Labor", amount: 5900 }, { id: "disc", label: "Discount", amount: -900 }] }, o);
const hvacChart = (o: { width: number; height: number; frame?: number }) => renderBreakEvenComparison({ id: "hp", title: "Heat pump vs furnace + AC", unit: { currency: "USD", basis: "real", basisReference: "2026 dollars" }, provenance: ILL,
  axis: { unit: "year", start: 0, count: 16, labels: "relative" }, semantics: "cumulative-cost", baseline: "f", view: "lines", reveal: { framesPerPeriod: 5 },
  options: [{ id: "f", label: "Furnace + AC", values: cum(9500, 1900, 16) }, { id: "hp", label: "Heat pump", values: cum(16000, 1150, 16) }], payback: { label: "Payback", rule: "sustained" } }, o);
const heaterChart = (o: { width: number; height: number; frame?: number }) => renderBreakEvenComparison({ id: "wh", title: "Tank vs tankless: cumulative cost", unit: { currency: "USD", basis: "real", basisReference: "2026 dollars" }, provenance: ILL,
  axis: { unit: "year", start: 0, count: 21, labels: "relative" }, semantics: "cumulative-cost", baseline: "tank", view: "lines", reveal: { framesPerPeriod: 4 },
  options: [{ id: "tank", label: "Tank", values: cum(1900, 610, 21, { 12: 2100 }), jumps: [{ at: 12, label: "tank replacement" }] }, { id: "tl", label: "Tankless", values: cum(4300, 470, 21) }], payback: { label: "Payback", rule: "sustained" } }, o);

const HOUSE = { ...HOUSE_PRESETS.cottage, interior: false };
const L = resolveHouseLayout(HOUSE);
const houseBounds = { min: [L.bounds.min[0], 0, L.bounds.min[2]], max: L.bounds.max };
const part = (id: string) => L.parts.find(p => p.id === id)!.bounds;
// Equipment bounds and a part's bounds, measured once from a probe build.
const probe = createHomeEquipment3D({ kind: "tankless-water-heater" });
const valves = new Box3().setFromObject(probe.parts.get("unit.valve-gas")!.parent!);
const heaterBounds = { min: [...probe.bounds.min], max: [...probe.bounds.max] };
const unitBox = new Box3().setFromObject(probe.parts.get("unit")!);
probe.dispose();

type RecipeId = "roof" | "hvac" | "heater";
const RECIPES: Record<RecipeId, { label: string; create: () => HeroAsset; spec: Omit<InspectThenQuantifySpec, "aspect">; chart: (o: { width: number; height: number; frame?: number }) => EconomicChartResult }> = {
  roof: { label: "Roof → replacement cost", create: () => createHouse3D(HOUSE), chart: roofChart,
    spec: { id: "roof", subject: houseBounds, target: { id: "roof", label: "the roof", bounds: part("roof") }, overview: { azimuth: 28, elevation: 16 }, focus: { azimuth: 36, elevation: 26, zoom: 1.12 },
      reveal: { action: "roof-peel", frames: 90 }, annotation: { text: "Shingles, underlayment and decking come off; the rafters stay" }, chart: { title: "What the new roof costs", revealFrames: roofChart({ width: 1200, height: 900 }).revealEnd } } },
  hvac: { label: "Condenser → operating cost", create: () => createHouse3D(HOUSE), chart: hvacChart,
    spec: { id: "hvac", subject: houseBounds, target: { id: "hvac.condenser", label: "the outdoor unit", bounds: part("hvac.condenser") }, overview: { azimuth: 40, elevation: 16 }, focus: { azimuth: 60, elevation: 18 },
      reveal: { action: "condenser-run", frames: 60 }, annotation: { text: "Compressor and condenser coil: where most of the running cost goes" }, chart: { title: "Heat pump vs furnace + AC", revealFrames: hvacChart({ width: 1200, height: 900 }).revealEnd } } },
  heater: { label: "Water heater → lifetime cost", create: () => createHomeEquipment3D({ kind: "tankless-water-heater" }), chart: heaterChart,
    spec: { id: "heater", subject: heaterBounds, target: { id: "unit", label: "the tankless unit", bounds: { min: unitBox.min.toArray(), max: unitBox.max.toArray() } }, overview: { azimuth: 24, elevation: 8 }, focus: { azimuth: 14, elevation: 4, zoom: 2.2 },
      annotation: { text: "Wall-hung, heats on demand: no tank to keep hot", anchor: [0, valves.max.y + .5, .2] }, chart: { title: "Tank vs tankless", revealFrames: heaterChart({ width: 1200, height: 900 }).revealEnd } } },
};

function ITQDemo({ recipe: initial }: { recipe: RecipeId }) {
  const [id, setId] = useState<RecipeId>(initial);
  const [aspect, setAspect] = useState<"16:9" | "9:16">("16:9");
  const r = RECIPES[id];
  const plan = useMemo(() => compileInspectThenQuantify({ ...r.spec, aspect }), [r, aspect]);
  const player = useFramePlayer(plan.durationFrames + 30, { loop: true, autoplay: true });
  const f = evaluateInspectThenQuantify(plan, player.frame);
  const [W, H] = aspect === "16:9" ? [1600, 900] : [900, 1600];
  const create = useCallback(() => r.create(), [r]);
  const cw = Math.round(f.chart.width * W * 1.15), ch = Math.round(f.chart.height * H * 1.15);
  const chart = useMemo(() => f.chart.opacity > 0.01 ? r.chart({ width: cw, height: ch, frame: f.chartFrame }) : null, [r, cw, ch, f.chartFrame, f.chart.opacity]);
  const anchor = r.spec.annotation?.anchor ?? [(r.spec.target.bounds.min[0] + r.spec.target.bounds.max[0]) / 2, r.spec.target.bounds.max[1], (r.spec.target.bounds.min[2] + r.spec.target.bounds.max[2]) / 2];
  const ndc = projectWithHeroView(r.spec.subject, f.view, W / H, anchor);
  const ax = ndc ? (f.scene.x + (ndc[0] + 1) / 2 * f.scene.scale) * W : 0, ay = ndc ? (f.scene.y + (1 - ndc[1]) / 2 * f.scene.scale) * H : 0;
  return <Page kicker="House Math · Recipes" title="InspectThenQuantify"
    intro={<>A composition recipe: the whole object, a camera push to the part, a reveal using the asset's own action, a callout anchored to the part, then the scene yields space to the linked chart, which plays its own reveal. Short holds and an off-screen focus target are reported, and the final state is explicit.</>}>
    <Row label="Recipe">{(Object.keys(RECIPES) as RecipeId[]).map(k => <Button key={k} active={id === k} onClick={() => { setId(k); player.restart(); }}>{RECIPES[k].label}</Button>)}</Row>
    <Row label="Output">
      {(["16:9", "9:16"] as const).map(a => <Button key={a} small active={aspect === a} onClick={() => setAspect(a)}>{a}</Button>)}
      <Button small active={player.playing} onClick={() => (player.playing ? player.pause() : player.resume())}>{player.playing ? "Pause" : "Play"}</Button>
      <div style={{ minWidth: 320, flex: 1 }}><Slider label="Frame" value={player.frame} min={0} max={plan.durationFrames + 29} onChange={player.seek} /></div>
    </Row>
    <div style={{ display: "grid", gridTemplateColumns: aspect === "16:9" ? "minmax(0,1fr)" : "minmax(0,480px) minmax(0,1fr)", gap: 14, alignItems: "start" }}>
      <div data-km-itq="" style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}`, overflow: "hidden", borderRadius: 10, border: `1px solid ${ink.line}`, background: "#2b3036" }}>
        <div style={{ position: "absolute", inset: 0, containerType: "size" }}>
          <div style={{ position: "absolute", left: `${f.scene.x * 100}%`, top: `${f.scene.y * 100}%`, width: `${f.scene.scale * 100}%`, height: `${f.scene.scale * 100}%`, borderRadius: f.scene.scale < .99 ? 10 : 0, overflow: "hidden" }}>
            <HeroAssetViewer key={`${id}-${aspect}`} createAsset={create} width={W} height={H} {...f.view} action={f.action?.id} actionFrame={f.action?.frame ?? 0} style={{ width: "100%", height: "100%" }} ariaLabel={`${r.label}: ${f.label}`} />
          </div>
          {f.annotationOpacity > 0.01 && ndc ? <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} aria-hidden>
            <g opacity={f.annotationOpacity}>
              <circle cx={ax} cy={ay} r={7} fill="#f2a33a" />
              <line x1={ax} y1={ay} x2={ax + 40} y2={ay - 70} stroke="#f2a33a" strokeWidth={2.5} />
              <foreignObject x={ax + 44} y={ay - 110} width={Math.min(520, W - ax - 60)} height={90}>
                <div style={{ background: "rgba(14,17,22,.86)", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 20, lineHeight: 1.3, fontFamily: "Geist, Inter, system-ui, sans-serif" }}>{r.spec.annotation?.text}</div>
              </foreignObject>
            </g>
          </svg> : null}
          {chart ? <div style={{ position: "absolute", left: `${f.chart.x * 100}%`, top: `${f.chart.y * 100}%`, width: `${f.chart.width * 100}%`, height: `${f.chart.height * 100}%`, opacity: f.chart.opacity, transform: `translate${aspect === "16:9" ? "X" : "Y"}(${(1 - f.chart.opacity) * 40}px)`, borderRadius: 10, overflow: "hidden" }}>
            <EconomicChartView chart={chart} />
          </div> : null}
          <div style={{ position: "absolute", left: 16, bottom: 14, padding: "6px 10px", borderRadius: 8, background: "rgba(12,16,21,.8)", color: ink.text, fontSize: 14 }}>{`${f.beat} · ${f.label}`}</div>
        </div>
      </div>
      <Panel title="Beats">
        {plan.beats.map(b => <div key={b.beat} style={{ fontFamily: mono, fontSize: 12.5, color: b.beat === f.beat ? ink.text : ink.sub, borderLeft: `3px solid ${b.beat === f.beat ? ink.accent : ink.line}`, paddingLeft: 8 }}>{`${b.start}–${b.end} ${b.beat}`}<span style={{ color: ink.dim }}>{`  ${b.label}`}</span></div>)}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{plan.diagnostics.length ? plan.diagnostics.map((d, i) => <Chip key={i} tone={d.severity === "error" ? ink.warn : ink.dim}>{`${d.code}: ${d.message}`}</Chip>) : <Chip tone={ink.accent}>target in frame · holds ok</Chip>}<Chip>{f.final ? "final: chart" : "running"}</Chip></div>
      </Panel>
    </div>
  </Page>;
}

const meta = {
  title: "House Math/Inspect Then Quantify", component: ITQDemo, parameters: { layout: "fullscreen" },
  argTypes: { recipe: { control: "inline-radio", options: Object.keys(RECIPES) } },
} satisfies Meta<typeof ITQDemo>;
export default meta;
export const Recipe: StoryObj<typeof meta> = { args: { recipe: "roof" } };
