/**
 * FLORA2 popular plants (study of 2026-11-17, second round): trees (coconut palm, English oak, Japanese maple), house
 * plants (fiddle-leaf fig, snake plant, Boston fern, aloe), garden flowers (tulip, lavender) and the saguaro. The
 * grades follow `flora-profiles.ts`.
 * - **reported**: quoted from the source.
 * - **measured**: read from the studied photo.
 * - **estimated**: our judgement.
 *
 * Commons limited downloads (HTTP 429), so plants without a studied photo have estimated colours, and their sources
 * say so.
 */
import { commons, range } from "./foundation-shapes";
import type { SpeciesMorphologyProfile } from "./flora-profile";
import { polyHavenScan } from "./flora-profile";

const wiki = (page: string, observed: readonly string[]) => ({ id: `wiki-${page.toLowerCase().replace(/_/g, "-")}`, title: `Wikipedia: ${page.replace(/_/g, " ")}`, url: `https://en.wikipedia.org/wiki/${page}`, kind: "flora" as const, rights: "cited" as const, observed });

export const COCONUT_PALM: SpeciesMorphologyProfile = {
  id: "cocos-nucifera", name: "Coconut palm", scientificName: "Cocos nucifera", family: "Arecaceae", habit: "tree",
  summary: "A slender, ringed, gently curving trunk with a swollen foot, crowned by 24–32 arching pinnate fronds whose leaflets hang in a V, and bunches of nuts below the crown.",
  sources: [
    wiki("Coconut", ["Up to 30 m tall; pinnate leaves 4–6 m long with pinnae 60–90 cm; old leaves break away cleanly, leaving a smooth trunk.", "Fruit about 1.4 kg; up to 75 fruits a year."]),
    { id: "beach-photo", title: "Sea view from Himsori, Bangladesh", url: commons("Sea_View_from_himsori_bangladesh_(cropped).jpg"), kind: "photo", rights: "CC BY-SA", creator: "Masud Rana",
      observed: ["Trunks lean and curve, about 1/40 of the height across, flaring at the foot.", "Lower fronds hang toward the trunk; the crown is about 0.35 of the height wide."] },
    { id: "frond-photo", title: "Coconut tree leave", url: commons("Coconut_tree_leave.jpeg"), kind: "photo", rights: "CC BY-SA", creator: "tshrinivasan",
      observed: ["Pinnae hang from a yellow rachis in a V (folded leaflets), touching their neighbours.", "Pinnae ladder p25 #67781f, p50 #85962a, p75 #a9b74d."] },
  ],
  size: { height: range(10, 22, 30, "reported", "wiki-coconut") },
  measured: { frondLength: range(4, 5, 6, "reported", "wiki-coconut"), pinnaLength: range(0.6, 0.75, 0.9, "reported", "wiki-coconut"), trunkDiameter: range(0.02, 0.025, 0.03, "measured", "beach-photo") },
  root: "trunk",
  axes: [
    { id: "trunk", kind: "trunk", surface: "bark", length: { of: "height", ratio: 0.97 }, radius: { of: "height", ratio: 0.0085, tip: 0.85 }, profile: [[0, 1.35], [0.05, 1.1], [0.15, 1], [1, 0.9]],
      flare: { height: 2.5, amount: 0.3, lobes: 9 }, nodes: 20, wander: 5, lean: 14, upturn: 12, nodeRings: { spacing: 0.12, swell: 0.025 },
      children: [{ rule: "frond", from: 0.985, to: 1, count: [24, 32] }] },
    { id: "frond", kind: "petiole", surface: "rachis", length: { of: "height", ratio: 0.28, spread: 0.15 }, radius: { of: "parent", ratio: 0.22, tip: 0.2 }, nodes: 14, angle: [110, 30], divergence: 137.5, gravity: 1.6, tipLoad: 0.3, wander: 4 },
  ],
  organs: {
    pinna: { kind: "blade", surface: "leaf", length: range(0.6, 0.75, 0.9, "reported", "wiki-coconut"), width: 0.045, widestAt: 0.4, baseShape: 1.2, apexShape: 1.4,
      veins: { style: "parallel", laterals: 5, angle: 3, midrib: 0.08 }, fold: 18, droop: 3, droopPitch: 0, twist: 10 },
    nut: { kind: "bud", surface: "nut", length: range(0.2, 0.25, 0.3, "estimated"), width: 0.78, stalk: { length: 0.12, radius: 0.012, surface: "rachis" } },
  },
  placements: [
    { organ: "pinna", on: "frond", place: "along", from: 0.18, to: 0.98, spacing: 0.035, sides: true, lift: -32, angle: [70, 45], scale: [0.55, 1, 0.45] },
    { organ: "nut", on: "trunk", place: "along", from: 0.955, to: 0.985, count: [6, 10], perNode: 2, angle: [125, 145], offset: 1, onset: 0.6 },
  ],
  surfaces: {
    bark: { colour: [{ at: 0, hex: "#6f6a5c" }, { at: 1, hex: "#8a8676" }], roughness: 0.85, texture: "bark-ringed", tile: 0.5, relief: 0.03, scan: polyHavenScan("palm_tree_bark", 1.3) },
    rachis: { colour: [{ at: 0, hex: "#8f8a3e" }, { at: 1, hex: "#a3a24a" }], roughness: 0.55, texture: "stem", tile: 0.4 },
    leaf: { colour: [{ at: 0, hex: "#4a681c" }, { at: 0.5, hex: "#557420" }, { at: 1, hex: "#5f7e26" }], back: "#7f8f4a", roughness: 0.42, clearcoat: 0.35, texture: "parallel-veins" },
    nut: { colour: [{ at: 0, hex: "#5f7028" }, { at: 1, hex: "#6b7f2c" }], roughness: 0.45, clearcoat: 0.3, texture: "none" },
  },
  layout: { spacing: 8, rowPitch: 8, clumpRadius: 10 },
  seedling: 0.04,
  blueprint: {
    phyllotaxy: "24–32 fronds at the golden angle in a crown at the top 1.5% of the trunk; older (lower) fronds leave at 100° from the trunk and hang, young ones stand at 15°. Pinnae in opposite pairs every 3.5 cm along 80% of the rachis, on both sides hanging 32° below it in a V (the photo), short at the base, longest mid-frond, short at the tip.",
    skeleton: "Trunk 0.97 H, diameter about 1/40 H with a bole flaring 35% at the foot and leaf-scar rings every 12 cm; it leans 10–17° at the foot and curves back up 12°. Fronds 0.28 H (about 5 m) arch as heavy elasticas (G 1.6) from 110° (old) to 30° (young). Six to ten nuts on stalks just under the crown from growth stage 0.6.",
    surface: "Grey ringed trunk (#6f6a5c → #8a8676, estimated: the photo mixes trunk and sand), yellow rachis, pinnae #4a681c → #5f7e26 (the photo's backlit p25–p50 ladder #67781f–#85962a, lowered toward an albedo), a little gloss.",
    layout: "Plantations at about 8 m spacing.",
  },
};

export const ENGLISH_OAK: SpeciesMorphologyProfile = {
  id: "quercus-robur", name: "English oak", scientificName: "Quercus robur", family: "Fagaceae", habit: "tree",
  summary: "A stout, deeply fissured trunk that divides low into massive crooked limbs under a broad, billowy dome of clustered, round-lobed leaves; acorns on long stalks.",
  sources: [
    wiki("Quercus_robur", ["Typically up to 20 m, sometimes 40 m; trunk up to 4 m across; crown spreading and unevenly domed with massive lower branches.", "Bark grey-brown, closely grooved into vertical plates.", "Leaves 10–12 × 7–8 cm with a cordate (auricled) base and 3–6 rounded lobes cut up to halfway to the midrib; petiole 2–3 mm.", "Acorns 1.5–4 cm in clusters of 2–3 on a 4–8 cm peduncle."]),
    { id: "baginton-photo", title: "Baginton oak tree, July 2006", url: commons("Baginton_oak_tree_july06.JPG"), kind: "photo", rights: "CC BY-SA", creator: "Snowmanradio",
      observed: ["Massive short trunk dividing low into crooked limbs; the crown is a billowy dome of leaf clumps.", "Crown ladder p50 #637649, p75 #93ab78; trunk p50 #3a3222, p75 #544a32."] },
    { id: "leaf-photo", title: "Quercus robur leaves and acorns", url: commons("Quercus_robur.jpg"), kind: "photo", rights: "CC BY-SA", creator: "Wikimedia Commons contributor",
      observed: ["Leaves crowded at the twig ends, obovate with four or five deep rounded lobes a side and small ear-like lobes at the base.", "Leaf p25 #3a4617, p50 #505e25."] },
  ],
  size: { height: range(15, 22, 40, "reported", "wiki-quercus-robur") },
  measured: { leafLength: range(0.07, 0.11, 0.12, "reported", "wiki-quercus-robur") },
  root: "trunk",
  axes: [
    { id: "trunk", kind: "trunk", surface: "bark", length: { of: "height", ratio: 0.3, spread: 0.12 }, radius: { of: "height", ratio: 0.045, tip: 0.7 }, flare: { height: 1.2, amount: 0.25, lobes: 6 }, nodes: 10, wander: 8,
      children: [{ rule: "limb", from: 0.55, to: 1, count: [5, 8] }] },
    { id: "limb", kind: "limb", surface: "bark", length: { of: "height", ratio: 0.5, spread: 0.2 }, radius: { of: "parent", ratio: 0.42, tip: 0.2 }, swell: 0.3, nodes: 10, angle: [70, 35], gravity: 1.2, upturn: 14, wander: 22,
      children: [{ rule: "branch", from: 0.2, to: 1, count: [4, 7] }] },
    { id: "branch", kind: "branch", surface: "bark", length: { of: "parent", ratio: 0.5, spread: 0.3 }, radius: { of: "parent", ratio: 0.45, tip: 0.25 }, nodes: 8, angle: [55, 35], gravity: 1.5, upturn: 8, wander: 26,
      children: [{ rule: "twig", from: 0.2, to: 1, count: [6, 10] }] },
    { id: "twig", kind: "twig", surface: "twig", length: { of: "parent", ratio: 0.42, spread: 0.35 }, radius: { of: "parent", ratio: 0.5, tip: 0.35 }, nodes: 5, angle: [55, 30], gravity: 2, wander: 32,
      children: [{ rule: "spray", from: 0.4, to: 1, count: [10, 16] }] },
    { id: "spray", kind: "twig", surface: "twig", length: { of: "parent", ratio: 0.22, spread: 0.4 }, radius: { of: "parent", ratio: 0.55, tip: 0.5 }, nodes: 3, angle: [60, 30], gravity: 1, wander: 30 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.07, 0.11, 0.12, "reported", "wiki-quercus-robur"), width: 0.65, widestAt: 0.62, baseShape: 0.55, apexShape: 0.6, lobe: 0.04,
      margin: { kind: "lobed", count: 4.5, depth: 0.5 }, veins: { style: "pinnate", laterals: 5, angle: 50, midrib: 0.05 }, fold: 4, droop: 1, droopPitch: 10, stalk: { length: 0.003, radius: 0.0012, surface: "twig" } },
    acorn: { kind: "bud", surface: "acorn", length: range(0.015, 0.025, 0.04, "reported", "wiki-quercus-robur"), width: 0.55, stalk: { length: 0.06, radius: 0.0012, surface: "twig" } },
  },
  placements: [
    { organ: "leaf", on: "spray", place: "tip", count: [10, 16], angle: [30, 85], scale: [2.2, 2.2] },
    { organ: "leaf", on: "spray", place: "along", from: 0.3, to: 1, spacing: 0.03, angle: [55, 45], scale: [2.2, 2.2] },
    { organ: "leaf", on: "twig", place: "along", from: 0.5, to: 1, spacing: 0.05, angle: [55, 45], scale: [2.2, 2.2] },
    { organ: "acorn", on: "spray", place: "along", from: 0.5, to: 1, count: [1, 1], chance: 0.12, angle: [90, 90], hang: true, onset: 0.7 },
  ],
  surfaces: {
    bark: { colour: [{ at: 0, hex: "#4a4232" }, { at: 0.4, hex: "#544a38" }, { at: 1, hex: "#5f5644" }], roughness: 0.92, texture: "bark-fissured", tile: 0.7, relief: 0.08, scan: polyHavenScan("jolcham_oak_bark_01", 1, 2) },
    twig: { colour: [{ at: 0, hex: "#5f5644" }, { at: 1, hex: "#6a5f4a" }], roughness: 0.8, texture: "stem", tile: 0.3 },
    leaf: { colour: [{ at: 0, hex: "#46551f" }, { at: 1, hex: "#505e25" }], back: "#93a26a", roughness: 0.5, clearcoat: 0.15, texture: "leaf-veins" },
    acorn: { colour: [{ at: 0, hex: "#7a7a38" }, { at: 0.4, hex: "#6a5222" }, { at: 1, hex: "#7a4a22" }], roughness: 0.35, clearcoat: 0.4, texture: "none" },
  },
  layout: { spacing: 15, clumpRadius: 12 },
  seedling: 0.04,
  blueprint: {
    phyllotaxy: "Leaves crowded at the ends of short shoots (10–16 per tip) and spaced 3 cm along them; obovate, 0.65 as wide as long, 4–5 rounded lobes a side cut 50% in, small auricles at the base, 5 laterals at 50°. Drawn 2.2 × life size so the canopy reads as a mass at tree scale with the leaf counts a GPU can draw (stated stylization: a real crown has about ten times more leaves). Acorns on 6 cm stalks on 12% of shoots from stage 0.7.",
    skeleton: "Trunk to 0.3 H (radius 0.045 H) with root flare; 5–8 massive limbs leave from the upper 45% at 35–70°, crooked (wander 22°) and turning up; crooked branches carry twigs whose outer 60% bear 10–16 short leafy shoots (0.22 of the twig): the clumps that make the billowy crown.",
    surface: "Deeply fissured grey-brown bark (#4a4232 → #5f5644, toward the photo's p75 #544a32), leaves #46551f → #505e25 (leaf photo p25–p50).",
    layout: "Parkland trees 15 m apart, clumps of 12 m.",
  },
};

export const JAPANESE_MAPLE: SpeciesMorphologyProfile = {
  id: "acer-palmatum", name: "Japanese maple", scientificName: "Acer palmatum", family: "Sapindaceae", habit: "tree",
  summary: "A small tree with a low, layered, dome-shaped crown of opposite, horizontal branches and palmately lobed leaves with five to nine sharp lobes.",
  sources: [
    wiki("Acer_palmatum", ["Typically 6–10 m; crown often dome-shaped.", "Leaves 4–12 cm long and wide, palmately lobed with 5, 7 or 9 sharply pointed lobes; double or single serrate.", "Colours vary by cultivar, from green to red and purple; strong autumn colour."]),
  ],
  size: { height: range(4, 7, 10, "reported", "wiki-acer-palmatum") },
  measured: { leafWidth: range(0.04, 0.07, 0.12, "reported", "wiki-acer-palmatum") },
  root: "trunk",
  axes: [
    { id: "trunk", kind: "trunk", surface: "bark", length: { of: "height", ratio: 0.18, spread: 0.2 }, radius: { of: "height", ratio: 0.022, tip: 0.7 }, flare: { height: 1, amount: 0.15, lobes: 5 }, nodes: 8, wander: 10,
      children: [{ rule: "limb", from: 0.6, to: 1, count: [4, 6] }] },
    { id: "limb", kind: "limb", surface: "bark", length: { of: "height", ratio: 0.55, spread: 0.2 }, radius: { of: "parent", ratio: 0.5, tip: 0.25 }, swell: 0.2, nodes: 10, angle: [55, 35], gravity: 1.4, upturn: 6, wander: 16,
      children: [{ rule: "branch", from: 0.15, to: 1, perMetre: 2.5, whorl: 2 }] },
    { id: "branch", kind: "branch", surface: "bark", length: { of: "parent", ratio: 0.45, spread: 0.3 }, radius: { of: "parent", ratio: 0.45, tip: 0.3 }, nodes: 8, angle: [65, 45], divergence: 90, gravity: 2.2, wander: 14,
      children: [{ rule: "twig", from: 0.1, to: 1, perMetre: 6, whorl: 2 }] },
    { id: "twig", kind: "twig", surface: "twig", length: { of: "parent", ratio: 0.4, spread: 0.3 }, radius: { of: "parent", ratio: 0.5, tip: 0.4 }, nodes: 5, angle: [60, 45], divergence: 90, gravity: 2.5, wander: 12 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.03, 0.045, 0.06, "estimated"), width: 0.44, widestAt: 0.42, baseShape: 0.4, apexShape: 1.35, margin: { kind: "serrate", count: 12, depth: 0.05 },
      veins: { style: "pinnate", laterals: 8, angle: 45, midrib: 0.06 }, fold: 8, droop: 0.6, droopPitch: 10,
      stalk: { length: 0.04, radius: 0.0008, surface: "twig" }, leaflets: { count: range(5, 7, 9, "reported", "wiki-acer-palmatum"), spread: 230 } },
  },
  placements: [
    { organ: "leaf", on: "twig", place: "along", from: 0.15, to: 1, spacing: 0.03, perNode: 2, divergence: 90, angle: [55, 45], scale: [1.4, 1.4] },
    { organ: "leaf", on: "twig", place: "tip", count: [3, 5], angle: [30, 55], scale: [1.4, 1.4] },
    { organ: "leaf", on: "branch", place: "along", from: 0.4, to: 1, spacing: 0.05, perNode: 2, divergence: 90, angle: [55, 45], scale: [1.4, 1.4] },
  ],
  surfaces: {
    bark: { colour: [{ at: 0, hex: "#55544c" }, { at: 1, hex: "#625c52" }], roughness: 0.7, texture: "bark-folds", tile: 0.6, relief: 0.015, scan: polyHavenScan("trident_maple_bark", 1.8) },
    twig: { colour: [{ at: 0, hex: "#6a4a3a" }, { at: 1, hex: "#7a5040" }], roughness: 0.6, texture: "stem", tile: 0.2 },
    leaf: { colour: [{ at: 0, hex: "#4f7028" }, { at: 1, hex: "#5c802e" }], back: "#7d9a5e", roughness: 0.5, texture: "leaf-veins" },
  },
  layout: { spacing: 6, clumpRadius: 5 },
  seedling: 0.05,
  blueprint: {
    phyllotaxy: "Opposite, decussate (whorls of two at 90°) branches and leaves; leaves every 3 cm in pairs along the twigs and 3–5 at the tips, drawn 1.4 × life size (stated stylization). Each leaf is 5–9 ovate-lanceolate lobes (4.5 cm, 44% as wide, finely serrate, acuminate) fanned over 230° from a 4 cm petiole; their broad bases overlap into the joined palm of the leaf.",
    skeleton: "Short trunk (0.18 H) with 4–6 limbs spreading 35–55°, then opposite branches and twigs that lie flat under their weight (elastica G 2.2–2.5): the layered dome.",
    surface: "Smooth grey bark, reddish twigs, summer-green leaves (estimated colours: no photo could be downloaded).",
    layout: "Garden specimens 6 m apart.",
  },
};

export const FIDDLE_LEAF_FIG: SpeciesMorphologyProfile = {
  id: "ficus-lyrata", name: "Fiddle-leaf fig", scientificName: "Ficus lyrata", family: "Moraceae", habit: "tree",
  summary: "A house plant on a single grey stem: large, leathery, glossy leaves shaped like a fiddle, broad at the tip and narrow in the middle, with wavy edges and pale veins.",
  sources: [
    wiki("Ficus_lyrata", ["9–12 m outdoors; house plants stay smaller.", "Leaves up to 45 × 30 cm, usually smaller, often lyre or fiddle shaped with a broad tip and narrow middle; wavy margin; prominent veins; leathery."]),
  ],
  size: { height: range(1.2, 1.8, 3, "estimated", "wiki-ficus-lyrata") },
  measured: { leafLength: range(0.2, 0.3, 0.45, "reported", "wiki-ficus-lyrata") },
  root: "stem",
  axes: [
    { id: "stem", kind: "trunk", surface: "bark", length: { of: "height", ratio: 1 }, radius: { of: "height", ratio: 0.012, tip: 0.5 }, nodes: 14, wander: 8, gravity: 0.3 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.2, 0.3, 0.45, "reported", "wiki-ficus-lyrata"), width: 0.62, widestAt: 0.72, baseShape: 0.5, apexShape: 0.55, lobe: 0.03,
      waist: { at: 0.42, depth: 0.14 }, margin: { kind: "undulate", count: 4, depth: 0.04 }, veins: { style: "pinnate", laterals: 7, angle: 62, curve: 0.35, midrib: 0.05 },
      fold: -4, cup: -0.03, corrugation: 0.025, droop: 1.6, droopPitch: 10, stalk: { length: 0.04, radius: 0.004, surface: "bark" } },
  },
  placements: [{ organ: "leaf", on: "stem", place: "along", from: 0.3, to: 1, spacing: 0.05, angle: [58, 25], scale: [1, 0.75] }],
  surfaces: {
    bark: { colour: [{ at: 0, hex: "#58523f" }, { at: 1, hex: "#5f6a3e" }], roughness: 0.75, texture: "bark-ringed", tile: 0.3, relief: 0.02, scan: polyHavenScan("chinese_hackberry_bark", 1.8) },
    leaf: { colour: [{ at: 0, hex: "#3c5a26" }, { at: 1, hex: "#4a6a2c" }], back: "#6f8a58", roughness: 0.42, clearcoat: 0.3, texture: "leaf-veins" },
  },
  layout: { spacing: 1 },
  seedling: 0.15,
  blueprint: {
    phyllotaxy: "Leaves in a golden-angle spiral every 5 cm on the upper 70% of the stem (pruned below), 25–58° from the stem, smaller toward the tip. Blade 30 cm (up to 45), widest at 72% with a 14% waist at 42% (the fiddle), blunt broad tip, wavy edge, 7 curved laterals at 62°, gently pleated.",
    skeleton: "One stem (radius 0.012 H) that leans a little under its leaves.",
    surface: "Glossy leathery leaves (clear coat 0.3) with pale veins; grey stem. Colours estimated (no photo downloaded).",
    layout: "Pots 1 m apart.",
  },
};

export const SNAKE_PLANT: SpeciesMorphologyProfile = {
  id: "dracaena-trifasciata", name: "Snake plant", scientificName: "Dracaena trifasciata 'Laurentii'", family: "Asparagaceae", habit: "rosette",
  summary: "Stiff, upright, sword-shaped leaves in small rosettes on a creeping rhizome: dark green with pale zigzag cross-bands and yellow margins.",
  sources: [
    wiki("Dracaena_trifasciata", ["Mature leaves 70–90 cm long and 5–6 cm wide, stiff, upright from a basal rosette, sharp margins.", "Deep green with paler grey-green cross-bands; 'Laurentii' and others have yellow margins.", "Creeping rhizome forms dense clumps."]),
    { id: "laurentii-photo", title: "Snake Plant (Sansevieria trifasciata 'Laurentii')", url: commons("Snake_Plant_(Sansevieria_trifasciata_'Laurentii').jpg"), kind: "photo", rights: "CC BY-SA", creator: "Mokkie",
      observed: ["Bands are zigzag chevrons across the leaf; the yellow margin is about a tenth of the width each side.", "Dark p50 #29451e, bands p75 #587140, margin p50 #b1b65e."] },
  ],
  size: { height: range(0.5, 0.8, 1.2, "estimated", "wiki-dracaena-trifasciata") },
  measured: { leafLength: range(0.7, 0.8, 0.9, "reported", "wiki-dracaena-trifasciata") },
  root: "stem",
  axes: [
    { id: "stem", kind: "stem", surface: "rhizome", length: { of: "height", ratio: 0.05 }, radius: { of: "height", ratio: 0.04, tip: 0.9 }, nodes: 3,
      children: [{ rule: "offset", from: 0, to: 0.3, count: [1, 3] }] },
    { id: "offset", kind: "stem", surface: "rhizome", length: { of: "height", ratio: 0.22, spread: 0.3 }, radius: { of: "parent", ratio: 0.7, tip: 0.9 }, nodes: 4, angle: [86, 94], upturn: 85, onset: 0.4 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.5, 0.75, 0.9, "reported", "wiki-dracaena-trifasciata"), width: 0.075, widestAt: 0.55, baseShape: 0.8, apexShape: 1.3,
      veins: { style: "parallel", laterals: 6, angle: 3, midrib: 0.02 }, fold: 30, droop: 0.15, droopPitch: 85, twist: 18, thickness: 0.003 },
  },
  placements: [
    { organ: "leaf", on: "stem", place: "rosette", count: [6, 10], angle: [3, 22], scale: [0.6, 1], core: 0.02, rise: 0.01 },
    { organ: "leaf", on: "offset", place: "rosette", count: [4, 7], angle: [3, 18], scale: [0.4, 0.7], core: 0.015, rise: 0.008 },
  ],
  surfaces: {
    leaf: { colour: [{ at: 0, hex: "#26401c" }, { at: 1, hex: "#29451e" }], back: "#2f4a24", rim: { hex: "#b1b65e", width: 0.12 }, roughness: 0.45, clearcoat: 0.3, texture: "banded" },
    rhizome: { colour: [{ at: 0, hex: "#8a7a5a" }, { at: 1, hex: "#7a7050" }], roughness: 0.8, texture: "root" },
  },
  layout: { spacing: 0.4, clumpRadius: 0.3, density: 9 },
  seedling: 0.2,
  blueprint: {
    phyllotaxy: "Rosettes of 6–10 leaves at the golden angle, nearly upright (3° inside to 22° outside); new rosettes on rhizome offsets from stage 0.4. Leaves 75 cm (reported 70–90), 7.5% as wide, channelled (fold 30°), twisted 18°, 3 mm thick.",
    skeleton: "A short rhizome crown; 1–3 offsets run out horizontally and turn up (upturn 85°).",
    surface: "Dark green (#29451e sampled) with zigzag light cross-bands from the banded map, yellow margins (#b1b65e) over the outer 12% of the half-width, some gloss.",
    layout: "Clumps of 30 cm radius, 9 per m² in beds.",
  },
};

export const ALOE_VERA: SpeciesMorphologyProfile = {
  id: "aloe-vera", name: "Aloe vera", scientificName: "Aloe vera", family: "Asphodelaceae", habit: "rosette",
  summary: "A stemless rosette of thick, grey-green, channelled leaves with small pale teeth on the margins and white flecks, spreading by offsets.",
  sources: [
    wiki("Aloe_vera", ["Stemless or very short-stemmed, 60–100 cm tall, spreading by offsets.", "Leaves thick and fleshy, green to grey-green, some with white flecks; margins serrated with small white teeth.", "Flower spike up to 90 cm with yellow tubular flowers 2–3 cm."]),
  ],
  size: { height: range(0.6, 0.8, 1, "reported", "wiki-aloe-vera") },
  root: "stem",
  axes: [
    { id: "stem", kind: "stem", surface: "stem", length: { of: "height", ratio: 0.06 }, radius: { of: "height", ratio: 0.05, tip: 0.9 }, nodes: 3,
      children: [{ rule: "offset", from: 0, to: 0.2, count: [1, 4] }] },
    { id: "offset", kind: "stem", surface: "stem", length: { of: "height", ratio: 0.35, spread: 0.3 }, radius: { of: "parent", ratio: 0.5, tip: 0.9 }, nodes: 4, angle: [88, 95], gravity: 0.5, upturn: 80, onset: 0.5 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.3, 0.45, 0.6, "estimated"), width: 0.16, widestAt: 0.15, baseShape: 0.4, apexShape: 1.2, margin: { kind: "serrate", count: 16, depth: 0.08 },
      veins: { style: "parallel", laterals: 4, angle: 3, midrib: 0.03 }, thickness: 0.022, keel: 0.4, cup: 0.18, droop: 0.6, droopPitch: 50 },
  },
  placements: [
    { organ: "leaf", on: "stem", place: "rosette", count: [14, 20], angle: [12, 70], scale: [0.45, 1], core: 0.025, rise: 0.06 },
    { organ: "leaf", on: "offset", place: "rosette", count: [7, 11], angle: [12, 60], scale: [0.2, 0.45], core: 0.012, rise: 0.025 },
  ],
  surfaces: {
    leaf: { colour: [{ at: 0, hex: "#6d8a5a" }, { at: 1, hex: "#7a9668" }], back: "#7f9a6c", rim: { hex: "#c8d0a8", width: 0.1 }, roughness: 0.5, sheen: 0.3, sheenColour: "#e0eadc", texture: "spotted" },
    stem: { colour: [{ at: 0, hex: "#6f7a5a" }, { at: 1, hex: "#7a8466" }], roughness: 0.7, texture: "stem" },
  },
  layout: { spacing: 0.6, clumpRadius: 0.4, density: 4 },
  seedling: 0.15,
  blueprint: {
    phyllotaxy: "14–20 leaves at the golden angle rising 6 cm round a 2.5 cm core: inner ones at 12°, outer ones spreading to 70° and arching (G 0.6). Leaves 45 cm (estimated), widest at the base (16% as wide), tapering to a point, 2.2 cm thick with a keel, channelled above, 16 small teeth a side.",
    skeleton: "Stemless; 1–4 offsets on short stolons from stage 0.5, each with a small rosette.",
    surface: "Grey-green (estimated) with pale flecks from the spotted map, pale toothed rim, a soft bloom (sheen 0.3).",
    layout: "Clumps of 40 cm radius, 4 per m².",
  },
};

export const TULIP: SpeciesMorphologyProfile = {
  id: "tulipa-gesneriana", name: "Garden tulip", scientificName: "Tulipa gesneriana", family: "Liliaceae", habit: "herb",
  summary: "A single stem from a bulb with two to four broad, glaucous, wavy leaves at its foot and one erect, cup-shaped flower of six tepals in two whorls.",
  sources: [
    wiki("Tulipa_gesneriana", ["Bulbous herb with ovate-lanceolate leaves; offsets from the bulb.", "One erect, broadly cup-shaped flower per stem with smooth, blunt tepals; six stamens, three carpels."]),
  ],
  size: { height: range(0.3, 0.45, 0.65, "estimated", "wiki-tulipa-gesneriana") },
  root: "stem",
  axes: [
    { id: "stem", kind: "stem", surface: "stem", length: { of: "height", ratio: 0.92 }, radius: { of: "height", ratio: 0.012, tip: 0.85 }, nodes: 10, gravity: 0.2, tipLoad: 0.6, wander: 5 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.15, 0.22, 0.3, "estimated"), width: 0.36, widestAt: 0.3, baseShape: 0.6, apexShape: 1,
      veins: { style: "parallel", laterals: 9, angle: 3, midrib: 0.02 }, fold: 26, cup: 0.06, droop: 2.2, droopPitch: 70, ruffle: 0.03 },
    flower: { kind: "corolla", count: 6, arrangement: "whorled", perWhorl: 3, angle: [6, 20], scale: [0.86, 1],
      petal: { kind: "blade", surface: "tepal", length: range(0.05, 0.065, 0.08, "estimated"), width: 0.7, widestAt: 0.62, baseShape: 0.9, apexShape: 0.55,
        veins: { style: "parallel", laterals: 9, angle: 3, midrib: 0.02 }, cup: 0.8, droop: -0.6, droopPitch: 0 },
      stamens: { count: 6, length: 0.022, surface: "anther" } },
  },
  placements: [
    { organ: "leaf", on: "stem", place: "along", from: 0, to: 0.2, count: [2, 4], angle: [28, 18], scale: [1, 0.75] },
    { organ: "flower", on: "stem", place: "tip", angle: [0, 0] },
  ],
  surfaces: {
    stem: { colour: [{ at: 0, hex: "#5a7a4a" }, { at: 1, hex: "#6a8a52" }], roughness: 0.5, sheen: 0.3, sheenColour: "#d0dcd0", texture: "stem", tile: 0.2 },
    leaf: { colour: [{ at: 0, hex: "#5f7f5a" }, { at: 1, hex: "#6f8f66" }], back: "#7a9a72", roughness: 0.55, sheen: 0.35, sheenColour: "#d8e4dc", texture: "parallel-veins" },
    tepal: { colour: [{ at: 0, hex: "#e8c020" }, { at: 0.12, hex: "#c4161c" }, { at: 1, hex: "#d81e24" }], back: "#b8141a", roughness: 0.45, sheen: 0.4, sheenColour: "#ff8a80", texture: "petal" },
    anther: { colour: [{ at: 0, hex: "#3a3020" }, { at: 1, hex: "#2a2422" }], roughness: 0.7, texture: "none" },
  },
  layout: { spacing: 0.12, rowPitch: 0.25, density: 60 },
  seedling: 0.1,
  blueprint: {
    phyllotaxy: "2–4 leaves in a spiral clasping the lowest fifth of the stem, arching out (G 2.2), channelled and wavy-edged. Flower: six tepals in two whorls of three (the inner whorl turned 60°, 86% size, 6° from the axis; the outer 20°), deep spoons (cup 0.8) a little incurved at the tip (negative droop), opening from stage 0.45; six dark stamens.",
    skeleton: "One stem (0.92 H) that bends a little under the flower (tip load 0.6).",
    surface: "Red tepals (#c4161c) with a yellow base, a soft sheen; glaucous blue-green leaves with bloom. Colours estimated (no photo downloaded).",
    layout: "Bulb fields in rows 25 cm apart, 12 cm between bulbs (estimated), 60 per m² in beds.",
  },
};

export const LAVENDER: SpeciesMorphologyProfile = {
  id: "lavandula-angustifolia", name: "English lavender", scientificName: "Lavandula angustifolia", family: "Lamiaceae", habit: "shrub",
  summary: "A rounded, woody-based shrub of many upright grey-green shoots with narrow opposite leaves, crowned in summer by purple flower spikes on long bare stalks.",
  sources: [
    wiki("Lavandula_angustifolia", ["A strongly aromatic shrub about 1–2 m tall.", "Leaves 2–6 cm long and 4–6 mm wide.", "Purple flowers on spikes 2–8 cm long at the top of leafless stems 10–30 cm long."]),
  ],
  size: { height: range(0.4, 0.7, 2, "estimated", "wiki-lavandula-angustifolia") },
  root: "base",
  axes: [
    { id: "base", kind: "stem", surface: "wood", length: { of: "height", ratio: 0.12 }, radius: { of: "height", ratio: 0.03, tip: 0.8 }, nodes: 4, wander: 10,
      children: [{ rule: "shoot", from: 0.5, to: 1, count: [40, 70] }] },
    { id: "shoot", kind: "stem", surface: "shoot", length: { of: "height", ratio: 0.45, spread: 0.25 }, radius: { of: "parent", ratio: 0.12, tip: 0.6 }, nodes: 6, angle: [62, 8], gravity: 0.3, upturn: 22, wander: 10,
      children: [{ rule: "spike", from: 1, to: 1, count: [1, 1] }] },
    { id: "spike", kind: "peduncle", surface: "shoot", length: { of: "height", ratio: 0.38, spread: 0.2 }, radius: { of: "parent", ratio: 0.6, tip: 0.7 }, nodes: 6, angle: [4, 4], gravity: 0.25, upturn: 6, wander: 6, onset: 0.55 },
  ],
  organs: {
    leaf: { kind: "blade", surface: "leaf", length: range(0.02, 0.04, 0.06, "reported", "wiki-lavandula-angustifolia"), width: 0.12, widestAt: 0.5, baseShape: 0.8, apexShape: 0.9,
      veins: { style: "parallel", laterals: 2, angle: 3, midrib: 0.1 }, fold: 20, droop: 0.5, droopPitch: 40 },
    floret: { kind: "bud", surface: "flower", length: range(0.006, 0.008, 0.01, "estimated"), width: 0.45 },
  },
  placements: [
    { organ: "leaf", on: "shoot", place: "along", from: 0.1, to: 1, spacing: 0.012, perNode: 2, divergence: 90, angle: [50, 35] },
    { organ: "floret", on: "spike", place: "along", from: 0.72, to: 1, spacing: 0.006, perNode: 6, divergence: 30, angle: [55, 30] },
  ],
  surfaces: {
    wood: { colour: [{ at: 0, hex: "#6a5a44" }, { at: 1, hex: "#7a6a50" }], roughness: 0.85, texture: "bark-fissured", tile: 0.2, relief: 0.03, scan: polyHavenScan("bark_willow", 1) },
    shoot: { colour: [{ at: 0, hex: "#7f8f6a" }, { at: 1, hex: "#8a9a74" }], roughness: 0.75, sheen: 0.5, sheenColour: "#dfe6d8", texture: "stem", tile: 0.2 },
    leaf: { colour: [{ at: 0, hex: "#7f8f78" }, { at: 1, hex: "#8a9a80" }], back: "#9aa892", roughness: 0.75, sheen: 0.6, sheenColour: "#d8e0d4", texture: "parallel-veins" },
    flower: { colour: [{ at: 0, hex: "#5f4a8a" }, { at: 1, hex: "#7a5fae" }], roughness: 0.7, sheen: 0.4, sheenColour: "#c8b8f0", texture: "none" },
  },
  layout: { spacing: 0.9, rowPitch: 1.4, clumpRadius: 0.8 },
  seedling: 0.15,
  blueprint: {
    phyllotaxy: "Opposite, decussate leaves (pairs turned 90°) every 1.2 cm on the shoots, 4 cm by 5 mm (reported 2–6 cm by 4–6 mm). Flower spikes on the top 28% of bare stalks: whorls of six florets every 6 mm (verticillasters), turned 30° each whorl.",
    skeleton: "A short woody base with 40–70 shoots from its top half: outer ones leave at 62°, inner ones at 8°, all turning up (upturn 22°), so the shrub is a dome. Each shoot ends in a leafless stalk (0.38 H) from stage 0.55.",
    surface: "Grey-green felted leaves and shoots (sheen 0.5–0.6), purple florets (#5f4a8a → #7a5fae). Colours estimated (no photo downloaded).",
    layout: "Field rows 1.4 m apart, plants 0.9 m apart (estimated).",
  },
};

export const SAGUARO: SpeciesMorphologyProfile = {
  id: "carnegiea-gigantea", name: "Saguaro", scientificName: "Carnegiea gigantea", family: "Cactaceae", habit: "tree",
  summary: "A tall ribbed column with spines on every rib, branching at maturity into arms that leave sideways and turn up.",
  sources: [
    wiki("Carnegiea_gigantea", ["3–16 m tall, the tallest measured 23.8 m; stem up to 75 cm across.", "Spines up to 7 cm; arms start at 75–100 years; over 50 arms are possible, and some plants never branch.", "Age by height: 1.5 m ≈ 27 years, 3 m ≈ 41, 6 m ≈ 83, 10.7 m ≈ 157."]),
  ],
  size: { height: range(3, 10, 16, "reported", "wiki-carnegiea-gigantea") },
  root: "stem",
  axes: [
    { id: "stem", kind: "trunk", surface: "skin", length: { of: "height", ratio: 1 }, radius: { of: "height", ratio: 0.028, tip: 0.8 }, profile: [[0, 0.85], [0.15, 1], [0.85, 1], [1, 0.75]],
      ribs: { count: 14, depth: 0.12 }, nodes: 18, wander: 4,
      children: [{ rule: "arm", from: 0.35, to: 0.65, count: [2, 5] }] },
    { id: "arm", kind: "limb", surface: "skin", length: { of: "height", ratio: 0.38, spread: 0.3 }, radius: { of: "parent", ratio: 0.78, tip: 0.75 }, profile: [[0, 0.8], [0.2, 1], [0.9, 1], [1, 0.75]],
      ribs: { count: 12, depth: 0.12 }, nodes: 14, angle: [82, 72], upturn: 120, wander: 4, swell: 0.1, onset: 0.6 },
  ],
  organs: {
    spine: { kind: "bud", surface: "spine", length: range(0.02, 0.04, 0.07, "reported", "wiki-carnegiea-gigantea"), width: 0.06 },
  },
  placements: [
    { organ: "spine", on: "stem", place: "along", from: 0.03, to: 0.99, spacing: 0.035, perNode: 14, divergence: 0, phase: 0, angle: [90, 90], offset: 1 },
    { organ: "spine", on: "arm", place: "along", from: 0.05, to: 0.99, spacing: 0.035, perNode: 12, divergence: 0, phase: 0, angle: [90, 90], offset: 1 },
  ],
  surfaces: {
    skin: { colour: [{ at: 0, hex: "#4f6a3a" }, { at: 1, hex: "#5a7444" }], roughness: 0.6, sheen: 0.2, sheenColour: "#d8e0c8", texture: "cactus", tile: 0.6 },
    spine: { colour: [{ at: 0, hex: "#8a7f6a" }, { at: 1, hex: "#b8ab90" }], roughness: 0.6, texture: "none" },
  },
  layout: { spacing: 10, clumpRadius: 15 },
  seedling: 0.03,
  blueprint: {
    phyllotaxy: "Spines in clusters on every rib crest every 3.5 cm (an organ ring per node, phase 0 so they sit on the crests), pointing out; up to 7 cm long (reported).",
    skeleton: "One column (radius 0.028 H, narrower at the foot, domed at the top) with 14 ribs (estimated) cut 12% deep. From growth stage 0.6 (about 75 years), 2–5 arms leave the middle third sideways (72–82° from the column) and turn up 120° over their length.",
    surface: "Dusty waxy green (#4f6a3a → #5a7444, estimated) with fine vertical striations from the cactus map; grey-tan spines.",
    layout: "Desert stands 10 m apart in clumps of 15 m.",
  },
};

export const BOSTON_FERN: SpeciesMorphologyProfile = {
  id: "nephrolepis-exaltata", name: "Boston fern", scientificName: "Nephrolepis exaltata 'Bostoniensis'", family: "Nephrolepidaceae", habit: "herb",
  summary: "A clump of long, gracefully arching fronds from a short crown, each with many small toothed pinnae close together on both sides of the rachis.",
  sources: [
    wiki("Nephrolepis_exaltata", ["40–90 cm tall, sometimes 1.5 m; fronds 50–250 cm long and 6–15 cm wide.", "Pinnae alternate, 2–8 cm, slightly serrate, less than 1 cm apart; 'Bostoniensis' has arching fronds."]),
  ],
  size: { height: range(0.4, 0.6, 0.9, "reported", "wiki-nephrolepis-exaltata") },
  root: "crown",
  axes: [
    { id: "crown", kind: "stem", surface: "rachis", length: { of: "height", ratio: 0.05 }, radius: { of: "height", ratio: 0.06, tip: 0.8 }, nodes: 3,
      children: [{ rule: "frond", from: 0.8, to: 1, count: [45, 70] }] },
    { id: "frond", kind: "petiole", surface: "rachis", length: { of: "height", ratio: 1.4, spread: 0.3 }, radius: { of: "parent", ratio: 0.08, tip: 0.4 }, nodes: 12, angle: [55, 8], divergence: 137.5, gravity: 5, wander: 8 },
  ],
  organs: {
    pinna: { kind: "blade", surface: "leaf", length: range(0.02, 0.05, 0.08, "reported", "wiki-nephrolepis-exaltata"), width: 0.22, widestAt: 0.3, baseShape: 0.5, apexShape: 0.9, margin: { kind: "serrate", count: 10, depth: 0.05 },
      veins: { style: "pinnate", laterals: 6, angle: 60, midrib: 0.06 }, fold: 6, droop: 0.5, droopPitch: 0 },
  },
  placements: [{ organ: "pinna", on: "frond", place: "along", from: 0.08, to: 1, spacing: 0.012, sides: true, lift: 15, angle: [80, 60], scale: [0.6, 1.15, 0.4] }],
  surfaces: {
    rachis: { colour: [{ at: 0, hex: "#5a6a3a" }, { at: 1, hex: "#6a7a40" }], roughness: 0.6, texture: "stem", tile: 0.2 },
    leaf: { colour: [{ at: 0, hex: "#4f7a2a" }, { at: 1, hex: "#5d8a32" }], back: "#8aa86a", roughness: 0.5, texture: "leaf-veins" },
  },
  layout: { spacing: 0.8 },
  seedling: 0.15,
  blueprint: {
    phyllotaxy: "45–70 fronds at the golden angle from a short crown: outer ones leave at 55° and arch over (G 5), inner ones at 8°. Pinnae in pairs every 1.2 cm on both sides of the rachis, raised 15°, 60% size at the base, 115% mid-frond, 40% at the tip; oblong-lanceolate, toothed, 5 cm.",
    skeleton: "Fronds 1.4 × the plant height long, so the outer ones arch down past the crown like a fountain.",
    surface: "Fresh green pinnae (estimated) with veins; pale underside.",
    layout: "Pots 80 cm apart.",
  },
};

/** The popular plants added in the second round. */
export const POPULAR_PROFILES: readonly SpeciesMorphologyProfile[] = [COCONUT_PALM, ENGLISH_OAK, JAPANESE_MAPLE, FIDDLE_LEAF_FIG, SNAKE_PLANT, ALOE_VERA, TULIP, LAVENDER, SAGUARO, BOSTON_FERN];
