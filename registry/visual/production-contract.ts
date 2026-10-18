/** Small narrative/visual contract checked before motion and scene compilation.
 * It validates structure and required evidence, NOT the truth of an authored
 * claim or subjective aesthetic quality. Avoid turning checklists into a model.
 */
export interface VisualLearningOutcome {
  id: string;
  /** A specific claim, not merely a chapter title such as "Forward". */
  claim: string;
  concept: string;
}
export interface VisualShotContract {
  id: string;
  startFrame: number;
  endFrame: number;
  visualObjective: string;
  /** Stable semantic IDs used by existing CC1/scene constraints. */
  criticalSubjects: readonly string[];
  /** Named actions: e.g. "type-message", "tap-send", "show-answer". */
  actions: readonly string[];
  outcomeIds?: readonly string[];
}
export interface VisualProductionContract {
  id: string;
  totalFrames: number;
  shots: readonly VisualShotContract[];
  outcomes: readonly VisualLearningOutcome[];
  /** Outgoing recap must explicitly reinforce factual outcomes. */
  closingShotId: string;
  closingOutcomeIds: readonly string[];
}
export interface ProductionContractIssue {
  code: "invalid" | "timeline-gap" | "missing-outcome" | "missing-action" | "missing-closing-summary";
  path: string;
  message: string;
}

export function validateVisualProduction(contract: VisualProductionContract) {
  const issues: ProductionContractIssue[] = [];
  const report = (code: ProductionContractIssue["code"], path: string, message: string) =>
    issues.push({ code, path, message });
  if (!contract.id.trim() || !Number.isSafeInteger(contract.totalFrames) || contract.totalFrames <= 0)
    report("invalid", "id/totalFrames", "Production needs an ID and positive integer frame count.");
  const outcomeIds = new Set<string>(), shotIds = new Set<string>();
  for (const [index, outcome] of contract.outcomes.entries()) {
    if (!outcome.id.trim() || outcomeIds.has(outcome.id) || !outcome.claim.trim() || !outcome.concept.trim())
      report("invalid", `outcomes[${index}]`, "Each outcome needs a unique ID, concept and explicit claim.");
    outcomeIds.add(outcome.id);
  }
  let cursor = 0;
  for (const [index, shot] of contract.shots.entries()) {
    const path = `shots[${index}]`;
    if (!shot.id.trim() || shotIds.has(shot.id) || !shot.visualObjective.trim() ||
      !Number.isSafeInteger(shot.startFrame) || !Number.isSafeInteger(shot.endFrame) ||
      shot.endFrame <= shot.startFrame)
      report("invalid", path, "Shot needs a distinct ID, objective and valid frame interval.");
    shotIds.add(shot.id);
    if (shot.startFrame !== cursor) report("timeline-gap", path, `Expected frame ${cursor}, got ${shot.startFrame}.`);
    cursor = shot.endFrame;
    if (!shot.criticalSubjects.length || !shot.actions.length)
      report("missing-action", path, "Specify a subject and what visually happens in this shot.");
    for (const id of shot.outcomeIds ?? []) if (!outcomeIds.has(id))
      report("missing-outcome", path, `Unknown learning outcome "${id}".`);
  }
  if (cursor !== contract.totalFrames)
    report("timeline-gap", "shots", `Shots end at ${cursor}, production ends at ${contract.totalFrames}.`);
  const closing = contract.shots.find(shot => shot.id === contract.closingShotId);
  if (!closing || closing !== contract.shots[contract.shots.length - 1])
    report("missing-closing-summary", "closingShotId", "Closing summary must be the final authored shot.");
  if (!contract.closingOutcomeIds.length)
    report("missing-closing-summary", "closingOutcomeIds", "Closing summary must refer to substantive learning outcomes.");
  for (const id of contract.closingOutcomeIds) {
    if (!outcomeIds.has(id)) report("missing-outcome", "closingOutcomeIds", `Unknown closing outcome "${id}".`);
    if (closing && !(closing.outcomeIds ?? []).includes(id))
      report("missing-closing-summary", "closingOutcomeIds", `Closing shot does not visualize outcome "${id}".`);
  }
  return { ok: issues.length === 0, issues };
}
