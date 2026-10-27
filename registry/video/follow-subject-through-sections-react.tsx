import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { compileFollowSubjectFrame } from "./follow-subject-through-sections";
import type { FollowSubjectSpec } from "./follow-subject-through-sections";

export interface FollowSubjectThroughSectionsProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  spec: FollowSubjectSpec;
  /** Host-controlled absolute frame; this component never starts its own clock. */
  frame: number;
  /** Overrides spec.reducedMotion without mutating the source scene. */
  reducedMotion?: boolean;
}

/**
 * Stacks replaceable scenery layers behind a persistent subject. For capture,
 * wrap in the existing VideoExportStage and supply its onSeek/frame callbacks.
 * The host is responsible for image preloading and the licensed asset manifest.
 */
export const FollowSubjectThroughSections = forwardRef<HTMLDivElement, FollowSubjectThroughSectionsProps>(
  function FollowSubjectThroughSections({ spec, frame, reducedMotion, style, className, ...props }, ref) {
    const effective = reducedMotion === undefined ? spec : { ...spec, reducedMotion };
    const state = compileFollowSubjectFrame(effective, frame);
    const { subject } = spec;
    const layerStyle = (layer: (typeof state.layers)[number]): CSSProperties => ({
      position: "absolute",
      inset: 0,
      display: "block",
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "center",
      opacity: layer.opacity,
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
        background: spec.backgroundColor ?? "var(--km-surface-canvas, #151923)",
        ...style,
      }}
    >
      {state.layers.map(layer => <img
        key={layer.key}
        data-km-asset-id={layer.assetId}
        src={layer.src}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={layerStyle(layer)}
      />)}
      <img
        data-km-asset-id={subject.id}
        data-km-subject={subject.id}
        src={subject.src}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute", display: "block",
          left: `${state.subject.x}%`, top: `${state.subject.y}%`,
          width: `${subject.widthPercent ?? 18}%`,
          height: "auto", maxWidth: "none",
          transform: `translate(-50%, -50%) rotate(${state.subject.rotate}deg) scale(${state.subject.scale})`,
          transformOrigin: "center center",
          objectFit: "contain", pointerEvents: "none",
        }}
      />
    </div>;
  },
);
