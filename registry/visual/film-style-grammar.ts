/** FSG1: film-wide style grammar. Pure, versioned authoring data plus one deterministic resolver.
 * A grammar names native operations by ID only; it stores no JavaScript, renderer, clock, asset or palette.
 * Each ID resolves against OPERATION_CATALOG, which points at the existing export that implements it.
 * Unsupported operations, missing capabilities and aspect mismatches are rejected with a trace; nothing
 * is replaced by a decorative fallback.
 */

export const SHOT_ROLES = ["establish", "investigate", "cause", "compare", "payoff"] as const;
export type ShotRole = (typeof SHOT_ROLES)[number];

export const LEARNING_OBJECTIVES = ["establish", "inspect", "investigate", "compare", "follow", "conclude"] as const;
export type LearningObjective = (typeof LEARNING_OBJECTIVES)[number];

export const ASPECT_PROFILES = ["16:9", "9:16", "1:1"] as const;
export type AspectProfile = (typeof ASPECT_PROFILES)[number];

export type OperationFamily = "drafting" | "evidence" | "process" | "comparison" | "camera" | "hook" | "cut";

/** One native operation the grammar may reference. `requires` lists capability tags the author must supply for the shot. */
export interface NativeOperation {
  id: string;
  module: string;
  exportName: string;
  family: OperationFamily;
  teaches: readonly LearningObjective[];
  requires: readonly string[];
  aspects: readonly AspectProfile[];
  attention: "low" | "high";
  /** Can the final state be shown without motion? Required when reduced motion is requested. */
  staticFallback: boolean;
  exposes: string;
  mustNotHide: string;
}

const ALL_ASPECTS: readonly AspectProfile[] = ["16:9", "9:16", "1:1"];

export const OPERATION_CATALOG: readonly NativeOperation[] = [
  { id: "section-reveal", module: "registry/visual/section-reveal.ts", exportName: "compileSectionReveal", family: "drafting",
    teaches: ["inspect"], requires: ["inspectable-asset"], aspects: ALL_ASPECTS, attention: "high", staticFallback: true,
    exposes: "the internal part behind a section plane", mustNotHide: "the intact outline and its labels" },
  { id: "exploded-view", module: "registry/motion/exploded-view.ts", exportName: "createExplodedTimeline",
    family: "drafting", teaches: ["inspect"], requires: ["assembly-parts-3d"], aspects: ALL_ASPECTS, attention: "high",
    staticFallback: true, exposes: "how separate parts fit into the assembly", mustNotHide: "the order in which parts return" },
  { id: "dimension-overlay", module: "registry/visual/dimension-overlay.ts", exportName: "resolveDimensions",
    family: "drafting", teaches: ["inspect", "compare"], requires: ["measured-dimensions"], aspects: ALL_ASPECTS, attention: "low",
    staticFallback: true, exposes: "a measured length, area or angle", mustNotHide: "the object the measurement belongs to" },
  { id: "mechanism-sequence", module: "registry/visual/mechanism-sequence.ts", exportName: "compileMechanism",
    family: "drafting", teaches: ["inspect", "follow"], requires: ["mechanism-steps"], aspects: ALL_ASPECTS, attention: "high",
    staticFallback: true, exposes: "the cause that moves each part", mustNotHide: "the resting state before and after the action" },
  { id: "inspect-then-quantify", module: "registry/visual/inspect-then-quantify.ts", exportName: "compileInspectThenQuantify",
    family: "drafting", teaches: ["inspect", "compare"], requires: ["inspectable-asset", "measured-values"], aspects: ALL_ASPECTS,
    attention: "high", staticFallback: true, exposes: "a part and the quantity it contributes", mustNotHide: "the unit and source of the quantity" },
  { id: "camera-dive", module: "registry/motion/attention-editing-treatments.ts", exportName: "compileCameraDive",
    family: "camera", teaches: ["inspect", "investigate"], requires: ["measured-geometry"], aspects: ALL_ASPECTS, attention: "high",
    staticFallback: false, exposes: "a small target at a magnification the viewer can follow", mustNotHide: "the surrounding context it came from" },
  { id: "cut-plan", module: "registry/motion/cut-director.ts", exportName: "compileCutPlan",
    family: "cut", teaches: ["establish"], requires: ["scene-boundaries"], aspects: ALL_ASPECTS, attention: "low",
    staticFallback: true, exposes: "the whole subject before any focus", mustNotHide: "the first frame's subject bounds" },
  { id: "hook-variant", module: "registry/motion/attention-editing-recipes.ts", exportName: "compileHookVariant",
    family: "hook", teaches: ["establish"], requires: ["claim-reference"], aspects: ALL_ASPECTS, attention: "high",
    staticFallback: true, exposes: "the question the film will answer", mustNotHide: "the claim it promises to resolve" },
  { id: "evidence-stage", module: "registry/visual/evidence-stage.ts", exportName: "validateEvidenceStage",
    family: "evidence", teaches: ["investigate"], requires: ["sourced-evidence"], aspects: ALL_ASPECTS, attention: "high",
    staticFallback: true, exposes: "the source excerpt and its provenance", mustNotHide: "the source identity and rights line" },
  { id: "search-evidence", module: "registry/motion/attention-editing-treatments.ts", exportName: "compileSearchEvidence",
    family: "evidence", teaches: ["investigate"], requires: ["sourced-evidence", "captured-result"], aspects: ALL_ASPECTS,
    attention: "high", staticFallback: true, exposes: "the query and the captured result", mustNotHide: "the capture date" },
  { id: "visual-contradiction", module: "registry/motion/attention-editing-recipes.ts", exportName: "compileVisualContradiction",
    family: "evidence", teaches: ["investigate"], requires: ["contrast-subject", "sourced-evidence"], aspects: ALL_ASPECTS,
    attention: "high", staticFallback: true, exposes: "a familiar subject in a contrasting state", mustNotHide: "the claim it tests" },
  { id: "exact-value-cascade", module: "registry/motion/attention-editing-compositions.ts", exportName: "compileExactValueCascade",
    family: "comparison", teaches: ["compare", "conclude"], requires: ["exact-values", "sourced-evidence"], aspects: ALL_ASPECTS,
    attention: "low", staticFallback: true, exposes: "each term and the exact total", mustNotHide: "the basis and period of each term" },
  { id: "split-comparison", module: "registry/motion/attention-editing-recipes.ts", exportName: "compileSplitScreen",
    family: "comparison", teaches: ["compare"], requires: ["two-subjects", "shared-metric"], aspects: ["16:9", "1:1"], attention: "high",
    staticFallback: true, exposes: "two subjects on one shared dimension", mustNotHide: "the metric both sides are measured in" },
  { id: "process-journey", module: "registry/motion/process-journey.ts", exportName: "createProcessJourney",
    family: "process", teaches: ["establish", "follow"], requires: ["actor", "stage-sequence"], aspects: ALL_ASPECTS, attention: "high",
    staticFallback: true, exposes: "one actor moving through ordered stages", mustNotHide: "the stage the actor is leaving" },
  { id: "flow-path", module: "registry/visual/flow-path.ts", exportName: "compileFlowPath",
    family: "process", teaches: ["follow"], requires: ["actor", "traversable-route"], aspects: ALL_ASPECTS, attention: "high",
    staticFallback: true, exposes: "the route an actor takes", mustNotHide: "the endpoints of each handoff" },
  { id: "asset-state-sequence", module: "registry/visual/asset-state-sequence.ts", exportName: "compileAssetStateSequence",
    family: "process", teaches: ["inspect", "follow"], requires: ["supplied-states"], aspects: ALL_ASPECTS, attention: "low",
    staticFallback: true, exposes: "the supplied state before and after a transition", mustNotHide: "which states were supplied, not invented" },
  { id: "match-transformation", module: "registry/motion/attention-editing-treatments.ts", exportName: "compileMatchTransformation",
    family: "process", teaches: ["follow", "establish"], requires: ["shared-subject-across-shots"], aspects: ALL_ASPECTS, attention: "low",
    staticFallback: false, exposes: "the same subject arriving in the next shot", mustNotHide: "the subject's identity across the cut" },
];

const operationIndex = new Map<string, NativeOperation>(OPERATION_CATALOG.map(op => [op.id, op]));
export function getNativeOperation(id: string): NativeOperation | undefined {
  return operationIndex.get(id);
}

/** A film-wide, versioned policy. `shots` lists native operation IDs in preference order for each role. */
export interface FilmStyleGrammar {
  id: string;
  /** Semantic version, `MAJOR.MINOR.PATCH`. */
  version: string;
  title: string;
  essence: string;
  aspects: readonly AspectProfile[];
  /** Named roles only; actual colors and typefaces belong to the consumer's DTCG tokens. */
  visualLanguage: { paletteRole: string; typographyRole: string; materialRole: string };
  caption: { maxConcurrent: number; maxWordsPerCaption: number };
  density: { maxSubjectsPerShot: number };
  pacing: { minHoldFrames: number };
  exclusions: { operations: readonly string[] };
  shots: Readonly<Record<ShotRole, readonly string[]>>;
}

export const FILM_STYLE_OVERRIDE_KEYS = ["caption", "density", "pacing", "exclusions", "shots"] as const;
export type FilmStyleOverrides = Partial<Omit<Pick<FilmStyleGrammar, (typeof FILM_STYLE_OVERRIDE_KEYS)[number]>, "shots">>
  & { shots?: Partial<Record<ShotRole, readonly string[]>> };

/** Prepared storyboard shot. Source facts, assets and narration remain consumer-owned. */
export interface FilmShotRequest {
  shotId: string;
  role: ShotRole;
  objective: LearningObjective;
  subjectIds: readonly string[];
  /** Capability tags the author actually supplies for this shot, e.g. "measured-geometry". */
  available: readonly string[];
  aspect: AspectProfile;
  startFrame: number;
  endFrame: number;
  concurrentCaptions?: number;
}

export interface FilmStyleDiagnostic {
  code: string;
  severity: "error" | "warning";
  shotId?: string;
  operationId?: string;
  message: string;
}

export interface FilmShotSelection {
  shotId: string;
  role: ShotRole;
  objective: LearningObjective;
  operationId: string;
  module: string;
  exportName: string;
  subjectIds: readonly string[];
  /** The first subject is the focus target used by the grammar-linked preflight. */
  targetId: string;
  aspect: AspectProfile;
  startFrame: number;
  endFrame: number;
  attention: "low" | "high";
  concurrentCaptions: number;
  /** One sentence: why this move, what it exposes, what it must not hide. */
  rationale: string;
  /** Set by the consumer when the same treatment is intentionally repeated next to itself. */
  repeatJustification?: string;
}

export interface FilmCandidateTrace {
  operationId: string;
  eligible: boolean;
  reason: string;
}

export interface FilmShotTrace {
  shotId: string;
  chosen?: string;
  candidates: FilmCandidateTrace[];
}

export interface FilmStyleResult {
  ok: boolean;
  grammar: { id: string; version: string };
  selections: FilmShotSelection[];
  traces: FilmShotTrace[];
  diagnostics: FilmStyleDiagnostic[];
}

export interface FilmStyleOptions {
  overrides?: FilmStyleOverrides;
  reducedMotion?: boolean;
  /** Number of earlier selections checked for repetition. Default 2. */
  recentWindow?: number;
}

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const error = (code: string, message: string, extra: Partial<FilmStyleDiagnostic> = {}): FilmStyleDiagnostic =>
  ({ code, severity: "error", message, ...extra });
const warning = (code: string, message: string, extra: Partial<FilmStyleDiagnostic> = {}): FilmStyleDiagnostic =>
  ({ code, severity: "warning", message, ...extra });

/** Checks identity, aspect profiles, override keys, shot roles and every operation reference against the catalog. */
export function validateFilmStyleGrammar(grammar: FilmStyleGrammar, overrides: FilmStyleOverrides = {}): FilmStyleDiagnostic[] {
  const out: FilmStyleDiagnostic[] = [];
  if (!grammar.id.trim()) out.push(error("grammar-id-empty", "A grammar needs a stable ID."));
  if (!SEMVER.test(grammar.version)) out.push(error("grammar-version-invalid", `Version "${grammar.version}" must be MAJOR.MINOR.PATCH.`));
  for (const key of Object.keys(overrides)) {
    if (!(FILM_STYLE_OVERRIDE_KEYS as readonly string[]).includes(key))
      out.push(error("override-key-invalid", `Override "${key}" is not allowed. Allowed keys: ${FILM_STYLE_OVERRIDE_KEYS.join(", ")}.`));
  }
  if (!grammar.aspects.length) out.push(error("grammar-aspects-empty", "A grammar must declare at least one aspect profile."));
  for (const aspect of grammar.aspects) {
    if (!(ASPECT_PROFILES as readonly string[]).includes(aspect)) out.push(error("aspect-unknown", `Aspect "${aspect}" is not a known profile.`));
  }
  const shots = { ...grammar.shots, ...(overrides.shots ?? {}) };
  for (const role of Object.keys(shots)) {
    if (!(SHOT_ROLES as readonly string[]).includes(role)) out.push(error("shot-role-invalid", `Shot role "${role}" is not one of ${SHOT_ROLES.join(", ")}.`));
  }
  for (const role of SHOT_ROLES) {
    const list = shots[role];
    if (!list?.length) {
      out.push(error("shot-role-empty", `Shot role "${role}" needs at least one native operation.`));
      continue;
    }
    for (const id of list) {
      const op = getNativeOperation(id);
      if (!op) out.push(error("operation-unresolved", `Operation "${id}" for role "${role}" is not in the installed catalog.`, { operationId: id }));
    }
  }
  if (!Number.isSafeInteger(grammar.caption.maxConcurrent) || grammar.caption.maxConcurrent < 1)
    out.push(error("caption-policy-invalid", "caption.maxConcurrent must be a positive integer."));
  return out;
}

/** Applies allowed overrides over a base grammar. Shot lists merge per role; other keys replace. */
export function applyFilmStyleOverrides(grammar: FilmStyleGrammar, overrides: FilmStyleOverrides = {}): FilmStyleGrammar {
  return {
    ...grammar,
    caption: overrides.caption ?? grammar.caption,
    density: overrides.density ?? grammar.density,
    pacing: overrides.pacing ?? grammar.pacing,
    exclusions: overrides.exclusions ?? grammar.exclusions,
    shots: { ...grammar.shots, ...(overrides.shots ?? {}) },
  };
}

/** Two grammars are distinct only when their staging (operation order per role) differs. Color or grain changes do not count. */
export function inspectGrammarDistinctness(a: FilmStyleGrammar, b: FilmStyleGrammar): FilmStyleDiagnostic[] {
  const signature = (g: FilmStyleGrammar) => SHOT_ROLES.map(role => g.shots[role].join(",")).join("|");
  if (signature(a) === signature(b))
    return [error("style-not-distinct", `"${b.id}" uses the same native operations per shot role as "${a.id}". A palette, grain or typography change is not a new style.`)];
  return [];
}

function rankPenalty(operationId: string, recent: readonly string[]): number {
  if (recent[recent.length - 1] === operationId) return 2;
  return recent.includes(operationId) ? 1 : 0;
}

/** Resolves prepared shots in order. Pure and seek-safe: identical inputs always produce identical selections. */
export function resolveFilmStyle(base: FilmStyleGrammar, shotRequests: readonly FilmShotRequest[], options: FilmStyleOptions = {}): FilmStyleResult {
  const overrides = options.overrides ?? {};
  const diagnostics = validateFilmStyleGrammar(base, overrides);
  const grammar = applyFilmStyleOverrides(base, overrides);
  const recentWindow = Math.max(1, options.recentWindow ?? 2);
  const selections: FilmShotSelection[] = [];
  const traces: FilmShotTrace[] = [];
  const ordered = [...shotRequests].sort((a, b) => a.startFrame - b.startFrame || a.shotId.localeCompare(b.shotId));
  const recent: string[] = [];

  for (const shot of ordered) {
    const trace: FilmShotTrace = { shotId: shot.shotId, candidates: [] };
    traces.push(trace);
    if (!shot.shotId.trim() || !Number.isSafeInteger(shot.startFrame) || !Number.isSafeInteger(shot.endFrame) || shot.endFrame <= shot.startFrame) {
      diagnostics.push(error("shot-range-invalid", `Shot "${shot.shotId}" needs a non-empty integer frame interval.`, { shotId: shot.shotId }));
      continue;
    }
    if (!grammar.aspects.includes(shot.aspect)) {
      diagnostics.push(error("aspect-unsupported", `Grammar "${grammar.id}" does not declare aspect ${shot.aspect}.`, { shotId: shot.shotId }));
      continue;
    }
    if (shot.subjectIds.length === 0) {
      diagnostics.push(error("shot-subject-missing", `Shot "${shot.shotId}" must name at least one subject.`, { shotId: shot.shotId }));
      continue;
    }
    if (shot.subjectIds.length > grammar.density.maxSubjectsPerShot) {
      diagnostics.push(error("density-exceeded", `Shot "${shot.shotId}" has ${shot.subjectIds.length} subjects; the grammar allows ${grammar.density.maxSubjectsPerShot}. Split the shot or remove a subject.`, { shotId: shot.shotId }));
      continue;
    }
    const captions = shot.concurrentCaptions ?? 0;
    if (captions > grammar.caption.maxConcurrent) {
      diagnostics.push(error("caption-policy", `Shot "${shot.shotId}" shows ${captions} captions; the grammar allows ${grammar.caption.maxConcurrent}.`, { shotId: shot.shotId }));
      continue;
    }

    const eligible: Array<{ id: string; index: number; penalty: number }> = [];
    grammar.shots[shot.role].forEach((id, index) => {
      const op = getNativeOperation(id);
      let reason = "eligible";
      if (!op) reason = "not in installed catalog";
      else if (grammar.exclusions.operations.includes(id)) reason = "forbidden by grammar";
      else if (!op.aspects.includes(shot.aspect)) reason = `aspect ${shot.aspect} unsupported`;
      else if (!op.teaches.includes(shot.objective)) reason = `cannot teach "${shot.objective}"`;
      else {
        const missing = op.requires.filter(tag => !shot.available.includes(tag));
        if (missing.length) reason = `missing capability: ${missing.join(", ")}`;
        else if (options.reducedMotion && !op.staticFallback) reason = "no static fallback under reduced motion";
      }
      trace.candidates.push({ operationId: id, eligible: reason === "eligible", reason });
      if (reason === "eligible") eligible.push({ id, index, penalty: rankPenalty(id, recent.slice(-recentWindow)) });
    });

    if (!eligible.length) {
      diagnostics.push(error("no-eligible-treatment",
        `No native treatment for role "${shot.role}" can teach "${shot.objective}" in shot "${shot.shotId}" with the supplied capabilities. Supply the missing capability or change the objective; no decorative fallback is substituted.`,
        { shotId: shot.shotId }));
      continue;
    }
    eligible.sort((a, b) => a.penalty - b.penalty || a.index - b.index || a.id.localeCompare(b.id));
    const pick = eligible[0];
    const op = getNativeOperation(pick.id)!;
    if (pick.penalty === 2) diagnostics.push(warning("repeat-without-alternative",
      `Shot "${shot.shotId}" repeats "${op.id}" from the previous shot and no other native treatment fits. Add a repeatJustification or supply another capability.`,
      { shotId: shot.shotId, operationId: op.id }));
    trace.chosen = op.id;
    recent.push(op.id);
    selections.push({
      shotId: shot.shotId, role: shot.role, objective: shot.objective, operationId: op.id, module: op.module, exportName: op.exportName,
      subjectIds: [...shot.subjectIds], targetId: shot.subjectIds[0], aspect: shot.aspect,
      startFrame: shot.startFrame, endFrame: shot.endFrame, attention: op.attention, concurrentCaptions: captions,
      rationale: `Teaches ${shot.objective} with ${op.id}: exposes ${op.exposes}; must not hide ${op.mustNotHide}.`,
    });
  }
  return {
    ok: !diagnostics.some(d => d.severity === "error"),
    grammar: { id: grammar.id, version: grammar.version },
    selections, traces, diagnostics,
  };
}

const CAPTIONS = { maxConcurrent: 1, maxWordsPerCaption: 12 };
const ALL = ["16:9", "9:16", "1:1"] as const;

/** Three first pilots. Each names only catalog operations; composition and motion differ per role. */
export const TECHNICAL_DRAFTING: FilmStyleGrammar = {
  id: "technical-drafting", version: "1.0.0", title: "Technical Drafting",
  essence: "Whole object, then a measured cutaway, then the active part, then the restored mechanism.",
  aspects: [...ALL],
  visualLanguage: { paletteRole: "drafting-neutral", typographyRole: "drafting-label", materialRole: "matte-surface" },
  caption: { ...CAPTIONS },
  density: { maxSubjectsPerShot: 3 },
  pacing: { minHoldFrames: 24 },
  exclusions: { operations: ["visual-contradiction", "search-evidence"] },
  shots: {
    establish: ["cut-plan", "hook-variant"],
    investigate: ["section-reveal", "exploded-view"],
    cause: ["mechanism-sequence", "inspect-then-quantify"],
    compare: ["dimension-overlay", "inspect-then-quantify"],
    payoff: ["exploded-view", "section-reveal"],
  },
};

export const EVIDENCE_INVESTIGATION: FilmStyleGrammar = {
  id: "evidence-investigation", version: "1.0.0", title: "Evidence Investigation",
  essence: "Claimed result, then real source, then a frozen annotated fact, then an honest chart and a qualified verdict.",
  aspects: [...ALL],
  visualLanguage: { paletteRole: "evidence-paper", typographyRole: "evidence-body", materialRole: "document-surface" },
  caption: { ...CAPTIONS },
  density: { maxSubjectsPerShot: 2 },
  pacing: { minHoldFrames: 36 },
  exclusions: { operations: ["mechanism-sequence", "exploded-view"] },
  shots: {
    establish: ["hook-variant"],
    investigate: ["search-evidence", "evidence-stage", "visual-contradiction"],
    cause: ["evidence-stage", "camera-dive"],
    compare: ["split-comparison", "exact-value-cascade"],
    payoff: ["exact-value-cascade", "split-comparison"],
  },
};

export const CONNECTED_PROCESS_WORLD: FilmStyleGrammar = {
  id: "connected-process-world", version: "1.0.0", title: "Connected Process World",
  essence: "One persistent actor follows real handoffs; each handoff shows a state change and its consequence.",
  aspects: [...ALL],
  visualLanguage: { paletteRole: "process-stage", typographyRole: "process-label", materialRole: "flat-diagram" },
  caption: { ...CAPTIONS },
  density: { maxSubjectsPerShot: 4 },
  pacing: { minHoldFrames: 24 },
  exclusions: { operations: ["visual-contradiction"] },
  shots: {
    establish: ["process-journey", "hook-variant"],
    investigate: ["flow-path", "process-journey"],
    cause: ["asset-state-sequence", "match-transformation"],
    compare: ["split-comparison", "match-transformation"],
    payoff: ["match-transformation", "process-journey"],
  },
};

export const FILM_STYLE_GRAMMARS = [TECHNICAL_DRAFTING, EVIDENCE_INVESTIGATION, CONNECTED_PROCESS_WORLD] as const;
