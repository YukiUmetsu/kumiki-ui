import { describe, expect, it } from "vitest";
import { validateVisualProduction } from "../registry/visual/production-contract";
import { NETWORK_JOURNEY_CONTRACT } from "../src/network-journey/journey-contract";

describe("low-cost semantic visual production contract", () => {
  it("accepts a complete story with concrete learning outcomes and an ending", () => {
    const result = validateVisualProduction(NETWORK_JOURNEY_CONTRACT);
    expect(result).toEqual({ ok: true, issues: [] });
  });
  it("rejects missing actions, broken timeline, and an ungrounded recap", () => {
    const result = validateVisualProduction({
      ...NETWORK_JOURNEY_CONTRACT,
      shots: NETWORK_JOURNEY_CONTRACT.shots.map((shot, index) =>
        index === 0 ? { ...shot, actions: [], endFrame: shot.endFrame - 5 } :
        index === 7 ? { ...shot, outcomeIds: ["missing"] } : shot),
      closingOutcomeIds: ["missing"],
    });
    expect(result.ok).toBe(false);
    const codes = result.issues.map(issue => issue.code);
    expect(codes).toContain("missing-action");
    expect(codes).toContain("timeline-gap");
    expect(codes).toContain("missing-outcome");
    expect(codes).toContain("missing-closing-summary");
  });
});
