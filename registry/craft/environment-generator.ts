/** Reusable authored background/midground geometry around THREE's bundled
 * TreeGenerator and SkyscraperGenerator. Replaces long one-off tree/facade
 * scripts with a small style spec while retaining Kumiki's WebGL PBR scene,
 * camera and frame evaluator. Not a replacement for hero-grade GLB assets.
 */
import {
  BoxGeometry, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group,
  InstancedMesh, Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, Vector3,
} from "three";
import { TreeGenerator } from "three/addons/generators/TreeGenerator.js";
import { SkyscraperGenerator } from "three/addons/generators/city/SkyscraperGenerator.js";
import { createCraftScatterInstances } from "./scatter-placement";
import type { CraftPlacement } from "./scatter-placement";
import { applyCraftMasonryFinish, validateCraftMasonryFinish } from "./masonry-finish";
import type { CraftMasonryFinishOptions } from "./masonry-finish";
export { createCraftStreetscape, validateCraftStreetscape } from "./streetscape";
export type { CraftStreetscapeSpec } from "./streetscape";
export { createCraftStreetLamps, planCraftStreetLamps, validateCraftStreetLampSpec } from "./street-lamps";
export type { CraftStreetLampSpec } from "./street-lamps";
export { applyCraftMasonryFinish, validateCraftMasonryFinish } from "./masonry-finish";
export type { CraftMasonryFinishOptions } from "./masonry-finish";

type RGB = number;
const rgb = (v: unknown): v is RGB => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 0xffffff;
const positive = (n: number, max: number) => Number.isFinite(n) && n > 0 && n <= max;
const safeId = (id: unknown): id is string => typeof id === "string" && !!id.trim() && id.length <= 96;
const safeSeed = (seed: unknown) => Number.isSafeInteger(seed);

export interface CraftWindowTreatmentOptions {
  /** Fraction of distinct rooms with a visible shade or curtain; 0–1. Default .58. */
  coverage?: number;
  /** Mixed assigns each treated room a seeded roller shade or pleated curtain. */
  style?: "mixed" | "roller" | "curtains";
}

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
  /** Optional open-front room pockets aligned to the native pane's room metadata.
   * Absent = native dark window backing and no extra geometry or draw calls.
   */
  interiors?: { depth?: number; litFraction?: number;
    /** Behind-glass physical window dressing, batched in one instanced draw.
     * false = no extra geometry; omitted = seeded mixed curtains and shades. */
    windowTreatments?: false | CraftWindowTreatmentOptions };
  /** WebGL running-bond masonry with mortar and per-brick variation, enabled by
   * default on exterior wall material. `false` retains flat masonry shading. */
  masonry?: false | CraftMasonryFinishOptions;
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
  if (spec.interiors && (typeof spec.interiors !== "object" || Array.isArray(spec.interiors) ||
    (spec.interiors.depth !== undefined && (!Number.isFinite(spec.interiors.depth) ||
      spec.interiors.depth < .7 || spec.interiors.depth > 3)) ||
    (spec.interiors.litFraction !== undefined && (!Number.isFinite(spec.interiors.litFraction) ||
      spec.interiors.litFraction < 0 || spec.interiors.litFraction > 1))))
    throw new Error("Facade interior depth must be .7–3 and litFraction must be 0–1.");
  if (spec.interiors?.windowTreatments !== undefined && spec.interiors.windowTreatments !== false) {
    const treatment = spec.interiors.windowTreatments;
    if (!treatment || typeof treatment !== "object" || Array.isArray(treatment) ||
      (treatment.coverage !== undefined && (!Number.isFinite(treatment.coverage) ||
        treatment.coverage < 0 || treatment.coverage > 1)) ||
      (treatment.style !== undefined && !["mixed", "roller", "curtains"].includes(treatment.style)))
      throw new Error("Facade windowTreatments require coverage 0–1 and style mixed, roller or curtains.");
  }
  if (spec.masonry !== undefined && spec.masonry !== false) validateCraftMasonryFinish(spec.masonry);
}

const MAX_FACADE_VERTICES = 240_000;
const MAX_INTERIOR_ROOMS = 1500;

/** Convert upstream per-glass roomCenter/roomSize/normal attributes into real
 * bounded geometry. One room often spans several panes; deduplication prevents
 * opaque duplicated walls and wasteful per-window draw calls. The native
 * backing run is suppressed by the caller only when these rooms are installed.
 */
function createFacadeInteriors(geometry: BufferGeometry, seed: number, depth: number,
  litFraction: number, rearColor: number, treatmentOptions?: false | CraftWindowTreatmentOptions) {
  const part = geometry.getAttribute("partId");
  const centerAttr = geometry.getAttribute("roomCenter");
  const sizeAttr = geometry.getAttribute("roomSize");
  const normalAttr = geometry.getAttribute("normal");
  if (!part || !centerAttr || !sizeAttr || !normalAttr ||
    [part, centerAttr, sizeAttr, normalAttr].some(attr => attr.count !== geometry.getAttribute("position").count))
    throw new Error("Native facade needs consistent pane room metadata for optional interiors.");

  type Room = { center: Vector3; normal: Vector3; width: number; height: number };
  const rooms = new Map<string, Room>();
  for (let index = 0; index < part.count; index++) {
    const zone = Math.round(part.getX(index));
    if (zone !== 4 && zone !== 6) continue;
    const center = new Vector3(centerAttr.getX(index), centerAttr.getY(index), centerAttr.getZ(index));
    const normal = new Vector3(normalAttr.getX(index), normalAttr.getY(index), normalAttr.getZ(index));
    const width = sizeAttr.getX(index), height = sizeAttr.getY(index);
    if (![center.x, center.y, center.z, normal.x, normal.y, normal.z, width, height].every(Number.isFinite) ||
      width < .3 || height < .3 || Math.abs(normal.y) > .05 || normal.lengthSq() < .95)
      throw new Error("Native facade has invalid glazing room coordinates or outward normals.");
    normal.y = 0; normal.normalize();
    const key = [center.x, center.y, center.z, normal.x, normal.z, width, height]
      .map(value => Math.round(value * 1000)).join("/");
    if (!rooms.has(key)) rooms.set(key, { center, normal, width, height });
    if (rooms.size > MAX_INTERIOR_ROOMS)
      throw new Error(`Facade would create over ${MAX_INTERIOR_ROOMS} rooms; disable interiors for large backdrops.`);
  }
  if (rooms.size === 0) throw new Error("Native facade did not expose any glass-room metadata.");

  const roomList = [...rooms.values()];
  const coverage = treatmentOptions === false ? 0 : treatmentOptions?.coverage ?? .58;
  const treatmentStyle = treatmentOptions === false ? "mixed" : treatmentOptions?.style ?? "mixed";
  const hash01 = (index: number, salt: number) =>
    (Math.imul((index + salt) ^ seed, 0x9e3779b1) >>> 0) / 4294967296;
  const treatedRooms = new Set(roomList.filter((_, index) => hash01(index, 47) < coverage));
  const box = new BoxGeometry(1, 1, 1);
  const roomMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: .9, metalness: 0 });
  const lightMaterial = new MeshStandardMaterial({ color: 0xffdfaa, roughness: .42,
    emissive: 0xffc37b, emissiveIntensity: .9 });
  const roomParts = new InstancedMesh(box, roomMaterial, rooms.size * 8);
  const litRooms = roomList.filter((_, index) => hash01(index, 1) < litFraction);
  const litRoomSet = new Set(litRooms);
  const lightParts = litRooms.length ? new InstancedMesh(box, lightMaterial, litRooms.length) : undefined;
  const treatmentMaterial = treatedRooms.size ? new MeshStandardMaterial({
    color: 0xffffff, roughness: .92, metalness: 0 }) : undefined;
  // At most six folded fabric segments and one header rail per dressed room.
  // Fixed unit geometry and one material keep the added GPU cost one draw call.
  const treatmentParts = treatmentMaterial
    ? new InstancedMesh(box, treatmentMaterial, treatedRooms.size * 7) : undefined;
  const group = new Group(); group.name = "facade-interior-pockets";
  const up = new Vector3(0, 1, 0);
  const rear = new Color(rearColor), wall = new Color(0x938b80), ceiling = new Color(0xaaa99e);
  const floor = new Color(0x665b4f), cabinet = new Color(0x574b42);
  const fabricWarm = new Color(0xb5a18b), fabricCool = new Color(0x87969b);
  const railColor = new Color(0x616461);
  let partIndex = 0, lightIndex = 0, treatmentIndex = 0;
  const place = (mesh: InstancedMesh, index: number, room: Room, x: number, y: number, z: number,
    width: number, height: number, thickness: number, color?: Color) => {
    const u = new Vector3().crossVectors(up, room.normal).normalize();
    const position = room.center.clone().addScaledVector(u, x).addScaledVector(up, y)
      .addScaledVector(room.normal, z);
    const matrix = new Matrix4().makeBasis(u, up, room.normal)
      .scale(new Vector3(width, height, thickness)).setPosition(position);
    mesh.setMatrixAt(index, matrix);
    if (color) mesh.setColorAt(index, color);
  };
  for (const [roomIndex, room] of roomList.entries()) {
    const w = Math.max(.3, room.width - .06), h = room.height;
    const innerDepth = depth - .08, z = -.08 - innerDepth / 2;
    place(roomParts, partIndex++, room, -w / 2, 0, z, .075, h, innerDepth, wall);
    place(roomParts, partIndex++, room, w / 2, 0, z, .075, h, innerDepth, wall);
    place(roomParts, partIndex++, room, 0, -h / 2, z, w, .075, innerDepth, floor);
    place(roomParts, partIndex++, room, 0, h / 2, z, w, .075, innerDepth, ceiling);
    place(roomParts, partIndex++, room, 0, 0, -depth, w, h, .075, rear);
    // Furniture silhouettes at physically consistent depths, not pane decals.
    const offset = ((Math.imul(roomIndex + 3, 1597334677 ^ seed) >>> 0) % 1024) / 1024;
    const furnitureX = (offset - .5) * w * .38;
    place(roomParts, partIndex++, room, furnitureX, -h / 2 + .42, -depth * .69,
      w * .34, .74, .36, cabinet);
    place(roomParts, partIndex++, room, -furnitureX, -h / 2 + .9, -depth * .9,
      w * .47, .09, .28, wall);
    place(roomParts, partIndex++, room, -furnitureX, -h / 2 + .48, -depth * .89,
      .065, .78, .12, cabinet);
    if (lightParts && litRoomSet.has(room)) place(lightParts, lightIndex++, room,
      0, h / 2 - .12, -depth * .48, w * .33, .04, .22);
    if (treatmentParts && treatedRooms.has(room)) {
      const style = treatmentStyle === "mixed"
        ? (hash01(roomIndex, 83) < .5 ? "roller" : "curtains") : treatmentStyle;
      const fabric = fabricWarm.clone().lerp(fabricCool, hash01(roomIndex, 149));
      if (style === "roller") {
        const lowered = h * (.16 + hash01(roomIndex, 197) * .44);
        place(treatmentParts, treatmentIndex++, room, 0, h / 2 - .065 - lowered / 2,
          -.21, w * .91, lowered, .027, fabric);
        place(treatmentParts, treatmentIndex++, room, 0, h / 2 - .065, -.17,
          w * .94, .045, .045, railColor);
      } else {
        const foldHeight = Math.max(.20, h - .16);
        for (const side of [-1, 1]) for (let fold = 0; fold < 3; fold++) {
          const stripWidth = w * .074;
          const x = side * (w / 2 - .035 - stripWidth * (fold + .5));
          place(treatmentParts, treatmentIndex++, room, x, -.015,
            -.22 - (fold % 2) * .026, stripWidth * 1.1, foldHeight, .034, fabric);
        }
        place(treatmentParts, treatmentIndex++, room, 0, h / 2 - .095,
          -.165, w * .96, .032, .036, railColor);
      }
    }
  }
  roomParts.count = partIndex;
  roomParts.instanceMatrix.needsUpdate = true;
  if (roomParts.instanceColor) roomParts.instanceColor.needsUpdate = true;
  roomParts.computeBoundingSphere();
  roomParts.name = "room-walls-furnishings";
  roomParts.receiveShadow = true;
  group.add(roomParts);
  if (lightParts) {
    lightParts.count = lightIndex;
    lightParts.instanceMatrix.needsUpdate = true;
    lightParts.computeBoundingSphere();
    lightParts.name = "warm-ceiling-fixtures";
    group.add(lightParts);
  }
  if (treatmentParts) {
    treatmentParts.count = treatmentIndex;
    treatmentParts.instanceMatrix.needsUpdate = true;
    if (treatmentParts.instanceColor) treatmentParts.instanceColor.needsUpdate = true;
    treatmentParts.computeBoundingSphere();
    treatmentParts.name = "recessed-window-dressings";
    treatmentParts.receiveShadow = true;
    group.add(treatmentParts);
  }
  group.userData.partRole = "procedural-window-interiors";
  group.userData.roomCount = rooms.size;
  group.userData.litRoomCount = litRooms.length;
  group.userData.treatmentRoomCount = treatedRooms.size;
  group.userData.partIds = [roomParts.name, ...(lightParts ? [lightParts.name] : []),
    ...(treatmentParts ? [treatmentParts.name] : [])];
  let disposed = false;
  return { group, roomParts, lightParts, treatmentParts, roomCount: rooms.size,
    litRoomCount: litRooms.length, treatmentRoomCount: treatedRooms.size,
    treatmentPieceCount: treatmentIndex,
    dispose() { if (disposed) return; disposed = true;
      group.removeFromParent(); group.clear(); roomParts.dispose(); lightParts?.dispose(); treatmentParts?.dispose();
      box.dispose(); roomMaterial.dispose(); lightMaterial.dispose(); treatmentMaterial?.dispose();
    } };
}

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
  if (spec.masonry !== false)
    applyCraftMasonryFinish(material, { ...spec.masonry, seed: spec.masonry?.seed ?? spec.seed });
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
  let interiors: ReturnType<typeof createFacadeInteriors> | undefined;
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
    for (const run of runs) {
      if (run === lastRun && spec.interiors) continue;
      geometry.addGroup(run.start, run.count, run === lastRun ? 5 : materialZone[run.zone]);
    }
    mesh.material = materials;
    if (spec.interiors) {
      interiors = createFacadeInteriors(geometry, spec.seed, spec.interiors.depth ?? 1.8,
        spec.interiors.litFraction ?? .27, colors.interior, spec.interiors.windowTreatments);
      mesh.add(interiors.group);
    }
    geometry.computeBoundingBox();
    mesh.name = spec.id;
    mesh.userData.partRole = "procedural-masonry-facade";
    mesh.userData.partIds = ["masonry", "piers", "frames", "ornament", "glazing", "mechanical", "storefront", "interior-backing"];
    mesh.castShadow = true; mesh.receiveShadow = true;
    let disposed = false;
    return { mesh, geometry, material, materials, interiors, vertexCount: positions.count,
      dispose() { if (disposed) return; disposed = true;
        interiors?.dispose(); generator.dispose(); disposeMaterials(); } };
  } catch (error) {
    interiors?.dispose(); generator.dispose(); disposeMaterials(); throw error;
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
  const rows = shape === "folded" ? 8 : 16;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    // Frequencies stay below the contour sampling rate: the previous eight
    // serrations across twelve rows aliased into an uneven sawtooth outline.
    const outline = shape === "lobed" ? .86 + .28 * Math.cos(t * Math.PI * 6)
      : shape === "serrated" ? .94 + .14 * Math.cos(t * Math.PI * 10) : 1;
    const width = shape === "lobed" ? .35 : shape === "serrated" ? .18 : .22;
    const w = Math.pow(Math.sin(Math.PI * t), .85) * length * width * outline;
    const sweep = -t * t * length * (shape === "serrated" ? .16 : .24);
    const y = t * length;
    for (let side = -1; side <= 1; side++) {
      const asymmetry = side === -1 ? .94 + .06 * Math.sin(t * Math.PI * 3) : 1;
      const cupping = Math.sin(Math.PI * t) * length * (side === 0 ? .064 : -.018);
      points.push(side * w * asymmetry, y, sweep + cupping + side * length * .013 * Math.sin(t * Math.PI * 2));
      const tone = side === 0 ? .93 : .73 + t * .1;
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

/** A single batchable, physically attached broadleaf spray instead of a
 * billboard-like single leaf per instance. A tapered branchlet carries 2–4
 * alternate, cupped leaves with raised veins and distinct seeded orientations.
 * Only one geometry/material is still drawn for all foliage instances.
 */
function makeBroadleafSprayGeometry(length: number,
  shape: "folded" | "lobed" | "serrated", seed: number): BufferGeometry {
  const count = shape === "serrated" ? 4 : shape === "lobed" ? 3 : 2;
  const leaf = makeFoldedLeafGeometry(length * (shape === "serrated" ? .56 : .7), shape);
  const srcPosition = leaf.getAttribute("position"), srcColor = leaf.getAttribute("color");
  const points: number[] = [], indices: number[] = [], colors: number[] = [];
  const height = length * .65, radial = 6, rings = 5;
  for (let ring = 0; ring < rings; ring++) {
    const t = ring / (rings - 1), y = t * height;
    const radius = length * (.019 - t * .014);
    for (let side = 0; side < radial; side++) {
      const angle = side * Math.PI * 2 / radial;
      points.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      const tone = .42 + .12 * t;
      colors.push(tone, tone * 1.04, tone * .82);
    }
  }
  for (let ring = 0; ring < rings - 1; ring++) for (let side = 0; side < radial; side++) {
    const a = ring * radial + side, b = ring * radial + (side + 1) % radial;
    indices.push(a, a + radial, b, b, a + radial, b + radial);
  }
  const up = new Vector3(0, 1, 0), vertex = new Vector3();
  for (let leaflet = 0; leaflet < count; leaflet++) {
    const phase = (seed % 997) * .0127;
    const angle = phase + leaflet * 2.39996323;
    const outward = leaflet === count - 1 ? .38 : .76;
    const target = new Vector3(Math.cos(angle) * outward, .78,
      Math.sin(angle) * outward).normalize();
    const orientation = new Quaternion().setFromUnitVectors(up, target);
    const baseY = height * (.17 + leaflet * .66 / Math.max(1, count - 1));
    const offset = points.length / 3;
    for (let index = 0; index < srcPosition.count; index++) {
      vertex.fromBufferAttribute(srcPosition, index).applyQuaternion(orientation);
      points.push(vertex.x, vertex.y + baseY, vertex.z);
      const tone = .9 + .1 * ((leaflet * 7 + seed) % 5) / 4;
      colors.push(srcColor.getX(index) * tone, srcColor.getY(index) * tone,
        srcColor.getZ(index) * tone);
    }
    for (let index = 0; index < leaf.index!.count; index++)
      indices.push(offset + leaf.index!.getX(index));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.leafletsPerSpray = count;
  leaf.dispose();
  return geometry;
}

/** Meso-scale wood variation evaluated once at branch vertices. This is
 * restrained color variation, not a fake normal map or photoreal bark atlas.
 * Species use distinct bark warmth, axial ridges and mottling with no UVs.
 */
function tintTreeBark(geometry: BufferGeometry, species: CraftTreeSpec["species"], seed: number) {
  const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal");
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index);
    const nx = normals.getX(index), nz = normals.getZ(index);
    const angle = Math.atan2(nz, nx);
    const ridge = Math.sin(angle * 7 + y * .42 + Math.sin(x * 1.7 + z * 1.3) * .7);
    const grain = Math.sin(y * 8.1 + x * 15.3 + z * 11.7 + seed * .37);
    const mottle = Math.sin(x * 3.7 - z * 4.9 + y * 1.2 + seed * .11);
    const contrast = species === "birch" ? .075 : species === "oak" ? .13 : .11;
    const shade = Math.max(.65, Math.min(1.18,
      .91 + ridge * contrast + grain * .035 + mottle * .045));
    colors[index * 3] = shade * (species === "pine" ? 1.06 : 1);
    colors[index * 3 + 1] = shade * (species === "pine" ? .95 : species === "birch" ? 1.015 : .99);
    colors[index * 3 + 2] = shade * (species === "birch" ? 1.025 : .96);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
}

/** A radial conifer shoot, not a broadleaf painted green. Twenty-four narrow
 * needles emerge from a tapered tubular shoot. Each needle has several curved
 * sections and a raised center ridge, rather than one broad flat triangle;
 * tapered tips and thin waxy edges remain readable from oblique views. */
function makeNeedleSprayGeometry(length: number): BufferGeometry {
  const points: number[] = [], colors: number[] = [], indices: number[] = [];
  const sides = 6, rings = 5;
  const spineBase = points.length / 3;
  for (let ring = 0; ring < rings; ring++) {
    const t = ring / (rings - 1), y = t * length * .94;
    const radius = length * (.020 - .014 * t);
    for (let side = 0; side < sides; side++) {
      const angle = side * Math.PI * 2 / sides;
      points.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      const tone = .44 + .15 * t + .06 * Math.cos(angle);
      colors.push(tone, tone, tone * .88);
    }
  }
  for (let ring = 0; ring < rings - 1; ring++) for (let side = 0; side < sides; side++) {
    const a = spineBase + ring * sides + side;
    const b = spineBase + (ring + 1) * sides + side;
    const next = (side + 1) % sides;
    indices.push(a, b, spineBase + ring * sides + next,
      spineBase + ring * sides + next, b, spineBase + (ring + 1) * sides + next);
  }
  for (let tier = 0; tier < 12; tier++) {
    const t = (tier + .5) / 12;
    for (let side = 0; side < 2; side++) {
      const azimuth = tier * 2.39996323 + side * Math.PI;
      const dx = Math.cos(azimuth), dz = Math.sin(azimuth);
      const shootY = (.12 + .74 * t) * length;
      const bladeLength = (.31 + .11 * (1 - t)) * length;
      const first = points.length / 3;
      for (let section = 0; section <= 4; section++) {
        const u = section / 4;
        // Emerge nearly horizontal, rise in the middle and gently settle near
        // the thin point. Adjacent facets share the same physical centerline.
        const run = bladeLength * u;
        const centerX = dx * run * .91;
        const centerY = shootY + bladeLength * (.28 * u + .12 * Math.sin(Math.PI * u) - .045 * u * u);
        const centerZ = dz * run * .91;
        const width = length * (.002 + .011 * Math.sin(Math.PI * u) ** .75) * (1 - u ** 8);
        for (const edge of [-1, 0, 1]) {
          points.push(centerX - dz * edge * width,
            centerY + (edge === 0 ? width * .38 : 0),
            centerZ + dx * edge * width);
          const tone = (.72 + .16 * t + (edge === 0 ? .09 : -.045)) *
            (section === 4 ? .84 : 1);
          colors.push(tone * .94, tone, tone * .91);
        }
      }
      for (let section = 0; section < 4; section++) for (let edge = 0; edge < 2; edge++) {
        const a = first + section * 3 + edge, b = a + 3;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.needleCount = 24;
  return geometry;
}

const TREE_PROFILES = {
  // Broad lateral scaffolds, finer outward forks and a light-seeking upper crown.
  oak: { children: [5, 6, 4], angles: [53, 68, 76], lengthRatio: .7, falloff: .16,
    droop: .12, upPull: .16, trunkClear: .23, lengthVariance: .27 },
  // Erect central stem but visibly hanging fine shoots, unlike an oak crown.
  birch: { children: [4, 7, 6], angles: [29, 47, 63], lengthRatio: .64, falloff: .13,
    droop: .43, upPull: .32, trunkClear: .32, lengthVariance: .23 },
} as const;

/** Pines preserve a single dominant terminal leader. The native spiral-fork
 * generator is effective for deciduous crowns, but produces a blunt/random
 * apex for young conifers. This pine variant uses separated annual whorls:
 * older/lower laterals spread widest, new upper laterals are shorter, and
 * short candle shoots surround (rather than replace) the upright leader.
 * The resulting indexed tubes keep the same two-draw wood/needle pipeline. */
function buildPineBranchGeometry(spec: CraftTreeSpec): BufferGeometry {
  let state = spec.seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const positions: number[] = [], indices: number[] = [];
  const up = new Vector3(0, 1, 0);
  const height = spec.trunkLength, radius = spec.trunkRadius;
  const trunkAt = (t: number) => new Vector3(
    height * (.006 * Math.sin(t * 5.1 + spec.seed * .19) - .004 * Math.sin(spec.seed * .19)),
    t * height,
    height * (.005 * Math.sin(t * 4.4 + spec.seed * .07) - .005 * Math.sin(spec.seed * .07)));

  const tube = (centers: Vector3[], rootRadius: number, tipRadius: number, radial: number) => {
    const startIndex = positions.length / 3;
    for (let ring = 0; ring < centers.length; ring++) {
      const t = ring / (centers.length - 1);
      const tangent = centers[Math.min(centers.length - 1, ring + 1)].clone()
        .sub(centers[Math.max(0, ring - 1)]).normalize();
      const normal = new Vector3().crossVectors(tangent,
        Math.abs(tangent.y) > .92 ? new Vector3(1, 0, 0) : up).normalize();
      const binormal = new Vector3().crossVectors(tangent, normal).normalize();
      const r = rootRadius + (tipRadius - rootRadius) * t ** .8;
      for (let sector = 0; sector < radial; sector++) {
        const a = sector * Math.PI * 2 / radial;
        const point = centers[ring].clone().addScaledVector(normal, Math.cos(a) * r)
          .addScaledVector(binormal, Math.sin(a) * r);
        positions.push(point.x, point.y, point.z);
      }
    }
    for (let ring = 0; ring < centers.length - 1; ring++) for (let sector = 0; sector < radial; sector++) {
      const a = startIndex + ring * radial + sector;
      const b = startIndex + (ring + 1) * radial + sector;
      const next = (sector + 1) % radial;
      const aNext = startIndex + ring * radial + next;
      const bNext = startIndex + (ring + 1) * radial + next;
      indices.push(a, bNext, b, a, aNext, bNext);
    }
  };

  const trunk: Vector3[] = [];
  for (let i = 0; i <= 16; i++) trunk.push(trunkAt(i / 16));
  tube(trunk, radius * 1.38, Math.max(.009, radius * .065), 8);

  const levels = [.24, .39, .53, .67, .81];
  const whorls: Array<{ y: number; reach: number; branches: number }> = [];
  levels.forEach((level, tier) => {
    const branches = 3 + (tier % 2) + Math.floor(random() * 2);
    const tierPhase = tier * .72 + random() * .18;
    const reach = height * .61 * Math.pow(1 - level, .68);
    whorls.push({ y: height * level, reach, branches });
    for (let branch = 0; branch < branches; branch++) {
      const angle = tierPhase + branch * Math.PI * 2 / branches + (random() - .5) * .18;
      const radial = new Vector3(Math.cos(angle), 0, Math.sin(angle));
      const across = new Vector3(-radial.z, 0, radial.x);
      const branchReach = reach * (.78 + random() * .35);
      const root = trunkAt(level + (random() - .5) * .007);
      const main: Vector3[] = [];
      const sway = (random() - .5) * .13 * branchReach;
      for (let step = 0; step <= 7; step++) {
        const u = step / 7;
        main.push(root.clone().addScaledVector(radial, branchReach * u)
          .addScaledVector(across, sway * Math.sin(Math.PI * u))
          .addScaledVector(up, branchReach * (-.075 * Math.sin(Math.PI * u) + .13 * u * u)));
      }
      const branchRadius = Math.max(.014, radius * (.26 - level * .07));
      tube(main, branchRadius, Math.max(.006, branchRadius * .28), 5);
      // New shoots emerge toward the *ends* of laterals, where most pine
      // needles live. Each root lies on its supporting branch centerline.
      for (let shoot = 0; shoot < 3; shoot++) {
        const u = .47 + shoot * .23;
        const f = u * 7, section = Math.min(6, Math.floor(f));
        const rootPoint = main[section].clone().lerp(main[section + 1], f - section);
        const side = shoot % 2 ? 1 : -1;
        const heading = radial.clone().multiplyScalar(.86)
          .addScaledVector(across, side * (.36 + random() * .18))
          .addScaledVector(up, .3 + .35 * level).normalize();
        const shootLength = branchReach * (.17 + random() * .1);
        const centers: Vector3[] = [];
        for (let segment = 0; segment <= 4; segment++) {
          const t = segment / 4;
          centers.push(rootPoint.clone().addScaledVector(heading, shootLength * t)
            .addScaledVector(up, shootLength * .13 * t * t));
        }
        tube(centers, Math.max(.0055, radius * .054), Math.max(.0028, radius * .025), 3);
      }
    }
  });

  // The latest annual growth remains visibly *above* the highest whorl.
  // Sparse candles around the leader keep a tapered tip instead of a dense
  // spherical crown cap. Their radial=3 tubes are discoverable for needles.
  for (let candle = 0; candle < 8; candle++) {
    const t = .86 + candle / 8 * .12;
    const angle = candle * 2.39996323 + spec.seed * .17;
    const horizontal = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    const start = trunkAt(t), shootLength = height * (.068 - .026 * candle / 8);
    const centers: Vector3[] = [];
    for (let segment = 0; segment <= 4; segment++) {
      const u = segment / 4;
      centers.push(start.clone().addScaledVector(up, shootLength * u)
        .addScaledVector(horizontal, shootLength * (.23 + .2 * candle / 8) * u * u));
    }
    tube(centers, Math.max(.005, radius * .043), Math.max(.0024, radius * .021), 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.pineWhorls = whorls;
  geometry.userData.pineLeaderHeight = height;
  geometry.userData.pineCandleCount = 8;
  return geometry;
}

type TerminalTwig = { rings: Vector3[] };

/** Recover the native generator's *connected tubes* from its indexed mesh.
 * Ring vertices are contiguous inside each tube, while adjoining parent/child
 * tubes use separate indices. The finest radial=3 tubes are terminal shoots.
 * Using their centerlines avoids foliage appearing halfway down the trunk or
 * emerging perpendicular from arbitrary bark triangles. No generator fork. */
function collectTerminalTwigs(geometry: BufferGeometry): TerminalTwig[] {
  const position = geometry.getAttribute("position"), index = geometry.index;
  if (!index || !position) throw new Error("Tree branches need indexed tube geometry.");
  const parent = new Int32Array(position.count);
  for (let i = 0; i < parent.length; i++) parent[i] = i;
  const find = (node: number): number => {
    let root = node;
    while (parent[root] !== root) root = parent[root];
    while (parent[node] !== node) { const next = parent[node]; parent[node] = root; node = next; }
    return root;
  };
  const join = (a: number, b: number) => { parent[find(a)] = find(b); };
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    join(a, index.getX(i + 1)); join(a, index.getX(i + 2));
  }
  const ranges = new Map<number, { first: number; last: number; radial: number }>();
  for (let i = 0; i < position.count; i++) {
    const root = find(i), entry = ranges.get(root);
    if (entry) entry.last = i;
    else ranges.set(root, { first: i, last: i, radial: 0 });
  }
  for (let i = 0; i < index.count; i += 3) {
    const root = find(index.getX(i)), range = ranges.get(root)!;
    if (!range.radial) range.radial = index.getX(i + 2) - index.getX(i);
  }
  const result: TerminalTwig[] = [];
  for (const range of [...ranges.values()].sort((a, b) => a.first - b.first)) {
    if (range.radial !== 3 || (range.last - range.first + 1) % 3 !== 0) continue;
    const rings: Vector3[] = [];
    for (let i = range.first; i <= range.last; i += 3) {
      const center = new Vector3();
      for (let j = 0; j < 3; j++) center.add(new Vector3().fromBufferAttribute(position, i + j));
      rings.push(center.multiplyScalar(1 / 3));
    }
    if (rings.length > 2 && rings[0].distanceTo(rings[rings.length - 1]) > .02)
      result.push({ rings });
  }
  if (!result.length) throw new Error("Tree generator produced no terminal twigs for foliage.");
  return result;
}

/** Distribute sprays along the distal part of real twigs. Each spray's local
 * stem begins *inside* its twig, with orientation based on the twig tangent
 * plus species-specific gravity/phototropism rather than random bark normals.
 */
function twigFoliagePlacements(geometry: BufferGeometry, spec: CraftTreeSpec,
  species: NonNullable<CraftTreeSpec["species"]>): { placements: CraftPlacement[]; twigCount: number } {
  const twigs = collectTerminalTwigs(geometry);
  let state = (spec.seed + 17) >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const up = new Vector3(0, 1, 0);
  const startIndex = Math.floor(random() * twigs.length);
  const stride = twigs.length > 2 ? twigs.length - 1 : 1;
  const placements: CraftPlacement[] = [];
  for (let i = 0; i < spec.leafCount; i++) {
    const twig = twigs[(startIndex + i * stride) % twigs.length];
    const progress = (.36 + random() * .64) * (twig.rings.length - 1);
    const segment = Math.min(twig.rings.length - 2, Math.floor(progress));
    const position = twig.rings[segment].clone().lerp(twig.rings[segment + 1], progress - segment);
    const tangent = twig.rings[segment + 1].clone().sub(twig.rings[segment]).normalize();
    const horizontal = tangent.clone().setY(0);
    if (horizontal.lengthSq() < .0001)
      horizontal.set(Math.cos(i * 2.39996323), 0, Math.sin(i * 2.39996323));
    horizontal.normalize();
    const aim = tangent.clone().multiplyScalar(.8).addScaledVector(horizontal, .22)
      .addScaledVector(up, species === "birch" ? -.44 - random() * .18 :
        species === "oak" ? .2 + random() * .14 : .03);
    if (aim.lengthSq() < .01) aim.copy(horizontal);
    aim.normalize();
    const rotation = new Quaternion().setFromUnitVectors(up, aim)
      .multiply(new Quaternion().setFromAxisAngle(up, random() * Math.PI * 2));
    // The leader's current-season shoots are narrower and younger than the
    // surrounding branches. Smaller crowns near the axis preserve a tip.
    const nearPineApex = species === "pine" && position.y > spec.trunkLength * .86 &&
      Math.hypot(position.x, position.z) < spec.trunkLength * .17;
    const scale = nearPineApex ? .38 + random() * .32 : .65 + random() * .58;
    const matrix = new Matrix4().compose(position, rotation, new Vector3(scale, scale, scale));
    placements.push({ id: `${spec.id}-twig-${i}`, position, normal: aim, rotation, scale, matrix });
  }
  return { placements, twigCount: twigs.length };
}

/** TreeGenerator supplies the sculpted wood tubes; the foliage is attached to
 * the terminal shoot centerlines with distinct species growth attitudes. */
export function createCraftTree(spec: CraftTreeSpec) {
  validateCraftTreeSpec(spec);
  const species = spec.species ?? "generic";
  const profile = species === "generic" ? {
    children: spec.crown === "slender" ? [3, 5, 4] : [3, 7, 4],
    angles: spec.crown === "slender" ? [20, 30, 39] : [46, 58, 65],
    lengthRatio: .62, falloff: 0, droop: .05, upPull: .3, trunkClear: .25, lengthVariance: 0,
  } : species === "pine" ? null : TREE_PROFILES[species];
  const barkMaterial = new MeshStandardMaterial({ color: spec.colors?.bark ??
    (species === "birch" ? 0xaaa99a : species === "pine" ? 0x544337 : 0x514439),
    roughness: .94, metalness: 0, vertexColors: true });
  const generator = profile && new TreeGenerator(barkMaterial).setSeed(spec.seed).setLevels(4)
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
    const branches = species === "pine"
      ? new Mesh(buildPineBranchGeometry(spec), barkMaterial) : generator!.build();
    branchGeometry = branches.geometry;
    branches.name = `${spec.id}-branches`;
    branches.castShadow = true; branches.receiveShadow = true;
    group.add(branches);
    tintTreeBark(branchGeometry, species, spec.seed);
    branchGeometry.computeBoundingBox();
    const positions = branchGeometry.getAttribute("position");
    const maxY = branchGeometry.boundingBox!.max.y;
    if (!positions?.count || positions.count > 130_000 || !Number.isFinite(maxY) || maxY <= 0)
      throw new Error("Tree generator produced invalid/oversized branch geometry.");
    let foliage: InstancedMesh | undefined;
    if (spec.leafCount > 0) {
      const { placements, twigCount } = twigFoliagePlacements(branchGeometry, spec, species);
      group.userData.terminalTwigCount = twigCount;
      group.userData.foliageAttachment = "terminal-twig-centerline";
      const leafLength = Math.min(species === "pine" ? .42 : .52, spec.trunkLength * .12);
      leafGeometry = species === "pine" ? makeNeedleSprayGeometry(leafLength)
        : makeBroadleafSprayGeometry(leafLength,
          species === "oak" ? "lobed" : species === "birch" ? "serrated" : "folded", spec.seed);
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
    group.userData.leafletsPerSpray = leafGeometry?.userData.leafletsPerSpray ?? (foliage ? 24 : 0);
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
