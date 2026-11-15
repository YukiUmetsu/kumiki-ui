/**
 * RIG1 authoring kit: the small builder every preset uses (namespaced bones and parts, rounded numbers, unit
 * scaling), shape helpers and root-path helpers. Plain functions that return JSON; nothing here runs at render time.
 */
import type { EasingSpec } from "../motion/types";
import type { RigBone, RigDriver, RigKey, RigPart, RigRole, RigRootKey, RigShape, RigSpec } from "./rig-spec";

export interface RigPresetOptions {
  id?: string;
  /** Overall size in design px (height for people and clocks, length for animals and vehicles). */
  size?: number;
  palette?: Partial<Record<RigRole, string>>;
  motion?: string;
  /** Frame window for the motion. */
  start?: number;
  end?: number;
  /** Root x at `start` and at `end` (travel). For in-place motions only `from` is used. */
  from?: number;
  to?: number;
  /** Ground line in scene y (flying subjects: their flight height). */
  y?: number;
  facing?: 1 | -1;
}

export const r2 = (v: number) => Math.round(v * 100) / 100;
export type Pt = readonly [number, number];

/** Small builder that keeps numbers rounded and scales design units (`u`) to pixels. */
export class Rig {
  bones: RigBone[] = []; parts: RigPart[] = []; drivers: RigDriver[] = []; tracks: Record<string, RigKey[]> = {};
  constructor(readonly u: number) {}
  bone(id: string, parent: string | undefined, x: number, y: number, rotate = 0, length?: number) {
    this.bones.push({ id, parent, x: r2(x * this.u), y: r2(y * this.u), rotate: r2(rotate), length: length === undefined ? undefined : r2(length * this.u) });
    return id;
  }
  part(id: string, bone: string, shape: RigShape, role: RigRole, z: number, extra: Partial<RigPart> = {}) {
    this.parts.push({ id, bone, shape: this.scale(shape), role, z, ...extra, variants: extra.variants ? Object.fromEntries(Object.entries(extra.variants).map(([k, v]) => [k, this.scale(v)])) : undefined });
  }
  scale(shape: RigShape): RigShape {
    const u = this.u;
    switch (shape.type) {
      case "ellipse": return { type: "ellipse", cx: r2((shape.cx ?? 0) * u), cy: r2((shape.cy ?? 0) * u), rx: r2(shape.rx * u), ry: r2(shape.ry * u) };
      case "rect": return { type: "rect", x: r2(shape.x * u), y: r2(shape.y * u), width: r2(shape.width * u), height: r2(shape.height * u), radius: shape.radius === undefined ? undefined : r2(shape.radius * u) };
      case "capsule": return { type: "capsule", length: r2(shape.length * u), w0: r2(shape.w0 * u), w1: r2(shape.w1 * u) };
      case "polygon": return { type: "polygon", points: shape.points.map(([x, y]) => [r2(x * u), r2(y * u)] as const) };
      case "path": return { type: "path", d: scalePath(shape.d, u) };
    }
  }
  /** Keys for a bone; frames must increase. Later calls for the same bone append. */
  track(bone: string, keys: RigKey[]) { this.tracks[bone] = [...(this.tracks[bone] ?? []), ...keys].sort((a, b) => a.frame - b.frame).filter((k, i, all) => i === 0 || k.frame > all[i - 1].frame); }
  has(id: string) { return this.bones.some(b => b.id === id); }
}

/** Scale SVG path data by `k`, leaving arc rotation and flag arguments untouched. */
export function scalePath(d: string, k: number): string {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi) ?? [];
  let out = "", cmd = "", i = 0;
  for (const t of tokens) {
    if (/[A-Za-z]/.test(t)) { cmd = t; i = 0; out += t; continue; }
    const n = Number(t), arcArg = (cmd === "A" || cmd === "a") ? i % 7 : -1;
    out += (out && !/[A-Za-z]$/.test(out) ? " " : "") + (arcArg >= 2 && arcArg <= 4 ? String(n) : String(r2(n * k)));
    i++;
  }
  return out;
}

export const poly = (points: Pt[]): RigShape => ({ type: "polygon", points });
export const ell = (cx: number, cy: number, rx: number, ry: number): RigShape => ({ type: "ellipse", cx, cy, rx, ry });
export const cap = (length: number, w0: number, w1: number): RigShape => ({ type: "capsule", length, w0, w1 });
export const rect = (x: number, y: number, width: number, height: number, radius?: number): RigShape => ({ type: "rect", x, y, width, height, radius });
export const path = (d: string): RigShape => ({ type: "path", d });
/** Points on an ellipse arc, degrees clockwise from +x (y down). */
export function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 18): Pt[] {
  return Array.from({ length: n + 1 }, (_, k) => { const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt; });
}
/** A straight tube between two points (frame tubes, spars, struts) with end widths. */
export function tube(x0: number, y0: number, x1: number, y1: number, w0: number, w1 = w0): RigShape {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
  return poly([[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]]);
}
/** A circle; `hole` winds it the other way so it cuts a hole under either fill rule. */
const circlePath = (r: number, cx = 0, cy = 0, hole = false) => { const s = hole ? 1 : 0; return `M${r2(cx - r)} ${r2(cy)}A${r2(r)} ${r2(r)} 0 1 ${s} ${r2(cx + r)} ${r2(cy)}A${r2(r)} ${r2(r)} 0 1 ${s} ${r2(cx - r)} ${r2(cy)}Z`; };
/** A ring (even-odd hole). */
export const ring = (r0: number, r1: number) => path(circlePath(r0) + circlePath(r1, 0, 0, true));
/** Wheel with tyre, spokes and hub, as a single path (even-odd keeps the gaps open). */
export function wheelPath(R: number, spokes: number, rim = .16, spokeW = .035): string {
  const r1 = R * (1 - rim), hub = R * .18, parts: string[] = [circlePath(R), circlePath(r1, 0, 0, true)];
  for (let k = 0; k < spokes; k++) {
    const a = k / spokes * Math.PI * 2, w = R * spokeW;
    const x0 = Math.cos(a) * hub, y0 = Math.sin(a) * hub, x1 = Math.cos(a) * r1, y1 = Math.sin(a) * r1, nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
    parts.push(`M${r2(x0 + nx)} ${r2(y0 + ny)}L${r2(x1 + nx)} ${r2(y1 + ny)}L${r2(x1 - nx)} ${r2(y1 - ny)}L${r2(x0 - nx)} ${r2(y0 - ny)}Z`);
  }
  parts.push(circlePath(hub));
  return parts.join("");
}
/** A modern alloy: `spokes` twin-spoke arms between hub and rim, with openings (even-odd). */
export function alloyPath(R: number, spokes: number): string {
  const rim = R * .84, hub = R * .26, parts: string[] = [circlePath(rim)];
  for (let k = 0; k < spokes; k++) {
    // Each opening is the gap between two spokes: a curved trapezoid from the hub ring to the rim.
    const a0 = (k + .16) / spokes * Math.PI * 2, a1 = (k + .84) / spokes * Math.PI * 2, r0 = hub * 1.35, r1 = rim * .9;
    const p = (r: number, a: number) => `${r2(Math.cos(a) * r)} ${r2(Math.sin(a) * r)}`;
    parts.push(`M${p(r0, a0 + .12)}L${p(r1, a0)}A${r2(r1)} ${r2(r1)} 0 0 1 ${p(r1, a1)}L${p(r0, a1 - .12)}A${r2(r0)} ${r2(r0)} 0 0 0 ${p(r0, a0 + .12)}Z`);
  }
  return parts.join("");
}

/** Root travel from `from` to `to` over the window, with eased starts and stops. */
export function travel(o: RigPresetOptions, start: number, end: number, ease: EasingSpec = "ease-in-out-quad"): RigRootKey[] {
  const y = o.y ?? 0, from = o.from ?? 0, to = o.to ?? from;
  if (from === to) return [{ frame: start, x: from, y, facing: o.facing ?? 1 }];
  return [{ frame: start, x: from, y }, { frame: end, x: to, y, ease }];
}

/** Sample a smooth path into linear root keys every `step` frames (for paths with depth, yaw or wobble). */
export function sampledPath(start: number, end: number, step: number, at: (frame: number) => Omit<RigRootKey, "frame" | "ease">): RigRootKey[] {
  const keys: RigRootKey[] = [];
  for (let f = start; f < end; f += step) keys.push({ frame: f, ...at(f), ease: "linear" });
  keys.push({ frame: end, ...at(end), ease: "linear" });
  keys[0] = { ...keys[0], ease: undefined };
  return keys.map(k => ({ ...k, x: r2(k.x), y: k.y === undefined ? undefined : r2(k.y), scale: k.scale === undefined ? undefined : Math.round(k.scale * 1000) / 1000, yaw: k.yaw === undefined ? undefined : r2(k.yaw) }));
}

export function finish(id: string, kind: string, rig: Rig, root: RigRootKey[], palette: Partial<Record<RigRole, string>>, bounds: RigSpec["bounds"], o: RigPresetOptions): RigSpec {
  return {
    version: 1, id: o.id ?? id, kind, bones: rig.bones, parts: rig.parts, drivers: rig.drivers, tracks: rig.tracks, root,
    palette: { ...palette, ...o.palette }, bounds, provenance: { license: "CC0-1.0", source: "original Kumiki RIG1 preset" },
  };
}

/** Frame at fraction `k` of a window. */
export const at = (start: number, end: number) => (k: number) => Math.round(start + (end - start) * k);
