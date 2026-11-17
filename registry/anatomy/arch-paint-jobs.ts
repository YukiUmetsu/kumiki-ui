/** ARCH1's render jobs (`plate`: a library entry; `study`: a surface or imperfection study), run by `arch-paint-worker.ts` (see `foundation-render.ts`). */
import type { RenderOutput, RenderRunners } from "./foundation-render";
import { findLibraryEntry, imperfectionStudy, surfaceStudy } from "./arch-library";
import { paintArchScene } from "./arch-paint";
import type { MoodId, PaintOptions } from "./arch-paint";
import type { SurfaceSpec } from "./arch-surface";

export interface PlateJob extends PaintOptions { id: string; seed?: number }
export interface StudyJob extends PaintOptions { study: "surface" | "imperfection"; surface?: SurfaceSpec; form?: "wall" | "roof" | "ground"; lean?: number; sag?: number; studyMood?: MoodId }

const out = (r: ReturnType<typeof paintArchScene>): RenderOutput => ({ width: r.width, height: r.height, rgba: r.rgba, ms: r.ms, meta: r.meta });

export const ARCH_RUNNERS: RenderRunners = {
  plate: ((o: PlateJob): RenderOutput => {
    const e = findLibraryEntry(o.id);
    if (!e) throw new Error(`Unknown library entry ${o.id}`);
    return out(paintArchScene(e.build(o.seed), o));
  }) as never,
  study: ((o: StudyJob): RenderOutput => {
    const scene = o.study === "surface" ? surfaceStudy(o.surface ?? { kind: "ashlar" }, o.form ?? "wall", o.studyMood ?? "morning") : imperfectionStudy(o.lean ?? 0.02, o.sag ?? 0.2, o.studyMood ?? "golden");
    return out(paintArchScene(scene, o));
  }) as never,
};
