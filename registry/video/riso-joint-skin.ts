/**
 * RISO4 — frame-pure tapered joint skins for hand-crafted print characters.
 *
 * A skin is a painted contour between two directly connected rig joints.
 * Unlike a static thigh / sleeve path, it follows both endpoints after IK,
 * never creates an independent clock, and inherits the parent stage transform.
 */
import type { RisoMatrix } from "./riso-character";

export interface RisoJointSkin {
  /** Must be a direct child of the ink part's owning joint. */
  tipJoint: string;
  /** Full contour width at the owning joint, in character-stage units. */
  baseWidth: number;
  /** Full contour width at the child joint, in character-stage units. */
  tipWidth: number;
  /** Extra coverage at each joint to avoid hairline cracks between segments. */
  overlap?: number;
  /** Signed centerline bow, for fabric or deliberately hand-shaped anatomy. */
  bow?: number;
}
interface Point { x: number; y: number }
const add = (a: Point, b: Point, n = 1): Point => ({ x: a.x + b.x * n, y: a.y + b.y * n });
const asPoint = (m: RisoMatrix): Point => ({ x: m.e, y: m.f });
const fmt = (n: number) => String(Number(n.toFixed(4)));
const xy = (p: Point) => `${fmt(p.x)} ${fmt(p.y)}`;

/**
 * Closed SVG ribbon with rounded overlapping ends. All coordinates are world
 * stage coordinates, and its consuming part must use an identity transform.
 * Widths respect each joint's evaluated scale, including parent scaling.
 */
export function risoJointSkinPath(
  base: RisoMatrix, tip: RisoMatrix, skin: RisoJointSkin,
): string {
  const A = asPoint(base), B = asPoint(tip);
  const dx = B.x - A.x, dy = B.y - A.y;
  const length = Math.hypot(dx, dy);
  // Folded/collapsed joints still produce a finite painterly mark.
  const direction: Point = length > 1e-7
    ? { x: dx / length, y: dy / length }
    : { x: base.a / Math.max(1e-7, Math.hypot(base.a, base.b)),
        y: base.b / Math.max(1e-7, Math.hypot(base.a, base.b)) };
  const perpendicular: Point = { x: -direction.y, y: direction.x };
  const baseScale = Math.hypot(base.a, base.b);
  const tipScale = Math.hypot(tip.a, tip.b);
  const r0 = skin.baseWidth * baseScale * .5;
  const r1 = skin.tipWidth * tipScale * .5;
  const cover = Math.min(skin.overlap ?? 2, length * .3);
  const P = add(A, direction, -cover), Q = add(B, direction, cover);
  const E0 = add(P, perpendicular, r0), E1 = add(Q, perpendicular, r1);
  const F0 = add(P, perpendicular, -r0), F1 = add(Q, perpendicular, -r1);
  const span = length + cover * 2;
  const bow = (skin.bow ?? 0) * (baseScale + tipScale) * .5;
  const upper1 = add(add(E0, direction, span * .32), perpendicular, bow);
  const upper2 = add(add(E1, direction, -span * .32), perpendicular, bow);
  const lower1 = add(add(F1, direction, -span * .32), perpendicular, bow);
  const lower2 = add(add(F0, direction, span * .32), perpendicular, bow);
  const endCap = add(Q, direction, Math.min(r1 * .42, 8));
  const startCap = add(P, direction, -Math.min(r0 * .42, 8));
  return `M${xy(E0)} C${xy(upper1)} ${xy(upper2)} ${xy(E1)} ` +
    `Q${xy(endCap)} ${xy(F1)} C${xy(lower1)} ${xy(lower2)} ${xy(F0)} ` +
    `Q${xy(startCap)} ${xy(E0)} Z`;
}
