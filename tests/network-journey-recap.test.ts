import { describe, expect, it } from "vitest";
import { journeyCameraSpec } from "../src/network-journey/journey-production";
import { JOURNEY_FRAMES, JOURNEY_POINTS } from "../src/network-journey/journey-content";
import { JOURNEY_RECAP_START, JOURNEY_RECAP_STEPS, journeyRecapProgress } from "../src/network-journey/journey-final-summary";
import { journeyStageLayers } from "../src/network-journey/journey-stage";

describe("Educational ending and B→C camera synchronization", () => {
  it("teaches specific concepts rather than generic chapter verbs", () => {
    expect(JOURNEY_RECAP_STEPS.map(item => item.term)).toEqual([
      "DNS", "TLS", "IP ROUTING", "DELIVERY",
    ]);
    const all = JOURNEY_RECAP_STEPS.map(item => item.fact).join(" ");
    for (const phrase of ["service", "end-to-end", "destination address", "read"]) {
      expect(all.toLowerCase()).toContain(phrase);
    }
  });

  it("reveals one factual insight at a time, then holds all four visibly", () => {
    expect(JOURNEY_RECAP_START).toBe(2505);
    expect(journeyStageLayers(2485).map(layer => layer.kind)).toEqual(["recipient"]);
    expect(journeyStageLayers(2530).map(layer => layer.kind)).toEqual(["recap"]);
    const start = journeyRecapProgress(JOURNEY_RECAP_START);
    expect(start.reveal).toEqual([0, 0, 0, 0]);
    const middle = journeyRecapProgress(2590);
    expect(middle.reveal[0]).toBe(1);
    expect(middle.reveal[3]).toBe(0);
    expect(journeyRecapProgress(JOURNEY_FRAMES - 1).reveal).toEqual([1, 1, 1, 1]);
    const samples = [2505, 2520, 2580, 2620, 2660, 2699];
    const first = samples.map(journeyRecapProgress);
    for (const f of samples.slice().reverse()) journeyRecapProgress(f);
    expect(samples.map(journeyRecapProgress)).toEqual(first);
  });

  it("begins tracking the B-to-C signal before the signal reaches router B", () => {
    const spec = journeyCameraSpec("landscape");
    const sum = spec.shots.reduce((total, shot) => total + shot.durationFrames, 0);
    expect(sum).toBe(JOURNEY_FRAMES);
    const index = spec.shots.findIndex(shot => shot.id === "approach-service");
    expect(index).toBeGreaterThan(0);
    const start = spec.shots.slice(0, index).reduce((total, shot) => total + shot.durationFrames, 0);
    const end = start + spec.shots[index].durationFrames;
    // Hero-packet route: source MG1 starts at frame 840; router B 840+550;
    // router C 840+690 (separate from frame-based camera shot definitions).
    const bArrival = 840 + 550, cArrival = 840 + 690;
    expect(JOURNEY_POINTS["router-b"]).not.toEqual(JOURNEY_POINTS["router-c"]);
    expect(start).toBeLessThan(bArrival);
    expect(end).toBeGreaterThan(cArrival);
    expect(spec.shots[index].target).toBe("hero-packet");
    expect(spec.shots[index].type).toBe("follow");
    const transition = spec.shots[index].transition;
    expect(transition?.kind).toBe("continuous");
    if (transition?.kind === "continuous") {
      expect(transition.durationFrames).toBeLessThanOrEqual(12);
    }
  });
});
