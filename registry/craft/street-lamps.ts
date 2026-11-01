/** A repeatable street-light assembly for background/supporting city shots.
 * Actual cast pole, swept arm, fixture shell, collar, rim and lantern glass.
 * Three instanced draws for many lamps; no light sources, texture downloads,
 * timers or renderer ownership. Lamps face inward toward the road.
 */
import {
  BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, Group, InstancedMesh,
  LatheGeometry, Matrix4, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion,
  SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type CraftSidewalkSide = "negative" | "positive" | "both" | "none";

export interface CraftStreetLampSpec {
  schemaVersion: 1;
  id: string;
  seed: number;
  length: number;
  roadWidth: number;
  sidewalkWidth: number;
  sidewalkSide: CraftSidewalkSide;
  crosswalkAt?: readonly number[];
  /** 0–6 per active sidewalk. Extra requested lamps may be skipped when clearances cannot fit. */
  lampsPerSide: number;
  /** Pole height, excluding lantern below the head: 3.6–6 m-style units. */
  height?: number;
  /** Projected lamp-arm reach toward the road: .65–1.4 units. */
  reach?: number;
}

const within = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;
const jitter = (seed: number, index: number) => {
  let h = Math.imul(seed ^ Math.imul(index + 17, 0x9e3779b1), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

export function validateCraftStreetLampSpec(spec: CraftStreetLampSpec) {
  if (spec?.schemaVersion !== 1 || typeof spec.id !== "string" || !spec.id.trim() || spec.id.length > 96 ||
    !Number.isSafeInteger(spec.seed) || !within(spec.length, 12, 120) ||
    !within(spec.roadWidth, 5, 24) || !within(spec.sidewalkWidth, 1.5, 9) ||
    !["negative", "positive", "both", "none"].includes(spec.sidewalkSide) ||
    !Number.isInteger(spec.lampsPerSide) || !within(spec.lampsPerSide, 0, 6))
    throw new Error("Street lamps need valid road/sidewalk dimensions, side, seed and lampsPerSide 0–6.");
  if (spec.height !== undefined && !within(spec.height, 3.6, 6))
    throw new Error("Street lamp height must be 3.6–6.");
  if (spec.reach !== undefined && !within(spec.reach, .65, 1.4))
    throw new Error("Street lamp arm reach must be .65–1.4.");
  if (spec.crosswalkAt !== undefined && (!Array.isArray(spec.crosswalkAt) ||
    spec.crosswalkAt.length > 3 ||
    spec.crosswalkAt.some(x => !within(x, -spec.length / 2 + 2, spec.length / 2 - 2))))
    throw new Error("Street lamp crosswalk coordinates must lie inside the road with 2-unit end clearance.");
}

type LampPosition = { x: number; z: number; side: -1 | 1 };

/** Reserve enough physical separation for the lantern posts and pedestrians;
 * deterministic placement never intersects a declared zebra crossing.
 */
export function planCraftStreetLamps(spec: CraftStreetLampSpec): LampPosition[] {
  validateCraftStreetLampSpec(spec);
  const sides: Array<-1 | 1> = spec.sidewalkSide === "both" ? [-1, 1]
    : spec.sidewalkSide === "none" ? [] : [spec.sidewalkSide === "negative" ? -1 : 1];
  const result: LampPosition[] = [];
  for (const side of sides) {
    const chosen: number[] = [];
    for (let index = 0; index < spec.lampsPerSide; index++) {
      const origin = -spec.length / 2 + spec.length * (index + 1) / (spec.lampsPerSide + 1);
      const offset = (jitter(spec.seed, index + (side < 0 ? 4 : 39)) - .5) * 1.2;
      // Try small shifts around even spacing rather than pushing lamps toward
      // road ends. Refuse impossible densities, never clip a crossing.
      const candidates = [0, -3.5, 3.5, -6.5, 6.5].map(delta => origin + offset + delta);
      const x = candidates.find(candidate => Math.abs(candidate) <= spec.length / 2 - 2 &&
        !(spec.crosswalkAt ?? []).some(cross => Math.abs(candidate - cross) < 3.15) &&
        chosen.every(other => Math.abs(candidate - other) >= 3.6));
      if (x === undefined) continue;
      chosen.push(x);
      result.push({ x, side, z: side * (spec.roadWidth / 2 + spec.sidewalkWidth * .78) });
    }
  }
  return result;
}

function buildLampGeometry(height: number, reach: number) {
  const metal: BufferGeometry[] = [], trim: BufferGeometry[] = [], glass: BufferGeometry[] = [];
  const add = (target: BufferGeometry[], geometry: BufferGeometry,
    position = new Vector3(), rotation = new Quaternion(), scale = new Vector3(1, 1, 1)) => {
    geometry.applyMatrix4(new Matrix4().compose(position, rotation, scale));
    const triangles = geometry.index ? geometry.toNonIndexed() : geometry;
    if (triangles !== geometry) geometry.dispose();
    target.push(triangles);
  };
  const aroundY = (radius: number, y: number, count = 12) => new CylinderGeometry(radius, radius, y, count);
  const yRotation = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
  // Monolithic, tapered casting and bolted socket. Surface is non-planar even
  // when the street is viewed from a close oblique moving camera.
  add(metal, new LatheGeometry([
    new Vector2(.17, .06), new Vector2(.21, .09), new Vector2(.22, .17),
    new Vector2(.17, .24), new Vector2(.12, .32), new Vector2(.11, 1.0),
    new Vector2(.089, height * .72), new Vector2(.074, height),
  ], 16));
  add(metal, new CylinderGeometry(.22, .22, .045, 16), new Vector3(0, .09, 0));
  for (const x of [-.145, .145]) for (const z of [-.145, .145])
    add(trim, new CylinderGeometry(.034, .034, .036, 6), new Vector3(x, .176, z));
  const curve = new CatmullRomCurve3([
    new Vector3(0, height - .08, 0), new Vector3(0, height + .14, .16),
    new Vector3(0, height + .22, reach * .52),
    new Vector3(0, height + .12, reach * .88),
    new Vector3(0, height - .05, reach),
  ], false, "centripetal");
  add(metal, new TubeGeometry(curve, 24, .062, 8, false));
  add(metal, new CylinderGeometry(.115, .14, .20, 16), new Vector3(0, height - .05, reach));
  // Layered bell, rolled edge and a globe tucked *inside* the shade; a single
  // emissive coating communicates a lit lens, not an invented area light.
  add(metal, new LatheGeometry([
    new Vector2(.14, 0), new Vector2(.28, .055), new Vector2(.38, .12),
    new Vector2(.42, .15), new Vector2(.39, .19), new Vector2(.18, .28),
  ], 20), new Vector3(0, height - .31, reach));
  add(trim, new TorusGeometry(.385, .026, 7, 24),
    new Vector3(0, height - .16, reach), yRotation);
  add(glass, new SphereGeometry(.265, 16, 12),
    new Vector3(0, height - .39, reach), new Quaternion(), new Vector3(1, .72, 1));
  add(trim, aroundY(.115, .04), new Vector3(0, height * .62, 0));
  // Low-profile access door with two mechanical fasteners, facing the road.
  add(trim, new CylinderGeometry(.038, .038, .012, 8), new Vector3(0, 1.44, .12), yRotation);
  add(trim, new CylinderGeometry(.038, .038, .012, 8), new Vector3(0, 1.16, .12), yRotation);
  const sourceSets = [metal, trim, glass], merged: BufferGeometry[] = [];
  try {
    for (const parts of sourceSets) {
      const output = mergeGeometries(parts, false);
      if (!output) throw new Error("Street lamp geometry merge failed.");
      output.computeBoundingSphere();
      merged.push(output);
    }
    return { shell: merged[0], trim: merged[1], glass: merged[2] };
  } catch (error) {
    merged.forEach(geometry => geometry.dispose());
    throw error;
  } finally {
    sourceSets.flat().forEach(geometry => geometry.dispose());
  }
}

/** No hidden real-time point lights: consumers may add their own light rig. */
export function createCraftStreetLamps(spec: CraftStreetLampSpec) {
  const placements = planCraftStreetLamps(spec);
  const group = new Group(); group.name = spec.id;
  group.userData.partRole = "procedural-street-lamps";
  group.userData.lampCount = placements.length;
  const geometries: BufferGeometry[] = [];
  const materials: Array<MeshStandardMaterial | MeshPhysicalMaterial> = [];
  const instances: InstancedMesh[] = [];
  if (placements.length) {
    const model = buildLampGeometry(spec.height ?? 4.5, spec.reach ?? 1.04);
    geometries.push(model.shell, model.trim, model.glass);
    const shellMaterial = new MeshStandardMaterial({ color: 0x37464d, roughness: .52, metalness: .63 });
    const trimMaterial = new MeshStandardMaterial({ color: 0xa29b86, roughness: .38, metalness: .73 });
    const glassMaterial = new MeshPhysicalMaterial({ color: 0xffe3b0, roughness: .18, metalness: 0,
      transmission: .18, opacity: .86, transparent: true, depthWrite: false,
      ior: 1.48, emissive: 0xe99d4c, emissiveIntensity: .24 });
    materials.push(shellMaterial, trimMaterial, glassMaterial);
    for (const [name, geometry, material] of [
      ["cast-post-gooseneck-shade", model.shell, shellMaterial],
      ["machined-rim-collar-bolts", model.trim, trimMaterial],
      ["glazed-lantern", model.glass, glassMaterial],
    ] as const) {
      const mesh = new InstancedMesh(geometry, material, placements.length);
      for (let index = 0; index < placements.length; index++) {
        const p = placements[index];
        const angle = p.side === -1 ? 0 : Math.PI;
        mesh.setMatrixAt(index, new Matrix4().makeRotationY(angle)
          .setPosition(p.x, 0, p.z));
        if (name === "cast-post-gooseneck-shade") {
          const shade = .90 + jitter(spec.seed, index + 121) * .10;
          mesh.setColorAt(index, new Color(shade, shade, shade));
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.name = name;
      mesh.castShadow = name !== "glazed-lantern";
      group.add(mesh); instances.push(mesh);
    }
  }
  group.userData.partIds = group.children.map(child => child.name);
  let disposed = false;
  return { group, placements, geometries, materials, instances,
    get drawObjectCount() { return group.children.length; },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent(); group.clear();
      instances.forEach(instance => instance.dispose());
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
    } };
}
