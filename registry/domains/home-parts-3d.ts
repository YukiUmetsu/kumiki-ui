/** Reusable construction geometry and building components for crafted 3D homes.
 *
 * Generic kit: `createGeometryBatch` (merged meter-UV boxes, lumber and
 * arbitrary geometry with optional vertex color), `extrudeProfile` (any 2D
 * section swept along X with optional angled ends), `thickenPolyline`,
 * `routeGeometry` (orthogonal ducts/pipes with real elbows and joint collars)
 * and `basis` matrices. Components: windows (double-hung or picture), panel
 * doors, sectional garage doors, an outdoor condensing unit with a spinning
 * fan, an air handler, a water heater, an electric meter and PV modules.
 *
 * Components are built in a local frame and own nothing: geometry goes
 * through `res.own`, named parts through `res.name`, materials come from a
 * shared `HomeMaterials`. Units are meters.
 */
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Group, LatheGeometry,
  Matrix4, Mesh, PlaneGeometry, Shape, ShapeUtils, SphereGeometry, TorusGeometry, Vector2, Vector3,
} from "three";
import type { Material, Object3D } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { AssetResources } from "../craft/hero-asset";
import type { HomeMaterials } from "./home-materials-3d";
import type { Vec3 } from "./home-model";

/* ------------------------------------------------------------- utilities */

/** Matrix whose columns are the given axes and translation. */
export function basis(x: Vec3, y: Vec3, z: Vec3, origin: Vec3 = [0, 0, 0]): Matrix4 {
  return new Matrix4().makeBasis(new Vector3(...x), new Vector3(...y), new Vector3(...z)).setPosition(...origin);
}
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3): Vec3 => scale(a, 1 / (length(a) || 1));
/** Any unit vector perpendicular to `a`. */
function perpendicular(a: Vec3): Vec3 {
  const helper: Vec3 = Math.abs(a[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
  return unit(cross(helper, a));
}

/** Rescale a BoxGeometry's per-face UVs from 0–1 to meters (grain along X on long faces). */
function meterBoxUv(g: BoxGeometry, w: number, h: number, d: number, offset: readonly [number, number] = [0, 0]) {
  const uv = g.attributes.uv as BufferAttribute;
  const dims: Array<[number, number]> = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0] + offset[0], uv.getY(i) * dims[f][1] + offset[1]);
  }
  return g;
}

/** Merges many small pieces into one draw call (one material), keeping meter UVs. */
export function createGeometryBatch() {
  const pieces: Array<{ geometry: BufferGeometry; color?: readonly [number, number, number] }> = [];
  let colored = false;
  const api = {
    /** Axis-aligned box of `size` placed by `matrix` (box center at local origin). */
    box(size: Vec3, matrix: Matrix4, options: { uvOffset?: readonly [number, number]; color?: readonly [number, number, number] } = {}) {
      const g = meterBoxUv(new BoxGeometry(size[0], size[1], size[2]), size[0], size[1], size[2], options.uvOffset);
      g.applyMatrix4(matrix);
      if (options.color) colored = true;
      pieces.push({ geometry: g, color: options.color });
      return api;
    },
    /** Box at a center with no rotation. */
    at(size: Vec3, center: Vec3, options?: { uvOffset?: readonly [number, number]; color?: readonly [number, number, number] }) {
      return api.box(size, new Matrix4().makeTranslation(...center), options);
    },
    /** Lumber member from `a` to `b`: grain runs along the member; `section` = [width, depth]; `up` orients depth. */
    member(a: Vec3, b: Vec3, section: readonly [number, number], up: Vec3, uvSeed = 0) {
      const axis = sub(b, a), len = length(axis);
      if (len < 1e-4) return api;
      const x = unit(axis);
      let z = unit(cross(x, up));
      if (!Number.isFinite(z[0]) || length(cross(x, up)) < 1e-6) z = perpendicular(x);
      const y = cross(z, x);
      return api.box([len, section[1], section[0]], basis(x, y, z, scale(add(a, b), .5)), { uvOffset: [uvSeed * 1.37 % 2.4, uvSeed * .61 % .6] });
    },
    geometry(geometry: BufferGeometry, matrix?: Matrix4, color?: readonly [number, number, number]) {
      if (matrix) geometry.applyMatrix4(matrix);
      if (color || geometry.attributes.color) colored = true;
      pieces.push({ geometry, color });
      return api;
    },
    get count() { return pieces.length; },
    /** One merged, non-indexed geometry (null when empty). Consumes the pieces. */
    build(): BufferGeometry | null {
      if (!pieces.length) return null;
      const normalized = pieces.map(({ geometry, color }) => {
        const g = geometry.index ? geometry.toNonIndexed() : geometry;
        if (g !== geometry) geometry.dispose();
        for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(name)) g.deleteAttribute(name);
        if (!g.attributes.uv) g.setAttribute("uv", new BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        if (!g.attributes.normal) g.computeVertexNormals();
        if (colored && !g.attributes.color) {
          const c = color ?? [1, 1, 1], n = g.attributes.position.count, data = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) data.set(c, i * 3);
          g.setAttribute("color", new BufferAttribute(data, 3));
        }
        g.clearGroups();
        return g;
      });
      const merged = mergeGeometries(normalized, false);
      normalized.forEach(g => g.dispose());
      pieces.length = 0;
      if (!merged) throw new Error("Geometry batch could not merge its pieces (incompatible attributes).");
      return merged;
    },
  };
  return api;
}
export type GeometryBatch = ReturnType<typeof createGeometryBatch>;

/**
 * Sweep a closed 2D section (y, z) along X from `x0` to `x1`. Ends may be
 * functions of the section point for angled cuts (rake-cut siding). UVs: u =
 * x in meters, v = distance around the section. Flat-shaded side faces.
 */
export function extrudeProfile(section: readonly (readonly [number, number])[], x0: number | ((y: number, z: number) => number),
  x1: number | ((y: number, z: number) => number), options: { caps?: boolean; shade?: (y: number, z: number) => number } = {}): BufferGeometry {
  const n = section.length;
  if (n < 3) throw new Error("Profile needs at least three points.");
  const start = (p: readonly [number, number]) => typeof x0 === "number" ? x0 : x0(p[0], p[1]);
  const end = (p: readonly [number, number]) => typeof x1 === "number" ? x1 : x1(p[0], p[1]);
  // Signed area decides winding so face normals point outward.
  let area = 0;
  for (let i = 0; i < n; i++) { const a = section[i], b = section[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const ring = area > 0 ? [...section] : [...section].reverse();
  const pos: number[] = [], uv: number[] = [];
  let around = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ax0 = start(a), bx0 = start(b), ax1 = end(a), bx1 = end(b);
    // Quad a0 b0 b1 a1, wound so the normal points away from the section interior.
    const quad = [[ax0, a[0], a[1], ax0, around], [bx0, b[0], b[1], bx0, around + seg], [bx1, b[0], b[1], bx1, around + seg], [ax1, a[0], a[1], ax1, around]];
    for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(quad[k][0], quad[k][1], quad[k][2]); uv.push(quad[k][3], quad[k][4]); }
    around += seg;
  }
  if (options.caps ?? true) {
    const contour = ring.map(p => new Vector2(p[0], p[1]));
    // Normalize every triangle to counter-clockwise in (y, z): its normal is then +X.
    const tris = ShapeUtils.triangulateShape(contour, []).map(t => {
      const [a, b, c] = t.map(k => ring[k]);
      return (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]) >= 0 ? t : [t[0], t[2], t[1]];
    });
    for (const [at, facesPlusX] of [[start, false], [end, true]] as const) {
      for (const t of tris) {
        const order = facesPlusX ? [t[0], t[1], t[2]] : [t[0], t[2], t[1]];
        for (const k of order) { const p = ring[k]; pos.push(at(p), p[0], p[1]); uv.push(p[1], p[0]); }
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  if (options.shade) {
    // Baked occlusion as vertex color (e.g. lap boards darken where they tuck under the next course).
    const color = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) { const k = options.shade(pos[i + 1], pos[i + 2]); color[i] = color[i + 1] = color[i + 2] = k; }
    g.setAttribute("color", new BufferAttribute(color, 3));
  }
  g.computeVertexNormals();
  return g;
}

/** Closed polygon of a polyline thickened by `t` toward its left side (sheet-metal sections). */
export function thickenPolyline(points: readonly (readonly [number, number])[], t: number): Array<[number, number]> {
  const left = (i: number): [number, number] => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l * t, dx / l * t];
  };
  const outer = points.map(p => [p[0], p[1]] as [number, number]);
  const inner = points.map((p, i) => { const o = left(i); return [p[0] + o[0], p[1] + o[1]] as [number, number]; });
  return [...outer, ...inner.reverse()];
}

export interface RouteGeometryOptions {
  radius: number;
  shape: "round" | "rect";
  /** Rect ducts: height/width ratio (default .62). */
  aspect?: number;
  /** Bend radius for round elbows (default 1.6 × radius). */
  bend?: number;
  /** Joint collars every N meters along straights (0 = none). */
  collarEvery?: number;
  /** Collar oversize relative to radius (default 1.12). */
  collar?: number;
  radialSegments?: number;
}
/** Orthogonal duct or pipe along a polyline: straights, real elbows and joint collars. */
export function routeGeometry(points: readonly Vec3[], options: RouteGeometryOptions): BufferGeometry {
  const { radius: r, shape } = options;
  const batch = createGeometryBatch();
  const seg = options.radialSegments ?? (r > .05 ? 24 : 12);
  const bend = shape === "round" ? options.bend ?? r * 1.6 : 0;
  const collarK = options.collar ?? 1.12;
  const aspect = options.aspect ?? .62;
  const dirs = points.slice(1).map((p, i) => unit(sub(p, points[i])));
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1], dir = dirs[i], len = length(sub(b, a));
    const trimA = i > 0 ? bend : 0, trimB = i < points.length - 2 ? bend : 0;
    const extA = shape === "rect" && i > 0 ? r : 0, extB = shape === "rect" && i < points.length - 2 ? r : 0;
    const s = add(a, scale(dir, trimA - extA)), e = sub(b, scale(dir, trimB - extB));
    const segLen = length(sub(e, s));
    if (segLen < 1e-4) continue;
    const mid = scale(add(s, e), .5);
    // Orient the cross-section consistently: depth axis is world-up unless the run is vertical.
    const side = Math.abs(dir[1]) > .9 ? [1, 0, 0] as Vec3 : unit(cross([0, 1, 0], dir));
    const upAxis = cross(side, dir);
    if (shape === "rect") batch.box([segLen, r * 2 * aspect, r * 2], basis(dir, upAxis, side, mid));
    else {
      const cyl = new CylinderGeometry(r, r, segLen, seg, 1, true);
      batch.geometry(cyl, basis(side, dir, cross(side, dir), mid));
    }
    const every = options.collarEvery ?? 0;
    if (every > 0) for (let d = every; d < len - every * .3; d += every) {
      const c = add(a, scale(dir, d));
      if (length(sub(c, s)) < .05 || length(sub(c, e)) < .05) continue;
      if (shape === "rect") batch.box([.03, r * 2 * aspect * 1.06, r * 2 * 1.06], basis(dir, upAxis, side, c));
      else batch.geometry(new CylinderGeometry(r * collarK, r * collarK, .035, seg), basis(side, dir, cross(side, dir), c));
    }
  }
  if (shape === "round") for (let i = 1; i < points.length - 1; i++) {
    const p = points[i], a = dirs[i - 1], b = dirs[i];
    if (Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) > .99) continue;
    const center = add(sub(p, scale(a, bend)), scale(b, bend));
    const torus = new TorusGeometry(bend, r, seg, 10, Math.PI / 2);
    batch.geometry(torus, basis(scale(b, -1), a, cross(a, b), center));
    // Fitting sockets at both ends of the elbow.
    for (const [at, dir] of [[sub(p, scale(a, bend)), a], [add(p, scale(b, bend)), b]] as const) {
      const sd = perpendicular(dir);
      batch.geometry(new CylinderGeometry(r * collarK, r * collarK, Math.max(.02, r * .9), seg), basis(sd, dir, cross(sd, dir), at));
    }
  }
  const out = batch.build();
  if (!out) throw new Error("Route has no drawable segments.");
  return out;
}

/** Mesh helper: owned geometry, shadows on, named and parented. */
export function meshIn(res: AssetResources, parent: Object3D, geometry: BufferGeometry | null, material: Material, name?: string, shadows = true): Mesh | null {
  if (!geometry) return null;
  const mesh = new Mesh(res.own(geometry), material);
  mesh.castShadow = shadows; mesh.receiveShadow = true;
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}
/** Named group registered as a semantic part. */
export function partGroup(res: AssetResources, parent: Object3D, id: string): Group {
  const g = new Group();
  parent.add(res.name(g, id));
  return g;
}

/* ------------------------------------------------------------ openings */

/** Opening frame in facade coordinates (u along wall, v up, w outward; 0 = siding face). */
export interface OpeningFrame { u0: number; u1: number; v0: number; v1: number; wallDepth: number }

export interface BuiltOpening {
  group: Group;
  /** Animated child (sash, leaf or panel stack), positioned at its pivot. */
  moving: Group;
}

const CASING = .09;

/** Exterior casing, head with drip cap and (windows) a projecting sill. */
function casing(batch: GeometryBatch, f: OpeningFrame, withSill: boolean) {
  const { u0, u1, v0, v1 } = f, t = .024;
  batch.at([CASING, v1 - v0 + (withSill ? .03 : 0) + CASING * .2, t], [u0 - CASING / 2, (v0 + v1) / 2 + (withSill ? -.015 : 0) + CASING * .1, -.02 + t / 2 + .006]);
  batch.at([CASING, v1 - v0 + (withSill ? .03 : 0) + CASING * .2, t], [u1 + CASING / 2, (v0 + v1) / 2 + (withSill ? -.015 : 0) + CASING * .1, -.02 + t / 2 + .006]);
  batch.at([u1 - u0 + CASING * 2 + .03, CASING * 1.25, t + .004], [(u0 + u1) / 2, v1 + CASING * .62, -.02 + t / 2 + .008]);
  batch.at([u1 - u0 + CASING * 2 + .07, .018, .05], [(u0 + u1) / 2, v1 + CASING * 1.25 + .009, -.02 + .03]); // drip cap
  if (withSill) {
    batch.at([u1 - u0 + CASING * 2 + .06, .035, .075], [(u0 + u1) / 2, v0 - .012, .012]);
    batch.at([u1 - u0 + CASING * 2 - .02, .05, .022], [(u0 + u1) / 2, v0 - .052, -.006]); // apron
  }
}

/** Double-hung (lower sash slides up) or fixed picture window. */
export function buildWindow(res: AssetResources, m: HomeMaterials, f: OpeningFrame, style: "double-hung" | "picture", muntins: boolean): BuiltOpening {
  const group = new Group();
  const trimBatch = createGeometryBatch();
  casing(trimBatch, f, true);
  const { u0, u1, v0, v1, wallDepth } = f, W = u1 - u0, H = v1 - v0;
  // Frame: jambs, head and sloped sill through the wall depth.
  const frame = createGeometryBatch(), jamb = .03, depthIn = wallDepth - .015;
  frame.at([jamb, H, depthIn], [u0 + jamb / 2, v0 + H / 2, -depthIn / 2 - .01]);
  frame.at([jamb, H, depthIn], [u1 - jamb / 2, v0 + H / 2, -depthIn / 2 - .01]);
  frame.at([W, jamb, depthIn], [u0 + W / 2, v1 - jamb / 2, -depthIn / 2 - .01]);
  frame.at([W, jamb * 1.3, depthIn], [u0 + W / 2, v0 + jamb * .65, -depthIn / 2 - .01]);
  // Interior stool.
  frame.at([W + .1, .022, .07], [u0 + W / 2, v0 + .011, -wallDepth - .02]);
  meshIn(res, group, trimBatch.build(), m.trim, "casing");
  meshIn(res, group, frame.build(), m.trim, "frame");
  // Outward-facing only: reads as a dim (or lit) room from outside, invisible from inside.
  const glow = new PlaneGeometry(W - .1, H - .1).translate(u0 + W / 2, v0 + H / 2, -wallDepth + .006);
  meshIn(res, group, glow, m.interiorGlow, "interior-light", false);

  const sash = (y0: number, y1: number, w: number, grid: boolean) => {
    const g = new Group(), b = createGeometryBatch(), rail = .055, t = .042, iu0 = u0 + jamb, iu1 = u1 - jamb, sw = iu1 - iu0;
    b.at([rail, y1 - y0, t], [iu0 + rail / 2, (y0 + y1) / 2, w]);
    b.at([rail, y1 - y0, t], [iu1 - rail / 2, (y0 + y1) / 2, w]);
    b.at([sw, rail, t], [iu0 + sw / 2, y1 - rail / 2, w]);
    b.at([sw, rail * 1.25, t], [iu0 + sw / 2, y0 + rail * .62, w]);
    if (grid) {
      b.at([.016, y1 - y0 - rail * 2, t * .7], [iu0 + sw / 2, (y0 + y1) / 2, w]);
      b.at([sw - rail * 2, .016, t * .7], [iu0 + sw / 2, (y0 + y1) / 2 + rail * .1, w]);
    }
    meshIn(res, g, b.build(), m.trim, "sash-frame");
    const pane = new BoxGeometry(sw - rail * 1.6, y1 - y0 - rail * 1.6, .006);
    pane.translate(iu0 + sw / 2, (y0 + y1) / 2 + rail * .06, w);
    meshIn(res, g, pane, m.glass, "glass", false);
    return g;
  };
  let moving: Group;
  if (style === "double-hung") {
    const meet = v0 + jamb * 1.3 + (H - jamb * 2.3) / 2;
    group.add(sash(meet - .02, v1 - jamb, -.045, muntins));
    moving = sash(v0 + jamb * 1.3, meet + .02, -.092, muntins);
  } else {
    moving = sash(v0 + jamb * 1.3, v1 - jamb, -.06, false);
  }
  group.add(moving);
  return { group, moving };
}

/** Six-panel entry door hung on a hinge pivot at u0 (opens inward). */
export function buildDoor(res: AssetResources, m: HomeMaterials, f: OpeningFrame): BuiltOpening {
  const group = new Group();
  const { u0, u1, v0, v1, wallDepth } = f, W = u1 - u0, H = v1 - v0;
  const trimBatch = createGeometryBatch();
  casing(trimBatch, f, false);
  meshIn(res, group, trimBatch.build(), m.trim, "casing");
  const frame = createGeometryBatch(), jamb = .035, depthIn = wallDepth - .015;
  frame.at([jamb, H, depthIn], [u0 + jamb / 2, v0 + H / 2, -depthIn / 2 - .01]);
  frame.at([jamb, H, depthIn], [u1 - jamb / 2, v0 + H / 2, -depthIn / 2 - .01]);
  frame.at([W, jamb, depthIn], [u0 + W / 2, v1 - jamb / 2, -depthIn / 2 - .01]);
  frame.at([W - jamb * 2, .012, .025], [u0 + W / 2, v1 - jamb - .006, -.06]); // stop
  meshIn(res, group, frame.build(), m.trim, "frame");
  const threshold = new BoxGeometry(W + .04, .02, depthIn + .03).translate(u0 + W / 2, v0 + .01, -depthIn / 2 + .005);
  meshIn(res, group, threshold, m.brushed, "threshold");
  const glow = new PlaneGeometry(W - .08, H - .06).translate(u0 + W / 2, v0 + H / 2, -wallDepth - .3);
  meshIn(res, group, glow, m.interiorGlow, "interior-light", false);

  // Leaf in hinge-local coordinates: x from 0 (hinge) to leafW.
  const moving = new Group();
  moving.position.set(u0 + jamb, v0 + .02, -.075);
  const leafW = W - jamb * 2 - .004, leafH = H - jamb - .024, t = .044;
  const leaf = createGeometryBatch();
  leaf.at([leafW, leafH, t], [leafW / 2, leafH / 2, -t / 2 + .022]);
  // Raised panels: 2 small top, 2 tall middle, 2 bottom; beveled fields proud of the stiles.
  const stile = .12, rails = [.2, .22, .2], gapY = [leafH * .1, leafH * .48, leafH * .82];
  const panelH = [leafH * .26, leafH * .3, leafH * .14];
  void rails;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
    const pw = (leafW - stile * 3) / 2, px = stile + col * (pw + stile) + pw / 2, py = gapY[row] + panelH[row] / 2 - (row === 2 ? leafH * .06 : 0);
    const s = new Shape();
    s.moveTo(-pw / 2, -panelH[row] / 2); s.lineTo(pw / 2, -panelH[row] / 2); s.lineTo(pw / 2, panelH[row] / 2); s.lineTo(-pw / 2, panelH[row] / 2); s.closePath();
    const panel = new ExtrudeGeometry(s, { depth: .006, bevelEnabled: true, bevelThickness: .008, bevelSize: .028, bevelSegments: 1, curveSegments: 1 });
    panel.translate(px, py, .022);
    leaf.geometry(panel);
  }
  meshIn(res, moving, leaf.build(), m.door, "leaf");
  // Knob, rose and deadbolt.
  const knobProfile = [new Vector2(0, 0), new Vector2(.03, 0), new Vector2(.03, .008), new Vector2(.012, .014), new Vector2(.01, .045), new Vector2(.028, .055), new Vector2(.03, .075), new Vector2(.02, .088), new Vector2(0, .09)];
  const hardware = createGeometryBatch();
  for (const side of [1, -1]) {
    const knob = new LatheGeometry(knobProfile, 20).rotateX(side * Math.PI / 2);
    hardware.geometry(knob, new Matrix4().makeTranslation(leafW - .075, .95, side > 0 ? .022 + .006 : -.022 - .006));
    const bolt = new CylinderGeometry(.026, .028, .012, 20).rotateX(Math.PI / 2);
    hardware.geometry(bolt, new Matrix4().makeTranslation(leafW - .075, 1.12, side * .028));
  }
  for (const y of [.25, leafH / 2, leafH - .25]) hardware.at([.012, .09, .05], [.006, y, 0]); // hinge knuckles
  meshIn(res, moving, hardware.build(), m.brass, "hardware");
  group.add(moving);
  return { group, moving };
}

/** Four-section insulated garage door; `moving` holds sections indexed by name `section-<i>`. */
export function buildGarageDoor(res: AssetResources, m: HomeMaterials, f: OpeningFrame): BuiltOpening & { sections: Group[]; sectionHeight: number } {
  const group = new Group();
  const { u0, u1, v0, v1, wallDepth } = f, W = u1 - u0, H = v1 - v0;
  const trimBatch = createGeometryBatch();
  casing(trimBatch, f, false);
  meshIn(res, group, trimBatch.build(), m.trim, "casing");
  const jambs = createGeometryBatch();
  jambs.at([.04, H, wallDepth], [u0 + .02, v0 + H / 2, -wallDepth / 2]).at([.04, H, wallDepth], [u1 - .02, v0 + H / 2, -wallDepth / 2]);
  jambs.at([W, .04, wallDepth], [u0 + W / 2, v1 - .02, -wallDepth / 2]);
  meshIn(res, group, jambs.build(), m.trim, "jambs");
  // Tracks run up inside the wall, then curve back under the ceiling.
  const tracks = createGeometryBatch(), trackDepth = 2.6;
  for (const u of [u0 + .06, u1 - .06]) {
    tracks.at([.025, H + .05, .05], [u, v0 + H / 2, -wallDepth - .05]);
    tracks.at([.025, .05, trackDepth], [u, v1 + .18, -wallDepth - .05 - trackDepth / 2 - .2]);
  }
  meshIn(res, group, tracks.build(), m.steel, "tracks");
  const moving = new Group();
  const sections: Group[] = [];
  const n = 4, sh = (H - .02) / n, sw = W - .08;
  for (let i = 0; i < n; i++) {
    const s = new Group(); s.name = `section-${i}`;
    const b = createGeometryBatch();
    b.at([sw, sh - .006, .04], [0, sh / 2, 0]);
    // Embossed raised-panel pattern: 8 panels per section.
    const cols = Math.max(4, Math.round(sw / .55)), pw = sw / cols;
    for (let c = 0; c < cols; c++) {
      b.at([pw - .06, sh - .12, .008], [-sw / 2 + pw * (c + .5), sh / 2, .022]);
      b.at([pw - .1, sh - .17, .006], [-sw / 2 + pw * (c + .5), sh / 2, .028]);
    }
    meshIn(res, s, b.build(), m.trim, "section");
    s.position.set(u0 + W / 2, v0 + .01 + i * sh, -.05);
    moving.add(s); sections.push(s);
  }
  group.add(moving);
  return { group, moving, sections, sectionHeight: sh };
}

/* ------------------------------------------------------------ equipment */

/** Outdoor condensing unit (local: pad center at origin, valve side faces −Z). `fan` spins about +Y. */
export function buildCondenser(res: AssetResources, m: HomeMaterials, size: Vec3 = [.78, .74, .78]): { group: Group; fan: Group } {
  const group = new Group();
  const [w, h, d] = size, padT = .08, base = padT + .02;
  meshIn(res, group, new BoxGeometry(w + .18, padT, d + .18).translate(0, padT / 2, 0), m.paving, "pad");
  const cab = createGeometryBatch();
  // Base pan, corner posts and top cover ring.
  cab.at([w, .07, d], [0, base + .035, 0]);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) cab.at([.05, h - .1, .05], [sx * (w / 2 - .025), base + .07 + (h - .1) / 2, sz * (d / 2 - .025)]);
  const top = new Shape(); top.moveTo(-w / 2, -d / 2); top.lineTo(w / 2, -d / 2); top.lineTo(w / 2, d / 2); top.lineTo(-w / 2, d / 2); top.closePath();
  const hole = new Shape(); hole.absarc(0, 0, Math.min(w, d) * .4, 0, Math.PI * 2, true); top.holes.push(hole);
  cab.geometry(new ExtrudeGeometry(top, { depth: .03, bevelEnabled: false, curveSegments: 48 }).rotateX(-Math.PI / 2), new Matrix4().makeTranslation(0, base + h - .03, 0));
  // Service panel and electrical box on one corner (−Z side, right half).
  cab.at([w * .36, h * .62, .02], [w * .26, base + .1 + h * .31, -d / 2 - .01]);
  meshIn(res, group, cab.build(), m.cabinet, "cabinet");
  const screws = createGeometryBatch();
  for (const [x, y] of [[.12, .16], [.4, .16], [.12, .55], [.4, .55]]) screws.geometry(new CylinderGeometry(.008, .008, .006, 10).rotateX(Math.PI / 2), new Matrix4().makeTranslation(-w / 2 + w * (.5 + x * .5) + .02, base + y, -d / 2 - .022));
  meshIn(res, group, screws.build(), m.brushed, "screws");
  // Coil behind louvered guards on all four faces.
  const coil = createGeometryBatch(), louvers = createGeometryBatch();
  const coilH = h - .2, coilY = base + .08 + coilH / 2;
  for (const [nx, nz, len] of [[0, 1, w], [1, 0, d], [0, -1, w * .55], [-1, 0, d]] as const) {
    const cx = nx * (w / 2 - .04) + (nz < 0 ? -w * .2 : 0), cz = nz * (d / 2 - .04);
    const out: Vec3 = [nx, 0, nz], along = cross([0, 1, 0], out);
    coil.box([len - .1, coilH, .03], basis(along, [0, 1, 0], out, [cx, coilY, cz]));
    const count = Math.floor(coilH / .028);
    // Each louver tilts its top edge outward to shed rain and hide the coil.
    const tilt = new Matrix4().makeRotationX(-.6);
    for (let i = 0; i < count; i++) {
      const y = base + .1 + i * .028 + .014;
      louvers.box([len - .12, .022, .003], basis(along, [0, 1, 0], out, [cx + nx * .022, y, cz + nz * .022]).multiply(tilt));
    }
  }
  meshIn(res, group, coil.build(), m.coil, "coil");
  meshIn(res, group, louvers.build(), m.cabinet, "louvers");
  // Fan guard: concentric rings and radial wires over the opening.
  const guard = createGeometryBatch(), R = Math.min(w, d) * .4, gy = base + h + .012;
  for (let k = 1; k <= 6; k++) guard.geometry(new TorusGeometry(R * k / 6.2, .0035, 6, 64).rotateX(Math.PI / 2), new Matrix4().makeTranslation(0, gy, 0));
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; guard.box([R * 1.02, .006, .006], new Matrix4().makeRotationY(a).setPosition(Math.cos(a) * R * .5, gy, -Math.sin(a) * R * .5)); }
  guard.geometry(new CylinderGeometry(R * .2, R * .22, .04, 32), new Matrix4().makeTranslation(0, gy - .005, 0));
  meshIn(res, group, guard.build(), m.polymer, "fan-guard");
  // Fan: pitched, swept blades on a hub; group origin is the shaft axis.
  const fan = new Group();
  fan.position.set(0, base + h - .08, 0);
  const blades = createGeometryBatch();
  const blade = new Shape();
  blade.moveTo(.05, -.03); blade.bezierCurveTo(R * .5, -.08, R * .9, -.05, R * .95, .02); blade.bezierCurveTo(R * .85, .1, R * .45, .09, .05, .035); blade.closePath();
  for (let k = 0; k < 3; k++) {
    const g = new ExtrudeGeometry(blade, { depth: .004, bevelEnabled: false, curveSegments: 12 });
    g.rotateX(-Math.PI / 2).rotateX(.32); // pitch
    blades.geometry(g, new Matrix4().makeRotationY(k / 3 * Math.PI * 2));
  }
  blades.geometry(new CylinderGeometry(.06, .07, .07, 24));
  meshIn(res, fan, blades.build(), m.polymer, "blades");
  meshIn(res, fan, new CylinderGeometry(.075, .085, .12, 24).translate(0, -.09, 0), m.cabinetDark, "motor");
  group.add(fan);
  // Service valves (liquid and suction) on the −Z face, at the service corner.
  const valves = createGeometryBatch();
  for (const [x, r] of [[-.04, .018], [.04, .012]] as const) {
    valves.geometry(new CylinderGeometry(r * 1.4, r * 1.4, .05, 14).rotateX(Math.PI / 2), new Matrix4().makeTranslation(w / 2 - .13 + x, base + h * .34, -d / 2 - .035));
    valves.geometry(new CylinderGeometry(r * 1.1, r * 1.1, .03, 6), new Matrix4().makeTranslation(w / 2 - .13 + x, base + h * .34 + .035, -d / 2 - .035));
  }
  meshIn(res, group, valves.build(), m.brass, "service-valves");
  return { group, fan };
}

/** Air handler / furnace cabinet (local origin at its center; long axis X when horizontal). */
export function buildAirHandler(res: AssetResources, m: HomeMaterials, size: Vec3): Group {
  const group = new Group();
  const [w, h, d] = size;
  const body = createGeometryBatch();
  body.at([w, h, d], [0, 0, 0]);
  // Access panels proud of the casing with screw rows and a filter slot.
  const vertical = h > w;
  const panelCount = 2;
  for (let i = 0; i < panelCount; i++) {
    const pw = vertical ? w - .06 : (w - .09) / panelCount, ph = vertical ? (h - .09) / panelCount : h - .06;
    const cx = vertical ? 0 : -w / 2 + .03 + pw / 2 + i * (pw + .03), cy = vertical ? -h / 2 + .03 + ph / 2 + i * (ph + .03) : 0;
    body.at([pw, ph, .008], [cx, cy, d / 2 + .004]);
  }
  body.at([vertical ? w + .02 : .05, vertical ? .05 : h + .02, d + .02], [vertical ? 0 : -w / 2 + .025, vertical ? -h * .32 : 0, 0]); // filter rack
  meshIn(res, group, body.build(), m.cabinet, "cabinet");
  const label = new BoxGeometry(.12, .08, .002).translate(vertical ? 0 : w * .22, vertical ? h * .2 : h * .18, d / 2 + .009);
  meshIn(res, group, label, m.label, "rating-plate");
  // Condensate drain trap.
  const drain = createGeometryBatch();
  drain.geometry(new CylinderGeometry(.012, .012, .12, 10).rotateZ(Math.PI / 2), new Matrix4().makeTranslation(vertical ? w / 2 + .06 : w * .3, -h / 2 + .06, d / 2 - .05));
  meshIn(res, group, drain.build(), m.polymer, "drain");
  return group;
}

/** Electric storage water heater (local origin at the floor under the tank). */
export function buildWaterHeater(res: AssetResources, m: HomeMaterials, radius: number, height: number): Group {
  const group = new Group();
  const r = radius;
  const profile = [new Vector2(0, .04), new Vector2(r * .98, .04), new Vector2(r, .07), new Vector2(r, height - .08), new Vector2(r * .97, height - .03), new Vector2(r * .8, height), new Vector2(0, height + .01)];
  meshIn(res, group, new LatheGeometry(profile, 48), m.tank, "jacket");
  meshIn(res, group, new CylinderGeometry(r + .06, r + .06, .04, 40, 1, true).translate(0, .025, 0), m.polymer, "drain-pan");
  meshIn(res, group, new CylinderGeometry(r + .06, r + .06, .004, 40).translate(0, .006, 0), m.polymer, "drain-pan-floor");
  const fittings = createGeometryBatch();
  for (const y of [height * .25, height * .7]) fittings.at([.13, .1, .01], [0, y, r + .002]); // element covers
  fittings.geometry(new CylinderGeometry(.02, .02, .05, 12).rotateZ(Math.PI / 2), new Matrix4().makeTranslation(r + .02, .14, 0)); // drain valve
  for (const x of [-.09, .09]) fittings.geometry(new CylinderGeometry(.018, .018, .1, 14), new Matrix4().makeTranslation(x, height + .05, 0)); // nipples
  meshIn(res, group, fittings.build(), m.brushed, "fittings");
  // Temperature/pressure relief valve with discharge pipe down the side.
  const relief = createGeometryBatch();
  relief.geometry(new CylinderGeometry(.018, .018, .08, 12).rotateZ(Math.PI / 2), new Matrix4().makeTranslation(r + .03, height - .16, 0));
  relief.geometry(new SphereGeometry(.026, 14, 10), new Matrix4().makeTranslation(r + .075, height - .16, 0));
  meshIn(res, group, relief.build(), m.brass, "relief-valve");
  meshIn(res, group, new CylinderGeometry(.013, .013, height - .3, 12).translate(r + .075, (height - .3) / 2 + .1, 0), m.copper, "discharge");
  meshIn(res, group, new BoxGeometry(.16, .22, .002).rotateY(Math.PI / 2).translate(-r - .002, height * .55, 0), m.label, "rating-label");
  return group;
}

/** Utility meter on a socket box with conduit (local: back on the wall at origin, faces +Z). */
export function buildMeter(res: AssetResources, m: HomeMaterials): Group {
  const group = new Group();
  const b = createGeometryBatch();
  b.at([.28, .38, .1], [0, 0, .05]);
  b.geometry(new CylinderGeometry(.1, .1, .03, 32).rotateX(Math.PI / 2), new Matrix4().makeTranslation(0, .04, .115));
  b.geometry(new CylinderGeometry(.016, .016, 1.1, 12), new Matrix4().makeTranslation(0, -.74, .05));
  meshIn(res, group, b.build(), m.steel, "socket");
  meshIn(res, group, new SphereGeometry(.09, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).translate(0, .04, .13), m.meterGlass, "dome", false);
  meshIn(res, group, new CylinderGeometry(.07, .07, .006, 24).rotateX(Math.PI / 2).translate(0, .04, .132), m.label, "dial");
  return group;
}

/** Photovoltaic module (local: centered, glass faces +Y). */
export function buildPvModule(w: number, h: number, batch: { frame: GeometryBatch; glass: GeometryBatch }, matrix: Matrix4) {
  const t = .035;
  batch.frame.box([w, t, .035], new Matrix4().makeTranslation(0, 0, h / 2 - .0175).premultiply(matrix));
  batch.frame.box([w, t, .035], new Matrix4().makeTranslation(0, 0, -h / 2 + .0175).premultiply(matrix));
  batch.frame.box([.035, t, h], new Matrix4().makeTranslation(w / 2 - .0175, 0, 0).premultiply(matrix));
  batch.frame.box([.035, t, h], new Matrix4().makeTranslation(-w / 2 + .0175, 0, 0).premultiply(matrix));
  // Unit UVs on the top face carry the whole cell layout.
  batch.glass.geometry(new BoxGeometry(w - .06, .006, h - .06), new Matrix4().makeTranslation(0, t / 2 - .004, 0).premultiply(matrix));
}
