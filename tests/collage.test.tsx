import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { flattenPath, paperEdge, shapeLoops, signedArea } from "../registry/video/collage/collage-geometry";
import { cameraAt, ease, steppedFrame } from "../registry/video/collage/collage-motion";
import { cutoutGeometry, halftoneDots, nodeState, textLayout } from "../registry/video/collage/collage-build";
import type { CollageNode, CollageSceneSpec } from "../registry/video/collage/collage-scene";
import { inspectCollageScene } from "../registry/video/collage/collage-scene";
import { puppetPose } from "../registry/video/collage/collage-puppet";
import { measureText } from "../registry/video/collage/collage-type";
import { clock, mapPin } from "../registry/video/collage/collage-kit";
import { CollageScene } from "../registry/video/collage/collage-react";
import { tearHalfTransform, tearLine } from "../registry/video/collage/collage-tear";
import { compileFilm } from "../registry/video/film-document";
import { STANDARD_TIME_SHOTS } from "../src/video/collage-standard-time";
import { collageFilm, TEAR_INTO } from "../src/video/collage-film";
import { renderCollageSlot } from "../src/video/collage-slot";
import portable from "../examples/film/editorial-collage.film.json";

const scene = (nodes: CollageNode[], extra: Partial<CollageSceneSpec> = {}): CollageSceneSpec =>
  ({ version: 1, id: "t", width: 640, height: 360, durationFrames: 60, seed: 3, board: { material: "kraft" }, palette: { accent: "#cf3b2a" }, nodes, ...extra });

describe("COLLAGE1 paper geometry", () => {
  it("tears the same edge every time and a different edge for another seed", () => {
    const [rect] = shapeLoops({ type: "rect", width: 200, height: 120 });
    const a = paperEdge(rect, { style: "torn", seed: 9 }), b = paperEdge(rect, { style: "torn", seed: 9 }), c = paperEdge(rect, { style: "torn", seed: 10 });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    // A tear roughens the outline but keeps the sheet's area within a few percent.
    expect(Math.abs(Math.abs(signedArea(a)) / 24000 - 1)).toBeLessThan(.05);
  });
  it("flattens every SVG path command into polylines", () => {
    const sub = flattenPath("M0 0L10 0h10v10C30 20 40 20 50 10S70 0 80 10Q90 20 100 10T120 10A10 10 0 0 1 140 10Z");
    expect(sub).toHaveLength(1);
    expect(sub[0].closed).toBe(true);
    expect(sub[0].points.length).toBeGreaterThan(20);
    expect(() => flattenPath("javascript:alert(1)")).toThrow(RangeError);
  });
  it("grows halftone dots toward the shaded side", () => {
    const dots = halftoneDots({ x: -100, y: -50, width: 200, height: 100 }, { color: "#000000", toward: 0, from: 0, to: .7, cell: 10, angle: 0 });
    const radii = [...dots.matchAll(/M(-?[\d.]+) (-?[\d.]+)a([\d.]+)/g)].map(m => ({ x: Number(m[1]) + Number(m[3]), r: Number(m[3]) }));
    const left = radii.filter(d => d.x < -40), right = radii.filter(d => d.x > 40);
    const mean = (l: { r: number }[]) => l.reduce((s, d) => s + d.r, 0) / Math.max(1, l.length);
    expect(mean(right)).toBeGreaterThan(mean(left) * 1.6);
  });
  it("caches geometry per node and adds a white fibre core to torn paper", () => {
    const node: CollageNode = { id: "sheet", kind: "cutout", shape: { type: "ellipse", rx: 50, ry: 30 }, fill: "#ffffff", edge: "torn" };
    const g = cutoutGeometry(node, 1);
    expect(cutoutGeometry(node, 1)).toBe(g);
    expect(g.core).toBeDefined();
    expect(g.silhouette).toBe(g.core);
  });
});

describe("COLLAGE1 validation", () => {
  it("accepts every showcase shot in both aspects", () => {
    for (const shot of STANDARD_TIME_SHOTS) for (const aspect of ["landscape", "portrait"] as const)
      expect(inspectCollageScene(shot.build(aspect)), shot.id + "/" + aspect).toEqual([]);
  });
  it("reports path-specific errors instead of drawing something else", () => {
    const errors = inspectCollageScene(scene([
      { id: "a", kind: "cutout", shape: { type: "rect", width: 10, height: 10 }, fill: "accentt" },
      { id: "b", kind: "text", parent: "nope", text: "x", size: 20, color: "#000000" },
      { id: "c", kind: "cutout", shape: { type: "path", d: "<script>" }, fill: "#000000", follow: { path: "a", start: 0, end: 10 } },
      { id: "a", kind: "tape", length: 40 },
      { id: "p", kind: "puppet", look: { skin: "#000000", hair: "#000000", top: "#000000", bottom: "#000000", shoes: "#000000", hairStyle: "mohawk" as never }, actions: [{ type: "walk", start: 0, end: 10 }] },
    ]));
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining("nodes[0].fill"),
      expect.stringContaining("nodes[1].parent \"nope\" does not exist"),
      expect.stringContaining("nodes[2].shape.d"),
      expect.stringContaining("follow.path must be a route or marker"),
      expect.stringContaining("nodes[3].id \"a\" is used twice"),
      expect.stringContaining("look.hairStyle"),
      expect.stringContaining("walk/run needs toX"),
    ]));
  });
});

describe("COLLAGE1 motion is a pure function of the frame", () => {
  const spec = scene([
    { id: "card", kind: "cutout", x: 100, y: 100, shape: { type: "rect", width: 80, height: 50 }, fill: "accent",
      enter: { preset: "drop", frame: 4, duration: 12 }, keys: [{ frame: 20, x: 100 }, { frame: 50, x: 400, ease: "back" }], loops: [{ kind: "sway", period: 30 }] },
  ]);
  const card = spec.nodes[0];
  it("returns the same pose in any seek order", () => {
    const forward = [0, 7, 19, 33, 48, 59].map(f => nodeState(spec, card, f, {}));
    const shuffled = [48, 0, 59, 19, 7, 33].map(f => [f, nodeState(spec, card, f, {})] as const).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    expect(shuffled).toEqual(forward);
  });
  it("holds paper on twos while the camera moves every frame", () => {
    expect(nodeState(spec, card, 30, {}).pose).toEqual(nodeState(spec, card, 31, {}).pose);
    expect(nodeState(spec, card, 31, {}).pose).not.toEqual(nodeState(spec, card, 32, {}).pose);
    const cam = [{ frame: 0, x: 0, y: 0, zoom: 1 }, { frame: 59, x: 100, y: 0, zoom: 1.2 }];
    expect(cameraAt(cam, 30, 640, 360).x).not.toBe(cameraAt(cam, 31, 640, 360).x);
    expect(steppedFrame(31, 2)).toBe(30);
  });
  it("hides a piece before its entrance and lands it afterwards", () => {
    expect(nodeState(spec, card, 2, {}).visible).toBe(false);
    const landed = nodeState(spec, card, 18, {}).pose;
    expect(landed.lift).toBe(0);
    expect(ease("back", 1)).toBeCloseTo(1);
  });
});

describe("COLLAGE1 puppets and type", () => {
  it("walks to its destination with the steps it needs and blinks on schedule", () => {
    const actions = [{ type: "walk" as const, start: 10, end: 70, toX: 300 }];
    expect(puppetPose(actions, 0, 1, 3).x).toBe(0);
    expect(puppetPose(actions, 70, 1, 3).x).toBeCloseTo(300);
    expect(puppetPose(actions, 90, 1, 3).x).toBeCloseTo(300);
    const mid = puppetPose(actions, 40, 1, 3);
    expect(Math.abs(mid.legFront.hip - mid.legBack.hip)).toBeGreaterThan(0);
    expect(puppetPose(actions, 40, 1, 3)).toEqual(mid);
    const closed = Array.from({ length: 400 }, (_, f) => puppetPose([], f, 5, 3).eyes).filter(e => e === 0).length;
    expect(closed).toBeGreaterThanOrEqual(8);
    expect(closed).toBeLessThan(40);
  });
  it("measures heavier weights wider and CJK at one em per glyph", () => {
    expect(measureText("Railroads", { role: "body", size: 50, weight: 800 })).toBeGreaterThan(measureText("Railroads", { role: "body", size: 50, weight: 400 }) * 1.06);
    expect(measureText("時間", { role: "label", size: 40 })).toBe(80);
    const layout = textLayout({ id: "t", kind: "text", text: "one two three four five six", size: 40, color: "#000000", maxWidth: 200 });
    expect(layout.lines.length).toBeGreaterThan(1);
    for (const line of layout.lines) expect(line.width).toBeLessThanOrEqual(200);
  });
});

describe("COLLAGE1 rendering and film", () => {
  it("renders identical markup for the same frame and the settled frame under reduced motion", () => {
    const spec = scene([...clock("clock", { x: 320, y: 180, radius: 60, time: [{ frame: 0, hours: 9 }, { frame: 50, hours: 12 }] }), ...mapPin("pin", { x: 100, y: 300, dropAt: 10 })]);
    const at = (frame: number, reduced = false) => renderToStaticMarkup(<CollageScene spec={spec} frame={frame} reducedMotion={reduced} />);
    expect(at(25)).toBe(at(25));
    expect(at(25)).toContain('data-km-collage-node="clock-minute"');
    // Reduced motion shows the settled last frame, without drift, whatever frame is asked for.
    expect(at(0, true)).toBe(at(40, true));
    expect(at(0, true)).toContain('data-km-collage-frame="59"');
    expect(at(0, true)).toContain('data-km-collage-node="pin"');
    expect(at(0)).not.toContain('data-km-collage-node="pin"');
    expect(() => at(-1)).toThrow(RangeError);
  });
  it("compiles the showcase film in both outputs with tears that never repeat a frame", () => {
    const doc = collageFilm();
    for (const outputId of ["landscape", "portrait"]) {
      const compiled = compileFilm(doc, { outputId });
      expect(compiled.ok).toBe(true);
      if (compiled.ok) expect(compiled.film.durationFrames).toBe(STANDARD_TIME_SHOTS.reduce((s, shot) => s + shot.build("landscape").durationFrames, 0));
    }
    const tear = (doc.scenes as unknown as { id: string; content: { props: { startFrame?: number } } }[]).find(s => s.id === "two-noons");
    expect(tear?.content.props.startFrame).toBe(TEAR_INTO["two-noons"]);
    expect(JSON.parse(JSON.stringify(doc))).toEqual(portable);
  });
  it("renders slots through the shared renderer and rejects a mismatched aspect", () => {
    const doc = collageFilm() as unknown as { scenes: { content: { slot: string; label: string; props: Record<string, unknown> } }[] };
    const tear = doc.scenes.find(s => s.content.slot === "collage-tear")!.content;
    const html = renderToStaticMarkup(<>{renderCollageSlot(tear, { frame: 8, durationFrames: 22, width: 1920, height: 1080, reducedMotion: false })}</>);
    expect(html).toContain("data-km-collage-tear");
    expect(() => renderCollageSlot(doc.scenes[0].content, { frame: 0, durationFrames: 10, width: 1000, height: 1000, reducedMotion: false })).toThrow(RangeError);
    expect(renderCollageSlot({ slot: "other", label: "x" }, { frame: 0, durationFrames: 1, width: 10, height: 10, reducedMotion: false })).toBeUndefined();
  });
  it("tears from above the frame to below it and pulls both halves out", () => {
    const line = tearLine(1920, 1080, 4);
    expect(line[0][1]).toBeLessThan(0);
    expect(line[line.length - 1][1]).toBeGreaterThan(1080);
    expect(tearHalfTransform(-1, 0, 1920, 1080, line[line.length - 1])).toContain("translate(0 0) rotate(0");
    expect(tearHalfTransform(1, 1, 1920, 1080, line[line.length - 1])).toMatch(/^translate\(1497\.6 /);
  });
});
