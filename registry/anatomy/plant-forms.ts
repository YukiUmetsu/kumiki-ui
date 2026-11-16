/**
 * FLORA1 growth forms: what a whole group of plants shares, so a species only states how it differs.
 *
 * A form fixes how the plant is built in every art style. Its architecture follows Rex Vicat Cole, *The Artistic
 * Anatomy of Trees* (1915), ch. XII–XIV:
 * - each species sets its buds on a fixed plan: opposite pairs, alternate in two rows, spirally, or crowded in whorls;
 * - the twig is a small copy of the bough, so the same rule repeats at every order;
 * - the leader carries on straight while its end bud lives (excurrent), steps aside each year when a side bud takes
 *   over (sympodial: a branch of curved steps), or forks when the end bud fails between opposite buds.
 *
 * Branch widths follow Leonardo's rule: the cross-sections of the branches above a fork add up to the cross-section
 * below it (pipe exponent about 2; Eloy 2011 explains it by wind loads).
 *
 * Proportions are in units of the plant's height (ground to crown top). They are typical values for the form; a
 * species overrides them (see `plant-species.ts`).
 */

export type GrowthFormId = "conifer-spire" | "pine" | "broadleaf" | "blossom-tree" | "weeping" | "layered" | "bamboo" | "shrub" | "vine"
  | "herb" | "iris-clump" | "aquatic" | "grass";
/** How a leader carries on: straight (excurrent), stepping aside each year (sympodial), forking, or one of the non-woody habits. */
export type LeaderHabit = "excurrent" | "sympodial" | "forking" | "culm" | "clump" | "twining" | "stems";
/** Cole's bud arrangements: opposite pairs at right angles, alternate in two rows, spiral (three or more rows), crowded in whorls. */
export type BudPlan = "opposite" | "alternate" | "spiral" | "whorled";
export type CrownShape = "cone" | "column" | "dome" | "vase" | "umbrella" | "layered" | "weeping" | "irregular" | "fan" | "clump";
export type FoliageKind = "needle-pads" | "scale-sprays" | "cloud" | "strands" | "layered-sprays" | "fans" | "blades" | "swords" | "leafy-stems" | "floating" | "none";

export interface PlantArchitecture {
  leader: LeaderHabit;
  buds: BudPlan;
  /** Spiral phyllotaxis as a fraction of a turn between successive leaves or buds (1/2, 1/3, 2/5, 3/8, 5/13). */
  phyllotaxis: number;
  trunk: {
    /** Clear stem below the first branch ÷ height. */
    clearBole: number;
    /** Lean from vertical (deg) and how much the stem wanders (0–1). */
    lean: number; wander: number;
    /** Trunk diameter at the base ÷ height. */
    baseWidth: number;
    /** Where the trunk divides into limbs (÷ height) and how many (decurrent trees); 0 = it does not divide. */
    forkAt: number; limbs: number;
    /** Separate stems from the root (bamboo culms, shrubs, grasses). */
    stems: number;
  };
  crown: { shape: CrownShape; width: number; base: number };
  branch: {
    /** Angle from the parent (deg) at the base of the crown and at its top. */
    angleLow: number; angleHigh: number;
    /** Bend toward the ground along the branch (0–1) and the upturn of its tip (deg). */
    droop: number; tipTurn: number;
    /** Orders of branching below the trunk (1 = branches only, 3 = branches, sprays and twigs). */
    orders: number;
    /** Child length ÷ parent length, laterals per node, spacing along the parent (÷ its length). */
    lengthRatio: number; perNode: number; spacing: number;
    /** Turn at each node of a sympodial branch (deg): the "curved steps". */
    zigzag: number;
  };
  foliage: { kind: FoliageKind; size: number; density: number };
  /** Leonardo's pipe exponent (2: area kept at each fork). */
  pipe: number;
}

export interface GrowthForm {
  id: GrowthFormId;
  label: string;
  group: "conifer" | "broadleaf" | "bamboo" | "shrub" | "vine" | "herb" | "grass" | "aquatic";
  architecture: PlantArchitecture;
  /** How it moves in wind: stiffness (0 limp – 1 rigid) and which parts move most. */
  wind: { stiffness: number; moves: string };
  /** Construction notes that hold in any medium. */
  drawing: readonly string[];
}

const arch = (o: Partial<PlantArchitecture> & Pick<PlantArchitecture, "leader" | "buds">, t: Partial<PlantArchitecture["trunk"]>, c: PlantArchitecture["crown"],
  b: Partial<PlantArchitecture["branch"]>, f: PlantArchitecture["foliage"]): PlantArchitecture => ({
  phyllotaxis: .4, pipe: 2, ...o,
  trunk: { clearBole: .25, lean: 0, wander: .2, baseWidth: .03, forkAt: 0, limbs: 0, stems: 1, ...t },
  crown: c,
  branch: { angleLow: 60, angleHigh: 35, droop: .2, tipTurn: 10, orders: 3, lengthRatio: .55, perNode: 1, spacing: .14, zigzag: 0, ...b },
  foliage: f,
});

export const GROWTH_FORMS: Readonly<Record<GrowthFormId, GrowthForm>> = {
  "conifer-spire": { id: "conifer-spire", label: "Spire conifers (cedar, cypress)", group: "conifer",
    architecture: arch({ leader: "excurrent", buds: "spiral", phyllotaxis: .38 }, { clearBole: .2, baseWidth: .025, wander: .05 }, { shape: "cone", width: .32, base: .2 },
      { angleLow: 80, angleHigh: 45, droop: .45, tipTurn: 18, orders: 2, lengthRatio: .45, perNode: 2, spacing: .045 }, { kind: "scale-sprays", size: .05, density: .9 }),
    wind: { stiffness: .8, moves: "The whole spire sways from the base; the drooping sprays flutter." },
    drawing: ["One straight leader to the top: the end bud never fails.", "Branches short and many, sweeping down and turning up at the tips; shorter toward the top, so the outline is a cone.",
      "Old trees lose the lower branches: a long clean trunk under a spire."] },
  pine: { id: "pine", label: "Pines", group: "conifer",
    architecture: arch({ leader: "sympodial", buds: "whorled", phyllotaxis: .38 }, { clearBole: .35, lean: 8, wander: .6, baseWidth: .035 }, { shape: "umbrella", width: .75, base: .4 },
      { angleLow: 75, angleHigh: 55, droop: .35, tipTurn: 25, orders: 2, lengthRatio: .55, perNode: 2, spacing: .15, zigzag: 18 }, { kind: "needle-pads", size: .12, density: .8 }),
    wind: { stiffness: .7, moves: "The pads rock on their branches; the crooked trunk barely moves." },
    drawing: ["Branches leave the trunk in whorls, one tier a year; young pines are spires.",
      "Old pines lose the leader and the lower tiers: a crooked, leaning trunk under a flat-topped, broken crown (Cole: 'a tall spire replaced by a flat mop-like head').",
      "The needles gather in flat-topped pads at the branch ends, with sky between the tiers.", "Bark breaks into plates with dark fissures."] },
  broadleaf: { id: "broadleaf", label: "Broadleaf trees", group: "broadleaf",
    architecture: arch({ leader: "sympodial", buds: "spiral", phyllotaxis: .4 }, { clearBole: .28, wander: .3, baseWidth: .04, forkAt: .35, limbs: 3 }, { shape: "dome", width: .9, base: .3 },
      { angleLow: 55, angleHigh: 30, droop: .15, tipTurn: 8, orders: 3, lengthRatio: .6, spacing: .15, zigzag: 12 }, { kind: "cloud", size: .14, density: .85 }),
    wind: { stiffness: .6, moves: "Outer masses swell and roll; the limbs hold." },
    drawing: ["The trunk divides into a few great limbs; one limb of each fork usually leads.", "Branches go out in curved steps, each twig a small copy of its bough.",
      "Leaves gather into rounded masses with sky holes between them; the lit tops and shadowed undersides make the volume."] },
  "blossom-tree": { id: "blossom-tree", label: "Blossom and fruit trees (cherry, plum, peach, persimmon)", group: "broadleaf",
    architecture: arch({ leader: "sympodial", buds: "spiral", phyllotaxis: .4 }, { clearBole: .22, lean: 6, wander: .5, baseWidth: .05, forkAt: .3, limbs: 3 }, { shape: "dome", width: 1.0, base: .25 },
      { angleLow: 60, angleHigh: 35, droop: .25, tipTurn: 12, orders: 3, lengthRatio: .55, spacing: .14, zigzag: 22 }, { kind: "cloud", size: .1, density: .6 }),
    wind: { stiffness: .55, moves: "Twigs tremble; petals fall and drift." },
    drawing: ["Twigs zigzag (each year's end bud dies and a side bud carries on), so branches are a chain of elbows.",
      "Plum: old trunks gnarled and split, long straight water shoots; cherry: smooth bark ringed with horizontal lenticels.",
      "Blossom sits on the bare wood before the leaves (cherry, plum, peach); flowers in clusters along the twigs."] },
  weeping: { id: "weeping", label: "Weeping trees (willow)", group: "broadleaf",
    architecture: arch({ leader: "sympodial", buds: "spiral", phyllotaxis: .38 }, { clearBole: .3, lean: 5, wander: .4, baseWidth: .045, forkAt: .4, limbs: 3 }, { shape: "weeping", width: .9, base: .2 },
      { angleLow: 45, angleHigh: 25, droop: .6, tipTurn: -30, orders: 2, lengthRatio: .6, spacing: .15 }, { kind: "strands", size: .45, density: .8 }),
    wind: { stiffness: .25, moves: "The hanging strands swing as curtains; the trunk and limbs hold." },
    drawing: ["Limbs arch up and out from a short trunk, then fall.", "Long slender twigs hang straight down in curtains to near the ground; leaves are narrow along them."] },
  layered: { id: "layered", label: "Layered small trees (maple)", group: "broadleaf",
    architecture: arch({ leader: "forking", buds: "opposite", phyllotaxis: .5 }, { clearBole: .2, lean: 4, wander: .35, baseWidth: .035, forkAt: .25, limbs: 3 }, { shape: "layered", width: 1.1, base: .2 },
      { angleLow: 70, angleHigh: 40, droop: .12, tipTurn: 8, orders: 2, lengthRatio: .62, perNode: 2, spacing: .22 }, { kind: "layered-sprays", size: .1, density: .8 }),
    wind: { stiffness: .5, moves: "The flat sprays lift and settle like hands." },
    drawing: ["Opposite buds: when the end bud fails the shoot forks, so the branches are a lace of V-forks.",
      "Twigs on a horizontal bough lie flat (the under ones curve up, the upper ones grow out): leaves in flat, overlapping layers."] },
  bamboo: { id: "bamboo", label: "Bamboo", group: "bamboo",
    architecture: arch({ leader: "culm", buds: "alternate", phyllotaxis: .5 }, { clearBole: .45, baseWidth: .008, stems: 5 }, { shape: "fan", width: .5, base: .45 },
      { angleLow: 50, angleHigh: 40, droop: .3, tipTurn: 0, orders: 2, lengthRatio: .5, perNode: 2, spacing: .06 }, { kind: "fans", size: .05, density: .8 }),
    wind: { stiffness: .3, moves: "Whole culms bow from the base in long arcs; leaf fans flicker." },
    drawing: ["Hollow culms ringed by nodes: internodes shortest at the base and the top, longest in the middle.",
      "Branches leave the upper nodes in pairs, on alternate sides; leaves hang in fans of three to seven from the twig ends."] },
  shrub: { id: "shrub", label: "Evergreen shrubs (camellia)", group: "shrub",
    architecture: arch({ leader: "sympodial", buds: "spiral", phyllotaxis: .4 }, { clearBole: .08, baseWidth: .03, stems: 3, wander: .4 }, { shape: "dome", width: .8, base: .1 },
      { angleLow: 45, angleHigh: 30, droop: .1, tipTurn: 5, orders: 3, lengthRatio: .6, spacing: .14, zigzag: 10 }, { kind: "cloud", size: .1, density: .95 }),
    wind: { stiffness: .75, moves: "Only the outer leaves stir." },
    drawing: ["Several stems from the ground, densely leaved to the base: a rounded mass with glossy leaves catching the light.", "Flowers sit singly among the leaves at the twig ends."] },
  vine: { id: "vine", label: "Climbers (wisteria, morning glory)", group: "vine",
    architecture: arch({ leader: "twining", buds: "alternate", phyllotaxis: .5 }, { clearBole: .6, baseWidth: .02, wander: .8 }, { shape: "umbrella", width: 1.2, base: .65 },
      { angleLow: 80, angleHigh: 80, droop: .5, tipTurn: -20, orders: 2, lengthRatio: .6, spacing: .12 }, { kind: "strands", size: .3, density: .6 }),
    wind: { stiffness: .3, moves: "Hanging racemes and tendrils swing." },
    drawing: ["The stem twines round its support (wisteria floribunda clockwise) and spreads over a trellis.", "Wisteria's flower racemes hang straight down from the trellis, opening from the top."] },
  herb: { id: "herb", label: "Leafy herbs (chrysanthemum)", group: "herb",
    architecture: arch({ leader: "stems", buds: "spiral", phyllotaxis: .4 }, { clearBole: .1, baseWidth: .02, stems: 5 }, { shape: "clump", width: .7, base: .1 },
      { angleLow: 30, angleHigh: 20, droop: .1, tipTurn: 0, orders: 1, lengthRatio: .4, spacing: .15 }, { kind: "leafy-stems", size: .12, density: .9 }),
    wind: { stiffness: .4, moves: "Heads nod on their stems." },
    drawing: ["Upright leafy stems from a clump, flower heads at the tops.", "Leaves alternate up the stem, lobed and toothed, darker on top."] },
  "iris-clump": { id: "iris-clump", label: "Irises", group: "herb",
    architecture: arch({ leader: "clump", buds: "alternate", phyllotaxis: .5 }, { clearBole: 0, baseWidth: .02, stems: 6 }, { shape: "fan", width: .6, base: 0 },
      { angleLow: 12, angleHigh: 8, droop: .15, tipTurn: 0, orders: 1, lengthRatio: .5, spacing: .2 }, { kind: "swords", size: .9, density: .9 }),
    wind: { stiffness: .5, moves: "Sword leaves sway; flowers rock on their scapes." },
    drawing: ["Sword-shaped leaves in flat fans from the base, the inner ones tallest.", "Each flower: three falls hanging down and three standards upright, on a scape a little above the leaves."] },
  aquatic: { id: "aquatic", label: "Water plants (lotus)", group: "aquatic",
    architecture: arch({ leader: "stems", buds: "alternate", phyllotaxis: .5 }, { clearBole: 0, baseWidth: .012, stems: 7 }, { shape: "clump", width: 1.4, base: .4 },
      { angleLow: 10, angleHigh: 5, droop: 0, tipTurn: 0, orders: 1, lengthRatio: .5, spacing: .2 }, { kind: "floating", size: .35, density: .8 }),
    wind: { stiffness: .3, moves: "Leaves tilt and roll on their long stalks." },
    drawing: ["Round leaves on long stalks, some floating, most held above the water like shallow bowls.", "Flowers on their own stalks above the leaves; seed heads like flat-topped cones."] },
  grass: { id: "grass", label: "Grasses and reeds", group: "grass",
    architecture: arch({ leader: "clump", buds: "alternate", phyllotaxis: .5 }, { clearBole: 0, baseWidth: .006, stems: 14 }, { shape: "fan", width: .7, base: 0 },
      { angleLow: 18, angleHigh: 10, droop: .5, tipTurn: 0, orders: 1, lengthRatio: .5, spacing: .2 }, { kind: "blades", size: .8, density: .9 }),
    wind: { stiffness: .15, moves: "Whole clumps lean together in waves; plumes stream downwind." },
    drawing: ["Blades arch out from the clump and bend over at the tips.", "Flowering stems rise above the blades with feathery plumes (susuki) or dense panicles (reed); ripe rice heads droop."] },
};
