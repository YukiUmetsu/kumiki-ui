/** Skeleton and transverse-gallop kinematics for the stock horse (`horse-3d`).
 *
 * The clip is one stride, in place: the ground slides backward under the horse at
 * `strideLength` per stride, so a scene moves the horse forward at
 * `strideLength × strideFrequency` and every planted hoof stays still in the world.
 *
 * Timing (normalised stride time t ∈ [0, 1), left lead):
 *   right hind lands 0, left hind .08, right fore .25, left fore .40; each hoof is down
 *   for its duty factor (fore .26, hind .25), then ≈ .33 gathered suspension with the
 *   legs folded under the body. Read frame by frame from Muybridge's plate 626
 *   ("Annie G." galloping, 1887, NGA 136536, CC0) and the ANIM1 gait table, with duty
 *   factors for a working gallop from Thoroughbred stride studies (0.20–0.30).
 *
 * Each leg is solved in the sagittal plane on its real segments:
 *   fore  scapula (rotates about a point a third down the blade) → humerus → forearm
 *         → cannon → pastern → hoof; the carpus is straight in stance and folds in swing.
 *   hind  femur → tibia → cannon → pastern → hoof, the stifle and hock flexing together
 *         (the reciprocal apparatus), solved for the fetlock position by bisection.
 * Planted hooves lie flat, the fetlock sinks under load and the hoof breaks over its toe
 * before lift-off. Swing paths are Hermite curves whose end tangents match the ground
 * speed, so hooves land and leave without a pop.
 */
import type { AutoRig, RigBoneSpec } from "./auto-rig";
import type { Vec3 } from "./sdf-sculpt";

type V2 = [number, number];

// ------------------------------------------------------------------ skeleton

const FORE = { scapulaTop: [.17, 1.43] as V2, shoulder: [.48, 1.06] as V2, elbow: [.2, .8] as V2, carpus: [.21, .43] as V2, fetlock: [.22, .155] as V2, coffin: [.28, .06] as V2, toe: [.36, 0] as V2 };
const HIND = { hip: [-.75, 1.24] as V2, stifle: [-.52, .88] as V2, hock: [-.84, .52] as V2, fetlock: [-.8, .16] as V2, coffin: [-.74, .06] as V2, toe: [-.66, 0] as V2 };
const FORE_Z = { scapulaTop: .14, shoulder: .17, elbow: .16, carpus: .14, fetlock: .135, coffin: .135, toe: .135 };
const HIND_Z = { hip: .19, stifle: .21, hock: .15, fetlock: .135, coffin: .135, toe: .135 };
const TRUNK_HEAD: V2 = [-.45, 1.2], PELVIS_HEAD: V2 = [-.45, 1.3], CENTRE_OF_MASS: V2 = [-.05, 1.15];

export type HorseLeg = "fore-near" | "fore-far" | "hind-near" | "hind-far";
export const HORSE_LEGS: readonly HorseLeg[] = ["hind-far", "fore-far", "hind-near", "fore-near"];

const p3 = (p: V2, z: number): Vec3 => [p[0], p[1], z];
function foreBones(side: "near" | "far"): RigBoneSpec[] {
  // The near (left) side is −Z when +X is forward and +Y up.
  const s = side === "near" ? -1 : 1, j = (k: keyof typeof FORE) => p3(FORE[k], FORE_Z[k] * s), n = `fore-${side}`;
  return [
    { name: `${n}-scapula`, parent: "trunk", head: j("scapulaTop"), tail: j("shoulder"), radius: .13 },
    { name: `${n}-humerus`, parent: `${n}-scapula`, head: j("shoulder"), tail: j("elbow"), radius: .1 },
    { name: `${n}-forearm`, parent: `${n}-humerus`, head: j("elbow"), tail: j("carpus"), radius: .075 },
    { name: `${n}-cannon`, parent: `${n}-forearm`, head: j("carpus"), tail: j("fetlock"), radius: .045 },
    { name: `${n}-pastern`, parent: `${n}-cannon`, head: j("fetlock"), tail: j("coffin"), radius: .04 },
    { name: `${n}-hoof`, parent: `${n}-pastern`, head: j("coffin"), tail: j("toe"), radius: .05 },
  ];
}
function hindBones(side: "near" | "far"): RigBoneSpec[] {
  const s = side === "near" ? -1 : 1, j = (k: keyof typeof HIND) => p3(HIND[k], HIND_Z[k] * s), n = `hind-${side}`;
  return [
    // The thigh muscles (quadriceps in front, biceps femoris behind) lie well off the femur's axis and swing with it;
    // the gaskin and the semitendinosus at the back of the leg go with the tibia. Above the hip joint stays pelvis.
    { name: `${n}-femur`, parent: "pelvis", head: j("hip"), tail: j("stifle"), radius: .17, influences: [
      { head: [-.8, 1.1, .21 * s], tail: [-.6, .87, .23 * s], radius: .19 },
      { head: [-.9, 1.04, .16 * s], tail: [-.8, .85, .19 * s], radius: .11 },
    ] },
    { name: `${n}-tibia`, parent: `${n}-femur`, head: j("stifle"), tail: j("hock"), radius: .09, influences: [
      { head: [-.78, .84, .19 * s], tail: [-.84, .62, .17 * s], radius: .11 },
      { head: [-.94, .8, .13 * s], tail: [-.91, .63, .13 * s], radius: .075 },
    ] },
    { name: `${n}-cannon`, parent: `${n}-tibia`, head: j("hock"), tail: j("fetlock"), radius: .048 },
    { name: `${n}-pastern`, parent: `${n}-cannon`, head: j("fetlock"), tail: j("coffin"), radius: .04 },
    { name: `${n}-hoof`, parent: `${n}-pastern`, head: j("coffin"), tail: j("toe"), radius: .05 },
  ];
}

/** Bone names, joint centres and influence radii (metres, rest pose standing square). */
export const HORSE_SKELETON: readonly RigBoneSpec[] = [
  { name: "trunk", head: [TRUNK_HEAD[0], TRUNK_HEAD[1], 0], tail: [.42, 1.22, 0], radius: .42 },
  { name: "pelvis", parent: "trunk", head: [PELVIS_HEAD[0], PELVIS_HEAD[1], 0], tail: [-1.05, 1.3, 0], radius: .36 },
  { name: "neck-0", parent: "trunk", head: [.42, 1.28, 0], tail: [.63, 1.47, 0], radius: .24 },
  { name: "neck-1", parent: "neck-0", head: [.63, 1.47, 0], tail: [.86, 1.64, 0], radius: .18 },
  { name: "head", parent: "neck-1", head: [.9, 1.67, 0], tail: [1.31, 1.32, 0], radius: .19 },
  { name: "ear-near", parent: "head", head: [.977, 1.757, -.058], tail: [1.003, 1.903, -.078], radius: .035 },
  { name: "ear-far", parent: "head", head: [.977, 1.757, .058], tail: [1.003, 1.903, .078], radius: .035 },
  // Tail: the dock leaves the croup and curves down behind the buttocks; the last bones carry the hanging hair.
  // Tail: three dock bones (the muscular tailbone, lifted actively at speed), then a chain through the hanging hair
  // that a scene may hand to a spring simulation (`HORSE_TAIL_HAIR`).
  { name: "tail-0", parent: "pelvis", head: [-1.02, 1.45, 0], tail: [-1.12, 1.4, 0], radius: .06 },
  { name: "tail-1", parent: "tail-0", head: [-1.12, 1.4, 0], tail: [-1.19, 1.27, 0], radius: .06 },
  { name: "tail-2", parent: "tail-1", head: [-1.19, 1.27, 0], tail: [-1.22, 1.15, 0], radius: .07 },
  { name: "tail-3", parent: "tail-2", head: [-1.22, 1.15, 0], tail: [-1.26, .98, 0], radius: .1 },
  { name: "tail-4", parent: "tail-3", head: [-1.26, .98, 0], tail: [-1.29, .81, 0], radius: .11 },
  { name: "tail-5", parent: "tail-4", head: [-1.29, .81, 0], tail: [-1.31, .64, 0], radius: .12 },
  { name: "tail-6", parent: "tail-5", head: [-1.31, .64, 0], tail: [-1.33, .47, 0], radius: .13 },
  { name: "tail-7", parent: "tail-6", head: [-1.33, .47, 0], tail: [-1.34, .3, 0], radius: .14 },
  ...foreBones("near"), ...foreBones("far"), ...hindBones("near"), ...hindBones("far"),
];

/** The dock bones and the hair chain below them, root first. */
export const HORSE_TAIL_DOCK = ["tail-0", "tail-1", "tail-2"] as const;
export const HORSE_TAIL_HAIR = ["tail-3", "tail-4", "tail-5", "tail-6", "tail-7"] as const;

/** Sole contact points in each hoof bone's frame (from the coffin joint): toe and heel. */
export const HORSE_HOOF_CONTACT = { toe: [FORE.toe[0] - FORE.coffin[0] + .005, -.06, 0] as Vec3, heel: [-.055, -.058, 0] as Vec3 };

// ------------------------------------------------------------------ options

export interface HorseGallopOptions {
  /** Distance travelled per stride (m). Default 4.6. */
  strideLength?: number;
  /** Landing time of each leg in the stride (0–1). Default right hind 0, left hind .08, right fore .25, left fore .4. */
  footfalls?: Partial<Record<HorseLeg, number>>;
  /** Fraction of the stride each hoof is on the ground. */
  dutyFore?: number;
  dutyHind?: number;
  /** Peak vertical travel of the trunk (m) and pitch (radians). */
  bob?: number;
  pitch?: number;
}

export const HORSE_GALLOP_DEFAULTS = {
  strideLength: 4.6,
  strideFrequency: 2.4,
  footfalls: { "hind-far": 0, "hind-near": .08, "fore-far": .25, "fore-near": .4 } as Record<HorseLeg, number>,
  dutyFore: .26,
  dutyHind: .25,
  bob: .04,
  pitch: .06,
} as const;

/** Ground speed (m/s) at which the in-place clip's planted hooves stay still, for a playback rate. */
export function horseGallopSpeed(options: HorseGallopOptions = {}, playbackRate = 1): number {
  return (options.strideLength ?? HORSE_GALLOP_DEFAULTS.strideLength) * HORSE_GALLOP_DEFAULTS.strideFrequency * playbackRate;
}

/** Analytic landing and lift-off times per leg (stride fraction), for checking measured contacts. */
export function horseFootfalls(options: HorseGallopOptions = {}) {
  return HORSE_LEGS.map(leg => {
    const land = options.footfalls?.[leg] ?? HORSE_GALLOP_DEFAULTS.footfalls[leg];
    const duty = leg.startsWith("fore") ? options.dutyFore ?? HORSE_GALLOP_DEFAULTS.dutyFore : options.dutyHind ?? HORSE_GALLOP_DEFAULTS.dutyHind;
    return { leg, land, lift: (land + duty) % 1, duty };
  });
}

// ------------------------------------------------------------------ 2D helpers

const TAU = Math.PI * 2;
const frac = (t: number) => t - Math.floor(t);
const ang = (a: V2, b: V2) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const dist = (a: V2, b: V2) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const rot = (v: V2, a: number): V2 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const scale = (a: V2, k: number): V2 => [a[0] * k, a[1] * k];
const polar = (a: number, len: number): V2 => [Math.cos(a) * len, Math.sin(a) * len];
const about = (p: V2, pivot: V2, a: number): V2 => add(pivot, rot(sub(p, pivot), a));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
const DEG = Math.PI / 180;

/** Cubic Hermite through keys with explicit end tangents (per unit of the key parameter). */
function hermite(keys: ReadonlyArray<{ p: number; v: V2 }>, startTangent: V2, endTangent: V2, p: number): V2 {
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1].p) i++;
  const a = keys[i], b = keys[i + 1], h = b.p - a.p, s = Math.max(0, Math.min(1, (p - a.p) / h));
  const tangent = (k: number): V2 => {
    if (k === 0) return startTangent;
    if (k === keys.length - 1) return endTangent;
    return scale(sub(keys[k + 1].v, keys[k - 1].v), 1 / (keys[k + 1].p - keys[k - 1].p));
  };
  const ma = scale(tangent(i), h), mb = scale(tangent(i + 1), h);
  const s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  return [h00 * a.v[0] + h10 * ma[0] + h01 * b.v[0] + h11 * mb[0], h00 * a.v[1] + h10 * ma[1] + h01 * b.v[1] + h11 * mb[1]];
}

// ------------------------------------------------------------------ distal limb (both)

const FORE_REST = {
  pastern: ang(FORE.fetlock, FORE.coffin), hoof: ang(FORE.coffin, FORE.toe), cannon: ang(FORE.carpus, FORE.fetlock),
  lp: dist(FORE.fetlock, FORE.coffin), coffinFromToe: sub(FORE.coffin, FORE.toe),
};
const HIND_REST = {
  pastern: ang(HIND.fetlock, HIND.coffin), hoof: ang(HIND.coffin, HIND.toe), cannon: ang(HIND.hock, HIND.fetlock),
  lp: dist(HIND.fetlock, HIND.coffin), coffinFromToe: sub(HIND.coffin, HIND.toe),
};
type DistalRest = typeof FORE_REST;

interface Distal { fetlock: V2; coffin: V2; toe: V2; pasternAngle: number; hoofAngle: number }

/** Planted hoof at stance progress u: flat, fetlock sinking under load, break-over about the toe from u = .7. */
function stanceDistal(rest: DistalRest, toe: V2, u: number, sink: number): Distal {
  const breakover = 58 * DEG * Math.pow(ramp(u, .68, 1), 1.4);
  const load = Math.sin(Math.PI * Math.min(1, u / .9)) ** 1.2;
  const hoofAngle = rest.hoof - breakover;
  const coffin = add(toe, rot(rest.coffinFromToe, -breakover));
  // F→C points down the pastern; loading rotates it toward the horizontal (the fetlock drops).
  const pasternAngle = rest.pastern + sink * load - breakover * .9;
  const fetlock = sub(coffin, polar(pasternAngle, rest.lp));
  return { fetlock, coffin, toe, pasternAngle, hoofAngle };
}

/** Swinging hoof hanging from the fetlock: the pastern folds back (flexion) then extends to land. */
function swingDistal(rest: DistalRest, fetlock: V2, cannonAngle: number, fetlockFlex: number, coffinFlex: number): Distal {
  const pasternAngle = cannonAngle + (rest.pastern - rest.cannon) + fetlockFlex;
  const coffin = add(fetlock, polar(pasternAngle, rest.lp));
  const hoofAngle = pasternAngle + (rest.hoof - rest.pastern) + coffinFlex;
  const toe = add(coffin, polar(hoofAngle, dist(FORE.coffin, FORE.toe)));
  return { fetlock, coffin, toe, pasternAngle, hoofAngle };
}

// ------------------------------------------------------------------ fore leg

const FORE_LEN = {
  humerus: dist(FORE.shoulder, FORE.elbow), forearm: dist(FORE.elbow, FORE.carpus), cannon: dist(FORE.carpus, FORE.fetlock),
};
const SCAPULA_PIVOT: V2 = add(FORE.scapulaTop, scale(sub(FORE.shoulder, FORE.scapulaTop), .33));
const FORE_LIMB_REST = ang(FORE.shoulder, FORE.fetlock);

interface ForeSolution { scapula: number; shoulder: V2; elbow: V2; carpus: V2; fetlock: V2; reach: number }

/** Shoulder-to-fetlock solve with the carpus flexed by `kappa`: the elbow stays behind the limb line. */
function solveFore(fetlock: V2, kappa: number): ForeSolution {
  // Scapula rotation follows the limb's swing (≈ a third of it), two fixed-point passes.
  let scapula = 0, shoulder = FORE.shoulder;
  for (let pass = 0; pass < 3; pass++) {
    scapula = Math.max(-20 * DEG, Math.min(20 * DEG, wrap(ang(shoulder, fetlock) - FORE_LIMB_REST) * .46));
    shoulder = about(FORE.shoulder, SCAPULA_PIVOT, scapula);
  }
  const { humerus: a, forearm: b, cannon: c } = FORE_LEN;
  const lower = Math.sqrt(b * b + c * c + 2 * b * c * Math.cos(kappa));
  const want = dist(shoulder, fetlock);
  const d = Math.max(Math.abs(a - lower) + 1e-4, Math.min(a + lower - 1e-4, want));
  const alpha = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - lower * lower) / (2 * a * d))));
  const toward = ang(shoulder, fetlock);
  const elbow = add(shoulder, polar(toward - alpha, a));
  const target = add(shoulder, polar(toward, d));
  const beta = Math.acos(Math.max(-1, Math.min(1, (b * b + lower * lower - c * c) / (2 * b * lower))));
  const carpus = add(elbow, polar(ang(elbow, target) + beta, b));
  return { scapula, shoulder, elbow, carpus, fetlock: target, reach: want - d };
}

// ------------------------------------------------------------------ hind leg

const HIND_LEN = { femur: dist(HIND.hip, HIND.stifle), tibia: dist(HIND.stifle, HIND.hock), cannon: dist(HIND.hock, HIND.fetlock) };
const HIND_REST_ANG = { femur: ang(HIND.hip, HIND.stifle), tibia: ang(HIND.stifle, HIND.hock), cannon: ang(HIND.hock, HIND.fetlock) };
const STIFLE_TURN = wrap(HIND_REST_ANG.tibia - HIND_REST_ANG.femur), HOCK_TURN = wrap(HIND_REST_ANG.cannon - HIND_REST_ANG.tibia);

/** Hind chain with flexion `s` shared by stifle and hock (reciprocal apparatus), femur at rest angle + `swing`. */
function hindChain(s: number, swing: number) {
  const fa = HIND_REST_ANG.femur + swing, ta = fa + STIFLE_TURN - s, ca = ta + HOCK_TURN + s * 1.05;
  const stifle = add(HIND.hip, polar(fa, HIND_LEN.femur)), hock = add(stifle, polar(ta, HIND_LEN.tibia));
  return { stifle, hock, fetlock: add(hock, polar(ca, HIND_LEN.cannon)), cannonAngle: ca };
}

function solveHind(fetlock: V2) {
  const want = dist(HIND.hip, fetlock);
  let lo = -62 * DEG, hi = 95 * DEG;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (dist(HIND.hip, hindChain(mid, 0).fetlock) > want) lo = mid; else hi = mid;
  }
  const s = (lo + hi) / 2, rest = hindChain(s, 0);
  const swing = wrap(ang(HIND.hip, fetlock) - ang(HIND.hip, rest.fetlock));
  const chain = hindChain(s, swing);
  return { ...chain, flex: s, reach: want - dist(HIND.hip, chain.fetlock) };
}

// ------------------------------------------------------------------ gait

interface LegPlan { land: number; duty: number; centre: number; sweep: number }

function legPlan(leg: HorseLeg, o: HorseGallopOptions): LegPlan {
  const fore = leg.startsWith("fore"), L = o.strideLength ?? HORSE_GALLOP_DEFAULTS.strideLength;
  const duty = fore ? o.dutyFore ?? HORSE_GALLOP_DEFAULTS.dutyFore : o.dutyHind ?? HORSE_GALLOP_DEFAULTS.dutyHind;
  // Stance sweeps centred a little ahead of the standing toe (fores land well in front of the shoulder).
  // Plate 626: a hind lands under the stifle and pushes off well behind the buttock; a fore lands half a metre
  // ahead of the chest and leaves behind the elbow.
  return { land: o.footfalls?.[leg] ?? HORSE_GALLOP_DEFAULTS.footfalls[leg], duty, sweep: L * duty, centre: (fore ? FORE.toe[0] + .1 : HIND.toe[0] - .2) };
}

/** Trunk bob/pitch and pelvis (lumbosacral) flexion at stride time t. */
function bodyMotion(t: number, o: HorseGallopOptions) {
  const bob = (o.bob ?? HORSE_GALLOP_DEFAULTS.bob) * Math.cos(TAU * (t - .86));
  // Nose up as the hinds drive (t ≈ .05), nose down as the fores take the weight (t ≈ .55).
  const pitch = (o.pitch ?? HORSE_GALLOP_DEFAULTS.pitch) * Math.cos(TAU * (t - .05));
  // Loins flex (croup tucks, hinds come under) through late suspension; extend at hind push-off.
  const lumbar = 7 * DEG * Math.cos(TAU * (t - .95));
  return { bob, pitch, lumbar };
}

interface LegPose { joints: V2[]; distal: Distal; stance: boolean; reach: number }

/** Ground point (clip space, y = 0) → a bone frame given by an inverse transform. */
type Frame = (p: V2) => V2;
/** A clip-space direction expressed in a bone frame. */
const toLocalVector = (toLocal: Frame, v: V2): V2 => sub(toLocal(v), toLocal([0, 0]));

/** A planted hoof is flat on the ground in clip space; convert the pose into the bone frame (rotated by `frameAngle`). */
function plantedDistal(rest: DistalRest, plan: LegPlan, u: number, sink: number, toLocal: Frame, frameAngle: number): Distal {
  const w = stanceDistal(rest, [plan.centre + plan.sweep / 2 - plan.sweep * u, 0], u, sink);
  return { fetlock: toLocal(w.fetlock), coffin: toLocal(w.coffin), toe: toLocal(w.toe), pasternAngle: w.pasternAngle - frameAngle, hoofAngle: w.hoofAngle - frameAngle };
}

function forePose(plan: LegPlan, t: number, toLocal: Frame, frameAngle: number): LegPose {
  const phase = frac(t - plan.land), sink = 30 * DEG;
  const stanceAt = (u: number) => plantedDistal(FORE_REST, plan, u, sink, toLocal, frameAngle);
  if (phase < plan.duty) {
    const d = stanceAt(phase / plan.duty);
    const s = solveFore(d.fetlock, 0);
    return { joints: [s.shoulder, s.elbow, s.carpus, s.fetlock], distal: { ...d, fetlock: s.fetlock }, stance: true, reach: s.reach, scapula: s.scapula } as LegPose & { scapula: number };
  }
  const p = (phase - plan.duty) / (1 - plan.duty), swingDur = 1 - plan.duty;
  const lift = stanceAt(1), land = stanceAt(0), eps = .002;
  // End tangents in "per unit p": stance velocity (per unit u) × du/dt × dt/dp.
  const vLift = scale(sub(lift.fetlock, stanceAt(1 - eps).fetlock), (1 / eps) / plan.duty * swingDur * .5);
  // Swing-leg retraction before touchdown: the hoof swings back at 70% of ground speed as it lands, so it meets the
  // ground nearly at rest instead of skidding.
  // ... and comes down onto it (about 2 m/s at a working gallop) instead of skimming in.
  const vLand = add(scale(sub(stanceAt(eps).fetlock, land.fetlock), (1 / eps) / plan.duty * swingDur * RETRACTION), toLocalVector(toLocal, [0, -DESCENT]));
  const local = (x: number, y: number) => toLocal([x, y]);
  const keys = [
    { p: 0, v: lift.fetlock },
    { p: .3, v: local(FORE.fetlock[0] - .02, .46) },
    { p: .56, v: local(FORE.fetlock[0] + .34, .5) },
    { p: .82, v: add(land.fetlock, toLocalVector(toLocal, [.12, .14])) },
    { p: 1, v: land.fetlock },
  ];
  const fetlock = hermite(keys, vLift, vLand, p);
  // Carpus folds hard just after lift-off ("tight folding"), unfolds to reach straight before landing.
  const kappa = 100 * DEG * ramp(p, 0, .28) * (1 - ramp(p, .4, .7));
  const s = solveFore(fetlock, kappa);
  const cannonAngle = ang(s.carpus, s.fetlock);
  // Fetlock and coffin: from the break-over pose, through tight flexion, back to the landing pose.
  const liftCannon = ang(solveFore(lift.fetlock, 0).carpus, lift.fetlock), landCannon = ang(solveFore(land.fetlock, 0).carpus, land.fetlock);
  const { flex, coffinFlex } = swingFlex(FORE_REST, lift, land, liftCannon, landCannon, p, -85 * DEG, -25 * DEG);
  const d = swingDistal(FORE_REST, s.fetlock, cannonAngle, flex, coffinFlex);
  return { joints: [s.shoulder, s.elbow, s.carpus, s.fetlock], distal: d, stance: false, reach: s.reach, scapula: s.scapula } as LegPose & { scapula: number };
}

const mixAngle = (a: number, b: number, k: number) => a + wrap(b - a) * k;
/** Share of ground speed the hoof is swung back at as it lands, and its fall (m per unit of swing) at contact. */
const RETRACTION = .7, DESCENT = .6;

/** Fetlock and coffin flexion through the swing, continuous with the lift-off and landing poses. */
function swingFlex(rest: DistalRest, lift: Distal, land: Distal, liftCannon: number, landCannon: number, p: number, tuck: number, toeTuck: number) {
  const flexAt = (d: Distal, cannon: number) => wrap(d.pasternAngle - (cannon + rest.pastern - rest.cannon));
  const coffinAt = (d: Distal) => wrap(d.hoofAngle - (d.pasternAngle + rest.hoof - rest.pastern));
  const flex = mixAngle(mixAngle(flexAt(lift, liftCannon), tuck, ramp(p, 0, .3)), flexAt(land, landCannon), ramp(p, .5, .92));
  const coffinFlex = mixAngle(mixAngle(coffinAt(lift), toeTuck, ramp(p, 0, .3)), coffinAt(land), ramp(p, .55, .92));
  return { flex, coffinFlex };
}

function hindPose(plan: LegPlan, t: number, toLocal: Frame, frameAngle: number): LegPose {
  const phase = frac(t - plan.land), sink = 26 * DEG;
  const stanceAt = (u: number) => plantedDistal(HIND_REST, plan, u, sink, toLocal, frameAngle);
  if (phase < plan.duty) {
    const d = stanceAt(phase / plan.duty);
    const s = solveHind(d.fetlock);
    return { joints: [HIND.hip, s.stifle, s.hock, s.fetlock], distal: { ...d, fetlock: s.fetlock }, stance: true, reach: s.reach };
  }
  const p = (phase - plan.duty) / (1 - plan.duty), swingDur = 1 - plan.duty;
  const lift = stanceAt(1), land = stanceAt(0), eps = .002;
  const vLift = scale(sub(lift.fetlock, stanceAt(1 - eps).fetlock), (1 / eps) / plan.duty * swingDur * .5);
  const vLand = add(scale(sub(stanceAt(eps).fetlock, land.fetlock), (1 / eps) / plan.duty * swingDur * RETRACTION), toLocalVector(toLocal, [0, -DESCENT]));
  const local = (x: number, y: number) => toLocal([x, y]);
  const keys = [
    { p: 0, v: lift.fetlock },
    { p: .3, v: local(HIND.fetlock[0] - .2, .42) },
    { p: .6, v: local(HIND.fetlock[0] + .3, .44) },
    { p: .82, v: add(land.fetlock, toLocalVector(toLocal, [.2, .13])) },
    { p: 1, v: land.fetlock },
  ];
  const fetlock = hermite(keys, vLift, vLand, p);
  const s = solveHind(fetlock);
  const { flex, coffinFlex } = swingFlex(HIND_REST, lift, land, solveHind(lift.fetlock).cannonAngle, solveHind(land.fetlock).cannonAngle, p, -80 * DEG, -22 * DEG);
  const d = swingDistal(HIND_REST, s.fetlock, s.cannonAngle, flex, coffinFlex);
  return { joints: [HIND.hip, s.stifle, s.hock, s.fetlock], distal: d, stance: false, reach: s.reach };
}

// ------------------------------------------------------------------ apply to the rig

/** Per-leg diagnostics from the last solve: how far a hoof target was out of reach (m). */
export interface HorseGallopDiagnostics { reach: Record<HorseLeg, number>; stance: Record<HorseLeg, boolean> }

const FORE_BONE_REST = [ang(FORE.scapulaTop, FORE.shoulder), ang(FORE.shoulder, FORE.elbow), ang(FORE.elbow, FORE.carpus), ang(FORE.carpus, FORE.fetlock), FORE_REST.pastern, FORE_REST.hoof];
const HIND_BONE_REST = [ang(HIND.hip, HIND.stifle), ang(HIND.stifle, HIND.hock), ang(HIND.hock, HIND.fetlock), HIND_REST.pastern, HIND_REST.hoof];

function setChain(rig: AutoRig, names: string[], worldDeltas: number[]) {
  let parent = 0;
  names.forEach((name, i) => { rig.set(name, [0, 0, wrap(worldDeltas[i] - parent)]); parent = worldDeltas[i]; });
}

/** Pose the rig at stride time t ∈ [0, 1). Pure: the same t always gives the same pose. */
export function poseHorseGallop(rig: AutoRig, t: number, options: HorseGallopOptions = {}): HorseGallopDiagnostics {
  const body = bodyMotion(t, options);
  // Trunk: rotate about the centre of mass, then bob. Offset is relative to the trunk bone's head.
  const trunkOffset = add(sub(add(CENTRE_OF_MASS, rot(sub(TRUNK_HEAD, CENTRE_OF_MASS), body.pitch)), TRUNK_HEAD), [0, body.bob]);
  rig.set("trunk", [0, 0, body.pitch], [trunkOffset[0], trunkOffset[1], 0]);
  rig.set("pelvis", [0, 0, body.lumbar]);
  // Clip space → trunk rest frame → pelvis rest frame.
  const toTrunk: Frame = p => add(TRUNK_HEAD, rot(sub(p, add(TRUNK_HEAD, trunkOffset)), -body.pitch));
  const toPelvis: Frame = p => about(toTrunk(p), PELVIS_HEAD, -body.lumbar);
  const reach = {} as Record<HorseLeg, number>, stance = {} as Record<HorseLeg, boolean>;
  for (const leg of HORSE_LEGS) {
    const plan = legPlan(leg, options);
    if (leg.startsWith("fore")) {
      const pose = forePose(plan, t, toTrunk, body.pitch) as LegPose & { scapula: number };
      const [shoulder, elbow, carpus, fetlock] = pose.joints, d = pose.distal;
      const angles = [FORE_BONE_REST[0] + pose.scapula, ang(shoulder, elbow), ang(elbow, carpus), ang(carpus, fetlock), d.pasternAngle, d.hoofAngle];
      const deltas = angles.map((a, i) => wrap(a - FORE_BONE_REST[i]));
      const n = leg;
      setChain(rig, [`${n}-scapula`, `${n}-humerus`, `${n}-forearm`, `${n}-cannon`, `${n}-pastern`, `${n}-hoof`], deltas);
      // The scapula turns about a point a third down the blade, not its top.
      const top = about(FORE.scapulaTop, SCAPULA_PIVOT, pose.scapula);
      const bone = rig.bones.get(`${n}-scapula`)!;
      bone.position.x += top[0] - FORE.scapulaTop[0]; bone.position.y += top[1] - FORE.scapulaTop[1];
      reach[leg] = pose.reach; stance[leg] = pose.stance;
    } else {
      const pose = hindPose(plan, t, toPelvis, body.pitch + body.lumbar);
      const [hip, stifle, hock, fetlock] = pose.joints, d = pose.distal;
      const angles = [ang(hip, stifle), ang(stifle, hock), ang(hock, fetlock), d.pasternAngle, d.hoofAngle];
      const deltas = angles.map((a, i) => wrap(a - HIND_BONE_REST[i]));
      setChain(rig, [`${leg}-femur`, `${leg}-tibia`, `${leg}-cannon`, `${leg}-pastern`, `${leg}-hoof`], deltas);
      reach[leg] = pose.reach; stance[leg] = pose.stance;
    }
  }
  // Neck and head: carried forward and lower at speed, nodding once per stride (down as the fores load).
  const nod = Math.cos(TAU * (t - .52));
  rig.set("neck-0", [0, 0, -9 * DEG - 4 * DEG * nod - body.pitch * .6]);
  rig.set("neck-1", [0, 0, -3 * DEG - 2.5 * DEG * nod]);
  rig.set("head", [0, 0, 6 * DEG + 3.5 * DEG * nod]);
  rig.set("ear-near", [0, .15, -.25]); rig.set("ear-far", [0, -.15, -.25]);
  // Tail raised and streaming, lagging the body's pitch.
  const lag = (k: number) => Math.sin(TAU * (t - .1 - k * .07));
  // Plate 626: the tail streams out behind, near horizontal, the hair drooping at the end.
  const tail = [-28, -12, -8, -10, -2, 0, 3, 4];
  tail.forEach((deg, i) => rig.set(`tail-${i}`, [.06 * lag(i + 2), .05 * lag(i + 1), (deg + 4 * lag(i)) * DEG]));
  return { reach, stance };
}

/** Standing square: breathing, a slow head drift, ears turning, tail swishing. */
export function poseHorseStand(rig: AutoRig, t: number) {
  const a = TAU * t;
  rig.set("trunk", [0, 0, 0], [0, .004 * Math.sin(a * 3), 0]);
  rig.set("neck-0", [0, .02 * Math.sin(a), .03 * Math.sin(a * 2 + .4)]);
  rig.set("head", [0, .04 * Math.sin(a + .8), -.02 * Math.sin(a * 2)]);
  rig.set("ear-near", [0, -.3 * Math.max(0, Math.sin(a * 2)), 0]);
  rig.set("ear-far", [0, .25 * Math.max(0, Math.sin(a * 3 + 1)), 0]);
  for (let i = 0; i < 8; i++) rig.set(`tail-${i}`, [.11 * Math.sin(a * 2 - i * .35) * (i / 7 + .2), 0, 0]);
}
