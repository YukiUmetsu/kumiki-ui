import { Fragment, useId, useMemo } from "react";
import type { ReactNode, SVGProps } from "react";
import { evaluateRisoPrint, inspectRisoPrint, plateRegistration, printHash } from "./print-plates";
import type { RisoPrintSpec } from "./print-plates";

/** Render-owned SVG paint bindings: authored artwork chooses solid fills or screened densities per spot ink. */
export interface RisoPaint {
  solid: string;
  /** A screen of separate ink dots, not a postprocessed RGB halftone overlay. */
  dots: string;
}
export type RisoArtwork = (paint: RisoPaint) => ReactNode;
export interface RisoPrintProps extends Omit<SVGProps<SVGSVGElement>, "children" | "viewBox" | "width" | "height"> {
  spec: RisoPrintSpec;
  frame: number;
  artworks: Readonly<Record<string, RisoArtwork>>;
  misregistration?: number;
  paperGrain?: number;
  reducedMotion?: boolean;
  label?: string;
}

/** Ink arrives from the press feed direction with a seeded, frame-stable ragged edge. */
export function printRevealPath(width: number, height: number, progress: number, seed: number): string {
  if (progress <= 0) return "M0 0 H0 V0 Z";
  if (progress >= 1) return `M0 0 H${width} V${height} H0 Z`;
  const x = width * progress;
  const edge = Array.from({ length: 17 }, (_, i) => {
    const y = height * i / 16;
    const wave = (printHash(seed, i, 5) - .5) * 13;
    return `${Math.max(0, Math.min(width, x + wave)).toFixed(2)} ${y.toFixed(2)}`;
  });
  return `M0 0 L${edge.join(" L")} L0 ${height} Z`;
}

/** Separate ink layers over fixed paper; no local clocks, image downloads, or WebGL. */
export function RisoPrint({
  spec, frame, artworks, misregistration = 0, paperGrain = .5, reducedMotion = false,
  label = "Two-color Risograph print", style, ...svgProps
}: RisoPrintProps) {
  const issues = inspectRisoPrint(spec);
  if (issues.length) throw new Error(`Invalid RISO1 print: ${issues.map(i => `${i.path}: ${i.message}`).join("; ")}`);
  const missing = spec.plates.filter(plate => typeof artworks[plate.id] !== "function");
  if (missing.length) throw new Error(`Missing vector artwork for plate: ${missing.map(plate => plate.id).join(", ")}`);
  const frameState = evaluateRisoPrint(spec, frame, reducedMotion);
  const rawId = useId();
  const uid = "riso" + rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const grain = Math.max(0, Math.min(1, paperGrain));
  const sheet = useMemo(() => Array.from({ length: 450 }, (_, i) => ({
    x: printHash(spec.seed, i, 31) * spec.width,
    y: printHash(spec.seed, i, 37) * spec.height,
    length: 2 + printHash(spec.seed, i, 41) * 18,
    opacity: .09 + printHash(spec.seed, i, 43) * .18,
    vertical: printHash(spec.seed, i, 47) > .4,
  })), [spec.seed, spec.width, spec.height]);
  const pores = useMemo(() => Array.from({ length: 330 }, (_, i) => ({
    x: printHash(spec.seed + 41, i, 1) * spec.width,
    y: printHash(spec.seed + 41, i, 3) * spec.height,
    r: .35 + printHash(spec.seed + 41, i, 9) * 1.7,
  })), [spec.seed, spec.width, spec.height]);

  return <svg {...svgProps} role={svgProps["aria-hidden"] ? undefined : "img"}
    aria-label={svgProps["aria-hidden"] ? undefined : label}
    viewBox={`0 0 ${spec.width} ${spec.height}`}
    xmlns="http://www.w3.org/2000/svg"
    data-km-riso-print="" style={{ width: "100%", height: "100%", display: "block", overflow: "hidden", isolation: "isolate", ...style }}>
    <defs>
      <mask id={`${uid}-tooth`} x={0} y={0} width={spec.width} height={spec.height} maskUnits="userSpaceOnUse">
        <rect width={spec.width} height={spec.height} fill="#fff" />
        {grain > 0 && pores.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r * (.4 + grain)} fill="#000" />)}
      </mask>
      {spec.plates.map((plate, index) => <Fragment key={plate.id}>
        <pattern id={`${uid}-dots-${index}`} x={0} y={0} width={plate.dotCell} height={plate.dotCell}
          patternUnits="userSpaceOnUse" patternTransform={`rotate(${plate.dotAngle})`}>
          <circle cx={plate.dotCell / 2} cy={plate.dotCell / 2} r={plate.dotCell * .32} fill={plate.color} />
        </pattern>
        <clipPath id={`${uid}-clip-${index}`} clipPathUnits="userSpaceOnUse">
          <path d={printRevealPath(spec.width, spec.height, frameState.plates[index].progress, spec.seed + index * 11)} />
        </clipPath>
      </Fragment>)}
    </defs>
    <rect width={spec.width} height={spec.height} fill={spec.paper} />
    {/* Paper fibres stay locked to the sheet, preventing camera/animation texture crawl. */}
    {grain > 0 && <g pointerEvents="none" stroke="#694B38" strokeWidth=".7">
      {sheet.map((p, i) => <path key={i} opacity={p.opacity * grain}
        d={`M${p.x.toFixed(1)} ${p.y.toFixed(1)} l${p.vertical ? "0.8" : p.length.toFixed(1)} ${p.vertical ? p.length.toFixed(1) : "0.8"}`} />)}
    </g>}
    {spec.plates.map((plate, i) => {
      const [dx, dy] = plateRegistration(spec, i, misregistration);
      const paint = { solid: plate.color, dots: `url(#${uid}-dots-${i})` };
      return <g key={plate.id} data-km-riso-plate={plate.id} style={{ mixBlendMode: "multiply" }} opacity={plate.opacity}
        clipPath={`url(#${uid}-clip-${i})`} mask={`url(#${uid}-tooth)`}>
        <g transform={`translate(${dx.toFixed(3)} ${dy.toFixed(3)})`} fill={plate.color} stroke="none">
          {artworks[plate.id](paint)}
        </g>
      </g>;
    })}
  </svg>;
}
