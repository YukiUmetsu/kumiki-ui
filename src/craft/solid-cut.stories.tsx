import { useCallback, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BoxGeometry, Color, Mesh, Scene } from "three";
import { compileCameraPoses } from "../../registry/motion/camera-pose-3d";
import { lookAtQuaternion } from "../../registry/motion/camera-spatial";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import { createCraftSolidCuts } from "../../registry/craft/solid-cut";
import type { CraftSolidCutSpec } from "../../registry/craft/solid-cut";
import { createCraftDetailKit } from "../../registry/craft/detail-kit";
import type { CraftDetailSpec } from "../../registry/craft/detail-kit";
import { createCraftMaterialKit } from "../../registry/craft/material-kit";
import { createCraftStudio } from "../../registry/craft/studio-kit";

const MODELS = {
  architecture: {
    title: "Architectural window panel",
    purpose: "Actual through-windows, revealed back wall and mounted metal trim",
    spec: { schemaVersion: 1, id: "window-panel", body: { width: 4.4, height: 2.7, depth: .44 }, quality: "hero",
      apertures: [
        { id: "left-window", face: "front", at: [-.25, .045], shape: "rectangle", width: 1.06, height: 1.48, through: true },
        { id: "right-window", face: "front", at: [.25, .045], shape: "rectangle", width: 1.06, height: 1.48, through: true },
      ] } satisfies CraftSolidCutSpec,
    details: { schemaVersion: 1, id: "window-trims", body: { width: 4.4, height: 2.7, depth: .44 }, features: [
      { id: "left-seal", kind: "seam-frame", face: "front", at: [-.25, .045], width: 1.14, height: 1.56, thickness: .053 },
      { id: "right-seal", kind: "seam-frame", face: "front", at: [.25, .045], width: 1.14, height: 1.56, thickness: .053 },
      { id: "mount-a", kind: "fastener", face: "front", at: [-.47, .44], radius: .075, drive: "hex" },
      { id: "mount-b", kind: "fastener", face: "front", at: [.47, .44], radius: .075, drive: "hex" },
    ] } satisfies CraftDetailSpec,
  },
  enclosure: {
    title: "Precision-machined enclosure",
    purpose: "Blind sockets and a genuine ventilation aperture through the host body",
    spec: { schemaVersion: 1, id: "enclosure-solid", body: { width: 4.3, height: 1.85, depth: 2.3 }, quality: "hero",
      apertures: [
        { id: "port-a", face: "front", at: [-.31, .11], shape: "round", radius: .34, depth: .6 },
        { id: "port-b", face: "front", at: [.31, .11], shape: "round", radius: .34, depth: .6 },
        { id: "vent-opening", face: "front", at: [0, -.31], shape: "rectangle", width: 1.25, height: .26, through: true },
      ] } satisfies CraftSolidCutSpec,
    details: { schemaVersion: 1, id: "enclosure-trims", body: { width: 4.3, height: 1.85, depth: 2.3 }, features: [
      { id: "service-seam", kind: "seam-frame", face: "top", at: [0, 0], width: 4, height: 2.05, thickness: .035 },
      { id: "fastener-a", kind: "fastener", face: "front", at: [-.44, -.37], radius: .05, drive: "cross" },
      { id: "fastener-b", kind: "fastener", face: "front", at: [.44, -.37], radius: .05, drive: "cross" },
    ] } satisfies CraftDetailSpec,
  },
} as const;

function SolidCutShowcase({ initial = "architecture" }: { initial?: keyof typeof MODELS }) {
  const [variant, setVariant] = useState<keyof typeof MODELS>(initial);
  const [frame, setFrame] = useState(20);
  const [showTrim, setShowTrim] = useState(true);
  const [showInterior, setShowInterior] = useState(true);
  const model = MODELS[variant];
  const timeline = useMemo(() => compileCameraPoses({
    id: `solid-cuts-${variant}`, cameraId: "solid-cuts-camera", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, f) => {
      const t = f / 120, angle = -.29 + t * .68;
      const radius = variant === "architecture" ? 6.5 : 7.2;
      const position: [number, number, number] = [Math.sin(angle) * radius, 1.0 + .3 * t, Math.cos(angle) * radius];
      const focus: [number, number, number] = [0, 0, 0];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: 31 }, near: .05, far: 50,
        focusDistance: radius };
    }),
  }), [variant]);
  const createScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color("#0e1820");
    const kit = createCraftMaterialKit({ overrides: {
      "painted-metal": { color: variant === "architecture" ? "#59646d" : "#222c34", roughness: .39 },
      "soft-touch": { color: "#0b1824" },
    } });
    const solid = createCraftSolidCuts(model.spec, { material: kit.get("painted-metal") });
    scene.add(solid.mesh);
    const details = showTrim ? createCraftDetailKit(model.details, { materials: kit }) : null;
    if (details) scene.add(details.group);
    const studio = createCraftStudio({ mood: "cinematic", ground: true, groundY: -model.spec.body.height / 2 - .1,
      background: "#192934" });
    scene.add(studio.group);
    const backgroundGeometries: BoxGeometry[] = [];
    if (showInterior) {
      const wall = new BoxGeometry(5.5, 3.5, .04);
      backgroundGeometries.push(wall);
      const interior = new Mesh(wall, kit.get("soft-touch"));
      interior.position.z = variant === "architecture" ? -.75 : -1.6;
      interior.name = "behind-real-openings";
      scene.add(interior);
      for (const [x, y, z] of variant === "architecture"
        ? [[-1.1, -.3, -.63], [1.1, -.3, -.63]] : [[0, -.4, -1.45]]) {
        const geom = new BoxGeometry(.55, .66, .06);
        backgroundGeometries.push(geom);
        const indicator = new Mesh(geom, kit.get("indicator"));
        indicator.position.set(x, y, z); indicator.name = "visible-behind-aperture";
        scene.add(indicator);
      }
    }
    return { scene, dispose() {
      solid.dispose(); details?.dispose(); studio.dispose(); kit.dispose();
      for (const geom of backgroundGeometries) geom.dispose(); scene.clear();
    } };
  }, [model, showTrim, showInterior, variant]);

  return <main style={{ background: "#0b121a", color: "#eef4f5", minHeight: "100vh", padding: "clamp(20px, 4vw, 54px)", fontFamily: "sans-serif" }}>
    <div style={{ maxWidth: 1150, margin: "0 auto" }}>
      <p style={{ letterSpacing: ".15em", fontSize: 12, textTransform: "uppercase", color: "#93c4c7" }}>3D asset toolkit / BVH-CSG solid construction</p>
      <h1 style={{ fontWeight: 500, fontSize: "clamp(28px, 4vw, 44px)", margin: "10px 0" }}>The openings go all the way through.</h1>
      <p style={{ color: "#a9bbc8", lineHeight: 1.6, maxWidth: 810 }}>{model.purpose}. The dark cavities are not painted rectangles: they are computed geometry; details reuse Kumiki's approved material and surface kit.</p>
      <div style={{ marginTop: 25, border: "1px solid #304c57", borderRadius: 12, overflow: "hidden" }}>
        <CameraViewport3D timeline={timeline} frame={frame} cameraId="solid-cuts-camera" cameraMode="pose" createScene={createScene}
          width={1600} height={900} ariaLabel="Through apertures and blind bores visible as the camera moves" style={{ width: "100%" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 24, marginTop: 22 }}>
        <label style={{ display: "grid", gap: 8 }}>Construction
          <select value={variant} onChange={event => setVariant(event.target.value as keyof typeof MODELS)} style={{ padding: 10, background: "#20323d", color: "inherit" }}>
            <option value="architecture">Architectural window panel</option>
            <option value="enclosure">Machined enclosure</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 8, flex: "1 1 240px" }}>Camera frame · {frame}
          <input type="range" min="0" max="120" value={frame} onChange={event => setFrame(Number(event.target.value))} />
        </label>
        <label><input type="checkbox" checked={showTrim} onChange={event => setShowTrim(event.target.checked)} /> Detail trim</label>
        <label><input type="checkbox" checked={showInterior} onChange={event => setShowInterior(event.target.checked)} /> Behind the opening</label>
      </div>
      <p style={{ color: "#94a9b4", fontSize: 13, maxWidth: 800, lineHeight: 1.6, marginTop: 20 }}>This adapter makes boolean cuts in authored box solids. It does not cut arbitrary imported meshes or guarantee manifold output for every cutter arrangement. GPU close-up visual approval is pending.</p>
    </div>
  </main>;
}

const meta = { title: "3D asset toolkit/Actual Solid Cutouts", id: "craft-solid-cutouts", component: SolidCutShowcase,
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof SolidCutShowcase>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Architecture: Story = {};
export const Enclosure: Story = { args: { initial: "enclosure" } };
