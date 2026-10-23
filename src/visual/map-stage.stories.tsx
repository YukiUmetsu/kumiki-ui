import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MapStageView } from "../../registry/visual/map-stage-react";
import { createCanvasMeasurer } from "../../registry/media/text-layout";
import { layoutMapStage, mapStageDuration } from "../../registry/visual/map-stage";
import type { MapFeature, MapStageDiagnostic, MapStageSpec } from "../../registry/visual/map-stage";

/* Three unrelated, invented domains, one component. Every shape, port, state and name below is made up for this demo
 * and placed in an open-ocean window of longitude and latitude. No basemap or real boundary is drawn. */
type Pos = [number, number];
const attribution = (what: string) => ({
  source: `Fictional geometry, no real boundaries (${what})`,
  licence: "Original fictional geometry written for this demo; no third-party licence applies",
});
const region = (id: string, fillKey: string, ring: Pos[]): MapFeature => ({ type: "Feature", id, geometry: { type: "Polygon", coordinates: [ring] }, properties: { fillKey } });
const pin = (id: string, name: string, at: Pos): MapFeature => ({ type: "Feature", id, geometry: { type: "Point", coordinates: at }, properties: { name } });
const path = (id: string, coordinates: Pos[]): MapFeature => ({ type: "Feature", id, geometry: { type: "LineString", coordinates } });

const SUPPLY: MapStageSpec = {
  id: "island-supply", fps: { num: 30, den: 1 }, projection: "orthographic",
  collections: [{ type: "FeatureCollection", id: "islands", attribution: attribution("invented island chain"), features: [
    region("harrow", "main", [[-138, -33], [-134, -32.4], [-132.6, -34.6], [-135, -36.1], [-138.4, -35.2], [-138, -33]]),
    region("lisk", "main", [[-131, -30.6], [-127.6, -30.1], [-126.6, -31.6], [-128.6, -33.1], [-131.4, -32.6], [-131, -30.6]]),
    region("morrow", "islet", [[-124.6, -35.5], [-123.9, -35.2], [-123.5, -35.9], [-124.2, -36.2], [-124.6, -35.5]]),
    region("tennet", "main", [[-127, -38], [-123.5, -37.5], [-122.5, -39.5], [-125.5, -40.5], [-127.5, -39.5], [-127, -38]]),
    pin("port-ardent", "Port Ardent", [-136.2, -34.2]),
    pin("port-lisk", "Lisk Quay", [-128.8, -31.3]),
    pin("port-morrow", "Morrow Wharf", [-124, -35.7]),
    pin("port-tennet", "Tennet Dock", [-124.6, -38.6]),
    path("route-ardent-lisk", [[-136.2, -34.2], [-133.2, -33.5], [-130.6, -32.2], [-128.8, -31.3]]),
    path("route-lisk-morrow", [[-128.8, -31.3], [-126.8, -33.2], [-124, -35.7]]),
    path("route-morrow-tennet", [[-124, -35.7], [-123.6, -37.2], [-124.6, -38.6]]),
  ] }],
  routes: [
    { id: "ardent-lisk", featureId: "route-ardent-lisk", from: "port-ardent", to: "port-lisk" },
    { id: "lisk-morrow", featureId: "route-lisk-morrow", from: "port-lisk", to: "port-morrow" },
    { id: "morrow-tennet", featureId: "route-morrow-tennet", from: "port-morrow", to: "port-tennet" },
  ],
  legend: [{ key: "main", label: "Main island (invented)" }, { key: "islet", label: "Islet (invented)" }],
  beats: [
    { id: "chain", kind: "establish", durationFrames: 60 },
    { id: "leg-1", kind: "route", routeId: "ardent-lisk", durationFrames: 75 },
    { id: "leg-2", kind: "route", routeId: "lisk-morrow", durationFrames: 75 },
    { id: "leg-3", kind: "route", routeId: "morrow-tennet", durationFrames: 75 },
    { id: "dock", kind: "focus", targetId: "port-tennet", durationFrames: 90 },
  ],
};

const POPULATION: MapStageSpec = {
  id: "invented-migration", fps: { num: 30, den: 1 }, projection: "equirectangular",
  collections: [{ type: "FeatureCollection", id: "regions", attribution: attribution("invented regions"), features: [
    region("northmere", "origin", [[-146, -35], [-139, -34.5], [-138, -38.5], [-143.5, -40], [-146, -38.5], [-146, -35]]),
    region("sallow", "receiving", [[-134, -37], [-127, -37], [-126, -33.5], [-133, -33], [-134, -37]]),
    region("ember", "other", [[-128, -27], [-121, -27], [-120.5, -23.5], [-127, -23], [-128, -27]]),
    pin("northmere-hub", "Northmere Hub", [-141, -36.5]),
    pin("sallow-hub", "Sallow Hub", [-130.5, -35]),
    pin("ember-hub", "Ember Hub", [-124.5, -25.2]),
    path("flow-sallow", [[-141, -36.5], [-136, -36], [-130.5, -35]]),
    path("flow-ember", [[-141, -36.5], [-137, -31], [-130, -28], [-124.5, -25.2]]),
  ] }],
  routes: [
    { id: "to-sallow", featureId: "flow-sallow", from: "northmere-hub", to: "sallow-hub" },
    { id: "to-ember", featureId: "flow-ember", from: "northmere-hub", to: "ember-hub" },
  ],
  legend: [
    { key: "origin", label: "Origin region (invented)" },
    { key: "receiving", label: "Receiving region (invented)" },
    { key: "other", label: "Other region (invented)" },
  ],
  beats: [
    { id: "regions", kind: "establish", durationFrames: 60 },
    { id: "flow-1", kind: "route", routeId: "to-sallow", durationFrames: 75 },
    { id: "flow-2", kind: "route", routeId: "to-ember", durationFrames: 75 },
    { id: "arrive", kind: "focus", targetId: "sallow-hub", durationFrames: 90 },
  ],
};

const BORDER: MapStageSpec = {
  id: "invented-border", fps: { num: 30, den: 1 }, projection: "equirectangular",
  collections: [{ type: "FeatureCollection", id: "states", attribution: attribution("two invented states"), features: [
    region("veyra", "state-a", [[-140, -40], [-132, -40], [-132, -34], [-140, -34], [-140, -40]]),
    region("quorin", "state-b", [[-132, -40], [-124, -40], [-124, -34], [-132, -34], [-132, -40]]),
    path("border-veyra-quorin", [[-132, -40], [-132, -37], [-132, -34]]),
    pin("veyra-capital", "Veyra Capital", [-137, -37]),
    pin("quorin-capital", "Quorin Capital", [-127, -37]),
    pin("crossing-gate", "Crossing Gate", [-132, -37]),
    path("route-envoy", [[-137, -37], [-135, -41.8], [-130, -41.8], [-127, -37]]),
  ] }],
  routes: [{ id: "envoy", featureId: "route-envoy", from: "veyra-capital", to: "quorin-capital" }],
  legend: [{ key: "state-a", label: "Veyra (invented state)" }, { key: "state-b", label: "Quorin (invented state)" }],
  beats: [
    { id: "states", kind: "establish", durationFrames: 60 },
    { id: "border", kind: "focus", targetId: "border-veyra-quorin", durationFrames: 90 },
    { id: "envoy", kind: "route", routeId: "envoy", durationFrames: 75 },
    { id: "gate", kind: "focus", targetId: "crossing-gate", durationFrames: 90 },
  ],
};

const DOMAINS = [
  { id: "supply", label: "Supply chain: invented islands", spec: SUPPLY,
    note: "Three supply legs between invented ports, drawn one after another on an orthographic view. The camera ends on Tennet Dock." },
  { id: "population", label: "Population: invented flow", spec: POPULATION,
    note: "Flow lines show direction only. No volume is measured or implied, so the lines carry no numbers." },
  { id: "history", label: "History: invented border", spec: BORDER,
    note: "A border narrative between two invented states: the camera visits the border, the envoy route, then the crossing gate." },
];

const OUTPUTS = [{ id: "portrait", width: 1080, height: 1920, max: 300 }, { id: "landscape", width: 1920, height: 1080, max: 560 }];
const note: CSSProperties = { margin: 0, font: "400 13px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-muted, #5b6472)" };
const tone = (d: MapStageDiagnostic) => d.severity === "error" ? "var(--km-text-danger, #b91c1c)" : "var(--km-status-warning, #b45309)";
const button = (active: boolean): CSSProperties => ({ padding: "8px 14px", borderRadius: 8, font: "600 14px/1 var(--km-font-body, system-ui)",
  border: "1px solid var(--km-rule, #cfd5dd)", background: active ? "var(--km-accent, #2f5f8a)" : "var(--km-surface, #ffffff)", color: active ? "#ffffff" : "inherit" });

function beatAt(spec: MapStageSpec, frame: number) {
  let start = 0;
  for (const beat of spec.beats) {
    if (frame < start + beat.durationFrames) return beat;
    start += beat.durationFrames;
  }
  return spec.beats[spec.beats.length - 1];
}

function Walkthrough({ startFrame }: { startFrame: number }) {
  const [domain, setDomain] = useState(0);
  const current = DOMAINS[domain], spec = current.spec;
  const total = mapStageDuration(spec);
  const [frame, setFrame] = useState(startFrame);
  const [playing, setPlaying] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, MapStageDiagnostic[]>>({});
  useEffect(() => {
    if (!playing) return;
    let raf = 0, origin: number | undefined; const from = frame >= total - 1 ? 0 : frame;
    const tick = (t: number) => { origin ??= t; const next = from + Math.floor((t - origin) * 30 / 1000);
      if (next >= total) { setFrame(total - 1); setPlaying(false); return; } setFrame(next); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only on play/pause
  const all = [...new Map(Object.entries(diagnostics).flatMap(([id, list]) => list.map(d => [`${d.code}|${d.message}`, { ...d, message: `${d.message} (${id})` }] as const))).values()];
  const beat = beatAt(spec, Math.min(frame, total - 1));
  return <section style={{ padding: 20, display: "grid", gap: 16, background: "var(--km-surface-canvas, #f6f7f9)", color: "var(--km-text-primary, #1f2937)", font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)" }}>
    <p style={{ margin: 0, font: "700 14px/1.4 var(--km-font-body, system-ui)", color: "var(--km-text-primary, #1f2937)" }}>Fictional geometry, no real boundaries.</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {DOMAINS.map((d, i) => <button key={d.id} type="button" aria-pressed={i === domain} style={button(i === domain)}
        onClick={() => { setDomain(i); setFrame(0); setPlaying(false); }}>{d.label}</button>)}
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setPlaying(p => !p)} style={button(false)}>{playing ? "Pause" : "Play"}</button>
      <input aria-label="Seek" type="range" min={0} max={total - 1} value={Math.min(frame, total - 1)} onChange={e => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ flex: "1 1 260px" }} />
      <span style={{ fontFamily: "var(--km-font-mono, ui-monospace, monospace)" }}>frame {Math.min(frame, total - 1)} · beat {beat.id}</span>
    </div>
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      {OUTPUTS.map(o => <figure key={o.id} style={{ margin: 0, width: "100%", maxWidth: o.max, display: "grid", gap: 6 }}>
        <MapStageView key={`${current.id}-${o.id}`} spec={spec} frame={frame} width={o.width} height={o.height} style={{ borderRadius: 12, overflow: "hidden" }}
          onDiagnostics={d => setDiagnostics(prev => ({ ...prev, [o.id]: d }))} />
        <figcaption style={note}>{o.width}×{o.height}</figcaption>
      </figure>)}
    </div>
    {all.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{all.map((d, i) => <li key={i}><strong style={{ color: tone(d) }}>{d.code}</strong> — {d.message}</li>)}</ul>
      : <p style={{ ...note, color: "var(--km-status-success, #15803d)", fontWeight: 600 }}>Every region is explained by the legend, every label clears its neighbours, and every route starts and ends on its pins.</p>}
    <p style={note}>{current.note}</p>
    <p style={note}>Invented shapes and names only. The attribution line on each map is drawn by MapStage, and the caption under each output is the story’s own.</p>
  </section>;
}

/* Deliberately broken variants of the population map. Each must be refused with the code shown. */
const POP_ATTR = POPULATION.collections[0].attribution;
const POP_FEATURES = POPULATION.collections[0].features;
const BROKEN: Array<{ label: string; expect: string; spec: MapStageSpec }> = [
  { label: "A collection with no licence", expect: "map-attribution-missing",
    spec: { ...POPULATION, collections: [{ ...POPULATION.collections[0], attribution: { ...POP_ATTR, licence: "" } }] } },
  { label: "A pin with a latitude beyond ±90", expect: "map-coordinate-range",
    spec: { ...POPULATION, collections: [{ ...POPULATION.collections[0], features: POP_FEATURES.map(f => f.id === "sallow-hub" ? pin("sallow-hub", "Sallow Hub", [-130.5, 95]) : f) }] } },
  { label: "A route that ends at a pin which does not exist", expect: "map-route-unknown",
    spec: { ...POPULATION, routes: [{ id: "to-sallow", featureId: "flow-sallow", from: "northmere-hub", to: "missing-hub" }] } },
  { label: "Two pins whose labels collide at the settled view", expect: "map-label-collision",
    spec: { ...POPULATION, collections: [{ ...POPULATION.collections[0], features: [...POP_FEATURES, pin("sallow-hub-twin", "Sallow Hub (twin)", [-130.49, -35.01])] }] } },
  { label: "A projection the component does not implement", expect: "map-projection-unknown",
    spec: { ...POPULATION, projection: "mercator" as unknown as MapStageSpec["projection"] } },
  { label: "An attribution with an unbreakable URL wider than the output", expect: "map-attribution-unfit",
    spec: { ...POPULATION, collections: [{ ...POPULATION.collections[0], attribution: { ...POP_ATTR, url: `https://example.org/${"x".repeat(200)}` } }] } },
];

function Refusals() {
  const rows = useMemo(() => {
    const measure = createCanvasMeasurer({});
    return BROKEN.map(item => {
      const layout = layoutMapStage(item.spec, { width: 1080, height: 1920 }, {
        measure, labelPx: 32, legendPx: 28, attributionPx: 26, readablePx: 26,
      });
      const errors = layout.diagnostics.filter(d => d.severity === "error");
      return { label: item.label, expect: item.expect, errors, refused: errors.some(d => d.code === item.expect) };
    });
  }, []);
  return <section style={{ padding: 20, display: "grid", gap: 14, maxWidth: 1000, font: "400 14px/1.5 var(--km-font-body, system-ui, sans-serif)", color: "var(--km-text-primary, #1f2937)" }}>
    {rows.map((r, i) => <div key={i}>
      <strong>{r.label}</strong>
      <div style={{ font: "400 13px/1.5 var(--km-font-mono, ui-monospace, monospace)", color: r.refused ? "var(--km-status-success, #15803d)" : "var(--km-text-danger, #b91c1c)" }}>
        {r.refused ? "refused" : "NOT refused"} with <code>{r.expect}</code>
      </div>
      <ul style={{ margin: "4px 0 0", paddingLeft: 20, overflowWrap: "anywhere" }}>{r.errors.map((d, j) => <li key={j}><code>{d.code}</code> — {d.message}</li>)}</ul>
    </div>)}
  </section>;
}

const meta = { title: "Visual/Map Stage", component: Walkthrough, parameters: { layout: "fullscreen" },
  argTypes: { startFrame: { control: { type: "number", min: 0, max: 374 } } }, args: { startFrame: 0 } } satisfies Meta<typeof Walkthrough>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WalkthroughStory: Story = { name: "Walkthrough" };
export const RefusalsStory: Story = { name: "Refusals", render: () => <Refusals /> };
