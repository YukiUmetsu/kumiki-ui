import { describe, expect, it } from "vitest";
import {
  JOURNEY_CROSSFADE_FRAMES, JOURNEY_STAGE_SEGMENTS,
  journeyStageLayers, journeyTransformationId,
} from "../src/network-journey/journey-stage";
import { JOURNEY_FRAMES } from "../src/network-journey/journey-content";

describe("Network Journey frame-based stage editing", () => {
  it("covers the entire 90-second film with contiguous nonzero-duration segments", () => {
    expect(JOURNEY_STAGE_SEGMENTS[0].start).toBe(0);
    expect(JOURNEY_STAGE_SEGMENTS[JOURNEY_STAGE_SEGMENTS.length - 1].end).toBe(JOURNEY_FRAMES);
    for (let i = 0; i < JOURNEY_STAGE_SEGMENTS.length; i++) {
      const segment = JOURNEY_STAGE_SEGMENTS[i];
      expect(segment.end - segment.start).toBeGreaterThan(JOURNEY_CROSSFADE_FRAMES);
      if (i) expect(segment.start).toBe(JOURNEY_STAGE_SEGMENTS[i - 1].end);
    }
    for (let frame = 0; frame < JOURNEY_FRAMES; frame++) {
      const layers = journeyStageLayers(frame);
      expect(layers.length).toBeGreaterThanOrEqual(1);
      expect(layers.length).toBeLessThanOrEqual(2);
      expect(layers.reduce((total, layer) => total + layer.opacity, 0)).toBeCloseTo(1, 9);
      expect(layers.every(layer => layer.frame >= 0 && layer.frame < JOURNEY_FRAMES)).toBe(true);
    }
  });

  it("never changes sample or opacity based on playback history", () => {
    const sampleFrames = [0, 95, 189, 190, 194, 202, 209, 210, 222, 249, 250, 261,
      539, 540, 839, 840, 879, 880, 1170, 2539, 2540, 2579, 2580, 2699];
    const initial = sampleFrames.map(journeyStageLayers);
    for (const frame of sampleFrames.slice().reverse()) journeyStageLayers(frame);
    expect(sampleFrames.map(journeyStageLayers)).toEqual(initial);
  });

  it("shows real phone UI first and short VT1 representation handoffs", () => {
    expect(journeyStageLayers(95).map(layer => layer.kind)).toEqual(["phone"]);
    expect(journeyStageLayers(228).map(layer => layer.kind)).toEqual(["vt-phone"]);
    expect(journeyStageLayers(868).map(layer => layer.kind)).toEqual(["vt-packets"]);
    expect(journeyStageLayers(2560).map(layer => layer.kind)).toEqual(["vt-overview"]);
    expect(journeyStageLayers(1140).map(layer => layer.kind)).toEqual(["protocol"]);
    expect(journeyTransformationId("vt-packets")).toBe("message-to-packets");
    expect(journeyTransformationId("world")).toBeNull();
    for (const segment of JOURNEY_STAGE_SEGMENTS.filter(segment => segment.kind.startsWith("vt-"))) {
      expect(segment.end - segment.start).toBeLessThanOrEqual(45);
    }
  });

  it("keeps the last outgoing frame frozen while the incoming shot fades in", () => {
    const nearBoundary = journeyStageLayers(193);
    expect(nearBoundary).toHaveLength(2);
    expect(nearBoundary[0]).toMatchObject({ kind: "phone", frame: 189, outgoing: true });
    expect(nearBoundary[1]).toMatchObject({ kind: "world", frame: 193, outgoing: false });
    expect(nearBoundary[0].opacity).toBeGreaterThan(nearBoundary[1].opacity);
    expect(journeyStageLayers(190 + JOURNEY_CROSSFADE_FRAMES - 1)).toHaveLength(2);
    expect(journeyStageLayers(190 + JOURNEY_CROSSFADE_FRAMES)).toHaveLength(1);
  });
});
