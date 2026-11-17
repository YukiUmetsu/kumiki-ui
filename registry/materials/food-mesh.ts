/**
 * FOOD1 still-life geometry: triangle meshes for food, vessels and garnish, in millimetres (world Y up, Z towards the
 * camera). Every builder is a parametric surface, so a shape is exact at any size and its normals are smooth.
 *
 * - `lathe`: a solid of revolution from a profile (fruit, buns, bowls, cups, cheese wheels), with ribs and lobes.
 * - `sweep`: a tube along a path (bananas, carrots, sausages, noodles, pretzels, croissant arms, skewers), with a
 *   radius profile, ridges and a flattened section.
 * - `slab`: a star-shaped footprint extruded with a bevelled edge and a height-mapped top (cakes, pizza, tarts,
 *   cheese, slices, flatbreads, sauce pools).
 * - `blade`: a thin, curled leaf or sheet (herbs, lettuce, nori, husks, banana leaf).
 * - `ellipsoid`, `box`: small parts (berries, grains, salt crystals, seeds, droplets).
 *
 * Each vertex keeps its object-space position (`obj`), so solid textures stick to the food when it is moved, and a
 * `u, v` parameter. `transform`, `displace` and `merge` place, roughen and combine meshes.
 */

export type V3 = [number, number, number];

export interface Mesh {
  pos: number[]; nrm: number[]; obj: number[]; uv: number[]; tri: number[];
}

export const emptyMesh = (): Mesh => ({ pos: [], nrm: [], obj: [], uv: [], tri: [] });

/** Smooth vertex normals from the triangles (area-weighted). */
export function computeNormals(m: Mesh): Mesh {
  const n = new Float64Array(m.pos.length);
  for (let t = 0; t < m.tri.length; t += 3) {
    const a = m.tri[t] * 3, b = m.tri[t + 1] * 3, c = m.tri[t + 2] * 3;
    const ux = m.pos[b] - m.pos[a], uy = m.pos[b + 1] - m.pos[a + 1], uz = m.pos[b + 2] - m.pos[a + 2];
    const vx = m.pos[c] - m.pos[a], vy = m.pos[c + 1] - m.pos[a + 1], vz = m.pos[c + 2] - m.pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) { n[i] += nx; n[i + 1] += ny; n[i + 2] += nz; }
  }
  m.nrm = new Array(m.pos.length);
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    m.nrm[i] = n[i] / l; m.nrm[i + 1] = n[i + 1] / l; m.nrm[i + 2] = n[i + 2] / l;
  }
  return m;
}

/**
 * A parametric surface over u (around, 0…1) and v (along, 0…1). Rows whose points all coincide (the poles of a lathe
 * or the closed ends of a tube) collapse to one vertex. The outward side is cross(∂f/∂v, ∂f/∂u).
 */
export function paramSurface(nu: number, nv: number, closeU: boolean, f: (u: number, v: number) => V3): Mesh {
  const m = emptyMesh(), cols = closeU ? nu : nu + 1, rows: number[][] = [];
  for (let j = 0; j <= nv; j++) {
    const v = j / nv, pts: V3[] = [];
    for (let i = 0; i < cols; i++) pts.push(f(i / nu, v));
    let spread = 0;
    for (const p of pts) spread = Math.max(spread, Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1], p[2] - pts[0][2]));
    const row: number[] = [];
    if (spread < 1e-7) {
      const k = m.pos.length / 3;
      m.pos.push(...pts[0]); m.obj.push(...pts[0]); m.uv.push(0.5, v);
      for (let i = 0; i < cols; i++) row.push(k);
    } else for (let i = 0; i < cols; i++) { row.push(m.pos.length / 3); m.pos.push(...pts[i]); m.obj.push(...pts[i]); m.uv.push(i / nu, v); }
    rows.push(row);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const i1 = closeU ? (i + 1) % nu : i + 1, a = rows[j][i], b = rows[j + 1][i], c = rows[j][i1], d = rows[j + 1][i1];
    if (a !== b && a !== c && b !== c) m.tri.push(a, b, c);
    if (c !== b && c !== d && b !== d) m.tri.push(c, b, d);
  }
  return computeNormals(m);
}

export interface LatheOptions {
  /** Segments around (default 64) and along (default 48). */
  nu?: number; nv?: number;
  /** Radial modulation by angle (rad) and height fraction: 1 = no change (ribs, lobes, bulges). */
  modulate?: (theta: number, v: number) => number;
  /** Squash the section into an ellipse: depth (Z) relative to width (X). */
  squash?: number;
}
/** A solid of revolution about Y: `profile(v)` gives [radius, y] for v from 0 (bottom) to 1 (top). */
export function lathe(profile: (v: number) => readonly [number, number], o: LatheOptions = {}): Mesh {
  const sq = o.squash ?? 1;
  return paramSurface(o.nu ?? 64, o.nv ?? 48, true, (u, v) => {
    const [r0, y] = profile(v), th = u * Math.PI * 2, r = r0 * (o.modulate ? o.modulate(th, v) : 1);
    return [r * Math.cos(th), y, r * Math.sin(th) * sq];
  });
}

/** A closed ellipsoid of radii rx, ry, rz (Y up), centred at the origin. */
export const ellipsoid = (rx: number, ry: number, rz: number, nu = 24, nv = 16, modulate?: LatheOptions["modulate"]): Mesh =>
  lathe(v => { const a = -Math.PI / 2 + v * Math.PI; return [Math.cos(a) * rx, Math.sin(a) * ry]; }, { nu, nv, squash: rz / rx, modulate });

/** A box with rounded-off corners (a superellipsoid, exponent `p`: 2 is an ellipsoid, 8 nearly a box). */
export function box(sx: number, sy: number, sz: number, p = 6, nu = 20, nv = 12): Mesh {
  const sp = (x: number) => Math.sign(x) * Math.pow(Math.abs(x), 2 / p);
  return paramSurface(nu, nv, true, (u, v) => {
    const a = -Math.PI / 2 + v * Math.PI, b = u * Math.PI * 2;
    return [sx / 2 * sp(Math.cos(a)) * sp(Math.cos(b)), sy / 2 * sp(Math.sin(a)), sz / 2 * sp(Math.cos(a)) * sp(Math.sin(b))];
  });
}

/** Catmull–Rom points through `pts`, `n` samples in all. */
export function spline(pts: readonly V3[], n: number, closed = false): V3[] {
  const P = closed ? pts : [pts[0], ...pts, pts[pts.length - 1]], segs = closed ? pts.length : pts.length - 1, out: V3[] = [];
  const at = (i: number) => (closed ? P[((i % P.length) + P.length) % P.length] : P[i]);
  for (let k = 0; k < n; k++) {
    const t = closed ? (k / n) * segs : (k / (n - 1)) * segs, s = Math.min(segs - 1, Math.floor(t)), f = t - s;
    const i = closed ? s : s + 1, p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    out.push([0, 1, 2].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * f + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * f * f + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * f * f * f)) as V3);
  }
  return out;
}

export interface SweepOptions {
  /** Segments around the section (default 20) and along the path (default 60). */
  nu?: number; nv?: number;
  /** Radius, mm, at t along the path (0…1) and section angle θ. */
  radius: (t: number, theta: number) => number;
  /** Flatten the section towards the frame's binormal (1 = round). */
  flatten?: number;
  /** A closed loop (rings, bagels, pretzels). */
  closed?: boolean;
  /** A preferred "up" for the section frame (default world Y). */
  up?: V3;
}
/** A tube along `path` (control points, mm). Open tubes close themselves where the radius reaches zero. */
export function sweep(path: readonly V3[], o: SweepOptions): Mesh {
  const nv = o.nv ?? 60, nu = o.nu ?? 20, closed = !!o.closed, flat = o.flatten ?? 1;
  const C = spline(path, closed ? nv : nv + 1, closed), N = C.length;
  const tan = (i: number): V3 => {
    const a = C[closed ? (i - 1 + N) % N : Math.max(0, i - 1)], b = C[closed ? (i + 1) % N : Math.min(N - 1, i + 1)];
    const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d) || 1;
    return [d[0] / l, d[1] / l, d[2] / l];
  };
  // frames: the normal is the "up" vector made perpendicular to the tangent (stable for food lying on a table)
  const up = o.up ?? [0, 1, 0], frames = C.map((_, i) => {
    const T = tan(i);
    let Nn: V3 = [up[0] - T[0] * (up[0] * T[0] + up[1] * T[1] + up[2] * T[2]), up[1] - T[1] * (up[0] * T[0] + up[1] * T[1] + up[2] * T[2]), up[2] - T[2] * (up[0] * T[0] + up[1] * T[1] + up[2] * T[2])];
    let l = Math.hypot(...Nn);
    if (l < 1e-4) { Nn = Math.abs(T[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]; const d = Nn[0] * T[0] + Nn[1] * T[1] + Nn[2] * T[2]; Nn = [Nn[0] - T[0] * d, Nn[1] - T[1] * d, Nn[2] - T[2] * d]; l = Math.hypot(...Nn); }
    Nn = [Nn[0] / l, Nn[1] / l, Nn[2] / l];
    const B: V3 = [T[1] * Nn[2] - T[2] * Nn[1], T[2] * Nn[0] - T[0] * Nn[2], T[0] * Nn[1] - T[1] * Nn[0]];
    return { T, N: Nn, B };
  });
  const sample = (u: number, v: number): V3 => {
    const fi = v * (closed ? N : N - 1), i0 = Math.min(N - 1, Math.floor(fi)), i1 = closed ? (i0 + 1) % N : Math.min(N - 1, i0 + 1), f = fi - Math.floor(fi);
    const c: V3 = [C[i0][0] + (C[i1][0] - C[i0][0]) * f, C[i0][1] + (C[i1][1] - C[i0][1]) * f, C[i0][2] + (C[i1][2] - C[i0][2]) * f];
    const F = frames[f < 0.5 ? i0 : i1], th = -u * Math.PI * 2, r = o.radius(v, -th), cs = Math.cos(th) * r, sn = Math.sin(th) * r * flat;
    return [c[0] + F.N[0] * cs + F.B[0] * sn, c[1] + F.N[1] * cs + F.B[1] * sn, c[2] + F.N[2] * cs + F.B[2] * sn];
  };
  if (!closed) return paramSurface(nu, nv, true, sample);
  // a closed loop: the last row joins the first
  const m = paramSurface(nu, nv - 1, true, (u, v) => sample(u, v * (nv - 1) / nv));
  const first = 0, last = (nv - 1) * nu;
  for (let i = 0; i < nu; i++) { const i1 = (i + 1) % nu; m.tri.push(last + i, first + i, last + i1, last + i1, first + i, first + i1); }
  return computeNormals(m);
}

export interface SlabOptions {
  /** Footprint radius, mm, at angle θ (in the X–Z plane, from +X towards +Z): a star-shaped outline. */
  outline: (theta: number) => number;
  /** The top surface's height, mm, at (x, z) inside the outline (absolute Y). */
  top: (x: number, z: number) => number;
  /** The base height (Y), mm (default 0). */
  bottom?: number;
  /** Edge rounding radius, mm (default 2). */
  bevel?: number;
  nu?: number; nv?: number;
  /** Leave out the side wall (a sheet or a pool: only the top and its rounded edge). */
  noSide?: boolean;
}
/** An extruded footprint: a height-mapped top, a rounded edge and a side wall down to the base. */
export function slab(o: SlabOptions): Mesh {
  const b = o.bevel ?? 2, y0 = o.bottom ?? 0, nv = o.nv ?? 40, nu = o.nu ?? 72;
  // the profile along v: 60% top, 20% bevel, 20% side
  const vt = 0.6, vb = o.noSide ? 1 : 0.8;
  return paramSurface(nu, nv, true, (u, v) => {
    // (clockwise seen from above, so the outward side of cross(∂v, ∂u) is up on the top face)
    const th = (1 - u) * Math.PI * 2, R = Math.max(0.01, o.outline(th)), cx = Math.cos(th), cz = Math.sin(th), inner = Math.max(0, R - b);
    if (v <= vt) {
      const rho = Math.sqrt(v / vt) * inner, x = cx * rho, z = cz * rho;
      return [x, o.top(x, z), z];
    }
    const yEdge = o.top(cx * inner, cz * inner);
    if (v <= vb) {
      const psi = ((v - vt) / (vb - vt)) * Math.PI / 2, hEdge = Math.min(b, Math.max(0.01, yEdge - y0));
      const r = inner + b * Math.sin(psi), y = yEdge - hEdge * (1 - Math.cos(psi));
      return [cx * r, o.noSide ? Math.max(y0, y) : y, cz * r];
    }
    const hEdge = Math.min(b, Math.max(0.01, yEdge - y0)), f = (v - vb) / (1 - vb), y = (yEdge - hEdge) + (y0 - (yEdge - hEdge)) * f;
    return [cx * R, y, cz * R];
  });
}

export interface BladeOptions {
  /** Length along the midrib (mm) and the half-width at s (0 base … 1 tip). */
  length: number; halfWidth: (s: number) => number;
  /** Lift (mm) at s along and w across (−1…1): curl, cupping, ripples. */
  lift?: (s: number, w: number) => number;
  /** Bend of the midrib: lift of the midline at s (mm). */
  bend?: (s: number) => number;
  /** Sheet thickness, mm (default 0.3): the sheet is one surface, shaded from both sides. */
  nu?: number; nv?: number;
}
/** A thin leaf or sheet along +X from the origin, lying in the X–Z plane (Y up). */
export function blade(o: BladeOptions): Mesh {
  const nu = o.nu ?? 12, nv = o.nv ?? 24;
  const m = paramSurface(nu, nv, false, (u, v) => {
    const w = u * 2 - 1, s = v, hw = o.halfWidth(s);
    return [s * o.length, (o.bend?.(s) ?? 0) + (o.lift?.(s, w) ?? 0), w * hw];
  });
  return m;
}

// ---- Transforms ----------------------------------------------------------------------------------------------------------------

export interface Placement {
  /** Scale (uniform or per axis) applied first. */
  scale?: number | V3;
  /** Rotations in degrees about X, then Z, then Y. */
  rx?: number; rz?: number; ry?: number;
  /** Then a translation, mm. */
  at?: V3;
}
/** Place a mesh: scale, rotate (X, Z, then Y) and translate positions; normals rotate with it. Object coordinates stay. */
export function transform(m: Mesh, p: Placement): Mesh {
  const s: V3 = typeof p.scale === "number" ? [p.scale, p.scale, p.scale] : p.scale ?? [1, 1, 1];
  const r = (a = 0) => (a * Math.PI) / 180, cx = Math.cos(r(p.rx)), sx = Math.sin(r(p.rx)), cz = Math.cos(r(p.rz)), sz = Math.sin(r(p.rz)), cy = Math.cos(r(p.ry)), sy = Math.sin(r(p.ry));
  const rot = (x: number, y: number, z: number): V3 => {
    const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
    const x2 = x * cz - y1 * sz, y2 = x * sz + y1 * cz;
    return [x2 * cy + z1 * sy, y2, -x2 * sy + z1 * cy];
  };
  const at = p.at ?? [0, 0, 0], out: Mesh = { pos: new Array(m.pos.length), nrm: new Array(m.nrm.length), obj: m.obj.slice(), uv: m.uv.slice(), tri: m.tri.slice() };
  for (let i = 0; i < m.pos.length; i += 3) {
    const q = rot(m.pos[i] * s[0], m.pos[i + 1] * s[1], m.pos[i + 2] * s[2]);
    out.pos[i] = q[0] + at[0]; out.pos[i + 1] = q[1] + at[1]; out.pos[i + 2] = q[2] + at[2];
    // normals under a non-uniform scale: the inverse-transpose (divide by the scale), then rotate
    const nq = rot(m.nrm[i] / s[0], m.nrm[i + 1] / s[1], m.nrm[i + 2] / s[2]), l = Math.hypot(...nq) || 1;
    out.nrm[i] = nq[0] / l; out.nrm[i + 1] = nq[1] / l; out.nrm[i + 2] = nq[2] / l;
  }
  return out;
}

/** Move each vertex along its normal by `d(obj, pos, normal)` mm, then recompute normals (asymmetry, lumps, bruises). */
export function displace(m: Mesh, d: (o: V3, p: V3, n: V3) => number): Mesh {
  const out: Mesh = { ...m, pos: m.pos.slice() };
  for (let i = 0; i < m.pos.length; i += 3) {
    const o: V3 = [m.obj[i], m.obj[i + 1], m.obj[i + 2]], p: V3 = [m.pos[i], m.pos[i + 1], m.pos[i + 2]], n: V3 = [m.nrm[i], m.nrm[i + 1], m.nrm[i + 2]], k = d(o, p, n);
    out.pos[i] += n[0] * k; out.pos[i + 1] += n[1] * k; out.pos[i + 2] += n[2] * k;
  }
  return computeNormals(out);
}

/** Bend a mesh's positions with a function (world space), then recompute normals. */
export function warp(m: Mesh, f: (p: V3) => V3): Mesh {
  const out: Mesh = { ...m, pos: m.pos.slice() };
  for (let i = 0; i < m.pos.length; i += 3) { const q = f([m.pos[i], m.pos[i + 1], m.pos[i + 2]]); out.pos[i] = q[0]; out.pos[i + 1] = q[1]; out.pos[i + 2] = q[2]; }
  return computeNormals(out);
}

/** Offset a mesh's object coordinates (so copies of one shape get different texture). */
export function reseed(m: Mesh, offset: V3): Mesh {
  const obj = m.obj.slice();
  for (let i = 0; i < obj.length; i += 3) { obj[i] += offset[0]; obj[i + 1] += offset[1]; obj[i + 2] += offset[2]; }
  return { ...m, obj };
}

/** Combine meshes into one. */
export function merge(ms: readonly Mesh[]): Mesh {
  const out = emptyMesh();
  for (const m of ms) {
    const base = out.pos.length / 3;
    for (let i = 0; i < m.pos.length; i++) { out.pos.push(m.pos[i]); out.nrm.push(m.nrm[i]); out.obj.push(m.obj[i]); }
    for (let i = 0; i < m.uv.length; i++) out.uv.push(m.uv[i]);
    for (let i = 0; i < m.tri.length; i++) out.tri.push(m.tri[i] + base);
  }
  return out;
}

/** Axis-aligned bounds of a mesh's positions. */
export function bounds(m: Mesh): { min: V3; max: V3 } {
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < m.pos.length; i += 3) for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], m.pos[i + c]); max[c] = Math.max(max[c], m.pos[i + c]); }
  return { min, max };
}

/** A small seeded random stream (mulberry32). */
export function rng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
