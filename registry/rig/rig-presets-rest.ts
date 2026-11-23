/**
 * RIG1 floor and everyday actions for the person rig: lying down, going to sleep, sleeping, rolling and picking
 * something up.
 *
 * From reference (Muybridge, Animal Locomotion, public domain):
 *   - sitting down on the ground (plate 248, read backward from its rising sequence): crouch, a hand reaches back to the
 *     ground, the hips lower behind the feet, then the legs slide out; lying back, the spine unrolls onto the ground;
 *   - stooping to lift (plate 209): knees bend deeply while the trunk leans about 45–60°, the hands reach beside the
 *     front foot, then the legs straighten as the trunk rises with the load close to the body;
 *   - rolling: the tucked "ball" of the somersault plates (knees to the chest, chin tucked, hands on the shins), rolled
 *     along the ground without slipping (the centre advances by radius × angle).
 * The body stays one rig: lying is the pelvis turned a quarter round with the feet held on the ground by IK.
 */
import { evaluateRig } from "./rig-evaluate";
import type { RigPartFrame } from "./rig-evaluate";
import type { RigKey, RigSpec } from "./rig-spec";
import { Rig, path, rect } from "./rig-kit";
import type { Pt } from "./rig-kit";

export const REST_MOTIONS = ["lie-down", "go-to-sleep", "sleep", "wake-up", "get-up", "roll", "pick-up"] as const;
export type RestMotion = (typeof REST_MOTIONS)[number];
/** Motions that take the body off its feet (no standing gait under them). */
export const FLOOR_MOTIONS: ReadonlySet<string> = new Set(["lie-down", "go-to-sleep", "sleep", "wake-up", "get-up", "roll"]);

type Steps = [number, number, number?][];
export interface RestContext {
  u: number; start: number; end: number; t: (k: number) => number;
  plant: (from: number, to: number, keysF: Steps | null, keysB: Steps | null, ramp?: number) => void;
}
type Ease = RigKey["ease"];
const IO: Ease = "ease-in-out-cubic";
const RD = 180 / Math.PI;
const HIP = 44;

export function addRestAction(rig: Rig, m: RestMotion, c: RestContext): void {
  const { u, start, end, t } = c, D = end - start;
  /** Pelvis pose in root space (design units; y of the hip joint, rotation in degrees). */
  const pelvis: RigKey[] = [], torso: RigKey[] = [], head: RigKey[] = [];
  const P = (frame: number, x: number, y: number, r: number, ease: Ease = IO) => pelvis.push({ frame, x: x * u, y: (y + HIP) * u, rotate: r, ease });
  const T = (frame: number, r: number, ease: Ease = IO) => torso.push({ frame, rotate: r, ease });
  const H = (frame: number, r: number, ease: Ease = IO) => head.push({ frame, rotate: r, ease });
  const pt = (frame: number, x: number, y: number, ease: Ease = IO) => ({ frame, x: x * u, y: y * u, ease });
  /** Short windows squeeze key frames together: keep them strictly increasing. */
  const inc = <K extends { frame: number }>(keys: K[]) => keys.filter((k, i, all) => i === 0 || k.frame > all[i - 1].frame);
  /** A leg held by IK on root-space ankle targets, with the foot at a fixed world angle (0 flat, −90 toes up). */
  const leg = (side: "f" | "b", from: number, to: number, ramp: number, target: ReturnType<typeof pt>[], tipAngle: number) =>
    rig.drivers.push({ type: "reach", start: from, end: to, ramp, upper: "thigh-" + side, lower: "shin-" + side, tip: "foot-" + side, tipAngle, bend: 1, target: inc(target) });
  const arm = (side: "f" | "b", from: number, to: number, ramp: number, target: ReturnType<typeof pt>[], bend: 1 | -1 = -1) =>
    rig.drivers.push({ type: "reach", start: from, end: to, ramp, upper: "arm-" + side, lower: "fore-" + side, bend, target: inc(target) });
  const armFollow = (side: "f" | "b", from: number, to: number, ramp: number, follow: string, offset: Pt = [0, 0]) =>
    rig.drivers.push({ type: "reach", start: from, end: to, ramp, upper: "arm-" + side, lower: "fore-" + side, bend: -1, follow, offset: [offset[0] * u, offset[1] * u] });
  const variant = (part: string, keys: { frame: number; name: string | null }[]) => rig.drivers.push({ type: "variant", part, mode: "keys", keys });
  const SOLE = 2.4, LATE = end + 60;

  if (m === "lie-down" || m === "go-to-sleep" || m === "sleep" || m === "wake-up" || m === "get-up") {
    const sleepy = m !== "lie-down", g = sleepy ? 2.4 : 0;
    // Lying on the back: hips quarter-turned (head to the left), back flat on the ground (or the mat).
    const LIE = { x: -10, y: -10 - g, r: -90 };
    if (sleepy) {
      // A futon mat and a pillow; a blanket folded at the foot that is drawn up to the chest.
      rig.bone("mat", "root", 0, 0);
      rig.part("mat", "mat", rect(-60, -g, 98, g, 1), "cloth", .2, { color: "#e7ddc8" });
      rig.part("mat-edge", "mat", path(`M-59 ${-g + .5}H37`), "detail", .21, { line: true, lineWidth: .3, color: "#b9ab90" });
      rig.part("pillow", "mat", path(`M-58 ${-g}Q-59 ${-g - 6.4} -51 ${-g - 6.8}Q-43 ${-g - 7} -42.6 ${-g - 1}Q-50 ${-g + .2} -58 ${-g}Z`), "cloth", 3.95, { color: "#f4f0e6" });
      rig.part("pillow-seam", "mat", path(`M-56.6 ${-g - 4.6}Q-50 ${-g - 6} -44 ${-g - 4}`), "detail", 3.96, { line: true, lineWidth: .25, color: "#cfc6b4" });
      rig.bone("blanket", "root", 39, -g);
      // Drawn over the lying body from the feet (0) to the chest (−64): toes, straight legs, hips, chest, turned-down hem.
      rig.part("blanket", "blanket", path("M0 0L.4 -10.4Q-3.4 -13.8 -8 -13.2Q-11.6 -11.2 -16 -11.4L-40 -15.4Q-46 -18.6 -52 -20.6Q-57 -21.6 -62 -21.6L-64 0Z"),
        "cloth", 6.5, { color: "#7d9bb8" });
      rig.part("blanket-hem", "blanket", path("M-62 -21.6Q-58.6 -22.4 -55.6 -21.2L-57.6 0L-64 0Z"), "cloth", 6.51, { color: "#a9c0d4" });
      rig.part("blanket-fold", "blanket", path("M-28 -13.4Q-23 -6 -25 0M-46 -18.8Q-41 -9 -44 0"), "detail", 6.52, { line: true, lineWidth: .3, color: "#5f7d99" });
      rig.bone("blanket-edge", "blanket", -61, -19);
      rig.drivers.push({ type: "oscillate", bone: "blanket", property: "scaleY", amplitude: .018, period: 84, phase: .25 });
    }
    const lyingFeet = (from: number, to: number, ramp: number, near: Pt, far: Pt) => {
      leg("f", from, to, ramp, [pt(from, near[0], near[1])], -90); leg("b", from, to, ramp, [pt(from, far[0], far[1])], -90);
    };
    // Lying, the legs lie out straight (a relaxed knee, ~4° short of locked): each heel rests on the ground a full leg
    // length from its hip. With the hips turned a quarter round, the near hip sits 2.2 above the pelvis joint, the far 1.4 below.
    const LEG = 21.5 + 21 - .05, heel = (hipY: number, y: number): Pt => [LIE.x + Math.sqrt(LEG * LEG - (y - hipY) ** 2), y];
    const ankleN = heel(LIE.y - 2.2, -3 - g), ankleF = heel(LIE.y + 1.4, -3.2 - g);
    if (m === "wake-up" || m === "get-up") {
      // Waking (after Muybridge's rising-from-the-ground sequence, plate 248 read forward): asleep, a stir, the eyes
      // open with a blink or two; then either a lying stretch and sit up with the blanket on the lap (wake-up), or sit
      // up, push the blanket off, draw the knees up, take the weight forward onto the feet with a hand on the mat, crouch
      // with the hands on the knees and stand (get-up).
      const sc = Math.min(1, D / 236), n = (v: number) => start + Math.max(0, Math.round(v * sc));
      const up = m === "get-up";
      // Sitting with the legs out straight: hips slide back a little so the heels stay where they lay.
      const SIT = { x: ankleN[0] - Math.sqrt(LEG * LEG - 7.6 ** 2) - 2.2, y: -10.4 - g, r: -4 };
      const fh = heel(SIT.y + 1.4, -3.2 - g), sitHeelF: Pt = [fh[0] + SIT.x - LIE.x, fh[1]];
      const asleep = n(up ? 22 : 40), open = n(up ? 30 : 58);
      P(start, LIE.x, LIE.y, LIE.r); T(start, 0); H(start, 6);
      variant("eye", [{ frame: start, name: "shut" }, { frame: open, name: null }, { frame: open + 6, name: "shut" }, { frame: open + 9, name: null },
        ...(up ? [] : [{ frame: n(86), name: "shut" }, { frame: n(102), name: null }]), { frame: open + 18, name: "shut" }, { frame: open + 20, name: null }]
        .sort((a, b) => a.frame - b.frame));
      variant("mouth", [{ frame: start, name: "mid" }, { frame: asleep + 4, name: null }, ...(up ? [{ frame: n(170), name: "open" }, { frame: n(192), name: null }] : [{ frame: n(84), name: "open" }, { frame: n(104), name: null }])]);
      rig.drivers.push({ type: "oscillate", start, end: asleep + 12, ramp: 10, bone: "torso", property: "scaleX", amplitude: .022, period: 84 });
      H(asleep, 6); H(asleep + 10, 16); H(open, 6); H(open + 12, 3);
      const sit0 = n(up ? 40 : 146), sit1 = n(up ? 70 : 176), mid = Math.round((sit0 + sit1) / 2);
      // Sitting up: the head and shoulders lead, the hands prop behind on the mat, the trunk comes upright.
      P(sit0, LIE.x, LIE.y, LIE.r); P(mid, (LIE.x + SIT.x) / 2, (LIE.y + SIT.y) / 2 - .6, -48); P(sit1, SIT.x, SIT.y, SIT.r);
      T(sit0, 0); T(mid, 10); T(sit1, 3); H(sit0, 3); H(mid, 16); H(sit1, 2);
      const lieHands = (from: number, to: number) => {
        arm("f", from, to, 6, [pt(from, LIE.x - 16, LIE.y - 10.6)]); arm("b", from, to, 6, [pt(from, LIE.x - 22, LIE.y - 10)]);
      };
      const prop = (from: number, to: number) => {
        // Hands go to the mat beside the hips first, then take the weight behind as the trunk comes up.
        arm("f", from, to, 6, [pt(from, LIE.x - 20, -2.9 - g), pt(mid, SIT.x - 8, -2.9 - g), pt(to, SIT.x - 6, -2.9 - g)]);
        arm("b", from, to, 6, [pt(from, LIE.x - 23, -2.9 - g), pt(mid, SIT.x - 11, -2.9 - g), pt(to, SIT.x - 9, -2.9 - g)]);
      };
      // Legs: out straight (toes up) while lying and sitting.
      // (Getting up, the knees-up IK takes over at the very pose these leave, so there is no blend through the rest pose.)
      const legsOut = up ? n(100) + 1 : LATE;
      leg("f", start, legsOut, 0, [pt(start, ankleN[0], ankleN[1])], -90);
      leg("b", start, legsOut, 0, [pt(start, ankleF[0], ankleF[1]), pt(sit0, ankleF[0], ankleF[1]), pt(sit1, sitHeelF[0], sitHeelF[1])], -90);
      const edge = (from: number, to: number) => armFollow("f", from, to, 4, "blanket-edge", [0, -1]);
      if (!up) {
        lieHands(start, n(80));
        // A long stretch lying down: arms overhead along the ground, a yawn; then back to the chest.
        arm("f", n(76), n(122), 8, [pt(n(78), LIE.x - 26, LIE.y - 9), pt(n(92), LIE.x - 60, LIE.y - 7), pt(n(106), LIE.x - 61, LIE.y - 7.4), pt(n(118), LIE.x - 18, LIE.y - 10.6)]);
        arm("b", n(76), n(122), 8, [pt(n(78), LIE.x - 28, LIE.y - 8), pt(n(92), LIE.x - 58, LIE.y - 3), pt(n(106), LIE.x - 59, LIE.y - 3.4), pt(n(118), LIE.x - 22, LIE.y - 10)]);
        lieHands(n(118), n(126));
        // The blanket is pushed down to the lap, then the sit-up; seated, a hand rubs the eyes, then both rest on the lap.
        rig.track("blanket", [{ frame: start, scaleX: 1, scaleY: 1 }, { frame: n(126), scaleX: 1, scaleY: 1 }, { frame: n(144), scaleX: .72, scaleY: .8, ease: IO }]);
        edge(n(124), n(146));
        prop(n(144), sit1 + 2);
        arm("b", sit1, LATE, 8, [pt(sit1, SIT.x - 9, -2.9 - g), pt(sit1 + 12, 2, -17 - g)]);
        const r0 = n(186), r1 = n(208);
        armFollow("f", sit1, r0, 8, "pelvis", [10, -14]);
        rig.drivers.push({ type: "reach", start: r0 - 6, end: r1 + 6, ramp: 6, upper: "arm-f", lower: "fore-f", bend: -1, follow: "head", offset: [5.2 * u, -.4 * u],
          target: Array.from({ length: 7 }, (_, k) => pt(r0 + Math.round(k * (r1 - r0) / 6), k % 2 ? 1.2 : -.6, k % 2 ? .4 : -.2)) });
        armFollow("f", r1, LATE, 10, "pelvis", [14, -14]);
        H(r0, 8); H(r1, 2); H(n(218), -7); H(n(232), 4);
        variant("hand-f", [{ frame: r0 - 4, name: "fist" }, { frame: r1 + 4, name: null }]);
        rig.drivers.push({ type: "oscillate", start: sit1, end: LATE, ramp: 20, bone: "torso", property: "rotate", amplitude: 1.4, period: 90 });
      } else {
        lieHands(start, sit0 + 2);
        prop(sit0, sit1 + 2);
        // Blanket rides down to the lap as the body sits up, then is pushed off over the knees and slides away.
        const b0 = n(74), b1 = n(92), b2 = n(102);
        rig.track("blanket", [{ frame: start, scaleX: 1, scaleY: 1 }, { frame: sit0, scaleX: 1, scaleY: 1 }, { frame: sit1, scaleX: .72, scaleY: .8, ease: IO },
          { frame: b0, scaleX: .72, scaleY: .8 }, { frame: b1, scaleX: .44, scaleY: .66, ease: IO }, { frame: b2, scaleX: .12, scaleY: .34, ease: "ease-out-quad" }]);
        T(b0, 4); T(b1, 30); T(b2, 12); edge(b0 - 2, b1 + 2);
        arm("b", sit1, b2 + 8, 6, [pt(sit1, SIT.x - 9, -2.9 - g)]);
        // Knees up, feet flat on the mat close to the seat; weight forward over the feet with a hand on the mat; crouch
        // with the hands on the knees; stand; a standing stretch and yawn.
        const k1 = n(112), w0 = n(122), c0 = n(138), s0 = n(160), st0 = n(170), st1 = n(196);
        const FOOT_N = 2.4, FOOT_F = -1.2;
        // Taking over from the straight legs exactly where they lie (no blend through the hanging rest pose); the foot is
        // left as posed on the shin, so it turns from toes-up to flat as the shin comes upright.
        const kneesUp = (side: "f" | "b", from: number, heelAt: Pt, to: number, x: number) => rig.drivers.push({ type: "reach", start: from, end: LATE, ramp: 0,
          upper: "thigh-" + side, lower: "shin-" + side, bend: 1,
          target: [pt(from, heelAt[0], heelAt[1]), pt(Math.round((from + to) / 2), (heelAt[0] + x) / 2 + 4, (heelAt[1] - SOLE - g) / 2 - 3), pt(Math.max(to, from + 2), x, -SOLE - g)]
            .filter((k, i, all) => i === 0 || k.frame > all[i - 1].frame) });
        kneesUp("f", n(98), ankleN, k1, FOOT_N); kneesUp("b", n(100), sitHeelF, k1 + 2, FOOT_F);
        P(b2, SIT.x, SIT.y, SIT.r); P(k1, SIT.x + 1.6, SIT.y, 0); P(w0, -6.4, -13.4 - g, 0); P(c0, -.4, -25 - g, 0); P(s0, .2, -HIP - g, 0);
        T(k1, 14); T(w0, 40); T(c0, 46); T(s0, 0); H(k1, 6); H(w0, 14); H(c0, 18); H(s0, 0);
        arm("f", b1, c0 + 4, 8, [pt(b1, 6, -18 - g), pt(w0, -1, -2.9 - g), pt(c0 - 4, -1, -2.9 - g)]);
        armFollow("f", c0, s0 - 2, 6, "shin-f", [-1.6, 3]); armFollow("b", b2 + 4, s0 - 2, 8, "shin-b", [-1.6, 3]);
        for (const sd of ["f", "b"]) rig.track("arm-" + sd, [{ frame: st0, rotate: 0 }, { frame: st0 + 12, rotate: sd === "f" ? -160 : -150, ease: "ease-out-cubic" }, { frame: st1, rotate: sd === "f" ? -156 : -148 }, { frame: st1 + 12, rotate: 0 }]);
        T(st0, 0); T(st0 + 14, -6); T(st1, -4); T(st1 + 12, 0); H(st0, 0); H(st0 + 14, -14); H(st1, -10); H(st1 + 12, 0);
        variant("eye", [{ frame: st0 + 8, name: "shut" }, { frame: st1 - 4, name: null }]);
      }
    } else if (m === "sleep") {
      // Asleep from the first frame: breathing slow and deep, one stir and a settle half way.
      P(start, LIE.x, LIE.y, LIE.r); T(start, 0); H(start, 6);
      lyingFeet(start, LATE, 0, ankleN, ankleF);
      const s0 = t(.45), s1 = t(.6);
      H(s0, 6); H(s0 + 12, 16); H(s1, 15); H(s1 + 14, 7);
      arm("f", start, LATE, 0, [pt(start, LIE.x - 16, LIE.y - 10.6), pt(s0 + 4, LIE.x - 16, LIE.y - 10.6), pt(s0 + 16, LIE.x - 22, LIE.y - 11.6), pt(s1 + 10, LIE.x - 18, LIE.y - 10.8)]);
      arm("b", start, LATE, 0, [pt(start, LIE.x - 22, LIE.y - 10)]);
      rig.track("blanket", [{ frame: start, scaleX: 1 }]);
      variant("eye", [{ frame: start, name: "shut" }]);
      variant("mouth", [{ frame: start, name: "mid" }, { frame: s0, name: null }, { frame: s1 + 20, name: "mid" }]);
      rig.drivers.push({ type: "oscillate", bone: "torso", property: "scaleX", amplitude: .022, period: 84 });
    } else {
      // Standing → (yawn and stretch) → crouch with a hand back → sit → feet forward → lie back → (blanket, sleep).
      // Timings fit a 240-frame window; shorter windows scale them down.
      const sc = Math.min(1, D / 236), n = (v: number) => Math.max(1, Math.round(v * sc));
      const yawn = sleepy, y0 = start + n(10), y1 = yawn ? start + n(46) : y0, y2 = yawn ? y1 + n(10) : y1;
      const c0 = y2 + n(4), c1 = c0 + n(18), s1 = c1 + n(14), f1 = s1 + n(12), l0 = f1 + n(6), l1 = l0 + n(30);
      P(start, 0, -HIP, 0); P(c0, 0, -HIP, 0); P(c1, -1, -28, 0); P(s1, -9, -10.4 - g, 0, "ease-in-quad"); P(f1, -9.2, -10.4 - g, -6);
      P(l0, -9.2, -10.4 - g, -8); P(l1, LIE.x, LIE.y, LIE.r);
      T(start, 0); T(c0, 0); T(c1, 30); T(s1, 14); T(f1, 6); T(l0, 6); T(l1, 0);
      H(start, 0); H(c0, 0); H(c1, 14); H(s1, 4); H(l0, -4); H(l1 - 6, 2); H(l1, 4);
      if (yawn) {
        // Yawn and stretch: arms up overhead, back arched a little, head tipped back, mouth wide, eyes squeezed.
        for (const s of ["f", "b"]) rig.track("arm-" + s, [{ frame: y0, rotate: 0 }, { frame: y0 + n(12), rotate: s === "f" ? -162 : -152, ease: "ease-out-cubic" }, { frame: y1, rotate: s === "f" ? -158 : -150 }, { frame: y2, rotate: 0 }]);
        for (const s of ["f", "b"]) rig.track("fore-" + s, [{ frame: y0, rotate: 0 }, { frame: y0 + n(12), rotate: -18 }, { frame: y1, rotate: -12 }, { frame: y2, rotate: 0 }]);
        T(y0, 0); T(y0 + n(14), -7); T(y1, -5); T(y2, 0); H(y0, 0); H(y0 + n(14), -16); H(y1, -12); H(y2, 0);
        variant("mouth", [{ frame: y0 + n(6), name: "open" }, { frame: y1 - n(4), name: null }]);
        variant("eye", [{ frame: y0 + n(8), name: "shut" }, { frame: y1 - n(4), name: null }]);
      }
      // Feet: planted while crouching and sitting, then walked forward, then slid out long with the toes up.
      // (On the mat the floor is g higher.) Steps are [frame, x, lift].
      // They hold until the next reach is fully in (14 frames), or the leg would drop to its straight pose, through the floor.
      const steps = (side: "f" | "b", keys: Steps) => leg(side, start, f1 + 15, 0, keys.map(([frame, x, lift]) => pt(frame, x, -SOLE - g - (lift ?? 0))), 0);
      steps("f", [[start, 2.2], [s1, 2.2], [s1 + n(6), 9, 2.6], [f1, 15]]); steps("b", [[start, -1.4], [s1 + n(3), -1.4], [s1 + n(9), 6, 2.4], [f1 + n(2), 11]]);
      leg("f", f1, LATE, 14, [pt(f1, 15, -SOLE - g), pt(l1, ankleN[0], ankleN[1])], -90);
      leg("b", f1, LATE, 14, [pt(f1, 11, -SOLE - g), pt(l1, ankleF[0], ankleF[1])], -90);
      // The near hand reaches back to the ground to lower the body, supports while lying back, then rests.
      const restA: Pt = sleepy ? [LIE.x - 16, LIE.y - 10.6] : [LIE.x - 43, LIE.y + 1.4], restB: Pt = sleepy ? [LIE.x - 22, LIE.y - 10] : [LIE.x - 42, LIE.y + 2];
      arm("f", c0 + 4, sleepy ? LATE : l1 - 2, 8, [pt(c0 + 4, 6, -46), pt(c1, -10, -6 - g), pt(s1, -14, -2.9 - g), pt(l0, -15, -2.9 - g), pt(l1 - n(4), -26, -2 - g), pt(l1 + n(10), restA[0], restA[1])]);
      arm("b", l0, LATE, 10, [pt(l0, -4, -30), pt(l1 + n(14), restB[0], restB[1])], sleepy ? -1 : 1);
      // Hands behind the head: the elbows point up off the ground, not across the face.
      if (!sleepy) arm("f", l1 - n(6), LATE, 8, [pt(l1 - n(6), -26, -2), pt(l1 + n(10), restA[0], restA[1])], 1);
      if (sleepy) {
        // Draw the blanket up from the feet; eyes close; breathing slows and deepens; the head rolls a little.
        const b0 = l1 + n(10), b1 = b0 + n(22), e0 = b1 + n(10);
        rig.track("blanket", [{ frame: start, scaleX: .12, scaleY: .34 }, { frame: b0, scaleX: .12, scaleY: .34 }, { frame: b1, scaleX: 1, scaleY: 1, ease: IO }]);
        armFollow("f", b0 - 4, b1 + 6, 4, "blanket-edge", [0, -1]);
        variant("eye", [{ frame: e0, name: "shut" }]);
        variant("mouth", [{ frame: e0 + 30, name: "mid" }]);
        H(e0, 4); H(e0 + 30, 9);
        rig.drivers.push({ type: "oscillate", start: e0, end: LATE, ramp: 30, bone: "torso", property: "scaleX", amplitude: .022, period: 84 });
      } else {
        // Awake on the back, legs out straight, hands behind the head; the head settles.
        const k0 = Math.max(t(.72), l1 + 4);
        H(k0, 4); H(k0 + 20, 1);
      }
    }
  }

  if (m === "roll") {
    // A forward roll, a pause, then a backward roll back to the start: crouch with hands to the ground, tuck, roll
    // over the rounded back as a ball (no slip), come up through a squat and stand.
    // The tuck (from the somersault plates): pelvis tipped back 40°, trunk flexed 80° onto the thighs, chin tucked, knees
    // up, heels under the seat. Measured in the body frame (pelvis at the origin) its centroid is C, and the tucked body
    // rolls as a ball of radius R about it; the ankles sit on the ground at the start and end of each roll.
    const tuck = { pelvis: -40, thigh: -95, shin: 150, foot: -20, torso: 82, head: 40 }, C: Pt = [16.5, -12], R = 19, ANKLE: Pt = [11.5, 3.7], LEN = 26;
    const X0 = -64, rolls: { at: number; x0: number; dir: 1 | -1 }[] = [{ at: start + 12, x0: X0, dir: 1 }];
    rolls.push({ at: start + 12 + Math.round(D * .48), x0: X0 + 2 * Math.PI * R, dir: -1 });
    const thighs: RigKey[] = [], shins: RigKey[] = [], feet: RigKey[] = [];
    P(start, X0, -HIP, 0); T(start, 0); H(start, 0);
    let windowStart = start;
    // Whole turns so far: after a forward roll the pelvis stays at 360 degrees, or it would unwind the turn while standing up.
    let turned = 0;
    for (const [i, rl] of rolls.entries()) {
      const { at: a, x0, dir } = rl, crouch = a + 14, roll = crouch + 6, done = roll + LEN, up = done + 18;
      // Centre of the ball when the tucked ankles are on the planted feet (ankle at x0 + 2.2).
      const cx0 = x0 + 2.2 - (ANKLE[0] - C[0]), cx1 = cx0 + dir * 2 * Math.PI * R;
      const tuckAt = (frame: number, th: number, cx: number, ease: Ease) => {
        const off: Pt = [-C[0], -C[1]], cr = Math.cos(th / RD), sr = Math.sin(th / RD);
        P(frame, cx + off[0] * cr - off[1] * sr, -R + off[0] * sr + off[1] * cr, tuck.pelvis + th + turned, ease);
      };
      P(a, x0, -HIP, turned); P(crouch, x0 - 3, -26, -12 + turned); T(a, 0); T(crouch, dir > 0 ? 44 : 34); H(a, 0); H(crouch, dir > 0 ? 24 : 16);
      tuckAt(roll, 0, cx0, IO); T(roll, tuck.torso); H(roll, tuck.head);
      // Rolling over the rounded back without slipping: the centre advances by R × angle.
      for (let k = 1; k <= LEN; k++) {
        const e = k / LEN, s3 = e * e * (3 - 2 * e), th = dir * 360 * s3;
        tuckAt(roll + k, th, cx0 + dir * 2 * Math.PI * R * s3, "linear");
      }
      // Upside down the chin tucks hard so the back of the neck and shoulders take the roll, not the head.
      H(roll + Math.round(LEN * .3), 80); H(roll + Math.round(LEN * .7), 80);
      T(done, tuck.torso); H(done, tuck.head);
      const xEnd = cx1 + (ANKLE[0] - C[0]) - 2.2;
      turned += dir * 360;
      P(done + 6, xEnd - 3, -26, -12 + turned); P(up, xEnd, -HIP, turned); T(done + 6, dir > 0 ? 40 : 30); T(up, 0); H(done + 6, 18); H(up, 0);
      // Legs: planted by IK while standing and squatting; held in the tuck by keyed angles through the roll.
      thighs.push({ frame: crouch, rotate: 0 }, { frame: roll, rotate: tuck.thigh }, { frame: done, rotate: tuck.thigh }, { frame: done + 6, rotate: 0 });
      shins.push({ frame: crouch, rotate: 0 }, { frame: roll, rotate: tuck.shin }, { frame: done, rotate: tuck.shin }, { frame: done + 6, rotate: 0 });
      feet.push({ frame: crouch, rotate: 0 }, { frame: roll, rotate: tuck.foot }, { frame: done, rotate: tuck.foot }, { frame: done + 6, rotate: 0 });
      c.plant(windowStart, roll + 2, [[windowStart, x0 + 2.2]], [[windowStart, x0 - 1.4]], 4);
      if (i === rolls.length - 1) c.plant(done - 2, LATE, [[done, xEnd + 2.2]], [[done, xEnd - 1.4]], 4);
      windowStart = done - 2;
      // Hands: to the ground ahead (forward roll) or beside the hips (backward), then hugging the shins in the tuck.
      arm("f", a + 2, roll + 2, 4, [pt(a + 2, x0 + 6, -46), pt(crouch, x0 + (dir > 0 ? 17 : -9), -2.9)]);
      arm("b", a + 2, roll + 2, 4, [pt(a + 2, x0 + 1, -46), pt(crouch, x0 + (dir > 0 ? 14 : -11), -2.9)]);
      armFollow("f", roll - 2, done + 2, 3, "shin-f", [1, 4]); armFollow("b", roll - 2, done + 2, 3, "shin-b", [1, 4]);
    }
    for (const s of ["f", "b"]) { rig.track("thigh-" + s, thighs.map(k => ({ ...k }))); rig.track("shin-" + s, shins.map(k => ({ ...k }))); rig.track("foot-" + s, feet.map(k => ({ ...k }))); }
    variant("mouth", [{ frame: start, name: null }]);
  }

  if (m === "pick-up") {
    // A box on the ground in front: step in, stoop (knees deep, trunk ~55°), take it in both hands, stand with it held
    // close at the waist, look at it, set it back down, stand, step back.
    rig.bone("box", "root", 14, 0);
    rig.part("box", "box", rect(-5.5, -9, 11, 9, .5), "wood", 6.9, { color: "#c49a5e" });
    rig.part("box-lid", "box", rect(-5.6, -9.2, 11.2, 2, .4), "wood", 6.91, { color: "#d6ad70" });
    rig.part("box-tape", "box", rect(-1, -9.2, 2, 9.2, .2), "light", 6.92, { color: "#e8d8b4" });
    rig.part("box-edge", "box", path("M-5.2 -7H5.2"), "detail", 6.93, { line: true, lineWidth: .25, color: "#8a6a3e" });
    rig.bone("box-grip-f", "box", -3.8, -8.4); rig.bone("box-grip-b", "box", 1.6, -8.8);
    const st = start + 12, sp = st + 12, sd = sp + 24, g0 = sd + 6, l1 = g0 + 30, h1 = t(.62), d1 = h1 + 30, r1 = d1 + 6, u1 = r1 + 24, b1 = u1 + 12;
    c.plant(start, LATE, [[start, 2.2], [st, 2.2], [st + 6, 5, 2.6], [sp, 7.6], [u1, 7.6], [u1 + 6, 5, 2.2], [b1, 2.2]], [[start, -1.4]], 0);
    P(start, 0, -HIP, 0); P(sp, .6, -HIP, 0); P(sd, -2.6, -25, 0); P(g0, -2.6, -25.4, 0); P(l1, 0, -HIP, 0, "ease-in-out-quad");
    P(h1, 0, -HIP, 0); P(d1, -2.6, -25, 0, "ease-in-out-quad"); P(r1, -2.6, -25.4, 0); P(u1, .6, -HIP, 0); P(b1, 0, -HIP, 0);
    T(start, 0); T(sp, 2); T(sd, 56); T(g0, 57); T(l1, 4); T(h1, 4); T(d1, 56); T(r1, 57); T(u1, 2); T(b1, 0);
    H(start, 0); H(sp, 6); H(sd, 14); H(l1, 12); H(l1 + 20, 16); H(h1 - 20, 10); H(h1, 12); H(d1, 14); H(u1, 4); H(b1, 0);
    // The box rides in the hands along a path close to the body.
    const box = (frame: number, x: number, y: number, r = 0, ease: Ease = IO) => ({ frame, x: (x - 14) * u, y: y * u, rotate: r, ease });
    rig.track("box", [box(start, 14, 0), box(g0, 14, 0), box(g0 + 10, 15, -14, -3, "ease-in-quad"), box(g0 + 20, 15, -32, -2), box(l1, 13.4, -50.5, 0, "ease-out-quad"),
      box(l1 + 16, 13.6, -51.4, 4), box(l1 + 34, 13.6, -51.2, -3), box(h1, 13.4, -50.5, 0), box(h1 + 10, 15, -32, -2, "ease-in-quad"), box(h1 + 20, 15, -14, -3), box(d1, 14, 0, 0, "ease-out-quad")]);
    armFollow("f", sp + 6, r1 + 4, 10, "box-grip-f"); armFollow("b", sp + 8, r1 + 3, 10, "box-grip-b");
    variant("hand-f", [{ frame: sd - 4, name: "open" }, { frame: g0, name: "fist" }, { frame: r1, name: "open" }, { frame: r1 + 10, name: null }]);
    variant("hand-b", [{ frame: sd - 4, name: "open" }, { frame: g0, name: "fist" }, { frame: r1, name: "open" }, { frame: r1 + 10, name: null }]);
  }
  if (pelvis.length) rig.track("pelvis", pelvis);
  if (torso.length) rig.track("torso", torso);
  if (head.length) rig.track("head", head);
}

/** Lowest point of a part in scene y (sampled outline). */
function lowestOf(p: RigPartFrame): number {
  const y = (px: number, py: number) => p.matrix.b * px + p.matrix.d * py + p.matrix.f, s = p.shape;
  switch (s.type) {
    case "ellipse": return Math.max(...Array.from({ length: 24 }, (_, i) => y((s.cx ?? 0) + s.rx * Math.cos(i * Math.PI / 12), (s.cy ?? 0) + s.ry * Math.sin(i * Math.PI / 12))));
    case "rect": return Math.max(y(s.x, s.y), y(s.x + s.width, s.y), y(s.x, s.y + s.height), y(s.x + s.width, s.y + s.height));
    case "capsule": return Math.max(...[[0, s.w0 / 2], [s.length, s.w1 / 2]].flatMap(([cy, r]) => Array.from({ length: 16 }, (_, i) => y(r * Math.cos(i * Math.PI / 8), cy + r * Math.sin(i * Math.PI / 8)))));
    case "polygon": return Math.max(...s.points.map(([a, b]) => y(a, b)));
    case "path": return -Infinity;
  }
}

/**
 * A tucked body is not a ball: rolling about one centre, its head and seat would dig into the floor. Raise the pelvis on
 * its per-frame keys by as much as the lowest part would sink, smoothed so the body does not bump along.
 */
export function rollOnTheGround(spec: RigSpec): RigSpec {
  const keys = spec.tracks?.pelvis ?? [], ground = spec.root?.[0]?.y ?? 0;
  const dense = new Set(keys.filter((k, i) => i > 0 && k.frame - keys[i - 1].frame === 1 || i < keys.length - 1 && keys[i + 1].frame - k.frame === 1).map(k => k.frame));
  const depth = (f: number) => Math.max(0, ...evaluateRig(spec, f).parts.filter(p => !p.id.startsWith("hair-")).map(p => lowestOf(p) - ground));
  const sink = new Map([...dense].map(f => [f, depth(f)] as const));
  const near = (f: number, r: number) => Array.from({ length: 2 * r + 1 }, (_, i) => sink.get(f - r + i) ?? 0);
  const peak = new Map([...dense].map(f => [f, Math.max(...near(f, 1))] as const));
  const lift = (f: number) => { const w = [1, 2, 3, 2, 1]; let sum = 0; w.forEach((g, i) => { sum += g * (peak.get(f - 2 + i) ?? 0); }); return Math.max(sink.get(f) ?? 0, sum / 9); };
  return { ...spec, tracks: { ...spec.tracks, pelvis: keys.map(k => dense.has(k.frame) ? { ...k, y: (k.y ?? 0) - lift(k.frame) } : k) } };
}
