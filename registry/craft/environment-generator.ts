/** Reusable authored background/midground geometry around THREE's bundled
 * TreeGenerator and SkyscraperGenerator. Replaces long one-off tree/facade
 * scripts with a small style spec while retaining Kumiki's WebGL PBR scene,
 * camera and frame evaluator. Not a replacement for hero-grade GLB assets.
 */
import {
  BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group,
  InstancedMesh, MeshStandardMaterial,
} from "three";
import { TreeGenerator } from "three/addons/generators/TreeGenerator.js";
import { SkyscraperGenerator } from "three/addons/generators/city/SkyscraperGenerator.js";
import { createCraftScatter, createCraftScatterInstances } from "./scatter-placement";

type RGB = number;
const rgb = (v: unknown): v is RGB => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 0xffffff;
const positive = (n: number, max: number) => Number.isFinite(n) && n > 0 && n <= max;
const safeId = (id: unknown): id is string => typeof id === "string" && !!id.trim() && id.length <= 96;
const safeSeed = (seed: unknown) => Number.isSafeInteger(seed);

export interface CraftFacadeSpec {
  schemaVersion: 1;
  id: string;
  seed: number;
  /** Background/midground urban architecture; in scene world units. */
  height: number;
  footprint: { width: number; depth: number };
  floorHeight?: number;
  bayWidth?: number;
  colors?: { masonry?: RGB; trim?: RGB; glass?: RGB; metal?: RGB; storefront?: RGB };
}

export function validateCraftFacadeSpec(spec: CraftFacadeSpec): void {
  if (spec?.schemaVersion !== 1 || !safeId(spec.id) || !safeSeed(spec.seed) ||
    !positive(spec.height, 120) || spec.height < 12 || !spec.footprint ||
    !positive(spec.footprint.width, 60) || !positive(spec.footprint.depth, 60) ||
    spec.footprint.width < 8 || spec.footprint.depth < 8)
    throw new Error("Facade needs id, integer seed, height 12–120 and footprint dimensions 8–60.");
  if (spec.floorHeight !== undefined && (!positive(spec.floorHeight, 5) || spec.floorHeight < 2.4))
    throw new Error("Facade floorHeight must be 2.4–5 world units.");
  if (spec.bayWidth !== undefined && (!positive(spec.bayWidth, 4) || spec.bayWidth < 1.8))
    throw new Error("Facade bayWidth must be 1.8–4 world units.");
  if (spec.colors && Object.values(spec.colors).some(value => !rgb(value)))
    throw new Error("Facade color entries must be RGB integers.");
}

const MAX_FACADE_VERTICES = 240_000;

/** Rich façade geometry is supplied by native Three.js; partId gets authored
 * palette variation through stock WebGL-compatible vertex colors.
 * No WebGPU/TSL material is used, and the mesh remains a normal Three.js Mesh.
 */
export function createCraftFacade(spec: CraftFacadeSpec) {
  validateCraftFacadeSpec(spec);
  const colors = {
    masonry: spec.colors?.masonry ?? 0xb8a58e,
    trim: spec.colors?.trim ?? 0xd4c6ae,
    glass: spec.colors?.glass ?? 0x344f5f,
    metal: spec.colors?.metal ?? 0x59656e,
    storefront: spec.colors?.storefront ?? 0x405563,
  };
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: .67, metalness: .13 });
  const generator = new SkyscraperGenerator({ seed: spec.seed, totalHeight: spec.height,
    footprint: { ...spec.footprint }, floorHeight: spec.floorHeight ?? 3.6,
    bayWidth: spec.bayWidth ?? 2.4 }, material);
  try {
    const mesh = generator.build();
    const geometry = mesh.geometry;
    const part = geometry.getAttribute("partId"), positions = geometry.getAttribute("position");
    if (!part || !positions || positions.count > MAX_FACADE_VERTICES || positions.count === 0)
      throw new Error(`Facade geometry must have part zones and <= ${MAX_FACADE_VERTICES} vertices; reduce height/footprint.`);
    const palette = [colors.masonry, colors.trim, colors.trim, colors.trim, colors.glass,
      colors.metal, colors.glass, colors.storefront, colors.trim].map(rgbValue => new Color(rgbValue));
    const data = new Float32Array(positions.count * 3);
    for (let index = 0; index < positions.count; index++) {
      const zone = Math.round(part.getX(index));
      const c = palette[zone] ?? palette[0];
      data[index * 3] = c.r; data[index * 3 + 1] = c.g; data[index * 3 + 2] = c.b;
    }
    geometry.setAttribute("color", new Float32BufferAttribute(data, 3));
    geometry.computeBoundingBox();
    mesh.name = spec.id;
    mesh.userData.partRole = "procedural-masonry-facade";
    mesh.userData.partIds = ["masonry", "piers", "frames", "ornament", "glazing", "mechanical", "storefront"];
    mesh.castShadow = true; mesh.receiveShadow = true;
    let disposed = false;
    return { mesh, geometry, material, vertexCount: positions.count,
      dispose() { if (disposed) return; disposed = true; generator.dispose(); material.dispose(); } };
  } catch (error) {
    generator.dispose(); material.dispose(); throw error;
  }
}

export interface CraftTreeSpec {
  schemaVersion: 1;
  id: string;
  seed: number;
  /** Tree-generator trunk length in world units; upper branches extend above it. */
  trunkLength: number;
  trunkRadius: number;
  crown: "broad" | "slender";
  /** 0 = leafless. Up to 900 folded single-leaf instances for backdrop use. */
  leafCount: number;
  colors?: { bark?: RGB; leafDark?: RGB; leafLight?: RGB };
}

export function validateCraftTreeSpec(spec: CraftTreeSpec): void {
  if (spec?.schemaVersion !== 1 || !safeId(spec.id) || !safeSeed(spec.seed) ||
    !positive(spec.trunkLength, 12) || spec.trunkLength < 1 ||
    !positive(spec.trunkRadius, .8) || !["broad", "slender"].includes(spec.crown) ||
    !Number.isInteger(spec.leafCount) || spec.leafCount < 0 || spec.leafCount > 900)
    throw new Error("Tree needs seed, id, trunkLength 1–12, trunkRadius (0,.8], crown and leafCount 0–900.");
  if (spec.colors && Object.values(spec.colors).some(value => !rgb(value)))
    throw new Error("Tree colors must be RGB integers.");
}

/** Two folded sides + a raised central vein, sharp intentional tip. Flat leaf
 * geometry with a real normal field; repeated in one instanced PBR draw call.
 */
function makeFoldedLeafGeometry(length: number): BufferGeometry {
  const points: number[] = [], indices: number[] = [], colors: number[] = [];
  for (let row = 0; row <= 6; row++) {
    const t = row / 6, w = Math.pow(Math.sin(Math.PI * t), .85) * length * .22;
    const sweep = -t * t * length * .24;
    const y = t * length;
    for (let side = -1; side <= 1; side++) {
      points.push(side * w, y, sweep + (side === 0 ? length * .055 * Math.sin(Math.PI * t) : 0));
      const tone = side === 0 ? .9 : .72 + t * .1;
      colors.push(tone, tone, tone);
    }
  }
  for (let row = 0; row < 6; row++) for (let side = 0; side < 2; side++) {
    const a = row * 3 + side, b = (row + 1) * 3 + side;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Branch positions are inherited from native TreeGenerator. Leaf weighting
 * concentrates individual folded leaves on actual upper branch surfaces, not
 * in a random volume unrelated to the branches.
 */
export function createCraftTree(spec: CraftTreeSpec) {
  validateCraftTreeSpec(spec);
  const barkMaterial = new MeshStandardMaterial({ color: spec.colors?.bark ?? 0x514439,
    roughness: .94, metalness: 0 });
  const generator = new TreeGenerator(barkMaterial).setSeed(spec.seed).setLevels(4)
    .setChildren(spec.crown === "broad" ? [3, 7, 4] : [3, 5, 4])
    .setBranchAngle(spec.crown === "broad" ? [46, 58, 65] : [20, 30, 39])
    .setTrunkLength(spec.trunkLength).setTrunkRadius(spec.trunkRadius)
    .setMinRadius(Math.max(.007, spec.trunkRadius * .08))
    .setMinLength(Math.max(.15, spec.trunkLength * .1))
    .setSectionLength(Math.max(.12, spec.trunkLength * .11));
  const group = new Group(); group.name = spec.id;
  let branchGeometry: BufferGeometry | undefined;
  let leafGeometry: BufferGeometry | undefined;
  let foliageMaterial: MeshStandardMaterial | undefined;
  let leafInstances: ReturnType<typeof createCraftScatterInstances> | undefined;
  try {
    const branches = generator.build();
    branchGeometry = branches.geometry;
    branches.name = `${spec.id}-branches`;
    branches.castShadow = true; branches.receiveShadow = true;
    group.add(branches);
    branchGeometry.computeBoundingBox();
    const positions = branchGeometry.getAttribute("position");
    const maxY = branchGeometry.boundingBox!.max.y;
    if (!positions?.count || positions.count > 130_000 || !Number.isFinite(maxY) || maxY <= 0)
      throw new Error("Tree generator produced invalid/oversized branch geometry.");
    let foliage: InstancedMesh | undefined;
    if (spec.leafCount > 0) {
      const density = new Float32Array(positions.count);
      for (let index = 0; index < positions.count; index++)
        density[index] = Math.pow(Math.max(0, (positions.getY(index) / maxY - .26) / .74), .8);
      branchGeometry.setAttribute("foliageWeight", new Float32BufferAttribute(density, 1));
      const placements = createCraftScatter({ schemaVersion: 1, id: `${spec.id}-leaves`,
        mode: "surface", seed: spec.seed + 17, count: spec.leafCount, weightAttribute: "foliageWeight",
        surfaceNormal: true, randomYaw: true, normalOffset: .025,
        scale: [.65, 1.3] }, branches);
      leafGeometry = makeFoldedLeafGeometry(Math.min(.42, spec.trunkLength * .12));
      foliageMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: .88,
        side: DoubleSide, vertexColors: true });
      leafInstances = createCraftScatterInstances(placements, leafGeometry, foliageMaterial);
      foliage = leafInstances.mesh;
      foliage.name = `${spec.id}-leaves`;
      const dark = new Color(spec.colors?.leafDark ?? 0x274d31);
      const light = new Color(spec.colors?.leafLight ?? 0x64834a);
      for (let index = 0; index < spec.leafCount; index++) {
        const hueT = ((Math.imul(index + 1, 2654435761 ^ spec.seed) >>> 0) % 1024) / 1024;
        foliage.setColorAt(index, dark.clone().lerp(light, hueT));
      }
      if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
      group.add(foliage);
    }
    group.userData.partRole = "procedural-background-tree";
    group.userData.partIds = [branches.name, ...(foliage ? [foliage.name] : [])];
    let disposed = false;
    return { group, branches, foliage, vertexCount: positions.count, dispose() {
      if (disposed) return;
      disposed = true;
      leafInstances?.dispose(); leafGeometry?.dispose(); foliageMaterial?.dispose();
      branchGeometry?.dispose(); barkMaterial.dispose(); group.clear();
    } };
  } catch (error) {
    leafInstances?.dispose(); leafGeometry?.dispose(); foliageMaterial?.dispose();
    branchGeometry?.dispose(); barkMaterial.dispose(); group.clear();
    throw error;
  }
}
