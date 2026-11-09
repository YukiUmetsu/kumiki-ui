/** Chart morph: a chart that changes from one state to the next in stages, one kind of change at a time, with the category the story
 * is about kept identifiable throughout.
 *
 * Research (doc 32, §10, grade A): in two controlled experiments, animated transitions between chart states improved graphical
 * perception over static ones, and simple staging, one kind of change at a time, was preferred and helped (Heer & Robertson, InfoVis
 * 2007). So between two states the compiler finds what changed (the scale, the values, the order, the form) and plays them one after
 * another: an axis that must grow grows first, so nothing runs off it; then the values move; an axis that can shrink shrinks after;
 * then the rows re-sort; then the form changes. A state may ask for its changes together, and `motion-unstaged` warns that it does.
 *
 * Everything is a pure function of the frame.
 */

export type ChartMorphForm = "bar" | "dot" | "dumbbell" | "line";
export interface ChartMorphState {
  id: string;
  form: ChartMorphForm;
  /** A value per category. */
  values: Readonly<Record<string, number>>;
  /** For a dumbbell: where each category started, drawn as a faint dot joined to its value. */
  compare?: Readonly<Record<string, number>>;
  /** The value axis. @default from zero to a round number above the largest value */
  domain?: readonly [number, number];
  /** @default "none" (the categories' own order) */
  sort?: "desc" | "asc" | "none";
  /** What this state shows, said as the change begins. */
  caption: string;
  /** Change everything at once instead of in stages. Allowed, and warned about. */
  together?: boolean;
}
export interface ChartMorphContent {
  title: string;
  /** What the viewer sees, for a reader who cannot. */
  label: string;
  /** The data's source and licence. */
  source: string;
  categories: ReadonlyArray<{ id: string; label: string }>;
  /** The categories have an order of their own (years, steps): they run across, and a line form is allowed. Otherwise they are rows. */
  ordered?: boolean;
  /** The category the story is about: it keeps an accent colour and a bold label through every stage. */
  highlight?: string;
  /** How values read: decimals and a suffix such as "%". */
  format?: { decimals?: number; suffix?: string; prefix?: string };
  states: readonly ChartMorphState[];
}
export type ChartMorphChange = "rescale" | "values" | "order" | "form";
export interface ChartMorphStage { change: ChartMorphChange | "all" | "enter" | "hold"; start: number; end: number; from: number; to: number }
export interface ChartMorphPlan { content: ChartMorphContent; fps: number; durationFrames: number; stages: readonly ChartMorphStage[]; domains: ReadonlyArray<readonly [number, number]> }
export interface ChartMorphProblem { severity: "error" | "warning"; code: string; path: string; message: string; hint?: string }

const words = (text?: string) => (text ?? "").split(/\s+/).filter(Boolean).length;
const readSeconds = (text?: string) => words(text) / 3 + .8;
/** Seconds each kind of change takes. Long enough to follow, short enough not to drag. */
export const STAGE_SECONDS: Record<ChartMorphChange | "all", number> = { rescale: .8, values: 1.1, order: 1, form: .9, all: 1.4 };
const ENTER = 1.3, GAP = .15;

/** A round number at or above a value: 1, 2, 2.5 or 5 times a power of ten. */
const roundUp = (v: number) => { if (v <= 0) return 1; const m = 10 ** Math.floor(Math.log10(v)); return [1, 2, 2.5, 5, 10].map(k => k * m).find(k => k >= v)!; };
export function stateDomain(state: ChartMorphState): readonly [number, number] {
  if (state.domain) return state.domain;
  const all = [...Object.values(state.values), ...Object.values(state.compare ?? {})];
  return [Math.min(0, ...all), roundUp(Math.max(...all) * 1.08)];
}
/** Where each category sits (0 = first slot) in a state. */
export function stateOrder(content: ChartMorphContent, state: ChartMorphState): string[] {
  const ids = content.categories.map(item => item.id);
  if (!state.sort || state.sort === "none") return ids;
  return [...ids].sort((a, b) => state.sort === "desc" ? state.values[b] - state.values[a] : state.values[a] - state.values[b]);
}

/** What changes between two states, in the order they should play. */
export function changesBetween(content: ChartMorphContent, a: ChartMorphState, b: ChartMorphState): ChartMorphChange[] {
  const da = stateDomain(a), db = stateDomain(b), out: ChartMorphChange[] = [];
  const grows = db[1] > da[1] || db[0] < da[0], shrinks = db[1] < da[1] || db[0] > da[0];
  const values = content.categories.some(item => a.values[item.id] !== b.values[item.id]);
  const order = stateOrder(content, a).join() !== stateOrder(content, b).join();
  const form = a.form !== b.form || Boolean(a.compare) !== Boolean(b.compare);
  if (grows) out.push("rescale");
  if (values) out.push("values");
  if (shrinks && !grows) out.push("rescale");
  if (order) out.push("order");
  if (form) out.push("form");
  return out;
}

/** Lays the morph out in time: the first state enters and holds; each later state's caption arrives, its changes play in stages, and
 * it holds. Holds take their reading time; spare frames lengthen the holds evenly. */
export function compileChartMorph(content: ChartMorphContent, durationFrames: number, fps: number): { plan?: ChartMorphPlan; problems: ChartMorphProblem[] } {
  const problems = inspectChartMorph(content);
  if (problems.some(item => item.severity === "error")) return { problems };
  type Draft = { change: ChartMorphStage["change"]; seconds: number; from: number; to: number; hold?: boolean };
  const drafts: Draft[] = [{ change: "enter", seconds: ENTER, from: 0, to: 0 }, { change: "hold", seconds: Math.max(1.6, readSeconds(content.states[0].caption)), from: 0, to: 0, hold: true }];
  content.states.forEach((state, i) => {
    if (!i) return;
    const changes = changesBetween(content, content.states[i - 1], state);
    if (state.together && changes.length > 1) {
      problems.push({ severity: "warning", code: "motion-unstaged", path: `/states/${i}/together`, message: `State "${state.id}" changes ${changes.join(", ")} at once. One kind of change at a time is easier to follow.`, hint: "Remove \"together\" and let the stages play." });
      drafts.push({ change: "all", seconds: STAGE_SECONDS.all, from: i - 1, to: i });
    } else changes.forEach((change, k) => drafts.push({ change, seconds: STAGE_SECONDS[change] + (k ? GAP : 0), from: i - 1, to: i }));
    if (!changes.length) problems.push({ severity: "warning", code: "chart-morph-no-change", path: `/states/${i}`, message: `State "${state.id}" looks the same as the one before.` });
    drafts.push({ change: "hold", seconds: Math.max(1.6, readSeconds(state.caption)), from: i, to: i, hold: true });
  });
  const needed = drafts.reduce((sum, item) => sum + item.seconds, 0) * fps;
  if (needed > durationFrames) return { problems: [...problems, { severity: "error", code: "chart-morph-short", path: "/durationFrames", message: `The morph needs ${(needed / fps).toFixed(1)} s to stage its changes and read its captions, and the scene has ${(durationFrames / fps).toFixed(1)} s.`, hint: "Lengthen the scene, or show fewer states." }] };
  const holds = drafts.filter(item => item.hold), spare = (durationFrames - needed) / Math.max(1, holds.length);
  let frame = 0;
  const stages = drafts.map(item => {
    const frames = item.seconds * fps + (item.hold ? spare : 0), stage: ChartMorphStage = { change: item.change, from: item.from, to: item.to, start: frame, end: frame + frames };
    frame += frames;
    return stage;
  });
  return { plan: { content, fps, durationFrames, stages, domains: content.states.map(stateDomain) }, problems };
}

const smooth = (u: number) => { const t = Math.min(1, Math.max(0, u)); return t * t * t * (t * (6 * t - 15) + 10); };
export interface ChartMorphFrame {
  /** Per category: value, slot (fractional, while re-sorting), compare value and its visibility, and how far it has entered. */
  items: Array<{ id: string; label: string; value: number; slot: number; compare?: number; compareShown: number; enter: number;
    /** 0 to 1: how far through a re-sort this row is in motion (0 when it stays put, and at both ends of the move). */ moving: number }>;
  domain: readonly [number, number];
  /** 0 = the old form, 1 = the new one, between two forms. */
  form: { from: ChartMorphForm; to: ChartMorphForm; mix: number };
  caption: { text: string; opacity: number };
  /** The state whose caption is up. */
  state: number;
}

/** The chart at a frame. Under reduced motion each stage cuts at its midpoint instead of moving. */
export function chartMorphFrame(plan: ChartMorphPlan, frame: number, reducedMotion = false): ChartMorphFrame {
  const { content, stages, fps } = plan, f = Math.min(plan.durationFrames, Math.max(0, frame));
  const progress = (stage: ChartMorphStage) => { const u = (f - stage.start) / Math.max(1, stage.end - stage.start); return reducedMotion ? (u < .5 ? 0 : 1) : smooth(u); };
  // Start from state 0 and apply each stage that has begun: finished ones fully, the current one partly.
  const states = content.states;
  let values: Record<string, number> = { ...states[0].values }, domain = plan.domains[0];
  let slots: Record<string, number> = Object.fromEntries(stateOrder(content, states[0]).map((id, i) => [id, i]));
  let form = { from: states[0].form, to: states[0].form, mix: 1 }, compare: Record<string, number> | undefined = states[0].compare && { ...states[0].compare }, compareShown = states[0].compare ? 1 : 0;
  let enter = 1, captionState = 0, moving: Record<string, number> = {};
  for (const stage of stages) {
    if (f < stage.start) break;
    const p = progress(stage), a = states[stage.from], b = states[stage.to], lerp = (x: number, y: number) => x + (y - x) * p;
    if (stage.change === "enter") enter = reducedMotion ? 1 : p;
    if (stage.change !== "hold" && stage.change !== "enter") captionState = stage.to;
    const all = stage.change === "all";
    if (stage.change === "rescale" || all) domain = [lerp(plan.domains[stage.from][0], plan.domains[stage.to][0]), lerp(plan.domains[stage.from][1], plan.domains[stage.to][1])];
    if (stage.change === "values" || all) values = Object.fromEntries(content.categories.map(item => [item.id, lerp(a.values[item.id], b.values[item.id])]));
    if (stage.change === "order" || all) {
      const from = stateOrder(content, a), to = stateOrder(content, b), swing = f < stage.end ? Math.sin(Math.PI * p) : 0;
      slots = Object.fromEntries(content.categories.map(item => [item.id, lerp(from.indexOf(item.id), to.indexOf(item.id))]));
      moving = Object.fromEntries(content.categories.map(item => [item.id, from.indexOf(item.id) !== to.indexOf(item.id) ? swing : 0]));
    }
    if (stage.change === "form" || all) {
      form = { from: a.form, to: b.form, mix: p };
      if (b.compare) { compare = { ...b.compare }; compareShown = a.compare ? 1 : p; } else if (a.compare) compareShown = 1 - p;
    }
  }
  // The caption changes as the next state's first stage begins: it says what is about to happen.
  const firstStage = stages.find(item => item.to === captionState && item.change !== "hold" && item.change !== "enter");
  const fadeIn = firstStage ? (reducedMotion ? 1 : smooth((f - firstStage.start) / (.3 * fps))) : enter;
  return { items: content.categories.map(item => ({ id: item.id, label: item.label, value: values[item.id], slot: slots[item.id], compare: compare?.[item.id], compareShown, enter, moving: moving[item.id] ?? 0 })), domain, form, caption: { text: states[captionState].caption, opacity: fadeIn }, state: captionState };
}

export function inspectChartMorph(content: ChartMorphContent): ChartMorphProblem[] {
  const problems: ChartMorphProblem[] = [], report = (severity: ChartMorphProblem["severity"], code: string, path: string, message: string, hint?: string) => problems.push({ severity, code, path, message, hint });
  if (!(content.title ?? "").trim()) report("error", "chart-morph-title", "/title", "A chart morph needs a title.");
  if (!(content.label ?? "").trim()) report("error", "chart-morph-label", "/label", "Describe what the viewer sees.");
  if (!(content.source ?? "").trim()) report("error", "chart-morph-source", "/source", "Name the data's source and licence.");
  const ids = (content.categories ?? []).map(item => item.id);
  if (ids.length < 2) report("error", "chart-morph-categories", "/categories", "A chart morph needs two or more categories.");
  if (new Set(ids).size !== ids.length) report("error", "chart-morph-categories", "/categories", "Category IDs must be unique.");
  if (ids.length > 14) report("warning", "chart-morph-crowded", "/categories", `${ids.length} categories: past about a dozen, rows become too thin to label.`);
  if (content.highlight !== undefined && !ids.includes(content.highlight)) report("error", "chart-morph-highlight", "/highlight", `"${content.highlight}" is not a category.`);
  if ((content.states ?? []).length < 2) report("error", "chart-morph-states", "/states", "A morph needs two or more states.");
  if ((content.states ?? []).length > 6) report("warning", "chart-morph-many", "/states", "More than six states in one scene ask a lot of the viewer.", "Split the story across scenes.");
  (content.states ?? []).forEach((state, i) => {
    const at = `/states/${i}`;
    if (!(state.caption ?? "").trim()) report("error", "chart-morph-caption", at + "/caption", `State "${state.id}" needs a caption: say what the change shows.`);
    for (const id of ids) if (!Number.isFinite(state.values?.[id])) report("error", "chart-morph-values", `${at}/values/${id}`, `State "${state.id}" has no value for "${id}".`);
    if (state.form === "dumbbell" && !state.compare) report("error", "chart-morph-compare", at + "/compare", "A dumbbell needs `compare`: where each category started.");
    if (state.compare) for (const id of ids) if (!Number.isFinite(state.compare[id])) report("error", "chart-morph-values", `${at}/compare/${id}`, `No starting value for "${id}".`);
    if (state.form === "line" && !content.ordered) report("error", "chart-morph-line", at + "/form", "A line joins categories in order; it needs `ordered` categories, such as years.", "Use dots or bars for categories with no order.");
    if (state.domain && !(state.domain[1] > state.domain[0])) report("error", "chart-morph-domain", at + "/domain", "A domain runs from low to high.");
    if (state.domain) for (const id of ids) { const v = state.values?.[id]; if (v < state.domain[0] || v > state.domain[1]) report("warning", "chart-morph-clipped", `${at}/values/${id}`, `"${id}" (${v}) lies outside the axis.`); }
  });
  return problems;
}

/** A value's text. */
export function formatValue(content: ChartMorphContent, value: number): string {
  const f = content.format ?? {};
  return `${f.prefix ?? ""}${value.toFixed(f.decimals ?? 0)}${f.suffix ?? ""}`;
}
