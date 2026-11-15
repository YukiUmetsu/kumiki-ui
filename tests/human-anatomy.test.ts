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
