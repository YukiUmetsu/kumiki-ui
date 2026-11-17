/**
 * Three.js adapter for `AdvancedShapeMorph` (registry item `shape-morph-three`).
 *
 * `MorphExtrusionGeometry` turns every frame of a 2D morph into an extruded solid: a front cap, a back cap
 * and side walls with crease-aware normals. The vertex layout is built once per morph plan, and each frame
 * rewrites positions and normals in place. Only the caps are triangulated per frame (`ShapeUtils`, which wraps
 * Earcut), because a triangulation from one end of a morph can fold over in transit. The caps reuse their point
 * objects; the triangulator itself allocates its small result arrays.
 *
 * `AdvancedShapeMorphMesh` adds a pose that travels through 3D space (position, rotation and scale
 * interpolate with the morph's easing) and per-part opacity for `cross-dissolve` parts.
 *
 * Shape space is y-down (SVG); the adapter flips y so shapes stand upright in three's y-up world.
 */

import { BufferAttribute, BufferGeometry, Box3, Euler, Mesh, Quaternion, ShapeUtils, Sphere, Vector2, Vector3 } from "three";
import type { Material } from "three";

import type { AdvancedShapeMorph, MorphPlanSummary } from "./advanced-morph";

export interface MorphExtrusionOptions {
  /** Depth in shape units. A pair `[from, to]` morphs the depth too. Default 24. */
  depth?: number | readonly [number, number];
  /** Shape units per world unit. Default 1. */
  unitsPerWorld?: number;
  /** Shape point placed at the world origin. Default: the centre of the source and target bounds. */
  origin?: { x: number; y: number };
  /** Side shading splits into a crisp edge where neighbouring side faces turn more than this (degrees). Default 30. */
  creaseAngle?: number;
}

export interface MorphPose3D {
  position?: readonly [number, number, number];
  /** Euler angles in radians, XYZ order. */
  rotation?: readonly [number, number, number];
  scale?: number;
}

export interface AdvancedShapeMorphMeshOptions extends MorphExtrusionOptions {
  /** Material for every part. Fading parts receive transparent clones of it. */
  material: Material;
  /** Pose at progress 0 and at progress 1. */
  pose?: { from?: MorphPose3D; to?: MorphPose3D };
}

interface RingLayout {
  count: number;
  /** First front-cap vertex. The back-cap copy follows at `capStart + count`. */
  capStart: number;
  /** First side vertex (4 per edge). */
  sideStart: number;
}

interface ComponentLayout {
  rings: RingLayout[];
  /** Front-cap vertex count; the back cap has the same count. */
  capCount: number;
  sideIndexStart: number;
  sideIndexCount: number;
  /** Maximum cap indices for one cap. */
  capCapacity: number;
  coords: Float64Array;
  /** One reusable point per cap vertex, and one reusable list per ring, for the triangulator. */
  points: Vector2[][];
  lists: Vector2[][];
  holeLists: Vector2[][];
}

function interpolate(a: number, b: number, e: number): number {
  return a + (b - a) * e;
}

/**
 * Extruded geometry that follows an `AdvancedShapeMorph`. Call `update(t)` every frame. When the morph builds a
 * new plan (`configure`, `setShapes`), the geometry detects it and rebuilds its layout on the next update.
 */
export class MorphExtrusionGeometry extends BufferGeometry {
  readonly morph: AdvancedShapeMorph;
  private options: Required<Omit<MorphExtrusionOptions, "origin">> & { origin?: { x: number; y: number } };
  private plan: MorphPlanSummary | null = null;
  private layouts: ComponentLayout[] = [];
  private positions = new Float32Array(0);
  private normals = new Float32Array(0);
  private indices = new Uint32Array(0);
  private sideIndices = new Uint32Array(0);
  private originX = 0;
  private originY = 0;

  constructor(morph: AdvancedShapeMorph, options: MorphExtrusionOptions = {}) {
    super();
    this.morph = morph;
    this.options = {
      depth: options.depth ?? 24,
      unitsPerWorld: options.unitsPerWorld && options.unitsPerWorld > 0 ? options.unitsPerWorld : 1,
      creaseAngle: options.creaseAngle ?? 30,
      origin: options.origin,
    };
    this.sync();
  }

  /** Evaluate the morph at `t` and write the solid. */
  update(t: number): this {
    this.morph.update(t);
    return this.sync();
  }

  /** Write the solid for the morph's current frame (when something else already called `morph.update`). */
  sync(): this {
    if (this.plan !== this.morph.plan) this.layout();
    const frame = this.morph.frame;
    const [d0, d1] = typeof this.options.depth === "number" ? [this.options.depth, this.options.depth] : this.options.depth;
    const half = Math.max(interpolate(d0, d1, frame.eased), 1e-3) / 2 / this.options.unitsPerWorld;
    const cosCrease = Math.cos((this.options.creaseAngle * Math.PI) / 180);
    let written = 0;
    frame.components.forEach((component, c) => {
      const layout = this.layouts[c];
      const groupStart = written;
      const rings = [component.outer, ...component.holes];
      // Parts that overlap in transit would have coplanar caps; a tiny per-part depth step prevents z-fighting.
      const partHalf = half * (1 + 0.004 * (c % 8));
      rings.forEach((ring, r) => this.writeRing(ring, layout.rings[r], layout, partHalf, cosCrease));
      this.indices.set(this.sideIndices.subarray(layout.sideIndexStart, layout.sideIndexStart + layout.sideIndexCount), written);
      written += layout.sideIndexCount;
      written = this.writeCaps(layout, written);
      const group = this.groups[c];
      group.start = groupStart;
      group.count = written - groupStart;
    });
    this.setDrawRange(0, written);
    (this.getAttribute("position") as BufferAttribute).needsUpdate = true;
    (this.getAttribute("normal") as BufferAttribute).needsUpdate = true;
    this.index!.needsUpdate = true;
    return this;
  }

  /** Allocate buffers and static side indices for the current plan. */
  private layout(): void {
    this.plan = this.morph.plan;
    const pairs = this.morph.correspondence();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const pair of pairs) {
      for (const ring of [pair.from, pair.to]) {
        for (let i = 0; i < ring.length; i += 2) {
          minX = Math.min(minX, ring[i]);
          maxX = Math.max(maxX, ring[i]);
          minY = Math.min(minY, ring[i + 1]);
          maxY = Math.max(maxY, ring[i + 1]);
        }
      }
    }
    if (!Number.isFinite(minX)) minX = minY = maxX = maxY = 0;
    this.originX = this.options.origin?.x ?? (minX + maxX) / 2;
    this.originY = this.options.origin?.y ?? (minY + maxY) / 2;

    let vertices = 0;
    let sideIndexTotal = 0;
    let capacity = 0;
    this.layouts = this.morph.frame.components.map((component) => {
      const rings = [component.outer, ...component.holes].map((ring) => ring.length >> 1);
      const capCount = rings.reduce((sum, n) => sum + n, 0);
      const capStart = vertices;
      vertices += 2 * capCount;
      let offset = capStart;
      const ringLayouts = rings.map((count) => {
        const layout = { count, capStart: offset, sideStart: 0 };
        offset += count;
        return layout;
      });
      for (const ring of ringLayouts) {
        ring.sideStart = vertices;
        vertices += 4 * ring.count;
      }
      const sideIndexCount = rings.reduce((sum, n) => sum + 6 * n, 0);
      const capCapacity = 3 * (capCount + 2 * rings.length);
      const layout: ComponentLayout = {
        rings: ringLayouts, capCount, sideIndexStart: sideIndexTotal, sideIndexCount, capCapacity,
        coords: new Float64Array(2 * capCount),
        points: rings.map((count) => Array.from({ length: count }, () => new Vector2())),
        lists: rings.map(() => []),
        holeLists: [],
      };
      sideIndexTotal += sideIndexCount;
      capacity += sideIndexCount + 2 * capCapacity;
      return layout;
    });

    this.sideIndices = new Uint32Array(sideIndexTotal);
    let k = 0;
    for (const layout of this.layouts) {
      for (const ring of layout.rings) {
        for (let e = 0; e < ring.count; e += 1) {
          const v = ring.sideStart + 4 * e;
          // Vertices per edge: front i, front i+1, back i, back i+1. Both triangles face outward.
          this.sideIndices.set([v + 2, v, v + 1, v + 2, v + 1, v + 3], k);
          k += 6;
        }
      }
    }
    this.positions = new Float32Array(3 * vertices);
    this.normals = new Float32Array(3 * vertices);
    this.indices = new Uint32Array(Math.max(capacity, 3));
    this.setAttribute("position", new BufferAttribute(this.positions, 3));
    this.setAttribute("normal", new BufferAttribute(this.normals, 3));
    this.setIndex(new BufferAttribute(this.indices, 1));
    this.clearGroups();
    this.layouts.forEach((_, c) => this.addGroup(0, 0, c));

    // A static bound with room for elastic overshoot keeps frustum culling valid on every frame.
    const u = this.options.unitsPerWorld;
    const depth = typeof this.options.depth === "number" ? this.options.depth : Math.max(...this.options.depth);
    const spanX = (maxX - minX) / u;
    const spanY = (maxY - minY) / u;
    const margin = 0.35 * Math.max(spanX, spanY, depth / u);
    this.boundingBox = new Box3(
      new Vector3((minX - this.originX) / u - margin, -(maxY - this.originY) / u - margin, -depth / u - margin),
      new Vector3((maxX - this.originX) / u + margin, -(minY - this.originY) / u + margin, depth / u + margin),
    );
    this.boundingSphere = this.boundingBox.getBoundingSphere(new Sphere());
  }

  private writeRing(ring: Float32Array, layout: RingLayout, component: ComponentLayout, half: number, cosCrease: number): void {
    const n = layout.count;
    const u = this.options.unitsPerWorld;
    const p = this.positions;
    const q = this.normals;
    const coords = component.coords;
    const local = layout.capStart - component.rings[0].capStart;
    for (let i = 0; i < n; i += 1) {
      const x = (ring[2 * i] - this.originX) / u;
      const y = -(ring[2 * i + 1] - this.originY) / u;
      coords[2 * (local + i)] = x;
      coords[2 * (local + i) + 1] = y;
      const front = 3 * (layout.capStart + i);
      p[front] = x;
      p[front + 1] = y;
      p[front + 2] = half;
      q[front] = 0;
      q[front + 1] = 0;
      q[front + 2] = 1;
    }
    const capCount = component.capCount;
    for (let i = 0; i < n; i += 1) {
      const front = 3 * (layout.capStart + i);
      const back = 3 * (layout.capStart + capCount + i);
      p[back] = p[front];
      p[back + 1] = p[front + 1];
      p[back + 2] = -half;
      q[back] = 0;
      q[back + 1] = 0;
      q[back + 2] = -1;
    }
    // Side walls. After the y flip every ring has its solid on the right, so (-dy, dx) points outward.
    for (let e = 0; e < n; e += 1) {
      const i = e;
      const j = (e + 1) % n;
      const prev = (e + n - 1) % n;
      const next = (e + 2) % n;
      const ex = coords[2 * (local + j)] - coords[2 * (local + i)];
      const ey = coords[2 * (local + j) + 1] - coords[2 * (local + i) + 1];
      const [nx, ny] = unitNormal(ex, ey);
      const [px, py] = unitNormal(coords[2 * (local + i)] - coords[2 * (local + prev)], coords[2 * (local + i) + 1] - coords[2 * (local + prev) + 1]);
      const [fx, fy] = unitNormal(coords[2 * (local + next)] - coords[2 * (local + j)], coords[2 * (local + next) + 1] - coords[2 * (local + j) + 1]);
      const [ax, ay] = nx * px + ny * py >= cosCrease ? unit(nx + px, ny + py, nx, ny) : [nx, ny];
      const [bx, by] = nx * fx + ny * fy >= cosCrease ? unit(nx + fx, ny + fy, nx, ny) : [nx, ny];
      const v = 3 * (layout.sideStart + 4 * e);
      const xi = coords[2 * (local + i)];
      const yi = coords[2 * (local + i) + 1];
      const xj = coords[2 * (local + j)];
      const yj = coords[2 * (local + j) + 1];
      p[v] = xi; p[v + 1] = yi; p[v + 2] = half;
      p[v + 3] = xj; p[v + 4] = yj; p[v + 5] = half;
      p[v + 6] = xi; p[v + 7] = yi; p[v + 8] = -half;
      p[v + 9] = xj; p[v + 10] = yj; p[v + 11] = -half;
      q[v] = ax; q[v + 1] = ay; q[v + 2] = 0;
      q[v + 3] = bx; q[v + 4] = by; q[v + 5] = 0;
      q[v + 6] = ax; q[v + 7] = ay; q[v + 8] = 0;
      q[v + 9] = bx; q[v + 10] = by; q[v + 11] = 0;
    }
  }

  /** Triangulate the front cap (holes that have collapsed to a point are left out) and mirror it for the back. */
  private writeCaps(layout: ComponentLayout, written: number): number {
    const included: number[] = [];
    layout.holeLists.length = 0;
    layout.rings.forEach((ring, r) => {
      const local = ring.capStart - layout.rings[0].capStart;
      let area = 0;
      for (let i = 0, j = ring.count - 1; i < ring.count; j = i, i += 1) {
        area += layout.coords[2 * (local + j)] * layout.coords[2 * (local + i) + 1] - layout.coords[2 * (local + i)] * layout.coords[2 * (local + j) + 1];
      }
      if (Math.abs(area) < (r === 0 ? 1e-12 : 1e-9)) return;
      const list = layout.lists[r];
      list.length = 0;
      for (let i = 0; i < ring.count; i += 1) {
        const point = layout.points[r][i];
        point.set(layout.coords[2 * (local + i)], layout.coords[2 * (local + i) + 1]);
        list.push(point);
      }
      included.push(r);
      if (r > 0) layout.holeLists.push(list);
    });
    if (included[0] !== 0) return written;
    const faces = ShapeUtils.triangulateShape(layout.lists[0], layout.holeLists);
    // The triangulator drops a repeated closing point in place, so read each list's length after the call.
    const vertexOf = (index: number): { vertex: number; point: Vector2 } => {
      let k = index;
      for (const r of included) {
        const list = layout.lists[r];
        if (k < list.length) return { vertex: layout.rings[r].capStart + k, point: list[k] };
        k -= list.length;
      }
      return { vertex: layout.rings[0].capStart, point: layout.lists[0][0] };
    };
    const limit = Math.min(faces.length, Math.floor(layout.capCapacity / 3));
    for (let f = 0; f < limit; f += 1) {
      const a = vertexOf(faces[f][0]);
      const b = vertexOf(faces[f][1]);
      const c = vertexOf(faces[f][2]);
      const cross = (b.point.x - a.point.x) * (c.point.y - a.point.y) - (b.point.y - a.point.y) * (c.point.x - a.point.x);
      const [va, vb, vc] = cross >= 0 ? [a.vertex, b.vertex, c.vertex] : [a.vertex, c.vertex, b.vertex];
      this.indices[written++] = va;
      this.indices[written++] = vb;
      this.indices[written++] = vc;
      this.indices[written++] = va + layout.capCount;
      this.indices[written++] = vc + layout.capCount;
      this.indices[written++] = vb + layout.capCount;
    }
    return written;
  }
}

function unitNormal(dx: number, dy: number): [number, number] {
  const length = Math.hypot(dx, dy);
  return length > 1e-12 ? [-dy / length, dx / length] : [0, 0];
}

function unit(x: number, y: number, fallbackX: number, fallbackY: number): [number, number] {
  const length = Math.hypot(x, y);
  return length > 1e-12 ? [x / length, y / length] : [fallbackX, fallbackY];
}

/**
 * A mesh that morphs, extrudes and travels through 3D space. `update(t)` evaluates the morph, rewrites the
 * geometry, interpolates the pose (position: linear, rotation: spherical, scale: logarithmic) with the morph's
 * easing, and sets the opacity of fading parts.
 */
export class AdvancedShapeMorphMesh extends Mesh<MorphExtrusionGeometry, Material[]> {
  private readonly baseMaterial: Material;
  private clones: Material[] = [];
  private readonly from = { position: new Vector3(), quaternion: new Quaternion(), scale: 1 };
  private readonly to = { position: new Vector3(), quaternion: new Quaternion(), scale: 1 };
  private plan: MorphPlanSummary | null = null;

  constructor(morph: AdvancedShapeMorph, options: AdvancedShapeMorphMeshOptions) {
    super(new MorphExtrusionGeometry(morph, options), []);
    this.baseMaterial = options.material;
    this.setPose(options.pose ?? {});
    this.update(morph.frame.progress);
  }

  setPose(pose: { from?: MorphPose3D; to?: MorphPose3D }): this {
    const apply = (target: { position: Vector3; quaternion: Quaternion; scale: number }, value: MorphPose3D = {}) => {
      target.position.set(...(value.position ?? [0, 0, 0]));
      target.quaternion.setFromEuler(new Euler(...(value.rotation ?? [0, 0, 0])));
      target.scale = value.scale && value.scale > 0 ? value.scale : 1;
    };
    apply(this.from, pose.from);
    apply(this.to, pose.to);
    return this;
  }

  update(t: number): this {
    this.geometry.update(t);
    if (this.plan !== this.geometry.morph.plan) this.assignMaterials();
    const frame = this.geometry.morph.frame;
    const e = frame.eased;
    this.position.lerpVectors(this.from.position, this.to.position, e);
    this.quaternion.slerpQuaternions(this.from.quaternion, this.to.quaternion, Math.min(Math.max(e, 0), 1));
    this.scale.setScalar(this.from.scale * Math.pow(this.to.scale / this.from.scale, e));
    frame.components.forEach((component, c) => {
      const material = this.material[c];
      if (material !== this.baseMaterial) material.opacity = this.baseMaterial.opacity * component.opacity;
    });
    return this;
  }

  /** Dispose the geometry and the transparent clones. The caller owns the base material. */
  dispose(): void {
    this.geometry.dispose();
    for (const clone of this.clones) clone.dispose();
    this.clones = [];
  }

  private assignMaterials(): void {
    for (const clone of this.clones) clone.dispose();
    this.clones = [];
    this.plan = this.geometry.morph.plan;
    this.material = this.geometry.morph.frame.components.map((component) => {
      if (component.kind !== "fade-in" && component.kind !== "fade-out") return this.baseMaterial;
      const clone = this.baseMaterial.clone();
      clone.transparent = true;
      clone.depthWrite = false;
      this.clones.push(clone);
      return clone;
    });
  }
}
