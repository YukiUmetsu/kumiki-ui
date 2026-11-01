/** Deterministic supporting/midground street architecture: a physical curb
 * profile, sidewalk expansion joints, road paint and inset drainage grilles.
 * Shared Three.js geometry/instancing; no clock, external textures or renderer.
 * Not a substitute for surveyed roads or camera-close engineered infrastructure.
 */
import {
  BoxGeometry, Color, ExtrudeGeometry, Group, InstancedMesh, Matrix4, Mesh,
  MeshStandardMaterial, Shape, Vector3,
} from "three";
import { createCraftStreetLamps } from "./street-lamps";

type RGB = number;
type Side = "negative" | "positive" | "both" | "none";
export interface CraftStreetscapeSpec {
  schemaVersion: 1;
  id: string;
  seed: number;
  /** Road runs along local X, with the carriageway centered on local Z=0. */
  length: number;
  roadWidth: number;
  sidewalkWidth?: number;
  sidewalkSide?: Side;
  /** Positions along the road in local X; zebra stripes run across Z. */
  crosswalkAt?: readonly number[];
  centerline?: boolean;
  drainsPerSide?: number;
  jointSpacing?: number;
  /** Fully modeled, instanced gooseneck lights on active sidewalks; 0–6 each. */
  lampsPerSide?: number;
  colors?: { asphalt?: RGB; paving?: RGB; curb?: RGB; paint?: RGB; grate?: RGB };
}

const rgb = (n: number) => Number.isInteger(n) && n >= 0 && n <= 0xffffff;
const finiteRange = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;
const seeded01 = (seed: number, index: number) => {
  let value = Math.imul((seed ^ Math.imul(index + 1, 0x9e3779b1)) | 0, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0xc2b2ae35);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967296;
};

export function validateCraftStreetscape(spec: CraftStreetscapeSpec): void {
  if (spec?.schemaVersion !== 1 || typeof spec.id !== "string" || !spec.id.trim() || spec.id.length > 96 ||
    !Number.isSafeInteger(spec.seed) || !finiteRange(spec.length, 12, 120) ||
    !finiteRange(spec.roadWidth, 5, 24))
    throw new Error("Streetscape needs schemaVersion 1, id, integer seed, length 12–120 and roadWidth 5–24.");
  if (spec.sidewalkWidth !== undefined && !finiteRange(spec.sidewalkWidth, 1.5, 9))
    throw new Error("Sidewalk width must be 1.5–9 world units.");
  if (spec.sidewalkSide !== undefined && !["negative", "positive", "both", "none"].includes(spec.sidewalkSide))
    throw new Error("Sidewalk side must be negative, positive, both or none.");
  if (spec.centerline !== undefined && typeof spec.centerline !== "boolean")
    throw new Error("Centerline must be boolean.");
  if (spec.drainsPerSide !== undefined && (!Number.isInteger(spec.drainsPerSide) ||
    !finiteRange(spec.drainsPerSide, 0, 8)))
    throw new Error("Streetscape drainsPerSide must be 0–8.");
  if (spec.jointSpacing !== undefined && !finiteRange(spec.jointSpacing, 1, 6))
    throw new Error("Paving jointSpacing must be 1–6.");
  if (spec.lampsPerSide !== undefined && (!Number.isInteger(spec.lampsPerSide) ||
    !finiteRange(spec.lampsPerSide, 0, 6) || (spec.lampsPerSide > 0 && spec.sidewalkSide === "none")))
    throw new Error("Streetscape lampsPerSide must be 0–6 on an active sidewalk.");
  if (spec.colors && Object.values(spec.colors).some(color => !rgb(color)))
    throw new Error("Streetscape colors must be RGB integers.");
  if (spec.crosswalkAt !== undefined && (!Array.isArray(spec.crosswalkAt) ||
    spec.crosswalkAt.length > 3 || spec.crosswalkAt.some(x => !finiteRange(x, -spec.length / 2 + 2, spec.length / 2 - 2)) ||
    spec.crosswalkAt.some((x, i) => spec.crosswalkAt!.some((y, j) => i !== j && Math.abs(x - y) < 4))))
    throw new Error("Crosswalks require at most three positions, ≥4 apart, ≥2 from each road end.");
}

interface Block { x: number; y: number; z: number; width: number; height: number; depth: number; color?: number }

function curbProfile(length: number): ExtrudeGeometry {
  // Extrude a pitched stone curb section along +X. Its nose sits just inside
  // the roadway while the raised back meets the sidewalk without a square lip.
  const shape = new Shape();
  shape.moveTo(-.08, -.11);
  shape.lineTo(.24, -.11);
  shape.lineTo(.24, .083);
  shape.lineTo(.07, .083);
  shape.lineTo(.018, .045);
  shape.lineTo(.018, -.014);
  shape.lineTo(-.08, -.046);
  shape.closePath();
  const geom = new ExtrudeGeometry(shape, { depth: length, steps: 1, bevelEnabled: false });
  geom.rotateY(Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

/** One road strip and optional sidewalks. All parts are spatially aligned to
 * the local origin; moving `group` carries every piece together. Road top is
 * local y=-0.1, sidewalk top y=+0.06. Caller owns transform and light rig.
 */
export function createCraftStreetscape(spec: CraftStreetscapeSpec) {
  validateCraftStreetscape(spec);
  const side = spec.sidewalkSide ?? "both";
  const sides = (side === "both" ? [-1, 1] : side === "negative" ? [-1] : side === "positive" ? [1] : []) as number[];
  const sidewalkWidth = spec.sidewalkWidth ?? 3.2;
  const paints = spec.crosswalkAt ?? [];
  const drainsPerSide = spec.drainsPerSide ?? 2;
  const materials = {
    asphalt: new MeshStandardMaterial({ color: spec.colors?.asphalt ?? 0x3f484a, roughness: .97 }),
    paving: new MeshStandardMaterial({ color: spec.colors?.paving ?? 0xaba99e, roughness: .91 }),
    curb: new MeshStandardMaterial({ color: spec.colors?.curb ?? 0xa5a69f, roughness: .8 }),
    paint: new MeshStandardMaterial({ color: spec.colors?.paint ?? 0xd9d6c5, roughness: .87 }),
    joint: new MeshStandardMaterial({ color: 0x77776c, roughness: .98 }),
    grate: new MeshStandardMaterial({ color: spec.colors?.grate ?? 0x465052, roughness: .43, metalness: .66 }),
    grateWell: new MeshStandardMaterial({ color: 0x1c2427, roughness: .97 }),
  };
  const group = new Group(); group.name = spec.id;
  const geometries: Array<BoxGeometry | ExtrudeGeometry> = [];
  const instanced: InstancedMesh[] = [];
  let lamps: ReturnType<typeof createCraftStreetLamps> | undefined;
  const addBox = (width: number, height: number, depth: number, name: string,
    material: MeshStandardMaterial, x: number, y: number, z: number) => {
    const geometry = new BoxGeometry(width, height, depth);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.name = name;
    mesh.castShadow = true; mesh.receiveShadow = true;
    geometries.push(geometry); group.add(mesh);
    return mesh;
  };
  let blockGeometry: BoxGeometry | undefined;
  const addInstances = (name: string, blocks: Block[], material: MeshStandardMaterial) => {
    if (!blocks.length) return undefined;
    if (!blockGeometry) {
      blockGeometry = new BoxGeometry(1, 1, 1);
      geometries.push(blockGeometry);
    }
    const mesh = new InstancedMesh(blockGeometry, material, blocks.length);
    for (let index = 0; index < blocks.length; index++) {
      const b = blocks[index];
      const matrix = new Matrix4().makeScale(b.width, b.height, b.depth)
        .setPosition(new Vector3(b.x, b.y, b.z));
      mesh.setMatrixAt(index, matrix);
      if (b.color !== undefined) mesh.setColorAt(index, new Color(b.color));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.name = name; mesh.receiveShadow = true;
    group.add(mesh); instanced.push(mesh);
    return mesh;
  };
  try {
    const road = addBox(spec.length, .18, spec.roadWidth, "asphalt-road", materials.asphalt,
      0, -.19, 0);
    const sidewalkGeometry = sides.length ? new BoxGeometry(spec.length, .22, sidewalkWidth) : undefined;
    const curbGeometry = sides.length ? curbProfile(spec.length) : undefined;
    if (sidewalkGeometry) geometries.push(sidewalkGeometry);
    if (curbGeometry) geometries.push(curbGeometry);
    for (const sign of sides) {
      const walk = new Mesh(sidewalkGeometry!, materials.paving);
      walk.position.set(0, -.05, sign * (spec.roadWidth / 2 + sidewalkWidth / 2));
      walk.name = sign < 0 ? "negative-sidewalk" : "positive-sidewalk";
      walk.receiveShadow = true; group.add(walk);
      const curb = new Mesh(curbGeometry!, materials.curb);
      curb.name = sign < 0 ? "negative-curb" : "positive-curb";
      // Extrusion begins at X=0, so the reversed side starts at +length/2.
      if (sign < 0) curb.position.set(-spec.length / 2, 0, -spec.roadWidth / 2);
      else { curb.position.set(spec.length / 2, 0, spec.roadWidth / 2); curb.rotation.y = Math.PI; }
      curb.castShadow = true; curb.receiveShadow = true; group.add(curb);
    }

    const markings: Block[] = [], joints: Block[] = [], grates: Block[] = [], grateBars: Block[] = [];
    const crosses = [...paints].sort((a, b) => a - b);
    if (spec.centerline !== false) {
      for (let x = -spec.length / 2 + 2; x <= spec.length / 2 - 2; x += 4.5) {
        if (crosses.some(cross => Math.abs(x - cross) < 3.2)) continue;
        markings.push({ x, y: -.092, z: 0, width: 2.3, height: .009, depth: .12 });
      }
    }
    for (const cross of crosses) {
      // Eight traffic-facing zebra bars. Unlike a decal, each has a real
      // measured width, normal and depth with no invented text or symbolism.
      for (let stripe = 0; stripe < 8; stripe++)
        markings.push({ x: cross - 1.35 + stripe * .39, y: -.091, z: 0,
          width: .26, height: .009, depth: spec.roadWidth - .8 });
    }
    for (const sign of sides) {
      const spacing = spec.jointSpacing ?? 2.2;
      const jointPhase = (.75 + seeded01(spec.seed, sign < 0 ? 17 : 19) * .22) * spacing;
      for (let x = -spec.length / 2 + jointPhase; x < spec.length / 2 - .05;
        x += spec.jointSpacing ?? 2.2)
        joints.push({ x, y: .063, z: sign * (spec.roadWidth / 2 + sidewalkWidth / 2),
          width: .018, height: .006, depth: sidewalkWidth - .1 });
      for (let d = 0; d < drainsPerSide; d++) {
        const t = (d + 1) / (drainsPerSide + 1);
        let x = -spec.length / 2 + 3 + (spec.length - 6) * t;
        x += (seeded01(spec.seed, d + (sign < 0 ? 41 : 59)) - .5) * .6;
        for (const cross of crosses) if (Math.abs(x - cross) < 3)
          x = Math.max(-spec.length / 2 + 2, Math.min(spec.length / 2 - 2,
            cross + (x < cross ? -3.1 : 3.1)));
        const z = sign * (spec.roadWidth / 2 - .39);
        grates.push({ x, y: -.091, z, width: .85, height: .017, depth: .48 });
        for (let bar = 0; bar < 7; bar++)
          grateBars.push({ x: x - .3 + bar * .1, y: -.079, z,
            width: .038, height: .016, depth: .4 });
      }
    }
    for (const [index, marking] of markings.entries()) {
      const tint = Math.round((.83 + seeded01(spec.seed, index + 103) * .16) * 255);
      marking.color = (tint << 16) | (tint << 8) | tint;
    }
    // Marking thickness and slight seed-tinted albedo create proper material
    // boundaries without alpha-overlaid planes or random illegible labels.
    const markingsMesh = addInstances("road-paint", markings, materials.paint);
    const jointMesh = addInstances("sidewalk-saw-joints", joints, materials.joint);
    const grateWellMesh = addInstances("drainage-wells", grates, materials.grateWell);
    const grateMesh = addInstances("drainage-grille-bars", grateBars, materials.grate);
    if ((spec.lampsPerSide ?? 0) > 0) {
      lamps = createCraftStreetLamps({ schemaVersion: 1, id: `${spec.id}-streetlights`,
        seed: spec.seed, length: spec.length, roadWidth: spec.roadWidth,
        sidewalkWidth, sidewalkSide: side, crosswalkAt: spec.crosswalkAt,
        lampsPerSide: spec.lampsPerSide! });
      group.add(lamps.group);
    }
    group.userData.partRole = "procedural-streetscape";
    group.userData.partIds = group.children.map(child => child.name);
    group.userData.crosswalkCount = crosses.length;
    group.userData.drainCount = grates.length;
    group.userData.lampCount = lamps?.placements.length ?? 0;
    group.userData.sidewalkSide = side;
    let disposed = false;
    return { group, road, materials, lamps, markings: markingsMesh, joints: jointMesh,
      grateWells: grateWellMesh, grates: grateMesh,
      get drawObjectCount() { return group.children.length; },
      dispose() { if (disposed) return; disposed = true;
        lamps?.dispose(); group.removeFromParent(); group.clear(); instanced.forEach(mesh => mesh.dispose());
        geometries.forEach(geometry => geometry.dispose());
        Object.values(materials).forEach(material => material.dispose());
      } };
  } catch (error) {
    lamps?.dispose(); group.clear(); instanced.forEach(mesh => mesh.dispose());
    geometries.forEach(geometry => geometry.dispose());
    Object.values(materials).forEach(material => material.dispose());
    throw error;
  }
}
