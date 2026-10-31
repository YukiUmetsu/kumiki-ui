/** Declarative, geometry-backed hard-surface details for an existing box-like
 * asset. Faceplates have real apertures; the kit does not boolean-cut the host.
 * No renderer, network request, clock, physics, Blender or bespoke shaders.
 */
import {
  CylinderGeometry, ExtrudeGeometry, Group, InstancedMesh, Matrix4, Mesh,
  Path, Quaternion, Shape, TorusGeometry, Vector3,
} from "three";
import type { BufferGeometry, Object3D } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createCraftMaterialKit } from "./material-kit";
import type { CraftMaterialKit } from "./material-kit";

export type DetailFace = "front" | "back" | "top" | "bottom" | "left" | "right";
interface DetailPlacement { id: string; face: DetailFace; at: readonly [number, number] }
export type CraftDetailFeature =
  | (DetailPlacement & { kind: "fastener"; radius: number; drive?: "slot" | "cross" | "hex"; collar?: boolean })
  | (DetailPlacement & { kind: "vent-bank"; width: number; height: number; slots: number; direction?: "vertical" | "horizontal" })
  | (DetailPlacement & { kind: "ribbed-grip"; width: number; height: number; count: number; direction?: "vertical" | "horizontal" })
  | (DetailPlacement & { kind: "seam-frame"; width: number; height: number; thickness: number });

export interface CraftDetailSpec {
  schemaVersion: 1;
  id: string;
  /** Existing host's world-space box, centered at [0,0,0]. */
  body: { width: number; height: number; depth: number };
  features: readonly CraftDetailFeature[];
  quality?: "hero" | "supporting";
}

export interface CraftDetailOptions {
  /** Optional shared material kit; consumer retains ownership. */
  materials?: CraftMaterialKit;
}

type Axis = readonly [number, number, number];
const basis: Record<DetailFace, { u: Axis; v: Axis; n: Axis }> = {
  front: { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
  back: { u: [-1, 0, 0], v: [0, 1, 0], n: [0, 0, -1] },
  top: { u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] },
  bottom: { u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0] },
  left: { u: [0, 0, 1], v: [0, 1, 0], n: [-1, 0, 0] },
  right: { u: [0, 0, -1], v: [0, 1, 0], n: [1, 0, 0] },
};
const validId = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0 && s.length <= 80 && !s.includes(".");
const finitePositive = (n: number) => Number.isFinite(n) && n > 0;
const finiteUnit = (n: number) => Number.isFinite(n) && n >= -.5 && n <= .5;

function faceSize(spec: CraftDetailSpec, face: DetailFace): readonly [number, number, number] {
  const { width: w, height: h, depth: d } = spec.body;
  if (face === "front" || face === "back") return [w, h, d];
  if (face === "top" || face === "bottom") return [w, d, h];
  return [d, h, w];
}

/** Fail malformed and out-of-frame details before allocating any GPU resources. */
export function validateCraftDetailSpec(spec: CraftDetailSpec): void {
  if (spec?.schemaVersion !== 1 || !validId(spec.id) || !spec.body ||
    ![spec.body.width, spec.body.height, spec.body.depth].every(n => finitePositive(n) && n <= 100))
    throw new Error("Craft detail requires schemaVersion 1, a safe ID and positive world dimensions <= 100.");
  if (!Array.isArray(spec.features) || spec.features.length === 0 || spec.features.length > 128)
    throw new Error("Craft detail needs 1–128 authored features.");
  if (spec.quality && !["hero", "supporting"].includes(spec.quality)) throw new Error("Unknown craft detail quality tier.");
  const ids = new Set<string>();
  for (const feature of spec.features) {
    if (!validId(feature?.id) || ids.has(feature.id)) throw new Error("Craft detail feature IDs must be nonempty and unique.");
    ids.add(feature.id);
    if (!Object.prototype.hasOwnProperty.call(basis, feature.face) || !Array.isArray(feature.at) || feature.at.length !== 2 ||
      !feature.at.every(finiteUnit)) throw new Error(`Craft detail ${feature.id}: invalid face or normalized position.`);
    const [width, height] = faceSize(spec, feature.face);
    let w = 0, h = 0;
    switch (feature.kind) {
      case "fastener":
        if (!finitePositive(feature.radius) ||
          (feature.drive && !["slot", "cross", "hex"].includes(feature.drive)) ||
          (feature.collar !== undefined && typeof feature.collar !== "boolean"))
          throw new Error(`Craft detail ${feature.id}: invalid fastener.`);
        w = h = feature.radius * 2.6;
        break;
      case "vent-bank":
      case "ribbed-grip": {
        const count = feature.kind === "vent-bank" ? feature.slots : feature.count;
        if (![feature.width, feature.height].every(n => finitePositive(n) && n >= .025) || !Number.isSafeInteger(count) || count < 2 ||
          count > (feature.kind === "vent-bank" ? 48 : 96) ||
          (feature.direction && !["vertical", "horizontal"].includes(feature.direction)))
          throw new Error(`Craft detail ${feature.id}: invalid ${feature.kind} geometry.`);
        const along = (feature.direction ?? "vertical") === "vertical" ? feature.width : feature.height;
        if (along / count < .003) throw new Error(`Craft detail ${feature.id}: individual openings/ribs would be too thin.`);
        w = feature.width + (feature.kind === "vent-bank" ? .02 : 0);
        h = feature.height + (feature.kind === "vent-bank" ? .02 : 0);
        break;
      }
      case "seam-frame":
        if (![feature.width, feature.height, feature.thickness].every(finitePositive) ||
          feature.thickness * 2 >= Math.min(feature.width, feature.height))
          throw new Error(`Craft detail ${feature.id}: invalid seam frame dimensions.`);
        w = feature.width; h = feature.height;
        break;
      default: throw new Error(`Craft detail ${feature.id}: unsupported feature kind.`);
    }
    if (Math.abs(feature.at[0] * width) + w / 2 > width * .5 + 1e-7 ||
      Math.abs(feature.at[1] * height) + h / 2 > height * .5 + 1e-7)
      throw new Error(`Craft detail ${feature.id}: feature extends beyond the ${feature.face} face.`);
  }
}

function rectangle(path: Path | Shape, w: number, h: number, clockwise = false, x = 0, y = 0) {
  const a = x - w / 2, b = x + w / 2, c = y - h / 2, d = y + h / 2;
  if (clockwise) {
    path.moveTo(a, c); path.lineTo(a, d); path.lineTo(b, d); path.lineTo(b, c); path.lineTo(a, c);
  } else {
    path.moveTo(a, c); path.lineTo(b, c); path.lineTo(b, d); path.lineTo(a, d); path.lineTo(a, c);
  }
}
function polygonHole(points: readonly (readonly [number, number])[]): Path {
  const p = new Path(), reversed = [...points].reverse();
  p.moveTo(...reversed[0]);
  for (const point of reversed.slice(1)) p.lineTo(...point);
  p.closePath();
  return p;
}
function driveShape(kind: "slot" | "cross" | "hex", r: number): Path {
  if (kind === "hex") return polygonHole(Array.from({ length: 6 }, (_, i) => [
    Math.cos(i * Math.PI / 3) * r * .55, Math.sin(i * Math.PI / 3) * r * .55,
  ] as const));
  const half = r * .1, arm = r * .64;
  if (kind === "slot") return polygonHole([[-arm, -half], [arm, -half], [arm, half], [-arm, half]]);
  return polygonHole([[-half, -arm], [half, -arm], [half, -half], [arm, -half],
    [arm, half], [half, half], [half, arm], [-half, arm], [-half, half],
    [-arm, half], [-arm, -half], [-half, -half]]);
}

/** Build and attach authored construction details to the six faces of a host.
 * The host mesh, material kit and rendering lifecycle remain caller-owned.
 */
export function createCraftDetailKit(spec: CraftDetailSpec, options: CraftDetailOptions = {}) {
  validateCraftDetailSpec(spec);
  const ownMaterials = !options.materials;
  const kit = options.materials ?? createCraftMaterialKit();
  const group = new Group(); group.name = spec.id;
  const parts = new Map<string, Object3D>();
  const geometries = new Set<BufferGeometry>();
  const geometryCache = new Map<string, BufferGeometry>();
  const own = <T extends BufferGeometry>(g: T): T => { geometries.add(g); return g; };
  const cached = <T extends BufferGeometry>(key: string, build: () => T): T => {
    let geometry = geometryCache.get(key) as T | undefined;
    if (!geometry) { geometry = own(build()); geometryCache.set(key, geometry); }
    return geometry;
  };
  const quality = spec.quality ?? "hero";

  for (const feature of spec.features) {
    const axes = basis[feature.face], [width, height, depth] = faceSize(spec, feature.face);
    const normal = new Vector3(...axes.n), tangent = new Vector3(...axes.u), bitangent = new Vector3(...axes.v);
    const frame = new Group();
    frame.name = feature.id;
    frame.userData.partRole = feature.kind;
    frame.position.copy(normal.clone().multiplyScalar(depth / 2))
      .addScaledVector(tangent, feature.at[0] * width)
      .addScaledVector(bitangent, feature.at[1] * height);
    frame.quaternion.copy(new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(tangent, bitangent, normal)));
    group.add(frame); parts.set(feature.id, frame);
    const addMesh = (name: string, geometry: BufferGeometry, surface: keyof CraftMaterialKit["materials"],
      z = 0, shadow = true) => {
      const mesh = new Mesh(own(geometry), kit.materials[surface]);
      mesh.name = `${feature.id}-${name}`;
      mesh.position.z = z; mesh.castShadow = shadow; mesh.receiveShadow = shadow;
      frame.add(mesh);
      return mesh;
    };

    if (feature.kind === "fastener") {
      const r = feature.radius, segments = quality === "hero" ? 48 : 20;
      // The screw drive is a real opening into a dark recessed socket, not a
      // painted stripe. It is through the separate head, not through the host.
      addMesh("socket", cached(`socket/${r}/${segments}`,
        () => new CylinderGeometry(r * .66, r * .66, .01, segments)), "soft-touch", .016).rotation.x = Math.PI / 2;
      addMesh("head", cached(`head/${r}/${feature.drive ?? "cross"}/${segments}`, () => {
        const outline = new Shape(); outline.absarc(0, 0, r, 0, Math.PI * 2, false);
        outline.holes.push(driveShape(feature.drive ?? "cross", r));
        return new ExtrudeGeometry(outline, { depth: r * .28, bevelEnabled: false, curveSegments: segments });
      }), "brushed-metal", .016);
      if (feature.collar ?? true)
        addMesh("collar", cached(`collar/${r}/${segments}`,
          () => new TorusGeometry(r * 1.1, r * .105, quality === "hero" ? 8 : 4, segments)), "anodized-metal", .012);
    } else if (feature.kind === "vent-bank") {
      const s = new Shape(); rectangle(s, feature.width, feature.height);
      const vertical = (feature.direction ?? "vertical") === "vertical";
      const along = vertical ? feature.width : feature.height;
      const cross = vertical ? feature.height : feature.width;
      const border = Math.min(cross * .12, along * .07);
      const pitch = (along - border * 2) / feature.slots;
      const slotWidth = pitch * .70, slotHeight = cross - border * 2;
      for (let i = 0; i < feature.slots; i++) {
        const hole = new Path(), offset = -along / 2 + border + pitch * (i + .5);
        rectangle(hole, vertical ? slotWidth : slotHeight, vertical ? slotHeight : slotWidth,
          true, vertical ? offset : 0, vertical ? 0 : offset);
        s.holes.push(hole);
      }
      addMesh("cavity-backing", new RoundedBoxGeometry(feature.width * .99, feature.height * .99, .018,
        2, .003), "soft-touch", .003, false);
      addMesh("perforated-faceplate", new ExtrudeGeometry(s, {
        depth: .014, bevelEnabled: false, curveSegments: quality === "hero" ? 12 : 6,
      }), "anodized-metal", .015);
      const rim = new Shape(); rectangle(rim, feature.width + .02, feature.height + .02);
      const cut = new Path(); rectangle(cut, feature.width - .008, feature.height - .008, true);
      rim.holes.push(cut);
      addMesh("mounting-bezel", new ExtrudeGeometry(rim, { depth: .012, bevelEnabled: false }),
        "brushed-metal", .023);
    } else if (feature.kind === "ribbed-grip") {
      const vertical = (feature.direction ?? "vertical") === "vertical";
      const pitch = (vertical ? feature.width : feature.height) / feature.count;
      const ribW = vertical ? pitch * .65 : feature.width;
      const ribH = vertical ? feature.height : pitch * .65;
      const bevel = Math.min(.012, ribW * .46, ribH * .46, .045 * .46);
      const geometry = own(new RoundedBoxGeometry(ribW, ribH, .045, quality === "hero" ? 3 : 1, bevel));
      const ribs = new InstancedMesh(geometry, kit.materials.elastomer, feature.count);
      ribs.name = `${feature.id}-grip-ribs`;
      ribs.castShadow = true; ribs.receiveShadow = true;
      for (let i = 0; i < feature.count; i++) {
        const offset = (i + .5 - feature.count / 2) * pitch;
        ribs.setMatrixAt(i, new Matrix4().makeTranslation(vertical ? offset : 0, vertical ? 0 : offset, .034));
      }
      ribs.instanceMatrix.needsUpdate = true;
      frame.add(ribs);
    } else if (feature.kind === "seam-frame") {
      const shape = new Shape(); rectangle(shape, feature.width, feature.height);
      const hole = new Path(); rectangle(hole, feature.width - 2 * feature.thickness,
        feature.height - 2 * feature.thickness, true);
      shape.holes.push(hole);
      addMesh("compression-gasket", new ExtrudeGeometry(shape, { depth: .018, bevelEnabled: false }), "elastomer", .009);
    }
  }

  return {
    group, parts, materials: kit,
    getPart(id: string) { return parts.get(id); },
    dispose() { for (const geometry of geometries) geometry.dispose(); geometries.clear(); geometryCache.clear(); group.clear();
      if (ownMaterials) kit.dispose(); },
  };
}
export type CraftDetailKit = ReturnType<typeof createCraftDetailKit>;
