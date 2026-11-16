/**
 * SKY1 construction: a weather state turned into what a drawing or an effect needs, in any art style. Drop sizes from
 * the rain rate, fall speeds, the slant in a wind, streak lengths at a camera's shutter, visibility and how far
 * things fade, the sky's colours for a sun elevation, where cloud bases sit on screen, lightning strokes in time,
 * thunder's delay and the rainbow's arcs.
 *
 * Units: metres, seconds, mm/h, degrees; screen units only where a function says so.
 */
import type { FPoint } from "../anatomy/foundation-shapes";
import { seeded } from "../anatomy/foundation-shapes";
import type { BeaufortForce, CloudGenus, IntensityClass, SkyPhaseRecord } from "./sky-data";
import { BEAUFORT, CLOUD_GENERA, HYDROMETEORS, LIGHTNING, OBSCURITY_CLASSES, OVERCAST, RAIN_CLASSES, RAINBOW, SKY_PHASES, SNOW_CLASSES } from "./sky-data";

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const RAD = Math.PI / 180;

// ---- Wind ------------------------------------------------------------------------------------------------------------

/** The Beaufort force's wind speed, m/s: v = 0.836 B^(3/2) (reported: Wikipedia, Beaufort scale). */
export const beaufortSpeed = (force: number) => .836 * Math.max(0, force) ** 1.5;
/** The Beaufort force for a wind speed (m/s). */
export function beaufortOf(speed: number): BeaufortForce {
  return BEAUFORT.find(b => speed <= b.speed[1] + .05) ?? BEAUFORT[BEAUFORT.length - 1];
}

// ---- Rain ------------------------------------------------------------------------------------------------------------

/** The rain class for a rate (mm/h). */
export const rainClass = (rate: number): IntensityClass => RAIN_CLASSES.find(c => rate < c.range[1]) ?? RAIN_CLASSES[RAIN_CLASSES.length - 1];
/** A typical rate for a class, mm/h (the geometric middle of its range; estimated). */
export const RAIN_RATE: Readonly<Record<"drizzle" | "light" | "moderate" | "heavy" | "violent", number>> = { drizzle: .3, light: 1.2, moderate: 5, heavy: 20, violent: 80 };

/**
 * Terminal fall speed of a raindrop in still air near sea level, m/s, for its equal-volume diameter in mm:
 * v = 9.65 − 10.3 e^(−0.6 D) (reported: Atlas, Srivastava & Sekhon 1973, a fit to Gunn & Kinzer's 1949 measurements).
 */
export const dropFallSpeed = (dMm: number) => Math.max(0, 9.65 - 10.3 * Math.exp(-.6 * dMm));
/**
 * A falling drop's mean height ÷ width (reported: Brandes, Zhang & Vivekanandan 2002, the radar-apparent mean of
 * oscillating drops). Under 1 mm a drop is a sphere; at 5 mm it is about 0.68, flattened underneath.
 */
export const dropAxisRatio = (dMm: number) => {
  const d = clamp(dMm, 0, 8);
  return d < .5 ? 1 : Math.min(1, .9951 + .0251 * d - .03644 * d ** 2 + .00503 * d ** 3 - .0002492 * d ** 4);
};

export interface DropSpectrum {
  rate: number;
  /** Marshall–Palmer slope, mm⁻¹, and intercept, m⁻³ mm⁻¹. */
  lambda: number; n0: number;
  /** Median volume diameter, mm: half the water falls in larger drops. */
  medianDiameter: number;
  /** Drops in the air per m³, all sizes. */
  perCubicMetre: number;
  /** Drops per m³ larger than `minDiameter` mm. */
  larger: (minDiameter: number) => number;
}
/**
 * The drop sizes for a rain rate: Marshall & Palmer (1948), N(D) = N₀ e^(−ΛD) with N₀ = 8000 m⁻³ mm⁻¹ and
 * Λ = 4.1 R^(−0.21) mm⁻¹ (reported: Wikipedia, Raindrop size distribution). The median volume diameter of an
 * exponential spectrum is 3.67 / Λ.
 */
export function dropSpectrum(rate: number): DropSpectrum {
  const R = Math.max(.01, rate), lambda = 4.1 * R ** -.21, n0 = 8000;
  return { rate: R, lambda, n0, medianDiameter: 3.67 / lambda, perCubicMetre: n0 / lambda, larger: d => n0 / lambda * Math.exp(-lambda * d) };
}
/** The drops a camera draws as streaks (larger than 1 mm, estimated) per m³. */
export const visibleDrops = (rate: number) => dropSpectrum(rate).larger(1);

// ---- Snow and hail ---------------------------------------------------------------------------------------------------

export interface SnowFall {
  className: IntensityClass;
  /** Visibility, km. */
  visibility: number;
  /** Typical flake (aggregate) diameter, mm (estimated: larger aggregates in heavier snow near 0 °C). */
  flake: number;
  /** Fall speed, m/s (reported range 0.4–1.2, Locatelli & Hobbs 1974). */
  fallSpeed: number;
  /** The sideways flutter as flakes tumble: amplitude, m, and period, s (estimated). */
  flutter: { amplitude: number; period: number };
}
const SNOW: Readonly<Record<"light" | "moderate" | "heavy", Omit<SnowFall, "className">>> = {
  light: { visibility: 2, flake: 3, fallSpeed: .8, flutter: { amplitude: .05, period: 1.2 } },
  moderate: { visibility: .75, flake: 6, fallSpeed: 1, flutter: { amplitude: .07, period: 1 } },
  heavy: { visibility: .3, flake: 12, fallSpeed: 1.1, flutter: { amplitude: .09, period: .9 } },
};
export function snowFall(intensity: "light" | "moderate" | "heavy"): SnowFall {
  return { className: SNOW_CLASSES.find(c => c.id === intensity)!, ...SNOW[intensity] };
}
/** A hailstone's fall speed, m/s, for its diameter in cm: about 9 m/s at 1 cm and 48 at 8 cm (reported estimates, Wikipedia, Hail), a power law through both. */
export const hailFallSpeed = (dCm: number) => 9 * Math.max(.1, dCm) ** (Math.log(48 / 9) / Math.log(8));

// ---- Motion on screen ------------------------------------------------------------------------------------------------

/** How far precipitation leans from the vertical, degrees: the drops move with the wind, so tan θ = wind ÷ fall speed. */
export const slantDeg = (fallSpeed: number, wind: number) => Math.atan2(wind, Math.max(.01, fallSpeed)) / RAD;
/** A camera's exposure, s, at a frame rate and a shutter angle (180° is the film standard: half the frame). */
export const exposureTime = (fps: number, shutterDeg = 180) => shutterDeg / 360 / fps;
/** The streak a falling particle draws in one exposure, m. */
export const streakLength = (fallSpeed: number, wind: number, exposure: number) => Math.hypot(fallSpeed, wind) * exposure;

// ---- Visibility and distance -----------------------------------------------------------------------------------------

/** Visibility in rain, km: V ≈ 11.6 R^(−0.63) (estimated: a 1973 regression on rain gauges and visibility, quoted second-hand). */
export const rainVisibility = (rate: number) => 11.6 * Math.max(.05, rate) ** -.63;
/** The fog, mist or haze class for a visibility in km (none above 5 km). */
export const obscurityOf = (visibilityKm: number) => OBSCURITY_CLASSES.find(c => visibilityKm < c.range[1]);
/**
 * The contrast an object keeps at a distance, 0–1: e^(−3.912 d / V) (reported: Wikipedia, Visibility, the
 * Koschmieder equation with a 2% threshold). Mix a distant object toward the horizon colour by 1 − this.
 */
export const contrastAt = (distanceKm: number, visibilityKm: number) => Math.exp(-3.912 * Math.max(0, distanceKm) / Math.max(.001, visibilityKm));
/** The distance at which contrast falls to `contrast`, km: the depth planes of a fog or haze. */
export const distanceForContrast = (contrast: number, visibilityKm: number) => -Math.log(clamp(contrast, 1e-4, 1)) * visibilityKm / 3.912;

// ---- The sun and the sky ---------------------------------------------------------------------------------------------

/**
 * The sun's elevation, degrees, at a latitude, day of the year and local solar hour: sin e = sin φ sin δ + cos φ cos δ
 * cos h, declination δ = −23.44° cos(360°/365 (d + 10)) (reported: Wikipedia, Position of the Sun; about ±1°).
 */
export function sunElevation(latitudeDeg: number, dayOfYear: number, solarHour: number) {
  const dec = -23.44 * Math.cos(360 / 365 * (dayOfYear + 10) * RAD), h = 15 * (solarHour - 12);
  const s = Math.sin(latitudeDeg * RAD) * Math.sin(dec * RAD) + Math.cos(latitudeDeg * RAD) * Math.cos(dec * RAD) * Math.cos(h * RAD);
  return Math.asin(clamp(s, -1, 1)) / RAD;
}
/** A shadow's length ÷ the height of what casts it, for a sun elevation (Infinity at or below the horizon). */
export const shadowLength = (sunElevationDeg: number) => (sunElevationDeg <= 0 ? Infinity : 1 / Math.tan(sunElevationDeg * RAD));

/** The phase of the sky for a sun elevation. Phases overlap (golden hour and blue hour have several definitions); the narrowest wins. */
export function skyPhase(sunElevationDeg: number): SkyPhaseRecord {
  const hits = SKY_PHASES.filter(p => sunElevationDeg >= p.sun[0] && sunElevationDeg <= p.sun[1]);
  return hits.sort((a, b) => (a.sun[1] - a.sun[0]) - (b.sun[1] - b.sun[0]))[0] ?? (sunElevationDeg > 0 ? SKY_PHASES[0] : SKY_PHASES[SKY_PHASES.length - 1]);
}

const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb: readonly number[]) => `#${rgb.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;
/** Mix two hex colours (t from 0, all a, to 1, all b). */
export const mixColour = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * clamp(t, 0, 1))); };
const scaleColour = (c: string, k: number) => toHex(hex(c).map(v => v * k));

export interface SkyGradient {
  phase: SkyPhaseRecord;
  /** From the horizon (elevation 0°) to the zenith (90°). */
  stops: readonly { elevation: number; colour: string }[];
  sunDisc: string;
}
/**
 * The sky's colours from the horizon to the zenith for a sun elevation and a cloud cover (0 clear to 1 overcast).
 * Clear skies blend the two nearest phases by elevation; cover blends toward the overcast sky, darkened as the sun
 * sinks, whose brightness falls toward the horizon as (1 + 2 sin γ) / 3 (the CIE standard overcast sky).
 */
export function skyGradient(sunElevationDeg: number, cover = 0): SkyGradient {
  // The phases' centres in elevation, high to low; blend between the two around the sun.
  // Day holds from 12° up (golden hour is under 10° by most definitions); night from −18°.
  const centres = SKY_PHASES.map(p => ({ p, at: p.id === "day" ? 12 : p.id === "night" ? -18 : (p.sun[0] + p.sun[1]) / 2 })).sort((a, b) => b.at - a.at);
  let a = centres[0], b = centres[0], t = 0;
  if (sunElevationDeg <= centres[centres.length - 1].at) { a = b = centres[centres.length - 1]; }
  else for (let i = 0; i < centres.length - 1; i++) if (sunElevationDeg <= centres[i].at && sunElevationDeg > centres[i + 1].at) { a = centres[i]; b = centres[i + 1]; t = (centres[i].at - sunElevationDeg) / (centres[i].at - centres[i + 1].at); break; }
  const pick = (k: "zenith" | "mid" | "horizon") => mixColour(a.p[k], b.p[k], t);
  const clear = [{ elevation: 0, colour: pick("horizon") }, { elevation: 30, colour: pick("mid") }, { elevation: 90, colour: pick("zenith") }];
  const c = clamp(cover, 0, 1);
  // The overcast sky darkens with the light: full above 10°, night-dark by −12° (estimated).
  const light = clamp((sunElevationDeg + 12) / 22, .08, 1);
  const stops = clear.map(s => {
    const lum = OVERCAST.luminance(s.elevation), grey = scaleColour(mixColour(OVERCAST.horizon, OVERCAST.zenith, s.elevation / 90), light * (.8 + .2 * lum));
    return { elevation: s.elevation, colour: mixColour(s.colour, grey, c) };
  });
  return { phase: skyPhase(sunElevationDeg), stops, sunDisc: mixColour(pick("horizon"), a.p.sunDisc, .7) };
}

// ---- Clouds in perspective -------------------------------------------------------------------------------------------

/**
 * Where a cloud base at `baseHeight` m appears on screen for an eye at `eyeHeight` m, a level camera of focal length
 * `focal` (screen units) and a horizon at `horizonY` (y down): bases share one plane, so farther clouds sit lower,
 * nearer the horizon, and smaller (scale = focal ÷ distance).
 */
export function cloudOnScreen(distance: number, baseHeight: number, opts: { eyeHeight?: number; focal: number; horizonY: number }) {
  const d = Math.max(1, distance), eye = opts.eyeHeight ?? 1.6;
  return { y: opts.horizonY - opts.focal * (baseHeight - eye) / d, scale: opts.focal / d };
}
/** A genus's typical base height, m (the middle of its band). */
export const cloudBase = (genus: CloudGenus) => { const g = CLOUD_GENERA[genus]; return (g.base[0] + g.base[1]) / 2; };

// ---- Lightning and thunder -------------------------------------------------------------------------------------------

export interface LightningFlash {
  /** Start time of each return stroke within the flash, s. */
  strokes: readonly number[];
  /** Brightness 0–1 at `t` seconds after the flash began. */
  at: (t: number) => number;
  duration: number;
}
/**
 * A cloud-to-ground flash: three or four strokes as a rule (up to 30), 40–50 ms apart, each a near-instant peak that
 * fades in tens of milliseconds (estimated), so the scene flickers (the "strobe" effect; reported: Wikipedia, Lightning).
 */
export function lightningFlash(seed = 1, strokes?: number): LightningFlash {
  const rnd = seeded(seed), n = strokes ?? (rnd() < .5 ? 3 : 4), times: number[] = [];
  let t = 0;
  for (let i = 0; i < n; i++) { times.push(t); t += LIGHTNING.gap.min + rnd() * (LIGHTNING.gap.max - LIGHTNING.gap.min) + (rnd() < .2 ? .03 : 0); }
  const decay = .018;
  return {
    strokes: times,
    duration: times[times.length - 1] + decay * 5,
    at: (tt: number) => times.reduce((m, s, i) => (tt >= s ? Math.max(m, (i === 0 ? 1 : .85 - .1 * Math.min(3, i)) * Math.exp(-(tt - s) / decay)) : m), 0),
  };
}
/** Thunder's delay after the flash, s, for a distance in km (sound at 343 m/s: about 3 s per km). */
export const thunderDelay = (distanceKm: number) => distanceKm * 1000 / LIGHTNING.speedOfSound;

/**
 * A lightning channel from `from` to `to` (any units) by midpoint displacement, with branches that fork off downward
 * and die out. Each branch is a polyline; the first is the main channel. Deterministic for a seed.
 */
export function lightningChannel(from: FPoint, to: FPoint, opts: { seed?: number; roughness?: number; depth?: number; branches?: number } = {}): FPoint[][] {
  const rnd = seeded(opts.seed ?? 3), rough = opts.roughness ?? .22, depth = opts.depth ?? 7;
  const split = (a: FPoint, b: FPoint, d: number, k: number): FPoint[] => {
    if (d === 0) return [a, b];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / (L || 1), ny = (b[0] - a[0]) / (L || 1);
    const off = (rnd() - .5) * 2 * rough * L * k, m: FPoint = [mx + nx * off, my + ny * off];
    return [...split(a, m, d - 1, k), ...split(m, b, d - 1, k).slice(1)];
  };
  const main = split(from, to, depth, 1), out = [main];
  for (let i = 0; i < (opts.branches ?? 4); i++) {
    const at = Math.floor((.12 + rnd() * .55) * (main.length - 1)), a = main[at];
    const L = Math.hypot(to[0] - from[0], to[1] - from[1]) * (.12 + rnd() * .25), dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1;
    const ang = (rnd() < .5 ? -1 : 1) * (25 + rnd() * 30) * RAD, ca = Math.cos(ang), sa = Math.sin(ang);
    const b: FPoint = [a[0] + (dx * ca - dy * sa) / len * L, a[1] + (dx * sa + dy * ca) / len * L];
    out.push(split(a, b, Math.max(2, depth - 3), .8));
  }
  return out;
}

// ---- The rainbow -----------------------------------------------------------------------------------------------------

export interface RainbowGeometry {
  /** Elevation of the bow's centre (the antisolar point), degrees: as far below the horizon as the sun is above. */
  centre: number;
  /** Elevation of the top of each bow, degrees (negative: hidden below the horizon). */
  primaryTop: number; secondaryTop: number;
  visible: boolean;
  /** Angular radii, outer edge (red for the primary) to inner edge. */
  primary: readonly [number, number]; secondary: readonly [number, number];
  colours: readonly string[];
}
/** The rainbow for a sun elevation: centred on the antisolar point, primary at about 42°, secondary about 51° (reported: Wikipedia, Rainbow). */
export function rainbow(sunElevationDeg: number): RainbowGeometry {
  const centre = -sunElevationDeg, w = RAINBOW.width;
  return {
    centre, primaryTop: centre + RAINBOW.primary, secondaryTop: centre + RAINBOW.secondary,
    visible: sunElevationDeg > -1 && centre + RAINBOW.primary > 0,
    primary: [RAINBOW.primary, RAINBOW.primary - w], secondary: [RAINBOW.secondary - w * 1.6, RAINBOW.secondary + w * .2],
    colours: RAINBOW.colours,
  };
}

// ---- The weather as one state ----------------------------------------------------------------------------------------

export type Precipitation = "none" | "drizzle" | "rain" | "snow" | "hail";
export interface WeatherInput {
  precipitation?: Precipitation;
  /** For rain and drizzle: a class or a rate in mm/h. For snow: light, moderate or heavy. */
  intensity?: "light" | "moderate" | "heavy" | "violent" | number;
  /** Beaufort force (0–12), or `windSpeed` in m/s. */
  wind?: number;
  windSpeed?: number;
  /** +1 blows to the right of the picture, −1 to the left. */
  windDirection?: 1 | -1;
  /** Fog, mist or haze, or a visibility in km. */
  obscurity?: "fog" | "mist" | "haze";
  visibility?: number;
  clouds?: readonly CloudGenus[];
  /** Cloud cover 0–1 (oktas ÷ 8). */
  cover?: number;
  sunElevation?: number;
  thunder?: boolean;
}
export interface WeatherState {
  precipitation: Precipitation;
  /** Rain rate, mm/h (0 for none or snow). */
  rate: number;
  className?: string;
  /** Particle diameter (median volume for rain), mm, and fall speed, m/s. */
  diameter: number;
  fallSpeed: number;
  /** Signed wind, m/s (+ to the right), and its Beaufort force. */
  wind: number;
  beaufort: BeaufortForce;
  slant: number;
  /** Visibility, km, and what limits it. */
  visibility: number;
  obscurity?: IntensityClass;
  /** Visible particles per m³ (rain: drops over 1 mm). */
  density: number;
  flutter?: SnowFall["flutter"];
  clouds: readonly CloudGenus[];
  cover: number;
  sky: SkyGradient;
  thunder: boolean;
  /** What a viewer sees, in words, from the sources. */
  notes: readonly string[];
}

/** One consistent weather state from a few choices: everything else follows from the physics and the tables. */
export function weatherState(input: WeatherInput = {}): WeatherState {
  const precipitation = input.precipitation ?? "none", dirn = input.windDirection ?? 1;
  const speed = input.windSpeed ?? beaufortSpeed(input.wind ?? 0), beaufort = beaufortOf(speed);
  const notes: string[] = [`Wind ${beaufort.force} (${beaufort.name}): ${beaufort.land.toLowerCase()}.`];
  // Clear air: about 40 km (estimated; clean air reaches far more, haze far less).
  let rate = 0, diameter = 0, fallSpeed = 0, density = 0, visibility = input.visibility ?? 40, className: string | undefined, flutter: SnowFall["flutter"] | undefined;
  if (precipitation === "rain" || precipitation === "drizzle") {
    rate = typeof input.intensity === "number" ? input.intensity : RAIN_RATE[precipitation === "drizzle" ? "drizzle" : (input.intensity ?? "moderate")];
    const spec = dropSpectrum(rate);
    diameter = precipitation === "drizzle" ? HYDROMETEORS.drizzle.size.typical : spec.medianDiameter;
    fallSpeed = dropFallSpeed(diameter); density = precipitation === "drizzle" ? 0 : spec.larger(1);
    className = precipitation === "drizzle" ? "drizzle" : rainClass(rate).id;
    visibility = Math.min(visibility, rainVisibility(rate));
    notes.push(precipitation === "drizzle" ? "Drizzle hangs in the air; no streaks." : `${rainClass(rate).label}: ${rate.toFixed(1)} mm/h, half the water in drops over ${diameter.toFixed(1)} mm falling at ${fallSpeed.toFixed(1)} m/s.`);
  } else if (precipitation === "snow") {
    const k = input.intensity === "heavy" || input.intensity === "violent" ? "heavy" : input.intensity === "light" ? "light" : "moderate", s = snowFall(k);
    diameter = s.flake; fallSpeed = s.fallSpeed; flutter = s.flutter; className = k; visibility = Math.min(visibility, s.visibility);
    density = 1 / s.visibility * 60;
    notes.push(`${s.className.label}: visibility about ${s.visibility} km; flakes fall at about ${s.fallSpeed} m/s and drift with the wind.`);
  } else if (precipitation === "hail") {
    diameter = 15; fallSpeed = hailFallSpeed(1.5); className = "hail"; density = 20;
    notes.push("Hailstones fall fast and bounce on hard ground.");
  }
  if (input.obscurity) {
    const c = OBSCURITY_CLASSES.find(o => o.id === input.obscurity)!;
    visibility = Math.min(visibility, (c.range[0] + c.range[1]) / 2 * (c.id === "fog" ? .4 : 1));
  }
  // Fog, mist and haze are named only when asked for or when nothing falls: rain and snow limit visibility themselves.
  const obscurity = input.obscurity || (precipitation === "none" && input.visibility !== undefined) ? obscurityOf(visibility) : undefined;
  const seeing = `visibility ${visibility < 1 ? `${Math.round(visibility * 1000)} m` : `${visibility.toFixed(1)} km`}; contrast halves every ${(distanceForContrast(.5, visibility) * 1000).toFixed(0)} m`;
  if (obscurity) notes.push(`${obscurity.label}: ${seeing}.`);
  else if (visibility < 10) notes.push(`In the ${precipitation === "snow" ? "snow" : precipitation === "hail" ? "hail" : "rain"}: ${seeing}.`);
  const clouds = input.clouds ?? (precipitation === "none" ? [] : input.thunder ? ["cumulonimbus"] as const : precipitation === "drizzle" ? ["stratus"] as const : ["nimbostratus"] as const);
  const cover = clamp(input.cover ?? (precipitation === "none" ? (clouds.length ? .4 : 0) : 1), 0, 1);
  const wind = speed * dirn;
  // Only a layer (or falling weather) greys the whole sky; between heaps and patterned clouds the sky stays clear.
  const layered = clouds.some(c => ["veil", "sheet", "rain-layer", "layer"].includes(CLOUD_GENERA[c].form));
  const grey = precipitation !== "none" || layered ? cover : cover * .2;
  return {
    precipitation, rate, className, diameter, fallSpeed, wind, beaufort, slant: fallSpeed ? slantDeg(fallSpeed, wind) : 0,
    visibility, obscurity, density, flutter, clouds, cover, sky: skyGradient(input.sunElevation ?? 35, grey), thunder: !!input.thunder, notes,
  };
}

// ---- Into the effect renderer ----------------------------------------------------------------------------------------

/** The `environmental-effects` spec fields a weather state sets (structurally an `EffectSpec`; see `toEnvironmentalEffect`). */
export interface WeatherEffect {
  id: string; kind: "rain" | "snow" | "hail";
  region: { min: readonly [number, number, number]; max: readonly [number, number, number] };
  intensity: number; speed: number; wind: readonly [number, number, number];
  gust?: { amount: number; period: number }; streaks?: boolean; scale: number; label: string;
}
/**
 * The weather as an `environmental-effects` spec, so the existing renderers draw it (`compileEffect`, the three.js and
 * SVG renderers). Speeds and drift are the real ones at `unitsPerMetre` and `fps`; density is the share of the visible
 * drops in violent rain (50 mm/h), so light rain is sparse and a downpour fills the budget.
 */
export function toEnvironmentalEffect(state: WeatherState, opts: { region: WeatherEffect["region"]; unitsPerMetre: number; fps: number; id?: string }): WeatherEffect | undefined {
  if (state.precipitation === "none" || state.precipitation === "drizzle") return undefined;
  const perFrame = opts.unitsPerMetre / opts.fps, kind = state.precipitation;
  // The renderer carries snow at 0.6 of the wind; scale up so flakes drift at the wind's speed.
  const drift = state.wind * perFrame / (kind === "snow" ? .6 : 1);
  const intensity = kind === "rain" ? clamp(visibleDrops(state.rate) / visibleDrops(50), .03, 1) : kind === "snow" ? clamp(.25 / Math.max(.05, state.visibility), .15, 1) : .5;
  return {
    id: opts.id ?? `weather-${kind}`, kind, region: opts.region, intensity, speed: state.fallSpeed * perFrame, wind: [drift, 0, 0],
    gust: state.beaufort.force >= 5 ? { amount: .35, period: opts.fps * 3 } : undefined,
    streaks: kind === "snow" && state.beaufort.force >= 7 ? true : undefined,
    scale: kind === "snow" ? clamp(state.diameter / 6, .5, 2) : 1,
    label: `${state.className ?? kind} ${kind}, wind ${state.beaufort.force}`,
  };
}
