import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createHumanBody, decodeHumanBodyModel, humanJoints } from "../registry/anatomy/anatomy-body";
import { measureHumanBody } from "../registry/anatomy/anatomy-measure";
import { poseHumanBody } from "../registry/anatomy/anatomy-pose";
import { renderHumanFrame } from "../registry/anatomy/anatomy-view";
import { createFace, measureFace } from "../registry/anatomy/anatomy-face";
import { ansurStat, statureForAge } from "../registry/anatomy/anatomy-reference";

const buf = readFileSync(resolve(process.cwd(), "assets/models/anatomy/human-body-lattice.bin"));
const model = decodeHumanBodyModel(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const dir = (a: number[], b: number[]) => { const d = b.map((v, i) => v - a[i]); const l = Math.hypot(...d); return d.map(v => v / l); };

describe("ANAT1 human anatomy", () => {
  it("evaluates deterministic adults close to measured ANSUR proportions", () => {
    for (const [sex, s] of [["female", 0], ["male", 1]] as const) {
      const a = measureHumanBody(createHumanBody(model, { sex: s, age: 25 }));
      expect(measureHumanBody(createHumanBody(model, { sex: s, age: 25 })).stature).toBe(a.stature);
      expect(a.stature * 1000).toBeCloseTo(statureForAge(sex, 20), 0);
      for (const [k, key] of [["crotchHeight", "crotchheight"], ["acromialHeight", "acromialheight"], ["waistHeight", "waistheightomphalion"], ["hipBreadth", "hipbreadth"]] as const) {
        const r = ansurStat(sex, key)!.ratioToStature!;
        expect(Math.abs((a[k] / a.stature - r.mean) / r.sd)).toBeLessThan(2.5);
      }
      expect(a.headsTall).toBeGreaterThan(7.2);
      expect(a.headsTall).toBeLessThan(8);
    }
  });

  it("follows growth: a two-year-old is about five heads tall at CDC stature", () => {
    const m = measureHumanBody(createHumanBody(model, { sex: 0, age: 2 }));
    expect(m.stature * 1000).toBeCloseTo(statureForAge("female", 2), 0);
    expect(m.headsTall).toBeGreaterThan(4.6);
    expect(m.headsTall).toBeLessThan(5.3);
  });

  it("poses with clinical angles in the anatomical axes and clamps to range", () => {
    const body = createHumanBody(model, { sex: 1 });
    const p = poseHumanBody(body, { "shoulder.L": { flex: 90 }, "knee.R": { flex: 90 }, "elbow.R": { flex: 400 } }, { ground: false });
    const J = humanJoints(body, p.points);
    expect(dir(J["upperarm.L"].head, J["upperarm.L"].tail)[2]).toBeGreaterThan(0.95);
    expect(dir(J["shin.R"].head, J["shin.R"].tail)[2]).toBeLessThan(-0.95);
    expect(p.outOfRange).toEqual([{ joint: "elbow.R", dof: "flex", value: 400, min: -5, max: 150 }]);
  });

  it("renders a frame with visible contours and landmarks inside the viewport", () => {
    const body = createHumanBody(model, {});
    const f = renderHumanFrame(body, body.points, { yaw: 30 }, { width: 300, height: 500 });
    expect(f.triangles.length).toBeGreaterThan(2000);
    expect(f.contours.length).toBeGreaterThan(0);
    for (const [x, y] of Object.values(f.landmarks)) { expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(300); expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(500); }
  });

  it("fits the face study to published norms and varies in SD steps", () => {
    const m = measureFace(createFace({ norm: "north-american-white", sex: 1 }).vertices);
    expect(m.enEn).toBeCloseTo(33.3, 0);
    expect(m.nSn).toBeCloseTo(54.8, 0);
    const wide = measureFace(createFace({ norm: "north-american-white", sex: 1, noseWidth: 2 }).vertices);
    expect(wide.alAl - m.alAl).toBeCloseTo(4.2, 0);
  });
});

import { growHair, renderHairSegments } from "../registry/anatomy/anatomy-hair";
import { MONK_SKIN_TONES, hairColorHex, hexToRgb, skinRamp, srgbToLab } from "../registry/anatomy/anatomy-color";

describe("ANAT1 hair and colour", () => {
  it("grows deterministic hair on the scalp only and renders it in front of the body", () => {
    const body = createHumanBody(model, { sex: 0.3 });
    const a = growHair(body, body.points, { length: 0.2, strands: 300, seed: 2 });
    const b = growHair(body, body.points, { length: 0.2, strands: 300, seed: 2 });
    expect(Array.from(a.points.slice(0, 30))).toEqual(Array.from(b.points.slice(0, 30)));
    expect(a.starts.length).toBe(300);
    // roots sit above the eyes and away from the face
    const lm = body.model.header.landmarks, eyeY = body.points[lm.sellion * 3 + 1];
    for (let s = 0; s < a.starts.length; s += 17) expect(a.points[a.starts[s] * 3 + 1]).toBeGreaterThan(eyeY - 0.06);
    const f = renderHumanFrame(body, body.points, { yaw: 20 }, { width: 300, height: 500 });
    expect(renderHairSegments(a, f).length).toBeGreaterThan(1000);
  });

  it("orders skin and hair colours by pigment", () => {
    const L = (h: string) => srgbToLab(hexToRgb(h))[0];
    expect(MONK_SKIN_TONES.map(t => t.ita).every((v, i, arr) => i === 0 || v < arr[i - 1] + 6)).toBe(true);
    expect(L(hairColorHex(0.3))).toBeGreaterThan(L(hairColorHex(1.3)));
    expect(L(hairColorHex(1.3))).toBeGreaterThan(L(hairColorHex(8)));
    const ramp = skinRamp(MONK_SKIN_TONES[4].hex, 7).map(L);
    expect(ramp.every((v, i) => i === 0 || v >= ramp[i - 1] - 0.5)).toBe(true);
  });
});

import { beautifulFace, goldenRatioReport, PHI } from "../registry/anatomy/face-beauty";
import { renderPortrait } from "../registry/anatomy/face-portrait";
import { FRINGES, HAIRSTYLES, findHairStyle, groomHair, partLine, scalpCover } from "../registry/anatomy/hair-groom";
import type { HairGroom } from "../registry/anatomy/hair-groom";
import { eyeCentres, FACE_LANDMARKS } from "../registry/anatomy/anatomy-face";
import { createRaster, fft2, fillPolygon, gaussianBlur, strokePolyline } from "../registry/anatomy/foundation-raster";

describe("ANAT1 beautiful faces and portraits", () => {
  it("applies the attractiveness findings: symmetric, measured breadths and eyes, Pallett's ratios, closed lips", () => {
    for (const sex of [0, 1]) {
      const f = beautifulFace({ sex }), v = f.vertices, L = (k: keyof typeof FACE_LANDMARKS) => v[FACE_LANDMARKS[k]];
      // symmetry: paired landmarks mirror across the midline
      expect(Math.abs(L("exocanthion.L")[0] + L("exocanthion.R")[0])).toBeLessThan(0.2);
      expect(Math.abs(L("cheilion.L")[1] - L("cheilion.R")[1])).toBeLessThan(0.2);
      // ANSUR II cheekbone breadth (women 133.8, men 142.6 mm), Pallett's 46% and 36% (the average face)
      expect(f.applied.faceWidth).toBeGreaterThan(sex ? 136 : 128);
      expect(f.applied.faceWidth).toBeLessThan(sex ? 148 : 139);
      const r = Object.fromEntries(f.report.map(x => [x.id, x.value]));
      expect(Math.abs(r.pupils - 0.46)).toBeLessThan(0.02);
      expect(Math.abs(r["eye-mouth"] - 0.36)).toBeLessThan(0.005);
      // the eye opening inside the reported 8–11.5 mm; lips near 1:2 and closed
      expect(f.applied.palpebral).toBeGreaterThan(8);
      expect(f.applied.palpebral).toBeLessThan(11.5);
      expect(f.applied.lowerLip / f.applied.upperLip).toBeGreaterThan(1.5);
      expect(v[13][1] - v[14][1]).toBeLessThan(0.6);
      expect(f.applied.canthalTilt).toBeGreaterThan(2);
    }
    // beauty 0 keeps the calibrated average face
    expect(beautifulFace({ sex: 0, beauty: 0 }).vertices).toEqual(createFace({ sex: 0 }).vertices);
  });
  it("reports the golden-ratio checks without building on them", () => {
    const f = beautifulFace({ sex: 0 }), rows = goldenRatioReport(f.vertices, f.hairlineY);
    expect(rows.find(x => x.id === "mouth-nose")!.target).toBeCloseTo(PHI, 6);
    // the evidence-built face sits measurably off φ: the claims are reported, not imposed
    expect(Math.abs(rows.find(x => x.id === "mouth-nose")!.value - PHI)).toBeGreaterThan(0.03);
    expect(eyeCentres(f.vertices).L[0]).toBeGreaterThan(0);
  });
  it("renders a portrait: a lit face over the background, dark pupils, nothing out of range", () => {
    const p = renderPortrait({ sex: 0, width: 96, height: 120, supersample: 1, hairStrands: 4000 });
    expect(p.rgba.length).toBe(96 * 120 * 4);
    const lum = (x: number, y: number) => { const i = (y * 96 + x) * 4; return 0.2126 * p.rgba[i] + 0.7152 * p.rgba[i + 1] + 0.0722 * p.rgba[i + 2]; };
    const corner = lum(2, 2);
    let face = 0, n = 0;
    for (let y = 50; y < 70; y++) for (let x = 40; x < 56; x++) { face += lum(x, y); n++; }
    expect(face / n).toBeGreaterThan(corner + 20);
    let darkest = 255;
    for (let y = 40; y < 60; y++) for (let x = 20; x < 76; x++) darkest = Math.min(darkest, lum(x, y));
    expect(darkest).toBeLessThan(60);
  });
  it("grooms hair on the portrait head: falls beside the face, bangs cut at their line, coils stand out, the scalp painted under it", () => {
    const head = renderPortrait({ sex: 0, width: 48, height: 60, supersample: 1, hairStrands: 500 }).hair!.head;
    const a = groomHair(head, { style: "long-straight", strands: 1500, seed: 4 }), b = groomHair(head, { style: "long-straight", strands: 1500, seed: 4 });
    expect(a.points).toEqual(b.points);
    expect(a.starts.length).toBe(1500);
    const pts = (g: HairGroom) => Array.from({ length: g.points.length / 3 }, (_, i) => [g.points[i * 3], g.points[i * 3 + 1], g.points[i * 3 + 2]]);
    // nothing hangs over the face below the brows when there are no bangs
    expect(pts(a).filter(([x, y, z]) => Math.abs(x) < 40 && y < head.browY - 6 && y > head.chinY && z > head.faceZ - 25)).toHaveLength(0);
    // blunt bangs end at the brows: tips in front of the forehead lie within a few millimetres of the cut
    const bangs = groomHair(head, { style: "bob-bangs", strands: 3000, seed: 4 }), tips: number[] = [];
    for (let s = 0; s < bangs.starts.length; s++) { const e = (bangs.starts[s] + bangs.counts[s] - 1) * 3; if (Math.abs(bangs.points[e]) < 30 && bangs.points[e + 2] > head.faceZ - 15 && bangs.points[e + 1] < head.hairlineY) tips.push(bangs.points[e + 1]); }
    expect(tips.length).toBeGreaterThan(40);
    expect(Math.abs(tips.reduce((p, q) => p + q, 0) / tips.length - (head.browY + 2))).toBeLessThan(6);
    // tightly coiled hair stands out from the scalp (an afro), straight hair lies on it
    const out = (g: HairGroom) => { let s = 0; for (let k = 0; k < g.starts.length; k++) { const e = (g.starts[k] + g.counts[k] - 1) * 3, d = [(g.points[e] - head.centre[0]) / head.radii[0], (g.points[e + 1] - head.centre[1]) / head.radii[1], (g.points[e + 2] - head.centre[2]) / head.radii[2]]; s += Math.hypot(d[0], d[1], d[2]); } return s / g.starts.length; };
    expect(out(groomHair(head, { style: "afro", strands: 800, seed: 4 }))).toBeGreaterThan(out(groomHair(head, { style: "slicked-back", strands: 800, seed: 4 })) + 0.2);
    // the scalp: bare below the hairline, covered above, a thin bare parting
    const st = findHairStyle("long-straight"), over: [number, number, number] = [0, head.hairlineY + 20, head.centre[2] + head.radii[2] * 0.8];
    expect(scalpCover(head, st, [30, head.browY, head.faceZ - 10])).toBe(0);
    expect(scalpCover(head, st, [25, head.hairlineY + 20, head.centre[2] + head.radii[2] * 0.75])).toBeGreaterThan(0.95);
    expect(partLine(head, st, over)).toBeGreaterThan(0.5);
    expect(FRINGES.map(f => f.id)).toEqual(["blunt", "wispy", "micro", "long", "curtain", "bottleneck", "side-swept"]);
    expect(HAIRSTYLES.length).toBeGreaterThanOrEqual(15);
  });
  it("raster foundation: polygon coverage, blur, strokes and FFT round trip", () => {
    let cov = 0;
    fillPolygon(20, 20, [[2.5, 2.5], [12.5, 2.5], [12.5, 8.5], [2.5, 8.5]], (_, c) => (cov += c));
    expect(cov).toBeCloseTo(60, 1);
    const img = new Float32Array(64).fill(0); img[27] = 1;
    expect(gaussianBlur(img, 8, 8, 1, 1).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 1);
    const r = createRaster(16, 16);
    strokePolyline(r, [[2, 8], [14, 8]], 2, 2, [1, 0, 0], 1);
    expect(r.alpha[8 * 16 + 8]).toBeGreaterThan(0.9);
    const re = Float64Array.from({ length: 64 }, (_, i) => Math.sin(i)), im = new Float64Array(64), orig = re.slice();
    fft2(re, im, 8); fft2(re, im, 8, true);
    re.forEach((x, i) => expect(x).toBeCloseTo(orig[i], 9));
  });
});
