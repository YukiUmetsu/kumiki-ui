import { useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BUILDING_TYPES } from "../../registry/anatomy/arch-data";
import { ArchSheet, BuildingElevation, StreetElevation } from "../../registry/anatomy/arch-react";
import { ArchLibraryGallery, ArchStyleGuide } from "../../registry/anatomy/arch-plate-react";

const page: CSSProperties = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "#f3efe8", color: "#26211d", font: "15px/1.45 system-ui, sans-serif" };
const muted: CSSProperties = { margin: 0, color: "#5b524b", font: "13px/1.5 system-ui" };
const h2: CSSProperties = { margin: 0, font: "700 20px system-ui" };
const button: CSSProperties = { minHeight: 34, padding: "4px 10px", borderRadius: 6, border: "1px solid #a99c8c", background: "#fff", font: "600 13px system-ui", cursor: "pointer" };
const active: CSSProperties = { ...button, background: "#26211d", color: "#fff", border: "1px solid #26211d" };
const label: CSSProperties = { display: "grid", gap: 4, font: "600 13px system-ui" };

/** Streets at one scale: a Kyoto machiya row, a Georgian terrace, half-timbered houses, a temple beside town houses. */
function Streets() {
  return (
    <div style={page}>
      <h2 style={h2}>Streets — one ground line, one scale</h2>
      <p style={{ ...muted, maxWidth: 900 }}>Buildings side by side, each measured from its type (storeys, bays, doors about 2 m, a person 1.75 m tall at the left). Each house varies a little by its seed, as real neighbours do. Town roofs are straight; only temples and castle keeps curve.</p>
      <StreetElevation label="A Kyoto machiya row" types={[1, 2, 3, 4, 5].map(seed => ({ type: "machiya", seed, bays: seed % 2 ? 2 : 3 }))} />
      <StreetElevation label="A Georgian terrace" types={[1, 2, 3, 4].map(seed => ({ type: "georgian-townhouse", seed }))} />
      <StreetElevation label="Half-timbered houses" types={[1, 2, 3].map(seed => ({ type: "half-timbered", seed, storeys: 2 + (seed % 2) }))} />
      <StreetElevation label="A temple hall among town houses" types={[{ type: "machiya", seed: 7 }, { type: "japanese-temple", seed: 1 }, { type: "machiya", seed: 8 }]} height={280} />
    </div>
  );
}

/** One building with its dimensions. */
function Measured() {
  const [type, setType] = useState("machiya"), [seed, setSeed] = useState(1);
  const t = BUILDING_TYPES.find(b => b.id === type)!;
  return (
    <div style={page}>
      <h2 style={h2}>Measured elevation</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} role="group" aria-label="Building type">{BUILDING_TYPES.map(b => <button key={b.id} type="button" style={type === b.id ? active : button} aria-pressed={type === b.id} onClick={() => setType(b.id)}>{b.label}</button>)}</div>
      <label style={{ ...label, maxWidth: 320 }}>Variation (seed): {seed}<input type="range" min={1} max={12} value={seed} onChange={e => setSeed(Number(e.target.value))} /></label>
      <BuildingElevation type={type} seed={seed} dims height={480} />
      <ul style={{ ...muted, paddingLeft: 18 }}>{t.notes.map(n => <li key={n}>{n}</li>)}</ul>
    </div>
  );
}

const meta = { title: "Video production/Art Foundations/Architecture", id: "video-arch", component: ArchSheet, parameters: { layout: "fullscreen" } } satisfies Meta<typeof ArchSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Sheet: Story = { render: () => <div style={page}><h2 style={h2}>Buildings (ARCH1)</h2><ArchSheet /></div> };
export const StreetsStory: Story = { name: "Streets", render: () => <Streets /> };
export const MeasuredStory: Story = { name: "Measured elevation", render: () => <Measured /> };

/** 100 structures and environments painted as storybook plates: filter by tradition, view, scale or detail; open one large and change its light. */
export const StorybookLibrary: Story = {
  name: "Illustrated library (100 structures)",
  render: () => (
    <div style={page}>
      <h2 style={h2}>Illustrated architecture — 100 structures</h2>
      <p style={{ ...muted, maxWidth: 900 }}>European vernacular from Cotswold cottages to Dutch canal houses, a select few from North Africa and the Middle East, Romanesque and Gothic engineering, castles, Baroque and Victorian iron and glass, barns and mills, and lived-in rooms. Each is built from modular parts at real size, lit, and painted in the manner of classic architectural watercolours. Plates render in the background and are cached.</p>
      <ArchLibraryGallery />
    </div>
  ),
};
/** The materials, light, age and paint that the plates are made of, each rendered. */
export const StyleGuideStory: Story = { name: "Illustration style guide", render: () => <div style={page}><h2 style={h2}>Illustrated architecture — style guide</h2><ArchStyleGuide /></div> };
