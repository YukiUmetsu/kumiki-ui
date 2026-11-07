/** Cinematic shader effects as validated data. This module holds no GPU code and no shader source: a spec names one
 * registered effect and its bounded parameters, and `shader-fx-react` draws it. A film or a recipe can therefore carry
 * effects without the renderer in its dependency closure.
 * Time is a pure function of the frame. The renderer has no clock, so a seek cannot change the picture.
 */
import type { RationalFps } from "../motion/types";
import type { FocusRegion, ImageAsset } from "./scene-templates";

export const SHADER_FX_EFFECTS = ["mesh-gradient", "liquid-metal", "god-rays", "grain-gradient", "water", "halftone-dots"] as const;
export type ShaderFxEffect = (typeof SHADER_FX_EFFECTS)[number];
export type ShaderFxTreatment = "subtle" | "standard" | "hero";
/** `background` sits behind the scene, which then drops its own canvas. `overlay` sits above the scene, in `region`. */
export type ShaderFxLayerKind = "background" | "overlay";

interface ShaderFxBase {
  /** Stable name. Reports and asset rights use it. */
  id: string;
  layer: ShaderFxLayerKind;
  /** First frame, relative to the host. @default 0 */
  startFrame?: number;
  /** @default the rest of the host */
  durationFrames?: number;
  /** Picks a different moment of the effect, so two scenes with one palette do not look alike. @default 0 */
  seed?: number;
  /** How strong the effect is. Each effect sets its own numbers. @default "subtle" */
  treatment?: ShaderFxTreatment;
  /** Share of normal speed. @default the treatment's rate */
  rate?: number;
  /** Where an overlay sits, as fractions of the frame. @default the whole frame */
  region?: FocusRegion;
  /** Fade in and out, in frames. Reduced motion drops it. @default 12 */
  fadeFrames?: number;
}
/** A colour is `#rrggbb`, `#rrggbbaa`, or a design token such as `--km-accent`. */
export type ShaderFxColor = string;
export interface MeshGradientFx extends ShaderFxBase { effect: "mesh-gradient"; params?: { colors?: readonly ShaderFxColor[]; distortion?: number; swirl?: number; grain?: number } }
export interface LiquidMetalFx extends ShaderFxBase { effect: "liquid-metal";
  /** The silhouette: a shape on a plain or transparent ground. Without it, `shape` draws one. */
  image?: ImageAsset;
  params?: { shape?: "circle" | "daisy" | "diamond" | "metaballs"; tint?: ShaderFxColor; back?: ShaderFxColor; repetition?: number; contour?: number; softness?: number; distortion?: number; angle?: number; scale?: number } }
export interface GodRaysFx extends ShaderFxBase { effect: "god-rays"; params?: { colors?: readonly ShaderFxColor[]; bloomColor?: ShaderFxColor; back?: ShaderFxColor; density?: number; spotty?: number; intensity?: number; bloom?: number; midSize?: number; midIntensity?: number; originY?: number } }
export interface GrainGradientFx extends ShaderFxBase { effect: "grain-gradient"; params?: { colors?: readonly ShaderFxColor[]; back?: ShaderFxColor; softness?: number; intensity?: number; noise?: number; shape?: "wave" | "dots" | "truchet" | "corners" | "ripple" | "blob" | "sphere" } }
export interface WaterFx extends ShaderFxBase { effect: "water";
  /** The picture under the water. It is required: this effect refracts an image. */
  image: ImageAsset;
  params?: { highlights?: number; layering?: number; edges?: number; waves?: number; caustic?: number; size?: number } }
export interface HalftoneDotsFx extends ShaderFxBase { effect: "halftone-dots";
  /** The picture to print in dots. It is required: this effect screens an image. */
  image: ImageAsset;
  params?: { front?: ShaderFxColor; back?: ShaderFxColor; size?: number; radius?: number; contrast?: number; originalColors?: boolean; grid?: "square" | "hex"; type?: "classic" | "gooey" | "holes" | "soft" } }
export type ShaderFxSpec = MeshGradientFx | LiquidMetalFx | GodRaysFx | GrainGradientFx | WaterFx | HalftoneDotsFx;

export interface ShaderFxProblem { path: string; code: "shader-fx-range" | "shader-fx-color" | "shader-fx-timing" | "shader-fx-region" | "shader-fx-id" | "shader-fx-budget"; message: string; hint?: string }

/** Inclusive limits of each number. A value outside them fails, so no agent can ask for a blinding or unreadable look. */
const LIMITS: Readonly<Record<string, readonly [number, number]>> = {
  distortion: [0, 1], swirl: [0, 1], grain: [0, .4], repetition: [1, 10], contour: [0, 1], softness: [0, 1], angle: [0, 360], scale: [.1, 4],
  density: [0, 1], spotty: [0, 1], intensity: [0, 1], bloom: [0, 1], midSize: [0, 1], midIntensity: [0, 1], originY: [-1, 1], noise: [0, 1],
  highlights: [0, 1], layering: [0, 1], edges: [0, 1], waves: [0, 1], caustic: [0, 1], size: [.01, 2], radius: [0, 2], contrast: [0, 1],
};
const NIGHT = ["#0a1a28", "#14384d", "#1f5a66", "#102a3c"] as const;
/** Conservative by design: `subtle` is the default, and `hero` is for one moment in a film. */
const TREATMENTS: Readonly<Record<ShaderFxEffect, Readonly<Record<ShaderFxTreatment, Readonly<Record<string, unknown>>>>>> = {
  "mesh-gradient": {
    subtle: { rate: .25, colors: NIGHT, distortion: .5, swirl: .1, grain: .05 },
    standard: { rate: .4, colors: NIGHT, distortion: .8, swirl: .25, grain: .05 },
    hero: { rate: .6, colors: NIGHT, distortion: 1, swirl: .5, grain: .08 },
  },
  "liquid-metal": {
    subtle: { rate: .35, shape: "diamond", tint: "#ffffff", back: "#00000000", repetition: 2, contour: .4, softness: .1, distortion: .05, angle: 70, scale: .7 },
    standard: { rate: .6, shape: "diamond", tint: "#ffffff", back: "#00000000", repetition: 3, contour: .5, softness: .1, distortion: .08, angle: 70, scale: .7 },
    hero: { rate: 1, shape: "diamond", tint: "#ffffff", back: "#00000000", repetition: 4, contour: .6, softness: .08, distortion: .12, angle: 70, scale: .7 },
  },
  "god-rays": {
    subtle: { rate: .3, colors: ["#ffe9c44d", "#ffd9a033"], bloomColor: "#ffdca8", back: "#00000000", density: .25, spotty: .3, intensity: .45, bloom: .25, midSize: .2, midIntensity: .2, originY: -.55 },
    standard: { rate: .45, colors: ["#ffe9c477", "#ffd9a055"], bloomColor: "#ffdca8", back: "#00000000", density: .3, spotty: .3, intensity: .6, bloom: .35, midSize: .25, midIntensity: .3, originY: -.55 },
    hero: { rate: .6, colors: ["#ffe9c4aa", "#ffd9a088"], bloomColor: "#ffdca8", back: "#00000000", density: .35, spotty: .35, intensity: .8, bloom: .5, midSize: .3, midIntensity: .4, originY: -.55 },
  },
  "grain-gradient": {
    subtle: { rate: .2, colors: ["#14384d", "#1f5a66"], back: "#0a1a28", softness: .8, intensity: .2, noise: .15, shape: "corners" },
    standard: { rate: .35, colors: ["#14384d", "#1f5a66", "#2c6f73"], back: "#0a1a28", softness: .6, intensity: .35, noise: .25, shape: "corners" },
    hero: { rate: .5, colors: ["#14384d", "#1f5a66", "#3d8a84"], back: "#0a1a28", softness: .5, intensity: .5, noise: .35, shape: "wave" },
  },
  water: {
    subtle: { rate: .25, highlights: .02, layering: .15, edges: .15, waves: .04, caustic: .03, size: 1 },
    standard: { rate: .35, highlights: .04, layering: .25, edges: .3, waves: .08, caustic: .06, size: 1 },
    hero: { rate: .5, highlights: .07, layering: .4, edges: .5, waves: .16, caustic: .12, size: 1 },
  },
  "halftone-dots": {
    subtle: { rate: 0, front: "#0a1a28", back: "#f2f1e8", size: .35, radius: 1.1, contrast: .4, originalColors: false, grid: "hex", type: "classic" },
    standard: { rate: 0, front: "#0a1a28", back: "#f2f1e8", size: .5, radius: 1.25, contrast: .5, originalColors: false, grid: "hex", type: "gooey" },
    hero: { rate: 0, front: "#0a1a28", back: "#f2f1e8", size: .65, radius: 1.4, contrast: .6, originalColors: false, grid: "hex", type: "gooey" },
  },
};

/** Treatment defaults under the author's values. Pure, so a review can state what a preset does. */
export function resolveShaderFxParams(spec: ShaderFxSpec): Record<string, unknown> & { rate: number } {
  const base = TREATMENTS[spec.effect][spec.treatment ?? "subtle"], authored = Object.fromEntries(Object.entries(spec.params ?? {}).filter(([, value]) => value !== undefined));
  return { ...base, ...authored, rate: spec.rate ?? (base.rate as number) };
}

const SEED_STEP_MS = 7919;
/** The effect's own time in milliseconds at a host frame. It uses rational FPS, so 29.97 stays exact over a long film. */
export function shaderFxTimeMs(spec: ShaderFxSpec, frame: number, fps: RationalFps, reducedMotion = false): number {
  const local = reducedMotion ? 0 : Math.max(0, frame - (spec.startFrame ?? 0));
  return (spec.seed ?? 0) * SEED_STEP_MS + local * 1000 * fps.den / fps.num * resolveShaderFxParams(spec).rate;
}
/** Whether the effect draws at this frame, and its opacity there. */
export function shaderFxEnvelope(spec: ShaderFxSpec, frame: number, hostDurationFrames: number, reducedMotion = false): { active: boolean; opacity: number } {
  const start = spec.startFrame ?? 0, end = start + (spec.durationFrames ?? hostDurationFrames - start), fade = reducedMotion ? 0 : spec.fadeFrames ?? 12;
  if (frame < start || frame >= end) return { active: false, opacity: 0 };
  if (!fade || spec.layer === "background") return { active: true, opacity: 1 };
  // An effect that runs to the end of its host leaves with the host, so a fade there would only dim the last frames.
  return { active: true, opacity: Math.min(1, (frame - start + 1) / fade, end >= hostDurationFrames ? 1 : (end - frame) / fade) };
}

const COLOR = /^(#[0-9a-f]{6}([0-9a-f]{2})?|--km-[a-z0-9-]+)$/i;
/** Every problem with one spec. `path` is a JSON Pointer relative to the spec. */
export function inspectShaderFx(spec: ShaderFxSpec, hostDurationFrames: number): ShaderFxProblem[] {
  const problems: ShaderFxProblem[] = [], start = spec.startFrame ?? 0, duration = spec.durationFrames ?? hostDurationFrames - start;
  if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(duration) || duration < 1 || start + duration > hostDurationFrames)
    problems.push({ path: "/startFrame", code: "shader-fx-timing", message: `Frames ${start} to ${start + duration} do not fit inside ${hostDurationFrames} frames.`, hint: "Keep the effect inside its scene." });
  if (spec.rate !== undefined && !(spec.rate >= 0 && spec.rate <= 2)) problems.push({ path: "/rate", code: "shader-fx-range", message: `rate ${spec.rate} is outside 0 to 2.` });
  const box = spec.region;
  if (box && (spec.layer !== "overlay" || ![box.x, box.y, box.width, box.height].every(value => value >= 0 && value <= 1) || box.x + box.width > 1 || box.y + box.height > 1 || !box.width || !box.height))
    problems.push({ path: "/region", code: "shader-fx-region", message: spec.layer === "overlay" ? "The region does not fit inside the frame." : "Only an overlay has a region.", hint: "Use fractions of the frame." });
  for (const [key, value] of Object.entries(spec.params ?? {})) {
    const limit = LIMITS[key], path = "/params/" + key;
    if (limit && typeof value === "number" && !(value >= limit[0] && value <= limit[1])) problems.push({ path, code: "shader-fx-range", message: `${key} ${value} is outside ${limit[0]} to ${limit[1]}.` });
    for (const [index, color] of (key === "colors" ? value as readonly string[] : []).entries()) if (!COLOR.test(color)) problems.push({ path: `${path}/${index}`, code: "shader-fx-color", message: `"${color}" is not a colour.`, hint: "Use #rrggbb, #rrggbbaa or a --km- token." });
    if (["tint", "back", "bloomColor", "front"].includes(key) && !COLOR.test(String(value))) problems.push({ path, code: "shader-fx-color", message: `"${String(value)}" is not a colour.`, hint: "Use #rrggbb, #rrggbbaa or a --km- token." });
    if (key === "colors" && !((value as readonly string[]).length >= 2 && (value as readonly string[]).length <= 6)) problems.push({ path, code: "shader-fx-range", message: "An effect takes 2 to 6 colours." });
  }
  return problems;
}
/** Images that an effect draws, for the rights and reachability checks of an export. */
export const shaderFxAssets = (spec: ShaderFxSpec): ImageAsset[] => ("image" in spec && spec.image ? [spec.image] : []);
