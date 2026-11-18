/**
 * ARCH1 storybook scenes, part 1: the signed-distance kit that buildings are made of.
 *
 * A scene is a tree of `Node`s. Each node has a distance function (metres; y up, the ground at y = 0) and an
 * axis-aligned bounding box. The renderer (`arch-paint.ts`) marches rays through the tree:
 *
 * - `union` builds a bounding-volume tree, so a ray far from a building costs one box distance, not one call per part;
 * - `cut` subtracts openings (windows, doors, arches) from a solid, so a reveal shows the wall's own material;
 * - `frame` places a building (offset, yaw) and gives it the imperfections of an old building: a forward lean, a
 *   settled corner. Roofs take a `sag` (a ridge that dips in the middle).
 *
 * The winning leaf writes its surface id, its piece tone (one stone, one house's paint) and, for round parts, the
 * centre that its texture wraps round; `queryHit` reads them at a hit. Distances are lower bounds (planes, CSG,
 * gentle warps), which sphere tracing allows.
 */

export type Sdf = (x: number, y: number, z: number) => number;
export interface Node { f: Sdf; lo: [number, number, number]; hi: [number, number, number] }

// ---- What the winning leaf writes (read after a material query) ---------------------------------------------------------------

let M = 0, TN = 0, FR = 0, UC = -1;
/** The surface id, piece tone (0–1), frame id and wrap-centre id of the last winning leaf. */
export const queryHit = (): { mat: number; tone: number; frame: number; wrap: number } => ({ mat: M, tone: TN, frame: FR, wrap: UC });

const BIG = 1e9;
const boxDist = (lo: readonly number[], hi: readonly number[], x: number, y: number, z: number) => {
  const dx = Math.max(lo[0] - x, x - hi[0]), dy = Math.max(lo[1] - y, y - hi[1]), dz = Math.max(lo[2] - z, z - hi[2]);
  const ox = Math.max(dx, 0), oy = Math.max(dy, 0), oz = Math.max(dz, 0);
  return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(dx, dy, dz), 0);
};
export const boxDistance = boxDist;

/** A leaf: a distance function with its box, its surface and its tone. */
export function leaf(f: Sdf, lo: [number, number, number], hi: [number, number, number], mat: number, tone = 0, wrap = -1): Node {
  return { lo, hi, f: (x, y, z) => { M = mat; TN = tone; UC = wrap; FR = 0; return f(x, y, z); } };
}

// ---- Primitives (each returns a leaf) -----------------------------------------------------------------------------------------

/** A box from its centre and half sizes, edges rounded by `r`. */
export function box(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, mat: number, tone = 0, r = 0): Node {
  return leaf((x, y, z) => {
    const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r, qz = Math.abs(z - cz) - hz + r;
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - r;
  }, [cx - hx, cy - hy, cz - hz], [cx + hx, cy + hy, cz + hz], mat, tone);
}
/** A box between two corners. */
export const boxAt = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: number, tone = 0, r = 0) =>
  box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2, mat, tone, r);

const wraps: { x: number; z: number }[] = [];
/** Register a centre that a round part's texture wraps round (cylinders, cones, domes). */
function wrapAt(x: number, z: number) { wraps.push({ x, z }); return wraps.length - 1; }
/** The wrap centres registered so far (the renderer reads them by the hit's `wrap` id). */
export const wrapCentres = () => wraps;
/** Start a new scene: forget the wrap centres of the last one. */
export function resetKit() { wraps.length = 0; }

/** An upright cylinder (towers, columns, chimney pots, barrels). */
export function cylY(cx: number, cz: number, y0: number, y1: number, r: number, mat: number, tone = 0): Node {
  const h = (y1 - y0) / 2, cy = (y0 + y1) / 2;
  return leaf((x, y, z) => {
    const dr = Math.hypot(x - cx, z - cz) - r, dy = Math.abs(y - cy) - h;
    return Math.min(Math.max(dr, dy), 0) + Math.hypot(Math.max(dr, 0), Math.max(dy, 0));
  }, [cx - r, y0, cz - r], [cx + r, y1, cz + r], mat, tone, wrapAt(cx, cz));
}
/** A cylinder lying along x (logs, barrel vaults, round arch cutters seen from the front are `arch`). */
export function cylX(cy: number, cz: number, x0: number, x1: number, r: number, mat: number, tone = 0): Node {
  const h = (x1 - x0) / 2, cx = (x0 + x1) / 2;
  return leaf((x, y, z) => {
    const dr = Math.hypot(y - cy, z - cz) - r, dx = Math.abs(x - cx) - h;
    return Math.min(Math.max(dr, dx), 0) + Math.hypot(Math.max(dr, 0), Math.max(dx, 0));
  }, [x0, cy - r, cz - r], [x1, cy + r, cz + r], mat, tone);
}
/** A cylinder lying along z (wheels, vaults running into the picture). */
export function cylZ(cx: number, cy: number, z0: number, z1: number, r: number, mat: number, tone = 0): Node {
  const h = (z1 - z0) / 2, cz = (z0 + z1) / 2;
  return leaf((x, y, z) => {
    const dr = Math.hypot(x - cx, y - cy) - r, dz = Math.abs(z - cz) - h;
    return Math.min(Math.max(dr, dz), 0) + Math.hypot(Math.max(dr, 0), Math.max(dz, 0));
  }, [cx - r, cy - r, z0], [cx + r, cy + r, z1], mat, tone);
}
/** A sphere. */
export function sphere(cx: number, cy: number, cz: number, r: number, mat: number, tone = 0): Node {
  return leaf((x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - r, [cx - r, cy - r, cz - r], [cx + r, cy + r, cz + r], mat, tone, wrapAt(cx, cz));
}
/** An ellipsoid (tree crowns, haystacks, cushions); a bound, good enough for gentle ratios. */
export function ellipsoid(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, mat: number, tone = 0): Node {
  const m = Math.min(rx, ry, rz);
  return leaf((x, y, z) => {
    const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz, k0 = Math.hypot(px, py, pz);
    return (k0 - 1) * m;
  }, [cx - rx, cy - ry, cz - rz], [cx + rx, cy + ry, cz + rz], mat, tone, wrapAt(cx, cz));
}
/** A leafy clump: an ellipsoid whose skin breaks into lumps and holes (tree crowns, hedges, ivy masses, vines). */
export function clump(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, mat: number, tone = 0, rough = 0.35): Node {
  const m = Math.min(rx, ry, rz), amp = m * rough, f = 2.2 / m, sd = (tone * 1e4) | 0;
  return leaf((x, y, z) => {
    const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz, base = (Math.hypot(px, py, pz) - 1) * m;
    if (base > amp * 1.2) return base - amp;
    const n = lumpNoise(sd, x * f, y * f, z * f) + 0.5 * lumpNoise(sd + 7, x * f * 2.3, y * f * 2.3, z * f * 2.3);
    return (base + n * amp) * 0.62;
  }, [cx - rx - amp, cy - ry - amp, cz - rz - amp], [cx + rx + amp, cy + ry + amp, cz + rz + amp], mat, tone, wrapAt(cx, cz));
}
/** Cheap smooth 3D value noise, −1…1, for leaf clumps. */
function lumpNoise(seed: number, x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = x - xi, v = y - yi, w = z - zi;
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w);
  const h = (a: number, b: number, c: number) => { let k = (seed ^ Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2147483647)) | 0; k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) & 0xffff) / 32767.5 - 1; };
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), su), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), su), sv), l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), su), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), su), sv), sw);
}
/** A capsule between two points (posts, braces, rails, rafters seen in the round). */
export function capsule(ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number, mat: number, tone = 0): Node {
  const ex = bx - ax, ey = by - ay, ez = bz - az, ee = ex * ex + ey * ey + ez * ez || 1;
  return leaf((x, y, z) => {
    const px = x - ax, py = y - ay, pz = z - az, h = Math.min(1, Math.max(0, (px * ex + py * ey + pz * ez) / ee));
    return Math.hypot(px - ex * h, py - ey * h, pz - ez * h) - r;
  }, [Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.min(az, bz) - r], [Math.max(ax, bx) + r, Math.max(ay, by) + r, Math.max(az, bz) + r], mat, tone);
}
/** A square-section beam between two points (braces, rafters, timbers), `w` wide and `t` deep (its depth along `nz` when the beam lies in a wall plane). */
export function beam(ax: number, ay: number, az: number, bx: number, by: number, bz: number, w: number, mat: number, tone = 0): Node {
  // a rounded box swept along the segment: distance in the segment's frame, squared corners kept by a small radius
  const ex = bx - ax, ey = by - ay, ez = bz - az, L = Math.hypot(ex, ey, ez) || 1, ux = ex / L, uy = ey / L, uz = ez / L, h = w / 2;
  // a side axis perpendicular to the beam and to up (or to x when the beam is vertical)
  let sx = -uz, sy = 0, sz = ux; const sl = Math.hypot(sx, sz);
  if (sl < 1e-3) { sx = 1; sy = 0; sz = 0; } else { sx /= sl; sz /= sl; }
  const tx = uy * sz - uz * sy, ty = uz * sx - ux * sz, tz = ux * sy - uy * sx;
  return leaf((x, y, z) => {
    const px = x - ax, py = y - ay, pz = z - az;
    const a = Math.abs(px * ux + py * uy + pz * uz - L / 2) - L / 2, b = Math.abs(px * sx + py * sy + pz * sz) - h, c = Math.abs(px * tx + py * ty + pz * tz) - h;
    return Math.min(Math.max(a, b, c), 0) + Math.hypot(Math.max(a, 0), Math.max(b, 0), Math.max(c, 0));
  }, [Math.min(ax, bx) - w, Math.min(ay, by) - w, Math.min(az, bz) - w], [Math.max(ax, bx) + w, Math.max(ay, by) + w, Math.max(az, bz) + w], mat, tone);
}

/** A frustum or cone standing upright: radius `r0` at `y0`, `r1` at `y1` (spires, kiln roofs, chimney pots, trulli). */
export function coneY(cx: number, cz: number, y0: number, y1: number, r0: number, r1: number, mat: number, tone = 0): Node {
  const h = y1 - y0, slope = (r0 - r1) / h, k = 1 / Math.sqrt(1 + slope * slope), R = Math.max(r0, r1);
  return leaf((x, y, z) => {
    const q = Math.hypot(x - cx, z - cz), yy = y - y0;
    const side = (q - (r0 - slope * yy)) * k, cap = Math.max(-yy, yy - h);
    return Math.max(side, cap);
  }, [cx - R, y0, cz - R], [cx + R, y1, cz + R], mat, tone, wrapAt(cx, cz));
}
/** A solid of revolution: radius `prof(t)` at height y0 + t·(y1 − y0) (onion domes, finials, balusters, bells). `lip` is the profile's steepest |dr/dy| (for a safe step). */
export function revolve(cx: number, cz: number, y0: number, y1: number, prof: (t: number) => number, rMax: number, mat: number, tone = 0, lip = 2): Node {
  const h = y1 - y0, k = 1 / Math.sqrt(1 + lip * lip);
  return leaf((x, y, z) => {
    const t = (y - y0) / h, q = Math.hypot(x - cx, z - cz);
    // beyond its ends the solid is closed by a disc of the end's own radius (not the bounding radius, which left a thin phantom disc)
    if (t < 0 || t > 1) { const re = Math.max(0, prof(t < 0 ? 0 : 1)), dy = t < 0 ? y0 - y : y - y1; return q > re ? Math.hypot(q - re, dy) : dy; }
    return (q - prof(t)) * k;
  }, [cx - rMax, y0, cz - rMax], [cx + rMax, y1, cz + rMax], mat, tone, wrapAt(cx, cz));
}

/** A dome: the top of an ellipsoid above `y0` (radius `r`, rise `h`). */
export function dome(cx: number, y0: number, cz: number, r: number, h: number, mat: number, tone = 0): Node {
  const m = Math.min(r, h);
  return leaf((x, y, z) => {
    const px = (x - cx) / r, py = (y - y0) / h, pz = (z - cz) / r;
    return Math.max((Math.hypot(px, py, pz) - 1) * m, y0 - y);
  }, [cx - r, y0, cz - r], [cx + r, y0 + h, cz + r], mat, tone, wrapAt(cx, cz));
}

// ---- Roofs ---------------------------------------------------------------------------------------------------------------------

export interface RoofSpan {
  /** Footprint of the walls under it. */
  x0: number; x1: number; z0: number; z1: number;
  /** Height of the wall plate (eaves). */
  y: number;
  /** Pitch, degrees. */
  pitch: number;
  /** Overhang beyond the walls at eaves and verges, metres. */
  over?: number;
  /** Roof covering thickness, metres. */
  t?: number;
  /** The ridge runs along x (default) or z. */
  ridge?: "x" | "z";
  /** How far the ridge and eaves dip in the middle (an old roof sags), metres. */
  sag?: number;
}

/** A gabled roof shell over a rectangle (its triangular gable walls are `gableWall`). */
export function gableRoof(s: RoofSpan, mat: number, tone = 0): Node {
  const over = s.over ?? 0.35, t = s.t ?? 0.18, a = (s.pitch * Math.PI) / 180, sn = Math.sin(a), cs = Math.cos(a), along = s.ridge !== "z", sag = s.sag ?? 0;
  const xc = (s.x0 + s.x1) / 2, zc = (s.z0 + s.z1) / 2, hl = (along ? s.x1 - s.x0 : s.z1 - s.z0) / 2 + over, hd = (along ? s.z1 - s.z0 : s.x1 - s.x0) / 2;
  const rise = hd * Math.tan(a), yBot = s.y - over * Math.tan(a) - t;
  return leaf((x, y, z) => {
    const u = along ? x - xc : z - zc, v = along ? z - zc : x - xc, w = u / hl;
    const yy = y - s.y + sag * Math.max(0, 1 - w * w);
    const outer = (yy - rise) * cs + Math.abs(v) * sn, inner = outer + t;
    return Math.max(outer, -inner + 0 * t, Math.abs(u) - hl, yBot - (y + sag * Math.max(0, 1 - w * w)), Math.abs(v) - hd - over);
  }, along ? [s.x0 - over, yBot - sag, s.z0 - over] : [s.x0 - over, yBot - sag, s.z0 - over], along ? [s.x1 + over, s.y + rise + t, s.z1 + over] : [s.x1 + over, s.y + rise + t, s.z1 + over], mat, tone);
}
/** The triangular gable walls (and the wall under the roof) of a gabled roof: a solid prism, inset from the roof shell. */
export function gableWall(s: RoofSpan, mat: number, tone = 0): Node {
  const a = (s.pitch * Math.PI) / 180, sn = Math.sin(a), cs = Math.cos(a), along = s.ridge !== "z", sag = s.sag ?? 0;
  const xc = (s.x0 + s.x1) / 2, zc = (s.z0 + s.z1) / 2, hl = (along ? s.x1 - s.x0 : s.z1 - s.z0) / 2, hd = (along ? s.z1 - s.z0 : s.x1 - s.x0) / 2, rise = hd * Math.tan(a);
  return leaf((x, y, z) => {
    const u = along ? x - xc : z - zc, v = along ? z - zc : x - xc, w = u / hl, yy = y - s.y + sag * Math.max(0, 1 - w * w);
    return Math.max((yy - rise) * cs + Math.abs(v) * sn + 0.02, Math.abs(u) - hl, Math.abs(v) - hd, s.y - 0.5 - y);
  }, [s.x0, s.y - 0.5, s.z0], [s.x1, s.y + rise, s.z1], mat, tone);
}
/** A hipped roof (all four sides slope; a pyramid when square). A solid. */
export function hipRoof(s: RoofSpan, mat: number, tone = 0): Node {
  const over = s.over ?? 0.35, a = (s.pitch * Math.PI) / 180, sn = Math.sin(a), cs = Math.cos(a), sag = s.sag ?? 0;
  const xc = (s.x0 + s.x1) / 2, zc = (s.z0 + s.z1) / 2, hx = (s.x1 - s.x0) / 2 + over, hz = (s.z1 - s.z0) / 2 + over, y0 = s.y - over * Math.tan(a);
  const rise = Math.min(hx, hz) * Math.tan(a);
  return leaf((x, y, z) => {
    const u = x - xc, v = z - zc, yy = y - y0 + sag * Math.max(0, 1 - (u / hx) ** 2);
    const pz = (yy - rise) * cs + (Math.abs(v) - hz + Math.min(hx, hz)) * sn, px = (yy - rise) * cs + (Math.abs(u) - hx + Math.min(hx, hz)) * sn;
    return Math.max(pz, px, -yy - (s.t ?? 0.2), Math.abs(u) - hx, Math.abs(v) - hz);
  }, [s.x0 - over, y0 - (s.t ?? 0.2) - sag, s.z0 - over], [s.x1 + over, y0 + rise, s.z1 + over], mat, tone);
}
/** A pyramid or spire with `sides` faces (4 or 8), base half-width `r` at `y0`, apex at `y1`. */
export function spire(cx: number, cz: number, y0: number, y1: number, r: number, sides: 4 | 6 | 8, mat: number, tone = 0, rot = 0): Node {
  const h = y1 - y0, a = Math.atan2(h, r), sn = Math.sin(a), cs = Math.cos(a), step = (Math.PI * 2) / sides;
  // the box must reach the corners (the circumradius, r / cos(π/sides): 1.41 r for a square), or they are clipped off
  const R = r / Math.cos(Math.PI / sides) + 1e-3;
  return leaf((x, y, z) => {
    const px = x - cx, pz = z - cz;
    // the face whose outward normal is nearest this point's direction
    const ang = Math.atan2(pz, px) - rot, k = Math.round(ang / step) * step + rot, d = px * Math.cos(k) + pz * Math.sin(k);
    return Math.max((y - y1) * cs + d * sn, y0 - y);
  }, [cx - R, y0, cz - R], [cx + R, y1, cz + R], mat, tone, wrapAt(cx, cz));
}
/** A mansard: a steep lower slope (`steep`°) up to `y + h1`, then a low hip (`pitch`°). Haussmann's are 45°. */
export function mansard(s: RoofSpan & { h1: number; steep: number }, mat: number, tone = 0): Node {
  const a1 = (s.steep * Math.PI) / 180, inset = s.h1 / Math.tan(a1), xc = (s.x0 + s.x1) / 2, zc = (s.z0 + s.z1) / 2, hx = (s.x1 - s.x0) / 2, hz = (s.z1 - s.z0) / 2;
  const sn = Math.sin(a1), cs = Math.cos(a1);
  const lower = leaf((x, y, z) => {
    const u = Math.abs(x - xc) - hx, v = Math.abs(z - zc) - hz, yy = y - s.y;
    return Math.max(Math.max(u, v) * sn + yy * cs, -yy, yy - s.h1);
  }, [s.x0, s.y, s.z0], [s.x1, s.y + s.h1, s.z1], mat, tone);
  const upper = hipRoof({ ...s, x0: s.x0 + inset, x1: s.x1 - inset, z0: s.z0 + inset, z1: s.z1 - inset, y: s.y + s.h1, over: 0.05 }, mat, tone);
  return union([lower, upper]);
}
/** A lean-to (pent) roof against a wall: the slope falls away from the wall face at `zWall`, toward +z or −z. */
export function pentRoof(x0: number, x1: number, zWall: number, depth: number, yTop: number, pitch: number, mat: number, tone = 0, t = 0.12): Node {
  const a = (pitch * Math.PI) / 180, sn = Math.sin(a), cs = Math.cos(a), dir = Math.sign(depth) || 1, D = Math.abs(depth);
  return leaf((x, y, z) => {
    const v = (z - zWall) * dir, top = (y - yTop) * cs + v * sn;
    return Math.max(top, -top - t, -v, v - D, Math.abs(x - (x0 + x1) / 2) - (x1 - x0) / 2);
  }, [x0, yTop - D * Math.tan(a) - t - 0.1, Math.min(zWall, zWall + depth)], [x1, yTop + 0.05, Math.max(zWall, zWall + depth)], mat, tone);
}

// ---- Openings (cutters) --------------------------------------------------------------------------------------------------------

export type ArchShape = "flat" | "round" | "pointed" | "horseshoe" | "segmental" | "ogee";
/**
 * An opening cut through a wall whose face lies at constant z (`axis` "z") or x (`axis` "x"): width `w`, sill at `y0`,
 * springing at `y0 + hs`, from `d0` to `d1` along the wall's normal. Returned as a distance function to subtract.
 */
/** The 2D distance (negative inside) to an opening's outline in its wall plane: `u` across from its centre, `yy` up from its sill. */
export function openingProfile(u: number, yy: number, r: number, hs: number, shape: ArchShape): number {
  const rectBelow = Math.max(Math.abs(u) - r, -yy, yy - hs);
  if (shape === "flat") return rectBelow;
  if (shape === "round") return Math.min(rectBelow, Math.hypot(u, yy - hs) - r);
  if (shape === "segmental") { const R = (r * r + (r * 0.42) ** 2) / (2 * r * 0.42); return Math.min(rectBelow, Math.max(Math.hypot(u, yy - hs - 0.42 * r + R) - R, hs - yy, Math.abs(u) - r)); }
  if (shape === "pointed") return Math.min(rectBelow, Math.max(Math.hypot(Math.abs(u) + r, yy - hs) - 2 * r, hs - yy));
  if (shape === "horseshoe") { const R = r * 1.15; return Math.min(Math.max(Math.abs(u) - r * 0.92, -yy, yy - hs), Math.hypot(u, yy - hs) - R); }
  const R = r * 0.75; return Math.min(rectBelow, Math.max(Math.hypot(Math.abs(u) + R * 0.4, yy - hs) - R * 1.4, hs - yy));
}
export function opening(c: number, y0: number, w: number, hs: number, shape: ArchShape, d0: number, d1: number, axis: "z" | "x" = "z"): Node {
  const r = w / 2, dm = (d0 + d1) / 2, dh = Math.abs(d1 - d0) / 2;
  const top = shape === "flat" ? hs : shape === "pointed" ? hs + r * 1.73 : shape === "horseshoe" ? hs + r * 1.15 : shape === "segmental" ? hs + r * 0.42 : shape === "ogee" ? hs + r * 1.5 : hs + r;
  const f: Sdf = (x, y, z) => {
    const u = (axis === "z" ? x : z) - c, n = (axis === "z" ? z : x) - dm, yy = y - y0;
    return Math.max(openingProfile(u, yy, r, hs, shape), Math.abs(n) - dh);
  };
  const R = r * 1.2;
  return axis === "z" ? { f, lo: [c - R, y0 - 0.01, Math.min(d0, d1)], hi: [c + R, y0 + top + 0.01, Math.max(d0, d1)] } : { f, lo: [Math.min(d0, d1), y0 - 0.01, c - R], hi: [Math.max(d0, d1), y0 + top + 0.01, c + R] };
}
/**
 * A roll moulding run round an opening's arch: a round section of radius `r` whose centre follows the outline offset by
 * `off` (+ outward into the wall) in the plane at `n` (x for axis "x", z for axis "z"); from the springing up only.
 */
export function archRoll(c: number, y0: number, w: number, hs: number, shape: ArchShape, n: number, off: number, r: number, mat: number, axis: "z" | "x" = "z"): Node {
  const rr = w / 2, top = openingTop(w, hs, shape) + off + r, R = rr + off + r;
  const f: Sdf = (x, y, z) => {
    const u = (axis === "z" ? x : z) - c, nn = (axis === "z" ? z : x) - n, yy = y - y0;
    const d = Math.hypot(openingProfile(u, yy, rr, hs, shape) - off, nn) - r;
    return Math.max(d, y0 + hs - y);
  };
  return axis === "z" ? leaf(f, [c - R, y0 + hs, n - r], [c + R, y0 + top, n + r], mat, 0.15) : leaf(f, [n - r, y0 + hs, c - R], [n + r, y0 + top, c + R], mat, 0.15);
}
/** The height of an opening's top above its sill (springing plus the arch's rise). */
export function openingTop(w: number, hs: number, shape: ArchShape) {
  const r = w / 2;
  return shape === "flat" ? hs : shape === "pointed" ? hs + r * 1.73 : shape === "horseshoe" ? hs + r * 1.15 : shape === "segmental" ? hs + r * 0.42 : shape === "ogee" ? hs + r * 1.5 : hs + r;
}

// ---- Combining -----------------------------------------------------------------------------------------------------------------

const unionBox = (ns: readonly Node[]): [[number, number, number], [number, number, number]] => {
  const lo: [number, number, number] = [BIG, BIG, BIG], hi: [number, number, number] = [-BIG, -BIG, -BIG];
  for (const n of ns) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], n.lo[k]); hi[k] = Math.max(hi[k], n.hi[k]); }
  return [lo, hi];
};
/** Two nodes under one box: the nearer is evaluated first, and the farther only if its box could be closer. */
function pair(a: Node, b: Node): Node {
  const [lo, hi] = unionBox([a, b]);
  return {
    lo, hi, f: (x, y, z) => {
      const ba = boxDist(a.lo, a.hi, x, y, z), bb = boxDist(b.lo, b.hi, x, y, z);
      const first = ba <= bb ? a : b, second = ba <= bb ? b : a, b1 = ba <= bb ? ba : bb, b2 = ba <= bb ? bb : ba;
      // a box distance is a safe bound, but must stay above the march's hit tolerance (0.0005 + 0.0006·t, 0.36 m at 600 m),
      // or far bounding boxes are taken for surfaces
      if (b1 > 1) return b1;
      const d1 = first.f(x, y, z);
      if (d1 <= b2) return d1;
      const m = M, t = TN, fr = FR, uc = UC, d2 = second.f(x, y, z);
      if (d1 <= d2) { M = m; TN = t; FR = fr; UC = uc; return d1; }
      return d2;
    },
  };
}
/** The union of any number of nodes, as a bounding-volume tree (split along the longest axis of their centres). */
export function union(ns: readonly Node[]): Node {
  const list = ns.filter(Boolean);
  if (list.length === 0) return { lo: [0, -BIG, 0], hi: [0, -BIG, 0], f: () => BIG };
  if (list.length === 1) return list[0];
  const c = (n: Node, k: number) => (n.lo[k] + n.hi[k]) / 2;
  const [lo, hi] = unionBox(list.map(n => ({ lo: [c(n, 0), c(n, 1), c(n, 2)], hi: [c(n, 0), c(n, 1), c(n, 2)], f: n.f })));
  const k = [0, 1, 2].reduce((best, a) => (hi[a] - lo[a] > hi[best] - lo[best] ? a : best), 0);
  const sorted = [...list].sort((p, q) => c(p, k) - c(q, k)), mid = sorted.length >> 1;
  return pair(union(sorted.slice(0, mid)), union(sorted.slice(mid)));
}
/** A solid with openings cut from it: the reveals take the solid's surface. */
export function cut(solid: Node, cutters: readonly Node[]): Node {
  if (!cutters.length) return solid;
  const all = cutters.length === 1 ? cutters[0] : unionRaw(cutters);
  return {
    lo: solid.lo, hi: solid.hi, f: (x, y, z) => {
      const d = solid.f(x, y, z);
      const m = M, t = TN, uc = UC, fr = FR;
      if (boxDist(all.lo, all.hi, x, y, z) > Math.max(-d, 0) + 0.02 && d > -0.05) return d;
      const dc = all.f(x, y, z);
      M = m; TN = t; UC = uc; FR = fr;
      return Math.max(d, -dc);
    },
  };
}
/** A union of cutters (no surfaces needed): plain min under one box. */
function unionRaw(ns: readonly Node[]): Node {
  if (ns.length <= 6) {
    const [lo, hi] = unionBox(ns);
    return { lo, hi, f: (x, y, z) => { let d = BIG; for (const n of ns) { if (boxDist(n.lo, n.hi, x, y, z) < d) { const e = n.f(x, y, z); if (e < d) d = e; } } return d; } };
  }
  const c = (n: Node, k: number) => (n.lo[k] + n.hi[k]) / 2, [lo, hi] = unionBox(ns);
  const k = [0, 1, 2].reduce((best, a) => (hi[a] - lo[a] > hi[best] - lo[best] ? a : best), 0);
  const sorted = [...ns].sort((p, q) => c(p, k) - c(q, k)), mid = sorted.length >> 1, a = unionRaw(sorted.slice(0, mid)), b = unionRaw(sorted.slice(mid));
  return { lo, hi, f: (x, y, z) => { const ba = boxDist(a.lo, a.hi, x, y, z), bb = boxDist(b.lo, b.hi, x, y, z); if (Math.min(ba, bb) > 0.25) return Math.min(ba, bb); return Math.min(ba < 0.25 ? a.f(x, y, z) : ba, bb < 0.25 ? b.f(x, y, z) : bb); } };
}
/** Intersect a node with a box (clip a long roof at a party wall, trim a crown). */
export function clip(n: Node, lo: [number, number, number], hi: [number, number, number]): Node {
  const l: [number, number, number] = [Math.max(lo[0], n.lo[0]), Math.max(lo[1], n.lo[1]), Math.max(lo[2], n.lo[2])], h: [number, number, number] = [Math.min(hi[0], n.hi[0]), Math.min(hi[1], n.hi[1]), Math.min(hi[2], n.hi[2])];
  return { lo: l, hi: h, f: (x, y, z) => Math.max(n.f(x, y, z), boxDist(lo, hi, x, y, z)) };
}
/** Repeat a node `count` times along x every `step` metres (windows in a row, columns, crenels, balusters); the node is built at the first copy. */
export function repeatX(n: Node, step: number, count: number): Node {
  if (count <= 1) return n;
  const x0 = (n.lo[0] + n.hi[0]) / 2;
  return { lo: [n.lo[0], n.lo[1], n.lo[2]], hi: [n.hi[0] + step * (count - 1), n.hi[1], n.hi[2]], f: (x, y, z) => {
    const k = Math.min(count - 1, Math.max(0, Math.round((x - x0) / step)));
    return n.f(x - k * step, y, z);
  } };
}
/** Repeat a node `count` times along z. */
export function repeatZ(n: Node, step: number, count: number): Node {
  if (count <= 1) return n;
  const z0 = (n.lo[2] + n.hi[2]) / 2;
  return { lo: [n.lo[0], n.lo[1], n.lo[2]], hi: [n.hi[0], n.hi[1], n.hi[2] + step * (count - 1)], f: (x, y, z) => {
    const k = Math.min(count - 1, Math.max(0, Math.round((z - z0) / step)));
    return n.f(x, y, z - k * step);
  } };
}
/** Repeat a node round a vertical axis `count` times (spokes, columns round a tholos, crenels on a round tower). */
export function repeatAround(n: Node, cx: number, cz: number, count: number, R: number): Node {
  const step = (Math.PI * 2) / count;
  return { lo: [cx - R, n.lo[1], cz - R], hi: [cx + R, n.hi[1], cz + R], f: (x, y, z) => {
    const px = x - cx, pz = z - cz, a = Math.atan2(pz, px), k = Math.round(a / step) * step, c = Math.cos(-k), s = Math.sin(-k);
    return n.f(cx + px * c - pz * s, y, cz + px * s + pz * c);
  } };
}
/** Repeat a node round a horizontal axis along z (a water wheel's paddles and spokes). */
export function repeatWheel(n: Node, cx: number, cy: number, count: number, R: number): Node {
  const step = (Math.PI * 2) / count;
  return { lo: [cx - R, cy - R, n.lo[2]], hi: [cx + R, cy + R, n.hi[2]], f: (x, y, z) => {
    const px = x - cx, py = y - cy, a = Math.atan2(py, px), k = Math.round(a / step) * step, c = Math.cos(-k), s = Math.sin(-k);
    return n.f(cx + px * c - py * s, cy + px * s + py * c, z);
  } };
}

// ---- Frames: placing a building, with its age ---------------------------------------------------------------------------------

export interface Frame {
  /** World position of the local origin. */
  x: number; y: number; z: number;
  /** Turn about the vertical, degrees (a street that bends). */
  yaw: number;
  /** Lean: x and z shear per metre of height (a canal house leans forward a few centimetres per storey; a settled wall). */
  leanX: number; leanZ: number;
}
const frames: Frame[] = [{ x: 0, y: 0, z: 0, yaw: 0, leanX: 0, leanZ: 0 }];
/** The frames registered for the current scene (index 0 is the world). */
export const sceneFrames = () => frames;
/** Start a new scene: forget its frames and wrap centres. */
export function resetScene() { frames.length = 1; resetKit(); }

/** Place a node built in local coordinates into the world. */
export function frame(n: Node, f: Partial<Frame>): Node {
  const fr: Frame = { x: f.x ?? 0, y: f.y ?? 0, z: f.z ?? 0, yaw: f.yaw ?? 0, leanX: f.leanX ?? 0, leanZ: f.leanZ ?? 0 };
  frames.push(fr);
  const id = frames.length - 1, a = (fr.yaw * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), lx = fr.leanX, lz = fr.leanZ;
  const lip = 1 / Math.sqrt(1 + lx * lx + lz * lz);
  // world box: the local box's corners, sheared and turned
  const lo: [number, number, number] = [BIG, BIG, BIG], hi: [number, number, number] = [-BIG, -BIG, -BIG];
  for (const X of [n.lo[0], n.hi[0]]) for (const Y of [n.lo[1], n.hi[1]]) for (const Z of [n.lo[2], n.hi[2]]) {
    const sx = X + lx * Y, sz = Z + lz * Y, wx = fr.x + sx * c - sz * s, wz = fr.z + sx * s + sz * c, wy = fr.y + Y;
    lo[0] = Math.min(lo[0], wx); lo[1] = Math.min(lo[1], wy); lo[2] = Math.min(lo[2], wz); hi[0] = Math.max(hi[0], wx); hi[1] = Math.max(hi[1], wy); hi[2] = Math.max(hi[2], wz);
  }
  return {
    lo, hi, f: (x, y, z) => {
      const px = x - fr.x, pz = z - fr.z, ly = y - fr.y;
      let ux = px * c + pz * s, uz = -px * s + pz * c;
      ux -= lx * ly; uz -= lz * ly;
      const d = n.f(ux, ly, uz) * lip;
      FR = id;
      return d;
    },
  };
}
/** World → local coordinates in a frame (for texturing at a hit). */
export function toLocal(id: number, x: number, y: number, z: number): [number, number, number] {
  const fr = frames[id] ?? frames[0], a = (fr.yaw * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), px = x - fr.x, pz = z - fr.z, ly = y - fr.y;
  return [px * c + pz * s - fr.leanX * ly, ly, -px * s + pz * c - fr.leanZ * ly];
}
/** A world direction turned into a frame's axes. */
export function dirToLocal(id: number, x: number, y: number, z: number): [number, number, number] {
  const fr = frames[id] ?? frames[0], a = (fr.yaw * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
}
/** Reset FR in the world frame for nodes outside any frame (the renderer calls the root through this). */
export function worldRoot(n: Node): Node {
  return { lo: n.lo, hi: n.hi, f: (x, y, z) => { FR = 0; return n.f(x, y, z); } };
}

// ---- Sculpting: organic forms from smoothly blended round cones and ellipsoids --------------------------------------------

/** One stroke of a sculpture: a round cone from `a` (radius r1) to `b` (radius r2), a sphere (no `b`), or an ellipsoid (`e` radii at `a`); `sub` carves it away. */
export interface SculptPrim { a: readonly [number, number, number]; b?: readonly [number, number, number]; r1?: number; r2?: number; e?: readonly [number, number, number]; sub?: boolean; k?: number }
function roundCone(px: number, py: number, pz: number, a: readonly number[], b: readonly number[], r1: number, r2: number): number {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], l2 = bx * bx + by * by + bz * bz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const qx = px - a[0], qy = py - a[1], qz = pz - a[2], y = qx * bx + qy * by + qz * bz, z = y - l2;
  const wx = qx * l2 - bx * y, wy = qy * l2 - by * y, wz = qz * l2 - bz * y, x2 = wx * wx + wy * wy + wz * wz, y2 = y * y * l2, z2 = z * z * l2, k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
const smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
/** A sculpted form: strokes blended with a smooth union of radius `k` (carved strokes subtract smoothly). */
export function sculpt(prims: readonly SculptPrim[], k: number, mat: number, tone = 0): Node {
  const lo: [number, number, number] = [BIG, BIG, BIG], hi: [number, number, number] = [-BIG, -BIG, -BIG];
  for (const p of prims) {
    if (p.sub) continue;
    const r = p.e ? Math.max(...p.e) : Math.max(p.r1 ?? 0, p.r2 ?? 0);
    for (const q of [p.a, p.b ?? p.a]) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], q[i] - r - k); hi[i] = Math.max(hi[i], q[i] + r + k); }
  }
  return leaf((x, y, z) => {
    let d = BIG;
    for (const p of prims) {
      let e: number;
      if (p.e) { const ex = (x - p.a[0]) / p.e[0], ey = (y - p.a[1]) / p.e[1], ez = (z - p.a[2]) / p.e[2]; e = (Math.hypot(ex, ey, ez) - 1) * Math.min(p.e[0], p.e[1], p.e[2]); }
      else if (p.b) e = roundCone(x, y, z, p.a, p.b, p.r1 ?? 0.1, p.r2 ?? p.r1 ?? 0.1);
      else e = Math.hypot(x - p.a[0], y - p.a[1], z - p.a[2]) - (p.r1 ?? 0.1);
      d = p.sub ? -smin(-d, e, p.k ?? k * 0.5) : smin(d, e, p.k ?? k);
    }
    return d * 0.9;
  }, lo, hi, mat, tone);
}
