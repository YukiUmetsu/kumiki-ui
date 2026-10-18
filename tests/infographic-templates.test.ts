import { describe, expect, it } from "vitest";

import {
  frameFor,
  getOutputProfile,
  insetRect,
  planTemplate,
  resolveStyle,
  safeInset,
  scoreTemplate,
  selectTemplate,
  TEMPLATE_IDS,
  TEMPLATE_INFO,
} from "../src/infographic";
import type {
  ArtDirectionId,
  InfographicCanvasSpec,
  InfographicSection,
  OutputProfileId,
  TemplateContext,
} from "../src/infographic";
import { RAG_EXPLAINER, TECHNICAL_DIAGRAM } from "../src/infographic/fixtures";

/**
 * Template catalog, scoring/selection and measurement-driven planning.
 *
 * A template is a layout *policy*: it scores how well the content shape fits,
 * explains the ranking with named violations, and turns the winner into frames.
 * The tests assert the policy is explainable and reproducible, and that a plan's
 * geometry is a reflow (different frames per surface) rather than a scale.
 */

/* ---------------------------------------------------------------- fixtures */

function textSection(id: string): InfographicSection {
  return { kind: "text", id, summary: `${id} summary`, paragraphs: ["Some prose to lay out."] };
}

function chartSection(id: string): InfographicSection {
  return {
    kind: "chart",
    id,
    summary: `${id} summary`,
    chart: {
      recipe: "bar",
      categories: ["A", "B"],
      series: [{ id: `${id}-series`, label: "Series", values: [1, 2] }],
    },
  };
}

function processSection(id: string, steps = 3): InfographicSection {
  return {
    kind: "process",
    id,
    summary: `${id} summary`,
    steps: Array.from({ length: steps }, (_, index) => ({
      id: `${id}-step-${index + 1}`,
      title: `Step ${index + 1}`,
    })),
  };
}

function diagramSection(id: string): InfographicSection {
  return {
    kind: "diagram",
    id,
    summary: `${id} summary`,
    diagram: { nodes: [{ id: `${id}-node`, label: "Node" }], edges: [] },
  };
}

function hierarchySection(id: string): InfographicSection {
  return { kind: "hierarchy", id, summary: `${id} summary`, root: { id: `${id}-root`, label: "Root" } };
}

function templateContext(
  sections: readonly InfographicSection[],
  profile: OutputProfileId = "youtube-landscape",
  artDirection: ArtDirectionId = "editorial"
): TemplateContext {
  const style = resolveStyle(artDirection);
  const output = getOutputProfile(profile);
  const canvas: InfographicCanvasSpec = {
    width: output.width,
    height: output.height,
    profile: output.id,
    background: style.color.canvas,
    safeRegion: safeInset(output),
  };
  const safe = insetRect({ x: 0, y: 0, width: canvas.width, height: canvas.height }, canvas.safeRegion);
  return { style, canvas, safe, sections };
}

function within(frame: { x: number; y: number; width: number; height: number }, region: { x: number; y: number; width: number; height: number }): boolean {
  const eps = 1;
  return (
    frame.x >= region.x - eps &&
    frame.y >= region.y - eps &&
    frame.x + frame.width <= region.x + region.width + eps &&
    frame.y + frame.height <= region.y + region.height + eps
  );
}

/* ----------------------------------------------------------------- catalog */

describe("TEMPLATE_IDS / TEMPLATE_INFO", () => {
  it("lists every catalogued template with usable metadata", () => {
    expect(TEMPLATE_IDS.length).toBeGreaterThan(0);
    expect([...TEMPLATE_IDS].sort()).toEqual(Object.keys(TEMPLATE_INFO).sort());
    for (const id of TEMPLATE_IDS) {
      const info = TEMPLATE_INFO[id];
      expect(info.id).toBe(id);
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.description.length).toBeGreaterThan(0);
      expect(info.prefers.length).toBeGreaterThan(0);
      expect(info.capacity).toBeGreaterThan(0);
    }
  });
});

/* ----------------------------------------------------------------- scoring */

describe("scoreTemplate", () => {
  it("marks process-journey infeasible with a named violation when no process exists", () => {
    const score = scoreTemplate("process-journey", templateContext([textSection("t")]));
    expect(score.feasible).toBe(false);
    expect(score.score).toBe(0.1);
    expect(score.violations.map((violation) => violation.code)).toContain("template-requires-process");
  });

  it("requires at least two process steps", () => {
    const single = scoreTemplate("process-journey", templateContext([processSection("p", 1)]));
    expect(single.feasible).toBe(false);
    expect(single.violations.some((violation) => violation.sectionId === "p")).toBe(true);

    const journey = scoreTemplate("process-journey", templateContext([processSection("p", 3)]));
    expect(journey.feasible).toBe(true);
    expect(journey.score).toBeGreaterThan(0.4);
  });

  it("requires exactly one chart section for data-story", () => {
    expect(scoreTemplate("data-story", templateContext([textSection("t")])).feasible).toBe(false);
    expect(scoreTemplate("data-story", templateContext([chartSection("c1"), chartSection("c2")])).feasible).toBe(false);
    expect(scoreTemplate("data-story", templateContext([chartSection("c1"), textSection("t")])).feasible).toBe(true);
  });

  it("requires a diagram or hierarchy for layered-architecture", () => {
    const none = scoreTemplate("layered-architecture", templateContext([textSection("t")]));
    expect(none.feasible).toBe(false);
    expect(none.violations.map((violation) => violation.code)).toContain("template-requires-layers");

    expect(scoreTemplate("layered-architecture", templateContext([diagramSection("d")])).feasible).toBe(true);
    expect(scoreTemplate("layered-architecture", templateContext([hierarchySection("h")])).feasible).toBe(true);
  });

  it("keeps every score inside [0, 1] and is deterministic", () => {
    const context = templateContext([
      textSection("t1"),
      chartSection("c1"),
      diagramSection("d1"),
      processSection("p1"),
    ]);
    for (const template of TEMPLATE_IDS) {
      const score = scoreTemplate(template, context);
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
      expect(scoreTemplate(template, context)).toEqual(score);
    }
  });
});

/* --------------------------------------------------------------- selection */

describe("selectTemplate", () => {
  it("ranks feasible candidates first, best score first, and returns the top one", () => {
    const selection = selectTemplate(templateContext(TECHNICAL_DIAGRAM.sections));
    expect(selection.candidates.length).toBe(TEMPLATE_IDS.length);
    expect(selection.candidates[0].template).toBe(selection.template);
    for (let index = 1; index < selection.candidates.length; index += 1) {
      const previous = selection.candidates[index - 1];
      const current = selection.candidates[index];
      if (previous.feasible !== current.feasible) {
        expect(previous.feasible).toBe(true);
      } else {
        expect(previous.score).toBeGreaterThanOrEqual(current.score);
      }
    }
  });

  it("auto-selects layered-architecture for the technical diagram source", () => {
    expect(selectTemplate(templateContext(TECHNICAL_DIAGRAM.sections)).template).toBe("layered-architecture");
  });

  it("honours a caller-supplied shortlist", () => {
    const context = templateContext([chartSection("c1")]);
    const selection = selectTemplate(context, { candidates: ["bento-summary", "data-story"] });
    expect(["bento-summary", "data-story"]).toContain(selection.template);
    expect(selection.candidates).toHaveLength(2);
  });

  it("is deterministic for the same content", () => {
    const context = templateContext([chartSection("c1"), textSection("t1")]);
    const first = selectTemplate(context);
    const second = selectTemplate(context);
    expect(second.template).toBe(first.template);
    expect(second.candidates).toEqual(first.candidates);
  });
});

/* --------------------------------------------------------------- planning */

describe("planTemplate", () => {
  const context16 = templateContext(TECHNICAL_DIAGRAM.sections, "youtube-landscape");
  const context23 = templateContext(TECHNICAL_DIAGRAM.sections, "pinterest-vertical");

  it("is deterministic: the same context always produces the same frames", () => {
    const first = planTemplate("layered-architecture", context16);
    const second = planTemplate("layered-architecture", context16);
    expect(JSON.stringify(second.frames)).toBe(JSON.stringify(first.frames));
    expect(second.pages).toBe(first.pages);
  });

  it("places every frame inside the safe region on a 16:9 profile", () => {
    const plan = planTemplate("layered-architecture", context16);
    expect(plan.pages).toBeGreaterThanOrEqual(1);
    expect(plan.frames.length).toBeGreaterThan(0);
    for (const frame of plan.frames) {
      expect(within(frame.frame, context16.safe), `${frame.sectionId} inside safe`).toBe(true);
      expect(frame.frame.width).toBeGreaterThan(0);
      expect(frame.frame.height).toBeGreaterThan(0);
    }
  });

  it("places every frame inside the safe region on a 2:3 profile", () => {
    const plan = planTemplate("layered-architecture", context23);
    expect(plan.frames.length).toBeGreaterThan(0);
    for (const frame of plan.frames) {
      expect(within(frame.frame, context23.safe), `${frame.sectionId} inside safe`).toBe(true);
    }
  });

  it("reflows rather than scales the same slot between 16:9 and 2:3", () => {
    // `editorial-overview` places the lead claim on page 1 of both surfaces, so
    // the same semantic slot can be compared across the two aspect ratios.
    const plan16 = planTemplate(
      "editorial-overview",
      templateContext(RAG_EXPLAINER.sections, "youtube-landscape")
    );
    const plan23 = planTemplate(
      "editorial-overview",
      templateContext(RAG_EXPLAINER.sections, "pinterest-vertical")
    );
    const frame16 = frameFor(plan16, "question", 1);
    const frame23 = frameFor(plan23, "question", 1);

    expect(frame16, "lead slot on 16:9").toBeDefined();
    expect(frame23, "lead slot on 2:3").toBeDefined();
    expect(frame16?.slot).toBe("lead");
    expect(frame23?.slot).toBe("lead");
    // Both dimensions change, which is a reflow — not a uniform scale of one canvas.
    expect(frame16?.frame.width).not.toBe(frame23?.frame.width);
    expect(frame16?.frame.height).not.toBe(frame23?.frame.height);
  });

  it("DOCUMENTS a behaviour note: a non-paginating 16:9 page rejects long section stacks", () => {
    // On the single-page youtube-landscape profile, `layered-architecture` cannot
    // fit the whole source at its measured minimums, so `planTemplate` keeps only
    // a prefix and rejects the rest with an actionable reason rather than
    // compressing them (docs/12 §5). The rejected set happens to include the focal
    // diagram (`td-layers`) because the builder emits supporting notes before the
    // focal section while the planner keeps a prefix of source order. Reported,
    // not fixed (tests-only task).
    const plan = planTemplate(
      "layered-architecture",
      templateContext(TECHNICAL_DIAGRAM.sections, "youtube-landscape")
    );
    expect(plan.pages).toBe(1);
    expect(plan.rejected.length).toBeGreaterThan(0);
    for (const entry of plan.rejected) {
      expect(entry.message.length).toBeGreaterThan(0);
      expect(plan.unplaced).toContain(entry.sectionId);
    }
    expect(plan.rejected.map((entry) => entry.sectionId)).toContain("td-layers");
  });

  it("filters frames by page and returns undefined for unknown sections", () => {
    const plan = planTemplate("layered-architecture", context23);
    const firstPage = frameFor(plan, "td-layers", 1) ?? frameFor(plan, "td-layers", plan.frames[0].page);
    expect(firstPage).toBeDefined();
    expect(firstPage?.sectionId).toBe("td-layers");
    expect(frameFor(plan, "does-not-exist")).toBeUndefined();
  });

  it("reports the sections it could not place instead of dropping them silently", () => {
    // A single-page, tiny landscape profile cannot hold five sections at their
    // measured minimums, so the planner rejects the tail with a reason.
    const crowded = templateContext(
      [
        textSection("s1"),
        textSection("s2"),
        textSection("s3"),
        textSection("s4"),
        textSection("s5"),
        textSection("s6"),
        textSection("s7"),
      ],
      "article-inline"
    );
    const plan = planTemplate("layered-architecture", crowded);
    // Whatever it decides, every planned section is accounted for: placed, unplaced or rejected.
    const placed = new Set(plan.frames.map((frame) => frame.sectionId));
    for (const section of crowded.sections) {
      const accounted =
        placed.has(section.id) ||
        plan.unplaced.includes(section.id) ||
        plan.rejected.some((entry) => entry.sectionId === section.id);
      expect(accounted, `${section.id} is accounted for`).toBe(true);
    }
  });
});
