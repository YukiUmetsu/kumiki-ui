import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShaderFxLayer } from "../../registry/video/shader-fx-react";
import type { ShaderFxEffect, ShaderFxSpec, ShaderFxTreatment } from "../../registry/video/shader-fx";
import { SHADER_FX_EFFECTS } from "../../registry/video/shader-fx";
import waterfall from "../../examples/film/assets/iceland/seljalandsfoss.jpg?url";
import terraces from "../../examples/film/assets/iceland/dynjandi.jpg?url";
import lagoon from "../../examples/film/assets/iceland/jokulsarlon.jpg?url";
import drop from "../../examples/film/assets/water-mark.svg?url";

const fps = { num: 30, den: 1 }, duration = 300;
const photo = (id: string, src: string) => ({ id, src, alt: id, licenseRef: "commons-" + id + "-cc0", width: 1800, height: 1090 });

/** Each effect in the job it was built for: a subject on screen, and text in a safe area it never covers. */
interface Scene { kicker: string; title: string; backdrop?: string; /** How dark the band behind the words is. High-contrast effects need more. */ scrim?: number; spec: (treatment: ShaderFxTreatment) => ShaderFxSpec }
const SCENES: Readonly<Record<ShaderFxEffect, Scene>> = {
  "mesh-gradient": { kicker: "Chapter 2", title: "Where the meltwater goes",
    spec: treatment => ({ id: "chapter", effect: "mesh-gradient", layer: "background", treatment, seed: 3 }) },
  "liquid-metal": { kicker: "Identity", title: "A mark that catches the light",
    spec: treatment => ({ id: "mark", effect: "liquid-metal", layer: "overlay", treatment, seed: 3, image: { id: "drop", src: drop, alt: "A water drop", licenseRef: "original-kumiki-example" }, region: { x: .36, y: .08, width: .28, height: .5 } }) },
  "god-rays": { kicker: "Environment reveal", title: "Light reaches the lagoon", backdrop: lagoon,
    spec: treatment => ({ id: "light", effect: "god-rays", layer: "overlay", treatment, seed: 3 }) },
  "grain-gradient": { kicker: "Evidence", title: "Every claim on screen names its source",
    spec: treatment => ({ id: "document", effect: "grain-gradient", layer: "background", treatment, seed: 3 }) },
  water: { kicker: "The source", title: "The fall is only the middle of the river",
    spec: treatment => ({ id: "river", effect: "water", layer: "background", treatment, seed: 3, image: photo("seljalandsfoss", waterfall) }) },
  "halftone-dots": { kicker: "Field photograph", title: "Dynjandi, west Iceland", scrim: .94,
    spec: treatment => ({ id: "print", effect: "halftone-dots", layer: "background", treatment, seed: 3, image: photo("dynjandi", terraces) }) },
};
const LIGHT_MESH = ["#f4efe4", "#e7dcc8", "#d8e4e2", "#efe7d6"];

interface FrameProps { effect: ShaderFxEffect; treatment: ShaderFxTreatment; frame: number; portrait?: boolean; light?: boolean; reducedMotion?: boolean; text?: string; lang?: string; width?: number }
function Shot({ effect, treatment, frame, portrait = false, light = false, reducedMotion = false, text, lang = "en", width }: FrameProps) {
  const scene = SCENES[effect], base = scene.spec(treatment);
  const spec = light && effect === "mesh-gradient" ? { ...base, params: { colors: LIGHT_MESH } } as ShaderFxSpec : base;
  const w = width ?? (portrait ? 360 : 960), h = portrait ? w * 16 / 9 : w * 9 / 16, ink = light ? "#1c2b3a" : "#fff";
  const safe: CSSProperties = { position: "absolute", left: "8%", right: "8%", bottom: portrait ? "10%" : "9%", display: "grid", gap: 6, color: ink };
  return <div style={{ position: "relative", width: w, height: h, overflow: "hidden", borderRadius: 10, background: light ? "#f4efe4" : "#0a1a28" }}>
    {scene.backdrop && <img src={scene.backdrop} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
    <ShaderFxLayer key={effect + treatment + light} spec={spec} frame={frame} fps={fps} hostDurationFrames={duration} reducedMotion={reducedMotion} />
    {/* A soft scrim behind the words only, so the effect keeps the frame and the text stays readable. */}
    <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", background: light ? "linear-gradient(transparent, rgba(244,239,228,.85))" : `linear-gradient(transparent, rgba(4,12,20,${scene.scrim ?? .72}) 55%)` }} />
    <div style={safe} lang={lang}>
      <span style={{ font: `600 ${Math.max(12, w / 64)}px/1.3 var(--km-font-body, system-ui)`, letterSpacing: ".08em", textTransform: "uppercase", opacity: .85 }}>{scene.kicker}</span>
      <span style={{ font: `700 ${Math.max(18, w / (portrait ? 14 : 28))}px/1.2 var(--km-font-body, system-ui)`, lineBreak: "strict", wordBreak: "auto-phrase" as CSSProperties["wordBreak"] }}>{text ?? scene.title}</span>
    </div>
  </div>;
}
function Scrub({ children }: { children: (frame: number) => ReactNode }) {
  const [frame, setFrame] = useState(60);
  return <div style={{ padding: 16, display: "grid", gap: 12, font: "16px/1.45 var(--km-font-body, system-ui)" }}>
    <label style={{ display: "flex", gap: 12, alignItems: "center", maxWidth: 960 }}>Frame {frame}
      <input type="range" min={0} max={duration - 1} value={frame} onChange={event => setFrame(Number(event.target.value))} style={{ flex: 1 }} /></label>
    {children(frame)}
  </div>;
}
function Lab(props: Omit<FrameProps, "frame">) { return <Scrub>{frame => <Shot {...props} frame={frame} />}</Scrub>; }
/** The three editorial strengths side by side, so the restraint of `subtle` is visible next to `hero`. */
function Treatments({ effect }: { effect: ShaderFxEffect }) {
  return <Scrub>{frame => <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
    {(["subtle", "standard", "hero"] as const).map(treatment => <figure key={treatment} style={{ margin: 0, display: "grid", gap: 6 }}>
      <Shot effect={effect} treatment={treatment} frame={frame} width={360} /><figcaption>{treatment}</figcaption></figure>)}
  </div>}</Scrub>;
}

const meta = { title: "Video production/Shader FX", id: "video-shader-fx", component: Lab,
  args: { effect: "mesh-gradient", treatment: "subtle", portrait: false, light: false, reducedMotion: false },
  argTypes: { effect: { control: "select", options: SHADER_FX_EFFECTS }, treatment: { control: "inline-radio", options: ["subtle", "standard", "hero"] } } } satisfies Meta<typeof Lab>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Pick any effect, strength, shape and theme. */
export const Effects: Story = {};
export const MeshGradientChapterCard: Story = { args: { effect: "mesh-gradient", treatment: "standard" } };
export const LiquidMetalMark: Story = { args: { effect: "liquid-metal", treatment: "standard" } };
export const GodRaysEnvironmentReveal: Story = { args: { effect: "god-rays", treatment: "standard" } };
export const GrainGradientEvidence: Story = { args: { effect: "grain-gradient", treatment: "standard" } };
export const WaterOnAPhotograph: Story = { args: { effect: "water", treatment: "standard" } };
export const HalftonePrint: Story = { args: { effect: "halftone-dots", treatment: "standard" } };
export const TreatmentsSideBySide: Story = { args: { effect: "god-rays" }, render: args => <Treatments effect={args.effect} /> };
export const Portrait: Story = { args: { effect: "water", treatment: "standard", portrait: true } };
export const LongJapaneseOnLight: Story = { args: { text: "氷河が溶けると、川の流れは一年を通して変わります。", lang: "ja", light: true, portrait: true } };
export const LongEnglish: Story = { args: { effect: "grain-gradient", text: "When the glacier melts faster than the snow can replace it, every river below it changes through the whole year." } };
export const ReducedMotion: Story = { args: { effect: "water", treatment: "hero", reducedMotion: true } };
