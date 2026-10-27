import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { compileFollowSubjectFrame } from "./follow-subject-through-sections";
import type { FollowSubjectSpec, JourneyFrame } from "./follow-subject-through-sections";

export interface FollowSubjectThroughSectionsProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  spec: FollowSubjectSpec;
  /** Host-controlled absolute frame; this component never starts its own clock. */
  frame: number;
  /** Overrides spec.reducedMotion without mutating the source scene. */
  reducedMotion?: boolean;
  /**
   * Optional renderer slot for an animated character, frame-addressable sprite,
   * or Three.js/canvas composite. The serializable spec retains a static asset
   * reference for fallback and provenance; no runtime React nodes are persisted.
   */
  renderSubject?: (state: JourneyFrame) => ReactNode;
}

/**
 * Stacks replaceable scenery layers behind a persistent subject. For capture,
 * wrap in the existing VideoExportStage and supply its onSeek/frame callbacks.
 * The host is responsible for image preloading and the licensed asset manifest.
 */
export const FollowSubjectThroughSections = forwardRef<HTMLDivElement, FollowSubjectThroughSectionsProps>(
  function FollowSubjectThroughSections({ spec, frame, reducedMotion, renderSubject, style, className, ...props }, ref) {
    const effective = reducedMotion === undefined ? spec : { ...spec, reducedMotion };
    const state = compileFollowSubjectFrame(effective, frame);
    const { subject } = spec;
    // Composite whole environments together rather than crossfading their
    // separate layers (which would leak the new sky through old foreground).
    const groups: Array<{ id: string; opacity: number; layers: typeof state.layers }> = [];
    for (const layer of state.layers) {
      let group = groups.find(item => item.id === layer.sectionId);
      if (!group) {
        group = { id: layer.sectionId, opacity: layer.groupOpacity, layers: [] };
        groups.push(group);
      }
      group.layers.push(layer);
    }
    const layerStyle = (layer: (typeof state.layers)[number]): CSSProperties => ({
      position: "absolute",
      inset: 0,
      display: "block",
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "center",
      opacity: layer.layerOpacity,
      transform: `translate3d(${layer.translatePercent}%, 0, 0) scale(${layer.scale})`,
      transformOrigin: "center center",
      pointerEvents: "none",
    });
    return <div
      {...props}
      ref={ref}
      className={className}
      data-km-follow-subject-scene=""
      data-km-frame={state.frame}
      data-km-section={state.activeSectionId}
      data-km-subject-id={state.subjectId}
      role={props.role ?? "img"}
      aria-label={props["aria-label"] ?? subject.alt}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${spec.width ?? 1920} / ${spec.height ?? 1080}`,
        overflow: "hidden",
        isolation: "isolate",
        background: spec.backgroundColor ?? "transparent",
        ...style,
      }}
    >
      {groups.map(group => <div key={group.id} aria-hidden="true" data-km-environment={group.id}
        style={{ position: "absolute", inset: 0, opacity: group.opacity, pointerEvents: "none" }}>
        {group.layers.map(layer => <img
          key={layer.key}
          data-km-asset-id={layer.assetId}
          src={layer.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={layerStyle(layer)}
        />)}
      </div>)}
      <div
        data-km-subject={subject.id}
        aria-hidden="true"
        style={{
          position: "absolute", display: "block",
          left: `${state.subject.x}%`, top: `${state.subject.y}%`,
          width: `${subject.widthPercent ?? 18}%`,
          transform: `translate(-50%, -50%) rotate(${state.subject.rotate}deg) scale(${state.subject.scale})`,
          transformOrigin: "center center", pointerEvents: "none",
        }}
      >
        {renderSubject
          ? renderSubject(state)
          : <img
              data-km-asset-id={subject.id}
              src={subject.src}
              alt=""
              draggable={false}
              style={{ display: "block", width: "100%", height: "auto", maxWidth: "none" }}
            />}
      </div>
    </div>;
  },
);
