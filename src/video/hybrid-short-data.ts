/** Phase 2 hybrid short: one source of truth for shot timing, narration timing, audio lanes,
 * sound effects and the visual events they must line up with. Used by the Storybook story and
 * by the local audio builder (which conforms synthesized speech to NARRATION's word slots).
 * Data only: no runtime imports, so Node can load it with type stripping.
 */
import type { AudioCueSheet } from "../../registry/video/audio-visual-cue";

export const HYBRID_FPS = { num: 30, den: 1 };
export const HYBRID_FRAMES = 390;
export const HYBRID_SIZE = { width: 1080, height: 1920 };
/** Footage → 2D route graphic → 3D phone. */
export const HYBRID_SHOTS = [
  { id: "scan", kind: "footage", frames: 165 },
  { id: "route", kind: "graphic", frames: 120 },
  { id: "notify", kind: "3d", frames: 105 },
] as const;
/** Visual events in film frames; the choreography reads these, the cue sheet checks them. */
export const HYBRID_EVENTS = {
  freeze: 45, calloutsIn: 63, wipe: 165, truckDepart: 229, dissolve: 285, notify: 305,
} as const;

/** Authored narration timing (seconds): word, start, end. The audio builder fits speech into these slots. */
export const HYBRID_NARRATION: readonly (readonly [string, number, number])[] = [
  ["This", 0.2, 0.38], ["parcel", 0.38, 0.76], ["is", 0.76, 0.88], ["about", 0.88, 1.1], ["to", 1.1, 1.2], ["be", 1.2, 1.3], ["scanned.", 1.3, 1.62],
  ["Its", 1.95, 2.1], ["label", 2.1, 2.5], ["says", 2.5, 2.8], ["route", 2.85, 3.2], ["seven,", 3.2, 3.65], ["stop", 3.75, 4.05], ["three.", 4.05, 4.45],
  ["Orders", 5.7, 6.05], ["are", 6.05, 6.18], ["grouped", 6.18, 6.6], ["by", 6.6, 6.75], ["area,", 6.75, 7.25],
  ["then", 7.45, 7.65], ["loaded", 7.65, 8.05], ["in", 8.05, 8.15], ["stop", 8.15, 8.5], ["order.", 8.5, 9.0],
  ["So", 9.75, 9.95], ["you", 9.95, 10.1], ["are", 10.1, 10.22], ["told:", 10.22, 10.65], ["stop", 10.8, 11.15], ["three", 11.15, 11.5], ["of", 11.5, 11.62], ["twelve.", 11.62, 12.2],
];

/** Asset refs are file names the audio builder writes next to each other. */
export const HYBRID_SHEET: AudioCueSheet = {
  id: "hybrid-short", fps: HYBRID_FPS, durationFrames: HYBRID_FRAMES,
  lanes: [
    { id: "voice", kind: "narration", startFrame: 0, alignmentId: "narration", assetRef: "voice.wav", required: true },
    { id: "music", kind: "music", startFrame: 0, assetRef: "music.wav", gainDb: -18, beatGrid: { bpm: 120, beatsPerBar: 4, count: 26 } },
    { id: "sfx", kind: "sfx", startFrame: 0, gainDb: -4 },
  ],
  sounds: [
    { id: "ding", laneId: "sfx", frame: HYBRID_EVENTS.freeze, assetRef: "ding.wav" },
    { id: "whoosh", laneId: "sfx", frame: HYBRID_EVENTS.wipe - 3, assetRef: "whoosh.wav", gainDb: -6 },
  ],
  links: [
    { id: "freeze-after-scanned", visualEventId: "freeze", anchor: { kind: "word", laneId: "voice", text: "scanned", edge: "end" }, offsetFrames: -3, toleranceFrames: 2 },
    { id: "freeze-on-ding", visualEventId: "freeze", anchor: { kind: "sound", eventId: "ding" }, toleranceFrames: 0, strict: true },
    { id: "callouts-on-label", visualEventId: "callouts-in", anchor: { kind: "word", laneId: "voice", text: "label" }, toleranceFrames: 1 },
    { id: "wipe-on-beat", visualEventId: "wipe", anchor: { kind: "beat", laneId: "music", beat: 11 }, toleranceFrames: 0 },
    { id: "truck-on-loaded", visualEventId: "truck-depart", anchor: { kind: "word", laneId: "voice", text: "loaded" }, toleranceFrames: 1 },
    { id: "dissolve-on-beat", visualEventId: "dissolve", anchor: { kind: "beat", laneId: "music", beat: 19 }, toleranceFrames: 0 },
    { id: "notify-on-told", visualEventId: "notify", anchor: { kind: "word", laneId: "voice", text: "told" }, toleranceFrames: 2 },
  ],
};
