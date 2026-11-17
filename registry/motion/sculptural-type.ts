/**
 * Sculptural typography — letters as dimensional, deformable, material-bearing objects (registry item
 * `sculptural-type`). Roadmap slice MC1.2; extends KineticText and TitleSequence.
 *
 * A spec names the text, the font, a relief profile and a motion. The plan lays the text out with any font the page
 * can draw (KineticText's grapheme segmentation, kerning-aware pen positions), builds one watertight solid per unit
 * from its signed distance field, and staggers the units with MG1's `staggerStartFrames`. `SculpturalText.update`
 * evaluates each unit's pose (offset, turn, scale) and deformer stack at a frame and writes deformed positions and
 * normals into reused buffers. Everything is a pure function of the frame: seek in any order.
 *
 * Renderers: `sculptural-type-three.ts` (item `sculptural-type-three`) draws the solids with physical materials; the
 * TitleSequence relief title shades the same fields in 2D.
 *
 * Motion presets follow the animation principles that make objects read as physical: gravity (accelerating falls),
 * squash and stretch at constant volume, anticipation and overshoot settled by a damped spring, and follow-through.
 */

import { DEFAULT_FPS, fpsRatio } from "./constants";
import { createDiagnostic } from "./diagnostics";
import { springValue } from "./springs";
import type { SpringParams } from "./springs";
import { staggerStartFrames } from "./stagger";
import type { Diagnostic, RationalFps, StaggerDirection } from "./types";
import { layoutGlyphs, signedDistanceField } from "./sculptural-type-field";
import type { GlyphLayoutOptions, ReliefProfile } from "./sculptural-type-field";
import { buildGlyphSolid } from "./sculptural-type-mesh";
import type { GlyphSolid } from "./sculptural-type-mesh";
import { createDeformScratch, deformInto, isIdentityStack } from "./sculptural-type-deform";
import type { Deformer, DeformScratch } from "./sculptural-type-deform";

export type { ReliefProfile } from "./sculptural-type-field";
export type { Deformer } from "./sculptural-type-deform";

/* ------------------------------------------------------------------ *
 * Spec
 * ------------------------------------------------------------------ */

/**
 * How each unit arrives.
 * - `drop`: falls under gravity, stretching as it speeds up, squashes on landing and springs back.
 * - `unfold`: lies face up on the floor, then stands and uncurls like a sheet.
 * - `twist`: turns in from behind while its twist unwinds.
 * - `inflate`: starts as flat paper and puffs up to its relief, overshooting a little.
 * - `swing`: hangs from a hinge at its top, swings in and settles with an inertial lean.
 * - `rise`: rises from below the baseline and settles.
 * - `none`: is in place from the start frame.
 */
export type SculptEnter = "drop" | "unfold" | "twist" | "inflate" | "swing" | "rise" | "none";

/** Motion once a unit has arrived. `wave` ripples along the line; `breathe` swells the relief gently. */
export type SculptIdle = "none" | "wave" | "breathe";

export interface SculptMotion {
  /** @default "drop" */
  enter?: SculptEnter;
  /** Frames one unit takes to arrive. Default per preset at 30 fps, scaled to the spec's fps. */
  frames?: number;
  /** Strength of squash, overshoot and deformation, 0–2. @default 1 */
  intensity?: number;
  /** @default "none" */
  idle?: SculptIdle;
  /** Idle amplitude in em. @default 0.04 */
  idleAmplitude?: number;
  /** Idle period in frames. @default 2 s worth of frames */
  idlePeriod?: number;
}

export interface SculpturalTextSpec extends GlyphLayoutOptions {
  id: string;
  text: string;
  /** Face cross-section. @default a round bevel 0.05 em wide and 0.035 em high */
  profile?: ReliefProfile;
  /** Depth behind the face edge, in em. @default 0.16 */
  depth?: number;
  /** Grid step in pixels for the solids (1 = every pixel). @default 1 */
  step?: number;
  /** Build back caps. @default true */
  back?: boolean;
  /** @default 35 */
  creaseAngle?: number;
  /** Face normal smoothing passes (see `GlyphSolidOptions.smoothNormals`). */
  smoothNormals?: number;
  /** @default 0 */
  startFrame?: number;
  /** @default 30 fps */
  fps?: RationalFps;
  /** Frames between units. @default 3 */
  stagger?: number;
  /** @default "forward" */
  direction?: StaggerDirection;
  /** Stagger within words or lines, with `groupGap` frames between groups. @default "none" */
  groupBy?: "none" | "word" | "line";
  /** @default 0 */
  groupGap?: number;
  motion?: SculptMotion;
}

/* ------------------------------------------------------------------ *
 * Plan
 * ------------------------------------------------------------------ */

export interface SculptGlyph {
  index: number;
  text: string;
  line: number;
  word: number;
  /** The unit's pen origin in the text block, in em, with the block centred on the origin (y up). */
  rest: [number, number, number];
  /** Pivot for pose and deformers, in the unit's own em space: the base centre of its ink, or the top for a swing. */
  pivot: [number, number, number];
  solid: GlyphSolid;
  /** Frame on which the unit starts to arrive. */
  start: number;
}

export interface SculpturalTextPlan {
  spec: SculpturalTextSpec;
  glyphs: SculptGlyph[];
  /** Pixels per em of the rasters. */
  size: number;
  /** Text block size in em. */
  block: { width: number; height: number };
  /** Frames one unit takes to arrive. */
  enterFrames: number;
  /** First and last frame of the entrance (the last unit settled). */
  frames: { start: number; settled: number };
  diagnostics: Diagnostic[];
}

const ENTER_FRAMES_30: Record<SculptEnter, number> = { drop: 22, unfold: 26, twist: 24, inflate: 22, swing: 34, rise: 18, none: 1 };
export const DEFAULT_RELIEF: ReliefProfile = { kind: "round", width: 0.05, height: 0.035 };

/** Lay out the text, build every solid and schedule the stagger. Needs a canvas (see `createCanvas`). */
export function planSculpturalText(spec: SculpturalTextSpec): SculpturalTextPlan {
  const diagnostics: Diagnostic[] = [];
  const fps = fpsRatio(spec.fps ?? DEFAULT_FPS);
  const layout = layoutGlyphs(spec.text, spec);
  const size = layout.size;
  const profile = spec.profile ?? DEFAULT_RELIEF;
  const depth = Math.max(spec.depth ?? 0.16, 0);
  const enter = spec.motion?.enter ?? "drop";
  const enterFrames = Math.max(1, Math.round(spec.motion?.frames ?? (ENTER_FRAMES_30[enter] * fps) / 30));
  const inked = layout.units.filter((unit) => !unit.blank);
  if (inked.length === 0) diagnostics.push(createDiagnostic("sculpt-empty", "warning", `Sculptural text "${spec.id}" has no visible units.`));
  if (inked.length > 48) {
    diagnostics.push(createDiagnostic("sculpt-many-units", "warning", `Sculptural text "${spec.id}" has ${inked.length} units; each is a solid. Keep titles short, or use unit: "word".`));
  }
  const groupBy = spec.groupBy ?? "none";
  const groups = inked.map((unit) => ({ group: groupBy === "word" ? Math.max(unit.word, 0) : groupBy === "line" ? unit.line : 0 }));
  const stagger = Math.max(0, spec.stagger ?? 3);
  const starts = staggerStartFrames(groups, stagger, spec.direction ?? "forward", Math.max(0, spec.groupGap ?? 0));
  const startFrame = spec.startFrame ?? 0;
  const glyphs: SculptGlyph[] = inked.map((unit, i) => {
    const field = signedDistanceField(unit.alpha, unit.width, unit.height);
    const solid = buildGlyphSolid(unit, field, { profile, depth, size, step: spec.step, back: spec.back, creaseAngle: spec.creaseAngle, smoothNormals: spec.smoothNormals });
    const midX = (solid.box.minX + solid.box.maxX) / 2;
    const pivotY = enter === "swing" ? solid.box.maxY : Math.max(solid.box.minY, Math.min(0, solid.box.maxY));
    return {
      index: unit.index, text: unit.text, line: unit.line, word: unit.word,
      rest: [(unit.penX - layout.width / 2) / size, (layout.height / 2 - unit.penY) / size, 0],
      pivot: [midX, pivotY, 0], solid, start: startFrame + starts[i],
    };
  });
  const lastStart = glyphs.reduce((last, glyph) => Math.max(last, glyph.start), startFrame);
  return {
    spec, glyphs, size, enterFrames, diagnostics,
    block: { width: layout.width / size, height: layout.height / size },
    frames: { start: startFrame, settled: lastStart + enterFrames },
  };
}

/* ------------------------------------------------------------------ *
 * Poses
 * ------------------------------------------------------------------ */

export interface GlyphPose {
  visible: boolean;
  /** Pivot offset from rest, em. */
  offset: [number, number, number];
  /** Euler angles about the pivot, radians, XYZ order. */
  rotation: [number, number, number];
  scale: number;
  deformers: Deformer[];
}

const SETTLE: SpringParams = { mass: 1, stiffness: 260, damping: 15 };
const FIRM: SpringParams = { mass: 1, stiffness: 180, damping: 22 };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOutBack = (t: number, overshoot = 1.4) => {
  const u = t - 1;
  return 1 + (overshoot + 1) * u * u * u + overshoot * u * u;
};

/**
 * The pose of one unit at a frame. Pure: it reads only the plan and the frame. `reducedMotion` shows every unit at
 * rest with no idle motion.
 */
export function glyphPose(plan: SculpturalTextPlan, glyph: SculptGlyph, frame: number, reducedMotion = false): GlyphPose {
  const motion = plan.spec.motion ?? {};
  const enter = motion.enter ?? "drop";
  const fps = fpsRatio(plan.spec.fps ?? DEFAULT_FPS);
  const intensity = Math.min(2, Math.max(0, motion.intensity ?? 1));
  const pose: GlyphPose = { visible: true, offset: [0, 0, 0], rotation: [0, 0, 0], scale: 1, deformers: [] };
  if (reducedMotion) return pose;
  const t = frame - glyph.start;
  if (t < 0) {
    pose.visible = enter === "none";
    return pose;
  }
  const duration = plan.enterFrames;
  const p = clamp01(t / duration);
  const seconds = t / fps;
  const height = Math.max(glyph.solid.box.maxY - glyph.solid.box.minY, 0.1);
  switch (enter) {
    case "drop": {
      // Fall for 40 % of the time under constant acceleration, stretching with speed; then squash and spring back.
      const fall = 0.4;
      if (p < fall) {
        const u = p / fall;
        pose.offset[1] = 1.5 * (1 - u * u);
        pose.deformers.push({ kind: "squash", amount: 1 + 0.2 * intensity * u * u });
      } else {
        const since = ((p - fall) * duration) / fps;
        const settle = springValue(since, SETTLE);
        pose.deformers.push({ kind: "squash", amount: 1 - 0.3 * intensity * (1 - settle) });
        pose.rotation[2] = 0.05 * intensity * (1 - settle) * (glyph.index % 2 ? 1 : -1);
      }
      break;
    }
    case "unfold": {
      const settle = springValue(seconds * 0.9, FIRM);
      pose.rotation[0] = (-Math.PI / 2 + 0.02) * (1 - settle);
      pose.deformers.push({ kind: "bend", angle: 1.8 * intensity * (1 - clamp01(settle)), from: 0, to: height });
      break;
    }
    case "twist": {
      const e = easeOutBack(p, 1.2 * intensity);
      pose.rotation[1] = Math.PI * (1 - e);
      pose.scale = 0.85 + 0.15 * clamp01(e);
      pose.deformers.push({ kind: "twist", rate: ((1.6 * intensity) / height) * (1 - clamp01(p * 1.15)), origin: 0 });
      break;
    }
    case "inflate": {
      const settle = springValue(seconds, SETTLE);
      pose.deformers.push({ kind: "inflate", amount: Math.max(0.02, settle) });
      pose.scale = 0.94 + 0.06 * settle;
      pose.offset[2] = -0.08 * (1 - clamp01(settle));
      break;
    }
    case "swing": {
      // A damped pendulum about the top hinge; the lean drags behind the swing.
      const omega = 2 * Math.PI * 1.2;
      const decay = Math.exp(-3.2 * seconds);
      const angle = -1.1 * intensity * decay * Math.cos(omega * seconds);
      const velocity = 1.1 * intensity * decay * (omega * Math.sin(omega * seconds) + 3.2 * Math.cos(omega * seconds));
      pose.rotation[0] = angle;
      pose.deformers.push({ kind: "bend", angle: -0.25 * Math.tanh(velocity / 6), from: -height, to: 0 });
      break;
    }
    case "rise": {
      const settle = springValue(seconds, FIRM);
      pose.offset[1] = -0.5 * (1 - settle);
      pose.deformers.push({ kind: "squash", amount: 1 + 0.12 * intensity * Math.sin(Math.PI * clamp01(p * 1.4)) });
      break;
    }
    case "none":
      break;
  }
  const idle = motion.idle ?? "none";
  if (idle !== "none" && t >= duration) {
    const period = Math.max(2, motion.idlePeriod ?? 2 * fps);
    const amplitude = motion.idleAmplitude ?? 0.04;
    const phase = (2 * Math.PI * (frame - plan.frames.start)) / period - glyph.rest[0] * 1.6;
    const ramp = clamp01((t - duration) / (0.5 * fps));
    if (idle === "wave") {
      pose.offset[1] += ramp * amplitude * Math.sin(phase);
      pose.rotation[0] += ramp * amplitude * 1.5 * Math.cos(phase);
    } else {
      pose.deformers.push({ kind: "inflate", amount: 1 + ramp * (amplitude / 0.04) * 0.12 * Math.sin(phase) });
    }
  }
  return pose;
}

/* ------------------------------------------------------------------ *
 * Frame evaluation
 * ------------------------------------------------------------------ */

export interface SculptGlyphFrame {
  glyph: SculptGlyph;
  pose: GlyphPose;
  /** Current positions and normals (deformed when the pose has deformers). Reused between frames. */
  positions: Float32Array;
  normals: Float32Array;
  /** True when `positions`/`normals` changed since the previous update; renderers re-upload only then. */
  changed: boolean;
}

/**
 * Evaluates a plan frame by frame. Buffers are allocated once per unit; an update rewrites only units whose deformers
 * are active or just ended.
 */
export class SculpturalText {
  readonly plan: SculpturalTextPlan;
  readonly glyphs: SculptGlyphFrame[];
  private readonly deformed: boolean[];
  private readonly scratch: DeformScratch = createDeformScratch();

  constructor(specOrPlan: SculpturalTextSpec | SculpturalTextPlan) {
    this.plan = "glyphs" in specOrPlan ? specOrPlan : planSculpturalText(specOrPlan);
    this.glyphs = this.plan.glyphs.map((glyph) => ({
      glyph, pose: { visible: true, offset: [0, 0, 0], rotation: [0, 0, 0], scale: 1, deformers: [] },
      positions: Float32Array.from(glyph.solid.positions), normals: Float32Array.from(glyph.solid.normals), changed: true,
    }));
    this.deformed = this.glyphs.map(() => false);
  }

  /** Evaluate every unit at `frame`. */
  update(frame: number, reducedMotion = false): readonly SculptGlyphFrame[] {
    this.glyphs.forEach((state, i) => {
      const pose = glyphPose(this.plan, state.glyph, frame, reducedMotion);
      state.pose = pose;
      state.changed = false;
      const active = pose.visible && !isIdentityStack(pose.deformers);
      if (active) {
        deformInto(pose.deformers, state.glyph.pivot, state.glyph.solid.positions, state.glyph.solid.normals, state.positions, state.normals, this.scratch);
        this.deformed[i] = true;
        state.changed = true;
      } else if (this.deformed[i]) {
        state.positions.set(state.glyph.solid.positions);
        state.normals.set(state.glyph.solid.normals);
        this.deformed[i] = false;
        state.changed = true;
      }
    });
    return this.glyphs;
  }
}
