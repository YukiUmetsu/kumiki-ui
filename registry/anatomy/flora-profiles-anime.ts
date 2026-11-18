/**
 * FLORA2 plants of Japanese scenery, the ones anime backgrounds show most: Somei-yoshino cherry in full bloom with its
 * petals on the ground, Japanese black pine, moso bamboo, hydrangea in the rainy season, red spider lily, wisteria,
 * ginkgo and Japanese maple in autumn colour, and the great camphor tree (study of 2026-11-17, third round).
 *
 * Sizes and colours come from the cited floras and from FLORA1's species records (`plant-species.ts`, which cite their
 * own sources). Bark is a CC0 Poly Haven scan where one exists. Grades follow `flora-profiles.ts`.
 */
import { range } from "./foundation-shapes";
import type { SpeciesMorphologyProfile } from "./flora-profile";
import { polyHavenScan } from "./flora-profile";
import { JAPANESE_MAPLE } from "./flora-profiles-popular";

const wiki = (page: string, observed: readonly string[]) => ({ id: `wiki-${page.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`, title: `Wikipedia: ${page.replace(/_/g, " ").replace(/%C3%97/g, "×")}`, url: `https://en.wikipedia.org/wiki/${page}`, kind: "flora" as const, rights: "cited" as const, observed });
const flora1 = (id: string, observed: readonly string[]) => ({ id: `flora1-${id}`, title: `FLORA1 species record "${id}" (registry/anatomy/plant-species.ts, with its own sources)`, url: "https://github.com/YukiUmetsu/kumiki-ui/blob/main/registry/anatomy/plant-species.ts", kind: "database" as const, rights: "cited" as const, observed });
const barkSource = (id: string, observed: string) => ({ id: `scan-${id}`, title: `Poly Haven bark scan: ${id}`, url: `https://polyhaven.com/a/${id}`, kind: "photo" as const, rights: "CC0" as const, creator: "Poly Haven", observed: [observed] });

export const SOMEI_YOSHINO: SpeciesMorphologyProfile = {
  id: "prunus-yedoensis", name: "Somei-yoshino cherry (sakura)", scientificName: "Prunus × yedoensis 'Somei-yoshino'", family: "Rosaceae", habit: "tree",
  summary: "A low-forking, wide-spreading cherry in full bloom before its leaves: clusters of five or six pale pink flowers with notched petals all along zigzag twigs, dark lenticelled bark, and petals settling on the ground.",
  sources: [
    wiki("Prunus_%C3%97_yedoensis", ["5–12 m tall, occasionally about 15 m.", "Flowers 3–3.5 cm across, five petals, white or pale pink, five or six together, opening before the leaves."]),
    flora1("mountain-cherry", ["Cherry petals are notched (about a fifth of their length); clusters of blossom form clouds.", "Bark ringed with horizontal lenticels."]),
    barkSource("sakura_bark", "Dark grey-brown cherry bark with horizontal lenticel bands; 1.6 m tile."),
  ],
  size: { height: range(5, 9, 15, "reported", "wiki-prunus-yedoensis") },
  measured: { flowerDiameter: range(0.03, 0.032, 0.035, "reported", "wiki-prunus-yedoensis") },
  root: "trunk",
  axes: [
    { id: "trunk", kind: "trunk", surface: "bark", length: { of: "height", ratio: 0.22, spread: 0.15 }, radius: { of: "height", ratio: 0.03, tip: 0.75 }, flare: { height: 1, amount: 0.2, lobes: 6 }, nodes: 8, wander: 12,
      children: [{ rule: "limb", from: 0.7, to: 1, count: [4, 6] }] },
    { id: "limb", kind: "limb", surface: "bark", length: { of: "height", ratio: 0.6, spread: 0.18 }, radius: { of: "parent", ratio: 0.45, tip: 0.22 }, swell: 0.25, nodes: 11, angle: [68, 45], gravity: 1.2, upturn: 6, wander: 18,
      children: [{ rule: "branch", from: 0.15, to: 1, perMetre: 2.2 }] },
    { id: "branch", kind: "branch", surface: "bark", length: { of: "parent", ratio: 0.45, spread: 0.3 }, radius: { of: "parent", ratio: 0.45, tip: 0.3 }, nodes: 8, angle: [60, 40], gravity: 1.8, wander: 22,
      children: [{ rule: "twig", from: 0.15, to: 1, perMetre: 7 }] },
    { id: "twig", kind: "twig", surface: "bark", length: { of: "parent", ratio: 0.35, spread: 0.35 }, radius: { of: "parent", ratio: 0.5, tip: 0.4 }, nodes: 5, angle: [55, 35], gravity: 2.5, wander: 25,
      children: [{ rule: "spur", from: 0.15, to: 1, perMetre: 12 }] },
    { id: "spur", kind: "twig", surface: "bark", length: { of: "parent", ratio: 0.12, spread: 0.4 }, radius: { of: "parent", ratio: 0.6, tip: 0.6 }, nodes: 3, angle: [60, 40], wander: 20 },
  ],
  organs: {
    flower: { kind: "corolla", count: 5, arrangement: "whorled", perWhorl: 5, angle: [68, 76],
      petal: { kind: "blade", surface: "petal", length: range(0.013, 0.015, 0.017, "estimated", "wiki-prunus-yedoensis"), width: 0.85, widestAt: 0.7, baseShape: 1.2, apexShape: 0.35,
        notch: { depth: 0.14, width: 0.16 }, veins: { style: "parallel", laterals: 5, angle: 3, midrib: 0.02 }, cup: 0.15, droopPitch: 0 },
      stamens: { count: 30, length: 0.009, surface: "stamen" } },
    blossom: { kind: "cluster", floret: "flower", shape: "umbel", count: range(4, 5, 6, "reported", "wiki-prunus-yedoensis"), size: range(0.02, 0.025, 0.03, "estimated"), spread: 42, stalk: { radius: 0.0007, surface: "pedicel" } },
    petal: { kind: "blade", surface: "petal", length: range(0.013, 0.015, 0.017, "estimated"), width: 0.85, widestAt: 0.7, baseShape: 1.2, apexShape: 0.35, notch: { depth: 0.14, width: 0.16 },
      veins: { style: "parallel", laterals: 5, angle: 3, midrib: 0.02 }, cup: 0.25, droopPitch: 0 },
  },
  placements: [
    { organ: "blossom", on: "spur", place: "tip", count: [1, 3], angle: [20, 60], scale: [2, 2], onset: 0.55 },
    { organ: "blossom", on: "twig", place: "along", from: 0.15, to: 1, spacing: 0.045, angle: [50, 70], scale: [2, 2], onset: 0.55 },
    { organ: "blossom", on: "branch", place: "along", from: 0.4, to: 1, spacing: 0.08, angle: [50, 70], scale: [2, 2], onset: 0.55 },
    { organ: "petal", on: "trunk", place: "litter", count: [3000, 5000], angle: [0, 0], scale: [1.6, 1.6], onset: 0.55 },
  ],
  surfaces: {
    bark: { colour: [{ at: 0, hex: "#4a4240" }, { at: 0.5, hex: "#544846" }, { at: 1, hex: "#5f4c48" }], roughness: 0.75, texture: "bark-ringed", tile: 0.4, relief: 0.03, scan: polyHavenScan("sakura_bark", 1.6) },
    petal: { colour: [{ at: 0, hex: "#e8a9b9" }, { at: 0.45, hex: "#f4cdd6" }, { at: 1, hex: "#fbe6eb" }], back: "#f0c6d0", roughness: 0.55, sheen: 0.5, sheenColour: "#ffe8f0", texture: "petal" },
    stamen: { colour: [{ at: 0, hex: "#f6f0e0" }, { at: 0.8, hex: "#f2e8c4" }, { at: 1, hex: "#e2b83a" }], roughness: 0.6, texture: "none" },
    pedicel: { colour: [{ at: 0, hex: "#6a7a3a" }, { at: 1, hex: "#8a5a4a" }], roughness: 0.6, texture: "none" },
  },
  layout: { spacing: 8, rowPitch: 12, clumpRadius: 8 },
  seedling: 0.05,
  blueprint: {
    phyllotaxy: "In bloom, before the leaves: umbels of 4–6 flowers (5–6 reported) on 2.5 cm pedicels at the ends of spur shoots and every 4.5–8 cm along the twigs and branches, drawn 2 × life size so the crown reads as a cloud of blossom (stated). Each flower: five obovate, clawed petals 1.5 cm long with a notch 14% deep at the tip, open 68–76° from the axis, 30 stamens with yellow anthers (left out when a flower is too small on screen). 3000–5000 fallen petals lie under the crown.",
    skeleton: "Trunk forks low (0.22 H) into 4–6 wide-spreading limbs (45–68° from vertical, arching under their weight); zigzag branches, twigs and short spur shoots (crooked, wander 18–25°) carry the flowers.",
    surface: "Dark grey-brown lenticelled bark (sakura bark scan); petals pale pink, deeper at the base (#e8a9b9 → #fbe6eb, between FLORA1's cherry colours #efc6d0 and #f8ecef) with a soft sheen.",
    layout: "Avenues and riverbanks 8 m apart, rows 12 m apart.",
  },
};

export const BLACK_PINE: SpeciesMorphologyProfile = {
  id: "pinus-thunbergii", name: "Japanese black pine (kuromatsu)", scientificName: "Pinus thunbergii", family: "Pinaceae", habit: "tree",
  summary: "A leaning trunk of dark plated bark with horizontal tiers of limbs whose twig ends carry dense brushes of paired needles: the cloud-pad pine of coasts, shrines and gardens.",
  sources: [
    flora1("japanese-black-pine", ["Up to 40 m, usually 10–20 m (reported); needles in pairs 6–12 cm (reported); cones 4–7 cm (reported).", "Bark dark blackish-grey and plated on old trunks (reported); old pines lean with a broken, flat crown."]),
    barkSource("pine_bark", "Thick plated pine bark with red-brown furrows; 2 m tile."),
  ],
  size: { height: range(8, 14, 25, "reported", "flora1-japanese-black-pine") },
  measured: { needleLength: range(0.06, 0.09, 0.12, "reported", "flora1-japanese-black-pine") },
  root: "trunk",
  axes: [
    { id: "trunk", kind: "trunk", surface: "bark", length: { of: "height", ratio: 0.95 }, radius: { of: "height", ratio: 0.022, tip: 0.3 }, flare: { height: 1, amount: 0.18, lobes: 5 }, nodes: 14, wander: 14, lean: 12, upturn: 8,
      children: [{ rule: "limb", from: 0.35, to: 0.95, perMetre: 1.8, envelope: "conical" }] },
    { id: "limb", kind: "limb", surface: "bark", length: { of: "height", ratio: 0.38, spread: 0.25 }, radius: { of: "parent", ratio: 0.42, tip: 0.25 }, nodes: 9, angle: [82, 58], gravity: 1.5, upturn: 10, wander: 20,
      children: [{ rule: "branch", from: 0.35, to: 1, perMetre: 5 }] },
    { id: "branch", kind: "branch", surface: "bark", length: { of: "parent", ratio: 0.4, spread: 0.3 }, radius: { of: "parent", ratio: 0.45, tip: 0.35 }, nodes: 6, angle: [62, 42], gravity: 1.2, upturn: 12, wander: 22,
      children: [{ rule: "twig", from: 0.45, to: 1, perMetre: 18 }] },
    { id: "twig", kind: "twig", surface: "bark", length: { of: "parent", ratio: 0.3, spread: 0.35 }, radius: { of: "parent", ratio: 0.55, tip: 0.6 }, nodes: 4, angle: [50, 35], upturn: 25, wander: 18 },
  ],
  organs: {
    needle: { kind: "blade", surface: "needle", length: range(0.06, 0.09, 0.12, "reported", "flora1-japanese-black-pine"), width: 0.03, widestAt: 0.3, baseShape: 0.6, apexShape: 1.4,
      veins: { style: "parallel", laterals: 1, angle: 2, midrib: 0.3 }, fold: 30, droop: 0.3, droopPitch: 40, twist: 20 },
    cone: { kind: "bud", surface: "cone", length: range(0.04, 0.055, 0.07, "reported", "flora1-japanese-black-pine"), width: 0.62 },
  },
  placements: [
    { organ: "needle", on: "twig", place: "rosette", count: [70, 110], angle: [8, 66], scale: [1.4, 1.9], core: 0.008, rise: 0.08 },
    { organ: "needle", on: "branch", place: "rosette", count: [60, 90], angle: [8, 62], scale: [1.4, 1.9], core: 0.008, rise: 0.07 },
    { organ: "cone", on: "branch", place: "along", from: 0.4, to: 0.9, count: [1, 1], chance: 0.15, angle: [110, 110], onset: 0.6 },
  ],
  surfaces: {
    bark: { colour: [{ at: 0, hex: "#3a3533" }, { at: 0.6, hex: "#433b36" }, { at: 1, hex: "#5a4a3c" }], roughness: 0.9, texture: "bark-fissured", tile: 0.6, relief: 0.07, scan: polyHavenScan("pine_bark", 2) },
    needle: { colour: [{ at: 0, hex: "#3a5034" }, { at: 0.3, hex: "#2c4a2e" }, { at: 1, hex: "#36573a" }], back: "#3a5a3c", roughness: 0.45, clearcoat: 0.2, texture: "parallel-veins" },
    cone: { colour: [{ at: 0, hex: "#8a7454" }, { at: 1, hex: "#a88f68" }], roughness: 0.85, texture: "none" },
  },
  layout: { spacing: 7, clumpRadius: 8 },
  seedling: 0.05,
  blueprint: {
    phyllotaxy: "Needles in brushes at every twig and branch end: 70–110 needles (6–12 cm, reported; drawn 1.4–1.9 × long and 3 mm wide so the pads read, stated) at the golden angle round a 7 cm rise, inner ones upright (8°), outer ones spreading to 62°, keeled and twisted. Cones (4–7 cm) on 15% of branches from stage 0.6.",
    skeleton: "A leaning (12°), wandering trunk to the top; limbs 1.8 per metre in horizontal tiers (58–82° from the trunk, shorter toward the top), whose branches (outer 65%) and twigs (outer 55%, 18 per metre) turn up at their ends (upturn 12–25°): the needle brushes crowd into flat cloud pads.",
    surface: "Dark plated bark (pine bark scan, #3a3533 from FLORA1), dark glossy needles (#2c4a2e).",
    layout: "Coastal and garden groves 7 m apart.",
  },
};

export const MOSO_BAMBOO: SpeciesMorphologyProfile = {
  id: "phyllostachys-edulis", name: "Moso bamboo (mōsōchiku)", scientificName: "Phyllostachys edulis", family: "Poaceae", habit: "graminoid",
  summary: "Tall, straight, waxy green culms ringed with nodes, branching only in their upper half into fans of small drooping leaves: the bamboo grove.",
  sources: [
    wiki("Phyllostachys_edulis", ["Culms up to 28 m tall and up to 22 cm in diameter.", "Grows up to 119 cm in 24 hours."]),
    flora1("madake-bamboo", ["Green culms ringed by nodes, yellowing with age; lanceolate leaves 8–20 cm in fans (estimated)."]),
  ],
  size: { height: range(10, 15, 28, "reported", "wiki-phyllostachys-edulis") },
  measured: { culmDiameter: range(0.08, 0.15, 0.22, "reported", "wiki-phyllostachys-edulis") },
  root: "culm",
  axes: [
    { id: "culm", kind: "culm", surface: "culm", length: { of: "height", ratio: 1 }, radius: { of: "height", ratio: 0.006, tip: 0.4 }, profile: [[0, 1], [0.6, 0.85], [1, 0.5]], nodes: 30, wander: 3, lean: 4, gravity: 0.15,
      nodeRings: { spacing: 0.35, swell: 0.035 }, children: [{ rule: "branch", from: 0.45, to: 1, perMetre: 2.8 }] },
    { id: "branch", kind: "branch", surface: "culm", length: { of: "height", ratio: 0.1, spread: 0.3 }, radius: { of: "parent", ratio: 0.08, tip: 0.5 }, nodes: 6, angle: [55, 40], divergence: 180, gravity: 1.5, upturn: 6, wander: 10,
      children: [{ rule: "twig", from: 0.15, to: 1, perMetre: 12 }] },
    { id: "twig", kind: "twig", surface: "culm", length: { of: "parent", ratio: 0.4, spread: 0.3 }, radius: { of: "parent", ratio: 0.6, tip: 0.6 }, nodes: 4, angle: [45, 35], gravity: 2, wander: 14 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.04, 0.08, 0.11, "estimated"), width: 0.14, widestAt: 0.3, baseShape: 0.7, apexShape: 1.6,
      veins: { style: "parallel", laterals: 6, angle: 3, midrib: 0.05 }, fold: 8, droop: 3, droopPitch: 10, twist: 20 },
  },
  placements: [
    { organ: "leaf", on: "twig", place: "tip", count: [4, 7], angle: [35, 75], scale: [1.5, 1.5] },
    { organ: "leaf", on: "twig", place: "along", from: 0.15, to: 1, spacing: 0.035, angle: [50, 40], scale: [1.5, 1.5] },
  ],
  surfaces: {
    culm: { colour: [{ at: 0, hex: "#5f8238" }, { at: 0.6, hex: "#6a8f3e" }, { at: 1, hex: "#7a9a46" }], roughness: 0.35, clearcoat: 0.35, texture: "stem", tile: 0.4 },
    leaf: { colour: [{ at: 0, hex: "#4f7a3a" }, { at: 1, hex: "#5a8a40" }], back: "#7a9a62", roughness: 0.45, texture: "parallel-veins" },
  },
  layout: { spacing: 0.9, clumpRadius: 3, density: 1.5 },
  seedling: 0.06,
  blueprint: {
    phyllotaxy: "Leaves in fans of 4–7 at the twig tips and every 3.5 cm along them, lanceolate (8 cm, 14% as wide; drawn 1.5 × life size, stated), drooping (G 3) and twisted.",
    skeleton: "Culm to the full height, diameter 1.2% of it (15–22 cm reported), tapering to 40%, with node rings every 35 cm and a slight lean. One branch per node, alternating sides (180°), from the upper 55% only; branches 0.1 H with twigs.",
    surface: "Waxy green culms (#6a8f3e from FLORA1, clear coat 0.35), leaves #4f7a3a.",
    layout: "Groves of culms 0.9 m apart, 1.5 per m².",
  },
};

export const HYDRANGEA: SpeciesMorphologyProfile = {
  id: "hydrangea-macrophylla", name: "Hydrangea (ajisai)", scientificName: "Hydrangea macrophylla", family: "Hydrangeaceae", habit: "shrub",
  summary: "A rounded shrub of upright shoots with opposite, glossy, serrate leaves, each shoot crowned in the rainy season by a dome of blue four-sepalled florets.",
  sources: [
    wiki("Hydrangea_macrophylla", ["About 3 m tall and 2.5 m or more across.", "Leaves opposite, up to 15 cm, elliptic to orbicular, acuminate, serrated.", "Mophead cultivars: a hemisphere or sphere of sterile, four-parted florets; blue on acid soil (pH below 7), pink on alkaline soil."]),
  ],
  size: { height: range(0.8, 1.4, 3, "estimated", "wiki-hydrangea-macrophylla") },
  root: "base",
  axes: [
    { id: "base", kind: "stem", surface: "shoot", length: { of: "height", ratio: 0.08 }, radius: { of: "height", ratio: 0.02, tip: 0.8 }, nodes: 3,
      children: [{ rule: "shoot", from: 0.5, to: 1, count: [12, 20] }] },
    { id: "shoot", kind: "stem", surface: "shoot", length: { of: "height", ratio: 0.85, spread: 0.2 }, radius: { of: "parent", ratio: 0.25, tip: 0.7 }, nodes: 7, angle: [50, 10], gravity: 0.6, upturn: 15, wander: 10 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.1, 0.13, 0.15, "reported", "wiki-hydrangea-macrophylla"), width: 0.6, widestAt: 0.45, baseShape: 0.7, apexShape: 1.4, margin: { kind: "serrate", count: 16, depth: 0.06 },
      veins: { style: "pinnate", laterals: 8, angle: 50, midrib: 0.04 }, fold: 6, droop: 1.2, droopPitch: 15 },
    floret: { kind: "corolla", count: 4, arrangement: "whorled", perWhorl: 4, angle: [75, 82],
      petal: { kind: "blade", surface: "sepal", length: range(0.012, 0.016, 0.02, "estimated"), width: 0.95, widestAt: 0.55, baseShape: 0.8, apexShape: 0.6, mucro: 0.04,
        veins: { style: "parallel", laterals: 5, angle: 3, midrib: 0.02 }, cup: 0.15, droopPitch: 0 },
      stamens: { count: 4, length: 0.002, surface: "eye" } },
    head: { kind: "cluster", floret: "floret", shape: "dome", count: range(60, 90, 120, "estimated"), size: range(0.15, 0.2, 0.25, "estimated"), spread: 82, stalk: { radius: 0.0015, surface: "shoot" } },
  },
  placements: [
    { organ: "leaf", on: "shoot", place: "along", from: 0.15, to: 0.92, spacing: 0.09, perNode: 2, divergence: 90, angle: [55, 45], scale: [1, 0.7] },
    { organ: "head", on: "shoot", place: "tip", angle: [0, 0], onset: 0.6 },
  ],
  surfaces: {
    shoot: { colour: [{ at: 0, hex: "#6a6a4a" }, { at: 1, hex: "#6a8a44" }], roughness: 0.6, texture: "stem", tile: 0.3 },
    leaf: { colour: [{ at: 0, hex: "#3f6a2c" }, { at: 1, hex: "#4a7a32" }], back: "#7a9a62", roughness: 0.45, clearcoat: 0.3, texture: "leaf-veins" },
    sepal: { colour: [{ at: 0, hex: "#7a86c8" }, { at: 0.6, hex: "#8f9ee0" }, { at: 1, hex: "#a6b2ea" }], back: "#8a96d0", roughness: 0.55, sheen: 0.3, sheenColour: "#e0e6ff", texture: "petal" },
    eye: { colour: [{ at: 0, hex: "#4a5aa8" }, { at: 1, hex: "#e8e4f0" }], roughness: 0.6, texture: "none" },
  },
  layout: { spacing: 1.4, rowPitch: 1.6, clumpRadius: 1.2 },
  seedling: 0.15,
  blueprint: {
    phyllotaxy: "Opposite, decussate leaves every 9 cm (13 cm, serrate, acuminate, glossy). Each shoot ends in a dome 20 cm across of 60–120 sterile florets placed by the golden angle over an 82° cap, each of four broad sepals spread flat (75–82°).",
    skeleton: "A short base with 12–20 shoots from its top half, outer ones at 50°, inner ones at 10°, turning up: a rounded shrub.",
    surface: "Glossy dark leaves; sepals blue-violet (#7a86c8 → #a6b2ea, acid soil) with a soft sheen. Colours estimated (no photo downloaded).",
    layout: "Temple paths and hedges: plants 1.4 m apart.",
  },
};

export const RED_SPIDER_LILY: SpeciesMorphologyProfile = {
  id: "lycoris-radiata", name: "Red spider lily (higanbana)", scientificName: "Lycoris radiata", family: "Amaryllidaceae", habit: "herb",
  summary: "A bare green scape, leafless at flowering, topped by an umbel of red flowers whose narrow, wavy tepals curl back and whose very long stamens arc up and out.",
  sources: [
    wiki("Lycoris_radiata", ["Scape 30–70 cm; umbel of 4–6 flowers, each about 5 cm long.", "Narrow segments that curve backwards; spindly stamens extend up and out; bright red.", "Leaves appear after the flowers; blooms late August to early September."]),
  ],
  size: { height: range(0.3, 0.45, 0.7, "reported", "wiki-lycoris-radiata") },
  root: "scape",
  axes: [
    { id: "scape", kind: "stem", surface: "scape", length: { of: "height", ratio: 0.95 }, radius: { of: "height", ratio: 0.012, tip: 0.85 }, nodes: 8, gravity: 0.1, tipLoad: 0.4, wander: 5 },
  ],
  organs: {
    flower: { kind: "corolla", count: 6, arrangement: "whorled", perWhorl: 3, angle: [55, 65],
      petal: { kind: "blade", surface: "tepal", length: range(0.035, 0.042, 0.05, "reported", "wiki-lycoris-radiata"), width: 0.12, widestAt: 0.5, baseShape: 1, apexShape: 0.9,
        veins: { style: "parallel", laterals: 3, angle: 3, midrib: 0.06 }, ruffle: 0.35, ruffleWave: 0.2, droop: 4, droopPitch: 0, twist: 10 },
      stamens: { count: 6, length: 0.07, surface: "stamen", curve: 50 } },
    umbel: { kind: "cluster", floret: "flower", shape: "umbel", count: range(4, 5, 6, "reported", "wiki-lycoris-radiata"), size: range(0.03, 0.04, 0.05, "estimated"), spread: 70, stalk: { radius: 0.0012, surface: "scape" } },
  },
  placements: [{ organ: "umbel", on: "scape", place: "tip", angle: [0, 0], onset: 0.55 }],
  surfaces: {
    scape: { colour: [{ at: 0, hex: "#4a6a3a" }, { at: 1, hex: "#5a7a3e" }], roughness: 0.4, clearcoat: 0.2, texture: "stem", tile: 0.2 },
    tepal: { colour: [{ at: 0, hex: "#b81018" }, { at: 0.5, hex: "#d01a20" }, { at: 1, hex: "#e0242a" }], back: "#b01418", roughness: 0.5, sheen: 0.35, sheenColour: "#ff8080", texture: "petal" },
    stamen: { colour: [{ at: 0, hex: "#d81e24" }, { at: 0.85, hex: "#c81a20" }, { at: 1, hex: "#e8c060" }], roughness: 0.5, texture: "none" },
  },
  layout: { spacing: 0.15, rowPitch: 0.4, clumpRadius: 0.25, density: 30 },
  seedling: 0.1,
  blueprint: {
    phyllotaxy: "An umbel of 4–6 flowers (reported) on 4 cm rays spreading 70°; each flower six strap-like tepals (4.2 cm, 12% as wide) in two whorls, strongly recurved (droop 4) with wavy edges (ruffle 0.35); six stamens 7 cm long arcing 50° toward the axis, red with yellow anthers. No leaves at flowering.",
    skeleton: "A single bare scape (0.95 H, 5 mm thick) that bends a little under the umbel.",
    surface: "Bright red tepals (#d01a20, estimated from 'bright red') with a sheen; green scape.",
    layout: "Drifts along paddy edges and graveyards: 30 scapes per m², clumps of 25 cm radius.",
  },
};

export const WISTERIA: SpeciesMorphologyProfile = {
  id: "wisteria-floribunda", name: "Japanese wisteria (fuji)", scientificName: "Wisteria floribunda", family: "Fabaceae", habit: "climber",
  summary: "A twisting grey trunk with arching branches from which long violet racemes hang, opening from the base so their tips stay in bud.",
  sources: [
    flora1("japanese-wisteria", ["To 9 m; stems over 30 m long over supports (reported).", "Racemes the longest of any wisteria, 30–50 cm, to 2 m in cultivars (reported); violet flowers #9b7cc4 to #c8b4e0.", "Grey, twisting stems twining clockwise (reported)."]),
  ],
  size: { height: range(3, 5, 9, "reported", "flora1-japanese-wisteria") },
  measured: { racemeLength: range(0.3, 0.4, 2, "reported", "flora1-japanese-wisteria") },
  root: "trunk",
  axes: [
    { id: "trunk", kind: "trunk", surface: "bark", length: { of: "height", ratio: 0.5 }, radius: { of: "height", ratio: 0.02, tip: 0.7 }, nodes: 10, wander: 30,
      children: [{ rule: "limb", from: 0.55, to: 1, count: [5, 7] }] },
    { id: "limb", kind: "limb", surface: "bark", length: { of: "height", ratio: 0.6, spread: 0.2 }, radius: { of: "parent", ratio: 0.45, tip: 0.3 }, nodes: 10, angle: [78, 50], gravity: 2.5, wander: 26,
      children: [{ rule: "branch", from: 0.15, to: 1, perMetre: 4 }] },
    { id: "branch", kind: "branch", surface: "bark", length: { of: "parent", ratio: 0.45, spread: 0.3 }, radius: { of: "parent", ratio: 0.45, tip: 0.35 }, nodes: 7, angle: [70, 50], gravity: 3.5, wander: 22 },
  ],
  organs: {
    pea: { kind: "corolla", count: 4, arrangement: "whorled", perWhorl: 4, angle: [25, 50],
      petal: { kind: "blade", surface: "flower", length: range(0.012, 0.015, 0.018, "estimated"), width: 0.8, widestAt: 0.6, baseShape: 0.8, apexShape: 0.5, notch: { depth: 0.08, width: 0.1 },
        veins: { style: "parallel", laterals: 4, angle: 3, midrib: 0.03 }, cup: 0.5, droop: -0.8, droopPitch: 0 } },
    raceme: { kind: "cluster", floret: "pea", shape: "raceme", count: range(40, 60, 90, "estimated"), size: range(0.3, 0.4, 0.5, "reported", "flora1-japanese-wisteria"), stalk: { radius: 0.0018, surface: "axis" } },
  },
  placements: [
    { organ: "raceme", on: "branch", place: "along", from: 0.1, to: 1, spacing: 0.09, angle: [90, 90], hang: true, scale: [1.2, 1.2] },
    { organ: "raceme", on: "limb", place: "along", from: 0.4, to: 1, spacing: 0.14, angle: [90, 90], hang: true, scale: [1.2, 1.2] },
  ],
  surfaces: {
    bark: { colour: [{ at: 0, hex: "#6a6460" }, { at: 1, hex: "#7a726a" }], roughness: 0.75, texture: "bark-ringed", tile: 0.4, relief: 0.04, scan: polyHavenScan("chinese_hackberry_bark", 1.8) },
    flower: { colour: [{ at: 0, hex: "#d8cce8" }, { at: 0.5, hex: "#a888d0" }, { at: 1, hex: "#9070c0" }], back: "#c0aee0", roughness: 0.55, sheen: 0.4, sheenColour: "#e8d8ff", texture: "petal" },
    axis: { colour: [{ at: 0, hex: "#6a7a4a" }, { at: 1, hex: "#8a7aa0" }], roughness: 0.6, texture: "none" },
  },
  layout: { spacing: 5, clumpRadius: 4 },
  seedling: 0.1,
  blueprint: {
    phyllotaxy: "Racemes hang straight down (`hang`) every 9 cm along branches and 14 cm along the outer limbs, drawn 1.2 × (stated); each 40 cm (30–50 reported) with 40–90 florets by the golden angle, full size at the base and 40% at the tip, open at the base and in bud at the tip (they open from the base). Florets: four cupped, slightly notched petals, pale lilac at the base to violet (#9b7cc4 from FLORA1).",
    skeleton: "A twisting trunk (wander 30°) to 0.5 H with 5–7 limbs that arch over (G 2.5), 4 branches per metre and branches that hang lower (G 3.5): a standard trained over open ground.",
    surface: "Grey twisting bark (hackberry scan, #6a6460 from FLORA1); violet florets with a sheen. Leaves are left out: in full bloom they are just unfolding.",
    layout: "Specimens 5 m apart.",
  },
};

export const GINKGO_AUTUMN: SpeciesMorphologyProfile = {
  id: "ginkgo-biloba", name: "Ginkgo in autumn (ichō)", scientificName: "Ginkgo biloba", family: "Ginkgoaceae", habit: "tree",
  summary: "A conical avenue tree whose fan-shaped, two-lobed leaves turn saffron yellow in November and fall within days onto the street.",
  sources: [
    flora1("ginkgo", ["20–35 m (reported); conical when young (reported).", "Fan-shaped leaves 5–10 cm (reported), saffron yellow in autumn (#f2b51c), dropped within one to fifteen days (reported).", "Grey bark, furrowed with age (estimated)."]),
    barkSource("japanese_zelkova_bark", "Grey-brown flaking bark used for the furrowed ginkgo trunk; 1.8 m tile."),
  ],
  size: { height: range(12, 20, 35, "reported", "flora1-ginkgo") },
  measured: { leafLength: range(0.05, 0.07, 0.1, "reported", "flora1-ginkgo") },
  root: "trunk",
  axes: [
    { id: "trunk", kind: "trunk", surface: "bark", length: { of: "height", ratio: 0.92 }, radius: { of: "height", ratio: 0.016, tip: 0.3 }, flare: { height: 1, amount: 0.15, lobes: 5 }, nodes: 14, wander: 6,
      children: [{ rule: "limb", from: 0.18, to: 0.95, perMetre: 1.6, envelope: "conical" }] },
    { id: "limb", kind: "limb", surface: "bark", length: { of: "height", ratio: 0.28, spread: 0.25 }, radius: { of: "parent", ratio: 0.4, tip: 0.3 }, nodes: 8, angle: [62, 40], gravity: 1, upturn: 10, wander: 14,
      children: [{ rule: "twig", from: 0.1, to: 1, perMetre: 9 }] },
    { id: "twig", kind: "twig", surface: "bark", length: { of: "parent", ratio: 0.4, spread: 0.3 }, radius: { of: "parent", ratio: 0.5, tip: 0.5 }, nodes: 5, angle: [55, 40], gravity: 1.5, wander: 16,
      children: [{ rule: "spur", from: 0.1, to: 1, perMetre: 16 }] },
    { id: "spur", kind: "twig", surface: "bark", length: { of: "parent", ratio: 0.08, spread: 0.4 }, radius: { of: "parent", ratio: 0.7, tip: 0.8 }, nodes: 3, angle: [60, 50], wander: 15 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.05, 0.07, 0.1, "reported", "flora1-ginkgo"), width: 1.2, widestAt: 0.88, baseShape: 2.2, apexShape: 0.25, notch: { depth: 0.3, width: 0.05 },
      margin: { kind: "undulate", count: 6, depth: 0.04 }, veins: { style: "parallel", laterals: 10, angle: 3, midrib: 0.01 }, droop: 0.5, droopPitch: 20,
      stalk: { length: 0.05, radius: 0.0007, surface: "bark" } },
  },
  placements: [
    { organ: "leaf", on: "spur", place: "tip", count: [5, 8], angle: [25, 75], scale: [2.2, 2.2] },
    { organ: "leaf", on: "trunk", place: "litter", count: [2500, 4000], angle: [0, 0], scale: [1.2, 1.2] },
  ],
  surfaces: {
    bark: { colour: [{ at: 0, hex: "#5f574e" }, { at: 1, hex: "#6a6058" }], roughness: 0.85, texture: "bark-fissured", tile: 0.5, relief: 0.04, scan: polyHavenScan("japanese_zelkova_bark", 1.8) },
    leaf: { colour: [{ at: 0, hex: "#e8a812" }, { at: 0.6, hex: "#f2b51c" }, { at: 1, hex: "#f6c23a" }], back: "#e8c050", roughness: 0.55, texture: "parallel-veins" },
  },
  layout: { spacing: 8, rowPitch: 14, clumpRadius: 8 },
  seedling: 0.05,
  blueprint: {
    phyllotaxy: "Leaves in clusters of 4–7 on short spur shoots (14 per metre of twig), fan-shaped: 1.2 times as wide as long, wedge-based, truncate, a notch 30% deep at the middle of the top edge, a wavy edge, fine parallel veins, on a 5 cm stalk; drawn 2.2 × life size (stated). 2500–4000 fallen leaves carpet the ground.",
    skeleton: "Excurrent: a straight leader to 0.92 H with limbs 1.6 per metre leaving at 40–62°, shorter toward the top (conical), twigs, and spurs.",
    surface: "Saffron yellow leaves (#f2b51c from FLORA1); grey furrowed bark (zelkova scan, #6a6058 from FLORA1).",
    layout: "Avenues: trees 8 m apart in rows 14 m apart.",
  },
};

export const MOMIJI: SpeciesMorphologyProfile = {
  ...JAPANESE_MAPLE,
  id: "acer-palmatum-momiji", name: "Japanese maple in autumn (momiji)",
  summary: "The Japanese maple in November: the same layered dome of opposite branches and palmate leaves, now crimson to orange, with fallen leaves around it.",
  sources: [...JAPANESE_MAPLE.sources, flora1("japanese-maple", ["Autumn colour #c3341f; leaves 4–12 cm with 5, 7 or 9 lobes (reported); smooth grey-green bark (estimated)."])],
  placements: [...JAPANESE_MAPLE.placements, { organ: "leaf", on: "trunk", place: "litter", count: [600, 1000], angle: [0, 0], scale: [1.4, 1.4] }],
  surfaces: { ...JAPANESE_MAPLE.surfaces, leaf: { colour: [{ at: 0, hex: "#a82418" }, { at: 0.55, hex: "#c3341f" }, { at: 1, hex: "#d85a26" }], back: "#c24a30", roughness: 0.5, texture: "leaf-veins" } },
  blueprint: { ...JAPANESE_MAPLE.blueprint, surface: "Autumn leaves crimson to orange (#c3341f from FLORA1, #a82418 at the base to #d85a26 at the tips); 600–1000 fallen leaves under the crown; trident maple bark scan." },
};

export const CAMPHOR_TREE: SpeciesMorphologyProfile = {
  id: "cinnamomum-camphora", name: "Camphor tree (kusunoki)", scientificName: "Cinnamomum camphora", family: "Lauraceae", habit: "tree",
  summary: "The great shrine tree: a vast buttressed trunk of pale, deeply fissured bark under a broad, dense, glossy evergreen dome.",
  sources: [
    flora1("camphor", ["20–30 m (reported); five Japanese camphors exceed 20 m girth (reported).", "Crown a broad dome; ovate, wavy-edged glossy leaves 6–12 cm (estimated); pale, rough, vertically fissured bark (reported).", "The sacred tree of many shrines; the giant tree of the forest spirit in Japanese film."]),
    barkSource("japanese_camphor_bark", "Pale grey-brown, finely fissured camphor bark; 1.8 m tile."),
  ],
  size: { height: range(15, 22, 30, "reported", "flora1-camphor") },
  root: "trunk",
  axes: [
    { id: "trunk", kind: "trunk", surface: "bark", length: { of: "height", ratio: 0.3, spread: 0.12 }, radius: { of: "height", ratio: 0.05, tip: 0.7 }, flare: { height: 1.4, amount: 0.35, lobes: 8 }, nodes: 10, wander: 10,
      children: [{ rule: "limb", from: 0.6, to: 1, count: [4, 6] }] },
    { id: "limb", kind: "limb", surface: "bark", length: { of: "height", ratio: 0.55, spread: 0.2 }, radius: { of: "parent", ratio: 0.45, tip: 0.2 }, swell: 0.3, nodes: 10, angle: [60, 35], gravity: 1, upturn: 16, wander: 20,
      children: [{ rule: "branch", from: 0.2, to: 1, count: [5, 8] }] },
    { id: "branch", kind: "branch", surface: "bark", length: { of: "parent", ratio: 0.5, spread: 0.3 }, radius: { of: "parent", ratio: 0.45, tip: 0.25 }, nodes: 8, angle: [55, 35], gravity: 1.4, upturn: 10, wander: 24,
      children: [{ rule: "twig", from: 0.2, to: 1, count: [6, 10] }] },
    { id: "twig", kind: "twig", surface: "bark", length: { of: "parent", ratio: 0.42, spread: 0.35 }, radius: { of: "parent", ratio: 0.5, tip: 0.35 }, nodes: 5, angle: [55, 30], gravity: 2, wander: 28,
      children: [{ rule: "spray", from: 0.4, to: 1, count: [10, 16] }] },
    { id: "spray", kind: "twig", surface: "bark", length: { of: "parent", ratio: 0.22, spread: 0.4 }, radius: { of: "parent", ratio: 0.55, tip: 0.5 }, nodes: 3, angle: [60, 30], gravity: 1, wander: 30 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.06, 0.09, 0.12, "estimated", "flora1-camphor"), width: 0.45, widestAt: 0.4, baseShape: 0.8, apexShape: 1.3, margin: { kind: "undulate", count: 3, depth: 0.03 },
      veins: { style: "pinnate", laterals: 4, angle: 40, baseAngle: 25, midrib: 0.04 }, fold: 6, droop: 0.8, droopPitch: 10 },
  },
  placements: [
    { organ: "leaf", on: "spray", place: "tip", count: [12, 18], angle: [30, 85], scale: [2.4, 2.4] },
    { organ: "leaf", on: "spray", place: "along", from: 0.3, to: 1, spacing: 0.025, angle: [55, 45], scale: [2.4, 2.4] },
    { organ: "leaf", on: "twig", place: "along", from: 0.4, to: 1, spacing: 0.04, angle: [55, 45], scale: [2.4, 2.4] },
  ],
  surfaces: {
    bark: { colour: [{ at: 0, hex: "#7a6c58" }, { at: 0.5, hex: "#8a7a62" }, { at: 1, hex: "#7a6e5c" }], roughness: 0.9, texture: "bark-fissured", tile: 0.6, relief: 0.07, scan: polyHavenScan("japanese_camphor_bark", 1.8) },
    leaf: { colour: [{ at: 0, hex: "#355f2f" }, { at: 1, hex: "#3f6c36" }], back: "#6a8a5a", roughness: 0.35, clearcoat: 0.45, texture: "leaf-veins" },
  },
  layout: { spacing: 20, clumpRadius: 15 },
  seedling: 0.04,
  blueprint: {
    phyllotaxy: "Glossy ovate leaves (9 cm, wavy-edged, three main veins from near the base) crowded at the ends of short shoots (12–18 per tip) and every 2.5–4 cm along them; drawn 2.4 × life size so the dome reads at tree scale (stated).",
    skeleton: "A vast trunk (radius 0.05 H) with an eight-lobed buttressed foot dividing at 0.3 H into 4–6 massive spreading limbs, then crooked branches and twigs ending in clustered leafy shoots: a broad dense dome.",
    surface: "Pale, fissured bark (camphor scan, #8a7a62 from FLORA1); dark glossy leaves (#3a6a34 from FLORA1, clear coat 0.45).",
    layout: "Shrine trees standing alone, 20 m apart.",
  },
};

/** Plants of Japanese scenery that anime backgrounds show most. */
export const ANIME_PROFILES: readonly SpeciesMorphologyProfile[] = [SOMEI_YOSHINO, BLACK_PINE, MOSO_BAMBOO, HYDRANGEA, RED_SPIDER_LILY, WISTERIA, GINKGO_AUTUMN, MOMIJI, CAMPHOR_TREE];
