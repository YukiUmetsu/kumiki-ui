/** Explainer product principles (docs/17 §1) as one opt-in, CPU-only preflight.
 * Extends the existing VisualProductionContract with declared purposes, output
 * framing samples, captions, rights and capabilities. It checks DECLARED data:
 * it cannot judge whether motion is meaningful, a claim is true or a frame is
 * beautiful. Bounds come from CC1 projection, ExplainerStage layout or capture.
 */
import { sortDiagnostics } from "../motion/diagnostics";
import type { Diagnostic, RationalFps, Rect } from "../motion/types";
import {
  validateVisualProduction, type ProductionContractIssue, type VisualProductionContract, type VisualShotContract,
} from "./production-contract";

export type PrincipleNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export interface PrincipleDiagnostic extends Diagnostic { principle: PrincipleNumber; targetId?: string }

/** Why a shot moves. Decoration and cut cadence are not purposes. */
export const MOTION_PURPOSES = [
  "attract-attention", "reveal-evidence", "direct-focus", "explain-causality",
  "illustrate-scale", "compare-alternatives", "deliver-payoff",
] as const;
export type MotionPurpose = typeof MOTION_PURPOSES[number];

export interface PrincipledShot extends VisualShotContract {
  purpose: MotionPurpose;
  /** All semantic subjects present (defaults to `criticalSubjects`). */
  subjectIds?: readonly string[];
  /** `cut` may replace the subject set; `continuous` (default) must keep identities unless released. */
  entry?: "continuous" | "cut";
  /** Subjects that intentionally leave at the end of this shot. */
  releasedSubjectIds?: readonly string[];
}
/** Measured bounds at one authored frame, in output px. */
export interface PrincipleFrameSample {
  frame: number;
  subjects: Readonly<Record<string, Rect>>;
  text?: Readonly<Record<string, Rect>>;
}
export interface PrincipleOutputProfile {
  id: string;
  width: number;
  height: number;
  /** `derived-crop` (blindly cropped from another output) is rejected. */
  composition: "authored" | "derived-crop";
  /** Platform UI and reserved regions, supplied per profile — never assumed. */
  exclusionZones: readonly { id: string; rect: Rect }[];
  samples: readonly PrincipleFrameSample[];
}
export interface PrincipleCaption { id: string; text: string; startFrame: number; endFrame: number }
export interface PrincipleRequirement {
  capability: string;
  kind: "decoder" | "codec" | "font" | "rig" | "alignment" | "dataset" | "renderer" | "other";
  /** An explicitly accepted fallback; absent means a missing capability fails. */
  fallback?: string;
}
export interface PrincipleAsset { id: string; uri: string; sha256?: string; licenseRef?: string }
export interface PrincipleFact {
  id: string;
  value: number | string;
  unit: string;
  sourceId?: string;
  /** Explicitly labelled illustrative values may omit a source. */
  illustrative?: boolean;
}
export interface PrincipledProduction extends Omit<VisualProductionContract, "shots"> { shots: readonly PrincipledShot[] }
export interface ExplainerPrinciplesManifest {
  schemaVersion: 1;
  fps: RationalFps;
  production: PrincipledProduction;
  opening: { visibleSubjectIds: readonly string[] } | { delayedReason: string };
  hook?: { shotId: string; claimId: string; payoffShotId: string };
  criticalHolds?: readonly { id: string; startFrame: number; endFrame: number; minFrames: number }[];
  captions?: readonly PrincipleCaption[];
  outputs: readonly PrincipleOutputProfile[];
  accessibility: { reducedMotion: "static-equivalent" | "reduced-variant" | "none"; textSummary: string };
  cues?: readonly { id: string; frame: number; kind: string }[];
  seededEffects?: readonly { id: string; seed: number }[];
  requirements: readonly PrincipleRequirement[];
  assets?: readonly PrincipleAsset[];
  facts?: readonly PrincipleFact[];
  visualReview?: { reviewer: string; date: string; outputIds: readonly string[] };
}
export interface ExplainerPrinciplesOptions {
  /** Capabilities advertised by the preview/export adapter. Omit = unverified. */
  availableCapabilities?: readonly string[];
  reading?: { wordsPerSecond?: number; cjkCharsPerSecond?: number; minHoldSeconds?: number };
}

/** What the preflight proves and what remains an authoring obligation. */
export const PRINCIPLE_COVERAGE: Readonly<Record<PrincipleNumber, { title: string; automated: string; obligation: string }>> = {
  1: { title: "Communicate before decorating", automated: "Every shot declares a purpose, subjects and actions; uniform cut cadence is flagged.",
    obligation: "Whether the motion actually serves its declared purpose." },
  2: { title: "Compose existing tools first", automated: "None in this preflight.",
    obligation: "Search with catalog:find / catalog:api before adding a primitive." },
  3: { title: "Deterministic, frame-addressable", automated: "Rational FPS, cue frames, effect seeds, asset hashes; inspectSeekParity compares random seeks with forward play.",
    obligation: "Run inspectSeekParity on the real evaluator." },
  4: { title: "Works in three subject areas", automated: "inspectComponentReuse counts distinct demonstrated areas.",
    obligation: "Keep consumer-specific names and logic out of the public API." },
  5: { title: "Semantic identity survives edits", automated: "Continuous shots keep or explicitly release subjects; every output frames the critical subjects.",
    obligation: "Use the same semantic IDs in motion, camera and layout." },
  6: { title: "Short-form native, comprehension first", automated: "Frame-0 subjects, hook→later payoff, critical holds and caption reading time.",
    obligation: "Whether the hook's promise is genuinely paid off." },
  7: { title: "Respect output constraints", automated: "Authored (not cropped) outputs, text vs exclusion zones, measured captions per output, reduced motion and text summary.",
    obligation: "Measure with the real font at every supported language." },
  8: { title: "Honest capabilities and rights", automated: "Requirements vs adapter capabilities, asset licences, sourced facts with units.",
    obligation: "That a licence reference really permits this distribution." },
  9: { title: "Inexpensive deterministic QA first", automated: "This preflight is pure; human visual review is reported as pending until recorded.",
    obligation: "Record actual human review of exported frames." },
};

const PRODUCTION_PRINCIPLE: Record<ProductionContractIssue["code"], PrincipleNumber> = {
  invalid: 3, "timeline-gap": 3, "missing-action": 1, "missing-outcome": 6, "missing-closing-summary": 6,
};
const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯豈-﫿ｦ-ﾟ]/gu;
const SHA256 = /^[0-9a-f]{64}$/i;

function intersects(a: Rect, b: Rect) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
function inside(r: Rect, width: number, height: number) {
  return r.x >= 0 && r.y >= 0 && r.x + r.width <= width && r.y + r.height <= height;
}
function onScreen(r: Rect, width: number, height: number) {
  return r.width > 0 && r.height > 0 && intersects(r, { x: 0, y: 0, width, height });
}
const subjectsOf = (shot: PrincipledShot) => shot.subjectIds ?? shot.criticalSubjects;

/** Minimum readable frames: Latin words and CJK characters read at separate rates. */
export function readableCaptionFrames(text: string, fps: RationalFps, reading: ExplainerPrinciplesOptions["reading"] = {}) {
  const cjk = text.match(CJK)?.length ?? 0;
  const words = text.replace(CJK, " ").split(/\s+/u).filter(word => /\p{L}|\p{N}/u.test(word)).length;
  const seconds = Math.max(reading.minHoldSeconds ?? 0.8,
    words / (reading.wordsPerSecond ?? 3) + cjk / (reading.cjkCharsPerSecond ?? 6));
  return Math.ceil(seconds * fps.num / fps.den);
}

/** Convert fractional safe insets (e.g. `videoPlatformPreset(id).safeInset`) into exclusion rects. */
export function exclusionZonesFromInset(
  width: number, height: number, inset: { left: number; right: number; top: number; bottom: number },
): PrincipleOutputProfile["exclusionZones"] {
  const left = width * inset.left, right = width * inset.right, top = height * inset.top, bottom = height * inset.bottom;
  return [
    { id: "inset-top", rect: { x: 0, y: 0, width, height: top } },
    { id: "inset-bottom", rect: { x: 0, y: height - bottom, width, height: bottom } },
    { id: "inset-left", rect: { x: 0, y: 0, width: left, height } },
    { id: "inset-right", rect: { x: width - right, y: 0, width: right, height } },
  ].filter(zone => zone.rect.width > 0 && zone.rect.height > 0);
}

export function inspectExplainerPrinciples(manifest: ExplainerPrinciplesManifest, options: ExplainerPrinciplesOptions = {}) {
  const diagnostics: PrincipleDiagnostic[] = [];
  const report = (principle: PrincipleNumber, severity: "error" | "warning", code: string, message: string,
    extra: Partial<PrincipleDiagnostic> = {}) => diagnostics.push({ principle, severity, code, message, ...extra });
  const { production, fps } = manifest;
  const total = production.totalFrames, shots = production.shots;
  const inRange = (frame: number) => Number.isSafeInteger(frame) && frame >= 0 && frame < total;
  const shotAt = (frame: number) => shots.find(shot => frame >= shot.startFrame && frame < shot.endFrame);

  for (const issue of validateVisualProduction(production).issues)
    report(PRODUCTION_PRINCIPLE[issue.code], "error", `production-${issue.code}`, issue.message, { path: `production.${issue.path}` });

  // 1 — purpose before decoration.
  for (const [index, shot] of shots.entries())
    if (!MOTION_PURPOSES.includes(shot.purpose))
      report(1, "error", "shot-purpose-missing", `Shot "${shot.id}" needs a purpose (${MOTION_PURPOSES.join(", ")}).`,
        { path: `production.shots[${index}].purpose`, targetId: shot.id });
  const lengths = new Set(shots.map(shot => shot.endFrame - shot.startFrame));
  if (shots.length >= 4 && lengths.size === 1)
    report(1, "warning", "uniform-cut-cadence",
      "Every shot has the same length. Cut on information changes, not a fixed cadence.");

  // 3 — determinism declarations.
  if (!Number.isSafeInteger(fps.num) || !Number.isSafeInteger(fps.den) || fps.num <= 0 || fps.den <= 0)
    report(3, "error", "fps-invalid", "Declare FPS as positive integers {num, den}.", { path: "fps" });
  const cueIds = new Set<string>();
  for (const [index, cue] of (manifest.cues ?? []).entries()) {
    if (!cue.id.trim() || cueIds.has(cue.id) || !inRange(cue.frame))
      report(3, "error", "cue-invalid", `Cue "${cue.id}" needs a unique ID and an integer frame inside the production.`,
        { path: `cues[${index}]`, targetId: cue.id, frame: cue.frame });
    cueIds.add(cue.id);
  }
  for (const [index, effect] of (manifest.seededEffects ?? []).entries())
    if (!Number.isSafeInteger(effect.seed))
      report(3, "error", "effect-unseeded", `Effect "${effect.id}" needs an integer seed.`,
        { path: `seededEffects[${index}]`, targetId: effect.id });
  for (const [index, asset] of (manifest.assets ?? []).entries()) {
    if (!asset.sha256 || !SHA256.test(asset.sha256))
      report(3, "error", "asset-hash-missing", `Asset "${asset.id}" needs a SHA-256 so renders are reproducible.`,
        { path: `assets[${index}].sha256`, targetId: asset.id });
    if (!asset.licenseRef?.trim())
      report(8, "error", "asset-license-missing", `Asset "${asset.id}" has no licence reference; do not substitute unlicensed media.`,
        { path: `assets[${index}].licenseRef`, targetId: asset.id });
  }

  // 5 — identity survives continuous shots unless explicitly released or cut.
  for (let index = 1; index < shots.length; index += 1) {
    const prev = shots[index - 1], shot = shots[index];
    if ((shot.entry ?? "continuous") === "cut") continue;
    const kept = new Set([...subjectsOf(shot), ...(prev.releasedSubjectIds ?? [])]);
    for (const id of subjectsOf(prev)) if (!kept.has(id))
      report(5, "error", "identity-lost", `Subject "${id}" disappears entering "${shot.id}" without a cut or release.`,
        { path: `production.shots[${index}]`, targetId: id, frame: shot.startFrame });
  }

  // 6 — open on meaning, pay off the hook, hold what matters.
  if ("delayedReason" in manifest.opening) {
    if (!manifest.opening.delayedReason.trim())
      report(6, "error", "opening-unjustified", "A delayed opening needs a stated reason.", { path: "opening" });
  } else if (!manifest.opening.visibleSubjectIds.length)
    report(6, "error", "opening-empty", "Declare the subjects visible at frame 0, or justify a delayed opening.", { path: "opening" });
  if (manifest.hook) {
    const hook = shots.find(shot => shot.id === manifest.hook!.shotId);
    const payoff = shots.find(shot => shot.id === manifest.hook!.payoffShotId);
    if (!hook || !payoff || payoff.startFrame <= hook.startFrame)
      report(6, "error", "hook-payoff-missing", `Hook "${manifest.hook.claimId}" must point to a payoff shot after the hook.`, { path: "hook" });
    else if (payoff.purpose !== "deliver-payoff")
      report(6, "warning", "hook-payoff-purpose", `Payoff shot "${payoff.id}" is not declared as deliver-payoff.`, { targetId: payoff.id });
  }
  for (const [index, hold] of (manifest.criticalHolds ?? []).entries())
    if (!inRange(hold.startFrame) || hold.endFrame > total || hold.endFrame - hold.startFrame < hold.minFrames)
      report(6, "error", "hold-too-short", `"${hold.id}" must stay visible for ${hold.minFrames} frames inside the production.`,
        { path: `criticalHolds[${index}]`, targetId: hold.id, frame: hold.startFrame });
  for (const [index, caption] of (manifest.captions ?? []).entries()) {
    const need = readableCaptionFrames(caption.text, fps, options.reading);
    if (!inRange(caption.startFrame) || caption.endFrame > total || caption.endFrame <= caption.startFrame)
      report(6, "error", "caption-invalid", `Caption "${caption.id}" needs a frame interval inside the production.`,
        { path: `captions[${index}]`, targetId: caption.id });
    else if (caption.endFrame - caption.startFrame < need)
      report(6, "warning", "caption-hold-short", `Caption "${caption.id}" shows for ${caption.endFrame - caption.startFrame} frames; reading needs about ${need}.`,
        { path: `captions[${index}]`, targetId: caption.id, frame: caption.startFrame });
  }

  // 7 — independently authored outputs, measured text, accessibility.
  if (!manifest.outputs.length) report(7, "error", "outputs-missing", "Declare at least one output profile.", { path: "outputs" });
  const portrait = manifest.outputs.some(o => o.height > o.width), landscape = manifest.outputs.some(o => o.width > o.height);
  if (manifest.outputs.length && (!portrait || !landscape))
    report(7, "warning", "aspect-missing", `No independently authored ${portrait ? "landscape" : "portrait"} output is declared.`);
  for (const [outIndex, output] of manifest.outputs.entries()) {
    const at = `outputs[${outIndex}]`, base = { targetId: output.id, path: at };
    if (!(output.width > 0 && output.height > 0)) { report(7, "error", "output-invalid", `Output "${output.id}" needs a positive raster.`, base); continue; }
    if (output.composition !== "authored")
      report(7, "error", "blind-crop", `Output "${output.id}" is cropped from another output; compose it independently.`, base);
    if (!output.samples.length) report(7, "error", "output-unsampled", `Output "${output.id}" has no measured frame samples.`, base);
    for (const [sampleIndex, sample] of output.samples.entries()) {
      const where = { ...base, path: `${at}.samples[${sampleIndex}]`, frame: sample.frame };
      if (!inRange(sample.frame)) { report(7, "error", "sample-out-of-range", `Sample frame ${sample.frame} is outside the production.`, where); continue; }
      for (const id of shotAt(sample.frame)?.criticalSubjects ?? [])
        if (!sample.subjects[id] || !onScreen(sample.subjects[id], output.width, output.height))
          report(5, "error", "subject-unframed", `"${output.id}" does not frame critical subject "${id}" at frame ${sample.frame}.`, { ...where, targetId: id });
      for (const [id, rect] of Object.entries(sample.subjects))
        if (output.exclusionZones.some(zone => intersects(rect, zone.rect)))
          report(7, "warning", "subject-in-exclusion-zone", `Subject "${id}" overlaps reserved UI in "${output.id}".`, { ...where, targetId: id });
      for (const [id, rect] of Object.entries(sample.text ?? {})) {
        if (!inside(rect, output.width, output.height))
          report(7, "error", "text-out-of-frame", `Text "${id}" leaves the "${output.id}" raster.`, { ...where, targetId: id });
        const zone = output.exclusionZones.find(item => intersects(rect, item.rect));
        if (zone) report(7, "error", "text-in-exclusion-zone", `Text "${id}" overlaps "${zone.id}" in "${output.id}".`, { ...where, targetId: id });
      }
    }
    if (!("delayedReason" in manifest.opening)) {
      const first = output.samples.find(sample => sample.frame === 0);
      for (const id of manifest.opening.visibleSubjectIds)
        if (!first?.subjects[id] || !onScreen(first.subjects[id], output.width, output.height))
          report(6, "error", "first-frame-subject-missing", `"${output.id}" does not show "${id}" at frame 0.`, { ...base, frame: 0, targetId: id });
    }
    for (const caption of manifest.captions ?? [])
      if (!output.samples.some(s => s.frame >= caption.startFrame && s.frame < caption.endFrame && s.text?.[caption.id]))
        report(7, "error", "caption-unmeasured", `Caption "${caption.id}" has no measured bounds in "${output.id}".`, { ...base, targetId: caption.id });
  }
  if (manifest.accessibility.reducedMotion === "none")
    report(7, "error", "reduced-motion-missing", "Provide a reduced-motion variant or static equivalent.", { path: "accessibility.reducedMotion" });
  if (!manifest.accessibility.textSummary.trim())
    report(7, "error", "text-summary-missing", "Provide a truthful text summary of what the animation shows.", { path: "accessibility.textSummary" });

  // 8 — honest capabilities, rights and data.
  const available = options.availableCapabilities ? new Set(options.availableCapabilities) : undefined;
  for (const [index, need] of manifest.requirements.entries()) {
    const where = { path: `requirements[${index}]`, capability: need.capability };
    if (!available)
      report(8, "warning", "capability-unverified", `"${need.capability}" (${need.kind}) is not checked against an adapter.`, where);
    else if (!available.has(need.capability)) {
      if (need.fallback) report(8, "warning", "capability-fallback", `"${need.capability}" is missing; using accepted fallback "${need.fallback}".`, { ...where, fallback: need.fallback });
      else report(8, "error", "capability-missing", `The adapter lacks "${need.capability}" (${need.kind}) and no fallback was accepted.`, where);
    }
  }
  for (const [index, fact] of (manifest.facts ?? []).entries()) {
    const where = { path: `facts[${index}]`, targetId: fact.id };
    if (!fact.illustrative && !fact.sourceId?.trim())
      report(8, "error", "fact-unsourced", `Fact "${fact.id}" has no source; supply one or label it illustrative.`, where);
    if (!fact.unit.trim()) report(8, "error", "fact-unit-missing", `Fact "${fact.id}" needs an explicit unit (use "count" for counts).`, where);
  }

  // 9 — automated checks never certify; human review is reported until recorded.
  const reviewed = new Set(manifest.visualReview?.outputIds ?? []);
  const unreviewed = manifest.outputs.filter(output => !reviewed.has(output.id)).map(output => output.id);
  if (!manifest.visualReview?.reviewer.trim() || unreviewed.length)
    report(9, "warning", "visual-review-pending", `Human review of exported frames is not recorded${unreviewed.length ? ` for ${unreviewed.join(", ")}` : ""}.`);

  const sorted = sortDiagnostics(diagnostics) as PrincipleDiagnostic[];
  return { ok: !sorted.some(item => item.severity === "error"), diagnostics: sorted, coverage: PRINCIPLE_COVERAGE };
}

/** Principle 4: a reusable component is demonstrated in at least three distinct subject areas. */
export function inspectComponentReuse(component: { id: string; demonstrations: readonly { subjectArea: string; exampleRef: string }[] }) {
  const areas = new Set(component.demonstrations.filter(d => d.exampleRef.trim())
    .map(d => d.subjectArea.trim().toLowerCase()).filter(Boolean));
  const diagnostics: PrincipleDiagnostic[] = areas.size >= 3 ? [] : [{
    principle: 4, severity: "error", code: "reuse-under-demonstrated", targetId: component.id,
    message: `"${component.id}" is demonstrated in ${areas.size} subject area(s); show at least three with example references.`,
  }];
  return { ok: !diagnostics.length, areas: [...areas], diagnostics };
}

/** Principle 3: frames evaluated in seeded random order must equal forward play.
 * `createEvaluator` must return a FRESH evaluator so history-dependent state is exposed.
 */
export function inspectSeekParity<T>(createEvaluator: () => (frame: number) => T, options: {
  durationFrames: number; frames?: readonly number[]; sampleCount?: number; seed?: number; tolerance?: number;
}) {
  const { durationFrames } = options, tolerance = options.tolerance ?? 1e-9;
  if (!Number.isSafeInteger(durationFrames) || durationFrames <= 0) throw new Error("Seek parity needs a positive integer durationFrames.");
  const count = Math.min(durationFrames, options.sampleCount ?? 64);
  const frames = [...new Set(options.frames ?? Array.from({ length: count }, (_, i) =>
    count === 1 ? 0 : Math.round(i * (durationFrames - 1) / (count - 1))))].sort((a, b) => a - b);
  if (frames.some(frame => !Number.isSafeInteger(frame) || frame < 0 || frame >= durationFrames))
    throw new Error("Seek parity frames must be integers inside the duration.");
  const forward = createEvaluator(), expected = new Map<number, T>(), wanted = new Set(frames);
  for (let frame = 0; frame <= frames[frames.length - 1]; frame += 1) {
    const value = forward(frame);
    if (wanted.has(frame)) expected.set(frame, value);
  }
  let state = (options.seed ?? 1) >>> 0;
  const random = () => { state = (state + 0x6d2b79f5) >>> 0; let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const order = [...frames];
  for (let i = order.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const seek = createEvaluator(), diagnostics: PrincipleDiagnostic[] = [];
  for (const frame of order) {
    const path = difference(expected.get(frame), seek(frame), "state", tolerance);
    if (path !== undefined) diagnostics.push({ principle: 3, severity: "error", code: "seek-parity-mismatch", frame, path,
      message: `Seeking to frame ${frame} differs from forward play at ${path}; remove playback-history or wall-clock state.` });
  }
  return { ok: !diagnostics.length, frames, order, diagnostics: diagnostics.sort((a, b) => a.frame! - b.frame!) };
}

function difference(a: unknown, b: unknown, path: string, tolerance: number): string | undefined {
  if (typeof a === "number" && typeof b === "number")
    return (Number.isNaN(a) && Number.isNaN(b)) || Math.abs(a - b) <= tolerance || a === b ? undefined : path;
  if (a === b) return undefined;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path}.length`;
    for (let i = 0; i < a.length; i += 1) { const found = difference(a[i], b[i], `${path}[${i}]`, tolerance); if (found) return found; }
    return undefined;
  }
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of [...keys].sort()) {
      const found = difference((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`, tolerance);
      if (found) return found;
    }
    return undefined;
  }
  return path;
}
