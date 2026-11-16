/**
 * ANIM1 flight: how each bird flies. Its record gives the wing (planform, tip, how much of it is hand), the wingbeat
 * (stroke, timing, folding), the flight style (steady flapping, flap-and-glide, bounding, bursts), and how the neck
 * and legs are carried. `poseAnimal(c, { flight, t })` builds the open wings on the species' construction, and
 * `flightAt(id, seconds)` turns time into the right beat or glide.
 *
 * Sources:
 * - The wingbeat comes from Muybridge, *Animal Locomotion* (1887): plate 755, a pigeon, and plate 769, an eagle, read
 *   frame by frame. At the top of the stroke the spread wing rises high with the tips curved back. On the downstroke
 *   it sweeps down and forward, the tips reaching ahead of the head at the bottom. On the upstroke it is flexed narrow
 *   at the wrist, the hand trailing. Muybridge's birds were taking off or flying slowly, so cruising strokes are set
 *   shallower.
 * - Wing shapes and flight styles come from Wikipedia, *Bird flight*:
 *   - elliptical wings for small birds, Accipiter hawks and pheasants;
 *   - short pointed high-speed wings for most ducks;
 *   - slotted soaring wings for large land birds;
 *   - bounding flight for small birds;
 *   - the upstroke "slightly folded inwards".
 * - Neck and legs come from Wikipedia, *Heron* and *Crane*: herons fly with the neck "retracted", legs pointing
 *   backwards; cranes fly with the legs outstretched and the neck extended.
 * - Wingbeat frequency is Pennycuick's (1990) prediction for steady cruising flight, from mass, span and wing area.
 */
import type { FoundationReference, Range } from "./foundation-shapes";
import { commons as C, range as r, smoothstep } from "./foundation-shapes";
import type { AnimalSpecies } from "./animal-species";
import { findAnimal } from "./animal-species";

export type WingShape = "elliptical" | "high-speed" | "high-aspect" | "slotted-soaring";
export type FlightStyle = "flapping" | "flap-glide" | "bounding" | "burst-glide";

export interface BirdFlight {
  /** Planform type (Wikipedia, Bird flight). */
  wing: WingShape;
  /** Aspect ratio, span² ÷ wing area. */
  aspect: Range;
  /** The hand's share of the half-span (wrist to tip). */
  hand: number;
  /** Separated primary tips ("fingers"); 0 for a closed tip. */
  fingers: number;
  tip: "pointed" | "rounded" | "fingered";
  /** Wing elevation at the top and the bottom of a cruising stroke, degrees above level. */
  stroke: { top: number; bottom: number };
  /** Share of the beat spent on the downstroke. */
  downShare: number;
  /** How far the wing folds at mid-upstroke (0 none … 1 wrist fully flexed). */
  fold: number;
  style: FlightStyle;
  /** For flap-and-glide, bounding and bursts: wingbeats per burst and the pause (seconds) that follows. */
  burst?: { beats: readonly [number, number]; pause: readonly [number, number] };
  /** Glide: wing elevation (+ raised, − bowed) and how far the hand droops below the arm. */
  glide: { dihedral: number; handDroop: number };
  neck: "extended" | "retracted";
  legs: "tucked" | "trailing";
  /** Grades for the qualitative traits (reported where Wikipedia says so) and the kinematics (estimated). */
  notes: readonly string[];
  references: readonly FoundationReference[];
}

const est = (min: number, typical: number, max: number, source?: string) => r(min, typical, max, "estimated", source);
const MUYBRIDGE_PIGEON: FoundationReference = { title: "Muybridge, Animal Locomotion pl. 755: pigeon flying", url: C("Pigeon_flying_(rbm-QP301M8-1887-755).jpg"), rights: "public-domain", kind: "motion" };
const MUYBRIDGE_EAGLE: FoundationReference = { title: "Muybridge, Animal Locomotion pl. 769: eagle flying", url: C("American_eagle_flying_(rbm-QP301M8-1887-769).jpg"), rights: "public-domain", kind: "motion" };
const REFS = [MUYBRIDGE_PIGEON, MUYBRIDGE_EAGLE];

/** Flight per species, by id. */
export const BIRD_FLIGHT: Readonly<Record<string, BirdFlight>> = {
  "red-crowned-crane": {
    wing: "slotted-soaring", aspect: est(7, 7.5, 8.5), hand: .5, fingers: 6, tip: "fingered", stroke: { top: 40, bottom: -40 }, downShare: .55, fold: .3,
    style: "flapping", glide: { dihedral: 0, handDroop: 8 }, neck: "extended", legs: "trailing",
    notes: ["Neck stretched out and legs trailing (reported: Wikipedia, Crane).", "Slow deep beats on long slotted wings; the white primaries spread like fingers and the black secondaries edge the inner wing."],
    references: REFS,
  },
  "grey-heron": {
    wing: "slotted-soaring", aspect: est(7, 8, 9), hand: .5, fingers: 3, tip: "rounded", stroke: { top: 35, bottom: -45 }, downShare: .55, fold: .3,
    style: "flapping", glide: { dihedral: -5, handDroop: 10 }, neck: "retracted", legs: "trailing",
    notes: ["The neck drawn back in an S and the legs pointing backwards (reported: Wikipedia, Heron).", "Slow, deep, bowed wingbeats on broad rounded wings."],
    references: REFS,
  },
  "large-billed-crow": {
    wing: "elliptical", aspect: est(5.5, 6.2, 7), hand: .5, fingers: 5, tip: "fingered", stroke: { top: 50, bottom: -40 }, downShare: .5, fold: .45,
    style: "flapping", glide: { dihedral: 3, handDroop: 0 }, neck: "extended", legs: "tucked",
    notes: ["Steady rowing wingbeats, slower and more deliberate than a rook's (reported for the carrion crow: Wikipedia).", "Five fingered primaries at the tip."],
    references: REFS,
  },
  "green-pheasant": {
    wing: "elliptical", aspect: est(4, 4.6, 5.2), hand: .45, fingers: 0, tip: "rounded", stroke: { top: 60, bottom: -45 }, downShare: .5, fold: .4,
    style: "burst-glide", burst: { beats: [8, 14], pause: [1, 3] }, glide: { dihedral: -2, handDroop: 5 }, neck: "extended", legs: "tucked",
    notes: ["Bursts upward on whirring wings when flushed and prefers to run (reported: Wikipedia, Common pheasant); then glides on bowed wings (estimated).", "Short broad elliptical wings (reported: Wikipedia, Bird flight)."],
    references: REFS,
  },
  "eurasian-tree-sparrow": {
    wing: "elliptical", aspect: est(4.5, 5, 5.5), hand: .55, fingers: 0, tip: "rounded", stroke: { top: 70, bottom: -40 }, downShare: .5, fold: .8,
    style: "bounding", burst: { beats: [3, 6], pause: [.08, .15] }, glide: { dihedral: 0, handDroop: 0 }, neck: "extended", legs: "tucked",
    notes: ["Bounding flight: short bursts of flapping between wings folded against the body (reported for small birds: Wikipedia, Bird flight).", "The wrist flexes deeply on each upstroke (Muybridge's pigeon)."],
    references: REFS,
  },
  "eurasian-goshawk": {
    wing: "elliptical", aspect: est(5, 5.6, 6.2), hand: .45, fingers: 5, tip: "fingered", stroke: { top: 50, bottom: -40 }, downShare: .5, fold: .5,
    style: "flap-glide", burst: { beats: [3, 6], pause: [1, 2] }, glide: { dihedral: 2, handDroop: 0 }, neck: "extended", legs: "tucked",
    notes: ["Accipiter wings: short, broad and elliptical for flying through woods (reported: Wikipedia, Bird flight).", "A few quick beats, then a glide (estimated)."],
    references: REFS,
  },
  "mandarin-duck": {
    wing: "high-speed", aspect: est(7, 8, 9), hand: .55, fingers: 0, tip: "pointed", stroke: { top: 45, bottom: -40 }, downShare: .5, fold: .35,
    style: "flapping", glide: { dihedral: 0, handDroop: 0 }, neck: "extended", legs: "tucked",
    notes: ["Short pointed high-speed wings (reported for most ducks: Wikipedia, Bird flight).", "Fast continuous wingbeats, neck stretched out."],
    references: REFS,
  },
  "common-kingfisher": {
    wing: "elliptical", aspect: est(5, 5.5, 6), hand: .5, fingers: 0, tip: "rounded", stroke: { top: 55, bottom: -45 }, downShare: .5, fold: .55,
    style: "flapping", glide: { dihedral: 0, handDroop: 0 }, neck: "extended", legs: "tucked",
    notes: ["Fast, direct and usually low over water; the short rounded wings whirr rapidly (reported: Wikipedia, Common kingfisher)."],
    references: REFS,
  },
};

/** A species' flight record, if it flies. */
export const birdFlight = (sp: string | AnimalSpecies): BirdFlight | undefined => BIRD_FLIGHT[typeof sp === "string" ? sp : sp.id];

/**
 * Wingbeat frequency in steady cruising flight (Hz), Pennycuick (1990):
 * f = 1.08 · m^(1/3) · g^(1/2) · b^(−1) · S^(−1/4) · ρ^(−1/3), with m in kg, b the span and S the wing area in metres, sea-level air.
 * The wing area comes from the span and the aspect ratio.
 */
export function wingbeatHz(massKg: number, spanM: number, aspect: number, rho = 1.225): number {
  const S = spanM * spanM / aspect;
  return 1.08 * Math.cbrt(massKg) * Math.sqrt(9.81) / spanM / Math.pow(S, .25) / Math.cbrt(rho);
}

/** A species' predicted wingbeat (Hz), from its typical mass, span and aspect ratio. */
export function speciesWingbeat(sp: string | AnimalSpecies): number | undefined {
  const s = typeof sp === "string" ? findAnimal(sp) : sp, f = s && birdFlight(s);
  if (!s || !f || !s.size.wingspan) return undefined;
  return wingbeatHz(s.size.mass.typical, s.size.wingspan.typical / 100, f.aspect.typical);
}

/** Where the wing is at `t` (0–1 through one beat, 0 at the top of the stroke). */
export interface WingStroke {
  /** Arm elevation, degrees above level. */
  elevation: number;
  /** The hand's extra bend at the wrist (+ up): it trails the arm, up on the downstroke and down on the upstroke. */
  hand: number;
  /** Fold, 0 open … 1 fully flexed. */
  fold: number;
  /** Forward sweep of the whole wing (degrees): the tips reach forward on the downstroke. */
  sweep: number;
}

/** The wing's position through a beat, from the species' stroke. */
export function wingStroke(f: BirdFlight, t: number): WingStroke {
  const u = ((t % 1) + 1) % 1, D = f.downShare, { top, bottom } = f.stroke;
  if (u < D) {
    const p = u / D, k = (1 - Math.cos(Math.PI * p)) / 2;
    return { elevation: top + (bottom - top) * k, hand: 14 * Math.sin(Math.PI * p), fold: 0, sweep: 14 * Math.sin(Math.PI * p) };
  }
  const p = (u - D) / (1 - D), k = (1 - Math.cos(Math.PI * p)) / 2;
  return { elevation: bottom + (top - bottom) * k, hand: -22 * Math.sin(Math.PI * p), fold: f.fold * Math.sin(Math.PI * Math.min(1, p * 1.15)), sweep: -6 * Math.sin(Math.PI * p) };
}

/** The glide: the wing held out at its dihedral, the hand drooped. */
export const glideStroke = (f: BirdFlight): WingStroke => ({ elevation: f.glide.dihedral, hand: -f.glide.handDroop, fold: 0, sweep: 0 });
/** Blend two wing positions (k 0 → a, 1 → b). */
export const mixStroke = (a: WingStroke, b: WingStroke, k: number): WingStroke => ({
  elevation: a.elevation + (b.elevation - a.elevation) * k, hand: a.hand + (b.hand - a.hand) * k, fold: a.fold + (b.fold - a.fold) * k,
  sweep: a.sweep + (b.sweep - a.sweep) * k,
});

/**
 * Where a planform point lies on the closed wing, folded along the flank in the side view: the span runs back from the
 * shoulder over the rump (the primaries reach past the tail root) and the chord becomes the folded wing's depth,
 * deepest at the shoulder. A rigid planform cannot fold this way (the forearm doubles back under the hand), so a
 * closing wing blends toward these positions.
 */
export function foldedPoint(q: PlanformPoint, p: WingPlanform, shoulder: readonly [number, number], bodyLength: number, bodyDepth: number, far: boolean): [number, number] {
  const along = Math.min(1, Math.max(0, q.S / p.semispan)), chord = Math.max(...p.outline.map(o => -o.X)) || 1;
  const depth = Math.min(1.1, Math.max(0, -q.X / chord));
  return [shoulder[0] + bodyLength * (.08 - .95 * along), shoulder[1] - depth * bodyDepth * .55 * (1 - along * .55) + (far ? bodyDepth * .12 : 0)];
}

export type FlightMode = "flap" | "glide" | "closed";

/** Seconds to ease from the top of the stroke into a held wing (glide or closed), and back out before the next burst. */
const HOLD_IN = .25, HOLD_OUT = .2;

/**
 * What a bird's wings are doing `seconds` into a flight: the beat phase while flapping, or a held wing (a glide, or
 * closed while bounding) with `amount` easing in from and out to the top of the stroke. Bursts end at the top of the
 * stroke, so flapping and holding join without a jump. Bursts and pauses repeat with deterministic lengths from
 * `seed`, so a flock's birds can differ.
 *
 * `maxHz` caps the drawn wingbeat. A sparrow beats about 14 times a second, which at 30 fps leaves two frames per beat
 * and reads as noise. Animators show at least four frames per beat (30 fps → 7.5 Hz) and let the wings blur: a
 * drawing convention, not anatomy.
 */
export function flightAt(sp: string | AnimalSpecies, seconds: number, seed = 1, maxHz = Infinity): { flight: FlightMode; t: number; amount: number; hz: number } {
  const f = birdFlight(sp), hz = Math.min(maxHz, speciesWingbeat(sp) ?? 4);
  if (!f) return { flight: "flap", t: 0, amount: 0, hz };
  if (f.style === "flapping" || !f.burst) return { flight: "flap", t: seconds * hz, amount: 0, hz };
  // Walk the burst–pause sequence from 0; each cycle's lengths are drawn from the ranges by a small hash.
  const h = (i: number) => { const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x); };
  let time = 0;
  for (let i = 0; i < 10000; i++) {
    const beats = Math.round(f.burst.beats[0] + (f.burst.beats[1] - f.burst.beats[0]) * h(i)), flap = beats / hz;
    const pause = f.burst.pause[0] + (f.burst.pause[1] - f.burst.pause[0]) * h(i + 5000);
    if (seconds < time + flap) return { flight: "flap", t: (seconds - time) * hz, amount: 0, hz };
    if (seconds < time + flap + pause) {
      const into = seconds - time - flap, left = time + flap + pause - seconds, share = Math.min(1, pause / (HOLD_IN + HOLD_OUT));
      const amount = smoothstep(into / (HOLD_IN * share)) * smoothstep(left / (HOLD_OUT * share));
      return { flight: f.style === "bounding" ? "closed" : "glide", t: 0, amount, hz };
    }
    time += flap + pause;
  }
  return { flight: "flap", t: seconds * hz, amount: 0, hz };
}

/** A point on the wing's planform: X along the body (+ forward), S out along the span; `hand` beyond the wrist. */
export interface PlanformPoint { X: number; S: number; hand: boolean }
export interface WingPlanform {
  /** Outline, leading edge root → tip → trailing edge → root. */
  outline: PlanformPoint[];
  /** Shoulder, elbow, wrist, tip of the primaries. */
  bones: PlanformPoint[];
  /** The secondaries' band along the inner trailing edge. */
  secondaries: PlanformPoint[];
  /** The span station of the wrist. */
  wrist: number;
  semispan: number;
}

/**
 * The open wing seen from above, in body lengths: its half-span from the species' wingspan, its mean chord from the
 * aspect ratio, the hand's share, and the tip (pointed, rounded, or fingered into separated primaries).
 */
export function wingPlanform(f: BirdFlight, spanRel: number, bodyHalfWidth: number): WingPlanform {
  const s = Math.max(.05, spanRel / 2 - bodyHalfWidth), cm = spanRel / f.aspect.typical, ca = cm * 1.15;
  const Sw = s * (1 - f.hand), wristX = ca * .12;
  const tipLE = f.tip === "pointed" ? -ca * .45 : f.tip === "rounded" ? -ca * .12 : -ca * .05;
  const tipChord = f.tip === "pointed" ? ca * .12 : f.tip === "rounded" ? ca * .55 : ca * .75;
  const P = (X: number, S: number): PlanformPoint => ({ X, S, hand: S > Sw + 1e-9 });
  // A quadratic curve sampled into n points (without its start).
  const curve = (a: readonly [number, number], c: readonly [number, number], b: readonly [number, number], n: number) => Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n, u = 1 - t;
    return P(u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]);
  });
  // Leading edge: out to the wrist, where it bulges forward over the alula, then swept back in a convex curve to the tip.
  const tipFront: [number, number] = [tipLE, s * .97];
  const le = [P(0, 0), ...curve([0, 0], [wristX * 1.25, Sw * .55], [wristX, Sw], 5), ...curve([wristX, Sw], [wristX + ca * .02, Sw + (s - Sw) * .65], tipFront, 6)];
  // The tip: separated primaries (fingers), a rounded end with shallow slots, or a point.
  const tip: PlanformPoint[] = [];
  if (f.fingers > 0) {
    const deep = f.tip === "fingered" ? 1 : .35;
    for (let i = 0; i < f.fingers; i++) {
      const a = (i + .5) / f.fingers, x = tipLE - tipChord * a, depth = s * (.1 + .06 * Math.sin(Math.PI * a)) * deep;
      const outer = f.tip === "rounded" ? s * (.98 + .02 * Math.sin(Math.PI * a)) - s * .08 * a * a : s * (1 - .02 * Math.abs(a - .35));
      tip.push(P(x + tipChord * .08 / f.fingers, outer), P(x - tipChord * .5 / f.fingers, outer - depth));
    }
  } else if (f.tip === "rounded") {
    for (let i = 1; i < 6; i++) { const a = i / 6; tip.push(P(tipLE - tipChord * a, s * (.97 + .03 * Math.sin(Math.PI * a)) - s * .08 * a * a)); }
  } else tip.push(P(tipLE - tipChord * .3, s));
  // Trailing edge: the primaries' convex edge back to a shallow notch behind the wrist, then the straight secondaries,
  // and the tertials rounding into the body.
  const tipBack: [number, number] = [tipLE - tipChord, s * (f.tip === "pointed" ? .9 : .86)], notch: [number, number] = [wristX - ca * .94, Sw * 1.02];
  const te = [P(...tipBack), ...curve(tipBack, [wristX - ca * 1.12, Sw + (s - Sw) * .5], notch, 6), ...curve(notch, [-ca * 1.02, Sw * .45], [-ca * 1.12, 0], 5)];
  const secondaries = [P(wristX - ca * .62, Sw), P(-ca * .66, Sw * .5), P(-ca * .74, 0), P(-ca * 1.12, 0), P(-ca * 1.02, Sw * .5), P(wristX - ca * .97, Sw)];
  const bones = [P(-ca * .12, 0), P(-ca * .3, Sw * .5), P(wristX - ca * .1, Sw), P(tipLE - tipChord * .2, s * .95)];
  return { outline: [...le, ...tip, ...te], bones, secondaries, wrist: Sw, semispan: s };
}

/** A 3D wing point: x along the body, y up, z toward the viewer for the near wing. */
export type WingPoint3 = readonly [number, number, number];

/**
 * Place the planform in 3D for one stroke position. The wing rotates about the body's long axis by the arm elevation
 * and the hand by its own extra bend at the wrist; folding sweeps the arm back about the shoulder and the hand back
 * about the wrist (the wrist flexes), and the whole wing sweeps forward on the downstroke.
 */
export function placeWing(p: WingPlanform, st: WingStroke, shoulder: WingPoint3, side: 1 | -1, pts: readonly PlanformPoint[]): WingPoint3[] {
  const D = Math.PI / 180, armSweep = (-st.sweep + 25 * st.fold) * D, handSweep = 105 * st.fold * D;
  const rot = (x: number, s: number, a: number, cx: number, cs: number) => {
    const dx = x - cx, ds = s - cs, c = Math.cos(a), sn = Math.sin(a);
    return [cx + dx * c - ds * sn, cs + dx * sn + ds * c] as const;
  };
  const wristP = p.bones[2];
  const [wx, ws] = rot(wristP.X, wristP.S, armSweep, 0, 0);
  const e = st.elevation * D, eh = (st.elevation + st.hand) * D;
  const wrist3: WingPoint3 = [shoulder[0] + wx, shoulder[1] + ws * Math.sin(e), shoulder[2] + side * ws * Math.cos(e)];
  return pts.map(q => {
    // Points near the wrist blend between the arm and the hand, so the folded wing has no crease.
    const k = smoothstep((q.S - p.wrist) / (p.semispan * .12) + .5);
    const [ax, as] = rot(q.X, q.S, armSweep, 0, 0);
    const armP: WingPoint3 = [shoulder[0] + ax, shoulder[1] + as * Math.sin(e), shoulder[2] + side * as * Math.cos(e)];
    if (k <= 0) return armP;
    const [hx0, hs0] = rot(q.X, q.S, handSweep, wristP.X, wristP.S);
    const [hx, hs] = rot(hx0, hs0, armSweep, 0, 0), dx = hx - wx, ds = hs - ws;
    const handP: WingPoint3 = [wrist3[0] + dx, wrist3[1] + ds * Math.sin(eh), wrist3[2] + side * ds * Math.cos(eh)];
    return [armP[0] + (handP[0] - armP[0]) * k, armP[1] + (handP[1] - armP[1]) * k, armP[2] + (handP[2] - armP[2]) * k];
  });
}

/**
 * The side view of a 3D wing point, with the camera raised `view` degrees: the near wing's outer parts drop a little
 * and the far wing's rise, so both wings read instead of lying on top of each other.
 */
export const projectWing = (q: WingPoint3, centreY: number, view: number): [number, number] => {
  const v = view * Math.PI / 180;
  return [q[0], centreY + (q[1] - centreY) * Math.cos(v) - q[2] * Math.sin(v)];
};
