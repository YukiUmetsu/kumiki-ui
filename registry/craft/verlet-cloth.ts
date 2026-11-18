/** Small allocation-free Verlet simulations for secondary motion: ropes (reins, lariats, straps), cloth
 * patches (neckerchiefs, flags, saddle strings) and spring bone chains (tails, long hair, tassels), pinned
 * to moving objects, with gravity, air drag, wind from the carrier's own motion and sphere colliders.
 * Fixed time step, so the motion is the same at any frame rate; positions are written straight into a
 * BufferGeometry (ropes, cloth) or into bone rotations (chains) each frame.
 */
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Matrix4, Quaternion, Vector3 } from "three";
import type { Object3D } from "three";

export interface VerletWorld {
  gravity: Vector3;
  /** Air velocity (m/s) in the world: wind minus nothing; a moving carrier feels −its velocity. */
  wind: Vector3;
  /** Spheres to stay outside: centre and radius. */
  colliders: ReadonlyArray<{ centre: Vector3; radius: number }>;
}

const STEP = 1 / 120;

/** A chain of `count` points of fixed segment length; ends can be pinned to world points each frame. */
export class VerletRope {
  readonly points: Vector3[];
  private readonly previous: Vector3[];
  private readonly scratch = new Vector3();
  private accumulator = 0;
  constructor(count: number, readonly segment: number, start: Vector3, direction = new Vector3(0, -1, 0), readonly drag = .02, readonly iterations = 8) {
    this.points = Array.from({ length: count }, (_, i) => start.clone().addScaledVector(direction, i * segment));
    this.previous = this.points.map(p => p.clone());
  }
  /** Advance by dt with the first point pinned at `a` and (optionally) the last at `b`. */
  update(dt: number, world: VerletWorld, a: Vector3, b?: Vector3, airK = .02) {
    this.accumulator = Math.min(this.accumulator + dt, .1);
    while (this.accumulator >= STEP) {
      this.accumulator -= STEP;
      const n = this.points.length;
      for (let i = 0; i < n; i++) {
        const p = this.points[i], q = this.previous[i], s = this.scratch;
        s.subVectors(p, q).multiplyScalar(1 - this.drag);
        // Air pushes each point toward the air velocity.
        s.addScaledVector(world.wind, airK * STEP).addScaledVector(world.gravity, STEP * STEP);
        q.copy(p); p.add(s);
      }
      this.points[0].copy(a); this.previous[0].copy(a);
      if (b) { this.points[n - 1].copy(b); this.previous[n - 1].copy(b); }
      for (let k = 0; k < this.iterations; k++) {
        for (let i = 0; i < n - 1; i++) {
          const p = this.points[i], q = this.points[i + 1], s = this.scratch.subVectors(q, p);
          const d = s.length() || 1e-6, diff = (d - this.segment) / d;
          const wp = i === 0 ? 0 : .5, wq = b && i + 1 === n - 1 ? 0 : .5, w = wp + wq || 1;
          p.addScaledVector(s, diff * wp / w); q.addScaledVector(s, -diff * wq / w);
        }
        for (const c of world.colliders) for (let i = 1; i < n; i++) {
          const p = this.points[i], s = this.scratch.subVectors(p, c.centre), d = s.length();
          if (d < c.radius && d > 1e-6) p.addScaledVector(s, (c.radius - d) / d);
        }
      }
    }
  }
}

/** A tube mesh along a rope, updated in place (draw it with `frustumCulled = false`: it moves every frame). */
export class RopeMesh {
  readonly geometry = new BufferGeometry();
  private readonly position: BufferAttribute;
  private readonly normal: BufferAttribute;
  private readonly t = new Vector3(); private readonly n = new Vector3(); private readonly b = new Vector3(); private readonly up = new Vector3(0, 1, 0);
  constructor(readonly rope: VerletRope, readonly radius: number, readonly sides = 5) {
    const rows = rope.points.length, count = rows * sides;
    this.position = new BufferAttribute(new Float32Array(count * 3), 3);
    this.normal = new BufferAttribute(new Float32Array(count * 3), 3);
    this.position.setUsage(DynamicDrawUsage); this.normal.setUsage(DynamicDrawUsage);
    const index: number[] = [];
    for (let r = 0; r < rows - 1; r++) for (let s = 0; s < sides; s++) {
      const a = r * sides + s, b = r * sides + (s + 1) % sides, c = a + sides, d = b + sides;
      index.push(a, c, b, b, c, d);
    }
    this.geometry.setAttribute("position", this.position);
    this.geometry.setAttribute("normal", this.normal);
    this.geometry.setIndex(index);
    this.update();
  }
  update() {
    const pts = this.rope.points, rows = pts.length, pa = this.position.array as Float32Array, na = this.normal.array as Float32Array;
    for (let r = 0; r < rows; r++) {
      const p = pts[r], q = pts[Math.min(rows - 1, r + 1)], o = pts[Math.max(0, r - 1)];
      this.t.subVectors(q, o).normalize();
      this.n.crossVectors(this.t, this.up); if (this.n.lengthSq() < 1e-6) this.n.set(1, 0, 0); this.n.normalize();
      this.b.crossVectors(this.t, this.n);
      for (let s = 0; s < this.sides; s++) {
        const a = s / this.sides * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), k = (r * this.sides + s) * 3;
        const nx = this.n.x * c + this.b.x * sn, ny = this.n.y * c + this.b.y * sn, nz = this.n.z * c + this.b.z * sn;
        pa[k] = p.x + nx * this.radius; pa[k + 1] = p.y + ny * this.radius; pa[k + 2] = p.z + nz * this.radius;
        na[k] = nx; na[k + 1] = ny; na[k + 2] = nz;
      }
    }
    this.position.needsUpdate = true; this.normal.needsUpdate = true;
  }
}

/** A rectangular cloth patch (rows × cols points); any points can be pinned to targets each frame.
 * Draw with `frustumCulled = false` and a double-sided material. */
export class VerletCloth {
  readonly geometry = new BufferGeometry();
  private readonly p: Vector3[]; private readonly q: Vector3[];
  private readonly links: Array<[number, number, number]> = [];
  private readonly position: BufferAttribute;
  private readonly normal: BufferAttribute;
  private readonly s = new Vector3();
  private accumulator = 0;
  constructor(readonly rows: number, readonly cols: number, origin: Vector3, across: Vector3, down: Vector3, readonly drag = .03) {
    this.p = []; this.q = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const v = origin.clone().addScaledVector(across, c / (cols - 1)).addScaledVector(down, r / (rows - 1));
      this.p.push(v); this.q.push(v.clone());
    }
    const id = (r: number, c: number) => r * cols + c;
    const link = (a: number, b: number) => this.links.push([a, b, this.p[a].distanceTo(this.p[b])]);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (c < cols - 1) link(id(r, c), id(r, c + 1));
      if (r < rows - 1) link(id(r, c), id(r + 1, c));
      if (r < rows - 1 && c < cols - 1) { link(id(r, c), id(r + 1, c + 1)); link(id(r, c + 1), id(r + 1, c)); }
    }
    this.position = new BufferAttribute(new Float32Array(rows * cols * 3), 3);
    this.normal = new BufferAttribute(new Float32Array(rows * cols * 3), 3);
    this.position.setUsage(DynamicDrawUsage); this.normal.setUsage(DynamicDrawUsage);
    const uv = new Float32Array(rows * cols * 2), index: number[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      uv[id(r, c) * 2] = c / (cols - 1); uv[id(r, c) * 2 + 1] = 1 - r / (rows - 1);
      if (r < rows - 1 && c < cols - 1) index.push(id(r, c), id(r + 1, c), id(r, c + 1), id(r, c + 1), id(r + 1, c), id(r + 1, c + 1));
    }
    this.geometry.setAttribute("position", this.position);
    this.geometry.setAttribute("normal", this.normal);
    this.geometry.setAttribute("uv", new BufferAttribute(uv, 2));
    this.geometry.setIndex(index);
    this.write();
  }
  /** Advance; `pins` maps point index → world target. */
  update(dt: number, world: VerletWorld, pins: ReadonlyMap<number, Vector3>, airK = .04) {
    this.accumulator = Math.min(this.accumulator + dt, .1);
    while (this.accumulator >= STEP) {
      this.accumulator -= STEP;
      for (let i = 0; i < this.p.length; i++) {
        const p = this.p[i], q = this.q[i], s = this.s.subVectors(p, q).multiplyScalar(1 - this.drag);
        s.addScaledVector(world.wind, airK * STEP).addScaledVector(world.gravity, STEP * STEP);
        q.copy(p); p.add(s);
      }
      for (let k = 0; k < 6; k++) {
        for (const [a, b, rest] of this.links) {
          const pa = this.p[a], pb = this.p[b], s = this.s.subVectors(pb, pa), d = s.length() || 1e-6, diff = (d - rest) / d * .5;
          pa.addScaledVector(s, diff); pb.addScaledVector(s, -diff);
        }
        for (const [i, target] of pins) { this.p[i].copy(target); this.q[i].copy(target); }
        for (const c of world.colliders) for (const p of this.p) {
          const s = this.s.subVectors(p, c.centre), d = s.length();
          if (d < c.radius && d > 1e-6) p.addScaledVector(s, (c.radius - d) / d);
        }
      }
    }
    this.write();
  }
  private write() {
    const a = this.position.array as Float32Array, n = this.normal.array as Float32Array, { rows, cols } = this;
    this.p.forEach((v, i) => { a[i * 3] = v.x; a[i * 3 + 1] = v.y; a[i * 3 + 2] = v.z; });
    // Grid normals from central differences (no temporary objects).
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, l = this.p[r * cols + Math.max(0, c - 1)], rr = this.p[r * cols + Math.min(cols - 1, c + 1)];
      const u = this.p[Math.max(0, r - 1) * cols + c], d = this.p[Math.min(rows - 1, r + 1) * cols + c];
      const ax = rr.x - l.x, ay = rr.y - l.y, az = rr.z - l.z, bx = d.x - u.x, by = d.y - u.y, bz = d.z - u.z;
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const len = Math.hypot(nx, ny, nz) || 1; nx /= len; ny /= len; nz /= len;
      n[i * 3] = -nx; n[i * 3 + 1] = -ny; n[i * 3 + 2] = -nz;
    }
    this.position.needsUpdate = true; this.normal.needsUpdate = true;
  }
}

export interface SpringBoneOptions {
  /** Pull toward the animated pose (fraction per second): 0 hangs freely, ~20 follows the clip closely. */
  stiffness?: number;
  /** Share of velocity lost per 1/120 s step. */
  drag?: number;
  /** Air coupling (1/s): how quickly the chain takes up the air's velocity. Hair is light and catches the air:
   * at 2.2/s a chain in a 12 m/s airflow streams out about 20° below horizontal (tan θ = g / (air × v)). */
  air?: number;
  /** Turbulent wake as a fraction of the airspeed (deterministic gusts, side to side and up and down). */
  turbulence?: number;
  /** Collision radius of each simulated point (m). */
  radius?: number;
  /** Largest turn of a bone away from its animated direction (radians): long hair bends, it does not fold into hooks. */
  maxBend?: number;
  /** End of the last bone in its own frame; default: the previous bone's child offset. */
  tipOffset?: Vector3;
  /** Spheres, each riding an object (centre in that object's frame), that the chain stays outside. */
  colliders?: ReadonlyArray<{ object: Object3D; offset: Vector3; radius: number }>;
}

/**
 * A chain of bones driven by Verlet points at each bone's end (after the VRM spring-bone model): inertia, air drag,
 * gravity and a soft pull toward the animated pose, segment lengths kept exact, sphere collisions. The simulation
 * runs in the frame of `space` (the carrier, such as a horse's root), so the carrier's travel does not jolt the
 * chain; its motion reaches the chain through the root bone and the air velocity. Call `update` each frame after
 * the animation mixer has posed the bones (their local rotations are read as the target, then overwritten).
 */
export class SpringBoneChain {
  private readonly n: number;
  private readonly offsets: Vector3[];
  private readonly lengths: number[];
  private readonly tips: Vector3[]; private readonly prev: Vector3[];
  private readonly animQ: Quaternion[]; private readonly simQ: Quaternion[];
  private readonly o: Required<Omit<SpringBoneOptions, "tipOffset" | "colliders">>;
  private readonly colliders: ReadonlyArray<{ object: Object3D; offset: Vector3; radius: number }>;
  private readonly centres: Vector3[];
  private accumulator = 0; private time = 0; private started = false;
  // Root frame (the first bone's parent, in `space`) now and at the previous frame, interpolated over sub-steps.
  private readonly rootPos = new Vector3(); private readonly rootQ = new Quaternion();
  private readonly lastRootPos = new Vector3(); private readonly lastRootQ = new Quaternion();
  private readonly m = new Matrix4(); private readonly inv = new Matrix4(); private readonly sc = new Vector3();
  private readonly head = new Vector3(); private readonly target = new Vector3(); private readonly v = new Vector3(); private readonly a = new Vector3();
  private readonly air = new Vector3(); private readonly gravity = new Vector3(); private readonly dir = new Vector3(); private readonly want = new Vector3();
  private readonly pq = new Quaternion(); private readonly q = new Quaternion(); private readonly arc = new Quaternion(); private readonly spaceQ = new Quaternion();
  private readonly hp = new Vector3(); private readonly hq = new Quaternion(); private readonly bendQ = new Quaternion();

  constructor(readonly space: Object3D, readonly bones: readonly Object3D[], options: SpringBoneOptions = {}) {
    if (bones.length < 1) throw new Error("SpringBoneChain needs at least one bone.");
    this.n = bones.length;
    this.offsets = bones.map((_bone, i) => (i + 1 < bones.length ? bones[i + 1].position.clone() : (options.tipOffset?.clone() ?? (i ? bones[i].position.clone() : new Vector3(0, -.1, 0)))));
    this.lengths = this.offsets.map(v => v.length());
    this.tips = bones.map(() => new Vector3()); this.prev = bones.map(() => new Vector3());
    this.animQ = bones.map(() => new Quaternion()); this.simQ = bones.map(() => new Quaternion());
    this.o = { stiffness: options.stiffness ?? 4, drag: options.drag ?? .02, air: options.air ?? 2.2, turbulence: options.turbulence ?? .12, radius: options.radius ?? .04,
      maxBend: options.maxBend ?? Math.PI };
    this.colliders = options.colliders ?? [];
    this.centres = this.colliders.map(() => new Vector3());
  }

  /** Forget the motion (after a cut or a teleport): the chain restarts from the animated pose. */
  reset() { this.started = false; }

  /** Advance by dt. `worldAir` is the air velocity relative to the carrier in world axes (−velocity + wind). */
  update(dt: number, worldAir: Vector3, worldGravity: Vector3) {
    const bones = this.bones, n = this.n, root = bones[0].parent;
    if (!root) return;
    this.space.updateWorldMatrix(true, false);
    this.inv.copy(this.space.matrixWorld).invert();
    root.updateWorldMatrix(true, false);
    this.m.multiplyMatrices(this.inv, root.matrixWorld).decompose(this.rootPos, this.rootQ, this.sc);
    // Into the space's axes and units (a scaled carrier moves fewer of its own units per metre).
    const unit = 1 / this.space.matrixWorld.getMaxScaleOnAxis();
    this.space.getWorldQuaternion(this.spaceQ).invert();
    this.air.copy(worldAir).applyQuaternion(this.spaceQ).multiplyScalar(unit);
    this.gravity.copy(worldGravity).applyQuaternion(this.spaceQ).multiplyScalar(unit);
    for (let i = 0; i < n; i++) this.animQ[i].copy(bones[i].quaternion);
    this.colliders.forEach((c, i) => {
      c.object.updateWorldMatrix(true, false);
      this.centres[i].copy(c.offset).applyMatrix4(c.object.matrixWorld).applyMatrix4(this.inv);
    });
    if (!this.started || dt <= 0) {
      if (!this.started) {
        this.lastRootPos.copy(this.rootPos); this.lastRootQ.copy(this.rootQ);
        this.pose(this.rootPos, this.rootQ, true);
        for (let i = 0; i < n; i++) this.prev[i].copy(this.tips[i]);
        this.started = true;
      }
      this.write();
      return;
    }
    const startAcc = this.accumulator;
    this.accumulator = Math.min(this.accumulator + dt, .1);
    const steps = Math.floor(this.accumulator / STEP);
    for (let k = 1; k <= steps; k++) {
      // The root moves smoothly from last frame's pose to this one across the sub-steps.
      const f = Math.min(1, (k * STEP - startAcc) / Math.max(dt, 1e-6));
      this.hp.lerpVectors(this.lastRootPos, this.rootPos, f); this.hq.slerpQuaternions(this.lastRootQ, this.rootQ, f);
      this.time += STEP;
      this.pose(this.hp, this.hq, false);
    }
    this.accumulator -= steps * STEP;
    this.lastRootPos.copy(this.rootPos); this.lastRootQ.copy(this.rootQ);
    this.write();
  }

  /** One sub-step from the root frame (position, rotation in `space`); with `snap`, place the chain on the animated pose. */
  private pose(rootPos: Vector3, rootQ: Quaternion, snap: boolean) {
    const o = this.o, bones = this.bones;
    this.head.copy(bones[0].position).applyQuaternion(rootQ).add(rootPos);
    this.pq.copy(rootQ);
    const speed = this.air.length(), gust = o.turbulence * speed;
    for (let i = 0; i < this.n; i++) {
      // Animated orientation under the simulated parent, and where it puts this bone's end.
      this.q.copy(this.pq).multiply(this.animQ[i]);
      this.target.copy(this.offsets[i]).applyQuaternion(this.q).add(this.head);
      const tip = this.tips[i], prev = this.prev[i];
      if (snap) tip.copy(this.target);
      else {
        // Inertia, gravity and air drag on the point's own velocity, plus a soft pull toward the animated pose.
        this.v.subVectors(tip, prev).multiplyScalar(1 - o.drag);
        const t = this.time, ph = i * .9;
        this.a.set(Math.sin(t * 5.3 + ph) * .35, Math.sin(t * 7.1 + ph * 1.4) * .7, Math.sin(t * 6.3 + ph * .8) + .4 * Math.sin(t * 13.7 + ph));
        this.a.multiplyScalar(gust).add(this.air).addScaledVector(this.v, -1 / STEP).multiplyScalar(o.air).add(this.gravity);
        prev.copy(tip);
        tip.add(this.v).addScaledVector(this.a, STEP * STEP);
        tip.lerp(this.target, Math.min(1, o.stiffness * STEP));
      }
      // Keep the segment length, then stay outside the colliders.
      for (let pass = 0; pass < 2; pass++) {
        this.dir.subVectors(tip, this.head);
        tip.copy(this.head).addScaledVector(this.dir, this.lengths[i] / (this.dir.length() || 1));
        for (let c = 0; c < this.centres.length; c++) {
          const r = this.colliders[c].radius + o.radius, s = this.dir.subVectors(tip, this.centres[c]), d = s.length();
          if (d < r && d > 1e-6) tip.addScaledVector(s, (r - d) / d);
        }
      }
      // Simulated orientation: the animated one turned by the shortest arc onto the simulated direction, at most maxBend.
      this.want.subVectors(tip, this.head).normalize();
      this.dir.copy(this.offsets[i]).applyQuaternion(this.q).normalize();
      this.arc.setFromUnitVectors(this.dir, this.want);
      const bend = 2 * Math.acos(Math.min(1, Math.abs(this.arc.w)));
      if (bend > o.maxBend) {
        this.bendQ.copy(this.arc);
        this.arc.identity().slerp(this.bendQ, o.maxBend / bend);
        tip.copy(this.dir).applyQuaternion(this.arc).multiplyScalar(this.lengths[i]).add(this.head);
      }
      this.simQ[i].copy(this.arc).multiply(this.q);
      this.pq.copy(this.simQ[i]);
      this.head.copy(tip);
    }
  }

  /** Write local rotations: each bone's simulated orientation relative to its (simulated) parent. */
  private write() {
    let parentQ = this.rootQ;
    for (let i = 0; i < this.n; i++) {
      this.q.copy(parentQ).invert().multiply(this.simQ[i]);
      this.bones[i].quaternion.copy(this.q);
      parentQ = this.simQ[i];
    }
    this.bones[0].updateWorldMatrix(false, true);
  }
}
