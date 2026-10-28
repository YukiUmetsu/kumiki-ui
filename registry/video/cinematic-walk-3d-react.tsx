/** A real 3D world rotating under an independently animated, non-translating walker. */
import { useEffect, useRef, useState } from "react";
import {
  ACESFilmicToneMapping, AmbientLight, AnimationMixer, Box3, CanvasTexture, Color,
  DirectionalLight, DoubleSide, Group, HemisphereLight, LoadingManager, Mesh,
  MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene, SRGBColorSpace,
  TextureLoader, Vector3, WebGLRenderer, CylinderGeometry,
} from "three";
import type { Object3D, Texture } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { createMiniatureWorld, placeOnWorld, WALK_RADIUS, walkingWorldPoseAtFrame } from "./cinematic-walk-3d-scene";

export interface CinematicWalk3DModels {
  walker: string;
  treeOak: string;
  treePine: string;
  treePalm: string;
  cactus: string;
  rock: string;
  bush: string;
  houses: [string, string, string];
  cityColorMap: string;
}

export interface CinematicWalk3DProps {
  frame: number;
  groundTexture: string;
  models: CinematicWalk3DModels;
  title?: string;
  subtitle?: string;
  reducedMotion?: boolean;
}

type ModelId = Exclude<keyof CinematicWalk3DModels, "houses"> | "houseA" | "houseG" | "houseO";
type Placement = { id: ModelId; angle: number; height: number; depth: number; yaw?: number };
const placements: Placement[] = [
  // Arid mountains, palm groves and cactus — opening desert chapter.
  { id: "cactus", angle: 1.24, height: .84, depth: .23 },
  { id: "cactus", angle: 1.47, height: .65, depth: -.18 },
  { id: "rock", angle: 1.72, height: .48, depth: .17 },
  { id: "treePalm", angle: 1.84, height: 1.17, depth: .22 },
  { id: "treePalm", angle: 2.08, height: .98, depth: -.24 },
  { id: "cactus", angle: 2.3, height: .75, depth: .05 },
  { id: "rock", angle: 2.42, height: .3, depth: -.24 },
  // Dense, lush forest chapter.
  { id: "treeOak", angle: 2.65, height: 1.05, depth: -.23 },
  { id: "bush", angle: 2.77, height: .36, depth: .24 },
  { id: "treePine", angle: 2.86, height: 1.35, depth: -.07 },
  { id: "treeOak", angle: 3.06, height: 1.27, depth: .25 },
  { id: "bush", angle: 3.22, height: .38, depth: -.14 },
  { id: "treePine", angle: 3.33, height: 1.04, depth: .12 },
  { id: "treeOak", angle: 3.53, height: 1.02, depth: -.25 },
  { id: "treePine", angle: 3.7, height: 1.34, depth: .08 },
  { id: "bush", angle: 3.85, height: .38, depth: .17 },
  // A miniature neighborhood passes under the same walker.
  { id: "houseA", angle: 4.12, height: .96, depth: -.22, yaw: -.25 },
  { id: "treeOak", angle: 4.28, height: .68, depth: .25 },
  { id: "houseG", angle: 4.47, height: 1.09, depth: .19, yaw: .21 },
  { id: "bush", angle: 4.57, height: .35, depth: .23 },
  { id: "treeOak", angle: 4.71, height: .85, depth: -.2 },
  { id: "houseO", angle: 4.9, height: 1.15, depth: .03, yaw: .12 },
  { id: "treePine", angle: 5.09, height: 1.07, depth: .21 },
  { id: "houseA", angle: 5.26, height: .81, depth: -.2, yaw: -.13 },
  { id: "rock", angle: 5.55, height: .45, depth: .1 },
];

const groundSigns = [
  { angle: 1.97, heading: "WONDER", kicker: "IS EVERYWHERE", color: "#edb26d" },
  { angle: 3.24, heading: "EXPLORE", kicker: "BEYOND THE PATH", color: "#9bbf85" },
  { angle: 4.62, heading: "YOUR WORLD", kicker: "A NEW STORY", color: "#8bc2dd" },
];

function makeBillboard(heading: string, kicker: string, accent: string): Group {
  const surface = document.createElement("canvas");
  surface.width = 768;
  surface.height = 464;
  const context = surface.getContext("2d");
  if (!context) throw new Error("Cannot draw billboard");
  context.fillStyle = "#19252d";
  context.fillRect(0, 0, 768, 464);
  context.fillStyle = accent;
  context.fillRect(0, 0, 768, 25);
  context.fillStyle = "#f9f6e9";
  context.textAlign = "center";
  context.font = "800 72px system-ui";
  context.fillText(heading, 384, 224, 710);
  context.font = "600 27px system-ui";
  context.letterSpacing = "8px";
  context.fillStyle = "#c9d7d0";
  context.fillText(kicker, 384, 310, 710);
  const texture = new CanvasTexture(surface);
  texture.colorSpace = SRGBColorSpace;
  const sign = new Group();
  const board = new Mesh(new PlaneGeometry(1.48, .90), new MeshStandardMaterial({ map: texture, side: DoubleSide, roughness: .64 }));
  board.position.y = 1.16;
  board.castShadow = true;
  sign.add(board);
  const pole = new Mesh(new CylinderGeometry(.045, .065, 1.28, 10), new MeshStandardMaterial({ color: "#323d41", metalness: .42, roughness: .56 }));
  pole.position.y = .6;
  pole.castShadow = true;
  sign.add(pole);
  return sign;
}

function normalizeModelHeight(model: Object3D, height: number): void {
  model.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model);
  const measure = bounds.getSize(new Vector3());
  const scale = height / Math.max(.001, measure.y);
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);
  const after = new Box3().setFromObject(model);
  model.position.y -= after.min.y;
  model.position.x -= (after.max.x + after.min.x) / 2;
  model.position.z -= (after.max.z + after.min.z) / 2;
  model.traverse(object => { if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true; } });
}

function disposeThreeObjects(scene: Scene): void {
  const geometries = new Set<{ dispose(): void }>();
  const materials = new Set<{ dispose(): void }>();
  const textures = new Set<Texture>();
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      if (material instanceof MeshStandardMaterial) {
        if (material.map) textures.add(material.map);
        if (material.normalMap) textures.add(material.normalMap);
        if (material.roughnessMap) textures.add(material.roughnessMap);
      }
    }
  });
  geometries.forEach(g => g.dispose());
  materials.forEach(m => m.dispose());
  textures.forEach(t => t.dispose());
}

export function CinematicWalk3D({ frame, groundTexture, models, title = "AROUND THE WORLD",
  subtitle = "Every step tells a story", reducedMotion = false }: CinematicWalk3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const reduceRef = useRef(reducedMotion);
  reduceRef.current = reducedMotion;
  const drawRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Maintain a stable model manifest even when a consumer creates a fresh `models` object.
  const modelUrls = [models.walker, models.treeOak, models.treePine, models.treePalm, models.cactus,
    models.rock, models.bush, ...models.houses];
  const modelKey = [...modelUrls, models.cityColorMap].join("|");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let renderer: WebGLRenderer | null = null;
    let scene: Scene | null = null;
    let groundMap: Texture | null = null;
    let mixer: AnimationMixer | null = null;
    const initialize = async () => {
      const manager = new LoadingManager();
      // Kenney's suburban GLBs reference an external relative palette image.
      // Redirect that reference to Vite's hashed asset URL, including in built Storybook.
      manager.setURLModifier(url => url.endsWith("Textures/colormap.png") ? models.cityColorMap : url);
      const loader = new GLTFLoader(manager);
      const [ground, ...loadedModels] = await Promise.all([
        new TextureLoader().loadAsync(groundTexture), ...modelUrls.map(url => loader.loadAsync(url)),
      ]);
      groundMap = ground;
      if (cancelled) { ground.dispose(); return; }
      ground.colorSpace = SRGBColorSpace;
      const ids: ModelId[] = ["walker", "treeOak", "treePine", "treePalm", "cactus", "rock", "bush", "houseA", "houseG", "houseO"];
      const lookup = Object.fromEntries(ids.map((id, i) => [id, loadedModels[i]])) as Record<ModelId, typeof loadedModels[number]>;
      scene = new Scene();
      const world = createMiniatureWorld(ground);
      scene.add(world);
      for (const placement of placements) {
        const model = lookup[placement.id].scene.clone(true);
        normalizeModelHeight(model, placement.height);
        if (placement.yaw) model.rotation.y = placement.yaw;
        placeOnWorld(world, model, placement.angle, WALK_RADIUS + .012, placement.depth);
      }
      for (const billboard of groundSigns) {
        const mesh = makeBillboard(billboard.heading, billboard.kicker, billboard.color);
        placeOnWorld(world, mesh, billboard.angle, WALK_RADIUS + .015, .27);
      }
      const walker = new Group();
      walker.name = "stationary-walker";
      // A vanilla Object3D.clone() keeps the source SkinnedMesh's old skeleton
      // bindings; cloneSkinned remaps all bones so the walk clip actually moves it.
      const person = cloneSkinned(lookup.walker.scene);
      normalizeModelHeight(person, 1.28);
      person.rotation.y = -Math.PI / 2;
      // In the supplied reference the traveler is readable in front of passing
      // billboards/buildings. Keep its actual feet on the crest while layering
      // skinned meshes above scenery (instead of moving the person off-surface).
      person.traverse(object => {
        if (!(object instanceof Mesh)) return;
        object.renderOrder = 100;
        object.castShadow = false;
        const surfaceMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const overlays = surfaceMaterials.map(material => {
          const copy = material.clone();
          copy.depthTest = false;
          copy.depthWrite = false;
          return copy;
        });
        object.material = Array.isArray(object.material) ? overlays : overlays[0];
      });
      walker.add(person);
      scene.add(walker);
      mixer = new AnimationMixer(person);
      const gait = lookup.walker.animations.find(clip => /walk/i.test(clip.name));
      if (!gait) throw new Error("Selected walking character GLB has no walk animation");
      mixer.clipAction(gait).play();

      scene.add(new AmbientLight("#e5edf2", 1.0));
      scene.add(new HemisphereLight("#e4f2ff", "#67583f", 2.1));
      const sun = new DirectionalLight("#ffe4b5", 3.6);
      sun.position.set(-5, 8, 9);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -9;
      sun.shadow.camera.right = 9;
      sun.shadow.camera.top = 9;
      sun.shadow.camera.bottom = -9;
      sun.shadow.bias = -.0002;
      scene.add(sun);
      const fill = new DirectionalLight("#a8d9ff", 1.3);
      fill.position.set(6, 4, -7);
      scene.add(fill);

      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setClearColor(new Color(0x000000), 0);
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      renderer.shadowMap.enabled = true;
      renderer.setPixelRatio(1);
      renderer.setSize(1280, 720, false);
      const camera = new PerspectiveCamera(38, 1280 / 720, .1, 100);
      camera.position.set(0, 1.8, 12.75);
      camera.lookAt(0, .15, 0);
      drawRef.current = () => {
        if (!renderer || !scene || !mixer) return;
        const current = reduceRef.current ? 240 : frameRef.current;
        const pose = walkingWorldPoseAtFrame(current);
        world.rotation.z = pose.planetRotation;
        const wander = .035 * Math.sin(current / 34);
        world.rotation.y = wander;
        walker.position.set(...pose.walkerPosition);
        mixer.setTime(pose.gaitTime);
        // Imported mocap is in-place; the world root never inherits walker motion.
        walker.position.set(...pose.walkerPosition);
        renderer.render(scene, camera);
        canvas.dataset.kmHeroReady = "true";
        canvas.dataset.kmHeroFrame = String(frameRef.current);
      };
      drawRef.current();
    };
    initialize().catch(cause => {
      if (!cancelled) setError(`Walking world 3D failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    });
    return () => {
      cancelled = true;
      drawRef.current = null;
      delete canvas.dataset.kmHeroReady;
      delete canvas.dataset.kmHeroFrame;
      if (scene) disposeThreeObjects(scene);
      groundMap?.dispose();
      renderer?.dispose();
    };
  // Scene resources are intentionally reloaded only when a model URL changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundTexture, modelKey]);

  useEffect(() => { drawRef.current?.(); }, [frame, reducedMotion]);
  return <div data-km-cinematic-walk-3d="" data-km-hero-viewer="" data-km-frame-addressed=""
    style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden",
      background: "radial-gradient(ellipse at 72% 20%, #f8d79a 0%, #bbdbea 26%, #739bb8 69%, #263a50 100%)" }}>
    <div aria-hidden="true" style={{ position: "absolute", width: "31%", aspectRatio: "1", top: "-21%", right: "10%",
      borderRadius: "50%", background: "#fff1c7", filter: "blur(75px)", opacity: .57 }} />
    <canvas ref={canvasRef} role="img" aria-label="Rigged traveler walking in place on a rotating, populated three-dimensional globe"
      style={{ position: "absolute", width: "100%", height: "100%", inset: 0, display: "block" }} />
    <div style={{ position: "absolute", left: "5.8%", top: "9%", color: "#162d3b", maxWidth: "41%", pointerEvents: "none",
      textShadow: "0 1px 12px #d2e9eaa8" }}>
      <div style={{ font: "700 clamp(8px, 1vw, 12px)/1.1 system-ui", letterSpacing: ".4em", marginBottom: "14px" }}>A JOURNEY IN MOTION</div>
      <h2 style={{ margin: 0, font: "900 clamp(20px, 4.0vw, 58px)/.96 Georgia, serif", letterSpacing: "-.035em", textTransform: "uppercase" }}>{title}</h2>
      <p style={{ font: "500 clamp(11px, 1.35vw, 18px)/1.4 system-ui", marginTop: "18px", maxWidth: 360 }}>{subtitle}</p>
    </div>
    <span style={{ position: "absolute", right: "5.4%", bottom: "6.5%", font: "600 11px system-ui", color: "#f5f0e7cc",
      letterSpacing: ".23em", textShadow: "0 1px 7px #192b3b" }}>WALK · DISCOVER · REPEAT</span>
    {error && <p role="alert" style={{ position: "absolute", bottom: 30, left: 30, padding: 15,
      color: "#fff", background: "#54272b" }}>{error}</p>}
  </div>;
}
