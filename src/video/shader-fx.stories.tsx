import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShaderFxLayer } from "../../registry/video/shader-fx-react";
import type { ShaderFxEffect, ShaderFxSpec, ShaderFxTreatment } from "../../registry/video/shader-fx";
import { SHADER_FX_EFFECTS } from "../../registry/video/shader-fx";
import waterfall from "../../examples/film/assets/iceland/seljalandsfoss.jpg?url";
import terraces from "../../examples/film/assets/iceland/dynjandi.jpg?url";
import drop from "../../examples/film/assets/water-mark.svg?url";

const fps = { num: 30, den: 1 }, duration = 300;
const photo = (id: string, src: string) => ({ id, src, alt: id, licenseRef: "commons-" + id + "-cc0", width: 1800, height: 1090 });
function specFor(effect: ShaderFxEffect, treatment: ShaderFxTreatment): ShaderFxSpec {
  const base = { id: effect, treatment, seed: 3 };
  switch (effect) {
    case "mesh-gradient": case "grain-gradient": return { ...base, effect, layer: "background" };
    case "god-rays": return { ...base, effect, layer: "overlay" };
    case "liquid-metal": return { ...base, effect, layer: "overlay", image: { id: "drop", src: drop, alt: "A water drop", licenseRef: "original-kumiki-example" }, region: { x: .3, y: .1, width: .4, height: .6 } };
    case "water": return { ...base, effect, layer: "background", image: photo("seljalandsfoss", waterfall) };
    case "halftone-dots": return { ...base, effect, layer: "background", image: photo("dynjandi", terraces) };
  }
}
function Lab({ effect, treatment, portrait, reducedMotion }: { effect: ShaderFxEffect; treatment: ShaderFxTreatment; portrait: boolean; reducedMotion: boolean }) {
  const [frame, setFrame] = useState(60);
  return <div style={{ padding: 16 }}>
    <label style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>Frame {frame}
      <input type="range" min={0} max={duration - 1} value={frame} onChange={event => setFrame(Number(event.target.value))} style={{ flex: 1 }} /></label>
    <div style={{ position: "relative", width: portrait ? 360 : 960, height: portrait ? 640 : 540, overflow: "hidden", background: "#0a1a28" }}>
      <ShaderFxLayer key={effect + treatment} spec={specFor(effect, treatment)} frame={frame} fps={fps} hostDurationFrames={duration} reducedMotion={reducedMotion} />
      <p style={{ position: "absolute", left: 0, right: 0, bottom: "12%", margin: 0, textAlign: "center", color: "#fff", font: "700 32px var(--km-font-body, system-ui)" }}>A title over the effect</p>
    </div>
  </div>;
}
const meta = { title: "Video production/Shader FX", id: "video-shader-fx", component: Lab, args: { effect: "mesh-gradient", treatment: "subtle", portrait: false, reducedMotion: false },
  argTypes: { effect: { control: "select", options: SHADER_FX_EFFECTS }, treatment: { control: "inline-radio", options: ["subtle", "standard", "hero"] } } } satisfies Meta<typeof Lab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Effects: Story = {};
