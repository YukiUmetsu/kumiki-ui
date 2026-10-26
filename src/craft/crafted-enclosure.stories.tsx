import { useCallback, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Color, Scene } from "three";
import { compileCameraPoses } from "../../registry/motion/camera-pose-3d";
import { lookAtQuaternion } from "../../registry/motion/camera-spatial";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import { createCraftedEnclosure } from "../../registry/craft/enclosure-kit";
import { createCraftStudio } from "../../registry/craft/studio-kit";
import { createCraftEnvironment } from "../../registry/craft/environment-kit";
import type { CraftLightingMood } from "../../registry/craft/studio-kit";

function Crafted3DShowcase({ initialPortrait = false }: { initialPortrait?: boolean }) {
  const [frame, setFrame] = useState(28);
  const [mood, setMood] = useState<CraftLightingMood>("studio");
  const [quality, setQuality] = useState<"hero" | "supporting">("hero");
  const [portrait, setPortrait] = useState(initialPortrait);
  const camera = useMemo(() => compileCameraPoses({
    id: "crafted-enclosure-preview", cameraId: "camera3d", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, frame) => {
      const theta = .45 + frame / 120 * 1.1;
      const position: [number, number, number] = [Math.sin(theta) * 5.4, 2.15, Math.cos(theta) * 5.4];
      const focus: [number, number, number] = [0, -.025, 0];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: portrait ? 41 : 35 },
        near: .1, far: 100, focusDistance: 5.6 };
    }),
  }), [portrait]);
  const createScene = useCallback(() => {
    const scene = new Scene();
    scene.background = new Color("#19242c");
    const device = createCraftedEnclosure({ id: "product", quality, ports: 4 });
    const studio = createCraftStudio({ mood, scale: 1, groundY: -.45, background: "#1c2931" });
    const environment = createCraftEnvironment({ mood: mood === "cinematic" ? "warm" : mood === "technical" ? "cool" : "neutral" });
    const restoreEnvironment = environment.apply(scene);
    scene.add(device.group, studio.group);
    return { scene, dispose() { restoreEnvironment(); environment.dispose(); device.dispose(); studio.dispose(); scene.clear(); } };
  }, [mood, quality]);

  return <div style={{ minHeight: "100vh", padding: "clamp(20px, 4vw, 56px)",
    background: "var(--km-surface-canvas, #111820)", color: "var(--km-text-primary, #edf5f6)" }}>
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <p style={{ textTransform: "uppercase", letterSpacing: ".18em", fontSize: 12, opacity: .65 }}>
        Crafted 3D / Material and construction reference
      </p>
      <h1 style={{ fontSize: "clamp(30px, 4vw, 52px)", fontWeight: 400, margin: "12px 0" }}>
        Designed surfaces. Physical details.
      </h1>
      <p style={{ maxWidth: 720, lineHeight: 1.7, opacity: .75, marginBottom: 28 }}>
        Inspect the enclosure from multiple angles. Independent PBR surfaces, machined seams,
        physical port contacts, screws, ventilation, and studio lighting replace primitive-only models.
      </p>
      <div style={{ width: portrait ? "min(100%, 440px)" : "100%", margin: "0 auto", borderRadius: 16,
        overflow: "hidden", border: "1px solid rgba(156,177,190,.22)" }}>
        <CameraViewport3D timeline={camera} frame={frame} cameraMode="pose" cameraId="camera3d"
          createScene={createScene} width={portrait ? 900 : 1600} height={portrait ? 1600 : 900}
          ariaLabel="3D inspection of a manufactured enclosure with vents, contacts, screws and materials"
          style={{ width: "100%" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 24, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 8, minWidth: 210, flex: 1 }}>
          Camera position / {frame}
          <input aria-label="Camera position" type="range" min={0} max={120} value={frame}
            onChange={event => setFrame(Number(event.target.value))} />
        </label>
        <label style={{ display: "grid", gap: 8 }}>
          Light direction
          <select value={mood} onChange={event => setMood(event.target.value as CraftLightingMood)}
            style={{ padding: "10px 14px" }}>
            <option value="studio">Studio</option><option value="technical">Technical</option>
            <option value="cinematic">Cinematic</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 8 }}>
          Detail fidelity
          <select value={quality} onChange={event => setQuality(event.target.value as "hero" | "supporting")}
            style={{ padding: "10px 14px" }}>
            <option value="hero">Hero / close-up</option><option value="supporting">Supporting / distant</option>
          </select>
        </label>
        <label style={{ display: "flex", gap: 9, padding: "10px 0" }}>
          <input type="checkbox" checked={portrait} onChange={event => setPortrait(event.target.checked)} />
          Portrait composition
        </label>
      </div>
    </div>
  </div>;
}

const meta = { title: "3D asset toolkit/3D Constructed Enclosure", id: "craft-3d-constructed-enclosure", component: Crafted3DShowcase,
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof Crafted3DShowcase>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Inspection: Story = {};
export const Portrait: Story = { args: { initialPortrait: true } };
