/**
 * FLORA1 crown and trunk in detail, after photographs of real trees and a painter's manual.
 *
 * A grown plant's foliage masses (`growPlant`) become what a crown shows:
 * - tufts (sprays and twig clusters), each lit on the side facing the sun and dark beneath;
 * - sky holes between the tufts, more toward the rim and in the lower crown;
 * - single leaves (or needle bursts, or petals) breaking the silhouette;
 * - trunks and limbs shaded as cylinders, with the species' bark marks wrapped round them.
 *
 * The light follows the crown's big form first (the whole crown is one lit volume), then each tuft's place on its
 * mass. The interior is darker (self-shading), the top brighter than the bottom, and the colours come from a ladder
 * measured off CC0 and public-domain photographs. Units are the plant's (height 1, y up), as in `plant-construct`.
 */
import { add, ellipsePoints, lerpP, rotate, seeded } from "./foundation-shapes";
import type { FPoint, Range } from "./foundation-shapes";
import { range } from "./foundation-shapes";
import type { FoliageMass, PlantBranch, PlantSkeleton } from "./plant-construct";
import { barkMarks, leafShape } from "./plant-organs";
import type { Month, PlantSpecies } from "./plant-species";

// ---- Measured and reported data ---------------------------------------------------------------------------------------------------

const C = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

/**
 * Light in a crown, measured on CC0 and public-domain photographs of single trees (sky pixels by colour, the crown
 * envelope by closing the tree mask; boxes checked by eye).
 */
export const CROWN_LIGHT = {
  /**
   * Foliage luminance at the 10th, 25th, 50th, 75th and 95th percentiles, as a share of the 95th:
   * leaves (a lone tree in wheat, a farm tree, a ginkgo in autumn) and blossom (a cherry in flower).
   */
  ladder: {
    leaf: [.18, .27, .39, .61, 1] as const,
    /** The spread of the 10th–75th percentile ratios over the three leaf photographs (luma). */
    leafSpread: [[.14, .22], [.22, .32], [.33, .49], [.57, .70]] as const,
    blossom: [.20, .40, .58, .76, 1] as const,
    grade: "measured" as const,
  },
  /** Sky seen through the crown, as a share of its area, overall and in its core and outer fifth. */
  gap: { overall: range(.10, .19, .26, "measured", "six crowns"), core: range(.02, .08, .14, "measured"), rim: range(.17, .27, .38, "measured") },
  /** Mean foliage luminance, top third over bottom third. */
  topOverBottom: range(1.26, 1.4, 1.62, "measured", "three sunlit crowns"),
  /** Mean foliage luminance in the core over the outer part. */
  coreOverRim: range(.59, .8, .94, "measured", "three sunlit crowns; the thinnest crown was the least dark inside"),
  /** Lit clumps (foliage smoothed at 3 px, above the 70th percentile), equivalent diameter over crown width. */
  clump: range(.005, .01, .035, "measured", "median to 90th percentile at 700–1800 px crowns"),
  /** Sky holes, equivalent diameter over crown width: many small, a few large windows. */
  hole: range(.002, .004, .015, "measured", "median to 90th percentile"),
  references: [
    { title: "Tree in green wheat field (Unsplash)", url: C("Tree_in_green_wheat_field_(Unsplash).jpg"), rights: "CC0" as const, note: "Colour-graded; its ladder is used for ratios only." },
    { title: "Lone Tree Near Farm Fields", url: C("Lone_Tree_Near_Farm_Fields_(209319283).jpeg"), rights: "CC0" as const },
    { title: "In the shade of the lone tree (Unsplash)", url: C("In_the_shade_of_the_lone_tree_(Unsplash).jpg"), rights: "CC0" as const, note: "Late season, thin crown." },
    { title: "A golden Ginkgo biloba in autumn", url: C("A_golden_Ginkgo_biloba_in_autumn.jpg"), rights: "public-domain" as const },
    { title: "Prunus serrulata var. spontanea in flowers (Jardin des Plantes de Paris)", url: C("Prunus_serrulata_var._spontanea_in_flowers_(Jardin_des_Plantes_de_Paris).jpg"), rights: "public-domain" as const },
    { title: "Zelkova serrata Autumn", url: C("Zelkova_serrata_Autumn.jpg"), rights: "CC0" as const },
    { title: "Zelkova serrata, Clementina", url: C("Zelkova_serrata,_Clementina.JPG"), rights: "public-domain" as const },
    { title: "Ozaki Kumano-jinja Pinus thunbergii", url: C("Ozaki_Kumano-jinja_Pinus_thunbergii_2024-10-24.jpg"), rights: "CC0" as const },
  ],
};

/**
 * How a painter builds a crown, from J. Needham, *Studies of Trees in Pencil and in Water Colors*, second series
 * (public domain, Internet Archive via Wikimedia Commons). Quoted from the lessons.
 */
export const CROWN_DRAWING = [
  "Leave openings between the touches of colour (the willow lesson).",
  "Preserve the highlights on the edges of the sprays and tufts of leaves in the centre of the tree (the chestnut).",
  "Where the central trunk peers out in the heart of the tree, express it by bold black touches, through which bits of clear light are seen at intervals.",
  "The trunk and branches are distinctly evident throughout the masses of foliage (the elm).",
  "Save out the lights where the sky is seen through.",
  "Final touches of dark colour, judiciously used, so that the work may not become spotty.",
] as const;
export const CROWN_DRAWING_SOURCE = { title: "J. Needham, Studies of Trees (second series)", url: C("Studies_of_trees_-_lessons_in_foliage_contrasts,_oak,_ash,_beech_-_with_a_description_of_each_tree_and_full_instructions_for_drawing_and_painting_by_an_experienced_teacher_(IA_studiesoftreesle00need).pdf"), rights: "public-domain" as const };

/**
 * Trees in wind (Jackson et al. 2019, *An architectural understanding of natural sway frequencies in trees*, J. R.
 * Soc. Interface; after Moore & Maguire 2004): the fundamental sway frequency follows the cantilever beam,
 * f₀ ∝ dbh/H². Leaves add mass: f₀ rose 19% when they fell (L = 1.18 ± 0.12). They also doubled the damping
 * (8.6% summer, 3.9% winter). Their simulated sycamore swayed at 0.26 Hz.
 */
export const TREE_SWAY = {
  leaflessRise: range(1.06, 1.18, 1.3, "reported", "Jackson et al. 2019, Wytham Woods"),
  damping: { summer: range(.064, .086, .108, "reported"), winter: range(.026, .039, .052, "reported") },
  /** f₀ ≈ k · dbh / H² (dbh and H in metres): k from the uniform cantilever with green wood's √(E/ρ) ≈ 2.5 km/s, cut by a fifth for the crown's mass. */
  k: range(250, 340, 420, "estimated", "cantilever beam with E/ρ of green wood; Moore & Maguire 2004 fit the same form"),
  example: { tree: "sycamore (Acer pseudoplatanus)", f0: .26, grade: "reported" as const },
  source: { title: "Jackson et al. 2019, J. R. Soc. Interface 16: 20190116", url: "https://discovery.ucl.ac.uk/10078184/" },
};

/** Sun-exposed leaves make more red pigment: "the brighter the light … the greater the production of anthocyanins" (Wikipedia, Autumn leaf color). */
export const AUTUMN_LIGHT = { reported: "Brighter light, more anthocyanin (red); carotenoids (yellow) are already in the leaf.", url: "https://en.wikipedia.org/wiki/Autumn_leaf_color" };

/** Light extinction through a crown, per crown radius (Beer–Lambert with G = 0.5 and a crown leaf area of about 3.6 across; estimated, checked against the measured top/bottom ratio). */
export const CROWN_KAPPA = .9;

// ---- Colour ---------------------------------------------------------------------------------------------------------------------------

const toLin = (v: number) => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const toSrgb = (c: number) => Math.round(255 * Math.min(1, Math.max(0, c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055)));
const lin = (h: string): [number, number, number] => { const n = parseInt(h.replace("#", "").slice(0, 6), 16); return [toLin(n >> 16 & 255), toLin(n >> 8 & 255), toLin(n & 255)]; };
const hexOf = (c: readonly number[]) => `#${c.map(v => toSrgb(v).toString(16).padStart(2, "0")).join("")}`;
const lum = (c: readonly number[]) => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
/** Mix two colours in linear light. */
export const mixLinear = (a: string, b: string, t: number) => { const x = lin(a), y = lin(b), u = Math.min(1, Math.max(0, t)); return hexOf(x.map((v, i) => v + (y[i] - v) * u)); };

/**
 * Five foliage colours from shadow to sunlit. The base is a species' leaf swatch: a leaf in good light, which on the
 * photographs sits at about the 75th percentile of the crown's pixels, so it anchors the fourth stop.
 * Luminances follow the measured ladder; the lit end warms toward sunlight (leaves glow yellow-green in sun, as the
 * photographs show), the dark end cools a little toward the sky-lit shade.
 */
export function foliageLadder(base: string, kind: "leaf" | "blossom" = "leaf"): string[] {
  const t = CROWN_LIGHT.ladder[kind], mid = t[3], b = lin(base), Lb = Math.max(1e-4, lum(b));
  const sun = lin("#fff2b8"), shade = lin("#1c2a30");
  return t.map(ti => {
    // The ladder was measured on gamma-encoded pixel values (luma); in linear light the ratio is about its 2.2 power.
    const k = Math.pow(ti / mid, 2.2);
    let c = b.map(v => v * k);
    if (k > 1) {
      // Over-bright channels spill toward sunlight, keeping the target luminance.
      const target = Math.min(.92, Lb * k), warm = Math.min(1, (k - 1) / 3) * (kind === "blossom" ? .25 : .5);
      c = c.map((v, i) => v + (sun[i] * target - v) * warm);
      const over = Math.max(...c);
      if (over > 1) c = c.map(v => v / over);
    } else c = c.map((v, i) => v + (shade[i] * Lb * k - v) * (1 - k) * .25);
    return hexOf(c);
  });
}
/** Luma (Rec. 709 weights on gamma-encoded values, 0–255), the measure the ladders and crown ratios were taken in. */
export const luma = (h: string) => { const n = parseInt(h.replace("#", "").slice(0, 6), 16); return .2126 * (n >> 16 & 255) + .7152 * (n >> 8 & 255) + .0722 * (n & 255); };
/** The colour at a light value 0–1 along a ladder. */
export function ladderAt(ladder: readonly string[], light: number): string {
  if (ladder.length < 2) return ladder[0] ?? "#2c3a28";
  const x = Math.min(1, Math.max(0, light)) * (ladder.length - 1), i = Math.min(ladder.length - 2, Math.floor(x));
  return mixLinear(ladder[i], ladder[i + 1], x - i);
}

// ---- The crown ------------------------------------------------------------------------------------------------------------------------

export type CrownDetailLevel = "full" | "medium" | "low";
export type TuftKind = "leaf" | "spray" | "needle" | "layer" | "blossom";
export interface Tuft {
  c: FPoint; r: number;
  /** The tuft's outline, and its sunlit part (the same edge pulled toward the light). */
  outline: FPoint[]; cap: FPoint[];
  /** Single leaves (or needle wedges, or petals) on the lit side: the highlights on the edges of the sprays (Needham). Empty at low detail. */
  leaves: { pts: FPoint[]; light: number }[];
  /** Light 0 (deep shade) – 1 (the brightest tuft); the cap takes it, the body about half. */
  light: number;
  /** Paint order: lower values first. */
  z: number;
  /** In the back half (painted before the front wood). */
  back: boolean;
  kind: TuftKind;
  /** The colour this tuft takes: its species' ladder, nudged per tuft (autumn mixes, blossom pink or white). */
  colour: string;
}
export interface CrownDetail {
  tufts: Tuft[];
  /** Openings where the sky (or wood behind) shows through the foliage: cut out of every foliage layer. */
  holes: FPoint[][];
  /** Single leaves, needle bursts or petals breaking the silhouette. */
  flicks: { pts: FPoint[]; colour: string; light: number; kind: TuftKind }[];
  /** Leaves hanging along weeping twigs (willow), lit on the sun's side. */
  strandLeaves: { pts: FPoint[]; light: number }[];
  /** The leaf tufts a little enlarged, as one dark body painted under them (none under blossom). */
  body: FPoint[][];
  ladder: string[];
  /** The measured share of sky the crown aims for, the share its tufts leave open by themselves, and the share seen after the holes (on a raster of the crown, measured as on the photographs). */
  gapTarget: number; gapNatural: number; gapSeen: number;
  /** The sun direction used (x right, y up, z toward the viewer). */
  sun: [number, number, number];
}
export interface CrownOptions {
  seed?: number;
  /** Sun azimuth from behind the viewer: 0 front-lit, 90 from the right, −90 from the left, 180 behind the tree. */
  sunAzimuth?: number;
  /** Sun elevation in degrees (default 45). */
  sunElevation?: number;
  detail?: CrownDetailLevel;
}

const kindOf = (sk: PlantSkeleton): TuftKind => {
  const k = sk.c.a.foliage.kind;
  return k === "needle-pads" ? "needle" : k === "scale-sprays" ? "spray" : k === "layered-sprays" ? "layer" : "leaf";
};

/** Whether a species' leaves turn red (anthocyanin) rather than yellow in autumn: judged from its autumn colour. */
const redAutumn = (sp?: PlantSpecies) => { const a = sp?.leaf.colours.autumn; if (!a) return false; const [r, g] = lin(a); return r > g * 2.2; };

/**
 * The detailed crown of a grown plant. Tufts tile the foliage masses on one grid, so overlapping masses do not
 * multiply; each tuft takes its light from the crown's big form, its place on its own mass, its depth inside the crown
 * and its height. Holes open between tufts at the measured gap fractions.
 */
export function crownDetail(sk: PlantSkeleton, o: CrownOptions = {}): CrownDetail {
  const rnd = seeded((o.seed ?? 1) * 7919 + 13), detail = o.detail ?? "full", sp = sk.c.species;
  const az = (o.sunAzimuth ?? 35) * Math.PI / 180, el = (o.sunElevation ?? 45) * Math.PI / 180;
  const sun: [number, number, number] = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
  const blossomOnly = sk.foliage.length === 0 && sk.blossom.length > 0;
  const masses: (FoliageMass & { blossom: boolean })[] = [...sk.foliage.map(f => ({ ...f, blossom: false })), ...sk.blossom.map(f => ({ ...f, blossom: true }))];
  // In leaf, no twig ends bare: tips without a mass get a small spray (the growth leaves some unclothed).
  const fk = sk.c.a.foliage.kind;
  if (sk.leafCover > .3 && sk.foliage.length && (fk === "cloud" || fk === "layered-sprays")) {
    const orders = sk.c.a.branch.orders, sz = sk.c.a.foliage.size * Math.sqrt(sk.leafCover);
    for (const b of sk.branches) {
      if (b.order < Math.max(1, orders - 1) || b.points.length < 2) continue;
      const end = b.points[b.points.length - 1];
      if (sk.foliage.some(m => { const dx = (end[0] - m.cx) / m.rx, dy = (end[1] - m.cy) / m.ry; return dx * dx + dy * dy < 1.4; })) continue;
      const rx = sz * (.45 + rnd() * .2);
      masses.push({ cx: end[0], cy: end[1] + rx * .1, rx, ry: rx * (fk === "layered-sprays" ? .4 : .72), angle: 0, depth: b.depth, blossom: false });
    }
  }
  const strandLeaves = weepingLeaves(sk, sun, detail, rnd);
  // Spire conifers are clothed down the leader too: short shoots all round the stem, so the trunk hides in the crown.
  if (fk === "scale-sprays" && sk.foliage.length) {
    const stem = sk.branches.find(b => b.order === 0), cb = sk.c.a.crown.base;
    if (stem) for (let y = cb + .02; y < .98; y += .035) {
      const p = stem.points.find(q => q[1] >= y) ?? stem.points[stem.points.length - 1], half = sk.c.a.crown.width / 2 * Math.pow(1 - (y - cb) / (1 - cb), .9);
      masses.push({ cx: p[0], cy: p[1], rx: Math.max(.012, half * .45), ry: Math.max(.012, half * .3), angle: 0, depth: .05, blossom: false });
    }
  }
  const empty: CrownDetail = { tufts: [], holes: [], flicks: [], strandLeaves, body: [], ladder: strandLeaves.length ? foliageLadder(leafBase(sk)) : [], gapTarget: 0, gapNatural: 0, gapSeen: 0, sun };
  if (!masses.length) return empty;
  const kind0 = kindOf(sk);
  // The crown frame.
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const m of masses) { x0 = Math.min(x0, m.cx - m.rx); x1 = Math.max(x1, m.cx + m.rx); y0 = Math.min(y0, m.cy - m.ry); y1 = Math.max(y1, m.cy + m.ry); }
  const W = x1 - x0, H = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, RX = W / 2, RY = H / 2;
  // Tuft size: the measured lit clumps run 1–3.5% of the crown; drawn tufts sit at the large end so they read at sheet size.
  const lod = detail === "full" ? 1 : detail === "medium" ? 1.6 : 2.6;
  const meanR = masses.reduce((a, m) => a + Math.min(m.rx, m.ry * 1.6), 0) / masses.length;
  const rT = Math.min(Math.max(W * .016, meanR * .34), W * .03) * lod * (kind0 === "needle" ? .8 : 1);
  // Which masses cover a point, front-most first.
  const inside = (m: FoliageMass, p: FPoint) => { const dx = (p[0] - m.cx) / m.rx, dy = (p[1] - m.cy) / m.ry; return dx * dx + dy * dy; };
  const ordered = masses.slice().sort((a, b) => b.depth - a.depth);
  const front = (p: FPoint) => { let best: (typeof masses)[number] | undefined, bestD = 2; for (const m of ordered) { const d = inside(m, p); if (d <= 1.02) return { m, d }; if (d < bestD) { bestD = d; best = m; } } return best && bestD < 1.25 ? { m: best, d: bestD } : undefined; };
  // Occupancy grid (for the silhouette and the gap check).
  const G = 96, gx = (x: number) => Math.floor((x - x0) / W * G), gy = (y: number) => Math.floor((y - y0) / H * G);
  const occ = new Uint8Array(G * G);
  for (const m of masses) {
    for (let j = Math.max(0, gy(m.cy - m.ry)); j <= Math.min(G - 1, gy(m.cy + m.ry)); j++) for (let i = Math.max(0, gx(m.cx - m.rx)); i <= Math.min(G - 1, gx(m.cx + m.rx)); i++) {
      if (!occ[j * G + i] && inside(m, [x0 + (i + .5) / G * W, y0 + (j + .5) / G * H]) <= 1) occ[j * G + i] = 1;
    }
  }
  const filled = (x: number, y: number) => { const i = gx(x), j = gy(y); return i >= 0 && j >= 0 && i < G && j < G && occ[j * G + i] === 1; };
  // Tufts on a jittered hex grid over the union of masses.
  const s = rT * 1.25, rows = Math.ceil(H / (s * .87)) + 2, cols = Math.ceil(W / s) + 2;
  const tufts: Tuft[] = [];
  const ladderLeaf = foliageLadder(blossomOnly ? (sp?.flower?.colours[0] ?? "#f4eef0") : leafBase(sk), blossomOnly ? "blossom" : "leaf");
  const red = sk.autumn && redAutumn(sp), autumnMix = sk.autumn && sp?.leaf.colours.autumn ? sp.leaf.colours.autumn : undefined;
  const makeTuft = (p: FPoint, m: (typeof masses)[number]) => {
    const kind: TuftKind = m.blossom ? "blossom" : kind0;
    // The big form: the crown as one ellipsoid; the local form: the tuft on its mass.
    const N: FPoint = [(p[0] - cx) / RX, (p[1] - cy) / RY], nr = Math.min(1, Math.hypot(N[0], N[1])), Nz = Math.sqrt(Math.max(0, 1 - nr * nr));
    const n: FPoint = [(p[0] - m.cx) / m.rx, (p[1] - m.cy) / m.ry], mr = Math.min(1, Math.hypot(n[0], n[1])), nz = Math.sqrt(Math.max(0, 1 - mr * mr));
    const big = Math.max(0, N[0] * sun[0] + N[1] * sun[1] + Nz * sun[2]) * .5, local = Math.max(0, n[0] * sun[0] + n[1] * sun[1] + nz * sun[2]);
    // Flat layers and pads face up: their light is mostly the sun's height, their undersides dark.
    const flat = kind === "layer" || kind === "needle";
    const facing = flat ? .45 * Math.max(0, n[1]) * sun[1] + .55 * local : local;
    const h = (p[1] - y0) / H;
    // Self-shading toward the core (measured core/rim .59–.94) and height (top/bottom 1.26–1.62).
    // Sunlight filtered through the crown (Beer–Lambert): the path from the tuft, on the crown's surface seen from
    // the front, out of the crown toward the sun. κ per crown radius ≈ G·LAI with G = 0.5 and a crown LAI of about
    // 3.6 over its diameter (estimated); the measured top/bottom ratio checks it.
    const P = [N[0], N[1], Nz * (m.depth >= 0 ? .95 : .4)], PL = P[0] * sun[0] + P[1] * sun[1] + P[2] * sun[2], pp = P[0] * P[0] + P[1] * P[1] + P[2] * P[2];
    const exitT = Math.max(0, -PL + Math.sqrt(Math.max(0, PL * PL - (pp - 1)))), through = Math.exp(-CROWN_KAPPA * exitT);
    const height = .86 + .14 * h, under = n[1] < -.3 ? .78 : 1;
    // Skylight and light off the ground reach the lower and shaded parts too (the floor term).
    let light = (.13 + .87 * through * (.45 + .55 * facing) + .1 * big) * height * under * (.88 + rnd() * .24);
    if (m.blossom) light = .35 + .65 * light;   // petals scatter light: a flatter ladder
    const z = (m.depth >= 0 ? 1 : 0) * 10 + Nz * 2 - h * .9 + rnd() * .35;
    // The outline: a leafy scalloped round, flatter for layers and pads, drooping for cedar sprays.
    const r = rT * (.8 + rnd() * .45) * (m.blossom ? .82 : .55 + .45 * Math.min(1, sk.leafCover));
    const outline = tuftOutline(p, r, kind, rnd), shift = r * .26, sx = sun[0] / Math.max(.2, Math.hypot(sun[0], sun[1])), sy = Math.max(.35, sun[1] / Math.max(.2, Math.hypot(sun[0], sun[1])));
    const cap = outline.map(q => add(lerpP(p, q, .74), [sx * shift, sy * shift]) as FPoint);
    // A tuft is mostly leaves: darker ones round its lower and far side, lit ones on the side toward the sun, each
    // pointing out from the centre (Needham: the highlights sit on the edges of the sprays).
    const leaves: Tuft["leaves"] = [];
    if (detail !== "low") {
      const nLit = kind === "needle" ? 4 : 5, nShade = 4, size = Math.max(r * (kind === "blossom" ? .4 : kind === "needle" ? .75 : .62), leafSizeOf(sk) * 1.1);
      const toSun = Math.atan2(sy, sx), squash = kind === "layer" ? .6 : kind === "needle" ? .7 : 1;
      const place = (a: number, rr: number, lightK: number) => {
        const at: FPoint = [p[0] + Math.cos(a) * rr * (kind === "layer" ? 1.25 : 1), p[1] + Math.sin(a) * rr * squash];
        leaves.push({ pts: leafGlyph(kind, sp?.leaf.shape, at, size * (.75 + rnd() * .5), a * 180 / Math.PI + (rnd() - .5) * 50), light: lightK });
      };
      for (let k = 0; k < nShade; k++) place(toSun + Math.PI + (k / Math.max(1, nShade - 1) - .5) * 2.6 + (rnd() - .5) * .5, r * (.45 + rnd() * .35), .5 + rnd() * .2);
      for (let k = 0; k < nLit; k++) place(toSun + (k / Math.max(1, nLit - 1) - .5) * 2.6 + (rnd() - .5) * .5, r * (.3 + rnd() * .45), .85 + rnd() * .3);
    }
    // Colour: blossom pink or white by flower colours; autumn reds where lit (more anthocyanin), oranger in shade.
    let colour = m.blossom ? (sp?.flower?.colours[rnd() < .3 ? 1 : 0] ?? "#f4eef0") : "";
    const q5 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 5) / 5;
    if (!m.blossom && autumnMix) colour = red ? mixLinear(autumnMix, "#d9862a", q5(Math.max(0, .55 - light) * 1.4 * (.6 + rnd() * .6)) * .7) : mixLinear(autumnMix, "#e8c040", q5(rnd() * .5) * .5);
    tufts.push({ c: p, r, outline, cap, leaves, light, z, back: m.depth < 0, kind, colour });
  };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const p: FPoint = [x0 - s + (i + (j % 2 ? .5 : 0)) * s + (rnd() - .5) * s * .55, y0 - s * .5 + j * s * .87 + (rnd() - .5) * s * .5];
    const hit = front(p);
    // Blossom gathers in clusters along the twigs, with sky and wood between (measured gap .26 on a cherry in flower).
    const sparse = hit && (hit.m.blossom ? .3 : sk.blossom.length ? 1 - sk.leafCover : 0);
    if (hit && hit.d <= 1 && !(rnd() < (sparse || 0))) makeTuft(p, hit.m);
  }
  // Small or thin masses can fall between grid rows: every mass gets at least one tuft.
  for (const m of masses) {
    const c: FPoint = [m.cx, m.cy];
    if (!tufts.some(t => Math.hypot(t.c[0] - c[0], t.c[1] - c[1]) < rT * 1.3)) makeTuft(c, m);
  }
  // Exposure: the brightest tufts are the sunlit stop.
  const sorted = tufts.map(t => t.light).sort((a, b) => a - b), top = sorted[Math.floor(sorted.length * .97)] || 1;
  for (const t of tufts) t.light = Math.min(1, t.light / top);
  tufts.sort((a, b) => a.z - b.z);
  // Holes: between tufts, more toward the rim and the lower crown, until the sky seen through the crown reaches the
  // measured gap for this foliage. The gap is measured as on the photographs: the crown's envelope is its foliage
  // closed over small gaps, and the gap is the uncovered share of that envelope.
  const cover = Math.max(.15, sk.leafCover);
  const baseGap = blossomOnly ? .26 : kind0 === "spray" ? .1 : kind0 === "needle" ? .19 : kind0 === "layer" ? .2 : .16 + (1 - sk.c.a.foliage.density) * .25;
  const gapTarget = Math.min(.6, 1 - (1 - baseGap) * Math.pow(cover, .7));
  const R = 128, cell = Math.max(W, H) / R, rx0 = cx - R * cell / 2, ry0 = cy - R * cell / 2;
  const cov = new Uint8Array(R * R);
  let env: Uint8Array | undefined, opened = 0;
  const paint = (c: FPoint, rad: number, v: number) => {
    const i0 = Math.max(0, Math.floor((c[0] - rad - rx0) / cell)), i1 = Math.min(R - 1, Math.floor((c[0] + rad - rx0) / cell)), j0 = Math.max(0, Math.floor((c[1] - rad - ry0) / cell)), j1 = Math.min(R - 1, Math.floor((c[1] + rad - ry0) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * R + i;
      if (cov[k] === v || Math.hypot(rx0 + (i + .5) * cell - c[0], ry0 + (j + .5) * cell - c[1]) > rad) continue;
      if (env && env[k] && v === 0) opened++;
      cov[k] = v;
    }
  };
  for (const t of tufts) paint(t.c, t.r * .95, 1);
  env = envelope(cov, R, Math.max(2, Math.round(R * .03)));
  let envCells = 0, natural = 0;
  for (let k = 0; k < cov.length; k++) if (env[k]) { envCells++; if (!cov[k]) natural++; }
  envCells = envCells || 1;
  const seen = () => (natural + opened) / envCells;
  const holes: FPoint[][] = [];
  const nearTuft = (p: FPoint) => { let d = Infinity; for (const t of tufts) { const q = Math.hypot(p[0] - t.c[0], p[1] - t.c[1]) / t.r; if (q < d) d = q; } return d; };
  let gapNow = seen(), tries = 0;
  const gapNatural = gapNow;
  while (gapNow < gapTarget && tries++ < 3000) {
    const p: FPoint = [x0 + rnd() * W, y0 + rnd() * H];
    if (!filled(p[0], p[1])) continue;
    const N: FPoint = [(p[0] - cx) / RX, (p[1] - cy) / RY], nr = Math.min(1, Math.hypot(N[0], N[1])), h = (p[1] - y0) / H;
    // Measured: core 2–14%, outer part 17–38%; the lower crown more open in most trees.
    const want = .08 + .55 * nr * nr * nr + (h < .3 ? .15 : 0);
    if (rnd() > want || nearTuft(p) < .5) continue;
    // Many small holes, a few windows (measured median .4% of the crown, 90th percentile 1–1.5%).
    const big = rnd() < .14, hr = (big ? W * (.012 + rnd() * .02) : W * (.004 + rnd() * .007)) * Math.sqrt(lod);
    holes.push(holeOutline(p, hr, rnd));
    paint(p, hr * .85, 0);
    gapNow = seen();
  }
  // Flicks: leaves, needle bursts or petals off tufts on the silhouette, pointing outward.
  const flicks: CrownDetail["flicks"] = [];
  if (detail !== "low") {
    const leafLen = Math.max(rT * .42, leafSizeOf(sk) * 1.2), outline = sp ? leafShape(sp.leaf, 3).outlines[0] : leafShape({ shape: "ovate", width: .45 }, 3).outlines[0];
    for (const t of tufts) {
      const out: FPoint = [(t.c[0] - cx) / RX, (t.c[1] - cy) / RY], ol = Math.hypot(out[0], out[1]) || 1, u: FPoint = [out[0] / ol, out[1] / ol];
      const probe: FPoint = add(t.c, u, t.r * 1.6);
      if (filled(probe[0], probe[1])) continue;
      const count = t.kind === "needle" ? 3 : t.kind === "blossom" ? 4 : 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < count; k++) {
        const ang = Math.atan2(u[1], u[0]) * 180 / Math.PI + (rnd() - .5) * 110, at = add(t.c, [Math.cos(ang * Math.PI / 180), Math.sin(ang * Math.PI / 180)], t.r * (.75 + rnd() * .25));
        if (t.kind === "needle") {
          // A burst of needles: thin wedges fanning from a point.
          for (let q = 0; q < 5; q++) { const a = ang + (q - 2) * 14 + (rnd() - .5) * 8, L = leafLen * (.8 + rnd() * .5), d: FPoint = [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)]; flicks.push({ pts: [add(at, [-d[1], d[0]], L * .03), add(at, d, L), add(at, [d[1], -d[0]], L * .03)], colour: t.colour, light: t.light, kind: t.kind }); }
        } else if (t.kind === "blossom") {
          flicks.push({ pts: ellipsePoints({ cx: at[0], cy: at[1], rx: leafLen * .32, ry: leafLen * .28, angle: rnd() * 90 }, 8), colour: t.colour, light: Math.min(1, t.light + .15), kind: t.kind });
        } else {
          const L = leafLen * (.7 + rnd() * .6), droop = t.kind === "spray" ? -60 : 0;
          flicks.push({ pts: outline.map(q => add(rotate([q[0] * L, q[1] * L], ang - 90 + droop * .3, [0, 0]), at)), colour: t.colour, light: t.light, kind: t.kind });
        }
      }
    }
  }
  // The dark body: the tufts a little enlarged, for the interior between them (no hard mass ellipses).
  // Blossom has no dark interior: petals scatter light through the cluster.
  const body = tufts.filter(t => t.kind !== "blossom").map(t => t.outline.map(q => lerpP(t.c, q, 1.06) as FPoint));
  return { tufts, holes, flicks, strandLeaves, body, ladder: ladderLeaf, gapTarget, gapNatural, gapSeen: gapNow, sun };
}

/** A crown's envelope on a raster: its cells closed over gaps of `k` cells, with enclosed holes filled (as measured on the photographs). */
function envelope(cov: Uint8Array, R: number, k: number): Uint8Array {
  const dil = new Uint8Array(R * R), ero = new Uint8Array(R * R);
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    let on = 0;
    for (let dj = -k; dj <= k && !on; dj++) for (let di = -k; di <= k; di++) { if (di * di + dj * dj > k * k) continue; const x = i + di, y = j + dj; if (x >= 0 && y >= 0 && x < R && y < R && cov[y * R + x]) { on = 1; break; } }
    dil[j * R + i] = on;
  }
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    let on = 1;
    for (let dj = -k; dj <= k && on; dj++) for (let di = -k; di <= k; di++) { if (di * di + dj * dj > k * k) continue; const x = i + di, y = j + dj; if (x < 0 || y < 0 || x >= R || y >= R || !dil[y * R + x]) { on = 0; break; } }
    ero[j * R + i] = on;
  }
  // Fill holes: flood the outside from the border.
  const out = new Uint8Array(R * R), stack: number[] = [];
  for (let i = 0; i < R; i++) for (const k2 of [i, (R - 1) * R + i, i * R, i * R + R - 1]) if (!ero[k2] && !out[k2]) { out[k2] = 1; stack.push(k2); }
  while (stack.length) { const k2 = stack.pop()!, x = k2 % R, y = (k2 - x) / R; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= R || ny >= R) continue; const n2 = ny * R + nx; if (!out[n2] && !ero[n2]) { out[n2] = 1; stack.push(n2); } } }
  for (let k2 = 0; k2 < R * R; k2++) ero[k2] = out[k2] ? 0 : 1;
  return ero;
}

/** The leaf colour the crown is built from this month. */
function leafBase(sk: PlantSkeleton): string {
  const sp = sk.c.species, m: Month = sk.month;
  if (!sp) return "#4a6e3a";
  const c = sp.leaf.colours;
  if (sk.autumn && c.autumn) return c.autumn;
  if (m >= 3 && m <= 5 && c.spring && !sp.leaf.evergreen) return c.spring;
  return c.summer;
}
const leafSizeOf = (sk: PlantSkeleton) => { const sp = sk.c.species; return sp ? Math.min(.05, Math.max(.008, sp.leaf.length.typical / 100 / sp.size.height.typical * 1.5)) : .02; };

/**
 * One leaf as a small glyph (a few points, so a crown of thousands stays light): pointed blades, five-lobed hands for
 * palmate leaves, fans for ginkgo, thin wedges for needles, round petals for blossom.
 */
export function leafGlyph(kind: TuftKind, shape: string | undefined, at: FPoint, size: number, angleDeg: number): FPoint[] {
  const a = angleDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const put = (pts: FPoint[]) => pts.map(([u, v]) => [at[0] + (u * ca - v * sa) * size, at[1] + (u * sa + v * ca) * size] as FPoint);
  if (kind === "needle") return put([[0, -.035], [1, 0], [0, .035], [.05, 0]]);
  if (kind === "blossom") { const pts: FPoint[] = []; for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2, rr = i % 2 ? .3 : .42; pts.push([.4 + Math.cos(t) * rr, Math.sin(t) * rr]); } return put(pts); }
  if (kind === "spray") return put([[0, -.2], [.45, -.28], [.9, -.12], [1, 0], [.9, .12], [.45, .28], [0, .2]]);
  if (shape === "palmate") { const pts: FPoint[] = []; for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2, rr = i % 2 ? .22 : .5; pts.push([.5 + Math.cos(t) * rr, Math.sin(t) * rr]); } return put(pts); }
  if (shape === "fan") return put([[0, 0], [.75, -.42], [.95, -.2], [1, 0], [.95, .2], [.75, .42]]);
  const w = shape === "lanceolate" || shape === "blade" ? .14 : .26;
  return put([[0, 0], [.2, -w * .8], [.5, -w], [.8, -w * .6], [1, 0], [.8, w * .6], [.5, w], [.2, w * .8]]);
}

/** A tuft's outline: scalloped by its leaves; pads and layers flat-bottomed and wide; cedar sprays hang. */
function tuftOutline(c: FPoint, r: number, kind: TuftKind, rnd: () => number): FPoint[] {
  const n = kind === "blossom" ? 16 : kind === "needle" ? 18 : 13, pts: FPoint[] = [], ph = rnd() * 6.28, tilt = kind === "layer" || kind === "needle" ? (rnd() - .5) * .45 : 0;
  const sx = kind === "layer" ? 1.35 : kind === "needle" ? 1.3 : 1, sy = kind === "layer" ? .62 : kind === "needle" ? .66 : kind === "spray" ? 1.1 : .92;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, bump = kind === "needle" ? (i % 2 ? 1.08 : .8) : kind === "blossom" ? .9 + .1 * Math.sin(a * 5 + ph) : (i % 2 ? 1 : .8) + .08 * Math.sin(a * 2 + ph);
    let rr = r * bump * (.92 + rnd() * .16), y = Math.sin(a) * sy;
    if ((kind === "layer" || kind === "needle") && y < 0) y *= .75;      // flatter undersides
    if (kind === "spray" && y < 0) { y *= 1.25; rr *= 1 - .15 * Math.abs(Math.cos(a)); }   // drooping tips
    const u = Math.cos(a) * sx * rr, v = y * rr;
    pts.push([c[0] + u * Math.cos(tilt) - v * Math.sin(tilt), c[1] + u * Math.sin(tilt) + v * Math.cos(tilt)]);
  }
  return pts;
}
function holeOutline(c: FPoint, r: number, rnd: () => number): FPoint[] {
  // Ragged, a little wider than tall, its edge notched by the leaves round it.
  const n = 14, pts: FPoint[] = [], ph = rnd() * 6.28;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = r * (.6 + .25 * Math.sin(a * 2 + ph) + rnd() * .35) * (i % 2 ? 1 : .8); pts.push([c[0] + Math.cos(a) * rr * 1.2, c[1] + Math.sin(a) * rr * .85]); }
  return pts;
}

/** Leaves along hanging twigs (willow): narrow blades hanging down and out, alternately, lit on the sun's side. */
function weepingLeaves(sk: PlantSkeleton, sun: readonly number[], detail: CrownDetailLevel, rnd: () => number): { pts: FPoint[]; light: number }[] {
  const out: { pts: FPoint[]; light: number }[] = [], twigs = sk.strands.filter(st => st.kind === "twig");
  if (!twigs.length || sk.leafCover <= 0 || detail === "low") return out;
  let x0 = Infinity, x1 = -Infinity;
  for (const st of twigs) for (const q of st.points) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); }
  const cx = (x0 + x1) / 2, RX = Math.max(.05, (x1 - x0) / 2), size = Math.max(.026, leafSizeOf(sk) * 1.6), step = size * (detail === "full" ? .32 : .6) / Math.sqrt(sk.leafCover);
  for (const st of twigs) {
    const side = Math.max(0, (st.points[0][0] - cx) / RX * sun[0]) + Math.max(0, sun[2]) * .6, base = (.25 + .55 * side) * (st.depth < 0 ? .6 : 1);
    let acc = 0, k = 0;
    for (let i = 1; i < st.points.length; i++) {
      const a = st.points[i - 1], b = st.points[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
      for (acc += L; acc > step; acc -= step * (.7 + rnd() * .6)) {
        const at = lerpP(a, b, 1 - acc / L), s2 = k++ % 2 ? 1 : -1;
        out.push({ pts: leafGlyph("leaf", "blade", at, size * (.85 + rnd() * .5), ang + s2 * (8 + rnd() * 16)), light: Math.min(1, base * (.8 + rnd() * .4) * (s2 * sun[0] > 0 ? 1.15 : .85)) });
      }
    }
  }
  return out;
}

// ---- Trunk and limbs ------------------------------------------------------------------------------------------------------------------

export interface WoodDetail {
  /** The side away from the light on each trunk and limb (a half-tube), and a thin lit strip on the near side. */
  shade: FPoint[][]; lit: FPoint[][];
  /** Bark marks wrapped round the cylinder (lines) and plates (outlines), for the species' bark kind, per branch with its outline (paint them clipped to it, so marks do not cross at forks). */
  bark: { outline: FPoint[]; marks: FPoint[][]; plates: FPoint[][] }[];
  /** Back or front, as the branch it belongs to. */
  backShade: FPoint[][];
}

/**
 * A copy of a grown plant with its wood joined as trees grow it (estimated from photographs):
 * - the stem foot flares into the roots, where bending stress is greatest (half again the radius at the ground,
 *   gone by 2.5 radii up);
 * - each great limb swells at its base to the trunk's radius, so limbs grow out of the trunk (leaving the V between
 *   them) instead of standing in a cut stump. Leonardo's rule makes each of three limbs only about 0.6 of the trunk.
 */
export function flareTrunk(sk: PlantSkeleton): PlantSkeleton {
  const resample = (b: PlantBranch, near: (p: FPoint, i: number) => boolean) => {
    const pts: FPoint[] = [], radii: number[] = [];
    for (let i = 0; i < b.points.length; i++) {
      const p = b.points[i], q = b.points[i + 1];
      pts.push(p); radii.push(b.radii[i]);
      if (q && near(p, i)) for (let k = 1; k < 4; k++) { const f = k / 4; pts.push(lerpP(p, q, f)); radii.push(b.radii[i] + (b.radii[i + 1] - b.radii[i]) * f); }
    }
    return { pts, radii };
  };
  const tops = sk.branches.filter(b => b.order === 0 && b.points.length > 2).map(b => ({ at: b.points[b.points.length - 1], r: b.radii[b.radii.length - 1] }));
  const branches = sk.branches.map(b => {
    if (b.order !== 0 || b.points.length < 3) return b;
    if (b.points[0][1] <= .01) {
      const zone = b.radii[0] * 2.5, { pts, radii } = resample(b, p => p[1] < zone);
      return { ...b, points: pts, radii: radii.map((r, i) => r * (1 + .5 * Math.pow(Math.max(0, 1 - (pts[i][1] - b.points[0][1]) / zone), 2.2))) };
    }
    const parent = tops.find(t => Math.hypot(t.at[0] - b.points[0][0], t.at[1] - b.points[0][1]) < 1e-6);
    if (!parent || parent.r <= b.radii[0]) return b;
    const zone = parent.r * 2.2, { pts, radii } = resample(b, p => Math.hypot(p[0] - b.points[0][0], p[1] - b.points[0][1]) < zone);
    return { ...b, points: pts, radii: radii.map((r, i) => { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]), u = Math.max(0, 1 - d / zone); return r + (parent.r * .92 - r) * u * u; }) };
  });
  return { ...sk, branches };
}

/**
 * Cylinder shading and bark for the wood thick enough to show it (radius over `minRadius` plant units). The sun's
 * side comes from its azimuth: shade falls on the side away from it.
 */
export function woodDetail(sk: PlantSkeleton, o: { sunAzimuth?: number; minRadius?: number; seed?: number } = {}): WoodDetail {
  const az = (o.sunAzimuth ?? 35) * Math.PI / 180, minR = o.minRadius ?? .006, sp = sk.c.species, kind = sp?.bark.kind ?? "fissured";
  // The sun on screen (from the side, and from above), and how far the terminator moves toward the dark edge when
  // the sun is more in front (a front-lit cylinder is mostly lit).
  const sun2: FPoint = [Math.sin(az), .8], frontness = Math.max(0, Math.cos(az));
  const shade: FPoint[][] = [], lit: FPoint[][] = [], bark: WoodDetail["bark"] = [], backShade: FPoint[][] = [];
  let seed = (o.seed ?? 1) * 31;
  for (const b of sk.branches) {
    if (b.points.length < 2 || b.radii[0] < minR) continue;
    const { left, right, normals, s } = frame(b);
    // Which edge faces the light (the left edge lies along +normal).
    const dot = normals.reduce((a, n) => a + n[0] * sun2[0] + n[1] * sun2[1], 0), litSign = dot >= 0 ? 1 : -1;
    const near = litSign > 0 ? left : right, far = litSign > 0 ? right : left;
    // The shadow side: from the terminator out to the far edge.
    const term = b.points.map((p, i) => add(p, normals[i], -litSign * b.radii[i] * .55 * frontness));
    (b.depth < 0 ? backShade : shade).push([...term, ...far.slice().reverse()]);
    if (b.radii[0] >= minR * 2 && b.order <= 1) lit.push([...near, ...b.points.map((p, i) => add(near[i], sub2(p, near[i]), .3)).reverse()]);
    // Bark: the species' marks on an unrolled strip, wrapped onto the front half of the cylinder.
    if (b.order > 1 || b.radii[0] < minR * 1.6) continue;
    const L = s[s.length - 1], w = 1, h = L / (2 * b.radii[0]);
    const bm = barkMarks(kind, w, Math.max(.5, h), seed++), marks: FPoint[][] = [], plates: FPoint[][] = [];
    const wrap = (q: FPoint): FPoint | undefined => {
      const along = q[1] / Math.max(.5, h) * L, i = indexAt(s, along);
      if (i < 0) return undefined;
      const f = (along - s[i]) / Math.max(1e-9, s[i + 1] - s[i]), p = lerpP(b.points[i], b.points[i + 1], f), r = b.radii[i] + (b.radii[i + 1] - b.radii[i]) * f, nrm = normals[i];
      const theta = (q[0] / w - .5) * Math.PI * .92;
      return add(p, nrm, r * Math.sin(theta));
    };
    // Limbs leave their swollen base clean, so marks do not cross where limbs overlap at the fork.
    const clear = b.points[0][1] > .01 ? b.radii[0] * 2.4 : 0, keep = (p: FPoint) => Math.hypot(p[0] - b.points[0][0], p[1] - b.points[0][1]) >= clear;
    for (const m of bm.marks) { const pts = m.map(wrap).filter((p): p is FPoint => !!p && keep(p)); if (pts.length > 1) marks.push(pts); }
    for (const ol of bm.outlines) { const pts = ol.map(wrap).filter((p): p is FPoint => !!p); if (pts.length > 2 && pts.every(keep)) plates.push(pts); }
    bark.push({ outline: [...left, ...right.slice().reverse()], marks, plates });
  }
  return { shade, lit, bark, backShade };
}
const sub2 = (a: FPoint, b: FPoint): FPoint => [a[0] - b[0], a[1] - b[1]];
function frame(b: PlantBranch) {
  const left: FPoint[] = [], right: FPoint[] = [], normals: FPoint[] = [], s: number[] = [0];
  b.points.forEach((p, i) => {
    const a = b.points[Math.max(0, i - 1)], c = b.points[Math.min(b.points.length - 1, i + 1)], vx = c[0] - a[0], vy = c[1] - a[1], l = Math.hypot(vx, vy) || 1, n: FPoint = [-vy / l, vx / l];
    normals.push(n); left.push(add(p, n, b.radii[i])); right.push(add(p, n, -b.radii[i]));
    if (i) s.push(s[i - 1] + Math.hypot(p[0] - b.points[i - 1][0], p[1] - b.points[i - 1][1]));
  });
  return { left, right, normals, s };
}
function indexAt(s: readonly number[], v: number): number { for (let i = 0; i < s.length - 1; i++) if (v <= s[i + 1]) return i; return -1; }

// ---- Sway -----------------------------------------------------------------------------------------------------------------------------

/** A tree's fundamental sway frequency in Hz from its height (m) and trunk diameter (cm), in leaf or bare. */
export function swayFrequency(heightM: number, trunkCm: number, inLeaf = true): number {
  const f = TREE_SWAY.k.typical * (trunkCm / 100) / (heightM * heightM);
  return inLeaf ? f / TREE_SWAY.leaflessRise.typical : f;
}
/** The species' typical sway frequency (trunk from its data, else from the drawn trunk width). */
export function speciesSway(sk: PlantSkeleton): number {
  const sp = sk.c.species, H = sp?.size.height.typical ?? 10, d = sp?.size.trunk?.typical ?? sk.c.a.trunk.baseWidth * H * 100;
  return Math.min(2.5, Math.max(.08, swayFrequency(H, d, sk.leafCover > .3)));
}
export type { Range };
