import { evaluatePencilMark, inspectPencilDrawing } from "./colored-pencil";
import type { PencilDrawingSpec, PencilTiming } from "./colored-pencil";

/** Frame-addressable camera for an authored paper scene, NOT an independent film timebase. */
export interface PencilCamera extends PencilTiming {
  /** Paper-unit translation X/Y and uniform zoom. */
  from: readonly [number, number, number];
  to: readonly [number, number, number];
}
export interface PencilAnnotationBase extends PencilTiming {
  id: string;
  /** screen: stays in the reading zone; paper: moves with the illustration. */
  space?: "screen" | "paper";
}
export type PencilAnnotation =
  | (PencilAnnotationBase & {
      type: "text" | "metric";
      text: string | readonly string[];
      at: readonly [number, number];
      color: string;
      size: number;
      font?: "serif" | "sans" | "mono";
      /** Required for measurements, quantities and other source-dependent values. */
      provenance?: string;
    })
  | (PencilAnnotationBase & {
      type: "callout";
      label: string;
      path: string;
      at: readonly [number, number];
      color: string;
      size?: number;
    })
  | (PencilAnnotationBase & {
      type: "stroke";
      path: string;
      width: number;
      color: string;
    });

/** A topic-neutral CP2 material scene. Existing FD1 still owns shots/cuts and soundtrack. */
export interface PencilSceneSpec {
  version: 1;
  drawing: PencilDrawingSpec;
  camera?: PencilCamera;
  annotations?: readonly PencilAnnotation[];
}
export type EvaluatedPencilCamera = Readonly<{ x: number; y: number; zoom: number }>;
const HEX = /^#[\da-f]{6}$/i;
const safePath = (path: unknown): boolean =>
  typeof path === "string" && /^[Mm]/.test(path) && path.length >= 4 && path.length <= 12000 &&
  !/[<>{}]/.test(path);
const xy = (at: unknown, width: number, height: number): at is readonly [number, number] =>
  Array.isArray(at) && at.length === 2 &&
  at.every(v => typeof v === "number" && Number.isFinite(v)) &&
  at[0] >= 0 && at[0] <= width && at[1] >= 0 && at[1] <= height;
const timing = (item: Record<string, unknown>): boolean =>
  Number.isSafeInteger(item.startFrame) && (item.startFrame as number) >= 0 &&
  Number.isSafeInteger(item.durationFrames) && (item.durationFrames as number) >= 1;
function cameraPose(point: unknown, width: number, height: number): point is readonly [number, number, number] {
  return Array.isArray(point) && point.length === 3 &&
    point.every(v => typeof v === "number" && Number.isFinite(v)) &&
    Math.abs(point[0]) <= width / 2 && Math.abs(point[1]) <= height / 2 &&
    point[2] >= .7 && point[2] <= 2.6;
}
const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const linesOf = (value: unknown): string[] =>
  typeof value === "string" ? [value] : Array.isArray(value) && value.every(v => typeof v === "string") ? value : [];
const estimatedLineWidth = (text: string, fontSize: number) =>
  [...text].reduce((width, char) => width + (char.codePointAt(0)! > 0x2e80 ? 1 : .61) * fontSize, 0);

/** Returns actionable validation messages, including for malformed untyped portable JSON. */
export function inspectPencilScene(value: unknown): string[] {
  const scene = asRecord(value), issues: string[] = [];
  if (!scene) return ["scene: expected a CP2 object."];
  if (scene.version !== 1) issues.push("version: CP2 requires version 1.");
  const drawing = asRecord(scene.drawing);
  if (!drawing) return [...issues, "drawing: required CP1 artwork."];
  const width = typeof drawing.width === "number" && Number.isFinite(drawing.width) ? drawing.width : 0;
  const height = typeof drawing.height === "number" && Number.isFinite(drawing.height) ? drawing.height : 0;
  issues.push(...inspectPencilDrawing(drawing as unknown as PencilDrawingSpec).map(x => "drawing." + x));
  if (scene.camera !== undefined) {
    const camera = asRecord(scene.camera);
    if (!camera || !timing(camera) ||
        !cameraPose(camera.from, width, height) || !cameraPose(camera.to, width, height))
      issues.push("camera: finite zoom .7–2.6, bounded translation and valid timing required.");
  }
  if (scene.annotations === undefined) return issues;
  if (!Array.isArray(scene.annotations) || scene.annotations.length > 48)
    return [...issues, "annotations: expected at most 48 label/callout/stroke items."];
  const ids = new Set<string>();
  for (const [index, raw] of scene.annotations.entries()) {
    const a = asRecord(raw), at = "annotations[" + index + "]";
    if (!a) { issues.push(at + ": expected an annotation object."); continue; }
    if (typeof a.id !== "string" || !/^[A-Za-z][\w-]{0,48}$/.test(a.id) || ids.has(a.id))
      issues.push(at + ".id: unique short ID required.");
    if (typeof a.id === "string") ids.add(a.id);
    if (!timing(a)) issues.push(at + ".timing: requires nonnegative startFrame and positive durationFrames.");
    if (a.space !== undefined && a.space !== "screen" && a.space !== "paper")
      issues.push(at + ".space: expected paper or screen.");
    if (!HEX.test(String(a.color ?? ""))) issues.push(at + ".color: six-digit RGB hexadecimal colour required.");
    if (a.type === "stroke") {
      if (!safePath(a.path) || typeof a.width !== "number" ||
          !Number.isFinite(a.width) || a.width < .3 || a.width > 12)
        issues.push(at + ": invalid authored stroke path/width.");
      continue;
    }
    if (!xy(a.at, width, height)) {
      issues.push(at + ".at: must be a point inside the sheet.");
      continue;
    }
    if (a.type === "callout") {
      if (!safePath(a.path) || typeof a.label !== "string" || a.label.length < 1 || a.label.length > 70)
        issues.push(at + ": callout requires bounded path and label.");
      if (a.size !== undefined && (typeof a.size !== "number" || a.size < 12 || a.size > 64))
        issues.push(at + ".size: outside 12..64.");
      if (typeof a.label === "string" &&
          a.at[0] + estimatedLineWidth(a.label, typeof a.size === "number" ? a.size : 16) > width - 12)
        issues.push(at + ".label: would extend outside page.");
      continue;
    }
    if (a.type === "text" || a.type === "metric") {
      const textLines = linesOf(a.text);
      if (textLines.length < 1 || textLines.length > 3 || textLines.some(t => t.length < 1 || t.length > 70))
        issues.push(at + ".text: 1–3 short nonempty lines required.");
      if (typeof a.size !== "number" || !Number.isFinite(a.size) || a.size < 12 || a.size > 64)
        issues.push(at + ".size: outside 12..64.");
      else if (textLines.some(t => a.at[0] + estimatedLineWidth(t, a.size as number) > width - 12) ||
        a.at[1] + (textLines.length - 1) * a.size * 1.33 > height - 12)
        issues.push(at + ".text: would extend outside the reserved page.");
      if (a.font !== undefined && a.font !== "sans" && a.font !== "serif" && a.font !== "mono")
        issues.push(at + ".font: expected sans, serif or mono.");
      if (a.type === "metric" &&
          (typeof a.provenance !== "string" || a.provenance.trim().length < 4))
        issues.push(at + ".provenance: source required for displayed measured values.");
      continue;
    }
    issues.push(at + ".type: expected text, metric, callout or stroke.");
  }
  return issues;
}
export function pencilSceneProgress(frame: number, startFrame: number,
  durationFrames: number, reducedMotion = false): number {
  return evaluatePencilMark(frame, { startFrame, durationFrames }, reducedMotion);
}
export function evaluatePencilCamera(camera: PencilCamera | undefined, frame: number,
  reducedMotion = false): EvaluatedPencilCamera {
  const validate = (point: readonly [number, number, number]) =>
    point.length === 3 && point.every(Number.isFinite) &&
    Math.abs(point[0]) <= 4096 && Math.abs(point[1]) <= 4096 && point[2] >= .7 && point[2] <= 2.6;
  if (!camera) {
    evaluatePencilMark(frame, { startFrame: 0, durationFrames: 1 }, reducedMotion);
    return { x: 0, y: 0, zoom: 1 };
  }
  if (!validate(camera.from) || !validate(camera.to))
    throw new RangeError("Invalid pencil camera pose or zoom.");
  const t = pencilSceneProgress(frame, camera.startFrame, camera.durationFrames, reducedMotion);
  const eased = t * t * (3 - 2 * t);
  const mix = (index: number) => camera.from[index] +
    (camera.to[index] - camera.from[index]) * eased;
  return { x: mix(0), y: mix(1), zoom: mix(2) };
}
