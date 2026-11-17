/**
 * ARCH1 storybook scenes, part 5: churches, bridges, mills, castles, glasshouses, domes and rooms.
 *
 * Built as their builders built them:
 *
 * - Romanesque walls are thick, with round arches and pilaster strips; Gothic walls thin to piers between tall
 *   pointed windows, and the vault's thrust is carried out over the aisles by flying buttresses to stepped
 *   buttresses weighted with pinnacles (Amiens: a vault 42.3 m high over a 14.6 m bay).
 * - Medieval bridges have piers about 1/5–1/10 of the span, pointed cutwaters upstream to split the flow, and
 *   refuges over them; Roman arches are semicircular, later ones segmental or pointed.
 * - An overshot wheel needs a head of water greater than its diameter; the leat brings water to its top.
 * - Stave churches stack steep shingled roofs round a raised centre, with dragon heads on the gables (Borgund).
 * - Victorian glasshouses are iron ribs and small panes over a brick plinth (the Palm House at Kew, 1844–48).
 * - Rooms are lit by their windows: a sun shaft with dust, and the warm light of an oven, a hearth or a candle.
 */
import type { ArchShape, Node } from "./arch-sdf";
import { archRoll, boxDistance, frame, leaf, sculpt, union } from "./arch-sdf";
import type { SceneBuilder } from "./arch-kit";
import { beam, box, boxAt, capsule, clump, coneY, cut, cylX, cylY, cylZ, dome, ellipsoid, gableRoof, gableWall, hills, hipRoof, lanternParts, opening, openingTop, pentRoof, repeatAround, repeatWheel, repeatX, repeatZ, revolve, sphere, spire, tower, tree, windowParts } from "./arch-kit";
import type { SurfaceSpec } from "./arch-surface";

// ---- Churches and cathedrals ------------------------------------------------------------------------------------------------

export interface ChurchSpec {
  style: "romanesque" | "gothic";
  /** Nave length (x), width (z) and wall height. */
  L: number; W: number; H: number;
  bays: number;
  wall: SurfaceSpec; roof: SurfaceSpec;
  aisles?: { w: number; h: number };
  flying?: boolean;
  /** Towers: a west front pair, one west tower, or a crossing tower. */
  towers?: "west-pair" | "west" | "crossing" | "none";
  towerH?: number;
  spire?: SurfaceSpec | null;
  apse?: boolean;
  rose?: boolean;
  glass?: SurfaceSpec;
  /** A ruin: no roofs, broken tops, ivy. */
  ruin?: boolean;
}
/** A flying buttress: a quadrant arch rising from an outer pier to the nave wall, under a straight sloping top. */
function flyer(x0: number, zOut: number, yOut: number, zIn: number, yIn: number, t: number, mat: number): Node {
  const dir = Math.sign(zIn - zOut), R = Math.abs(zIn - zOut), yC = yIn - R - 0.5, cz = zIn;
  const ax = zOut, ay = yOut + 0.7, bx = zIn, by = yIn + 0.2, ex = bx - ax, ey = by - ay, el = Math.hypot(ex, ey);
  return leaf((x, y, z) => {
    // below the top line (signed distance to the line, positive above it)
    const top = ((z - ax) * -ey + (y - ay) * ex) / el * -dir * -1;
    const arc = R - Math.hypot(z - cz, y - yC);
    const zs = dir > 0 ? Math.max(zOut - z, z - zIn) : Math.max(z - zOut, zIn - z);
    return Math.max(top, arc, zs, Math.abs(x - x0) - t / 2, yC - y);
  }, [x0 - t, yC, Math.min(zOut, zIn)], [x0 + t, Math.max(yOut, yIn) + 1, Math.max(zOut, zIn)], mat);
}
/** A church or cathedral, the nave along x, its long side facing +z, the west front at −x. */
export function church(b: SceneBuilder, c: ChurchSpec): { top: number } {
  const wm = b.mat(c.wall), rm = b.mat(c.roof), gm = b.mat(c.glass ?? { kind: "stained", emit: 0 }), gothic = c.style === "gothic";
  const bay = c.L / c.bays, shape: ArchShape = gothic ? "pointed" : "round", parts: Node[] = [], cutN: Node[] = [];
  const aw = c.aisles?.w ?? 0, ah = c.aisles?.h ?? 0;
  // clerestory (or nave) windows
  for (let i = 0; i < c.bays; i++) {
    const x = -c.L / 2 + bay * (i + 0.5), ww = gothic ? bay * 0.42 : bay * 0.24, y0 = c.aisles ? ah + 1.2 : c.H * 0.35, hh = gothic ? c.H - y0 - 1.6 : Math.min(3.2, c.H - y0 - 1.2);
    for (const side of [1, -1]) {
      const zf = side * c.W / 2;
      cutN.push(opening(x, y0, ww, Math.max(0.5, hh - openingTop(ww, 0, shape)), shape, zf - 1.2 * side, zf + 0.6 * side, "z"));
      parts.push(boxAtGlass(x, y0, zf - side * 0.35, ww, hh, shape, gm));
    }
  }
  parts.push(cut(boxAt(-c.L / 2, 0, -c.W / 2, c.L / 2, c.H, c.W / 2, wm, b.r()), cutN));
  if (!c.ruin) parts.push(gableRoof({ x0: -c.L / 2, x1: c.L / 2, z0: -c.W / 2, z1: c.W / 2, y: c.H, pitch: gothic ? 56 : 36, over: 0.3 }, rm), gableWall({ x0: -c.L / 2, x1: c.L / 2, z0: -c.W / 2, z1: c.W / 2, y: c.H, pitch: gothic ? 56 : 36 }, wm));
  else parts.push(...ruinTop(b, -c.L / 2, c.L / 2, c.W / 2, c.H, wm));
  // pilaster strips (Romanesque) or Lombard bands under the eaves
  if (!gothic) for (const side of [1, -1]) { parts.push(repeatX(boxAt(-c.L / 2, 0, side * c.W / 2 - 0.15, -c.L / 2 + 0.6, c.H, side * c.W / 2 + 0.15, wm), bay, c.bays + 1)); parts.push(boxAt(-c.L / 2, c.H - 0.6, side * c.W / 2 - 0.1, c.L / 2, c.H - 0.35, side * c.W / 2 + 0.12, wm)); }
  // aisles with lean-to roofs and their own windows
  if (c.aisles) for (const side of [1, -1]) {
    const z0 = side * c.W / 2, z1 = side * (c.W / 2 + aw), ac: Node[] = [];
    for (let i = 0; i < c.bays; i++) { const x = -c.L / 2 + bay * (i + 0.5), ww = gothic ? bay * 0.4 : bay * 0.22, hh = ah - 2.6; ac.push(opening(x, 1.4, ww, Math.max(0.4, hh - openingTop(ww, 0, shape)), shape, z1 - side * 1, z1 + side * 0.5, "z")); parts.push(boxAtGlass(x, 1.4, z1 - side * 0.35, ww, hh, shape, gm)); }
    parts.push(cut(boxAt(-c.L / 2, 0, Math.min(z0, z1), c.L / 2, ah, Math.max(z0, z1), wm, b.r()), ac));
    if (!c.ruin) parts.push(pentRoof(-c.L / 2 - 0.2, c.L / 2 + 0.2, z0, side * (aw + 0.4), ah + aw * Math.tan((26 * Math.PI) / 180) + 0.3, 26, rm));
    // buttresses between the bays, stepped, with pinnacles
    for (let i = 0; i <= c.bays; i++) {
      const x = -c.L / 2 + bay * i, bt = gothic ? 1.2 : 0.6;
      parts.push(boxAt(x - 0.45, 0, Math.min(z1, z1 + side * bt), x + 0.45, ah + (gothic ? 2.5 : 0), Math.max(z1, z1 + side * bt), wm, b.r()));
      parts.push(boxAt(x - 0.5, 0, Math.min(z1, z1 + side * (bt + 0.5)), x + 0.5, ah * 0.45, Math.max(z1, z1 + side * (bt + 0.5)), wm));
      if (gothic) {
        const pz = z1 + side * bt * 0.5, py = ah + 2.5;
        parts.push(spire(x, pz, py, py + 3.2, 0.5, 4, wm, 0, Math.PI / 4));
        if (c.flying && !c.ruin) { parts.push(flyer(x, pz, py - 0.6, side * c.W / 2, c.H - 1.2, 0.55, wm)); parts.push(flyer(x, pz, py - 4.2, side * c.W / 2, c.H - 5.0, 0.5, wm)); }
      }
    }
  }
  let top = c.H;
  // the west front
  const xw = -c.L / 2;
  if (c.towers === "west-pair" || c.towers === "west") {
    const th = c.towerH ?? c.H * 1.6, tw = c.towers === "west-pair" ? Math.max(4, aw + 1) : c.W * 0.55;
    const zs = c.towers === "west-pair" ? [c.W / 2 + aw / 2, -(c.W / 2 + aw / 2)] : [0];
    for (const z of zs) {
      // belfry stages: paired lancets on the front and the side of the upper two stages
      const tc: Node[] = [];
      for (let k = 1; k < 3; k++) for (const o of [-0.17, 0.17]) {
        const y0 = th * (0.42 + (k - 1) * 0.27), lw = tw * 0.13, lh = th * 0.16;
        tc.push(opening(z + o * tw, y0, lw, lh - openingTop(lw, 0, shape), shape, xw - tw - 1, xw - tw + 1.2, "x"));
        tc.push(opening(xw - tw / 2 + o * tw, y0, lw, lh - openingTop(lw, 0, shape), shape, z + tw / 2 - 1.2, z + tw / 2 + 1, "z"));
      }
      parts.push(cut(boxAt(xw - tw, 0, z - tw / 2, xw, th, z + tw / 2, wm, b.r()), tc));
      if (gothic) {
        // stepped corner buttresses up the tower, each crowned by a pinnacle
        for (const cz of [z - tw / 2, z + tw / 2]) for (const cx of [xw - tw]) {
          parts.push(boxAt(cx - 1.4, 0, cz - 0.6, cx + 0.4, th * 0.4, cz + 0.6, wm), boxAt(cx - 1.0, th * 0.4, cz - 0.5, cx + 0.3, th * 0.78, cz + 0.5, wm), boxAt(cx - 0.6, th * 0.78, cz - 0.4, cx + 0.2, th, cz + 0.4, wm));
          parts.push(spire(cx - 0.2, cz, th, th + 4.5, 0.55, 4, wm, 0, Math.PI / 4));
        }
        // an open parapet of small merlons round the tower top
        parts.push(repeatZ(box(xw - tw - 0.15, th + 0.45, z - tw / 2 + 0.6, 0.2, 0.45, 0.25, wm), 1.1, Math.max(2, Math.floor(tw / 1.1))));
      }
      if (c.spire !== null && !c.ruin) { const sm = b.mat(c.spire ?? c.roof); parts.push(spire(xw - tw / 2, z, th, th + (gothic ? th * 0.75 : th * 0.35), tw * 0.5, gothic ? 8 : 4, sm, b.r(), gothic ? 0 : Math.PI / 4)); top = Math.max(top, th + (gothic ? th * 0.75 : th * 0.35)); }
      else top = Math.max(top, th + (gothic ? 4.5 : 0));
    }
    // three portals deep in orders (the middle one tallest), each under a gable; above them a gallery of niches
    const pw = c.W * 0.32, pc: Node[] = [];
    const portals = c.towers === "west-pair" ? [[0, pw, 1], [c.W / 2 + aw / 2, pw * 0.7, 0.75], [-(c.W / 2 + aw / 2), pw * 0.7, 0.75]] : [[0, pw, 1]];
    for (const [pz, w, k0] of portals) for (let k = 0; k < 4; k++) pc.push(opening(pz, 0, w - k * 0.35, (3.4 - k * 0.1) * k0 + 1.2 * (k0 - 0.75), shape, xw - (c.towers === "west-pair" && pz !== 0 ? tw + 2.6 : 2.4), xw - (c.towers === "west-pair" && pz !== 0 ? tw : 0) - 0.3 - k * 0.5, "x"));
    parts.push(cut(boxAt(xw - 1.2, 0, -c.W / 2, xw + 0.01, c.H, c.W / 2, wm), pc.filter(p => p.lo[0] > xw - 3)));
    if (c.towers === "west-pair") for (const z of zs) parts.push(cut(boxAt(xw - tw - 1.4, 0, z - tw / 2 + 0.7, xw - tw, 9, z + tw / 2 - 0.7, wm), pc.filter(p => p.lo[0] < xw - 3 && Math.abs((p.lo[2] + p.hi[2]) / 2 - z) < tw)));
    for (const [pz, w, k0] of portals) { const xf = c.towers === "west-pair" && pz !== 0 ? xw - tw - 1.4 : xw - 1.2, yb = openingTop(w, (3.4 * k0) + 1.2 * (k0 - 0.75), shape) + 0.4; parts.push(gableRoof({ x0: xf - 0.5, x1: xf + 0.1, z0: pz - w / 2 - 0.4, z1: pz + w / 2 + 0.4, y: yb, pitch: 58, over: 0, t: 0.6, ridge: "x" }, wm)); }
    parts.push(box(xw - 0.3, 1.9, 0, 0.08, 1.9, pw / 2 - 0.9, b.mat({ kind: "boards", colour: "#4a3424" })));
    if (gothic) parts.push(cut(boxAt(xw - 1.6, c.H * 0.42, -c.W / 2, xw - 1.2, c.H * 0.42 + 3.2, c.W / 2, wm), Array.from({ length: Math.floor(c.W / 1.4) }, (_, k) => opening(-c.W / 2 + 0.7 + k * 1.4, c.H * 0.42 + 0.4, 0.8, 1.6, "pointed", xw - 2, xw - 1.35, "x"))));
    if (c.rose) { const rs = b.mat({ kind: "stained", emit: 0 }); parts.push(cylX(c.H * 0.68, 0, xw - 1.25, xw - 1.1, c.W * 0.28, rs), ringX(xw - 1.25, c.H * 0.68, 0, c.W * 0.28, 0.3, 0.3, wm)); }
  }
  if (c.towers === "crossing") {
    const tw = c.W * 0.9, th = c.towerH ?? c.H * 1.5;
    top = Math.max(top, tower(b, { x: c.L * 0.15, z: 0, plan: gothic ? "square" : "octagon", r: tw / 2, h: th, wall: c.wall, roof: c.spire === null ? undefined : { kind: gothic ? "spire" : "pyramid", h: gothic ? th * 0.9 : th * 0.35, mat: c.spire ?? c.roof }, belfry: true }));
  }
  if (c.apse) {
    const r = c.W / 2, xe = c.L / 2;
    parts.push(cut(cylY(xe, 0, 0, c.H * 0.85, r, wm, b.r()), [boxAt(xe - r - 1, -1, -r - 1, xe, c.H + 1, r + 1, 0)]));
    if (!c.ruin) parts.push(cut(coneY(xe, 0, c.H * 0.85, c.H * 0.85 + r * 0.9, r + 0.3, 0.05, rm), [boxAt(xe - r - 2, 0, -r - 2, xe, c.H * 2, r + 2, 0)]));
  }
  b.add(...parts);
  return { top };
}
/** Glass in a pointed or round window, set back in the wall facing ±z. */
function boxAtGlass(x: number, y0: number, z: number, w: number, h: number, shape: ArchShape, mat: number): Node {
  const hs = Math.max(0.3, h - openingTop(w, 0, shape)), o = opening(x, y0, w + 0.05, hs, shape, z - 0.03, z + 0.03, "z");
  return leaf(o.f, o.lo, o.hi, mat);
}
/** A ring of moulding in a wall facing −x (round a rose window). */
function ringX(x: number, y: number, z: number, r: number, w: number, d: number, mat: number): Node {
  return leaf((px, py, pz) => Math.max(Math.abs(Math.hypot(py - y, pz - z) - r - w / 2) - w / 2, Math.abs(px - x) - d / 2), [x - d, y - r - w, z - r - w], [x + d, y + r + w, z + r + w], mat);
}
/** The broken tops of ruined walls: jagged, as if stones fell. */
function ruinTop(b: SceneBuilder, x0: number, x1: number, zHalf: number, h: number, mat: number): Node[] {
  const parts: Node[] = [];
  for (let x = x0; x < x1; x += 1.2) { const hh = h * (0.75 + 0.25 * b.r()); for (const z of [zHalf, -zHalf]) parts.push(boxAt(x, h - 0.5, z - 0.6, x + 1.2, hh, z + 0.6, mat, b.r())); }
  return parts;
}

// ---- Bridges and aqueducts --------------------------------------------------------------------------------------------------

export interface BridgeSpec {
  /** Arches across the river (x), their span and shape. */
  arches: number; span: number; shape: ArchShape;
  /** Deck height above the water, roadway width. */
  h: number; w: number;
  pier?: number;
  wall: SurfaceSpec; ring?: SurfaceSpec;
  cutwaters?: boolean; refuges?: boolean;
  /** A second tier of smaller arches (an aqueduct). */
  tier2?: { arches: number; h: number };
  /** Depth of the river bed below the water line. */
  water?: number;
  /** A humped deck: the radius of the curve its top follows (packhorse bridges). */
  hump?: number;
}
/** A masonry arch bridge along x, its upstream face to +z. Returns its length. */
export function bridge(b: SceneBuilder, s: BridgeSpec): number {
  const pier = s.pier ?? Math.max(1.2, s.span / 6), L = s.arches * s.span + (s.arches + 1) * pier, wm = b.mat(s.wall), rm = b.mat(s.ring ?? { ...s.wall, colour: undefined, kind: "ashlar", course: 0.35 });
  const base = -(s.water ?? 1.5) - 1, cuts: Node[] = [], parts: Node[] = [];
  const spring = s.shape === "pointed" ? s.h - s.span * 0.87 - 1.0 : s.shape === "segmental" ? s.h - s.span * 0.21 - 1.0 : s.h - s.span / 2 - 1.0;
  for (let i = 0; i < s.arches; i++) {
    const x = -L / 2 + pier + s.span / 2 + i * (s.span + pier);
    cuts.push(opening(x, base, s.span, spring - base, s.shape, -s.w, s.w, "z"));
    // the arch ring of voussoirs, a little proud of the spandrel
    const r = s.span / 2, top = openingTop(s.span, spring - base, s.shape) + base;
    parts.push(cut(boxAt(x - r - 0.55, spring, -s.w / 2 - 0.06, x + r + 0.55, top + 0.6, s.w / 2 + 0.06, rm, b.r()), [opening(x, base, s.span, spring - base, s.shape, -s.w, s.w, "z"), outsideArch(x, spring, r + 0.55, s.shape, top + 0.6 - spring, s.w)]));
  }
  parts.push(cut(boxAt(-L / 2, base, -s.w / 2, L / 2, s.h, s.w / 2, wm, b.r()), cuts));
  // parapets and coping
  for (const side of [1, -1]) { parts.push(boxAt(-L / 2, s.h, side * s.w / 2 - (side > 0 ? 0.45 : 0), L / 2, s.h + 1.0, side * s.w / 2 + (side < 0 ? 0.45 : 0), wm, b.r())); parts.push(boxAt(-L / 2, s.h + 1.0, side * s.w / 2 - (side > 0 ? 0.55 : -0.1), L / 2, s.h + 1.15, side * s.w / 2 + (side < 0 ? 0.55 : 0.1), rm)); }
  parts.push(boxAt(-L / 2, s.h - 0.2, -s.w / 2 + 0.45, L / 2, s.h + 0.05, s.w / 2 - 0.45, b.mat({ kind: "setts", moss: 0.4 })));
  if (s.cutwaters) for (let i = 1; i < s.arches; i++) {
    const x = -L / 2 + i * (s.span + pier) + pier / 2;
    for (const side of [1, -1]) {
      const zEdge = side * s.w / 2, tip = zEdge + side * pier * 0.9, topY = s.refuges ? s.h + 1.0 : spring + 0.8;
      parts.push(wedge(x, zEdge, tip, pier / 2, base, topY, wm));
      if (s.refuges) parts.push(boxAt(x - pier / 2 - 0.1, s.h + 1.0, Math.min(zEdge, tip) - 0.05, x + pier / 2 + 0.1, s.h + 1.15, Math.max(zEdge, tip) + 0.05, rm));
      else parts.push(spire(x, (zEdge + tip) / 2, topY, topY + 1.4, pier * 0.42, 4, wm, 0, Math.PI / 4));
    }
  }
  if (s.tier2) {
    const n = s.tier2.arches, sp = (L - (n + 1) * pier * 0.6) / n, y0 = s.h + 1.15, c2: Node[] = [];
    for (let i = 0; i < n; i++) { const x = -L / 2 + pier * 0.6 + sp / 2 + i * (sp + pier * 0.6); c2.push(opening(x, y0, sp, s.tier2.h - sp / 2 - 1, "round", -s.w, s.w, "z")); }
    parts.push(cut(boxAt(-L / 2, y0, -s.w / 2 + 0.6, L / 2, y0 + s.tier2.h, s.w / 2 - 0.6, wm, b.r()), c2));
  }
  if (s.hump) {
    // trim everything above a wide circle so the deck and parapets rise over the arch
    const R = s.hump, cy = s.h + 1.15 - R;
    b.add(...parts.map(n => ({ lo: n.lo, hi: n.hi, f: (x: number, y: number, z: number) => Math.max(n.f(x, y, z), Math.hypot(x, y - cy) - R) })));
  } else b.add(...parts);
  return L;
}
/** Everything outside an arch's ring (to trim the ring's box to an arch shape). */
function outsideArch(x: number, spring: number, R: number, shape: ArchShape, rise: number, w: number): Node {
  const o = opening(x, spring - 20, 2 * R, 20, shape, -w, w, "z");
  return { lo: [x - R - 2, spring - 1, -w], hi: [x + R + 2, spring + rise + 2, w], f: (px, py, pz) => -o.f(px, py, pz) };
}
/** A pointed cutwater: a wedge from the pier face (z = `z0`) to its tip (z = `tip`). */
function wedge(x: number, z0: number, tip: number, half: number, y0: number, y1: number, mat: number): Node {
  const dir = Math.sign(tip - z0), len = Math.abs(tip - z0), k = 1 / Math.hypot(1, half / len);
  return leaf((px, py, pz) => {
    const along = (pz - z0) * dir, side = (Math.abs(px - x) - half * (1 - along / len)) * k;
    return Math.max(side, -along, along - len, y0 - py, py - y1);
  }, [x - half, y0, Math.min(z0, tip)], [x + half, y1, Math.max(z0, tip)], mat);
}

// ---- Mills, barns, kilns ------------------------------------------------------------------------------------------------------

/** An overshot water wheel in the plane z = `z` (axle along z), radius `R`, `w` wide, with its leat. */
export function waterWheel(b: SceneBuilder, x: number, y: number, z: number, R: number, w: number, leat = true) {
  const oak = b.mat({ kind: "oak", colour: "#4f4234", age: 0.8, moss: 0.3 }), iron = b.mat({ kind: "iron", age: 0.8 }), wet = b.mat({ kind: "water", colour: "#7e9aa0" });
  for (const dz of [-w / 2, w / 2]) b.add(cut(cylZ(x, y, z + dz - 0.07, z + dz + 0.07, R, oak), [cylZ(x, y, z + dz - 0.2, z + dz + 0.2, R - 0.22, 0)]));
  b.add(repeatWheel(beam(x, y, z - w / 2, x + R - 0.15, y, z - w / 2, 0.12, oak), x, y, 8, R), repeatWheel(beam(x, y, z + w / 2, x + R - 0.15, y, z + w / 2, 0.12, oak), x, y, 8, R));
  b.add(repeatWheel(box(x + R - 0.14, y, z, 0.13, 0.04, w / 2, oak), x, y, 28, R));
  b.add(cylZ(x, y, z - w / 2 - 0.6, z + w / 2 + 0.3, 0.18, iron));
  if (leat) {
    b.add(boxAt(x - 0.5, y + R + 0.15, z - w / 2 - 0.1, x + 4.5, y + R + 0.75, z + w / 2 + 0.1, oak));
    b.add(boxAt(x - 0.3, y + R + 0.6, z - w / 2 + 0.05, x + 4.4, y + R + 0.66, z + w / 2 - 0.05, wet));
    for (const px of [x + 1.8, x + 3.8]) b.add(beam(px, -1, z, px, y + R + 0.15, z, 0.2, oak));
    // water spilling into the buckets
    b.add(cut(cylZ(x, y, z - w / 2 + 0.05, z + w / 2 - 0.05, R + 0.06, wet), [boxAt(x - R - 1, y - R - 1, z - w, x + R * 0.15, y + R + 1, z + w, 0), boxAt(x - R - 1, y - R - 1, z - w, x + R + 1, y - 0.2, z + w, 0), cylZ(x, y, z - w, z + w, R - 0.08, 0)]));
  }
}
/** A windmill: a tapering tower with a turning cap and four sails, facing +z. */
export function windmill(b: SceneBuilder, x: number, z: number, h: number, r: number, wall: SurfaceSpec, cap: SurfaceSpec, sailAngle = 20) {
  const wm = b.mat(wall), cm = b.mat(cap), oak = b.mat({ kind: "oak", colour: "#5d4d3c" }), cloth = b.mat({ kind: "fabric", colour: "#e8dcc4", colour2: "#d9ccb2" });
  const wp = windowParts(b, x, h * 0.45, z + r * 0.8, { w: 0.6, h: 0.8, panes: [2, 2] }, 0.6);
  b.add(cut(coneY(x, z, 0, h, r, r * 0.68, wm), [wp.cutter]), ...wp.parts);
  b.add(revolve(x, z, h, h + r * 1.1, t => r * 0.78 * Math.cos(t * Math.PI / 2) ** 0.6 + 0.02, r * 0.8, cm, 0, 2));
  const hx = x, hy = h + r * 0.4, hz = z + r * 0.85, L = h * 0.8;
  b.add(cylZ(hx, hy, z, hz + 0.3, 0.2, oak));
  for (let k = 0; k < 4; k++) {
    const a = ((sailAngle + k * 90) * Math.PI) / 180, ex = hx + Math.cos(a) * L, ey = hy + Math.sin(a) * L;
    b.add(beam(hx, hy, hz + 0.3, ex, ey, hz + 0.3, 0.18, oak));
    // a lattice sail with its cloth half reefed
    const nx = -Math.sin(a), ny = Math.cos(a);
    b.add(beam(hx + Math.cos(a) * L * 0.25 + nx * 0.9, hy + Math.sin(a) * L * 0.25 + ny * 0.9, hz + 0.25, ex + nx * 0.9, ey + ny * 0.9, hz + 0.25, 0.06, oak));
    b.add(sailCloth(hx, hy, hz + 0.27, a, L * 0.3, L * 0.95, 0.85, cloth));
  }
}
function sailCloth(x: number, y: number, z: number, a: number, r0: number, r1: number, w: number, mat: number): Node {
  const c = Math.cos(a), s = Math.sin(a);
  return leaf((px, py, pz) => {
    const dx = px - x, dy = py - y, along = dx * c + dy * s, across = -dx * s + dy * c;
    return Math.max(r0 - along, along - r1, -across + 0.05, across - w, Math.abs(pz - z) - 0.015);
  }, [x - r1 - 1, y - r1 - 1, z - 0.02], [x + r1 + 1, y + r1 + 1, z + 0.02], mat);
}

// ---- Stave church ---------------------------------------------------------------------------------------------------------------

/** A Norwegian stave church: tarred boards, stacked steep shingle roofs, a gallery round the base, dragon heads. */
export function staveChurch(b: SceneBuilder) {
  const tar = b.mat({ kind: "boards", colour: "#3a2a1e", course: 0.16, age: 0.3 }), sh = b.mat({ kind: "shingle", colour: "#3d2d22", pattern: "fish", age: 0.3 }), oak = b.mat({ kind: "oak", colour: "#3a2a1e" });
  const tiers = [{ w: 9, d: 7, h: 4.2, p: 52 }, { w: 6, d: 5, h: 7.5, p: 56 }, { w: 3.2, d: 3.2, h: 10.5, p: 60 }];
  // the gallery (svalgang): a low wall with an arcade under a lean-to
  const gw = 11, gd = 9, gc: Node[] = [];
  for (let i = 0; i < 7; i++) gc.push(opening(-gw / 2 + 0.9 + i * 1.4, 0.9, 0.55, 0.7, "round", gd / 2 - 0.6, gd / 2 + 0.4, "z"));
  b.add(cut(boxAt(-gw / 2, 0, -gd / 2, gw / 2, 2.2, gd / 2, tar), gc));
  b.add(hipRoof({ x0: -gw / 2, x1: gw / 2, z0: -gd / 2, z1: gd / 2, y: 2.2, pitch: 30, over: 0.4 }, sh));
  let y = 2.6;
  tiers.forEach((t, k) => {
    b.add(boxAt(-t.w / 2, 0, -t.d / 2, t.w / 2, t.h, t.d / 2, tar));
    b.add(gableRoof({ x0: -t.w / 2, x1: t.w / 2, z0: -t.d / 2, z1: t.d / 2, y: t.h, pitch: t.p, over: 0.35 }, sh), gableWall({ x0: -t.w / 2, x1: t.w / 2, z0: -t.d / 2, z1: t.d / 2, y: t.h, pitch: t.p }, tar));
    // dragon heads on the gable tips of the upper tiers
    if (k > 0) { const ry = t.h + (t.d / 2) * Math.tan((t.p * Math.PI) / 180); for (const side of [-1, 1]) { const x0 = side * (t.w / 2 + 0.3); b.add(capsule(x0, ry - 0.2, 0, x0 + side * 0.9, ry + 0.5, 0, 0.11, oak), capsule(x0 + side * 0.9, ry + 0.5, 0, x0 + side * 1.35, ry + 0.4, 0, 0.09, oak)); } }
    y = t.h;
  });
  // the ridge turret and spire
  b.add(boxAt(-0.9, 10.5, -0.9, 0.9, 13.5, 0.9, tar), spire(0, 0, 13.5, 18.5, 1.25, 4, sh, 0, Math.PI / 4));
  return y;
}

// ---- Glasshouse ---------------------------------------------------------------------------------------------------------------

/** A Victorian iron-and-glass conservatory: a tall curved centre over a brick plinth, lower curved wings. */
export function glasshouse(b: SceneBuilder, L = 30, W = 10, H = 9) {
  const glass = b.mat({ kind: "greenhouse" }), iron = b.mat({ kind: "iron", colour: "#e9e7df", age: 0.1 }), brick = b.mat({ kind: "brick", colour: "#9a5a40", age: 0.4 });
  const plinth = 0.8;
  b.add(boxAt(-L / 2, 0, -W / 2, L / 2, plinth, W / 2, brick));
  // wings: vertical glass walls up to the springing, then a half-round vault; the centre rises higher and is longer across
  const wingWall = H * 0.38, centre = L * 0.3;
  const vault = (x0: number, x1: number, r: number, y0: number, wz: number) => {
    b.add(cut(boxAt(x0, plinth, -wz, x1, y0, wz, glass), [boxAt(x0 + 0.08, plinth, -wz + 0.08, x1 - 0.08, y0 + 1, wz - 0.08, 0)]));
    b.add(cut(cylX(y0, 0, x0, x1, r, glass), [cylX(y0, 0, x0 - 1, x1 + 1, r - 0.08, 0), boxAt(x0 - 1, y0 - r - 1, -r - 1, x1 + 1, y0, r + 1, 0)]));
    // ribs every 1.5 m, and the end walls
    b.add(repeatX(cut(cylX(y0, 0, x0, x0 + 0.1, r + 0.05, iron), [cylX(y0, 0, x0 - 1, x0 + 1, r - 0.1, 0), boxAt(x0 - 1, y0 - r - 1, -r - 1, x0 + 1, y0, r + 1, 0)]), 1.5, Math.floor((x1 - x0) / 1.5) + 1));
    b.add(repeatX(boxAt(x0, plinth, wz - 0.03, x0 + 0.1, y0, wz + 0.05, iron), 1.5, Math.floor((x1 - x0) / 1.5) + 1));
  };
  vault(-L / 2, -centre / 2, W / 2, plinth + wingWall, W / 2);
  vault(centre / 2, L / 2, W / 2, plinth + wingWall, W / 2);
  vault(-centre / 2, centre / 2, W * 0.7, plinth + H * 0.55, W * 0.7);
  b.add(cylY(0, 0, plinth + H * 0.55 + W * 0.7 - 0.2, plinth + H * 0.55 + W * 0.7 + 1.5, 1.2, glass), dome(0, plinth + H * 0.55 + W * 0.7 + 1.5, 0, 1.3, 1.0, iron));
  // palms and ferns inside
  const leafy = b.mat({ kind: "foliage", colour: "#3d6630" }), trunk = b.mat({ kind: "oak", colour: "#6a5a44" });
  for (const [px, ph] of [[-8, 5], [-3, 8], [2, 9.5], [7, 6], [11, 4.5]]) { b.add(cylY(px, -1, 0, ph, 0.18, trunk)); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; b.add(clump(px + Math.cos(a) * 1.2, ph + 0.2, -1 + Math.sin(a) * 1.2, 1.4, 0.35, 0.6, leafy, b.r(), 0.5)); } }
  for (let k = 0; k < 10; k++) b.add(clump(-L / 2 + 2 + k * 2.8, plinth + 0.3, 2.5 * (b.r() - 0.5), 1.1, 0.8, 1.1, leafy, b.r()));
}

// ---- Castles ---------------------------------------------------------------------------------------------------------------

/** A square Norman keep: thick walls with pilaster buttresses, small round-headed windows, corner turrets, battlements, a forebuilding stair. */
export function keep(b: SceneBuilder, w = 18, h = 24, wall: SurfaceSpec = { kind: "ashlar", colour: "#b4ab98", course: 0.4, age: 0.8, moss: 0.3 }) {
  const wm = b.mat(wall), cuts: Node[] = [];
  for (let k = 0; k < 3; k++) for (const x of [-w / 4, w / 4]) cuts.push(opening(x, 6 + k * 6, 0.9, 1.6, "round", w / 2 - 1, w / 2 + 0.5));
  b.add(cut(boxAt(-w / 2, 0, -w / 2, w / 2, h, w / 2, wm, b.r()), cuts));
  for (const x of [-w / 6, w / 6]) b.add(boxAt(x - 0.5, 0, w / 2 - 0.1, x + 0.5, h, w / 2 + 0.35, wm));
  b.add(boxAt(-w / 2 - 0.6, 0, -w / 2 - 0.6, w / 2 + 0.6, 2.5, w / 2 + 0.6, wm));
  for (const cx of [-1, 1]) for (const cz of [-1, 1]) b.add(boxAt(cx * w / 2 - 1.6, 0, cz * w / 2 - 1.6, cx * w / 2 + 1.6, h + 3, cz * w / 2 + 1.6, wm, b.r()));
  b.add(repeatX(box(-w / 2 + 0.5, h + 0.6, w / 2 - 0.35, 0.45, 0.6, 0.35, wm), 1.35, Math.floor(w / 1.35)));
  for (const cx of [-1, 1]) for (const cz of [-1, 1]) b.add(repeatX(box(cx * w / 2 - 1.2, h + 3.6, cz * w / 2 + 1.25, 0.35, 0.6, 0.35, wm), 0.8, 4));
  // forebuilding and stair to the first-floor door
  b.add(boxAt(w / 2 - 6, 0, w / 2, w / 2 - 1.5, 9, w / 2 + 4, wm));
  for (let i = 0; i < 16; i++) b.add(boxAt(-w / 2 + 2 + i * 0.32, 0, w / 2 + 0.3, -w / 2 + 2.32 + i * 0.32, 0.2 + i * 0.32, w / 2 + 1.8, wm));
}
/** A curtain wall with a wall walk and battlements between two points along x, at z. */
export function curtainWall(b: SceneBuilder, x0: number, x1: number, z: number, h: number, wall: SurfaceSpec) {
  const wm = b.mat(wall);
  b.add(boxAt(x0, 0, z - 1.4, x1, h, z + 1.4, wm, b.r()));
  b.add(repeatX(box(x0 + 0.4, h + 0.6, z + 1.15, 0.4, 0.6, 0.25, wm), 1.3, Math.floor((x1 - x0) / 1.3)));
  b.add(boxAt(x0, 0, z + 1.2, x1, 1.8, z + 2.2, wm));
}
/** A gatehouse: two round towers flanking a pointed gate passage with a portcullis. */
export function gatehouse(b: SceneBuilder, x: number, z: number, h: number, wall: SurfaceSpec, roof?: SurfaceSpec) {
  const wm = b.mat(wall);
  b.add(cut(boxAt(x - 4, 0, z - 3, x + 4, h, z + 3, wm, b.r()), [opening(x, 0, 3.2, 3.5, "pointed", z - 4, z + 4)]));
  b.add(box(x, 3.2, z + 1.5, 1.6, 2.6, 0.05, b.mat({ kind: "iron", age: 0.8 })));
  for (const s of [-1, 1]) tower(b, { x: x + s * 4.2, z: z + 1.6, plan: "round", r: 3, h: h + 2, wall, crenel: true, machicolation: true, slits: 3, roof: roof ? { kind: "cone", h: 6, mat: roof } : undefined });
  b.add(repeatX(box(x - 3.6, h + 0.6, z + 2.7, 0.35, 0.6, 0.3, wm), 1.2, 7));
}

// ---- Domes, onion towers, kasbahs, trulli ------------------------------------------------------------------------------------

/** A domed church: a box with pilasters and a pediment, a drum with windows, a dome and its lantern. */
export function domeChurch(b: SceneBuilder, o: { w: number; d: number; h: number; wall: SurfaceSpec; dome: SurfaceSpec; drumR: number; drumH: number; baroque?: boolean; ribs?: SurfaceSpec }) {
  const wm = b.mat(o.wall), dm = b.mat(o.dome), parts: Node[] = [];
  const pc = [opening(0, 0, 2.4, 3.2, "round", o.d / 2 - 1, o.d / 2 + 1)];
  for (const x of [-o.w / 3, o.w / 3]) pc.push(opening(x, 5.5, 1.4, 2.2, "round", o.d / 2 - 1, o.d / 2 + 1));
  parts.push(cut(boxAt(-o.w / 2, 0, -o.d / 2, o.w / 2, o.h, o.d / 2, wm, b.r()), pc));
  parts.push(repeatX(boxAt(-o.w / 2 + 0.2, 0, o.d / 2, -o.w / 2 + 0.9, o.h, o.d / 2 + 0.35, wm), (o.w - 1.1) / 3, 4));
  parts.push(boxAt(-o.w / 2 - 0.3, o.h - 0.1, -o.d / 2 - 0.3, o.w / 2 + 0.3, o.h + 0.6, o.d / 2 + 0.6, wm));
  parts.push(gableRoof({ x0: -o.w / 2, x1: o.w / 2, z0: -o.d / 2, z1: o.d / 2 + 0.6, y: o.h + 0.6, pitch: 22, over: 0.4, ridge: "z" }, b.mat({ kind: "pantile" })), gableWall({ x0: -o.w / 2, x1: o.w / 2, z0: -o.d / 2, z1: o.d / 2 + 0.5, y: o.h + 0.6, pitch: 22, ridge: "z" }, wm));
  if (o.baroque) for (const s of [-1, 1]) parts.push(cut(cylZ(s * (o.w / 2 - 1.8), o.h + 0.6, o.d / 2, o.d / 2 + 0.5, 1.6, wm), [boxAt(s * (o.w / 2 - 1.8) - (s > 0 ? 3 : 0), o.h + 0.6 - 3, o.d / 2 - 1, s * (o.w / 2 - 1.8) + (s < 0 ? 3 : 0), o.h + 0.6 + 3, o.d / 2 + 1, 0), boxAt(-30, o.h - 3, -30, 30, o.h + 0.6, 30, 0)]));
  const dz = -o.d * 0.15, dy = o.h + 2.5, dc: Node[] = [];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; dc.push(windowCutRound(Math.cos(a) * o.drumR, dy + 1, dz + Math.sin(a) * o.drumR, 0.9, o.drumH - 2.2)); }
  parts.push(cut(cylY(0, dz, o.h, dy + o.drumH, o.drumR, wm, b.r()), dc));
  parts.push(cylY(0, dz, dy + o.drumH, dy + o.drumH + 0.5, o.drumR + 0.35, wm));
  const top = dy + o.drumH + 0.5 + o.drumR * 1.15;
  parts.push(dome(0, dy + o.drumH + 0.5, dz, o.drumR + 0.1, o.drumR * 1.15, dm, b.r()));
  if (o.ribs) parts.push(repeatAround(capsuleArc(dy + o.drumH + 0.5, dz, o.drumR + 0.12, o.drumR * 1.17, b.mat(o.ribs)), 0, dz, 8, o.drumR + 0.5));
  parts.push(cylY(0, dz, top - 0.2, top + 2.2, 0.9, wm), dome(0, top + 2.2, dz, 1.0, 0.9, dm), cylY(0, dz, top + 3.0, top + 4.2, 0.05, b.mat({ kind: "gold" })), sphere(0, top + 3.3, dz, 0.22, b.mat({ kind: "gold" })));
  b.add(...parts);
}
function windowCutRound(x: number, y: number, z: number, w: number, h: number): Node {
  const r = Math.hypot(x, 0) + 0.01, a = Math.atan2(z, x);
  return { lo: [x - 1.5, y - 0.1, z - 1.5], hi: [x + 1.5, y + h + w, z + 1.5], f: (px, py, pz) => {
    const qx = px - x, qz = pz - z, c = Math.cos(-a), s = Math.sin(-a), u = qx * s + qz * c * 0, along = qx * c - qz * s;
    const lat = -qx * Math.sin(a) + qz * Math.cos(a);
    const yy = py - y, hs = h - w / 2;
    const d2 = Math.min(Math.max(Math.abs(lat) - w / 2, -yy, yy - hs), Math.hypot(lat, yy - hs) - w / 2);
    return Math.max(d2, Math.abs(along) - 1.2) + 0 * (u + r);
  } };
}
function capsuleArc(y0: number, z0: number, r: number, h: number, mat: number): Node {
  return leaf((x, y, z) => {
    const px = x, pz = z - z0, yy = y - y0;
    const lat = Math.abs(pz) - 0.12;
    const e = Math.hypot(px / r, yy / h) - 1;
    return Math.max(Math.abs(e) * Math.min(r, h) - 0.12, lat, -yy, -px);
  }, [0, y0, z0 - 0.2], [r + 0.2, y0 + h + 0.2, z0 + 0.2], mat);
}
/** A mud-brick kasbah tower: battered walls that taper, a crenellated top with stepped merlons, carved patterns near the top. */
export function kasbahTower(b: SceneBuilder, x: number, z: number, w: number, h: number, earth: SurfaceSpec) {
  const m = b.mat(earth);
  b.add(leaf((px, py, pz) => { const t = Math.min(1, Math.max(0, py / h)), hw = w / 2 * (1 - 0.18 * t); return Math.max(Math.abs(px - x) - hw, Math.abs(pz - z) - hw, -py, py - h) * 0.97; }, [x - w / 2, 0, z - w / 2], [x + w / 2, h, z + w / 2], m, b.r()));
  const tw = w / 2 * 0.82;
  for (const s of [-1, 1]) { b.add(repeatX(box(x - tw + 0.3, h + 0.5, z + s * tw, 0.22, 0.5, 0.2, m), 0.9, Math.max(2, Math.floor((2 * tw) / 0.9)))); }
  b.add(repeatX(box(x - tw + 0.6, h - 1.4, z + tw + 0.02, 0.18, 0.45, 0.04, b.mat({ kind: "plain", colour: "#6b4a30" })), 0.7, Math.floor((2 * tw - 0.6) / 0.7)));
}
/** A trullo: a whitewashed round room under a dry-stone corbelled cone with a white pinnacle. */
export function trullo(b: SceneBuilder, x: number, z: number, r: number) {
  const white = b.mat({ kind: "limewash", colour: "#f1ede2", flake: 0.15, under: "rubble" }), stone = b.mat({ kind: "stone-slate", colour: "#8f897b", course: 0.12, unit: 0.25, moss: 0.4 });
  const wp = windowParts(b, x, 0, z + r, { w: 0.9, h: 1.9, shape: "round", panes: [1, 1], glass: { kind: "boards", colour: "#4b5a6a" } }, 0.8);
  b.add(cut(cylY(x, z, 0, 2.3, r, white), [wp.cutter]), ...wp.parts);
  b.add(coneY(x, z, 2.3, 2.3 + r * 1.55, r + 0.05, 0.25, stone), revolve(x, z, 2.3 + r * 1.5, 2.3 + r * 1.5 + 0.7, t => 0.25 * (1 - t) + 0.12 * Math.sin(t * Math.PI), 0.3, white, 0, 1));
}
/** A lighthouse: a tapering tower with a gallery and a glazed lantern (lit at dusk). */
export function lighthouse(b: SceneBuilder, x: number, z: number, h: number, bands: SurfaceSpec, wall: SurfaceSpec) {
  const wm = b.mat(wall), bm = b.mat(bands), iron = b.mat({ kind: "iron", colour: "#2c3b36" }), glass = b.mat({ kind: "glass", colour: "#ffe3a0", emit: 0.4 });
  b.add(coneY(x, z, 0, h, 2.6, 1.8, wm));
  for (let k = 1; k < 4; k += 2) b.add(coneY(x, z, (k * h) / 4, ((k + 1) * h) / 4, 2.6 - (0.8 * k) / 4 + 0.02, 2.6 - (0.8 * (k + 1)) / 4 + 0.02, bm));
  b.add(cylY(x, z, h, h + 0.3, 2.4, iron), cylY(x, z, h + 0.3, h + 2.2, 1.4, glass), dome(x, h + 2.2, z, 1.6, 1.1, iron));
  b.light({ x, y: h + 1.2, z, kelvin: 2400, power: 3, lamp: true });
}

// ---- Arcades and courtyards ---------------------------------------------------------------------------------------------------

/** A wall pierced by a row of arches (a cloister walk, a souk, a riad's gallery), facing +z at `zf`. */
export function arcade(b: SceneBuilder, x0: number, x1: number, zf: number, n: number, h: number, shape: ArchShape, wall: SurfaceSpec, depth = 3, roof?: SurfaceSpec) {
  const wm = b.mat(wall), span = (x1 - x0) / n, cuts: Node[] = [];
  for (let i = 0; i < n; i++) cuts.push(opening(x0 + span * (i + 0.5), 0, span * 0.72, h * 0.62 - (shape === "pointed" ? span * 0.6 : span * 0.36), shape, zf - 0.8, zf + 0.5));
  b.add(cut(boxAt(x0, 0, zf - 0.6, x1, h, zf, wm, b.r()), cuts));
  b.add(boxAt(x0, h, zf - depth, x1, h + 0.4, zf + 0.1, wm));
  b.add(boxAt(x0, 0, zf - depth - 0.6, x1, h + 0.4, zf - depth, wm));
  if (roof) b.add(pentRoof(x0 - 0.3, x1 + 0.3, zf - depth, depth + 0.6, h + 0.4 + depth * 0.45, 24, b.mat(roof)));
}

// ---- Rooms --------------------------------------------------------------------------------------------------------------------

export interface RoomSpec {
  w: number; d: number; h: number;
  wall: SurfaceSpec; floor: SurfaceSpec; ceiling?: SurfaceSpec;
  /** Ceiling beams across x every `beams` metres. */
  beams?: number;
  /** Windows in the left (−x) or back (−z) wall: centre along the wall, sill, width, height. */
  windows?: { wall: "left" | "back" | "right"; at: number; sill: number; w: number; h: number; shape?: ArchShape; glass?: SurfaceSpec }[];
  /** A sloping attic ceiling (the roof's underside) instead of a flat one: the pitch. */
  attic?: number;
  /** Joinery and finishes that make a room read as built: skirting, cornice, rails, panelling, sills, curtains, a door, pictures. */
  trim?: RoomTrim;
  /** What the windows look out on: "garden" makes clear and leaded panes see-through onto a lawn, a hedge, trees and far hills, lit as outdoors. */
  view?: "garden";
}
type Wall = "left" | "back" | "right";
export interface RoomTrim {
  /** Paint or wood of the mouldings. */
  mould?: SurfaceSpec;
  /** Skirting board height, m (about 0.15–0.25 in period rooms). */
  skirting?: number;
  /** Cornice depth, m: a cove where walls meet the ceiling. */
  cornice?: number;
  /** Dado (chair) rail height, m, with framed panelling below it in `dadoMat`. */
  dado?: number;
  dadoMat?: SurfaceSpec;
  /** Picture rail height, m. */
  pictureRail?: number;
  /** Curtains at every window, hung from a pole above it. */
  curtains?: SurfaceSpec;
  /** Glazing bars across each window's glass (columns, rows), as in sash and casement windows. */
  bars?: readonly [number, number];
  /** A panelled door in its architrave. */
  door?: { wall: Wall; at: number; w?: number; h?: number; mat?: SurfaceSpec };
  /** A plaster ceiling rose (centre x, z and radius) round the pendant: beaded rings, a boss and radiating leaves. */
  rose?: { x: number; z: number; r: number };
  /** Framed oil paintings: wall, centre along it, centre height, size. */
  pictures?: readonly { wall: Wall; at: number; y: number; w: number; h: number; frame?: SurfaceSpec }[];
}
/** How a window's glass passes sunlight: stained glass colours it, paper (shoji) only glows. */
const tintOf = (g?: SurfaceSpec): "clear" | "stained" | "paper" => (g?.kind === "stained" ? "stained" : g?.kind === "plain" || g?.kind === "parchment" ? "paper" : "clear");
/** A room seen from inside: x from −w/2 to w/2, z from −d/2 (back wall) to d/2 (where the camera stands), floor at 0. */
export function room(b: SceneBuilder, r: RoomSpec) {
  const wm = b.mat(r.wall), t = 0.5, cutsL: Node[] = [], cutsB: Node[] = [], cutsR: Node[] = [];
  for (const win of r.windows ?? []) {
    const shape = win.shape ?? "flat", hs = Math.max(0.3, win.h - openingTop(win.w, 0, shape));
    const gs = win.glass ?? { kind: "leaded" }, glass = b.mat(r.view && (gs.kind === "glass" || gs.kind === "leaded") ? { ...gs, clear: gs.clear ?? (gs.kind === "glass" ? 0.85 : 0.6), colour: gs.colour ?? "#5a6a70" } : gs);
    if (win.wall === "back") {
      cutsB.push(opening(win.at, win.sill, win.w, hs, shape, -r.d / 2 - t - 0.1, -r.d / 2 + 0.1, "z"));
      const g = opening(win.at, win.sill, win.w + 0.02, hs, shape, -r.d / 2 - t * 0.6, -r.d / 2 - t * 0.55, "z"); b.add(leaf(g.f, g.lo, g.hi, glass));
      b.portals.push({ x: win.at, y: win.sill + win.h / 2, z: -r.d / 2 - t * 0.5, axis: "z", hw: win.w / 2, hh: win.h / 2, tint: tintOf(win.glass) });
    } else {
      const xw = win.wall === "left" ? -r.w / 2 : r.w / 2, s = win.wall === "left" ? -1 : 1;
      (win.wall === "left" ? cutsL : cutsR).push(opening(win.at, win.sill, win.w, hs, shape, xw - 0.1 * -s, xw + (t + 0.1) * s, "x"));
      const g = opening(win.at, win.sill, win.w + 0.02, hs, shape, xw + t * 0.55 * s, xw + t * 0.6 * s, "x"); b.add(leaf(g.f, g.lo, g.hi, glass));
      b.portals.push({ x: xw + t * 0.5 * s, y: win.sill + win.h / 2, z: win.at, axis: "x", hw: win.w / 2, hh: win.h / 2, tint: tintOf(win.glass) });
    }
  }
  b.add(cut(boxAt(-r.w / 2 - t, 0, -r.d / 2 - t, r.w / 2 + t, r.h, -r.d / 2, wm, b.r()), cutsB));
  b.add(cut(boxAt(-r.w / 2 - t, 0, -r.d / 2 - t, -r.w / 2, r.h, r.d / 2 + 4, wm, b.r()), cutsL));
  b.add(cut(boxAt(r.w / 2, 0, -r.d / 2 - t, r.w / 2 + t, r.h, r.d / 2 + 4, wm, b.r()), cutsR));
  b.add(boxAt(-r.w / 2 - t, -0.3, -r.d / 2 - t, r.w / 2 + t, 0, r.d / 2 + 4, b.mat(r.floor)));
  if (r.attic) {
    b.add(gableRoof({ x0: -r.w / 2 - t, x1: r.w / 2 + t, z0: -r.d / 2 - t, z1: r.d / 2 + 4, y: r.h, pitch: r.attic, over: 0, ridge: "z", t: 0.25 }, b.mat(r.ceiling ?? { kind: "boards", colour: "#6a5440" })));
    const oak = b.mat({ kind: "oak", colour: "#4e3b2b" }), rise = (r.w / 2 + t) * Math.tan((r.attic * Math.PI) / 180);
    for (let z = -r.d / 2 + 0.6; z < r.d / 2 + 4; z += 0.9) for (const s of [-1, 1]) b.add(beam(s * (r.w / 2), r.h - 0.15, z, 0, r.h + rise - 0.35, z, 0.14, oak));
    b.add(beam(0, r.h + rise - 0.3, -r.d / 2, 0, r.h + rise - 0.3, r.d / 2 + 4, 0.22, oak), beam(-r.w / 2, r.h + rise * 0.45, -r.d / 2, r.w / 2, r.h + rise * 0.45, -r.d / 2 + 0.3, 0.2, oak));
  } else {
    b.add(boxAt(-r.w / 2 - t, r.h, -r.d / 2 - t, r.w / 2 + t, r.h + 0.4, r.d / 2 + 4, b.mat(r.ceiling ?? { kind: "plaster", colour: "#e9dfc9" })));
    if (r.beams) b.add(repeatZ3(boxAt(-r.w / 2, r.h - 0.28, -r.d / 2 + 0.6, r.w / 2, r.h, -r.d / 2 + 0.85, b.mat({ kind: "oak", colour: "#4a382a" })), r.beams, Math.floor((r.d + 4) / r.beams)));
  }
  if (r.trim) roomTrim(b, r);
  // the room's windows are registered in world coordinates, so the room is placed where it was built
  b.place();
  if (r.view === "garden") { b.interiorBox = { lo: [-r.w / 2 - t, -0.35, -r.d / 2 - t], hi: [r.w / 2 + t, r.h + 0.45, r.d / 2 + 4] }; gardenView(b, r); }
}
/** A garden round a room: lawn, a gravel terrace under the windows, a clipped hedge, trees at varied distances, far hills. */
function gardenView(b: SceneBuilder, r: RoomSpec) {
  const W = r.w / 2 + 0.5, D = r.d / 2 + 0.5;
  b.grounds.push({ x0: -W - 1.6, x1: W + 1.6, z0: -D - 1.6, z1: r.d / 2 + 4, y: -0.3, mat: b.mat({ kind: "gravel", colour: "#a39886" }) });
  b.grounds.push({ x0: -200, x1: 200, z0: -200, z1: 200, y: -0.32, mat: b.mat({ kind: "grass", colour: "#5f7a3c" }) });
  const hedge = b.mat({ kind: "foliage", colour: "#3c5a2a" });
  b.add(boxAt(-W - 9, -0.3, -D - 9, W + 9, 1.5, -D - 8.2, hedge, 0, 0.25), boxAt(-W - 9, -0.3, -D - 9, -W - 8.2, 1.5, r.d / 2 + 6, hedge, 0, 0.25), boxAt(W + 8.2, -0.3, -D - 9, W + 9, 1.5, r.d / 2 + 6, hedge, 0, 0.25));
  b.place();
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (0.9 + 1.2 * (k / 8)) + b.r(-0.15, 0.15), dist = 13 + b.r(0, 16), x = Math.cos(a) * dist * (W / Math.max(W, D)) * 1.3, z = Math.sin(a) * dist;
    tree(b, x, z - D * 0.3, b.r(7, 13), b.r(2.4, 4.2), { kind: "foliage", colour: k % 3 === 0 ? "#556b32" : "#4a6230" });
  }
  // trees add world-space parts: place them now, or they would move with the next piece placed
  b.place();
  hills(b, -160, 4, 30);
}
/** Inner face of a wall, and a box builder along it: `u` along the wall, `n` out from its face into the room. */
function wallFrame(r: RoomSpec, wall: Wall | "front") {
  const W = r.w / 2, D = r.d / 2;
  const B = (u0: number, y0: number, u1: number, y1: number, n0: number, n1: number, m: number, tone = 0, rr = 0): Node =>
    wall === "back" ? boxAt(u0, y0, -D + n0, u1, y1, -D + n1, m, tone, rr) : wall === "left" ? boxAt(-W + n0, y0, u0, -W + n1, y1, u1, m, tone, rr) : boxAt(W - n1, y0, u0, W - n0, y1, u1, m, tone, rr);
  const span: [number, number] = wall === "back" ? [-W, W] : [-D, D];
  return { B, span };
}
/** Skirting, cornice, dado panelling and rails, window boards, glazing bars and curtains, a door and pictures. */
function roomTrim(b: SceneBuilder, r: RoomSpec) {
  const t = r.trim!, mould = b.mat(t.mould ?? { kind: "painted-wood", colour: "#ece6d6", flake: 0.01 }), walls: Wall[] = ["left", "back", "right"];
  const door = t.door, dw = door?.w ?? 0.9, dh = door?.h ?? 2.1;
  const gaps = (wall: Wall): [number, number][] => door && door.wall === wall ? [[door.at - dw / 2 - 0.12, door.at + dw / 2 + 0.12]] : [];
  const runs = (wall: Wall, a: number, c: number) => { let segs: [number, number][] = [[a, c]]; for (const [g0, g1] of gaps(wall)) segs = segs.flatMap(([s0, s1]) => [[s0, Math.min(s1, g0)], [Math.max(s0, g1), s1]] as [number, number][]).filter(([s0, s1]) => s1 - s0 > 0.02); return segs; };
  for (const wall of walls) {
    const { B, span } = wallFrame(r, wall), [a, c] = span;
    for (const [u0, u1] of runs(wall, a, c)) {
      if (t.skirting) b.add(B(u0, 0, u1, t.skirting, 0, 0.022, mould), B(u0, t.skirting - 0.02, u1, t.skirting, 0, 0.03, mould, 0, 0.008));
      if (t.dado) {
        b.add(B(u0, t.dado - 0.03, u1, t.dado + 0.03, 0, 0.035, mould, 0, 0.012));
        if (t.dadoMat) {
          const pm = b.mat(t.dadoMat), y0 = (t.skirting ?? 0) + 0.06, y1 = t.dado - 0.08, n = Math.max(1, Math.round((u1 - u0) / 0.7)), pw = (u1 - u0) / n;
          b.add(B(u0, t.skirting ?? 0, u1, t.dado - 0.03, 0, 0.012, pm));
          for (let k = 0; k < n; k++) { const p0 = u0 + k * pw + 0.07, p1 = u0 + (k + 1) * pw - 0.07; b.add(B(p0, y0, p1, y1, 0.012, 0.022, pm, 0, 0.012), B(p0 - 0.012, y0 - 0.012, p1 + 0.012, y0, 0.012, 0.018, mould), B(p0 - 0.012, y1, p1 + 0.012, y1 + 0.012, 0.012, 0.018, mould)); }
        }
      }
    }
    if (t.pictureRail) b.add(B(a, t.pictureRail - 0.02, c, t.pictureRail + 0.02, 0, 0.025, mould, 0, 0.01));
    if (t.cornice && !r.attic) {
      const cc = t.cornice, yc = r.h - cc;
      const nf = (x: number, y: number, z: number) => wall === "back" ? [x, y, z + r.d / 2] : wall === "left" ? [z, y, x + r.w / 2] : [z, y, r.w / 2 - x];
      const lo: [number, number, number] = wall === "back" ? [a, yc, -r.d / 2] : wall === "left" ? [-r.w / 2, yc, a] : [r.w / 2 - cc, yc, a], hi: [number, number, number] = wall === "back" ? [c, r.h, -r.d / 2 + cc] : wall === "left" ? [-r.w / 2 + cc, r.h, c] : [r.w / 2, r.h, c];
      b.add(leaf((x, y, z) => { const [, yy, n] = nf(x, y, z); return Math.max(boxDistance(lo, hi, x, y, z), cc - Math.hypot(n - cc, yy - yc)); }, lo, hi, mould), B(a, yc - 0.035, c, yc, 0, 0.03, mould, 0, 0.01));
    }
  }
  // window boards, architraves, glazing bars and curtains
  for (const win of r.windows ?? []) {
    const { B } = wallFrame(r, win.wall), top = win.sill + win.h, ww = win.w;
    b.add(B(win.at - ww / 2 - 0.08, win.sill - 0.04, win.at + ww / 2 + 0.08, win.sill, -0.3, 0.06, mould, 0, 0.008));
    if ((win.shape ?? "flat") === "flat") b.add(B(win.at - ww / 2 - 0.09, win.sill, win.at - ww / 2, top + 0.09, 0, 0.025, mould), B(win.at + ww / 2, win.sill, win.at + ww / 2 + 0.09, top + 0.09, 0, 0.025, mould), B(win.at - ww / 2 - 0.09, top, win.at + ww / 2 + 0.09, top + 0.09, 0, 0.025, mould));
    if (t.bars && (win.shape ?? "flat") === "flat" && win.glass?.kind === "glass") {
      const [cols, rows] = t.bars, bar = b.mat(t.mould ?? { kind: "painted-wood", colour: "#ece6d6" });
      for (let k = 1; k < cols; k++) { const u = win.at - ww / 2 + (ww * k) / cols; b.add(B(u - 0.015, win.sill, u + 0.015, top, -0.32, -0.26, bar)); }
      for (let k = 1; k < rows; k++) { const y = win.sill + (win.h * k) / rows; b.add(B(win.at - ww / 2, y - 0.015, win.at + ww / 2, y + 0.015, -0.32, -0.26, bar)); }
      b.add(B(win.at - ww / 2, win.sill + win.h / 2 - 0.03, win.at + ww / 2, win.sill + win.h / 2 + 0.03, -0.33, -0.25, bar));
    }
    if (t.curtains) {
      const cm = b.mat(t.curtains), pole = b.mat({ kind: "brass", colour: "#8a6a3a" }), yp = Math.min(r.h - 0.1, top + 0.25);
      b.add(B(win.at - ww / 2 - 0.55, yp - 0.018, win.at + ww / 2 + 0.55, yp + 0.018, 0.1, 0.136, pole));
      for (const sd of [-1, 1]) {
        const u0 = sd < 0 ? win.at - ww / 2 - 0.5 : win.at + ww / 2 - 0.08, u1 = u0 + 0.58;
        // the pleats: a hanging slab rippling across its width, a little fuller toward the floor
        const fold = (u: number, y: number) => 0.035 * Math.sin((u - u0) * 26) * (1 + 0.4 * (1 - y / yp));
        const loB = wallFrame(r, win.wall);
        b.add(leaf((x, y, z) => { const [u, n] = win.wall === "back" ? [x, z + r.d / 2] : win.wall === "left" ? [z, x + r.w / 2] : [z, r.w / 2 - x]; return Math.max(Math.abs(n - 0.12 - fold(u, y)) - 0.018, u0 - u, u - u1, -y + 0.01, y - yp) * 0.7; },
          win.wall === "back" ? [u0, 0, -r.d / 2] : win.wall === "left" ? [-r.w / 2, 0, u0] : [r.w / 2 - 0.25, 0, u0], win.wall === "back" ? [u1, yp, -r.d / 2 + 0.25] : win.wall === "left" ? [-r.w / 2 + 0.25, yp, u1] : [r.w / 2, yp, u1], cm));
        void loB;
      }
    }
  }
  if (door) {
    // a six-panel door in a moulded architrave
    const { B } = wallFrame(r, door.wall), dm = b.mat(door.mat ?? { kind: "painted-wood", colour: "#e4ddcc", flake: 0.01 }), knob = b.mat({ kind: "brass", colour: "#c09a50" });
    b.add(B(door.at - dw / 2, 0, door.at + dw / 2, dh, -0.02, 0.0, dm));
    for (const [c0, c1] of [[0.08, 0.42], [0.48, 0.82]]) for (const [y0, y1] of [[0.12, 0.72], [0.82, 1.52], [1.62, dh - 0.1]]) b.add(B(door.at - dw / 2 + dw * c0, y0, door.at - dw / 2 + dw * c1, y1, 0.0, 0.012, dm, 0, 0.006));
    b.add(B(door.at - dw / 2 - 0.1, 0, door.at - dw / 2, dh + 0.1, 0, 0.03, mould, 0, 0.008), B(door.at + dw / 2, 0, door.at + dw / 2 + 0.1, dh + 0.1, 0, 0.03, mould, 0, 0.008), B(door.at - dw / 2 - 0.1, dh, door.at + dw / 2 + 0.1, dh + 0.1, 0, 0.03, mould, 0, 0.008));
    const ku = door.at + dw / 2 - 0.08; b.add(door.wall === "back" ? sphere(ku, 1.0, -r.d / 2 + 0.05, 0.028, knob) : door.wall === "left" ? sphere(-r.w / 2 + 0.05, 1.0, ku, 0.028, knob) : sphere(r.w / 2 - 0.05, 1.0, ku, 0.028, knob));
  }
  if (t.rose && !r.attic) {
    const { x, z, r: R } = t.rose, h = r.h, mould = b.mat(r.ceiling ?? { kind: "plaster", colour: "#e9dfc9" });
    b.add(revolve(x, z, h - 0.075, h, tt => tt > 0.85 ? R : tt > 0.7 ? R * 0.9 : tt > 0.55 ? R * (0.62 + 0.06 * Math.sin(tt * 90)) : tt > 0.3 ? R * 0.42 : R * (0.12 + 0.2 * tt), R * 1.01, mould, 0, 4));
    b.add(repeatAround(sculpt([{ a: [x + R * 0.45, h - 0.025, z], b: [x + R * 0.86, h - 0.012, z], r1: R * 0.07, r2: R * 0.03 }, { a: [x + R * 0.62, h - 0.03, z], e: [R * 0.13, R * 0.03, R * 0.06] }], R * 0.03, mould), x, z, 16, R * 0.9));
  }
  for (const p of t.pictures ?? []) {
    const { B } = wallFrame(r, p.wall), fm = b.mat(p.frame ?? { kind: "gold" }), cv = b.mat({ kind: "canvas", unit: p.w, course: p.h, offset: p.wall === "left" ? [-p.at, -p.y] : [p.at, -p.y] });
    b.add(B(p.at - p.w / 2, p.y - p.h / 2, p.at + p.w / 2, p.y + p.h / 2, 0.02, 0.035, cv));
    for (const [u0, y0, u1, y1] of [[p.at - p.w / 2 - 0.07, p.y - p.h / 2 - 0.07, p.at + p.w / 2 + 0.07, p.y - p.h / 2], [p.at - p.w / 2 - 0.07, p.y + p.h / 2, p.at + p.w / 2 + 0.07, p.y + p.h / 2 + 0.07], [p.at - p.w / 2 - 0.07, p.y - p.h / 2, p.at - p.w / 2, p.y + p.h / 2], [p.at + p.w / 2, p.y - p.h / 2, p.at + p.w / 2 + 0.07, p.y + p.h / 2]] as const) b.add(B(u0, y0, u1, y1, 0.015, 0.06, fm, 0, 0.012));
  }
}
const repeatZ3 = (n: Node, step: number, count: number): Node => {
  const z0 = (n.lo[2] + n.hi[2]) / 2;
  return { lo: [n.lo[0], n.lo[1], n.lo[2]], hi: [n.hi[0], n.hi[1], n.hi[2] + step * (count - 1)], f: (x, y, z) => n.f(x, y, z - Math.min(count - 1, Math.max(0, Math.round((z - z0) / step))) * step) };
};
/** Shelves against the back wall (z = `z`, facing +z) holding books, jars, bread or drawers. */
export function shelves(b: SceneBuilder, x0: number, x1: number, z: number, h: number, kind: "books" | "jars" | "drawers" | "bread", depth = 0.35, y0 = 0) {
  b.add(boxAt(x0, y0, z, x1, y0 + h, z + depth, b.mat({ kind, course: kind === "drawers" ? undefined : 0.38 })));
  const oak = b.mat({ kind: "oak", colour: "#4a3626" });
  b.add(boxAt(x0 - 0.06, y0, z, x0, y0 + h + 0.08, z + depth + 0.04, oak), boxAt(x1, y0, z, x1 + 0.06, y0 + h + 0.08, z + depth + 0.04, oak), boxAt(x0 - 0.1, y0 + h, z, x1 + 0.1, y0 + h + 0.1, z + depth + 0.1, oak));
}
/** A table (or counter, workbench) on four legs. */
export function table(b: SceneBuilder, x: number, z: number, w: number, d: number, h = 0.78, s: SurfaceSpec = { kind: "oak", colour: "#6a4c34" }, solid = false) {
  const m = b.mat(s);
  b.add(boxAt(x - w / 2, h - 0.06, z - d / 2, x + w / 2, h, z + d / 2, m));
  if (solid) b.add(boxAt(x - w / 2 + 0.05, 0, z - d / 2 + 0.05, x + w / 2 - 0.05, h - 0.06, z + d / 2 - 0.05, m));
  else for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(boxAt(x + sx * (w / 2 - 0.08) - 0.04, 0, z + sz * (d / 2 - 0.08) - 0.04, x + sx * (w / 2 - 0.08) + 0.04, h - 0.06, z + sz * (d / 2 - 0.08) + 0.04, m));
}
/** A candle (or an oil lamp) that lights the room. */
export function candle(b: SceneBuilder, x: number, y: number, z: number, power = 0.08) {
  b.add(cylY(x, z, y, y + 0.16, 0.025, b.mat({ kind: "plain", colour: "#efe6cf" })), ellipsoid(x, y + 0.2, z, 0.012, 0.03, 0.012, b.mat({ kind: "flame", emit: 14 })));
  b.light({ x, y: y + 0.21, z, kelvin: 1850, power });
}
/** A hearth or oven mouth with a fire in it, set in the wall facing +z at `zf`. */
export function hearth(b: SceneBuilder, x: number, zf: number, w = 1.6, h = 1.3, s: SurfaceSpec = { kind: "brick", colour: "#8a4a34", age: 0.8, soot: 3 }, power = 0.9) {
  const m = b.mat(s);
  b.add(cut(boxAt(x - w / 2 - 0.5, 0, zf, x + w / 2 + 0.5, h + 0.9, zf + 0.7, m), [opening(x, 0.35, w, h - w * 0.25, "segmental", zf - 1, zf + 1)]));
  b.add(boxAt(x - w / 2 - 0.7, h + 0.8, zf, x + w / 2 + 0.7, h + 0.95, zf + 0.95, b.mat({ kind: "oak", colour: "#3c2c20" })));
  b.add(ellipsoid(x, 0.55, zf + 0.25, w * 0.32, 0.28, 0.25, b.mat({ kind: "fire", emit: 5 })));
  b.add(boxAt(x - w * 0.35, 0.35, zf + 0.15, x + w * 0.35, 0.45, zf + 0.45, b.mat({ kind: "firewood" })));
  b.light({ x, y: 0.75, z: zf + 0.75, kelvin: 1700, power, shadow: true });
}

export { lanternParts };

// ---- Gothic interiors: rib vaults, compound piers, a three-storey nave ------------------------------------------------------

/** Height above the springing of a pointed arch of span `S` whose two arcs have radius k·S (k = 1 equilateral, 0.5 round), at offset `u` from its centre. */
export function archRise(u: number, S: number, k = 1) { const R = k * S, a = Math.abs(u) + R - S / 2; return a >= R ? 0 : Math.sqrt(R * R - a * a); }

export interface RibVault { x0: number; x1: number; zs: number; bays: number; bay: number; ys: number; k?: number; apse?: boolean; /** Inner width of each of the apse's five faces (each gets its own cell over its window). */ apseFace?: number }
/**
 * The webs of a quadripartite rib vault over x0–x1, in bays of length `bay` from z = zs toward −z, springing at `ys`.
 * Each bay is two pointed tunnels crossing; the cross tunnel is the main profile stretched to the bay, so the groins
 * fall exactly on the diagonals (where the ribs run). `apse` closes the east end with a pointed half-dome of the same
 * profile. The distance is exact for the main tunnel (radius minus hypotenuse) and conservative under the stretch.
 */
export function ribVaultWebs(v: RibVault, mat: number): Node {
  const k = v.k ?? 1, S = v.x1 - v.x0, xc = (v.x0 + v.x1) / 2, R = k * S, c = R - S / 2, top = v.ys + archRise(0, S, k) + 0.9, ze = v.zs - v.bays * v.bay, sx = S / v.bay;
  const lo: [number, number, number] = [v.x0, v.ys, v.apse ? ze - S / 2 - 0.2 : ze], hi: [number, number, number] = [v.x1, top, v.zs];
  return leaf((x, y, z) => {
    const yy = Math.max(0, y - v.ys);
    let cav: number;
    if (v.apse && z < ze) {
      // a chevet: a half-dome cut by one cell per face, each the main profile stretched to its face, so every window has its lunette and the groins are the radial ribs
      const px = x - xc, pz = ze - z, r = Math.hypot(px, pz), phi = Math.atan2(pz, px), j = Math.min(4, Math.max(0, Math.floor(phi / (Math.PI / 5)))), t = r * Math.sin(phi - (j + 0.5) * (Math.PI / 5)), sa = S / (v.apseFace ?? S * 0.31);
      cav = Math.max(R - Math.hypot(r + c, yy), (R - Math.hypot(Math.abs(t) * sa + c, yy)) / sa);
    }
    else {
      const i = Math.min(v.bays - 1, Math.max(0, Math.floor((v.zs - z) / v.bay))), dz = z - (v.zs - v.bay * (i + 0.5));
      cav = Math.max(R - Math.hypot(Math.abs(x - xc) + c, yy), (R - Math.hypot(Math.abs(dz) * sx + c, yy)) / sx);
    }
    return Math.max(cav, boxDistance(lo, hi, x, y, z));
  }, lo, hi, mat);
}
/**
 * One rib: a pointed arc in the vertical plane through (ox, oz) along (dx, dz), its half-span `S`/2 stretched by `st`
 * along the plane (1 for a transverse rib, the diagonal's length ratio for a diagonal rib), round section radius `r`.
 */
function ribArc(ox: number, oz: number, dx: number, dz: number, st: number, S: number, k: number, ys: number, r: number, mat: number, half = false): Node {
  const R = k * S - r * 0.55, c = k * S - S / 2, L = (S / 2) * st + r, rise = archRise(0, S, k), sc = Math.min(1, st);
  const ends = half ? [[ox, oz], [ox + dx * L, oz + dz * L]] : [[ox - dx * L, oz - dz * L], [ox + dx * L, oz + dz * L]];
  const lo: [number, number, number] = [Math.min(ends[0][0], ends[1][0]) - r, ys - r, Math.min(ends[0][1], ends[1][1]) - r], hi: [number, number, number] = [Math.max(ends[0][0], ends[1][0]) + r, ys + rise + r, Math.max(ends[0][1], ends[1][1]) + r];
  return leaf((x, y, z) => {
    const px = x - ox, pz = z - oz, al = px * dx + pz * dz, along = (half ? Math.max(0, al) : Math.abs(al)) / st, perp = -px * dz + pz * dx;
    const a = along + c, yy = y - ys;
    const din = yy >= 0 ? Math.hypot(a, yy) - R : Math.hypot(a - R, yy);
    return Math.hypot(din * sc, perp) - r;
  }, lo, hi, mat, 0.3);
}
/**
 * The ribs and bosses of a `ribVaultWebs` vault: transverse ribs on the bay lines, diagonal ribs on the groins, wall ribs
 * (formerets) round each lunette, carved bosses at the crowns, radial ribs in the apse; `ridge` adds the English ridge rib.
 */
export function ribVaultRibs(v: RibVault, r: number, mat: number, boss: number, ridge = false): Node[] {
  const k = v.k ?? 1, S = v.x1 - v.x0, xc = (v.x0 + v.x1) / 2, B = v.bay, rise = archRise(0, S, k), ze = v.zs - v.bays * B, out: Node[] = [];
  const diag = Math.hypot(S / 2, B / 2), st = diag / (S / 2), dx = (S / 2) / diag, dz = (B / 2) / diag;
  for (let i = 1; i <= v.bays - (v.apse ? 0 : 1); i++) out.push(ribArc(xc, v.zs - i * B, 1, 0, 1, S, k, v.ys, r, mat));
  for (let i = 0; i < v.bays; i++) {
    const zc = v.zs - B * (i + 0.5);
    out.push(ribArc(xc, zc, dx, dz, st, S, k, v.ys, r * 0.85, mat), ribArc(xc, zc, dx, -dz, st, S, k, v.ys, r * 0.85, mat));
    for (const xw of [v.x0 + r * 0.5, v.x1 - r * 0.5]) out.push(ribArc(xw, zc, 0, 1, B / S, S, k, v.ys, r * 0.6, mat));
    out.push(sphere(xc, v.ys + rise - r * 0.4, zc, r * 1.9, boss), repeatAround(sphere(xc + r * 1.7, v.ys + rise - r * 0.9, zc, r * 0.7, boss), xc, zc, 6, r * 2.6));
    if (ridge) out.push(capsule(xc, v.ys + rise - r * 0.5, zc - B / 2, xc, v.ys + rise - r * 0.5, zc + B / 2, r * 0.7, mat));
  }
  if (v.apse) {
    for (let j = 1; j < 5; j++) { const a = (j * Math.PI) / 5; out.push(ribArc(xc, ze, Math.cos(a), -Math.sin(a), 1, S, k, v.ys, r * 0.85, mat, true)); }
    out.push(sphere(xc, v.ys + rise - r * 0.4, ze, r * 2.2, boss));
  }
  return out;
}

/** A moulded pier base or capital profile, as a solid of revolution (plinth, torus, scotia, torus; or bell and abacus). */
/** Distance to the side of an octagonal prism of apothem r, turned by `rot` radians. */
const octSide = (x: number, z: number, r: number, rot = 0) => { const c = Math.cos(rot), sn = Math.sin(rot), ax = Math.abs(x * c + z * sn), az = Math.abs(-x * sn + z * c); return Math.max(ax, az, (ax + az) * Math.SQRT1_2) - r; };
/** An octagonal shaft or slab from y0 to y1. */
export const octShaft = (x: number, z: number, y0: number, y1: number, r: number, mat: number, rot = 0) => leaf((px, py, pz) => Math.max(octSide(px - x, pz - z, r, rot), y0 - py, py - y1), [x - r * 1.09, y0, z - r * 1.09], [x + r * 1.09, y1, z + r * 1.09], mat);
/** An attic base from y0 under a shaft of radius R: a broad lower torus, the hollow scotia, a fillet, the upper torus. */
export function atticBase(x: number, z: number, y0: number, R: number, mat: number): Node {
  return revolve(x, z, y0, y0 + R * 0.8, t => {
    // lower torus, fillet, scotia, fillet, upper torus: continuous, so no edge stands proud of the tori
    if (t < 0.36) return R * (1.06 + 0.26 * Math.sin((t / 0.36) * Math.PI) ** 0.7);
    if (t < 0.4) return R * 1.06;
    if (t < 0.62) return R * (1.06 - 0.12 * Math.sin(((t - 0.4) / 0.22) * Math.PI));
    if (t < 0.66) return R * 1.04;
    return R * (1.0 + 0.04 * (1 - (t - 0.66) / 0.34) + 0.12 * Math.sin(((t - 0.66) / 0.34) * Math.PI) ** 0.8);
  }, R * 1.33, mat, 0, 3);
}
/**
 * A crocket capital whose abacus top is at y: a necking ring, a concave bell with stiff leaves on its lower half, crockets
 * rising from it and curling out under the corners of a moulded octagonal abacus (`n` crockets, 8 or 4).
 */
export function crocketCapital(x: number, y: number, z: number, R: number, h: number, mat: number, n = 8): Node[] {
  const yb = y - h, ya = y - h * 0.16, step = (Math.PI * 2) / n;
  const out: Node[] = [
    revolve(x, z, yb, ya, t => (t < 0.06 ? R * 1.08 : R * (1 + 0.3 * ((t - 0.06) / 0.94) ** 2)), R * 1.32, mat, 0, 3),
    leaf((px, py, pz) => Math.hypot(Math.hypot(px - x, pz - z) - R * 1.0, py - yb - R * 0.06) - R * 0.07, [x - R * 1.1, yb, z - R * 1.1], [x + R * 1.1, yb + R * 0.14, z + R * 1.1], mat),
    octShaft(x, z, ya, ya + h * 0.07, R * 1.4, mat, Math.PI / 8), octShaft(x, z, ya + h * 0.07, y, R * 1.5, mat, Math.PI / 8),
  ];
  const P = (rad: number, yy: number): [number, number, number] => [x + rad, yy, z];
  // one crocket built on the +x axis and repeated round: a stalk off the bell, then a bud curling out and down
  out.push(repeatAround(sculpt([{ a: P(R * 0.98, yb + h * 0.18), b: P(R * 1.16, yb + h * 0.66), r1: R * 0.075, r2: R * 0.06 }, { a: P(R * 1.16, yb + h * 0.66), b: P(R * 1.36, yb + h * 0.8), r1: R * 0.06, r2: R * 0.07 }, { a: P(R * 1.42, yb + h * 0.74), e: [R * 0.12, R * 0.1, R * 0.11] }, { a: P(R * 1.47, yb + h * 0.64), e: [R * 0.06, R * 0.07, R * 0.07] }], R * 0.05, mat), x, z, n, R * 1.62));
  // stiff leaves between the crockets on the lower bell
  out.push(repeatAround(sculpt([{ a: [x + R * 0.98 * Math.cos(step / 2), yb + h * 0.1, z + R * 0.98 * Math.sin(step / 2)], b: [x + R * 1.1 * Math.cos(step / 2), yb + h * 0.42, z + R * 1.1 * Math.sin(step / 2)], r1: R * 0.06, r2: R * 0.1 }], R * 0.04, mat), x, z, n, R * 1.3));
  return out;
}

/**
 * A compound pier (pilier cantonné) after Chartres: a core with four attached colonnettes, round core and octagonal
 * colonnettes or the reverse by turns (`alt`); a square plinth on an octagonal socle with leaf spurs at its corners, attic
 * bases round core and colonnettes, crocket capitals, and one octagonal abacus over all whose top is at h.
 */
export function compoundPier(x: number, z: number, h: number, R: number, mat: number, alt = false): Node[] {
  const cr = R * 0.24, cd = R * 1.08, y0 = 0.62, hc = R * 1.6, ys = h - hc;
  const out: Node[] = [octShaft(x, z, 0, 0.22, R * 1.7, mat, Math.PI / 8), boxAt(x - R * 1.42, 0.22, z - R * 1.42, x + R * 1.42, y0 - 0.04, z + R * 1.42, mat, 0, 0.02), boxAt(x - R * 1.36, y0 - 0.04, z - R * 1.36, x + R * 1.36, y0, z + R * 1.36, mat)];
  // the spurs: leaves reaching from the round base down over the plinth's corners
  out.push(repeatAround(sculpt([{ a: [x + R * 1.12 * Math.SQRT1_2, y0 + 0.06, z + R * 1.12 * Math.SQRT1_2], b: [x + R * 1.36 * Math.SQRT1_2, y0 + 0.01, z + R * 1.36 * Math.SQRT1_2], r1: R * 0.09, r2: R * 0.04 }], R * 0.03, mat), x, z, 4, R * 1.5));
  out.push(alt ? octShaft(x, z, y0 + R * 0.75, ys + 0.05, R * 0.98, mat) : cylY(x, z, y0 + R * 0.75, ys + 0.05, R, mat), atticBase(x, z, y0, R, mat));
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2, cx = x + Math.cos(a) * cd, cz = z + Math.sin(a) * cd;
    out.push(alt ? cylY(cx, cz, y0 + cr * 0.75, ys + hc * 0.35, cr, mat) : octShaft(cx, cz, y0 + cr * 0.75, ys + hc * 0.35, cr * 0.98, mat), atticBase(cx, cz, y0, cr, mat), ...crocketCapital(cx, ys + hc * 0.35 + cr * 2.4, cz, cr, cr * 2.4, mat, 4));
  }
  out.push(...crocketCapital(x, h - 0.12, z, R, hc - 0.12, mat), octShaft(x, z, h - 0.12, h, R * 1.62, mat, Math.PI / 8));
  return out;
}
/** A bundle of vaulting shafts (a major and two minors) from y0 to y1 with shaft rings, each under its own small capital. */
function shaftBundle(x: number, z: number, nx: number, y0: number, y1: number, rings: readonly number[], mat: number): Node[] {
  const out: Node[] = [];
  for (const [dx, dz, r] of [[0, 0, 0.19], [0.07, -0.27, 0.11], [0.07, 0.27, 0.11]] as const) {
    const sx = x + nx * dx, sz = z + dz;
    out.push(cylY(sx, sz, y0, y1 - r * 2.6, r, mat), ...crocketCapital(sx, y1, sz, r, r * 2.6, mat, 4));
    for (const ry of rings) out.push(cylY(sx, sz, ry - 0.045, ry + 0.045, r + 0.035, mat));
  }
  return out;
}

/** A stained-glass panel built at the origin (sill at y = 0, centred on x = 0, facing ±z), placed by its frame so its pattern centres on the window. */
function glassPanel(b: SceneBuilder, spec: SurfaceSpec, x: number, y: number, z: number, yaw: number, w: number, hs: number, shape: ArchShape = "pointed") {
  const g = opening(0, 0, w, hs, shape, -0.03, 0.03, "z"), m = b.mat({ ...spec, unit: w, course: openingTop(w, hs, shape) });
  b.add(frame(leaf(g.f, g.lo, g.hi, m), { x, y, z, yaw }));
}
/** A rose window's glass: a disc built at the origin facing ±z. */
function roseGlass(b: SceneBuilder, spec: SurfaceSpec, x: number, y: number, z: number, yaw: number, R: number) {
  const m = b.mat({ ...spec, pattern: "rose", unit: R * 2, course: R * 2 });
  b.add(frame(cylZ(0, 0, -0.03, 0.03, R, m), { x, y, z, yaw }));
}

export interface NaveSpec { bays?: number; bay?: number; span?: number; aisle?: number; arcade?: number; stone?: SurfaceSpec; web?: SurfaceSpec; floor?: SurfaceSpec; glass?: SurfaceSpec }
/** Heights of a nave's storeys, for placing furniture and cameras. */
export interface NaveLevels { arcade: number; arcadeTop: number; springing: number; crown: number; length: number; span: number; aisle: number }
/**
 * The inside of a Gothic cathedral nave after the three-storey Chartres elevation: compound piers with foliage capitals
 * carry a pointed arcade in two stepped orders onto vaulted aisles; above it a string course and a triforium passage of
 * small arches; above that, from the vault's springing, a clerestory in plate tracery (two lancets under a rose) in each
 * lunette of a quadripartite rib vault, its ribs carried down by vaulting shafts to the pier capitals. The east end is a
 * five-sided apse with tall lancets under a ribbed half-dome. The nave runs from z = 0 (west) toward −z; x = 0 is its
 * axis. All windows are stained glass (medallions, borders, lead and iron armature) and registered as tinted portals.
 */
export function gothicNave(b: SceneBuilder, o: NaveSpec = {}): NaveLevels {
  const n = o.bays ?? 6, B = o.bay ?? 6.8, S = o.span ?? 12, A = o.aisle ?? 6, Ha = o.arcade ?? 9, T = 1.0, half = S / 2 + T / 2, L = n * B;
  const st = b.mat(o.stone ?? { kind: "ashlar", colour: "#c4ae88", course: 0.38, age: 0.65 }), web = b.mat(o.web ?? { kind: "plaster", colour: "#c9b998", flake: 0.01 });
  const fl = b.mat(o.floor ?? { kind: "flags", colour: "#a29a88", unit: 0.9, age: 0.6 }), rib = b.mat({ kind: "ashlar", colour: "#b8a27c", course: 0.5, age: 0.5 }), gilt = b.mat({ kind: "gold" });
  const pierSt = b.mat(o.stone ? { ...o.stone, course: 0.46, unit: 1.5 } : { kind: "ashlar", colour: "#c4ae88", course: 0.46, unit: 1.5, age: 0.65 }), shadow = b.mat({ kind: "ashlar", colour: "#8f8470", course: 0.38 }), glassSpec: SurfaceSpec = o.glass ?? { kind: "stained", pattern: "medallion", emit: 0.55 };
  const wArc = B - 1.6, arcTop = Ha + 0.3 + archRise(0, wArc, 1), triB = arcTop + 0.5, triT = triB + 2.6, ys = triT + 0.6, rise = archRise(0, S, 1), crown = ys + rise, Sa = A - T / 2 - 0.4 - T / 2;
  // floor, west wall (behind the viewer) and the outer walls
  b.add(boxAt(-half - A - 1, -0.4, -L - S, half + A + 1, 0, 1.5, fl));
  b.add(boxAt(-half - A - 1, 0, 0, half + A + 1, crown + 2, 1.2, st));
  for (const s of [-1, 1]) {
    const xi = s * (S / 2), xo = s * (S / 2 + T), cuts: Node[] = [];
    // the arcade wall above the piers: two stepped orders, a triforium passage, the clerestory's lancets and rose
    for (let i = 0; i < n; i++) {
      const zc = -B * (i + 0.5);
      cuts.push(opening(zc, Ha - 1, wArc, 1.3, "pointed", xi - s, xo + s, "x"));
      cuts.push(opening(zc, Ha - 1, wArc + 0.7, 1.3, "pointed", xi - s, xi + s * 0.28, "x"), opening(zc, Ha - 1, wArc + 0.7, 1.3, "pointed", xo - s * 0.28, xo + s, "x"));
      for (let k = 0; k < 4; k++) cuts.push(opening(zc - B * 0.33 + k * B * 0.22, triB + 0.25, B * 0.16, 1.55, "pointed", xi - s, xi + s * 0.62, "x"));
      cuts.push(boxAt(Math.min(xi + s * 0.62, xi + s * 0.3), triB + 0.25, zc - B / 2 + 0.55, Math.max(xi + s * 0.62, xi + s * 0.3), triT, zc + B / 2 - 0.55, 0));
      for (const lz of [-1.05, 1.05]) { cuts.push(opening(zc + lz, ys + 0.4, 1.5, 4.8, "pointed", xi - s, xo + s, "x"), opening(zc + lz, ys + 0.3, 1.95, 4.75, "pointed", xi - s, xi + s * 0.45, "x")); glassPanel(b, glassSpec, xi + s * 0.62, ys + 0.4, zc + lz, s > 0 ? 90 : -90, 1.5, 4.8); }
      cuts.push(cylX(ys + 8.05, zc, xi - s, xo + s, 1.15, 0), cylX(ys + 8.05, zc, xi - s, xi + s * 0.45, 1.4, 0));
      roseGlass(b, glassSpec, xi + s * 0.62, ys + 8.05, zc, s > 0 ? 90 : -90, 1.18);
      for (const lz of [-1.05, 1.05]) b.portals.push({ x: xi + s * 0.62, y: ys + 3.2, z: zc + lz, axis: "x", hw: 0.75, hh: 2.9, tint: "stained" });
      b.portals.push({ x: xi + s * 0.62, y: ys + 8.05, z: zc, axis: "x", hw: 0.9, hh: 0.9, tint: "stained" });
    }
    b.add(cut(boxAt(Math.min(xi, xo), Ha + 0.3, -L, Math.max(xi, xo), crown + 2, 0, st), cuts));
    // the triforium's back wall in shadow, and string courses under the triforium and the clerestory
    b.add(boxAt(Math.min(xi + s * 0.62, xo), triB + 0.2, -L, Math.max(xi + s * 0.62, xo), triT + 0.05, 0, shadow));
    for (const [y, h] of [[triB, 0.22], [ys - 0.05, 0.2]] as const) b.add(boxAt(Math.min(xi, xi - s * 0.16), y, -L, Math.max(xi, xi - s * 0.16), y + h, 0, st));
    // piers at every bay line, a vaulting shaft rising from each capital to the springing
    for (let i = 1; i < n; i++) {
      const zp = -B * i;
      b.add(...compoundPier(s * half, zp, Ha + 0.3, 0.72, pierSt, i % 2 === 1));
      b.add(...shaftBundle(xi - s * 0.2, zp, -s, Ha + 0.3, ys, [triB + 0.11, (triT + ys) / 2], pierSt));
    }
    // responds against the west wall and at the apse: half piers with the same base and capital
    for (const zp of [-0.5, -L]) b.add(cylY(s * half, zp, 0.62 + 0.45, Ha + 0.3 - 1.0, 0.62, pierSt), atticBase(s * half, zp, 0.62, 0.62, pierSt), boxAt(s * half - 0.85, 0, zp - 0.85, s * half + 0.85, 0.62, zp + 0.85, pierSt, 0, 0.02), ...crocketCapital(s * half, Ha + 0.3, zp, 0.62, 1.0, pierSt), ...shaftBundle(xi - s * 0.2, zp, -s, Ha + 0.3, ys, [triB + 0.11, (triT + ys) / 2], pierSt));
    // the arcade's mouldings: a roll on each order's arris, a keel roll down the soffit, a hood mould over all
    for (let i = 0; i < n; i++) {
      const zc = -B * (i + 0.5);
      b.add(archRoll(zc, Ha - 1, wArc, 1.3, "pointed", s * half, -0.04, 0.13, pierSt, "x"), archRoll(zc, Ha - 1, wArc, 1.3, "pointed", xi + s * 0.28, 0, 0.09, pierSt, "x"), archRoll(zc, Ha - 1, wArc, 1.3, "pointed", xo - s * 0.28, 0, 0.09, pierSt, "x"));
      b.add(archRoll(zc, Ha - 1, wArc + 0.7, 1.3, "pointed", xi, 0, 0.085, pierSt, "x"), archRoll(zc, Ha - 1, wArc + 0.7, 1.3, "pointed", xi - s * 0.03, 0.24, 0.065, pierSt, "x"));
      // triforium: colonnettes with bases and capitals between its arches, a roll round each arch
      for (let k = 0; k < 4; k++) b.add(archRoll(zc - B * 0.33 + k * B * 0.22, triB + 0.25, B * 0.16, 1.55, "pointed", xi, 0, 0.035, pierSt, "x"));
      for (let k = 0; k < 3; k++) { const cz = zc - B * 0.33 + (k + 0.5) * B * 0.22, cx = xi - s * 0.07; b.add(cylY(cx, cz, triB + 0.33, triB + 1.62, 0.06, pierSt), atticBase(cx, cz, triB + 0.25, 0.06, pierSt), ...crocketCapital(cx, triB + 1.8, cz, 0.06, 0.18, pierSt, 4)); }
      // clerestory: a roll round each lancet's splay and round the rose
      for (const lz of [-1.05, 1.05]) b.add(archRoll(zc + lz, ys + 0.3, 1.95, 4.75, "pointed", xi, 0, 0.06, pierSt, "x"));
      b.add(leaf((x, y, z) => Math.hypot(Math.hypot(y - ys - 8.05, z - zc) - 1.42, x - xi) - 0.07, [xi - 0.08, ys + 6.5, zc - 1.6], [xi + 0.08, ys + 9.6, zc + 1.6], pierSt));
    }
    // the aisle: vaulted bays against an outer wall of windows, wall shafts between them
    const xa0 = s > 0 ? half + T / 2 : -half - T / 2 - Sa, va: RibVault = { x0: xa0, x1: xa0 + Sa, zs: 0, bays: n, bay: B, ys: Ha + 0.3 };
    b.add(ribVaultWebs(va, web), ...ribVaultRibs(va, 0.15, rib, gilt));
    const xw = s * (half + A), wc: Node[] = [];
    for (let i = 0; i < n; i++) {
      const zc = -B * (i + 0.5);
      wc.push(opening(zc, 2.6, 2.3, 4.4, "pointed", xw - s * 2, xw + s * 2, "x"), opening(zc, 2.5, 2.9, 4.4, "pointed", xw - s * 2, xw - s * 0.15, "x"));
      glassPanel(b, glassSpec, xw - s * 0.1, 2.6, zc, s > 0 ? 90 : -90, 2.3, 4.4);
      b.portals.push({ x: xw - s * 0.1, y: 5.0, z: zc, axis: "x", hw: 1.15, hh: 2.6, tint: "stained" });
    }
    b.add(cut(boxAt(xw - T / 2 + 0.1, 0, -L - 0.5, xw + T / 2 + 0.1, Ha + archRise(0, Sa, 1) + 1.5, 0, st), wc));
    for (let i = 0; i <= n; i++) b.add(cylY(xw - s * 0.55, -B * i, 0.62, Ha - 0.27, 0.22, pierSt), atticBase(xw - s * 0.55, -B * i, 0.45, 0.22, pierSt), ...crocketCapital(xw - s * 0.55, Ha + 0.3, -B * i, 0.22, 0.57, pierSt, 4));
    b.add(boxAt(Math.min(xw - s * 0.4, xw - s * 0.75), 0, -L, Math.max(xw - s * 0.4, xw - s * 0.75), 0.45, 0, st));
    // the aisle's east wall, with a window toward the morning
    const xm = s * (half + T / 2 + Sa / 2);
    b.add(cut(boxAt(Math.min(s * (half - 0.3), xw), 0, -L - 0.9, Math.max(s * (half - 0.3), xw), Ha + archRise(0, Sa, 1) + 1.5, -L, st), [opening(xm, 2.6, 2.3, 4.4, "pointed", -L - 2, -L + 1), opening(xm, 2.5, 2.9, 4.4, "pointed", -L - 0.3, -L + 1)]));
    glassPanel(b, glassSpec, xm, 2.6, -L - 0.45, 0, 2.3, 4.4);
    b.portals.push({ x: xm, y: 5.0, z: -L - 0.45, axis: "z", hw: 1.15, hh: 2.6, tint: "stained" });
  }
  // the high vault, its ribs and bosses, closing in the apse's half-dome
  const apo = half * Math.cos(Math.PI / 10), fw = 2 * half * Math.sin(Math.PI / 10), v: RibVault = { x0: -S / 2, x1: S / 2, zs: 0, bays: n, bay: B, ys, apse: true, apseFace: 2 * (apo - T / 2) * Math.tan(Math.PI / 10) };
  b.add(ribVaultWebs(v, web), ...ribVaultRibs(v, 0.22, rib, gilt));
  // the apse: five faces of a decagon round (0, −L), each with blind arcading, the triforium and a tall lancet
  for (let j = 0; j < 5; j++) {
    const th = (j + 0.5) * (Math.PI / 5), x = apo * Math.cos(th), z = -L - apo * Math.sin(th), yaw = -(90 + (th * 180) / Math.PI);
    const face = cut(boxAt(-fw / 2 - 0.35, 0, -T / 2, fw / 2 + 0.35, crown + 2, T / 2, st), [
      opening(0, 0.9, fw * 0.62, 3.2, "pointed", -T, -T / 2 + 0.16), opening(-fw * 0.2, triB + 0.25, fw * 0.22, 1.55, "pointed", -T, 0.1), opening(fw * 0.2, triB + 0.25, fw * 0.22, 1.55, "pointed", -T, 0.1),
      opening(0, ys - 1.4, 2.1, 7.6, "pointed", -T, T), opening(0, ys - 1.5, 2.6, 7.6, "pointed", -T, -0.1)]);
    b.add(frame(face, { x, z, yaw }));
    const gx = x + Math.cos(th) * 0.1, gz = z - Math.sin(th) * 0.1;
    glassPanel(b, { ...glassSpec, emit: (glassSpec.emit ?? 1.2) * 1.15 }, gx, ys - 1.4, gz, yaw, 2.1, 7.6);
    b.portals.push(Math.abs(Math.cos(th)) > 0.7 ? { x: gx, y: ys + 3, z: gz, axis: "x", hw: 1.05, hh: 4.6, tint: "stained" } : { x: gx, y: ys + 3, z: gz, axis: "z", hw: 1.05, hh: 4.6, tint: "stained" });
    // a vaulting shaft at each corner of the apse
    const ca = (j * Math.PI) / 5; if (j > 0) { const sx = (S / 2 - 0.15) * Math.cos(ca), sz = -L - (S / 2 - 0.15) * Math.sin(ca); b.add(cylY(sx, sz, 0.62, ys - 0.5, 0.21, pierSt), atticBase(sx, sz, 0.45, 0.21, pierSt), ...crocketCapital(sx, ys, sz, 0.21, 0.55, pierSt, 4)); }
  }
  b.place();
  return { arcade: Ha, arcadeTop: arcTop, springing: ys, crown, length: L, span: S, aisle: A };
}

// ---- Church seating ---------------------------------------------------------------------------------------------------------

/** One rush-seated church chair (chaise paillée) with a book ledge on its back, as nodes (rows repeat it). */
export function churchChairNodes(b: SceneBuilder, rushGrid?: [number, number]): Node[] {
  const wd = b.mat({ kind: "oak", colour: "#6a4a2c", age: 0.3 }), rush = b.mat({ kind: "rush", unit: rushGrid?.[0], course: rushGrid?.[1] });
  const out: Node[] = [];
  for (const s of [-1, 1]) {
    out.push(revolve(s * 0.19, 0.18, 0, 0.42, t => 0.017 * (1 - 0.25 * t) + 0.004 * Math.exp(-((t - 0.55) ** 2) / 0.002), 0.024, wd, 0, 3));
    out.push(capsule(s * 0.18, 0, -0.17, s * 0.18, 0.88, -0.24, 0.017, wd), sphere(s * 0.18, 0.9, -0.243, 0.022, wd));
    out.push(capsule(s * 0.19, 0.13, 0.18, s * 0.18, 0.13, -0.18, 0.009, wd), capsule(s * 0.19, 0.24, 0.18, s * 0.18, 0.24, -0.18, 0.009, wd));
  }
  out.push(capsule(-0.19, 0.11, 0.18, 0.19, 0.11, 0.18, 0.01, wd), capsule(-0.19, 0.22, 0.18, 0.19, 0.22, 0.18, 0.01, wd), capsule(-0.18, 0.18, -0.18, 0.18, 0.18, -0.18, 0.009, wd));
  // the rush seat wound over its rails, then two curved back slats and the book ledge behind
  out.push(boxAt(-0.2, 0.395, -0.19, 0.2, 0.43, 0.19, rush, 0, 0.012));
  for (const [y, h] of [[0.6, 0.05], [0.76, 0.07]] as const) out.push(leaf((x, yy, z) => Math.max(Math.abs(x) - 0.18, Math.abs(yy - y) - h / 2, Math.abs(z - (-0.2 - (y - 0.4) * 0.07) - 0.03 * (x / 0.18) ** 2 + 0.03) - 0.008), [-0.19, y - h, -0.3], [0.19, y + h, -0.15], wd));
  out.push(boxAt(-0.18, 0.69, -0.36, 0.18, 0.705, -0.23, wd), boxAt(-0.18, 0.705, -0.365, 0.18, 0.74, -0.35, wd));
  return out;
}
/** Rows of church chairs (cols across, rows deep) as one repeated node, however many there are; `yaw` 180 faces them toward −z. */
export function chairRows(b: SceneBuilder, x: number, z: number, cols: number, rows: number, yaw = 180, dx = 0.5, dz = 0.92) {
  b.add(frame(repeatZ(repeatX(union(churchChairNodes(b, [dx, dz])), dx, cols), dz, rows), { x, z, yaw }));
}
