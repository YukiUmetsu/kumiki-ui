/** Screen demo: real UI, as screenshots or as live React, driven by a choreographed cursor. The cursor moves the way a hand moves a
 * mouse, clicks with a ripple and types with a human rhythm; the camera zooms to the active region a moment before the action and
 * eases back out when the work is done, as screen-recording tools do; callouts name what changed.
 *
 * Motion is grounded, not guessed (doc 32, docs/component-specs/screen-demo.md):
 * - Travel time follows Fitts' law for the mouse, MT = 230 + 166·log2(D/W + 1) ms (MacKenzie, Sellen and Buxton 1991), slowed by
 *   `pace` because demos are watched, not performed; the path is minimum-jerk (Flash and Hogan 1985) with a slight arc.
 * - The camera lands on the element being acted on, not the cursor's area, and zooms modestly (1.5–2.2× is practitioner guidance),
 *   because signaling helps learning when it points at what matters (Mayer; Alpizar et al. 2020).
 *
 * Pure and frame-addressed: `compileScreenDemo` plans once; `evaluateScreenDemo` reads any frame in any order.
 */
import type { ImageAsset } from "./scene-templates";

export interface ScreenRect { x: number; y: number; width: number; height: number }
export type ScreenValue = string | number | boolean;
/** One screenshot of the screen in one state. Its pixels must have the screen's aspect (retina captures are welcome). */
export interface ScreenImageState { id: string; image: ImageAsset }
export type ScreenSource =
  /** Screenshots, one per state. A click can `show` another. */
  | { kind: "images"; states: readonly ScreenImageState[] }
  /** Live React UI, registered by name with the stage's `renderScreen`. Steps `set` its state and type into it. */
  | { kind: "ui"; ui: string; state?: Readonly<Record<string, ScreenValue>> };

interface StepBase {
  /** A name for the step's moment, for captions, sounds and the story's turn. @default `<do>-<n>`, as `click-2` */
  id?: string;
  /** Frame in the scene where the step begins. By default it follows the step before, with time to see the result. */
  at?: number;
  /** A short note pinned beside the target after the action lands, until the next step begins. */
  callout?: string;
  /** Let the camera stay where it is for this step. @default true */
  focus?: boolean;
}
export interface ScreenClick extends StepBase { do: "click"; target: string; /** Image state shown after the click. */ show?: string; /** UI state set by the click. */ set?: Readonly<Record<string, ScreenValue>> }
export interface ScreenType extends StepBase {
  do: "type"; target: string; text: string;
  /** UI state key that receives the text as it is typed. @default the target's name */
  into?: string;
  /** Characters a second. @default 10 */
  cps?: number;
  /** How typed text is drawn on a screenshot: its type, and the field colour laid under it to cover a placeholder. Live UI draws its own. */
  style?: { color?: string; fontSize?: number; insetX?: number; font?: string; background?: string };
  /** Click the field first. @default true */
  click?: boolean;
  show?: string; set?: Readonly<Record<string, ScreenValue>>;
}
export interface ScreenMove extends StepBase { do: "move"; target: string }
export interface ScreenScroll extends StepBase { do: "scroll"; /** Content y to scroll to, or a target to bring into view. */ to: number | string }
/** The screen changes with no cursor action: a result loads, a toast appears. */
export interface ScreenShow extends StepBase { do: "show"; show?: string; set?: Readonly<Record<string, ScreenValue>>; /** Where the change is, for the camera and the callout. */ target?: string }
export interface ScreenWait extends StepBase { do: "wait"; frames: number }
export type ScreenStep = ScreenClick | ScreenType | ScreenMove | ScreenScroll | ScreenShow | ScreenWait;

export interface ScreenDemoContent {
  /** What the viewer sees, for a screen reader and the review. */
  label: string;
  /** The screen's design size in CSS pixels: the size the screenshots show, or the size the live UI lays out at. `contentHeight`
   * taller than `height` scrolls. */
  screen: { width: number; height: number; contentHeight?: number };
  source: ScreenSource;
  /** Named regions in content pixels. For live UI, mark the same elements `data-km-demo-target="<name>"`; the review checks they match. */
  targets: Readonly<Record<string, ScreenRect>>;
  steps: readonly ScreenStep[];
  /** The frame around the screen. @default "browser" */
  chrome?: "browser" | "window" | "phone" | "none";
  /** Text in the browser's address bar or the window's title. Author data. */
  url?: string;
  title?: string;
  cursor?: {
    /** Multiplies Fitts' law travel time. 1 is a practised hand; demos read better slower. @default 1.35 */
    pace?: number;
    /** Arrow height in screen pixels. @default 26 */
    size?: number;
    /** Where the cursor rests at the first frame: a target, or a point in the screen. @default 62% across, 72% down */
    start?: string | { x: number; y: number };
  };
  zoom?: {
    /** The closest the camera goes. @default 1.8 */
    max?: number;
    /** Follow the action. Off keeps the whole screen in view. @default true */
    auto?: boolean;
  };
}

export interface ScreenCamera { zoom: number; cx: number; cy: number }
interface CameraMove { start: number; end: number; from: ScreenCamera; to: ScreenCamera }
interface CursorMove { start: number; end: number; from: { x: number; y: number }; to: { x: number; y: number }; arc: number }
interface TypingRun { target: string; into: string; text: string; frames: readonly number[]; end: number; style?: ScreenType["style"]; image: boolean;
  /** On a screenshot, the frame the next screenshot replaces the field: the drawn text goes with it. */ until: number }
export interface ScreenStepTiming { index: number; id: string; kind: ScreenStep["do"]; start: number; arrive: number; action: number; end: number }
export interface ScreenDemoPlan {
  content: ScreenDemoContent;
  view: ScreenView;
  /** The camera at the first frame. */
  opening: ScreenCamera;
  fps: number;
  durationFrames: number;
  steps: readonly ScreenStepTiming[];
  cursor: { start: { x: number; y: number }; moves: readonly CursorMove[]; presses: readonly number[]; size: number };
  typing: readonly TypingRun[];
  changes: ReadonlyArray<{ frame: number; show?: string; set?: Readonly<Record<string, ScreenValue>> }>;
  scrolls: ReadonlyArray<{ start: number; end: number; from: number; to: number }>;
  camera: readonly CameraMove[];
  callouts: ReadonlyArray<{ text: string; target: string; start: number; end: number }>;
  cues: ReadonlyArray<{ id: string; frame: number }>;
}
export interface ScreenDemoProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

/** Frames a click needs: a short dwell on the target, the press, and the release. */
export const SCREEN_DWELL = 4, SCREEN_PRESS = 3, SCREEN_RIPPLE = 12, SCREEN_SWAP = 4;
const CURSOR_REST = { x: .62, y: .72 };
const minimumJerk = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const smoother = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * u * (u * (u * 6 - 15) + 10); };
const centre = (r: ScreenRect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
/** A repeatable 0..1 value for a step and a character. */
function noise(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/** Frames of travel for a pointing move: Fitts' law for the mouse (MacKenzie, Sellen and Buxton 1991), slowed by `pace`. */
export function travelFrames(distance: number, targetSize: number, fps: number, pace = 1.35): number {
  if (distance < 2) return 0;
  const id = Math.log2(distance / Math.max(4, targetSize) + 1);
  return Math.max(8, Math.round((.23 + .166 * id) * pace * fps));
}
/** Frame offsets, from the first character, at which each character of `text` appears. Spaces and punctuation take a little longer,
 * and every gap varies, as a typist's do. */
export function typingFrames(text: string, fps: number, cps = 10, seed = 1): number[] {
  const frames: number[] = [];
  let at = 0;
  for (let i = 0; i < text.length; i += 1) {
    frames.push(Math.round(at));
    const pause = /[\s.,;:!?]/.test(text[i]) ? 1.6 : 1;
    at += fps / cps * pause * (.7 + .6 * noise(seed, i));
  }
  return frames;
}

const isAction = (step: ScreenStep): step is ScreenClick | ScreenType | ScreenMove => step.do === "click" || step.do === "type" || step.do === "move";
const stepTarget = (step: ScreenStep): string | undefined => "target" in step ? step.target : step.do === "scroll" && typeof step.to === "string" ? step.to : undefined;

/** What the output shows of the screen at zoom 1, in screen pixels, and the zoom range the camera works in. In a frame shaped like the
 * screen this is the screen itself. In a portrait frame a landscape screen is a thin strip, so the working zoom starts higher
 * (`base`, up to 1.6) and the camera crops in and follows the action, as vertical edits of desktop demos do. */
export interface ScreenView { width: number; height: number; base: number; max: number }
export function screenView(content: ScreenDemoContent, output?: { width: number; height: number; safe?: { left: number; right: number; top: number; bottom: number } }): ScreenView {
  const max = content.zoom?.max ?? 1.8;
  if (!output) return { width: content.screen.width, height: content.screen.height, base: 1, max };
  const place = screenPlacement(content, output, output.safe), width = place.avail.width / place.scale, height = place.avail.height / place.scale;
  const spare = Math.max(height / content.screen.height, width / content.screen.width), base = spare > 1.25 ? Math.min(1.6, spare) : 1;
  return { width, height, base, max: max * base };
}
/** The camera that frames a region: the region with room around it (`room` across, `roomY` down), between the view's base and its
 * limit, kept inside the screen. A lone control gets generous room, so it sits in its context; a group of controls gets less. */
export function frameTarget(target: ScreenRect, screen: { width: number; height: number }, view: ScreenView, room = 1.6, roomY = 6): ScreenCamera {
  const zoom = Math.min(view.max, Math.max(view.base, Math.min(view.width / (target.width * room), view.height / (target.height * roomY))));
  return clampCamera({ zoom, cx: target.x + target.width / 2, cy: target.y + target.height / 2 }, screen, view);
}
function clampCamera(camera: ScreenCamera, screen: { width: number; height: number }, view: ScreenView): ScreenCamera {
  const halfW = view.width / camera.zoom / 2, halfH = view.height / camera.zoom / 2;
  const fit = (c: number, half: number, size: number) => half * 2 >= size ? size / 2 : Math.min(size - half, Math.max(half, c));
  return { zoom: camera.zoom, cx: fit(camera.cx, halfW, screen.width), cy: fit(camera.cy, halfH, screen.height) };
}
const union = (a: ScreenRect, b: ScreenRect): ScreenRect => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
};
/** The zoom a group of actions must allow to share one framing; below it, each gets its own. */
export const SCREEN_GROUP_ZOOM = 1.3;
/** The part of a target the camera needs: for typing, the start of the field, where the words appear. */
function focusRect(step: ScreenStep, target: ScreenRect): ScreenRect {
  if (step.do !== "type") return target;
  return { ...target, width: Math.min(target.width, Math.max(240, step.text.length * target.height * .3 + 80)) };
}
/** One framing per run of nearby actions, so the camera moves once for a field and its button instead of fidgeting between them. */
function planFraming(content: ScreenDemoContent, view: ScreenView): { group: number[]; cameras: ScreenCamera[] } {
  const screen = content.screen, targets = content.targets ?? {}, contentHeight = Math.max(screen.height, screen.contentHeight ?? screen.height);
  const group: number[] = [], cameras: ScreenCamera[] = [];
  let scroll = 0, current: ScreenRect | undefined, members = 0;
  const close = () => { if (current) cameras.push(members > 1 ? frameTarget(current, screen, view, 1.12, 2.2) : frameTarget(current, screen, view)); current = undefined; members = 0; };
  content.steps.forEach((step, index) => {
    group[index] = -1;
    if (step.do === "scroll") {
      close();
      const target = typeof step.to === "string" ? targets[step.to] : undefined;
      scroll = Math.min(contentHeight - screen.height, Math.max(0, typeof step.to === "number" ? step.to : target ? target.y + target.height / 2 - screen.height / 2 : scroll));
      return;
    }
    const name = stepTarget(step), target = name ? targets[name] : undefined;
    if (!target || step.focus === false || step.do === "wait") return;
    const rect = focusRect(step, { ...target, y: target.y - scroll });
    const merged = current && union(current, rect);
    if (merged && frameTarget(merged, screen, view, 1.12, 2.2).zoom >= Math.min(SCREEN_GROUP_ZOOM * view.base, view.max) && frameTarget(rect, screen, view).zoom > view.base) { current = merged; members += 1; }
    else { close(); current = rect; members = 1; }
    group[index] = cameras.length;
  });
  close();
  return { group, cameras };
}

/** Frames the opening holds still before the first step, so the viewer takes in the screen. */
export const SCREEN_OPENING = .6;
/** Plan a demo for a scene of `durationFrames`, for an output of a given size (the camera crops to its shape). Problems with the
 * content come back with JSON paths; a plan is returned anyway, so a stage can still draw what it can. */
export function compileScreenDemo(content: ScreenDemoContent, durationFrames: number, fps: number,
  output?: { width: number; height: number; safe?: { left: number; right: number; top: number; bottom: number } }): { plan: ScreenDemoPlan; problems: ScreenDemoProblem[] } {
  const problems: ScreenDemoProblem[] = [];
  const report = (severity: ScreenDemoProblem["severity"], code: string, path: string, message: string, hint?: string) => problems.push({ severity, code, path, message, hint });
  const screen = content.screen, contentHeight = Math.max(screen.height, screen.contentHeight ?? screen.height);
  const targets = content.targets ?? {}, pace = content.cursor?.pace ?? 1.35, auto = content.zoom?.auto ?? true;
  const imageStates = content.source.kind === "images" ? content.source.states.map(state => state.id) : [];
  const known = (name: string | undefined, path: string) => {
    if (name !== undefined && !targets[name]) { report("error", "screen-unknown-target", path, `"${name}" is not a target.`, `Targets: ${Object.keys(targets).join(", ") || "none"}.`); return false; }
    return true;
  };
  const shows = (state: string | undefined, path: string) => {
    if (state === undefined) return;
    if (content.source.kind !== "images") report("error", "screen-show-ui", path, '"show" switches screenshots; live UI changes with "set".');
    else if (!imageStates.includes(state)) report("error", "screen-unknown-state", path, `"${state}" is not a screenshot state.`, `States: ${imageStates.join(", ")}.`);
  };

  const startPoint = (() => {
    const start = content.cursor?.start;
    if (typeof start === "string") return known(start, "/cursor/start") ? centre(targets[start]) : { x: screen.width * CURSOR_REST.x, y: screen.height * CURSOR_REST.y };
    return start ?? { x: screen.width * CURSOR_REST.x, y: screen.height * CURSOR_REST.y };
  })();
  const kinds: Record<string, number> = {};
  let cursor = startPoint, frame = 0, scroll = 0;
  const steps: ScreenStepTiming[] = [], moves: CursorMove[] = [], presses: number[] = [], typing: TypingRun[] = [], changes: ScreenDemoPlan["changes"][number][] = [];
  const scrolls: ScreenDemoPlan["scrolls"][number][] = [], cameraMoves: CameraMove[] = [], callouts: ScreenDemoPlan["callouts"][number][] = [], cues: { id: string; frame: number }[] = [];
  const view = screenView(content, output), ids = new Set<string>(), framing = planFraming(content, view);
  // The opening framing: the whole screen, or in a cropped view its working framing, centred.
  const opening = clampCamera({ zoom: view.base, cx: screen.width / 2, cy: screen.height / 2 }, screen, view);
  let camera: ScreenCamera = opening;
  let framed = -1;
  /** Move the camera to the step's framing, landing by `land`, unless it is already there. */
  const focusOn = (index: number, from: number, land: number) => {
    const group = framing.group[index];
    if (!auto || group < 0 || group === framed) return;
    const wanted = framing.cameras[group];
    framed = group;
    if (Math.abs(Math.log(wanted.zoom / camera.zoom)) < .02 && Math.hypot(wanted.cx - camera.cx, wanted.cy - camera.cy) < 4) return;
    const previousEnd = cameraMoves[cameraMoves.length - 1]?.end ?? 0, start = Math.max(previousEnd, Math.min(from, land - 18)), end = Math.max(start + 18, land);
    cameraMoves.push({ start, end, from: camera, to: wanted });
    camera = wanted;
  };
  /** Step back: to the whole screen, or in a cropped view to its working framing, staying over where the work was. */
  const zoomOut = (from: number) => {
    framed = -1;
    const to = clampCamera({ zoom: view.base, cx: view.base > 1 ? camera.cx : screen.width / 2, cy: screen.height / 2 }, screen, view);
    if (!auto || (Math.abs(camera.zoom - to.zoom) < .01 && Math.hypot(camera.cx - to.cx, camera.cy - to.cy) < 4)) return;
    const start = Math.max(from, cameraMoves[cameraMoves.length - 1]?.end ?? 0);
    cameraMoves.push({ start, end: start + Math.round(fps * .8), from: camera, to });
    camera = to;
  };

  content.steps.forEach((step, index) => {
    const path = `/steps/${index}`;
    kinds[step.do] = (kinds[step.do] ?? 0) + 1;
    const id = step.id ?? `${step.do}-${kinds[step.do]}`;
    if (ids.has(id)) report("error", "screen-step-id", path + "/id", `Step name "${id}" is used twice.`);
    ids.add(id);
    const targetName = stepTarget(step), targetOk = known(targetName, path + (step.do === "scroll" ? "/to" : "/target"));
    const target = targetName && targetOk ? targets[targetName] : undefined;
    if (index === 0 && step.at === undefined) frame = Math.round(fps * SCREEN_OPENING);
    if (step.at !== undefined) {
      if (step.at < frame) report("warning", "screen-step-overlap", path + "/at", `This step starts at frame ${step.at}, before the step before it is done (frame ${frame}).`, "Remove `at` to let the steps follow each other.");
      frame = Math.max(frame, step.at);
    }
    // Idle for a while with the camera in: step back so the viewer sees where the next thing happens.
    const previous = steps[steps.length - 1];
    if (previous && frame - previous.end > fps * 3) zoomOut(previous.end + Math.round(fps));
    const start = frame;
    let arrive = start, action = start, end = start;
    if (isAction(step) && target) {
      // Typing: the hand clicks where the words will go, near the start of the field.
      const goal = centre(focusRect(step, { ...target, y: target.y - scroll })), distance = Math.hypot(goal.x - cursor.x, goal.y - cursor.y);
      const travel = travelFrames(distance, Math.min(target.width, target.height), fps, pace);
      if (travel) moves.push({ start, end: start + travel, from: cursor, to: goal, arc: distance * .06 * (noise(index, 7) > .5 ? 1 : -1) });
      arrive = start + travel;
      cursor = goal;
      focusOn(index, start, arrive - 2);
      action = arrive;
      if (step.do === "click" || (step.do === "type" && step.click !== false)) {
        action = arrive + SCREEN_DWELL;
        presses.push(action);
      }
      end = action + (step.do === "move" ? 0 : SCREEN_PRESS);
      if (step.do === "type") {
        if (!step.text) report("error", "screen-type-empty", path + "/text", "Nothing to type.");
        if (step.text.length > 48) report("warning", "screen-type-long", path + "/text", `${step.text.length} characters is a long wait to watch.`, "Type the start, then show the rest, or cut it to the words that matter.");
        const offsets = typingFrames(step.text, fps, step.cps ?? 10, index + 1), first = end + 2;
        typing.push({ target: targetName!, into: step.into ?? targetName!, text: step.text, frames: offsets.map(offset => first + offset), end: first + (offsets[offsets.length - 1] ?? 0) + 1,
          style: step.style, image: content.source.kind === "images", until: Infinity });
        action = first;
        end = typing[typing.length - 1].end;
      }
    } else if (step.do === "scroll") {
      const y = typeof step.to === "number" ? step.to : target ? target.y + target.height / 2 - screen.height / 2 : scroll;
      const to = Math.min(contentHeight - screen.height, Math.max(0, y));
      if (contentHeight === screen.height) report("error", "screen-scroll-none", path, "The screen does not scroll.", 'Set "screen.contentHeight" taller than "screen.height".');
      const frames = Math.round(fps * (.45 + Math.abs(to - scroll) / 1800));
      if (to !== scroll) scrolls.push({ start, end: start + frames, from: scroll, to });
      // The camera steps back before a scroll, so the page moves under a still view.
      zoomOut(start - Math.round(fps * .5));
      scroll = to;
      arrive = action = end = start + frames;
    } else if (step.do === "wait") {
      if (!(step.frames > 0)) report("error", "screen-wait", path + "/frames", "A wait needs a positive number of frames.");
      arrive = action = end = start + Math.max(0, step.frames || 0);
    } else if (step.do === "show") {
      focusOn(index, start - 12, start);
    }
    const change = "show" in step || "set" in step ? { show: (step as ScreenClick).show, set: (step as ScreenClick).set } : undefined;
    if (change && (change.show !== undefined || change.set)) {
      shows(change.show, path + "/show");
      if (change.set && content.source.kind !== "ui") report("error", "screen-set-images", path + "/set", '"set" changes live UI; a screenshot changes with "show".');
      changes.push({ frame: step.do === "type" ? end : action + (step.do === "click" ? 2 : 0), show: change.show, set: change.set });
    }
    if (step.callout !== undefined) {
      if (!target) report("error", "screen-callout-target", path + "/callout", "A callout points at the step's target, and this step has none.");
      else callouts.push({ text: step.callout, target: targetName!, start: end + 6, end: durationFrames });
      if (step.callout.split(/\s+/).filter(Boolean).length > 8) report("warning", "screen-callout-long", path + "/callout", "A callout over eight words is read instead of glanced at.", "Name the change in a few words.");
    }
    // Time to see what happened: longer after a change than after a move.
    const settle = change ? Math.round(fps * .8) : step.do === "move" || step.do === "wait" ? 0 : Math.round(fps * .35);
    frame = end + settle;
    steps.push({ index, id, kind: step.do, start, arrive, action, end });
    if (step.do !== "wait") cues.push({ id, frame: step.do === "move" ? arrive : action });
  });
  // Text drawn over a screenshot belongs to that screenshot.
  typing.forEach(run => { if (run.image) run.until = changes.find(change => change.show && change.frame > run.frames[0])?.frame ?? Infinity; });
  // A callout lasts until the next step begins.
  callouts.forEach(callout => {
    const next = steps.find(step => step.start > callout.start);
    if (next) callout.end = Math.max(callout.start + Math.round(fps * .8), next.start);
  });
  const last = steps[steps.length - 1];
  if (!content.steps.length) report("error", "screen-no-steps", "/steps", "A screen demo needs at least one step.");
  if (!content.label?.trim()) report("error", "screen-label", "/label", "A screen demo needs a text alternative.", "Say what the viewer watches happen.");
  if (last && last.end > durationFrames) report("error", "screen-overflow", "/steps", `The steps need ${last.end} frames; the scene has ${durationFrames}.`, `Lengthen the scene to at least ${last.end + Math.round(fps * 1.5)} frames.`);
  else if (last && durationFrames - last.end < fps) report("warning", "screen-result-hold", "/steps", `The scene ends ${((durationFrames - last.end) / fps).toFixed(1)} s after the last action, too soon to see the result.`, "Hold the result for a second or more.");
  // Step back to the whole screen at the end, when there is time to see the result close up first.
  if (last && durationFrames - last.end >= fps * 2.4) zoomOut(last.end + Math.round(fps * 1.2));
  const presented = steps.filter(step => step.kind !== "wait" && step.kind !== "scroll");
  presented.forEach((step, i) => { if (i && step.action - presented[i - 1].action < fps * .4) report("warning", "screen-rushed", `/steps/${step.index}`, "Two actions land less than 0.4 s apart: the second is missed.", "Let each action land before the next begins."); });

  // Checks on the content itself.
  if (!(screen.width > 0 && screen.height > 0)) report("error", "screen-size", "/screen", "The screen needs a width and a height.");
  for (const [name, rect] of Object.entries(targets)) {
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > screen.width || rect.y + rect.height > contentHeight)
      report("error", "screen-target-outside", `/targets/${name}`, `Target "${name}" falls outside the screen.`);
    if (Math.min(rect.width, rect.height) < 12) report("warning", "screen-target-small", `/targets/${name}`, `Target "${name}" is under 12 px; the camera will zoom to its limit and still frame it small.`);
  }
  if (content.source.kind === "images") {
    if (!content.source.states.length) report("error", "screen-no-images", "/source/states", "A screenshot demo needs at least one screenshot.");
    content.source.states.forEach((state, i) => {
      const image = state.image;
      if (!image?.licenseRef?.trim()) report("error", "unlicensed-asset", `/source/states/${i}/image`, `Screenshot "${image?.id}" has no rights reference.`);
      if (image?.width && image?.height && Math.abs(image.width / image.height - screen.width / contentHeight) > .01)
        report("error", "screen-image-size", `/source/states/${i}/image`, `Screenshot "${state.id}" is ${image.width}×${image.height}, which is not the screen's ${screen.width}×${contentHeight} shape.`, "Capture the screen at the declared size, or a whole multiple of it.");
    });
  }
  const plan: ScreenDemoPlan = { content, fps, durationFrames, view, opening, steps, cursor: { start: startPoint, moves, presses, size: content.cursor?.size ?? 26 }, typing, changes, scrolls, camera: cameraMoves, callouts, cues };
  return { plan, problems };
}

/** Where the screen sits in an output frame, before the camera: inside the safe area, with room for the chrome. */
export function screenPlacement(content: ScreenDemoContent, frame: { width: number; height: number }, safe = { left: 0, right: 0, top: 0, bottom: 0 }) {
  const chrome = content.chrome ?? "browser", bar = chrome === "browser" ? 44 : chrome === "window" ? 34 : 0, bezel = chrome === "phone" ? 18 : 0;
  const margin = chrome === "none" ? 0 : .045;
  const left = frame.width * Math.max(safe.left, margin), right = frame.width * Math.max(safe.right, margin), top = frame.height * Math.max(safe.top, margin), bottom = frame.height * Math.max(safe.bottom, margin);
  const availW = frame.width - left - right, availH = frame.height - top - bottom;
  const outerW = content.screen.width + bezel * 2, outerH = content.screen.height + bar + bezel * 2;
  const scale = Math.min(availW / outerW, availH / outerH);
  const x = left + (availW - outerW * scale) / 2 + bezel * scale, y = top + (availH - outerH * scale) / 2 + (bar + bezel) * scale;
  return { scale, screen: { x, y, width: content.screen.width * scale, height: content.screen.height * scale }, bar: bar * scale, bezel: bezel * scale, avail: { width: availW, height: availH } };
}

/** The highest camera zoom at which every screenshot still has a pixel for every output pixel. */
export function sharpZoom(content: ScreenDemoContent, frame: { width: number; height: number }, safe?: Parameters<typeof screenPlacement>[2]): number {
  if (content.source.kind !== "images") return Infinity;
  const { scale } = screenPlacement(content, frame, safe);
  const density = Math.min(...content.source.states.map(state => (state.image.width ?? content.screen.width) / content.screen.width));
  return density / scale;
}
/** Problems that depend on the output size: screenshots enlarged past their pixels. */
export function inspectScreenDemoOutput(plan: ScreenDemoPlan, frame: { width: number; height: number }, safe?: Parameters<typeof screenPlacement>[2]): ScreenDemoProblem[] {
  const limit = sharpZoom(plan.content, frame, safe), deepest = Math.max(1, ...plan.camera.map(move => move.to.zoom));
  return deepest > limit * 1.05 ? [{ severity: "warning", code: "screen-zoom-soft", path: "/zoom/max", message: `The camera zooms to ${deepest.toFixed(2)}×, past the ${limit.toFixed(2)}× the screenshots have pixels for at this output size, so text goes soft.`,
    hint: `Capture the screenshots at ${Math.ceil(deepest / limit * 10) / 10}× their current size, or set "zoom": { "max": ${Math.max(1, Math.floor(limit * 10) / 10)} }.` }] : [];
}

export interface ScreenDemoState {
  cursor: { x: number; y: number; pressed: boolean; mode: "arrow" | "text"; size: number };
  ripples: ReadonlyArray<{ x: number; y: number; progress: number }>;
  camera: ScreenCamera;
  scrollY: number;
  /** The screenshot shown, and the one fading out under it. */
  image?: { id: string; previous?: string; mix: number };
  /** Live UI state, with frames since each key last changed (for the UI's own entrance animations). */
  ui: { state: Readonly<Record<string, ScreenValue>>; since: Readonly<Record<string, number>> };
  /** Text typed so far into each target, and the target whose caret blinks. */
  typed: Readonly<Record<string, string>>;
  caret?: { target: string; visible: boolean };
  callouts: ReadonlyArray<{ text: string; target: string; opacity: number }>;
}
/** One frame of a planned demo. Under reduced motion the camera cuts to each framing instead of gliding, and nothing else changes. */
export function evaluateScreenDemo(plan: ScreenDemoPlan, frame: number, options: { reducedMotion?: boolean } = {}): ScreenDemoState {
  const { content } = plan;
  // Cursor.
  let position = plan.cursor.start;
  for (const move of plan.cursor.moves) {
    if (frame >= move.end) position = move.to;
    else if (frame >= move.start) {
      const t = (frame - move.start) / (move.end - move.start), s = minimumJerk(t), dx = move.to.x - move.from.x, dy = move.to.y - move.from.y, length = Math.hypot(dx, dy) || 1;
      const bend = Math.sin(Math.PI * s) * move.arc;
      position = { x: move.from.x + dx * s - dy / length * bend, y: move.from.y + dy * s + dx / length * bend };
      break;
    } else break;
  }
  const pressed = plan.cursor.presses.some(at => frame >= at && frame < at + SCREEN_PRESS);
  const typingNow = plan.typing.find(run => frame >= run.frames[0] - 2 && frame < run.end + plan.fps * .6);
  // Scroll.
  let scrollY = 0;
  for (const item of plan.scrolls) {
    if (frame >= item.end) scrollY = item.to;
    else if (frame >= item.start) { scrollY = item.from + (item.to - item.from) * smoother((frame - item.start) / (item.end - item.start)); break; }
    else break;
  }
  // The cursor lives on the screen, so it rides the page while it scrolls under a still hand: shown at its screen point.
  const ripples = plan.cursor.presses.filter(at => frame >= at && frame < at + SCREEN_RIPPLE).map(at => {
    const moveBefore = [...plan.cursor.moves].reverse().find(move => move.end <= at);
    const p = moveBefore?.to ?? plan.cursor.start;
    return { x: p.x, y: p.y, progress: (frame - at) / SCREEN_RIPPLE };
  });
  // Camera.
  let camera: ScreenCamera = plan.opening;
  for (const move of plan.camera) {
    if (frame >= move.end) camera = move.to;
    else if (frame >= move.start) {
      if (options.reducedMotion) { camera = (frame - move.start) / (move.end - move.start) < .5 ? move.from : move.to; break; }
      const t = smoother((frame - move.start) / (move.end - move.start));
      camera = { zoom: Math.exp(Math.log(move.from.zoom) + (Math.log(move.to.zoom) - Math.log(move.from.zoom)) * t), cx: move.from.cx + (move.to.cx - move.from.cx) * t, cy: move.from.cy + (move.to.cy - move.from.cy) * t };
      break;
    } else break;
  }
  // Screen state.
  const source = content.source;
  let image: ScreenDemoState["image"], state: Record<string, ScreenValue> = source.kind === "ui" ? { ...source.state } : {};
  const since: Record<string, number> = {};
  if (source.kind === "images") {
    let current = source.states[0]?.id ?? "", previous: string | undefined, changedAt = -Infinity;
    for (const change of plan.changes) if (change.frame <= frame && change.show && change.show !== current) { previous = current; current = change.show; changedAt = change.frame; }
    const mix = Math.min(1, (frame - changedAt) / SCREEN_SWAP);
    image = { id: current, previous: mix < 1 ? previous : undefined, mix };
  }
  for (const change of plan.changes) if (change.frame <= frame && change.set) for (const [key, value] of Object.entries(change.set)) { state[key] = value; since[key] = frame - change.frame; }
  const typed: Record<string, string> = {};
  for (const run of plan.typing) {
    const count = run.frames.filter(at => at <= frame).length;
    if (!count || frame >= run.until) continue;
    typed[run.target] = run.text.slice(0, count);
    if (source.kind === "ui") { state = { ...state, [run.into]: run.text.slice(0, count) }; since[run.into] = frame - run.frames[count - 1]; }
  }
  // The caret blinks at the common 530 ms rate, and stays lit while keys are landing.
  const caretRun = plan.typing.find(run => frame >= run.frames[0] - 4 && frame < Math.min(run.end + plan.fps * 1.2, run.until));
  const caret = caretRun && { target: caretRun.target, visible: frame < caretRun.end + 2 || Math.floor((frame - caretRun.end) / (plan.fps * .53)) % 2 === 0 };
  const callouts = plan.callouts.filter(item => frame >= item.start && frame < item.end).map(item => ({ text: item.text, target: item.target, opacity: Math.min(1, (frame - item.start) / 6, (item.end - frame) / 6) }));
  return { cursor: { ...position, pressed, mode: typingNow ? "text" : "arrow", size: plan.cursor.size }, ripples, camera, scrollY, image, ui: { state, since }, typed, caret, callouts };
}
