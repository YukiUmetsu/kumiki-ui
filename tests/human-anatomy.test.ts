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
