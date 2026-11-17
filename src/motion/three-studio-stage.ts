import {
  ACESFilmicToneMapping, Color, DirectionalLight, Mesh, PCFShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator,
  Scene, ShadowMaterial, SRGBColorSpace, WebGLRenderer,
} from "three";
import type { Material } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 * A neutral studio for the motion labs' Three.js stories: a room environment for reflections, one shadow-casting key
 * light, a shadow-catching floor, an orbit camera and on-demand rendering. Colours come from CSS tokens, so the stage
 * follows the Storybook theme.
 */

/** Resolve a CSS colour token (any syntax the browser knows, including oklch) through a 1 × 1 canvas. */
/** Height of the shadow-catching floor, in world units. Objects that should stand on it rest their base here. */
export const STUDIO_FLOOR_Y = -1.18;

export function cssColor(element: Element, name: string, fallback: string): Color {
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

export interface StudioStage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  render: () => void;
  dispose: () => void;
}

export function createStudioStage(host: HTMLElement, canvas: HTMLCanvasElement): StudioStage {
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
  ground.position.y = STUDIO_FLOOR_Y;
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

