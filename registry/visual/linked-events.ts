/** Semantic event links over MotionDirector's EXISTING dependency scheduler.
 * MG1/MD1 decide event placement; this module merely derives named windows.
 * No parallel timer, hardcoded frame assumptions, or new animation engine.
 */
import type { CameraShotSpec } from "../motion/cinematic-camera-types";
import type { CompiledMotionDirector, DirectorScheduleEntry, DirectorTime } from "../motion/director-types";

export function relativeToEvent(
  id: string, edge: "start" | "end" = "start", offsetFrames = 0,
): DirectorTime {
  if (!id.trim() || !Number.isSafeInteger(offsetFrames)) throw new Error("Semantic event needs an ID and integer frame offset.");
  return { ref: id, edge, offsetFrames };
}
export interface SemanticEventBoundary {
  id: string;
  edge?: "start" | "end";
  offsetFrames?: number;
}
export interface SemanticEventWindow {
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  fromId: string;
  untilId: string;
}
export function deriveEventWindow(
  director: Pick<CompiledMotionDirector, "schedule" | "source">,
  options: { from: SemanticEventBoundary; until: SemanticEventBoundary; leadFrames?: number; tailFrames?: number },
): SemanticEventWindow {
  const placements = new Map<string, DirectorScheduleEntry>();
  for (const entry of director.schedule) {
    if (placements.has(entry.id)) throw new Error(`Ambiguous duplicate MD1 event "${entry.id}".`);
    placements.set(entry.id, entry);
  }
  const get = (boundary: SemanticEventBoundary) => {
    const found = placements.get(boundary.id);
    if (!found) throw new Error(`Missing MD1 event "${boundary.id}". Declare it as a named cue, hold, shot or group.`);
    const offset = boundary.offsetFrames ?? 0;
    if (!Number.isSafeInteger(offset)) throw new Error(`Invalid offset for "${boundary.id}".`);
    return (boundary.edge === "end" ? found.endFrame : found.startFrame) + offset;
  };
  const lead = options.leadFrames ?? 0, tail = options.tailFrames ?? 0;
  if (![lead, tail].every(x => Number.isSafeInteger(x) && x >= 0))
    throw new Error("Event window lead/tail must be nonnegative integer frames.");
  const startFrame = get(options.from) - lead, endFrame = get(options.until) + tail;
  if (startFrame < 0 || endFrame > director.source.durationFrames || endFrame <= startFrame)
    throw new Error(`Invalid event window [${startFrame},${endFrame}) in MG1 duration ${director.source.durationFrames}.`);
  return { startFrame, endFrame, durationFrames: endFrame - startFrame,
    fromId: options.from.id, untilId: options.until.id };
}

/** Bind a CC1 shot duration and start to semantic MD1 events after compilation.
 * The returned specification still compiles through standard CC1. If the
 * referenced events move, rederive/recompile the shot rather than hand-editing
 * its frame constants.
 */
export function cameraShotBetweenEvents(
  shot: Omit<CameraShotSpec, "at" | "durationFrames">,
  window: SemanticEventWindow,
): CameraShotSpec {
  return { ...shot, at: window.startFrame, durationFrames: window.durationFrames };
}
