/**
 * UKIYO1 figures: an articulated Edo-period figure drawn the way prints draw people — a dominant robe silhouette,
 * hanging sleeves, a delicate pale face in profile, a carved key line, and costume pattern printed as its own block.
 *
 * The rig is a small 2D skeleton (hips, torso, head, two arms, two legs) solved from a pose; actions layer onto a
 * standing pose with short blends. Sleeves, hems, hat cords and long hair hang under gravity, lag behind limb motion
 * (estimated from the pose a frame earlier, so it is still a pure function of the frame) and blow in the scene wind.
 * Origin: ground point between the feet. The figure is authored facing right and mirrored for left.
 */
import type { Pt } from "./ukiyoe-core";
import { add, carvedLine, clamp, clamp01, DEG, ease, hash01, lerp, noise1, polar, polyD, quad, smooth, smoothD, span } from "./ukiyoe-core";
import type { Prim, UkiyoePattern } from "./ukiyoe-prims";
import { circleD, ellipseD } from "./ukiyoe-prims";
import type { UkiyoePaint } from "./ukiyoe-pigments";

export type UkiyoeHair = "chonmage" | "shimada" | "child" | "bald" | "long" | "elder" | "topknot";
export type UkiyoeHat = "none" | "kasa" | "conical" | "eboshi" | "hood" | "headband";
export type UkiyoeProp = "none" | "staff" | "umbrella" | "lantern" | "fan" | "pole" | "basket-pole" | "bundle" | "fishing-rod" | "scroll" | "pipe";
export type UkiyoeBuild = "slim" | "average" | "stout" | "child";
export const UKIYOE_HAIRS: readonly UkiyoeHair[] = ["chonmage", "shimada", "child", "bald", "long", "elder", "topknot"];
export const UKIYOE_HATS: readonly UkiyoeHat[] = ["none", "kasa", "conical", "eboshi", "hood", "headband"];
export const UKIYOE_PROPS: readonly UkiyoeProp[] = ["none", "staff", "umbrella", "lantern", "fan", "pole", "basket-pole", "bundle", "fishing-rod", "scroll", "pipe"];
export const UKIYOE_BUILDS: readonly UkiyoeBuild[] = ["slim", "average", "stout", "child"];

export interface UkiyoeFigureLook {
  build?: UkiyoeBuild;
  /** Standing height in px at scale 1. */
  height?: number;
  skin?: UkiyoePaint;
  hair?: UkiyoeHair;
  hairColor?: UkiyoePaint;
  hat?: UkiyoeHat;
  hatColor?: UkiyoePaint;
  robe?: UkiyoePaint;
  robePattern?: UkiyoePattern;
  /** Under-robe: collar line and the sliver that shows when the robe parts. */
  under?: UkiyoePaint;
  obi?: UkiyoePaint;
  /** Haori jacket over the robe (also colours the sleeves). */
  coat?: UkiyoePaint;
  coatPattern?: UkiyoePattern;
  /** `robe`: full length. `tucked`: hitched to the knee over leggings (travellers, porters). `hakama`: pleated trousers. */
  lower?: "robe" | "tucked" | "hakama";
  hakama?: UkiyoePaint;
  legs?: UkiyoePaint;
  feet?: "waraji" | "geta" | "tabi" | "bare";
  sleeves?: "short" | "long";
  prop?: UkiyoeProp;
  propColor?: UkiyoePaint;
  /** Umbrella canopy / lantern / fan colour. */
  accent?: UkiyoePaint;
  lips?: UkiyoePaint;
  beard?: boolean;
}

export type UkiyoeActionType =
  | "walk" | "run" | "bow" | "wave" | "point" | "talk" | "look" | "kneel" | "pole" | "row" | "brace" | "dance"
  | "jump" | "turn" | "cheer" | "startle" | "carry" | "hold" | "sweep" | "pray";
export const UKIYOE_ACTIONS: readonly UkiyoeActionType[] = [
  "walk", "run", "bow", "wave", "point", "talk", "look", "kneel", "pole", "row", "brace", "dance", "jump", "turn", "cheer", "startle", "carry", "hold", "sweep", "pray",
];
export interface UkiyoeAction {
  type: UkiyoeActionType;
  start: number;
  end: number;
  /** walk/run: local x to travel to (relative to the node origin); optional y for slopes and bridges. */
  to?: number;
  toY?: number;
  /** point/hold/look: angle in degrees. bow: depth in degrees. */
  angle?: number;
  amount?: number;
  /** look: turn the head to look behind. */
  back?: boolean;
  /** Blend-in frames (default 6). */
  blend?: number;
}

export interface UkiyoeFigureSpec { look: UkiyoeFigureLook; actions?: readonly UkiyoeAction[]; facing?: "left" | "right" }

/** Joint angles, degrees. Shoulder/hip angles are measured from straight down, + toward the facing direction. */
export interface FigurePose {
  lean: number; tilt: number; crouch: number; lift: number;
  shF: number; elF: number; shB: number; elB: number;
  hipF: number; knF: number; hipB: number; knB: number;
  footF: number; footB: number;
  mouth: number; blink: number; kneel: number; headBack: number;
  propAngle: number; squash: number;
}

const STAND: FigurePose = {
  lean: 2, tilt: 2, crouch: 0, lift: 0,
  shF: 10, elF: 28, shB: -4, elB: 18,
  hipF: 3, knF: 2, hipB: -3, knB: 2, footF: 0, footB: 0,
  mouth: 0, blink: 0, kneel: 0, headBack: 0, propAngle: 0, squash: 0,
};
const KEYS = Object.keys(STAND) as (keyof FigurePose)[];

// ---- Travel ----------------------------------------------------------------------------------------------------------------------

const TRAVEL = new Set<UkiyoeActionType>(["walk", "run"]);
/** Root offset at a frame from the walk/run actions (each starts where the previous left off). */
export function travelAt(actions: readonly UkiyoeAction[], frame: number): { x: number; y: number; moving?: UkiyoeAction; from: Pt; dir: number } {
  let x = 0, y = 0, moving: UkiyoeAction | undefined, from: Pt = [0, 0], dir = 0;
  for (const a of actions) {
    if (!TRAVEL.has(a.type) || a.start > frame) continue;
    const tx = a.to ?? x, ty = a.toY ?? y, len = Math.max(1, a.end - a.start);
    const u = clamp01((frame - a.start) / len);
    // Short acceleration and deceleration; constant pace in between (no floaty ease on a walk).
    const accel = Math.min(.2, 10 / len), e = u < accel ? u * u / (2 * accel * (1 - accel)) : u > 1 - accel ? 1 - (1 - u) ** 2 / (2 * accel * (1 - accel)) : (u - accel / 2) / (1 - accel);
    from = [x, y];
    dir = Math.sign(tx - x) || dir;
    if (frame <= a.end) { moving = a; x = lerp(x, tx, e); y = lerp(y, ty, e); break; }
    x = tx; y = ty;
  }
  return { x, y, moving, from, dir };
}

/** Facing at a frame: walking sets it from the travel direction; `turn` flips it at the action's midpoint. */
export function facingAt(spec: UkiyoeFigureSpec, frame: number): { dir: 1 | -1; squeeze: number } {
  let dir: 1 | -1 = spec.facing === "left" ? -1 : 1, squeeze = 1, x = 0;
  for (const a of spec.actions ?? []) {
    if (a.start > frame) break;
    if (TRAVEL.has(a.type)) { const tx = a.to ?? x; if (tx !== x) dir = tx > x ? 1 : -1; x = tx; }
    if (a.type === "turn") {
      const mid = (a.start + a.end) / 2;
      if (frame >= mid) dir = dir === 1 ? -1 : 1;
      if (frame < a.end) squeeze = Math.max(.08, Math.abs(Math.cos(Math.PI * span(frame, a.start, a.end))));
    }
  }
  return { dir, squeeze };
}

// ---- Pose ------------------------------------------------------------------------------------------------------------------------

function weight(a: UkiyoeAction, frame: number): number {
  const b = a.blend ?? 6;
  if (frame < a.start || frame > a.end) return 0;
  return Math.min(1, smooth((frame - a.start) / Math.max(1, b)), smooth((a.end - frame) / Math.max(1, b)));
}

export function figurePose(spec: UkiyoeFigureSpec, frame: number, seed: number, height: number): FigurePose {
  const pose: FigurePose = { ...STAND };
  // Breathing and idle drift, always on.
  pose.lean += Math.sin(frame / 38 + seed) * .6;
  pose.shF += Math.sin(frame / 41 + seed) * 1.5;
  const tr = travelAt(spec.actions ?? [], frame);
  for (const a of spec.actions ?? []) {
    const w = weight(a, frame);
    if (w <= 0) continue;
    const t = frame - a.start, len = Math.max(1, a.end - a.start), target: Partial<FigurePose> = {};
    switch (a.type) {
      case "walk": case "run": {
        const run = a.type === "run", cycle = height * (run ? 1.25 : .62) * (a.amount ?? 1);
        const dist = Math.hypot(tr.x - tr.from[0], tr.y - tr.from[1]);
        const ph = (tr.moving === a ? dist : Math.abs((a.to ?? 0) - tr.from[0])) / cycle * Math.PI * 2;
        const A = run ? 30 : 17, s = Math.sin(ph), c = Math.cos(ph);
        target.hipF = A * s + 2; target.hipB = -A * s + 2;
        // The leg swinging forward bends its knee; the stance leg stays nearly straight.
        target.knF = (run ? 70 : 34) * Math.max(0, c) ** 1.4 + 3; target.knB = (run ? 70 : 34) * Math.max(0, -c) ** 1.4 + 3;
        target.footF = -12 * Math.max(0, c); target.footB = -12 * Math.max(0, -c);
        target.shF = (run ? 25 : 12) - (run ? 35 : 13) * s; target.shB = -(run ? 25 : 6) + (run ? 35 : 13) * s;
        target.elF = run ? 85 : 30; target.elB = run ? 85 : 22;
        target.lean = run ? 16 : 5;
        target.lift = run ? Math.abs(Math.sin(ph)) * height * .04 : 0;
        break;
      }
      case "bow": { const depth = a.angle ?? 38, k = smooth(span(t, 0, 14)) * (1 - smooth(span(t, len - 14, len))); target.lean = 2 + depth * k; target.tilt = 10 + 14 * k; target.shF = 18 + 10 * k; target.elF = 10; target.shB = 10; target.elB = 10; break; }
      case "wave": target.shF = 158; target.elF = 18 + 26 * Math.sin(t / 4.5); target.tilt = -4; break;
      case "point": target.shF = a.angle ?? 85; target.elF = 4; target.tilt = -2; break;
      case "talk": {
        const syl = Math.floor(t / 3), open = noise1(seed + 77, syl * .9) * .5 + .5;
        target.mouth = t % 3 === 0 && hash01(seed, syl) < .2 ? 0 : clamp01(open * 1.3);
        target.tilt = 2 + Math.sin(t / 9) * 3; target.shF = 34 + Math.sin(t / 11) * 12; target.elF = 60 + Math.sin(t / 7) * 14;
        break;
      }
      case "look": target.tilt = a.angle ?? -8; if (a.back) target.headBack = 1; break;
      case "kneel": target.kneel = 1; target.lean = 6; target.shF = 22; target.elF = 50; target.shB = 12; target.elB = 40; break;
      case "pole": {
        const c2 = Math.sin(t / 22 * Math.PI);
        target.lean = 14 + 12 * c2; target.shF = 40 + 25 * c2; target.elF = 40 - 20 * c2; target.shB = 70 + 20 * c2; target.elB = 30;
        target.hipF = 14 + 6 * c2; target.knF = 18; target.hipB = -16 - 6 * c2; target.knB = 6; target.propAngle = -24 - 16 * c2;
        break;
      }
      case "row": { const c2 = Math.sin(t / 18 * Math.PI); target.lean = 8 + 10 * c2; target.shF = 60 + 25 * c2; target.elF = 30; target.shB = 55 + 25 * c2; target.elB = 30; target.hipF = 16; target.hipB = -14; target.knF = 12; target.propAngle = c2 * 14; break; }
      case "brace": target.lean = -(a.angle ?? 14); target.shF = 160; target.elF = 120; target.hipF = -16; target.hipB = 14; target.knB = 12; target.tilt = 12; break;
      case "dance": {
        const ph = t / 34 * Math.PI;
        target.shF = 90 + 60 * Math.sin(ph); target.elF = 40 + 30 * Math.sin(ph * 1.5); target.shB = 30 + 50 * Math.sin(ph + 1.7); target.elB = 50;
        target.lean = 4 + 8 * Math.sin(ph * .5); target.tilt = 6 * Math.sin(ph); target.hipF = 10 * Math.sin(ph * .5); target.knF = 10 + 8 * Math.sin(ph); target.crouch = .15 + .1 * Math.sin(ph);
        break;
      }
      case "jump": {
        const u = t / len, crouch = u < .25 ? smooth(u / .25) : u > .8 ? 1 - smooth((u - .8) / .2) * .0 : 0;
        const air = u >= .25 && u <= .8 ? Math.sin(Math.PI * (u - .25) / .55) : 0;
        const land = u > .8 ? Math.sin(Math.PI * (u - .8) / .2) : 0;
        target.crouch = u < .25 ? .45 * crouch : land * .4; target.lift = air * height * (a.amount ?? .35);
        target.shF = u < .25 ? -10 : 130 * air + 20; target.shB = u < .25 ? -30 : 110 * air; target.knF = 30 * air; target.knB = 50 * air; target.squash = u < .25 ? -.08 * crouch : air * .06 - land * .08;
        break;
      }
      case "turn": target.lean = 0; break;
      case "cheer": target.shF = 165 + 8 * Math.sin(t / 3); target.elF = 10; target.shB = 160 + 8 * Math.sin(t / 3 + 1); target.elB = 10; target.lift = Math.abs(Math.sin(t / 5)) * height * .03; break;
      case "startle": { const k = smooth(span(t, 0, 4)); target.lean = -12 * k; target.shF = 120 * k; target.elF = 60; target.shB = 100 * k; target.elB = 70; target.lift = height * .05 * Math.sin(Math.PI * span(t, 0, 10)); target.tilt = -12; break; }
      case "carry": target.shF = 160; target.elF = 140; target.lift = Math.abs(Math.sin(frame / 7)) * height * .006; break;
      case "hold": target.shF = a.angle ?? 40; target.elF = a.amount ?? 80; break;
      case "sweep": { const c2 = Math.sin(t / 14 * Math.PI); target.lean = 22; target.shF = 30 + 30 * c2; target.elF = 30; target.shB = 20 + 30 * c2; target.elB = 40; target.propAngle = 20 * c2; break; }
      case "pray": target.shF = 55; target.elF = 105; target.shB = 50; target.elB = 105; target.tilt = 14; target.lean = 8; break;
    }
    for (const k of KEYS) if (target[k] !== undefined) pose[k] = lerp(pose[k], target[k]!, w);
  }
  // Seeded blinks every few seconds; eyes shut for 4 frames.
  const period = 96, slot = Math.floor((frame + seed % period) / period), at = (frame + seed % period) % period, blinkAt = 20 + Math.floor(hash01(seed, slot) * 60);
  if (at >= blinkAt && at < blinkAt + 4) pose.blink = Math.max(pose.blink, 1);
  return pose;
}

// ---- Skeleton --------------------------------------------------------------------------------------------------------------------

interface Skeleton {
  hip: Pt; neck: Pt; head: Pt; waistF: Pt; waistB: Pt;
  shF: Pt; elF: Pt; wrF: Pt; shB: Pt; elB: Pt; wrB: Pt;
  knF: Pt; anF: Pt; toeF: Pt; knB: Pt; anB: Pt; toeB: Pt;
  H: number; lean: number;
}
const dirDown = (deg: number): Pt => [Math.sin(deg * DEG), Math.cos(deg * DEG)];
const along = (p: Pt, deg: number, len: number): Pt => { const d = dirDown(deg); return [p[0] + d[0] * len, p[1] + d[1] * len]; };

function skeleton(pose: FigurePose, H: number, build: UkiyoeBuild): Skeleton {
  const child = build === "child";
  const thigh = H * (child ? .24 : .25), shin = H * (child ? .23 : .245), torso = H * (child ? .27 : .29);
  const reach = (hipA: number, knA: number) => thigh * Math.cos(hipA * DEG) + shin * Math.cos((hipA - knA) * DEG);
  let hipY = -Math.max(reach(pose.hipF, pose.knF), reach(pose.hipB, pose.knB));
  hipY += pose.crouch * H * .14;
  // Seiza: hips drop onto the heels, thighs forward.
  const kneel = pose.kneel;
  hipY = lerp(hipY, -H * .17, kneel) - pose.lift;
  const hip: Pt = [0, hipY];
  const lean = pose.lean;
  const neck = along(hip, 180 - lean, torso * (1 + pose.squash));
  const head = add(neck, [Math.sin(lean * DEG) * H * .03 + H * .012, -H * (child ? .1 : .072)]);
  const shBase = add(neck, [-Math.sin(lean * DEG) * -H * .01, H * .03]);
  const shF = add(shBase, [H * .012, 0]), shB = add(shBase, [-H * .02, H * .004]);
  const up = H * (child ? .15 : .165), fore = H * (child ? .14 : .15);
  const elF = along(shF, pose.shF + lean * .5, up), wrF = along(elF, pose.shF + pose.elF + lean * .5, fore);
  const elB = along(shB, pose.shB + lean * .5, up), wrB = along(elB, pose.shB + pose.elB + lean * .5, fore);
  let knF = along(hip, pose.hipF, thigh), anF = along(knF, pose.hipF - pose.knF, shin);
  let knB = along(hip, pose.hipB, thigh), anB = along(knB, pose.hipB - pose.knB, shin);
  if (kneel > 0) {
    // Folded legs: knees forward on the ground, shins under the thighs.
    const kF: Pt = [H * .2, -H * .02], aF: Pt = [-H * .06, -H * .02];
    knF = [lerp(knF[0], kF[0], kneel), lerp(knF[1], kF[1], kneel)]; anF = [lerp(anF[0], aF[0], kneel), lerp(anF[1], aF[1], kneel)];
    knB = [lerp(knB[0], kF[0] - H * .02, kneel), lerp(knB[1], kF[1], kneel)]; anB = [lerp(anB[0], aF[0] - H * .02, kneel), lerp(anB[1], aF[1], kneel)];
  }
  const foot = H * .085;
  const toeF = along(anF, 90 - pose.footF * (1 - kneel) + 90 * kneel * 0, foot * (1 - kneel * .6));
  const toeB = along(anB, 90 - pose.footB * (1 - kneel), foot * (1 - kneel * .6));
  const waist = along(hip, 180 - lean, torso * .3);
  const wn = dirDown(90 - lean);
  const waistF = add(waist, [wn[0] * H * .065, wn[1] * H * .065]), waistB = add(waist, [-wn[0] * H * .075, -wn[1] * H * .075]);
  return { hip, neck, head, waistF, waistB, shF, elF, wrF, shB, elB, wrB, knF, anF, toeF, knB, anB, toeB, H, lean };
}

// ---- Drawing helpers -------------------------------------------------------------------------------------------------------------

const lineW = (H: number) => Math.max(.9, H * .0062);
function limb(a: Pt, b: Pt, w0: number, w1: number): string {
  const tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1, nx = -ty / len, ny = tx / len;
  return smoothD([[a[0] + nx * w0, a[1] + ny * w0], [b[0] + nx * w1, b[1] + ny * w1], [b[0] + tx / len * w1 * .6, b[1] + ty / len * w1 * .6], [b[0] - nx * w1, b[1] - ny * w1], [a[0] - nx * w0, a[1] - ny * w0], [a[0] - tx / len * w0 * .6, a[1] - ty / len * w0 * .6]], true, .3);
}

/**
 * Kimono sleeve: attached along the upper arm, the bag hangs toward `gravity` (rotated by lag and wind). When the
 * forearm rises, the opening slides back toward the elbow and bare forearm shows — as real sleeves do.
 */
function sleeve(sh: Pt, el: Pt, wr: Pt, depth: number, width: number, gravityDeg: number): { d: string; cuff: Pt } {
  const rise = clamp01((el[1] - wr[1]) / (Math.hypot(wr[0] - el[0], wr[1] - el[1]) || 1));
  const slide = rise * .7;
  const cuff: Pt = [lerp(wr[0], el[0], slide), lerp(wr[1], el[1], slide)];
  const ax = cuff[0] - sh[0], ay = cuff[1] - sh[1], al = Math.hypot(ax, ay) || 1, ux = ax / al, uy = ay / al;
  // The panel hangs on the underside of the arm (behind it when the arm is lowered) and drops further under gravity.
  const n: Pt = [-uy, ux];
  const g = dirDown(gravityDeg), across = Math.abs(ux * g[1] - uy * g[0]);
  const drop = depth * (.35 + .65 * across);
  const wide = (p: Pt, k: number, extra: number): Pt => [p[0] + n[0] * width * k + g[0] * extra, p[1] + n[1] * width * k + g[1] * extra];
  const top0: Pt = [sh[0] - n[0] * width * .18, sh[1] - n[1] * width * .18];
  const cuffTop: Pt = [cuff[0] - n[0] * width * .16, cuff[1] - n[1] * width * .16];
  const cuffBot = wide(cuff, .32, 0);
  const bagF = wide(cuff, .95, drop * .9), bagB = wide([lerp(sh[0], cuff[0], .3), lerp(sh[1], cuff[1], .3)], .9, drop);
  const bagMid: Pt = [lerp(bagF[0], bagB[0], .5) + g[0] * width * .12, lerp(bagF[1], bagB[1], .5) + g[1] * width * .12];
  const pts: Pt[] = [top0, cuffTop, cuffBot, [lerp(cuffBot[0], bagF[0], .7), lerp(cuffBot[1], bagF[1], .7)], bagF, bagMid, bagB, wide(sh, .55, depth * .2)];
  return { d: smoothD(pts, true, .3), cuff };
}

function hand(wr: Pt, el: Pt, H: number): string {
  const a = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
  const s = H * .022, tip: Pt = [wr[0] + Math.cos(a) * s * 2, wr[1] + Math.sin(a) * s * 2];
  const n: Pt = [-Math.sin(a), Math.cos(a)];
  return smoothD([[wr[0] + n[0] * s * .7, wr[1] + n[1] * s * .7], [tip[0] + n[0] * s * .4, tip[1] + n[1] * s * .4], tip, [tip[0] - n[0] * s * .5, tip[1] - n[1] * s * .5], [wr[0] - n[0] * s * .7, wr[1] - n[1] * s * .7]], true, .4);
}

// Head geometry in a unit box (facing right, origin head centre, ±20 units ≈ head height).
const FACE: Pt[] = [
  [0, -20], [10, -17], [15.5, -10], [16.6, -4], [17, -1], [20.2, 4.2], [17.4, 6.4], [17.8, 7.8], [16.6, 9.4], [17.4, 10.8], [15.4, 15.2], [11, 18], [5, 19.5],
  [3, 25], [-6, 25], [-8, 15], [-14.5, 6], [-16, -4], [-13, -14], [-7, -19],
];

function headPrims(look: UkiyoeFigureLook, pose: FigurePose, k: number, H: number, wind: number, frame: number, seed: number): Prim[] {
  const P = (x: number, y: number): Pt => [x * k, y * k];
  const out: Prim[] = [], lw = lineW(H) * .85, skin = look.skin ?? "hada", hairC = look.hairColor ?? (look.hair === "elder" ? "usuzumi" : "sumi");
  const hair = look.hair ?? "chonmage", female = hair === "shimada" || hair === "long";
  // Long hair falls behind the head and blows in the wind.
  if (hair === "long") {
    const sway = wind * 10 + Math.sin(frame / 20 + seed) * 2;
    out.push({ t: "fill", d: smoothD([P(-6, -18), P(-17, -6), P(-19 - sway * .3, 20), P(-16 - sway, 52), P(-22 - sway * 1.4, 88), P(-8 - sway, 86), P(-6, 40), P(-4, 12)], true, .4), fill: hairC, outline: lw });
  }
  if (hair === "shimada") out.push({ t: "fill", d: smoothD([P(-12, 4), P(-25, 8), P(-27, 16), P(-17, 19), P(-8, 14)], true, .5), fill: hairC, outline: lw });
  out.push({ t: "fill", d: smoothD(FACE.map(q => P(q[0], q[1])), true, .32), fill: skin, outline: lw, outlineColor: "sumi" });
  // Shaved pate of an Edo man: a cool blue-grey crown.
  if (hair === "chonmage" || hair === "elder") out.push({ t: "fill", d: smoothD([P(-2, -19.6), P(9, -17.4), P(14.6, -11.5), P(9, -12), P(2, -13), P(-4, -14.5)], true, .4), fill: { type: "linear", angle: 90, stops: [[0, "sora", .85], [1, "sora", .35]] } });
  // Eye, brow, mouth.
  const shut = pose.blink;
  if (shut > .5) out.push({ t: "line", d: carvedLine([P(7.5, -1), P(10, .3), P(12.6, -.2)], .9 * k * .5 + .6, { taper: "both" }), color: "sumi" });
  else {
    out.push({ t: "line", d: carvedLine([P(6.8, -1.6), P(9.8, -2.6), P(12.8, -.6)], k * .55 + .5, { taper: "both" }), color: "sumi" });
    out.push({ t: "dots", d: circleD(11 * k, -1.2 * k, .95 * k), color: "sumi" });
  }
  out.push({ t: "line", d: carvedLine([P(5.5, -6.2), P(9.5, -7.6), P(13.2, -6.2)], k * .45 + .4, { taper: "both" }), color: hairC === "usuzumi" ? "usuzumi" : "sumi", opacity: .9 });
  if (pose.mouth > .08) out.push({ t: "fill", d: ellipseD(16.4 * k, 9.4 * k, 1.5 * k, (.6 + 1.6 * pose.mouth) * k), fill: "kogecha", noPrint: true });
  else if (female || look.lips) out.push({ t: "fill", d: ellipseD(17 * k, 9.3 * k, 1.1 * k, .7 * k), fill: look.lips ?? "beni", noPrint: true });
  if (!female && hair !== "child") out.push({ t: "line", d: carvedLine([P(-1, 2), P(-3, 4.5), P(-1.5, 7)], k * .4 + .3), color: "sumi", opacity: .7 });
  if (look.beard) out.push({ t: "fill", d: smoothD([P(15, 12), P(11, 22), P(6, 26), P(5, 18), P(9, 15)], true, .4), fill: hairC, outline: lw * .7 });
  // Hair styles.
  switch (hair) {
    case "chonmage": case "elder": {
      out.push({ t: "fill", d: smoothD([P(-4, -14.5), P(2, -13), P(5, -9), P(4, -3), P(-1, 3), P(-4, 10), P(-9, 16), P(-15, 6), P(-16, -4), P(-12, -14)], true, .4), fill: hairC, outline: lw });
      out.push({ t: "fill", d: smoothD([P(-9, -17), P(-3, -21), P(6, -24.5), P(9, -23.5), P(2, -20), P(-6, -15.5)], true, .4), fill: hairC, outline: lw });
      break;
    }
    case "topknot": out.push({ t: "fill", d: smoothD([P(-1, -20), P(10, -17), P(15.5, -10), P(12, -12), P(4, -14), P(-2, -8), P(-6, 4), P(-10, 15), P(-15, 6), P(-16, -6), P(-11, -16)], true, .4), fill: hairC, outline: lw }); out.push({ t: "fill", d: ellipseD(-6 * k, -22 * k, 5 * k, 4 * k), fill: hairC, outline: lw }); break;
    case "shimada": {
      out.push({ t: "fill", d: smoothD([P(-1, -21), P(9, -20), P(15, -12), P(12, -11), P(6, -12), P(2, -6), P(3, 3), P(-2, 8), P(-9, 12), P(-15, 5), P(-17, -6), P(-12, -17)], true, .4), fill: hairC, outline: lw });
      out.push({ t: "fill", d: smoothD([P(-12, -18), P(-10, -29), P(0, -33), P(9, -29), P(8, -21), P(-2, -20)], true, .45), fill: hairC, outline: lw });
      out.push({ t: "fill", d: smoothD([P(-4, -22.5), P(1, -27), P(6, -23)], false, .4) + "Z", fill: look.accent ?? "shu", outline: lw * .7 });
      out.push({ t: "line", d: carvedLine([P(-14, -26), P(10, -30)], 1.2 * k * .5 + .6, { taper: "none" }), color: "kin" });
      out.push({ t: "dots", d: circleD(10.5 * k, -30 * k, 1.6 * k) + circleD(-14.5 * k, -26 * k, 1.4 * k), color: look.accent ?? "shu" });
      break;
    }
    case "child": out.push({ t: "fill", d: smoothD([P(-1, -21), P(10, -18), P(15, -11), P(11, -9), P(6, -11), P(3, -6), P(0, 3), P(-6, 8), P(-15, 4), P(-16, -8), P(-11, -18)], true, .4), fill: hairC, outline: lw }); out.push({ t: "fill", d: ellipseD(-1 * k, -22 * k, 3.4 * k, 2.6 * k), fill: hairC }); break;
    case "long": out.push({ t: "fill", d: smoothD([P(-1, -21), P(9, -19), P(15.6, -10), P(12, -9), P(5, -11), P(1, -4), P(-1, 8), P(-7, 18), P(-16, 8), P(-17, -6), P(-12, -17)], true, .4), fill: hairC, outline: lw }); break;
    case "bald": break;
  }
  // Hats.
  const hat = look.hat ?? "none", hatC = look.hatColor ?? (hat === "eboshi" ? "sumi" : hat === "hood" ? "ai" : "kincha");
  if (hat === "kasa" || hat === "conical") {
    const deep = hat === "conical", lift = clamp01(Math.abs(wind) - .8) * 4 * Math.sign(wind);
    const rim = deep ? 24 : 30, apexY = deep ? -36 : -27;
    const brim: Pt[] = [P(-rim, -9 + lift), P(0, apexY), P(rim + 2, -10 - lift), P(rim - 2, -7.5 - lift), P(0, -12.5), P(-rim + 2, -6.6 + lift)];
    out.push({ t: "fill", d: smoothD(brim, true, .18), fill: { type: "linear", angle: 0, stops: [[0, hatC, 1], [1, "ki", 1]] }, outline: lw, grain: .6 });
    const ribs: string[] = [];
    for (let i = 1; i < 8; i++) { const u = i / 8; ribs.push(`M${0} ${apexY * k}L${lerp(-rim, rim + 2, u) * k} ${lerp(-9 + lift, -10 - lift, u) * k}`); }
    out.push({ t: "stroke", d: ribs.join(""), color: "cha", width: .8, opacity: .7 });
    out.push({ t: "stroke", d: `M${5 * k} ${-10 * k}Q${10 * k} ${8 * k} ${14 * k} ${14 * k}`, color: "kogecha", width: .9, opacity: .8 });
  } else if (hat === "eboshi") {
    out.push({ t: "fill", d: smoothD([P(-12, -14), P(-14, -30), P(-8, -46), P(2, -44), P(4, -30), P(8, -16), P(0, -13)], true, .35), fill: hatC, outline: lw, grain: .3 });
  } else if (hat === "hood") {
    out.push({ t: "fill", d: smoothD([P(-4, -23), P(10, -20), P(16, -10), P(13, -9), P(9, -14), P(4, -10), P(4, 12), P(-6, 26), P(-18, 22), P(-18, -6), P(-13, -18)], true, .35), fill: hatC, outline: lw, grain: .3 });
  } else if (hat === "headband") {
    const tail = wind * 8 + Math.sin(frame / 4 + seed) * 2;
    out.push({ t: "fill", d: smoothD([P(-16, -9), P(14, -12), P(15, -9), P(-15, -5)], true, .2), fill: hatC === "kincha" ? "gofun" : hatC, outline: lw * .8 });
    out.push({ t: "fill", d: smoothD([P(-15, -8), P(-22 - tail, -14), P(-26 - tail * 1.4, -10), P(-21 - tail, -7), P(-24 - tail * 1.3, -2), P(-16, -6)], true, .3), fill: hatC === "kincha" ? "gofun" : hatC, outline: lw * .8 });
  }
  return out;
}

// ---- Props -------------------------------------------------------------------------------------------------------------------------

function propPrims(look: UkiyoeFigureLook, pose: FigurePose, s: Skeleton, wind: number, frame: number, layer: "back" | "front" | "over"): Prim[] {
  const prop = look.prop ?? "none", H = s.H, lw = lineW(H), color = look.propColor ?? "cha", accent = look.accent ?? "ai", out: Prim[] = [];
  const w = s.wrF;
  if (layer === "back" && prop === "bundle") {
    const c = add(s.neck, [-H * .1, H * .1]);
    out.push({ t: "fill", d: ellipseD(c[0], c[1], H * .09, H * .1), fill: accent, outline: lw, pattern: { type: "kanoko", color: "gofun", scale: .6, opacity: .7 } });
  }
  if (layer === "back" && prop === "basket-pole") {
    const bounce = Math.sin(frame / 3.5) * H * .012;
    const sh = add(s.shF, [0, -H * .02]), a: Pt = add(sh, [H * .45, -H * .02 + bounce * .5]), b: Pt = add(sh, [-H * .45, H * .01 - bounce * .5]);
    out.push({ t: "line", d: carvedLine([b, sh, a], H * .018, { taper: "none" }), color });
    for (const end of [a, b]) {
      const sw = Math.sin(frame / 9 + end[0]) * 3 + wind * 6, base: Pt = [end[0] + sw, end[1] + H * .3 + bounce];
      out.push({ t: "stroke", d: `M${end[0]} ${end[1]}L${base[0] - H * .07} ${base[1] - H * .08}M${end[0]} ${end[1]}L${base[0] + H * .07} ${base[1] - H * .08}`, color: "kogecha", width: 1.2 });
      out.push({ t: "fill", d: polyD([[base[0] - H * .09, base[1] - H * .09], [base[0] + H * .09, base[1] - H * .09], [base[0] + H * .07, base[1]], [base[0] - H * .07, base[1]]]), fill: "kincha", outline: lw, pattern: { type: "kikko", color: "cha", scale: .35, opacity: .7 } });
    }
  }
  if (layer !== "front" && layer !== "over") return out;
  if (layer === "front") {
    switch (prop) {
      case "staff": out.push({ t: "line", d: carvedLine([add(w, [H * .01, -H * .12]), add(w, [H * .07, H * .36 + -w[1] * 0 + Math.max(0, -w[1] - H * .4)])], H * .016, { taper: "none" }), color }); break;
      case "pole": case "fishing-rod": {
        const ang = (prop === "pole" ? 70 + pose.propAngle : -40 + pose.propAngle);
        const len = prop === "pole" ? H * 1.7 : H * 1.6;
        const a = polar(w, ang + 180, len * (prop === "pole" ? .35 : .1)), b = polar(w, ang, len * (prop === "pole" ? .65 : .9));
        out.push({ t: "line", d: carvedLine([a, b], H * (prop === "pole" ? .016 : .008), { taper: prop === "pole" ? "none" : "end" }), color });
        if (prop === "fishing-rod") out.push({ t: "stroke", d: `M${b[0]} ${b[1]}Q${b[0] + 20} ${b[1] + H * .4} ${b[0] + 10 + wind * 20} ${b[1] + H * .8}`, color: "usuzumi", width: .8 });
        break;
      }
      case "lantern": {
        const tip = add(w, [H * .16, -H * .05]);
        out.push({ t: "line", d: carvedLine([w, tip], H * .01, { taper: "none" }), color });
        const sw = Math.sin(frame / 11) * 4 + wind * 8, c: Pt = [tip[0] + sw, tip[1] + H * .14];
        out.push({ t: "stroke", d: `M${tip[0]} ${tip[1]}L${c[0]} ${c[1] - H * .07}`, color: "sumi", width: 1 });
        out.push({ t: "glow", cx: c[0], cy: c[1], r: H * .4, color: "ki", opacity: .5 * (.85 + .15 * Math.abs(noise1(frame, frame / 3))) });
        out.push({ t: "fill", d: ellipseD(c[0], c[1], H * .05, H * .07), fill: { type: "radial", stops: [[0, "ki", 1], [1, look.accent ?? "shu", 1]] }, outline: lw });
        break;
      }
      case "fan": {
        const a = Math.atan2(w[1] - s.elF[1], w[0] - s.elF[0]) / DEG, r = H * .14, pts: Pt[] = [w];
        for (let i = 0; i <= 8; i++) pts.push(polar(w, a - 70 + 140 * i / 8 - 90, r));
        out.push({ t: "fill", d: polyD(pts), fill: { type: "radial", center: [.5, 1], radius: 1, stops: [[0, "gofun", 1], [.5, "gofun", 1], [1, accent, 1]] }, outline: lw });
        const ribs = pts.slice(1).map(q => `M${w[0]} ${w[1]}L${q[0]} ${q[1]}`).join("");
        out.push({ t: "stroke", d: ribs, color: "cha", width: .7, opacity: .7 });
        break;
      }
      case "scroll": out.push({ t: "fill", d: ellipseD(w[0] + H * .03, w[1], H * .06, H * .018), fill: "gofun", outline: lw }); break;
      case "pipe": out.push({ t: "line", d: carvedLine([w, add(w, [H * .14, -H * .06])], H * .008, { taper: "none" }), color: "kogecha" }); break;
    }
  }
  if (layer === "over" && prop === "umbrella") {
    // Wagasa: oiled-paper canopy on a bamboo shaft held over the head, tipped into the wind; janome ring near the rim.
    const target: Pt = [s.head[0] + H * .01, s.head[1] - H * .3];
    const base = Math.atan2(target[0] - w[0], -(target[1] - w[1])) / DEG;
    const tilt = clamp(base - wind * 14 + Math.sin(frame / 30) * 1.5, -60, 60), ang = tilt * DEG;
    const shaft = Math.hypot(target[0] - w[0], target[1] - w[1]), top = add(w, [Math.sin(ang) * shaft, -Math.cos(ang) * shaft]);
    out.push({ t: "line", d: carvedLine([add(w, [-Math.sin(ang) * H * .07, Math.cos(ang) * H * .07]), top], H * .011, { taper: "none" }), color: "cha" });
    const R = H * .34;
    const rot = (x: number, y: number): Pt => [top[0] + x * Math.cos(ang) - y * Math.sin(ang), top[1] + x * Math.sin(ang) + y * Math.cos(ang)];
    const dome: Pt[] = [], rim: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12 * 2 - 1; dome.push(rot(u * R, -R * .5 * (1 - u * u) ** .7 + R * .12)); }
    for (let i = 12; i >= 0; i--) { const u = i / 12 * 2 - 1; rim.push(rot(u * R * .98, R * .12 + R * .1 * (1 - u * u))); }
    out.push({ t: "fill", d: smoothD([...dome, ...rim], true, .25), fill: accent, outline: lw, grain: .4 });
    const ring: Pt[] = [], ringIn: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12 * 2 - 1; ring.push(rot(u * R * .9, -R * .42 * (1 - (u * .9) ** 2) ** .75 * .32 + R * .16)); ringIn.push(rot(u * R * .72, -R * .42 * (1 - (u * .72) ** 2) ** .75 * .5 + R * .1)); }
    out.push({ t: "fill", d: smoothD([...ring, ...ringIn.reverse()], true, .3), fill: "gofun", opacity: .92 });
    const apex = rot(0, -R * .3);
    out.push({ t: "stroke", d: dome.filter((_, i) => i % 2 === 0).map(q => `M${apex[0].toFixed(1)} ${apex[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(""), color: "sumi", width: .7, opacity: .35 });
    out.push({ t: "fill", d: ellipseD(apex[0], apex[1], H * .012, H * .008), fill: "sumi" });
  }
  return out;
}

// ---- Figure ----------------------------------------------------------------------------------------------------------------------

export interface DrawnFigure { prims: Prim[]; x: number; y: number; dir: 1 | -1; squeeze: number }

export function figureHeight(look: UkiyoeFigureLook): number {
  return look.height ?? ({ slim: 262, average: 250, stout: 238, child: 168 } as const)[look.build ?? "average"];
}

export function drawFigure(spec: UkiyoeFigureSpec, frame: number, wind: number, seed: number): DrawnFigure {
  const look = spec.look, H = figureHeight(look), build = look.build ?? "average";
  const pose = figurePose(spec, frame, seed, H), prev = figurePose(spec, frame - 2, seed, H);
  const s = skeleton(pose, H, build), sp = skeleton(prev, H, build);
  const { dir, squeeze } = facingAt(spec, frame);
  const tr = travelAt(spec.actions ?? [], frame);
  // Wind in the figure's own frame: blowing toward its back raises sleeves behind it.
  const wl = wind * dir;
  const lw = lineW(H), out: Prim[] = [];
  const robe = look.robe ?? "ai", under = look.under ?? "beni", coat = look.coat, sleeveC = coat ?? robe;
  const sleeveDepth = H * (look.sleeves === "long" ? .34 : .17), sleeveW = H * .13;
  const lagF = clamp(((s.wrF[0] - sp.wrF[0]) * -1.4) + wl * -22, -55, 55), lagB = clamp(((s.wrB[0] - sp.wrB[0]) * -1.4) + wl * -22, -55, 55);
  const travelLag = clamp((tr.moving ? -1 : 0) * (tr.moving?.type === "run" ? 18 : 6), -30, 30);
  const k = H * (build === "child" ? .085 : .064) / 18, stout = build === "stout" ? 1.14 : build === "slim" ? .93 : 1;
  const legC = look.legs ?? look.skin ?? "hada", feet = look.feet ?? "waraji";
  const back = (c: UkiyoePaint): UkiyoePaint => c;

  // Back prop and back arm.
  out.push(...propPrims(look, pose, s, wl, frame, "back"));
  const bs = sleeve(s.shB, s.elB, s.wrB, sleeveDepth, sleeveW, -lagB * .6 - travelLag);
  if (bs.cuff !== s.wrB) out.push({ t: "fill", d: limb(bs.cuff, s.wrB, H * .016, H * .014), fill: look.skin ?? "hada", outline: lw * .8 });
  out.push({ t: "fill", d: hand(s.wrB, s.elB, H), fill: look.skin ?? "hada", outline: lw * .8 });
  out.push({ t: "fill", d: bs.d, fill: back(sleeveC), outline: lw, pattern: coat ? look.coatPattern : look.robePattern, grain: .2 });
  out.push({ t: "fill", d: bs.d, fill: "sumi", opacity: .12, noPrint: true });

  // Legs below the hem (back first).
  const lower = look.lower ?? "robe";
  const legPrims = (kn: Pt, an: Pt, toe: Pt, isBack: boolean): Prim[] => {
    const p: Prim[] = [];
    const legW = H * .028 * stout;
    if (lower === "hakama") return p;
    p.push({ t: "fill", d: limb(kn, an, legW, legW * .8), fill: legC, outline: lw * .9 });
    const sole: Pt = [toe[0] + H * .012, toe[1]];
    p.push({ t: "fill", d: smoothD([[an[0] - H * .025, an[1] - H * .01], [an[0] + H * .01, an[1] - H * .03], sole, [toe[0], toe[1] + H * .008], [an[0] - H * .03, an[1] + H * .01]], true, .35), fill: feet === "tabi" ? "gofun" : legC, outline: lw * .9 });
    if (feet === "geta") p.push({ t: "fill", d: polyD([[an[0] - H * .04, an[1] + H * .012], [sole[0] + H * .01, toe[1] + H * .01], [sole[0] + H * .01, toe[1] + H * .03], [an[0] - H * .04, an[1] + H * .032]]), fill: "cha", outline: lw * .8 });
    if (feet === "waraji") p.push({ t: "line", d: carvedLine([[an[0] - H * .035, an[1] + H * .012], [sole[0] + H * .005, toe[1] + H * .01]], H * .012, { taper: "none" }), color: "kincha" });
    if (isBack) p.push({ t: "fill", d: limb(kn, an, legW, legW * .8), fill: "sumi", opacity: .1, noPrint: true });
    return p;
  };
  if (pose.kneel < .5) out.push(...legPrims(s.knB, s.anB, s.toeB, true));
  if (lower !== "hakama" && pose.kneel < .5) out.push(...legPrims(s.knF, s.anF, s.toeF, false));

  // Robe skirt.
  const hemY = lower === "tucked" ? Math.max(s.knF[1], s.knB[1]) + H * .02 : Math.max(s.anF[1], s.anB[1]) - H * .035;
  const frontX = Math.max(s.knF[0], s.anF[0], s.knB[0], s.anB[0]), backX = Math.min(s.knF[0], s.anF[0], s.knB[0], s.anB[0]);
  const hemSway = Math.sin(frame / 7) * H * .006 * (tr.moving ? 1 : .2) - wl * H * .025;
  const trailing = lower === "robe" && (look.hair === "shimada" || look.hair === "long" || look.sleeves === "long");
  const hemF: Pt = [frontX + H * (trailing ? .06 : .05) * stout - hemSway * .5, hemY - H * .004], hemB: Pt = [backX - H * (trailing ? .12 : .07) * stout + hemSway, trailing ? 0 : hemY + H * .006];
  if (lower === "hakama") {
    for (const [kn, an, isBack] of [[s.knB, s.anB, true], [s.knF, s.anF, false]] as const) {
      const hc = look.hakama ?? "usuzumi", d = smoothD([s.waistB, add(kn, [-H * .06, 0]), add(an, [-H * .075, H * .02]), add(an, [H * .07, H * .02]), add(kn, [H * .055, 0]), s.waistF], true, .3);
      out.push({ t: "fill", d, fill: hc, outline: lw, grain: .3 });
      out.push({ t: "stroke", d: `M${s.hip[0]} ${s.hip[1]}L${an[0] - H * .02} ${an[1]}M${s.hip[0] + H * .02} ${s.hip[1]}L${an[0] + H * .03} ${an[1]}`, color: "sumi", width: lw * .7, opacity: .5 });
      if (isBack) out.push({ t: "fill", d, fill: "sumi", opacity: .1, noPrint: true });
      out.push({ t: "fill", d: smoothD([add(an, [-H * .02, -H * .01]), add(an, [H * .06, H * .0]), add(an, [H * .065, H * .02]), add(an, [-H * .03, H * .02])], true, .3), fill: feet === "tabi" ? "gofun" : legC, outline: lw * .8 });
    }
  } else {
    const kneel = pose.kneel;
    const skirt: Pt[] = kneel > .5
      ? [s.waistF, [s.waistF[0] + H * .12, s.waistF[1] + H * .06], [H * .24, -H * .045], [H * .25, 0], [-H * .14, 0], [-H * .15, -H * .05], [s.waistB[0] - H * .05, s.waistB[1] + H * .06], s.waistB]
      : [s.waistF, [lerp(s.waistF[0], hemF[0], .55) + H * .02, lerp(s.waistF[1], hemF[1], .5)], hemF, [lerp(hemF[0], hemB[0], .5), hemY + H * .012], hemB,
        [s.waistB[0] - H * .045 * stout, lerp(s.waistB[1], hemB[1], .4)], s.waistB];
    const skirtD = smoothD(skirt, true, .3);
    // The parted front: under-robe shows between the legs when the stride opens.
    const open = clamp01((s.knF[0] - s.knB[0]) / (H * .2)) * (lower === "robe" ? 1 : .4) * (1 - kneel);
    out.push({ t: "fill", d: skirtD, fill: robe, outline: lw, pattern: look.robePattern, grain: .25 });
    if (open > .15) {
      const tipX = lerp(hemF[0], s.knF[0], .5);
      out.push({ t: "fill", d: polyD([[s.waistF[0] - H * .005, s.waistF[1] + H * .03], [hemF[0] - H * .005, hemF[1]], [tipX - H * .05 * open, hemY + H * .01]]), fill: under, outline: lw * .8 });
    }
    // Layered hem: a band of the under-robe along the bottom edge, as in bijin-ga.
    if (trailing && kneel < .5) {
      const band: Pt[] = [hemF, [lerp(hemF[0], hemB[0], .5), hemY + H * .012], hemB];
      out.push({ t: "line", d: carvedLine(band, H * .022, { taper: "swell" }), color: under });
      out.push({ t: "line", d: carvedLine(band.map(q => [q[0], q[1] - H * .012] as Pt), lw * .8, { taper: "none" }), color: "sumi", opacity: .6 });
    }
    // Fold lines falling from the obi.
    const folds = kneel > .5 ? [[.2, .5]] : [[.25, .35], [.6, .7], [.85, .9]];
    for (const [u, v] of folds) {
      const top: Pt = [lerp(s.waistF[0], s.waistB[0], u), lerp(s.waistF[1], s.waistB[1], u) + H * .03];
      const bot: Pt = kneel > .5 ? [lerp(H * .2, -H * .1, v), -H * .03] : [lerp(hemF[0], hemB[0], v), hemY - H * .02];
      out.push({ t: "line", d: carvedLine(quad(top, [lerp(top[0], bot[0], .5) + H * .015, lerp(top[1], bot[1], .5)], bot, 8), lw * 1.1, { taper: "both", seed: seed + Math.round(u * 10) }), color: "sumi", opacity: .45 });
    }
  }

  // Torso (jacket or robe), obi, collar.
  const nb = add(s.neck, [-H * .035, H * .006]), nf = add(s.neck, [H * .02, H * .012]);
  const chestF = add(s.shF, [H * .045 * stout, H * .06]), backTop = add(s.shB, [-H * .055 * stout, H * .03]);
  const torsoD = smoothD([nb, nf, chestF, [s.waistF[0] + H * .01, s.waistF[1] + H * .02], [s.waistB[0] - H * .01, s.waistB[1] + H * .02], backTop], true, .3);
  out.push({ t: "fill", d: torsoD, fill: robe, outline: lw, pattern: look.robePattern, grain: .25 });
  out.push({ t: "line", d: carvedLine([add(s.neck, [-H * .01, H * .004]), add(s.neck, [H * .022, H * .04]), [s.waistF[0] - H * .012, s.waistF[1] - H * .02]], H * .014, { taper: "end" }), color: under });
  out.push({ t: "line", d: carvedLine([add(s.neck, [-H * .006, H * .008]), add(s.neck, [H * .018, H * .042]), [s.waistF[0] - H * .02, s.waistF[1] - H * .02]], lw * .9, { taper: "end" }), color: "sumi", opacity: .7 });
  if (coat) {
    const hemCoat: Pt = [lerp(s.waistF[0], s.knF[0], .55) + H * .03, lerp(s.waistF[1], s.knF[1], .55)], hemCoatB: Pt = [s.waistB[0] - H * .05, hemCoat[1] + H * .01];
    out.push({ t: "fill", d: smoothD([nb, add(s.neck, [H * .01, H * .02]), add(chestF, [H * .005, H * .02]), hemCoat, hemCoatB, backTop], true, .3), fill: coat, outline: lw, pattern: look.coatPattern, grain: .25 });
  }
  const obiH = H * .055, obiC = look.obi ?? (look.hair === "shimada" ? "kincha" : "kogecha");
  const wn = dirDown(90 - s.lean), up: Pt = [Math.sin(s.lean * DEG), -Math.cos(s.lean * DEG)];
  const o1 = add(s.waistB, [-wn[0] * H * .01, 0]), o2 = add(s.waistF, [wn[0] * H * .01, 0]);
  out.push({ t: "fill", d: polyD([add(o1, [up[0] * obiH * .5, up[1] * obiH * .5]), add(o2, [up[0] * obiH * .5, up[1] * obiH * .5]), add(o2, [-up[0] * obiH * .5, -up[1] * obiH * .5]), add(o1, [-up[0] * obiH * .5, -up[1] * obiH * .5])]), fill: obiC, outline: lw, grain: .3 });
  if (look.hair === "shimada" || look.hair === "long") {
    // Taiko knot: a big folded box at the back.
    const kb = add(s.waistB, [-H * .02, -H * .01]);
    out.push({ t: "fill", d: smoothD([add(kb, [H * .01, -H * .075]), add(kb, [-H * .055, -H * .08]), add(kb, [-H * .065, H * .025]), add(kb, [H * .005, H * .03])], true, .2), fill: obiC, outline: lw, pattern: { type: "kikko", color: "kin", scale: .25, opacity: .6 } });
  }

  // Head, tilted about the neck.
  const tilt = pose.tilt + s.lean * .4;
  const headFlip = pose.headBack > .5 ? -1 : 1;
  out.push({ t: "group", transform: `translate(${s.head[0].toFixed(2)} ${s.head[1].toFixed(2)}) rotate(${(tilt * headFlip).toFixed(2)}) scale(${headFlip} 1)`, prims: headPrims(look, pose, k, H, wl * headFlip, frame, seed) });

  // Front arm, sleeve and hand-held prop.
  out.push(...propPrims(look, pose, s, wl, frame, "front"));
  const fs = sleeve(s.shF, s.elF, s.wrF, sleeveDepth, sleeveW, -lagF * .6 - travelLag);
  if (fs.cuff !== s.wrF) out.push({ t: "fill", d: limb(fs.cuff, s.wrF, H * .016, H * .014), fill: look.skin ?? "hada", outline: lw * .8 });
  out.push({ t: "fill", d: hand(s.wrF, s.elF, H), fill: look.skin ?? "hada", outline: lw * .8 });
  out.push({ t: "fill", d: fs.d, fill: sleeveC, outline: lw, pattern: coat ? look.coatPattern : look.robePattern, grain: .25 });
  out.push({ t: "line", d: carvedLine(quad(add(s.shF, [0, H * .02]), add(s.elF, [H * .01, H * .03]), add(fs.cuff, [0, H * .05]), 6), lw * .9, { taper: "both" }), color: "sumi", opacity: .4 });
  out.push(...propPrims(look, pose, s, wl, frame, "over"));

  // Contact shadow: a soft usuzumi smudge (the prints rarely cast shadows; this only grounds the feet).
  const lift = pose.lift;
  out.unshift({ t: "fill", d: ellipseD((s.anF[0] + s.anB[0]) / 2, 2, H * .16 * (1 - clamp01(lift / H * 3) * .5), H * .016), fill: "sumi", opacity: .1 * (1 - clamp01(lift / (H * .3))), noPrint: true });
  return { prims: out, x: tr.x, y: tr.y, dir, squeeze };
}

/** Ease export used by tests to keep the gait easing honest. */
export const _figureEase = ease;
