import { useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LANDFORMS, snowlineAt, treelineAt } from "../../registry/nature/geo-data";
import type { TerrainKind } from "../../registry/nature/geo-data";
import { GeoSheet, TerrainView } from "../../registry/nature/geo-react";
import type { TerrainRenderOptions } from "../../registry/nature/geo-render";

const page: CSSProperties = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "#f3efe8", color: "#26211d", font: "15px/1.45 system-ui, sans-serif" };
const muted: CSSProperties = { margin: 0, color: "#5b524b", font: "13px/1.5 system-ui" };
const h2: CSSProperties = { margin: 0, font: "700 20px system-ui" };
const button: CSSProperties = { minHeight: 34, padding: "4px 10px", borderRadius: 6, border: "1px solid #a99c8c", background: "#fff", font: "600 13px system-ui", cursor: "pointer" };
const active: CSSProperties = { ...button, background: "#26211d", color: "#fff", border: "1px solid #26211d" };
const label: CSSProperties = { display: "grid", gap: 4, font: "600 13px system-ui" };

const KINDS: { kind: TerrainKind; label: string; o?: Partial<TerrainRenderOptions> }[] = [
  { kind: "alpine", label: "Fold range with glacial peaks" },
  { kind: "u-valley", label: "Glacial U-valley" },
  { kind: "volcano", label: "Stratovolcano (winter snow down the ravines)", o: { winter: 0.6 } },
  { kind: "v-valley", label: "River V-valley" },
  { kind: "mesa", label: "Mesas and buttes", o: { seed: 3, sunAzimuth: 100, sunElevation: 18 } },
  { kind: "dunes", label: "Dunes (slip faces toward us)", o: { sunAzimuth: 70, sunElevation: 16 } },
  { kind: "coast", label: "Cliffed coast", o: { sunAzimuth: 40, sunElevation: 30 } },
  { kind: "hills", label: "Rolling hills", o: { sunAzimuth: 80, sunElevation: 22 } },
  { kind: "cinder", label: "Cinder cone" },
];

/** Every landform rendered: heightfields worn by rain and gravity, lit by SKY1's atmosphere. */
function Landscapes() {
  return (
    <div style={page}>
      <h2 style={h2}>Landscapes — landforms worn by water and gravity, under a physical sky</h2>
      <p style={{ ...muted, maxWidth: 900 }}>Each landform is a heightfield from its measured shape, worn by tens of thousands of raindrops (gullies, fans) and by loose rock settling to its angle of repose, then rendered: snow above the snowline for the latitude (lower on shaded slopes, only where it can hold), bare rock on faces steeper than about 38°, scree below them, meadow above the treeline and forest below it, under the sun and sky of SKY1's atmosphere, with aerial perspective fading the distance.</p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))" }}>
        {KINDS.map(k => (
          <figure key={k.kind} style={{ margin: 0, display: "grid", gap: 4, alignContent: "start" }}>
            <TerrainView options={{ kind: k.kind, width: 480, height: 270, supersample: 2, ...k.o }} label={`${k.label}, rendered`} />
            <figcaption style={muted}><b>{k.label}.</b> {LANDFORMS.find(l => l.terrain === k.kind)?.origin}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/** One landform with every control: kind, seed, latitude, season, sun, haze, viewpoint. */
function TerrainLab() {
  const [o, setO] = useState<TerrainRenderOptions & { kind: TerrainKind }>({ kind: "alpine", seed: 1, latitude: 46, winter: 0.25, sunElevation: 32, sunAzimuth: 110, visibilityKm: 60, width: 640, height: 360, supersample: 2 });
  const set = <K extends keyof typeof o>(k: K, v: (typeof o)[K]) => setO(p => ({ ...p, [k]: v }));
  const range = (k: "seed" | "latitude" | "winter" | "sunElevation" | "sunAzimuth" | "visibilityKm", name: string, min: number, max: number, step: number, fmt: (v: number) => string) =>
    <label style={label}>{name}: {fmt(Number(o[k]))}<input type="range" min={min} max={max} step={step} value={Number(o[k])} onChange={e => set(k, Number(e.target.value))} /></label>;
  return (
    <div style={{ ...page, gridTemplateColumns: "minmax(240px, 300px) minmax(0, 1fr)" }}>
      <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
        <h2 style={h2}>Terrain lab</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} role="group" aria-label="Landform">{KINDS.map(k => <button key={k.kind} type="button" style={o.kind === k.kind ? active : button} aria-pressed={o.kind === k.kind} onClick={() => setO(p => ({ ...p, kind: k.kind, ...k.o }))}>{k.label}</button>)}</div>
        {range("seed", "Seed", 1, 12, 1, v => String(v))}
        {range("latitude", "Latitude", 0, 70, 1, v => `${v}° (snowline ${Math.round(snowlineAt(v)).toLocaleString("en")} m, treeline ${Math.round(treelineAt(v)).toLocaleString("en")} m)`)}
        {range("winter", "Season (summer → winter)", 0, 1, 0.05, v => `${Math.round(v * 100)}%`)}
        {range("sunElevation", "Sun height", 2, 70, 1, v => `${v}°`)}
        {range("sunAzimuth", "Sun from (0 behind you, 90 right, 180 ahead)", -170, 170, 5, v => `${v}°`)}
        {range("visibilityKm", "Visibility", 5, 150, 5, v => `${v} km`)}
      </div>
      <figure style={{ margin: 0, display: "grid", gap: 6, alignContent: "start", maxWidth: 900 }}>
        <TerrainView options={o} label={`${o.kind} terrain, rendered`} />
        <figcaption style={muted}>{LANDFORMS.find(l => l.terrain === o.kind)?.draw.join(" ")}</figcaption>
      </figure>
    </div>
  );
}

const meta = { title: "Video production/Art Foundations/Terrain and Landforms", id: "video-geo", component: GeoSheet, parameters: { layout: "fullscreen" } } satisfies Meta<typeof GeoSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Sheet: Story = { render: () => <div style={page}><h2 style={h2}>Landforms (GEO1)</h2><GeoSheet /></div> };
export const LandscapesStory: Story = { name: "Landscapes", render: () => <Landscapes /> };
export const LabStory: Story = { name: "Terrain lab", render: () => <TerrainLab /> };
