import type { Meta, StoryObj } from "@storybook/react-vite";
import { FilmLookLayer } from "../../registry/video/film-look-react";
import { LOOK_MOODS, LOOK_PRESETS, LOOK_PRESET_IDS, resolveLook } from "../../registry/video/film-look";
import type { LookMood, LookPresetId } from "../../registry/video/film-look";
import { StudioCaption } from "../../registry/visual/studio-recipes-react";

/** A test card for a look: a dusk sky with a bright sun (glow and streaks), a grey ramp and colour patches (the grade), skin tones and
 * a title (type and legibility). */
function TestCard({ width, height, frame }: { width: number; height: number; frame: number }) {
  const patches = ["#735244", "#c29682", "#627a9d", "#576c43", "#8580b1", "#67bdaa", "#d67e2c", "#505ba6", "#c15a63", "#5e3c6c", "#9dbc40", "#e0a32e", "#383d96", "#469449", "#af363c", "#e7c71f", "#bb5695", "#0885a1"];
  return <div style={{ position: "absolute", inset: 0, containerType: "size", background: "linear-gradient(180deg, #1d2b52 0%, #6b5b8e 38%, #e79a6a 62%, #3a2a2a 63%, #1a1514 100%)" }}>
    <div style={{ position: "absolute", left: "68%", top: "44%", width: "7cqh", height: "7cqh", borderRadius: "50%", background: "radial-gradient(circle, #fff 0 55%, #ffe8c0 70%, rgba(255,200,150,0) 100%)" }} />
    <div style={{ position: "absolute", left: "8%", right: "8%", top: "70%", height: "6%", background: "linear-gradient(90deg, #000, #fff)" }} />
    <div style={{ position: "absolute", left: "8%", right: "40%", top: "79%", height: "13%", display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: "0.6cqh" }}>
      {patches.map(c => <div key={c} style={{ background: c }} />)}
    </div>
    <div style={{ position: "absolute", left: "64%", right: "8%", top: "79%", height: "13%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6cqh" }}>
      {["#f3d3c3", "#d8a98c", "#a8714f", "#5c3a28"].map(c => <div key={c} style={{ background: c, borderRadius: "1cqh" }} />)}
    </div>
    <StudioCaption position="top" beat={{ text: "Every frame tells", sub: "A test card for a look", enter: 0 }} frame={frame + 20} />
    <div style={{ position: "absolute", inset: 0, width, height }} />
  </div>;
}
function Card({ preset, mood, frame = 30, width = 960, height = 540 }: { preset: LookPresetId; mood?: LookMood[]; frame?: number; width?: number; height?: number }) {
  const look = resolveLook({ preset, mood });
  return <div style={{ position: "relative", width, height, overflow: "hidden", background: "#000" }}>
    <FilmLookLayer look={look} frame={frame} fps={30} width={width} height={height} seed={3}><TestCard width={width} height={height} frame={frame} /></FilmLookLayer>
  </div>;
}

const meta = { title: "Video production/Film Looks", id: "video-film-looks", component: Card, parameters: { layout: "fullscreen" },
  argTypes: { preset: { control: "select", options: LOOK_PRESET_IDS }, mood: { control: "check", options: LOOK_MOODS }, frame: { control: { type: "range", min: 0, max: 120 } } } } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OneLook: Story = { args: { preset: "warm-35mm", mood: [], frame: 30 } };
export const AllLooks: Story = { args: { preset: "studio-clean" }, render: () => <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 480px)", gap: 8, padding: 8, background: "#111" }}>
  {LOOK_PRESET_IDS.map(id => <figure key={id} style={{ margin: 0 }}><Card preset={id} width={480} height={270} />
    <figcaption style={{ color: "#ddd", font: "600 13px system-ui", padding: "4px 2px" }}>{LOOK_PRESETS[id].title} · <span style={{ fontWeight: 400, opacity: .75 }}>{id}</span></figcaption></figure>)}
</div> };
export const Moods: Story = { name: "Moods on Warm 35 mm", args: { preset: "warm-35mm" }, render: () => <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 480px)", gap: 8, padding: 8, background: "#111" }}>
  {([[], ...LOOK_MOODS.map(m => [m])] as LookMood[][]).map(m => <figure key={m.join() || "none"} style={{ margin: 0 }}><Card preset="warm-35mm" mood={m} width={480} height={270} />
    <figcaption style={{ color: "#ddd", font: "600 13px system-ui", padding: "4px 2px" }}>{m[0] ?? "no mood"}</figcaption></figure>)}
</div> };
