/** ShortHookDirector: compiles an opening strategy into an ordinary MotionDirector group + hook plan.
 * No renderer, clock or scene format: the output is MD1 data the caller embeds at the film start
 * (or anywhere) and renders through its own MotionDirector adapter. It validates what code can
 * know — the payoff exists later and addresses the claim, frame-0 subjects are visible in the
 * compiled timeline and framed in every output — not whether the hook is compelling.
 *
 * Channels (adapter contract): `opacity` 0..1, `scale` (1 = rest), `offset` vec2 in output px,
 * `emphasis` 0..1 (focus treatment), `progress` 0..1 (an action, count-up or transformation the
 * adapter plays). Scale/offset are marked decorative, so `profile.intensity` may soften them.
 */
import { AnimationGroup, MotionRecipe } from "../motion/director-authoring";
import { sceneContinuityRecipe } from "../motion/director-recipes";
import { compileMotionDirector, evaluateMotionDirector } from "../motion/motion-director";
import type { CompiledMotionDirector, DirectorAnimation, DirectorGroup, DirectorNode, MotionDirection } from "../motion/director-types";
import type { Diagnostic, EasingSpec, MotionValue, RationalFps, Rect } from "../motion/types";
import type { MotionPurpose, PrincipledProduction } from "./explainer-principles";
import { inspectSafeFrame } from "./safe-frame";
import type { SafeFrameProfile } from "./safe-frame";

export type ShortHookStrategy = "action-first" | "unexpected-reveal" | "impact-statistic" | "transformation" | "evidence-question";
export type HookBeatRole = "open" | "reveal" | "context" | "transform" | "focus" | "question";
export interface HookFact { id: string; value: number | string; unit: string; sourceId?: string; illustrative?: boolean }
export type HookRoles =
  | { strategy: "action-first"; actor: string; focus?: string; /** Action already underway at frame 0, 0..1. Default 0.3. */ startProgress?: number }
  | { strategy: "unexpected-reveal"; familiar: string; reveal: string }
  | { strategy: "impact-statistic"; metric: string; context: string; fact: HookFact; /** 0 (default) shows the full value at frame 0. */ countUpFrames?: number }
  | { strategy: "transformation"; before: string; after: string; /** Optional VT1 scenes; otherwise a crossfade with `progress`. */ fromScene?: string; toScene?: string }
  | { strategy: "evidence-question"; evidence: string; focus: string };

export interface ShortHookSpec {
  id: string;
  fps: RationalFps;
  durationFrames: number;
  /** Learning outcome the hook raises; the payoff shot must resolve it. */
  claimId: string;
  /** Production shot that pays the hook off. */
  payoffId: string;
  /** What is unexpected, in the author's words. Required for unexpected-reveal. */
  surprise?: string;
  /** Every semantic subject the hook uses; role targets must be among them. */
  subjectIds: readonly string[];
  roles: HookRoles;
  /** Optional on-screen question element, faded in on the final beat. */
  questionId?: string;
  /** Beat starts in hook-local frames, typically from narration alignment. Overrides the strategy's proportions. */
  align?: Partial<Record<HookBeatRole, number>>;
  /** Production shot ID the hook occupies (default: `id`). */
  shotId?: string;
}
export interface HookOutput { profile: SafeFrameProfile; /** Normalized subject bounds at frame 0 for this output. */ layout: Readonly<Record<string, Rect>> }
export interface HookBeat { role: HookBeatRole; startFrame: number; endFrame: number; purpose: MotionPurpose; focus: string[] }
export interface ShortHookPlan {
  id: string;
  strategy: ShortHookStrategy;
  claimId: string;
  payoffId: string;
  surprise?: string;
  beats: HookBeat[];
  /** Feed into `inspectExplainerPrinciples` `opening` and `hook`. */
  principles: { opening: { visibleSubjectIds: string[] }; hook: { shotId: string; claimId: string; payoffShotId: string } };
  /** Final channel values, so the following choreography can continue without a jump. */
  endState: Record<string, MotionValue>;
}
export interface HookDiagnostic extends Diagnostic { targetId?: string }
export type ShortHookCompilation = {
  ok: boolean;
  node: DirectorGroup;
  /** The hook alone as a film, for preview and checks. */
  direction: MotionDirection;
  compiled?: CompiledMotionDirector;
  plan: ShortHookPlan;
  diagnostics: HookDiagnostic[];
};

const STRATEGY_BEATS: Record<ShortHookStrategy, readonly [HookBeatRole, number, MotionPurpose][]> = {
  "action-first": [["open", 0, "attract-attention"], ["focus", 0.55, "direct-focus"], ["question", 0.8, "direct-focus"]],
  "unexpected-reveal": [["open", 0, "attract-attention"], ["reveal", 0.4, "reveal-evidence"], ["question", 0.78, "direct-focus"]],
  "impact-statistic": [["open", 0, "attract-attention"], ["context", 0.45, "illustrate-scale"], ["question", 0.8, "direct-focus"]],
  "transformation": [["open", 0, "attract-attention"], ["transform", 0.35, "compare-alternatives"], ["question", 0.78, "direct-focus"]],
  "evidence-question": [["open", 0, "attract-attention"], ["focus", 0.4, "reveal-evidence"], ["question", 0.75, "direct-focus"]],
};
/** Subjects that must be visible at frame 0 for each strategy. */
function openingOf(roles: HookRoles): string[] {
  switch (roles.strategy) {
    case "action-first": return [roles.actor];
    case "unexpected-reveal": return [roles.familiar];
    case "impact-statistic": return [roles.metric];
    case "transformation": return [roles.before];
    case "evidence-question": return [roles.evidence];
  }
}
function roleTargets(roles: HookRoles): string[] {
  switch (roles.strategy) {
    case "action-first": return [roles.actor, ...(roles.focus ? [roles.focus] : [])];
    case "unexpected-reveal": return [roles.familiar, roles.reveal];
    case "impact-statistic": return [roles.metric, roles.context];
    case "transformation": return [roles.before, roles.after];
    case "evidence-question": return [roles.evidence, roles.focus];
  }
}

const EASE: EasingSpec = "ease-in-out-cubic";
const FADE = 8;
function track(id: string, targetId: string, property: string, valueType: DirectorAnimation["track"]["valueType"],
  keys: readonly [number, MotionValue][], decorativeRest?: MotionValue): DirectorAnimation {
  // Collapse duplicate frames (short beats) keeping the later value; keys stay strictly ascending.
  const ordered = new Map<number, MotionValue>();
  for (const [frame, value] of keys) ordered.set(frame, value);
  return { kind: "animation", id, ...(decorativeRest !== undefined ? { intensityOrigin: decorativeRest } : {}),
    track: { id, targetId, property, valueType, easing: EASE,
      keyframes: [...ordered.entries()].sort((a, b) => a[0] - b[0]).map(([frame, value]) => ({ frame, value })) } };
}
const fadeIn = (id: string, target: string, at: number, end: number) =>
  track(`${id}/${target}/opacity`, target, "opacity", "opacity", [[0, 0], [at, 0], [Math.min(end, at + FADE), 1], [end, 1]]);
const visible = (id: string, target: string, end: number) =>
  track(`${id}/${target}/opacity`, target, "opacity", "opacity", [[0, 1], [end, 1]]);
const emphasize = (id: string, target: string, at: number, end: number) =>
  track(`${id}/${target}/emphasis`, target, "emphasis", "number", [[0, 0], [at, 0], [Math.min(end, at + FADE + 4), 1], [end, 1]]);

/** One typed recipe per strategy keeps MD1 provenance (recipe id/version/scalars) on the emitted node. */
const hookRecipe = MotionRecipe<{ strategy: ShortHookStrategy; claimId: string; payoffId: string; durationFrames: number; spec: ShortHookSpec; beats: HookBeat[] }>({
  id: "short-hook", version: 1,
  build({ spec, beats }) {
    const { id, roles } = spec, end = spec.durationFrames - 1;
    const start = (role: HookBeatRole) => beats.find(beat => beat.role === role)?.startFrame ?? end;
    const children: DirectorNode[] = [];
    switch (roles.strategy) {
      case "action-first": {
        const from = roles.startProgress ?? 0.3;
        children.push(visible(id, roles.actor, end),
          track(`${id}/${roles.actor}/progress`, roles.actor, "progress", "number", [[0, from], [end, 1]]));
        if (roles.focus) children.push(roles.focus === roles.actor ? emphasize(id, roles.focus, start("focus"), end)
          : AnimationGroup({ id: `${id}/focus`, mode: "parallel", children: [visible(id, roles.focus, end), emphasize(id, roles.focus, start("focus"), end)] }));
        break;
      }
      case "unexpected-reveal": {
        const at = start("reveal");
        children.push(visible(id, roles.familiar, end), fadeIn(id, roles.reveal, at, end),
          track(`${id}/${roles.reveal}/scale`, roles.reveal, "scale", "number", [[0, 0.92], [at, 0.92], [Math.min(end, at + 14), 1], [end, 1]], 1),
          track(`${id}/${roles.reveal}/offset`, roles.reveal, "offset", "vec2", [[0, { x: 0, y: 24 }], [at, { x: 0, y: 24 }], [Math.min(end, at + 14), { x: 0, y: 0 }], [end, { x: 0, y: 0 }]], { x: 0, y: 0 }),
          emphasize(id, roles.reveal, at, end));
        break;
      }
      case "impact-statistic": {
        const count = Math.max(0, Math.min(roles.countUpFrames ?? 0, start("context")));
        children.push(visible(id, roles.metric, end),
          track(`${id}/${roles.metric}/progress`, roles.metric, "progress", "number", count ? [[0, 0], [count, 1], [end, 1]] : [[0, 1], [end, 1]]),
          fadeIn(id, roles.context, start("context"), end), emphasize(id, roles.context, start("context"), end));
        break;
      }
      case "transformation": {
        const at = start("transform"), until = Math.max(at + 4, start("question") - 1);
        children.push(track(`${id}/${roles.after}/progress`, roles.after, "progress", "number", [[0, 0], [at, 0], [until, 1], [end, 1]]));
        if (roles.fromScene && roles.toScene)
          children.push(sceneContinuityRecipe.create({ id: `${id}/transform`, at, durationFrames: Math.max(4, until - at), fromScene: roles.fromScene, toScene: roles.toScene }));
        else children.push(
          track(`${id}/${roles.before}/opacity`, roles.before, "opacity", "opacity", [[0, 1], [at, 1], [until, 0], [end, 0]]),
          track(`${id}/${roles.after}/opacity`, roles.after, "opacity", "opacity", [[0, 0], [at, 0], [until, 1], [end, 1]]));
        break;
      }
      case "evidence-question": {
        children.push(visible(id, roles.evidence, end), emphasize(id, roles.focus, start("focus"), end));
        if (roles.focus !== roles.evidence) children.push(visible(id, roles.focus, end));
        break;
      }
    }
    if (spec.questionId) children.push(fadeIn(id, spec.questionId, start("question"), end));
    for (const beat of beats) children.push({ kind: "cue", id: `${id}/beat/${beat.role}`, at: beat.startFrame,
      durationFrames: beat.endFrame - beat.startFrame, payload: { kind: "event", name: `hook:${beat.role}` } });
    return AnimationGroup({ id, mode: "parallel", durationFrames: spec.durationFrames, children });
  },
});

function planBeats(spec: ShortHookSpec, report: (code: string, message: string) => void): HookBeat[] {
  const table = STRATEGY_BEATS[spec.roles.strategy], d = spec.durationFrames;
  const starts = table.map(([role, fraction]) => spec.align?.[role] ?? Math.round(fraction * d));
  for (const role of Object.keys(spec.align ?? {}) as HookBeatRole[])
    if (!table.some(([name]) => name === role)) report("hook-align-invalid", `Strategy "${spec.roles.strategy}" has no "${role}" beat.`);
  if (starts[0] !== 0) report("hook-align-invalid", "The open beat starts at frame 0; meaningful content shows immediately.");
  for (let i = 1; i < starts.length; i += 1)
    if (!Number.isSafeInteger(starts[i]) || starts[i] <= starts[i - 1] + 3 || starts[i] >= d - 3)
      report("hook-align-invalid", `Beat "${table[i][0]}" at ${starts[i]} must be an integer after "${table[i - 1][0]}" with at least 4 frames each, inside ${d} frames.`);
  return table.map(([role, , purpose], i) => ({ role, purpose, startFrame: starts[i], endFrame: starts[i + 1] ?? d,
    focus: role === "open" ? openingOf(spec.roles) : role === "question" ? (spec.questionId ? [spec.questionId] : []) : roleTargets(spec.roles).slice(1) }));
}

export function compileShortHook(spec: ShortHookSpec, options: { production?: PrincipledProduction; outputs?: readonly HookOutput[] } = {}): ShortHookCompilation {
  const diagnostics: HookDiagnostic[] = [];
  const report = (severity: "error" | "warning", code: string, message: string, extra: Partial<HookDiagnostic> = {}) =>
    diagnostics.push({ code, severity, message, ...extra });
  const error = (code: string, message: string) => report("error", code, message);
  const opening = openingOf(spec.roles), shotId = spec.shotId ?? spec.id;
  if (!spec.id.trim() || !Number.isSafeInteger(spec.durationFrames) || spec.durationFrames < 30)
    error("hook-invalid", "A hook needs an ID and at least 30 integer frames (one second at 30 fps) to establish and question.");
  if (!spec.claimId.trim() || !spec.payoffId.trim()) error("hook-invalid", "Name the claim the hook raises and the payoff shot that resolves it.");
  const subjects = new Set(spec.subjectIds);
  for (const target of [...roleTargets(spec.roles), ...(spec.questionId ? [spec.questionId] : [])])
    if (!target.trim() || !subjects.has(target)) report("error", "hook-role-not-subject", `"${target}" is used by the hook but not declared in subjectIds.`, { targetId: target });
  if (spec.roles.strategy === "unexpected-reveal" && !spec.surprise?.trim())
    error("hook-surprise-missing", "An unexpected reveal must state what is unexpected and accurate about it.");
  if (spec.roles.strategy === "action-first" && (spec.roles.startProgress ?? 0.3) <= 0)
    report("warning", "hook-action-not-underway", "An action-first hook should open with the action already underway (startProgress > 0).");
  if (spec.roles.strategy === "impact-statistic") {
    const { fact } = spec.roles;
    if (!fact.unit.trim()) error("hook-fact-unit-missing", `Statistic "${fact.id}" needs an explicit unit.`);
    if (!fact.illustrative && !fact.sourceId?.trim()) error("hook-fact-unsourced", `Statistic "${fact.id}" needs a source, or must be labelled illustrative.`);
    if (spec.roles.context === spec.roles.metric) error("hook-statistic-without-context", "Pair the number with a separate context subject (a physical object or chart), not just large text.");
  }
  const beats = diagnostics.some(d => d.code === "hook-invalid") ? [] : planBeats(spec, (code, message) => error(code, message));

  // Payoff anchor: must exist later in the production and address the same claim.
  const hookShot = options.production?.shots.find(shot => shot.id === shotId);
  if (!options.production) report("warning", "hook-payoff-unverified", "Pass the production contract to verify the payoff shot.");
  else {
    const payoff = options.production.shots.find(shot => shot.id === spec.payoffId);
    const hookEnd = (hookShot?.startFrame ?? 0) + spec.durationFrames;
    if (!options.production.outcomes.some(outcome => outcome.id === spec.claimId))
      error("hook-claim-unknown", `Claim "${spec.claimId}" is not a learning outcome of production "${options.production.id}".`);
    if (!hookShot) error("hook-shot-missing", `Production has no hook shot "${shotId}".`);
    else if (hookShot.endFrame - hookShot.startFrame !== spec.durationFrames)
      error("hook-shot-length", `Hook shot "${shotId}" lasts ${hookShot.endFrame - hookShot.startFrame} frames; the hook compiles ${spec.durationFrames}.`);
    if (!payoff) error("hook-payoff-missing", `Payoff shot "${spec.payoffId}" does not exist.`);
    else {
      if (payoff.startFrame < hookEnd) error("hook-payoff-before-hook", `Payoff "${payoff.id}" starts at ${payoff.startFrame}, before the hook ends at ${hookEnd}.`);
      if (payoff.purpose !== "deliver-payoff") report("warning", "hook-payoff-purpose", `Payoff shot "${payoff.id}" is not declared as deliver-payoff.`);
      if (!(payoff.outcomeIds ?? []).includes(spec.claimId))
        error("hook-payoff-unrelated", `Payoff "${payoff.id}" does not resolve claim "${spec.claimId}"; add it to the shot's outcomeIds or choose the right payoff.`);
    }
  }

  const node = beats.length ? hookRecipe.create({ strategy: spec.roles.strategy, claimId: spec.claimId, payoffId: spec.payoffId, durationFrames: spec.durationFrames, spec, beats }) as DirectorGroup
    : AnimationGroup({ id: spec.id || "hook", mode: "parallel", children: [] });
  const direction: MotionDirection = { schemaVersion: 1, id: `${spec.id}-preview`, title: `Hook: ${spec.roles.strategy}`, fps: spec.fps,
    durationFrames: Math.max(1, spec.durationFrames), targets: [...subjects], children: [node] };
  const plan: ShortHookPlan = { id: spec.id, strategy: spec.roles.strategy, claimId: spec.claimId, payoffId: spec.payoffId, surprise: spec.surprise,
    beats, endState: {}, principles: { opening: { visibleSubjectIds: opening }, hook: { shotId, claimId: spec.claimId, payoffShotId: spec.payoffId } } };

  let compiled: CompiledMotionDirector | undefined;
  if (beats.length) {
    const result = compileMotionDirector(direction);
    diagnostics.push(...result.diagnostics);
    if (result.ok) {
      compiled = result.director;
      // Frame 0 is checked on the compiled MG1 timeline, not on the authoring intent.
      const first = evaluateMotionDirector(compiled, 0).evaluation.samples;
      for (const id of opening) {
        const opacity = first[`${id}.opacity`]?.value;
        if (typeof opacity !== "number" || opacity < 0.999)
          report("error", "hook-opening-invisible", `Opening subject "${id}" is not fully visible at frame 0.`, { targetId: id, frame: 0 });
      }
      const last = evaluateMotionDirector(compiled, spec.durationFrames - 1).evaluation.samples;
      for (const [key, sample] of Object.entries(last)) plan.endState[key] = sample.value;
    }
  }
  for (const output of options.outputs ?? []) {
    const items = opening.map(id => ({ id, kind: "subject" as const, critical: true, rect: output.layout[id] }));
    for (const item of items) if (!item.rect)
      report("error", "hook-opening-unframed", `Output "${output.profile.id}" has no frame-0 bounds for "${item.id}".`, { targetId: item.id, frame: 0 });
    const framed = inspectSafeFrame(output.profile, items.filter(item => item.rect));
    for (const d of framed.diagnostics.filter(d => d.severity === "error"))
      report("error", "hook-opening-unframed", `Frame 0 in "${output.profile.id}": ${d.message}`, { targetId: d.targetId, frame: 0 });
  }
  return { ok: !diagnostics.some(d => d.severity === "error"), node, direction, compiled, plan, diagnostics };
}

export const SHORT_HOOK_STRATEGIES = Object.keys(STRATEGY_BEATS) as ShortHookStrategy[];
