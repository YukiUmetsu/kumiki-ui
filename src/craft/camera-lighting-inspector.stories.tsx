import { useCallback, useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BoxGeometry, CanvasTexture, Color, Mesh, MeshStandardMaterial, Scene, SphereGeometry, SRGBColorSpace } from "three";
import { CameraLightingInspector } from "../../registry/motion/camera-lighting-inspector";
import { DEFAULT_CAMERA_LIGHTING_PRESET, type CameraLightingPreset } from "../../registry/motion/camera-lighting-preset";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import { compileCameraPoses } from "../../registry/motion/camera-pose-3d";
import { lookAtQuaternion } from "../../registry/motion/camera-spatial";
import { HeroAssetViewer } from "../../registry/craft/hero-viewer";
import { heroCatalogEntry } from "../../registry/domains/hero-catalog";
import { createImageRelief } from "../../registry/craft/image-relief";

type DemoKind = "crafted-hero" | "3d-scene" | "2.5d-relief";
const bounds = { min: [-2.2, -1.2, -1.2] as const, max: [2.2, 1.8, 1.2] as const };

const timeline = compileCameraPoses({
  id: "inspector-animated-shot", cameraId: "rig", fps: { num: 30, den: 1 },
  poses: Array.from({ length: 91 }, (_, frame) => {
    const position: [number, number, number] = [-1.2 + 2.4 * frame / 90, 1.2, 8];
    const focus: [number, number, number] = [0, 0, 0];
    return { position, focus, orientation: lookAtQuaternion(position, focus),
      projection: { kind: "perspective" as const, fov: 32 }, near: .05, far: 100, focusDistance: 8 };
  }),
});

function InspectorDemo({ kind = "3d-scene", portrait = false }: { kind?: DemoKind; portrait?: boolean }) {
  const initialPreset = useMemo<CameraLightingPreset>(() => ({
    ...DEFAULT_CAMERA_LIGHTING_PRESET,
    mode: kind === "2.5d-relief" ? "preview-offset" : "replace-shot",
    camera: kind === "2.5d-relief" ? { ...DEFAULT_CAMERA_LIGHTING_PRESET.camera, distanceFactor: 1, azimuthDeg: 0, elevationDeg: 0 } : DEFAULT_CAMERA_LIGHTING_PRESET.camera,
  }), [kind]);
  const [preset, setPreset] = useState<CameraLightingPreset>(initialPreset);
  useEffect(() => setPreset(initialPreset), [initialPreset]);
  const [frame, setFrame] = useState(45);
  const physicalLights = kind !== "2.5d-relief";
  const size = portrait ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
  const createHero = useCallback(() => heroCatalogEntry("bull-market").create({ id: "portable-rig-bull" }), []);
  const createScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color("#0b1d2a");
    const material = new MeshStandardMaterial({ color: "#c8ab7b", metalness: .48, roughness: .32 });
    const accent = new MeshStandardMaterial({ color: "#7ab9b9", metalness: .1, roughness: .42 });
    const sphereGeometry = new SphereGeometry(.92, 40, 28);
    const boxGeometry = new BoxGeometry(2.6, .32, 1.7);
    const sphere = new Mesh(sphereGeometry, material); sphere.position.y = .4; sphere.castShadow = true;
    const base = new Mesh(boxGeometry, accent); base.position.y = -.68; base.receiveShadow = true;
    scene.add(sphere, base);
    return { scene, dispose() { sphereGeometry.dispose(); boxGeometry.dispose(); material.dispose(); accent.dispose(); scene.clear(); } };
  }, []);
  const createReliefScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color("#10212a");
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas texture unavailable");
    const gradient = context.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, "#96c4cf"); gradient.addColorStop(.5, "#274e60"); gradient.addColorStop(1, "#091c2d");
    context.fillStyle = gradient; context.fillRect(0, 0, 256, 128);
    context.fillStyle = "#d5b87e"; context.beginPath(); context.arc(184, 28, 19, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#183944"; context.beginPath(); context.moveTo(0, 108); context.lineTo(84, 25);
    context.lineTo(140, 94); context.lineTo(188, 58); context.lineTo(256, 126); context.fill();
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
    const pixels = new Uint8Array(16 * 8 * 4);
    for (let i = 0; i < pixels.length / 4; i++) {
      const depth = Math.round(255 * (1 - i / (pixels.length / 4)));
      pixels.set([depth, depth, depth, 255], i * 4);
    }
    const relief = createImageRelief({ schemaVersion: 1, id: "portable-baked-relief", width: 4, height: 2,
      depthScale: .3, segmentsX: 48, segmentsY: 24 }, { width: 16, height: 8, rgba: pixels }, { color: texture, lighting: "baked" });
    scene.add(relief.mesh);
    return { scene, dispose() { relief.dispose(); texture.dispose(); scene.clear(); } };
  }, []);
  const sceneFactory = kind === "2.5d-relief" ? createReliefScene : createScene;
  const isAnimated = kind !== "crafted-hero";

  return <main style={{ minHeight: "100vh", background: "#07131b", color: "#e0e9ed", fontFamily: "Inter, system-ui, sans-serif",
    padding: "clamp(16px, 3vw, 38px)", boxSizing: "border-box" }}>
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      <p style={{ textTransform: "uppercase", letterSpacing: ".17em", color: "#77d5c0", fontSize: 11, margin: "0 0 8px" }}>3D asset toolkit / reusable controls</p>
      <h1 style={{ fontSize: "clamp(23px, 3vw, 37px)", fontWeight: 550, margin: "0 0 8px" }}>One inspector. Every shot.</h1>
      <p style={{ color: "#a2b6c2", maxWidth: 720, lineHeight: 1.5, fontSize: 14, margin: "0 0 24px" }}>
        Live camera and lighting adjustments stay outside the exported picture. Copy this exact preset into another viewer or scene.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", gap: "clamp(14px, 2.4vw, 28px)", alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <div data-km-video-capture="" style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #294451", background: "#0b1d2a",
            width: portrait ? "min(100%, 460px)" : "100%", margin: "0 auto" }}>
            {kind === "crafted-hero"
              ? <HeroAssetViewer createAsset={createHero} width={size.width} height={size.height} cameraLightingPreset={preset} actionFrame={frame} />
              : <CameraViewport3D timeline={timeline} frame={frame} cameraId="rig" cameraMode="pose" createScene={sceneFactory}
                  width={size.width} height={size.height} cameraLightingPreset={preset} cameraLightingBounds={kind === "2.5d-relief"
                    ? { min: [-2, -1, -.15], max: [2, 1, .15] } : bounds} cameraLightingPhysicalLights={physicalLights} />}
          </div>
          {isAnimated && <label style={{ display: "grid", gap: 8, marginTop: 18, fontSize: 12, color: "#b9cad4" }}>Authored animation frame · {frame}
            <input aria-label="Animation frame" type="range" min={0} max={90} value={frame} onChange={e => setFrame(Number(e.target.value))} style={{ accentColor: "#8bdbc9" }} />
          </label>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16, color: "#92acb7", fontSize: 12 }}>
            <span>● Absolute-frame camera</span><span>● Portable JSON v1</span><span>● {physicalLights ? "Live Three.js lights" : "Baked-image relighting disabled"}</span>
          </div>
        </div>
        <CameraLightingInspector value={preset} onChange={setPreset} onReset={() => setPreset(initialPreset)}
          capabilities={{ physicalLights }} />
      </div>
    </div>
  </main>;
}

const meta = { title: "3D asset toolkit/Portable Camera & Lighting Inspector", id: "craft-portable-camera-lighting-inspector",
  component: InspectorDemo, parameters: { layout: "fullscreen" } } satisfies Meta<typeof InspectorDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ThreeScene: Story = { args: { kind: "3d-scene" } };
export const CraftedHero: Story = { args: { kind: "crafted-hero" } };
export const BakedRelief2_5D: Story = { args: { kind: "2.5d-relief" } };
export const PortraitHero: Story = { args: { kind: "crafted-hero", portrait: true } };
