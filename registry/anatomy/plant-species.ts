/**
 * FLORA1 species: one record per plant, stating only how it differs from its growth form (`plant-forms.ts`).
 *
 * A record holds what stays true in every art style:
 * - sizes with sources;
 * - architecture overrides;
 * - leaf, flower, fruit and bark (the shapes come from `plant-organs.ts`);
 * - the seasons (when it leafs, blooms, colours, fruits) and its colours in each;
 * - sounds, culture, public-domain or CC0 references, and where it is already drawn in this library.
 *
 * Sizes are graded:
 * - "reported": from the cited source (Wikipedia species articles, retrieved 2026-11-15);
 * - "estimated": no direct source.
 *
 * Months are for Japan's main islands. Colours are starting points read from references, not measurements.
 */
import { commons as C, range as r, wikipedia as W } from "./foundation-shapes";
import type { FoundationReference, FoundationSound, Range, StyleImplementation } from "./foundation-shapes";
import type { BudPlan, GrowthFormId, PlantArchitecture } from "./plant-forms";
import type { BarkKind, FlowerSpec, FruitShape, LeafSpec } from "./plant-organs";

type Deep<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface PlantSpecies {
  id: string;
  name: string;
  ja: { kana: string; kanji?: string; romaji: string };
  scientific: string;
  form: GrowthFormId;
  /** Height in metres; trunk diameter in cm; crown spread in metres. */
  size: { height: Range; trunk?: Range; crown?: Range };
  architecture?: Deep<PlantArchitecture>;
  leaf: LeafSpec & { length: Range; arrangement: BudPlan; evergreen: boolean;
    /** Leaf colours: new leaves, summer, autumn (deciduous or seasonal). */
    colours: { spring?: string; summer: string; autumn?: string } };
  flower?: FlowerSpec & { diameter: Range; colours: readonly string[]; months: readonly Month[]; inflorescence: "solitary" | "cluster" | "raceme" | "panicle" | "head" | "plume";
    /** Flowers before the leaves (on bare wood), with them, or after. */
    timing: "before-leaves" | "with-leaves" | "after-leaves"; fragrant?: boolean };
  fruit?: { shape: FruitShape; size: Range; colour: string; months: readonly Month[] };
  bark: { kind: BarkKind; colour: string; note: string };
  /** Months in leaf (deciduous trees) and in autumn colour. */
  seasons: { leaf?: readonly Month[]; autumn?: readonly Month[] };
  sounds: readonly FoundationSound[];
  culture: readonly string[];
  references: readonly FoundationReference[];
  sources: readonly { title: string; url: string }[];
  styles: readonly StyleImplementation[];
}

const uk = (id: string, note?: string): StyleImplementation => ({ style: "ukiyo-e", pack: "ukiyoe-handscroll", id, note });
const SZ = (file: string, title: string): FoundationReference => ({ title: `Siebold & Zuccarini, Flora Japonica: ${title}`, url: C(file), rights: "public-domain", kind: "plate" });
const est = (min: number, typical: number, max: number) => r(min, typical, max, "estimated");
const DECIDUOUS: readonly Month[] = [4, 5, 6, 7, 8, 9, 10, 11];
const WIND_LEAVES: FoundationSound = { kind: "ambience", label: "wind in leaves", query: "wind rustling leaves trees" };

export const PLANT_SPECIES: readonly PlantSpecies[] = [
  {
    id: "japanese-black-pine", name: "Japanese black pine", ja: { kana: "クロマツ", kanji: "黒松", romaji: "kuromatsu" }, scientific: "Pinus thunbergii", form: "pine",
    size: { height: r(10, 20, 40, "reported", "Pinus thunbergii: up to 40 m, rarely outside its range") },
    architecture: { trunk: { lean: 14, wander: .7 }, crown: { shape: "umbrella", width: .8, base: .45 } },
    leaf: { shape: "needle-pair", width: .02, length: r(6, 9, 12, "reported", "Pinus thunbergii: needles in pairs, 6–12 cm"), arrangement: "whorled", evergreen: true, colours: { summer: "#2c4a2e" } },
    fruit: { shape: "cone", size: r(4, 5.5, 7, "reported", "Pinus thunbergii: cones 4–7 cm"), colour: "#a88f68", months: [10, 11] },
    bark: { kind: "plated", colour: "#3a3533", note: "Grey-brown when young; dark blackish-grey and plated on the trunk, thick on old trees (reported)." },
    seasons: {}, sounds: [{ kind: "ambience", label: "wind in the pines (matsukaze)", query: "wind in pine trees" }, { kind: "ambience", label: "surf beyond a coastal pine grove", catalog: "bed-surf-beach" }],
    culture: ["One of the Three Friends of Winter (shō-chiku-bai) with bamboo and plum: longevity and constancy.", "Coastal groves such as Miho no Matsubara; the painted pine behind every Noh stage.", "Matsukaze, the wind in the pines: a Noh play and the sound of the tea kettle."],
    references: [SZ("Pinus_massoniana_SZ113.png", "Pinus thunbergii (as P. massoniana), pl. 113"), SZ("Pinus_massoniana_SZ114.png", "Pinus thunbergii (as P. massoniana), pl. 114")],
    sources: [W("Pinus_thunbergii")], styles: [uk("pine", "Motif: grown by FLORA1; leaning trunk, whorled tiers of flat needle pads.")],
  },
  {
    id: "japanese-red-pine", name: "Japanese red pine", ja: { kana: "アカマツ", kanji: "赤松", romaji: "akamatsu" }, scientific: "Pinus densiflora", form: "pine",
    size: { height: r(20, 27, 35, "reported", "Pinus densiflora: 20–35 m"), crown: r(8, 15, 30, "reported", "Pinus densiflora: crown up to 30 m") },
    architecture: { trunk: { lean: 10, wander: .8, clearBole: .5 }, crown: { shape: "umbrella", width: .6, base: .55 } },
    leaf: { shape: "needle-pair", width: .02, length: r(8, 10, 12, "reported", "Pinus densiflora: needles 8–12 cm, two per fascicle"), arrangement: "whorled", evergreen: true, colours: { summer: "#3d5a32" } },
    fruit: { shape: "cone", size: r(4, 5, 7, "reported", "Pinus densiflora: cones 4–7 cm"), colour: "#9c7e58", months: [10, 11] },
    bark: { kind: "plated", colour: "#b45a32", note: "Orange-red, cracked into irregular scales (reported); the red trunk is the mark of the inland pine." },
    seasons: {}, sounds: [{ kind: "ambience", label: "wind in the pines", query: "wind in pine trees" }],
    culture: ["The pine of inland hills and temple gardens; matsutake mushrooms grow under it.", "'Matsu' heard as 'to wait': the tree that waited for the gods."],
    references: [SZ("Pinus_densiflora_SZ112.png", "Pinus densiflora, pl. 112")], sources: [W("Pinus_densiflora")], styles: [uk("pine", "Red-barked variant through the trunk colour.")],
  },
  {
    id: "japanese-cedar", name: "Japanese cedar (sugi)", ja: { kana: "スギ", kanji: "杉", romaji: "sugi" }, scientific: "Cryptomeria japonica", form: "conifer-spire",
    size: { height: r(30, 45, 60, "reported", "Cryptomeria: up to 60 m"), trunk: r(100, 200, 400, "reported", "Cryptomeria: trunk up to 4 m diameter") },
    leaf: { shape: "awl", width: .2, length: r(.5, .8, 1, "reported", "Cryptomeria: leaves 0.5–1 cm, spiral"), arrangement: "spiral", evergreen: true, colours: { summer: "#2f5034", autumn: "#6b5a3a" } },
    fruit: { shape: "cone", size: r(1, 1.5, 2, "reported", "Cryptomeria: cones 1–2 cm"), colour: "#7a5c3a", months: [10, 11] },
    bark: { kind: "strips", colour: "#7a4a32", note: "Red-brown, peeling in long vertical strips (reported)." },
    seasons: {}, sounds: [WIND_LEAVES],
    culture: ["Shrine cedars bound with shimenawa; the cedar avenue of Nikkō; Yakusugi on Yakushima.", "A ball of cedar sprigs (sugidama) hangs at a sake brewery when the new sake is ready."],
    references: [SZ("Cryptomeria_japonica_SZ124.png", "Cryptomeria japonica, pl. 124")], sources: [W("Cryptomeria")], styles: [],
  },
  {
    id: "hinoki", name: "Hinoki cypress", ja: { kana: "ヒノキ", kanji: "檜", romaji: "hinoki" }, scientific: "Chamaecyparis obtusa", form: "conifer-spire",
    size: { height: r(20, 30, 35, "reported", "Chamaecyparis obtusa: up to 35 m"), trunk: r(40, 70, 100, "reported", "Chamaecyparis obtusa: trunk up to 1 m") },
    architecture: { crown: { shape: "cone", width: .38, base: .25 }, branch: { droop: .3 } },
    leaf: { shape: "scale-spray", width: .5, length: r(.2, .3, .4, "reported", "Chamaecyparis obtusa: scale leaves 2–4 mm (sprays several cm)"), arrangement: "opposite", evergreen: true, colours: { summer: "#2e5a3a" } },
    fruit: { shape: "cone", size: r(.8, 1, 1.2, "reported", "Chamaecyparis obtusa: cones 8–12 mm"), colour: "#8a6a42", months: [10, 11] },
    bark: { kind: "strips", colour: "#6e3e2a", note: "Dark red-brown (reported), in long fibrous strips: the roofing of shrines (hiwadabuki)." },
    seasons: {}, sounds: [WIND_LEAVES],
    culture: ["The timber of Ise Shrine and of temples; hinoki baths.", "Its bark thatches shrine roofs (hiwadabuki)."],
    references: [SZ("Chamaecyparis_obtusa_SZ121.png", "Chamaecyparis obtusa, pl. 121")], sources: [W("Chamaecyparis_obtusa")], styles: [],
  },
  {
    id: "mountain-cherry", name: "Mountain cherry (yamazakura)", ja: { kana: "ヤマザクラ", kanji: "山桜", romaji: "yamazakura" }, scientific: "Prunus jamasakura (Cerasus jamasakura)", form: "blossom-tree",
    size: { height: r(10, 18, 25, "reported", "Prunus jamasakura: grows to 20–25 m") },
    leaf: { shape: "ovate", width: .45, margin: "serrate", length: est(8, 10, 12), arrangement: "spiral", evergreen: false, colours: { spring: "#8a4a32", summer: "#3f6b34", autumn: "#c4562e" } },
    flower: { shape: "rosaceous", petals: 5, notch: .2, diameter: est(2.5, 3, 3.5), colours: ["#f8ecef", "#efc6d0"], months: [4], inflorescence: "cluster", timing: "with-leaves" },
    fruit: { shape: "drupe", size: est(.7, .9, 1), colour: "#3a1e22", months: [5, 6] },
    bark: { kind: "lenticels", colour: "#5a3a36", note: "Glossy purplish brown ringed with horizontal lenticels; peeled strips are worked into kabazaiku craft (reported)." },
    seasons: { leaf: DECIDUOUS, autumn: [10, 11] }, sounds: [WIND_LEAVES],
    culture: ["Flowers open together with the red-brown young leaves (Koidzumi: 'coetaneous flowers').", "Hanami, and Yoshino's hillsides; the falling petals of mono no aware.", "The Edo-period cherry of the prints: Somei-yoshino came later, in the Meiji era."],
    references: [{ title: "Hokusai, Bullfinch and Weeping Cherry", url: C("Bullfinch_and_Weeping_Cherry_(Uso,_shidarezakura).jpg"), rights: "public-domain", kind: "print" }],
    sources: [W("Prunus_jamasakura")], styles: [uk("sakura", "Motif: grown by FLORA1; blossom clouds over a pink underprint, limbs of elbows, lenticel bark.")],
  },
  {
    id: "japanese-plum", name: "Japanese apricot (ume)", ja: { kana: "ウメ", kanji: "梅", romaji: "ume" }, scientific: "Prunus mume", form: "blossom-tree",
    size: { height: r(4, 6, 10, "reported", "Prunus mume: 4–10 m") },
    architecture: { trunk: { wander: .8, lean: 12 }, branch: { zigzag: 30, angleHigh: 25 }, crown: { shape: "irregular", width: .9, base: .3 } },
    leaf: { shape: "ovate", width: .6, margin: "serrate", length: r(4, 6, 8, "reported", "Prunus mume: leaves 4–8 × 2.5–5 cm, after the petals fall"), arrangement: "spiral", evergreen: false, colours: { spring: "#7a9a4a", summer: "#4a6e36", autumn: "#b08a3a" } },
    flower: { shape: "rosaceous", petals: 5, notch: 0, diameter: r(2, 2.25, 2.5, "reported", "Prunus mume: flowers 2–2.5 cm, strongly fragrant"), colours: ["#fbf7f2", "#e9a6b6", "#c4364e"], months: [2, 3], inflorescence: "solitary", timing: "before-leaves", fragrant: true },
    fruit: { shape: "drupe", size: r(2, 2.5, 3, "reported", "Prunus mume: drupe 2–3 cm, ripe June–July"), colour: "#c4c45a", months: [6, 7] },
    bark: { kind: "fissured", colour: "#3a3230", note: "Dark and rough; old trunks gnarled and split, with long straight water shoots above (estimated from prints)." },
    seasons: { leaf: [4, 5, 6, 7, 8, 9, 10], autumn: [10] }, sounds: [{ kind: "vocal", label: "bush warbler (uguisu) in the plum", catalog: "bed-birds-uguisu" }],
    culture: ["The first blossom of the year, in the cold: one of the Three Friends of Winter.", "The plum rain (tsuyu) when its fruit ripens; umeboshi.", "Sugawara no Michizane's flying plum (tobiume); Hiroshige's Plum Garden at Kameido."],
    references: [SZ("Prunus_mume_SZ11.png", "Prunus mume, pl. 11"), { title: "Hiroshige, Plum Garden at Kameido (Rijksmuseum)", url: C("De_pruimenboomgaard_te_Kameido_Kameido_umeyashiki_(titel_op_object)_Honderd_beroemde_gezichten_op_Edo_(serietitel)_Meisho_Edo_hyakkei_(serietitel_op_object),_RP-P-1956-743.jpg"), rights: "CC0", kind: "print" }],
    sources: [W("Prunus_mume")], styles: [uk("ume", "Motif: grown by FLORA1; white flowers and red buds on dark wood.")],
  },
  {
    id: "weeping-willow", name: "Weeping willow", ja: { kana: "シダレヤナギ", kanji: "枝垂柳", romaji: "shidare yanagi" }, scientific: "Salix babylonica", form: "weeping",
    size: { height: r(10, 18, 25, "reported", "Salix babylonica: up to 20–25 m") },
    architecture: { phyllotaxis: 5 / 13 },
    leaf: { shape: "lanceolate", width: .12, margin: "serrate", widest: .3, length: r(4, 10, 16, "reported", "Salix babylonica: leaves 4–16 × 0.5–2 cm, finely serrate"), arrangement: "spiral", evergreen: false, colours: { spring: "#a8c25a", summer: "#7aa04a", autumn: "#d0b03a" } },
    flower: { shape: "catkin", petals: 0, diameter: est(2, 3, 4), colours: ["#d8d080"], months: [3, 4], inflorescence: "cluster", timing: "with-leaves" },
    bark: { kind: "fissured", colour: "#5a5248", note: "Grey-brown, deeply and evenly ridged (estimated)." },
    seasons: { leaf: [3, 4, 5, 6, 7, 8, 9, 10, 11], autumn: [11] }, sounds: [WIND_LEAVES],
    culture: ["Ghosts (yūrei) appear under willows on summer nights.", "The Mikaeri-yanagi, the 'looking-back willow' at the Yoshiwara gate; Ono no Tōfū watching the frog leap at a willow.", "Phyllotaxis 5/13 of a turn (Phyllotaxis article)."],
    references: [{ title: "Hiroshige, Tea-house at the Willow Bridge (MET DP123292)", url: C("Ryogoku_Yanagibashi_(Kawachiya)-江戸高名会亭尽_両国柳橋_河内屋-Tea-house_at_the_Willow_Bridge_MET_DP123292.jpg"), rights: "CC0", kind: "print" }],
    sources: [W("Salix_babylonica"), W("Phyllotaxis")], styles: [uk("willow", "Motif: grown by FLORA1; arching limbs, hanging curtains.")],
  },
  {
    id: "japanese-maple", name: "Japanese maple (momiji)", ja: { kana: "イロハモミジ", kanji: "紅葉", romaji: "iroha momiji" }, scientific: "Acer palmatum", form: "layered",
    size: { height: r(6, 8, 16, "reported", "Acer palmatum: 6–10 m, rarely 16 m"), crown: r(4.5, 7, 10, "reported", "Acer palmatum: mature width 4.5–10 m") },
    leaf: { shape: "palmate", width: 1, lobes: 7, depth: .7, margin: "double-serrate", length: r(4, 7, 12, "reported", "Acer palmatum: leaves 4–12 cm, 5, 7 or 9 lobes"), arrangement: "opposite", evergreen: false, colours: { spring: "#b5c84a", summer: "#4a7a34", autumn: "#c3341f" } },
    flower: { shape: "rosaceous", petals: 5, diameter: est(.5, .6, .8), colours: ["#8a2a3a"], months: [4, 5], inflorescence: "cluster", timing: "with-leaves" },
    fruit: { shape: "seed-pod", size: r(2, 2.5, 3, "reported", "Acer palmatum: paired samaras 2–3 cm"), colour: "#b0503a", months: [7, 8, 9] },
    bark: { kind: "smooth", colour: "#6f7368", note: "Smooth, grey-green to grey (estimated)." },
    seasons: { leaf: DECIDUOUS, autumn: [11] }, sounds: [WIND_LEAVES],
    culture: ["Momijigari, autumn leaf viewing; the deer and maple of October in hanafuda.", "Tatsuta River's red leaves on the water, in the Hyakunin Isshu."],
    references: [SZ("Acer_palmatum_SZ145.png", "Acer palmatum, pl. 145"), SZ("Acer_palmatum_SZ146.png", "Acer palmatum, pl. 146")], sources: [W("Acer_palmatum")], styles: [],
  },
  {
    id: "madake-bamboo", name: "Japanese timber bamboo (madake)", ja: { kana: "マダケ", kanji: "真竹", romaji: "madake" }, scientific: "Phyllostachys reticulata (P. bambusoides)", form: "bamboo",
    size: { height: r(10, 15, 20, "reported", "Phyllostachys bambusoides: roughly 20 m"), trunk: r(4, 8, 10, "reported", "Phyllostachys bambusoides: culms to 10 cm diameter") },
    leaf: { shape: "lanceolate", width: .15, widest: .3, margin: "entire", length: est(8, 12, 20), arrangement: "alternate", evergreen: true, colours: { summer: "#4f7a3a", autumn: "#8a9a4a" } },
    bark: { kind: "culm", colour: "#6a8f3e", note: "Green culms ringed by double nodes, yellowing with age (estimated)." },
    seasons: {}, sounds: [{ kind: "ambience", label: "bamboo grove creaking and rustling", query: "bamboo forest wind creak" }],
    culture: ["Kaguya-hime, found in a shining culm by the bamboo cutter.", "Tanabata wishes tied on bamboo; one of the Three Friends of Winter.", "New shoots grow up to 1–1.2 m a day in late spring (reported)."],
    references: [], sources: [W("Phyllostachys_reticulata")], styles: [uk("bamboo", "Tree scenes: culms, nodes, leaf fans."), uk("takegiri", "The cut culm that shines.")],
  },
  {
    id: "ginkgo", name: "Ginkgo (ichō)", ja: { kana: "イチョウ", kanji: "銀杏", romaji: "ichō" }, scientific: "Ginkgo biloba", form: "broadleaf",
    size: { height: r(20, 28, 35, "reported", "Ginkgo biloba: 20–35 m") },
    architecture: { crown: { shape: "cone", width: .6, base: .22 }, trunk: { forkAt: 0, limbs: 0 }, branch: { angleLow: 60, angleHigh: 45, zigzag: 4, droop: .1, spacing: .08 }, foliage: { kind: "cloud", size: .07, density: .7 } },
    leaf: { shape: "fan", width: .8, length: r(5, 7, 10, "reported", "Ginkgo biloba: fan-shaped leaves 5–10 cm"), arrangement: "spiral", evergreen: false, colours: { spring: "#a8c85a", summer: "#5a8a3a", autumn: "#f2b51c" } },
    fruit: { shape: "nut", size: est(1.5, 2, 2.5), colour: "#e0b04a", months: [10, 11] },
    bark: { kind: "fissured", colour: "#6a6058", note: "Grey, furrowed with age (estimated)." },
    seasons: { leaf: DECIDUOUS, autumn: [11] }, sounds: [WIND_LEAVES],
    culture: ["Temple and shrine trees (Tsurugaoka Hachimangū); the symbol of Tokyo.", "Saffron-yellow in autumn, dropping its leaves within one to fifteen days (reported).", "Conical when young, broader and irregular with age (reported)."],
    references: [SZ("Ginkgo_biloba_SZ136.png", "Ginkgo biloba, pl. 136")], sources: [W("Ginkgo_biloba")], styles: [],
  },
  {
    id: "zelkova", name: "Japanese zelkova (keyaki)", ja: { kana: "ケヤキ", kanji: "欅", romaji: "keyaki" }, scientific: "Zelkova serrata", form: "broadleaf",
    size: { height: r(15, 25, 30, "reported", "Zelkova serrata: usually to 30 m") },
    architecture: { crown: { shape: "vase", width: 1, base: .3 }, trunk: { forkAt: .25, limbs: 5 }, branch: { angleLow: 30, angleHigh: 20 } },
    leaf: { shape: "ovate", width: .45, margin: "serrate", length: est(3, 5, 7), arrangement: "alternate", evergreen: false, colours: { spring: "#9ab84a", summer: "#3f6a34", autumn: "#c8702e" } },
    bark: { kind: "patches", colour: "#8a847a", note: "Grey-white to grey-brown, smooth with lenticels or flaking in patches to orange (reported)." },
    seasons: { leaf: DECIDUOUS, autumn: [11] }, sounds: [WIND_LEAVES],
    culture: ["The broom-shaped avenue tree (Omotesandō); farmhouse windbreaks of the Kantō plain.", "Its timber is the pillars of the Kiyomizu stage."],
    references: [], sources: [W("Zelkova_serrata")], styles: [],
  },
  {
    id: "camphor", name: "Camphor tree (kusunoki)", ja: { kana: "クスノキ", kanji: "楠", romaji: "kusunoki" }, scientific: "Cinnamomum camphora", form: "broadleaf",
    size: { height: r(20, 25, 30, "reported", "Camphora officinarum: 20–30 m"), trunk: r(200, 400, 770, "reported", "Five Japanese camphors exceed 20 m girth; Kamō no Ōkusu 24.22 m") },
    architecture: { crown: { shape: "dome", width: 1.3, base: .25 }, trunk: { forkAt: .3, limbs: 4, baseWidth: .09 } },
    leaf: { shape: "ovate", width: .45, margin: "wavy", length: est(6, 9, 12), arrangement: "spiral", evergreen: true, colours: { spring: "#b0503a", summer: "#3a6a34" } },
    fruit: { shape: "drupe", size: r(.8, 1, 1.2, "reported", "Camphor: black berry-like fruit about 1 cm"), colour: "#1e1c1e", months: [10, 11] },
    bark: { kind: "fissured", colour: "#8a7a62", note: "Pale, very rough and fissured vertically (reported)." },
    seasons: {}, sounds: [WIND_LEAVES],
    culture: ["The sacred tree (shinboku) of many shrines, girded with shimenawa: the great camphor of Kamō.", "The giant tree of the forest spirit in Japanese film; camphor wood for carving."],
    references: [], sources: [W("Cinnamomum_camphora")], styles: [uk("shinboku", "Sacred tree with shimenawa.")],
  },
  {
    id: "persimmon", name: "Japanese persimmon (kaki)", ja: { kana: "カキ", kanji: "柿", romaji: "kaki" }, scientific: "Diospyros kaki", form: "blossom-tree",
    size: { height: r(4, 7, 10, "reported", "Diospyros kaki: up to 10 m") },
    architecture: { crown: { shape: "dome", width: .9, base: .3 }, branch: { zigzag: 14 } },
    leaf: { shape: "ovate", width: .7, margin: "entire", length: est(7, 10, 15), arrangement: "spiral", evergreen: false, colours: { spring: "#a8c25a", summer: "#3f6a2e", autumn: "#c8502a" } },
    flower: { shape: "tubular", petals: 4, diameter: r(2, 2.25, 2.5, "reported", "Diospyros kaki: flowers 2–2.5 cm, four petals"), colours: ["#f0ead0"], months: [5, 6], inflorescence: "solitary", timing: "after-leaves" },
    fruit: { shape: "pome-flat", size: est(5, 7, 9), colour: "#e8732a", months: [10, 11] },
    bark: { kind: "plated", colour: "#4a4440", note: "Dark grey, checked into small blocks (estimated)." },
    seasons: { leaf: DECIDUOUS, autumn: [10, 11] }, sounds: [{ kind: "vocal", label: "crows at the last persimmons", catalog: "bed-crows-day" }],
    culture: ["The monkey and the crab (Saru kani gassen) quarrel over its fruit.", "Peeled fruit hung under the eaves to dry (hoshigaki); one fruit left on the tree for the crows."],
    references: [], sources: [W("Diospyros_kaki")], styles: [uk("kaki", "Tree scenes: the persimmon the monkey climbs.")],
  },
  {
    id: "peach", name: "Peach (momo)", ja: { kana: "モモ", kanji: "桃", romaji: "momo" }, scientific: "Prunus persica", form: "blossom-tree",
    size: { height: r(3, 4, 10, "reported", "Peach: typically 3–4 m, rarely 10 m"), crown: r(3, 3.5, 4, "reported", "Peach: crown spread 3–4 m, similar to the height") },
    architecture: { crown: { shape: "dome", width: 1.0, base: .3 } },
    leaf: { shape: "lanceolate", width: .25, widest: .4, margin: "serrate", length: r(7, 11, 15, "reported", "Peach: leaves 7–15 × 2–4.5 cm, folded along the midrib"), arrangement: "spiral", evergreen: false, colours: { spring: "#9ac04a", summer: "#4a7a34", autumn: "#c0a03a" } },
    flower: { shape: "rosaceous", petals: 5, notch: 0, point: .4, diameter: r(2, 2.75, 3.5, "reported", "Peach: flowers 2–3.5 cm, pink, four or five cupped petals"), colours: ["#f2a3b8", "#e0607e"], months: [3, 4], inflorescence: "solitary", timing: "before-leaves" },
    fruit: { shape: "drupe", size: est(5, 7, 9), colour: "#f2b08a", months: [7, 8] },
    bark: { kind: "lenticels", colour: "#4e4646", note: "Dark grey with horizontal lenticels; red twigs (reported)." },
    seasons: { leaf: DECIDUOUS, autumn: [10, 11] }, sounds: [WIND_LEAVES],
    culture: ["Momotarō is born from a peach found floating down the river.", "Peaches drive off evil: Izanagi throws them at the pursuers from Yomi.", "The Peach Festival (momo no sekku, Hinamatsuri) on the third day of the third month."],
    references: [], sources: [W("Peach")], styles: [uk("peach", "Folktale fruit that splits open.")],
  },
  {
    id: "japanese-wisteria", name: "Japanese wisteria (fuji)", ja: { kana: "フジ", kanji: "藤", romaji: "fuji" }, scientific: "Wisteria floribunda", form: "vine",
    size: { height: r(3, 9, 9, "reported", "Wisteria floribunda: to 9 m; stems over 30 m long over supports") },
    leaf: { shape: "pinnate", width: .4, lobes: 8, length: r(10, 20, 30, "reported", "Wisteria floribunda: pinnate leaves 10–30 cm, 15–19 leaflets"), arrangement: "alternate", evergreen: false, colours: { spring: "#b0c86a", summer: "#4a7a3a", autumn: "#c8b04a" } },
    flower: { shape: "raceme", petals: 5, diameter: r(30, 50, 200, "reported", "Wisteria floribunda: the longest racemes of any wisteria, to 2 m in cultivars (raceme length, cm)"), colours: ["#9b7cc4", "#c8b4e0"], months: [4, 5], inflorescence: "raceme", timing: "with-leaves", fragrant: true },
    fruit: { shape: "seed-pod", size: r(5, 7, 10, "reported", "Wisteria floribunda: velvety pods 5–10 cm"), colour: "#7a6a4a", months: [8, 9, 10, 11, 12] },
    bark: { kind: "smooth", colour: "#6a6460", note: "Grey, twisting stems twining clockwise (reported)." },
    seasons: { leaf: DECIDUOUS, autumn: [11] }, sounds: [{ kind: "ambience", label: "bees in the wisteria", query: "bees buzzing flowers" }],
    culture: ["The wisteria maiden (Fuji musume), a kabuki dance.", "Kameido Tenjin's wisteria trellises over the pond (Hiroshige); the Fujiwara clan's name and crest."],
    references: [SZ("Wisteria_brachyobotrys_SZ45.png", "Wisteria brachybotrys, pl. 45")], sources: [W("Wisteria_floribunda")], styles: [],
  },
  {
    id: "camellia", name: "Camellia (tsubaki)", ja: { kana: "ツバキ", kanji: "椿", romaji: "tsubaki" }, scientific: "Camellia japonica", form: "shrub",
    size: { height: r(1.5, 4, 11, "reported", "Camellia japonica: usually 1.5–6 m, occasionally 11 m") },
    leaf: { shape: "ovate", width: .5, margin: "serrate", length: r(5, 8, 11, "reported", "Camellia japonica: leathery leaves 5–11 × 2.5–6 cm"), arrangement: "spiral", evergreen: true, colours: { summer: "#24452c" } },
    flower: { shape: "camellia", petals: 6, diameter: r(6, 8, 10, "reported", "Camellia japonica: flowers 6–10 cm, six or seven petals"), colours: ["#c8202e", "#f6f0ea"], months: [1, 2, 3, 4], inflorescence: "solitary", timing: "with-leaves" },
    fruit: { shape: "drupe", size: est(3, 4, 5), colour: "#8a5a3a", months: [9, 10] },
    bark: { kind: "smooth", colour: "#8a8478", note: "Smooth pale grey (estimated); young twigs purplish brown (reported)." },
    seasons: {}, sounds: [{ kind: "foley", label: "a whole flower dropping", query: "flower drop soft thud" }],
    culture: ["The flower falls whole, not petal by petal: a head falling, so warriors kept it out of their gardens.", "The winter flower of the tea room; tsubaki oil for hair."],
    references: [SZ("Camellia_japonica_SZ82.png", "Camellia japonica, pl. 82")], sources: [W("Camellia_japonica")], styles: [],
  },
  {
    id: "chrysanthemum", name: "Chrysanthemum (kiku)", ja: { kana: "キク", kanji: "菊", romaji: "kiku" }, scientific: "Chrysanthemum × morifolium", form: "herb",
    size: { height: r(.3, .6, .9, "reported", "Chrysanthemum × morifolium: 30–90 cm high and wide") },
    leaf: { shape: "lobed", width: .6, lobes: 2, depth: .5, margin: "serrate", length: r(5, 8, 12, "reported", "Chrysanthemum × morifolium: leaves up to 12 cm"), arrangement: "spiral", evergreen: false, colours: { summer: "#3a5a34", autumn: "#4a5a34" } },
    flower: { shape: "composite", petals: 32, rings: 3, diameter: est(4, 8, 15), colours: ["#f2c43a", "#f6f2e6", "#c8443a"], months: [10, 11], inflorescence: "head", timing: "after-leaves" },
    bark: { kind: "green", colour: "#4a6a3a", note: "Downy green stems, woody at the base (reported)." },
    seasons: { leaf: [5, 6, 7, 8, 9, 10, 11] }, sounds: [],
    culture: ["The imperial crest: a sixteen-petalled chrysanthemum.", "The Chrysanthemum Festival (Chōyō) on the ninth day of the ninth month; chrysanthemum doll displays.", "Flowers when days fall under 14 hours (reported); a single plant trained to a thousand blooms (ozukuri)."],
    references: [], sources: [W("Chrysanthemum_×_morifolium")], styles: [],
  },
  {
    id: "rabbit-ear-iris", name: "Rabbit-ear iris (kakitsubata)", ja: { kana: "カキツバタ", kanji: "杜若", romaji: "kakitsubata" }, scientific: "Iris laevigata", form: "iris-clump",
    size: { height: est(.5, .7, .9) },
    leaf: { shape: "sword", width: .05, length: est(40, 60, 80), arrangement: "alternate", evergreen: false, colours: { summer: "#3f6e3a" } },
    flower: { shape: "iris", petals: 6, diameter: est(10, 12, 14), colours: ["#4a3a9a", "#f4f2f6"], months: [5], inflorescence: "solitary", timing: "after-leaves" },
    bark: { kind: "green", colour: "#4a7a3e", note: "Green flower stalks (scapes)." },
    seasons: { leaf: [4, 5, 6, 7, 8, 9, 10] }, sounds: [{ kind: "ambience", label: "frogs in the iris marsh", query: "japanese frogs pond" }],
    culture: ["The Eight Bridges (Yatsuhashi) of the Tales of Ise, painted by Ogata Kōrin as irises alone.", "Blue-violet flowers with a white line on each fall; in bloom mid-April to mid-May (reported)."],
    references: [{ title: "Ogata Kōrin, Irises at Yatsuhashi (MET DT230)", url: C("八橋図屏風_-Irises_at_Yatsuhashi_(Eight_Bridges)_MET_DT230.jpg"), rights: "CC0", kind: "painting" },
      { title: "Hokusai, Irises and Grasshopper (MET DP141267)", url: C("葛飾北斎画_燕子花-Grasshopper_and_Iris_MET_DP141267.jpg"), rights: "CC0", kind: "print" }],
    sources: [W("Iris_laevigata")], styles: [],
  },
  {
    id: "sacred-lotus", name: "Sacred lotus (hasu)", ja: { kana: "ハス", kanji: "蓮", romaji: "hasu" }, scientific: "Nelumbo nucifera", form: "aquatic",
    size: { height: r(1, 1.5, 2, "reported", "Nelumbo nucifera: leaf stalks up to 200 cm; grows in water 0.3–2.5 m deep") },
    leaf: { shape: "peltate", width: 1, length: r(30, 60, 100, "reported", "Nelumbo nucifera: leaf blade up to 80–100 cm across"), arrangement: "alternate", evergreen: false, colours: { summer: "#4a7a4a", autumn: "#8a7a4a" } },
    flower: { shape: "lotus", petals: 16, diameter: r(15, 25, 35, "reported", "Nelumbo nucifera: flowers up to 35 cm"), colours: ["#f2b8c8", "#f8f2f0"], months: [7, 8], inflorescence: "solitary", timing: "after-leaves", fragrant: true },
    fruit: { shape: "seed-pod", size: est(6, 9, 12), colour: "#5a6a3a", months: [8, 9] },
    bark: { kind: "green", colour: "#5a7a4a", note: "Prickly green stalks." },
    seasons: { leaf: [5, 6, 7, 8, 9, 10] }, sounds: [{ kind: "ambience", label: "still pond, dawn", query: "pond morning water ambience" }],
    culture: ["Purity rising out of the mud: the Buddha's seat.", "Shinobazu Pond at Ueno in summer; the flowers open at dawn.", "A seed head of 10–30 seeds like a showerhead (reported)."],
    references: [], sources: [W("Nelumbo_nucifera")], styles: [],
  },
  {
    id: "susuki", name: "Japanese silver grass (susuki)", ja: { kana: "ススキ", kanji: "芒", romaji: "susuki" }, scientific: "Miscanthus sinensis", form: "grass",
    size: { height: r(.8, 1.5, 2, "reported", "Miscanthus sinensis: 0.8–2 m, rarely 4 m") },
    leaf: { shape: "blade", width: .02, length: r(18, 50, 75, "reported", "Miscanthus sinensis: leaves 18–75 × 0.3–2 cm"), arrangement: "alternate", evergreen: false, colours: { summer: "#5a7a3a", autumn: "#b09a5a" } },
    flower: { shape: "plume", petals: 0, diameter: est(15, 25, 30), colours: ["#b88a8a", "#e8e0d0"], months: [9, 10, 11], inflorescence: "plume", timing: "after-leaves" },
    bark: { kind: "green", colour: "#6a7a3a", note: "Green to straw culms." },
    seasons: { leaf: [4, 5, 6, 7, 8, 9, 10, 11], autumn: [10, 11] }, sounds: [{ kind: "ambience", label: "wind through dry grass", query: "wind dry grass field" }, { kind: "ambience", label: "autumn insects", catalog: "bed-crickets-night" }],
    culture: ["Offered with dumplings at the autumn moon-viewing (tsukimi); the August hanafuda card: susuki under the full moon.", "One of the seven grasses of autumn; purplish plumes turning silver (reported: purplish flowers held above the foliage)."],
    references: [], sources: [W("Miscanthus_sinensis")], styles: [],
  },
  {
    id: "common-reed", name: "Common reed (ashi, yoshi)", ja: { kana: "ヨシ", kanji: "葦", romaji: "ashi / yoshi" }, scientific: "Phragmites australis", form: "grass",
    size: { height: r(1.5, 2.5, 4, "reported", "Phragmites australis: stems 1.5–4 m, occasionally 6 m") },
    architecture: { trunk: { stems: 18 }, branch: { angleLow: 8, droop: .2 } },
    leaf: { shape: "blade", width: .05, length: r(18, 40, 60, "reported", "Phragmites australis: leaves 18–60 × 1–3 cm"), arrangement: "alternate", evergreen: false, colours: { summer: "#6a8a6a", autumn: "#b09a6a" } },
    flower: { shape: "panicle", petals: 0, diameter: r(15, 30, 50, "reported", "Phragmites australis: dense dark purple panicles 15–50 cm, late summer"), colours: ["#5a3a4a", "#b8a890"], months: [8, 9, 10], inflorescence: "panicle", timing: "after-leaves" },
    bark: { kind: "green", colour: "#7a8a5a", note: "Culms 5–10 mm (reported), buff when dead." },
    seasons: { leaf: [4, 5, 6, 7, 8, 9, 10, 11], autumn: [10, 11] }, sounds: [{ kind: "ambience", label: "reeds rustling at the water's edge", query: "reeds rustling wind water" }],
    culture: ["Reed beds of Naniwa in classical poetry; reed blinds (yoshizu) in summer.", "Ashi ('bad') renamed yoshi ('good'): the same plant."],
    references: [], sources: [W("Phragmites_australis")], styles: [uk("reeds", "Motif: reed beds.")],
  },
  {
    id: "paulownia", name: "Princess tree (kiri)", ja: { kana: "キリ", kanji: "桐", romaji: "kiri" }, scientific: "Paulownia tomentosa", form: "broadleaf",
    size: { height: r(10, 15, 25, "reported", "Paulownia tomentosa: 10–25 m") },
    architecture: { buds: "opposite", leader: "forking", crown: { shape: "dome", width: .9, base: .35 }, branch: { angleLow: 50, orders: 2, lengthRatio: .5 }, foliage: { size: .2, density: .65 } },
    leaf: { shape: "cordate", width: .9, lobes: 1, margin: "entire", length: r(15, 25, 40, "reported", "Paulownia tomentosa: heart-shaped to five-lobed leaves 15–40 cm, in opposite pairs"), arrangement: "opposite", evergreen: false, colours: { summer: "#4a6e34", autumn: "#8a7a3a" } },
    flower: { shape: "tubular", petals: 5, diameter: r(4, 5, 6, "reported", "Paulownia tomentosa: violet tubular corolla 4–6 cm, panicles 10–30 cm, before the leaves"), colours: ["#9a7ac0", "#e8def0"], months: [5], inflorescence: "panicle", timing: "before-leaves", fragrant: true },
    fruit: { shape: "nut", size: r(3, 3.5, 4, "reported", "Paulownia tomentosa: egg-shaped capsules 3–4 cm"), colour: "#7a6a4a", months: [10, 11, 12] },
    bark: { kind: "smooth", colour: "#7a7468", note: "Grey-brown with lenticels (estimated)." },
    seasons: { leaf: [5, 6, 7, 8, 9, 10, 11], autumn: [10, 11] }, sounds: [WIND_LEAVES],
    culture: ["The government crest (go-shichi no kiri); the December card of hanafuda with the phoenix.", "Planted at a daughter's birth, cut for her wedding chest (kiri tansu)."],
    references: [SZ("Paulowni_imperialis_SZ10.jpg", "Paulownia (as P. imperialis), pl. 10")], sources: [W("Paulownia_tomentosa")], styles: [],
  },
  {
    id: "morning-glory", name: "Japanese morning glory (asagao)", ja: { kana: "アサガオ", kanji: "朝顔", romaji: "asagao" }, scientific: "Ipomoea nil", form: "vine",
    size: { height: r(1, 3, 5, "reported", "Ipomoea nil: twining stems up to 5 m") },
    architecture: { trunk: { baseWidth: .006, wander: .3 }, crown: { shape: "column", width: .35, base: .2 }, branch: { orders: 1, angleLow: 70, angleHigh: 60, droop: .6 }, foliage: { kind: "leafy-stems", size: .08, density: .7 } },
    leaf: { shape: "cordate", width: .9, lobes: 3, margin: "entire", length: r(5, 9, 14, "reported", "Ipomoea nil: leaves 5–14 cm, ovate to nearly round, often three-lobed"), arrangement: "alternate", evergreen: false, colours: { summer: "#3f7a3a" } },
    flower: { shape: "funnel", petals: 5, diameter: r(4, 4.5, 5, "reported", "Ipomoea nil: flared limb 4–5 cm wide, tube 3–5 cm"), colours: ["#3a52b0", "#b0306a", "#f2f0f6"], months: [7, 8, 9], inflorescence: "solitary", timing: "after-leaves" },
    fruit: { shape: "nut", size: r(.8, 1, 1.2, "reported", "Ipomoea nil: capsules 8–12 mm"), colour: "#8a7a5a", months: [9, 10] },
    bark: { kind: "green", colour: "#4a7a3a", note: "Hairy twining green stems (reported)." },
    seasons: { leaf: [6, 7, 8, 9] }, sounds: [{ kind: "ambience", label: "summer morning, cicadas", query: "japanese cicadas morning" }],
    culture: ["Opens at dawn and fades by noon: the flower of summer mornings.", "The Edo craze for mutant forms (henka asagao); the Iriya morning-glory fair.", "Chiyo-ni's haiku: the bucket taken by the morning glory, she borrows water."],
    references: [{ title: "Hokusai, Morning Glories and Tree-frog", url: C("Morning_Glories_and_Tree-frog_--_Hokusai.jpg"), rights: "public-domain", kind: "print" }], sources: [W("Ipomoea_nil")], styles: [],
  },
  {
    id: "rice", name: "Rice (ine)", ja: { kana: "イネ", kanji: "稲", romaji: "ine" }, scientific: "Oryza sativa (japonica)", form: "grass",
    size: { height: r(.6, 1, 1.2, "reported", "Rice: grows to over 1 m") },
    architecture: { trunk: { stems: 12 }, branch: { angleLow: 10, droop: .35 } },
    leaf: { shape: "blade", width: .03, length: est(30, 40, 50), arrangement: "alternate", evergreen: false, colours: { spring: "#8ac25a", summer: "#4a8a3a", autumn: "#d0b04a" } },
    flower: { shape: "panicle", petals: 0, diameter: est(15, 20, 25), colours: ["#d8c070", "#c8a040"], months: [8, 9, 10], inflorescence: "panicle", timing: "after-leaves" },
    bark: { kind: "green", colour: "#5a8a3a", note: "Jointed stems (tillers) with a leaf from each node (reported)." },
    seasons: { leaf: [5, 6, 7, 8, 9, 10], autumn: [9, 10] }, sounds: [{ kind: "ambience", label: "paddy frogs", query: "rice paddy frogs night" }],
    culture: ["Planted in June to songs (taue-uta); gold and heavy-headed by late September, then cut and hung to dry on racks.", "Inari's harvest; scarecrows (kakashi); a panicle can hold up to 350 spikelets (reported)."],
    references: [], sources: [W("Rice")], styles: [uk("ricefield", "Terraced paddies young, ripe, flooded.")],
  },
];

/** A species by id, by the id it is drawn by in a style (`findPlant("sakura")`), or by romaji. */
export function findPlant(id: string): PlantSpecies | undefined {
  return PLANT_SPECIES.find(s => s.id === id) ?? PLANT_SPECIES.find(s => s.styles.some(i => i.id === id)) ?? PLANT_SPECIES.find(s => s.ja.romaji === id);
}
export const plantsInForm = (form: GrowthFormId) => PLANT_SPECIES.filter(s => s.form === form);
/** What is in season in a month: blooming, in autumn colour, fruiting. */
export function inSeason(month: Month) {
  return {
    blooming: PLANT_SPECIES.filter(s => s.flower?.months.includes(month)),
    autumn: PLANT_SPECIES.filter(s => s.seasons.autumn?.includes(month)),
    fruiting: PLANT_SPECIES.filter(s => s.fruit?.months.includes(month)),
  };
}
