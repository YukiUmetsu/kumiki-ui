/**
 * RIG1 — a universal, style-agnostic 2D rig.
 *
 * One rig describes *what moves and how*: a bone hierarchy, parts drawn in bone space with a material role, and
 * procedural drivers (gaits with planted feet, wingbeats, wave chains, rolling wheels, crank linkages, hull bob,
 * clock hands, emitters…). It says nothing about *how it looks*: a film-look painter (flat, paper collage, crayon
 * wax, riso, ink, blueprint…) draws the same evaluated rig in its own medium.
 *
 * JSON-safe data only: no functions, no remote code. Coordinates are design pixels, y down; angles are degrees,
 * clockwise. A bone points along its local +y axis (a limb at rotation 0 hangs straight down). Frames are integers
 * and every frame is a pure function of the spec, so frames render the same in any seek order.
 */
import type { EasingSpec } from "../motion/types";

export const RIG_SCHEMA_VERSION = 1 as const;

/** Material role of a part. Painters map roles to their medium (paper stock, wax colour, ink tone, plate…). */
export type RigRole =
  | "skin" | "hair" | "cloth" | "cloth-dark" | "shoe" | "eye" | "mouth" | "detail"
  | "fur" | "fur-dark" | "scale" | "scale-dark" | "belly" | "horn" | "membrane" | "feather" | "beak" | "fin"
  | "metal" | "metal-dark" | "brass" | "wood" | "glass" | "rubber" | "paint" | "paint-dark" | "sail" | "rope"
  | "smoke" | "light" | "face" | "accent";
export const RIG_ROLES: readonly RigRole[] = [
  "skin", "hair", "cloth", "cloth-dark", "shoe", "eye", "mouth", "detail", "fur", "fur-dark", "scale", "scale-dark", "belly", "horn",
  "membrane", "feather", "beak", "fin", "metal", "metal-dark", "brass", "wood", "glass", "rubber", "paint", "paint-dark", "sail", "rope",
  "smoke", "light", "face", "accent",
];

/** Part outlines, in the owning bone's local space. */
export type RigShape =
  | { type: "path"; d: string }
  | { type: "ellipse"; cx?: number; cy?: number; rx: number; ry: number }
  | { type: "rect"; x: number; y: number; width: number; height: number; radius?: number }
  /** A limb segment along the bone: width `w0` at the joint tapering to `w1` at `length`. */
  | { type: "capsule"; length: number; w0: number; w1: number }
  | { type: "polygon"; points: readonly (readonly [number, number])[] };

export interface RigBone {
  id: string;
  parent?: string;
  /** Joint position in the parent bone's space at rest. */
  x: number;
  y: number;
  /** Rest rotation relative to the parent, degrees. */
  rotate?: number;
  /** Length along local +y; used by IK, chains and painters. */
  length?: number;
}

export interface RigPart {
  id: string;
  bone: string;
  shape: RigShape;
  role: RigRole;
  /** Paint order; higher is in front. */
  z: number;
  /** Optional explicit colour (otherwise the palette colour of the role). */
  color?: string;
  /** Alternative outlines selected by `variant` drivers (eyes shut, mouth open, sail furled…). */
  variants?: Readonly<Record<string, RigShape>>;
  /** On the far side of the body (far legs, far wing): painters shade it back. */
  far?: boolean;
  /** Thin line detail (rivets, stitching, eyelids) rather than a filled area. */
  line?: boolean;
  /** Line width when `line` is set. */
  lineWidth?: number;
}

/** Keyframed local overrides for one bone (added to rest and drivers). */
export interface RigKey { frame: number; x?: number; y?: number; rotate?: number; scaleX?: number; scaleY?: number; opacity?: number; ease?: EasingSpec }

/** Root motion through the scene. `x`/`y` are absolute scene positions; facing flips the whole figure. */
export interface RigRootKey {
  frame: number; x: number; y?: number; rotate?: number; ease?: EasingSpec;
  /** Which way the figure faces. Without it the figure faces its direction of travel; with it, travel against the
   * facing is reversing (feet step back, wheels roll backward). */
  facing?: 1 | -1;
  /** Depth scale: below 1 the figure is further from the camera, above 1 closer. Travel is measured in the figure's own units. */
  scale?: number;
  /** Yaw away from the side view, degrees: positive turns the nose into the picture (the rear face shows), negative
   * turns it toward the camera (the front face shows). The side outline foreshortens by cos(yaw). */
  yaw?: number;
}

// ---- Drivers ---------------------------------------------------------------------------------------------------------------------

/** Frame window for a driver. Envelopes blend the driver in and out over `ramp` frames. */
export interface RigWindow { start?: number; end?: number; ramp?: number }

export interface RigLeg {
  /** Thigh (upper) bone; its joint is the hip. */
  upper: string;
  /** Shin (lower) bone. */
  lower: string;
  /** Optional foot/hoof bone kept level with the ground during stance. */
  foot?: string;
  /** Phase offset in the gait cycle, 0..1 (e.g. biped .5 apart; dog walk 0/.5/.25/.75). */
  phase: number;
  /** +1: the knee points forward (people, front legs of most quadrupeds); -1: it points backward (birds, hind hocks). */
  bend: 1 | -1;
  /** Extra distance from the shin's end to the sole. */
  sole?: number;
  /** Swing height for this leg, as a multiple of the gait's `lift` (forelegs of a galloping horse fold higher). */
  lift?: number;
  /** Degrees the foot curls relative to the shin at the top of its swing (hooves flip back, paws tuck, toes point). */
  curl?: number;
  /** Ankle-to-toe distance: at the end of stance the foot rolls up onto its planted toe instead of sliding (people). */
  toe?: number;
  /** Fraction of the foot's fore-aft travel the hip joint follows (a quadruped's shoulder blade and pelvis swing). */
  swingHip?: number;
}

export type RigDriver = RigWindow & (
  /** Legged locomotion: feet plant on the ground and stay put while the body passes over them. */
  | { type: "gait"; legs: readonly RigLeg[]; body: string; stride: number; stance?: number; lift?: number; bob?: number; ground?: number;
      /** Cycle position (0..1) where the body is highest, and bobs per cycle (2 for walks and trots, 1 for gallops). */
      bobPhase?: number; bobHarmonic?: 1 | 2;
      /** Body pitch in step: rotate += pitch·cos(2π·h·(cycle − pitchPhase)); positive is nose-down. */
      pitch?: number; pitchPhase?: number; pitchHarmonic?: 1 | 2;
      /** The body lowers this far while travelling (legs flex into the gait). */ sink?: number;
      /** Bones that swing in step with the gait (arms, head nod, tail): rotate += amplitude·cos(2π(cycle + phase)). */
      swing?: readonly { bone: string; amplitude: number; phase: number; harmonic?: 1 | 2 }[];
      /** When the root is not travelling, march in place at this cycle length. */ idleCycle?: number }
  /** Flapping: shoulder sweep with a faster downstroke, an elbow that folds on the upstroke (flat, in the picture plane). */
  | { type: "wing"; shoulder: string; elbow?: string; tip?: string; amplitude: number; period: number; phase?: number; fold?: number; bias?: number }
  /**
   * Side-view flapping by projection. `plane` is a bone at the shoulder whose local +y is the wing's span and +x its
   * chord; the wing beats about the body's long axis, so seen from the side its span foreshortens by sin(elevation).
   * `arm`/`hand` fold back inside the wing plane on the upstroke (tips tucked) and spread for the downstroke.
   * `tilt` lifts the camera slightly above the body so the far wing shows over the back.
   */
  | { type: "flap"; plane: string; arm?: string; hand?: string; period: number; phase?: number;
      /** Elevation at the top and the bottom of the stroke, degrees (up positive). */ up: number; down: number;
      /** Fraction of the cycle spent on the downstroke (default .45). */ downstroke?: number;
      side?: "near" | "far"; tilt?: number;
      /** Degrees the arm and hand fold back on the upstroke. */ fold?: number;
      /** Fore-aft sweep of the whole wing, degrees (tips trace a loop). */ sweep?: number;
      /** Bone that heaves with each stroke (rises on the downstroke) and how far. */ body?: string; heave?: number;
      /** Glide: hold the wings spread at this elevation inside the window instead of flapping. */ glide?: number }
  /** Travelling wave down a chain of bones: tails, necks, serpents, fins, tentacles, flags. */
  | { type: "chain"; bones: readonly string[]; amplitude: number; period: number; lag: number; growth?: number; phase?: number; bias?: number;
      /** Follow-through on root turns/accelerations: degrees per unit of root acceleration. */ follow?: number }
  /** Wheels roll by the root's travel: rotation = distance / radius (a negative radius turns the other way: pedals kept
   * level, gears). `lock` frames skid: the wheel stops turning while the vehicle slides on. */
  | { type: "wheel"; bones: readonly string[]; radius: number; extra?: number; lock?: readonly { start: number; end: number }[] }
  /** Two-bone IK reach toward a target: feet planted on the ground or a pedal, hands on a knee, a chin, a handlebar.
   * The target is keyed in root space, or follows another bone's joint (plus an offset in root space). */
  | { type: "reach"; upper: string; lower: string; tip?: string; bend: 1 | -1;
      target?: readonly { frame: number; x: number; y: number; ease?: EasingSpec }[];
      follow?: string; offset?: readonly [number, number];
      /** World angle for the `tip` bone (0 keeps a foot level), or omit to leave it as posed. */ tipAngle?: number }
  /** Lights and indicators: opacity switches on and off on a square wave (`period`, `duty`), or stays on in the window. */
  | { type: "flash"; bones: readonly string[]; period?: number; duty?: number; phase?: number; fade?: number }
  /** Suspension and inertia: the bone pitches and heaves on a damped spring driven by the root's acceleration
   * (nose dives under braking, squats under throttle, rebounds when stopped; riders lurch). */
  | { type: "suspension"; bone: string; pitch: number; heave?: number; period?: number; damping?: number; max?: number }
  /** Turning in depth: end-face bones open by sin(yaw) from the root's `yaw` (the whole figure foreshortens by cos(yaw)).
   * List several bones per end when the face is stepped in depth (a bumper at the tail, the hatch glass further in). */
  | { type: "turn"; rear?: readonly string[]; front?: readonly string[] }
  /** Constant spin (propellers, rotors, fans): degrees per frame with a spin-up time. `project` spins edge-on (a rotor
   * blade seen from the side): instead of turning, the bone's x scale follows cos(angle) plus `phase` degrees. */
  | { type: "spin"; bone: string; speed: number; spinUp?: number; project?: boolean; phase?: number }
  /** Crank linkage: a rod whose one end rides a pin on a turning wheel. `slide` keeps the far end on a horizontal guide
   * (piston/crosshead); `coupling` keeps the rod parallel (coupling rods between drivers). */
  | { type: "crank"; wheel: string; rod: string; radius: number; length?: number; mode: "slide" | "coupling"; phase?: number; slideY?: number;
      /** Bone moved along the guide with the rod's far end (crosshead, piston). */ slider?: string }
  /** Periodic offsets: hull roll and heave, body bounce, breathing, idle sway. */
  | { type: "oscillate"; bone: string; property: "x" | "y" | "rotate" | "scaleX" | "scaleY"; amplitude: number; period: number; phase?: number;
      /** Second harmonic for organic motion (fraction of amplitude at 2.3× frequency). */ wobble?: number;
      /** Scale amplitude by travel speed (suspension bounce, gait-driven bob). */ bySpeed?: boolean }
  /** Damped pendulum (bells, tags, a clock pendulum when `damping` is 0). */
  | { type: "pendulum"; bone: string; amplitude: number; period: number; damping?: number; start?: number }
  /** Clock hands from clock-time keys (hours); a seconds hand can tick once per second. */
  | { type: "clock"; hour?: string; minute?: string; second?: string; time: readonly { frame: number; hours: number; ease?: EasingSpec }[];
      tick?: { fps: number }; restAngles?: { hour?: number; minute?: number; second?: number } }
  /** Puffs or sparks: bones `puffs` are recycled particles born at `origin` every `every` frames. */
  | { type: "emitter"; puffs: readonly string[]; origin: string; every: number; life: number; velocity: readonly [number, number]; growth: number; drift?: number }
  /** Swap a part's outline: blinks on a seeded schedule, or keyed variants (mouth shapes, sail states). */
  | { type: "variant"; part: string; name: string; mode: "blink"; interval?: readonly [number, number]; duration?: number; seed?: number }
  | { type: "variant"; part: string; mode: "keys"; keys: readonly { frame: number; name: string | null }[] }
  /** Talking: mouth cycles open/closed on a syllable rhythm while active. */
  | { type: "variant"; part: string; mode: "talk"; open: string; mid?: string; seed?: number }
  /** Tilt the root to follow its own path (planes climbing, dragons diving, cars on hills); `lean` adds degrees per
   * unit of forward speed (a helicopter noses down to fly forward). */
  | { type: "bank"; amount: number; max?: number; lean?: number }
);
export type RigDriverType = RigDriver["type"];

export interface RigSpec {
  version: typeof RIG_SCHEMA_VERSION;
  id: string;
  /** What the rig is, for authoring tools: "biped", "quadruped", "dragon", "locomotive"… */
  kind: string;
  bones: readonly RigBone[];
  parts: readonly RigPart[];
  /** Role → colour. Painters may restyle it, but the default reads correctly in a flat look. */
  palette: Readonly<Partial<Record<RigRole, string>>>;
  drivers?: readonly RigDriver[];
  tracks?: Readonly<Record<string, readonly RigKey[]>>;
  root?: readonly RigRootKey[];
  /** Ground height in root space (feet, wheels and hulls rest on it). Default 0. */
  ground?: number;
  /** Size of the figure for framing: width and height around the root, in design px. */
  bounds: { x: number; y: number; width: number; height: number };
  /** Provenance of the design (original rigs say so). */
  provenance: { license: string; source: string };
}

// ---- Validation ------------------------------------------------------------------------------------------------------------------

const SLUG = /^[a-z][a-z0-9-]{0,63}$/;
const PATH = /^[0-9.,+\-\seEMmLlHhVvCcSsQqTtAaZz]*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const int = (v: unknown): v is number => Number.isSafeInteger(v);

function shapeIssues(shape: RigShape | undefined, path: string, out: string[]) {
  if (!shape || typeof shape !== "object") { out.push(path + " must be a shape"); return; }
  switch (shape.type) {
    case "path": if (typeof shape.d !== "string" || !shape.d || shape.d.length > 20000 || !PATH.test(shape.d) || !/^\s*[Mm]/.test(shape.d)) out.push(path + ".d must be SVG path data starting with M"); break;
    case "ellipse": if (![shape.rx, shape.ry].every(v => fin(v) && v > 0) || (shape.cx !== undefined && !fin(shape.cx)) || (shape.cy !== undefined && !fin(shape.cy))) out.push(path + " needs positive rx, ry"); break;
    case "rect": if (![shape.x, shape.y].every(fin) || ![shape.width, shape.height].every(v => fin(v) && v > 0)) out.push(path + " needs x, y and positive width, height"); break;
    case "capsule": if (![shape.length, shape.w0, shape.w1].every(v => fin(v) && v >= 0) || shape.length <= 0) out.push(path + " needs positive length and widths"); break;
    case "polygon": if (!Array.isArray(shape.points) || shape.points.length < 3 || !shape.points.every(p => Array.isArray(p) && p.length === 2 && p.every(fin))) out.push(path + ".points needs 3+ [x,y]"); break;
    default: out.push(path + ".type must be path, ellipse, rect, capsule or polygon");
  }
}

/** Every problem with a rig, each with its JSON path. Empty means valid. */
export function inspectRig(input: unknown): string[] {
  const out: string[] = [];
  if (!input || typeof input !== "object") return ["rig must be an object"];
  const r = input as Partial<RigSpec>;
  if (r.version !== 1) out.push("version must be 1");
  if (typeof r.id !== "string" || !SLUG.test(r.id)) out.push("id must be a lowercase slug");
  if (typeof r.kind !== "string" || !r.kind) out.push("kind is required");
  if (!r.bounds || ![r.bounds.x, r.bounds.y, r.bounds.width, r.bounds.height].every(fin)) out.push("bounds needs x, y, width, height");
  if (!r.provenance || typeof r.provenance.license !== "string" || typeof r.provenance.source !== "string") out.push("provenance needs license and source");
  if (!r.palette || typeof r.palette !== "object") out.push("palette is required");
  else for (const [role, c] of Object.entries(r.palette)) {
    if (!RIG_ROLES.includes(role as RigRole)) out.push("palette." + role + " is not a rig role");
    if (typeof c !== "string" || !HEX.test(c)) out.push("palette." + role + " must be a 6-digit hex colour");
  }
  const bones = new Map<string, RigBone>();
  if (!Array.isArray(r.bones) || r.bones.length < 1 || r.bones.length > 400) out.push("bones must have 1..400 entries");
  else r.bones.forEach((b, i) => {
    const p = "bones[" + i + "]";
    if (!b || typeof b.id !== "string" || !SLUG.test(b.id)) { out.push(p + ".id must be a lowercase slug"); return; }
    if (bones.has(b.id)) out.push(p + ".id \"" + b.id + "\" is used twice");
    if (!fin(b.x) || !fin(b.y)) out.push(p + " needs finite x, y");
    if (b.rotate !== undefined && !fin(b.rotate)) out.push(p + ".rotate must be finite");
    if (b.length !== undefined && (!fin(b.length) || b.length < 0)) out.push(p + ".length must be ≥ 0");
    if (b.parent !== undefined && !bones.has(b.parent)) out.push(p + ".parent \"" + b.parent + "\" must be an earlier bone");
    bones.set(b.id, b);
  });
  const parts = new Set<string>();
  if (!Array.isArray(r.parts) || r.parts.length > 800) out.push("parts must be an array of up to 800 entries");
  else r.parts.forEach((q, i) => {
    const p = "parts[" + i + "]";
    if (!q || typeof q.id !== "string" || !SLUG.test(q.id)) { out.push(p + ".id must be a lowercase slug"); return; }
    if (parts.has(q.id)) out.push(p + ".id \"" + q.id + "\" is used twice");
    parts.add(q.id);
    if (!bones.has(q.bone)) out.push(p + ".bone \"" + q.bone + "\" does not exist");
    if (!RIG_ROLES.includes(q.role)) out.push(p + ".role is not a rig role");
    if (!fin(q.z)) out.push(p + ".z must be finite");
    if (q.color !== undefined && !HEX.test(q.color)) out.push(p + ".color must be a 6-digit hex colour");
    shapeIssues(q.shape, p + ".shape", out);
    for (const [name, v] of Object.entries(q.variants ?? {})) shapeIssues(v as RigShape, p + ".variants." + name, out);
  });
  const bone = (id: unknown, path: string) => { if (typeof id !== "string" || !bones.has(id)) out.push(path + " \"" + String(id) + "\" is not a bone"); };
  const window = (d: RigWindow, path: string) => {
    if (d.start !== undefined && !int(d.start)) out.push(path + ".start must be an integer frame");
    if (d.end !== undefined && (!int(d.end) || d.end <= (d.start ?? -Infinity))) out.push(path + ".end must be after start");
    if (d.ramp !== undefined && (!fin(d.ramp) || d.ramp < 0)) out.push(path + ".ramp must be ≥ 0");
  };
  (r.drivers ?? []).forEach((d, i) => {
    const p = "drivers[" + i + "]";
    if (!d || typeof d !== "object") { out.push(p + " must be an object"); return; }
    window(d, p);
    switch (d.type) {
      case "gait":
        bone(d.body, p + ".body");
        if (!Array.isArray(d.legs) || !d.legs.length) out.push(p + ".legs must not be empty");
        else d.legs.forEach((l, j) => {
          bone(l.upper, p + ".legs[" + j + "].upper"); bone(l.lower, p + ".legs[" + j + "].lower");
          if (l.foot !== undefined) bone(l.foot, p + ".legs[" + j + "].foot");
          if (!fin(l.phase)) out.push(p + ".legs[" + j + "].phase must be finite");
          if (l.bend !== 1 && l.bend !== -1) out.push(p + ".legs[" + j + "].bend must be 1 or -1");
          for (const k of ["lift", "curl", "toe", "sole", "swingHip"] as const) if (l[k] !== undefined && !fin(l[k])) out.push(p + ".legs[" + j + "]." + k + " must be finite");
          for (const id of [l.upper, l.lower]) if (!((bones.get(id)?.length ?? 0) > 0)) out.push(p + ".legs[" + j + "] bone \"" + id + "\" needs a length");
        });
        if (!fin(d.stride) || d.stride <= 0) out.push(p + ".stride must be > 0");
        if (d.stance !== undefined && !(d.stance > .2 && d.stance < .95)) out.push(p + ".stance must be .2..0.95");
        (d.swing ?? []).forEach((sw, j) => { bone(sw.bone, p + ".swing[" + j + "].bone"); if (!fin(sw.amplitude) || !fin(sw.phase)) out.push(p + ".swing[" + j + "] needs amplitude and phase"); });
        break;
      case "wing": bone(d.shoulder, p + ".shoulder"); if (d.elbow) bone(d.elbow, p + ".elbow"); if (d.tip) bone(d.tip, p + ".tip");
        if (!fin(d.amplitude) || !fin(d.period) || d.period < 2) out.push(p + " needs amplitude and period ≥ 2"); break;
      case "chain": if (!Array.isArray(d.bones) || !d.bones.length) out.push(p + ".bones must not be empty"); else d.bones.forEach((b, j) => bone(b, p + ".bones[" + j + "]"));
        if (!fin(d.amplitude) || !fin(d.period) || d.period < 2 || !fin(d.lag)) out.push(p + " needs amplitude, period ≥ 2 and lag"); break;
      case "wheel": if (!Array.isArray(d.bones) || !d.bones.length) out.push(p + ".bones must not be empty"); else d.bones.forEach((b, j) => bone(b, p + ".bones[" + j + "]"));
        if (!fin(d.radius) || d.radius === 0) out.push(p + ".radius must be non-zero");
        (d.lock ?? []).forEach((l, j) => { if (!int(l.start) || !int(l.end) || l.end <= l.start) out.push(p + ".lock[" + j + "] needs start < end frames"); }); break;
      case "flap": bone(d.plane, p + ".plane"); if (d.arm) bone(d.arm, p + ".arm"); if (d.hand) bone(d.hand, p + ".hand"); if (d.body) bone(d.body, p + ".body");
        if (!fin(d.period) || d.period < 2) out.push(p + ".period must be ≥ 2");
        if (!fin(d.up) || !fin(d.down) || d.up <= d.down || d.up > 90 || d.down < -90) out.push(p + " needs -90 ≤ down < up ≤ 90");
        if (d.downstroke !== undefined && !(d.downstroke > .15 && d.downstroke < .85)) out.push(p + ".downstroke must be .15..0.85"); break;
      case "reach": bone(d.upper, p + ".upper"); bone(d.lower, p + ".lower"); if (d.tip) bone(d.tip, p + ".tip"); if (d.follow) bone(d.follow, p + ".follow");
        if (d.bend !== 1 && d.bend !== -1) out.push(p + ".bend must be 1 or -1");
        for (const id of [d.upper, d.lower]) if (!((bones.get(id)?.length ?? 0) > 0)) out.push(p + " bone \"" + id + "\" needs a length");
        if (!d.follow && !(Array.isArray(d.target) && d.target.length)) out.push(p + " needs target keys or a follow bone");
        else if (d.target) { let pf = -Infinity; d.target.forEach((k, j) => { if (!int(k.frame) || k.frame <= pf || !fin(k.x) || !fin(k.y)) out.push(p + ".target[" + j + "] needs increasing frame, x, y"); pf = k.frame; }); }
        break;
      case "flash": if (!Array.isArray(d.bones) || !d.bones.length) out.push(p + ".bones must not be empty"); else d.bones.forEach((b, j) => bone(b, p + ".bones[" + j + "]"));
        if (d.period !== undefined && (!fin(d.period) || d.period < 2)) out.push(p + ".period must be ≥ 2");
        if (d.duty !== undefined && !(d.duty > 0 && d.duty < 1)) out.push(p + ".duty must be 0..1"); break;
      case "suspension": bone(d.bone, p + ".bone"); if (!fin(d.pitch) || (d.heave !== undefined && !fin(d.heave))) out.push(p + " needs finite pitch and heave");
        if (d.period !== undefined && (!fin(d.period) || d.period < 4)) out.push(p + ".period must be ≥ 4"); break;
      case "turn": for (const k of ["rear", "front"] as const) { const v = d[k]; if (v !== undefined) { if (!Array.isArray(v)) out.push(p + "." + k + " must be a list of bones"); else v.forEach((b, j) => bone(b, p + "." + k + "[" + j + "]")); } } break;
      case "spin": bone(d.bone, p + ".bone"); if (!fin(d.speed)) out.push(p + ".speed must be finite"); break;
      case "crank": bone(d.wheel, p + ".wheel"); bone(d.rod, p + ".rod");
        if (!fin(d.radius) || d.radius <= 0) out.push(p + ".radius must be > 0");
        if (d.mode !== "slide" && d.mode !== "coupling") out.push(p + ".mode must be slide or coupling");
        if (d.mode === "slide" && !(fin(d.length) && d.length! > d.radius)) out.push(p + ".length must exceed the crank radius"); break;
      case "oscillate": bone(d.bone, p + ".bone");
        if (!["x", "y", "rotate", "scaleX", "scaleY"].includes(d.property)) out.push(p + ".property is unknown");
        if (!fin(d.amplitude) || !fin(d.period) || d.period < 2) out.push(p + " needs amplitude and period ≥ 2"); break;
      case "pendulum": bone(d.bone, p + ".bone"); if (!fin(d.amplitude) || !fin(d.period) || d.period < 2) out.push(p + " needs amplitude and period ≥ 2"); break;
      case "clock":
        for (const k of ["hour", "minute", "second"] as const) if (d[k] !== undefined) bone(d[k], p + "." + k);
        if (!Array.isArray(d.time) || !d.time.length || !d.time.every(t => int(t.frame) && fin(t.hours))) out.push(p + ".time needs {frame, hours} keys"); break;
      case "emitter": bone(d.origin, p + ".origin");
        if (!Array.isArray(d.puffs) || !d.puffs.length) out.push(p + ".puffs must not be empty"); else d.puffs.forEach((b, j) => bone(b, p + ".puffs[" + j + "]"));
        if (!(d.every >= 1) || !(d.life >= 2)) out.push(p + " needs every ≥ 1 and life ≥ 2"); break;
      case "variant": {
        const part = r.parts?.find(q => q.id === d.part);
        if (!part) { out.push(p + ".part \"" + d.part + "\" does not exist"); break; }
        const names = d.mode === "blink" ? [d.name] : d.mode === "talk" ? [d.open, d.mid].filter(Boolean) as string[] : d.mode === "keys" ? d.keys.map(k => k.name).filter((n): n is string => !!n) : [];
        for (const n of names) if (!part.variants?.[n]) out.push(p + " variant \"" + n + "\" is not defined on part " + d.part);
        if (!["blink", "keys", "talk"].includes(d.mode)) out.push(p + ".mode must be blink, keys or talk");
        break;
      }
      case "bank": if (!fin(d.amount)) out.push(p + ".amount must be finite"); break;
      default: out.push(p + ".type is unknown");
    }
  });
  for (const [id, keys] of Object.entries(r.tracks ?? {})) {
    bone(id, "tracks." + id);
    let prev = -Infinity;
    keys.forEach((k, j) => { if (!int(k.frame) || k.frame <= prev) out.push("tracks." + id + "[" + j + "].frame must increase"); prev = k.frame; });
  }
  let prevRoot = -Infinity;
  (r.root ?? []).forEach((k, j) => {
    if (!int(k.frame) || k.frame <= prevRoot || !fin(k.x)) out.push("root[" + j + "] needs increasing frame and x");
    if (k.scale !== undefined && !(fin(k.scale) && k.scale > .05 && k.scale < 20)) out.push("root[" + j + "].scale must be .05..20");
    if (k.yaw !== undefined && !(fin(k.yaw) && Math.abs(k.yaw) <= 80)) out.push("root[" + j + "].yaw must be within ±80°");
    prevRoot = k.frame;
  });
  return out;
}

export function assertRig(input: unknown): asserts input is RigSpec {
  const issues = inspectRig(input);
  if (issues.length) throw new RangeError("Invalid RIG1 rig: " + issues.slice(0, 10).join("; ") + (issues.length > 10 ? "; …" : ""));
}
