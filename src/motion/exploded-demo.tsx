import { useCallback, useMemo, useState } from "react";
import { Color, CylinderGeometry, DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial, PlaneGeometry, Scene, TorusGeometry } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ExplodedView3D } from "../../registry/motion/exploded-view-3d";
import { createExplodedTimeline } from "../../registry/motion/exploded-view";
import type { AssemblyPart3D } from "../../registry/motion/exploded-view";
import { createCameraRig3D } from "../../registry/motion/camera-rig-3d";
import { StoryboardShots } from "../../registry/motion/storyboard-shots";
import type { Storyboard } from "../../registry/motion/storyboard";
import { MotionScrubber, usePrefersReducedMotion } from "./react";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";

const PARTS: readonly AssemblyPart3D[] = [
  { id: "base", label: "Base", position: [0, 0.28, 0], offset: [0, 0, 0], anchor: [-1.4, 0.2, 0], labelSide: "left" },
  { id: "carrier", parentId: "base", label: "Carrier", position: [0, 0.6, 0], offset: [0, 0.7, 0], anchor: [-1.2, 0.15, 0], labelSide: "left" },
  { id: "core", parentId: "carrier", label: "Core", position: [0, 0.55, 0], offset: [0, 1, 0], rotationOffset: [0, 15, 0], anchor: [0.85, 0.25, 0], labelSide: "right" },
  { id: "spacer", parentId: "core", label: "Spacer", position: [0, 0.55, 0], offset: [0, 0.8, 0], anchor: [-1, 0, 0], labelSide: "left" },
  { id: "cover", parentId: "spacer", label: "Cover", position: [0, 0.35, 0], offset: [0, 1, 0], rotationOffset: [0, -15, 0], anchor: [1.2, 0.15, 0], labelSide: "right" },
  { id: "pin-a", parentId: "carrier", label: "Pin A", position: [-1.15, 0.35, 0], rotation: [0, 0, 90], offset: [0, 1.4, 0], offsetSpace: "local", labelSide: "left" },
  { id: "pin-b", parentId: "carrier", label: "Pin B", position: [1.15, 0.35, 0], rotation: [0, 0, -90], offset: [0, 1.4, 0], offsetSpace: "local", labelSide: "right" },
];
const EXPLOSION = createExplodedTimeline({
  id: "assembly-study", parts: PARTS, fps: { num: 30, den: 1 }, durationFrames: 720,
  separate: { startFrame: 75, endFrame: 240 }, reassemble: { startFrame: 480, endFrame: 660 }, staggerFrames: 10,
});
const OUTPUTS = { landscape: { width: 1280, height: 720 }, portrait: { width: 720, height: 1280 }, square: { width: 960, height: 960 } };
const BEATS = [
  [0, 75, "Assembled", "Establish the complete form before moving any part."],
  [75, 240, "Separate in sequence", "Parts separate with authored overlap. Nested children inherit their parent's movement while adding their own local offsets."],
  [240, 360, "Inspect the layers", "Hold the exploded state and orbit the camera. Label anchors remain attached to the current part transforms."],
  [360, 480, "Inspect another side", "Continue around the assembly. Hidden labels follow the chosen occlusion policy, while visible labels pack into safe columns."],
  [480, 660, "Reassemble", "Reverse the staging order and return every part to its authored assembled transform."],
  [660, 720, "Resolve", "Hold the restored assembly. Scrubbing backward reproduces the same part poses without accumulated offsets."],
] as const;
const BOARD: Storyboard = {
  schemaVersion: 1, id: "assembly-direction", title: "Exploded assembly", fps: EXPLOSION.fps, durationFrames: 720,
  shots: BEATS.map(([start, end, title, objective], index) => ({ id: `assembly-shot-${index}`, sceneRef: "assembly-study", startFrame: start,
    durationFrames: end - start, claim: title, visualObjective: objective, focusTarget: "assembly", onScreenLabels: [title], staticFallback: objective })),
};

function createEnvironment(root: Group) {
  const scene = new Scene();
  scene.background = new Color("#e7ecf2");
  root.rotation.y = -0.15;
  const floorGeometry = new PlaneGeometry(200, 200);
  const floorMaterial = new MeshStandardMaterial({ color: "#d9e1ea", roughness: 0.85 });
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  scene.add(floor, new HemisphereLight("#ffffff", "#66788e", 2.6));
  const key = new DirectionalLight("#fff2e2", 4.5);
  key.position.set(6, 10, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 8; key.shadow.camera.bottom = -5;
  key.shadow.normalBias = 0.025;
  const rim = new DirectionalLight("#b9d6ff", 3);
  rim.position.set(-5, 5, -5); scene.add(key, rim);
  return { scene, dispose() { floorGeometry.dispose(); floorMaterial.dispose(); key.shadow.map?.dispose(); } };
}

export default function ExplodedDemo() {
  const [frame, setFrame] = useState(0);
  const [aspect, setAspect] = useState<keyof typeof OUTPUTS>("landscape");
  const [separationScale, setSeparationScale] = useState(1);
  const [occlusion, setOcclusion] = useState<"hide" | "show-through">("hide");
  const [materialTheme, setMaterialTheme] = useState<"theme-a" | "theme-b">("theme-a");
  const reducedMotion = usePrefersReducedMotion();
  const camera = useMemo(() => {
    const close = aspect === "portrait" ? 8.5 : 12;
    const wide = aspect === "portrait" ? 11 : 17;
    const initial = { target: [0, 1.5, 0] as const, distance: close, azimuth: 35, elevation: 22 };
    return createCameraRig3D({ id: `assembly-camera-${aspect}`, fps: EXPLOSION.fps, durationFrames: EXPLOSION.durationFrames,
      keyframes: [
        { frame: 0, ...initial }, { frame: 74, ...initial },
        { frame: 239, target: [0, 3, 0], distance: wide, azimuth: 55, elevation: 16 },
        { frame: 359, target: [0, 3, 0], distance: wide, azimuth: 125, elevation: 26 },
        { frame: 479, target: [0, 3, 0], distance: wide, azimuth: 205, elevation: 20 },
        { frame: 659, ...initial, azimuth: 340 }, { frame: 719, ...initial, azimuth: 395 },
      ],
    });
  }, [aspect]);
  const createPart = useCallback((part: AssemblyPart3D) => {
    const geometry = part.id === "base" ? new CylinderGeometry(1.65, 1.75, 0.45, 80)
      : part.id === "carrier" ? new RoundedBoxGeometry(2.7, 0.3, 2.7, 4, 0.1)
      : part.id === "core" ? new CylinderGeometry(0.88, 0.88, 0.7, 64)
      : part.id === "spacer" ? new TorusGeometry(1.05, 0.12, 20, 80)
      : part.id === "cover" ? new CylinderGeometry(1.5, 1.5, 0.22, 80)
      : new CylinderGeometry(0.11, 0.11, 0.8, 24);
    const accent = materialTheme === "theme-a" ? "#365d91" : "#97704b";
    const material = new MeshStandardMaterial({ color: ["core", "cover"].includes(part.id) ? accent : part.id === "base" ? "#334255" : "#c5ced8", metalness: 0.62, roughness: 0.25 });
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    if (part.id === "spacer") mesh.rotation.x = Math.PI / 2;
    return { object: mesh, dispose() { geometry.dispose(); material.dispose(); } };
  }, [materialTheme]);
  const annotationOptions = useMemo(() => ({ occlusion, labelWidth: aspect === "portrait" ? 140 : 174, labelHeight: 44, inset: 24, gap: 10 }), [occlusion, aspect]);
  return <div className="flex min-w-0 flex-col gap-5">
    <div className="flex flex-wrap justify-between gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Assembly output aspect">
        {(Object.keys(OUTPUTS) as Array<keyof typeof OUTPUTS>).map((value) => <Button key={value} size="sm" variant={aspect === value ? "primary" : "outline"} aria-pressed={aspect === value} onClick={() => setAspect(value)}>{value === "landscape" ? "16:9" : value === "portrait" ? "9:16" : "1:1"}</Button>)}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Assembly material theme">
        {(["theme-a", "theme-b"] as const).map((value, index) => <Button key={value} size="sm" variant={materialTheme === value ? "primary" : "outline"} aria-pressed={materialTheme === value} onClick={() => setMaterialTheme(value)}>Theme {index === 0 ? "A" : "B"}</Button>)}
      </div>
    </div>
    <div className="mx-auto w-full overflow-hidden rounded-surface border border-border" style={{ maxWidth: aspect === "portrait" ? 560 : aspect === "square" ? 800 : undefined }}>
      <ExplodedView3D parts={PARTS} timeline={EXPLOSION} cameraTimeline={camera} frame={frame} {...OUTPUTS[aspect]}
        createPart={createPart} createEnvironment={createEnvironment} separationScale={separationScale}
        annotationOptions={annotationOptions} annotationTheme={{ surface: "#f7f9fc", ink: "#243347", line: "#71849c", fontSize: 22 }}
        ariaLabel="Seven-part assembly separates in stages, is inspected by an orbiting camera, then reassembles in reverse order. Parts: base, carrier, core, spacer, cover, and two pins." />
    </div>
    <div className="grid items-center gap-5 rounded-surface border border-border bg-surface p-4 md:grid-cols-2">
      <Slider label="Separation spacing" min={0} max={1.4} step={0.05} value={separationScale} onValueChange={(value) => setSeparationScale(Array.isArray(value) ? value[0] : value)} formatValue={(value) => `${value.toFixed(2)}×`} showValue />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Annotation occlusion policy">
        <Button size="sm" variant={occlusion === "hide" ? "primary" : "outline"} aria-pressed={occlusion === "hide"} onClick={() => setOcclusion("hide")}>Hide occluded labels</Button>
        <Button size="sm" variant={occlusion === "show-through" ? "primary" : "outline"} aria-pressed={occlusion === "show-through"} onClick={() => setOcclusion("show-through")}>Show through</Button>
      </div>
    </div>
    <MotionScrubber timeline={EXPLOSION} frame={frame} onFrame={setFrame} label="Assembly frame" />
    <StoryboardShots storyboard={BOARD} frame={reducedMotion ? 719 : frame} onFrameChange={setFrame} label="Assembly storyboard beats" />
  </div>;
}
