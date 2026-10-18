import { describe, expect, it } from "vitest";

import {
  baselineOffset,
  blockHeight,
  formatMilestoneLabel,
  formatNumber,
  formatPercent,
  formatSigned,
  hasTemporalScale,
  lineMetrics,
  measureText,
  milestoneSortKey,
  wrapText,
} from "../src/infographic";

/**
 * Deterministic measurement and locale-aware formatting.
 *
 * The engine lays text out before the IR exists, so width comes from a
 * documented per-character advance model rather than real font metrics. These
 * tests pin that model, the line-breaking guarantees (a word never overflows its
 * measure; `maxLines` truncates with an ellipsis and reports it) and the
 * formatting helpers that must round presentation without changing the value.
 */

describe("measureText", () => {
  it("sums the per-character advance model", () => {
    expect(measureText("AB", { fontSize: 10, family: "sans" })).toBeCloseTo(13.6, 6);
    expect(measureText("1", { fontSize: 10, family: "sans" })).toBeCloseTo(6, 6);
    expect(measureText(".", { fontSize: 10, family: "sans" })).toBeCloseTo(3.2, 6);
    expect(measureText("a", { fontSize: 10, family: "sans" })).toBeCloseTo(5.3, 6);
    expect(measureText(" ", { fontSize: 10, family: "sans" })).toBeCloseTo(2.8, 6);
  });

  it("uses a monospace advance for a mono family", () => {
    expect(measureText("ab", { fontSize: 10, family: "ui-monospace" })).toBeCloseTo(12, 6);
    expect(measureText("11", { fontSize: 10, family: "Menlo, monospace" })).toBeCloseTo(12, 6);
  });

  it("gives full-width CJK glyphs a full em", () => {
    expect(measureText("日", { fontSize: 16, family: "sans" })).toBeCloseTo(16, 6);
  });

  it("adds letter-spacing per character", () => {
    expect(measureText("ab", { fontSize: 10, family: "sans", letterSpacing: 1 })).toBeCloseTo(12.6, 6);
  });

  it("is deterministic for identical input", () => {
    const style = { fontSize: 13, family: "sans" };
    expect(measureText("Deterministic", style)).toBe(measureText("Deterministic", style));
  });
});

describe("line metrics", () => {
  it("derives the line step and ascent from font size and line height", () => {
    expect(lineMetrics(20, 1.5)).toEqual({ lineStep: 30, ascent: (30 + 14) / 2 });
  });

  it("computes block height and baseline offsets consistently", () => {
    expect(blockHeight(0, 20, 1.5)).toBe(0);
    expect(blockHeight(1, 20, 1.5)).toBe(30);
    expect(blockHeight(3, 20, 1.5)).toBe(2 * 30 + 30);

    const { lineStep, ascent } = lineMetrics(20, 1.5);
    expect(baselineOffset(0, 20, 1.5)).toBe(ascent);
    expect(baselineOffset(2, 20, 1.5)).toBe(2 * lineStep + ascent);
  });
});

describe("wrapText", () => {
  const style = { maxWidth: 120, fontSize: 10, family: "sans" };

  it("keeps every line inside the measure for a normal sentence", () => {
    const result = wrapText("the quick brown fox jumps over the lazy dog", style);
    expect(result.lines.length).toBeGreaterThan(1);
    for (const line of result.lines) {
      expect(measureText(line, { fontSize: 10, family: "sans" })).toBeLessThanOrEqual(style.maxWidth + 0.001);
    }
    // Whitespace-only collapsing: rejoined tokens equal the original tokens.
    expect(result.lines.join(" ")).toBe("the quick brown fox jumps over the lazy dog");
    expect(result.truncated).toBe(false);
  });

  it("honours a forced newline", () => {
    expect(wrapText("first\nsecond", style).lines).toEqual(["first", "second"]);
  });

  it("returns a single empty line for empty input", () => {
    expect(wrapText("", style).lines).toEqual([""]);
  });

  it("breaks a single token wider than the measure at character granularity", () => {
    const result = wrapText("supercalifragilisticexpialidocious", style);
    expect(result.lines.length).toBeGreaterThan(1);
    for (const line of result.lines) {
      expect(measureText(line, { fontSize: 10, family: "sans" })).toBeLessThanOrEqual(style.maxWidth + 0.001);
    }
  });

  it("breaks CJK text without spaces and keeps it inside the measure", () => {
    const result = wrapText("日本語のテキストを折り返します", style);
    expect(result.lines.length).toBeGreaterThan(1);
    for (const line of result.lines) {
      expect(measureText(line, { fontSize: 10, family: "sans" })).toBeLessThanOrEqual(style.maxWidth + 0.001);
    }
  });

  it("truncates to maxLines with an ellipsis and reports it", () => {
    const result = wrapText(
      "the quick brown fox jumps over the lazy dog and keeps running",
      { ...style, maxLines: 2 }
    );
    expect(result.lines).toHaveLength(2);
    expect(result.truncated).toBe(true);
    expect(result.lines[1].endsWith("…")).toBe(true);
  });
});

describe("formatNumber", () => {
  it("groups and applies a fixed precision without changing the value", () => {
    expect(formatNumber(1234.56, { precision: 1 })).toBe("1,234.6");
    expect(formatNumber(1234.56, { precision: 0 })).toBe("1,235");
    expect(formatNumber(1234.5, { grouping: false, precision: 1 })).toBe("1234.5");
  });

  it("renders non-finite values as an explicit dash", () => {
    expect(formatNumber(Number.NaN)).toBe("—");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("scales a fraction by 100 with a fixed precision", () => {
    expect(formatPercent(0.124, 1)).toBe("12.4%");
    expect(formatPercent(0.5, 0)).toBe("50%");
  });

  it("renders a non-finite fraction as an explicit dash", () => {
    expect(formatPercent(Number.NaN)).toBe("—");
  });
});

describe("formatSigned", () => {
  it("always states the sign so direction is never color-only", () => {
    expect(formatSigned(5)).toBe("+5");
    expect(formatSigned(-3)).toBe("−3");
    expect(formatSigned(0)).toBe("0");
  });
});

describe("milestone helpers", () => {
  it("keeps a relative label as-is and formats an ISO date", () => {
    expect(formatMilestoneLabel("T+2")).toBe("T+2");
    expect(formatMilestoneLabel("Phase 1")).toBe("Phase 1");

    const formatted = formatMilestoneLabel("2026-01-12");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("Jan");
  });

  it("uses the parsed time for ISO dates and source order for non-parseable labels", () => {
    expect(milestoneSortKey("2026-01-12", 7)).toBe(new Date("2026-01-12").getTime());
    expect(milestoneSortKey("Q3 2025", 7)).toBe(7);
  });

  it("DOCUMENTS a defect: a relative label that V8 can parse is treated as a date", () => {
    // `milestoneSortKey`/`hasTemporalScale` call `new Date(value)` without the ISO
    // guard `formatMilestoneLabel` uses, so lenient V8 parsing turns relative
    // labels like "T+2" into timestamps and reports them as a temporal scale.
    // Reported, not fixed (tests-only task).
    expect(milestoneSortKey("T+2", 7)).toBe(new Date("T+2").getTime());
    expect(hasTemporalScale(["T+2"])).toBe(true);
  });

  it("reports a temporal scale only when every value is a parseable date", () => {
    expect(hasTemporalScale(["2026-01-01", "2026-06-01"])).toBe(true);
    expect(hasTemporalScale(["2026-01-01", "Q3 2025"])).toBe(false);
    expect(hasTemporalScale([])).toBe(false);
  });
});
