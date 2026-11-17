/**
 * FLORA2 reference profiles. Each profile was measured from the references it lists (study of 2026-11-17):
 * - **reported**: a figure quoted from the source;
 * - **measured**: read by us from the studied photographs (silhouette ratios from sky masks, colours as luma
 *   percentiles of the plant's pixels, sRGB);
 * - **estimated**: our judgement where no source gave a number.
 *
 * Photos are studied and linked, never copied. Leaf colours use the 50th–75th luma percentile of sunlit pixels as the
 * albedo anchor (FLORA1's rule). Four deep studies (Monstera, baobab, dragon tree, weeping willow) and four archetypes
 * (sunflower, maize, Echeveria, haircap moss) show that one schema holds flowers, row crops, succulents and moss.
 */
import { range } from "./foundation-shapes";
import type { SpeciesMorphologyProfile } from "./flora-profile";
import { GOLDEN_ANGLE } from "./flora-math";

const commonsPhoto = (file: string) => `https://commons.wikimedia.org/wiki/File:${file.replace(/ /g, "_")}`;

export const MONSTERA: SpeciesMorphologyProfile = {
  id: "monstera-deliciosa", name: "Swiss cheese plant", scientificName: "Monstera deliciosa", family: "Araceae", habit: "climber",
  summary: "A climbing aroid on a moss pole: cordate blades with deep pinnatifid splits and rows of holes between the lateral veins, long arching petioles and corky aerial roots.",
  sources: [
    { id: "avalos-2025", title: "Ávalos et al. 2025, Phenotypic differences in sun and shade leaves of Monstera deliciosa (Araceae), Revista de Biología Tropical 73", url: "https://revistas.ucr.ac.cr/index.php/rrbt/article/view/410/528", kind: "paper", rights: "cited",
      observed: ["Sun leaves 52.70 × 50.39 cm, petiole 50.28 cm; shade leaves 49.80 × 48.35 cm, petiole 52.22 cm (20 plants).", "Fenestrated area 4.74% of the effective leaf area in sun leaves, 1.88% in shade leaves.", "Adult leaves: 6 to 12 deep lobes and over 101 fenestrations (Cedeño-Fonseca et al. 2020)."] },
    { id: "wiki-monstera", title: "Wikipedia: Monstera deliciosa", url: "https://en.wikipedia.org/wiki/Monstera_deliciosa", kind: "flora", rights: "cited",
      observed: ["Up to 20 m in the wild, 2–3 m indoors.", "Leaves 25–90 cm long, 25–75 cm broad.", "Young plants have smaller, entire leaves with no lobes or holes."] },
    { id: "longwood-photo", title: "Monstera deliciosa at Longwood Gardens", url: commonsPhoto("Monstera_deliciosa2.jpg"), kind: "photo", rights: "CC BY-SA", creator: "Wikimedia Commons contributor",
      observed: ["A column of leaves round a support; the blades hang 45–75° below their petioles.", "Five to eight splits per side on adult leaves; holes in a row near the midrib.", "Leaf luma ladder p25 #1b2a18, p50 #2f432b, p75 #566b53 (shaded greenhouse)."] },
    { id: "nova-photo", title: "Monstera deliciosa, Monstera dziurawa 2023-10-31 01", url: commonsPhoto("Monstera_deliciosa_Monstera_dziurawa_2023-10-31_01.jpg"), kind: "photo", rights: "CC BY-SA", creator: "Agnieszka Kwiecień, Nova",
      observed: ["Splits run between primary laterals from the margin to 20–40% of the half-width; each lobe carries one or two laterals.", "Elliptic holes elongated along the laterals, larger near the midrib, smaller outward, in one to three rows.", "Pale raised midrib and laterals; panels bulge a little between laterals; strong gloss.", "Leaf ladder p50 #4f7234, p75 #749758."] },
    { id: "coir-photo", title: "Monstera growing into coir pole", url: commonsPhoto("Monstera_growing_into_coir_pole.jpg"), kind: "photo", rights: "CC BY-SA", creator: "Wikimedia Commons contributor",
      observed: ["Aerial root about one third of the stem width leaves a node and grows into the pole; corky brown #948b6d.", "Green stem #6e8b45 with node rings and sheathing petiole bases."] },
  ],
  size: { height: range(1.8, 2.4, 3, "reported", "wiki-monstera") },
  measured: {
    bladeLength: range(0.25, 0.527, 0.9, "reported", "avalos-2025"),
    petioleLength: range(0.3, 0.503, 0.6, "reported", "avalos-2025"),
    holeFraction: range(0.016, 0.031, 0.046, "reported", "avalos-2025"),
    bladeBelowHorizontal: range(15, 30, 50, "measured", "longwood-photo"),
  },
  root: "stem",
  axes: [
    { id: "stem", kind: "stem", surface: "stem", length: { of: "height", ratio: 1 }, radius: { of: "height", ratio: 0.0085, tip: 0.75 }, nodes: 26, climb: { turns: 1.1 }, wander: 18, gravity: 1.5, nodeRings: { spacing: 0.09, swell: 0.08 },
      children: [{ rule: "petiole", from: 0.1, to: 1, perMetre: 6.5 }, { rule: "aerial-root", from: 0.05, to: 0.85, perMetre: 2.2, chance: 0.7 }] },
    { id: "petiole", kind: "petiole", surface: "petiole", length: { of: "height", ratio: 0.21, spread: 0.2 }, radius: { of: "parent", ratio: 0.42, tip: 0.55 }, nodes: 10, angle: [52, 32], divergence: 155, gravity: 0.9, tipLoad: 1.2, upturn: 6, wander: 6 },
    { id: "aerial-root", kind: "aerial-root", surface: "root", length: { of: "height", ratio: 0.22, spread: 0.5 }, radius: { of: "parent", ratio: 0.3, tip: 0.7 }, nodes: 10, angle: [80, 80], divergence: 130, gravity: 14, upturn: -8, wander: 14 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.25, 0.527, 0.9, "reported", "avalos-2025"), width: 0.96, widestAt: 0.45, baseShape: 0.42, apexShape: 1.15, lobe: 0.17, sinus: 0.05,
      veins: { style: "pinnate", laterals: 11, angle: 58, baseAngle: 100, curve: 0.25, midrib: 0.035 },
      fenestration: { onset: 0.32, splits: { perSide: range(5, 7, 9, "measured", "longwood-photo"), reach: [0.66, 0.84], gap: 0.5 },
        holes: { rows: [{ at: 0.2, length: 1.15, width: 0.5, chance: 0.9 }, { at: 0.5, length: 0.8, width: 0.38, chance: 0.35 }, { at: 0.74, length: 0.6, width: 0.3, chance: 0.2 }], areaFraction: range(0.016, 0.031, 0.046, "reported", "avalos-2025") } },
      fold: -12, cup: -0.05, corrugation: 0.02, twist: 4, droop: 3, droopPitch: -20 },
  },
  placements: [{ organ: "leaf", on: "petiole", place: "tip", angle: [40, 40] }],
  surfaces: {
    leaf: { colour: [{ at: 0, hex: "#40602f" }, { at: 0.55, hex: "#4f7234" }, { at: 1, hex: "#557a3c" }], back: "#8fa47a", roughness: 0.36, clearcoat: 0.55, texture: "leaf-veins" },
    petiole: { colour: [{ at: 0, hex: "#5a7a36" }, { at: 1, hex: "#6e8b45" }], roughness: 0.48, clearcoat: 0.25, texture: "stem", tile: 0.3 },
    stem: { colour: [{ at: 0, hex: "#55663a" }, { at: 1, hex: "#6e8b45" }], roughness: 0.55, clearcoat: 0.15, texture: "stem", tile: 0.4 },
    root: { colour: [{ at: 0, hex: "#716540" }, { at: 1, hex: "#948b6d" }], roughness: 0.88, texture: "root", tile: 0.2 },
    coir: { colour: [{ at: 0, hex: "#5a4630" }, { at: 1, hex: "#6b5236" }], roughness: 0.96, texture: "coir", tile: 0.25, relief: 0.08 },
  },
  support: { height: 0.82, radius: 0.045, surface: "coir" },
  layout: { spacing: 1.2, clumpRadius: 1, rowPitch: 1.8 },
  seedling: 0.12,
  blueprint: {
    phyllotaxy: "One leaf per node, about 155° apart round the climbing stem (estimated from the column of leaves). Cordate blade 0.96 wide per length with basal lobes 17% of the length; 11 laterals per side at 58° (100° in the lobes). From growth stage 0.32: 5–9 splits per side between laterals, running in to 16–34% of the half-width and opening to half a panel at the margin; elongated holes in rows at 20%, 50% and 74% of the half-width, scaled so holes are 1.6% (shade) to 4.6% (sun) of the leaf area (Ávalos et al. 2025).",
    skeleton: "The stem winds 1.1 turns up a 4.5 cm moss pole with node rings every 9 cm. Petioles (0.21 × plant height, 50 cm on a mature plant) rise 32–52° from the stem and arch a little under the blade (elastica G 0.9, tip load 1.2); the blade bends 40° down at the geniculum, so it hangs 15–50° below horizontal as in the photos. Aerial roots, 2.2 per metre, leave at 80° and hang (G 14).",
    surface: "Glossy dark green upper side (p50 #4f7234, p75 #749758 sampled), clearcoat 0.55 for the waxy cuticle, pale raised veins in the normal map, paler matte underside. Stem #6e8b45 with node rings; aerial roots corky #948b6d; coir pole fibres.",
    layout: "A potted specimen on its pole; groves 1.2 m apart.",
  },
};

export const BAOBAB: SpeciesMorphologyProfile = {
  id: "adansonia-digitata", name: "African baobab", scientificName: "Adansonia digitata", family: "Malvaceae", habit: "tree",
  summary: "A massive smooth grey trunk (cone, cylinder, waisted, bell or bottle) that divides at about 0.4 of the height into crooked, fast-tapering limbs; palmate leaves of five to seven leaflets at the ends of the shoots.",
  sources: [
    { id: "wiki-baobab", title: "Wikipedia: Adansonia digitata", url: "https://en.wikipedia.org/wiki/Adansonia_digitata", kind: "flora", rights: "cited",
      observed: ["Height 5–25 m; trunk up to 10–14 m across, fluted or cylindrical, often with a flared base.", "Bark grey, smooth, up to 8 cm thick.", "Leaves palmate with five to seven leaflets (up to nine); seedlings have simple leaves; leafless about eight months a year."] },
    { id: "malawi-trunks", title: "Baobab population survey, Mzuzu University repository", url: "https://repository.mzuni.ac.mw/bitstreams/40163307-62e4-4994-a2a1-603fdbb2dded/download", kind: "paper", rights: "cited",
      observed: ["Trunk forms: cone-shaped 56%, cylindrical 21%, concave 17%, bell-shaped 7% (as summarised by our search; full text not read)."] },
    { id: "elephant-photo", title: "Baobab and elephant, Tanzania", url: commonsPhoto("Baobab_and_elephant,_Tanzania.jpg"), kind: "photo", rights: "CC BY-SA", creator: "Ferdinand Reus",
      observed: ["First limbs at 0.41 of the height; trunk diameter 0.31–0.34 of the height; crown width 1.43 × height.", "Limbs leave at 40–75° from vertical, taper fast and turn crooked; fine twigs make a lace at the rim.", "Trunk ladder p50 #443a31, p75 #7c6b59; sparse foliage p50 #828769 (mixed with sky)."] },
    { id: "baobabs-photo", title: "Adansonia digitata – baobabs (leafless)", url: commonsPhoto("Adansonia_digitata_-_baobabs.JPG"), kind: "photo", rights: "CC BY-SA", creator: "Roburq",
      observed: ["Trunk narrows upward (cone form), diameter about 0.22 of the height.", "Three to five great limbs at 0.4–0.5 of the height, arching out then up."] },
    { id: "bark-photo", title: "Adansonia digitata bark, Selous Game Reserve", url: commonsPhoto("Adansonia_digitata_Bark_Selous_Game_Reserve.jpg"), kind: "photo", rights: "CC0", creator: "Awinch1001",
      observed: ["Smooth grey bark (p50 #6a6667) with horizontal wrinkle bands and long vertical folds.", "Limbs swell into thick collars where they join the trunk."] },
  ],
  size: { height: range(5, 14, 25, "reported", "wiki-baobab") },
  measured: {
    forkHeight: range(0.38, 0.41, 0.46, "measured", "elephant-photo"),
    trunkDiameter: range(0.22, 0.28, 0.34, "measured", "elephant-photo"),
    crownWidth: range(1.2, 1.43, 1.6, "measured", "elephant-photo"),
  },
  root: "trunk",
  axes: [
    { id: "trunk", kind: "trunk", surface: "bark", length: { of: "height", ratio: 0.42, spread: 0.08 }, radius: { of: "height", ratio: 0.14, tip: 1 },
      profileVariants: [
        { label: "cone", weight: 56, stops: [[0, 1], [0.45, 0.82], [1, 0.62]] },
        { label: "cylinder", weight: 21, stops: [[0, 1], [0.5, 0.95], [1, 0.9]] },
        { label: "concave", weight: 17, stops: [[0, 1], [0.4, 0.74], [0.8, 0.72], [1, 0.82]] },
        { label: "bell", weight: 7, stops: [[0, 1.15], [0.2, 0.92], [0.6, 0.8], [1, 0.74]] },
        { label: "bottle", weight: 10, stops: [[0, 0.9], [0.35, 1], [0.72, 0.9], [1, 0.66]] },
      ],
      flare: { height: 0.9, amount: 0.22, lobes: 7 }, nodes: 12, wander: 6, children: [{ rule: "limb", from: 0.8, to: 1, count: [4, 7] }] },
    { id: "limb", kind: "limb", surface: "bark", length: { of: "height", ratio: 0.58, spread: 0.2 }, radius: { of: "parent", ratio: 0.42, tip: 0.22 }, swell: 0.45, nodes: 10, angle: [62, 42], gravity: 0.8, upturn: 16, wander: 22,
      children: [{ rule: "branch", from: 0.3, to: 1, count: [3, 6] }] },
    { id: "branch", kind: "branch", surface: "bark", length: { of: "parent", ratio: 0.6, spread: 0.3 }, radius: { of: "parent", ratio: 0.45, tip: 0.25 }, swell: 0.25, nodes: 8, angle: [55, 35], gravity: 1.5, upturn: 10, wander: 28,
      children: [{ rule: "twig", from: 0.25, to: 1, count: [4, 7] }] },
    { id: "twig", kind: "twig", surface: "bark", length: { of: "parent", ratio: 0.45, spread: 0.35 }, radius: { of: "parent", ratio: 0.5, tip: 0.35 }, nodes: 5, angle: [55, 35], gravity: 2, upturn: 8, wander: 34,
      children: [{ rule: "spray", from: 0.3, to: 1, count: [3, 5] }] },
    { id: "spray", kind: "twig", surface: "bark", length: { of: "parent", ratio: 0.5, spread: 0.35 }, radius: { of: "parent", ratio: 0.55, tip: 0.5 }, nodes: 4, angle: [50, 30], gravity: 2, wander: 30 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.05, 0.1, 0.15, "estimated"), width: 0.38, widestAt: 0.62, baseShape: 1.1, apexShape: 0.75,
      veins: { style: "pinnate", laterals: 9, angle: 55, midrib: 0.06 }, fold: 6, droop: 0.8, droopPitch: 10,
      stalk: { length: 0.09, radius: 0.0016, surface: "petiole" }, leaflets: { count: range(5, 5, 7, "reported", "wiki-baobab"), spread: 150 } },
  },
  placements: [
    { organ: "leaf", on: "spray", place: "tip", count: [3, 6], angle: [35, 70] },
    { organ: "leaf", on: "spray", place: "along", from: 0.3, to: 1, spacing: 0.12, angle: [55, 45] },
    { organ: "leaf", on: "twig", place: "tip", count: [2, 4], angle: [35, 70] },
  ],
  surfaces: {
    bark: { colour: [{ at: 0, hex: "#6d6257" }, { at: 0.35, hex: "#766a5e" }, { at: 0.8, hex: "#675e55" }, { at: 1, hex: "#5d554d" }], roughness: 0.82, texture: "bark-folds", tile: 1.2, relief: 0.05 },
    leaf: { colour: [{ at: 0, hex: "#55692f" }, { at: 1, hex: "#5f7535" }], back: "#8a9a6e", roughness: 0.5, clearcoat: 0.25, texture: "leaf-veins" },
    petiole: { colour: [{ at: 0, hex: "#5f6a3a" }, { at: 1, hex: "#6b7a3a" }], roughness: 0.6, texture: "stem" },
  },
  layout: { spacing: 18, clumpRadius: 14 },
  seedling: 0.05,
  blueprint: {
    phyllotaxy: "Palmate leaves of 5–7 leaflets (simple on seedlings) fanned over 150° on a 9 cm petiole, three to six crowded at the ends of short shoots; leaflets obovate, 10 cm, 9 laterals at 55°.",
    skeleton: "Trunk to the first limbs at 0.42 H, foot radius 0.14 H, its form drawn per tree: cone 56%, cylinder 21%, concave 17%, bell 7% (survey) and an estimated 10% bottle. Root flare with seven buttress lobes. Four to seven limbs (0.58 H) from the top fifth leave at 42–62° from the trunk, swell 45% into the trunk, taper to 22%, turn up 16° and wander 22°; three more orders of crooked branches (radius ratios 0.45–0.55) end in sprays carrying the leaves.",
    surface: "Smooth grey-pink bark (#6d6257–#766a5e: the photo ladders, p75 #7c6b59 sunlit and p50 #6a6667 overcast, lowered toward an albedo) with long vertical folds and broken horizontal wrinkle rings from solid noise; roughness 0.82; limbs swollen at the collar.",
    layout: "Lone trees or loose groves 18 m apart, clumps of 14 m radius.",
  },
};

export const DRAGON_TREE: SpeciesMorphologyProfile = {
  id: "dracaena-cinnabari", name: "Socotra dragon tree", scientificName: "Dracaena cinnabari", family: "Asparagaceae", habit: "tree",
  summary: "A stout trunk that forks dichotomously, again and again, into an upturned umbrella whose branch tips carry dense rosettes of stiff sword leaves.",
  sources: [
    { id: "wiki-dracaena", title: "Wikipedia: Dracaena cinnabari", url: "https://en.wikipedia.org/wiki/Dracaena_cinnabari", kind: "flora", rights: "cited",
      observed: ["Up to 9 m tall, crown up to 12 m across, DBH up to 1.5 m.", "Leaves up to 60 cm long and 3 cm wide, only at the tips of the youngest branches, in dense rosettes.", "Branching is dichotomous, after flowering or damage stops the terminal bud."] },
    { id: "adolt-2012", title: "Adolt, Habrová & Mádera 2012, Crown age estimation of Dracaena cinnabari, Trees 26", url: "https://link.springer.com/doi/10.1007/s00468-012-0704-9", kind: "paper", rights: "cited",
      observed: ["Crown age is modelled from the number of branching orders; flowering intervals from 28 years early in life to 6.5–10 years later."] },
    { id: "socotra-photo", title: "Dragonblood tree in Socotra", url: commonsPhoto("Dragonblood_tree_in_Socotra_2.jpg"), kind: "photo", rights: "CC BY", creator: "Alex38",
      observed: ["Sky-mask silhouette: crown width 1.69 × height; first fork at 0.43 H; crown rim at 0.48 H; trunk diameter 0.15–0.19 H.", "The underside is a lattice of short, thick, upturned segments; the top is a smooth dome of rosettes.", "Leaves p50 #424811, p75 #606724; underside branches p50 #2e1509, p75 #4c2614; trunk p75 #796254."] },
    { id: "group-photo", title: "Dragon's Blood Trees, Socotra Island", url: commonsPhoto("Dragon's_Blood_Trees,_Socotra_Island_(12455632274)_(cropped).jpg"), kind: "photo", rights: "CC BY-SA", creator: "Rod Waddington",
      observed: ["Young trees carry small domes on thin trunks; forks are two- or three-way; trunks lean a little."] },
  ],
  size: { height: range(3, 7, 9, "reported", "wiki-dracaena"), spread: range(4, 10, 12, "reported", "wiki-dracaena") },
  measured: {
    crownWidth: range(1.33, 1.69, 1.8, "measured", "socotra-photo"),
    forkHeight: range(0.38, 0.43, 0.5, "measured", "socotra-photo"),
    trunkDiameter: range(0.15, 0.17, 0.19, "measured", "socotra-photo"),
  },
  root: "trunk",
  axes: [
    { id: "trunk", kind: "trunk", surface: "bark", length: { of: "height", ratio: 0.43, spread: 0.1 }, radius: { of: "height", ratio: 0.085, tip: 0.8 }, profile: [[0, 1.05], [0.15, 0.95], [1, 0.9]],
      flare: { height: 0.8, amount: 0.25, lobes: 5 }, nodes: 10, wander: 8,
      fork: { rule: "fork-branch", orders: 8, ways: [0.62, 0.33, 0.05], crown: { centre: 0.52, radius: 0.82, depth: 0.4, rim: 4 }, leonardo: 2.1, bow: 0.12 } },
    { id: "fork-branch", kind: "branch", surface: "bark", length: { of: "parent", ratio: 1 }, radius: { of: "parent", ratio: 1 }, nodes: 5 },
  ],
  organs: {
    sword: { kind: "blade", surface: "leaf", length: range(0.3, 0.5, 0.6, "reported", "wiki-dracaena"), width: 0.05, widestAt: 0.25, baseShape: 0.35, apexShape: 1.25,
      veins: { style: "parallel", laterals: 9, angle: 4, midrib: 0.08 }, fold: 22, droop: 0.9, droopPitch: 50, twist: 6 },
  },
  placements: [
    { organ: "sword", on: "fork-branch", place: "rosette", count: [28, 40], angle: [8, 78], scale: [0.55, 1], core: 0.025, rise: 0.05 },
    { organ: "sword", on: "trunk", place: "rosette", count: [28, 40], angle: [8, 78], scale: [0.55, 1], core: 0.025, rise: 0.05 },
  ],
  surfaces: {
    bark: { colour: [{ at: 0, hex: "#665a4e" }, { at: 0.35, hex: "#5e5044" }, { at: 1, hex: "#5a3e2e" }], roughness: 0.78, texture: "bark-ringed", tile: 0.6, relief: 0.035 },
    leaf: { colour: [{ at: 0, hex: "#6e7240" }, { at: 0.3, hex: "#5c6427" }, { at: 1, hex: "#606724" }], back: "#7a845a", roughness: 0.5, clearcoat: 0.2, texture: "parallel-veins" },
  },
  layout: { spacing: 9, clumpRadius: 10 },
  seedling: 0.05,
  blueprint: {
    phyllotaxy: "Rosettes of 28–40 sword leaves on every branch tip, golden-angle spiral (137.5°); inner leaves upright (8° from the shoot), outer ones spread to 78°, inner ones 55% as long. Leaves 50 cm (up to 60), 5% as wide, keeled (fold 22°).",
    skeleton: "Trunk to the first fork at 0.43 H, diameter 0.17 H. Eight fork orders on a mature tree (2-way 62%, 3-way 33%, 4-way 5%). Built top-down: branch-tip targets are spread over a dome (centre 0.52 H, radius 0.82 H, depth 0.4 H, rim at 4°) by the golden angle, then split at each fork along the group's widest direction; each segment heads for its group and bows up 12%. Radii follow Leonardo's rule with Δ 2.1. Young trees are single candles with one rosette; forks appear from growth stage 0.22.",
    surface: "Grey-brown trunk (#665a4e: the photo's sunlit p75 #796254 lowered toward an albedo) with faint leaf-scar rings; rust-brown upper branches (#5a3e2e, toward the shaded underside ladder); olive leaves (#606724 = p75).",
    layout: "Open woodland on rock, trees 9 m apart in clumps of 10 m radius.",
  },
};

export const WEEPING_WILLOW: SpeciesMorphologyProfile = {
  id: "salix-babylonica", name: "Weeping willow", scientificName: "Salix babylonica", family: "Salicaceae", habit: "tree",
  summary: "A short fissured trunk, three to five ascending limbs that arch over, and curtains of branchlets hanging almost to the ground, lined with narrow lanceolate leaves.",
  sources: [
    { id: "osu-willow", title: "Oregon State University Landscape Plants: Salix babylonica", url: "https://landscapeplants.oregonstate.edu/plants/salix-babylonica", kind: "database", rights: "cited",
      observed: ["Leaves usually 7–15 cm long and 5–20 mm wide.", "Many cultivated weeping willows are hybrids (S. × sepulcralis, S. × pendulina)."] },
    { id: "vicflora-willow", title: "VicFlora: Salix babylonica", url: "https://vicflora.rbg.vic.gov.au/flora/taxon/1142574f-4f29-4f7b-9021-cbd4d1ed6009", kind: "flora", rights: "cited",
      observed: ["Deciduous broad-crowned tree to 10 m or more with long pendulous branchlets.", "Leaves 5–18 cm long, 1–2.5 cm wide; petiole 5–10 mm."] },
    { id: "braga-photo", title: "Salix babylonica in Braga", url: commonsPhoto("Salix_babylonica_in_Braga.jpg"), kind: "photo", rights: "CC BY-SA", creator: "Joseolgon",
      observed: ["The curtain ends 0.02–0.12 of the height above the ground (median 0.05).", "Crown width 0.57 × height on this columnar tree.", "Strand ladder p25 #415011, p50 #82923c, p75 #bcc974 (leaves glow when backlit)."] },
    { id: "inside-photo", title: "Inside the weeping willow tree", url: commonsPhoto("Inside_the_weeping_willow_tree.jpg"), kind: "photo", rights: "CC BY-SA", creator: "Secretlondon",
      observed: ["The trunk forks low (about 0.2 of the height) into three to five ascending limbs with deeply fissured bark (p50 #372818, p75 #51412c).", "Thin yellow-brown branchlets hang straight down from arching branches."] },
  ],
  size: { height: range(8, 12, 20, "estimated", "vicflora-willow") },
  measured: {
    forkHeight: range(0.15, 0.2, 0.3, "measured", "inside-photo"),
    curtainGap: range(0.02, 0.05, 0.12, "measured", "braga-photo"),
    crownWidth: range(0.57, 1, 1.4, "estimated", "braga-photo"),
  },
  root: "trunk",
  axes: [
    { id: "trunk", kind: "trunk", surface: "bark", length: { of: "height", ratio: 0.2, spread: 0.15 }, radius: { of: "height", ratio: 0.04, tip: 0.75 }, flare: { height: 1, amount: 0.18, lobes: 6 }, nodes: 8, wander: 10,
      children: [{ rule: "limb", from: 0.7, to: 1, count: [4, 6] }] },
    { id: "limb", kind: "limb", surface: "bark", length: { of: "height", ratio: 0.64, spread: 0.12 }, radius: { of: "parent", ratio: 0.42, tip: 0.2 }, swell: 0.3, nodes: 12, angle: [34, 16], gravity: 2.2, wander: 14,
      children: [{ rule: "branch", from: 0.25, to: 1, perMetre: 2.4, envelope: "inverse" }, { rule: "strand", from: 0.3, to: 1, perMetre: 9 }] },
    { id: "branch", kind: "branch", surface: "bark", length: { of: "parent", ratio: 0.35, spread: 0.3 }, radius: { of: "parent", ratio: 0.45, tip: 0.3 }, nodes: 9, angle: [60, 35], gravity: 4, wander: 18,
      children: [{ rule: "strand", from: 0.05, to: 1, perMetre: 12 }] },
    { id: "strand", kind: "strand", surface: "twig", length: { of: "drop", ratio: 0.9, spread: 0.12 }, radius: { of: "parent", ratio: 0.35, tip: 0.5 }, nodes: 10, angle: [35, 55], gravity: 400, wander: 5,
      children: [{ rule: "twiglet", from: 0.02, to: 0.5, count: [3, 5] }] },
    { id: "twiglet", kind: "strand", surface: "twig", length: { of: "parent", ratio: 0.45, spread: 0.4 }, radius: { of: "parent", ratio: 0.6, tip: 0.5 }, nodes: 8, angle: [25, 35], gravity: 300, wander: 6 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.05, 0.1, 0.16, "reported", "vicflora-willow"), width: 0.13, widestAt: 0.35, baseShape: 1, apexShape: 1.6, margin: { kind: "serrate", count: 28, depth: 0.06 },
      veins: { style: "pinnate", laterals: 14, angle: 55, midrib: 0.06 }, fold: 10, droop: 1.5, droopPitch: -60, twist: 12 },
  },
  placements: [
    { organ: "leaf", on: "strand", place: "along", from: 0.04, to: 1, spacing: 0.035, angle: [40, 30], scale: [1.3, 1.3] },
    { organ: "leaf", on: "twiglet", place: "along", from: 0.05, to: 1, spacing: 0.035, angle: [40, 30], scale: [1.3, 1.3] },
    { organ: "leaf", on: "branch", place: "along", from: 0.2, to: 1, spacing: 0.045, angle: [45, 45] },
  ],
  surfaces: {
    bark: { colour: [{ at: 0, hex: "#4d3d2c" }, { at: 0.5, hex: "#5a4733" }, { at: 1, hex: "#7a6a3c" }], roughness: 0.9, texture: "bark-fissured", tile: 0.8, relief: 0.09 },
    twig: { colour: [{ at: 0, hex: "#7a6a3c" }, { at: 1, hex: "#9a8a4a" }], roughness: 0.6, texture: "stem", tile: 0.3 },
    leaf: { colour: [{ at: 0, hex: "#6f8a33" }, { at: 1, hex: "#7f9a3e" }], back: "#b4c48c", roughness: 0.55, clearcoat: 0.1, texture: "leaf-veins" },
  },
  layout: { spacing: 12, clumpRadius: 8 },
  seedling: 0.06,
  blueprint: {
    phyllotaxy: "Alternate leaves in a golden-angle spiral (137.5°) every 3.5 cm along hanging strands and their twiglets, 30–40° from the strand; blades lanceolate (13% as wide as long), acuminate, finely serrate, 14 laterals at 55°. Strand leaves are drawn 1.3 times life size so the curtain reads at tree scale (a stated stylization).",
    skeleton: "Trunk forks at 0.2 H into 4–6 limbs (radius 0.42 of the trunk, by Leonardo's rule) rising 16–34° from vertical that arch out (elastica G 2.2); branches (2.4 per metre, longer near the top) leave at 35–60° and arch down (G 4). Strands hang from branches (12 per metre) and the upper limbs (9 per metre) as heavy elasticas with G 400: they bend once, then fall straight; each carries 3–5 twiglets. A strand's length is 90% of its height above the ground, so the curtain ends near 0.05 H. A catenary needs two supports; a branch has one, so the elastica is used.",
    surface: "Deeply fissured dark bark (#51412c, p75) from ridged solid noise, yellow-brown branchlets, leaves #6f8a33 with a glaucous underside (#b4c48c).",
    layout: "Waterside trees 12 m apart, clumps of 8 m radius.",
  },
};

export const SUNFLOWER: SpeciesMorphologyProfile = {
  id: "helianthus-annuus", name: "Common sunflower", scientificName: "Helianthus annuus", family: "Asteraceae", habit: "herb",
  summary: "An erect hairy stem with large, coarsely toothed, heart-shaped leaves in a spiral, ending in a nodding head: disc florets in Vogel's golden-angle spiral, ringed by yellow rays and green bracts.",
  sources: [
    { id: "wiki-sunflower", title: "Wikipedia: Common sunflower", url: "https://en.wikipedia.org/wiki/Common_sunflower", kind: "flora", rights: "cited",
      observed: ["Typical height 3 m; erect, rough-hairy stem.", "Leaves broad, coarsely toothed, rough, mostly alternate; the lowest are heart-shaped and largest.", "Head 7.5–12.5 cm wide (wild form); florets about 137.5° apart; usually 34 and 55 spirals, 89 and 144 on very large heads."] },
    { id: "swinton-2016", title: "Swinton & Ochu 2016, Novel Fibonacci and non-Fibonacci structure in the sunflower, Royal Society Open Science", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4892450", kind: "paper", rights: "cited",
      observed: ["565 of 768 parastichy counts were Fibonacci numbers."] },
    { id: "vogel-1979", title: "Prusinkiewicz & Lindenmayer, The Algorithmic Beauty of Plants, ch. 4 (Vogel's model)", url: "https://www.algorithmicbotany.org/papers/abop/abop-ch4.pdf", kind: "paper", rights: "cited",
      observed: ["Floret n at angle n × 137.5° and radius c√n."] },
    { id: "head-photo", title: "Close-up of a sunflower head, Trimingham", url: commonsPhoto("-2020-09-09_Close-up_of_a_sunflower_head,_(Helianthus_annuus),_Trimingham.JPG"), kind: "photo", rights: "CC BY-SA", creator: "Kolforn",
      observed: ["Disc ladder by radius: centre p50 #271a0b, middle #261706, outer buds p75 #56360a, open-floret ring p75 #a65b0d with pollen p90 #d49f21.", "Rays p50 #e68702, p75 #fcd80c, in two overlapping tiers, a little twisted."] },
  ],
  size: { height: range(1.5, 3, 4, "reported", "wiki-sunflower") },
  measured: { headDiameter: range(0.075, 0.1, 0.125, "reported", "wiki-sunflower") },
  root: "stem",
  axes: [
    { id: "stem", kind: "stem", surface: "stem", length: { of: "height", ratio: 0.9 }, radius: { of: "height", ratio: 0.009, tip: 0.55 }, nodes: 16, wander: 4,
      children: [{ rule: "peduncle", from: 1, to: 1, count: [1, 1] }] },
    { id: "peduncle", kind: "peduncle", surface: "stem", length: { of: "height", ratio: 0.1 }, radius: { of: "parent", ratio: 0.95, tip: 0.85 }, nodes: 8, angle: [8, 8], gravity: 0.5, tipLoad: 9 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.15, 0.35, 0.45, "estimated"), width: 0.9, widestAt: 0.35, baseShape: 0.45, apexShape: 1.2, lobe: 0.06, sinus: 0.02, margin: { kind: "serrate", count: 22, depth: 0.07 },
      veins: { style: "pinnate", laterals: 7, angle: 50, baseAngle: 70, midrib: 0.04 }, fold: 6, cup: -0.05, droop: 2.5, droopPitch: 15, stalk: { length: 0.12, radius: 0.004, surface: "stem" } },
    head: { kind: "capitulum", diameter: range(0.12, 0.22, 0.3, "estimated", "wiki-sunflower"), disc: { divergence: GOLDEN_ANGLE, count: 1400, surface: "disc" },
      rays: { count: range(21, 34, 55, "estimated"), length: 0.38, width: 0.28, surface: "ray" }, bracts: { count: 34, length: 0.16, surface: "bract" }, receptacle: "receptacle" },
  },
  placements: [
    { organ: "leaf", on: "stem", place: "along", from: 0.05, to: 0.94, spacing: 0.16, angle: [62, 42], scale: [1, 0.5] },
    { organ: "head", on: "peduncle", place: "tip", angle: [0, 0] },
  ],
  surfaces: {
    stem: { colour: [{ at: 0, hex: "#5d7a35" }, { at: 1, hex: "#6b8a3d" }], roughness: 0.75, sheen: 0.5, sheenColour: "#d8e0c0", texture: "stem", tile: 0.3 },
    leaf: { colour: [{ at: 0, hex: "#4a6a2a" }, { at: 1, hex: "#55782f" }], back: "#8aa070", roughness: 0.68, sheen: 0.35, sheenColour: "#c8d4b0", texture: "leaf-veins" },
    disc: { colour: [{ at: 0, hex: "#2a1c0c" }, { at: 0.5, hex: "#261706" }, { at: 0.78, hex: "#56360a" }, { at: 0.88, hex: "#a65b0d" }, { at: 1, hex: "#d49f21" }], roughness: 0.8, texture: "none" },
    ray: { colour: [{ at: 0, hex: "#e68702" }, { at: 0.5, hex: "#f2b40a" }, { at: 1, hex: "#fcd80c" }], roughness: 0.55, sheen: 0.3, sheenColour: "#fff2a0", texture: "petal" },
    bract: { colour: [{ at: 0, hex: "#4f6e2c" }, { at: 1, hex: "#5d7d34" }], roughness: 0.7, texture: "parallel-veins" },
    receptacle: { colour: [{ at: 0, hex: "#5f7a34" }, { at: 1, hex: "#6a8638" }], roughness: 0.7, texture: "none" },
  },
  layout: { spacing: 0.45, rowPitch: 0.76 },
  seedling: 0.04,
  blueprint: {
    phyllotaxy: "Leaves (35 cm, estimated) in a golden-angle spiral every 16 cm, 42–62° from the stem, shrinking upward to half (the lowest are largest). Head (22 cm, estimated): florets at θ = n × 137.5°, r = c√n (Vogel), 1400 on a 22 cm head, scaled with area, so 34/55 spirals appear; 21–55 rays in two tiers; 34 bracts in a spiral behind.",
    skeleton: "Single stem to 0.9 H, radius 0.009 H; the peduncle (0.1 H) carries a head nine times its own weight, so the heavy elastica nods it over. The head opens from growth stage 0.55: rays fold forward over the disc in bud.",
    surface: "Disc colour by radius from the photo ladder: near-black centre (#2a1c0c), ochre buds (#56360a), orange open ring (#a65b0d) with pollen (#d49f21); rays #e68702 → #fcd80c; hairy stem and leaves with sheen.",
    layout: "Rows 76 cm apart, plants 45 cm apart (estimated).",
  },
};

export const MAIZE: SpeciesMorphologyProfile = {
  id: "zea-mays", name: "Maize", scientificName: "Zea mays", family: "Poaceae", habit: "graminoid",
  summary: "A single jointed culm with two-ranked, arching, wavy-edged blades, prop roots at the foot, an ear halfway up and a branched tassel on top: the row crop.",
  sources: [
    { id: "wiki-maize", title: "Wikipedia: Maize", url: "https://en.wikipedia.org/wiki/Maize", kind: "flora", rights: "cited",
      observed: ["Height 1.2–4 m, a single stem.", "Long narrow leaves alternately on opposite sides of the stalk.", "Tassel of male flowers at the top; the ear some way down the stem."] },
    { id: "grainsa-2018", title: "Grain SA, SA Grain April 2018", url: "https://www.grainsa.co.za/sagrain/2018/april/files/assets/basic-html/page-23.html", kind: "database", rights: "cited",
      observed: ["Norm of 79 000 plants per ha in 76 cm rows (16.7 cm between plants)."] },
    { id: "farmtrader", title: "Farm Trader: planting rates key to higher maize yields", url: "https://www.farmtrader.co.nz/planting-rates-key-to-higher-maize-yields/", kind: "database", rights: "cited",
      observed: ["Maximum about 93 000 plants per ha at 76 cm rows (14.1 cm between plants)."] },
    { id: "rows-photo", title: "Corn Zea mays field rows", url: commonsPhoto("Corn_Zea_mays_Field_Rows_2000px.jpg"), kind: "photo", rights: "GFDL", creator: "Derek Ramsey",
      observed: ["Young maize in straight rows on tilled soil (p50 #b48e50); seedlings p50 #7b8642, p75 #829754."] },
  ],
  size: { height: range(1.2, 2.4, 4, "reported", "wiki-maize") },
  measured: { rowPitch: range(0.38, 0.76, 0.91, "reported", "grainsa-2018"), plantSpacing: range(0.141, 0.155, 0.167, "reported", "grainsa-2018") },
  root: "culm",
  axes: [
    { id: "culm", kind: "culm", surface: "culm", length: { of: "height", ratio: 0.9 }, radius: { of: "height", ratio: 0.0085, tip: 0.45 }, profile: [[0, 1.1], [0.1, 1], [1, 0.9]], nodes: 18, wander: 3, nodeRings: { spacing: 0.16, swell: 0.07 },
      children: [{ rule: "tassel", from: 0.985, to: 1, count: [10, 16] }, { rule: "prop-root", from: 0, to: 0.035, count: [8, 14], whorl: 4 }] },
    { id: "tassel", kind: "tassel", surface: "tassel", length: { of: "height", ratio: 0.11, spread: 0.3 }, radius: { of: "parent", ratio: 0.18, tip: 0.4 }, nodes: 6, angle: [40, 12], gravity: 3, wander: 8, onset: 0.75 },
    { id: "prop-root", kind: "prop-root", surface: "root", length: { of: "height", ratio: 0.06, spread: 0.3 }, radius: { of: "parent", ratio: 0.22, tip: 0.6 }, nodes: 6, angle: [125, 115], wander: 8, onset: 0.35 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.6, 0.9, 1.1, "estimated"), width: 0.1, widestAt: 0.45, baseShape: 0.6, apexShape: 1.3,
      veins: { style: "parallel", laterals: 14, angle: 3, midrib: 0.07 }, fold: 14, ruffle: 0.09, twist: 40, droop: 9, droopPitch: 50 },
    ear: { kind: "ear", length: range(0.15, 0.2, 0.3, "estimated"), width: 0.28, husk: "husk", silk: "silk", silkLength: 0.35 },
    spikelet: { kind: "bud", surface: "tassel", length: range(0.006, 0.008, 0.011, "estimated"), width: 0.32 },
  },
  placements: [
    { organ: "leaf", on: "culm", place: "along", from: 0.08, to: 0.86, spacing: 0.16, divergence: 180, angle: [38, 22], scale: [0.85, 0.75] },
    { organ: "ear", on: "culm", place: "along", from: 0.42, to: 0.48, count: [1, 1], angle: [28, 28], onset: 0.7 },
    { organ: "spikelet", on: "tassel", place: "along", from: 0.1, to: 1, spacing: 0.012, perNode: 2, divergence: 180, angle: [25, 25] },
  ],
  surfaces: {
    culm: { colour: [{ at: 0, hex: "#6c8a3c" }, { at: 1, hex: "#7b9a45" }], roughness: 0.5, clearcoat: 0.15, texture: "stem", tile: 0.3 },
    leaf: { colour: [{ at: 0, hex: "#5f7a34" }, { at: 1, hex: "#6c8a3a" }], back: "#8eaa6c", roughness: 0.5, texture: "parallel-veins" },
    tassel: { colour: [{ at: 0, hex: "#b9a25a" }, { at: 1, hex: "#d8c070" }], roughness: 0.8, texture: "none" },
    root: { colour: [{ at: 0, hex: "#8a7c58" }, { at: 1, hex: "#a89a6a" }], roughness: 0.85, texture: "root" },
    husk: { colour: [{ at: 0, hex: "#6f8f3e" }, { at: 1, hex: "#93ad5a" }], roughness: 0.6, texture: "parallel-veins" },
    silk: { colour: [{ at: 0, hex: "#d9c27a" }, { at: 1, hex: "#8a5a2c" }], roughness: 0.5, sheen: 0.4, sheenColour: "#f0e0a0", texture: "none" },
  },
  layout: { spacing: 0.155, rowPitch: 0.76, density: 8.5 },
  seedling: 0.05,
  blueprint: {
    phyllotaxy: "Two-ranked leaves (divergence 180°) one per node every 16 cm; blades 90 cm (estimated), 10% as wide, leave the culm at 22–38° and arch over (elastica G 9 at a 50° base pitch), channelled (fold 14°), wavy-edged (ruffle 9%) and twisted 40°. Ear at 0.42–0.48 of the culm from stage 0.7; spikelets in pairs every 1.2 cm along 10–16 tassel branches.",
    skeleton: "Culm to 0.9 H, radius 0.0085 H, node rings every 16 cm. Tassel branches from the top 1.5% at 12–40° (G 3). Prop roots in whorls of four from the lowest 3.5%, 115–125° from the culm into the soil.",
    surface: "Leaf and culm greens from the seedling ladder (#7b8642 p50) shifted toward mature-crop green; pale midrib; yellow anthers; silk from straw to brown.",
    layout: "Rows 76 cm apart, plants 15.5 cm apart in the row (79 000–93 000 plants per ha reported); stagger and jitter for planter error, about 6% gaps × jitter.",
  },
};

export const ECHEVERIA: SpeciesMorphologyProfile = {
  id: "echeveria", name: "Echeveria rosette", scientificName: "Echeveria sp. (sizes from E. elegans)", family: "Crassulaceae", habit: "rosette",
  summary: "A stemless succulent rosette of thick, keeled, obovate leaves in a golden-angle spiral, with offsets round the foot.",
  sources: [
    { id: "wiki-echeveria", title: "Wikipedia: Echeveria elegans", url: "https://en.wikipedia.org/wiki/Echeveria_elegans", kind: "flora", rights: "cited",
      observed: ["Height 5–10 cm; clumps to 50 cm wide from many offsets.", "Fleshy, pale green-blue leaves in compact rosettes."] },
    { id: "rosette-photo", title: "Echeveria rosette detail 01", url: commonsPhoto("Echeveria_rosette_detail_01.jpg"), kind: "photo", rights: "CC BY-SA", creator: "Anne Jea.",
      observed: ["Obovate leaves with a short sharp tip and a pale translucent rim; 5 and 8 parastichies visible from above.", "Inner ladder p50 #85b050, outer p50 #a1c072, p75 #bcd68d (this specimen is greener than E. elegans)."] },
    { id: "vogel-1979", title: "Prusinkiewicz & Lindenmayer, The Algorithmic Beauty of Plants, ch. 4", url: "https://www.algorithmicbotany.org/papers/abop/abop-ch4.pdf", kind: "paper", rights: "cited", observed: ["Spiral phyllotaxis at the golden angle gives Fibonacci parastichies."] },
  ],
  size: { height: range(0.05, 0.07, 0.1, "reported", "wiki-echeveria") },
  root: "stem",
  axes: [
    { id: "stem", kind: "stem", surface: "stem", length: { of: "height", ratio: 0.3 }, radius: { of: "height", ratio: 0.09, tip: 0.9 }, nodes: 4, wander: 6,
      children: [{ rule: "offset", from: 0.05, to: 0.3, count: [1, 3] }] },
    { id: "offset", kind: "stem", surface: "stem", length: { of: "height", ratio: 0.6, spread: 0.25 }, radius: { of: "parent", ratio: 0.25, tip: 0.8 }, nodes: 6, angle: [92, 98], gravity: 2, upturn: 80, onset: 0.55 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.025, 0.04, 0.05, "estimated"), width: 0.52, widestAt: 0.68, baseShape: 1.1, apexShape: 0.7, mucro: 0.06,
      veins: { style: "parallel", laterals: 5, angle: 4, midrib: 0.03 }, thickness: 0.006, keel: 0.6, cup: 0.12, droopPitch: 30 },
  },
  placements: [
    { organ: "leaf", on: "stem", place: "rosette", count: [40, 55], angle: [8, 72], scale: [0.3, 1], core: 0.011, rise: 0.014 },
    { organ: "leaf", on: "offset", place: "rosette", count: [16, 26], angle: [10, 72], scale: [0.18, 0.5], core: 0.005, rise: 0.007 },
  ],
  surfaces: {
    leaf: { colour: [{ at: 0, hex: "#6f9a42" }, { at: 0.75, hex: "#86a85c" }, { at: 1, hex: "#9cb070" }], back: "#8aa86a", roughness: 0.6, sheen: 0.3, sheenColour: "#eef6e0", texture: "farina" },
    stem: { colour: [{ at: 0, hex: "#6f7a52" }, { at: 1, hex: "#7d8a6a" }], roughness: 0.7, texture: "stem" },
  },
  layout: { spacing: 0.14, clumpRadius: 0.12, density: 40 },
  seedling: 0.2,
  blueprint: {
    phyllotaxy: "40–55 leaves at the golden angle (137.5°) round an 11 mm core, rising 1.4 cm; outer (oldest) leaves spread to 72° from the axis, inner ones stand at 8° and are 30% as long. Leaves obovate (widest at 68%) with a short sharp tip (mucro 6%), about half as wide as long, 6 mm thick with a keel, cupped above.",
    skeleton: "A short stem (0.3 H); from stage 0.55, one to three offsets on short stolons leave at 92–98° and turn up (upturn 80°), each with a small rosette of 16–26 leaves.",
    surface: "Satin green (inner #85b050 → outer #a1c072 sampled) with a pale rim and a bloom (sheen 0.55); E. elegans itself is bluer.",
    layout: "Clumps of 12 cm radius; 40 rosettes per m² as ground cover.",
  },
};

export const HAIRCAP_MOSS: SpeciesMorphologyProfile = {
  id: "polytrichum-commune", name: "Common haircap moss", scientificName: "Polytrichum commune", family: "Polytrichaceae", habit: "cushion",
  summary: "Dense tufts of unbranched shoots; narrow toothed leaves spread like stars when moist; colonies form low cushions.",
  sources: [
    { id: "wiki-polytrichum", title: "Wikipedia: Polytrichum commune", url: "https://en.wikipedia.org/wiki/Polytrichum_commune", kind: "flora", rights: "cited",
      observed: ["Stems most commonly 5–10 cm, often over 30 cm, rarely 70 cm; generally unbranched; loose or dense tufts forming extensive colonies.", "Leaves 6–8 mm (up to 12 mm): an oblong sheath narrowing to a narrowly lanceolate, toothed blade.", "Dark green, brownish with age; sheath golden yellow and shiny; leaves spreading to recurved when moist, erect when dry."] },
  ],
  size: { height: range(0.05, 0.08, 0.3, "reported", "wiki-polytrichum") },
  root: "stem",
  axes: [
    { id: "stem", kind: "stem", surface: "stem", length: { of: "height", ratio: 1 }, radius: { of: "height", ratio: 0.009, tip: 0.7 }, nodes: 6, wander: 10, colony: { radius: 0.22, spacing: 0.0042, dome: 0.55 } },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.006, 0.008, 0.012, "reported", "wiki-polytrichum"), width: 0.16, widestAt: 0.12, baseShape: 0.4, apexShape: 1.4, margin: { kind: "serrate", count: 12, depth: 0.12 },
      veins: { style: "parallel", laterals: 3, angle: 3, midrib: 0.2 }, fold: 30, droop: 1.5, droopPitch: 20 },
  },
  placements: [{ organ: "leaf", on: "stem", place: "along", from: 0.2, to: 1, spacing: 0.002, angle: [80, 35], scale: [1, 0.7] }],
  surfaces: {
    leaf: { colour: [{ at: 0, hex: "#c9a84a" }, { at: 0.15, hex: "#3f6a1c" }, { at: 1, hex: "#4f8226" }], roughness: 0.55, clearcoat: 0.15, texture: "parallel-veins" },
    stem: { colour: [{ at: 0, hex: "#3e2c1a" }, { at: 0.6, hex: "#4f3a20" }, { at: 1, hex: "#4a5a22" }], roughness: 0.8, texture: "stem" },
  },
  layout: { spacing: 0.5, clumpRadius: 0.4, density: 3 },
  seedling: 0.3,
  blueprint: {
    phyllotaxy: "Leaves at the golden angle every 2 mm on the upper 80% of each shoot, spreading 80° at the bottom of that zone and 35° at the tip (a star seen from above); 8 mm long, golden sheath then a toothed, keeled blade.",
    skeleton: "A colony of unbranched shoots 4.2 mm apart (Poisson disc) in a 22 cm disc; shoots at the rim are 55% as tall and lean out, so the tips make a dome; a mound of old stems, shaded green on top, fills the cushion.",
    surface: "Dark green blades (#4f8226, estimated from the description), golden sheaths (#c9a84a), brown stems aging toward the base.",
    layout: "Cushions 50 cm apart, 3 per m² as ground cover.",
  },
};

/** The reference-measured profiles the engine registers by default. */
export const FLORA_PROFILES: readonly SpeciesMorphologyProfile[] = [MONSTERA, BAOBAB, DRAGON_TREE, WEEPING_WILLOW, SUNFLOWER, MAIZE, ECHEVERIA, HAIRCAP_MOSS];
