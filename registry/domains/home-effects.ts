/** EnvironmentalEffects presets for a HouseLayout (meters): a storm or snowfall over the site,
 * a roof leak dripping from the decking underside onto the attic floor with a ceiling stain in
 * the room below, attic dust, and condensation on the outside of a front window's lower glass.
 * Regions come from the model's dimensions; intensities are illustrative.
 */
import type { EffectSpec } from "../visual/environmental-effects";
import { facadePoint } from "./home-model";
import type { HouseLayout } from "./home-model";

export type HouseEffectPreset = "storm" | "snowfall" | "roof-leak" | "attic-dust" | "window-condensation";

export function houseEffects(layout: HouseLayout, preset: HouseEffectPreset, options: { start?: number; intensity?: number; leakAt?: readonly [number, number] } = {}): EffectSpec[] {
  const d = layout.dims, W = d.width / 2, D = d.depth / 2, start = options.start ?? 0;
  const sky = { min: [-W - 4, 0, -D - 4] as const, max: [W + 4, d.ridgeY + 4, D + 5] as const };
  if (preset === "storm") return [{ id: "rain", kind: "rain", region: sky, intensity: options.intensity ?? .7, wind: [.035, 0, .02], seed: 3, frames: { start, fadeIn: 30 } }];
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
