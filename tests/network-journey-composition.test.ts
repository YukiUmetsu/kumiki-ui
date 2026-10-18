import { expect, it } from "vitest";
import { createJourneyProduction } from "../src/network-journey/journey-production";
import { DEFAULT_JOURNEY, journeyChapterAt } from "../src/network-journey/journey-content";
import { planExplainerLayout } from "../registry/visual/explainer-layout";
import { journeyExplanation } from "../src/network-journey/journey-composition";

it("protects actual scene subjects and enforces trajectory-based tracking in both aspects", () => {
  for (const aspect of ["landscape", "portrait"] as const) {
    const film = createJourneyProduction(aspect, DEFAULT_JOURNEY);
    if (!film.composition) throw new Error("Expected guarded production composition");
    expect(film.composition.contract.criticalSubjects!.length).toBeGreaterThan(5);
    expect(film.composition.contract.tracking).toHaveLength(1);
    expect(film.composition.guardDiagnostics).toEqual([]);
    const follow = film.camera.shots.find(shot => shot.id === "approach-service")!;
    expect(follow.startFrame).toBeLessThanOrEqual(film.composition.tracking.startFrame);
    expect(follow.endFrame).toBeGreaterThanOrEqual(film.composition.tracking.endFrame);
    const failures: number[] = [];
    for (const [frame, subjects] of film.composition.subjectsByFrame.entries()) {
      if (!subjects.length) continue;
      const viewport = aspect === "portrait" ? { width: 390, height: 390 * 16 / 9 } : { width: 1100, height: 1100 * 9 / 16 };
      const result = planExplainerLayout({ viewport, subjects, protect: subjects.map(subject => subject.id),
        text: journeyExplanation(journeyChapterAt(frame).id, frame, DEFAULT_JOURNEY),
        font: "18px sans-serif", fontSizePx: 18, lineHeightPx: 25.2, gapPx: 16 }, (_font, value) => Array.from(value).length * 9);
      if (!result.ok) failures.push(frame);
    }
    expect(failures, `${aspect} has unplaceable captions at ${failures.slice(0, 20).join(", ")}`).toEqual([]);
    for (const frame of [207, 710, 892, 1265, 1405, 1448, 1515, 1915, 2340, 2360]) {
      const subjects = film.composition.subjectsByFrame[frame];
      expect(subjects.length).toBeGreaterThan(0);
      const text = journeyExplanation(journeyChapterAt(frame).id, frame, DEFAULT_JOURNEY);
      const viewport = aspect === "portrait" ? { width: 390, height: 390 * 16 / 9 } : { width: 1100, height: 1100 * 9 / 16 };
      const result = planExplainerLayout({ viewport, subjects, protect: subjects.map(subject => subject.id), text,
        font: "18px sans-serif", fontSizePx: 18, lineHeightPx: 25.2, gapPx: 16 }, (_font, value) => Array.from(value).length * 9);
      expect(result, `${aspect} at ${frame}`).toMatchObject({ ok: true });
    }
  }
}, 90_000);


it.each([
  ["portrait", { latencyMs: 600, recipientOnline: false, protection: "end-to-end", selectedRouter: "router-c" }],
  ["landscape", { latencyMs: 40, cachedDns: true, selectedRouter: "router-e" }],
] as const)("retains camera contracts for %s scenario changes", (aspect, changes) => {
  const film = createJourneyProduction(aspect, { ...DEFAULT_JOURNEY, ...changes });
  expect(film.composition?.guardDiagnostics).toEqual([]);
  expect(film.composition?.subjectsByFrame[2360].map(subject => subject.id)).toContain("hero-packet");
}, 60_000);
