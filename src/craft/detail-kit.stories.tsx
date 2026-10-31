import { useCallback, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Color, Mesh, Scene } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createCraftMaterialKit } from "../../registry/craft/material-kit";
import { createCraftDetailKit } from "../../registry/craft/detail-kit";
import type { CraftDetailSpec } from "../../registry/craft/detail-kit";
import { createCraftStudio } from "../../registry/craft/studio-kit";
import { createCraftEnvironment } from "../../registry/craft/environment-kit";
import { compileCameraPoses } from "../../registry/motion/camera-pose-3d";
import { lookAtQuaternion } from "../../registry/motion/camera-spatial";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";

const SHOWCASES: Record<string, { title: string; subline: string; bodyColor: string; spec: CraftDetailSpec }> = {
  instrument: {
    title: "Field instrument", subline: "Manufactured enclosure · fasteners · ventilation · ergonomic ribbing",
    bodyColor: "#293d45",
    spec: { schemaVersion: 1, id: "field-instrument-details", body: { width: 4, height: 1.8, depth: 2.6 }, features: [
      { kind: "seam-frame", id: "service-seal", face: "front", at: [0, 0], width: 3.6, height: 1.45, thickness: .048 },
      { kind: "vent-bank", id: "cooling-grill", face: "front", at: [-.13, -.17], width: 1.5, height: .32, slots: 12 },
      { kind: "ribbed-grip", id: "top-grip", face: "top", at: [0, 0], width: 2.4, height: 1.35, count: 26 },
      { kind: "fastener", id: "service-screw-left", face: "front", at: [-.42, .38], radius: .065, drive: "hex" },
      { kind: "fastener", id: "service-screw-right", face: "front", at: [.42, .38], radius: .065, drive: "hex" },
      { kind: "seam-frame", id: "side-seal", face: "right", at: [0, 0], width: 1.9, height: 1.25, thickness: .04 },
    ] },
  },
  architecture: {
    title: "Architectural service hatch", subline: "Perforated faceplate · metal bezel · sealed mounting frame",
    bodyColor: "#707b7d",
    spec: { schemaVersion: 1, id: "architectural-service-details", body: { width: 4.2, height: 3, depth: .35 }, features: [
      { kind: "seam-frame", id: "weatherproof-closure", face: "front", at: [0, 0], width: 3.8, height: 2.7, thickness: .09 },
      { kind: "vent-bank", id: "exhaust-louvers", face: "front", at: [0, 0], width: 3.05, height: 1.45, slots: 16 },
      { kind: "fastener", id: "upper-left", face: "front", at: [-.42, .42], radius: .07, drive: "slot" },
      { kind: "fastener", id: "upper-right", face: "front", at: [.42, .42], radius: .07, drive: "slot" },
      { kind: "fastener", id: "lower-left", face: "front", at: [-.42, -.42], radius: .07, drive: "slot" },
      { kind: "fastener", id: "lower-right", face: "front", at: [.42, -.42], radius: .07, drive: "slot" },
    ] },
  },
  audio: {
    title: "Desktop audio enclosure", subline: "Machined screw sockets · ventilation channels · tactile grip",
    bodyColor: "#1c242c",
    spec: { schemaVersion: 1, id: "audio-enclosure-details", body: { width: 4.4, height: 1.2, depth: 2.2 }, features: [
      { kind: "seam-frame", id: "panel-joint", face: "front", at: [0, 0], width: 4, height: 1.02, thickness: .04 },
      { kind: "ribbed-grip", id: "upper-surface", face: "top", at: [-.15, 0], width: 2.5, height: 1.35, count: 30 },
      { kind: "vent-bank", id: "upper-air-exit", face: "top", at: [.31, -.2], width: 1.05, height: .32, slots: 13 },
      { kind: "fastener", id: "screw-a", face: "front", at: [-.43, .36], radius: .04, drive: "cross" },
      { kind: "fastener", id: "screw-b", face: "front", at: [.43, .36], radius: .04, drive: "cross" },
    ] },
  },
};

function DetailShowcase({ initial = "instrument" }: { initial?: keyof typeof SHOWCASES }) {
  const [scenario, setScenario] = useState(initial);
  const [frame, setFrame] = useState(35);
  const [quality, setQuality] = useState<"hero" | "supporting">("hero");
  const item = SHOWCASES[scenario];
  const timeline = useMemo(() => compileCameraPoses({
    id: "craft-detail-camera", cameraId: "camera3d", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, frame) => {
      const a = .04 + frame / 120 * .96;
      const distance = scenario === "architecture" ? 7.4 : 6.8;
      const elevation = scenario === "architecture" ? .68 : 1.9;
      const position: [number, number, number] = [Math.sin(a) * distance, elevation, Math.cos(a) * distance];
      const focus: [number, number, number] = [0, 0, 0];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: scenario === "architecture" ? 32 : 34 },
        near: .05, far: 100, focusDistance: distance };
    }),
  }), [scenario]);
  const createScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color("#131d25");
    const materials = createCraftMaterialKit({ overrides: { "molded-polymer": { color: item.bodyColor } } });
    const spec = { ...item.spec, quality };
    const detail = createCraftDetailKit(spec, { materials });
    const { width, height, depth } = spec.body;
    const bodyGeometry = new RoundedBoxGeometry(width, height, depth, quality === "hero" ? 4 : 2,
      Math.min(.095, height * .09, depth * .12));
    const body = new Mesh(bodyGeometry, materials.get("molded-polymer"));
    body.name = "host-solid"; body.castShadow = true; body.receiveShadow = true;
    const studio = createCraftStudio({ mood: scenario === "architecture" ? "technical" : "cinematic",
      groundY: -height / 2 - .08, scale: 1, background: "#1b2830" });
    const environment = createCraftEnvironment({ mood: scenario === "architecture" ? "cool" : "warm" });
    const restore = environment.apply(scene);
    scene.add(body, detail.group, studio.group);
    return { scene, dispose() { scene.remove(body, detail.group, studio.group); detail.dispose();
      bodyGeometry.dispose(); studio.dispose(); restore(); environment.dispose(); materials.dispose(); scene.clear(); } };
  }, [item, quality, scenario]);

  return <main style={{ minHeight: "100vh", background: "#0b131a", color: "#edf3f6", padding: "clamp(24px, 4vw, 52px)", fontFamily: "sans-serif" }}>
    <div style={{ margin: "auto", maxWidth: 1150 }}>
      <p style={{ color: "#91c1c0", letterSpacing: ".15em", textTransform: "uppercase", fontSize: 12 }}>3D asset toolkit / Detail grammar</p>
      <h1 style={{ fontSize: "clamp(29px, 4vw, 49px)", fontWeight: 500, margin: "10px 0" }}>Crafted, not hand-coded every time.</h1>
      <p style={{ maxWidth: 720, color: "#9fb0ba", lineHeight: 1.6, marginBottom: 26 }}>{item.subline}. The details are separate physical meshes attached to authored faces, driven by a small typed spec.</p>
      <div style={{ borderRadius: 13, overflow: "hidden", border: "1px solid #35515b" }}>
        <CameraViewport3D timeline={timeline} frame={frame} cameraMode="pose" cameraId="camera3d"
          createScene={createScene} width={1600} height={900} ariaLabel={`3D construction inspection: ${item.title}`}
          style={{ width: "100%" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 24, marginTop: 24 }}>
        <label style={{ display: "grid", gap: 8, flex: "1 1 180px" }}>Application
          <select value={scenario} onChange={event => setScenario(event.target.value)} style={{ color: "inherit", background: "#202f38", padding: 12 }}>
            <option value="instrument">Field instrument</option><option value="architecture">Service hatch</option><option value="audio">Audio enclosure</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 8, flex: "2 1 260px" }}>Camera / frame {frame}
          <input type="range" min="0" max="120" value={frame} onChange={event => setFrame(Number(event.target.value))} />
        </label>
        <label style={{ display: "grid", gap: 8, flex: "1 1 160px" }}>Geometry tier
          <select value={quality} onChange={event => setQuality(event.target.value as "hero" | "supporting")}
            style={{ color: "inherit", background: "#202f38", padding: 12 }}>
            <option value="hero">Hero</option><option value="supporting">Supporting</option>
          </select>
        </label>
      </div>
      <p style={{ fontSize: 13, color: "#90a6b3", marginTop: 21, lineHeight: 1.6 }}>
        Vents have actual openings through their own faceplates. For a transparent host cavity or true host-wall cutout, model the host aperture separately. Visual review of final close-up renders is pending.
      </p>
    </div>
  </main>;
}
const meta = { title: "3D asset toolkit/Procedural Detail Kit", id: "craft-3d-detail-kit", component: DetailShowcase,
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof DetailShowcase>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FieldInstrument: Story = {};
export const Architecture: Story = { args: { initial: "architecture" } };
export const Audio: Story = { args: { initial: "audio" } };
