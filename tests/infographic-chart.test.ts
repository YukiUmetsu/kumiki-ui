import { describe, expect, it } from "vitest";

import {
  CHART_RECIPES,
  chartDomain,
  chartSummary,
  chartTicks,
  chartValueExtent,
  domainTransform,
  isUsableDomain,
  mixHex,
  resolveSeriesValues,
} from "../src/infographic";
import type { ChartRecipe, ChartSeries, ChartSpec, MissingPolicy } from "../src/infographic";

/**
 * Pure chart value, domain and missing-value semantics.
 *
 * These helpers are the *only* place a raw value becomes a plottable number, so
 * the tests pin the honesty rules from docs/12 §8: missing is never zero unless a
 * policy says so and then it is flagged as imputed, a bar's zero baseline is
 * honoured, and a truncated axis is disclosed rather than implied.
 */

const categories = ["A", "B", "C"];

function spec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    recipe: "bar",
    categories: [...categories],
    series: [{ id: "s", label: "Series", values: [1, 2, 3] }],
    ...overrides,
  };
}

describe("chartValueExtent", () => {
  it("collapses an empty series list to a safe extent", () => {
    expect(chartValueExtent([])).toEqual({ min: 0, max: 1, minPositive: null, count: 0, missing: 0 });
  });

  it("counts null and non-finite entries as missing, not zero", () => {
    expect(chartValueExtent([{ id: "s", label: "S", values: [null, null] }])).toEqual({
      min: 0,
      max: 1,
      minPositive: null,
      count: 0,
      missing: 2,
    });

    const extent = chartValueExtent([
      { id: "s", label: "S", values: [1, Number.NaN, Number.POSITIVE_INFINITY] },
    ]);
    expect(extent.count).toBe(1);
    expect(extent.missing).toBe(2);
    expect(extent.min).toBe(1);
    expect(extent.max).toBe(1);
  });

  it("spans negative and positive values and tracks the smallest positive", () => {
    const extent = chartValueExtent([{ id: "s", label: "S", values: [3, -2, 5, 0] }]);
    expect(extent.min).toBe(-2);
    expect(extent.max).toBe(5);
    expect(extent.minPositive).toBe(3);
    expect(extent.count).toBe(4);
  });

  it("handles all-equal values", () => {
    const extent = chartValueExtent([{ id: "s", label: "S", values: [4, 4, 4] }]);
    expect(extent.min).toBe(4);
    expect(extent.max).toBe(4);
    expect(extent.minPositive).toBe(4);
    expect(extent.count).toBe(3);
  });
});

describe("chartDomain", () => {
  it("zero-bases a bar chart by default", () => {
    const domain = chartDomain(spec({ recipe: "bar", series: [{ id: "s", label: "S", values: [4, 6, 8] }] }));
    expect(domain.zero).toBe(true);
    expect(domain.min).toBe(0);
    expect(domain.max).toBe(8);
  });

  it("does not zero-base a line chart by default", () => {
    const domain = chartDomain(spec({ recipe: "line", series: [{ id: "s", label: "S", values: [4, 6, 8] }] }));
    expect(domain.zero).toBe(false);
    expect(domain.min).toBe(4);
  });

  it("lets an authored domain win", () => {
    const domain = chartDomain(spec({ scale: { kind: "linear", zero: false, domain: [10, 20] } }));
    expect(domain.min).toBe(10);
    expect(domain.max).toBe(20);
  });

  it("pads an all-equal non-zero-based domain so the axis stays usable", () => {
    const domain = chartDomain(
      spec({ recipe: "line", series: [{ id: "s", label: "S", values: [4, 4] }] })
    );
    expect(domain.min).toBe(4);
    expect(domain.max).toBeGreaterThan(domain.min);
    expect(isUsableDomain(domain)).toBe(true);
  });

  it("keeps a logarithmic domain positive", () => {
    const domain = chartDomain(
      spec({ recipe: "line", scale: { kind: "log", zero: false }, series: [{ id: "s", label: "S", values: [1, 10, 100] }] })
    );
    expect(domain.kind).toBe("log");
    expect(domain.min).toBeGreaterThan(0);
    expect(isUsableDomain(domain)).toBe(true);
  });

  it("falls back safely for an empty chart", () => {
    const domain = chartDomain(spec({ series: [] }));
    expect(domain.min).toBe(0);
    expect(domain.max).toBe(1);
  });
});

describe("isUsableDomain", () => {
  it("requires a finite, positive-width span", () => {
    expect(isUsableDomain({ min: 0, max: 10, zero: true, kind: "linear" })).toBe(true);
    expect(isUsableDomain({ min: 5, max: 5, zero: false, kind: "linear" })).toBe(false);
    expect(isUsableDomain({ min: 10, max: 0, zero: false, kind: "linear" })).toBe(false);
    expect(isUsableDomain({ min: Number.NaN, max: 10, zero: false, kind: "linear" })).toBe(false);
  });

  it("requires a positive minimum for a logarithmic axis", () => {
    expect(isUsableDomain({ min: 1, max: 10, zero: false, kind: "log" })).toBe(true);
    expect(isUsableDomain({ min: 0, max: 10, zero: false, kind: "log" })).toBe(false);
  });
});

describe("domainTransform", () => {
  it("is the identity for linear axes and log10 for logarithmic ones", () => {
    const linear = domainTransform({ min: 0, max: 10, zero: true, kind: "linear" });
    expect(linear(7)).toBe(7);

    const log = domainTransform({ min: 1, max: 1000, zero: false, kind: "log" });
    expect(log(1000)).toBe(3);
    expect(log(10)).toBe(1);
  });
});

describe("chartTicks", () => {
  it("returns no ticks for an unusable domain", () => {
    expect(chartTicks({ min: 5, max: 5, zero: false, kind: "linear" })).toEqual([]);
    expect(chartTicks({ min: 0, max: 10, zero: false, kind: "log" })).toEqual([]);
  });

  it("produces ascending, human-readable linear ticks spanning the domain", () => {
    const ticks = chartTicks({ min: 0, max: 10, zero: true, kind: "linear" });
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(10);
    for (let index = 1; index < ticks.length; index += 1) {
      expect(ticks[index]).toBeGreaterThan(ticks[index - 1]);
    }
  });

  it("ticks a logarithmic axis at powers of ten", () => {
    const ticks = chartTicks({ min: 1, max: 1000, zero: false, kind: "log" }, 4);
    expect(ticks).toEqual([1, 10, 100, 1000]);
  });
});

describe("resolveSeriesValues", () => {
  const series: ChartSeries = { id: "s", label: "S", values: [1, null, 3] };

  it('keeps a gap null under the default "gap" policy', () => {
    const resolved = resolveSeriesValues(series, categories, "gap");
    expect(resolved.values).toEqual([1, null, 3]);
    expect(resolved.imputed).toEqual([false, false, false]);
    expect(resolved.suppressed).toBe(false);
  });

  it('plots a missing value as zero (imputed) under "zero"', () => {
    const resolved = resolveSeriesValues(series, categories, "zero");
    expect(resolved.values).toEqual([1, 0, 3]);
    expect(resolved.imputed).toEqual([false, true, false]);
  });

  it('linearly interpolates between known neighbours under "interpolate"', () => {
    const resolved = resolveSeriesValues(series, categories, "interpolate");
    expect(resolved.values).toEqual([1, 2, 3]);
    expect(resolved.imputed).toEqual([false, true, false]);
  });

  it("does not invent values outside the reported range when interpolating", () => {
    const leading = resolveSeriesValues({ id: "s", label: "S", values: [null, 2, 4] }, categories, "interpolate");
    expect(leading.values[0]).toBeNull();
    expect(leading.imputed[0]).toBe(false);

    const trailing = resolveSeriesValues({ id: "s", label: "S", values: [2, 4, null] }, categories, "interpolate");
    expect(trailing.values[2]).toBeNull();
    expect(trailing.imputed[2]).toBe(false);
  });

  it('drops the whole series when "suppress" sees any missing value', () => {
    const resolved = resolveSeriesValues(series, categories, "suppress");
    expect(resolved.suppressed).toBe(true);
    expect(resolved.values).toEqual([null, null, null]);
    expect(resolved.imputed).toEqual([false, false, false]);
  });

  it("aligns values to categories by index and truncates the longer side", () => {
    const resolved = resolveSeriesValues(
      { id: "s", label: "S", values: [1, 2, 3, 4] },
      ["A", "B"],
      "gap"
    );
    expect(resolved.values).toEqual([1, 2]);
  });

  it("treats non-finite entries as missing for every policy", () => {
    for (const policy of ["gap", "zero", "interpolate", "suppress"] as MissingPolicy[]) {
      const resolved = resolveSeriesValues(
        { id: "s", label: "S", values: [1, Number.NaN] },
        ["A", "B"],
        policy
      );
      if (policy === "zero") {
        expect(resolved.values).toEqual([1, 0]);
      } else if (policy === "suppress") {
        expect(resolved.suppressed).toBe(true);
      } else {
        expect(resolved.values[1]).toBeNull();
      }
    }
  });
});

describe("chartSummary", () => {
  it("states the recipe, counts, values, missing policy and categories", () => {
    const summary = chartSummary(
      spec({
        recipe: "line",
        categories: ["Q1", "Q2"],
        series: [{ id: "s", label: "Revenue", values: [1, null] }],
        unit: "%",
        sourceNote: "Internal metrics",
      })
    );
    expect(summary).toContain("Line chart: 2 categories, 1 series.");
    expect(summary).toContain("Revenue: 1, missing %.");
    expect(summary).toContain("1 missing value(s)");
    expect(summary).toContain("Categories: Q1, Q2.");
    expect(summary).toContain("Source: Internal metrics");
  });

  it("omits the missing-policy sentence when nothing is missing", () => {
    const summary = chartSummary(
      spec({ categories: ["A", "B"], series: [{ id: "s", label: "S", values: [1, 2] }] })
    );
    expect(summary).not.toContain("missing value(s)");
  });
});

describe("mixHex", () => {
  it("returns the endpoints at t = 0 and t = 1", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
  });

  it("blends the midpoint channel by channel", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("clamps t outside the unit interval", () => {
    expect(mixHex("#000000", "#ffffff", 5)).toBe("#ffffff");
    expect(mixHex("#000000", "#ffffff", -5)).toBe("#000000");
  });

  it("expands three-digit hex", () => {
    expect(mixHex("#fff", "#000", 1)).toBe("#000000");
    expect(mixHex("#fff", "#000", 0)).toBe("#ffffff");
  });

  it("falls back to the source colour when either side is not hex", () => {
    expect(mixHex("var(--km-accent)", "#ffffff", 0.5)).toBe("var(--km-accent)");
    expect(mixHex("#ffffff", "rebeccapurple", 0.5)).toBe("#ffffff");
  });
});

describe("CHART_RECIPES", () => {
  it("is non-empty and lists each documented recipe exactly once", () => {
    expect(CHART_RECIPES.length).toBeGreaterThan(0);
    expect([...CHART_RECIPES].sort()).toEqual(
      ["area", "bar", "donut", "heatmap", "line", "scatter"].sort()
    );
  });

  it("resolves a usable domain for every recipe", () => {
    for (const recipe of CHART_RECIPES as readonly ChartRecipe[]) {
      const domain = chartDomain(
        spec({
          recipe,
          categories: ["A", "B", "C"],
          series: [{ id: "s", label: "S", values: [1, 2, 3] }],
        })
      );
      expect(isUsableDomain(domain), `${recipe} has a usable domain`).toBe(true);
    }
  });
});
