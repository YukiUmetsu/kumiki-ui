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
import { resolveStyle } from "../registry/infographic/art-direction";
import {
  chartCompareLabel, chartMarkBox, chartStoryPrimitives, chartValueLabel, checkChartClaim, evaluateChartStory, layoutChartStory, validateChartStory,
} from "../registry/infographic/chart-story";
import type { ChartStoryBeat, ChartStorySpec } from "../registry/infographic/chart-story";
import { inspectSeekParity } from "../registry/visual/explainer-principles";

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

describe("ChartStory", () => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const chart = (recipe: ChartRecipe, ungrouped: number[]): ChartSpec => ({
    recipe, categories: months, unit: "u/h", scale: { kind: "linear", zero: true },
    series: [{ id: "low", label: "Low", values: ungrouped }, { id: "high", label: "High", values: [18, 19, 21, 22, 24, 26] }],
  });
  const story = (recipe: ChartRecipe = "line"): ChartStorySpec => ({
    id: "t", fps: { num: 30, den: 1 }, title: "T", initialScenarioId: "a",
    scenarios: [{ id: "a", label: "A", spec: chart(recipe, [17, 17, 18, 17, 18, 18]) }, { id: "b", label: "B", spec: chart(recipe, [17, 18, 20, 21, 23, 40]) }],
    beats: [
      { id: "axes", kind: "establish", durationFrames: 30 },
      { id: "low", kind: "reveal", seriesIds: ["low"], durationFrames: 30 },
      { id: "high", kind: "reveal", seriesIds: ["high"], durationFrames: 30 },
      { id: "june", kind: "focus", seriesId: "high", index: 5, durationFrames: 40 },
      { id: "growth", kind: "compare", seriesId: "high", from: 0, to: 5, measure: "percent-change", durationFrames: 40 },
      { id: "what-if", kind: "scenario", scenarioId: "b", durationFrames: 40 },
      { id: "back", kind: "scenario", scenarioId: "a", durationFrames: 40 },
      { id: "claim", kind: "conclude", durationFrames: 60, claim: { text: "High grew 44%.", support: { kind: "percent-change", seriesId: "high", from: 0, to: 5, value: 44 } } },
    ],
  });
  const box = { x: 40, y: 200, width: 1000, height: 1200 };
  const style = resolveStyle("editorial");
  const codes = (s: ChartStorySpec) => validateChartStory(s, layoutChartStory(s, box, style)).filter(d => d.severity === "error").map(d => d.code);

  it("keeps one value domain and the same axis geometry across scenarios", () => {
    const s = story(), layout = layoutChartStory(s, box, style);
    expect(layout.domain.max).toBeGreaterThanOrEqual(40);
    const axis = (id: string) => layout.scenarios[id].primitives.filter(p => p.role?.startsWith("chart-tick") || p.role === "chart-baseline").map(p => JSON.stringify({ ...p, id: "" }));
    expect(axis("b")).toEqual(axis("a"));
    expect(codes(s)).toEqual([]);
  });

  it("checks claims against the data and refuses unsupported or truncated stories", () => {
    const s = story();
    expect(checkChartClaim(s, { text: "", support: { kind: "percent-change", seriesId: "high", from: 0, to: 5, value: 44 } })).toMatchObject({ ok: true });
    expect(checkChartClaim(s, { text: "", support: { kind: "percent-change", seriesId: "high", from: 0, to: 5, value: 60 } }).ok).toBe(false);
    expect(checkChartClaim(s, { text: "", support: { kind: "max", seriesId: "high", index: 5 } }).ok).toBe(true);
    expect(checkChartClaim(s, { text: "", support: { kind: "min", seriesId: "high", index: 5 } }).ok).toBe(false);
    expect(checkChartClaim(s, { text: "", scenarioId: "b", support: { kind: "value", seriesId: "low", index: 5, value: 40 } }).ok).toBe(true);
    const overclaim = { ...s, beats: s.beats.map(b => b.kind === "conclude" ? { ...b, claim: { ...b.claim, support: { ...b.claim.support, value: 60 } } } as ChartStoryBeat : b) };
    expect(codes(overclaim)).toContain("chart-story-claim-unsupported");
    const bars = story("bar"), truncated = { ...bars, scenarios: bars.scenarios.map(x => ({ ...x, spec: { ...x.spec, scale: { kind: "linear" as const, zero: false } } })) };
    expect(codes(truncated)).toContain("chart-story-truncated-bars");
    expect(codes({ ...s, beats: s.beats.map(b => b.kind === "focus" ? { ...b, index: 9 } : b) })).toContain("chart-story-index-invalid");
    const missing = { ...s, scenarios: s.scenarios.map(x => ({ ...x, spec: { ...x.spec, series: x.spec.series.map(y => y.id === "high" ? { ...y, values: [18, 19, 21, 22, 24, null] } : y) } })) };
    expect(codes(missing)).toContain("chart-story-focus-missing");
    const mismatch = { ...s, scenarios: [s.scenarios[0], { ...s.scenarios[1], spec: { ...s.scenarios[1].spec, unit: "u/day" } }] };
    expect(codes(mismatch)).toContain("chart-story-unit-mismatch");
  });

  it("addresses marks by data identity, morphs geometry and never shows invented numbers", () => {
    for (const recipe of ["line", "bar"] as const) {
      const s = story(recipe), layout = layoutChartStory(s, box, style);
      expect(chartMarkBox(layout, "a", "high", 5)).toBeDefined();
      // Mid-morph into "what-if": geometry moves, value labels are only the endpoints' real texts.
      const mid = evaluateChartStory(s, 30 + 30 + 30 + 40 + 40 + 12);
      expect(mid.scenarioId).toBe("b");
      expect(mid.morph).toBeGreaterThan(0);
      expect(mid.morph).toBeLessThan(1);
      const real = new Set(["a", "b"].flatMap(id => layout.scenarios[id].primitives.flatMap(p => p.kind === "text" ? [p.lines.join("\n")] : [])));
      const prims = chartStoryPrimitives(layout, mid);
      for (const p of prims) if (p.kind === "text") expect(real.has(p.lines.join("\n"))).toBe(true);
      const moved = prims.find(p => p.semanticId === "low:5" && p.role === "chart-mark");
      const [from, to] = ["a", "b"].map(id => chartMarkBox(layout, id, "low", 5)!);
      const box5 = moved?.kind === "path" ? undefined : moved as { y: number } | undefined;
      if (box5) { expect(box5.y).toBeLessThan(from.y); expect(box5.y).toBeGreaterThan(to.y); }
      expect(prims.some(p => p.semanticId === "low:5" && p.id.endsWith("~from"))).toBe(false);
    }
  });

  it("hides series before their reveal, emphasizes the focus point, and seeks exactly", () => {
    const s = story(), layout = layoutChartStory(s, box, style);
    const at = (f: number) => chartStoryPrimitives(layout, evaluateChartStory(s, f));
    const opacity = (f: number, semanticId: string, role: string) => at(f).find(p => p.semanticId === semanticId && p.role === role)?.opacity ?? 1;
    expect(opacity(10, "high", "chart-mark-line")).toBe(0);
    expect(opacity(10, "high", "chart-legend-label")).toBe(0);
    expect(opacity(85, "high", "chart-mark-line")).toBe(1);
    const focus = evaluateChartStory(s, 120);
    expect(focus.focus).toMatchObject({ seriesId: "high", index: 5 });
    expect(opacity(120, "high:5:value", "chart-value-label")).toBeLessThan(0.2);
    expect(opacity(120, "low:2:value", "chart-value-label")).toBeLessThan(0.5);
    expect(chartValueLabel(s.scenarios[0].spec, "high", 5)).toBe("26 u/h");
    expect(chartCompareLabel(s.scenarios[0].spec, "high", 0, 5, "percent-change")).toBe("+44.4% vs Jan");
    expect(evaluateChartStory(s, 300).claim).toBeDefined();
    expect(inspectSeekParity(() => f => chartStoryPrimitives(layout, evaluateChartStory(s, f)).map(p => [p.id, p.opacity ?? 1]), { durationFrames: 310, sampleCount: 50, seed: 3 }).ok).toBe(true);
  });
});
