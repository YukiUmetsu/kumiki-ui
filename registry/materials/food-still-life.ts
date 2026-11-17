/**
 * FOOD1 storybook still lifes: one library entry (`food-library.ts`) staged on its vessel and table, framed by its
 * own bounds, lit by its mood, steaming if hot, and rendered (`renderStillLife`).
 */
import { bounds, merge } from "./food-mesh";
import type { V3 } from "./food-mesh";
import { renderStillLife } from "./food-scene";
import type { StillLife, StillLifeRender } from "./food-scene";
import { MOODS } from "./food-stage";
import type { MoodId } from "./food-stage";
import { foodEntry, tableFor, vesselFor } from "./food-library";
import type { FoodEntry } from "./food-library";

export interface FoodStillLifeOptions {
  /** Change the light (default: the entry's own mood). */
  mood?: MoodId;
  /** Another individual of the same food (asymmetry, bruises, placement). */
  seed?: number;
  /** Camera elevation override, degrees. */
  elevation?: number;
  /** Zoom: 1 frames the whole dish; 2 is twice as close. */
  zoom?: number;
}

/** Stage an entry as a still life. */
export function foodStillLife(e: FoodEntry, o: FoodStillLifeOptions = {}): StillLife {
  const seed = o.seed ?? 1, v = vesselFor(e, seed), food = e.build(v, seed), parts = [...v.parts, ...food];
  const mood = MOODS[o.mood ?? e.mood];
  // frame on the food (the vessel may be cropped, as in a food photograph), never tighter than half the whole dish;
  // look down into deep vessels far enough to see what is in them
  const all = bounds(merge(parts.map(p => p.mesh))), solid = food.filter(p => p.name !== "dew"), fb = solid.length ? bounds(merge(solid.map(p => p.mesh))) : all;
  const deep = v.rimY > 18 ? (Math.atan2(Math.max(0, v.rimY - fb.max[1]) + 8, v.rimR) * 180) / Math.PI + 26 : 0;
  const el = ((o.elevation ?? e.view?.elevation ?? Math.min(62, Math.max(32, deep))) * Math.PI) / 180;
  const need = (b: { min: V3; max: V3 }, k: number) => Math.max((b.max[0] - b.min[0]) * k, ((b.max[2] - b.min[2]) * Math.sin(el) + (b.max[1] - b.min[1]) * Math.cos(el)) * k * 1.08 * (4 / 3));
  // (a drink is its vessel: keep the whole cup or glass in view)
  const whole = need(all, 1.18), held = /cup|glass|jar/.test(e.vessel) ? 0.9 : 0.5, frame = (e.view?.frame ?? Math.min(whole, Math.max(need(fb, 1.55), whole * held, 80))) / (o.zoom ?? 1);
  const span: V3 = [fb.max[0] - fb.min[0], fb.max[1] - fb.min[1], fb.max[2] - fb.min[2]];
  const target: V3 = [(fb.min[0] + fb.max[0]) / 2, e.view?.y ?? fb.min[1] + span[1] * 0.4, e.view?.z ?? (fb.min[2] + fb.max[2]) / 2];
  const liquid = food.find(p => p.transparent && p.name !== "dew") ?? null;
  const steamY = liquid ? bounds(liquid.mesh).max[1] : fb.max[1] * 0.85;
  return {
    parts,
    table: tableFor(e, seed),
    camera: { elevation: (el * 180) / Math.PI, target, frame, aperture: 7, sharpDepth: Math.max(45, span[2] * 0.45) },
    mood,
    steam: e.hot ? { at: [target[0], steamY, target[2]], radius: Math.max(20, Math.min(span[0], span[2]) * 0.3), strength: e.hot } : undefined,
  };
}

export interface FoodRenderJob extends FoodStillLifeOptions { id: string; width?: number; height?: number; supersample?: number }
/** Render a library entry by id. */
export function renderFoodStillLife(job: FoodRenderJob): StillLifeRender & { caption: string } {
  const e = foodEntry(job.id);
  if (!e) throw new Error(`No food "${job.id}" in the library`);
  const r = renderStillLife(foodStillLife(e, job), { width: job.width ?? 360, height: job.height ?? 270, supersample: job.supersample ?? 2, seed: job.seed });
  return { ...r, caption: e.look };
}

