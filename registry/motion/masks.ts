/**
 * `mask-reveal` — clip / alpha / luma matte with deterministic reveal sweep,
 * feather, transform and a predictable compositing order (docs/08 §3
 * `mask-reveal`).
 *
 * The reveal is a *geometric* sweep: the mask rect grows from its declared
 * origin along a resolved axis. Every function is pure — `evaluateMask` returns
 * a new sample and never mutates the spec.
 *
 * ## Ownership of `MaskSpec`
 * The frozen `types.ts` is data-only and does not carry mask shapes, so the
 * mask contract lives here with the geometry lane. `MaskSpecLocal` adds the
 * reveal axis without touching the frozen module (see {@link MaskSpecLocal}).
 */

import type { AffineMatrix, Rect } from "./types";

/** The three matte kinds a mask can resolve to. */
export const MASK_KINDS: Array<"clip" | "alpha" | "luma"> = ["clip", "alpha", "luma"];

/** Direction the reveal sweeps along. `"radial"` grows from the rect centre. */
export type MaskAxis =
  | "left-to-right"
  | "right-to-left"
  | "top-to-bottom"
  | "bottom-to-top"
  | "radial";

/** Matte declaration. Plain data, JSON-safe, renderer-neutral. */
export interface MaskSpec {
  /** Stable id used for diagnostics and ordering by the caller. */
  id?: string;
  kind: "clip" | "alpha" | "luma";
  /** Declaration rect in design px (top-left origin). */
  rect: Rect;
  /** Soft edge width in px. Default `0` (hard edge). */
  feather?: number;
  /** Compositing order; lower draws first. Default `0`. */
  order?: number;
  /** Optional transform applied to the mask geometry. */
  transform?: AffineMatrix;
}

/**
 * Local extension of {@link MaskSpec} adding the reveal axis. Kept out of the
 * frozen contract on purpose: renderers that ignore `axis` still consume a
 * valid `MaskSpec`.
 */
export type MaskSpecLocal = MaskSpec & { axis?: MaskAxis };

/** Resolved mask at one progress value. */
export interface MaskSample {
  id?: string;
  kind: "clip" | "alpha" | "luma";
  /** Resolved (swept) geometry at this progress. */
  rect: Rect;
  feather: number;
  /** Matte opacity: `progress` for alpha/luma, always `1` for clip. */
  opacity: number;
  order: number;
  axis: MaskAxis;
  transform?: AffineMatrix;
}

const DEFAULT_AXIS: MaskAxis = "left-to-right";

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

/** Grow the declaration rect from its origin along the resolved axis. */
function sweepRect(rect: Rect, axis: MaskAxis, progress: number): Rect {
  switch (axis) {
    case "right-to-left":
      return {
        x: rect.x + rect.width * (1 - progress),
        y: rect.y,
        width: rect.width * progress,
        height: rect.height,
      };
    case "top-to-bottom":
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height * progress };
    case "bottom-to-top":
      return {
        x: rect.x,
        y: rect.y + rect.height * (1 - progress),
        width: rect.width,
        height: rect.height * progress,
      };
    case "radial":
      return {
        x: rect.x + (rect.width * (1 - progress)) / 2,
        y: rect.y + (rect.height * (1 - progress)) / 2,
        width: rect.width * progress,
        height: rect.height * progress,
      };
    case "left-to-right":
    default:
      return { x: rect.x, y: rect.y, width: rect.width * progress, height: rect.height };
  }
}

/**
 * Resolve a mask at `progress` (clamped to `[0, 1]`). `opacity` is `progress`
 * for alpha/luma mattes and `1` for clip. Returns a fresh sample.
 */
export function evaluateMask(spec: MaskSpec, progress: number): MaskSample {
  const p = clamp01(progress);
  const axis = (spec as MaskSpecLocal).axis ?? DEFAULT_AXIS;
  const sample: MaskSample = {
    kind: spec.kind,
    rect: sweepRect(spec.rect, axis, p),
    feather: spec.feather ?? 0,
    opacity: spec.kind === "clip" ? 1 : p,
    order: spec.order ?? 0,
    axis,
  };
  if (spec.id !== undefined) sample.id = spec.id;
  if (spec.transform !== undefined) sample.transform = { ...spec.transform };
  return sample;
}

/**
 * Stable compositing order: sort by `order`, then by original array position so
 * equal orders keep their declaration order (no `Array#sort` instability).
 */
export function resolveMaskOrder(masks: MaskSample[]): MaskSample[] {
  return masks
    .map((mask, index) => ({ mask, index }))
    .sort((a, b) => (a.mask.order - b.mask.order) || (a.index - b.index))
    .map((entry) => entry.mask);
}

/**
 * Capability + fallback declaration for a matte kind, so a renderer that cannot
 * honour `luma` degrades to `alpha`, and one without alpha degrades to `clip`.
 */
export function maskCapability(spec: MaskSpec): { capability: string; fallback: string } {
  switch (spec.kind) {
    case "luma":
      return { capability: "mask-luma", fallback: "alpha" };
    case "alpha":
      return { capability: "mask-alpha", fallback: "clip" };
    case "clip":
    default:
      return { capability: "mask-clip", fallback: "none" };
  }
}
