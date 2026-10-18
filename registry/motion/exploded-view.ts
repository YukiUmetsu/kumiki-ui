import type { CameraPoint3D } from "./camera-rig-3d";
import type { EasingSpec, EvaluationResult, FrameRange, Keyframe, MotionTimeline, RationalFps } from "./types";
import { evaluateTimeline, outputKey } from "./timeline";

export interface AssemblyPart3D {
  id: string;
  parentId?: string;
  label?: string;
  labelSide?: "left" | "right";
  position?: CameraPoint3D;
  /** XYZ Euler angles in degrees; transforms are local to the parent part. */
  rotation?: CameraPoint3D;
  scale?: CameraPoint3D;
  offset: CameraPoint3D;
  offsetSpace?: "parent" | "local" | "world";
  rotationOffset?: CameraPoint3D;
  /** Label anchor in the part's local coordinate system. */
  anchor?: CameraPoint3D;
}

/** Stable topological order, used for both transform ownership and cycle validation. */
export function orderAssemblyParts(parts: readonly AssemblyPart3D[]): AssemblyPart3D[] {
  const byId = new Map<string, AssemblyPart3D>();
  for (const part of parts) {
    if (!part.id.trim() || byId.has(part.id)) throw new Error(`Assembly part "${part.id}" needs a unique non-empty ID.`);
    for (const vector of [part.position, part.rotation, part.scale, part.offset, part.rotationOffset, part.anchor]) {
      if (vector && (vector.length !== 3 || !vector.every(Number.isFinite))) throw new Error(`Assembly part "${part.id}" needs finite XYZ triples for every authored transform.`);
    }
    if (part.scale?.some((value) => value <= 0)) throw new Error(`Assembly part "${part.id}" needs positive scale components.`);
    byId.set(part.id, part);
  }
  const ordered: AssemblyPart3D[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (part: AssemblyPart3D) => {
    if (visited.has(part.id)) return;
    if (visiting.has(part.id)) throw new Error(`Assembly hierarchy contains a cycle at "${part.id}". Give each part an acyclic parent chain.`);
    visiting.add(part.id);
    if (part.parentId) {
      const parent = byId.get(part.parentId);
      if (!parent) throw new Error(`Assembly part "${part.id}" references missing parent "${part.parentId}".`);
      visit(parent);
    }
    visiting.delete(part.id); visited.add(part.id); ordered.push(part);
  };
  parts.forEach(visit);
  return ordered;
}

export interface ExplodedTimelineOptions {
  id: string;
  parts: readonly AssemblyPart3D[];
  fps: RationalFps;
  durationFrames: number;
  separate: FrameRange;
  reassemble?: FrameRange;
  staggerFrames?: number;
  easing?: EasingSpec;
}

/** Compile reversible, staggered part movement to ordinary numeric MG1 tracks. */
export function createExplodedTimeline({ id, parts, fps, durationFrames, separate, reassemble, staggerFrames = 6, easing = "ease-in-out-cubic" }: ExplodedTimelineOptions): MotionTimeline {
  orderAssemblyParts(parts);
  if (!id.trim() || !Number.isInteger(durationFrames) || durationFrames < 2 || !Number.isInteger(staggerFrames) || staggerFrames < 0 ||
      !Number.isInteger(fps.num) || !Number.isInteger(fps.den) || fps.num <= 0 || fps.den <= 0) {
    throw new Error("Exploded view needs an ID, positive integer rational FPS, at least two composition frames and nonnegative integer staggerFrames.");
  }
  for (const range of [separate, ...(reassemble ? [reassemble] : [])]) {
    if (!Number.isInteger(range.startFrame) || !Number.isInteger(range.endFrame) || range.startFrame < 0 || range.endFrame > durationFrames ||
        range.endFrame - range.startFrame - staggerFrames * Math.max(0, parts.length - 1) < 2) {
      throw new Error("Explosion/reassembly ranges must fit the composition and leave at least two motion frames per part after staggering. Expand the range or reduce staggerFrames.");
    }
  }
  if (reassemble && reassemble.startFrame < separate.endFrame) throw new Error("Reassembly must begin after separation ends; leave an explicit inspection hold between them.");
  return {
    schemaVersion: 1, id, fps: { ...fps }, durationFrames,
    nodes: parts.map((part, index) => {
      const entrance = separate.startFrame + index * staggerFrames;
      const entranceEnd = separate.endFrame - 1 - (parts.length - 1 - index) * staggerFrames;
      const frames = new Map<number, Keyframe>();
      const put = (frame: number, value: number) => frames.set(frame, { frame, value, easing });
      put(0, 0); put(entrance, 0); put(entranceEnd, 1);
      if (reassemble) {
        const reverseIndex = parts.length - 1 - index;
        put(reassemble.startFrame + reverseIndex * staggerFrames, 1);
        put(reassemble.endFrame - 1 - index * staggerFrames, 0);
      }
      put(durationFrames - 1, reassemble ? 0 : 1);
      return { kind: "track", id: `${part.id}-separation`, track: {
        id: `${part.id}-separation`, targetId: part.id, property: "separation", valueType: "number",
        keyframes: [...frames.values()].sort((a, b) => a.frame - b.frame),
      } };
    }),
  };
}

/** Sample authored amounts without mutating any assembled transform or renderer object. */
export function evaluateExplodedView(parts: readonly AssemblyPart3D[], timeline: MotionTimeline, frame: number, evaluation?: EvaluationResult): Map<string, number> {
  if (!Number.isInteger(frame)) throw new Error("Exploded view requires a finite integer frame.");
  const sampledFrame = Math.max(0, Math.min(timeline.durationFrames - 1, frame));
  const result = evaluation ?? evaluateTimeline(timeline, sampledFrame);
  if (result.frame !== sampledFrame) throw new Error("Assembly and shared MG1 evaluation must use the same resolved frame.");
  return new Map(parts.map((part) => {
    const value = result.samples[outputKey(part.id, "separation")]?.value;
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Part "${part.id}" has no valid separation track. Author the assembly with createExplodedTimeline.`);
    return [part.id, Math.max(0, Math.min(1, value))];
  }));
}
