/**
 * ARCH1 storybook scenes, part 4: modular building parts.
 *
 * `SceneBuilder` collects surfaces, parts, lights, canopies, ivy and sun-shaft windows for one scene. The parts are
 * built the way buildings are: walls that carry storeys at a person's scale (doors about 2 m, storeys about 3 m),
 * openings cut through them with real reveals, sashes and casements in their frames, shutters that hang a little
 * crooked, roofs at the pitch their covering needs (thatch and stone slate steep, Roman tile low), chimneys with soot,
 * jettied upper floors on their joists. Old buildings lean and their ridges sag (`lean`, `sag`).
 *
 * Every generator builds in local metres (the front faces +z, the ground at y = 0) and is placed with `b.place`.
 */
import { seeded } from "./foundation-shapes";
import type { ArchShape, Node, RoofSpan } from "./arch-sdf";
import { beam, box, boxAt, capsule, clump, coneY, cut, cylX, cylY, cylZ, dome, ellipsoid, frame, gableRoof, gableWall, hipRoof, leaf, mansard, opening, openingTop, pentRoof, repeatAround, repeatWheel, repeatX, resetScene, revolve, sphere, spire, union, worldRoot } from "./arch-sdf";
import type { ArchScene, CameraSpec, Canopy, GroundZone, IvyPatch, Mood, MoodId, PointLight, Portal } from "./arch-paint";
import type { SurfaceSpec } from "./arch-surface";

export interface Place { x?: number; y?: number; z?: number; yaw?: number; leanX?: number; leanZ?: number }

/** Collects one scene. */
export class SceneBuilder {
  readonly surfaces: SurfaceSpec[] = [];
  private readonly keys = new Map<string, number>();
  readonly parts: Node[] = [];
  readonly lights: PointLight[] = [];
  readonly canopies: Canopy[] = [];
  readonly portals: Portal[] = [];
  readonly ivy: IvyPatch[] = [];
  readonly grounds: GroundZone[] = [];
  readonly rnd: () => number;
  /** Local parts, lights and ivy waiting for `place`. */
  private local: { nodes: Node[]; lights: PointLight[]; ivy: IvyPatch[]; canopies: Canopy[] } = { nodes: [], lights: [], ivy: [], canopies: [] };
  constructor(readonly seed = 1) { resetScene(); this.rnd = seeded(seed); }
  /** A surface id (the same spec gives the same id). */
  mat(s: SurfaceSpec): number {
    const k = JSON.stringify(s);
    const have = this.keys.get(k);
    if (have !== undefined) return have;
    this.surfaces.push(s); this.keys.set(k, this.surfaces.length - 1);
    return this.surfaces.length - 1;
  }
  /** A random number in [a, b). */
  r(a = 0, b = 1) { return a + (b - a) * this.rnd(); }
  /** Add parts in local coordinates (placed by the next `place`). */
  add(...ns: (Node | null | undefined | false)[]) { for (const n of ns) if (n) this.local.nodes.push(n); }
  /** A light in local coordinates. */
  light(l: PointLight) { this.local.lights.push(l); }
  /** Ivy rooted in local coordinates. */
  grow(p: IvyPatch) { this.local.ivy.push(p); }
  /** A leaf canopy in local coordinates. */
  shade(c: Canopy) { this.local.canopies.push(c); }
  /** Place everything added since the last `place` into the world. */
  place(p: Place = {}) {
    const { nodes, lights, ivy, canopies } = this.local;
    this.local = { nodes: [], lights: [], ivy: [], canopies: [] };
    if (!nodes.length && !lights.length) return;
    const a = ((p.yaw ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), X = p.x ?? 0, Y = p.y ?? 0, Z = p.z ?? 0;
    const w = (x: number, z: number): [number, number] => [X + x * c - z * s, Z + x * s + z * c];
    const identity = !p.yaw && !p.leanX && !p.leanZ && !X && !Y && !Z;
    if (nodes.length) this.parts.push(identity ? union(nodes) : frame(union(nodes), { x: X, y: Y, z: Z, yaw: p.yaw ?? 0, leanX: p.leanX ?? 0, leanZ: p.leanZ ?? 0 }));
    for (const l of lights) { const [x, z] = w(l.x + (p.leanX ?? 0) * l.y, l.z + (p.leanZ ?? 0) * l.y); this.lights.push({ ...l, x, y: l.y + Y, z }); }
    for (const v of ivy) { const [x, z] = w(v.x, v.z); const turned = Math.abs(s) > 0.7; this.ivy.push({ ...v, x, z, y0: (v.y0 ?? 0) + Y, axis: turned ? (v.axis === "x" ? "z" : "x") : v.axis }); }
    for (const k of canopies) { const [x, z] = w(k.x, k.z); this.canopies.push({ ...k, x, z, y: k.y + Y }); }
  }
  /** The box round the subject placed so far, leaving out big scenery (hills, crags and cliffs over 150 m). */
  subjectBounds(): { lo: [number, number, number]; hi: [number, number, number] } {
    this.place();
    const lo: [number, number, number] = [1e9, 1e9, 1e9], hi: [number, number, number] = [-1e9, -1e9, -1e9];
    for (const n of this.parts) {
      if (n.hi[0] - n.lo[0] > 150 || n.hi[2] - n.lo[2] > 150 || n.lo[1] < -100) continue;
      for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], n.lo[k]); hi[k] = Math.max(hi[k], n.hi[k]); }
    }
    if (lo[0] > hi[0]) return { lo: [-5, 0, -5], hi: [5, 8, 5] };
    lo[1] = Math.max(lo[1], -0.5);
    return { lo, hi };
  }
  /** Finish: the scene to paint. */
  scene(camera: CameraSpec, mood: MoodId | Mood, extra: Partial<ArchScene> = {}): ArchScene {
    this.place();
    // banks: where a lower zone (water, a sunken lane) is cut into a higher one, its sides are stone
    const bank = this.mat({ kind: "rubble", colour: "#7d7464", moss: 0.6, age: 0.8 });
    this.grounds.forEach((g, k) => {
      for (let j = 0; j < k; j++) {
        const q = this.grounds[j];
        if (q.y <= g.y + 0.05) continue;
        const x0 = Math.max(g.x0, q.x0), x1 = Math.min(g.x1, q.x1), z0 = Math.max(g.z0, q.z0), z1 = Math.min(g.z1, q.z1);
        if (x0 >= x1 || z0 >= z1) continue;
        const y0 = g.y - 0.6, y1 = q.y;
        if (g.z0 > q.z0) this.parts.push(boxAt(x0, y0, g.z0 - 0.3, x1, y1, g.z0, bank));
        if (g.z1 < q.z1) this.parts.push(boxAt(x0, y0, g.z1, x1, y1, g.z1 + 0.3, bank));
        if (g.x0 > q.x0) this.parts.push(boxAt(g.x0 - 0.3, y0, z0, g.x0, y1, z1, bank));
        if (g.x1 < q.x1) this.parts.push(boxAt(g.x1, y0, z0, g.x1 + 0.3, y1, z1, bank));
      }
    });
    return { root: worldRoot(union(this.parts)), surfaces: this.surfaces, camera, mood, lights: this.lights, canopies: this.canopies, portals: this.portals, ivy: this.ivy, grounds: this.grounds, seed: this.seed, ...extra };
  }
}

// ---- Openings: windows and doors ------------------------------------------------------------------------------------------------

export interface WindowSpec {
  w: number; h: number; shape?: ArchShape;
  /** Panes across and up (glazing bars). */
  panes?: [number, number];
  glass?: SurfaceSpec;
  frame?: SurfaceSpec;
  shutters?: SurfaceSpec | null;
  /** How far shutters hang askew, degrees. */
  crooked?: number;
  /** A flower box below the sill. */
  flowers?: string | null;
  /** A stone or painted surround (architrave), metres wide. */
  surround?: SurfaceSpec;
  /** A sill that projects (stone). */
  sill?: SurfaceSpec;
  /** Reveal depth, metres. */
  reveal?: number;
  /** Lintel or arch of stone voussoirs over the opening. */
  head?: SurfaceSpec;
  /** A pediment or hood over the window. */
  hood?: "pediment" | "segment" | "cornice" | null;
}

/** A window in a wall whose face is at z = `zf` (facing +z): returns the cutter and the parts to add. */
export function windowParts(b: SceneBuilder, cx: number, y0: number, zf: number, ws: WindowSpec, wallDepth = 0.5): { cutter: Node; parts: Node[] } {
  const shape = ws.shape ?? "flat", rev = ws.reveal ?? 0.18, top = shape === "flat" ? ws.h : ws.h;
  const hs = shape === "flat" ? ws.h : Math.max(0.15, ws.h - openingTop(ws.w, 0, shape));
  const cutter = opening(cx, y0, ws.w, hs, shape, zf - wallDepth, zf + 0.3);
  const parts: Node[] = [];
  const glass = b.mat(ws.glass ?? { kind: "glass" }), fr = b.mat(ws.frame ?? { kind: "painted-wood", colour: "#e9e4d8", flake: 0.15 });
  const zg = zf - rev;
  parts.push(boxBack(cx, y0, zg - 0.03, ws.w, top, shape, glass));
  const [c, r] = ws.panes ?? [2, 3];
  parts.push(frameBars(cx, y0, zg, ws.w, top, hs, shape, c, r, fr));
  if (ws.sill) parts.push(boxAt(cx - ws.w / 2 - 0.08, y0 - 0.08, zf - rev, cx + ws.w / 2 + 0.08, y0 + 0.0, zf + 0.07, b.mat(ws.sill)));
  if (ws.head && shape === "flat") parts.push(boxAt(cx - ws.w / 2 - 0.12, y0 + ws.h, zf - 0.02, cx + ws.w / 2 + 0.12, y0 + ws.h + 0.2, zf + 0.025, b.mat(ws.head)));
  if (ws.surround) {
    const sm = b.mat(ws.surround), sw = 0.12;
    parts.push(cut(boxAt(cx - ws.w / 2 - sw, y0 - 0.02, zf - 0.02, cx + ws.w / 2 + sw, y0 + openingTop(ws.w, hs, shape) + sw, zf + 0.035, sm), [opening(cx, y0, ws.w, hs, shape, zf - 0.1, zf + 0.1)]));
    if (ws.hood === "cornice" || ws.hood === "pediment" || ws.hood === "segment") {
      const yT = y0 + openingTop(ws.w, hs, shape) + sw;
      parts.push(boxAt(cx - ws.w / 2 - sw - 0.08, yT, zf - 0.02, cx + ws.w / 2 + sw + 0.08, yT + 0.1, zf + 0.12, sm));
      if (ws.hood === "pediment") parts.push(gableRoof({ x0: cx - ws.w / 2 - sw - 0.08, x1: cx + ws.w / 2 + sw + 0.08, z0: zf - 0.05, z1: zf + 0.11, y: yT + 0.1, pitch: 22, over: 0, t: 0.08, ridge: "z" }, sm));
    }
  }
  if (ws.shutters) {
    const sm = b.mat(ws.shutters), sw = ws.w / 2 + 0.02, ang = ((ws.crooked ?? 0) * Math.PI) / 180;
    for (const side of [-1, 1]) {
      const sx = cx + side * (ws.w / 2 + 0.05 + sw / 2), tilt = side === 1 ? ang : -ang * 0.4;
      parts.push(tiltedBoard(sx, y0 + ws.h / 2, zf + 0.04, sw / 2, ws.h / 2 + 0.02, 0.025, tilt, sm));
    }
  }
  if (ws.flowers) {
    const bx = b.mat({ kind: "painted-wood", colour: "#5b4632", flake: 0.25 }), fl = b.mat({ kind: "foliage", colour: "#466b2e", colour2: ws.flowers });
    parts.push(boxAt(cx - ws.w / 2, y0 - 0.22, zf, cx + ws.w / 2, y0 - 0.02, zf + 0.22, bx));
    parts.push(ellipsoid(cx, y0 + 0.02, zf + 0.12, ws.w / 2 + 0.05, 0.16, 0.16, fl));
  }
  return { cutter, parts };
}
/** Glass set back in the opening (its shape follows the arch). */
function boxBack(cx: number, y0: number, z: number, w: number, h: number, shape: ArchShape, mat: number): Node {
  const hs = shape === "flat" ? h : Math.max(0.15, h - openingTop(w, 0, shape)), o = opening(cx, y0, w + 0.02, hs, shape, z - 0.015, z + 0.015);
  return leaf(o.f, o.lo, o.hi, mat);
}
/** Glazing bars and the frame round them. */
function frameBars(cx: number, y0: number, z: number, w: number, h: number, hs: number, shape: ArchShape, cols: number, rows: number, mat: number): Node {
  const bar = 0.035, out = opening(cx, y0, w + 0.02, hs, shape, z - 0.05, z + 0.02), inner = opening(cx, y0 + 0.06, w - 0.12, Math.max(0.05, hs - 0.06), shape, z - 0.1, z + 0.1);
  const pw = (w - 0.12) / cols, top = shape === "flat" ? h : openingTop(w, hs, shape), ph = (top - 0.12) / rows;
  return leaf((x, y, zz) => {
    const dOut = out.f(x, y, zz);
    if (dOut > 0.05) return dOut;
    const dIn = inner.f(x, y, zz);
    // bars: distance to the nearest bar line inside the inner opening
    const lx = x - (cx - (w - 0.12) / 2), ly = y - (y0 + 0.06);
    const fxp = lx / pw - Math.round(lx / pw), fyp = ly / ph - Math.round(ly / ph);
    const bx = Math.abs(fxp) * pw - bar / 2, by = Math.abs(fyp) * ph - bar / 2;
    const barD = Math.max(Math.min(bx, by), Math.abs(zz - (z - 0.015)) - 0.02);
    return Math.max(dOut, Math.min(-dIn, barD));
  }, out.lo, out.hi, mat);
}
/** A board (shutter, sign) tilted about z by `ang` radians. */
export function tiltedBoard(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, ang: number, mat: number): Node {
  const c = Math.cos(ang), s = Math.sin(ang), R = Math.hypot(hx, hy);
  return leaf((x, y, z) => {
    const px = x - cx, py = y - cy, qx = px * c + py * s, qy = -px * s + py * c;
    const dx = Math.abs(qx) - hx, dy = Math.abs(qy) - hy, dz = Math.abs(z - cz) - hz;
    return Math.min(Math.max(dx, dy, dz), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0));
  }, [cx - R, cy - R, cz - hz], [cx + R, cy + R, cz + hz], mat);
}

export interface DoorSpec { x?: number; w?: number; h?: number; shape?: ArchShape; mat?: SurfaceSpec; surround?: SurfaceSpec; step?: SurfaceSpec | null; lantern?: boolean; fanlight?: boolean; canopy?: SurfaceSpec }
/** A door in a wall facing +z at `zf`. */
export function doorParts(b: SceneBuilder, zf: number, d: DoorSpec, y0 = 0): { cutter: Node; parts: Node[] } {
  const x = d.x ?? 0, w = d.w ?? 0.95, h = d.h ?? 2.1, shape = d.shape ?? "flat", hs = shape === "flat" ? h : Math.max(1.6, h - openingTop(w, 0, shape));
  const cutter = opening(x, y0, w, hs, shape, zf - 0.6, zf + 0.3);
  const parts: Node[] = [];
  const dm = b.mat(d.mat ?? { kind: "boards", colour: "#5a4330", course: 0.14, age: 0.6 });
  const dz = zf - 0.12;
  const leafO = opening(x, y0, w, hs, shape, dz - 0.04, dz + 0.04);
  parts.push(leaf(leafO.f, leafO.lo, leafO.hi, dm));
  if (d.fanlight && shape !== "flat") parts.push(boxBack(x, y0 + hs, dz + 0.045, w * 0.9, openingTop(w, 0, shape) * 0.9, shape, b.mat({ kind: "glass" })));
  // iron ring handle and strap hinges
  const iron = b.mat({ kind: "iron", age: 0.6 });
  parts.push(sphere(x + w * 0.3, y0 + 1.0, dz + 0.06, 0.035, iron));
  for (const hy of [0.4, hs - 0.3]) parts.push(boxAt(x - w / 2 + 0.02, y0 + hy - 0.025, dz + 0.04, x + w * 0.15, y0 + hy + 0.025, dz + 0.055, iron));
  if (d.step !== null) parts.push(box(x, y0 - 0.0 + 0.08, zf + 0.22, w / 2 + 0.22, 0.09, 0.26, b.mat(d.step ?? { kind: "ashlar", colour: "#a59c8a", course: 0.2, age: 0.8, moss: 0.2 }), 0, 0.02));
  if (d.surround) {
    const sm = b.mat(d.surround), sw = 0.16;
    parts.push(cut(boxAt(x - w / 2 - sw, y0, zf - 0.02, x + w / 2 + sw, y0 + openingTop(w, hs, shape) + sw, zf + 0.05, sm), [opening(x, y0 - 0.1, w, hs + 0.1, shape, zf - 0.2, zf + 0.2)]));
  }
  if (d.canopy) parts.push(pentRoof(x - w / 2 - 0.35, x + w / 2 + 0.35, zf, 0.7, y0 + h + 0.45, 25, b.mat(d.canopy)));
  if (d.lantern) {
    const lx = x + w / 2 + 0.45, ly = y0 + h + 0.15;
    parts.push(...lanternParts(b, lx, ly, zf + 0.28));
    b.light({ x: lx, y: ly, z: zf + 0.3, kelvin: 2000, power: 0.35, shadow: true, lamp: true });
  }
  return { cutter, parts };
}

/** A wall lantern: an iron bracket, a glazed box, a little roof. */
export function lanternParts(b: SceneBuilder, x: number, y: number, z: number): Node[] {
  const iron = b.mat({ kind: "iron", age: 0.4 }), glass = b.mat({ kind: "glass", colour: "#e8c27a" });
  return [
    capsule(x, y + 0.32, z - 0.28, x, y + 0.32, z, 0.015, iron),
    box(x, y, z, 0.1, 0.16, 0.1, glass),
    beam(x - 0.1, y - 0.16, z - 0.1, x - 0.1, y + 0.16, z - 0.1, 0.022, iron), beam(x + 0.1, y - 0.16, z - 0.1, x + 0.1, y + 0.16, z - 0.1, 0.022, iron),
    beam(x - 0.1, y - 0.16, z + 0.1, x - 0.1, y + 0.16, z + 0.1, 0.022, iron), beam(x + 0.1, y - 0.16, z + 0.1, x + 0.1, y + 0.16, z + 0.1, 0.022, iron),
    spire(x, z, y + 0.16, y + 0.32, 0.14, 4, iron, 0, Math.PI / 4),
  ];
}

// ---- The house -----------------------------------------------------------------------------------------------------------------

export type RoofKind = "gable" | "gable-front" | "hip" | "half-hip" | "mansard" | "flat" | "pyramid" | "none" | "step-gable" | "neck-gable" | "bell-gable" | "curved-gable";
export interface HouseSpec {
  /** Width along the street (x) and depth (z), metres. */
  w: number; d: number;
  storeys: number;
  storeyH?: number;
  /** A plinth or raised ground floor, metres. */
  plinth?: number;
  /** Wall surface for each storey, ground first (the last repeats). */
  walls: SurfaceSpec | SurfaceSpec[];
  /** Corner stones (quoins). */
  quoins?: SurfaceSpec;
  /** Upper storeys project over the street by this much each (a jetty). */
  jetty?: number;
  roof: { kind: RoofKind; pitch: number; mat: SurfaceSpec; over?: number; sag?: number; gableMat?: SurfaceSpec; ridgeMat?: SurfaceSpec; h1?: number };
  /** Windows on the front: per storey a count (or x positions); ground floor may skip the door bay. */
  windows?: { rows: (number | number[])[]; spec: WindowSpec; sillH?: number; sides?: boolean };
  /** Dormers in the front roof slope. */
  dormers?: { count: number; spec?: WindowSpec; mat?: SurfaceSpec };
  door?: DoorSpec | null;
  chimneys?: { x: number; z?: number; h?: number; w?: number; mat?: SurfaceSpec; pots?: number }[];
  /** A cornice under the eaves (classical houses). */
  cornice?: SurfaceSpec;
  /** String courses between storeys. */
  bands?: SurfaceSpec;
  /** Balconies on these storeys (index from 0 = ground). */
  balconies?: { storey: number; continuous?: boolean; mat?: SurfaceSpec }[];
  /** A shop front on the ground floor: big glazed bays and a fascia. */
  shop?: { fascia: SurfaceSpec; glass?: SurfaceSpec; awning?: SurfaceSpec };
  /** Ivy rooted at the front. */
  ivy?: { x: number; w: number; h: number }[];
  /** Hoist beam in the gable (Dutch, Hanseatic). */
  hoist?: boolean;
}

/** Height of the eaves (wall plate) of a house. */
export const houseEaves = (s: HouseSpec) => (s.plinth ?? 0) + s.storeys * (s.storeyH ?? 2.9);

/** Build a house in local coordinates (front face +z) and add it to the builder. Returns key heights. */
export function house(b: SceneBuilder, s: HouseSpec): { eaves: number; ridge: number } {
  const SH = s.storeyH ?? 2.9, W = s.w, D = s.d, plinth = s.plinth ?? 0, eaves = plinth + s.storeys * SH, jet = s.jetty ?? 0;
  const walls = Array.isArray(s.walls) ? s.walls : [s.walls];
  const wallAt = (k: number) => b.mat(walls[Math.min(k, walls.length - 1)]);
  const tone = b.r();
  const front = (k: number) => D / 2 + jet * k;
  // storeys: one box each, so materials and jetties can change by floor
  const storeyBoxes: { node: Node; k: number }[] = [];
  if (plinth > 0) storeyBoxes.push({ node: boxAt(-W / 2 - 0.05, 0, -D / 2 - 0.05, W / 2 + 0.05, plinth, D / 2 + 0.06, wallAt(0), tone), k: -1 });
  for (let k = 0; k < s.storeys; k++) storeyBoxes.push({ node: boxAt(-W / 2, plinth + k * SH, -D / 2, W / 2, plinth + (k + 1) * SH + 0.001, front(k), wallAt(k), tone), k });
  // openings
  const cutters: Node[][] = storeyBoxes.map(() => []);
  const parts: Node[] = [];
  if (s.door !== null) {
    const dr = doorParts(b, front(0), s.door ?? {}, plinth > 0.3 ? plinth : 0);
    cutters[plinth > 0 ? 1 : 0].push(dr.cutter); parts.push(...dr.parts);
    if (plinth > 0.3) {
      // steps up to a raised door
      const n = Math.max(1, Math.round(plinth / 0.17)), st = b.mat({ kind: "ashlar", colour: "#a8a090", age: 0.7, course: 0.17, moss: 0.15 });
      for (let i = 0; i < n; i++) parts.push(boxAt((s.door?.x ?? 0) - 0.8, 0, front(0), (s.door?.x ?? 0) + 0.8, plinth - i * (plinth / n), front(0) + 0.3 * (i + 1), st));
    }
  }
  if (s.shop) {
    const fm = b.mat(s.shop.fascia), gm = b.mat(s.shop.glass ?? { kind: "glass" });
    const bw = W - 0.8;
    cutters[plinth > 0 ? 1 : 0].push(opening(0, plinth + 0.5, bw, 2.2, "flat", front(0) - 0.4, front(0) + 0.3));
    parts.push(boxAt(-bw / 2, plinth + 0.5, front(0) - 0.32, bw / 2, plinth + 2.7, front(0) - 0.28, gm));
    parts.push(boxAt(-bw / 2 - 0.1, plinth + 2.7, front(0) - 0.05, bw / 2 + 0.1, plinth + 3.05, front(0) + 0.12, fm));
    parts.push(repeatX(boxAt(-bw / 2, plinth + 0.5, front(0) - 0.3, -bw / 2 + 0.06, plinth + 2.7, front(0) - 0.2, fm), bw / 3, 4));
    if (s.shop.awning) parts.push(pentRoof(-W / 2 + 0.2, W / 2 - 0.2, front(0), 1.4, plinth + 2.95, 22, b.mat(s.shop.awning), 0, 0.03));
  }
  const winSill = s.windows?.sillH ?? 0.95;
  if (s.windows) {
    s.windows.rows.forEach((row, k) => {
      if (k >= s.storeys) return;
      const xs = Array.isArray(row) ? row : Array.from({ length: row }, (_, i) => -W / 2 + (W * (i + 0.5)) / row);
      for (const x of xs) {
        const y0 = plinth + k * SH + winSill, jitterX = (b.r() - 0.5) * 0.04;
        const wp = windowParts(b, x + jitterX, y0, front(k), { ...s.windows!.spec, crooked: (s.windows!.spec.crooked ?? 0) * (b.r() - 0.3) });
        cutters[k + (plinth > 0 ? 1 : 0)].push(wp.cutter); parts.push(...wp.parts);
      }
    });
    if (s.windows.sides) for (let k = 0; k < s.storeys; k++) {
      // a window in each side wall
      for (const side of [-1, 1]) {
        const y0 = plinth + k * SH + winSill, wsp = s.windows.spec, x = side * W / 2;
        cutters[k + (plinth > 0 ? 1 : 0)].push(opening(0, y0, wsp.w, wsp.shape === "flat" || !wsp.shape ? wsp.h : wsp.h - openingTop(wsp.w, 0, wsp.shape), wsp.shape ?? "flat", x - 0.6 * side, x + 0.3 * side, "x"));
        parts.push(box(x - side * 0.2, y0 + wsp.h / 2, 0, 0.02, wsp.h / 2, wsp.w / 2, b.mat(wsp.glass ?? { kind: "glass" })));
      }
    }
  }
  storeyBoxes.forEach((sb, i) => parts.push(cut(sb.node, cutters[i])));
  // jetty: joist ends and a bressumer under each projecting floor
  if (jet > 0) {
    const oak = b.mat({ kind: "oak", colour: "#4a3a2c" });
    for (let k = 1; k < s.storeys; k++) {
      const y = plinth + k * SH;
      parts.push(boxAt(-W / 2, y - 0.18, front(k - 1), W / 2, y + 0.02, front(k), oak));
      parts.push(repeatX(boxAt(-W / 2 + 0.1, y - 0.3, front(k - 1), -W / 2 + 0.22, y - 0.16, front(k) - 0.02, oak), 0.45, Math.floor((W - 0.2) / 0.45)));
    }
  }
  if (s.quoins) {
    const qm = b.mat(s.quoins), n = Math.floor((eaves - plinth) / 0.32);
    for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
      const long = i % 2 === 0, y = plinth + i * 0.32;
      parts.push(boxAt(side * W / 2 - (side > 0 ? (long ? 0.55 : 0.3) : -0.0) - (side < 0 ? 0.02 : 0), y + 0.01, D / 2 - 0.0, side * W / 2 + (side < 0 ? (long ? 0.55 : 0.3) : 0) + (side > 0 ? 0.02 : 0), y + 0.31, D / 2 + 0.03, qm, b.r()));
    }
  }
  if (s.bands) { const bm = b.mat(s.bands); for (let k = 1; k < s.storeys; k++) parts.push(boxAt(-W / 2 - 0.04, plinth + k * SH - 0.1, -D / 2 - 0.04, W / 2 + 0.04, plinth + k * SH + 0.08, front(k - 1) + 0.07, bm)); }
  if (s.cornice) { const cm = b.mat(s.cornice); parts.push(boxAt(-W / 2 - 0.25, eaves - 0.12, -D / 2 - 0.25, W / 2 + 0.25, eaves + 0.06, front(s.storeys - 1) + 0.3, cm)); parts.push(boxAt(-W / 2 - 0.12, eaves - 0.32, -D / 2 - 0.12, W / 2 + 0.12, eaves - 0.12, front(s.storeys - 1) + 0.16, cm)); }
  if (s.balconies) for (const bal of s.balconies) {
    const y = plinth + bal.storey * SH, iron = b.mat(bal.mat ?? { kind: "iron", age: 0.3 }), slab = b.mat(s.cornice ?? { kind: "ashlar", colour: "#d8ccb4" });
    const x0 = bal.continuous ? -W / 2 + 0.1 : -0.9, x1 = bal.continuous ? W / 2 - 0.1 : 0.9;
    parts.push(boxAt(x0, y - 0.05, front(bal.storey), x1, y + 0.1, front(bal.storey) + 0.65, slab));
    parts.push(boxAt(x0, y + 0.95, front(bal.storey) + 0.58, x1, y + 1.0, front(bal.storey) + 0.64, iron));
    parts.push(repeatX(boxAt(x0 + 0.05, y + 0.1, front(bal.storey) + 0.6, x0 + 0.065, y + 0.95, front(bal.storey) + 0.62, iron), 0.11, Math.floor((x1 - x0 - 0.1) / 0.11) + 1));
    // a filigree band: rings between the balusters
    parts.push(repeatX(cylZ(x0 + 0.11, y + 0.55, front(bal.storey) + 0.6, front(bal.storey) + 0.62, 0.045, iron), 0.22, Math.floor((x1 - x0 - 0.2) / 0.22)));
  }
  // roof
  const R = s.roof, rise0 = (R.kind === "gable-front" || R.kind === "step-gable" || R.kind === "neck-gable" || R.kind === "bell-gable" || R.kind === "curved-gable" ? W / 2 : R.kind === "hip" ? Math.min(W, D + jet * (s.storeys - 1)) / 2 : (D + jet * (s.storeys - 1)) / 2) * Math.tan((R.pitch * Math.PI) / 180);
  const rm = b.mat(R.mat.kind === "stone-slate" ? { ...R.mat, eave: eaves, ridge: eaves + rise0 } : R.mat), over = R.over ?? 0.4, sag = R.sag ?? 0, Dtop = D + jet * (s.storeys - 1), zc = (front(s.storeys - 1) - D / 2) / 2;
  const span: RoofSpan = { x0: -W / 2, x1: W / 2, z0: -D / 2, z1: front(s.storeys - 1), y: eaves, pitch: R.pitch, over, sag };
  const gm = b.mat(R.gableMat ?? walls[walls.length - 1]);
  let ridge = eaves;
  const a = (R.pitch * Math.PI) / 180;
  switch (R.kind) {
    case "gable": parts.push(gableRoof(span, rm, tone), gableWall(span, gm, tone)); ridge = eaves + (Dtop / 2) * Math.tan(a); break;
    case "gable-front": case "step-gable": case "neck-gable": case "bell-gable": case "curved-gable": {
      const sp: RoofSpan = { ...span, ridge: "z", over: R.kind === "gable-front" ? over : 0.05 };
      parts.push(gableRoof(sp, rm, tone), gableWall(sp, gm, tone));
      ridge = eaves + (W / 2) * Math.tan(a);
      if (R.kind !== "gable-front") parts.push(...gableParapet(b, R.kind, W, ridge - eaves, eaves, front(s.storeys - 1), gm, R.ridgeMat));
      if (s.hoist) { const oak = b.mat({ kind: "oak", colour: "#3d3026" }); parts.push(boxAt(-0.08, ridge - 1.4, front(s.storeys - 1) - 0.2, 0.08, ridge - 1.25, front(s.storeys - 1) + 0.9, oak), cylY(0, front(s.storeys - 1) + 0.85, ridge - 1.75, ridge - 1.4, 0.012, b.mat({ kind: "iron" }))); }
      break;
    }
    case "hip": parts.push(hipRoof(span, rm, tone)); ridge = eaves + (Math.min(W, Dtop) / 2) * Math.tan(a); break;
    case "half-hip": {
      parts.push(halfHip(span, rm, tone), gableWall(span, gm, tone)); ridge = eaves + (Dtop / 2) * Math.tan(a); break;
    }
    case "pyramid": parts.push(spire(0, zc, eaves - over * Math.tan(a), eaves + (Math.max(W, Dtop) / 2 + over) * Math.tan(a), Math.max(W, Dtop) / 2 + over, 4, rm, tone, Math.PI / 4)); ridge = eaves + (Math.max(W, Dtop) / 2) * Math.tan(a); break;
    case "mansard": {
      const h1 = R.h1 ?? 2.6;
      parts.push(mansard({ ...span, over: 0.05, h1, steep: 72 }, rm, tone));
      ridge = eaves + h1 + 1.2;
      // zinc-roofed dormers in the steep slope
      break;
    }
    case "flat": {
      const pm = b.mat(R.gableMat ?? walls[walls.length - 1]);
      parts.push(cut(boxAt(-W / 2, eaves, -D / 2, W / 2, eaves + 0.7, front(s.storeys - 1), pm), [boxAt(-W / 2 + 0.25, eaves + 0.2, -D / 2 + 0.25, W / 2 - 0.25, eaves + 1, front(s.storeys - 1) - 0.25, 0)]));
      parts.push(boxAt(-W / 2 + 0.2, eaves, -D / 2 + 0.2, W / 2 - 0.2, eaves + 0.25, front(s.storeys - 1) - 0.2, rm));
      ridge = eaves + 0.7; break;
    }
    case "none": break;
  }
  if (s.dormers && s.dormers.count > 0 && (R.kind === "gable" || R.kind === "mansard" || R.kind === "hip")) {
    const n = s.dormers.count, dm = b.mat(s.dormers.mat ?? R.mat), ww = s.dormers.spec?.w ?? 0.8, wh = s.dormers.spec?.h ?? 1.0;
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + (W * (i + 0.5)) / n, zf = front(s.storeys - 1) - (R.kind === "mansard" ? 0.35 : 0.5), y0 = eaves + (R.kind === "mansard" ? 0.35 : 0.2);
      const body = boxAt(x - ww / 2 - 0.15, y0 - 0.3, zf - 1.8, x + ww / 2 + 0.15, y0 + wh + 0.15, zf, b.mat(R.kind === "mansard" ? { kind: "ashlar", colour: "#e2d8c4", course: 0.3 } : walls[walls.length - 1]));
      const wp = windowParts(b, x, y0, zf, s.dormers.spec ?? { w: ww, h: wh, panes: [2, 2] }, 0.3);
      parts.push(cut(body, [wp.cutter]), ...wp.parts);
      parts.push(gableRoof({ x0: x - ww / 2 - 0.15, x1: x + ww / 2 + 0.15, z0: zf - 1.8, z1: zf, y: y0 + wh + 0.15, pitch: 45, over: 0.12, ridge: "z" }, dm));
    }
  }
  if (s.chimneys) for (const c of s.chimneys) {
    const cw = c.w ?? 0.7, top = Math.max(ridge, eaves + 1) + (c.h ?? 1.0), cm = b.mat({ ...(c.mat ?? walls[0]), soot: top - 0.1 });
    const z = c.z ?? zc;
    parts.push(boxAt(c.x - cw / 2, eaves - 1, z - cw * 0.4, c.x + cw / 2, top, z + cw * 0.4, cm, b.r()));
    parts.push(boxAt(c.x - cw / 2 - 0.06, top - 0.18, z - cw * 0.4 - 0.06, c.x + cw / 2 + 0.06, top - 0.06, z + cw * 0.4 + 0.06, cm));
    const pots = c.pots ?? 1, pm = b.mat({ kind: "plain-tile", colour: "#a2573b", soot: top + 0.42 });
    for (let i = 0; i < pots; i++) parts.push(coneY(c.x - cw / 2 + (cw * (i + 0.5)) / pots, z, top, top + 0.42, 0.13, 0.1, pm));
  }
  if (s.ivy) for (const v of s.ivy) b.grow({ x: v.x, z: D / 2 + 0.05, w: v.w, h: v.h, axis: "z" });
  b.add(...parts);
  return { eaves, ridge };
}

/** A hipped-gable roof: a gable whose top is hipped back at each end. */
function halfHip(s: RoofSpan, mat: number, tone: number): Node {
  const g = gableRoof(s, mat, tone), a = ((s.pitch + 12) * Math.PI) / 180, sn = Math.sin(a), cs = Math.cos(a);
  const xc = (s.x0 + s.x1) / 2, hl = (s.x1 - s.x0) / 2 + (s.over ?? 0.35), hd = (s.z1 - s.z0) / 2, rise = hd * Math.tan((s.pitch * Math.PI) / 180), yh = s.y + rise * 0.55;
  return leaf((x, y, z) => {
    const d = g.f(x, y, z), endPlane = (Math.abs(x - xc) - hl) * sn + (y - yh) * cs;
    return Math.max(d, endPlane);
  }, g.lo, g.hi, mat, tone);
}

/** A front gable parapet: stepped, necked or bell-shaped (Dutch and Hanseatic gables), standing just above the roof. */
function gableParapet(b: SceneBuilder, kind: RoofKind, W: number, rise: number, eaves: number, zf: number, mat: number, trim?: SurfaceSpec): Node[] {
  const t = 0.35, hw = W / 2, parts: Node[] = [], H = rise + 1.1;
  const halfWidth = (yy: number): number => {
    const f = yy / H;
    if (kind === "step-gable") { const steps = 5, k = Math.floor(f * steps); return hw * (1 - k / steps) * 0.98 + 0.01; }
    if (kind === "neck-gable") return f < 0.42 ? hw * (1 - f * 0.9) : Math.max(hw * 0.38, hw * 0.36);
    if (kind === "bell-gable") { const k = Math.max(0, 1 - f); return hw * (0.32 + 0.68 * (k * k * (3 - 2 * k)) ** 1.2); }
    return hw * Math.sqrt(Math.max(0, 1 - f * f)); // a curved (Baroque) gable
  };
  const top = kind === "step-gable" ? H : H * 1.02;
  parts.push(leaf((x, y, z) => {
    const yy = y - eaves, hwY = halfWidth(Math.min(top, Math.max(0, yy)));
    return Math.max(Math.abs(x) - hwY, Math.abs(z - (zf - t / 2 + 0.06)) - t / 2, -yy, yy - top) * 0.8;
  }, [-hw, eaves, zf - t], [hw, eaves + top, zf + 0.1], mat));
  if (trim) {
    // coping stones on the steps, or a cornice and finial on the neck
    const tm = b.mat(trim);
    if (kind === "step-gable") for (let k = 0; k < 5; k++) { const yy = ((k + 1) * H) / 5, w2 = hw * (1 - k / 5); parts.push(boxAt(-w2 - 0.04, eaves + yy - 0.08, zf - t - 0.03, -w2 + hw / 5 + 0.04, eaves + yy + 0.02, zf + 0.12, tm), boxAt(w2 - hw / 5 - 0.04, eaves + yy - 0.08, zf - t - 0.03, w2 + 0.04, eaves + yy + 0.02, zf + 0.12, tm)); }
    else { parts.push(boxAt(-hw * 0.42, eaves + top - 0.12, zf - t - 0.04, hw * 0.42, eaves + top + 0.05, zf + 0.15, tm), sphere(0, eaves + top + 0.22, zf - 0.1, 0.16, tm)); }
  }
  return parts;
}

// ---- Ground, streets and props ----------------------------------------------------------------------------------------------

/** Flat ground (street, yard, field) between x0…x1, z0…z1 at height `y`, in world coordinates; the highest zone over a point is the one seen. */
export function ground(b: SceneBuilder, x0: number, x1: number, z0: number, z1: number, s: SurfaceSpec, y = 0) {
  b.grounds.push({ x0, x1, z0, z1, y, mat: b.mat(s) });
}
/** A cobbled street with flagstone pavements and kerbs on each side. */
export function street(b: SceneBuilder, x0: number, x1: number, zKerbA: number, zKerbB: number, cobble: SurfaceSpec = { kind: "cobbles", moss: 0.3 }, pave: SurfaceSpec = { kind: "flags", moss: 0.2 }) {
  ground(b, x0, x1, zKerbA, zKerbB, cobble, -0.12);
  const kerb = b.mat({ kind: "ashlar", colour: "#8b857a", course: 0.25, unit: 0.9, age: 0.7 });
  b.add(boxAt(x0, -0.6, zKerbA - 0.25, x1, 0.02, zKerbA, kerb), boxAt(x0, -0.6, zKerbB, x1, 0.02, zKerbB + 0.25, kerb));
  ground(b, x0, x1, zKerbA - 6, zKerbA - 0.25, pave, 0.02);
  ground(b, x0, x1, zKerbB + 0.25, zKerbB + 8, pave, 0.02);
  b.place();
}
/** A tree: a trunk forking into limbs, and a crown of leaf clusters round an irregular envelope; if it overhangs, its leaves dapple the light. */
export function tree(b: SceneBuilder, x: number, z: number, h = 8, r = 3, leaves: SurfaceSpec = { kind: "foliage" }, dapple = true) {
  const bark = b.mat({ kind: "oak", colour: "#4d4339" }), lm = b.mat(leaves), fork = h - r * 1.25;
  b.add(coneY(x, z, -0.2, fork, r * 0.1, r * 0.065, bark));
  const limbs = 4;
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + b.r() * 0.8, L = r * (0.55 + 0.25 * b.r());
    b.add(capsule(x, fork - 0.2, z, x + Math.cos(a) * L, fork + r * (0.55 + 0.3 * b.r()), z + Math.sin(a) * L, r * 0.045, bark));
  }
  // clusters on the crown's shell (light reaches them) and a few inside to close it
  const n = 16, cy = h - r * 0.85;
  for (let i = 0; i < n; i++) {
    const u = b.r() * 2 - 1, th = b.r() * Math.PI * 2, q = Math.sqrt(1 - u * u), shell = i < n - 4 ? 0.72 + 0.2 * b.r() : 0.25;
    const px = x + Math.cos(th) * q * r * shell, py = cy + u * r * 0.72 * shell + r * 0.1, pz = z + Math.sin(th) * q * r * shell, rr = r * (0.32 + 0.16 * b.r());
    b.add(clump(px, py, pz, rr * 1.15, rr * 0.9, rr * 1.15, lm, b.r()));
  }
  if (dapple) b.shade({ x, z, y: cy + r * 0.2, r: r * 1.05, density: 0.85 });
}
/** A cypress (Tuscan, Mediterranean): a tall narrow flame. */
export function cypress(b: SceneBuilder, x: number, z: number, h = 10) {
  const lm = b.mat({ kind: "foliage", colour: "#2c3d22" });
  b.add(revolve(x, z, 0.4, h, t => 0.9 * Math.sin(Math.PI * Math.min(1, t * 1.08)) ** 0.7 * (1 - t * 0.45), 1, lm, 0, 3));
}
/** A street lamp on an iron post (lit at dusk and night). */
export function lamppost(b: SceneBuilder, x: number, z: number, h = 3.2) {
  const iron = b.mat({ kind: "iron", age: 0.3 });
  b.add(cylY(x, z, 0, h, 0.05, iron), cylY(x, z, 0, 0.5, 0.1, iron));
  b.add(...lanternParts(b, x, h + 0.2, z));
  b.light({ x, y: h + 0.2, z, kelvin: 2000, power: 0.6, shadow: true, lamp: true });
}
/** A stack of firewood under a little lean-to roof against a wall at z = `zf` (facing +z). */
export function firewood(b: SceneBuilder, x: number, zf: number, w = 1.8, h = 1.2) {
  b.add(boxAt(x - w / 2, 0, zf, x + w / 2, h, zf + 0.45, b.mat({ kind: "firewood" })));
  b.add(pentRoof(x - w / 2 - 0.15, x + w / 2 + 0.15, zf, 0.7, h + 0.4, 25, b.mat({ kind: "boards", colour: "#4e4030", age: 0.8 })));
}
/** A barrel: oak staves with two iron hoops. */
export function barrel(b: SceneBuilder, x: number, z: number, r = 0.32, h = 0.85) {
  const oak = b.mat({ kind: "boards", colour: "#6a4c32", course: 0.09 }), iron = b.mat({ kind: "iron", age: 0.5 });
  b.add(revolve(x, z, 0, h, t => r * (0.86 + 0.14 * Math.sin(Math.PI * t)), r, oak, 0, 0.6));
  for (const t of [0.15, 0.85]) b.add(cylY(x, z, h * t - 0.02, h * t + 0.02, r * (0.86 + 0.14 * Math.sin(Math.PI * t)) + 0.008, iron));
}
/** A bench against a wall. */
export function bench(b: SceneBuilder, x: number, zf: number, w = 1.6) {
  const oak = b.mat({ kind: "oak", colour: "#6a5440" });
  b.add(boxAt(x - w / 2, 0.42, zf + 0.05, x + w / 2, 0.47, zf + 0.42, oak), boxAt(x - w / 2 + 0.1, 0, zf + 0.1, x - w / 2 + 0.16, 0.42, zf + 0.37, oak), boxAt(x + w / 2 - 0.16, 0, zf + 0.1, x + w / 2 - 0.1, 0.42, zf + 0.37, oak));
}
/** A dry-stone or mortared garden wall along x. */
export function gardenWall(b: SceneBuilder, x0: number, x1: number, z: number, h = 1.1, s: SurfaceSpec = { kind: "rubble", moss: 0.5, age: 0.7 }) {
  const m = b.mat(s);
  b.add(boxAt(x0, 0, z - 0.25, x1, h, z + 0.25, m, b.r(), 0.03), boxAt(x0, h, z - 0.3, x1, h + 0.12, z + 0.3, m, b.r(), 0.04));
}
/** Distant hills: low, broad swells that the air turns blue. */
export function hills(b: SceneBuilder, z: number, n = 4, h = 40, s: SurfaceSpec = { kind: "grass", colour: "#5f7040" }) {
  const m = b.mat(s);
  for (let i = 0; i < n; i++) b.add(ellipsoid((i - n / 2) * 140 + b.r(-30, 30), -h * 0.4, z - b.r(0, 80), 120 + b.r(0, 60), h * (0.8 + b.r(0, 0.6)), 80, m, b.r()));
  b.place();
}
/** Water at `y` over x0…x1, z0…z1 (a canal, a river, the sea), in world coordinates. */
export function water(b: SceneBuilder, x0: number, x1: number, z0: number, z1: number, y = -0.8, colour = "#2e4c4f") {
  b.grounds.push({ x0, x1, z0, z1, y, mat: b.mat({ kind: "water", colour }) });
}

// ---- Towers, spires, domes ----------------------------------------------------------------------------------------------------

export interface TowerSpec {
  x?: number; z?: number;
  /** Round or square (or octagonal). */
  plan: "round" | "square" | "octagon";
  r: number; h: number;
  wall: SurfaceSpec;
  roof?: { kind: "cone" | "pyramid" | "spire" | "dome" | "onion" | "none" | "helm"; h: number; mat: SurfaceSpec; over?: number };
  /** Battlements: merlons and crenels. */
  crenel?: boolean;
  /** Machicolations: a corbelled gallery below the parapet. */
  machicolation?: boolean;
  /** Slit windows up the shaft. */
  slits?: number;
  /** A clock face at this height. */
  clock?: number;
  /** A belfry with open arches near the top. */
  belfry?: boolean;
  /** A lantern or finial. */
  finial?: SurfaceSpec;
}
/** A tower (castle tower, campanile, church tower, clock tower, chimney of a kiln). */
export function tower(b: SceneBuilder, t: TowerSpec): number {
  const x = t.x ?? 0, z = t.z ?? 0, wm = b.mat(t.wall), parts: Node[] = [];
  const shaft = t.plan === "round" ? cylY(x, z, 0, t.h, t.r, wm, b.r()) : t.plan === "square" ? boxAt(x - t.r, 0, z - t.r, x + t.r, t.h, z + t.r, wm, b.r()) : spireShaft(x, z, t.h, t.r, wm);
  const cutters: Node[] = [];
  if (t.slits) for (let i = 0; i < t.slits; i++) { const y = 2.5 + (i * (t.h - 5)) / Math.max(1, t.slits); cutters.push(opening(x + (i % 2 ? 0.5 : -0.5) * t.r * 0.3, y, 0.14, 1.0, "flat", z + t.r - 0.5, z + t.r + 0.4)); }
  if (t.belfry) for (const ax of ["z", "x"] as const) cutters.push(opening(ax === "z" ? x : z, t.h - 4.2, t.r * 0.8, 2.6, "round", (ax === "z" ? z : x) - t.r - 0.5, (ax === "z" ? z : x) + t.r + 0.5, ax));
  parts.push(cut(shaft, cutters));
  if (t.belfry) parts.push(cylY(x, z, t.h - 4.2, t.h - 0.5, t.r * 0.5, b.mat({ kind: "plain", colour: "#1a1512" })), revolve(x, z, t.h - 3.5, t.h - 2.2, q => 0.18 + 0.42 * q ** 1.6, 0.6, b.mat({ kind: "brass", colour: "#8a6a35" }), 0, 1));
  let top = t.h;
  if (t.machicolation) {
    const R = t.r + 0.45;
    parts.push(t.plan === "round" ? cylY(x, z, t.h, t.h + 1.4, R, wm, b.r()) : boxAt(x - R, t.h, z - R, x + R, t.h + 1.4, z + R, wm, b.r()));
    parts.push(t.plan === "round" ? repeatAround(box(x + t.r + 0.2, t.h - 0.45, z, 0.25, 0.45, 0.16, wm), x, z, Math.round(t.r * 4), t.r + 0.5) : repeatX(box(x - t.r + 0.2, t.h - 0.45, z + t.r + 0.2, 0.16, 0.45, 0.25, wm), 0.7, Math.floor((2 * t.r) / 0.7)));
    top = t.h + 1.4;
  }
  if (t.crenel) {
    const R = t.machicolation ? t.r + 0.45 : t.r;
    const merlon = t.plan === "round" ? repeatAround(box(x + R - 0.3, top + 0.55, z, 0.3, 0.55, 0.42, wm, b.r()), x, z, Math.round(R * 3.2), R + 0.1)
      : union([repeatX(box(x - R + 0.35, top + 0.55, z + R - 0.3, 0.35, 0.55, 0.3, wm), 1.2, Math.floor((2 * R) / 1.2) + 1), repeatZ2(box(x + R - 0.3, top + 0.55, z - R + 0.35, 0.3, 0.55, 0.35, wm), 1.2, Math.floor((2 * R) / 1.2) + 1), repeatZ2(box(x - R + 0.3, top + 0.55, z - R + 0.35, 0.3, 0.55, 0.35, wm), 1.2, Math.floor((2 * R) / 1.2) + 1)]);
    parts.push(merlon);
  }
  if (t.clock) {
    const face = b.mat({ kind: "plain", colour: "#efe6cf" }), gold = b.mat({ kind: "gold" }), zf = z + t.r + 0.06;
    parts.push(cylZ(x, t.clock, zf - 0.1, zf, 1.0, face), cylZ(x, t.clock, zf - 0.12, zf - 0.02, 1.12, gold));
    parts.push(beam(x, t.clock, zf + 0.02, x + 0.45, t.clock + 0.35, zf + 0.02, 0.06, b.mat({ kind: "iron" })), beam(x, t.clock, zf + 0.04, x - 0.05, t.clock + 0.75, zf + 0.04, 0.05, b.mat({ kind: "iron" })));
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; parts.push(box(x + Math.cos(a) * 0.85, t.clock + Math.sin(a) * 0.85, zf + 0.01, 0.05, 0.05, 0.02, gold)); }
  }
  if (t.roof && t.roof.kind !== "none") {
    const rm = b.mat(t.roof.mat), over = t.roof.over ?? 0.3, R = (t.machicolation ? t.r + 0.45 : t.r) + over;
    const y0 = top - (t.crenel ? -0.0 : 0);
    if (t.roof.kind === "cone") parts.push(coneY(x, z, y0, y0 + t.roof.h, R, 0.02, rm, b.r()));
    else if (t.roof.kind === "pyramid" || t.roof.kind === "helm") parts.push(spire(x, z, y0, y0 + t.roof.h, R, 4, rm, b.r(), Math.PI / 4));
    else if (t.roof.kind === "spire") parts.push(spire(x, z, y0, y0 + t.roof.h, R * 0.85, 8, rm, b.r()));
    else if (t.roof.kind === "dome") parts.push(dome(x, y0, z, R, t.roof.h, rm, b.r()));
    else if (t.roof.kind === "onion") parts.push(onionDome(x, z, y0, R, t.roof.h, rm));
    top = y0 + t.roof.h;
    if (t.finial) { const fm = b.mat(t.finial); parts.push(cylY(x, z, top - 0.2, top + 0.9, 0.03, fm), sphere(x, top + 0.35, z, 0.12, fm)); top += 0.9; }
  }
  b.add(...parts);
  return top;
}
/** An onion dome: a bulb swelling past its drum, then drawing up into a point. */
export function onionDome(x: number, z: number, y0: number, r: number, h: number, mat: number): Node {
  return revolve(x, z, y0, y0 + h, t => {
    if (t < 0.45) return r * (0.82 + 0.42 * Math.sin((t / 0.45) * Math.PI * 0.62));
    const k = (t - 0.45) / 0.55; return r * 1.2 * Math.cos(k * Math.PI * 0.5) ** 1.6 * (1 - k * 0.15) + 0.02;
  }, r * 1.25, mat, 0, 2.8);
}
/** An octagonal shaft (a lantern, a spire's base). */
function spireShaft(x: number, z: number, h: number, r: number, mat: number): Node {
  const step = Math.PI / 4;
  return leaf((px, py, pz) => {
    const qx = px - x, qz = pz - z, a = Math.atan2(qz, qx), k = Math.round(a / step) * step, d = qx * Math.cos(k) + qz * Math.sin(k) - r;
    return Math.max(d, -py, py - h);
  }, [x - r * 1.09, 0, z - r * 1.09], [x + r * 1.09, h, z + r * 1.09], mat);
}
const repeatZ2 = (n: Node, step: number, count: number): Node => {
  const z0 = (n.lo[2] + n.hi[2]) / 2;
  return { lo: [n.lo[0], n.lo[1], n.lo[2]], hi: [n.hi[0], n.hi[1], n.hi[2] + step * (count - 1)], f: (x, y, z) => n.f(x, y, z - Math.min(count - 1, Math.max(0, Math.round((z - z0) / step))) * step) };
};

// re-exported for generators elsewhere
export { beam, box, boxAt, capsule, clump, coneY, cut, cylX, cylY, cylZ, dome, ellipsoid, gableRoof, gableWall, hipRoof, leaf, mansard, opening, openingTop, pentRoof, repeatAround, repeatWheel, repeatX, revolve, sphere, spire, union };
