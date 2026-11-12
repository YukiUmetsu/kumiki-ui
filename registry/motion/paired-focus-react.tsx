/** Accessible frame-addressed SVG adapter for paired-focus choreography.
 *
 * Caller supplies original visual subjects centered at (0,0); the focus
 * motif is also original art, relative to the authored focus point.
 * No CSS animation, wall clock, renderer install, browser measurements
 * or media dependencies. The entire SVG is a presentational image.
 */
import { forwardRef, useSyncExternalStore } from "react";
import type { ReactNode, SVGProps } from "react";
import { evaluatePairedFocus } from "./paired-focus";
import type { PairedFocusPlan, PairedFocusSubject } from "./paired-focus";

function subscribe(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return () => {};
  const m = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (typeof m.addEventListener !== "function") return () => {};
  m.addEventListener("change", callback);
  return () => m.removeEventListener("change", callback);
}
const getReduced = () => typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getServerReduced = () => false;

export interface PairedFocusSvgProps extends
  Omit<SVGProps<SVGSVGElement>, "children" | "width" | "height"> {
  plan: PairedFocusPlan;
  frame: number;
  subjectA: ReactNode;
  subjectB: ReactNode;
  /** Optional artwork that appears as the authored pair reaches focus. */
  focusCue?: ReactNode;
  background?: ReactNode;
  overlay?: ReactNode;
  reducedMotion?: boolean;
  ariaLabel?: string;
}
function renderSubject(s: PairedFocusSubject, art: ReactNode) {
  const transform = "translate(" + s.x + " " + s.y + ") scale(" + s.scale + ")";
  return <g key={s.id} aria-hidden="true"
      data-km-paired-focus-subject={s.id}
      data-phase={s.phase}
      transform={transform}>
    {art}
  </g>;
}
export const PairedFocusSvg = forwardRef<SVGSVGElement, PairedFocusSvgProps>(
  function PairedFocusSvg({
    plan, frame, subjectA, subjectB, focusCue, background, overlay,
    reducedMotion, ariaLabel, style, ...svgProps
  }, ref) {
    const prefersReduced = useSyncExternalStore(subscribe, getReduced, getServerReduced);
    const reduced = reducedMotion ?? prefersReduced;
    const result = evaluatePairedFocus(plan, frame, reduced);
    const { width, height } = plan.spec.stage;
    const { focus } = plan.spec;
    return (
      <svg {...svgProps} ref={ref} role="img"
        aria-label={ariaLabel ?? "Two original elements move toward or away from a shared visual focus"}
        viewBox={"0 0 " + width + " " + height}
        preserveAspectRatio="xMidYMid meet"
        data-km-paired-focus=""
        data-frame={frame}
        data-mode={plan.spec.mode}
        data-reduced-motion={reduced}
        data-sampled-clearance={result.circleClearancePx}
        data-focus-strength={result.focusStrength}
        style={{
          width: "100%", height: "auto", aspectRatio: width + " / " + height,
          overflow: "hidden", display: "block", ...style,
        }}>
        {background}
        {focusCue && (
          <g aria-hidden="true"
             data-km-paired-focus-cue=""
             data-focus-strength={result.focusStrength}
             transform={"translate(" + focus.x + " " + focus.y + ")"}
             opacity={result.focusStrength}>{focusCue}</g>
        )}
        {renderSubject(result.a, subjectA)}
        {renderSubject(result.b, subjectB)}
        {overlay}
      </svg>
    );
  },
);
