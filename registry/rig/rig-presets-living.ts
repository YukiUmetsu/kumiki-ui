/**
 * RIG1 living presets: a person, dog, horse, cat, songbird, dragon, koi and butterfly.
 *
 * Motion is built from reference, not from sine waves alone:
 *   - people walk heel-to-toe (feet roll up onto the planted toe; the body is lowest in double support), run with a
 *     flight phase, and sit, stand, jump, point, think, clap, bow, dance and take calls with IK-planted feet and hands;
 *   - four-legged animals use the footfall orders of real gaits (lateral walk, diagonal trot, three-beat canter,
 *     transverse gallop for horses and rotary gallop with a flexing spine for dogs and cats), with the body pitch,
 *     bob and head nod locked to the footfalls, knees forward and hocks back;
 *   - wings beat about the body's long axis and are drawn by side-view projection: spread on the downstroke, folded
 *     back with the tips tucked on the upstroke, never swinging forward like a paddle.
 * Designs are original (CC0 dedication).
 */
import type { RigDriver, RigLeg, RigRole, RigSpec } from "./rig-spec";
import { Rig, arc, at, cap, ell, finish, path, poly, rect, sampledPath, travel, tube } from "./rig-kit";
import type { Pt, RigPresetOptions } from "./rig-kit";

// ---- People ----------------------------------------------------------------------------------------------------------------------

const PERSON_PALETTE: Partial<Record<RigRole, string>> = {
  skin: "#d39b76", hair: "#2b211c", cloth: "#3b6fb6", "cloth-dark": "#2d3142", shoe: "#1f1b18", eye: "#1d1715", mouth: "#3b1714", detail: "#1d1715",
  accent: "#c8342b", wood: "#8a5a36", "metal-dark": "#24262b",
};
export const PERSON_MOTIONS = ["idle", "walk", "run", "wave", "talk", "cheer", "sit", "sit-down", "stand-up", "jump", "point", "think", "clap", "bow", "dance", "phone"] as const;
export const PERSON_PACE: Record<string, number> = { walk: 1.62, run: 4.6 };

/**
 * A person in three-quarter profile, height 100 design units (`u` = size / 100). The pelvis sits at (px, py) in
 * `parent`'s space; every limb is an IK-ready two-bone chain. Used by `personRig` and by riders (bicycle).
 */
export function addPersonBody(rig: Rig, parent: string, px: number, py: number, options: { phone?: boolean } = {}) {
  // Leg reach (21.5 + 21 + sole 2.4) just exceeds the hip height (44): a standing knee is soft, never locked.
  rig.bone("pelvis", parent, px, py);
  rig.bone("torso", "pelvis", 0, 0);
  for (const [side, x, far] of [["b", -1.4, true], ["f", 2.2, false]] as const) {
    rig.bone("thigh-" + side, "pelvis", x, 0, 0, 21.5);
    rig.bone("shin-" + side, "thigh-" + side, 0, 21.5, 0, 21);
    rig.bone("foot-" + side, "shin-" + side, 0, 21);
    const z = far ? 1 : 3;
    rig.part("thigh-" + side, "thigh-" + side, cap(21.5, 8, 6.6), "cloth-dark", z, { far });
    rig.part("knee-" + side, "shin-" + side, ell(0, 0, 3.4, 3.6), "cloth-dark", z + .02, { far });
    rig.part("shin-" + side, "shin-" + side, cap(21, 6.4, 5.4), "cloth-dark", z, { far });
    rig.part("shoe-" + side, "foot-" + side, poly([[-2.6, -1.4], [2.2, -1.8], [5.4, -.6], [7.2, 1.2], [7, 2.6], [-2.8, 2.6], [-3.2, .6]]), "shoe", z + .1, { far });
  }
  rig.part("torso", "torso", poly([[-6.8, -27.9], [7.6, -28.3], [10, -25.3], [9.6, -17], [8.7, -9], [8.5, 1.8], [7.3, 3], [-7.3, 3], [-8.5, 1.8], [-8.3, -9], [-9.4, -17], [-10.2, -25.3]]), "cloth", 4);
  rig.part("collar", "torso", poly([[-2.6, -26.6], [1.6, -22.4], [5, -26.8]]), "accent", 4.1);
  rig.part("belt", "torso", rect(-8.4, -.6, 16.8, 2.4, .8), "cloth-dark", 4.05);
  rig.bone("neck", "torso", 1.4, -29.5);
  rig.part("neck", "neck", rect(-2.1, -1, 4.4, 6.4, 1), "skin", 3.9);
  rig.bone("head", "neck", 1.4, -11.5);
  const head: Pt[] = [];
  for (let k = 0; k < 36; k++) {
    const a = k / 36 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), jaw = s > 0 ? 1 - .12 * s * s * (c < 0 ? 1 : .35) : 1;
    let x = c * 10.2 * jaw; const y = s * 11.2;
    if (c > .85 && s > -.1 && s < .35) x += 1.8 * (1 - Math.abs(s - .12) / .25) * Math.max(0, (c - .85) / .15);
    head.push([x, y]);
  }
  rig.part("head", "head", poly(head), "skin", 5);
  rig.part("ear", "head", ell(-1.6, .8, 1.6, 2.2), "skin", 5.1, { far: true });
  rig.part("hair", "head", poly([...arc(0, 0, 11.3, 12.3, 148, 332, 22), [6.3, -4], [2.8, -4.9], [-1, -3.4], [-4.6, -.2], [-6.7, 3.4]]), "hair", 5.3);
  rig.part("eye", "head", ell(5.3, -1.5, .95, 1.25), "eye", 5.4, { variants: { shut: ell(5.3, -1.1, 1.3, .28), up: ell(5.6, -2.5, .95, 1.15) } });
  rig.part("brow", "head", poly([[3.6, -4.6], [7.4, -4.9], [7.3, -4.1], [3.7, -3.9]]), "hair", 5.45);
  rig.part("mouth", "head", ell(7, 5.5, 1.2, .32), "mouth", 5.4, {
    variants: { open: ell(7, 5.7, 1.5, 1.6), mid: ell(7, 5.6, 1.4, .8), smile: path("M5.4 5.1Q7 7.1 8.6 5.1Q7 6.2 5.4 5.1Z") },
  });
  for (const [side, x, far] of [["b", -1, true], ["f", 2, false]] as const) {
    rig.bone("arm-" + side, "torso", x, -25, far ? -5 : 6, 14.5);
    rig.bone("fore-" + side, "arm-" + side, 0, 14.5, far ? 12 : 10, 13.5);
    rig.bone("hand-" + side, "fore-" + side, 0, 14.6);
    const z = far ? .5 : 7;
    rig.part("arm-" + side, "arm-" + side, cap(14.5, 6.6, 5.4), "cloth", z, { far });
    rig.part("elbow-" + side, "fore-" + side, ell(0, 0, 2.7, 2.8), "cloth", z + .02, { far });
    rig.part("fore-" + side, "fore-" + side, cap(13.5, 5.2, 4.4), "cloth", z, { far });
    rig.part("cuff-" + side, "fore-" + side, rect(-2.3, 11.6, 4.6, 1.8, .6), "skin", z + .03, { far });
    rig.part("hand-" + side, "hand-" + side, ell(0, 0, 3, 3.3), "skin", z + .1, {
      far, variants: { point: path("M-3 0A3 3.3 0 1 0 3 0A3 3.3 0 1 0 -3 0Z M-.9 1.2L.9 1.2L.8 8.6Q0 9.4 -.8 8.6Z"), open: path("M-3.2 -.4A3.2 3.4 0 1 0 3.2 -.4L2.6 5.6L1.4 6.8L.2 5.4L-1 6.8L-2.2 5.6L-3.2 4Z") },
    });
  }
  if (options.phone) {
    rig.bone("phone", "hand-f", -.4, 1.2, 0);
    rig.part("phone", "phone", rect(-1.7, -4.4, 3.4, 8, .9), "metal-dark", 7.05);
  }
}

const personLegs = (u: number): RigLeg[] => [
  { upper: "thigh-f", lower: "shin-f", foot: "foot-f", phase: 0, bend: 1, sole: 2.4 * u, toe: 6.4 * u },
  { upper: "thigh-b", lower: "shin-b", foot: "foot-b", phase: .5, bend: 1, sole: 2.4 * u, toe: 6.4 * u },
];

/** A wooden side chair; seat top at 21.5u, centre at `x`. */
function addChair(rig: Rig, x: number) {
  rig.bone("chair", "root", x, 0);
  rig.part("chair-leg-far", "chair", poly([[6.6, -21], [8.4, -21], [8.8, 0], [7.2, 0]]), "wood", .15, { far: true });
  rig.part("chair-back", "chair", poly([[-10.6, -21.5], [-8.4, -21.5], [-11.4, -48.5], [-13.6, -48.2]]), "wood", .2);
  rig.part("chair-rail", "chair", poly([[-14.4, -48.6], [-10.4, -49.2], [-10.1, -45.6], [-13.9, -45.2]]), "wood", .21);
  rig.part("chair-slat", "chair", poly([[-12.9, -43], [-10.6, -43.2], [-10.2, -33], [-12.2, -32.8]]), "wood", .19, { far: true });
  rig.part("chair-seat", "chair", rect(-11, -21.5, 21, 2.8, .9), "wood", 2);
  rig.part("chair-leg-back", "chair", poly([[-10.4, -19], [-8.4, -19], [-8.9, 0], [-10.9, 0]]), "wood", 2.1);
  rig.part("chair-leg-front", "chair", poly([[7.8, -19], [9.8, -19], [10.2, 0], [8.2, 0]]), "wood", 3.2);
  rig.part("chair-stretcher", "chair", rect(-9, -8, 18, 1.2, .5), "wood", 2.05);
}

/** A person: idle, walk, run, wave, talk, cheer, sit, sit-down, stand-up, jump, point, think, clap, bow, dance, phone. */
export function personRig(o: RigPresetOptions & { chair?: boolean } = {}): RigSpec {
  const u = (o.size ?? 360) / 100, rig = new Rig(u), m = o.motion ?? "walk", start = o.start ?? 0, end = o.end ?? 180, D = end - start, t = at(start, end);
  rig.bone("root", undefined, 0, 0);
  const seatedMotion = m === "sit" || m === "sit-down" || m === "stand-up";
  if (seatedMotion && o.chair !== false) addChair(rig, -13);
  addPersonBody(rig, "root", 0, -44, { phone: m === "phone" });
  rig.drivers.push(
    { type: "oscillate", bone: "torso", property: "scaleY", amplitude: .008, period: 76 },
    { type: "oscillate", bone: "head", property: "rotate", amplitude: 1.6, period: 140, wobble: .5 },
    { type: "variant", part: "eye", name: "shut", mode: "blink", interval: [64, 130], duration: 4 },
  );
  const legs = personLegs(u), moving = m === "walk" || m === "run", run = m === "run";
  const sole = 2.4 * u;
  if (moving) {
    rig.drivers.push({ type: "gait", start, end, body: "pelvis", stride: (run ? 96 : 52) * u, stance: run ? .36 : .62, lift: (run ? 14 : 5) * u,
      bob: (run ? 4 : 3) * u, bobPhase: run ? .43 : .31, sink: (run ? 2.5 : 0) * u, legs,
      swing: [{ bone: "arm-f", amplitude: run ? 38 : 22, phase: 0 }, { bone: "arm-b", amplitude: run ? 38 : 22, phase: .5 },
        { bone: "fore-f", amplitude: run ? 12 : 9, phase: .95 }, { bone: "fore-b", amplitude: run ? 12 : 9, phase: .45 },
        { bone: "head", amplitude: 1.4, phase: .25, harmonic: 2 }, { bone: "torso", amplitude: run ? 1.6 : .8, phase: .31, harmonic: 2 }] });
    if (run) { rig.track("torso", [{ frame: start, rotate: 9 }]); rig.track("fore-f", [{ frame: start, rotate: -80 }]); rig.track("fore-b", [{ frame: start, rotate: -84 }]); rig.track("head", [{ frame: start, rotate: -6 }]); }
    else rig.track("torso", [{ frame: start, rotate: 3 }]);
  } else if (m !== "jump") rig.drivers.push({ type: "gait", body: "pelvis", stride: 52 * u, legs });

  /** Plant both feet with IK at root-space spots (x keyed in u) over a window. */
  /** Plant both feet with IK at root-space spots over a window; keys are [frame, x (u), lift (u)] so a foot that moves
   * steps (lifts and sets down) instead of sliding. */
  const plant = (from: number, to: number, keysF: [number, number, number?][], keysB: [number, number, number?][], ramp = 6) => {
    for (const [side, keys] of [["f", keysF], ["b", keysB]] as const)
      rig.drivers.push({ type: "reach", start: from, end: to, ramp, upper: "thigh-" + side, lower: "shin-" + side, tip: "foot-" + side, tipAngle: 0, bend: 1,
        target: keys.map(([frame, x, lift]) => ({ frame, x: x * u, y: -sole - (lift ?? 0) * u, ease: "ease-in-out-cubic" as const })) });
  };
  /** A step from x0 to x1 between frames a and b (lifting mid-way). */
  const step = (a: number, b: number, x0: number, x1: number, lift = 3): [number, number, number?][] =>
    [[a, x0], [Math.round((a + b) / 2), (x0 + x1) / 2, lift], [b, x1]];
  const STAND_F = 2.2, STAND_B = -1.4;
  /** A hand reaching for a bone's joint plus an offset (u). */
  const hand = (side: "f" | "b", from: number, to: number, follow: string, ox: number, oy: number, ramp = 10) =>
    rig.drivers.push({ type: "reach", start: from, end: to, ramp, upper: "arm-" + side, lower: "fore-" + side, bend: -1, follow, offset: [ox * u, oy * u] });
  const SEAT_X = -11, SEAT_Y = -24.5;

  if (m === "wave") {
    rig.track("arm-f", [{ frame: start, rotate: 0 }, { frame: start + 10, rotate: -152, ease: "ease-out-back" }, { frame: end - 10, rotate: -152 }, { frame: end, rotate: 0 }]);
    rig.drivers.push({ type: "oscillate", start: start + 10, end: end - 10, bone: "fore-f", property: "rotate", amplitude: 26, period: 14, ramp: 5 },
      { type: "variant", part: "hand-f", mode: "keys", keys: [{ frame: start + 8, name: "open" }, { frame: end - 8, name: null }] });
    rig.track("head", [{ frame: start, rotate: 0 }, { frame: start + 12, rotate: -5 }]);
  }
  if (m === "talk" || m === "wave" || m === "phone") rig.drivers.push({ type: "variant", start, end, part: "mouth", mode: "talk", open: "open", mid: "mid" });
  if (m === "talk") rig.drivers.push({ type: "oscillate", start, end, bone: "fore-f", property: "rotate", amplitude: 18, period: 44, wobble: .6, ramp: 10 },
    { type: "oscillate", start, end, bone: "arm-f", property: "rotate", amplitude: 9, period: 60, wobble: .4, ramp: 10 });
  if (m === "cheer") {
    for (const s of ["f", "b"]) rig.track("arm-" + s, [{ frame: start, rotate: 0 }, { frame: start + 8, rotate: s === "f" ? -168 : -160, ease: "ease-out-back" }]);
    rig.track("pelvis", [{ frame: start, y: 0 }, { frame: start + 8, y: 2.4 * u }]);
    rig.drivers.push({ type: "oscillate", start: start + 8, end, bone: "pelvis", property: "y", amplitude: 2.2 * u, period: 16 },
      { type: "oscillate", start: start + 8, end, bone: "fore-f", property: "rotate", amplitude: 12, period: 16, phase: .2 },
      { type: "variant", part: "hand-f", mode: "keys", keys: [{ frame: start + 6, name: "open" }] },
      { type: "variant", start, end, part: "mouth", mode: "talk", open: "open", mid: "smile" });
  }
  if (m === "sit") {
    rig.track("pelvis", [{ frame: start, x: SEAT_X * u, y: (SEAT_Y + 44) * u }]);
    rig.track("torso", [{ frame: start, rotate: -3 }]);
    plant(start, end, [[start, 9]], [[start, 5]], 0);
    // Hands rest on the knees, one lifts to gesture while talking, then settles back.
    hand("b", start, end, "shin-b", -5, -4, 0);
    hand("f", start, t(.32), "shin-f", -5.5, -4.4, 0); hand("f", t(.66), end, "shin-f", -5.5, -4.4, 12);
    rig.track("arm-f", [{ frame: t(.3), rotate: 6 }, { frame: t(.4), rotate: -38, ease: "ease-out-back" }, { frame: t(.62), rotate: -30 }]);
    rig.track("fore-f", [{ frame: t(.3), rotate: 10 }, { frame: t(.4), rotate: -74, ease: "ease-out-cubic" }]);
    rig.drivers.push({ type: "oscillate", start: t(.4), end: t(.64), bone: "fore-f", property: "rotate", amplitude: 12, period: 26, wobble: .6, ramp: 6 },
      { type: "variant", start: t(.3), end: t(.66), part: "mouth", mode: "talk", open: "open", mid: "mid" },
      { type: "variant", part: "hand-f", mode: "keys", keys: [{ frame: t(.38), name: "open" }, { frame: t(.64), name: null }] });
    rig.track("head", [{ frame: start, rotate: 0 }, { frame: t(.15), rotate: -4 }, { frame: t(.28), rotate: 3 }, { frame: t(.45), rotate: -2 }, { frame: t(.8), rotate: 4 }, { frame: end, rotate: 0 }]);
  }
  if (m === "sit-down" || m === "stand-up") {
    // Hip hinge: lean the chest forward over the feet, send the hips back and down onto the seat, settle upright.
    const down = m === "sit-down", a = down ? t(.12) : t(.18), L = Math.round(D * .62), k = (f: number) => Math.round(a + L * (down ? f : 1 - f));
    const P = (f: number, x: number, y: number) => ({ frame: k(f), x: x * u, y: (y + 44) * u });
    const keys = [P(0, 0, -44), P(.22, -1, -42.6), P(.46, -6.5, -31.5), P(.6, -10.6, -24.9), P(.72, -11, -24.4), P(.86, SEAT_X, SEAT_Y)];
    rig.track("pelvis", (down ? keys : [...keys].reverse()).map((q, i) => ({ ...q, ease: i ? "ease-in-out-cubic" as const : undefined })));
    const T = (f: number, rotate: number) => ({ frame: k(f), rotate });
    const lean = [T(0, 0), T(.2, 7), T(.44, 32), T(.6, 16), T(.8, -3), T(1, -3)];
    rig.track("torso", down ? lean : [...lean].reverse());
    const look = [T(0, 0), T(.44, -18), T(.62, -7), T(.86, 1), T(1, 0)];
    rig.track("head", down ? look : [...look].reverse());
    const swingArm = [T(0, 0), T(.3, -14), T(.48, -34), T(.66, -16), T(.8, 0)];
    rig.track("arm-f", down ? swingArm : [...swingArm].reverse());
    rig.track("arm-b", (down ? swingArm : [...swingArm].reverse()).map(q => ({ ...q, rotate: q.rotate * .8 })));
    // Feet stay planted throughout; once seated the front foot slides a little forward to sit comfortably.
    // Seated, the feet step forward to sit comfortably; before standing they step back under the hips.
    const feetF: [number, number, number?][] = down ? [[start, STAND_F], ...step(k(.8), k(1), STAND_F, 9, 2.6)] : [[start, 9], ...step(k(1), k(.82), 9, STAND_F, 2.6)];
    const feetB: [number, number, number?][] = down ? [[start, STAND_B], ...step(k(.86), k(1) + 6, STAND_B, 5, 2.2)] : [[start, 5], ...step(k(1) - 6, k(.86), 5, STAND_B, 2.2)];
    plant(start, end, feetF, feetB, 0);
    const kneeFrom = down ? k(.8) : start, kneeTo = down ? end : k(.78);
    hand("f", kneeFrom, kneeTo, "shin-f", -5.5, -4.4, down ? 12 : 0); hand("b", kneeFrom, kneeTo, "shin-b", -5, -4, down ? 12 : 0);
  }
  if (m === "jump") {
    // Anticipation crouch, arms swing up through take-off, knees tuck at the apex, land and absorb, recover.
    const reps = Math.max(1, Math.floor(D / 64));
    const pel: { frame: number; y: number; x?: number; ease?: "ease-out-quad" | "ease-in-quad" | "ease-in-out-cubic" | "ease-out-back" }[] = [];
    const arms: { frame: number; rotate: number; ease?: "ease-out-back" | "ease-in-out-cubic" }[] = [], torso: typeof arms = [], thigh: typeof arms = [], shin: typeof arms = [], head: typeof arms = [];
    for (let r = 0; r < reps; r++) {
      const b = start + r * 64, F = (n: number) => b + n;
      pel.push({ frame: F(0), y: 0 }, { frame: F(11), y: 10 * u, ease: "ease-in-out-cubic" }, { frame: F(15), y: 10.6 * u }, { frame: F(21), y: -2.2 * u, ease: "ease-out-quad" },
        { frame: F(31), y: -26 * u, ease: "ease-out-quad" }, { frame: F(41), y: -2.2 * u, ease: "ease-in-quad" }, { frame: F(47), y: 9 * u, ease: "ease-out-quad" }, { frame: F(60), y: 0, ease: "ease-in-out-cubic" });
      arms.push({ frame: F(0), rotate: 0 }, { frame: F(12), rotate: 48 }, { frame: F(23), rotate: -166, ease: "ease-out-back" }, { frame: F(33), rotate: -150 }, { frame: F(43), rotate: -36 }, { frame: F(50), rotate: 16 }, { frame: F(60), rotate: 0 });
      torso.push({ frame: F(0), rotate: 0 }, { frame: F(12), rotate: 22 }, { frame: F(22), rotate: -2 }, { frame: F(33), rotate: 4 }, { frame: F(47), rotate: 20 }, { frame: F(60), rotate: 0 });
      head.push({ frame: F(0), rotate: 0 }, { frame: F(12), rotate: -14 }, { frame: F(23), rotate: -4 }, { frame: F(47), rotate: -12 }, { frame: F(60), rotate: 0 });
      thigh.push({ frame: F(20), rotate: 0 }, { frame: F(31), rotate: -62 }, { frame: F(40), rotate: -10 });
      shin.push({ frame: F(20), rotate: 4 }, { frame: F(31), rotate: 84 }, { frame: F(40), rotate: 10 });
      plant(F(-2), F(21), [[F(0), STAND_F]], [[F(0), STAND_B]], 3);
      plant(F(39), F(66), [[F(39), STAND_F]], [[F(39), STAND_B]], 3);
    }
    rig.track("pelvis", pel); rig.track("arm-f", arms); rig.track("arm-b", arms.map(q => ({ ...q, rotate: q.rotate * .92 }))); rig.track("torso", torso); rig.track("head", head);
    for (const s of ["f", "b"]) { rig.track("thigh-" + s, thigh.map(q => ({ ...q, rotate: q.rotate * (s === "f" ? 1 : .8) }))); rig.track("shin-" + s, shin); }
    rig.drivers.push({ type: "variant", part: "mouth", mode: "keys", keys: Array.from({ length: reps }, (_, r) => [{ frame: start + r * 64 + 20, name: "open" }, { frame: start + r * 64 + 46, name: null }]).flat() });
  }
  if (m === "point") {
    rig.track("arm-f", [{ frame: start, rotate: 0 }, { frame: t(.08), rotate: 6 }, { frame: t(.16), rotate: -88, ease: "ease-out-back" }, { frame: t(.8), rotate: -84 }, { frame: t(.92), rotate: 0 }]);
    rig.track("fore-f", [{ frame: t(.08), rotate: 10 }, { frame: t(.16), rotate: -4, ease: "ease-out-cubic" }, { frame: t(.8), rotate: -4 }, { frame: t(.92), rotate: 10 }]);
    rig.track("torso", [{ frame: start, rotate: 0 }, { frame: t(.16), rotate: 4 }, { frame: t(.8), rotate: 3 }, { frame: t(.92), rotate: 0 }]);
    rig.track("head", [{ frame: start, rotate: 0 }, { frame: t(.16), rotate: -4 }, { frame: t(.5), rotate: -2 }, { frame: t(.92), rotate: 0 }]);
    rig.drivers.push({ type: "variant", part: "hand-f", mode: "keys", keys: [{ frame: t(.12), name: "point" }, { frame: t(.86), name: null }] },
      { type: "oscillate", start: t(.18), end: t(.8), bone: "fore-f", property: "rotate", amplitude: 2.5, period: 30, ramp: 8 },
      { type: "variant", start: t(.2), end: t(.7), part: "mouth", mode: "talk", open: "open", mid: "mid" });
    hand("b", t(.06), t(.9), "pelvis", -7.5, -3, 8);
  }
  if (m === "think") {
    hand("f", t(.08), t(.88), "head", 6.8, 10, 12);
    hand("b", t(.12), t(.86), "fore-f", 2, 2.5, 12);
    rig.track("head", [{ frame: start, rotate: 0 }, { frame: t(.2), rotate: -7 }, { frame: t(.5), rotate: -9 }, { frame: t(.75), rotate: -5 }, { frame: t(.9), rotate: 0 }]);
    rig.track("torso", [{ frame: start, rotate: 0 }, { frame: t(.2), rotate: -2 }, { frame: t(.9), rotate: 0 }]);
    rig.drivers.push({ type: "variant", part: "eye", mode: "keys", keys: [{ frame: t(.22), name: "up" }, { frame: t(.8), name: null }] },
      { type: "oscillate", start: t(.25), end: t(.8), bone: "head", property: "rotate", amplitude: 2, period: 40, ramp: 10 },
      { type: "variant", part: "mouth", mode: "keys", keys: [{ frame: t(.82), name: "smile" }] });
  }
  if (m === "clap") {
    const tf: { frame: number; x: number; y: number; ease?: "ease-in-quad" | "ease-out-quad" }[] = [], tb: typeof tf = [];
    const s0 = t(.1), s1 = t(.85);
    tf.push({ frame: start, x: 6 * u, y: -46 * u }, { frame: s0, x: 13 * u, y: -57 * u });
    tb.push({ frame: start, x: 1 * u, y: -46 * u }, { frame: s0, x: 21 * u, y: -59 * u });
    for (let f = s0 + 5; f <= s1; f += 10) {
      tf.push({ frame: f, x: 17.6 * u, y: -57.6 * u, ease: "ease-in-quad" }, { frame: f + 5, x: 13 * u, y: -57 * u, ease: "ease-out-quad" });
      tb.push({ frame: f, x: 18.6 * u, y: -58.6 * u, ease: "ease-in-quad" }, { frame: f + 5, x: 21.5 * u, y: -59 * u, ease: "ease-out-quad" });
    }
    const last = tf[tf.length - 1].frame;
    tf.push({ frame: last + 12, x: 6 * u, y: -46 * u }); tb.push({ frame: last + 12, x: 1 * u, y: -46 * u });
    rig.drivers.push({ type: "reach", start, end: last + 12, upper: "arm-f", lower: "fore-f", bend: -1, target: tf, ramp: 6 },
      { type: "reach", start, end: last + 12, upper: "arm-b", lower: "fore-b", bend: -1, target: tb, ramp: 6 },
      { type: "variant", part: "hand-f", mode: "keys", keys: [{ frame: s0 - 2, name: "open" }, { frame: last + 6, name: null }] },
      { type: "variant", part: "mouth", mode: "keys", keys: [{ frame: s0, name: "smile" }] },
      { type: "oscillate", start: s0, end: last, bone: "pelvis", property: "y", amplitude: .8 * u, period: 10, ramp: 6 });
    rig.track("head", [{ frame: start, rotate: 0 }, { frame: s0, rotate: -3 }, { frame: last, rotate: -2 }, { frame: last + 12, rotate: 0 }]);
  }
  if (m === "bow") {
    const B = (f: number, v: number) => ({ frame: t(f), rotate: v, ease: "ease-in-out-cubic" as const });
    rig.track("torso", [B(0, 0), B(.12, 0), B(.4, 46), B(.62, 46), B(.84, 0)]);
    rig.track("arm-f", [B(0, 0), B(.12, 0), B(.4, -40), B(.62, -40), B(.84, 0)]);
    rig.track("arm-b", [B(0, 0), B(.12, 0), B(.4, -38), B(.62, -38), B(.84, 0)]);
    rig.track("head", [B(0, 0), B(.12, -2), B(.4, 4), B(.62, 4), B(.84, 0)]);
    rig.track("pelvis", [{ frame: t(.12), x: 0 }, { frame: t(.4), x: -3.4 * u, ease: "ease-in-out-cubic" }, { frame: t(.62), x: -3.4 * u }, { frame: t(.84), x: 0, ease: "ease-in-out-cubic" }]);
    rig.drivers.push({ type: "variant", part: "eye", mode: "keys", keys: [{ frame: t(.34), name: "shut" }, { frame: t(.66), name: null }] },
      { type: "variant", part: "mouth", mode: "keys", keys: [{ frame: t(.84), name: "smile" }] });
  }
  if (m === "dance") {
    // 120 bpm on 30 fps: a beat every 15 frames. Knees bounce on the beat, arms pump, hips sway every two beats.
    const beat = 15, pel: { frame: number; y: number; x?: number; ease?: "ease-out-quad" | "ease-in-quad" }[] = [];
    const af: { frame: number; rotate: number }[] = [], ab: typeof af = [], ff: typeof af = [], fb: typeof af = [], tor: typeof af = [], hd: typeof af = [];
    for (let k = 0, f = start; f <= end; k++, f += beat) {
      pel.push({ frame: f, y: 2.8 * u, x: (k % 2 ? -1.6 : 1.6) * u, ease: "ease-in-quad" }, { frame: f + 7, y: .2 * u, x: (k % 2 ? -1.6 : 1.6) * u, ease: "ease-out-quad" });
      af.push({ frame: f, rotate: k % 2 ? -24 : -118 }); ab.push({ frame: f, rotate: k % 2 ? -112 : -20 });
      ff.push({ frame: f, rotate: k % 2 ? -78 : -40 }); fb.push({ frame: f, rotate: k % 2 ? -36 : -80 });
      tor.push({ frame: f, rotate: k % 2 ? -5 : 5 }); hd.push({ frame: f + 2, rotate: k % 2 ? 5 : -4 });
    }
    rig.track("pelvis", pel); rig.track("arm-f", af); rig.track("arm-b", ab); rig.track("fore-f", ff); rig.track("fore-b", fb); rig.track("torso", tor); rig.track("head", hd);
    rig.drivers.push({ type: "variant", part: "mouth", mode: "keys", keys: [{ frame: start, name: "smile" }] },
      { type: "variant", part: "hand-f", mode: "keys", keys: [{ frame: start, name: "open" }] });
  }
  if (m === "phone") {
    hand("f", t(.06), end, "head", -1.2, 1.4, 12);
    rig.track("phone", [{ frame: start, opacity: 0 }, { frame: t(.05), opacity: 0 }, { frame: t(.06), opacity: 1 }]);
    rig.track("head", [{ frame: start, rotate: 0 }, { frame: t(.12), rotate: 5 }]);
    rig.track("pelvis", [{ frame: start, x: 0 }, { frame: t(.2), x: 1.2 * u }]);
    rig.track("arm-b", [{ frame: start, rotate: 0 }, { frame: t(.3), rotate: -26 }, { frame: t(.5), rotate: -6 }, { frame: t(.7), rotate: -30 }, { frame: t(.9), rotate: -8 }]);
    rig.track("fore-b", [{ frame: start, rotate: 0 }, { frame: t(.3), rotate: -64 }, { frame: t(.5), rotate: -20 }, { frame: t(.7), rotate: -70 }, { frame: t(.9), rotate: -24 }]);
    rig.drivers.push({ type: "oscillate", start: t(.1), end, bone: "pelvis", property: "x", amplitude: .9 * u, period: 96, wobble: .4, ramp: 20 });
  }
  return finish("person", "biped", rig, travel(o, start, end, moving ? "linear" : undefined), PERSON_PALETTE, { x: -16 * u, y: -100 * u, width: 32 * u, height: 102 * u }, o);
}

// ---- Four-legged animals ---------------------------------------------------------------------------------------------------------

export type QuadKind = "dog" | "horse" | "cat";
export const QUADRUPED_MOTIONS = ["idle", "walk", "trot", "canter", "gallop", "sit"] as const;
interface QuadDef { palette: Partial<Record<RigRole, string>>; H: number; neck: number; neckAngle: number; legW: number; tail: number; tailAngle: number; head: number;
  /** Pastern length and its standing angle above the ground (degrees). */ pastern: number; pasternAngle: number; flex: number; curlFore: number; curlHind: number }
const QUAD: Record<QuadKind, QuadDef> = {
  dog: { palette: { fur: "#b5793f", "fur-dark": "#7d4f27", belly: "#e9c99a", eye: "#1d1715", detail: "#2b1d14", mouth: "#3b1714", horn: "#2b1d14" }, H: 40, neck: 13, neckAngle: -132, legW: 7.5, tail: 7, tailAngle: 140, head: 1, pastern: 5, pasternAngle: 68, flex: 9, curlFore: 50, curlHind: 30 },
  horse: { palette: { fur: "#7a4a2c", "fur-dark": "#4f2e1a", belly: "#8d5a38", hair: "#24170f", eye: "#1d1715", detail: "#24170f", horn: "#3a3a3a", mouth: "#24170f" }, H: 55, neck: 30, neckAngle: -132, legW: 7, tail: 9, tailAngle: 48, head: 1.25, pastern: 7.5, pasternAngle: 56, flex: 2.5, curlFore: 80, curlHind: 46 },
  cat: { palette: { fur: "#8b8f97", "fur-dark": "#5e626a", belly: "#d9dade", eye: "#c9a227", detail: "#2a2b2e", mouth: "#4a2a2a", horn: "#2a2b2e" }, H: 31, neck: 9, neckAngle: -122, legW: 5.6, tail: 9, tailAngle: 120, head: .9, pastern: 4, pasternAngle: 70, flex: 12, curlFore: 40, curlHind: 26 },
};
/**
 * Gait table. Phases are listed hind-far, fore-far, hind-near, fore-near; a leg lands when (cycle + phase) wraps to 0,
 * so phase = 1 − landing time. Stride is in fore-leg lengths, cycle in frames at 30 fps.
 */
interface GaitDef { phases: readonly number[]; stance: number; stride: number; lift: number; bob: number; bobPhase: number; bobH: 1 | 2; pitch: number; pitchPhase: number; sink: number; neck: number; neckH: 1 | 2; neckPhase: number; flex: number; flexPhase: number }
// Walk, trot and canter let the shoulder blade and pelvis follow the legs further (more reach); the gallop keeps the
// hips steadier so the planted legs visibly sweep from forward-sloping to back-sloping.
const GAITS: Record<string, GaitDef> = {
  // Lateral-sequence walk: LH, LF, RH, RF a quarter apart; the head nods twice per stride.
  walk: { phases: [0, .75, .5, .25], stance: .64, stride: 1.02, lift: .13, bob: .6, bobPhase: .2, bobH: 2, pitch: 0, pitchPhase: 0, sink: .6, neck: 3, neckH: 2, neckPhase: .15, flex: .25, flexPhase: .2 },
  // Trot: diagonal pairs with a short suspension between them; the body is highest in the suspension.
  trot: { phases: [0, .5, .5, 0], stance: .4, stride: 1.95, lift: .22, bob: 1.8, bobPhase: .45, bobH: 2, pitch: .8, pitchPhase: .2, sink: 1.2, neck: 2, neckH: 2, neckPhase: .3, flex: .3, flexPhase: .2 },
  // Canter: three beats (outside hind, diagonal pair, leading fore) and a suspension; the body rocks once per stride.
  canter: { phases: [0, .7, .7, .5], stance: .42, stride: 2.2, lift: .26, bob: 2.4, bobPhase: .96, bobH: 1, pitch: 3.4, pitchPhase: .7, sink: 1.5, neck: 5, neckH: 1, neckPhase: .3, flex: .6, flexPhase: .1 },
  // Transverse gallop, timed from Muybridge's 15-frame stride: hinds land at 0 and .1, fores at .27 and .4, each foot
  // down for ~30%, then ~30% gathered suspension with the legs folded under the body.
  gallop: { phases: [0, .73, .9, .6], stance: .3, stride: 3.2, lift: .38, bob: 1.8, bobPhase: .86, bobH: 1, pitch: 4, pitchPhase: .55, sink: 1.6, neck: 7, neckH: 1, neckPhase: .43, flex: 1, flexPhase: .1 },
  // Rotary gallop (dogs, cats): LH, RH, RF, LF; extended and gathered suspensions, the spine flexing between them.
  rotary: { phases: [0, .46, .92, .56], stance: .27, stride: 3.1, lift: .3, bob: 2.5, bobPhase: .9, bobH: 1, pitch: 3, pitchPhase: .55, sink: 1.4, neck: 3, neckH: 1, neckPhase: .45, flex: 1, flexPhase: .1 },
};
const CYCLE: Record<QuadKind, Record<string, number>> = {
  dog: { walk: 26, trot: 16, canter: 14, gallop: 11 }, horse: { walk: 34, trot: 22, canter: 19, gallop: 15 }, cat: { walk: 28, trot: 16, canter: 13, gallop: 10 },
};
const quadGait = (kind: QuadKind, m: string) => GAITS[m === "gallop" && kind !== "horse" ? "rotary" : m] ?? GAITS.walk;
/** Leg above the pastern (elbow or stifle to fetlock) that stands straight with the pastern at its standing angle. */
function legLength(kind: QuadKind, hipHeight: number, straight: number) {
  const q = QUAD[kind], a = q.pasternAngle * Math.PI / 180;
  return Math.hypot(Math.cos(a) * q.pastern, hipHeight - Math.sin(a) * q.pastern) / straight;
}
const FORE_STRAIGHT = .985, HIND_STRAIGHT = .965;
const foreLength = (kind: QuadKind) => legLength(kind, QUAD[kind].H - 5, FORE_STRAIGHT);
/** Natural travel speed in px per frame for an animal of length `size`. */
export function quadPace(kind: QuadKind, motion: string, size: number) {
  if (!CYCLE[kind][motion]) return 0;
  return quadGait(kind, motion).stride * foreLength(kind) * size / 100 / CYCLE[kind][motion];
}

/** Dog, horse or cat: body length = `size`. Walk, trot, canter, gallop and sit, with real footfall orders. */
export function quadrupedRig(kind: QuadKind, o: RigPresetOptions = {}): RigSpec {
  const q = QUAD[kind], u = (o.size ?? (kind === "horse" ? 460 : kind === "cat" ? 260 : 320)) / 100, rig = new Rig(u);
  const m = o.motion ?? "walk", start = o.start ?? 0, end = o.end ?? 180, H = q.H, t = at(start, end), horse = kind === "horse";
  const pa = q.pasternAngle * Math.PI / 180, fetlockY = Math.sin(pa) * q.pastern, fetlockBack = Math.cos(pa) * q.pastern;
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, -H);
  // The pelvis end of the spine: hind legs and tail hang from it, so the back can flex in a rotary gallop or a sit.
  rig.bone("haunch", "body", -8, 0);
  const barrel: Pt[] = kind === "cat"
    ? [[-36, -4], [-30, -11], [-10, -13], [16, -12], [32, -9], [38, -2], [34, 8], [12, 11], [-14, 11], [-32, 7]]
    : [[-40, -3], [-34, -12], [-12, -14], [14, -14], [34, -12], [44, -4], [40, 10], [16, 14], [-14, 13], [-36, 8]];
  rig.bone("chest", "body", 0, 0);
  rig.part("barrel", "chest", poly(barrel), "fur", 4);
  rig.part("belly", "chest", poly(kind === "cat" ? [[-24, 6], [14, 6], [26, 3], [12, 11], [-14, 11]] : [[-26, 6], [16, 7], [34, 5], [16, 14], [-14, 13]]), "belly", 4.1);
  // Rump on the haunch bone (coordinates relative to it).
  rig.part("rump", "haunch", poly(kind === "cat" ? [[4, -12], [-12, -13], [-24, -10], [-30, -2], [-29, 7], [-20, 11], [-6, 10], [6, 4]]
    : [[6, -13.6], [-10, -15.4], [-24, -13.6], [-32, -6], [-33.6, 4], [-28.4, 12.4], [-16, 14.2], [-2, 12], [8, 4]]), "fur", 4.05);
  if (horse) rig.part("shoulder", "body", poly([[22, -12], [34, -12], [41, -2], [38, 10], [28, 12], [22, 0]]), "fur", 4.06);
  const legs: RigLeg[] = [];
  const legDefs = [
    { id: "hind-far", x: -30, front: false, far: true }, { id: "fore-far", x: 30, front: true, far: true },
    { id: "hind-near", x: -32, front: false, far: false }, { id: "fore-near", x: 32, front: true, far: false },
  ];
  const Tf = foreLength(kind), Th = legLength(kind, H - 3, HIND_STRAIGHT), w = q.legW, P = q.pastern, restPastern = -(90 - q.pasternAngle);
  for (const l of legDefs) {
    const z = l.far ? 1 : 6, role: RigRole = l.far ? "fur-dark" : "fur", T = l.front ? Tf : Th;
    const up = T * (l.front ? .54 : .52), lo = T - up;
    const parent = l.front ? "body" : "haunch", px = l.front ? l.x : l.x + 8, py = l.front ? 5 : 3;
    rig.bone("up-" + l.id, parent, px, py, 0, up);
    rig.bone("lo-" + l.id, "up-" + l.id, 0, up, 0, lo);
    rig.bone("paw-" + l.id, "lo-" + l.id, 0, lo, restPastern, P);
    rig.bone("hoof-" + l.id, "paw-" + l.id, 0, P, -restPastern);
    if (l.front) {
      rig.part("up-" + l.id, "up-" + l.id, poly([[-w * .95, -5], [w * .95, -5], [w * .78, up * .5], [w * .5, up], [-w * .5, up], [-w * .7, up * .45]]), role, z, { far: l.far });
      rig.part("knee-" + l.id, "lo-" + l.id, ell(0, .4, w * .52, w * .62), role, z + .02, { far: l.far });
      rig.part("lo-" + l.id, "lo-" + l.id, cap(lo, w * .8, w * .62), role, z, { far: l.far });
    } else {
      // Gaskin from the stifle to the point of the hock (behind), then the cannon.
      rig.part("up-" + l.id, "up-" + l.id, poly([[-w * 1.4, -5], [w * 1.5, -6], [w * 1.05, up * .55], [w * .55, up], [-w * .62, up + 1.4], [-w * 1.05, up * .62]]), role, z, { far: l.far });
      rig.part("lo-" + l.id, "lo-" + l.id, cap(lo, w * .82, w * .6), role, z, { far: l.far });
    }
    // Fetlock: a small bulge at the back of the joint; the pastern ends inside the hoof (no knob below the sole).
    rig.part("fetlock-" + l.id, "paw-" + l.id, ell(-w * .1, .2, w * .34, w * .36), role, z + .03, { far: l.far });
    rig.part("pastern-" + l.id, "paw-" + l.id, cap(P - (horse ? 3.6 : 1.6), w * .48, w * .4), role, z + .04, { far: l.far });
    // Hoof (or paw) with its sole on the ground line at the bone's origin.
    rig.part("hoof-" + l.id, "hoof-" + l.id, horse ? poly([[-2.6, -4.6], [2, -5], [3.4, -2.4], [4.8, 0], [-2.8, 0]]) : ell(1.6, -1.5, w * .66, 1.7), horse ? "horn" : role, z + .1, { far: l.far });
    if (horse) rig.part("coronet-" + l.id, "hoof-" + l.id, poly([[-2.8, -4.4], [2.2, -4.8], [2.6, -3.8], [-2.8, -3.4]]), "hair", z + .11, { far: l.far });
    legs.push({ upper: "up-" + l.id, lower: "lo-" + l.id, foot: "paw-" + l.id, hoof: "hoof-" + l.id, pastern: P * u, straight: l.front ? FORE_STRAIGHT : HIND_STRAIGHT, phase: 0, bend: l.front ? 1 : -1,
      lift: l.front ? 1.25 : .9, curl: l.front ? q.curlFore : q.curlHind, swingHip: l.front ? .16 : .12 });
  }
  // Neck and head.
  rig.bone("neck", "body", kind === "cat" ? 32 : horse ? 34 : 38, horse ? -8 : -6, q.neckAngle, q.neck);
  // Neck local +x is the crest (top line), −x the throat.
  if (horse) {
    rig.part("neck", "neck", poly([[14, -4], [12, 6], [10, 15], [8, 23], [6.4, 31], [-5, 33], [-6.6, 25], [-8.4, 16], [-11, 7], [-13, -2], [-6, -8], [6, -8]]), "fur", 5);
    rig.part("mane", "neck", poly([[13, -4], [16.4, 3], [14, 9], [15, 15], [11.6, 20], [12, 26], [8.6, 33], [5.4, 31], [8.2, 22], [9.6, 12], [11, 2]]), "hair", 5.2);
  } else rig.part("neck", "neck", cap(q.neck, 12, 9), "fur", 5);
  // Head: a horse's head hangs from the poll, nose well down; dogs and cats hold theirs level.
  rig.bone("head", "neck", horse ? .6 : 0, q.neck, horse ? 36 - q.neckAngle : -q.neckAngle - 8);
  const hs = q.head;
  if (horse) {
    rig.part("ear-far", "head", poly([[-4.6, -5.6], [-3.2, -15.4], [-.4, -6.6]]), "fur-dark", 5.9, { far: true });
    rig.part("head", "head", poly([[-4, -7], [6, -6.5], [14, -3.8], [22, 0], [26.5, 2.2], [28.2, 5.2], [27, 8.2], [23.5, 9.6], [14, 8.6], [4, 10.4], [-3.5, 7.5], [-7, 2]]), "fur", 6);
    rig.part("muzzle", "head", ell(24.6, 5.6, 4.2, 3.9), "fur-dark", 6.05);
    rig.part("nostril", "head", ell(26, 3.6, 1, .7), "detail", 6.1);
    rig.part("jaw-line", "head", path("M23 8.4Q16 7.6 9 9.4"), "detail", 6.1, { line: true, lineWidth: .5 });
    rig.part("ear", "head", poly([[-2.6, -6], [.4, -17], [3, -6.6]]), "fur", 6.15);
    rig.part("forelock", "head", poly([[-1, -6.4], [6, -7.4], [9, -4], [4, -3.6], [1, -2.2]]), "hair", 6.2);
  } else {
    rig.part("skull", "head", ell(0, 0, 10 * hs, 9 * hs), "fur", 6);
    rig.part("snout", "head", kind === "cat" ? ell(8, 3, 5, 4) : poly([[4, -3], [17, -1], [20, 3], [18, 7], [6, 8]].map(([x, y]) => [x * hs, y * hs] as Pt)), kind === "cat" ? "belly" : "fur", 6.1);
    rig.part("nose", "head", ell(kind === "cat" ? 12 : 19 * hs, 1.5, 2, 1.6), "detail", 6.2);
    rig.part("ear", "head", kind === "cat" ? poly([[-6, -6], [-3, -17], [3, -8]]) : poly([[-5, -5], [2, -7], [3, 4], [-1, 12], [-6, 9]]), kind === "cat" ? "fur" : "fur-dark", 6.3);
    if (kind === "dog") rig.part("tongue", "head", poly([[10, 6.6], [15, 6.8], [15.4, 10.6], [12.6, 11.6], [10.4, 9]]), "mouth", 6.05, { color: "#d65a63" });
  }
  rig.part("eye", "head", ell(horse ? 6 : 4, -2, 1.4, 1.7), "eye", 6.4, { variants: { shut: ell(horse ? 6 : 4, -1.5, 1.8, .35) } });
  // Tail.
  const tailBones: string[] = [];
  const tailN = horse ? 3 : 4;
  for (let i = 0; i < tailN; i++) {
    const id = "tail-" + i;
    rig.bone(id, i ? "tail-" + (i - 1) : "haunch", i ? 0 : horse ? -32 : -30, i ? q.tail : horse ? -11 : -8, i ? (kind === "cat" ? -14 : horse ? -6 : 8) : q.tailAngle, q.tail);
    tailBones.push(id);
    const w0 = 5.4 - i * .9, w1 = Math.max(1.6, w0 - 1.2), L = q.tail;
    // A horse's tail is a dock wrapped in hair that fans out and lengthens toward the end.
    if (horse) rig.part(id, id, poly(i === 0 ? [[-3, -1], [3, -1.6], [4.6, L * .6], [5.4, L + 1.4], [-4.8, L + 1.6], [-4, L * .5]]
      : i === 1 ? [[-4.8, -.4], [5.4, -.4], [7, L * .5], [7.6, L + 1.6], [-5.6, L + 1.8], [-6, L * .5]]
        : [[-5.6, -.4], [7.6, -.4], [8.6, L * .55], [7, L + 4], [3, L + 9], [1, L + 6], [-2, L + 10], [-4.6, L + 5], [-6.6, L * .5]]), "hair", 3.5);
    else rig.part(id, id, cap(L + 1.5, w0, w1), "fur", 3.5);
  }
  if (horse) rig.part("tail-strands", "tail-2", path("M-3 2Q-4 10 -2.4 17M1.4 2Q2.4 10 1.6 15M4.8 3Q6 10 4.6 14"), "detail", 3.52, { line: true, lineWidth: .5, color: "#3a2618" });
  rig.drivers.push({ type: "variant", part: "eye", name: "shut", mode: "blink", interval: [70, 150], duration: 4 });
  const sitting = m === "sit", moving = m !== "idle" && !sitting, g = quadGait(kind, m);
  const gaitDriver = (window: { start?: number; end?: number }): RigDriver => ({
    type: "gait", body: "body", ...window, stride: g.stride * Tf * u, stance: g.stance, lift: g.lift * Tf * u, bob: g.bob * u, bobPhase: g.bobPhase, bobHarmonic: g.bobH,
    pitch: g.pitch, pitchPhase: g.pitchPhase, sink: g.sink * u, legs: legs.map((l, i) => ({ ...l, phase: g.phases[i], swingHip: (l.swingHip ?? 0) * (m === "gallop" ? 1 : 1.7) })),
    swing: [{ bone: "neck", amplitude: g.neck, phase: g.neckPhase, harmonic: g.neckH }, { bone: "head", amplitude: -g.neck * .6, phase: g.neckPhase, harmonic: g.neckH },
      { bone: "haunch", amplitude: -q.flex * g.flex, phase: g.flexPhase }],
  });
  rig.drivers.push(gaitDriver(moving ? { start, end } : sitting ? { end: t(.18) } : {}));
  // At speed the neck stretches forward and the head reaches out (the horse lengthens its frame).
  const stretch = ({ trot: 4, canter: 9, gallop: 15 } as Record<string, number>)[m] ?? 0;
  if (stretch && horse) { rig.track("neck", [{ frame: start, rotate: stretch }]); rig.track("head", [{ frame: start, rotate: -stretch * .5 }]); }
  if (sitting) {
    // Sit: the rump lowers to the ground over folded hind legs, the chest rises on straight forelegs, the tail curls.
    const s0 = t(.14), s1 = t(.34);
    // Lower the body until the raised forelegs still reach the ground (the pitch lifts the shoulders).
    const drop = H + 32 * Math.sin(22 * Math.PI / 180) - 5 * Math.cos(22 * Math.PI / 180) - fetlockY - Tf * .965;
    rig.track("body", [{ frame: s0, rotate: 0, y: 0 }, { frame: s1, rotate: -22, y: drop * u, ease: "ease-in-out-cubic" }]);
    rig.track("haunch", [{ frame: s0, rotate: 0 }, { frame: s1, rotate: -8, ease: "ease-in-out-cubic" }]);
    rig.track("neck", [{ frame: s0, rotate: 0 }, { frame: s1, rotate: 16, ease: "ease-in-out-cubic" }]);
    rig.track("head", [{ frame: s0, rotate: 0 }, { frame: s1, rotate: 8 }]);
    // Forefeet stay planted; each hind foot steps forward under the lowering rump (lift, then set down).
    for (const l of legs) {
      const front = l.bend === 1, far = l.upper.includes("far"), x0 = front ? (far ? 30 : 32) : (far ? -30 : -32), x1 = front ? x0 : x0 + 14;
      const mid = Math.round((s0 + s1) / 2) + (far ? 4 : -4);
      // Folded under a sitting rump the hind leg bends stifle-forward (a Z), so the joint never dips through the ground.
      const fx = (x: number) => (x - fetlockBack) * u;
      rig.drivers.push({ type: "reach", start: t(.12), ramp: 8, upper: l.upper, lower: l.lower, tip: l.foot, tipAngle: restPastern, bend: 1, target: front
        ? [{ frame: s0, x: fx(x0), y: -fetlockY * u }]
        : [{ frame: s0, x: fx(x0), y: -fetlockY * u }, { frame: mid, x: fx((x0 + x1) / 2), y: -(fetlockY + 4) * u }, { frame: s1, x: fx(x1), y: -fetlockY * u }] });
    }
    rig.drivers.push({ type: "chain", start: s1, bones: tailBones, amplitude: kind === "dog" ? 14 : 5, period: kind === "dog" ? 12 : 60, lag: .8, growth: 1.2, bias: kind === "cat" ? 10 : -4, ramp: 16 });
    if (kind === "dog") rig.drivers.push({ type: "oscillate", start: s1, bone: "chest", property: "scaleY", amplitude: .02, period: 12, ramp: 10 });
  }
  // A horse's tail streams back as the pace rises; dogs wag, cats swish slowly.
  const stream = horse ? ({ walk: 4, trot: 12, canter: 20, gallop: 26 } as Record<string, number>)[m] ?? 0 : 0;
  rig.drivers.push({ type: "chain", end: sitting ? t(.34) : undefined, bones: tailBones, amplitude: kind === "dog" ? (moving ? 12 : 16) : kind === "cat" ? 6 : horse && moving ? 7 : 4,
    period: kind === "dog" ? 14 : kind === "cat" ? 70 : horse && moving ? CYCLE.horse[m] ?? 40 : 40, lag: .8, growth: 1.2, follow: 2, bias: stream / tailN });
  rig.drivers.push({ type: "oscillate", bone: "chest", property: "scaleY", amplitude: .012, period: 80 });
  return finish(kind, "quadruped", rig, travel(o, start, end, moving ? "linear" : undefined), q.palette, { x: -60 * u, y: -(H + 40) * u, width: 120 * u, height: (H + 42) * u }, o);
}

// ---- Wings (side-view projection) ------------------------------------------------------------------------------------------------
// A wing plane bone sits at the shoulder with rest rotation 180, so its local +y (the span) points up and its local
// +x (the chord) points back toward the tail. The flap driver scales the plane's span by sin(elevation): the wing is
// seen spread above the back, edge-on, then below the belly. Arm and hand fold back inside the plane.

// ---- Bird ------------------------------------------------------------------------------------------------------------------------

export const BIRD_MOTIONS = ["fly", "glide", "perch", "hop", "peck"] as const;
/** A small songbird: body length = `size`. Flies with a spread downstroke and a tucked upstroke, glides, perches, hops and pecks. */
export function birdRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 140) / 100, rig = new Rig(u), m = o.motion ?? "fly", start = o.start ?? 0, end = o.end ?? 180, airborne = m === "fly" || m === "glide", t = at(start, end);
  const palette: Partial<Record<RigRole, string>> = { feather: "#2f5d8a", "fur-dark": "#1b3550", belly: "#e7a35c", beak: "#e2a62b", eye: "#1d1715", detail: "#122436", fur: "#4f86b8", light: "#f4efe4" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, airborne ? 0 : -31, airborne ? 4 : -14);
  rig.part("body", "body", poly([[-30, 0], [-18, -14], [6, -18], [24, -12], [30, -2], [22, 10], [0, 16], [-20, 10]]), "feather", 4);
  rig.part("breast", "body", poly([[2, 2], [24, -2], [26, 6], [12, 14], [-6, 13]]), "belly", 4.1);
  rig.bone("head", "body", 26, -14);
  rig.part("head", "head", ell(0, -4, 13, 12), "feather", 5);
  rig.part("cheek", "head", ell(4, 1, 6, 4.4), "light", 5.05);
  rig.part("beak", "head", poly([[10, -6], [24, -2], [10, 1]]), "beak", 5.1);
  rig.part("eye", "head", ell(5, -7, 2.2, 2.4), "eye", 5.2, { variants: { shut: ell(5, -6.5, 2.6, .5) } });
  rig.bone("tail", "body", -28, -2, 72, 22);
  rig.part("tail", "tail", poly([[-4, 0], [4, 0], [9, 24], [0, 20], [-9, 24]]), "fur-dark", 3);
  for (const [side, far] of [["far", true], ["near", false]] as const) {
    rig.bone("wing-" + side, "body", 4, -11, 180);
    rig.bone("arm-" + side, "wing-" + side, 0, 0, 0, 20);
    rig.bone("hand-" + side, "arm-" + side, 0, 20, 0, 28);
    // Plumage: dark flight feathers, lighter coverts with a pale wing bar, so the wing reads against the body.
    const z = far ? 1 : 7, role: RigRole = "fur-dark";
    // Inner wing: coverts and secondaries, scalloped along the trailing edge (local +x = toward the tail).
    rig.part("arm-" + side, "arm-" + side, poly([[-3.4, -2], [-4.2, 8], [-3.8, 18.6], [1, 20], [5, 19], [8, 20.4], [11, 18.4], [14, 18.6], [15.6, 14.6], [17.4, 13], [17, 8], [18, 4.4], [15, 1], [8, -2.4]]), role, z, { far });
    rig.part("covert-" + side, "arm-" + side, poly([[-3.4, -1], [-3.8, 12], [3, 12.6], [9, 10], [12, 4], [7, -1.6]]), "fur", z + .05, { far });
    rig.part("wingbar-" + side, "arm-" + side, poly([[-3.6, 12.4], [3, 13], [9.2, 10.4], [12.2, 4.4], [13.4, 5.4], [10.4, 11.8], [3.2, 14.6], [-3.7, 14.2]]), "light", z + .06, { far });
    // Hand: primaries fanned from the wrist, separated at the tip.
    rig.part("hand-" + side, "hand-" + side, poly([[-3.8, -1.4], [-4.4, 9], [-2.6, 18], [.4, 25], [2.6, 28], [4.4, 25.4], [6.4, 26.4], [7.8, 22.4], [10, 23], [11, 18.6], [13, 18.6], [13.4, 13.6], [15, 12.6], [14.4, 7], [14.8, 2.4], [10, -1.6]]), role, z + .1, { far });
    rig.part("hand-covert-" + side, "hand-" + side, poly([[-3.8, -1.4], [-4.2, 6], [2, 7.4], [9, 6], [14.6, 2.6], [10, -1.6]]), "fur", z + .11, { far });
    rig.part("primary-line-" + side, "hand-" + side, path("M-1 6L1.8 25M3 6.6L6 24M6.6 6.4L10 20M10 5.4L13 14"), "detail", z + .12, { far, line: true, lineWidth: .5 });
    rig.bone("leg-" + side, "body", far ? -4 : 2, 12, 0, 10);
    rig.bone("shank-" + side, "leg-" + side, 0, 10, 0, 10);
    rig.bone("toe-" + side, "shank-" + side, 0, 10);
    rig.part("leg-" + side, "leg-" + side, cap(10, 2.6, 2), "beak", z - .5, { far });
    rig.part("shank-" + side, "shank-" + side, cap(10, 2, 1.8), "beak", z - .5, { far });
    rig.part("toe-" + side, "toe-" + side, poly([[-4, -1], [7, -1], [8, 1], [-5, 1]]), "beak", z - .4, { far });
  }
  rig.drivers.push({ type: "variant", part: "eye", name: "shut", mode: "blink", interval: [60, 120], duration: 3 });
  if (airborne) {
    const glide = m === "glide";
    for (const side of ["near", "far"] as const) rig.drivers.push({ type: "flap", plane: "wing-" + side, arm: "arm-" + side, hand: "hand-" + side, period: 14, phase: side === "far" ? .02 : 0,
      up: 72, down: -52, downstroke: .45, side, tilt: 14, fold: 74, sweep: 9, body: side === "near" ? "body" : undefined, heave: 3.2 * u, glide: glide ? 6 : undefined });
    for (const side of ["near", "far"]) { rig.track("leg-" + side, [{ frame: start, rotate: 70 }]); rig.track("shank-" + side, [{ frame: start, rotate: -120 }]); }
    rig.drivers.push({ type: "bank", amount: .6, max: 25 }, { type: "oscillate", bone: "tail", property: "rotate", amplitude: glide ? 3 : 5, period: glide ? 60 : 28 },
      { type: "oscillate", bone: "head", property: "rotate", amplitude: 2, period: 70, wobble: .5 });
    const y = o.y ?? 0, from = o.from ?? 0, to = o.to ?? from + 600, dy = (glide ? 30 : 50) * u;
    // Flying: the root is the body; `y` is the height it flies at, dipping and climbing along the way.
    return finish("bird", "bird", rig, glide
      ? [{ frame: start, x: from, y: y - dy }, { frame: end, x: to, y: y + dy * .6, ease: "linear" }]
      : [{ frame: start, x: from, y }, { frame: Math.round(start + (end - start) * .5), x: (from + to) / 2, y: y - dy, ease: "ease-in-out-quad" }, { frame: end, x: to, y: y + 10 * u, ease: "ease-in-out-quad" }],
    palette, { x: -40 * u, y: -110 * u, width: 80 * u, height: 112 * u }, o);
  }
  // Folded: the wing lies against the flank (its plane faces the camera), arm and hand pointing back to the tail.
  for (const side of ["near", "far"]) {
    rig.track("wing-" + side, [{ frame: start, scaleY: -.92, rotate: 8 }]);
    rig.track("arm-" + side, [{ frame: start, rotate: -84 }]);
    rig.track("hand-" + side, [{ frame: start, rotate: -6 }]);
  }
  rig.drivers.push({ type: "gait", body: "body", start, end: m === "hop" ? end : start + 1, stride: 26 * u, stance: m === "hop" ? .5 : .62, lift: 4 * u,
    legs: [{ upper: "leg-near", lower: "shank-near", foot: "toe-near", phase: 0, bend: -1, sole: 1 * u }, { upper: "leg-far", lower: "shank-far", foot: "toe-far", phase: m === "hop" ? 0 : .5, bend: -1, sole: 1 * u }] });
  rig.drivers.push({ type: "oscillate", bone: "tail", property: "rotate", amplitude: 8, period: 30, wobble: .5 });
  if (m === "hop") rig.drivers.push({ type: "oscillate", start, end, bone: "body", property: "y", amplitude: -5 * u, period: 16, bySpeed: true });
  if (m === "peck") {
    // Look, dip to peck twice, come up and swallow; the tail tips up as the head goes down.
    const keys: { frame: number; rotate: number; ease?: "ease-in-quad" | "ease-out-back" | "ease-in-out-cubic" }[] = [], tail: typeof keys = [];
    for (let b = start; b + 44 <= end; b += 56) {
      keys.push({ frame: b, rotate: 0 }, { frame: b + 10, rotate: -8, ease: "ease-in-out-cubic" }, { frame: b + 16, rotate: 58, ease: "ease-in-quad" }, { frame: b + 20, rotate: 40, ease: "ease-out-back" },
        { frame: b + 24, rotate: 60, ease: "ease-in-quad" }, { frame: b + 30, rotate: 4, ease: "ease-out-back" }, { frame: b + 44, rotate: 0 });
      tail.push({ frame: b + 10, rotate: 0 }, { frame: b + 16, rotate: -22 }, { frame: b + 30, rotate: 0 });
    }
    rig.track("body", keys.map(k => ({ ...k, rotate: k.rotate * .5 }))); rig.track("head", keys.map(k => ({ ...k, rotate: k.rotate * .4 }))); rig.track("tail", tail);
  } else rig.drivers.push({ type: "oscillate", bone: "head", property: "rotate", amplitude: 10, period: 46, wobble: .8 });
  if (m === "perch") rig.track("body", [{ frame: t(.5), rotate: 0 }]);
  return finish("bird", "bird", rig, travel(o, start, end, "linear"), palette, { x: -40 * u, y: -90 * u, width: 80 * u, height: 92 * u }, o);
}

// ---- Dragon ----------------------------------------------------------------------------------------------------------------------

export const DRAGON_MOTIONS = ["fly", "glide", "walk", "roar"] as const;
/** A dragon: four legs, membrane wings on finger spars, a long neck and tail that ripple, a jaw that opens on a roar with fire. */
export function dragonRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 520) / 100, rig = new Rig(u), m = o.motion ?? "fly", start = o.start ?? 0, end = o.end ?? 180, airborne = m === "fly" || m === "glide";
  const palette: Partial<Record<RigRole, string>> = { scale: "#2f7a5a", "scale-dark": "#1f5340", belly: "#d9b26a", membrane: "#9b3b3b", horn: "#efe1c0", eye: "#f2c230", detail: "#173a2c", mouth: "#5a1414", light: "#f08a24", smoke: "#f4c242" };
  const H = 26;
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, airborne ? 0 : -H, airborne ? -3 : 0);
  rig.bone("chest", "body", 0, 0);
  rig.part("body", "chest", poly([[-24, -2], [-16, -9], [0, -11], [16, -10], [26, -5], [28, 4], [18, 9], [0, 10], [-18, 8], [-26, 4]]), "scale", 4);
  rig.part("belly", "chest", poly([[-18, 4], [0, 6], [20, 5], [16, 9], [0, 10], [-16, 8]]), "belly", 4.1);
  rig.part("spines", "body", poly([[-22, -4], [-19, -11], [-15, -7], [-11, -13], [-7, -9], [-3, -14], [1, -10], [5, -14], [9, -10], [13, -13], [17, -8], [-20, -5]]), "horn", 3.9);
  const legs: RigLeg[] = [];
  const L = 12;
  for (const l of [{ id: "hind-far", x: -18, front: false, far: true }, { id: "fore-far", x: 18, front: true, far: true }, { id: "hind-near", x: -20, front: false, far: false }, { id: "fore-near", x: 20, front: true, far: false }]) {
    const z = l.far ? 1 : 6, role: RigRole = l.far ? "scale-dark" : "scale";
    rig.bone("up-" + l.id, "body", l.x, 3, 0, L);
    rig.bone("lo-" + l.id, "up-" + l.id, 0, L, 0, L);
    rig.bone("claw-" + l.id, "lo-" + l.id, 0, L);
    rig.part("up-" + l.id, "up-" + l.id, cap(L, l.front ? 7 : 9.5, 5), role, z, { far: l.far });
    rig.part("lo-" + l.id, "lo-" + l.id, cap(L, 5, 4), role, z, { far: l.far });
    rig.part("claw-" + l.id, "claw-" + l.id, poly([[-3, -1], [3, -1], [7, 2], [5, 3], [3, 2.2], [1, 3.4], [-1, 2.2], [-3, 3]]), "horn", z + .1, { far: l.far });
    legs.push({ upper: "up-" + l.id, lower: "lo-" + l.id, foot: "claw-" + l.id, phase: 0, bend: l.front ? 1 : -1, sole: 2.6 * u, toe: 3 * u, curl: l.front ? 30 : 20, swingHip: .12 });
  }
  // Wings: a projected plane at the shoulder, the arm spar with its membrane back to the flank, finger spars fanning
  // from the wrist with a scalloped trailing edge.
  for (const [side, far] of [["far", true], ["near", false]] as const) {
    rig.bone("wing-" + side, "body", 12, -9, 180);
    rig.bone("warm-" + side, "wing-" + side, 0, 0, 0, 30);
    rig.bone("whand-" + side, "warm-" + side, 0, 30, 0, 34);
    const z = far ? .5 : 8, spar: RigRole = far ? "scale-dark" : "scale";
    rig.part("wmem-" + side, "warm-" + side, poly([[0, 0], [-1.6, 30], [3.6, 27.6], [7.4, 22.6], [10.6, 17.2], [14, 12], [18, 7.4], [22.6, 3.8], [27.4, 1.6], [24, -2.2]]), "membrane", z, { far });
    rig.part("wfan-" + side, "whand-" + side, poly([[0, 0], [-2, 34], [3, 27], [9, 32], [12, 22], [19, 25], [19, 15], [27, 14], [24, 6], [30, 2], [16, -2], [6, -1]]), "membrane", z + .1, { far });
    rig.part("warm-spar-" + side, "warm-" + side, cap(31, 5, 3.4), spar, z + .2, { far });
    rig.part("wspar-1-" + side, "whand-" + side, tube(0, 0, -2, 34, 3, 1.2), spar, z + .3, { far });
    rig.part("wspar-2-" + side, "whand-" + side, tube(0, 0, 9, 32, 2.4, 1), spar, z + .3, { far });
    rig.part("wspar-3-" + side, "whand-" + side, tube(0, 0, 19, 25, 2.2, 1), spar, z + .3, { far });
    rig.part("wspar-4-" + side, "whand-" + side, tube(0, 0, 27, 14, 2, .9), spar, z + .3, { far });
    rig.part("wthumb-" + side, "whand-" + side, poly([[-1.6, -1], [-5.6, -4.6], [-2.4, .8]]), "horn", z + .35, { far });
  }
  // Neck chain and head with jaw.
  const neck: string[] = [];
  for (let i = 0; i < 4; i++) {
    const id = "neck-" + i;
    rig.bone(id, i ? "neck-" + (i - 1) : "body", i ? 0 : 24, i ? 7 : -4, i ? 7 : -122, 7);
    neck.push(id);
    rig.part(id, id, cap(8, 8 - i * .9, 7 - i * .9), "scale", 5 + i * .01);
    rig.part(id + "-spine", id, poly([[-3.6, 1], [-7.6, 3.6], [-3.4, 5]]), "horn", 4.9);
  }
  rig.bone("head", "neck-3", 0, 7, 101);
  rig.part("head", "head", poly([[-6, -4], [2, -7], [12, -6], [20, -3], [22, 1], [10, 2], [-4, 4]]), "scale", 7);
  rig.part("horn-1", "head", poly([[-4, -5], [-14, -13], [-2, -7]]), "horn", 6.9);
  rig.part("horn-2", "head", poly([[1, -6], [-6, -16], [4, -7]]), "horn", 6.95);
  rig.part("eye", "head", ell(6, -3, 1.6, 1.3), "eye", 7.2, { variants: { shut: ell(6, -2.8, 2, .3) } });
  rig.part("brow", "head", poly([[3, -5.4], [10, -6.4], [9, -4.6]]), "detail", 7.25);
  rig.part("nostril", "head", ell(19, -2, .9, .6), "detail", 7.25);
  rig.bone("jaw", "head", -2, 2, 0);
  rig.part("jaw", "jaw", poly([[-2, 0], [20, 0], [18, 3], [4, 5]]), "scale-dark", 6.8);
  rig.part("teeth", "jaw", poly([[6, 0], [7, -1.6], [8, 0], [11, 0], [12, -1.6], [13, 0], [16, 0], [17, -1.4], [18, 0]]), "horn", 6.85);
  rig.bone("mouth-tip", "head", 21, 0);
  // Tail chain with a spade.
  const tail: string[] = [];
  for (let i = 0; i < 7; i++) {
    const id = "tail-" + i;
    rig.bone(id, i ? "tail-" + (i - 1) : "body", i ? 0 : -24, i ? 8 : 0, i ? 0 : 100, 8);
    tail.push(id);
    rig.part(id, id, cap(9, 8 - i, Math.max(1.4, 7 - i)), "scale", 3 + i * .01);
    rig.part(id + "-spine", id, poly([[-3.4 + i * .3, 2], [-7.4 + i * .6, 4.4], [-3.2 + i * .3, 6]]), "horn", 2.9);
  }
  rig.part("spade", "tail-6", poly([[0, 6], [6, 10], [0, 18], [-6, 10]]), "membrane", 3.1);
  rig.drivers.push({ type: "variant", part: "eye", name: "shut", mode: "blink", interval: [80, 160], duration: 5 });
  if (airborne) {
    const glide = m === "glide";
    for (const side of ["near", "far"] as const) rig.drivers.push({ type: "flap", plane: "wing-" + side, arm: "warm-" + side, hand: "whand-" + side, period: 40, phase: side === "far" ? .015 : 0,
      up: 66, down: -46, downstroke: .42, side, tilt: 14, fold: 44, sweep: 7, body: side === "near" ? "body" : undefined, heave: 4.5 * u, glide: glide ? 10 : undefined });
    // Neck stretched forward in flight, head kept level; legs tucked.
    rig.track("neck-0", [{ frame: start, rotate: 30 }]);
    rig.track("head", [{ frame: start, rotate: -30 }]);
    for (const l of ["fore-near", "fore-far"]) { rig.track("up-" + l, [{ frame: start, rotate: -50 }]); rig.track("lo-" + l, [{ frame: start, rotate: 90 }]); }
    for (const l of ["hind-near", "hind-far"]) { rig.track("up-" + l, [{ frame: start, rotate: 60 }]); rig.track("lo-" + l, [{ frame: start, rotate: 40 }]); }
    rig.drivers.push({ type: "chain", bones: tail, amplitude: glide ? 6 : 8, period: glide ? 90 : 80, lag: .7, growth: 1.5, bias: -2 },
      { type: "chain", bones: neck, amplitude: 3, period: 80, lag: .6, phase: .3, follow: 4 }, { type: "bank", amount: .7, max: 22 });
    const y = o.y ?? 0, from = o.from ?? 0, to = o.to ?? from + 900;
    // Flying: the root is the body; `y` is the flight height, with a slow swoop.
    return finish("dragon", "dragon", rig, [{ frame: start, x: from, y }, { frame: Math.round(start + (end - start) * .5), x: (from + to) / 2, y: y - (glide ? 10 : 22) * u, ease: "ease-in-out-quad" }, { frame: end, x: to, y: y + 6 * u, ease: "ease-in-out-quad" }],
      palette, { x: -60 * u, y: -110 * u, width: 140 * u, height: 112 * u }, o);
  }
  // Grounded: wings folded up along the back (the plane faces the camera, arm raised back, fingers folded down).
  for (const side of ["near", "far"]) {
    rig.track("wing-" + side, [{ frame: start, scaleY: .78, rotate: -6 }]);
    rig.track("warm-" + side, [{ frame: start, rotate: -38 }]);
    rig.track("whand-" + side, [{ frame: start, rotate: -150 }]);
  }
  rig.drivers.push({ type: "chain", bones: tail, amplitude: 6, period: 80, lag: .6, growth: 1.4, follow: 3 }, { type: "oscillate", bone: "chest", property: "scaleY", amplitude: .012, period: 90 });
  if (m === "walk") rig.drivers.push({ type: "gait", body: "body", start, end, stride: 34 * u, stance: .66, lift: 5 * u, bob: 1.2 * u, bobPhase: .2, sink: .8 * u, legs: legs.map((l, i) => ({ ...l, phase: [0, .75, .5, .25][i] })),
    swing: [{ bone: "neck-0", amplitude: 3, phase: 0, harmonic: 2 }] });
  else rig.drivers.push({ type: "gait", body: "body", stride: 34 * u, legs: legs.map((l, i) => ({ ...l, phase: [0, .75, .5, .25][i] })) });
  if (m === "roar") {
    // Rear back with the wings flaring open, then lunge forward with the jaw open and a burst of fire.
    const t = at(start, end);
    rig.track("neck-0", [{ frame: start, rotate: 0 }, { frame: t(.2), rotate: -18, ease: "ease-in-out-cubic" }, { frame: t(.3), rotate: 14, ease: "ease-out-back" }, { frame: t(.8), rotate: 12 }, { frame: end, rotate: 0 }]);
    rig.track("jaw", [{ frame: start, rotate: 0 }, { frame: t(.25), rotate: 6 }, { frame: t(.32), rotate: 30, ease: "ease-out-back" }, { frame: t(.8), rotate: 28 }, { frame: end, rotate: 0 }]);
    for (const side of ["near", "far"]) {
      rig.track("wing-" + side, [{ frame: t(.12), scaleY: .78, rotate: -6 }, { frame: t(.28), scaleY: .98, rotate: -14, ease: "ease-out-back" }, { frame: t(.8), scaleY: .96, rotate: -12 }, { frame: end, scaleY: .78, rotate: -6 }]);
      rig.track("warm-" + side, [{ frame: t(.12), rotate: -38 }, { frame: t(.28), rotate: 4, ease: "ease-out-back" }, { frame: t(.8), rotate: 2 }, { frame: end, rotate: -38 }]);
      rig.track("whand-" + side, [{ frame: t(.12), rotate: -150 }, { frame: t(.28), rotate: -8, ease: "ease-out-back" }, { frame: t(.8), rotate: -12 }, { frame: end, rotate: -150 }]);
    }
    rig.drivers.push({ type: "oscillate", start: t(.3), end: t(.8), bone: "body", property: "x", amplitude: .5 * u, period: 3, ramp: 4 });
    const puffs: string[] = [];
    // Fire: a stream of tongues (flame-shaped puffs) spat forward, swelling and lifting as they cool.
    const flame = poly([[-6, 0], [-3, -4], [2, -6], [8, -3], [12, 0], [8, 3], [2, 6], [-3, 4]]);
    for (let i = 0; i < 18; i++) { const id = "fire-" + i; rig.bone(id, "root", 0, 0); puffs.push(id); rig.part(id, id, flame, i % 4 === 0 ? "smoke" : "light", 9, { color: i % 4 === 0 ? "#f6d26b" : i % 2 ? "#f08a24" : "#e2502a" }); }
    rig.drivers.push({ type: "emitter", start: t(.32), end: t(.82), puffs, origin: "mouth-tip", every: 1, life: 18, velocity: [3.6 * u, -.25 * u], growth: 2.6, drift: 2.2 * u, ramp: 0 });
  }
  return finish("dragon", "dragon", rig, travel(o, start, end, "linear"), palette, { x: -60 * u, y: -80 * u, width: 140 * u, height: 82 * u }, o);
}

// ---- Fish ------------------------------------------------------------------------------------------------------------------------

/** A koi: a swimming wave runs down the body chain into the tail; fins paddle. */
export function fishRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 240) / 100, rig = new Rig(u), start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { scale: "#f0eee6", "scale-dark": "#d9d4c4", accent: "#e0582b", fin: "#f3c8a8", eye: "#1d1715", detail: "#1d1715" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("head", "root", 30, -30, 90);
  rig.part("head", "head", poly([[-12, 0], [-10, -12], [0, -20], [10, -12], [12, 0]]), "scale", 5);
  rig.part("cap-spot", "head", ell(0, -10, 6, 5), "accent", 5.1);
  rig.part("eye", "head", ell(-5, -11, 2, 2), "eye", 5.2);
  const body: string[] = [];
  const widths = [12, 11, 9, 6.5, 4];
  for (let i = 0; i < 5; i++) {
    const id = "body-" + i;
    rig.bone(id, i ? "body-" + (i - 1) : "head", 0, i ? 13 : 0, 0, 13);
    body.push(id);
    rig.part(id, id, poly([[-widths[i], 0], [widths[i], 0], [widths[i + 1] ?? 3, 14], [-(widths[i + 1] ?? 3), 14]]), "scale", 4 - i * .01);
    if (i === 1 || i === 3) rig.part(id + "-spot", id, ell(i === 1 ? 3 : -2, 6, 6 - i, 4), "accent", 4.05);
  }
  rig.part("tail", "body-4", poly([[0, 10], [14, 30], [4, 26], [0, 18], [-4, 26], [-14, 30]]), "fin", 3.5);
  rig.part("dorsal", "body-1", poly([[-12, 2], [-22, 10], [-12, 16]]), "fin", 3.4);
  rig.bone("pec", "body-0", 10, 4, -40, 10);
  rig.part("pec", "pec", poly([[0, 0], [6, 12], [-2, 10]]), "fin", 6);
  rig.drivers.push({ type: "chain", bones: body, amplitude: 9, period: 30, lag: .85, growth: 1.6 }, { type: "oscillate", bone: "pec", property: "rotate", amplitude: 22, period: 30 },
    { type: "oscillate", bone: "head", property: "rotate", amplitude: 3, period: 30, phase: .5 });
  return finish("fish", "fish", rig, travel(o, start, end, "linear"), palette, { x: -30 * u, y: -70 * u, width: 100 * u, height: 80 * u }, o);
}

// ---- Butterfly -------------------------------------------------------------------------------------------------------------------

/** A butterfly: wings clap above the back and open on a quick beat; the flight path flutters up and down. */
export function butterflyRig(o: RigPresetOptions = {}): RigSpec {
  const u = (o.size ?? 120) / 100, rig = new Rig(u), start = o.start ?? 0, end = o.end ?? 180;
  const palette: Partial<Record<RigRole, string>> = { accent: "#e98a2a", "paint-dark": "#b8551b", detail: "#1f1a17", light: "#f6efe0", fur: "#2b2420", "fur-dark": "#1f1a17" };
  rig.bone("root", undefined, 0, 0);
  rig.bone("body", "root", 0, 0, -8);
  rig.part("abdomen", "body", poly([[-30, 1], [-22, -3], [-6, -4], [2, -3], [2, 3], [-6, 4], [-22, 3.4]]), "fur", 4);
  rig.part("thorax", "body", ell(5, 0, 7, 5.4), "fur", 4.1);
  rig.part("head", "body", ell(14, -1, 4.4, 4.2), "fur", 4.2);
  rig.part("eye", "body", ell(15.6, -1.6, 1.6, 1.8), "detail", 4.3);
  for (const [k, a] of [[0, -58], [1, -48]] as const) {
    rig.bone("ant-" + k, "body", 15, -4, 180 + a, 6);
    rig.bone("ant-tip-" + k, "ant-" + k, 0, 6, k ? 10 : -10, 6);
    rig.part("ant-" + k, "ant-" + k, cap(6.2, .8, .7), "detail", 3.9 + k * .01);
    rig.part("ant-tip-" + k, "ant-tip-" + k, cap(6.4, .7, .6), "detail", 3.9);
    rig.part("ant-club-" + k, "ant-tip-" + k, ell(0, 6.4, 1.3, 1.7), "detail", 3.91);
  }
  for (const [side, far] of [["far", true], ["near", false]] as const) {
    rig.bone("wing-" + side, "body", 4, -4, 180);
    const z = far ? 1 : 7;
    // Forewing points forward and up (local −x is toward the head); hindwing lobes behind it.
    rig.part("hindwing-" + side, "wing-" + side, poly([[2, 0], [-1, 8], [1, 16], [6, 22], [13, 22], [19, 18], [20, 11], [16, 4], [9, 0]]), "accent", z, { far, color: far ? "#c96f1f" : undefined });
    rig.part("hind-border-" + side, "wing-" + side, path("M1 16Q5 23 13 22.4Q19 19 20 11L18 11Q17 17 12.6 19.6Q6 20 3 15Z"), "detail", z + .05, { far });
    rig.part("forewing-" + side, "wing-" + side, poly([[0, 0], [-6, 8], [-12, 18], [-15, 28], [-10, 34], [-2, 33], [6, 27], [9, 18], [8, 8], [5, 1]]), "accent", z + .1, { far, color: far ? "#c96f1f" : undefined });
    rig.part("fore-border-" + side, "wing-" + side, path("M-15 28L-10 34L-2 33L6 27L4 24L-2 29L-9 30L-12 26Z"), "detail", z + .15, { far });
    rig.part("fore-veins-" + side, "wing-" + side, path("M0 1L-11 26M2 2L-3 30M4 2L4 25"), "detail", z + .16, { far, line: true, lineWidth: .55 });
    for (const [k, [x, y]] of ([[-9, 30], [-4, 30.8], [1.4, 29]] as const).entries()) rig.part(`spot-${side}-${k}`, "wing-" + side, ell(x, y, 1.1, .9), "light", z + .2, { far });
    rig.drivers.push({ type: "flap", plane: "wing-" + side, period: 8, phase: side === "far" ? .01 : 0, up: 86, down: -24, downstroke: .5, side, tilt: 22, sweep: 6,
      body: side === "near" ? "body" : undefined, heave: 2.4 * u });
  }
  rig.drivers.push({ type: "chain", bones: ["ant-0", "ant-tip-0"], amplitude: 4, period: 34, lag: .6 }, { type: "chain", bones: ["ant-1", "ant-tip-1"], amplitude: 4, period: 34, lag: .6, phase: .2 },
    { type: "bank", amount: .35, max: 20 });
  const y = o.y ?? 0, from = o.from ?? 0, to = o.to ?? from + 600;
  // Flutter: a wandering path that rises and dips every ~half second.
  const keys = sampledPath(start, end, 4, f => {
    const k = (f - start) / Math.max(1, end - start), e = k * k * (3 - 2 * k) * .25 + k * .75;
    return { x: from + (to - from) * e, y: y - 22 * u * Math.sin(f * .13) - 9 * u * Math.sin(f * .31 + 1) };
  });
  return finish("butterfly", "butterfly", rig, keys, palette, { x: -34 * u, y: -40 * u, width: 60 * u, height: 70 * u }, o);
}
