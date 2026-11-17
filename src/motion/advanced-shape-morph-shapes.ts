/**
 * Demo geometry for the `AdvancedShapeMorph` lab. Every shape sits in a 240 × 240 design space. The set
 * mixes SVG path data (arcs and cubic curves) with point rings, so the lab exercises both input formats.
 */

import type { MorphShapeInput, MorphTopologyStrategy } from "../../registry/motion/advanced-morph";

type Point = readonly [number, number];

const CENTER = 120;

function circleRing(cx: number, cy: number, r: number, count = 72): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  });
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

function starRing(points: number, outer: number, inner: number): Point[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 === 0 ? outer : inner;
    return [CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)] as const;
  });
}

function gearRing(teeth: number, root: number, tip: number): Point[] {
  const out: Point[] = [];
  const period = (Math.PI * 2) / teeth;
  const at = (r: number, a: number): Point => [CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)];
  for (let i = 0; i < teeth; i += 1) {
    const a0 = i * period - Math.PI / 2;
    for (let k = 0; k <= 3; k += 1) out.push(at(root, a0 + (0.4 * period * k) / 3));
    for (let k = 0; k <= 3; k += 1) out.push(at(tip, a0 + 0.52 * period + (0.3 * period * k) / 3));
  }
  return out;
}

/** The part of circle 1 outside circle 2, as one ring. */
function crescentRing(): Point[] {
  const [x1, y1, r1] = [112, 124, 92];
  const [x2, y2, r2] = [156, 98, 78];
  const angleOf = (cx: number, cy: number, p: Point) => Math.atan2(p[1] - cy, p[0] - cx);
  const d = Math.hypot(x2 - x1, y2 - y1);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(r1 * r1 - a * a);
  const px = x1 + (a * (x2 - x1)) / d;
  const py = y1 + (a * (y2 - y1)) / d;
  const i1: Point = [px + (h * (y2 - y1)) / d, py - (h * (x2 - x1)) / d];
  const i2: Point = [px - (h * (y2 - y1)) / d, py + (h * (x2 - x1)) / d];
  const out: Point[] = [];
  let s1 = angleOf(x1, y1, i1);
  let e1 = angleOf(x1, y1, i2);
  // Walk circle 1 the long way, away from circle 2.
  if (e1 > s1) e1 -= Math.PI * 2;
  if (s1 - e1 < Math.PI) e1 += Math.PI * 2;
  for (let k = 0; k <= 64; k += 1) {
    const t = s1 + ((e1 - s1) * k) / 64;
    out.push([x1 + r1 * Math.cos(t), y1 + r1 * Math.sin(t)]);
  }
  s1 = angleOf(x2, y2, i2);
  let e2 = angleOf(x2, y2, i1);
  // Walk circle 2 the short way, inside circle 1.
  if (Math.abs(e2 - s1) > Math.PI) e2 += e2 < s1 ? Math.PI * 2 : -Math.PI * 2;
  for (let k = 1; k < 40; k += 1) {
    const t = s1 + ((e2 - s1) * k) / 40;
    out.push([x2 + r2 * Math.cos(t), y2 + r2 * Math.sin(t)]);
  }
  return out;
}

function sunRings(): Point[][] {
  const rings: Point[][] = [circleRing(CENTER, CENTER, 46, 64)];
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const at = (r: number, w: number): Point => [CENTER + ux * r - uy * w, CENTER + uy * r + ux * w];
    rings.push([at(62, -9), at(62, 9), at(106, 3.5), at(106, -3.5)]);
  }
  return rings;
}

export interface MorphDemoShape {
  label: string;
  input: MorphShapeInput;
}

export const MORPH_DEMO_SHAPES = {
  disc: { label: "Disc", input: circlePath(CENTER, CENTER, 90) },
  star: { label: "Star", input: starRing(5, 104, 44) },
  heart: {
    label: "Heart",
    input: "M120 206 C60 160 22 124 22 84 C22 52 46 30 76 30 C96 30 112 42 120 58 C128 42 144 30 164 30 C194 30 218 52 218 84 C218 124 180 160 120 206 Z",
  },
  dots: { label: "Three dots", input: [circlePath(120, 62, 38), circlePath(66, 156, 38), circlePath(174, 156, 38)].join(" ") },
  gear: { label: "Gear (one hole)", input: [gearRing(12, 84, 104), circleRing(CENTER, CENTER, 34)] },
  capsule: {
    label: "Capsule (two holes)",
    input: `M60 80 A60 60 0 0 1 180 80 L180 160 A60 60 0 0 1 60 160 Z ${circlePath(120, 80, 26)} ${circlePath(120, 162, 30)}`,
  },
  ring: { label: "Ring (one hole)", input: `${circlePath(CENTER, CENTER, 96)} ${circlePath(CENTER, CENTER, 54)}` },
  square: {
    label: "Rounded square",
    input: "M68 40 H172 A28 28 0 0 1 200 68 V172 A28 28 0 0 1 172 200 H68 A28 28 0 0 1 40 172 V68 A28 28 0 0 1 68 40 Z",
  },
  crescent: { label: "Crescent", input: crescentRing() },
  sun: { label: "Sun (nine parts)", input: sunRings() },
} satisfies Record<string, MorphDemoShape>;

export type MorphDemoShapeId = keyof typeof MORPH_DEMO_SHAPES;

export interface MorphDemoPreset {
  id: string;
  label: string;
  from: MorphDemoShapeId;
  to: MorphDemoShapeId;
  strategy: MorphTopologyStrategy;
  /** What the pair tests, in one sentence. */
  note: string;
}

export const MORPH_DEMO_PRESETS: readonly MorphDemoPreset[] = [
  { id: "disc-star", label: "Disc → Star", from: "disc", to: "star", strategy: "split-merge", note: "Curves into corners: 10 star vertices against a flattened arc, with every corner kept exact." },
  { id: "disc-dots", label: "Disc → Three dots", from: "disc", to: "dots", strategy: "partition", note: "One part splits into three: straight, area-balanced cuts break the disc apart." },
  { id: "dots-heart", label: "Three dots → Heart", from: "dots", to: "heart", strategy: "split-merge", note: "Three parts merge into one: each extra dot flows into a copy of the heart." },
  { id: "gear-capsule", label: "Gear → Capsule", from: "gear", to: "capsule", strategy: "split-merge", note: "One hole becomes two: the new hole grows from a point inside the fill." },
  { id: "ring-square", label: "Ring → Rounded square", from: "ring", to: "square", strategy: "split-merge", note: "A hole closes: it shrinks into a point while the outer ring squares off." },
  { id: "crescent-sun", label: "Crescent → Sun", from: "crescent", to: "sun", strategy: "split-merge", note: "One concave part becomes nine: the disc and eight rays leave copies of the crescent." },
];
