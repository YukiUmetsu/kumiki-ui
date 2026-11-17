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

import { beautifulFace, FACE_TYPE_GROUPS, FACE_TYPES, goldenRatioReport, PHI } from "../registry/anatomy/face-beauty";
import { renderPortrait } from "../registry/anatomy/face-portrait";
import { FRINGES, HAIRSTYLES, findHairStyle, groomHair, partLine, scalpCover } from "../registry/anatomy/hair-groom";
import type { HairGroom } from "../registry/anatomy/hair-groom";
import { EYE_SHAPES, IRIS_TYPES, findIris, irisAlbedo } from "../registry/anatomy/eye-detail";
import { SKIN_REGIONS, faceWrinkles, findSkinRegion, renderSkinSwatch, skinSurface } from "../registry/anatomy/skin-texture";
import { GRASPS, HAND_ANIMATIONS, HAND_GESTURES, HAND_TYPES, animateHand, buildHand, graspHand, minimumJerk, poseHand, propDistance } from "../registry/anatomy/hand-model";
import { renderHand } from "../registry/anatomy/hand-render";
import { eyeCentres, FACE_LANDMARKS } from "../registry/anatomy/anatomy-face";
import { createRaster, fft2, fillPolygon, gaussianBlur, strokePolyline } from "../registry/anatomy/foundation-raster";

describe("ANAT1 beautiful faces and portraits", () => {
  it("applies the attractiveness findings: symmetric, measured breadths and eyes, Pallett's ratios, closed lips", () => {
    for (const sex of [0, 1]) {
      // the findings alone (no face type: the type's stars then move the face toward their own shape)
      const f = beautifulFace({ sex, realFaces: 0 }), v = f.vertices, L = (k: keyof typeof FACE_LANDMARKS) => v[FACE_LANDMARKS[k]];
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
      // (the face type's stars set the lips last: modern Northern European stars' lower lip is about 1.5 times the upper)
      expect(f.applied.lowerLip / f.applied.upperLip).toBeGreaterThan(1.4);
      expect(v[13][1] - v[14][1]).toBeLessThan(0.6);
      // a slight upward tilt (preferred in female faces, Bashour & Geist 2007)
      expect(f.applied.canthalTilt).toBeGreaterThan(sex ? 1 : 2);
    }
    // beauty 0 keeps the calibrated average face
    expect(beautifulFace({ sex: 0, beauty: 0 }).vertices).toEqual(createFace({ sex: 0 }).vertices);
  });
  it("builds face types per ancestry from freely licensed modern photographs: several stars each, gentle, never blended", () => {
    expect(FACE_TYPE_GROUPS.length).toBeGreaterThanOrEqual(6);
    for (const [key, t] of Object.entries(FACE_TYPES)) {
      expect(key).toBe(`${t.group}:${t.sex}`);
      // several people a type, so none of them is copied
      expect(t.n).toBeGreaterThanOrEqual(4);
      expect(t.sources).toHaveLength(t.n);
      // free licences only, each photograph credited (measured, never redistributed)
      expect(t.sources.every(x => /public domain|cc0|^pd$|^cc by(-sa)? \d/i.test(x.licence))).toBe(true);
      expect(t.sources.every(x => /public domain|cc0|^pd$/i.test(x.licence) || (x.author ?? "").length > 0)).toBe(true);
      expect(t.offsets).toHaveLength(468);
      expect(Math.max(...t.offsets.map(o => Math.hypot(o[0], o[1], o[2] ?? 0)))).toBeLessThan(15);
    }
    // a type changes the face, realFaces 0 leaves it as it was, and two groups give two different faces
    const g = FACE_TYPE_GROUPS.map(x => x.id), a = beautifulFace({ sex: 0, faceType: g[0], realFaces: 0 }).vertices, b = beautifulFace({ sex: 0, faceType: g[0] }).vertices;
    const far = (p: readonly (readonly number[])[], q: readonly (readonly number[])[]) => Math.max(...p.map((x, i) => Math.hypot(x[0] - q[i][0], x[1] - q[i][1], x[2] - q[i][2])));
    expect(far(a, b)).toBeGreaterThan(1);
    expect(far(b, beautifulFace({ sex: 0, faceType: g[g.length - 1] }).vertices)).toBeGreaterThan(1);
    // bone structure differs by group: the East Asian stars' nasal root and brow ridge sit further back than the
    // Northern European stars' (measured on their photographs, as the anthropological literature describes)
    const rel = (f: ReturnType<typeof beautifulFace>, i: number) => f.vertices[i][2] - eyeCentres(f.vertices).L[2];
    const ea = beautifulFace({ sex: 0, faceType: "east-asian" }), ne = beautifulFace({ sex: 0, faceType: "northern-european" });
    expect(rel(ea, FACE_LANDMARKS.sellion)).toBeLessThan(rel(ne, FACE_LANDMARKS.sellion) - 0.5);
    expect(rel(ea, FACE_LANDMARKS["brow-mid.L"])).toBeLessThan(rel(ne, FACE_LANDMARKS["brow-mid.L"]) - 0.5);
    // face-shape variants within a type: several people each, a real difference
    for (const t of Object.values(FACE_TYPES)) for (const [k, x] of (t.variants ?? []).entries()) {
      expect(x.n).toBeGreaterThanOrEqual(4);
      expect(x.offsets).toHaveLength(468);
      const base = beautifulFace({ sex: t.sex === "female" ? 0 : 1, faceType: t.group }).vertices;
      expect(far(base, beautifulFace({ sex: t.sex === "female" ? 0 : 1, faceType: t.group, faceVariant: k + 1 }).vertices)).toBeGreaterThan(0.3);
    }
    // still symmetric after it (the symmetry step follows)
    const f = beautifulFace({ sex: 1 }), L = (k: keyof typeof FACE_LANDMARKS) => f.vertices[FACE_LANDMARKS[k]];
    expect(Math.abs(L("exocanthion.L")[0] + L("exocanthion.R")[0])).toBeLessThan(0.2);
    // the lids sit on the iris at measured margin-to-pupil distances (MRD1 about 4, MRD2 about 5.3 mm), where the
    // portrait puts the eyeball; the mouth's corners at the height measured on the stars' closed mouths
    for (const sex of [0, 1]) {
      const g = beautifulFace({ sex }), M = (k: keyof typeof FACE_LANDMARKS) => g.vertices[FACE_LANDMARKS[k]], ec = eyeCentres(g.vertices).L;
      const mrd1 = M("palpebrale-superius.L")[1] - ec[1], mrd2 = ec[1] - M("palpebrale-inferius.L")[1];
      expect(mrd1).toBeGreaterThan(3.6); expect(mrd1).toBeLessThan(4.9);
      expect(mrd2).toBeGreaterThan(4.9); expect(mrd2).toBeLessThan(5.8);
      expect(M("cheilion.L")[1] - M("stomion")[1]).toBeCloseTo(-FACE_TYPES[`northern-european:${sex ? "male" : "female"}`].mouthCorner, 1);
    }
  });
  it("reports the golden-ratio checks without building on them", () => {
    const f = beautifulFace({ sex: 0 }), rows = goldenRatioReport(f.vertices, f.hairlineY);
    expect(rows.find(x => x.id === "mouth-nose")!.target).toBeCloseTo(PHI, 6);
    // the evidence-built face is not tuned to φ: the claims are reported, not imposed
    expect(rows.some(r => Math.abs(r.value - r.target) / r.target > 0.03)).toBe(true);
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
    // (measured on modern photographs: full fringes end about 2 mm below the brows' upper edge in the middle)
    expect(Math.abs(tips.reduce((p, q) => p + q, 0) / tips.length - (head.browY - 3))).toBeLessThan(4);
    // gravity: the bangs' ends hang down (they settle under their weight, not set at a straight angle)
    let down = 0, nb = 0;
    for (let s = 0; s < bangs.starts.length; s++) {
      if ((bangs.width?.[s] ?? 1) >= 1 || bangs.counts[s] < 3) continue;
      const e = (bangs.starts[s] + bangs.counts[s] - 1) * 3, f = e - 3, dl = Math.hypot(bangs.points[e] - bangs.points[f], bangs.points[e + 1] - bangs.points[f + 1], bangs.points[e + 2] - bangs.points[f + 2]);
      if (dl > 1e-6) { down += (bangs.points[e + 1] - bangs.points[f + 1]) / dl; nb++; }
    }
    expect(nb).toBeGreaterThan(100);
    expect(down / nb).toBeLessThan(-0.6);
    // collisions: long hair lies on the shoulders and chest, not inside them
    const torso = pts(a).filter(([x, y, z]) => Math.abs(x) < head.shoulderHalf * 0.9 && y < head.shoulderTop!(x) - 15 && z < head.chestFront!(x) - 3 && z > head.chestFront!(x) - 90);
    expect(torso.length / pts(a).length).toBeLessThan(0.003);
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
  it("eyes: shapes reach their measured opening, tilt and spacing; irises have zones and a dark rim; a close-up renders", () => {
    const at = (v: readonly number[][], k: string) => v[(FACE_LANDMARKS as Record<string, number>)[k]];
    const base = beautifulFace({ sex: 0 });
    expect(base.eyeShape).toBeUndefined();
    const ics = (v: readonly number[][]) => at(v, "endocanthion.L")[0] - at(v, "endocanthion.R")[0];
    for (const shape of EYE_SHAPES) {
      const v = beautifulFace({ sex: 0, eyeShape: shape.id }).vertices;
      const opening = at(v, "palpebrale-superius.L")[1] - at(v, "palpebrale-inferius.L")[1];
      const tilt = Math.atan2(at(v, "exocanthion.L")[1] - at(v, "endocanthion.L")[1], Math.abs(at(v, "exocanthion.L")[0] - at(v, "endocanthion.L")[0])) * 180 / Math.PI;
      expect(Math.abs(opening - shape.height), `${shape.id} opening ${opening}`).toBeLessThan(1.6);
      expect(Math.abs(tilt - shape.tilt), `${shape.id} tilt ${tilt}`).toBeLessThan(3);
      if (shape.spacing) expect(Math.sign(ics(v) - ics(base.vertices))).toBe(Math.sign(shape.spacing));
    }
    expect(EYE_SHAPES.find(x => x.id === "monolid")!.crease).toBe(0);
    // the zones differ (a hazel eye's centre is warmer than its outer zone), the limbal ring is darker, and it repeats
    const hz = findIris("hazel"), warm = (c: number[]) => c[0] / Math.max(1e-6, c[1]);
    const meanAt = (r: number) => { const acc = [0, 0, 0]; for (let k = 0; k < 64; k++) irisAlbedo(hz, r, (k / 64) * 2 * Math.PI, 3).forEach((x, i) => (acc[i] += x / 64)); return acc; };
    expect(warm(meanAt(0.12))).toBeGreaterThan(warm(meanAt(0.7)) + 0.05);
    expect(meanAt(0.98)[1]).toBeLessThan(meanAt(0.6)[1] * 0.75);
    expect(irisAlbedo(hz, 0.5, 1, 3)).toEqual(irisAlbedo(hz, 0.5, 1, 3));
    for (const id of ["dark-brown", "brown", "hazel", "green", "blue", "grey"]) expect(findIris(id).id).toBe(id);
    expect(IRIS_TYPES.length).toBeGreaterThanOrEqual(14);
    const p = renderPortrait({ sex: 0, width: 120, height: 52, supersample: 1, framing: "eyes", eyes: "blue", eyeShape: "round", hairStrands: 1500 });
    expect(p.rgba.length).toBe(120 * 52 * 4);
  }, 20000);
  it("skin: textured by region, deeper with age, pores where they are, detail fading by the pixel, wrinkles with age", () => {
    const grid = (id: string, age: number, fp = 0.03, f: "height" | "darken" = "height") => { const r = findSkinRegion(id), v: number[] = []; for (let j = 0; j < 40; j++) for (let i = 0; i < 40; i++) v.push(skinSurface(r, i * 0.2, j * 0.2, { age, footprint: fp, seed: 2 })[f]); return v; };
    const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length, sd = (v: number[]) => { const m = mean(v); return Math.sqrt(mean(v.map(x => (x - m) ** 2))); };
    expect(skinSurface(findSkinRegion("cheek"), 3.1, 4.2, { age: 40, seed: 3 })).toEqual(skinSurface(findSkinRegion("cheek"), 3.1, 4.2, { age: 40, seed: 3 }));
    // furrows deepen with age (replica studies)
    expect(sd(grid("back-of-hand", 70))).toBeGreaterThan(sd(grid("back-of-hand", 25)) * 1.3);
    // pores darken the nose more than the forearm
    expect(mean(grid("nose", 30, 0.03, "darken"))).toBeGreaterThan(mean(grid("forearm", 30, 0.03, "darken")));
    // detail finer than about two pixels fades out (no aliasing at portrait scale)
    expect(sd(grid("back-of-hand", 70, 3))).toBeLessThan(sd(grid("back-of-hand", 70)) * 0.05);
    // wrinkles: none at 20, some at 70
    const f = { browY: 50, hairlineY: 90, eyeY: 27, outerCorner: 46, neckTop: -100, alar: [17, -1] as [number, number], mouth: [24, -30] as [number, number] };
    let young = 0, old = 0;
    for (let y = -40; y < 85; y += 1.5) for (let x = -60; x < 60; x += 1.5) { young = Math.min(young, faceWrinkles(x, y, 20, f, 1)); old = Math.min(old, faceWrinkles(x, y, 70, f, 1)); }
    expect(young).toBe(0);
    expect(old).toBeLessThan(-0.1);
    expect(SKIN_REGIONS.length).toBeGreaterThanOrEqual(13);
    const sw = renderSkinSwatch({ region: "palm", age: 40, width: 40, height: 30 });
    expect(sw.rgba.length).toBe(40 * 30 * 4);
  });
  it("hands: measured sizes and digit ratios, grasps that touch their object, the thumb on its target, looping actions", () => {
    const gest = (id: string) => HAND_GESTURES.find(g => g.id === id)!.pose;
    for (const t of HAND_TYPES) {
      const h = buildHand(t.id), ph = poseHand(h, gest("open")), tip = ph.bones.find(b => b.finger === "middle" && b.seg === 2)!.b;
      // wrist crease to the middle fingertip is the type's hand length (ANSUR's definition)
      expect(Math.abs(tip[1] - t.length) / t.length, t.id).toBeLessThan(0.04);
      const sum = (f: "index" | "ring") => h.fingers[f].lengths.reduce((a, b) => a + b, 0);
      expect(sum("index") / sum("ring")).toBeCloseTo(t.digitRatio, 2);
    }
    // a medium wrap: every finger touches the handle and none sinks into it
    const man = buildHand("man"), wrap = graspHand(man, "medium-wrap");
    for (const f of ["index", "middle", "ring", "little"] as const) {
      let m = Infinity;
      for (const b of wrap.bones.filter(q => q.finger === f)) for (let k = 0; k <= 8; k++) { const t = k / 8, p: [number, number, number] = [b.a[0] + (b.b[0] - b.a[0]) * t, b.a[1] + (b.b[1] - b.a[1]) * t, b.a[2] + (b.b[2] - b.a[2]) * t]; m = Math.min(m, propDistance(p, wrap.prop) - (b.ra + (b.rb - b.ra) * t)); }
      expect(m, f).toBeLessThan(2);
      expect(m, f).toBeGreaterThan(-4);
    }
    expect(GRASPS.length).toBe(33);
    expect(GRASPS.reduce((a, g) => a + g.freq, 0)).toBeGreaterThan(95);
    // a fist: the thumb's tip lies on the middle finger's middle phalanx
    const fist = poseHand(man, gest("fist")), th = fist.bones.find(b => b.finger === "thumb" && b.seg === 2)!, mid = fist.bones.find(b => b.finger === "middle" && b.seg === 1)!;
    const mm: [number, number, number] = [(mid.a[0] + mid.b[0]) / 2, (mid.a[1] + mid.b[1]) / 2, (mid.a[2] + mid.b[2]) / 2];
    expect(Math.hypot(th.b[0] - mm[0], th.b[1] - mm[1], th.b[2] - mm[2])).toBeLessThan(28);
    // actions loop and are deterministic; the minimum-jerk easing starts and ends at rest
    for (const a of HAND_ANIMATIONS) { const p1 = animateHand(man, a, 0.37), p2 = animateHand(man, a, 0.37 + a.duration); expect(p1.bones.map(b => b.b)).toEqual(p2.bones.map(b => b.b)); }
    expect(minimumJerk(0)).toBe(0); expect(minimumJerk(1)).toBe(1); expect(minimumJerk(0.5)).toBeCloseTo(0.5, 6);
    const r = renderHand(poseHand(buildHand("child"), gest("relaxed")), { width: 48, height: 48, supersample: 1, quality: "draft" });
    let differ = 0; for (let i = 0; i < 48 * 48; i++) if (Math.abs(r.rgba[i * 4] - r.rgba[0]) > 12) differ++;
    expect(differ).toBeGreaterThan(80);
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
