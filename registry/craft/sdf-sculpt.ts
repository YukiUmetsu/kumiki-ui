/** Deterministic signed-distance sculpting for crafted organic 3D assets.
 *
 * Sculpt a single continuous surface from smoothly blended anatomical masses
 * (ellipsoids, tapered limbs, rounded boxes), then mesh it with projected
 * surface nets. Unlike a pile of intersecting spheres, the result has one
 * watertight skin, soft muscle transitions, real creases and baked cavity
 * occlusion that drives patina, dirt or glaze pooling.
 *
 * Pure TypeScript: no WebGL, workers, downloads or randomness. The same input
 * always yields the same mesh, so frames remain reproducible for export.
 */
import { BufferAttribute, BufferGeometry } from "three";

export type Vec3 = readonly [number, number, number];
/** Signed distance: negative inside, positive outside, roughly 1-Lipschitz. */
export type Sdf = (x: number, y: number, z: number) => number;

// ---------------------------------------------------------------- primitives

export function sphere(center: Vec3, radius: number): Sdf {
  const [cx, cy, cz] = center;
  return (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - radius;
}

/** Row-major 3×3 rotation from XYZ Euler radians (applied X, then Y, then Z). */
function rotationMatrix([ax, ay, az]: Vec3): number[] {
  const [sx, cx, sy, cy, sz, cz] = [Math.sin(ax), Math.cos(ax), Math.sin(ay),
    Math.cos(ay), Math.sin(az), Math.cos(az)];
  return [
    cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz,
    cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz,
    -sy, sx * cy, cx * cy,
  ];
}

/** Oriented ellipsoid (Quilez bound). `rotation` is XYZ Euler radians. */
export function ellipsoid(center: Vec3, radii: Vec3, rotation: Vec3 = [0, 0, 0]): Sdf {
  const [cx, cy, cz] = center, [rx, ry, rz] = radii;
  const m = rotationMatrix(rotation);
  const rotated = rotation.some(value => value !== 0);
  return (x, y, z) => {
    let px = x - cx, py = y - cy, pz = z - cz;
    if (rotated) {
      // Inverse rotation = transpose.
      const qx = m[0] * px + m[3] * py + m[6] * pz;
      const qy = m[1] * px + m[4] * py + m[7] * pz;
      const qz = m[2] * px + m[5] * py + m[8] * pz;
      px = qx; py = qy; pz = qz;
    }
    const k0 = Math.hypot(px / rx, py / ry, pz / rz);
    const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
    return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1;
  };
}

/** Tapered capsule between two points with independent end radii (exact). */
export function roundCone(a: Vec3, b: Vec3, ra: number, rb: number): Sdf {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
  return (x, y, z) => {
    const pax = x - a[0], pay = y - a[1], paz = z - a[2];
    const yy = pax * bax + pay * bay + paz * baz;
    const zz = yy - l2;
    const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
    const x2 = qx * qx + qy * qy + qz * qz;
    const y2 = yy * yy * l2, z2 = zz * zz * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
  };
}

/** Rounded box with optional linear taper of X/Z half-extents along Y. */
export function roundBox(center: Vec3, halfSize: Vec3, radius: number,
  options: { rotation?: Vec3; taper?: number } = {}): Sdf {
  const [cx, cy, cz] = center, [hx, hy, hz] = halfSize;
  const m = rotationMatrix(options.rotation ?? [0, 0, 0]);
  const rotated = (options.rotation ?? [0, 0, 0]).some(value => value !== 0);
  const taper = options.taper ?? 0;
  return (x, y, z) => {
    let px = x - cx, py = y - cy, pz = z - cz;
    if (rotated) {
      const qx = m[0] * px + m[3] * py + m[6] * pz;
      const qy = m[1] * px + m[4] * py + m[7] * pz;
      const qz = m[2] * px + m[5] * py + m[8] * pz;
      px = qx; py = qy; pz = qz;
    }
    // taper > 0 narrows the top: scale is 1 at the base and (1 - taper) at the top.
    const s = 1 - taper * Math.max(0, Math.min(1, (py + hy) / (2 * hy)));
    const dx = Math.abs(px) - (hx * s - radius), dy = Math.abs(py) - (hy - radius);
    const dz = Math.abs(pz) - (hz * s - radius);
    const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0));
    return outside + Math.min(Math.max(dx, dy, dz), 0) - radius;
  };
}

/** One horizontal cross-section of a vertical loft. */
export interface LoftSection {
  y: number;
  /** Half-width along X. */
  w: number;
  /** Extent toward +Z (front) and toward -Z (back), measured from `z`. */
  front: number;
  back: number;
  /** Section center (default 0). */
  x?: number;
  z?: number;
  /** Superellipse exponent: 2 = ellipse, 3–4 = squared (tailored shoulders, boxes). */
  n?: number;
}

/**
 * Vertical loft through horizontal superellipse sections, Catmull-Rom interpolated.
 * This is how character modelers block bodies and heads: author a width/depth
 * profile at a handful of measured heights instead of piling up blobs.
 * Sections must be sorted by ascending y. Ends are capped flat with `capRound` fillets.
 */
export function loftY(sections: readonly LoftSection[], capRound = .004): Sdf {
  if (sections.length < 2) throw new Error("loftY needs at least two sections.");
  for (let i = 1; i < sections.length; i++)
    if (!(sections[i].y > sections[i - 1].y)) throw new Error("loftY sections must have strictly increasing y.");
  const keys = ["w", "front", "back", "x", "z", "n"] as const;
  const value = (s: LoftSection, k: (typeof keys)[number]) => k === "x" ? s.x ?? 0 : k === "z" ? s.z ?? 0 : k === "n" ? s.n ?? 2 : s[k];
  const y0 = sections[0].y, y1 = sections[sections.length - 1].y;
  const sample = (y: number, out: Record<(typeof keys)[number], number>) => {
    let i = 0;
    while (i < sections.length - 2 && y > sections[i + 1].y) i++;
    const a = sections[i], b = sections[i + 1];
    const pa = sections[Math.max(0, i - 1)], pb = sections[Math.min(sections.length - 1, i + 2)];
    const h = b.y - a.y, t = Math.max(0, Math.min(1, (y - a.y) / h));
    const t2 = t * t, t3 = t2 * t;
    for (const k of keys) {
      const va = value(a, k), vb = value(b, k);
      // Non-uniform Catmull-Rom tangents, scaled to this segment.
      const ma = (vb - value(pa, k)) / Math.max(1e-9, b.y - pa.y) * h;
      const mb = (value(pb, k) - va) / Math.max(1e-9, pb.y - a.y) * h;
      out[k] = (2 * t3 - 3 * t2 + 1) * va + (t3 - 2 * t2 + t) * ma + (-2 * t3 + 3 * t2) * vb + (t3 - t2) * mb;
    }
  };
  const s = { w: 0, front: 0, back: 0, x: 0, z: 0, n: 2 };
  return (x, y, z) => {
    sample(Math.max(y0, Math.min(y1, y)), s);
    const w = Math.max(1e-4, s.w), front = Math.max(1e-4, s.front), back = Math.max(1e-4, s.back);
    const dz = z - s.z, nx = Math.abs(x - s.x) / w, nz = dz > 0 ? dz / front : -dz / back;
    const r = Math.pow(Math.pow(nx, s.n) + Math.pow(nz, s.n), 1 / s.n);
    // Conservative distance: scale by the smaller semi-axis in this quadrant.
    const side = (r - 1) * Math.min(w, dz > 0 ? front : back);
    const cap = Math.max(y0 - y, y - y1);
    const qx = Math.max(side + capRound, 0), qy = Math.max(cap + capRound, 0);
    return Math.hypot(qx, qy) + Math.min(Math.max(side + capRound, cap + capRound), 0) - capRound;
  };
}

/** Torus lying in the XZ plane around `center`. */
export function torus(center: Vec3, major: number, minor: number): Sdf {
  const [cx, cy, cz] = center;
  return (x, y, z) => Math.hypot(Math.hypot(x - cx, z - cz) - major, y - cy) - minor;
}

/** Smoothly blended tapered tube through control points: limbs, horns, tails. */
export function chain(points: readonly Vec3[], radii: readonly number[], blend = .04): Sdf {
  if (points.length < 2 || radii.length !== points.length)
    throw new Error("SDF chain needs at least two points and one radius per point.");
  const parts = points.slice(1).map((point, index) =>
    roundCone(points[index], point, radii[index], radii[index + 1]));
  return smoothUnion(blend, ...parts);
}

// ---------------------------------------------------------------- operators

/** Polynomial smooth minimum; `k` is the blend radius in world units. */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * .25;
}

export function smoothUnion(k: number, ...shapes: Sdf[]): Sdf {
  if (!shapes.length) throw new Error("smoothUnion needs at least one shape.");
  if (shapes.length === 1) return shapes[0];
  return (x, y, z) => {
    let d = shapes[0](x, y, z);
    for (let i = 1; i < shapes.length; i++) d = smin(d, shapes[i](x, y, z), k);
    return d;
  };
}

export function union(...shapes: Sdf[]): Sdf {
  return smoothUnion(0, ...shapes);
}

/** Carve `cutter` from `base` with a soft fillet of radius `k`. */
export function smoothSubtract(k: number, base: Sdf, cutter: Sdf): Sdf {
  return (x, y, z) => -smin(-base(x, y, z), cutter(x, y, z), k);
}

export function intersect(a: Sdf, b: Sdf): Sdf {
  return (x, y, z) => Math.max(a(x, y, z), b(x, y, z));
}

/** Bilateral symmetry about the XZ… plane z = 0: author one side only. */
export function mirrorZ(shape: Sdf): Sdf {
  return (x, y, z) => shape(x, y, Math.abs(z));
}

/** Bilateral symmetry about x = 0 (for figures facing ±Z): author the +X side. */
export function mirrorX(shape: Sdf): Sdf {
  return (x, y, z) => shape(Math.abs(x), y, z);
}

/** Flatten everything below `height`, e.g. hooves resting on a plinth. */
export function clipBelow(shape: Sdf, height: number): Sdf {
  return (x, y, z) => Math.max(shape(x, y, z), height - y);
}

/** Add a small surface relief. Keep |amplitude| well below the mesh cell size×3. */
export function displace(shape: Sdf, relief: (x: number, y: number, z: number) => number): Sdf {
  return (x, y, z) => shape(x, y, z) + relief(x, y, z);
}

/** Only evaluate `shape` near its bounding sphere: cheap far-field rejection. */
export function bounded(shape: Sdf, center: Vec3, radius: number): Sdf {
  const [cx, cy, cz] = center;
  return (x, y, z) => {
    const far = Math.hypot(x - cx, y - cy, z - cz) - radius;
    return far > .25 ? far : shape(x, y, z);
  };
}

// ---------------------------------------------------------------- noise

/** Deterministic integer-lattice value noise in [-1, 1], C1-smooth. */
export function valueNoise3(seed = 1) {
  const hash = (i: number, j: number, k: number) => {
    let h = (i * 374761393 + j * 668265263 + k * 1274126177 + seed * 951274213) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h & 0xffff) / 32767.5 - 1;
  };
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x: number, y: number, z: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const x00 = lerp(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx);
    const x10 = lerp(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx);
    const x01 = lerp(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx);
    const x11 = lerp(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx);
    return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
  };
}

export function fbm3(seed = 1, octaves = 4) {
  const noise = valueNoise3(seed);
  return (x: number, y: number, z: number) => {
    let sum = 0, amplitude = .5, frequency = 1;
    for (let i = 0; i < octaves; i++) {
      sum += amplitude * noise(x * frequency, y * frequency, z * frequency);
      amplitude *= .5; frequency *= 2.03;
    }
    return sum;
  };
}

// ---------------------------------------------------------------- meshing

export interface SculptMeshOptions {
  /** Axis-aligned sampling bounds; must enclose the whole surface with margin. */
  min: Vec3;
  max: Vec3;
  /** Grid cell size in world units. Smaller = finer detail, quadratically more vertices. */
  cellSize: number;
  /** Cavity probe distance for baked occlusion (world units). */
  occlusionDistance?: number;
  /**
   * Optional smooth base form used for baked occlusion and curvature. Pass the
   * sculpt *before* fine relief (fur, pitting) so patina and wear follow the
   * anatomy instead of every small bump.
   */
  shadingShape?: Sdf;
  /** Hard safety budget for sampled grid points. */
  maxSamples?: number;
}

export interface SculptMesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  /** 0 = fully occluded crevice, 1 = open surface. Broad + cavity terms. */
  occlusion: Float32Array;
  /** Signed curvature proxy: >0 convex ridges (wear), <0 concave folds (patina). */
  curvature: Float32Array;
  vertexCount: number;
  triangleCount: number;
}

/**
 * Projected surface nets with narrow-band evaluation.
 *
 * 1. Sample the SDF on a coarse lattice (every 4th fine point).
 * 2. Evaluate fine samples only inside coarse cells that can contain surface.
 * 3. Place one vertex per sign-changing cell, project it onto the zero set
 *    with gradient steps, and stitch quads across sign-changing edges.
 * 4. Normals come from the analytic field gradient, not from faceted faces.
 */
export function meshSdf(shape: Sdf, options: SculptMeshOptions): SculptMesh {
  const h = options.cellSize;
  const [x0, y0, z0] = options.min, [x1, y1, z1] = options.max;
  if (!(h > 0) || !(x1 > x0 && y1 > y0 && z1 > z0))
    throw new Error("SDF mesh needs positive cell size and non-empty bounds.");
  const C = 4;
  const fit = (span: number) => Math.ceil(span / (h * C)) * C + 1;
  const nx = fit(x1 - x0), ny = fit(y1 - y0), nz = fit(z1 - z0);
  const total = nx * ny * nz;
  if (total > (options.maxSamples ?? 24_000_000))
    throw new Error(`SDF mesh would sample ${total} points; increase cellSize or shrink bounds.`);
  const idx = (i: number, j: number, k: number) => (k * ny + j) * nx + i;
  const values = new Float32Array(total);
  const known = new Uint8Array(total);

  // Coarse pass.
  const cx = (nx - 1) / C + 1, cy = (ny - 1) / C + 1, cz = (nz - 1) / C + 1;
  const coarse = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    const d = shape(x0 + i * C * h, y0 + j * C * h, z0 + k * C * h);
    coarse[(k * cy + j) * cx + i] = d;
    const fine = idx(i * C, j * C, k * C);
    values[fine] = d; known[fine] = 1;
  }
  // Hierarchical narrow band. A cell whose corners are all far from the surface
  // (relative to its diagonal, with a safety factor for inexact bounds) cannot
  // contain a crossing, so its interior inherits the corner sign. Coarse cells
  // (4h) near the surface are split into 2h mid-cells, and only mid-cells near
  // the surface pay for fine samples.
  const sample = (fi: number, fj: number, fk: number) => {
    const at = idx(fi, fj, fk);
    if (!known[at]) { values[at] = shape(x0 + fi * h, y0 + fj * h, z0 + fk * h); known[at] = 1; }
    return values[at];
  };
  const fill = (i0: number, j0: number, k0: number, size: number, value: number) => {
    for (let kk = 0; kk <= size; kk++) for (let jj = 0; jj <= size; jj++) for (let ii = 0; ii <= size; ii++) {
      const at = idx(i0 + ii, j0 + jj, k0 + kk);
      if (!known[at]) { values[at] = value; known[at] = 1; }
    }
  };
  const far = (i0: number, j0: number, k0: number, size: number, evaluate: boolean) => {
    let minAbs = Infinity, sign = 0;
    for (let c = 0; c < 8; c++) {
      const fi = i0 + (c & 1) * size, fj = j0 + ((c >> 1) & 1) * size, fk = k0 + (c >> 2) * size;
      const d = evaluate ? sample(fi, fj, fk) : values[idx(fi, fj, fk)];
      minAbs = Math.min(minAbs, Math.abs(d)); sign += d > 0 ? 1 : -1;
    }
    return minAbs > size * h * Math.sqrt(3) * 1.12 && Math.abs(sign) === 8 ? (sign > 0 ? minAbs : -minAbs) : 0;
  };
  for (let k = 0; k < cz - 1; k++) for (let j = 0; j < cy - 1; j++) for (let i = 0; i < cx - 1; i++) {
    const i0 = i * C, j0 = j * C, k0 = k * C;
    const coarseFar = far(i0, j0, k0, C, false);
    if (coarseFar) { fill(i0, j0, k0, C, coarseFar); continue; }
    for (let c = 0; c < 8; c++) {
      const mi = i0 + (c & 1) * 2, mj = j0 + ((c >> 1) & 1) * 2, mk = k0 + (c >> 2) * 2;
      const midFar = far(mi, mj, mk, 2, true);
      if (midFar) { fill(mi, mj, mk, 2, midFar); continue; }
      for (let kk = 0; kk <= 2; kk++) for (let jj = 0; jj <= 2; jj++) for (let ii = 0; ii <= 2; ii++) sample(mi + ii, mj + jj, mk + kk);
    }
  }

  // One vertex per sign-changing cell.
  const cellIndex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cellAt = (i: number, j: number, k: number) => (k * (ny - 1) + j) * (nx - 1) + i;
  const positions: number[] = [];
  const corner = new Float32Array(8);
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let inside = 0;
    for (let c = 0; c < 8; c++) {
      corner[c] = values[idx(i + (c & 1), j + ((c >> 1) & 1), k + (c >> 2))];
      if (corner[c] < 0) inside++;
    }
    if (inside === 0 || inside === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      const da = corner[a], db = corner[b];
      if ((da < 0) === (db < 0)) continue;
      const t = da / (da - db);
      sx += (a & 1) + t * ((b & 1) - (a & 1));
      sy += ((a >> 1) & 1) + t * (((b >> 1) & 1) - ((a >> 1) & 1));
      sz += (a >> 2) + t * ((b >> 2) - (a >> 2));
      n++;
    }
    cellIndex[cellAt(i, j, k)] = positions.length / 3;
    positions.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
  }

  // Quads across sign-changing lattice edges.
  const indices: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) indices.push(a, c, b, a, d, c);
    else indices.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = values[idx(i, j, k)], inside = v0 < 0;
    if (i < nx - 1 && inside !== (values[idx(i + 1, j, k)] < 0))
      quad(cellIndex[cellAt(i, j - 1, k - 1)], cellIndex[cellAt(i, j, k - 1)],
        cellIndex[cellAt(i, j, k)], cellIndex[cellAt(i, j - 1, k)], !inside);
    if (j < ny - 1 && inside !== (values[idx(i, j + 1, k)] < 0))
      quad(cellIndex[cellAt(i - 1, j, k - 1)], cellIndex[cellAt(i - 1, j, k)],
        cellIndex[cellAt(i, j, k)], cellIndex[cellAt(i, j, k - 1)], !inside);
    if (k < nz - 1 && inside !== (values[idx(i, j, k + 1)] < 0))
      quad(cellIndex[cellAt(i - 1, j - 1, k)], cellIndex[cellAt(i, j - 1, k)],
        cellIndex[cellAt(i, j, k)], cellIndex[cellAt(i - 1, j, k)], !inside);
  }

  // Project onto the zero set and take smooth normals from the field gradient.
  // Tetrahedral sampling: 4 evaluations give both the gradient and (via their
  // sum) the Laplacian, i.e. a mean-curvature estimate, for free.
  const count = positions.length / 3;
  const pos = new Float32Array(positions), nor = new Float32Array(count * 3);
  const occlusion = new Float32Array(count), curvature = new Float32Array(count);
  const K = [[1, -1, -1], [-1, -1, 1], [-1, 1, -1], [1, 1, 1]];
  const tetraOn = (field: Sdf, x: number, y: number, z: number, e: number, out: number[]) => {
    let gx = 0, gy = 0, gz = 0, sum = 0;
    // Subtract the center value so off-surface probes still measure curvature.
    const center = field === shape ? 0 : field(x, y, z);
    for (const [a, b, c] of K) {
      const d = field(x + a * e, y + b * e, z + c * e) - center;
      gx += a * d; gy += b * d; gz += c * d; sum += d;
    }
    const len = Math.hypot(gx, gy, gz) || 1;
    out[0] = gx / len; out[1] = gy / len; out[2] = gz / len; out[3] = sum;
  };
  const tetra = (x: number, y: number, z: number, e: number, out: number[]) => tetraOn(shape, x, y, z, e, out);
  const g = [0, 0, 0, 0];
  const reach = options.occlusionDistance ?? h * 10;
  const ce = h * 1.5;
  for (let v = 0; v < count; v++) {
    let x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    // One tetrahedral sample at the cell vertex gives the projection direction,
    // the smooth normal and the curvature (the vertex moves < 1 cell).
    const d = shape(x, y, z);
    tetra(x, y, z, ce, g);
    const step = Math.max(-h, Math.min(h, d));
    x -= g[0] * step; y -= g[1] * step; z -= g[2] * step;
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
    nor[v * 3] = g[0]; nor[v * 3 + 1] = g[1]; nor[v * 3 + 2] = g[2];
    if (options.shadingShape) tetraOn(options.shadingShape, x, y, z, ce, g);
    else g[3] -= 4 * d; // Σd_i includes the vertex offset: remove it before the Laplacian.
    const ux = g[0], uy = g[1], uz = g[2];
    const probe = options.shadingShape ?? shape;
    // Σd_i ≈ 2e²·Δd (surface point, d≈0); Δd = 2/R for a sphere of radius R.
    const laplacian = g[3] / (2 * ce * ce);
    curvature[v] = Math.tanh((laplacian - 3) * .05);
    // Baked occlusion: broad ambient term plus fine cavity term (Quilez SDF AO).
    let occ = 0, weight = 1;
    for (let s = 1; s <= 3; s++) {
      const dist = reach * s / 3;
      occ += weight * Math.max(0, dist - probe(x + ux * dist, y + uy * dist, z + uz * dist));
      weight *= .55;
    }
    occlusion[v] = Math.max(0, Math.min(1, 1 - 1.55 * occ / reach));
  }
  return { positions: pos, normals: nor, indices: new Uint32Array(indices), occlusion, curvature,
    vertexCount: count, triangleCount: indices.length / 3 };
}

const meshCache = new Map<string, SculptMesh>();
/**
 * Memoized {@link meshSdf}. Sculpts are deterministic, so remounting a scene
 * (Storybook args, export seeks, StrictMode) reuses CPU-side arrays. Keys must
 * encode every input that changes the shape. Bounded to 24 entries.
 */
export function meshSdfCached(key: string, shape: () => Sdf | { surface: Sdf; shading?: Sdf },
  options: Omit<SculptMeshOptions, "shadingShape">): SculptMesh {
  const full = key + "|" + JSON.stringify(options);
  const hit = meshCache.get(full);
  if (hit) return hit;
  const built = shape();
  const mesh = typeof built === "function" ? meshSdf(built, options)
    : meshSdf(built.surface, { ...options, shadingShape: built.shading });
  if (meshCache.size >= 24) meshCache.delete(meshCache.keys().next().value!);
  meshCache.set(full, mesh);
  return mesh;
}

export interface SculptShading {
  /** Linear RGB base color, roughness multiplier, metalness multiplier. */
  (input: { x: number; y: number; z: number; nx: number; ny: number; nz: number;
    occlusion: number; curvature: number }): readonly [number, number, number, number, number];
}

/**
 * Convert a sculpt mesh to BufferGeometry. With `shade`, writes per-vertex
 * `color` (linear RGB) and `surface` (roughness, metalness multipliers) for
 * use with {@link applyVertexSurface} from `surface-detail`.
 */
export function sculptGeometry(mesh: SculptMesh, shade?: SculptShading,
  options: { planarUv?: { axis: "x" | "y" | "z"; min: [number, number]; size: [number, number] } } = {}): BufferGeometry {
  const geometry = new BufferGeometry();
  // Copy: meshes may be memoized (meshSdfCached) and callers may transform geometry in place.
  geometry.setAttribute("position", new BufferAttribute(mesh.positions.slice(), 3));
  geometry.setAttribute("normal", new BufferAttribute(mesh.normals.slice(), 3));
  geometry.setIndex(new BufferAttribute(mesh.indices.slice(), 1));
  if (shade) {
    const color = new Float32Array(mesh.vertexCount * 3), surface = new Float32Array(mesh.vertexCount * 2);
    for (let v = 0; v < mesh.vertexCount; v++) {
      const [r, g, b, rough, metal] = shade({
        x: mesh.positions[v * 3], y: mesh.positions[v * 3 + 1], z: mesh.positions[v * 3 + 2],
        nx: mesh.normals[v * 3], ny: mesh.normals[v * 3 + 1], nz: mesh.normals[v * 3 + 2],
        occlusion: mesh.occlusion[v], curvature: mesh.curvature[v],
      });
      color[v * 3] = r; color[v * 3 + 1] = g; color[v * 3 + 2] = b;
      surface[v * 2] = rough; surface[v * 2 + 1] = metal;
    }
    geometry.setAttribute("color", new BufferAttribute(color, 3));
    geometry.setAttribute("surface", new BufferAttribute(surface, 2));
  }
  if (options.planarUv) {
    const { axis, min, size } = options.planarUv;
    const [a, b] = axis === "y" ? [0, 2] : axis === "x" ? [2, 1] : [0, 1];
    const uv = new Float32Array(mesh.vertexCount * 2);
    for (let v = 0; v < mesh.vertexCount; v++) {
      uv[v * 2] = (mesh.positions[v * 3 + a] - min[0]) / size[0];
      uv[v * 2 + 1] = (mesh.positions[v * 3 + b] - min[1]) / size[1];
    }
    geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** sRGB hex → linear RGB triple for vertex colors. */
export function linearRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= .04045 ? s / 12.92 : Math.pow((s + .055) / 1.055, 2.4);
  };
  return [toLinear((value >> 16) & 255), toLinear((value >> 8) & 255), toLinear(value & 255)];
}

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
