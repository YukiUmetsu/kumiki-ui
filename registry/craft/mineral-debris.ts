/** Seeded, geometry-backed mineral grit. Reuses placement/scatter transforms;
 * one draw call per granular family without millions of independent meshes.
 * For drifting atmospheric dust use existing V09 EnvironmentalEffects instead.
 */
import { Color, IcosahedronGeometry, InstancedMesh, Matrix4,
  MeshStandardMaterial } from "three";
import { createCraftScatterInstances } from "./scatter-placement";
import type { CraftPlacement } from "./scatter-placement";

export type CraftMineralDebrisKind = "sand-grains" | "rock-chips";

export interface CraftMineralDebrisSpec {
  schemaVersion: 1;
  id: string;
  seed: number;
  kind: CraftMineralDebrisKind;
  /** Physical radius of the source shard in world units, before placement scale. */
  radius?: number;
  detail?: "supporting" | "background";
  color?: number;
}

const KINDS = ["sand-grains", "rock-chips"] as const;
export function validateCraftMineralDebris(spec: CraftMineralDebrisSpec): void {
  if (spec?.schemaVersion !== 1 || typeof spec.id !== "string" || !spec.id.trim() ||
    spec.id.length > 96 || !Number.isSafeInteger(spec.seed) || !KINDS.includes(spec.kind))
    throw new Error("Mineral debris requires schemaVersion 1, id, integer seed and supported kind.");
  if (spec.radius !== undefined && (!Number.isFinite(spec.radius) || spec.radius < .001 || spec.radius > 2))
    throw new Error("Mineral debris radius must be .001–2.");
  if (spec.detail !== undefined && !["supporting", "background"].includes(spec.detail))
    throw new Error("Mineral debris detail must be supporting or background.");
  if (spec.color !== undefined && (!Number.isInteger(spec.color) || spec.color < 0 || spec.color > 0xffffff))
    throw new Error("Mineral debris color must be an RGB integer.");
}

function seeded(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (x + 0x6d2b79f5) >>> 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCraftMineralDebris(spec: CraftMineralDebrisSpec,
  placements: readonly CraftPlacement[]) {
  validateCraftMineralDebris(spec);
  if (!Array.isArray(placements) || placements.length < 1 || placements.length > 2500 ||
    new Set(placements.map(p => p?.id)).size !== placements.length ||
    placements.some(p => !p || typeof p.id !== "string" || !p.id.trim() ||
      !(p.matrix instanceof Matrix4) || !p.matrix.elements.every(Number.isFinite)))
    throw new Error("Mineral debris requires 1–2500 distinct finite CraftPlacement matrices.");

  const isSand = spec.kind === "sand-grains", radius = spec.radius ?? (isSand ? .012 : .08);
  const segments = spec.detail === "background" ? 0 : 1;
  const geometry = new IcosahedronGeometry(radius, segments);
  const positions = geometry.getAttribute("position");
  // A flat, truncated quartz grain is different from a fractured rock chip;
  // deformation is a function of position, so shared triangle edges remain closed.
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const dx = x / radius, dy = y / radius, dz = z / radius;
    const d = .83 + .16 * Math.sin(dx * 9.3 + dy * 13.7 + spec.seed * .27) *
      Math.cos(dz * 12.1 + spec.seed * .19);
    positions.setXYZ(i, x * d * (isSand ? 1.07 : 1.24),
      y * d * (isSand ? .61 : .74), z * d * (isSand ? .85 : 1.03));
  }
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  geometry.userData.partRole = "mineral-debris-geometry";
  geometry.userData.kind = spec.kind;
  const material = new MeshStandardMaterial({ color: spec.color ??
    (isSand ? 0xcdb58e : 0x7e807b), metalness: 0, roughness: isSand ? .78 : .91,
    flatShading: !isSand });
  const instances = createCraftScatterInstances(placements, geometry, material);
  const mesh = instances.mesh as InstancedMesh;
  mesh.name = spec.id;
  mesh.castShadow = false; mesh.receiveShadow = true;
  const random = seeded(spec.seed + 73);
  const tint = new Color();
  for (let i = 0; i < placements.length; i++) {
    const shade = .68 + random() * .42;
    tint.setRGB(shade, shade * (.96 + random() * .08), shade * (.95 + random() * .1));
    mesh.setColorAt(i, tint);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.userData.partRole = "instanced-mineral-debris";
  mesh.userData.debrisKind = spec.kind;
  let disposed = false;
  return { mesh, geometry, material, count: placements.length, dispose() {
    if (disposed) return; disposed = true;
    instances.dispose(); geometry.dispose(); material.dispose(); mesh.removeFromParent();
  } };
}
