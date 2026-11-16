/**
 * ANIM1 construction: a style-neutral side view of any animal. It is built from the animal's body plan and its species'
 * proportions, and posed by the shared gait table.
 *
 * Every art style paints over the same skeleton:
 * - masses (chest, waist, pelvis, cranium);
 * - leg chains on real foot postures;
 * - neck, head, muzzle, ear and eye;
 * - tail;
 * - for birds, a body egg, wing and bill; for fish, a spindle and fins.
 *
 * Postures (sit, lie, rest, rear; `animal-postures.ts`) fold the same legs onto the ground, and birds fly on open
 * wings (`animal-flight.ts`).
 *
 * A crayon fox and a woodblock fox then stand on the same legs. `skeletonShapes` turns a pose into path data for a
 * silhouette and for each coat region, so a colour map or a fur map is painted the same way for every species.
 *
 * Units: shoulder heights (quadrupeds) or total lengths (birds, fish); y up, ground at 0, the animal facing +x.
 */
import { BODY_PLANS } from "./animal-plans";
import type { AnimalRegion, BodyPlan, BodyPlanId, PlanConstruction } from "./animal-plans";
import { findAnimal } from "./animal-species";
import type { AnimalSpecies, ConstructionKey, Grade } from "./animal-species";
import { ANIMAL_GAITS, quadBody, quadFootfalls } from "./animal-gaits";
import { ANIMAL_POSTURES, BIRD_POSTURES, birdPostureFits, postureFit } from "./animal-postures";
import { birdFlight, foldedPoint, glideStroke, mixStroke, placeWing, projectWing, wingPlanform, wingStroke } from "./animal-flight";
import type { BirdFlight, FlightMode, PlanformPoint, WingPoint3 } from "./animal-flight";
import type { BirdPostureId, PostureFit, PostureId } from "./animal-postures";
import type { AnimalGait, GaitId, QuadLeg } from "./animal-gaits";

import { RAD, add, circlePoints, dir, ellipsePoints, len, lerpP, polyPath as poly, rotate, smoothClosedPath, smoothTube, smoothstep, sub, tubePoints } from "./foundation-shapes";
import type { FPoint } from "./foundation-shapes";

export type AnimalPoint = FPoint;
export { ellipsePoints, smoothClosedPath, tubePoints };
export type RangePick = "min" | "typical" | "max";

export interface AnimalConstruction extends PlanConstruction {
  plan: BodyPlan;
  species?: AnimalSpecies;
  /** Where each number came from: the species' graded range, or the plan's typical value. */
  grades: Record<ConstructionKey, Grade | "plan">;
}

export const CONSTRUCTION_KEYS: readonly ConstructionKey[] = ["trunk", "chestDepth", "legClearance", "head", "muzzle", "neck", "neckAngle", "tail", "girth", "barrel", "headAngle", "bodyAngle"];

/**
 * The construction for a species (by id, by the id it is drawn by in a style, or by romaji) or for a whole body plan.
 * `pick` takes each graded range's low, typical or high value; `overrides` replaces any number (a stylisation).
 */
export function animalConstruction(subject: string | AnimalSpecies, pick: RangePick = "typical", overrides: Partial<PlanConstruction> = {}): AnimalConstruction {
  const species = typeof subject === "string" ? findAnimal(subject) : subject;
  const plan = species ? BODY_PLANS[species.plan] : BODY_PLANS[subject as BodyPlanId];
  if (!plan) throw new Error(`Unknown animal or body plan "${typeof subject === "string" ? subject : subject.id}"`);
  const c: PlanConstruction = { ...plan.construction };
  const grades = {} as Record<ConstructionKey, Grade | "plan">;
  for (const k of CONSTRUCTION_KEYS) {
    const r = species?.proportions[k];
    if (r) { (c as unknown as Record<ConstructionKey, number>)[k] = r[pick]; grades[k] = r.grade; } else grades[k] = "plan";
  }
  const p = species?.proportions;
  if (p?.back) c.back = p.back;
  if (p?.ear) c.ear = p.ear;
  if (p?.tailCarriage) c.tailCarriage = p.tailCarriage;
  return { ...c, ...overrides, plan, species, grades };
}

/** Head-and-body length (nose to tail root, laid straight) in shoulder heights: trunk + neck + head. */
export const headBodyLength = (c: Pick<PlanConstruction, "trunk" | "neck" | "head">) => c.trunk + c.neck + c.head;

export interface AnimalLimb {
  leg: QuadLeg;
  fore: boolean;
  far: boolean;
  /** Top joint (shoulder or hip), knee or elbow, carpus or hock, fetlock or toe joint, toe tip. */
  points: AnimalPoint[];
  widths: number[];
  onGround: boolean;
}
export interface AnimalEllipse { cx: number; cy: number; rx: number; ry: number; angle: number }
export interface AnimalSkeleton {
  kind: "quadruped" | "bird" | "fish";
  c: AnimalConstruction;
  /** Named landmarks: withers, pointOfShoulder, brisket, pointOfButtock, croup, hip, shoulder, occiput, nose, eye, tailRoot, … */
  joints: Record<string, AnimalPoint>;
  limbs: AnimalLimb[];
  masses: Record<string, AnimalEllipse>;
  /** The back from the tail root forward to the nape. */
  topLine: AnimalPoint[];
  neck: { points: AnimalPoint[]; widths: number[] };
  /** `eyeClosed`: asleep (a sleeping bird), so painters draw the lid instead of the eye. */
  head: { cranium: AnimalEllipse; muzzle: AnimalPoint[]; ear?: AnimalPoint[]; eye: AnimalPoint; eyeR: number; nose: AnimalPoint; axis: number; eyeClosed?: boolean };
  tail: { points: AnimalPoint[]; widths: number[] };
  fins: AnimalPoint[][];
  legLength: { fore: number; hind: number };
  /** Closed contours for a smooth silhouette: the trunk (quadrupeds) and the head with its muzzle. */
  outline: { trunk?: AnimalPoint[]; head?: AnimalPoint[] };
  /** A flying bird's open wings, projected to the side view: the outline, the bones (shoulder, elbow, wrist, tip) and the secondaries' band. */
  wings?: { near: OpenWing; far: OpenWing };
}
export interface OpenWing { outline: AnimalPoint[]; bones: AnimalPoint[]; secondaries: AnimalPoint[] }
export interface PoseOptions {
  /** A gait from `ANIMAL_GAITS` (default: standing). */
  gait?: GaitId;
  /** 0–1 through the stride. */
  t?: number;
  /**
   * A posture from `ANIMAL_POSTURES` (four-legged animals). A plan that does not take it naturally, or a species that
   * cannot rear, stands instead. A posture overrides the gait.
   */
  posture?: PostureId;
  /**
   * 0 standing … 1 the full posture, eased: animate it over the posture's `frames` to sit down, lie down or rear. For a
   * bird gliding or closed, how far the wing has moved from the top of the stroke into the held position.
   */
  amount?: number;
  /**
   * A bird in the air (`animal-flight.ts`): flapping at `t` through the beat (0 the top of the stroke), gliding, or
   * with the wings closed between bursts (bounding). Use `flightAt` to turn seconds into these.
   */
  flight?: FlightMode;
  /** How far above the side view the camera sits for the open wings (degrees, default 12), so both wings read. */
  view?: number;
  /** A bird's posture (`BIRD_POSTURES`): on one leg, asleep, swimming or upending; eased in by `amount`. */
  birdPosture?: BirdPostureId;
  /** Where the water's surface is (model y) for a swimming bird; set by the posture's waterline when left out. */
  water?: number;
}

/** Direction at `a` degrees from straight down, + toward the nose. */
const down = (a: number): AnimalPoint => [Math.sin(a * RAD), -Math.cos(a * RAD)];
const angleDown = (v: AnimalPoint) => Math.atan2(v[0], -v[1]) / RAD;

/** Standing segment angles from straight down (+ toward the nose) for upper, lower, cannon and toes, by foot posture. */
const STAND: Record<"plantigrade" | "digitigrade" | "unguligrade", { fore: readonly number[]; hind: readonly number[] }> = {
  plantigrade: { fore: [-28, 0, 80, 88], hind: [22, -38, 82, 88] },
  digitigrade: { fore: [-30, 0, 12, 75], hind: [25, -40, 12, 75] },
  unguligrade: { fore: [-30, 0, 4, 45], hind: [25, -40, 6, 45] },
};
const BIRD_STAND = [30, -35, 8, 85] as const;
const CROUP: Record<PlanConstruction["back"], number> = { level: .98, sloping: .9, arched: .95, roached: .97 };
const LOINS: Record<PlanConstruction["back"], number> = { level: .98, sloping: .93, arched: 1.02, roached: 1.06 };

/** A leg's length so that, at its standing angles, it reaches the ground from `topY`. */
const legLengthFor = (topY: number, fr: readonly number[], ang: readonly number[]) => topY / fr.reduce((s, f, i) => s + f * Math.cos(ang[i] * RAD), 0);

/**
 * Solve one leg: the foot target, the distal angles (cannon, toes) and a two-bone IK from the top joint to the carpus
 * or hock. Fore elbows bend back, hind stifles forward.
 */
function solveLeg(top: AnimalPoint, foot: AnimalPoint, lens: readonly number[], aCannon0: number, aToes0: number, fore: boolean): AnimalPoint[] {
  const ankleAt = (c: number, t: number) => add(add(foot, down(t), -lens[3]), down(c), -lens[2]);
  let aCannon = aCannon0, aToes = aToes0, ankle = ankleAt(aCannon, aToes);
  // When the leg cannot reach its planted foot with the joints bent, it straightens (the heel and the wrist lift, the
  // cannon and toes turn toward the line to the foot) only as far as it must, so a slowly moving foot never snaps.
  if (len(sub(ankle, top)) > lens[0] + lens[1]) {
    const line = angleDown(sub(foot, top)), turn = (a: number, k: number) => a + (((line - a + 540) % 360) - 180) * k;
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (len(sub(ankleAt(turn(aCannon0, m), turn(aToes0, m)), top)) > lens[0] + lens[1]) lo = m; else hi = m; }
    aCannon = turn(aCannon0, hi); aToes = turn(aToes0, hi); ankle = ankleAt(aCannon, aToes);
  }
  const u = lens[0], l = lens[1], v = sub(ankle, top), d0 = len(v) || 1e-6;
  const d = Math.min(u + l - 1e-6, Math.max(Math.abs(u - l) + 1e-6, d0)), n: AnimalPoint = [v[0] / d0, v[1] / d0];
  if (d0 > u + l) ankle = add(top, n, d);   // out of reach: the leg straightens and the foot lifts a little
  const along = (u * u - l * l + d * d) / (2 * d), h = Math.sqrt(Math.max(0, u * u - along * along));
  // Perpendicular: rotate n by +90° (counter-clockwise) for hind stifles (forward when the leg points down).
  const perp: AnimalPoint = fore ? [n[1], -n[0]] : [-n[1], n[0]];
  const knee = add(add(top, n, along), perp, h);
  const cannonEnd = add(ankle, down(aCannon), lens[2]);
  return [top, knee, ankle, cannonEnd, add(cannonEnd, down(aToes), lens[3])];
}

/** Forward kinematics: a leg from its top joint along segment angles from straight down (+ toward the nose). */
function fkLeg(top: AnimalPoint, lens: readonly number[], angles: readonly number[]): AnimalPoint[] {
  const pts = [top];
  for (let i = 0; i < 4; i++) pts.push(add(pts[i], down(angles[i]), lens[i]));
  return pts;
}

/**
 * Where to put the wrist (or hock) on the ground ahead of or behind `top` so the two-bone knee or elbow between them
 * rests at `rest` height: the forearm (or shin) lies along the ground. Returns the joint's ground point.
 */
function jointOnGround(top: AnimalPoint, u: number, l: number, groundY: number, rest: number, fore: boolean, sign: 1 | -1): AnimalPoint {
  let best: AnimalPoint = [top[0], groundY], err = Infinity;
  for (let i = 1; i <= 40; i++) {
    const d = (u + l) * (.3 + .65 * i / 40), h = top[1] - groundY;
    if (d <= h) continue;
    const at: AnimalPoint = [top[0] + sign * Math.sqrt(d * d - h * h), groundY];
    const v = sub(at, top), n: AnimalPoint = [v[0] / d, v[1] / d], along = (u * u - l * l + d * d) / (2 * d), k = Math.sqrt(Math.max(0, u * u - along * along));
    const perp: AnimalPoint = fore ? [n[1], -n[0]] : [-n[1], n[0]], mid = add(add(top, n, along), perp, k);
    const e = Math.abs(mid[1] - rest) + Math.max(0, groundY - mid[1]) * 10;
    if (e < err) { err = e; best = at; }
  }
  return best;
}

/** Pose a construction: standing, at `t` through a gait's stride, or in a posture. */
export function poseAnimal(c: AnimalConstruction, o: PoseOptions = {}): AnimalSkeleton {
  if (c.plan.group === "fish") return poseFish(c, o.t ?? 0);
  if (c.plan.group === "bird") return poseBird(c, o);
  return poseQuadruped(c, o);
}

const TAIL_ANGLES: Record<PlanConstruction["tailCarriage"], [number, number]> = {
  stub: [205, 215], hanging: [212, 262], raised: [150, 108], curled: [95, -40], up: [120, 100], trailing: [196, 186], level: [180, 180],
};
/** A tail's base and tip directions, eased by `down` (0–1) toward lying along the ground behind (a curled or stub tail keeps its shape). */
function tailAngles(carriage: PlanConstruction["tailCarriage"], down: number, wrap: boolean): [number, number] {
  const [a0, a1] = TAIL_ANGLES[carriage];
  if (carriage === "curled" || carriage === "stub" || down <= 0) return [a0, a1];
  // Wrapped: down from the root, then forward along the ground round the feet (a sitting cat).
  const [b0, b1] = wrap ? [240, 395] : [205, 178];
  return [a0 + (b0 - a0) * down, a1 + (b1 - a1) * down];
}
function tailPoints(root: AnimalPoint, length: number, carriage: PlanConstruction["tailCarriage"], sway: number, down = 0, wrap = false): AnimalPoint[] {
  const [a0, a1] = tailAngles(carriage, down, wrap), n = 8, pts: AnimalPoint[] = [root];
  for (let i = 0; i < n; i++) { const u = (i + .5) / n; pts.push(add(pts[i], dir(a0 + (a1 - a0) * u + sway * u), length / n)); }
  return pts;
}

function poseQuadruped(c: AnimalConstruction, o: PoseOptions): AnimalSkeleton {
  const fit: PostureFit | undefined = o.posture ? postureFit(c.plan.id, o.posture, c.species?.behaviour.canRear ?? c.plan.canRear) : undefined;
  const g: AnimalGait | undefined = !fit && o.gait ? ANIMAL_GAITS[o.gait] : undefined, t = o.t ?? 0;
  const body = g ? quadBody(g, t) : { bob: 0, pitch: 0, flex: 0, neck: 0 };
  const posture = c.plan.posture === "plantigrade" || c.plan.posture === "unguligrade" ? c.plan.posture : "digitigrade";
  // Postures are staged: each end of the body has its own window of the 0–1 amount. Cattle, deer, horses and pigs kneel
  // on the forelegs first, then lower the hindquarters; dogs, cats and the rest lower the rump first, then put the
  // forelegs down; sitting lowers the rump onto planted forefeet; rearing lifts the forehand over planted hind feet.
  const A = fit ? Math.min(1, Math.max(0, o.amount ?? 1)) : 0;
  const win = (a: number, w: readonly [number, number]) => smoothstep((a - w[0]) / (w[1] - w[0]));
  const kneels = c.plan.id === "ruminant" || c.plan.id === "equid" || c.plan.id === "suid";
  const lying = o.posture === "lie" || o.posture === "rest";
  const [foreWin, hindWin]: readonly [number, number][] = lying ? (kneels ? [[0, .6], [.35, 1]] : [[.3, 1], [0, .65]]) : o.posture === "sit" ? [[.15, 1], [0, .85]] : [[0, 1], [0, 1]];
  const pf = fit ? win(A, foreWin) : 0, ph = fit ? win(A, hindWin) : 0;
  // Sitting curls the loins: the spine flexes and the buttock-to-shoulder span shortens (up to 35%) until the chest
  // rises to the posture's pitch over upright forelegs.
  const T0 = c.trunk * (1 + .07 * body.flex), Cl = c.legClearance;
  const curlFull = o.posture === "sit" && fit
    ? Math.min(.35, Math.max(0, 1 - ((Cl + .28 * (1 - Cl)) * .99 - c.girth * 1.2) / (1.06 * T0 * Math.sin(fit.pitch.typical * RAD)))) : 0;
  const curl = curlFull * ph;
  const st = STAND[posture], D = c.chestDepth, T = T0 * (1 - curl);
  const croupY = CROUP[c.back], loinsY = LOINS[c.back] + .04 * body.flex + .17 * curl;
  const pivot: AnimalPoint = [-T / 2, Cl + D / 2];
  let bob = body.bob / 100 * .7;
  // Body-frame landmarks for a trunk of length `tl`.
  const shoulderAt = (tl: number): AnimalPoint => [-.02 * tl, Cl + .28 * (1 - Cl)], hipAt = (tl: number): AnimalPoint => [-.8 * tl, Cl + .28 * (croupY - Cl)];
  const shoulderJ = shoulderAt(T), hipJ = hipAt(T);
  // A posture turns the body frame by R and moves it by (tx, ty) (see below); standing, both are zero.
  let R = 0, tx = 0, ty = 0;
  const W = (p: AnimalPoint): AnimalPoint => add(rotate(p, body.pitch + R, pivot), [tx, bob + ty]);
  // Legs: lengths, resting feet (where the animal stood), footfalls and where each foot is this frame.
  const foreFr = c.fore, hindFr = c.hind;
  const Lf = legLengthFor(shoulderJ[1], foreFr, st.fore), Lh = legLengthFor(hipJ[1], hindFr, st.hind);
  const restFoot = (top: AnimalPoint, fr: readonly number[], ang: readonly number[], L: number) => fr.reduce<AnimalPoint>((p, f, i) => add(p, down(ang[i]), f * L), top);
  const restFore = restFoot(shoulderAt(T0), foreFr, st.fore, Lf), restHind = restFoot(hipAt(T0), hindFr, st.hind, Lh);
  const states = g ? quadFootfalls(g, t) : undefined;
  const sweep = g ? g.stride * Lf * g.stance : 0;
  const legOrder: readonly QuadLeg[] = ["hind-far", "fore-far", "hind-near", "fore-near"];
  // The posture at full strength, built on the fully curled trunk: where the shoulder and hip end up, and each leg
  // planted (a ground target and the cannon and toe angles) or lifted (segment angles).
  type LegGoal = { foot: AnimalPoint; aC: number; aT: number } | { angles: readonly number[] };
  let goals: { fore: LegGoal; hind: LegGoal } | undefined;
  if (fit) {
    const Tf = T0 * (1 - curlFull), pivotF: AnimalPoint = [-Tf / 2, Cl + D / 2], sJ = shoulderAt(Tf), hJ = hipAt(Tf);
    const pelvisRyF = (croupY - Math.max(Cl, Cl + D * (1 - c.barrel) * .9) - .02) / 2 * (.85 + .15 * c.barrel);
    const B0: AnimalPoint = [-1.02 * Tf, croupY - pelvisRyF * 1.1], S0: AnimalPoint = [.04 * Tf, sJ[1] - .02];
    const line0 = Math.atan2(S0[1] - B0[1], S0[0] - B0[0]) / RAD;
    let Rf = fit.pitch.typical - line0, txf = 0, tyf = 0;
    const Wf = (p: AnimalPoint): AnimalPoint => add(rotate(p, Rf, pivotF), [txf, tyf]);
    const lf = foreFr.map(f => f * Lf), lh = hindFr.map(f => f * Lh), reachF = len(sub(restFore, shoulderAt(T0))), reachH = len(sub(restHind, hipAt(T0)));
    const pad = c.girth * .6;
    // The hind legs folded: the hock on the ground behind the hip, placed so the stifle rests beside the flank above
    // the ground; the foot flat forward under the haunch.
    const foldedHind = (): LegGoal => {
      const H = Wf(hJ), hock = jointOnGround(H, lh[0], lh[1], pad, Math.max(pad * 2.2, H[1] * .55), false, -1);
      return { foot: [hock[0] + lh[2] + lh[3], hock[1]], aC: 90, aT: 90 };
    };
    if (o.posture === "sit") {
      // The rump on the ground and the forelegs upright: the pitch within the posture's range that sets the shoulder at
      // the forelegs' standing reach; never higher than they can reach.
      const hb = c.girth * 1.2, target = reachF * .99, height = (Rd: number) => rotate(sJ, Rd, pivotF)[1] + hb - rotate(B0, Rd, pivotF)[1];
      let lo = fit.pitch.min - line0, hi = fit.pitch.max - line0;
      if (height(hi) <= target) Rf = hi;
      else if (height(lo) >= target) { Rf = lo; while (height(Rf) > reachF * .995 && Rf > -line0) Rf -= 1; }
      else { for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (height(m) < target) lo = m; else hi = m; } Rf = (lo + hi) / 2; }
      tyf = hb - rotate(B0, Rf, pivotF)[1];
      const S = Wf(sJ), dx = Math.sqrt(Math.max(0, reachF * reachF - S[1] * S[1]));
      txf = restFore[0] - (S[0] + dx);
      goals = { fore: { foot: [restFore[0], 0], aC: st.fore[2], aT: st.fore[3] }, hind: foldedHind() };
    } else if (lying) {
      // The brisket on the folded forelegs (or on the ground beside flat forearms).
      tyf = (fit.fore === "folded" ? c.girth * 2.2 : c.girth * 1.1) - rotate([-.12 * Tf, Cl], Rf, pivotF)[1];
      const S = Wf(sJ);
      let fore: LegGoal;
      if (fit.fore === "folded") {
        // Wrist forward on the ground with the elbow down behind it, the cannon folded back under the forearm.
        const wrist = jointOnGround(S, lf[0], lf[1], pad, pad * 1.4, true, 1), aC = -92, aT = -125;
        fore = { foot: add(add(wrist, down(aC), lf[2]), down(aT), lf[3]), aC, aT };
      } else {
        // The sphinx: elbow on the ground, forearm and paw flat and forward.
        const wrist = jointOnGround(S, lf[0], lf[1], pad, pad * 1.2, true, 1);
        fore = { foot: [wrist[0] + lf[2] + lf[3], wrist[1]], aC: 90, aT: 90 };
      }
      goals = { fore, hind: foldedHind() };
    } else {
      // Rear: the hind feet stay planted and the body rises over them on straight or deeply bent hocks.
      const hipH = (fit.hind === "straight" ? .97 : .78) * reachH, H0 = rotate(hJ, Rf, pivotF);
      txf = restHind[0] - .03 * Tf - H0[0]; tyf = hipH - H0[1];
      const hind: LegGoal = fit.hind === "flexed" ? { foot: [restHind[0], 0], aC: st.hind[2] + 35, aT: st.hind[3] } : fit.hind === "folded" ? foldedHind() : { foot: [restHind[0], 0], aC: st.hind[2], aT: st.hind[3] };
      // Lifted forelegs: tucked (forearm forward, cannon hanging back) or hanging loose before the chest.
      const fore: LegGoal = { angles: fit.fore === "tucked" ? [25, 95, -15, 10] : [25, 50, 25, 35] };
      goals = { fore, hind };
    }
    // This frame: the shoulder moves toward its end place by the fore window, the hip by the hind window; the body turns
    // to lie along the line between them and is placed on the hip.
    const S1 = Wf(sJ), H1 = Wf(hJ), s0 = shoulderAt(T0), h0 = hipAt(T0);
    const St = lerpP(s0, S1, pf), Ht = lerpP(h0, H1, ph);
    R = (Math.atan2(St[1] - Ht[1], St[0] - Ht[0]) - Math.atan2(shoulderJ[1] - hipJ[1], shoulderJ[0] - hipJ[0])) / RAD;
    const Hr = rotate(hipJ, R, pivot); tx = Ht[0] - Hr[0]; ty = Ht[1] - Hr[1];
  }
  // Each leg's share of its end's progress: the far leg moves first, the near one after, so one foot of a pair is
  // always down while the other steps.
  const legProgress = (i: number) => {
    const fore = legOrder[i].startsWith("fore"), p = fore ? pf : ph, far = legOrder[i].endsWith("far");
    return smoothstep((p - (far ? 0 : .3)) / .7);
  };
  const footAt = (i: number): AnimalPoint => {
    const fore = legOrder[i].startsWith("fore"), rest = fore ? restFore : restHind, s = states?.[i];
    const goal = goals?.[fore ? "fore" : "hind"];
    if (goal && "foot" in goal) {
      // Planted posture feet move from where they stood, lifting a little on the way so they step, not slide.
      const k = legProgress(i), dx = goal.foot[0] - rest[0], lift = Math.abs(dx) > .03 ? Math.sin(Math.PI * k) * .08 * (fore ? Lf : Lh) : 0;
      return [rest[0] + dx * k, goal.foot[1] * k + lift];
    }
    if (!s) return [rest[0], 0];
    return s.onGround ? [rest[0] + sweep * (.5 - s.progress), 0] : [rest[0] - sweep / 2 + sweep * smoothstep(s.progress), s.lift * (fore ? Lf : Lh)];
  };
  // The body sinks onto its planted legs: never so high that a planted foot is out of reach of a straight leg.
  if (states) {
    let drop = 0;
    states.forEach((s, i) => {
      if (!s.onGround) return;
      const fore = legOrder[i].startsWith("fore"), top = W(fore ? shoulderJ : hipJ), F = footAt(i), reach = (fore ? Lf : Lh) * .995, dx = F[0] - top[0];
      drop = Math.max(drop, top[1] - Math.sqrt(Math.max(0, reach * reach - dx * dx)));
    });
    bob -= drop;
  }
  const waistBottom = Cl + D * (1 - c.barrel) * .9;
  const masses: Record<string, AnimalEllipse> = {};
  const ell = (cx: number, cy: number, rx: number, ry: number): AnimalEllipse => { const p = W([cx, cy]); return { cx: p[0], cy: p[1], rx, ry, angle: body.pitch + R }; };
  masses.chest = ell(-.26 * T, Cl + D * .5, .3 * T, D * .5);
  masses.waist = ell(-.55 * T, (loinsY - .03 + waistBottom) / 2, .24 * T, (loinsY - .03 - waistBottom) / 2);
  const pelvisRy = (croupY - Math.max(Cl, waistBottom) - .02) / 2 * (.85 + .15 * c.barrel);
  masses.pelvis = ell(-.82 * T, croupY - pelvisRy - .02, .2 * T, pelvisRy);
  const joints: Record<string, AnimalPoint> = {
    withers: W([-.14 * T, 1]), pointOfShoulder: W([.04 * T, shoulderJ[1] - .02]), brisket: W([-.12 * T, Cl]), loins: W([-.58 * T, loinsY]),
    croup: W([-.82 * T, croupY]), pointOfButtock: W([-1.02 * T, croupY - pelvisRy * 1.1]), shoulder: W(shoulderJ), hip: W(hipJ),
  };
  const tailRoot = W([-.98 * T, croupY - .06]);
  joints.tailRoot = tailRoot;
  const limbs: AnimalLimb[] = [];
  for (let i = 0; i < 4; i++) {
    const leg = legOrder[i], fore = leg.startsWith("fore"), far = leg.endsWith("far");
    const fr = fore ? foreFr : hindFr, L = fore ? Lf : Lh, ang = fore ? st.fore : st.hind;
    const top = W(fore ? shoulderJ : hipJ), lens = fr.map(f => f * L);
    const foot = footAt(i);
    let aC = ang[2], aT = ang[3], onGround = true;
    const s = states?.[i];
    if (s && g) {
      onGround = s.onGround;
      if (s.onGround) {
        // Late in the stance the heel (or the wrist pad) lifts and the foot rolls onto the toes.
        const k = smoothstep((s.progress - .6) / .4), line = angleDown(sub(foot, top));
        aC += (line - aC) * .6 * k; aT += (Math.min(aT, line + 60) - aT) * k;
      } else {
        // In the swing the wrist folds the fore foot back under the forearm; the hock flexes the hind foot forward.
        const flex = Math.sin(Math.PI * Math.min(1, s.progress * 1.25)), fast = g.id === "walk" || g.id === "amble" ? .65 : 1;
        if (fore) { aC -= (posture === "plantigrade" ? 70 : 115) * fast * flex; aT = aC + 25 + (ang[3] - ang[2] - 25) * (1 - flex); }
        else { aC += 45 * fast * flex; aT = aC + 15 + (ang[3] - ang[2] - 15) * (1 - flex); }
      }
    }
    const goal = goals?.[fore ? "fore" : "hind"];
    let points: AnimalPoint[];
    if (goal && "angles" in goal) {
      // A lifted leg eases from its standing segment angles to the posture's.
      const a0 = [ang[0], ang[1], ang[2], ang[3]], k = fore ? pf : ph;
      points = fkLeg(top, lens, a0.map((a, j) => a + (goal.angles[j] - a) * k)); onGround = k < .05;
    } else {
      if (goal) { const k = legProgress(i); aC += (goal.aC - aC) * k; aT += (goal.aT - aT) * k; }
      points = solveLeg(top, foot, lens, aC, aT, fore);
      // A folded leg too long for the low hip splays out sideways; seen from the side it shortens and the knee rests on
      // the ground instead of sinking through it.
      if (goal && points[1][1] < c.girth * .5) points[1] = [points[1][0], c.girth * .5];
    }
    const w0 = c.girth * (fore ? 1 : 1.25), widths = [w0 * 1.6, w0 * .85, w0 * .62, w0 * .55, w0 * .5].map((w, j) => (j === 0 && posture === "plantigrade" ? w * 1.1 : w));
    limbs.push({ leg, fore, far, points, widths, onGround });
  }
  joints.elbow = limbs[3].points[1]; joints.carpus = limbs[3].points[2]; joints.stifle = limbs[2].points[1]; joints.hock = limbs[2].points[2];
  // Neck, head, ear, eye.
  const neckRoot = W([-.02 * T, (1 + shoulderJ[1]) / 2 + .04]), neckLen = Math.max(c.neck, .08);
  const cranLen = c.head * (1 - c.muzzle), ry = c.head * (.12 + .14 * (1 - c.muzzle));
  const pd = fit && o.posture ? ANIMAL_POSTURES[o.posture] : undefined;
  let nAngle = c.neckAngle + body.neck * .6 + body.pitch + (pd ? R * pd.neckFollows : 0);
  let axis = -c.headAngle + body.neck * .4 + body.pitch + (pd ? R * pd.headFollows : 0);
  if (pd?.head === "down") {
    // The head goes down once the body is down.
    const hd = win(A, [.55, 1]);
    // Resting: the neck lowers until the jaw lies on the ground, the head level or tipped a little down.
    const k = Math.max(-1, Math.min(1, (ry * 1.05 - neckRoot[1]) / neckLen)), low = Math.asin(k) / RAD;
    nAngle += (low - nAngle) * hd;
    const occY = neckRoot[1] + Math.sin(nAngle * RAD) * neckLen, flat = Math.asin(Math.max(-1, Math.min(1, (ry * .6 - occY) / c.head))) / RAD;
    axis += (Math.min(0, flat) - axis) * hd;
  }
  const occiput = add(neckRoot, dir(nAngle), neckLen);
  const neckMid = add(lerpP(neckRoot, occiput, .5), dir(nAngle + 90), c.neck * .06);
  const ax = dir(axis), up = dir(axis + 90);
  const cc = add(occiput, ax, cranLen * .5), cranium: AnimalEllipse = { cx: cc[0], cy: cc[1], rx: cranLen * .62, ry, angle: axis };
  const nose = add(occiput, ax, c.head), mb = add(occiput, ax, cranLen * .9);
  const muzzle: AnimalPoint[] = [add(mb, up, ry * .85), add(nose, up, ry * .4), add(nose, up, -ry * .35), add(mb, up, -ry * .95)];
  // A species' measured face places the eye and sizes it and the ear; otherwise the eye sits at the stop.
  const face = c.species?.face;
  const eye = add(add(occiput, ax, face ? c.head * (1 - face.eyeFromNose) : cranLen * .82), up, ry * .3), eyeR = face ? c.head * face.eye / 2 : c.head * .045;
  let ear: AnimalPoint[] | undefined;
  if (c.ear) {
    const base = add(add(occiput, ax, cranLen * .3), up, ry * .92), back = { round: 30, pointed: 18, leaf: 55, long: 52 }[c.ear.shape];
    const earLen = (face?.ear ?? c.ear.length) * c.head;
    const tip = add(base, dir(axis + 90 + back), earLen), w = c.ear.width * c.head * (face?.ear ? face.ear / c.ear.length : 1), side = dir(axis);
    // Width across the ear, from its front edge to its back edge, at stations along it (base → tip).
    const prof = { round: [.5, .56, .52, .38, .12], pointed: [.5, .42, .3, .16, .02], leaf: [.3, .5, .5, .34, .05], long: [.32, .5, .48, .36, .08] }[c.ear.shape];
    const st2 = prof.map((_, i) => i / (prof.length - 1)), front = st2.map((u, i) => add(lerpP(base, tip, u), side, w * prof[i])), backEdge = st2.map((u, i) => add(lerpP(base, tip, u), side, -w * prof[i]));
    ear = [...front, tip, ...backEdge.reverse()];
  }
  Object.assign(joints, { neckRoot, occiput, nose, eye });
  const neckW0 = D * .6, neckW1 = ry * 1.7;
  // Tail.
  const tailLen = c.tail * headBodyLength(c), bushy = c.species?.coat.long.includes("tail") && c.tail >= .25 ? 2.2 : 1;
  // On the ground (sitting, lying) the tail lies along it rather than through it.
  const tailDown = o.posture === "sit" || lying ? ph : 0;
  const tp = tailPoints(tailRoot, tailLen, c.tailCarriage, (g ? 10 * Math.sin(2 * Math.PI * t) : 0) - body.pitch, tailDown, fit?.tail === "wrap").map(q => (q[1] < c.girth * .5 ? [q[0], c.girth * .5] as AnimalPoint : q));
  // A long-haired tail is a brush: fullest past its middle, about a fifth of its length across (a fox's).
  const tw0 = Math.max(.025, c.girth * .45);
  const tailW = tp.map((_, i) => { const u = i / (tp.length - 1); return bushy > 1 ? tailLen * .2 * (.45 + .55 * Math.sin(Math.PI * Math.min(1, .15 + u * .95))) : tw0 * (1 - .75 * u); });
  const topLine = [tailRoot, joints.croup, joints.loins, W([-.32 * T, .99]), joints.withers, lerpP(neckRoot, occiput, .4)];
  // The trunk as one contour: rump, back, withers, the front of the chest, the brisket, the belly and the flank.
  const pelvisBottom = croupY - pelvisRy * 2 - .02;
  const trunkOutline = ([[-1.02 * T, croupY - pelvisRy * 1.1], [-.9 * T, croupY - .01], [-.72 * T, (croupY + loinsY) / 2 + .005], [-.5 * T, (loinsY + .99) / 2],
    [-.3 * T, .99], [-.14 * T, 1], [-.02 * T, .96], [.05 * T, shoulderJ[1] + .1], [.07 * T, shoulderJ[1] - .02], [.03 * T, Cl + D * .18], [-.12 * T, Cl],
    [-.36 * T, Cl + .015], [-.58 * T, waistBottom], [-.72 * T, (waistBottom + pelvisBottom) / 2 + .02], [-.86 * T, pelvisBottom + .02], [-.98 * T, pelvisBottom + pelvisRy * .5]] as AnimalPoint[]).map(W);
  const muzzleTip = c.plan.id === "suid" ? .55 : c.muzzle > .45 ? .42 : .5;
  const headOutline: AnimalPoint[] = [add(add(occiput, ax, -cranLen * .08), up, ry * .55), add(add(occiput, ax, cranLen * .3), up, ry * 1.02), add(add(occiput, ax, cranLen * .78), up, ry * .9),
    add(add(nose, ax, -c.head * c.muzzle * .45), up, ry * (muzzleTip + .2)), add(nose, up, ry * muzzleTip * .8), add(nose, up, -ry * muzzleTip * .6),
    add(add(nose, ax, -c.head * c.muzzle * .3), up, -ry * .62), add(add(occiput, ax, cranLen * .7), up, -ry * 1.0), add(add(occiput, ax, cranLen * .15), up, -ry * .95), add(occiput, up, -ry * .3)];
  return {
    kind: "quadruped", c, joints, limbs, masses, topLine,
    neck: { points: [neckRoot, neckMid, occiput], widths: [neckW0, (neckW0 + neckW1) / 2, neckW1] },
    head: { cranium, muzzle, ear, eye, eyeR, nose, axis }, tail: { points: tp, widths: tailW }, fins: [], legLength: { fore: Lf, hind: Lh },
    outline: { trunk: trunkOutline, head: headOutline },
  };
}

function poseBird(c: AnimalConstruction, o: PoseOptions): AnimalSkeleton {
  const fl = o.flight && c.species ? birdFlight(c.species) : undefined;
  if (fl && o.flight) return poseBirdFlight(c, o.flight, o.t ?? 0, o.amount ?? 1, o.view ?? 12, fl);
  const bp = o.birdPosture && birdPostureFits(c.plan.id, o.birdPosture) ? BIRD_POSTURES[o.birdPosture] : undefined, k = bp ? smoothstep(o.amount ?? 1) : 0;
  const g = !bp && o.gait ? ANIMAL_GAITS[o.gait] : undefined, t = o.t ?? 0;
  const a0 = c.bodyAngle ?? 20, a = a0 + ((bp?.bodyAngle?.typical ?? a0) - a0) * k;
  const rx = c.trunk / 2, ry = c.chestDepth / 2 * (1 + ((bp?.fluff ?? 1) - 1) * k), Cl = c.legClearance;
  const lift = Math.sqrt((rx * Math.sin(a0 * RAD)) ** 2 + (ry * Math.cos(a0 * RAD)) ** 2);
  const bob = g ? Math.abs(Math.sin(2 * Math.PI * t)) * .01 : 0;
  // Afloat, the body settles until the waterline sits at its share of the body's depth (the legs hang below, unseen).
  const water = o.water ?? Cl * .5, floatY = bp?.waterline ? water + ry * (1 - 2 * bp.waterline.typical) : undefined;
  // Upending, the body tips forward about its middle at the surface, so the tail rises and the breast goes under.
  const tipDrop = bp?.id === "upend" ? rx * .1 * k : 0;
  const centre: AnimalPoint = [0, floatY !== undefined ? (Cl + lift) + (floatY - tipDrop - Cl - lift) * k : Cl + lift + bob], ax = dir(a), up = dir(a + 90);
  const body: AnimalEllipse = { cx: centre[0], cy: centre[1], rx, ry, angle: a };
  const wingC = add(add(centre, ax, -rx * .2), up, ry * .25), wing: AnimalEllipse = { cx: wingC[0], cy: wingC[1], rx: rx * 1.08, ry: ry * .62, angle: a - 6 };
  const neckRoot = add(add(centre, ax, rx * .62), up, ry * .45);
  const nod = g ? 6 * Math.sin(2 * Math.PI * t * 2) : 0;
  // The neck: standing up, hunched down onto the shoulders, turned back over the shoulder (asleep), or reaching down
  // into the water (upending).
  const standCrown = add(neckRoot, dir(c.neckAngle), Math.max(c.neck, .02)), pose = bp?.head ?? "up";
  const goalCrown = pose === "hunched" ? add(neckRoot, dir(c.neckAngle + 10), Math.max(c.neck * .3, .02))
    : pose === "tucked" ? add(add(centre, ax, rx * .05), up, ry * .75)
      : pose === "under" ? add(neckRoot, dir(a - 15), Math.max(c.neck, .02) * 1.05) : standCrown;
  const crown = lerpP(standCrown, goalCrown, k);
  const neckMid = pose === "tucked" ? lerpP(add(lerpP(neckRoot, standCrown, .5), dir(c.neckAngle - 90), c.neck * .12), add(neckRoot, up, ry * .55), k)
    : add(lerpP(neckRoot, crown, .5), dir(c.neckAngle - 90), c.neck * .12 * (1 - k * .6));
  // A species' measured face sets the head's depth and places the eye back from the bill tip.
  const face = c.species?.face, cranLen = c.head * (1 - c.muzzle);
  // Asleep the head faces back with the bill laid along the back; upending, it points down along the neck.
  const headGoal = pose === "tucked" ? 180 + a + 12 : pose === "under" ? a - 20 : pose === "hunched" ? -c.headAngle - 8 : -c.headAngle;
  const hr = face ? c.head * face.depth / 2 : cranLen * .5, axis = -c.headAngle + nod + (headGoal + c.headAngle) * k, hx = dir(axis), hu = dir(axis + 90);
  const cranium: AnimalEllipse = { cx: crown[0], cy: crown[1], rx: cranLen * .55, ry: hr, angle: axis };
  const billBase = add(crown, hx, cranLen * .425), nose = add(billBase, hx, c.head * c.muzzle);
  const muzzle: AnimalPoint[] = [add(billBase, hu, hr * .45), add(nose, hu, hr * .05), add(nose, hu, -hr * .05), add(billBase, hu, -hr * .4)];
  const eye = face ? add(add(nose, hx, -c.head * face.eyeFromNose), hu, hr * .25) : add(add(crown, hx, hr * .3), hu, hr * .2);
  // Afloat, a duck's tail is cocked up behind.
  const tailRoot = add(centre, ax, -rx * .85), tailEnd = add(tailRoot, dir(180 + a - 8 - (bp?.waterline ? 22 * k : 0)), c.tail);
  const hip = add(add(centre, ax, -rx * .08), up, -ry * .25);
  // Long-legged waders stand on nearly straight legs; perching birds crouch.
  const stand = Cl > .4 ? [20, -12, 4, 85] : BIRD_STAND;
  const L = legLengthFor(hip[1], c.hind, stand), lens = c.hind.map(f => f * L);
  const restX = c.hind.reduce((x, f, i) => x + Math.sin(stand[i] * RAD) * f * L, hip[0]);
  const states = g ? quadFootfalls(g, t) : undefined, sweep = g ? g.stride * L * g.stance * .6 : 0;
  const limbs: AnimalLimb[] = [];
  for (const [i, leg] of [[0, "hind-far"], [2, "hind-near"]] as const) {
    const s = states?.[i];
    let foot: AnimalPoint = [restX, 0], aT = stand[3], aC = stand[2];
    if (bp?.waterline || (bp?.oneLeg && leg === "hind-far")) {
      // Paddling under water, or drawn up into the belly feathers: the thigh hidden, the shin folded up against the
      // belly and the foot tucked under. A long-legged wader's shin is longer than the body is deep, so it hangs back
      // down along the standing leg with only the ankle raised (the heron on its stump).
      const wader = lens[1] + lens[2] > ry * 2.2, standing = solveLeg(hip, foot, lens, aC, aT, false);
      // A wader keeps its standing thigh and knee; the shank hangs back from the knee and the foot folds up behind it.
      const up0 = wader ? fkLeg(standing[0], lens, [angleDown(sub(standing[1], standing[0])), angleDown(sub(standing[2], standing[1])) - 35, 150, 175])
        : fkLeg(hip, lens, [70, -150, 150, 160]);
      limbs.push({ leg, fore: false, far: leg === "hind-far", points: standing.map((q, j) => lerpP(q, up0[j], k)), widths: [c.girth * 3, c.girth * 1.4, c.girth, c.girth * .8, c.girth * .6], onGround: k < .5 });
      continue;
    }
    // On one leg the standing foot moves under the body's centre.
    if (bp?.oneLeg) foot = [restX + (centre[0] - rx * .05 - restX) * k, 0];
    if (s && g) {
      if (s.onGround) foot = [restX + sweep * (.5 - s.progress), 0];
      else { foot = [restX - sweep / 2 + sweep * smoothstep(s.progress), s.lift * L * .6]; const f = Math.sin(Math.PI * s.progress); aC += 30 * f; aT = aC + 40 + (stand[3] - stand[2] - 40) * (1 - f); }
    }
    limbs.push({ leg, fore: false, far: leg === "hind-far", points: solveLeg(hip, foot, lens, aC, aT, false), widths: [c.girth * 3, c.girth * 1.4, c.girth, c.girth * .8, c.girth * .6], onGround: !s || s.onGround });
  }
  // Folded, a long tail (pheasant, magpie) narrows to its tip; a short one fans a little.
  const tw = c.tail > .45 ? [ry * .5, ry * .42, ry * .2] : [ry * .5, ry * .6, ry * .7];
  return {
    kind: "bird", c, joints: { neckRoot, crown, occiput: crown, nose, eye, tailRoot, hip, ...(floatY !== undefined ? { waterline: [0, water] as AnimalPoint } : {}) }, limbs, masses: { body, wing },
    topLine: [tailRoot, add(centre, up, ry), neckRoot], neck: { points: [neckRoot, neckMid, crown], widths: [Math.min(ry * 1.1, hr * 2.6), hr * 1.25, hr * 1.35] },
    head: { cranium, muzzle, eye, eyeR: face ? c.head * face.eye / 2 : c.head * .06, nose, axis, eyeClosed: bp?.head === "tucked" && k > .6 }, tail: { points: [tailRoot, lerpP(tailRoot, tailEnd, .5), tailEnd], widths: tw }, fins: [], legLength: { fore: 0, hind: L },
    outline: {},
  };
}

/**
 * A bird in the air: the body nearly level, the open wings at their stroke position (or held out to glide, or closed
 * against the body), the neck stretched out or drawn back, the legs tucked up or trailing behind.
 */
function poseBirdFlight(c: AnimalConstruction, mode: FlightMode, t: number, hold: number, view: number, f: BirdFlight): AnimalSkeleton {
  const sp = c.species!, spanRel = (sp.size.wingspan?.typical ?? sp.size.length.typical * 1.6) / sp.size.length.typical;
  // In the air the feathers are sleeked: the body slims.
  const rx = c.trunk / 2, ry = c.chestDepth / 2 * .85, a = 3;
  // A held wing (glide, closed) eases from the top of the stroke by `hold`.
  // Closing (bounding) flexes the wing first, then lays it along the flank.
  const top = wingStroke(f, 0), k = smoothstep(hold);
  const stroke = mode === "flap" ? wingStroke(f, t) : mode === "glide" ? mixStroke(top, glideStroke(f), k) : mixStroke(top, { ...top, elevation: 10, fold: 1 }, k);
  const plan = wingPlanform(f, spanRel, ry * .55);
  // The body rises a little on the downstroke and sinks on the upstroke.
  const bob = mode === "flap" ? .012 * Math.sin(2 * Math.PI * t) : 0;
  const centre: AnimalPoint = [0, plan.semispan * 1.05 + .1 + bob], ax = dir(a), up = dir(a + 90);
  const body: AnimalEllipse = { cx: centre[0], cy: centre[1], rx, ry, angle: a };
  const masses: Record<string, AnimalEllipse> = { body };
  let wings: AnimalSkeleton["wings"];
  {
    const sh = add(add(centre, ax, rx * .22), up, ry * .45);
    const view2 = (q: WingPoint3) => projectWing(q, centre[1], view) as AnimalPoint;
    const wing = (side: 1 | -1) => {
      const at = (pts: readonly PlanformPoint[]) => placeWing(plan, stroke, [sh[0], sh[1], side * ry * .35], side, pts).map(view2).map((q, i) => {
        if (mode !== "closed") return q;
        const fq = foldedPoint(pts[i], plan, sh, rx * 2, ry * 2, side < 0);
        return [q[0] + (fq[0] - q[0]) * k, q[1] + (fq[1] - q[1]) * k] as AnimalPoint;
      });
      return { outline: at(plan.outline), bones: at(plan.bones), secondaries: at(plan.secondaries) };
    };
    wings = { near: wing(1), far: wing(-1) };
  }
  // Neck: stretched forward (cranes, ducks) or drawn back into the shoulders in an S (herons).
  const neckRoot = add(add(centre, ax, rx * .62), up, ry * .3);
  const retracted = f.neck === "retracted";
  // The drawn-back neck: the head rests on the front of the shoulders and the folded neck bulges below it.
  const crown = retracted ? add(neckRoot, dir(70), Math.max(c.neck * .2, .02)) : add(neckRoot, dir(6), Math.max(c.neck, .02));
  const neckMid = retracted ? add(neckRoot, dir(-45), c.neck * .2) : add(lerpP(neckRoot, crown, .5), dir(-84), c.neck * .05);
  const face = c.species?.face, cranLen = c.head * (1 - c.muzzle);
  const hr = face ? c.head * face.depth / 2 : cranLen * .5, axis = retracted ? -4 : 0, hx = dir(axis), hu = dir(axis + 90);
  const cranium: AnimalEllipse = { cx: crown[0], cy: crown[1], rx: cranLen * .55, ry: hr, angle: axis };
  const billBase = add(crown, hx, cranLen * .425), nose = add(billBase, hx, c.head * c.muzzle);
  const muzzle: AnimalPoint[] = [add(billBase, hu, hr * .45), add(nose, hu, hr * .05), add(nose, hu, -hr * .05), add(billBase, hu, -hr * .4)];
  const eye = face ? add(add(nose, hx, -c.head * face.eyeFromNose), hu, hr * .25) : add(add(crown, hx, hr * .3), hu, hr * .2);
  // Tail: trailing on the body's axis, a little spread in the air.
  const tailRoot = add(centre, ax, -rx * .85), tailEnd = add(tailRoot, dir(180 + a), c.tail);
  const tw = c.tail > .45 ? [ry * .5, ry * .45, ry * .25] : [ry * .5, ry * .75, ry * .95];
  // Legs: the standing leg length, folded up under the body or trailing straight back past the tail.
  const a0 = c.bodyAngle ?? 20, lift0 = Math.sqrt((rx * Math.sin(a0 * RAD)) ** 2 + (ry * Math.cos(a0 * RAD)) ** 2);
  const stand = c.legClearance > .4 ? [20, -12, 4, 85] : BIRD_STAND, L = legLengthFor(c.legClearance + lift0 - ry * .25, c.hind, stand), lens = c.hind.map(q => q * L);
  // Trailing legs leave the belly behind the hip and run straight back under the tail (the thigh stays inside the body).
  const hip = add(add(centre, ax, f.legs === "trailing" ? -rx * .35 : -rx * .15), up, -ry * .45);
  const angles = f.legs === "trailing" ? [-78, -88, -90, -92] : [70, -115, 60, 100];
  // Both legs come out from under the body in flight, so both are drawn behind it.
  const limbs: AnimalLimb[] = (["hind-far", "hind-near"] as const).map((leg, i) => ({
    leg, fore: false, far: true, onGround: false,
    points: fkLeg(add(hip, [0, i ? 0 : ry * .04]), lens, angles.map(x => x + (i ? 0 : 3))),
    // The thigh stays inside the feathers in flight.
    widths: [c.girth * 1.2, c.girth * 1.1, c.girth, c.girth * .8, c.girth * .6],
  }));
  return {
    kind: "bird", c, joints: { neckRoot, crown, occiput: crown, nose, eye, tailRoot, hip }, limbs, masses,
    topLine: [tailRoot, add(centre, up, ry), neckRoot], neck: { points: [neckRoot, neckMid, crown], widths: [Math.min(ry * 1.1, hr * 2.6), hr * 1.25, hr * 1.35] },
    head: { cranium, muzzle, eye, eyeR: face ? c.head * face.eye / 2 : c.head * .06, nose, axis }, tail: { points: [tailRoot, lerpP(tailRoot, tailEnd, .5), tailEnd], widths: tw }, fins: [], legLength: { fore: 0, hind: L },
    outline: {}, wings,
  };
}

function poseFish(c: AnimalConstruction, t: number): AnimalSkeleton {
  const D = c.chestDepth, y0 = D, nose: AnimalPoint = [.5, y0], wave = Math.sin(2 * Math.PI * t);
  const peduncleX = .5 - c.trunk - c.head * .2, ped: AnimalPoint = [peduncleX, y0 + wave * .012];
  const top: AnimalPoint[] = [], bot: AnimalPoint[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, x = .5 + (peduncleX - .5) * u, depth = D * (u < .35 ? Math.sin(u / .35 * Math.PI / 2) ** .7 : 1 - .82 * smoothstep((u - .35) / .65)) / 2;
    const yc = y0 + wave * .012 * u * u;
    top.push([x, yc + depth * 1.05]); bot.push([x, yc - depth * .95]);
  }
  const body: AnimalEllipse = { cx: .5 - (.5 - peduncleX) * .45, cy: y0, rx: (.5 - peduncleX) * .5, ry: D / 2, angle: 0 };
  const flap = wave * .05, tailEnd = peduncleX - c.tail;
  const caudal: AnimalPoint[] = [ped, [tailEnd, y0 + D * .55 + flap], [peduncleX - c.tail * .55, y0 + flap * .5], [tailEnd + c.tail * .05, y0 - D * .5 + flap]];
  const at = (u: number) => top[Math.round(u * 12)], ab = (u: number) => bot[Math.round(u * 12)];
  const fins: AnimalPoint[][] = [
    [at(.35), [at(.42)[0] - .02, at(.42)[1] + D * .32], [at(.66)[0], at(.66)[1] + D * .12], at(.66)],
    [[.5 - c.head * .9, y0 - D * .22], [.5 - c.head * 1.5, y0 - D * .5 + wave * .02], [.5 - c.head * 1.35, y0 - D * .3]],
    [ab(.5), [ab(.56)[0] - .02, ab(.56)[1] - D * .25], ab(.6)],
    [ab(.75), [ab(.8)[0] - .02, ab(.8)[1] - D * .22], ab(.86)],
  ];
  const cranium: AnimalEllipse = { cx: .5 - c.head * .5, cy: y0 + D * .04, rx: c.head * .5, ry: D * .45, angle: 0 };
  const face = c.species?.face, eye: AnimalPoint = [.5 - c.head * (face?.eyeFromNose ?? .3), y0 + D * .12];
  return {
    kind: "fish", c, joints: { nose, eye, tailRoot: ped, occiput: [.5 - c.head, y0] }, limbs: [], masses: { body },
    topLine: top.slice().reverse(), neck: { points: [], widths: [] },
    head: { cranium, muzzle: [...top.slice(0, 3), ...bot.slice(0, 3).reverse()], eye, eyeR: face ? c.head * face.eye / 2 : D * .06, nose, axis: 0 },
    tail: { points: caudal, widths: [] }, fins, legLength: { fore: 0, hind: 0 },
    outline: {},
  };
}

// ---- Shapes ----------------------------------------------------------------------------------------------------------------------------

const limbShape = (l: AnimalLimb) => poly(tubePoints(l.points, l.widths)) + l.points.slice(0, 4).map((p, i) => poly(circlePoints(p, l.widths[i] / 2))).join("");

export interface AnimalShapes {
  /** Path data (model units, y up) for the far legs, then the body, then the near legs: fill all in one colour for a silhouette. */
  far: string; body: string; near: string;
  /** Path data for each coat region, to be clipped by the silhouette. */
  regions: Partial<Record<AnimalRegion, string>>;
  /** Tip of a region (the last stretch of the tail, the ear tip, the front of the muzzle, the wing tips). */
  tips: Partial<Record<AnimalRegion, string>>;
  /** A stripe along a region (the spine, the jaw, a crescent across the chest, the crest of the neck). */
  bands: Partial<Record<AnimalRegion, string>>;
  eyePatch: string;
  bounds: [number, number, number, number];
}

/** Path data for a posed skeleton: the silhouette in three layers, and a shape per coat region. */
export function skeletonShapes(s: AnimalSkeleton): AnimalShapes {
  const m = s.masses, h = s.head, near = s.limbs.filter(l => !l.far), far = s.limbs.filter(l => l.far);
  const headD = (s.outline.head ? smoothClosedPath(s.outline.head) : poly(ellipsePoints(h.cranium)) + poly(h.muzzle)) + (h.ear ? smoothClosedPath(h.ear) : "");
  const neckD = s.neck.points.length ? smoothTube(s.neck.points, s.neck.widths) : "";
  const tailD = s.kind === "fish" ? poly(s.tail.points) : smoothTube(s.tail.points, s.tail.widths);
  const trunkD = s.outline.trunk ? smoothClosedPath(s.outline.trunk) : Object.values(m).map(e => poly(ellipsePoints(e))).join("");
  const finD = s.fins.map(poly).join("");
  const body = tailD + trunkD + neckD + headD + finD;
  const all: AnimalPoint[] = [...Object.values(m).flatMap(e => ellipsePoints(e, 12)), ...s.limbs.flatMap(l => l.points), ...h.muzzle, ...(h.ear ?? []), ...s.tail.points, ...s.fins.flat(), ...ellipsePoints(h.cranium, 12),
    ...(s.wings ? [...s.wings.near.outline, ...s.wings.far.outline] : [])];
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const pad = .06;
  const bounds: [number, number, number, number] = [Math.min(...xs) - pad, Math.min(0, ...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
  const rect = (x0: number, y0: number, x1: number, y1: number) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  const regions: Partial<Record<AnimalRegion, string>> = {}, tips: Partial<Record<AnimalRegion, string>> = {}, bands: Partial<Record<AnimalRegion, string>> = {};
  const legLower = (ls: AnimalLimb[], from: number) => ls.map(l => poly(tubePoints(l.points.slice(from), l.widths.slice(from)))).join("");
  const tailTip = (k: number) => (s.kind === "fish" ? "" : poly(tubePoints(s.tail.points.slice(Math.floor(s.tail.points.length * k)), s.tail.widths.slice(Math.floor(s.tail.points.length * k)))));
  regions.head = poly(ellipsePoints(h.cranium)); regions.face = regions.head; regions.muzzle = poly(h.muzzle);
  if (h.ear) { const k = h.ear.length; regions.ears = smoothClosedPath(h.ear); tips.ears = poly(h.ear.slice(Math.floor(k * .3), Math.ceil(k * .7))); }
  regions.eyes = poly(circlePoints(h.eye, h.eyeR));
  regions.tail = tailD; tips.tail = s.kind === "fish" ? tailD : tailTip(.62);
  tips.muzzle = poly([lerpP(h.muzzle[0], h.muzzle[1], .6), h.muzzle[1], h.muzzle[2], lerpP(h.muzzle[3], h.muzzle[2], .6)]);
  const eyePatch = poly(ellipsePoints({ cx: h.eye[0], cy: h.eye[1], rx: h.eyeR * 3.2, ry: h.eyeR * 2.4, angle: h.axis }));
  if (s.kind === "quadruped") {
    const j = s.joints, ch = m.chest;
    // The trunk's and the neck's own directions, so the bands follow a sitting, lying or rearing body.
    const tilt = ch.angle, neckDir = Math.atan2(s.neck.points[2][1] - s.neck.points[0][1], s.neck.points[2][0] - s.neck.points[0][0]) / RAD;
    const along = (p: AnimalPoint, v: AnimalPoint): AnimalPoint => add(p, rotate(v, tilt, [0, 0]));
    regions.back = trunkD; regions.flank = trunkD; regions.neck = neckD;
    // The underside of the trunk only (not the legs): the trunk outline cut at a line above the brisket, in the
    // trunk's own frame.
    const cut = s.c.chestDepth * .22;
    regions.belly = s.outline.trunk ? smoothClosedPath(s.outline.trunk.map(p => {
      const q = rotate(p, -tilt, j.brisket);
      return rotate([q[0], Math.min(q[1], j.brisket[1] + cut)], tilt, j.brisket);
    })) : "";
    regions.chest = poly(ellipsePoints({ cx: ch.cx + ch.rx * .72, cy: ch.cy - ch.ry * .1, rx: ch.rx * .45, ry: ch.ry * 1.05, angle: ch.angle }));
    regions.throat = poly(tubePoints(s.neck.points.slice(0, 2).map((p, i) => add(p, dir(neckDir - 90), s.neck.widths[i] * .3)), s.neck.widths.slice(0, 2).map(w => w * .5))) + regions.chest;
    regions.rump = poly(ellipsePoints({ cx: m.pelvis.cx - m.pelvis.rx * .55, cy: m.pelvis.cy + m.pelvis.ry * .2, rx: m.pelvis.rx * .5, ry: m.pelvis.ry * .75, angle: m.pelvis.angle }));
    regions["fore-leg"] = s.limbs.filter(l => l.fore).map(limbShape).join("");
    regions["hind-leg"] = s.limbs.filter(l => !l.fore).map(limbShape).join("");
    regions.feet = legLower(s.limbs, 2);
    bands.back = poly(tubePoints(s.topLine, s.topLine.map(() => s.c.chestDepth * .16)));
    bands.neck = poly(tubePoints(s.neck.points.map((p, i) => add(p, dir(neckDir + 90), s.neck.widths[i] * .42)), s.neck.widths.map(w => w * .22)));
    const jawA = add(h.muzzle[3], [0, h.cranium.ry * .12]), jawB = add([h.cranium.cx, h.cranium.cy], dir(h.axis - 90), h.cranium.ry * .7);
    bands.face = poly(tubePoints([lerpP(h.muzzle[3], h.muzzle[2], .25), jawA, jawB, add(jawB, dir(h.axis + 180), h.cranium.rx * .6)], [h.cranium.ry * .25, h.cranium.ry * .35, h.cranium.ry * .4, h.cranium.ry * .3]));
    const cf = along([ch.cx, ch.cy], [ch.rx * .9, ch.ry * .35]);
    bands.chest = poly(tubePoints([along(cf, [-ch.rx * .25, ch.ry * .5]), cf, along(cf, [-ch.rx * .15, -ch.ry * .45])], [ch.ry * .16, ch.ry * .3, ch.ry * .16]));
    bands.crown = bands.back;
  } else if (s.kind === "bird") {
    const b = m.body;
    regions.back = trunkD; regions.flank = trunkD; regions.neck = neckD;
    // Open wings in flight, or the folded wing along the back.
    regions.wings = s.wings ? poly(s.wings.far.outline) + poly(s.wings.near.outline) : m.wing ? poly(ellipsePoints(m.wing)) : "";
    regions.crown = poly(ellipsePoints({ ...h.cranium, cy: h.cranium.cy + h.cranium.ry * .45, ry: h.cranium.ry * .6 }));
    regions.breast = poly(ellipsePoints({ cx: b.cx + b.rx * .45, cy: b.cy - b.ry * .1, rx: b.rx * .6, ry: b.ry * 1.02, angle: b.angle }));
    regions.belly = poly(ellipsePoints({ cx: b.cx, cy: b.cy - b.ry * .55, rx: b.rx * .8, ry: b.ry * .5, angle: b.angle }));
    regions.throat = poly(tubePoints(s.neck.points.map((p, i) => add(p, dir(s.c.neckAngle - 90), s.neck.widths[i] * .25)), s.neck.widths.map(w => w * .5)));
    regions["hind-leg"] = s.limbs.map(limbShape).join(""); regions.feet = legLower(s.limbs, 3);
    // A folded wing's tip is its hind end over the tail; an open wing's "tip" swatch paints the secondaries along the
    // inner trailing edge (where a crane's black feathers lie).
    tips.wings = s.wings ? poly(s.wings.far.secondaries) + poly(s.wings.near.secondaries)
      : m.wing ? poly(ellipsePoints({ ...m.wing, cx: m.wing.cx - m.wing.rx * .55 * Math.cos(m.wing.angle * RAD), cy: m.wing.cy - m.wing.rx * .55 * Math.sin(m.wing.angle * RAD), rx: m.wing.rx * .5 })) : "";
    bands.crown = poly(tubePoints([add(h.eye, dir(h.axis + 180), h.eyeR * 1.2), add(h.eye, dir(h.axis + 160), h.cranium.rx * 1.3)], [h.eyeR * 1.6, h.eyeR * 1.2]));
    bands.face = bands.crown;
  } else {
    regions.back = trunkD; regions.flank = trunkD; regions.scales = trunkD; regions.fins = finD;
    regions.belly = rect(-1, -1, 1, s.c.chestDepth * .85);
    // Along the back: the upper half of the body behind the head (a kohaku's red, a dorsal stripe).
    bands.back = rect(s.joints.tailRoot[0], s.c.chestDepth * 1.02, .5 - s.c.head * .55, 1);
  }
  const wingFar = s.wings ? poly(s.wings.far.outline) : "", wingNear = s.wings ? poly(s.wings.near.outline) : "";
  return { far: wingFar + far.map(limbShape).join(""), body, near: near.map(limbShape).join("") + wingNear, regions, tips, bands, eyePatch, bounds };
}
