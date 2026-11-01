import { describe, expect, it } from "vitest";
import { Box3, Mesh, MeshPhysicalMaterial } from "three";
import { createTravelStudyObject } from "../registry/craft/travel-study-3d";
import type { TravelStudyObjectKind } from "../registry/craft/travel-study-3d";
import { createStageSet } from "../registry/craft/hero-stage-set";
import { createEverydayDeskScene, evaluateEverydayCamera } from "../registry/video/everyday-scenes-3d";
import type { EverydaySceneSpec } from "../registry/video/everyday-scenes-3d";

const expectedParts: Record<TravelStudyObjectKind, string> = {
  chair: "chair-upholstered-back",
  "world-map": "map-cartographic-print",
  globe: "globe-spinning-sphere",
  photograph: "photograph-art-print",
  "book-stack": "books-top-volume",
  clock: "clock-hour-hand",
  "desk-lamp": "lamp-articulated-upper-arm",
};

describe("travel study crafted objects", () => {
  it.each(Object.entries(expectedParts) as [TravelStudyObjectKind, string][])(
    "%s has a recognizable, named construction with multiple PBR materials", (kind, part) => {
      const asset = createTravelStudyObject(kind, { id: `spec-${kind}` });
      try {
        expect(asset.id).toBe(`spec-${kind}`);
        expect(asset.parts.has(part)).toBe(true);
        expect(asset.parts.size).toBeGreaterThanOrEqual(8);
        expect(asset.craft.materials.length).toBeGreaterThanOrEqual(3);
        expect(asset.craft.details.length).toBeGreaterThanOrEqual(4);
        expect(asset.metersPerUnit).toBe(.01);
        expect(asset.bounds.max[1]).toBeGreaterThan(asset.bounds.min[1]);
        const bounds = new Box3().setFromObject(asset.group);
        expect(bounds.isEmpty()).toBe(false);
        // Wall hangings are authored about their center; furniture rests on Y=0.
        if (kind !== "world-map" && kind !== "photograph")
          expect(bounds.min.y).toBeGreaterThanOrEqual(-.5);
      } finally { asset.dispose(); }
    },
  );

  it("spins the textured globe and restores an identical orientation on backward seek", () => {
    const globe = createTravelStudyObject("globe");
    try {
      const sphere = globe.parts.get("globe-spinning-sphere")!;
      globe.pose?.({ id: "spin", frame: 75, fps: 30 });
      const angle = sphere.rotation.y;
      expect(Math.abs(angle)).toBeGreaterThan(2);
      globe.pose?.({ id: "spin", frame: 8, fps: 30 });
      expect(Math.abs(sphere.rotation.y)).toBeLessThan(.5);
      globe.pose?.({ id: "spin", frame: 75, fps: 30 });
      expect(sphere.rotation.y).toBeCloseTo(angle, 8);
    } finally { globe.dispose(); }
  });

  it("articulates the lamp at real pivots without changing its solid base", () => {
    const lamp = createTravelStudyObject("desk-lamp");
    try {
      const arm = lamp.parts.get("lamp-articulated-upper-arm")!;
      const base = lamp.parts.get("lamp-weighted-base")!;
      const baseY = base.position.y;
      lamp.pose?.({ id: "adjust", frame: 66, fps: 30 });
      const angle = arm.rotation.z;
      expect(Math.abs(angle)).toBeGreaterThan(.08);
      expect(base.position.y).toBe(baseY);
      lamp.pose?.({ id: "adjust", frame: 1, fps: 30 });
      lamp.pose?.({ id: "adjust", frame: 66, fps: 30 });
      expect(arm.rotation.z).toBeCloseTo(angle, 8);
      const shade = lamp.parts.get("lamp-spun-brass-shade") as Mesh;
      expect((shade.material as MeshPhysicalMaterial).metalness).toBeGreaterThan(.7);
    } finally { lamp.dispose(); }
  });

  it("moves both analog clock hands by absolute frame and returns to the starting pose", () => {
    const clock = createTravelStudyObject("clock");
    try {
      const hour = clock.parts.get("clock-hour-hand")!;
      const minute = clock.parts.get("clock-minute-hand")!;
      clock.pose?.({ id: "tick", frame: 90, fps: 30 });
      const last = [hour.rotation.z, minute.rotation.z];
      expect(last[1]).not.toBe(last[0]);
      clock.pose?.({ id: "tick", frame: 0, fps: 30 });
      const start = [hour.rotation.z, minute.rotation.z];
      expect(start).not.toEqual(last);
      clock.pose?.({ id: "tick", frame: 90, fps: 30 });
      expect([hour.rotation.z, minute.rotation.z]).toEqual(last);
    } finally { clock.dispose(); }
  });

  it("validates visual options before any asset construction", () => {
    expect(() => createTravelStudyObject("photograph", { photoVariant: "nope" as never }))
      .toThrow(/photoVariant/);
    expect(() => createTravelStudyObject("globe", { globeRadius: -4 })).toThrow(/globeRadius/);
  });
});

const travelScene: EverydaySceneSpec = {
  schemaVersion: 1, id: "travel-study", recipeId: "travel-study",
  fps: { num: 30, den: 1 }, durationFrames: 150, width: 960, height: 540,
  lightingPreset: "warm-documentary",
  content: { title: "Where will we go next?", caption: "Every destination begins with a question." },
};

describe("travel study composition", () => {
  it("offers a separate heritage desk variant without forcing consumers to install the room", () => {
    const set = createStageSet("desk", { deskStyle: "heritage" });
    try {
      expect(set.group.getObjectByName("desk-heritage-drawer-front--10.4")).toBeDefined();
      expect(set.group.getObjectByName("desk-heritage-cast-brass-pull-10.4")).toBeDefined();
      expect(set.group.getObjectByName("travel-study-plaster-wall")).toBeUndefined();
    } finally { set.dispose(); }
  });
  it("assembles the wall atlas, furniture and movable props around the existing laptop", () => {
    const scene = createEverydayDeskScene(travelScene);
    try {
      expect(scene.set?.kind).toBe("travel-study");
      for (const name of ["laptop", "chair", "world-map", "globe", "small-globe", "desk-lamp", "book-stack", "clock", "photograph-1", "photograph-2"])
        expect(scene.items.has(name)).toBe(true);
      expect(scene.parts.has("world-map/map-cartographic-print")).toBe(true);
      expect(scene.parts.has("desk-lamp/lamp-articulated-upper-arm")).toBe(true);
      const globe = scene.parts.get("globe/globe-spinning-sphere")!;
      scene.pose?.({ id: "play", frame: 90, fps: 30 });
      const yaw = globe.rotation.y;
      scene.pose?.({ id: "play", frame: 9, fps: 120 });
      scene.pose?.({ id: "play", frame: 90, fps: 24 });
      expect(globe.rotation.y).toBeCloseTo(yaw, 8);
    } finally { scene.dispose(); }
  });

  it("authors distinct 16:9 and 9:16 camera paths including the wall map", () => {
    const wide = evaluateEverydayCamera(travelScene, 75);
    const tall = evaluateEverydayCamera({ ...travelScene, width: 540, height: 960 }, 75);
    expect(wide.position).not.toEqual(tall.position);
    expect(wide.target[1]).toBeGreaterThan(1);
    expect(tall.target[1]).toBeGreaterThan(1);
  });
});
