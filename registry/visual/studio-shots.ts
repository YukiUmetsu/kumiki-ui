/** Studio shots: pure camera, timing and part-motion maths for the studio video recipes.
 *
 * Every function here is a pure function of its inputs and the frame number, so a recipe looks the same at any frame, reached in any
 * order. Nothing reads a clock, a random source or the DOM. The React Three Fiber components in `studio-fiber.tsx` and
 * `studio-recipes-react.tsx` apply these poses; `inspectStudioShot` checks a recipe against the craft rules in
 * docs/31-react-three-fiber-content-plan.md before anything renders.
 */
import type { HeroBounds } from "../craft/hero-studio";

export type Vec3 = readonly [number, number, number];
export interface ShotPose { position: Vec3; target: Vec3; fov: number }

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** Progress through [start, end], 0 before and 1 after. */
export const span01 = (frame: number, start: number, end: number) => end <= start ? (frame >= end ? 1 : 0) : clamp01((frame - start) / (end - start));
/** Smooth start and stop, with zero velocity and acceleration at both ends. */
export const easeInOut = (t: number) => { const x = clamp01(t); return x * x * x * (x * (x * 6 - 15) + 10); };
/** Moving at once and landing softly: the camera is already travelling on the first frame and settles into the hold. */
export const easeOut = (t: number) => { const x = clamp01(t); return 1 - (1 - x) ** 3; };
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

export const boundsCenter = (b: HeroBounds): Vec3 => [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
export const boundsRadius = (b: HeroBounds) => Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) / 2;

export interface OrbitView {
  /** Degrees around the vertical axis; 0 faces the subject's front (+Z), positive moves to its right. */
  yaw: number;
  /** Degrees above the subject's centre. */
  pitch: number;
  /** How much of the frame's shorter side the subject's bounding sphere fills. 0.7 leaves air; 0.95 is tight. @default 0.72 */
  fill?: number;
  /** Shifts the subject sideways in frame, as a fraction of half the frame width: -0.33 puts it on the left third line. @default 0 */
  offsetX?: number;
  /** Vertical field of view in degrees. A long lens (20 to 30) flattens perspective the way product photography does. @default 26 */
  fov?: number;
}

/** A camera on a sphere around a subject, framed so the subject fills a set share of the frame. */
export function orbitPose(center: Vec3, radius: number, view: OrbitView, aspect: number): ShotPose {
  const fov = view.fov ?? 26, fill = view.fill ?? .72;
  const vertical = Math.tan(fov * Math.PI / 360), horizontal = vertical * aspect;
  const distance = radius / (Math.min(vertical, horizontal) * fill);
  const yaw = view.yaw * Math.PI / 180, pitch = view.pitch * Math.PI / 180;
  const dir: Vec3 = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  // Moving the look target along the camera's right vector moves the subject the other way in frame.
  const shift = -(view.offsetX ?? 0) * distance * horizontal, right: Vec3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const target: Vec3 = [center[0] + right[0] * shift, center[1], center[2] + right[2] * shift];
  return { fov, target, position: [target[0] + dir[0] * distance, target[1] + dir[1] * distance, target[2] + dir[2] * distance] };
}

/** Rotates a point about a vertical axis through `center` by `-yawDeg`: where a point on the subject goes when the subject turns on a
 * turntable so the camera can stay facing the studio. */
export function turntablePoint(point: Vec3, center: Vec3, yawDeg: number): Vec3 {
  const a = -yawDeg * Math.PI / 180, x = point[0] - center[0], z = point[2] - center[2];
  return [center[0] + x * Math.cos(a) + z * Math.sin(a), point[1], center[2] - x * Math.sin(a) + z * Math.cos(a)];
}

/** Blends two orbit views. Angles and framing interpolate, so the camera travels on an arc rather than cutting through the subject. */
export function blendViews(a: OrbitView, b: OrbitView, t: number): OrbitView {
  return { yaw: mix(a.yaw, b.yaw, t), pitch: mix(a.pitch, b.pitch, t), fill: mix(a.fill ?? .72, b.fill ?? .72, t), offsetX: mix(a.offsetX ?? 0, b.offsetX ?? 0, t), fov: mix(a.fov ?? 26, b.fov ?? 26, t) };
}

/** The visible life of one piece of text: it fades and rises in, holds, then fades out. */
export interface TextBeat { text: string; sub?: string; enter: number; exit?: number }
export const TEXT_FADE_FRAMES = 10;
/** Opacity and a small rise, in pixels, for a text beat at a frame. */
export function textBeatState(beat: TextBeat | undefined, frame: number): { opacity: number; rise: number } {
  if (!beat) return { opacity: 0, rise: 0 };
  const into = easeOut(span01(frame, beat.enter, beat.enter + TEXT_FADE_FRAMES));
  const out = beat.exit === undefined ? 1 : 1 - easeInOut(span01(frame, beat.exit - TEXT_FADE_FRAMES, beat.exit));
  return { opacity: into * out, rise: (1 - into) * 12 };
}
const words = (text = "") => text.trim().split(/\s+/).filter(Boolean).length;

// ------------------------------------------------------------------ recipes

/** Recipe 1: a slow turn under studio light that lands on the hero angle, holds, and earns one claim. */
export interface HeroTurnSpec {
  durationFrames: number;
  /** The turn: the camera's yaw at frame 0 and at `settleFrame`, where it lands on the hero angle. */
  yawFrom: number; yawTo: number;
  pitch?: number;
  /** The frame the camera lands. The turn decelerates into it. */
  settleFrame: number;
  /** Degrees of drift through the hold, so the picture never freezes. Keep it under 3. @default 1.5 */
  holdDrift?: number;
  /** Framing at the start and in the hold. A slight push in, 0.66 to 0.74, reads as attention. */
  fillFrom?: number; fillTo?: number;
  offsetX?: number;
  claim?: TextBeat;
}
/** The hero turn's view at a frame: the turn decelerates onto the hero angle, then drifts a little through the hold. */
export function heroTurnView(spec: HeroTurnSpec, frame: number): OrbitView {
  const turn = easeOut(span01(frame, 0, spec.settleFrame)), hold = span01(frame, spec.settleFrame, spec.durationFrames);
  const yaw = mix(spec.yawFrom, spec.yawTo, turn) + (spec.holdDrift ?? 1.5) * hold * Math.sign(spec.yawTo - spec.yawFrom || 1);
  const fill = mix(spec.fillFrom ?? .64, spec.fillTo ?? .72, easeInOut(span01(frame, 0, spec.durationFrames)));
  return { yaw, pitch: spec.pitch ?? 12, fill, offsetX: spec.offsetX };
}
export function heroTurnShot(spec: HeroTurnSpec, frame: number, center: Vec3, radius: number, aspect: number): TurntableShot {
  const view = heroTurnView(spec, frame);
  return { pose: orbitPose(center, radius, { ...view, yaw: 0 }, aspect), turn: view.yaw };
}

/** Recipe 2: push in on one named part, light it, dim everything else, and name it. */
export interface PartSpotlightSpec {
  durationFrames: number;
  part: string;
  /** Where the camera starts (around the whole subject) and where it lands (around the part). */
  wide: OrbitView;
  close: OrbitView;
  pushStart: number; pushEnd: number;
  /** How far the rest of the subject dims, 0 to 0.7. The part stays at full light. @default 0.4 */
  dim?: number;
  label?: TextBeat;
}
/** A shot on a turntable: the subject turns by `turn` degrees and the camera, facing the studio, takes `pose`. Keeping the camera on
 * the studio's front keeps the seamless backdrop behind the subject from every angle, and the light glides across the product as it
 * turns, which is how product films are lit. */
export interface TurntableShot { pose: ShotPose; turn: number }
export interface SpotlightState extends TurntableShot { highlight: number; dim: number }
export function partSpotlightState(spec: PartSpotlightSpec, frame: number, subject: { center: Vec3; radius: number }, part: { center: Vec3; radius: number }, aspect: number): SpotlightState {
  const t = easeInOut(span01(frame, spec.pushStart, spec.pushEnd));
  // The camera travels on the orbit angles while its pivot moves from the subject to the part, so the push is an arc that ends square
  // on the part. On the turntable the part's centre turns with the subject.
  const view = blendViews(spec.wide, spec.close, t), partCenter = turntablePoint(part.center, subject.center, view.yaw);
  const pose = orbitPose(mix3(subject.center, partCenter, t), mix(subject.radius, part.radius, t), { ...view, yaw: 0 }, aspect);
  // The highlight arrives as the camera arrives, never before: a light on something we cannot yet see reads as a glitch.
  const highlight = easeInOut(span01(frame, spec.pushEnd - 8, spec.pushEnd + 6));
  return { pose, turn: view.yaw, highlight, dim: highlight * (spec.dim ?? .4) };
}

/** Recipe 8: push into a device's screen, let its interface perform, then pull back. The camera reuses the spotlight's arc. */
export interface ScreenAliveSpec {
  durationFrames: number;
  /** The display part, e.g. "phone-display". */
  part: string;
  wide: OrbitView;
  close: OrbitView;
  pushStart: number; pushEnd: number;
  /** Pull back out at the end. Omit to stay on the screen. */
  pullStart?: number; pullEnd?: number;
  /** The interface's own frame 0. Start it as the camera lands, not before. */
  uiStart: number;
  /** Parts to hide while the screen is shown, such as a lock-screen notification that would cover the interface. */
  hide?: readonly string[];
  title?: TextBeat;
}
export function screenAliveState(spec: ScreenAliveSpec, frame: number, subject: { center: Vec3; radius: number }, display: { center: Vec3; radius: number }, aspect: number): TurntableShot & { uiFrame: number } {
  // Pulling back runs the push curve in reverse, so the move out mirrors the move in.
  const back = spec.pullStart === undefined ? 0 : span01(frame, spec.pullStart, spec.pullEnd ?? spec.pullStart + 30);
  const effective = back > 0 ? spec.pushStart + (spec.pushEnd - spec.pushStart) * (1 - back) : frame;
  const state = partSpotlightState({ durationFrames: spec.durationFrames, part: spec.part, wide: spec.wide, close: spec.close, pushStart: spec.pushStart, pushEnd: spec.pushEnd, dim: 0 }, effective, subject, display, aspect);
  return { pose: state.pose, turn: state.turn, uiFrame: Math.max(0, frame - spec.uiStart) };
}

/** Recipe 7: step inside. The camera lands square on a screen, keeps going, and comes out inside the world the screen was showing. */
export interface StepInsideSpec {
  durationFrames: number;
  /** The window part, e.g. "phone-display". */
  part: string;
  wide: OrbitView;
  pushStart: number;
  /** The frame the camera is square on the window with the window filling the frame. */
  closeFrame: number;
  /** The frame the camera passes through. Between `closeFrame` and here it dollies straight in, accelerating. */
  crossFrame: number;
  /** Metres travelled inside the world after crossing, decelerating to a drift. @default 9 */
  travel?: number;
  hide?: readonly string[];
  title?: TextBeat;
}
export type StepInsideState =
  | { phase: "device"; pose: ShotPose; turn: number; scale: number }
  | { phase: "world"; position: Vec3; target: Vec3; fov: number; scale: number };
/** Where the camera is at a frame. `scale` (world metres per device unit) is chosen so the camera's speed is continuous through the
 * window: the dolly's speed at the crossing, carried into the world, equals the world move's starting speed. */
export function stepInsideState(spec: StepInsideSpec, frame: number, subject: { center: Vec3; radius: number }, display: { center: Vec3; radius: number }, aspect: number, arrival: { position: Vec3 }): StepInsideState {
  const close: OrbitView = { yaw: 0, pitch: 0, fill: 1.05, fov: 26 };
  const landed = partSpotlightState({ durationFrames: spec.durationFrames, part: spec.part, wide: spec.wide, close, pushStart: spec.pushStart, pushEnd: spec.closeFrame, dim: 0 }, Math.min(frame, spec.closeFrame), subject, display, aspect);
  const closeDistance = Math.hypot(landed.pose.position[0] - display.center[0], landed.pose.position[1] - display.center[1], landed.pose.position[2] - display.center[2]);
  const dolly = Math.max(1, spec.crossFrame - spec.closeFrame), after = Math.max(1, spec.durationFrames - spec.crossFrame), travel = spec.travel ?? 9;
  // Dolly speed at the crossing (cubic ease-in ends at 3x its average), and the world move's starting speed (quadratic ease-out
  // starts at 2x its average). Equal speeds give the scale.
  const scale = (2 * travel / after) / (3 * closeDistance / dolly);
  if (frame < spec.closeFrame) return { phase: "device", pose: landed.pose, turn: landed.turn, scale };
  if (frame < spec.crossFrame) {
    const u = (frame - spec.closeFrame) / dolly, d = closeDistance * (1 - u * u * u);
    return { phase: "device", pose: { fov: 26, position: [display.center[0], display.center[1], display.center[2] + d], target: display.center }, turn: 0, scale };
  }
  // The world camera leaves the window exactly as the window camera arrived (level, along -Z), then eases into a gentle look down
  // at the path and a small rise, so the crossing has no jump in angle.
  const tau = Math.min(1, (frame - spec.crossFrame) / after), along = travel * (1 - (1 - tau) ** 2), settle = easeInOut(tau), rise = .35 * settle;
  const [x, y, z] = arrival.position;
  return { phase: "world", fov: 26, scale, position: [x, y + rise, z - along], target: [x, y + rise - 12 * Math.tan(4 * Math.PI / 180) * settle, z - along - 12] };
}

/** Recipe 3: parts slide apart along their assembly axis, hold to be read, and slide back. */
export interface ExplodeSpec {
  durationFrames: number;
  /** Parts to move. A string is one named part; an array moves several named parts as one piece (a lens and its ring). Omit to move
   * every named part that contains no other. */
  parts?: ReadonlyArray<string | readonly string[]>;
  /** The axis the layers stack along. `auto` picks the subject's thinnest axis, which is how flat devices are assembled. @default "auto" */
  axis?: "x" | "y" | "z" | "auto";
  explodeStart: number; explodeEnd: number;
  /** Frames between one piece and the next starting to move, outermost first. @default 3 */
  stagger?: number;
  /** When the pieces start to return. Omit to end exploded. */
  reassembleStart?: number; reassembleEnd?: number;
  /** Gap between layers, as a share of the subject's largest size. @default 0.22 */
  gap?: number;
  view: OrbitView;
  /** Degrees the subject turns through the whole shot, so the separation reads as depth. @default 12 */
  orbit?: number;
  title?: TextBeat;
}
export interface PartRestInfo { name: string; center: Vec3 }
export interface ExplodeItem { name: string; offset: Vec3; order: number; kind: "layer" | "side" | "anchor" }
/** Where each piece goes. Pieces that sit at the subject's edge on a side axis (buttons, ports) move straight out from that side. The
 * rest are layers: ranked by depth along the assembly axis and spread to equal gaps either side of the piece nearest the middle, which
 * stays put as the anchor. Pieces at the same depth (three lenses on one plateau) share a rank and move together. */
export function explodePlan(parts: readonly PartRestInfo[], extents: HeroBounds, options: { gap?: number; axis?: ExplodeSpec["axis"] } = {}): ExplodeItem[] {
  const c = boundsCenter(extents), size = [0, 1, 2].map(i => extents.max[i] - extents.min[i]), largest = Math.max(...size);
  const axis = options.axis && options.axis !== "auto" ? "xyz".indexOf(options.axis) : size.indexOf(Math.min(...size));
  const gap = (options.gap ?? .22) * largest, side: ExplodeItem[] = [], layers: Array<{ name: string; depth: number }> = [];
  for (const part of parts) {
    const rel = [0, 1, 2].map(i => (part.center[i] - c[i]) / Math.max(1e-6, size[i] / 2));
    const others = [0, 1, 2].filter(i => i !== axis), edge = others.reduce((best, i) => Math.abs(rel[i]) > Math.abs(rel[best]) ? i : best, others[0]);
    if (Math.abs(rel[edge]) > .85) {
      const offset: [number, number, number] = [0, 0, 0]; offset[edge] = Math.sign(rel[edge]) * gap * 1.6;
      side.push({ name: part.name, offset, order: 0, kind: "side" });
    } else layers.push({ name: part.name, depth: part.center[axis] - c[axis] });
  }
  // Ranks: depths within a small tolerance share a rank.
  const tolerance = largest * .0015, sorted = [...layers].sort((a, b) => a.depth - b.depth), ranks: number[] = [];
  sorted.forEach((layer, i) => { ranks.push(i && Math.abs(layer.depth - sorted[i - 1].depth) <= tolerance ? ranks[i - 1] : (i ? ranks[i - 1] + 1 : 0)); });
  const distinct = [...new Set(ranks)], anchorRank = distinct.reduce((best, r) => {
    const depth = (rank: number) => Math.abs(sorted[ranks.indexOf(rank)].depth);
    return depth(r) < depth(best) ? r : best;
  }, distinct[0] ?? 0);
  const out: ExplodeItem[] = sorted.map((layer, i) => {
    const offset: [number, number, number] = [0, 0, 0]; offset[axis] = (ranks[i] - anchorRank) * gap;
    return { name: layer.name, offset, order: 0, kind: ranks[i] === anchorRank ? "anchor" : "layer" };
  });
  const all = [...out, ...side], reach = (item: ExplodeItem) => Math.hypot(...item.offset);
  const byReach = [...new Set(all.map(reach))].sort((a, b) => b - a);
  return all.map(item => ({ ...item, order: byReach.indexOf(reach(item)) }));
}
/** How far apart, 0 to 1, a piece is at a frame. */
export function explodeAmount(spec: ExplodeSpec, order: number, frame: number): number {
  const delay = order * (spec.stagger ?? 3);
  const out = easeInOut(span01(frame, spec.explodeStart + delay, spec.explodeEnd + delay));
  if (spec.reassembleStart === undefined) return out;
  // Returning runs innermost first, so the pieces nest back in the order they left.
  const back = easeInOut(span01(frame, spec.reassembleStart - delay * .6, (spec.reassembleEnd ?? spec.reassembleStart + 24) - delay * .6));
  return out * (1 - back);
}
/** The camera for an exploded view: framing widens from the assembled size to the exploded size as the pieces spread. */
export function explodeView(spec: ExplodeSpec, frame: number, radius: number, explodedRadius: number): { view: OrbitView; radius: number } {
  const turn = easeInOut(span01(frame, 0, spec.durationFrames)) * (spec.orbit ?? 12);
  const spreadOut = easeInOut(span01(frame, spec.explodeStart, spec.explodeEnd + 10));
  const back = spec.reassembleStart === undefined ? 0 : easeInOut(span01(frame, spec.reassembleStart, spec.reassembleEnd ?? spec.reassembleStart + 24));
  return { view: { ...spec.view, yaw: spec.view.yaw + turn }, radius: mix(radius, explodedRadius, spreadOut * (1 - back)) };
}

/** Recipes 4 and 5: two or more views side by side, on one canvas. */
export interface CompareSpec {
  durationFrames: number;
  /** Shared camera for a finish comparison; each pane may override it for an angle comparison. */
  view: OrbitView;
  /** Degrees the shared camera turns through the shot, the same in every pane. @default 18 */
  orbit?: number;
  panes: ReadonlyArray<{ label: string; view?: Partial<OrbitView> }>;
  title?: TextBeat;
}
export function compareShot(spec: CompareSpec, pane: number, frame: number, center: Vec3, radius: number, aspect: number): TurntableShot {
  const turn = easeInOut(span01(frame, 0, spec.durationFrames)) * (spec.orbit ?? 18);
  const view = { ...spec.view, ...spec.panes[pane]?.view };
  return { pose: orbitPose(center, radius, { ...view, yaw: 0 }, aspect), turn: view.yaw + turn };
}
/** Pane rectangles in 0..1 of the canvas: side by side for two, a grid for four. A thin gutter keeps the panes apart. */
export function paneRects(count: number, gutter = .008): Array<{ x: number; y: number; w: number; h: number }> {
  if (count <= 1) return [{ x: 0, y: 0, w: 1, h: 1 }];
  if (count === 2) return [{ x: 0, y: 0, w: .5 - gutter / 2, h: 1 }, { x: .5 + gutter / 2, y: 0, w: .5 - gutter / 2, h: 1 }];
  const cols = count <= 4 ? 2 : 3, rows = Math.ceil(count / cols), w = (1 - gutter * (cols - 1)) / cols, h = (1 - gutter * (rows - 1)) / rows;
  return Array.from({ length: count }, (_, i) => ({ x: (i % cols) * (w + gutter), y: Math.floor(i / cols) * (h + gutter), w, h }));
}

// ------------------------------------------------------------------ inspection

export type StudioShotKind = "hero-turn" | "part-spotlight" | "exploded-view" | "compare" | "screen-alive" | "step-inside";
export interface StudioShotProblem { code: string; severity: "error" | "warning"; message: string }
const fpsOf = (fps: number) => fps > 0 ? fps : 30;
/** Seconds a viewer needs to read a beat: about three words a second, plus a moment to find it. */
export const readingSeconds = (beat: TextBeat) => (words(beat.text) + words(beat.sub)) / 3 + .8;
function checkText(problems: StudioShotProblem[], beat: TextBeat | undefined, settle: number, duration: number, fps: number, maxWords: number, name: string) {
  if (!beat) return;
  if (words(beat.text) > maxWords) problems.push({ code: "studio-text-long", severity: "warning", message: `The ${name} has ${words(beat.text)} words. Keep it to ${maxWords}; put the rest in the narration.` });
  if (beat.enter < settle) problems.push({ code: "studio-text-before-settle", severity: "error", message: `The ${name} enters at frame ${beat.enter}, before the camera settles at ${settle}. Text over a moving camera is hard to read; enter at ${settle + 6} or later.` });
  const visible = ((beat.exit ?? duration) - beat.enter) / fps;
  if (visible < readingSeconds(beat)) problems.push({ code: "studio-text-short", severity: "error", message: `The ${name} is on screen for ${visible.toFixed(1)} s but needs about ${readingSeconds(beat).toFixed(1)} s to read.` });
}
/** Checks a recipe's timing and framing against the craft rules. Errors make a shot wrong; warnings make it weaker. */
export function inspectStudioShot(kind: StudioShotKind, spec: HeroTurnSpec | PartSpotlightSpec | ExplodeSpec | CompareSpec | ScreenAliveSpec | StepInsideSpec, fps = 30): StudioShotProblem[] {
  const problems: StudioShotProblem[] = [], f = fpsOf(fps);
  if (kind === "hero-turn") {
    const s = spec as HeroTurnSpec, seconds = Math.max(1, s.settleFrame) / f, rate = Math.abs(s.yawTo - s.yawFrom) / seconds;
    if (rate > 45) problems.push({ code: "studio-turn-fast", severity: "error", message: `The turn averages ${rate.toFixed(0)}°/s. Above 45°/s a product reads as spinning, not being shown. Aim for 10 to 30.` });
    else if (rate > 30) problems.push({ code: "studio-turn-fast", severity: "warning", message: `The turn averages ${rate.toFixed(0)}°/s; 10 to 30 reads as considered.` });
    if (Math.abs(s.holdDrift ?? 1.5) > 3) problems.push({ code: "studio-hold-drift", severity: "warning", message: "Drift through the hold is over 3°; the hold stops reading as a hold." });
    if ((s.durationFrames - s.settleFrame) / f < 1.5) problems.push({ code: "studio-hold-short", severity: "error", message: "The hold after the camera lands is under 1.5 s. The landing is the point of the shot; give it time." });
    checkText(problems, s.claim, s.settleFrame, s.durationFrames, f, 8, "claim");
  } else if (kind === "part-spotlight") {
    const s = spec as PartSpotlightSpec;
    const push = (s.pushEnd - s.pushStart) / f;
    if (push < .7) problems.push({ code: "studio-push-fast", severity: "warning", message: `The push lasts ${push.toFixed(1)} s. Under 0.7 s it feels like a jump cut.` });
    if ((s.dim ?? .4) > .7) problems.push({ code: "studio-dim-heavy", severity: "warning", message: "Dimming the rest by more than 0.7 loses the context the part belongs to." });
    if ((s.durationFrames - s.pushEnd) / f < 1.5) problems.push({ code: "studio-hold-short", severity: "error", message: "Under 1.5 s on the part after the camera arrives." });
    checkText(problems, s.label, s.pushEnd, s.durationFrames, f, 6, "label");
  } else if (kind === "exploded-view") {
    const s = spec as ExplodeSpec, out = (s.explodeEnd - s.explodeStart) / f;
    if (out < .6) problems.push({ code: "studio-explode-fast", severity: "warning", message: `Parts separate in ${out.toFixed(1)} s. Under 0.6 s the eye cannot follow where each one went.` });
    const holdEnd = s.reassembleStart ?? s.durationFrames, maxDelay = (s.parts?.length ?? 8) * (s.stagger ?? 3);
    if ((holdEnd - s.explodeEnd - maxDelay) / f < 1.2) problems.push({ code: "studio-hold-short", severity: "error", message: "The exploded hold is under 1.2 s once every part has arrived." });
    if ((s.parts?.length ?? 0) > 9) problems.push({ code: "studio-explode-busy", severity: "warning", message: "More than nine moving parts at once reads as debris. Group small parts or explode in two passes." });
    checkText(problems, s.title, 0, s.durationFrames, f, 8, "title");
  } else if (kind === "step-inside") {
    const s = spec as StepInsideSpec;
    if (s.crossFrame - s.closeFrame < 8) problems.push({ code: "studio-cross-abrupt", severity: "error", message: "The dolly through the window is under 8 frames; the crossing reads as a cut. Give it 10 to 20." });
    if ((s.durationFrames - s.crossFrame) / f < 2.5) problems.push({ code: "studio-world-short", severity: "error", message: "Under 2.5 s inside the world. The arrival is the reward; let the viewer look around." });
    if ((s.closeFrame - s.pushStart) / f < .9) problems.push({ code: "studio-push-fast", severity: "warning", message: "The approach to the window is under 0.9 s." });
    checkText(problems, s.title, s.crossFrame + 12, s.durationFrames, f, 8, "title");
  } else if (kind === "screen-alive") {
    const s = spec as ScreenAliveSpec;
    if (s.uiStart < s.pushEnd - 6) problems.push({ code: "studio-ui-early", severity: "error", message: `The interface starts at frame ${s.uiStart}, before the camera lands at ${s.pushEnd}. Its first moments would be lost in the move; start it as the camera arrives.` });
    const onScreen = ((s.pullStart ?? s.durationFrames) - s.pushEnd) / f;
    if (onScreen < 2.5) problems.push({ code: "studio-hold-short", severity: "error", message: `${onScreen.toFixed(1)} s on the screen. An interface needs at least 2.5 s to perform and be read.` });
    if ((s.pushEnd - s.pushStart) / f < .8) problems.push({ code: "studio-push-fast", severity: "warning", message: "A push into a screen under 0.8 s reads as a cut." });
    checkText(problems, s.title, s.pushEnd, s.durationFrames, f, 8, "title");
  } else {
    const s = spec as CompareSpec;
    if (s.panes.length < 2) problems.push({ code: "studio-compare-one", severity: "error", message: "A comparison needs at least two panes." });
    if (s.panes.length > 4) problems.push({ code: "studio-compare-busy", severity: "warning", message: "More than four panes turns into a contact sheet; viewers cannot compare that many at once." });
    if (s.panes.some(pane => words(pane.label) > 4)) problems.push({ code: "studio-text-long", severity: "warning", message: "Pane labels read best in four words or fewer." });
    checkText(problems, s.title, 0, s.durationFrames, f, 8, "title");
  }
  return problems;
}
