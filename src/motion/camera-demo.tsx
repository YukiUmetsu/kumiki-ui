import { useMemo, useState } from "react";
import { CameraStage } from "./react";
import { MotionScrubber } from "./react";
import { usePrefersReducedMotion } from "./react";
import { StoryboardShots } from "../../registry/motion/storyboard-shots";
import type { Storyboard } from "../../registry/motion/storyboard";
import { createCameraTimeline, frameCameraSubject } from "../../registry/motion/camera";
import { Button } from "../ui/button";

const OUTPUTS = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
} as const;

const CAMERA_BOARD: Storyboard = {
  schemaVersion: 1, id: "camera-direction-2d", title: "Graphic camera study",
  fps: { num: 30, den: 1 }, durationFrames: 360,
  shots: [
    { start: 0, end: 36, title: "Establish", explanation: "Hold the full composition so the viewer can locate all three forms before the camera moves." },
    { start: 36, end: 96, title: "Push in", explanation: "Pan toward the first form while increasing scale. This 2D zoom creates emphasis without changing perspective or adding parallax." },
    { start: 96, end: 126, title: "Hold", explanation: "Keep the camera still on the detail. The pause gives the viewer time to understand the shape before the next change." },
    { start: 126, end: 191, title: "Cut + roll", explanation: "Cut instantly to the second form with an authored camera roll, then hold. The cut changes viewpoint without traveling through the space between subjects." },
    { start: 191, end: 286, title: "Track + reframe", explanation: "Pan to the third form while changing roll and framing. The title stays fixed in screen space as the world moves underneath it." },
    { start: 286, end: 360, title: "Pull back", explanation: "Reduce the zoom, remove the roll and return to the overview, reconnecting the inspected details with the whole composition." },
  ].map((beat, index) => ({
    id: `graphic-camera-shot-${index}`, sceneRef: "graphic-study", startFrame: beat.start,
    durationFrames: beat.end - beat.start, claim: beat.title, visualObjective: beat.explanation,
    focusTarget: "graphic-composition", onScreenLabels: [beat.title], staticFallback: beat.explanation,
  })),
};

/** One reusable scene, with camera framing authored for each output. */
export function CameraDemo({ reducedMotion }: { reducedMotion?: boolean } = {}) {
  const [aspect, setAspect] = useState<keyof typeof OUTPUTS>("landscape");
  const [frame, setFrame] = useState(0);
  const prefersReduced = usePrefersReducedMotion();
  const resolvedFrame = (reducedMotion ?? prefersReduced) ? 359 : frame;
  const viewport = OUTPUTS[aspect];
  const timeline = useMemo(() => {
    const overview = frameCameraSubject({ x: 80, y: 100, width: 1760, height: 800 }, viewport);
    const form = frameCameraSubject({ x: 120, y: 200, width: 520, height: 600 }, viewport, { padding: 0.15 });
    const motion = frameCameraSubject({ x: 680, y: 200, width: 560, height: 600 }, viewport, { padding: 0.15, roll: -8 });
    const detail = frameCameraSubject({ x: 1280, y: 200, width: 520, height: 600 }, viewport, { padding: 0.15, roll: 6 });
    return createCameraTimeline({
      id: `camera-study-${aspect}`, fps: { num: 30, den: 1 }, durationFrames: 360,
      keyframes: [
        { frame: 0, ...overview }, { frame: 35, ...overview },
        { frame: 95, ...form }, { frame: 125, ...form },
        { frame: 126, ...motion, cut: true }, { frame: 190, ...motion },
        { frame: 255, ...detail }, { frame: 285, ...detail },
        { frame: 350, ...overview }, { frame: 359, ...overview },
      ],
    });
  }, [aspect, viewport]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Camera output aspect">
        {(Object.keys(OUTPUTS) as Array<keyof typeof OUTPUTS>).map((output) => (
          <Button key={output} variant={aspect === output ? "primary" : "outline"} size="sm" aria-pressed={aspect === output} onClick={() => setAspect(output)}>
            {output === "landscape" ? "Landscape 16:9" : output === "portrait" ? "Portrait 9:16" : "Square 1:1"}
          </Button>
        ))}
      </div>
      <div className="mx-auto w-full overflow-hidden rounded-surface border border-border" style={{ maxWidth: aspect === "portrait" ? 360 : aspect === "square" ? 640 : undefined }}>
        <CameraStage
          timeline={timeline} frame={frame} {...viewport}
          reducedMotion={reducedMotion}
          ariaLabel="Three geometric studies with a camera that establishes, approaches, cuts, tracks and pulls back"
          background="var(--km-surface-default)"
          style={{ color: "var(--km-text-primary)" }}
          overlay={
            <g fill="currentColor" fontFamily="inherit" fontSize={viewport.width * 0.022}>
              <text x={viewport.width * 0.05} y={viewport.height * 0.065}>A study in perspective</text>
              <text x={viewport.width * 0.95} y={viewport.height * 0.95} textAnchor="end">形と動き</text>
            </g>
          }
        >
          <path d="M 380 500 H 1540" fill="none" stroke="var(--km-border-strong)" strokeWidth="3" strokeDasharray="8 14" />
          <g transform="translate(380 500)">
            <circle r="220" fill="var(--km-surface-subtle)" />
            <rect x="-135" y="-135" width="270" height="270" rx="32" fill="var(--km-action-primary)" transform="rotate(-15)" />
            <rect x="-76" y="-76" width="152" height="152" rx="16" fill="var(--km-surface-default)" transform="rotate(15)" />
            <text y="300" textAnchor="middle" fill="currentColor" fontFamily="inherit" fontSize="48">Form</text>
          </g>
          <g transform="translate(960 500)">
            <circle r="220" fill="var(--km-surface-subtle)" />
            {[160, 110, 60].map((radius) => <circle key={radius} r={radius} fill="none" stroke="var(--km-action-primary)" strokeWidth="20" />)}
            <circle cx="115" cy="-112" r="35" fill="var(--km-text-primary)" stroke="var(--km-surface-default)" strokeWidth="10" />
            <text y="300" textAnchor="middle" fill="currentColor" fontFamily="inherit" fontSize="48">Motion</text>
          </g>
          <g transform="translate(1540 500)">
            <circle r="220" fill="var(--km-surface-subtle)" />
            {Array.from({ length: 7 }, (_, index) => (
              <rect key={index} x={-140 + index * 40} y={-120 + Math.abs(index - 3) * 24} width="22" height={240 - Math.abs(index - 3) * 48} rx="11" fill="var(--km-action-primary)" />
            ))}
            <text y="300" textAnchor="middle" fill="currentColor" fontFamily="inherit" fontSize="48">Detail</text>
          </g>
        </CameraStage>
      </div>
      <MotionScrubber timeline={timeline} frame={frame} onFrame={setFrame} label="Camera frame" />
      <StoryboardShots storyboard={CAMERA_BOARD} frame={resolvedFrame} onFrameChange={setFrame} label="2D camera storyboard shots" />
    </div>
  );
}
