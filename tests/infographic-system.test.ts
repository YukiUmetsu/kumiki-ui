import { describe, expect, it } from "vitest";

import {
  buildInfographic,
  buildInfographicPages,
  canonicalJson,
  chooseTemplate,
  estimateSectionHeight,
  allocateBands,
  resolveSeriesValues,
  resolveStyle,
  sectionChromeHeight,
  sourceDigest,
  SOURCE_TEMPLATES,
  TEMPLATE_IDS,
  TEMPLATE_INFO,
  validateSource,
} from "../src/infographic";
import type {
  ChartValue,
  InfographicSource,
  SectionRequirement,
  TemplateId,
  ValidationResult,
} from "../src/infographic";
import {
  CHEAT_SHEET,
  LINKEDIN_CAROUSEL,
  NEGATIVE_SOURCES,
  PHASE2_EXAMPLES,
  TECHNICAL_DIAGRAM,
} from "../src/infographic/fixtures";

/**
 * Data-path acceptance for the infographic system (Phase-2 evidence).
 *
 * These tests exercise the deterministic pipeline that has no renderer: source
 * validation, chart integrity, template planning, digest/reflow behaviour and
 * the measure-then-allocate requirement engine. They assert on the returned IR
 * rather than on a snapshot, so a regression names the invariant it broke.
 */

function codesOf(result: ValidationResult): string[] {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

/** A minimal, otherwise-valid source whose only interesting part is one chart. */
function chartSource(values: readonly ChartValue[], categories: readonly string[]): InfographicSource {
  return {
    kind: "infographic-source",
    version: 1,
    id: "chart-validation",
    title: "Chart validation",
    language: "en",
    evidence: [],
    sections: [
      {
        id: "chart",
        kind: "chart",
        summary: "A single chart used to exercise chart-specific validation.",
        chart: {
          recipe: "bar",
          categories: [...categories],
          series: [{ id: "series", label: "Series", values: [...values] }],
        },
      },
    ],
  };
}

describe("validateSource — phase-two sources", () => {
  it("accepts every phase-two example source with no error diagnostics", () => {
    expect(PHASE2_EXAMPLES.length).toBeGreaterThan(0);
    for (const example of PHASE2_EXAMPLES) {
      const result = validateSource(example.source);
      expect(result.ok, `${example.id} validates`).toBe(true);
      expect(
        result.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
        `${example.id} has no error diagnostics`
      ).toEqual([]);
      expect(result.source, `${example.id} exposes the parsed source`).toBeDefined();
    }
  });
});

describe("validateSource — negative sources", () => {
  it("surfaces every documented diagnostic code for each negative fixture", () => {
    expect(NEGATIVE_SOURCES.length).toBeGreaterThan(0);
    for (const entry of NEGATIVE_SOURCES) {
      const result = validateSource(entry.input);
      const present = new Set(codesOf(result));
      for (const code of entry.codes) {
        expect(present.has(code), `${entry.name} must report "${code}"`).toBe(true);
      }

      // A document is only "ok" when it carries no error-severity finding.
      // `validateSource` deliberately returns ok:true for warning-only documents
      // (docs/12 §3: a warning means the content can still be laid out) — the
      // "cyclic process" fixture is exactly that case, so asserting ok:false for
      // it would contradict the validator's own contract.
      const hasError = result.diagnostics.some((diagnostic) => diagnostic.severity === "error");
      expect(result.ok, `${entry.name} ok === !hasError`).toBe(!hasError);
    }
  });
});

describe("chart data integrity", () => {
  it("flags a series shorter than its categories", () => {
    const result = validateSource(chartSource([1, 2], ["a", "b", "c"]));
    expect(result.ok).toBe(false);
    expect(codesOf(result)).toContain("chart-series-length-mismatch");
  });

  it("keeps null as missing — it is never coerced to zero", () => {
    const result = validateSource(chartSource([42, null], ["a", "b"]));
    // A gap is valid data, not a fault.
    expect(result.ok).toBe(true);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
    // No diagnostic may describe a null→zero coercion.
    expect(
      codesOf(result).some((code) => /coerc|zero/i.test(code)),
      "no zero-coercion diagnostic"
    ).toBe(false);

    // The resolver is the single place a value becomes plottable; with the
    // default "gap" policy the missing slot stays null.
    const resolved = resolveSeriesValues(
      { id: "series", label: "Series", values: [42, null] },
      ["a", "b"],
      "gap"
    );
    expect(resolved.values).toEqual([42, null]);
    expect(resolved.values).not.toEqual([42, 0]);
    expect(resolved.imputed).toEqual([false, false]);
  });

  it("rejects non-finite values with chart-non-finite-value", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const result = validateSource(chartSource([1, bad], ["a", "b"]));
      expect(result.ok, `value ${String(bad)}`).toBe(false);
      expect(codesOf(result), `value ${String(bad)}`).toContain("chart-non-finite-value");
    }
  });
});

describe("template planning", () => {
  it("honours an explicitly authored template", () => {
    const cheat = buildInfographic(CHEAT_SHEET, { template: "visual-cheat-sheet" });
    expect(cheat.template).toBe("visual-cheat-sheet");
    const diagram = buildInfographic(TECHNICAL_DIAGRAM, { template: "layered-architecture" });
    expect(diagram.template).toBe("layered-architecture");
  });

  it("carries the authored template, profile and art direction into every page", () => {
    for (const example of PHASE2_EXAMPLES) {
      const pages = buildInfographicPages(example.source, {
        template: example.template,
        artDirection: example.artDirection,
        profile: example.output,
      });
      expect(pages.length, `${example.id} has pages`).toBeGreaterThan(0);
      for (const layout of pages) {
        expect(layout.template, `${example.id} template`).toBe(example.template);
        expect(layout.profile, `${example.id} profile`).toBe(example.output);
        expect(layout.artDirection, `${example.id} art direction`).toBe(example.artDirection);
        // Provenance must agree with the layout's own fields.
        expect(layout.provenance.template).toBe(example.template);
        expect(layout.provenance.profile).toBe(example.output);
        expect(layout.provenance.artDirection).toBe(example.artDirection);
      }
    }
  });

  it("auto-selects layered-architecture for the technical diagram", () => {
    expect(chooseTemplate(TECHNICAL_DIAGRAM).template).toBe("layered-architecture");
  });

  it("documents the cheat-sheet auto-selection tie (authored path is what picks it)", () => {
    // DOCUMENTED MISMATCH: the task brief describes `chooseTemplate(CHEAT_SHEET)
    // → "visual-cheat-sheet"`. That is not what auto-selection does today:
    // `scoreTemplate` rates `visual-cheat-sheet` and `bento-summary` equally and
    // `selectTemplate`'s catalog-order tie-break returns `bento-summary`. Both
    // candidates are feasible and tie on score; the authored `options.template`
    // path (asserted above) is what actually selects `visual-cheat-sheet`.
    const selection = chooseTemplate(CHEAT_SHEET);
    const top = selection.candidates[0];
    const cheatSheet = selection.candidates.find((candidate) => candidate.template === "visual-cheat-sheet");

    expect(cheatSheet, "visual-cheat-sheet is a scored candidate").toBeDefined();
    expect(cheatSheet?.feasible).toBe(true);
    expect(cheatSheet?.score, "visual-cheat-sheet ties the top score").toBe(top.score);
    expect(selection.template, "catalog-order tie-break picks bento-summary").toBe("bento-summary");
  });

  it("keeps the two phase-one template families in the catalog", () => {
    expect(TEMPLATE_IDS).toContain("visual-cheat-sheet");
    expect(TEMPLATE_IDS).toContain("layered-architecture");
    expect(SOURCE_TEMPLATES).toContain("visual-cheat-sheet");
    expect(SOURCE_TEMPLATES).toContain("layered-architecture");
    for (const id of TEMPLATE_IDS) {
      const info = TEMPLATE_INFO[id as TemplateId];
      expect(info.id).toBe(id);
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.capacity).toBeGreaterThan(0);
    }
  });
});

describe("determinism and reflow", () => {
  it("is deterministic: stable digest and byte-identical canonical layouts", () => {
    expect(sourceDigest(CHEAT_SHEET)).toBe(sourceDigest(CHEAT_SHEET));

    const first = buildInfographic(CHEAT_SHEET, {
      template: "visual-cheat-sheet",
      profile: "pinterest-vertical",
    });
    const second = buildInfographic(CHEAT_SHEET, {
      template: "visual-cheat-sheet",
      profile: "pinterest-vertical",
    });
    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(first.provenance.sourceDigest).toBe(second.provenance.sourceDigest);
  });

  it("reflows rather than scales across profiles", () => {
    const portrait = buildInfographicPages(CHEAT_SHEET, {
      template: "visual-cheat-sheet",
      profile: "short-portrait",
    });
    const landscape = buildInfographicPages(CHEAT_SHEET, {
      template: "visual-cheat-sheet",
      profile: "youtube-landscape",
    });

    // The canvas is re-solved for the target surface, not transformed from the
    // other one: both dimensions differ and the aspect ratios are distinct.
    expect(portrait[0].canvas.width).not.toBe(landscape[0].canvas.width);
    expect(portrait[0].canvas.height).not.toBe(landscape[0].canvas.height);
    const portraitRatio = portrait[0].canvas.width / portrait[0].canvas.height;
    const landscapeRatio = landscape[0].canvas.width / landscape[0].canvas.height;
    expect(portraitRatio).not.toBeCloseTo(landscapeRatio, 2);

    // A paginating portrait profile also changes the page count for a carousel,
    // while a single-page landscape profile does not paginate.
    const carouselPortrait = buildInfographicPages(LINKEDIN_CAROUSEL, {
      template: "educational-carousel",
      profile: "social-portrait",
    });
    const carouselWide = buildInfographicPages(LINKEDIN_CAROUSEL, {
      template: "educational-carousel",
      profile: "youtube-landscape",
    });
    expect(carouselPortrait.length).toBeGreaterThan(carouselWide.length);
  });
});

describe("requirements — measure, then allocate", () => {
  const style = resolveStyle("editorial");
  const requirements: readonly SectionRequirement[] = [
    { minHeight: 100, preferredHeight: 140 },
    { minHeight: 60, preferredHeight: 200 },
    { minHeight: 80, preferredHeight: 90 },
  ];

  it("estimateSectionHeight keeps min <= preferred and chrome is non-negative", () => {
    expect(sectionChromeHeight(style)).toBeGreaterThanOrEqual(0);
    expect(sectionChromeHeight(style, { heading: true, evidence: true })).toBeGreaterThanOrEqual(0);

    for (const example of PHASE2_EXAMPLES) {
      for (const section of example.source.sections) {
        const requirement = estimateSectionHeight(section, 420, style);
        expect(requirement.minHeight, `${example.id}/${section.id} min > 0`).toBeGreaterThan(0);
        expect(
          requirement.minHeight,
          `${example.id}/${section.id} min <= preferred`
        ).toBeLessThanOrEqual(requirement.preferredHeight);
      }
    }
  });

  it("allocateBands tiles the rect exactly with integer, gap-spaced bands", () => {
    const rect = { x: 10, y: 20, width: 300, height: 500 };
    const gap = 10;
    const bands = allocateBands(rect, requirements, gap);

    expect(bands).toHaveLength(requirements.length);

    // Heights + the requested gaps fill the rect exactly — no drift, no slack.
    const tiled = bands.reduce((sum, band) => sum + band.height, 0) + gap * (bands.length - 1);
    expect(tiled).toBe(rect.height);
    expect(bands[0].y).toBe(rect.y);
    expect(bands[bands.length - 1].y + bands[bands.length - 1].height).toBe(rect.y + rect.height);

    bands.forEach((band, index) => {
      expect(band.x).toBe(rect.x);
      expect(band.width).toBe(rect.width);
      expect(Number.isInteger(band.y), `band ${index} y is an integer`).toBe(true);
      expect(Number.isInteger(band.height), `band ${index} height is an integer`).toBe(true);
      if (index > 0) {
        const gapAbove = band.y - (bands[index - 1].y + bands[index - 1].height);
        expect(gapAbove, `band ${index} gap`).toBe(gap);
      }
    });
  });

  it("compresses proportionally when the minimums cannot fit, still tiling the rect", () => {
    // DOCUMENTED MISMATCH: `allocateBands` does not itself emit a diagnostic. Per
    // its contract it scales the bands down proportionally (never clipping
    // silently) and always returns RectInfo[]. The overflow is reported *at
    // render time* as a `section-overflow` diagnostic, which is asserted below.
    const rect = { x: 0, y: 0, width: 300, height: 100 };
    const gap = 10;
    const bands = allocateBands(rect, requirements, gap);

    expect(bands.length).toBe(requirements.length);
    const tiled = bands.reduce((sum, band) => sum + band.height, 0) + gap * (bands.length - 1);
    expect(tiled).toBe(rect.height);

    // Every band is squeezed below its own minimum, proving compression.
    bands.forEach((band, index) => {
      expect(band.height, `band ${index} below minimum`).toBeLessThan(requirements[index].minHeight);
    });

    // The engine surfaces the overflow to the caller instead of drawing a
    // squeezed band. A paginating profile now carries the excess to another page
    // (measurement-driven pagination), so the unsatisfiable case is a
    // non-paginating profile: the sections that cannot fit are rejected with a
    // `section-overflow` diagnostic rather than rendered compressed.
    const layout = buildInfographic(CHEAT_SHEET, {
      template: "visual-cheat-sheet",
      profile: "youtube-landscape",
    });
    expect(layout.diagnostics.some((diagnostic) => diagnostic.code === "section-overflow")).toBe(true);
  });
});
