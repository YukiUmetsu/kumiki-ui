/**
 * RIG1 body forms: the parts that share a `mass` (a whole arm, a whole body) are painted as one form, so a figure reads
 * as a body and not as a jointed doll. Every painter uses the same plan: the outlines of all the parts go down first,
 * under the form, and the parts are then painted over them without an edge of their own. What is left of the outlines is
 * the silhouette of the form. Draw order alone does it, so a part's own drawing stays cached and never boils.
 */
import type { RigPartFrame } from "./rig-evaluate";
import type { RigShape } from "./rig-spec";

export interface RigForm {
  /** Its visible parts in paint order. */
  parts: readonly RigPartFrame[];
  /** Every part that shares its light: its own, and those of the forms that grow out of one another. */
  lit: readonly RigPartFrame[];
}
/** The forms of a figure in one frame, by part id. */
export function formsOf(parts: readonly RigPartFrame[]): Map<string, RigForm> {
  const byMass = new Map<string, RigPartFrame[]>(), from = new Map<string, string>();
  for (const p of parts) {
    // A fading part would show the outlines under it; a turned solid has faces of its own.
    if (!p.mass || p.line || p.opacity < .9 || p.extrude || p.far3d) continue;
    if (p.grows) from.set(p.mass, p.grows);
    const form = byMass.get(p.mass);
    if (form) form.push(p); else byMass.set(p.mass, [p]);
  }
  const trunk = (mass: string) => { for (let i = 0; i < 8 && from.has(mass); i++) mass = from.get(mass)!; return mass; };
  const lit = new Map<string, RigPartFrame[]>();
  for (const [mass, form] of byMass) lit.set(trunk(mass), [...(lit.get(trunk(mass)) ?? []), ...form]);
  const out = new Map<string, RigForm>();
  for (const [mass, form] of byMass) { const f = { parts: form, lit: lit.get(trunk(mass))! }; for (const p of form) out.set(p.id, f); }
  return out;
}

/** How far a part reaches from its bone's origin, from its bounds. */
export function reachOf(b: { x: number; y: number; width: number; height: number }): number {
  return Math.hypot(Math.max(Math.abs(b.x), Math.abs(b.x + b.width)), Math.max(Math.abs(b.y), Math.abs(b.y + b.height)));
}
/** Where an outline starts to show and is fully there, as shares of the part's reach from its joint. */
const FADE_IN = .36, FADE_FULL = .82;

/** The ink of a growing part's outline: nothing around the joint, the colour along the limb. `hard` steps instead of fading. */
export function JointFade({ id, color, reach, hard = false }: { id: string; color: string; reach: number; hard?: boolean }) {
  const at = (FADE_IN + FADE_FULL) / 2;
  return <defs><radialGradient id={id} gradientUnits="userSpaceOnUse" cx={0} cy={0} r={Math.round(reach * 100) / 100}>
    <stop offset={hard ? at : FADE_IN} stopColor={color} stopOpacity={0} /><stop offset={hard ? at : FADE_FULL} stopColor={color} />
  </radialGradient></defs>;
}

/** Scene-space bounding box of some parts, for light that turns across a whole form instead of each part. */
export function boxOfParts(form: readonly RigPartFrame[], boundsOf: (shape: RigShape) => { x: number; y: number; width: number; height: number }) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of form) {
    const b = boundsOf(p.shape), m = p.matrix;
    for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) {
      const X = m.a * x + m.c * y + m.e, Y = m.b * x + m.d * y + m.f;
      x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
    }
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}
