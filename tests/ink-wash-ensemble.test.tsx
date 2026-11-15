import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { assertInkEnsemble, inkEnsembleAt, inkPartnerLookTarget, inkDesignToPaper,
  inkPaperToDesign, auditInkEnsembleHands } from "../registry/video/ink-wash-ensemble";
import { evaluateCharacter } from "../registry/character/evaluate";
import { InkEnsemble } from "../registry/video/ink-wash-ensemble-react";
import { inkDuet } from "../src/video/ink-wash-ensemble-demo";
import { inkEnsembleBackdrop } from "../src/video/ink-wash-ensemble-backdrop";
import { inspectInkWash } from "../registry/video/ink-wash";
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
      // Root distance alone is never a physical handoff success.
      const hand = auditInkEnsembleHands(duet.plan, duet.cast, 188);
      expect(hand).toHaveLength(1);
      expect(final).toContain('data-km-ink-hand-contact="' +
        (hand[0].handContact ? "pass" : "fail") + '"');
      expect(hand[0].handGap).not.toBeNull();
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
  it.each(["landscape","portrait"] as const)("layers original landscape pigment and ink ground for %s",aspect=>{
    const spec=inkEnsembleBackdrop(aspect);
    expect(inspectInkWash(spec)).toEqual([]);
    expect(spec.strokes.filter(s=>s.id.startsWith("scenic-")).length).toBeGreaterThan(15);
    expect(spec.strokes.filter(s=>s.id.startsWith("frame-")).length).toBeGreaterThan(8);
    expect(spec.strokes.some(s=>s.id.startsWith("ground-near-"))).toBe(true);
    expect(spec.strokes.some(s=>s.id.startsWith("ground-grain-"))).toBe(true);
    expect(spec.strokes.length).toBeLessThan(220);
    expect(inkEnsembleBackdrop(aspect)).toEqual(spec);
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
  it("converts design anchors to paper and back across mirroring, scaling and rotation", () => {
    const design = { width: 260, height: 340 }, anchor = { x: 226, y: 244 };
    for (const facing of ["left", "right"] as const) {
      for (const rotation of [-75, 0, 32]) {
        const pose = { x: 403, y: 485, scale: .73, rotation, facing };
        const paper = inkDesignToPaper(pose, design, anchor);
        const restored = inkPaperToDesign(pose, design, paper);
        expect(restored.x).toBeCloseTo(anchor.x, 9);
        expect(restored.y).toBeCloseTo(anchor.y, 9);
      }
    }
    const pose = { x: 400, y: 450, scale: .8, rotation: 0, facing: "left" as const };
    const original = inkDesignToPaper(pose, design, anchor);
    expect(original.x).toBeLessThan(pose.x);
    expect(() => inkPaperToDesign({ ...pose, scale: 0 }, design, original)).toThrow(RangeError);
  });
  it("aims at the partner's actual animated eye anchor after head acting", () => {
    const duet = inkDuet("landscape"), state = inkEnsembleAt(duet.plan, 202);
    const source = state.actors.find(actor => actor.id === "master")!;
    const partner = state.actors.find(actor => actor.id === "learner")!;
    const performer = duet.cast.find(member => member.trackId === "learner")!;
    const eye = evaluateCharacter(performer.definition, performer.instance,
      performer.cues, 202).anchors.eyes;
    expect(eye).toBeDefined();
    const precise = inkPartnerLookTarget(source.pose, partner.pose,
      duet.cast[0].definition.design, performer.definition.design, eye);
    const expectedWorld = inkDesignToPaper(partner.pose, performer.definition.design, eye);
    const back = inkDesignToPaper(source.pose, duet.cast[0].definition.design, precise);
    expect(back.x).toBeCloseTo(expectedWorld.x, 6);
    expect(back.y).toBeCloseTo(expectedWorld.y, 6);
    const approximate = inkPartnerLookTarget(source.pose, partner.pose,
      duet.cast[0].definition.design, performer.definition.design);
    expect(Math.hypot(precise.x - approximate.x, precise.y - approximate.y))
      .toBeGreaterThan(.01);
  });
  it("does not turn approximate root reach into a verified hand-to-hand contact", () => {
    const duet = inkDuet("landscape");
    const root = inkEnsembleAt(duet.plan, 188).contacts[0];
    expect(root.withinReach).toBe(true);
    const actual = auditInkEnsembleHands(duet.plan, duet.cast, 188);
    expect(actual).toHaveLength(1);
    expect(actual[0].missingAnchor).toBe(false);
    expect(actual[0].handGap).not.toBeNull();
    expect(actual[0].maxHandGap).toBe(12);
    // A 0-pixel contact requirement must never pass unless anchors actually coincide.
    expect(auditInkEnsembleHands(duet.plan, duet.cast, 188, false, 0)[0].handContact)
      .toBe(false);
    const missing = duet.cast.map(member => member.trackId === "learner"
      ? { ...member, definition: { ...member.definition, anchors: {} } } : member);
    expect(auditInkEnsembleHands(duet.plan, missing, 188)[0]).toMatchObject({
      missingAnchor: true, handGap: null, handContact: false,
    });
    expect(() => auditInkEnsembleHands(duet.plan, duet.cast, 188, false, Infinity))
      .toThrow(RangeError);
  });
  it("revisiting a previously evaluated absolute frame returns identical poses", () => {
    const plan = inkDuet("landscape").plan;
    const first = inkEnsembleAt(plan, 188);
    inkEnsembleAt(plan, 328); inkEnsembleAt(plan, 0);
    expect(inkEnsembleAt(plan, 188)).toEqual(first);
  });
});
