import { describe, expect, it } from "vitest";
import { inspectSeekParity } from "../registry/visual/explainer-principles";
import {
  changedTokenSpan, codeLines, codeStageRevisionOrder, codeStageRows, evaluateCodeStage, layoutCodeStage,
  validateCodeStage, type CodeRevision, type CodeStageSpec, type CodeToken,
} from "../registry/visual/code-stage";

/* Fake measurer: 0.6 em per character, so widths are checkable by hand. The view uses the canvas measurer. */
const measure = (font: string, text: string) => [...text].length * Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]) * 0.6;
const box = { x: 40, y: 40, width: 1000, height: 1000 };
const options = { measure, maxFontPx: 40, minFontPx: 8 };

const tokensOf = (text: string): CodeToken[] => text.split(/(\s+|=)/).filter(Boolean).map(t => ({ text: t, kind: "plain" }));
const lineTokens = (lines: ReadonlyArray<{ id: string; text: string }>) => Object.fromEntries(lines.map(l => [l.id, tokensOf(l.text)]));

const base = codeLines("const a = 1\nconst b = 2\nconst c = 3\nreturn a + b + c", "l");
const rev2: CodeRevision = {
  id: "fix", // inserts l5, deletes l3, replaces l2's value, keeps l1 and l4
  lines: [{ id: "l1", text: "const a = 1" }, { id: "l2", text: "const b = 9" }, { id: "l5", text: "const d = 4" }, { id: "l4", text: "return a + b + d" }],
  tokens: {},
};
rev2.tokens = lineTokens(rev2.lines);

const spec: CodeStageSpec = {
  id: "edit-fixture", fps: { num: 30, den: 1 },
  source: { id: "base", language: "ts", lines: base, tokens: lineTokens(base) },
  revisions: [rev2],
  beats: [
    { id: "establish", kind: "establish", durationFrames: 60 },
    { id: "change", kind: "edit", to: "fix", durationFrames: 60 },
    { id: "hold", kind: "establish", durationFrames: 60 },
  ],
};

describe("code stage revisions", () => {
  it("keeps the base listing unchanged when no edit is present", () => {
    const plain: CodeStageSpec = { ...spec, revisions: undefined, beats: [{ id: "a", kind: "establish", durationFrames: 30 }] };
    expect(codeStageRows(plain).map(r => r.key)).toEqual(["l1", "l2", "l3", "l4"]);
    const layout = layoutCodeStage(plain, box, options);
    expect(layout.lines.map(l => l.number)).toEqual([1, 2, 3, 4]);
    expect(layout.lines.map(l => l.y)).toEqual([0, 1, 2, 3].map(i => box.y + i * layout.font.size * layout.font.lineHeight));
  });

  it("gives every revision exactly its own lines, in its own order, with one row per identity", () => {
    expect(codeStageRevisionOrder(spec)).toEqual(["base", "fix"]);
    const rows = codeStageRows(spec);
    const keys = rows.map(r => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const revisionId of ["base", "fix"]) {
      const expected = (revisionId === "base" ? base : rev2.lines).map(l => l.id);
      const shown = rows.filter(r => r.presentIn.includes(revisionId)).map(r => r.lineId);
      expect(shown).toEqual(expected);
    }
  });

  it("records a removed line, an added line and a changed line without moving any kept slot", () => {
    const rows = codeStageRows(spec);
    const byId = Object.fromEntries(rows.map(r => [r.key, r.presentIn]));
    expect(byId.l3).toEqual(["base"]);
    expect(byId.l5).toEqual(["fix"]);
    expect(byId.l2).toEqual(["base", "fix"]);
    const layout = layoutCodeStage(spec, box, options);
    for (const row of layout.rows) for (const v of Object.values(row.versions)) expect(v.y).toBe(row.y);
    const slotOf = (key: string) => layout.rows.findIndex(r => r.key === key);
    expect(slotOf("l2")).toBeLessThan(slotOf("l4"));
    expect(layout.rows.length).toBe(rows.length);
  });

  it("reports a moved line as a removed row and an added row with its own key", () => {
    const moved: CodeRevision = { id: "moved", lines: [{ id: "l4", text: "return a + b + c" }, { id: "l1", text: "const a = 1" }], tokens: {} };
    moved.tokens = lineTokens(moved.lines);
    const movedSpec: CodeStageSpec = { ...spec, revisions: [moved], beats: [{ id: "x", kind: "edit", to: "moved", durationFrames: 60 }] };
    const rows = codeStageRows(movedSpec);
    expect(rows.some(r => r.lineId === "l1" && r.presentIn.includes("moved") && r.key !== "l1")).toBe(true);
    expect(rows.find(r => r.key === "l1")?.presentIn).toEqual(["base"]);
  });
});

describe("code stage edit timing", () => {
  it("draws the base before the edit, fades removed and added lines across it, and draws the new revision after", () => {
    expect(evaluateCodeStage(spec, 10).revision).toBe("base");
    expect(evaluateCodeStage(spec, 10).edit).toBeUndefined();
    const start = evaluateCodeStage(spec, 60);
    expect(start.edit?.rows.l3?.from).toBeCloseTo(1, 6);
    expect(start.edit?.rows.l5?.to).toBeCloseTo(0, 6);
    const end = evaluateCodeStage(spec, 120);
    expect(end.edit).toBeUndefined();
    expect(end.revision).toBe("fix");
  });

  it("marks only the changed tokens of a replaced line", () => {
    const mid = evaluateCodeStage(spec, 90);
    const replaced = mid.edit?.rows.l2;
    expect(replaced?.changed).toEqual({ from: [6, 7], to: [6, 7] });
    expect(changedTokenSpan(tokensOf("const b = 2"), tokensOf("const b = 2"))).toBeUndefined();
    expect(changedTokenSpan(tokensOf("const b = 2"), tokensOf("const b = 9"))).toEqual({ from: [6, 7], to: [6, 7] });
  });

  it("seeks identically to any frame, including the first and the last", () => {
    const report = inspectSeekParity(() => (frame: number) => evaluateCodeStage(spec, frame), {
      durationFrames: 180, frames: [0, 59, 60, 89, 119, 179],
    });
    expect(report.ok).toBe(true);
  });
});

describe("terminal output", () => {
  const output: CodeStageSpec = {
    id: "run", fps: { num: 30, den: 1 }, source: { id: "base", language: "ts", lines: base, tokens: lineTokens(base) },
    beats: [
      { id: "establish", kind: "establish", durationFrames: 30 },
      { id: "run", kind: "output", durationFrames: 90, exitCode: 1, lines: [
        { kind: "command", text: "npm test" },
        { kind: "stdout", text: "running 3 tests" },
        { kind: "stderr", text: "AssertionError: expected 2 to equal 3" },
      ] },
    ],
  };

  it("reveals each line in order and shows the exit status last, without changing the listing", () => {
    expect(evaluateCodeStage(output, 30).terminal?.lines[0].opacity).toBe(0);
    const late = evaluateCodeStage(output, 125);
    expect(late.terminal?.lines.map(l => l.kind)).toEqual(["command", "stdout", "stderr"]);
    expect(late.terminal?.lines.every(l => l.opacity === 1)).toBe(true);
    expect(late.terminal?.exitCode).toBe(1);
    expect(late.terminal?.exitOpacity).toBe(1);
    expect(late.revision).toBe("base");
  });

  it("reserves the terminal panel below the listing and lays the listing out above it", () => {
    const layout = layoutCodeStage(output, box, options);
    expect(layout.terminal).toBeDefined();
    const lastCodeBottom = Math.max(...layout.rows.map(r => r.y)) + layout.font.size * layout.font.lineHeight;
    expect(layout.terminal!.rect.y).toBeGreaterThanOrEqual(lastCodeBottom);
    expect(validateCodeStage(output, layout).filter(d => d.severity === "error")).toEqual([]);
  });

  it("refuses an empty output beat and a line that spans two lines", () => {
    const bad: CodeStageSpec = { ...output, beats: [{ id: "run", kind: "output", durationFrames: 60, lines: [] }] };
    expect(validateCodeStage(bad).map(d => d.code)).toContain("code-stage-output-empty");
    const multi: CodeStageSpec = { ...output, beats: [{ id: "run", kind: "output", durationFrames: 60, lines: [{ kind: "stdout", text: "a\nb" }] }] };
    expect(validateCodeStage(multi).map(d => d.code)).toContain("code-stage-terminal-line-invalid");
  });
});

describe("code stage revision refusals", () => {
  it("refuses an edit to a revision that is not defined, and a revision whose tokens do not match", () => {
    const unknown: CodeStageSpec = { ...spec, beats: [{ id: "x", kind: "edit", to: "missing", durationFrames: 60 }] };
    expect(validateCodeStage(unknown).map(d => d.code)).toContain("code-stage-revision-unknown");
    const broken: CodeRevision = { id: "broken", lines: [{ id: "l1", text: "const a = 1" }], tokens: { l1: [{ text: "const", kind: "keyword" }] } };
    const mismatch: CodeStageSpec = { ...spec, revisions: [broken], beats: [{ id: "x", kind: "edit", to: "broken", durationFrames: 60 }] };
    expect(validateCodeStage(mismatch).map(d => d.code)).toContain("code-stage-token-mismatch");
  });

  it("warns when an edit changes nothing, and refuses a revision id that is reused", () => {
    const same: CodeRevision = { id: "same", lines: base, tokens: lineTokens(base) };
    const noop: CodeStageSpec = { ...spec, revisions: [same], beats: [{ id: "x", kind: "edit", to: "same", durationFrames: 60 }] };
    expect(validateCodeStage(noop).find(d => d.code === "code-stage-edit-empty")?.severity).toBe("warning");
    const reused: CodeStageSpec = { ...spec, revisions: [{ ...rev2, id: "base" }] };
    expect(validateCodeStage(reused).map(d => d.code)).toContain("code-stage-revision-duplicate");
  });
});
