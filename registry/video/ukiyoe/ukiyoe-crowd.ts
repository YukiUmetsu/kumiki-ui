/**
 * UKIYO1 crowds: the street life of an emaki or a Hiroshige station print from one node. A `crowd` node fills a strip
 * of road with townsfolk in depth rows — strollers crossing at their own pace, people stopping to talk or bow, porters
 * with poles, children running, or a procession in file — each a full figure with its own look, timing and seed. The
 * crowd expands into ordinary figure nodes before rendering, so every person obeys the same rig, wind and cadence, and
 * the whole crowd is deterministic for a given scene seed.
 */
import { hash01, hashSigned } from "./ukiyoe-core";
import type { UkiyoeAction, UkiyoeFigureLook } from "./ukiyoe-figure";
import type { UkiyoePatternType } from "./ukiyoe-prims";
import type { UkiyoeSeason } from "./ukiyoe-wardrobe";
import { ukiyoeTownsfolk } from "./ukiyoe-wardrobe";

export type UkiyoeCrowdMood = "stroll" | "busy" | "festival" | "procession";
export const UKIYOE_CROWD_MOODS: readonly UkiyoeCrowdMood[] = ["stroll", "busy", "festival", "procession"];

/** What a crowd node asks for (the scene contract's `crowd` node carries these fields). */
export interface UkiyoeCrowdSpec {
  id: string;
  /** Width of the strip of road the crowd fills, centred on the node's x. */
  width: number;
  /** Number of people, 1..80. */
  count: number;
  /** Depth rows, 1..4: back rows stand higher up the page and smaller. */
  rows?: number;
  /** Rise per row in px (default 34). */
  rowGap?: number;
  /** stroll (most walk, a few stop to talk), busy (porters, hurrying), festival (dancing, cheering, waving), procession
   * (all walk one way in file). */
  mood?: UkiyoeCrowdMood;
  /** Which way walkers go. */
  direction?: "left" | "right" | "both";
  /** Frames the crowd's actions span (default 600). */
  frames?: number;
  /** Looks to draw from; by default a varied set of Edo townsfolk. */
  cast?: readonly UkiyoeFigureLook[];
  /** Figure scale of the front row (default 1). */
  scale?: number;
  /** The season the townsfolk are dressed for, when no `cast` is given (default spring). */
  season?: UkiyoeSeason;
}

/** One person the crowd expands into: a figure node's fields, local to the crowd node. */
export interface UkiyoeCrowdMember { id: string; x: number; y: number; scale: number; look: UkiyoeFigureLook; actions: UkiyoeAction[]; facing: "left" | "right"; row: number }

const P = (type: UkiyoePatternType, color: string, scale = .45, opacity = .75) => ({ type, color, scale, opacity });
/** A varied cast of Edo townsfolk: merchants, travellers, women in patterned kimono, porters, children, elders, monks. */
export const UKIYOE_TOWNSFOLK: readonly UkiyoeFigureLook[] = [
  { robe: "ai", robePattern: P("kanoko", "gofun"), hat: "kasa", lower: "tucked", legs: "gofun", feet: "waraji", prop: "staff" },
  { robe: "beni", robePattern: P("asanoha", "gofun"), hair: "shimada", obi: "kincha", under: "ki", sleeves: "long", feet: "geta", view: "three-quarter" },
  { robe: "kusa", hair: "chonmage", coat: "kogecha", lower: "hakama", hakama: "usuzumi", feet: "tabi", prop: "fan", accent: "shu" },
  { robe: "cha", robePattern: P("shima", "kogecha", .4, .6), hair: "chonmage", lower: "tucked", legs: "hada", feet: "waraji", prop: "basket-pole" },
  { robe: "murasaki", robePattern: P("seigaiha", "sora"), hair: "shimada", obi: "gofun", under: "beni", sleeves: "long", feet: "geta", prop: "umbrella", accent: "shu" },
  { robe: "ki", robePattern: P("ichimatsu", "shu", .5, .9), hair: "child", build: "child", obi: "shu", feet: "geta" },
  { robe: "usuzumi", hair: "elder", beard: true, lower: "tucked", legs: "hada", feet: "waraji", prop: "staff" },
  { robe: "kogecha", hat: "conical", hatColor: "kincha", lower: "tucked", legs: "gofun", feet: "waraji", prop: "bundle" },
  { robe: "sora", robePattern: P("yagasuri", "ai", .4), hair: "shimada", obi: "beni", under: "gofun", sleeves: "long", feet: "geta", view: "three-quarter" },
  { robe: "shu", robePattern: P("sakura", "gofun", .5, .8), hair: "child", build: "child", obi: "ai", feet: "geta" },
  { robe: "matsu", hair: "topknot", coat: "cha", lower: "hakama", hakama: "ai", feet: "tabi", prop: "scroll" },
  { robe: "gofun", hair: "bald", coat: "sumi", lower: "robe", feet: "waraji", prop: "staff" },
];

/**
 * Expands a crowd into figures. Positions, looks, speeds and behaviours all come from `seed`, so the same crowd is the
 * same people on every frame and in every render.
 */
export function expandCrowd(spec: UkiyoeCrowdSpec, seed: number): UkiyoeCrowdMember[] {
  const n = Math.max(1, Math.min(80, Math.round(spec.count))), rows = Math.max(1, Math.min(4, Math.round(spec.rows ?? 2)));
  const W = spec.width, gap = spec.rowGap ?? 34, mood = spec.mood ?? "stroll", frames = Math.max(30, Math.round(spec.frames ?? 600));
  const cast = spec.cast?.length ? spec.cast : ukiyoeTownsfolk(seed, 28, spec.season ?? "spring"), base = spec.scale ?? 1;
  const out: UkiyoeCrowdMember[] = [];
  for (let i = 0; i < n; i++) {
    const r = (k: number) => hash01(seed, i, 700 + k);
    // Back rows first so nearer people are drawn over them.
    const row = rows - 1 - (i % rows), depthK = 1 - row * .14, slot = (Math.floor(i / rows) + .5) / Math.ceil(n / rows);
    const x0 = (slot - .5) * W + hashSigned(seed, i, 701) * W / Math.ceil(n / rows) * .4, y = -row * gap + hashSigned(seed, i, 702) * gap * .2;
    let look = cast[Math.floor(r(3) * cast.length) % cast.length];
    const dirSign = spec.direction === "left" ? -1 : spec.direction === "right" ? 1 : mood === "procession" ? -1 : r(4) < .5 ? -1 : 1;
    const actions: UkiyoeAction[] = [];
    // Behaviour by mood: what share walk, and what the others do.
    const roll = r(5);
    const walkShare = mood === "procession" ? 1 : mood === "busy" ? .85 : mood === "festival" ? .3 : .7;
    const start = Math.floor(r(6) * 20);
    if (roll < walkShare) {
      const busy = mood === "busy" && r(7) < .35, kid = look.build === "child";
      if (busy && !look.prop) look = { ...look, prop: "basket-pole", lower: "tucked" };
      const speed = mood === "procession" ? .55 : busy ? 1.1 : kid ? 1.25 : .6 + .5 * r(8), run = kid && mood !== "procession" && r(9) < .4;
      const travel = dirSign * speed * frames * (run ? 2 : 1) * depthK;
      // A stroller may stop once on the way to look at something, then walk on.
      if (mood === "stroll" && r(10) < .35) {
        const stop = start + Math.floor(frames * (.3 + .3 * r(11))), stopLen = 30 + Math.floor(40 * r(12)), part = (stop - start) / frames;
        actions.push({ type: "walk", start, end: stop, to: travel * part });
        actions.push({ type: "look", start: stop, end: stop + stopLen, angle: -6 - 8 * r(13) });
        actions.push({ type: "walk", start: stop + stopLen, end: frames, to: travel * (part + (frames - stop - stopLen) / frames) });
      } else actions.push({ type: run ? "run" : "walk", start, end: frames, to: travel });
    } else if (mood === "festival") {
      const what = r(14);
      actions.push(what < .4 ? { type: "dance", start, end: frames } : what < .7 ? { type: "cheer", start: start + Math.floor(r(15) * 60), end: frames } : { type: "wave", start: start + Math.floor(r(15) * 60), end: frames });
    } else {
      // Standing about: talking (pairs face each other), bowing in greeting, or looking on.
      const what = r(14);
      if (what < .5) actions.push({ type: "talk", start: start + Math.floor(r(15) * 40), end: frames });
      else if (what < .75) { const at = start + Math.floor(r(15) * frames * .6); actions.push({ type: "bow", start: at, end: at + 50, angle: 28 + 14 * r(16) }); }
      else actions.push({ type: "look", start, end: frames, angle: -10 + 20 * r(16) });
    }
    const facing: "left" | "right" = roll < walkShare ? (dirSign < 0 ? "left" : "right") : i % 2 ? "left" : "right";
    out.push({ id: `${spec.id}-${i}`, x: x0, y, scale: base * depthK * (look.build === "child" ? 1 : .96 + .08 * r(17)), look, actions, facing, row });
  }
  // Draw back rows first, then by row order within a row.
  return out.sort((a, b) => b.row - a.row);
}
