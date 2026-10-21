/** EnvironmentalEffects presets for a HouseLayout (meters): a storm or snowfall over the site,
 * a roof leak dripping from the decking underside onto the attic floor with a ceiling stain in
 * the room below, attic dust, and condensation on the outside of a front window's lower glass.
 * Regions come from the model's dimensions; intensities are illustrative.
 */
import type { EffectSpec, EffectSurface } from "../visual/environmental-effects";
import { ROOF_LAYERS, SHINGLE_THICKNESS, facadePoint } from "./home-model";
import type { HouseLayout } from "./home-model";

export type HouseEffectPreset = "rain" | "storm" | "blizzard" | "snow-day" | "hail" | "snowfall" | "roof-leak" | "attic-dust" | "window-condensation";

/** Snow-cover surfaces for a house: both roof slopes on the shingle plane (to the rake and eave tails) and the site ground. */
export function houseSnowSurfaces(layout: HouseLayout): { roof: EffectSurface[]; ground: EffectSurface[] } {
  const d = layout.dims, W = d.width / 2, cos = Math.cos(d.pitch), sin = Math.sin(d.pitch);
  const run = d.eaveTail.z, len = run / cos, halfX = W + d.rakeOverhang, lift = ROOF_LAYERS.decking + ROOF_LAYERS.underlayment + SHINGLE_THICKNESS[layout.spec.shingles ?? "three-tab"] * 2;
  const slope = (side: 1 | -1): EffectSurface => {
    const zm = side * run / 2, n = [0, cos, side * sin] as const;
    return { origin: [0, d.roofTopAt(zm) + n[1] * lift, zm + n[2] * lift], u: side > 0 ? [-1, 0, 0] : [1, 0, 0], v: [0, -sin, side * cos], size: [halfX * 2, len] };
  };
  const site = layout.site ?? { min: [-W - 4, 0, -d.depth / 2 - 4], max: [W + 4, 0, d.depth / 2 + 5] };
  const ground: EffectSurface = { origin: [(site.min[0] + site.max[0]) / 2, .005, (site.min[2] + site.max[2]) / 2], u: [1, 0, 0], v: [0, 0, -1], size: [site.max[0] - site.min[0] - .2, site.max[2] - site.min[2] - .2] };
  return { roof: [slope(1), slope(-1)], ground: [ground] };
}

export function houseEffects(layout: HouseLayout, preset: HouseEffectPreset, options: { start?: number; intensity?: number; leakAt?: readonly [number, number] } = {}): EffectSpec[] {
  const d = layout.dims, W = d.width / 2, D = d.depth / 2, start = options.start ?? 0;
  const sky = { min: [-W - 4, 0, -D - 4] as const, max: [W + 4, d.ridgeY + 4, D + 5] as const };
  const ground = { min: [sky.min[0], 0, sky.min[2]] as const, max: [sky.max[0], 0, sky.max[2]] as const };
  if (preset === "rain") return [
    { id: "rain", kind: "rain", region: sky, intensity: options.intensity ?? .6, wind: [.012, 0, .006], seed: 3, frames: { start, fadeIn: 30 }, label: "Steady rain (illustrative)" },
    { id: "splashes", kind: "splash", region: ground, intensity: .5, seed: 6, frames: { start: start + 10, fadeIn: 30 }, label: "Splashes" },
  ];
  if (preset === "storm") return [
    // Strong, gusting wind: fast rain driven nearly sideways, longer streaks, more splashes.
    { id: "storm-rain", kind: "rain", region: sky, intensity: options.intensity ?? 1, budget: 3400, speed: (sky.max[1] - sky.min[1]) / 11, wind: [1.05, 0, .3], gust: { amount: .4, period: 64 }, seed: 8, frames: { start, fadeIn: 20 }, label: "Storm: wind-driven rain (illustrative)" },
    { id: "storm-splashes", kind: "splash", region: ground, intensity: 1, budget: 900, seed: 12, frames: { start: start + 8, fadeIn: 20 }, label: "Splashes" },
  ];
  if (preset === "blizzard") return [
    { id: "blizzard-snow", kind: "snow", region: sky, intensity: 1, budget: 3800, speed: (sky.max[1] - sky.min[1]) / 120, wind: [.16, 0, .05], gust: { amount: .6, period: 90 }, streaks: true, scale: .7, seed: 21, frames: { start, fadeIn: 30 }, label: "Blizzard: dense wind-driven snow (illustrative)" },
    { id: "blizzard-cover", kind: "snow-cover", cover: { surfaces: [...houseSnowSurfaces(layout).roof, ...houseSnowSurfaces(layout).ground], depth: .1, buildFrames: 400 }, seed: 4, frames: { start }, label: "Drifting cover" },
  ];
  if (preset === "snow-day") {
    const surf = houseSnowSurfaces(layout);
    return [
      { id: "light-snow", kind: "snow", region: sky, intensity: .35, wind: [.004, 0, .002], seed: 5, frames: { start, fadeIn: 40 }, label: "Light snow (illustrative)" },
      { id: "roof-snow", kind: "snow-cover", cover: { surfaces: surf.roof, depth: .2, buildFrames: 220 }, seed: 9, frames: { start }, label: "Snow on the roof" },
      { id: "ground-snow", kind: "snow-cover", cover: { surfaces: surf.ground, depth: .14, buildFrames: 200 }, seed: 2, frames: { start }, label: "Snow on the ground" },
    ];
  }
  if (preset === "hail") return [
    { id: "hail", kind: "hail", region: { min: [sky.min[0] + 2, 0, sky.min[2] + 2], max: [sky.max[0] - 2, d.ridgeY + 3, sky.max[2] - 1] }, floorY: 0, intensity: options.intensity ?? .8, wind: [.03, 0, .01], seed: 17, scale: 2.4, frames: { start, fadeIn: 15 }, label: "Hail (illustrative, not to scale or rate)" },
    { id: "hail-rain", kind: "rain", region: sky, intensity: .25, wind: [.05, 0, .02], seed: 19, frames: { start, fadeIn: 20 }, label: "with rain" },
  ];
  if (preset === "snowfall") return [{ id: "snow", kind: "snow", region: sky, intensity: options.intensity ?? .7, wind: [.004, 0, .002], seed: 5, frames: { start, fadeIn: 40 } }];
  if (preset === "attic-dust") return [{ id: "dust", kind: "dust", region: { min: [-W * .85, d.eaveY + .3, -D * .55], max: [W * .85, d.ridgeY - .4, D * .55] }, intensity: options.intensity ?? .8, seed: 9, frames: { start } }];
  if (preset === "roof-leak") {
    // Under the front slope's decking, between rafters; drips land on the attic insulation, the ceiling below stains.
    const [x, z] = options.leakAt ?? [-W * .35, D * .45];
    const top = d.roofTopAt(z), atticFloor = d.eaveY + .25, ceiling = d.floorY + d.storeys * d.storeyHeight - (d.storeys > 1 ? d.storeyHeight : 0);
    const ceilingY = Math.min(ceiling, d.eaveY) - .02;
    return [
      { id: "leak-drips", kind: "drips", sources: [[x, top - .005, z], [x + .14, top - .02, z - .06], [x - .1, top - .03, z + .05]], floorY: atticFloor, seed: 11, frames: { start }, label: "Leak drips (illustrative rate)" },
      { id: "ceiling-stain", kind: "stain", surface: { origin: [x, ceilingY, z], u: [1, 0, 0], v: [0, 0, -1], size: [1.4, 1.4] }, seed: 4, frames: { start: start + 40 }, label: "Ceiling stain spreading (illustrative)" },
    ];
  }
  // Window condensation on the outside of the lower sash glass of the first front window.
  const win = layout.facades.front.openings.find(o => o.kind === "window");
  if (!win) return [];
  const f = layout.facades.front.frame, dh = win.style === "double-hung";
  const w = dh ? -.088 : -.056, jamb = .03, meet = win.v0 + jamb * 1.3 + (win.v1 - win.v0 - jamb * 2.3) / 2;
  const v0 = win.v0 + .07, v1 = dh ? meet - .03 : win.v1 - .07, u0 = win.u0 + .06, u1 = win.u1 - .06;
  const origin = facadePoint(f, (u0 + u1) / 2, (v0 + v1) / 2, w + .004);
  return [{ id: "condensation", kind: "condensation", surface: { origin, u: f.uAxis, v: [0, 1, 0], size: [u1 - u0, v1 - v0] }, intensity: options.intensity ?? .8, seed: 13, frames: { start } }];
}
