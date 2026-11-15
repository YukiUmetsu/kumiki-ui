/**
 * COLLAGE1 paper-tear transition: the outgoing frame rips from top to bottom, both halves hinge open
 * about the foot of the tear, lift away (their shadows widen and soften) and are pulled off frame, with
 * white paper fibre along both torn edges. The incoming scene keeps playing underneath.
 */
import { useId, useMemo } from "react";
import type { CSSProperties, SVGProps } from "react";
import type { Point } from "./collage-geometry";
import { fbm1, toPathD } from "./collage-geometry";
import { ease } from "./collage-motion";
import type { CollageSceneSpec } from "./collage-scene";
import { CollageScene } from "./collage-react";

export interface CollageTearProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox" | "children"> {
  outgoing: CollageSceneSpec;
  incoming: CollageSceneSpec;
  /** Frame of the outgoing scene that is torn (usually its last). */
  outgoingFrame: number;
  /** Live frame of the incoming scene underneath. */
  incomingFrame: number;
  /** 0 = intact sheet, 1 = both halves gone. */
  progress: number;
  seed?: number;
  /** Skip straight to the incoming scene. */
  reducedMotion?: boolean;
  style?: CSSProperties;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Deterministic tear from above the frame to below it, wandering around the centre. */
export function tearLine(width: number, height: number, seed: number): Point[] {
  const pts: Point[] = [], n = Math.ceil(height / 3);
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    pts.push([width / 2 + fbm1(seed, t * 2.2, 2) * width * .07 + fbm1(seed + 7, t * 40, 3) * 6, -24 + (height + 48) * t]);
  }
  return pts;
}

/** Transform of one half at `progress`: hinge open, then pull away. Pure, so it can be tested and seeked. */
export function tearHalfTransform(side: -1 | 1, progress: number, width: number, height: number, hinge: Point): string {
  const p = Math.min(1, Math.max(0, progress));
  const open = ease("in", Math.min(1, p / .45)), away = ease("in", Math.max(0, (p - .3) / .7));
  return `translate(${r2(side * away * width * .78)} ${r2(away * height * .12)}) rotate(${r2(side * (open * 7 + away * 10))} ${r2(hinge[0])} ${r2(hinge[1])})`;
}

export function CollageTear({ outgoing, incoming, outgoingFrame, incomingFrame, progress, seed = 3, reducedMotion = false, style, ...svgProps }: CollageTearProps) {
  if (outgoing.width * incoming.height !== incoming.width * outgoing.height) throw new RangeError("CollageTear scenes must share an aspect ratio");
  const raw = useId(), uid = "kt" + raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const W = outgoing.width, H = outgoing.height;
  const p = reducedMotion ? 1 : Math.min(1, Math.max(0, progress));
  const line = useMemo(() => tearLine(W, H, seed), [W, H, seed]);
  const paths = useMemo(() => ({
    left: toPathD([[-W, -H], ...line, [-W, H * 2]], true),
    right: toPathD([[W * 2, -H], ...line, [W * 2, H * 2]], true),
    fibre: toPathD(line, false),
  }), [line, W, H]);
  const hinge = line[line.length - 1];
  const open = ease("in", Math.min(1, p / .45)), away = ease("in", Math.max(0, (p - .3) / .7));
  const lift = 6 + open * 16 + away * 34;
  return <svg {...svgProps} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" role="img"
    aria-label={svgProps["aria-label"] ?? "Paper tear transition"} data-km-collage-tear={r2(p)}
    style={{ width: "100%", height: "100%", display: "block", overflow: "hidden", ...style }}>
    <defs>
      <clipPath id={`${uid}-l`}><path d={paths.left} /></clipPath>
      <clipPath id={`${uid}-r`}><path d={paths.right} /></clipPath>
      <filter id={`${uid}-s`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={r2(3 + open * 6 + away * 9)} /></filter>
      <filter id={`${uid}-f`}><feTurbulence type="fractalNoise" baseFrequency=".35" numOctaves={2} seed={seed} result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale={5} /></filter>
    </defs>
    <svg width={W} height={H}><CollageScene spec={incoming} frame={incomingFrame} aria-hidden="true" /></svg>
    {p < 1 && ([-1, 1] as const).map(side => {
      const clip = `url(#${uid}-${side < 0 ? "l" : "r"})`;
      return <g key={side} transform={tearHalfTransform(side, p, W, H, hinge)}>
        <path d={side < 0 ? paths.left : paths.right} fill="#1c1208" opacity={.4} transform={`translate(${r2(lift * .45)} ${r2(lift)})`} filter={`url(#${uid}-s)`} />
        <g clipPath={clip}><svg width={W} height={H}><CollageScene spec={outgoing} frame={outgoingFrame} aria-hidden="true" /></svg></g>
        {/* The torn edge shows the paper's white core: wider on the side that tore over the top layer. */}
        <g clipPath={clip}><path d={paths.fibre} fill="none" stroke="#f7f2e6" strokeWidth={side < 0 ? 9 : 5} strokeLinejoin="round" filter={`url(#${uid}-f)`} /></g>
      </g>;
    })}
  </svg>;
}
