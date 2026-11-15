import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ANIMAL_SPECIES, findAnimal } from "../registry/anatomy/animal-species";
import { BODY_PLANS } from "../registry/anatomy/animal-plans";
import { ANIMAL_GAITS, footfallBars, quadFootfalls } from "../registry/anatomy/animal-gaits";
import { animalConstruction, poseAnimal, skeletonShapes } from "../registry/anatomy/animal-construct";
import { checkAnimalProportions, checkSpeciesData, measureAnimal } from "../registry/anatomy/animal-check";
import { AnimalSheet } from "../registry/anatomy/animal-react";
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
