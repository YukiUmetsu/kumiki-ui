/**
 * Portable, frame-addressed transforms from an offline physics bake (Blender,
 * Bullet, etc.). No solver or wall clock is needed in the video renderer.
 * Coordinates are glTF local-space, Y-up, meters; rotations are XYZW quaternions.
 */
export type BakedVec3 = readonly [number, number, number];
export type BakedQuaternion = readonly [number, number, number, number];

export interface BakedTransformKey {
  /** Fractional 30-fps reference frame; keys are strictly increasing. */
  frame: number;
  /** Absolute local-space translation and rotation, not offsets from rest. */
  position: BakedVec3;
  rotation: BakedQuaternion;
  /** Optional absolute local-space scale; defaults to [1,1,1]. */
  scale?: BakedVec3;
}

export interface BakedPhysicalTrack {
  /** A canonical kumiki:role:N ID, or a role resolving to one node. */
  target: string;
  /** Step prevents tweening through a deliberate teleport/visibility cut. */
  interpolation?: "linear" | "step";
  keys: readonly BakedTransformKey[];
}

export interface BakedContactCue {
  /** Contact time in fractional 30-fps reference frames. */
  frame: number;
  target: string;
  speedMps: number;
  /** Optional semantic SFX key, not a URL or arbitrary audio data. */
  material?: string;
}

export interface BakedPhysicalActionSpec {
  schemaVersion: 1;
  id: string;
  label?: string;
  durationFrames: number;
  /** Imported glTF action to play before overriding specified node transforms. */
  sourceActionId?: string;
  tracks: readonly BakedPhysicalTrack[];
  contacts?: readonly BakedContactCue[];
}

export interface BakedTransformSample {
  position: BakedVec3;
  rotation: BakedQuaternion;
  scale: BakedVec3;
}

export interface BakedContactEvent extends BakedContactCue {
  timeSeconds: number;
}

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,100}$/;
function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function finite(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`${label} must be finite between ${min} and ${max}.`);
  return value;
}
function id(value: unknown, label: string): string {
  if (typeof value !== "string" || !idPattern.test(value)) throw new Error(`${label} must be a safe identifier.`);
  return value;
}
function vec3(value: unknown, label: string, min: number, max: number): BakedVec3 {
  if (!Array.isArray(value) || value.length !== 3) throw new Error(`${label} must be a 3D vector.`);
  return [finite(value[0], `${label}[0]`, min, max), finite(value[1], `${label}[1]`, min, max),
    finite(value[2], `${label}[2]`, min, max)];
}
function quat(value: unknown, label: string): BakedQuaternion {
  if (!Array.isArray(value) || value.length !== 4) throw new Error(`${label} must be an XYZW quaternion.`);
  const parts = [0, 1, 2, 3].map(i => finite(value[i], `${label}[${i}]`, -1, 1));
  const norm = Math.hypot(...parts);
  if (norm < 1e-6 || norm < .9 || norm > 1.1) throw new Error(`${label} must be a unit quaternion.`);
  return parts.map(v => v / norm) as unknown as BakedQuaternion;
}

/** Validate untrusted exported JSON before resolving any Three.js objects. */
export function validateBakedPhysicalActions(value: unknown): BakedPhysicalActionSpec[] {
  if (!Array.isArray(value) || value.length > 32) throw new Error("Baked actions require an array of at most 32 actions.");
  const ids = new Set<string>();
  let totalKeys = 0;
  return value.map((raw, actionIndex) => {
    const a = record(raw, `bakedActions[${actionIndex}]`), name = id(a.id, `bakedActions[${actionIndex}].id`);
    if (a.schemaVersion !== 1) throw new Error(`Baked action "${name}" requires schemaVersion 1.`);
    if (ids.has(name)) throw new Error(`Duplicate baked action ID "${name}".`);
    ids.add(name);
    const durationFrames = finite(a.durationFrames, `${name}.durationFrames`, 1, 3600);
    if (!Number.isInteger(durationFrames)) throw new Error(`${name}.durationFrames must be an integer.`);
    if (a.label !== undefined && (typeof a.label !== "string" || !a.label.trim() || a.label.length > 100))
      throw new Error(`${name}.label must be short nonempty text.`);
    if (!Array.isArray(a.tracks) || a.tracks.length < 1 || a.tracks.length > 128)
      throw new Error(`${name}.tracks requires 1–128 tracks.`);
    const targets = new Set<string>();
    const tracks = a.tracks.map((rawTrack, trackIndex): BakedPhysicalTrack => {
      const label = `${name}.tracks[${trackIndex}]`, t = record(rawTrack, label);
      const target = id(t.target, `${label}.target`);
      if (targets.has(target)) throw new Error(`${name} has duplicate baked target "${target}".`);
      targets.add(target);
      if (t.interpolation !== undefined && t.interpolation !== "linear" && t.interpolation !== "step")
        throw new Error(`${label}.interpolation must be linear or step.`);
      if (!Array.isArray(t.keys) || t.keys.length < 1 || t.keys.length > 3601)
        throw new Error(`${label}.keys requires 1–3601 samples.`);
      totalKeys += t.keys.length;
      if (totalKeys > 120_000) throw new Error("Baked actions exceed the 120,000-key budget.");
      let lastFrame = -1;
      const keys = t.keys.map((rawKey, keyIndex): BakedTransformKey => {
        const keyLabel = `${label}.keys[${keyIndex}]`, k = record(rawKey, keyLabel);
        const frame = finite(k.frame, `${keyLabel}.frame`, 0, durationFrames);
        if (frame <= lastFrame) throw new Error(`${keyLabel}.frame must be strictly increasing.`);
        lastFrame = frame;
        return { frame, position: vec3(k.position, `${keyLabel}.position`, -1000, 1000),
          rotation: quat(k.rotation, `${keyLabel}.rotation`),
          ...(k.scale === undefined ? {} : { scale: vec3(k.scale, `${keyLabel}.scale`, 0, 100) }) };
      });
      if (keys[0].frame !== 0) throw new Error(`${label}.keys must start at reference frame 0.`);
      return { target, interpolation: t.interpolation === "step" ? "step" : "linear", keys };
    });
    if (a.contacts !== undefined && (!Array.isArray(a.contacts) || a.contacts.length > 4096))
      throw new Error(`${name}.contacts must contain at most 4096 cues.`);
    const contacts = (a.contacts ?? [] as unknown[]).map((rawContact, index): BakedContactCue => {
      const label = `${name}.contacts[${index}]`, c = record(rawContact, label);
      const material = c.material === undefined ? undefined : id(c.material, `${label}.material`);
      return { frame: finite(c.frame, `${label}.frame`, 0, durationFrames),
        target: id(c.target, `${label}.target`), speedMps: finite(c.speedMps, `${label}.speedMps`, 0, 500),
        ...(material ? { material } : {}) };
    });
    return { schemaVersion: 1, id: name, durationFrames, tracks,
      ...(a.label === undefined ? {} : { label: a.label as string }),
      ...(a.sourceActionId === undefined ? {} : { sourceActionId: id(a.sourceActionId, `${name}.sourceActionId`) }),
      contacts: contacts.sort((x, y) => x.frame - y.frame),
    };
  });
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function quaternionSlerp(a: BakedQuaternion, b: BakedQuaternion, t: number): BakedQuaternion {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const sign = dot < 0 ? -1 : 1;
  const aligned = b.map(x => x * sign);
  const cos = Math.min(1, Math.max(-1, Math.abs(dot)));
  let aWeight: number, bWeight: number;
  if (cos > .9995) { aWeight = 1 - t; bWeight = t; }
  else { const theta = Math.acos(cos), sin = Math.sin(theta);
    aWeight = Math.sin((1 - t) * theta) / sin; bWeight = Math.sin(t * theta) / sin; }
  const q = a.map((x, i) => aWeight * x + bWeight * aligned[i]);
  const length = Math.hypot(...q);
  return q.map(x => x / length) as unknown as BakedQuaternion;
}

/** Stateless interpolation; exact at integer and fractional source frames. */
export function sampleBakedPhysicalTrack(track: BakedPhysicalTrack, referenceFrame: number): BakedTransformSample {
  if (!Number.isFinite(referenceFrame)) throw new Error("Baked sample frame must be finite.");
  const keys = track.keys;
  if (!keys.length) throw new Error("Baked physical track has no keys.");
  const frame = Math.max(keys[0].frame, Math.min(keys[keys.length - 1].frame, referenceFrame));
  let lo = 0, hi = keys.length - 1;
  while (lo < hi) { const mid = Math.floor((lo + hi + 1) / 2);
    if (keys[mid].frame <= frame) lo = mid; else hi = mid - 1; }
  const before = keys[lo], after = keys[Math.min(lo + 1, keys.length - 1)];
  const t = before === after || track.interpolation === "step" ? 0
    : (frame - before.frame) / (after.frame - before.frame);
  const lerpVec = (a: BakedVec3, b: BakedVec3): BakedVec3 =>
    [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  return { position: lerpVec(before.position, after.position),
    rotation: quaternionSlerp(before.rotation, after.rotation, t),
    scale: lerpVec(before.scale ?? [1, 1, 1], after.scale ?? [1, 1, 1]) };
}

/** Explicit offline contact cues for SFX, frame-exact even when preview fps changes. */
export function contactEventsForBakedAction(action: BakedPhysicalActionSpec, fps = 30): BakedContactEvent[] {
  if (!Number.isFinite(fps) || fps <= 0 || fps > 240) throw new Error("Baked event fps must be in (0, 240].");
  return (action.contacts ?? []).map(c => ({ ...c, frame: c.frame * fps / 30, timeSeconds: c.frame / 30 }));
}
