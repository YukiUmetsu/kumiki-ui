/** Ready-made particle moments, each one job done the way film and studio work does it. Pure builders: each returns the effect specs,
 * the camera move, the frame where text should land and the sound cues, so a story, a film and an export agree.
 */
import type { EffectSpec, Vec3 } from "./environmental-effects";
import type { ParticleJob } from "./particle-guide";

/** A catalog sound placed at the frame where its peak should land. */
export interface ParticleCue { frame: number; sound: string; gainDb: number }
export interface ParticleMomentPlan {
  specs: EffectSpec[];
  camera?: { from: Vec3; to: Vec3; endFrame: number };
  titleFrame?: number;
  cues: ParticleCue[];
}
export interface ParticleMoment { id: string; title: string; job: ParticleJob; kind: EffectSpec["kind"]; summary: string; storyExport: string; keywords: readonly string[] }
/** The catalog of moments. Every entry has a builder below, a React component and a story. */
export const PARTICLE_MOMENTS: readonly ParticleMoment[] = [
  { id: "motes-in-the-light", title: "Motes In The Light", job: "atmosphere", kind: "motes", storyExport: "motes-in-the-light",
    summary: "Dust that glints only inside a shaft of light, with soft discs near the lens.", keywords: ["dust", "light beam", "interior", "archive", "workshop", "quiet", "window light"] },
  { id: "embers-rising", title: "Embers Rising", job: "atmosphere", kind: "embers", storyExport: "embers-rising",
    summary: "Embers rise out of frame, shrinking and cooling from white-hot to red.", keywords: ["fire", "heat", "opening", "chapter card", "warm", "ash", "dark"] },
  { id: "sparks-on-impact", title: "Sparks On Impact", job: "impact", kind: "sparks", storyExport: "sparks-on-impact",
    summary: "One burst on the hit's frame, with a flash of light and the hit's sound.", keywords: ["hit", "impact", "weld", "cut", "collision", "metal", "contact"] },
  { id: "lens-bokeh", title: "Lens Bokeh", job: "atmosphere", kind: "bokeh", storyExport: "lens-bokeh",
    summary: "Soft lights between the lens and a photograph, sliding past with a slow camera.", keywords: ["bokeh", "depth", "photo", "lens", "dreamy", "soft", "parallax"] },
  { id: "fireflies-at-dusk", title: "Fireflies At Dusk", job: "atmosphere", kind: "fireflies", storyExport: "fireflies-at-dusk",
    summary: "A few lights blinking out of step over a dark, cool picture.", keywords: ["night", "dusk", "garden", "field", "magic", "calm", "life"] },
  { id: "snowfall", title: "Snowfall", job: "weather", kind: "snow", storyExport: "snowfall",
    summary: "Near flakes large and soft, far flakes small, drifting slowly over a cold picture.", keywords: ["snow", "winter", "season", "cold", "quiet", "holiday", "weather"] },
  { id: "rain-in-the-light", title: "Rain In The Light", job: "weather", kind: "rain", storyExport: "rain-in-the-light",
    summary: "Rain that shows where a light behind it catches the drops, leaning with the wind.", keywords: ["rain", "storm", "weather", "night", "moody", "wet", "pressure"] },
  { id: "assemble-into-mark", title: "Assemble Into Mark", job: "identity", kind: "assemble", storyExport: "assemble-into-mark",
    summary: "Many particles fly together to form a mark: one thing made of many.", keywords: ["logo reveal", "brand", "identity", "form", "community", "team", "many into one"] },
  { id: "particle-flow", title: "Particle Flow", job: "data", kind: "flow", storyExport: "particle-flow",
    summary: "Particles stream from one thing to another, with the exact figure on a label.", keywords: ["flow", "money", "data", "transfer", "pipeline", "explainer", "from to"] },
];

/** Dust in a shaft of light from `beam`, with a few soft discs near the lens. */
export function motesInTheLight(options: { beam?: { origin: Vec3; direction: Vec3; angle: number }; durationFrames?: number } = {}): ParticleMomentPlan {
  const beam = options.beam ?? { origin: [-4.6, 3.1, 0], direction: [1, -.62, 0], angle: .34 }, end = options.durationFrames ?? 150;
  return { titleFrame: 60, camera: { from: [0, 0, 5], to: [.3, .1, 4.6], endFrame: end }, cues: [{ frame: 0, sound: "bed-cave-air", gainDb: -18 }], specs: [
    { id: "motes", frames: { fadeIn: 0 }, kind: "motes", job: "atmosphere", region: { min: [-3.4, -2, -1.2], max: [3.4, 2, 1.2] }, budget: 900, intensity: .85, color: "#fff0d6", seed: 3, scale: 2.4, beam },
    { id: "near", frames: { fadeIn: 0 }, kind: "bokeh", job: "atmosphere", region: { min: [-1.5, -.85, 1.8], max: [1.5, .85, 3] }, budget: 9, intensity: 1, color: "#ffd9a8", seed: 4, scale: .8 }] };
}
/** Embers rising from heat below the frame. */
export function embersRising(options: { durationFrames?: number } = {}): ParticleMomentPlan {
  const end = options.durationFrames ?? 150;
  return { titleFrame: 60, camera: { from: [0, -.2, 5], to: [0, .1, 4.7], endFrame: end }, cues: [{ frame: 0, sound: "bed-cave-air", gainDb: -16 }, { frame: 66, sound: "riser-1s-soft", gainDb: -12 }], specs: [
    { id: "embers", frames: { fadeIn: 0 }, kind: "embers", job: "atmosphere", region: { min: [-3.4, -2.3, -1.5], max: [3.4, 1.4, 1.5] }, budget: 220, intensity: 1, life: 150, seed: 5, scale: 9 },
    { id: "near-embers", frames: { fadeIn: 0 }, kind: "bokeh", job: "atmosphere", region: { min: [-1.4, -.8, 1.8], max: [1.4, .4, 3] }, budget: 7, intensity: 1, color: "#ff9a4d", seed: 6, scale: .7 }] };
}
/** One burst of sparks on `impactFrame`. `flash(frame)` gives the light's strength from 0 to 1 for a glow on the same frame. */
export function sparksOnImpact(options: { impactFrame?: number; origin?: Vec3; floorY?: number } = {}) {
  const at = options.impactFrame ?? 30;
  const plan: ParticleMomentPlan = { cues: [{ frame: at, sound: "impact-medium-soft", gainDb: -4 }], specs: [
    { id: "sparks", kind: "sparks", job: "impact", burst: { frame: at, origin: options.origin ?? [0, -1.05, 0], direction: [.15, 1, .1], spread: 1.15, speed: .17, gravity: .007, life: 40 }, floorY: options.floorY ?? -1.15, budget: 180, intensity: 1, seed: 8 }] };
  return { ...plan, flash: (frame: number) => frame >= at ? Math.exp(-(frame - at) / 3) : 0 };
}
/** Soft warm and cool discs close to the lens. */
export function lensBokeh(options: { durationFrames?: number } = {}): ParticleMomentPlan {
  const end = options.durationFrames ?? 150;
  return { titleFrame: 40, camera: { from: [.4, 0, 5], to: [-.4, 0, 4.8], endFrame: end }, cues: [], specs: [
    { id: "warm", frames: { fadeIn: 0 }, kind: "bokeh", job: "atmosphere", region: { min: [-1.7, -.95, 1.6], max: [1.7, .95, 3] }, budget: 16, intensity: 1, color: "#ffd2a0", seed: 11 },
    { id: "cool", frames: { fadeIn: 0 }, kind: "bokeh", job: "atmosphere", region: { min: [-1.7, -.95, 1.6], max: [1.7, .95, 3] }, budget: 10, intensity: 1, color: "#a8d4ff", seed: 12, scale: .8 }] };
}
/** A few fireflies low in the frame. */
export function firefliesAtDusk(options: { durationFrames?: number } = {}): ParticleMomentPlan {
  const end = options.durationFrames ?? 150;
  return { camera: { from: [0, 0, 5], to: [.2, 0, 4.8], endFrame: end }, cues: [{ frame: 0, sound: "bed-wind-mountain", gainDb: -20 }], specs: [
    { id: "fireflies", frames: { fadeIn: 0 }, kind: "fireflies", job: "atmosphere", region: { min: [-3.2, -1.9, -1], max: [3.2, .2, 1.6] }, budget: 40, intensity: 1, color: "#e6ff8a", life: 120, seed: 14, scale: 12 }] };
}
/** Snow in two layers: near flakes large and soft, far flakes small. A slow fall and a little wind. */
export function snowfall(options: { durationFrames?: number } = {}): ParticleMomentPlan {
  const end = options.durationFrames ?? 150;
  return { titleFrame: 50, camera: { from: [0, 0, 5], to: [0, -.1, 4.8], endFrame: end }, cues: [{ frame: 0, sound: "bed-wind-mountain", gainDb: -18 }], specs: [
    { id: "far", frames: { fadeIn: 0 }, kind: "snow", job: "weather", region: { min: [-4, -2.6, -2], max: [4, 2.6, 0] }, budget: 700, intensity: 1, wind: [.004, 0, 0], seed: 41, scale: .7 },
    { id: "near", frames: { fadeIn: 0 }, kind: "snow", job: "weather", region: { min: [-2.4, -1.6, 1.4], max: [2.4, 1.6, 3] }, budget: 90, intensity: 1, wind: [.006, 0, 0], seed: 42, scale: 1.8 }] };
}
/** Rain lit from behind: streaks lean with gusting wind, and a glow marks the light they cross. */
export function rainInTheLight(options: { durationFrames?: number } = {}): ParticleMomentPlan {
  const end = options.durationFrames ?? 150;
  return { titleFrame: 50, camera: { from: [0, 0, 5], to: [.15, 0, 4.85], endFrame: end }, cues: [{ frame: 0, sound: "bed-river-fast", gainDb: -16 }], specs: [
    { id: "rain", frames: { fadeIn: 0 }, kind: "rain", job: "weather", region: { min: [-3.6, -2.4, -1.5], max: [3.6, 2.4, 1.5] }, budget: 1400, intensity: 1, wind: [.025, 0, 0], gust: { amount: .4, period: 90 }, color: "#dfe9f5", seed: 43 }] };
}
/** Particles form the shape given by `targets` (see `sampleShapeTargets`), then hold. The name lands after the shape settles. */
export function assembleIntoMark(options: { targets: readonly Vec3[]; startFrame?: number; formFrames?: number; color?: string; dissolve?: boolean }): ParticleMomentPlan {
  const s = options.startFrame ?? 8, e = s + (options.formFrames ?? 80);
  return { titleFrame: e + 8, camera: { from: [0, 0, 5.4], to: [0, 0, 5], endFrame: e + 40 }, cues: [{ frame: e - 6, sound: "sting-airy-short", gainDb: -6 }], specs: [
    { id: "assemble", frames: { fadeIn: 0 }, kind: "assemble", job: "identity", region: { min: [-4, -2.4, -2], max: [4, 2.4, 2] }, assemble: { targets: options.targets, startFrame: s, endFrame: e, stagger: .45, dissolve: options.dissolve }, intensity: 1, color: options.color ?? "#dff3ff", seed: 21, scale: 3.4 }] };
}
/** Particles stream from `from` to `to` through `via`. `volume` from 0 to 1 sets the density. The exact value belongs in a label. */
export function particleFlow(options: { from?: Vec3; to?: Vec3; via?: readonly Vec3[]; volume?: number; color?: string } = {}): ParticleMomentPlan {
  const from = options.from ?? [-2.4, 0, 0], to = options.to ?? [2.4, 0, 0], v = Math.max(.05, Math.min(1, options.volume ?? .6));
  return { cues: [], specs: [
    { id: "flow", frames: { fadeIn: 0 }, kind: "flow", job: "data", flow: { path: [from, ...options.via ?? [[0, .55, 0] as Vec3], to], speed: .006, spread: .07 }, budget: Math.round(320 * v), intensity: 1, color: options.color ?? "#9fe3ff", seed: 31, scale: 5 }] };
}
