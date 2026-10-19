/** RAG cinematic hook + PDF-first explainer · 119 seconds / one timeline.
 * The film uses one static camera. The source PDF, vectors and UI are clearly
 * illustrative: this component explains the mechanics, it does not parse PDFs.
 */
import { createCameraTargetRegistry } from "../../registry/motion/camera-targets";
import { evaluateCameraPose3D } from "../../registry/motion/camera-pose-3d";
import type { CameraTargetRegistry, CinematicCameraPose } from "../../registry/motion/cinematic-camera-types";
import { compileExplainerSequence } from "../../registry/visual/explainer-sequence";
import type { ExplainerSequenceSpec, ExplainerShotSpec } from "../../registry/visual/explainer-sequence";
import { RAG_HOOK_FRAMES } from "./rag-hook";

export const RAG_FPS = { num: 30, den: 1 } as const;
export const RAG_OUTPUT = { width: 1600, height: 900 } as const;
/** Authored SVG area. The semantic text solver reserves the lower caption lane. */
export const RAG_VISUAL_REGION = { x: 0, y: 0, width: 1, height: .81 } as const;
export const RAG_CHAPTERS = [
  { id: "hook", start: 0, end: RAG_HOOK_FRAMES, label: "What is RAG?" },
  { id: "extract", start: 360, end: 660, label: "Read the PDF" },
  { id: "chunk", start: 660, end: 990, label: "Chunk the text" },
  { id: "embed", start: 990, end: 1320, label: "Embed passages" },
  { id: "index", start: 1320, end: 1530, label: "Index vectors" },
  { id: "search", start: 1530, end: 1830, label: "Ask a question" },
  { id: "query-embed", start: 1830, end: 2070, label: "Embed the question" },
  { id: "retrieve", start: 2070, end: 2490, label: "Find similar passages" },
  { id: "evidence", start: 2490, end: 2790, label: "Retrieve source text" },
  { id: "generate", start: 2790, end: 3210, label: "Generate the answer" },
  { id: "compare", start: 3210, end: 3570, label: "Why use RAG?" },
] as const;
export type RagChapterId = typeof RAG_CHAPTERS[number]["id"];

const lockedCamera: ExplainerShotSpec["camera"] = {
  type: "establish", target: "rag-visual-stage", framing: "wide",
  movement: "hold", azimuth: 0, elevation: 0, orbitDegrees: 0,
  composition: {
    safeRegion: { x: .065, y: .10, width: .62, height: .80 },
    subjectPosition: [.355, .5],
  },
};
export function createRagTargets(): CameraTargetRegistry {
  return createCameraTargetRegistry({
    revision: "rag-pdf-first-locked",
    targets: [{ id: "rag-visual-stage", importance: 1, frames: [{
      frame: 0,
      bounds: { min: [-4, -2.1, -.05], max: [4, 2.1, .05] },
      focus: [0, 0, 0],
    }] }],
  });
}
export function ragSequenceSpec(): ExplainerSequenceSpec {
  const make = (
    id: RagChapterId,
    explanation: string,
    narration: string,
    role: "explanation" | "summary" = "explanation",
  ): ExplainerShotSpec => {
    const chapter = RAG_CHAPTERS.find(item => item.id === id)!;
    return {
      id, durationFrames: chapter.end - chapter.start, role,
      camera: { ...lockedCamera, composition: { ...lockedCamera.composition } },
      explanation, maxLines: 1,
      narration: { text: narration, language: "en" },
    };
  };
  return {
    schemaVersion: 1,
    id: "how-rag-works-source-to-answer",
    title: "How RAG works, from PDF text to cited answer",
    fps: RAG_FPS, output: RAG_OUTPUT, cameraProfile: "editorial",
    subjects: [{ id: "rag-visual-stage", protectText: true, critical: true, safeMargin: .045 }],
    shots: [
      make("hook", "Knowledge becomes a source-grounded answer.",
        "RAG means Retrieval-Augmented Generation. Retrieve relevant passages, augment the model's prompt with that evidence, and generate an answer with a source citation."),
      make("extract", "Read PDF text and retain source locations.",
        "A PDF parser extracts selectable text from the employee handbook and preserves its source section. We will use those passages when someone asks a question."),
      make("chunk", "Keep each chunk linked to its source.",
        "Next, the extracted content is normalized and split into short passages. Each chunk carries its original text and a link to its source page."),
      make("embed", "Embed text; retain its source.",
        "A text embedding model turns each chunk into a numerical vector. The vector represents meaning for similarity search, while the readable source passage remains available."),
      make("index", "Vector positions reflect semantic similarity.",
        "A vector index stores those embeddings alongside chunk identifiers and source references. The index is ready before the first question arrives."),
      make("search", "Ask a question.",
        "Now the user asks about PTO rollover. Watch the same question travel into the index we prepared."),
      make("query-embed", "Embed the question in the same space.",
        "We pass the question through the same embedding model. Now question and documents live in a compatible vector space."),
      make("retrieve", "Rank by similarity; take the top two passages.",
        "The query vector sits near passages about PTO. We compute similarity against our example index and select the two strongest matching chunk IDs. Other topics stay out of the result."),
      make("evidence", "Look up the matching source passages.",
        "Those vector hits are only pointers. The retriever loads the original words and their source sections, not a numerical vector to feed into the language model."),
      make("generate", "A direct answer with a source you can verify.",
        "The retrieved text becomes the model's context. The language model answers the question with a reference back to the employee handbook."),
      make("compare", "Exact-match speed versus evidence-grounded answers.",
        "Keyword search is lightweight and precise for SKUs and error codes, but can miss rephrasing. RAG with semantic retrieval handles natural questions and returns sourced answers, at greater cost and complexity.", "summary"),

    ],
  };
}
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
        cameraComponents(pose).some((value, index) => Math.abs(value - reference[index]) > epsilon))
      throw new Error("RAG camera drift at frame " + frame +
        ". Keep the film steady; transform data instead of zooming or cutting.");
  }
}
export function createRagProduction() {
  const result = compileExplainerSequence(ragSequenceSpec(), createRagTargets());
  if (!result.ok) throw new Error("RAG production rejected: " +
    result.diagnostics.map(item => item.message).join("; "));
  assertRagCameraLocked(result.sequence.camera.timeline);
  return result.sequence;
}
