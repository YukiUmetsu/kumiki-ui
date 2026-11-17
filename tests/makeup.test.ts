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
import type { MakeupCheck, MakeupPlan } from "../registry/anatomy/makeup-design";
import { makeupPaint, makeupPortraitOptions, paintPhoto, wearsMakeup } from "../registry/anatomy/makeup-paint";
import { MAKEUP_RUNNERS } from "../registry/anatomy/makeup-render-jobs";
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
  it("shortens a stroke along its own line with span: a lower liner on the outer half stays on the lid", () => {
    const toSeg = (p: Vec3, a: Vec3, b: Vec3) => {
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      const t = Math.min(1, Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / L2));
      return Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t, p[2] - a[2] - ab[2] * t);
    };
    for (const V of [beautifulFace({ sex: 0, faceType: "east-asian" }).vertices, CANON]) {
      const f = zoneField("liner-lower", V, { span: 0.5 }), under = (v: number) => f([V[v][0], V[v][1] - 0.5, skinZ(V, V[v][0], V[v][1] - 0.5)]);
      for (const v of [7, 163, 144]) expect(under(v), `under ${v}`).toBeGreaterThan(0.5);
      for (const v of [153, 154]) expect(under(v), `under ${v}`).toBeLessThan(0.2);
      // the cut end lies on the zone's own line (a scale would pull it off the lid)
      const full = resolveZone("liner-lower", V)[0].pts, cut = resolveZone("liner-lower", V, { span: 0.5 })[0].pts, end = cut[cut.length - 1];
      expect(cut.length).toBeLessThan(full.length);
      expect(Math.min(...full.slice(1).map((b, i) => toSeg(end, full[i], b)))).toBeLessThan(1e-6);
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
    expect(infold.crease).toBeCloseTo(6.5, 6); expect(infold.infold).toBe(true); expect(infold.height - shape("inner-double").height).toBeCloseTo(0.5, 6);
    const almond = tapedEyeShape(shape("almond"), 1);
    expect(almond.crease).toBeCloseTo(7.5, 6); expect(almond.height).toBeCloseTo(10.0, 6);
    expect(tapedEyeShape(shape("almond"), 0)).toBe(shape("almond"));
  });
  it("scales the eye tools with intensity inside their caps", () => {
    const look: Look = { id: "t", label: "t", summary: "", layers: [], evidence: [], lashes: { length: 1.3, thickness: 1.2, darkness: 1, style: "spiky" }, eyes: { lens: { diameter: 14.5, ring: 0.8 }, tape: 1 }, brows: { density: 1, straight: 0.8 } };
    const strong = designMakeup({ look, face, intensity: 1.5 });
    expect(strong.eyes!.lens!.diameter).toBeLessThanOrEqual(14.5); expect(strong.eyes!.tape).toBeLessThanOrEqual(1);
    expect(strong.lashes.style).toBe("spiky"); expect(strong.brows.straight).toBeLessThanOrEqual(1);
    expect(strong.lashes.styleStrength).toBe(1);
    expect(designMakeup({ look, face, intensity: 0.1 }).lashes.styleStrength).toBeCloseTo(0.1, 6);
    const bare = designMakeup({ look, face, intensity: 0 });
    expect(bare.eyes!.lens).toBeUndefined(); expect(bare.eyes!.tape).toBe(0); expect(bare.brows.straight).toBe(0);
    // a bare plan renders the bare portrait; a plan with only lashes is still made up
    expect(wearsMakeup(bare)).toBe(false); expect(wearsMakeup(designMakeup({ look: "bare", face }))).toBe(false);
    expect(wearsMakeup(designMakeup({ look: { id: "l", label: "l", summary: "", evidence: [], layers: [], lashes: { length: 1.3, thickness: 1, darkness: 0.5 } }, face }))).toBe(true);
  });
  it("checks the aegyo-sal height, a puppy wing's droop and the lens size", () => {
    const V = beautifulFace({ sex: 0, faceType: "east-asian" }).vertices;
    const look: Look = { id: "t2", label: "t2", summary: "", evidence: [], eyes: { lens: { diameter: 14.0, ring: 0.6 } }, layers: [
      { zone: "aegyo-sal", colour: { kind: "palette", swatch: "highlight" }, coverage: 0.6 }, { zone: "puppy-wing", colour: { kind: "liner", tone: "brown" }, coverage: 0.9 }] };
    const good = checkMakeup(designMakeup({ look, face: V }), V);
    expect(get(good, "aegyo-sal-height").ok).toBe(true); expect(get(good, "puppy-wing-angle").ok).toBe(true); expect(get(good, "lens-size").ok).toBe(true);
    // a look with both wings gets one check for each (ids are unique, as React keys need)
    const both = checkMakeup(designMakeup({ look: { ...look, layers: [...look.layers, { zone: "liner-wing", colour: { kind: "liner", tone: "black" }, coverage: 0.9 }] }, face: V }), V);
    expect(new Set(both.map(c => c.id)).size).toBe(both.length);
    // at a low intensity the lens is nearly natural: smaller than a circle lens is not a fault
    expect(get(checkMakeup(designMakeup({ look, face: V, intensity: 0.2 }), V), "lens-size").ok).toBe(true);
    const bad = checkMakeup(designMakeup({ look: { ...look, eyes: { lens: { diameter: 15.5, ring: 0.6 } } }, face: V, overrides: { "aegyo-sal": { adjust: { radius: 3 } } } }), V);
    expect(get(bad, "aegyo-sal-height").ok).toBe(false); expect(get(bad, "lens-size").ok).toBe(false);
  });
});

describe("MAKEUP1 plans adapt and stay readable", () => {
  const eastAsian = beautifulFace({ sex: 0, faceType: "east-asian" }).vertices;
  it("reads a plan saved before the eye tools (no eyes, no brow straightening)", () => {
    const old = JSON.parse(JSON.stringify(designMakeup({ look: "classic-red", face }))) as MakeupPlan & { eyes?: unknown; brows: { straight?: number } };
    delete old.eyes; delete old.brows.straight;
    expect(() => makeupPaint(old)).not.toThrow();
    expect(() => makeupPortraitOptions({ width: 64, height: 80 }, old)).not.toThrow();
    expect(() => checkMakeup(old, face)).not.toThrow();
  });
  it("tapes the face's own eye shape, and leaves measured lids (no eye shape) as they are", () => {
    const plan = designMakeup({ look: "neo-gyaru", face: eastAsian });
    expect(makeupPortraitOptions({ width: 64, height: 80 }, plan).eyeShape).toBeUndefined();
    const own = beautifulFace({ faceType: "east-asian" }).eyeShape;
    if (own) expect((makeupPortraitOptions({ faceType: "east-asian", width: 64, height: 80 }, plan).eyeShape as { id: string }).id).toBe(`${own.id}+tape`);
  });
  it("counts a lipstick lighter than deep skin as lip contrast, and a lipstick at the skin's own value as none", () => {
    for (const look of ["k-idol", "igari", "c-glam", "monochrome-rose"]) {
      const checks = checkMakeup(designMakeup({ look, face: eastAsian, skin: "#6b4430" }), eastAsian);
      expect(checks.find(c => c.id === "lip-contrast")!.ok, look).toBe(true);
    }
    const flat: Look = { id: "flat", label: "flat", summary: "", evidence: [], layers: [{ zone: "lips", colour: { kind: "skin", dL: 0 }, coverage: 1 }] };
    expect(checkMakeup(designMakeup({ look: flat, face: eastAsian, skin: "#6b4430" }), eastAsian).find(c => c.id === "lip-contrast")!.ok).toBe(false);
  });
  it("keeps a brow that peaks early straight instead of drawing an arch over bare skin", () => {
    const ea = designMakeup({ look: "classic-red", face: eastAsian });
    expect(ea.layers.some(l => l.zone === "brow")).toBe(false);
    expect(ea.layers.some(l => l.zone === "brow-straight")).toBe(true);
    expect(checkMakeup(ea, eastAsian).every(c => c.id !== "brow-peak")).toBe(true);
    const other = designMakeup({ look: "classic-red", face });
    expect(other.layers.some(l => l.zone === "brow")).toBe(true);
    expect(checkMakeup(other, face).find(c => c.id === "brow-peak")!.ok).toBe(true);
  });
  it("scales brow density with the intensity, colours drawn lower lashes like the liner, and curls mascaraed lashes", () => {
    expect(designMakeup({ look: "k-idol", face, intensity: 0 }).brows.density).toBe(1);
    expect(designMakeup({ look: "k-idol", face, intensity: 1 }).brows.density).toBeCloseTo(1.15, 6);
    const lower = designMakeup({ look: "ryousangata", face }).lashes.lower!.colour!;
    expect(lower[0]).toBeGreaterThan(lower[2] * 1.3); // a brown liner, not the lashes' black
    expect(designMakeup({ look: "classic-red", face }).lashes.curl).toBe(1);
    expect(designMakeup({ look: "classic-red", face, intensity: 0.5 }).lashes.curl).toBeCloseTo(0.5, 6);
    expect(designMakeup({ look: "bare", face }).lashes.curl ?? 0).toBe(0);
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
    // the eye zones too: the aegyo-sal under the lower lid is lighter, the liner over the upper lid darker
    const luma = (o: Uint8ClampedArray, p: Vec3, dy: number, pick: (a: number[]) => number) => {
      const cx = Math.round(W / 2 + p[0] * 1.1), cy = Math.round(H / 2 - (p[1] + dy) * 1.1 + 6), vals: number[] = [];
      for (let yy = cy - 1; yy <= cy + 1; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++) { const j = (yy * W + xx) * 4; vals.push(0.2126 * o[j] + 0.7152 * o[j + 1] + 0.0722 * o[j + 2]); }
      return pick(vals);
    };
    const bare = 0.2126 * 205 + 0.7152 * 160 + 0.0722 * 135, mean = (a: number[]) => a.reduce((u, v) => u + v, 0) / a.length;
    expect(luma(out, CANON[145], -2.5, mean)).toBeGreaterThan(bare + 4);
    expect(luma(out, CANON[160], 0.8, a => Math.min(...a))).toBeLessThan(bare - 40);
  });
  it("lifts the wing on downturned eyes and flattens it on upturned eyes", () => {
    const angle = (eyeShape: string, named = true) => {
      const V = beautifulFace({ sex: 0, eyeShape }).vertices, plan = designMakeup({ look: "classic-red", face: V, ...(named ? { eyeShape } : {}) });
      const p = resolveZone("liner-wing", V, plan.layers.find(l => l.zone === "liner-wing")!.adjust)[0].pts, tip = p[p.length - 1];
      return Math.atan2(tip[1] - p[0][1], Math.abs(tip[0] - p[0][0])) * 180 / Math.PI;
    };
    expect(angle("downturned")).toBeGreaterThan(angle("almond"));
    expect(angle("upturned")).toBeLessThan(angle("almond"));
    expect(angle("round")).toBeLessThan(angle("almond"));
    // a face whose tilt is measured, not named (a photograph): the same direction
    expect(angle("downturned", false)).toBeGreaterThan(angle("almond", false));
    expect(angle("upturned", false)).toBeLessThan(angle("almond", false));
  });
  it("keeps popular platform names out of the looks, the evidence text and the zone notes (spec: research note and search terms only)", () => {
    const text = [...MAKEUP_LOOKS.flatMap(l => [l.label, l.summary]), ...MAKEUP_EVIDENCE.flatMap(e => [e.finding, e.appliedAs]), ...MAKEUP_ZONES.flatMap(z => [z.label, z.note ?? ""])].join(" ");
    expect(text).not.toMatch(/douyin|tiktok|xiaohongshu|instagram/i);
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
  it("clamps a lens to 15 mm and to just past the pupil, and tints only outside the pupil", () => {
    const base = { framing: "eyes" as const, width: 96, height: 48, pupil: 8, makeup: "none" as const };
    const lens = (diameter: number, tint?: [number, number, number]) => renderPortrait({ ...base, paint: { key: `lens-${diameter}-${tint}`, shade() {}, eyes: { lens: { diameter, ring: 0.5, ...(tint ? { tint } : {}) } } } }).rgba;
    const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.length === b.length && a.every((v, i) => v === b[i]);
    expect(same(lens(8), lens(9))).toBe(true);
    expect(same(lens(20), lens(15))).toBe(true);
    // along a row through the pupil: the pupil's edge stays where it is, and the first iris pixels take the tint
    const plain = renderPortrait({ ...base, width: 192, height: 96, paint: { key: "lens-plain", shade() {}, eyes: { lens: { diameter: 13, ring: 0.5 } } } });
    const red = renderPortrait({ ...base, width: 192, height: 96, paint: { key: "lens-red", shade() {}, eyes: { lens: { diameter: 13, ring: 0.5, tint: [0.45, 0.04, 0.03] } } } });
    const lm = plain.landmarks, cy = Math.round((lm[159][1] + lm[145][1]) / 2), cx = Math.round((lm[33][0] + lm[133][0]) / 2);
    const edge = (p: Portrait) => { let x = cx; while (Lstar(p, x, cy) < 15 && x < cx + 30) x++; return x; };
    expect(Math.abs(edge(red) - edge(plain))).toBeLessThanOrEqual(1);
    const at = (p: Portrait, x: number) => { const i = (cy * p.width + x) * 4; return [p.rgba[i], p.rgba[i + 1]]; };
    const [rr, rg] = at(red, edge(plain) + 2), [pr, pg] = at(plain, edge(plain) + 2);
    expect(rr - rg).toBeGreaterThan(pr - pg + 10);
  }, 120000);
  it("stops styled lashes at 14 mm above and 8 mm below", () => {
    const base = { faceType: "east-asian" as const, eyeShape: "inner-double", framing: "eyes" as const, width: 96, height: 48, makeup: "none" as const };
    const lashes = (up: number, low: number) => renderPortrait({ ...base, paint: { key: `cap-${up}-${low}`, shade() {}, lashes: { length: up, thickness: 1.2, darkness: 1, style: "spiky", lower: { length: low, darkness: 1, drawn: 0 } } } }).rgba;
    const same = (a: Uint8ClampedArray, b: Uint8ClampedArray) => a.every((v, i) => v === b[i]);
    const ref = lashes(3, 2.5);
    expect(same(ref, lashes(5, 2.5))).toBe(true); // every upper lash and spike is past 14 mm
    expect(same(ref, lashes(3, 4))).toBe(true); // every lower lash is past 8 mm
  }, 120000);
  it("false lashes rise past a single lid's fold (bare lashes on it point at the camera) and fade in with their strength", () => {
    const base = { faceType: "east-asian" as const, eyeShape: "monolid", framing: "eyes" as const, width: 192, height: 96, makeup: "none" as const };
    const lashes = (style: "natural" | "spiky" | "doll") => renderPortrait({ ...base, paint: { key: `lashes-${style}`, shade() {}, lashes: { length: 1.25, thickness: 1.3, darkness: 1, style } } });
    const natural = lashes("natural"), spiky = lashes("spiky"), doll = lashes("doll");
    // mean L* in a band 1 to 4 px (about 0.4-1.5 mm) above the upper lid, across each eye: a lash is thinner than a
    // pixel here, so the band's mean shows it, not a count of dark pixels
    const above = (p: Portrait) => {
      let sum = 0, n = 0;
      for (const [outer, inner, upper] of [[33, 133, 159], [263, 362, 386]]) {
        const lm = natural.landmarks, x0 = Math.min(lm[outer][0], lm[inner][0]), x1 = Math.max(lm[outer][0], lm[inner][0]), yl = lm[upper][1];
        for (let y = Math.round(yl - 4); y <= Math.round(yl - 1); y++) for (let x = Math.ceil(x0); x < x1; x++) { sum += Lstar(p, x, y); n++; }
      }
      return sum / n;
    };
    expect(above(spiky)).toBeLessThan(above(natural) - 4);
    expect(above(doll)).toBeLessThan(above(natural) - 4);
    // a style fades in with its strength: a faint one is nearly the natural lashes, not a full set
    const faint = renderPortrait({ ...base, paint: { key: "lashes-faint", shade() {}, lashes: { length: 1.25, thickness: 1.3, darkness: 1, style: "doll", styleStrength: 0.05 } } });
    expect(Math.abs(above(faint) - above(natural))).toBeLessThan(1.5);
  }, 120000);
});

describe("MAKEUP1 in a render worker", () => {
  it("renders a plan from plain data, as a worker gets it (a paint's functions cannot be cloned)", () => {
    const portrait = { faceType: "east-asian" as const, eyeShape: "monolid", framing: "eyes" as const, width: 96, height: 48, makeup: "none" as const };
    const plan = designMakeup({ look: "neo-gyaru", face: beautifulFace(portrait).vertices, eyeShape: "monolid", skin: "#d8a98a" });
    const args = structuredClone({ portrait, plan });
    const out = (MAKEUP_RUNNERS["makeup-portrait"] as unknown as (a: typeof args) => { rgba: Uint8ClampedArray })(args);
    const direct = renderPortrait(makeupPortraitOptions(portrait, plan));
    expect(out.rgba.length).toBe(direct.rgba.length);
    expect(out.rgba.every((v, i) => v === direct.rgba[i])).toBe(true);
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
