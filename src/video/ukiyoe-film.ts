import type { FilmDocument } from "../../registry/video/film-document";
import type { UkiyoeFilmTweaks, UkiyoeShot } from "./ukiyoe-night-ferry";
import { NIGHT_FERRY_SHOTS } from "./ukiyoe-night-ferry";

/** Shots that open with a kasumi (mist-band) transition out of the previous shot, and its length in frames. */
export const KASUMI_INTO: Readonly<Record<string, number>> = { town: 30, boarding: 24, fireworks: 36, arrival: 28 };

/**
 * The FD1 film. Each shot is a generic `ukiyoe-scene` slot carrying its JSON scene for each output; a `ukiyoe-kasumi`
 * slot sweeps gold mist bands from the previous shot's last frame into the next. The incoming shot then resumes from
 * where the transition left it, so no frame repeats.
 */
export function ukiyoeFilm(shots: readonly UkiyoeShot[] = NIGHT_FERRY_SHOTS, tweaks: UkiyoeFilmTweaks = {}): FilmDocument {
  const built = shots.map(shot => ({ shot, landscape: shot.build("landscape", tweaks), portrait: shot.build("portrait", tweaks) }));
  const scenes: unknown[] = [];
  built.forEach(({ shot, landscape, portrait }, i) => {
    const mist = i > 0 ? KASUMI_INTO[shot.id] ?? 0 : 0;
    if (mist) {
      const prev = built[i - 1];
      scenes.push({
        id: shot.id + "-kasumi", recipeId: "slot", durationFrames: mist, transition: { kind: "cut" },
        content: { slot: "ukiyoe-kasumi", label: "Mist bands into " + shot.title, props: {
          from: { landscape: prev.landscape, portrait: prev.portrait }, to: { landscape, portrait }, toStartFrame: 0,
        } },
      });
    }
    scenes.push({
      id: shot.id, recipeId: "slot", durationFrames: landscape.durationFrames - mist,
      ...(i ? { transition: { kind: "cut" } } : {}),
      content: { slot: "ukiyoe-scene", label: shot.title, props: { scenes: { landscape, portrait }, startFrame: mist } },
    });
  });
  return {
    schemaVersion: 1,
    id: "ukiyoe-night-ferry",
    fps: { num: 30, den: 1 },
    drift: 0,
    outputs: [{ id: "landscape", width: 1920, height: 1080 }, { id: "portrait", width: 1080, height: 1920 }],
    scenes,
  } as unknown as FilmDocument;
}

/** Start frame of every shot in the assembled film (a kasumi transition belongs to the shot it opens). */
export function ukiyoeShotStarts(shots: readonly UkiyoeShot[] = NIGHT_FERRY_SHOTS): number[] {
  const starts: number[] = [];
  let at = 0;
  for (const shot of shots) { starts.push(at); at += shot.build("landscape").durationFrames; }
  return starts;
}
