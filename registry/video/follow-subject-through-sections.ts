/**
 * Follow subject through sections (FS1): frame-addressable, renderer-independent
 * layout states. An editorial travel sequence, not a ProcessJourney graph route.
 * All positions and parallax offsets are percentage based for 16:9 and 9:16.
 */
export interface JourneyLayer {
  id: string;
  src: string;
  /** Relative parallax depth; 1 travels through 12% of the viewport. */
  depth?: number;
  opacity?: number;
  licenseRef?: string;
  revision?: string;
}
export interface JourneySection {
  id: string;
  frames: number;
  layers: JourneyLayer[];
  /** Blend occurs at the beginning of this section; its frames are not extended. */
  transitionFrames?: number;
  transition?: "crossfade" | "cut";
}
export interface JourneySubjectKeyframe {
  /** Absolute composition frame. */
  frame: number;
  /** Center of subject in percent of the output stage. */
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
}
export interface FollowSubjectSpec {
  id: string;
  subject: {
    id: string;
    src: string;
    alt: string;
    widthPercent?: number;
    x?: number;
    y?: number;
    /** Optional persistent path across all sections, independent of scenery. */
    path?: JourneySubjectKeyframe[];
    licenseRef?: string;
    revision?: string;
  };
  sections: JourneySection[];
  width?: number;
  height?: number;
  fps?: { num: number; den: number };
  reducedMotion?: boolean;
  backgroundColor?: string;
}
export interface JourneyVisibleLayer {
  key: string;
  src: string;
  opacity: number;
  translatePercent: number;
  scale: number;
  assetId: string;
}
export interface JourneyFrame {
  frame: number;
  durationFrames: number;
  activeSectionId: string;
  sectionFrame: number;
  layers: JourneyVisibleLayer[];
  subjectId: string;
  subject: { x: number; y: number; scale: number; rotate: number };
}
const bounded = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const safe = (value: number, min: number, max: number) =>
  Number.isFinite(value) && value >= min && value <= max;
const integer = (value: number, min: number) => Number.isSafeInteger(value) && value >= min;

export function validateFollowSubject(spec: FollowSubjectSpec): void {
  if (!spec || !spec.id?.trim() || !spec.subject?.id?.trim() ||
      !spec.subject.src?.trim() || !spec.subject.alt?.trim()) {
    throw new Error("FollowSubject requires a scene ID and identified, described subject asset.");
  }
  if (spec.width !== undefined && !integer(spec.width, 2) ||
      spec.height !== undefined && !integer(spec.height, 2)) {
    throw new Error("Stage width and height must be integers >= 2.");
  }
  if (spec.fps && (!integer(spec.fps.num, 1) || !integer(spec.fps.den, 1) ||
      !safe(spec.fps.num / spec.fps.den, 1, 120))) {
    throw new Error("FPS must be a rational value between 1 and 120.");
  }
  if (!safe(spec.subject.widthPercent ?? 18, 0.1, 100) ||
      !safe(spec.subject.x ?? 50, 0, 100) || !safe(spec.subject.y ?? 50, 0, 100)) {
    throw new Error("Subject position and width must be within the stage.");
  }
  if (!Array.isArray(spec.sections) || spec.sections.length === 0) {
    throw new Error("FollowSubject requires at least one section.");
  }
  const seen = new Set<string>();
  let duration = 0;
  for (const section of spec.sections) {
    if (!section?.id?.trim() || seen.has(section.id)) throw new Error("Section IDs must be unique and nonempty.");
    seen.add(section.id);
    if (!integer(section.frames, 1)) throw new Error("Section frames must be positive integers.");
    duration += section.frames;
    if (!Number.isSafeInteger(duration)) throw new Error("Composition exceeds safe frame range.");
    const n = section.transitionFrames ?? 0;
    if (!integer(n, 0) || n >= section.frames) throw new Error("Transition must fit inside its section.");
    if (section.transition && !["crossfade", "cut"].includes(section.transition)) {
      throw new Error("Unsupported transition type.");
    }
    if (!Array.isArray(section.layers) || !section.layers.length) {
      throw new Error("Every section needs background layers.");
    }
    const layerIds = new Set<string>();
    for (const layer of section.layers) {
      if (!layer?.id?.trim() || layerIds.has(layer.id) || !layer.src?.trim()) {
        throw new Error("Layers need unique IDs and asset URLs within each section.");
      }
      if (!safe(layer.depth ?? 0, -3, 3) || !safe(layer.opacity ?? 1, 0, 1)) {
        throw new Error("Layer depth must be -3..3 and opacity 0..1.");
      }
      layerIds.add(layer.id);
    }
  }
  let previous = -1;
  for (const key of spec.subject.path ?? []) {
    if (!integer(key.frame, 0) || key.frame >= duration || key.frame <= previous ||
        !safe(key.x, 0, 100) || !safe(key.y, 0, 100) ||
        !safe(key.scale ?? 1, 0.1, 4) || !Number.isFinite(key.rotate ?? 0)) {
      throw new Error("Subject path needs ascending in-range frames and valid transforms.");
    }
    previous = key.frame;
  }
}
function subjectAt(spec: FollowSubjectSpec, frame: number): JourneyFrame["subject"] {
  const base = { x: spec.subject.x ?? 50, y: spec.subject.y ?? 50, scale: 1, rotate: 0 };
  const keys = spec.subject.path;
  if (spec.reducedMotion || !keys?.length) return base;
  const first = keys[0];
  if (frame <= first.frame) return { x: first.x, y: first.y, scale: first.scale ?? 1, rotate: first.rotate ?? 0 };
  const last = keys[keys.length - 1];
  if (frame >= last.frame) return { x: last.x, y: last.y, scale: last.scale ?? 1, rotate: last.rotate ?? 0 };
  const upper = keys.findIndex(k => k.frame >= frame);
  const a = keys[upper - 1], b = keys[upper];
  const t = (frame - a.frame) / (b.frame - a.frame);
  const mix = (v: number, w: number) => v + (w - v) * t;
  return {
    x: mix(a.x, b.x), y: mix(a.y, b.y),
    scale: mix(a.scale ?? 1, b.scale ?? 1), rotate: mix(a.rotate ?? 0, b.rotate ?? 0),
  };
}

/** Evaluation does not depend on previously rendered frames or any clock. */
export function compileFollowSubjectFrame(spec: FollowSubjectSpec, frame: number): JourneyFrame {
  validateFollowSubject(spec);
  if (!Number.isSafeInteger(frame)) throw new Error("Frame must be a safe integer.");
  const durationFrames = spec.sections.reduce((sum, section) => sum + section.frames, 0);
  const at = bounded(frame, 0, durationFrames - 1);
  let start = 0, index = 0;
  while (index < spec.sections.length - 1 && at >= start + spec.sections[index].frames) {
    start += spec.sections[index].frames;
    index++;
  }
  const section = spec.sections[index], sectionFrame = at - start;
  const transitionLength = spec.reducedMotion || section.transition === "cut" ? 0 : section.transitionFrames ?? 0;
  const incoming = index === 0 || transitionLength < 2 ? 1 : bounded(sectionFrame / (transitionLength - 1), 0, 1);
  const layers: JourneyVisibleLayer[] = [];
  const push = (s: JourneySection, alpha: number, progress: number) => {
    for (const layer of s.layers) {
      const travel = spec.reducedMotion ? 0 : 12 * (layer.depth ?? 0);
      layers.push({
        key: s.id + "/" + layer.id,
        assetId: s.id + "/" + layer.id,
        src: layer.src,
        opacity: alpha * (layer.opacity ?? 1),
        // Centered movement so overscan covers both beginning and end.
        translatePercent: travel * (0.5 - progress),
        scale: 1 + Math.abs(travel) / 100 + (travel === 0 ? 0 : 0.02),
      });
    }
  };
  if (incoming < 1 && index > 0) push(spec.sections[index - 1], 1 - incoming, 1);
  push(section, incoming, sectionFrame / Math.max(1, section.frames - 1));
  return {
    frame: at, durationFrames, activeSectionId: section.id, sectionFrame, layers,
    subjectId: spec.subject.id, subject: subjectAt(spec, at),
  };
}
