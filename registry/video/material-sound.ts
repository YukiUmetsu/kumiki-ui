/**
 * The sounds of material transitions (registry item `material-transitions`): recorded CC0 one-shots from the sound
 * catalog, placed where the material makes them. This file imports nothing, so scripts can read it directly.
 *
 * - A struck pane breaks on the transition's first frame, and its pieces tinkle as they land, about 0.6 s later.
 * - A match flares as the paper catches, then the paper crackles.
 * - Breath frosts the glass. A drop lands on the water. Ink drops onto the paper.
 * - Paint and melting wax slop and stretch.
 * - A page curls past with a turn's swish, peaking as the flap passes fastest. A page rips as the tear runs.
 * - Reeded glass passing the lens makes no sound of its own; it travels past like a pass-by, so the film's whoosh plays.
 */

export interface MaterialSoundCue {
  /** A sound in `assets/sound/catalog.json`, by id. */
  sound: string;
  /** When, as a fraction of the transition: 0 is its first frame, 1 its last. */
  at: number;
  /** What lands there: the sound's start (a strike, a drop, the first rip) or its peak (a swish at its loudest). */
  align: "start" | "peak";
  /** Level against the film's accent level, dB. The catalog's one-shots peak at −6 dBFS, so quiet recordings get more. */
  gainDb: number;
}

export const MATERIAL_SOUNDS: Readonly<Record<string, readonly MaterialSoundCue[]>> = {
  bleed: [{ sound: "drop-water-small", at: 0, align: "start", gainDb: -2 }],
  burn: [
    { sound: "match-strike-flare", at: 0, align: "start", gainDb: 4 },
    { sound: "fire-paper-crackle", at: 0.12, align: "start", gainDb: 4 },
  ],
  paint: [{ sound: "liquid-syrup-pour", at: 0.02, align: "start", gainDb: 2 }],
  frost: [{ sound: "breath-exhale-soft", at: 0, align: "start", gainDb: -2 }],
  refract: [],
  shatter: [
    { sound: "glass-shatter-pane", at: 0, align: "start", gainDb: 0 },
    { sound: "glass-debris-tinkle", at: 0.42, align: "start", gainDb: -10 },
  ],
  peel: [{ sound: "paper-page-turn-1", at: 0.45, align: "peak", gainDb: 0 }],
  tear: [{ sound: "paper-tear-fast", at: 0.1, align: "start", gainDb: -2 }],
  ripple: [{ sound: "drop-water-full", at: 0, align: "start", gainDb: 0 }],
  melt: [{ sound: "liquid-syrup-ooze", at: 0.15, align: "start", gainDb: 0 }],
};

/** Every catalog sound a material transition can use. */
export const MATERIAL_SOUND_IDS: readonly string[] = [...new Set(Object.values(MATERIAL_SOUNDS).flatMap((cues) => cues.map((cue) => cue.sound)))];
