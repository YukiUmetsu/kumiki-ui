import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionRevealScene } from "../registry/video/recipes/question-reveal";
import type { SceneTemplateSpec } from "../registry/video/scene-templates";

const spec: SceneTemplateSpec<"question-reveal"> = {
  schemaVersion: 1, recipeVersion: 1, recipeId: "question-reveal", id: "test",
  fps: { num: 30, den: 1 }, durationFrames: 120, width: 960, height: 540,
  content: { question: "What changes?", answer: "The light turns on.",
    subject: { id: "off", src: "/off.png", alt: "Light off" },
    answerVisual: { id: "on", src: "/on.png", alt: "Light on" } },
};

describe("question reveal", () => {
  it("holds the subject, then reveals the answer and its visual state", () => {
    const { rerender } = render(<QuestionRevealScene spec={spec} frame={0} />);
    expect(screen.getByAltText("Light off")).toBeTruthy();
    expect(screen.getByText("The light turns on.").parentElement?.getAttribute("aria-hidden")).toBe("true");
    rerender(<QuestionRevealScene spec={spec} frame={90} />);
    expect(screen.getByText("The light turns on.")).toBeTruthy();
    expect(screen.getByAltText("Light on")).toBeTruthy();
    expect(screen.queryByAltText("Light off")).toBeNull();
  });

  it("brings the answer in over the reveal beat and settles it for the hold", () => {
    const { container, rerender } = render(<QuestionRevealScene spec={spec} frame={60} />);
    const answer = container.querySelector<HTMLElement>('[data-km-motion="question-answer"]')!;
    expect(Number(answer.style.opacity)).toBe(0);
    rerender(<QuestionRevealScene spec={spec} frame={80} />);
    expect(Number(answer.style.opacity)).toBe(1);
  });

  it("builds the reveal accent from the cue and holds it in the final state", () => {
    const { container, rerender } = render(<QuestionRevealScene spec={spec} frame={60} />);
    const accent = container.querySelector<HTMLElement>('[data-km-answer-accent]')!;
    expect(accent.style.transform).toBe("scaleX(0)");
    rerender(<QuestionRevealScene spec={spec} frame={76} />);
    expect(accent.style.transform).toBe("scaleX(1)");
  });

  it("shows anticipation before the reveal and suppresses it for reduced motion", () => {
    const { container, rerender } = render(<QuestionRevealScene spec={spec} frame={36} />);
    const anticipation = container.querySelector<HTMLElement>('[data-km-reveal-anticipation]')!;
    expect(anticipation.style.opacity).toBe("0.7");
    expect(anticipation.style.transform).toBe("scaleX(0.5)");
    rerender(<QuestionRevealScene spec={spec} frame={36} reducedMotion />);
    expect(anticipation.style.opacity).toBe("0");
  });
});

describe("question reveal answer steps", () => {
  const stepped: SceneTemplateSpec<"question-reveal"> = { ...spec, cueFrames: [20, 80, 100], content: { ...spec.content,
    questionEmphasis: "changes", revealImpact: "kick",
    subject: { ...spec.content.subject, width: 1600, height: 900 },
    answerSteps: [
      { id: "cause", text: "The switch closes.", frame: 40, marker: "right" },
      { id: "effect", text: "The light turns on." },
    ],
    annotations: [
      { id: "current", kind: "path", points: [{ x: .2, y: .5 }, { x: .5, y: .3 }, { x: .8, y: .5 }], arrowhead: true,
        timing: { at: { step: "cause" }, until: { step: "effect" }, untilOffset: -10 } },
      { id: "bulb", kind: "ring", center: { x: .8, y: .5 }, radius: .1, timing: { at: { step: "effect" } } },
    ] } };

  it("lands each step on its own frame and binds marks to step timing", () => {
    const { container, rerender } = render(<QuestionRevealScene spec={stepped} frame={39} />);
    expect(container.querySelector('[data-km-answer-step]')).toBeNull();
    rerender(<QuestionRevealScene spec={stepped} frame={50} />);
    expect(container.querySelector('[data-km-answer-step="cause"]')).toBeTruthy();
    expect(container.querySelector('[data-km-annotation="current"]')).toBeTruthy();
    rerender(<QuestionRevealScene spec={stepped} frame={85} />);
    expect(container.querySelector('[data-km-answer-step="effect"]')).toBeTruthy();
    expect(container.querySelector('[data-km-annotation="current"]')).toBeNull();
    expect(container.querySelector('[data-km-annotation="bulb"]')).toBeTruthy();
  });

  it("passes the same timing and subject mapping to a host overlay", () => {
    const seen: string[] = [];
    render(<QuestionRevealScene spec={stepped} frame={45} renderOverlay={({ space, state, toStage }) => {
      const s = state({ at: { step: "cause" }, enter: 10 });
      seen.push(`${space}:${s.visible}:${s.enter.toFixed(2)}`);
      // 1600×900 subject covers a 960×540 stage exactly, so the mapping is linear here.
      return space === "subject" ? <i data-testid="host" data-x={toStage({ x: .5, y: .5 }).x} /> : null;
    }} />);
    expect(seen).toEqual(["subject:true:0.97", "stage:true:0.97"]);
    expect(screen.getByTestId("host").getAttribute("data-x")).toBe("480");
  });

  it("rejects emphasis outside the question, unordered steps and marks bound to missing steps", () => {
    expect(() => render(<QuestionRevealScene spec={{ ...stepped, content: { ...stepped.content, questionEmphasis: "elsewhere" } }} frame={0} />)).toThrow(/questionEmphasis/);
    expect(() => render(<QuestionRevealScene spec={{ ...stepped, content: { ...stepped.content, answerSteps: [
      { id: "a", text: "A", frame: 60 }, { id: "b", text: "B", frame: 30 }] } }} frame={0} />)).toThrow(/frame order/);
    expect(() => render(<QuestionRevealScene spec={{ ...stepped, content: { ...stepped.content, annotations: [
      { id: "x", kind: "ring", center: { x: .5, y: .5 }, radius: .1, timing: { at: { step: "missing" } } }] } }} frame={0} />)).toThrow(/unknown or invalid cue/);
  });
});

describe("subject annotation framing", () => {
  it("reports marks a portrait crop would cut off", async () => {
    const { annotationFraming } = await import("../registry/video/subject-annotations");
    const marks = [
      { id: "centre", kind: "arrow" as const, from: { x: .5, y: .6 }, to: { x: .5, y: .8 }, timing: { at: "reveal" as const } },
      { id: "edge", kind: "path" as const, points: [{ x: .44, y: .7 }, { x: .16, y: .5 }], timing: { at: "reveal" as const } },
    ];
    expect(annotationFraming(marks, { width: 1280, height: 720 }, 960, 540)).toEqual([]);
    expect(annotationFraming(marks, { width: 1280, height: 720 }, 540, 960).map(m => m.id)).toEqual(["edge"]);
  });
});
