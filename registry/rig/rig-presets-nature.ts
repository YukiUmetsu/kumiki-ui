/**
 * RIG1 nature presets: a frog, a snake, a falling leaf and drifting cherry-blossom petals.
 *
 * Built from reference rather than sine waves:
 *   - the frog follows filmed jumps of Rana dybowskii (Li et al., CC BY 4.0): a Z-folded crouch on propping forelegs;
 *     take-off rolls the foot off its planted toes until the whole leg is one straight line; the legs trail in line with
 *     the body through the flight; the forelegs land first with the body pitched nose-down and the hind legs still high
 *     behind; then the hind legs fold forward back into the crouch. Croaking inflates a throat sac with the mouth shut;
 *   - the snake slithers by lateral undulation (every point of the body follows the head's path; `serpent` driver)
 *     and strikes from a raised S-coil in about two frames (Penning, Sawvel & Moon 2016: ~70 ms), gaping, then recoils;
 *   - leaves and petals fall in the flutter and tumble regimes of light plates (see `rig-flutter.ts`), show their paler
 *     back when they flip, settle on the ground, float on water with spreading ripples, or skitter along in gusts.
 * Designs are original (CC0 dedication).
 */
import type { RigDriver, RigKey, RigRole, RigSpec } from "./rig-spec";
import { ELEVATION, flutterState, projectPlate, seeded } from "./rig-flutter";
import type { FlutterParams } from "./rig-flutter";
import { Rig, cap, ell, finish, path, poly, r2, sampledPath, travel, tube } from "./rig-kit";
import type { Pt, RigPresetOptions } from "./rig-kit";

const RD = 180 / Math.PI;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => { const k = clamp(t, 0, 1); return k * k * (3 - 2 * k); };
/** RIG bone angle (0 = hanging down, positive turns the tip toward −x) of a segment vector. */
const boneAngle = (dx: number, dy: number) => Math.atan2(-dx, dy) * RD;
const dirOf = (deg: number): Pt => [-Math.sin(deg / RD), Math.cos(deg / RD)];
/** Shortest-way angle blend. */
const lerpAngle = (a: number, b: number, t: number) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;

/** Two-bone IK in a plane: bone angles reaching from (hx, hy) toward (tx, ty); bend +1 puts the joint on the forward
 * side of a limb that points down (knees), −1 behind it (elbows). */
function ik2(hx: number, hy: number, tx: number, ty: number, L1: number, L2: number, bend: 1 | -1): [number, number] {
  const dx = tx - hx, dy = ty - hy, d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-4);
  const phi = Math.atan2(dy, dx), a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const kx = hx + L1 * Math.cos(phi - bend * a), ky = hy + L1 * Math.sin(phi - bend * a);
  return [boneAngle(kx - hx, ky - hy), boneAngle(hx + Math.cos(phi) * d - kx, hy + Math.sin(phi) * d - ky)];
}

/** Drop keys that linear interpolation of their neighbours reproduces within `tol` (sampled tracks stay small). */
export function simplifyKeys(keys: RigKey[], tol = .02): RigKey[] {
  if (keys.length < 3) return keys;
  const chans = ["x", "y", "rotate", "scaleX", "scaleY", "opacity", "shear"] as const;
  const out: RigKey[] = [keys[0]];
  for (let i = 1; i < keys.length - 1; i++) {
    const a = out[out.length - 1], k = keys[i], b = keys[i + 1], t = (k.frame - a.frame) / (b.frame - a.frame);
    const keep = chans.some(c => {
      const va = a[c], vk = k[c], vb = b[c];
      if (vk === undefined) return false;
      if (va === undefined || vb === undefined) return true;
      const tolC = c === "rotate" ? tol * 20 : c === "x" || c === "y" ? tol * 10 : tol;
      return Math.abs(va + (vb - va) * t - vk) > tolC;
    });
    if (keep) out.push(k);
  }
  out.push(keys[keys.length - 1]);
  return out.map((k, i) => (i ? { ...k, ease: "linear" as const } : k));
}
const roundKey = (k: RigKey): RigKey => Object.fromEntries(Object.entries(k).map(([c, v]) => [c, typeof v === "number" && c !== "frame" ? Math.round(v * 1000) / 1000 : v])) as unknown as RigKey;

// ---- Frog ------------------------------------------------------------------------------------------------------------------------

export const FROG_MOTIONS = ["idle", "hop", "croak"] as const;
const FROG = { thigh: 21, shank: 22, tarsus: 12, toes: 15, arm: 9.5, fore: 10 } as const;
const HIND = FROG.thigh + FROG.shank + FROG.tarsus + FROG.toes;
/** Body-local joints (hip at the origin, nose along +x). */
const SHOULDER: Pt = [31, 3.5];
const FAR_HIP: Pt = [-1.6, -1.4], FAR_SHOULDER: Pt = [33.2, 2.2];
/** Crouch: hip height, body pitch (nose up), planted ankle, toe tip and hand (root space, design units). */
const CROUCH = { hip: [0, -11] as Pt, pitch: -22, ankle: [-3.5, -1.8] as Pt, toe: [23.4, -.2] as Pt, hand: [33.5, -.5] as Pt };
const FROG_HOP = { pre: 8, push: 7, flight: 10, land: 3, fold: 12, settle: 5 };
const FROG_CYCLE = FROG_HOP.pre + FROG_HOP.push + FROG_HOP.flight + FROG_HOP.land + FROG_HOP.fold + FROG_HOP.settle + 4;
const FROG_HOP_LENGTH = 234;

interface FrogPose { hip: Pt; pitch: number; hind: number[]; fore: number[]; farHind: number[]; farFore: number[];
  /** Foot length factor while a foot swings around the side of the body (foreshortened in profile). */ foot?: number }
const toBody = (hip: Pt, pitch: number, p: Pt): Pt => {
  const c = Math.cos(pitch / RD), s = Math.sin(pitch / RD);
  return [hip[0] + p[0] * c - p[1] * s, hip[1] + p[0] * s + p[1] * c];
};
/** Hind leg reaching a planted foot: tarsus and toes at the given angles, ending at `toe`. */
function hindTo(hipW: Pt, toe: Pt, tarsus: number, toes: number): number[] {
  const t = dirOf(toes), r = dirOf(tarsus);
  const B: Pt = [toe[0] - FROG.toes * t[0], toe[1] - FROG.toes * t[1]], A: Pt = [B[0] - FROG.tarsus * r[0], B[1] - FROG.tarsus * r[1]];
  const [thigh, shank] = ik2(hipW[0], hipW[1], A[0], A[1], FROG.thigh, FROG.shank, 1);
  return [thigh, shank, tarsus, toes];
}
function foreTo(shoulderW: Pt, hand: Pt): number[] {
  const [arm, fore] = ik2(shoulderW[0], shoulderW[1], hand[0], hand[1], FROG.arm, FROG.fore, -1);
  return [arm, fore, -84];
}
function crouchPose(dx = 0, sink = 0, pitch = CROUCH.pitch): FrogPose {
  const hip: Pt = [CROUCH.hip[0] + dx, CROUCH.hip[1] + sink];
  const at = (p: Pt, ox = 0, oy = 0): Pt => [p[0] + dx + ox, p[1] + oy];
  const tarsus = boneAngle(CROUCH.toe[0] - FROG.toes - CROUCH.ankle[0], .8), toes = boneAngle(FROG.toes, .6);
  return {
    hip, pitch,
    hind: hindTo(hip, at(CROUCH.toe), tarsus, toes), fore: foreTo(toBody(hip, pitch, SHOULDER), at(CROUCH.hand)),
    farHind: hindTo(toBody(hip, pitch, FAR_HIP), at(CROUCH.toe, 4.5, -.5), tarsus, toes), farFore: foreTo(toBody(hip, pitch, FAR_SHOULDER), at(CROUCH.hand, 4, -.4)),
  };
}
const blendPose = (a: FrogPose, b: FrogPose, t: number): FrogPose => ({
  hip: [lerp(a.hip[0], b.hip[0], t), lerp(a.hip[1], b.hip[1], t)], pitch: lerp(a.pitch, b.pitch, t),
  hind: a.hind.map((v, i) => lerpAngle(v, b.hind[i], t)), fore: a.fore.map((v, i) => lerpAngle(v, b.fore[i], t)),
  farHind: a.farHind.map((v, i) => lerpAngle(v, b.farHind[i], t)), farFore: a.farFore.map((v, i) => lerpAngle(v, b.farFore[i], t)),
});

/** One hop, `tau` frames after the hop starts, in hop space (the crouch before the hop has its hip at x = 0). */
function frogHopPose(tau: number, dist: number): FrogPose {
  const H = FROG_HOP, c0 = crouchPose();
  const tPush = H.pre, tFly = tPush + H.push, tLand = tFly + H.flight, tFold = tLand + H.land, tSettle = tFold + H.fold;
  // Take-off geometry: toes stay planted, the leg ends as one straight line at LAUNCH below the horizontal.
  const LAUNCH = 50, toe = CROUCH.toe, ld = dirOf(LAUNCH);
  const hip1: Pt = [toe[0] - HIND * ld[0], toe[1] - HIND * ld[1]];
  const ant = crouchPose(0, 1.4, -27), push = (s: number) => s ** 1.4;
  const vy = 1.4 * (hip1[1] - ant.hip[1]) / H.push;
  // Landing: forelegs reach the spot where the next crouch keeps its hands.
  const landPitch = 20, hipL: [number, number] = [dist - 3, 0];
  const shoulderL = toBody([0, 0], landPitch, SHOULDER), reach = (FROG.arm + FROG.fore) * .97, rd = dirOf(-28);
  hipL[1] = CROUCH.hand[1] - shoulderL[1] - reach * rd[1];
  const handL: Pt = [dist + CROUCH.hand[0], CROUCH.hand[1]];
  const g = 2 * (hipL[1] - hip1[1] - vy * H.flight) / (H.flight * H.flight);
  const flightX = (q: number) => hip1[0] + (hipL[0] - hip1[0]) * q;
  if (tau < tPush) {
    const s = smooth((tau - (tPush - 5)) / 5);
    return blendPose(c0, ant, s);
  }
  if (tau < tFly) {
    const s = (tau - tPush) / H.push, e = push(s);
    const hip: Pt = [lerp(ant.hip[0], hip1[0], e), lerp(ant.hip[1], hip1[1], e)], pitch = lerp(-27, -14, smooth(s));
    // Proximal to distal: hip and knee extend first, the heel lifts late and the toes leave last.
    const toes = lerp(boneAngle(FROG.toes, .6), LAUNCH, s ** 2.6), tarsus = lerp(ant.hind[2], LAUNCH, s ** 1.7);
    const hind = hindTo(hip, toe, tarsus, toes), farHind = hindTo(toBody(hip, pitch, FAR_HIP), [toe[0] + 4.5, toe[1] - .5], tarsus, toes);
    const lift = smooth((s - .2) / .8), up = [26, 40, -40];
    const fore = s < .2 ? foreTo(toBody(hip, pitch, SHOULDER), CROUCH.hand) : ant.fore.map((v, i) => lerpAngle(v, up[i], lift));
    const farFore = ant.farFore.map((v, i) => lerpAngle(v, up[i] - 6, lift));
    return { hip, pitch, hind, farHind, fore, farFore };
  }
  if (tau < tLand) {
    const q = (tau - tFly) / H.flight, t = tau - tFly;
    const hip: Pt = [flightX(q), hip1[1] + vy * t + .5 * g * t * t], pitch = lerp(-14, landPitch, smooth(q));
    // Legs trail in line with the body, drooping less as the flight goes on; feet spread.
    const back = 90 + pitch, droop = lerp(-(back - LAUNCH), -4, smooth(q * 1.4));
    const leg = back + droop, hind = [leg, leg + 2, leg + 4, leg + 8], farHind = [leg - 3, leg, leg + 3, leg + 6];
    const reachUp = [26, 40, -40], reachDown = [-28, -26, -78], k = smooth((q - .15) / .7);
    const fore = reachUp.map((v, i) => lerpAngle(v, reachDown[i], k)), farFore = reachUp.map((v, i) => lerpAngle(v - 6, reachDown[i] + 4, k));
    return { hip, pitch, hind, farHind, fore, farFore };
  }
  const end = crouchPose(dist), LANDED = { y: -19, pitch: 8 };
  // Fold pose: a compact Z close to the hips (thigh back, shank folded forward over it, foot tucked back down), so
  // the legs never stand up over the back.
  const tuck: number[] = [100, 250, 70, 85];
  if (tau < tFold) {
    const s = (tau - tLand) / H.land;
    // The forelegs fold to take the landing with the shoulders still clear of the ground, so the elbows never go under it.
    const hip: Pt = [lerp(hipL[0], dist - 1.2, 1 - (1 - s) ** 2), lerp(hipL[1], LANDED.y, 1 - (1 - s) ** 2)], pitch = lerp(landPitch, LANDED.pitch, s);
    const leg = 90 + pitch + lerp(-4, 2, s), hind = [leg, leg + 2, leg + 4, leg + 8], farHind = [leg - 3, leg, leg + 3, leg + 6];
    return { hip, pitch, hind, farHind, fore: foreTo(toBody(hip, pitch, SHOULDER), handL), farFore: foreTo(toBody(hip, pitch, FAR_SHOULDER), [handL[0] + 4, handL[1] - .4]) };
  }
  if (tau < tSettle) {
    const s = (tau - tFold) / H.fold, e = smooth(s);
    const hip: Pt = [lerp(dist - 1.2, end.hip[0], e), lerp(LANDED.y, end.hip[1] + .8, e)], pitch = lerp(LANDED.pitch, CROUCH.pitch - 3, e);
    const ext = 90 + LANDED.pitch + 2, from = [ext, ext + 2, ext + 4, ext + 8];
    const crouchHere = crouchPose(dist, hip[1] - end.hip[1], pitch);
    // First the legs fold into the tuck; then the feet come forward beside the body (IK on a forward arc that stays
    // above the ground) while each foot flips forward to lie flat, instead of the thighs swinging down through the floor.
    const fold = (hipW: Pt, to: number[], spread: number) => {
      if (s < .4) return from.map((v, i) => lerpAngle(v, tuck[i], smooth(s / .4)) - spread);
      const q = smooth((s - .4) / .6), ankleAt = (pose: number[], hp: Pt): Pt => {
        const a = dirOf(pose[0]), b = dirOf(pose[1]);
        return [hp[0] + FROG.thigh * a[0] + FROG.shank * b[0], hp[1] + FROG.thigh * a[1] + FROG.shank * b[1]];
      };
      const a0 = ankleAt(tuck, hipW), a1 = ankleAt(to, hipW);
      const ankle: Pt = [lerp(a0[0], a1[0], q) + Math.sin(Math.PI * q) * 14, Math.min(-1.8, lerp(a0[1], a1[1], q) - Math.sin(Math.PI * q) * 3)];
      const [thigh, shank] = ik2(hipW[0], hipW[1], ankle[0], ankle[1], FROG.thigh, FROG.shank, 1);
      // The foot swings round the outside of the body: back, toward the camera (foreshortened), then forward flat.
      return q < .5 ? [thigh, shank, lerpAngle(tuck[2], 95, q * 2), lerpAngle(tuck[3], 100, q * 2)] : [thigh, shank, to[2], to[3]];
    };
    const footScale = s < .4 ? 1 : Math.max(.14, Math.abs(Math.cos(Math.PI * smooth((s - .4) / .6))));
    return { hip, pitch, foot: footScale, hind: fold(hip, crouchHere.hind, 0), farHind: fold(toBody(hip, pitch, FAR_HIP), crouchHere.farHind, s < .4 ? 3 * (1 - s) : 0),
      fore: foreTo(toBody(hip, pitch, SHOULDER), handL), farFore: foreTo(toBody(hip, pitch, FAR_SHOULDER), [handL[0] + 4, handL[1] - .4]) };
  }
  const s = smooth((tau - tSettle) / H.settle);
  return crouchPose(dist, lerp(.8, 0, s), lerp(CROUCH.pitch - 3, CROUCH.pitch, s));
}

/** A frog in side view: crouching, hopping in long leaps, and croaking with a throat sac. */
export function frogRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 160) / 60, rig = new Rig(u), m = o.motion ?? "hop", start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = {
    skin: "#6f8f3c", "scale-dark": "#3d5422", belly: "#eee3bd", accent: "#d2a23a", eye: "#15130f", detail: "#2a2a1a", light: "#b5c978", mouth: "#c98f88",
  };
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", CROUCH.hip[0], CROUCH.hip[1]);
  // Body in profile: rear, sacral hump, flat back, eye dome, rounded snout, throat, sagging belly.
  const outline: Pt[] = [[-4.2, -1], [-3.4, -6], [.8, -9.6], [5.8, -12.6], [10.6, -12.4], [17.6, -11.3], [25.6, -11.7], [31.6, -12.6], [38, -12.2], [43.8, -9.8],
    [48.8, -6.8], [51.4, -4.2], [51.2, -2.2], [48.2, -.6], [42.2, 1.6], [35, 3.6], [27, 6.2], [18, 7.9], [9, 7.7], [2, 5.8], [-2.2, 3]];
  rig.part("body", "body", poly(outline), "skin", 4);
  rig.part("belly", "body", poly([[48.4, -.9], [42.2, 1.6], [35, 3.6], [27, 6.2], [18, 7.9], [9, 7.7], [2, 5.8], [-2.2, 3], [-1.2, 1.6], [8, 3.6], [18, 3.9], [28, 2], [36, -.2], [44, -1.4]]), "belly", 4.05);
  // Dark blotches along the back and flank, and the pale dorsolateral fold.
  for (const [k, [x, y, rx, ry, a]] of ([[6, -9.4, 3, 2, 0], [14.5, -8.6, 3.6, 2.2, 0], [22.5, -9.2, 3, 1.8, 0], [10, -3.4, 2.4, 1.6, 0], [19, -3.8, 2.2, 1.5, 0], [27, -6, 1.8, 1.3, 0], [1.6, -4.6, 2, 1.6, 0]] as const).entries()) {
    void a; rig.part(`spot-${k}`, "body", ell(x, y, rx, ry), "scale-dark", 4.1);
  }
  rig.part("fold", "body", path("M33 -11.2Q20 -11.4 9.6 -10.6Q3.6 -10 -.6 -7.4"), "light", 4.15, { line: true, lineWidth: .9 });
  rig.part("lip", "body", path("M50.6 -2.6Q44 -2.2 37 -1.8Q34 -1.6 32.6 -.4"), "detail", 4.3, { line: true, lineWidth: .7 });
  rig.part("tympanum", "body", ell(29.4, -7.4, 3.4, 3.6), "scale-dark", 4.2);
  rig.part("tympanum-in", "body", ell(29.6, -7.5, 2.4, 2.6), "skin", 4.21, { color: "#7d9a48" });
  rig.part("nostril", "body", ell(47.2, -7.4, .55, .45), "detail", 4.3);
  rig.part("eye-dome", "body", ell(37.6, -12.4, 5.8, 4.8), "skin", 4.25);
  rig.part("eye", "body", ell(38, -13, 3.7, 3.3), "accent", 4.3, { variants: { shut: ell(38, -11.6, 3.7, 1) } });
  rig.part("pupil", "body", ell(38.3, -13, 2.3, 1.15), "eye", 4.32, { variants: { shut: ell(38.3, -11.6, 1.6, .25) } });
  rig.part("eye-glint", "body", ell(37, -14.2, .7, .55), "light", 4.34, { color: "#fff8e6" });
  rig.part("eyelid", "body", path("M33.4 -13.4Q37.6 -18.4 42.4 -13.8"), "detail", 4.33, { line: true, lineWidth: .55 });
  // Throat sac: a small bulge that pumps while breathing, a big taut bubble when croaking.
  rig.bone("sac", "body", 39.5, 2.6);
  rig.part("sac", "sac", ell(0, 2.6, 9.6, 8), "belly", 4.02, { color: "#f2ead2" });
  rig.part("sac-sheen", "sac", path("M-5.6 -.4Q-2 -3.4 3.4 -2.2"), "light", 4.03, { line: true, lineWidth: .5, color: "#ffffff" });
  // Legs: thigh, shank, long tarsus, webbed toes; forelegs with splayed fingers. Far limbs sit behind the body.
  const leg = (s: "n" | "f", hip: Pt, sh: Pt, far: boolean) => {
    const z = far ? 2 : 4.6, opt = { far };
    rig.bone("thigh-" + s, "body", hip[0], hip[1], 0, FROG.thigh);
    rig.bone("shank-" + s, "thigh-" + s, 0, FROG.thigh, 0, FROG.shank);
    rig.bone("tarsus-" + s, "shank-" + s, 0, FROG.shank, 0, FROG.tarsus);
    rig.bone("toes-" + s, "tarsus-" + s, 0, FROG.tarsus, 0, FROG.toes);
    rig.part("thigh-" + s, "thigh-" + s, path("M-5.4 -1Q-6.6 8 -3.6 21.4L3.6 21.4Q5.8 10 4.2 -1.4Q0 -3.6 -5.4 -1Z"), "skin", z, opt);
    rig.part("shank-" + s, "shank-" + s, cap(FROG.shank, 7.2, 4.4), "skin", z - .02, opt);
    rig.part("tarsus-" + s, "tarsus-" + s, cap(FROG.tarsus, 4.2, 3), "skin", z - .04, opt);
    rig.part("foot-" + s, "toes-" + s, path("M-1.6 0L-3.4 9.6L-4.6 15.4L-3.6 15.8L-2.2 11.4L-1.2 16.6L0 17L.6 12L2 15.2L3 14.8L1.8 9L1.6 0Z"), "skin", z - .05, opt);
    rig.part("web-" + s, "toes-" + s, path("M-3 9.4Q-2.6 12.2 -2.2 11.4Q-1.6 13.6 -1 13.8Q0 14 .6 12Q1.4 13 2.2 12.6L1.6 6L-2 6Z"), "scale-dark", z - .045, { ...opt, color: "#55702f" });
    for (const [k, [y, w]] of ([[5, 6.4], [11, 6.4], [17, 6.4]] as const).entries()) rig.part(`thigh-band-${s}-${k}`, "thigh-" + s, path(`M${-w / 2 - .4} ${y}L${w / 2 + .6} ${y - 1.6}L${w / 2 + .6} ${y + 1}L${-w / 2 - .4} ${y + 2.4}Z`), "scale-dark", z + .01, opt);
    for (const [k, y] of [4, 10, 16].entries()) rig.part(`shank-band-${s}-${k}`, "shank-" + s, path(`M-3.4 ${y}L3.2 ${y - 1.2}L3 ${y + 1}L-3.2 ${y + 2}Z`), "scale-dark", z - .01, opt);
    rig.bone("arm-" + s, "body", sh[0], sh[1], 0, FROG.arm);
    rig.bone("fore-" + s, "arm-" + s, 0, FROG.arm, 0, FROG.fore);
    rig.bone("hand-" + s, "fore-" + s, 0, FROG.fore);
    rig.part("arm-" + s, "arm-" + s, cap(FROG.arm, 4.6, 3.4), "skin", far ? 1.8 : 4.7, opt);
    rig.part("fore-" + s, "fore-" + s, cap(FROG.fore, 3.4, 2.6), "skin", far ? 1.79 : 4.69, opt);
    rig.part("hand-" + s, "hand-" + s, path("M-1.2 -.6L-2.6 3.4L-1.8 3.6L-.8 1.6L-.4 4.4L.4 4.4L.6 1.8L1.8 3.8L2.4 3.4L1.2 -.6Z"), "skin", far ? 1.78 : 4.68, opt);
  };
  leg("f", FAR_HIP, FAR_SHOULDER, true);
  leg("n", [0, 0], SHOULDER, false);
  rig.bone("shadow", "root", 14, 0);
  const keys: Record<string, RigKey[]> = {};
  const push = (bone: string, k: RigKey) => (keys[bone] ??= []).push(k);
  const rootKeys: { frame: number; x: number }[] = [];
  const from = o.from ?? 0, to = o.to ?? from;
  const write = (frame: number, p: FrogPose, rootX: number, hopX: number) => {
    push("body", { frame, x: (p.hip[0] - hopX) * u - (CROUCH.hip[0]) * u, y: (p.hip[1] - CROUCH.hip[1]) * u, rotate: p.pitch });
    push("shadow", { frame, x: (p.hip[0] - hopX + 14) * u });
    for (const [s, hind, fore] of [["n", p.hind, p.fore], ["f", p.farHind, p.farFore]] as const) {
      push("thigh-" + s, { frame, rotate: hind[0] - p.pitch }); push("shank-" + s, { frame, rotate: hind[1] - hind[0] });
      push("tarsus-" + s, { frame, rotate: hind[2] - hind[1], scaleY: p.foot ?? 1 }); push("toes-" + s, { frame, rotate: hind[3] - hind[2] });
      push("arm-" + s, { frame, rotate: fore[0] - p.pitch }); push("fore-" + s, { frame, rotate: fore[1] - fore[0] }); push("hand-" + s, { frame, rotate: fore[2] - fore[1] });
    }
    rootKeys.push({ frame, x: rootX });
  };
  if (m === "hop") {
    const dir = to >= from ? 1 : -1, hops = Math.max(1, Math.floor((end - start) / FROG_CYCLE));
    const dist = from === to ? FROG_HOP_LENGTH : Math.min(FROG_HOP_LENGTH * 1.6, Math.abs(to - from) / u / hops);
    for (let f = start; f <= end; f++) {
      const k = Math.min(hops - 1, Math.floor((f - start) / FROG_CYCLE)), tau = f - start - k * FROG_CYCLE;
      const p = k === hops - 1 && tau > FROG_CYCLE ? crouchPose(dist) : frogHopPose(Math.min(tau, FROG_CYCLE), dist);
      // The root rides with the hip so a tracking camera follows the leap; planted feet are held in hop space.
      const hopX = p.hip[0];
      write(f, p, from + dir * (k * dist + hopX) * u, hopX);
    }
  } else {
    write(start, crouchPose(), from, 0);
  }
  for (const [bone, ks] of Object.entries(keys)) rig.track(bone, simplifyKeys(ks).map(roundKey));
  // Breathing: the throat pumps two or three times a second; the flanks barely move. Blink: eyes sink and the
  // membrane closes.
  rig.track("sac", [{ frame: start, scaleX: .32, scaleY: .3 }]);
  rig.drivers.push({ type: "variant", part: "eye", name: "shut", mode: "blink", interval: [90, 170], duration: 5 },
    { type: "variant", part: "pupil", name: "shut", mode: "blink", interval: [90, 170], duration: 5 });
  if (m === "croak") {
    // Calls in bouts: the sac fills in a fifth of a second, the body squeezes as the air leaves the lungs, then refills.
    const sac: RigKey[] = [{ frame: start, scaleX: .32, scaleY: .3 }], body: RigKey[] = [{ frame: start, scaleY: 1 }];
    for (let b = start + 10; b + 30 < end; b += 64) for (let c = 0; c < 3; c++) {
      const f = b + c * 16;
      sac.push({ frame: f, scaleX: .32, scaleY: .3 }, { frame: f + 6, scaleX: 1, scaleY: 1, ease: "ease-out-quad" }, { frame: f + 10, scaleX: 1.04, scaleY: .98 }, { frame: f + 15, scaleX: .4, scaleY: .36, ease: "ease-in-quad" });
      body.push({ frame: f, scaleY: 1 }, { frame: f + 6, scaleY: .955, ease: "ease-out-quad" }, { frame: f + 10, scaleY: .95 }, { frame: f + 15, scaleY: 1, ease: "ease-in-out-cubic" });
    }
    rig.tracks.sac = sac; rig.track("body", body.map(k => ({ ...k })));
  } else rig.drivers.push({ type: "oscillate", bone: "sac", property: "scaleY", amplitude: .07, period: 13 }, { type: "oscillate", bone: "sac", property: "scaleX", amplitude: .05, period: 13 });
  const root = m === "hop" ? sampledPath(start, end, 1, f => ({ x: rootKeys[Math.min(rootKeys.length - 1, f - start)].x, y: o.y ?? 0 }))
    : [{ frame: start, x: from, y: o.y ?? 0, facing: o.facing ?? 1 }];
  const spec = finish("frog", "frog", rig, root, palette, { x: -30 * u, y: -20 * u, width: 90 * u, height: 22 * u }, o);
  return { ...spec, shadows: ["shadow"] };
}

// ---- Snake -----------------------------------------------------------------------------------------------------------------------

export const SNAKE_MOTIONS = ["slither", "idle", "strike"] as const;
const SNAKE_PALETTE: Partial<Record<RigRole, string>> = {
  scale: "#c57a3c", "scale-dark": "#8c3b1f", detail: "#3a1d12", belly: "#efd9a8", accent: "#d79b32", eye: "#121010", mouth: "#b3263a", skin: "#e7a49a",
};
/** Body width along the snake (0 = head end, 1 = tail tip), design units. */
const snakeWidth = (s: number) => s < .08 ? 4 + 15 * s : s < .55 ? 5.2 : 5.2 - 4.6 * ((s - .55) / .45) ** 1.3;

/** A forked tongue along +y, flicked by scaling its bone. */
function addTongue(rig: Rig, parent: string, x: number, y: number, rotate: number, z: number) {
  rig.bone("tongue", parent, x, y, rotate, 5.6);
  rig.part("tongue", "tongue", path("M-.32 0L-.3 3.8L-1.1 5.8L-.9 5.9L0 4.4L.9 5.9L1.1 5.8L.3 3.8L.32 0Z"), "mouth", z);
}
/** Quick double flicks every so often (snakes taste the air in bursts). */
function tongueFlicks(start: number, end: number, every: number, seed: number): RigKey[] {
  const r = seeded(seed), keys: RigKey[] = [{ frame: start, scaleY: 0, scaleX: 1 }];
  for (let f = start + 8 + Math.floor(r() * 10); f + 14 < end; f += every + Math.floor(r() * every * .5)) {
    keys.push({ frame: f, scaleY: 0 }, { frame: f + 2, scaleY: 1, ease: "ease-out-quad" }, { frame: f + 4, scaleY: .55 }, { frame: f + 6, scaleY: 1 }, { frame: f + 8, scaleY: .6 },
      { frame: f + 10, scaleY: 1 }, { frame: f + 13, scaleY: 0, ease: "ease-in-quad" });
  }
  return keys;
}

/**
 * A snake. `slither` is seen from a raised camera: lateral undulation along a track fixed to the ground, the head
 * swinging less than the body, tongue flicking. `idle` and `strike` rest in a coil on the ground with the neck raised in
 * an S in profile; the strike lunges forward about a third of the body in two frames, gaping, holds, and recoils.
 */
export function snakeRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 360) / 100, rig = new Rig(u), m = o.motion ?? "slither", start = o.start ?? 0, end = o.end ?? 180, D = end - start;
  const t = (k: number) => Math.round(start + D * k);
  rig.bone("root", undefined, 0, 0);
  if (m === "slither") {
    const N = 16, L = 94 / N, bones: string[] = [];
    for (let i = 0; i < N; i++) {
      const id = "body-" + i;
      rig.bone(id, i ? "body-" + (i - 1) : "root", 0, i ? L : 15, i ? 0 : 90, L);
      bones.push(id);
      const s0 = (6 + i * L) / 100, s1 = (6 + (i + 1) * L) / 100, w0 = snakeWidth(s0), w1 = snakeWidth(s1);
      rig.part(id, id, cap(L + .01, w0, w1), "scale", 4 - i * .01);
      // Dorsal saddles: a dark-bordered blotch every segment, alternating size; flanks a shade lighter.
      // Saddles: wide transverse blotches with dark borders on every other segment; small flank spots between.
      const y = L * .5, bw = (w0 + w1) / 2;
      if (i % 2 === 0 && i < N - 2) {
        rig.part(id + "-saddle-rim", id, ell(0, y, bw * .47, L * .3), "detail", 4.1 - i * .01);
        rig.part(id + "-saddle", id, ell(0, y, bw * .39, L * .22), "scale-dark", 4.11 - i * .01);
      } else if (i < N - 1) for (const sd of [-1, 1]) rig.part(`${id}-fleck-${sd}`, id, ell(sd * bw * .36, y, bw * .1, L * .14), "detail", 4.1 - i * .01);
    }
    rig.bone("head", "body-0", 0, 0, 180, 7.6);
    rig.part("neck", "head", cap(3, 4.2, 4.4), "scale", 4.2);
    rig.part("head", "head", path("M-2.2 -.4Q-3 2.4 -2.9 4.2Q-2.6 6.6 -1.2 7.6Q0 8.1 1.2 7.6Q2.6 6.6 2.9 4.2Q3 2.4 2.2 -.4Z"), "scale", 4.3);
    rig.part("head-spear", "head", path("M-1.4 -.2L0 2.6L1.4 -.2L.6 -.4L0 1.2L-.6 -.4Z"), "scale-dark", 4.31);
    for (const s of [-1, 1]) {
      rig.part(`eye-${s}`, "head", ell(2.55 * s, 5.2, .7, .95), "eye", 4.33);
      rig.part(`eye-ring-${s}`, "head", ell(2.45 * s, 5.2, .95, 1.2), "accent", 4.32);
      rig.part(`nostril-${s}`, "head", ell(.7 * s, 7.4, .22, .2), "detail", 4.33);
    }
    addTongue(rig, "head", 0, 7.8, 0, 4.25);
    rig.track("tongue", tongueFlicks(start, end, 40, 3));
    rig.drivers.push({ type: "serpent", bones, amplitude: 9 * u, wavelength: 56 * u, head: .45 },
      { type: "oscillate", bone: "tongue", property: "rotate", amplitude: 9, period: 4 });
    return finish("snake", "snake", rig, travel(o, start, end, "linear"), SNAKE_PALETTE, { x: -100 * u, y: -6 * u, width: 110 * u, height: 26 * u }, o);
  }
  // Coil: a flat spiral on the ground seen from a raised camera (y squashed), tail tip outside, neck rising at the centre.
  rig.bone("coil", "root", -4, 0);
  const sq = Math.sin(ELEVATION) * 1.05, turns = 2.4 * Math.PI, pts: Pt[] = [], n = 40;
  for (let k = 0; k <= n; k++) { const a = turns * k / n, r = 12.5 - 6 * k / n; pts.push([r * Math.cos(a + 2.2), -6.4 + r * Math.sin(a + 2.2) * sq]); }
  let arcLen = 0; const along = pts.map((p, i) => (arcLen += i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0));
  const total = arcLen + 38;
  for (let k = 0; k < n; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], s0 = 1 - along[k] / total, s1 = 1 - along[k + 1] / total;
    const w0 = snakeWidth(s0), w1 = snakeWidth(s1), z = 3 + (y0 + y1) * .004 + k * .0001, front = Math.sin(turns * (k + .5) / n + 2.2) > 0;
    rig.part(`coil-${k}`, "coil", tube(x0, y0, x1, y1, w0, w1), "scale", z);
    rig.part(`coil-j-${k}`, "coil", ell(x1, y1, w1 / 2, w1 / 2), "scale", z + .00001);
    if (front) rig.part(`coil-belly-${k}`, "coil", tube(x0, y0 + w0 * .3, x1, y1 + w1 * .3, w0 * .32, w1 * .32), "belly", z + .00002);
    if (k % 2 === 0 && s0 > .12) {
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - w0 * .08, a = Math.atan2(y1 - y0, x1 - x0) * RD;
      rig.part(`coil-saddle-${k}`, "coil", rotEll(mx, my, Math.max(1.2, w0 * .44), w0 * .3, a), "detail", z + .00003);
      rig.part(`coil-saddle-in-${k}`, "coil", rotEll(mx, my, Math.max(.9, w0 * .34), w0 * .22, a), "scale-dark", z + .00004);
    }
  }
  // Neck: six bones rising from the centre of the coil in an S, head in profile with a hinged jaw.
  const [cx, cy] = pts[n], NECK = 6, NL = 5.4;
  const S = [-160, 150, 120, 180, -130, -100, -90], COCK = [-172, 140, 108, 186, -124, -94, -86], STRIKE = [-148, -114, -100, -96, -96, -98, -102];
  const local = (abs: number[]) => abs.map((a, i) => i ? lerpAngle(0, a - abs[i - 1], 1) : a);
  const rest = local(S);
  for (let i = 0; i < NECK; i++) {
    const id = "neck-" + i, w0 = 5.2 - i * .16, w1 = 5.2 - (i + 1) * .16;
    rig.bone(id, i ? "neck-" + (i - 1) : "coil", i ? 0 : cx, i ? NL : cy - 1, rest[i], NL);
    rig.part(id, id, cap(NL + .02, w0, w1), "scale", 5 + i * .01);
    rig.part(id + "-belly", id, offsetCap(NL + .02, w0 * .4, w1 * .4, -w0 * .27), "belly", 5.005 + i * .01);
    if (i % 2 === 0) rig.part(id + "-saddle", id, path(`M${w0 * .5} ${NL * .2}Q${w0 * .02} ${NL * .5} ${w1 * .5} ${NL * .85}Z`), "scale-dark", 5.006 + i * .01);
  }
  rig.bone("head", "neck-" + (NECK - 1), 0, NL, rest[NECK], 8);
  // Side view along +y; local +x is the top of the head for a head pointing right.
  rig.part("head", "head", path("M2.5 -.6Q2.9 2.6 2.4 5Q1.8 7.4 .7 8.2Q0 8.4 -.4 8.1L-.5 .4Q-1 -.6 -2.4 -.6Z"), "scale", 5.2);
  rig.part("head-cap", "head", path("M2.5 -.6Q2.9 2.6 2.4 5Q2.2 5.8 1.9 6.4Q1.2 3.4 .9 -.6Z"), "scale-dark", 5.21);
  rig.part("lip", "head", path("M-.4 8.1Q-.8 4 -.5 .4L.1 .4Q-.2 4 .2 8Z"), "belly", 5.22);
  rig.part("eye-stripe", "head", path("M1.2 4.4L.5 -.4L-.4 -.2L.6 4.6Z"), "detail", 5.23);
  rig.part("eye-ring", "head", ell(1.15, 5.1, 1.25, 1.25), "accent", 5.24);
  rig.part("eye", "head", ell(1.15, 5.2, .7, .7), "eye", 5.25);
  rig.part("eye-glint", "head", ell(1.5, 5.5, .22, .22), "light", 5.26, { color: "#fff3dc" });
  rig.part("nostril", "head", ell(.55, 7.6, .2, .2), "detail", 5.25);
  rig.bone("jaw", "head", -.5, .6, 0, 7.4);
  rig.part("mouth", "jaw", path("M.1 0L.4 7.2Q.1 7.6 -.2 7.2L-.6 .4Z"), "skin", 5.15);
  rig.part("jaw", "jaw", path("M-.1 -.2Q-.3 4 -.2 7.2Q-.6 7.6 -1 7Q-1.8 3.6 -2.2 .4Z"), "belly", 5.19);
  addTongue(rig, "jaw", -.1, 6.4, 0, 5.17);
  const tracks: Record<string, RigKey[]> = {};
  const pose = (frame: number, abs: number[], jaw: number, gape = 0, ease: RigKey["ease"] = "ease-in-out-cubic") => {
    local(abs).forEach((v, i) => (tracks[i < NECK ? "neck-" + i : "head"] ??= []).push({ frame, rotate: v - rest[i] + (i === NECK ? -gape : 0), ease }));
    (tracks.jaw ??= []).push({ frame, rotate: jaw, ease });
  };
  pose(start, S, 0);
  if (m === "strike") {
    for (const k of [.28, .68]) {
      const a = t(k);
      pose(a - 8, S, 0); pose(a, COCK, 0, 0, "ease-in-out-quad");
      // The lunge: two frames out, mouth gaping as it goes; a three-frame hold; then a slower recoil into the S.
      pose(a + 2, STRIKE, 64, 18, "ease-out-quad"); pose(a + 5, STRIKE, 60, 16); pose(a + 13, S, 6, 2, "ease-in-out-cubic"); pose(a + 17, S, 0);
    }
  }
  for (const [b, ks] of Object.entries(tracks)) rig.track(b, ks);
  rig.track("tongue", tongueFlicks(start, end, 46, 5).map(k => m === "strike" ? k : k));
  if (m === "strike") for (const k of [.28, .68]) rig.track("tongue", [{ frame: t(k) - 9, scaleY: 0 }, { frame: t(k) + 18, scaleY: 0 }]);
  rig.drivers.push({ type: "chain", bones: ["neck-2", "neck-3", "neck-4", "neck-5"], amplitude: 2.2, period: 90, lag: .5, phase: .1 },
    { type: "oscillate", bone: "tongue", property: "rotate", amplitude: 10, period: 4 });
  return finish("snake", "snake", rig, [{ frame: start, x: o.from ?? 0, y: o.y ?? 0, facing: o.facing ?? 1 }], SNAKE_PALETTE, { x: -24 * u, y: -50 * u, width: 60 * u, height: 54 * u }, o);
}
/** A capsule along +y shifted sideways by `dx` (a belly band down one side of a body segment). */
function offsetCap(L: number, w0: number, w1: number, dx: number) {
  const a = w0 / 2, b = w1 / 2;
  return path(`M${r2(dx - a)} 0A${r2(a)} ${r2(a)} 0 0 1 ${r2(dx + a)} 0L${r2(dx + b)} ${r2(L)}A${r2(b)} ${r2(b)} 0 0 1 ${r2(dx - b)} ${r2(L)}Z`);
}
/** An ellipse rotated by `deg`, as a polygon. */
function rotEll(cx: number, cy: number, rx: number, ry: number, deg: number) {
  const c = Math.cos(deg / RD), s = Math.sin(deg / RD);
  return poly(Array.from({ length: 16 }, (_, k) => { const a = k / 16 * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * c - y * s, cy + x * s + y * c] as Pt; }));
}

// ---- Leaf and petals -------------------------------------------------------------------------------------------------------------

export const LEAF_MOTIONS = ["sway", "fall", "fall-water", "blow"] as const;
export const PETAL_MOTIONS = ["blow", "fall"] as const;
const LEAF_PALETTE: Partial<Record<RigRole, string>> = { paint: "#d0682a", accent: "#e6a03a", detail: "#8f4316", wood: "#6b4a2e", glass: "#86aebb", light: "#e4f0f3", "paint-dark": "#5f8797" };
const LEAF_BACK = "#e0b07c", LEAF_BACK_IN = "#eac48f";

/** A broadleaf (ovate, acuminate tip, serrated margin, slightly uneven base) along +x from `x0`, `len` long. */
function leafOutline(len: number, wid: number, x0: number): Pt[] {
  const up: Pt[] = [], down: Pt[] = [], n = 48;
  for (let k = 0; k <= n; k++) {
    const t = k / n, body = Math.sin(Math.PI * t ** .78) ** .85 * (t > .82 ? 1 - ((t - .82) / .18) ** 1.6 * .35 : 1);
    const tooth = t > .1 && t < .97 ? .045 * wid * (1 - ((t * 15) % 1)) : 0;
    up.push([x0 + t * len, -(wid / 2) * body - tooth]);
    down.push([x0 + t * len, (wid / 2) * body * .94 + tooth * .9]);
  }
  return [...up, ...down.reverse()];
}
/** Leaf parts on `bone`: petiole, blade with a lighter heart, veins on the top face, raised pale veins underneath. */
function addLeaf(rig: Rig, bone: string, pre: string, len: number, x0: number, z: number) {
  const wid = len * .52;
  rig.part(pre + "petiole", bone, path(`M${x0 - len * .2} -.18L${x0 + .4} -.32L${x0 + .4} .32L${x0 - len * .2} .18Z`), "wood", z - .01);
  rig.part(pre + "blade", bone, poly(leafOutline(len, wid, x0)), "paint", z, { backColor: LEAF_BACK });
  rig.part(pre + "heart", bone, poly(leafOutline(len * .74, wid * .5, x0 + len * .1)), "accent", z + .01, { backColor: LEAF_BACK_IN });
  const veins = [`M${x0} 0Q${x0 + len * .5} ${-wid * .03} ${x0 + len * .98} 0`];
  for (let k = 1; k <= 6; k++) {
    const t = k / 7.4, x = x0 + t * len, h = wid * .5 * Math.sin(Math.PI * (t + .1) ** .78) * .82, ex = x + len * .13;
    veins.push(`M${r2(x)} 0Q${r2(x + len * .05)} ${r2(-h * .5)} ${r2(ex)} ${r2(-h)}`, `M${r2(x)} 0Q${r2(x + len * .05)} ${r2(h * .5)} ${r2(ex)} ${r2(h * .94)}`);
  }
  rig.part(pre + "veins", bone, path(veins.join("")), "detail", z + .02, { line: true, lineWidth: Math.max(.25, len * .018), side: "front" });
  rig.part(pre + "veins-back", bone, path(veins.join("")), "light", z + .02, { line: true, lineWidth: Math.max(.3, len * .026), side: "back", color: "#f4dcb4" });
}
const plateKey = (frame: number, x: number, y: number, pitch: number, heading: number, roll = 0, extra: Partial<RigKey> = {}): RigKey => {
  const k = projectPlate(pitch, heading, roll);
  return { frame, x, y, rotate: k.rotate, scaleX: k.scaleX, scaleY: k.scaleY, shear: k.shear, ...extra };
};
/** Keep rotation keys continuous (no 359° → 0° spins between samples). */
function unwrap(keys: RigKey[]): RigKey[] {
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1].rotate, b = keys[i].rotate;
    if (a !== undefined && b !== undefined) keys[i] = { ...keys[i], rotate: a + ((((b - a) % 360) + 540) % 360 - 180) };
  }
  return keys;
}

/**
 * A leaf. `sway`: three leaves on a twig flutter in gusts, flashing their pale undersides. `fall`: a single leaf
 * zigzags down (flutter, with one tumble end over end), lands and settles flat. `fall-water`: the same onto a pond, then
 * floats, bobbing and slowly turning while ripples spread. `blow`: lying on the ground it lifts, flips and skitters in
 * three gusts. Size is the height of the action; the leaf is about a seventh of it.
 */
export function leafRig(o: RigPresetOptions = {}): RigSpec {
  const size = o.size ?? 420, u = size / 100, rig = new Rig(u), m = o.motion ?? "fall", start = o.start ?? 0, end = o.end ?? 180, D = end - start;
  const from = o.from ?? 0, len = 14, keys: RigKey[] = [];
  rig.bone("root", undefined, 0, 0);
  const shadows: string[] = [];
  if (m === "sway") {
    // A twig reaching in from the upper left with three leaves on petioles.
    rig.bone("twig", "root", -34, -64);
    rig.part("twig", "twig", path("M-44 -8.4Q-31 -5.2 -24 -3.2Q-16 -1.6 -2 1.2L0 2.4Q-15 .2 -23.6 -1.8Q-31 -3.6 -44 -5.6Z"), "wood", 3);
    rig.part("twig-node", "twig", path("M-24.4 -3Q-22 -6.6 -18.4 -8.2L-18 -7.4Q-21 -5.6 -22.8 -2.4Z"), "wood", 3.005);
    rig.part("twig-bud", "twig", ell(-.4, 2, 1, .9), "wood", 3.01);
    const r = seeded(11), leaves: [string, number, number, number][] = [["a", -30, -2.6, -58], ["b", -17, -.6, -40], ["c", -2, 2, -66]];
    for (const [id, x, y, base] of leaves) {
      rig.bone("leaf-" + id, "twig", x, y);
      addLeaf(rig, "leaf-" + id, id + "-", len * (.85 + r() * .25), len * .22, 3.5 + leaves.findIndex(l => l[0] === id) * .1);
      const ph = r() * 6.28, ph2 = r() * 6.28, ph3 = r() * 6.28, lk: RigKey[] = [];
      for (let f = start; f <= end; f += 2) {
        const g = .5 + .5 * Math.sin(2 * Math.PI * (f - start) / 150 - 1.2), g2 = g * g;
        const pitch = (base + g * (10 * Math.sin(2 * Math.PI * f / 64 + ph) + 7 * Math.sin(2 * Math.PI * f / 11 + ph2)) - 14 * g2) / RD;
        const roll = g2 * 2.3 * (.5 + .5 * Math.sin(2 * Math.PI * f / 47 + ph3)) + .15 * Math.sin(2 * Math.PI * f / 17 + ph);
        lk.push(plateKey(f, 0, 0, pitch, .55 + .3 * g * Math.sin(2 * Math.PI * f / 37 + ph2), roll));
      }
      rig.track("leaf-" + id, simplifyKeys(unwrap(lk).map(k => ({ ...k, x: undefined, y: undefined }))).map(roundKey));
    }
    rig.drivers.push({ type: "oscillate", bone: "twig", property: "rotate", amplitude: 2.4, period: 75, wobble: .5 }, { type: "oscillate", bone: "twig", property: "y", amplitude: .8 * u, period: 75, phase: .3 });
    return finish("leaf", "leaf", rig, [{ frame: start, x: from, y: o.y ?? 0, facing: o.facing ?? 1 }], LEAF_PALETTE, { x: -80 * u, y: -80 * u, width: 90 * u, height: 40 * u }, o);
  }
  rig.bone("leaf", "root", 0, 0);
  addLeaf(rig, "leaf", "", len, -len / 2, 5);
  rig.bone("shadow", "root", 0, 0);
  shadows.push("shadow");
  // The leaf comes to rest a little in front of the horizon line, on the ground plane (G design units down).
  const water = m === "fall-water", G = 10, restY = G - .5;
  if (m === "fall" || water) {
    const H = 86 + G, landAt = .7, p: FlutterParams = { fall: H / (D * landAt), swing: 15, period: 46, tilt: .62, lift: 3.6, heading: .75, precess: .0035, wind: .045 };
    const x0 = -20, y0 = -86, flipAt = Math.round(D * .3), flipLen = 16;
    let land = -1, landState = { x: 0, pitch: 0, heading: 0, vx: 0 };
    const pose = (age: number) => {
      const st = flutterState(p, age);
      const flip = 2 * Math.PI * smooth((age - flipAt) / flipLen);
      return { x: x0 + st.x, y: y0 + st.y, pitch: st.pitch * (1 - Math.sin(Math.PI * clamp((age - flipAt) / flipLen, 0, 1)) * .5) + flip, heading: st.heading, roll: .35 * Math.sin(age * .05) };
    };
    for (let a = 0; a <= D; a++) if (pose(a).y >= restY) { land = a; break; }
    if (land < 0) land = D;
    const L = pose(land), Lp = pose(land - 1);
    landState = { x: L.x, pitch: L.pitch, heading: L.heading, vx: L.x - Lp.x };
    const landX = landState.x + landState.vx * 6;
    for (let a = 0; a <= D; a += a < land - 2 || a > land + 30 ? 2 : 1) {
      const f = start + a;
      if (a < land) { const q = pose(a); keys.push(plateKey(f, q.x * u, q.y * u, q.pitch, q.heading, q.roll)); continue; }
      const s = a - land, k = 1 - Math.exp(-s / 5);
      // Settling: slides a little, rocks onto its face, comes to rest flat (on water: floats, bobs and turns).
      const pitchFlat = Math.round(landState.pitch / Math.PI) * Math.PI;
      const rock = (landState.pitch - pitchFlat) * Math.exp(-s / 6) * Math.cos(s * .7);
      const x = landState.x + landState.vx * 6 * k + (water ? .03 * s : 0);
      const bob = water ? .35 * Math.sin(s * .12) * Math.exp(-s / 120) + .12 * Math.sin(s * .07) : 0;
      keys.push(plateKey(f, x * u, (restY + bob) * u, pitchFlat + rock, landState.heading + (water ? .004 * s : 0), .3 * Math.exp(-s / 8) * Math.sin(s * .5)));
    }
    const sx: RigKey[] = keys.map(k => ({ frame: k.frame, x: k.x }));
    rig.track("shadow", simplifyKeys(sx).map(roundKey));
    rig.track("leaf", simplifyKeys(unwrap(keys)).map(roundKey));
    if (water) {
      // A patch of pond under the landing spot, then rings spreading from the touch-down and from the bobbing.
      const PR = 40, pry = PR * Math.sin(ELEVATION) * .3;
      rig.bone("pond", "root", landX, G);
      rig.part("pond", "pond", ell(0, 0, PR, pry), "glass", .5);
      rig.part("pond-far", "pond", path(`M${-PR * .92} ${-pry * .4}Q0 ${-pry * 1.15} ${PR * .92} ${-pry * .4}Q0 ${-pry * .75} ${-PR * .92} ${-pry * .4}Z`), "light", .51, { color: "#b5d0d8" });
      const ringAt = [0, 7, 15, 52, 98];
      ringAt.forEach((dt, i) => {
        const id = "ripple-" + i, sq = Math.sin(ELEVATION) * .55, big = i < 3 ? 1 : .55;
        rig.bone(id, "root", landX, restY + .4);
        rig.part(id, id, path(`M-10 0A10 ${10 * sq} 0 1 0 10 0A10 ${10 * sq} 0 1 0 -10 0Z M-9.3 0A9.3 ${9.3 * sq} 0 1 1 9.3 0A9.3 ${9.3 * sq} 0 1 1 -9.3 0Z`), "light", 1 + i * .01);
        rig.part(id + "-dark", id, path(`M-9.1 .25A9.1 ${9.1 * sq} 0 1 0 9.1 .25A9.1 ${9.1 * sq} 0 1 0 -9.1 .25Z M-8.6 .25A8.6 ${8.6 * sq} 0 1 1 8.6 .25A8.6 ${8.6 * sq} 0 1 1 -8.6 .25Z`), "paint-dark", 1.005 + i * .01);
        const f0 = start + land + dt;
        rig.track(id, [{ frame: start, opacity: 0, scaleX: .1, scaleY: .1 }, { frame: f0, opacity: 0, scaleX: .1, scaleY: .1 }, { frame: f0 + 1, opacity: .95, scaleX: .15 * big, scaleY: .15 * big },
          { frame: f0 + 64, opacity: 0, scaleX: 1.9 * big, scaleY: 1.9 * big, ease: "ease-out-quad" }]);
      });
      shadows.length = 0;
    }
  } else {
    // Blown along the ground: three gusts (lift and flip, a longer cartwheel, a spinning slide), resting between.
    const gusts = [{ at: .06, dur: 38, dist: 22, flips: 1, spin: .5 }, { at: .38, dur: 56, dist: 42, flips: 2, spin: -.4 }, { at: .74, dur: 36, dist: 18, flips: 0, spin: 1.3 }];
    // Resting state before each gust (x, pitch, heading), carried forward gust by gust.
    let x = -46, pitch = 0, heading = .6;
    const states = gusts.map(g => { const st = { x, pitch, heading }; x += g.dist; pitch += g.flips * 2 * Math.PI; heading += g.spin; return st; });
    for (let a = 0; a <= D; a++) {
      const f = start + a, gi = gusts.findIndex(q => a >= q.at * D && a < q.at * D + q.dur);
      if (gi < 0) {
        const st = [...states].reverse().find((_, k) => a >= gusts[gusts.length - 1 - k].at * D + gusts[gusts.length - 1 - k].dur);
        const next = st ? { x: st.x + gusts[states.indexOf(st)].dist, pitch: st.pitch + gusts[states.indexOf(st)].flips * 2 * Math.PI, heading: st.heading + gusts[states.indexOf(st)].spin } : states[0];
        keys.push(plateKey(f, next.x * u, restY * u, next.pitch + .05 * Math.sin(a * .3), next.heading));
        continue;
      }
      const g = gusts[gi], st = states[gi], s = (a - g.at * D) / g.dur, e = s < .5 ? 2 * s * s : 1 - 2 * (1 - s) ** 2, turn = g.flips * 2 * Math.PI * e;
      // Flipping end over end it stands on an edge (centre lifted by half its length × |sin|) and hops a little.
      const lift = g.flips ? Math.abs(Math.sin(turn / 2)) * len * .48 + Math.sin(Math.PI * s) * 3 : Math.sin(Math.PI * s) * 1.2;
      keys.push(plateKey(f, (st.x + g.dist * e) * u, (restY - lift) * u, g.flips ? st.pitch + turn : st.pitch + .3 * Math.sin(Math.PI * s), st.heading + g.spin * e));
    }
    rig.track("shadow", simplifyKeys(keys.map(k => ({ frame: k.frame, x: k.x }))).map(roundKey));
    rig.track("leaf", simplifyKeys(unwrap(keys)).map(roundKey));
  }
  const spec = finish("leaf", "leaf", rig, [{ frame: start, x: from, y: o.y ?? 0, facing: o.facing ?? 1 }], LEAF_PALETTE, { x: -60 * u, y: -90 * u, width: 120 * u, height: 102 * u }, o);
  return { ...spec, ground: r2(G * u), ...(shadows.length ? { shadows } : {}) };
}

/** Cherry-blossom petals on the wind: `blow` streams across in a gusty breeze, `fall` drifts down slowly. */
export function petalsRig(o: RigPresetOptions = {}): RigSpec {
  const size = o.size ?? 500, u = size / 100, rig = new Rig(u), m = o.motion ?? "blow", start = o.start ?? 0;
  const palette: Partial<Record<RigRole, string>> = { paint: "#f6cdd8", accent: "#e595ad", detail: "#d98aa2" };
  rig.bone("root", undefined, 0, 0);
  const n = m === "blow" ? 46 : 36, bones: string[] = [], r = seeded(7);
  for (let i = 0; i < n; i++) {
    const id = "petal-" + i, k = 1.1 + r() * .6;
    rig.bone(id, "root", 0, 0);
    bones.push(id);
    rig.part(id, id, path(`M${-1.7 * k} 0C${-1 * k} ${-.55 * k} ${-.4 * k} ${-1.45 * k} ${.6 * k} ${-1.42 * k}Q${1.62 * k} ${-1.3 * k} ${1.72 * k} ${-.52 * k}L${1.2 * k} 0L${1.72 * k} ${.52 * k}Q${1.62 * k} ${1.3 * k} ${.6 * k} ${1.42 * k}C${-.4 * k} ${1.45 * k} ${-1 * k} ${.55 * k} ${-1.7 * k} 0Z`),
      "paint", 5 + i * .001, { backColor: "#fbe2e9" });
    rig.part(id + "-base", id, ell(-1.05 * k, 0, .62 * k, .42 * k), "accent", 5.0005 + i * .001, { backColor: "#f2b9c9" });
    rig.part(id + "-vein", id, path(`M${-1.4 * k} 0Q${0} ${-.1 * k} ${1 * k} 0`), "detail", 5.0007 + i * .001, { line: true, lineWidth: .12 * k, side: "front" });
  }
  rig.drivers.push(m === "blow"
    ? { type: "drift", bones, area: [-230, -150, 220, 140], life: 124, flutter: { fall: .28, wind: 3.4, swing: 3, period: 26, tilt: .8, lift: .8, spin: .22, gust: 1.6, gustPeriod: 90, precess: .01 }, tumble: .55, roll: .05, vary: .4, seed: 3 }
    : { type: "drift", bones, area: [-150, -175, 260, 60], life: 140, flutter: { fall: 1.12, wind: .4, swing: 5, period: 40, tilt: .85, lift: 1.4, spin: .16, gust: .4, gustPeriod: 120, precess: .006 }, tumble: .35, roll: .035, vary: .35, seed: 5 });
  // Drift areas and speeds are in design units: scale them.
  const d = rig.drivers[0] as Extract<RigDriver, { type: "drift" }>;
  const scaleF = (f: FlutterParams): FlutterParams => ({ ...f, fall: f.fall * u, wind: (f.wind ?? 0) * u, swing: (f.swing ?? 0) * u, lift: (f.lift ?? 0) * u, gust: (f.gust ?? 0) * u });
  rig.drivers[0] = { ...d, area: [d.area[0] * u, d.area[1] * u, d.area[2] * u, d.area[3] * u], flutter: scaleF(d.flutter), start };
  return finish("petals", "petals", rig, [{ frame: start, x: o.from ?? 0, y: o.y ?? 0, facing: 1 }], palette, { x: -100 * u, y: -100 * u, width: 200 * u, height: 100 * u }, o);
}
