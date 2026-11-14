/**
 * RIG1 presets: original, parametric rigs for people, animals, creatures and machines.
 *
 * Each builder returns a plain `RigSpec` (JSON) with the motion you ask for already wired: root travel, gait,
 * wingbeats, wave chains, rolling wheels, linkages, emitters. Designs are original (CC0 dedication); colours are a
 * neutral default palette that every film-look painter restyles.
 */
import type { EasingSpec } from "../motion/types";
import type { RigBone, RigDriver, RigKey, RigLeg, RigPart, RigRole, RigRootKey, RigShape, RigSpec } from "./rig-spec";

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
  /** Ground line in scene y. */
  y?: number;
  facing?: 1 | -1;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
type Pt = readonly [number, number];

/** Small builder that keeps ids namespaced and numbers rounded. */
class Rig {
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
  track(bone: string, keys: RigKey[]) { this.tracks[bone] = keys; }
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
const poly = (points: Pt[]): RigShape => ({ type: "polygon", points });
const ell = (cx: number, cy: number, rx: number, ry: number): RigShape => ({ type: "ellipse", cx, cy, rx, ry });
const cap = (length: number, w0: number, w1: number): RigShape => ({ type: "capsule", length, w0, w1 });
const rect = (x: number, y: number, width: number, height: number, radius?: number): RigShape => ({ type: "rect", x, y, width, height, radius });
/** Points on an ellipse arc, degrees clockwise from +x (y down). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 18): Pt[] {
  return Array.from({ length: n + 1 }, (_, k) => { const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt; });
}
/** Wheel with tyre, spokes and hub, as a single path (even-odd keeps the gaps open). */
function wheelPath(R: number, spokes: number, rim = .16): string {
  const r1 = R * (1 - rim), hub = R * .18, parts: string[] = [];
  const circle = (r: number) => `M${r2(-r)} 0A${r2(r)} ${r2(r)} 0 1 0 ${r2(r)} 0A${r2(r)} ${r2(r)} 0 1 0 ${r2(-r)} 0Z`;
  parts.push(circle(R), circle(r1));
  for (let k = 0; k < spokes; k++) {
    const a = k / spokes * Math.PI * 2, w = R * .035;
    const x0 = Math.cos(a) * hub, y0 = Math.sin(a) * hub, x1 = Math.cos(a) * r1, y1 = Math.sin(a) * r1, nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
    parts.push(`M${r2(x0 + nx)} ${r2(y0 + ny)}L${r2(x1 + nx)} ${r2(y1 + ny)}L${r2(x1 - nx)} ${r2(y1 - ny)}L${r2(x0 - nx)} ${r2(y0 - ny)}Z`);
  }
  parts.push(circle(hub));
  return parts.join("");
}

/** Root travel from `from` to `to` over the window, with eased starts and stops. */
function travel(o: RigPresetOptions, start: number, end: number, ease: EasingSpec = "ease-in-out-quad"): RigRootKey[] {
  const y = o.y ?? 0, from = o.from ?? 0, to = o.to ?? from;
  if (from === to) return [{ frame: start, x: from, y, facing: o.facing ?? 1 }];
  return [{ frame: start, x: from, y }, { frame: end, x: to, y, ease }];
}

function finish(id: string, kind: string, rig: Rig, root: RigRootKey[], palette: Partial<Record<RigRole, string>>, bounds: RigSpec["bounds"], o: RigPresetOptions): RigSpec {
  return {
    version: 1, id: o.id ?? id, kind, bones: rig.bones, parts: rig.parts, drivers: rig.drivers, tracks: rig.tracks, root,
    palette: { ...palette, ...o.palette }, bounds, provenance: { license: "CC0-1.0", source: "original Kumiki RIG1 preset" },
  };
}

// ---- People ----------------------------------------------------------------------------------------------------------------------

const PERSON_PALETTE: Partial<Record<RigRole, string>> = {
  skin: "#d39b76", hair: "#2b211c", cloth: "#3b6fb6", "cloth-dark": "#2d3142", shoe: "#1f1b18", eye: "#1d1715", mouth: "#3b1714", detail: "#1d1715", accent: "#c8342b",
};
export const PERSON_MOTIONS = ["idle", "walk", "run", "wave", "talk", "cheer"] as const;

/** A person in three-quarter profile: the proportions of the collage paper puppet, legs driven by IK. */
export function personRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 360) / 100, rig = new Rig(u), m = o.motion ?? "walk", start = o.start ?? 0, end = o.end ?? 180;
  rig.bone("root", undefined, 0, 0);
  // Leg reach (21.5 + 21 + sole 2.4) exceeds the hip height (44), so a stance knee is always slightly soft and the
  // planted foot can always reach the ground.
  rig.bone("pelvis", "root", 0, -44);
  rig.bone("torso", "pelvis", 0, 0);
  for (const [side, x, far] of [["b", -1.4, true], ["f", 2.2, false]] as const) {
    rig.bone("thigh-" + side, "pelvis", x, 0, 0, 21.5);
    rig.bone("shin-" + side, "thigh-" + side, 0, 21.5, 0, 21);
    rig.bone("foot-" + side, "shin-" + side, 0, 21);
    const z = far ? 1 : 3;
    rig.part("thigh-" + side, "thigh-" + side, cap(21.5, 8, 6.6), "cloth-dark", z, { far });
    rig.part("shin-" + side, "shin-" + side, cap(21, 6.4, 5.4), "cloth-dark", z, { far });
    rig.part("shoe-" + side, "foot-" + side, poly([[-2.6, -1.4], [2.2, -1.8], [5.4, -.6], [7.2, 1.2], [7, 2.6], [-2.8, 2.6], [-3.2, .6]]), "shoe", z + .1, { far });
  }
  rig.part("torso", "torso", poly([[-6.8, -27.9], [7.6, -28.3], [10, -25.3], [9.6, -17], [8.7, -9], [8.5, 1.8], [7.3, 3], [-7.3, 3], [-8.5, 1.8], [-8.3, -9], [-9.4, -17], [-10.2, -25.3]]), "cloth", 4);
  rig.part("collar", "torso", poly([[-2.6, -26.6], [1.6, -22.4], [5, -26.8]]), "accent", 4.1);
  rig.bone("neck", "torso", 1.4, -29.5);
  rig.part("neck", "neck", rect(-2.1, -1, 4.4, 6.4, 1), "skin", 3.9);
  rig.bone("head", "neck", 1.4, -11.5);
  const head: Pt[] = [];
  for (let k = 0; k < 36; k++) {
    const a = k / 36 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), jaw = s > 0 ? 1 - .12 * s * s * (c < 0 ? 1 : .35) : 1;
    let x = c * 10.2 * jaw; const y = s * 11.2;
    if (c > .85 && s > -.1 && s < .35) x += 1.8 * (1 - Math.abs(s - .12) / .25) * Math.max(0, (c - .85) / .15);
    head.push([x, y]);
  }
  rig.part("head", "head", poly(head), "skin", 5);
  rig.part("ear", "head", ell(-1.6, .8, 1.6, 2.2), "skin", 5.1, { far: true });
  rig.part("hair", "head", poly([...arc(0, 0, 11.3, 12.3, 148, 332, 22), [6.3, -4], [2.8, -4.9], [-1, -3.4], [-4.6, -.2], [-6.7, 3.4]]), "hair", 5.3);
  rig.part("eye", "head", ell(5.3, -1.5, .95, 1.25), "eye", 5.4, { variants: { shut: ell(5.3, -1.1, 1.3, .28) } });
  rig.part("mouth", "head", ell(7, 5.5, 1.2, .32), "mouth", 5.4, { variants: { open: ell(7, 5.7, 1.5, 1.6), mid: ell(7, 5.6, 1.4, .8) } });
  for (const [side, x, far] of [["b", -1, true], ["f", 2, false]] as const) {
    rig.bone("arm-" + side, "torso", x, -25, far ? -5 : 6, 14.5);
    rig.bone("fore-" + side, "arm-" + side, 0, 14.5, far ? 12 : 10, 13.5);
    rig.bone("hand-" + side, "fore-" + side, 0, 14.6);
    const z = far ? .5 : 7;
    rig.part("arm-" + side, "arm-" + side, cap(14.5, 6.6, 5.4), "cloth", z, { far });
    rig.part("fore-" + side, "fore-" + side, cap(13.5, 5.2, 4.4), "cloth", z, { far });
    rig.part("hand-" + side, "hand-" + side, ell(0, 0, 3, 3.3), "skin", z + .1, { far });
  }
  rig.drivers.push(
    { type: "oscillate", bone: "torso", property: "scaleY", amplitude: .008, period: 76 },
    { type: "oscillate", bone: "head", property: "rotate", amplitude: 1.6, period: 140, wobble: .5 },
    { type: "variant", part: "eye", name: "shut", mode: "blink", interval: [64, 130], duration: 4 },
  );
  const moving = m === "walk" || m === "run", run = m === "run";
  if (moving) {
    rig.drivers.push({ type: "gait", start, end, body: "pelvis", stride: (run ? 76 : 50) * u, stance: run ? .38 : .6, lift: (run ? 13 : 6) * u, bob: (run ? 3 : 1.6) * u,
      legs: [{ upper: "thigh-f", lower: "shin-f", foot: "foot-f", phase: 0, bend: 1, sole: 2.4 * u }, { upper: "thigh-b", lower: "shin-b", foot: "foot-b", phase: .5, bend: 1, sole: 2.4 * u }],
      swing: [{ bone: "arm-f", amplitude: run ? 34 : 22, phase: 0 }, { bone: "arm-b", amplitude: run ? 34 : 22, phase: .5 }, { bone: "head", amplitude: 1.5, phase: .25, harmonic: 2 }] });
    if (run) { rig.track("torso", [{ frame: start, rotate: 9 }]); rig.track("fore-f", [{ frame: start, rotate: -80 }]); rig.track("fore-b", [{ frame: start, rotate: -84 }]); }
    else rig.track("torso", [{ frame: start, rotate: 3 }]);
  } else rig.drivers.push({ type: "gait", body: "pelvis", stride: 50 * u, legs: [{ upper: "thigh-f", lower: "shin-f", foot: "foot-f", phase: 0, bend: 1, sole: 2.4 * u }, { upper: "thigh-b", lower: "shin-b", foot: "foot-b", phase: .5, bend: 1, sole: 2.4 * u }] });
  if (m === "wave") {
    rig.track("arm-f", [{ frame: start, rotate: 0 }, { frame: start + 10, rotate: -152, ease: "ease-out-back" }, { frame: end - 10, rotate: -152 }, { frame: end, rotate: 0 }]);
    rig.drivers.push({ type: "oscillate", start: start + 10, end: end - 10, bone: "fore-f", property: "rotate", amplitude: 26, period: 14, ramp: 5 });
    rig.track("head", [{ frame: start, rotate: 0 }, { frame: start + 12, rotate: -5 }]);
  }
  if (m === "talk" || m === "wave") rig.drivers.push({ type: "variant", start, end, part: "mouth", mode: "talk", open: "open", mid: "mid" });
  if (m === "talk") rig.drivers.push({ type: "oscillate", start, end, bone: "fore-f", property: "rotate", amplitude: 18, period: 44, wobble: .6, ramp: 10 },
    { type: "oscillate", start, end, bone: "arm-f", property: "rotate", amplitude: 9, period: 60, wobble: .4, ramp: 10 });
  if (m === "cheer") {
    for (const s of ["f", "b"]) rig.track("arm-" + s, [{ frame: start, rotate: 0 }, { frame: start + 8, rotate: s === "f" ? -168 : -160, ease: "ease-out-back" }]);
    rig.drivers.push({ type: "oscillate", start: start + 8, end, bone: "pelvis", property: "y", amplitude: -3 * u, period: 20 },
      { type: "variant", start, end, part: "mouth", mode: "talk", open: "open", mid: "open" });
  }
  return finish("person", "biped", rig, travel(o, start, end, moving ? "linear" : undefined), PERSON_PALETTE, { x: -16 * u, y: -100 * u, width: 32 * u, height: 102 * u }, o);
}

// ---- Four-legged animals ---------------------------------------------------------------------------------------------------------

export type QuadKind = "dog" | "horse" | "cat";
export const QUADRUPED_MOTIONS = ["idle", "walk", "trot", "gallop"] as const;
const QUAD: Record<QuadKind, { palette: Partial<Record<RigRole, string>>; hip: number; neck: number; neckAngle: number; legW: number; tail: number; tailAngle: number; head: number }> = {
  dog: { palette: { fur: "#b5793f", "fur-dark": "#7d4f27", belly: "#e9c99a", eye: "#1d1715", detail: "#2b1d14", mouth: "#3b1714", horn: "#2b1d14" }, hip: 40, neck: 13, neckAngle: -132, legW: 7.5, tail: 7, tailAngle: 140, head: 1 },
  horse: { palette: { fur: "#7a4a2c", "fur-dark": "#4f2e1a", belly: "#8d5a38", hair: "#24170f", eye: "#1d1715", detail: "#24170f", horn: "#3a3a3a", mouth: "#24170f" }, hip: 55, neck: 21, neckAngle: -142, legW: 7, tail: 8, tailAngle: 156, head: 1.25 },
  cat: { palette: { fur: "#8b8f97", "fur-dark": "#5e626a", belly: "#d9dade", eye: "#c9a227", detail: "#2a2b2e", mouth: "#4a2a2a", horn: "#2a2b2e" }, hip: 31, neck: 9, neckAngle: -122, legW: 5.6, tail: 9, tailAngle: 120, head: .9 },
};

/** Dog, horse or cat: body length = `size`. Lateral-sequence walk, diagonal trot, rotary gallop; tail and head in step. */
export function quadrupedRig(kind: QuadKind, o: RigPresetOptions = {}): RigSpec {
  const q = QUAD[kind], u = (o.size ?? (kind === "horse" ? 460 : kind === "cat" ? 260 : 320)) / 100, rig = new Rig(u);
  const m = o.motion ?? "walk", start = o.start ?? 0, end = o.end ?? 180, H = q.hip;
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, -H);
  // Torso: barrel, chest and haunch as overlapping shapes on one bone.
  const barrel: Pt[] = kind === "cat"
    ? [[-36, -4], [-30, -11], [-10, -13], [16, -12], [32, -9], [38, -2], [34, 8], [12, 11], [-14, 11], [-32, 7]]
    : [[-40, -3], [-34, -12], [-12, -14], [14, -14], [34, -12], [44, -4], [40, 10], [16, 14], [-14, 13], [-36, 8]];
  rig.part("barrel", "body", poly(barrel), "fur", 4);
  rig.part("belly", "body", poly(kind === "cat" ? [[-24, 6], [14, 6], [26, 3], [12, 11], [-14, 11]] : [[-26, 6], [16, 7], [34, 5], [16, 14], [-14, 13]]), "belly", 4.1);
  const legs: RigLeg[] = [];
  const legDefs = [
    { id: "hind-far", x: -30, front: false, far: true }, { id: "fore-far", x: 30, front: true, far: true },
    { id: "hind-near", x: -32, front: false, far: false }, { id: "fore-near", x: 32, front: true, far: false },
  ];
  const legLen = (H - 4) / 2 * 1.06;
  for (const l of legDefs) {
    const z = l.far ? 1 : 6, role: RigRole = l.far ? "fur-dark" : "fur";
    rig.bone("up-" + l.id, "body", l.x, l.front ? 4 : 2, 0, legLen);
    rig.bone("lo-" + l.id, "up-" + l.id, 0, legLen, 0, legLen);
    rig.bone("paw-" + l.id, "lo-" + l.id, 0, legLen);
    // Hind legs carry a hock kink drawn into the lower segment; fronts are straighter.
    rig.part("up-" + l.id, "up-" + l.id, l.front ? cap(legLen, q.legW * 1.5, q.legW) : poly([[-q.legW * 1.1, -3], [q.legW * 1.3, -4], [q.legW * .7, legLen], [-q.legW * .7, legLen]]), role, z, { far: l.far });
    rig.part("lo-" + l.id, "lo-" + l.id, l.front ? cap(legLen, q.legW, q.legW * .8) : poly([[-q.legW * .6, 0], [q.legW * .6, 0], [q.legW * .2, legLen * .45], [q.legW * .55, legLen], [-q.legW * .45, legLen], [-q.legW * .9, legLen * .42]]), role, z, { far: l.far });
    rig.part("paw-" + l.id, "paw-" + l.id, kind === "horse" ? poly([[-3.4, -1], [3.6, -1], [4.6, 4], [-3, 4]]) : ell(1.6, 1.4, q.legW * .62, 2.4), kind === "horse" ? "horn" : role, z + .1, { far: l.far });
    legs.push({ upper: "up-" + l.id, lower: "lo-" + l.id, foot: "paw-" + l.id, phase: 0, bend: l.front ? -1 : 1, sole: (kind === "horse" ? 4 : 3.4) * u });
  }
  // Neck and head.
  rig.bone("neck", "body", kind === "cat" ? 32 : 38, -6, q.neckAngle, q.neck);
  rig.part("neck", "neck", cap(q.neck, kind === "horse" ? 24 : 12, kind === "horse" ? 12 : 9), "fur", 5);
  if (kind === "horse") rig.part("mane", "neck", poly([[-11, -3], [-14, 3], [-13, 9], [-15, 14], [-11, 19], [-9, 24], [-4, 23], [-6, 2]]), "hair", 5.2);
  rig.bone("head", "neck", 0, q.neck, -q.neckAngle - 8);
  const hs = q.head;
  if (kind === "horse") {
    rig.part("head", "head", poly([[-6, -6], [4, -8], [16, -4], [27, 2], [29, 8], [24, 11], [10, 10], [-4, 7], [-8, 1]].map(([x, y]) => [x * hs * .8, y * hs * .8] as Pt)), "fur", 6);
    rig.part("ear", "head", poly([[-3, -5], [0, -16], [3, -6]]), "fur", 6.1);
  } else {
    rig.part("skull", "head", ell(0, 0, 10 * hs, 9 * hs), "fur", 6);
    rig.part("snout", "head", kind === "cat" ? ell(8, 3, 5, 4) : poly([[4, -3], [17, -1], [20, 3], [18, 7], [6, 8]].map(([x, y]) => [x * hs, y * hs] as Pt)), kind === "cat" ? "belly" : "fur", 6.1);
    rig.part("nose", "head", ell(kind === "cat" ? 12 : 19 * hs, kind === "cat" ? 1.5 : 1.5, 2, 1.6), "detail", 6.2);
    rig.part("ear", "head", kind === "cat" ? poly([[-6, -6], [-3, -17], [3, -8]]) : poly([[-5, -5], [2, -7], [3, 4], [-1, 12], [-6, 9]]), kind === "cat" ? "fur" : "fur-dark", 6.3);
  }
  rig.part("eye", "head", ell(kind === "horse" ? 6 : 4, -2, 1.4, 1.7), "eye", 6.4, { variants: { shut: ell(kind === "horse" ? 6 : 4, -1.5, 1.8, .35) } });
  // Tail.
  const tailBones: string[] = [];
  const tailN = kind === "horse" ? 3 : 4;
  for (let i = 0; i < tailN; i++) {
    const id = "tail-" + i;
    rig.bone(id, i ? "tail-" + (i - 1) : "body", i ? 0 : -38, i ? q.tail : -8, i ? (kind === "cat" ? -14 : 8) : q.tailAngle, q.tail);
    tailBones.push(id);
    const w0 = kind === "horse" ? 9 - i : 5.4 - i * .9, w1 = Math.max(1.6, w0 - 1.2);
    rig.part(id, id, cap(q.tail + 1.5, w0, w1), kind === "horse" ? "hair" : "fur", 3.5);
  }
  rig.drivers.push({ type: "variant", part: "eye", name: "shut", mode: "blink", interval: [70, 150], duration: 4 });
  const moving = m !== "idle";
  const gaitDef = m === "trot" ? { phases: [0, .5, .5, 0], stance: .5, stride: 1.5, lift: 6, bob: 1.6 }
    : m === "gallop" ? { phases: [0, .55, .1, .65], stance: .34, stride: 2.6, lift: 10, bob: 3.6 }
      : { phases: [0, .25, .5, .75], stance: .65, stride: 1, lift: 4, bob: .8 };
  const strideBase = H * 1.15;
  rig.drivers.push({ type: "gait", body: "body", start, end, stride: strideBase * gaitDef.stride * u, stance: gaitDef.stance, lift: gaitDef.lift * u, bob: gaitDef.bob * u,
    legs: legs.map((l, i) => ({ ...l, phase: gaitDef.phases[i] })),
    swing: [{ bone: "neck", amplitude: m === "gallop" ? 7 : 3, phase: .1, harmonic: 2 }, { bone: "head", amplitude: m === "gallop" ? -4 : -2, phase: .1, harmonic: 2 }] });
  if (m === "gallop") rig.drivers.push({ type: "oscillate", start, end, bone: "body", property: "rotate", amplitude: 3.5, period: Math.max(8, 14), bySpeed: true });
  rig.drivers.push({ type: "chain", bones: tailBones, amplitude: kind === "dog" ? (moving ? 12 : 16) : kind === "cat" ? 6 : 4, period: kind === "dog" ? 14 : kind === "cat" ? 70 : 40, lag: .8, growth: 1.2, follow: 2 });
  rig.drivers.push({ type: "oscillate", bone: "body", property: "scaleY", amplitude: .012, period: 80 });
  return finish(kind, "quadruped", rig, travel(o, start, end, moving ? "linear" : undefined), q.palette, { x: -60 * u, y: -(H + 40) * u, width: 120 * u, height: (H + 42) * u }, o);
}

// ---- Bird ------------------------------------------------------------------------------------------------------------------------

export const BIRD_MOTIONS = ["perch", "fly", "hop"] as const;
/** A small songbird: body length = `size`. Flies with a quick downstroke and folding hand, perches and hops. */
export function birdRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 140) / 100, rig = new Rig(u), m = o.motion ?? "fly", start = o.start ?? 0, end = o.end ?? 180, fly = m === "fly";
  const palette: Partial<Record<RigRole, string>> = { feather: "#2f5d8a", "fur-dark": "#22425f", belly: "#e7a35c", beak: "#e2a62b", eye: "#1d1715", detail: "#1d1715", fur: "#2f5d8a" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, fly ? 0 : -46, fly ? 8 : -14);
  rig.part("body", "body", poly([[-30, 0], [-18, -14], [6, -18], [24, -12], [30, -2], [22, 10], [0, 16], [-20, 10]]), "feather", 4);
  rig.part("breast", "body", poly([[2, 2], [24, -2], [26, 6], [12, 14], [-6, 13]]), "belly", 4.1);
  rig.bone("head", "body", 26, -14);
  rig.part("head", "head", ell(0, -4, 13, 12), "feather", 5);
  rig.part("beak", "head", poly([[10, -6], [24, -2], [10, 1]]), "beak", 5.1);
  rig.part("eye", "head", ell(5, -7, 2.2, 2.4), "eye", 5.2, { variants: { shut: ell(5, -6.5, 2.6, .5) } });
  rig.bone("tail", "body", -28, -2, 72, 22);
  rig.part("tail", "tail", poly([[-4, 0], [4, 0], [9, 24], [0, 20], [-9, 24]]), "fur-dark", 3);
  for (const [side, far] of [["far", true], ["near", false]] as const) {
    rig.bone("wing-" + side, "body", 4, -12, -150, 24);
    rig.bone("hand-" + side, "wing-" + side, 0, 24, 20, 28);
    const z = far ? 1 : 7, role: RigRole = far ? "fur-dark" : "feather";
    rig.part("wing-" + side, "wing-" + side, poly([[-7, 0], [7, -2], [10, 24], [-9, 26]]), role, z, { far });
    rig.part("hand-" + side, "hand-" + side, poly([[-9, -2], [8, -2], [12, 10], [10, 22], [6, 32], [1, 24], [-3, 34], [-7, 24], [-12, 30], [-12, 14]]), role, z + .1, { far });
    rig.bone("leg-" + side, "body", far ? -4 : 2, 12, 0, 10);
    rig.bone("shank-" + side, "leg-" + side, 0, 10, 0, 10);
    rig.bone("toe-" + side, "shank-" + side, 0, 10);
    rig.part("leg-" + side, "leg-" + side, cap(10, 2.6, 2), "beak", z - .5, { far });
    rig.part("shank-" + side, "shank-" + side, cap(10, 2, 1.8), "beak", z - .5, { far });
    rig.part("toe-" + side, "toe-" + side, poly([[-4, -1], [7, -1], [8, 1], [-5, 1]]), "beak", z - .4, { far });
  }
  rig.drivers.push({ type: "variant", part: "eye", name: "shut", mode: "blink", interval: [60, 120], duration: 3 });
  if (fly) {
    for (const [side, ph] of [["near", 0], ["far", .03]] as const) rig.drivers.push({ type: "wing", shoulder: "wing-" + side, elbow: "hand-" + side, amplitude: 55, period: 12, phase: ph, fold: 34, bias: 10 });
    for (const side of ["near", "far"]) { rig.track("leg-" + side, [{ frame: start, rotate: 70 }]); rig.track("shank-" + side, [{ frame: start, rotate: -120 }]); }
    rig.drivers.push({ type: "oscillate", bone: "body", property: "y", amplitude: -4 * u, period: 12, phase: .2 }, { type: "bank", amount: .6, max: 25 },
      { type: "oscillate", bone: "tail", property: "rotate", amplitude: 6, period: 24 });
    const y = o.y ?? 0, from = o.from ?? 0, to = o.to ?? from + 600;
    // Flying: the root is the body; `y` is the height it flies at, dipping and climbing along the way.
    return finish("bird", "bird", rig, [{ frame: start, x: from, y }, { frame: Math.round(start + (end - start) * .5), x: (from + to) / 2, y: y - 50 * u, ease: "ease-in-out-quad" }, { frame: end, x: to, y: y + 10 * u, ease: "ease-in-out-quad" }],
      palette, { x: -40 * u, y: -110 * u, width: 80 * u, height: 112 * u }, o);
  }
  for (const side of ["near", "far"]) rig.track("hand-" + side, [{ frame: start, rotate: 150 }]);
  for (const side of ["near", "far"]) rig.track("wing-" + side, [{ frame: start, rotate: 66 }]);
  rig.drivers.push({ type: "gait", body: "body", start, end, stride: 26 * u, stance: m === "hop" ? .5 : .62, lift: 4 * u,
    legs: [{ upper: "leg-near", lower: "shank-near", foot: "toe-near", phase: m === "hop" ? 0 : 0, bend: -1, sole: 1 * u }, { upper: "leg-far", lower: "shank-far", foot: "toe-far", phase: m === "hop" ? 0 : .5, bend: -1, sole: 1 * u }] });
  rig.drivers.push({ type: "oscillate", bone: "head", property: "rotate", amplitude: 10, period: 46, wobble: .8 }, { type: "oscillate", bone: "tail", property: "rotate", amplitude: 8, period: 30, wobble: .5 });
  if (m === "hop") rig.drivers.push({ type: "oscillate", start, end, bone: "body", property: "y", amplitude: -5 * u, period: 16, bySpeed: true });
  return finish("bird", "bird", rig, travel(o, start, end, "linear"), palette, { x: -40 * u, y: -90 * u, width: 80 * u, height: 92 * u }, o);
}

// ---- Dragon ----------------------------------------------------------------------------------------------------------------------

export const DRAGON_MOTIONS = ["fly", "walk", "roar"] as const;
/** A dragon: four legs, membrane wings, a long neck and tail that ripple, a jaw that opens on a roar with fire. */
export function dragonRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 520) / 100, rig = new Rig(u), m = o.motion ?? "fly", start = o.start ?? 0, end = o.end ?? 180, fly = m === "fly";
  const palette: Partial<Record<RigRole, string>> = { scale: "#2f7a5a", "scale-dark": "#1f5340", belly: "#d9b26a", membrane: "#9b3b3b", horn: "#efe1c0", eye: "#f2c230", detail: "#173a2c", mouth: "#5a1414", light: "#f08a24", smoke: "#f4c242" };
  const H = 26;
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, fly ? 0 : -H, fly ? -4 : 0);
  rig.part("body", "body", poly([[-24, -2], [-16, -9], [0, -11], [16, -10], [26, -5], [28, 4], [18, 9], [0, 10], [-18, 8], [-26, 4]]), "scale", 4);
  rig.part("belly", "body", poly([[-18, 4], [0, 6], [20, 5], [16, 9], [0, 10], [-16, 8]]), "belly", 4.1);
  rig.part("spines", "body", poly([[-22, -4], [-19, -11], [-15, -7], [-11, -13], [-7, -9], [-3, -14], [1, -10], [5, -14], [9, -10], [13, -13], [17, -8], [-20, -5]]), "horn", 3.9);
  const legs: RigLeg[] = [];
  const L = 12;
  for (const l of [{ id: "hind-far", x: -18, front: false, far: true }, { id: "fore-far", x: 18, front: true, far: true }, { id: "hind-near", x: -20, front: false, far: false }, { id: "fore-near", x: 20, front: true, far: false }]) {
    const z = l.far ? 1 : 6, role: RigRole = l.far ? "scale-dark" : "scale";
    rig.bone("up-" + l.id, "body", l.x, 3, 0, L);
    rig.bone("lo-" + l.id, "up-" + l.id, 0, L, 0, L);
    rig.bone("claw-" + l.id, "lo-" + l.id, 0, L);
    rig.part("up-" + l.id, "up-" + l.id, cap(L, l.front ? 7 : 9, 5), role, z, { far: l.far });
    rig.part("lo-" + l.id, "lo-" + l.id, cap(L, 5, 4), role, z, { far: l.far });
    rig.part("claw-" + l.id, "claw-" + l.id, poly([[-3, -1], [3, -1], [7, 2], [5, 3], [3, 2.2], [1, 3.4], [-1, 2.2], [-3, 3]]), "horn", z + .1, { far: l.far });
    legs.push({ upper: "up-" + l.id, lower: "lo-" + l.id, foot: "claw-" + l.id, phase: 0, bend: l.front ? -1 : 1, sole: 2.6 * u });
  }
  // Wings: arm and hand bones, membranes between finger spars.
  for (const [side, far] of [["far", true], ["near", false]] as const) {
    rig.bone("wing-" + side, "body", 10, -9, -150, 26);
    rig.bone("whand-" + side, "wing-" + side, 0, 26, 40, 30);
    const z = far ? .5 : 8, mem: RigRole = "membrane";
    rig.part("wmem-" + side, "wing-" + side, poly([[0, 0], [2, 26], [-14, 30], [-22, 14], [-10, 2]]), mem, z, { far });
    rig.part("warm-" + side, "wing-" + side, cap(27, 4.2, 3.2), far ? "scale-dark" : "scale", z + .2, { far });
    rig.part("wfan-" + side, "whand-" + side, poly([[0, -2], [6, 30], [-2, 22], [-8, 32], [-14, 18], [-22, 24], [-24, 6], [-16, -2]]), mem, z + .1, { far });
    rig.part("wspar-" + side, "whand-" + side, cap(30, 3, 1.4), far ? "scale-dark" : "scale", z + .3, { far });
  }
  // Neck chain and head with jaw.
  const neck: string[] = [];
  for (let i = 0; i < 4; i++) {
    const id = "neck-" + i;
    // An S-curve: the base rises up-forward, each later segment bends back toward level.
    rig.bone(id, i ? "neck-" + (i - 1) : "body", i ? 0 : 24, i ? 7 : -4, i ? 7 : -122, 7);
    neck.push(id);
    rig.part(id, id, cap(8, 8 - i * .9, 7 - i * .9), "scale", 5 + i * .01);
    rig.part(id + "-spine", id, poly([[-3.6, 1], [-7.6, 3.6], [-3.4, 5]]), "horn", 4.9);
  }
  rig.bone("head", "neck-3", 0, 7, 101);
  rig.part("head", "head", poly([[-6, -4], [2, -7], [12, -6], [20, -3], [22, 1], [10, 2], [-4, 4]]), "scale", 7);
  rig.part("horn-1", "head", poly([[-4, -5], [-14, -13], [-2, -7]]), "horn", 6.9);
  rig.part("horn-2", "head", poly([[1, -6], [-6, -16], [4, -7]]), "horn", 6.95);
  rig.part("eye", "head", ell(6, -3, 1.6, 1.3), "eye", 7.2, { variants: { shut: ell(6, -2.8, 2, .3) } });
  rig.part("brow", "head", poly([[3, -5.4], [10, -6.4], [9, -4.6]]), "detail", 7.25);
  rig.bone("jaw", "head", -2, 2, 0);
  rig.part("jaw", "jaw", poly([[-2, 0], [20, 0], [18, 3], [4, 5]]), "scale-dark", 6.8);
  rig.part("teeth", "jaw", poly([[6, 0], [7, -1.6], [8, 0], [11, 0], [12, -1.6], [13, 0], [16, 0], [17, -1.4], [18, 0]]), "horn", 6.85);
  rig.bone("mouth-tip", "head", 21, 0);
  // Tail chain with a spade.
  const tail: string[] = [];
  for (let i = 0; i < 7; i++) {
    const id = "tail-" + i;
    rig.bone(id, i ? "tail-" + (i - 1) : "body", i ? 0 : -24, i ? 8 : 0, i ? 0 : 100, 8);
    tail.push(id);
    rig.part(id, id, cap(9, 8 - i, Math.max(1.4, 7 - i)), "scale", 3 + i * .01);
    rig.part(id + "-spine", id, poly([[-3.4 + i * .3, 2], [-7.4 + i * .6, 4.4], [-3.2 + i * .3, 6]]), "horn", 2.9);
  }
  rig.part("spade", "tail-6", poly([[0, 6], [6, 10], [0, 18], [-6, 10]]), "membrane", 3.1);
  rig.drivers.push({ type: "variant", part: "eye", name: "shut", mode: "blink", interval: [80, 160], duration: 5 });
  if (fly) {
    for (const [side, ph] of [["near", 0], ["far", .04]] as const) rig.drivers.push({ type: "wing", shoulder: "wing-" + side, elbow: "whand-" + side, amplitude: 48, period: 34, phase: ph, fold: 46, bias: 6 });
    // Neck stretched forward in flight, head kept level.
    rig.track("neck-0", [{ frame: start, rotate: 30 }]);
    rig.track("head", [{ frame: start, rotate: -30 }]);
    for (const l of ["fore-near", "fore-far"]) { rig.track("up-" + l, [{ frame: start, rotate: -50 }]); rig.track("lo-" + l, [{ frame: start, rotate: 90 }]); }
    for (const l of ["hind-near", "hind-far"]) { rig.track("up-" + l, [{ frame: start, rotate: 60 }]); rig.track("lo-" + l, [{ frame: start, rotate: 40 }]); }
    rig.drivers.push({ type: "chain", bones: tail, amplitude: 9, period: 68, lag: .7, growth: 1.5, bias: -2 },
      { type: "chain", bones: neck, amplitude: 4, period: 68, lag: .6, phase: .3, follow: 4 },
      { type: "oscillate", bone: "body", property: "y", amplitude: 5 * u, period: 34, phase: .65 }, { type: "bank", amount: .7, max: 22 });
    const y = o.y ?? 0, from = o.from ?? 0, to = o.to ?? from + 900;
    // Flying: the root is the body; `y` is the flight height, with a slow swoop.
    return finish("dragon", "dragon", rig, [{ frame: start, x: from, y }, { frame: Math.round(start + (end - start) * .5), x: (from + to) / 2, y: y - 22 * u, ease: "ease-in-out-quad" }, { frame: end, x: to, y: y + 6 * u, ease: "ease-in-out-quad" }],
      palette, { x: -60 * u, y: -110 * u, width: 140 * u, height: 112 * u }, o);
  }
  // Grounded: wings folded along the back.
  for (const side of ["near", "far"]) { rig.track("wing-" + side, [{ frame: start, rotate: -86 }]); rig.track("whand-" + side, [{ frame: start, rotate: 150 }]); }
  rig.drivers.push({ type: "chain", bones: tail, amplitude: 6, period: 80, lag: .6, growth: 1.4, follow: 3 }, { type: "oscillate", bone: "body", property: "scaleY", amplitude: .012, period: 90 });
  if (m === "walk") rig.drivers.push({ type: "gait", body: "body", start, end, stride: 38 * u, stance: .66, lift: 5 * u, bob: 1.2 * u, legs: legs.map((l, i) => ({ ...l, phase: [0, .25, .5, .75][i] })),
    swing: [{ bone: "neck-0", amplitude: 3, phase: 0, harmonic: 2 }] });
  else rig.drivers.push({ type: "gait", body: "body", stride: 38 * u, legs: legs.map((l, i) => ({ ...l, phase: [0, .25, .5, .75][i] })) });
  if (m === "roar") {
    // Rear back, then lunge forward with the jaw open and a burst of fire.
    const t = (k: number) => Math.round(start + (end - start) * k);
    rig.track("neck-0", [{ frame: start, rotate: 0 }, { frame: t(.2), rotate: -18, ease: "ease-in-out-cubic" }, { frame: t(.3), rotate: 14, ease: "ease-out-back" }, { frame: t(.8), rotate: 12 }, { frame: end, rotate: 0 }]);
    rig.track("jaw", [{ frame: start, rotate: 0 }, { frame: t(.25), rotate: 6 }, { frame: t(.32), rotate: 30, ease: "ease-out-back" }, { frame: t(.8), rotate: 28 }, { frame: end, rotate: 0 }]);
    const puffs: string[] = [];
    // Fire: a stream of tongues (flame-shaped puffs) spat forward, swelling and lifting as they cool.
    const flame = poly([[-6, 0], [-3, -4], [2, -6], [8, -3], [12, 0], [8, 3], [2, 6], [-3, 4]]);
    for (let i = 0; i < 18; i++) { const id = "fire-" + i; rig.bone(id, "root", 0, 0); puffs.push(id); rig.part(id, id, flame, i % 4 === 0 ? "smoke" : "light", 9, { color: i % 4 === 0 ? "#f6d26b" : i % 2 ? "#f08a24" : "#e2502a" }); }
    rig.drivers.push({ type: "emitter", start: t(.32), end: t(.82), puffs, origin: "mouth-tip", every: 1, life: 18, velocity: [3.6 * u, -.25 * u], growth: 2.6, drift: 2.2 * u, ramp: 0 });
  }
  return finish("dragon", "dragon", rig, travel(o, start, end, "linear"), palette, { x: -60 * u, y: -80 * u, width: 140 * u, height: 82 * u }, o);
}

// ---- Fish ------------------------------------------------------------------------------------------------------------------------

/** A koi: a swimming wave runs down the body chain into the tail; fins paddle. */
export function fishRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 240) / 100, rig = new Rig(u), start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { scale: "#f0eee6", "scale-dark": "#d9d4c4", accent: "#e0582b", fin: "#f3c8a8", eye: "#1d1715", detail: "#1d1715" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("head", "root", 30, -30, 90);
  rig.part("head", "head", poly([[-12, 0], [-10, -12], [0, -20], [10, -12], [12, 0]]), "scale", 5);
  rig.part("cap-spot", "head", ell(0, -10, 6, 5), "accent", 5.1);
  rig.part("eye", "head", ell(-5, -11, 2, 2), "eye", 5.2);
  const body: string[] = [];
  const widths = [12, 11, 9, 6.5, 4];
  for (let i = 0; i < 5; i++) {
    const id = "body-" + i;
    rig.bone(id, i ? "body-" + (i - 1) : "head", 0, i ? 13 : 0, 0, 13);
    body.push(id);
    rig.part(id, id, poly([[-widths[i], 0], [widths[i], 0], [widths[i + 1] ?? 3, 14], [-(widths[i + 1] ?? 3), 14]]), "scale", 4 - i * .01);
    if (i === 1 || i === 3) rig.part(id + "-spot", id, ell(i === 1 ? 3 : -2, 6, 6 - i, 4), "accent", 4.05);
  }
  rig.part("tail", "body-4", poly([[0, 10], [14, 30], [4, 26], [0, 18], [-4, 26], [-14, 30]]), "fin", 3.5);
  rig.part("dorsal", "body-1", poly([[-12, 2], [-22, 10], [-12, 16]]), "fin", 3.4);
  rig.bone("pec", "body-0", 10, 4, -40, 10);
  rig.part("pec", "pec", poly([[0, 0], [6, 12], [-2, 10]]), "fin", 6);
  rig.drivers.push({ type: "chain", bones: body, amplitude: 9, period: 30, lag: .85, growth: 1.6 }, { type: "oscillate", bone: "pec", property: "rotate", amplitude: 22, period: 30 },
    { type: "oscillate", bone: "head", property: "rotate", amplitude: 3, period: 30, phase: .5 });
  return finish("fish", "fish", rig, travel(o, start, end, "linear"), palette, { x: -30 * u, y: -70 * u, width: 100 * u, height: 80 * u }, o);
}

// ---- Vehicles and machines -------------------------------------------------------------------------------------------------------

/** A steam locomotive: drivers roll by distance, coupling and main rods ride the crank pins, the crosshead slides,
 * smoke puffs are left behind as it moves. Length = `size`. */
export function locomotiveRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 600) / 100, rig = new Rig(u), start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { paint: "#24384f", "paint-dark": "#182638", metal: "#2a2a2e", "metal-dark": "#141416", brass: "#c9a24f", accent: "#c8342b", glass: "#f2d98a", smoke: "#e9e4d8", light: "#f2d98a", wood: "#6b4a2c" };
  const R = 8.5;
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, -R);
  // Body: frame, boiler, smokebox, chimney, dome, cab, cowcatcher, cylinder.
  rig.part("frame", "body", rect(-44, -2, 92, 4.6), "metal-dark", 3);
  rig.part("boiler", "body", rect(-18, -26, 54, 20, 9), "paint", 4);
  rig.part("bands", "body", { type: "path", d: "M-6 -26h1.6v20h-1.6z M8 -26h1.6v20h-1.6z M22 -26h1.6v20h-1.6z" }, "brass", 4.1);
  rig.part("smokebox", "body", rect(32, -27, 12, 22, 4), "metal", 4.2);
  rig.part("chimney", "body", poly([[36, -27], [42, -27], [43.5, -40], [34.5, -40]]), "metal", 4.3);
  rig.part("chimney-cap", "body", rect(33.5, -42, 11, 3, 1), "metal-dark", 4.4);
  rig.part("dome", "body", { type: "path", d: "M8 -26C8 -33 18 -33 18 -26Z" }, "brass", 4.3);
  rig.part("cab", "body", rect(-40, -38, 24, 34, 2), "paint-dark", 4.5);
  rig.part("cab-roof", "body", rect(-42, -40.5, 28, 4, 1.5), "metal-dark", 4.6);
  rig.part("cab-window", "body", rect(-35, -33, 12, 10, 2), "glass", 4.7);
  rig.part("stripe", "body", rect(-40, -9, 84, 2.2), "accent", 4.8);
  rig.part("cowcatcher", "body", poly([[44, -2], [52, 6.5], [44, 6.5]]), "accent", 4.9);
  rig.part("headlamp", "body", ell(46, -22, 2.6, 3), "light", 4.9);
  rig.part("cylinder", "body", rect(26, -3, 16, 9, 2.5), "metal", 5.5);
  // Drivers and leading wheels.
  const drivers = [-26, -6, 14], wheels: string[] = [];
  drivers.forEach((x, i) => {
    rig.bone("drv-" + i, "body", x, 0);
    wheels.push("drv-" + i);
    rig.part("drv-" + i, "drv-" + i, { type: "path", d: wheelPath(R, 12) }, "accent", 5);
    rig.part("cw-" + i, "drv-" + i, { type: "path", d: "M-5 -5A7 7 0 0 1 5 -5L3 -2.6A4 4 0 0 0 -3 -2.6Z" }, "metal", 5.1);
  });
  for (const [i, x] of [[0, 30], [1, 40]] as const) {
    rig.bone("lead-" + i, "body", x, R - 5);
    wheels.push("lead-" + i);
    rig.part("lead-" + i, "lead-" + i, { type: "path", d: wheelPath(5, 8) }, "accent", 5);
  }
  // Rods: coupling rod across the drivers' pins, main rod from the middle pin to the crosshead.
  rig.bone("coupling", "body", 0, 0, -90, 40);
  rig.part("coupling", "coupling", { type: "path", d: "M-1.4 0L1.4 0L1.4 40L-1.4 40Z M-2.4 -2.4h4.8v4.8h-4.8z M-2.4 17.6h4.8v4.8h-4.8z M-2.4 37.6h4.8v4.8h-4.8z" }, "metal", 6);
  rig.bone("mainrod", "body", 0, 0, -90, 30);
  rig.part("mainrod", "mainrod", cap(30, 3.2, 2.6), "metal", 6.2);
  rig.bone("crosshead", "body", 30, 0);
  rig.part("crosshead", "crosshead", rect(-3, -2.6, 6, 5.2, 1), "brass", 6.1);
  rig.part("piston", "crosshead", rect(0, -1, 14, 2), "metal-dark", 5.4);
  rig.drivers.push(
    { type: "wheel", bones: wheels.slice(0, 3), radius: R * u },
    { type: "wheel", bones: wheels.slice(3), radius: 5 * u },
    { type: "crank", wheel: "drv-0", rod: "coupling", radius: 5 * u, mode: "coupling" },
    { type: "crank", wheel: "drv-1", rod: "mainrod", radius: 5 * u, mode: "slide", length: 30 * u, slideY: -R * u + 1.5 * u, slider: "crosshead" },
    { type: "oscillate", bone: "body", property: "y", amplitude: .5 * u, period: 9, bySpeed: true, wobble: .4 },
  );
  const puffs: string[] = [];
  for (let i = 0; i < 10; i++) { const id = "puff-" + i; rig.bone(id, "root", 0, 0); puffs.push(id); rig.part(id, id, ell(0, 0, 5, 4.4), "smoke", 9); }
  rig.bone("stack", "body", 39, -42);
  rig.drivers.push({ type: "emitter", puffs, origin: "stack", every: 6, life: 58, velocity: [.15 * u, -.42 * u], growth: 2.6, drift: 1.4 * u });
  return finish("locomotive", "locomotive", rig, travel(o, start, end, "ease-in-out-quad"), palette, { x: -46 * u, y: -60 * u, width: 100 * u, height: 62 * u }, o);
}

/** A vintage car with spoked wheels, suspension that bounces with speed and a puff of exhaust. Length = `size`. */
export function carRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 380) / 100, rig = new Rig(u), start = o.start ?? 0, end = o.end ?? 180, R = 11;
  const palette: Partial<Record<RigRole, string>> = { paint: "#c8342b", "paint-dark": "#8f2219", metal: "#cfd2d4", "metal-dark": "#2a2a2e", rubber: "#1d1b1b", glass: "#bfd8e0", light: "#f2d98a", skin: "#d39b76", hair: "#2b211c", smoke: "#c9c4b6" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, -R - 2);
  rig.part("body", "body", { type: "path", d: "M-48 -4C-48 -12 -44 -16 -36 -16L-24 -16L-16 -34C-14 -38 -10 -40 -6 -40L16 -40C20 -40 22 -38 24 -34L30 -18L44 -16C50 -15 52 -10 52 -4L52 2C52 4 50 5 48 5L-46 5C-48 5 -48 4 -48 2Z" }, "paint", 4);
  rig.part("window-back", "body", { type: "path", d: "M-14 -18L-8 -34C-7 -36 -5 -37 -3 -37L4 -37L4 -18Z" }, "glass", 4.2);
  rig.part("window-front", "body", { type: "path", d: "M8 -37L15 -37C17 -37 19 -36 20 -34L26 -18L8 -18Z" }, "glass", 4.2);
  rig.part("mudguard-r", "body", { type: "path", d: "M-44 4A15 15 0 0 1 -16 4Z" }, "paint-dark", 5.2);
  rig.part("mudguard-f", "body", { type: "path", d: "M18 4A15 15 0 0 1 46 4Z" }, "paint-dark", 5.2);
  rig.part("bumper", "body", rect(48, 0, 7, 3, 1.4), "metal", 5.3);
  rig.part("lamp", "body", ell(49, -9, 2.6, 3), "light", 5.3);
  rig.part("handle", "body", rect(-2, -14, 6, 1.4, .6), "metal", 4.3);
  rig.bone("driver", "body", -2, -26);
  rig.part("driver-head", "driver", ell(0, 0, 6.4, 7), "skin", 4.1);
  rig.part("driver-cap", "driver", { type: "path", d: "M-7 -1C-7 -9 7 -9 7 -2L10 -1L-7 0Z" }, "hair", 4.15);
  const wheels: string[] = [];
  for (const [id, x] of [["wheel-r", -30], ["wheel-f", 32]] as const) {
    rig.bone(id, "root", x, -R);
    wheels.push(id);
    rig.part(id, id, { type: "path", d: wheelPath(R, 14, .26) }, "rubber", 5);
    rig.part(id + "-hub", id, ell(0, 0, 3.2, 3.2), "metal", 5.1);
  }
  rig.drivers.push({ type: "wheel", bones: wheels, radius: R * u },
    { type: "oscillate", bone: "body", property: "y", amplitude: 1.1 * u, period: 11, wobble: .6, bySpeed: true },
    { type: "oscillate", bone: "body", property: "rotate", amplitude: .8, period: 17, wobble: .5, bySpeed: true },
    { type: "oscillate", bone: "driver", property: "rotate", amplitude: 4, period: 48, wobble: .5 });
  const puffs: string[] = [];
  for (let i = 0; i < 6; i++) { const id = "puff-" + i; rig.bone(id, "root", 0, 0); puffs.push(id); rig.part(id, id, ell(0, 0, 3, 2.6), "smoke", 2); }
  rig.bone("exhaust", "body", -48, 2);
  rig.drivers.push({ type: "emitter", puffs, origin: "exhaust", every: 8, life: 40, velocity: [-.2 * u, -.18 * u], growth: 2, drift: .6 * u });
  return finish("car", "car", rig, travel(o, start, end, "ease-in-out-quad"), palette, { x: -50 * u, y: -56 * u, width: 108 * u, height: 58 * u }, o);
}

/** A propeller plane: the prop spins inside a motion-blur disc, the pilot's scarf ripples, the plane banks with its climb. */
export function planeRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 380) / 100, rig = new Rig(u), start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { paint: "#e2a62b", "paint-dark": "#b07c16", metal: "#3a3a3e", "metal-dark": "#1d1d20", glass: "#bfd8e0", skin: "#d39b76", cloth: "#c8342b", rubber: "#1d1b1b", accent: "#24384f", detail: "#1d1715" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, 0);
  rig.part("wing-far", "body", { type: "path", d: "M-8 -2L30 -6C34 -6 34 -2 30 -1L-8 2Z" }, "paint-dark", 2, { far: true });
  rig.part("fuselage", "body", { type: "path", d: "M-50 -6C-40 -8 -20 -12 0 -12L30 -12C38 -12 44 -8 46 -2C44 4 38 7 30 7L0 7C-20 7 -40 3 -50 0Z" }, "paint", 4);
  rig.part("tail-fin", "body", { type: "path", d: "M-50 -6L-56 -22C-56 -24 -53 -25 -51 -23L-38 -8Z" }, "paint", 3.9);
  rig.part("stabilizer", "body", { type: "path", d: "M-52 -2L-34 -3L-36 1L-52 1Z" }, "paint-dark", 4.1);
  rig.part("stripe", "body", { type: "path", d: "M-30 -4L34 -6L36 -2L-30 0Z" }, "accent", 4.2);
  rig.part("cowling", "body", { type: "path", d: "M38 -11C44 -10 48 -6 48 -2C48 2 44 6 38 7Z" }, "metal", 4.3);
  rig.part("wing", "body", { type: "path", d: "M-10 2L34 -2C38 -2 38 3 34 4L-10 6Z" }, "paint", 5);
  rig.part("cockpit", "body", { type: "path", d: "M2 -12C4 -18 12 -20 18 -12Z" }, "glass", 3.8);
  rig.bone("pilot", "body", 8, -14);
  rig.part("pilot-head", "pilot", ell(0, 0, 5.2, 5.6), "skin", 3.7);
  rig.part("goggles", "pilot", rect(-1, -2.6, 6.4, 2.6, 1.2), "metal-dark", 3.75);
  const scarf: string[] = [];
  for (let i = 0; i < 4; i++) { const id = "scarf-" + i; rig.bone(id, i ? "scarf-" + (i - 1) : "pilot", i ? 0 : -3, i ? 5 : 4, i ? 4 : 96, 5); scarf.push(id); rig.part(id, id, cap(6, 3.4 - i * .4, 3 - i * .4), "cloth", 3.6); }
  rig.bone("prop", "body", 49, -2);
  rig.part("prop-blur", "prop", ell(0, 0, 2.4, 19), "glass", 6, { color: "#e9e4d8" });
  rig.part("blade-a", "prop", ell(0, -9.5, 1.6, 9.5), "metal-dark", 6.1);
  rig.part("blade-b", "prop", ell(0, 9.5, 1.6, 9.5), "metal-dark", 6.1);
  rig.part("spinner", "prop", ell(1.4, 0, 3, 3), "accent", 6.2);
  rig.bone("gear", "body", 18, 7);
  rig.part("strut", "gear", rect(-1, 0, 2, 12), "metal", 3.5);
  rig.bone("tyre", "gear", 0, 13);
  rig.part("tyre", "tyre", { type: "path", d: wheelPath(4.6, 6, .3) }, "rubber", 3.6);
  // Spin in the blade plane: seen from the side, a turning prop foreshortens, so spin = squash the blades.
  rig.drivers.push({ type: "oscillate", bone: "prop", property: "scaleY", amplitude: .92, period: 3 },
    { type: "chain", bones: scarf, amplitude: 12, period: 10, lag: .9, growth: 1.4, bias: -6 },
    { type: "oscillate", bone: "body", property: "rotate", amplitude: 1.4, period: 70, wobble: .6 }, { type: "bank", amount: .9, max: 22 },
    { type: "oscillate", bone: "pilot", property: "rotate", amplitude: 3, period: 50, wobble: .5 });
  const y = o.y ?? 0, from = o.from ?? 0, to = o.to ?? from + 1000;
  // The root is the plane; `y` is its altitude: a climb, then a long glide down.
  return finish("plane", "plane", rig, [{ frame: start, x: from, y }, { frame: Math.round(start + (end - start) * .45), x: from + (to - from) * .45, y: y - 30 * u, ease: "ease-in-out-quad" }, { frame: end, x: to, y: y + 4 * u, ease: "ease-in-out-quad" }],
    palette, { x: -58 * u, y: -64 * u, width: 110 * u, height: 66 * u }, o);
}

/** A three-masted sailing ship: the hull rolls and heaves on the swell, sails breathe, pennants ripple. Length = `size`. */
export function shipRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 600) / 100, rig = new Rig(u), start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { wood: "#7a4a2c", "paint-dark": "#3a2416", paint: "#24384f", sail: "#efe6d2", rope: "#3a2416", accent: "#c8342b", brass: "#c9a24f", glass: "#f2d98a", metal: "#2a2a2e" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("hull", "root", 0, -4);
  rig.part("hull", "hull", { type: "path", d: "M-50 -10L46 -10C50 -10 52 -14 54 -18L56 -18C54 -6 46 6 34 8L-38 8C-46 6 -50 0 -52 -8Z" }, "wood", 4);
  rig.part("wale", "hull", { type: "path", d: "M-51 -6L52 -6L50 -3L-50 -3Z" }, "paint-dark", 4.1);
  rig.part("stripe", "hull", { type: "path", d: "M-48 -1L48 -1L45 2L-45 2Z" }, "paint", 4.15);
  rig.part("ports", "hull", { type: "path", d: "M-36 -1h4v2.4h-4z M-20 -1h4v2.4h-4z M-4 -1h4v2.4h-4z M12 -1h4v2.4h-4z M28 -1h4v2.4h-4z" }, "brass", 4.2);
  rig.part("stern", "hull", { type: "path", d: "M-52 -10L-52 -22L-40 -22L-38 -10Z" }, "wood", 3.9);
  rig.part("stern-window", "hull", rect(-49, -19, 7, 5, 1), "glass", 4);
  rig.part("bowsprit", "hull", { type: "path", d: "M50 -16L74 -26L74 -24L51 -13Z" }, "wood", 3.8);
  const masts: [string, number, number][] = [["fore", 28, 62], ["main", 0, 78], ["mizzen", -30, 56]];
  for (const [id, x, h] of masts) {
    rig.bone("mast-" + id, "hull", x, -10, 180, h);
    rig.part("mast-" + id, "mast-" + id, cap(h, 2.6, 1.8), "wood", 2);
    for (const [k, at, w] of [[0, .28, 30], [1, .62, 24]] as const) {
      const sail = `sail-${id}-${k}`;
      rig.bone(sail, "mast-" + id, 0, h * at, 180);
      rig.part(sail, sail, { type: "path", d: `M${-w / 2} 0L${w / 2} 0C${w / 2 + 3} ${h * .14} ${w / 2 + 2} ${h * .22} ${w / 2 - 1} ${h * .3}L${-w / 2 + 1} ${h * .3}C${-w / 2 + 2} ${h * .22} ${-w / 2 - 3} ${h * .14} ${-w / 2} 0Z` }, "sail", 5 + k * .1);
      rig.part(sail + "-yard", sail, rect(-w / 2 - 2, -1, w + 4, 2, .8), "wood", 5.2 + k * .1);
      rig.drivers.push({ type: "oscillate", bone: sail, property: "scaleX", amplitude: .05, period: 52, phase: k * .2 + x * .01, wobble: .5 });
    }
    const flag: string[] = [];
    for (let i = 0; i < 3; i++) { const fid = `flag-${id}-${i}`; rig.bone(fid, i ? `flag-${id}-${i - 1}` : "mast-" + id, i ? 0 : 0, i ? 4 : h, i ? 0 : -90, 4); flag.push(fid); rig.part(fid, fid, poly([[-1.6 + i * .3, 0], [1.6 - i * .3, 0], [1.3 - i * .3, 4.4], [-1.3 + i * .3, 4.4]]), "accent", 5.5); }
    rig.drivers.push({ type: "chain", bones: flag, amplitude: 14, period: 16, lag: 1, growth: 1.2, phase: x * .01 });
  }
  rig.part("rigging", "hull", { type: "path", d: "M50 -14L28 -72M-52 -20L-30 -66M28 -72L0 -88M0 -88L-30 -66" }, "rope", 1.5, { line: true, lineWidth: .5 });
  rig.drivers.push({ type: "oscillate", bone: "hull", property: "rotate", amplitude: 2.6, period: 90, wobble: .35 }, { type: "oscillate", bone: "hull", property: "y", amplitude: 2.4 * u, period: 70, phase: .3, wobble: .3 });
  return finish("ship", "ship", rig, travel(o, start, end, "linear"), palette, { x: -56 * u, y: -100 * u, width: 132 * u, height: 112 * u }, o);
}

/** A pendulum wall clock: the pendulum swings a seconds beat, the seconds hand ticks, hour and minute hands follow time keys. */
export function clockRig(o: RigPresetOptions & { time?: { frame: number; hours: number; ease?: EasingSpec }[] } = {}): RigSpec {
  const u = (o.size ?? 420) / 100, rig = new Rig(u), start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { wood: "#6b4128", "paint-dark": "#4a2b1a", face: "#f2ead6", detail: "#2a2320", brass: "#c9a24f", metal: "#2a2320", glass: "#d9e6ea", accent: "#c8342b" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("case", "root", 0, -50);
  rig.part("case", "case", { type: "path", d: "M-20 -46C-20 -54 -12 -60 0 -60C12 -60 20 -54 20 -46L20 44L-20 44Z" }, "wood", 2);
  rig.part("case-inset", "case", rect(-14, -6, 28, 46, 2), "paint-dark", 2.1);
  rig.part("window", "case", rect(-12, -4, 24, 42, 2), "glass", 2.2, { color: "#3b2a22" });
  rig.part("face", "case", ell(0, -38, 15.5, 15.5), "face", 4);
  rig.part("bezel", "case", { type: "path", d: "M-17 -38A17 17 0 1 0 17 -38A17 17 0 1 0 -17 -38ZM-15.5 -38A15.5 15.5 0 1 1 15.5 -38A15.5 15.5 0 1 1 -15.5 -38Z" }, "brass", 4.1);
  const ticks: string[] = [];
  for (let k = 0; k < 60; k++) {
    const a = k / 60 * Math.PI * 2, long = k % 5 === 0, r0 = long ? 11.6 : 13, r1 = 14.2, w = long ? .55 : .22, s = Math.sin(a), c = -Math.cos(a);
    ticks.push(`M${r2(s * r0 - c * w)} ${r2(-38 + c * r0 + s * w)}L${r2(s * r1 - c * w)} ${r2(-38 + c * r1 + s * w)}L${r2(s * r1 + c * w)} ${r2(-38 + c * r1 - s * w)}L${r2(s * r0 + c * w)} ${r2(-38 + c * r0 - s * w)}Z`);
  }
  rig.part("ticks", "case", { type: "path", d: ticks.join("") }, "detail", 4.2);
  for (const [id, len, w, role] of [["hour", 8.5, 1.2, "metal"], ["minute", 12, .8, "metal"], ["second", 12.6, .3, "accent"]] as const) {
    rig.bone(id, "case", 0, -38, 180, len);
    rig.part(id, id, poly([[-w, -2.4], [w, -2.4], [w * .6, len], [0, len + 1], [-w * .6, len]]), role, 5 + (id === "second" ? .2 : id === "minute" ? .1 : 0));
  }
  rig.part("arbor", "case", ell(0, -38, 1.3, 1.3), "brass", 5.4);
  rig.bone("pendulum", "case", 0, -14, 0, 44);
  rig.part("pendulum-rod", "pendulum", rect(-.5, 0, 1, 40), "brass", 2.5);
  rig.part("pendulum-bob", "pendulum", ell(0, 40, 6, 6), "brass", 2.6);
  const time = o.time ?? [{ frame: start, hours: 10 + 9 / 60 }, { frame: end, hours: 10 + 9 / 60 + (end - start) / 30 / 3600 }];
  rig.drivers.push({ type: "pendulum", bone: "pendulum", amplitude: 12, period: 60, start }, { type: "clock", hour: "hour", minute: "minute", second: "second", time, tick: { fps: 30 }, restAngles: { hour: 0, minute: 0, second: 0 } });
  return finish("clock", "clock", rig, travel({ ...o, to: o.from }, start, end), palette, { x: -22 * u, y: -112 * u, width: 44 * u, height: 112 * u }, o);
}

// ---- Catalogue -------------------------------------------------------------------------------------------------------------------

export interface RigPresetEntry { id: string; label: string; motions: readonly string[]; travels: (motion: string) => boolean; build: (o: RigPresetOptions) => RigSpec }
/** Every preset with its motions. `travels` says whether the motion moves across the scene. */
export const RIG_PRESETS: readonly RigPresetEntry[] = [
  { id: "person", label: "Person", motions: PERSON_MOTIONS, travels: m => m === "walk" || m === "run", build: personRig },
  { id: "dog", label: "Dog", motions: QUADRUPED_MOTIONS, travels: m => m !== "idle", build: o => quadrupedRig("dog", o) },
  { id: "horse", label: "Horse", motions: QUADRUPED_MOTIONS, travels: m => m !== "idle", build: o => quadrupedRig("horse", o) },
  { id: "cat", label: "Cat", motions: QUADRUPED_MOTIONS, travels: m => m !== "idle", build: o => quadrupedRig("cat", o) },
  { id: "bird", label: "Bird", motions: BIRD_MOTIONS, travels: m => m !== "perch", build: birdRig },
  { id: "dragon", label: "Dragon", motions: DRAGON_MOTIONS, travels: m => m !== "roar", build: dragonRig },
  { id: "fish", label: "Koi", motions: ["swim"], travels: () => true, build: fishRig },
  { id: "locomotive", label: "Steam locomotive", motions: ["run"], travels: () => true, build: locomotiveRig },
  { id: "car", label: "Vintage car", motions: ["drive"], travels: () => true, build: carRig },
  { id: "plane", label: "Propeller plane", motions: ["fly"], travels: () => true, build: planeRig },
  { id: "ship", label: "Sailing ship", motions: ["sail"], travels: () => true, build: shipRig },
  { id: "clock", label: "Pendulum clock", motions: ["tick"], travels: () => false, build: clockRig },
];
