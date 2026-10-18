import { expect, it } from "vitest";
import { createJourneyProduction } from "../src/network-journey/journey-production";
import { DEFAULT_JOURNEY } from "../src/network-journey/journey-content";
import { evaluateCameraPose3D } from "../registry/motion/camera-pose-3d";
import { evaluateMotionDirector } from "../registry/motion/motion-director";

it("compiles the 90-second benchmark in both aspects with real MG1/VT1 fragments", () => {
  for (const aspect of ["landscape", "portrait"] as const) {
    const film = createJourneyProduction(aspect, DEFAULT_JOURNEY);
    expect(film.director.timeline.durationFrames).toBe(2700);
    expect(film.director.transformations).toHaveLength(3);
    expect(film.camera.shots).toHaveLength(10);
    const frame = evaluateMotionDirector(film.director, 1470);
    expect(evaluateCameraPose3D(film.camera.timeline, 1470, "camera3d", frame.evaluation)).toEqual(evaluateCameraPose3D(film.camera.timeline, 1470));
    console.info("Network Journey", aspect, Math.round(film.compilationMs), film.camera.stats, film.director.timeline.nodes.length, film.diagnostics.length);
  }
}, 30_000);
