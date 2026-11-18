/**
 * Physical paper — sound (registry item `paper-sound`).
 *
 * Paper motion makes its own sound cues from what the paper does, not from a timeline drawn by hand:
 * - a page turn sounds when the leaf leaves its stack, with a take chosen per leaf so a riffle never repeats one file;
 * - a landing sounds on the frame the simulation finds the leaf striking the stack, as loud as it struck;
 * - two leaves brushing in the air sound softly where they touch;
 * - a tear picks a slow or a fast rip from how fast it runs, a fold sounds as its crease is pressed, a peel and a roll
 *   sound while they move.
 *
 * The default sounds are real recordings in the catalog (CC0, verified at their sources). Every id can be swapped.
 */

import type { PaperBookBake } from "./paper-book";
import { paperBendAt, paperTearAt } from "./paper-sheet";
import type { PaperSheetSpec } from "./paper-sheet";

export interface PaperSoundCue {
  /** The frame the sound lines up with. */
  frame: number;
  /** Catalog sound id. */
  sound: string;
  gainDb: number;
  /** `peak`: the sound's loudest moment lands on the frame (a swish, a slap). `start`: it begins there (a long rip). */
  align: "peak" | "start";
  /** What made the sound, for review. */
  cause: string;
}

export interface PaperSoundSet {
  turn: readonly string[];
  land: string;
  riffle: string;
  tearSlow: string;
  tearFast: string;
  fold: string;
  peel: string;
  roll: string;
  slide: string;
}

/** Recorded CC0 paper sounds in the catalog (`assets/sound/catalog.json`). */
export const PAPER_SOUNDS: PaperSoundSet = {
  turn: ["paper-page-turn-1", "paper-page-turn-2", "paper-page-turn-3"],
  land: "paper-page-land",
  riffle: "paper-riffle",
  tearSlow: "paper-tear-slow",
  tearFast: "paper-tear-fast",
  fold: "paper-fold",
  peel: "paper-peel",
  roll: "paper-unroll",
  slide: "paper-sheet-slide",
};

export interface PaperSoundOptions {
  sounds?: Partial<PaperSoundSet>;
  /** Added to every cue. @default 0 */
  gainDb?: number;
  seed?: number;
}

const clampDb = (db: number) => Math.max(-30, Math.min(0, db));
const pick = <T>(pool: readonly T[], seed: number, i: number) => pool[Math.abs(Math.imul(seed + 1, 2654435761) ^ Math.imul(i + 7, 40503)) % pool.length];

/** Cues for a baked book: turns, landings, brushes and riffles. */
export function paperBookSoundCues(bake: PaperBookBake, options: PaperSoundOptions = {}): PaperSoundCue[] {
  const sounds = { ...PAPER_SOUNDS, ...options.sounds };
  const seed = options.seed ?? 3;
  const gain = options.gainDb ?? 0;
  const cues: PaperSoundCue[] = [];
  const lifts = bake.events.filter((e) => e.kind === "lift");
  // Three or more leaves leaving within a second is a riffle: one fluttering run, the single turns underneath.
  const fps = bake.spec.fps ?? 30;
  const riffleStart = lifts.find((e, i) => i + 2 < lifts.length && lifts[i + 2].frame - e.frame <= fps);
  if (riffleStart) cues.push({ frame: riffleStart.frame, sound: sounds.riffle, gainDb: clampDb(-6 + gain), align: "start", cause: "riffle" });
  for (const event of bake.events) {
    if (event.kind === "lift") {
      // The swish is loudest as the page sweeps through the air, a few frames after it leaves the stack.
      const release = bake.events.find((e) => e.kind === "release" && e.leaf === event.leaf && e.frame >= event.frame);
      const land = bake.events.find((e) => e.kind === "land" && e.leaf === event.leaf && e.frame >= event.frame);
      const sweep = land ? Math.round((event.frame + land.frame) / 2) : release ? release.frame : event.frame + Math.round(fps / 3);
      cues.push({ frame: sweep, sound: pick(sounds.turn, seed, event.leaf), gainDb: clampDb((riffleStart ? -14 : -8) + gain), align: "peak", cause: `turn leaf ${event.leaf}` });
    } else if (event.kind === "land") {
      cues.push({ frame: event.frame, sound: sounds.land, gainDb: clampDb(-18 + 14 * event.strength + gain), align: "peak", cause: `land leaf ${event.leaf}` });
    } else if (event.kind === "touch" && event.strength > 0.08) {
      cues.push({ frame: event.frame, sound: sounds.land, gainDb: clampDb(-24 + 12 * event.strength + gain), align: "peak", cause: `brush leaf ${event.leaf}` });
    }
  }
  return cues.sort((a, b) => a.frame - b.frame);
}

/** Spans of frames where a value keeps changing; pauses shorter than `bridge` frames (an eased key) join the spans. */
function movingSpans(value: (frame: number) => number, frames: number, epsilon: number, bridge = 4): { start: number; end: number; from: number; to: number }[] {
  const spans: { start: number; end: number; from: number; to: number }[] = [];
  let open: { start: number; from: number } | null = null;
  let prev = value(0);
  for (let f = 1; f < frames; f += 1) {
    const v = value(f);
    const moving = Math.abs(v - prev) > epsilon;
    if (moving && !open) open = { start: f - 1, from: prev };
    if (!moving && open) {
      spans.push({ start: open.start, end: f - 1, from: open.from, to: prev });
      open = null;
    }
    prev = v;
  }
  if (open) spans.push({ start: open.start, end: frames - 1, from: open.from, to: prev });
  const joined: typeof spans = [];
  for (const span of spans) {
    const last = joined[joined.length - 1];
    if (last && span.start - last.end < bridge) {
      last.end = span.end;
      last.to = span.to;
    } else joined.push({ ...span });
  }
  return joined;
}

/** One sound started a few times at once is one louder sound (no phasing from stacked copies). */
function mergeCues(cues: PaperSoundCue[]): PaperSoundCue[] {
  const out: (PaperSoundCue & { count: number })[] = [];
  for (const cue of cues.sort((a, b) => a.frame - b.frame)) {
    const same = out.find((c) => c.sound === cue.sound && Math.abs(c.frame - cue.frame) < 4);
    if (same) {
      same.count += 1;
      same.cause += `, ${cue.cause}`;
    } else out.push({ ...cue, count: 1 });
  }
  return out.map(({ count, ...cue }) => ({ ...cue, gainDb: clampDb(cue.gainDb + 10 * Math.log10(count) * 0.5) }));
}

/**
 * Cues for a paper sheet over `frames` frames: tears (slow or fast by how long the tear runs), folds (the crease pressed
 * as the fold closes), peels and rolls (while they move).
 */
export function paperSheetSoundCues(spec: Pick<PaperSheetSpec, "bends" | "tears">, frames: number, fps = 30, options: PaperSoundOptions = {}): PaperSoundCue[] {
  const sounds = { ...PAPER_SOUNDS, ...options.sounds };
  const gain = options.gainDb ?? 0;
  const cues: PaperSoundCue[] = [];
  for (const tear of spec.tears ?? []) {
    for (const span of movingSpans((f) => paperTearAt(tear, f), frames, 1e-4)) {
      const seconds = (span.end - span.start) / fps;
      const slow = seconds >= 1.2;
      cues.push(slow
        ? { frame: span.start, sound: sounds.tearSlow, gainDb: clampDb(-4 + gain), align: "start", cause: `tear ${tear.id} (slow)` }
        : { frame: Math.round((span.start + span.end) / 2), sound: sounds.tearFast, gainDb: clampDb(-6 + gain), align: "peak", cause: `tear ${tear.id} (fast)` });
    }
  }
  for (const bend of spec.bends ?? []) {
    // A flap lifted along a running tear is part of the tear's sound.
    if (bend.follow !== undefined) continue;
    if (bend.kind === "fold" || bend.kind === "bend") {
      for (const span of movingSpans((f) => paperBendAt(bend, f).angle, frames, 0.05)) {
        if (Math.abs(span.to) < Math.abs(span.from)) continue;
        cues.push({ frame: span.start, sound: sounds.fold, gainDb: clampDb((bend.kind === "fold" ? -6 : -12) + gain), align: "start", cause: `${bend.kind} ${bend.id}` });
      }
      // A crease that travels, or a sheet slid over an edge, slides.
      for (const span of movingSpans((f) => paperBendAt(bend, f).offset, frames, 0.05)) {
        cues.push({ frame: span.start, sound: sounds.slide, gainDb: clampDb(-8 + gain), align: "start", cause: `slide ${bend.id}` });
      }
    } else if (bend.kind === "peel") {
      for (const span of movingSpans((f) => paperBendAt(bend, f).offset, frames, 0.05)) {
        cues.push({ frame: span.start, sound: sounds.peel, gainDb: clampDb(-6 + gain), align: "start", cause: `peel ${bend.id}` });
      }
    } else if (bend.kind === "roll") {
      for (const span of movingSpans((f) => paperBendAt(bend, f).offset, frames, 0.05)) {
        cues.push({ frame: span.start, sound: sounds.roll, gainDb: clampDb(-6 + gain), align: "start", cause: `roll ${bend.id}` });
      }
    }
  }
  return mergeCues(cues);
}
