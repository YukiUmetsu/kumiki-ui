/**
 * INK-FLORA1: the plants of Chinese ink painting, as subjects for any ink film.
 *
 * Every maker takes plain options and a `seed`; two seeds give two plants, never one plant twice. Every page has air round the plant,
 * so that a wind can move it. Plants are composed as painters do: a host, a guest, one odd one out, and a space left empty.
 *
 *   inkBamboo    竹  1000 × 1500   culms, shoots and leaves, each culm in its own wind
 *   inkPlum      梅  1400 × 1000   an old branch; each arm sways with its flowers
 *   inkPine      松  1400 × 900 a limb, 1300 × 1500 a tree; pads of needles lift one by one
 *   inkLotus     荷  1200 × 1500   stems sway, leaves and flowers nod on them
 *   inkOrchid    蘭  1300 × 900    leaves in three groups, flowers, a pale clump behind
 *   inkWillow    柳  1200 × 1400   strands in five groups, their ends late
 *   inkReeds     蘆  1200 × 1300   each stem bends, its leaves tremble faster
 *   inkGrass     草  1400 × 560    tufts along a bank, for a foreground
 *   inkMaple     楓  1400 × 1000   red leaves on near twigs, brown ones behind
 *   inkPetal, inkLeaf, inkSnowflake, inkRaindrop   60 × 60   one piece each, for things that fall
 *
 * A wind is one number, −1 (to the left) to 1. Roots and thick wood stay still; amounts are in page units, small, and out of step.
 */
import type { InkPart, InkPoint, InkSubject } from "./ink-cel";
import type { InkMotion } from "./ink-motion";
import { inkPlates } from "./ink-pigments";
import { inkFbm2, inkNoise2 } from "../ink-riso-press";
import { inkBloomed, inkClamp, inkClear, inkDice, inkDot, inkEase, inkBlade, inkLerp, inkLine, inkMarksPart, inkRound, inkStep, inkStroke } from "./ink-brush-kit";
import type { InkDice, InkMark } from "./ink-brush-kit";
import type { PenNode } from "../ink-riso-pen";

const K = "ink";

// ---- bamboo --------------------------------------------------------------------------------------------------------------------
export interface InkBambooOptions {
  seed?: number;
  /** Culms, 1–6: a host, two guests, one pale in the mist, a young shoot, another pale one. */
  stalks?: number;
  /** How leafy, 0–1. */
  density?: number;
  /** Wind: −1 blows to the left, 0 is still air, 1 blows to the right. */
  wind?: number;
  pigment?: "ink" | "indigo";
  /** Width of the host culm, page units. */
  thick?: number;
}
interface Culm { points: [number, number][]; joints: number[]; width: number; far: boolean; side: 1 | -1 }

/** Leaf orders: angle off the way the spray hangs, length, width. 个 has three leaves, 介 four, the startled crow spreads. */
const ORDERS: Readonly<Record<string, readonly (readonly [number, number, number])[]>> = {
  ren: [[-17, 1, 1], [24, 0.8, 0.9]],
  ge: [[-34, 0.86, 0.84], [-2, 1.14, 1.04], [25, 0.78, 0.9]],
  jie: [[-64, 0.74, 0.6], [-18, 1.1, 1.04], [8, 0.94, 1], [40, 0.72, 0.78]],
  crow: [[-80, 0.84, 0.5], [-30, 0.94, 0.92], [-9, 1.18, 1.06], [15, 0.9, 1], [58, 0.74, 0.58]],
};
/** A spray: leaves that hang from one twig end. */
function spray(d: InkDice, plate: string, x: number, y: number, heading: number, size: number, tone: number, order: string, wind: number, pale: boolean): InkMark[] {
  const out: InkMark[] = [], flip = d.sign();
  for (const [i, [a0, l, w]] of ORDERS[order].entries()) {
    const a = heading + flip * a0 * (1 - 0.3 * Math.abs(wind)) + d.near(0, 11), len = size * l * d.range(0.82, 1.16), wid = size * 0.16 * w * d.range(0.8, 1.15), [rx, ry] = inkStep(x, y, a, d.range(2, 6));
    // leaves that stand out sideways fall at their ends; hanging ones are nearly straight
    const across = Math.cos((a * Math.PI) / 180), bend = across * d.range(4, 20) + wind * d.range(-4, 12) * -Math.sin((a * Math.PI) / 180);
    out.push(inkBlade(plate, { x: rx, y: ry, angle: a, length: len, width: wid, bend, tone: tone * d.range(0.9, 1.06) * (pale && i % 2 ? 0.8 : 1), side: d.sign(), full: d.range(0.36, 0.56), torn: d.chance(0.34) ? d.range(0.55, 1) : 0, neck: d.range(0.13, 0.22), seed: d.seed() }));
  }
  // the claws the leaves hang from
  for (let k = d.int(1, 2); k > 0; k--) { const a = heading + 180 + d.near(0, 85), L = size * d.range(0.06, 0.15); out.push(inkLine(plate, [[x, y, 0.4], [...inkStep(x, y, a, L * 0.6), 1], [...inkStep(x, y, a + 14, L), 0.2]], size * 0.045, { ink: Math.min(1, tone * 1.1), seed: d.seed() })); }
  return out;
}
const onCulm = (c: Culm, i: number): [number, number] => c.points[Math.max(0, Math.min(c.points.length - 1, i))];
function culm(d: InkDice, x: number, y: number, top: number, lean: number, bow: number, width: number, far: boolean): Culm {
  const points: [number, number][] = [], joints: number[] = [], H = y - top;
  let at = 0, k = 0, kink = 0;
  points.push([x, y]); joints.push(0);
  while (at < H) {
    // internodes: short at the ground, longest at a third of the height, short again at the top
    const u = at / H, step = H * (0.055 + 0.062 * Math.sin(Math.PI * Math.min(1, 0.14 + u * 0.92))) * d.range(0.88, 1.14);
    at = Math.min(H, at + step); k++;
    kink = kink * 0.5 + d.near(0, 2.2);
    const v = at / H;
    points.push([x + lean * at + bow * Math.sin(Math.PI * v * 0.9) * H + kink, y - at]); joints.push(k);
    if (H - at < H * 0.03) break;
  }
  return { points, joints, width, far, side: 1 };
}
function culmMarks(d: InkDice, plate: string, c: Culm): InkMark[] {
  const out: InkMark[] = [], n = c.points.length, t0 = c.far ? 0.3 : 0.66, b0 = c.far ? 0.15 : 0.3;
  for (let i = 0; i < n - 1; i++) {
    const a = c.points[i], b = c.points[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, w = c.width * inkLerp(1, 0.42, Math.pow(i / n, 1.3)) * d.range(0.94, 1.06), gap = Math.max(1.6, w * 0.16), bow = d.near(0, w * 0.1);
    const at = (t: number, p: number): PenNode => { const s = (i === 0 ? 0 : gap) + (L - 2 * gap) * t, q = bow * Math.sin(Math.PI * t); return [a[0] + ux * s - uy * q, a[1] + uy * s + ux * q, p]; };
    out.push(inkStroke(plate, [at(0, 1.1), at(0.05, 1.04), at(0.2, 0.93), at(0.5, 0.88), at(0.8, 0.92), at(0.95, 1.06), at(1, 1.14)], w, { tip: t0 * d.range(0.85, 1.1), belly: b0 * d.range(0.8, 1.15), side: c.side, head: i === 0 ? 0 : 0.34, rim: 0.4, dry: i === 0 ? 0.86 : d.range(0, 0.2), dryEnd: i === 0 ? 0.2 : d.range(0.25, 0.7), bristles: 9, bleed: 0.5, grain: 0.5, seed: d.seed() }));
    if (i > 0) {
      const r = w * 0.64, j = c.far ? 0.5 : 0.95, up = d.range(0.16, 0.3);
      out.push(inkLine(plate, [[a[0] - uy * -r * 1.06 + ux * w * up, a[1] + ux * -r * 1.06 + uy * w * up, 0.5], [a[0] - uy * -r * 0.7 - ux * w * 0.06, a[1] + ux * -r * 0.7 - uy * w * 0.06, 1.15], [a[0] - ux * w * 0.14, a[1] - uy * w * 0.14, 0.62], [a[0] - uy * r * 0.72 - ux * w * 0.04, a[1] + ux * r * 0.72 - uy * w * 0.04, 1.1], [a[0] - uy * r * 1.1 + ux * w * (up + 0.1), a[1] + ux * r * 1.1 + uy * w * (up + 0.1), 0.3]], Math.max(1.6, w * 0.2), { ink: j, seed: d.seed() }));
    }
  }
  return out;
}
/** A twig in two or three bones, knotted where they meet. */
function twig(d: InkDice, plate: string, a: InkPoint, b: InkPoint, w: number, tone: number, sag: number): InkMark[] {
  const out: InkMark[] = [], n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 48)), at = (t: number): [number, number] => [inkLerp(a[0], b[0], t), inkLerp(a[1], b[1], t) - sag * Math.sin(Math.PI * t) + (t > 0 && t < 1 ? d.near(0, 2.4) : 0)];
  let p = at(0);
  for (let i = 1; i <= n; i++) { const q = at(i / n); out.push(inkLine(plate, [[p[0], p[1], 1.25], [inkLerp(p[0], q[0], 0.14), inkLerp(p[1], q[1], 0.14), 0.7], [inkLerp(p[0], q[0], 0.6), inkLerp(p[1], q[1], 0.6), 0.62], [inkLerp(p[0], q[0], 0.96), inkLerp(p[1], q[1], 0.96), 1.1]], w * inkLerp(1, 0.66, i / n), { ink: tone, seed: d.seed() })); p = q; }
  return out;
}
/** 竹 */
export function inkBamboo(o: InkBambooOptions = {}): InkSubject {
  const seed = o.seed ?? 1, count = Math.round(inkClamp(o.stalks ?? 5, 1, 6)), density = inkClamp(o.density ?? 0.6), wind = inkClamp(o.wind ?? 0.15, -1, 1), page = { width: 1000, height: 1500 }, d = inkDice(seed), dir = d.sign(), thick = o.thick ?? 17, ground = 1420;
  const plans: readonly (readonly [number, number, number, number, boolean])[] = [[0, 0.99, 0.02, 1, false], [-74, 0.66, -0.1, 0.8, false], [62, 0.82, 0.115, 0.86, false], [138, 0.9, 0.06, 0.62, true], [-150, 0.46, -0.17, 0.4, false], [-34, 0.95, -0.07, 0.58, true]];
  const culms = plans.slice(0, count).map(([dx, h, lean, w, far], i) => { const f = d.fork(10 + i), c = culm(f, 500 + dir * (dx + f.near(0, 14)) - dir * 10, ground - f.range(0, 46) - (far ? 60 : 0), ground - 1330 * h * f.range(0.95, 1), dir * (lean + f.near(0, 0.02)) + wind * 0.04, dir * f.near(0.012, 0.02) + wind * 0.02, thick * w, far); return { ...c, side: (dir > 0 ? 1 : -1) as 1 | -1 }; });
  // the ground is only said: a dry drag of the brush, blades, and moss dots
  const floor: InkMark[] = [], e = d.fork(3), feet = culms.map(c => c.points[0]), x0 = Math.min(...feet.map(p => p[0])), x1 = Math.max(...feet.map(p => p[0])), y0 = Math.max(...feet.map(p => p[1]));
  floor.push(inkStroke(K, [[x0 - 60, y0 + 4, 0.2], [inkLerp(x0, x1, 0.3), y0 + 18, 0.9], [inkLerp(x0, x1, 0.7), y0 + 10, 0.7], [x1 + 90, y0 + 22, 0.1]], 22, { tip: 0.4, belly: 0.1, side: -1, dry: 0.5, dryEnd: 1.02, bristles: 12, seed: e.seed() }));
  for (let k = 0; k < 9; k++) { const p = e.pick(feet), x = p[0] + e.near(0, 60), y = p[1] + e.range(-4, 16); floor.push(k < 5 ? inkDot(K, x, y, e.range(2.4, 5), { tone: e.range(0.5, 0.95), angle: e.near(-20, 30), long: 1.5, seed: e.seed() }) : inkBlade(K, { x, y, angle: -90 + e.near(dir * 18, 55), length: e.range(26, 62), width: e.range(3, 5), bend: e.near(0, 40), tone: e.range(0.5, 0.9), full: 0.3, neck: 0.6, seed: e.seed() })); }
  const far: InkPart[] = [], near: InkPart[] = [], groups: Record<string, readonly InkMotion[]> = {};
  for (const [i, c] of culms.entries()) {
    const f = d.fork(50 + i), id = `stalk${i + 1}`, n = c.points.length, root = c.points[0], tip = c.points[n - 1], tone = c.far ? 0.4 : 0.94, marks = culmMarks(f, K, c), list = c.far ? far : near;
    groups[id] = [{ kind: "sway", from: root, to: tip, amount: 8 + 8 * Math.abs(wind), seconds: 5.2 + i * 0.7, lean: wind * 0.6, phase: i * 1.3, power: 1.9 }];
    // masses: height on the culm, side, sprays, size, tone. One dark host, guests round it, and thin ends.
    const q = (v: number) => Math.max(1, Math.round(v * (0.35 + 1.1 * density))), side = dir * (i % 2 ? -1 : 1);
    const masses: [number, number, number, number, number][] = i === 0 ? [[0.43, side, q(9), 1.1, 1], [0.61, -side, q(4), 0.94, 0.92], [0.78, side, q(5), 0.92, 0.86], [0.92, -side, q(3), 0.8, 0.84], [1, side, q(2), 0.7, 0.8]]
      : c.far ? [[0.52, side, q(3), 0.9, 1], [0.68, -side, q(5), 1, 1], [0.84, side, q(4), 0.9, 0.9], [0.97, -side, q(3), 0.8, 0.85]]
      : i === 1 ? [[0.24, -side, q(1), 0.7, 0.9], [0.66, side, q(3), 0.92, 0.96], [0.86, side, q(5), 1, 1], [1, -side, q(2), 0.74, 0.86]]
      : i === 2 ? [[0.4, side, 1, 0.66, 0.75], [0.7, side, q(4), 0.98, 1], [0.88, side, q(3), 0.86, 0.9], [1, -side, q(2), 0.74, 0.85]] : [[0.75, side, q(2), 0.74, 0.8], [1, -side, q(2), 0.66, 0.75]];
    const leaves: InkMark[][] = [];
    for (const [m, [h, s, many, size, dark]] of masses.entries()) {
      const g = f.fork(7 + m), ji = Math.max(1, Math.min(n - 1, Math.round(h * (n - 1)))), [jx, jy] = onCulm(c, ji), twigs: InkMark[] = [], pile: InkMark[] = [], w = 2.6 + c.width * 0.05, reach = 26 + 17 * many;
      for (let k = 0; k < many; k++) {
        // a roof of sprays along the branch, the next row below and between; those painted first are paler and stand behind
        const row = k % 3 === 2 ? 1 : 0, u = many === 1 ? 0.9 : (k + g.range(0.1, 0.9)) / many, x = jx + s * (reach * (u * 1.5 - 0.42)) + g.near(0, 16), y = jy - 34 * size * Math.sin(u * 2.2) + row * 74 * size + g.near(0, 26) - 30, base = onCulm(c, ji - (g.chance(0.4) ? 1 : 0)), own = tone * dark * (k < many * 0.34 && many > 2 ? g.range(0.6, 0.82) : g.range(0.94, 1.06));
        twigs.push(...twig(g, K, [base[0], base[1]], [x, y], w * g.range(0.8, 1.1), tone * (c.far ? 0.9 : 1), g.range(6, 22)));
        const heading = 90 - s * g.range(-6, 24) * (u > 0.4 ? 1 : -0.7) - wind * 48 + g.near(0, 12), order = g.pick(many === 1 ? ["ren", "ge"] : ["ge", "jie", "jie", "ren", "crow"]);
        pile.push(...spray(g, K, x, y, heading, 128 * size * g.range(0.72, 1.18), own, order, wind, c.far));
      }
      // the odd one out: a thin leaf that stands free of the mass
      if (many > 2) { const out = inkStep(jx, jy, s > 0 ? -22 : 202, reach * 0.8); pile.push(inkBlade(K, { x: out[0], y: out[1], angle: s > 0 ? g.range(-24, 8) : g.range(172, 204), length: 104 * size, width: 11 * size, bend: s * 12, tone, torn: 0.2, neck: 0.3, seed: g.seed() })); }
      marks.push(...twigs); leaves.push(pile);
    }
    list.push(inkMarksPart(id, marks, page, { group: id, depth: c.far ? -0.06 : 0 }));
    for (const [m, pile] of leaves.entries()) { const [jx, jy] = onCulm(c, Math.round(masses[m][0] * (n - 1))); list.push(inkMarksPart(`${id}-leaves${m + 1}`, pile, page, { group: id, depth: c.far ? -0.06 : 0, motion: [{ kind: "turn", at: [jx, jy], degrees: 1.1 + Math.abs(wind), seconds: 3.1 + m * 0.6 + i * 0.4, phase: i + m * 2 }, { kind: "sway", from: [jx, jy - 40], to: [jx, jy + 220], amount: 7 + 6 * Math.abs(wind), seconds: 2.3 + m * 0.35, phase: i * 2 + m }] })); }
  }
  return { id: `bamboo-${seed}`, label: "Bamboo: jointed culms with hanging leaves, in ink", page, plates: inkPlates({ [K]: o.pigment ?? "ink" }), seed: 11 + seed, parts: [...far, inkMarksPart("ground", floor, page), ...near], groups };
}

// ---- plum ----------------------------------------------------------------------------------------------------------------------
export interface InkPlumOptions {
  seed?: number;
  /** The side the branch comes in from. */
  from?: "left" | "right";
  /** Climbs, runs across, or hangs down. */
  habit?: "rise" | "across" | "hang";
  /** Flowers and buds. */
  flowers?: number;
  /** Ringed with a line, as Wang Mian and Jin Nong did, or pressed in colour without one. */
  bloom?: "line" | "colour";
  /** Colour of pressed flowers. */
  pigment?: "rouge" | "cinnabar" | "peach" | "ink";
  /** Radius of an open flower, page units. */
  size?: number;
}
type Limb = readonly (readonly [number, number, number])[];
/** A five-petalled flower. `open`: 1 faces us, 0.3 is seen from the side; `turn`: where the calyx is, degrees. */
interface Blossom { x: number; y: number; r: number; turn: number; open: number; kind: "face" | "side" | "back" | "half" | "bud" }
const jitter = (d: InkDice, l: Limb, k: number): [number, number, number][] => l.map(([x, y, w], i) => (i === 0 ? [x, y, w] : [x + d.near(0, k), y + d.near(0, k), w * d.range(0.88, 1.1)]));
/** An old limb: wet grey through all its bones, then each bone's shadow side dry and dark, a broken edge, and bark. */
function limbMarks(d: InkDice, plate: string, limb: readonly (readonly [number, number, number])[], o: { tone?: number; side?: 1 | -1; dry?: number; bark?: "drag" | "scale" } = {}): InkMark[] {
  const out: InkMark[] = [], tone = o.tone ?? 1, side = o.side ?? 1, dry = o.dry ?? 0.3, scale = o.bark === "scale", n = limb.length, W = Math.max(...limb.map(p => p[2]));
  const bone = (i: number) => {
    const [ax, ay, aw] = limb[i], [bx, by, bw] = limb[i + 1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, bow = d.near(0, 0.045) * L;
    return { L, w: Math.max(aw, bw), at: (t: number, p: number, off = 0): PenNode => { const q = bow * Math.sin(Math.PI * inkClamp(t)) + off * inkLerp(aw, bw, inkClamp(t)); return [ax + ux * L * t - uy * q, ay + uy * L * t + ux * q, p * inkLerp(aw, bw, inkClamp(t))]; } };
  };
  const bones = Array.from({ length: n - 1 }, (_, i) => bone(i)), share = (l: readonly PenNode[], w: number, least = 0): PenNode[] => l.map(([x, y, p = 1]) => [x, y, Math.max(least, p / w)]);
  const spine = bones.flatMap((b, i) => [...(i === 0 ? [b.at(0, 0.96)] : [b.at(0.05, 1.1)]), b.at(0.22, d.range(0.8, 0.96)), b.at(0.42, d.range(0.68, 0.9)), b.at(0.66, d.range(0.8, 1.02)), b.at(0.86, d.range(0.84, 1.02)), ...(i === n - 2 ? [b.at(1, W > 9 ? 0.5 : 0.3)] : [b.at(0.96, 1.12)])]);
  // thinner than this a dry brush only breaks up: the rest is drawn with the tip
  const cut = spine.findIndex(p => (p[2] ?? 1) < 11), thick = cut < 0 ? spine : spine.slice(0, cut + 1), fine = cut < 0 ? [] : spine.slice(Math.max(0, cut - 1));
  if (fine.length > 1) out.push(inkLine(plate, share(fine, 12).map(([x, y, p = 1], i) => [x, y, i === 0 && thick.length > 1 ? p * 0.5 : p] as const), 12, { ink: 0.86 * tone, inkEnd: 0.8 * tone, tremor: 1.4, seed: d.seed() }));
  if (thick.length < 3) return out;
  out.push(inkStroke(plate, share(thick, W, 0.03), W, scale ? { tip: 0.6 * tone, belly: 0.14 * tone, side, head: 0.1, rim: 0.5, dry: dry * 0.6, dryEnd: dry, bristles: Math.max(5, W * 0.2), bleed: 1.2, grain: 0.7, seed: d.seed() } : { tip: 0.96 * tone, belly: 0.4 * tone, side, head: 0.1, rim: 0.3, dry: dry * 1.2, dryEnd: inkClamp(dry * 1.75), bristles: Math.max(5, W * 0.17), bleed: 0.6, grain: 1.15, seed: d.seed() }));
  for (const b of bones) {
    if (b.w < 13) continue;
    // the shadow side, pressed where the limb turns and lifted before the next turn
    const off = -side * (scale ? 0.3 : 0.22), w = b.w * (scale ? 0.46 : 0.62);
    out.push(inkStroke(plate, share([b.at(-0.04, 0.14, off), b.at(0.05, 0.5, off), b.at(0.2, 0.58, off * 1.15), b.at(0.55, 0.4 * d.range(0.7, 1.2), off * 1.5), b.at(d.range(0.8, 1), 0.2, off * 1.7)], w), w, { tip: (scale ? 0.8 : 1) * tone, belly: (scale ? 0.28 : 0.5) * tone, side, head: scale ? 0 : 0.3, rim: 0.2, dry: dry * 0.7, dryEnd: inkClamp(0.5 + dry), bristles: Math.max(5, w * 0.3), bleed: 0.5, grain: 0.5, seed: d.seed() }));
    // its edges, found and lost
    for (const e of [side, -side]) { if (b.w < 14) continue; for (let t = d.range(0, 0.4); t < 0.9; ) { const l = d.range(0.16, 0.4), t1 = Math.min(1, t + l); out.push(inkLine(plate, [[...(b.at(t, 1, e * 0.4).slice(0, 2) as [number, number]), 0.3], [...(b.at(inkLerp(t, t1, 0.4), 1, e * d.range(0.36, 0.46)).slice(0, 2) as [number, number]), d.range(0.7, 1.3)], [...(b.at(t1, 1, e * 0.4).slice(0, 2) as [number, number]), 0.1]], 1.4 + b.w * 0.045, { ink: 0.95 * tone, inkEnd: 0.5 * tone, tremor: 2.2, seed: d.seed() })); t = t1 + d.range(0.15, 0.6); } }
    if (scale && b.w > 22) {
      // scales: open rings, round where the trunk faces us and narrow at its sides, close on the shadow side and few in the light
      const step = inkClamp(b.w * 0.2, 11, 19);
      for (let t = d.range(0.02, 0.08), row = 0; t < 0.97; t += (step * d.range(0.95, 1.35)) / b.L, row++) for (let v = -0.4 + (row % 2) * 0.11 + d.near(0, 0.05); v < 0.42; v += (step * d.range(1.05, 1.4)) / b.w) {
        const shade = v * -side; // 1 in the light
        if (d.chance(0.16 + 0.5 * inkEase(-0.1, 0.42, shade))) continue;
        const squeeze = Math.sqrt(Math.max(0.12, 1 - (v / 0.5) ** 2)), rx = (step * d.range(0.36, 0.56) * squeeze) / b.w, ry = (step * d.range(0.34, 0.5)) / b.L, from = d.range(0, 6.28), arc = d.range(3.6, 5.4), m = 6;
        out.push(inkLine(plate, Array.from({ length: m }, (_, i) => { const a = from + (arc * i) / (m - 1), [x, y] = b.at(t + Math.sin(a) * ry * d.range(0.8, 1.2), 1, v + Math.cos(a) * rx * d.range(0.8, 1.2)); return [x, y, 0.35 + 0.85 * Math.sin((Math.PI * (i + 0.5)) / m)] as const; }), 1.3 + b.w * 0.016, { ink: d.range(0.55, 0.95) * tone * (1 - 0.35 * inkEase(0, 0.4, shade)), tremor: 1.2, seed: d.seed() }));
      }
      continue;
    }
    // bark: short curved touches that go round the limb
    for (let k = Math.round((b.L / 46) * Math.min(1.4, b.w / 34)); k > 0; k--) { const t = d.range(0.06, 0.9), v = d.range(-0.3, 0.36) * -side, h = d.range(0.1, 0.2), l = d.range(5, 13) / b.L; out.push(inkLine(plate, [[...(b.at(t, 1, v - h).slice(0, 2) as [number, number]), 0.2], [...(b.at(t + l, 1, v).slice(0, 2) as [number, number]), 1], [...(b.at(t + l * 0.3, 1, v + h).slice(0, 2) as [number, number]), 0.1]], 1.2 + b.w * 0.05, { ink: d.range(0.5, 0.95) * tone, seed: d.seed() })); }
  }
  return out;
}
/** Moss dots, pressed in threes along the edge of a limb where it turns: on its back when it lies, on its shadow side when it stands. */
function mossMarks(d: InkDice, plate: string, limb: readonly (readonly [number, number, number])[], n: number, up: number): InkMark[] {
  const out: InkMark[] = [];
  for (let k = 0; k < n; k++) {
    const i = d.int(1, limb.length - 2), [x, y, w] = limb[i], [bx, by, bw] = limb[i + 1], L = Math.hypot(bx - x, by - y) || 1, nx = -(by - y) / L, ny = (bx - x) / L, s = Math.abs(ny) > 0.35 ? (ny * up > 0 ? -1 : 1) : d.sign(), many = d.pick([1, 1, 2, 2, 3, 4]);
    for (let m = 0, t = d.range(0, 0.5); m < many; m++, t += d.range(6, 19) / L) { const r = Math.min(4.4, w * 0.05 + 1.5) * d.range(0.5, 1.1), off = s * inkLerp(w, bw, t) * d.range(0.36, 0.56); out.push(inkDot(plate, inkLerp(x, bx, t) + nx * off, inkLerp(y, by, t) + ny * off, r, { tone: d.range(0.45, 1), angle: (Math.atan2(ny, nx) * 180) / Math.PI + d.near(0, 40), long: d.range(1.1, 2), seed: d.seed() })); }
  }
  return out;
}
/** The marks of a blossom. `C` is the petals' plate, null for a ringed flower. */
function blossomMarks(d: InkDice, b: Blossom, C: string | null): InkMark[] {
  const out: InkMark[] = [], { x, y, r } = b, t = (b.turn * Math.PI) / 180, ct = Math.cos(t), st = Math.sin(t);
  /** The flower's own frame: v runs from the calyx (−) to the open side (+), foreshortened. */
  const at = (u: number, v: number): [number, number] => { const V = v * b.open; return [x + (-st * u + ct * V) * r, y + (ct * u + st * V) * r]; };
  const petal = (a: number, dist: number, rad: number) => { const cx = Math.cos(a) * dist, cy = Math.sin(a) * dist, n = 10; return Array.from({ length: n }, (_, i) => { const p = a + (i / n) * Math.PI * 2, out2 = Math.cos(p - a), k = rad * (1 + 0.05 * out2 + 0.07 * (d.next() - 0.5) * 2); return [cx + Math.cos(p) * k * 1.02, cy + Math.sin(p) * k] as const; }); };
  const strong = d.range(0.55, 1), base = d.near(Math.PI / 2, 0.35), petals: { a: number; pts: InkPoint[]; order: number }[] = [];
  const push = (a: number, dist: number, rad: number, order: number) => petals.push({ a, order, pts: petal(a, dist, rad).map(([u, v]) => at(u, v)) });
  if (b.kind === "bud") push(Math.PI / 2, 0.24, 0.44, 0);
  else if (b.kind === "half") { push(Math.PI * 0.5 - 0.62, 0.34, 0.4, 0); push(Math.PI * 0.5 + 0.6, 0.34, 0.4, 1); push(Math.PI / 2, 0.36, 0.44, 2); }
  else if (b.kind === "side") { push(0.12, 0.46, 0.4, 0); push(Math.PI - 0.12, 0.48, 0.4, 1); push(Math.PI * 0.5 - 0.5, 0.5, 0.42, 2); push(Math.PI * 0.5 + 0.55, 0.5, 0.44, 3); }
  else for (let k = 0; k < 5; k++) { const a = base + (k * Math.PI * 2) / 5 + d.near(0, 0.14); push(a, 0.52 * d.range(0.92, 1.08), 0.46 * d.range(0.88, 1.1), (k * 2) % 5); }
  petals.sort((p, q) => p.order - q.order);
  if (C) for (const p of petals) out.push(inkClear(p.pts));
  if (b.kind === "face" || b.kind === "back") out.push(inkClear(inkRound(...at(0, 0), r * 0.3, r * 0.3 * Math.max(0.5, b.open), { seed: 3, rough: 0 })));
  for (const p of petals) {
    if (C) {
      const dark = strong * d.range(0.5, 1), mid = at(Math.cos(p.a) * 0.5, Math.sin(p.a) * 0.5), lean = d.range(0, Math.PI * 2);
      out.push(inkBloomed(C, p.pts, { tone: (X, Y) => dark * inkClamp(0.6 + 0.55 * (((X - mid[0]) * Math.cos(lean) + (Y - mid[1]) * Math.sin(lean)) / (r * 0.5)), 0.22, 1.1), soft: 0.8, wander: r * 0.035, wave: r * 0.4, fringe: 0.5, tooth: 2, rim: 0.3, rimWidth: r * 0.08, mottle: 0.35, cloud: r * 0.6, seed: d.seed() }));
      continue;
    }
    // two touches round each petal; they need not meet, and one lies over the next
    out.push(inkClear(p.pts));
    const n = p.pts.length, turn = d.sign(), list = Array.from({ length: n }, (_, i) => p.pts[(((turn * i) % n) + n) % n]), far = Math.round(n / 2) + d.int(-1, 1), at0 = d.int(far - 1, far + 1), w = r * 0.066, g = strong * d.range(0.62, 1);
    const arc = (from: number, count: number): PenNode[] => Array.from({ length: count }, (_, i) => { const [X, Y] = list[(((from + i) % n) + n) % n]; return [X, Y, 0.4 + 0.75 * Math.pow(Math.sin((Math.PI * (i + 0.5)) / count), 0.8)] as const; });
    const c1 = d.int(5, 6), c2 = d.int(4, 6);
    out.push(inkLine(K, arc(at0 - c1 + 1, c1), w, { ink: g, seed: d.seed(), tremor: 0.9 }), inkLine(K, arc(at0 + (d.chance(0.6) ? 0 : 1), c2), w * d.range(0.8, 1.15), { ink: g * 0.94, seed: d.seed(), tremor: 0.9 }));
  }
  // heart: stamens spread like a fan, anthers scattered at their ends
  if (b.kind === "face" || b.kind === "side" || (b.kind === "half" && d.chance(0.5))) {
    const face = b.kind === "face", n = face ? d.int(8, 11) : d.int(5, 7), c0 = face ? at(d.near(0, 0.05), d.near(0, 0.05)) : at(0, 0.12), from = d.range(0, 6.28);
    for (let k = 0; k < n; k++) {
      const a = face ? from + (k / n) * Math.PI * 2 + d.near(0, 0.2) : Math.PI * (0.16 + (0.68 * k) / (n - 1)) + d.near(0, 0.08), L = d.range(0.36, 0.66) * (face ? 1 : 1.25), e = at(Math.cos(a) * L, Math.sin(a) * L + (face ? 0 : 0.1)), m = at(Math.cos(a + 0.12) * L * 0.55, Math.sin(a + 0.12) * L * 0.55 + (face ? 0 : 0.1));
      out.push(inkLine(K, [[...c0, 0.5], [...m, 0.8], [...e, 0.4]], r * 0.04, { ink: 0.86, seed: d.seed() }));
      if (d.chance(0.85)) out.push(inkDot(K, ...at(Math.cos(a) * (L + 0.06), Math.sin(a) * (L + 0.06) + (face ? 0 : 0.1)), r * d.range(0.04, 0.065), { tone: 1, angle: (a * 180) / Math.PI, seed: d.seed() }));
    }
    if (face) out.push(inkLine(K, inkRound(...at(0, 0), r * 0.09, r * 0.09 * Math.max(0.6, b.open), { seed: d.seed(), n: 6 }).map(([X, Y]) => [X, Y, 0.8] as const), r * 0.05, { ink: 0.8, seed: d.seed() }));
  }
  // calyx: ink dots where the flower sits
  if (b.kind !== "face") for (const [u, v, k] of (b.kind === "back" ? [[0, 0, 0.8], [0.13, 0.1, 0.62], [-0.13, 0.11, 0.66], [0.02, -0.16, 0.6]] : [[0, -0.06, 0.95], [0.16, 0.05, 0.78], [-0.16, 0.06, 0.8]]) as [number, number, number][]) { const [X, Y] = at(u * (b.kind === "bud" ? 1.1 : 1.3), v); out.push(inkDot(K, X, Y, r * 0.115 * k, { tone: 1, angle: b.turn + 90 * u * 2, long: 1.5, seed: d.seed() })); }
  return out;
}
const PLUM_HABITS: Readonly<Record<NonNullable<InkPlumOptions["habit"]>, { trunk: Limb; arms: readonly Limb[]; shoots: readonly (readonly [number, number, number, number, number])[] }>> = {
  // page 1400 × 1000, coming in from the left; shoots are x, y, angle, length, bend
  rise: {
    trunk: [[-30, 846, 84], [128, 752, 74], [214, 612, 62], [402, 566, 52], [506, 438, 40], [690, 408, 28]],
    arms: [
      [[690, 408, 28], [800, 322, 20], [984, 306, 14], [1112, 226, 9], [1262, 206, 4]],
      [[214, 612, 40], [196, 470, 28], [282, 352, 20], [262, 230, 13], [326, 118, 5]],
      [[506, 438, 24], [592, 528, 18], [764, 566, 13], [886, 652, 8], [1030, 684, 4]],
    ],
    shoots: [[402, 566, -74, 300, 8], [800, 322, -58, 220, -6], [300, 590, -86, 190, 5], [984, 306, 34, 190, -10], [196, 470, -128, 170, 10], [590, 424, -66, 250, 6]],
  },
  across: {
    trunk: [[-30, 300, 78], [146, 352, 70], [262, 470, 60], [448, 472, 50], [556, 566, 38], [742, 540, 28]],
    arms: [
      [[742, 540, 28], [862, 606, 20], [1030, 570, 14], [1154, 632, 9], [1296, 606, 4]],
      [[262, 470, 34], [300, 616, 25], [420, 704, 18], [436, 822, 12], [540, 902, 5]],
      [[556, 566, 24], [640, 430, 18], [792, 392, 13], [872, 280, 8], [1010, 236, 4]],
    ],
    shoots: [[448, 472, -62, 280, 6], [862, 606, -48, 250, -8], [146, 352, -70, 190, 6], [1030, 570, 40, 170, 8], [640, 430, -84, 220, 6]],
  },
  hang: {
    trunk: [[-30, 120, 84], [150, 148, 74], [282, 250, 62], [452, 246, 50], [566, 346, 40], [716, 360, 30]],
    arms: [
      [[716, 360, 30], [804, 486, 21], [968, 540, 15], [1040, 672, 10], [1176, 752, 4]],
      [[452, 246, 30], [574, 176, 22], [740, 190, 15], [858, 128, 9], [1010, 132, 4]],
      [[282, 250, 34], [300, 412, 24], [414, 522, 17], [420, 668, 11], [512, 790, 4]],
    ],
    shoots: [[566, 346, 66, 300, -8], [804, 486, -24, 260, 8], [300, 412, 112, 180, -6], [968, 540, 22, 210, 6], [574, 176, -62, 120, 4]],
  },
};
/** 梅 */
export function inkPlum(o: InkPlumOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 300), page = { width: 1400, height: 1000 }, plan = PLUM_HABITS[o.habit ?? "rise"], flip = o.from === "right", C = o.bloom === "colour" ? "petal" : null, size = o.size ?? 36, total = Math.max(0, Math.round(o.flowers ?? 58));
  const mx = (x: number) => (flip ? page.width - x : x), mirror = (l: Limb): Limb => l.map(([x, y, w]) => [mx(x), y, w] as const), down = o.habit === "hang" ? -1 : 1, lit: 1 | -1 = flip ? -1 : 1;
  const trunk = jitter(d, mirror(plan.trunk), 16), arms = plan.arms.map(a => { const l = jitter(d, mirror(a), 18), near = trunk.reduce((b, p) => (Math.hypot(p[0] - l[0][0], p[1] - l[0][1]) < Math.hypot(b[0] - l[0][0], b[1] - l[0][1]) ? p : b)); l[0] = [near[0], near[1], Math.min(l[0][2], near[2] * 0.72)]; return l; });
  const shoots = plan.shoots.map(([x, y, a, len, bend]) => {
    // a shoot grows from the nearest bone
    const all = [...trunk, ...arms.flat()], p = all.reduce((b, q) => (Math.hypot(q[0] - mx(x), q[1] - y) < Math.hypot(b[0] - mx(x), b[1] - y) ? q : b)), ang = (flip ? 180 - a : a) + d.near(0, 10), L = len * d.range(0.8, 1.15), m = inkStep(p[0], p[1], ang, L * 0.5), e = inkStep(m[0], m[1], ang + (flip ? -bend : bend), L * 0.5);
    return { limb: [[p[0], p[1], d.range(6.5, 9)], [m[0], m[1], 5], [e[0], e[1], 2.2]] as [number, number, number][], of: arms.findIndex(l => l.includes(p)) };
  });
  for (const [i, a] of arms.entries()) for (let k = 1; k < a.length - 1; k++) if (d.chance(0.72)) { const p = a[k], dir = (Math.atan2(a[k + 1][1] - p[1], a[k + 1][0] - p[0]) * 180) / Math.PI, ang = dir + d.sign() * d.range(30, 64), L = d.range(80, 190), m = inkStep(p[0], p[1], ang, L * 0.5), e = inkStep(m[0], m[1], ang + d.near(0, 9), L * 0.5); if (e[0] > 60 && e[0] < page.width - 60 && e[1] > 60 && e[1] < page.height - 60) shoots.push({ limb: [[p[0], p[1], d.range(5, 7.5)], [m[0], m[1], 4], [e[0], e[1], 2]], of: i }); }
  // flowers sit in threes and fives along the twigs, opening toward the root and shut at the tip
  const limbs = [...arms.map((l, i) => ({ limb: l, arm: i, from: 1 })), ...shoots.map((s, i) => ({ limb: s.limb, arm: 100 + i, from: 0 }))], weights = limbs.map(l => l.limb.slice(1).reduce((v, p, i) => v + Math.hypot(p[0] - l.limb[i][0], p[1] - l.limb[i][1]), 0) * (l.arm >= 100 ? 0.8 : 1) * d.range(0.6, 1.4)), sum = weights.reduce((a, b) => a + b, 0), taken: Blossom[] = [], own = new Map<number, Blossom[]>();
  for (const [i, l] of limbs.entries()) {
    let left = Math.round((total * weights[i]) / sum);
    for (let tries = 0; left > 0 && tries < 60; tries++) {
      const u = l.arm >= 100 ? d.range(0.12, 1) : Math.pow(d.range(0.04, 1), 0.8), f = l.from + u * (l.limb.length - 1 - l.from), k = Math.min(l.limb.length - 2, Math.floor(f)), q = f - k, [ax, ay] = l.limb[k], [bx, by] = l.limb[k + 1], dir = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI, cluster = Math.min(left, d.pick([1, 1, 2, 3, 3, 4, 5]));
      let s = d.sign();
      for (let m = 0; m < cluster; m++, s = d.chance(0.7) ? (-s as 1 | -1) : s) {
        const late = u > 0.86 || d.chance(0.14), r = size * (late ? d.range(0.6, 0.85) : d.range(0.82, 1.12)), turn = dir + s * d.range(28, 108), away = r * (late ? d.range(0.1, 0.3) : d.range(0.15, 0.7)) + 2, along = d.near(0, size * 0.9), x = inkLerp(ax, bx, q) + Math.cos((dir * Math.PI) / 180) * along + Math.cos((turn * Math.PI) / 180) * away, y = inkLerp(ay, by, q) + Math.sin((dir * Math.PI) / 180) * along + Math.sin((turn * Math.PI) / 180) * away;
        if (x < 50 || y < 50 || x > page.width - 50 || y > page.height - 50 || taken.some(t => Math.hypot(t.x - x, t.y - y) < (t.r + r) * 0.66)) continue;
        const kind = late ? (d.chance(0.66) ? "bud" : "half") : d.pick(["face", "face", "face", "side", "back", "half"] as const), b: Blossom = { x, y, r, turn, kind, open: kind === "face" || kind === "back" ? d.range(0.62, 1) : d.range(0.85, 1) };
        taken.push(b); own.set(l.arm, [...(own.get(l.arm) ?? []), b]); left--;
      }
    }
  }
  const parts: InkPart[] = [], groups: Record<string, readonly InkMotion[]> = {}, swayOf = (l: readonly (readonly number[])[], k: number): InkMotion[] => [{ kind: "sway", from: [l[0][0], l[0][1]], to: [l[l.length - 1][0], l[l.length - 1][1]], amount: 7, seconds: 5.4 + k * 0.6, phase: k * 1.7, power: 2 }];
  const flowersOf = (arm: number, e: InkDice) => (own.get(arm) ?? []).sort((a, b) => a.r - b.r).flatMap(b => blossomMarks(e, b, C)), body = C ? undefined : "#FDFBF5";
  const trunkMarks = [...limbMarks(d, K, trunk, { side: lit, dry: 0.32 }), ...mossMarks(d, K, trunk, 9, down)];
  // spurs: short dead twigs at the turns
  for (let k = 0; k < 4; k++) { const i = d.int(1, trunk.length - 2), [x, y, w] = trunk[i], dir = (Math.atan2(trunk[i + 1][1] - y, trunk[i + 1][0] - x) * 180) / Math.PI, a = dir + d.sign() * d.range(40, 80), L = w * 0.4 + d.range(14, 44), m = inkStep(x, y, a, L * 0.6), e = inkStep(m[0], m[1], a + d.near(0, 34), L * 0.4); trunkMarks.push(inkLine(K, [[x, y, 1.5], [m[0], m[1], 0.7], [e[0], e[1], 0.16]], d.range(5, 9), { ink: 0.95, tremor: 1.8, seed: d.seed() })); }
  parts.push(inkMarksPart("trunk", trunkMarks, page));
  for (const [i, a] of arms.entries()) { const id = `arm${i + 1}`; groups[id] = swayOf(a, i + 4); parts.push(inkMarksPart(id, [...shoots.filter(s => s.of === i).flatMap(s => limbMarks(d, K, s.limb, { tone: 0.92 })), ...limbMarks(d, K, a, { side: lit, dry: 0.28 }), ...mossMarks(d, K, a, 3, down)], page, { group: id })); }
  for (const [i, s] of shoots.entries()) if (s.of < 0) parts.push(inkMarksPart(`shoot${i + 1}`, [...limbMarks(d, K, s.limb, { tone: 0.92 }), ...flowersOf(100 + i, d.fork(70 + i))], page, { motion: swayOf(s.limb, i), body }));
  for (const [i, a] of arms.entries()) parts.push(inkMarksPart(`arm${i + 1}-flowers`, [...shoots.flatMap((s, k) => (s.of === i ? flowersOf(100 + k, d.fork(70 + k)) : [])), ...flowersOf(i, d.fork(40 + i))], page, { group: `arm${i + 1}`, body, motion: [{ kind: "turn", at: [a[0][0], a[0][1]], degrees: 0.35, seconds: 2.7 + i * 0.4, phase: i * 2 }] }));
  return { id: `plum-${seed}`, label: `Plum blossom on an old branch, ${C ? "pressed in colour" : "ringed in ink"}`, page, plates: inkPlates(C ? { petal: o.pigment ?? "rouge", [K]: "ink" } : [K]), seed: 11 + seed, parts, groups };
}

// ---- pine ----------------------------------------------------------------------------------------------------------------------
export interface InkPineOptions {
  seed?: number;
  /** One limb reaching in from the side, or a whole old tree. */
  form?: "branch" | "tree";
  /** The side the limb comes in from, or the side the tree leans away from. */
  from?: "left" | "right";
  /** How thick the needles are, 0–1. */
  needles?: number;
  /** Water colour laid under the needles; "none" leaves them on bare paper. */
  wash?: "indigo" | "teal" | "ink" | "none";
}
/** The same wood never grows twice: one slow swell through the whole, then each twig turned about its own root, longer or shorter. */
function grower(d: InkDice, amount: number) { const a = d.range(0, 6.3), b = d.range(0, 6.3), k = amount * d.range(0.5, 1); return { swell: (x: number, y: number): [number, number] => [x + 0.5 * k * Math.sin(y / 260 + b), y + k * (Math.sin(x / 330 + a) - Math.sin(a))], turn: (l: Limb, degrees: number, long: number): Limb => { const t = d.near(0, degrees) * (Math.PI / 180), g = d.range(1 - long, 1 + long * 0.7), c = Math.cos(t) * g, q = Math.sin(t) * g, [x0, y0] = l[0]; return l.map(([x, y, w]) => [x0 + (x - x0) * c - (y - y0) * q, y0 + (x - x0) * q + (y - y0) * c, w] as const); } }; }
/** A wheel of needles, or the part of it that is seen: pulled from outside to the heart, so the heart is dark. */
function needleWheel(d: InkDice, x: number, y: number, r: number, facing: number, spread: number, tone: number, n: number): InkMark[] {
  const out: InkMark[] = [], squash = d.range(0.66, 0.9);
  for (let k = 0; k < n; k++) {
    const u = n === 1 ? 0 : k / (n - 1) - 0.5, a = facing + u * spread + d.near(0, 5), L = r * d.range(0.8, 1.08) * (1 - 0.16 * Math.abs(u)), e = inkStep(0, 0, a, L), bend = u * 7 + d.near(0, 3), m = inkStep(0, 0, a - bend, L * 0.5), h = inkStep(0, 0, a, r * d.range(0.03, 0.1));
    const at = ([px, py]: [number, number], p: number): PenNode => [x + px, y + py * squash, p];
    out.push(inkLine(K, [at(h, 1), at(m, 0.86), at(e, 0.16)], d.range(2, 2.9), { ink: tone, inkEnd: tone * 0.86, tremor: 0.4, seed: d.seed() }));
  }
  return out;
}
/** A pad of needles on the end of an arm: pale wheels behind, dark ones before them, flat below like a cloud. */
function needlePad(d: InkDice, x: number, y: number, wide: number, size: number, thick: number, wash: string | null): InkMark[] {
  const out: InkMark[] = [], rows: readonly (readonly [number, number, number, number])[] = [[-0.62, 0.42, 0.5, 0.62], [-0.28, 0.66, 0.8, 0.9], [0.02, 1, 1, 1]], many = Math.max(2, (wide / size) * (1.3 + 1.3 * thick));
  // one wash under the pad: level below, domed and uneven above
  if (wash) { const m = 5, dome = Array.from({ length: m }, (_, k) => { const u = 1 - (k / (m - 1)) * 2; return [x + u * wide * 0.96, y - size * (0.34 + 0.72 * (1 - u * u)) * d.range(0.8, 1.2)] as const; }); out.push(inkBloomed(wash, [[x - wide * 1.1, y - size * 0.02], [x - wide * 0.4, y + size * d.range(0.04, 0.16)], [x + wide * 0.4, y + size * d.range(0, 0.12)], [x + wide * 1.1, y - size * 0.02], ...dome], { tone: d.range(0.26, 0.42), soft: size * 0.3, wander: size * 0.2, wave: size * 0.7, fringe: 0, rim: 0.1, mottle: 0.55, cloud: size * 0.9, seed: d.seed() })); }
  for (const [lift, tone, share, span] of rows) {
    const n = Math.max(1, Math.round(many * share));
    for (let k = 0; k < n; k++) {
      const u = (n === 1 ? d.near(0, 0.3) : ((k + d.range(0.1, 0.9)) / n) * 2 - 1) * span, cx = x + u * wide, cy = y + size * lift + u * u * size * 0.42 + d.near(0, size * 0.16), r = size * d.range(0.66, 1.1), whole = d.chance(0.14);
      out.push(...needleWheel(d, cx, cy, r, -90 + u * d.range(14, 44) + d.near(0, 8), whole ? 330 : d.range(150, 214), tone * d.range(0.78, 1.06), Math.round((whole ? 24 : 17) * (0.7 + 0.6 * thick) * d.range(0.85, 1.15))));
    }
  }
  return out;
}
interface PinePlan { page: { width: number; height: number }; trunk: Limb; roots?: readonly Limb[]; arms: readonly { limb: Limb; pads: readonly (readonly [number, number, number])[] }[] }
const PINES: Readonly<Record<"branch" | "tree", PinePlan>> = {
  // pads are x, y, half width
  branch: {
    page: { width: 1400, height: 900 },
    trunk: [[-30, 196, 78], [122, 252, 70], [268, 226, 58], [420, 330, 48]],
    arms: [
      { limb: [[268, 226, 34], [352, 128, 24], [520, 112, 16], [650, 150, 8]], pads: [[430, 108, 60], [640, 138, 92], [350, 70, 48]] },
      { limb: [[420, 330, 46], [584, 372, 34], [742, 330, 25], [930, 388, 17], [1090, 366, 10], [1210, 404, 5]], pads: [[720, 306, 90], [936, 356, 110], [1180, 388, 128], [1050, 318, 62], [560, 330, 46]] },
      { limb: [[420, 330, 34], [470, 468, 25], [624, 540, 18], [742, 530, 11], [850, 592, 5]], pads: [[610, 516, 64], [826, 574, 112], [740, 508, 56]] },
      { limb: [[122, 252, 30], [150, 398, 22], [238, 486, 15], [330, 506, 7]], pads: [[236, 470, 48], [336, 500, 84]] },
    ],
  },
  tree: {
    page: { width: 1300, height: 1500 },
    trunk: [[470, 1400, 100], [526, 1250, 86], [468, 1090, 76], [520, 930, 70], [628, 800, 60], [604, 640, 48], [676, 500, 36], [650, 380, 24], [690, 290, 13]],
    roots: [[[520, 1262, 44], [552, 1366, 42], [628, 1414, 22], [690, 1418, 12]], [[486, 1290, 48], [424, 1382, 42], [336, 1420, 22], [282, 1424, 12]], [[492, 1330, 40], [498, 1412, 28], [470, 1446, 7]]],
    arms: [
      { limb: [[628, 800, 44], [770, 806, 32], [890, 862, 23], [1030, 876, 14], [1170, 930, 6]], pads: [[778, 776, 82], [900, 832, 110], [1096, 896, 128], [1000, 806, 96]] },
      { limb: [[520, 930, 38], [400, 900, 26], [290, 930, 17], [190, 910, 7]], pads: [[392, 866, 80], [236, 892, 122], [306, 818, 84]] },
      { limb: [[604, 640, 32], [490, 590, 22], [370, 612, 14], [260, 590, 6]], pads: [[480, 560, 78], [314, 584, 124], [398, 502, 80]] },
      { limb: [[676, 500, 27], [790, 520, 19], [900, 496, 12], [1010, 520, 6]], pads: [[800, 490, 74], [940, 494, 118], [856, 424, 72]] },
      { limb: [[650, 380, 20], [550, 350, 14], [440, 372, 7]], pads: [[548, 336, 72], [446, 358, 110]] },
      { limb: [[690, 290, 13], [760, 250, 9], [850, 262, 5]], pads: [[700, 262, 108], [832, 252, 84], [612, 224, 66], [724, 178, 76]] },
      { limb: [[468, 1090, 28], [600, 1060, 18], [700, 1090, 8]], pads: [[660, 1066, 92]] },
    ],
  },
};
/** 松 */
export function inkPine(o: InkPineOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 600), form = o.form ?? "branch", plan = PINES[form], { page } = plan, flip = o.from === "right", thick = inkClamp(o.needles ?? 0.6), tint = (o.wash ?? "teal") === "none" ? null : "wash", size = form === "branch" ? 66 : 62, lit: 1 | -1 = flip ? -1 : 1;
  const mx = (x: number) => (flip ? page.width - x : x), place = (l: Limb, k: number) => jitter(d, l.map(([x, y, w]) => [mx(x), y, w] as const), k), trunk = place(plan.trunk, 12), root = (l: [number, number, number][], x: number, y: number) => { const p = trunk.reduce((b, q) => (Math.hypot(q[0] - mx(x), q[1] - y) < Math.hypot(b[0] - mx(x), b[1] - y) ? q : b)); l[0] = [p[0], p[1], Math.min(l[0][2], p[2] * 0.8)]; return l; };
  const parts: InkPart[] = [], behind: InkPart[] = [], groups: Record<string, readonly InkMotion[]> = {};
  for (const [i, a] of plan.arms.entries()) {
    const id = `arm${i + 1}`, g = d.fork(20 + i), limb = root(place(a.limb, 14), a.limb[0][0], a.limb[0][1]), end = limb[limb.length - 1], bones = limbMarks(g, K, limb, { side: lit, dry: 0.3, bark: "scale" }), pads: InkMark[] = [];
    for (const [px, py, pw] of a.pads) {
      const x = mx(px) + g.near(0, 14), y = py + g.near(0, 10), w = pw * g.range(0.86, 1.14);
      // twigs that carry the pad, like a crab's claw
      const from = limb.reduce((b, q) => (Math.hypot(q[0] - x, q[1] - y) < Math.hypot(b[0] - x, b[1] - y) ? q : b));
      for (let k = 0, m = 2 + Math.round(w / 50); k < m; k++) { const u = (k + g.range(0.2, 0.8)) / m * 2 - 1, tx = x + u * w * 0.86, ty = y + u * u * size * 0.2 - size * 0.06, sx = inkLerp(from[0], x, 0.5 + 0.2 * g.next()), sy = inkLerp(from[1], y, 0.4) + size * 0.1; bones.push(inkLine(K, [[from[0] + g.near(0, 6), from[1], 1.3], [inkLerp(sx, tx, 0.3), sy + g.near(0, 6), 0.9], [inkLerp(sx, tx, 0.75), inkLerp(sy, ty, 0.7) + g.near(0, 6), 0.7], [tx, ty, 0.4]], g.range(3.4, 5.4), { ink: 0.9, tremor: 1.4, seed: g.seed() })); }
      pads.push(...needlePad(g, x, y, w, size * g.range(0.9, 1.08), thick, tint));
    }
    // its very end carries a tuft
    pads.push(...needlePad(g, end[0] + (end[0] - limb[limb.length - 2][0]) * 0.06, end[1] + 4, size * 0.42, size * 0.8, thick * 0.6, null));
    // dead stubs and moss on the arm
    for (let k = g.int(1, 2); k > 0; k--) { const [x, y, w] = limb[g.int(0, limb.length - 2)], an = g.range(40, 140), L = g.range(18, 46), m = inkStep(x, y, an, L * 0.6), e = inkStep(m[0], m[1], an + g.near(0, 50), L * 0.5); bones.push(inkLine(K, [[x, y + w * 0.2, 1.4], [m[0], m[1], 0.8], [e[0], e[1], 0.2]], g.range(4, 6), { ink: 0.9, tremor: 1.4, seed: g.seed() })); }
    bones.push(...mossMarks(g, K, limb, 3, 1));
    groups[id] = [{ kind: "sway", from: [limb[0][0], limb[0][1]], to: [end[0], end[1]], amount: 5, seconds: 6 + i * 0.5, phase: i * 1.9, power: 1.8 }];
    behind.push(inkMarksPart(id, bones, page, { group: id }));
    parts.push(inkMarksPart(`${id}-needles`, pads, page, { group: id, motion: [{ kind: "sway", from: [end[0], end[1] + 60], to: [end[0], end[1] - 60], amount: 2.4, seconds: 2.6 + i * 0.3, phase: i * 2.3 }] }));
  }
  const t = d.fork(9), body = [...(plan.roots ?? []).flatMap(r => limbMarks(t, K, place(r, 8), { side: lit, dry: 0.4, bark: "scale" })), ...limbMarks(t, K, trunk, { side: lit, dry: 0.36, bark: "scale" }), ...mossMarks(t, K, trunk, form === "tree" ? 12 : 6, 0.8)];
  if (form === "tree") { const gx = trunk[0][0], gy = trunk[0][1] + 20; body.push(inkStroke(K, [[gx - 330, gy + 8, 0.1], [gx - 120, gy + 22, 0.7], [gx + 150, gy + 14, 0.9], [gx + 380, gy + 26, 0.1]], 24, { tip: 0.34, belly: 0.08, side: -1, dry: 0.45, dryEnd: 1, bristles: 11, seed: t.seed() })); for (let k = 0; k < 22; k++) { const c = t.pick([-190, -150, -40, 60, 190, 230]), x = gx + c + t.near(0, 46), y = gy + t.range(0, 18); body.push(k % 5 === 4 ? inkDot(K, x, y, t.range(3, 6), { tone: t.range(0.6, 0.95), angle: t.near(0, 30), long: 1.5, seed: t.seed() }) : inkLine(K, [[x, y, 1], [...inkStep(x, y, -90 + t.near(0, 30), 18), 0.8], [...inkStep(x, y, -90 + t.near(0, 46), t.range(26, 48)), 0.1]], t.range(2, 3.4), { ink: t.range(0.5, 0.9), seed: t.seed() })); } }
  // a knot hole
  { const i = t.int(1, trunk.length - 3), [ax, ay, aw] = trunk[i], [bx, by] = trunk[i + 1], x = inkLerp(ax, bx, 0.45), y = inkLerp(ay, by, 0.45), a = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI; for (const [k, s] of [[1, 1], [0.6, 0.8]] as const) body.push(inkLine(K, [...inkRound(x, y, aw * 0.2 * k, aw * 0.12 * k, { angle: a, rough: 0.2, seed: t.seed(), n: 8 }).map(([X, Y], j) => [X, Y, 0.5 + 0.6 * ((j * 5) % 8) / 8] as const)], 2 + aw * 0.03, { ink: 0.95 * s, tremor: 1.4, seed: t.seed() })); body.push(inkDot(K, x, y, aw * 0.07, { tone: 0.95, angle: a, long: 1.7, seed: t.seed() })); }
  return { id: `pine-${form}-${seed}`, label: form === "tree" ? "An old pine: scaled trunk, level arms, wheels of needles" : "A pine branch with wheels of needles, in ink", page, plates: inkPlates(tint ? { wash: (o.wash ?? "teal") as "indigo" | "teal" | "ink", [K]: "ink" } : [K]), seed: 11 + seed, parts: [...behind.slice(0, form === "tree" ? 2 : 0), inkMarksPart("trunk", body, page), ...behind.slice(form === "tree" ? 2 : 0), ...parts], groups };
}

// ---- lotus ---------------------------------------------------------------------------------------------------------------------
export interface InkLotusOptions {
  seed?: number;
  /** Leaves, 1–4: a great one, one seen on edge, one in the mist, a young one still rolled. */
  leaves?: number;
  /** Open flowers, 0–2. */
  flowers?: number;
  /** A shut bud and a seed head. */
  bud?: boolean; pod?: boolean;
  /** Colour of the petals, and of the leaves. */
  pigment?: "rouge" | "peach" | "cinnabar" | "ink"; leaf?: "ink" | "indigo" | "malachite";
  /** How it is arranged: a great leaf over an open flower; a flower standing tall over a low leaf; the flower across from the leaf. Left out, the seed decides. */
  habit?: "under" | "tall" | "across";
  /** Mirrored, or not. */
  side?: "left" | "right";
}
/** Where everything stands: x, y, size, foot on the water; a leaf also how flat it lies and how it tips. */
const LOTUS_HABITS = {
  under: { great: [420, 520, 296, 520, 0.66, -14], mist: [800, 960, 232, 640, 0.46, 10], edge: [886, 196, 330, 700], bud: [596, 268, 150, 560], pod: [1010, 560, 108, 780], young: [236, 1000, 1, 440], flower: [812, 730, 206, 672], second: [250, 236, 112, 480] },
  tall: { great: [404, 836, 312, 530, 0.56, -9], mist: [884, 1040, 206, 690, 0.4, 8], edge: [944, 600, 300, 740], bud: [286, 372, 140, 486], pod: [1040, 330, 104, 800], young: [140, 1170, 0.86, 400], flower: [664, 372, 204, 618], second: [990, 830, 104, 740] },
  across: { great: [782, 720, 304, 640, 0.6, 13], mist: [336, 1010, 220, 540, 0.42, -8], edge: [860, 218, 300, 700], bud: [628, 250, 144, 610], pod: [164, 720, 104, 470], young: [1056, 1080, 0.9, 770], flower: [396, 440, 212, 572], second: [1040, 430, 108, 780] },
} as const;
interface LotusLeaf { x: number; y: number; r: number; flat: number; angle: number; tone: number; /** Where the rim is turned over, degrees, or none. */ lip?: number }
/**
 * A lotus leaf splashed in: broad wet strokes from the heart out, each with its own water. Some run into the next, some leave a
 * thread of paper between them and one or two a torn gap down to the rim; the veins are drawn while it is wet, so they blur.
 */
function lotusLeaf(d: InkDice, plate: string, l: LotusLeaf): InkMark[] {
  const n = d.int(11, 14), TAU = Math.PI * 2, a0 = d.range(0, TAU), cuts: number[] = [];
  for (let k = 0, a = 0; k < n; k++) { cuts.push(a); a += d.range(0.5, 1.5); if (k === n - 1) for (let i = 0; i < n; i++) cuts[i] *= TAU / a; }
  // how the paper shows before each stroke: shut, a thread that closes on the way out, or a gap to the rim
  let tears = 0;
  const strokes = cuts.map((from) => { const p = d.next(), torn = p > 0.8 && tears++ < 3; return { from, tone: d.range(0.5, 1.25), out: d.range(0.86, 1.09), gap: torn ? d.range(2.4, 4.6) : p > 0.42 ? d.range(0.9, 2.2) : 0.2, reach: torn ? 1.3 : d.range(0.34, 0.95), wet: d.range(-1, 1), vein: d.chance(0.72) ? d.range(0.2, 0.5) : 0 }; });
  const c = Math.cos((l.angle * Math.PI) / 180), s = Math.sin((l.angle * Math.PI) / 180), hx = d.near(0, 0.16), hy = -0.18, dark = d.range(0, TAU), noise = d.seed();
  const place = (a: number, q: number): [number, number] => { const u = (Math.cos(a) * q + hx * (1 - q)) * l.r, v = (Math.sin(a) * q + hy * (1 - q)) * l.r * l.flat; return [l.x + u * c - v * s, l.y + u * s + v * c]; };
  const end = (k: number) => (k === n - 1 ? TAU : strokes[k + 1].from), rim: [number, number][] = [], rimAt: [number, number][] = [];
  for (const [k, q] of strokes.entries()) {
    const w = end(k) - q.from, next = strokes[(k + 1) % n];
    for (const [t, o] of [[0.06, 0.96], [0.32, 1.01], [0.6, 1.03], [0.84, 0.98]] as const) { const a = a0 + q.from + w * t, e = q.out * o + d.near(0, 0.018); rim.push(place(a, e)); rimAt.push([a, e]); }
    if (next.reach > 1 || d.chance(0.25)) { const a = a0 + end(k) - 0.01, e = Math.min(q.out, next.out) * (next.reach > 1 ? d.range(0.74, 0.86) : d.range(0.88, 0.94)); rim.push(place(a, e)); rimAt.push([a, e]); }
  }
  const tone = (X: number, Y: number) => {
    const u0 = (X - l.x) / l.r, v0 = (Y - l.y) / l.r, u = u0 * c + v0 * s, v = (-u0 * s + v0 * c) / l.flat;
    // the heart is off the middle: unwind the shift that grows toward it
    const q0 = Math.min(1.2, Math.hypot(u, v)), U = u - hx * (1 - q0), V = v - hy * (1 - q0), q = Math.hypot(U, V);
    let a = Math.atan2(V, U) - a0 + (0.11 * (inkNoise2(noise, q * 4, 3) - 0.5)) / Math.max(0.25, q);
    a = ((a % TAU) + TAU) % TAU;
    let k = n - 1; while (k > 0 && strokes[k].from > a) k--;
    const st = strokes[k], to = end(k), next = strokes[(k + 1) % n], first = a - st.from < to - a, side = first ? st : next, near = Math.min(a - st.from, to - a) * q * l.r;
    const gap = side.gap * 1.7 * (1.1 - 0.5 * q) * inkEase(side.reach + 0.1, side.reach - 0.16, q) * (0.55 + 0.9 * inkNoise2(noise + 1, q * 9 + k * 7, first ? 1 : 5)) + 1.6 * (inkNoise2(noise + 6, X / 4, Y / 4) - 0.5) * inkEase(0.9, 0.4, q);
    const f = (a - st.from) / (to - st.from), hair = inkNoise2(noise + 2, a * 34, q * 1.6), pool = inkFbm2(noise + 3, X / 64, Y / 64, 3);
    let t = l.tone * st.tone * (0.46 + 0.56 * inkEase(0, 0.66, q)) * (0.9 + 0.2 * inkNoise2(noise + 2 + k, f * 6, q * 2)) * (0.62 + 0.8 * pool) * (1 + 0.3 * Math.cos(a + a0 - dark));
    t *= 1 + 0.36 * st.wet * (f - 0.5) * 2;
    // the vein, put in before it dried
    t += st.vein * l.tone * Math.exp(-Math.pow(((f - 0.5 - 0.1 * st.wet * q) * (to - st.from) * q * l.r) / (1.6 + 1.6 * pool), 2)) * inkEase(0.94, 0.5, q);
    // the brush lands dry at the heart: its hairs show
    t *= inkLerp(1, inkEase(0.3, 0.62, hair), 0.85 * inkEase(0.34, 0.08, q));
    return inkClamp(t * (gap > 0.15 ? inkEase(gap - 0.8, gap + 0.8, near) : 1) * inkEase(0.015, 0.06, q + 0.03 * (inkNoise2(noise + 5, a * 3, 1) - 0.5)));
  };
  const wash = { soft: 0.9, wander: 5, wave: 34, fringe: 1.4, tooth: 2.6, rim: 0.3, rimWidth: 4, halo: 0.26, haloAt: 13, haloWidth: 5, mottle: 0.22, cloud: 46 };
  const out: InkMark[] = [inkClear(rim), inkBloomed(plate, rim, { tone, ...wash, seed: d.seed() })];
  const [X, Y] = place(0, 0);
  if (l.tone > 0.45) out.push(inkDot(K, X, Y, l.r * 0.02, { tone: 0.85, long: 1.6, angle: l.angle, seed: d.seed() }));
  if (l.lip !== undefined) {
    // a stretch of the rim folded over: its pale underside, with its own veins
    const mid = (l.lip * Math.PI) / 180, half = d.range(0.5, 0.66), m = 11, at = (t: number, q: number) => place(mid + (t * 2 - 1) * half, q), deep = d.range(0.2, 0.27);
    const outer = Array.from({ length: m }, (_, i) => { const t = i / (m - 1); return at(t, 1 + 0.05 * Math.sin(Math.PI * t) + 0.045 * Math.sin(t * 13 + 1) * Math.sin(Math.PI * t)); }), inner = Array.from({ length: m }, (_, i) => { const t = i / (m - 1); return at(t, 1.0 - deep * Math.pow(Math.sin(Math.PI * t), 0.8) + 0.025 * Math.sin(t * 9 + 2)); }), shape = [...outer, ...[...inner].reverse()], ns = d.seed();
    out.push(inkClear(shape), inkBloomed(plate, shape, { tone: (x, y) => inkClamp(l.tone * 0.42 * (0.45 + 1.1 * inkFbm2(ns, x / 34, y / 34, 3))), ...wash, wander: 2, halo: 0, fringe: 0.9, rim: 0.5, seed: d.seed() }));
    for (let i = 1; i < 7; i++) { const t = i / 7 + d.near(0, 0.03), b = at(t, 1.0 - deep * 0.9 * Math.pow(Math.sin(Math.PI * t), 0.8)), e = at(t + d.near(0, 0.02), 1.0); out.push(inkLine(plate, [[...b, 1], [(b[0] + e[0]) / 2 + d.near(0, 2), (b[1] + e[1]) / 2, 0.7], [...e, 0.1]], 2.4, { ink: l.tone * 0.8, seed: d.seed() })); }
    out.push(inkLine(plate, inner.map(([x, y], i) => [x, y, 0.2 + 0.9 * Math.sin((Math.PI * i) / (m - 1)) * (0.7 + 0.4 * Math.sin(i * 1.9))] as const), 3.4, { ink: Math.min(1, l.tone * 1.1), tremor: 1, seed: d.seed() }));
  }
  return out;
}
/** A leaf seen on its edge, like a half-shut umbrella: the far lip pale, the near side nearly black, its lobes hanging unequal. */
function lotusEdge(d: InkDice, plate: string, x: number, y: number, w: number, sg: number, tilt: number): InkMark[] {
  const at = (u: number, v: number): [number, number] => { const p = inkStep(x, y, tilt, u * w * sg), q = inkStep(p[0], p[1], tilt + 90, v * w); return q; }, j = () => d.near(0, 0.014), n = d.seed(), pts = (list: readonly (readonly [number, number])[]): [number, number][] => list.map(([u, v]) => at(u + j(), v + j()));
  const far = pts([[-0.5, 0.04], [-0.42, -0.09], [-0.26, -0.15], [-0.14, -0.13], [0.02, -0.17], [0.2, -0.14], [0.36, -0.17], [0.5, -0.11], [0.52, -0.02], [0.3, 0.02], [0, 0.02], [-0.3, 0.04]]), near = pts([[-0.52, 0.05], [-0.44, -0.03], [-0.3, -0.06], [-0.14, -0.02], [0, 0.01], [0.16, -0.03], [0.32, -0.07], [0.46, -0.07], [0.56, -0.01], [0.53, 0.07], [0.45, 0.09], [0.41, 0.07], [0.37, 0.15], [0.29, 0.18], [0.23, 0.11], [0.17, 0.2], [0.09, 0.2], [0.04, 0.11], [-0.03, 0.15], [-0.1, 0.12], [-0.15, 0.23], [-0.25, 0.27], [-0.3, 0.17], [-0.36, 0.25], [-0.46, 0.29], [-0.54, 0.2]]), top = at(0, -0.01);
  const streak = (X: number, Y: number, k: number) => { const a = Math.atan2(Y - top[1], X - top[0]), q = Math.hypot(X - top[0], Y - top[1]) / w; return (0.74 + 0.6 * (inkNoise2(n + k, a * 7, q * 1.6) - 0.5) + 0.7 * (inkFbm2(n + 2 + k, X / 46, Y / 46, 3) - 0.5)) * (0.72 + 0.28 * inkEase(0.02, 0.2, q)); };
  // paper left between the lobes, where the veins run
  const veins = [2.72, 2.2, 1.72, 1.2, 0.62].map((a) => [a + d.near(0, 0.1), d.range(1.2, 3), d.range(0.12, 0.3)] as const), tl = (tilt * Math.PI) / 180;
  const vein = (X: number, Y: number) => { const q = Math.hypot(X - top[0], Y - top[1]), a = Math.atan2(Y - top[1], (X - top[0]) * sg) - tl * sg; let k = 1; for (const [b, g, r] of veins) k *= 1 - 0.9 * inkEase(g, g * 0.3, Math.abs(a - b) * q + (3 * (inkNoise2(n + 9, q / 9, b) - 0.5))) * inkEase(r + 0.12, r, q / w); return k; };
  const wash = { soft: 0.9, wander: 3, wave: 18, fringe: 1.4, tooth: 2.6, rimWidth: 4, halo: 0.2, haloAt: 10, haloWidth: 4, mottle: 0.2, cloud: 40 };
  return [inkClear(far), inkBloomed(plate, far, { tone: (X, Y) => inkClamp(0.4 * streak(X, Y, 0)), ...wash, rim: 0.4, seed: d.seed() }), inkClear(near), inkBloomed(plate, near, { tone: (X, Y) => inkClamp(1.22 * streak(X, Y, 1) * vein(X, Y)), ...wash, rim: 0.4, seed: d.seed() })];
}
/** A stalk in one breath, with its prickles. It is set down dark under the head and leaves the paper as it goes into the water. */
function lotusStalk(d: InkDice, plate: string, head: InkPoint, foot: InkPoint, w: number, tone: number, bow: number): InkMark[] {
  const L = Math.hypot(foot[0] - head[0], foot[1] - head[1]), nx = -(foot[1] - head[1]) / L, ny = (foot[0] - head[0]) / L, hook = d.near(0, 0.008), at = (t: number): [number, number] => { const q = L * (bow * Math.sin(Math.PI * Math.pow(t, 1.15)) + hook * Math.sin(t * 9)); return [inkLerp(head[0], foot[0], t) + nx * q, inkLerp(head[1], foot[1], t) + ny * q]; };
  const out: InkMark[] = [inkStroke(plate, [0, 0.08, 0.25, 0.42, 0.6, 0.78, 0.9, 1].map((t, i) => [...at(t), [0.72, 0.84, 0.92, 0.84, 1, 0.95, 0.9, 0.42][i]] as const), w, { tip: tone, belly: tone * 0.66, side: d.sign(), head: 0.1, rim: 0.3, dry: 0.02, dryEnd: 0.06, bristles: 6, bleed: 0.5, grain: 0.35, seed: d.seed() })];
  for (let t = d.range(0.03, 0.08); t < 0.86; t += d.range(0.01, 0.06)) { const [x, y] = at(t), s = d.sign(); out.push(inkDot(plate, x + s * w * d.range(0.42, 0.66), y + d.near(0, 2), d.range(1, 2), { tone: tone * d.range(0.85, 1.1), seed: d.seed() })); }
  return out;
}
/** One petal: from where it grows to its point, how wide it is on each hand, and what it does. */
interface LotusPetal { from: readonly [number, number]; to: readonly [number, number]; left: number; right: number; /** Bend of its spine. */ bow?: number; wash?: number; /** 1 or −1: the edge that is rolled over. */ roll?: number; line?: number; inside?: boolean }
/** Washed from its point, veined from its point, then closed by two lines that do not quite meet. */
function lotusPetal(d: InkDice, C: string, x: number, y: number, s: number, lean: number, p: LotusPetal): InkMark[] {
  const ca = Math.cos((lean * Math.PI) / 180), sa = Math.sin((lean * Math.PI) / 180), pt = ([u, v]: readonly [number, number], j: number): [number, number] => { const U = u + d.near(0, j), V = v + d.near(0, j); return [x + (U * ca - V * sa) * s, y + (U * sa + V * ca) * s]; };
  const A = pt(p.from, 0.012), B = pt(p.to, 0.045), L = Math.hypot(B[0] - A[0], B[1] - A[1]), tx = (B[0] - A[0]) / L, ty = (B[1] - A[1]) / L, bow = ((p.bow ?? 0) + d.near(0, 0.03)) * L, wl = p.left * s * d.range(0.93, 1.07), wr = p.right * s * d.range(0.93, 1.07);
  const at = (u: number, v: number): [number, number] => { const q = bow * Math.sin(Math.PI * v) * (1 - 0.3 * v); return [A[0] + tx * L * v - ty * q + -ty * u, A[1] + ty * L * v + tx * q + tx * u]; };
  const full = (v: number) => Math.pow(Math.sin(Math.PI * Math.pow(inkClamp(v, 0, 1), 0.86)), 0.72) * (1 - 0.42 * inkEase(0.78, 1, v)), V = [0, 0.12, 0.28, 0.46, 0.62, 0.76, 0.87, 0.95, 1.03];
  const L1 = V.map((v) => at(-(0.06 * wl + wl * full(v) * (v > 0.99 ? 0 : 1) + (v > 0.99 ? -0.06 * wl : 0)), v)), R1 = V.map((v) => at(0.06 * wr + wr * full(v) * (v > 0.99 ? 0 : 1) - (v > 0.99 ? 0.06 * wr : 0), v)), shape = [...L1, ...[...R1].reverse().slice(1)], wash = (p.wash ?? 0.8) * d.range(0.88, 1.08);
  const along = (X: number, Y: number) => ((X - A[0]) * tx + (Y - A[1]) * ty) / L, across = (X: number, Y: number) => (-(X - A[0]) * ty + (Y - A[1]) * tx) / Math.max(wl, wr), n = d.seed();
  const out: InkMark[] = [inkClear(shape)];
  out.push(inkBloomed(C, shape, { tone: (X, Y) => { const v = along(X, Y), u = across(X, Y); return inkClamp(wash * ((p.inside ? 0.1 : 0.015) + 0.86 * Math.pow(inkEase(0.4, 1.06, v + 0.1 * Math.abs(u) + 0.16 * (inkNoise2(n, u * 7 + 9, v * 1.4) - 0.5)), 1.5)) * (p.inside ? 1.05 : 1)); }, soft: 1.4, wander: 1.2, wave: 18, fringe: 0.6, rim: 0.1, rimWidth: 3, mottle: 0.28, cloud: 30, seed: d.seed() }));
  for (let k = -3; k <= 3; k++) if (d.chance(0.85)) { const u = (k + d.near(0, 0.25)) / 3.6, w = u < 0 ? wl : wr, low = d.range(0.3, 0.62); out.push(inkLine(C, [0.95, 0.82, 0.66, low].map((v, i) => [...at(u * w * full(v) * 0.94, v), [0.8, 0.8, 0.55, 0.05][i]] as const), 1.5, { ink: 0.2 + 0.5 * wash, inkEnd: 0.12, seed: d.seed() })); }
  const ink = p.line ?? 0.78, close = (side: readonly (readonly [number, number])[]) => { const list = [...side].reverse(), cut = d.chance(0.45) ? 1 : 0; out.push(inkLine(K, list.slice(0, list.length - cut).map(([X, Y], i) => [X, Y, [1.15, 0.7, 0.85, 0.95, 0.75, 0.6, 0.65, 0.5, 0.16][i]] as const), s * 0.0148, { ink, inkEnd: ink * 0.42, tremor: 0.9, seed: d.seed() })); };
  close(L1); close(R1);
  if (p.roll) {
    // the edge turned over: a crescent of the other face along one hand
    const w = p.roll < 0 ? wl : wr, sgn = p.roll < 0 ? -1 : 1, vs = [0.2, 0.34, 0.5, 0.66, 0.8, 0.92, 1.02], o = vs.map((v) => at(sgn * w * (full(v) * 1.02 + (v > 1 ? -full(1) : 0.03)), v)), q = vs.map((v, i) => at(sgn * w * full(Math.min(v, 0.98)) * [0.98, 0.72, 0.56, 0.5, 0.52, 0.5, 0][i], v)), cres = [...o, ...[...q].reverse()];
    out.push(inkClear(cres), inkBloomed(C, cres, { tone: (X, Y) => inkClamp(wash * (0.1 + 0.8 * Math.pow(inkEase(0.3, 1, along(X, Y)), 1.3))), soft: 1.1, wander: 0.8, fringe: 0.5, rim: 0.2, rimWidth: 3, mottle: 0.2, cloud: 24, seed: d.seed() }));
    for (const line of [o, q]) out.push(inkLine(K, [...line].reverse().map(([X, Y], i) => [X, Y, [0.9, 0.8, 0.9, 0.8, 0.7, 0.5, 0.12][i]] as const), s * 0.015, { ink, inkEnd: ink * 0.5, tremor: 0.8, seed: d.seed() }));
  }
  return out;
}
/** An open flower from the side and a little above: the inner petals stand, one side has been let go, the cup in front hides its foot. */
function lotusFlower(d: InkDice, C: string, x: number, y: number, s: number, lean: number, sg: number): InkMark[] {
  const out: InkMark[] = [], p = (o: LotusPetal) => { const m = (q: readonly [number, number]): [number, number] => [q[0] * sg, q[1]], f = sg > 0 ? o : { ...o, from: m(o.from), to: m(o.to), left: o.right, right: o.left, bow: -(o.bow ?? 0), roll: o.roll ? -o.roll : 0 }; out.push(...lotusPetal(d, C, x, y, s, lean, f)); };
  p({ from: [-0.16, -0.1], to: [-0.5, -0.98], left: 0.2, right: 0.26, bow: -0.06, inside: true, line: 0.6 });
  p({ from: [0.18, -0.12], to: [0.5, -1.02], left: 0.25, right: 0.2, bow: 0.06, inside: true, line: 0.6, roll: 1 });
  p({ from: [0.02, -0.1], to: [-0.04, -1.16], left: 0.28, right: 0.24, bow: 0.04, inside: true, line: 0.66 });
  p({ from: [-0.2, -0.06], to: [-0.98, -0.66], left: 0.16, right: 0.26, bow: -0.1, inside: true, roll: -1 });
  p({ from: [0.24, -0.06], to: [0.92, -0.62], left: 0.24, right: 0.18, bow: 0.07, inside: true });
  const hx = x + sg * s * 0.03, hy = y - s * 0.34;
  for (let k = 0; k < 34; k++) { const a = d.range(0, Math.PI * 2), far = d.range(0.2, 0.34), ex = hx + Math.cos(a) * s * far, ey = hy + s * 0.02 + Math.sin(a) * s * far * 0.62 - s * 0.03; out.push(inkLine(K, [[hx + Math.cos(a) * s * 0.11, hy + Math.sin(a) * s * 0.06, 0.6], [(hx + ex) / 2 + Math.cos(a) * s * 0.05, (hy + ey) / 2 - s * 0.03, 0.7], [ex, ey, 0.4]], s * 0.01, { ink: 0.5, seed: d.seed() }), inkDot(K, ex, ey, s * 0.012, { tone: d.range(0.6, 1), angle: (a * 180) / Math.PI, long: 2, seed: d.seed() })); }
  const seat = inkRound(hx, hy, s * 0.15, s * 0.085, { seed: 5, rough: 0.05 });
  out.push(inkClear(seat), inkBloomed(K, seat, { tone: 0.24, soft: 1, wander: 1, fringe: 0.4, rim: 0.6, rimWidth: 3, seed: d.seed() }));
  for (let k = 0; k < 8; k++) out.push(inkDot(K, hx + Math.cos(k * 0.9) * s * (k ? 0.092 : 0), hy + Math.sin(k * 0.9) * s * (k ? 0.05 : 0), s * 0.013, { tone: 0.95, seed: d.seed() }));
  p({ from: [-0.22, 0.02], to: [-1.2, -0.16], left: 0.2, right: 0.17, bow: 0.08, wash: 0.75 });
  p({ from: [0.24, 0.04], to: [1.16, -0.08], left: 0.16, right: 0.22, bow: -0.12, wash: 0.75, roll: -1 });
  p({ from: [0.16, 0.16], to: [0.78, 0.5], left: 0.14, right: 0.2, bow: -0.2, wash: 0.62 });
  p({ from: [-0.1, 0.2], to: [-0.62, 0.46], left: 0.22, right: 0.13, bow: 0.16, wash: 0.6 });
  p({ from: [-0.16, 0.18], to: [-0.6, -0.36], left: 0.27, right: 0.26, bow: -0.12 });
  p({ from: [0.2, 0.2], to: [0.56, -0.3], left: 0.26, right: 0.24, bow: 0.14, roll: 1 });
  p({ from: [0.02, 0.3], to: [-0.06, -0.2], left: 0.3, right: 0.33, bow: -0.04, wash: 0.85 });
  return out;
}
function lotusBud(d: InkDice, C: string, x: number, y: number, s: number, lean: number): InkMark[] {
  return ([{ from: [-0.04, 0], to: [-0.17, -0.8], left: 0.2, right: 0.18, bow: -0.14, line: 0.62 }, { from: [0.05, 0], to: [0.13, -0.86], left: 0.2, right: 0.17, bow: 0.16, line: 0.66 }, { from: [0, 0.03], to: [0.02, -1.02], left: 0.24, right: 0.2, bow: 0.03, roll: 1 }] as const).flatMap((p) => lotusPetal(d, C, x, y, s, lean, { ...p, wash: 0.95 }));
}
function lotusPod(d: InkDice, x: number, y: number, s: number, lean: number): InkMark[] {
  const at = (u: number, v: number): [number, number] => { const p = inkStep(x, y, -90 + lean, v * s); return inkStep(p[0], p[1], lean, u * s); }, out: InkMark[] = [];
  const body = [at(-0.05, 0), at(-0.13, 0.2), at(-0.32, 0.5), at(-0.43, 0.66), at(-0.2, 0.74), at(0.2, 0.72), at(0.43, 0.62), at(0.3, 0.44), at(0.15, 0.18), at(0.05, 0)], top = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return at(Math.cos(a) * 0.43, 0.66 + Math.sin(a) * 0.15 + 0.016 * Math.cos(a * 5 + 1)); }), n = d.seed();
  out.push(inkClear(body), inkBloomed(K, body, { tone: (X, Y) => inkClamp(0.44 + 0.4 * inkClamp((X - x) / (s * 0.4), -1, 1) * 0.6 + 0.5 * (inkNoise2(n, (X - x) / 5, Y / 40) - 0.5)), soft: 0.9, wander: 2, wave: 14, fringe: 1.2, rim: 0.5, rimWidth: 4, mottle: 0.4, cloud: 24, seed: d.seed() }), inkClear(top), inkBloomed(K, top, { tone: 0.13, soft: 0.9, wander: 1, fringe: 0.4, rim: 0.4, rimWidth: 3, seed: d.seed() }));
  for (const [u, v] of [[0, 0.67], [-0.2, 0.7], [0.2, 0.65], [-0.1, 0.6], [0.1, 0.74], [-0.29, 0.63], [0.3, 0.69], [0.12, 0.58], [-0.08, 0.755]] as const) { const [X, Y] = at(u + d.near(0, 0.025), v + d.near(0, 0.01)); out.push(inkDot(K, X, Y, s * 0.036, { tone: 0.95, angle: lean, long: 1.35, seed: d.seed() })); }
  for (const [a, b] of [[0, 8], [7, 12]] as const) out.push(inkLine(K, [...top, top[0]].slice(a, b + 1).map(([X, Y], i) => [X, Y, 0.35 + 0.7 * Math.abs(Math.sin(i * 0.8 + a))] as const), s * 0.032, { ink: 0.88, seed: d.seed() }));
  return out;
}
/** 荷 */
export function inkLotus(o: InkLotusOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 900), page = { width: 1200, height: 1500 }, flip = o.side === "right", count = Math.round(inkClamp(o.leaves ?? 4, 1, 4)), blooms = Math.round(inkClamp(o.flowers ?? 1, 0, 2)), leafPlate = (o.leaf ?? "ink") === "ink" ? K : "leaf", C = "petal", mx = (x: number) => (flip ? page.width - x : x), sg = flip ? -1 : 1, water = 1430;
  const stalks: InkPart[] = [], heads: InkPart[] = [], groups: Record<string, readonly InkMotion[]> = {}, j = (v: number, k: number) => v + d.near(0, k);
  // stalks first, so that a leaf hides those that pass behind it; each head goes with its own stalk
  const stem = (id: string, k: number, head: InkPoint, foot: InkPoint, w: number, tone: number, bow: number, top: InkMark[], late = false) => {
    groups[id] = [{ kind: "sway", from: foot, to: head, amount: 9, seconds: 5.6 + k * 0.5, phase: k * 1.5, power: 1.8 }];
    (late ? heads : stalks).push(inkMarksPart(`${id}-stalk`, lotusStalk(d.fork(60 + k), K, head, foot, w, tone, bow), page, { group: id }));
    heads.push(inkMarksPart(id, top, page, { group: id, motion: [{ kind: "turn", at: head, degrees: 1.4, seconds: 3.6 + k * 0.4, phase: k * 2.1 }] }));
  };
  const H = LOTUS_HABITS[o.habit ?? (["under", "tall", "across"] as const)[Math.abs(Math.round(seed) - 1) % 3]], P = (q: readonly number[], k: number): [number, number] => [mx(j(q[0], k)), j(q[1], k)], foot = (q: readonly number[], dy: number): [number, number] => [mx(j(q[3], 14)), water + dy], bow = (q: readonly number[]) => (mx(q[0]) < mx(q[3]) ? -1 : 1);
  const leaf = (q: readonly number[], tone: number, lip?: number): LotusLeaf => { const [x, y] = P(q, 22); return { x, y, r: j(q[2], 14), flat: j(q[4], 0.05), angle: sg * j(q[5], 6), tone, ...(lip === undefined ? {} : { lip }) }; };
  if (o.bud ?? true) { const [x, y] = P(H.bud, 18); stem("bud", 5, [x, y], foot(H.bud, -4), 8, 0.8, bow(H.bud) * 0.04, lotusBud(d.fork(6), C, x, y, H.bud[2], bow(H.bud) * j(7, 5))); }
  if (count >= 2) { const [x, y] = P(H.edge, 18), k = bow(H.edge); stem("edge-leaf", 2, [x - k * 6, y + 18], foot(H.edge, 6), 11, 0.92, k * 0.06, lotusEdge(d.fork(3), leafPlate, x, y, j(H.edge[2], 20), k as 1 | -1, k * j(-8, 4))); }
  if (o.pod ?? true) { const [x, y] = P(H.pod, 18), k = bow(H.pod); stem("pod", 4, [x, y], foot(H.pod, -30), 7, 0.74, k * -0.1, lotusPod(d.fork(5), x, y, H.pod[2], k * j(20, 5))); }
  { const g = leaf(H.great, 0.8, bow(H.great) > 0 ? j(140, 14) : j(40, 14)), k = -bow(H.great); stem("great-leaf", 1, [g.x + k * 8, g.y - g.r * g.flat * 0.1], foot(H.great, 0), 12, 0.88, k * -0.05, lotusLeaf(d.fork(2), leafPlate, g)); }
  if (count >= 3) { const l = leaf(H.mist, 0.34); stem("mist-leaf", 0, [l.x, l.y], foot(H.mist, -30), 8, 0.4, bow(H.mist) * -0.04, lotusLeaf(d.fork(1), leafPlate, l)); }
  if (count >= 4) { const [x, y] = P(H.young, 18), k = H.young[2], t = -bow(H.young), g = d.fork(4), load = (pts: readonly (readonly [number, number, number])[], w: number, tip: number, belly: number, side: 1 | -1) => inkStroke(leafPlate, pts.map(([u, v, q]) => [x + t * k * u, y + k * v, q] as const), w * k, { tip, belly, side, head: 0.3, dry: 0.12, dryEnd: 0.6, bristles: 9, rim: 0.4, bleed: 0.6, seed: g.seed() }); stem("young-leaf", 3, [x, y + 10], foot(H.young, -14), 7, 0.74, t * 0.13, [load([[-86, -34, 0.12], [-40, -22, 0.8], [16, -20, 0.9], [82, -44, 0.1]], 24, 0.36, 0.14, 1), load([[-98, -30, 0.1], [-58, 0, 0.8], [0, 6, 1], [52, -8, 0.8], [104, -50, 0.08]], 34, 0.95, 0.5, -t as 1 | -1)]); }
  if (blooms >= 2) { const [x, y] = P(H.second, 16), k = bow(H.second); stem("flower-2", 7, [x, y + 20], foot(H.second, -12), 8, 0.8, k * 0.08, lotusFlower(d.fork(8), C, x, y, j(H.second[2], 6), k * j(9, 4), k as 1 | -1)); }
  if (blooms >= 1) { const [x, y] = P(H.flower, 18), k = bow(H.flower); stem("flower", 6, [x, y + 30], foot(H.flower, 4), 10, 0.86, k * 0.04, lotusFlower(d.fork(7), C, x, y, j(H.flower[2], 10), k * j(5, 4), k as 1 | -1), true); }
  // the pond, barely said: a wet band, cress, two or three reeds
  const e = d.fork(9), floor: InkMark[] = [];
  for (let k = 0; k < 5; k++) { const x = mx(e.range(400, 820)), y = water + e.range(-10, 20), w = e.range(60, 150); floor.push(inkStroke(leafPlate, [[x - w, y, 0.1], [x, y + 3, 1], [x + w, y - 2, 0.1]], e.range(6, 13), { tip: 0.26, belly: 0.08, dry: 0.3, dryEnd: 0.9, seed: e.seed() })); }
  for (let k = 0; k < 18; k++) floor.push(inkDot(K, mx(e.pick([430, 470, 690, 740, 860]) + e.near(0, 50)), water + e.near(12, 22), e.range(2.4, 5.6), { tone: e.range(0.35, 0.95), angle: e.near(0, 20), long: 1.7, seed: e.seed() }));
  for (let k = 0; k < 5; k++) { const x = mx(e.pick([372, 396, 830, 850, 866]) + e.near(0, 10)), L = e.range(130, 330), a = -90 + sg * e.range(-4, 16), m = inkStep(x, water + 6, a, L * 0.55), q = inkStep(m[0], m[1], a + sg * e.range(6, 44), L * 0.45); floor.push(inkLine(K, [[x, water + 6, 0.8], [m[0], m[1], 1], [q[0], q[1], 0.08]], e.range(3.4, 6), { ink: e.range(0.35, 0.75), seed: e.seed() })); }
  return { id: `lotus-${seed}`, label: "Lotus: splashed leaves, a flower, a bud and a seed head on long stalks", page, plates: inkPlates({ [C]: o.pigment ?? "rouge", ...(leafPlate === K ? {} : { leaf: o.leaf as "indigo" | "malachite" }), [K]: "ink" }), seed: 11 + seed, parts: [inkMarksPart("pond", floor, page), ...stalks, ...heads], groups };
}

// ---- orchid --------------------------------------------------------------------------------------------------------------------
export interface InkOrchidOptions {
  seed?: number;
  /** Leaves in the near clump, 5–16, and flowers, 0–6. */
  leaves?: number; flowers?: number;
  /** −1 to 1: which way the wind leans it. Left out, the seed decides. */
  wind?: number;
  /** A second clump, paler, behind. */
  guest?: boolean;
  pigment?: "ink" | "indigo";
}
/** A long leaf: nail head, mantis belly, rat's tail; thin where it turns over. */
function orchidLeaf(d: InkDice, plate: string, x: number, y: number, angle: number, length: number, bend: number, droop: number, width: number, tone: number): InkMark & { tip: [number, number] } {
  const turn = d.range(0.46, 0.62), n = 13, pts: [number, number, number][] = [], second = d.chance(0.55), wobble = d.near(0, 5);
  for (let i = 0, X = x, Y = y; i <= n; i++) {
    const t = i / n, belly = 0.36 + 0.64 * Math.exp(-Math.pow((t - turn * 0.52) / 0.17, 2)), back = second ? 0.8 * Math.exp(-Math.pow((t - turn - 0.24) / 0.13, 2)) : 0.36 * (1 - t), waist = 1 - (second ? 0.66 : 0.2) * Math.exp(-Math.pow((t - turn) / 0.07, 2));
    pts.push([X, Y, Math.max(0.03, (i === 0 ? 0.34 : Math.min(1, Math.max(belly, back)) * waist) * (1 - Math.pow(inkClamp((t - 0.72) / 0.28), 1.3)))]);
    [X, Y] = inkStep(X, Y, angle + bend * t + droop * Math.pow(t, 2.4) + wobble * Math.sin(t * 7), length / n);
  }
  const m = inkStroke(plate, pts, width, { tip: tone, belly: tone * 0.8, side: d.sign(), head: 0.5, rim: 0.15, dry: 0.02, dryEnd: 0.12, bristles: 6, bleed: 0.5, grain: 0.18, seed: d.seed() });
  return { ...m, tip: [pts[n][0], pts[n][1]] };
}
/** A flower: five pale petals from the tip in, two of them shut over a heart of dark dots. */
/** Seen from the front, from the side (the far petal short, the cap shut), or opening away. */
function orchidFlower(d: InkDice, plate: string, x: number, y: number, s: number, face: number): InkMark[] {
  const h = d.sign(), view = d.pick(["front", "front", "side", "half"] as const), n = view === "side" ? 0.42 : view === "half" ? 0.72 : 1, wide = view === "side" ? 0.5 : 1, out: InkMark[] = [], petal = (a: number, l: number, w: number, bend: number, tone: number) => { const L = s * l * d.range(0.88, 1.12), tip = inkStep(x, y, face + h * (a + bend), L), mid = inkStep(x, y, face + h * a, L * 0.56); out.push(inkStroke(plate, [[...tip, 0.14], [...inkStep(...mid, face + h * (a + bend * 1.4), L * 0.16), 0.86], [...mid, 1], [...inkStep(x, y, face + h * a, L * 0.24), 0.6], [...inkStep(x, y, face + h * a, L * 0.06), 0.16]], s * w, { tip: tone, belly: tone * 0.32, side: d.sign(), head: 0.5, rim: 0.4, dry: 0.02, dryEnd: 0.3, bristles: 7, bleed: 0.9, grain: 0.35, seed: d.seed() })); };
  petal(-2 + d.near(0, 16), 0.96, 0.23, d.near(0, 24), 0.52); petal(-74 * (view === "side" ? 1.2 : 1) + d.near(0, 18), 1.04, 0.24, -26 + d.near(0, 14), 0.46); petal(80 * (view === "side" ? 0.55 : 1) + d.near(0, 18), 1.06 * n, 0.24 * Math.max(0.6, n), 28 + d.near(0, 16), 0.46);
  petal(-38 * wide + d.near(0, 8), 0.6, 0.22, 34 * wide, 0.34); petal(36 * wide + d.near(0, 8), 0.6 * (0.6 + 0.4 * n), 0.22, -34 * wide, 0.34);
  // the lip, let down
  const lip = inkStep(x, y, face + 176 + d.near(0, 16), s * 0.34); out.push(inkStroke(plate, [[x, y, 0.3], [...inkStep(x, y, face + 176, s * 0.18), 1], [...lip, 0.3]], s * 0.17, { tip: 0.3, belly: 0.12, side: 1, dry: 0, dryEnd: 0.2, bleed: 0.8, seed: d.seed() }));
  for (const [a, l, r] of [[-40, 0.15, 0.042], [34, 0.16, 0.048], [180, 0.12, 0.036], [-4, 0.05, 0.032]] as const) { const [X, Y] = inkStep(x, y, face + a + d.near(0, 10), s * l); out.push(inkDot(K, X, Y, s * r, { tone: 0.98, angle: face + a, long: 1.9, seed: d.seed() })); }
  return out;
}
/** 蘭 */
export function inkOrchid(o: InkOrchidOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 1500), page = { width: 1300, height: 900 }, leaf = o.pigment ?? "ink", wind = inkClamp(o.wind ?? 0.25 * d.sign(), -1, 1), n = Math.round(inkClamp(o.leaves ?? 12, 5, 16)), flowers = Math.round(inkClamp(o.flowers ?? 4, 0, 6)), sg = wind < 0 ? -1 : 1, rx = 600 - sg * 60, ry = 770, push = Math.abs(wind) * 26;
  const parts: InkPart[] = [], groups: Record<string, readonly InkMotion[]> = {}, sets: Record<string, InkMark[]> = { left: [], middle: [], right: [] };
  if (o.guest ?? true) {
    const g = d.fork(1), x = rx - sg * 330, y = ry - 46, marks: InkMark[] = [], flower: InkMark[] = [];
    for (const [a, l, b, w] of [[-52, 330, 34, 11], [-70, 260, 20, 9], [-118, 300, -40, 10], [-100, 220, -12, 8], [-34, 190, 26, 8]] as const) marks.push(orchidLeaf(g, leaf, x + g.near(0, 12), y + g.near(0, 4), a + g.near(0, 7) + sg * push * 0.5, l * g.range(0.9, 1.1), b, b > 0 ? 34 : -34, w, g.range(0.36, 0.5)));
    const f = inkStep(x, y, -92 + sg * push * 0.6, 250); flower.push(inkLine(leaf, [[x, y, 1], [(x + f[0]) / 2 - 8, (y + f[1]) / 2, 0.8], [...f, 0.9]], 4, { ink: 0.4, seed: g.seed() }), ...orchidFlower(g, leaf, f[0], f[1], 62, -70));
    groups.guest = [{ kind: "sway", from: [x, y], to: [x + sg * 120, y - 260], amount: 8, seconds: 6.4, lean: wind * 0.6, phase: 2 }];
    parts.push(inkMarksPart("guest", [...marks, ...flower], page, { group: "guest", depth: -0.04 }));
  }
  // host, the one that crosses it and shuts the phoenix's eye, the one that breaks the eye; then the rest, in threes and at odd lengths
  const plan: (readonly [number, number, number, number, number, number])[] = [[-34, -57 + d.near(0, 9), 740 * d.range(0.82, 1.04), 26 * d.range(0.5, 1.4), 58 * d.range(0.5, 1.3), 21], [52, -114 + d.near(0, 12), 620 * d.range(0.7, 1.12), -26 * d.range(0.4, 1.5), -62 * d.range(0.5, 1.4), 19], [12, -84 + d.near(0, 12), 520 * d.range(0.8, 1.1), 16 * d.range(-1, 1.6), 10, 16]].map(([x, a, l, b, r, w]) => [sg * x, -90 + sg * (a + 90), l, sg * b, sg * r, w] as const), open = 3;
  for (let i = open; i < n; i++) { const k = [1, -1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, 1][i - open], low = i > 6, a = -90 + k * (low ? d.range(48, 70) : d.range(12, 46)), l = low ? d.range(130, 270) : d.range(260, 480); plan.push([-k * d.range(0, 44) + d.near(0, 40), a, l, k * d.range(6, 30), k * (d.chance(0.25) ? d.range(70, 120) : d.range(10, 46)), low ? d.range(9, 14) : d.range(13, 19)]); }
  const order = plan.map((q, i) => ({ q, i })).reverse();
  for (const { q: [dx, a, l, b, r, w], i } of order) {
    const A = a + sg * push * (0.5 + 0.5 * (l / 700)), m = orchidLeaf(d, leaf, rx + dx * d.range(0.8, 1.2), ry + d.near(0, 18) - Math.abs(dx) * 0.12, A, l * d.range(0.94, 1.06), b, r + sg * push * 0.6, w, i < 3 ? d.range(0.9, 1) : i % 3 === 0 ? d.range(0.86, 0.98) : d.range(0.4, 0.66));
    sets[i === 0 ? (sg > 0 ? "right" : "left") : i === 1 ? (sg > 0 ? "left" : "right") : i === 2 ? "middle" : A > -72 ? "right" : A < -108 ? "left" : "middle"].push(m);
  }
  const bloom: InkMark[] = [], at: [number, number][] = [];
  for (let i = 0; i < flowers; i++) {
    const [a, l] = ([[-74, 430], [-98, 330], [-52, 330], [-120, 250], [-84, 210], [-38, 220]] as const)[i], A = -90 + sg * (a + 90) + d.near(0, 12) + sg * push * 0.6, L = l * d.range(0.78, 1.16), x = rx + d.near(0, 20), m = inkStep(x, ry, A - sg * 6, L * 0.5), e = inkStep(m[0], m[1], A + sg * 10, L * 0.5);
    bloom.push(inkLine(leaf, [[x, ry, 0.9], [...inkStep(x, ry, A - sg * 8, L * 0.25), 1], [...m, 0.7], [...inkStep(m[0], m[1], A + sg * 6, L * 0.28), 0.85], [...e, 1]], 4.6, { ink: 0.62, seed: d.seed() }));
    for (const t of [0.3, 0.56]) { const c = inkStep(x, ry, A - sg * 4, L * t); bloom.push(inkBlade(leaf, { x: c[0], y: c[1], angle: A + d.sign() * d.range(8, 18), length: d.range(40, 64), width: 9, tone: 0.46, seed: d.seed() })); }
    if (i === 3 || i === 5) { for (const t of [-14, 6]) bloom.push(inkBlade(leaf, { x: e[0], y: e[1], angle: A + t, length: 48, width: 13, tone: 0.4, full: 0.55, seed: d.seed() })); } else bloom.push(...orchidFlower(d, leaf, e[0], e[1], d.range(82, 98), A + sg * d.range(6, 34)));
    at.push(e);
  }
  const root: [number, number] = [rx, ry];
  groups.left = [{ kind: "sway", from: root, to: [rx - 380, ry - 330], amount: 10, seconds: 5.8, lean: -wind * 0.5, phase: 0.4 }];
  groups.middle = [{ kind: "sway", from: root, to: [rx, ry - 430], amount: 8, seconds: 5.1, lean: wind * 0.5, phase: 1.6 }];
  groups.right = [{ kind: "sway", from: root, to: [rx + 460, ry - 330], amount: 11, seconds: 6.3, lean: wind * 0.5, phase: 2.7 }];
  groups.flowers = [{ kind: "sway", from: root, to: [rx + sg * 60, ry - 420], amount: 9, seconds: 4.7, lean: wind * 0.6, phase: 0.9 }];
  parts.push(inkMarksPart("flowers", bloom, page, { group: "flowers" }));
  for (const id of ["left", "middle", "right"]) if (sets[id].length) parts.push(inkMarksPart(`leaves-${id}`, sets[id], page, { group: id }));
  const g = d.fork(8), floor: InkMark[] = [];
  for (let k = 0; k < 9; k++) floor.push(inkBlade(leaf, { x: rx + g.near(0, 60), y: ry + g.near(4, 10), angle: -90 + g.near(0, 60), length: g.range(26, 64), width: g.range(6, 10), tone: g.range(0.5, 0.95), neck: 0.5, seed: g.seed() }));
  for (let k = 0; k < 11; k++) floor.push(inkDot(K, rx + g.near(0, 150), ry + g.range(6, 26), g.range(1.6, 3.6), { tone: g.range(0.3, 0.9), angle: g.near(0, 40), long: 1.5, seed: g.seed() }));
  parts.push(inkMarksPart("ground", floor, page));
  return { id: `orchid-${seed}`, label: "Orchids: long crossing leaves and pale flowers", page, plates: inkPlates(leaf === "ink" ? [K] : [leaf, K]), seed: 11 + seed, parts, groups };
}

// ---- willow --------------------------------------------------------------------------------------------------------------------
export interface InkWillowOptions {
  seed?: number;
  /** Hanging strands, 6–26. */
  strands?: number;
  /** −1 to 1: how far the wind carries them, and which way. */
  wind?: number;
  /** The side the bough comes in from. */
  from?: "left" | "right";
  /** Colour of the leaves, and how many there are, 0–1. */
  pigment?: "ink" | "malachite" | "moss" | "indigo"; leaves?: number;
}
/** 柳 */
export function inkWillow(o: InkWillowOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 1700), page = { width: 1200, height: 1400 }, flip = o.from === "right", mx = (x: number) => (flip ? page.width - x : x), sg = flip ? -1 : 1, leaf = o.pigment ?? "ink", wind = inkClamp(o.wind ?? 0.3, -1, 1), n = Math.round(inkClamp(o.strands ?? 19, 6, 26)), full = inkClamp(o.leaves ?? 0.7);
  const G = grower(d.fork(50), 34), jig = (l: readonly (readonly [number, number, number])[], k: number): Limb => l.map(([x, y, w]) => { const [X, Y] = G.swell(x, y); return [mx(X) + d.near(0, k), Y + d.near(0, k * 0.7), w] as const; }), lit = 1 as const;
  const bough = jig([[-40, 320, 84], [90, 214, 78], [150, 180, 62], [300, 162, 46], [394, 108, 34], [560, 120, 22], [680, 92, 12]], 8), limbs = [jig([[126, 190, 40], [236, 70, 26], [380, 22, 13]], 6), jig([[560, 120, 18], [700, 150, 13], [800, 138, 9], [880, 160, 6]], 6), jig([[320, 156, 22], [430, 210, 14], [560, 206, 8]], 6)].map((l) => G.turn(l, 9, 0.2));
  const bones = [...limbs.flatMap((l) => limbMarks(d, K, l, { side: lit, dry: 0.3 })), ...limbMarks(d, K, bough, { side: lit, dry: 0.36 }), ...mossMarks(d, K, bough, 8, 1)], parts: InkPart[] = [inkMarksPart("bough", bones, page)], groups: Record<string, readonly InkMotion[]> = {};
  // strands leave the twigs in threes and fives, long beside short; each falls, and the wind carries its end
  const roots: [number, number][] = [...limbs[0].slice(1), ...bough.slice(3), ...limbs[1], ...limbs[2].slice(1)].map(([x, y]) => [x, y]), sets = Array.from({ length: 5 }, () => [] as { x: number; pts: [number, number, number][]; tone: number; marks: InkMark[] }[]);
  for (let i = 0; i < n; i++) {
    const r = roots[(i * 5 + d.int(0, 2)) % roots.length], q = roots[(i * 5 + 1) % roots.length], k = d.range(0, 0.6), x = inkLerp(r[0], Math.abs(q[0] - r[0]) < 160 ? q[0] : r[0], k), y = inkLerp(r[1], Math.abs(q[0] - r[0]) < 160 ? q[1] : r[1], k), far = d.chance(0.34), L = d.pick([300, 440, 560, 700, 860, 980]) * d.range(0.88, 1.1), tone = far ? d.range(0.26, 0.4) : d.range(0.62, 0.95), m = 12, pts: [number, number, number][] = [], lean = wind * d.range(0.7, 1.3), a0 = (sg > 0 ? 24 : 156) + d.near(0, 26);
    for (let j = 0, X = x, Y = y; j <= m; j++) { const t = j / m; pts.push([X, Y, 1 - 0.72 * t]); const fall = inkEase(0, 0.2, t), a = inkLerp(a0, 90 - lean * (6 + 50 * t) + 6 * Math.sin(t * 5 + i), fall); [X, Y] = inkStep(X, Y, a, L / m); if (Y > page.height - 40) break; }
    const marks: InkMark[] = [inkLine(K, pts, far ? 2 : 2.8, { ink: tone, inkEnd: tone * 0.7, tremor: 0.6, seed: d.seed() })];
    // leaves in twos, close at the end and sparse above; a bare stretch now and then
    const at = (t: number): [number, number, number] => { const v = inkClamp(t) * (pts.length - 1), b = Math.min(pts.length - 2, Math.floor(v)), f = v - b; return [inkLerp(pts[b][0], pts[b + 1][0], f), inkLerp(pts[b][1], pts[b + 1][1], f), (Math.atan2(pts[b + 1][1] - pts[b][1], pts[b + 1][0] - pts[b][0]) * 180) / Math.PI]; };
    for (let t = d.range(0.1, 0.22); t < 1; t += (d.range(15, 34) / L) * (1.5 - 0.6 * t)) { if (d.chance(1 - full * (0.75 + 0.25 * t)) || inkNoise2(seed * 13 + i, t * 5, 2) < 0.22) continue; const [X, Y, a] = at(t); for (const s of d.chance(0.45) ? [1, -1] : [d.sign()]) { const l = d.range(22, 54) * (0.75 + 0.4 * Math.sin(Math.PI * Math.min(1, t + 0.1))), A = a + s * d.range(8, 42) - lean * 12, w = d.range(4.4, 7.6), mid = inkStep(X, Y, A, l * 0.45), e = inkStep(mid[0], mid[1], A - s * d.range(4, 22), l * 0.55); marks.push(inkLine(leaf, [[X, Y, 0.16], [...inkStep(X, Y, A, l * 0.2), 0.8], [...mid, 1], [...e, 0.04]], w, { ink: tone * d.range(0.8, 1.05), inkEnd: tone * 0.7, seed: d.seed() })); } }
    const end = at(1); marks.push(inkLine(leaf, [[end[0], end[1], 0.2], [...inkStep(end[0], end[1], end[2], 16), 1], [...inkStep(end[0], end[1], end[2] + 6, 36), 0.04]], 6, { ink: tone, seed: d.seed() }));
    sets[far ? 0 : 1 + (i % 4)].push({ x, pts, tone, marks });
  }
  for (const [k, set] of sets.entries()) {
    if (!set.length) continue;
    const top = Math.min(...set.map((s) => s.pts[0][1])), low = Math.max(...set.map((s) => s.pts[s.pts.length - 1][1])), x = set.reduce((a, s) => a + s.x, 0) / set.length, id = k === 0 ? "far-strands" : `strands${k}`;
    groups[id] = [{ kind: "sway", from: [x, top], to: [x, low], amount: 26 + 30 * Math.abs(wind), seconds: 5.2 + k * 0.6, lag: 0.34, lean: -wind * 0.5, gust: 0.4, phase: k * 1.4, power: 1.5 }];
    const part = inkMarksPart(id, set.flatMap((s) => s.marks), page, { group: id, ...(k === 0 ? { depth: -0.05 } : {}) });
    if (k === 0) parts.unshift(part); else parts.push(part);
  }
  return { id: `willow-${seed}`, label: "Willow strands hanging from a bough", page, plates: inkPlates(leaf === "ink" ? [K] : [leaf, K]), seed: 11 + seed, parts, groups };
}

// ---- reeds and grass -----------------------------------------------------------------------------------------------------------
export interface InkReedsOptions {
  seed?: number;
  /** Stems, 2–12, and how many of them carry a plume, 0–1. */
  stems?: number; plumes?: number;
  /** −1 to 1. */
  wind?: number;
  pigment?: "ink" | "ochre" | "indigo";
}
/** 蘆葦 */
export function inkReeds(o: InkReedsOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 1900), page = { width: 1200, height: 1300 }, ink = o.pigment ?? "ink", wind = inkClamp(o.wind ?? 0.5, -1, 1), n = Math.round(inkClamp(o.stems ?? 7, 2, 12)), sg = wind < 0 ? -1 : 1, parts: InkPart[] = [], groups: Record<string, readonly InkMotion[]> = {}, ground = 1230;
  const xs = [0, 46, -42, 204, -262, 246, -96, 330, 120, -318, -10, 276], order = Array.from({ length: n }, (_, i) => i).reverse();
  for (const i of order) {
    const g = d.fork(i), far = i > 2 && i % 2 === 1, tone = far ? g.range(0.3, 0.46) : g.range(0.8, 1), x = 600 - sg * 70 + sg * xs[i] * g.range(0.9, 1.15), y = ground + (far ? -g.range(22, 54) : g.near(6, 16)), L = (far ? g.range(520, 860) : [1030, 560, 760, 700, 430][i % 5]) * g.range(0.94, 1.06), m = 12, pts: [number, number, number][] = [], lean = wind * g.range(0.75, 1.2), id = `reed${i + 1}`, stem: InkMark[] = [], leaves: InkMark[] = [];
    for (let j = 0, X = x, Y = y; j <= m; j++) { const t = j / m; pts.push([X, Y, 1 - 0.6 * t]); [X, Y] = inkStep(X, Y, -90 + lean * (4 + 44 * Math.pow(t, 2)) + g.near(0, 1.4), L / m); }
    const at = (t: number): [number, number, number] => { const v = inkClamp(t) * m, b = Math.min(m - 1, Math.floor(v)), f = v - b; return [inkLerp(pts[b][0], pts[b + 1][0], f), inkLerp(pts[b][1], pts[b + 1][1], f), (Math.atan2(pts[b + 1][1] - pts[b][1], pts[b + 1][0] - pts[b][0]) * 180) / Math.PI]; };
    // the stalk joint by joint
    for (let t = 0, k = 0; t < 1; k++) { const e = Math.min(1, t + g.range(0.11, 0.17)), a = at(t), b = at((t + e) / 2), c = at(e - 0.004); stem.push(inkLine(ink, [[a[0], a[1], (1.15 - 0.6 * t) * 1.1], [b[0], b[1], 0.95 - 0.6 * t], [c[0], c[1], 1.1 - 0.62 * e]], far ? 6 : 8.4, { ink: tone * 0.86, inkEnd: tone, seed: g.seed() }));
      if (t > 0.1 && t < 0.86) { const s = k % 2 ? 1 : -1, back = s * sg < 0, A = a[2] + s * (back ? g.range(8, 20) : g.range(16, 40)) + lean * 8, l = g.range(230, 400) * (1.1 - 0.4 * t) * (back ? 0.8 : 1.05); leaves.push(inkBlade(ink, { x: a[0], y: a[1], angle: A, length: l, width: g.range(13, 20) * (far ? 0.75 : 1), bend: (back ? -s * g.range(26, 58) * Math.abs(wind) + s * 16 * (1 - Math.abs(wind)) : s * g.range(14, 46)) + lean * g.range(6, 24), tone: tone * g.range(0.78, 1), belly: 0.24, full: 0.3, torn: !far && g.chance(0.2) ? 0.5 : 0, neck: 0.4, seed: g.seed() })); }
      t = e; }
    if (g.next() < (o.plumes ?? 0.7) && L > 600) {
      // the plume: one side of the tip, blown off downwind, dabbed pale first
      const top = at(1), from = at(0.86), axis = (u: number): [number, number] => (u < 0.42 ? (at(0.86 + 0.14 * (u / 0.42)).slice(0, 2) as [number, number]) : [top[0] + sg * 96 * ((u - 0.42) / 0.58), top[1] - 10 * Math.sin(((u - 0.42) / 0.58) * 2) + 40 * Math.pow((u - 0.42) / 0.58, 2)]);
      for (let k = 0; k < 64; k++) { const u = Math.pow(g.next(), 0.9), [X, Y] = axis(u), A = inkLerp(top[2], sg > 0 ? 22 : -202, 0.25 + 0.6 * u) + g.near(0, 20), l = g.range(40, 104) * (0.6 + 0.8 * Math.sin(Math.PI * Math.min(1, 0.2 + u * 0.7))), mid = inkStep(X, Y, A, l * 0.5), e = inkStep(mid[0], mid[1], A + sg * g.range(6, 34), l * 0.5), k2 = tone * (k < 24 ? g.range(0.14, 0.24) : g.range(0.3, 0.62)); stem.push(inkLine(ink, [[X, Y, 0.3], [...mid, 1], [...e, 0.05]], k < 24 ? g.range(8, 13) : g.range(2.4, 4.4), { ink: k2, inkEnd: k2 * 0.4, seed: g.seed() })); if (k % 4 === 0) stem.push(inkDot(ink, ...inkStep(e[0], e[1], A, g.range(-24, 4)), g.range(1.2, 2.2), { tone: tone * g.range(0.4, 0.8), angle: A, long: 2.2, seed: g.seed() })); }
      stem.push(inkLine(ink, [[from[0], from[1], 0.9], [top[0], top[1], 0.7], [...axis(0.7), 0.5], [...axis(1), 0.08]], 4.4, { ink: tone * 0.85, seed: g.seed() }));
    }
    groups[id] = [{ kind: "sway", from: [x, y], to: [pts[m][0], pts[m][1]], amount: 16 + 16 * Math.abs(wind), seconds: 4.4 + g.range(0, 1.6), lean: wind * 0.6, gust: 0.4, phase: i * 1.7, power: 2 }];
    parts.push(inkMarksPart(`${id}-leaves`, leaves, page, { group: id, motion: [{ kind: "sway", from: [x, y], to: [pts[m][0] + sg * 200, pts[m][1]], amount: 5, seconds: 2.7, phase: i }], ...(far ? { depth: -0.06 } : {}) }), inkMarksPart(id, stem, page, { group: id, ...(far ? { depth: -0.06 } : {}) }));
  }
  const floor: InkMark[] = [], g = d.fork(90);
  for (let k = 0; k < 5; k++) { const x = 600 + g.near(0, 260), y = ground + g.range(-8, 26), w = g.range(70, 190); floor.push(inkStroke(ink, [[x - w, y, 0.1], [x, y + 4, 1], [x + w, y - 2, 0.1]], g.range(7, 16), { tip: 0.3, belly: 0.1, dry: 0.35, dryEnd: 0.95, seed: g.seed() })); }
  parts.push(inkMarksPart("water", floor, page));
  return { id: `reeds-${seed}`, label: "Reeds bending in the wind", page, plates: inkPlates(ink === "ink" ? [K] : { [ink]: ink, [K]: "ink" }), seed: 11 + seed, parts, groups };
}
export interface InkGrassOptions {
  seed?: number;
  /** Tufts, 1–7, and blades in each. */
  tufts?: number; blades?: number;
  /** −1 to 1. */
  wind?: number;
  pigment?: "ink" | "moss" | "ochre" | "indigo" | "malachite";
}
/** 草: foreground tufts along a bank, dark in front of pale. */
export function inkGrass(o: InkGrassOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 2100), page = { width: 1400, height: 560 }, ink = o.pigment ?? "ink", wind = inkClamp(o.wind ?? 0.4, -1, 1), n = Math.round(inkClamp(o.tufts ?? 4, 1, 7)), blades = Math.round(inkClamp(o.blades ?? 15, 4, 30)), parts: InkPart[] = [], groups: Record<string, readonly InkMotion[]> = {};
  const spots = [0.4, 0.72, 0.27, 0.9, 0.5, 0.1, 0.8];
  for (let i = n - 1; i >= 0; i--) {
    const g = d.fork(i), far = i > 1 && i % 2 === 1, x = page.width * (spots[i] + g.near(0, 0.03)), y = 500 + (far ? -18 : g.range(0, 14)), size = far ? 0.6 : [1.32, 0.94, 0.7][i % 3], id = `tuft${i + 1}`, marks: InkMark[] = [];
    for (let k = 0; k < blades; k++) { const s = g.sign(), L = g.pick([90, 150, 190, 260, 330]) * size * g.range(0.85, 1.15), a = -90 + s * g.range(2, 46) + wind * 26, w = g.range(6, 13) * size; marks.push(inkBlade(ink, { x: x + s * g.range(0, 46) * size, y: y + g.near(0, 6), angle: a, length: L, width: w, bend: (s * g.range(10, 60) + wind * 60) * (L / 260), tone: (far ? 0.36 : 1) * (k < blades * 0.4 ? g.range(0.36, 0.56) : g.range(0.7, 1)), full: 0.22, neck: 0.5, seed: g.seed() })); }
    // a few seed heads, bowed, each a fringe of hairs
    for (let k = 0; k < (far ? 1 : 2); k++) { const A = -90 + wind * 30 + g.near(0, 22), L = 340 * size * g.range(0.75, 1.15), m = inkStep(x, y, A - wind * 14, L * 0.6), e = inkStep(m[0], m[1], A + wind * 34, L * 0.4), h = 46 * size, t0 = far ? 0.32 : 0.8, top = inkStep(e[0], e[1], A + wind * 90, h); marks.push(inkLine(ink, [[x, y, 1], [...m, 0.7], [...e, 0.6], [...inkStep(e[0], e[1], A + wind * 60, h * 0.5), 0.5], [...top, 0.1]], 3, { ink: t0, seed: g.seed() })); for (let j = 0; j < 30; j++) { const t = g.next(), p = inkStep(e[0], e[1], A + wind * (34 + 50 * t), t * h), B = A + wind * 70 * t + g.sign() * g.range(14, 44); marks.push(inkLine(ink, [[...p, 1], [...inkStep(p[0], p[1], B, g.range(8, 17) * size), 0.1]], 1.8, { ink: t0 * g.range(0.5, 1), seed: g.seed() })); } }
    groups[id] = [{ kind: "sway", from: [x, y], to: [x + wind * 120, y - 300 * size], amount: 12 + 12 * Math.abs(wind), seconds: 3.4 + g.range(0, 1.4), lean: wind * 0.6, gust: 0.5, phase: i * 1.9 }];
    parts.push(inkMarksPart(id, marks, page, { group: id, ...(far ? { depth: -0.05 } : {}) }));
  }
  const g = d.fork(80), floor: InkMark[] = [];
  for (let k = 0; k < 5; k++) { const x = page.width * g.range(0.15, 0.85), w = g.range(90, 240), y = 508 + g.range(0, 18); floor.push(inkStroke(ink, [[x - w, y, 0.1], [x, y + 5, 1], [x + w, y, 0.1]], g.range(8, 18), { tip: 0.4, belly: 0.1, side: -1, dry: 0.4, dryEnd: 1, seed: g.seed() })); }
  for (let k = 0; k < 18; k++) floor.push(inkDot(ink, page.width * g.pick(spots.slice(0, n)) + g.near(0, 110), 514 + g.range(0, 20), g.range(2, 5), { tone: g.range(0.35, 0.95), angle: g.near(0, 30), long: 1.6, seed: g.seed() }));
  parts.push(inkMarksPart("bank", floor, page));
  return { id: `grass-${seed}`, label: "Grass on a bank, bent by the wind", page, plates: inkPlates(ink === "ink" ? [K] : { [ink]: ink, [K]: "ink" }), seed: 11 + seed, parts, groups };
}

// ---- maple ---------------------------------------------------------------------------------------------------------------------
export interface InkMapleOptions {
  seed?: number;
  /** The side the branch comes in from. */
  from?: "left" | "right";
  /** How many leaves, 6–90. */
  leaves?: number;
  /** Maple hands, or oval leaves. */
  leaf?: "maple" | "oval";
  /** The near leaves and the ones behind. */
  pigment?: "cinnabar" | "vermilion" | "rouge" | "ochre" | "gamboge"; second?: "ochre" | "gamboge" | "peach" | "ink";
}
/** A maple leaf in one hand of strokes from its heart, each pressed and lifted, then veined while damp. */
function mapleLeaf(d: InkDice, C: string, x: number, y: number, s: number, face: number, tone: number, veins: boolean, flat = 1): InkMark[] {
  const out: InkMark[] = [], ends: [number, number][] = [], place = (a: number, l: number): [number, number] => { const u = Math.cos(a * (Math.PI / 180)) * l, v = Math.sin(a * (Math.PI / 180)) * l * flat, f = (face * Math.PI) / 180; return [x + u * Math.cos(f) - v * Math.sin(f), y + u * Math.sin(f) + v * Math.cos(f)]; };
  const lobes = ([[0, 1], [-44, 0.88], [46, 0.9], [-88, 0.6], [90, 0.62]] as const).map(([a, l]) => [a + d.near(0, 7), s * l * d.range(0.88, 1.1), s * d.range(0.3, 0.38) * (0.6 + 0.4 * flat)] as const);
  if (veins) for (const [A, L, w] of lobes) { const m = place(A, L * 0.5), n = inkStep(0, 0, face + A + 90, w * 0.42); out.push(inkClear([place(A, 0), [m[0] + n[0], m[1] + n[1]], place(A, L * 0.94), [m[0] - n[0], m[1] - n[1]]])); }
  for (const [A, L, w] of lobes) { ends.push(place(A, L)); out.push(inkStroke(C, [[...place(A, L * 0.02), 0.4], [...place(A - 1, L * 0.3), 0.9], [...place(A, L * 0.55), 1], [...place(A + 2, L * 0.8), 0.5], [...place(A, L), 0.04]], w, { tip: tone, belly: tone * 0.55, side: d.sign(), head: 0.2, rim: 0.4, dry: 0, dryEnd: 0.14, bristles: 6, bleed: Math.min(0.8, s * 0.014), grain: 0.35, seed: d.seed() })); }
  if (veins) for (const [i, e] of ends.entries()) out.push(inkLine(K, [[...place(180, s * 0.05), 0.9], [inkLerp(x, e[0], 0.5), inkLerp(y, e[1], 0.5), 0.7], [inkLerp(x, e[0], 0.86), inkLerp(y, e[1], 0.86), 0.05]], s * (i ? 0.028 : 0.036), { ink: 0.75, seed: d.seed() }));
  const st = inkStep(x, y, face + 180 + d.near(0, 24), s * d.range(0.36, 0.52)); out.push(inkLine(K, [[x, y, 0.8], [(x + st[0]) / 2 + d.near(0, 3), (y + st[1]) / 2 + d.near(0, 3), 0.6], [...st, 0.9]], s * 0.04, { ink: 0.75, seed: d.seed() }));
  return out;
}
function ovalLeaf(d: InkDice, C: string, x: number, y: number, s: number, face: number, tone: number, veins: boolean): InkMark[] {
  const bend = d.near(0, 26), at = (t: number): [number, number] => { const m = inkStep(x, y, face, s * t * 0.5); return inkStep(m[0], m[1], face + bend * t, s * t * 0.5); }, out: InkMark[] = [];
  if (veins) out.push(inkClear([at(0), ...[0.25, 0.5, 0.75].map((t) => inkStep(...at(t), face + bend * t + 90, s * 0.17)), at(0.97), ...[0.75, 0.5, 0.25].map((t) => inkStep(...at(t), face + bend * t - 90, s * 0.17))]));
  for (const k of [1, -1] as const) out.push(inkStroke(C, [0, 0.2, 0.45, 0.72, 1].map((t, i) => { const [X, Y] = at(t), p = inkStep(X, Y, face + bend * t + 90 * k, s * [0.01, 0.07, 0.1, 0.07, 0][i]); return [...p, [0.2, 0.85, 1, 0.7, 0.04][i]] as const; }), s * 0.26, { tip: tone, belly: tone * 0.6, side: k, head: 0.2, rim: 0.4, dry: 0, dryEnd: 0.2, bristles: 6, bleed: Math.min(0.8, s * 0.014), grain: 0.35, seed: d.seed() }));
  const st = inkStep(x, y, face + 180 + d.near(0, 20), s * 0.22); out.push(inkLine(K, [[...st, 1], [x, y, 0.8]], s * 0.04, { ink: 0.75, seed: d.seed() }));
  if (veins) { out.push(inkLine(K, [[x, y, 1], [...at(0.5), 0.7], [...at(0.96), 0.05]], s * 0.034, { ink: 0.75, seed: d.seed() })); for (let t = 0.2; t < 0.8; t += 0.16) { const [X, Y] = at(t); for (const k of [1, -1]) if (d.chance(0.75)) out.push(inkLine(K, [[X, Y, 0.8], [...inkStep(X, Y, face + bend * t + k * 42, s * 0.16 * (1 - t * 0.5)), 0.05]], s * 0.022, { ink: 0.6, seed: d.seed() })); } }
  return out;
}
/** 紅葉: a bough in its autumn leaves. */
export function inkMaple(o: InkMapleOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 2300), page = { width: 1400, height: 1000 }, flip = o.from === "right", mx = (x: number) => (flip ? page.width - x : x), sg = flip ? -1 : 1, n = Math.round(inkClamp(o.leaves ?? 56, 6, 90)), C = "leaf", B = "back";
  const G = grower(d.fork(50), 60), jig = (l: readonly (readonly [number, number, number])[], k: number): Limb => l.map(([x, y, w]) => { const [X, Y] = G.swell(x, y); return [mx(X) + d.near(0, k), Y + d.near(0, k * 0.8), w] as const; }), lit = 1 as const;
  const bough = jig([[-50, 300, 60], [120, 330, 52], [236, 420, 40], [400, 414, 30], [560, 496, 20], [660, 476, 14], [760, 500, 11]], 8), twigs = [jig([[180, 384, 26], [300, 300, 17], [400, 284, 12], [500, 216, 8], [610, 190, 1.6]], 9), jig([[400, 414, 22], [520, 356, 14], [640, 352, 11], [760, 300, 7], [890, 316, 1.6]], 9), jig([[560, 496, 16], [640, 574, 12], [730, 596, 9], [800, 668, 6], [890, 700, 1.4]], 9), jig([[760, 500, 11], [860, 470, 9], [950, 494, 6], [1070, 486, 1.4]], 9), jig([[290, 420, 16], [340, 520, 11], [322, 600, 8], [372, 690, 1.4]], 9)].map((l) => G.turn(l, 15, 0.22));
  const groups: Record<string, readonly InkMotion[]> = {}, parts: InkPart[] = [inkMarksPart("bough", [...limbMarks(d, K, bough, { side: lit, dry: 0.32 }), ...mossMarks(d, K, bough, 6, 1)], page)], sets = twigs.map(() => ({ back: [] as InkMark[], front: [] as InkMark[], twiglets: [] as InkMark[] })), hand = (x: number, y: number, s: number, face: number, near: boolean, g: InkDice) => ((o.leaf ?? "maple") === "oval" ? ovalLeaf(g, near ? C : B, x, y, s * 1.25, face, near ? g.range(0.6, 1) : g.range(0.36, 0.62), near) : mapleLeaf(g, near ? C : B, x, y, s, face, near ? g.range(0.6, 1) : g.range(0.36, 0.62), near, near ? g.range(0.6, 1) : g.range(0.5, 0.9)));
  // leaves crowd at the ends of the twigs and turn their points down; a few stand alone, one or two against the rest
  for (let i = 0; i < n; i++) {
    const k = [0, 1, 1, 2, 3, 2, 0, 4, 3, 1][i % 10], t = twigs[k], v = inkClamp(1 - Math.pow(d.next(), 1.8) * 0.94) * (t.length - 1), b = Math.min(t.length - 2, Math.floor(v)), X = inkLerp(t[b][0], t[b + 1][0], v - b), Y = inkLerp(t[b][1], t[b + 1][1], v - b), off = inkStep(0, 0, (Math.atan2(t[b + 1][1] - t[b][1], t[b + 1][0] - t[b][0]) * 180) / Math.PI + d.sign() * d.range(26, 100), d.range(18, 84)), x = X + off[0], y = Y + off[1] * 0.8 + 12, near = i % 5 !== 2 && i % 5 !== 4, odd = i % 11 === 7, face = odd ? d.range(-80, -20) : 90 - sg * d.range(-30, 56), mid: [number, number] = [inkLerp(X, x, 0.55), inkLerp(Y, y, 0.55) - 6];
    sets[k].twiglets.push(inkLine(K, [[X, Y, 1], [...mid, 0.8], [x, y, 0.5]], 3, { ink: 0.85, tremor: 0.8, seed: d.seed() }));
    sets[k][near ? "front" : "back"].push(...hand(x, y, d.range(46, 80) * (near ? 1 : 0.86), face, near, d.fork(40 + i)));
  }
  for (const [k, t] of twigs.entries()) { const id = `twig${k + 1}`, a = t[0], e = t[t.length - 1]; groups[id] = [{ kind: "sway", from: [a[0], a[1]], to: [e[0], e[1]], amount: 9, seconds: 4.6 + k * 0.5, phase: k * 1.7, gust: 0.35 }]; const bones = inkMarksPart(id, [...sets[k].twiglets, ...limbMarks(d, K, t, { side: lit, dry: 0.28 })], page, { group: id }), tremble = (p: number) => [{ kind: "sway" as const, from: [e[0], e[1] - 160] as const, to: [e[0], e[1] + 120] as const, amount: 3, seconds: 1.9, phase: p + k }]; if (sets[k].back.length) parts.push(inkMarksPart(`${id}-back`, sets[k].back, page, { group: id, motion: tremble(0) })); parts.push(bones); if (sets[k].front.length) parts.push(inkMarksPart(`${id}-leaves`, sets[k].front, page, { group: id, motion: tremble(1) })); }
  return { id: `maple-${seed}`, label: "A bough of autumn leaves", page, plates: inkPlates({ [B]: o.second ?? "ochre", [C]: o.pigment ?? "cinnabar", [K]: "ink" }), seed: 11 + seed, parts, groups };
}

// ---- single pieces, for swarms -------------------------------------------------------------------------------------------------
const PIECE = { width: 60, height: 60 };
export interface InkPetalOptions { seed?: number; kind?: "plum" | "peach" | "lotus"; pigment?: "rouge" | "peach" | "cinnabar" | "ink"; /** The body under the wash. */ body?: string }
/** One loose petal, cupped, its base the darkest. */
export function inkPetal(o: InkPetalOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 2500), kind = o.kind ?? "plum", C = "petal", turn = d.range(0, 360), cup = d.range(0.55, 1), long = { plum: 1.02, peach: 1.2, lotus: 1.7 }[kind], w = { plum: 15, peach: 14, lotus: 11 }[kind] * cup, L = 17 * long, n = d.seed();
  const at = (u: number, v: number): [number, number] => { const a = turn * (Math.PI / 180), X = u * w + (kind === "lotus" ? 3 : 1.5) * Math.sin(v * 2), Y = (v - 0.5) * 2 * L * 0.72; return [30 + X * Math.cos(a) - Y * Math.sin(a), 30 + X * Math.sin(a) + Y * Math.cos(a)]; }, notch = kind === "peach" ? 0.1 : kind === "plum" ? 0.03 : -0.1;
  const shape = [at(0, 0), at(0.42, 0.14), at(0.86, 0.46), at(0.8, 0.8), at(0.34, 1), at(0, 1 - notch), at(-0.36, 1), at(-0.84, 0.78), at(-0.84, 0.44), at(-0.4, 0.12)], base = at(0, 0), tip = at(0, 1), l2 = (tip[0] - base[0]) ** 2 + (tip[1] - base[1]) ** 2;
  const along = (x: number, y: number) => ((x - base[0]) * (tip[0] - base[0]) + (y - base[1]) * (tip[1] - base[1])) / l2, marks: InkMark[] = [inkClear(shape), inkBloomed(C, shape, { tone: (x, y) => { const v = along(x, y); return inkClamp((kind === "lotus" ? 0.1 + 0.7 * Math.pow(inkClamp(v), 1.8) : 0.62 - 0.44 * inkEase(0, 0.9, v)) * (0.8 + 0.5 * inkFbm2(n, x / 9, y / 9, 2))); }, soft: 0.6, wander: 0.5, wave: 9, fringe: 0.4, tooth: 1.6, rim: 0.3, rimWidth: 1.6, mottle: 0.25, cloud: 10, seed: d.seed() })];
  marks.push(inkLine(C, [[...at(0.02, 0.06), 0.9], [...at(0.12, 0.4), 0.6], [...at(0.1, 0.76), 0.1]], 1.2, { ink: 0.5, seed: d.seed() }), inkLine(C, [[...at(0.84, 0.46), 0.2], [...at(0.8, 0.8), 1], [...at(0.34, 1), 0.2]], 1.1, { ink: 0.55, seed: d.seed() }));
  return { id: `petal-${kind}-${seed}`, label: "A petal", page: PIECE, plates: inkPlates({ [C]: o.pigment ?? (kind === "plum" ? "rouge" : "peach"), [K]: "ink" }), seed: 11 + seed, parts: [inkMarksPart("petal", marks, PIECE, { body: o.body ?? "#FDF4EE" })] };
}
export interface InkLeafOptions { seed?: number; kind?: "bamboo" | "willow" | "maple" | "oval"; pigment?: "ink" | "cinnabar" | "vermilion" | "rouge" | "ochre" | "gamboge" | "malachite" | "indigo" | "moss" }
/** One loose leaf. */
export function inkLeaf(o: InkLeafOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 2600), kind = o.kind ?? "bamboo", ink = o.pigment ?? (kind === "bamboo" || kind === "willow" ? "ink" : "cinnabar"), C = ink === "ink" ? K : "leaf", a = d.range(0, 360), s = inkStep(30, 30, a + 180, kind === "maple" ? 6 : 23), marks = kind === "maple" ? mapleLeaf(d, C, s[0], s[1], 20, a, d.range(0.7, 1), C !== K, d.range(0.55, 1)) : kind === "oval" ? ovalLeaf(d, C, ...inkStep(30, 30, a + 180, 18), 38, a, d.range(0.7, 1), C !== K) : [inkBlade(C, { x: s[0], y: s[1], angle: a, length: 47, width: kind === "willow" ? d.range(6, 8) : d.range(9, 12), bend: d.near(0, 34), tone: d.range(0.7, 1), belly: 0.3, neck: 0.16, seed: d.seed() })];
  return { id: `leaf-${kind}-${seed}`, label: "A leaf", page: PIECE, plates: inkPlates(C === K ? [K] : { [C]: ink, [K]: "ink" }), seed: 11 + seed, parts: [inkMarksPart("leaf", marks, PIECE)] };
}
export interface InkSnowflakeOptions { seed?: number; /** Colour of the flake. */ body?: string; /** How blurred its edge is, 0–1. */ soft?: number }
/** A flake: a soft round of body colour with no ink in it, so it is only seen against something. */
export function inkSnowflake(o: InkSnowflakeOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 2700), r = d.range(13, 19), soft = inkClamp(o.soft ?? 0.5), n = d.seed(), cx = 30 + d.near(0, 2), cy = 30 + d.near(0, 2);
  return { id: `snow-${seed}`, label: "A flake of snow", page: PIECE, plates: inkPlates([K]), seed: 11 + seed, parts: [{ id: "flake", box: [0, 0, 60, 60], body: o.body ?? "#FFFFFF", draw: (c) => {
    const cover = c.sheet.layer?.cover, S = c.sheet.spec.scale;
    if (!cover) return;
    for (let y = 0; y < c.sheet.h; y++) for (let x = 0; x < c.sheet.w; x++) { const [X, Y] = c.page.local(x / S, y / S), q = Math.hypot(X - cx, (Y - cy) * 1.06), k = r * (0.84 + 0.36 * inkNoise2(n, Math.atan2(Y - cy, X - cx) * 1.4 + 9, 3)); cover[y * c.sheet.w + x] = Math.max(cover[y * c.sheet.w + x], inkEase(k, k * (0.82 - 0.75 * soft), q)); }
  } }] };
}
export interface InkRaindropOptions { seed?: number; /** Degrees off upright. */ slant?: number; /** How long, 0–1, and how strong. */ length?: number; tone?: number; pigment?: "ink" | "indigo" }
/** Rain: a short dry thread, heavier where it ends. */
export function inkRaindrop(o: InkRaindropOptions = {}): InkSubject {
  const seed = o.seed ?? 1, d = inkDice(seed + 2800), ink = o.pigment ?? "ink", a = 90 + (o.slant ?? 12), L = 44 * inkClamp(o.length ?? 0.9, 0.2, 1.1), s = inkStep(30, 30, a + 180, L / 2), m = inkStep(30, 30, a + 90, d.near(0, 0.8)), e = inkStep(30, 30, a, L / 2), t = inkClamp((o.tone ?? 0.5) * d.range(0.8, 1.15)), parts: InkMark[] = [];
  const gap = d.range(0.3, 0.6), p = (u: number): [number, number] => (u < 0.5 ? [inkLerp(s[0], m[0], u * 2), inkLerp(s[1], m[1], u * 2)] : [inkLerp(m[0], e[0], u * 2 - 1), inkLerp(m[1], e[1], u * 2 - 1)]);
  parts.push(inkLine(ink, [[...p(0), 0.05], [...p(gap * 0.6), 0.7], [...p(gap), 0.2]], 1.4, { ink: t * 0.8, seed: d.seed() }), inkLine(ink, [[...p(gap + 0.06), 0.2], [...p((1 + gap) / 2), 0.9], [...p(0.94), 1], [...p(1), 0.3]], 1.7, { ink: t, seed: d.seed() }));
  return { id: `rain-${seed}`, label: "Rain", page: PIECE, plates: inkPlates(ink === "ink" ? [K] : { [ink]: ink, [K]: "ink" }), seed: 11 + seed, parts: [inkMarksPart("drop", parts, PIECE)] };
}
