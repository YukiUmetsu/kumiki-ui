/** Crafted 3D interiors, furniture, fixtures, devices and yards from an `InteriorPlan`.
 *
 * Builds into the semantic part groups the layout already declares:
 * partitions (studs, drywall both faces, baseboards) with interior doors on
 * hinge pivots, per-room floor finishes, ~40 furnishing kinds, electrical
 * devices and landscape items. Every furnishing is built in a local frame
 * (origin on the floor, front +Z) and placed by its plan pose; its animatable
 * sub-parts (`<id>.door-left`, `.drawer`, `.oven-door`…) are pivot groups with
 * `userData.motion` = { type: "rotate" | "slide", axis, amount } so generic
 * actions or a part rig can open them.
 */
import {
  BoxGeometry, CylinderGeometry, Euler, ExtrudeGeometry, Group, IcosahedronGeometry, LatheGeometry, Matrix4, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector2, Vector3,
} from "three";
import type { BufferAttribute, BufferGeometry, Material, Object3D } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { AssetResources } from "../craft/hero-asset";
import { seededRandom } from "../craft/canvas-texture";
import type { HomeMaterials } from "./home-materials-3d";
import type { InteriorMaterials } from "./home-interior-materials-3d";
import { PARTITION_THICKNESS } from "./home-interior-model";
import type { ElectricalDevice, Furnishing, InteriorPlan, YardItem } from "./home-interior-model";
import type { HouseLayout } from "./home-model";
import { createGeometryBatch, meshIn } from "./home-parts-3d";
import type { GeometryBatch } from "./home-parts-3d";

type V3 = [number, number, number];
export interface PartMotion { type: "rotate" | "slide"; axis: "x" | "y" | "z"; amount: number }

const compose = (c: V3, rot?: V3, s?: V3) => new Matrix4().compose(new Vector3(...c), new Quaternion().setFromEuler(new Euler(...(rot ?? [0, 0, 0]))), new Vector3(...(s ?? [1, 1, 1])));

/** Multi-material batch: one merged mesh per material. */
function kit() {
  const map = new Map<Material, GeometryBatch>();
  const B = (m: Material) => { let b = map.get(m); if (!b) { b = createGeometryBatch(); map.set(m, b); } return b; };
  const api = {
    box(m: Material, size: V3, c: V3, rot?: V3, color?: readonly [number, number, number]) { B(m).box(size, compose(c, rot), color ? { color } : undefined); return api; },
    round(m: Material, size: V3, c: V3, r = .02, rot?: V3) {
      const rr = Math.max(.001, Math.min(r, Math.min(...size) / 2 - .001));
      B(m).geometry(new RoundedBoxGeometry(size[0], size[1], size[2], 2, rr), compose(c, rot)); return api;
    },
    cyl(m: Material, rt: number, rb: number, h: number, c: V3, rot?: V3, seg = 16) { B(m).geometry(new CylinderGeometry(rt, rb, h, seg), compose(c, rot)); return api; },
    lathe(m: Material, pts: Array<[number, number]>, c: V3, seg = 28, s?: V3, rot?: V3) { B(m).geometry(new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg), compose(c, rot, s)); return api; },
    sphere(m: Material, r: number, c: V3, s?: V3, rot?: V3) { B(m).geometry(new SphereGeometry(r, 20, 14), compose(c, rot, s)); return api; },
    torus(m: Material, R: number, r: number, c: V3, rot?: V3, arc = Math.PI * 2) { B(m).geometry(new TorusGeometry(R, r, 10, 32, arc), compose(c, rot)); return api; },
    geom(m: Material, g: BufferGeometry, mtx?: Matrix4) { B(m).geometry(g, mtx); return api; },
    into(res: AssetResources, parent: Object3D) { for (const [m, b] of map) meshIn(res, parent, b.build(), m); map.clear(); },
  };
  return api;
}
type Kit = ReturnType<typeof kit>;

export interface InteriorBuildContext {
  layout: HouseLayout;
  plan: InteriorPlan;
  res: AssetResources;
  group(id: string): Group;
  has(id: string): boolean;
  m: HomeMaterials;
  im: InteriorMaterials;
  seed?: number;
}

/** Build partitions, doors, floors, furniture, devices and yard into the layout's part groups. Returns moving pivots. */
export function buildInterior(ctx: InteriorBuildContext): Map<string, Object3D> {
  const { layout, plan, res, group: G, has, m, im } = ctx;
  const moving = new Map<string, Object3D>();
  const random = seededRandom(ctx.seed ?? 31);
  const H = layout.dims.storeyHeight, ceilingAt = (s: number) => layout.dims.floorY + s * H + H - .3;
  const HALF = PARTITION_THICKNESS / 2;
  const slot = (id: string, pivot: V3, motion?: PartMotion) => {
    if (!has(id)) { const g = new Group(); g.position.set(...pivot); return g; }
    const g = G(id); g.position.set(...pivot); if (motion) g.userData.motion = motion; moving.set(id, g); return g;
  };

  /* ------------------------------------------------------------- floors */
  for (const r of plan.floorPlan.rooms) {
    const room = plan.rooms.find(q => q.id === r.id)!;
    const id = `structure.floor-${room.storey + 1}`;
    if (!has(id) || (room.kind === "stair" && room.storey > 0)) continue;
    const mat = room.floor === "tile" ? im.floorTile : room.floor === "carpet" ? im.carpet : room.floor === "concrete" ? m.paving : m.floor;
    const k = kit();
    for (const q of r.rects) k.box(mat, [q.x1 - q.x0, .012, q.z1 - q.z0], [(q.x0 + q.x1) / 2, room.y - .006, (q.z0 + q.z1) / 2]);
    k.into(res, G(id));
  }

  /* --------------------------------------------- partitions and doors */
  const roomCenter = (id: string) => { const r = plan.rooms.find(q => q.id === id)!; return [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2]; };
  for (const p of plan.partitions) {
    if (!has(p.id)) continue;
    const g = G(p.id), y0 = layout.dims.floorY + p.storey * H, y1 = ceilingAt(p.storey);
    // Partition frame: local x along the wall, local z across it.
    if (p.axis === "x") g.position.set(0, 0, p.at); else { g.position.set(p.at, 0, 0); g.rotation.y = -Math.PI / 2; }
    const k = kit(), studs = createGeometryBatch();
    const openings = p.doors.map(d => [d.at - d.width / 2 - .03, d.at + d.width / 2 + .03, d.height + .03] as const).sort((a, b) => a[0] - b[0]);
    const segs: Array<[number, number]> = []; let cur = p.from;
    for (const [a, b] of openings) { if (a > cur) segs.push([cur, a]); cur = Math.max(cur, b); }
    if (cur < p.to) segs.push([cur, p.to]);
    const dw = .0125;
    for (const [a, b] of segs) for (const s of [-1, 1]) {
      k.box(m.drywall, [b - a, y1 - y0, dw], [(a + b) / 2, (y0 + y1) / 2, s * (HALF - dw / 2)]);
      k.box(m.trim, [b - a, .09, .012], [(a + b) / 2, y0 + .045, s * (HALF + .006)]);
    }
    for (const [a, b, h] of openings) for (const s of [-1, 1]) k.box(m.drywall, [b - a, y1 - (y0 + h), dw], [(a + b) / 2, (y0 + h + y1) / 2, s * (HALF - dw / 2)]);
    let seed = 0;
    const mem = (ax: number, ay: number, bx: number, by: number) => studs.member([ax, ay, 0], [bx, by, 0], [.038, .089], [0, 0, 1], seed++);
    mem(p.from, y0 + .019, p.to, y0 + .019); mem(p.from, y1 - .019, p.to, y1 - .019);
    for (const [a, b] of segs) for (let x = a + .019; x <= b - .019 + 1e-6; x += .406) mem(x, y0 + .038, x, y1 - .038);
    for (const [a, b, h] of openings) studs.member([a, y0 + h + .07, 0], [b, y0 + h + .07, 0], [.089, .14], [0, 1, 0], seed++);
    k.into(res, g);
    meshIn(res, g, studs.build(), m.lumber, "studs");
    for (const d of p.doors) {
      if (!has(d.id)) continue;
      const dg = G(d.id); dg.position.set(d.at, y0, 0);
      const dk = kit(), w = d.width, h = d.height;
      for (const s of [-1, 1]) {
        dk.box(m.trim, [.07, h + .07, .015], [-w / 2 - .035, (h + .07) / 2, s * (HALF + .0075)]).box(m.trim, [.07, h + .07, .015], [w / 2 + .035, (h + .07) / 2, s * (HALF + .0075)]);
        dk.box(m.trim, [w + .21, .07, .015], [0, h + .035, s * (HALF + .0075)]);
      }
      dk.box(m.trim, [.02, h, PARTITION_THICKNESS], [-w / 2 - .01, h / 2, 0]).box(m.trim, [.02, h, PARTITION_THICKNESS], [w / 2 + .01, h / 2, 0]).box(m.trim, [w + .04, .02, PARTITION_THICKNESS], [0, h + .01, 0]);
      dk.into(res, dg);
      if (d.kind === "opening") continue;
      // Which side of the wall the leaf swings into (local z).
      const [cx, cz] = roomCenter(d.into);
      const side = p.axis === "x" ? Math.sign(cz - p.at) || 1 : -(Math.sign(cx - p.at) || 1);
      const hingeX = d.hinge === "start" ? -w / 2 : w / 2, dir = d.hinge === "start" ? 1 : -1;
      if (d.kind === "swing") {
        const leaf = slot(`${d.id}.leaf`, [hingeX, 0, side * .02], { type: "rotate", axis: "y", amount: (d.hinge === "start" ? -side : side) * 1.45 });
        dg.add(leaf);
        const lk = kit(), lw = w - .01, lh = h - .015;
        lk.box(m.trim, [lw, lh, .035], [dir * lw / 2, lh / 2 + .008, 0]);
        // Two-panel shaker leaf: stiles and rails proud on both faces.
        for (const s of [-1, 1]) for (const [py, ph] of [[lh * .27, lh * .4], [lh * .72, lh * .4]] as const) {
          lk.box(m.trim, [lw - .2, .025, .006], [dir * lw / 2, py - ph / 2 + .01, s * .02]).box(m.trim, [lw - .2, .025, .006], [dir * lw / 2, py + ph / 2 - .01, s * .02]);
          lk.box(m.trim, [.025, ph, .006], [dir * .11, py, s * .02]).box(m.trim, [.025, ph, .006], [dir * (lw - .11), py, s * .02]);
        }
        for (const s of [-1, 1]) lk.sphere(im.brass, .028, [dir * (lw - .07), 1.0, s * .045], [1, 1, .8]).cyl(im.brass, .025, .025, .012, [dir * (lw - .07), 1.0, s * .022], [Math.PI / 2, 0, 0]);
        lk.into(res, leaf);
      } else {
        const leaf = slot(`${d.id}.leaf`, [0, 0, side * .02], { type: "slide", axis: "x", amount: -dir * w * .42 });
        dg.add(leaf);
        const lk = kit(), pw = (w - .02) / 4;
        for (let i = 0; i < 4; i++) {
          const x = -w / 2 + .01 + pw * (i + .5);
          lk.box(m.trim, [pw - .006, h - .03, .028], [x, (h - .03) / 2 + .01, 0]);
          for (const yy of [.35, .75]) lk.box(m.trim, [pw - .06, h * .36, .006], [x, h * yy, side * .015]);
        }
        lk.sphere(im.brass, .02, [w / 2 - pw, 1.0, side * .03]);
        lk.into(res, leaf);
      }
    }
  }

  /* ----------------------------------------------- exterior-wall baseboards */
  {
    const T = layout.dims.layers.total, bx0 = -layout.dims.width / 2 + T, bx1 = layout.dims.width / 2 - T, bz0 = -layout.dims.depth / 2 + T, bz1 = layout.dims.depth / 2 - T;
    for (const r of plan.floorPlan.rooms) {
      const room = plan.rooms.find(q => q.id === r.id)!;
      if (room.kind === "garage" || !has(`room.${room.id}`)) continue;
      const k = kit(), y = room.y;
      for (const q of r.rects) {
        if (Math.abs(q.z0 - bz0) < .02) k.box(m.trim, [q.x1 - q.x0, .09, .012], [(q.x0 + q.x1) / 2, y + .045, bz0 + .006]);
        if (Math.abs(q.z1 - bz1) < .02) k.box(m.trim, [q.x1 - q.x0, .09, .012], [(q.x0 + q.x1) / 2, y + .045, bz1 - .006]);
        if (Math.abs(q.x0 - bx0) < .02) k.box(m.trim, [.012, .09, q.z1 - q.z0], [bx0 + .006, y + .045, (q.z0 + q.z1) / 2]);
        if (Math.abs(q.x1 - bx1) < .02) k.box(m.trim, [.012, .09, q.z1 - q.z0], [bx1 - .006, y + .045, (q.z0 + q.z1) / 2]);
      }
      k.into(res, G(`room.${room.id}`));
    }
  }

  /* -------------------------------------------------------- furnishings */
  for (const f of plan.furnishings) {
    if (!has(f.id)) continue;
    const g = G(f.id);
    g.position.set(...f.position); g.rotation.y = f.yaw;
    const k = kit();
    const sub = (name: string, pivot: V3, motion: PartMotion) => { const s = slot(`${f.id}.${name}`, pivot, motion); if (s.parent !== g) g.add(s); return s; };
    FURNISH[f.kind]?.(k, f, { sub, res, im, m, random, storeyHeight: H });
    k.into(res, g);
  }

  /* ------------------------------------------------------------ devices */
  for (const e of plan.electrical) if (has(e.id)) buildDevice(G(e.id), e, res, im, m);

  /* -------------------------------------------------------------- yard */
  for (const y of plan.yard) if (has(y.id)) buildYard(G(y.id), y, res, im, m);
  return moving;
}

/* ----------------------------------------------------------- furnishing */

interface FurnishTools { sub(name: string, pivot: V3, motion: PartMotion): Group; res: AssetResources; im: InteriorMaterials; m: HomeMaterials; random: () => number; storeyHeight: number }
type Builder = (k: Kit, f: Furnishing, t: FurnishTools) => void;
const legs = (k: Kit, mat: Material, w: number, d: number, h: number, inset = .06, r = .018) => { for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.cyl(mat, r, r * .75, h, [sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset)], undefined, 10); };
/** A child kit that builds into a moving sub-part. */
const into = (t: FurnishTools, g: Group, build: (k: Kit) => void) => { const k = kit(); build(k); k.into(t.res, g); };

const FURNISH: Partial<Record<Furnishing["kind"], Builder>> = {
  sofa(k, f, { im }) { seating(k, f.size, im, f.size[0] > 1.5 ? 3 : 1); },
  armchair(k, f, { im }) { seating(k, f.size, im, 1); },
  "coffee-table"(k, f, { im }) {
    const [w, h, d] = f.size;
    k.round(im.walnut, [w, .04, d], [0, h - .02, 0], .012).box(im.walnut, [w - .14, .02, d - .14], [0, .13, 0]);
    legs(k, im.walnut, w, d, h - .04, .07, .02);
  },
  "tv-console"(k, f, { im }) {
    const [w, h, d] = f.size;
    k.round(im.walnut, [w, h - .1, d], [0, .1 + (h - .1) / 2, 0], .01);
    for (let i = 0; i < 3; i++) for (let s = 0; s < 8; s++) k.box(im.oak, [.012, h - .16, .01], [-w / 2 + w / 3 * (i + .5) - .14 + s * .04, .1 + (h - .1) / 2, d / 2 + .004]);
    legs(k, im.blackMetal, w, d, .1, .08, .012);
  },
  tv(k, f, { im }) {
    const [w, h] = f.size;
    k.round(im.blackMetal, [w, h, .035], [0, h / 2, -.0], .006).box(im.blackGlass, [w - .02, h - .02, .002], [0, h / 2, .018]);
    if (f.variant !== "above-mantel") k.box(im.blackMetal, [.3, .012, .18], [0, -.05, 0]).box(im.blackMetal, [.04, .06, .03], [0, -.02, -.01]);
  },
  rug(k, f, { im }) { k.geom(im.rug, new BoxGeometry(f.size[0], .012, f.size[2]), compose([0, .006, 0])); },
  "floor-lamp"(k, _f, { im }) {
    k.cyl(im.blackMetal, .15, .16, .025, [0, .0125, 0], undefined, 28).cyl(im.blackMetal, .011, .011, 1.42, [0, .74, 0]);
    k.lathe(im.canvas, [[.2, 0], [.17, .32]], [0, 1.32, 0], 32).sphere(im.bulb, .045, [0, 1.42, 0]);
  },
  bookshelf(k, f, { im, random }) {
    const [w, h, d] = f.size, t = .022;
    k.box(im.walnut, [t, h, d], [-w / 2 + t / 2, h / 2, 0]).box(im.walnut, [t, h, d], [w / 2 - t / 2, h / 2, 0]).box(im.walnut, [w, t, d], [0, h - t / 2, 0]).box(im.walnut, [w, .06, d], [0, .03, 0]).box(im.walnut, [w, h, .01], [0, h / 2, -d / 2 + .005]);
    const shelves = Math.max(3, Math.round(h / .38));
    for (let i = 1; i < shelves; i++) {
      const y = .06 + (h - .08) * i / shelves;
      k.box(im.walnut, [w - t * 2, t, d - .01], [0, y, .005]);
      let x = -w / 2 + t + .01;
      while (x < w / 2 - t - .06) {
        const bw = .022 + random() * .03, bh = .17 + random() * .12, tone = .3 + random() * .6;
        const hue = random();
        const color: [number, number, number] = hue < .33 ? [tone, tone * .55, tone * .4] : hue < .66 ? [tone * .4, tone * .55, tone * .8] : [tone * .85, tone * .82, tone * .7];
        if (random() < .1) { x += .05; continue; }
        k.box(im.books, [bw, bh, d * .78], [x + bw / 2, y + t / 2 + bh / 2, .01], undefined, color);
        x += bw + .002;
      }
    }
  },
  fireplace(k, f, { im, m }) {
    const [w, h, d] = f.size;
    k.box(im.lacquer, [.2, h, d], [-w / 2 + .1, h / 2, 0]).box(im.lacquer, [.2, h, d], [w / 2 - .1, h / 2, 0]).box(im.lacquer, [w, .24, d], [0, h - .12, 0]);
    k.round(im.walnut, [w + .16, .06, d + .08], [0, h + .03, .04], .01);
    k.box(m.brick, [w - .4, h - .24, .04], [0, (h - .24) / 2, -d / 2 + .02]).box(im.blackMetal, [w - .4, .02, d], [0, .02, 0]);
    k.box(im.quartz, [w + .3, .05, .45], [0, .025, d / 2 + .2]);
    for (const [x, rz] of [[-.15, .3], [.12, -.25]] as const) k.cyl(im.bark ?? m.lumber, .05, .05, .5, [x, .1, -.02], [0, rz, Math.PI / 2]);
    k.box(im.ember, [w - .5, .05, .2], [0, .05, 0]);
  },
  bed(k, f, { im }) {
    const [w, , l] = f.size;
    k.round(im.walnut, [w + .08, .22, l + .04], [0, .2, 0], .015);
    legs(k, im.walnut, w + .08, l + .04, .1, .05, .025);
    k.round(im.upholstery, [w + .12, 1.0, .09], [0, .5, -l / 2 - .03], .03);
    for (let i = 0; i < Math.round(w / .3); i++) k.box(im.upholstery, [.012, .5, .01], [-w / 2 + (i + .5) * w / Math.round(w / .3), .62, -l / 2 + .02]);
    k.round(im.linen, [w, .24, l - .04], [0, .43, .01], .06);
    k.round(im.duvet, [w + .05, .07, l * .7], [0, .58, l * .15], .03).round(im.linen, [w + .06, .075, .26], [0, .585, -l * .21], .03);
    k.round(im.upholsteryAccent, [w + .08, .025, .42], [0, .62, l / 2 - .4], .01);
    const n = w > 1.3 ? 2 : 1;
    for (let i = 0; i < n; i++) k.round(im.linen, [w / n - .08, .15, .42], [(i - (n - 1) / 2) * (w / n), .63, -l / 2 + .32], .06, [-.25, 0, 0]);
  },
  nightstand(k, f, t) {
    const [w, h, d] = f.size;
    k.round(t.im.walnut, [w, h - .08, d], [0, .08 + (h - .08) / 2, 0], .008);
    legs(k, t.im.walnut, w, d, .08, .04, .015);
    const dr = t.sub("drawer", [0, h - .14, d / 2], { type: "slide", axis: "z", amount: .26 });
    into(t, dr, q => q.box(t.im.oak, [w - .04, .14, .02], [0, 0, .005]).cyl(t.im.brass, .012, .012, .03, [0, 0, .025], [Math.PI / 2, 0, 0]).box(t.im.oak, [w - .08, .1, d - .06], [0, 0, -d / 2 + .01]));
  },
  "table-lamp"(k, _f, { im }) {
    k.lathe(im.porcelain, [[0, 0], [.07, 0], [.09, .08], [.05, .2], [.02, .24], [0, .24]], [0, 0, 0], 24);
    k.lathe(im.canvas, [[.15, 0], [.11, .22]], [0, .24, 0], 32).sphere(im.bulb, .035, [0, .3, 0]);
  },
  dresser(k, f, t) {
    const [w, h, d] = f.size;
    k.round(t.im.walnut, [w, h - .1, d], [0, .1 + (h - .1) / 2, 0], .01);
    legs(k, t.im.walnut, w, d, .1, .05, .018);
    const rows = 3, dh = (h - .14) / rows;
    for (let i = 0; i < rows; i++) {
      const dr = t.sub(`drawer-${i + 1}`, [0, .12 + dh * (i + .5), d / 2], { type: "slide", axis: "z", amount: .3 });
      into(t, dr, q => { q.box(t.im.oak, [w - .04, dh - .02, .02], [0, 0, .005]); for (const s of [-1, 1]) q.cyl(t.im.brass, .01, .01, .03, [s * w * .25, 0, .025], [Math.PI / 2, 0, 0]); q.box(t.im.oak, [w - .08, dh - .05, d - .06], [0, 0, -d / 2 + .01]); });
    }
  },
  desk(k, f, t) {
    const [w, h, d] = f.size;
    k.round(t.im.oak, [w, .03, d], [0, h - .015, 0], .006);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.box(t.im.blackMetal, [.03, h - .03, .03], [sx * (w / 2 - .04), (h - .03) / 2, sz * (d / 2 - .04)]);
    k.box(t.im.oak, [.42, .14, d - .06], [w / 2 - .26, h - .1, 0]);
    const dr = t.sub("drawer", [w / 2 - .26, h - .1, d / 2 - .02], { type: "slide", axis: "z", amount: .3 });
    into(t, dr, q => q.box(t.im.oak, [.4, .12, .02], [0, 0, .005]).cyl(t.im.brass, .01, .01, .03, [0, 0, .025], [Math.PI / 2, 0, 0]));
    k.box(t.im.blackGlass, [.34, .012, .23], [-.1, h + .006, -.05]).box(t.im.blackGlass, [.34, .22, .012], [-.1, h + .12, -.16], [-.25, 0, 0]);
  },
  "desk-chair"(k, f, t) {
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; k.box(t.im.blackMetal, [.3, .025, .04], [Math.cos(a) * .15, .07, Math.sin(a) * .15], [0, -a, 0]).sphere(t.im.rubber, .025, [Math.cos(a) * .29, .025, Math.sin(a) * .29]); }
    k.cyl(t.im.chrome, .022, .022, .33, [0, .24, 0]);
    const seat = t.sub("seat", [0, .42, 0], { type: "rotate", axis: "y", amount: Math.PI * .6 });
    into(t, seat, q => q.round(t.im.upholstery, [.48, .08, .46], [0, .04, 0], .03).round(t.im.upholstery, [.46, .5, .07], [0, .36, -.21], .03, [-.12, 0, 0]).box(t.im.blackMetal, [.04, .3, .04], [0, .15, -.22]));
    void f;
  },
  "closet-rod"(k, f, { im, random }) {
    const [w, , d] = f.size;
    k.box(im.lacquer, [w, .02, d], [0, 1.8, 0]).cyl(im.chrome, .014, .014, w - .02, [0, 1.7, -d * .05], [0, 0, Math.PI / 2]);
    for (let x = -w / 2 + .08; x < w / 2 - .06; x += .07 + random() * .03) {
      const len = .75 + random() * .35, tone = .3 + random() * .6;
      k.box(im.garments, [.03, len, d * .82], [x, 1.66 - len / 2, -d * .05], [0, 0, (random() - .5) * .05], [tone, tone * (.7 + random() * .3), tone * (.6 + random() * .4)]);
    }
    for (let x = -w / 2 + .15; x < w / 2 - .1; x += .32) k.box(im.garments, [.28, .1, .3], [x, .05, d * .1], undefined, [.2, .18, .16]);
  },
  "base-cabinets"(k, f, t) { cabinet(k, f, t, true); },
  "upper-cabinets"(k, f, t) {
    const [w, h, d] = f.size;
    k.box(t.im.lacquer, [w - .004, h, d], [0, h / 2, 0]);
    k.box(t.im.lacquer, [w - .01, h - .02, .02], [0, h / 2, d / 2 + .008]).box(t.im.stainless, [.012, .14, .02], [w / 2 - .06, .12, d / 2 + .03]);
    shaker(k, t.im.lacquer, w - .01, h - .02, [0, h / 2, d / 2 + .02]);
  },
  sink(k, f, t) {
    const [w, , d] = f.size;
    cabinet(k, f, t, false);
    k.box(t.im.stainless, [.6, .2, .4], [0, .76, .02]).box(t.im.blackMetal, [.56, .01, .36], [0, .665, .02]);
    k.cyl(t.im.chrome, .02, .025, .06, [0, .94, -d / 2 + .1]).cyl(t.im.chrome, .012, .012, .32, [0, 1.1, -d / 2 + .1]);
    k.torus(t.im.chrome, .09, .012, [0, 1.26, -d / 2 + .19], [0, Math.PI / 2, 0], Math.PI).cyl(t.im.chrome, .012, .012, .1, [0, 1.21, -d / 2 + .28]);
    void w;
  },
  dishwasher(k, f, t) {
    const [w, , d] = f.size;
    k.box(t.im.blackMetal, [w - .01, .1, d - .07], [0, .05, -.03]).box(t.im.stainless, [w - .01, .78, d - .04], [0, .5, -.02]);
    const door = t.sub("door", [0, .1, d / 2 - .02], { type: "rotate", axis: "x", amount: Math.PI / 2 });
    into(t, door, q => q.box(t.im.stainless, [w - .01, .78, .02], [0, .39, .01]).box(t.im.blackGlass, [w - .03, .05, .005], [0, .74, .022]).box(t.im.chrome, [w * .6, .02, .02], [0, .68, .04]));
    countertop(k, w, d, t.im);
  },
  range(k, f, t) {
    const [w, , d] = f.size;
    k.box(t.im.stainless, [w - .01, .9, d - .02], [0, .45, -.01]).box(t.im.blackGlass, [w - .03, .012, d - .06], [0, .905, -.02]);
    for (const [x, z, r] of [[-.18, -.13, .085], [.18, -.13, .07], [-.18, .1, .07], [.18, .1, .085]] as const) k.torus(t.im.stainless, r, .006, [x, .915, z - .02], [Math.PI / 2, 0, 0]);
    k.box(t.im.stainless, [w - .01, .1, .04], [0, .86, d / 2 - .01]);
    for (let i = 0; i < 4; i++) k.cyl(t.im.blackMetal, .02, .02, .03, [-.24 + i * .16, .86, d / 2 + .02], [Math.PI / 2, 0, 0], 12);
    const door = t.sub("oven-door", [0, .1, d / 2], { type: "rotate", axis: "x", amount: Math.PI / 2.1 });
    into(t, door, q => q.box(t.im.stainless, [w - .03, .62, .03], [0, .31, .015]).box(t.im.blackGlass, [w - .2, .32, .005], [0, .33, .033]).cyl(t.im.chrome, .012, .012, w - .12, [0, .56, .07], [0, 0, Math.PI / 2]));
    k.box(t.im.wallTile, [w, .6, .012], [0, 1.2, -d / 2 + .006]);
  },
  hood(k, f, t) {
    const [w, h, d] = f.size;
    const s = new Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(.17, h * .5); s.lineTo(-.17, h * .5); s.closePath();
    k.geom(t.im.stainless, new ExtrudeGeometry(s, { depth: d, bevelEnabled: false }), compose([0, 0, -d / 2]));
    k.box(t.im.stainless, [.32, t.storeyHeight - .3 - 1.52 - h * .5, .25], [0, h * .5 + (t.storeyHeight - .3 - 1.52 - h * .5) / 2, -d / 2 + .125]);
    k.box(t.im.diffuser, [w - .1, .006, d - .1], [0, -.003, 0]);
  },
  fridge(k, f, t) {
    const [w, h, d] = f.size;
    k.round(t.im.stainless, [w, h, d - .04], [0, h / 2, -.02], .02);
    const doorH = h * .62, base = h - doorH;
    for (const [name, x, dir] of [["door-left", -w / 2, 1], ["door-right", w / 2, -1]] as const) {
      const door = t.sub(name, [x, base, d / 2 - .02], { type: "rotate", axis: "y", amount: dir * -1.6 });
      into(t, door, q => q.round(t.im.stainless, [w / 2 - .005, doorH - .01, .05], [dir * (w / 4), doorH / 2, .025], .01).cyl(t.im.chrome, .012, .012, doorH * .6, [dir * (w / 2 - .06), doorH / 2, .08]).box(t.im.chrome, [.02, .02, .03], [dir * (w / 2 - .06), doorH * .2, .06]).box(t.im.chrome, [.02, .02, .03], [dir * (w / 2 - .06), doorH * .8, .06]));
    }
    const fz = t.sub("freezer", [0, .05, d / 2 - .02], { type: "slide", axis: "z", amount: .45 });
    into(t, fz, q => q.round(t.im.stainless, [w - .01, base - .07, .05], [0, (base - .07) / 2, .025], .01).cyl(t.im.chrome, .012, .012, w * .7, [0, base - .16, .08], [0, 0, Math.PI / 2]).box(t.im.lacquer, [w - .08, base - .12, d - .12], [0, (base - .12) / 2, -d / 2 + .04]));
  },
  island(k, f, { im }) {
    const [w, , d] = f.size;
    k.box(im.blackMetal, [w - .08, .1, d - .2], [0, .05, 0]).box(im.lacquerDark, [w, .78, d - .16], [0, .49, 0]);
    for (let i = 0; i < Math.max(2, Math.round(w / .6)); i++) shaker(k, im.lacquerDark, w / Math.max(2, Math.round(w / .6)) - .01, .72, [-w / 2 + (i + .5) * w / Math.max(2, Math.round(w / .6)), .49, (d - .16) / 2 + .012]);
    k.round(im.quartz, [w + .08, .035, d + .1], [0, .9, .05], .006);
  },
  stool(k, _f, { im }) {
    k.cyl(im.walnut, .19, .18, .04, [0, .73, 0], undefined, 28);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; k.cyl(im.blackMetal, .012, .014, .74, [Math.cos(a) * .13, .36, Math.sin(a) * .13], [Math.sin(a) * .1, 0, -Math.cos(a) * .1]); }
    k.torus(im.blackMetal, .155, .008, [0, .26, 0], [Math.PI / 2, 0, 0]);
  },
  "dining-table"(k, f, { im }) {
    const [w, h, d] = f.size;
    k.round(im.walnut, [w, .04, d], [0, h - .02, 0], .01).box(im.walnut, [w - .14, .08, d - .14], [0, h - .08, 0]);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.box(im.walnut, [.055, h - .04, .055], [sx * (w / 2 - .08), (h - .04) / 2, sz * (d / 2 - .08)]);
  },
  chair(k, f, { im }) {
    const [w, , d] = f.size;
    legs(k, im.walnut, w, d, .44, .04, .018);
    k.round(im.upholstery, [w, .06, d - .04], [0, .47, .01], .02);
    for (const s of [-1, 1]) k.box(im.walnut, [.03, .5, .03], [s * (w / 2 - .04), .69, -d / 2 + .04], [-.08, 0, 0]);
    k.round(im.walnut, [w - .04, .08, .025], [0, .9, -d / 2 + .02], .01, [-.08, 0, 0]);
    for (let i = -1; i <= 1; i++) k.box(im.walnut, [.025, .34, .015], [i * .11, .69, -d / 2 + .04], [-.08, 0, 0]);
  },
  sideboard(k, f, { im }) {
    const [w, h, d] = f.size;
    k.round(im.walnut, [w, h - .12, d], [0, .12 + (h - .12) / 2, 0], .01);
    legs(k, im.blackMetal, w, d, .12, .06, .012);
    for (let i = 0; i < 4; i++) { const x = -w / 2 + w / 4 * (i + .5); k.box(im.oak, [w / 4 - .02, h - .18, .015], [x, .12 + (h - .12) / 2, d / 2 + .004]).cyl(im.brass, .01, .01, .025, [x + (i % 2 ? -1 : 1) * (w / 8 - .05), .12 + (h - .12) / 2, d / 2 + .02], [Math.PI / 2, 0, 0]); }
    k.lathe(im.porcelain, [[0, 0], [.06, 0], [.08, .1], [.04, .22], [.045, .26], [0, .26]], [w * .3, h, 0], 24);
  },
  bathtub(k, f, { im }) {
    const [w, h, d] = f.size;
    k.box(im.porcelain, [w, h - .04, .06], [0, (h - .04) / 2, d / 2 - .03]);
    k.box(im.porcelain, [w, .06, d], [0, h - .03, 0]).box(im.porcelain, [w, h, .05], [0, h / 2, -d / 2 + .025]);
    for (const s of [-1, 1]) k.box(im.porcelain, [.08, h, d], [s * (w / 2 - .04), h / 2, 0]);
    k.box(im.porcelain, [w - .16, .02, d - .11], [0, .2, -.005]);
    // Inner basin shell, slightly darker by being recessed.
    k.box(im.porcelain, [w - .2, h - .25, .02], [0, .2 + (h - .25) / 2, d / 2 - .07]).box(im.porcelain, [w - .2, h - .25, .02], [0, .2 + (h - .25) / 2, -d / 2 + .06]);
    // Tile surround to 1.95 m on the back wall and both ends.
    const th = 1.95 - h;
    k.box(im.wallTile, [w + .02, th, .012], [0, h + th / 2, -d / 2 - .006]);
    for (const s of [-1, 1]) k.box(im.wallTile, [.012, th + h, d], [s * (w / 2 + .006), (th + h) / 2, 0]);
    k.cyl(im.chrome, .012, .012, .28, [w / 2 - .25, 1.95, -d / 2 + .14], [Math.PI / 2, 0, 0]).cyl(im.chrome, .07, .05, .025, [w / 2 - .25, 1.93, -d / 2 + .28]);
    k.cyl(im.chrome, .055, .055, .012, [w / 2 - .25, 1.1, -d / 2 + .006], [Math.PI / 2, 0, 0]).box(im.chrome, [.02, .1, .02], [w / 2 - .25, 1.1, -d / 2 + .03]);
    k.cyl(im.chrome, .016, .016, .16, [w / 2 - .25, h + .12, -d / 2 + .08], [Math.PI / 2, 0, 0]);
    k.box(im.clearGlass, [w * .45, 1.35, .008], [w / 2 - w * .225, h + .675, d / 2 - .04]).box(im.chrome, [w * .45, .02, .02], [w / 2 - w * .225, h + 1.35, d / 2 - .04]);
  },
  toilet(k, f, t) {
    const [, , d] = f.size;
    k.lathe(t.im.porcelain, [[0, 0], [.13, 0], [.11, .08], [.12, .2], [.17, .32], [.19, .38], [.15, .4], [0, .4]], [0, 0, .06], 32, [1, 1, 1.25]);
    k.round(t.im.porcelain, [.42, .36, .17], [0, .57, -d / 2 + .09], .03).round(t.im.porcelain, [.44, .03, .19], [0, .765, -d / 2 + .09], .012);
    k.box(t.im.chrome, [.05, .015, .02], [-.14, .7, -d / 2 + .18]);
    const lid = t.sub("lid", [0, .41, -.12], { type: "rotate", axis: "x", amount: -1.45 });
    into(t, lid, q => q.geom(t.im.plastic, new TorusGeometry(.15, .025, 10, 40), compose([0, 0, .19], [Math.PI / 2, 0, 0], [1, 1.28, .5])).round(t.im.plastic, [.36, .02, .44], [0, .03, .2], .01));
  },
  vanity(k, f, t) {
    const [w, h, d] = f.size;
    k.box(t.im.walnut, [w, h - .1, d], [0, .1 + (h - .1) / 2, 0]).box(t.im.blackMetal, [w - .08, .1, d - .08], [0, .05, -.02]);
    const door = t.sub("door", [-w / 2 + .01, .12, d / 2], { type: "rotate", axis: "y", amount: -1.3 });
    into(t, door, q => q.box(t.im.oak, [w / 2 - .02, h - .16, .02], [(w / 2 - .02) / 2, (h - .16) / 2, .01]).box(t.im.brass, [.012, .1, .02], [w / 2 - .08, (h - .16) * .75, .03]));
    k.box(t.im.oak, [w / 2 - .02, h - .16, .02], [w / 4, .12 + (h - .16) / 2, d / 2 + .01]);
    k.round(t.im.quartz, [w + .02, .03, d + .02], [0, h - .015, 0], .006);
    k.lathe(t.im.porcelain, [[0, 0], [.1, 0], [.18, .05], [.2, .13], [.19, .14], [.16, .06], [0, .03]], [0, h, .02], 32, [1, 1, .75]);
    k.cyl(t.im.chrome, .018, .02, .28, [0, h + .14, -d / 2 + .08]).torus(t.im.chrome, .06, .01, [0, h + .28, -d / 2 + .14], [0, Math.PI / 2, 0], Math.PI);
  },
  mirror(k, f, { im }) {
    const [w, h] = f.size;
    k.round(im.blackMetal, [w, h, .02], [0, h / 2, 0], .006).box(im.mirror, [w - .04, h - .04, .004], [0, h / 2, .011]);
  },
  "towel-bar"(k, f, { im }) {
    const [w, h] = f.size;
    for (const s of [-1, 1]) k.cyl(im.chrome, .012, .012, .07, [s * w / 2, h, .035], [Math.PI / 2, 0, 0]);
    k.cyl(im.chrome, .01, .01, w, [0, h, .07], [0, 0, Math.PI / 2]);
    k.round(im.linen, [w * .7, .5, .025], [0, h - .25, .085], .01).cyl(im.linen, .03, .03, w * .7, [0, h, .07], [0, 0, Math.PI / 2]);
  },
  "pedestal-sink"(k, f, { im }) {
    const [, h] = f.size;
    k.lathe(im.porcelain, [[0, 0], [.13, 0], [.08, .1], [.07, h - .2], [.12, h - .1], [0, h - .1]], [0, 0, 0], 28);
    k.lathe(im.porcelain, [[0, h - .14], [.24, h - .06], [.25, h], [0, h]], [0, 0, .03], 32, [1, 1, .8]);
    k.cyl(im.chrome, .016, .02, .18, [0, h + .09, -.12]).box(im.chrome, [.02, .02, .12], [0, h + .17, -.07]);
  },
  washer(k, f, t) { laundry(k, f, t, true); },
  dryer(k, f, t) { laundry(k, f, t, false); },
  shelf(k, f, { im }) {
    const [w, h, d] = f.size;
    if (f.variant === "wall-high") { k.box(im.oak, [w, .025, d], [0, h, 0]); for (const s of [-1, 1]) k.box(im.blackMetal, [.02, .2, d - .04], [s * (w / 2 - .1), h - .1, 0]); return; }
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.box(im.blackMetal, [.03, h, .03], [sx * (w / 2 - .015), h / 2, sz * (d / 2 - .015)]);
    for (let i = 0; i < 4; i++) {
      const y = .1 + (h - .15) * i / 3;
      k.box(im.oak, [w, .02, d], [0, y, 0]);
      if (i < 3) for (let b = 0; b < 3; b++) k.round(im.plastic, [w / 3 - .04, .22, d - .06], [-w / 3 + b * w / 3, y + .12, 0], .02);
    }
  },
  workbench(k, f, { im }) {
    const [w, h, d] = f.size;
    k.box(im.oak, [w, .05, d], [0, h - .025, 0]).box(im.oak, [w - .1, .02, d - .1], [0, .2, 0]);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.box(im.blackMetal, [.05, h - .05, .05], [sx * (w / 2 - .05), (h - .05) / 2, sz * (d / 2 - .05)]);
    k.box(im.lacquer, [w, .8, .015], [0, h + .5, -d / 2 + .01]);
    for (let i = 0; i < 9; i++) k.box(i % 3 ? im.blackMetal : im.brass, [.03, .18 + (i % 4) * .05, .02], [-w / 2 + .2 + i * (w - .4) / 8, h + .55, -d / 2 + .03]);
    k.box(im.blackMetal, [.18, .12, .14], [w / 2 - .2, h + .06, d / 2 - .1]);
  },
  stair(k, f, { im, m }) {
    const [w, H, D] = f.size;
    const n = Math.ceil(H / .19), rise = H / n, run = (D - .1) / (n - 1);
    // Rises toward local +Z (the front of the back zone).
    for (let i = 0; i < n; i++) {
      const z = -D / 2 + run * i, y = rise * (i + 1);
      k.box(im.oak, [w, .03, run + .03], [0, y - .015, z + run / 2]);
      k.box(im.lacquer, [w - .02, rise - .03, .02], [0, y - rise / 2 - .015, z]);
    }
    const len = Math.hypot(D, H), ang = Math.atan2(H, D);
    for (const s of [-1, 1]) k.box(m.lumber, [.04, .3, len], [s * (w / 2 - .02), H / 2 - .12, 0], [-ang, 0, 0]);
    k.cyl(im.oak, .025, .025, len, [-w / 2 + .03, H / 2 + .88, 0], [Math.PI / 2 - ang, 0, 0]);
    for (let i = 1; i < n; i += 1) k.box(im.lacquer, [.025, .88, .025], [-w / 2 + .03, rise * (i + 1) + .44, -D / 2 + run * i + run / 2]);
    k.box(im.oak, [.09, 1.15, .09], [-w / 2 + .05, .575, -D / 2 + .05]);
  },
  plant(k, f, { im, random }) {
    const [, h] = f.size;
    k.lathe(im.terracotta, [[0, 0], [.13, 0], [.17, .32], [.185, .34], [.18, .36], [0, .34]], [0, 0, 0], 28).cyl(im.soilDark, .165, .165, .01, [0, .33, 0], undefined, 24);
    k.cyl(im.bark, .012, .015, h - .5, [0, .34 + (h - .5) / 2, 0]);
    for (let i = 0; i < 14; i++) {
      const a = random() * Math.PI * 2, y = .55 + random() * (h - .6), r = .08 + random() * .12;
      k.sphere(im.foliage, .11, [Math.cos(a) * r, y, Math.sin(a) * r], [1, .18, .65], [random() - .5, a, random() * .6 - .3]);
    }
  },
  car(k, f, t) {
    const [w, h, l] = f.size, im = t.im;
    const body = new Shape();
    const pts: Array<[number, number]> = [[-l / 2, .22], [-l / 2 + .05, .62], [-l / 2 + .9, .74], [-l / 2 + 1.45, 1.25], [l / 2 - 1.55, 1.3], [l / 2 - .95, .82], [l / 2 - .05, .7], [l / 2, .32], [l / 2 - .2, .2], [-l / 2 + .2, .2]];
    body.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts.slice(1)) body.lineTo(x, y); body.closePath();
    const g = new ExtrudeGeometry(body, { depth: w - .12, bevelEnabled: true, bevelThickness: .06, bevelSize: .05, bevelSegments: 3 });
    k.geom(im.carPaint, g, compose([(w - .12) / 2, 0, 0], [0, -Math.PI / 2, 0]));
    const glass = new Shape();
    const gp: Array<[number, number]> = [[-l / 2 + 1.5, .8], [-l / 2 + 1.5 + .08, 1.18], [l / 2 - 1.6, 1.22], [l / 2 - 1.0, .84]];
    glass.moveTo(gp[0][0], gp[0][1]); for (const [x, y] of gp.slice(1)) glass.lineTo(x, y); glass.closePath();
    k.geom(im.carGlass, new ExtrudeGeometry(glass, { depth: w - .02, bevelEnabled: false }), compose([(w - .02) / 2, 0, 0], [0, -Math.PI / 2, 0]));
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const zz = z * (l / 2 - .78);
      k.cyl(im.rubber, .32, .32, .22, [x * (w / 2 - .12), .32, zz], [0, 0, Math.PI / 2], 28).cyl(im.chrome, .2, .2, .225, [x * (w / 2 - .12), .32, zz], [0, 0, Math.PI / 2], 20);
    }
    for (const s of [-1, 1]) {
      k.box(im.diffuser, [.32, .08, .04], [s * (w / 2 - .25), .62, l / 2 + .01]).box(im.terracotta, [.3, .07, .04], [s * (w / 2 - .25), .66, -l / 2 - .01]);
      const door = t.sub(s < 0 ? "door-left" : "door-right", [s * (w / 2 + .01), .3, .25], { type: "rotate", axis: "y", amount: s * 1.0 });
      into(t, door, q => q.box(im.carPaint, [.012, .44, 1.05], [0, .25, -.52]).box(im.chrome, [.02, .02, .14], [s * .01, .42, -.8]));
    }
    k.box(im.blackMetal, [w - .1, .14, .08], [0, .3, l / 2 + .02]).box(im.blackMetal, [w - .1, .14, .08], [0, .3, -l / 2 - .02]);
    void h;
  },
};

function seating(k: Kit, size: readonly number[], im: InteriorMaterials, n: number) {
  const [w, , d] = size;
  legs(k, im.walnut, w - .1, d - .1, .1, .05, .02);
  k.round(im.upholstery, [w, .22, d], [0, .21, 0], .04);
  for (const s of [-1, 1]) k.round(im.upholstery, [.18, .6, d], [s * (w / 2 - .09), .4, 0], .06);
  k.round(im.upholstery, [w - .3, .52, .18], [0, .58, -d / 2 + .09], .05);
  const cw = (w - .36) / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + .18 + cw * (i + .5);
    k.round(im.upholstery, [cw - .01, .15, d - .26], [x, .395, .09], .05).round(im.upholstery, [cw - .02, .46, .18], [x, .62, -d / 2 + .25], .07, [-.16, 0, 0]);
  }
  if (n > 1) for (const s of [-1, 1]) k.round(im.upholsteryAccent, [.42, .4, .13], [s * (w / 2 - .45), .66, -d / 2 + .36], .06, [-.25, s * .25, s * .08]);
}
function shaker(k: Kit, mat: Material, w: number, h: number, c: V3) {
  const t = .055;
  k.box(mat, [w, t, .008], [c[0], c[1] + h / 2 - t / 2, c[2]]).box(mat, [w, t, .008], [c[0], c[1] - h / 2 + t / 2, c[2]]);
  k.box(mat, [t, h - t * 2, .008], [c[0] - w / 2 + t / 2, c[1], c[2]]).box(mat, [t, h - t * 2, .008], [c[0] + w / 2 - t / 2, c[1], c[2]]);
}
function countertop(k: Kit, w: number, d: number, im: InteriorMaterials) {
  k.box(im.quartz, [w, .03, d + .02], [0, .895, .01]).box(im.wallTile, [w, .53, .012], [0, .91 + .265, -d / 2 + .006]);
}
function cabinet(k: Kit, f: Furnishing, t: FurnishTools, doorPart: boolean) {
  const [w, , d] = f.size;
  k.box(t.im.blackMetal, [w - .01, .1, d - .07], [0, .05, -.03]).box(t.im.lacquer, [w - .004, .76, d - .04], [0, .48, -.02]);
  if (doorPart) {
    const door = t.sub("door", [-w / 2 + .005, .12, d / 2 - .03], { type: "rotate", axis: "y", amount: -1.5 });
    into(t, door, q => { q.box(t.im.lacquer, [w - .01, .72, .02], [(w - .01) / 2, .36, .01]); shaker(q, t.im.lacquer, w - .01, .72, [(w - .01) / 2, .36, .022]); q.box(t.im.stainless, [.012, .14, .02], [w - .07, .6, .035]); });
  } else {
    // Sink base: a pair of fixed doors under the bowl.
    const z = d / 2 - .02;
    for (const sx of [-1, 1]) { k.box(t.im.lacquer, [w / 2 - .01, .72, .02], [sx * w / 4, .48, z]); shaker(k, t.im.lacquer, w / 2 - .01, .72, [sx * w / 4, .48, z + .012]); k.box(t.im.stainless, [.012, .14, .02], [sx * .06, .72, z + .025]); }
  }
  countertop(k, w, d, t.im);
}
function laundry(k: Kit, f: Furnishing, t: FurnishTools, washer: boolean) {
  const [w, h, d] = f.size;
  k.round(t.im.plastic, [w, h, d], [0, h / 2, 0], .02).box(t.im.blackGlass, [w - .06, .08, .01], [0, h - .07, d / 2 + .002]).cyl(t.im.chrome, .03, .03, .02, [w / 2 - .1, h - .07, d / 2 + .01], [Math.PI / 2, 0, 0], 20);
  const door = t.sub("door", [-.2, h * .45, d / 2], { type: "rotate", axis: "y", amount: -1.7 });
  into(t, door, q => q.torus(t.im.chrome, .19, .03, [.2, 0, .03]).geom(washer ? t.im.blackGlass : t.im.plastic, new CylinderGeometry(.17, .17, .02, 32), compose([.2, 0, .03], [Math.PI / 2, 0, 0])));
}

/* -------------------------------------------------------------- devices */

function buildDevice(g: Group, e: ElectricalDevice, res: AssetResources, im: InteriorMaterials, m: HomeMaterials) {
  g.position.set(...e.position);
  const k = kit();
  const wall = Math.abs(e.normal[1]) < .5;
  if (wall) g.rotation.y = Math.atan2(e.normal[0], e.normal[2]);
  switch (e.kind) {
    case "ceiling-light": k.lathe(im.diffuser, [[0, -.075], [.14, -.07], [.18, -.03], [.18, 0]], [0, 0, 0], 32).torus(im.chrome, .18, .008, [0, -.005, 0], [Math.PI / 2, 0, 0]); break;
    case "pendant": k.cyl(im.blackMetal, .004, .004, .7, [0, -.35, 0]).lathe(im.blackMetal, [[.02, 0], [.05, -.04], [.17, -.2], [.18, -.21]], [0, -.7, 0], 32).sphere(im.bulb, .05, [0, -.85, 0]); break;
    case "vanity-light": k.box(im.chrome, [.6, .03, .05], [0, 0, .025]); for (const x of [-.22, 0, .22]) k.sphere(im.diffuser, .055, [x, -.02, .09]); break;
    case "switch": k.box(im.plastic, [.075, .12, .006], [0, 0, .003]).box(im.plastic, [.03, .06, .01], [0, 0, .007], [.12, 0, 0]); break;
    case "outlet":
      k.box(im.plastic, [.075, .12, .006], [0, 0, .003]);
      for (const y of [-.025, .025]) { k.box(im.plastic, [.04, .035, .006], [0, y, .007]); for (const x of [-.007, .007]) k.box(im.blackMetal, [.003, .01, .002], [x, y + .003, .011]); }
      break;
    case "smoke-detector": k.cyl(im.plastic, .065, .07, .03, [0, -.015, 0], undefined, 28).sphere(im.bulb, .005, [.03, -.032, 0]); break;
    case "exhaust-fan": k.box(im.plastic, [.26, .015, .26], [0, -.008, 0]); for (let i = 0; i < 7; i++) k.box(im.blackMetal, [.22, .004, .01], [0, -.017, -.105 + i * .035]); break;
    case "panel": k.box(m.steel, [.36, .6, .1], [0, 0, .05]).box(m.steel, [.34, .58, .01], [0, 0, .105]).box(im.plastic, [.1, .05, .002], [0, .2, .112]); break;
  }
  k.into(res, g);
}

/* ----------------------------------------------------------------- yard */

function foliageClump(radius: number, seed: number): BufferGeometry {
  const g = new IcosahedronGeometry(radius, 3);
  const pos = g.attributes.position as BufferAttribute, rnd = seededRandom(seed);
  const phase = [rnd() * 6, rnd() * 6, rnd() * 6];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1 + .16 * Math.sin(x * 5 + phase[0]) * Math.sin(y * 6 + phase[1]) + .1 * Math.sin(z * 9 + phase[2]) + .06 * Math.sin((x + y + z) * 14);
    pos.setXYZ(i, x * n, y * n * .9, z * n);
  }
  g.computeVertexNormals();
  return g;
}
function buildYard(g: Group, y: YardItem, res: AssetResources, im: InteriorMaterials, m: HomeMaterials) {
  g.position.set(...y.position); g.rotation.y = y.yaw;
  const k = kit(), [w, h, d] = y.size, rnd = seededRandom(y.seed * 97 + 13);
  switch (y.kind) {
    case "tree": {
      const trunkH = h * .45;
      k.lathe(im.bark, [[0, 0], [.2, 0], [.15, .25], [.12, trunkH], [.07, trunkH + .6], [0, trunkH + .6]], [0, 0, 0], 16);
      for (let i = 0; i < 4; i++) { const a = i * 1.6 + rnd(); k.cyl(im.bark, .04, .07, 1.2, [Math.cos(a) * .3, trunkH + .3, Math.sin(a) * .3], [Math.sin(a) * .7, 0, -Math.cos(a) * .7]); }
      for (let i = 0; i < 9; i++) {
        const a = rnd() * Math.PI * 2, r = rnd() * w * .28, yy = trunkH + .5 + rnd() * (h - trunkH - 1.2);
        k.geom(im.foliage, foliageClump(w * (.22 + rnd() * .12), y.seed * 31 + i), compose([Math.cos(a) * r, yy, Math.sin(a) * r]));
      }
      break;
    }
    case "shrub": for (let i = 0; i < 3; i++) k.geom(im.foliage, foliageClump(w * (.32 + rnd() * .1), y.seed * 17 + i), compose([(rnd() - .5) * w * .4, h * .42, (rnd() - .5) * d * .3], undefined, [1, .85, 1])); break;
    case "fence": {
      const posts = Math.max(2, Math.ceil(w / 2.4) + 1);
      for (let i = 0; i < posts; i++) k.box(im.cedar, [.09, h + .1, .09], [-w / 2 + w * i / (posts - 1), (h + .1) / 2, 0]);
      for (const yy of [.3, h - .25]) k.box(im.cedar, [w, .09, .04], [0, yy, -.06]);
      for (let x = -w / 2 + .07; x < w / 2; x += .15) k.box(im.cedar, [.14, h - .05 + (Math.round(x * 10) % 2) * .02, .02], [x, (h - .05) / 2 + .03, .055]);
      break;
    }
    case "patio": k.box(im.pavers, [w, h, d], [0, h / 2 - .03, 0]); break;
    case "patio-table": k.cyl(im.oak, w / 2, w / 2, .035, [0, h - .02, 0], undefined, 32).cyl(im.blackMetal, .03, .03, h - .04, [0, (h - .04) / 2, 0]).cyl(im.blackMetal, .25, .27, .03, [0, .015, 0], undefined, 24); break;
    case "patio-chair":
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.cyl(im.blackMetal, .012, .012, .42, [sx * (w / 2 - .04), .21, sz * (d / 2 - .04)]);
      k.box(im.blackMetal, [w, .03, d], [0, .43, 0]).round(im.canvas, [w - .04, .06, d - .06], [0, .47, .01], .025);
      k.box(im.blackMetal, [w, .45, .03], [0, .7, -d / 2 + .02], [-.15, 0, 0]).round(im.canvas, [w - .06, .36, .05], [0, .7, -d / 2 + .06], .025, [-.15, 0, 0]);
      break;
    case "umbrella":
      k.cyl(im.blackMetal, .02, .02, h, [0, h / 2, 0]).cyl(im.blackMetal, .25, .28, .06, [0, .03, 0], undefined, 24);
      k.lathe(im.canvas, [[0, .35], [w / 2, 0]], [0, h - .4, 0], 8);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.box(im.blackMetal, [.01, .01, w / 2], [Math.cos(a) * w / 4, h - .22, Math.sin(a) * w / 4], [0, -a + Math.PI / 2, -.28]); }
      break;
    case "grill":
      k.sphere(im.blackMetal, .3, [0, .78, 0], [1, .55, .8]).cyl(im.chrome, .015, .015, .3, [0, .97, .25], [0, 0, Math.PI / 2]);
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; k.cyl(im.blackMetal, .015, .015, .65, [Math.cos(a) * .18, .34, Math.sin(a) * .18], [Math.sin(a) * .2, 0, -Math.cos(a) * .2]); }
      k.cyl(im.rubber, .07, .07, .03, [.25, .07, 0], [0, 0, Math.PI / 2]);
      break;
    case "mailbox": k.box(im.cedar, [.09, h - .25, .09], [0, (h - .25) / 2, 0]).box(im.blackMetal, [.2, .14, .45], [0, h - .18, 0]).cyl(im.blackMetal, .1, .1, .45, [0, h - .11, 0], [Math.PI / 2, 0, 0], 20).box(im.terracotta, [.02, .18, .05], [.11, h - .05, -.1]); break;
    case "path-light": k.cyl(im.blackMetal, .02, .02, h - .1, [0, (h - .1) / 2, 0]).cyl(im.blackMetal, .09, .02, .06, [0, h - .03, 0], undefined, 16).cyl(im.diffuser, .05, .05, .07, [0, h - .1, 0], undefined, 16); break;
    case "garden-bed": {
      k.box(im.cedar, [w, .2, .05], [0, .1, d / 2]).box(im.cedar, [w, .2, .05], [0, .1, -d / 2]).box(im.cedar, [.05, .2, d], [w / 2, .1, 0]).box(im.cedar, [.05, .2, d], [-w / 2, .1, 0]).box(im.soilDark, [w - .05, .14, d - .05], [0, .09, 0]);
      for (let i = 0; i < Math.round(w * 3); i++) k.geom(im.foliage, foliageClump(.14 + rnd() * .08, y.seed * 7 + i), compose([(rnd() - .5) * (w - .3), .22, (rnd() - .5) * (d - .25)]));
      break;
    }
  }
  k.into(res, g);
  void m;
}
