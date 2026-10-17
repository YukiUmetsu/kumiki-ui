import { forwardRef, useMemo } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { MotionTimeline } from "./types";
import { evaluateCamera } from "./camera";
import { usePrefersReducedMotion } from "./react";

export interface CameraStageProps extends Omit<ComponentPropsWithoutRef<"svg">, "width" | "height"> {
  timeline: MotionTimeline;
  frame: number;
  cameraId?: string;
  /** Fixed output dimensions in design pixels; CSS scales the entire output. */
  width: number;
  height: number;
  /** SVG children in world coordinates, transformed by the camera. */
  children?: ReactNode;
  /** SVG children in output coordinates, unaffected by camera movement. */
  overlay?: ReactNode;
  background?: string;
  ariaLabel?: string;
  reducedMotion?: boolean;
}

/** SVG camera viewport. No clock, DOM measurements, global CSS, or renderer dependency. */
export const CameraStage = forwardRef<SVGSVGElement, CameraStageProps>(function CameraStage({
  timeline, frame, cameraId = "camera", width, height, children, overlay,
  background = "transparent", ariaLabel = "Camera scene", reducedMotion, style, ...props
}, ref) {
  const prefersReduced = usePrefersReducedMotion();
  const resolvedFrame = (reducedMotion ?? prefersReduced) ? timeline.durationFrames - 1 : frame;
  const { matrix } = useMemo(
    () => evaluateCamera(timeline, resolvedFrame, { width, height }, cameraId),
    [timeline, resolvedFrame, width, height, cameraId],
  );
  const transform = `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`;
  return (
    <svg
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      data-km-camera-stage=""
      data-camera-frame={resolvedFrame}
      style={{ display: "block", width: "100%", aspectRatio: `${width} / ${height}`, overflow: "hidden", background, ...style }}
      {...props}
    >
      <g data-km-camera-world="" transform={transform}>{children}</g>
      {overlay != null ? <g data-km-camera-overlay="">{overlay}</g> : null}
    </svg>
  );
});
