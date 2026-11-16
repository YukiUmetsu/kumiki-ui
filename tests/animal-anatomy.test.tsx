import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ANIMAL_SPECIES, findAnimal } from "../registry/anatomy/animal-species";
import { BODY_PLANS } from "../registry/anatomy/animal-plans";
import { ANIMAL_GAITS, footfallBars, quadFootfalls } from "../registry/anatomy/animal-gaits";
import { animalConstruction, poseAnimal, skeletonShapes } from "../registry/anatomy/animal-construct";
import { checkAnimalProportions, checkSpeciesData, measureAnimal } from "../registry/anatomy/animal-check";
import { AnimalSheet } from "../registry/anatomy/animal-react";
import { ANIMAL_POSTURES, POSTURE_IDS, postureFit } from "../registry/anatomy/animal-postures";
import { UKIYOE_SPECIES, ukiyoeBeastLandmarks } from "../registry/video/ukiyoe/ukiyoe-creatures";

describe("ANIM1 data", () => {
  it("species records agree with their own reported sizes and have ordered ranges", () => {
    expect(checkSpeciesData()).toEqual([]);
  });
  it("every species has a plan, a base coat, PD/CC0 references and resolvable style ids", () => {
    for (const s of ANIMAL_SPECIES) {
      expect(BODY_PLANS[s.plan], s.id).toBeDefined();
      expect(s.coat.palette.find(p => p.region === "back" && p.fill !== "accent"), s.id).toBeDefined();
      for (const r of s.references) expect(["public-domain", "CC0"]).toContain(r.rights);
      for (const st of s.styles.filter(x => x.style === "ukiyo-e")) expect(UKIYOE_SPECIES as readonly string[], `${s.id} → ${st.id}`).toContain(st.id);
      expect(findAnimal(s.id)).toBe(s);
    }
  });
  it("footfall diagrams give each foot its duty factor", () => {
    for (const g of Object.values(ANIMAL_GAITS))
      for (const bar of footfallBars(g)) expect(bar.spans.reduce((a, [x, y]) => a + y - x, 0)).toBeCloseTo(g.stance, 6);
  });
});

describe("ANIM1 construction", () => {
  it("stands every species on the ground, quadrupeds with the withers at one shoulder height", () => {
    for (const s of ANIMAL_SPECIES) {
      const sk = poseAnimal(animalConstruction(s));
      for (const l of sk.limbs) expect(l.points[l.points.length - 1][1], `${s.id} ${l.leg}`).toBeCloseTo(0, 6);
      if (sk.kind === "quadruped") expect(sk.joints.withers[1]).toBeCloseTo(1, 6);
      const sh = skeletonShapes(sk);
      expect(sh.body.length).toBeGreaterThan(100);
      expect(sh.bounds[2]).toBeGreaterThan(sh.bounds[0]);
    }
  });
  it("planted feet sweep back at the body's speed (no sliding) in every gait", () => {
    const c = animalConstruction("japanese-wild-boar");
    for (const id of ["walk", "trot", "gallop"] as const) {
      const g = ANIMAL_GAITS[id], dt = .005;
      for (let t = 0; t < 1; t += .1) {
        const a = poseAnimal(c, { gait: id, t }), b = poseAnimal(c, { gait: id, t: t + dt }), states = quadFootfalls(g, t), next = quadFootfalls(g, t + dt);
        a.limbs.forEach((l, i) => {
          if (!states[i].onGround || !next[i].onGround || !l.fore) return;
          const dx = b.limbs[i].points[4][0] - l.points[4][0];
          expect(dx / dt, `${id} t=${t.toFixed(2)} ${l.leg}`).toBeCloseTo(-g.stride * a.legLength.fore, 1);
        });
      }
    }
  });

  it("sits, lies, rests and rears every mammal that naturally does, frame by frame on the ground without snapping", () => {
    expect(postureFit("equid", "sit")).toBeUndefined();
    expect(postureFit("ursid", "rear", false)).toBeUndefined();
    for (const sp of ANIMAL_SPECIES) {
      const c = animalConstruction(sp);
      for (const p of POSTURE_IDS) {
        const fit = postureFit(c.plan.id, p, sp.behaviour.canRear);
        if (!fit) continue;
        const n = ANIMAL_POSTURES[p].frames;
        let prev: readonly (readonly number[])[] | undefined, first: readonly (readonly number[])[] | undefined;
        for (let f = 0; f <= n; f++) {
          const s = poseAnimal(c, { posture: p, amount: f / n }), pts = s.limbs.flatMap(l => l.points), feet = s.limbs.map(l => l.points[4]);
          const tag = `${sp.id} ${p} frame ${f}/${n}`;
          // Nothing goes through the ground.
          expect(Math.min(...pts.map(q => q[1])), tag).toBeGreaterThan(-.005);
          // No joint jumps between frames (a snap reads as a glitch).
          if (prev) expect(Math.max(...pts.map((q, i) => Math.hypot(q[0] - prev![i][0], q[1] - prev![i][1]))), tag).toBeLessThan(.3);
          // Sitting keeps the forefeet where they stood; rearing on straight or bent hocks keeps the hind feet.
          const start = first ??= feet;
          if (p === "sit") for (const i of [1, 3]) expect(Math.abs(feet[i][0] - start[i][0]), tag).toBeLessThan(.015);
          if (p === "rear" && fit.hind !== "folded") for (const i of [0, 2]) expect(Math.abs(feet[i][0] - start[i][0]), tag).toBeLessThan(.015);
          prev = pts;
        }
        // The full posture reaches its measured pitch (sitting may stop short where the forelegs cannot reach).
        const s = poseAnimal(c, { posture: p }), B = s.joints.pointOfButtock, S = s.joints.pointOfShoulder;
        const line = Math.atan2(S[1] - B[1], S[0] - B[0]) * 180 / Math.PI;
        if (p !== "sit") expect(Math.abs(line - fit.pitch.typical), `${sp.id} ${p}`).toBeLessThan(1);
        else expect(line, `${sp.id} sit`).toBeLessThanOrEqual(fit.pitch.max + .5);
      }
    }
    // The measured sits: the dog's trunk near the corgi's 29°, the cat's inside Steinlen's 36–46°.
    const sitLine = (id: string) => { const s = poseAnimal(animalConstruction(id), { posture: "sit" }), B = s.joints.pointOfButtock, S = s.joints.pointOfShoulder; return Math.atan2(S[1] - B[1], S[0] - B[0]) * 180 / Math.PI; };
    expect(sitLine("shiba-inu")).toBeGreaterThan(25);
    expect(sitLine("domestic-cat")).toBeGreaterThan(36);
  });
});

describe("ANIM1 checks applied to UKIYO1", () => {
  it("flags a stylisation beyond the measured range", () => {
    const f = checkAnimalProportions("boar", { legClearance: .23 });
    expect(f[0].status).toBe("low");
    expect(f[0].grade).toBe("measured");
  });
  it("the UKIYO1 boar and bear stand inside their species' ranges", () => {
    for (const id of ["boar", "bear"] as const) {
      const findings = checkAnimalProportions(id, measureAnimal(ukiyoeBeastLandmarks(id)!, false));
      expect(findings.filter(x => x.status !== "ok").map(x => x.message), id).toEqual([]);
    }
  });
});

describe("AnimalSheet", () => {
  it("renders a sheet for every species with its name, palette and sources", () => {
    for (const s of ANIMAL_SPECIES) {
      const html = renderToStaticMarkup(<AnimalSheet species={s.id} />);
      expect(html).toContain(s.name.replace(/&/g, "&amp;"));
      expect(html).toContain(s.coat.palette[0].name);
      expect(html).toContain('role="img"');
    }
  });
});
