import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluatePaperSheet, inspectPaperSheet, inspectPaperSheetMotion, paperFramePoint } from "../registry/motion/paper-sheet";
import type { PaperFacet, PaperSheetSpec } from "../registry/motion/paper-sheet";
import { PAPER_STOCKS, paperGravityLength, paperPeelRadius, paperTransmittance } from "../registry/motion/paper-sheet-stock";
import { paperShade, paperShadowSlices, paperViewMatrix } from "../registry/motion/paper-sheet-light";
import { PaperSheetSvg } from "../registry/motion/paper-sheet-svg";
import { evaluatePaperCraft, inspectPaperCraft } from "../registry/video/paper-craft";
import { inspectCollageScene } from "../registry/video/collage/collage-scene";
import { paperPhysicalSceneSpec } from "../src/video/paper-physical-scene";
import { bakePaperBook, inspectPaperBook, inspectPaperBookContacts } from "../registry/motion/paper-book";
import { paperBookSoundCues, paperSheetSoundCues } from "../registry/motion/paper-sound";

const RECT = "M0 0H400V300H0Z";

function area(ring: Float64Array): number {
  let a = 0;
  const n = ring.length >> 1;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) a += ring[2 * j] * ring[2 * i + 1] - ring[2 * i] * ring[2 * j + 1];
  return a / 2;
}

const facetArea = (f: PaperFacet) => f.rings.reduce((sum, r, i) => sum + (i === 0 ? 1 : -1) * Math.abs(area(r)), 0);

/** Paper cannot stretch: every facet's map keeps lengths and right angles (chords may shorten a hair). */
function expectIsometric(spec: PaperSheetSpec, frame = 0, sheetArea = 120000) {
  const sheet = evaluatePaperSheet(spec, frame);
  const total = sheet.facets.reduce((sum, f) => sum + facetArea(f), 0);
  expect(total).toBeCloseTo(sheetArea, 3);
  for (const facet of sheet.facets) {
    const f = facet.frame;
    const lu = Math.hypot(f[0], f[1], f[2]);
    const lv = Math.hypot(f[3], f[4], f[5]);
    expect(lu).toBeLessThanOrEqual(1 + 1e-9);
    expect(lu).toBeGreaterThan(0.995);
    expect(lv).toBeGreaterThan(0.995);
    // A band is drawn as the chord of its arc, a few millionths shorter, which skews oblique bands that much.
    expect(Math.abs(f[0] * f[3] + f[1] * f[4] + f[2] * f[5])).toBeLessThan(1e-5);
  }
  return sheet;
}

describe("paper sheet geometry", () => {
  it("keeps area and lengths through folds, bends, peels and rolls", () => {
    expectIsometric({ outline: RECT, bends: [{ id: "f", kind: "fold", line: [[200, 0], [200, 300]], flap: [300, 150], angle: 170, radius: 6 }] });
    expectIsometric({ outline: RECT, bends: [{ id: "b", kind: "bend", line: [[100, 0], [100, 300]], flap: [300, 150], angle: 90, length: 120 }] });
    expectIsometric({ outline: RECT, bends: [{ id: "p", kind: "peel", line: [[0, 0], [0, 300]], flap: [-10, 150], angle: 140, offset: 180 }] });
    expectIsometric({ outline: RECT, bends: [{ id: "r", kind: "roll", line: [[150, 0], [150, 300]], flap: [300, 150], angle: 900, radius: 20, gravity: 0 }] });
  });

  it("joins neighbouring bands without gaps", () => {
    const sheet = evaluatePaperSheet({ outline: RECT, bends: [{ id: "f", kind: "fold", line: [[200, 0], [200, 300]], flap: [300, 150], angle: 120, radius: 20, gravity: 0 }] }, 0);
    const bands = sheet.facets.filter((f) => f.bend === "f").sort((a, b) => a.band - b.band);
    expect(bands.length).toBeGreaterThan(5);
    for (let k = 0; k + 1 < bands.length; k += 1) {
      // The far edge of one band is the near edge of the next: the same material line lands in the same place.
      const [x, y] = bands[k].shadeTo;
      const a = paperFramePoint(bands[k].frame, x, y + 40);
      const b = paperFramePoint(bands[k + 1].frame, x, y + 40);
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(1e-6);
    }
  });

  it("nests a bend on its parent's flap and keeps them attached", () => {
    const sheet = expectIsometric({
      outline: RECT,
      bends: [
        { id: "a", kind: "fold", line: [[200, 0], [200, 300]], flap: [300, 150], angle: 60, gravity: 0 },
        { id: "b", kind: "fold", parent: "a", line: [[300, 0], [300, 300]], flap: [380, 150], angle: -60, gravity: 0 },
      ],
    });
    const child = sheet.facets.find((f) => f.bend === "b" && f.band === 0)!;
    const parent = sheet.facets.filter((f) => f.bend === "a").sort((p, q) => q.band - p.band)[0];
    const a = paperFramePoint(child.frame, 300, 100);
    const b = paperFramePoint(parent.frame, 300, 100);
    expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(1e-6);
  });

  it("sags by the stock's own weight: card stays out, tissue hangs", () => {
    const drop = (stock: "cardstock" | "copy" | "tissue") => {
      const sheet = evaluatePaperSheet({ outline: "M0 0H600V200H0Z", stock, support: null, grain: 0, bends: [{ id: "edge", kind: "bend", line: [[200, 0], [200, 200]], flap: [400, 100], angle: 0 }] }, 0);
      let low = 0;
      for (const facet of sheet.facets) for (let i = 0; i < facet.rings[0].length; i += 2) low = Math.min(low, paperFramePoint(facet.frame, facet.rings[0][i], facet.rings[0][i + 1])[2]);
      return -low;
    };
    const card = drop("cardstock");
    const copy = drop("copy");
    const tissue = drop("tissue");
    expect(card).toBeLessThan(copy);
    expect(copy).toBeLessThan(tissue);
    // 100 mm of tissue (ℓ ≈ 3 cm) hangs most of its length.
    expect(tissue / 4).toBeGreaterThan(60);
    expect(card / 4).toBeLessThan(6);
  });

  it("tears into two pieces with fibre fringes, and lifts only the named side", () => {
    const spec: PaperSheetSpec = {
      outline: RECT,
      tears: [{ id: "rip", from: [200, -4], to: [190, 304], progress: 0.6 }],
      bends: [{ id: "lift", kind: "fold", follow: "rip", piece: { tear: "rip", at: [300, 100] }, angle: 40, radius: 30 }],
    };
    const sheet = expectIsometric(spec);
    const lifted = sheet.facets.filter((f) => f.bend === "lift");
    expect(lifted.length).toBeGreaterThan(0);
    const side = lifted[0].pieces.rip;
    expect(lifted.every((f) => f.pieces.rip === side)).toBe(true);
    expect(sheet.facets.some((f) => f.rest && f.pieces.rip !== side && f.pieces.rip !== "ahead")).toBe(true);
    expect(sheet.fringes.some((f) => f.bevel.length > 0 && f.face === "front")).toBe(true);
    const done = evaluatePaperSheet({ outline: RECT, stock: "washi", tears: [{ id: "rip", from: [200, -4], to: [190, 304], progress: 1 }] }, 0);
    expect(new Set(done.facets.map((f) => f.pieces.rip))).toEqual(new Set(["left", "right"]));
    // Long kozo fibres shed more loose fibres than short wood pulp.
    const copy = evaluatePaperSheet({ outline: RECT, stock: "copy", tears: [{ id: "rip", from: [200, -4], to: [190, 304], progress: 1 }] }, 0);
    const hairs = (s: typeof done) => s.fringes.reduce((n, f) => n + f.hairs.length, 0);
    expect(hairs(done)).toBeGreaterThan(hairs(copy) * 2);
  });

  it("animates with keys and evaluates any frame on its own", () => {
    const spec: PaperSheetSpec = { outline: RECT, bends: [{ id: "f", kind: "fold", line: [[200, 0], [200, 300]], flap: [300, 150], angle: 0, gravity: 0, keys: [{ frame: 10, angle: 0 }, { frame: 30, angle: 180, easing: "linear" }] }] };
    const top = (frame: number) => Math.max(...evaluatePaperSheet(spec, frame).facets.map((f) => paperFramePoint(f.frame, 399, 150)[2]));
    expect(top(5)).toBeCloseTo(0, 6);
    expect(top(20)).toBeGreaterThan(150);
    expect(evaluatePaperSheet(spec, 20)).toEqual(evaluatePaperSheet(spec, 20));
  });

  it("reports problems with paths", () => {
    const issues = inspectPaperSheet({
      outline: RECT,
      stock: "felt" as never,
      tears: [{ id: "rip", from: [0, 0], to: [0, 0] }],
      bends: [
        { id: "a", kind: "fold", line: [[0, 0], [0, 10]], flap: [0, 5], angle: 270 },
        { id: "b", kind: "fold", follow: "nope", angle: 10 },
        { id: "c", kind: "fold", line: [[0, 0], [0, 10]], flap: [5, 5], angle: 10, parent: "c" },
      ],
    });
    const paths = issues.map((i) => i.path);
    expect(paths).toEqual(expect.arrayContaining(["stock", "tears[0].to", "bends[0].flap", "bends[0].angle", "bends[1].follow", "bends[2].parent"]));
    expect(inspectPaperSheetMotion({ back: "red" }, "sheet.").map((i) => i.path)).toContain("sheet.back");
  });
});

describe("paper stock physics", () => {
  it("derives sag length, peel radius and Kubelka–Munk transmittance from measured properties", () => {
    const ell = (name: keyof typeof PAPER_STOCKS) => paperGravityLength(PAPER_STOCKS[name]) * 1000;
    expect(ell("tissue")).toBeLessThan(ell("copy"));
    expect(ell("copy")).toBeLessThan(ell("cardstock"));
    // Office paper sags past roughly 5–9 cm; folding along the grain is easier than across it.
    expect(ell("copy")).toBeGreaterThan(50);
    expect(ell("copy")).toBeLessThan(95);
    expect(paperGravityLength(PAPER_STOCKS.copy, 90)).toBeLessThan(paperGravityLength(PAPER_STOCKS.copy, 0));
    expect(paperPeelRadius(PAPER_STOCKS.cardstock, 25)).toBeGreaterThan(paperPeelRadius(PAPER_STOCKS.tissue, 25) * 10);
    // A sheet that absorbs nothing transmits what it does not reflect; a fully opaque one transmits nothing.
    expect(paperTransmittance({ opacity: 0.5, reflectance: 0.999 })).toBeCloseTo(1 - 0.5 * 0.999, 2);
    expect(paperTransmittance({ opacity: 1, reflectance: 0.8 })).toBeCloseTo(0, 6);
    expect(paperTransmittance(PAPER_STOCKS.tracing)).toBeGreaterThan(paperTransmittance(PAPER_STOCKS.copy));
  });
});

describe("paper light and rendering", () => {
  it("shades relative to the flat sheet and casts softer shadows from higher paper", () => {
    expect(paperShade([0, 0, 1], { direction: [-0.4, -0.5, 0.75], size: 20, key: 1, ambient: 0.3, bounce: 0.2 }, 0.2)).toBeCloseTo(1, 9);
    const sheet = evaluatePaperSheet({ outline: RECT, bends: [{ id: "f", kind: "fold", line: [[200, 0], [200, 300]], flap: [300, 150], angle: 60, gravity: 0 }] }, 0);
    const flap = sheet.facets.filter((f) => f.bend === "f").sort((a, b) => b.band - a.band)[0];
    const slices = paperShadowSlices(flap, [-0.4, -0.5, 0.75], 0, paperViewMatrix(undefined));
    expect(slices.length).toBeGreaterThan(1);
    expect(slices[slices.length - 1].height).toBeGreaterThan(slices[0].height);
  });

  it("renders every facet with the artwork, the back and shadows", () => {
    const sheet = evaluatePaperSheet({ outline: RECT, stock: "kami", bends: [{ id: "f", kind: "fold", line: [[200, 0], [200, 300]], flap: [300, 150], angle: 160 }] }, 0);
    const html = renderToStaticMarkup(<svg><PaperSheetSvg sheet={sheet} color="#f6f1e4" front={<rect width={400} height={300} fill="#b5452f" />} /></svg>);
    expect(html.match(/data-km-paper-facet=/g)?.length).toBe(sheet.facets.length);
    expect(html).toContain('data-km-paper-face="back"');
    expect(html).toContain("data-km-paper-shadow");
  });

  it("makes PaperCraft layers and collage cutouts physical", () => {
    const spec = paperPhysicalSceneSpec("cardstock");
    expect(inspectPaperCraft(spec)).toEqual([]);
    const frame = evaluatePaperCraft(spec, 50);
    const cover = frame.layers.find((l) => l.id === "cover")!;
    expect(cover.sheet?.facets.some((f) => !f.rest)).toBe(true);
    const bad = { ...spec, layers: spec.layers.map((l) => (l.id === "door" ? { ...l, sheet: { bends: [{ id: "x", kind: "fold" as const, line: [[0, 0], [0, 1]] as [[number, number], [number, number]], flap: [1, 0] as [number, number], angle: 999 }] } } : l)) };
    expect(inspectPaperCraft(bad).map((i) => i.path)).toContain("layers[4].sheet.bends[0].angle");
    const errors = inspectCollageScene({
      version: 1, id: "c", width: 640, height: 360, durationFrames: 10, seed: 1,
      nodes: [{ id: "n", kind: "cutout", shape: { type: "rect", width: 100, height: 80 }, fill: "#ffffff", sheet: { stock: "tissue", bends: [{ id: "x", kind: "roll", line: [[0, 0], [0, 1]], flap: [1, 0], angle: 5000 }] } }],
    });
    expect(errors.some((e) => e.includes("sheet.bends[0].angle"))).toBe(true);
  });
});

describe("paper book", () => {
  const riffle = () => bakePaperBook({ leaves: 10, width: 210, height: 280, open: 2, durationFrames: 110, quality: "draft",
    turns: [{ frame: 4, kind: "grab", frames: 14, release: 0.62, count: 3, interval: 7 }] });

  it("turns leaves that touch, land and settle in order without passing through each other", () => {
    const bake = riffle();
    const report = inspectPaperBookContacts(bake);
    // Crossings stay within a few paper thicknesses, and paper does not stretch.
    expect(report.maxPenetration).toBeLessThan(1);
    expect(report.maxStretch).toBeLessThan(0.08);
    const settled = bake.events.filter((e) => e.kind === "settle").map((e) => e.leaf);
    expect(settled).toEqual([2, 3, 4]);
    expect(bake.events.filter((e) => e.kind === "land")).toHaveLength(3);
    const last = bake.frames[bake.frames.length - 1];
    expect(last.leftCount + last.leaves.filter((l) => l.place === "left").length).toBe(5);
  });

  it("is deterministic, and a weak flick falls back onto its own stack", () => {
    const spec = { leaves: 6, width: 210, height: 280, open: 2, durationFrames: 70, quality: "draft" as const, turns: [{ frame: 2, kind: "flick" as const, speed: 500 }] };
    const a = bakePaperBook(spec);
    const b = bakePaperBook(spec);
    expect(Array.from(a.frames[40].leaves[0].positions)).toEqual(Array.from(b.frames[40].leaves[0].positions));
    const end = a.frames[a.frames.length - 1];
    expect(end.leftCount + end.leaves.filter((l) => l.place === "left").length).toBe(2);
  });

  it("makes sound cues from contact and motion", () => {
    const cues = paperBookSoundCues(riffle());
    expect(cues.some((c) => c.cause === "riffle")).toBe(true);
    expect(cues.filter((c) => c.cause.startsWith("land")).length).toBe(3);
    expect(cues.every((c) => c.gainDb <= 0 && c.gainDb >= -30)).toBe(true);
    const sheet = paperSheetSoundCues({ tears: [{ id: "t", from: [0, -4], to: [0, 304], keys: [{ frame: 0, progress: 0 }, { frame: 60, progress: 1 }] }],
      bends: [{ id: "f", kind: "fold", line: [[0, 0], [0, 10]], flap: [5, 5], angle: 0, keys: [{ frame: 10, angle: 0 }, { frame: 40, angle: 170 }] }] }, 90);
    expect(new Set(sheet.map((c) => c.sound))).toEqual(new Set(["paper-fold", "paper-tear-slow"]));
    expect(inspectPaperBook({ leaves: 1, width: 1, height: 1, durationFrames: 0, turns: [{ frame: -1 }] } as never).map((i) => i.path)).toEqual(expect.arrayContaining(["leaves", "width", "durationFrames", "turns[0].frame"]));
  });
});
