/**
 * INK3 — frame-addressed character performance for independently authored
 * ink-painted parts. FilmStage owns the clock, the host owns actual character art.
 * This layer is a style adapter, not a parallel skeletal renderer or lip-sync engine.
 */
export type InkActorRole =
  | "body" | "head" | "left-arm" | "right-arm" | "left-leg" | "right-leg"
  | "eyes" | "mouth" | "hair" | "garment" | "prop" | "detail";
export type InkViseme = "closed" | "open" | "wide" | "round";
export const INK_VISEMES: readonly InkViseme[] = ["closed", "open", "wide", "round"];
export type InkVec2 = readonly [number, number];

export interface InkActorPart {
  /** Stable identity across every scene and revision. */
  id: string;
  role: InkActorRole;
  parent?: string;
  /** Pivot in the shared, unposed actor art coordinate system. */
  pivot: InkVec2;
  /** Art is drawn in the actor's original viewBox, not local sprite coordinates. */
  order?: number;
}
export interface InkActorRig {
  id: string;
  revision: string;
  width: number;
  height: number;
  parts: readonly InkActorPart[];
  /** Character only is sampled on twos/ones, independent from a fluid film camera. */
  cadence?: 1 | 2 | 3;
}
interface InkCueBase {
  id: string;
  startFrame: number;
  durationFrames: number;
}
export type InkActorCue =
  | (InkCueBase & { kind: "travel"; from: InkVec2; to: InkVec2; steps?: number })
  | (InkCueBase & { kind: "gesture"; arm: "left-arm" | "right-arm"; gesture: "point" | "wave" | "raise"; degrees?: number })
  | (InkCueBase & { kind: "blink" })
  | (InkCueBase & { kind: "gaze"; target: InkVec2 })
  | (InkCueBase & { kind: "nod"; degrees?: number })
  | (InkCueBase & { kind: "speech"; visemes: readonly { frame: number; shape: InkViseme }[] });
export interface InkActorIssue {
  path: string;
  message: string;
}
export interface InkPartPose {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}
export interface InkActorFrame {
  id: string;
  revision: string;
  frame: number;
  sampledFrame: number;
  root: InkVec2;
  poses: Readonly<Record<string, InkPartPose>>;
  blink: boolean;
  viseme: InkViseme;
  activeCueIds: readonly string[];
}
const validId = (s: unknown): s is string => typeof s === "string" && /^[a-zA-Z0-9][\w.-]{0,79}$/.test(s);
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const vec = (v: unknown): v is InkVec2 => Array.isArray(v) && v.length === 2 && v.every(n => finite(n) && Math.abs(n) <= 16384);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const ease = (t: number) => { const v = clamp01(t); return v * v * (3 - 2 * v); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function envelope(t: number) {
  const u = clamp01(t);
  return u < .22 ? ease(u / .22) : u < .68 ? 1 : 1 - ease((u - .68) / .32);
}
function channel(c: InkActorCue): string {
  return c.kind === "gesture" ? "gesture:" + c.arm : c.kind;
}
function partRoles(rig: InkActorRig): Set<InkActorRole> {
  return new Set(rig.parts.map(p => p.role));
}
export function inspectInkActor(rig: InkActorRig, cues: readonly InkActorCue[]): InkActorIssue[] {
  const issues: InkActorIssue[] = [];
  const err = (path: string, message: string) => issues.push({ path, message });
  if (!rig || !validId(rig.id) || !validId(rig.revision)) {
    err("/rig", "A stable character ID and explicit rig revision are required.");
    return issues;
  }
  if (![rig.width, rig.height].every(n => Number.isSafeInteger(n) && n >= 100 && n <= 8192))
    err("/rig/size", "Actor art dimensions must be 100–8192 px.");
  if (rig.cadence !== undefined && ![1, 2, 3].includes(rig.cadence))
    err("/rig/cadence", "Actor cadence must be 1, 2 or 3.");
  if (!Array.isArray(rig.parts) || rig.parts.length < 1 || rig.parts.length > 120) {
    err("/rig/parts", "Provide 1–120 independently authored parts.");
    return issues;
  }
  const ids = new Set<string>();
  const legalRoles: InkActorRole[] = ["body","head","left-arm","right-arm","left-leg","right-leg","eyes","mouth","hair","garment","prop","detail"];
  for (const [i,p] of rig.parts.entries()) {
    if (!p || !validId(p.id) || ids.has(p.id)) err("/rig/parts/" + i + "/id", "Part IDs must be unique.");
    else ids.add(p.id);
    if (!p || !legalRoles.includes(p.role)) err("/rig/parts/" + i + "/role", "Unknown part role.");
    if (!p || !vec(p.pivot)) err("/rig/parts/" + i + "/pivot", "Pivot must contain two finite sheet coordinates.");
    if (p?.order !== undefined && (!Number.isSafeInteger(p.order) || Math.abs(p.order) > 1000))
      err("/rig/parts/" + i + "/order", "Layer order must be a bounded integer.");
  }
  // Children are evaluated in dependency order; reject broken and cyclic hierarchies.
  const index = new Map(rig.parts.map(p => [p.id, p]));
  for (const [i,p] of rig.parts.entries()) {
    if (p.parent !== undefined && !index.has(p.parent)) err("/rig/parts/" + i + "/parent", "Parent part not found.");
    if (p.parent === p.id) err("/rig/parts/" + i + "/parent", "A part cannot parent itself.");
    let node: InkActorPart | undefined = p;
    const visited = new Set<string>();
    while (node?.parent && index.has(node.parent)) {
      if (visited.has(node.id)) { err("/rig/parts/" + i + "/parent", "Cyclic part hierarchy."); break; }
      visited.add(node.id);
      node = index.get(node.parent);
    }
  }
  if (!Array.isArray(cues) || cues.length > 240) {
    err("/cues", "Provide no more than 240 performance cues.");
    return issues;
  }
  const cuesById = new Set<string>(), roles = partRoles(rig);
  for (const [i,c] of cues.entries()) {
    const at = "/cues/" + i;
    if (!c || !validId(c.id) || cuesById.has(c.id)) err(at + "/id", "Cue ID must be unique.");
    else cuesById.add(c.id);
    if (!c || !Number.isSafeInteger(c.startFrame) || c.startFrame < 0 ||
        !Number.isSafeInteger(c.durationFrames) || c.durationFrames < 1 || c.durationFrames > 36000 ||
        c.startFrame + c.durationFrames > Number.MAX_SAFE_INTEGER) {
      err(at + "/timing", "Cues require finite nonnegative integer start and positive bounded duration.");
      continue;
    }
    if (c.kind === "travel") {
      if (!vec(c.from) || !vec(c.to)) err(at + "/travel", "From/to must be finite scene coordinates.");
      if (c.steps !== undefined && (!Number.isInteger(c.steps) || c.steps < 1 || c.steps > 24))
        err(at + "/steps", "Walk steps must be 1–24.");
      if (!roles.has("left-leg") || !roles.has("right-leg"))
        err(at + "/travel", "Walking needs both independently authored leg parts.");
    } else if (c.kind === "gesture") {
      if (!roles.has(c.arm)) err(at + "/arm", "A gesture requires an existing arm part.");
      if (!["point","wave","raise"].includes(c.gesture)) err(at + "/gesture", "Unknown gesture.");
      if (c.degrees !== undefined && (!finite(c.degrees) || Math.abs(c.degrees) > 100))
        err(at + "/degrees", "Arm gesture must remain inside ±100 degrees.");
    } else if (c.kind === "blink") {
      if (!roles.has("eyes")) err(at + "/blink", "Blink requires an eyes part.");
    } else if (c.kind === "gaze") {
      if (!vec(c.target) || c.target.some(n => Math.abs(n) > 1)) err(at + "/target", "Gaze target must be in normalized -1..1 coordinates.");
      if (!roles.has("head")) err(at + "/head", "Gaze requires a head part.");
    } else if (c.kind === "nod") {
      if (!roles.has("head")) err(at + "/head", "Nod requires a head part.");
      if (c.degrees !== undefined && (!finite(c.degrees) || Math.abs(c.degrees) > 18))
        err(at + "/degrees", "A nod is limited to ±18 degrees.");
    } else if (c.kind === "speech") {
      if (!roles.has("mouth")) err(at + "/mouth", "Speech requires an independent mouth part.");
      if (!Array.isArray(c.visemes) || c.visemes.length < 1 || c.visemes.length > 1000)
        err(at + "/visemes", "Speech needs bounded caller-aligned viseme timestamps.");
      else {
        let previous = -1;
        for (const [j,v] of c.visemes.entries()) {
          if (!v || !Number.isSafeInteger(v.frame) || v.frame <= previous || v.frame < 0 ||
              v.frame >= c.durationFrames || !INK_VISEMES.includes(v.shape))
            err(at + "/visemes/" + j, "Viseme frames must be strictly increasing and valid.");
          previous = v?.frame ?? previous;
        }
      }
    } else err(at + "/kind", "Unknown performance cue.");
  }
  for (let i = 0; i < cues.length; i++) {
    const a = cues[i];
    if (!a || !Number.isSafeInteger(a.startFrame) || !Number.isSafeInteger(a.durationFrames)) continue;
    for (let j = i + 1; j < cues.length; j++) {
      const b = cues[j];
      if (!b || !Number.isSafeInteger(b.startFrame) || !Number.isSafeInteger(b.durationFrames)) continue;
      if (channel(a) === channel(b) && a.startFrame < b.startFrame + b.durationFrames &&
          b.startFrame < a.startFrame + a.durationFrames) {
        err("/cues/" + j, "Overlapping cues on the same performance channel require explicit retiming.");
      }
    }
  }
  return issues;
}
export function evaluateInkActor(
  rig: InkActorRig, cues: readonly InkActorCue[], frame: number, reducedMotion = false,
): InkActorFrame {
  const issues = inspectInkActor(rig, cues);
  if (issues.length) throw new Error("Invalid INK3 performance: " + issues.map(x => x.path + " " + x.message).join("; "));
  if (!Number.isSafeInteger(frame) || frame < 0) throw new RangeError("INK3 frame must be a nonnegative integer.");
  const sampledFrame = reducedMotion ? frame : Math.floor(frame / (rig.cadence ?? 2)) * (rig.cadence ?? 2);
  const poses: Record<string, InkPartPose> = {};
  for (const p of rig.parts) poses[p.id] = { x:0, y:0, rotation:0, scaleX:1, scaleY:1 };
  const roles = new Map<InkActorRole, string[]>();
  for (const p of rig.parts) roles.set(p.role, [...(roles.get(p.role) ?? []), p.id]);
  const each = (role: InkActorRole, f: (pose:InkPartPose)=>void) => {
    for (const id of roles.get(role) ?? []) f(poses[id]);
  };
  const activeCueIds: string[] = [];
  let rootX = 0, rootY = 0, blink = false, viseme: InkViseme = "closed";
  const playing = (cue: InkActorCue) => sampledFrame >= cue.startFrame && sampledFrame < cue.startFrame + cue.durationFrames;
  // A completed walk retains its final placement; gesture and speech release to neutral.
  for (const cue of cues) if (cue.kind === "travel") {
    const t = reducedMotion ? 1 : ease((sampledFrame - cue.startFrame) / cue.durationFrames);
    if (sampledFrame >= cue.startFrame || reducedMotion) {
      rootX += lerp(cue.from[0], cue.to[0], t) - cue.from[0];
      rootY += lerp(cue.from[1], cue.to[1], t) - cue.from[1];
    }
    if (!reducedMotion && playing(cue)) {
      activeCueIds.push(cue.id);
      const steps = cue.steps ?? 4;
      const cycle = (sampledFrame - cue.startFrame) / cue.durationFrames * steps * Math.PI * 2;
      const sway = Math.sin(cycle);
      const distance = Math.hypot(cue.to[0]-cue.from[0], cue.to[1]-cue.from[1]);
      const strength = Math.min(16, Math.max(0, distance / Math.max(1, steps) * .20));
      each("left-leg", p => p.rotation +=  sway * strength);
      each("right-leg",p => p.rotation -= sway * strength);
      each("left-arm", p => p.rotation -= sway * strength * .5);
      each("right-arm",p => p.rotation += sway * strength * .5);
      each("body",p => p.y += (1 - Math.cos(cycle * 2)) * .95);
    }
  }
  if (!reducedMotion) {
    each("body",p => { p.scaleY *= 1 + .0035 * Math.sin(sampledFrame / 19); });
    for (const cue of cues) {
      if (cue.kind === "travel" || !playing(cue)) continue;
      activeCueIds.push(cue.id);
      const t = (sampledFrame - cue.startFrame) / cue.durationFrames;
      const intensity = envelope(t);
      if (cue.kind === "gesture") {
        const sign = cue.arm === "right-arm" ? -1 : 1;
        const degrees = cue.degrees ?? 54;
        const motion = cue.gesture === "wave"
          ? (Math.sin(t * Math.PI * 6) * 13 + degrees) * intensity
          : cue.gesture === "raise" ? degrees * .73 * intensity : degrees * intensity;
        each(cue.arm,p => p.rotation += sign * motion);
      } else if (cue.kind === "blink") {
        const eye = Math.sin(Math.PI * clamp01(t));
        blink = eye > .48;
        each("eyes",p => p.scaleY *= Math.max(.035,1 - eye * .97));
      } else if (cue.kind === "gaze") {
        each("head",p => p.rotation += cue.target[0] * 5 * intensity);
        each("eyes",p => { p.x += cue.target[0] * 2.8 * intensity; p.y += cue.target[1] * 1.4 * intensity; });
      } else if (cue.kind === "nod") {
        each("head",p => p.rotation += (cue.degrees ?? 8) * Math.sin(Math.PI * 2 * t) * intensity);
      } else if (cue.kind === "speech") {
        const within = sampledFrame - cue.startFrame;
        for (const v of cue.visemes) if (v.frame <= within) viseme = v.shape;
      }
    }
  }
  return {
    id:rig.id,revision:rig.revision,frame,sampledFrame,
    root:[rootX,rootY],poses,blink,viseme,activeCueIds,
  };
}
