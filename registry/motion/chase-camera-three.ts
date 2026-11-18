/** A damped chase / tracking camera for fast subjects (riders, vehicles, animals), for Three.js.
 *
 * Camera language, after film practice for horses at speed: a low camera on a car running parallel
 * with a long lens ("low and long"), a three-quarter chase from behind, a retreating low front shot,
 * and a hoof-height pass. Each `ChaseFraming` is an offset in the subject's frame (+X forward, +Y up,
 * +Z the subject's left), a look point and a lens.
 *
 * - Position and look point follow critically damped springs, so the camera lags and settles without
 *   overshoot, and never moves rigidly with the subject. The chase half-life of 0.16 s is about a
 *   per-frame lerp of 0.07 at 60 fps (`halfLifeToLerp`); unlike a lerp, the spring keeps the camera's
 *   velocity continuous, so a framing change or a turn never jerks.
 * - Field of view widens with speed and with forward acceleration (a "speed punch"), smoothed.
 * - Shake: a low handheld drift that grows with speed, plus impact trauma (Eiserloh, "Juicing Your
 *   Cameras With Math", GDC 2016): each footfall adds trauma; the visible shake is trauma² × smooth
 *   gradient noise, so small hits stay subtle. Noise is Perlin-style and seeded, never random per frame.
 * - Free view: `orbit` turns the framing round its look point (in the subject's frame, so it keeps following) and
 *   `zoom` moves it nearer or farther; choosing a framing resets both. `subjectScale` scales every framing for a
 *   larger or smaller subject.
 * - Everything is driven by `update(dt, subject)`: no clocks, no allocations per frame.
 */
import { MathUtils, Quaternion, Vector3 } from "three";
import type { PerspectiveCamera } from "three";
import { gradNoise } from "../anatomy/foundation-raster";

export type ChaseFramingId = "chase" | "tracking" | "front" | "hoof";

export interface ChaseFraming {
  /** Camera position in the subject's frame (metres). */
  offset: readonly [number, number, number];
  /** Look point in the subject's frame. */
  look: readonly [number, number, number];
  /** Vertical field of view at rest (degrees). */
  fov: number;
  /** Position and look half-lives (s): how quickly the camera catches up. */
  positionHalfLife: number;
  lookHalfLife: number;
  /** Scales handheld drift and impact shake for this framing (a car mount is steadier than a hand). */
  shake: number;
}

export const CHASE_FRAMINGS: Readonly<Record<ChaseFramingId, ChaseFraming>> = {
  // Three-quarter from behind on the near side, a little low: the classic chase.
  chase: { offset: [-4.8, 1.5, 2.5], look: [1.4, 1.25, 0], fov: 38, positionHalfLife: .16, lookHalfLife: .08, shake: 1 },
  // Camera car alongside: low and long, the subject held in profile with lead room ahead.
  tracking: { offset: [.6, 1.0, 13], look: [1.0, 1.15, 0], fov: 21, positionHalfLife: .22, lookHalfLife: .1, shake: .55 },
  // Retreating low front shot: the horse charges the lens.
  front: { offset: [10, .7, 1.6], look: [0, 1.15, 0], fov: 30, positionHalfLife: .2, lookHalfLife: .09, shake: .8 },
  // At hoof height beside the legs, for footfalls and dust.
  hoof: { offset: [-.6, .32, 2.6], look: [.6, .45, 0], fov: 48, positionHalfLife: .12, lookHalfLife: .06, shake: 1.2 },
};

export interface ChaseCameraOptions {
  framing?: ChaseFramingId | ChaseFraming;
  /** Speed at which FOV, drift and shake reach their nominal values (m/s). */
  referenceSpeed?: number;
  /** Extra FOV at the reference speed and per m/s² of forward acceleration, capped by `maxFovBoost` (degrees). */
  fovPerSpeed?: number;
  fovPerAccel?: number;
  maxFovBoost?: number;
  fovHalfLife?: number;
  /** Handheld drift at the reference speed: position (m) and rotation (rad) amplitudes, frequency (Hz). */
  drift?: { position: number; rotation: number; frequency: number };
  /** Impact shake at trauma 1: position (m), rotation (rad), frequency (Hz); trauma decay per second. */
  impact?: { position: number; rotation: number; frequency: number; decay: number };
  seed?: number;
}

export interface ChaseSubject {
  position: Vector3;
  /** The subject's orientation (its +X is forward). */
  quaternion: Quaternion;
  /** World velocity (m/s). */
  velocity: Vector3;
}

/**
 * Critically damped spring toward a target, exact for any dt. `halfLife` is the time a displacement takes
 * to halve from rest: (1 + ωh)·e^(−ωh) = ½ gives ω = 1.678 / h.
 */
function springStep(x: Vector3, v: Vector3, target: Vector3, halfLife: number, dt: number) {
  const omega = 1.678 / Math.max(1e-4, halfLife), exp = Math.exp(-omega * dt);
  const dx = x.x - target.x, dy = x.y - target.y, dz = x.z - target.z;
  // x(t) = target + (d + (v + ω d) t) e^(−ωt);  v(t) = (v − ω (v + ω d) t) e^(−ωt)
  const jx = (v.x + omega * dx) * dt, jy = (v.y + omega * dy) * dt, jz = (v.z + omega * dz) * dt;
  x.set(target.x + (dx + jx) * exp, target.y + (dy + jy) * exp, target.z + (dz + jz) * exp);
  v.set((v.x - omega * jx) * exp, (v.y - omega * jy) * exp, (v.z - omega * jz) * exp);
}

export class ChaseCamera {
  readonly camera: PerspectiveCamera;
  framing: ChaseFraming;
  private readonly o: Required<Omit<ChaseCameraOptions, "framing">>;
  private readonly pos = new Vector3();
  private readonly vel = new Vector3();
  private readonly look = new Vector3();
  private readonly lookVel = new Vector3();
  private readonly tmp = new Vector3();
  private readonly target = new Vector3();
  private readonly lookTarget = new Vector3();
  private readonly lastVelocity = new Vector3();
  private fovBoost = 0;
  private trauma = 0;
  private time = 0;
  private started = false;
  private yaw = 0; private pitch = 0; private zoomK = 1;
  private readonly rel = new Vector3();
  /** Multiplies every framing's offset and look point (a bigger subject needs a farther camera). */
  subjectScale = 1;

  constructor(camera: PerspectiveCamera, options: ChaseCameraOptions = {}) {
    this.camera = camera;
    this.framing = typeof options.framing === "object" ? options.framing : CHASE_FRAMINGS[options.framing ?? "chase"];
    this.o = {
      referenceSpeed: options.referenceSpeed ?? 12,
      fovPerSpeed: options.fovPerSpeed ?? 4,
      fovPerAccel: options.fovPerAccel ?? .9,
      maxFovBoost: options.maxFovBoost ?? 9,
      fovHalfLife: options.fovHalfLife ?? .35,
      drift: options.drift ?? { position: .035, rotation: .006, frequency: .55 },
      impact: options.impact ?? { position: .03, rotation: .012, frequency: 17, decay: 2.2 },
      seed: options.seed ?? 7,
    };
  }

  /** Switch framing; `cut` jumps there at once (an edit), otherwise the springs carry the camera over. */
  setFraming(framing: ChaseFramingId | ChaseFraming, cut = false) {
    this.framing = typeof framing === "object" ? framing : CHASE_FRAMINGS[framing];
    this.resetView();
    if (cut) this.started = false;
  }

  /** Turn the framing round its look point: `yaw` about the vertical, `pitch` up (radians, added). */
  orbit(yaw: number, pitch: number) {
    this.yaw += yaw;
    this.pitch = MathUtils.clamp(this.pitch + pitch, -1.4, 1.4);
  }
  /** Move nearer (factor < 1) or farther (> 1), between 0.15 and 4 times the framing's distance. */
  zoom(factor: number) { this.zoomK = MathUtils.clamp(this.zoomK * factor, .15, 4); }
  /** Back to the framing as designed. */
  resetView() { this.yaw = 0; this.pitch = 0; this.zoomK = 1; }
  /** True while the view is turned or zoomed away from the framing. */
  get viewChanged() { return this.yaw !== 0 || this.pitch !== 0 || this.zoomK !== 1; }

  /** Add impact trauma (0–1), e.g. on each hoof strike scaled by its force. */
  addTrauma(amount: number) { this.trauma = Math.min(1, this.trauma + Math.max(0, amount)); }

  /** Current extra field of view (degrees), for driving speed blur. */
  get speedPunch() { return this.fovBoost / this.o.maxFovBoost; }

  update(dt: number, subject: ChaseSubject) {
    const f = this.framing, o = this.o;
    dt = Math.min(Math.max(dt, 0), .1);
    this.time += dt;
    // Desired camera and look point in the world: the framing's offset, turned and zoomed round the look point.
    const scale = this.subjectScale;
    this.rel.set(f.offset[0] - f.look[0], f.offset[1] - f.look[1], f.offset[2] - f.look[2]);
    if (this.viewChanged) {
      const flat = Math.hypot(this.rel.x, this.rel.z), elevation = MathUtils.clamp(Math.atan2(this.rel.y, flat) + this.pitch, -.25, 1.45);
      const azimuth = Math.atan2(this.rel.z, this.rel.x) - this.yaw, r = this.rel.length() * this.zoomK;
      this.rel.set(Math.cos(elevation) * Math.cos(azimuth) * r, Math.sin(elevation) * r, Math.cos(elevation) * Math.sin(azimuth) * r);
    }
    this.target.set(f.look[0] + this.rel.x, f.look[1] + this.rel.y, f.look[2] + this.rel.z).multiplyScalar(scale).applyQuaternion(subject.quaternion).add(subject.position);
    this.lookTarget.set(...f.look).multiplyScalar(scale).applyQuaternion(subject.quaternion).add(subject.position);
    if (!this.started) {
      this.pos.copy(this.target); this.vel.copy(subject.velocity);
      this.look.copy(this.lookTarget); this.lookVel.copy(subject.velocity);
      this.lastVelocity.copy(subject.velocity); this.started = true;
    }
    springStep(this.pos, this.vel, this.target, f.positionHalfLife, dt);
    springStep(this.look, this.lookVel, this.lookTarget, f.lookHalfLife, dt);

    // FOV: speed plus positive forward acceleration, smoothed.
    const speed = subject.velocity.length();
    const forward = this.tmp.set(1, 0, 0).applyQuaternion(subject.quaternion);
    const accel = dt > 0 ? (subject.velocity.dot(forward) - this.lastVelocity.dot(forward)) / dt : 0;
    this.lastVelocity.copy(subject.velocity);
    const want = Math.min(o.maxFovBoost, o.fovPerSpeed * (speed / o.referenceSpeed) + o.fovPerAccel * Math.max(0, accel));
    this.fovBoost += (want - this.fovBoost) * (1 - Math.exp(-Math.LN2 * dt / o.fovHalfLife));

    // Shake: handheld drift grows with speed²; impact trauma decays linearly and shows as trauma².
    this.trauma = Math.max(0, this.trauma - o.impact.decay * dt);
    const k = Math.min(1.6, (speed / o.referenceSpeed) ** 2) * f.shake, shock = this.trauma * this.trauma * f.shake;
    const n = (channel: number, freq: number) => gradNoise(o.seed + channel * 101, this.time * freq, channel * 7.31);
    const dp = o.drift.position * k, dr = o.drift.rotation * k, ip = o.impact.position * shock, ir = o.impact.rotation * shock;
    const df = o.drift.frequency, inf = o.impact.frequency;
    this.camera.position.set(
      this.pos.x + dp * n(0, df) + ip * n(3, inf),
      this.pos.y + dp * n(1, df * 1.3) + ip * n(4, inf * 1.1),
      this.pos.z + dp * n(2, df * .9) + ip * n(5, inf * .9));
    this.camera.lookAt(this.look);
    this.camera.rotateZ(dr * n(6, df * .8) + ir * n(7, inf));
    this.camera.rotateX(dr * .6 * n(8, df) + ir * .7 * n(9, inf * 1.2));
    const fov = f.fov + this.fovBoost;
    if (Math.abs(this.camera.fov - fov) > 1e-3) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
  }
}

/** Equivalent per-frame lerp factor of a half-life at a frame rate (for comparing with lerp-style followers). */
export const halfLifeToLerp = (halfLife: number, fps = 60) => 1 - Math.pow(.5, 1 / (halfLife * fps));
export const lerpToHalfLife = (lerp: number, fps = 60) => -1 / (fps * Math.log2(1 - MathUtils.clamp(lerp, 1e-6, .999999)));
