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
