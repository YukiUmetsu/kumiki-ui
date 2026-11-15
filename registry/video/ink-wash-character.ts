/**
 * INK3: paper-space placement for the existing versioned 2D/2.5D character rig.
 * Deliberately owns no gestures, blink, facial cues, visemes or playback clock:
 * those belong to registry/character/evaluate.ts.
 */
export interface InkActorKey {
  frame: number;
  /** Stage-space feet position in pixels. */
  x: number;
  y: number;
  /** Character scale multiplier, strictly positive. */
  scale: number;
  /** Clockwise character orientation in degrees. */
  rotation?: number;
  /** Facing mirrors the approved art horizontally, not its animation cues. */
  facing?: "left" | "right";
}
export interface InkActorTrack {
  id: string;
  /** Existing character instance id, never an implicit generated rig. */
  instanceId: string;
  keys: readonly InkActorKey[];
  /** Linear spacing preserves velocity in a pre-sampled C1 spline. Default smooth for authored sparse tracks. */
  interpolation?: "smooth" | "linear";
}
export interface InkActorTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  facing: "left" | "right";
}
const safe = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;
const smooth = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t*t*(3-2*t); };
export function assertInkActorTrack(track: InkActorTrack): void {
  if (!track || !/^[a-z][a-z0-9_-]{0,63}$/i.test(track.id) ||
      !/^[a-z][a-z0-9._-]{0,63}$/i.test(track.instanceId) ||
      (!["smooth","linear",undefined].includes(track.interpolation)) ||
      !Array.isArray(track.keys) || !track.keys.length || track.keys.length > 512)
    throw new RangeError("INK3 needs safe track/instance IDs and 1..512 location keys.");
  let prev = -1;
  for (const k of track.keys) {
    if (!k || !Number.isSafeInteger(k.frame) || k.frame <= prev || k.frame > 360000 ||
        !safe(k.x, -16384, 16384) || !safe(k.y, -16384, 16384) || !safe(k.scale, .02, 32) ||
        (k.rotation !== undefined && !safe(k.rotation, -360, 360)) ||
        (k.facing !== undefined && k.facing !== "left" && k.facing !== "right"))
      throw new RangeError("INK3 keys must have increasing nonnegative frames and finite bounded poses.");
    prev = k.frame;
  }
}
/** Seek-stable interpolation; facing changes at a key, never during a mirrored tween. */
export function inkActorAt(track: InkActorTrack, frame: number, reducedMotion = false): InkActorTransform {
  assertInkActorTrack(track);
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("INK3 requires a nonnegative integer frame.");
  const keys = track.keys;
  const f = reducedMotion ? keys[keys.length - 1].frame : frame;
  const pose = (k: InkActorKey): InkActorTransform => ({
    x:k.x,y:k.y,scale:k.scale,rotation:k.rotation ?? 0,facing:k.facing ?? "right",
  });
  if (f <= keys[0].frame) return pose(keys[0]);
  for (let i=1;i<keys.length;i++) {
    const b=keys[i],a=keys[i-1];
    if (f > b.frame) continue;
    const ratio=(f-a.frame)/(b.frame-a.frame);
    const t=track.interpolation==="linear" ? ratio : smooth(ratio);
    const mix=(x:number,y:number)=>x+(y-x)*t;
    return {x:mix(a.x,b.x),y:mix(a.y,b.y),
      scale:Math.exp(mix(Math.log(a.scale),Math.log(b.scale))),
      rotation:mix(a.rotation ?? 0,b.rotation ?? 0),
      facing:f < b.frame ? (a.facing ?? "right") : (b.facing ?? "right")};
  }
  return pose(keys[keys.length-1]);
}
