import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACESFilmicToneMapping, Color, DirectionalLight, Mesh, MeshPhysicalMaterial, PCFShadowMap, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, Scene, ShadowMaterial, SRGBColorSpace, WebGLRenderer,
} from "three";
import type { Material } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { AdvancedShapeMorphMesh } from "../../registry/motion/advanced-morph-three";
import type { MorphPose3D } from "../../registry/motion/advanced-morph-three";
import type { MorphTopologyStrategy } from "../../registry/motion/advanced-morph";
import { Slider } from "../ui/slider";
import { MotionScrubber } from "./react";
import { MORPH_DEMO_PRESETS, MORPH_DEMO_SHAPES } from "./advanced-shape-morph-shapes";
import {
  EasingSelect, MORPH_DEMO_FRAMES, PlanReadout, StrategyPicker, TEXT_PAIRS, easingById, selectClass, textFont,
  useAdvancedMorph, useMorphTimeline, useThemeVersion, useTracedText,
} from "./advanced-shape-morph-demo";

const POSES: { id: string; label: string; pose: { from: MorphPose3D; to: MorphPose3D } }[] = [
  { id: "turn", label: "Turn", pose: { from: { rotation: [0.12, -0.75, 0] }, to: { rotation: [0.12, 0.75, 0] } } },
  { id: "rise", label: "Rise from the floor", pose: { from: { position: [0, -0.95, 0.35], rotation: [-Math.PI / 2 + 0.02, 0, 0], scale: 0.85 }, to: { position: [0, 0, 0], rotation: [0.08, 0, 0] } } },
  { id: "fly", label: "Fly in", pose: { from: { position: [-1.5, 0.35, -1.6], rotation: [0.35, -1.1, 0.2], scale: 0.6 }, to: { position: [0, 0, 0.2], rotation: [0.1, 0.25, 0] } } },
  { id: "still", label: "Still (front)", pose: { from: { rotation: [0.1, 0.35, 0] }, to: { rotation: [0.1, 0.35, 0] } } },
];

const FINISHES: { id: string; label: string; make: (accent: Color) => Material }[] = [
  { id: "lacquer", label: "Lacquer", make: (accent) => new MeshPhysicalMaterial({ color: accent, roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.22 }) },
  { id: "metal", label: "Brushed metal", make: () => new MeshPhysicalMaterial({ color: new Color(0.78, 0.76, 0.72), roughness: 0.3, metalness: 1 }) },
  { id: "clay", label: "Matte clay", make: () => new MeshPhysicalMaterial({ color: new Color(0.86, 0.82, 0.76), roughness: 0.92, metalness: 0 }) },
];

const SOURCES = [
  ...MORPH_DEMO_PRESETS.map((preset) => ({ id: `shape:${preset.id}`, label: `Shape: ${preset.label}` })),
  ...TEXT_PAIRS.map((pair) => ({ id: `text:${pair.id}`, label: `Text: ${pair.from} → ${pair.to}` })),
];

/** Resolve a CSS colour token (any syntax the browser knows, including oklch) through a 1 × 1 canvas. */
function cssColor(element: Element, name: string, fallback: string): Color {
  const value = getComputedStyle(element).getPropertyValue(name).trim() || fallback;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Color(fallback);
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
}

interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  render: () => void;
  dispose: () => void;
}

function createStage(host: HTMLDivElement, canvas: HTMLCanvasElement): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const scene = new Scene();
  scene.background = cssColor(host, "--km-surface-inset", "#e7e2dc");
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.55;
  const key = new DirectionalLight(0xffffff, 2.4);
  key.position.set(2.2, 4.2, 3.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  scene.add(key);
  const ground = new Mesh(new PlaneGeometry(14, 14), new ShadowMaterial({ opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.18;
  ground.receiveShadow = true;
  scene.add(ground);
  const camera = new PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 0.55, 5.4);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, -0.1, 0);
  controls.enablePan = false;
  controls.minDistance = 2.5;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.update();
  const render = () => renderer.render(scene, camera);
  controls.addEventListener("change", render);
  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return {
    renderer, scene, camera, controls, render,
    dispose: () => {
      observer.disconnect();
      controls.removeEventListener("change", render);
      controls.dispose();
      ground.geometry.dispose();
      (ground.material as Material).dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

export interface AdvancedShapeMorph3DLabProps {
  initialSource?: string;
  initialPose?: string;
  initialProgress?: number;
}

/** The morph as an extruded solid that travels, turns and scales through a lit 3D scene. Drag to orbit. */
export function AdvancedShapeMorph3DLab({ initialSource = "text:kumiki", initialPose = "turn", initialProgress = 0.5 }: AdvancedShapeMorph3DLabProps) {
  const [sourceId, setSourceId] = useState(initialSource);
  const [poseId, setPoseId] = useState(initialPose);
  const [finishId, setFinishId] = useState("lacquer");
  const [strategy, setStrategy] = useState<MorphTopologyStrategy>("split-merge");
  const [easingId, setEasingId] = useState("cubic");
  const [depth, setDepth] = useState(0.18);
  const [frameIndex, setFrameIndex] = useState(Math.round(Math.min(1, Math.max(0, initialProgress)) * (MORPH_DEMO_FRAMES - 1)));
  const [webglError, setWebglError] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<Stage | null>(null);
  const meshRef = useRef<AdvancedShapeMorphMesh | null>(null);
  const progressRef = useRef(0);
  const timeline = useMorphTimeline();
  const progress = frameIndex / (MORPH_DEMO_FRAMES - 1);
  progressRef.current = progress;

  const [kind, key] = sourceId.split(":") as ["shape" | "text", string];
  const pair = TEXT_PAIRS.find((candidate) => candidate.id === key) ?? TEXT_PAIRS[0];
  const text = useTracedText(kind === "text" ? pair.from : "", kind === "text" ? pair.to : "", textFont("sans"));
  const preset = MORPH_DEMO_PRESETS.find((candidate) => candidate.id === key) ?? MORPH_DEMO_PRESETS[0];
  const inputs = useMemo(() => kind === "shape"
    ? { from: MORPH_DEMO_SHAPES[preset.from].input, to: MORPH_DEMO_SHAPES[preset.to].input, key: preset.id }
    : text ? { from: text.from, to: text.to, key: text.key } : null, [kind, preset, text]);
  const { ref, info } = useAdvancedMorph(inputs?.from ?? null, inputs?.to ?? null,
    { topologyStrategy: strategy, easing: easingById(easingId), resampleDensity: kind === "text" ? { spacing: 3, min: 16, max: 512 } : 160 },
    `${inputs?.key}|${strategy}|${easingId}`);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    try {
      stageRef.current = createStage(host, canvas);
    } catch (error) {
      setWebglError(error instanceof Error ? error.message : String(error));
      return;
    }
    return () => {
      stageRef.current?.dispose();
      stageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const morph = ref.current;
    const host = hostRef.current;
    if (!stage || !morph || !host || !info) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const pairOfRings of morph.correspondence()) {
      for (const ring of [pairOfRings.from, pairOfRings.to]) {
        for (let i = 0; i < ring.length; i += 2) {
          minX = Math.min(minX, ring[i]);
          maxX = Math.max(maxX, ring[i]);
          minY = Math.min(minY, ring[i + 1]);
          maxY = Math.max(maxY, ring[i + 1]);
        }
      }
    }
    const spanX = Number.isFinite(minX) ? Math.max(maxX - minX, 1e-6) : 1;
    const spanY = Number.isFinite(minY) ? Math.max(maxY - minY, 1e-6) : 1;
    const span = Math.max(spanX, spanY);
    // Fit about 3.2 world units of width and 2 of height, so wide text and square shapes both sit well in frame.
    const unitsPerWorld = Math.max(spanX / 3.2, spanY / 2);
    const finish = FINISHES.find((candidate) => candidate.id === finishId) ?? FINISHES[0];
    const material = finish.make(cssColor(host, "--km-action-primary", "#0b7a52"));
    const pose = POSES.find((candidate) => candidate.id === poseId) ?? POSES[0];
    const mesh = new AdvancedShapeMorphMesh(morph, { material, depth: depth * span, unitsPerWorld, pose: pose.pose, creaseAngle: 32 });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.update(progressRef.current);
    stage.scene.add(mesh);
    meshRef.current = mesh;
    stage.render();
    return () => {
      stage.scene.remove(mesh);
      mesh.dispose();
      material.dispose();
      if (meshRef.current === mesh) meshRef.current = null;
    };
  }, [info, ref, finishId, poseId, depth]);

  useEffect(() => {
    const mesh = meshRef.current;
    const stage = stageRef.current;
    if (!mesh || !stage) return;
    mesh.update(progress);
    stage.render();
  }, [progress, info]);

  const theme = useThemeVersion();
  useEffect(() => {
    const stage = stageRef.current;
    const host = hostRef.current;
    if (!stage || !host || theme === 0) return;
    stage.scene.background = cssColor(host, "--km-surface-inset", "#e7e2dc");
    stage.render();
  }, [theme]);

  const sourceLabel = SOURCES.find((source) => source.id === sourceId)?.label ?? sourceId;

  return (
    <div className="mx-auto flex max-w-6xl min-w-0 flex-col gap-6 [overflow-wrap:anywhere]">
      <header className="max-w-prose space-y-2">
        <h2 className="font-serif text-heading-sm font-normal text-foreground">Shape morph in 3D space</h2>
        <p className="text-body-sm text-muted-foreground">
          The same morph drives an extruded solid. Side walls keep crisp creases and smooth curves; caps are triangulated every frame, so
          parts and holes can appear and close. The pose travels through the scene with the morph’s easing. Drag to orbit.
        </p>
      </header>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="3D morph stage" className="flex min-w-0 flex-col gap-4">
          <figure className="m-0 flex min-w-0 flex-col gap-3 rounded-surface border border-border bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="text-body font-medium text-foreground">{sourceLabel.replace(/^(Shape|Text): /, "")}</p>
              <p className="font-mono text-title tabular-nums text-foreground">t {progress.toFixed(2)}</p>
            </div>
            <div ref={hostRef} className="relative aspect-[16/10] w-full overflow-hidden rounded-control bg-surface-inset">
              <canvas ref={canvasRef} role="img" className="block h-full w-full touch-none"
                aria-label={`${sourceLabel} as an extruded 3D solid, ${Math.round(progress * 100)} percent through the morph`} />
              {webglError ? (
                <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-body-sm text-muted-foreground">
                  WebGL is not available in this browser, so the 3D stage cannot draw. ({webglError})
                </p>
              ) : null}
            </div>
          </figure>
          <MotionScrubber timeline={timeline} frame={frameIndex} onFrame={setFrameIndex} label="Morph progress" />
        </section>
        <aside aria-label="3D morph configuration" className="flex min-w-0 flex-col gap-5 rounded-surface border border-border bg-surface p-4">
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Source
            <select className={selectClass} value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
              {SOURCES.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Path through space
            <select className={selectClass} value={poseId} onChange={(event) => setPoseId(event.target.value)}>
              {POSES.map((pose) => <option key={pose.id} value={pose.id}>{pose.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-body-sm text-foreground">Finish
            <select className={selectClass} value={finishId} onChange={(event) => setFinishId(event.target.value)}>
              {FINISHES.map((finish) => <option key={finish.id} value={finish.id}>{finish.label}</option>)}
            </select>
          </label>
          <Slider label="Depth" min={0.04} max={0.5} step={0.02} value={depth} showValue
            formatValue={(value) => `${Math.round(value * 100)}% of width`} onValueChange={(value) => setDepth(Array.isArray(value) ? value[0] ?? 0.18 : value)} />
          <StrategyPicker value={strategy} onChange={setStrategy} />
          <EasingSelect value={easingId} onChange={setEasingId} />
        </aside>
      </div>
      <PlanReadout info={info} />
    </div>
  );
}
