/** Split edits (J- and L-cuts) for film scenes. Each scene can have its own sound, a recorded ambience that plays under it and follows
 * it when the film is re-timed. By default a scene's sound starts and stops with its picture, crossfading over a few frames at a cut and
 * across the whole of a dissolve. A transition can split the edit:
 *
 * - **J-cut** (`audioLead`): the incoming scene's sound starts that many frames before its picture, so the viewer hears where they are
 *   going before they see it.
 * - **L-cut** (`audioTail`): the outgoing scene's sound carries on that many frames past the cut, so the last place lingers into the
 *   new one.
 *
 * Practice (doc 32, §7): split edits keep momentum and feeling across a cut. There is no fixed length; practitioners describe a few
 * frames for a quick line and half a second to a second for slower material, adjusted by ear. So the checks below warn, and only
 * refuse what cannot play.
 */

export interface FilmSceneSound {
  /** A catalog sound with the `loop` tag, such as `bed-river-fast`. */
  sound: string;
  gainDb?: number;
  /** Muffles the sound, as if heard through water or a wall. */
  lowpassHz?: number;
  /** Plays the sound backwards. */
  reverse?: boolean;
}
export interface FilmSplit {
  /** J-cut: the incoming scene's sound starts this many frames before its picture. */
  audioLead?: number;
  /** L-cut: the outgoing scene's sound carries on this many frames past the cut. */
  audioTail?: number;
}
/** A scene's sound as the film plays it: where it starts and ends in film frames, and how long it fades in and out. */
export interface CompiledSceneSound extends FilmSceneSound {
  sceneId: string;
  startFrame: number;
  endFrame: number;
  fadeInFrames: number;
  fadeOutFrames: number;
  /** Set when this sound starts before its picture (a J-cut) or carries past it (an L-cut), in frames. */
  lead?: number;
  tail?: number;
}
export interface SplitProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

/** Frames each side of a hard cut that two sounds overlap, so neither clicks off: a four-frame crossfade centred on the cut. */
export const CUT_CROSSFADE = 2;
/** Shorter than this, a split is lost in the cut's own crossfade. */
export const SPLIT_MIN_FRAMES = 4;
/** Longer than this, a split stops reading as a cut and becomes a sound bridge. */
export const SPLIT_MAX_SECONDS = 3;

interface SplitScene { id: string; durationFrames: number; sound?: FilmSceneSound; transition?: FilmSplit & { durationFrames?: number } }
interface CutWindow { toShotId: string; fromShotId: string; startFrame: number; endFrame: number }

/** Where each scene's sound plays. `transitions` are the compiled cut's, whose windows say when each picture change starts and ends. */
export function compileSceneSounds(scenes: readonly SplitScene[], transitions: readonly CutWindow[], fps: number, durationFrames: number): CompiledSceneSound[] {
  // A split's fade: half the split, so the sound is at full level for the half nearest the cut, between four frames and 0.75 s.
  const splitFade = (frames: number) => Math.round(Math.min(fps * .75, Math.max(SPLIT_MIN_FRAMES, frames / 2)));
  return scenes.flatMap((scene, index) => {
    if (!scene.sound) return [];
    const into = transitions.find(item => item.toShotId === scene.id), out = transitions.find(item => item.fromShotId === scene.id);
    const lead = into ? scene.transition?.audioLead : undefined, tail = out ? scenes[index + 1]?.transition?.audioTail : undefined;
    // In: at the film's start; or `lead` frames before the incoming picture; or under a dissolve; or a few frames before a hard cut.
    const inWindow = into ? into.endFrame - into.startFrame : 0, outWindow = out ? out.endFrame - out.startFrame : 0;
    const startFrame = !into ? 0 : Math.max(0, into.startFrame - (lead ?? (inWindow ? 0 : CUT_CROSSFADE)));
    const fadeInFrames = !into ? 3 : lead ? splitFade(lead) : inWindow || CUT_CROSSFADE * 2;
    const endFrame = !out ? durationFrames : Math.min(durationFrames, out.endFrame + (tail ?? (outWindow ? 0 : CUT_CROSSFADE)));
    const fadeOutFrames = !out ? Math.round(Math.min(fps, (endFrame - startFrame) / 3)) : tail ? splitFade(tail) : outWindow || CUT_CROSSFADE * 2;
    return [{ ...scene.sound, sceneId: scene.id, startFrame, endFrame, fadeInFrames, fadeOutFrames, ...lead ? { lead } : {}, ...tail ? { tail } : {} }];
  });
}

/** The craft and sense checks for scene sounds and split edits. `path(index)` is a scene's JSON path. */
export function inspectSplitEdits(scenes: readonly SplitScene[], fps: number, path: (index: number) => string): SplitProblem[] {
  const problems: SplitProblem[] = [], report = (severity: SplitProblem["severity"], code: string, at: string, message: string, hint?: string) => problems.push({ severity, code, path: at, message, hint });
  scenes.forEach((scene, index) => {
    const at = path(index);
    if (scene.sound && !/^[a-z0-9-]{1,80}$/.test(scene.sound.sound ?? "")) report("error", "scene-sound", at + "/sound/sound", "A scene's sound needs a catalog sound ID.");
    if (scene.sound?.lowpassHz !== undefined && !(scene.sound.lowpassHz >= 200 && scene.sound.lowpassHz <= 20000)) report("error", "scene-sound", at + "/sound/lowpassHz", "A low-pass runs from 200 to 20000 Hz.");
    if (scene.sound?.gainDb !== undefined && !(scene.sound.gainDb >= -60 && scene.sound.gainDb <= 12)) report("error", "scene-sound", at + "/sound/gainDb", "Gain runs from -60 to 12 dB.");
    const split = scene.transition, previous = scenes[index - 1];
    if (!split || !previous) return;
    for (const [key, frames] of [["audioLead", split.audioLead], ["audioTail", split.audioTail]] as const) {
      if (frames === undefined) continue;
      const where = `${at}/transition/${key}`, j = key === "audioLead";
      if (!(Number.isSafeInteger(frames) && frames >= 0)) { report("error", "split-frames", where, "A split is a whole number of frames, 0 or more."); continue; }
      if (!frames) continue;
      const owner = j ? scene : previous;
      if (!owner.sound) report("error", "split-no-sound", where, j ? `A J-cut brings this scene's sound in early, and scene "${scene.id}" has no sound.` : `An L-cut carries the last scene's sound over the cut, and scene "${previous.id}" has no sound.`,
        `Give scene "${owner.id}" a "sound": { "sound": "<catalog loop>" }.`);
      // A lead cannot start before the scene it plays under, and a tail cannot outlast the scene it plays over.
      const room = j ? previous.durationFrames - (previous.transition?.durationFrames ?? 0) : scene.durationFrames;
      if (frames >= room) report("error", "split-overrun", where, j ? `The lead of ${frames} frames starts before scene "${previous.id}" does.` : `The tail of ${frames} frames outlasts scene "${scene.id}".`, "Shorten the split.");
      else if (frames < SPLIT_MIN_FRAMES) report("warning", "split-short", where, `A split of ${frames} frames is lost in the cut's own crossfade.`, `Use ${SPLIT_MIN_FRAMES} frames or more, or none.`);
      else if (frames > SPLIT_MAX_SECONDS * fps) report("warning", "split-long", where, `A split of ${(frames / fps).toFixed(1)} s stops reading as a cut and becomes a sound bridge.`, "Practitioners use a few frames to about a second; adjust by ear.");
    }
  });
  return problems;
}
