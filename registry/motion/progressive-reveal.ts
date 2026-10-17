import type { MotionCue, MotionOffset, MotionTimeline, RationalFps } from "./types";
import { materializePreset } from "./presets";

export interface RevealStep {
  id: string;
  at: MotionOffset;
  durationFrames?: number;
  effect?: "fade" | "rise";
  distance?: number;
  /** Begin reducing emphasis at this frame/cue; the item stays visible. */
  focusUntil?: MotionOffset;
  subduedOpacity?: number;
}

export interface RevealTimelineOptions {
  id: string;
  fps: RationalFps;
  durationFrames: number;
  steps: readonly RevealStep[];
  cues?: readonly MotionCue[];
}

/** Compile staged explanation beats to ordinary MG1 tracks and existing reveal presets. */
export function createRevealTimeline({ id, fps, durationFrames, steps, cues = [] }: RevealTimelineOptions): MotionTimeline {
  if (!id.trim() || !Number.isInteger(durationFrames) || durationFrames < 2 ||
      !Number.isInteger(fps.num) || !Number.isInteger(fps.den) || fps.num <= 0 || fps.den <= 0) {
    throw new Error("Cannot create progressive reveal. Supply an ID, at least two composition frames, and positive integer rational FPS.");
  }
  const cueFrames = new Map<string, number>();
  for (const cue of cues) {
    if (!cue.id.trim() || cueFrames.has(cue.id) || !Number.isInteger(cue.frame) || cue.frame < 0 || cue.frame >= durationFrames) {
      throw new Error(`Reveal cue "${cue.id}" is invalid. Use unique IDs and integer frames inside the composition.`);
    }
    cueFrames.set(cue.id, cue.frame);
  }
  const resolveFrame = (anchor: MotionOffset): number => {
    const frame = typeof anchor === "number" ? anchor : cueFrames.get(anchor.cue);
    if (frame === undefined || !Number.isInteger(frame) || frame < 0 || frame >= durationFrames) {
      throw new Error(`Reveal anchor ${JSON.stringify(anchor)} cannot resolve. Supply an in-range integer frame or a declared cue.`);
    }
    return frame;
  };
  const nodes: MotionTimeline["nodes"] = [];
  const ids = new Set<string>();
  for (const step of steps) {
    if (!step.id.trim() || ids.has(step.id)) throw new Error(`Reveal step "${step.id}" needs a unique non-empty ID.`);
    ids.add(step.id);
    const start = resolveFrame(step.at);
    const duration = step.durationFrames ?? 24;
    const subdued = step.subduedOpacity ?? 0.35;
    if (!Number.isInteger(duration) || duration < 2 || start + duration > durationFrames ||
        !Number.isFinite(subdued) || subdued < 0 || subdued > 1 ||
        (step.distance !== undefined && (!Number.isFinite(step.distance) || step.distance < 0 || step.distance > 400))) {
      throw new Error(`Reveal step "${step.id}" needs a duration of at least two frames that fits the composition, opacity from 0 to 1, and travel from 0 to 400 pixels.`);
    }
    const reveal = materializePreset({
      preset: step.effect === "fade" ? "fade-reveal" : "rise-reveal", version: 1,
      targetId: step.id, startFrame: start, timing: duration - 1,
      ...(step.effect === "fade" ? {} : { params: { distance: step.distance ?? 32 } }),
    });
    if (step.focusUntil !== undefined) {
      const dimStart = resolveFrame(step.focusUntil);
      if (dimStart < start + duration - 1 || dimStart + duration > durationFrames) {
        throw new Error(`Reveal step "${step.id}" cannot reduce emphasis yet. Place focusUntil after its entrance and leave ${duration} frames for dimming.`);
      }
      const opacity = reveal.nodes.find((node) => node.kind === "track" && node.track.property === "opacity");
      if (opacity?.kind === "track") {
        const localDimStart = dimStart - start;
        if (localDimStart > duration - 1) opacity.track.keyframes.push({ frame: localDimStart, value: 1 });
        opacity.track.keyframes.push({ frame: localDimStart + duration - 1, value: subdued, easing: "ease-in-out-cubic" });
      }
    }
    nodes.push(...reveal.nodes, {
      kind: "track", id: `${step.id}-reveal-progress`, offset: start,
      track: {
        id: `${step.id}-reveal-progress`, targetId: step.id, property: "revealProgress", valueType: "number",
        keyframes: [{ frame: 0, value: 0 }, { frame: duration - 1, value: 1 }],
      },
    });
  }
  return { schemaVersion: 1, id, fps: { ...fps }, durationFrames, nodes, cues: cues.map((cue) => ({ ...cue })) };
}
