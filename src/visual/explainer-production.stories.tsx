import { useCallback, useMemo, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box3, Color, Matrix4, Scene, Vector3 } from "three";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import type { CameraTargetRegistry, CameraBounds3D } from "../../registry/motion/cinematic-camera-types";
import { createCraftedEnclosure } from "../../registry/craft/enclosure-kit";
import { createCraftEnvironment } from "../../registry/craft/environment-kit";
import { createCraftStudio } from "../../registry/craft/studio-kit";
import { compileExplainerSequence } from "../../registry/visual/explainer-sequence";
import type { ExplainerFrame } from "../../registry/visual/explainer-sequence";
import { ExplainerPlayer } from "../../registry/visual/explainer-player";
import { ExplainerFrameCapture } from "../../registry/visual/explainer-frame-capture";
import type { ExplainerFrameCaptureHandle } from "../../registry/visual/explainer-frame-capture";

function deviceTargets(): CameraTargetRegistry {
  // Author once from the same real 3D parts drawn by the preview. No hand-drawn
  // 2D "keep-out" rectangles and no screenshot classification.
  const model = createCraftedEnclosure({ ports: 4 });
  model.group.updateWorldMatrix(true, true);
  const button = model.getPart("power-button");
  if (!button) throw new Error("The control unit needs a power button.");
  const bounds = new Map<string, CameraBounds3D>();
  for (const [id, object] of [["unit", model.group], ["power-button", button]] as const) {
    const box = new Box3().setFromObject(object, true);
    bounds.set(id, { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] });
  }
  model.dispose();
  const identity = new Matrix4().toArray();
  return {
    revision: "explainer-device-reference-v1", ids: ["unit", "power-button"], diagnostics: [],
    sample(id) {
      const bounds3d = bounds.get(id);
      if (!bounds3d) throw new Error("Missing physical target " + id);
      const focus = new Vector3(...bounds3d.min).add(new Vector3(...bounds3d.max)).multiplyScalar(.5);
      return { id, bounds: bounds3d, focus: [focus.x, focus.y, focus.z],
        orientation: [0, 0, 0, 1], worldMatrix: identity, importance: 1 };
    },
  };
}

function useDeviceProduction() {
  const result = useMemo(() => compileExplainerSequence({
    schemaVersion: 1, id: "device-story", title: "Physical systems explained",
    fps: { num: 30, den: 1 }, output: { width: 1600, height: 900 },
    cameraProfile: "technical",
    subjects: [
      { id: "unit", protectText: true },
      { id: "power-button", protectText: false },
    ],
    shots: [
      { id: "establish", durationFrames: 48,
        camera: { type: "inspect", target: "unit", framing: "wide", movement: "hold",
          orbitDegrees: 0, elevation: 16, azimuth: 12,
          composition: { subjectPosition: [.31, .50], reserveRight: .30, safeMargin: .06 } },
        explanation: "A physical network unit routes information through dedicated ports.",
        narration: { text: "First, identify the enclosure and its ports.", language: "en" } },
      { id: "control", durationFrames: 60,
        camera: { type: "inspect", target: "unit", framing: "wide", movement: "hold",
          orbitDegrees: 0, elevation: 16, azimuth: 21,
          transition: { kind: "continuous", durationFrames: 10 },
          composition: { subjectPosition: [.31, .50], reserveRight: .30, safeMargin: .06 } },
        explanation: "The button is a distinct physical control. Watch it activate.",
        actions: [{ id: "press", subjectId: "power-button", atFrame: 30,
          leadFrames: 5, tailFrames: 5 }],
        narration: { text: "Next, activate the front power button.", language: "en" } },
      { id: "takeaway", role: "summary", durationFrames: 48,
        camera: { type: "inspect", target: "unit", framing: "wide", movement: "hold",
          orbitDegrees: 0, elevation: 16, azimuth: 12,
          transition: { kind: "continuous", durationFrames: 10 },
          composition: { subjectPosition: [.31, .50], reserveRight: .30, safeMargin: .06 } },
        explanation: "Key takeaway: true connector wells, clear controls, and a consistent camera view.",
        narration: { text: "The ports and controls are constructed details, not decorations.", language: "en" } },
    ],
  }, deviceTargets()), []);
  const createScene = useCallback(() => {
    const scene = new Scene();
    scene.background = new Color("#17232e");
    const device = createCraftedEnclosure({ ports: 4 });
    const studio = createCraftStudio({ mood: "technical", groundY: -.45 });
    const environment = createCraftEnvironment({ mood: "neutral" });
    const restore = environment.apply(scene);
    scene.add(device.group, studio.group);
    const button = device.getPart("power-button");
    const buttonZ = button?.position.z ?? 0;
    return {
      scene,
      updateFrame(frame: number) {
        // This effect is derived from the *absolute* frame, never accumulated
        // from previous playback. Directly seeking to frame 78 also works.
        const pressed = frame >= 78 && frame < 85;
        if (button) button.position.z = buttonZ - (pressed ? .017 : 0);
        device.materials.materials.indicator.emissiveIntensity = frame >= 78 ? 2.4 : .65;
      },
      dispose() { restore(); environment.dispose(); studio.dispose(); device.dispose(); scene.clear(); },
    };
  }, []);
  return { result, createScene };
}

function ProductionDemo() {
  const { result, createScene } = useDeviceProduction();
  const [frame, setFrame] = useState(0);
  if (!result.ok) return <pre role="alert" style={{ whiteSpace: "pre-wrap", padding: 24 }}>
    {result.diagnostics.map(d => d.message).join("\n")}
  </pre>;
  const sequence = result.sequence;
  const visual = (state: ExplainerFrame) =>
    <CameraViewport3D timeline={sequence.director.timeline} frame={state.frame} evaluation={state.motion.evaluation}
      createScene={createScene} cameraMode="pose" reducedMotion={false}
      width={1600} height={900} ariaLabel="3D device showing real connections and power-button movement" />;
  return <div style={{ minHeight: "100vh", padding: "32px clamp(16px, 4vw, 64px)",
    background: "#111b25", color: "#eaf2f8" }}>
    <div style={{ maxWidth: 1140, margin: "auto" }}>
      <p style={{ letterSpacing: ".18em", textTransform: "uppercase", fontSize: 12,
        color: "#88a8bd" }}>Explainer Production / ES1</p>
      <h1 style={{ margin: "8px 0 10px", fontSize: "clamp(28px, 4vw, 48px)",
        fontWeight: 400 }}>One script. One timeline. One finished story.</h1>
      <p style={{ maxWidth: 720, lineHeight: 1.55, color: "#b5c8d3", marginBottom: 24 }}>
        Scrub across the physical action at frame 78 and the closing summary at frame 108.
        Camera poses, narration cues and safe captions all originate from one authored sequence.
      </p>
      <ExplainerPlayer sequence={sequence} initialFrame={frame} onFrameChange={setFrame}
        renderVisual={visual} style={{ color: "#eaf2f8", borderRadius: 16, overflow: "hidden",
          background: "#17232e" }} />
      <p style={{ marginTop: 12, fontSize: 13, color: "#a6bac8" }}>
        Current shot: {sequence.shots.find(s => frame >= s.startFrame && frame < s.endFrame)?.id}
        {" · "}Cue(s): {sequence.director.cues.filter(c => c.frame === frame).map(c => c.id).join(", ") || "none"}
      </p>
    </div>
  </div>;
}

function CaptureDemo() {
  const { result, createScene } = useDeviceProduction();
  const ref = useRef<ExplainerFrameCaptureHandle>(null);
  const [ready, setReady] = useState("Choose a frame to prepare an export screenshot.");
  if (!result.ok) return <pre role="alert">{result.diagnostics.map(d => d.message).join("; ")}</pre>;
  const sequence = result.sequence;
  return <div style={{ padding: 28, background: "#101a23", color: "#f4f8fc" }}>
    <h1 style={{ fontSize: 28, fontWeight: 400 }}>Random-access capture readiness</h1>
    <p>Seek directly, wait for caption layout and scene rendering, then capture the output container using your browser.</p>
    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
      {[0, 78, 120].map(frame => <button key={frame} type="button"
        onClick={() => { void ref.current?.seek(frame).then(
          () => setReady("Ready for screenshot: frame " + frame),
          error => setReady(String(error)),
        ); }}>
        Prepare frame {frame}
      </button>)}
    </div>
    <p role="status">{ready}</p>
    <div style={{ overflowX: "auto", maxWidth: "100%" }}>
      <ExplainerFrameCapture ref={ref} sequence={sequence}
        renderVisual={state => <CameraViewport3D timeline={sequence.director.timeline}
          frame={state.frame} evaluation={state.motion.evaluation} createScene={createScene} cameraMode="pose" reducedMotion={false}
          width={1600} height={900} />}
        style={{ color: "#f4f8fc", background: "#17232e" }} />
    </div>
  </div>;
}

const meta = { title: "Explainers/Production Sequence", component: ProductionDemo,
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof ProductionDemo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const MultiShotPlayback: Story = {};
export const CaptureReadyFrames: Story = { render: () => <CaptureDemo /> };
