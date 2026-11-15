/**
 * ANAT1 view: project a (posed) body through a camera into a style-neutral `HumanFrame`.
 *
 * A frame is what any painter needs to draw a believable person in its own medium:
 *   triangles   depth-sorted, front-facing, each with a smooth light value and a tone band (light → shadow)
 *   contours    visible occluding contours (the outline and the inner overlaps), with a line-weight hint
 *   terminators the line where the form turns from light into core shadow
 *   landmarks / joints in screen space, plus the scale (pixels per metre) for head-unit grids
 * Nothing here draws; `anatomy-react.tsx` has reference painters (clay, tonal, line, silhouette).
 */
import type { HumanBody, Vec3 } from "./anatomy-body";

export interface HumanCamera {
  /** Orbit angle in degrees: 0 front, 90 the figure's left side, 180 back, -90 / 270 the right side. */
  yaw?: number;
  /** Degrees above (+) or below (−) the target. */
  pitch?: number;
  /** Screen roll in degrees. */
  roll?: number;
  /** Camera distance in metres for perspective; omit (or Infinity) for an orthographic drawing view. */
  distance?: number;
  /** Look-at point (metres); default the middle of the figure's height. */
  target?: Vec3;
}

export interface HumanViewport {
  width: number; height: number;
  /** Padding in pixels around the fitted figure (default 24). */
  padding?: number;
  /** Fixed scale instead of fitting (for line-ups where every figure must share one scale). */
  pixelsPerMetre?: number;
  /** Where the fixed-scale figure stands: floor line y in pixels (default height − padding). */
  floorY?: number;
  /** With `pixelsPerMetre`: put the camera target at the viewport centre instead of standing on the floor line. */
  centerOnTarget?: boolean;
}

export interface HumanLight { direction: Vec3; ambient?: number }
/** Key light from upper front-left of the viewer, the classic portrait/anatomy setup. */
export const DEFAULT_LIGHT: HumanLight = { direction: [-0.62, 0.58, 0.52], ambient: 0.14 };

export type ToneBand = "highlight" | "light" | "halftone" | "core" | "shadow";
export interface FrameTriangle { a: number; b: number; c: number; depth: number; light: number; band: ToneBand; eye: boolean }
export interface FramePolyline { points: [number, number][]; weight: number[] }

export interface HumanFrame {
  /** Screen x, y and depth (larger = nearer) per point (all points: render, joints, landmarks). */
  screen: Float32Array;
  /** Per render point: smooth n·l (−1…1) and n·v (facing the camera, 0 at the outline). */
  vertexLight: Float32Array;
  vertexFacing: Float32Array;
  /** Index of the first eye point (render points from here on are eyeballs). */
  eyeStart: number;
  triangles: FrameTriangle[];
  contours: FramePolyline[];
  terminators: FramePolyline[];
  landmarks: Record<string, [number, number]>;
  joints: Record<string, { head: [number, number]; tail: [number, number] }>;
  pixelsPerMetre: number;
  /** Projection parameters, for `projectPoint` (props, irises, guides placed in 3D). */
  projection: { right: Vec3; up: Vec3; back: Vec3; target: Vec3; distance: number; scale: number; ox: number; oy: number };
  /** Screen y of the floor under the figure and of the top of the head (rest stature), for head-unit grids. */
  floorY: number;
  bounds: { x0: number; y0: number; x1: number; y1: number };
  width: number; height: number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a: Vec3): Vec3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const rad = (d: number) => (d * Math.PI) / 180;

/** Camera basis: right, up, toward-camera (all unit), and the camera position (perspective only). */
export function cameraBasis(cam: HumanCamera, target: Vec3) {
  const yaw = rad(cam.yaw ?? 0), pitch = rad(cam.pitch ?? 0), roll = rad(cam.roll ?? 0);
  const back: Vec3 = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  let right = nrm(cross([0, 1, 0], back));
  let up = cross(back, right);
  if (roll) { const c = Math.cos(roll), s = Math.sin(roll); const r2: Vec3 = [right[0] * c + up[0] * s, right[1] * c + up[1] * s, right[2] * c + up[2] * s]; up = cross(back, r2); right = r2; }
  const dist = cam.distance && Number.isFinite(cam.distance) ? cam.distance : Infinity;
  const eye: Vec3 = [target[0] + back[0] * (Number.isFinite(dist) ? dist : 0), target[1] + back[1] * (Number.isFinite(dist) ? dist : 0), target[2] + back[2] * (Number.isFinite(dist) ? dist : 0)];
  return { right, up, back, dist, eye };
}

const BANDS: [number, ToneBand][] = [[0.82, "highlight"], [0.55, "light"], [0.3, "halftone"], [0.12, "core"], [-Infinity, "shadow"]];
export const toneBand = (light: number): ToneBand => BANDS.find(([t]) => light >= t)![1];

/**
 * Project points and build the frame. `points` defaults to the body's rest points (pass a posed array).
 * `resolution` is the depth-buffer cell size in pixels used for contour visibility (default 2).
 */
export function renderHumanFrame(body: HumanBody, points: Float32Array = body.points, camera: HumanCamera = {}, viewport: HumanViewport = { width: 600, height: 900 },
  light: HumanLight = DEFAULT_LIGHT, resolution = 2): HumanFrame {
  const c = body.model.header.counts;
  return renderMeshFrame({ points, faces: body.faces, pointCount: c.points, renderCount: body.renderCount, eyeStart: c.body, contourFaces: c.bodyFaces,
    landmarks: body.model.header.landmarks, bones: body.bones }, camera, viewport, light, resolution);
}

/** Any triangle mesh in ANAT1 coordinates (metres, y up, z forward): the body, the face study, a prop. */
export interface MeshSource {
  points: Float32Array; faces: Uint16Array;
  /** Points × 3 in `points` (render points first). */
  pointCount: number;
  /** Points that belong to the surface (the rest are joints/landmarks carried along). */
  renderCount: number;
  /** First render point of the eyes (drawn but not contoured); = renderCount when there are none. */
  eyeStart: number;
  /** Faces [0, contourFaces) get contour and terminator lines. */
  contourFaces: number;
  landmarks: Record<string, number>;
  bones?: readonly { id: string; head: number; tail: number }[];
  /** Draw open-mesh borders as contour (default false; the face mask is open behind the hairline). */
  borders?: boolean;
}

export function renderMeshFrame(src: MeshSource, camera: HumanCamera = {}, viewport: HumanViewport = { width: 600, height: 900 },
  light: HumanLight = DEFAULT_LIGHT, resolution = 2): HumanFrame {
  const points = src.points;
  const n = src.pointCount, rc = src.renderCount, nb = src.eyeStart;
  const body = { faces: src.faces, bones: src.bones ?? [], model: { header: { counts: { bodyFaces: src.contourFaces }, landmarks: src.landmarks } } };
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < rc; i++) { const y = points[i * 3 + 1]; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const target: Vec3 = camera.target ?? [0, (minY + maxY) / 2, 0];
  const { right, up, back, dist } = cameraBasis(camera, target);
  // camera-space projection (unit scale), then fit
  const cam = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p: Vec3 = [points[i * 3] - target[0], points[i * 3 + 1] - target[1], points[i * 3 + 2] - target[2]];
    let x = dot(p, right), y = -dot(p, up); const z = dot(p, back);
    if (Number.isFinite(dist)) { const k = dist / Math.max(0.05, dist - z); x *= k; y *= k; }
    cam[i * 3] = x; cam[i * 3 + 1] = y; cam[i * 3 + 2] = z;
  }
  const pad = viewport.padding ?? 24;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < rc; i++) { const x = cam[i * 3], y = cam[i * 3 + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  let s: number, ox: number, oy: number;
  // floor point (under the target) in camera space, for anchoring
  const floorCam = (() => { const p: Vec3 = [0, minY - target[1], 0]; let y = -dot(p, up); const z = dot(p, back); if (Number.isFinite(dist)) y *= dist / Math.max(0.05, dist - z); return y; })();
  if (viewport.pixelsPerMetre) {
    s = viewport.pixelsPerMetre; ox = viewport.width / 2;
    oy = viewport.centerOnTarget ? viewport.height / 2 : (viewport.floorY ?? viewport.height - pad) - floorCam * s;
  } else {
    s = Math.min((viewport.width - pad * 2) / Math.max(1e-6, x1 - x0), (viewport.height - pad * 2) / Math.max(1e-6, y1 - y0));
    ox = viewport.width / 2 - ((x0 + x1) / 2) * s; oy = viewport.height / 2 - ((y0 + y1) / 2) * s;
  }
  const screen = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { screen[i * 3] = cam[i * 3] * s + ox; screen[i * 3 + 1] = cam[i * 3 + 1] * s + oy; screen[i * 3 + 2] = cam[i * 3 + 2]; }

  // smooth vertex normals (render points)
  const F = body.faces, nf = F.length / 3;
  const vn = new Float32Array(rc * 3);
  const P = (i: number): Vec3 => [points[i * 3], points[i * 3 + 1], points[i * 3 + 2]];
  const faceN: Vec3[] = new Array(nf);
  for (let f = 0; f < nf; f++) {
    const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
    const fnrm = cross(sub(P(b), P(a)), sub(P(c), P(a)));
    faceN[f] = fnrm;
    for (const v of [a, b, c]) { vn[v * 3] += fnrm[0]; vn[v * 3 + 1] += fnrm[1]; vn[v * 3 + 2] += fnrm[2]; }
  }
  const L = nrm(light.direction), amb = light.ambient ?? 0.18;
  const view = (i: number): Vec3 => (Number.isFinite(dist) ? nrm(sub([target[0] + back[0] * dist, target[1] + back[1] * dist, target[2] + back[2] * dist], P(i))) : back);
  const lit = new Float32Array(rc), facing = new Float32Array(rc);
  for (let v = 0; v < rc; v++) {
    const nv = nrm([vn[v * 3], vn[v * 3 + 1], vn[v * 3 + 2]]);
    lit[v] = dot(nv, L); facing[v] = dot(nv, view(v));
  }
  // triangles: front-facing, sorted far → near
  const tris: FrameTriangle[] = [];
  for (let f = 0; f < nf; f++) {
    const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
    const ax = screen[a * 3], ay = screen[a * 3 + 1], bx = screen[b * 3], by = screen[b * 3 + 1], cx = screen[c * 3], cy = screen[c * 3 + 1];
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (area >= 0) continue; // screen y is down: front faces are clockwise here
    const raw = (lit[a] + lit[b] + lit[c]) / 3;
    const lv = Math.max(0, raw) * (1 - amb) + amb;
    tris.push({ a, b, c, depth: (screen[a * 3 + 2] + screen[b * 3 + 2] + screen[c * 3 + 2]) / 3, light: lv, band: toneBand(raw), eye: a >= nb });
  }
  tris.sort((p, q) => p.depth - q.depth);

  // depth buffer for visibility
  const W = Math.ceil(viewport.width / resolution), H = Math.ceil(viewport.height / resolution);
  const zbuf = new Float32Array(W * H).fill(-Infinity);
  for (const t of tris) rasterDepth(zbuf, W, H, resolution, screen, t.a, t.b, t.c);
  // A contour point is visible when the farthest surface in its 3×3 neighbourhood is not in front of it (an uncovered
  // neighbour means the outer silhouette). Hidden contours sit behind a nearer surface across the whole neighbourhood.
  const depthScale = Math.max(1e-6, maxY - minY) * 0.01;
  const visible = (x: number, y: number, z: number) => {
    const gx = Math.floor(x / resolution), gy = Math.floor(y / resolution);
    if (gx < 0 || gy < 0 || gx >= W || gy >= H) return true;
    let far = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = gx + dx, yy = gy + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) return true;
      far = Math.min(far, zbuf[yy * W + xx]);
    }
    return far === -Infinity || z >= far - depthScale;
  };

  // body-only faces for iso-lines (eyes are drawn by their own triangles)
  const nbf = body.model.header.counts.bodyFaces;
  const contours = isoPolylines(F, nbf, facing, screen, (x, y, z) => visible(x, y, z), (v0, v1, t) => 0.55 + 0.9 * (1 - Math.max(0, lit[v0] * (1 - t) + lit[v1] * t)));
  const terminators = isoPolylines(F, nbf, lit, screen, (x, y, z) => visible(x, y, z), () => 1, f => {
    // only where the surface faces the camera
    const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
    return facing[a] > 0.05 && facing[b] > 0.05 && facing[c] > 0.05;
  });

  if (src.borders) {
    // open-mesh border (each edge used by one face), split where hidden
    const count = new Map<number, number>();
    const key = (a: number, b: number) => (a < b ? a * 65536 + b : b * 65536 + a);
    for (let f = 0; f < nbf; f++) for (let e = 0; e < 3; e++) { const k = key(F[f * 3 + e], F[f * 3 + (e + 1) % 3]); count.set(k, (count.get(k) ?? 0) + 1); }
    const adj = new Map<number, number[]>();
    for (const [k, c] of count) if (c === 1) { const a = Math.floor(k / 65536), b = k % 65536; (adj.get(a) ?? adj.set(a, []).get(a)!).push(b); (adj.get(b) ?? adj.set(b, []).get(b)!).push(a); }
    const seen = new Set<number>();
    for (const start of adj.keys()) {
      if (seen.has(start)) continue;
      let cur: FramePolyline | null = null, v = start, prev = -1;
      while (v !== undefined && !seen.has(v)) {
        seen.add(v);
        const x = screen[v * 3], y = screen[v * 3 + 1], z = screen[v * 3 + 2];
        if (facing[v] > -0.2 && visible(x, y, z)) { if (!cur) { cur = { points: [], weight: [] }; contours.push(cur); } cur.points.push([x, y]); cur.weight.push(0.6); } else cur = null;
        const nx: number | undefined = (adj.get(v) ?? []).find(u => u !== prev && !seen.has(u));
        prev = v; v = nx as number;
      }
    }
  }
  // drop micro-loops (eyelids, nostrils, toe creases) that only read as noise at this scale
  const minSize = Math.max(6, (y1 - y0) * s * 0.012);
  const big = (l: FramePolyline) => { let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; for (const [x, y] of l.points) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); } return Math.hypot(b - a, d - c) >= minSize; };
  const keptContours = contours.filter(big), keptTerminators = terminators.filter(big);
  contours.length = 0; contours.push(...keptContours); terminators.length = 0; terminators.push(...keptTerminators);
  const lm: Record<string, [number, number]> = {};
  for (const [name, i] of Object.entries(body.model.header.landmarks)) lm[name] = [screen[i * 3], screen[i * 3 + 1]];
  const joints: HumanFrame["joints"] = {};
  for (const b of body.bones) joints[b.id] = { head: [screen[b.head * 3], screen[b.head * 3 + 1]], tail: [screen[b.tail * 3], screen[b.tail * 3 + 1]] };
  return {
    screen, vertexLight: lit, vertexFacing: facing, eyeStart: nb, triangles: tris, contours, terminators, landmarks: lm, joints, pixelsPerMetre: s,
    projection: { right, up, back, target, distance: dist, scale: s, ox, oy }, floorY: floorCam * s + oy,
    bounds: { x0: x0 * s + ox, y0: y0 * s + oy, x1: x1 * s + ox, y1: y1 * s + oy }, width: viewport.width, height: viewport.height,
  };
}

function rasterDepth(z: Float32Array, W: number, H: number, res: number, s: Float32Array, a: number, b: number, c: number) {
  const ax = s[a * 3] / res, ay = s[a * 3 + 1] / res, az = s[a * 3 + 2];
  const bx = s[b * 3] / res, by = s[b * 3 + 1] / res, bz = s[b * 3 + 2];
  const cx = s[c * 3] / res, cy = s[c * 3 + 1] / res, cz = s[c * 3 + 2];
  const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxx = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
  const miny = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxy = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
  const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(den) < 1e-9) return;
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
    const px = x + 0.5, py = y + 0.5;
    const w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den, w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den, w2 = 1 - w0 - w1;
    if (w0 < -0.01 || w1 < -0.01 || w2 < -0.01) continue;
    const d = w0 * az + w1 * bz + w2 * cz;
    if (d > z[y * W + x]) z[y * W + x] = d;
  }
}

/**
 * Zero-level lines of a per-vertex field over the body triangles (marching triangles), chained into polylines and
 * split where they become hidden. Used for occluding contours (n·v = 0) and light terminators (n·l = 0).
 */
function isoPolylines(F: Uint16Array, nf: number, field: Float32Array, screen: Float32Array, visible: (x: number, y: number, z: number) => boolean,
  weightAt: (v0: number, v1: number, t: number) => number, faceOk?: (f: number) => boolean): FramePolyline[] {
  const key = (a: number, b: number) => (a < b ? a * 65536 + b : b * 65536 + a);
  const pos = new Map<number, [number, number, number, number]>();
  const adj = new Map<number, number[]>();
  const link = (a: number, b: number) => { (adj.get(a) ?? adj.set(a, []).get(a)!).push(b); };
  for (let f = 0; f < nf; f++) {
    if (faceOk && !faceOk(f)) continue;
    const v = [F[f * 3], F[f * 3 + 1], F[f * 3 + 2]];
    const hits: number[] = [];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3], fa = field[a], fb = field[b];
      if ((fa < 0) === (fb < 0)) continue;
      const k = key(a, b);
      if (!pos.has(k)) {
        const t = fa / (fa - fb);
        pos.set(k, [screen[a * 3] + (screen[b * 3] - screen[a * 3]) * t, screen[a * 3 + 1] + (screen[b * 3 + 1] - screen[a * 3 + 1]) * t,
          screen[a * 3 + 2] + (screen[b * 3 + 2] - screen[a * 3 + 2]) * t, weightAt(a, b, t)]);
      }
      hits.push(k);
    }
    if (hits.length === 2) { link(hits[0], hits[1]); link(hits[1], hits[0]); }
  }
  const seen = new Set<number>(), lines: FramePolyline[] = [];
  const walk = (start: number) => {
    // extend both ways from start
    const chain = [start]; seen.add(start);
    for (const dir of [0, 1]) {
      let cur = start;
      for (;;) {
        const nx = (adj.get(cur) ?? []).find(x => !seen.has(x));
        if (nx === undefined) break;
        seen.add(nx); if (dir === 0) chain.push(nx); else chain.unshift(nx); cur = nx;
      }
    }
    return chain;
  };
  for (const k of adj.keys()) {
    if (seen.has(k)) continue;
    const chain = walk(k);
    let cur: FramePolyline | null = null;
    for (const c of chain) {
      const [x, y, z, w] = pos.get(c)!;
      if (visible(x, y, z)) { if (!cur) { cur = { points: [], weight: [] }; lines.push(cur); } cur.points.push([x, y]); cur.weight.push(w); }
      else cur = null;
    }
  }
  return lines.filter(l => l.points.length >= 3);
}

/** Smooth an SVG path through polyline points (Catmull-Rom → cubic Bézier). */
export function smoothPath(pts: readonly [number, number][], closed = false): string {
  if (pts.length < 2) return "";
  const r = (v: number) => Math.round(v * 10) / 10;
  let d = `M${r(pts[0][0])} ${r(pts[0][1])}`;
  const n = pts.length;
  const at = (i: number) => pts[closed ? (i + n) % n : Math.min(n - 1, Math.max(0, i))];
  const end = closed ? n : n - 1;
  for (let i = 0; i < end; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += `C${r(p1[0] + (p2[0] - p0[0]) / 6)} ${r(p1[1] + (p2[1] - p0[1]) / 6)} ${r(p2[0] - (p3[0] - p1[0]) / 6)} ${r(p2[1] - (p3[1] - p1[1]) / 6)} ${r(p2[0])} ${r(p2[1])}`;
  }
  return closed ? d + "Z" : d;
}

export type RasterMode = "clay" | "tonal" | "cel" | "silhouette";
export interface RasterColors { light: [number, number, number]; shadow: [number, number, number]; eye: [number, number, number] }

/**
 * Software-rasterise a frame's surface into RGBA pixels with per-pixel interpolated light (smooth, seam-free, the same
 * in a browser or Node). `scale` renders at a multiple of the frame size (2 for a sharp result on high-density screens).
 * Clay uses wrapped diffuse light with a soft rim; tonal posterises into the five value bands of `toneBand`; cel is two
 * values split at the terminator.
 */
export function rasterizeHumanFrame(frame: HumanFrame, mode: RasterMode, colors: RasterColors, scale = 1, ambient = DEFAULT_LIGHT.ambient ?? 0.18): ImageDataLike {
  const W = Math.round(frame.width * scale), H = Math.round(frame.height * scale);
  const rgba = new Uint8ClampedArray(W * H * 4), z = new Float32Array(W * H).fill(-Infinity);
  const s = frame.screen, L = frame.vertexLight, Fa = frame.vertexFacing;
  const [lr, lg, lb] = colors.light, [sr, sg, sb] = colors.shadow, [er, eg, eb] = colors.eye;
  const tonal = [0.26, 0.12, 0.58, 0.82, 1];
  for (const t of frame.triangles) {
    const ax = s[t.a * 3] * scale, ay = s[t.a * 3 + 1] * scale, az = s[t.a * 3 + 2];
    const bx = s[t.b * 3] * scale, by = s[t.b * 3 + 1] * scale, bz = s[t.b * 3 + 2];
    const cx = s[t.c * 3] * scale, cy = s[t.c * 3 + 1] * scale, cz = s[t.c * 3 + 2];
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(den) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den, w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den, w2 = 1 - w0 - w1;
      if (w0 < -0.002 || w1 < -0.002 || w2 < -0.002) continue;
      const d = w0 * az + w1 * bz + w2 * cz, i = y * W + x;
      if (d <= z[i]) continue;
      z[i] = d;
      const raw = w0 * L[t.a] + w1 * L[t.b] + w2 * L[t.c];
      const facing = Math.max(0, w0 * Fa[t.a] + w1 * Fa[t.b] + w2 * Fa[t.c]);
      let k: number;
      if (mode === "silhouette") k = 0;
      else if (mode === "cel") k = raw > 0.12 ? 1 : 0.38;
      else if (mode === "tonal") k = tonal[raw >= 0.82 ? 4 : raw >= 0.55 ? 3 : raw >= 0.3 ? 2 : raw >= 0.12 ? 1 : 0] * (raw < 0.12 && raw > -0.05 ? 0.46 : 1);
      else {
        const wrap = Math.max(0, (raw + 0.3) / 1.3);
        k = ambient + (1 - ambient) * Math.pow(wrap, 1.35) + 0.12 * Math.pow(1 - facing, 3) * (raw > -0.2 ? 1 : 0.4);
      }
      k = Math.min(1, Math.max(0, k));
      const o = i * 4;
      if (t.eye && mode !== "silhouette") { rgba[o] = sr + (er - sr) * k; rgba[o + 1] = sg + (eg - sg) * k; rgba[o + 2] = sb + (eb - sb) * k; }
      else { rgba[o] = sr + (lr - sr) * k; rgba[o + 1] = sg + (lg - sg) * k; rgba[o + 2] = sb + (lb - sb) * k; }
      rgba[o + 3] = 255;
    }
  }
  return { data: rgba, width: W, height: H };
}
export interface ImageDataLike { data: Uint8ClampedArray; width: number; height: number }

/** Project any 3D point (metres) with a frame's camera: screen x, y and depth (larger = nearer). */
export function projectPoint(frame: Pick<HumanFrame, "projection">, p: Vec3): [number, number, number] {
  const { right, up, back, target, distance, scale, ox, oy } = frame.projection;
  const d: Vec3 = [p[0] - target[0], p[1] - target[1], p[2] - target[2]];
  let x = dot(d, right), y = -dot(d, up); const z = dot(d, back);
  if (Number.isFinite(distance)) { const k = distance / Math.max(0.05, distance - z); x *= k; y *= k; }
  return [x * scale + ox, y * scale + oy, z];
}
