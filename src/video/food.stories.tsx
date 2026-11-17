import { useState } from "react";
import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FoodLibrary, FoodMoodStudy, FoodSheet, FoodStillLifeView, FoodStyleGuide, FoodView, Steam } from "../../registry/materials/food-react";
import { FOOD_LIBRARY, foodEntry } from "../../registry/materials/food-library";

const page: CSSProperties = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "#f3efe8", color: "#26211d", font: "15px/1.45 system-ui, sans-serif" };
const muted: CSSProperties = { margin: 0, color: "#5b524b", font: "13px/1.5 system-ui" };
const h2: CSSProperties = { margin: 0, font: "700 20px system-ui" };
const label: CSSProperties = { display: "grid", gap: 4, font: "600 13px system-ui" };
const grid: CSSProperties = { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" };

/** Cook by the physics: a steak's sear time, an egg's boil, a slice's toasting, each rendered from the heat it took. */
function CookingLab() {
  const [per, setPer] = useState(270), [thick, setThick] = useState(25), [mins, setMins] = useState(7), [secs, setSecs] = useState(180);
  const [cap, setCap] = useState<Record<string, string>>({});
  const note = (k: string) => (c: string) => setCap(p => (p[k] === c ? p : { ...p, [k]: c }));
  return (
    <div style={page}>
      <h2 style={h2}>Cooking lab — the colour follows the heat</h2>
      <p style={{ ...muted, maxWidth: 900 }}>Heat conduction through the food (beef and egg about 1.4 × 10⁻⁷ m²/s) gives the highest temperature each depth reached; proteins set by it, so the cut face shows the cooking: a browned crust, a grey band, then pink and red toward the centre. An egg's white sets at about 62–80 °C and its yolk at about 65–70 °C; a long boil leaves a grey-green ring.</p>
      <div style={grid}>
        <figure style={{ margin: 0, display: "grid", gap: 6 }}>
          <FoodView options={{ dish: "steak", perSide: per, thickness: thick }} label="A seared steak, cut" onCaption={note("s")} />
          <label style={label}>Each side: {Math.floor(per / 60)} min {per % 60} s<input type="range" min={60} max={600} step={15} value={per} onChange={e => setPer(Number(e.target.value))} /></label>
          <label style={label}>Thickness: {thick} mm<input type="range" min={15} max={50} step={5} value={thick} onChange={e => setThick(Number(e.target.value))} /></label>
          <figcaption style={muted}>Pan 220 °C, from the fridge, 5 min rest. {cap.s}</figcaption>
        </figure>
        <figure style={{ margin: 0, display: "grid", gap: 6 }}>
          <FoodView options={{ dish: "egg", minutes: mins }} label="A boiled egg, halved" onCaption={note("e")} />
          <label style={label}>Boiling: {mins} min<input type="range" min={3} max={15} step={0.5} value={mins} onChange={e => setMins(Number(e.target.value))} /></label>
          <figcaption style={muted}>From the fridge, into boiling water, then ice water. {cap.e}</figcaption>
        </figure>
        <figure style={{ margin: 0, display: "grid", gap: 6 }}>
          <FoodView options={{ dish: "toast", toastSeconds: secs }} label="A slice of toast" onCaption={note("t")} />
          <label style={label}>Toasting: {secs} s<input type="range" min={60} max={360} step={10} value={secs} onChange={e => setSecs(Number(e.target.value))} /></label>
          <figcaption style={muted}>{cap.t}</figcaption>
        </figure>
      </div>
    </div>
  );
}

function Doneness() {
  return (
    <div style={page}>
      <h2 style={h2}>Doneness and boiling, side by side</h2>
      <div style={grid}>{[120, 210, 270, 360, 480, 600].map(s => <figure key={s} style={{ margin: 0 }}><FoodView options={{ dish: "steak", perSide: s }} label={`Steak, ${s} s a side`} /><figcaption style={muted}>{Math.floor(s / 60)} min {s % 60 ? `${s % 60} s ` : ""}a side</figcaption></figure>)}</div>
      <div style={grid}>{[5, 6, 7, 8, 10, 13].map(m => <figure key={m} style={{ margin: 0 }}><FoodView options={{ dish: "egg", minutes: m }} label={`Egg boiled ${m} minutes`} /><figcaption style={muted}>{m} minutes</figcaption></figure>)}</div>
    </div>
  );
}

/** One food under every light: pick a food. */
function MoodStudy() {
  const [id, setId] = useState("sourdough-boule");
  return (
    <div style={page}>
      <h2 style={h2}>Light moods — the same food, four lights</h2>
      <p style={{ ...muted, maxWidth: 900 }}>Golden-hour backlight (rims glow, steam shows, the far table melts into warm haze), a bright morning market, a midnight lamp in a tight pool of light, and soft window daylight. The food, its vessel and table stay the same.</p>
      <label style={{ ...label, maxWidth: 360 }}>Food<select value={id} onChange={e => setId(e.target.value)} style={{ font: "14px system-ui", padding: 6 }}>{FOOD_LIBRARY.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
      <FoodMoodStudy id={id} />
    </div>
  );
}

const CLOSE_UPS = ["sourdough-slice", "french-onion", "sea-salt", "roast-chicken", "red-apple", "truffles", "short-ribs", "green-grapes", "pastel-de-nata", "aged-cheese", "tonkotsu-ramen", "pomegranate"];

const meta = { title: "Video production/Art Foundations/Food", id: "video-food", component: FoodSheet, parameters: { layout: "fullscreen" } } satisfies Meta<typeof FoodSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Sheet: Story = { render: () => <div style={page}><h2 style={h2}>Food (FOOD1)</h2><FoodSheet /></div> };
export const LabStory: Story = { name: "Cooking lab", render: () => <CookingLab /> };
export const DonenessStory: Story = { name: "Doneness and boiling", render: () => <Doneness /> };
export const OnigiriStory: Story = { name: "Rice ball", render: () => <div style={page}><h2 style={h2}>A rice ball (onigiri), grain by grain</h2><p style={{ ...muted, maxWidth: 800 }}>About 300 grains of cooked short-grain rice, each about 5.5 × 3 mm, glossy and a little translucent, packed into a rounded triangle about 8–9 cm across; a band of nori round the base, nearly black-green, fibrous, with a soft sheen.</p><div style={grid}>{[3, 7, 11].map(seed => <FoodView key={seed} options={{ dish: "onigiri", seed }} label={`A rice ball, seed ${seed}`} />)}</div></div> };
export const SteamStory: Story = { name: "Steam", render: () => <div style={page}><h2 style={h2}>Steam over hot food</h2><p style={{ ...muted, maxWidth: 800 }}>Invisible at the surface, white a centimetre or two up where the vapour condenses, rising about 0.4 m/s, curling and thinning within about 15 cm; strongest near boiling, shown best backlit against the dark.</p><div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}><Steam temperature={95} /><Steam temperature={75} draught={0.6} label="Cooler food in a draught" /></div></div> };
export const LibraryStory: Story = { name: "Storybook library", render: () => <div style={page}><h2 style={h2}>Storybook food library — {FOOD_LIBRARY.length} foods</h2><p style={{ ...muted, maxWidth: 900 }}>Raw produce and cooked dishes from every region and era, each a still life with its own vessel, table and light. Rendered on the CPU in workers from measured shapes and physical surfaces (subsurface scattering, translucency, soft shadows, liquids and glass, depth of field), then cached. Choose a food to see it large under any light.</p><FoodLibrary /></div> };
export const StyleGuideStory: Story = { name: "Style guide", render: () => <div style={page}><h2 style={h2}>Storybook realism — the style guide</h2><p style={{ ...muted, maxWidth: 900 }}>Tactile, highly detailed food with the warmth of a picture book: painterly chiaroscuro from a low golden backlight, soft occlusion in crevices, light glowing through fruit, broth and butter, and no outlines or flat shading.</p><FoodStyleGuide /></div> };
export const MoodsStory: Story = { name: "Light moods", render: () => <MoodStudy /> };
export const CloseUpsStory: Story = { name: "Texture close-ups", render: () => <div style={page}><h2 style={h2}>Texture close-ups</h2><p style={{ ...muted, maxWidth: 900 }}>Each food at about 2.4× closer than its library frame: crumb and crust, bubbling cheese, salt crystals, blistered skin, waxy apple and dew, cocoa velvet, sticky glaze, backlit grapes, scorched custard, cheese crystals, a jammy egg, ruby arils.</p><div style={grid}>{CLOSE_UPS.map(id => <figure key={id} style={{ margin: 0, display: "grid", gap: 6 }}><FoodStillLifeView id={id} zoom={2.4} width={480} height={360} /><figcaption style={muted}><b>{foodEntry(id)?.name}.</b> {foodEntry(id)?.look}</figcaption></figure>)}</div></div> };
