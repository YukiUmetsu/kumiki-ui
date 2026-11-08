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

// ------------------------------------------------------------------ Tabletop Story

/** Real objects a tabletop story can hold, from the hero catalog. */
export const TABLETOP_KINDS = ["banknote", "cash-stack", "coins", "gold-bars", "money-bag", "credit-card", "smartphone", "laptop", "padlock", "invoice", "paper", "folder", "pen"] as const;
export type TabletopKind = typeof TABLETOP_KINDS[number];
/** How a beat arranges its objects on the table.
 * - `row`: side by side, in the order listed.
 * - `pair`: two, apart, for a comparison.
 * - `stack`: one on top of the next, for adding up.
 * - `focus`: `focus` forward and close; the rest in a row behind it. */
export type TabletopLayout = "row" | "pair" | "stack" | "focus";
export interface TabletopBeat {
  id: string;
  startFrame: number;
  layout: TabletopLayout;
  /** The objects on the table in this beat. Others are lifted away; new ones are set down from above. */
  objects: readonly string[];
  focus?: string;
  caption?: string;
}
/** `TabletopStory` (`tabletop-story-react.tsx`): object-story with real objects on a table. Each beat arranges them; they are lifted,
 * carried and set down between beats, and the camera reframes gently. */
export interface TabletopStorySpec {
  durationFrames: number;
  /** @default "walnut" */
  surface?: "walnut" | "slate";
  objects: ReadonlyArray<{ id: string; kind: TabletopKind; label?: string }>;
  beats: readonly TabletopBeat[];
}
/** Frames an object takes to move between beats, and the gap between one object starting and the next. */
export const TABLETOP_MOVE = 20, TABLETOP_STAGGER = 4;
export function inspectTabletopStory(spec: TabletopStorySpec, fps = 30): Story3dProblem[] {
  const problems: Story3dProblem[] = [], ids = new Set<string>();
  const error = (code: string, message: string) => problems.push({ code, severity: "error", message });
  for (const object of spec.objects) {
    if (ids.has(object.id)) error("tabletop-object-id", `Object "${object.id}" is listed twice.`);
    ids.add(object.id);
    if (!TABLETOP_KINDS.includes(object.kind)) error("tabletop-kind", `"${object.kind}" is not a tabletop object. Use one of: ${TABLETOP_KINDS.join(", ")}.`);
  }
  if (!spec.beats.length) error("tabletop-beats", "A tabletop story needs at least one beat.");
  spec.beats.forEach((beat, i) => {
    const next = spec.beats[i + 1]?.startFrame ?? spec.durationFrames;
    if (i === 0 && beat.startFrame > fps * .3) problems.push({ code: "tabletop-late-start", severity: "warning", message: "The first beat starts after 0.3 s; an empty table reads as a stall." });
    if (next <= beat.startFrame) error("tabletop-order", `Beat "${beat.id}" must start before the next one.`);
    for (const id of beat.objects) if (!ids.has(id)) error("tabletop-unknown-object", `Beat "${beat.id}" places "${id}", which is not in \`objects\`.`);
    if (beat.objects.length > 6) error("tabletop-crowded", `Beat "${beat.id}" puts ${beat.objects.length} objects on the table; six is the most that stay readable.`);
    if (beat.layout === "pair" && beat.objects.length !== 2) error("tabletop-pair", `Beat "${beat.id}" is a pair with ${beat.objects.length} objects.`);
    if (beat.layout === "stack" && beat.objects.length > 5) error("tabletop-stack", `Beat "${beat.id}" stacks ${beat.objects.length} objects; five is the most.`);
    if (beat.layout === "focus" && (!beat.focus || !beat.objects.includes(beat.focus))) error("tabletop-focus", `Beat "${beat.id}" needs a \`focus\` that is one of its objects.`);
    const settle = beat.startFrame + TABLETOP_MOVE + TABLETOP_STAGGER * Math.max(0, beat.objects.length - 1);
    if (beat.caption) {
      const need = readSeconds({ text: beat.caption, enter: 0 }), on = (next - beat.startFrame - 10) / fps;
      if (on < need) error("tabletop-caption-short", `Beat "${beat.id}" shows its caption for ${on.toFixed(1)} s; it needs about ${need.toFixed(1)} s.`);
    }
    if ((next - settle) / fps < .6) problems.push({ code: "tabletop-no-rest", severity: "warning", message: `Beat "${beat.id}" ends ${((next - settle) / fps).toFixed(1)} s after its objects settle. Give each arrangement a moment at rest.` });
  });
  return problems;
}

// ------------------------------------------------------------------ Scale Journey

/** Objects a scale journey can stop at, with their largest real dimension in metres, smallest first. */
export const SCALE_SIZES = { coin: .031, "credit-card": .091, smartphone: .149, padlock: .084, laptop: .307, "gold-bars": .164, "money-bag": .604, "server-rack": 2, bull: 3.57, bank: 15 } as const;
export type ScaleKind = keyof typeof SCALE_SIZES;
export const SCALE_KINDS = Object.keys(SCALE_SIZES) as ScaleKind[];
/** `ScaleJourney` (`scale-journey-react.tsx`): real objects in a row from smallest to largest; the camera pulls back from each to the
 * next in log space, and each stop shows its real size and how many times larger it is than the last. A 1.75 m scale figure stands in
 * the row, as architects put one in a model, so a human size is always in reach. */
export interface ScaleJourneySpec {
  durationFrames: number;
  /** Two to six stops, smallest first. */
  stops: ReadonlyArray<{ id: string; kind: ScaleKind; caption?: string; /** Frames at this stop, including the move into it. */ frames?: number }>;
  /** Stand a 1.75 m scale figure in the row. @default true */
  person?: boolean;
  title?: TextBeat;
}
/** Frames for the camera to travel from one stop to the next. */
export const SCALE_MOVE = 36;
export function scaleStopFrames(spec: ScaleJourneySpec, fps = 30): number[] {
  return spec.stops.map((stop, i) => stop.frames ?? Math.round(((stop.caption ? readSeconds({ text: stop.caption, enter: 0 }) : 1.2) + .4) * fps) + (i ? SCALE_MOVE : 0));
}
export function inspectScaleJourney(spec: ScaleJourneySpec, fps = 30): Story3dProblem[] {
  const problems: Story3dProblem[] = [];
  if (spec.stops.length < 2 || spec.stops.length > 6) problems.push({ code: "scale-stops", severity: "error", message: `A scale journey has 2 to 6 stops; this has ${spec.stops.length}.` });
  spec.stops.forEach((stop, i) => {
    if (!(stop.kind in SCALE_SIZES)) { problems.push({ code: "scale-kind", severity: "error", message: `"${stop.kind}" is not a scale object. Use one of: ${SCALE_KINDS.join(", ")}.` }); return; }
    const before = spec.stops[i - 1];
    if (before && before.kind in SCALE_SIZES) {
      const ratio = SCALE_SIZES[stop.kind] / SCALE_SIZES[before.kind];
      if (ratio <= 1) problems.push({ code: "scale-order", severity: "error", message: `"${stop.id}" is no larger than the stop before it. Order the stops from smallest to largest.` });
      else if (ratio < 1.6) problems.push({ code: "scale-step-small", severity: "warning", message: `"${stop.id}" is only ${ratio.toFixed(1)} times the stop before it; a step under 1.6 times does not feel like a jump.` });
    }
    const frames = scaleStopFrames(spec, fps)[i], need = (stop.caption ? readSeconds({ text: stop.caption, enter: 0 }) : 1) * fps + (i ? SCALE_MOVE : 0);
    if (frames < need) problems.push({ code: "scale-stop-short", severity: "error", message: `Stop "${stop.id}" lasts ${frames} frames; its move and caption need about ${Math.round(need)}.` });
  });
  const total = scaleStopFrames(spec, fps).reduce((a, b) => a + b, 0);
  if (total > spec.durationFrames - (spec.title ? fps * 1.2 : 0)) problems.push({ code: "scale-length", severity: "error", message: `The stops need ${total} frames${spec.title ? " and the title more" : ""}; the scene has ${spec.durationFrames}.` });
  if (spec.title && spec.title.enter < total - fps * .5) problems.push({ code: "scale-title-early", severity: "warning", message: "The title enters before the last stop has landed." });
  readable(problems, "title", spec.title, spec.durationFrames, fps);
  return problems;
}

// ------------------------------------------------------------------ Inside Out

/** `InsideOut` (`inside-out-react.tsx`): a cut sweeps across the back of a subject that has a cutaway (`HeroAsset.cutaway`), taking the
 * cover away to show the parts inside, which are then named one at a time with leader lines. */
export interface InsideOutSpec {
  durationFrames: number;
  /** The cut starts at the top and has crossed the whole back by `cutEnd`. */
  cutStart: number;
  cutEnd: number;
  /** Camera around the subject. @default { yaw: 205, pitch: 16, fill: .84 } (from behind, a little to the side) */
  view?: OrbitView;
  /** Degrees the subject turns through the shot. @default 12 */
  orbit?: number;
  /** Up to five internal parts to name, in order; each enters a third of a second after the one before. */
  labels?: ReadonlyArray<{ part: string; text: string }>;
  title?: TextBeat;
}
export const insideOutLabelFrame = (spec: InsideOutSpec, index: number) => spec.cutEnd + 8 + index * 10;
export function inspectInsideOut(spec: InsideOutSpec, fps = 30): Story3dProblem[] {
  const problems: Story3dProblem[] = [];
  if (seconds(spec.cutStart, fps) < .5) problems.push({ code: "inside-cut-early", severity: "warning", message: "Show the closed subject for half a second or more before the cut, so the inside reads as inside." });
  const cut = seconds(spec.cutEnd - spec.cutStart, fps);
  if (cut < 1.2) problems.push({ code: "inside-cut-fast", severity: "warning", message: `The cut crosses in ${cut.toFixed(1)} s; under 1.2 s it reads as a flash, not a reveal.` });
  const labels = spec.labels ?? [];
  if (labels.length > 5) problems.push({ code: "inside-labels", severity: "error", message: `Name at most five parts; this names ${labels.length}.` });
  if (labels.length) {
    const last = insideOutLabelFrame(spec, labels.length - 1), need = labels.reduce((sum, label) => sum + readSeconds({ text: label.text, enter: 0 }) * .6, 0) * fps;
    if (spec.durationFrames - spec.cutEnd < need) problems.push({ code: "inside-labels-short", severity: "error", message: `The labels need about ${Math.round(need)} frames after the cut; the scene leaves ${spec.durationFrames - spec.cutEnd}.` });
    if (spec.title && spec.title.enter < last + 10) problems.push({ code: "inside-title-early", severity: "warning", message: "The title enters while parts are still being named." });
  }
  if (spec.cutEnd > spec.durationFrames - fps) problems.push({ code: "inside-hold-short", severity: "error", message: "Hold the open subject for a second or more after the cut." });
  readable(problems, "title", spec.title, spec.durationFrames, fps);
  return problems;
}

// ------------------------------------------------------------------ Diorama Journey

/** Landmarks a diorama station can show, from the hero catalog, each on a stone plaza. */
export const DIORAMA_STATIONS = ["bank", "server-rack", "money-bag", "gold-bars", "padlock", "smartphone", "laptop", "bull", "cash-stack"] as const;
export type DioramaStationKind = typeof DIORAMA_STATIONS[number];
/** `DioramaJourney` (`diorama-journey-react.tsx`): a miniature world on a plinth, where a traveller follows a winding path from station
 * to station, resting at each while its caption reads; the camera follows from above with a long lens and a tilt-shift blur. */
export interface DioramaJourneySpec {
  durationFrames: number;
  /** What travels: a glowing orb, clear from every angle, or a coin rolling on its edge. @default "orb" */
  traveller?: "coin" | "orb";
  /** Two to five stations, in the order visited. */
  stations: ReadonlyArray<{ id: string; kind: DioramaStationKind; caption?: string }>;
  /** Frames between leaving one station and reaching the next. @default 54 */
  travelFrames?: number;
  title?: TextBeat;
}
/** The frame the traveller reaches each station, and leaves it: it rests while the caption is read. */
export function dioramaSchedule(spec: DioramaJourneySpec, fps = 30): Array<{ arrive: number; leave: number }> {
  const travel = spec.travelFrames ?? 54, out: Array<{ arrive: number; leave: number }> = [];
  let at = 30;
  spec.stations.forEach(station => {
    const rest = Math.round(((station.caption ? readSeconds({ text: station.caption, enter: 0 }) : 1) + .3) * (fps > 0 ? fps : 30));
    out.push({ arrive: at, leave: at + rest }); at += rest + travel;
  });
  return out;
}
export function inspectDioramaJourney(spec: DioramaJourneySpec, fps = 30): Story3dProblem[] {
  const problems: Story3dProblem[] = [];
  if (spec.stations.length < 2 || spec.stations.length > 5) problems.push({ code: "diorama-stations", severity: "error", message: `A diorama journey visits 2 to 5 stations; this has ${spec.stations.length}.` });
  for (const station of spec.stations) if (!DIORAMA_STATIONS.includes(station.kind)) problems.push({ code: "diorama-kind", severity: "error", message: `"${station.kind}" is not a station. Use one of: ${DIORAMA_STATIONS.join(", ")}.` });
  if ((spec.travelFrames ?? 54) / fps < 1.2) problems.push({ code: "diorama-travel-fast", severity: "warning", message: "Under 1.2 s between stations the traveller darts; a miniature reads at a walking pace." });
  const schedule = dioramaSchedule(spec, fps), end = schedule[schedule.length - 1]?.leave ?? 0;
  if (end > spec.durationFrames - (spec.title ? fps * 1.5 : 0)) problems.push({ code: "diorama-length", severity: "error", message: `The journey needs ${end} frames${spec.title ? " and the title more" : ""}; the scene has ${spec.durationFrames}.` });
  if (spec.title && spec.title.enter < end - fps) problems.push({ code: "diorama-title-early", severity: "warning", message: "The title enters before the last station has been read." });
  readable(problems, "title", spec.title, spec.durationFrames, fps);
  return problems;
}

export type { OrbitView, TextBeat };
