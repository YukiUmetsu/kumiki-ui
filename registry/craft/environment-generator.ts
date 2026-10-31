/** Reusable authored background/midground geometry around THREE's bundled
 * TreeGenerator and SkyscraperGenerator. Replaces long one-off tree/facade
 * scripts with a small style spec while retaining Kumiki's WebGL PBR scene,
 * camera and frame evaluator. Not a replacement for hero-grade GLB assets.
 */
import {
  BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group,
  InstancedMesh, MeshPhysicalMaterial, MeshStandardMaterial,
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
  colors?: { masonry?: RGB; trim?: RGB; glass?: RGB; metal?: RGB; storefront?: RGB;
    /** Dark recessed room backing behind the actual facade glazing. */
    interior?: RGB };
  /** Three.js stock physical glass; no separate renderer or baked fake windows. */
  glass?: { opacity?: number; roughness?: number; transmission?: number };
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
  if (spec.glass && (Object.values(spec.glass).some(value => !Number.isFinite(value) || value! < 0 || value! > 1) ||
    (spec.glass.opacity !== undefined && spec.glass.opacity < .2)))
    throw new Error("Facade glass opacity must be .2–1; roughness and transmission must be 0–1.");
}

const MAX_FACADE_VERTICES = 240_000;

/** Rich façade geometry is supplied by native Three.js; contiguous partId
 * runs get individual WebGL PBR materials. Transmission, roughness and metal
 * response differ for real glazing, masonry, trims, store and metal zones.
 * No WebGPU/TSL material is used; only 12-ish grouped draw calls per facade.
 */
export function createCraftFacade(spec: CraftFacadeSpec) {
  validateCraftFacadeSpec(spec);
  const colors = {
    masonry: spec.colors?.masonry ?? 0xb8a58e,
    trim: spec.colors?.trim ?? 0xd4c6ae,
    glass: spec.colors?.glass ?? 0x344f5f,
    metal: spec.colors?.metal ?? 0x59656e,
    storefront: spec.colors?.storefront ?? 0x405563,
    interior: spec.colors?.interior ?? 0x29302d,
  };
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: .025 });
  const trimMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: .72, metalness: .08 });
  const glassMaterial = new MeshPhysicalMaterial({ vertexColors: true, roughness: spec.glass?.roughness ?? .18,
    metalness: 0, transmission: spec.glass?.transmission ?? .38, opacity: spec.glass?.opacity ?? .82,
    transparent: true, thickness: .08, ior: 1.49, depthWrite: false, side: DoubleSide });
  const metalMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: .4, metalness: .64 });
  const storeMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: .49, metalness: .14 });
  const backingMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: .96, metalness: 0 });
  const materials = [material, trimMaterial, glassMaterial, metalMaterial, storeMaterial, backingMaterial];
  const disposeMaterials = () => materials.forEach(value => value.dispose());
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
    const interiorColor = new Color(colors.interior);
    const runs: { start: number; count: number; zone: number }[] = [];
    let zoneStart = 0, activeZone = Math.round(part.getX(0));
    for (let index = 1; index <= positions.count; index++) {
      const zone = index === positions.count ? -1 : Math.round(part.getX(index));
      if (zone !== activeZone) {
        if ((index - zoneStart) % 3 !== 0 || activeZone < 0 || activeZone >= palette.length)
          throw new Error("Native facade has invalid per-triangle material zones.");
        runs.push({ start: zoneStart, count: index - zoneStart, zone: activeZone });
        zoneStart = index; activeZone = zone;
      }
    }
    // Pinned Three.js 0.186.1 emits behind-window back walls as its *last*
    // contiguous WALL run. Treat it as a dark physical room backing instead of
    // repeating exterior masonry inside the windows. Guard this assumption.
    const lastRun = runs[runs.length - 1];
    if (!lastRun || lastRun.zone !== 0 || runs.length < 4)
      throw new Error("Native facade zone order has changed; update its interior material mapping.");
    const data = new Float32Array(positions.count * 3);
    for (let index = 0; index < positions.count; index++) {
      const zone = Math.round(part.getX(index));
      const c = index >= lastRun.start ? interiorColor : palette[zone];
      data[index * 3] = c.r; data[index * 3 + 1] = c.g; data[index * 3 + 2] = c.b;
    }
    geometry.setAttribute("color", new Float32BufferAttribute(data, 3));
    geometry.clearGroups();
    const materialZone = [0, 1, 1, 1, 2, 3, 2, 4, 1];
    for (const run of runs) geometry.addGroup(run.start, run.count,
      run === lastRun ? 5 : materialZone[run.zone]);
    mesh.material = materials;
    geometry.computeBoundingBox();
    mesh.name = spec.id;
    mesh.userData.partRole = "procedural-masonry-facade";
    mesh.userData.partIds = ["masonry", "piers", "frames", "ornament", "glazing", "mechanical", "storefront", "interior-backing"];
    mesh.castShadow = true; mesh.receiveShadow = true;
    let disposed = false;
    return { mesh, geometry, material, materials, vertexCount: positions.count,
      dispose() { if (disposed) return; disposed = true; generator.dispose(); disposeMaterials(); } };
  } catch (error) {
    generator.dispose(); disposeMaterials(); throw error;
  }
}

export interface CraftTreeSpec {
  schemaVersion: 1;
  id: string;
  seed: number;
  /** Tree-generator trunk length in world units; upper branches extend above it. */
  trunkLength: number;
  trunkRadius: number;
  /** Generic trees use this crown shape; named species use their own branch profile. */
  crown?: "broad" | "slender";
  /** Stylized, recognizable branch/leaf silhouette, not a botanically accurate species model. */
  species?: "generic" | "oak" | "birch" | "pine";
  /** 0 = leafless. Up to 900 leaf or needle-spray instances for backdrop use. */
  leafCount: number;
  colors?: { bark?: RGB; leafDark?: RGB; leafLight?: RGB };
}

export function validateCraftTreeSpec(spec: CraftTreeSpec): void {
  if (spec?.schemaVersion !== 1 || !safeId(spec.id) || !safeSeed(spec.seed) ||
    !positive(spec.trunkLength, 12) || spec.trunkLength < 1 ||
    !positive(spec.trunkRadius, .8) || (spec.crown !== undefined && !["broad", "slender"].includes(spec.crown)) ||
    (spec.species !== undefined && !["generic", "oak", "birch", "pine"].includes(spec.species)) ||
    !Number.isInteger(spec.leafCount) || spec.leafCount < 0 || spec.leafCount > 900)
    throw new Error("Tree needs seed, id, trunkLength 1–12, trunkRadius (0,.8], optional valid crown/species and leafCount 0–900.");
  if (spec.colors && Object.values(spec.colors).some(value => !rgb(value)))
    throw new Error("Tree colors must be RGB integers.");
}

/** Two folded sides + a raised central vein, sharp intentional tip. Flat leaf
 * geometry with a real normal field; repeated in one instanced PBR draw call.
 */
function makeFoldedLeafGeometry(length: number, shape: "folded" | "lobed" | "serrated" = "folded"): BufferGeometry {
  const points: number[] = [], indices: number[] = [], colors: number[] = [];
  const rows = shape === "folded" ? 6 : 12;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const outline = shape === "lobed" ? .94 + .22 * Math.cos(t * Math.PI * 8)
      : shape === "serrated" ? .95 + .12 * Math.cos(t * Math.PI * 16) : 1;
    const width = shape === "lobed" ? .35 : shape === "serrated" ? .18 : .22;
    const w = Math.pow(Math.sin(Math.PI * t), .85) * length * width * outline;
    const sweep = -t * t * length * (shape === "serrated" ? .16 : .24);
    const y = t * length;
    for (let side = -1; side <= 1; side++) {
      points.push(side * w, y, sweep + (side === 0 ? length * .055 * Math.sin(Math.PI * t) : 0));
      const tone = side === 0 ? .9 : .72 + t * .1;
      colors.push(tone, tone, tone);
    }
  }
  for (let row = 0; row < rows; row++) for (let side = 0; side < 2; side++) {
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

/** A radial conifer twig, not a broadleaf painted green: each small instance
 * has a central spine and twenty-four tapered, angled needles in 3D. One
 * geometry is shared by every instance and stays compatible with WebGL PBR.
 */
function makeNeedleSprayGeometry(length: number): BufferGeometry {
  const points: number[] = [], colors: number[] = [];
  const triangle = (a: number[], b: number[], c: number[], tone: number) => {
    points.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) colors.push(tone, tone, tone);
  };
  // Slim central green twig; the needle roots are physically attached to it.
  triangle([-.012 * length, 0, 0], [.012 * length, 0, 0], [0, length, 0], .56);
  for (let tier = 0; tier < 12; tier++) {
    const t = (tier + .5) / 12;
    for (let side = 0; side < 2; side++) {
      const azimuth = tier * 2.39996323 + side * Math.PI;
      const radius = (.26 + .1 * (1 - t)) * length;
      const width = .026 * length;
      const dx = Math.cos(azimuth), dz = Math.sin(azimuth);
      const centerY = (.12 + .76 * t) * length;
      const base = [0, centerY, 0];
      const tip = [dx * radius, centerY + (.15 + .13 * t) * length, dz * radius];
      triangle(base, [tip[0] - dz * width, tip[1], tip[2] + dx * width],
        [tip[0] + dz * width, tip[1], tip[2] - dx * width], .72 + .17 * t);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const TREE_PROFILES = {
  oak: { children: [4, 7, 5], angles: [48, 64, 70], lengthRatio: .68, falloff: .13,
    droop: .08, upPull: .2, trunkClear: .26, lengthVariance: .2 },
  birch: { children: [4, 7, 4], angles: [26, 37, 53], lengthRatio: .61, falloff: .12,
    droop: .18, upPull: .5, trunkClear: .34, lengthVariance: .17 },
  pine: { children: [6, 7, 5], angles: [65, 66, 59], lengthRatio: .58, falloff: .72,
    droop: .025, upPull: .16, trunkClear: .09, lengthVariance: .1 },
} as const;

/** Branch positions are inherited from native TreeGenerator. Leaf weighting
 * concentrates individual folded leaves on actual upper branch surfaces, not
 * in a random volume unrelated to the branches.
 */
export function createCraftTree(spec: CraftTreeSpec) {
  validateCraftTreeSpec(spec);
  const species = spec.species ?? "generic";
  const profile = species === "generic" ? {
    children: spec.crown === "slender" ? [3, 5, 4] : [3, 7, 4],
    angles: spec.crown === "slender" ? [20, 30, 39] : [46, 58, 65],
    lengthRatio: .62, falloff: 0, droop: .05, upPull: .3, trunkClear: .25, lengthVariance: 0,
  } : TREE_PROFILES[species];
  const barkMaterial = new MeshStandardMaterial({ color: spec.colors?.bark ??
    (species === "birch" ? 0xaaa99a : species === "pine" ? 0x544337 : 0x514439),
    roughness: .94, metalness: 0 });
  const generator = new TreeGenerator(barkMaterial).setSeed(spec.seed).setLevels(4)
    .setChildren([...profile.children]).setBranchAngle([...profile.angles])
    .setLengthRatio(profile.lengthRatio).setBranchLengthFalloff(profile.falloff)
    .setDroop(profile.droop).setUpPull(profile.upPull).setTrunkClear(profile.trunkClear)
    .setLengthVariance(profile.lengthVariance)
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
      const lowerCrown = species === "pine" ? .12 : species === "birch" ? .31 : .26;
      for (let index = 0; index < positions.count; index++)
        density[index] = Math.pow(Math.max(0, (positions.getY(index) / maxY - lowerCrown) / (1 - lowerCrown)),
          species === "pine" ? .42 : .8);
      branchGeometry.setAttribute("foliageWeight", new Float32BufferAttribute(density, 1));
      const placements = createCraftScatter({ schemaVersion: 1, id: `${spec.id}-leaves`,
        mode: "surface", seed: spec.seed + 17, count: spec.leafCount, weightAttribute: "foliageWeight",
        surfaceNormal: true, randomYaw: true, normalOffset: .025,
        scale: [.65, 1.3] }, branches);
      const leafLength = Math.min(species === "pine" ? .42 : .52, spec.trunkLength * .12);
      leafGeometry = species === "pine" ? makeNeedleSprayGeometry(leafLength)
        : makeFoldedLeafGeometry(leafLength, species === "oak" ? "lobed" : species === "birch" ? "serrated" : "folded");
      foliageMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: .88,
        side: DoubleSide, vertexColors: true });
      leafInstances = createCraftScatterInstances(placements, leafGeometry, foliageMaterial);
      foliage = leafInstances.mesh;
      foliage.name = `${spec.id}-leaves`;
      const dark = new Color(spec.colors?.leafDark ??
        (species === "pine" ? 0x203c31 : species === "birch" ? 0x496f38 : 0x274d31));
      const light = new Color(spec.colors?.leafLight ??
        (species === "pine" ? 0x4e7161 : species === "birch" ? 0x92a75a : 0x64834a));
      for (let index = 0; index < spec.leafCount; index++) {
        const hueT = ((Math.imul(index + 1, 2654435761 ^ spec.seed) >>> 0) % 1024) / 1024;
        foliage.setColorAt(index, dark.clone().lerp(light, hueT));
      }
      if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
      group.add(foliage);
    }
    group.userData.partRole = "procedural-background-tree";
    group.userData.species = species;
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
