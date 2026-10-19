/** Product-photography studio for hero 3D assets.
 *
 * - HDR equirectangular softbox environment (half-float, no downloads): metals,
 *   glazes and glass get real highlight shapes instead of reflecting nothing.
 * - Seamless cyclorama sweep (floor curving into wall) with a subtle center
 *   pool of light, so there is never a visible horizon line behind the subject.
 * - Key light whose shadow frustum is fitted to the subject bounds (crisp,
 *   soft-edged contact shadows), plus fill and rim for edge separation.
 * - Contact-occlusion blob under the footprint for grounded weight.
 *
 * Caller owns the renderer (tone mapping/exposure). Everything created here
 * is owned by the returned object and released by `dispose()`.
 */
import {
  BufferAttribute, BufferGeometry, Color, DataTexture, DataUtils, DirectionalLight,
  EquirectangularReflectionMapping, Group, HalfFloatType, HemisphereLight, LinearFilter,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, RGBAFormat, Scene,
} from "three";
import type { ColorRepresentation } from "three";

export type HeroStudioPalette = "graphite" | "midnight" | "ivory" | "sand" | "slate";
export interface HeroBounds { min: readonly [number, number, number]; max: readonly [number, number, number] }

export interface HeroStudioOptions {
  /** Subject bounds in world units; drives sweep size, shadow frustum and blob. */
  bounds: HeroBounds;
  palette?: HeroStudioPalette;
  /** Override sweep color (sRGB hex). */
  backdrop?: ColorRepresentation;
  /** Environment reflection intensity multiplier (0.2–3). */
  environmentIntensity?: number;
  /** Key light azimuth in degrees (0 = from camera front, +90 = from right). */
  keyAzimuth?: number;
  /** Optional warm/cool rim accent color. */
  rimColor?: ColorRepresentation;
  /** Whole-scene extent (e.g. a stage set) for sizing the sweep; bounds stay the framed subject. */
  extent?: HeroBounds;
  /** Studio floor height (defaults to bounds.min.y); lets a desk stand below a framed tabletop. */
  floorY?: number;
  /** Disable the sweep for compositing over an external scene. */
  backdropEnabled?: boolean;
}

const PALETTES: Record<HeroStudioPalette, { sweep: string; edge: string; background: string; ground: string }> = {
  graphite: { sweep: "#3a4048", edge: "#15181c", background: "#121519", ground: "#2b3036" },
  midnight: { sweep: "#1d3242", edge: "#08121a", background: "#081119", ground: "#152735" },
  ivory: { sweep: "#e7e2d8", edge: "#a7a196", background: "#9c968b", ground: "#d6d0c4" },
  sand: { sweep: "#cbb79b", edge: "#7a6a55", background: "#6f604c", ground: "#b8a486" },
  slate: { sweep: "#6c7a86", edge: "#2b333b", background: "#262d34", ground: "#5c6873" },
};

interface Softbox {
  /** Direction toward the light (azimuth from +Z toward +X, elevation), degrees. */
  azimuth: number; elevation: number;
  /** Half extents in tangent-plane units (tan of half angle). */
  width: number; height: number;
  radiance: readonly [number, number, number];
  softness: number;
}
const SOFTBOXES: readonly Softbox[] = [
  // Large overhead scrim: broad top highlights.
  { azimuth: -10, elevation: 72, width: .9, height: .55, radiance: [4.2, 4.05, 3.8], softness: .25 },
  // Key strip front-left: long vertical highlight on rounded forms.
  { azimuth: -55, elevation: 22, width: .16, height: .85, radiance: [9.0, 8.4, 7.6], softness: .18 },
  // Fill panel front-right, cooler and dimmer.
  { azimuth: 50, elevation: 12, width: .45, height: .5, radiance: [1.7, 1.9, 2.2], softness: .4 },
  // Two rim strips behind: crisp edge separation on silhouettes.
  { azimuth: 150, elevation: 25, width: .1, height: .9, radiance: [7.5, 7.6, 8.0], softness: .12 },
  { azimuth: -145, elevation: 30, width: .1, height: .7, radiance: [5.5, 5.4, 5.2], softness: .12 },
  // Large frontal fill card near the camera axis: faces toward camera stay readable on metals.
  { azimuth: 18, elevation: 6, width: .7, height: .32, radiance: [2.4, 2.35, 2.3], softness: .45 },
  // Low bounce card: lifts undersides (bellies, chins) a little.
  { azimuth: 10, elevation: -18, width: 1.2, height: .25, radiance: [.55, .52, .48], softness: .6 },
];

/** Deterministic HDR studio environment as an equirectangular half-float texture. */
export function createStudioEnvironmentTexture(width = 1024): DataTexture {
  const height = width / 2;
  const data = new Uint16Array(width * height * 4);
  const lights = SOFTBOXES.map(box => {
    const az = box.azimuth * Math.PI / 180, el = box.elevation * Math.PI / 180;
    const dir = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
    // Tangent frame: right is horizontal, up completes the basis.
    const right = [Math.cos(az), 0, -Math.sin(az)];
    const up = [
      dir[1] * right[2] - dir[2] * right[1],
      dir[2] * right[0] - dir[0] * right[2],
      dir[0] * right[1] - dir[1] * right[0],
    ];
    return { box, dir, right, up };
  });
  const smooth = (e0: number, e1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  for (let j = 0; j < height; j++) {
    const elevation = ((j + .5) / height - .5) * Math.PI;
    const cy = Math.sin(elevation), cr = Math.cos(elevation);
    // Base gradient: dark floor, soft horizon, dim ceiling.
    const horizon = Math.exp(-Math.pow(elevation / .35, 2));
    const baseR = elevation < 0 ? .018 + .04 * horizon : .026 + .05 * horizon;
    for (let i = 0; i < width; i++) {
      // Three.js equirect: u = atan(z, x) / 2π + .5.
      const phi = ((i + .5) / width - .5) * 2 * Math.PI;
      const d = [Math.cos(phi) * cr, cy, Math.sin(phi) * cr];
      let r = baseR, g = baseR * 1.02, b = baseR * 1.08;
      for (const { box, dir, right, up } of lights) {
        const facing = d[0] * dir[0] + d[1] * dir[1] + d[2] * dir[2];
        if (facing <= .05) continue;
        const u = (d[0] * right[0] + d[1] * right[1] + d[2] * right[2]) / facing;
        const v = (d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / facing;
        const s = box.softness;
        const cover = (1 - smooth(box.width * (1 - s), box.width * (1 + s), Math.abs(u))) *
          (1 - smooth(box.height * (1 - s), box.height * (1 + s), Math.abs(v)));
        if (cover <= 0) continue;
        // Gentle center hot-spot like a real diffusion panel.
        const hot = .82 + .18 * (1 - Math.min(1, Math.hypot(u / box.width, v / box.height)));
        r += box.radiance[0] * cover * hot; g += box.radiance[1] * cover * hot; b += box.radiance[2] * cover * hot;
      }
      const at = (j * width + i) * 4;
      data[at] = DataUtils.toHalfFloat(r); data[at + 1] = DataUtils.toHalfFloat(g);
      data[at + 2] = DataUtils.toHalfFloat(b); data[at + 3] = DataUtils.toHalfFloat(1);
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, HalfFloatType);
  texture.mapping = EquirectangularReflectionMapping;
  texture.magFilter = LinearFilter; texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Floor-to-wall sweep with vertex-color light pooling. */
function sweepGeometry(width: number, depthFront: number, depthBack: number, radius: number,
  wallHeight: number, centerColor: Color, edgeColor: Color, centerZ: number): BufferGeometry {
  const profile: Array<[number, number]> = [];
  const floorSteps = 64, curveSteps = 24, wallSteps = 24;
  for (let i = 0; i <= floorSteps; i++) profile.push([depthFront - (depthFront + depthBack) * i / floorSteps, 0]);
  for (let i = 1; i <= curveSteps; i++) {
    const a = (i / curveSteps) * Math.PI / 2;
    profile.push([-depthBack - Math.sin(a) * radius, radius - Math.cos(a) * radius]);
  }
  for (let i = 1; i <= wallSteps; i++) profile.push([-depthBack - radius, radius + (wallHeight - radius) * i / wallSteps]);
  const across = 140, rows = profile.length;
  const position = new Float32Array(rows * (across + 1) * 3);
  const color = new Float32Array(rows * (across + 1) * 3);
  const index: number[] = [];
  let arc = 0; const arcAt: number[] = [0];
  for (let r = 1; r < rows; r++) {
    arc += Math.hypot(profile[r][0] - profile[r - 1][0], profile[r][1] - profile[r - 1][1]); arcAt.push(arc);
  }
  const centerArc = depthFront - centerZ;
  for (let r = 0; r < rows; r++) for (let c = 0; c <= across; c++) {
    const x = (c / across - .5) * width, [z, y] = profile[r];
    const at = (r * (across + 1) + c) * 3;
    position[at] = x; position[at + 1] = y; position[at + 2] = z;
    // Elliptical light pool centered under/behind the subject.
    const dx = x / (width * .065), da = (arcAt[r] - centerArc) / (radius * 3);
    const pool = Math.exp(-(dx * dx + da * da) * 1.6);
    const tone = new Color().copy(edgeColor).lerp(centerColor, pool);
    color[at] = tone.r; color[at + 1] = tone.g; color[at + 2] = tone.b;
  }
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < across; c++) {
    const a = r * (across + 1) + c, b = a + 1, d = a + across + 1, e = d + 1;
    index.push(a, b, d, b, e, d);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("color", new BufferAttribute(color, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** Radial falloff alpha for the contact-occlusion blob. */
function contactTexture(size = 128): DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = (i + .5) / size * 2 - 1, y = (j + .5) / size * 2 - 1;
    const r = Math.min(1, Math.hypot(x, y));
    const a = Math.pow(1 - r, 2.2) * (1 - r * .25);
    const at = (j * size + i) * 4;
    data[at] = data[at + 1] = data[at + 2] = 0; data[at + 3] = Math.round(255 * a);
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.magFilter = LinearFilter; texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createHeroStudio(options: HeroStudioOptions) {
  const { min, max } = options.bounds;
  if (![...min, ...max].every(Number.isFinite) || max[0] <= min[0] || max[1] <= min[1] || max[2] <= min[2])
    throw new Error("Hero studio needs finite, non-empty subject bounds.");
  const palette = PALETTES[options.palette ?? "graphite"];
  const sx = max[0] - min[0], sy = max[1] - min[1], sz = max[2] - min[2];
  const span = Math.max(sx, sy, sz);
  const cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2;
  const group = new Group();
  group.name = "kumiki-hero-studio";
  const owned: Array<{ dispose(): void }> = [];

  const environment = createStudioEnvironmentTexture();
  owned.push(environment);

  if (options.backdropEnabled ?? true) {
    const center = new Color(options.backdrop ?? palette.sweep);
    const edge = new Color(palette.edge);
    if (options.backdrop) edge.copy(center).multiplyScalar(.38);
    const ext = options.extent;
    const extSpan = ext ? Math.max(ext.max[0] - ext.min[0], ext.max[1] - ext.min[1], ext.max[2] - ext.min[2]) : span;
    // Sweep is local to the subject center (cz); its wall must clear the whole extent.
    const back = ext ? (cz - ext.min[2]) + extSpan * .25 : span * 1.4;
    const geometry = sweepGeometry(extSpan * 60, extSpan * 8, back, Math.max(span, extSpan * .5) * 1.4, extSpan * 30, center, edge, 0);
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: .93, metalness: 0, envMapIntensity: .35 });
    const sweep = new Mesh(geometry, material);
    sweep.name = "cyclorama-sweep";
    sweep.position.set(cx, options.floorY ?? min[1], cz);
    sweep.receiveShadow = true;
    group.add(sweep);
    owned.push(geometry, material);
  }

  // Contact occlusion: grounds the subject even where the key shadow falls away.
  const blobTexture = contactTexture();
  const blobGeometry = new PlaneGeometry(sx * 1.25 + span * .15, sz * 1.35 + span * .15);
  const blobMaterial = new MeshBasicMaterial({ map: blobTexture, transparent: true, depthWrite: false, opacity: .55, color: "#000000" });
  const blob = new Mesh(blobGeometry, blobMaterial);
  blob.name = "contact-occlusion";
  blob.rotation.x = -Math.PI / 2;
  blob.position.set(cx, (options.floorY ?? min[1]) + .002 * span, cz);
  blob.renderOrder = 1;
  group.add(blob);
  owned.push(blobTexture, blobGeometry, blobMaterial);

  const target = [cx, min[1] + sy * .45, cz] as const;
  const keyAz = ((options.keyAzimuth ?? -38) * Math.PI) / 180;
  const key = new DirectionalLight("#fff3e4", 2.3);
  key.name = "hero-key";
  key.position.set(cx + Math.sin(keyAz) * span * 2.2, min[1] + span * 2.6, cz + Math.cos(keyAz) * span * 2.2);
  key.target.position.set(...target);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const reach = span * 1.25;
  Object.assign(key.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: span * .5, far: span * 7 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -.00015;
  key.shadow.normalBias = span * .004;
  key.shadow.radius = 6;
  key.shadow.blurSamples = 16;
  const fill = new DirectionalLight("#cfe0ff", .55);
  fill.name = "hero-fill";
  fill.position.set(cx + span * 2.4, min[1] + span * .9, cz + span * 1.6);
  fill.target.position.set(...target);
  const rim = new DirectionalLight(options.rimColor ?? "#f2f6ff", 1.6);
  rim.name = "hero-rim";
  rim.position.set(cx - span * .8, min[1] + span * 1.8, cz - span * 2.6);
  rim.target.position.set(...target);
  const bounce = new HemisphereLight("#d9e4f2", new Color(palette.ground), .35);
  bounce.name = "hero-bounce";
  group.add(key, key.target, fill, fill.target, rim, rim.target, bounce);

  return {
    group, key, fill, rim, environment,
    background: new Color(options.backdrop ? new Color(options.backdrop).multiplyScalar(.38) : palette.edge),
    environmentIntensity: options.environmentIntensity ?? 1,
    /** Install background/environment on a scene; returns a restore function. */
    apply(scene: Scene) {
      const previous = { environment: scene.environment, background: scene.background, intensity: scene.environmentIntensity };
      scene.environment = environment;
      scene.environmentIntensity = options.environmentIntensity ?? 1;
      scene.background = this.background;
      scene.add(group);
      return () => {
        scene.remove(group);
        if (scene.environment === environment) {
          scene.environment = previous.environment; scene.environmentIntensity = previous.intensity;
          scene.background = previous.background;
        }
      };
    },
    dispose() {
      key.shadow.dispose();
      for (const resource of owned) resource.dispose();
      group.clear();
    },
  };
}
export type HeroStudio = ReturnType<typeof createHeroStudio>;
