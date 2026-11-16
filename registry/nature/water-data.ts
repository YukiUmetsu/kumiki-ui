/**
 * WATER1 data: what water does, in any art style. Sea states, how waves grow with the wind, the limits of a wave's
 * shape, how waves break on a beach, ripples, wakes, rivers' meanders, how water reflects and what colour it is.
 *
 * Each value is graded: `reported` (quoted from a cited source), `measured` (sampled off a CC0 or public-domain
 * reference), `estimated` (no direct source). `water-physics.ts` turns these into what a drawing needs.
 */
import type { FoundationReference } from "../anatomy/foundation-shapes";
import { commons as C, range as r, wikipedia as W } from "../anatomy/foundation-shapes";

const rep = (min: number, typical: number, max: number, source: string) => r(min, typical, max, "reported", source);

/** Gravity, m/s². */
export const G = 9.81;

// ---- The sea ---------------------------------------------------------------------------------------------------------

export interface SeaStateCode { code: number; name: string; /** Wave height range, m (the WMO code's band; 9 is over 14). */ height: readonly [number, number] }
/** The WMO sea state code (reported: Wikipedia, Sea state; it "largely adopts the 'wind sea' definition of the Douglas Sea Scale"). */
export const SEA_STATES: readonly SeaStateCode[] = [
  { code: 0, name: "Calm (glassy)", height: [0, 0] },
  { code: 1, name: "Calm (rippled)", height: [0, .1] },
  { code: 2, name: "Smooth (wavelets)", height: [.1, .5] },
  { code: 3, name: "Slight", height: [.5, 1.25] },
  { code: 4, name: "Moderate", height: [1.25, 2.5] },
  { code: 5, name: "Rough", height: [2.5, 4] },
  { code: 6, name: "Very rough", height: [4, 6] },
  { code: 7, name: "High", height: [6, 9] },
  { code: 8, name: "Very high", height: [9, 14] },
  { code: 9, name: "Phenomenal", height: [14, 20] },
];

/**
 * A fully developed sea (Pierson & Moskowitz 1964, as given in Stewart, Introduction to Physical Oceanography, 16.4):
 * significant height H⅓ = 0.21 U₁₉.₅² / g ≈ 0.22 U₁₀² / g and peak frequency ω_p = 0.877 g / U₁₉.₅, with U₁₉.₅ ≈ 1.026 U₁₀.
 * The sea reaches it only with enough wind duration and fetch; shorter fetch gives smaller, shorter waves.
 */
export const FULLY_DEVELOPED = { height: .22, peak: .877, u195: 1.026, grade: "reported" as const, source: "Pierson & Moskowitz (1964) via Stewart, Introduction to Physical Oceanography, 16.4" };

/** The shape limits of a wave (reported). */
export const WAVE_LIMITS = {
  /** The steepest steady wave in deep water, H/λ (Michell 1893; Wikipedia, Stokes wave). */
  steepest: .142,
  /** Real waves in deep water break when H/λ passes about this (Wikipedia, Wind wave). */
  breakSteepness: .17,
  /** The crest of the highest wave meets at 120° (Stokes 1880; Wikipedia, Stokes wave). */
  crestAngle: 120,
  /** In shallow water a wave breaks when higher than about 0.8 × the depth (Wikipedia, Wind wave; McCowan's 0.78). */
  breakDepth: .8,
  /** The largest single waves in a record are somewhat under twice the significant height (Wikipedia, Wind wave). */
  maxOverSignificant: 2,
  look: ["Sharp crests and flat troughs (Stokes waves); the steeper the wave, the sharper the crest.", "Water particles move in circles that shrink with depth; in shallow water the circles flatten into ellipses."],
} as const;

export type BreakerType = "spilling" | "plunging" | "collapsing" | "surging";
export interface BreakerRecord {
  id: BreakerType;
  /** Iribarren number with the deep-water height, ξ₀ = tan α / √(H₀ / L₀) (Battjes 1974, via Wikipedia, Iribarren number). */
  iribarren: readonly [number, number];
  beach: string;
  look: string;
}
/**
 * Breakers by beach slope and wave steepness (reported: Wikipedia, Breaking wave and Iribarren number). The source
 * gives "surging or collapsing" together for ξ₀ > 3.3; the split between them at 5 is estimated.
 */
export const BREAKERS: Readonly<Record<BreakerType, BreakerRecord>> = {
  spilling: { id: "spilling", iribarren: [0, .5], beach: "a gradual slope", look: "The crest becomes unstable and turbulent whitewater spills down the face; foam rolls down a long way in." },
  plunging: { id: "plunging", iribarren: [.5, 3.3], beach: "a steep floor or sudden change in depth", look: "The crest steepens to vertical, curls over and drops onto the trough, trapping air under the lip: the tube." },
  collapsing: { id: "collapsing", iribarren: [3.3, 5], beach: "a steep beach (between plunging and surging)", look: "The crest never fully breaks; the lower face steepens and collapses into foam." },
  surging: { id: "surging", iribarren: [5, 50], beach: "a steep, reflective beach", look: "The face and crest stay smooth, with little foam; the base of the wave runs rapidly up the slope." },
};

/** Ripples and wakes (reported). */
export const SMALL_WAVES = {
  /** Under about 1.7 cm surface tension rules (capillary waves); their slowest speed is 0.23 m/s (Wikipedia, Capillary wave). */
  capillaryWavelength: .017, capillarySpeed: .23,
  /** A Kelvin wake's arms lie about arcsin(1/3) = 19.47° off the path; its feathery wavelets about 53° (Wikipedia, Kelvin wake pattern). */
  kelvinAngle: 19.47, featherAngle: 53,
  look: ["Ripples are capillary waves: sharp troughs and round crests (the reverse of gravity waves).", "At high speed a second, narrower V forms inside the wake (Wikipedia, Kelvin wake pattern)."],
} as const;

/** Whitecaps (reported): coverage W = 3.84 × 10⁻⁶ U₁₀^3.41 (Monahan & O'Muircheartaigh 1980); they begin at about 3 m/s (Thorpe 1982). */
export const WHITECAPS = { a: 3.84e-6, b: 3.41, onset: 3, grade: "reported" as const, source: "Monahan & O'Muircheartaigh (1980); onset Thorpe (1982), via Albert et al., ACP 16 (2016)" };

/**
 * Sea-surface slopes (reported: Cox & Munk 1954, as summarised by Mobley, Ocean Optics Web Book): mean square slope
 * σ² = 0.003 + 5.12 × 10⁻³ U (clean surface; up-wind 3.16 × 10⁻³ U, cross-wind 0.003 + 1.92 × 10⁻³ U). They set how
 * wide the sun's glitter path spreads.
 */
export const SLOPES = { base: .003, perWind: 5.12e-3, upwind: 3.16e-3, crosswind: [.003, 1.92e-3] as const, grade: "reported" as const, source: "Cox & Munk (1954) via Mobley, Ocean Optics Web Book" };

// ---- Rivers ----------------------------------------------------------------------------------------------------------

/** Meanders (reported: Wikipedia, Meander). */
export const MEANDERS = {
  /** Meander length ÷ full-bank channel width: 10–14, average 11. */
  wavelength: rep(10, 11, 14, "Wikipedia, Meander"),
  /** Radius of curvature at the apex ÷ channel width: 2–3. */
  radius: rep(2, 2.5, 3, "Wikipedia, Meander"),
  /** Sinuosity (channel length ÷ valley length): straight 1, sinuous 1–1.5, meandering 1.5 and over (to about 4). */
  sinuosity: { sinuous: [1, 1.5] as const, meandering: [1.5, 4] as const },
  look: ["The planform is a sine-generated curve (Langbein & Leopold 1966): its direction swings as a sine of distance along the channel.", "Point bars of sand on the inside of each bend; the deep, fast water and cut bank on the outside."],
};

// ---- Light on water --------------------------------------------------------------------------------------------------

/**
 * Reflection: water's refractive index is about 1.333, so it reflects about 2% straight down (R₀ = ((n − 1)/(n + 1))²,
 * Fresnel) and nearly everything at grazing angles. Schlick's approximation R(θ) = R₀ + (1 − R₀)(1 − cos θ)⁵ is
 * close enough for drawing (reported: Wikipedia, Fresnel equations; Schlick's approximation).
 */
export const OPTICS = { n: 1.333, r0: ((1.333 - 1) / (1.333 + 1)) ** 2 };

export interface WaterColour {
  id: string; label: string;
  /** Colours where sampled: e.g. far, mid, near; or the thing and its reflection. */
  swatches: readonly { name: string; hex: string }[];
  grade: "measured" | "estimated";
  why: string;
  reference?: FoundationReference;
}
/**
 * Water colours (measured off one CC0 or public-domain photograph each, in marked boxes; exposure and white balance
 * vary). Why water has its colour is reported (Wikipedia, Color of water).
 */
export const WATER_COLOURS: readonly WaterColour[] = [
  { id: "sea-clear", label: "Clear sea, shore to horizon", grade: "measured",
    swatches: [{ name: "far", hex: "#146593" }, { name: "mid", hex: "#397695" }, { name: "near, over sand", hex: "#4e7992" }, { name: "foam in shade", hex: "#9aa5b6" }, { name: "sky", hex: "#4b8dba" }],
    why: "Water absorbs red weakly, so a deep body looks blue; over a sandy bottom the sand shows through the blue, lighter and greener.",
    reference: { title: "La Herradura, Andalusia (Jebulon)", url: C("La_Herradura,_horizon_hobbie_cat,_Andalusia,_Spain.jpg"), rights: "CC0", kind: "photo" } },
  { id: "sea-hazy", label: "Open sea under a hazy sky", grade: "measured", swatches: [{ name: "sea", hex: "#6087a0" }, { name: "sky", hex: "#a6bfd3" }],
    why: "The surface reflects the pale sky toward the horizon, so a hazy day greys the sea.",
    reference: { title: "Sea horizon, Rethymno, Crete (Jebulon)", url: C("Sea_horizon_Rethymno_Crete_Greece.jpg"), rights: "CC0", kind: "photo" } },
  { id: "sea-storm", label: "Storm sea", grade: "measured", swatches: [{ name: "sea", hex: "#1f171f" }, { name: "sky", hex: "#c2d6fe" }],
    why: "Steep faces reflect little sky and show the dark body; exposure for the bright sky darkens it further.",
    reference: { title: "NOAAS Miller Freeman in heavy seas (NOAA)", url: C("NOAAS_Miller_Freeman_(R_223)_heavy_seas.jpg"), rights: "public-domain", kind: "photo" } },
  { id: "glacial-lake", label: "Glacial lake", grade: "measured", swatches: [{ name: "lake", hex: "#4c86a0" }],
    why: "Finely ground rock (glacial flour) scatters light and turns mountain lakes turquoise (Wikipedia, Color of water).",
    reference: { title: "Milk Lake, Yading National Park", url: C("Yading_National_Park_Milk_Lake.jpg"), rights: "CC0", kind: "photo" } },
  { id: "mirror-lake", label: "Still lake reflection", grade: "measured",
    swatches: [{ name: "sky", hex: "#73afd8" }, { name: "sky reflected", hex: "#738798" }, { name: "forest", hex: "#1b2021" }, { name: "forest reflected", hex: "#1b211d" }],
    why: "The reflection of the bright sky is darker (about 0.6 of its linear luminance here, as Fresnel predicts near grazing); the dark forest reflects at nearly its own value.",
    reference: { title: "Disappearing Peaks reflecting in Lake Gunn", url: C("Disappearing_Peaks_reflecting_in_Lake_Gunn_on_a_calm_winter_morning.jpg"), rights: "public-domain", kind: "photo" } },
  { id: "mountain-lake", label: "Mountain lake in shade", grade: "measured", swatches: [{ name: "water", hex: "#35586f" }],
    why: "Shaded water reflects the darker valley and shows its blue body.",
    reference: { title: "Calm waters between mountains (Unsplash)", url: C("Calm_waters_between_mountains_(Unsplash).jpg"), rights: "CC0", kind: "photo" } },
  { id: "river", label: "Braided river from the air", grade: "measured", swatches: [{ name: "water", hex: "#3d5c5f" }],
    why: "Silt and the green banks' reflection grey and green a river.",
    reference: { title: "Meandering river aerial photography (USFWS)", url: C("Meandering_river_aerial_photography.jpg"), rights: "public-domain", kind: "photo" } },
  { id: "silty-river", label: "Silty river, still", grade: "measured", swatches: [{ name: "water", hex: "#6a6872" }],
    why: "Suspended silt colours a river; still water mixes it with the reflected sky.",
    reference: { title: "Muddy River near St. Thomas (NPS)", url: C("Muddy_River_Near_St._Thomas_(ec4b4d64-6b91-49c4-94b5-d09c212e430a).jpg"), rights: "public-domain", kind: "photo" } },
  { id: "reef", label: "Reef from space", grade: "measured", swatches: [{ name: "deep", hex: "#0e1626" }, { name: "shallow", hex: "#03404d" }],
    why: "Shallow reef and sand show teal through a few metres of water; deep water is nearly black from above.",
    reference: { title: "Dry Tortugas (NASA Earth Observatory, Landsat)", url: C("Sand,_Stone,_and_Sea_Life_at_Dry_Tortugas_(154213).jpg"), rights: "public-domain", kind: "photo" } },
  { id: "tannin", label: "Tannin-stained stream", grade: "estimated", swatches: [{ name: "water", hex: "#5a3a1e" }, { name: "shallow", hex: "#9a6a38" }],
    why: "Dissolved organic compounds (tannins) stain water dark brown (Wikipedia, Color of water)." },
  { id: "pond", label: "Green pond", grade: "estimated", swatches: [{ name: "water", hex: "#4d5d32" }],
    why: "Algae floating in the water can colour it green (Wikipedia, Color of water)." },
];
/** Foam lit by the sun (estimated: near white with a cool cast). */
export const FOAM_LIT = "#f2f5f7";

/**
 * A breaking wave's colours, measured as medians in marked boxes on CC0 and public-domain photographs (Unsplash "Huge
 * rolling wave", "Rolling wave crash"; NOAA "Large breaking wave", "Breaking wave"): the thin lip and crest are teal
 * where light passes through; the face darkens to deep blue-green; the lower face is lighter where it mirrors the sky;
 * inside the tube the light comes through the lip; whitewater is white in sun and blue-grey in its own shade.
 * The thinnest lip highlight is estimated.
 */
export const BREAKER_PALETTE = {
  lipThin: "#2ba8b5", lip: "#08697a", face: "#053a50", lowerFace: "#3f5e74", tube: "#7ab8cb",
  whitewater: "#eeeef2", whitewaterShade: "#a6bdd0", aerated: "#83b3dc",
  grade: "measured" as const,
};
/**
 * Why a thin crest glows teal: pure water absorbs red far more than blue (Pope & Fry 1997, Applied Optics 36: about
 * 0.0064 m⁻¹ at 440 nm, 0.020 at 500, 0.057 at 550, 0.22 at 600, 0.34 at 650 and 0.62 at 700 nm), so light that has
 * crossed a metre or more of water loses its red first.
 */
export const WATER_ABSORPTION: readonly [number, number][] = [[440, .00635], [450, .00922], [470, .0106], [500, .0204], [550, .0565], [600, .2224], [650, .34], [700, .624]];
/** Whitewater area decays roughly exponentially: e-folding 1.8–7.7 s, median about 5 s (measured: eight breaks in a CC0 surf video, "Santa Rosa Island Waves"). */
export const FOAM_DECAY = { median: 5, range: [1.8, 7.7] as const, grade: "measured" as const };

export const WATER_SOURCES = [
  W("Sea_state"), W("Wind_wave"), W("Stokes_wave"), W("Breaking_wave"), W("Iribarren_number"), W("Capillary_wave"), W("Kelvin_wake_pattern"),
  W("Meander"), W("Fresnel_equations"), W("Schlick's_approximation"), W("Color_of_water"),
  { title: "Stewart, Introduction to Physical Oceanography, 16.4 Ocean-wave spectra (Pierson–Moskowitz)", url: "https://geo.libretexts.org/Bookshelves/Oceanography/Introduction_to_Physical_Oceanography_(Stewart)/16:_Ocean_Waves/16.4:_Ocean-Wave_Spectra" },
  { title: "Mobley, Ocean Optics Web Book: Cox–Munk sea surface slope statistics", url: "https://oceanopticsbook.info/view/surfaces/cox-munk-sea-surface-slope-statistics" },
  { title: "Albert et al. (2016), ACP 16: whitecap coverage parameterisations", url: "https://acp.copernicus.org/articles/16/13725/2016/acp-16-13725-2016.pdf" },
  { title: "Langbein & Leopold (1966), River meanders: theory of minimum variance, USGS PP 422-H", url: "https://pubs.usgs.gov/pp/0422h/report.pdf" },
] as const;
