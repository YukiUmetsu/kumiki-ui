/** Ground-contact markers measured from a looping locomotion clip, and a scheduler that fires them.
 *
 * Works with any rigged glTF: give each limb a bone and a few sole points in that bone's frame. The clip
 * is sampled once at load (default 1 kHz); a contact starts when the lowest sole point comes within
 * `enter` of the ground plane and ends when it rises above `exit` (hysteresis, so a grazing hoof does
 * not chatter). Crossing times are interpolated between samples, so markers are exact to well under a
 * millisecond whatever the render frame rate.
 *
 * At run time, `forEachCrossed(from, to)` visits every marker the mixer passed between two clip times,
 * handling the loop wrap and several loops in one long frame. Audio uses it with a one-frame lookahead
 * to schedule sample-accurate hits; visuals use it on the frame the contact appears.
 */
import { AnimationMixer, Matrix4, Vector3 } from "three";
import type { AnimationClip, Object3D } from "three";
import type { Vec3 } from "./sdf-sculpt";

export interface ContactLimb {
  /** Bone (node) name in the loaded model. */
  bone: string;
  /** Sole points in the bone's local frame (toe, heel …). */
  points: readonly Vec3[];
}

export interface GaitContactMarker {
  limb: string;
  kind: "land" | "lift";
  /** Clip time in seconds. */
  time: number;
  /** Lowest sole point at the marker, in the model root's space (metres). */
  position: Vector3;
}

export interface GaitContactTrack {
  clip: string;
  duration: number;
  /** Sorted by time. */
  markers: readonly GaitContactMarker[];
  /** Fraction of the loop each limb spends on the ground. */
  duty: Record<string, number>;
}

export interface MeasureContactsOptions {
  sampleRate?: number;
  groundY?: number;
  /** Contact begins within this height of the ground (m). Default 6 mm. */
  enter?: number;
  /** Contact ends above this height (m). Default 15 mm. */
  exit?: number;
}

/**
 * Sample `clip` on `root` and return its contact markers. The root's pose is restored to the clip's
 * time 0 afterwards; run this before the model is shown or animated.
 */
export function measureGaitContacts(root: Object3D, clip: AnimationClip, limbs: Readonly<Record<string, ContactLimb>>,
  options: MeasureContactsOptions = {}): GaitContactTrack {
  const rate = options.sampleRate ?? 1000, ground = options.groundY ?? 0;
  const enter = ground + (options.enter ?? .006), exit = ground + (options.exit ?? .015);
  const mixer = new AnimationMixer(root);
  const action = mixer.clipAction(clip);
  action.play();
  const bones = Object.entries(limbs).map(([limb, spec]) => {
    const bone = root.getObjectByName(spec.bone);
    if (!bone) throw new Error(`Contact limb "${limb}": no node named "${spec.bone}".`);
    return { limb, bone, points: spec.points.map(p => new Vector3(...p)) };
  });
  const rootInverse = new Matrix4(), local = new Matrix4(), p = new Vector3();
  const lowest = (b: (typeof bones)[number], out: Vector3) => {
    local.multiplyMatrices(rootInverse, b.bone.matrixWorld);
    let y = Infinity;
    for (const point of b.points) {
      p.copy(point).applyMatrix4(local);
      if (p.y < y) { y = p.y; out.copy(p); }
    }
    return y;
  };
  const samples = Math.max(8, Math.ceil(clip.duration * rate));
  const heights = bones.map(() => new Float64Array(samples + 1));
  const positions = bones.map(() => Array.from({ length: samples + 1 }, () => new Vector3()));
  for (let i = 0; i <= samples; i++) {
    mixer.setTime(clip.duration * i / samples);
    root.updateMatrixWorld(true);
    rootInverse.copy(root.matrixWorld).invert();
    bones.forEach((b, k) => { heights[k][i] = lowest(b, positions[k][i]); });
  }
  action.stop(); mixer.uncacheRoot(root);
  const markers: GaitContactMarker[] = [], duty: Record<string, number> = {};
  bones.forEach((b, k) => {
    const h = heights[k];
    // Start the hysteresis from the last definite state before the loop wraps to time 0.
    let down = false;
    for (let i = samples; i >= 0; i--) { if (h[i] < enter) { down = true; break; } if (h[i] > exit) break; }
    let onTime = 0, landedAt = down ? 0 : -1;
    for (let i = 1; i <= samples; i++) {
      const crossing = down ? h[i] > exit && h[i - 1] <= exit : h[i] < enter && h[i - 1] >= enter;
      if (!crossing) continue;
      const level = down ? exit : enter, f = (level - h[i - 1]) / (h[i] - h[i - 1]);
      const time = clip.duration * (i - 1 + f) / samples;
      down = !down;
      markers.push({ limb: b.limb, kind: down ? "land" : "lift", time, position: positions[k][i - 1].clone().lerp(positions[k][i], f) });
      if (down) landedAt = time; else if (landedAt >= 0) { onTime += time - landedAt; landedAt = -1; }
    }
    if (down && landedAt >= 0) onTime += clip.duration - landedAt;
    duty[b.limb] = onTime / clip.duration;
  });
  markers.sort((a, b) => a.time - b.time);
  return { clip: clip.name, duration: clip.duration, markers, duty };
}

/**
 * Visit markers crossed when a looping clip advanced from clip time `from` to `to` (seconds, `to` ≥ `from`
 * in unwrapped time). The callback gets the marker and how far past it `to` is, in clip seconds.
 */
export function forEachCrossed(track: GaitContactTrack, from: number, to: number,
  visit: (marker: GaitContactMarker, sinceMarker: number) => void): void {
  if (!(to > from) || !track.markers.length) return;
  const d = track.duration;
  const startLoop = Math.floor(from / d), endLoop = Math.floor(to / d);
  for (let loop = startLoop; loop <= endLoop; loop++) {
    const base = loop * d;
    for (const marker of track.markers) {
      const t = base + marker.time;
      if (t > from && t <= to) visit(marker, to - t);
    }
  }
}
