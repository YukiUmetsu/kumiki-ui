import { describe, expect, it } from "vitest";
import {
  createApproximateMeasurer,
  createCanvasMeasurer,
  layoutText,
  plainText,
} from "../src/media/media-text-measure";
import type { TextLayerData, TextSpan } from "../src/media/media-document";

type Metrics = (text: string, fontSize: number) => number;

/** A measurer with exact, predictable metrics: 1 unit per character. */
function stubMeasurer(metrics: Metrics = (text, fontSize) => text.length * fontSize * 0.5) {
  return (text: string, fontSize: number) => metrics(text, fontSize);
}

function text(overrides: Partial<TextLayerData> = {}): TextLayerData {
  return {
    spans: [{ text: "hello world" }],
    fontFamily: "Geist Variable",
    fontSize: 20,
    lineHeight: 1.5,
    ...overrides,
  };
}

describe("media-text-measure: plain text", () => {
  it("concatenates spans in order", () => {
    expect(plainText(text({ spans: [{ text: "a" }, { text: "b" }] }))).toBe("ab");
  });
});

describe("media-text-measure: wrapping", () => {
  it("wraps deterministically with an injected measurer", () => {
    const layout = layoutText(text(), { width: 60, height: 100 }, stubMeasurer());
    expect(layout.approximate).toBe(false);
    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines[0].runs[0].text).toBe("hello");
    expect(layout.lines[0].width).toBeLessThanOrEqual(60);
    // Same inputs, same output.
    expect(layoutText(text(), { width: 60, height: 100 }, stubMeasurer())).toEqual(layout);
  });

  it("honours forced line breaks", () => {
    const layout = layoutText(
      text({ spans: [{ text: "one\ntwo\nthree" }] }),
      { width: 500, height: 500 },
      stubMeasurer()
    );
    expect(layout.lines.map((line) => line.runs.map((run) => run.text).join(""))).toEqual([
      "one",
      "two",
      "three",
    ]);
    expect(layout.lines[0].start).toBe(0);
    expect(layout.lines[1].start).toBe(4);
  });

  it("breaks a token wider than the box between graphemes", () => {
    const url = "https://example.com/a/very/long/path";
    const layout = layoutText(text({ spans: [{ text: url }] }), { width: 40, height: 500 }, stubMeasurer());
    expect(layout.lines.length).toBeGreaterThan(1);
    for (const line of layout.lines) expect(line.width).toBeLessThanOrEqual(40);
    expect(layout.lines.map((line) => line.runs.map((run) => run.text).join("")).join("")).toBe(url);
  });

  it("breaks CJK without spaces using the fallback rules", () => {
    const locale = text({
      spans: [{ text: "日本語のテキストです" }],
      locale: undefined,
      fontFamily: "Noto Sans CJK JP",
    });
    const layout = layoutText(locale, { width: 60, height: 500 }, stubMeasurer((t, s) => t.length * s));
    expect(layout.lines.length).toBeGreaterThan(1);
  });

  it("keeps multiple spans as separate runs on one line", () => {
    const layout = layoutText(
      text({ spans: [{ text: "Hello " }, { text: "world", fontWeight: 700 }] }),
      { width: 500, height: 100 },
      stubMeasurer()
    );
    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0].runs.map((run) => run.spanIndex)).toEqual([0, 1]);
    expect(layout.lines[0].runs[0].x).toBe(0);
    expect(layout.lines[0].runs[1].x).toBeGreaterThan(0);
  });
});

describe("media-text-measure: fit policies", () => {
  it("reports overflow and a clip flag for fit=clip", () => {
    const layout = layoutText(
      text({ fit: "clip" }),
      { width: 500, height: 10 },
      stubMeasurer()
    );
    expect(layout.overflow).toBeGreaterThan(0);
    expect(layout.clipped).toBe(true);
  });

  it("drops lines past maxLines", () => {
    const layout = layoutText(
      text({ spans: [{ text: "a\nb\nc\nd" }], maxLines: 2 }),
      { width: 500, height: 500 },
      stubMeasurer()
    );
    expect(layout.lines).toHaveLength(2);
  });

  it("shrinks the font size until the text fits, never below minFontSize", () => {
    const data = text({
      spans: [{ text: "a long paragraph of text that needs several lines to fit" }],
      fit: "shrink",
      minFontSize: 8,
    });
    const tight = layoutText(data, { width: 200, height: 60 }, stubMeasurer());
    expect(tight.overflow).toBe(0);
    expect(tight.fontSize).toBeLessThan(20);
    expect(tight.fontSize).toBeGreaterThanOrEqual(8);

    const impossible = layoutText(data, { width: 200, height: 2 }, stubMeasurer());
    expect(impossible.fontSize).toBe(8);
    expect(impossible.overflow).toBeGreaterThan(0);
  });
});

describe("media-text-measure: alignment and metrics", () => {
  it("computes line offsets for start, center and end", () => {
    const box = { width: 200, height: 200 };
    const start = layoutText(text({ align: "start" }), box, stubMeasurer());
    const center = layoutText(text({ align: "center" }), box, stubMeasurer());
    const end = layoutText(text({ align: "end" }), box, stubMeasurer());
    expect(start.lines[0].offsetX).toBe(0);
    expect(center.lines[0].offsetX).toBeCloseTo((200 - center.lines[0].width) / 2, 1);
    expect(end.lines[0].offsetX).toBeCloseTo(200 - end.lines[0].width, 1);
  });

  it("derives absolute line height and baseline positions", () => {
    const layout = layoutText(text({ lineHeight: 1.5 }), { width: 70, height: 200 }, stubMeasurer());
    expect(layout.lineHeight).toBe(30);
    expect(layout.lines[1].y).toBe(30);
    expect(layout.lines[1].baseline).toBe(54);
  });

  it("flags the deterministic approximation when no canvas measurer exists", () => {
    expect(createCanvasMeasurer("sans-serif", null)).toBeUndefined();
    const approximate = layoutText(text(), { width: 200, height: 200 });
    expect(approximate.approximate).toBe(true);
    expect(approximate.lines.length).toBeGreaterThan(0);
  });

  it("uses real metrics from an injected canvas context", () => {
    const context = {
      font: "",
      measureText: (value: string) => ({ width: value.length * 10 }),
    } as unknown as CanvasRenderingContext2D;
    const measurer = createCanvasMeasurer("sans-serif", context);
    expect(measurer).toBeDefined();
    const layout = layoutText(text({ fontSize: 20 }), { width: 100, height: 200 }, measurer);
    expect(layout.approximate).toBe(false);
    expect(context.font).toContain("20px");
  });

  it("estimates progress for the approximate measurer", () => {
    const measure = createApproximateMeasurer();
    const span: TextSpan = { text: "abc" };
    expect(measure("abc", 10, span)).toBeGreaterThan(0);
    expect(measure("日本語", 10, span)).toBeGreaterThan(measure("abc", 10, span));
  });
});
