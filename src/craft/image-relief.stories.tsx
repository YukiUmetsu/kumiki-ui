import { useCallback, useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Color, Scene, SRGBColorSpace, Texture } from "three";
import { compileCameraPoses } from "../../registry/motion/camera-pose-3d";
import { lookAtQuaternion } from "../../registry/motion/camera-spatial";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import { createImageRelief } from "../../registry/craft/image-relief";
import type { ReliefDepthPixels } from "../../registry/craft/image-relief";
import forestUrl from "../video/assets/follow-forest.jpg?url";

/** The bundled photo demonstrates the adapter; production depth should come from
 * a real depth estimator and be inspected, not inferred from image brightness. */
function useExampleRelief() {
  const [assets, setAssets] = useState<{ texture: Texture; depth: ReliefDepthPixels } | null>(null);
  useEffect(() => {
    const image = new Image();
    let alive = true;
    image.onload = () => {
      if (!alive) return;
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 256;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const map = new Uint8Array(rgba.length);
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const brightness = (rgba[i] * .2126 + rgba[i + 1] * .7152 + rgba[i + 2] * .0722) / 255;
        const near = Math.max(0, Math.min(1, .84 - brightness * .7 + y / canvas.height * .2));
        map[i] = map[i + 1] = map[i + 2] = Math.round(near * 255);
        map[i + 3] = 255;
      }
      const texture = new Texture(image);
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;
      setAssets({ texture, depth: { width: canvas.width, height: canvas.height, rgba: map } });
    };
    image.src = forestUrl;
    return () => { alive = false; image.onload = null; };
  }, []);
  useEffect(() => () => { assets?.texture.dispose(); }, [assets]);
  return assets;
}

function ImageReliefShowcase() {
  const assets = useExampleRelief();
  const [frame, setFrame] = useState(0);
  const [depthScale, setDepthScale] = useState(.28);
  const timeline = useMemo(() => compileCameraPoses({
    id: "image-relief-shot", cameraId: "relief-camera", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, frame) => {
      const t = frame / 120;
      const x = -.37 + t * .74, y = .05 + Math.sin(t * Math.PI) * .05;
      const position: [number, number, number] = [x, y, 4.35 - .15 * t];
      const focus: [number, number, number] = [0, 0, 0];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: 31 }, near: .05, far: 20, focusDistance: 4.35 };
    }),
  }), []);
  const createScene = useCallback(() => {
    const scene = new Scene();
    scene.background = new Color("#0c1820");
    if (!assets) return { scene, dispose() { scene.clear(); } };
    const relief = createImageRelief({
      schemaVersion: 1, id: "forest-relief", width: 4.8, height: 2.4,
      depthScale, segmentsX: 240, segmentsY: 120,
      depthChannel: "red", smoothRadius: 2, edgeFeather: .05,
    }, assets.depth, { color: assets.texture, lighting: "baked" });
    scene.add(relief.mesh);
    return { scene, dispose() { relief.dispose(); scene.clear(); } };
  }, [assets, depthScale]);

  return <main style={{ background: "#0a1016", color: "#f1f5f5", minHeight: "100vh", padding: "clamp(24px, 4vw, 56px)", fontFamily: "sans-serif" }}>
    <div style={{ maxWidth: 1160, margin: "0 auto" }}>
      <p style={{ letterSpacing: ".18em", fontSize: 12, color: "#88b9b2", textTransform: "uppercase" }}>2.5D asset craft / image relief</p>
      <h1 style={{ fontWeight: 500, fontSize: "clamp(28px, 4vw, 45px)", margin: "10px 0 12px" }}>A photograph with camera depth.</h1>
      <p style={{ color: "#a9b9bf", maxWidth: 740, lineHeight: 1.6, marginBottom: 30 }}>
        Camera movement reveals a physically displaced image plane. The same geometry can use a ComfyUI depth map and cutout mask. This gallery uses an illustrative brightness-derived depth map, not production-ready depth reconstruction.
      </p>
      <div style={{ overflow: "hidden", borderRadius: 12, border: "1px solid #2c4651" }}>
        {assets ? <CameraViewport3D timeline={timeline} frame={frame} cameraMode="pose" cameraId="relief-camera"
          createScene={createScene} width={1600} height={900} ariaLabel="Depth-relief forest moving under a frame-addressed sideways camera"
          style={{ width: "100%" }} /> : <div role="status" style={{ aspectRatio: "16 / 9", display: "grid", placeItems: "center" }}>Preparing image…</div>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 28, marginTop: 26 }}>
        <label style={{ flex: "2 1 280px", display: "grid", gap: 9 }}>Camera frame · {frame}
          <input type="range" min="0" max="120" value={frame} onChange={event => setFrame(Number(event.target.value))} aria-label="Frame" />
        </label>
        <label style={{ flex: "1 1 220px", display: "grid", gap: 9 }}>Depth strength · {depthScale.toFixed(2)}
          <input type="range" min="0" max="0.6" step="0.02" value={depthScale} onChange={event => setDepthScale(Number(event.target.value))} aria-label="Depth strength" />
        </label>
      </div>
      <p style={{ fontSize: 13, color: "#8ea2ac", maxWidth: 740, lineHeight: 1.6 }}>
        For actual productions: provide a depth map generated from the source image, inspect occlusion boundaries, use foreground cutouts for large camera moves, and keep any text as a separate sharp overlay.
      </p>
    </div>
  </main>;
}

const meta = { title: "3D asset toolkit/2.5D Image Relief", id: "craft-25d-image-relief", component: ImageReliefShowcase,
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof ImageReliefShowcase>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CameraInspection: Story = {};
