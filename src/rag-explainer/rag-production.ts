/** PDF-first RAG V2 | complete 110-second retrieval-to-answer film.
 * The film uses one static camera. The source PDF, vectors and UI are clearly
 * illustrative: this component explains the mechanics, it does not parse PDFs.
 */
import { createCameraTargetRegistry } from "../../registry/motion/camera-targets";
import { evaluateCameraPose3D } from "../../registry/motion/camera-pose-3d";
import type { CameraTargetRegistry, CinematicCameraPose } from "../../registry/motion/cinematic-camera-types";
import { compileExplainerSequence } from "../../registry/visual/explainer-sequence";
import type { ExplainerSequenceSpec, ExplainerShotSpec } from "../../registry/visual/explainer-sequence";

export const RAG_FPS = { num: 30, den: 1 } as const;
export const RAG_OUTPUT = { width: 1600, height: 900 } as const;
/** Authored SVG area. The semantic text solver reserves the lower caption lane. */
export const RAG_VISUAL_REGION = { x: 0, y: 0, width: 1, height: .75 } as const;
export const RAG_CHAPTERS = [
  { id: "upload", start: 0, end: 210, label: "Import PDF" },
  { id: "extract", start: 210, end: 510, label: "Extract text" },
  { id: "chunk", start: 510, end: 840, label: "Split into chunks" },
  { id: "embed", start: 840, end: 1170, label: "Create embeddings" },
  { id: "index", start: 1170, end: 1380, label: "Build the index" },
  { id: "search", start: 1380, end: 1680, label: "Ask a question" },
  { id: "query-embed", start: 1680, end: 1920, label: "Embed the question" },
  { id: "retrieve", start: 1920, end: 2340, label: "Search vector DB" },
  { id: "evidence", start: 2340, end: 2640, label: "Recover passages" },
  { id: "generate", start: 2640, end: 3060, label: "Generate answer" },
  { id: "recap", start: 3060, end: 3300, label: "The full RAG journey" },
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
      explanation, maxLines: 2,
      narration: { text: narration, language: "en" },
    };
  };
  return {
    schemaVersion: 1,
    id: "how-rag-works-pdf-first",
    title: "How RAG works, starting with a PDF",
    fps: RAG_FPS, output: RAG_OUTPUT, cameraProfile: "editorial",
    subjects: [{ id: "rag-visual-stage", protectText: true, critical: true, safeMargin: .045 }],
    shots: [
      make("upload", "First, load documents into a knowledge base.",
        "Before anyone searches, we add the example employee handbook PDF to a knowledge base."),
      make("extract", "Text PDF: parse. Scanned page: OCR.",
        "For selectable text, a PDF parser reads the embedded text. If a page is just an image, optical character recognition recovers its words. Both paths preserve page references."),
      make("chunk", "Keep text, page numbers, and source IDs together.",
        "Next, the extracted content is normalized and split into short passages. Each chunk carries its original text and a link to its source page."),
      make("embed", "The embedding model maps text to vectors.",
        "A text embedding model turns each chunk into a numerical vector. The vector represents meaning for similarity search, while the readable source passage remains available."),
      make("index", "Store vectors linked to their original passages.",
        "A vector index stores those embeddings alongside chunk identifiers and source references. The index is ready before the first question arrives."),
      make("search", "The user searches the prepared knowledge base.",
        "Now the user asks about PTO rollover. Watch the same question travel into the index we prepared."),
      make("query-embed", "The question becomes a vector too.",
        "We pass the question through the same embedding model. Now question and documents live in a compatible vector space."),
      make("retrieve", "Search candidates, compare similarity, select top two.",
        "An approximate-neighbor index can explore a small set of candidates. We calculate similarity to the question and return the highest ranking matches. Here top k is two."),
      make("evidence", "Retrieve the original text and source references.",
        "Those vector hits are only pointers. The retriever loads the original words and their source sections, not a numerical vector to feed into the language model."),
      make("generate", "Question + source passages become the prompt.",
        "We combine the exact question and two retrieved passages into the language model prompt. It answers using those documents and includes a citation to the handbook section."),
      make("recap", "PDF → index → retrieve → augment → generate.",
        "That is retrieval augmented generation. The document index can change without retraining the language model. A citation is a lead to verify, not a guarantee that the answer is correct.",
        "summary"),
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
