import { createContext, forwardRef, useContext, useMemo } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { EvaluationResult, MotionTimeline, Vec2 } from "./types";
import { evaluateTimeline, outputKey } from "./timeline";
import { usePrefersReducedMotion } from "./react";

const RevealContext = createContext<EvaluationResult | null>(null);

export interface ProgressiveRevealProps extends ComponentPropsWithoutRef<"div"> {
  timeline: MotionTimeline;
  frame: number;
  reducedMotion?: boolean;
}

/** One evaluation for any number of independently placed DOM or SVG reveal items. */
export const ProgressiveReveal = forwardRef<HTMLDivElement, ProgressiveRevealProps>(function ProgressiveReveal({
  timeline, frame, reducedMotion, children, ...props
}, ref) {
  const prefersReduced = usePrefersReducedMotion();
  const resolvedFrame = (reducedMotion ?? prefersReduced) ? timeline.durationFrames - 1 : frame;
  const evaluation = useMemo(() => evaluateTimeline(timeline, resolvedFrame), [timeline, resolvedFrame]);
  return <RevealContext.Provider value={evaluation}><div ref={ref} data-km-progressive-reveal="" {...props}>{children}</div></RevealContext.Provider>;
});

export function useRevealState(targetId: string) {
  const evaluation = useContext(RevealContext);
  if (!evaluation) throw new Error("Reveal items require a ProgressiveReveal parent. Wrap the scene once and pass its timeline and frame.");
  const opacity = evaluation.samples[outputKey(targetId, "opacity")]?.value;
  const progress = evaluation.samples[outputKey(targetId, "revealProgress")]?.value;
  const position = evaluation.samples[outputKey(targetId, "position")]?.value;
  if (typeof opacity !== "number" || typeof progress !== "number") {
    throw new Error(`Reveal target "${targetId}" is missing. Use an ID authored by createRevealTimeline.`);
  }
  const offset: Vec2 = typeof position === "object" && position !== null && "x" in position && "y" in position
    ? { x: position.x, y: position.y } : { x: 0, y: 0 };
  const phase = opacity <= 0 ? "hidden" : progress < 1 ? "entering" : opacity < 1 ? "subdued" : "visible";
  return { opacity, progress, offset, phase, interactive: progress >= 1 && opacity > 0 };
}

export interface RevealItemProps extends ComponentPropsWithoutRef<"div"> { targetId: string }

export const RevealItem = forwardRef<HTMLDivElement, RevealItemProps>(function RevealItem({ targetId, style, children, ...props }, ref) {
  const state = useRevealState(targetId);
  const unavailable = !state.interactive;
  return <div {...props} ref={ref} data-km-reveal-item={targetId} data-reveal-phase={state.phase}
    {...(unavailable ? { inert: "", "aria-hidden": true as const } : {})}
    style={{ ...style, opacity: state.opacity, transform: `translate(${state.offset.x}px, ${state.offset.y}px)`, visibility: state.phase === "hidden" ? "hidden" : undefined, pointerEvents: unavailable ? "none" : style?.pointerEvents }}>
    {children}
  </div>;
});

export interface RevealLayerProps extends ComponentPropsWithoutRef<"g"> { targetId: string; children?: ReactNode }

/** SVG composition slot; place static positioning on a nested group. */
export const RevealLayer = forwardRef<SVGGElement, RevealLayerProps>(function RevealLayer({ targetId, children, ...props }, ref) {
  const state = useRevealState(targetId);
  return <g {...props} ref={ref} data-km-reveal-layer={targetId} data-reveal-phase={state.phase}
    opacity={state.opacity} transform={`translate(${state.offset.x} ${state.offset.y})`}
    visibility={state.phase === "hidden" ? "hidden" : undefined}
    {...(!state.interactive ? { inert: "", "aria-hidden": true as const } : {})}>{children}</g>;
});
