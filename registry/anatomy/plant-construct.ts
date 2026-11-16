/**
 * FLORA1 construction: a style-neutral plant, grown from its growth form and species and seeded so that the same
 * seed always draws the same tree. Every style paints over the same structure:
 * - branches with Leonardo widths;
 * - foliage masses in the form's manner;
 * - hanging strands (willow twigs, wisteria racemes, grass blades);
 * - placed leaves, flowers and fruit for the month.
 *
 * Units: the plant's height; y up, ground at 0, the stem's foot at x = 0.
 */
import { GROWTH_FORMS } from "./plant-forms";
import type { CrownShape, GrowthForm, PlantArchitecture } from "./plant-forms";
import { findPlant } from "./plant-species";
import type { Month, PlantSpecies } from "./plant-species";
import { add, dir, ellipsePoints, lerpP, linePath, polyPath, rotate, seeded, smoothClosedPath, smoothTube, tubePoints } from "./foundation-shapes";
import type { FEllipse, FPoint } from "./foundation-shapes";
import { flowerShape, leafShape } from "./plant-organs";
import { speciesSway } from "./plant-crown";

export interface PlantConstruction { form: GrowthForm; species?: PlantSpecies; a: PlantArchitecture }
type Deep<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };

/** The architecture for a species (by id, by the id it is drawn by in a style, or romaji) or a growth form, with overrides. */
export function plantConstruction(subject: string | PlantSpecies, overrides: Deep<PlantArchitecture> = {}): PlantConstruction {
  const species = typeof subject === "string" ? findPlant(subject) : subject;
  const form = species ? GROWTH_FORMS[species.form] : GROWTH_FORMS[subject as keyof typeof GROWTH_FORMS];
  if (!form) throw new Error(`Unknown plant or growth form "${typeof subject === "string" ? subject : subject.id}"`);
  const base = form.architecture, sp = species?.architecture ?? {};
  const merge = <K extends "trunk" | "crown" | "branch" | "foliage">(k: K) => ({ ...base[k], ...(sp[k] as object | undefined), ...(overrides[k] as object | undefined) }) as PlantArchitecture[K];
  const a: PlantArchitecture = { ...base, ...(sp as object), ...(overrides as object), trunk: merge("trunk"), crown: merge("crown"), branch: merge("branch"), foliage: merge("foliage") } as PlantArchitecture;
  return { form, species, a };
}

export interface PlantBranch { points: FPoint[]; radii: number[]; order: number; depth: number }
/** A foliage or blossom mass, with the order of the branch it grows on (1 = a primary branch). */
export interface FoliageMass extends FEllipse { depth: number; order?: number }
export interface PlantStrand { points: FPoint[]; width: number; depth: number; kind: "twig" | "blade" | "raceme" | "stem" | "petiole" }
export interface PlantOrgan { at: FPoint; angle: number; size: number; depth: number }
export interface PlantSkeleton {
  c: PlantConstruction;
  month: Month;
  branches: PlantBranch[];
  foliage: FoliageMass[];
  /** Blossom clouds (clustered blossom such as cherry), drawn in the flower colour over the foliage. */
  blossom: FoliageMass[];
  strands: PlantStrand[];
  leaves: PlantOrgan[];
  flowers: PlantOrgan[];
  fruits: PlantOrgan[];
  /** Water surface height for water plants. */
  waterline?: number;
  /** Leaf cover this month (0 bare – 1 full) and whether it is in autumn colour. */
  leafCover: number; autumn: boolean;
}
export interface GrowOptions {
  seed?: number;
  /** Month of the year (default July). */
  month?: Month;
  /** Wind strength (0–2) and time (seconds) for sway. */
  wind?: number; t?: number;
  /** Sway frequency: a number in Hz, "species" for the physical rate (cantilever f₀ ∝ dbh/H², hanging twigs as chains), or omitted for the original fixed pace. */
  swayHz?: SwayHz;
  /** Young trees keep their leader and lower branches; old pines lose them. */
  age?: "young" | "mature" | "old";
}

/** Half-width of the crown envelope at relative crown height `u` (0 bottom, 1 top), as a share of the crown's half-width. */
export function crownEnvelope(shape: CrownShape, u: number): number {
  const c = Math.min(1, Math.max(0, u)), ell = (m: number, h: number) => Math.sqrt(Math.max(0, 1 - ((c - m) / h) ** 2));
  switch (shape) {
    case "cone": return Math.pow(1 - c, .9);
    case "column": return .5 + .5 * Math.sin(Math.PI * Math.min(1, c * 1.1));
    case "vase": return c < .75 ? .3 + .7 * c / .75 : Math.sqrt(Math.max(0, 1 - ((c - .75) / .25) ** 2));
    case "umbrella": return c < .55 ? .45 + .55 * c / .55 : ell(.55, .45);
    case "layered": return 1 - c * .55;
    case "fan": return .25 + .75 * Math.sqrt(c);
    case "dome": case "weeping": case "irregular": case "clump": return ell(.45, .56);
  }
}

interface Node { pts: FPoint[]; order: number; depth: number; kids: { at: number; node: Node }[]; radii: number[] }

/** Grow a plant for a month (leaves, blossom and fruit follow the species' calendar) and a moment of wind. */
export function growPlant(c: PlantConstruction, o: GrowOptions = {}): PlantSkeleton {
  const month = o.month ?? 7, rnd = seeded(o.seed ?? 7), sp = c.species, a = c.a;
  const evergreen = sp?.leaf.evergreen ?? true;
  const inLeaf = evergreen || (sp?.seasons.leaf ?? [4, 5, 6, 7, 8, 9, 10, 11]).includes(month);
  const autumn = !!sp?.seasons.autumn?.includes(month);
  // Leaves are half out in their first month (the spring flush) and thinning in the last month of autumn colour.
  const leafMonths = sp?.seasons.leaf ?? [];
  const leafCover = !inLeaf ? 0 : evergreen ? 1 : month === Math.min(...leafMonths) ? .45 : autumn && sp && !(sp.seasons.autumn ?? []).includes(month + 1 as Month) ? .7 : 1;
  const blooming = !!sp?.flower?.months.includes(month), fruiting = !!sp?.fruit?.months.includes(month);
  const sk: PlantSkeleton = { c, month, branches: [], foliage: [], blossom: [], strands: [], leaves: [], flowers: [], fruits: [], leafCover, autumn };
  const leader = a.leader;
  // Annuals and herbs that die back (green stems) are not there out of season.
  if (!inLeaf && sp?.bark.kind === "green" && c.form.id !== "grass") return sk;
  if (leader === "culm") growBamboo(sk, rnd);
  else if (leader === "clump" || leader === "stems") growHerbaceous(sk, rnd, blooming, fruiting);
  else growWoody(sk, rnd, o, blooming, fruiting);
  if (o.wind) sway(sk, o.wind, o.t ?? 0, o.swayHz);
  return sk;
}

function growWoody(sk: PlantSkeleton, rnd: () => number, o: GrowOptions, blooming: boolean, fruiting: boolean) {
  const { a, form, species } = sk.c, B = a.branch, cb = a.crown.base, W2 = a.crown.width / 2;
  const old = o.age === "old" || (o.age !== "young" && form.id === "pine"), young = o.age === "young";
  // A climber spreads its branches along the trellis (or round the pole) at the top of its stem.
  const climber = a.leader === "twining";
  const halfW = (y: number) => (climber ? W2 : y < cb ? 0 : W2 * crownEnvelope(a.crown.shape, (y - cb) / (1 - cb)));
  const angleAt = (y: number) => B.angleLow + (B.angleHigh - B.angleLow) * Math.min(1, Math.max(0, (y - cb) / (1 - cb)));
  const roots: Node[] = [];
  // The stem: a leaning, wandering line to the top (excurrent, or young), or to the fork where the great limbs part.
  const stems = Math.max(1, a.trunk.stems), forkAt = young ? 0 : a.trunk.forkAt;
  for (let s = 0; s < stems; s++) {
    const baseX = stems > 1 ? (s - (stems - 1) / 2) * .04 : 0, lean = a.trunk.lean * (stems > 1 ? (s - (stems - 1) / 2) * .8 + 1 : 1) * (old ? 1.2 : 1);
    const top = forkAt > 0 ? forkAt : (form.id === "vine" ? cb : 1) * (stems > 1 ? .85 + rnd() * .15 : 1);
    const phase = rnd() * 6.28, trunk: Node = { pts: [], order: 0, depth: 0, kids: [], radii: [] };
    for (let i = 0; i <= 24; i++) {
      const y = top * i / 24, wob = a.trunk.wander * .05 * Math.sin(y * 7 + phase) * (old ? 1.4 : 1) + (a.leader === "twining" ? Math.sin(y * 40) * .015 : 0);
      trunk.pts.push([baseX + Math.tan(lean * Math.PI / 180) * y * (old ? 1 - y * .4 : 1) + wob, y]);
    }
    roots.push(trunk);
    // The great limbs: each fans out from the fork toward a point high in the crown, one usually leading.
    const limbs: Node[] = [];
    if (forkAt > 0) {
      const n = Math.max(2, a.trunk.limbs), fork = trunk.pts[trunk.pts.length - 1];
      for (let k = 0; k < n; k++) {
        const u = n === 1 ? 0 : k / (n - 1) - .5, spread = form.id === "weeping" ? 70 : a.crown.shape === "vase" ? 30 : 45;
        const ang = 90 - u * 2 * spread + (rnd() - .5) * 12, lenL = (1 - forkAt) * (.85 + rnd() * .15) * (k === Math.floor(n / 2) ? 1 : .9), limb: Node = { pts: [fork], order: 0, depth: (rnd() - .5) * .6, kids: [], radii: [] };
        let d = ang;
        for (let i = 1; i <= 14; i++) { d += (90 - d) * .05 * (form.id === "weeping" ? -.5 : 1); limb.pts.push(add(limb.pts[i - 1], dir(d), lenL / 14)); }
        trunk.kids.push({ at: trunk.pts.length - 1, node: limb }); limbs.push(limb);
      }
    }
    // Primary branches along the stem (and up each limb): at nodes from the clear bole, by the bud plan.
    const carriers = limbs.length ? limbs : [trunk];
    let az = rnd() * 360;
    for (const carrier of carriers) {
      const clear = climber ? carrier.pts.length - 5 : limbs.length ? 2 : Math.max(1, Math.round(carrier.pts.length * (old && form.id === "pine" ? Math.max(a.trunk.clearBole, .45) : young ? a.trunk.clearBole * .5 : a.trunk.clearBole)));
      const step = Math.max(1, Math.round(B.spacing * 24 * (form.id === "pine" ? 1.2 : 1)));
      for (let i = clear; i < carrier.pts.length - 1; i += step) {
        const p = carrier.pts[i], per = a.buds === "whorled" ? Math.max(2, B.perNode + 1) : a.buds === "opposite" ? 2 : B.perNode;
        for (let k = 0; k < per; k++) {
          az += a.buds === "opposite" ? (k === 0 ? 90 : 180) : a.buds === "whorled" ? 360 / per + rnd() * 20 : a.phyllotaxis * 360;
          const sideRaw = Math.sin(az * Math.PI / 180), side = sideRaw >= 0 ? 1 : -1, proj = .35 + .65 * Math.abs(sideRaw), depth = Math.cos(az * Math.PI / 180);
          const ang = angleAt(p[1]) * (.85 + rnd() * .3), carrierDir = Math.atan2(carrier.pts[i + 1][1] - p[1], carrier.pts[i + 1][0] - p[0]) * 180 / Math.PI;
          const reach = Math.max(.03, halfW(p[1]) * proj + (limbs.length ? .05 : 0)), L = Math.min(.9, reach / Math.max(.3, Math.sin(ang * Math.PI / 180))) * (young ? .7 : 1);
          const node = growBranch(p, carrierDir - side * ang, L, 1, side, depth, sk.c, rnd);
          carrier.kids.push({ at: i, node });
        }
      }
    }
  }
  // Widths by Leonardo's rule, then scaled so the stem's foot has the species' trunk width.
  const r0 = .0016, e = a.pipe;
  const area = (n: Node): number => {
    const tip = r0 ** e, extra = new Array(n.pts.length).fill(0);
    for (const k of n.kids) extra[Math.min(k.at, n.pts.length - 1)] += area(k.node);
    let acc = tip;
    n.radii = new Array(n.pts.length);
    for (let i = n.pts.length - 1; i >= 0; i--) { acc += extra[i]; n.radii[i] = acc ** (1 / e); }
    return acc;
  };
  roots.forEach(area);
  const target = a.trunk.baseWidth / 2 / Math.sqrt(roots.length), scale = target / Math.max(...roots.map(r => r.radii[0]));
  const flat = (n: Node) => { sk.branches.push({ points: n.pts, radii: n.radii.map(r => Math.max(.0012, r * scale)), order: n.order, depth: n.depth }); n.kids.forEach(k => flat(k.node)); };
  roots.forEach(flat);
  // Stems first (lowest base first, so the trunk leads its limbs), then by order.
  sk.branches.sort((p, q) => p.order - q.order || p.points[0][1] - q.points[0][1] || p.depth - q.depth);
  // Foliage, strands, flowers, fruit.
  const tips = sk.branches.filter(b => b.order >= Math.max(1, B.orders - 1));
  const F = a.foliage, cover = sk.leafCover;
  if (cover > 0) {
    if (F.kind === "needle-pads") for (const b of sk.branches.filter(b => b.order >= 1)) {
      // Needle pads: flat-topped clouds over the outer half of each branch, the largest at the branch ends.
      const L = pathLength(b.points), at = pointAt(b.points, b.order === 1 ? .8 : .75), rx = Math.max(.035, L * (b.order === 1 ? .48 : .62)), ry = rx * .3;
      sk.foliage.push({ cx: at[0], cy: at[1] + ry * .5, rx, ry, angle: 0, depth: b.depth, order: b.order });
    }
    else if (F.kind === "scale-sprays") for (const b of sk.branches.filter(b => b.order >= 1)) {
      // Dense drooping sprays clothe every branch: overlapping masses along it, so the crown reads as one cone.
      const L = pathLength(b.points);
      for (const u of b.order === 1 ? [.35, .65, .92] : [.7]) {
        const at = pointAt(b.points, u), s = Math.max(.025, L * (b.order === 1 ? .32 : .5)) * (.8 + rnd() * .4);
        sk.foliage.push({ cx: at[0], cy: at[1] - s * .15, rx: s, ry: s * .55, angle: 0, depth: b.depth, order: b.order });
      }
    }
    else if (F.kind === "leafy-stems") for (const b of sk.branches) {
      for (let u = .15; u < 1; u += .14) { const at = pointAt(b.points, u); sk.leaves.push({ at, angle: (Math.round(u / .14) % 2 ? 1 : -1) * 60 + 90, size: leafSize(sk.c, F.size), depth: b.depth + .1 }); }
    }
    else if (F.kind === "layered-sprays") for (const b of tips) {
      // A flat spray: three or four overlapping lobes along the twig, lying level (Cole's flat layers of twigs).
      if (rnd() > .7) continue;
      const end = b.points[b.points.length - 1], start = pointAt(b.points, .35), s = F.size * (.7 + rnd() * .5) * Math.sqrt(cover);
      for (let k = 0; k < 4; k++) {
        const u = k / 3, at = lerpP(start, end, u), r = s * (.55 + .45 * Math.sin(Math.PI * (.2 + u * .7)));
        sk.foliage.push({ cx: at[0] + (rnd() - .5) * s * .3, cy: at[1] + s * .08 + (rnd() - .5) * s * .12, rx: r, ry: r * .38, angle: (rnd() - .5) * 8, depth: b.depth + (k % 2 ? .02 : -.02) });
      }
    }
    else if (F.kind === "cloud") for (const b of tips) {
      const end = b.points[b.points.length - 1], mid = pointAt(b.points, .6), s = F.size * (.6 + rnd() * .6) * Math.sqrt(cover);
      sk.foliage.push({ cx: end[0], cy: end[1] + s * .2, rx: s, ry: s * .78, angle: 0, depth: b.depth, order: b.order });
      if (rnd() < F.density - .3) sk.foliage.push({ cx: mid[0], cy: mid[1], rx: s * .7, ry: s * .55, angle: 0, depth: b.depth - .1 });
    }
    else if (F.kind === "strands") for (const b of sk.branches.filter(b => b.order >= 1)) {
      // Weeping twigs (or, on a vine's trellis, leafy trailing shoots) hanging from along the branch.
      for (let u = .3; u <= 1; u += .12) {
        const at = pointAt(b.points, u), len = F.size * (.6 + rnd() * .5) * (form.id === "vine" ? .5 : 1), pts: FPoint[] = [at];
        for (let i = 1; i <= 8; i++) { const q = add(pts[i - 1], [(rnd() - .5) * .006 + .002, -len / 8]); if (q[1] < .02) break; pts.push(q); }
        if (pts.length < 2) continue;
        sk.strands.push({ points: pts, width: .004, depth: b.depth, kind: "twig" });
      }
    }
  }
  // Blossom on the twigs (on bare wood when it comes before the leaves); racemes hang from a vine's branches.
  if (blooming && species?.flower) {
    const f = species.flower, size = .018;
    if (f.inflorescence === "raceme") for (const b of sk.branches.filter(b => b.order >= 1)) for (let u = .2; u <= 1; u += .1) {
      const at = pointAt(b.points, u), len = .12 + rnd() * .1, pts: FPoint[] = [at, add(at, [.005, -len / 2]), add(at, [0, -len])];
      sk.strands.push({ points: pts, width: .02, depth: b.depth + .05, kind: "raceme" });
    }
    else if (f.inflorescence === "cluster" && form.id === "blossom-tree") for (const b of tips) {
      // Clustered blossom (cherry) clothes the twigs in clouds of flowers.
      const end = b.points[b.points.length - 1], mid = pointAt(b.points, .55), s = a.foliage.size * (.75 + rnd() * .5);
      sk.blossom.push({ cx: end[0], cy: end[1] + s * .15, rx: s, ry: s * .75, angle: 0, depth: b.depth + .05 }, { cx: mid[0], cy: mid[1], rx: s * .7, ry: s * .55, angle: 0, depth: b.depth });
    }
    else for (const b of sk.branches.filter(b => b.order >= Math.max(1, B.orders - 1))) for (let u = .2; u <= 1; u += .16) {
      // Solitary blossom (plum, peach) sits singly along the twigs, close to the wood.
      const at = pointAt(b.points, u);
      sk.flowers.push({ at: add(at, [(rnd() - .5) * .008, (rnd() - .5) * .008]), angle: rnd() * 360, size: size * 1.3 * (.8 + rnd() * .4), depth: b.depth + .05 });
    }
  }
  if (fruiting && species?.fruit) for (const b of tips) if (rnd() < .35) { const at = pointAt(b.points, .5 + rnd() * .5); sk.fruits.push({ at: add(at, [0, -.012]), angle: 0, size: .016, depth: b.depth + .05 }); }
}

/** One branch (and its sprays and twigs): curved steps, gravity, an upturned tip, children by the bud plan. */
function growBranch(start: FPoint, dir0: number, L: number, order: number, side: number, depth: number, c: PlantConstruction, rnd: () => number): Node {
  const { a, form } = c, B = a.branch, steps = Math.max(3, Math.round(L / .025)), pts: FPoint[] = [start];
  let d = dir0, zig = side;
  const node: Node = { pts, order, depth, kids: [], radii: [] };
  const nodeEvery = Math.max(1, Math.round(B.spacing * steps * (order > 1 ? 1.4 : 1)));
  for (let i = 1; i <= steps; i++) {
    const u = i / steps;
    // Gravity pulls the branch down as it lengthens; the tip turns up toward the light (or falls, weeping).
    d += (-90 - d) * B.droop * .035 * (order === 1 ? 1 : .6);
    if (u > .65) d += B.tipTurn * .06 * (Math.cos(d * Math.PI / 180) >= 0 ? 1 : -1);
    if (a.leader === "sympodial" && i % nodeEvery === 0) { d += zig * B.zigzag * (.6 + rnd() * .5); zig = -zig; }
    // Branches do not grow into the ground: near it they turn level.
    if (pts[i - 1][1] < .08 && Math.sin(d * Math.PI / 180) < 0) d = Math.cos(d * Math.PI / 180) >= 0 ? 5 : 175;
    pts.push(add(pts[i - 1], dir(d), L / steps));
  }
  if (order <= B.orders - 1 && L > .03) {
    const ratio = B.lengthRatio;
    if (a.leader === "forking") {
      // Opposite buds whose end bud fails: the shoot ends in a fork of two.
      const end = pts[pts.length - 1];
      for (const s of [-1, 1]) node.kids.push({ at: pts.length - 1, node: growBranch(end, d + s * B.angleHigh * .6, L * ratio * 1.1, order + 1, s, depth + (rnd() - .5) * .3, c, rnd) });
    }
    let s = side;
    for (let i = nodeEvery; i < pts.length - 1; i += nodeEvery) {
      const u = i / steps, per = a.buds === "opposite" ? 2 : 1;
      for (let k = 0; k < per; k++) {
        s = a.buds === "opposite" ? (k === 0 ? 1 : -1) : -s;
        const pd = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]) * 180 / Math.PI;
        let cd = pd - s * B.angleHigh * (.8 + rnd() * .4);
        // Twigs under a level bough curve up toward the light (Cole).
        if (Math.sin(cd * Math.PI / 180) < -.2) cd += (90 - cd) * (form.id === "weeping" ? 0 : .35);
        const cl = L * ratio * (1 - u * .55) * (.75 + rnd() * .5);
        if (cl > .015) node.kids.push({ at: i, node: growBranch(pts[i], cd, cl, order + 1, s, depth + (rnd() - .5) * .3, c, rnd) });
      }
    }
  }
  return node;
}

/** Bamboo: culms ringed by nodes, internodes longest in the middle, branch pairs at the upper nodes, leaves in fans. */
function growBamboo(sk: PlantSkeleton, rnd: () => number) {
  const a = sk.c.a, n = Math.max(1, a.trunk.stems), w = Math.max(.006, a.trunk.baseWidth);
  for (let s = 0; s < n; s++) {
    const x0 = (s - (n - 1) / 2) * a.crown.width / n * .6 + (rnd() - .5) * .03, h = .78 + rnd() * .22, lean = (s - (n - 1) / 2) * 2.5 + (rnd() - .5) * 4;
    const pts: FPoint[] = [];
    for (let i = 0; i <= 20; i++) { const y = h * i / 20; pts.push([x0 + Math.tan(lean * Math.PI / 180) * y + Math.sin(y * Math.PI) * .03 * Math.sign(lean || 1) * y, y]); }
    sk.branches.push({ points: pts, radii: pts.map((_, i) => w / 2 * (1 - i / 20 * .45)), order: 0, depth: (rnd() - .5) * 2 });
    // Nodes: internodes short at the foot, longest about a third of the way up, short again at the top.
    let y = .02;
    while (y < h * .97) {
      const rel = y / h, internode = .025 + .055 * Math.sin(Math.PI * Math.min(1, rel * 1.4)), at = pointAtY(pts, y);
      sk.leaves.push({ at, angle: 0, size: w * 1.15, depth: 9 });   // node ring marker (drawn by painters as a ring)
      if (rel > a.trunk.clearBole) for (const side of [-1, 1]) if (rnd() < .55) {
        const L = .06 + (1 - rel) * .1, d = 90 + side * (a.branch.angleLow + rnd() * 15), bpts: FPoint[] = [at];
        for (let i = 1; i <= 5; i++) bpts.push(add(bpts[i - 1], dir(d - side * i * 6 * a.branch.droop * 3), L / 5));
        sk.branches.push({ points: bpts, radii: bpts.map(() => .0014), order: 1, depth: sk.branches[0].depth + (rnd() - .5) * .3 });
        const tip = bpts[bpts.length - 1];
        // A fan of three to five narrow leaves hanging down and out from the twig end; sparse, with sky between the fans.
        for (let k = 0; k < 3 + Math.floor(rnd() * 3); k++) sk.leaves.push({ at: tip, angle: -90 + side * (25 + k * 18) + (rnd() - .5) * 12, size: .03 + rnd() * .015, depth: 1 });
      }
      y += internode;
    }
  }
}

/** Clumps, stems and water plants: blades and swords from the base, leafy stems, flowering stalks for the season. */
function growHerbaceous(sk: PlantSkeleton, rnd: () => number, blooming: boolean, fruiting: boolean) {
  const { a, form, species } = sk.c, n = Math.max(1, a.trunk.stems), cover = sk.leafCover, blades = form.id === "grass" || form.id === "iris-clump";
  if (form.id === "aquatic") {
    const water = a.crown.base;
    sk.waterline = water;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * a.crown.width / n + (rnd() - .5) * .05, top = water + (rnd() < .3 ? 0 : (.15 + rnd() * .45)), lean = (rnd() - .5) * .2;
      const pts: FPoint[] = [[x * .3, 0], [x * .6 + lean * .5, top * .5], [x + lean, top]];
      sk.strands.push({ points: pts, width: .008, depth: rnd() - .5, kind: "petiole" });
      if (cover > 0) sk.foliage.push({ cx: x + lean, cy: top + .01, rx: a.foliage.size * (.5 + rnd() * .5) * .5, ry: a.foliage.size * .09 * (top > water + .01 ? 1.6 : .6), angle: (rnd() - .5) * 18, depth: rnd() - .5 });
    }
    if (blooming || fruiting) for (let i = 0; i < 3; i++) {
      const x = (rnd() - .5) * a.crown.width * .6, top = .75 + rnd() * .25;
      sk.strands.push({ points: [[x * .3, 0], [x * .7, top * .5], [x, top]], width: .008, depth: .4, kind: "stem" });
      (blooming ? sk.flowers : sk.fruits).push({ at: [x, top + .03], angle: 0, size: .06, depth: .5 });
    }
    return;
  }
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1) - .5, x0 = u * .08, ang = 90 - u * 2 * a.branch.angleLow * (blades ? 2 : 1) + (rnd() - .5) * 10;
    if (blades) {
      // Grass blades arch out and bend over at the tips; iris swords stand straighter.
      if (cover <= 0 && form.id !== "grass") continue;
      const len = (.55 + rnd() * .4) * (form.id === "iris-clump" ? .85 : 1), pts: FPoint[] = [[x0, 0]];
      let d = ang;
      for (let k = 1; k <= 10; k++) { d += (Math.cos(d * Math.PI / 180) >= 0 ? -1 : 1) * a.branch.droop * 3.5 * (k / 10); pts.push(add(pts[k - 1], dir(d), len / 10)); }
      sk.strands.push({ points: pts, width: form.id === "iris-clump" ? .035 : .012, depth: rnd() - .5, kind: "blade" });
    } else {
      // Leafy stems: upright, leaves alternating up them, a flower head at the top in season.
      const top = .75 + rnd() * .25, pts: FPoint[] = [[x0, 0], [x0 + Math.cos(ang * Math.PI / 180) * top * .5, top * .5], [x0 + Math.cos(ang * Math.PI / 180) * top, top]];
      sk.strands.push({ points: pts, width: .01, depth: rnd() - .5, kind: "stem" });
      if (cover > 0) for (let k = 1; k <= 6; k++) { const at = pointAt(pts, k / 7); sk.leaves.push({ at, angle: (k % 2 ? 1 : -1) * 55 + 90, size: leafSize(sk.c, a.foliage.size), depth: 1 }); }
      if (blooming) sk.flowers.push({ at: pts[2], angle: 0, size: .07, depth: 1 });
    }
  }
  // Flowering stalks: plumes and panicles above the blades (ripe rice droops), iris flowers on their scapes.
  if (blooming && species?.flower) {
    const k = form.id === "iris-clump" ? 3 : Math.max(3, Math.round(n * .5));
    for (let i = 0; i < k; i++) {
      const x = (i / Math.max(1, k - 1) - .5) * .25, top = form.id === "iris-clump" ? .8 + rnd() * .15 : .95 + rnd() * .1, nod = species.id === "rice" ? 1 : 0;
      const pts: FPoint[] = [[x * .2, 0], [x * .6, top * .55], [x, top]];
      sk.strands.push({ points: pts, width: .007, depth: .3, kind: "stem" });
      sk.flowers.push({ at: pts[2], angle: nod ? -60 - rnd() * 40 : 90 + (rnd() - .5) * 20, size: form.id === "iris-clump" ? .1 : .22, depth: .4 });
    }
  }
}

/**
 * A copy of a grown plant moved by wind at time `t`: grow once (with a fixed seed), then sway the copy every frame
 * instead of growing again.
 */
export function swayPlant(sk: PlantSkeleton, wind: number, t: number, hz?: SwayHz): PlantSkeleton {
  const copy: PlantSkeleton = {
    ...sk,
    branches: sk.branches.map(b => ({ ...b, points: b.points.slice() })), foliage: sk.foliage.map(f => ({ ...f })), blossom: sk.blossom.map(f => ({ ...f })),
    strands: sk.strands.map(s => ({ ...s, points: s.points.slice() })), leaves: sk.leaves.map(o => ({ ...o })), flowers: sk.flowers.map(o => ({ ...o })), fruits: sk.fruits.map(o => ({ ...o })),
  };
  if (wind) sway(copy, wind, t, hz);
  return copy;
}

export type SwayHz = number | "species";
/**
 * The sway as a field: where a point of the still plant is at time `t` (for painting detail grown on the still plant).
 * With `hz` the trunk sways at that rate ("species": its cantilever f₀ in leaf, after Jackson et al. 2019); without,
 * at the original fixed pace that existing scenes were timed to.
 */
export function swayField(sk: PlantSkeleton, wind: number, t: number, hz?: SwayHz): (p: FPoint) => FPoint {
  const give = (1 - sk.c.form.wind.stiffness) * wind, w = hz === undefined ? 2.1 : 2 * Math.PI * (hz === "species" ? speciesSway(sk) : hz);
  return (p: FPoint) => {
    const y = p[1], k = give * .06 * y * y * (1 + .35 * Math.sin(t * w + y * 3));
    return [p[0] + k, p[1] - Math.abs(k) * .15 * y];
  };
}
/**
 * A hanging twig swings like a hanging chain: its first mode is ω = 1.2024 √(g/L) (Bernoulli; the first zero of J₀
 * halved), so a 4 m willow curtain swings about every 4 s.
 */
export const hangingChainHz = (lengthM: number) => 1.2024 * Math.sqrt(9.81 / Math.max(.05, lengthM)) / (2 * Math.PI);

/** Wind: everything leans downwind with height and swings; long thin parts swing most. */
function sway(sk: PlantSkeleton, wind: number, t: number, hz?: SwayHz) {
  const give = (1 - sk.c.form.wind.stiffness) * wind, swing = swayField(sk, wind, t, hz), H = sk.c.species?.size.height.typical ?? 10;
  for (const b of sk.branches) b.points = b.points.map(p => swing(p));
  for (const s of sk.strands) {
    const base = s.points[0], len = s.points.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - s.points[i][0], p[1] - s.points[i][1]), 0);
    // Hanging twigs swing as chains of their own length (physical rate), else at the original pace.
    const ws = hz === undefined || s.kind === "blade" ? 2.7 : 2 * Math.PI * hangingChainHz(len * H);
    s.points = s.points.map((p, i) => { const q = swing(p); const f = i / Math.max(1, s.points.length - 1); return [q[0] + give * .05 * f * (base[1] - p[1] + .3) * (s.kind === "blade" ? -1 : 1) * Math.sin(t * ws + base[0] * 9) * .6, q[1]] as FPoint; });
  }
  for (const f of [...sk.foliage, ...sk.blossom]) { const q = swing([f.cx, f.cy]); f.cx = q[0]; f.cy = q[1]; }
  for (const set of [sk.leaves, sk.flowers, sk.fruits]) for (const o of set) o.at = swing(o.at);
}

/** A placed leaf's length in plant heights: the species' leaf length over its height (drawn 1.5× so it reads), else the form's. */
function leafSize(c: PlantConstruction, fallback: number): number {
  const sp = c.species;
  if (!sp) return fallback;
  return Math.min(.14, Math.max(.015, sp.leaf.length.typical / 100 / sp.size.height.typical * 1.5));
}
const pathLength = (pts: readonly FPoint[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
function pointAt(pts: readonly FPoint[], u: number): FPoint {
  const i = Math.min(pts.length - 2, Math.max(0, Math.floor(u * (pts.length - 1)))), f = u * (pts.length - 1) - i;
  return lerpP(pts[i], pts[i + 1], Math.min(1, Math.max(0, f)));
}
function pointAtY(pts: readonly FPoint[], y: number): FPoint {
  for (let i = 1; i < pts.length; i++) if (pts[i][1] >= y) return lerpP(pts[i - 1], pts[i], (y - pts[i - 1][1]) / Math.max(1e-6, pts[i][1] - pts[i - 1][1]));
  return pts[pts.length - 1];
}

// ---- Shapes ------------------------------------------------------------------------------------------------------------------------

export interface PlantShapes {
  /** Path data (plant units, y up), back to front: wood, foliage, strands, leaves, flowers, fruit. */
  woodBack: string; woodFront: string; foliageBack: string; foliageFront: string; blossom: string; strands: string; leaves: string; flowers: string; fruits: string; nodes: string;
  bounds: [number, number, number, number];
}

/** Path data for a grown plant: the wood in two depth layers, foliage masses, strands, placed leaves, flowers and fruit. */
export function plantShapes(sk: PlantSkeleton): PlantShapes {
  const front = (d: number) => d >= 0;
  const branchPath = (b: PlantBranch) => (b.points.length > 1 ? smoothTube(b.points, b.radii.map(r => r * 2)) : "");
  const woodBack = sk.branches.filter(b => !front(b.depth)).map(branchPath).join(""), woodFront = sk.branches.filter(b => front(b.depth)).map(branchPath).join("");
  const mass = (f: FoliageMass) => smoothClosedPath(ellipsePoints(f, 18));
  const foliageBack = sk.foliage.filter(f => !front(f.depth)).map(mass).join(""), foliageFront = sk.foliage.filter(f => front(f.depth)).map(mass).join(""), blossom = sk.blossom.map(mass).join("");
  const strands = sk.strands.map(s => polyPath(tubePoints(s.points, s.points.map((_, i) => s.width * (s.kind === "blade" ? 1 - i / s.points.length * .8 : s.kind === "raceme" ? 1 - i / s.points.length * .6 : 1))))).join("");
  const sp = sk.c.species, place = (shape: { outlines: FPoint[][] }, o: PlantOrgan, s: number, ang: number) =>
    shape.outlines.map(ol => polyPath(ol.map(p => add(rotate([p[0] * s, p[1] * s], ang, [0, 0]), o.at)))).join("");
  const leafOutline = sp ? leafShape(sp.leaf, 3) : leafShape({ shape: "lanceolate", width: .2 }, 3);
  const leaves = sk.leaves.filter(l => l.depth !== 9).map(l => place(leafOutline, l, l.size, l.angle - 90)).join("");
  const nodes = sk.leaves.filter(l => l.depth === 9).map(l => polyPath([[l.at[0] - l.size / 2, l.at[1] - .003], [l.at[0] + l.size / 2, l.at[1] - .003], [l.at[0] + l.size / 2, l.at[1] + .003], [l.at[0] - l.size / 2, l.at[1] + .003]])).join("");
  const flowerOutline = sp?.flower ? flowerShape(sp.flower, 5) : flowerShape({ shape: "rosaceous", petals: 5 }, 5);
  const flowers = sk.flowers.map(f => (sp?.flower?.shape === "plume" || sp?.flower?.shape === "panicle"
    ? flowerOutline.marks.map(m => polyPath(tubePoints(m.map(p => add(rotate([p[0] * f.size, p[1] * f.size], f.angle - 90, [0, 0]), f.at)), m.map(() => .004)))).join("")
    : place(flowerOutline, f, f.size / 2, f.angle))).join("");
  const fruits = sk.fruits.map(f => smoothClosedPath(ellipsePoints({ cx: f.at[0], cy: f.at[1], rx: f.size / 2, ry: f.size / 2, angle: 0 }, 12))).join("");
  const pts: FPoint[] = [...sk.branches.flatMap(b => b.points), ...sk.strands.flatMap(s => s.points), ...[...sk.foliage, ...sk.blossom].flatMap(f => [[f.cx - f.rx, f.cy - f.ry], [f.cx + f.rx, f.cy + f.ry]] as FPoint[]),
    ...sk.leaves.map(l => l.at), ...sk.flowers.map(f => f.at)];
  const xs = pts.length ? pts.map(p => p[0]) : [-.4, .4], ys = pts.length ? pts.map(p => p[1]) : [0, 1], pad = .05;
  return { woodBack, woodFront, foliageBack, foliageFront, blossom, strands, leaves, flowers, fruits, nodes, bounds: [Math.min(...xs) - pad, Math.min(0, ...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad] };
}
export { linePath };
