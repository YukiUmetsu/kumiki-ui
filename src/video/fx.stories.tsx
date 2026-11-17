import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FireSheet, FireView } from "../../registry/nature/fx-react";

const page: CSSProperties = { display: "grid", gap: 16, alignContent: "start", padding: 24, minHeight: "100vh", background: "#f3efe8", color: "#26211d", font: "15px/1.45 system-ui, sans-serif" };
const muted: CSSProperties = { margin: 0, color: "#5b524b", font: "13px/1.5 system-ui" };
const h2: CSSProperties = { margin: 0, font: "700 20px system-ui" };
const grid: CSSProperties = { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" };

function Fires() {
  return (
    <div style={page}>
      <h2 style={h2}>Fires — rendered from the flame physics</h2>
      <p style={{ ...muted, maxWidth: 900 }}>Each fire's flame is as tall as Heskestad's correlation gives for its heat release and puffs at about 1.5/√D times a second; turbulence rises with the plume and tears the flame into tongues; the soot glows in the colour of its temperature (Planck's law), brightest in the yellow-white core; wood smoke billows grey above, an oil fire's black; sparks cool from yellow to red as they rise.</p>
      <div style={grid}>
        <figure style={{ margin: 0 }}><FireView options={{ fire: "candle" }} label="A candle flame, animated" /><figcaption style={muted}>Candle: about 80 W, a 3–4 cm teardrop, steady in still air.</figcaption></figure>
        <figure style={{ margin: 0 }}><FireView options={{ fire: "campfire" }} label="A campfire, animated" /><figcaption style={muted}>Campfire: about 120 kW, flames about 1 m, puffing about 2 Hz.</figcaption></figure>
        <figure style={{ margin: 0 }}><FireView options={{ fire: "bonfire" }} label="A bonfire, animated" /><figcaption style={muted}>Bonfire: about 2 MW, flames over 2 m, slow puffs about 1 Hz, columns of sparks.</figcaption></figure>
        <figure style={{ margin: 0 }}><FireView options={{ fire: "torch", wind: 1.5 }} label="A torch in the wind, animated" /><figcaption style={muted}>Torch in a 1.5 m/s wind: the flame and its sooty smoke lean downwind.</figcaption></figure>
      </div>
    </div>
  );
}

const meta = { title: "Video production/Art Foundations/Fire and Effects", id: "video-fx", component: FireSheet, parameters: { layout: "fullscreen" } } satisfies Meta<typeof FireSheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Sheet: Story = { render: () => <div style={page}><h2 style={h2}>Fire, smoke and effects (FX1)</h2><FireSheet /></div> };
export const FiresStory: Story = { name: "Fires", render: () => <Fires /> };
