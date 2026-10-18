/** RAG explainer reference: one wide, locked composition.
 * The "camera" target represents a fixed abstract diagram plane, not a 3D
 * photograph. Educational changes happen inside that plane, never by zooming.
 */
import { createCameraTargetRegistry } from "../../registry/motion/camera-targets";
import { evaluateCameraPose3D } from "../../registry/motion/camera-pose-3d";
import type { CameraTargetRegistry, CinematicCameraPose } from "../../registry/motion/cinematic-camera-types";
import { compileExplainerSequence } from "../../registry/visual/explainer-sequence";
import type { ExplainerShotSpec, ExplainerSequenceSpec } from "../../registry/visual/explainer-sequence";

export const RAG_FPS = { num: 30, den: 1 } as const;
export const RAG_OUTPUT = { width: 1600, height: 900 } as const;

/** Durations sum to 36 seconds; each shot holds one stable reading moment. */
export const RAG_CHAPTERS = [
  { id: "question", start: 0, end: 150, label: "The problem" },
  { id: "index", start: 150, end: 390, label: "Prepare knowledge" },
  { id: "retrieve", start: 390, end: 630, label: "Find relevant context" },
  { id: "generate", start: 630, end: 900, label: "Ground an answer" },
  { id: "summary", start: 900, end: 1080, label: "The takeaway" },
] as const;
export type RagChapterId = typeof RAG_CHAPTERS[number]["id"];

const camera: ExplainerShotSpec["camera"] = {
  type: "establish",
  target: "diagram-plane",
  framing: "wide",
  movement: "hold",
  orbitDegrees: 0,
  azimuth: 0,
  elevation: 0,
  // The left diagram lives in the same place in every shot. CC1 continues to
  // enforce the safe subject footprint; the text lives in the right column.
  composition: {
    safeRegion: { x: .065, y: .10, width: .62, height: .80 },
    subjectPosition: [.355, .5],
  },
};

/** Semantic camera target is a static diagram plane, never a moving tiny icon.
 * Deliberately avoids the moving-target camera fitting that created RAG-irrelevant
 * zoom/oscillation problems in earlier productions.
 */
export function createRagTargets(): CameraTargetRegistry {
  return createCameraTargetRegistry({
    revision: "rag-diagram-locked-v1",
    targets: [{
      id: "diagram-plane", importance: 1,
      frames: [{
        frame: 0,
        bounds: { min: [-4, -2.1, -.05], max: [4, 2.1, .05] },
        focus: [0, 0, 0],
      }],
    }],
  });
}

export function ragSequenceSpec(): ExplainerSequenceSpec {
  const shot = (
    id: RagChapterId,
    explanation: string,
    narration: string,
    role: "explanation" | "summary" = "explanation",
  ): ExplainerShotSpec => {
    const section = RAG_CHAPTERS.find(chapter => chapter.id === id)!;
    return {
      id, durationFrames: section.end - section.start, role,
      camera: { ...camera, composition: { ...camera.composition } },
      explanation, maxLines: 4,
      narration: { text: narration, language: "en" },
    };
  };
  return {
    schemaVersion: 1, id: "what-is-rag", title: "What is RAG, and how does it work?",
    fps: RAG_FPS, output: RAG_OUTPUT,
    cameraProfile: "editorial",
    subjects: [{ id: "diagram-plane", protectText: true, critical: true, safeMargin: .045 }],
    shots: [
      shot("question",
        "The model may not know your latest private documents.",
        "An AI model can answer questions, but it may not know your latest internal documents."),
      shot("index",
        "Split documents into chunks. Embed each chunk for semantic search.",
        "First, split your documents into smaller chunks. An embedding model turns each into a vector for semantic search."),
      shot("retrieve",
        "Embed the question. Retrieve the most relevant chunks.",
        "Next, embed the question too. Search finds the chunks most relevant to what you asked."),
      shot("generate",
        "Add retrieved context to the prompt. Generate a sourced answer.",
        "Those chunks join your question as context for the language model. It generates an answer and can cite its sources."),
      shot("summary",
        "RAG = Retrieve → Augment → Generate.\nGrounding helps. Verify the sources.",
        "That's retrieval-augmented generation: retrieve evidence, add it to the prompt, then generate. Always verify important answers.",
        "summary"),
    ],
  };
}

/** Camera motion is deliberately prohibited in this diagram-first production.
 * Fail authoring changes that introduce even subtle focal shifts, zoom reversals
 * or unplanned cuts. No screenshot recognition and no rendering engine needed.
 */
export function assertRagCameraLocked(
  timeline: { durationFrames: number } & Parameters<typeof evaluateCameraPose3D>[0],
  epsilon = 1e-4,
): void {
  const initial = evaluateCameraPose3D(timeline, 0);
  const cameraComponents = (pose: CinematicCameraPose) => [
    ...pose.position, ...pose.orientation, ...pose.focus, pose.near, pose.far,
    pose.focusDistance,
    pose.projection.kind === "perspective" ? pose.projection.fov : pose.projection.scale,
  ];
  const reference = cameraComponents(initial);
  for (let frame = 1; frame < timeline.durationFrames; frame++) {
    const pose = evaluateCameraPose3D(timeline, frame);
    if (pose.projection.kind !== initial.projection.kind ||
        cameraComponents(pose).some((value, index) => Math.abs(value - reference[index]) > epsilon)) {
      throw new Error("RAG camera drift at frame " + frame +
        ". Keep the camera locked; animate the diagram instead of zooming, oscillating or cutting.");
    }
  }
}

export function createRagProduction() {
  const compiled = compileExplainerSequence(ragSequenceSpec(), createRagTargets());
  if (!compiled.ok) throw new Error(
    "RAG compilation rejected: " + compiled.diagnostics.map(d => d.message).join("; "));
  assertRagCameraLocked(compiled.sequence.camera.timeline);
  return compiled.sequence;
}
