import { describe, expect, it } from "vitest";
import type { Vec3 } from "../registry/anatomy/anatomy-body";
import faceData from "../registry/anatomy/data/face-mesh-mediapipe.json";
import { beautifulFace } from "../registry/anatomy/face-beauty";
import type { SkinPaintSample } from "../registry/anatomy/face-portrait";
import { deltaE2000, filmStep, labToLinear, pigmentFor, readSkin } from "../registry/anatomy/makeup-color";
import type { RGB } from "../registry/anatomy/anatomy-color";
import { MAKEUP_LOOKS } from "../registry/anatomy/makeup-data";
import { checkMakeup, designMakeup } from "../registry/anatomy/makeup-design";
import { makeupPaint, paintPhoto } from "../registry/anatomy/makeup-paint";
import { MAKEUP_ZONES, resolveZone, zoneField } from "../registry/anatomy/makeup-zones";
import parity from "./fixtures/makeup-zone-parity.json";

const CANON = faceData.vertices as Vec3[];
const face = beautifulFace({ sex: 0 }).vertices;

describe("MAKEUP1 zone atlas", () => {
  it("weighs the same as the Python pipeline on the canonical face (one atlas, two languages)", () => {
    for (const [id, ws] of Object.entries(parity.weights)) {
      const f = zoneField(id, CANON);
      parity.points.forEach((p, k) => expect(f(p as Vec3), `${id} at point ${k}`).toBeCloseTo(ws[k], 5));
    }
    expect(Object.keys(parity.weights).sort()).toEqual(MAKEUP_ZONES.map(z => z.id).sort());
  });
  it("covers each stroke zone's own points on ANAT1's face, symmetrically on both sides", () => {
    for (const z of MAKEUP_ZONES.filter(z => z.shape.kind === "stroke")) {
      const parts = resolveZone(z.id, face), f = zoneField(z.id, face);
      for (const part of parts) expect(f(part.pts[0]), z.id).toBeGreaterThan(0.45);
      if (parts.length === 2) expect(parts[1].pts[0][0], z.id).toBeCloseTo(-parts[0].pts[0][0], 0);
    }
  });
});

describe("MAKEUP1 colour", () => {
  it("computes CIEDE2000 like Sharma, Wu & Dalal's test data and splits undertone by hue", () => {
    expect(deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 3);
    expect(deltaE2000([50, -1.3802, -84.2814], [50, 0, -82.7485])).toBeCloseTo(1.0, 3);
    expect(readSkin([60, 14, 12]).undertone).toBe("cool");
    expect(readSkin([60, 10, 20]).undertone).toBe("warm");
    expect(readSkin([55, 7, 16]).undertone).toBe("olive");
  });
  it("films multiply at hide 0, paint over at hide 1, and pigmentFor inverts them", () => {
    const skin: RGB = [0.5, 0.4, 0.3], m: RGB = [0.8, 0.2, 0.2];
    const a: RGB = [...skin], fa: RGB = [0, 0, 0];
    filmStep(a, fa, 1, m, 0);
    a.forEach((v, k) => expect(v + fa[k]).toBeCloseTo(skin[k] * m[k], 9));
    const b: RGB = [...skin], fb: RGB = [0, 0, 0];
    filmStep(b, fb, 1, m, 1);
    b.forEach((v, k) => expect(v + fb[k]).toBeCloseTo(m[k], 9));
    const target: RGB = [0.3, 0.25, 0.2], p = pigmentFor(target, skin, 0.4), c: RGB = [...skin], fc: RGB = [0, 0, 0];
    filmStep(c, fc, 1, p, 0.4);
    c.forEach((v, k) => expect(v + fc[k]).toBeCloseTo(target[k], 6));
  });
});

describe("MAKEUP1 design", () => {
  it("designs every look for a face and the professional looks pass their checks", () => {
    for (const look of MAKEUP_LOOKS) {
      const plan = designMakeup({ look: look.id, face, skin: "#c99a7e" });
      expect(plan.layers.length, look.id).toBe(look.layers.length > 0 ? plan.layers.length : 0);
      if (["soft-glam", "classic-red", "no-makeup"].includes(look.id)) for (const c of checkMakeup(plan, face)) expect(c.ok, `${look.id}: ${c.message}`).toBe(true);
    }
  });
  it("applies face-shape, eye-shape and caller changes as data", () => {
    const round = designMakeup({ look: "soft-glam", face, faceShape: "round" });
    expect(round.layers.some(l => l.zone === "blush-lifted")).toBe(true);
    expect(round.layers.some(l => l.zone === "temple-contour")).toBe(true);
    const hooded = designMakeup({ look: "soft-glam", face, eyeShape: "hooded" });
    expect(hooded.layers.find(l => l.zone === "crease")?.adjust?.shift?.[1]).toBeGreaterThan(0);
    expect(designMakeup({ look: "soft-glam", face, overrides: { lips: false } }).layers.some(l => l.zone === "lips")).toBe(false);
  });
});

describe("MAKEUP1 paint", () => {
  const plan = designMakeup({ look: "classic-red", face, skin: "#d8a98a" });
  it("paints the lips red on the renderer's skin and leaves the forehead's hue", () => {
    const paint = makeupPaint(plan);
    paint.prepare!(face);
    const sample = (): SkinPaintSample => ({ albedo: labToLinear([62, 14, 18]) as [number, number, number], film: [0, 0, 0], roughness: 0.4, specular: 1, sparkle: 0, tint: null });
    const lip = sample(), lc = face[14].map((v, k) => (v + face[17][k]) / 2) as Vec3;
    paint.shade(lc, lip);
    expect(lip.albedo[0] + lip.film[0]).toBeGreaterThan((lip.albedo[1] + lip.film[1]) * 2.5);
    const brow = sample();
    paint.shade(face[151], brow);
    const total = brow.albedo.map((v, k) => v + brow.film[k]);
    expect(total[0] / total[2]).toBeCloseTo(sample().albedo[0] / sample().albedo[2], 0);
  });
  it("paints a photograph through its landmarks (the face fitted to the canonical mesh)", () => {
    const W = 220, H = 260, data = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) data.set([205, 160, 135, 255], i * 4);
    // a synthetic frontal photo: the canonical face, 1.1 px per mm, centred
    const landmarks = CANON.map(([x, y, z]) => [W / 2 + x * 1.1, H / 2 - y * 1.1 + 6, -z * 1.1]);
    const out = paintPhoto({ width: W, height: H, data, landmarks }, plan);
    const at = (p: Vec3) => { const x = Math.round(W / 2 + p[0] * 1.1), y = Math.round(H / 2 - p[1] * 1.1 + 6), i = (y * W + x) * 4; return [out[i], out[i + 1], out[i + 2]]; };
    const lip = at(CANON[17].map((v, k) => (v + CANON[14][k]) / 2) as Vec3);
    expect(lip[0] - lip[1]).toBeGreaterThan(70);
    expect(Array.from(out.slice(0, 4))).toEqual([205, 160, 135, 255]);
  });
});
