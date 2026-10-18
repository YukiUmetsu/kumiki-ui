import { describe, expect, it } from "vitest";
import { Mesh, MeshStandardMaterial } from "three";
import { createJourneySurfaceTextures } from "../src/network-journey/journey-surfaces";
import { createJourneyWorld } from "../src/network-journey/journey-world";
import { createJourneyMotion } from "../src/network-journey/journey-motion";
import { DEFAULT_JOURNEY, JOURNEY_POINTS } from "../src/network-journey/journey-content";
import { evaluateTimeline, outputKey } from "../registry/motion/timeline";

describe("Network Journey fidelity and scenario regression", () => {
  it("produces deterministic, differentiated PBR microtexture families", () => {
    const one = createJourneySurfaceTextures();
    const two = createJourneySurfaceTextures();
    try {
      for (const family of ["brushed", "polymer", "ceramic", "floor"] as const) {
        expect(one[family].image.width).toBe(128);
        expect(one[family].image.height).toBe(128);
        expect(Array.from(one[family].image.data as Uint8Array)).toEqual(Array.from(two[family].image.data as Uint8Array));
      }
      expect(Array.from(one.brushed.image.data as Uint8Array)).not.toEqual(Array.from(one.polymer.image.data as Uint8Array));
      expect(Array.from(one.polymer.image.data as Uint8Array)).not.toEqual(Array.from(one.floor.image.data as Uint8Array));
    } finally {
      one.dispose();
      two.dispose();
    }
  });

  it("retains detailed device construction and real textured PBR materials", () => {
    const motion = createJourneyMotion(120);
    const world = createJourneyWorld(motion.timeline, DEFAULT_JOURNEY);
    try {
      const textured = new Set<string>();
      let meshCount = 0;
      world.world.traverse(object => {
        if (!(object instanceof Mesh)) return;
        meshCount++;
        if (object.material instanceof MeshStandardMaterial && object.material.roughnessMap) {
          textured.add(object.material.roughnessMap.name);
          expect(object.material.bumpMap).toBeTruthy();
        }
      });
      // Structural checks, not a claim of visual/cinematic quality.
      expect(meshCount).toBeGreaterThan(30);
      expect(textured.has("journey-brushed-roughness-bump")).toBe(true);
      expect(textured.has("journey-polymer-roughness-bump")).toBe(true);
      expect(textured.has("journey-ceramic-roughness-bump")).toBe(true);
      expect(world.anchors.has("sender")).toBe(true);
      expect(world.anchors.has("recipient")).toBe(true);
      expect(world.anchors.has("server")).toBe(true);
      expect(world.anchors.has("hero-packet")).toBe(true);
    } finally {
      world.dispose();
    }
  }, 30_000);

  it("keeps offline message at the service and hides recipient reveal", () => {
    const online = createJourneyMotion(120, true);
    const offline = createJourneyMotion(120, false);
    const frame = 2350;
    const on = evaluateTimeline(online.timeline, frame);
    const off = evaluateTimeline(offline.timeline, frame);
    const onlineX = Number((on.samples[outputKey("hero-packet", "offset")]?.value as { x: number }).x);
    const offlineX = Number((off.samples[outputKey("hero-packet", "offset")]?.value as { x: number }).x);
    expect(offlineX).toBeCloseTo(JOURNEY_POINTS.server[0], 3);
    expect(onlineX).toBeGreaterThan(offlineX + 2);
    const recipientOnline = evaluateTimeline(online.timeline, 2699);
    const recipientOffline = evaluateTimeline(offline.timeline, 2699);
    expect(Number(recipientOnline.samples[outputKey("recipient-message", "reveal")]?.value)).toBe(1);
    expect(Number(recipientOffline.samples[outputKey("recipient-message", "reveal")]?.value)).toBe(0);
  }, 30_000);
});
