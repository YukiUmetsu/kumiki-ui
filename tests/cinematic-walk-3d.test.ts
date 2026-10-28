import { describe, expect, it } from "vitest";
import { Box3, Group, Mesh, SphereGeometry, Vector3 } from "three";
import {
  WALK_FRAMES, WALK_RADIUS, createMiniatureWorld, placeOnWorld,
  walkingWorldPoseAtFrame,
} from "../registry/video/cinematic-walk-3d-scene";

describe("Walking on Earth — frame-addressable actual 3D scene", () => {
  it("spins the planet while leaving the pedestrian's world position stationary", () => {
    const start = walkingWorldPoseAtFrame(0);
    const mid = walkingWorldPoseAtFrame(180);
    const end = walkingWorldPoseAtFrame(359);
    expect(start.planetRotation).toBe(0);
    expect(mid.planetRotation).toBeLessThan(-1);
    expect(end.planetRotation).toBeLessThan(mid.planetRotation);
    expect(end.planetRotation).toBeGreaterThan(-Math.PI * 2);
    expect(start.walkerPosition).toEqual(mid.walkerPosition);
    expect(mid.walkerPosition).toEqual(end.walkerPosition);
    expect(start.gaitTime).toBe(0);
    expect(mid.gaitTime).toBeGreaterThan(0);
    expect(walkingWorldPoseAtFrame(WALK_FRAMES)).toEqual(end);
    expect(walkingWorldPoseAtFrame(180)).toEqual(mid);
  });

  it("has geometric globe volume, not an image plane, and attaches props to the world", () => {
    const world = createMiniatureWorld();
    const planet = world.getObjectByName("planet-sphere") as Mesh;
    expect(planet.geometry).toBeInstanceOf(SphereGeometry);
    const bounds = new Box3().setFromObject(planet);
    for (const dimension of bounds.getSize(new Vector3()).toArray()) {
      expect(dimension).toBeGreaterThan(WALK_RADIUS * 1.95);
      expect(dimension).toBeLessThan(WALK_RADIUS * 2.05);
    }
    const prop = new Group();
    const anchor = placeOnWorld(world, prop, Math.PI / 2, WALK_RADIUS);
    expect(anchor.parent).toBe(world);
    expect(prop.parent).toBe(anchor);
    expect(anchor.position.y).toBeCloseTo(WALK_RADIUS);
    expect(anchor.getWorldDirection(new Vector3()).length()).toBeCloseTo(1);
    world.rotation.z = walkingWorldPoseAtFrame(180).planetRotation;
    expect(anchor.getWorldPosition(new Vector3()).x).not.toBeCloseTo(0);
  });
});
