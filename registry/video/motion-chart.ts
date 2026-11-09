/** Guided motion chart: bubbles moving over time, as in Hans Rosling's talks, with the guidance that made them work. Each entity is a
 * bubble placed by two measures (x and y) and sized by a third; a large time counter sits behind them, and time plays forward.
 *
 * Research (doc 32, §6, grade A): in a user study, animated bubble charts were the least effective for analysis, next to small
 * multiples and traces. They worked in Rosling's talks because a narrator primed viewers to watch one bubble before something
 * happened to it. So every event here has a cue: before the change, playback slows to a hold, the cue names what to watch, the other
 * bubbles dim and a ring marks the subject. Then the change plays, slower than the rest, leaving a trail, and a note can say what it
 * meant. An event without a cue is refused.
 *
 * Everything is a pure function of the frame.
 */

export interface MotionChartAxis {
  label: string;
  /** Shown after the label, in brackets. */
  unit?: string;
  /** @default "linear" */
  scale?: "linear" | "log";
  /** The axis range. @default the data's range, padded */
  domain?: readonly [number, number];
  /** Tick values. @default chosen from the domain */
  ticks?: readonly number[];
}
export interface MotionChartEvent {
  id: string;
  /** The entity to watch. */
  entity: string;
  /** The stretch of time the change happens in, in the chart's time values. */
  from: number;
  to: number;
  /** What to watch, said before it happens: "Watch China." A pointer, not a sentence. */
  cue: string;
  /** What it meant, shown after it happens. */
  note?: string;
}
export interface MotionChartContent {
  title: string;
  x: MotionChartAxis;
  y: MotionChartAxis;
  /** What the bubbles' areas show. Without it, every bubble is the same size. */
  size?: { label: string; unit?: string };
  /** Colour groups, with a legend. */
  groups: ReadonlyArray<{ id: string; label: string; color?: string }>;
  /** The time axis, ascending: years, usually. */
  times: readonly number[];
  /** Each entity's [x, y, size] at each time, or null where there is no value. */
  entities: ReadonlyArray<{ id: string; label: string; group: string; values: ReadonlyArray<readonly [number, number, number?] | null> }>;
  events: readonly MotionChartEvent[];
  /** Entities labelled throughout, besides the one being watched. Keep it to a few. */
  labelled?: readonly string[];
  /** The data's source and licence, shown small. */
  source: string;
  /** What the viewer sees, for a reader who cannot. */
  label: string;
}
export interface MotionChartSegment {
  kind: "intro" | "play" | "cue" | "event" | "note" | "outro";
  start: number;
  end: number;
  /** Chart time at the segment's start and end (holds keep one). */
  t0: number;
  t1: number;
  event?: string;
}
export interface MotionChartPlan {
  content: MotionChartContent;
  fps: number;
  durationFrames: number;
  segments: readonly MotionChartSegment[];
  domains: { x: readonly [number, number]; y: readonly [number, number]; size: number };
}
export interface MotionChartProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }
export interface MotionChartState {
  /** The chart's time, fractional between data times. */
  time: number;
  /** 0 to 1: axes and bubbles arriving. */
  enter: number;
  /** The event being watched, and how far its guidance has come in (0 to 1): the dimming, the ring, the trail. */
  focus?: { event: MotionChartEvent; amount: number; trailFrom: number };
  /** The caption: a cue or a note, and its opacity. */
  caption?: { text: string; kind: "cue" | "note"; opacity: number };
  segment: MotionChartSegment;
}

const words = (text?: string) => (text ?? "").split(/\s+/).filter(Boolean).length;
/** Seconds to read a caption: about three words a second, plus a moment to find it. */
export const readSeconds = (text: string | undefined, settle = .7) => words(text) / 3 + settle;
const INTRO = 1.2, OUTRO = 1.6, CUE_MIN = 1.4, EVENT_SLOW = 3;

/** Lays the chart out in time: intro, then for each event a stretch of playback, a cue hold, the event played slowly and a note
 * hold, then playback to the end and an outro hold. Holds take their reading time; playback shares the rest, events at a third of the
 * normal speed. */
export function compileMotionChart(content: MotionChartContent, durationFrames: number, fps: number): { plan?: MotionChartPlan; problems: MotionChartProblem[] } {
  const problems = inspectMotionChart(content, durationFrames, fps);
  if (problems.some(item => item.severity === "error")) return { problems };
  const times = content.times, first = times[0], last = times[times.length - 1];
  const events = [...content.events].sort((a, b) => a.from - b.from);
  type Draft = Omit<MotionChartSegment, "start" | "end"> & { frames?: number; weight?: number };
  const drafts: Draft[] = [{ kind: "intro", t0: first, t1: first, frames: INTRO * fps }];
  let at = first;
  for (const event of events) {
    if (event.from > at) drafts.push({ kind: "play", t0: at, t1: event.from, weight: event.from - at });
    drafts.push({ kind: "cue", t0: event.from, t1: event.from, event: event.id, frames: Math.max(CUE_MIN, readSeconds(event.cue)) * fps });
    drafts.push({ kind: "event", t0: event.from, t1: event.to, event: event.id, weight: (event.to - event.from) * EVENT_SLOW });
    if (event.note) drafts.push({ kind: "note", t0: event.to, t1: event.to, event: event.id, frames: readSeconds(event.note, .9) * fps });
    at = event.to;
  }
  if (last > at) drafts.push({ kind: "play", t0: at, t1: last, weight: last - at });
  drafts.push({ kind: "outro", t0: last, t1: last, frames: OUTRO * fps });
  const fixed = drafts.reduce((sum, item) => sum + (item.frames ?? 0), 0), weight = drafts.reduce((sum, item) => sum + (item.weight ?? 0), 0);
  const playFrames = durationFrames - fixed, perUnit = playFrames / Math.max(1e-9, weight);
  // Rosling's playback ran at a handful of years a second; past about twelve, the bubbles jump rather than move.
  if (playFrames < fps * 2 || perUnit * Math.min(...drafts.filter(item => item.weight).map(item => item.weight! / (item.kind === "event" ? EVENT_SLOW : 1))) < fps * .2)
    return { problems: [...problems, { severity: "error", code: "motion-chart-short", path: "/durationFrames", message: `The scene leaves ${(playFrames / fps).toFixed(1)} s to play ${last - first} time steps after its holds.`, hint: "Lengthen the scene, or watch fewer events." }] };
  const rate = fps / perUnit;
  if (rate > 12) problems.push({ severity: "warning", code: "motion-chart-fast", path: "/durationFrames", message: `Playback runs ${rate.toFixed(1)} time steps a second; past about 12 the bubbles jump.`, hint: "Lengthen the scene, or cover a shorter stretch of time." });
  let frame = 0;
  const segments = drafts.map(item => {
    const frames = item.frames ?? item.weight! * perUnit, segment: MotionChartSegment = { kind: item.kind, t0: item.t0, t1: item.t1, event: item.event, start: frame, end: frame + frames };
    frame += frames;
    return segment;
  });
  return { plan: { content, fps, durationFrames, segments, domains: chartDomains(content) }, problems };
}

/** The axes' ranges: the authored domain, or the data's range padded by a twentieth (in log space for a log axis). */
export function chartDomains(content: MotionChartContent) {
  const range = (k: 0 | 1, axis: MotionChartAxis): readonly [number, number] => {
    if (axis.domain) return axis.domain;
    const values = content.entities.flatMap(entity => entity.values.flatMap(value => value ? [value[k]] : []));
    const log = axis.scale === "log", map = (v: number) => log ? Math.log10(v) : v, lo = Math.min(...values.map(map)), hi = Math.max(...values.map(map)), pad = (hi - lo) * .05;
    return log ? [10 ** (lo - pad), 10 ** (hi + pad)] : [lo - pad, hi + pad];
  };
  const size = Math.max(1e-9, ...content.entities.flatMap(entity => entity.values.flatMap(value => value?.[2] !== undefined ? [value[2]!] : [])));
  return { x: range(0, content.x), y: range(1, content.y), size };
}

const smooth = (u: number) => { const t = Math.min(1, Math.max(0, u)); return t * t * (3 - 2 * t); };
const easeInOut = (u: number) => { const t = Math.min(1, Math.max(0, u)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

/** The chart's state at a frame. Under reduced motion, time does not glide: it steps to the next hold halfway through each stretch. */
export function motionChartState(plan: MotionChartPlan, frame: number, reducedMotion = false): MotionChartState {
  const f = Math.min(plan.durationFrames, Math.max(0, frame)), fps = plan.fps;
  const segment = plan.segments.find(item => f < item.end) ?? plan.segments[plan.segments.length - 1];
  const u = (f - segment.start) / Math.max(1, segment.end - segment.start);
  const glide = reducedMotion ? (u < .5 ? 0 : 1) : easeInOut(u);
  const time = segment.t0 + (segment.t1 - segment.t0) * glide;
  const enter = reducedMotion ? 1 : smooth(f / (INTRO * fps));
  const state: MotionChartState = { time, enter, segment };
  const event = segment.event ? plan.content.events.find(item => item.id === segment.event) : undefined;
  if (event) {
    const own = plan.segments.filter(item => item.event === event.id), from = own[0].start, to = own[own.length - 1].end;
    // The guidance fades in over a third of a second as the cue arrives, and out over half a second as the note ends.
    const amount = Math.min(smooth((f - from) / (.33 * fps)), smooth((to - f) / (.5 * fps)));
    state.focus = { event, amount: reducedMotion ? (f < to ? 1 : 0) : amount, trailFrom: event.from };
    const fade = (start: number, end: number) => reducedMotion ? 1 : Math.min(smooth((f - start) / (.25 * fps)), smooth((end - f) / (.3 * fps)));
    const cue = own.find(item => item.kind === "cue")!, play = own.find(item => item.kind === "event")!, note = own.find(item => item.kind === "note");
    // The cue stays up while the change plays, then gives way to the note.
    if (f < play.end) state.caption = { text: event.cue, kind: "cue", opacity: fade(cue.start, note ? play.end : play.end) };
    else if (note) state.caption = { text: event.note!, kind: "note", opacity: fade(note.start, note.end) };
  }
  return state;
}

/** An entity's [x, y, size] at a fractional time: linear between data times (in log space on a log axis), held at the ends, and
 * absent where its data is missing. */
export function entityAt(plan: MotionChartPlan, index: number, time: number): readonly [number, number, number] | undefined {
  const { times } = plan.content, values = plan.content.entities[index].values;
  const t = Math.min(times[times.length - 1], Math.max(times[0], time));
  let i = 0;
  while (i < times.length - 2 && times[i + 1] <= t) i += 1;
  const a = values[i], b = values[i + 1] ?? a;
  if (!a || !b) return a ? [a[0], a[1], a[2] ?? 1] : undefined;
  const u = (t - times[i]) / Math.max(1e-9, times[i + 1] - times[i]);
  const mix = (p: number, q: number, log?: boolean) => log ? 10 ** (Math.log10(p) + (Math.log10(q) - Math.log10(p)) * u) : p + (q - p) * u;
  return [mix(a[0], b[0], plan.content.x.scale === "log"), mix(a[1], b[1], plan.content.y.scale === "log"), mix(a[2] ?? 1, b[2] ?? 1)];
}

/** The checks: shape of the data, the guidance rule (every event cued), and craft limits. */
export function inspectMotionChart(content: MotionChartContent, durationFrames: number, fps: number): MotionChartProblem[] {
  const problems: MotionChartProblem[] = [], report = (severity: MotionChartProblem["severity"], code: string, path: string, message: string, hint?: string) => problems.push({ severity, code, path, message, hint });
  const times = content.times ?? [];
  if (!(content.title ?? "").trim()) report("error", "motion-chart-title", "/title", "A motion chart needs a title.");
  if (!(content.label ?? "").trim()) report("error", "motion-chart-label", "/label", "Describe what the viewer sees.");
  if (!(content.source ?? "").trim()) report("error", "motion-chart-source", "/source", "Name the data's source and licence.");
  if (times.length < 2 || times.some((t, i) => !Number.isFinite(t) || (i > 0 && t <= times[i - 1]))) { report("error", "motion-chart-times", "/times", "Times must be two or more numbers, ascending."); return problems; }
  const groups = new Set((content.groups ?? []).map(group => group.id)), ids = new Set<string>();
  (content.entities ?? []).forEach((entity, i) => {
    const at = `/entities/${i}`;
    if (ids.has(entity.id)) report("error", "motion-chart-entity", at + "/id", `Entity "${entity.id}" is listed twice.`);
    ids.add(entity.id);
    if (!groups.has(entity.group)) report("error", "motion-chart-group", at + "/group", `"${entity.group}" is not one of the groups.`);
    if (entity.values?.length !== times.length) { report("error", "motion-chart-values", at + "/values", `Entity "${entity.id}" has ${entity.values?.length ?? 0} values for ${times.length} times.`); return; }
    entity.values.forEach((value, k) => {
      if (value === null) return;
      if (!value.every(v => v === undefined || Number.isFinite(v))) report("error", "motion-chart-values", `${at}/values/${k}`, "Values must be finite numbers.");
      if ((content.x.scale === "log" && !(value[0] > 0)) || (content.y.scale === "log" && !(value[1] > 0))) report("error", "motion-chart-log", `${at}/values/${k}`, "A log axis needs values above zero.");
      if (value[2] !== undefined && !(value[2] >= 0)) report("error", "motion-chart-values", `${at}/values/${k}/2`, "Sizes cannot be negative.");
    });
  });
  if ((content.entities ?? []).length < 2) report("error", "motion-chart-entities", "/entities", "A motion chart needs two or more entities to compare.");
  const sorted = [...(content.events ?? [])].sort((a, b) => a.from - b.from);
  (content.events ?? []).forEach((event, i) => {
    const at = `/events/${i}`;
    // The research rule: an animated event without a narrator's cue is not followed.
    if (!(event.cue ?? "").trim()) report("error", "motion-chart-uncued", at + "/cue", `Event "${event.id}" has no cue. Viewers follow a moving bubble only when told which to watch before it moves.`, 'Add a short cue, such as "Watch China."');
    else if (words(event.cue) > 8) report("warning", "motion-chart-cue-long", at + "/cue", "A cue is a pointer, not a sentence: say what to watch in a few words.", "Put the explanation in the note.");
    if (!ids.has(event.entity)) report("error", "motion-chart-event-entity", at + "/entity", `"${event.entity}" is not an entity.`);
    if (!(event.from < event.to && event.from >= times[0] && event.to <= times[times.length - 1])) report("error", "motion-chart-event-time", at, `Event "${event.id}" must run forward inside the times (${times[0]} to ${times[times.length - 1]}).`);
  });
  sorted.forEach((event, i) => { if (i && event.from < sorted[i - 1].to) report("error", "motion-chart-event-overlap", "/events", `Events "${sorted[i - 1].id}" and "${event.id}" overlap; watch one thing at a time.`); });
  if (sorted.length > 4) report("warning", "motion-chart-many-events", "/events", `${sorted.length} events in one chart; past three or four, a scene asks too much.`, "Split the story across scenes.");
  if ((content.labelled ?? []).length > 6) report("warning", "motion-chart-crowded", "/labelled", "More than six labels at once crowd the bubbles.", "Label only what the story names.");
  (content.labelled ?? []).forEach((id, i) => { if (!ids.has(id)) report("error", "motion-chart-labelled", `/labelled/${i}`, `"${id}" is not an entity.`); });
  if (!(durationFrames > 0) || !(fps > 0)) report("error", "motion-chart-short", "/durationFrames", "The scene needs a length.");
  return problems;
}

/** Ticks for an axis: authored, or round numbers inside the domain (1, 2 and 5 in each decade on a log axis). */
export function axisTicks(axis: MotionChartAxis, domain: readonly [number, number]): number[] {
  if (axis.ticks) return [...axis.ticks];
  const [lo, hi] = domain;
  if (axis.scale === "log") {
    const out: number[] = [];
    for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e += 1) for (const m of [1, 2, 5]) { const v = m * 10 ** e; if (v >= lo && v <= hi) out.push(v); }
    return out;
  }
  const raw = (hi - lo) / 6, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 5, 10].map(m => m * mag).find(s => s >= raw)!;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}
/** A tick's text: 1k, 20k, 1.5M; small numbers as they are. */
export function tickText(value: number): string {
  const a = Math.abs(value);
  if (a >= 1e9) return `${+(value / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${+(value / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${+(value / 1e3).toFixed(1)}k`;
  return String(+value.toFixed(2));
}
