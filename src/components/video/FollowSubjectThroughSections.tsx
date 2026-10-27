import * as React from "react";

/** A frame-addressable editorial scene, independent of wall-clock or render history. */
export interface JourneyLayer {
  id: string;
  src: string;
  /** Relative travel in pixels across a section. 0 = static, 1 = 100px. */
  depth?: number;
  opacity?: number;
}

export interface JourneySection {
  id: string;
  frames: number;
  layers: JourneyLayer[];
  /** Number of frames used to blend into this section. */
  transitionFrames?: number;
  transition?: "crossfade" | "cut";
}

export interface FollowSubjectSpec {
  id: string;
  subject: { id: string; src: string; alt: string; widthPercent?: number; x?: number; y?: number };
  sections: JourneySection[];
  width?: number;
  height?: number;
  reducedMotion?: boolean;
}

export interface JourneyVisibleLayer {
  key: string;
  src: string;
  opacity: number;
  translateX: number;
  scale: number;
}
export interface JourneyFrame {
  frame: number;
  durationFrames: number;
  activeSectionId: string;
  layers: JourneyVisibleLayer[];
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

export function validateFollowSubject(spec: FollowSubjectSpec): void {
  if (!spec?.id || !spec.subject?.id || !spec.subject.src || !spec.subject.alt) {
    throw new Error("Scene and subject need stable IDs, a subject asset and alt text");
  }
  if (!spec.sections?.length) throw new Error("At least one section is required");
  const ids = new Set<string>();
  for (const section of spec.sections) {
    if (!section.id || ids.has(section.id)) throw new Error("Section IDs must be nonempty and unique");
    ids.add(section.id);
    if (!Number.isSafeInteger(section.frames) || section.frames < 1) throw new Error("Section frames must be positive integers");
    if (!section.layers.length) throw new Error("Every section requires at least one background layer");
    if (!Number.isSafeInteger(section.transitionFrames ?? 0) || (section.transitionFrames ?? 0) < 0 || (section.transitionFrames ?? 0) >= section.frames) {
      throw new Error("Transition must fit inside its section");
    }
    const layers = new Set<string>();
    for (const layer of section.layers) {
      if (!layer.id || layers.has(layer.id) || !layer.src) throw new Error("Layer IDs must be unique per section and have an asset");
      if (layer.depth !== undefined && !Number.isFinite(layer.depth)) throw new Error("Depth must be finite");
      if (layer.opacity !== undefined && (!Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1)) throw new Error("Opacity must be in [0, 1]");
      layers.add(layer.id);
    }
  }
}

export function compileFollowSubjectFrame(spec: FollowSubjectSpec, frame: number): JourneyFrame {
  validateFollowSubject(spec);
  if (!Number.isSafeInteger(frame)) throw new Error("Frame must be an integer");
  const durationFrames = spec.sections.reduce((sum, s) => sum + s.frames, 0);
  const at = clamp(frame, 0, durationFrames - 1);
  let start = 0;
  let index = 0;
  while (index < spec.sections.length - 1 && at >= start + spec.sections[index].frames) {
    start += spec.sections[index].frames;
    index++;
  }
  const section = spec.sections[index];
  const localFrame = at - start;
  const transition = section.transition === "cut" ? 0 : (section.transitionFrames ?? 0);
  const incoming = index > 0 && transition > 0 ? clamp((localFrame + 1) / transition, 0, 1) : 1;
  const layers: JourneyVisibleLayer[] = [];
  const add = (s: JourneySection, weight: number, progress: number) => {
    for (const layer of s.layers) {
      const depth = spec.reducedMotion ? 0 : (layer.depth ?? 0);
      const travel = depth * 100;
      layers.push({
        key: s.id + "/" + layer.id,
        src: layer.src,
        opacity: weight * (layer.opacity ?? 1),
        translateX: -travel * progress,
        scale: 1 + Math.abs(travel) / 1000,
      });
    }
  };
  if (incoming < 1) add(spec.sections[index - 1], 1 - incoming, 1);
  add(section, incoming, spec.reducedMotion ? 0 : localFrame / Math.max(1, section.frames - 1));
  return { frame: at, durationFrames, activeSectionId: section.id, layers };
}

export interface FollowSubjectThroughSectionsProps {
  spec: FollowSubjectSpec;
  /** Frame index supplied by the host video renderer or interactive preview. */
  frame: number;
  className?: string;
  style?: React.CSSProperties;
}

export function FollowSubjectThroughSections({ spec, frame, className, style }: FollowSubjectThroughSectionsProps) {
  const state = compileFollowSubjectFrame(spec, frame);
  const width = spec.width ?? 1920;
  const height = spec.height ?? 1080;
  const subject = spec.subject;
  return (
    <div className={className} data-scene-id={spec.id} data-section-id={state.activeSectionId}
      role="img" aria-label={subject.alt}
      style={{ position: "relative", overflow: "hidden", width: "100%", aspectRatio: `${width} / ${height}`, isolation: "isolate", ...style }}>
      {state.layers.map((layer) => (
        <div key={layer.key} aria-hidden="true" style={{
          position: "absolute", inset: 0, opacity: layer.opacity,
          backgroundImage: `url("${layer.src.replaceAll('"', '%22')}")`,
          backgroundSize: "cover", backgroundPosition: "center",
          transform: `translateX(${layer.translateX}px) scale(${layer.scale})`,
        }} />
      ))}
      <img src={subject.src} alt="" aria-hidden="true" style={{
        position: "absolute", left: `${subject.x ?? 50}%`, top: `${subject.y ?? 50}%`,
        width: `${subject.widthPercent ?? 18}%`, height: "auto",
        objectFit: "contain", transform: "translate(-50%, -50%)",
      }} />
    </div>
  );
}
