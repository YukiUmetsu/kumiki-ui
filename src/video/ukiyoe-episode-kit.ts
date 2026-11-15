/** Small helpers shared by the UKIYO1 episodes (Kasa Jizō, Urashima Tarō, …): node builders and camera keys. */
import type { UkiyoeAction, UkiyoeFigureLook } from "../../registry/video/ukiyoe/ukiyoe-figure";
import { travelAt } from "../../registry/video/ukiyoe/ukiyoe-figure";
import type { UkiyoeKey } from "../../registry/video/ukiyoe/ukiyoe-core";
import type { UkiyoeEpisodeAspect } from "../../registry/video/ukiyoe/ukiyoe-episode";
import type { UkiyoeNode } from "../../registry/video/ukiyoe/ukiyoe-scene";
import type { UkiyoeCreatureAction } from "../../registry/video/ukiyoe/ukiyoe-creatures";

export const motif = (id: string, name: string, x: number, y: number, params: Record<string, unknown>, extra: Record<string, unknown> = {}): UkiyoeNode =>
  ({ id, kind: "motif", motif: name, x, y, params, ...extra } as UkiyoeNode);
export const figure = (id: string, look: UkiyoeFigureLook, x: number, y: number, actions: UkiyoeAction[], extra: Record<string, unknown> = {}): UkiyoeNode =>
  ({ id, kind: "figure", look, x, y, actions, ...extra } as UkiyoeNode);
export const creature = (id: string, species: string, x: number, y: number, actions: readonly UkiyoeCreatureAction[], extra: Record<string, unknown> = {}): UkiyoeNode =>
  ({ id, kind: "creature", species, x, y, actions, ...extra } as UkiyoeNode);
/** Keys that move a motif exactly as a figure walking `actions` from the same x (sampled from the walk itself). */
export const follow = (actions: readonly UkiyoeAction[], x: number, frames: number, dx = 0): UkiyoeKey[] => {
  const keys: UkiyoeKey[] = [];
  for (let f = 0; f <= frames; f += 6) keys.push({ frame: f, x: x + dx + travelAt(actions, f).x, ease: "linear" } as UkiyoeKey);
  return keys;
};
/** Camera keys spread evenly over the shot: landscape holds the whole stage, portrait follows the action closer. */
export const cam = (a: UkiyoeEpisodeAspect, land: [number, number, number][], port: [number, number, number][], dur: number) => {
  const pts = a === "portrait" ? port : land;
  return { keys: pts.map(([x, y, zoom], i) => ({ frame: Math.round(i * (dur - 1) / Math.max(1, pts.length - 1)), x, y, zoom, ease: "inOut" as const })) };
};
/** Recorded footsteps in the sound catalog, by surface; a step moment takes them in turn. */
export const STEPS = {
  snow: ["step-snow-1", "step-snow-2", "step-snow-3", "step-snow-4"],
  sand: ["step-sand-1", "step-sand-2", "step-sand-3", "step-sand-4"],
  gravel: ["step-gravel-1", "step-gravel-2", "step-gravel-3", "step-gravel-4"],
  wood: ["step-wood-1", "step-wood-2", "step-wood-3", "step-wood-4"],
  stone: ["step-stone-1", "step-stone-3", "step-stone-4", "step-stone-5"],
} as const;
