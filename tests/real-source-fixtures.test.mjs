import assert from "node:assert/strict";
import { test } from "node:test";
import { BARCODE_BITS, barcodeLayout, codedForPortrait, expectedSourceFrame, keptIndices, paintIndex, readIndex } from "../scripts/real-source-fixtures.mjs";

/** Luminance-to-RGBA helper: the decoder reads the canvas as RGBA. */
const toRgba = rgb => {
  const rgba = new Uint8Array(rgb.length / 3 * 4);
  for (let i = 0, o = 0; i < rgb.length; i += 3, o += 4) { rgba[o] = rgb[i]; rgba[o + 1] = rgb[i + 1]; rgba[o + 2] = rgb[i + 2]; rgba[o + 3] = 255; }
  return rgba;
};

test("every frame index up to the barcode width round-trips through paint and read", () => {
  for (const index of [0, 1, 2, 29, 90, 103, 4095, 2 ** BARCODE_BITS - 1]) {
    const w = 640, h = 360;
    const rgb = paintIndex(Buffer.alloc(w * h * 3), w, h, index);
    assert.equal(readIndex(toRgba(rgb), w, h), index);
  }
});

test("barcode layout stays inside the frame for portrait and landscape sizes", () => {
  for (const [w, h] of [[640, 360], [360, 640], [1080, 1920], [1920, 1080]]) {
    const { cellW, x0, y0, bandH } = barcodeLayout(w, h);
    assert.ok(x0 >= 0 && x0 + cellW * BARCODE_BITS <= w, "x inside " + w);
    assert.ok(y0 >= 0 && y0 + bandH <= h, "y inside " + h);
    assert.ok(cellW >= 6, "cells wide enough to read at " + w + "×" + h);
  }
});

test("an ambiguous luminance makes the frame unreadable instead of guessing", () => {
  const w = 640, h = 360;
  const rgb = paintIndex(Buffer.alloc(w * h * 3), w, h, 5);
  const { cellW, x0, y0, bandH } = barcodeLayout(w, h);
  const x = x0 + 3 * cellW + Math.floor(cellW / 2), y = y0 + Math.floor(bandH / 2);
  rgb.fill(120, (y * w + x) * 3, (y * w + x) * 3 + 3);
  assert.ok(Number.isNaN(readIndex(toRgba(rgb), w, h)));
});

test("a rotated portrait frame is turned upright by a 90° counter-clockwise display rotation", () => {
  const pw = 4, ph = 6;
  const display = Buffer.alloc(pw * ph * 3);
  for (let r = 0; r < ph; r += 1) for (let c = 0; c < pw; c += 1) display.fill(r * 16 + c, (r * pw + c) * 3, (r * pw + c) * 3 + 3);
  const coded = codedForPortrait(display, pw, ph);
  assert.equal(coded.width, ph);
  assert.equal(coded.height, pw);
  // Counter-clockwise: D(r, c) = C(c, coded.width − 1 − r), which is the ffmpeg -display_rotation 90 convention.
  for (let r = 0; r < ph; r += 1) for (let c = 0; c < pw; c += 1) {
    const from = (c * coded.width + (coded.width - 1 - r)) * 3;
    assert.equal(coded.buffer[from], display[(r * pw + c) * 3], "pixel " + r + "," + c);
  }
});

test("kept frames follow the drop rule and keep their original indices", () => {
  assert.deepEqual(keptIndices(10, n => n % 7 === 3), [0, 1, 2, 4, 5, 6, 7, 8, 9]);
  assert.equal(keptIndices(120, n => n % 7 === 3).length, 103);
});

test("expected source frame floors the output time onto the last presented frame", () => {
  const fps = { num: 30, den: 1 };
  const cfr = Array.from({ length: 90 }, (_, i) => i / 30);
  assert.equal(expectedSourceFrame(cfr, 0, fps), 0);
  assert.equal(expectedSourceFrame(cfr, 45, fps), 45);
  // Source frame 3 is missing, so output frame 3 (t = 0.1) shows source position 2 at t = 0.0667.
  const vfr = [0, 1 / 30, 2 / 30, 4 / 30, 5 / 30];
  assert.equal(expectedSourceFrame(vfr, 3, fps), 2);
  assert.equal(expectedSourceFrame(vfr, 4, fps), 3);
});
