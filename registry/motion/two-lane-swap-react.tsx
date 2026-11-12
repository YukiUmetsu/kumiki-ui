/** SVG adapter for authored two-lane-swap choreography.
 *
 * Children are original SVG artwork centered on (0,0) within each subject
 * group. Deterministic integer-frame rendering, no clock, no canvas readback
 * and no global CSS. Each viewport scales the same authored design pixels.
 */
import { forwardRef, useSyncExternalStore } from "react";
import type { ReactNode, SVGProps } from "react";
import { evaluateTwoLaneSwap } from "./two-lane-swap";
import type { LaneSwapSubjectSample, TwoLaneSwapPlan } from "./two-lane-swap";

function subscribeReduced(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (typeof query.addEventListener !== "function") return () => {};
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function currentReduced(): boolean {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function serverReduced(): boolean { return false; }

export interface TwoLaneSwapSvgProps
  extends Omit<SVGProps<SVGSVGElement>, "children" | "width" | "height"> {
  plan: TwoLaneSwapPlan;
  frame: number;
  /** SVG elements drawn relative to the center of the moving subject. */
  subjectA: ReactNode;
  subjectB: ReactNode;
  /** Optional SVG artwork under the moving subjects. */
  background?: ReactNode;
  /** Optional SVG artwork above both subjects, such as a measured caption. */
  overlay?: ReactNode;
  ariaLabel?: string;
  /** Explicit override; omitted respects OS prefers-reduced-motion. */
  reducedMotion?: boolean;
}
function subjectGroup(value: LaneSwapSubjectSample, children: ReactNode) {
  const transform = "translate(" + value.x + " " + value.y + ") rotate(" +
    value.rotationDeg + ") scale(" + value.scale + ")";
  return (
    <g key={value.id} data-km-lane-swap-subject={value.id}
       data-phase={value.phase} data-layer={value.layer}
       transform={transform} aria-hidden="true">
      {children}
    </g>
  );
}

/** Renderer-neutral choreography plus author-provided SVG assets. */
export const TwoLaneSwapSvg = forwardRef<SVGSVGElement, TwoLaneSwapSvgProps>(
  function TwoLaneSwapSvg({
    plan, frame, subjectA, subjectB, background, overlay, ariaLabel,
    reducedMotion, style, ...props
  }, ref) {
    // Call the hook unconditionally so explicit overrides can change safely.
    const prefersReduced = useSyncExternalStore(
      subscribeReduced, currentReduced, serverReduced);
    const state = evaluateTwoLaneSwap(
      plan, frame, reducedMotion ?? prefersReduced);
    const { width, height } = plan.spec.stage;
    const a = subjectGroup(state.a, subjectA);
    const b = subjectGroup(state.b, subjectB);
    return (
      <svg {...props} ref={ref} role="img"
        aria-label={ariaLabel ?? "Two elements safely exchange screen lanes"}
        viewBox={"0 0 " + width + " " + height}
        preserveAspectRatio="xMidYMid meet"
        data-km-lane-swap="" data-frame={frame}
        data-reduced-motion={reducedMotion ?? prefersReduced}
        data-sampled-clearance={state.clearancePx}
        style={{
          width: "100%", height: "auto", aspectRatio: width + " / " + height,
          overflow: "hidden", display: "block", ...style,
        }}>
        {background}
        {state.a.layer < state.b.layer ? <>{a}{b}</> : <>{b}{a}</>}
        {overlay}
      </svg>
    );
  },
);
