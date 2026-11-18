/** Horse coat colours, white patterns, spotting and markings, configurable at run time, and horse sizes, for `horse-3d`.
 *
 * Colours and patterns follow horse coat genetics and were read off photographs (Wikimedia Commons, one or two
 * per coat; see `reference` on each preset):
 * - base colours: bay (black points), chestnut, black, seal brown, liver chestnut;
 * - dilutions: palomino, buckskin, cremello, dun and grullo (primitive marks), champagne (mottled skin),
 *   silver dapple (flaxen-silver mane on a dark body);
 * - modifiers: grey (progressive whitening, dapples, flea-bites), roan (white hairs on the body only; head,
 *   lower legs, mane and tail stay solid), sooty (dark topline);
 * - white patterns: tobiano (smooth white crossing the back, white legs, dark head), frame overo (jagged white
 *   on the sides that never crosses the back, dark legs), sabino (ragged, roaned white high on the legs and
 *   belly), splash (white from below, as if dipped);
 * - leopard complex: leopard (dark spots on white), blanket (white over the hips with spots), snowflake (white
 *   flecks), few-spot;
 * - markings: face (star, strip, snip, blaze, bald) and each leg (coronet, pastern, sock, stocking), with pink
 *   skin and pale, striped hooves under white.
 *
 * The coat is computed per pixel on the GPU from the rest-pose surface position (crisp at any distance), plus
 * masks baked per vertex by `createStockHorse` (`kmcoata`: lower legs, muzzle, ears, eye rings; `kmcoatb`: occlusion,
 * topline, hoof, dark skin; `kmcoatc`: wet and lather areas; hair: `hair` along the lock, `hairroot` its root).
 * `applyHorseCoat(root, spec)` patches every coat and hair material under a horse (code asset or loaded GLB);
 * `handle.set(spec)` changes the coat live (uniforms only, no recompile).
 */
import { Color, Vector3, Vector4 } from "three";
import type { Material, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, WebGLProgramParametersWithUniforms } from "three";
import { HORSE_LANDMARKS } from "./horse-3d";

export type HorseWhitePattern = "none" | "tobiano" | "frame-overo" | "sabino" | "splash";
export type HorseSpotPattern = "none" | "leopard" | "blanket" | "snowflake" | "few-spot";
export type HorseFaceMarking = "none" | "star" | "strip" | "snip" | "star-strip" | "blaze" | "bald";
export type HorseLegMarking = "none" | "coronet" | "pastern" | "sock" | "stocking";

export interface HorseCoatSpec {
  id: string;
  label: string;
  /** Body hair in shade and in sun (sRGB): the countershading runs between them. */
  body: string;
  bodyLight: string;
  /** Black points (lower legs, ear rims), or null for coats without them (chestnut, palomino, cremello …). */
  points: string | null;
  /** Mane and tail at the root and at the tips. */
  mane: string;
  maneTip: string;
  /** Dark skin (muzzle, eye rings), pink skin (under white hair) and how mottled the skin is (champagne, appaloosa). */
  skin?: string;
  skinMottle?: number;
  /** Hoof horn on a dark leg. Under white hair hooves are pale. */
  hoof?: string;
  /** A darker topline (sooty), 0–1. */
  sooty?: number;
  /** Dapples: 0–1, and their size (m). Light rings on greys, a faint darker net on bays and chestnuts. */
  dapples?: number;
  dappleSize?: number;
  /** Share of white hairs on the body, 0–1 (roan). */
  roan?: number;
  /** Greying, 0 (born colour) … 1 (white), and flea-bite specks, 0–1. */
  grey?: number;
  fleabites?: number;
  /** Dun primitive markings (dorsal stripe, leg barring), 0–1. */
  dun?: number;
  white?: { pattern: HorseWhitePattern; amount: number; seed?: number };
  spots?: { pattern: HorseSpotPattern; amount: number; size?: number; seed?: number };
  face?: HorseFaceMarking;
  /** Leg markings: fore-near (left fore), fore-far, hind-near, hind-far. */
  legs?: readonly [HorseLegMarking, HorseLegMarking, HorseLegMarking, HorseLegMarking];
  /** Sweat and lather from exertion, 0–1. */
  sweat?: number;
  /** Sheen tint at grazing angles. */
  sheen?: string;
  /** The photograph the colours were read from. */
  reference?: { title: string; url: string; license: string };
}

const C = (title: string, license: string) => ({ title, url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title.replace(/^File:/, "").replace(/ /g, "_"))}`, license });

/**
 * Presets. Body colours are albedo estimates: the shaded and sunlit body tones sampled on the reference photograph,
 * darkened for exposure and checked against renders in the same light.
 */
export const HORSE_COAT_PRESETS: Readonly<Record<string, HorseCoatSpec>> = {
  bay: { id: "bay", label: "Bay", body: "#4a200d", bodyLight: "#82401b", points: "#120c09", mane: "#0f0a08", maneTip: "#2a1a12", face: "star", legs: ["none", "none", "none", "sock"], sooty: .15,
    reference: C("File:Brown and black horse.JPG", "CC BY-SA 3.0") },
  "dark-bay": { id: "dark-bay", label: "Dark bay / seal brown", body: "#2a160c", bodyLight: "#5a3420", points: "#0c0907", mane: "#0a0807", maneTip: "#1c1410", sooty: .45,
    reference: C("File:Seal brown horse in Hatfield Broad Oak Essex England 01.jpg", "CC BY-SA 4.0") },
  chestnut: { id: "chestnut", label: "Chestnut (sorrel)", body: "#6a3412", bodyLight: "#b06a2c", points: null, mane: "#7a3a16", maneTip: "#b8865a", face: "blaze", legs: ["sock", "none", "pastern", "none"],
    reference: C("File:Sorrel gelding (cropped).jpg", "CC BY-SA 4.0") },
  "flaxen-chestnut": { id: "flaxen-chestnut", label: "Flaxen chestnut", body: "#6a3a22", bodyLight: "#a86a44", points: null, mane: "#c8b89a", maneTip: "#ede4cf", face: "strip", legs: ["sock", "sock", "pastern", "none"],
    reference: C("File:FlaxenChestnutNF.jpg", "CC BY 3.0") },
  "liver-chestnut": { id: "liver-chestnut", label: "Liver chestnut", body: "#2a1309", bodyLight: "#4e2614", points: null, mane: "#2a1209", maneTip: "#5a3020", face: "star",
    reference: C("File:Liver chestnut horse.jpg", "public domain") },
  black: { id: "black", label: "Black", body: "#0f0d0c", bodyLight: "#2e2924", points: "#0a0909", mane: "#080707", maneTip: "#191512",
    reference: C("File:Brown and black horse.JPG", "CC BY-SA 3.0") },
  buckskin: { id: "buckskin", label: "Buckskin", body: "#6e5232", bodyLight: "#b29468", points: "#14100c", mane: "#110d0a", maneTip: "#2c2218", sooty: .1,
    reference: C("File:Quarter Horse Buckskin (cropped).JPG", "CC BY-SA 3.0") },
  palomino: { id: "palomino", label: "Palomino", body: "#a6845a", bodyLight: "#e2c890", points: null, mane: "#e4dac2", maneTip: "#faf5e6", face: "blaze", legs: ["none", "sock", "none", "sock"],
    reference: C("File:Quarter Horse(REFON)-cleaned.jpg", "CC BY 2.5") },
  cremello: { id: "cremello", label: "Cremello", body: "#b8b2a2", bodyLight: "#e6e1d2", points: null, mane: "#ece6d6", maneTip: "#fbf8ee", skin: "#d6a49a", skinMottle: 0,
    reference: C("File:Cremello.jpg", "CC BY 2.0") },
  dun: { id: "dun", label: "Bay dun", body: "#7a603e", bodyLight: "#b89c70", points: "#16110d", mane: "#120e0b", maneTip: "#3a2c20", dun: 1,
    reference: C("File:Dun Horse Dorsal Stripes.jpg", "CC BY-SA 3.0") },
  grullo: { id: "grullo", label: "Grullo (mouse dun)", body: "#5e534c", bodyLight: "#9a8e84", points: "#151312", mane: "#1a1715", maneTip: "#8a8078", dun: 1, sooty: .2,
    reference: C("File:Mouse dun pony 01.jpg", "CC BY-SA 4.0") },
  champagne: { id: "champagne", label: "Gold champagne", body: "#a8825e", bodyLight: "#e2c4a8", points: null, mane: "#e8d8bc", maneTip: "#f8efdd", skin: "#9a6a62", skinMottle: .7,
    reference: C("File:GoldChampagne.jpg", "CC BY-SA 3.0") },
  "silver-dapple": { id: "silver-dapple", label: "Silver dapple", body: "#2c241e", bodyLight: "#5a473b", points: "#2a221c", mane: "#cfc6bd", maneTip: "#f3eee8", dapples: .55, dappleSize: .09,
    reference: C("File:Silver Dapple Mare & Foal.jpg", "CC BY 2.0") },
  "dapple-grey": { id: "dapple-grey", label: "Dapple grey", body: "#4e4c4a", bodyLight: "#8a8784", points: null, mane: "#9a9590", maneTip: "#e2ddd6", grey: .55, dapples: .85, dappleSize: .085,
    reference: C("File:Dapple grey horse near West Cot House - geograph.org.uk - 3726337.jpg", "CC BY-SA 2.0") },
  "flea-bitten-grey": { id: "flea-bitten-grey", label: "Flea-bitten grey", body: "#5a4a40", bodyLight: "#8a7262", points: null, mane: "#cfc8bf", maneTip: "#f1ece4", grey: .93, fleabites: .7,
    reference: C("File:Cavalo crioulo nordestino de cor tordilho pastando.jpg", "CC BY-SA 4.0") },
  "blue-roan": { id: "blue-roan", label: "Blue roan", body: "#151313", bodyLight: "#3a3532", points: "#0c0b0b", mane: "#0c0b0b", maneTip: "#2a2624", roan: .76, face: "blaze",
    reference: C("File:Blue Roan.jpg", "CC BY 2.0") },
  "bay-roan": { id: "bay-roan", label: "Bay roan", body: "#4a200d", bodyLight: "#82401b", points: "#120c09", mane: "#0f0a08", maneTip: "#2a1a12", roan: .55,
    reference: C("File:BayRoanQuarter.jpg", "CC BY-SA 2.0") },
  "red-roan": { id: "red-roan", label: "Red (strawberry) roan", body: "#6a3412", bodyLight: "#a8602c", points: null, mane: "#6a3214", maneTip: "#9a6038", roan: .55,
    reference: C("File:Red roan Quarter Horse (cropped).jpg", "CC BY-SA 4.0") },
  tobiano: { id: "tobiano", label: "Tobiano (bay)", body: "#3a1c10", bodyLight: "#6e3a20", points: "#120c09", mane: "#0f0a08", maneTip: "#2a1a12", white: { pattern: "tobiano", amount: .55, seed: 3 }, face: "star",
    reference: C("File:Tobiano (8625103273).jpg", "CC BY-SA 2.0") },
  "frame-overo": { id: "frame-overo", label: "Frame overo (black)", body: "#141110", bodyLight: "#3a322c", points: "#0b0a09", mane: "#0a0908", maneTip: "#1c1814", white: { pattern: "frame-overo", amount: .55, seed: 5 }, face: "bald",
    reference: C("File:FrameOvero.jpg", "CC BY 2.0") },
  sabino: { id: "sabino", label: "Sabino (chestnut)", body: "#6a3412", bodyLight: "#b06a2c", points: null, mane: "#d8c4a6", maneTip: "#f2e8d6", white: { pattern: "sabino", amount: .5, seed: 7 }, face: "bald",
    reference: C("File:SabinoTypeMarkings.jpg", "CC BY 3.0") },
  splash: { id: "splash", label: "Splashed white (bay)", body: "#5a2c14", bodyLight: "#9a5a30", points: "#120c09", mane: "#1a120c", maneTip: "#3a2618", white: { pattern: "splash", amount: .78, seed: 9 }, face: "bald",
    reference: C("File:Splash White Mare and Foal.jpg", "CC BY 2.0") },
  leopard: { id: "leopard", label: "Leopard appaloosa", body: "#1a1512", bodyLight: "#3a302a", points: null, mane: "#2a2420", maneTip: "#8a807a", spots: { pattern: "leopard", amount: .92, size: .072, seed: 11 }, skinMottle: .8,
    reference: C("File:Leopard appaloosa isolated.jpg", "CC BY-SA 3.0") },
  blanket: { id: "blanket", label: "Blanket appaloosa (black)", body: "#141110", bodyLight: "#3a322c", points: "#0b0a09", mane: "#0a0908", maneTip: "#1c1814", spots: { pattern: "blanket", amount: .6, size: .1, seed: 13 }, skinMottle: .6,
    reference: C("File:Blanket appaloosa isolated.jpg", "CC BY-SA 3.0") },
  snowflake: { id: "snowflake", label: "Snowflake appaloosa", body: "#2a160c", bodyLight: "#5a3420", points: "#0c0907", mane: "#0a0807", maneTip: "#1c1410", spots: { pattern: "snowflake", amount: .55, size: .05, seed: 17 }, skinMottle: .5,
    reference: C("File:AppaloosaSnowflakes.jpg", "CC BY-SA 3.0") },
};

export type HorseSizeId = "small" | "medium" | "large";

/**
 * Sizes by withers height. FEI rules class a pony at up to 1.48 m (14.2 hh) without shoes; breed guides give Arabians
 * 14.1–15.1 hh (1.45–1.55 m), Quarter Horses 14.3–16 hh (1.50–1.63 m) and Thoroughbreds 15.2–17 hh (1.57–1.73 m).
 * The stock horse is built at 1.52 m and scaled (see `horseSize`); its head is a little larger on small horses.
 */
export const HORSE_SIZES: Readonly<Record<HorseSizeId, { height: number; label: string }>> = {
  small: { height: 1.42, label: "Small, 1.42 m (14 hh): pony height (FEI: up to 1.48 m)" },
  medium: { height: 1.52, label: "Medium, 1.52 m (15 hh): Quarter Horse (14.3–16 hh)" },
  large: { height: 1.68, label: "Large, 1.68 m (16.2 hh): Thoroughbred (15.2–17 hh)" },
};
/** The height the stock horse is built at, and the range sizes are clamped to. */
export const HORSE_BUILT_HEIGHT = 1.52, HORSE_HEIGHT_RANGE: readonly [number, number] = [1.3, 1.8];

/**
 * Scale for a size preset or a withers height in metres: `scale` for length and height, `widthScale` (√scale) across
 * the body, and `headScale`. The width and head scales are design estimates: taller riding horses are taken to be
 * leggier rather than proportionally wider. Only the width (Z) differs, and every bone of the gait turns about Z, so
 * the skeleton never shears.
 */
export function horseSize(size: HorseSizeId | number = "medium") {
  const height = Math.max(HORSE_HEIGHT_RANGE[0], Math.min(HORSE_HEIGHT_RANGE[1], typeof size === "number" ? size : HORSE_SIZES[size].height));
  const scale = height / HORSE_BUILT_HEIGHT, widthScale = Math.sqrt(scale);
  // Relative head size shrinks a little as horses get bigger (allometry): about +4% at 1.42 m, −3% at 1.68 m.
  const headScale = scale < 1 ? 1 + (1 - scale) * .6 : 1 - (scale - 1) * .3;
  return { height, scale, widthScale, headScale };
}

// ------------------------------------------------------------------ shader

const PATTERN_ID: Record<HorseWhitePattern, number> = { none: 0, tobiano: 1, "frame-overo": 2, sabino: 3, splash: 4 };
const SPOT_ID: Record<HorseSpotPattern, number> = { none: 0, leopard: 1, blanket: 2, snowflake: 3, "few-spot": 4 };
const FACE_ID: Record<HorseFaceMarking, number> = { none: 0, star: 1, strip: 2, snip: 3, "star-strip": 4, blaze: 5, bald: 6 };
/** White leg-marking heights (m on the 1.52 m horse): coronet band, pastern, sock (over the fetlock), stocking (to the knee). */
const LEG_HEIGHT: Record<HorseLegMarking, number> = { none: 0, coronet: .1, pastern: .15, sock: .3, stocking: .48 };

const COAT_GLSL = /* glsl */`
uniform vec3 hcBody, hcLight, hcPoints, hcSkin, hcPink, hcHoof, hcWhite, hcMane, hcManeTip;
uniform float hcHasPoints, hcSooty, hcDapples, hcDappleSize, hcRoan, hcGrey, hcFleabites, hcDun, hcWhiteAmount, hcSpotAmount, hcSpotSize, hcSweat, hcSkinMottle;
uniform float hcWhitePattern, hcSpotPattern, hcFace, hcSeedW, hcSeedS;
uniform vec4 hcLegs;
uniform vec3 hcPoll, hcU, hcV;
float hcHash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float hcNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hcHash(i), hcHash(i + vec3(1, 0, 0)), f.x), mix(hcHash(i + vec3(0, 1, 0)), hcHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hcHash(i + vec3(0, 0, 1)), hcHash(i + vec3(1, 0, 1)), f.x), mix(hcHash(i + vec3(0, 1, 1)), hcHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float hcFbm(vec3 p) { float s = 0.0, a = .5; for (int i = 0; i < 4; i++) { s += a * hcNoise(p); p = p * 2.03 + 11.7; a *= .5; } return s / .9375; }
// Nearest feature point (Worley): x = distance, y = the cell's random id.
vec2 hcCells(vec3 p) {
  vec3 i = floor(p), f = fract(p); float d = 8.0, id = 0.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = vec3(hcHash(i + g), hcHash(i + g + 19.1), hcHash(i + g + 47.3));
    vec3 r = g + o - f; float dd = dot(r, r);
    if (dd < d) { d = dd; id = hcHash(i + g + 5.3); }
  }
  return vec2(sqrt(d), id);
}
float hcHead(vec3 p) { return smoothstep(.8, .9, p.x) * smoothstep(1.18, 1.32, p.y); }
// White patterns; p is the rest-pose surface point (m, +X forward, +Y up), n its normal.
float hcWhitePat(vec3 p, vec3 n) {
  float az = abs(p.z), a = hcWhiteAmount;
  if (hcWhitePattern < .5) return 0.0;
  if (hcWhitePattern < 1.5) {
    // Tobiano: smooth white crossing the back in broad vertical bands, white legs, a dark head.
    float band = hcFbm(vec3(p.x * 1.3 + hcSeedW, p.y * .45, az * .5 + sign(p.z) * .15));
    float m = smoothstep(.02, -.02, mix(.7, .3, a) - band - .25 * (1.0 - smoothstep(.55, 1.0, p.y)));
    m = max(m, 1.0 - smoothstep(.36, .46, p.y + .08 * hcNoise(p * 7.0)));
    return m * (1.0 - hcHead(p));
  }
  if (hcWhitePattern < 2.5) {
    // Frame overo: jagged horizontal white on the flanks and neck, framed by colour (back, belly, legs, chest).
    float side = smoothstep(.35, .7, abs(n.z));
    float barrel = smoothstep(.86, .98, p.y) * (1.0 - smoothstep(1.3, 1.42, p.y)) * smoothstep(-.9, -.65, p.x) * (1.0 - smoothstep(.4, .6, p.x));
    float neck = smoothstep(.32, .45, p.x) * (1.0 - smoothstep(.78, .88, p.x)) * smoothstep(1.12, 1.25, p.y) * (1.0 - smoothstep(1.55, 1.65, p.y));
    float f = hcFbm(vec3(p.x * 2.2 + hcSeedW, p.y * 3.2, az * 2.0 + sign(p.z) * .7)) + .14 * (hcNoise(p * 22.0) - .5);
    return max(barrel, neck) * side * smoothstep(-.015, .015, f - mix(.72, .4, a));
  }
  if (hcWhitePattern < 3.5) {
    // Sabino: white rising from the legs and belly with ragged, roaned edges.
    float edge = mix(.32, .95, a) + .14 * (hcFbm(p * 4.0 + hcSeedW) - .5);
    float legs = 1.0 - smoothstep(edge - .03, edge + .03, p.y);
    float belly = smoothstep(1.0, .86, p.y) * smoothstep(-.62, -.4, p.x) * (1.0 - smoothstep(.32, .5, p.x)) * smoothstep(.5, .62, hcFbm(p * 5.0 + 3.0) + a * .3);
    float m = max(legs, belly);
    return clamp(m + (hcNoise(p * 260.0) - .5) * 1.4 * (1.0 - abs(m * 2.0 - 1.0)), 0.0, 1.0);
  }
  // Splash: white from below, a smooth level line, as if the horse stood in white paint.
  float level = mix(.35, 1.05, a) + .03 * (hcNoise(p * 3.0 + hcSeedW) - .5) + .05 * p.x;
  return 1.0 - smoothstep(level - .012, level + .012, p.y);
}
// Leopard complex: x = white base, y = spots of the base colour.
vec2 hcSpots(vec3 p) {
  if (hcSpotPattern < .5) return vec2(0.0);
  vec3 q = p / hcSpotSize; q.x *= .8;
  vec2 c = hcCells(q + hcSeedS * 7.13);
  if (hcSpotPattern > 2.5 && hcSpotPattern < 3.5) {
    // Snowflake: small white flecks on the dark coat, more over the hips.
    float flake = (1.0 - smoothstep(.2, .26, c.x)) * step(1.0 - hcSpotAmount * (.6 + .4 * smoothstep(.3, -.6, p.x)), c.y);
    return vec2(flake, 0.0);
  }
  // Spots from a freckle to a palm's width, larger and denser over the hindquarters.
  float r = (.19 + .24 * c.y) * (.85 + .3 * smoothstep(.2, -.6, p.x));
  float spot = (1.0 - smoothstep(r - .03, r + .03, c.x)) * step(1.0 - hcSpotAmount * (.75 + .25 * smoothstep(.2, -.6, p.x)), hcHash(vec3(c.y * 91.7, 3.1, 7.7)));
  float base = 1.0;
  if (hcSpotPattern > 1.5 && hcSpotPattern < 2.5) {
    // Blanket: white over the hips and croup with a ragged front edge.
    float reach = mix(-.55, .1, hcSpotAmount);
    base = smoothstep(.02, -.02, p.x - reach + .25 * (hcFbm(p * 4.0 + hcSeedS) - .5)) * smoothstep(1.0, 1.15, p.y + .1 * hcNoise(p * 6.0));
  }
  if (hcSpotPattern > 3.5) { base = 1.0; spot *= smoothstep(1.2, 1.4, p.y) * .8; }
  return vec2(base, spot * base);
}
float hcFaceMark(vec3 p, vec3 n) {
  if (hcFace < .5 || hcHead(p) < .01) return 0.0;
  vec2 hp = p.xy - hcPoll.xy;
  float u = dot(hp, hcU.xy), w = abs(p.z), front = smoothstep(.15, .55, dot(n.xy, hcV.xy)), rag = .004 * (hcNoise(p * 60.0) - .5);
  float star = (1.0 - smoothstep(.024, .03, length(vec2((u - .155) * .8, w)) + rag)) * front;
  float strip = (1.0 - smoothstep(.012, .017, w + rag)) * smoothstep(.19, .21, u) * (1.0 - smoothstep(.42, .45, u)) * front;
  float snip = (1.0 - smoothstep(.022, .03, w + rag)) * smoothstep(.47, .49, u) * front;
  float blaze = (1.0 - smoothstep(.03 + .03 * (u - .1), .036 + .03 * (u - .1), w + rag)) * smoothstep(.1, .12, u) * smoothstep(-.2, .2, dot(n.xy, hcV.xy));
  float bald = (1.0 - smoothstep(.075, .09, w + rag * 3.0)) * smoothstep(.06, .1, u) * smoothstep(-.6, -.2, dot(n.xy, hcV.xy));
  if (hcFace < 1.5) return star;
  if (hcFace < 2.5) return strip;
  if (hcFace < 3.5) return snip;
  if (hcFace < 4.5) return max(star, max(strip, snip));
  if (hcFace < 5.5) return blaze;
  return bald;
}
float hcLegMark(vec3 p) {
  float fore = step(-.25, p.x), near = step(p.z, 0.0);
  float h = fore > .5 ? (near > .5 ? hcLegs.x : hcLegs.y) : (near > .5 ? hcLegs.z : hcLegs.w);
  if (h <= 0.0 || p.y > .62) return 0.0;
  // Socks rise a little higher at the back of the leg; edges are slightly ragged.
  float edge = h + .015 * (hcNoise(p * 40.0) - .5) - .012 * sign(p.x - (fore > .5 ? .22 : -.78));
  return 1.0 - smoothstep(edge - .006, edge + .006, p.y);
}
// The coat colour at a rest-pose point. a: lower legs, muzzle, ears, eye rings; b: occlusion, topline, hoof, dark skin.
vec3 horseCoat(vec3 p, vec3 n, vec4 a, vec4 b, vec2 c, out float wet) {
  float bloom = hcFbm(p * 9.0), mottle = hcFbm(p * 4.0);
  vec3 col = mix(hcBody, hcLight, clamp(b.y * .62 + mottle * .28, 0.0, 1.0) * .62) * (.9 + .2 * bloom);
  // Sooty: dark hairs along the topline.
  col *= 1.0 - hcSooty * .45 * smoothstep(1.15, 1.48, p.y) * (.6 + .4 * hcNoise(p * 5.0));
  // Dapples on a coloured coat: a faint darker net between round dapples.
  vec2 dc = hcCells(p / max(.02, hcDappleSize));
  float net = smoothstep(.32, .58, dc.x) * smoothstep(.85, 1.1, p.y) * (1.0 - smoothstep(1.5, 1.62, p.y));
  // Greying: the coat whitens, the head and body first, the legs last; dapples are pale rings in a darker net.
  float greyLegs = hcGrey * (1.0 - .45 * (1.0 - smoothstep(.45, .8, p.y)));
  vec3 greyCol = mix(hcLight * 1.25 + .1, vec3(.86, .85, .83), smoothstep(.3, .9, hcGrey));
  col = mix(col, greyCol, clamp(greyLegs, 0.0, 1.0));
  col *= 1.0 - hcDapples * net * mix(.12, .45, hcGrey);
  // Flea-bites: small red-brown specks on white.
  float flea = step(1.0 - .03 * hcFleabites, hcHash(floor(p * 160.0))) * hcGrey;
  col = mix(col, vec3(.12, .05, .025), flea);
  // Points: black lower legs and ear rims (bay, buckskin, dun, grullo); lost under grey.
  float pts = max(a.x, a.z) * hcHasPoints * (1.0 - hcGrey * .7);
  col = mix(col, hcPoints, pts);
  // Dun: dorsal stripe along the spine and zebra barring above the knees and hocks.
  float spine = (1.0 - smoothstep(.012, .03, abs(p.z))) * smoothstep(.72, .9, n.y) * smoothstep(-1.02, -.85, p.x) * (1.0 - smoothstep(.28, .42, p.x));
  float bars = smoothstep(.25, .6, sin(p.y * 95.0)) * smoothstep(.42, .5, p.y) * (1.0 - smoothstep(.72, .8, p.y)) * (1.0 - a.x);
  col = mix(col, hcPoints * 1.2 + .02, hcDun * max(spine, bars * .55));
  // Roan: white hairs mixed into the body only; the head and lower legs stay solid.
  float roanBody = hcRoan * (1.0 - hcHead(p)) * smoothstep(.55, .78, p.y) * (1.0 - a.z);
  col = mix(col, hcWhite * .95, roanBody * (.62 + .45 * (hcNoise(p * 260.0) - .5)));
  // Leopard complex.
  vec2 sp = hcSpots(p);
  vec3 spotCol = hcBody * .9;
  if (hcSpotPattern > 2.5 && hcSpotPattern < 3.5) col = mix(col, hcWhite, sp.x);
  else { col = mix(col, hcWhite * .97, sp.x * (1.0 - hcHead(p) * .7)); col = mix(col, spotCol, sp.y * (1.0 - hcHead(p) * .7)); }
  // White patterns and markings over everything, with pink skin under white on the muzzle and round the eyes.
  float white = max(max(hcWhitePat(p, n), hcFaceMark(p, n)), hcLegMark(p));
  col = mix(col, hcWhite, white);
  float skinMask = max(a.y, a.w);
  vec3 skin = mix(hcSkin, hcPink, max(white, hcSkinMottle * smoothstep(.45, .6, hcNoise(p * 70.0))));
  col = mix(col, skin, skinMask);
  // Dark skin spots (chestnuts, the line of the lips).
  col *= 1.0 - .7 * b.w;
  // Hooves: dark horn, pale and striped under a white leg (and on appaloosas).
  float paleHoof = max(hcLegMark(vec3(p.x, .05, p.z)), white);
  vec3 hoof = mix(hcHoof, vec3(.48, .4, .3), paleHoof);
  hoof = mix(hoof, hcHoof, step(.6, hcSpotPattern) * step(.5, sin(p.z * 900.0 + p.x * 300.0)) * .8 * paleHoof);
  col = mix(col, hoof, b.z);
  // Sweat darkens the hair; lather is white foam where tack and skin rub.
  wet = clamp(c.x * hcSweat * 1.4, 0.0, 1.0);
  col *= 1.0 - .38 * wet;
  float froth = clamp((c.y * hcSweat - .25) * 2.2, 0.0, 1.0) * smoothstep(.45, .7, hcFbm(p * 22.0));
  col = mix(col, vec3(.88, .86, .82), froth);
  return col * b.x;
}
// The white pattern at a mane or tail lock's root, so pinto manes and tails come out two-coloured.
float horseRootWhite(vec3 root) { return hcWhitePat(root, vec3(0.0, 0.0, 1.0)); }
`;

const srgb = (hex: string) => new Color(hex);

function uniformsFor(spec: HorseCoatSpec, head: { poll: Vector3; U: Vector3; V: Vector3 }) {
  return {
    hcBody: { value: srgb(spec.body) }, hcLight: { value: srgb(spec.bodyLight) }, hcPoints: { value: srgb(spec.points ?? spec.body) },
    hcSkin: { value: srgb(spec.skin ?? "#221c1a") }, hcPink: { value: srgb("#c9a49a") }, hcHoof: { value: srgb(spec.hoof ?? "#1d1714") },
    hcWhite: { value: srgb("#ebe7df") }, hcMane: { value: srgb(spec.mane) }, hcManeTip: { value: srgb(spec.maneTip) },
    hcHasPoints: { value: spec.points ? 1 : 0 }, hcSooty: { value: spec.sooty ?? 0 }, hcDapples: { value: spec.dapples ?? 0 }, hcDappleSize: { value: spec.dappleSize ?? .09 },
    hcRoan: { value: spec.roan ?? 0 }, hcGrey: { value: spec.grey ?? 0 }, hcFleabites: { value: spec.fleabites ?? 0 }, hcDun: { value: spec.dun ?? 0 },
    hcWhiteAmount: { value: spec.white?.amount ?? 0 }, hcSpotAmount: { value: spec.spots?.amount ?? 0 }, hcSpotSize: { value: spec.spots?.size ?? .1 },
    hcSweat: { value: spec.sweat ?? .4 }, hcSkinMottle: { value: spec.skinMottle ?? 0 },
    hcWhitePattern: { value: PATTERN_ID[spec.white?.pattern ?? "none"] }, hcSpotPattern: { value: SPOT_ID[spec.spots?.pattern ?? "none"] },
    hcFace: { value: FACE_ID[spec.face ?? "none"] }, hcSeedW: { value: spec.white?.seed ?? 1 }, hcSeedS: { value: spec.spots?.seed ?? 1 },
    hcLegs: { value: new Vector4() },
    hcPoll: { value: head.poll }, hcU: { value: head.U }, hcV: { value: head.V },
  };
}
type CoatUniforms = ReturnType<typeof uniformsFor>;

function writeSpec(u: CoatUniforms, spec: HorseCoatSpec) {
  const fresh = uniformsFor(spec, { poll: u.hcPoll.value, U: u.hcU.value, V: u.hcV.value });
  for (const [k, v] of Object.entries(fresh) as Array<[keyof CoatUniforms, { value: unknown }]>) {
    if (k === "hcLegs" || k === "hcPoll" || k === "hcU" || k === "hcV") continue;
    const target = u[k] as { value: unknown };
    if (target.value instanceof Color) (target.value as Color).copy(v.value as Color); else target.value = v.value;
  }
  const legs = spec.legs ?? ["none", "none", "none", "none"];
  u.hcLegs.value.set(LEG_HEIGHT[legs[0]], LEG_HEIGHT[legs[1]], LEG_HEIGHT[legs[2]], LEG_HEIGHT[legs[3]]);
}

export interface HorseCoatHandle {
  readonly spec: HorseCoatSpec;
  /** Change the coat live (uniforms only). */
  set(spec: HorseCoatSpec): void;
}

function patchCoat(material: MeshStandardMaterial, u: CoatUniforms) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    previous.call(material, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 kmcoata; attribute vec4 kmcoatb; attribute vec2 kmcoatc;\nvarying vec3 vHcPos; varying vec3 vHcNormal; varying vec4 vHcA; varying vec4 vHcB; varying vec2 vHcC;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvHcPos = position; vHcNormal = normal; vHcA = kmcoata; vHcB = kmcoatb; vHcC = kmcoatc;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vHcPos; varying vec3 vHcNormal; varying vec4 vHcA; varying vec4 vHcB; varying vec2 vHcC;\n${COAT_GLSL}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        float hcWet;
        diffuseColor.rgb = horseCoat(vHcPos, normalize(vHcNormal), vHcA, vHcB, vHcC, hcWet);`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, .3, hcWet);`);
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => key() + "|horse-coat";
  material.needsUpdate = true;
}

function patchHair(material: MeshStandardMaterial, u: CoatUniforms) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    previous.call(material, shader, renderer);
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 hairroot; attribute float hair; varying vec3 vHcRoot; varying float vHcT;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvHcRoot = hairroot; vHcT = hair;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vHcRoot; varying float vHcT;\n${COAT_GLSL}`)
      // Hair cards carry shading normals for both faces (round the lock): never flip them on back faces.
      .replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\nnormal = normalize(vNormal);")
      .replace("#include <color_fragment>", `#include <color_fragment>
        {
          // diffuseColor holds the strand texture × the card's brightness (the material colour is white).
          vec3 hair = mix(hcMane, hcManeTip, vHcT * .75);
          hair = mix(hair, vec3(.82, .8, .77), clamp(hcGrey * .9, 0.0, 1.0));
          hair = mix(hair, vec3(.9, .88, .84), step(.5, horseRootWhite(vHcRoot)));
          diffuseColor.rgb *= hair;
        }`);
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => key() + "|horse-hair";
  material.needsUpdate = true;
}

/**
 * Patch every `horse-coat` (skin) and `horse-hair` material under `root` with the coat shader and return a handle
 * that changes the coat live. Meshes must carry the baked coat masks (`kmcoata/b/c`; hair: `hairroot`, `hair`); on a
 * loaded GLB call `restoreSurfaceDetail` first, which restores those attribute names.
 */
export function applyHorseCoat(root: Object3D, spec: HorseCoatSpec): HorseCoatHandle {
  // Face markings are drawn in the head's frame: from the poll toward the muzzle (U) and toward the face (V).
  const poll = new Vector3(...HORSE_LANDMARKS.poll), U = new Vector3(...HORSE_LANDMARKS.muzzle).sub(poll).normalize();
  const u = uniformsFor(spec, { poll, U, V: new Vector3(-U.y, U.x, 0) });
  writeSpec(u, spec);
  const done = new Set<Material>(), coats: MeshPhysicalMaterial[] = [], hairs: MeshPhysicalMaterial[] = [];
  const tint = (next: HorseCoatSpec) => {
    for (const m of coats) m.sheenColor?.set(next.sheen ?? next.bodyLight);
    for (const m of hairs) { m.color.set("#ffffff"); m.sheenColor?.set(next.maneTip); }
  };
  root.traverse(node => {
    const mesh = node as { isMesh?: boolean; material?: Material | Material[] };
    if (!mesh.isMesh || !mesh.material) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (done.has(m)) continue;
      done.add(m);
      if (m.name === "horse-coat") { patchCoat(m as MeshStandardMaterial, u); coats.push(m as MeshPhysicalMaterial); }
      else if (m.name === "horse-hair") { patchHair(m as MeshStandardMaterial, u); hairs.push(m as MeshPhysicalMaterial); }
    }
  });
  tint(spec);
  let current = spec;
  return {
    get spec() { return current; },
    set(next) { current = next; writeSpec(u, next); tint(next); },
  };
}
