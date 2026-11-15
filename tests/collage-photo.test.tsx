import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CollageNode, CollageSceneSpec } from "../registry/video/collage/collage-scene";
import { inspectCollageScene } from "../registry/video/collage/collage-scene";
import { CollageScene } from "../registry/video/collage/collage-react";
import { archivalPrint, clockHandKeys, cutLetters, documentScan, mergeKeys, photoCutout, photoRig, scraps, sourceLine, tickingSecondKeys, yearBox } from "../registry/video/collage/collage-kit-photo";
import { watchRig } from "../src/video/collage-watch-rig";
import { compileFilm } from "../registry/video/film-document";
import { PHOTO_REGISTER_SHOTS, PHOTO_REGISTER_TEARS } from "../src/video/collage-photo-registers";
import { collageFilm } from "../src/video/collage-film";
import archive from "../examples/film/editorial-collage-archive.film.json";

const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const scene = (nodes: CollageNode[], extra: Partial<CollageSceneSpec> = {}): CollageSceneSpec =>
  ({ version: 1, id: "p", width: 1280, height: 720, durationFrames: 120, seed: 5, board: { material: "flat", color: "#f4d21f", halftone: { color: "#1d1b19" } }, palette: { ink: "#1d1b19", paper: "#f3eee2" }, nodes, ...extra });
const render = (spec: CollageSceneSpec, frame: number, reduced = false) => renderToStaticMarkup(<CollageScene spec={spec} frame={frame} reducedMotion={reduced} />);

describe("COLLAGE1 photo registers", () => {
  it("accepts every archive shot in both aspects and keeps the committed film current", () => {
    for (const shot of PHOTO_REGISTER_SHOTS) for (const aspect of ["landscape", "portrait"] as const)
      expect(inspectCollageScene(shot.build(aspect)), shot.id + "/" + aspect).toEqual([]);
    const doc = collageFilm(PHOTO_REGISTER_SHOTS, {}, { id: "editorial-collage-archive", tears: PHOTO_REGISTER_TEARS });
    expect(JSON.parse(JSON.stringify(doc))).toEqual(archive);
    for (const outputId of ["landscape", "portrait"]) expect(compileFilm(doc, { outputId }).ok).toBe(true);
  });

  it("gives a cut-out photo a sticker border and shadow from its own alpha, and prints it through a dot screen", () => {
    const spec = scene(photoCutout("watch", { x: 640, y: 360, width: 300, height: 420, href: PIXEL, sticker: 12, torn: true,
      treatment: { mode: "halftone", ink: "ink", paper: "paper", cell: 6 }, disc: { radius: 200, fill: "#c62f26", halftone: "ink" } }));
    expect(inspectCollageScene(spec)).toEqual([]);
    const html = render(spec, 30);
    expect(html).toContain('operator="dilate" radius="12"');
    expect(html).toContain("feDisplacementMap");
    expect(html).toContain("feTile");
    expect(html).toContain('data-km-collage-node="watch-disc"');
    // The board's corner halftone is drawn from real dots.
    expect(html.match(/a[\d.]+ [\d.]+ 0 1 0/g)!.length).toBeGreaterThan(200);
  });

  it("rejects a sticker on a photo that has no transparency and a bad Ken Burns", () => {
    const errors = inspectCollageScene(scene([{ id: "a", kind: "image", href: PIXEL, width: 10, height: 10, sticker: { width: 4 }, kenBurns: { start: 10, end: 5, to: 9 } }]));
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining("sticker needs cutout"), expect.stringContaining("kenBurns")]));
  });

  it("pushes a print linearly inside its frame on the absolute frame (not on twos)", () => {
    const spec = scene(archivalPrint("print", { x: 640, y: 360, width: 400, height: 300, href: PIXEL, kenBurns: { start: 0, end: 100, to: 1.2, pan: [.5, 0] }, tag: { text: "Somewhere · 1900" } }));
    const scaleAt = (f: number) => Number(/scale\(([\d.]+)\)"/.exec(render(spec, f).split('data-km-collage-node="print-photo"')[1])![1]);
    expect(scaleAt(0)).toBe(1);
    expect(scaleAt(50)).toBeCloseTo(1.1, 3);
    expect(scaleAt(51)).not.toBe(scaleAt(50));
    expect(scaleAt(100)).toBeCloseTo(1.2, 3);
  });

  it("places document highlights and the spotlight on the scan's own pixel coordinates", () => {
    const nodes = documentScan("doc", { x: 0, y: 0, width: 500, height: 500, href: PIXEL, sourceWidth: 1000, sourceHeight: 1000,
      highlights: [{ rect: [100, 200, 300, 220], frame: 10 }], spotlight: { rect: [100, 200, 300, 240], frame: 20 } });
    const hl = nodes.find(n => n.id === "doc-hl-0") as Extract<CollageNode, { kind: "marker" }>;
    // 100..300 px of a 1000 px scan shown 500 wide, centred: -200..-100 (plus a 4 px overshoot each side).
    expect(hl.d).toBe("M-204 -145L-96 -145");
    const spot = nodes.find(n => n.id === "doc-spot") as Extract<CollageNode, { kind: "spotlight" }>;
    expect([spot.x, spot.y, spot.width, spot.height]).toEqual([-150, -140, 128, 48]);
    const html = render(scene(nodes), 40);
    expect(html).toContain('fill-rule="evenodd"');
  });

  it("builds lettering chips, scraps, year boxes and source lines that validate and settle under reduced motion", () => {
    const nodes = [...cutLetters("q", { x: 100, y: 200, text: "WHO SET", size: 80, chips: ["paper"], inks: ["ink"], frame: 0 }),
      ...scraps("s", { box: { x: 0, y: 0, width: 600, height: 300 }, count: 6, colors: ["ink"], frame: 0 }),
      ...yearBox("y", { x: 900, y: 200, text: "1884", frame: 4 }), sourceLine("src", { text: "Source · Archive", x: 40, y: 700, backing: "ink", color: "paper" })];
    expect(nodes.filter(n => n.id.startsWith("q-c"))).toHaveLength(6);
    const spec = scene(nodes, { board: { material: "slate", grid: { spacing: 32 } } });
    expect(inspectCollageScene(spec)).toEqual([]);
    expect(render(spec, 0, true)).toBe(render(spec, 50, true));
  });
});

describe("COLLAGE1 photo rigs (parts of one photo animated separately)", () => {
  it("turns photographed hands from their photographed angle to clock times, and ticks seconds", () => {
    expect(clockHandKeys("minute", 288.8, [{ frame: 0, hours: 4.8 }, { frame: 10, hours: 12 }]).map(k => k.rotate)).toEqual([1439.2, 4031.2]);
    expect(clockHandKeys("hour", 146.4, [{ frame: 0, hours: 12 }])[0].rotate).toBeCloseTo(213.6);
    const ticks = tickingSecondKeys(122.4, { frame: 30, startSecond: 20, seconds: 2 });
    expect(ticks.map(k => k.frame)).toEqual([30, 60, 64, 90, 94]);
    expect(ticks[ticks.length - 1].rotate).toBeCloseTo(22 * 6 - 122.4);
    expect(mergeKeys([{ frame: 5, lift: 1 }, { frame: 0, x: 2 }, { frame: 5, rotate: 3 }])).toEqual([{ frame: 0, x: 2 }, { frame: 5, lift: 1, rotate: 3 }]);
  });

  it("puts each part back where it was in the photo, pivoting on its axle, with one print screen for the rig", () => {
    const nodes = photoRig("w", { x: 0, y: 0, href: PIXEL, sourceWidth: 1000, sourceHeight: 1000, width: 500, treatment: { mode: "halftone" }, disc: { radius: 100, fill: "#c62f26" },
      parts: [{ id: "hand", href: PIXEL, box: [500, 300, 520, 500], pivot: [510, 500], keys: [{ frame: 0, rotate: 30 }] }] });
    const hand = nodes.find(n => n.id === "w-hand") as Extract<CollageNode, { kind: "image" }>;
    expect([hand.x, hand.y, hand.width, hand.height, hand.pivot]).toEqual([5, -50, 10, 100, [0, 50]]);
    expect(hand.keys).toEqual([{ frame: 0, lift: .06, rotate: 30 }]);
    expect(nodes.find(n => n.id === "w-print")!.print?.mode).toBe("halftone");
    expect(nodes.find(n => n.id === "w-disc")!.parent).toBe("w");
    const apart = photoRig("w", { href: PIXEL, sourceWidth: 1000, sourceHeight: 1000, width: 500, explode: 1, parts: [{ id: "hand", href: PIXEL, box: [500, 300, 520, 500] }] });
    const lifted = apart.find(n => n.id === "w-hand") as Extract<CollageNode, { kind: "image" }>;
    expect(lifted.x! < 5 && lifted.y! < -50).toBe(true);
  });

  it("validates the taken-apart watch and renders its minute hand at different angles over time", () => {
    const spec = scene(watchRig("watch", { x: 640, y: 360, width: 300, time: [{ frame: 0, hours: 4.8 }, { frame: 100, hours: 12, ease: "linear" }],
      ticking: { frame: 0, startSecond: 0, seconds: 3 }, bowFlops: [10] }));
    expect(inspectCollageScene(spec)).toEqual([]);
    const angle = (frame: number) => /rotate\((-?[\d.]+)\)/.exec(render(spec, frame).split('data-km-collage-node="watch-minute"')[1])![1];
    expect(angle(20)).not.toBe(angle(60));
    expect(render(spec, 60)).toBe(render(spec, 60));
  });
});
