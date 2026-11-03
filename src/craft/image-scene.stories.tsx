import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Color, Mesh, MeshNormalMaterial, Scene } from "three";
import { loadGltfHero } from "../../registry/craft/hero-gltf";
import type { GltfHeroFactory } from "../../registry/craft/hero-gltf";
import { compileCameraPoses } from "../../registry/motion/camera-pose-3d";
import { lookAtQuaternion } from "../../registry/motion/camera-spatial";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import { VideoExportStage } from "../../registry/video/video-export-stage";
import { Button, Page, Panel, Slider, ink, useFramePlayer } from "../house-math/house-ui";
import modelUrl from "./fixtures/image-scene/benchmark-full.glb?url";
import frontUrl from "./fixtures/image-scene/source-views/front.jpg?url";
import sideUrl from "./fixtures/image-scene/source-views/side.jpg?url";
import backUrl from "./fixtures/image-scene/source-views/back.jpg?url";

type Shot = "push-in" | "orbit" | "oblique";
const labels: Record<Shot, string> = { "push-in": "Push-in", orbit: "Orbit", oblique: "Oblique" };
const duration = 180;

function PhotographicScene() {
  const [factory, setFactory] = useState<GltfHeroFactory | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [shot, setShot] = useState<Shot>("push-in");
  const [portrait, setPortrait] = useState(false);
  const [geometry, setGeometry] = useState(false);
  const [exposure, setExposure] = useState(1);
  const [reduced, setReduced] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const player = useFramePlayer(duration, { loop: true });
  const frame = reduced ? duration - 1 : player.frame;
  const width = portrait ? 1080 : 1920, height = portrait ? 1920 : 1080;
  useEffect(() => {
    const element = preview.current; if (!element) return;
    const observer = new ResizeObserver(() => setPreviewWidth(element.clientWidth));
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    let alive = true, loaded: GltfHeroFactory | undefined;
    loadGltfHero(modelUrl, { license: "MNHNL, CC BY 4.0" }).then(result => {
      loaded = result;
      if (alive) setFactory(() => result); else result.release();
    }).catch(reason => { if (alive) setError(String(reason instanceof Error ? reason.message : reason)); });
    return () => { alive = false; loaded?.release(); };
  }, [retry]);
  const camera = useMemo(() => {
    if (!factory) return null;
    const instance = factory(); const bounds = instance.bounds; instance.dispose();
    const center = bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2) as [number, number, number];
    const radius = Math.hypot(...bounds.max.map((value, axis) => value - bounds.min[axis])) / 2;
    // Frame the bounding sphere in both aspects. These are inspection paths, not coverage certification.
    const verticalHalf = 20 * Math.PI / 180;
    const limitingHalf = Math.min(verticalHalf, Math.atan(Math.tan(verticalHalf) * width / height));
    const distance = radius / Math.sin(limitingHalf) * 1.12;
    const timeline = compileCameraPoses({ id: `photographic-${shot}`, cameraId: "subject", fps: { num: 30, den: 1 },
      poses: Array.from({ length: duration }, (_, index) => {
        const t = index / (duration - 1), eased = t * t * (3 - 2 * t);
        const yaw = (shot === "orbit" ? -45 + 90 * eased : shot === "oblique" ? 20 + 25 * eased : 0) * Math.PI / 180;
        const pitch = (shot === "oblique" ? 12 + 15 * eased : 12) * Math.PI / 180;
        const d = distance * (shot === "push-in" ? 1.2 - .2 * eased : 1);
        const position: [number, number, number] = [center[0] + Math.sin(yaw) * Math.cos(pitch) * d, center[1] + Math.sin(pitch) * d, center[2] + Math.cos(yaw) * Math.cos(pitch) * d];
        return { position, focus: center, orientation: lookAtQuaternion(position, center), projection: { kind: "perspective" as const, fov: 40 }, near: radius / 100, far: radius * 100, focusDistance: d };
      }) });
    return { timeline, bounds, radius };
  }, [factory, shot, width, height]);
  const createScene = useCallback(() => {
    const scene = new Scene(); scene.background = new Color(ink.bg);
    if (!factory) return { scene, dispose() { scene.clear(); } };
    const subject = factory(); const normals = geometry ? new MeshNormalMaterial() : undefined;
    subject.group.traverse(node => { if (node instanceof Mesh) { node.castShadow = false; node.receiveShadow = false; if (normals) node.material = normals; } });
    scene.add(subject.group);
    return { scene, dispose() { subject.dispose(); normals?.dispose(); scene.clear(); } };
  }, [factory, geometry]);
  return <Page kicker="Real photographs → reconstructed mesh" title="Photographic scene study" intro="202 overlapping photographs form one detailed fossil mesh. Inspect the original photographs, then move around its reconstructed surface. Visual acceptance is pending.">
    <Panel>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {(Object.keys(labels) as Shot[]).map(value => <Button key={value} active={shot === value} onClick={() => { setShot(value); player.seek(0); }}>{labels[value]}</Button>)}
        <Button active={portrait} onClick={() => setPortrait(value => !value)}>Portrait</Button>
        <Button active={geometry} onClick={() => setGeometry(value => !value)}>Geometry only</Button>
      </div>
      <div ref={preview} style={{ maxWidth: portrait ? 420 : "100%", width: "100%", margin: "0 auto", aspectRatio: `${width}/${height}`, background: ink.bg, overflow: "hidden", borderRadius: 8 }}>
        {camera && factory ? <div style={{ width, height, transform: `scale(${previewWidth / width})`, transformOrigin: "top left" }}><VideoExportStage manifest={{ schemaVersion: 1, id: `image-scene-${shot}`, width, height, durationFrames: duration, fps: { num: 30, den: 1 } }} frame={frame} onSeek={next => { if (reduced) throw new Error("Disable reduced motion before exporting a moving inspection shot."); player.seek(next); }}>
          <CameraViewport3D timeline={camera.timeline} cameraId="subject" cameraMode="pose" frame={frame} createScene={createScene}
            width={width} height={height} pixelRatio={1} near={camera.radius / 100} far={camera.radius * 100}
            reducedMotion={false} cameraLightingPhysicalLights={false} toneMapping="linear" exposure={exposure}
            ariaLabel={`Reconstructed fossil, ${labels[shot]} inspection`} style={{ width: "100%" }} />
        </VideoExportStage></div> : error ? <div role="alert" style={{ padding: 24 }}>Unable to load the reconstructed model: {error}<br /><Button onClick={() => { setError(""); setRetry(value => value + 1); }}>Retry model load</Button></div>
          : <div role="status" style={{ padding: 24 }}>Loading the 8K photographic mesh…</div>}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" disabled={!factory || reduced} onClick={player.playing ? player.pause : player.resume}>{player.playing ? "Pause" : "Play"}</button>
        <label style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 260px" }}>Frame {frame} / 179
          <input aria-label="Camera frame" type="range" min={0} max={179} value={frame} disabled={reduced || !factory} onChange={event => player.seek(Number(event.target.value))} style={{ flex: 1, minWidth: 100 }} />
        </label>
        <Slider label="Exposure" value={exposure} min={.5} max={1.5} step={.05} onChange={setExposure} />
      </div>
      <p style={{ margin: 0, color: ink.sub, lineHeight: 1.5 }}>{reduced ? "Reduced motion: holding the final frame. " : "6 seconds · 30 fps · 100,000 triangles · 8K photographic texture. "}Lighting is baked into the photograph; exposure changes brightness.</p>
    </Panel>
    <Panel title="Held-out source photographs">
      <p style={{ margin: 0, color: ink.sub, lineHeight: 1.5 }}>These real views were excluded from reconstruction and texturing. The inspection camera above is not registered to these photographs.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 16 }}>
        {[[frontUrl, "Front"], [sideUrl, "Side"], [backUrl, "Reverse"]].map(([url, label]) => <figure key={label} style={{ margin: 0 }}><img src={url} alt={`${label} held-out photograph of the same fossil with capture background`} style={{ display: "block", width: "100%", aspectRatio: "3/2", objectFit: "contain", background: "#050505", borderRadius: 8 }} /><figcaption style={{ marginTop: 8 }}>{label} reference</figcaption></figure>)}
      </div>
    </Panel>
    <Panel title="Review status and provenance">
      <p style={{ margin: 0, lineHeight: 1.6 }}>This is the full-detail reconstruction benchmark, prepared with native automatic masking. A separate prepared-mask experiment retains support-wire pixels in some views. Fine edges, unobserved surfaces and macro detail still need review; these camera previews do not certify surface coverage or photo-perfect output. The one-call pipeline remains in development.</p>
      <p style={{ margin: 0, lineHeight: 1.6 }}>Photographs and reconstructed mesh © MNHNL · <a href="https://creativecommons.org/licenses/by/4.0/" style={{ color: ink.accent }}>CC BY 4.0</a> · <a href="https://data.public.lu/en/datasets/3d-reconstruction-of-a-fossil-vre-gpr21-via-photogrammetry/" style={{ color: ink.accent }}>Original capture dataset</a>. Mesh reconstructed with RealityKit and converted with Blender; source references resized.</p>
    </Panel>
  </Page>;
}
const meta = { title: "3D asset toolkit/Multi-view Photographic Scene", id: "craft-image-scene", component: PhotographicScene,
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof PhotographicScene>;
export default meta;
type Story = StoryObj<typeof meta>;
export const RealPhotographs: Story = {};
