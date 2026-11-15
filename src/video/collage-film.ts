import type { FilmDocument } from "../../registry/video/film-document";
import type { CollageSceneSpec } from "../../registry/video/collage/collage-scene";
import type { CollageShot } from "./collage-standard-time";
import { STANDARD_TIME_SHOTS } from "./collage-standard-time";

/** Optional whole-film overrides the Storybook player exposes. */
export interface CollageFilmTweaks { cadence?: 1 | 2 | 3 | 4; boil?: number; grain?: number }

export function tweakScene(spec: CollageSceneSpec, tweaks: CollageFilmTweaks = {}): CollageSceneSpec {
  return { ...spec, cadence: tweaks.cadence ?? spec.cadence, boil: tweaks.boil ?? spec.boil, grain: tweaks.grain ?? spec.grain };
}

/** Shots that open with a paper tear out of the previous shot, and the tear's length in frames. */
export const TEAR_INTO: Readonly<Record<string, number>> = { "two-noons": 22, payoff: 22 };

/**
 * The FD1 film. Each shot is a generic `collage-scene` slot carrying its own JSON scene for each output;
 * a `collage-tear` slot rips the previous shot's last frame open over the start of the next. The incoming
 * shot then resumes from where the tear left it, so no frame of the new shot repeats.
 */
export function collageFilm(shots: readonly CollageShot[] = STANDARD_TIME_SHOTS, tweaks: CollageFilmTweaks = {},
  options: { id?: string; tears?: Readonly<Record<string, number>> } = {}): FilmDocument {
  const tears = options.tears ?? TEAR_INTO;
  const built = shots.map(shot => ({ shot, landscape: tweakScene(shot.build("landscape"), tweaks), portrait: tweakScene(shot.build("portrait"), tweaks) }));
  const scenes: unknown[] = [];
  built.forEach(({ shot, landscape, portrait }, i) => {
    const tear = i > 0 ? tears[shot.id] ?? 0 : 0;
    if (tear) {
      const prev = built[i - 1];
      scenes.push({
        id: shot.id + "-tear", recipeId: "slot", durationFrames: tear, transition: { kind: "cut" },
        content: { slot: "collage-tear", label: "Paper tear into " + shot.title, props: {
          from: { landscape: prev.landscape, portrait: prev.portrait }, to: { landscape, portrait }, toStartFrame: 0,
        } },
      });
    }
    scenes.push({
      id: shot.id, recipeId: "slot", durationFrames: landscape.durationFrames - tear,
      ...(i ? { transition: { kind: "cut" } } : {}),
      content: { slot: "collage-scene", label: shot.title, props: { scenes: { landscape, portrait }, startFrame: tear } },
    });
  });
  return {
    schemaVersion: 1,
    id: options.id ?? "editorial-collage-standard-time",
    fps: { num: 30, den: 1 },
    drift: 0,
    outputs: [{ id: "landscape", width: 1920, height: 1080 }, { id: "portrait", width: 1080, height: 1920 }],
    scenes,
  } as unknown as FilmDocument;
}

/** Start frame of every shot in the assembled film (tears belong to the shot they open). */
export function shotStarts(shots: readonly CollageShot[] = STANDARD_TIME_SHOTS): number[] {
  const starts: number[] = [];
  let at = 0;
  for (const shot of shots) { starts.push(at); at += shot.build("landscape").durationFrames; }
  return starts;
}
