import { describe, expect, it } from "vitest";
import type { FontAsset, TextSpan, TextSpec } from "../src/media/document";
import type { MeasureText } from "../src/media/text-layout";
import { layoutText, measureTextWidth } from "../src/media/text-layout";

const FONTS: Record<string, FontAsset> = {
  f: {
    id: "f",
    family: "Test Sans",
    weight: 400,
    style: "normal",
    fallback: ["sans-serif"],
    availability: "pinned",
  },
};

/** Deterministic stub: 0.5 × font size per UTF-16 unit, parsed from the CSS shorthand. */
const measure: MeasureText = (font, text) => {
  const match = /(\d+(?:\.\d+)?)px/.exec(font);
  const size = match ? Number(match[1]) : 16;
  return 0.5 * size * text.length;
};

function spec(overrides: Partial<TextSpec> & { spans: TextSpan[] }): TextSpec {
  return {
    fontId: "f",
    size: 20,
    lineHeight: 1,
    letterSpacing: 0,
    align: "start",
    direction: "ltr",
    fit: "wrap",
    as: "p",
    ...overrides,
  };
}

describe("text layout: wrapping", () => {
  it("never splits a Latin word and keeps an oversized word whole", () => {
    const wrapped = layoutText(
      spec({ spans: [{ text: "hello world" }] }),
      { width: 80, height: 1000 },
      FONTS,
      measure
    );
    expect(wrapped.lines.map((line) => line.text)).toEqual(["hello", "world"]);

    const word = "internationalization";
    const single = layoutText(
      spec({ spans: [{ text: word }] }),
      { width: 40, height: 1000 },
      FONTS,
      measure
    );
    expect(single.lines.map((line) => line.text)).toEqual([word]);
  });

  it("wraps CJK without spaces and loses no character", () => {
    const source = "日本語のテキストです";
    const result = layoutText(
      spec({ spans: [{ text: source }], language: "ja" }),
      { width: 40, height: 1000 },
      FONTS,
      measure
    );
    expect(result.lines.length).toBeGreaterThan(1);
    expect(result.lines.map((line) => line.text).join("")).toBe(source);
  });

  it("forces a line break on a newline", () => {
    const result = layoutText(
      spec({ spans: [{ text: "one\ntwo\nthree" }] }),
      { width: 1000, height: 1000 },
      FONTS,
      measure
    );
    expect(result.lines.map((line) => line.text)).toEqual(["one", "two", "three"]);
  });

  it("maps per-line runs back to span indices and offsets", () => {
    const spans: TextSpan[] = [{ text: "alpha " }, { text: "beta " }, { text: "gamma" }];
    const result = layoutText(spec({ spans }), { width: 1000, height: 1000 }, FONTS, measure);

    expect(result.lines).toHaveLength(1);
    const runs = result.lines[0].runs;
    expect(runs.map((run) => [run.spanIndex, run.startIndex, run.endIndex, run.text])).toEqual([
      [0, 0, 6, "alpha "],
      [1, 6, 11, "beta "],
      [2, 11, 16, "gamma"],
    ]);
    expect(result.lines[0].text).toBe("alpha beta gamma");
  });
});

describe("text layout: fit policies", () => {
  it("truncates to maxLines for fit=wrap and flags it", () => {
    const result = layoutText(
      spec({ spans: [{ text: "aaa bbb ccc ddd eee" }], maxLines: 2 }),
      { width: 40, height: 1000 },
      FONTS,
      measure
    );
    expect(result.lines).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });

  it("sets truncated for fit=clip only when lines are dropped", () => {
    const kept = layoutText(
      spec({ spans: [{ text: "a\nb\nc" }], fit: "clip" }),
      { width: 1000, height: 60 },
      FONTS,
      measure
    );
    expect(kept.lines).toHaveLength(3);
    expect(kept.truncated).toBe(false);

    const clipped = layoutText(
      spec({ spans: [{ text: "a\nb\nc" }], fit: "clip" }),
      { width: 1000, height: 40 },
      FONTS,
      measure
    );
    expect(clipped.lines).toHaveLength(2);
    expect(clipped.truncated).toBe(true);
  });

  it("shrink picks the largest fitting size deterministically", () => {
    const textSpec = spec({
      spans: [{ text: "hello world hello world" }],
      fit: "shrink",
      size: 20,
      minSize: 8,
      maxSize: 20,
    });
    const box = { width: 100, height: 30 };
    const first = layoutText(textSpec, box, FONTS, measure);
    const second = layoutText(textSpec, box, FONTS, measure);

    expect(first.size).toBe(second.size);
    expect(first.size).toBeGreaterThan(8);
    expect(first.size).toBeLessThan(20);
    expect(first.overflow).toBe(false);
    expect(first.height).toBeLessThanOrEqual(box.height);
    expect(first.lines.every((line) => line.width <= box.width)).toBe(true);

    const impossible = layoutText(textSpec, { width: 100, height: 1 }, FONTS, measure);
    expect(impossible.size).toBe(8);
    expect(impossible.overflow).toBe(true);
  });

  it("fit=none reports overflow without truncating", () => {
    const result = layoutText(
      spec({ spans: [{ text: "a\nb" }], fit: "none" }),
      { width: 1000, height: 10 },
      FONTS,
      measure
    );
    expect(result.lines).toHaveLength(2);
    expect(result.truncated).toBe(false);
    expect(result.overflow).toBe(true);
  });
});

describe("text layout: intrinsic width", () => {
  it("grows with letter spacing and with font size", () => {
    const base = spec({ spans: [{ text: "hello world" }] });
    const tracked = spec({ spans: [{ text: "hello world" }], letterSpacing: 4 });
    const larger = spec({ spans: [{ text: "hello world" }], size: 40 });

    const baseWidth = measureTextWidth(base, FONTS, measure);
    expect(measureTextWidth(tracked, FONTS, measure)).toBeGreaterThan(baseWidth);
    expect(measureTextWidth(larger, FONTS, measure)).toBeGreaterThan(baseWidth);
  });
});
