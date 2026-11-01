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
  length: number, width: number, bend: number, tint: Color, segments = 6,
  shape: "blade" | "serrated" | "petal" = "blade") {
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
    const profile = shape === "petal"
      ? Math.pow(Math.max(0, Math.sin(Math.PI * t)), .58) * (.63 + t * .5)
      : Math.sin(Math.PI * (.09 + .91 * t)) * Math.pow(1 - t, .38);
    const edgeNotch = shape === "serrated" && row > 1 && row < segments - 1 && row % 2 === 0 ? .78 : 1;
    const half = width * profile * edgeNotch;
    for (const side of [-1, 0, 1]) {
      const vertex = tip.clone().addScaledVector(across, side * half)
        .addScaledVector(normal, side === 0 ? width * Math.sin(Math.PI * t) *
          (shape === "petal" ? .29 : .19) : 0);
      built.position.push(vertex.x, vertex.y, vertex.z);
      const tone = (side === 0 ? 1.13 : shape === "petal" ? .91 : .82) *
        (.82 + .18 * t) * (shape === "serrated" && row % 3 === 0 ? .91 : 1);
      built.color.push(Math.min(1, tint.r * tone), Math.min(1, tint.g * tone), Math.min(1, tint.b * tone));
    }
  }
  for (let row = 0; row < segments; row++) for (let side = 0; side < 2; side++) {
    const a = base + row * 3 + side, b = a + 3;
    built.index.push(a, b, a + 1, a + 1, b, b + 1);
  }
}

/** Five-sided, softly curved and tapered organic stalk: tangible from grazing angles. */
function addStalk(built: Built, start: Vector3, tip: Vector3, radius: number,
  tint: Color, segments = 5) {
  const axis = tip.clone().sub(start).normalize();
  const side = new Vector3().crossVectors(axis, new Vector3(0, 0, 1)).normalize();
  if (side.lengthSq() < .001) side.set(1, 0, 0);
  const front = new Vector3().crossVectors(axis, side).normalize();
  const base = built.position.length / 3;
  for (let row = 0; row <= 4; row++) {
    const t = row / 4;
    const center = start.clone().lerp(tip, t).addScaledVector(side, Math.sin(Math.PI * t) * radius * 1.4);
    const r = radius * (1 - .64 * t);
    for (let s = 0; s <= segments; s++) {
      const angle = TAU * s / segments;
      const vertex = center.clone().addScaledVector(side, Math.cos(angle) * r)
        .addScaledVector(front, Math.sin(angle) * r);
      built.position.push(vertex.x, vertex.y, vertex.z);
      const tone = .73 + .19 * Math.cos(angle) + .06 * t;
      built.color.push(tint.r * tone, tint.g * tone, tint.b * tone);
    }
  }
  for (let row = 0; row < 4; row++) for (let s = 0; s < segments; s++) {
    const a = base + row * (segments + 1) + s, b = a + segments + 1;
    built.index.push(a, a + 1, b, a + 1, b + 1, b);
  }
}

const TAU = Math.PI * 2;

/** Bulged grain/seed without detached sphere instances; joins the parent geometry. */
function addGrain(built: Built, start: Vector3, end: Vector3, width: number, tint: Color) {
  const dir = end.clone().sub(start).normalize();
  const side = new Vector3().crossVectors(dir, up).normalize();
  if (side.lengthSq() < .001) side.set(1, 0, 0);
  const front = new Vector3().crossVectors(dir, side).normalize();
  const base = built.position.length / 3;
  for (let row = 0; row <= 4; row++) {
    const t = row / 4;
    const center = start.clone().lerp(end, t);
    const radius = width * Math.sin(Math.PI * t);
    for (let s = 0; s < 5; s++) {
      const angle = TAU * s / 5;
      const vertex = center.clone().addScaledVector(side, radius * Math.cos(angle))
        .addScaledVector(front, radius * Math.sin(angle));
      built.position.push(vertex.x, vertex.y, vertex.z);
      const tone = .87 + .13 * Math.cos(angle);
      built.color.push(tint.r * tone, tint.g * tone, tint.b * tone);
    }
  }
  for (let row = 0; row < 4; row++) for (let s = 0; s < 5; s++) {
    const a = base + row * 5 + s, b = base + row * 5 + (s + 1) % 5;
    built.index.push(a, b, a + 5, b, b + 5, a + 5);
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
    const blades = background ? 6 : 17;
    for (let index = 0; index < blades; index++) {
      const theta = index * 2.39996323 + random() * .36;
      const radial = new Vector3(Math.cos(theta), 0, Math.sin(theta));
      const height = multiplier * (.38 + random() * .45);
      const direction = up.clone().addScaledVector(radial, .22 + random() * .3).normalize();
      const origin = radial.clone().multiplyScalar(.018 + random() * .05);
      addBlade(built, origin, direction, height, multiplier * (.018 + random() * .019),
        multiplier * (.13 + random() * .15), foliage.clone().multiplyScalar(.7 + random() * .32),
        background ? 4 : 9);
    }
    if (!background) {
      // Two wiry panicles rise above the blades. Branches and grains are
      // physically attached to a tapered culm, rather than floating dots.
      for (let stem = 0; stem < 2; stem++) {
        const angle = random() * TAU;
        const radial = new Vector3(Math.cos(angle), 0, Math.sin(angle));
        const base = radial.clone().multiplyScalar(.02 * multiplier);
        const tip = base.clone().addScaledVector(up, multiplier * (.8 + random() * .18))
          .addScaledVector(radial, multiplier * .09);
        addStalk(built, base, tip, multiplier * .0045, foliage.clone().multiplyScalar(.72));
        for (let grain = 0; grain < 7; grain++) {
          const t = .72 + grain * .038;
          const anchor = base.clone().lerp(tip, t);
          const a = angle + grain * 2.39996323;
          const side = new Vector3(Math.cos(a), .35, Math.sin(a)).normalize();
          const end = anchor.clone().addScaledVector(side, multiplier * (.042 + .012 * random()));
          addStalk(built, anchor, end, multiplier * .0019, foliage.clone().multiplyScalar(.9), 3);
          addGrain(built, end, end.clone().addScaledVector(side, multiplier * .027),
            multiplier * .0075, new Color(0xc2ac69));
        }
      }
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
      const rachisTip = forward.clone().multiplyScalar(length).addScaledVector(radial, bend);
      addStalk(built, new Vector3(), rachisTip, multiplier * .006,
        foliage.clone().multiplyScalar(.68), background ? 3 : 5);
      for (let pair = 0; pair < pairs; pair++) {
        const t = .18 + pair / pairs * .72;
        const anchor = forward.clone().multiplyScalar(length * t).addScaledVector(radial, t * t * bend);
        const size = (1 - t * .75) * multiplier * (.19 + random() * .04);
        for (const side of [-1, 1]) {
          const direction = forward.clone().multiplyScalar(.27)
            .addScaledVector(across, side * .96).normalize();
          addBlade(built, anchor, direction, size, size * .28, size * .06,
            foliage.clone().multiplyScalar(.84 + random() * .2), background ? 4 : 10,
            background ? "blade" : "serrated");
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
      const center = start.clone().addScaledVector(direction, height);
      addStalk(built, start, center, multiplier * .007,
        foliage.clone().multiplyScalar(.68), background ? 3 : 5);
      for (const side of [-1, 1]) {
        const origin = start.clone().addScaledVector(direction, height * (.3 + .12 * side));
        const leafDir = up.clone().multiplyScalar(.48).addScaledVector(radial, side * .89).normalize();
        addBlade(built, origin, leafDir, height * .29, height * .075, height * .04,
          foliage, background ? 4 : 8, "serrated");
      }
      // A low green calyx visibly holds the petals at the head of the stalk.
      if (!background) for (let sepal = 0; sepal < 5; sepal++) {
        const a = TAU * sepal / 5;
        addBlade(built, center.clone().addScaledVector(up, -multiplier * .015),
          new Vector3(Math.cos(a), -.17, Math.sin(a)), multiplier * .058,
          multiplier * .018, multiplier * .006, foliage.clone().multiplyScalar(.64), 4);
      }
      for (let petal = 0; petal < petals; petal++) {
        const angle = petal * Math.PI * 2 / petals;
        const petalDir = new Vector3(Math.cos(angle) * .95, .28, Math.sin(angle) * .95).normalize();
        addBlade(built, center, petalDir, multiplier * .15, multiplier * .055,
          multiplier * .014, bloom.clone().multiplyScalar(.9 + random() * .1),
          background ? 4 : 8, "petal");
      }
      // A convex pollen disk, with individually raised stamens in supporting detail.
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
      if (!background) for (let pollen = 0; pollen < 7; pollen++) {
        const a = pollen * 2.39996323, radius = multiplier * .017 * Math.sqrt((pollen + .5) / 7);
        const root = center.clone().add(new Vector3(Math.cos(a) * radius, multiplier * .005,
          Math.sin(a) * radius));
        const head = root.clone().addScaledVector(up, multiplier * (.02 + random() * .012));
        addStalk(built, root, head, multiplier * .0019, new Color(0xc8a549), 3);
        addGrain(built, head, head.clone().addScaledVector(up, multiplier * .012),
          multiplier * .0039, new Color(0xf4cb61));
      }
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
  // Slightly waxier flower/fern foliage reads differently from dry grass under
  // the same studio light; keep non-metallic and avoid specular sparkle.
  const roughness = spec.kind === "wildflower" ? .69 : spec.kind === "woodland-fern" ? .76 : .86;
  const material = new MeshStandardMaterial({ vertexColors: true, roughness,
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
