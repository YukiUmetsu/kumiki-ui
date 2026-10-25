import { describe, expect, it } from "vitest";
import {
  CONNECTED_PROCESS_WORLD, EVIDENCE_INVESTIGATION, FILM_STYLE_GRAMMARS, OPERATION_CATALOG, TECHNICAL_DRAFTING,
  applyFilmStyleOverrides, inspectGrammarDistinctness, resolveFilmStyle, validateFilmStyleGrammar,
  type FilmShotRequest, type FilmShotSelection, type FilmStyleGrammar, type ShotRole,
} from "../registry/visual/film-style-grammar";
import { inspectFilmStyleSelections } from "../registry/visual/explainer-preflight";

const shot = (over: Partial<FilmShotRequest> & Pick<FilmShotRequest, "shotId" | "role">): FilmShotRequest => ({
  objective: "investigate", subjectIds: ["subject-a"], available: [], aspect: "16:9",
  startFrame: 0, endFrame: 90, concurrentCaptions: 1, ...over,
});

describe("film style grammar catalog", () => {
  it("resolves every operation to an exported function in its implementing module", async () => {
    for (const op of OPERATION_CATALOG) {
      const mod = await import(/* @vite-ignore */ `../${op.module}`);
      expect(typeof mod[op.exportName], `${op.id} -> ${op.module}#${op.exportName}`).toBe("function");
    }
  });

  it("validates all shipped grammars without errors", () => {
    for (const grammar of FILM_STYLE_GRAMMARS) {
      expect(validateFilmStyleGrammar(grammar).filter(d => d.severity === "error")).toEqual([]);
    }
  });

  it("reports unknown operations, bad versions and disallowed override keys", () => {
    const broken: FilmStyleGrammar = { ...TECHNICAL_DRAFTING, version: "v1", shots: { ...TECHNICAL_DRAFTING.shots, cause: ["no-such-operation"] } };
    const codes = validateFilmStyleGrammar(broken, { palette: { primary: "#000" } } as never).map(d => d.code);
    expect(codes).toEqual(expect.arrayContaining(["grammar-version-invalid", "operation-unresolved", "override-key-invalid"]));
  });

  it("applies per-role shot overrides without touching other roles", () => {
    const applied = applyFilmStyleOverrides(TECHNICAL_DRAFTING, { shots: { compare: ["dimension-overlay"] } });
    expect(applied.shots.compare).toEqual(["dimension-overlay"]);
    expect(applied.shots.investigate).toEqual(TECHNICAL_DRAFTING.shots.investigate);
  });
});

describe("film style resolution", () => {
  it("returns identical selections on repeated runs", () => {
    const shots = [shot({ shotId: "s1", role: "investigate", available: ["sourced-evidence"] }), shot({ shotId: "s2", role: "investigate", available: ["sourced-evidence", "captured-result"], startFrame: 90, endFrame: 180 })];
    expect(resolveFilmStyle(EVIDENCE_INVESTIGATION, shots)).toEqual(resolveFilmStyle(EVIDENCE_INVESTIGATION, shots));
  });

  it("avoids adjacent repetition when a second treatment fits", () => {
    const result = resolveFilmStyle(EVIDENCE_INVESTIGATION, [
      shot({ shotId: "s1", role: "investigate", available: ["sourced-evidence", "captured-result"] }),
      shot({ shotId: "s2", role: "investigate", available: ["sourced-evidence", "captured-result"], startFrame: 90, endFrame: 180 }),
    ]);
    expect(result.ok).toBe(true);
    expect(result.selections[0].operationId).toBe("search-evidence");
    expect(result.selections[1].operationId).not.toBe("search-evidence");
    expect(result.diagnostics.some(d => d.code === "repeat-without-alternative")).toBe(false);
  });

  it("rejects a shot whose capabilities are missing, with a trace and no decorative fallback", () => {
    const result = resolveFilmStyle(EVIDENCE_INVESTIGATION, [shot({ shotId: "s1", role: "investigate", available: [] })]);
    expect(result.ok).toBe(false);
    expect(result.selections).toEqual([]);
    expect(result.diagnostics.map(d => d.code)).toContain("no-eligible-treatment");
    expect(result.traces[0].candidates.every(c => !c.eligible)).toBe(true);
    expect(result.traces[0].candidates[0].reason).toMatch(/missing capability/);
  });

  it("skips treatments without a static fallback under reduced motion", () => {
    const result = resolveFilmStyle(EVIDENCE_INVESTIGATION, [
      shot({ shotId: "s1", role: "cause", objective: "investigate", available: ["sourced-evidence", "measured-geometry"] }),
    ], { reducedMotion: true });
    expect(result.ok).toBe(true);
    expect(result.selections[0].operationId).toBe("evidence-stage");
    expect(result.traces[0].candidates.find(c => c.operationId === "camera-dive")?.reason).toBe("no static fallback under reduced motion");
  });

  it("rejects aspects the grammar or operation does not support, and over-dense shots", () => {
    const narrow = { ...TECHNICAL_DRAFTING, aspects: ["16:9"] as const };
    expect(resolveFilmStyle(narrow, [shot({ shotId: "s1", role: "establish", aspect: "9:16", objective: "establish" })]).diagnostics.map(d => d.code)).toContain("aspect-unsupported");
    const dense = resolveFilmStyle(TECHNICAL_DRAFTING, [shot({ shotId: "s1", role: "establish", objective: "establish", subjectIds: ["a", "b", "c", "d"] })]);
    expect(dense.diagnostics.map(d => d.code)).toContain("density-exceeded");
  });

  it("gives each shipped grammar a different staging, so color-only variants are rejected", () => {
    const recolor = { ...TECHNICAL_DRAFTING, id: "technical-drafting-recolor", visualLanguage: { paletteRole: "warm-paper", typographyRole: "drafting-label", materialRole: "matte-surface" } };
    expect(inspectGrammarDistinctness(TECHNICAL_DRAFTING, recolor).map(d => d.code)).toEqual(["style-not-distinct"]);
    const roles = FILM_STYLE_GRAMMARS.flatMap((a, i) => FILM_STYLE_GRAMMARS.slice(i + 1).flatMap(b => inspectGrammarDistinctness(a, b)));
    expect(roles).toEqual([]);
  });

  it("selects different treatments for process and evidence films on the same roles", () => {
    const roles: ShotRole[] = ["establish", "cause"];
    const available = ["actor", "stage-sequence", "sourced-evidence", "supplied-states", "shared-subject-across-shots", "measured-geometry"];
    const process = resolveFilmStyle(CONNECTED_PROCESS_WORLD, roles.map((role, i) => shot({ shotId: role, role, objective: role === "establish" ? "establish" : "follow", available, startFrame: i * 90, endFrame: i * 90 + 90 })));
    expect(process.selections.map(s => s.operationId)).toEqual(["process-journey", "asset-state-sequence"]);
  });
});

const selection = (over: Partial<FilmShotSelection> & Pick<FilmShotSelection, "shotId" | "operationId">): FilmShotSelection => ({
  role: "investigate", objective: "investigate", module: "", exportName: "", subjectIds: [over.targetId ?? "subject-a"], targetId: "subject-a",
  aspect: "16:9", startFrame: 0, endFrame: 90, attention: "low", concurrentCaptions: 1, rationale: "", ...over,
});

describe("grammar-linked preflight pass", () => {
  it("flags forbidden treatments, purpose mismatch and caption policy with a repair", () => {
    const diagnostics = inspectFilmStyleSelections([
      selection({ shotId: "forbidden", operationId: "mechanism-sequence", role: "cause", objective: "inspect" }),
      selection({ shotId: "purpose", operationId: "evidence-stage", objective: "compare", startFrame: 90, endFrame: 180 }),
      selection({ shotId: "captions", operationId: "exact-value-cascade", objective: "compare", startFrame: 180, endFrame: 270, concurrentCaptions: 3 }),
    ], { ...EVIDENCE_INVESTIGATION, exclusions: { operations: ["mechanism-sequence"] } }, "film");
    const codes = diagnostics.map(d => d.code);
    expect(codes).toEqual(expect.arrayContaining(["film-style-forbidden-treatment", "film-style-purpose-mismatch", "film-style-caption-policy"]));
    expect(diagnostics.every(d => d.message.includes("Repair:") || d.message.includes("Repair"))).toBe(true);
    expect(diagnostics[0].sceneId).toBe("film");
  });

  it("warns on unjustified adjacent repetition and accepts a justified one", () => {
    const pair = (justification?: string) => inspectFilmStyleSelections([
      selection({ shotId: "a", operationId: "evidence-stage" }),
      selection({ shotId: "b", operationId: "evidence-stage", startFrame: 90, endFrame: 180, repeatJustification: justification }),
    ], EVIDENCE_INVESTIGATION, "film");
    expect(pair().map(d => d.code)).toEqual(["film-style-repeated-treatment"]);
    expect(pair("the same source is re-examined at the verdict").filter(d => d.code === "film-style-repeated-treatment")).toEqual([]);
  });

  it("warns when two high-attention treatments target different subjects in the same frames", () => {
    const diagnostics = inspectFilmStyleSelections([
      selection({ shotId: "a", operationId: "camera-dive", attention: "high", targetId: "subject-a", startFrame: 0, endFrame: 120 }),
      selection({ shotId: "b", operationId: "section-reveal", role: "cause", objective: "inspect", attention: "high", targetId: "subject-b", startFrame: 60, endFrame: 150 }),
    ], TECHNICAL_DRAFTING, "film");
    expect(diagnostics.map(d => d.code)).toEqual(["film-style-competing-emphasis"]);
    expect(diagnostics[0].frame).toBe(60);
  });

  it("does not flag high-attention treatments that are sequential", () => {
    const diagnostics = inspectFilmStyleSelections([
      selection({ shotId: "a", operationId: "camera-dive", attention: "high", targetId: "subject-a", startFrame: 0, endFrame: 90 }),
      selection({ shotId: "b", operationId: "section-reveal", role: "cause", objective: "inspect", attention: "high", targetId: "subject-b", startFrame: 90, endFrame: 180 }),
    ], TECHNICAL_DRAFTING, "film");
    expect(diagnostics).toEqual([]);
  });
});
