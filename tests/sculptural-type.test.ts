import { describe, expect, it } from "vitest";

import { signedDistanceField } from "../registry/motion/sculptural-type-field";
import type { GlyphRaster } from "../registry/motion/sculptural-type-field";
import { buildGlyphSolid } from "../registry/motion/sculptural-type-mesh";
import { deformInto } from "../registry/motion/sculptural-type-deform";
import type { Deformer } from "../registry/motion/sculptural-type-deform";
import { SculpturalText, glyphPose, lookPhase, planSculpturalText } from "../registry/motion/sculptural-type";
import type { SculptEnter, SculpturalTextSpec } from "../registry/motion/sculptural-type";
import { shadeRelief } from "../registry/motion/sculptural-type-relief";
import { compileTitleSequence, sculptedLetters, SCULPT_LETTER_FRAMES, SCULPT_LETTER_STEP } from "../registry/video/title-sequence";
import type { TitleSequenceContent } from "../registry/video/title-sequence";
import type { MorphTextCanvas, MorphTextContext } from "../registry/motion/advanced-morph-text";

/** A canvas that draws every glyph as a solid block 0.6 em wide and 0.7 em tall on the baseline. */
function blockCanvas(width: number, height: number): MorphTextCanvas {
  const alpha = new Uint8ClampedArray(Math.max(1, width * height));
  let size = 100;
  const ctx = {
    font: "", textBaseline: "alphabetic", fillStyle: "#000", letterSpacing: "0px",
    measureText(text: string) {
      size = Number(/(\d+)px/.exec(ctx.font)?.[1] ?? 100);
      const w = [...text].length * size * 0.6;
      return { width: w, actualBoundingBoxLeft: 0, actualBoundingBoxRight: /\S/.test(text) ? w : 0, actualBoundingBoxAscent: /\S/.test(text) ? size * 0.7 : 0, actualBoundingBoxDescent: 0 } as TextMetrics;
    },
    fillText(text: string, x: number, y: number) {
      const m = ctx.measureText(text);
      for (let py = Math.round(y - m.actualBoundingBoxAscent); py < Math.round(y); py += 1) {
        for (let px = Math.round(x + size * 0.05); px < Math.round(x + m.width - size * 0.05); px += 1) {
          if (px >= 0 && py >= 0 && px < canvas.width && py < canvas.height) alpha[py * canvas.width + px] = 255;
        }
      }
    },
    getImageData(_x: number, _y: number, w: number, h: number) {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h; i += 1) data[4 * i + 3] = alpha[i];
      return { data, width: w, height: h } as ImageData;
    },
  };
  const canvas = { width, height, getContext: () => ctx as unknown as MorphTextContext };
  return canvas;
}

function discRaster(radius: number, size = 140): { glyph: GlyphRaster; field: Float32Array } {
  const alpha = new Uint8ClampedArray(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let s = 0; s < 16; s += 1) if (Math.hypot(x + ((s % 4) + 0.5) / 4 - size / 2, y + (Math.floor(s / 4) + 0.5) / 4 - size / 2) <= radius) hits += 1;
      alpha[y * size + x] = Math.round((hits / 16) * 255);
    }
  }
  const glyph: GlyphRaster = { index: 0, text: "o", line: 0, word: 0, penX: 0, penY: size, advance: size, blank: false, width: size, height: size, left: 0, top: 0, alpha };
  return { glyph, field: signedDistanceField(alpha, size, size) };
}

/** Triangles whose winding disagrees with their vertex normals (front faces must wind counter-clockwise). */
function facesAgainstNormals(positions: Float32Array, normals: Float32Array, indices: Uint32Array): number {
  let bad = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]];
    const u = [0, 1, 2].map((k) => positions[3 * b + k] - positions[3 * a + k]);
    const v = [0, 1, 2].map((k) => positions[3 * c + k] - positions[3 * a + k]);
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const area = Math.hypot(n[0], n[1], n[2]);
    if (area < 1e-10) continue;
    const dot = [0, 1, 2].reduce((sum, k) => sum + n[k] * (normals[3 * a + k] + normals[3 * b + k] + normals[3 * c + k]), 0);
    if (dot / area < -0.2) bad += 1;
  }
  return bad;
}

const spec = (changes: Partial<SculpturalTextSpec> = {}): SculpturalTextSpec => ({
  id: "t", text: "ab cd", font: "800 100px Test", createCanvas: blockCanvas, step: 2, stagger: 3, ...changes,
});

describe("sculptural type — fields and solids", () => {
  it("measures distance to the 50 % coverage line", () => {
    const { field } = discRaster(40);
    // Pixel (70, 70) has its centre 0.71 px from the disc's centre.
    expect(Math.abs(field[70 * 140 + 70] - (40 - Math.SQRT1_2))).toBeLessThan(0.6);
    expect(field[0]).toBeLessThan(-50);
  });

  it.each(["flat", "chamfer", "round", "pillow", "chisel"] as const)("builds a %s solid that faces outward everywhere", (kind) => {
    const { glyph, field } = discRaster(40);
    const profile = kind === "flat" ? { kind } : kind === "pillow" ? { kind, height: 0.08 } : kind === "chisel" ? { kind, angle: 40 } : { kind, width: 0.05, height: 0.03 };
    const solid = buildGlyphSolid(glyph, field, { profile, depth: 0.15, size: 140 });
    expect(Array.from(solid.positions).every(Number.isFinite)).toBe(true);
    expect(facesAgainstNormals(solid.positions, solid.normals, solid.indices)).toBe(0);
    expect(solid.box.back).toBeCloseTo(-0.15, 6);
    if (kind === "chamfer") expect(solid.box.front).toBeCloseTo(0.03, 3);
    // Wall normals point away from the disc's centre.
    const [start, end] = solid.ranges.wall;
    for (let v = start; v < end; v += 7) {
      const radial = (solid.positions[3 * v] - 0.5) * solid.normals[3 * v] + (solid.positions[3 * v + 1] - 0.5) * solid.normals[3 * v + 1];
      expect(radial).toBeGreaterThan(0);
    }
  });
});

describe("sculptural type — deformers", () => {
  const { glyph, field } = discRaster(40);
  const solid = buildGlyphSolid(glyph, field, { profile: { kind: "round", width: 0.05, height: 0.04 }, depth: 0.15, size: 140 });
  const positions = new Float32Array(solid.positions.length);
  const normals = new Float32Array(solid.normals.length);

  it.each<[string, Deformer[]]>([
    ["bend", [{ kind: "bend", angle: 1.2, from: 0, to: 1 }]],
    ["twist", [{ kind: "twist", rate: 1.5 }]],
    ["squash", [{ kind: "squash", amount: 0.5 }]],
    ["stack", [{ kind: "taper", rate: 0.5 }, { kind: "lean", rate: 0.3 }, { kind: "wave", amplitude: 0.05, wavelength: 0.4, phase: 1 }, { kind: "inflate", amount: 1.6 }]],
  ])("keeps normals consistent with the deformed surface (%s)", (_name, stack) => {
    deformInto(stack, [0.5, 0, 0], solid.positions, solid.normals, positions, normals);
    expect(Array.from(normals).every(Number.isFinite)).toBe(true);
    expect(facesAgainstNormals(positions, normals, solid.indices)).toBe(0);
  });

  it("squashes at constant volume", () => {
    const cube = Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const out = new Float32Array(12);
    deformInto([{ kind: "squash", amount: 0.4 }], [0, 0, 0], cube, new Float32Array(12).fill(0.5), out, new Float32Array(12));
    expect(out[3] * out[7] * out[11]).toBeCloseTo(1, 6);
  });
});

describe("sculptural type — plan and motion", () => {
  it("staggers inked units and skips spaces", () => {
    const plan = planSculpturalText(spec());
    expect(plan.glyphs.map((glyph) => glyph.text)).toEqual(["a", "b", "c", "d"]);
    expect(plan.glyphs.map((glyph) => glyph.start)).toEqual([0, 3, 6, 9]);
    const grouped = planSculpturalText(spec({ groupBy: "word", groupGap: 5 }));
    expect(grouped.glyphs.map((glyph) => glyph.start)).toEqual([0, 3, 8, 11]);
  });

  it.each<SculptEnter>(["drop", "unfold", "twist", "inflate", "swing", "rise"])("%s hides before its start and settles to rest", (enter) => {
    const plan = planSculpturalText(spec({ motion: { enter } }));
    const glyph = plan.glyphs[1];
    expect(glyphPose(plan, glyph, glyph.start - 1).visible).toBe(false);
    const settled = glyphPose(plan, glyph, glyph.start + plan.enterFrames * 6);
    expect(Math.hypot(...settled.offset)).toBeLessThan(0.01);
    expect(Math.hypot(...settled.rotation)).toBeLessThan(0.02);
    expect(glyphPose(plan, glyph, glyph.start + 5)).toEqual(glyphPose(plan, glyph, glyph.start + 5));
    expect(glyphPose(plan, glyph, glyph.start + 5, true)).toEqual({ visible: true, offset: [0, 0, 0], rotation: [0, 0, 0], scale: 1, deformers: [] });
  });

  it("reuses buffers and restores the exact solid once the deformers end", () => {
    const text = new SculpturalText(spec({ motion: { enter: "drop" } }));
    const [first] = text.update(4);
    const buffer = first.positions;
    expect(first.changed).toBe(true);
    const later = text.update(2000);
    expect(later[0].positions).toBe(buffer);
    expect(Array.from(later[0].positions)).toEqual(Array.from(later[0].glyph.solid.positions));
  });
});

describe("sculptural type — relief and titles", () => {
  const { glyph, field } = discRaster(30, 100);

  it("returns an opaque raised face over a soft shadow, and only the cut for incised styles", () => {
    const card = shadeRelief(glyph, field, { kind: "cut-card", color: "#204060" }, 100);
    expect(card.data[4 * (50 * 100 + 50) + 3]).toBe(255);
    const shadowed = Array.from({ length: 100 * 100 }, (_, i) => card.data[4 * i + 3]).filter((a) => a > 0 && a < 255).length;
    expect(shadowed).toBeGreaterThan(200);
    const cut = shadeRelief(glyph, field, { kind: "chiselled" }, 100);
    expect(cut.data[4 * (2 * 100 + 2) + 3]).toBe(0);
    expect(cut.data[4 * (50 * 100 + 35) + 3]).toBeGreaterThan(0);
  });

  it("validates sculpted lines and lands their letters on the cadence", () => {
    const content: TitleSequenceContent = {
      label: "A test title", canvas: { width: 160, height: 90 },
      shapes: [{ id: "a", points: [[10, 10], [40, 10], [40, 40]], color: "#111111", at: 0 }],
      title: { text: "Hi you", at: 30, box: { x: 10, y: 50, width: 80, height: 10 }, sculpt: { style: "letterpress" } },
    };
    expect(compileTitleSequence(content, 200, 30).problems.filter((p) => p.severity === "error")).toEqual([]);
    const bad = { ...content, title: { ...content.title, sculpt: { style: "neon" as never } } };
    expect(compileTitleSequence(bad, 200, 30).problems.map((p) => p.code)).toContain("title-sculpt");
    const letters = sculptedLetters(content.title, 30 + SCULPT_LETTER_STEP);
    expect(letters).toHaveLength(5);
    expect(letters.map((l) => l.visible)).toEqual([true, true, false, false, false]);
    const done = sculptedLetters(content.title, 30 + 4 * SCULPT_LETTER_STEP + SCULPT_LETTER_FRAMES);
    expect(done.every((l) => l.visible && Math.abs(l.amount - 1) < 1e-9)).toBe(true);
  });
});

describe("sculptural type — looks and morphs", () => {
  const faceColour = (frame: { colors: Float32Array; solid: { ranges: { face: [number, number] } } }) => {
    const v = 0;
    return [frame.colors[3 * v], frame.colors[3 * v + 1], frame.colors[3 * v + 2]];
  };

  it("morphs one word into another through blended fields, growing letters that only the new word has", () => {
    const text = new SculpturalText(spec({ text: "ab", motion: { enter: "none" }, keys: [{ frame: 10, look: {} }, { frame: 40, look: { text: "cde" } }] }));
    expect(text.plan.glyphs).toHaveLength(3);
    const before = text.update(5);
    expect(before[2].visible).toBe(false);
    const middle = text.update(25);
    expect(middle[0].geometryChanged).toBe(true);
    expect(middle[0].solid).not.toBe(text.plan.states[0].units[0].solid);
    expect(middle[0].solid).not.toBe(text.plan.states[2].units[0].solid);
    expect(middle[2].visible).toBe(true);
    const after = text.update(40);
    expect(after[0].solid).toBe(text.plan.states[2].units[0].solid);
    expect(after[2].solid).toBe(text.plan.states[2].units[2].solid);
  });

  it("interpolates colour in linear light and lands exactly on the key's colour", () => {
    const text = new SculpturalText(spec({ text: "a", color: "#ff0000", motion: { enter: "none" }, keys: [{ frame: 20, look: { color: "#0000ff" }, easing: "linear" }] }));
    const [middle] = text.update(10);
    const [r, , b] = faceColour(middle);
    expect(r).toBeCloseTo(0.5, 5);
    expect(b).toBeCloseTo(0.5, 5);
    const [end] = text.update(20);
    expect(faceColour(end)).toEqual([0, 0, 1]);
  });

  it("spreads a gradient across the text and keeps the sides in their own colour", () => {
    const text = new SculpturalText(spec({
      text: "ab cd", motion: { enter: "none" }, sideColor: "#000000",
      gradient: { angle: 0, stops: [{ at: 0, color: "#ff0000" }, { at: 1, color: "#0000ff" }] },
    }));
    const frames = text.update(0);
    expect(frames[0].colors[0]).toBeGreaterThan(frames[0].colors[2]);
    expect(frames[3].colors[2]).toBeGreaterThan(frames[3].colors[0]);
    const wall = frames[0].solid.ranges.wall[0];
    expect(Array.from(frames[0].colors.slice(3 * wall, 3 * wall + 3))).toEqual([0, 0, 0]);
  });

  it("animates depth with a deformer, without re-meshing, and spreads letters with width", () => {
    const text = new SculpturalText(spec({ text: "ab", depth: 0.1, motion: { enter: "none" }, keys: [{ frame: 20, look: { depth: 0.3, width: 2 }, easing: "linear" }] }));
    text.update(0);
    const [first, second] = text.update(10);
    expect(first.geometryChanged).toBe(false);
    expect(Math.min(...Array.from(first.positions).filter((_, k) => k % 3 === 2))).toBeCloseTo(-0.2, 4);
    expect(first.scale[0]).toBeCloseTo(1.5, 6);
    const spread = second.placement[0] - first.placement[0];
    const [a0, b0] = text.update(0);
    expect(spread).toBeCloseTo((b0.placement[0] - a0.placement[0]) * 1.5, 4);
  });

  it("holds through an empty key and staggers letters within a change", () => {
    const plan = planSculpturalText(spec({ text: "abc", motion: { enter: "none" }, keys: [{ frame: 30, look: {} }, { frame: 60, look: { color: "#00ff00" }, stagger: 5 }] }));
    expect(lookPhase(plan, 0, 20)).toEqual({ from: 0, to: 0, t: 0 });
    const early = lookPhase(plan, 0, 35);
    const late = lookPhase(plan, 2, 35);
    expect(early.t).toBeGreaterThan(0);
    expect(late.t).toBe(0);
    expect(lookPhase(plan, 2, 60)).toEqual({ from: 2, to: 2, t: 0 });
  });
});
