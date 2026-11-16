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
  head: { cranium: AnimalEllipse; muzzle: AnimalPoint[]; ear?: AnimalPoint[]; eye: AnimalPoint; eyeR: number; nose: AnimalPoint; axis: number };
  tail: { points: AnimalPoint[]; widths: number[] };
  fins: AnimalPoint[][];
  legLength: { fore: number; hind: number };
  /** Closed contours for a smooth silhouette: the trunk (quadrupeds) and the head with its muzzle. */
  outline: { trunk?: AnimalPoint[]; head?: AnimalPoint[] };
}
export interface PoseOptions {
  /** A gait from `ANIMAL_GAITS` (default: standing). */
  gait?: GaitId;
  /** 0–1 through the stride. */
  t?: number;
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
  let aCannon = aCannon0, aToes = aToes0;
  let ankle = add(add(foot, down(aToes), -lens[3]), down(aCannon), -lens[2]);
  // At the ends of a long stance the leg cannot reach its planted foot with the joints bent: it straightens (the heel
  // and the wrist lift, the cannon and toes fall in line) rather than letting the foot slide.
  if (len(sub(ankle, top)) > lens[0] + lens[1]) { aCannon = aToes = angleDown(sub(foot, top)); ankle = add(foot, down(aCannon), -(lens[2] + lens[3])); }
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

/** Pose a construction: standing, or at `t` through a gait's stride. */
export function poseAnimal(c: AnimalConstruction, o: PoseOptions = {}): AnimalSkeleton {
  if (c.plan.group === "fish") return poseFish(c, o.t ?? 0);
  if (c.plan.group === "bird") return poseBird(c, o);
  return poseQuadruped(c, o);
}

function tailPoints(root: AnimalPoint, length: number, carriage: PlanConstruction["tailCarriage"], sway: number): AnimalPoint[] {
  const A: Record<PlanConstruction["tailCarriage"], [number, number]> = {
    stub: [205, 215], hanging: [212, 262], raised: [150, 108], curled: [95, -40], up: [120, 100], trailing: [196, 186], level: [180, 180],
  };
  const [a0, a1] = A[carriage], n = 8, pts: AnimalPoint[] = [root];
  for (let i = 0; i < n; i++) { const u = (i + .5) / n; pts.push(add(pts[i], dir(a0 + (a1 - a0) * u + sway * u), length / n)); }
  return pts;
}

function poseQuadruped(c: AnimalConstruction, o: PoseOptions): AnimalSkeleton {
  const g: AnimalGait | undefined = o.gait ? ANIMAL_GAITS[o.gait] : undefined, t = o.t ?? 0;
  const body = g ? quadBody(g, t) : { bob: 0, pitch: 0, flex: 0, neck: 0 };
  const posture = c.plan.posture === "plantigrade" || c.plan.posture === "unguligrade" ? c.plan.posture : "digitigrade";
  const st = STAND[posture], D = c.chestDepth, Cl = c.legClearance, T = c.trunk * (1 + .07 * body.flex);
  const croupY = CROUP[c.back], loinsY = LOINS[c.back] + .04 * body.flex;
  const pivot: AnimalPoint = [-T / 2, Cl + D / 2];
  let bob = body.bob / 100 * .7;
  const W = (p: AnimalPoint): AnimalPoint => add(rotate(p, body.pitch, pivot), [0, bob]);
  // Landmarks in the body frame.
  const shoulderJ: AnimalPoint = [-.02 * T, Cl + .28 * (1 - Cl)], hipJ: AnimalPoint = [-.8 * T, Cl + .28 * (croupY - Cl)];
  // Legs: lengths, resting feet, footfalls and where each foot is this frame.
  const foreFr = c.fore, hindFr = c.hind;
  const Lf = legLengthFor(shoulderJ[1], foreFr, st.fore), Lh = legLengthFor(hipJ[1], hindFr, st.hind);
  const restFoot = (top: AnimalPoint, fr: readonly number[], ang: readonly number[], L: number) => fr.reduce<AnimalPoint>((p, f, i) => add(p, down(ang[i]), f * L), top);
  const restFore = restFoot(shoulderJ, foreFr, st.fore, Lf), restHind = restFoot(hipJ, hindFr, st.hind, Lh);
  const states = g ? quadFootfalls(g, t) : undefined;
  const sweep = g ? g.stride * Lf * g.stance : 0;
  const legOrder: readonly QuadLeg[] = ["hind-far", "fore-far", "hind-near", "fore-near"];
  const footAt = (i: number): AnimalPoint => {
    const fore = legOrder[i].startsWith("fore"), rest = fore ? restFore : restHind, s = states?.[i];
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
  const ell = (cx: number, cy: number, rx: number, ry: number): AnimalEllipse => { const p = W([cx, cy]); return { cx: p[0], cy: p[1], rx, ry, angle: body.pitch }; };
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
    const points = solveLeg(top, foot, lens, aC, aT, fore);
    const w0 = c.girth * (fore ? 1 : 1.25), widths = [w0 * 1.6, w0 * .85, w0 * .62, w0 * .55, w0 * .5].map((w, j) => (j === 0 && posture === "plantigrade" ? w * 1.1 : w));
    limbs.push({ leg, fore, far, points, widths, onGround });
  }
  joints.elbow = limbs[3].points[1]; joints.carpus = limbs[3].points[2]; joints.stifle = limbs[2].points[1]; joints.hock = limbs[2].points[2];
  // Neck, head, ear, eye.
  const neckRoot = W([-.02 * T, (1 + shoulderJ[1]) / 2 + .04]);
  const nAngle = c.neckAngle + body.neck * .6 + body.pitch;
  const occiput = add(neckRoot, dir(nAngle), Math.max(c.neck, .08));
  const neckMid = add(lerpP(neckRoot, occiput, .5), dir(nAngle + 90), c.neck * .06);
  const axis = -c.headAngle + body.neck * .4 + body.pitch, ax = dir(axis), up = dir(axis + 90);
  const cranLen = c.head * (1 - c.muzzle), ry = c.head * (.12 + .14 * (1 - c.muzzle));
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
    const tip = add(base, dir(axis + 90 + back), earLen), w = c.ear.width * c.head * (face ? face.ear / c.ear.length : 1), side = dir(axis);
    // Width across the ear, from its front edge to its back edge, at stations along it (base → tip).
    const prof = { round: [.5, .56, .52, .38, .12], pointed: [.5, .42, .3, .16, .02], leaf: [.3, .5, .5, .34, .05], long: [.32, .5, .48, .36, .08] }[c.ear.shape];
    const st2 = prof.map((_, i) => i / (prof.length - 1)), front = st2.map((u, i) => add(lerpP(base, tip, u), side, w * prof[i])), backEdge = st2.map((u, i) => add(lerpP(base, tip, u), side, -w * prof[i]));
    ear = [...front, tip, ...backEdge.reverse()];
  }
  Object.assign(joints, { neckRoot, occiput, nose, eye });
  const neckW0 = D * .6, neckW1 = ry * 1.7;
  // Tail.
  const tailLen = c.tail * headBodyLength(c), bushy = c.species?.coat.long.includes("tail") && c.tail >= .25 ? 2.2 : 1;
  const tp = tailPoints(tailRoot, tailLen, c.tailCarriage, (g ? 10 * Math.sin(2 * Math.PI * t) : 0) - body.pitch);
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
  const g = o.gait ? ANIMAL_GAITS[o.gait] : undefined, t = o.t ?? 0;
  const a = c.bodyAngle ?? 20, rx = c.trunk / 2, ry = c.chestDepth / 2, Cl = c.legClearance;
  const lift = Math.sqrt((rx * Math.sin(a * RAD)) ** 2 + (ry * Math.cos(a * RAD)) ** 2);
  const bob = g ? Math.abs(Math.sin(2 * Math.PI * t)) * .01 : 0;
  const centre: AnimalPoint = [0, Cl + lift + bob], ax = dir(a), up = dir(a + 90);
  const body: AnimalEllipse = { cx: centre[0], cy: centre[1], rx, ry, angle: a };
  const wingC = add(add(centre, ax, -rx * .2), up, ry * .25), wing: AnimalEllipse = { cx: wingC[0], cy: wingC[1], rx: rx * 1.08, ry: ry * .62, angle: a - 6 };
  const neckRoot = add(add(centre, ax, rx * .62), up, ry * .45);
  const nod = g ? 6 * Math.sin(2 * Math.PI * t * 2) : 0;
  const crown = add(neckRoot, dir(c.neckAngle), Math.max(c.neck, .02));
  const neckMid = add(lerpP(neckRoot, crown, .5), dir(c.neckAngle - 90), c.neck * .12);
  const hr = c.head * (1 - c.muzzle) * .5, axis = -c.headAngle + nod, hx = dir(axis), hu = dir(axis + 90);
  const cranium: AnimalEllipse = { cx: crown[0], cy: crown[1], rx: hr * 1.1, ry: hr, angle: axis };
  const billBase = add(crown, hx, hr * .85), nose = add(billBase, hx, c.head * c.muzzle);
  const muzzle: AnimalPoint[] = [add(billBase, hu, hr * .45), add(nose, hu, hr * .05), add(nose, hu, -hr * .05), add(billBase, hu, -hr * .4)];
  const eye = add(add(crown, hx, hr * .3), hu, hr * .2);
  const tailRoot = add(centre, ax, -rx * .85), tailEnd = add(tailRoot, dir(180 + a - 8), c.tail);
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
    if (s && g) {
      if (s.onGround) foot = [restX + sweep * (.5 - s.progress), 0];
      else { foot = [restX - sweep / 2 + sweep * smoothstep(s.progress), s.lift * L * .6]; const f = Math.sin(Math.PI * s.progress); aC += 30 * f; aT = aC + 40 + (stand[3] - stand[2] - 40) * (1 - f); }
    }
    limbs.push({ leg, fore: false, far: leg === "hind-far", points: solveLeg(hip, foot, lens, aC, aT, false), widths: [c.girth * 3, c.girth * 1.4, c.girth, c.girth * .8, c.girth * .6], onGround: !s || s.onGround });
  }
  // Folded, a long tail (pheasant, magpie) narrows to its tip; a short one fans a little.
  const tw = c.tail > .45 ? [ry * .5, ry * .42, ry * .2] : [ry * .5, ry * .6, ry * .7];
  return {
    kind: "bird", c, joints: { neckRoot, crown, occiput: crown, nose, eye, tailRoot, hip }, limbs, masses: { body, wing },
    topLine: [tailRoot, add(centre, up, ry), neckRoot], neck: { points: [neckRoot, neckMid, crown], widths: [Math.min(ry * 1.1, hr * 2.6), hr * 1.25, hr * 1.35] },
    head: { cranium, muzzle, eye, eyeR: c.head * .06, nose, axis }, tail: { points: [tailRoot, lerpP(tailRoot, tailEnd, .5), tailEnd], widths: tw }, fins: [], legLength: { fore: 0, hind: L },
    outline: {},
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
  const eye: AnimalPoint = [.5 - c.head * .3, y0 + D * .12];
  return {
    kind: "fish", c, joints: { nose, eye, tailRoot: ped, occiput: [.5 - c.head, y0] }, limbs: [], masses: { body },
    topLine: top.slice().reverse(), neck: { points: [], widths: [] },
    head: { cranium, muzzle: [...top.slice(0, 3), ...bot.slice(0, 3).reverse()], eye, eyeR: D * .06, nose, axis: 0 },
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
  const all: AnimalPoint[] = [...Object.values(m).flatMap(e => ellipsePoints(e, 12)), ...s.limbs.flatMap(l => l.points), ...h.muzzle, ...(h.ear ?? []), ...s.tail.points, ...s.fins.flat(), ...ellipsePoints(h.cranium, 12)];
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
    regions.back = trunkD; regions.flank = trunkD; regions.neck = neckD;
    // The underside of the trunk only (not the legs): the trunk outline cut at a line above the brisket.
    const cut = j.brisket[1] + s.c.chestDepth * .22;
    regions.belly = s.outline.trunk ? smoothClosedPath(s.outline.trunk.map(p => [p[0], Math.min(p[1], cut)] as AnimalPoint)) : "";
    regions.chest = poly(ellipsePoints({ cx: ch.cx + ch.rx * .72, cy: ch.cy - ch.ry * .1, rx: ch.rx * .45, ry: ch.ry * 1.05, angle: ch.angle }));
    regions.throat = poly(tubePoints(s.neck.points.slice(0, 2).map((p, i) => add(p, dir(s.c.neckAngle - 90), s.neck.widths[i] * .3)), s.neck.widths.slice(0, 2).map(w => w * .5))) + regions.chest;
    regions.rump = poly(ellipsePoints({ cx: m.pelvis.cx - m.pelvis.rx * .55, cy: m.pelvis.cy + m.pelvis.ry * .2, rx: m.pelvis.rx * .5, ry: m.pelvis.ry * .75, angle: m.pelvis.angle }));
    regions["fore-leg"] = s.limbs.filter(l => l.fore).map(limbShape).join("");
    regions["hind-leg"] = s.limbs.filter(l => !l.fore).map(limbShape).join("");
    regions.feet = legLower(s.limbs, 2);
    bands.back = poly(tubePoints(s.topLine, s.topLine.map(() => s.c.chestDepth * .16)));
    bands.neck = poly(tubePoints(s.neck.points.map((p, i) => add(p, dir(s.c.neckAngle + 90), s.neck.widths[i] * .42)), s.neck.widths.map(w => w * .22)));
    const jawA = add(h.muzzle[3], [0, h.cranium.ry * .12]), jawB = add([h.cranium.cx, h.cranium.cy], dir(h.axis - 90), h.cranium.ry * .7);
    bands.face = poly(tubePoints([lerpP(h.muzzle[3], h.muzzle[2], .25), jawA, jawB, add(jawB, dir(h.axis + 180), h.cranium.rx * .6)], [h.cranium.ry * .25, h.cranium.ry * .35, h.cranium.ry * .4, h.cranium.ry * .3]));
    const cf: AnimalPoint = [ch.cx + ch.rx * .9, ch.cy + ch.ry * .35];
    bands.chest = poly(tubePoints([add(cf, [-ch.rx * .25, ch.ry * .5]), cf, add(cf, [-ch.rx * .15, -ch.ry * .45])], [ch.ry * .16, ch.ry * .3, ch.ry * .16]));
    bands.crown = bands.back;
  } else if (s.kind === "bird") {
    const b = m.body;
    regions.back = trunkD; regions.flank = trunkD; regions.neck = neckD; regions.wings = poly(ellipsePoints(m.wing));
    regions.crown = poly(ellipsePoints({ ...h.cranium, cy: h.cranium.cy + h.cranium.ry * .45, ry: h.cranium.ry * .6 }));
    regions.breast = poly(ellipsePoints({ cx: b.cx + b.rx * .45, cy: b.cy - b.ry * .1, rx: b.rx * .6, ry: b.ry * 1.02, angle: b.angle }));
    regions.belly = poly(ellipsePoints({ cx: b.cx, cy: b.cy - b.ry * .55, rx: b.rx * .8, ry: b.ry * .5, angle: b.angle }));
    regions.throat = poly(tubePoints(s.neck.points.map((p, i) => add(p, dir(s.c.neckAngle - 90), s.neck.widths[i] * .25)), s.neck.widths.map(w => w * .5)));
    regions["hind-leg"] = s.limbs.map(limbShape).join(""); regions.feet = legLower(s.limbs, 3);
    tips.wings = poly(ellipsePoints({ ...m.wing, cx: m.wing.cx - m.wing.rx * .55 * Math.cos(m.wing.angle * RAD), cy: m.wing.cy - m.wing.rx * .55 * Math.sin(m.wing.angle * RAD), rx: m.wing.rx * .5 }));
    bands.crown = poly(tubePoints([add(h.eye, dir(h.axis + 180), h.eyeR * 1.2), add(h.eye, dir(h.axis + 160), h.cranium.rx * 1.3)], [h.eyeR * 1.6, h.eyeR * 1.2]));
    bands.face = bands.crown;
  } else {
    regions.back = trunkD; regions.flank = trunkD; regions.scales = trunkD; regions.fins = finD;
    regions.belly = rect(-1, -1, 1, s.c.chestDepth * .85);
    // Along the back: the upper half of the body behind the head (a kohaku's red, a dorsal stripe).
    bands.back = rect(s.joints.tailRoot[0], s.c.chestDepth * 1.02, .5 - s.c.head * .55, 1);
  }
  return { far: far.map(limbShape).join(""), body, near: near.map(limbShape).join(""), regions, tips, bands, eyePatch, bounds };
}
