/** Story scenes in 3D: the specs and craft checks of the scene recipes that tell a story with real objects, light and physics.
 * Free of three.js, so a film document checks them in Node. The renderers are the `*-react.tsx` files named on each spec.
 */
import type { OrbitView, TextBeat } from "./studio-shots";

export interface Story3dProblem { code: string; severity: "error" | "warning"; message: string }
const seconds = (frames: number, fps: number) => frames / (fps > 0 ? fps : 30);
/** Seconds a viewer needs to read a beat: about three words a second, plus a moment to find it. */
export const readSeconds = (beat: TextBeat) => .8 + beat.text.split(/\s+/).filter(Boolean).length / 3 + (beat.sub ? beat.sub.split(/\s+/).filter(Boolean).length / 3.5 : 0);
/** A text beat must stay up long enough to read: until its exit, or the scene's end. */
function readable(problems: Story3dProblem[], name: string, beat: TextBeat | undefined, endFrame: number, fps: number) {
  if (!beat) return;
  const on = seconds((beat.exit ?? endFrame) - beat.enter, fps), need = readSeconds(beat);
  if (on < need) problems.push({ code: "story3d-text-short", severity: "error", message: `The ${name} is on screen for ${on.toFixed(1)} s but needs about ${need.toFixed(1)} s to read.` });
}

// ------------------------------------------------------------------ Shadow Reveal

/** Shapes a shadow can take. Each is drawn from a path in a unit square, so it reads at any size. */
export const SHADOW_SILHOUETTES = ["house", "heart", "key", "arrow-up", "shield", "lightbulb", "question"] as const;
export type ShadowSilhouette = typeof SHADOW_SILHOUETTES[number];
/** `ShadowReveal` (`shadow-reveal-react.tsx`): pieces hang in the dark, and their shadow on the wall reads as one thing. The camera
 * swings toward the light, and near its viewpoint the scattered pieces line up into the shape in front of their own shadow. */
export interface ShadowRevealSpec {
  durationFrames: number;
  /** What the shadow shows. */
  silhouette: ShadowSilhouette;
  /** What casts it: proof coins, or lacquered wooden blocks. @default "coins" */
  pieces?: "coins" | "blocks";
  /** Cells across the shape. More pieces make a cleaner edge and a denser cloud. 24 to 56. @default 44 */
  density?: number;
  /** The camera leaves the wall here and lands near the light's viewpoint at `revealEnd`. */
  revealStart: number;
  revealEnd: number;
  /** Asked while only the shadow is seen. */
  question?: TextBeat;
  /** Given once the pieces line up. */
  answer?: TextBeat;
  seed?: number;
}
export function inspectShadowReveal(spec: ShadowRevealSpec, fps = 30): Story3dProblem[] {
  const problems: Story3dProblem[] = [];
  if (!SHADOW_SILHOUETTES.includes(spec.silhouette)) problems.push({ code: "shadow-silhouette", severity: "error", message: `"${spec.silhouette}" is not a silhouette. Use one of: ${SHADOW_SILHOUETTES.join(", ")}.` });
  if (seconds(spec.revealStart, fps) < 1.5) problems.push({ code: "shadow-reveal-early", severity: "warning", message: "Hold on the shadow for 1.5 s or more, so the viewer reads it as the thing before learning what it is." });
  const move = seconds(spec.revealEnd - spec.revealStart, fps);
  if (move < 2) problems.push({ code: "shadow-reveal-fast", severity: "warning", message: `The camera swings in ${move.toFixed(1)} s. Under 2 s the cloud of pieces blurs past before it lines up.` });
  if (spec.revealEnd > spec.durationFrames - fps * 1.5) problems.push({ code: "shadow-hold-short", severity: "error", message: "Leave 1.5 s or more after the pieces line up: that is the answer." });
  if (spec.question && spec.question.enter >= spec.revealStart) problems.push({ code: "shadow-question-late", severity: "error", message: "Ask the question while only the shadow shows, before `revealStart`." });
  if (spec.answer && spec.answer.enter < spec.revealEnd - fps * .5) problems.push({ code: "shadow-answer-early", severity: "error", message: "Give the answer once the pieces have lined up, near `revealEnd`." });
  readable(problems, "question", spec.question && { ...spec.question, exit: spec.question.exit ?? spec.revealStart + fps }, spec.durationFrames, fps);
  readable(problems, "answer", spec.answer, spec.durationFrames, fps);
  if (spec.density !== undefined && (spec.density < 24 || spec.density > 56)) problems.push({ code: "shadow-density", severity: "warning", message: "Density outside 24 to 56: fewer cells break the shape, more cost time without a cleaner shadow." });
  return problems;
}

// ------------------------------------------------------------------ Chain Reaction

/** `ChainReaction` (`chain-reaction-react.tsx`): one link of a cause-and-effect chain printed on each domino, every domino 1.35 times
 * taller than the last. The camera reads the chain from cause to effect, then the first is tipped and the fall grows to the last. */
export interface ChainReactionSpec {
  durationFrames: number;
  /** The chain, cause first: one short line per domino, 3 to 8 of them. */
  links: readonly string[];
  /** The frame the first domino is tipped. Before it, the camera reads each link. */
  pushFrame: number;
  /** Playback speed of the fall: 0.55 is a little over half speed, as a high-speed camera shows it. @default 0.55 */
  speed?: number;
  title?: TextBeat;
}
export const CHAIN_LINKS = { min: 3, max: 8 } as const;
/** Frames the camera spends on each link before the push: time to read it, and a short move to the next. */
export function chainReadFrames(links: readonly string[], fps = 30): number[] {
  return links.map(text => Math.round((readSeconds({ text, enter: 0 }) * .8 + .45) * (fps > 0 ? fps : 30)));
}
/** The frame the fall settles, from the bake's settled frame (`physicsSettleFrame`). */
export const chainSettleFrame = (spec: ChainReactionSpec, physicsSettleFrame: number) => spec.pushFrame + Math.ceil(physicsSettleFrame / (spec.speed ?? .55));
export function inspectChainReaction(spec: ChainReactionSpec, physicsSettleFrame: number, fps = 30): Story3dProblem[] {
  const problems: Story3dProblem[] = [];
  if (spec.links.length < CHAIN_LINKS.min || spec.links.length > CHAIN_LINKS.max) problems.push({ code: "chain-links", severity: "error", message: `A chain reaction takes ${CHAIN_LINKS.min} to ${CHAIN_LINKS.max} links; this one has ${spec.links.length}.` });
  spec.links.forEach((text, i) => { if (text.split(/\s+/).filter(Boolean).length > 6) problems.push({ code: "chain-link-long", severity: "warning", message: `Link ${i + 1} has more than six words. A domino's face holds a short line; say the rest in narration.` }); });
  const read = chainReadFrames(spec.links, fps).reduce((a, b) => a + b, 0) + Math.round(fps * .8);
  if (spec.pushFrame < read) problems.push({ code: "chain-read-short", severity: "error", message: `The push comes at frame ${spec.pushFrame}, but reading the links and stepping back takes about ${read} frames.`, });
  const speed = spec.speed ?? .55;
  if (speed < .25 || speed > 1) problems.push({ code: "chain-speed", severity: "warning", message: "Play the fall between 0.25 and 1 times real speed: slower drags, faster is gone before it registers." });
  const settle = chainSettleFrame(spec, physicsSettleFrame);
  if (settle > spec.durationFrames - fps * 1.2) problems.push({ code: "chain-hold-short", severity: "error", message: `The last domino lands at frame ${settle}; leave 1.2 s or more after it.` });
  if (spec.title && spec.title.enter < settle - fps * .3) problems.push({ code: "chain-title-early", severity: "error", message: "The title enters before the last domino lands. Let the effect finish first." });
  readable(problems, "title", spec.title, spec.durationFrames, fps);
  return problems;
}

// ------------------------------------------------------------------ Physical Data

/** `PhysicalData` (`physical-data-react.tsx`): a few values as stacks of real things, coins or wooden blocks, dropped in one piece at a
 * time, so the difference is felt as height. Each column's number counts up as its pieces land. */
export interface PhysicalDataSpec {
  durationFrames: number;
  /** @default "coins" */
  pieces?: "coins" | "blocks";
  /** Two to six values, in reading order. `highlight` marks the one the scene is about. */
  series: ReadonlyArray<{ label: string; value: number; highlight?: boolean }>;
  /** What one piece stands for. A column holds at most 60 pieces. */
  unitValue: number;
  /** How the numbers are written, such as `{ "prefix": "$", "suffix": "k" }`. */
  format?: { prefix?: string; suffix?: string; decimals?: number };
  /** The frame the first piece lands. */
  dropStart: number;
  /** Frames between two pieces landing in one column. @default 3 */
  interval?: number;
  /** Camera around the columns. @default { yaw: 18, pitch: 16, fill: .95, offsetX: .16 } */
  view?: OrbitView;
  title?: TextBeat;
}
export const PHYSICAL_DATA_MAX_PIECES = 60;
export const physicalDataPieces = (spec: Pick<PhysicalDataSpec, "series" | "unitValue">) => spec.series.map(item => Math.max(0, Math.round(item.value / spec.unitValue)));
/** The frame the last piece of a column lands. Columns start a few frames apart, left to right. */
export const physicalDataColumnEnd = (spec: PhysicalDataSpec, column: number) => spec.dropStart + column * 4 + Math.max(0, physicalDataPieces(spec)[column] - 1) * (spec.interval ?? 3) + 8;
export const physicalDataEnd = (spec: PhysicalDataSpec) => Math.max(...spec.series.map((_, i) => physicalDataColumnEnd(spec, i)));
export function formatDataValue(value: number, format: PhysicalDataSpec["format"] = {}) {
  return `${format.prefix ?? ""}${value.toLocaleString("en-US", { minimumFractionDigits: format.decimals ?? 0, maximumFractionDigits: format.decimals ?? 0 })}${format.suffix ?? ""}`;
}
export function inspectPhysicalData(spec: PhysicalDataSpec, fps = 30): Story3dProblem[] {
  const problems: Story3dProblem[] = [];
  if (spec.series.length < 2 || spec.series.length > 6) problems.push({ code: "data-series", severity: "error", message: `Physical data compares 2 to 6 values; this has ${spec.series.length}.` });
  if (!(spec.unitValue > 0)) problems.push({ code: "data-unit", severity: "error", message: "`unitValue` must be above zero." });
  else physicalDataPieces(spec).forEach((n, i) => {
    if (spec.series[i].value < 0) problems.push({ code: "data-negative", severity: "error", message: `"${spec.series[i].label}" is negative. Stacks show amounts; show a loss as a smaller stack beside the larger one.` });
    else if (n > PHYSICAL_DATA_MAX_PIECES) problems.push({ code: "data-too-many", severity: "error", message: `"${spec.series[i].label}" needs ${n} pieces; a column holds ${PHYSICAL_DATA_MAX_PIECES}. Raise \`unitValue\`.` });
    else if (n === 0 && spec.series[i].value > 0) problems.push({ code: "data-rounds-to-zero", severity: "warning", message: `"${spec.series[i].label}" rounds to no pieces. Lower \`unitValue\`.` });
  });
  if (spec.pieces === "blocks" && spec.unitValue > 0 && Math.max(...physicalDataPieces(spec)) > 24) problems.push({ code: "data-blocks-tall", severity: "warning", message: "More than 24 blocks makes a thin tower that leaves the frame. Use coins, or raise `unitValue`." });
  if (spec.series.filter(item => item.highlight).length > 1) problems.push({ code: "data-highlight", severity: "warning", message: "Highlight one value: the one the scene is about." });
  const end = physicalDataEnd(spec);
  if (end > spec.durationFrames - fps * 1.5) problems.push({ code: "data-hold-short", severity: "error", message: `The last piece lands at frame ${end}; hold the finished stacks 1.5 s or more.` });
  if (spec.title && spec.title.enter < end - fps * .2) problems.push({ code: "data-title-early", severity: "warning", message: "The title enters while pieces are still landing. Let the stacks finish, then say what they mean." });
  readable(problems, "title", spec.title, spec.durationFrames, fps);
  return problems;
}

export type { OrbitView, TextBeat };
