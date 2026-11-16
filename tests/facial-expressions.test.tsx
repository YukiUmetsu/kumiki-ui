import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ACTION_UNITS, EMOTIONS } from "../registry/anatomy/expression-facs";
import { expressEmotion, expressFace, expressionFeatures, expressionMarks, nearestEmotion } from "../registry/anatomy/expression-face";
import { ExpressionAtlas, ExpressionSheet } from "../registry/anatomy/expression-react";
import { UKIYOE_MOODS } from "../registry/video/ukiyoe/ukiyoe-face";

describe("EXPR1 data", () => {
  it("every prototype uses defined action units with weights in 0–1, and covers UKIYO1's moods", () => {
    for (const e of EMOTIONS) for (const [id, w] of Object.entries(e.aus)) {
      expect(ACTION_UNITS[Number(id)], `${e.id} AU ${id}`).toBeDefined();
      expect(w).toBeGreaterThan(0); expect(w).toBeLessThanOrEqual(1);
    }
    for (const m of UKIYOE_MOODS) expect(EMOTIONS.some(e => e.id === m), m).toBe(true);
  });
});

describe("EXPR1 face", () => {
  it("leaves the neutral face unmoved and is deterministic", () => {
    const n = expressFace({});
    expect(n.vertices).toEqual(n.neutral.map(p => [...p]));
    expect(expressEmotion("fear").vertices).toEqual(expressEmotion("fear").vertices);
  });
  it("moves the face the way each emotion is described", () => {
    const f = (id: string) => expressionFeatures(expressEmotion(id));
    expect(f("smile").mouthCorner).toBeGreaterThan(.1); expect(f("smile").eyeOpen).toBeLessThan(.9); expect(f("smile").cheekRaise).toBeGreaterThan(0);
    expect(f("polite-smile").eyeOpen).toBeCloseTo(1, 1);
    expect(f("sad").browInner).toBeGreaterThan(.1); expect(f("sad").mouthCorner).toBeLessThan(0);
    expect(f("surprise").browOuter).toBeGreaterThan(.1); expect(f("surprise").mouthOpen).toBeGreaterThan(.1);
    expect(f("angry").browInner).toBeLessThan(-.1); expect(f("angry").browKnit).toBeGreaterThan(.05);
    expect(f("contempt").asymmetry).toBeGreaterThan(.05);
    expect(f("laugh").mouthCorner).toBeGreaterThan(.1); expect(f("laugh").mouthOpen).toBeGreaterThan(.1);
    expect(f("sleepy").eyeOpen).toBeLessThan(.8);
  });
  it("reads each EMFACS prototype back as itself", () => {
    for (const id of ["smile", "sad", "surprise", "fear", "angry", "disgust", "contempt"]) expect(nearestEmotion(expressionFeatures(expressEmotion(id)))[0].id, id).toBe(id);
  });
  it("draws the creases of the active units only", () => {
    const ids = (id: string) => expressionMarks(expressEmotion(id)).map(m => m.id.split(".")[0].replace(/-\d$/, ""));
    expect(ids("smile")).toContain("crows-feet"); expect(ids("polite-smile")).not.toContain("crows-feet");
    expect(ids("angry")).toContain("glabella"); expect(ids("surprise")).toContain("forehead");
  });
});

describe("EXPR1 painters", () => {
  it("renders the atlas and every sheet", () => {
    expect(renderToStaticMarkup(<ExpressionAtlas />)).toContain('role="img"');
    for (const e of EMOTIONS) expect(renderToStaticMarkup(<ExpressionSheet emotion={e.id} />)).toContain(e.name.replace(/&/g, "&amp;"));
  });
});
