/**
 * COLLAGE1 paper puppet: a jointed cutout figure, posed from the absolute frame.
 *
 * Built the way a cutout animator builds one: separate paper parts (head, hair, torso, two-part arms and
 * legs, shoes) pinned at joints, so any action is only a set of joint angles. Actions layer over an idle
 * breath with short ease-in/out blends, and the walk derives its step length from the travel distance so
 * the planted foot does not skate. No physics state: seeking is exact.
 *
 * Angles are "forward-positive" in degrees: a limb at 0 hangs straight down, positive swings it toward
 * the way the figure faces. `facing: -1` mirrors the whole figure.
 */
import { hash01, hashSigned, noise1 } from "./collage-geometry";
import { ease } from "./collage-motion";

export type PuppetHair = "short" | "bob" | "long" | "bun" | "curly" | "cap" | "bald" | "ponytail";
export type PuppetTop = "shirt" | "coat" | "dress" | "sweater" | "vest";
export type PuppetAccessory = "glasses" | "tie" | "scarf" | "satchel" | "none";

export interface CollagePuppetLook {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  shoes: string;
  /** Collar, tie, scarf or cap band. */
  accent?: string;
  hairStyle?: PuppetHair;
  topStyle?: PuppetTop;
  accessory?: PuppetAccessory;
  /** 0 = slim, 1 = broad. */
  build?: number;
  /** Short sleeves show the forearm's skin. */
  shortSleeves?: boolean;
  /** Visible paper fasteners at the front joints. */
  brads?: boolean;
}

export type CollagePuppetActionType =
  | "walk" | "run" | "wave" | "point" | "talk" | "cheer" | "shrug" | "nod" | "jump" | "turn" | "look" | "carry" | "blink" | "think";
export interface CollagePuppetAction {
  type: CollagePuppetActionType;
  start: number;
  end: number;
  /** Walk/run destination x in the puppet's parent space. */
  toX?: number;
  /** Point/look angle in forward-positive degrees (90 = straight ahead, 140 = up and ahead). */
  angle?: number;
  /** Which arm gestures. */
  hand?: "front" | "back";
}

const TYPES: readonly CollagePuppetActionType[] = ["walk", "run", "wave", "point", "talk", "cheer", "shrug", "nod", "jump", "turn", "look", "carry", "blink", "think"];
const HAIRS: readonly PuppetHair[] = ["short", "bob", "long", "bun", "curly", "cap", "bald", "ponytail"];
const TOPS: readonly PuppetTop[] = ["shirt", "coat", "dress", "sweater", "vest"];
const ACCESSORIES: readonly PuppetAccessory[] = ["glasses", "tie", "scarf", "satchel", "none"];
const HEX = /^#[0-9a-fA-F]{6}$/;

export function inspectPuppet(look: unknown, actions: unknown, duration: number, palette?: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const l = look as CollagePuppetLook | undefined;
  if (!l || typeof l !== "object") return ["look is required"];
  for (const key of ["skin", "hair", "top", "bottom", "shoes", "accent"] as const) {
    const value = l[key];
    if (value === undefined && key === "accent") continue;
    if (typeof value !== "string" || !(HEX.test(value) || (palette && value in palette))) errors.push("look." + key + " must be a hex colour or palette role");
  }
  if (l.hairStyle !== undefined && !HAIRS.includes(l.hairStyle)) errors.push("look.hairStyle must be one of " + HAIRS.join(", "));
  if (l.topStyle !== undefined && !TOPS.includes(l.topStyle)) errors.push("look.topStyle must be one of " + TOPS.join(", "));
  if (l.accessory !== undefined && !ACCESSORIES.includes(l.accessory)) errors.push("look.accessory must be one of " + ACCESSORIES.join(", "));
  if (l.build !== undefined && !(Number.isFinite(l.build) && l.build >= 0 && l.build <= 1)) errors.push("look.build must be 0..1");
  if (actions === undefined) return errors;
  if (!Array.isArray(actions) || actions.length > 120) { errors.push("actions must be an array of up to 120 actions"); return errors; }
  actions.forEach((a: CollagePuppetAction, i) => {
    if (!a || !TYPES.includes(a.type)) errors.push("actions[" + i + "].type must be one of " + TYPES.join(", "));
    if (!a || !Number.isSafeInteger(a.start) || !Number.isSafeInteger(a.end) || a.end <= a.start || a.start < 0) errors.push("actions[" + i + "] needs integer start < end");
    else if (a.start >= duration) errors.push("actions[" + i + "] starts after the scene ends");
    if ((a?.type === "walk" || a?.type === "run") && !Number.isFinite(a.toX)) errors.push("actions[" + i + "] walk/run needs toX");
    if (a?.angle !== undefined && !(Number.isFinite(a.angle) && Math.abs(a.angle) <= 360)) errors.push("actions[" + i + "].angle must be degrees");
  });
  return errors;
}

// ---- Proportions and part geometry ----------------------------------------------------------------------------------------------

/** Joint positions and part sizes in puppet units (height = 100). */
export const PUPPET_RIG = {
  hips: [0, -46] as const,
  hipFront: [2.2, 0] as const, hipBack: [-1.4, 0] as const,
  thigh: 20.5, shin: 20, sole: 4.4,
  neck: [1.4, -75.5] as const,
  shoulderFront: [2, -71] as const, shoulderBack: [-1, -71] as const,
  upperArm: 14.5, forearm: 13.5, hand: 3,
  head: [2.8, -87] as const, headRx: 10.2, headRy: 11.2,
};

export interface PuppetJointPose { hip: number; knee: number; foot: number }
export interface PuppetArmPose { shoulder: number; elbow: number; lift: number }
export interface PuppetPose {
  /** Root offset in parent space (walk travel, jump height), pixels. */
  x: number; y: number;
  /** Horizontal mirror, -1..1 (passes through zero during a turn). */
  facing: number;
  hipsY: number; lean: number;
  head: number; mouth: number; eyes: number;
  legFront: PuppetJointPose; legBack: PuppetJointPose;
  armFront: PuppetArmPose; armBack: PuppetArmPose;
  /** Thought / speaking cue for overlays, 0..1. */
  speaking: number;
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const sstep = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
/** 0→1→0 envelope over an action with `ramp` frame blends. */
function envelope(frame: number, a: CollagePuppetAction, ramp = 6): number {
  if (frame < a.start || frame > a.end) return 0;
  const r = Math.min(ramp, (a.end - a.start) / 2);
  return Math.min(sstep((frame - a.start) / r), sstep((a.end - frame) / r));
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function blendArm(base: PuppetArmPose, target: PuppetArmPose, w: number): PuppetArmPose {
  return { shoulder: lerp(base.shoulder, target.shoulder, w), elbow: lerp(base.elbow, target.elbow, w), lift: lerp(base.lift, target.lift, w) };
}

/**
 * Pose at `frame` (already quantised to the puppet's cadence by the caller). `startX` is the authored x;
 * walks chain from wherever the previous walk ended. `unit` converts puppet units to pixels.
 */
export function puppetPose(actions: readonly CollagePuppetAction[] | undefined, frame: number, seed: number, unit: number, startX = 0, startFacing: 1 | -1 = 1): PuppetPose {
  const list = [...(actions ?? [])].sort((a, b) => a.start - b.start);
  const breath = Math.sin(frame / 38 * Math.PI * 2);
  const sway = noise1(seed, frame / 90);
  const pose: PuppetPose = {
    x: startX, y: 0, facing: startFacing, hipsY: breath * .25, lean: sway * 1.2,
    head: noise1(seed + 4, frame / 70) * 2.5, mouth: 0, eyes: 1,
    legFront: { hip: 2 + sway, knee: 3, foot: 0 }, legBack: { hip: -3 - sway, knee: 4, foot: 0 },
    armFront: { shoulder: 6 + breath * 1.2, elbow: 10, lift: 0 }, armBack: { shoulder: -5 - breath * 1.2, elbow: 12, lift: 0 },
    speaking: 0,
  };
  // Travel and facing are cumulative across sequential actions; everything else is an envelope.
  let x = startX, facing: number = startFacing;
  for (const a of list) {
    if (a.type === "walk" || a.type === "run") {
      if (frame < a.start) break;
      const run = a.type === "run";
      const to = a.toX ?? x, distance = to - x, span = a.end - a.start;
      const t = clamp01((frame - a.start) / span);
      // Ease into and out of the stride over the first and last steps.
      // Trapezoidal speed: accelerate over the first steps, cruise, decelerate into the stop.
      const accel = Math.min(.2, 12 / span), vmax = 1 / (1 - accel);
      const progress = t < accel ? vmax * t * t / (2 * accel)
        : t > 1 - accel ? 1 - vmax * (1 - t) ** 2 / (2 * accel)
          : vmax * (accel / 2 + (t - accel));
      const walking = frame <= a.end;
      if (walking) {
        const legLen = (PUPPET_RIG.thigh + PUPPET_RIG.shin) * unit;
        const amp = run ? 34 : 23;
        const speed = Math.abs(distance) / Math.max(1, span);
        // Steps match travel: each half cycle the planted foot sweeps 2·L·sin(A).
        const strideHalf = 2 * legLen * Math.sin(amp * Math.PI / 180);
        const period = Math.min(run ? 40 : 56, Math.max(run ? 12 : 16, (2 * strideHalf) / Math.max(.01, speed)));
        const phase = ((frame - a.start) / period) * Math.PI * 2;
        const w = envelope(frame, a, run ? 5 : 8), s = Math.sin(phase), c = Math.cos(phase);
        const knee = run ? 75 : 42;
        pose.legFront = { hip: lerp(pose.legFront.hip, amp * s, w), knee: lerp(pose.legFront.knee, 4 + knee * Math.max(0, c) ** 1.3, w), foot: 0 };
        pose.legBack = { hip: lerp(pose.legBack.hip, -amp * s, w), knee: lerp(pose.legBack.knee, 4 + knee * Math.max(0, -c) ** 1.3, w), foot: 0 };
        pose.armFront = blendArm(pose.armFront, { shoulder: -amp * .85 * s, elbow: run ? 85 : 16 + 14 * Math.max(0, -s), lift: 0 }, w);
        pose.armBack = blendArm(pose.armBack, { shoulder: amp * .85 * s, elbow: run ? 85 : 16 + 14 * Math.max(0, s), lift: 0 }, w);
        pose.hipsY = lerp(pose.hipsY, -(run ? 2.6 : 1.5) * Math.cos(2 * phase), w);
        pose.lean = lerp(pose.lean, (run ? 9 : 3) + Math.sin(2 * phase) * 1.2, w);
        pose.head = lerp(pose.head, (run ? -4 : -1) + Math.cos(2 * phase) * 1.2, w);
      }
      facing = distance < 0 ? -1 : distance > 0 ? 1 : facing;
      x = x + distance * (frame >= a.end ? 1 : progress);
      if (frame < a.end) break;
    } else if (a.type === "turn" && frame >= a.start) {
      const t = clamp01((frame - a.start) / Math.max(1, a.end - a.start));
      const from = facing;
      facing = frame >= a.end ? -from : from * Math.cos(t * Math.PI);
      if (frame < a.end) break;
      facing = -from;
    }
  }
  pose.x = x;
  pose.facing = Math.abs(facing) < .04 ? (facing < 0 ? -.04 : .04) : facing;

  for (const a of list) {
    const w = envelope(frame, a);
    if (w <= 0) continue;
    const local = frame - a.start, arm = a.hand === "back" ? "armBack" : "armFront";
    switch (a.type) {
      case "wave": {
        const target = { shoulder: 150, elbow: 25 + Math.sin(local / 7 * Math.PI) * 28, lift: 1.2 };
        pose[arm] = blendArm(pose[arm], target, w);
        pose.head = lerp(pose.head, -4, w);
        break;
      }
      case "point": {
        const angle = a.angle ?? 92;
        const reach = ease("back", clamp01(local / 9));
        pose[arm] = blendArm(pose[arm], { shoulder: angle * reach, elbow: 4, lift: .6 }, w);
        pose.lean = lerp(pose.lean, 4, w);
        pose.head = lerp(pose.head, (angle - 90) * -.25 - 3, w);
        break;
      }
      case "carry":
        pose.armFront = blendArm(pose.armFront, { shoulder: 58, elbow: 62, lift: 0 }, w);
        pose.armBack = blendArm(pose.armBack, { shoulder: 50, elbow: 70, lift: 0 }, w);
        break;
      case "cheer": {
        const hop = Math.abs(Math.sin(local / 10 * Math.PI));
        pose.armFront = blendArm(pose.armFront, { shoulder: 168, elbow: 8 + hop * 10, lift: 1.5 }, w);
        pose.armBack = blendArm(pose.armBack, { shoulder: 160, elbow: 14 + hop * 10, lift: 1.5 }, w);
        pose.y = lerp(pose.y, -hop * 6 * unit, w);
        pose.legFront.knee = lerp(pose.legFront.knee, 4 + hop * 22, w);
        pose.legBack.knee = lerp(pose.legBack.knee, 4 + hop * 26, w);
        pose.head = lerp(pose.head, -8, w); pose.mouth = Math.max(pose.mouth, .8 * w);
        break;
      }
      case "shrug": {
        const s = Math.sin(clamp01(local / Math.max(1, a.end - a.start)) * Math.PI);
        pose.armFront = blendArm(pose.armFront, { shoulder: 34, elbow: 95, lift: 2.2 * s }, w);
        pose.armBack = blendArm(pose.armBack, { shoulder: -10, elbow: 95, lift: 2.2 * s }, w);
        pose.head = lerp(pose.head, 9 * s, w);
        break;
      }
      case "think":
        pose.armFront = blendArm(pose.armFront, { shoulder: 70, elbow: 140, lift: .4 }, w);
        pose.head = lerp(pose.head, -7 + Math.sin(local / 30) * 2, w);
        break;
      case "nod": pose.head = lerp(pose.head, 9 * Math.max(0, Math.sin(local / 8 * Math.PI)), w); break;
      case "look": pose.head = lerp(pose.head, a.angle ?? -10, w); break;
      case "talk": {
        // Syllable-like openings: seeded noise, quantised so the mouth reads as replacement shapes.
        const syllable = clamp01(.5 + noise1(seed + 77, local / 3.2) * .9 + hashSigned(seed, Math.floor(local / 4)) * .25);
        pose.mouth = Math.max(pose.mouth, Math.round(syllable * 3) / 3 * w);
        pose.head = lerp(pose.head, pose.head + noise1(seed + 9, local / 11) * 3, w);
        pose.speaking = Math.max(pose.speaking, w);
        // Speakers gesture: a small beat with the front hand.
        pose.armFront = blendArm(pose.armFront, { shoulder: 30 + noise1(seed + 13, local / 16) * 18, elbow: 70 + noise1(seed + 15, local / 12) * 20, lift: .3 }, w * .8);
        break;
      }
      case "jump": {
        const span = a.end - a.start, t = local / span;
        const crouch = t < .25 ? sstep(t / .25) : t > .8 ? 1 - sstep((t - .8) / .2) : 0;
        const air = t >= .25 && t <= .8 ? Math.sin((t - .25) / .55 * Math.PI) : 0;
        pose.y = lerp(pose.y, -air * 26 * unit, w);
        pose.hipsY += crouch * 5 * w;
        const k = crouch * 55 + air * 20;
        pose.legFront = { hip: lerp(pose.legFront.hip, crouch * 30 + air * 10, w), knee: lerp(pose.legFront.knee, k, w), foot: 0 };
        pose.legBack = { hip: lerp(pose.legBack.hip, crouch * 26 - air * 8, w), knee: lerp(pose.legBack.knee, k + air * 15, w), foot: 0 };
        pose.armFront = blendArm(pose.armFront, { shoulder: -30 * crouch + 150 * air, elbow: 20, lift: air }, w);
        pose.armBack = blendArm(pose.armBack, { shoulder: -36 * crouch + 140 * air, elbow: 25, lift: air }, w);
        break;
      }
      case "blink": pose.eyes = 0; break;
      default: break;
    }
  }
  // Natural blinks every two to four seconds, two exposures closed.
  const slot = Math.floor(frame / 96);
  const at = slot * 96 + Math.floor(hash01(seed, slot) * 70);
  if (frame >= at && frame < at + 4) pose.eyes = 0;
  // A crouched knee lowers the hips so the planted foot stays on the ground.
  const drop = (leg: PuppetJointPose) => {
    const h = PUPPET_RIG.thigh * Math.cos(leg.hip * Math.PI / 180) + PUPPET_RIG.shin * Math.cos((leg.hip - leg.knee) * Math.PI / 180);
    return PUPPET_RIG.thigh + PUPPET_RIG.shin - h;
  };
  pose.hipsY += Math.min(drop(pose.legFront), drop(pose.legBack));
  return pose;
}

// ---- Paper part outlines --------------------------------------------------------------------------------------------------------

export type PuppetPoint = readonly [number, number];
/** Capsule hanging from (0,0) down to (0,length). */
export function limbOutline(length: number, top: number, bottom: number): PuppetPoint[] {
  const pts: PuppetPoint[] = [];
  const rt = top / 2, rb = bottom / 2;
  for (let k = 0; k <= 8; k++) { const a = Math.PI + k * Math.PI / 8; pts.push([Math.cos(a) * rt, Math.sin(a) * rt * .9]); }
  for (let k = 0; k <= 8; k++) { const a = k * Math.PI / 8; pts.push([Math.cos(a) * rb, length + Math.sin(a) * rb * .9]); }
  return pts;
}
export function ellipseOutline(cx: number, cy: number, rx: number, ry: number, n = 28): PuppetPoint[] {
  return Array.from({ length: n }, (_, k) => [cx + Math.cos(k / n * Math.PI * 2) * rx, cy + Math.sin(k / n * Math.PI * 2) * ry] as PuppetPoint);
}

/** Torso outline in units, hips at the origin. */
export function torsoOutline(look: CollagePuppetLook): PuppetPoint[] {
  const b = look.build ?? .4, sh = 8.6 + b * 3, wa = 7 + b * 2.8;
  const top = -27.5;
  const style = look.topStyle ?? "shirt";
  const hem = style === "coat" ? 8.5 : style === "dress" ? 15 : style === "vest" ? 1 : 3;
  const hemW = style === "coat" ? wa + 2 : style === "dress" ? wa + 7 : wa + .4;
  return [
    [-sh + 3, top], [sh - 2.2, top - .4], [sh + .2, top + 2.6], [sh - .2, top + 11], [wa + .6, top + 19], [hemW, hem - 1.2], [hemW - 1.2, hem],
    [-hemW + 1.2, hem], [-hemW, hem - 1.2], [-wa - .2, top + 19], [-sh + .4, top + 11], [-sh - .4, top + 2.6],
  ];
}
export function headOutline(): PuppetPoint[] {
  // Slightly egg-shaped head, the jaw a touch forward, with a small nose on the facing side.
  const { headRx: rx, headRy: ry } = PUPPET_RIG, pts: PuppetPoint[] = [];
  for (let k = 0; k < 36; k++) {
    const a = k / 36 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const jaw = s > 0 ? 1 - .12 * s * s * (c < 0 ? 1 : .35) : 1;
    let x = c * rx * jaw;
    const y = s * ry;
    if (c > .85 && s > -.1 && s < .35) x += 1.8 * (1 - Math.abs(s - .12) / .25) * Math.max(0, (c - .85) / .15);
    pts.push([x, y]);
  }
  return pts;
}
export function hairOutline(style: PuppetHair): { front: PuppetPoint[] | null; back: PuppetPoint[] | null } {
  const { headRx: rx, headRy: ry } = PUPPET_RIG;
  /** Ellipse arc over the skull from angle a0 to a1 (degrees, y-down, 270 = crown). */
  const arc = (a0: number, a1: number, grow: number, bumps = 0): PuppetPoint[] => {
    const pts: PuppetPoint[] = [], n = 26;
    for (let k = 0; k <= n; k++) {
      const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180, bump = bumps ? 1 + .07 * Math.abs(Math.sin(k * Math.PI * bumps / n)) : 1;
      pts.push([Math.cos(a) * (rx + grow) * bump, Math.sin(a) * (ry + grow) * bump]);
    }
    return pts;
  };
  const fringe: PuppetPoint[] = [[rx * .62, -ry * .36], [rx * .28, -ry * .44], [-rx * .1, -ry * .3], [-rx * .45, -ry * .02], [-rx * .66, ry * .3]];
  const short = [...arc(148, 332, 1.1), ...fringe];
  switch (style) {
    case "bald": return { front: null, back: null };
    case "short": return { front: short, back: null };
    case "bob": return { front: [...arc(112, 336, 1.6), [rx * .6, -ry * .32], [rx * .18, -ry * .38], [-rx * .3, -ry * .05], [-rx * .38, ry * .55], [-rx * .55, ry * .95]], back: null };
    case "long": return {
      front: [...arc(130, 336, 1.4), [rx * .6, -ry * .32], [rx * .18, -ry * .38], [-rx * .3, -ry * .05], [-rx * .5, ry * .5]],
      back: [[-rx * .3, -ry * .7], [-rx - 1.6, -ry * .1], [-rx - 2.6, ry + 13], [-rx * .1, ry + 14.5], [rx * .2, ry * .4]],
    };
    case "bun": return { front: short, back: arc(0, 360, -6.6).map(([x, y]) => [x - rx * .62, y - ry * .78] as PuppetPoint) };
    case "ponytail": return { front: short, back: [[-rx * .6, -ry * .62], [-rx - 3.4, -ry * .5], [-rx - 6.8, ry * .3], [-rx - 5, ry * 1.05], [-rx - 1.4, ry * .25], [-rx * .5, -ry * .15]] };
    case "curly": {
      // Scalloped curls: a run of small arcs around the crown.
      const pts: PuppetPoint[] = [], n = 96, a0 = 126, a1 = 352, curls = 11;
      for (let k = 0; k <= n; k++) {
        const t = k / n, a = (a0 + (a1 - a0) * t) * Math.PI / 180, scallop = 1.9 * Math.abs(Math.sin(t * curls * Math.PI));
        pts.push([Math.cos(a) * (rx + 1.2 + scallop), Math.sin(a) * (ry + 1.2 + scallop)]);
      }
      return { front: [...pts, [rx * .58, -ry * .42], [rx * .22, -ry * .5], [-rx * .2, -ry * .2], [-rx * .58, ry * .42]], back: null };
    }
    case "cap": return { front: [...arc(160, 342, .9), [rx + 6.8, -ry * .2], [rx + 6.2, -ry * .02], [rx * .55, -ry * .1], [-rx * .4, ry * .02], [-rx - .4, ry * .2]], back: null };
  }
}
export function shoeOutline(): PuppetPoint[] {
  return [[-2.6, -1.4], [2.2, -1.8], [5.4, -.6], [7.2, 1.2], [7, 2.6], [-2.8, 2.6], [-3.2, .6]];
}

/** Lighten (k>0) or darken (k<0) a hex colour by mixing with white or ink. */
export function shadeHex(hex: string, k: number): string {
  if (!HEX.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16), target = k >= 0 ? 255 : 28, a = Math.min(1, Math.abs(k));
  const ch = (v: number) => Math.round(v + (target - v) * a).toString(16).padStart(2, "0");
  return "#" + ch((n >> 16) & 255) + ch((n >> 8) & 255) + ch(n & 255);
}
