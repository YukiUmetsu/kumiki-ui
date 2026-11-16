/**
 * SKY1 data: what the weather and the sky are, in any art style. Wind by the Beaufort scale; rain, snow, hail, fog,
 * mist and haze by their observing classes; the ten cloud genera with their heights; the sky's phases through the day
 * with colours sampled from photographs; lightning, thunder and the rainbow.
 *
 * Each value is graded: `reported` (quoted from a cited source), `measured` (sampled off a CC0 or public-domain
 * reference), `estimated` (no direct source). `sky-physics.ts` turns a weather state into what a drawing needs: drop
 * size, fall speed, slant, streak length, visibility, cloud shapes, sky colours.
 */
import type { FoundationReference, Range } from "../anatomy/foundation-shapes";
import { commons as C, range as r, wikipedia as W } from "../anatomy/foundation-shapes";

const rep = (min: number, typical: number, max: number, source: string) => r(min, typical, max, "reported", source);
const est = (min: number, typical: number, max: number, source?: string) => r(min, typical, max, "estimated", source);

// ---- Wind ------------------------------------------------------------------------------------------------------------

export interface BeaufortForce {
  force: number;
  name: string;
  /** Mean wind speed at 10 m, m/s. */
  speed: readonly [number, number];
  /** Open-sea wave height, m. */
  waves: readonly [number, number];
  sea: string;
  land: string;
}
/** The Beaufort scale (reported: Wikipedia, Beaufort scale). The scale "is neither an exact nor an objective scale". */
export const BEAUFORT: readonly BeaufortForce[] = [
  { force: 0, name: "Calm", speed: [0, .2], waves: [0, 0], sea: "Sea like a mirror", land: "Smoke rises vertically" },
  { force: 1, name: "Light air", speed: [.3, 1.5], waves: [0, .3], sea: "Ripples with appearance of scales are formed, without foam crests", land: "Direction shown by smoke drift but not by wind vanes" },
  { force: 2, name: "Light breeze", speed: [1.6, 3.3], waves: [.3, .6], sea: "Small wavelets still short but more pronounced; crests have a glassy appearance but do not break", land: "Wind felt on face; leaves rustle; wind vane moved by wind" },
  { force: 3, name: "Gentle breeze", speed: [3.4, 5.4], waves: [.6, 1.2], sea: "Large wavelets; crests begin to break; foam of glassy appearance; perhaps scattered white horses", land: "Leaves and small twigs in constant motion; light flags extended" },
  { force: 4, name: "Moderate breeze", speed: [5.5, 7.9], waves: [1, 2], sea: "Small waves becoming longer; fairly frequent white horses", land: "Raises dust and loose paper; small branches moved" },
  { force: 5, name: "Fresh breeze", speed: [8, 10.7], waves: [2, 3], sea: "Moderate waves taking a more pronounced long form; many white horses are formed; chance of some spray", land: "Small trees in leaf begin to sway; crested wavelets form on inland waters" },
  { force: 6, name: "Strong breeze", speed: [10.8, 13.8], waves: [3, 4], sea: "Large waves begin to form; the white foam crests are more extensive everywhere; probably some spray", land: "Large branches in motion; whistling heard in telegraph wires; umbrellas used with difficulty" },
  { force: 7, name: "Near gale", speed: [13.9, 17.1], waves: [4, 5.5], sea: "Sea heaps up and white foam from breaking waves begins to be blown in streaks along the direction of the wind", land: "Whole trees in motion; inconvenience felt when walking against the wind" },
  { force: 8, name: "Gale", speed: [17.2, 20.7], waves: [5.5, 7.5], sea: "Moderately high waves of greater length; edges of crests break into spindrift", land: "Twigs break off trees; generally impedes progress" },
  { force: 9, name: "Strong gale", speed: [20.8, 24.4], waves: [7, 10], sea: "High waves; dense streaks of foam along the direction of the wind; sea begins to roll; spray affects visibility", land: "Slight structural damage (chimney pots and slates removed)" },
  { force: 10, name: "Storm", speed: [24.5, 28.4], waves: [9, 12.5], sea: "Very high waves with long overhanging crests; resulting foam in great patches is blown in dense white streaks", land: "Seldom experienced inland; trees uprooted; considerable structural damage" },
  { force: 11, name: "Violent storm", speed: [28.5, 32.6], waves: [11.5, 16], sea: "Exceptionally high waves; small- and medium-sized ships might be for a long time lost to view behind the waves", land: "Very rarely experienced; accompanied by widespread damage" },
  { force: 12, name: "Hurricane force", speed: [32.7, 40], waves: [14, 16], sea: "The air is filled with foam and spray; sea is completely white with driving spray; visibility very seriously affected", land: "Devastation" },
];

// ---- Precipitation and obscurity -------------------------------------------------------------------------------------

export interface IntensityClass { id: string; label: string; /** The defining range (mm/h for rain; visibility in km for snow, fog, mist, haze). */ range: readonly [number, number]; source: string }

/** Rain by rate, mm/h (reported: Wikipedia, Rain, citing UK practice). */
export const RAIN_CLASSES: readonly IntensityClass[] = [
  { id: "light", label: "Light rain", range: [0, 2.5], source: "Wikipedia, Rain" },
  { id: "moderate", label: "Moderate rain", range: [2.5, 7.6], source: "Wikipedia, Rain" },
  { id: "heavy", label: "Heavy rain", range: [7.6, 50], source: "Wikipedia, Rain" },
  { id: "violent", label: "Violent rain", range: [50, 150], source: "Wikipedia, Rain" },
];
/** Snow by visibility, km (reported: AMS Glossary of Meteorology, Snow). */
export const SNOW_CLASSES: readonly IntensityClass[] = [
  { id: "light", label: "Light snow", range: [1, 10], source: "AMS Glossary of Meteorology: visibility 1 km or more" },
  { id: "moderate", label: "Moderate snow", range: [.5, 1], source: "AMS Glossary of Meteorology: under 1 km, not under 0.5 km" },
  { id: "heavy", label: "Heavy snow", range: [0, .5], source: "AMS Glossary of Meteorology: under 0.5 km" },
];
/** Fog, mist and haze by visibility, km (reported: Wikipedia, Visibility: the international definitions). */
export const OBSCURITY_CLASSES: readonly IntensityClass[] = [
  { id: "fog", label: "Fog", range: [0, 1], source: "Wikipedia, Visibility: fog, under 1 km" },
  { id: "mist", label: "Mist", range: [1, 2], source: "Wikipedia, Visibility: mist, 1–2 km" },
  { id: "haze", label: "Haze", range: [2, 5], source: "Wikipedia, Visibility: haze, 2–5 km" },
];

export interface Hydrometeor {
  id: "drizzle" | "rain" | "snow" | "hail";
  /** Particle diameter, mm. */
  size: Range;
  /** Terminal fall speed in still air, m/s. */
  fallSpeed: Range;
  look: readonly string[];
}
export const HYDROMETEORS: Readonly<Record<Hydrometeor["id"], Hydrometeor>> = {
  drizzle: { id: "drizzle", size: est(.1, .3, .5, "drizzle drops are under 0.5 mm"), fallSpeed: rep(.3, 1, 2, "Wikipedia, Rain: 0.5 mm drizzle impacts at 2 m/s"),
    look: ["A fine mist of drops that seems to float; no streaks."] },
  rain: { id: "rain", size: rep(.1, 1.5, 6, "Wikipedia, Rain: 0.1–9 mm; Raindrop: break-up limits drops to about 6 mm"), fallSpeed: rep(2, 6.5, 9.2, "Wikipedia, Rain and Raindrop: 0.5 mm 2 m/s, 3 mm about 8 m/s, 5 mm about 9 m/s"),
    look: ["Drops under 2 mm are 'more or less spherical'; large drops flatten at the bottom 'like hamburger buns'.", "Raindrops are not tear-shaped: that form comes from drops clinging to a surface.", "A camera sees each drop as a streak: fall speed × exposure."] },
  snow: { id: "snow", size: rep(1, 6, 50, "Wikipedia, Snowflake: aggregates typically up to 7.5–10 cm, most much smaller"), fallSpeed: rep(.4, 1, 1.2, "Locatelli & Hobbs (1974): aggregates 0.4–1.2 m/s in still air"),
    look: ["Flakes drift and tumble; fall about eight times slower than rain, so wind carries them far more.", "Aggregates are the flakes that usually reach the ground (Wikipedia, Snowflake)."] },
  hail: { id: "hail", size: rep(5, 15, 150, "Wikipedia, Hail: usually 5 mm to 15 cm"), fallSpeed: rep(9, 15, 48, "Wikipedia, Hail: about 9 m/s for 1 cm, 48 m/s for 8 cm (estimates)"),
    look: ["Transparent and white layers like an onion; irregular lumps when stones fuse.", "Bounces on hard ground."] },
};

// ---- Clouds ----------------------------------------------------------------------------------------------------------

export type CloudGenus = "cirrus" | "cirrocumulus" | "cirrostratus" | "altocumulus" | "altostratus" | "nimbostratus" | "stratocumulus" | "stratus" | "cumulus" | "cumulonimbus";
export type CloudForm = "wisps" | "ripples" | "veil" | "puffs" | "sheet" | "rain-layer" | "lumpy-layer" | "layer" | "heaps" | "tower";
export interface CloudGenusRecord {
  id: CloudGenus;
  abbr: string;
  ja: string;
  /** Étage and base height (temperate latitudes), m; the top for vertical clouds. */
  level: "high" | "middle" | "low" | "vertical";
  base: readonly [number, number];
  top?: readonly [number, number];
  form: CloudForm;
  look: string;
  weather: string;
  /** Colours (estimated): lit tops and shaded bases. */
  colours: { lit: string; shade: string };
  reference: FoundationReference;
}
const ATLAS = (n: string, title: string): FoundationReference => ({ title: `International Cloud Atlas (1896), ${title}`, url: C(`International_Cloud_Atlas_1896-${n}.jpg`), rights: "public-domain", kind: "plate" });
/** The ten WMO genera (reported: Wikipedia, List of cloud types; heights by étage in temperate latitudes). */
export const CLOUD_GENERA: Readonly<Record<CloudGenus, CloudGenusRecord>> = {
  cirrus: { id: "cirrus", abbr: "Ci", ja: "巻雲", level: "high", base: [5000, 12000], form: "wisps", look: "Wispy and mostly transparent or translucent; fine strands, often hooked at one end (mares' tails).", weather: "Isolated cirrus do not bring rain.", colours: { lit: "#ffffff", shade: "#e8eef4" }, reference: ATLAS("01-Cirrus", "pl. 1, cirrus") },
  cirrocumulus: { id: "cirrocumulus", abbr: "Cc", ja: "巻積雲", level: "high", base: [5000, 12000], form: "ripples", look: "Small white flakes in rows or ripples (a 'mackerel sky'); no shading.", weather: "Possible virga, evaporating before the ground.", colours: { lit: "#ffffff", shade: "#eef2f6" }, reference: ATLAS("06-Cirro-cumulus", "pl. 6, cirrocumulus") },
  cirrostratus: { id: "cirrostratus", abbr: "Cs", ja: "巻層雲", level: "high", base: [5000, 12000], form: "veil", look: "A thin, milky veil over a large part of the sky; the sun shows through, often with a 22° halo.", weather: "A precursor to rain or snow when it thickens.", colours: { lit: "#f4f7fa", shade: "#e2e8ee" }, reference: ATLAS("05-Cirro-stratus", "pl. 5, cirrostratus") },
  altocumulus: { id: "altocumulus", abbr: "Ac", ja: "高積雲", level: "middle", base: [2000, 7000], form: "puffs", look: "Patches or rolls of rounded masses, larger than cirrocumulus, with shaded undersides ('sheep clouds').", weather: "Can bring precipitation, usually as virga.", colours: { lit: "#ffffff", shade: "#c9d2dc" }, reference: ATLAS("09-Alto-cumulus", "pl. 9, altocumulus") },
  altostratus: { id: "altostratus", abbr: "As", ja: "高層雲", level: "middle", base: [2000, 7000], form: "sheet", look: "A grey or bluish sheet; the sun seen 'as through ground glass', with no halo.", weather: "Can bring light rain or snow.", colours: { lit: "#c8ced6", shade: "#a8b0ba" }, reference: ATLAS("07-Alto-stratus", "pl. 7, altostratus") },
  nimbostratus: { id: "nimbostratus", abbr: "Ns", ja: "乱層雲", level: "vertical", base: [500, 2000], top: [3000, 7000], form: "rain-layer", look: "A thick, dark grey layer, always opaque and never in patterns; ragged base with falling rain.", weather: "Constant precipitation and low visibility.", colours: { lit: "#9aa0a8", shade: "#5c626a" }, reference: ATLAS("13-Nimbus", "pl. 13, nimbus") },
  stratocumulus: { id: "stratocumulus", abbr: "Sc", ja: "層積雲", level: "low", base: [500, 2000], form: "lumpy-layer", look: "A lumpy layer of large rounded masses, grey with lighter gaps.", weather: "Can produce very light rain or drizzle.", colours: { lit: "#e4e8ec", shade: "#8e969e" }, reference: ATLAS("11-Strato-cumulus", "pl. 11, stratocumulus") },
  stratus: { id: "stratus", abbr: "St", ja: "層雲", level: "low", base: [0, 2000], form: "layer", look: "A low, flat, uniform grey layer with a ragged or uniform base, like a lifted fog.", weather: "The uniform type often produces drizzle.", colours: { lit: "#c4c8cc", shade: "#a2a8ae" }, reference: ATLAS("27-Stratus", "pl. 27, stratus") },
  cumulus: { id: "cumulus", abbr: "Cu", ja: "積雲", level: "vertical", base: [600, 2000], top: [1000, 6000], form: "heaps", look: "Detached heaps with sharp outlines: flat grey bases and white domed, cauliflower tops.", weather: "Fair weather; towering forms suggest showers later in the day.", colours: { lit: "#ffffff", shade: "#a9b4c2" }, reference: ATLAS("19-Cumulus", "pl. 19, cumulus") },
  cumulonimbus: { id: "cumulonimbus", abbr: "Cb", ja: "積乱雲", level: "vertical", base: [500, 2500], top: [9000, 16000], form: "tower", look: "A towering mountain of cloud with a very dark, flat base; the top spreads into a flat anvil at the tropopause.", weather: "Thunderstorms, rain or showers, and sometimes hail.", colours: { lit: "#ffffff", shade: "#4a5560" }, reference: ATLAS("22-Cumulo-nimbus", "pl. 22, cumulonimbus") },
};

/**
 * The apparent width of the elements of a patterned cloud seen more than 30° above the horizon, degrees: cirrocumulus
 * under 1°, altocumulus 1–5°, stratocumulus over 5° (reported: WMO International Cloud Atlas, "Ac compared with Cc"
 * and "Sc compared with Ac"). Typical values and the stratocumulus upper bound are estimated.
 */
export const ELEMENT_WIDTH_DEG: Readonly<Partial<Record<CloudGenus, Range>>> = {
  cirrocumulus: r(.3, .7, 1, "reported", "WMO International Cloud Atlas: under 1°"),
  altocumulus: r(1, 2.5, 5, "reported", "WMO International Cloud Atlas: 1 to 5°"),
  stratocumulus: r(5, 9, 20, "reported", "WMO International Cloud Atlas: over 5° (typical and upper bound estimated)"),
};

// ---- The sky through the day -----------------------------------------------------------------------------------------

export type SkyPhase = "day" | "golden-hour" | "sunset" | "civil-twilight" | "blue-hour" | "nautical-twilight" | "night";
export interface SkyPhaseRecord {
  id: SkyPhase;
  label: string;
  /** Sun elevation, degrees. */
  sun: readonly [number, number];
  /** Zenith, mid-sky (about 30° up) and horizon colours; the sun's disc. */
  zenith: string; mid: string; horizon: string; sunDisc: string;
  grade: "measured" | "estimated";
  source: string;
  look: string;
}
/**
 * The sky's phases by sun elevation. Twilight bands are reported (Wikipedia, Twilight); golden and blue hour have no
 * single definition (Wikipedia, Golden hour: "0° to 6°" and others; blue hour "about 3° to 10°" below). Colours were
 * sampled off one photograph each where `measured` (camera exposure and white balance vary); the rest are estimated.
 */
export const SKY_PHASES: readonly SkyPhaseRecord[] = [
  { id: "day", label: "Day", sun: [10, 90], zenith: "#3d628c", mid: "#69859f", horizon: "#96a5a5", sunDisc: "#fffbe8", grade: "measured", source: "cumulus over Tegucigalpa (Commons, CC0), clear gaps", look: "Deepest blue overhead, paling toward the horizon." },
  { id: "golden-hour", label: "Golden hour", sun: [0, 10], zenith: "#6f8fb8", mid: "#b9b8b0", horizon: "#e8b070", sunDisc: "#ffd27a", grade: "estimated", source: "Wikipedia, Golden hour: warmer light, longer shadows, lower contrast", look: "Warm low light, long shadows; the horizon goes gold." },
  { id: "sunset", label: "Sunset", sun: [-2, 0], zenith: "#82838a", mid: "#aca699", horizon: "#c89e61", sunDisc: "#ff8a3a", grade: "measured", source: "sky gradient at dusk (Commons, public domain)", look: "A grey-violet zenith over an orange band at the horizon." },
  { id: "civil-twilight", label: "Civil twilight", sun: [-6, -2], zenith: "#3e5878", mid: "#8c8ea8", horizon: "#d39a72", sunDisc: "#ff7a3a", grade: "estimated", source: "Wikipedia, Twilight: sun 0–6° below; objects clearly distinguished", look: "Ground objects still clear; the brightest planets appear." },
  { id: "blue-hour", label: "Blue hour", sun: [-10, -4], zenith: "#4c8aba", mid: "#9acae8", horizon: "#8fa1aa", sunDisc: "#ffffff", grade: "measured", source: "clouds over Brofjorden at blue hour (Commons, CC0)", look: "No shadows; objects silhouetted against a deep, even blue (Wikipedia, Twilight)." },
  { id: "nautical-twilight", label: "Nautical twilight", sun: [-12, -6], zenith: "#1c2a44", mid: "#2c3e5e", horizon: "#4a5a78", sunDisc: "#ffffff", grade: "estimated", source: "Wikipedia, Twilight: sun 6–12° below; only general outlines of ground objects", look: "The horizon fades; only the general outlines of ground objects." },
  { id: "night", label: "Night", sun: [-90, -12], zenith: "#070b16", mid: "#0c1322", horizon: "#141c2c", sunDisc: "#ffffff", grade: "estimated", source: "Wikipedia, Twilight: below 18° 'the illumination emanating from the sky is nearly zero'", look: "Stars; the moon lights the scene." },
];
/** The overcast sky: brighter at the zenith than at the horizon (the CIE standard overcast sky). */
export const OVERCAST = {
  /** Luminance at elevation γ ÷ zenith luminance: (1 + 2 sin γ) / 3 (reported: CIE standard overcast sky, after Moon & Spencer 1942). */
  luminance: (elevationDeg: number) => (1 + 2 * Math.sin(Math.max(0, elevationDeg) * Math.PI / 180)) / 3,
  zenith: "#aeaeb1", horizon: "#8697a0",
  grade: "measured" as const, source: "overcast sky (Commons, CC0)",
};

// ---- Light and sound in the storm -------------------------------------------------------------------------------------

/** Lightning (reported: Wikipedia, Lightning). */
export const LIGHTNING = {
  /** Median flash duration, s. */
  flash: .52,
  /** Return strokes per cloud-to-ground flash: "3 or 4 … as many as 30". */
  strokes: rep(1, 3.5, 30, "Wikipedia, Lightning"),
  /** Gap between strokes, s: "typically 40 to 50 milliseconds". */
  gap: rep(.04, .045, .05, "Wikipedia, Lightning"),
  colour: "#e8f0ff",
  look: ["A brilliant blue-white channel; re-strikes cause a 'strobe light' effect.", "Thunder follows about 3 s per kilometre (sound at 343 m/s)."],
  speedOfSound: 343,
};
/** The rainbow (reported: Wikipedia, Rainbow). */
export const RAINBOW = {
  /** Angular radius about the antisolar point, degrees: primary about 42°, secondary 50–53°. */
  primary: 42, secondary: 51,
  /** Band width (red to violet), degrees (estimated: about 2°). */
  width: 2,
  /** Colours, outside to inside, for the primary bow; the secondary is reversed. */
  colours: ["#d8423a", "#f08a2c", "#f3d23a", "#5bb04a", "#3a7dd0", "#5a4aa8"] as readonly string[],
  look: ["Red outside and violet inside; the secondary bow 10° further out with its colours reversed.", "The sky inside the primary bow is brighter; between the bows lies the dark Alexander's band.", "The sun is behind the viewer and lower than 42°; the bow's centre is the antisolar point, below the horizon."],
};

export const SKY_SOURCES = [
  W("Beaufort_scale"), W("Rain"), W("Raindrop"), W("Snowflake"), W("Hail"), W("Fog"), W("Visibility"), W("List_of_cloud_types"), W("Twilight"),
  W("Golden_hour_(photography)"), W("Lightning"), W("Rainbow"), W("Raindrop_size_distribution"),
  { title: "Atlas, Srivastava & Sekhon (1973), Doppler radar characteristics of precipitation at vertical incidence (fall-speed fit)", url: "https://doi.org/10.1029/RG011i001p00001" },
  { title: "AMS Glossary of Meteorology: Snow", url: "https://glossary.ametsoc.org/wiki/Snow" },
  { title: "WMO International Cloud Atlas: altocumulus compared with cirrocumulus and stratocumulus", url: "https://cloudatlas.wmo.int/en/ac-compared-with-cc.html" },
] as const;
