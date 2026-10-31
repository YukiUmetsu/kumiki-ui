import { useCallback, useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Color, Scene, SRGBColorSpace, Texture } from "three";
import { compileCameraPoses } from "../../registry/motion/camera-pose-3d";
import { lookAtQuaternion } from "../../registry/motion/camera-spatial";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import { createDepthComposite } from "../../registry/craft/depth-composite";
import type { DepthCompositeAssets, DepthCompositeSpec } from "../../registry/craft/depth-composite";
import backgroundUrl from "../video/assets/nature-jungle-clean-depth.png?url";
import canopyUrl from "../video/assets/nature-canopy-branch-depth.png?url";

/** Existing authored foreground and clean plate. The depth here is deliberately
 * flat synthetic demo data; a production pack supplies inspected ComfyUI depth.
 */
function useJungleLayers(): { assets: DepthCompositeAssets | null; error: string | null } {
  const [assets, setAssets] = useState<DepthCompositeAssets | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const load = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load ${url}`));
      image.src = url;
    });
    Promise.all([load(backgroundUrl), load(canopyUrl)]).then(([background, canopy]) => {
      if (!active) return;
      const asTexture = (image: HTMLImageElement | HTMLCanvasElement) => {
        const texture = new Texture(image); texture.colorSpace = SRGBColorSpace; texture.needsUpdate = true;
        return texture;
      };
      // Three alphaMap uses the green channel. Convert the PNG's genuine alpha
      // channel to grayscale rather than using its green foliage pigment.
      const matteCanvas = document.createElement("canvas");
      matteCanvas.width = canopy.naturalWidth; matteCanvas.height = canopy.naturalHeight;
      const context = matteCanvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(canopy, 0, 0);
      const image = context.getImageData(0, 0, matteCanvas.width, matteCanvas.height);
      const opaqueCanvas = document.createElement("canvas");
      opaqueCanvas.width = matteCanvas.width; opaqueCanvas.height = matteCanvas.height;
      const opaqueContext = opaqueCanvas.getContext("2d");
      if (!opaqueContext) return;
      const opaquePixels = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
      for (let i = 0; i < image.data.length; i += 4) {
        const alpha = image.data[i + 3];
        // The color texture is full-opacity so its alpha is not multiplied by
        // the grayscale alphaMap a second time at fine antialiased edges.
        opaquePixels.data[i + 3] = 255;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = alpha;
        image.data[i + 3] = 255;
      }
      opaqueContext.putImageData(opaquePixels, 0, 0);
      context.putImageData(image, 0, 0);
      const matte = new Texture(matteCanvas); matte.needsUpdate = true;
      const pixels = new Uint8Array(16 * 9 * 4);
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 127;
        pixels[i + 3] = 255;
      }
      const depth = { width: 16, height: 9, rgba: pixels };
      setAssets({ background: { color: asTexture(background), depth },
        canopy: { color: asTexture(opaqueCanvas), depth, alpha: matte } });
    }).catch(() => { if (active) setError("The authored image layers could not be loaded. Check the Storybook asset URLs."); });
    return () => { active = false; };
  }, []);
  useEffect(() => () => {
    if (assets) for (const asset of Object.values(assets)) {
      asset.color.dispose(); asset.alpha?.dispose();
    }
  }, [assets]);
  return { assets, error };
}

function DepthCompositeShowcase() {
  const { assets, error } = useJungleLayers();
  const [frame, setFrame] = useState(0);
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [reliefEnabled, setReliefEnabled] = useState(true);
  const timeline = useMemo(() => compileCameraPoses({
    id: "jungle-depth-composite-shot", cameraId: "jungle-camera", fps: { num: 30, den: 1 },
    poses: Array.from({ length: 121 }, (_, frame) => {
      const t = frame / 120;
      const position: [number, number, number] = [-.27 + .54 * t, .035, 4.15 - .08 * t];
      const focus: [number, number, number] = [0, 0, -.14];
      return { position, focus, orientation: lookAtQuaternion(position, focus),
        projection: { kind: "perspective" as const, fov: 33 }, near: .05, far: 20,
        focusDistance: 4.2 };
    }),
  }), []);
  const createScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color("#101a17");
    if (!assets) return { scene, dispose() { scene.clear(); } };
    const spec: DepthCompositeSpec = {
      schemaVersion: 1, id: "authored-jungle-2-5d",
      layers: [
        { id: "background", width: 4.8, height: 2.68, at: [0, 0, -.45],
          depthScale: reliefEnabled ? .045 : 0, segmentsX: 72, segmentsY: 40, edgeFeather: .05 },
        { id: "canopy", width: 4.8, height: 2.68, at: [0, 0, .1],
          depthScale: reliefEnabled ? .09 : 0, segmentsX: 72, segmentsY: 40, edgeFeather: .05,
          shadow: shadowEnabled ? { receiverId: "background", offset: [-.06, -.09],
            opacity: .2, softness: .018 } : undefined },
      ],
    };
    const composite = createDepthComposite(spec, assets);
    scene.add(composite.group);
    return { scene, dispose() { composite.dispose(); scene.clear(); } };
  }, [assets, shadowEnabled, reliefEnabled]);
  return <main style={{ background: "#0c1211", color: "#eef4eb", minHeight: "100vh", padding: "clamp(20px, 4vw, 55px)", fontFamily: "sans-serif" }}>
    <section style={{ maxWidth: 1160, margin: "0 auto" }}>
      <p style={{ fontSize: 12, color: "#b1d7ae", letterSpacing: ".15em", textTransform: "uppercase" }}>2.5D / layered occlusion</p>
      <h1 style={{ fontWeight: 500, fontSize: "clamp(28px, 4vw, 44px)", margin: "12px 0" }}>Real foreground edges, layered camera depth.</h1>
      <p style={{ color: "#b1c2b4", lineHeight: 1.6, maxWidth: 800, marginBottom: 28 }}>
        The foreground canopy is a genuine cutout over an independently authored clean jungle plate.
        Depth ordering and a soft matte-projected shadow run inside the same Three.js scene.
        These demonstration depth maps are flat—not measured ComfyUI estimates or an approved production shot.
      </p>
      <div style={{ border: "1px solid #30443a", borderRadius: 12, overflow: "hidden" }}>
        {error ? <div role="alert" style={{ aspectRatio: "16/9", display: "grid", placeItems: "center" }}>{error}</div> : assets ? <CameraViewport3D timeline={timeline} frame={frame} cameraMode="pose" cameraId="jungle-camera"
          createScene={createScene} width={1600} height={900} ariaLabel="2.5D jungle shot with real canopy cutout and depth-based foreground occlusion"
          style={{ width: "100%" }} /> : <div role="status" style={{ aspectRatio: "16/9", display: "grid", placeItems: "center" }}>Loading authored image layers…</div>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 30, marginTop: 22 }}>
        <label style={{ display: "grid", gap: 6, flex: "1 1 300px" }}>Absolute camera frame: {frame}
          <input type="range" min="0" max="120" value={frame} onChange={event => setFrame(Number(event.target.value))} />
        </label>
        <label><input type="checkbox" checked={shadowEnabled} onChange={event => setShadowEnabled(event.target.checked)} /> Projected contact shadow</label>
        <label><input type="checkbox" checked={reliefEnabled} onChange={event => setReliefEnabled(event.target.checked)} /> Shallow image relief</label>
      </div>
      <p style={{ color: "#91a598", lineHeight: 1.6, maxWidth: 840, fontSize: 13 }}>
        Production requirement: inspect an actual same-framing RGB depth map and a green-channel grayscale alpha matte.
        Generate a clean background plate where foreground removal reveals previously hidden pixels; no compositor can infer those pixels.
      </p>
    </section>
  </main>;
}

const meta = { title: "3D asset toolkit/2.5D Depth Composite", id: "craft-25d-depth-composite",
  component: DepthCompositeShowcase, parameters: { layout: "fullscreen" } } satisfies Meta<typeof DepthCompositeShowcase>;
export default meta;
type Story = StoryObj<typeof meta>;
export const LayeredJungle: Story = {};
