import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CinematicCameraDirector } from "../registry/motion/cinematic-camera-react";
import { compileCinematicCamera } from "../registry/motion/cinematic-camera-director";
import { createCameraTargetRegistry } from "../registry/motion/camera-targets";

vi.mock("../registry/motion/camera-viewport-3d", () => ({ CameraViewport3D: () => <div>Verified camera viewport</div> }));
it("does not mount a viewport when the supplied composition contract fails", () => {
  const registry = createCameraTargetRegistry({ revision: "one", targets: [{ id: "subject", frames: [{ frame: 0, bounds: { min: [-1, -1, -1], max: [1, 1, 1] } }] }] });
  const result = compileCinematicCamera({ schemaVersion: 1, id: "preview", title: "Preview", fps: { num: 30, den: 1 }, durationFrames: 10,
    output: { width: 1280, height: 720 }, shots: [{ id: "shot", type: "establish", target: "subject", durationFrames: 10 }] }, registry);
  if (!result.ok) throw new Error("Expected baseline camera");
  render(<CinematicCameraDirector plan={result.plan} frame={0} createScene={vi.fn()} targetRegistry={registry}
    contract={{ criticalSubjects: [{ id: "required", targetIds: ["missing"], startFrame: 0, endFrame: 10 }] }} />);
  expect(screen.getByRole("alert")).toHaveTextContent(/missing/);
  expect(screen.queryByText("Verified camera viewport")).toBeNull();
});
