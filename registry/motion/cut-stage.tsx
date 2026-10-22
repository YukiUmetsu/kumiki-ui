import { forwardRef, useId, useMemo } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { evaluateCutPlan } from "./cut-director";
import type { CompiledCutPlan, CutEvaluationOptions, CutFrame, CutLayer } from "./cut-director";
import { usePrefersReducedMotion } from "./react";
import { SvgMaskDefinition } from "./svg-mask";
import type { Rect } from "./types";

export interface CutStageProps extends Omit<ComponentPropsWithoutRef<"svg">, "width" | "height" | "children"> {
  plan: CompiledCutPlan;
  frame: number;
  /** World-space SVG for a scene at a shot-local frame. Called once per visible layer. */
  renderScene: (sceneId: string, context: { shotId: string; localFrame: number; layer: CutLayer }) => ReactNode;
  /** Output-space occluder for foreground wipes. */
  renderForeground?: (subjectId: string, rect: Rect) => ReactNode;
  /** Output-space children unaffected by cuts (captions, titles). */
  overlay?: ReactNode | ((state: CutFrame) => ReactNode);
  transitions?: CutEvaluationOptions["transitions"];
  /** Defaults to the user's reduced-motion preference. */
  reducedMotion?: boolean;
  ariaLabel?: string;
  background?: string;
}

/** SVG renderer for a compiled cut plan. Owns no clock; every frame is evaluated from scratch. */
export const CutStage = forwardRef<SVGSVGElement, CutStageProps>(function CutStage({
  plan, frame, renderScene, renderForeground, overlay, transitions = "authored", reducedMotion,
  ariaLabel = "Scene", background = "transparent", style, ...props
}, ref) {
  const prefersReduced = usePrefersReducedMotion();
  const reduce = reducedMotion ?? prefersReduced;
  const state = useMemo(() => evaluateCutPlan(plan, frame, { transitions, reducedMotion: reduce }), [plan, frame, transitions, reduce]);
  const uid = useId().replace(/:/g, "");
  const { width, height } = plan.spec.output;
  return <svg ref={ref} role="img" aria-label={ariaLabel} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"
    data-km-cut-stage="" data-frame={state.frame} data-cut-shot={state.shotId} data-cut-transition={state.transition?.kind ?? ""}
    style={{ display: "block", width: "100%", aspectRatio: `${width} / ${height}`, overflow: "hidden", background, ...style }} {...props}>
    <defs>
      {state.layers.map((layer, i) => layer.mask ? <SvgMaskDefinition key={`m${i}`} id={`${uid}-mask-${i}`} sample={layer.mask} /> : null)}
      {state.layers.map((layer, i) => layer.blur && (layer.blur.x > 0.5 || layer.blur.y > 0.5)
        ? <filter key={`b${i}`} id={`${uid}-blur-${i}`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={`${layer.blur.x} ${layer.blur.y}`} /></filter> : null)}
    </defs>
    {state.layers.map((layer, i) => {
      const mask = layer.mask ? (layer.mask.kind === "clip" && layer.mask.feather === 0 ? { clipPath: `url(#${uid}-mask-${i})` } : { mask: `url(#${uid}-mask-${i})` }) : {};
      const blurred = layer.blur && (layer.blur.x > 0.5 || layer.blur.y > 0.5);
      return <g key={`${layer.shotId}-${i}`} data-cut-layer={layer.shotId} opacity={layer.opacity} {...mask} filter={blurred ? `url(#${uid}-blur-${i})` : undefined}>
        <g transform={`matrix(${layer.matrix.a} ${layer.matrix.b} ${layer.matrix.c} ${layer.matrix.d} ${layer.matrix.e} ${layer.matrix.f})`}>
          {renderScene(layer.sceneId, { shotId: layer.shotId, localFrame: layer.localFrame, layer })}
        </g>
      </g>;
    })}
    {state.foreground && renderForeground ? <g data-cut-foreground="">{renderForeground(state.foreground.subjectId, state.foreground.rect)}</g> : null}
    {overlay != null ? <g data-cut-overlay="">{typeof overlay === "function" ? overlay(state) : overlay}</g> : null}
  </svg>;
});
