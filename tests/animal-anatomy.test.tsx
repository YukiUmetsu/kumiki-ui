import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ANIMAL_SPECIES, findAnimal } from "../registry/anatomy/animal-species";
import { BODY_PLANS } from "../registry/anatomy/animal-plans";
import { ANIMAL_GAITS, footfallBars, quadFootfalls } from "../registry/anatomy/animal-gaits";
import { animalConstruction, poseAnimal, skeletonShapes } from "../registry/anatomy/animal-construct";
import { checkAnimalProportions, checkSpeciesData, measureAnimal } from "../registry/anatomy/animal-check";
import { AnimalSheet } from "../registry/anatomy/animal-react";
import { ANIMAL_POSTURES, BIRD_POSTURE_IDS, BIRD_POSTURES, birdPostureFits, POSTURE_IDS, postureFit } from "../registry/anatomy/animal-postures";
import { BIRD_FLIGHT, flightAt, speciesWingbeat, wingbeatHz, wingStroke } from "../registry/anatomy/animal-flight";
import { coatAt, growthRule, heightAt, juvenileConstruction } from "../registry/anatomy/animal-growth";
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

describe("ANIM1 flight", () => {
  it("flies every bird on open wings: a beat that loops, folds on the upstroke and joins its glides and pauses", () => {
    // Pennycuick (1990): a grey heron (1.5 kg, 1.75 m span, aspect 8) beats about 2.6 times a second.
    expect(wingbeatHz(1.5, 1.75, 8)).toBeCloseTo(2.6, 1);
    for (const id of Object.keys(BIRD_FLIGHT)) {
      const sp = findAnimal(id)!, f = BIRD_FLIGHT[id], c = animalConstruction(sp), hz = speciesWingbeat(id)!;
      expect(hz, id).toBeGreaterThan(1.5);
      expect(hz, id).toBeLessThan(20);
      // Spread on the downstroke, folded on the upstroke.
      expect(wingStroke(f, f.downShare / 2).fold, id).toBe(0);
      expect(wingStroke(f, f.downShare + (1 - f.downShare) / 2).fold, id).toBeGreaterThan(f.fold * .8);
      const span = (t: number) => { const w = poseAnimal(c, { flight: "flap", t }).wings!.near.outline; return Math.max(...w.map(p => p[1])) - Math.min(...w.map(p => p[1])); };
      expect(span(0), `${id} raised wing is tall`).toBeGreaterThan(span(f.downShare + (1 - f.downShare) / 2) * .6);
      // The beat loops, and flapping joins its glides, pauses and closed wings without a jump.
      const near = (o: Parameters<typeof poseAnimal>[1]) => poseAnimal(c, o).wings!.near.outline;
      const gap = (a: readonly (readonly number[])[], b: readonly (readonly number[])[]) => Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1])));
      expect(gap(near({ flight: "flap", t: .9999 }), near({ flight: "flap", t: 0 })), id).toBeLessThan(.002);
      expect(gap(near({ flight: "glide", amount: 0 }), near({ flight: "flap", t: 0 })), id).toBeLessThan(1e-6);
      expect(gap(near({ flight: "closed", amount: 0 }), near({ flight: "flap", t: 0 })), id).toBeLessThan(1e-6);
      // At the drawn rate (at most 7.5 beats a second at 30 fps), moving into or out of a held wing is no bigger a
      // step than an ordinary flapping frame.
      let prev: readonly (readonly number[])[] | undefined, last = "", flapStep = 0, holdStep = 0;
      for (let k = 0; k < 150; k++) {
        const at = flightAt(id, k / 30, 2, 7.5), w = near({ flight: at.flight, t: at.t, amount: at.amount });
        expect(w.every(p => Number.isFinite(p[0]) && Number.isFinite(p[1])), id).toBe(true);
        if (prev) { const step = gap(w, prev); if (at.flight === "flap" && last === "flap") flapStep = Math.max(flapStep, step); else holdStep = Math.max(holdStep, step); }
        prev = w; last = at.flight;
      }
      if (f.style !== "flapping") expect(holdStep, `${id} holding`).toBeLessThanOrEqual(flapStep * 1.05);
    }
    // Herons fly with the neck drawn back, cranes with it stretched out; both trail their legs.
    const crown = (id: string) => { const s = poseAnimal(animalConstruction(id), { flight: "glide" }); return s.joints.crown[0] - s.joints.neckRoot[0]; };
    expect(crown("red-crowned-crane")).toBeGreaterThan(.2);
    expect(crown("grey-heron")).toBeLessThan(crown("red-crowned-crane") * .2);
    const crane = poseAnimal(animalConstruction("red-crowned-crane"), { flight: "glide" });
    expect(crane.limbs[1].points[4][0]).toBeLessThan(crane.joints.tailRoot[0]);
  });

  it("rests birds on one leg and asleep, floats ducks at the measured waterline, all without snapping", () => {
    const birds = ANIMAL_SPECIES.filter(sp => BODY_PLANS[sp.plan].group === "bird");
    for (const sp of birds) {
      const c = animalConstruction(sp);
      for (const p of BIRD_POSTURE_IDS) {
        if (!birdPostureFits(c.plan.id, p)) continue;
        const n = BIRD_POSTURES[p].frames;
        let prev: readonly (readonly number[])[] | undefined;
        for (let f = 0; f <= n; f++) {
          const s = poseAnimal(c, { birdPosture: p, amount: f / n }), pts = [...s.limbs.flatMap(l => l.points), s.joints.crown, s.head.nose, ...s.tail.points];
          const tag = `${sp.id} ${p} ${f}/${n}`;
          if (!s.joints.waterline) expect(Math.min(...s.limbs.flatMap(l => l.points).map(q => q[1])), tag).toBeGreaterThan(-.005);
          if (prev) expect(Math.max(...pts.map((q, i) => Math.hypot(q[0] - prev![i][0], q[1] - prev![i][1]))), tag).toBeLessThan(.12);
          prev = pts;
        }
        const s = poseAnimal(c, { birdPosture: p });
        if (BIRD_POSTURES[p].oneLeg) expect(s.limbs.filter(l => l.onGround).length, `${sp.id} ${p}`).toBe(1);
        if (p === "roost") expect(s.head.eyeClosed, sp.id).toBe(true);
      }
    }
    // A swimming duck sits a third of its depth in the water, its back level.
    const duck = poseAnimal(animalConstruction("mandarin-duck"), { birdPosture: "swim", water: .1 }), b = duck.masses.body;
    expect((duck.joints.waterline[1] - (b.cy - b.ry)) / (2 * b.ry)).toBeCloseTo(BIRD_POSTURES.swim.waterline!.typical, 1);
    expect(Math.abs(b.angle)).toBeLessThan(4);
    // Upending puts the head under the surface.
    const up = poseAnimal(animalConstruction("mandarin-duck"), { birdPosture: "upend", water: .1 });
    expect(up.head.nose[1]).toBeLessThan(.1);
    // Only ducks swim.
    expect(birdPostureFits("bird-wader", "swim")).toBe(false);
  });
});

describe("ANIM1 growth", () => {
  it("grows every animal from its young to its adult construction, a foal long-legged and a puppy big-pawed", () => {
    for (const sp of ANIMAL_SPECIES) {
      const c = animalConstruction(sp), rule = growthRule(c.plan.id, c.plan.group);
      if (!rule) continue;
      expect(juvenileConstruction(c, 1), sp.id).toBe(c);
      expect(heightAt(rule, 0)).toBeCloseTo(rule.height.typical);
      for (const age of [0, .25, .5, .75]) {
        const s = poseAnimal(juvenileConstruction(c, age)), pts = [...s.limbs.flatMap(l => l.points), s.head.nose, s.head.eye];
        expect(pts.every(p => Number.isFinite(p[0]) && Number.isFinite(p[1])), `${sp.id} ${age}`).toBe(true);
        expect(Math.min(...s.limbs.flatMap(l => l.points).map(p => p[1])), `${sp.id} ${age}`).toBeGreaterThan(-.01);
      }
    }
    // The foal (61% of adult height, cannons 83% grown): taller on its legs for its size and shorter in the body.
    const horse = animalConstruction("kiso-horse"), foal = juvenileConstruction(horse, 0);
    expect(foal.legClearance).toBeGreaterThan(horse.legClearance + .08);
    expect(foal.trunk).toBeLessThan(horse.trunk);
    expect(foal.fore[2]).toBeGreaterThan(horse.fore[2]);
    // The puppy's feet are a larger share of its legs (the Beagles' manus and pes), its eye larger for its head.
    const dog = animalConstruction("shiba-inu"), pup = juvenileConstruction(dog, 0);
    expect(pup.fore[3]).toBeGreaterThan(dog.fore[3]);
    expect(pup.species!.face!.eye).toBeGreaterThan(dog.species!.face!.eye);
    expect(pup.muzzle).toBeLessThan(dog.muzzle);
    // Young coats: a fox kit is dark brown with blue eyes; the adult is not.
    const fox = findAnimal("red-fox")!;
    expect(coatAt(fox, 0).find(x => x.region === "back")!.hex).toBe("#4a3a30");
    expect(coatAt(fox, 0).find(x => x.region === "eyes")).toBeTruthy();
    expect(coatAt(fox, 1)).toBe(fox.coat.palette);
  });
});

