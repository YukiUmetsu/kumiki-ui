/** Optional adapter demonstration; Three.js never enters the director compiler. */
import { useState } from "react";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import { createCameraRig3D } from "../../registry/motion/camera-rig-3d";
import { motionTimelineGroup, AnimationGroup } from "../../registry/motion/director-authoring";
import { compileMotionDirector } from "../../registry/motion/motion-director";
import { MotionDirector } from "../../registry/motion/motion-director-react";
import { createSculptureScene } from "./camera-3d-demo";
import { MotionScrubber } from "./react";

const result = compileMotionDirector({ schemaVersion: 1, id: "optional-spatial-direction", title: "A shared camera and subject clock",
  fps: { num: 30, den: 1 }, durationFrames: 300, targets: ["camera3d", "assembly"], children: [
    motionTimelineGroup(createCameraRig3D({ id: "orbit", fps: { num: 30, den: 1 }, durationFrames: 300,
      keyframes: [
        { frame: 0, target: [0, 1, 0], distance: 12, azimuth: 35, elevation: 20 },
        { frame: 140, target: [0, 1.4, 0], distance: 8, azimuth: 120, elevation: 30 },
        { frame: 220, target: [0, 1.4, 0], distance: 8, azimuth: 120, elevation: 30 },
        { frame: 299, target: [0, 1, 0], distance: 12, azimuth: 190, elevation: 20 },
      ] }), { id: "spatial-camera" }),
    AnimationGroup({ id: "subject", mode: "parallel", children: [
      { kind: "animation", id: "turn", track: { id: "turn", targetId: "assembly", property: "rotation", valueType: "angle", angleMode: "full-turn", keyframes: [{ frame: 0, value: 0 }, { frame: 140, value: Math.PI / 2 }, { frame: 220, value: Math.PI / 2 }, { frame: 299, value: Math.PI }] } },
      { kind: "animation", id: "lift", track: { id: "lift", targetId: "assembly", property: "height", valueType: "number", keyframes: [{ frame: 0, value: 0 }, { frame: 140, value: 0.4 }, { frame: 220, value: 0.4 }, { frame: 299, value: 0 }] } },
    ] }),
  ] });
if (!result.ok) throw new Error(result.diagnostics.map(d => d.message).join("\n"));
const director = result.director;
function createDirectedSculpture() {
  const content = createSculptureScene();
  const assembly = content.scene.getObjectByName("assembly")!;
  return { ...content, updateFrame(_frame: number, evaluation?: import("../../registry/motion/types").EvaluationResult) {
    assembly.rotation.y = Number(evaluation?.samples["assembly.rotation"]?.value ?? 0);
    assembly.position.y = Number(evaluation?.samples["assembly.height"]?.value ?? 0);
  } };
}
export function Director3DDemo() {
  const [frame, setFrame] = useState(90);
  return <div className="mx-auto max-w-6xl space-y-6 p-6 text-foreground">
    <h1 className="text-heading-lg font-medium">Camera and subject, together</h1>
    <p className="max-w-prose text-body text-muted-foreground">The existing Three.js viewport consumes the same MG1 sample as the subject adapter. Orbit, lift and turn share a deliberate hold.</p>
    <MotionDirector director={director} frame={frame}>{({ evaluation }) => <CameraViewport3D timeline={director.timeline} frame={evaluation.frame} evaluation={evaluation}
      reducedMotion={false} width={1920} height={1080} createScene={createDirectedSculpture} ariaLabel="A geometric assembly lifts and turns as the camera orbits, pauses, and pulls back" />}</MotionDirector>
    <MotionScrubber timeline={director.timeline} frame={frame} onFrame={setFrame} label="Spatial director frame" />
  </div>;
}
