/**
 * RIG1 arms: how a person's arm goes to a place in the picture.
 *
 * A picture has no depth, and an arm solved flat folds its elbow over the chest as soon as the hand comes close. Here the arm is
 * solved in depth and then drawn: the body is turned by `facing`, a hand in front of the body is also nearer to the viewer, the
 * elbow hangs down, a little back and away from the ribs, and what points at the viewer is drawn shorter. The shoulder goes along
 * when the arm is far out or high, and the wrist does not bend further than a wrist does.
 *
 * Own space of the figure, which faces right: x right, y down, z to the viewer. Angles in the picture are degrees, clockwise,
 * down is 0. Pure.
 */
export type ArmPoint = readonly [number, number];
export interface ArmBuild {
  side: "f" | "b"; /** Shoulder to elbow, elbow to wrist. */ upper: number; lower: number;
  /** Degrees that the front of the body is turned to the viewer: 0 is a side view, 90 faces the viewer. */ facing: number;
  /** Middle of the palm in the hand's space. */ palm?: ArmPoint;
  /** How far the hand bends from its forearm in the picture, clockwise (`wristRange`). Default 46 either way. */ wrist?: readonly [number, number];
}
export interface ArmAim {
  /** The shoulder when nothing pulls it. */ shoulder: ArmPoint; /** Where the palm (or the wrist, without one) goes. */ to: ArmPoint;
  /** Angle of the hand in the picture. Default: in line with the forearm. */ angle?: number;
  /** 0–1: how far the elbow points at the viewer. */ out?: number; /** 0–1: how far the elbow is held out from the side of the body; down to -1 it is kept in before the body. */ aside?: number; /** 0–1: the shortest that a part is drawn when it points at the viewer. Default 0.62. */ shortest?: number;
  /** How near to its shoulder a hand can be, 0–1 of the arm: 0.68 in front of the body, less at the face. */ near?: number;
}
export interface ArmPose {
  /** Moves the shoulder. */ shift: [number, number];
  /** Angles in the picture, and how much of its length each part shows. */ upper: number; upperScale: number; lower: number; lowerScale: number; hand: number;
  /** How near to the viewer the elbow and the wrist are, from the shoulder. */ depth: [number, number];
  /** Shoulder to wrist, 0–1 of the arm, before anything is clamped: over about 0.95 the body has to come along. */ stretch: number;
}

type Vec = readonly [number, number, number];
const RAD = Math.PI / 180;
const smooth = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const aim = (dx: number, dy: number) => Math.atan2(-dx, dy) / RAD;
/** The short way from one angle to another. */
export const turnBetween = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;
/** A wrist bends this far from the forearm, degrees. An elbow folds to 36° and no more. */
const WRIST = 46, FOLD = 36;
/** How far a wrist bends when its hand should be turned by `t`: a hand that should point back along its forearm does not bend, so it never jumps from one side to the other. */
const wristBend = (t: number, [lo, hi]: readonly [number, number]) => Math.sign(t) * Math.min(Math.abs(t), t < 0 ? -lo : hi, 180 - Math.abs(t));
/** An elbow rests this far from the ribs, of how far it hangs down; seen from the front it goes out with a hand that goes out, and not over the chest. */
const AWAY = 0.26, BESIDE = 0.8;
/** The longest that an arm reaches: an elbow is never locked. No part is drawn shorter than `SHORTEST` of itself. */
const MOST = 0.975, SHORTEST = 0.62;

/** Shoulder, elbow and wrist for a hand at (dx, dy) from its shoulder. From behind, an arm shows as it does from the front. */
function bend(arm: ArmBuild, dx: number, dy: number, o: { out: number; near: number; aside: number; shortest: number; halves: number }): Omit<ArmPose, "shift" | "hand"> {
  const { upper: U, lower: V } = arm, L = U + V, flat = Math.hypot(dx, dy), phi = arm.facing * RAD, c = Math.cos(phi), s = Math.abs(Math.sin(phi)), stretch = flat / L;
  if (stretch > MOST) { const k = (MOST * L) / flat; dx *= k; dy *= k; }
  const d2 = Math.min(flat, MOST * L), least = Math.sqrt(U * U + V * V - 2 * U * V * Math.cos(FOLD * RAD));
  const forward: Vec = [c, 0, s], outward: Vec = arm.side === "f" ? [-s, 0, c] : [s, 0, -c];
  // where an elbow rests: down, a little back, away from the ribs; with the hand overhead it comes forward
  const high = 0.15 - dy / L, turned = smooth((s - 0.7) / 0.3), back = 0.35 - 0.95 * smooth(high / 0.45) * (1 - turned) - 0.75 * smooth(high) * turned, depth = o.near * L * s * Math.sqrt(Math.max(0, 1 - (d2 / (MOST * L)) ** 2));
  // a body that faces the viewer holds a near hand under its shoulder with the elbow out, not over the chest
  const out = dx * outward[0], steep = dy > 0 ? out / dy : 9, tuck = (1 + Math.min(0, o.aside)) * smooth((s - 0.8) / 0.2) * smooth((steep + 0.12) / 0.12) * (1 - smooth((steep - 0.3) / 0.25)) * (1 - smooth((stretch - 0.4) / 0.12)), beside = AWAY + BESIDE * smooth((s - 0.8) / 0.2) * Math.max(0, out / L) + Math.max(0, o.aside);
  const away = beside + tuck * Math.max(0, Math.max(0, steep) + 0.4 - beside), rests: Vec = [-forward[0] * back + outward[0] * away, 1, -forward[2] * back + outward[2] * away + o.out * 1.6];
  const solve = (k: number) => {
    const dz = Math.max(depth * k, Math.sqrt(Math.max(0, least * least - d2 * d2))), D = Math.hypot(d2, dz), a: Vec = [dx / D, dy / D, dz / D], p: Vec = [rests[0], rests[1], rests[2] * k], along = dot(p, a), q: Vec = [p[0] - along * a[0], p[1] - along * a[1], p[2] - along * a[2]], n = Math.hypot(...q) || 1e-6;
    const u = (U * U + D * D - V * V) / (2 * D), h = Math.sqrt(Math.max(0, U * U - u * u)), ex = a[0] * u + (q[0] / n) * h, ey = a[1] * u + (q[1] / n) * h;
    return { ex, ey, us: Math.hypot(ex, ey) / U, ls: Math.hypot(dx - ex, dy - ey) / V, ez: a[2] * u + (q[2] / n) * h, dz };
  };
  let k = 1, at = solve(1);
  if (Math.min(at.us, at.ls) < o.shortest) { let lo = 0, hi = 1; for (let i = 0; i < o.halves; i++) { const m = (lo + hi) / 2, t = solve(m); if (Math.min(t.us, t.ls) < o.shortest) hi = m; else lo = m; } k = lo; at = solve(k); }
  return { upper: aim(at.ex, at.ey), upperScale: at.us, lower: aim(dx - at.ex, dy - at.ey), lowerScale: at.ls, depth: [at.ez, at.dz], stretch };
}

/** Where the wrist is when the palm is at its place, and how the hand is held on a forearm. */
function handOf(arm: ArmBuild, goal: ArmAim) {
  const palm = arm.palm ?? [0, 0], range = arm.wrist ?? [-WRIST, WRIST];
  return {
    wristFor: (hand: number): [number, number] => { const a = hand * RAD, c = Math.cos(a), s = Math.sin(a); return [goal.to[0] - (palm[0] * c - palm[1] * s), goal.to[1] - (palm[0] * s + palm[1] * c)]; },
    held: (lower: number) => (goal.angle === undefined ? lower : lower + wristBend(turnBetween(lower, goal.angle), range)),
  };
}

/** `rough` is near enough to say where the elbow is. It costs a fifth, and it goes over smoothly from place to place: what is found by going round and round jumps where the forearm points at the viewer. */
export function solveArm(arm: ArmBuild, goal: ArmAim, rough = false): ArmPose {
  const L = arm.upper + arm.lower, o = { out: goal.out ?? 0, near: goal.near ?? 0.68, aside: goal.aside ?? 0, shortest: goal.shortest ?? SHORTEST, halves: rough ? 7 : 14 }, { wristFor, held } = handOf(arm, goal), [sx, sy] = goal.shoulder;
  const straight = aim(goal.to[0] - sx, goal.to[1] - sy);
  let hand = goal.angle ?? straight, wrist = wristFor(hand), got = bend(arm, wrist[0] - sx, wrist[1] - sy, o); const stretch = got.stretch;
  // the shoulder goes with the arm: out to a far hand, up with a high elbow
  const dx = wrist[0] - sx, dy = wrist[1] - sy, d = Math.hypot(dx, dy) || 1, far = 0.075 * L * smooth((stretch - 0.74) / 0.24), up = 0.055 * L * smooth((Math.abs(turnBetween(0, got.upper)) - 50) / 80), shift: [number, number] = [(dx / d) * far, (dy / d) * far * 0.35 - up];
  if (rough) got = bend(arm, wrist[0] - sx - shift[0], wrist[1] - sy - shift[1], o);
  else for (let i = 0; i < 8; i++) { got = bend(arm, wrist[0] - sx - shift[0], wrist[1] - sy - shift[1], o); hand += turnBetween(hand, held(got.lower)) * 0.7; wrist = wristFor(hand); }
  return { ...got, shift, hand, stretch };
}

/** Several ways to hold an arm in one: the mean of their elbows and of their wrists. */
export function meanArm(arm: ArmBuild, all: readonly { got: ArmPose; share: number }[]): ArmPose {
  const way = (deg: number, n: number): ArmPoint => [-Math.sin(deg * RAD) * n, Math.cos(deg * RAD) * n], mean = (of: (got: ArmPose) => number) => all.reduce((n, q) => n + of(q.got) * q.share, 0);
  const at = (i: 0 | 1): ArmPoint => [mean(g => way(g.upper, g.upperScale * arm.upper)[i]), mean(g => way(g.lower, g.lowerScale * arm.lower)[i])], [ex, fx] = at(0), [ey, fy] = at(1);
  return { shift: [mean(g => g.shift[0]), mean(g => g.shift[1])], upper: aim(ex, ey), upperScale: Math.hypot(ex, ey) / arm.upper, lower: aim(fx, fy), lowerScale: Math.hypot(fx, fy) / arm.lower, hand: aim(mean(g => way(g.hand, 1)[0]), mean(g => way(g.hand, 1)[1])), depth: [mean(g => g.depth[0]), mean(g => g.depth[1])], stretch: mean(g => g.stretch) };
}

/**
 * The arm of `from`, with its hand at another place: the forearm follows the hand, and the elbow stays. It goes along only as far as the
 * forearm is too short, or would point at the viewer (`least`: the shortest that it is drawn). An elbow that is found anew for each place
 * of a quick hand jumps wherever the arm can be folded in two ways.
 */
export function armFrom(arm: ArmBuild, goal: ArmAim, from: ArmPose, least = 0.15): ArmPose {
  const { upper: U, lower: V } = arm, { wristFor, held } = handOf(arm, goal), sx = goal.shoulder[0] + from.shift[0], sy = goal.shoulder[1] + from.shift[1], phi = arm.facing * RAD;
  // a forearm that points at the viewer goes a little down, and in before the body
  const ahead: ArmPoint = [0.5 * ((arm.side === "f" ? 1 : -1) * Math.abs(Math.sin(phi)) + Math.cos(phi)), 0.86], e0: ArmPoint = [-Math.sin(from.upper * RAD) * U * from.upperScale, Math.cos(from.upper * RAD) * U * from.upperScale];
  const forearm = (x: number, y: number, e: ArmPoint): ArmPoint => { const k = Math.max(0, least * V - Math.hypot(x - e[0], y - e[1])); return [x - e[0] + ahead[0] * k, y - e[1] + ahead[1] * k]; };
  let hand = held(aim(...forearm(goal.to[0] - sx, goal.to[1] - sy, e0))), e: ArmPoint = e0, x = 0, y = 0;
  for (let i = 0; i < 3; i++) {
    [x, y] = wristFor(hand); x -= sx; y -= sy; e = e0;
    const far = Math.hypot(x, y); if (far > MOST * (U + V)) { x *= (MOST * (U + V)) / far; y *= (MOST * (U + V)) / far; }
    for (let j = 0; j < 4; j++) {
      const r = Math.hypot(x - e[0], y - e[1]);
      if (r > V) e = [x - ((x - e[0]) / r) * V, y - ((y - e[1]) / r) * V];
      else if (r < least * V) { const [ux, uy] = forearm(x, y, e), n = Math.hypot(ux, uy) || 1e-6; e = [x - (ux / n) * least * V, y - (uy / n) * least * V]; }
      const n = Math.hypot(...e); if (n > U) e = [(e[0] / n) * U, (e[1] / n) * U];
    }
    if (i < 2) hand = held(aim(x - e[0], y - e[1]));
  }
  const f: [number, number] = [x - e[0], y - e[1]];
  return { ...from, upper: aim(e[0], e[1]), upperScale: Math.hypot(...e) / U, lower: aim(...f), lowerScale: Math.hypot(...f) / V, hand };
}
