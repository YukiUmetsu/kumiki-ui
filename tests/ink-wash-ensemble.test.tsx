import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { assertInkEnsemble, inkEnsembleAt, inkPartnerLookTarget } from "../registry/video/ink-wash-ensemble";
import { InkEnsemble } from "../registry/video/ink-wash-ensemble-react";
import { inkDuet } from "../src/video/ink-wash-ensemble-demo";
import { INK_TRAVELLER } from "../src/video/ink-wash-performer";
import { INK_APPRENTICE } from "../src/video/ink-wash-apprentice";
import { validateCharacterDefinition } from "../registry/character/validate";

describe("INK4 authored ink-painting multi-actor staging", () => {
  for (const aspect of ["landscape", "portrait"] as const) {
    const duet = inkDuet(aspect);
    it(aspect + " keeps actor IDs and independently approved original rigs", () => {
      expect(() => assertInkEnsemble(duet.plan)).not.toThrow();
      const state = inkEnsembleAt(duet.plan, 188);
      expect(state.actors).toHaveLength(2);
      expect(new Set(state.actors.map(actor => actor.instanceId)).size).toBe(2);
      expect(state.contacts).toHaveLength(1);
      expect(state.contacts[0].withinReach).toBe(true);
      expect(state.contacts[0].intersectingFeet).toBe(false);
      expect(state.actors.some(actor => actor.activity === "exchange")).toBe(true);
    });
    it(aspect + " composes two actual character presenters, with different skins and source IDs", () => {
      const render = (frame: number, reduce = false) =>
        renderToStaticMarkup(createElement(InkEnsemble, {
          ...duet, frame, reducedMotion: reduce, showGrounding: true,
        }));
      const final = render(188);
      expect(final).toContain('data-km-ink-ensemble=""');
      expect(final).toContain('data-km-ink-ensemble-actor="master"');
      expect(final).toContain('data-km-ink-ensemble-actor="learner"');
      expect(final.match(/data-km-character-presenter=""/g)).toHaveLength(2);
      expect(final).toContain('data-km-ink-reach="pass"');
      expect(final).toContain('data-km-ink-partner-gaze="tracked"');
      expect(render(188)).toBe(final);
      expect(render(30)).not.toBe(final);
      expect(render(30, true)).toContain('data-km-ink-ensemble-frame="30"');
    });
  }
  it("validates a separately authored apprentice character identity and its distinct physical features", () => {
    const errors = validateCharacterDefinition(INK_APPRENTICE)
      .filter(item => item.severity === "error");
    expect(errors).toEqual([]);
    expect(INK_APPRENTICE.characterId).not.toBe(INK_TRAVELLER.characterId);
    expect(INK_APPRENTICE.assets.hair).not.toEqual(INK_TRAVELLER.assets.hair);
    expect(INK_APPRENTICE.assets.face).not.toEqual(INK_TRAVELLER.assets.face);
    expect(INK_APPRENTICE.assets.robe).not.toEqual(INK_TRAVELLER.assets.robe);
    expect(INK_APPRENTICE.assets.brush).not.toEqual(INK_TRAVELLER.assets.brush);
    expect(INK_APPRENTICE.parts.some(part => part.id === "chin-trace")).toBe(true);
    expect(INK_APPRENTICE.parts.some(part => part.id === "beard")).toBe(false);
  });
  it("rejects actor ID aliasing, duplicate instances, invalid time and unsafe contacts", () => {
    const original = inkDuet("landscape").plan;
    const second = original.actors[1];
    expect(() => assertInkEnsemble({ ...original, actors: [original.actors[0],
      { ...second, track: { ...second.track, instanceId: original.actors[0].track.instanceId } },
    ] })).toThrow(RangeError);
    expect(() => assertInkEnsemble({ ...original, beats: [{
      ...original.beats[0], sourceId: "non-existent",
    }] })).toThrow(RangeError);
    expect(() => assertInkEnsemble({ ...original, beats: [{
      ...original.beats[0], endFrame: original.beats[0].startFrame,
    }] })).toThrow(RangeError);
    expect(() => assertInkEnsemble({ ...original, actors: original.actors.map(a => ({ ...a, radius: Infinity })) }))
      .toThrow(RangeError);
    expect(() => inkEnsembleAt(original, -1)).toThrow(RangeError);
  });
  it("targets the moving partner through the existing pupil target, including left-facing mirrors", () => {
    const plan = inkDuet("landscape").plan;
    const early = inkEnsembleAt(plan, 118).actors;
    const later = inkEnsembleAt(plan, 188).actors;
    const masterEarly = early.find(a => a.id === "master")!;
    const learnerEarly = early.find(a => a.id === "learner")!;
    const masterLater = later.find(a => a.id === "master")!;
    const learnerLater = later.find(a => a.id === "learner")!;
    const design = { width: 260, height: 340 };
    const first = inkPartnerLookTarget(masterEarly.pose, learnerEarly.pose, design, design);
    const second = inkPartnerLookTarget(masterLater.pose, learnerLater.pose, design, design);
    expect(first.x).toBeGreaterThan(design.width / 2);
    expect(first.x).toBeCloseTo(second.x);
    const opposite = inkPartnerLookTarget(learnerLater.pose, masterLater.pose, design, design);
    expect(opposite.x).toBeGreaterThan(design.width / 2);
    expect(Number.isFinite(opposite.y)).toBe(true);
    expect(() => inkPartnerLookTarget(masterLater.pose, learnerLater.pose,
      { width: 0, height: 340 }, design)).toThrow(RangeError);
  });
  it("does not claim impossible prop handoff as a successful contact", () => {
    const example = inkDuet("landscape").plan;
    const tooFar = { ...example, actors: example.actors.map(a => ({
      ...a, track: { ...a.track, keys: a.track.keys.map(k => ({ ...k,
        x: a.track.id === "master" ? 100 : 850,
      })) },
    })) };
    const state = inkEnsembleAt(tooFar, 188);
    expect(state.contacts[0].withinReach).toBe(false);
    expect(state.contacts[0].actualGap).toBeGreaterThan(state.contacts[0].maximumGap);
    const close = { ...example, actors: example.actors.map(a => ({
      ...a, track: { ...a.track, keys: a.track.keys.map(k => ({ ...k, x: 400 })) },
    })) };
    expect(inkEnsembleAt(close, 188).contacts[0].intersectingFeet).toBe(true);
  });
  it("revisiting a previously evaluated absolute frame returns identical poses", () => {
    const plan = inkDuet("landscape").plan;
    const first = inkEnsembleAt(plan, 188);
    inkEnsembleAt(plan, 328); inkEnsembleAt(plan, 0);
    expect(inkEnsembleAt(plan, 188)).toEqual(first);
  });
});
