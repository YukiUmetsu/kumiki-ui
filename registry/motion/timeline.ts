/**
 * Motion core — timeline evaluation (docs/08 §2).
 *
 * Evaluation is pure and *order independent*: seeking to any frame, in any order,
 * yields the same result for that frame. Nothing here reads a clock or mutates its
 * inputs.
 *
 * Node timing (all in integer frames, ranges end-exclusive):
 * - `sequence`: children run one after another. A child starts at the running
 *   cursor plus its own offset; the cursor then advances to that child's end, so
 *   offsets never create hidden delays.
 * - `parallel`: children run from their own offsets; duration is the maximum end.
 * - `hold`: only samples its child within `[offset, offset + durationFrames)`.
 * - `repeat`: the child loops; local time is `(frame - offset) mod childDuration`.
 * - `stagger`: children start at the frames computed by `stagger.ts`.
 */

import type {
  AffineMatrix,
  AnimationTrack,
  Diagnostic,
  EvaluationResult,
  MotionConstraint,
  MotionCue,
  MotionNode,
  MotionOffset,
  MotionSample,
  MotionTimeline,
  MotionValue,
  MotionValueType,
  PinnedValues,
  RationalFps,
  TrackNode,
  Vec2,
} from "./types";
import { clampFrame, normalizeFps } from "./constants";
import { createDiagnostic } from "./diagnostics";
import { sampleTrack } from "./interpolate";
import { multiplyMatrix, resolveWorldTransforms } from "./matrix";
import { staggerStartFrames } from "./stagger";

export type EvalContext = {
  fps: RationalFps;
  cueFrames: Record<string, number>;
  diagnostics: Diagnostic[];
};

/** The sample key for a target property: `` `${targetId}.${property}` ``. */
export function outputKey(targetId: string, property: string): string {
  return `${targetId}.${property}`;
}

function pushUnique(diagnostics: Diagnostic[], diagnostic: Diagnostic): void {
  if (
    diagnostics.some((d) => d.code === diagnostic.code && d.message === diagnostic.message)
  ) {
    return;
  }
  diagnostics.push(diagnostic);
}

/* ------------------------------------------------------------------ *
 * Cues and offsets
 * ------------------------------------------------------------------ */

/**
 * Resolve named cues to concrete frames, first occurrence wins. Duplicates emit
 * `motion-cue-duplicate` (warning); negative / non-integer frames emit
 * `motion-cue-invalid` (error).
 */
export function resolveCueFrames(cues: MotionCue[] | undefined): {
  frames: Record<string, number>;
  diagnostics: Diagnostic[];
} {
  const frames: Record<string, number> = {};
  const diagnostics: Diagnostic[] = [];
  if (!cues) return { frames, diagnostics };

  for (const cue of cues) {
    if (!Number.isInteger(cue.frame) || cue.frame < 0) {
      diagnostics.push(
        createDiagnostic(
          "motion-cue-invalid",
          "error",
          `Cue "${cue.id}" has an invalid frame ${cue.frame}; expected a non-negative integer.`,
        ),
      );
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(frames, cue.id)) {
      diagnostics.push(
        createDiagnostic(
          "motion-cue-duplicate",
          "warning",
          `Cue "${cue.id}" was declared more than once; the first occurrence wins.`,
        ),
      );
      continue;
    }
    frames[cue.id] = cue.frame;
  }
  return { frames, diagnostics };
}

/**
 * Resolve a node offset to frames. A missing cue emits `motion-cue-missing`
 * (error, deduped) and resolves to `0`.
 */
export function offsetFrames(offset: MotionOffset | undefined, ctx: EvalContext): number {
  if (offset === undefined) return 0;
  if (typeof offset === "number") return offset;
  const resolved = ctx.cueFrames[offset.cue];
  if (resolved === undefined) {
    pushUnique(
      ctx.diagnostics,
      createDiagnostic("motion-cue-missing", "error", `Offset references unknown cue "${offset.cue}".`),
    );
    return 0;
  }
  return resolved;
}

/* ------------------------------------------------------------------ *
 * Duration
 * ------------------------------------------------------------------ */

/** Span of a track: last keyframe frame minus first (0 with fewer than two). */
function trackDuration(track: AnimationTrack): number {
  if (track.keyframes.length < 2) return 0;
  let min = track.keyframes[0].frame;
  let max = min;
  for (const kf of track.keyframes) {
    if (kf.frame < min) min = kf.frame;
    if (kf.frame > max) max = kf.frame;
  }
  return max - min;
}

/** Local duration of a node, in frames. */
export function nodeDuration(node: MotionNode, ctx: EvalContext): number {
  switch (node.kind) {
    case "track":
      return trackDuration(node.track);

    case "sequence": {
      let cursor = 0;
      for (const child of node.children) {
        const childStart = cursor + offsetFrames(child.offset, ctx);
        cursor = childStart + nodeDuration(child, ctx);
      }
      return cursor;
    }

    case "parallel": {
      let max = 0;
      for (const child of node.children) {
        max = Math.max(max, offsetFrames(child.offset, ctx) + nodeDuration(child, ctx));
      }
      return max;
    }

    case "hold": {
      if (node.child) {
        const childDuration = nodeDuration(node.child, ctx);
        if (childDuration > node.durationFrames) {
          pushUnique(
            ctx.diagnostics,
            createDiagnostic(
              "motion-hold-child-overflow",
              "warning",
              `Hold node "${node.id}" has a child (${childDuration} frames) longer than its duration (${node.durationFrames} frames).`,
            ),
          );
        }
      }
      return node.durationFrames;
    }

    case "repeat": {
      let count = node.count;
      if (!Number.isInteger(count) || count < 1) {
        pushUnique(
          ctx.diagnostics,
          createDiagnostic(
            "motion-repeat-count-invalid",
            "error",
            `Repeat node "${node.id}" has an invalid count ${node.count}; treated as 1.`,
          ),
        );
        count = 1;
      }
      return count * nodeDuration(node.child, ctx);
    }

    case "stagger": {
      const starts = staggerStartFrames(
        node.items,
        node.intervalFrames,
        node.direction,
        node.groupSpacingFrames,
      );
      let end = 0;
      for (let i = 0; i < node.items.length; i += 1) {
        end = Math.max(end, starts[i] + nodeDuration(node.items[i].node, ctx));
      }
      return end;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Evaluation
 * ------------------------------------------------------------------ */

function emitTrack(track: AnimationTrack, sourceId: string, frame: number, ctx: EvalContext, out: MotionSample[]): void {
  const sampled = sampleTrack(track, frame);
  ctx.diagnostics.push(...sampled.diagnostics);
  if (sampled.value === null) return;
  out.push({
    targetId: track.targetId,
    property: track.property,
    valueType: track.valueType,
    value: sampled.value,
    sourceId,
  });
}

/**
 * Evaluate every `track` leaf reachable from `node` at local `frame`, appending
 * samples to `out`.
 *
 * `frame` is time measured from the node's own start; the node's `offset` is
 * applied here (once). Parents therefore pass a child its start minus the parent
 * cursor only — never the child's own offset, which the child applies itself.
 */
export function evaluateNode(
  node: MotionNode,
  frame: number,
  ctx: EvalContext,
  out: MotionSample[],
): void {
  const local = frame - offsetFrames(node.offset, ctx);

  switch (node.kind) {
    case "track":
      emitTrack(node.track, node.id, local, ctx, out);
      return;

    case "sequence": {
      let cursor = 0;
      for (const child of node.children) {
        // The child's own offset is applied inside `evaluateNode`.
        evaluateNode(child, local - cursor, ctx, out);
        cursor += offsetFrames(child.offset, ctx) + nodeDuration(child, ctx);
      }
      return;
    }

    case "parallel":
      for (const child of node.children) {
        evaluateNode(child, local, ctx, out);
      }
      return;

    case "hold": {
      if (!node.child) return;
      if (local >= 0 && local < node.durationFrames) {
        evaluateNode(node.child, local, ctx, out);
      }
      return;
    }

    case "repeat": {
      let count = node.count;
      if (!Number.isInteger(count) || count < 1) count = 1;
      const childDuration = nodeDuration(node.child, ctx);
      if (childDuration <= 0) {
        if (local === 0) evaluateNode(node.child, 0, ctx, out);
        return;
      }
      if (local < 0 || local >= count * childDuration) return;
      const wrapped = ((local % childDuration) + childDuration) % childDuration;
      evaluateNode(node.child, wrapped, ctx, out);
      return;
    }

    case "stagger": {
      const starts = staggerStartFrames(
        node.items,
        node.intervalFrames,
        node.direction,
        node.groupSpacingFrames,
      );
      for (let i = 0; i < node.items.length; i += 1) {
        evaluateNode(node.items[i].node, local - starts[i], ctx, out);
      }
      return;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Post-authored resolution
 * ------------------------------------------------------------------ */

function collectTracks(nodes: MotionNode[], out: Map<string, AnimationTrack>): void {
  for (const node of nodes) {
    switch (node.kind) {
      case "track":
        out.set(node.id, node.track);
        break;
      case "sequence":
      case "parallel":
        collectTracks(node.children, out);
        break;
      case "hold":
        if (node.child) collectTracks([node.child], out);
        break;
      case "repeat":
        collectTracks([node.child], out);
        break;
      case "stagger":
        for (const item of node.items) collectTracks([item.node], out);
        break;
    }
  }
}

/** Combine a base value with an additive value for the given type. */
export function blendValues(type: MotionValueType, base: MotionValue, add: MotionValue): MotionValue {
  switch (type) {
    case "number":
    case "opacity":
    case "length":
    case "angle":
      return (base as number) + (add as number);
    case "vec2": {
      const bv = base as Vec2;
      const av = add as Vec2;
      return { x: bv.x + av.x, y: bv.y + av.y };
    }
    case "transform":
      return multiplyMatrix(base as AffineMatrix, add as AffineMatrix);
    default:
      return add;
  }
}

function readVec2(samples: Record<string, MotionSample>, targetId: string): Vec2 | null {
  const position = samples[outputKey(targetId, "position")];
  if (position && typeof position.value === "object" && position.value !== null) {
    const value = position.value as Vec2;
    if (typeof value.x === "number" && typeof value.y === "number") return value;
  }
  const x = samples[outputKey(targetId, "x")];
  const y = samples[outputKey(targetId, "y")];
  if (x && y && typeof x.value === "number" && typeof y.value === "number") {
    return { x: x.value, y: y.value };
  }
  return null;
}

function writeSample(
  samples: Record<string, MotionSample>,
  targetId: string,
  property: string,
  valueType: MotionValueType,
  value: MotionValue,
  sourceId: string,
): void {
  samples[outputKey(targetId, property)] = { targetId, property, valueType, value, sourceId };
}

function applyConstraints(
  constraints: MotionConstraint[],
  samples: Record<string, MotionSample>,
  diagnostics: Diagnostic[],
): void {
  for (const constraint of constraints) {
    switch (constraint.kind) {
      case "look-at": {
        const position = readVec2(samples, constraint.targetId) ?? { x: 0, y: 0 };
        const angle = Math.atan2(
          constraint.towards.y - position.y,
          constraint.towards.x - position.x,
        );
        writeSample(samples, constraint.targetId, constraint.property ?? "angle", "angle", angle, constraint.id);
        break;
      }
      case "follow": {
        const source = readVec2(samples, constraint.sourceId) ?? { x: 0, y: 0 };
        const offset = constraint.offset ?? { x: 0, y: 0 };
        writeSample(
          samples,
          constraint.targetId,
          constraint.property ?? "position",
          "vec2",
          { x: source.x + offset.x, y: source.y + offset.y },
          constraint.id,
        );
        break;
      }
      case "distance-anchor": {
        const value = {
          x: constraint.anchor.x + constraint.distance * Math.cos(constraint.angle),
          y: constraint.anchor.y + constraint.distance * Math.sin(constraint.angle),
        };
        writeSample(samples, constraint.targetId, constraint.property ?? "position", "vec2", value, constraint.id);
        break;
      }
      case "bounds": {
        const property = constraint.property ?? "position";
        const key = outputKey(constraint.targetId, property);
        const existing = samples[key];
        if (!existing) break;
        const value = existing.value;
        if (
          typeof value !== "object" ||
          value === null ||
          typeof (value as Vec2).x !== "number" ||
          typeof (value as Vec2).y !== "number"
        ) {
          break;
        }
        const { x, y } = value as Vec2;
        const clamped: Vec2 = {
          x: Math.min(Math.max(x, constraint.bounds.x), constraint.bounds.x + constraint.bounds.width),
          y: Math.min(Math.max(y, constraint.bounds.y), constraint.bounds.y + constraint.bounds.height),
        };
        if (clamped.x === x && clamped.y === y) break;
        if ((constraint.mode ?? "clamp") === "reject") {
          diagnostics.push(
            createDiagnostic(
              "motion-constraint-violated",
              "error",
              `Constraint "${constraint.id}" rejected ${key} at (${x}, ${y}).`,
            ),
          );
        } else {
          samples[key] = { ...existing, value: clamped, sourceId: constraint.id };
          diagnostics.push(
            createDiagnostic(
              "motion-constraint-clamped",
              "warning",
              `Constraint "${constraint.id}" clamped ${key}.`,
            ),
          );
        }
        break;
      }
    }
  }
}

function splitKey(key: string): { targetId: string; property: string } {
  const index = key.lastIndexOf(".");
  if (index < 0) return { targetId: key, property: "" };
  return { targetId: key.slice(0, index), property: key.slice(index + 1) };
}

function inferValueType(value: MotionValue): MotionValueType {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "path";
  if (Array.isArray(value)) return "path";
  if (typeof value === "object" && value !== null) {
    const record = value as unknown as Record<string, unknown>;
    if ("space" in record) return "color";
    if ("a" in record && "d" in record && "e" in record) return "transform";
    if ("x" in record && "y" in record) return "vec2";
  }
  return "discrete";
}

/**
 * Evaluate a timeline at one frame. Pure: the same inputs always produce the
 * same result, and frames may be evaluated in any order.
 */
export function evaluateTimeline(
  timeline: MotionTimeline,
  frame: number,
  pinned?: PinnedValues,
): EvaluationResult {
  const diagnostics: Diagnostic[] = [];

  // fps
  const fps = normalizeFps(timeline.fps);
  const fpsValid =
    !!timeline.fps &&
    Number.isFinite(timeline.fps.num) &&
    Number.isFinite(timeline.fps.den) &&
    timeline.fps.num > 0 &&
    timeline.fps.den > 0;
  if (!fpsValid) {
    diagnostics.push(
      createDiagnostic(
        "motion-fps-invalid",
        "error",
        "Timeline fps must be a positive rational; falling back to 30 fps.",
      ),
    );
  }

  // duration
  const durationValid = Number.isInteger(timeline.durationFrames) && timeline.durationFrames >= 0;
  const duration = durationValid ? timeline.durationFrames : 0;
  if (!durationValid) {
    diagnostics.push(
      createDiagnostic(
        "motion-duration-invalid",
        "error",
        "Timeline durationFrames must be a non-negative integer.",
      ),
    );
  }

  // requested frame
  let evalFrame = frame;
  if (frame < 0 || frame >= duration) {
    diagnostics.push(
      createDiagnostic(
        "motion-frame-out-of-range",
        "warning",
        `Frame ${frame} is outside [0, ${duration}); the nearest authored frame was used.`,
      ),
    );
    evalFrame = clampFrame(frame, duration);
  }

  const cueResult = resolveCueFrames(timeline.cues);
  diagnostics.push(...cueResult.diagnostics);
  const ctx: EvalContext = { fps, cueFrames: cueResult.frames, diagnostics };

  const transformResult = resolveWorldTransforms(timeline.transforms ?? []);
  diagnostics.push(...transformResult.diagnostics);

  // Collect samples from every top-level node; each node applies its own offset.
  const collected: MotionSample[] = [];
  for (const node of timeline.nodes) {
    evaluateNode(node, evalFrame, ctx, collected);
  }

  const tracksById = new Map<string, AnimationTrack>();
  collectTracks(timeline.nodes, tracksById);

  // Group by output key and resolve conflicts deterministically.
  const grouped = new Map<string, MotionSample[]>();
  for (const sample of collected) {
    const key = outputKey(sample.targetId, sample.property);
    const list = grouped.get(key);
    if (list) list.push(sample);
    else grouped.set(key, [sample]);
  }

  const samples: Record<string, MotionSample> = {};
  for (const [key, list] of grouped) {
    if (list.length === 1) {
      samples[key] = list[0];
      continue;
    }
    const policies = list.map((s) => tracksById.get(s.sourceId)?.conflict ?? "error");
    const policy: "error" | "priority" | "additive" = policies.includes("error")
      ? "error"
      : policies.includes("priority")
        ? "priority"
        : "additive";

    if (policy === "error") {
      diagnostics.push(
        createDiagnostic(
          "motion-duplicate-writer",
          "error",
          `Multiple tracks write ${key}: ${list.map((s) => s.sourceId).join(", ")}.`,
        ),
      );
      samples[key] = list[0];
      continue;
    }

    if (policy === "priority") {
      let maxPriority = Number.NEGATIVE_INFINITY;
      for (const s of list) {
        maxPriority = Math.max(maxPriority, tracksById.get(s.sourceId)?.priority ?? 0);
      }
      const top = list.filter((s) => (tracksById.get(s.sourceId)?.priority ?? 0) === maxPriority);
      if (top.length > 1) {
        diagnostics.push(
          createDiagnostic(
            "motion-priority-tie",
            "warning",
            `Equal-priority writers for ${key}; the first wins.`,
          ),
        );
      }
      samples[key] = top[0];
      continue;
    }

    // additive
    let accumulated = list[0];
    for (let i = 1; i < list.length; i += 1) {
      const add = list[i];
      accumulated = {
        ...accumulated,
        value: blendValues(accumulated.valueType, accumulated.value, add.value),
      };
    }
    samples[key] = accumulated;
  }

  // Pinned inputs override authored values.
  if (pinned) {
    for (const key of Object.keys(pinned)) {
      const existing = samples[key];
      const { targetId, property } = splitKey(key);
      if (existing) {
        diagnostics.push(
          createDiagnostic(
            "motion-pinned-override",
            "warning",
            `Pinned value for ${key} replaces an authored value.`,
          ),
        );
      }
      samples[key] = {
        targetId,
        property,
        valueType: existing ? existing.valueType : inferValueType(pinned[key]),
        value: pinned[key],
        sourceId: "pinned",
      };
    }
  }

  // Constraints resolve after authored transforms and pinned overrides.
  if (timeline.constraints && timeline.constraints.length > 0) {
    applyConstraints(timeline.constraints, samples, diagnostics);
  }

  return {
    frame: evalFrame,
    samples,
    transforms: transformResult.transforms,
    diagnostics,
  };
}

/* ------------------------------------------------------------------ *
 * Interruption
 * ------------------------------------------------------------------ */

/**
 * Carry a value across an interruption.
 *
 * Evaluates the pre-existing timeline at `event.frame` to read the current value
 * and a numeric per-frame velocity, then returns a NEW timeline whose nodes gain a
 * `track` node for the new track, seeded with a keyframe at `event.frame` holding
 * the current value so the value stays continuous. The input is never mutated.
 */
export function applyInterruption(
  timeline: MotionTimeline,
  event: { frame: number; targetId: string; property: string; track: AnimationTrack },
): {
  timeline: MotionTimeline;
  startValue: MotionValue | null;
  velocity: number;
  diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];
  const key = outputKey(event.targetId, event.property);

  const at = evaluateTimeline(timeline, event.frame);
  const previous = evaluateTimeline(timeline, event.frame - 1);
  const current = at.samples[key]?.value ?? null;

  const nowValue = at.samples[key]?.value;
  const beforeValue = previous.samples[key]?.value;
  const velocity =
    typeof nowValue === "number" && typeof beforeValue === "number" ? nowValue - beforeValue : 0;

  const seedValue: MotionValue | null =
    current ?? (event.track.keyframes.length > 0 ? event.track.keyframes[0].value : null);
  const keyframes =
    seedValue === null
      ? [...event.track.keyframes]
      : [{ frame: event.frame, value: seedValue }, ...event.track.keyframes];

  const newNode: TrackNode = {
    kind: "track",
    id: `${event.track.id}-interrupt-${event.frame}`,
    track: { ...event.track, keyframes },
  };

  const next: MotionTimeline = { ...timeline, nodes: [...timeline.nodes, newNode] };

  diagnostics.push(
    createDiagnostic(
      "motion-interrupted",
      "warning",
      `Interruption at frame ${event.frame} carried value ${JSON.stringify(seedValue)} for ${key}.`,
    ),
  );

  return { timeline: next, startValue: current, velocity, diagnostics };
}
