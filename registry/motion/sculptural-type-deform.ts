/**
 * Sculptural typography — deformers (registry item `sculptural-type`).
 *
 * Global deformations after Barr ("Global and local deformations of solid primitives", SIGGRAPH 1984): bend, twist and
 * taper, plus squash-and-stretch with constant volume, lean (shear), wave and inflate. Each deformer maps a point
 * and also returns its Jacobian, so a stack composes exactly and normals follow by the cofactor rule
 * n' ∝ cof(J) · n, which stays valid even when a squash flattens a letter almost to nothing.
 *
 * Coordinates are pivot-relative em: x right, y up, z toward the viewer.
 */

export type Deformer =
  /** Curl the letter toward the viewer (positive angle) about a horizontal axis, between heights `from` and `to`. */
  | { kind: "bend"; angle: number; from: number; to: number }
  /** Turn each horizontal slice about the vertical axis by `rate` radians per em of height above `origin`. */
  | { kind: "twist"; rate: number; origin?: number }
  /** Scale width and depth by 1 + rate · (y − origin). */
  | { kind: "taper"; rate: number; origin?: number }
  /** Stretch height by `amount` and thin width and depth by 1/√amount, so the volume stays constant. */
  | { kind: "squash"; amount: number }
  /** Shift x by `rate` · y: an italic lean or an inertial drag. */
  | { kind: "lean"; rate: number }
  /** Displace along `axis` by amplitude · sin(2π · x / wavelength + phase). */
  | { kind: "wave"; amplitude: number; wavelength: number; phase: number; axis?: "y" | "z" }
  /** Scale the raised face (z > 0) by `amount`: 0 is flat paper, 1 the authored relief. */
  | { kind: "inflate"; amount: number }
  /** Scale the depth behind the face edge (z < 0) by `amount`: a deeper or thinner slab. */
  | { kind: "extrude"; amount: number };

/** Row-major 3 × 3 Jacobian, reused. */
type Matrix = Float64Array;

function identity(m: Matrix): void {
  m.fill(0);
  m[0] = 1;
  m[4] = 1;
  m[8] = 1;
}

/** m ← a · m (a and m are 3 × 3, row-major). */
function leftMultiply(a: Matrix, m: Matrix, scratch: Matrix): void {
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) scratch[3 * r + c] = a[3 * r] * m[c] + a[3 * r + 1] * m[3 + c] + a[3 * r + 2] * m[6 + c];
  }
  m.set(scratch);
}

/** Apply one deformer to p (in place) and write its Jacobian into j. */
function applyDeformer(d: Deformer, p: Float64Array, j: Matrix): void {
  identity(j);
  const x = p[0];
  const y = p[1];
  const z = p[2];
  switch (d.kind) {
    case "bend": {
      const span = d.to - d.from;
      if (Math.abs(d.angle) < 1e-9 || span <= 0) return;
      const k = d.angle / span;
      const radius = 1 / k;
      const clamped = Math.min(Math.max(y, d.from), d.to);
      const theta = k * (clamped - d.from);
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const arm = radius - z;
      const extra = y - clamped;
      p[1] = d.from + arm * s + extra * c;
      p[2] = radius - arm * c + extra * s;
      if (y > d.from && y < d.to) {
        j[4] = arm * c * k;
        j[5] = -s;
        j[7] = arm * s * k;
        j[8] = c;
      } else {
        j[4] = c;
        j[5] = -s;
        j[7] = s;
        j[8] = c;
      }
      return;
    }
    case "twist": {
      const theta = d.rate * (y - (d.origin ?? 0));
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      p[0] = x * c - z * s;
      p[2] = x * s + z * c;
      j[0] = c;
      j[1] = (-x * s - z * c) * d.rate;
      j[2] = -s;
      j[6] = s;
      j[7] = (x * c - z * s) * d.rate;
      j[8] = c;
      return;
    }
    case "taper": {
      const scale = 1 + d.rate * (y - (d.origin ?? 0));
      p[0] = x * scale;
      p[2] = z * scale;
      j[0] = scale;
      j[1] = x * d.rate;
      j[7] = z * d.rate;
      j[8] = scale;
      return;
    }
    case "squash": {
      const amount = Math.max(d.amount, 1e-3);
      const thin = 1 / Math.sqrt(amount);
      p[0] = x * thin;
      p[1] = y * amount;
      p[2] = z * thin;
      j[0] = thin;
      j[4] = amount;
      j[8] = thin;
      return;
    }
    case "lean":
      p[0] = x + d.rate * y;
      j[1] = d.rate;
      return;
    case "wave": {
      const omega = (2 * Math.PI) / Math.max(d.wavelength, 1e-6);
      const offset = d.amplitude * Math.sin(omega * x + d.phase);
      const derivative = d.amplitude * omega * Math.cos(omega * x + d.phase);
      if (d.axis === "y") {
        p[1] = y + offset;
        j[3] = derivative;
      } else {
        p[2] = z + offset;
        j[6] = derivative;
      }
      return;
    }
    case "inflate":
      if (z > 0) {
        p[2] = z * d.amount;
        j[8] = d.amount;
      }
      return;
    case "extrude":
      if (z < 0) {
        p[2] = z * d.amount;
        j[8] = d.amount;
      }
      return;
  }
}

/** True when the stack changes nothing (empty, or every deformer at its neutral value). */
export function isIdentityStack(stack: readonly Deformer[]): boolean {
  return stack.every((d) => {
    switch (d.kind) {
      case "bend": return Math.abs(d.angle) < 1e-9;
      case "twist": case "taper": case "lean": return Math.abs(d.rate) < 1e-12;
      case "squash": case "inflate": case "extrude": return Math.abs(d.amount - 1) < 1e-9;
      case "wave": return Math.abs(d.amplitude) < 1e-12;
    }
  });
}

/** Reusable scratch for {@link deformInto}, so a frame allocates nothing. */
export interface DeformScratch {
  p: Float64Array;
  total: Matrix;
  step: Matrix;
  tmp: Matrix;
}

export function createDeformScratch(): DeformScratch {
  return { p: new Float64Array(3), total: new Float64Array(9), step: new Float64Array(9), tmp: new Float64Array(9) };
}

/**
 * Deform positions and normals from `source` into `target` arrays. Points are taken relative to `pivot` (em), deformed
 * through the stack in order, and moved back. Normals use the cofactor of the composed Jacobian.
 */
export function deformInto(
  stack: readonly Deformer[], pivot: readonly [number, number, number],
  sourcePositions: Float32Array, sourceNormals: Float32Array,
  targetPositions: Float32Array, targetNormals: Float32Array,
  scratch: DeformScratch = createDeformScratch(),
): void {
  const { p, total, step, tmp } = scratch;
  const count = sourcePositions.length / 3;
  for (let v = 0; v < count; v += 1) {
    const o = 3 * v;
    p[0] = sourcePositions[o] - pivot[0];
    p[1] = sourcePositions[o + 1] - pivot[1];
    p[2] = sourcePositions[o + 2] - pivot[2];
    identity(total);
    for (let i = 0; i < stack.length; i += 1) {
      applyDeformer(stack[i], p, step);
      leftMultiply(step, total, tmp);
    }
    targetPositions[o] = p[0] + pivot[0];
    targetPositions[o + 1] = p[1] + pivot[1];
    targetPositions[o + 2] = p[2] + pivot[2];
    // Cofactor matrix C of J (C = det(J) · J^-T); n' = C · n.
    const a = total[0], b = total[1], c = total[2], d = total[3], e = total[4], f = total[5], g = total[6], h = total[7], k = total[8];
    const nx = sourceNormals[o];
    const ny = sourceNormals[o + 1];
    const nz = sourceNormals[o + 2];
    const cx = (e * k - f * h) * nx + (f * g - d * k) * ny + (d * h - e * g) * nz;
    const cy = (c * h - b * k) * nx + (a * k - c * g) * ny + (b * g - a * h) * nz;
    const cz = (b * f - c * e) * nx + (c * d - a * f) * ny + (a * e - b * d) * nz;
    const length = Math.hypot(cx, cy, cz) || 1;
    targetNormals[o] = cx / length;
    targetNormals[o + 1] = cy / length;
    targetNormals[o + 2] = cz / length;
  }
}
