import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InkBrushCanvas } from "../../registry/video/ink-brush-react";
import type { InkBrushSpec, InkBrushStroke } from "../../registry/video/ink-brush";

const layout = {
  display: "grid", gap: 16, padding: 24, minHeight: "100vh",
  background: "#F7F7F4", color: "#303B3C", font: "15px/1.4 system-ui,sans-serif",
} as const;
const control = { display: "grid", gap: 5, font: "600 13px system-ui", minWidth: 150 } as const;
/** Study the material at full scale, without a title card masking the brush construction. */
function BrushMaterialMicroscope() {
  const [frame, setFrame] = useState(220);
  const [dryness, setDryness] = useState(.65);
  const [load, setLoad] = useState(.82);
  const [bleed, setBleed] = useState(.65);
  const [renderMode, setRenderMode] = useState<"wet" | "vector">("wet");
  const [zoom, setZoom] = useState(1);
  const [seed, setSeed] = useState(31);
  const marks: InkBrushStroke[] = [
    { id: "side-loaded", width: 55, tone: 0, dryness: .3 * dryness, load, startFrame: 0, durationFrames: 44,
      points: [
        { x: 110, y: 122, pressure: .12, pace: 1.9 },
        { x: 230, y: 123, pressure: .95, pace: .55 },
        { x: 420, y: 141, pressure: .8, pace: .85 },
        { x: 680, y: 106, pressure: .5, pace: 2.8 },
        { x: 829, y: 118, pressure: .035, pace: 3.4 },
      ] },
    { id: "loaded-wash", width: 75, tone: 2, dryness: .09 * dryness, load: .6 * load,
      startFrame: 47, durationFrames: 43,
      points: [
        { x: 118, y: 239, pressure: .15, pace: .75 },
        { x: 280, y: 232, pressure: .9, pace: .45 },
        { x: 520, y: 258, pressure: .72, pace: .7 },
        { x: 807, y: 238, pressure: .07, pace: 1.5 },
      ] },
    { id: "flying-white", width: 49, tone: 1, dryness, load: .5 * load,
      startFrame: 96, durationFrames: 40,
      points: [
        { x: 115, y: 356, pressure: .09, pace: 2.2 },
        { x: 290, y: 330, pressure: .84, pace: 2.6 },
        { x: 470, y: 351, pressure: .7, pace: 3.5 },
        { x: 650, y: 322, pressure: .56, pace: 3.5 },
        { x: 826, y: 319, pressure: .02, pace: 4 },
      ] },
    { id: "lifting-tip", width: 21, tone: 0, dryness: dryness * .8, load: .8 * load,
      startFrame: 140, durationFrames: 43,
      points: [
        { x: 110, y: 453, pressure: .06, pace: 1.2 },
        { x: 282, y: 441, pressure: .94, pace: .65 },
        { x: 463, y: 462, pressure: .6, pace: 1.5 },
        { x: 810, y: 438, pressure: 0, pace: 3.2 },
      ] },
  ];
  const spec: InkBrushSpec = { version: 1, width: 960, height: 540, paper: "#F2EFE4", seed, strokes: marks };
  return <div style={layout}>
    <div>
      <h1 style={{ font: "600 34px/1.2 Georgia,serif", margin: "0 0 8px" }}>Real Brush Material / Contact Study</h1>
      <p style={{ maxWidth: 870, margin: 0 }}>Observe four independent deposits: a side-loaded ink tip,
        pale wash, fast split bristles and a lifting fine tip. The pigment is nonuniform and the
        paper apertures are cut through each individual mark, not a photographic overlay.</p>
    </div>
    <div style={{ width: 960, height: 540, overflow: "hidden", maxWidth: "100%",
      boxShadow: "0 12px 42px rgba(40,30,20,.12)" }}>
      <InkBrushCanvas spec={spec} frame={frame} data-km-ink-microscope=""
        renderMode={renderMode} bleed={bleed} rasterScale={.75}
        style={{ transform: "scale(" + zoom + ")", transformOrigin: "50% 50%" }}/>
    </div>
    <div style={{ maxWidth: 960, display: "flex", flexWrap: "wrap", gap: 14 }}>
      <label style={{ ...control, flex: 1 }}>Frame / {frame}
        <input aria-label="Brush material frame" type="range" min={0} max={220} value={frame}
          onChange={e => setFrame(Number(e.target.value))}/>
      </label>
      <label style={control}>Material
        <select aria-label="Microscope render mode" value={renderMode}
          onChange={e => setRenderMode(e.target.value as "wet" | "vector")}
          style={{ minHeight: 40, font: "inherit" }}>
          <option value="wet">Paper pigment</option><option value="vector">Earlier SVG</option>
        </select>
      </label>
      <label style={control}>Capillary spread / {bleed.toFixed(2)}
        <input aria-label="Microscope wet spread" type="range" min={0} max={1} step={.05} value={bleed}
          onChange={e => setBleed(Number(e.target.value))}/>
      </label>
      <label style={control}>Dryness / {dryness.toFixed(2)}
        <input aria-label="Material dryness" type="range" min={0} max={1} step={.05} value={dryness}
          onChange={e => setDryness(Number(e.target.value))}/>
      </label>
      <label style={control}>Ink load / {load.toFixed(2)}
        <input aria-label="Material ink load" type="range" min={.2} max={1} step={.05} value={load}
          onChange={e => setLoad(Number(e.target.value))}/>
      </label>
      <label style={control}>Zoom / {zoom.toFixed(2)}×
        <input aria-label="Material zoom" type="range" min={1} max={2.5} step={.25} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}/>
      </label>
      <label style={control}>Paper seed
        <input aria-label="Material seed" type="number" min={0} max={2147483647} value={seed}
          onChange={e => setSeed(Math.max(0, Math.min(2147483647, Math.floor(Number(e.target.value) || 0))))}/>
      </label>
    </div>
    <p style={{ maxWidth: 890, fontSize: 13, margin: 0 }}>
      Deterministic pigment and water deposition on a seeded absorbent paper model.
      Compare the raster pigment mode with the earlier SVG renderer. This is still a bounded
      visual approximation, not a laboratory-validated Xuan-paper fluid simulation.
    </p>
  </div>;
}
const meta = {
  title: "Video production/Film Looks/Chinese Ink/Ink Brush", id: "video-ink-brush",
  component: BrushMaterialMicroscope, parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BrushMaterialMicroscope>;
export default meta;
export const BrushContactMicroscope: StoryObj<typeof BrushMaterialMicroscope> = {
  name: "INK1 · Brush Material Microscope",
  render: () => <BrushMaterialMicroscope />,
};
