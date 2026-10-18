import { useCallback, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box3, Color, Matrix4, Scene, Vector3 } from "three";
import { createCraftedEnclosure } from "../../registry/craft/enclosure-kit";
import { createCraftStudio } from "../../registry/craft/studio-kit";
import { createCraftEnvironment } from "../../registry/craft/environment-kit";
import { compileCinematicCamera } from "../../registry/motion/cinematic-camera-director";
import { CameraSequence, CameraShotRecipe } from "../../registry/motion/camera-shot-recipes";
import { CameraViewport3D } from "../../registry/motion/camera-viewport-3d";
import { compileMotionDirector } from "../../registry/motion/motion-director";
import type { CameraTargetRegistry, CameraBounds3D } from "../../registry/motion/cinematic-camera-types";
import { createSemanticComposition } from "../../registry/visual/semantic-composition";
import { SemanticCompositionStage } from "../../registry/visual/semantic-composition-stage";

function createStaticRegistry(): CameraTargetRegistry {
  // Reference object uses the exact same production constructor as the viewport.
  // Take actual part bounds once, without hand-authoring 2D safe rectangles.
  const reference = createCraftedEnclosure({ id: "control-unit", ports: 4 });
  reference.group.updateWorldMatrix(true, true);
  const button = reference.getPart("power-button");
  if (!button) throw new Error("The crafted unit requires a named power-button part.");
  const bounds = new Map<string, CameraBounds3D>();
  for (const [id, object] of [["unit", reference.group], ["power-button", button]] as const) {
    const box = new Box3().setFromObject(object, true);
    bounds.set(id, { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] });
  }
  reference.dispose();
  const identity = new Matrix4().toArray();
  return {
    revision: "control-unit-reference-v1", ids: ["unit", "power-button"], diagnostics: [],
    sample(id) {
      const bound = bounds.get(id);
      if (!bound) throw new Error("Unknown camera subject " + id);
      const midpoint = new Vector3(...bound.min).add(new Vector3(...bound.max)).multiplyScalar(.5);
      return { id, bounds: bound, focus: [midpoint.x, midpoint.y, midpoint.z],
        orientation: [0, 0, 0, 1], worldMatrix: identity,
        importance: id === "unit" ? 1 : .5 };
    },
  };
}

function SemanticCompositionReference() {
  const [frame, setFrame] = useState(44);
  const authored = useMemo(() => {
    const targets = createStaticRegistry();
    const cameraResult = compileCinematicCamera(CameraSequence({
      id: "semantic-device", title: "Inspect the control", fps: { num: 30, den: 1 },
      durationFrames: 90, output: { width: 1600, height: 900 },
      profile: "technical",
      shots: [CameraShotRecipe("inspect", {
        id: "inspection", target: "unit", durationFrames: 90, framing: "wide", movement: "hold",
        orbitDegrees: 0, elevation: 16, azimuth: 12,
        composition: { subjectPosition: [.30, .50], reserveRight: .34, safeMargin: .06 },
      })],
    }), targets);
    if (!cameraResult.ok) throw new Error(cameraResult.diagnostics.map(d => d.message).join("; "));
    const directorResult = compileMotionDirector({
      schemaVersion: 1, id: "semantic-device-events", title: "Inspect the control",
      fps: { num: 30, den: 1 }, durationFrames: 90,
      targets: ["unit", "power-button"], children: [
        { kind: "cue", id: "tap-button", at: 44, targetId: "power-button",
          payload: { kind: "event", name: "activate" } },
      ],
    });
    if (!directorResult.ok) throw new Error(directorResult.diagnostics.map(d => d.message).join("; "));
    const composition = createSemanticComposition({
      id: "control-unit-explanation", camera: cameraResult.plan,
      director: directorResult.director, targets,
      subjects: [
        { id: "unit", critical: true, protectText: true },
        { id: "power-button", critical: false, protectText: false },
      ],
      actions: [{ id: "activate-control", event: "activate", subjectId: "power-button",
        leadFrames: 5, tailFrames: 5 }],
    });
    return { camera: cameraResult.plan, composition };
  }, []);
  const createScene = useCallback(() => {
    const scene = new Scene();
    scene.background = new Color("#17252d");
    const device = createCraftedEnclosure({ id: "control-unit", ports: 4 });
    const studio = createCraftStudio({ mood: "technical", groundY: -.45 });
    const reflections = createCraftEnvironment({ mood: "neutral" });
    const restore = reflections.apply(scene);
    scene.add(studio.group, device.group);
    return { scene, dispose() { restore(); reflections.dispose(); studio.dispose(); device.dispose(); scene.clear(); } };
  }, []);
  const sampled = authored.composition.sample(frame);
  return <div style={{ padding: "clamp(16px, 4vw, 50px)", background: "#122029", color: "#f1f5f5", minHeight: "100vh" }}>
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", margin: "0 0 16px", fontWeight: 400 }}>
        Semantic composition / authored once
      </h1>
      <p style={{ maxWidth: 780, lineHeight: 1.6, color: "#c2d3db", marginBottom: 26 }}>
        Camera subjects and the power-button action are resolved from actual 3D part geometry and an MD1 cue.
        The caption uses the measured text-region solver without authored absolute screen coordinates.
      </p>
      <SemanticCompositionStage composition={authored.composition} frame={frame}
        explanation={"The control unit exposes physical network ports and an accessible power control.\n" +
          "Its construction is shown rather than replaced by a generic symbol."}
        language="en" maxLines={5}
        textStyle={{ fontSize: "clamp(16px, 1.7vw, 26px)", color: "#eef4f8", lineHeight: 1.4 }}
        style={{ background: "#17252d", borderRadius: 14, overflow: "hidden" }}>
        <CameraViewport3D timeline={authored.camera.timeline} frame={frame}
          createScene={createScene} cameraMode="pose" width={1600} height={900}
          ariaLabel="Crafted hardware with a semantic power-button target" />
      </SemanticCompositionStage>
      <label style={{ display: "grid", gap: 10, maxWidth: 480, marginTop: 24 }}>
        Frame / {frame} <input type="range" min={0} max={89} value={frame}
          onChange={e => setFrame(Number(e.target.value))} />
      </label>
      <p style={{ fontSize: 13, marginTop: 16, color: "#bfd0d8" }}>
        MD1 activation event: frame 44 · declared regions: {sampled.regions.map(r => r.id).join(", ")} ·
        projection issues: {sampled.issues.length}
      </p>
    </div>
  </div>;
}

const meta = { title: "Explainers/Semantic Composition", component: SemanticCompositionReference,
  parameters: { layout: "fullscreen" } } satisfies Meta<typeof SemanticCompositionReference>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ConstructedDevice: Story = {};
