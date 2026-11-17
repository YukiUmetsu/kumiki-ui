import { describe, expect, it } from "vitest";
import type { Vec3 } from "../registry/anatomy/anatomy-body";
import faceData from "../registry/anatomy/data/face-mesh-mediapipe.json";
import { beautifulFace } from "../registry/anatomy/face-beauty";
import { renderPortrait } from "../registry/anatomy/face-portrait";
import type { Portrait, SkinPaintSample } from "../registry/anatomy/face-portrait";
import { srgbDecode } from "../registry/anatomy/foundation-raster";
import { deltaE2000, filmStep, labToLinear, linearToLab, pigmentFor, readSkin } from "../registry/anatomy/makeup-color";
import type { RGB } from "../registry/anatomy/anatomy-color";
import { MAKEUP_EVIDENCE, MAKEUP_LOOKS } from "../registry/anatomy/makeup-data";
import type { Look } from "../registry/anatomy/makeup-data";
import { EYE_SHAPES } from "../registry/anatomy/eye-detail";
import { checkMakeup, designMakeup, tapedEyeShape } from "../registry/anatomy/makeup-design";
import type { MakeupCheck } from "../registry/anatomy/makeup-design";
import { makeupPaint, paintPhoto } from "../registry/anatomy/makeup-paint";
import { MAKEUP_ZONES, resolveZone, zoneField } from "../registry/anatomy/makeup-zones";
import parity from "./fixtures/makeup-zone-parity.json";

const CANON = faceData.vertices as Vec3[];
const face = beautifulFace({ sex: 0 }).vertices;
/** The face's front surface under (x, y), seen from the front. */
const skinZ = (V: readonly Vec3[], x: number, y: number) => {
  let best = -Infinity;
  for (const [a, b, c] of faceData.triangles as number[][]) {
    const A = V[a], B = V[b], C = V[c], d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    if (Math.abs(d) < 1e-9) continue;
    const w1 = ((B[1] - C[1]) * (x - C[0]) + (C[0] - B[0]) * (y - C[1])) / d, w2 = ((C[1] - A[1]) * (x - C[0]) + (A[0] - C[0]) * (y - C[1])) / d;
    if (w1 >= 0 && w2 >= 0 && 1 - w1 - w2 >= 0) best = Math.max(best, w1 * A[2] + w2 * B[2] + (1 - w1 - w2) * C[2]);
  }
  return best;
};

describe("MAKEUP1 zone atlas", () => {
  it("weighs the same as the Python pipeline on the canonical face (one atlas, two languages)", () => {
    for (const [id, ws] of Object.entries(parity.weights)) {
      const f = zoneField(id, CANON);
      parity.points.forEach((p, k) => expect(f(p as Vec3), `${id} at point ${k}`).toBeCloseTo(ws[k], 5));
    }
    expect(Object.keys(parity.weights).sort()).toEqual(MAKEUP_ZONES.map(z => z.id).sort());
  });
  it("places the East Asian zones: aegyo-sal under the lower lid, the puppy wing down, the tear mole on one side", () => {
    const V = beautifulFace({ sex: 0, faceType: "east-asian" }).vertices;
    const aegyo = zoneField("aegyo-sal", V);
    expect(aegyo([V[145][0], V[145][1] - 2.5, V[145][2]])).toBeGreaterThan(0.5);
    expect(aegyo(V[159])).toBeLessThan(0.1);
    const wing = resolveZone("puppy-wing", V)[0].pts, tip = wing[wing.length - 1];
    expect(tip[1]).toBeLessThan(wing[0][1]);
    expect(Math.abs(tip[0])).toBeGreaterThan(Math.abs(wing[0][0]));
    expect(resolveZone("tear-mole", V)).toHaveLength(1);
    // the straight brow's upper edge: points 1-4 (head top to tail) on one line, seen from the front
    const up = resolveZone("brow-straight", V)[0].pts.slice(1, 5), [a, b] = [up[0], up[up.length - 1]];
    const off = (p: Vec3) => Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (const p of up) expect(off(p)).toBeLessThan(0.6);
  });
  it("paints thin strokes off the lid on the skin of every face (wing tips, aegyo-sal shadow, tear mole)", () => {
    for (const V of [beautifulFace({ sex: 0, faceType: "east-asian" }).vertices, beautifulFace({ sex: 0 }).vertices, CANON]) {
      for (const id of ["puppy-wing", "liner-wing", "aegyo-sal-shadow", "tear-mole"]) {
        const pts = resolveZone(id, V)[0].pts, end = pts[Math.floor((pts.length - 1) * 0.75)];
        // just inside the stroke's end, on the skin under it
        const q: Vec3 = [end[0], end[1], skinZ(V, end[0], end[1])];
        expect(zoneField(id, V)(q), id).toBeGreaterThan(0.5);
      }
    }
  });
  it("lines the whole lower lash line from the outer corner: a fine line on the skin, not a smudge", () => {
    for (const V of [beautifulFace({ sex: 0, faceType: "east-asian" }).vertices, beautifulFace({ sex: 0 }).vertices, CANON]) {
      const f = zoneField("liner-lower", V), pts = resolveZone("liner-lower", V)[0].pts;
      // starts at the outer corner, so `scale` keeps the outer part of the line (outer third, half, two thirds)
      expect(Math.hypot(pts[0][0] - V[33][0], pts[0][1] - V[33][1])).toBeLessThan(1);
      // half a millimetre under each lower lid point, inner to outer, on the skin
      for (const v of [154, 153, 145, 144, 163, 7]) expect(f([V[v][0], V[v][1] - 0.5, skinZ(V, V[v][0], V[v][1] - 0.5)]), `under ${v}`).toBeGreaterThan(0.5);
      expect(f([V[145][0], V[145][1] - 2.5, skinZ(V, V[145][0], V[145][1] - 2.5)])).toBeLessThan(0.2);
    }
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

describe("MAKEUP1 eye tools in the plan", () => {
  const shape = (id: string) => EYE_SHAPES.find(s => s.id === id)!;
  const get = (cs: MakeupCheck[], id: string) => cs.find(c => c.id === id)!;
  it("tape makes a single lid double without lowering a crease", () => {
    const mono = tapedEyeShape(shape("monolid"), 1);
    expect(mono.crease).toBeCloseTo(6.5, 6); expect(mono.height).toBeCloseTo(9.2, 6); expect(mono.hood).toBe(0);
    const infold = tapedEyeShape(shape("inner-double"), 1);
    expect(infold.crease).toBeCloseTo(6.5, 6); expect(infold.infold).toBe(true); expect(infold.height).toBeCloseTo(10.0, 6);
    const almond = tapedEyeShape(shape("almond"), 1);
    expect(almond.crease).toBeCloseTo(7.5, 6); expect(almond.height).toBeCloseTo(10.0, 6);
    expect(tapedEyeShape(shape("almond"), 0)).toBe(shape("almond"));
  });
  it("scales the eye tools with intensity inside their caps", () => {
    const look: Look = { id: "t", label: "t", summary: "", layers: [], evidence: [], lashes: { length: 1.3, thickness: 1.2, darkness: 1, style: "spiky" }, eyes: { lens: { diameter: 14.5, ring: 0.8 }, tape: 1 }, brows: { density: 1, straight: 0.8 } };
    const strong = designMakeup({ look, face, intensity: 1.5 });
    expect(strong.eyes.lens!.diameter).toBeLessThanOrEqual(14.5); expect(strong.eyes.tape).toBeLessThanOrEqual(1);
    expect(strong.lashes.style).toBe("spiky"); expect(strong.brows.straight).toBeLessThanOrEqual(1);
    const bare = designMakeup({ look, face, intensity: 0 });
    expect(bare.eyes.lens).toBeUndefined(); expect(bare.eyes.tape).toBe(0); expect(bare.brows.straight).toBe(0);
  });
  it("checks the aegyo-sal height, a puppy wing's droop and the lens size", () => {
    const V = beautifulFace({ sex: 0, faceType: "east-asian" }).vertices;
    const look: Look = { id: "t2", label: "t2", summary: "", evidence: [], eyes: { lens: { diameter: 14.0, ring: 0.6 } }, layers: [
      { zone: "aegyo-sal", colour: { kind: "palette", swatch: "highlight" }, coverage: 0.6 }, { zone: "puppy-wing", colour: { kind: "liner", tone: "brown" }, coverage: 0.9 }] };
    const good = checkMakeup(designMakeup({ look, face: V }), V);
    expect(get(good, "aegyo-sal-height").ok).toBe(true); expect(get(good, "wing-angle").ok).toBe(true); expect(get(good, "lens-size").ok).toBe(true);
    const bad = checkMakeup(designMakeup({ look: { ...look, eyes: { lens: { diameter: 15.5, ring: 0.6 } } }, face: V, overrides: { "aegyo-sal": { adjust: { radius: 3 } } } }), V);
    expect(get(bad, "aegyo-sal-height").ok).toBe(false); expect(get(bad, "lens-size").ok).toBe(false);
  });
});

describe("MAKEUP1 East Asian looks", () => {
  const EAST_ASIAN = ["c-glam", "k-idol", "jirai", "neo-gyaru", "ryousangata"];
  it("designs the East Asian looks on single, in-fold and almond lids, for women and men", () => {
    for (const id of EAST_ASIAN) {
      for (const e of MAKEUP_LOOKS.find(l => l.id === id)!.evidence) expect(MAKEUP_EVIDENCE.some(x => x.id === e), `${id} cites ${e}`).toBe(true);
      for (const eyeShape of ["monolid", "inner-double", "almond"] as const) for (const sex of [0, 1]) {
        const V = beautifulFace({ sex, faceType: "east-asian", eyeShape }).vertices;
        const plan = designMakeup({ look: id, face: V, eyeShape, skin: sex ? "#d9b08c" : "#e8c6a8" });
        expect(plan.layers.length, id).toBeGreaterThan(6);
        for (const c of checkMakeup(plan, V)) expect(c.ok, `${id} ${eyeShape} sex ${sex}: ${c.message}`).toBe(true);
      }
    }
  });
  it("paints a new look on a photograph without its eye tools", () => {
    const W = 220, H = 260, data = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) data.set([205, 160, 135, 255], i * 4);
    const landmarks = CANON.map(([x, y, z]) => [W / 2 + x * 1.1, H / 2 - y * 1.1 + 6, -z * 1.1]);
    const out = paintPhoto({ width: W, height: H, data, landmarks }, designMakeup({ look: "c-glam", face, skin: "#d8a98a" }));
    const lc = CANON[17].map((v, k) => (v + CANON[14][k]) / 2) as Vec3, x = Math.round(W / 2 + lc[0] * 1.1), y = Math.round(H / 2 - lc[1] * 1.1 + 6), i = (y * W + x) * 4;
    expect(out[i] - out[i + 1]).toBeGreaterThan(205 - 160 + 15);
  });
  it("lifts the wing on downturned eyes and flattens it on upturned eyes", () => {
    const angle = (eyeShape: string) => {
      const V = beautifulFace({ sex: 0, eyeShape }).vertices, plan = designMakeup({ look: "classic-red", face: V, eyeShape });
      const p = resolveZone("liner-wing", V, plan.layers.find(l => l.zone === "liner-wing")!.adjust)[0].pts, tip = p[p.length - 1];
      return Math.atan2(tip[1] - p[0][1], Math.abs(tip[0] - p[0][0])) * 180 / Math.PI;
    };
    expect(angle("downturned")).toBeGreaterThan(angle("almond"));
    expect(angle("upturned")).toBeLessThan(angle("almond"));
    expect(angle("round")).toBeLessThan(angle("almond"));
  });
});

describe("MAKEUP1 eye tools in the renderer", () => {
  const Lstar = (p: Portrait, x: number, y: number) => {
    const i = (Math.round(y) * p.width + Math.round(x)) * 4;
    return linearToLab([srgbDecode(p.rgba[i] / 255), srgbDecode(p.rgba[i + 1] / 255), srgbDecode(p.rgba[i + 2] / 255)])[0];
  };
  it("a lens widens the iris and keeps a dilated pupil black", () => {
    const base = { framing: "eyes" as const, width: 192, height: 96, pupil: 8, makeup: "none" as const };
    const bare = renderPortrait(base);
    const lens = renderPortrait({ ...base, paint: { key: "lens", shade() {}, eyes: { lens: { diameter: 14.5, ring: 0.6 } } } });
    for (const [outer, inner, upper, lower] of [[33, 133, 159, 145], [263, 362, 386, 374]]) {
      const lm = bare.landmarks, x0 = Math.min(lm[outer][0], lm[inner][0]), x1 = Math.max(lm[outer][0], lm[inner][0]), y0 = lm[upper][1], y1 = lm[lower][1];
      // dark pixels (iris and pupil) inside the opening, away from the lash line
      const dark = (p: Portrait) => {
        let n = 0;
        for (let y = Math.ceil(y0 + 1); y < y1 - 1; y++) for (let x = Math.ceil(x0 + 2); x < x1 - 2; x++) if (Lstar(p, x, y) < 35) n++;
        return n;
      };
      expect(dark(lens)).toBeGreaterThan(1.2 * dark(bare));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      for (const p of [bare, lens]) {
        let m = 100;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) m = Math.min(m, Lstar(p, cx + dx, cy + dy));
        expect(m).toBeLessThan(15);
      }
    }
  }, 120000);
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
    const at = (o: Uint8ClampedArray, p: Vec3) => { const x = Math.round(W / 2 + p[0] * 1.1), y = Math.round(H / 2 - p[1] * 1.1 + 6), i = (y * W + x) * 4; return [o[i], o[i + 1], o[i + 2]]; };
    const lc = CANON[17].map((v, k) => (v + CANON[14][k]) / 2) as Vec3;
    const lip = at(out, lc);
    expect(lip[0] - lip[1]).toBeGreaterThan(70);
    expect(Array.from(out.slice(0, 4))).toEqual([205, 160, 135, 255]);
    // an opaque lipstick looks the same over light and dark bare lips: their darkness is their colour, not the light
    const outline = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146].map(i => landmarks[i]);
    const inLips = (x: number, y: number) => outline.reduce((c, [xa, ya], a) => {
      const [xb, yb] = outline[(a + 1) % outline.length];
      return (ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa ? !c : c;
    }, false);
    const dark = data.slice();
    for (let i = 0; i < W * H; i++) if (inLips((i % W) + 0.5, Math.floor(i / W) + 0.5)) dark.set([140, 80, 80], i * 4);
    const opaque = { ...plan, layers: plan.layers.filter(l => l.zone === "lips").map(l => ({ ...l, blend: "normal" as const, coverage: 1 })) };
    const [overLight, overDark] = [data, dark].map(d => at(paintPhoto({ width: W, height: H, data: d, landmarks }, opaque), lc));
    overLight.forEach((v, k) => expect(Math.abs(v - overDark[k]), `channel ${k}`).toBeLessThanOrEqual(3));
  });
});
