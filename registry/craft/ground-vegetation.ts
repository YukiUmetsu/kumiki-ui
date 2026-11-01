/** Instanced, geometry-backed supporting vegetation: folded grasses, pinnate
 * ferns and small flowering stems. Reuses seeded CraftPlacement transforms and
 * a single MeshStandardMaterial/InstancedMesh draw per kind, not one draw per
 * blade or flower. Source is original procedural geometry; no stock assets.
 */
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Matrix4,
  MeshStandardMaterial, Vector3 } from "three";
import { createCraftScatterInstances } from "./scatter-placement";
import type { CraftPlacement } from "./scatter-placement";

export type CraftGroundVegetationKind = "meadow-grass" | "woodland-fern" | "wildflower";

export interface CraftGroundVegetationSpec {
  schemaVersion: 1;
  id: string;
  seed: number;
  kind: CraftGroundVegetationKind;
  /** Supporting keeps more leaflets/petals; background reduces geometry. */
  detail?: "supporting" | "background";
  /** Multiplies the natural ~0.5–0.9 world-unit plant height. */
  heightScale?: number;
  colors?: { foliage?: number; bloom?: number };
}

const KINDS = ["meadow-grass", "woodland-fern", "wildflower"] as const;
const rgb = (n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 0xffffff;

export function validateCraftGroundVegetation(spec: CraftGroundVegetationSpec): void {
  if (spec?.schemaVersion !== 1 || typeof spec.id !== "string" || !spec.id.trim() ||
    spec.id.length > 96 || !Number.isSafeInteger(spec.seed) || !KINDS.includes(spec.kind))
    throw new Error("Ground vegetation requires schemaVersion 1, id, integer seed and supported kind.");
  if (spec.detail !== undefined && !["supporting", "background"].includes(spec.detail))
    throw new Error("Ground vegetation detail must be supporting or background.");
  if (spec.heightScale !== undefined && (!Number.isFinite(spec.heightScale) ||
    spec.heightScale < .1 || spec.heightScale > 10))
    throw new Error("Ground vegetation heightScale must be .1–10.");
  if (spec.colors && (typeof spec.colors !== "object" || Array.isArray(spec.colors) ||
    Object.values(spec.colors).some(value => !rgb(value))))
    throw new Error("Ground vegetation colors must be RGB integer values.");
}

function randomFor(seed: number) {
  let x = seed >>> 0;
  return () => {
    x = (x + 0x6d2b79f5) >>> 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Built = { position: number[]; color: number[]; index: number[] };
const up = new Vector3(0, 1, 0);

/** Cupped, double-sided ribbon with an actual ridge and smoothly tapered tip. */
function addBlade(built: Built, start: Vector3, direction: Vector3,
  length: number, width: number, bend: number, tint: Color, segments = 6) {
  const forward = direction.clone().normalize();
  const radial = new Vector3(forward.x, 0, forward.z).normalize();
  if (radial.lengthSq() < .001) radial.set(1, 0, 0);
  const across = new Vector3().crossVectors(forward, radial).normalize();
  if (across.lengthSq() < .001) across.set(0, 0, 1);
  const normal = new Vector3().crossVectors(across, forward).normalize();
  const base = built.position.length / 3;
  for (let row = 0; row <= segments; row++) {
    const t = row / segments;
    const tip = start.clone().addScaledVector(forward, t * length)
      .addScaledVector(radial, t * t * bend);
    const half = width * Math.sin(Math.PI * (.09 + .91 * t)) * Math.pow(1 - t, .38);
    for (const side of [-1, 0, 1]) {
      const vertex = tip.clone().addScaledVector(across, side * half)
        .addScaledVector(normal, side === 0 ? width * Math.sin(Math.PI * t) * .19 : 0);
      built.position.push(vertex.x, vertex.y, vertex.z);
      const tone = (side === 0 ? 1.09 : .84) * (.88 + .13 * t);
      built.color.push(Math.min(1, tint.r * tone), Math.min(1, tint.g * tone), Math.min(1, tint.b * tone));
    }
  }
  for (let row = 0; row < segments; row++) for (let side = 0; side < 2; side++) {
    const a = base + row * 3 + side, b = a + 3;
    built.index.push(a, b, a + 1, a + 1, b, b + 1);
  }
}

function buildGeometry(spec: CraftGroundVegetationSpec) {
  const built: Built = { position: [], color: [], index: [] };
  const random = randomFor(spec.seed);
  const foliage = new Color(spec.colors?.foliage ??
    (spec.kind === "woodland-fern" ? 0x64864e : spec.kind === "wildflower" ? 0x567b45 : 0x798d4b));
  const bloom = new Color(spec.colors?.bloom ?? 0xe3bd68);
  const background = spec.detail === "background", multiplier = spec.heightScale ?? 1;
  if (spec.kind === "meadow-grass") {
    const blades = background ? 6 : 13;
    for (let index = 0; index < blades; index++) {
      const theta = index * 2.39996323 + random() * .36;
      const radial = new Vector3(Math.cos(theta), 0, Math.sin(theta));
      const height = multiplier * (.38 + random() * .45);
      const direction = up.clone().addScaledVector(radial, .22 + random() * .3).normalize();
      const origin = radial.clone().multiplyScalar(.018 + random() * .05);
      addBlade(built, origin, direction, height, multiplier * (.026 + random() * .012),
        multiplier * (.13 + random() * .15), foliage.clone().multiplyScalar(.7 + random() * .32),
        background ? 4 : 6);
    }
  } else if (spec.kind === "woodland-fern") {
    const fronds = background ? 3 : 6, pairs = background ? 4 : 7;
    for (let frond = 0; frond < fronds; frond++) {
      const angle = frond * Math.PI * 2 / fronds + random() * .2;
      const radial = new Vector3(Math.cos(angle), 0, Math.sin(angle));
      const across = new Vector3(-radial.z, 0, radial.x);
      const length = multiplier * (.62 + random() * .22);
      const forward = up.clone().multiplyScalar(.66).addScaledVector(radial, .75).normalize();
      const bend = multiplier * .13;
      addBlade(built, new Vector3(), forward, length, multiplier * .009, bend,
        foliage.clone().multiplyScalar(.64), background ? 4 : 6);
      for (let pair = 0; pair < pairs; pair++) {
        const t = .18 + pair / pairs * .72;
        const anchor = forward.clone().multiplyScalar(length * t).addScaledVector(radial, t * t * bend);
        const size = (1 - t * .75) * multiplier * (.19 + random() * .04);
        for (const side of [-1, 1]) {
          const direction = forward.clone().multiplyScalar(.27)
            .addScaledVector(across, side * .96).normalize();
          addBlade(built, anchor, direction, size, size * .28, size * .06,
            foliage.clone().multiplyScalar(.84 + random() * .2), background ? 3 : 5);
        }
      }
    }
  } else {
    const stalks = background ? 1 : 3, petals = background ? 5 : 7;
    for (let stalk = 0; stalk < stalks; stalk++) {
      const theta = stalk * 2.39996323 + random() * .26;
      const radial = new Vector3(Math.cos(theta), 0, Math.sin(theta));
      const height = multiplier * (.45 + random() * .22);
      const direction = up.clone().addScaledVector(radial, .12 + random() * .15).normalize();
      const start = radial.clone().multiplyScalar(stalk * multiplier * .03);
      addBlade(built, start, direction, height, multiplier * .01, multiplier * .02,
        foliage.clone().multiplyScalar(.68), 4);
      for (const side of [-1, 1]) {
        const origin = start.clone().addScaledVector(direction, height * (.3 + .12 * side));
        const leafDir = up.clone().multiplyScalar(.48).addScaledVector(radial, side * .89).normalize();
        addBlade(built, origin, leafDir, height * .29, height * .075, height * .04, foliage, 5);
      }
      const center = start.clone().addScaledVector(direction, height);
      for (let petal = 0; petal < petals; petal++) {
        const angle = petal * Math.PI * 2 / petals;
        const petalDir = new Vector3(Math.cos(angle) * .95, .28, Math.sin(angle) * .95).normalize();
        addBlade(built, center, petalDir, multiplier * .13, multiplier * .045,
          multiplier * .009, bloom.clone().multiplyScalar(.9 + random() * .1), 4);
      }
      // A convex, eight-sided disk of actual yellow pollen/carpel faces.
      const centerIndex = built.position.length / 3;
      const inner = center.clone().addScaledVector(up, multiplier * .012);
      const yellow = new Color(0xe4a53b);
      built.position.push(inner.x, inner.y, inner.z);
      built.color.push(yellow.r, yellow.g, yellow.b);
      for (let vertex = 0; vertex < 8; vertex++) {
        const angle = vertex * Math.PI / 4, radius = multiplier * .024;
        built.position.push(center.x + Math.cos(angle) * radius, center.y,
          center.z + Math.sin(angle) * radius);
        built.color.push(yellow.r * .83, yellow.g * .83, yellow.b * .83);
      }
      for (let vertex = 0; vertex < 8; vertex++)
        built.index.push(centerIndex, centerIndex + 1 + vertex, centerIndex + 1 + (vertex + 1) % 8);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(built.position, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(built.color, 3));
  geometry.setIndex(built.index);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData.partRole = "ground-vegetation-geometry";
  geometry.userData.kind = spec.kind;
  return geometry;
}

export function createCraftGroundVegetation(spec: CraftGroundVegetationSpec,
  placements: readonly CraftPlacement[]) {
  validateCraftGroundVegetation(spec);
  if (!Array.isArray(placements) || placements.length < 1 || placements.length > 2500 ||
    new Set(placements.map(p => p?.id)).size !== placements.length ||
    placements.some(p => !p || typeof p.id !== "string" || !p.id.trim() ||
      !(p.matrix instanceof Matrix4) || !p.matrix.elements.every(Number.isFinite)))
    throw new Error("Ground vegetation requires 1–2500 distinct finite CraftPlacement matrices.");
  const geometry = buildGeometry(spec);
  const visibleVertices = geometry.getAttribute("position").count * placements.length;
  if (visibleVertices > 2_500_000) {
    geometry.dispose();
    throw new Error("Ground vegetation exceeds 2.5M instance-expanded vertices; reduce count or use background detail.");
  }
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: .87,
    metalness: 0, side: DoubleSide });
  const instances = createCraftScatterInstances(placements, geometry, material);
  const mesh = instances.mesh;
  mesh.name = spec.id;
  mesh.castShadow = false; // Many narrow shadows shimmer and cost more than their value in background shots.
  mesh.receiveShadow = true;
  const random = randomFor(spec.seed + 1009);
  for (let index = 0; index < placements.length; index++) {
    const tint = .84 + random() * .22;
    mesh.setColorAt(index, new Color().setRGB(tint, tint, tint));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.userData.partRole = "instanced-ground-vegetation";
  mesh.userData.vegetationKind = spec.kind;
  let disposed = false;
  return { mesh, geometry, material, count: placements.length,
    dispose() { if (disposed) return; disposed = true;
      instances.dispose(); geometry.dispose(); material.dispose(); mesh.removeFromParent(); } };
}
