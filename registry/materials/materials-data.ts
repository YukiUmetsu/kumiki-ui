/**
 * MATL1 data: what materials look like, in any art style. Each record holds a material's colour in linear light (its
 * diffuse albedo, or for a metal its reflectance F0), whether it is a metal, its roughness, the variation across a
 * real surface and notes on painting it; weathering tracks say how it ages, and `materials-physics.ts` makes it wet,
 * ages it and hands it to a renderer.
 *
 * Grades: `reported` values come from the Physically Based database (CC0 1.0, A. Palmqvist et al., data at commit
 * bed520ab9800de4fc9800304f6557f85ce788e69), which cites a measurement or reference for each material (named in `source`); `measured` values are
 * the mean of a CC0 ambientCG colour map or median samples of a CC0/public-domain photograph; roughness of the used
 * surface and painting notes are estimated unless a source is given.
 */
import type { Grade, Range } from "../anatomy/foundation-shapes";
import { commons as C, range as r, wikipedia as W } from "../anatomy/foundation-shapes";

export type MaterialFamily = "metal" | "metal-oxide" | "stone" | "ceramic" | "earth" | "wood" | "plant" | "paper" | "plaster" | "lacquer" | "glass" | "ice" | "liquid" | "organic" | "food" | "manmade";
export type WeatheringTrack = "copper" | "iron" | "wood" | "bamboo" | "tatami" | "paper" | "lacquer";

export interface MaterialRecord {
  id: string;
  name: string;
  ja?: string;
  family: MaterialFamily;
  /** Linear-light RGB 0–1: the diffuse albedo, or for a metal its reflectance at normal incidence (F0). */
  albedo: readonly [number, number, number];
  /** 1 for bare metal (no diffuse colour; tinted reflections), 0 otherwise. */
  metal: 0 | 1;
  /** Roughness 0 (mirror) to 1 (matte) of the surface as usually seen. */
  roughness: Range;
  /** Refractive index of a dielectric (sets its 2–5% reflectance). */
  ior?: number;
  grade: Grade;
  source: string;
  /** Luminance at the 10th and 90th percentile across a real surface (texture, grain, speckle), where measured. */
  variation?: readonly [number, number];
  /** Water soaks in and darkens it. */
  porous: boolean;
  look: readonly string[];
  weathering?: WeatheringTrack;
}

/** The materials. */
export const MATERIALS: readonly MaterialRecord[] = [
  { id: "gold", name: "Gold", ja: "金", family: "metal", albedo: [1, 0.773, 0.307], metal: 1, roughness: r(0, 0.15, 0.4, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Warm yellow highlights and reflections; no diffuse colour of its own.", "Gold leaf (kinpaku) is the same metal laid thin: crinkled sheets catch light in facets."] },
  { id: "silver", name: "Silver", ja: "銀", family: "metal", albedo: [0.991, 0.985, 0.974], metal: 1, roughness: r(0, 0.2, 0.5, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Reflects nearly all light, untinted; tarnishes yellow-brown to black in sulfur."] },
  { id: "copper", name: "Copper", ja: "銅", family: "metal", albedo: [0.932, 0.623, 0.522], metal: 1, roughness: r(0, 0.3, 0.6, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Salmon-pink reflections when fresh; darkens to brown within years outdoors and turns green over decades."], weathering: "copper" },
  { id: "brass", name: "Brass", ja: "真鍮", family: "metal", albedo: [0.91, 0.778, 0.423], metal: 1, roughness: r(0, 0.3, 0.6, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Yellow metal, paler than gold; dulls to brown."] },
  { id: "iron", name: "Iron", ja: "鉄", family: "metal", albedo: [0.53, 0.513, 0.494], metal: 1, roughness: r(0.2, 0.45, 0.8, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Grey metal; rusts orange-brown wherever water stands."], weathering: "iron" },
  { id: "cast-iron", name: "Cast Iron", ja: "鋳鉄", family: "metal", albedo: [0.027, 0.026, 0.026], metal: 1, roughness: r(0.3, 0.5, 0.8, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Palmqvist, A.: Spectrophotometer Measurement", porous: false, look: ["Dark grey, granular; the kettle (tetsubin) black."], weathering: "iron" },
  { id: "stainless-steel", name: "Stainless Steel", ja: "ステンレス", family: "metal", albedo: [0.669, 0.639, 0.598], metal: 1, roughness: r(0.05, 0.25, 0.5, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Cool grey reflections; brushed finishes stretch highlights across the grain."] },
  { id: "aluminium", name: "Aluminium", ja: "アルミニウム", family: "metal", albedo: [0.916, 0.923, 0.924], metal: 1, roughness: r(0.05, 0.3, 0.6, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Bright, slightly cool; matte when weathered."] },
  { id: "lead", name: "Lead", ja: "鉛", family: "metal", albedo: [0.626, 0.64, 0.693], metal: 1, roughness: r(0.3, 0.6, 0.9, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Soft blue-grey, dull; weathers to pale grey."] },
  { id: "zinc", name: "Zinc", ja: "亜鉛", family: "metal", albedo: [0.808, 0.844, 0.865], metal: 1, roughness: r(0.2, 0.5, 0.8, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Bluish grey; galvanised sheet shows spangle crystals."] },
  { id: "titanium", name: "Titanium", ja: "チタン", family: "metal", albedo: [0.441, 0.4, 0.361], metal: 1, roughness: r(0.1, 0.35, 0.6, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Darker grey than steel."] },
  { id: "chromium", name: "Chromium", ja: "クロム", family: "metal", albedo: [0.654, 0.685, 0.701], metal: 1, roughness: r(0, 0.05, 0.2, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Mirror plating with a cool cast."] },
  { id: "nickel", name: "Nickel", ja: "ニッケル", family: "metal", albedo: [0.697, 0.641, 0.563], metal: 1, roughness: r(0, 0.2, 0.5, "estimated"), ior: undefined, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Warm grey plating."] },
  { id: "brick", name: "Brick", ja: "煉瓦", family: "ceramic", albedo: [0.262, 0.095, 0.061], metal: 0, roughness: r(0.8, 0.9, 1, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Palmqvist, A.: Spectrophotometer Measurement", porous: true, look: ["Red-brown, matte, with mortar joints lighter than the brick."] },
  { id: "terracotta", name: "Terracotta", ja: "素焼き", family: "ceramic", albedo: [0.555, 0.212, 0.11], metal: 0, roughness: r(0.8, 0.9, 1, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Palmqvist, A.: Spectrophotometer Measurement", porous: true, look: ["Orange-red unglazed clay; darkens strongly when wet."] },
  { id: "clay", name: "Clay", ja: "粘土", family: "earth", albedo: [0.256, 0.118, 0.091], metal: 0, roughness: r(0.5, 0.8, 1, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Palmqvist, A.: Spectrophotometer Measurement", porous: true, look: ["Brown-red earth; its colour depends on iron content."] },
  { id: "porcelain", name: "Porcelain", ja: "磁器", family: "ceramic", albedo: [0.745, 0.745, 0.723], metal: 0, roughness: r(0, 0.05, 0.2, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Palmqvist, A.: Spectrophotometer Measurement", porous: false, look: ["Glazed white with a glassy highlight; light passes a little into the body."] },
  { id: "marble", name: "Marble", ja: "大理石", family: "stone", albedo: [0.83, 0.791, 0.753], metal: 0, roughness: r(0, 0.2, 0.6, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Jensen, H. W., Marschner, S. R., Levoy, M. & Hanrahan, P.: A Practical Model for Subsurface Light Transport", porous: false, look: ["White translucent stone: soft shadows because light scatters below the surface."] },
  { id: "concrete", name: "Concrete", ja: "コンクリート", family: "stone", albedo: [0.51, 0.51, 0.51], metal: 0, roughness: r(0.6, 0.85, 1, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Lagarde, S.: Feeding a Physically Based Shading Model", porous: true, look: ["Mid grey, matte; stained darker where water runs."] },
  { id: "sand", name: "Sand", ja: "砂", family: "earth", albedo: [0.44, 0.386, 0.231], metal: 0, roughness: r(0.9, 1, 1, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Lagarde, S.: Feeding a Physically Based Shading Model", porous: true, look: ["Warm grey-beige, granular; much darker when wet."] },
  { id: "charcoal", name: "Charcoal", ja: "炭", family: "organic", albedo: [0.02, 0.02, 0.02], metal: 0, roughness: r(0.9, 1, 1, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Lagarde, S.: Feeding a Physically Based Shading Model", porous: true, look: ["Nearly black and matte."] },
  { id: "paper-white", name: "White paper", ja: "洋紙", family: "paper", albedo: [0.794, 0.834, 0.884], metal: 0, roughness: r(0.7, 0.8, 0.9, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Palmqvist, A.: Spectrophotometer Measurement", porous: true, look: ["White, matte; light shows through a single sheet."], weathering: "paper" },
  { id: "cardboard", name: "Cardboard", ja: "段ボール", family: "paper", albedo: [0.351, 0.208, 0.11], metal: 0, roughness: r(0.6, 0.75, 0.9, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Palmqvist, A.: Spectrophotometer Measurement", porous: true, look: ["Brown kraft, matte."] },
  { id: "rust", name: "Rust", ja: "錆", family: "metal-oxide", albedo: [0.181, 0.057, 0.017], metal: 0, roughness: r(0.9, 1, 1, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Palmqvist, A.: Spectrophotometer Measurement", porous: true, look: ["Orange-brown to dark brown, flaky and matte; runs in streaks below the iron."] },
  { id: "snow", name: "Snow", ja: "雪", family: "ice", albedo: [0.85, 0.85, 0.85], metal: 0, roughness: r(0.4, 0.6, 0.9, "estimated"), ior: 1.31, grade: "reported", source: "Physically Based database (CC0), Lagarde, S.: Feeding a Physically Based Shading Model", porous: false, look: ["The brightest natural surface; shadows on snow are blue from the sky."] },
  { id: "ice", name: "Ice", ja: "氷", family: "ice", albedo: [0.973, 0.995, 1], metal: 0, roughness: r(0, 0.05, 0.3, "estimated"), ior: 1.31, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Clear; shows what lies behind it, with white where cracked or full of bubbles."] },
  { id: "water", name: "Water", ja: "水", family: "liquid", albedo: [0.969, 0.996, 0.997], metal: 0, roughness: r(0, 0, 0.1, "estimated"), ior: 1.333, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Clear: its look is reflection and what lies below (see WATER1)."] },
  { id: "glass", name: "Glass", ja: "ガラス", family: "glass", albedo: [0.984, 0.995, 0.995], metal: 0, roughness: r(0, 0, 0.1, "estimated"), ior: 1.52, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["Clear with sharp highlights and green-tinted edges (craft-glass-materials renders it)."] },
  { id: "pearl", name: "Pearl", ja: "真珠", family: "organic", albedo: [0.8, 0.75, 0.7], metal: 0, roughness: r(0.2, 0.35, 0.5, "estimated"), ior: 1.68, grade: "reported", source: "Physically Based database (CC0), Ozaki, R., Kikumoto, K., Takagaki, M., Kadowaki, K., & Odawara, K.: Structural colors of pearls", porous: false, look: ["Creamy with a soft lustre and faint iridescence."] },
  { id: "bone", name: "Bone", ja: "骨", family: "organic", albedo: [0.793, 0.793, 0.664], metal: 0, roughness: r(0.7, 0.9, 1, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Yarusskaya, A., Donina, K., Elert, G. (Ed.): Density of Bone", porous: true, look: ["Ivory-white, matte, faintly yellow."] },
  { id: "grass", name: "Grass", ja: "草", family: "plant", albedo: [0.105, 0.133, 0.041], metal: 0, roughness: r(0.4, 0.5, 0.7, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Jakubiec, J. A.: Spectral Materials Database", porous: false, look: ["Mid green; a meadow reads darker than a single blade because of shadows between blades."] },
  { id: "asphalt", name: "Asphalt", ja: "アスファルト", family: "stone", albedo: [0.043, 0.041, 0.04], metal: 0, roughness: r(0.4, 0.5, 0.8, "estimated"), ior: 1.6, grade: "reported", source: "Physically Based database (CC0), Jakubiec, J. A.: Spectral Materials Database", porous: true, look: ["Near black when new; greys with age."] },
  { id: "blackboard", name: "Blackboard", ja: "黒板", family: "manmade", albedo: [0.039, 0.039, 0.039], metal: 0, roughness: r(0.8, 0.9, 1, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Jakubiec, J. A.: Spectral Materials Database", porous: false, look: ["Very dark green-black, matte."] },
  { id: "rubber", name: "Rubber", ja: "ゴム", family: "manmade", albedo: [0.023, 0.023, 0.023], metal: 0, roughness: r(0.6, 0.7, 0.9, "estimated"), ior: 1.5, grade: "reported", source: "Physically Based database (CC0), Palmqvist, A.: Spectrophotometer Measurement", porous: false, look: ["Near black with a soft sheen."] },
  { id: "quartz", name: "Quartz", ja: "水晶", family: "stone", albedo: [1, 1, 1], metal: 0, roughness: r(0, 0, 0.1, "estimated"), ior: 1.54, grade: "reported", source: "Physically Based database (CC0), Wikipedia contributors: Quartz", porous: false, look: ["Clear crystal (see glass)."] },
  { id: "salt", name: "Salt", ja: "塩", family: "stone", albedo: [1, 1, 1], metal: 0, roughness: r(0.1, 0.2, 0.5, "estimated"), ior: 1.544, grade: "reported", source: "Physically Based database (CC0), Polyanskiy, M. N.: Refractive index database", porous: false, look: ["White grains with sparkle."] },
  { id: "wood-light", name: "Light fine-grained wood (like hinoki or spruce, planed)", ja: "白木", family: "wood", albedo: [0.621, 0.407, 0.18], metal: 0, roughness: r(0.4, 0.6, 0.8, "estimated"), grade: "measured", source: "mean of the ambientCG Wood022 colour map (CC0)", variation: [0.371, 0.492], porous: true, look: ["Pale, warm and fine-grained: plain wood (shiraki) left unfinished in shrines and baths.", "Grain runs along the board; the late wood is darker."], weathering: "wood" },
  { id: "wood-mid", name: "Mid brown processed wood", ja: "木", family: "wood", albedo: [0.441, 0.332, 0.198], metal: 0, roughness: r(0.35, 0.55, 0.75, "estimated"), grade: "measured", source: "mean of the ambientCG Wood017 colour map (CC0)", variation: [0.329, 0.364], porous: true, look: ["Mid brown with visible grain; oiled or waxed wood gains a soft sheen."], weathering: "wood" },
  { id: "wood-weathered", name: "Weathered wood shingles", ja: "風化した木", family: "wood", albedo: [0.13, 0.104, 0.077], metal: 0, roughness: r(0.7, 0.85, 0.95, "estimated"), grade: "measured", source: "mean of the ambientCG WoodSiding011 colour map (CC0)", variation: [0.076, 0.143], porous: true, look: ["Silver-grey to brown-grey, fibrous and matte: exposed wood after a year or more outdoors."] },
  { id: "bamboo-green", name: "Green bamboo culms", ja: "青竹", family: "plant", albedo: [0.342, 0.35, 0.046], metal: 0, roughness: r(0.25, 0.35, 0.5, "estimated"), grade: "measured", source: "mean of the ambientCG Bamboo001A colour map (CC0)", variation: [0.277, 0.375], porous: true, look: ["Yellow-green culms with a waxy sheen; nodes ring each segment."], weathering: "bamboo" },
  { id: "bamboo-dry", name: "Dried beige bamboo", ja: "白竹", family: "plant", albedo: [0.399, 0.292, 0.068], metal: 0, roughness: r(0.25, 0.35, 0.5, "estimated"), grade: "measured", source: "mean of the ambientCG Bamboo001B colour map (CC0)", variation: [0.255, 0.34], porous: true, look: ["Straw-beige when dried; the sheen remains."] },
  { id: "bamboo-old", name: "Old dark bamboo", ja: "煤竹", family: "plant", albedo: [0.22, 0.155, 0.062], metal: 0, roughness: r(0.3, 0.4, 0.55, "estimated"), grade: "measured", source: "mean of the ambientCG Bamboo001C colour map (CC0)", variation: [0.131, 0.194], porous: true, look: ["Dark brown with age and smoke (susudake, soot bamboo)."] },
  { id: "tatami-new", name: "New green tatami", ja: "青畳", family: "plant", albedo: [0.524, 0.662, 0.176], metal: 0, roughness: r(0.55, 0.7, 0.85, "estimated"), grade: "measured", source: "mean of the ambientCG Tatami002 colour map (CC0)", variation: [0.546, 0.655], porous: true, look: ["Fresh rush (igusa) is green with a fine woven texture."], weathering: "tatami" },
  { id: "tatami", name: "Tatami after some use", ja: "畳", family: "plant", albedo: [0.692, 0.528, 0.195], metal: 0, roughness: r(0.55, 0.7, 0.85, "estimated"), grade: "measured", source: "mean of the ambientCG Tatami001 colour map (CC0)", variation: [0.475, 0.6], porous: true, look: ["The rush passes from green to straw-gold as it ages."] },
  { id: "tatami-old", name: "Old brown tatami", ja: "古畳", family: "plant", albedo: [0.379, 0.188, 0.101], metal: 0, roughness: r(0.6, 0.75, 0.9, "estimated"), grade: "measured", source: "mean of the ambientCG Tatami003 colour map (CC0)", variation: [0.201, 0.245], porous: true, look: ["Brown with long use and sun."] },
  { id: "plaster-white", name: "White lime plaster", ja: "漆喰", family: "plaster", albedo: [0.693, 0.669, 0.645], metal: 0, roughness: r(0.8, 0.9, 1, "estimated"), grade: "measured", source: "mean of the ambientCG Plaster002 colour map (CC0)", variation: [0.635, 0.708], porous: true, look: ["White, matte, softly uneven: the walls of storehouses (kura) and castles."] },
  { id: "roof-tile-grey", name: "Grey clay roofing tiles", ja: "いぶし瓦", family: "ceramic", albedo: [0.135, 0.107, 0.122], metal: 0, roughness: r(0.4, 0.55, 0.7, "estimated"), grade: "measured", source: "mean of the ambientCG RoofingTiles015A colour map (CC0)", variation: [0.097, 0.13], porous: true, look: ["Smoked grey fired clay (ibushi-gawara) with a dull silver sheen along the ridges of each tile."] },
  { id: "thatch", name: "Thatched roof", ja: "茅葺", family: "plant", albedo: [0.157, 0.123, 0.089], metal: 0, roughness: r(0.85, 0.95, 1, "estimated"), grade: "measured", source: "mean of the ambientCG ThatchedRoof001A colour map (CC0)", variation: [0.104, 0.152], porous: true, look: ["Thick brown-grey straw with combed lines; darkens and grows moss with age."] },
  { id: "paper-washi", name: "White paper (a stand-in for washi)", ja: "和紙", family: "paper", albedo: [0.909, 0.9, 0.884], metal: 0, roughness: r(0.75, 0.85, 0.95, "estimated"), grade: "measured", source: "mean of the ambientCG Paper001 colour map (CC0)", variation: [0.887, 0.916], porous: true, look: ["Warm white, fibrous: long kōzo fibres show in the sheet and at torn edges; light glows through shōji."] },
  { id: "paper-kraft", name: "Beige-brown paper", ja: "茶紙", family: "paper", albedo: [0.375, 0.243, 0.138], metal: 0, roughness: r(0.7, 0.8, 0.9, "estimated"), grade: "measured", source: "mean of the ambientCG Paper006 colour map (CC0)", variation: [0.252, 0.275], porous: true, look: ["Brown paper, matte."] },
  { id: "leather", name: "Brown leather", ja: "革", family: "organic", albedo: [0.127, 0.039, 0.022], metal: 0, roughness: r(0.35, 0.5, 0.7, "estimated"), grade: "measured", source: "mean of the ambientCG Leather037 colour map (CC0)", variation: [0.056, 0.057], porous: true, look: ["Brown with a soft sheen on worn edges; creases darker."] },
  { id: "granite", name: "Granite (polished slab)", ja: "花崗岩", family: "stone", albedo: [0.408, 0.315, 0.243], metal: 0, roughness: r(0.15, 0.6, 0.85, "estimated"), grade: "measured", source: "mean of the ambientCG Granite001A colour map (CC0)", variation: [0.197, 0.478], porous: true, look: ["Speckled grey-pink-black crystals; polished it reflects, rough-hewn it is matte."] },
  { id: "slate", name: "Slate roofing", ja: "粘板岩", family: "stone", albedo: [0.037, 0.039, 0.036], metal: 0, roughness: r(0.5, 0.7, 0.85, "estimated"), grade: "measured", source: "mean of the ambientCG RoofingTiles003 colour map (CC0)", variation: [0.02, 0.062], porous: true, look: ["Dark grey, layered and slightly glossy when wet."] },
  { id: "bronze-old", name: "Eroded old bronze", ja: "古銅", family: "metal-oxide", albedo: [0.184, 0.142, 0.112], metal: 0, roughness: r(0.5, 0.7, 0.9, "estimated"), grade: "measured", source: "mean of the ambientCG Metal013 colour map (CC0); treated as its patina (non-metal)", variation: [0.107, 0.197], porous: false, look: ["Dark brown-grey with worn high points (see copper weathering)."] },
  // Lacquer (urushi), measured off a CC0 photograph of a Negoro tray (Met Museum): appearance colours under studio
  // light, so their albedo is approximate.
  { id: "lacquer-red", name: "Red lacquer (shu-urushi)", ja: "朱漆", family: "lacquer", albedo: [.62, .084, .016], metal: 0, roughness: r(.05, .12, .3, "estimated"), ior: 1.5, grade: "measured",
    source: "median sample of a Negoro tray, Met Museum (CC0) #cd5121, linearised", porous: false,
    look: ["Vermilion over a black undercoat; polished it holds a long soft highlight.", "Worn through at rims and where hands touch, the black shows (Negoro)."], weathering: "lacquer" },
  { id: "lacquer-black", name: "Black lacquer (kuro-urushi)", ja: "黒漆", family: "lacquer", albedo: [.034, .011, .006], metal: 0, roughness: r(.03, .08, .25, "estimated"), ior: 1.5, grade: "measured",
    source: "darkest third of a worn-through streak on the same Negoro tray (CC0) #341b11, linearised", porous: false,
    look: ["Deep warm black: lacquer is faintly brown, so thin coats read brown-black.", "Polished (roiro) it is a dark mirror: the shape is drawn by its reflections."] },
  // food (FOOD1's still lifes sample the same textures): colours estimated from close-up photographs of the foods
  { id: "food-beef-raw", name: "Raw beef", ja: "生の牛肉", family: "food", albedo: [0.3, 0.04, 0.045], metal: 0, roughness: r(0.2, 0.3, 0.45, "estimated"), ior: 1.35, grade: "estimated", source: "Estimated from close-up photographs of retail cuts; fascicle and bundle sizes estimated from the same", porous: false, look: ["Cherry red where the myoglobin has bloomed, darker in patches; fascicles end-on on a steak's face, marbling in the seams between bundles; wet."] },
  { id: "food-beef-wagyu", name: "Wagyu beef", ja: "和牛", family: "food", albedo: [0.42, 0.14, 0.12], metal: 0, roughness: r(0.2, 0.32, 0.45, "estimated"), ior: 1.35, grade: "estimated", source: "Estimated from close-up photographs of A5 wagyu sirloin", porous: false, look: ["Fat in a fine lace through the muscle, so the meat reads pink."] },
  { id: "food-beef-seared", name: "Seared crust", ja: "焼き目", family: "food", albedo: [0.12, 0.05, 0.025], metal: 0, roughness: r(0.3, 0.45, 0.6, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of pan-seared steak", porous: false, look: ["Fused protein beads browned by the Maillard reaction, darkest on the peaks, fissured where it shrank."] },
  { id: "food-salmon-raw", name: "Raw salmon", ja: "生鮭", family: "food", albedo: [0.62, 0.17, 0.07], metal: 0, roughness: r(0.12, 0.2, 0.3, "estimated"), ior: 1.35, grade: "estimated", source: "Estimated from close-up photographs of farmed Atlantic salmon fillets", porous: false, look: ["Coral muscle in W-shaped myomeres between white fat lines; translucent and wet."] },
  { id: "food-salmon-cooked", name: "Cooked salmon", ja: "焼き鮭", family: "food", albedo: [0.72, 0.36, 0.24], metal: 0, roughness: r(0.45, 0.6, 0.75, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of baked salmon", porous: false, look: ["Opaque and paler; flakes part along the septa; beads of white albumin."] },
  { id: "food-tuna-raw", name: "Raw tuna", ja: "鮪", family: "food", albedo: [0.17, 0.02, 0.03], metal: 0, roughness: r(0.15, 0.22, 0.3, "estimated"), ior: 1.35, grade: "estimated", source: "Estimated from close-up photographs of bluefin akami", porous: false, look: ["Deep garnet with faint pale septa arcs and an oily sheen."] },
  { id: "food-chicken-skin-raw", name: "Raw chicken skin", ja: "鶏皮", family: "food", albedo: [0.72, 0.52, 0.38], metal: 0, roughness: r(0.25, 0.35, 0.45, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of raw whole chicken", porous: false, look: ["Pale and moist; feather follicles in tracts; yellow fat and pink flesh showing through."] },
  { id: "food-chicken-skin-roast", name: "Roast chicken skin", ja: "ローストチキンの皮", family: "food", albedo: [0.35, 0.15, 0.05], metal: 0, roughness: r(0.2, 0.32, 0.45, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of roast chicken", porous: false, look: ["Tight micro-blisters browned gold to mahogany; rendered fat glistening in the dips."] },
  { id: "food-fish-skin", name: "Fish skin", ja: "魚の皮", family: "food", albedo: [0.3, 0.35, 0.38], metal: 0, roughness: r(0.12, 0.2, 0.3, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of whole sea bream and mackerel", porous: false, look: ["Cycloid scales overlapping in rows, darker at their free edges; a silver belly; the lateral line."] },
  { id: "food-bread-crust", name: "Bread crust", ja: "パンの皮", family: "food", albedo: [0.3, 0.13, 0.04], metal: 0, roughness: r(0.5, 0.62, 0.8, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of sourdough crust", porous: true, look: ["Maillard-browned, blistered and finely fissured; flour in the hollows."] },
  { id: "food-bread-crumb", name: "Bread crumb", ja: "パンの中身", family: "food", albedo: [0.75, 0.6, 0.38], metal: 0, roughness: r(0.5, 0.7, 0.85, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of open sourdough crumb", porous: true, look: ["Irregular alveoli, their walls glossy where the starch gelatinised."] },
  { id: "food-rice-cooked", name: "Cooked rice", ja: "ご飯", family: "food", albedo: [0.82, 0.78, 0.68], metal: 0, roughness: r(0.2, 0.3, 0.5, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of cooked japonica rice", porous: false, look: ["Plump, glossy, slightly translucent grains about 5.5 × 3 mm; dark gaps between."] },
  { id: "food-cheese-aged", name: "Aged hard cheese", ja: "熟成チーズ", family: "food", albedo: [0.78, 0.56, 0.22], metal: 0, roughness: r(0.35, 0.5, 0.6, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of aged Parmigiano and Comté", porous: false, look: ["Dense waxy paste, white tyrosine crystals, fine fissures."] },
  { id: "food-cheese-gratin", name: "Gratinated cheese", ja: "グラタンのチーズ", family: "food", albedo: [0.6, 0.35, 0.1], metal: 0, roughness: r(0.15, 0.3, 0.45, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of broiled gruyère", porous: false, look: ["Golden melted cheese, blisters scorched only on the tallest, fat in micro-droplets."] },
  { id: "food-tomato-skin", name: "Tomato skin", ja: "トマトの皮", family: "food", albedo: [0.55, 0.03, 0.01], metal: 0, roughness: r(0.05, 0.1, 0.2, "estimated"), ior: 1.45, grade: "estimated", source: "Estimated from close-up photographs of ripe tomatoes", porous: false, look: ["A glossy cuticle with micro-dimples; stretch lines round the stem end."] },
  { id: "food-pepper-skin", name: "Bell pepper skin", ja: "パプリカの皮", family: "food", albedo: [0.5, 0.015, 0.008], metal: 0, roughness: r(0.04, 0.07, 0.15, "estimated"), ior: 1.45, grade: "estimated", source: "Estimated from close-up photographs of bell peppers", porous: false, look: ["Very glossy; gentle dents and folds; mirror-like window highlights."] },
  { id: "food-potato-skin", name: "Potato skin", ja: "じゃがいもの皮", family: "food", albedo: [0.45, 0.32, 0.17], metal: 0, roughness: r(0.5, 0.65, 0.85, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of russet and new potatoes", porous: true, look: ["A raised russet net, pale lenticels, eyes, earth in the hollows."] },
  { id: "food-citrus-peel", name: "Citrus peel", ja: "柑橘の皮", family: "food", albedo: [0.85, 0.27, 0.01], metal: 0, roughness: r(0.2, 0.3, 0.4, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of oranges", porous: false, look: ["Oil glands as shallow pits of mixed sizes under a waxed sheen."] },
  { id: "food-mushroom-cap", name: "Mushroom cap", ja: "きのこの傘", family: "food", albedo: [0.25, 0.14, 0.07], metal: 0, roughness: r(0.55, 0.7, 0.85, "estimated"), grade: "estimated", source: "Estimated from close-up photographs of porcini and shiitake", porous: true, look: ["Radial fibrils from the centre, scaly cracks, a suede bloom."] },
];

/**
 * How materials age (reported unless marked): each stage with its time from new, colour and roughness. Colours are
 * linear-light albedo; the stage named by `at` is reached at that age in years.
 */
export interface WeatheringStage { at: number; label: string; albedo: readonly [number, number, number]; roughness: number; metal?: 0 | 1; grade: Grade; source: string }
export interface WeatheringRecord { track: WeatheringTrack; stages: readonly WeatheringStage[]; environments?: Readonly<Record<string, number>>; note: string }

const lin = (hex: string): [number, number, number] => [1, 3, 5].map(i => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }) as [number, number, number];

export const WEATHERING: Readonly<Record<WeatheringTrack, WeatheringRecord>> = {
  copper: {
    track: "copper", note: "Bright salmon, then iridescent oxide films within six months, sulfide browns within a few years, slate grey or black, and finally light green or blue-green (Wikipedia, Copper in architecture). The stages are timed for 20 years to green (industrial 15–25, rural 10–30 reported); `environments` gives years to green by air (marine 7–9 reported), and the physics rescales the clock. Arid air may stop at dark brown.",
    environments: { marine: 8, industrial: 20, rural: 20 },
    stages: [
      { at: 0, label: "new", albedo: [.932, .623, .522], roughness: .15, metal: 1, grade: "reported", source: "Physically Based database (CC0): copper" },
      { at: .5, label: "oxide film (salmon to russet)", albedo: lin("#ba8361"), roughness: .3, metal: 1, grade: "measured", source: "young copper, Statue of Liberty face replica (Commons, public domain), forehead" },
      { at: 3, label: "sulfide browns", albedo: lin("#81562a"), roughness: .45, metal: 0, grade: "measured", source: "the same face, tarnished cheek" },
      { at: 10, label: "slate grey to black", albedo: lin("#3a3330"), roughness: .6, metal: 0, grade: "estimated", source: "Wikipedia, Copper in architecture: 'dull slate grays or blacks' (colour estimated)" },
      { at: 20, label: "green patina (verdigris)", albedo: lin("#5c817f"), roughness: .75, metal: 0, grade: "measured", source: "verdigris run-off on stone below a copper lamp (Commons, CC0)" },
    ],
  },
  iron: {
    track: "iron", note: "Iron rusts orange-brown wherever water stands; rust is matte and flaky and runs in streaks below (estimated timing).",
    stages: [
      { at: 0, label: "bare", albedo: [.53, .513, .494], roughness: .45, metal: 1, grade: "reported", source: "Physically Based database (CC0): iron" },
      { at: .05, label: "flash rust", albedo: lin("#8a5a3c"), roughness: .7, metal: 0, grade: "estimated", source: "a mix of iron and rust" },
      { at: 2, label: "rust", albedo: [.181, .057, .017], roughness: 1, metal: 0, grade: "reported", source: "Physically Based database (CC0): rust" },
    ],
  },
  wood: {
    track: "wood", note: "Outdoors, sunlight breaks down the lignin at the surface: the wood browns, rain washes the products away and leaves a silver-grey fibrous layer; after a year the surface looked uniformly grey (Feist 1983, USDA Forest Products Laboratory).",
    stages: [
      { at: 0, label: "fresh", albedo: [.621, .407, .18], roughness: .6, grade: "measured", source: "ambientCG Wood022 (CC0)" },
      { at: .25, label: "browned", albedo: lin("#a07850"), roughness: .7, grade: "estimated", source: "Feist (1983): browning precedes greying" },
      { at: 1, label: "grey", albedo: [.13, .104, .077], roughness: .85, grade: "measured", source: "ambientCG WoodSiding011, weathered (CC0); timing Feist (1983)" },
    ],
  },
  bamboo: {
    track: "bamboo", note: "Cut bamboo fades from green to straw-beige as it dries, and darkens to brown with age and smoke (susudake); timing estimated.",
    stages: [
      { at: 0, label: "green", albedo: [.342, .35, .046], roughness: .35, grade: "measured", source: "ambientCG Bamboo001A (CC0)" },
      { at: .5, label: "dried", albedo: [.399, .292, .068], roughness: .35, grade: "measured", source: "ambientCG Bamboo001B (CC0)" },
      { at: 30, label: "old, smoked", albedo: [.22, .155, .062], roughness: .4, grade: "measured", source: "ambientCG Bamboo001C (CC0)" },
    ],
  },
  tatami: {
    track: "tatami", note: "New rush (igusa) is green and turns straw-gold with light and use, then brown; timing estimated.",
    stages: [
      { at: 0, label: "new (aodatami)", albedo: [.524, .662, .176], roughness: .7, grade: "measured", source: "ambientCG Tatami002 (CC0)" },
      { at: 1, label: "golden", albedo: [.692, .528, .195], roughness: .7, grade: "measured", source: "ambientCG Tatami001 (CC0)" },
      { at: 15, label: "old", albedo: [.379, .188, .101], roughness: .75, grade: "measured", source: "ambientCG Tatami003 (CC0)" },
    ],
  },
  paper: {
    track: "paper", note: "Paper yellows with light and acid; well-made washi of long kōzo fibres yellows far less than wood-pulp paper (estimated).",
    stages: [
      { at: 0, label: "new", albedo: [.909, .9, .884], roughness: .85, grade: "measured", source: "ambientCG Paper001 (CC0)" },
      { at: 50, label: "aged", albedo: lin("#d8c8a0"), roughness: .85, grade: "estimated", source: "estimated" },
    ],
  },
  lacquer: {
    track: "lacquer", note: "Red lacquer over black wears through at rims, edges and handles, so the black shows where hands touch (Negoro); `wearAt` in the physics gives the share worn.",
    stages: [
      { at: 0, label: "new red", albedo: [.62, .084, .016], roughness: .1, grade: "measured", source: "Negoro tray, Met Museum (CC0)" },
      { at: 100, label: "worn to black", albedo: [.034, .011, .006], roughness: .2, grade: "measured", source: "Negoro tray, Met Museum (CC0)" },
    ],
  },
};

/**
 * Wet surfaces (reported: Ångström 1925; Lekner & Dorf 1988, "Why some things are darker when wet", Applied Optics
 * 27): water filling a porous surface traps light by internal reflection at the water–air surface, so more of it is
 * absorbed. Measured dry and wet albedos: sand 0.182 and 0.091; black mould 0.141 and 0.084.
 */
export const WET = { n: 1.333, measured: [{ name: "sand", dry: .182, wet: .091 }, { name: "black mould", dry: .141, wet: .084 }] as const };

export const MATERIAL_SOURCES = [
  { title: "Physically Based database (CC0 1.0), A. Palmqvist et al.", url: "https://physicallybased.info/" },
  { title: "ambientCG (CC0 1.0) colour maps", url: "https://ambientcg.com/" },
  { title: "Round Negoro lacquer tray, The Met (CC0)", url: C("朱漆高盤_（根来塗）-Round_Negoro_Lacquer_Tray_MET_DP704100.jpg") },
  { title: "Verdigris (Commons, CC0)", url: C("Verdigris_(37580956304).jpg") },
  { title: "Face of Statue of Liberty (Commons, public domain)", url: C("Face_of_Statue_of_Liberty.jpg") },
  W("Copper_in_architecture"), W("Patina"),
  { title: "Feist (1983), Weathering of wood in structural uses, USDA Forest Products Laboratory", url: "https://research.fs.usda.gov/treesearch/29235" },
  { title: "Lekner & Dorf (1988), Why some things are darker when wet, Applied Optics 27", url: "https://fermatslibrary.com/s/why-some-things-are-darker-when-wet" },
  { title: "CIE 1976 L*a*b* lightness", url: "https://en.wikipedia.org/wiki/CIELAB_color_space" },
] as const;
