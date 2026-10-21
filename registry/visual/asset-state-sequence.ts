/** V06 `AssetStateSequence` — frame-addressed changes between an asset's supplied states.
 *
 * States come from the asset (e.g. a house's `new` / `aged` / `damaged`
 * builds, or a pose such as "lights on"). The sequence never invents
 * geometry: it only picks a transition each state pair can actually support.
 *
 * - `interpolate` — only between poses of the **same build** driven by the same
 *   action (or that build's rest pose): the action frame is blended.
 * - `crossfade` / `wipe` — between different builds (variants). Wipe sweeps a
 *   clipping plane so both stay opaque.
 * - `cut` — instant switch; always possible.
 * - `hold` — keep the current state for a while (a labeled beat).
 *
 * An unsupported request falls back explicitly (interpolate → crossfade or cut)
 * with a `transition-fallback` diagnostic. Unknown states throw. Evaluation is
 * a pure function of the frame, so any seek order gives the same result.
 */

export type StateTransition = "interpolate" | "crossfade" | "wipe" | "cut" | "hold";

export interface AssetStateDescriptor {
  id: string;
  label?: string;
  /** `variant`: its own build (geometry or materials differ). `pose`: a build posed by an action frame. */
  kind: "variant" | "pose";
  /** Which build: for variants their own id (default), for poses the variant they pose. */
  variant?: string;
  /** For pose states: the action and frame that produce the state. */
  pose?: { action: string; frame: number };
}

export interface AssetStateStep {
  /** Target state id. */
  state: string;
  /** Absolute frame the transition starts. */
  at: number;
  /** Frames the transition lasts. @default 24 (0 for cut) */
  duration?: number;
  /** @default the best supported transition (interpolate, else crossfade, else cut) */
  transition?: StateTransition;
  /** Caption for the beat, e.g. "15 years later". */
  label?: string;
  /** Semantic part to focus (for callouts or cameras). */
  focus?: string;
  /** Wipe plane axis and direction in the asset's frame. @default x, +1 */
  wipe?: { axis: "x" | "y" | "z"; direction?: 1 | -1 };
}

export interface AssetStateSequenceSpec {
  id: string;
  states: AssetStateDescriptor[];
  initial: string;
  steps: AssetStateStep[];
}

export interface ResolvedStateStep {
  from: string;
  to: string;
  start: number;
  end: number;
  method: StateTransition;
  /** What the author asked for, when it differs from `method`. */
  requested?: StateTransition;
  label?: string;
  focus?: string;
  wipe: { axis: "x" | "y" | "z"; direction: 1 | -1 };
}

export interface AssetStatePlan {
  id: string;
  states: ReadonlyMap<string, AssetStateDescriptor & { variant: string }>;
  initial: string;
  steps: ResolvedStateStep[];
  /** Frame at which the last step settles. */
  durationFrames: number;
  diagnostics: { code: string; severity: "error" | "warning" | "info"; message: string; step?: number }[];
}

export interface AssetStateFrame {
  /** State shown (or being left). */
  from: string;
  /** State being entered, null when settled. */
  to: string | null;
  /** Eased transition progress in [0, 1]. */
  mix: number;
  method: StateTransition;
  stepIndex: number;
  label?: string;
  focus?: string;
  wipe?: ResolvedStateStep["wipe"];
  /** Build(s) to show, each with its opacity, optional wipe clip and pose (action frame; null action = rest). */
  variants: { id: string; opacity: number; clip?: { axis: "x" | "y" | "z"; keep: "below" | "above"; at: number }; pose: { action: string | null; frame: number } }[];
}

/** Which transitions a state pair can support. */
export function supportedTransitions(a: AssetStateDescriptor & { variant: string }, b: AssetStateDescriptor & { variant: string }): StateTransition[] {
  const out: StateTransition[] = ["cut", "hold"];
  if (a.variant !== b.variant) out.unshift("crossfade", "wipe");
  else {
    const actA = a.kind === "pose" ? a.pose?.action ?? null : null, actB = b.kind === "pose" ? b.pose?.action ?? null : null;
    if (actA === null || actB === null || actA === actB) out.unshift("interpolate");
  }
  return out;
}

/** Validate and resolve a sequence. Throws on unknown or duplicate states; records fallbacks and timing fixes as diagnostics. */
export function compileAssetStateSequence(spec: AssetStateSequenceSpec): AssetStatePlan {
  const diagnostics: AssetStatePlan["diagnostics"] = [];
  const states = new Map<string, AssetStateDescriptor & { variant: string }>();
  for (const s of spec.states) {
    if (states.has(s.id)) throw new Error(`AssetStateSequence "${spec.id}": state "${s.id}" is declared twice.`);
    if (s.kind === "pose" && (!s.pose || !s.variant)) throw new Error(`AssetStateSequence "${spec.id}": pose state "${s.id}" needs a variant and a pose { action, frame }.`);
    states.set(s.id, { ...s, variant: s.variant ?? s.id });
  }
  for (const s of states.values()) if (s.kind === "pose" && !states.has(s.variant)) throw new Error(`AssetStateSequence "${spec.id}": pose state "${s.id}" refers to unknown variant "${s.variant}".`);
  const missing = [spec.initial, ...spec.steps.map((st) => st.state)].filter((id) => !states.has(id));
  if (missing.length) throw new Error(`AssetStateSequence "${spec.id}": unknown state(s) ${[...new Set(missing)].map((m) => `"${m}"`).join(", ")}. Available: ${[...states.keys()].join(", ") || "none"}.`);
  const steps: ResolvedStateStep[] = [];
  let current = spec.initial, cursor = -Infinity;
  spec.steps.forEach((st, i) => {
    const from = states.get(current)!, to = states.get(st.state)!;
    const supported = supportedTransitions(from, to);
    const best: StateTransition = supported.includes("interpolate") ? "interpolate" : supported.includes("crossfade") ? "crossfade" : "cut";
    let method = st.transition ?? best;
    if (st.state === current && method !== "hold") method = "hold";
    let requested: StateTransition | undefined;
    if (!supported.includes(method)) {
      requested = method;
      method = method === "interpolate" || method === "wipe" ? (supported.includes("crossfade") ? "crossfade" : "cut") : "cut";
      diagnostics.push({ code: "transition-fallback", severity: "warning", step: i,
        message: `"${from.label ?? from.id}" → "${to.label ?? to.id}" cannot ${requested} (${from.variant === to.variant ? "same build, different actions" : "different builds; no morph between geometries"}); using ${method}.` });
    }
    let start = st.at;
    if (!Number.isFinite(start)) throw new Error(`AssetStateSequence "${spec.id}": step ${i} has no finite start frame.`);
    if (start < cursor) {
      diagnostics.push({ code: "step-overlap", severity: "error", step: i, message: `Step ${i} ("${to.id}") starts at ${start}, before the previous step ends (${cursor}); moved to ${cursor}.` });
      start = cursor;
    }
    const duration = method === "cut" ? 0 : Math.max(0, Math.round(st.duration ?? 24));
    steps.push({ from: current, to: st.state, start, end: start + duration, method, requested, label: st.label, focus: st.focus, wipe: { axis: st.wipe?.axis ?? "x", direction: st.wipe?.direction ?? 1 } });
    cursor = start + duration;
    if (method !== "hold") current = st.state;
  });
  return { id: spec.id, states, initial: spec.initial, steps, durationFrames: Math.max(0, cursor === -Infinity ? 0 : cursor), diagnostics };
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * The state at an absolute frame. `extent` is the asset's span along the wipe
 * axis ([min, max] per axis) so wipes can place their clip plane.
 */
export function evaluateAssetStateSequence(plan: AssetStatePlan, frame: number, extent?: { x: [number, number]; y: [number, number]; z: [number, number] }): AssetStateFrame {
  let idx = -1;
  for (let i = 0; i < plan.steps.length; i++) if (plan.steps[i].start <= frame) idx = i;
  const state = (id: string) => plan.states.get(id)!;
  const restOf = (id: string) => { const s = state(id); return s.kind === "pose" ? { action: s.pose!.action as string | null, frame: s.pose!.frame } : { action: null, frame: 0 }; };
  const settled = (id: string, stepIndex: number, step?: ResolvedStateStep): AssetStateFrame => ({
    from: id, to: null, mix: 1, method: "hold", stepIndex, label: step?.label, focus: step?.focus,
    variants: [{ id: state(id).variant, opacity: 1, pose: restOf(id) }],
  });
  if (idx < 0) return settled(plan.initial, -1);
  const step = plan.steps[idx];
  const span = step.end - step.start;
  const t = span <= 0 ? 1 : Math.max(0, Math.min(1, (frame - step.start) / span));
  if (t >= 1 || step.method === "hold") {
    const shown = step.method === "hold" ? step.from : step.to;
    return { ...settled(shown, idx, step), method: step.method === "hold" ? "hold" : step.method };
  }
  const mix = smooth(t), a = state(step.from), b = state(step.to);
  const base: Omit<AssetStateFrame, "variants"> = { from: step.from, to: step.to, mix, method: step.method, stepIndex: idx, label: step.label, focus: step.focus, wipe: step.wipe };
  if (step.method === "interpolate") {
    const ra = restOf(step.from), rb = restOf(step.to);
    const action = ra.action ?? rb.action;
    const fa = ra.action ? ra.frame : 0, fb = rb.action ? rb.frame : 0;
    return { ...base, variants: [{ id: a.variant, opacity: 1, pose: { action, frame: fa + (fb - fa) * mix } }] };
  }
  if (step.method === "crossfade") {
    // Both builds dissolve (leaving 1 → 0, arriving 0 → 1); adapters keep depth correct (e.g. hashed alpha).
    return { ...base, variants: [{ id: a.variant, opacity: 1 - mix, pose: restOf(step.from) }, { id: b.variant, opacity: mix, pose: restOf(step.to) }] };
  }
  if (step.method === "wipe") {
    const range = extent?.[step.wipe.axis] ?? [-1, 1];
    const pos = step.wipe.direction > 0 ? range[0] + (range[1] - range[0]) * mix : range[1] - (range[1] - range[0]) * mix;
    // Positive direction: the new build appears from the low side.
    const newSide = step.wipe.direction > 0 ? "below" : "above", oldSide = newSide === "below" ? "above" : "below";
    return { ...base, variants: [{ id: a.variant, opacity: 1, clip: { axis: step.wipe.axis, keep: oldSide, at: pos }, pose: restOf(step.from) }, { id: b.variant, opacity: 1, clip: { axis: step.wipe.axis, keep: newSide, at: pos }, pose: restOf(step.to) }] };
  }
  return settled(step.to, idx, step);
}
