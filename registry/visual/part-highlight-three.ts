/** Point at one part of a 3D subject: a clean outline on the part, and the rest of the subject dimmed.
 *
 * Explainers need "this part does X". The part's own pixels are marked in the stencil buffer as it draws; then a copy of the part,
 * widened in screen space so the line is the same thickness in pixels at any distance, draws only where the part did not. The line
 * is drawn over everything, so it stays visible where the part sits flush on a surface (a lens on its plateau), which a plain
 * inverted hull cannot do. Its normals are rebuilt smooth from position alone, so hard-edged parts do not crack at their corners.
 * The renderer needs a stencil buffer (`FiberStage` provides one). Dimming darkens every other material on the subject; the part's own meshes
 * get private copies of their materials first, so a part that shares a material with the body (a button machined from the frame's
 * aluminium) is not dimmed with it. `set` is pure: the same amounts always give the same picture. `dispose` restores everything.
 */
import { AlwaysStencilFunc, BackSide, Box3, BufferAttribute, BufferGeometry, Color, InstancedMesh, KeepStencilOp, Mesh, NotEqualStencilFunc, ReplaceStencilOp, ShaderMaterial, Vector2 } from "three";
import type { ColorRepresentation, Material, Object3D } from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

export interface PartHighlightOptions {
  /** Outline colour. A clean near-white reads on dark and mid backdrops; use an accent only when it means something. @default "#f4f7fb" */
  color?: ColorRepresentation;
  /** Outline thickness in pixels at a 1080-pixel-tall output; it scales with the output height. @default 3.5 */
  width?: number;
  /** A soft halo three times the outline's width, at this opacity, so the line reads at small sizes. 0 turns it off. @default 0.22 */
  glow?: number;
}
export interface PartHighlight {
  /** The meshes that belong to the part. */
  readonly meshes: readonly Mesh[];
  /** The part's world bounds at the time of creation (the subject's rest pose). */
  readonly bounds: Box3;
  /** `highlight` 0 to 1 fades the outline; `dim` 0 to 1 darkens everything else; `height` is the output height in pixels. */
  set(state: { highlight: number; dim: number; width: number; height: number }): void;
  dispose(): void;
}

const STENCIL = 0x5a;
/** True if `object` or an ancestor below `root` carries one of the part roles. */
function inPart(object: Object3D, root: Object3D, names: ReadonlySet<string>) {
  for (let node: Object3D | null = object; node && node !== root.parent; node = node.parent) {
    if (names.has(node.userData.partRole) || names.has(node.name)) return true;
    if (node === root) break;
  }
  return false;
}

const VERTEX = /* glsl */`
uniform float uWidth;
uniform vec2 uResolution;
attribute vec3 smoothNormal;
void main() {
  vec4 local = vec4(position, 1.0);
  vec3 n = smoothNormal;
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 clip = projectionMatrix * modelViewMatrix * local;
  vec3 viewNormal = normalize(normalMatrix * n);
  vec2 dir = (projectionMatrix * vec4(viewNormal, 0.0)).xy;
  float len = length(dir);
  dir = len > 1e-5 ? dir / len : vec2(0.0);
  clip.xy += dir * uWidth * 2.0 / uResolution * clip.w;
  gl_Position = clip;
}`;
const FRAGMENT = /* glsl */`
uniform vec3 uColor;
uniform float uOpacity;
void main() { gl_FragColor = vec4(uColor, uOpacity); }`;

/** The part's geometry with normals rebuilt smooth from shared positions, stored as `smoothNormal`. */
function hullGeometry(source: BufferGeometry): BufferGeometry {
  const positions = new BufferGeometry();
  positions.setAttribute("position", source.getAttribute("position"));
  if (source.index) positions.setIndex(source.index);
  const merged = mergeVertices(positions, 1e-4);
  merged.computeVertexNormals();
  const out = new BufferGeometry();
  out.setAttribute("position", merged.getAttribute("position"));
  out.setAttribute("smoothNormal", merged.getAttribute("normal") as BufferAttribute);
  if (merged.index) out.setIndex(merged.index);
  merged.dispose(); positions.dispose();
  return out;
}

export function createPartHighlight(root: Object3D, part: string | readonly string[], options: PartHighlightOptions = {}): PartHighlight {
  const names = new Set(typeof part === "string" ? [part] : part);
  root.updateMatrixWorld(true);
  const meshes: Mesh[] = [], others: Mesh[] = [];
  root.traverse(object => { if ((object as Mesh).isMesh && !object.userData.kmHighlightHull) (inPart(object, root, names) ? meshes : others).push(object as Mesh); });
  if (!meshes.length) throw new Error(`No meshes belong to the part "${[...names].join(", ")}". Check the asset's part names.`);
  const bounds = new Box3();
  for (const mesh of meshes) bounds.expandByObject(mesh);

  // Private materials for the part, so dimming a shared material leaves the part at full light.
  const swapped = new Map<Mesh, Material | Material[]>(), owned: Array<{ dispose(): void }> = [];
  for (const mesh of meshes) {
    swapped.set(mesh, mesh.material);
    const mark = (m: Material) => { const c = m.clone(); owned.push(c); Object.assign(c, { stencilWrite: true, stencilRef: STENCIL, stencilFunc: AlwaysStencilFunc, stencilZPass: ReplaceStencilOp, stencilZFail: ReplaceStencilOp, stencilFail: KeepStencilOp }); return c; };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(mark) : mark(mesh.material);
  }
  // The materials to dim, each recorded once with its original colour and reflection strength.
  type Dimmable = Material & { color?: Color; envMapIntensity?: number; emissiveIntensity?: number };
  const originals = new Map<Dimmable, { color?: Color; env?: number; emissive?: number }>();
  for (const mesh of others) for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Dimmable[]) {
    if (originals.has(material)) continue;
    originals.set(material, { color: material.color?.clone(), env: material.envMapIntensity, emissive: material.emissiveIntensity });
  }

  const makeLine = () => new ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: FRAGMENT, side: BackSide, transparent: true, depthWrite: false, depthTest: false,
    stencilWrite: true, stencilRef: STENCIL, stencilFunc: NotEqualStencilFunc, stencilFail: KeepStencilOp, stencilZFail: KeepStencilOp, stencilZPass: KeepStencilOp,
    uniforms: { uColor: { value: new Color(options.color ?? "#f4f7fb") }, uOpacity: { value: 0 }, uWidth: { value: options.width ?? 3.5 }, uResolution: { value: new Vector2(1920, 1080) } },
  });
  // The crisp line, and a wider, faint halo drawn first beneath it.
  const outline = makeLine(), halo = makeLine();
  owned.push(outline, halo);
  const hulls: Mesh[] = [];
  for (const mesh of meshes) {
    const geometry = hullGeometry(mesh.geometry); owned.push(geometry);
    for (const [material, order] of [[halo, 10], [outline, 11]] as const) {
      const hull = mesh instanceof InstancedMesh ? new InstancedMesh(geometry, material, mesh.count) : new Mesh(geometry, material);
      if (hull instanceof InstancedMesh && mesh instanceof InstancedMesh) { hull.instanceMatrix = mesh.instanceMatrix; hull.count = mesh.count; }
      hull.userData.kmHighlightHull = true; hull.renderOrder = order; hull.visible = false; hull.raycast = () => undefined;
      mesh.add(hull); hulls.push(hull);
    }
  }
  const base = options.width ?? 3.5, glow = options.glow ?? .22;

  return {
    meshes, bounds,
    set({ highlight, dim, width, height }) {
      const h = Math.min(1, Math.max(0, highlight)), d = Math.min(.9, Math.max(0, dim));
      outline.uniforms.uOpacity.value = h * .95;
      outline.uniforms.uWidth.value = base * height / 1080;
      halo.uniforms.uOpacity.value = h * glow;
      halo.uniforms.uWidth.value = base * 3 * height / 1080;
      for (const m of [outline, halo]) (m.uniforms.uResolution.value as Vector2).set(width, height);
      for (const hull of hulls) hull.visible = h > .001;
      for (const [material, original] of originals) {
        if (original.color && material.color) material.color.copy(original.color).multiplyScalar(1 - d);
        if (original.env !== undefined) material.envMapIntensity = original.env * (1 - d * .85);
        if (original.emissive !== undefined) material.emissiveIntensity = original.emissive * (1 - d * .7);
      }
    },
    dispose() {
      for (const hull of hulls) hull.removeFromParent();
      for (const [mesh, material] of swapped) mesh.material = material;
      for (const [material, original] of originals) {
        if (original.color && material.color) material.color.copy(original.color);
        if (original.env !== undefined) material.envMapIntensity = original.env;
        if (original.emissive !== undefined) material.emissiveIntensity = original.emissive;
      }
      for (const resource of owned) resource.dispose();
    },
  };
}
