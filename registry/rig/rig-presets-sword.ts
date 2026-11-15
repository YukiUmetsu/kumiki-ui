/**
 * RIG1 sword techniques for the person rig: a two-handed curved sword with a scabbard at the far hip.
 *
 * Each technique starts and ends in the middle guard (the sword at navel height, tip at throat height, near foot
 * forward), so they chain into a varied form. From reference:
 *   - the overhead cut (kendo's men): back-swing overhead, step in, forward swing in about two frames, dead stop;
 *     kendo biomechanics split the strike into a back-swing and a forward swing timed by the stepping foot;
 *   - the diagonal cut (kesa-giri): raised by the near shoulder, cutting down across the body to finish low in front;
 *   - the thrust: a lunge as in Muybridge's fencing plate (Wellcome, CC BY 4.0) — front shin vertical over the foot,
 *     rear leg straight, the hips dropping, arms reaching level at throat height;
 *   - the rising cut: from the low guard up and across to finish high in front;
 *   - the horizontal cut: the blade swings across the body in depth, so in profile it foreshortens, pointing at the
 *     camera half way (`sweep`, projected with the camera a little above);
 *   - the parry: the blade held level above the head to take a cut (Muybridge's high parries), then an answering cut;
 *   - the draw (iaido): draw-cut out of the scabbard while the far hand pulls the scabbard back, a two-handed finishing
 *     cut, a sharp flick of the blade (chiburi), and a slow resheathe (noto) with the far hand guiding the scabbard.
 * The swoosh on each cut is built from the blade tip's actual path.
 */
import { evaluateEasing } from "../motion/easing";
import type { EasingSpec } from "../motion/types";
import type { RigKey } from "./rig-spec";
import { Rig, ell, path, poly, rect } from "./rig-kit";
import type { Pt } from "./rig-kit";

export const SWORD_MOTIONS = ["sword", "sword-cut", "sword-slash", "sword-thrust", "sword-rise", "sword-sweep", "sword-parry", "sword-draw"] as const;
export type SwordMotion = (typeof SWORD_MOTIONS)[number];

type Steps = [number, number, number?][];
export interface SwordContext {
  u: number; start: number; end: number;
  plant: (from: number, to: number, keysF: Steps | null, keysB: Steps | null, ramp?: number) => void;
}
/** Sword pose: guard position (design units, root space), blade angle (0 = forward), length scale (foreshortening). */
interface SK { f: number; x: number; y: number; r: number; sx?: number; ease?: EasingSpec;
  /** How much the pose rides with the hips (1 for a sword seated in the scabbard worn on the far hip). */ seat?: number }
interface Tech {
  len: number; sword: SK[]; feetF: Steps; feetB: Steps;
  pelvis: { f: number; x: number; y: number; ease?: EasingSpec }[]; torso: { f: number; r: number; ease?: EasingSpec }[];
  cuts: [number, number][];
  /** Frames (relative) when the far hand holds the pommel; outside them it holds the scabbard mouth (drawing only). */
  pommel?: [number, number][];
  /** Scabbard poses relative to its rest on the hip (it rides with the hips). */
  scabbard?: { f: number; x: number; y: number; r: number; ease?: EasingSpec }[];
}
const RD = 180 / Math.PI;
const CH = { x: 19, y: -58.5, r: -30 }, FOOT_F = 7, FOOT_B = -7, PY = 2.4, BLADE = 36;
/** Scabbard at rest: its mouth at the front of the belt on the far hip, sloping back and a little down. */
const SAYA = { x: 8.5, y: -47, r: 168 };
const OUT = "ease-out-quad", IN = "ease-in-quad", IO = "ease-in-out-cubic";
const ch = (f: number, ease: EasingSpec = IO): SK => ({ f, ...CH, ease });

/** A horizontal swing in depth: θ = 180° blade back, 90° toward the camera, 0° forward; seen from a little above. */
function sweep(f: number, x: number, y: number, theta: number): SK {
  const t = theta / RD, dx = Math.cos(t), dy = Math.sin(t) * .42;
  return { f, x, y, r: Math.atan2(dy, dx) * RD, sx: Math.hypot(dx, dy), ease: "linear" };
}
const stepIn = (a: number, d: number, back: number, f = FOOT_F, b = FOOT_B, home = 0): { F: Steps; B: Steps } => ({
  F: [[a, f], [a + 2, f + d * .5, 2.4], [a + 4, f + d], ...(home ? [[home - 10, f + d], [home - 5, f + d * .5, 1.8], [home, f]] as Steps : [])],
  B: [[a + 4, b], [a + 8, b + back * .5, 1.2], [a + 12, b + back], ...(home ? [[home - 12, b + back], [home - 7, b + back * .5, 1.2], [home - 2, b]] as Steps : [])],
});

const TECH: Record<string, () => Tech> = {
  cut: () => {
    const s = stepIn(15, 8, 8, FOOT_F, FOOT_B, 46);
    return { len: 48, cuts: [[16, 19]], feetF: s.F, feetB: s.B,
      sword: [ch(0), { f: 12, x: 5, y: -95, r: -140, ease: IO }, { f: 15, x: 5, y: -96, r: -142 }, { f: 17, x: 15, y: -92, r: -84, ease: IN },
        { f: 19, x: 26, y: -68, r: 6, ease: OUT }, { f: 21, x: 25.4, y: -67.2, r: 3 }, { f: 32, x: 25, y: -67, r: 2 }, ch(46)],
      torso: [{ f: 0, r: 2 }, { f: 12, r: -6 }, { f: 19, r: 10, ease: OUT }, { f: 32, r: 7 }, { f: 46, r: 2 }],
      pelvis: [{ f: 15, x: 0, y: PY }, { f: 20, x: 6, y: 3.4, ease: OUT }, { f: 28, x: 5, y: 2.6 }, { f: 34, x: 5, y: 2.6 }, { f: 46, x: 0, y: PY }] };
  },
  slash: () => {
    const s = stepIn(13, 5, 4, FOOT_F, FOOT_B, 44);
    return { len: 46, cuts: [[14, 17]], feetF: s.F, feetB: s.B,
      sword: [ch(0), { f: 10, x: 9, y: -82, r: -115, ease: IO }, { f: 13, x: 9, y: -83, r: -118 }, { f: 15, x: 17, y: -80, r: -62, sx: .82, ease: IN },
        { f: 17, x: 22, y: -58, r: 40, ease: OUT }, { f: 19, x: 21.6, y: -57.4, r: 37 }, { f: 30, x: 21, y: -57, r: 36 }, ch(44)],
      torso: [{ f: 0, r: 2 }, { f: 10, r: -3 }, { f: 17, r: 16, ease: OUT }, { f: 30, r: 12 }, { f: 44, r: 2 }],
      pelvis: [{ f: 13, x: 0, y: PY }, { f: 17, x: 4, y: 4.2, ease: OUT }, { f: 30, x: 3.5, y: 3.6 }, { f: 44, x: 0, y: PY }] };
  },
  thrust: () => ({
    // Lunge: the front foot reaches far, the rear leg drives straight, the hips drop; recover back to guard.
    len: 32, cuts: [[6, 9]],
    feetF: [[4, FOOT_F], [7, 14, 3], [9, 21], [16, 21], [21, 14, 2.6], [26, FOOT_F]], feetB: [[4, FOOT_B]],
    sword: [ch(0), { f: 5, x: 16, y: -57, r: -14, ease: "ease-in-out-quad" }, { f: 9, x: 36, y: -66, r: -3, ease: OUT }, { f: 12, x: 36.5, y: -66.2, r: -3 },
      { f: 16, x: 34, y: -65, r: -4 }, ch(28)],
    torso: [{ f: 4, r: 2 }, { f: 9, r: 12, ease: OUT }, { f: 14, r: 11 }, { f: 28, r: 2 }],
    pelvis: [{ f: 4, x: 0, y: PY }, { f: 9, x: 9, y: 7, ease: OUT }, { f: 13, x: 9.4, y: 7.2 }, { f: 22, x: 1, y: 3 }, { f: 30, x: 0, y: PY }],
  }),
  rise: () => {
    const s = stepIn(11, 5, 5, FOOT_F, FOOT_B, 42);
    return { len: 44, cuts: [[12, 15]], feetF: s.F, feetB: s.B,
      sword: [ch(0), { f: 8, x: 15, y: -49, r: 38, ease: IO }, { f: 11, x: 15, y: -48, r: 40 }, { f: 13, x: 20, y: -64, r: -20, sx: .85, ease: IN },
        { f: 15, x: 21, y: -84, r: -78, ease: OUT }, { f: 17, x: 20.6, y: -84.6, r: -80 }, { f: 28, x: 20, y: -84, r: -78 }, ch(42)],
      torso: [{ f: 0, r: 2 }, { f: 8, r: 12 }, { f: 15, r: -4, ease: OUT }, { f: 28, r: -2 }, { f: 42, r: 2 }],
      pelvis: [{ f: 8, x: 0, y: 3.4 }, { f: 11, x: 0, y: 3.6 }, { f: 15, x: 5, y: 1.6, ease: OUT }, { f: 28, x: 4, y: 2 }, { f: 42, x: 0, y: PY }] };
  },
  sweep: () => {
    const s = stepIn(12, 5, 4, FOOT_F, FOOT_B, 44), sword: SK[] = [ch(0), { f: 9, x: 3, y: -58, r: 150, ease: IO }, { f: 12, x: 2.6, y: -58.4, r: 156 }];
    // Across the body in depth over four frames, then a short follow-through.
    for (let k = 0; k <= 7; k++) { const e = k <= 4 ? evaluateEasing("ease-in-out-quad", k / 4) : 1 + (k - 4) * .05; sword.push(sweep(13 + k, 3 + 21 * Math.min(e, 1.1), -60 - 4 * Math.min(e, 1), 180 - 190 * e)); }
    sword.push({ f: 30, x: 25, y: -64.4, r: sweep(0, 0, 0, -10).r, sx: 1 }, ch(44));
    return { len: 46, cuts: [[13, 17]], feetF: s.F, feetB: s.B, sword,
      torso: [{ f: 0, r: 2 }, { f: 9, r: -4 }, { f: 17, r: 12, ease: OUT }, { f: 30, r: 9 }, { f: 44, r: 2 }],
      pelvis: [{ f: 12, x: 0, y: 2.6 }, { f: 17, x: 5, y: 3.6, ease: OUT }, { f: 30, x: 4.5, y: 3.2 }, { f: 44, x: 0, y: PY }] };
  },
  parry: () => ({
    // Retreat a step and take the cut on a level blade above the head (it jolts), then answer with a cut.
    len: 46, cuts: [[15, 17]],
    feetF: [[0, FOOT_F], [3, 4, 1.8], [5, 1], [12, 1], [15, 8, 2.4], [17, 13], [32, 13], [37, 10, 2], [42, FOOT_F]],
    feetB: [[1, FOOT_B], [4, -10, 1.4], [6, -11], [17, -11], [21, -8, 1.2], [25, -6], [34, -6], [38, FOOT_B, 1]],
    sword: [ch(0), { f: 4, x: 12, y: -89.5, r: -6, ease: OUT }, { f: 7, x: 12, y: -89.9, r: -7 }, { f: 8, x: 11.4, y: -88.2, r: -3, ease: OUT }, { f: 10, x: 12, y: -89.7, r: -7 },
      { f: 13, x: 11, y: -91.5, r: -125, ease: IO }, { f: 15, x: 18, y: -88, r: -70, ease: IN }, { f: 17, x: 26, y: -68, r: 6, ease: OUT }, { f: 19, x: 25.4, y: -67.2, r: 3 },
      { f: 30, x: 25, y: -67, r: 2 }, ch(44)],
    torso: [{ f: 0, r: 2 }, { f: 4, r: 3 }, { f: 8, r: 1 }, { f: 12, r: 2 }, { f: 17, r: 10, ease: OUT }, { f: 30, r: 6 }, { f: 44, r: 2 }],
    pelvis: [{ f: 0, x: 0, y: PY }, { f: 5, x: -2, y: 3.4 }, { f: 9, x: -2.4, y: 4 }, { f: 12, x: -2, y: 3.2 }, { f: 17, x: 4, y: 3.6, ease: OUT }, { f: 30, x: 3, y: 3 }, { f: 44, x: 0, y: PY }],
  }),
};

/** Iaido: draw-cut, finishing cut, flick, resheathe. Starts and ends sheathed in guard stance, hand on the grip. */
function drawTech(): Tech {
  const sword: SK[] = [], scabbard: Tech["scabbard"] = [];
  const dirOf = (r: number): Pt => [Math.cos(r / RD), Math.sin(r / RD)];
  /** Sword seated `inside` units deep in a scabbard whose mouth is at (mx, my) and points along angle r. */
  const seated = (f: number, mx: number, my: number, r: number, inside: number, ease: EasingSpec = "linear"): SK => {
    const [dx, dy] = dirOf(r);
    return { f, x: mx + dx * (inside - BLADE), y: my + dy * (inside - BLADE), r, ease, seat: 1 };
  };
  const sheathed = (f: number) => seated(f, SAYA.x, SAYA.y, SAYA.r, BLADE);
  sword.push(sheathed(0), sheathed(8));
  scabbard.push({ f: 0, ...SAYA }, { f: 8, ...SAYA });
  // Draw: the sword slides out along the scabbard while the far hand pulls the scabbard back (saya-biki).
  for (let k = 1; k <= 8; k++) {
    const e = evaluateEasing("ease-in-quad", k / 8), mx = SAYA.x - 13 * e, my = SAYA.y + 1 * e, r = SAYA.r + 8 * e;
    sword.push(seated(8 + k, mx, my, r, BLADE * (1 - e)));
    scabbard.push({ f: 8 + k, x: mx, y: my, r, ease: "linear" });
  }
  // Draw-cut: one-handed, swinging across at chest height (foreshortened in depth), the arm reaching forward.
  const last = sword[sword.length - 1];
  for (let k = 1; k <= 5; k++) { const e = evaluateEasing("ease-out-quad", k / 5); sword.push({ ...sweep(16 + k, last.x + (28 - last.x) * e, last.y + (-68 - last.y) * e, (SAYA.r + 8) * (1 - e) - 4 * e), seat: 1 - e }); }
  sword.push({ f: 28, x: 28.4, y: -68.4, r: sweep(0, 0, 0, -4).r, sx: 1 });
  scabbard.push({ f: 24, x: SAYA.x - 13, y: SAYA.y + 1, r: SAYA.r + 8 }, { f: 32, ...SAYA, ease: IO });
  // Finishing cut with both hands.
  sword.push({ f: 38, x: 11, y: -93, r: -140, ease: IO }, { f: 40, x: 11, y: -93.6, r: -142 }, { f: 42, x: 19, y: -90, r: -84, ease: IN },
    { f: 44, x: 26, y: -68, r: 6, ease: OUT }, { f: 46, x: 25.4, y: -67.2, r: 3 }, { f: 56, x: 25, y: -67, r: 2 });
  // Chiburi: a small lift, then a sharp flick down and out to the side.
  sword.push({ f: 59, x: 25, y: -71, r: -2, ease: IO }, { f: 61, x: 23, y: -60, r: 30, ease: OUT }, { f: 66, x: 22.6, y: -59.6, r: 31 });
  // Noto: the far hand brings the scabbard forward and tilts it; the blade's tip finds the mouth, then slides home
  // slowly while the scabbard returns to the hip.
  const ENTRY = { x: SAYA.x + 4, y: SAYA.y - 1.5, r: 150 };
  sword.push(seated(72, ENTRY.x, ENTRY.y, ENTRY.r, 20, IO));
  scabbard.push({ f: 62, ...SAYA }, { f: 72, ...ENTRY, ease: IO });
  for (let k = 1; k <= 14; k++) {
    const e = evaluateEasing("ease-in-out-cubic", k / 14), mx = ENTRY.x + (SAYA.x - ENTRY.x) * e, my = ENTRY.y + (SAYA.y - ENTRY.y) * e, r = ENTRY.r + (SAYA.r - ENTRY.r) * e;
    sword.push(seated(72 + k, mx, my, r, 20 + (BLADE - 20) * e));
    scabbard.push({ f: 72 + k, x: mx, y: my, r, ease: "linear" });
  }
  sword.push(sheathed(96));
  scabbard.push({ f: 96, ...SAYA });
  return {
    len: 98, cuts: [[17, 21], [42, 44]], sword, scabbard, pommel: [[30, 58]],
    feetF: [[10, FOOT_F], [13, 11, 2.4], [16, 15], [40, 15], [43, 19, 2.4], [45, 22], [84, 22], [88, 15, 2.2], [92, FOOT_F]],
    feetB: [[16, FOOT_B], [20, -3, 1.2], [24, 1], [44, 1], [48, 5, 1.2], [52, 8], [84, 8], [89, 1, 1.2], [94, FOOT_B]],
    torso: [{ f: 0, r: 4 }, { f: 12, r: 8 }, { f: 21, r: 14, ease: OUT }, { f: 32, r: 8 }, { f: 38, r: -4 }, { f: 44, r: 10, ease: OUT }, { f: 56, r: 7 }, { f: 72, r: 10 }, { f: 86, r: 6 }, { f: 96, r: 4 }],
    pelvis: [{ f: 0, x: 0, y: PY }, { f: 16, x: 5, y: 4.2 }, { f: 22, x: 7, y: 4.4, ease: OUT }, { f: 40, x: 7, y: 3.4 }, { f: 45, x: 13, y: 4, ease: OUT }, { f: 84, x: 12.6, y: 3.4 },
      { f: 94, x: 0, y: PY, ease: IO }],
  };
}

/** Sample a list of sword poses at frame f the way RIG tracks interpolate (eased per segment, default cubic in-out). */
function sample(keys: SK[], f: number): { x: number; y: number; r: number; sx: number } {
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (keys[i].f <= f && keys[i + 1].f >= f) { a = keys[i]; b = keys[i + 1]; break; }
  const t = b.f === a.f ? 1 : evaluateEasing(b.ease ?? IO, Math.min(1, Math.max(0, (f - a.f) / (b.f - a.f))));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, r: a.r + (b.r - a.r) * t, sx: (a.sx ?? 1) + ((b.sx ?? 1) - (a.sx ?? 1)) * t };
}

/** Time-compress everything after a technique's last cut by `k` (cuts and their lead-up keep their speed). */
function hurry(t: Tech, k: number): Tech {
  const pivot = Math.max(...t.cuts.map(c => c[1]));
  const w = (f: number) => (f <= pivot ? f : Math.round(pivot + (f - pivot) * k));
  const dedupe = <T,>(xs: T[], fr: (x: T) => number) => xs.filter((x, i) => i === 0 || fr(x) > fr(xs[i - 1]));
  return { ...t, len: w(t.len),
    sword: dedupe(t.sword.map(s => ({ ...s, f: w(s.f) })), s => s.f),
    feetF: dedupe(t.feetF.map(([f, x, l]) => [w(f), x, l] as [number, number, number?]), s => s[0]),
    feetB: dedupe(t.feetB.map(([f, x, l]) => [w(f), x, l] as [number, number, number?]), s => s[0]),
    pelvis: dedupe(t.pelvis.map(p => ({ ...p, f: w(p.f) })), p => p.f), torso: dedupe(t.torso.map(p => ({ ...p, f: w(p.f) })), p => p.f) };
}

/** Which techniques a motion plays, in order (repeated to fill the window). */
const PLAN: Record<SwordMotion, string[]> = {
  sword: ["cut", "slash", "thrust", "sweep", "rise", "parry"],
  "sword-cut": ["cut"], "sword-slash": ["slash"], "sword-thrust": ["thrust"], "sword-rise": ["rise"], "sword-sweep": ["sweep"], "sword-parry": ["parry"], "sword-draw": ["draw"],
};

export function addSwordAction(rig: Rig, m: SwordMotion, c: SwordContext): void {
  const { u, start, end, plant } = c;
  // Katana: a gently curved blade (about a centimetre of curve over its length, shared with the scabbard) with a pale edge, guard, wrapped grip, pommel. Bone at the guard; +x along the blade.
  rig.bone("sword", "root", 0, 0);
  rig.part("sword-blade", "sword", path("M1 -.62Q18 -.95 35.2 -1.75Q36.8 -1.5 36 -.85Q18 .3 1 .55Z"), "metal", 6.4, { color: "#cfd5db" });
  rig.part("sword-edge", "sword", path("M1.4 .2Q18 .05 35.6 -1.05"), "light", 6.41, { line: true, lineWidth: .3, color: "#f4f7f9" });
  rig.part("sword-guard", "sword", ell(.4, 0, .55, 1.9), "metal-dark", 6.47);
  rig.part("sword-handle", "sword", rect(-10.6, -.78, 10.6, 1.56, .5), "cloth-dark", 6.46);
  rig.part("sword-wrap", "sword", path("M-9.6 -.7L-8.4 .7M-8.4 -.7L-9.6 .7M-7.2 -.7L-6 .7M-6 -.7L-7.2 .7M-4.8 -.7L-3.6 .7M-3.6 -.7L-4.8 .7M-2.4 -.7L-1.2 .7M-1.2 -.7L-2.4 .7"), "light", 6.465, { line: true, lineWidth: .22, color: "#cfc7b3" });
  rig.part("sword-pommel", "sword", rect(-11.2, -.85, .9, 1.7, .3), "metal-dark", 6.47);
  rig.bone("sword-pommel", "sword", -8.6, 0);
  // Scabbard on the far hip: lacquered, with a mouth fitting and an end cap; drawn over the blade so a sheathed blade hides.
  rig.bone("saya", "root", 0, 0);
  rig.part("saya", "saya", path("M0 -1.6Q18 -1.95 37.4 -2.6Q38.6 -1.9 38 -.8Q18 1.15 0 1.6Z"), "paint-dark", 6.44, { color: "#2a1f1c" });
  rig.part("saya-mouth", "saya", rect(-.2, -1.7, 1.8, 3.4, .3), "metal-dark", 6.445, { color: "#8a7350" });
  rig.part("saya-end", "saya", path("M36.4 -2.5Q38.8 -2.4 38.2 -.9L36.2 -.8Z"), "metal-dark", 6.445, { color: "#8a7350" });
  rig.part("saya-cord", "saya", path("M4.4 -1.2Q5.4 2.4 3.2 4.6"), "detail", 6.446, { line: true, lineWidth: .35, color: "#5a2f3a" });
  rig.bone("saya-grip", "saya", 2.4, 0);

  // Lay the plan out over the window: a short guard hold before each technique.
  const plan = PLAN[m], swordK: SK[] = [], sayaK: NonNullable<Tech["scabbard"]> = [], torso: RigKey[] = [], pelvis: RigKey[] = [];
  const feetF: Steps = [[start, 2.2], [start + 6, FOOT_F, 2]], feetB: Steps = [[start, -1.4], [start + 8, FOOT_B, 1.6]];
  const cuts: [number, number][] = [], pommel: [number, number][] = [];
  const draw = m === "sword-draw";
  // A sheathed sword rides the hips as they settle into the stance (same keys and easing as the pelvis).
  const seated0 = drawTech().sword[0];
  swordK.push(...(draw ? [{ ...seated0, f: start, ease: undefined }, { ...seated0, f: start + 8, ease: IO }] as SK[] : [{ f: start, ...CH }]));
  let b = start + 12, k = 0;
  while (true) {
    const name = plan[k % plan.length], raw = name === "draw" ? drawTech() : TECH[name]();
    // In the varied form, recoveries after each cut are quicker (the next technique follows on), so more fit.
    const tech = m === "sword" ? hurry(raw, .62) : raw;
    if (b + tech.len > end - 4) break;
    for (const s of tech.sword) swordK.push({ ...s, f: b + s.f });
    for (const s of tech.scabbard ?? []) sayaK.push({ ...s, f: b + s.f });
    for (const t of tech.torso) torso.push({ frame: b + t.f, rotate: t.r, ease: t.ease });
    for (const p of tech.pelvis) pelvis.push({ frame: b + p.f, x: p.x * u, y: p.y * u, ease: p.ease });
    for (const [f, x, l] of tech.feetF) feetF.push([b + f, x, l]);
    for (const [f, x, l] of tech.feetB) feetB.push([b + f, x, l]);
    for (const [c0, c1] of tech.cuts) cuts.push([b + c0, b + c1]);
    for (const [s0, s1] of tech.pommel ?? []) pommel.push([b + s0, b + s1]);
    b += tech.len + (draw ? 14 : m === "sword" ? 4 : 6); k++;
  }
  const order = <T extends { f: number }>(keys: T[]) => keys.sort((p, q) => p.f - q.f).filter((q, i, all) => i === 0 || q.f > all[i - 1].f);
  // The scabbard and a seated sword ride with the hips: add the pelvis offset (design units) at each frame.
  const pel = order<SK>([{ f: start, x: 0, y: 0, r: 0 }, { f: start + 8, x: 0, y: PY, r: 0, ease: IO }, ...pelvis.map(p => ({ f: p.frame, x: (p.x ?? 0) / u, y: (p.y ?? 0) / u, r: 0, ease: p.ease }))]);
  const sw = order(swordK).map(q => { if (!q.seat) return q; const o = sample(pel, q.f); return { ...q, x: q.x + o.x * q.seat, y: q.y + o.y * q.seat }; });
  rig.track("sword", sw.map(q => ({ frame: q.f, x: q.x * u, y: q.y * u, rotate: q.r, scaleX: q.sx ?? 1, ease: q.ease })));
  const sy = order<SK>([{ f: start, ...SAYA }, ...sayaK]), sayaTrack: RigKey[] = [];
  for (let f = start; f <= end; f += 2) { const o = sample(pel, f), p = sample(sy, f); sayaTrack.push({ frame: f, x: (p.x + o.x) * u, y: (p.y + o.y) * u, rotate: p.r, ease: "linear" }); }
  rig.track("saya", sayaTrack);
  if (torso.length) rig.track("torso", [{ frame: start, rotate: 0 }, ...torso]);
  rig.track("pelvis", pel.map(p => ({ frame: p.f, x: p.x * u, y: p.y * u, ease: p.ease })));
  /** Feet keys must increase; a technique's first key can coincide with the guard key before it. */
  const inc = (s: Steps) => s.sort((p, q) => p[0] - q[0]).filter((q, i, all) => i === 0 || q[0] > all[i - 1][0]);
  plant(start, end, inc(feetF), inc(feetB), 0);
  // Swooshes: the band swept between the tip and two-thirds of the blade over each cut, flashing as the blade passes.
  cuts.forEach(([c0, c1], i) => {
    const id = "trail-" + i, outer: Pt[] = [], inner: Pt[] = [];
    for (let s = 0; s <= 10; s++) {
      const f = c0 + (c1 - c0) * s / 10, p = sample(sw, f), cr = Math.cos(p.r / RD), sr = Math.sin(p.r / RD);
      const at = (x: number, y: number): Pt => [p.x + (x * p.sx) * cr - y * sr, p.y + (x * p.sx) * sr + y * cr];
      outer.push(at(BLADE, -1.3)); inner.push(at(BLADE * .8, -.9));
    }
    rig.bone(id, "root", 0, 0);
    rig.part(id, id, poly([...outer, ...inner.reverse()]), "light", 6.35, { color: "#eef2f5" });
    rig.track(id, [{ frame: start, opacity: 0 }, { frame: c0, opacity: 0 }, { frame: c0 + 1, opacity: .45, ease: "linear" }, { frame: c1, opacity: .35, ease: "linear" }, { frame: c1 + 2, opacity: 0, ease: "linear" }]);
  });
  // Hands: the near hand on the grip throughout; the far hand on the pommel, or on the scabbard mouth while drawing
  // and resheathing.
  const reach = (side: "f" | "b", from: number, to: number, follow: string, ramp: number) =>
    rig.drivers.push({ type: "reach", start: from, end: to, ramp, upper: "arm-" + side, lower: "fore-" + side, bend: -1, follow, offset: [0, 0] });
  reach("f", start, end + 60, "sword", 0);
  reach("b", start, end + 60, draw ? "saya-grip" : "sword-pommel", 0);
  for (const [s0, s1] of pommel) reach("b", s0 - 3, s1 + 3, "sword-pommel", 4);
  rig.drivers.push({ type: "variant", part: "hand-f", mode: "keys", keys: [{ frame: start, name: "fist" }] },
    { type: "variant", part: "hand-b", mode: "keys", keys: [{ frame: start, name: "fist" }] });
}
