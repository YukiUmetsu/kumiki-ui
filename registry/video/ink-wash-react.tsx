import { useId, useMemo } from "react";
import type { SVGProps } from "react";
import { assertInkWash, evaluateInkWash, flyingWhite, inkHash, inkOutline, inkSamples } from "./ink-wash";
import type { InkWashSpec } from "./ink-wash";

export interface InkWashProps extends Omit<SVGProps<SVGSVGElement>, "children" | "viewBox" | "width" | "height"> {
  spec: InkWashSpec;
  /** Absolute film frame, never a time delta. */
  frame: number;
  /** Overrides material absorption without modifying the authored stroke geometry. */
  absorption?: number;
  /** Overrides texture visibility without moving fibers on the paper. */
  grain?: number;
  /** Resolve to the final dried painting without animation. */
  reducedMotion?: boolean;
  /** When true omit the paper rectangle but retain pigment alpha (for compositing). */
  transparentPaper?: boolean;
  label?: string;
}

/** Original SVG pigment geometry. No raster asset, frame-history, animated CSS or outside clock. */
export function InkWash({
  spec, frame, absorption, grain, reducedMotion = false, transparentPaper = false,
  label = "Ink brush painting on textured paper", style, ...svgProps
}: InkWashProps) {
  assertInkWash(spec);
  const wetness = absorption ?? spec.absorption;
  const tooth = grain ?? spec.grain;
  if (!Number.isFinite(wetness) || wetness < 0 || wetness > 1 || !Number.isFinite(tooth) || tooth < 0 || tooth > 1)
    throw new RangeError("INK1 absorption and grain overrides must be within 0..1.");
  const states = evaluateInkWash(spec, frame, reducedMotion);
  const rawId = useId();
  const uid = "ink" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const fibers = useMemo(() => Array.from({ length: 550 }, (_, i) => ({
    x: inkHash(spec.seed, i, 13) * spec.width, y: inkHash(spec.seed, i, 17) * spec.height,
    length: 2 + inkHash(spec.seed, i, 19) * 17,
    horizontal: inkHash(spec.seed, i, 23) > .48,
    opacity: .10 + inkHash(spec.seed, i, 29) * .23,
  })), [spec.seed, spec.width, spec.height]);
  const pores = useMemo(() => Array.from({ length: 580 }, (_, i) => ({
    x: inkHash(spec.seed + 51, i, 37) * spec.width, y: inkHash(spec.seed + 51, i, 41) * spec.height,
    radius: .4 + inkHash(spec.seed + 51, i, 43) * 1.8,
  })), [spec.seed, spec.width, spec.height]);

  return <svg {...svgProps} viewBox={"0 0 " + spec.width + " " + spec.height}
    xmlns="http://www.w3.org/2000/svg" role={svgProps["aria-hidden"] ? undefined : "img"}
    aria-label={svgProps["aria-hidden"] ? undefined : label}
    data-km-ink-wash="" data-km-ink-frame={frame}
    style={{ display: "block", width: "100%", height: "100%", overflow: "hidden", isolation: "isolate", ...style }}>
    <defs>
      {/* Blur affects only the wet pigment fringe, never the paper, captions or dry-brush center. */}
      <filter id={uid + "-fringe"} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation={1.2 + wetness * 1.6}/>
      </filter>
      <filter id={uid + "-wash"} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation={.55 + wetness * .9}/>
      </filter>
      <mask id={uid + "-tooth"} maskUnits="userSpaceOnUse" x={0} y={0} width={spec.width} height={spec.height}>
        <rect width={spec.width} height={spec.height} fill="#ffffff"/>
        {tooth > 0 && pores.map((p, i) => <circle key={i} cx={p.x} cy={p.y}
          r={p.radius * (.3 + tooth * .9)} fill="#000000" opacity={.14 + .6 * tooth}/>)}
      </mask>
      {spec.strokes.map((stroke, i) => {
        const tracks = flyingWhite(stroke, spec.seed + i * 31, states[i].deposit);
        return <mask key={stroke.id} id={uid + "-dry-" + i} maskUnits="userSpaceOnUse"
          x={0} y={0} width={spec.width} height={spec.height}>
          <rect width={spec.width} height={spec.height} fill="#ffffff"/>
          {tracks.map((path, j) => <path key={j} d={path} fill="none" stroke="#000000"
            strokeWidth={Math.max(.7, stroke.width * (.012 + .022 * (1 - stroke.water)))}
            strokeLinecap="round"/>)}
        </mask>;
      })}
    </defs>
    {!transparentPaper && <rect width={spec.width} height={spec.height} fill={spec.paper}/>}
    {!transparentPaper && tooth > 0 && <g data-km-ink-paper="" stroke="#806d58" strokeWidth=".6" pointerEvents="none">
      {fibers.map((f, i) => <path key={i} opacity={tooth * f.opacity}
        d={"M" + f.x.toFixed(1) + " " + f.y.toFixed(1) + (f.horizontal
          ? " h" + f.length.toFixed(1) : " v" + f.length.toFixed(1))}/>)}
    </g>}
    {spec.strokes.map((stroke, i) => {
      const state = states[i];
      if (state.deposit <= 0) return null;
      const seed = spec.seed + i * 131;
      const color = stroke.accent ? spec.accent! : spec.ink;
      const baseAlpha = Math.max(.025, stroke.tone * stroke.load);
      const bleedWidth = stroke.width * stroke.water * wetness * (1 + .45 * state.absorbed);
      const halo = inkOutline(stroke, seed, state.deposit, bleedWidth * state.spread * .8);
      const wash = inkOutline(stroke, seed + 7, state.deposit, bleedWidth * state.spread * .37);
      const core = inkOutline(stroke, seed, state.deposit);
      const samples = inkSamples(stroke, state.deposit);
      return <g key={stroke.id} data-km-ink-stroke={stroke.id} data-km-ink-spread={state.spread.toFixed(3)}
        pointerEvents="none" style={{ mixBlendMode: "multiply" }}>
        {/* Capillary fringe is geometry grown outward from the authored stroke, not a blurred scene. */}
        {state.spread > 0 && bleedWidth > 1 && <path d={halo} fill={color} filter={"url(#" + uid + "-fringe)"}
          opacity={Math.min(.28, baseAlpha * .17 * state.spread * (1 - .18 * state.dry))}/>}
        {state.spread > 0 && bleedWidth > 1 && <path d={wash} fill={color} filter={"url(#" + uid + "-wash)"}
          opacity={Math.min(.47, baseAlpha * .24 * state.spread)}/>}
        <g mask={"url(#" + uid + "-tooth)"}>
          <path d={core} fill={color} opacity={baseAlpha * (.86 + .14 * state.absorbed)}
            filter={stroke.water > .75 ? "url(#" + uid + "-wash)" : undefined}
            mask={"url(#" + uid + "-dry-" + i + ")"}/>
        </g>
        {/* Grain settles in wet ink while leaving a sharp dark center and a quiet paper edge. */}
        {stroke.water > .22 && state.absorbed > 0 && samples.filter((_, j) => j % 5 === 0).map((s, j) => {
          const noise = inkHash(seed + 41, j, 91);
          if (noise > .6) return null;
          const offset = (inkHash(seed + 47, j, 19) - .5) * stroke.width * .8;
          return <circle key={j} cx={s.x + s.nx * offset} cy={s.y + s.ny * offset}
            r={Math.max(.35, stroke.width * (.016 + .022 * noise))} fill={color}
            opacity={baseAlpha * state.absorbed * .27}/>;
        })}
      </g>;
    })}
  </svg>;
}
