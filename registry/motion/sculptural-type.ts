/**
 * Sculptural typography — letters as dimensional, deformable, material-bearing objects (registry item
 * `sculptural-type`). Roadmap slice MC1.2; extends KineticText and TitleSequence.
 *
 * A spec names a **look** (text, font, relief profile, depth, width, height, tracking, colour or gradient, side colour)
 * and a motion. The plan lays the text out with any font the page can draw (KineticText's grapheme segmentation,
 * kerning-aware pen positions), builds one watertight solid per unit from its signed distance field, and staggers the
 * units with MG1's `staggerStartFrames`.
 *
 * **Keys** animate the look like a morph. Numbers and colours interpolate per letter with their own easing and
 * stagger. When the outline changes (another text, font or profile), each letter blends the signed distance fields of
 * its old and new glyph and is re-meshed every frame: one word becomes another, a serif melts into a sans, holes open or
 * close, with nothing to correspond by hand. Height-only and depth-only changes use deformers instead of re-meshing.
 *
 * `SculpturalText.update(frame)` evaluates poses, looks, deformers and colours into reused buffers. Everything is a pure
 * function of the frame: seek in any order.
 *
 * Renderers: `sculptural-type-three.ts` (item `sculptural-type-three`) draws the solids; the TitleSequence relief title
 * shades the same fields in 2D. Motion presets follow the principles that make objects read as physical: gravity,
 * squash and stretch at constant volume, overshoot settled by a damped spring, and follow-through.
 */

import { DEFAULT_FPS, fpsRatio } from "./constants";
import { createDiagnostic } from "./diagnostics";
import { evaluateEasing } from "./easing";
import { springValue } from "./springs";
import type { SpringParams } from "./springs";
import { staggerOrder, staggerStartFrames } from "./stagger";
import type { Diagnostic, EasingSpec, RationalFps, StaggerDirection } from "./types";
import { blendFields, layoutGlyphs, resolveProfile, signedDistanceField, thickestStroke } from "./sculptural-type-field";
import type { GlyphLayoutOptions, PlacedField, ReliefProfile, ResolvedProfile } from "./sculptural-type-field";
import { buildGlyphSolid, emptySolid } from "./sculptural-type-mesh";
import type { GlyphSolid } from "./sculptural-type-mesh";
import { createDeformScratch, deformInto, isIdentityStack } from "./sculptural-type-deform";
import type { Deformer, DeformScratch } from "./sculptural-type-deform";
import { blendProfiles, colouringAt, profileHeight, resolveColouring, sameOutline, sameProfileShape } from "./sculptural-type-look";
import type { Box2, LinearRgb, ResolvedColouring, SculptGradient, SculptLook } from "./sculptural-type-look";

export type { ReliefProfile } from "./sculptural-type-field";
export type { Deformer } from "./sculptural-type-deform";
export type { SculptGradient, SculptGradientStop, SculptLook } from "./sculptural-type-look";

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

/**
 * A key: from `frame` on, the look takes these values. Between two keys every letter moves from one look to the next
 * over the gap, eased by the later key's `easing`, each letter starting `stagger` frames after the previous one.
 */
export interface SculptKey {
  frame: number;
  /** Fields to change. `gradient: null` and `sideColor: null` clear them (back to the plain colour). */
  look: Partial<Omit<SculptLook, "gradient" | "sideColor">> & { gradient?: SculptGradient | null; sideColor?: string | null };
  /** @default "ease-in-out" */
  easing?: EasingSpec;
  /** Frames between letters during this change. @default 0 */
  stagger?: number;
  /** @default "forward" */
  direction?: StaggerDirection;
}

export interface SculpturalTextSpec extends GlyphLayoutOptions, Partial<Omit<SculptLook, "text" | "font">> {
  id: string;
  text: string;
  /** Grid step in pixels for still solids (1 = every pixel). @default 1 */
  step?: number;
  /** Grid step while a letter morphs between outlines; coarser keeps morphs fast. @default 2 */
  morphStep?: number;
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
  /** Frames between units arriving. @default 3 */
  stagger?: number;
  /** @default "forward" */
  direction?: StaggerDirection;
  /** Stagger the entrance within words or lines, with `groupGap` frames between groups. @default "none" */
  groupBy?: "none" | "word" | "line";
  /** @default 0 */
  groupGap?: number;
  motion?: SculptMotion;
  /** Look changes over time, in frame order. */
  keys?: readonly SculptKey[];
}

/** Face cross-section by default: a round bevel 0.05 em wide and 0.035 em high. */
export const DEFAULT_RELIEF: ReliefProfile = { kind: "round", width: 0.05, height: 0.035 };
export const DEFAULT_LOOK: Omit<SculptLook, "text" | "font"> = {
  // White leaves a material's own colour as it is; set a colour or gradient to paint the letters.
  profile: DEFAULT_RELIEF, depth: 0.16, width: 1, height: 1, tracking: 0, color: "#ffffff",
};

/* ------------------------------------------------------------------ *
 * Plan
 * ------------------------------------------------------------------ */

/** One letter of one look: its field, its place and its still solid. */
interface StateUnit {
  text: string;
  line: number;
  word: number;
  /** Pixels per em of its font. */
  size: number;
  /** Field in em-anchored pixels: origin at the ink centre on the baseline. */
  field: PlacedField;
  thickest: number;
  /** Placement of the anchor in the text block, em (y up, block centred), after width, height and tracking. */
  placement: [number, number];
  solid: GlyphSolid;
}

interface SculptState {
  look: SculptLook;
  /** The look equals the previous state's: the key only holds it. */
  hold: boolean;
  frame: number;
  easing: EasingSpec;
  stagger: number;
  direction: StaggerDirection;
  units: StateUnit[];
  colouring: ResolvedColouring;
  textBox: Box2;
}

export interface SculptGlyph {
  /** Slot index: letter i of every look. */
  index: number;
  text: string;
  line: number;
  word: number;
  /** Placement of the letter's anchor in the first look, em. */
  rest: [number, number, number];
  /** Pivot for pose and deformers, in the letter's own em space: the base centre of its ink, or the top for a swing. */
  pivot: [number, number, number];
  /** The letter's solid in the first look (empty if it first appears in a later key). */
  solid: GlyphSolid;
  /** Frame on which the letter starts to arrive. */
  start: number;
}

export interface SculpturalTextPlan {
  spec: SculpturalTextSpec;
  glyphs: SculptGlyph[];
  /** Pixels per em of the first look's font. */
  size: number;
  /** Text block size of the first look, em. */
  block: { width: number; height: number };
  enterFrames: number;
  /** First frame of the entrance and the frame the last letter has settled (including the last key). */
  frames: { start: number; settled: number };
  diagnostics: Diagnostic[];
  /** Looks in time order (the spec's own, then each key's). */
  readonly states: readonly SculptState[];
}

const ENTER_FRAMES_30: Record<SculptEnter, number> = { drop: 22, unfold: 26, twist: 24, inflate: 22, swing: 34, rise: 18, none: 1 };

function boxOfUnits(units: StateUnit[], width: number, heightScale: number): Box2 {
  const box: Box2 = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const unit of units) {
    const b = unit.solid.box;
    box.minX = Math.min(box.minX, unit.placement[0] + b.minX * width);
    box.maxX = Math.max(box.maxX, unit.placement[0] + b.maxX * width);
    box.minY = Math.min(box.minY, unit.placement[1] + b.minY * heightScale);
    box.maxY = Math.max(box.maxY, unit.placement[1] + b.maxY * heightScale);
  }
  return Number.isFinite(box.minX) ? box : { minX: -0.5, minY: -0.5, maxX: 0.5, maxY: 0.5 };
}

/** Lay out every look, build every still solid and schedule the entrance. Needs a canvas (see `createCanvas`). */
export function planSculpturalText(spec: SculpturalTextSpec): SculpturalTextPlan {
  const diagnostics: Diagnostic[] = [];
  const fps = fpsRatio(spec.fps ?? DEFAULT_FPS);
  const base: SculptLook = {
    text: spec.text, font: spec.font,
    profile: spec.profile ?? DEFAULT_LOOK.profile, depth: Math.max(spec.depth ?? DEFAULT_LOOK.depth, 0),
    width: spec.width ?? 1, height: spec.height ?? 1, tracking: spec.tracking ?? 0,
    color: spec.color ?? DEFAULT_LOOK.color, sideColor: spec.sideColor, gradient: spec.gradient,
  };
  const startFrame = spec.startFrame ?? 0;
  const keys = [...(spec.keys ?? [])].sort((a, b) => a.frame - b.frame);
  const looks: { look: SculptLook; frame: number; easing: EasingSpec; stagger: number; direction: StaggerDirection }[] = [
    { look: base, frame: startFrame, easing: "ease-in-out", stagger: 0, direction: "forward" },
  ];
  for (const key of keys) {
    const previous = looks[looks.length - 1].look;
    const { gradient, sideColor, ...rest } = key.look;
    const look: SculptLook = { ...previous, ...rest, depth: Math.max(key.look.depth ?? previous.depth, 0) };
    if (gradient !== undefined) look.gradient = gradient ?? undefined;
    if (sideColor !== undefined) look.sideColor = sideColor ?? undefined;
    looks.push({ look, frame: key.frame, easing: key.easing ?? "ease-in-out", stagger: Math.max(0, key.stagger ?? 0), direction: key.direction ?? "forward" });
  }

  const layouts = new Map<string, { units: Omit<StateUnit, "placement" | "solid">[]; rests: [number, number][]; lines: number[] }>();
  const layoutOf = (look: SculptLook) => {
    const key = `${look.text}\u0000${look.font}`;
    let cached = layouts.get(key);
    if (!cached) {
      const layout = layoutGlyphs(look.text, { ...spec, font: look.font });
      const size = layout.size;
      const inked = layout.units.filter((unit) => !unit.blank);
      const units = inked.map((unit) => {
        const anchorX = unit.left + unit.width / 2;
        const anchorY = unit.penY;
        const field = signedDistanceField(unit.alpha, unit.width, unit.height);
        return {
          text: unit.text, line: unit.line, word: unit.word, size, thickest: thickestStroke(field),
          field: { field, width: unit.width, height: unit.height, originX: unit.left - anchorX, originY: unit.top - anchorY },
        };
      });
      const rests = inked.map((unit): [number, number] => [(unit.left + unit.width / 2 - layout.width / 2) / size, (layout.height / 2 - unit.penY) / size]);
      cached = { units, rests, lines: inked.map((unit) => unit.line) };
      layouts.set(key, cached);
    }
    return cached;
  };

  const solidOf = (unit: Omit<StateUnit, "placement" | "solid">, look: SculptLook, step: number): GlyphSolid => buildGlyphSolid(
    { width: unit.field.width, height: unit.field.height, left: unit.field.originX, top: unit.field.originY, penX: 0, penY: 0 },
    unit.field.field, { profile: look.profile, depth: look.depth, size: unit.size, step, back: spec.back, creaseAngle: spec.creaseAngle, smoothNormals: spec.smoothNormals },
  );

  const solids = new Map<string, GlyphSolid>();
  const states: SculptState[] = looks.map(({ look, frame, easing, stagger, direction }) => {
    const layout = layoutOf(look);
    const lineCounts = new Map<number, number>();
    for (const line of layout.lines) lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
    const lineSeen = new Map<number, number>();
    const units: StateUnit[] = layout.units.map((unit, i) => {
      const line = layout.lines[i];
      const order = lineSeen.get(line) ?? 0;
      lineSeen.set(line, order + 1);
      const key = `${look.text}\u0000${look.font}\u0000${i}\u0000${JSON.stringify(look.profile)}\u0000${look.depth}`;
      let solid = solids.get(key);
      if (!solid) {
        solid = solidOf(unit, look, spec.step ?? 1);
        solids.set(key, solid);
      }
      const [rx, ry] = layout.rests[i];
      return { ...unit, solid, placement: [rx * look.width + look.tracking * (order - ((lineCounts.get(line) ?? 1) - 1) / 2), ry * look.height] };
    });
    return { look, hold: false, frame, easing, stagger, direction, units, colouring: resolveColouring(look), textBox: boxOfUnits(units, look.width, look.height) };
  });
  for (let k = 1; k < states.length; k += 1) states[k].hold = JSON.stringify(states[k].look) === JSON.stringify(states[k - 1].look);

  const first = states[0];
  const slotCount = Math.max(...states.map((state) => state.units.length));
  if (slotCount === 0) diagnostics.push(createDiagnostic("sculpt-empty", "warning", `Sculptural text "${spec.id}" has no visible units.`));
  if (slotCount > 48) diagnostics.push(createDiagnostic("sculpt-many-units", "warning", `Sculptural text "${spec.id}" has ${slotCount} units; each is a solid. Keep titles short, or use unit: "word".`));
  for (let k = 1; k < states.length; k += 1) {
    if (states[k].frame <= states[k - 1].frame) diagnostics.push(createDiagnostic("sculpt-key-order", "warning", `Key ${k} of "${spec.id}" is not after the previous one; it changes the look at once.`));
  }

  const enter = spec.motion?.enter ?? "drop";
  const enterFrames = Math.max(1, Math.round(spec.motion?.frames ?? (ENTER_FRAMES_30[enter] * fps) / 30));
  const groupBy = spec.groupBy ?? "none";
  const groups = first.units.map((unit) => ({ group: groupBy === "word" ? Math.max(unit.word, 0) : groupBy === "line" ? unit.line : 0 }));
  const starts = staggerStartFrames(groups, Math.max(0, spec.stagger ?? 3), spec.direction ?? "forward", Math.max(0, spec.groupGap ?? 0));
  const glyphs: SculptGlyph[] = Array.from({ length: slotCount }, (_, i) => {
    const unit = first.units[i];
    const solid = unit?.solid ?? emptySolid();
    return {
      index: i, text: unit?.text ?? "", line: unit?.line ?? 0, word: unit?.word ?? -1,
      rest: [unit?.placement[0] ?? 0, unit?.placement[1] ?? 0, 0],
      pivot: pivotOf(solid, enter), solid, start: startFrame + (starts[i] ?? 0),
    };
  });
  const lastStart = glyphs.reduce((last, glyph) => Math.max(last, glyph.start), startFrame);
  const lastState = states[states.length - 1];
  const keyEnd = lastState.frame + lastState.stagger * Math.max(0, slotCount - 1);
  return {
    spec, glyphs, size: first.units[0]?.size ?? 1, enterFrames, diagnostics, states,
    block: { width: first.textBox.maxX - first.textBox.minX, height: first.textBox.maxY - first.textBox.minY },
    frames: { start: startFrame, settled: Math.max(lastStart + enterFrames, keyEnd) },
  };
}

function pivotOf(solid: GlyphSolid, enter: SculptEnter): [number, number, number] {
  const box = solid.box;
  const y = enter === "swing" ? box.maxY : Math.max(box.minY, Math.min(0, box.maxY));
  return [(box.minX + box.maxX) / 2, y, 0];
}

/* ------------------------------------------------------------------ *
 * Poses (entrance and idle)
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
 * The entrance and idle pose of one letter at a frame. Pure: it reads only the plan and the frame. `reducedMotion`
 * shows every letter at rest with no idle motion.
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
        // Real time since contact, not the clamped entrance progress, so the spring always comes to rest.
        const since = (t - fall * duration) / fps;
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
 * Looks over time
 * ------------------------------------------------------------------ */

/** Where a letter is between looks at a frame: the two states and the eased progress from one to the other. */
export interface LookPhase {
  from: number;
  to: number;
  /** Eased 0–1 (may overshoot with a back or elastic easing). */
  t: number;
}

/**
 * The look phase of letter `slot` at `frame`. Pure. Keys follow keyframe semantics: the look reaches each key at that
 * key's frame, changing over the gap from the previous key (a key with an empty look holds). With a stagger, each
 * letter's window starts `rank × stagger` frames later and is shorter by the total stagger, so every letter still lands
 * on the key's frame.
 */
export function lookPhase(plan: SculpturalTextPlan, slot: number, frame: number): LookPhase {
  const states = plan.states;
  let k = 0;
  while (k + 1 < states.length && frame >= states[k + 1].frame) k += 1;
  if (k + 1 >= states.length || frame < states[0].frame) return { from: k, to: k, t: 0 };
  const from = states[k];
  const to = states[k + 1];
  if (to.hold) return { from: k, to: k, t: 0 };
  const count = Math.max(1, plan.glyphs.length);
  const rank = staggerOrder(count, to.direction)[slot] ?? slot;
  const gap = to.frame - from.frame;
  const span = Math.max(1, gap - to.stagger * (count - 1));
  const raw = (frame - from.frame - rank * to.stagger) / span;
  if (raw <= 0) return { from: k, to: k, t: 0 };
  if (raw >= 1) return { from: k + 1, to: k + 1, t: 0 };
  return { from: k, to: k + 1, t: evaluateEasing(to.easing, raw) };
}

/* ------------------------------------------------------------------ *
 * Frame evaluation
 * ------------------------------------------------------------------ */

export interface SculptGlyphFrame {
  glyph: SculptGlyph;
  pose: GlyphPose;
  /** False before the letter arrives, and while a letter that does not exist in the current look is absent. */
  visible: boolean;
  /** The solid currently drawn (a still solid, or this frame's morph). */
  solid: GlyphSolid;
  /** Current positions and normals (deformed when needed); new arrays whenever `geometryChanged`. */
  positions: Float32Array;
  normals: Float32Array;
  /** Linear RGB per vertex from the look's colour or gradient. */
  colors: Float32Array;
  /** Anchor placement in the text block, em, and the letter's width and height scale. */
  placement: [number, number, number];
  scale: [number, number, number];
  /** Pivot in the letter's own em space. */
  pivot: [number, number, number];
  /** The vertex layout changed: renderers rebuild their attributes and index. */
  geometryChanged: boolean;
  /** Positions or normals changed. */
  changed: boolean;
  colorsChanged: boolean;
}

interface SlotMemo {
  key: string;
  solid: GlyphSolid;
}

/**
 * Evaluates a plan frame by frame. Still letters keep their buffers; a letter re-allocates only while it morphs between
 * outlines (its vertex count changes every frame).
 */
export class SculpturalText {
  readonly plan: SculpturalTextPlan;
  readonly glyphs: SculptGlyphFrame[];
  private readonly deformed: boolean[];
  private readonly memo: (SlotMemo | null)[];
  private readonly colourKeys: string[];
  private readonly scratch: DeformScratch = createDeformScratch();
  private first = true;

  constructor(specOrPlan: SculpturalTextSpec | SculpturalTextPlan) {
    this.plan = "states" in specOrPlan ? specOrPlan : planSculpturalText(specOrPlan);
    this.glyphs = this.plan.glyphs.map((glyph) => ({
      glyph, visible: false, pose: { visible: true, offset: [0, 0, 0], rotation: [0, 0, 0], scale: 1, deformers: [] },
      solid: glyph.solid, positions: Float32Array.from(glyph.solid.positions), normals: Float32Array.from(glyph.solid.normals),
      colors: new Float32Array(glyph.solid.positions.length), placement: [...glyph.rest], scale: [1, 1, 1], pivot: [...glyph.pivot],
      geometryChanged: true, changed: true, colorsChanged: true,
    }));
    this.deformed = this.glyphs.map(() => false);
    this.memo = this.glyphs.map(() => null);
    this.colourKeys = this.glyphs.map(() => "");
  }

  /** Evaluate every letter at `frame`. */
  update(frame: number, reducedMotion = false): readonly SculptGlyphFrame[] {
    const { plan } = this;
    const enter = plan.spec.motion?.enter ?? "drop";
    // The first update reports everything as new, so renderers build their attributes.
    const first = this.first;
    this.first = false;
    this.glyphs.forEach((state, i) => {
      state.geometryChanged = first;
      state.changed = first;
      state.colorsChanged = false;
      const pose = glyphPose(plan, state.glyph, frame, reducedMotion);
      state.pose = pose;
      const phase = reducedMotion ? { from: plan.states.length - 1, to: plan.states.length - 1, t: 0 } : lookPhase(plan, i, frame);
      const a = plan.states[phase.from];
      const b = plan.states[phase.to];
      const unitA = a.units[i];
      const unitB = b.units[i];
      const t = phase.t;
      const moving = phase.from !== phase.to;

      // Geometry: a still solid, the same solid with height/depth deformers, or a morph between outlines.
      const extra: Deformer[] = [];
      let solid: GlyphSolid;
      let solidKey: string;
      if (!moving || !unitA && !unitB) {
        solid = unitA?.solid ?? emptySolid();
        solidKey = `still:${phase.from}:${i}`;
      } else if (unitA && unitB && sameOutline(a.look, b.look) && sameProfileShape(a.look.profile, b.look.profile)) {
        solid = unitA.solid;
        solidKey = `still:${phase.from}:${i}`;
        const ha = profileHeight(a.look.profile);
        const hb = profileHeight(b.look.profile);
        if (ha > 0) extra.push({ kind: "inflate", amount: (ha + (hb - ha) * t) / ha });
        if (a.look.depth > 0) extra.push({ kind: "extrude", amount: (a.look.depth + (b.look.depth - a.look.depth) * t) / a.look.depth });
      } else {
        solidKey = `morph:${phase.from}:${phase.to}:${i}:${t.toFixed(5)}`;
        solid = this.memo[i]?.key === solidKey ? this.memo[i]!.solid : this.morphSolid(unitA, unitB, a.look, b.look, t);
        this.memo[i] = { key: solidKey, solid };
      }
      const visible = pose.visible && solid.positions.length > 0;
      state.visible = visible;
      if (solid !== state.solid) {
        state.solid = solid;
        state.positions = Float32Array.from(solid.positions);
        state.normals = Float32Array.from(solid.normals);
        state.colors = new Float32Array(solid.positions.length);
        state.geometryChanged = true;
        state.changed = true;
        this.deformed[i] = false;
        this.colourKeys[i] = "";
      }
      state.pivot = pivotOf(solid, enter);

      // Placement and scale interpolate between the two looks; a letter that only exists on one side stays put.
      const pa = unitA?.placement ?? unitB?.placement ?? [0, 0];
      const pb = unitB?.placement ?? pa;
      state.placement = [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, 0];
      state.scale = [a.look.width + (b.look.width - a.look.width) * t, a.look.height + (b.look.height - a.look.height) * t, 1];

      const stack = extra.length ? [...extra, ...pose.deformers] : pose.deformers;
      if (visible && !isIdentityStack(stack)) {
        deformInto(stack, state.pivot, solid.positions, solid.normals, state.positions, state.normals, this.scratch);
        this.deformed[i] = true;
        state.changed = true;
      } else if (this.deformed[i]) {
        state.positions.set(solid.positions);
        state.normals.set(solid.normals);
        this.deformed[i] = false;
        state.changed = true;
      }

      const colourKey = `${solidKey}:${moving ? t.toFixed(4) : "rest"}:${phase.from}:${phase.to}`;
      if (visible && colourKey !== this.colourKeys[i]) {
        this.colourKeys[i] = colourKey;
        this.writeColours(state, a, b, moving ? t : 0);
        state.colorsChanged = true;
      }
    });
    return this.glyphs;
  }

  private morphSolid(unitA: StateUnit | undefined, unitB: StateUnit | undefined, lookA: SculptLook, lookB: SculptLook, t: number): GlyphSolid {
    // Blend straight into a grid at the morph resolution (the larger font size divided by `morphStep`), so the blend,
    // the smoothing and the mesh all run on that coarser grid. A missing letter is an empty field.
    const step = Math.max(1, Math.round(this.plan.spec.morphStep ?? 2));
    const size = Math.max(unitA?.size ?? 0, unitB?.size ?? 0, 1) / step;
    const place = (unit: StateUnit | undefined): PlacedField | null => unit
      ? { ...unit.field, originX: unit.field.originX * (size / unit.size), originY: unit.field.originY * (size / unit.size), scale: size / unit.size }
      : null;
    const fa = place(unitA);
    const fb = place(unitB);
    // An empty side sits just outside everywhere: a new letter grows from its thickest strokes over the whole change,
    // and a vanishing one erodes from its thinnest.
    const blended = blendFields(fa, fb, t, 1);
    const thickest = thickestStroke(blended.field);
    const resolve = (look: SculptLook): ResolvedProfile => resolveProfile(look.profile, size, thickest);
    const profile = blendProfiles(resolve(lookA), resolve(lookB), t);
    const chisel = lookA.profile.kind === "chisel" || lookB.profile.kind === "chisel" || lookA.profile.kind === "flat" || lookB.profile.kind === "flat";
    return buildGlyphSolid(
      { width: blended.width, height: blended.height, left: blended.originX, top: blended.originY, penX: 0, penY: 0 },
      blended.field,
      {
        profile: lookB.profile, resolvedProfile: profile, depth: lookA.depth + (lookB.depth - lookA.depth) * t, size,
        step: 1, back: this.plan.spec.back, creaseAngle: this.plan.spec.creaseAngle,
        smoothNormals: this.plan.spec.smoothNormals ?? (chisel ? 0 : 1),
      },
    );
  }

  private writeColours(state: SculptGlyphFrame, a: SculptState, b: SculptState, t: number): void {
    const { solid, colors, placement, scale } = state;
    const count = solid.positions.length / 3;
    const letterBox: Box2 = { minX: solid.box.minX, minY: solid.box.minY, maxX: solid.box.maxX, maxY: solid.box.maxY };
    const ca: LinearRgb = [0, 0, 0];
    const cb: LinearRgb = [0, 0, 0];
    const [wallStart] = solid.ranges.wall;
    const blend = t > 0 && a !== b;
    for (let v = 0; v < count; v += 1) {
      const lx = solid.positions[3 * v];
      const ly = solid.positions[3 * v + 1];
      const x = placement[0] + lx * scale[0];
      const y = placement[1] + ly * scale[1];
      const side = v >= wallStart;
      colouringAt(a.colouring, x, y, side, a.textBox, letterBox, ca);
      if (blend) {
        colouringAt(b.colouring, x, y, side, b.textBox, letterBox, cb);
        colors[3 * v] = ca[0] + (cb[0] - ca[0]) * t;
        colors[3 * v + 1] = ca[1] + (cb[1] - ca[1]) * t;
        colors[3 * v + 2] = ca[2] + (cb[2] - ca[2]) * t;
      } else {
        colors[3 * v] = ca[0];
        colors[3 * v + 1] = ca[1];
        colors[3 * v + 2] = ca[2];
      }
    }
  }
}

