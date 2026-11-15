/**
 * RIG1 person actions with props: shooting a pistol, boxing, a front kick, a two-handed sword cut, chopping on a board
 * and tossing a frying pan.
 *
 * The prop is a keyed bone and the hands reach for its grip points with IK, so a hand can never come off the gun, the
 * sword, the knife or the pan. Timing and poses come from reference:
 *   - shooting: a two-hand stance with the arms almost straight and the gun at eye line; each shot kicks the muzzle up
 *     and back in about two frames and returns in five; the flash lasts a frame or two; casings fly up and back;
 *   - boxing (Muybridge, "Athletes boxing", Attitudes of Animals in Motion, public domain): wide staggered stance, knees
 *     bent, the punching arm straight at shoulder height while the other fist stays at the chin, the body leaning ~20°
 *     into the cross with the rear leg driving straight;
 *   - the kick chambers the knee high, snaps the shin out in about three frames and rechambers before stepping down,
 *     the body leaning back to balance;
 *   - the sword cut (kendo's men strike): raise overhead, step in, cut down in a few frames and stop the blade dead,
 *     hold (zanshin), then return to the middle guard;
 *   - chopping rocks the knife on its tip, about three cuts a second, the guiding hand's knuckles walking along the food;
 *   - the pan moves like a double pendulum, sliding and see-sawing with about a radian of phase between them
 *     (Ko & Hu 2020, "The physics of tossing fried rice"), and a flip jerks the pan back with its far lip rising.
 */
import type { RigKey, RigRole } from "./rig-spec";
import { projectPlate } from "./rig-flutter";
import { Rig, ell, path, poly, rect } from "./rig-kit";
import { SWORD_MOTIONS, addSwordAction } from "./rig-presets-sword";
import type { SwordMotion } from "./rig-presets-sword";

export const ACTION_MOTIONS = ["shoot", "box", "kick", ...SWORD_MOTIONS, "chop", "pan-toss"] as const;
export type ActionMotion = (typeof ACTION_MOTIONS)[number];

type Ease = RigKey["ease"];
type Keys3 = [number, number, number?][];
export interface ActionContext {
  u: number; start: number; end: number; t: (k: number) => number;
  /** Plant both feet over a window; keys are [frame, x (u), lift (u)]. */
  plant: (from: number, to: number, keysF: Keys3 | null, keysB: Keys3 | null, ramp?: number) => void;
}
const RD = 180 / Math.PI;

/** Counter or stove top in front of the person: stone slab, wooden cabinet, plinth. Design units, top at `top`. */
function addCounter(rig: Rig, x0: number, x1: number, top: number) {
  rig.bone("counter", "root", 0, 0);
  rig.part("counter-cabinet", "counter", rect(x0 + 1, top + 2.4, x1 - x0 - 2, -top - 2.4 - 3), "wood", .3);
  rig.part("counter-door", "counter", path(`M${x0 + 3} ${top + 5}H${x1 - 3}V-5H${x0 + 3}Z`), "detail", .31, { line: true, lineWidth: .35, color: "#5e3d24" });
  rig.part("counter-knob", "counter", ell(x0 + 5.5, top + 9, .7, .7), "metal", .32);
  rig.part("counter-plinth", "counter", rect(x0 + 2, -3, x1 - x0 - 4, 3), "cloth-dark", .3);
  rig.part("counter-top", "counter", rect(x0, top, x1 - x0, 2.4, .5), "light", .33, { color: "#d8d2c4" });
}

export function addPersonAction(rig: Rig, m: ActionMotion, c: ActionContext): void {
  const { u, start, end, t, plant } = c;
  const P = (frame: number, x: number, y: number, ease?: Ease) => ({ frame, x: x * u, y: y * u, ease });
  // Reaches that last to the end of the window run past it, so they never ramp out (hands would leave the props).
  const past = (to: number) => (to >= end ? end + 60 : to);
  const reach = (side: "f" | "b", from: number, to: number, follow: string, ramp = 6) =>
    rig.drivers.push({ type: "reach", start: from, end: past(to), ramp, upper: "arm-" + side, lower: "fore-" + side, bend: -1, follow, offset: [0, 0] });
  const reachTo = (side: "f" | "b", from: number, to: number, target: ReturnType<typeof P>[], ramp = 6) =>
    rig.drivers.push({ type: "reach", start: from, end: past(to), ramp, upper: "arm-" + side, lower: "fore-" + side, bend: -1, target });
  const fists = (fF: number, fB: number | null) => {
    rig.drivers.push({ type: "variant", part: "hand-f", mode: "keys", keys: [{ frame: fF, name: "fist" }] });
    if (fB !== null) rig.drivers.push({ type: "variant", part: "hand-b", mode: "keys", keys: [{ frame: fB, name: "fist" }] });
  };
  /** A bone keyed in root space (x, y in u; rotate in degrees). */
  const prop = (id: string, keys: { frame: number; x: number; y: number; r: number; ease?: Ease; opacity?: number }[]) =>
    rig.track(id, keys.map(k => ({ frame: k.frame, x: k.x * u, y: k.y * u, rotate: k.r, ease: k.ease, opacity: k.opacity })));

  if (m === "shoot") {
    // Pistol: slide, frame, grip angled back, trigger guard. Bone at the grip; +x along the barrel.
    rig.bone("gun", "root", 0, 0);
    rig.part("gun-grip", "gun", poly([[-1.8, -2.4], [1.8, -2.4], [.9, 4.6], [-2.5, 4.3]]), "metal-dark", 6.2);
    rig.part("gun-frame", "gun", poly([[-1.6, -2.6], [9.2, -2.6], [9.2, -1.2], [3, -1.2], [2.2, -.6], [-1, -.6]]), "metal-dark", 6.21, { color: "#2e3036" });
    rig.part("gun-guard", "gun", path("M1.8 -1.2Q2 1.4 4 1.4Q5.4 1.2 5.2 -1.2L4.6 -1.2Q4.6 .6 3.8 .7Q2.6 .6 2.5 -1.2Z"), "metal-dark", 6.22);
    rig.part("gun-slide", "gun", rect(-2.4, -4.9, 12.4, 2.4, .4), "metal-dark", 6.23, { color: "#3a3d44" });
    rig.part("gun-serrations", "gun", path("M-1.4 -4.6V-2.8M-.7 -4.6V-2.8M0 -4.6V-2.8"), "detail", 6.24, { line: true, lineWidth: .2, color: "#15161a" });
    rig.part("gun-sight", "gun", rect(8.8, -5.5, .8, .7), "metal-dark", 6.24);
    rig.bone("gun-grip-b", "gun", .6, 1.6);
    rig.bone("flash", "gun", 10.2, -3.7);
    rig.part("flash-out", "flash", poly([[0, -.4], [4, -2.6], [2.2, -.6], [7.4, 0], [2.2, .6], [4, 2.6], [0, .4]]), "light", 6.3, { color: "#ffcf5a" });
    rig.part("flash-in", "flash", poly([[0, -.25], [2.6, -.9], [4.2, 0], [2.6, .9], [0, .25]]), "light", 6.31, { color: "#fffbe8" });
    const a0 = t(.08), a1 = Math.max(a0 + 8, t(.2)), low = Math.max(a1 + 12, t(.8)), lowEnd = low + Math.max(6, t(.9) - t(.8));
    // Three shots when the window allows, each with room for its recoil to settle before the next.
    const shots = [t(.32), t(.4), t(.48)].map(f => Math.max(f, a1 + 2)).filter((f, i, all) => (i === 0 || f >= all[i - 1] + 10) && f + 10 < low);
    /** Strictly increasing step keys (short windows squeeze them together). */
    const steps = (keys: [number, number, number?][]): [number, number, number?][] => keys.map((k, i, all) => [Math.max(k[0], i ? all[i - 1][0] + i : k[0]), k[1], k[2]] as [number, number, number?])
      .reduce<[number, number, number?][]>((out, k) => [...out, out.length && k[0] <= out[out.length - 1][0] ? [out[out.length - 1][0] + 1, k[1], k[2]] : k], []);
    const AIM = { x: 29, y: -76.5 };
    const gun: Parameters<typeof prop>[1] = [{ frame: start, x: 6.6, y: -45.6, r: 92 }, { frame: a0, x: 6.6, y: -45.6, r: 92 },
      { frame: a0 + 5, x: 10, y: -60, r: 50, ease: "ease-in-quad" }, { frame: a1, x: AIM.x, y: AIM.y, r: 0, ease: "ease-out-cubic" }];
    const flash: RigKey[] = [{ frame: start, opacity: 0 }];
    for (const [i, f] of shots.entries()) {
      gun.push({ frame: f, x: AIM.x, y: AIM.y, r: 0 }, { frame: f + 2, x: AIM.x - 2.4, y: AIM.y - 1.4, r: -15, ease: "ease-out-quad" }, { frame: f + 8, x: AIM.x, y: AIM.y, r: 0, ease: "ease-in-out-cubic" });
      flash.push({ frame: f - 1, opacity: 0, scaleX: 1, scaleY: 1 }, { frame: f, opacity: 1, scaleX: 1 + i * .12, scaleY: 1 - i * .08, ease: "linear" }, { frame: f + 1, opacity: .6, ease: "linear" }, { frame: f + 2, opacity: 0, ease: "linear" });
      // Spent casing: out of the ejection port, up and back over the shoulder, spinning, then down to the ground.
      const id = "casing-" + i, ck: RigKey[] = [{ frame: start, opacity: 0 }, { frame: f, opacity: 0, x: (AIM.x + 2) * u, y: (AIM.y - 4) * u }];
      rig.bone(id, "root", 0, 0);
      rig.part(id, id, rect(-.55, -.28, 1.1, .56, .1), "brass", 6.4, { color: "#d2a640" });
      for (let s = 1; s <= 40; s++) {
        let x = AIM.x + 2 - 1.1 * s, y = AIM.y - 4 - 3.4 * s + .19 * s * s;
        if (y > -.4) { y = -.4; x = AIM.x + 2 - 1.1 * Math.min(s, 30); }
        ck.push({ frame: f + s, x: x * u, y: y * u, rotate: y > -.5 ? 80 : s * 47, opacity: 1, ease: "linear" });
      }
      rig.track(id, ck);
    }
    gun.push({ frame: low, x: AIM.x, y: AIM.y, r: 0 }, { frame: lowEnd, x: 19, y: -62, r: 32, ease: "ease-in-out-cubic" });
    prop("gun", gun);
    rig.track("flash", flash);
    // Bladed stance: rear (near) foot steps back, lead foot forward, knees soft, a little lean into the gun.
    plant(start, end, steps([[start, 2.2], [a0 + 2, 2.2], [a0 + 5, -2, 2.4], [a1 - 1, -5.4]]), steps([[start, -1.4], [a0 + 3, -1.4], [a0 + 6, 2.6, 2.2], [a1 + 1, 5.6]]), 0);
    rig.track("pelvis", [{ frame: a0, x: 0, y: 0 }, { frame: a1, x: .4 * u, y: 1.4 * u }]);
    rig.track("torso", [{ frame: a0, rotate: 0 }, { frame: a1, rotate: 5 }, ...shots.flatMap(f => [{ frame: f, rotate: 5 }, { frame: f + 2, rotate: 3.6 }, { frame: f + 8, rotate: 5 }]), { frame: low, rotate: 5 }, { frame: lowEnd, rotate: 3 }]);
    rig.track("head", [{ frame: a0, rotate: 0 }, { frame: a1, rotate: 5 }, ...shots.flatMap(f => [{ frame: f + 1, rotate: 3.6 }, { frame: f + 6, rotate: 5 }])]);
    reach("f", a0 - 4, end, "gun", 4);
    reach("b", a0 + 7, end, "gun-grip-b", 5);
    fists(a0 - 1, a0 + 8);
    rig.drivers.push({ type: "variant", part: "eye", mode: "keys", keys: shots.flatMap(f => [{ frame: f, name: "shut" }, { frame: f + 2, name: null }]) });
    return;
  }

  if (m === "box" || m === "kick") {
    // Guard: lead (far) fist forward at eye level, rear (near) fist at the chin, elbows in; wide staggered stance.
    const NEAR = [12.5, -71] as const, FAR = [21.5, -78.5] as const, s0 = start + 8;
    plant(start, end, m === "kick" ? null : [[start, 2.2], [s0, -7, 2.4]], [[start, -1.4], [s0, 8, 2.4]], 0);
    rig.drivers.push({ type: "oscillate", start: s0, end, ramp: 8, bone: "pelvis", property: "y", amplitude: .9 * u, period: 15 });
    fists(start + 3, start + 3);
    const near: ReturnType<typeof P>[] = [P(start, 7, -48), P(s0, NEAR[0], NEAR[1], "ease-out-cubic")];
    const far: ReturnType<typeof P>[] = [P(start, 1, -48), P(s0, FAR[0], FAR[1], "ease-out-cubic")];
    const torso: RigKey[] = [{ frame: start, rotate: 0 }, { frame: s0, rotate: 8 }], pelvis: RigKey[] = [{ frame: start, x: 0, y: 0 }, { frame: s0, x: .5 * u, y: 3 * u }];
    const head: RigKey[] = [{ frame: start, rotate: 0 }, { frame: s0, rotate: 6 }];
    if (m === "box") {
      for (let b = s0 + 6; b + 46 <= end; b += 50) {
        // Jab, jab: the lead arm snaps straight in three frames and comes back in five.
        for (const j of [0, 12]) far.push(P(b + j, FAR[0], FAR[1]), P(b + j + 3, 32, -69.5, "ease-out-quad"), P(b + j + 4, 32.3, -69.5), P(b + j + 8, FAR[0], FAR[1], "ease-in-out-cubic"));
        for (const j of [0, 12]) torso.push({ frame: b + j, rotate: 8 }, { frame: b + j + 3, rotate: 11 }, { frame: b + j + 8, rotate: 8 });
        // Cross: the rear hand drives straight while the hips and shoulders turn in and the body leans ~20°.
        near.push(P(b + 22, NEAR[0], NEAR[1]), P(b + 25, 35, -70.5, "ease-out-quad"), P(b + 27, 35.2, -70.5), P(b + 33, NEAR[0], NEAR[1], "ease-in-out-cubic"));
        torso.push({ frame: b + 22, rotate: 8 }, { frame: b + 25, rotate: 20, ease: "ease-out-quad" }, { frame: b + 27, rotate: 20 }, { frame: b + 33, rotate: 8 });
        pelvis.push({ frame: b + 22, x: .5 * u, y: 3 * u }, { frame: b + 25, x: 3.4 * u, y: 2.4 * u, ease: "ease-out-quad" }, { frame: b + 33, x: .5 * u, y: 3 * u });
        // Duck under a counter, hands still up, and come back to guard.
        pelvis.push({ frame: b + 36, x: .5 * u, y: 3 * u }, { frame: b + 40, x: 1 * u, y: 8.5 * u, ease: "ease-out-quad" }, { frame: b + 46, x: .5 * u, y: 3 * u });
        torso.push({ frame: b + 36, rotate: 8 }, { frame: b + 40, rotate: 24 }, { frame: b + 46, rotate: 8 });
        head.push({ frame: b + 25, rotate: 3 }, { frame: b + 33, rotate: 6 }, { frame: b + 40, rotate: -6 }, { frame: b + 46, rotate: 6 });
      }
      rig.drivers.push({ type: "variant", part: "mouth", mode: "keys", keys: [{ frame: s0, name: "mid" }] });
    } else {
      // Front snap kick with the rear (near) leg: chamber the knee high, snap, rechamber, set down.
      const leg: ReturnType<typeof P>[] = [P(start, 2.2, -2.4), P(s0, -7, -2.4)], foot: RigKey[] = [];
      for (let b = s0 + 10; b + 30 <= end; b += 64) {
        leg.push(P(b, -7, -2.4), P(b + 7, 7, -29, "ease-out-quad"), P(b + 10, 36, -52, "ease-out-quad"), P(b + 12, 36.4, -52.4), P(b + 16, 7, -29, "ease-in-out-quad"), P(b + 23, -6.6, -2.4, "ease-in-out-cubic"));
        foot.push({ frame: b, rotate: 0 }, { frame: b + 6, rotate: 34 }, { frame: b + 10, rotate: -4 }, { frame: b + 15, rotate: 30 }, { frame: b + 23, rotate: 0 });
        torso.push({ frame: b, rotate: 8 }, { frame: b + 7, rotate: -4 }, { frame: b + 10, rotate: -15, ease: "ease-out-quad" }, { frame: b + 12, rotate: -15 }, { frame: b + 16, rotate: -4 }, { frame: b + 23, rotate: 8 });
        pelvis.push({ frame: b, x: .5 * u, y: 3 * u }, { frame: b + 7, x: 1.6 * u, y: 1.2 * u }, { frame: b + 10, x: 2.6 * u, y: .6 * u }, { frame: b + 16, x: 1.6 * u, y: 1.2 * u }, { frame: b + 23, x: .5 * u, y: 3 * u });
        near.push(P(b + 4, NEAR[0], NEAR[1]), P(b + 10, 5, -63, "ease-out-quad"), P(b + 16, 7, -70), P(b + 22, NEAR[0], NEAR[1]));
        head.push({ frame: b + 7, rotate: 2 }, { frame: b + 10, rotate: 10 }, { frame: b + 23, rotate: 6 });
      }
      // The kicking (near) leg has its own reach; the far foot stays planted.
      rig.drivers.push({ type: "reach", start, end: end + 60, ramp: 0, upper: "thigh-f", lower: "shin-f", bend: 1, target: leg });
      rig.track("foot-f", foot);
    }
    reachTo("f", start, end, near, 6); reachTo("b", start, end, far, 6);
    rig.track("torso", torso); rig.track("pelvis", pelvis); rig.track("head", head);
    return;
  }

  if ((SWORD_MOTIONS as readonly string[]).includes(m)) { addSwordAction(rig, m as SwordMotion, { u, start, end, plant }); return; }

  // ---- Kitchen ----
  const TOP = -52;
  addCounter(rig, 10, 48, TOP);
  rig.track("head", [{ frame: start, rotate: 0 }, { frame: start + 10, rotate: m === "chop" ? 16 : 11 }]);
  rig.track("torso", [{ frame: start, rotate: 0 }, { frame: start + 10, rotate: m === "chop" ? 13 : 7 }]);
  plant(start, end, [[start, 2.2]], [[start, -1.4]], 0);

  if (m === "chop") {
    const BOARD = TOP - 2.2, VEG_END = 31, VEG_LEN = 13, CUTS = 20, x0 = 19, x1 = 28.4, every = 9, c0 = t(.08);
    rig.part("board", "counter", rect(13, BOARD, 23, 2.2, .5), "wood", 6.3, { color: "#c99a62" });
    rig.part("board-edge", "counter", path(`M13.6 ${BOARD + 1.5}H35.4`), "detail", 6.31, { line: true, lineWidth: .25, color: "#9c7244" });
    // Cucumber: the uncut part shortens from the left as slices come off; the cut face rides at the knife.
    rig.bone("veg", "root", VEG_END, BOARD - 1.45);
    rig.part("veg", "veg", path(`M${-VEG_LEN} -1.45H-.6Q.9 -1.4 .9 0Q.9 1.4 -.6 1.45H${-VEG_LEN}Z`), "paint", 6.4, { color: "#3f7a2e" });
    rig.part("veg-stripe", "veg", path(`M${-VEG_LEN} -.7H-1M${-VEG_LEN} .5H-1.2`), "detail", 6.41, { line: true, lineWidth: .18, color: "#6aa04b" });
    rig.bone("veg-face", "root", 0, BOARD - 1.45);
    rig.part("veg-face", "veg-face", ell(0, 0, .35, 1.42), "paint", 6.42, { color: "#d9ebb6" });
    rig.bone("knife", "root", 0, 0);
    rig.part("knife-blade", "knife", path("M1 -.7L11.2 -.5Q13.4 .6 13.2 2.6L3 2.6Q1 2.6 1 1.4Z"), "metal", 6.9, { color: "#c9ced3" });
    rig.part("knife-edge", "knife", path("M1.6 2.45H13"), "light", 6.91, { line: true, lineWidth: .22, color: "#f2f5f7" });
    rig.part("knife-bolster", "knife", rect(.2, -.75, 1, 1.9, .2), "metal-dark", 6.92);
    rig.part("knife-handle", "knife", path("M-6 -.6Q-6.6 0 -6 .7L.4 .9L.4 -.8Z"), "metal-dark", 6.88, { color: "#2a2420" });
    rig.part("knife-rivets", "knife", path("M-4.6 0h.01M-2.4 0h.01"), "light", 6.89, { line: true, lineWidth: .35, color: "#bfc4c9" });
    rig.bone("claw", "root", 0, 0);
    const knife: RigKey[] = [], veg: RigKey[] = [{ frame: start, scaleX: 1 }], face: RigKey[] = [], claw: RigKey[] = [];
    const grip = (xc: number, r: number) => {
      // Rocking on the tip: the tip stays on the board ahead of the cut while the heel rises and falls.
      const c = Math.cos(r / RD), s = Math.sin(r / RD), tipX = xc + 10, tipY = BOARD;
      return { x: (tipX - (13 * c - 2.6 * s)) * u, y: (tipY - (13 * s + 2.6 * c)) * u, rotate: r };
    };
    face.push({ frame: start, x: (VEG_END - VEG_LEN) * u });
    knife.push({ frame: start, ...grip(x0 - 1, 26) });
    for (let i = 0; i < CUTS; i++) {
      const xc = x0 + (x1 - x0) * i / (CUTS - 1), f = c0 + i * every;
      knife.push({ frame: f - 6, ...grip(xc, 24), ease: "ease-out-quad" }, { frame: f, ...grip(xc, 0), ease: "ease-in-quad" });
      veg.push({ frame: f - 1, scaleX: (VEG_END - (xc - .55)) / VEG_LEN }, { frame: f, scaleX: (VEG_END - xc) / VEG_LEN, ease: "linear" });
      face.push({ frame: f - 1, x: (xc - .55) * u }, { frame: f, x: xc * u, ease: "linear" });
      if (i % 3 === 0) claw.push({ frame: f + 2, x: (xc + 3.4) * u, y: (BOARD - 3.6) * u }, { frame: f + 5, x: (xc + 3.4 + 2.4) * u, y: (BOARD - 4.4) * u, ease: "ease-in-out-quad" });
      // The slice: stands where it was cut, then tips over onto the stack.
      const id = "slice-" + i, lean = -18 - (i % 3) * 9;
      rig.bone(id, "root", 0, 0);
      rig.part(id, id, rect(-.32, -1.42, .64, 2.84, .3), "paint", 6.35 + i * .001, { color: "#3f7a2e" });
      rig.part(id + "-in", id, rect(-.22, -1.2, .44, 2.4, .2), "paint", 6.351 + i * .001, { color: "#cfe3a8" });
      rig.track(id, [{ frame: start, opacity: 0, x: (xc - .3) * u, y: (BOARD - 1.42) * u, rotate: 0 }, { frame: f - 1, opacity: 0 }, { frame: f, opacity: 1, ease: "linear" },
        { frame: f + 4, x: (xc - .6) * u, y: (BOARD - 1.3) * u, rotate: lean, ease: "ease-in-quad" }]);
    }
    const last = c0 + (CUTS - 1) * every;
    knife.push({ frame: last + 10, ...grip(x1, 20), ease: "ease-out-quad" }, { frame: last + 24, ...grip(x1 + 1, 10) });
    rig.track("knife", knife); rig.track("veg", veg); rig.track("veg-face", face); rig.track("claw", claw.length ? claw : [{ frame: start, x: (x0 + 3.4) * u, y: (BOARD - 3.6) * u }]);
    reach("f", start, end, "knife", 0); reach("b", start, end, "claw", 0);
    fists(start, start);
    return;
  }

  // Frying pan over a gas flame: shakes and a pancake flip, steam rising.
  const BURNER = 33;
  rig.part("grate", "counter", path(`M${BURNER - 8} ${TOP - .6}H${BURNER + 8}M${BURNER - 6} ${TOP}V${TOP - 1.4}M${BURNER + 6} ${TOP}V${TOP - 1.4}`), "metal-dark", .4, { line: true, lineWidth: .55 });
  rig.bone("flame", "counter", BURNER, TOP - .3);
  for (let k = -3; k <= 3; k++) {
    rig.part(`flame-${k}`, "flame", path(`M${k * 1.9 - .7} 0Q${k * 1.9} ${-2.6 - (k % 2 ? 0 : .6)} ${k * 1.9 + .7} 0Z`), "light", .35, { color: "#5d8ff0" });
    rig.part(`flame-core-${k}`, "flame", path(`M${k * 1.9 - .35} 0Q${k * 1.9} ${-1.3} ${k * 1.9 + .35} 0Z`), "light", .36, { color: "#cfe0ff" });
  }
  rig.drivers.push({ type: "oscillate", bone: "flame", property: "scaleY", amplitude: .16, period: 5, wobble: .6 });
  rig.bone("pan", "root", 0, 0);
  rig.part("pan-handle", "pan", path("M0 -.55L11.6 -.4L11.6 .55L0 .65Q-1.2 0 0 -.55Z"), "metal-dark", 6.85, { color: "#25262a" });
  rig.part("pan-back", "pan", path("M11.4 0Q20 -1.3 28.8 0L28.4 .5Q20 -.6 11.8 .5Z"), "metal-dark", 6.6, { color: "#3b3d43" });
  rig.part("pan-body", "pan", path("M11 0L13 3.3L27 3.3L29.2 0L28.4 0L26.6 2.5L13.4 2.5L11.8 0Z"), "metal-dark", 6.8, { color: "#2f3136" });
  rig.part("pan-front", "pan", path("M11.8 0L13.4 2.5L26.6 2.5L28.4 0Q20 1.2 11.8 0Z"), "metal-dark", 6.8, { color: "#44474e" });
  rig.part("pan-rim-hi", "pan", path("M12.4 .3Q20 1.2 27.8 .3"), "light", 6.81, { line: true, lineWidth: .2, color: "#8c9097" });
  const flips = [t(.36), t(.74)];
  const panAt = (f: number) => {
    // Shaking: slide and see-saw about a radian apart (~2.7 tosses a second); a flip pushes, then jerks back and up.
    let x = 13.9 + 1.4 * Math.sin(2 * Math.PI * f / 11), y = -60.1 - .25 * Math.max(0, Math.cos(2 * Math.PI * f / 11)), r = 10 + 3 * Math.sin(2 * Math.PI * f / 11 - 1);
    for (const fe of flips) {
      const s = f - fe, k = Math.exp(-((s + 1) ** 2) / 30);
      if (s > -14 && s < 26) { x = 13.9 + (x - 13.9) * (1 - k * 1.2); r = 10 + (r - 10) * (1 - k * 1.2); y = -60.1 + (y + 60.1) * (1 - k); }
      if (s >= -6 && s < 0) { const e = (s + 6) / 6; x += 3 * e * e; r += 3 * e; }
      else if (s >= 0 && s < 3) { const e = s / 3; x += 3 - 6 * e; y -= 3.2 * e; r += 3 - 21 * e; }
      else if (s >= 3 && s < 12) { const e = (s - 3) / 9, sm = e * e * (3 - 2 * e); x += -3 * (1 - sm); y -= 3.2 * (1 - sm); r += -18 * (1 - sm); }
      else if (s >= 12 && s < 20) { y += 1.1 * Math.sin(Math.PI * (s - 12) / 8); }
    }
    return { x, y, r };
  };
  const toWorld = (p: { x: number; y: number; r: number }, lx: number, ly: number) => {
    const c = Math.cos(p.r / RD), s = Math.sin(p.r / RD);
    return { x: p.x + lx * c - ly * s, y: p.y + lx * s + ly * c };
  };
  const panKeys: RigKey[] = [];
  for (let f = start; f <= end; f++) { const p = panAt(f); panKeys.push({ frame: f, x: p.x * u, y: p.y * u, rotate: p.r, ease: "linear" }); }
  rig.track("pan", panKeys.map((k, i) => (i ? k : { ...k, ease: undefined })));
  // Pancake (and three bits) keyed in root space: riding the pan, or in flight between launch and catch.
  const food: [string, number, number, number, string, string][] = [["pancake", 20, 1.6, 6.4, "#e8b85c", "#c98a33"], ["bit-0", 15.6, 1.9, 1, "#e0602c", "#b84a1f"], ["bit-1", 24.4, 1.9, .9, "#6aa84a", "#4f8a36"], ["bit-2", 18, 1.8, .8, "#f0d36a", "#d4b048"]];
  food.forEach(([id, lx, ly, r, col, back], i) => {
    rig.bone(id, "root", 0, 0);
    rig.part(id, id, ell(0, 0, r, r * (id === "pancake" ? 1 : .8)), "paint", 6.7 + i * .001, { color: col, backColor: back });
    if (id === "pancake") rig.part("pancake-spots", id, path("M-2.6 -1.4h.01M1.4 -2.2h.01M2.6 1.2h.01M-1 2h.01"), "detail", 6.701, { line: true, lineWidth: .9, color: "#c98a33", side: "front" });
    const ks: RigKey[] = [];
    for (let f = start; f <= end; f++) {
      const p = panAt(f), fe = flips.find(q => f >= q + 2 && f <= q + 15), slide = .6 * Math.sin(2 * Math.PI * f / 11 - 1.6);
      let w = toWorld(p, lx + slide, ly), pitch = -p.r / RD, extra = 0;
      if (fe !== undefined) {
        const s = (f - fe - 2) / 13, a = toWorld(panAt(fe + 2), lx + 3, ly - .6), b = toWorld(panAt(fe + 15), lx, ly);
        const h = id === "pancake" ? 17 : 12 + i * 2.6;
        w = { x: a.x + (b.x - a.x) * s - 2.4 * Math.sin(Math.PI * s), y: a.y + (b.y - a.y) * s - 4 * h * s * (1 - s) };
        extra = (id === "pancake" ? Math.PI : Math.PI * (1.3 + i * .4)) * s;
        pitch = -panAt(fe + 2).r / RD * (1 - s) - panAt(fe + 15).r / RD * s;
      }
      const flipped = flips.filter(q => f > q + 15).length * Math.PI * (id === "pancake" ? 1 : 0);
      const k = projectPlate(pitch + extra + flipped, 1.25);
      ks.push({ frame: f, x: w.x * u, y: w.y * u, rotate: k.rotate, scaleX: k.scaleX, scaleY: k.scaleY, shear: k.shear, ease: "linear" });
    }
    for (let j = 1; j < ks.length; j++) { const a = ks[j - 1].rotate!, b = ks[j].rotate!; ks[j] = { ...ks[j], rotate: a + ((((b - a) % 360) + 540) % 360 - 180) }; }
    rig.track(id, ks.map((k, j) => (j ? k : { ...k, ease: undefined })));
  });
  rig.bone("steam", "pan", 20, -1);
  const puffs: string[] = [];
  for (let k = 0; k < 6; k++) { const id = "steam-" + k; rig.bone(id, "root", 0, 0); puffs.push(id); rig.part(id, id, ell(0, 0, 1.6, 1.3), "smoke", 6.95); }
  rig.drivers.push({ type: "emitter", puffs, origin: "steam", every: 9, life: 48, velocity: [-.05 * u, -.32 * u], growth: 2.6, drift: .5 * u });
  reach("f", start, end, "pan", 0);
  rig.drivers.push({ type: "reach", start, end: end + 60, ramp: 10, upper: "arm-b", lower: "fore-b", bend: -1, follow: "pelvis", offset: [-6.5 * u, -3.4 * u] });
  fists(start, null);
}

/** Palette additions the action props use. */
export const ACTION_PALETTE: Partial<Record<RigRole, string>> = { metal: "#c9ced3", brass: "#c9a24a", light: "#f2d98a", smoke: "#eeeae2", paint: "#3f7a2e" };
