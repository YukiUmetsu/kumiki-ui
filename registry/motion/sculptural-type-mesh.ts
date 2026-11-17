/**
 * Sculptural typography — glyph solids (registry item `sculptural-type`).
 *
 * A glyph solid has three parts:
 * - the **face**, a height field over the glyph. Marching squares fill every grid cell that the ink covers, so the
 *   face edge runs exactly along the field's zero line and the mesh is watertight. Height and normal come from the
 *   relief profile and the field gradient, so bevels, pillows and chisel ridges shade smoothly.
 * - the **walls**, from the face edge back to the given depth, with smooth normals on curves and split normals at
 *   corners sharper than the crease angle.
 * - the **back**, a flat cap.
 *
 * Output coordinates are in em, relative to the glyph's pen position: x to the right, y up, z toward the viewer.
 * The face sits at z ≥ 0 and the back at z = -depth. Front faces wind counter-clockwise.
 */

import type { GlyphRaster, ReliefProfile } from "./sculptural-type-field";
import { resolveProfile, thickestStroke } from "./sculptural-type-field";

export interface GlyphSolidOptions {
  profile: ReliefProfile;
  /** Depth behind the face edge, in em. */
  depth: number;
  /** Pixels per em of the raster. */
  size: number;
  /** Grid step in pixels. 1 samples every pixel; 2 builds a quarter of the triangles. @default 1 */
  step?: number;
  /** Build the back cap. Turn it off for letters that are never seen from behind. @default true */
  back?: boolean;
  /** Walls turn sharper than this (degrees) get a crisp edge. @default 35 */
  creaseAngle?: number;
  /**
   * Passes of face normal smoothing over each vertex's neighbours. It removes grid aliasing on diagonal bevels.
   * @default 1, or 0 for `chisel` and `flat` (their ridges and edges stay sharp)
   */
  smoothNormals?: number;
}

export interface GlyphBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Highest face point (z). */
  front: number;
  /** Back plane (z = -depth). */
  back: number;
}

export interface GlyphSolid {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  box: GlyphBox;
  /** Vertex ranges: face, walls, back. */
  ranges: { face: [number, number]; wall: [number, number]; back: [number, number] };
}

const EMPTY_BOX: GlyphBox = { minX: 0, minY: 0, maxX: 0, maxY: 0, front: 0, back: 0 };

export function emptySolid(): GlyphSolid {
  return {
    positions: new Float32Array(0), normals: new Float32Array(0), uvs: new Float32Array(0), indices: new Uint32Array(0),
    box: { ...EMPTY_BOX }, ranges: { face: [0, 0], wall: [0, 0], back: [0, 0] },
  };
}

/** Build the solid for one glyph raster and its signed distance field. */
export function buildGlyphSolid(glyph: GlyphRaster, field: Float32Array, options: GlyphSolidOptions): GlyphSolid {
  if (glyph.blank || glyph.width === 0) return emptySolid();
  const W = glyph.width;
  const H = glyph.height;
  const step = Math.max(1, Math.round(options.step ?? 1));
  const size = options.size;
  const depthPx = Math.max(options.depth, 0) * size;
  const profile = resolveProfile(options.profile, size, thickestStroke(field));
  const nx = Math.floor((W - 1) / step) + 1;
  const ny = Math.floor((H - 1) / step) + 1;
  const sample = (px: number, py: number) => field[Math.min(H - 1, Math.max(0, py)) * W + Math.min(W - 1, Math.max(0, px))];
  const value = (a: number, b: number) => sample(a * step, b * step);
  const gradient = (px: number, py: number): [number, number] => [
    (sample(px + 1, py) - sample(px - 1, py)) / 2,
    (sample(px, py + 1) - sample(px, py - 1)) / 2,
  ];

  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  /** Face vertex at block pixel (x, y) with field value d and field gradient g. Raster y points down; output y up. */
  const faceVertex = (x: number, y: number, d: number, gx: number, gy: number): number => {
    const X = (glyph.left + x + 0.5 - glyph.penX) / size;
    const Y = (glyph.penY - (glyph.top + y + 0.5)) / size;
    const z = profile.height(d);
    const s = profile.slope(d);
    let ux = -s * gx;
    let uy = s * gy;
    let uz = 1;
    const length = Math.hypot(ux, uy, uz);
    ux /= length;
    uy /= length;
    uz /= length;
    pos.push(X, Y, z / size);
    nor.push(ux, uy, uz);
    uv.push(X, Y);
    return pos.length / 3 - 1;
  };

  const nodeVertex = new Int32Array(nx * ny).fill(-1);
  const hEdge = new Int32Array(nx * ny).fill(-1);
  const vEdge = new Int32Array(nx * ny).fill(-1);
  const isCrossing: boolean[] = [];
  const node = (a: number, b: number): number => {
    const key = b * nx + a;
    if (nodeVertex[key] < 0) {
      const [gx, gy] = gradient(a * step, b * step);
      nodeVertex[key] = faceVertex(a * step, b * step, value(a, b), gx, gy);
      isCrossing[nodeVertex[key]] = false;
    }
    return nodeVertex[key];
  };
  const crossing = (a: number, b: number, horizontal: boolean): number => {
    const key = b * nx + a;
    const table = horizontal ? hEdge : vEdge;
    if (table[key] < 0) {
      const a2 = horizontal ? a + 1 : a;
      const b2 = horizontal ? b : b + 1;
      const s0 = value(a, b);
      const s1 = value(a2, b2);
      const t = s0 === s1 ? 0.5 : s0 / (s0 - s1);
      const [g0x, g0y] = gradient(a * step, b * step);
      const [g1x, g1y] = gradient(a2 * step, b2 * step);
      table[key] = faceVertex((a + (a2 - a) * t) * step, (b + (b2 - b) * t) * step, 0, g0x + (g1x - g0x) * t, g0y + (g1y - g0y) * t);
      isCrossing[table[key]] = true;
    }
    return table[key];
  };

  const next = new Map<number, number>();
  const polygonEdges = (polygon: number[]) => {
    for (let k = 0; k < polygon.length; k += 1) {
      const u = polygon[k];
      const w = polygon[(k + 1) % polygon.length];
      if (isCrossing[u] && isCrossing[w]) next.set(u, w);
    }
    // The raster walk is clockwise on screen, and still clockwise once y points up, so reverse it to wind counter-clockwise.
    for (let k = 1; k + 1 < polygon.length; k += 1) idx.push(polygon[0], polygon[k + 1], polygon[k]);
  };

  for (let b = 0; b + 1 < ny; b += 1) {
    for (let a = 0; a + 1 < nx; a += 1) {
      const tl = value(a, b) >= 0;
      const tr = value(a + 1, b) >= 0;
      const br = value(a + 1, b + 1) >= 0;
      const bl = value(a, b + 1) >= 0;
      if (!tl && !tr && !br && !bl) continue;
      const saddleA = tl && br && !tr && !bl;
      const saddleB = tr && bl && !tl && !br;
      const centre = (value(a, b) + value(a + 1, b) + value(a + 1, b + 1) + value(a, b + 1)) / 4;
      if ((saddleA || saddleB) && centre < 0) {
        // Two separate corners: cut each off on its own (clockwise in raster order).
        if (saddleA) {
          polygonEdges([node(a, b), crossing(a, b, true), crossing(a, b, false)]);
          polygonEdges([crossing(a + 1, b, false), node(a + 1, b + 1), crossing(a, b + 1, true)]);
        } else {
          polygonEdges([crossing(a, b, true), node(a + 1, b), crossing(a + 1, b, false)]);
          polygonEdges([crossing(a, b + 1, true), node(a, b + 1), crossing(a, b, false)]);
        }
        continue;
      }
      // Walk the cell clockwise in raster order: tl, top edge, tr, right edge, br, bottom edge, bl, left edge.
      const polygon: number[] = [];
      if (tl) polygon.push(node(a, b));
      if (tl !== tr) polygon.push(crossing(a, b, true));
      if (tr) polygon.push(node(a + 1, b));
      if (tr !== br) polygon.push(crossing(a + 1, b, false));
      if (br) polygon.push(node(a + 1, b + 1));
      if (br !== bl) polygon.push(crossing(a, b + 1, true));
      if (bl) polygon.push(node(a, b + 1));
      if (bl !== tl) polygon.push(crossing(a, b, false));
      if (polygon.length >= 3) polygonEdges(polygon);
    }
  }
  const faceEnd = pos.length / 3;

  // Average face normals over their neighbours: the grid samples a bevel at slightly different depths along a
  // diagonal edge, and one pass hides that beading without moving any vertex.
  const passes = options.smoothNormals ?? (options.profile.kind === "chisel" || options.profile.kind === "flat" ? 0 : 1);
  if (passes > 0 && faceEnd > 0) {
    const neighbours: number[][] = Array.from({ length: faceEnd }, () => []);
    for (let t = 0; t < idx.length; t += 3) {
      const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
      neighbours[a].push(b, c);
      neighbours[b].push(a, c);
      neighbours[c].push(a, b);
    }
    for (let pass = 0; pass < passes; pass += 1) {
      const smoothed = new Float64Array(faceEnd * 3);
      for (let v = 0; v < faceEnd; v += 1) {
        let x = nor[3 * v];
        let y = nor[3 * v + 1];
        let z = nor[3 * v + 2];
        for (const w of neighbours[v]) {
          x += nor[3 * w];
          y += nor[3 * w + 1];
          z += nor[3 * w + 2];
        }
        const length = Math.hypot(x, y, z) || 1;
        smoothed[3 * v] = x / length;
        smoothed[3 * v + 1] = y / length;
        smoothed[3 * v + 2] = z / length;
      }
      for (let i = 0; i < smoothed.length; i += 1) nor[i] = smoothed[i];
    }
  }

  // Walls: chain the directed boundary edges into loops; the solid lies to the right of each edge (y up).
  const cosCrease = Math.cos(((options.creaseAngle ?? 35) * Math.PI) / 180);
  const visited = new Set<number>();
  const back = -depthPx / size;
  for (const start of next.keys()) {
    if (visited.has(start)) continue;
    const loop: number[] = [];
    for (let v: number | undefined = start; v !== undefined && !visited.has(v); v = next.get(v)) {
      visited.add(v);
      loop.push(v);
    }
    if (loop.length < 3) continue;
    const n = loop.length;
    const px = (k: number) => pos[3 * loop[(k + n) % n]];
    const py = (k: number) => pos[3 * loop[(k + n) % n] + 1];
    const outward = (k: number): [number, number] => {
      const dx = px(k + 1) - px(k);
      const dy = py(k + 1) - py(k);
      const length = Math.hypot(dx, dy);
      return length > 1e-12 ? [-dy / length, dx / length] : [0, 0];
    };
    let arc = 0;
    for (let k = 0; k < n; k += 1) {
      const [ex, ey] = outward(k);
      const [qx, qy] = outward(k - 1);
      const [fx, fy] = outward(k + 1);
      const blend = (ax: number, ay: number): [number, number] => {
        if (ex * ax + ey * ay < cosCrease) return [ex, ey];
        const length = Math.hypot(ex + ax, ey + ay);
        return length > 1e-12 ? [(ex + ax) / length, (ey + ay) / length] : [ex, ey];
      };
      const [sx, sy] = blend(qx, qy);
      const [tx, ty] = blend(fx, fy);
      const length = Math.hypot(px(k + 1) - px(k), py(k + 1) - py(k));
      const base = pos.length / 3;
      pos.push(px(k), py(k), 0, px(k + 1), py(k + 1), 0, px(k), py(k), back, px(k + 1), py(k + 1), back);
      nor.push(sx, sy, 0, tx, ty, 0, sx, sy, 0, tx, ty, 0);
      uv.push(arc, 0, arc + length, 0, arc, back, arc + length, back);
      arc += length;
      // Top at z = 0, bottom at the back; both triangles face outward.
      idx.push(base, base + 3, base + 2, base, base + 1, base + 3);
    }
  }
  const wallEnd = pos.length / 3;

  if (options.back !== false && depthPx >= 0) {
    const faceTriangles = idx.length;
    const offset = wallEnd;
    for (let v = 0; v < faceEnd; v += 1) {
      pos.push(pos[3 * v], pos[3 * v + 1], back);
      nor.push(0, 0, -1);
      uv.push(uv[2 * v], uv[2 * v + 1]);
    }
    // Only face triangles reference vertices below faceEnd; mirror them with reversed winding.
    for (let t = 0; t < faceTriangles; t += 3) {
      const a = idx[t];
      const b = idx[t + 1];
      const c = idx[t + 2];
      if (a < faceEnd && b < faceEnd && c < faceEnd) idx.push(offset + a, offset + c, offset + b);
    }
  }
  const backEnd = pos.length / 3;

  const box: GlyphBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, front: 0, back };
  for (let v = 0; v < faceEnd; v += 1) {
    box.minX = Math.min(box.minX, pos[3 * v]);
    box.maxX = Math.max(box.maxX, pos[3 * v]);
    box.minY = Math.min(box.minY, pos[3 * v + 1]);
    box.maxY = Math.max(box.maxY, pos[3 * v + 1]);
    box.front = Math.max(box.front, pos[3 * v + 2]);
  }
  if (faceEnd === 0) return emptySolid();
  return {
    positions: Float32Array.from(pos), normals: Float32Array.from(nor), uvs: Float32Array.from(uv),
    indices: Uint32Array.from(idx), box,
    ranges: { face: [0, faceEnd], wall: [faceEnd, wallEnd], back: [wallEnd, backEnd] },
  };
}
