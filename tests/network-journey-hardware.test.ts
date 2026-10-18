import { describe, expect, it } from "vitest";
import { createJourneyCabling } from "../src/network-journey/journey-cables";
import { createJourneyMotion } from "../src/network-journey/journey-motion";
import { JOURNEY_POINTS, JOURNEY_ROUTE } from "../src/network-journey/journey-content";
import { evaluateTimeline, outputKey } from "../registry/motion/timeline";
import { JOURNEY_STAGE_SEGMENTS, journeyStageLayers } from "../src/network-journey/journey-stage";

describe("Network Journey physical routing and narrative", () => {
  it("creates jack-to-jack cabling only for wired equipment, not smartphones", () => {
    const cables = createJourneyCabling();
    try {
      expect(cables.connections).toHaveLength(JOURNEY_ROUTE.length - 3);
      expect(cables.connections.every(edge => !["sender", "recipient"].includes(edge.from) && !["sender", "recipient"].includes(edge.to))).toBe(true);
      const serverEnds = cables.connections
        .flatMap(edge => [[edge.from, edge.start], [edge.to, edge.end]] as const)
        .filter(([id]) => id === "server");
      expect(serverEnds).toHaveLength(2);
      // Rack NIC sockets are on the back (-Z), not the center/front of a box.
      for (const [, point] of serverEnds) expect(point[2]).toBeLessThan(JOURNEY_POINTS.server[2] - 1.3);
      for (const edge of cables.connections) {
        for (const endpoint of [edge.start, edge.end]) {
          expect(endpoint).toHaveLength(3);
          expect(endpoint.every(Number.isFinite)).toBe(true);
        }
      }
    } finally { cables.dispose(); }
  });

  it("emits the tracked signal from the lower-right of the sender's screen", () => {
    const motion = createJourneyMotion(120, true);
    const start = evaluateTimeline(motion.timeline, 840);
    const xy = start.samples[outputKey("hero-packet", "offset")]?.value as { x: number; y: number };
    const depth = Number(start.samples[outputKey("hero-packet", "depth")]?.value);
    expect(xy.x).toBeCloseTo(JOURNEY_POINTS.sender[0] + .82, 2);
    expect(xy.y).toBeCloseTo(JOURNEY_POINTS.sender[1] - 1.95, 2);
    expect(depth).toBeCloseTo(JOURNEY_POINTS.sender[2] + .35, 2);
    expect(journeyStageLayers(895).map(layer => layer.kind)).toEqual(["world"]);
  });

  it("never shows the old generic 2D DNS/overview boxes or a final wide network shot", () => {
    expect(JOURNEY_STAGE_SEGMENTS.some(segment => segment.kind === "vt-phone" || segment.kind === "vt-overview")).toBe(false);
    expect(journeyStageLayers(2630).map(layer => layer.kind)).toEqual(["recap"]);
    expect(JOURNEY_STAGE_SEGMENTS.find(segment => segment.id === "signal-departs-phone")?.start).toBe(870);
  });
});
