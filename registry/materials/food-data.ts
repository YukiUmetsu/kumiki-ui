/**
 * FOOD1 data: food that looks cooked the way it was cooked, in any art style. The temperatures at which food changes
 * (meat proteins and myoglobin, egg white and yolk, Maillard browning, caramelisation, starch gelatinisation), the
 * thermal properties that set how fast heat gets in, steam, gloss, and the colours and proportions of dishes common in
 * Japanese and everyday scenes.
 *
 * Each value is graded like the other foundations: `reported` (quoted from a cited source), `measured`, `estimated`.
 * `food-physics.ts` cooks by heat conduction; `food-render.ts` renders the result.
 */
import type { Range } from "../anatomy/foundation-shapes";
import { range as r } from "../anatomy/foundation-shapes";

const rep = (min: number, typical: number, max: number, source: string): Range => r(min, typical, max, "reported", source);
const est = (min: number, typical: number, max: number, source?: string): Range => r(min, typical, max, "estimated", source);

/** Where food changes, °C. */
export const COOKING_TEMPERATURES = {
  myosinSets: rep(40, 50, 55, "Wikipedia: Doneness; McGee, On Food and Cooking"),
  myoglobinFades: rep(60, 63, 70, "Wikipedia: Myoglobin (pink fades from about 60 °C, grey-brown above about 70 °C)"),
  eggWhiteSets: rep(62, 63, 65, "Wikipedia: Boiled egg (ovotransferrin sets about 62 °C)"),
  eggWhiteFirm: rep(77, 80, 85, "Wikipedia: Boiled egg (ovalbumin sets about 80 °C)"),
  eggYolkSets: rep(65, 68, 70, "Wikipedia: Boiled egg"),
  maillard: rep(140, 150, 165, "Wikipedia: Maillard reaction (rapid above about 140–165 °C)"),
  caramelSucrose: rep(160, 165, 180, "Wikipedia: Caramelization (sucrose about 160 °C)"),
  starchGelatinises: rep(55, 65, 85, "Wikipedia: Starch gelatinization"),
  boiling: rep(100, 100, 100, "Water at sea level"),
} as const;

/** Doneness of beef by internal temperature, °C, and the colour of the cut face (reported: Wikipedia, Doneness; USDA). */
export const DONENESS: readonly { id: string; label: string; core: Range; look: string; colour: string }[] = [
  { id: "blue", label: "Blue", core: rep(46, 48, 49, "Wikipedia: Doneness"), look: "Deep red, cool centre, barely seared", colour: "#8a1d24" },
  { id: "rare", label: "Rare", core: rep(52, 52, 55, "Wikipedia: Doneness"), look: "Bright red centre, a thin grey band", colour: "#b02a2f" },
  { id: "medium-rare", label: "Medium rare", core: rep(55, 57, 60, "Wikipedia: Doneness"), look: "Warm pink-red centre", colour: "#c4484a" },
  { id: "medium", label: "Medium", core: rep(60, 63, 65, "Wikipedia: Doneness"), look: "Pink centre, wider grey-brown band", colour: "#c87a72" },
  { id: "medium-well", label: "Medium well", core: rep(65, 68, 69, "Wikipedia: Doneness"), look: "A trace of pink", colour: "#a98068" },
  { id: "well", label: "Well done", core: rep(71, 74, 100, "Wikipedia: Doneness"), look: "Grey-brown throughout", colour: "#86664f" },
];

/** Thermal diffusivity, m²/s: how fast heat spreads inside (reported: Wikipedia, Thermal diffusivity; food engineering tables). */
export const DIFFUSIVITY: Record<string, Range> = {
  beef: rep(1.2e-7, 1.35e-7, 1.5e-7, "Food engineering tables (lean beef about 1.3–1.4 × 10⁻⁷ m²/s)"),
  egg: rep(1.3e-7, 1.4e-7, 1.5e-7, "Food engineering tables (egg white and yolk about 1.4 × 10⁻⁷)"),
  bread: est(1.5e-7, 2e-7, 3e-7, "Porous crumb"),
  water: rep(1.43e-7, 1.43e-7, 1.43e-7, "Wikipedia: Thermal diffusivity (water at 25 °C)"),
};

/** Steam over hot food: visible as fog where the vapour cools and condenses. */
export const STEAM = {
  visibleAbove: rep(60, 70, 80, "Visible when the food is hot enough to give off vapour that condenses in cooler air (estimated from kitchen observation)"),
  riseSpeed: est(0.2, 0.4, 0.8, "Buoyant plume over a bowl"),
  fadeHeight: est(0.05, 0.15, 0.35, "Mixes and evaporates within centimetres to tens of centimetres"),
  notes: ["Steam is invisible at the surface (pure vapour), white a centimetre or two above, then curls and thins.", "It shows best against a dark background, backlit.", "Cooler, damper air: more and longer steam; a draught bends it."],
} as const;

/** Gloss: how food reflects (roughness 0 mirror … 1 matte). */
export const FOOD_GLOSS: readonly { what: string; roughness: Range; note: string }[] = [
  { what: "Glazed, sauce-coated (teriyaki, mitarashi)", roughness: est(0.08, 0.15, 0.25), note: "Sharp highlights; the glaze pools in hollows." },
  { what: "Cooked rice", roughness: est(0.25, 0.35, 0.45), note: "Each grain a small soft highlight; Japanese short-grain rice glossy and sticky." },
  { what: "Raw fish (sashimi)", roughness: est(0.15, 0.25, 0.35), note: "Translucent and moist; light enters and glows; muscle bands (myotomes) visible." },
  { what: "Fresh fruit skin", roughness: est(0.2, 0.35, 0.6), note: "Waxy; peaches and persimmons with a soft bloom." },
  { what: "Bread crust", roughness: est(0.55, 0.7, 0.85), note: "Dull, with a sheen only where glazed or brushed with egg." },
  { what: "Seared meat crust", roughness: est(0.4, 0.55, 0.7), note: "Rough browned crust; fat glistens." },
];

/** Dishes and foods common in scenes: size and look. */
export const DISHES: readonly { id: string; label: string; ja?: string; size: string; look: readonly string[]; sources: readonly string[] }[] = [
  { id: "onigiri", label: "Rice ball", ja: "おにぎり", size: "A triangle about 7–9 cm a side, 3 cm thick; about 100–120 g", look: ["Rounded triangle; nori wrapping the base or the whole.", "Grains visible at the surface, not a smooth shape."], sources: ["Wikipedia: Onigiri"] },
  { id: "nigiri", label: "Nigiri sushi", ja: "握り寿司", size: "About 5–6 cm long; rice about 15–20 g", look: ["A slice of fish draped over a rice pad, edges hanging a little.", "Fish translucent with lines of muscle; rice grains loose, not packed."], sources: ["Wikipedia: Sushi"] },
  { id: "ramen", label: "Ramen", ja: "ラーメン", size: "Bowl about 18–22 cm across", look: ["Clear or cloudy broth with fat droplets on top catching the light.", "Noodles lifted in a wave; toppings arranged in sectors: chāshū, egg halves with jammy yolk, nori, negi."], sources: ["Wikipedia: Ramen"] },
  { id: "dango", label: "Dango", ja: "団子", size: "Balls about 2.5–3 cm on a skewer of 3–4", look: ["Hanami dango: pink, white, green. Mitarashi: glossy brown glaze, slightly charred."], sources: ["Wikipedia: Dango"] },
  { id: "tempura", label: "Tempura", ja: "天ぷら", size: "Prawns about 10–15 cm", look: ["A pale gold, lacy batter with crisp edges, not an even brown shell.", "Served on paper that shows oil spots."], sources: ["Wikipedia: Tempura"] },
  { id: "persimmon", label: "Persimmon", ja: "柿", size: "About 6–8 cm across", look: ["Deep orange, slightly flattened, a four-lobed green-brown calyx.", "Autumn; dried (hoshigaki) hang in strings, dark and floury-white."], sources: ["Wikipedia: Japanese persimmon"] },
  { id: "toast", label: "Toast", size: "A slice about 12 × 12 cm, 1.5–2.5 cm thick (shokupan)", look: ["The browning follows the heat: darker at the edges and where the crumb stands up.", "Crumb pores visible as tiny pits."], sources: ["Wikipedia: Toast (food)"] },
];
