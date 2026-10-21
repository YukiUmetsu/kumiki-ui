/** Crafted, layered 3D house built from a renderer-neutral `HouseLayout`.
 *
 * Construction follows light-frame practice so cutaways teach something real:
 * - Walls: tilted lap-siding boards with true shadow lines (rake-cut in the
 *   gables), OSB sheathing, stud framing with king/jack studs, headers, sills,
 *   cripples, double top plates and rim joists, fiberglass cavity insulation
 *   and drywall. Layers are nested rings, so corners never overlap.
 * - Roof: rafters, ridge board, ceiling joists, fly rafters and lookouts, OSB
 *   decking, printed underlayment, individual shingle tabs (three-tab or
 *   architectural) with per-tab color, ridge cap, drip edge, fascia, rake
 *   boards, vented soffits, K-style gutters and downspouts, blown attic insulation.
 * - Foundation (slab, crawlspace or basement), floors, entry steps, site soil
 *   strata and lawn; chimney, condenser, air handler, ducts, line set, water
 *   heater, copper supply lines, meter and optional PV array.
 *
 * Every semantic part from the layout is a named `Group` (see `asset.parts`),
 * nested like the layout tree; walls carry their facade frame, so a wall's
 * layers and openings move with it. Moving pieces (sashes, door leaf, garage
 * sections, condenser fan) are pivot-ready groups. 1 unit = 1 m.
 */
import { BoxGeometry, BufferAttribute, BufferGeometry, ExtrudeGeometry, Group, Matrix4, Quaternion, Shape, Vector3 } from "three";
import type { Material, Object3D } from "three";
import { createAssetResources } from "../craft/hero-asset";
import type { HeroAsset } from "../craft/hero-asset";
import { actionTime, easeInOut, findAction, spring, window01 } from "../craft/hero-action";
import { captureTransforms } from "../craft/part-rig";
import type { HeroActionSpec, HeroActionState } from "../craft/hero-action";
import { seededRandom } from "../craft/canvas-texture";
import { createHomeMaterials } from "./home-materials-3d";
import type { HomeMaterials } from "./home-materials-3d";
import { HOUSE_FACADES, HOUSE_STATES, facadePoint, resolveHouseLayout } from "./home-model";
import { inspectHeroAsset } from "../visual/inspectable-asset-three";
import type { InspectableAsset } from "../visual/inspectable-asset";
import type { FacadeLayout, HouseLayout, HouseSpec, ResolvedOpening, Vec3 } from "./home-model";
import {
  basis, buildAirHandler, buildCondenser, buildDoor, buildGarageDoor, buildMeter, buildPvModule, buildWaterHeater, buildWindow,
  createGeometryBatch, extrudeProfile, meshIn, routeGeometry, thickenPolyline,
} from "./home-parts-3d";
import type { GeometryBatch } from "./home-parts-3d";

export interface HouseAsset extends HeroAsset {
  layout: HouseLayout;
  materials: HomeMaterials;
  /** Moving subparts → their pivot groups (same objects as in `parts`). */
  moving: ReadonlyMap<string, Object3D>;
}

export interface HouseBuildOptions {
  /** Texture resolution scale (0.5 for thumbnails). */
  detail?: number;
  seed?: number;
}

const STUD_OC = .406, RAFTER_OC = .6, LUMBER_T = .038;

/** Facade frame as a matrix: local x = u, y = v (height), z = w (outward). */
function facadeMatrix(f: FacadeLayout): Matrix4 {
  return basis(f.frame.uAxis, [0, 1, 0], f.frame.normal, f.frame.origin);
}
/** Top of the wall outline at u (gables follow the roof underside). */
function wallTop(f: FacadeLayout, u: number, slope: number) {
  return f.eaveV + (f.gableRise > 0 ? Math.max(0, Math.min(u, f.length - u)) * slope : 0);
}
const gable = (f: FacadeLayout) => f.gableRise > 0;

/** Layer outline (u, v polygon) for a wall between depth offsets, with rough-opening holes. */
function wallSheet(f: FacadeLayout, slope: number, inset: number, vBottom: number, vTop: number | "outline", holes: readonly ResolvedOpening[], grow: number, thickness: number, wIn: number): BufferGeometry {
  const u0 = inset, u1 = f.length - inset;
  const s = new Shape();
  s.moveTo(u0, vBottom); s.lineTo(u1, vBottom);
  if (vTop === "outline") {
    s.lineTo(u1, wallTop(f, u1, slope));
    if (gable(f)) s.lineTo(f.length / 2, wallTop(f, f.length / 2, slope));
    s.lineTo(u0, wallTop(f, u0, slope));
  } else { s.lineTo(u1, vTop); s.lineTo(u0, vTop); }
  s.closePath();
  for (const o of holes) {
    const h = new Shape();
    const top = vTop === "outline" ? Infinity : vTop;
    const hb = Math.max(vBottom + .01, o.v0 - grow), ht = Math.min(top - .01, o.v1 + grow);
    if (ht <= hb) continue;
    h.moveTo(o.u0 - grow, hb); h.lineTo(o.u0 - grow, ht); h.lineTo(o.u1 + grow, ht); h.lineTo(o.u1 + grow, hb); h.closePath();
    s.holes.push(h);
  }
  const g = new ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, wIn);
  return g;
}

/** Heightfield slab: flat bottom at `y0`, lumpy top `top(x, z)`, closed skirt. */
function heightfieldBlock(x0: number, x1: number, z0: number, z1: number, y0: number, top: (x: number, z: number) => number, step = .1): BufferGeometry {
  const nx = Math.max(2, Math.ceil((x1 - x0) / step)), nz = Math.max(2, Math.ceil((z1 - z0) / step));
  const pos: number[] = [], uv: number[] = [];
  const P = (i: number, k: number): Vec3 => { const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * k / nz; return [x, top(x, z), z]; };
  const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) => { for (const p of [a, b, c, a, c, d]) { pos.push(...p); uv.push(p[0], p[2] + p[1]); } };
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) quad(P(i, k), P(i, k + 1), P(i + 1, k + 1), P(i + 1, k));
  const base = (p: Vec3): Vec3 => [p[0], y0, p[2]];
  // Flat bottom keeps the block a closed solid (section caps rely on it).
  quad(base(P(0, 0)), base(P(nx, 0)), base(P(nx, nz)), base(P(0, nz)));
  for (let i = 0; i < nx; i++) { quad(base(P(i, nz)), base(P(i + 1, nz)), P(i + 1, nz), P(i, nz)); quad(base(P(i + 1, 0)), base(P(i, 0)), P(i, 0), P(i + 1, 0)); }
  for (let k = 0; k < nz; k++) { quad(base(P(0, k)), base(P(0, k + 1)), P(0, k + 1), P(0, k)); quad(base(P(nx, k + 1)), base(P(nx, k)), P(nx, k), P(nx, k + 1)); }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.computeVertexNormals();
  return g;
}

/** Build a crafted, layered house from a spec or a resolved layout. */
export function createHouse3D(input: HouseSpec | HouseLayout, options: HouseBuildOptions = {}): HouseAsset {
  const layout = "dims" in input ? input : resolveHouseLayout(input);
  const { dims, palette } = layout;
  const { width, depth, slope, pitch, floorY, eaveY, layers, rafterDepth: rd } = dims;
  const W = width / 2, D = depth / 2, T = layers.total;
  const res = createAssetResources();
  const m = createHomeMaterials({ palette, condition: layout.spec.condition, seed: options.seed, detail: options.detail });
  const random = seededRandom(options.seed ?? 7);
  const root = new Group(); root.name = layout.id;

  // One Group per semantic part, nested like the layout tree.
  const groups = new Map<string, Group>();
  for (const p of layout.parts) {
    const g = new Group();
    res.name(g, p.id);
    g.userData.label = p.label; g.userData.role = p.role;
    (p.parentId ? groups.get(p.parentId)! : root).add(g);
    groups.set(p.id, g);
  }
  const G = (id: string) => { const g = groups.get(id); if (!g) throw new Error(`House part "${id}" is missing from the layout.`); return g; };
  const has = (id: string) => groups.has(id);
  const put = (id: string, geometry: BufferGeometry | null, material: Material, name?: string, shadows = true) => meshIn(res, G(id), geometry, material, name, shadows);
  const moving = new Map<string, Object3D>();

  const sidingStart = layout.spec.foundation === "crawlspace" ? dims.foundationTop - .05 : layout.spec.foundation === "basement" ? dims.foundationTop - .06 : floorY - .07;
  const tailLen = dims.eaveTail.z / Math.cos(pitch);
  const soffitY = dims.eaveTail.y - rd * Math.cos(pitch);
  const studW = -layers.siding - layers.sheathing - layers.studs / 2;

  /* --------------------------------------------------------------- walls */
  for (const facade of HOUSE_FACADES) {
    const f = layout.facades[facade];
    const wall = G(`wall.${facade}`);
    facadeMatrix(f).decompose(wall.position, wall.quaternion, wall.scale);
    const isGable = gable(f), L = f.length;
    // Nested rings: eave walls run the full length at each layer's outer offset, gable walls stop at its inner offset.
    const inset = (outer: number, inner: number) => isGable ? inner : outer;
    const openings = f.openings;

    // Lap siding: tilted boards, 150 mm exposure, butted to casings and corner boards.
    const siding = createGeometryBatch();
    const e = .15, bh = .2, top = (u: number) => isGable ? wallTop(f, u, slope) - .005 : soffitY - .14;
    const rakeU = (v: number, end: 0 | 1) => {
      if (!isGable || v <= f.eaveV) return end ? L - .1 : .1;
      const du = (v - f.eaveV) / slope;
      return end ? Math.min(L - .1, L - du) : Math.max(.1, du);
    };
    const peak = isGable ? wallTop(f, L / 2, slope) : top(0);
    // Casing footprint per opening (u range and v extent incl. sill/apron and head/drip cap).
    const casings = openings.map(o => ({ u0: o.u0 - .095, u1: o.u1 + .095, v0: o.kind === "window" ? o.v0 - .097 : o.v0 - .02, v1: o.v1 + .133 }));
    // Board section between vFrom..vTo of a board whose butt is at vb: front tilts from 0 to −14 mm, back from −14 to −20 mm.
    const boardSection = (vb: number, vFrom: number, vTo: number): Array<[number, number]> => {
      const k = (v: number) => (v - vb) / bh;
      return [[vFrom, -.017 + -.005 * k(vFrom)], [vFrom, -.017 * k(vFrom) + (vFrom === vb ? 0 : 0)], [vTo, -.017 * k(vTo)], [vTo, -.017 - .005 * k(vTo)]];
    };
    const addBoard = (vb: number, vFrom: number, vTo: number, a: number, b: number) => {
      if (vTo - vFrom < .006) return;
      const x0 = (y: number) => Math.max(a, rakeU(y, 0)), x1 = (y: number) => Math.min(b, rakeU(y, 1));
      if (x1(vFrom) - x0(vFrom) < .03) return;
      const mid = (x0(vFrom) + x1(vFrom)) / 2;
      const start = (y: number) => x0(y) > x1(y) ? mid : x0(y), end = (y: number) => x0(y) > x1(y) ? mid : x1(y);
      // Occlusion: bright butt, darker toward the top where the next course overlaps; the butt's underside is in shadow.
      const shade = (y: number, z: number) => z > -.0005 && y < vb + .001 ? .62 : Math.max(.5, 1.02 - .5 * Math.pow(Math.max(0, (y - vb) / e), 1.6));
      siding.geometry(extrudeProfile(boardSection(vb, vFrom, vTo), start, end, { shade }));
    };
    for (let v = sidingStart; v < peak - .03; v += e) {
      const vb = v, vt = Math.min(v + bh, isGable ? Infinity : top(0));
      if (vt - vb < .02) continue;
      // Outside casings the board runs full; across a casing it is notched to slivers above/below it.
      const hits = casings.filter(c => vb < c.v1 && vt > c.v0).sort((p, q) => p.u0 - q.u0);
      let cursor = -Infinity;
      for (const c of hits) {
        addBoard(vb, vb, vt, cursor, c.u0);
        if (c.v1 < vt) addBoard(vb, c.v1, vt, c.u0, c.u1);
        if (c.v0 > vb) addBoard(vb, vb, Math.min(vt, c.v0), c.u0, c.u1);
        cursor = Math.max(cursor, c.u1);
      }
      addBoard(vb, vb, vt, cursor, Infinity);
    }
    put(`wall.${facade}.siding`, siding.build(), m.siding, "lap-boards");

    // Sheathing, insulation and drywall sheets.
    const sheathIn = -layers.siding - layers.sheathing;
    put(`wall.${facade}.sheathing`, wallSheet(f, slope, inset(layers.siding, -sheathIn), sidingStart + .02, "outline", openings, 0, layers.sheathing, sheathIn), m.osb, "osb");
    const studOut = sheathIn, studIn = studOut - layers.studs;
    put(`wall.${facade}.insulation`, wallSheet(f, slope, inset(-studOut, -studIn) + .04, floorY + .04, eaveY - .08, openings, .08, layers.studs - .004, studIn + .002), m.batts, "batts");
    put(`wall.${facade}.drywall`, wallSheet(f, slope, inset(-studIn, T), floorY, eaveY - .013, openings, 0, layers.drywall, -T), m.drywall, "gypsum");

    // Framing: plates, studs, openings (king/jack/header/sill/cripples), rim joists, gable studs.
    const frame = createGeometryBatch();
    const fu0 = inset(-studOut, -studIn), fu1 = L - fu0;
    const sec: readonly [number, number] = [LUMBER_T, layers.studs];
    const P = (u: number, v: number): Vec3 => [u, v, studW];
    let seed = 0;
    const member = (a: Vec3, b: Vec3, s = sec, up: Vec3 = [0, 0, 1]) => frame.member(a, b, s, up, seed++);
    for (let s = 0; s < dims.storeys; s++) {
      const vb = floorY + s * dims.storeyHeight, vt = vb + dims.storeyHeight - .3;
      member(P(fu0, vb + .019), P(fu1, vb + .019));
      member(P(fu0, vt - .057), P(fu1, vt - .057));
      member(P(fu0, vt - .019), P(fu1, vt - .019));
      const stud = (u: number, a = vb + .038, b = vt - .076) => b - a > .02 && member(P(u, a), P(u, b), [LUMBER_T, layers.studs], [0, 0, 1]);
      const local = openings.filter(o => o.storey === s);
      const blocked = (u: number) => local.some(o => u > o.u0 - .1 && u < o.u1 + .1);
      for (let u = fu0 + .019; u <= fu1 - .019 + 1e-6; u += STUD_OC) if (!blocked(u)) stud(u);
      stud(fu1 - .019);
      for (const o of local) {
        for (const [king, jack] of [[o.u0 - .057, o.u0 - .019], [o.u1 + .057, o.u1 + .019]]) { stud(king); stud(jack, vb + .038, o.v1); }
        const headerH = .235;
        frame.member([o.u0 - .038, o.v1 + headerH / 2, studW], [o.u1 + .038, o.v1 + headerH / 2, studW], [layers.studs, headerH], [0, 1, 0], seed++);
        for (let u = o.u0 + .2; u < o.u1 - .1; u += STUD_OC) stud(u, o.v1 + headerH, vt - .076);
        if (o.kind === "window") {
          member(P(o.u0, o.v0 - .019), P(o.u1, o.v0 - .019));
          for (let u = o.u0 + .2; u < o.u1 - .1; u += STUD_OC) stud(u, vb + .038, o.v0 - .038);
        }
      }
      if (s < dims.storeys - 1) frame.member([fu0, vt + .12, studOut - .019], [fu1, vt + .12, studOut - .019], [LUMBER_T, .235], [0, 1, 0], seed++);
    }
    if (isGable) {
      // Gable studs to the sloped rake plates.
      for (let u = fu0 + .019; u < fu1; u += STUD_OC) {
        const t = wallTop(f, u, slope) - .07;
        if (t - eaveY > .12) member(P(u, eaveY), P(u, t));
      }
      const peakU = L / 2;
      for (const [a, b] of [[fu0, peakU], [fu1, peakU]]) member(P(a, wallTop(f, a, slope) - .035), P(b, wallTop(f, b, slope) - .035));
    }
    put(`wall.${facade}.framing`, frame.build(), m.lumber, "studs-and-plates");

    // Openings: built in facade coordinates under this wall.
    for (const o of openings) {
      const og = G(o.id);
      const frameSpec = { u0: o.u0, u1: o.u1, v0: o.v0, v1: o.v1, wallDepth: T };
      const built = o.kind === "window" ? buildWindow(res, m, frameSpec, o.style, o.muntins)
        : o.kind === "door" ? buildDoor(res, m, frameSpec) : buildGarageDoor(res, m, frameSpec);
      og.add(built.group);
      const movingId = `${o.id}.${o.kind === "window" ? (o.style === "double-hung" ? "sash" : "glass") : o.kind === "door" ? "leaf" : "panels"}`;
      // Re-home the moving group under its semantic part so IDs resolve to it directly.
      const slot = G(movingId);
      slot.removeFromParent(); built.group.add(slot);
      built.moving.removeFromParent(); slot.add(built.moving);
      slot.position.copy(built.moving.position); built.moving.position.set(0, 0, 0);
      slot.userData.pivot = slot.position.toArray();
      moving.set(movingId, slot);
      if ("sectionHeight" in built) slot.userData.sectionHeight = built.sectionHeight;
      // Garage tracks extend into the house: keep the inner jamb/track grouping on the opening.
    }
  }

  /* ---------------------------------------------------------------- trim */
  const trim = createGeometryBatch(), trimW = .1;
  for (const facade of HOUSE_FACADES) {
    const f = layout.facades[facade], M = facadeMatrix(f), L = f.length, isGable = gable(f);
    const v0 = sidingStart - .01, v1 = isGable ? f.eaveV : soffitY;
    const at = (size: Vec3, c: Vec3) => trim.box(size, new Matrix4().makeTranslation(...c).premultiply(M));
    if (isGable) {
      for (const u of [-.008 + .054, L + .008 - .054]) at([.108, v1 - v0, .028], [u, (v0 + v1) / 2, -.006]);
      // Rake frieze along both slopes, just under the rake soffit.
      for (const sgn of [-1, 1]) {
        const a: Vec3 = [sgn < 0 ? .05 : L - .05, wallTop(f, sgn < 0 ? .05 : L - .05, slope) - .07, -.004];
        const b: Vec3 = [L / 2, wallTop(f, L / 2, slope) - .07, -.004];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        trim.box([len, .12, .024], new Matrix4().makeRotationZ(ang).setPosition((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2]).premultiply(M));
      }
    } else {
      for (const u of [.02 + .05, L - .02 - .05]) at([trimW, v1 - v0, .028], [u, (v0 + v1) / 2, -.006]);
      at([L - .04, .14, .024], [L / 2, soffitY - .07, -.008]); // frieze board
    }
  }
  put("trim", trim.build(), m.trim, "corner-and-frieze-boards");

  /* -------------------------------------------------------- roof framing */
  const side = (s: 1 | -1) => ({
    X: [s, 0, 0] as Vec3, N: [0, Math.cos(pitch), s * Math.sin(pitch)] as Vec3, S: [0, -Math.sin(pitch), s * Math.cos(pitch)] as Vec3,
  });
  const rf = (s: 1 | -1, x: number, n: number, t: number): Vec3 => {
    const { X, N, S } = side(s);
    return [X[0] * x, dims.ridgeY + N[1] * n + S[1] * t, N[2] * n + S[2] * t];
  };
  const frameM = (s: 1 | -1) => { const { X, N, S } = side(s); return basis(X, N, S, [0, dims.ridgeY, 0]); };
  const inFrame = (s: 1 | -1, center: Vec3) => new Matrix4().makeTranslation(...center).premultiply(frameM(s));
  const rake = dims.rakeOverhang, roofHalfX = W + rake;
  {
    const b = createGeometryBatch();
    let k = 0;
    const xs: number[] = [];
    // Joists and collar ties sit beside each rafter, on the side that stays inside the walls.
    const joistX = (x: number) => x + (x > 0 ? -.04 : .04);
    for (let x = -W + .019; x < W - .019; x += RAFTER_OC) xs.push(x);
    xs.push(W - .019);
    for (const s of [1, -1] as const) {
      const { N } = side(s);
      for (const x of xs) b.member(rf(s, x * s, -rd / 2, .02), rf(s, x * s, -rd / 2, tailLen), [LUMBER_T, rd], N, k++);
      for (const sx of [-1, 1]) {
        const fly = sx * (roofHalfX - .019);
        b.member(rf(s, fly * s, -rd / 2, .02), rf(s, fly * s, -rd / 2, tailLen), [LUMBER_T, rd], N, k++);
        for (let t = .3; t < tailLen; t += RAFTER_OC) b.member(rf(s, sx * s * (W - .04), -rd / 2, t), rf(s, sx * s * (roofHalfX - .04), -rd / 2, t), [LUMBER_T, rd * .8], N, k++);
      }
      // Collar ties on every other rafter pair at two thirds height.
      if (s === 1) xs.forEach((x, i) => { if (i % 2) return; const y = eaveY + (dims.ridgeY - eaveY) * .66; const z = (dims.ridgeY - dims.heel - y) / slope; b.member([joistX(x), y, -z], [joistX(x), y, z], [LUMBER_T, .14], [0, 1, 0], k++); });
    }
    b.member([-roofHalfX + .04, dims.ridgeY - .1, 0], [roofHalfX - .04, dims.ridgeY - .1, 0], [LUMBER_T, .24], [0, 1, 0], k++); // ridge board
    for (const x of xs) b.member([joistX(x), eaveY + .07, -D + .035], [joistX(x), eaveY + .07, D - .035], [LUMBER_T, .14], [0, 1, 0], k++); // ceiling joists
    put("roof.framing", b.build(), m.lumber, "rafters-joists-ridge");
  }

  /* ---------------------------------------------- decking, underlayment */
  {
    const deck = createGeometryBatch(), under = createGeometryBatch();
    const s0 = .03;
    for (const s of [1, -1] as const) {
      deck.box([roofHalfX * 2, .016, tailLen - s0], inFrame(s, [0, .008, (s0 + tailLen) / 2]));
      under.box([roofHalfX * 2 - .01, .002, tailLen - s0 - .005], inFrame(s, [0, .017, (s0 + tailLen) / 2]));
    }
    put("roof.decking", deck.build(), m.osb, "osb-decking");
    put("roof.underlayment", under.build(), m.underlayment, "underlayment");
  }

  /* ------------------------------------------------------------ shingles */
  {
    const b = createGeometryBatch();
    const style = layout.spec.shingles ?? "three-tab", condition = layout.spec.condition ?? "new";
    const exposure = style === "architectural" ? .143 : .14, course = .33, t = style === "architectural" ? .006 : .004, base = .018;
    const tabW = .333, slot = .006;
    let courseIndex = 0;
    for (const s of [1, -1] as const) {
      for (let bottom = tailLen + .012; bottom > .06; bottom -= exposure, courseIndex++) {
        const topS = Math.max(.03, bottom - course);
        const lift = t * 1.8, tilt = Math.atan2(lift - t * .5, bottom - topS);
        const headH = Math.max(0, bottom - exposure - topS);
        const rowSeed = courseIndex * 7.13;
        // Headlap strip (hidden upper part) as one piece; exposed tabs individually.
        if (headH > .01) b.box([roofHalfX * 2 + .02, t, headH], inFrame(s, [0, base + t * .5 + lift * .25, topS + headH / 2]).multiply(new Matrix4().makeRotationX(tilt)), { color: [.82, .82, .82] });
        const offset = style === "three-tab" ? ((courseIndex % 2) * tabW / 2 + (courseIndex % 4 > 1 ? tabW / 4 : 0)) : (rowSeed * .37) % .3;
        let x = -roofHalfX - .01 - offset;
        while (x < roofHalfX + .01) {
          const w = style === "three-tab" ? tabW : .12 + random() * .26;
          const x0 = Math.max(-roofHalfX - .01, x), x1 = Math.min(roofHalfX + .01, x + w - slot);
          x += w;
          if (x1 - x0 < .02) continue;
          const rnd = random();
          if (condition === "damaged" && rnd < .025) continue; // missing tab
          const len = exposure + .002 + (style === "architectural" ? (random() - .5) * .012 : 0);
          let tone = .88 + random() * .18;
          if (style === "architectural" && random() < .25) tone *= .84; // dimensional shadow tabs
          let color: [number, number, number] = [tone, tone, tone * 1.01];
          if (condition !== "new") {
            // Weathering: dark algae streaks running down-slope in vertical bands, plus patchy granule loss.
            const band = Math.max(0, Math.sin((x0 + s * 3.1) * 1.3) * .6 + Math.sin(x0 * 4.1 + 1.7) * .4);
            const streak = band * band * (condition === "damaged" ? .55 : .32) * (.55 + .45 * bottom / tailLen);
            const loss = random() < (condition === "damaged" ? .12 : .05) ? .14 : 0;
            color = [tone * (1 - streak + loss), tone * (1 - streak * .82 + loss), tone * (1 - streak * .9 + loss)];
          }
          const curl = condition === "damaged" && rnd > .96 ? .18 : 0;
          const mtx = inFrame(s, [(x0 + x1) / 2, base + lift * .75 + t * .5, bottom - len / 2]).multiply(new Matrix4().makeRotationX(tilt - curl));
          b.box([x1 - x0, t, len], mtx, { color, uvOffset: [random() * 3, random() * 3] });
        }
      }
    }
    // Starter course under the first row and drip edge along the eaves.
    const drip = createGeometryBatch();
    for (const s of [1, -1] as const) {
      b.box([roofHalfX * 2 + .02, t, .18], inFrame(s, [0, base + t * .5, tailLen + .012 - .09]), { color: [.7, .7, .7] });
      drip.box([roofHalfX * 2 + .03, .002, .05], inFrame(s, [0, .0165, tailLen - .01]));
      drip.box([roofHalfX * 2 + .03, .045, .002], inFrame(s, [0, -.006, tailLen + .016]));
    }
    put("roof.shingles", b.build(), m.shingles, "shingle-tabs");
    put("roof.trim", drip.build(), m.flashing, "drip-edge");
    // Ridge cap: overlapping bent caps marching along the ridge.
    const cap = createGeometryBatch();
    for (let x = -roofHalfX, i = 0; x < roofHalfX; x += .142, i++) {
      const tone = .9 + random() * .14;
      for (const s of [1, -1] as const) {
        const m4 = inFrame(s, [x + .15, base + .016 + t, .1]).multiply(new Matrix4().makeRotationZ(s * -.012)).multiply(new Matrix4().makeRotationX(-.04));
        cap.box([.3, t * 1.4, .2], m4, { color: [tone, tone, tone] });
      }
    }
    put("roof.ridge-cap", cap.build(), m.shingles, "ridge-caps");
  }

  /* ----------------------------------------- fascia, rake, soffit, gutters */
  {
    const tb = createGeometryBatch(), sb = createGeometryBatch();
    const fasciaTop = dims.eaveTail.y + .016 * Math.cos(pitch), fasciaBottom = soffitY - .03;
    for (const sz of [1, -1]) {
      const zf = sz * (dims.eaveTail.z + .0125);
      tb.at([roofHalfX * 2 + .05, fasciaTop - fasciaBottom, .025], [0, (fasciaTop + fasciaBottom) / 2, zf]);
      sb.at([roofHalfX * 2, .012, dims.eaveTail.z - D], [0, soffitY - .006, sz * (D + (dims.eaveTail.z - D) / 2)]);
    }
    for (const s of [1, -1] as const) for (const sx of [-1, 1]) {
      tb.box([.025, .22, tailLen + .03], inFrame(s, [sx * (roofHalfX + .0125), .016 - .09, tailLen / 2]));
      sb.box([rake - .02, .012, tailLen - .06], inFrame(s, [sx * (W + rake / 2), -rd - .006, tailLen / 2 + .03]));
    }
    put("roof.trim", tb.build(), m.trim, "fascia-and-rake");
    put("roof.trim", sb.build(), m.soffit, "vented-soffit");

    // K-style gutters with end caps and hangers; downspouts with goosenecks and splash blocks.
    const gt = layout.gutter.top, gw = layout.gutter.width;
    const profile: Array<[number, number]> = [[0, 0], [-.105, 0], [-.115, .012], [-.115, .085], [-.098, .105], [-.07, .11], [-.06, gw - .002], [-.036, gw], [-.026, gw - .012], [-.012, gw - .004], [0, gw], [.006, gw - .012]];
    const gutters = createGeometryBatch(), metal = createGeometryBatch();
    for (const sz of [1, -1]) {
      const zBack = sz * (dims.eaveTail.z + .025);
      const sect = thickenPolyline(profile.map(([y, z]) => [gt + y, zBack + sz * z] as [number, number]), .0022 * sz);
      gutters.geometry(extrudeProfile(sect, -roofHalfX + .02, roofHalfX - .02));
      const closed = profile.map(([y, z]) => [gt + y, zBack + sz * z] as [number, number]);
      for (const x of [-roofHalfX + .02, roofHalfX - .022]) gutters.geometry(extrudeProfile(closed.slice(0, 7).concat([[gt, zBack + sz * gw * .95]]), x, x + .002));
      for (let x = -roofHalfX + .3; x < roofHalfX - .1; x += .6) metal.at([.02, .004, gw + .01], [x, gt - .004, zBack + sz * gw / 2]);
    }
    put("roof.gutters", gutters.build(), m.aluminum, "gutters");
    const spouts = createGeometryBatch();
    for (const d of layout.downspouts) {
      spouts.geometry(routeGeometry(d.points, { radius: .0375, shape: "rect", aspect: .74 }));
      const last = d.points[d.points.length - 1];
      metal.at([.3, .04, .5], [last[0], .02, last[2] + Math.sign(last[2]) * .22]);
      for (const y of [.9, 1.8, 2.7]) if (y < d.points[2][1] - .2) metal.at([.1, .03, .05], [d.points[3][0], y, d.points[3][2] - Math.sign(last[2]) * .015]);
    }
    put("roof.gutters", spouts.build(), m.aluminum, "downspouts");
    put("roof.gutters", metal.build(), m.paving, "hangers-and-splash-blocks");
  }

  /* ---------------------------------------------------- attic insulation */
  put("attic.insulation", heightfieldBlock(-W + T + .02, W - T - .02, -D + T + .02, D - T - .02, eaveY + .005, (x, z) => {
    const cap = eaveY + (D - Math.abs(z)) * slope - .07;
    const lump = Math.sin(x * 7.1 + z * 2.3) * .012 + Math.sin(x * 2.2 - z * 6.4) * .01 + Math.sin(x * 13 + z * 11) * .006;
    return Math.max(eaveY + .02, Math.min(eaveY + .3, cap) + lump);
  }, .08), m.blown, "blown-insulation");

  /* ----------------------------------------------------- floors, ceiling */
  {
    const garage = layout.facades.front.openings.find(o => o.kind === "garage-door");
    const gx0 = garage ? -W + garage.u0 - .5 : 0, gx1 = garage ? -W + garage.u1 + .5 : 0, gz = D - 6.6;
    for (let s = 0; s < dims.storeys; s++) {
      const y = floorY + s * dims.storeyHeight, id = `structure.floor-${s + 1}`;
      const fin = createGeometryBatch();
      const pieces: Array<[number, number, number, number]> = garage && s === 0
        ? [[-W + T, gx0, -D + T, D - T], [gx1, W - T, -D + T, D - T], [gx0, gx1, -D + T, gz]] : [[-W + T, W - T, -D + T, D - T]];
      for (const [x0, x1, z0, z1] of pieces) if (x1 - x0 > .05 && z1 - z0 > .05) fin.at([x1 - x0, .012, z1 - z0], [(x0 + x1) / 2, y - .006, (z0 + z1) / 2], { uvOffset: [x0, z0] });
      // Floor boards: rotate so planks run along X.
      const finGeo = fin.build();
      if (finGeo) { const uv = finGeo.attributes.uv as BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i)); }
      put(id, finGeo, m.floor, "oak-floor");
      if (s === 0 && garage) put(id, new BoxGeometry(gx1 - gx0, .012, D - T - gz).translate((gx0 + gx1) / 2, y - .008, (gz + D - T) / 2), m.paving, "garage-floor");
      const needsFraming = s > 0 || layout.spec.foundation !== "slab";
      if (needsFraming) {
        const sub = createGeometryBatch(), joists = createGeometryBatch();
        sub.at([width - .07, .018, depth - .07], [0, y - .021, 0]);
        const jd = s > 0 ? .235 : y - dims.foundationTop - .038 - .03;
        let k = 0;
        for (let x = -W + .1; x < W - .05; x += .406) joists.member([x, y - .03 - jd / 2, -D + .07], [x, y - .03 - jd / 2, D - .07], [LUMBER_T, jd], [0, 1, 0], k++);
        put(id, sub.build(), m.osb, "subfloor");
        put(id, joists.build(), m.lumber, "floor-joists");
        if (s > 0) put(id, new BoxGeometry(width - 2 * T, .013, depth - 2 * T).translate(0, y - .3 + .0065 - .02, 0), m.drywall, "ceiling-below");
      }
    }
    put("structure.ceiling", new BoxGeometry(width - 2 * T, .013, depth - 2 * T).translate(0, eaveY - .0065, 0), m.drywall, "ceiling-drywall");
  }

  /* ---------------------------------------------------------- foundation */
  {
    const fb = dims.foundationBottom, kind = layout.spec.foundation ?? "slab";
    const ring = (batch: GeometryBatch, y0: number, y1: number, outer: number, thick: number) => {
      const h = y1 - y0, cy = (y0 + y1) / 2;
      batch.at([width + outer * 2, h, thick], [0, cy, D + outer - thick / 2]).at([width + outer * 2, h, thick], [0, cy, -D - outer + thick / 2]);
      batch.at([thick, h, depth + outer * 2 - thick * 2], [W + outer - thick / 2, cy, 0]).at([thick, h, depth + outer * 2 - thick * 2], [-W - outer + thick / 2, cy, 0]);
    };
    const footing = createGeometryBatch();
    if (kind === "slab") {
      ring(footing, fb, floorY - .1, -.02, .36);
      put("foundation.footing", footing.build(), m.concrete, "thickened-edge");
      const slab = createGeometryBatch();
      slab.at([width - .04, .1 - .012, depth - .04], [0, floorY - .056, 0]);
      put("foundation.slab", slab.build(), m.concrete, "slab");
      put("foundation.slab", new BoxGeometry(width - .76, .12, depth - .76).translate(0, floorY - .16, 0), m.gravel, "gravel-base");
    } else {
      ring(footing, fb, fb + .25, .12, .44);
      put("foundation.footing", footing.build(), m.concrete, "spread-footing");
      const walls = createGeometryBatch();
      ring(walls, fb + .25, dims.foundationTop, -.02, .2);
      put("foundation.wall", walls.build(), kind === "crawlspace" ? m.cmu : m.concrete, kind === "crawlspace" ? "cmu-stem-wall" : "poured-wall");
      const sill = createGeometryBatch();
      let k = 0;
      for (const [a, b] of [[[-W + .02, 0, D - .09], [W - .02, 0, D - .09]], [[-W + .02, 0, -D + .09], [W - .02, 0, -D + .09]], [[W - .09, 0, -D + .16], [W - .09, 0, D - .16]], [[-W + .09, 0, -D + .16], [-W + .09, 0, D - .16]]] as Array<[Vec3, Vec3]>)
        sill.member([a[0], dims.foundationTop + .019, a[2]], [b[0], dims.foundationTop + .019, b[2]], [.14, LUMBER_T], [0, 1, 0], k++);
      put("foundation.wall", sill.build(), m.lumber, "sill-plate");
      if (kind === "crawlspace") {
        const vents = createGeometryBatch();
        for (const f of HOUSE_FACADES) {
          const fl = layout.facades[f], M = facadeMatrix(fl);
          for (let u = 1.2; u < fl.length - 1; u += 2.4) vents.box([.4, .18, .02], new Matrix4().makeTranslation(u, .35, -.01).premultiply(M));
        }
        put("foundation.wall", vents.build(), m.cabinetDark, "crawl-vents");
        put("foundation.wall", new BoxGeometry(width - .5, .004, depth - .5).translate(0, .006, 0), m.vapor, "vapor-barrier");
      }
      if (kind === "basement") put("foundation.basement-floor", new BoxGeometry(width - .44, .1, depth - .44).translate(0, dims.basementFloorY! - .05, 0), m.concrete, "basement-slab");
    }
  }

  /* ---------------------------------------------------------------- site */
  if (layout.site && has("site.ground")) {
    const sb = layout.site;
    const shape = new Shape();
    shape.moveTo(sb.min[0], -sb.max[2]); shape.lineTo(sb.max[0], -sb.max[2]); shape.lineTo(sb.max[0], -sb.min[2]); shape.lineTo(sb.min[0], -sb.min[2]); shape.closePath();
    const hole = new Shape(), hw = W - .02, hd = D - .02;
    hole.moveTo(-hw, -hd); hole.lineTo(-hw, hd); hole.lineTo(hw, hd); hole.lineTo(hw, -hd); hole.closePath();
    shape.holes.push(hole);
    const ground = new ExtrudeGeometry(shape, { depth: -sb.min[1], bevelEnabled: false });
    ground.rotateX(-Math.PI / 2).translate(0, sb.min[1], 0);
    const mesh = put("site.ground", ground, m.lawn, "soil-and-lawn");
    if (mesh) { mesh.material = [m.lawn, m.soil]; mesh.userData.sectionCapMaterial = 1; }
    if ((layout.spec.foundation ?? "slab") === "crawlspace") put("site.ground", new BoxGeometry(width - .4, -sb.min[1] - .02, depth - .4).translate(0, sb.min[1] / 2 - .01, 0), m.soil, "crawl-soil");
    if ((layout.spec.foundation ?? "slab") === "slab") put("site.ground", new BoxGeometry(width - .74, floorY - .22 - sb.min[1], depth - .74).translate(0, (sb.min[1] + floorY - .22) / 2, 0), m.soil, "sub-slab-soil");
    if (has("site.walkway")) {
      const walk = layout.parts.find(p => p.id === "site.walkway")!.bounds;
      put("site.walkway", new BoxGeometry(walk.max[0] - walk.min[0], .08, sb.max[2] - D - .05).translate((walk.min[0] + walk.max[0]) / 2, -.01, (D + .05 + sb.max[2]) / 2), m.paving, "walkway");
    }
    if (has("site.driveway")) {
      const dw = layout.parts.find(p => p.id === "site.driveway")!.bounds;
      const sect: Array<[number, number]> = [[-.12, D], [floorY - .012, D], [floorY - .012, D + .5], [.03, D + 2.6], [.03, sb.max[2]], [-.12, sb.max[2]]];
      put("site.driveway", extrudeProfile(sect, dw.min[0], dw.max[0]), m.paving, "driveway");
    }
    if (has("site.steps")) {
      const steps = createGeometryBatch();
      for (const o of layout.openings) if (o.kind === "door") {
        const f = layout.facades[o.facade], M = facadeMatrix(f);
        const n = Math.max(1, Math.round((floorY - .02) / .18)), rise = (floorY - .02) / n, w = o.u1 - o.u0 + .7;
        for (let i = 0; i < n; i++) {
          const run = .3 * (n - i);
          steps.box([w, rise * (i + 1), run], new Matrix4().makeTranslation((o.u0 + o.u1) / 2, rise * (i + 1) / 2 - .0, run / 2 + .01).premultiply(M), { uvOffset: [i, 0] });
        }
      }
      put("site.steps", steps.build(), m.paving, "concrete-steps");
    }
  }

  /* ------------------------------------------------------------- chimney */
  if (layout.chimney && has("chimney")) {
    const c = layout.chimney, b = createGeometryBatch();
    const y0 = floorY, h = c.top - y0;
    b.at([c.w, h, c.d], [c.x, y0 + h / 2, c.z], { uvOffset: [c.x, 0] });
    b.at([c.w + .06, .07, c.d + .06], [c.x, c.top - .35, c.z]); // corbel course
    put("chimney", b.build(), m.brick, "brick-stack");
    const crown = createGeometryBatch();
    crown.at([c.w + .12, .09, c.d + .12], [c.x, c.top + .045, c.z]);
    put("chimney", crown.build(), m.concrete, "crown");
    const flue = createGeometryBatch();
    flue.at([.3, .22, .24], [c.x, c.top + .2, c.z]);
    put("chimney", flue.build(), m.terracotta, "flue-liner");
    const flashing = createGeometryBatch();
    const front = c.z + c.d / 2, back = c.z - c.d / 2;
    const yAt = (z: number) => dims.roofTopAt(z) + .03;
    flashing.at([c.w + .1, .16, .005], [c.x, yAt(front) + .06, front + .003]);
    flashing.at([c.w + .1, .2, .005], [c.x, yAt(back) + .08, back - .003]);
    for (const sx of [-1, 1]) {
      const len = Math.hypot(c.d, yAt(front) - yAt(back)), ang = Math.atan2(yAt(front) - yAt(back), c.d);
      flashing.box([.005, .14, len + .1], new Matrix4().makeRotationX(-ang).setPosition(c.x + sx * (c.w / 2 + .003), (yAt(front) + yAt(back)) / 2 + .05, c.z));
    }
    put("chimney", flashing.build(), m.flashing, "step-flashing");
  }

  /* ---------------------------------------------------------------- HVAC */
  if (layout.condenser && has("hvac.condenser")) {
    const c = layout.condenser, n = layout.facades[c.facade].frame.normal;
    const built = buildCondenser(res, m, c.size);
    built.group.position.set(c.center[0], 0, c.center[2]);
    built.group.rotation.y = Math.atan2(n[0], n[2]);
    G("hvac.condenser").add(built.group);
    const fan = G("hvac.condenser.fan");
    fan.removeFromParent(); built.group.add(fan);
    fan.position.copy(built.fan.position); built.fan.removeFromParent(); built.fan.position.set(0, 0, 0); fan.add(built.fan);
    moving.set("hvac.condenser.fan", fan);
    // Service disconnect on the wall beside the unit.
    const tangent: Vec3 = [n[2], 0, -n[0]];
    const p: Vec3 = [c.center[0] - n[0] * .58 - tangent[0] * .55, 1.15, c.center[2] - n[2] * .58 - tangent[2] * .55];
    const disc = new BoxGeometry(.22, .3, .1);
    const mesh = put("hvac.condenser", disc, m.steel, "disconnect");
    if (mesh) { mesh.position.set(...p); mesh.rotation.y = Math.atan2(n[0], n[2]); }
  }
  if (layout.airHandler && has("hvac.air-handler")) {
    const a = layout.airHandler, g = buildAirHandler(res, m, a.size);
    g.position.set(...a.center);
    G("hvac.air-handler").add(g);
    if (a.location === "attic") {
      // Platform and service light for the attic unit.
      put("hvac.air-handler", new BoxGeometry(a.size[0] + .6, .018, a.size[2] + .9).translate(a.center[0], eaveY + .155, a.center[2] + .15), m.osb, "service-platform");
    }
  }
  for (const r of layout.routes) {
    if (r.shape === "surface" || !has(r.partId)) continue;
    if (r.partId === "hvac.lineset") {
      put(r.partId, routeGeometry(r.points, { radius: r.radius, shape: "round", bend: .09 }), m.foam, "suction-line");
      const off: Vec3 = [.024, .024, .024];
      put(r.partId, routeGeometry(r.points.map(p => [p[0] + off[0], p[1] + off[1], p[2] + off[2]] as Vec3), { radius: .0065, shape: "round", bend: .09 }), m.copper, "liquid-line");
    } else if (r.partId.startsWith("hvac.")) {
      put(r.partId, routeGeometry(r.points, { radius: r.radius, shape: r.shape === "rect" ? "rect" : "round", collarEvery: 1.2, collar: 1.08 }), m.galvanized, r.id);
    } else {
      put(r.partId, routeGeometry(r.points, { radius: r.radius, shape: "round", bend: .045, collar: 1.25 }), m.copper, r.id);
    }
  }
  if (layout.registers.length && has("hvac.registers")) {
    const grilles = createGeometryBatch();
    for (const r of layout.registers) {
      const y = r.position[1] + (r.facing === "down" ? -.006 : .004);
      grilles.at([.32, .006, .17], [r.position[0], y, r.position[2]]);
      for (let i = 0; i < 6; i++) grilles.at([.26, .008, .012], [r.position[0], y + (r.facing === "down" ? -.004 : .004), r.position[2] - .06 + i * .024]);
    }
    const ret = layout.anchors.find(x => x.id === "hvac.return-grille");
    if (ret) {
      const vertical = Math.abs(ret.normal[1]) < .5;
      for (let i = 0; i < 9; i++) {
        if (vertical) grilles.at([.012, .03, .5], [ret.position[0] + ret.normal[0] * .006, ret.position[1] - .12 + i * .03, ret.position[2]]);
        else grilles.at([.52, .006, .012], [ret.position[0], ret.position[1] + ret.normal[1] * .006, ret.position[2] - .14 + i * .035]);
      }
    }
    put("hvac.registers", grilles.build(), m.trim, "registers-and-grille");
  }

  /* ------------------------------------------------------------ plumbing */
  if (layout.waterHeater && has("plumbing.water-heater")) {
    const h = layout.waterHeater, g = buildWaterHeater(res, m, h.radius, h.height);
    g.position.set(h.center[0], h.center[1] - h.height / 2 - .04, h.center[2]);
    G("plumbing.water-heater").add(g);
  }
  if (has("plumbing.supply")) {
    const fx = layout.anchors.find(a => a.id === "plumbing.fixture");
    if (fx) {
      const stop = createGeometryBatch();
      stop.at([.05, .05, .05], [fx.position[0], fx.position[1], fx.position[2] + .03]);
      stop.at([.02, .02, .12], [fx.position[0], fx.position[1], fx.position[2] + .1]);
      put("plumbing.supply", stop.build(), m.brushed, "angle-stop");
    }
  }

  /* ---------------------------------------------------------- electrical */
  if (has("electrical.meter")) {
    const a = layout.anchors.find(x => x.id === "electrical.meter")!;
    const g = buildMeter(res, m);
    g.position.set(a.position[0] - a.normal[0] * .06, a.position[1], a.position[2] - a.normal[2] * .06);
    g.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...a.normal));
    G("electrical.meter").add(g);
  }

  /* --------------------------------------------------------------- solar */
  if (layout.solar && has("solar.array")) {
    const sp = layout.solar, frame = createGeometryBatch(), glass = createGeometryBatch(), rails = createGeometryBatch();
    const standoff = .018 + .012 + .1;
    for (let r = 0; r < sp.rows; r++) {
      const sc = sp.origin.s + (r + .5) * (sp.panel.h + .02);
      for (let c = 0; c < sp.columns; c++) {
        const xc = sp.origin.x + (c + .5) * (sp.panel.w + .02);
        buildPvModule(sp.panel.w, sp.panel.h, { frame, glass }, inFrame(1, [xc, standoff, sc]));
      }
      const span = sp.columns * (sp.panel.w + .02);
      for (const ds of [-sp.panel.h / 4, sp.panel.h / 4]) {
        rails.box([span + .1, .04, .04], inFrame(1, [0, standoff - .04, sc + ds]));
        for (let x = sp.origin.x + .2; x < sp.origin.x + span; x += 1.2) rails.box([.05, standoff - .02, .06], inFrame(1, [x, (standoff - .02) / 2 + .018, sc + ds]));
      }
    }
    put("solar.array", frame.build(), m.brushed, "module-frames");
    put("solar.array", glass.build(), m.pv, "cells");
    put("solar.array", rails.build(), m.brushed, "rails-and-feet");
  }

  /* -------------------------------------------------------------- actions */
  const openingSlots = layout.openings.map(o => ({ o, slot: [...moving.entries()].find(([id]) => id.startsWith(o.id + "."))?.[1] })).filter(x => x.slot) as Array<{ o: ResolvedOpening; slot: Object3D }>;
  const roofLayers = ["roof.shingles", "roof.ridge-cap", "roof.underlayment", "roof.decking"].filter(has).map(G);
  const wallLayers = ["siding", "sheathing", "insulation", "framing"].map(l => G(`wall.front.${l}`));
  const rest = captureTransforms([...moving.values(), ...roofLayers, ...wallLayers, ...openingSlots.map(x => x.slot).flatMap(s => s.children[0]?.children ?? [])]);
  const hasGarage = layout.openings.some(o => o.kind === "garage-door");
  const actions: HeroActionSpec[] = [
    { id: "door-open", label: "Front door opens", durationFrames: 50, loop: false, meaning: "Arrival or access: the entry door swings into the house." },
    { id: "windows-open", label: "Windows open", durationFrames: 60, loop: false, meaning: "Ventilation: lower sashes slide up in a staggered wave." },
    ...(hasGarage ? [{ id: "garage-open", label: "Garage opens", durationFrames: 75, loop: false, meaning: "The sectional garage door rolls up along its tracks." }] : []),
    ...(moving.has("hvac.condenser.fan") ? [{ id: "condenser-run", label: "Condenser runs", durationFrames: 60, loop: true, meaning: "The cooling system is running: the outdoor fan spins up." }] : []),
    { id: "lights-on", label: "Lights on", durationFrames: 36, loop: false, meaning: "Someone is home: interior lights warm up behind the glass." },
    { id: "roof-peel", label: "Roof layers lift", durationFrames: 90, loop: false, meaning: "Reveal roof construction: shingles, underlayment and decking lift off in order, exposing rafters and attic insulation." },
    { id: "wall-peel", label: "Wall layers slide out", durationFrames: 90, loop: false, meaning: "Reveal wall construction: siding, sheathing, insulation and studs slide out from the front wall in order." },
  ];
  const frontDoor = openingSlots.find(x => x.o.kind === "door" && x.o.facade === "front") ?? openingSlots.find(x => x.o.kind === "door");
  const pose = (state: HeroActionState) => {
    rest.restore();
    m.setInteriorLight(0);
    if (!state.id) return;
    const spec = findAction(actions, state.id), t = actionTime(spec, state.frame, state.fps);
    switch (spec.id) {
      case "door-open": if (frontDoor) frontDoor.slot.rotation.y = 1.45 * spring(Math.max(0, t - .05) * 1.15, .85, .6); break;
      case "windows-open": openingSlots.forEach(({ o, slot }, i) => {
        if (o.kind !== "window" || o.style !== "double-hung") return;
        const k = easeInOut(window01(t, .05 + i * .03, .55 + i * .03));
        slot.position.y = (rest.of(slot).position.y) + k * (o.v1 - o.v0) * .42;
      }); break;
      case "garage-open": openingSlots.forEach(({ o, slot }) => {
        if (o.kind !== "garage-door") return;
        const sh = slot.userData.sectionHeight as number, sections = slot.children[0]?.children ?? [];
        const travel = easeInOut(window01(t, .05, .95)) * (o.v1 - o.v0 + .3);
        sections.forEach((sec, i) => {
          const r = rest.of(sec), along = (r.position.y - o.v0) + travel, rise = o.v1 - o.v0 - sh * .5;
          if (along <= rise) { sec.position.y = o.v0 + along; sec.position.z = r.position.z; sec.rotation.x = 0; }
          else { const over = along - rise; sec.position.y = o.v0 + rise + Math.min(over, .25) * .6; sec.position.z = r.position.z - over; sec.rotation.x = -Math.min(1, over / .3) * Math.PI / 2; }
          void i;
        });
      }); break;
      case "condenser-run": {
        // Spin-up ramp then steady 14 rev/s, integrated analytically from the absolute frame.
        const fan = moving.get("hvac.condenser.fan");
        const f = Math.max(0, state.frame) * 30 / (state.fps ?? 30), ramp = 45, rev = 14 / 30;
        const turns = f < ramp ? rev * f * f / (2 * ramp) : rev * (ramp / 2 + f - ramp);
        if (fan) fan.rotation.y = -turns * Math.PI * 2;
        break;
      }
      case "lights-on": m.setInteriorLight(window01(t, .05, .7) * (t < .3 ? (Math.sin(t * 80) > -.3 ? 1 : .4) : 1)); break;
      case "roof-peel": roofLayers.forEach((g, i) => {
        const k = easeInOut(window01(t, .05 + i * .14, .45 + i * .14));
        g.position.y = rest.of(g).position.y + k * (1.6 + (roofLayers.length - i) * .55);
      }); break;
      case "wall-peel": wallLayers.forEach((g, i) => {
        const k = easeInOut(window01(t, .05 + i * .15, .42 + i * .15));
        g.position.z = rest.of(g).position.z + k * (2.4 - i * .55);
      }); break;
    }
  };

  // Shadows: thin interior layers do not need to cast.
  root.traverse(o => { if ((o as { isMesh?: boolean }).isMesh && /glass|interior-light|dome/.test(o.name)) o.castShadow = false; });

  const site = layout.site;
  const b = layout.bounds;
  const bounds = site ? { min: [b.min[0], 0, b.min[2]] as const, max: b.max } : b;
  return {
    id: layout.id, group: root, parts: res.parts, tier: "hero", metersPerUnit: 1, exposure: .9,
    bounds: { min: [...bounds.min] as [number, number, number], max: [...bounds.max] as [number, number, number] },
    // A site block is its own ground: no cyclorama, so any orbit angle stays clean. Bare houses keep the product sweep.
    studio: { palette: "slate", keyAzimuth: -42, environmentIntensity: .5, ...(site ? { extent: { min: site.min, max: [site.max[0], b.max[1], site.max[2]] }, floorY: site.min[1], backdropEnabled: false } : { floorY: b.min[1] }) },
    actions, pose, layout, materials: m, moving,
    craft: {
      materials: ["painted lap siding with wood grain", "oriented strand board (sheathing, decking, subfloor)", "kiln-dried lumber with grain and knots",
        "asphalt shingles with granule relief and per-tab color", "printed synthetic underlayment", "fiberglass batts and blown attic insulation",
        "gypsum drywall", "broom-finished concrete, CMU and running-bond brick", "galvanized ducts, copper lines, aluminum gutters", "soil strata and lawn"],
      details: ["tilted lap boards with real shadow lines, rake-cut in the gables", "king/jack studs, headers, sills and cripples at every opening",
        "double top plates, rim joists, gable studs and rake plates", "individual shingle tabs with staggered slots, ridge cap and drip edge",
        "rafters, fly rafters, lookouts, ridge board, collar ties and ceiling joists", "K-style gutters with hangers; downspouts with goosenecks and splash blocks",
        "double-hung sashes with muntins, casings, sills and aprons", "six-panel door on a hinge pivot", "condenser with louvers, coil, fan guard and spinning fan",
        "duct elbows, joint collars and registers", "soldered copper fittings", "entry steps sized to the floor height"],
    },
    dispose() { res.dispose(); m.dispose(); },
  };
}

/** Inspect a built house through `InspectableAsset`: real mesh bounds per frame, anchors that follow moving parts. */
export function inspectHouse3D(asset: HouseAsset, poseAt?: (frame: number) => void): InspectableAsset {
  const { layout } = asset;
  return inspectHeroAsset(asset, {
    parts: layout.parts.map(p => ({ id: p.id, parentId: p.parentId, label: p.label, role: p.role, hideable: p.hideable, ghostable: p.hideable, clippable: p.clippable })),
    anchors: layout.anchors.map(a => ({ id: a.id, partId: a.partId, kind: a.kind, medium: a.medium, position: a.position, normal: a.normal })),
    states: [...(asset.actions ?? []).map(a => a.id), ...HOUSE_STATES],
    capabilities: { sectioning: "clip", explodable: true, canGhost: true, flowPorts: true, stateful: true },
    poseAt, revision: `${layout.id}:3d:${layout.parts.length}`,
  });
}

/** World-space quaternion helper for consumers placing labels on facades. */
export function facadeQuaternion(layout: HouseLayout, facade: keyof HouseLayout["facades"]): Quaternion {
  const q = new Quaternion(), p = new Vector3(), s = new Vector3();
  facadeMatrix(layout.facades[facade]).decompose(p, q, s);
  return q;
}
export { facadePoint };
