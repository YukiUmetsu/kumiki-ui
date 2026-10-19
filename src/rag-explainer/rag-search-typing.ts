/** Frame-accurate search typing from Kumiki's reusable kinetic-text timeline.
 * The glyphs are animated by MG1, not a custom substring-time equation.
 * The result is placed inside one measured, stationary search input.
 */
import { buildKineticTextTimeline } from "../../registry/motion/kinetic-text";
import { evaluateTimeline, outputKey } from "../../registry/motion/timeline";
import { RAG_QUESTION } from "./rag-domain";

const built = buildKineticTextTimeline({
  id: "rag-search-input", text: RAG_QUESTION,
  granularity: "grapheme", startFrame: 52, durationFrames: 300,
  fps: { num: 30, den: 1 }, stagger: 3,
  timing: 11, distance: 0, preset: "rise-reveal",
});
const failures = built.diagnostics.filter(diagnostic => diagnostic.severity === "error");
if (failures.length) throw new Error(
  "Kinetic question is invalid: " + failures.map(issue => issue.message).join("; "));

export function typedRagQuestionAt(frame: number): string {
  const evaluated = evaluateTimeline(built.timeline,
    Math.max(0, Math.min(299, Math.trunc(frame))));
  const errors = evaluated.diagnostics.filter(diagnostic => diagnostic.severity === "error");
  if (errors.length) throw new Error("Question animation error: " +
    errors.map(item => item.message).join("; "));
  let length = 0;
  for (let i = 0; i < built.glyphIds.length; i++) {
    const opacity = evaluated.samples[outputKey(built.glyphIds[i], "opacity")]?.value;
    if (typeof opacity !== "number" || opacity < .85) break;
    length++;
  }
  return built.tokens.slice(0, length).join("");
}
