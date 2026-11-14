import { Fragment, useId, useMemo } from "react";
import type { ReactNode, SVGProps } from "react";
import { evaluateInkBrush, inkHash } from "./ink-brush";
import type { InkBrushSpec } from "./ink-brush";

export interface InkBrushCanvasProps
  extends Omit<SVGProps<SVGSVGElement>, "children" | "viewBox" | "width" | "height"> {
  spec: InkBrushSpec;
  /** One absolute frame supplied by the existing FilmStage (or editor). */
  frame: number;
  /** 0..1 density of anchored paper fibres, not screen-space film grain. */
  paperTooth?: number;
  /** Draw completed ink geometry, keeping semantic labels accessible. */
  reducedMotion?: boolean;
  label?: string;
  /** Optional authored labels/illustration layers placed above brush strokes. */
  children?: ReactNode;
}

/** Pure, frame-addressed SVG mark compositor. No <canvas> effects or timers. */
export function InkBrushCanvas({
  spec, frame, paperTooth = .45, reducedMotion = false,
  label = "Original ink-brush illustration", children, style, ...props
}: InkBrushCanvasProps) {
  if (!Number.isFinite(paperTooth) || paperTooth < 0 || paperTooth > 1)
    throw new RangeError("paperTooth must be within 0..1.");
  const marks = evaluateInkBrush(spec, frame, reducedMotion);
  const rawId = useId(), uid = "km-ink-" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const fibres = useMemo(() => Array.from({ length: 400 }, (_, i) => ({
    x: inkHash(spec.seed, i, 7) * spec.width,
    y: inkHash(spec.seed, i, 11) * spec.height,
    dx: (inkHash(spec.seed, i, 13) - .5) * 17,
    dy: (inkHash(spec.seed, i, 17) - .5) * 2,
    opacity: inkHash(spec.seed, i, 19) * .12,
  })), [spec.seed, spec.width, spec.height]);
  return <svg {...props} xmlns="http://www.w3.org/2000/svg"
    role={props["aria-hidden"] ? undefined : "img"}
    aria-label={props["aria-hidden"] ? undefined : label}
    data-km-ink-brush="" data-km-ink-frame={frame}
    viewBox={"0 0 " + spec.width + " " + spec.height}
    style={{ width: "100%", height: "100%", display: "block", overflow: "hidden",
      isolation: "isolate", ...style }}>
    <defs>
      {marks.filter(mark => mark.outline.length > 0).map((mark, i) =>
        <mask key={mark.id} id={uid + "-brush-" + i}
          maskUnits="userSpaceOnUse" x={0} y={0} width={spec.width} height={spec.height}>
          <rect x={0} y={0} width={spec.width} height={spec.height} fill="#FFFFFF"/>
          {mark.gaps.map((g, index) =>
            <path key={index} d={g.d} fill="none" stroke="#000000"
              strokeWidth={g.width} strokeLinecap="round"/>)}
        </mask>)}
    </defs>
    <rect width={spec.width} height={spec.height} fill={spec.paper} />
    {paperTooth > 0 && <g aria-hidden="true" pointerEvents="none" stroke="#746D61" strokeWidth=".6">
      {fibres.map((f, i) => <path key={i}
        d={"M" + f.x.toFixed(2) + " " + f.y.toFixed(2) +
           "l" + f.dx.toFixed(2) + " " + f.dy.toFixed(2)}
        opacity={f.opacity * paperTooth}/>)}
    </g>}
    {marks.filter(mark => mark.outline.length > 0).map((mark, i) =>
      <Fragment key={mark.id}>
        <path data-km-ink-stroke={mark.id} data-km-ink-progress={mark.progress}
          d={mark.outline} fill={mark.color} opacity={mark.opacity}
          mask={"url(#" + uid + "-brush-" + i + ")"}/>
      </Fragment>)}
    {children}
  </svg>;
}
