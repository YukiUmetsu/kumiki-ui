import { describe, expect, it } from "vitest";
import { AnimationClip, BoxGeometry, BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial, Object3D, Vector3, VectorKeyframeTrack } from "three";
import { forEachCrossed, measureGaitContacts } from "../registry/craft/gait-contacts";
import type { GaitContactTrack } from "../registry/craft/gait-contacts";
import { createAutoRig } from "../registry/craft/auto-rig";
import { HORSE_GALLOP_DEFAULTS, HORSE_HOOF_CONTACT, HORSE_LEGS, HORSE_SKELETON, horseFootfalls, poseHorseGallop } from "../registry/craft/horse-gallop";
import { halfLifeToLerp } from "../registry/motion/chase-camera-three";
import { SpringBoneChain } from "../registry/craft/verlet-cloth";
import { horseSize, HORSE_HEIGHT_RANGE } from "../registry/craft/horse-coat";
import { LateralHull } from "../registry/craft/mounted-rider";

describe("gait contacts", () => {
  it("visits markers across a loop wrap and over several loops", () => {
    const track = { clip: "c", duration: .4, duty: {}, markers: [{ limb: "a", kind: "land", time: .1, position: new Vector3() }, { limb: "a", kind: "lift", time: .3, position: new Vector3() }] } as GaitContactTrack;
    const seen: number[] = [];
    forEachCrossed(track, .35, .52, (_m, since) => seen.push(+(.52 - since).toFixed(3)));
    expect(seen).toEqual([.5]);
    seen.length = 0;
    forEachCrossed(track, 0, 1.2, (_m, since) => seen.push(+(1.2 - since).toFixed(3)));
    expect(seen).toEqual([.1, .3, .5, .7, .9, 1.1]);
  });

  it("measures land and lift from a clip with hysteresis", () => {
    const root = new Group(), hoof = new Object3D();
    hoof.name = "hoof"; root.add(hoof);
    // Down from 0.1 m to the ground between 0.2 and 0.6 s, up again after.
    const clip = new AnimationClip("step", 1, [new VectorKeyframeTrack("hoof.position", [0, .2, .6, 1], [0, .1, 0, 0, 0, 0, 0, 0, 0, 0, .1, 0])]);
    const track = measureGaitContacts(root, clip, { hoof: { bone: "hoof", points: [[0, 0, 0]] } });
    const land = track.markers.find(m => m.kind === "land")!, lift = track.markers.find(m => m.kind === "lift")!;
    expect(land.time).toBeGreaterThan(.18); expect(land.time).toBeLessThan(.2);
    // Lift once the hoof is 15 mm up: 0.6 s + 0.4 s × 0.015 / 0.1.
    expect(lift.time).toBeGreaterThan(.65); expect(lift.time).toBeLessThan(.67);
    expect(track.duty.hoof).toBeCloseTo(lift.time - land.time, 2);
  });
});

describe("horse gallop", () => {
  it("lands the legs in transverse-gallop order with a gathered suspension", () => {
    const f = Object.fromEntries(horseFootfalls().map(x => [x.leg, x]));
    expect(f["hind-far"].land).toBeLessThan(f["hind-near"].land);
    expect(f["hind-near"].land).toBeLessThan(f["fore-far"].land);
    expect(f["fore-far"].land).toBeLessThan(f["fore-near"].land);
    const lastLift = Math.max(...HORSE_LEGS.map(l => f[l].land + f[l].duty));
    expect(1 - lastLift).toBeGreaterThan(.25);
  });

  it("keeps planted hooves still on the ground while the ground slides under the clip", () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array([0, 1, 0, .1, 1, 0, 0, 1.1, 0]), 3));
    geometry.setIndex([0, 1, 2]);
    const rig = createAutoRig(geometry, new MeshBasicMaterial(), HORSE_SKELETON);
    const L = HORSE_GALLOP_DEFAULTS.strideLength, toe = new Vector3(...HORSE_HOOF_CONTACT.toe);
    for (const { leg, land, duty } of horseFootfalls()) {
      const hoof = rig.bones.get(`${leg}-hoof`)!, steps = 12;
      let first: Vector3 | null = null;
      for (let k = 0; k <= steps; k++) {
        // Up to 65% of the stance: break-over (heel lift about the toe) starts after that.
        const u = .65 * k / steps, t = (land + duty * u) % 1;
        poseHorseGallop(rig, t);
        rig.mesh.updateMatrixWorld(true);
        const p = toe.clone().applyMatrix4(hoof.matrixWorld);
        expect(Math.abs(p.y)).toBeLessThan(.003);
        // In place: the planted toe moves back with the ground, L per stride.
        if (!first) first = p; else expect(Math.abs(p.x - (first.x - L * duty * u))).toBeLessThan(.003);
      }
    }
  });
});

describe("chase camera", () => {
  it("chase half-lives are softer than a 0.1 per-frame lerp at 60 fps", () => {
    for (const h of [.12, .16, .2, .22]) expect(halfLifeToLerp(h)).toBeLessThan(.1);
  });
});

describe("secondary motion and fit", () => {
  // A five-bone chain hanging from a carrier, as the tail hair hangs from the dock.
  const chain = () => {
    const space = new Group(), bones: Object3D[] = [];
    let parent: Object3D = space;
    for (let i = 0; i < 5; i++) { const b = new Object3D(); b.position.set(0, i ? -.2 : 0, 0); parent.add(b); bones.push(b); parent = b; }
    space.updateMatrixWorld(true);
    return { space, bones, tip: () => new Vector3(0, -.2, 0).applyMatrix4(bones[4].matrixWorld) };
  };
  const run = (c: ReturnType<typeof chain>, air: Vector3, sim: SpringBoneChain) => {
    for (let i = 0; i < 240; i++) { for (const b of c.bones) b.quaternion.identity(); sim.update(1 / 60, air, new Vector3(0, -9.81, 0)); }
    c.space.updateMatrixWorld(true);
  };

  it("lets a spring chain hang in still air and stream back in an airflow, without folding past its bend limit", () => {
    const still = chain();
    run(still, new Vector3(), new SpringBoneChain(still.space, still.bones, { stiffness: 0, turbulence: 0 }));
    expect(still.tip().y).toBeLessThan(-.95);
    const wind = chain(), sim = new SpringBoneChain(wind.space, wind.bones, { stiffness: 0, turbulence: 0, maxBend: .5 });
    run(wind, new Vector3(-12, 0, 0), sim);
    const tip = wind.tip();
    // Drag against gravity: tan θ = g / (air × v) ≈ 20° below the horizontal for 2.2/s at 12 m/s, reached within the limit.
    expect(tip.x).toBeLessThan(-.4);
    expect(tip.y).toBeLessThan(0);
    for (let i = 1; i < 5; i++) expect(2 * Math.acos(Math.min(1, Math.abs(wind.bones[i].quaternion.w)))).toBeLessThanOrEqual(.5 + 1e-3);
  });

  it("sizes horses within the riding range, leggier rather than wider as they grow", () => {
    expect(horseSize("medium").scale).toBeCloseTo(1, 5);
    expect(horseSize(9).height).toBe(HORSE_HEIGHT_RANGE[1]);
    const large = horseSize("large"), small = horseSize("small");
    expect(large.widthScale).toBeLessThan(large.scale);
    expect(small.widthScale).toBeGreaterThan(small.scale);
    expect(small.headScale).toBeGreaterThan(1);
  });

  it("gives a rig bone the vertices round its extra influence segments", () => {
    const geometry = new BufferGeometry();
    // One vertex beside bone b's influence segment, far from both bones' own axes.
    geometry.setAttribute("position", new BufferAttribute(new Float32Array([.5, .5, 0, 0, 0, 0, 1, 0, 0]), 3));
    geometry.setIndex([0, 1, 2]);
    const rig = createAutoRig(geometry, new MeshBasicMaterial(), [
      { name: "a", head: [0, 0, 0], tail: [0, 1, 0], radius: .3 },
      { name: "b", parent: "a", head: [1, 0, 0], tail: [1, 1, 0], radius: .3, influences: [{ head: [.6, .4, 0], tail: [.6, .6, 0], radius: .2 }] },
    ], { smoothing: 0 });
    const index = rig.mesh.geometry.getAttribute("skinIndex"), weight = rig.mesh.geometry.getAttribute("skinWeight");
    expect(index.getX(0)).toBe(1);
    expect(weight.getX(0)).toBeGreaterThan(.9);
  });

  it("measures a mount's lateral extent per side, with pressable parts inset by their give", () => {
    // Subdivided like real meshes: the hull samples vertices.
    const frame = new Group(), barrel = new Mesh(new BoxGeometry(1, 1, .6, 40, 40, 1)), fender = new Mesh(new BoxGeometry(.2, .3, .8, 8, 12, 1));
    frame.add(barrel, fender);
    const hull = LateralHull.fromMeshes(frame, [barrel, { mesh: fender, give: .05 }], [-.5, -.5], [.5, .5], .05);
    expect(hull.extent(.3, 0, -1)).toBeCloseTo(.3, 5);
    expect(hull.extent(0, 0, 1)).toBeCloseTo(.35, 5);
    expect(hull.depth(new Vector3(0, 0, .4), .1)).toBeCloseTo(.05, 5);
    expect(hull.extent(0, .9, 1)).toBe(-Infinity);
  });
});
