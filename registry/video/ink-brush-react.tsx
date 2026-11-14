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
    data-km-ink-brush="" data-km-ink-material="graded-bristle-contact" data-km-ink-frame={frame}
    viewBox={"0 0 " + spec.width + " " + spec.height}
    style={{ width: "100%", height: "100%", display: "block", overflow: "hidden",
      isolation: "isolate", ...style }}>
    <defs>
      <filter id={uid + "-edge-soft"} x="-5%" y="-5%" width="110%" height="110%"
        colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation=".75"/>
      </filter>
      {marks.filter(mark => mark.outline.length > 0).map((mark, i) =>
        <Fragment key={mark.id}>
          <mask id={uid + "-brush-" + i}
            maskUnits="userSpaceOnUse" x={0} y={0} width={spec.width} height={spec.height}>
            <rect x={0} y={0} width={spec.width} height={spec.height} fill="#FFFFFF"/>
            {mark.gaps.map((g, index) =>
              <path key={index} d={g.d} fill="none" stroke="#000000"
                strokeWidth={g.width} strokeLinecap="round"/>)}
            {mark.pores.map((p, index) =>
              <ellipse key={index} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill="#000000"/>)}
          </mask>
          <linearGradient id={uid + "-pigment-" + i} gradientUnits="userSpaceOnUse"
            x1={mark.flow[0]} y1={mark.flow[1]} x2={mark.flow[2]} y2={mark.flow[3]}>
            <stop offset="0%" stopColor={mark.color} stopOpacity=".96"/>
            <stop offset="35%" stopColor={mark.color} stopOpacity=".84"/>
            <stop offset="68%" stopColor={mark.color} stopOpacity=".63"/>
            <stop offset="100%" stopColor={mark.color} stopOpacity=".36"/>
          </linearGradient>
        </Fragment>)}
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
        {/* A soft capillary-contact fringe behind the real marked silhouette. This is
            stroke-local, not a Gaussian blur of an entire image or a simulation of diffusion. */}
        <path data-km-ink-edge={mark.id} d={mark.outline} fill={mark.color}
          opacity={mark.opacity * .12} filter={"url(#" + uid + "-edge-soft)"}
          mask={"url(#" + uid + "-brush-" + i + ")"}/>
        {/* The brush deposits a graded wash across its paper contact area. */}
        <path data-km-ink-stroke={mark.id} data-km-ink-progress={mark.progress}
          d={mark.outline} fill={"url(#" + uid + "-pigment-" + i + ")"}
          opacity={mark.opacity * .90} mask={"url(#" + uid + "-brush-" + i + ")"}/>
        {/* A narrower saturated stripe represents the ink-rich side of the oblique nib.
            It is another pigment deposit, not a black outline. */}
        <path data-km-ink-core={mark.id} d={mark.core} fill={mark.color}
          opacity={mark.opacity * .28} mask={"url(#" + uid + "-brush-" + i + ")"}/>
        <g data-km-ink-fibres={mark.id} fill="none" stroke={mark.color} strokeLinecap="round">
          {mark.hairs.map((hair, j) =>
            <path key={j} d={hair.d} strokeWidth={hair.width}
              opacity={hair.opacity * mark.opacity}/>)}
        </g>
      </Fragment>)}
    {children}
  </svg>;
}
