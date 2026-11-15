/**
 * Falling-plate kinematics for leaves, petals and paper (RIG1 `drift` driver and the leaf presets).
 *
 * After the experiments and simulations on freely falling plates (Belmonte, Eisenberg & Moses 1998; Pesavento & Wang
 * 2004; Auguste, Magnaudet & Fabre 2013), a light flat body falls in one of two regimes:
 *   - flutter: a pendulum-like zigzag. The plate is level mid-swing, where it moves fastest sideways and down; at each
 *     end of a swing its leading edge pitches up, it slows, rises a little and glides back the other way;
 *   - tumble: steady autorotation end over end, drifting sideways toward the side its spin carries it (the top edge
 *     turning away from the drift), falling fastest when edge-on;
 * with a slow precession of the swing plane about the vertical. Here those regimes are written as closed-form motion
 * (a pure function of age, so frames can be evaluated in any order) and projected to the picture with a camera looking
 * slightly down, so a plate turning in depth narrows, shears and shows its back face when it flips over.
 */

export interface FlutterParams {
  /** Mean fall speed, px per frame (negative rises). */
  fall: number;
  /** Mean sideways drift (wind), px per frame. */
  wind?: number;
  /** Flutter: half-width of the zigzag, px. */
  swing?: number;
  /** Flutter: frames for a full left-right-left oscillation. */
  period?: number;
  /** Flutter: pitch at the end of a swing, radians. */
  tilt?: number;
  /** Flutter: rise at the end of each swing relative to the mean fall, px. */
  lift?: number;
  /** Tumble: spin, radians per frame (positive turns counter-clockwise on screen and drifts right). */
  spin?: number;
  /** Swing-plane heading against the picture plane (radians) and its precession per frame. */
  heading?: number;
  precess?: number;
  /** Phase offset (radians). */
  phase?: number;
  /** Gusts: extra wind amplitude (px per frame) and their period (frames). */
  gust?: number;
  gustPeriod?: number;
}

export interface FlutterState { x: number; y: number; pitch: number; heading: number }

/** Position (px, y down, relative to the release point) and attitude of a falling plate `age` frames after release,
 * at absolute frame `frame` (gusts are a field in time, shared by every plate). */
export function flutterState(p: FlutterParams, age: number, frame = age): FlutterState {
  const w = (2 * Math.PI) / (p.period ?? 36), ph = p.phase ?? 0, a = w * age + ph;
  const heading = (p.heading ?? .9) + (p.precess ?? 0) * age;
  let x = (p.wind ?? 0) * age, y = p.fall * age, pitch = 0;
  if (p.gust) {
    const g = (2 * Math.PI) / (p.gustPeriod ?? 150), f0 = frame - age;
    // ∫ gust·(.5 + .5·sin(g t)) dt from release to now.
    x += p.gust * (.5 * age + .5 * (Math.cos(g * f0) - Math.cos(g * frame)) / g);
  }
  if (p.spin) {
    pitch = ph + p.spin * age;
    // Falls fastest edge-on, slowest broadside: a bob at twice the spin rate; a small surge with it.
    y += -Math.abs(p.fall) * .35 * Math.sin(2 * pitch) / (2 * Math.abs(p.spin) || 1) * .5;
    x += Math.sign(p.spin) * Math.abs(p.fall) * .55 * age;
  } else {
    const swing = p.swing ?? 0, s = Math.sin(a);
    const lateral = swing * (s - Math.sin(ph));
    x += lateral * Math.cos(heading);
    // Depth of the swing shows as height on screen (camera looks slightly down); the plate rises at the swing's ends.
    y += lateral * Math.sin(heading) * Math.sin(ELEVATION) - (p.lift ?? 0) * (s * s - Math.sin(ph) ** 2);
    pitch = (p.tilt ?? .6) * s;
  }
  return { x, y, pitch, heading };
}

/** Camera elevation for projecting plates, radians (looking a little down on the scene). */
export const ELEVATION = .5;

export interface PlateKey { rotate: number; scaleX: number; scaleY: number; shear: number }

/**
 * Project a flat part drawn along local +x (tip) with its width along local +y, pitched by `pitch` (counter-clockwise on
 * screen, radians) within a vertical plane at `heading` to the picture plane and rolled by `roll` about its own length,
 * to a bone rotation, scale and shear. A mirrored result (scaleX < 0) means the back face is toward the camera.
 */
export function projectPlate(pitch: number, heading: number, roll = 0, elevation = ELEVATION): PlateKey {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), ch = Math.cos(heading), sh = Math.sin(heading);
  // 3D (x right, y up, z toward the camera): length axis t, width axis s (rolled about t).
  const t = [cp * ch, sp, cp * sh];
  const s0 = [-sh, 0, ch], n0 = [t[1] * s0[2] - t[2] * s0[1], t[2] * s0[0] - t[0] * s0[2], t[0] * s0[1] - t[1] * s0[0]];
  const cr = Math.cos(roll), sr = Math.sin(roll), s = [0, 1, 2].map(i => s0[i] * cr + n0[i] * sr);
  // Camera tilted down by `elevation`: screen up = y·cos e − z·sin e. Screen y points down.
  const ce = Math.cos(elevation), se = Math.sin(elevation);
  const X = [t[0], -(t[1] * ce - t[2] * se)], Y = [s[0], -(s[1] * ce - s[2] * se)];
  const sy = Math.hypot(Y[0], Y[1]) || 1e-6, r = Math.atan2(-Y[0], Y[1]), c = Math.cos(r), sn = Math.sin(r);
  let sx = c * X[0] + sn * X[1];
  const kysx = -sn * X[0] + c * X[1];
  if (Math.abs(sx) < .04) sx = sx < 0 ? -.04 : .04;
  const shear = Math.max(-25, Math.min(25, kysx / sx));
  return { rotate: r * 180 / Math.PI, scaleX: sx, scaleY: sy, shear };
}

/** Small seeded generator (mulberry32) for per-particle parameters. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
