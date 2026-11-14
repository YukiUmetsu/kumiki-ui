import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cameraAt, carvedLine, scrollPan, windAt } from "../registry/video/ukiyoe/ukiyoe-core";
import { drawFigure, facingAt, figurePose, travelAt } from "../registry/video/ukiyoe/ukiyoe-figure";
import { drawMotif, UKIYOE_MOTIFS } from "../registry/video/ukiyoe/ukiyoe-motifs";
import { drawParticles } from "../registry/video/ukiyoe/ukiyoe-particles";
import { palette, resolvePaint } from "../registry/video/ukiyoe/ukiyoe-pigments";
import { nodeState, UkiyoeScene } from "../registry/video/ukiyoe/ukiyoe-react";
import type { UkiyoeSceneSpec } from "../registry/video/ukiyoe/ukiyoe-scene";
import { inspectUkiyoeScene } from "../registry/video/ukiyoe/ukiyoe-scene";
import { kasumiBand } from "../registry/video/ukiyoe/ukiyoe-transitions";
import { compileFilm } from "../registry/video/film-document";
import { NIGHT_FERRY_SHOTS } from "../src/video/ukiyoe-night-ferry";
import { KASUMI_INTO, ukiyoeFilm } from "../src/video/ukiyoe-film";
import { renderUkiyoeSlot } from "../src/video/ukiyoe-slot";
import { ukiyoeFrameAtElapsed } from "../src/video/ukiyoe-studio";

const scene = (extra: Partial<UkiyoeSceneSpec> = {}): UkiyoeSceneSpec => ({ version: 1, id: "t", width: 640, height: 360, durationFrames: 60, seed: 3, nodes: [], ...extra });

describe("UKIYO1 scene contract", () => {
  it("accepts every Night Ferry shot in both aspects", () => {
    for (const shot of NIGHT_FERRY_SHOTS) for (const aspect of ["landscape", "portrait"] as const)
      expect(inspectUkiyoeScene(shot.build(aspect)), shot.id + "/" + aspect).toEqual([]);
  });
  it("reports path-specific errors instead of drawing something else", () => {
    const issues = inspectUkiyoeScene(scene({ nodes: [
      { id: "a", kind: "motif", motif: "volcano" as never },
      { id: "b", kind: "block", d: "javascript:alert(1)", fill: "neon" },
      { id: "c", kind: "figure", look: { hair: "mohawk" as never }, actions: [{ type: "walk", start: 10, end: 5 }] },
      { id: "a", kind: "group", parent: "nope" },
    ] }));
    const paths = issues.map(i => i.path);
    expect(paths).toEqual(expect.arrayContaining(["$.nodes[0].motif", "$.nodes[1].d", "$.nodes[1].fill", "$.nodes[2].look.hair", "$.nodes[2].actions[0]", "$.nodes[2].actions[0].to", "$.nodes[3].id", "$.nodes[3].parent"]));
    expect(() => renderToStaticMarkup(<UkiyoeScene spec={scene({ nodes: [{ id: "x", kind: "block", fill: "neon", d: "M0 0h1v1z" }] })} frame={0} />)).toThrow(/Invalid UKIYO1 scene/);
  });
  it("resolves palette roles per preset and rejects unknown paints", () => {
    expect(resolvePaint("bero", palette("edo"))).toMatch(/^#/);
    expect(palette("aizuri").beni).not.toBe(palette("edo").beni);
    expect(() => resolvePaint("neon", palette())).toThrow(RangeError);
  });
});

describe("UKIYO1 frame purity", () => {
  it("renders the same markup for a frame whatever the seek order", () => {
    const spec = NIGHT_FERRY_SHOTS[3].build("landscape");
    const at = (f: number) => renderToStaticMarkup(<UkiyoeScene spec={spec} frame={f} />).replace(/uk[A-Za-z0-9]*?-/g, "");
    const forward = [40, 200, 260].map(at), shuffled = [260, 40, 200].map(at);
    expect(shuffled).toEqual([forward[2], forward[0], forward[1]]);
    expect(forward[0]).not.toEqual(forward[1]);
  });
  it("draws every motif deterministically and lets wind move the trees", () => {
    for (const m of UKIYOE_MOTIFS) {
      const a = drawMotif(m, {}, { frame: 30, wind: .5, seed: 4, progress: 1 });
      expect(a.length, m).toBeGreaterThan(0);
      expect(drawMotif(m, {}, { frame: 30, wind: .5, seed: 4, progress: 1 })).toEqual(a);
    }
    const calm = JSON.stringify(drawMotif("willow", {}, { frame: 30, wind: 0, seed: 4, progress: 1 }));
    expect(JSON.stringify(drawMotif("willow", {}, { frame: 30, wind: 1.5, seed: 4, progress: 1 }))).not.toEqual(calm);
  });
  it("raises and breaks the wave from its progress and break frame", () => {
    const extent = (p: number, frame: number) => {
      const d = drawMotif("wave", { breakAt: 100 }, { frame, wind: 0, seed: 1, progress: p })[0];
      const ys = [...(d as { d: string }).d.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number).filter((_, i) => i % 2 === 1);
      return -Math.min(...ys);
    };
    expect(extent(1, 0)).toBeGreaterThan(extent(.2, 0) * 2.5);
    expect(extent(1, 140)).toBeLessThan(extent(1, 0) * .7);
  });
  it("animates particles in closed form", () => {
    const rain = (f: number) => drawParticles({ type: "rain", count: 40 }, f, 0, 9);
    expect(rain(12)).toEqual(rain(12));
    expect(rain(12)).not.toEqual(rain(13));
    const fw = drawParticles({ type: "fireworks", bursts: [{ frame: 50, x: 100, y: 100 }] }, 70, 0, 2);
    expect(fw.some(p => p.t === "glow")).toBe(true);
  });
});

describe("UKIYO1 figures", () => {
  it("travels by walk/run segments, faces the direction of travel and turns at the midpoint", () => {
    const actions = [{ type: "walk" as const, start: 0, end: 60, to: -300 }, { type: "turn" as const, start: 70, end: 80 }];
    expect(travelAt(actions, 0).x).toBe(0);
    expect(travelAt(actions, 60).x).toBe(-300);
    expect(travelAt(actions, 30).x).toBeLessThan(-100);
    expect(facingAt({ look: {}, actions }, 30).dir).toBe(-1);
    expect(facingAt({ look: {}, actions }, 76).dir).toBe(1);
  });
  it("kneels, bows and blends actions without discontinuities", () => {
    const spec = { look: {}, actions: [{ type: "kneel" as const, start: 10, end: 90 }, { type: "bow" as const, start: 30, end: 80 }] };
    expect(figurePose(spec, 50, 1, 250).kneel).toBe(1);
    expect(figurePose(spec, 50, 1, 250).lean).toBeGreaterThan(20);
    for (let f = 0; f < 100; f++) expect(Math.abs(figurePose(spec, f + 1, 1, 250).lean - figurePose(spec, f, 1, 250).lean)).toBeLessThan(12);
  });
  it("blows sleeves and hems with the wind", () => {
    const look = { sleeves: "long" as const, hair: "shimada" as const };
    expect(JSON.stringify(drawFigure({ look }, 20, 1.5, 3).prims)).not.toEqual(JSON.stringify(drawFigure({ look }, 20, 0, 3).prims));
  });
});

describe("UKIYO1 print, camera and transitions", () => {
  it("prints the key block first and colours after it during the print pass", () => {
    const spec = NIGHT_FERRY_SHOTS[0].build("landscape");
    const fillsAt = (p: number) => (renderToStaticMarkup(<UkiyoeScene spec={spec} frame={100} printProgress={p} />).match(/<path d="[^"]+" fill="#/g) ?? []).length;
    expect(fillsAt(.02)).toBeLessThan(fillsAt(.5));
    expect(fillsAt(.5)).toBeLessThan(fillsAt(.99));
    const proof0 = renderToStaticMarkup(<UkiyoeScene spec={spec} frame={170} proof={0} />), proof8 = renderToStaticMarkup(<UkiyoeScene spec={spec} frame={170} proof={8} />);
    expect(proof0.length).toBeLessThan(proof8.length);
  });
  it("pans the handscroll with holds at stations and keeps parallax and wind pure", () => {
    const keys = scrollPan({ from: 4000, to: 1000, y: 540, start: 0, end: 300, stations: [{ x: 3000, hold: 40 }] });
    const x = (f: number) => cameraAt({ keys }, f, 1920, 1080).x;
    expect(x(0)).toBe(4000);
    expect(x(300)).toBe(1000);
    const hold = keys.findIndex(k => k.x === 3000);
    expect(x(keys[hold].frame + 10)).toBe(3000);
    expect(windAt({ gusts: [{ frame: 10, duration: 40, strength: 2 }] }, 25, 1)).toBeGreaterThan(1);
    expect(carvedLine([[0, 0], [100, 0]], 6)).toMatch(/^M.*Z$/);
  });
  it("sweeps kasumi bands fully across and enters/exits nodes on their frames", () => {
    expect(kasumiBand(0, 6, 0, 1920, 7).lead).toBeGreaterThan(1920);
    expect(kasumiBand(0, 6, 1, 1920, 7).trail).toBeLessThan(0);
    // Every band covers the full width at some point of the sweep, so no strip ever cuts straight between shots.
    for (let i = 0; i < 6; i++) expect(Array.from({ length: 101 }, (_, k) => kasumiBand(i, 6, k / 100, 1920, 7)).some(b => b.lead < 0 && b.trail > 1920), "band " + i).toBe(true);
    const node = { id: "n", kind: "group" as const, enter: { preset: "stamp" as const, frame: 10, duration: 8 } };
    expect(nodeState(node, 5, 2).visible).toBe(false);
    expect(nodeState(node, 30, 2).pose.scale).toBeCloseTo(1, 5);
  });
  it("compiles the Night Ferry film for both outputs and renders its slots", () => {
    const doc = ukiyoeFilm();
    for (const outputId of ["landscape", "portrait"]) {
      const result = compileFilm(doc, { outputId });
      expect(result.ok, JSON.stringify(!result.ok && result.diagnostics)).toBe(true);
      if (result.ok) expect(result.film.durationFrames).toBe(NIGHT_FERRY_SHOTS.reduce((s, x) => s + x.build("landscape").durationFrames, 0));
    }
    const scenes = (doc as unknown as { scenes: { content: { slot: string; label: string; props: Record<string, unknown> } }[] }).scenes;
    expect(scenes.filter(s => s.content.slot === "ukiyoe-kasumi")).toHaveLength(Object.keys(KASUMI_INTO).length);
    const ctx = { frame: 5, durationFrames: 20, width: 1920, height: 1080, reducedMotion: false };
    for (const s of scenes.slice(0, 3)) expect(renderToStaticMarkup(<>{renderUkiyoeSlot(s.content, ctx)}</>)).toContain("<svg");
    expect(renderUkiyoeSlot({ slot: "other", label: "x" }, ctx)).toBeUndefined();
  });
  it("samples playback from elapsed time, not paint count", () => {
    expect(ukiyoeFrameAtElapsed(10, 1000, 100)).toBe(40);
    expect(ukiyoeFrameAtElapsed(90, 1000, 100)).toBe(99);
    expect(ukiyoeFrameAtElapsed(90, 1000, 100, 1, true)).toBe(20);
  });
});
