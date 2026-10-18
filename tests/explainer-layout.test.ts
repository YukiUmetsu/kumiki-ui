import { describe, expect, it } from "vitest";
import { planExplainerLayout } from "../registry/visual/explainer-layout";
import { intersectsRect } from "../registry/visual/protected-text";

const measure = (_font: string, text: string) => Array.from(text).length * 12;
const request = {
  viewport: { width: 1000, height: 600 },
  subjects: [{ id: "subject", region: { x: .08, y: .12, width: .42, height: .55 },
    portraitRegion: { x: .1, y: .08, width: .8, height: .45 } }],
  protect: ["subject"], text: "A visible subject and a readable explanation.",
  font: "24px sans-serif", fontSizePx: 24, lineHeightPx: 32,
};

describe("explainer composition", () => {
  it("reserves measured text alongside a named subject in landscape", () => {
    const result = planExplainerLayout(request, measure);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.orientation).toBe("landscape");
    expect(result.text.placement).toBe("right");
    expect(intersectsRect(result.text.rect, result.subjects[0].region)).toBe(false);
    expect(result.text.lines.join(" ")).toBe(request.text);
  });
  it("uses portrait bounds and places CJK explanation below the subject", () => {
    const result = planExplainerLayout({ ...request, viewport: { width: 390, height: 693 }, text: "大切な被写体を保護して説明を読みやすく配置します。", language: "ja" }, measure);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text.placement).toBe("below");
    expect(result.subjects[0].region).toEqual(request.subjects[0].portraitRegion);
    expect(result.text.lines.join("")).toBe("大切な被写体を保護して説明を読みやすく配置します。");
  });
  it("protects every subject and gives an explicit failure when none fit", () => {
    const result = planExplainerLayout({ ...request, subjects: [
      { id: "one", region: { x: .06, y: .06, width: .44, height: .88 } },
      { id: "two", region: { x: .5, y: .06, width: .44, height: .88 } },
    ], protect: ["one", "two"] }, measure);
    expect(result).toMatchObject({ ok: false, diagnostics: [{ code: "layout-impossible" }] });
  });
  it.each([
    { protect: ["missing"] },
    { subjects: [...request.subjects, ...request.subjects] },
    { viewport: { width: NaN, height: 600 } },
    { maxLines: 0 },
    { gapPx: -1 },
    { subjects: [{ id: "subject", region: { x: -.1, y: .2, width: .2, height: .3 } }] },
  ])("rejects invalid composition input %j", (invalid) => {
    expect(planExplainerLayout({ ...request, ...invalid }, measure).ok).toBe(false);
  });
  it("fails when metrics are unavailable or invalid at any measured run", () => {
    expect(planExplainerLayout(request, () => 0)).toMatchObject({ ok: false });
    expect(planExplainerLayout(request, (_font, text) => text.length === 1 ? 10 : NaN)).toMatchObject({ ok: false });
  });
  it("never truncates an overlong explanation", () => {
    const result = planExplainerLayout({ ...request, text: "Long explanation ".repeat(100), maxLines: 2 }, measure);
    expect(result).toMatchObject({ ok: false, diagnostics: [{ code: "layout-impossible" }] });
  });
});

it("counts explicit line breaks against the line budget", () => {
  const result = planExplainerLayout({ ...request, text: "First line\nSecond line\nThird line", maxLines: 2 }, measure);
  expect(result).toMatchObject({ ok: false, diagnostics: [{ code: "layout-impossible" }] });
});

it("keeps text inside the safe inset even when the subject touches the edge", () => {
  const result = planExplainerLayout({ ...request, subjects: [{ id: "subject", region: { x: 0, y: .2, width: .01, height: .4 } }] }, measure);
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.text.rect.x).toBeGreaterThanOrEqual(.06);
});
